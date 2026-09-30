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
  '20260929121225_publication_boundaries.sql',
  '20260929121408_document_metadata_versions.sql',
  '20260929141800_grant_schema_privileges.sql',
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
    create role anon; create role authenticated;
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
    create table public.projects(id text primary key);
    create table public.institutions(id text primary key);
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
  for (const sql of migrations()) await db.exec(sql);
}, 30000);

afterAll(async () => { await db?.close(); });

describe('Publication boundaries applied to PostgreSQL', () => {
  it('applies all migrations twice without drift errors', async () => {
    for (const sql of migrations()) await db.exec(sql);
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

