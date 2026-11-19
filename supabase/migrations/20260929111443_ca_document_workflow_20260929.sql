
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

update public.public_documents
set status='PUBLISHED',
    verification_status=case when is_official then 'VERIFIED' else 'TO_VERIFY' end,
    fiscal_year=coalesce(fiscal_year,year),
    document_type=coalesce(document_type,category)
where status='TO_VERIFY';

alter table public.public_documents drop constraint if exists public_documents_status_check;
alter table public.public_documents add constraint public_documents_status_check check (status in ('UPLOADED','TO_VERIFY','VERIFIED','PUBLISHED','ARCHIVED'));
alter table public.public_documents drop constraint if exists public_documents_verification_status_check;
alter table public.public_documents add constraint public_documents_verification_status_check check (verification_status in ('TO_VERIFY','VERIFIED','REJECTED','SOURCE_CONFLICT'));
alter table public.public_documents drop constraint if exists public_documents_version_check;
alter table public.public_documents add constraint public_documents_version_check check (version >= 1);

create index if not exists idx_public_documents_institution_year on public.public_documents(institution_id,fiscal_year);
create index if not exists idx_public_documents_status_type_year on public.public_documents(status,document_type,fiscal_year);
create unique index if not exists idx_public_documents_checksum_unique on public.public_documents(checksum_sha256) where checksum_sha256 is not null;
create index if not exists idx_public_documents_verified_by on public.public_documents(verified_by);
create index if not exists idx_ca_operations_linked_project on public.ca_investment_operations(linked_project_id);
create index if not exists idx_budget_lines_linked_project on public.budget_lines(linked_project_id);

drop policy if exists "Public documents are viewable by everyone." on public.public_documents;
drop policy if exists "Public documents are viewable by everyone" on public.public_documents;
drop policy if exists "Admins and moderators can manage public documents." on public.public_documents;
drop policy if exists "Admins and moderators can manage public documents" on public.public_documents;

create policy "Published documents are public" on public.public_documents
for select to public using (status='PUBLISHED');
create policy "Staff manage documents" on public.public_documents
for all to authenticated
using (public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']))
with check (public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
