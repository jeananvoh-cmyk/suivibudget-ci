import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createAdminPersistenceFixture, createProductionSchemaFixture } from './adminPersistenceFixtures';
import { readFileSync } from 'node:fs';
import { calculateManifestSha256, normalizeOcrStatus, OCR_STATUSES } from '../../../supabase/functions/_shared/documentIntegrity';
import { PGlite } from '@electric-sql/pglite';

let fixture: Awaited<ReturnType<typeof createAdminPersistenceFixture>>;
let db: typeof fixture.db;
let session: typeof fixture.session;
let mutate: typeof fixture.mutate;
let admin: string, manager: string, moderator: string, citizen: string;
beforeAll(async()=>{ fixture=await createAdminPersistenceFixture(); ({db,session,mutate,admin,manager,moderator,citizen}=fixture); },60000);
afterAll(async()=>{ await db?.close(); });

describe('Contrat PostgreSQL admin, transactions et RLS isolées', () => {
  it.each(OCR_STATUSES)('accepte le contrat OCR %s côté client et PostgreSQL',async(status)=>{
    expect(normalizeOcrStatus(status)).toBe(status);
    const row=await session(manager,()=>mutate('public_documents',`ocr-${status}`,null,{title:'OCR fictif',category:'ETUDE_TECHNIQUE',institution_name:'Fictive',year:2024,file_url:'',file_name:'scan.pdf',ocr_status:status}),true);
    expect(row.ocr_status).toBe(status);
  });

  it('convertit explicitement les anciens statuts sans inventer une extraction',async()=>{
    for(const [value,scanned,text,expected] of [['NONE',null,null,null],['NONE',false,true,'NOT_APPLICABLE'],['NONE',true,false,null],['PENDING',true,false,'OCR_PENDING']] as const) {
      expect(normalizeOcrStatus(value,scanned,text)).toBe(expected);
      expect((await db.query<{value:string|null}>('select private.admin_normalize_ocr($1,$2,$3) value',[value,scanned,text])).rows[0].value).toBe(expected);
    }
    await expect(session(manager,()=>mutate('public_documents','invalid-ocr',null,{title:'OCR fictif',category:'ETUDE_TECHNIQUE',institution_name:'Fictive',year:2024,file_url:'',file_name:'scan.pdf',ocr_status:'NOT_APPLICABLE',is_scanned:true}))).rejects.toThrow();
  });

  it('calcule le même manifeste UTF-8 en SQL et en JavaScript et rejette les altérations',async()=>{
    const parts=[1,2,3].map(n=>({id:`part-${n}`,part_number:n,storage_path:`isolated/${n}.pdf`,checksum_sha256:String(n).repeat(64),file_size_bytes:n*30,page_start:(n-1)*2+1,page_end:n*2}));
    for(const count of [2,3]) {
      const current=parts.slice(0,count);
      expect((await db.query<{hash:string}>('select private.admin_manifest_sha256($1::jsonb) hash',[JSON.stringify(current)])).rows[0].hash).toBe(await calculateManifestSha256(current));
    }
    expect(await calculateManifestSha256(parts)).not.toBe(await calculateManifestSha256(parts.map((p,i)=>i===1 ? {...p,checksum_sha256:'a'.repeat(64)} : p)));
    for(const invalid of [parts.slice(0,1),[parts[0],parts[2]],[...parts].reverse(),[parts[0],{...parts[1],checksum_sha256:'incorrect'}],[parts[0],{...parts[1],page_start:2}],[parts[0],{...parts[1],file_size_bytes:undefined}],[parts[0],{...parts[1],storage_path:parts[0].storage_path}]]) {
      await expect(calculateManifestSha256(invalid)).rejects.toThrow();
      await expect(db.query('select private.admin_manifest_sha256($1::jsonb)',[JSON.stringify(invalid)])).rejects.toThrow();
    }
  });

  it('applique les deux migrations dans l’ordre au schéma réel exporté sans données de production',async()=>{
    const actual=await createProductionSchemaFixture();
    try {
      await actual.exec(`insert into auth.users(id) values('${admin}'); insert into public.profiles(id,email,full_name,role,is_active) values('${admin}','isolated@example.test','Fictif','ADMIN',true);select set_config('request.jwt.claim.sub','${admin}',false);`);
      await actual.exec(`insert into public.institutions(id,name,type,total_budget_fcfa) values('isolated-historical','Historique fictif','MAIRIE',123);
        insert into public.public_documents(id,title,category,institution_name,year,file_url,file_name,status,verification_status,checksum_sha256) values('isolated-historical-doc','Historique fictif','ETUDE_TECHNIQUE','Fictive',2024,'https://example.test/old.pdf','old.pdf','TO_VERIFY','TO_VERIFY',repeat('a',64));`);
      for(let run=0;run<2;run++) for(const path of ['20261013165625_admin_dashboard_persistence_hardening.sql','20261013200000_multipart_ca_documents.sql']) await actual.exec(readFileSync(`supabase/migrations/${path}`,'utf8'));
      expect((await actual.query('select is_multipart,parts_count,is_scanned,has_text_layer,ocr_status,manifest_sha256,checksum_sha256 from public.public_documents')).rows).toEqual([{is_multipart:null,parts_count:null,is_scanned:null,has_text_layer:null,ocr_status:null,manifest_sha256:null,checksum_sha256:'a'.repeat(64)}]);
      expect((await actual.query('select total_budget_fcfa from public.institutions')).rows).toEqual([{total_budget_fcfa:'123.00'}]);
      expect((await actual.query('select public.admin_persistence_version() version')).rows).toEqual([{version:3}]);
      await actual.exec(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${admin}',true);`);
      const saved=await actual.query<{row:{revision:number}}>('select public.admin_mutate($1,$2,null,$3::jsonb,$4::uuid,$5) row',['institutions','isolated-new',JSON.stringify({name:'Fictive',type:'MAIRIE'}),crypto.randomUUID(),'Recette isolée du schéma réel']);
      expect(saved.rows[0].row.revision).toBe(1);
      await actual.exec('rollback');
      await actual.exec("begin;set local role anon;select set_config('request.jwt.claim.sub','',true)");
      expect((await actual.query("select id from public.public_documents where id='isolated-historical-doc'")).rows).toEqual([]);
      await actual.exec('rollback');
    } finally {await actual.close();}
  },60000);

  it('converge sans erreur depuis l’état distant cdesuvcozcetdtvibgqs (20261014155231 déjà appliqué + document Cocody publié)',async()=>{
    const remote=await createProductionSchemaFixture();
    try {
      // 1. Reproduce the remote 20261014155231 (PR #62 multipart_ca_documents) migration already applied on cdesuvcozcetdtvibgqs
      await remote.exec(`
        alter table public.public_documents
          add column if not exists is_multipart boolean not null default false,
          add column if not exists parts_count integer,
          add column if not exists document_parts jsonb not null default '[]'::jsonb,
          add column if not exists is_scanned boolean not null default false,
          add column if not exists has_text_layer boolean not null default true,
          add column if not exists ocr_status text not null default 'NOT_APPLICABLE';
        alter table public.public_documents drop constraint if exists chk_pubdocs_ocr_status;
        alter table public.public_documents add constraint chk_pubdocs_ocr_status check (
          ocr_status in ('NOT_APPLICABLE','NOT_IMPLEMENTED','OCR_PENDING','PROCESSED','MANUAL_TRANSCRIPTION')
        );
      `);
      // 2. Seed active ADMIN operator and the exact live Cocody CA 2024 published document row + storage object
      await remote.exec(`
        insert into auth.users(id) values('${admin}');
        insert into public.profiles(id,email,full_name,role,is_active) values('${admin}','admin@example.test','Admin','ADMIN',true);
        insert into public.institutions(id,name,type) values('inst-com-cocody','Commune de Cocody','MAIRIE');
        insert into storage.buckets(id,name,public) values('public_documents','public_documents',false);
        insert into storage.objects(bucket_id,name) values('public_documents','ca/2024/inst-com-cocody/1791994418805-COMMUNE_DE_COCODY.pdf');
        alter table public.public_documents disable trigger user;
        insert into public.public_documents(
          id,title,category,institution_name,institution_id,institution_type,year,fiscal_year,document_type,
          storage_bucket,storage_path,file_url,file_name,original_filename,mime_type,file_size_bytes,page_count,
          source_name,status,verification_status,is_official,checksum_sha256,version,
          is_multipart,parts_count,document_parts,is_scanned,has_text_layer,ocr_status
        ) values(
          'doc-dff4865a-c6a8-418e-8895-626258e409d0','Compte Administratif 2024 - Commune de Cocody','COMPTE_ADMINISTRATIF',
          'Commune de Cocody','inst-com-cocody','COMMUNE',2024,2024,'COMPTE_ADMINISTRATIF',
          'public_documents','ca/2024/inst-com-cocody/1791994418805-COMMUNE_DE_COCODY.pdf','',
          'COMMUNE DE COCODY.pdf','COMMUNE DE COCODY.pdf','application/pdf',14072943,45,
          'Mairie de Cocody','PUBLISHED','VERIFIED',true,
          '941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf',1,
          false,null,'[]'::jsonb,false,true,'NOT_APPLICABLE'
        );
        alter table public.public_documents enable trigger user;
      `);
      // 3. Run 20261013165625_admin_dashboard_persistence_hardening.sql WITHOUT any JWT claim (as supabase db push / SQL Editor runs)
      await remote.exec(readFileSync('supabase/migrations/20261013165625_admin_dashboard_persistence_hardening.sql','utf8'));
      await remote.exec(readFileSync('supabase/migrations/20261013200000_multipart_ca_documents.sql','utf8'));

      const docState=(await remote.query<{status:string;verification_status:string;checksum_status:string;revision:number}>(
        "select status,verification_status,checksum_status,revision from public.public_documents where id='doc-dff4865a-c6a8-418e-8895-626258e409d0'"
      )).rows[0];
      expect(docState).toEqual({status:'PUBLISHED',verification_status:'VERIFIED',checksum_status:'DECLARED',revision:1});
      expect((await remote.query('select * from private.admin_document_file_checks')).rows).toEqual([]);
      await remote.query('select public.admin_confirm_document_integrity($1,$2,$3,$4::jsonb)',[
        'doc-dff4865a-c6a8-418e-8895-626258e409d0',1,admin,JSON.stringify([{storage_path:'ca/2024/inst-com-cocody/1791994418805-COMMUNE_DE_COCODY.pdf',checksum_sha256:'941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf',file_size_bytes:14072943}]),
      ]);

      // 5. Verify ADMIN can update non-identity fields (e.g. description and parts_count=1 normalization) via admin_mutate without deadlock
      await remote.exec(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${admin}',true);`);
      const updated=await remote.query<{row:{revision:number;description:string;status:string}}>(
        'select public.admin_mutate($1,$2,$3,$4::jsonb,$5::uuid,$6) row',
        ['public_documents','doc-dff4865a-c6a8-418e-8895-626258e409d0',1,JSON.stringify({description:'Synthèse p. 40 PDF (41/45 imprimée)',parts_count:1}),crypto.randomUUID(),'Précision de la référence de page de synthèse']
      );
      expect(updated.rows[0].row).toMatchObject({revision:2,description:'Synthèse p. 40 PDF (41/45 imprimée)',status:'PUBLISHED'});
      await remote.exec('rollback');
    } finally {await remote.close();}
  },60000);
  it('cloisonne les événements financiers et de modération au niveau RLS',async()=>{
    await session(admin,()=>mutate('institutions','audit-private',null,{name:'Brouillon financier privé',type:'MAIRIE'}),true);
    await session(moderator,()=>db.exec("update public.citizen_proofs set verification_status='REJECTED' where id='pending-proof'"),true);
    const read=()=>db.query<{entity_type:string}>("select entity_type from public.admin_audit_events where entity_id in ('audit-private','pending-proof')");
    expect((await session(admin,read)).rows.map(row=>row.entity_type)).toEqual(expect.arrayContaining(['institutions','citizen_proofs']));
    expect((await session(manager,read)).rows.map(row=>row.entity_type)).toEqual(['institutions']);
    expect((await session(moderator,read)).rows.map(row=>row.entity_type)).toEqual(['citizen_proofs']);
    expect((await session(citizen,read)).rows).toEqual([]);
    await expect(session(null,read)).rejects.toThrow(/permission/);
  });

  it('omet références Storage, URL privées et contenu libre des snapshots du journal',async()=>{
    await session(admin,()=>mutate('institutions','audit-redaction',null,{name:'Entité isolée',type:'MAIRIE',leader_photo_url:`storage://admin_media/${admin}/${'f'.repeat(64)}.png`,contact_email:'private@example.test'}),true);
    const row=(await session(admin,()=>db.query<{after_data:object}>("select after_data from public.admin_audit_events where entity_id='audit-redaction'"))).rows[0];
    expect(row.after_data).not.toHaveProperty('leader_photo_url');
    expect(JSON.stringify(row)).not.toContain('private@example.test');
  });
  it('protège les paramètres publics et refuse les secrets ou URL exécutables',async()=>{
    await expect(session(manager,()=>mutate('site_settings','settings-test',null,{portal_name:'Test',fiscal_year:2026}))).rejects.toThrow();
    await expect(session(admin,()=>mutate('site_settings','settings-test',null,{portal_name:'Test',fiscal_year:2026,settings_metadata:{service_role:'interdit'}}))).rejects.toThrow(/Unsupported/);
    await expect(session(admin,()=>mutate('site_settings','settings-test',null,{portal_name:'Test',fiscal_year:2026,settings_metadata:{announcement_banner_link:'javascript:alert(1)'}}))).rejects.toThrow(/Invalid/);
    await session(admin,()=>mutate('site_settings','settings-test',null,{portal_name:'Test isolé',fiscal_year:2026,settings_metadata:{announcement_banner_link:'/documents'}}),true);
    expect((await session(null,()=>db.query("select settings_metadata from public.site_settings where id='settings-test'"))).rows).toEqual([{settings_metadata:{announcement_banner_link:'/documents'}}]);
  });
  it('attribue la modération au compte réel et garde l’identité privée hors projection publique et audit',async()=>{
    await session(moderator,()=>db.query("update public.citizen_proofs set verification_status='APPROVED',verified_by=$1,verified_at='2000-01-01' where id='pending-proof'",[admin]),true);
    const proof=(await db.query<{verified_by:string;verified_at:Date;citizen_name:string}>("select verified_by,verified_at,citizen_name from public.citizen_proofs where id='pending-proof'")).rows[0];
    expect(proof.verified_by).toBe(moderator);expect(proof.verified_at.getUTCFullYear()).toBeGreaterThan(2000);expect(proof.citizen_name).toBe('Identité privée isolée');
    const publicRows=await session(null,()=>db.query<Record<string,unknown>>("select * from public.public_citizen_proofs where id='pending-proof'"));
    expect(publicRows.rows[0].citizen_name).toBe('Citoyen observateur');
    expect(publicRows.rows[0]).not.toHaveProperty('citizen_whatsapp');expect(publicRows.rows[0]).not.toHaveProperty('citizen_user_id');
    const audit=(await db.query<{actor_id:string;after_data:Record<string,unknown>}>("select actor_id,after_data from public.admin_audit_events where entity_type='citizen_proofs'")).rows[0];
    expect(audit.actor_id).toBe(moderator);expect(audit.after_data).not.toHaveProperty('citizen_name');expect(audit.after_data).not.toHaveProperty('citizen_whatsapp');
    await expect(session(citizen,()=>db.exec("update public.citizen_proofs set verification_status='REJECTED' where id='pending-proof'"))).resolves.toBeDefined();
    expect((await db.query<{verification_status:string}>("select verification_status from public.citizen_proofs where id='pending-proof'")).rows[0].verification_status).toBe('APPROVED');
    await expect(session(admin,()=>db.exec("delete from public.citizen_proofs where id='pending-proof'"))).rejects.toThrow(/permission/);
  });
  it('conserve les budgets historiques lors d’une modification de profil et journalise l’acteur serveur', async () => {
    await session(manager,async () => {
      const row = await mutate('institutions','historical',1,{website:'https://example.org',contact_email:'private@example.org'});
      expect(row.total_budget_fcfa).toBe(300);
      expect(row.revision).toBe(2);
      const audit = (await db.query<{ actor_id: string; after_data: object }>("select actor_id,after_data from public.admin_audit_events where entity_type='institutions' and entity_id='historical'")).rows[0];
      expect(audit.actor_id).toBe(manager);
      expect(audit.after_data).not.toHaveProperty('contact_email');
    });
    await expect(session(admin,()=>mutate('institutions','historical',1,{total_budget_fcfa:0}))).rejects.toThrow(/Unsupported/);
    await expect(session(admin,()=>db.exec("update public.institutions set total_budget_fcfa=0 where id='historical'"))).rejects.toThrow(/Financial/);
  });

  it('persiste après commit et relecture dans une deuxième session, puis refuse une version obsolète', async () => {
    await session(admin,()=>mutate('institutions','reload-test',null,{name:'Persistance isolée',type:'MAIRIE'}),true);
    const reread = await session(manager,()=>db.query('select * from public.institutions where id=$1',['reload-test']));
    expect(reread.rows).toHaveLength(1);
    await session(manager,()=>mutate('institutions','reload-test',1,{name:'Session B'}),true);
    await expect(session(admin,()=>mutate('institutions','reload-test',1,{name:'Écrasement A'}))).rejects.toThrow(/Conflict/);
    expect((await db.query("select name from public.institutions where id='reload-test'")).rows[0]).toEqual({name:'Session B'});
  });

  it('neutralise le double envoi et rejette la réutilisation d’une clé pour un autre contenu', async () => {
    const operation = crypto.randomUUID();
    const patch = {name:'Double envoi',type:'MAIRIE'};
    await session(admin,async()=>{
      await mutate('institutions','double',null,patch,operation);
      expect((await mutate('institutions','double',null,patch,operation)).revision).toBe(1);
      expect((await db.query('select count(*)::integer count from public.admin_audit_events where operation_id=$1',[operation])).rows[0]).toEqual({count:1});
    },true);
    await expect(session(admin,()=>mutate('institutions','double',null,{...patch,name:'Autre'},operation))).rejects.toThrow(/already used/);
  });

  it('refuse au public, au citoyen et au modérateur les mutations financières, même avec de faux rôles JWT', async () => {
    for (const id of [null,citizen,moderator]) {
      await expect(session(id,async()=>{
        await db.exec(`select set_config('request.jwt.claims','{"user_metadata":{"role":"ADMIN"}}',true)`);
        return mutate('institutions','attack',null,{name:'Injection',type:'MAIRIE'});
      })).rejects.toThrow();
    }
  });

  it('publie explicitement les articles, masque les brouillons et interdit leur création au DATA_MANAGER', async () => {
    const patch={title:'Article test',slug:'article-test',category:'ACTUALITE',summary:'Résumé',content:'Contenu'};
    await expect(session(manager,()=>mutate('news_articles','article',null,patch))).rejects.toThrow();
    await session(moderator,()=>mutate('news_articles','article',null,patch),true);
    await expect(session(moderator,()=>db.exec("update public.news_articles set workflow_status='PUBLISHED' where id='article'"))).rejects.toThrow(/review/);
    expect((await session(null,()=>db.query("select id from public.news_articles where id='article'"))).rows).toHaveLength(0);
    await expect(session(moderator,()=>mutate('news_articles','article',1,{workflow_status:'PUBLISHED'}))).rejects.toThrow(/review/);
    await session(moderator,()=>mutate('news_articles','article',1,{workflow_status:'IN_REVIEW'}),true);
    await session(moderator,()=>mutate('news_articles','article',2,{workflow_status:'PUBLISHED'}),true);
    expect((await session(null,()=>db.query("select id from public.news_articles where id='article'"))).rows).toHaveLength(1);
    await session(moderator,()=>mutate('news_articles','article',3,{workflow_status:'DRAFT'}),true);
    expect((await session(null,()=>db.query("select id from public.news_articles where id='article'"))).rows).toHaveLength(0);
  });

  it('impose une revue institutionnelle en accès direct et conserve l’exception des contacts CAIDP vérifiés',async()=>{
    await session(manager,()=>mutate('institutions','review-institution',null,{name:'Institution fictive à relire',type:'MAIRIE'}),true);
    await expect(session(manager,()=>mutate('institutions','review-institution',1,{publication_status:'PUBLISHED'}))).rejects.toThrow(/IN_REVIEW/);
    await expect(session(manager,()=>db.exec("update public.institutions set publication_status='PUBLISHED' where id='review-institution'"))).rejects.toThrow(/IN_REVIEW/);
    await session(manager,()=>mutate('institutions','review-institution',1,{publication_status:'IN_REVIEW'}),true);
    await session(manager,()=>mutate('institutions','review-institution',2,{publication_status:'PUBLISHED'},undefined,'Relecture de la fiche et de ses références publiques'),true);
    expect((await session(null,()=>db.query("select id from public.institutions where id='review-institution'"))).rows).toHaveLength(1);
    await session(manager,()=>mutate('caidp_directory','review-exception',null,{company_name:'Contact fictif',category:'MAIRIE',source:'Référence institutionnelle fictive'}),true);
    await session(manager,()=>mutate('caidp_directory','review-exception',1,{verification_status:'VERIFIED'},undefined,'Contrôle humain du contact sur sa référence institutionnelle'),true);
    await session(manager,()=>mutate('caidp_directory','review-exception',2,{publication_status:'PUBLISHED'}),true);
  });

  it('maintient un budget inconnu à null et empêche publication sans preuve ainsi que le remplacement d’exercice', async () => {
    await session(manager,()=>mutate('budget_projects','unknown',null,{title:'Projet',commune_name:'Cocody',region_name:'Abidjan',category:'Eau',fiscal_year:2024,budget_amount_fcfa:null}),true);
    expect((await db.query("select budget_amount_fcfa from public.budget_projects where id='unknown'")).rows[0]).toEqual({budget_amount_fcfa:null});
    await expect(session(manager,()=>mutate('budget_projects','unknown',1,{publication_status:'PUBLISHED'}))).rejects.toThrow(/evidence/);
    await expect(session(manager,()=>mutate('budget_projects','unknown',1,{fiscal_year:2025}))).rejects.toThrow(/Fiscal year/);
  });

  it('refuse les doublons CAIDP et demande provenance et motif pour toute vérification humaine', async () => {
    const patch={company_name:'Organisme isolé',category:'MAIRIE',commune:'Test',source:'Source test',email:'test@example.org'};
    await session(manager,()=>mutate('caidp_directory','directory',null,{...patch,verification_status:'VERIFIED'}),true);
    expect((await db.query("select verification_status from public.caidp_directory where id='directory'")).rows[0]).toEqual({verification_status:'TO_VERIFY'});
    await expect(session(manager,()=>mutate('caidp_directory','duplicate',null,patch))).rejects.toThrow(/Duplicate/);
    await expect(session(manager,()=>mutate('caidp_directory','directory',1,{verification_status:'VERIFIED'},undefined,'Court'))).rejects.toThrow(/reason/);
    await session(manager,()=>mutate('caidp_directory','directory',1,{verification_status:'VERIFIED'},undefined,'Contrôle humain de la source du contact'),true);
    await session(manager,()=>mutate('caidp_directory','directory',2,{email:'new@example.org'}),true);
    expect((await db.query("select verification_status,verified_by from public.caidp_directory where id='directory'")).rows[0]).toEqual({verification_status:'TO_VERIFY',verified_by:null});
  });

  it('ne clôture pas une tâche documentaire non vérifiée et conserve Cocody TO_VERIFY', async () => {
    const patch={type:'DOCUMENT_VERIFICATION',source_id:'cocody-reference',title:'Vérifier CA',entity_name:'Cocody',target_tab:'comptes_administratifs',status:'COMPLETED'};
    await expect(session(manager,()=>mutate('admin_tasks','task-cocody',null,patch))).rejects.toThrow(/justify/);
    await session(manager,()=>mutate('admin_tasks','task-cocody',null,{...patch,status:'IN_PROGRESS',assignee_id:manager}),true);
    await expect(session(moderator,()=>mutate('admin_tasks','task-cocody',1,{status:'COMPLETED'}))).rejects.toThrow();
    expect((await db.query("select status,verification_status from public.public_documents where id='cocody-reference'")).rows[0]).toEqual({status:'TO_VERIFY',verification_status:'TO_VERIFY'});
  });

  it('préserve l’identité des fichiers et refuse une publication documentaire non vérifiée', async () => {
    await expect(session(manager,()=>db.exec("update public.public_documents set storage_path='replacement.pdf' where id='cocody-reference'"))).rejects.toThrow(/version/);
    await expect(session(manager,()=>db.exec("update public.public_documents set status='PUBLISHED' where id='cocody-reference'"))).rejects.toThrow();
    await expect(session(manager,()=>mutate('public_documents','cocody-reference',1,{status:'VERIFIED',source_name:'Source de test'},undefined,'Contrôle humain impossible : fichier absent'))).rejects.toThrow(/object missing/);
  });

  it('archive sans supprimer et empêche les écritures ou modifications du journal', async () => {
    await session(admin,()=>mutate('institutions','reload-test',2,{publication_status:'ARCHIVED',archived_at:'2000-01-01'}),true);
    expect((await db.query("select id from public.institutions where id='reload-test'")).rows).toHaveLength(1);
    expect((await session(null,()=>db.query("select id from public.institutions where id='reload-test'"))).rows).toHaveLength(0);
    await expect(session(admin,()=>db.exec("delete from public.institutions where id='reload-test'"))).rejects.toThrow();
    for (const query of ['delete from public.admin_audit_events',"update public.admin_audit_events set actor_role='ADMIN'", "insert into public.admin_audit_events(actor_id,actor_role,action,entity_type,entity_id,reason) values ('"+admin+"','ADMIN','FAKE','FAKE','fake','fake')"]) {
      await expect(session(admin,()=>db.exec(query))).rejects.toThrow(/permission/);
    }
  });

  it('annule entièrement un lot en cas de permission ou validation échouée', async () => {
    const rows=[{table:'institutions',id:'batch-good',revision:null,patch:{name:'Lot',type:'MAIRIE'},operationId:crypto.randomUUID(),reason:'Test du lot atomique'},
      {table:'institutions',id:'batch-bad',revision:null,patch:{total_budget_fcfa:10},operationId:crypto.randomUUID(),reason:'Test du lot atomique'}];
    await expect(session(admin,()=>db.query('select public.admin_mutate_batch($1::jsonb)',[JSON.stringify(rows)]))).rejects.toThrow();
    expect((await db.query("select id from public.institutions where id='batch-good'")).rows).toHaveLength(0);
  });

  it('vérifie puis publie un document isolé et conserve les versions et les auteurs', async()=>{
    const patch={title:'BP isolé',category:'BUDGET_OFFICIEL',institution_name:'Historique',institution_id:'historical',
      fiscal_year:2024,year:2024,document_type:'BUDGET_PRIMITIF',file_url:'',file_name:'bp.pdf',storage_path:'isolated/bp.pdf',
      checksum_sha256:'b'.repeat(64),file_size_bytes:12,source_name:'Collectivité de test',status:'TO_VERIFY',verification_status:'TO_VERIFY',is_official:false};
    await session(manager,()=>mutate('public_documents','isolated-doc',null,patch),true);
    await db.query("insert into private.admin_document_file_checks(document_id,storage_bucket,storage_path,checksum_sha256,file_size_bytes,checked_by) values ('isolated-doc','public_documents','isolated/bp.pdf',$1,12,$2)",['b'.repeat(64),manager]);
    await expect(session(manager,()=>mutate('public_documents','isolated-doc',1,{status:'PUBLISHED'}))).rejects.toThrow(/Verify/);
    const verified=await session(manager,()=>mutate('public_documents','isolated-doc',1,{status:'VERIFIED'},undefined,'Contrôle humain du fichier, source et pages'),true);
    expect(verified.verified_by).toBe(manager);
    await session(admin,()=>mutate('public_documents','isolated-doc',2,{status:'PUBLISHED'}),true);
    const published=(await session(null,()=>db.query<{is_official:boolean}>("select * from public.public_documents where id='isolated-doc'"))).rows[0];
    expect(published.is_official).toBe(false);
    await session(manager,()=>mutate('public_documents','isolated-doc-v2',null,{...patch,storage_path:'isolated/bp-v2.pdf',checksum_sha256:'c'.repeat(64),version:2,
      replaces_document_id:'isolated-doc',replacement_reason:'Nouvelle version contrôlée, ancien fichier conservé'}),true);
    await expect(session(manager,()=>mutate('public_documents','duplicate-doc',null,patch))).rejects.toThrow(/already exists|Duplicate/);
    await session(admin,()=>mutate('public_documents','isolated-doc-v2',1,{status:'ARCHIVED'}),true);
    expect((await db.query("select storage_path,version from public.public_documents where id='isolated-doc'")).rows[0]).toEqual({storage_path:'isolated/bp.pdf',version:1});
    expect((await db.query("select created_by from public.public_documents where id='isolated-doc-v2'")).rows[0]).toEqual({created_by:manager});
    await session(manager,()=>mutate('admin_tasks','review-complete',null,{type:'DOCUMENT_VERIFICATION',source_id:'isolated-doc',title:'Revue isolée',entity_name:'Historique',target_tab:'documents_manager',status:'COMPLETED'}),true);
  });

  it('contrôle séparément les montants déclarés et les lignes BP sans modifier leur enveloppe',async()=>{
    const project={title:'Projet isolé à contrôler',commune_name:'Test',region_name:'Test',category:'Eau',fiscal_year:2024,
      institution_id:'historical',budget_amount_fcfa:0,source_document_id:'isolated-doc',source_page:2};
    await session(manager,()=>mutate('budget_projects','review-project',null,project),true);
    await expect(session(manager,()=>mutate('budget_projects','review-project',1,{publication_status:'PUBLISHED'}))).rejects.toThrow(/Reviewed/);
    await session(manager,()=>mutate('budget_projects','review-project',1,{financial_verification_status:'VERIFIED',publication_status:'IN_REVIEW'},undefined,'Comparaison du montant exact sur la page 2 du BP'),true);
    await session(manager,()=>mutate('budget_projects','review-project',2,{publication_status:'PUBLISHED'}),true);
    expect((await session(null,()=>db.query("select budget_amount_fcfa::bigint,data_provenance from public.budget_projects where id='review-project'"))).rows[0]).toEqual({budget_amount_fcfa:0,data_provenance:'DECLARED_ADMIN'});
    await session(manager,()=>mutate('budget_lines','line',null,{budget_id:'isolated-bp',line_label:'Ligne inconnue',amount:null,source_document_id:'isolated-doc',source_page:2}),true);
    expect((await db.query("select amount from public.budget_lines where id='line'")).rows[0]).toEqual({amount:null});
    await expect(session(manager,()=>mutate('budget_lines','line',1,{verification_status:'VERIFIED'},undefined,'Comparaison de la ligne sur le BP'))).rejects.toThrow(/evidence/);
    await session(manager,()=>mutate('budget_lines','line',1,{amount:200}),true);
    await expect(session(manager,()=>mutate('budget_lines','line',2,{publication_status:'PUBLISHED'}))).rejects.toThrow(/Review/);
    await session(manager,()=>mutate('budget_lines','line',2,{verification_status:'VERIFIED',publication_status:'IN_REVIEW'},undefined,'Comparaison du montant 200 sur la page 2 du BP'),true);
    await session(manager,()=>mutate('budget_lines','line',3,{publication_status:'PUBLISHED'}),true);
    expect((await session(null,()=>db.query("select amount from public.budget_lines where id='line'"))).rows[0]).toEqual({amount:200});
    await expect(session(manager,()=>mutate('budget_lines','line',4,{amount:201}))).rejects.toThrow(/Published/);
    await expect(session(moderator,()=>mutate('budget_lines','line',4,{sector:'Autre'}))).rejects.toThrow();
    expect((await db.query("select total_amount from public.local_budgets where id='isolated-bp'")).rows[0]).toEqual({total_amount:300});
    await session(manager,()=>mutate('budget_lines','line',4,{publication_status:'ARCHIVED',archived_at:'2000-01-01'}),true);
    expect((await session(null,()=>db.query("select id from public.budget_lines where id='line'"))).rows).toHaveLength(0);
    const operation=crypto.randomUUID();
    await session(manager,()=>mutate('public_documents','isolated-doc',3,{status:'ARCHIVED'},operation),true);
    await session(manager,()=>mutate('public_documents','isolated-doc',3,{status:'ARCHIVED'},operation),true);
    expect((await db.query("select publication_status,financial_verification_status from public.budget_projects where id='review-project'")).rows[0]).toEqual({publication_status:'DRAFT',financial_verification_status:'TO_VERIFY'});
    expect((await db.query<{status:string}>("select status from public.admin_tasks where id='review-complete'")).rows[0].status).toBe('ON_HOLD');
    const history=(await db.query<{before_data:{status:string}}>("select before_data from public.admin_audit_events where entity_id='review-complete' and action='UPDATE'")).rows[0];
    expect(history.before_data.status).toBe('COMPLETED');
  });

  it('conserve le reçu initial après une modification concurrente et un archivage',async()=>{
    const operation=crypto.randomUUID();const patch={name:'Premier résultat',type:'MAIRIE'};
    const first=await session(admin,()=>mutate('institutions','receipt-concurrent',null,patch,operation),true);
    expect(first._operation).toMatchObject({replayed:false,changed:false,original:{id:'receipt-concurrent',revision:1}});
    await session(manager,()=>mutate('institutions','receipt-concurrent',1,{name:'Deuxième résultat'}),true);
    const retried=await session(admin,()=>mutate('institutions','receipt-concurrent',null,patch,operation),true);
    expect(retried._operation).toMatchObject({replayed:true,changed:true,current_revision:2,original:{id:'receipt-concurrent',revision:1}});
    await session(manager,()=>mutate('institutions','receipt-concurrent',2,{publication_status:'ARCHIVED'}),true);
    expect((await session(admin,()=>mutate('institutions','receipt-concurrent',null,patch,operation)))._operation).toMatchObject({changed:true,current_revision:3});
    expect((await db.query('select count(*)::int count from public.admin_operation_receipts where operation_id=$1',[operation])).rows[0]).toEqual({count:1});
    await expect(session(manager,()=>mutate('institutions','another-receipt',null,patch,operation))).rejects.toThrow(/duplicate/);
    await expect(session(admin,()=>mutate('institutions','receipt-concurrent',1,patch,operation))).rejects.toThrow(/already used/);
  });

  it('refuse une reprise après retrait du rôle et toute falsification des reçus',async()=>{
    const operation=crypto.randomUUID(),patch={name:'Opération avant retrait',type:'MAIRIE'};
    await session(manager,()=>mutate('institutions','receipt-role',null,patch,operation),true);
    await db.query("update public.profiles set role='CITIZEN' where id=$1",[manager]);
    try {
      await expect(session(manager,()=>mutate('institutions','receipt-role',null,patch,operation))).rejects.toThrow(/permission/);
      expect((await session(manager,()=>db.query('select * from public.admin_operation_receipts'))).rows).toEqual([]);
    } finally {await db.query("update public.profiles set role='DATA_MANAGER' where id=$1",[manager]);}
    for(const query of ['delete from public.admin_operation_receipts',"update public.admin_operation_receipts set entity_id='other'","insert into public.admin_operation_receipts(operation_id,actor_id,entity_type,entity_id,input_payload,result_data) values(gen_random_uuid(),'"+admin+"','institutions','fake','{}','{}')"]) await expect(session(admin,()=>db.exec(query))).rejects.toThrow(/permission/);
  });

  it('annule les reçus et journaux de tout un lot après un échec et protège les fonctions privilégiées',async()=>{
    const rows=[{table:'institutions',id:'receipt-batch',revision:null,patch:{name:'Lot isolé',type:'MAIRIE'},operationId:crypto.randomUUID(),reason:'Essai de rollback intégral'},
      {table:'news_articles',id:'receipt-batch-forbidden',revision:null,patch:{title:'Lot hors domaine'},operationId:crypto.randomUUID(),reason:'Essai de rollback intégral'}];
    await expect(session(manager,()=>db.query('select public.admin_mutate_batch($1::jsonb)',[JSON.stringify(rows)]))).rejects.toThrow();
    expect((await db.query('select * from public.admin_operation_receipts where operation_id=$1',[rows[0].operationId])).rows).toEqual([]);
    expect((await db.query("select * from public.admin_audit_events where entity_id='receipt-batch'")).rows).toEqual([]);
    for(const id of [admin,manager,moderator,citizen,null]) await expect(session(id,()=>db.query("select public.admin_confirm_document_integrity('fake',1,$1,'[]')",[admin]))).rejects.toThrow(/permission/);
    const functions=await db.query<{proname:string;rolname:string;proconfig:string[]}>('select p.proname,r.rolname,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where p.prosecdef and n.nspname in ($1,$2)',['private','public']);
    expect(functions.rows.every(row=>row.rolname==='postgres' && row.proconfig?.some(value=>value.startsWith('search_path=')))).toBe(true);
    await expect(session(admin,()=>db.exec('select private.admin_record_event()'))).rejects.toThrow(/permission/);
  });

  it('stocke les six métadonnées PR62 sans certifier des empreintes manuelles ni inventer de pages',async()=>{
    const base={title:'CA fascicules déclaré',category:'COMPTE_ADMINISTRATIF',institution_name:'Fictive',year:2024,file_url:'',file_name:'fascicules.pdf',source_name:'Collectivité fictive',status:'TO_VERIFY',verification_status:'TO_VERIFY',checksum_sha256:'e'.repeat(64),is_multipart:true,parts_count:2,
      document_parts:[{part_number:1,file_name:'part-1.pdf',page_range:'Pages 1 à 2',checksum_sha256:'1'.repeat(64)},{part_number:2,file_name:'part-2.pdf',page_range:'Pages 3 à 4',checksum_sha256:'2'.repeat(64)}],is_scanned:true,has_text_layer:false,ocr_status:'MANUAL_TRANSCRIPTION'};
    const row=await session(manager,()=>mutate('public_documents','pr62-declared',null,base),true);
    expect(row).toMatchObject({parts_count:2,is_scanned:true,has_text_layer:false,ocr_status:'MANUAL_TRANSCRIPTION',checksum_status:'DECLARED',page_count:null});
    await expect(session(manager,()=>mutate('public_documents','pr62-declared',1,{status:'VERIFIED'},undefined,'Vérification humaine sans originaux'))).rejects.toThrow(/Actual/);
    await expect(session(manager,()=>db.exec("update public.public_documents set status='PUBLISHED' where id='pr62-declared'"))).rejects.toThrow();
    for(const changed of [{...base,parts_count:3},{...base,has_text_layer:true},{...base,is_multipart:false},{...base,page_count:5},
      {...base,document_parts:[base.document_parts[1],base.document_parts[0]]},
      {...base,document_parts:[base.document_parts[0],{...base.document_parts[1],page_range:'Pages 2 à 4'}]},
      {...base,document_parts:[base.document_parts[0],{...base.document_parts[1],page_range:'Pages 4 à 5'}]},
      {...base,document_parts:[base.document_parts[0],{...base.document_parts[1],checksum_sha256:base.document_parts[0].checksum_sha256}]}]) await expect(session(manager,()=>mutate('public_documents','pr62-invalid',null,changed))).rejects.toThrow();
    await expect(session(manager,()=>mutate('public_documents','pr62-declared',1,{document_parts:[{...base.document_parts[0],checksum_sha256:'3'.repeat(64)},base.document_parts[1]]}))).rejects.toThrow(/new version/);
  });

  it('annule une nouvelle écriture si un autre élément rejoué du lot a changé',async()=>{
    const operation=crypto.randomUUID(),patch={name:'Résultat initial du lot',type:'MAIRIE'},reason='Création initiale avant conflit de lot';
    await session(admin,()=>mutate('institutions','batch-replay-changed',null,patch,operation,reason),true);
    await session(manager,()=>mutate('institutions','batch-replay-changed',1,{name:'Version concurrente'}),true);
    const rows=[{table:'institutions',id:'new-in-failed-retry',revision:null,patch:{name:'Écriture à annuler',type:'MAIRIE'},operationId:crypto.randomUUID(),reason:'Nouvelle écriture dans un lot mixte'},
      {table:'institutions',id:'batch-replay-changed',revision:null,patch,operationId:operation,reason}];
    await expect(session(admin,()=>db.query('select public.admin_mutate_batch($1::jsonb)',[JSON.stringify(rows)]))).rejects.toThrow(/Conflict/);
    expect((await db.query("select id from public.institutions where id='new-in-failed-retry'")).rows).toEqual([]);
    expect((await db.query('select * from public.admin_operation_receipts where operation_id=$1',[rows[0].operationId])).rows).toEqual([]);
    expect((await db.query("select * from public.admin_audit_events where entity_id='new-in-failed-retry'")).rows).toEqual([]);
  });

  it('refuse la vérification directe d’un fichier présent sans attestation des octets',async()=>{
    const patch={title:'Original non contrôlé',category:'BUDGET_OFFICIEL',institution_name:'Fictive',year:2024,file_url:'',file_name:'bp.pdf',storage_path:'isolated/bp.pdf',file_size_bytes:12,checksum_sha256:'f'.repeat(64),source_name:'Source fictive',status:'TO_VERIFY',verification_status:'TO_VERIFY'};
    await session(manager,()=>mutate('public_documents','unattested-file',null,patch),true);
    await expect(session(manager,()=>mutate('public_documents','unattested-file',1,{status:'VERIFIED'},undefined,'Contrôle humain avec hash simplement déclaré'))).rejects.toThrow(/Actual file/);
    await expect(session(manager,()=>db.exec("update public.public_documents set status='VERIFIED' where id='unattested-file'"))).rejects.toThrow(/Actual file/);
    await expect(session(manager,()=>mutate('public_documents','unattested-file',1,{checksum_status:'COMPUTED'}))).rejects.toThrow(/Unsupported/);
    expect((await db.query("select checksum_status from public.public_documents where id='unattested-file'")).rows[0]).toEqual({checksum_status:'DECLARED'});
  });

  it('restaure une sauvegarde PostgreSQL isolée avec données, règles et historique',async()=>{
    const snapshot=await db.dumpDataDir();
    const restored=new PGlite({loadDataDir:snapshot});
    try {
      expect((await restored.query("select total_budget_fcfa::integer from public.institutions where id='historical'")).rows).toEqual([{total_budget_fcfa:300}]);
      expect((await restored.query("select status from public.public_documents where id='cocody-reference'")).rows).toEqual([{status:'TO_VERIFY'}]);
      const count=(await db.query('select count(*)::integer count from public.admin_audit_events')).rows;
      expect((await restored.query('select count(*)::integer count from public.admin_audit_events')).rows).toEqual(count);
      await restored.exec('set role anon');
      expect((await restored.query("select id from public.budget_projects where id='review-project'")).rows).toEqual([]);
    }finally {await restored.close();}
  },60000);
});
