import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const admin = '00000000-0000-0000-0000-000000000001';
const citizen = '00000000-0000-0000-0000-000000000002';
const moderator = '00000000-0000-0000-0000-000000000003';
const manager = '00000000-0000-0000-0000-000000000004';
let db: PGlite;
const migrationNames = [
  '20260929121408_document_metadata_versions.sql',
  '20260929121225_publication_boundaries.sql',
  '20260929141800_grant_schema_privileges.sql',
  '20260930030840_public_proof_projection_boundary.sql',
  '20260930033244_foundation_http_access.sql',
  '20260930153716_least_privilege_passport_boundary.sql',
  '20260930223840_apec_participation_cycle.sql',
  '20261001043805_apec_moderated_publication.sql',
];
const migrations = () => migrationNames.map(name => readFileSync(resolve('supabase/migrations', name), 'utf8'));

async function asRole(role: 'anon' | 'authenticated', uid: string | null, run: () => Promise<void>) {
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid || '']);
    await db.exec(`set local role ${role}`);
    await run();
  } finally {
    await db.exec('rollback');
  }
}

const insertDocument = (id = 'doc-test') => db.query(`insert into public.public_documents
  (id,title,category,institution_name,file_url,file_name,status,verification_status,storage_path,checksum_sha256,version)
  values ($1,'Document test','CA','Commune test','private-path','test.pdf','TO_VERIFY','TO_VERIFY','test.pdf',$2,1)`, [id, 'a'.repeat(64)]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private; create schema storage;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
    create table public.profiles(id uuid primary key, role text, is_active boolean default true);
    insert into public.profiles values ('${admin}','ADMIN',true),('${citizen}','CITIZEN',true),
      ('${moderator}','MODERATOR',true),('${manager}','DATA_MANAGER',true);
    create function private.has_staff_role(roles text[]) returns boolean language sql stable security definer
      set search_path = '' as $$ select exists(select 1 from public.profiles where id=auth.uid() and is_active and role=any(roles)) $$;
    grant usage on schema auth, private, storage to anon, authenticated;
    grant execute on function auth.uid(), private.has_staff_role(text[]) to anon, authenticated;
    create table public.administrative_accounts(id text primary key,status text);
    create table public.ca_financial_lines(id text primary key,ca_id text references public.administrative_accounts);
    create table public.ca_investment_operations(id text primary key,ca_id text references public.administrative_accounts);
    create table public.ca_procurement_matches(id text primary key,operation_id text references public.ca_investment_operations);
    create table storage.objects(id text primary key,bucket_id text,name text);
    create table storage.buckets(id text primary key, file_size_limit bigint, allowed_mime_types text[]);
    insert into storage.buckets(id) values ('citizen_photos');
    create function storage.extension(name text) returns text language sql immutable as $$ select reverse(split_part(reverse(name), '.', 1)) $$;
    create policy "Strict citizen media upload only" on storage.objects for insert with check(false);
    create table public.projects(id text primary key);
    create table public.institutions(id text primary key);
    create table public.budget_projects(id text primary key, institution_id text, fiscal_year integer, title text);
    create table public.news_articles(id text primary key);
    create table public.site_settings(id text primary key); create table public.caidp_directory(id text primary key); create table public.sources(id text primary key); create table public.local_budgets(id text primary key); create table public.newsletter_subscribers(id text primary key);
  `);
  const schema = readFileSync(resolve('supabase_schema.sql'), 'utf8');
  for (const name of ['citizen_proofs', 'public_documents', 'caidp_document_requests_log']) {
    const sql = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${name} \\([\\s\\S]*?\\n\\);`))?.[0];
    if (!sql) throw new Error(`Missing fixture table: ${name}`);
    await db.exec(sql);
  }
  await db.exec(`
    alter table public.public_documents add column status text default 'TO_VERIFY',
      add column verification_status text default 'TO_VERIFY', add column verified_by uuid,
      add column verified_at timestamptz, add column updated_at timestamptz default now(),
      add column storage_path text, add column checksum_sha256 text, add column version integer default 1,
      add column institution_id text, add column fiscal_year integer, add column document_type text,
      add column source_url text, add column source_name text;
    create policy "Published documents are public" on public.public_documents for select using(status='PUBLISHED');
    create policy "Approved citizen proofs are viewable by everyone." on public.citizen_proofs for select
      using(verification_status='APPROVED' or citizen_user_id=auth.uid());
    create policy "Staff update citizen proofs" on public.citizen_proofs for update to authenticated
      using(private.has_staff_role(array['ADMIN','MODERATOR'])) with check(private.has_staff_role(array['ADMIN','MODERATOR']));
    create policy "Admin delete citizen proofs" on public.citizen_proofs for delete to authenticated
      using(private.has_staff_role(array['ADMIN']));
    create policy "CAIDP submissions" on public.caidp_document_requests_log for insert with check(true);
    create policy "CAIDP staff" on public.caidp_document_requests_log for select to authenticated
      using(private.has_staff_role(array['ADMIN','DATA_MANAGER']));
    create policy "Staff read storage" on storage.objects for select to authenticated
      using(private.has_staff_role(array['ADMIN','DATA_MANAGER','MODERATOR']));
    grant select, insert, update, delete on storage.objects to authenticated;
    insert into public.administrative_accounts values ('published','PUBLISHED'),('verified','VERIFIED'),('draft','TO_VERIFY');
    insert into public.ca_financial_lines select id,id from public.administrative_accounts;
    insert into public.ca_investment_operations select id,id from public.administrative_accounts;
    insert into public.ca_procurement_matches select id,id from public.administrative_accounts;
    insert into public.citizen_proofs(id,project_id,image_url,comment,verification_status,citizen_user_id,citizen_whatsapp,tracking_code,moderator_notes)
      values ('approved','project','image','Public observation','APPROVED','${citizen}','private-phone','private-tracking','private-note'),
      ('pending','project','image','Private observation','PENDING','${citizen}',null,null,null);
  `);
  for (const table of ['profiles','administrative_accounts','ca_financial_lines','ca_investment_operations','ca_procurement_matches','public_documents','citizen_proofs','caidp_document_requests_log']) {
    await db.exec(`alter table public.${table} enable row level security`);
  }
  await db.exec('alter table storage.objects enable row level security');
  await db.exec(`
    alter table public.local_budgets add column status text, add column institution_id text, add column fiscal_year integer;
    alter table public.local_budgets enable row level security;
    insert into public.local_budgets(id,status) values ('published','PUBLISHED'),('verified','VERIFIED');
    create policy "Allow public read on published local budgets" on public.local_budgets for select using(status in ('PUBLISHED','VERIFIED'));
    create policy "Staff local budgets" on public.local_budgets for all to authenticated using(private.has_staff_role(array['ADMIN','DATA_MANAGER']));
    grant truncate, references, trigger on all tables in schema public to service_role;
  `);
  for (const sql of migrations()) await db.exec(sql);
  await db.exec(`
    insert into public.institutions values ('apec-institution'),('other-institution');
    insert into public.budget_projects values ('apec-project','apec-institution',2026,'Projet test'),('other-project','other-institution',2026,'Autre test'),('other-year','apec-institution',2025,'Autre exercice');
    update public.local_budgets set institution_id='apec-institution', fiscal_year=2026;
    insert into public.apec_cycles(id,institution_id,fiscal_year,title,source_reference,source_date)
      values ('10000000-0000-0000-0000-000000000001','apec-institution',2026,'Cycle test local','Source test locale','2026-09-30');
  `);
}, 30000);

