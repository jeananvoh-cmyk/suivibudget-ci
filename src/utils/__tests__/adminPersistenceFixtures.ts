import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
const productionSchema=JSON.parse(readFileSync(resolve('src/utils/__tests__/fixtures/adminProductionSchema.json'),'utf8')) as typeof import('./fixtures/adminProductionSchema.json');
const schemaSupplement=JSON.parse(readFileSync(resolve('src/utils/__tests__/fixtures/adminProductionSchemaSupplement.json'),'utf8')) as typeof import('./fixtures/adminProductionSchemaSupplement.json');

export async function createProductionSchemaFixture() {
  const db=new PGlite();
  const quote=(name:string)=>`"${name.replace(/"/g,'""')}"`;
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private; create schema storage;
    set check_function_bodies=off;
    create function public.uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;
    grant usage on schema public,private,auth,storage to anon,authenticated,service_role;`);
  for(const e of schemaSupplement.enums) await db.exec(`create type ${e.schema}.${quote(e.name)} as enum (${e.labels.map(label=>`'${label}'`).join(',')})`);
  for(const helper of schemaSupplement.helpers) await db.exec(helper);
  for(const table of productionSchema.tables) {
    await db.exec(`create table ${table.schema}.${quote(table.name)} (${table.columns.map(c=>{
      const generated=schemaSupplement.generated.find(g=>g.schema===table.schema && g.table===table.name && g.column===c.name);
      return `${quote(c.name)} ${c.type}${generated ? ` generated always as (${generated.expression}) stored` : c.default ? ` default ${c.default}` : ''}${c.not_null ? ' not null' : ''}`;
    }).join(',')})`);
    if(table.rls) await db.exec(`alter table ${table.schema}.${quote(table.name)} enable row level security`);
    if(table.force_rls) await db.exec(`alter table ${table.schema}.${quote(table.name)} force row level security`);
  }
  await db.exec('alter table auth.users add primary key(id)');
  const constraints=[...productionSchema.constraints.filter(c=>!c.table.includes('.')).map(c=>({...c,schema:'public'})),...schemaSupplement.storageConstraints.map(c=>({...c,schema:'storage'}))];
  for(const c of constraints.sort((a,b)=>Number(a.type==='f')-Number(b.type==='f'))) await db.exec(`alter table ${c.schema}.${quote(c.table)} add constraint ${quote(c.name)} ${c.definition}`);
  for(const f of productionSchema.functions) {
    await db.exec(f.definition);
    const signature=f.identity.startsWith('private.') ? f.identity : 'public.'+f.identity;
    await db.exec(`revoke all on function ${signature} from public`);
    for(const acl of f.acl || ['=X/postgres']) {
      const grantee=acl.split('=')[0] || 'public';
      if(['public','anon','authenticated','service_role'].includes(grantee)) await db.exec(`grant execute on function ${signature} to ${grantee}`);
    }
  }
  for(const view of productionSchema.views) await db.exec(`create view public.${quote(view.name)} with (${view.options.join(',')}) as ${view.definition}`);
  for(const trigger of productionSchema.triggers) await db.exec(trigger);
  for(const p of productionSchema.policies) await db.exec(`create policy ${quote(p.policyname)} on ${p.schemaname}.${quote(p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.join(',')} ${p.qual ? `using (${p.qual})` : ''} ${p.with_check ? `with check (${p.with_check})` : ''}`);
  const tables=new Set([...productionSchema.tables.map(t=>`${t.schema}.${t.name}`),...productionSchema.views.map(v=>`public.${v.name}`)]);
  for(const g of productionSchema.grants) if(tables.has(`${g.table_schema}.${g.table_name}`)) await db.exec(`grant ${g.privilege_type} on ${g.table_schema}.${quote(g.table_name)} to ${g.grantee}`);
  return db;
}

export async function createAdminPersistenceFixture() {
const admin = '00000000-0000-0000-0000-000000000001';
const manager = '00000000-0000-0000-0000-000000000002';
const moderator = '00000000-0000-0000-0000-000000000003';
const citizen = '00000000-0000-0000-0000-000000000004';
let db!: PGlite;
const migration = readFileSync(resolve('supabase/migrations/20261013165625_admin_dashboard_persistence_hardening.sql'),'utf8');

async function session<T>(id: string | null, run: () => Promise<T>, commit = false): Promise<T> {
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id || '']);
    await db.exec(`set local role ${id ? 'authenticated' : 'anon'}`);
    const value = await run();
    await db.exec(commit ? 'commit' : 'rollback');
    return value;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}

async function mutate(table: string, id: string, revision: number | null, patch: object, operation: string = crypto.randomUUID(), reason = 'Modification de test isolée') {
  const result = await db.query<{ row: Record<string, unknown> }>(
    'select public.admin_mutate($1,$2,$3,$4::jsonb,$5::uuid,$6) row',[table,id,revision,JSON.stringify(patch),operation,reason]);
  return result.rows[0].row;
}

async function initialize() {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema private; create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id text primary key,bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select on storage.objects to anon;
    grant select,insert on storage.objects to authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
    create table public.profiles(id uuid primary key, full_name text, role text, is_active boolean default true);
    insert into public.profiles(id,full_name,role) values ('${admin}','Admin isolé','ADMIN'),('${manager}','Gestionnaire isolé','DATA_MANAGER'),
      ('${moderator}','Modérateur isolé','MODERATOR'),('${citizen}','Citoyen isolé','CITIZEN');
    create function private.has_staff_role(roles text[]) returns boolean language sql stable security definer set search_path='' as
      $$ select exists(select 1 from public.profiles where id=auth.uid() and is_active and role=any(roles)) $$;
    grant usage on schema public,private,auth to anon,authenticated;
    grant execute on function auth.uid(),private.has_staff_role(text[]) to anon,authenticated;
    grant select on public.profiles to authenticated;
    create policy documents_storage_staff on storage.objects for select to authenticated using(bucket_id='public_documents' and private.has_staff_role(array['ADMIN','DATA_MANAGER','MODERATOR']));
    create policy documents_storage_upload on storage.objects for insert to authenticated with check(bucket_id='public_documents' and private.has_staff_role(array['ADMIN','DATA_MANAGER']));
    insert into storage.objects(id,bucket_id,name) values('fixture-original','public_documents','isolated/bp.pdf'),('fixture-replacement','public_documents','isolated/bp-v2.pdf'),
      ('fixture-audit-media','admin_media','${admin}/${'f'.repeat(64)}.png');
    create table public.caidp_directory(id text primary key,company_name text not null,category text not null,region text,commune text,
      ri_name text,ri_function text,email text,phone text,source text,created_at timestamptz default now(),updated_at timestamptz default now());
  `);
  const schema = readFileSync(resolve('supabase_schema.sql'),'utf8');
  const secondary = readFileSync(resolve('supabase/schema.sql'),'utf8');
  for (const table of ['institutions','budget_projects','public_documents','citizen_proofs','news_articles','site_settings']) {
    const sql = (['news_articles','site_settings'].includes(table) ? secondary : schema).match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`))?.[0];
    if (!sql) throw new Error(`Fixture missing ${table}`);
    await db.exec(sql);
  }
  await db.exec(`alter table public.public_documents alter column published_at drop not null;
    alter table public.public_documents add column status text default 'TO_VERIFY', add column verification_status text default 'TO_VERIFY',
    add column institution_id text, add column fiscal_year integer, add column document_type text,
    add column storage_bucket text default 'public_documents', add column source_name text, add column source_url text,
    add column storage_path text, add column checksum_sha256 text, add column version integer default 1,
    add column replaces_document_id text, add column replacement_reason text, add column verified_by uuid,
    add column verified_at timestamptz, add column created_by uuid,
    add column institution_type text, add column original_filename text, add column mime_type text, add column file_size_bytes bigint,
    add column page_count integer, add column adoption_date date, add column approval_date date, add column approval_reference text, add column updated_at timestamptz default now();
    alter table public.public_documents enable row level security;
    create policy documents_public on public.public_documents for select using(status='PUBLISHED');
    create policy documents_staff on public.public_documents for all to authenticated using(private.has_staff_role(array['ADMIN','DATA_MANAGER']));
    grant select on public.public_documents to anon,authenticated;
    grant insert,update on public.public_documents to authenticated;
    alter table public.citizen_proofs enable row level security;
    create policy proof_staff_read on public.citizen_proofs for select to authenticated using(private.has_staff_role(array['ADMIN','MODERATOR']) or citizen_user_id=auth.uid());
    create policy proof_staff_update on public.citizen_proofs for update to authenticated using(private.has_staff_role(array['ADMIN','MODERATOR'])) with check(private.has_staff_role(array['ADMIN','MODERATOR']));
    grant select,update on public.citizen_proofs to authenticated;
    insert into public.institutions(id,name,type,total_budget_fcfa,budget_functioning_fcfa,budget_investment_fcfa) values ('historical','Historique','MAIRIE',300,100,200);
    insert into public.public_documents(id,title,category,institution_name,file_url,file_name,institution_id,year,fiscal_year,document_type,storage_path,checksum_sha256)
      values ('cocody-reference','Cocody 2024','CA','Cocody','','ca.pdf','historical',2024,2024,'COMPTE_ADMINISTRATIF','ca-v1.pdf',repeat('a',64));
    insert into public.citizen_proofs(id,project_id,image_url,comment,verification_status,citizen_name,citizen_whatsapp,citizen_user_id) values('pending-proof','project','photo','Observation','PENDING','Identité privée isolée','+000000','${citizen}');
  `);
  const budgets = readFileSync(resolve('supabase/migrations/20260928_local_budgets_referential.sql'),'utf8');
  await db.exec('create table public.projects(id text primary key)');
  for (const table of ['local_budgets','budget_lines']) {
    const sql=budgets.match(new RegExp('CREATE TABLE IF NOT EXISTS public\\.'+table+' \\([\\s\\S]*?\\n\\);'))?.[0];
    if(!sql) throw new Error('Missing budget fixture '+table);
    await db.exec(sql);
  }
  await db.exec(`alter table public.local_budgets enable row level security;
    create policy budget_public on public.local_budgets for select using(status='PUBLISHED');
    create policy budget_staff on public.local_budgets for all to authenticated using(private.has_staff_role(array['ADMIN','DATA_MANAGER']));
    grant select on public.local_budgets to anon,authenticated;
    grant insert,update on public.local_budgets to authenticated;
    insert into public.local_budgets(id,institution_id,institution_type,institution_name,fiscal_year,budget_type,status,total_amount)
      values ('isolated-bp','historical','COMMUNE','Historique',2024,'PRIMITIF_ADOPTE','PUBLISHED',300);
  `);
  const publication = readFileSync(resolve('supabase/migrations/20260929121225_publication_boundaries.sql'),'utf8');
  const auditFunction = publication.match(/create or replace function public.enforce_document_publication_audit\(\)[\s\S]*?\$\$;/)?.[0];
  if (!auditFunction) throw new Error('Publication fixture missing');
  await db.exec(auditFunction);
  await db.exec('create trigger enforce_document_publication_audit_trigger before insert or update on public.public_documents for each row execute function public.enforce_document_publication_audit()');
  await db.exec(readFileSync(resolve('supabase/migrations/20260930030840_public_proof_projection_boundary.sql'),'utf8'));
  const hardening = readFileSync(resolve('supabase/migrations/20261026213000_security_definer_hardening.sql'),'utf8');
  await db.exec(migration);
  await db.exec(migration);
  await db.exec(hardening);
  await db.exec(hardening);
}
await initialize();
return {db,session,mutate,admin,manager,moderator,citizen};


}
