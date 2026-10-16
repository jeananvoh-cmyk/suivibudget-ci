import { calculateManifestSha256, normalizeOcrStatus } from '../_shared/documentIntegrity.ts';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const sha256=async(file:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return reply(405,{error:'Méthode interdite'});
  try {
    const body=await req.json();
    const {table,id,field,action}=body;
    const url=Deno.env.get('SUPABASE_URL')!;
    const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization') || ''}},auth:{persistSession:false}});
    const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    if(action==='attest-document' || action==='check-upload') {
      const identity=await client.auth.getUser();
      if(identity.error || !identity.data.user) return reply(401,{error:'Session requise'});
      const profile=await client.from('profiles').select('role,is_active').eq('id',identity.data.user.id).maybeSingle();
      if(profile.error || !profile.data?.is_active || !['ADMIN','DATA_MANAGER','MODERATOR'].includes(profile.data.role)) return reply(403,{error:'Opérateur actif requis'});
      if(action==='check-upload') {
        const documentary=body.bucket==='public_documents';
        if(typeof body.path!=='string' || (!documentary && !new RegExp(`^${identity.data.user.id}/[a-f0-9]{64}\\.(webp|png|jpg|pdf)$`).test(body.path)) ||
          (documentary && (!['ADMIN','DATA_MANAGER'].includes(profile.data.role) || !/^[a-zA-Z0-9_./-]+$/.test(body.path) || /(^|\/)\.\.(\/|$)/.test(body.path) || !/^[a-f0-9]{64}$/.test(body.checksum_sha256)))) return reply(403,{error:'Original non accessible'});
        const original=await service.storage.from(documentary ? 'public_documents' : 'admin_media').download(body.path);
        if(original.error || !original.data || original.data.size<1 || original.data.size>(documentary ? 50 : 10)*1024*1024 ||
          await sha256(original.data)!==(documentary ? body.checksum_sha256 : body.path.split('/')[1].split('.')[0]) ||
          (documentary && original.data.size!==body.file_size_bytes)) return reply(409,{error:'Octets différents de l’original attendu'});
        return reply(200,{checksum_sha256:await sha256(original.data)});
      }
      if(!['ADMIN','DATA_MANAGER'].includes(profile.data.role) || typeof id!=='string' || id.length>200 || Object.keys(body).some(key=>!['action','id'].includes(key))) return reply(403,{error:'Contrôle documentaire non autorisé'});
      const {data:document,error}=await client.from('public_documents').select('*').eq('id',id).maybeSingle();
      if(error || !document || (!['UPLOADED','TO_VERIFY'].includes(document.status) && !(['VERIFIED','PUBLISHED'].includes(document.status) && document.checksum_status==='DECLARED'))) return reply(404,{error:'Document à contrôler non accessible'});
      normalizeOcrStatus(document.ocr_status,document.is_scanned,document.has_text_layer);
      if(document.is_multipart && await calculateManifestSha256(document.document_parts)!==document.manifest_sha256) return reply(409,{error:'Manifeste incohérent'});
      const parts=document.is_multipart ? document.document_parts : [document];
      if(!Array.isArray(parts) || parts.length!==(document.is_multipart ? document.parts_count : 1) || parts.length>100) return reply(409,{error:'Originaux incomplets'});
      const checked=[];
      for(const part of parts) {
        if(typeof part.storage_path!=='string' || !/^[a-zA-Z0-9_./-]+$/.test(part.storage_path) || /(^|\/)\.\.(\/|$)/.test(part.storage_path)) return reply(409,{error:'Chemin original invalide'});
        const original=await service.storage.from('public_documents').download(part.storage_path);
        if(original.error || !original.data || original.data.size<1 || original.data.size>50*1024*1024) return reply(409,{error:'Original absent ou inaccessible'});
        const header=new TextDecoder().decode(await original.data.slice(0,5).arrayBuffer());
        const checksum=await sha256(original.data);
        if(((document.is_multipart || document.document_type==='COMPTE_ADMINISTRATIF' || document.file_format==='PDF') && header!=='%PDF-') || checksum!==part.checksum_sha256 || original.data.size!==Number(part.file_size_bytes)) return reply(409,{error:'Le checksum déclaré ne correspond pas aux octets réels'});
        checked.push({storage_path:part.storage_path,checksum_sha256:checksum,file_size_bytes:original.data.size});
      }
      const confirmation=await service.rpc('admin_confirm_document_integrity',{p_id:id,p_revision:document.revision,p_actor:identity.data.user.id,p_files:checked});
      if(confirmation.error) return reply(409,{error:'Version modifiée pendant le contrôle ; rechargez'});
      return reply(200,{document_id:id,revision:document.revision,checked_files:checked.length,checksum_status:'COMPUTED'});
    }
    if(action!==undefined || typeof id!=='string' || id.length>200 || Object.keys(body).some(key=>!['table','id','field'].includes(key)) || !((table==='institutions' && field==='leader_photo_url') ||
      (table==='news_articles' && ['cover_image_url','document_url'].includes(field)))) return reply(400,{error:'Référence invalide'});
    const {data:row,error}=await client.from(table).select(table==='institutions' ? 'id,leader_photo_url,publication_status,archived_at' : 'id,cover_image_url,article_metadata,workflow_status,archived_at').eq('id',id).maybeSingle();
    if(error || !row || row.archived_at || row.publication_status==='ARCHIVED' || row.workflow_status==='ARCHIVED') return reply(404,{error:'Média non accessible'});
    let reference:string|undefined;
    if(table==='institutions') {
      reference=row.leader_photo_url;
    } else {
      reference=field==='cover_image_url' ? row.cover_image_url : row.article_metadata?.document_url;
    }
    if(typeof reference!=='string' || !/^storage:\/\/admin_media\/[a-f0-9-]+\/[a-f0-9]{64}\.(webp|png|jpg|pdf)$/.test(reference)) return reply(404,{error:'Fichier non accessible'});
    const path=reference.replace('storage://admin_media/','');
    const original=await service.storage.from('admin_media').download(path);
    if(original.error || !original.data || original.data.size<1 || original.data.size>10*1024*1024 || await sha256(original.data)!==path.split('/')[1].split('.')[0]) return reply(404,{error:'Original absent ou altéré'});
    const signed=await service.storage.from('admin_media').createSignedUrl(path,60);
    if(signed.error || !signed.data?.signedUrl) return reply(503,{error:'Signature indisponible'});
    return reply(200,{url:signed.data.signedUrl,expires_in:60});
  } catch {return reply(400,{error:'Requête invalide'});}
});
