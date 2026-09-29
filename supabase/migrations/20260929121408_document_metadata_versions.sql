begin;

alter table public.public_documents
  add column institution_type text,
  add column storage_bucket text not null default 'public_documents',
  add column original_filename text,
  add column mime_type text,
  add column file_size_bytes bigint,
  add column page_count integer,
  add column adoption_date date,
  add column approval_date date,
  add column approval_reference text,
  add column replaces_document_id text references public.public_documents(id),
  add column replacement_reason text,
  add column created_by uuid references public.profiles(id),
  add constraint document_version_positive check (version >= 1),
  add constraint document_page_positive check (page_count is null or page_count > 0),
  add constraint document_size_valid check (file_size_bytes is null or file_size_bytes between 1 and 52428800),
  add constraint document_checksum_valid check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  add constraint document_status_valid check (status in ('UPLOADED','TO_VERIFY','VERIFIED','PUBLISHED','ARCHIVED')),
  add constraint document_replacement_reason check (replaces_document_id is null or nullif(btrim(replacement_reason),'') is not null);

create unique index public_documents_institution_year_type_version
on public.public_documents(institution_id, fiscal_year, document_type, version)
where institution_id is not null and fiscal_year is not null and document_type is not null;

create index public_documents_replaces_idx on public.public_documents(replaces_document_id);
create index public_documents_created_by_idx on public.public_documents(created_by);

commit;
