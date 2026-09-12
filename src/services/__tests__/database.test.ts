/// <reference types="node" />
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const migration = readFileSync('supabase/migrations/20260911184041_civic_security_reliability.sql', 'utf8');
const ids = { admin: '00000000-0000-4000-8000-000000000001', moderator: '00000000-0000-4000-8000-000000000002', manager: '00000000-0000-4000-8000-000000000003', citizen: '00000000-0000-4000-8000-000000000004', other: '00000000-0000-4000-8000-000000000005' };
const proofId = '10000000-0000-4000-8000-000000000001';
const evidence = `${ids.citizen}/${proofId}.jpg`;
const payload = { project_id: 'project-test', project_title: 'École test', commune_name: 'Test', region_name: 'Test', comment: 'Constat de test suffisamment long', media_type: 'IMAGE', citizen_status_claim: 'IN_PROGRESS', citizen_name: 'Observateur' };
let db: PGlite;
async function actor(id?: string, metadata = {}) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify(id ? { sub: id, user_metadata: metadata, app_metadata: { role: 'ADMIN' } } : {})]);
  await db.exec(id ? 'SET ROLE authenticated' : 'SET ROLE anon');
}
async function save(id: string, expected = 0, title = 'École') {
  return db.query('SELECT public.civic_save_content($1::jsonb) AS result', [JSON.stringify([{ kind: 'projects', id, data: { title, budget_amount_fcfa: 100, fiscal_year: 2026, current_status: 'UNKNOWN' }, expected_revision: expected }])]);
}
const bootstrap = `
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_app_meta_data jsonb DEFAULT '{}', is_anonymous boolean DEFAULT false, banned_until timestamptz);
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
 GRANT USAGE ON SCHEMA auth,storage TO anon,authenticated,service_role;
 GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated,service_role;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;
 CREATE FUNCTION storage.extension(name text) RETURNS text LANGUAGE sql AS $$ SELECT reverse(split_part(reverse(name),'.',1)) $$;
 CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(bootstrap);
  // Run the historical schema, substituting only the platform extension (provided above).
  const legacy = readFileSync('supabase_schema.sql','utf8').replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g,'');
  await db.exec(legacy);
  await db.exec(migration);
  for (const [name,id] of Object.entries(ids)) {
    const role = ({ admin:'ADMIN', moderator:'MODERATOR', manager:'DATA_MANAGER' } as Record<string,string>)[name] || 'CITIZEN';
    await db.query('INSERT INTO auth.users(id,raw_app_meta_data,is_anonymous) VALUES($1,$2::jsonb,$3)',[id,JSON.stringify({role}),name==='citizen']);
  }
}, 30000);
afterAll(async () => { await db?.close(); });

describe('Real PostgreSQL permissions and transactions (PGlite)', () => {
  it('blocks a citizen promoting themselves through profiles or user metadata', async () => {
    await actor(ids.citizen, { role: 'ADMIN' });
    await expect(db.query('INSERT INTO public.profiles(id,role) VALUES($1,\'ADMIN\')',[ids.citizen])).rejects.toThrow();
    await expect(save('forged')).rejects.toThrow();
    expect((await db.query('SELECT public.civic_role() AS role')).rows).toEqual([{role:null}]);
  });
  it('permits authorized content changes and rejects stale revisions atomically', async () => {
    await actor(ids.admin); await save('valid');
    await save('valid',1,'École corrigée');
    await expect(save('valid',1,'Écrasement')).rejects.toThrow();
    const result = await db.query("SELECT data->>'title' AS title,revision FROM public.civic_content WHERE id='valid'");
    expect(result.rows).toEqual([{title:'École corrigée',revision:2}]);
    const changes = [{kind:'projects',id:'rolled-back',data:{title:'Test',budget_amount_fcfa:1,fiscal_year:2026,current_status:'UNKNOWN'},expected_revision:0}, {kind:'projects',id:'valid',data:{},expected_revision:1}];
    await expect(db.query('SELECT public.civic_save_content($1::jsonb)',[JSON.stringify(changes)])).rejects.toThrow();
    expect((await db.query("SELECT id FROM public.civic_content WHERE id='rolled-back'")).rows).toHaveLength(0);
  });
  it('makes published content readable but not writable anonymously', async () => {
    await actor();
    expect((await db.query("SELECT id FROM public.civic_content WHERE id='valid'")).rows).toHaveLength(1);
    await expect(save('anonymous')).rejects.toThrow();
    await expect(db.query('SELECT * FROM civic_private.audit_log')).rejects.toThrow();
  });
  it('stores private evidence, accepts a pending submission, and acknowledges a retry once', async () => {
    await actor(ids.citizen);
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('civic-evidence',$1)",[evidence]);
    const submit = () => db.query('SELECT public.civic_submit_proof($1,$2,$3::jsonb) AS id',[proofId,evidence,JSON.stringify(payload)]);
    await submit(); await submit();
    await expect(db.query('SELECT public.civic_submit_proof($1,$2,$3::jsonb)',[proofId,evidence,JSON.stringify({...payload, comment: 'Texte différent suffisamment long'})])).rejects.toThrow('Duplicate request');
    expect((await db.query('SELECT id FROM public.civic_submissions')).rows).toHaveLength(1);
    await actor(ids.other);
    expect((await db.query('SELECT id FROM public.civic_submissions')).rows).toHaveLength(0);
    expect((await db.query('SELECT name FROM storage.objects')).rows).toHaveLength(0);
    await actor();
    expect((await db.query('SELECT id FROM public.civic_submissions')).rows).toHaveLength(0);
    expect((await db.query('SELECT name FROM storage.objects')).rows).toHaveLength(0);
  });
  it('rejects self-approval and data-manager moderation', async () => {
    await actor(ids.citizen);
    await expect(db.query('SELECT public.civic_moderate_proof($1,\'APPROVED\',\'\')',[proofId])).rejects.toThrow();
    await actor(ids.manager);
    await expect(db.query('SELECT public.civic_moderate_proof($1,\'APPROVED\',\'\')',[proofId])).rejects.toThrow();
    await expect(db.query("SELECT public.civic_save_content('[{\"kind\":\"settings\",\"id\":\"global\",\"data\":{},\"expected_revision\":0}]')")).rejects.toThrow();
  });
  it('publishes approved evidence, deduplicates confirmations, and hides rejected evidence', async () => {
    await actor(ids.moderator);
    await db.query('SELECT public.civic_moderate_proof($1,\'APPROVED\',\'Note privée\')',[proofId]);
    await actor();
    expect((await db.query('SELECT name FROM storage.objects')).rows).toHaveLength(1);
    await expect(db.query('SELECT notes FROM public.civic_moderation_decisions')).rejects.toThrow();
    await actor(ids.other);
    await db.query('SELECT public.civic_confirm_proof($1)',[proofId]); await db.query('SELECT public.civic_confirm_proof($1)',[proofId]);
    expect((await db.query('SELECT * FROM public.civic_confirmations')).rows).toHaveLength(1);
    await actor(ids.moderator); await db.query('SELECT public.civic_moderate_proof($1,\'REJECTED\',\'Retrait\')',[proofId]);
    await actor();
    expect((await db.query('SELECT name FROM storage.objects')).rows).toHaveLength(0);
  });
  it('keeps newsletter addresses private', async () => {
    await actor(ids.citizen);
    await db.query("SELECT public.civic_subscribe('citizen@example.test','Citoyen','Test')");
    await actor(ids.other);
    expect((await db.query('SELECT email FROM public.civic_subscribers')).rows).toHaveLength(0);
    await actor(); await expect(db.query('SELECT email FROM public.civic_subscribers')).rejects.toThrow();
  });
  it('rejects stale admin JWT privileges after server-side revocation', async () => {
    await actor(ids.admin); await save('before-revocation');
    await db.exec('RESET ROLE');
    await db.query("UPDATE auth.users SET raw_app_meta_data='{\"role\":\"CITIZEN\"}' WHERE id=$1",[ids.admin]);
    await actor(ids.admin); // JWT still claims ADMIN, database role has changed.
    await expect(save('after-revocation')).rejects.toThrow();
  });
});


describe('Migration safety', () => {
  it('refuses to hide existing legacy data and rolls back all changes', async () => {
    const existingDb = new PGlite();
    try {
      await existingDb.exec(bootstrap);
      await existingDb.exec("CREATE TABLE public.news_articles(id text); INSERT INTO public.news_articles VALUES('existing');");
      await expect(existingDb.exec(migration)).rejects.toThrow('Legacy data in public.news_articles');
      await existingDb.exec('ROLLBACK');
      expect((await existingDb.query('SELECT id FROM public.news_articles')).rows).toEqual([{id:'existing'}]);
      expect((await existingDb.query("SELECT to_regclass('public.civic_content') AS table_name")).rows).toEqual([{table_name:null}]);
    } finally { await existingDb.close(); }
  }, 30000);
});