afterAll(async () => { await db?.close(); });

describe('APEC participation boundaries', () => {
  const cycle = '10000000-0000-0000-0000-000000000001';
  const submit = async (description='Description du besoin test') => (await db.query<{ id: string }>(`insert into public.apec_needs(cycle_id,title,description,source_reference,source_date)
    values ($1,'Besoin test local',$2,'Déclaration citoyenne test','2026-09-30') returning id`, [cycle,description])).rows[0].id;
  const decide = (id: string, action: string, project: string | null = null) => db.query(`select public.record_apec_decision($1,$2,'Motif test local','Source décision test','2026-09-30',1,$3,null,null)`, [id, action, project]);
  const publish = (id: string, confirmed = true) => db.query("select public.publish_apec_need($1,'Besoin public relu','Résumé public sans identité','Compte rendu public expurgé','2026-09-30',$2)",[id,confirmed]);

  it('does not publish verified needs automatically and rejects citizen publication', async () => {
    await asRole('authenticated',citizen,async()=>{
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[manager]);
      await decide(id,'VERIFY');
      expect((await db.query('select * from public.apec_public_needs')).rows).toHaveLength(0);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[citizen]);
      await expect(publish(id)).rejects.toThrow();
    });
  });

  it('requires human verification and explicit privacy review before publication', async () => {
    await asRole('authenticated',citizen,async()=>{
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
      await expect(publish(id)).rejects.toThrow();
    });
    await asRole('authenticated',citizen,async()=>{
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
      await decide(id,'VERIFY');
      await expect(publish(id,false)).rejects.toThrow();
    });
  });

  it('exposes only curated fields to anonymous readers and withdraws immediately', async()=>{
    await asRole('authenticated',citizen,async()=>{
      const id=await submit('Identité privée test : personne@example.invalid, téléphone personnel 0123456789');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[manager]);
      await decide(id,'VERIFY'); await publish(id);
      await db.exec('set local role anon');
      const row=(await db.query<Record<string,unknown>>('select * from public.apec_public_needs')).rows[0];
      expect(Object.keys(row).sort()).toEqual(['need_id','institution_id','fiscal_year','title','summary','source_reference','source_date','provenance','status','reviewed_at'].sort());
      expect(row.summary).toBe('Résumé public sans identité');
      expect(row.source_reference).not.toBe('Déclaration citoyenne test');
      expect(row.provenance).toBe('CITIZEN_OBSERVATION');
      expect(JSON.stringify(row)).not.toContain('personne@example.invalid');
      expect(JSON.stringify(row)).not.toContain('0123456789');
      expect(JSON.stringify(row)).not.toContain(citizen);
      await db.exec('set local role authenticated');
      await db.query("select public.withdraw_apec_need($1,'Retrait de test motivé')",[id]);
      await db.exec('set local role anon');
      expect((await db.query('select * from public.apec_public_needs')).rows).toHaveLength(0);
      await db.exec('set local role authenticated');
      const history=(await db.query<{decision_data:{publication:string}}>("select decision_data from public.apec_events where need_id=$1 and kind='FOLLOW_UP' order by sequence",[id])).rows;
      expect(history.map(e=>e.decision_data.publication)).toEqual(['PUBLISHED','WITHDRAWN']);
    });
  });

  it('denies direct publication writes even to staff', async()=>{
    await asRole('authenticated',admin,async()=>{await expect(db.query("delete from public.apec_public_needs")).rejects.toThrow();});
    await asRole('anon',null,async()=>{await expect(db.query("select public.withdraw_apec_need('00000000-0000-0000-0000-000000000000','Retrait')")).rejects.toThrow();});
  });

  it('rejects links to a project or published budget from another fiscal year',async()=>{
    for(const target of ['project','budget']) await asRole('authenticated',citizen,async()=>{
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[manager]);
      await decide(id,'VERIFY');await decide(id,'PRIORITIZE');
      if(target==='project') await expect(decide(id,'LINK','other-year')).rejects.toThrow();
      else {
        await db.exec('reset role');
        await db.query("update public.local_budgets set fiscal_year=2025 where id='published'");
        await db.exec('set local role authenticated');
        await expect(db.query("select public.record_apec_decision($1,'LINK','Motif test','Source test','2026-09-30',null,null,'published')",[id])).rejects.toThrow();
      }
    });
  });

  it('records identity, provenance, pending verification and an initial event on submission', async () => {
    await asRole('authenticated', citizen, async () => {
      const id = await submit();
      expect((await db.query('select user_id,verification_status,status,provenance from public.apec_needs where id=$1',[id])).rows[0]).toEqual({user_id:citizen,verification_status:'TO_VERIFY',status:'SUBMITTED',provenance:'CITIZEN_OBSERVATION'});
      expect((await db.query('select kind from public.apec_events where need_id=$1',[id])).rows).toEqual([{kind:'SUBMITTED'}]);
    });
  });

  it('prevents spoofed owners and citizen self-verification', async () => {
    await asRole('authenticated', citizen, async () => {
      await expect(db.query(`insert into public.apec_needs(cycle_id,user_id,title,description,source_reference,source_date)
        values ($1,$2,'Titre test','Description test','Source test','2026-09-30')`,[cycle,admin])).rejects.toThrow();
    });
    await asRole('authenticated', citizen, async () => {
      const id = await submit();
      await expect(decide(id,'VERIFY')).rejects.toThrow();
    });
  });

  it('keeps other citizens’ needs private and denies anonymous writes', async () => {
    await asRole('authenticated', citizen, async () => {
      await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[moderator]);
      expect((await db.query('select id from public.apec_needs')).rows).toHaveLength(0);
    });
    await asRole('anon',null,async () => { await expect(submit()).rejects.toThrow(); });
  });

  it('requires verification before prioritisation and rejects cross-institution links atomically', async () => {
    await asRole('authenticated',citizen,async () => {
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
      await expect(decide(id,'PRIORITIZE')).rejects.toThrow();
    });
    await asRole('authenticated',citizen,async () => {
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[manager]);
      await decide(id,'VERIFY'); await decide(id,'PRIORITIZE');
      await expect(decide(id,'LINK','other-project')).rejects.toThrow();
    });
  });

  it('preserves a sourced need → priority → project → contribution → response history', async () => {
    await asRole('authenticated',citizen,async () => {
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[manager]);
      await decide(id,'VERIFY'); await decide(id,'PRIORITIZE'); await decide(id,'LINK','apec-project');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[citizen]);
      const contribution=(await db.query<{id:string}>(`insert into public.apec_contributions(need_id,body,source_reference,source_date) values ($1,'Contribution test','Observation test','2026-09-30') returning id`,[id])).rows[0];
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[manager]);
      await db.query(`select public.record_apec_decision($1,'VERIFY_CONTRIBUTION','Motif test','Source test','2026-09-30',null,null,null,$2)`,[id,contribution.id]);
      await decide(id,'RESPONSE');
      expect((await db.query('select status,project_id,provenance from public.apec_needs where id=$1',[id])).rows[0]).toEqual({status:'ANSWERED',project_id:'apec-project',provenance:'CITIZEN_OBSERVATION'});
      expect((await db.query('select verification_status,provenance from public.apec_contributions where id=$1',[contribution.id])).rows[0]).toEqual({verification_status:'VERIFIED',provenance:'CITIZEN_OBSERVATION'});
      const events=(await db.query<{kind:string,source_reference:string}>('select kind,source_reference from public.apec_events where need_id=$1 order by sequence',[id])).rows;
      expect(events.map(e=>e.kind)).toEqual(['SUBMITTED','VERIFY','PRIORITIZE','LINK','CONTRIBUTION','VERIFY_CONTRIBUTION','RESPONSE']);
      expect(events.every(e=>e.source_reference.length>0)).toBe(true);
    });
  });

  it('denies direct history mutation even to staff and blocks submissions after closure', async () => {
    await asRole('authenticated',admin,async () => { await expect(db.query('delete from public.apec_events')).rejects.toThrow(); });
    await asRole('authenticated',admin,async () => {
      await db.query("update public.apec_cycles set status='CLOSED' where id=$1",[cycle]);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[citizen]);
      await expect(submit()).rejects.toThrow();
    });
  });

  it('exposes only scoped link identifiers to staff, never private project data to citizens', async () => {
    await asRole('authenticated',manager,async () => {
      const result=await db.query<{targets:unknown}>("select public.apec_link_targets('apec-institution',2026) as targets");
      expect(result.rows[0].targets).toEqual({projects:[{id:'apec-project',title:'Projet test'}],budgets:[{id:'published'}]});
    });
    await asRole('authenticated',citizen,async () => { await expect(db.query("select public.apec_link_targets('apec-institution',2026)")).rejects.toThrow(); });
    await asRole('anon',null,async () => { await expect(db.query("select public.apec_link_targets('apec-institution',2026)")).rejects.toThrow(); });
  });

  it('rolls back a decision without a source and preserves original citizen input', async () => {
    await asRole('authenticated',citizen,async () => {
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
      await db.exec('savepoint invalid_source');
      await expect(db.query("select public.record_apec_decision($1,'VERIFY','Motif test','','2026-09-30')",[id])).rejects.toThrow();
      await db.exec('rollback to savepoint invalid_source');
      expect((await db.query('select verification_status from public.apec_needs where id=$1',[id])).rows[0]).toEqual({verification_status:'TO_VERIFY'});
      await expect(db.query("update public.apec_needs set description='Texte remplacé' where id=$1",[id])).rejects.toThrow();
    });
  });

  it('rejects unpublished budgets and never grants service_role access to APEC data', async () => {
    await asRole('authenticated',citizen,async () => {
      const id=await submit();
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
      await decide(id,'VERIFY'); await decide(id,'PRIORITIZE');
      await expect(db.query("select public.record_apec_decision($1,'LINK','Motif test','Source test','2026-09-30',null,null,'verified')",[id])).rejects.toThrow();
    });
    for(const table of ['apec_cycles','apec_needs','apec_contributions','apec_events']) {
      expect((await db.query<{allowed:boolean}>("select has_table_privilege('service_role',$1,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed",[`public.${table}`])).rows[0].allowed).toBe(false);
    }
  });
});

