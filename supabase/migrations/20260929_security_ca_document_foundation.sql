-- SuiviBudget CI — sécurité production + socle CA/documentaire
-- État appliqué sur le projet cdesuvcozcetdtvibgqs le 29/09/2026.
-- Cette migration est additive/idempotente et ne crée aucun CA 2025 fictif.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.has_staff_role(allowed_roles text[])
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true and p.role::text=any(allowed_roles)) $$;
revoke all on function private.has_staff_role(text[]) from public, anon;
grant execute on function private.has_staff_role(text[]) to authenticated;

alter table public.public_documents
 add column if not exists institution_id text references public.institutions(id) on delete set null,
 add column if not exists fiscal_year integer,
 add column if not exists document_type text,
 add column if not exists storage_path text,
 add column if not exists source_name text,
 add column if not exists source_url text,
 add column if not exists status text not null default 'TO_VERIFY',
 add column if not exists verification_status text not null default 'TO_VERIFY',
 add column if not exists verified_by uuid references public.profiles(id) on delete set null,
 add column if not exists verified_at timestamptz,
 add column if not exists checksum_sha256 text,
 add column if not exists version integer not null default 1,
 add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_public_documents_institution_year on public.public_documents(institution_id,fiscal_year);
create index if not exists idx_public_documents_status_type_year on public.public_documents(status,document_type,fiscal_year);
create unique index if not exists idx_public_documents_checksum_unique on public.public_documents(checksum_sha256) where checksum_sha256 is not null;

alter table public.administrative_accounts
 add column if not exists source_document_id text references public.public_documents(id) on delete set null,
 add column if not exists operating_revenue_planned bigint,
 add column if not exists operating_revenue_emitted bigint,
 add column if not exists operating_revenue_collected bigint,
 add column if not exists operating_expenditure_planned bigint,
 add column if not exists operating_expenditure_engaged bigint,
 add column if not exists investment_revenue_planned bigint,
 add column if not exists investment_revenue_emitted bigint,
 add column if not exists investment_revenue_collected bigint,
 add column if not exists investment_expenditure_planned bigint,
 add column if not exists investment_expenditure_engaged bigint,
 add column if not exists total_revenue_collected bigint,
 add column if not exists total_expenditure_engaged bigint,
 add column if not exists arithmetic_difference bigint,
 add column if not exists reconciliation_status text not null default 'TO_VERIFY',
 add column if not exists reconciled_at timestamptz,
 add column if not exists reconciled_by uuid references public.profiles(id) on delete set null;

create unique index if not exists uq_administrative_accounts_institution_year on public.administrative_accounts(institution_id,fiscal_year);

create table if not exists public.ca_financial_lines(
 id text primary key default ('ca-line-'||extensions.uuid_generate_v4()::text),
 ca_id text not null references public.administrative_accounts(id) on delete cascade,
 institution_id text not null references public.institutions(id) on delete cascade,
 fiscal_year integer not null,
 section text not null,
 flow_type text not null,
 exact_heading text not null,
 account_code text,
 measure_type text not null,
 amount_fcfa bigint not null,
 source_document_id text references public.public_documents(id) on delete set null,
 source_page integer,
 source_reference text,
 verification_status text not null default 'TO_VERIFY',
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.ca_financial_lines enable row level security;

drop policy if exists "Published CA financial lines are public" on public.ca_financial_lines;
create policy "Published CA financial lines are public" on public.ca_financial_lines for select to public
using(exists(select 1 from public.administrative_accounts a where a.id=ca_id and a.status in ('VERIFIED','PUBLISHED')));
drop policy if exists "Staff manage CA financial lines" on public.ca_financial_lines;
create policy "Staff manage CA financial lines" on public.ca_financial_lines for all to authenticated
using(private.has_staff_role(array['ADMIN','DATA_MANAGER']))
with check(private.has_staff_role(array['ADMIN','DATA_MANAGER']));

update storage.buckets set public=false where id in ('public_documents','citizen_photos');
drop policy if exists "Public documents are publicly accessible" on storage.objects;
drop policy if exists "Citizen photos are publicly accessible" on storage.objects;

create or replace function public.enforce_document_publication_audit()
returns trigger language plpgsql set search_path=''
as $$
begin
 if new.status='PUBLISHED' and old.status is distinct from 'PUBLISHED' then
  if auth.uid() is null then raise exception 'Authenticated staff required to publish a document'; end if;
  new.verification_status:='VERIFIED';
  new.verified_by:=auth.uid();
  new.verified_at:=coalesce(new.verified_at,now());
 end if;
 new.updated_at:=now();
 return new;
end
$$;
drop trigger if exists enforce_document_publication_audit_trigger on public.public_documents;
create trigger enforce_document_publication_audit_trigger before update on public.public_documents
for each row execute function public.enforce_document_publication_audit();
