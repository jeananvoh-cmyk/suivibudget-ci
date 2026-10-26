import {calculateManifestSha256,normalizeOcrStatus} from '../../../supabase/functions/_shared/documentIntegrity';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { createAdminPersistenceFixture } from './adminPersistenceFixtures';
import { DocumentStorageService } from '../../services/documentStorageService';
import { calculateFileSha256 } from '../caFileMatcher';
const api=vi.hoisted(()=>({getUser:vi.fn(),upload:vi.fn(),download:vi.fn(),invoke:vi.fn()}));
vi.mock('../../services/supabase',()=>({isSupabaseConfigured:()=>true,supabase:{auth:{getUser:api.getUser},rpc:async()=>({data:3,error:null}),functions:{invoke:api.invoke},storage:{from:()=>({upload:api.upload,download:api.download})}}}));
let fixture: Awaited<ReturnType<typeof createAdminPersistenceFixture>>;
let handler:(request:Request)=>Promise<Response>;
let publicHandler:(request:Request)=>Promise<Response>;
const signed=vi.fn(async()=>({data:{signedUrl:'https://isolated.example/media'},error:null}));
const blobs=new Map<string,Blob>();
const request=(body:object,identity?:string)=>new Request('https://isolated.example/function',{method:'POST',headers:{'Content-Type':'application/json',...(identity ? {Authorization:`Bearer ${identity}`} : {})},body:JSON.stringify(body)});

