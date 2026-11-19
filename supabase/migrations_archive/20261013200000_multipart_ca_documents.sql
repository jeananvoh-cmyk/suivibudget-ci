begin;
alter table public.public_documents
  add column if not exists checksum_sha256 text,
  add column if not exists is_multipart boolean,
  add column if not exists parts_count integer,
  add column if not exists document_parts jsonb default '[]'::jsonb,
  add column if not exists is_scanned boolean,
  add column if not exists has_text_layer boolean,
  add column if not exists ocr_status text,
  add column if not exists manifest_sha256 text;
alter table public.public_documents
  alter column is_multipart drop not null,
  alter column is_multipart drop default,
  alter column parts_count drop not null,
  alter column parts_count drop default,
  alter column is_scanned drop not null,
  alter column is_scanned drop default,
  alter column has_text_layer drop not null,
  alter column has_text_layer drop default,
  alter column ocr_status drop not null,
  alter column ocr_status drop default;
alter table public.public_documents drop constraint if exists chk_pubdocs_ocr_status;
alter table public.public_documents add constraint chk_pubdocs_ocr_status check (
  ocr_status in ('NOT_APPLICABLE','NOT_IMPLEMENTED','OCR_PENDING','MANUAL_TRANSCRIPTION','PROCESSED','FAILED')
  and (ocr_status <> 'NOT_APPLICABLE' or (is_scanned is not true and has_text_layer is not false))
);
comment on column public.public_documents.checksum_sha256 is 'SHA-256 historique du fichier physique. Aucune empreinte historique n’est réinterprétée en manifeste.';
comment on column public.public_documents.manifest_sha256 is 'SHA256_PARTS_MANIFEST_V1 : UTF-8, séparateurs | et LF, ordre strict des originaux, identité, chemin, taille, SHA-256 et pages.';
comment on column public.public_documents.ocr_status is 'NULL = inconnu. Absence OCR et transcription manuelle ne prouvent pas une extraction validée.';
commit;
