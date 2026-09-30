-- SuiviBudget CI — Métadonnées documentaires enrichies et versionnement
-- Idempotent, non destructif, contraintes d'intégrité et index uniques

begin;

alter table public.public_documents
  add column if not exists institution_type text,
  add column if not exists storage_bucket text not null default 'public_documents',
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists page_count integer,
  add column if not exists adoption_date date,
  add column if not exists approval_date date,
  add column if not exists approval_reference text,
  add column if not exists replaces_document_id text references public.public_documents(id),
  add column if not exists replacement_reason text,
  add column if not exists created_by uuid references public.profiles(id);

alter table public.public_documents alter column published_at drop not null;
alter table public.public_documents alter column published_at drop default;

alter table public.public_documents drop constraint if exists document_page_positive;
alter table public.public_documents add constraint document_page_positive check (page_count is null or page_count > 0);

alter table public.public_documents drop constraint if exists document_size_valid;
alter table public.public_documents add constraint document_size_valid check (file_size_bytes is null or file_size_bytes between 1 and 52428800);

alter table public.public_documents drop constraint if exists document_checksum_valid;
alter table public.public_documents add constraint document_checksum_valid check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$');

alter table public.public_documents drop constraint if exists document_replacement_reason;
alter table public.public_documents add constraint document_replacement_reason check (replaces_document_id is null or nullif(btrim(replacement_reason),'') is not null);

create unique index if not exists public_documents_institution_year_type_version
on public.public_documents(institution_id, fiscal_year, document_type, version)
where institution_id is not null and fiscal_year is not null and document_type is not null;

create index if not exists public_documents_replaces_idx on public.public_documents(replaces_document_id);
create index if not exists public_documents_created_by_idx on public.public_documents(created_by);

commit;