beforeAll(async()=>{
  fixture=await createAdminPersistenceFixture();
  await fixture.db.exec(readFileSync('supabase/migrations/20261016090000_document_delivery_counter.sql','utf8'));
  api.getUser.mockResolvedValue({data:{user:{id:fixture.admin}},error:null});
  const source=readFileSync('supabase/functions/admin-media-url/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const createClient=(_url:string,key:string,options?:{global?:{headers?:{Authorization?:string}}})=>{
    if(key==='server-fixture') return {from:(table:string)=>{
      const filters:{field:string;value:unknown}[]=[];
      const builder={select:()=>builder,eq:(field:string,value:unknown)=>{filters.push({field,value});return builder;},maybeSingle:async()=>{
        const data=await fixture.db.query(`select * from public.${table} where ${filters.map((item,index)=>`${item.field}=$${index+1}`).join(' and ')}`,filters.map(item=>item.value));
        return {data:data.rows[0] ?? null,error:null};
      }};return builder;
    },storage:{from:(bucket:string)=>({createSignedUrl:signed,download:async(path:string)=>({data:blobs.get(`${bucket}/${path}`) ?? null,error:null})})},rpc:async(_name:string,args:Record<string,unknown>)=>{
      if(_name==='record_document_delivery') {
        try {
          const data=await fixture.db.transaction(async tx=>{
            await tx.exec('set local role service_role');
            return (await tx.query<{count:number}>('select public.record_document_delivery($1,$2,$3,$4,$5) count',[args.p_document_id,args.p_request_id,args.p_storage_path,args.p_checksum,args.p_client_hash])).rows[0].count;
          });
          return {data,error:null};
        } catch(error) {return {data:null,error};}
      }
      try {await fixture.db.query('select public.admin_confirm_document_integrity($1,$2,$3,$4::jsonb)',[args.p_id,args.p_revision,args.p_actor,JSON.stringify(args.p_files)]);return {data:null,error:null};}
      catch(error){return {data:null,error};}
    }};
    let table:string,id:string;
    const identity=options?.global?.headers?.Authorization?.replace('Bearer ','') || null;
    const builder={select:()=>builder,eq:(_field:string,value:string)=>{id=value;return builder;},maybeSingle:async()=>{
      const rows=await fixture.session(identity,()=>fixture.db.query(`select * from public.${table} where id=$1`,[id]));
      return {data:rows.rows[0],error:null};
    }};
    return {auth:{getUser:async()=>({data:{user:identity ? {id:identity} : null},error:null})},from:(value:string)=>{table=value;return builder;}};
  };
  new Function('Deno','createClient','Response','calculateManifestSha256','normalizeOcrStatus',js)({env:{get:(key:string)=>key==='SUPABASE_SERVICE_ROLE_KEY' ? 'server-fixture' : 'public-fixture'},serve:(value:typeof handler)=>{handler=value;}},createClient,Response,calculateManifestSha256,normalizeOcrStatus);
  const publicSource=readFileSync('supabase/functions/public-document-url/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
  const publicJs=ts.transpileModule(publicSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('Deno','createClient','Response',publicJs)({env:{get:()=> 'server-fixture'},serve:(value:typeof publicHandler)=>{publicHandler=value;}},createClient,Response);
  api.invoke.mockImplementation(async(_name:string,args:{body:object})=>{
    const response=await handler(request(args.body,fixture.admin));
    return {data:await response.json(),error:response.ok ? null : new Error('Contrôle non confirmé')};
  });
},60000);
afterAll(async()=>{await fixture.db.close();});

describe('Médias administratifs privés, checksum et signatures limitées aux lignes visibles',()=>{
  it('rejette les SVG, faux PDF, contenus vides et types déguisés sans téléversement',async()=>{
    api.upload.mockClear();
    for(const file of [new File(['<svg/>'],'photo.svg',{type:'image/svg+xml'}),new File(['faux'],'scan.pdf',{type:'application/pdf'}),new File([],'photo.png',{type:'image/png'})]) await expect(DocumentStorageService.uploadAdminMedia(file)).rejects.toThrow();
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('calcule le SHA réel et interdit upsert puis contrôle les doublons existants',async()=>{
    const file=new File(['%PDF-isolated'],'scan.pdf',{type:'application/pdf'});
    api.upload.mockResolvedValueOnce({data:{path:'fixture'},error:null});
    const reference=await DocumentStorageService.uploadAdminMedia(file);
    blobs.set(reference.replace('storage://',''),file);
    expect(reference).toMatch(/^storage:\/\/admin_media\/[a-f0-9-]+\/[a-f0-9]{64}\.pdf$/);
    expect(api.upload).toHaveBeenLastCalledWith(expect.any(String),file,expect.objectContaining({upsert:false}));
    api.upload.mockResolvedValue({data:null,error:{statusCode:'409',message:'Duplicate'}});
    expect(await DocumentStorageService.uploadAdminMedia(file)).toBe(reference);
    blobs.set(reference.replace('storage://',''),new Blob(['autre contenu']));
    await expect(DocumentStorageService.uploadAdminMedia(file)).rejects.toThrow(/non contrôlé/);
  });

  it('refuse les chemins arbitraires et ne signe pas les brouillons pour le public',async()=>{
    signed.mockClear();
    const file=new File(['%PDF-isolated-media'],'media.pdf',{type:'application/pdf'});
    const hash=await calculateFileSha256(file),path=`${fixture.admin}/${hash}.pdf`,ref=`storage://admin_media/${path}`;
    blobs.set(`admin_media/${path}`,file);
    await fixture.db.query('insert into storage.objects(id,bucket_id,name) values($1,$2,$3)',['media-test-original','admin_media',path]);
    await fixture.session(fixture.admin,()=>fixture.mutate('news_articles','media-test',null,{title:'Article média',slug:'media-test',category:'ACTUALITE',summary:'Résumé isolé',content:'Article isolé',article_metadata:{document_url:ref}}),true);
    expect((await handler(request({table:'news_articles',id:'media-test',field:'document_url',path:'private/other.pdf'}))).status).toBe(400);
    expect((await handler(request({table:'news_articles',id:'media-test',field:'document_url'}))).status).toBe(404);
    expect((await handler(request({table:'public_documents',id:'media-test',field:'storage_path'},fixture.admin))).status).toBe(400);
    expect(signed).not.toHaveBeenCalled();
    const staff=await handler(request({table:'news_articles',id:'media-test',field:'document_url'},fixture.admin));
    expect(staff.status).toBe(200);expect(staff.headers.get('Cache-Control')).toBe('no-store');
    expect(signed).toHaveBeenLastCalledWith(path,60);
    await fixture.session(fixture.admin,()=>fixture.mutate('news_articles','media-test',1,{workflow_status:'IN_REVIEW'}),true);
    await fixture.session(fixture.admin,()=>fixture.mutate('news_articles','media-test',2,{workflow_status:'PUBLISHED'}),true);
    expect((await handler(request({table:'news_articles',id:'media-test',field:'document_url'}))).status).toBe(200);
    await fixture.session(fixture.admin,()=>fixture.mutate('news_articles','media-test',3,{workflow_status:'DRAFT'}),true);
    expect((await handler(request({table:'news_articles',id:'media-test',field:'document_url'}))).status).toBe(404);
  });

  it('applique la RLS Storage aux répertoires des opérateurs et refuse la lecture anonyme',async()=>{
    const {db,session,manager}=fixture;
    await session(manager,()=>db.query('insert into storage.objects(id,bucket_id,name) values ($1,$2,$3)',['isolated-media','admin_media',`${manager}/${'a'.repeat(64)}.pdf`]),true);
    await expect(session(manager,()=>db.query('insert into storage.objects(id,bucket_id,name) values ($1,$2,$3)',['foreign-media','admin_media',`${fixture.admin}/foreign.pdf`]))).rejects.toThrow(/row-level/);
    expect((await session(null,()=>db.query('select * from storage.objects'))).rows).toHaveLength(0);
    await expect(session(manager,()=>db.exec("delete from storage.objects where id='isolated-media'"))).rejects.toThrow(/permission/);
  });

  it('cloisonne les médias de profils et publications par rôle, même si une politique permissive est ajoutée',async()=>{
    const file=new File(['%PDF-profile-media'],'profile.pdf',{type:'application/pdf'}),hash=await calculateFileSha256(file);
    const path=`${fixture.manager}/${hash}.pdf`;
    blobs.set(`admin_media/${path}`,file);
    await fixture.db.query('insert into storage.objects(id,bucket_id,name) values($1,$2,$3)',['profile-media','admin_media',path]);
    await fixture.session(fixture.manager,()=>fixture.mutate('institutions','private-profile-media',null,{name:'Profil privé isolé',type:'MAIRIE',leader_photo_url:`storage://admin_media/${path}`}),true);
    const profileBody={table:'institutions',id:'private-profile-media',field:'leader_photo_url'};
    const newsBody={table:'news_articles',id:'media-test',field:'document_url'};
    for(const [identity,profileAllowed,newsAllowed] of [[fixture.admin,true,true],[fixture.manager,true,false],[fixture.moderator,false,true],[fixture.citizen,false,false],[undefined,false,false]] as const) {
      expect((await handler(request(profileBody,identity))).status).toBe(profileAllowed ? 200 : 404);
      expect((await handler(request(newsBody,identity))).status).toBe(newsAllowed ? 200 : 404);
    }
    await fixture.db.exec('create policy unsafe_storage_read on storage.objects for select using(true)');
    try {
      for(const identity of [fixture.admin,fixture.manager,fixture.moderator,fixture.citizen,null]) expect((await fixture.session(identity,()=>fixture.db.query("select * from storage.objects where bucket_id='admin_media'"))).rows).toEqual([]);
      expect((await fixture.session(fixture.moderator,()=>fixture.db.query("select * from storage.objects where bucket_id='public_documents'"))).rows).toEqual([]);
    } finally {await fixture.db.exec('drop policy unsafe_storage_read on storage.objects');}
    await fixture.db.query('update public.profiles set is_active=false where id=$1',[fixture.manager]);
    try {expect((await handler(request(profileBody,fixture.manager))).status).toBe(404);}
    finally {await fixture.db.query('update public.profiles set is_active=true where id=$1',[fixture.manager]);}
  });

  it('refuse le rattachement d’un média appartenant à une autre ressource ou à un autre opérateur',async()=>{
    const other=`storage://admin_media/${fixture.manager}/${'a'.repeat(64)}.pdf`;
    await expect(fixture.session(fixture.admin,()=>fixture.mutate('news_articles','foreign-attachment',null,{title:'Autre ressource',slug:'foreign-attachment',category:'ACTUALITE',content:'Texte',article_metadata:{document_url:other}}))).rejects.toThrow(/owned/);
    const existing=(await fixture.db.query<{article_metadata:{document_url:string}}>("select article_metadata from public.news_articles where id='media-test'")).rows[0].article_metadata.document_url;
    await expect(fixture.session(fixture.admin,()=>fixture.mutate('news_articles','shared-attachment',null,{title:'Autre ressource',slug:'shared-attachment',category:'ACTUALITE',content:'Texte',article_metadata:{document_url:existing}}))).rejects.toThrow(/unshared/);
  });

  it('borne les signatures à 60 secondes et refuse les originaux supprimés, altérés ou archivés',async()=>{
    const body={table:'news_articles',id:'media-test',field:'document_url'};
    const response=await handler(request(body,fixture.admin));
    expect((await response.json()).expires_in).toBe(60);
    expect((await handler(request({...body,url:'https://isolated.example/expired-token'},fixture.admin))).status).toBe(400);
    const row=(await fixture.db.query<{article_metadata:{document_url:string};revision:number}>("select article_metadata,revision from public.news_articles where id='media-test'")).rows[0];
    const key=row.article_metadata.document_url.replace('storage://',''),original=blobs.get(key)!;
    blobs.delete(key);
    expect((await handler(request(body,fixture.admin))).status).toBe(404);
    blobs.set(key,new Blob(['%PDF-changed']));
    expect((await handler(request(body,fixture.admin))).status).toBe(404);
    blobs.set(key,original);
    await fixture.session(fixture.admin,()=>fixture.mutate('news_articles','media-test',row.revision,{workflow_status:'ARCHIVED'}),true);
    expect((await handler(request(body,fixture.admin))).status).toBe(404);
  });

  it('compare le checksum déclaré aux octets Storage et refuse une fausse empreinte calculée',async()=>{
    const file=new File(['%PDF-actual-original'],'original.pdf',{type:'application/pdf'});
    const path='isolated/forged-checksum.pdf';blobs.set(`public_documents/${path}`,file);
    await fixture.db.query('insert into storage.objects(id,bucket_id,name) values($1,$2,$3)',['forged-file','public_documents',path]);
    await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','forged-doc',null,{title:'Fichier fictif',category:'BUDGET_OFFICIEL',institution_name:'Fictive',year:2025,file_url:'',file_name:file.name,storage_path:path,file_size_bytes:file.size,checksum_sha256:'a'.repeat(64),source_name:'Source fictive',status:'TO_VERIFY',verification_status:'TO_VERIFY'}),true);
    expect((await handler(request({action:'attest-document',id:'forged-doc'},fixture.manager))).status).toBe(409);
    expect((await fixture.db.query("select * from private.admin_document_file_checks where document_id='forged-doc'")).rows).toEqual([]);
    await expect(fixture.session(fixture.manager,()=>fixture.mutate('public_documents','forged-doc',1,{status:'VERIFIED'},undefined,'Contrôle humain mais empreinte fausse'))).rejects.toThrow(/Actual file/);
    expect((await handler(request({action:'attest-document',id:'forged-doc'},fixture.moderator))).status).toBe(403);
    expect((await handler(request({action:'attest-document',id:'forged-doc'},fixture.citizen))).status).toBe(403);
    expect((await handler(request({action:'attest-document',id:'forged-doc'}))).status).toBe(401);
  });

  it('contrôle chaque fascicule réel, calcule un manifeste versionné puis vérifie et publie séparément',async()=>{
    api.upload.mockImplementation(async(path:string,file:File)=>{
      blobs.set(`public_documents/${path}`,file);
      await fixture.db.query('insert into storage.objects(id,bucket_id,name) values($1,$2,$3)',[crypto.randomUUID(),'public_documents',path]);
      return {data:{path},error:null};
    });
    const files=[new File(['%PDF-part-one-original'],'one.pdf',{type:'application/pdf'}),new File(['%PDF-part-two-original'],'two.pdf',{type:'application/pdf'})];
    const {parts,checksum}=await DocumentStorageService.uploadMultipartDocuments([{file:files[0],page_start:1,page_end:2},{file:files[1],page_start:3,page_end:4}],{institutionId:'historical',fiscalYear:2025,documentType:'COMPTE_ADMINISTRATIF'},4);
    expect(parts.map(part=>part.checksum_sha256)).toEqual(await Promise.all(files.map(calculateFileSha256)));
    expect(await DocumentStorageService.calculateMultipartSha256(parts)).toBe(checksum);
    expect(api.upload).toHaveBeenLastCalledWith(parts[1].storage_path,files[1],expect.objectContaining({upsert:false}));
    const row=await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','multipart-actual',null,{title:'CA multipart fictif',category:'COMPTE_ADMINISTRATIF',institution_name:'Historique',institution_id:'historical',fiscal_year:2025,year:2025,document_type:'COMPTE_ADMINISTRATIF',file_url:'',file_name:'fascicules.pdf',storage_path:null,checksum_sha256:null,manifest_sha256:checksum,source_name:'Collectivité fictive',status:'TO_VERIFY',verification_status:'TO_VERIFY',is_multipart:true,parts_count:2,document_parts:parts,page_count:4,is_scanned:true,has_text_layer:false,ocr_status:'OCR_PENDING'}),true);
    expect(row.checksum_status).toBe('DECLARED');
    const attestation=await handler(request({action:'attest-document',id:'multipart-actual'},fixture.manager));
    expect(attestation.status).toBe(200);expect((await attestation.json()).checked_files).toBe(2);
    await expect(fixture.session(fixture.manager,()=>fixture.mutate('public_documents','multipart-actual',1,{status:'PUBLISHED'}))).rejects.toThrow(/Verify/);
    const verified=await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','multipart-actual',1,{status:'VERIFIED'},undefined,'Contrôle humain des originaux et plages de pages'),true);
    expect(verified.checksum_status).toBe('COMPUTED');
    expect(verified.document_parts).toEqual(expect.arrayContaining([expect.objectContaining({part_number:1,checksum_status:'COMPUTED',page_range_verified:true})]));
    await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','multipart-actual',2,{status:'PUBLISHED'}),true);
    expect((await fixture.session(null,()=>fixture.db.query("select status from public.public_documents where id='multipart-actual'"))).rows).toEqual([{status:'PUBLISHED'}]);
    await expect(fixture.session(fixture.manager,()=>fixture.mutate('public_documents','multipart-actual',3,{document_parts:[{...parts[0],storage_path:'replacement.pdf'},parts[1]]}))).rejects.toThrow(/new version/);
    await expect(fixture.session(fixture.manager,()=>fixture.db.exec("delete from private.admin_document_file_checks where document_id='multipart-actual'"))).rejects.toThrow(/permission/);
    expect((await fixture.db.query("select status from public.public_documents where id='cocody-reference'")).rows).toEqual([{status:'TO_VERIFY'}]);
    expect((await fixture.db.query("select total_amount from public.local_budgets where id='isolated-bp'")).rows).toEqual([{total_amount:300}]);
  });

  it('refuse trous, chevauchements, ordre inversé et total incohérent avant tout upload',async()=>{
    const a=new File(['%PDF-a'],'a.pdf',{type:'application/pdf'}),b=new File(['%PDF-b'],'b.pdf',{type:'application/pdf'});
    api.upload.mockClear();
    for(const ranges of [[[1,2],[2,4]],[[1,2],[4,5]],[[3,4],[1,2]]]) await expect(DocumentStorageService.uploadMultipartDocuments(ranges.map(([page_start,page_end],index)=>({file:index ? b : a,page_start,page_end})),{institutionId:'historical',fiscalYear:2025,documentType:'COMPTE_ADMINISTRATIF'})).rejects.toThrow(/plages invalides/);
    await expect(DocumentStorageService.uploadMultipartDocuments([{file:a,page_start:1,page_end:2},{file:b,page_start:3,page_end:4}],{institutionId:'historical',fiscalYear:2025,documentType:'COMPTE_ADMINISTRATIF'},5)).rejects.toThrow(/incohérent/);
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('ne signe publiquement que le fascicule demandé d’un document publié, jamais un chemin substitué',async()=>{
    const document=(await fixture.db.query<{document_parts:{id:string;storage_path:string}[];revision:number}>("select document_parts,revision from public.public_documents where id='multipart-actual'")).rows[0];
    const part=document.document_parts[1];
    const signedResponse=await publicHandler(request({document_id:'multipart-actual',part_id:part.id}));
    expect(signedResponse.status).toBe(200);expect((await signedResponse.json()).expires_in).toBe(60);
    expect(signed).toHaveBeenLastCalledWith(part.storage_path,60);
    expect((await publicHandler(request({document_id:'multipart-actual',part_id:'other-original'}))).status).toBe(404);
    expect((await publicHandler(request({document_id:'multipart-actual',part_id:part.id,storage_path:'another.pdf'}))).status).toBe(400);
    const key=`public_documents/${part.storage_path}`,original=blobs.get(key)!;
    blobs.delete(key);expect((await publicHandler(request({document_id:'multipart-actual',part_id:part.id}))).status).toBe(404);blobs.set(key,original);
    await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','multipart-actual',document.revision,{status:'TO_VERIFY'}),true);
    expect((await publicHandler(request({document_id:'multipart-actual',part_id:part.id}))).status).toBe(404);
    expect((await publicHandler(request({document_id:'cocody-reference'}))).status).toBe(404);
  });

  it('protège les originaux contre UPDATE et DELETE malgré des GRANT et politiques permissives',async()=>{
    await fixture.db.exec("grant update,delete on storage.objects to authenticated; create policy unsafe_original_update on storage.objects for update using(true) with check(true); create policy unsafe_original_delete on storage.objects for delete using(true)");
    try {
      const original=(await fixture.db.query<{storage_path:string}>("select document_parts->0->>'storage_path' storage_path from public.public_documents where id='multipart-actual'")).rows[0].storage_path;
      for(const id of [fixture.admin,fixture.manager,fixture.moderator,fixture.citizen]) {
        await fixture.session(id,()=>fixture.db.query("update storage.objects set name='silent-replacement.pdf' where bucket_id='public_documents' and name=$1",[original]),true);
        await fixture.session(id,()=>fixture.db.query("delete from storage.objects where bucket_id='public_documents' and name=$1",[original]),true);
        expect((await fixture.db.query('select name from storage.objects where name=$1',[original])).rows).toEqual([{name:original}]);
      }
      await fixture.session(fixture.admin,()=>fixture.db.exec("delete from storage.objects where bucket_id='admin_media'"),true);
      expect((await fixture.db.query<{count:number}>("select count(*)::int count from storage.objects where bucket_id='admin_media'")).rows[0].count).toBeGreaterThan(0);
    } finally {await fixture.db.exec('drop policy unsafe_original_update on storage.objects; drop policy unsafe_original_delete on storage.objects; revoke update,delete on storage.objects from authenticated');}
  });

  it('préserve la vérification des fichiers CSV sans la confondre avec une extraction financière',async()=>{
    const file=new File(['libelle;montant\nTest;0\n'],'data.csv',{type:'text/csv'}),hash=await calculateFileSha256(file),path='isolated/data.csv';
    blobs.set(`public_documents/${path}`,file);
    await fixture.db.query('insert into storage.objects(id,bucket_id,name) values($1,$2,$3)',['csv-original','public_documents',path]);
    await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','csv-document',null,{title:'CSV isolé',category:'ETUDE_TECHNIQUE',institution_name:'Fictive',year:2025,file_url:'',file_name:file.name,file_format:'CSV',storage_path:path,file_size_bytes:file.size,mime_type:file.type,checksum_sha256:hash,source_name:'Source fictive',status:'TO_VERIFY',verification_status:'TO_VERIFY'}),true);
    expect((await handler(request({action:'attest-document',id:'csv-document'},fixture.manager))).status).toBe(200);
    const checked=await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','csv-document',1,{status:'VERIFIED'},undefined,'Contrôle humain du CSV original et de la source'),true);
    expect(checked.checksum_status).toBe('COMPUTED');expect(checked.status).toBe('VERIFIED');
    expect((await fixture.db.query("select total_amount from public.local_budgets where id='isolated-bp'")).rows).toEqual([{total_amount:300}]);
  });

  it('délivre les octets contrôlés et persiste un compteur atomique sans compter les consultations ni les échecs',async()=>{
    const row=(await fixture.db.query<{revision:number}>("select revision from public.public_documents where id='csv-document'")).rows[0];
    await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','csv-document',row.revision,{status:'PUBLISHED'},undefined,'Publication humaine du fichier isolé'),true);
    const read=async()=> (await fixture.db.query<{downloads_count:number;revision:number}>("select downloads_count,revision from public.public_documents where id='csv-document'")).rows[0];
    const before=await read();
    const body={document_id:'csv-document',action:'download',request_id:crypto.randomUUID()};
    expect((await publicHandler(request({document_id:'csv-document'}))).status).toBe(200);
    expect(await read()).toEqual(before);
    const key='public_documents/isolated/data.csv',original=blobs.get(key)!;
    blobs.delete(key);expect((await publicHandler(request(body))).status).toBe(404);blobs.set(key,new Blob(['altéré']));
    expect((await publicHandler(request(body))).status).toBe(404);blobs.set(key,original);
    expect((await publicHandler(request({...body,document_id:'cocody-reference'}))).status).toBe(404);
    expect((await publicHandler(request({...body,storage_path:'forged.pdf'}))).status).toBe(400);
    expect(await read()).toEqual(before);
    const delivered=await publicHandler(request(body));
    expect(delivered.status).toBe(200);
    expect(await delivered.text()).toBe(await original.text());
    expect(Number(delivered.headers.get('X-Document-Delivery-Count'))).toBe(before.downloads_count+1);
    expect((await publicHandler(request(body))).status).toBe(200);
    expect((await read()).downloads_count).toBe(before.downloads_count+1);
    const responses=await Promise.all(Array.from({length:12},()=>publicHandler(request({...body,request_id:crypto.randomUUID()}))));
    expect(responses.map(r=>r.status)).toEqual(Array(12).fill(200));
    expect(await read()).toEqual({...before,downloads_count:before.downloads_count+13});
    const receipts=await fixture.db.query<{count:number}>("select count(*)::int count from private.document_delivery_receipts where document_id='csv-document'");
    expect(receipts.rows[0].count).toBe(13);
    for(const identity of [null,fixture.citizen,fixture.moderator,fixture.manager,fixture.admin]) {
      await expect(fixture.session(identity,()=>fixture.db.exec("update public.public_documents set downloads_count=900 where id='csv-document'"))).rejects.toThrow(/permission/);
      await expect(fixture.session(identity,()=>fixture.db.query('select public.record_document_delivery($1,$2,$3,$4,$5)',[body.document_id,crypto.randomUUID(),'isolated/data.csv','a'.repeat(64),'b'.repeat(64)]))).rejects.toThrow(/permission/);
    }
    for(let i=0;i<7;i++) expect((await publicHandler(request({...body,request_id:crypto.randomUUID()}))).status).toBe(200);
    expect((await publicHandler(request({...body,request_id:crypto.randomUUID()}))).status).toBe(503);
    expect((await read()).downloads_count).toBe(before.downloads_count+20);
    const forwarded=new Request('https://isolated.example/function',{method:'POST',headers:{'x-forwarded-for':'forged-client, unknown'},body:JSON.stringify({...body,request_id:crypto.randomUUID()})});
    expect((await publicHandler(forwarded)).status).toBe(503);
    expect((await read()).downloads_count).toBe(before.downloads_count+20);
  });

  it('ne comptabilise ni les liens externes ni une réponse annulée avant la remise',async()=>{
    await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','external-delivery',null,{title:'Source externe',category:'ETUDE_TECHNIQUE',institution_name:'Fictive',year:2025,file_url:'https://example.test/source.pdf',file_name:'source.pdf',source_name:'Source isolée'}),true);
    await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','external-delivery',1,{status:'VERIFIED'},undefined,'Vérification humaine de la source'),true);
    await fixture.session(fixture.manager,()=>fixture.mutate('public_documents','external-delivery',2,{status:'PUBLISHED'},undefined,'Publication humaine de la source'),true);
    expect((await publicHandler(request({document_id:'external-delivery',action:'download',request_id:crypto.randomUUID()}))).status).toBe(409);
    expect((await publicHandler(request({document_id:'external-delivery'}))).status).toBe(200);
    expect((await fixture.db.query("select downloads_count from public.public_documents where id='external-delivery'")).rows).toEqual([{downloads_count:0}]);
    const before=(await fixture.db.query("select downloads_count from public.public_documents where id='csv-document'")).rows;
    const controller=new AbortController();controller.abort();
    const cancelled=new Request('https://isolated.example/function',{method:'POST',body:JSON.stringify({document_id:'csv-document',action:'download',request_id:crypto.randomUUID()}),signal:controller.signal});
    expect((await publicHandler(cancelled)).status).toBe(499);
    expect((await fixture.db.query("select downloads_count from public.public_documents where id='csv-document'")).rows).toEqual(before);
  });
});