describe('Publication boundaries applied to PostgreSQL', () => {
  it('removes technical service grants without removing Edge reads', async () => {
    const tables = ['public_documents','citizen_proofs','administrative_accounts','ca_investment_operations','ca_procurement_matches','ca_financial_lines','profiles','local_budgets','institutions','public_citizen_proofs'];
    for (const table of tables) {
      for (const privilege of ['TRUNCATE','REFERENCES','TRIGGER']) {
        expect((await db.query<{ allowed: boolean }>('select has_table_privilege($1,$2,$3) allowed', ['service_role', `public.${table}`, privilege])).rows[0].allowed).toBe(false);
      }
    }
    await db.exec('begin; set local role service_role');
    try {
      expect((await db.query('select id from public.citizen_proofs')).rows).toHaveLength(2);
      await db.query('select id from public.public_documents');
    } finally { await db.exec('rollback'); }
  });

  it('restricts verified local budgets to ADMIN and DATA_MANAGER', async () => {
    for (const [uid, count] of [[citizen,1],[moderator,1],[manager,2],[admin,2]] as const) {
      await asRole('authenticated', uid, async () => {
        expect((await db.query('select id from public.local_budgets')).rows).toHaveLength(count);
      });
    }
  });
  it('allows the Edge service to read sources without granting document mutations', async () => {
    expect((await db.query("select has_table_privilege('service_role','public.public_documents','SELECT') as docs, has_table_privilege('service_role','public.citizen_proofs','SELECT') as proofs, has_table_privilege('service_role','public.public_documents','UPDATE') as mutation")).rows).toEqual([{ docs: true, proofs: true, mutation: false }]);
    expect((await db.query("select file_size_limit from storage.buckets where id='citizen_photos'")).rows).toEqual([{ file_size_limit: 26214400 }]);
  });

  it('reapplies historical publication boundary repairs without drift errors', async () => {
    for (const sql of migrations().slice(0,6)) await db.exec(sql);
  });

  it('only exposes a published CA and its financial, operation and procurement children', async () => {
    await asRole('anon', null, async () => {
      for (const table of ['administrative_accounts','ca_financial_lines','ca_investment_operations','ca_procurement_matches']) {
        expect((await db.query(`select id from public.${table}`)).rows).toEqual([{ id: 'published' }]);
      }
    });
  });

  it('records verified actor then permits publication in separate operations', async () => {
    await asRole('authenticated', admin, async () => {
      await insertDocument();
      expect((await db.query('select published_at from public.public_documents')).rows).toEqual([{ published_at: null }]);
      await db.exec("update public.public_documents set status='VERIFIED'");
      expect((await db.query('select verified_by, verification_status from public.public_documents')).rows)
        .toEqual([{ verified_by: admin, verification_status: 'VERIFIED' }]);
      await db.exec("update public.public_documents set status='PUBLISHED'");
      expect((await db.query('select published_at is not null as published from public.public_documents')).rows)
        .toEqual([{ published: true }]);
    });
  });

  it('rejects publication without prior verification', async () => {
    await asRole('authenticated', admin, async () => {
      await insertDocument();
      await expect(db.exec("update public.public_documents set status='PUBLISHED',verification_status='VERIFIED',verified_by=auth.uid(),verified_at=now()"))
        .rejects.toThrow(/verif/i);
    });
  });

  it('rejects source overwrites and moderator document insertion', async () => {
    await asRole('authenticated', admin, async () => {
      await insertDocument();
      await expect(db.exec("update public.public_documents set storage_path='replacement.pdf'"))
        .rejects.toThrow(/version|source/i);
    });
    await asRole('authenticated', moderator, async () => {
      await expect(insertDocument()).rejects.toThrow(/authorization|policy|permission/i);
    });
  });

  it('exposes approved proof content without private contact, identity or moderation fields', async () => {
    await asRole('anon', null, async () => {
      const rows = (await db.query<Record<string, unknown>>('select * from public.public_citizen_proofs')).rows;
      expect(rows.map(row => row.id)).toEqual(['approved']);
      for (const field of ['citizen_user_id','citizen_whatsapp','tracking_code','moderator_notes','moderated_by']) {
        expect(rows[0]).not.toHaveProperty(field);
      }
    });
  });

  it('prevents anonymous access to underlying private proofs', async () => {
    await asRole('anon', null, async () => {
      await expect(db.exec('select * from public.citizen_proofs')).rejects.toThrow(/permission/i);
    });
  });

  it('lets owners and moderators read pending proofs but not other citizens', async () => {
    for (const [uid, expected] of [[citizen,2],[moderator,2],['00000000-0000-0000-0000-000000000099',0]] as const) {
      await asRole('authenticated', uid, async () => {
        expect((await db.query('select id from public.citizen_proofs')).rows).toHaveLength(expected);
      });
    }
  });

  it('rejects spoofed proof ownership and pre-approved submissions', async () => {
    for (const [uid,status] of [[admin,'PENDING'],[citizen,'APPROVED']]) {
      await asRole('authenticated', citizen, async () => {
        await expect(db.query(`insert into public.citizen_proofs(id,project_id,image_url,comment,citizen_user_id,verification_status,confirmations_count)
          values ('spoof','project','image','Test',$1,$2,0)`, [uid,status])).rejects.toThrow(/policy/i);
      });
    }
  });

  it('allows CAIDP analytics insertion but no anonymous or citizen reading', async () => {
    await asRole('anon', null, async () => {
      await db.exec("insert into public.caidp_document_requests_log(id,action_type,entity_type,entity_name) values('log','DOWNLOAD','COMMUNE','Test')");
      await expect(db.exec('select * from public.caidp_document_requests_log')).rejects.toThrow(/permission/i);
    });
    await asRole('authenticated', citizen, async () => {
      expect((await db.query('select * from public.caidp_document_requests_log')).rows).toEqual([]);
    });
  });
});

