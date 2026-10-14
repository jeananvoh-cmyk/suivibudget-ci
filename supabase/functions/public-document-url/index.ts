import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return new Response("Method not allowed",{status:405,headers:cors});
 try{
  const body=await req.json();
  const {document_id,part_id}=body;
  if(Object.keys(body).some(key=>!['document_id','part_id'].includes(key)) || (part_id!==undefined && typeof part_id!=='string')) return new Response(JSON.stringify({error:'Référence invalide'}),{status:400,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(!document_id||typeof document_id!=="string") return new Response(JSON.stringify({error:"document_id requis"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const {data:doc,error}=await admin.from("public_documents").select("id,storage_path,file_url,status,verification_status,checksum_sha256,file_size_bytes,is_multipart,document_parts").eq("id",document_id).eq("status","PUBLISHED").maybeSingle();
  if(error||!doc) return new Response(JSON.stringify({error:"Document public introuvable"}),{status:404,headers:{...cors,"Content-Type":"application/json"}});
  let url:string|null=null; let expires:number|null=null;
  const original=doc.is_multipart ? (part_id ? doc.document_parts?.find((part:{id:string})=>part.id===part_id) : doc.document_parts?.[0]) : doc;
  if(!original || (part_id && !doc.is_multipart)) return new Response(JSON.stringify({error:'Fascicule introuvable'}),{status:404,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(original.storage_path){
   if(doc.verification_status!=='VERIFIED' || (doc.is_multipart && (original.status!=='VERIFIED' || original.checksum_status!=='COMPUTED' || !original.page_range_verified))) return new Response(JSON.stringify({error:'Original non contrôlé'}),{status:404,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
   const bytes=await admin.storage.from('public_documents').download(original.storage_path);
   const hash=bytes.data ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await bytes.data.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('') : null;
   if(bytes.error || !bytes.data || bytes.data.size>50*1024*1024 || hash!==original.checksum_sha256 || (original.file_size_bytes!=null && bytes.data.size!==Number(original.file_size_bytes))) return new Response(JSON.stringify({error:'Original absent ou altéré'}),{status:404,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
   const {data:signed,error:signedError}=await admin.storage.from("public_documents").createSignedUrl(original.storage_path,60);
   if(signedError||!signed?.signedUrl) return new Response(JSON.stringify({error:"Lien temporaire indisponible"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
   url=signed.signedUrl; expires=60;
  } else if(doc.file_url&&/^https:\/\//i.test(doc.file_url)){url=doc.file_url;}
  if(!url) return new Response(JSON.stringify({error:"Fichier non disponible"}),{status:404,headers:{...cors,"Content-Type":"application/json"}});
  return new Response(JSON.stringify({url,expires_in:expires}),{headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
 }catch{return new Response(JSON.stringify({error:"Requête invalide"}),{status:400,headers:{...cors,"Content-Type":"application/json"}})}
});
