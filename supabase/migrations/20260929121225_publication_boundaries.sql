-- SuiviBudget CI — Frontières de publication et d'audit RLS
-- Idempotent, non destructif, isolation stricte publication parent & stockage privé

begin;

-- 1. Administrative Accounts: lecture publique restreinte à PUBLISHED
drop policy if exists "Allow public read on published CA" on public.administrative_accounts;
create policy "Allow public read on published CA" on public.administrative_accounts
for select using (status = 'PUBLISHED');

-- 2. Lignes financières CA: lecture publique liée au statut parent PUBLISHED
drop policy if exists "Published CA financial lines are public" on public.ca_financial_lines;
create policy "Published CA financial lines are public" on public.ca_financial_lines
for select using (exists (
  select 1 from public.administrative_accounts a 
  where a.id = ca_id and a.status = 'PUBLISHED'
));

-- 3. Opérations d'investissement CA: lecture publique liée au statut parent PUBLISHED
drop policy if exists "Allow public read on CA operations" on public.ca_investment_operations;
create policy "Allow public read on CA operations" on public.ca_investment_operations
for select using (exists (
  select 1 from public.administrative_accounts a 
  where a.id = ca_id and a.status = 'PUBLISHED'
));

-- 4. Rapprochements marchés DGMP: lecture publique liée au statut parent PUBLISHED
drop policy if exists "Allow public read on CA procurement matches" on public.ca_procurement_matches;
create policy "Allow public read on CA procurement matches" on public.ca_procurement_matches
for select using (exists (
  select 1 from public.ca_investment_operations o
  join public.administrative_accounts a on a.id = o.ca_id
  where o.id = operation_id and a.status = 'PUBLISHED'
));

-- 5. Gestion des documents publics réservée au staff habilité
drop policy if exists "Staff manage documents" on public.public_documents;
create policy "Staff manage documents" on public.public_documents
for all to authenticated
using ((select private.has_staff_role(array['ADMIN','DATA_MANAGER'])))
with check ((select private.has_staff_role(array['ADMIN','DATA_MANAGER'])));

-- 6. Storage: immutabilité des originaux, téléversement staff, interdiction modification
drop policy if exists "Authenticated staff upload staged documents" on storage.objects;
create policy "Authenticated staff upload staged documents" on storage.objects
for insert to authenticated
with check (bucket_id = 'public_documents' and (select private.has_staff_role(array['ADMIN','DATA_MANAGER'])));

drop policy if exists "Authenticated staff update staged documents" on storage.objects;

drop policy if exists "Authenticated staff delete staged documents" on storage.objects;
create policy "Authenticated staff delete staged documents" on storage.objects
for delete to authenticated
using (
  bucket_id = 'public_documents'
  and (select private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  and not exists (select 1 from public.public_documents d where d.storage_path = name)
);

-- 7. Preuves citoyennes: modération staff pour les statuts pending/rejected
drop policy if exists "Approved citizen proofs are viewable by everyone." on public.citizen_proofs;
drop policy if exists "Citizens read own proofs" on public.citizen_proofs;
create policy "Citizens read own proofs" on public.citizen_proofs
for select to authenticated
using (citizen_user_id = (select auth.uid()));

-- Public projection intentionally excludes contact details, identity and moderation notes.
create or replace view public.public_citizen_proofs with (security_barrier = true) as
select id, project_id, project_title, commune_name, region_name,
  'Citoyen observateur'::text as citizen_name,
  image_url, video_url, media_type, citizen_status_claim, comment, locality_details,
  geo_latitude, geo_longitude, verification_status, confirmations_count,
  created_at, updated_at, signboard_status, secondary_image_url, verified_at,
  source_url, source_credit, additional_photos
from public.citizen_proofs
where verification_status = 'APPROVED';
revoke all on public.public_citizen_proofs from public, anon, authenticated;

drop policy if exists "Staff read pending citizen proofs" on public.citizen_proofs;
create policy "Staff read pending citizen proofs" on public.citizen_proofs
for select to authenticated
using ((select private.has_staff_role(array['ADMIN','MODERATOR'])));

-- 8. Preuves citoyennes: soumission intègre avec liaison d'identité obligatoire (anti-usurpation)
drop policy if exists "Anyone can submit a citizen proof." on public.citizen_proofs;
create policy "Anyone can submit a citizen proof." on public.citizen_proofs
for insert
with check (
  verification_status = 'PENDING'
  and citizen_user_id is not distinct from (select auth.uid())
  and moderated_by is null and moderated_at is null and moderator_notes is null
  and verified_by is null and verified_at is null
  and coalesce(confirmations_count, 0) = 0
);

-- 9. Trigger d'audit de publication obligatoire
create or replace function public.enforce_document_publication_audit()
returns trigger language plpgsql set search_path = ''
as $$
declare
  predecessor public.public_documents%rowtype;
begin
  if not private.has_staff_role(array['ADMIN','DATA_MANAGER']) then
    raise exception 'Document staff authorization required';
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('UPLOADED','TO_VERIFY') or new.verification_status <> 'TO_VERIFY' then
      raise exception 'New documents require verification before publication';
    end if;
    new.verified_by := null;
    new.verified_at := null;
    new.published_at := null;
    new.created_by := auth.uid();
    if new.storage_path is not null and new.checksum_sha256 is null then
      raise exception 'Uploaded documents require a checksum';
    end if;
    if new.replaces_document_id is not null then
      select * into predecessor from public.public_documents where id = new.replaces_document_id;
      if not found or new.institution_id is distinct from predecessor.institution_id
         or new.fiscal_year is distinct from predecessor.fiscal_year
         or new.document_type is distinct from predecessor.document_type
         or new.version <> predecessor.version + 1 then
        raise exception 'Replacement must continue the same document series';
      end if;
    elsif new.version <> 1 then
      raise exception 'Document versions require a predecessor';
    end if;
  else
    if new.storage_path is distinct from old.storage_path
       or new.checksum_sha256 is distinct from old.checksum_sha256
       or new.version is distinct from old.version
       or new.id is distinct from old.id
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at
       or new.storage_bucket is distinct from old.storage_bucket
       or new.replaces_document_id is distinct from old.replaces_document_id
       or new.replacement_reason is distinct from old.replacement_reason
       or new.file_url is distinct from old.file_url then
      raise exception 'Create a new document version to replace the source';
    end if;
    if old.status in ('VERIFIED','PUBLISHED') and new.status <> 'TO_VERIFY'
       and (new.institution_id is distinct from old.institution_id
         or new.fiscal_year is distinct from old.fiscal_year
         or new.document_type is distinct from old.document_type
         or new.source_name is distinct from old.source_name
         or new.source_url is distinct from old.source_url) then
      raise exception 'Reverify changed document provenance';
    end if;
    if new.status = 'PUBLISHED' and old.status <> 'PUBLISHED' then
      if old.status <> 'VERIFIED' or old.verification_status <> 'VERIFIED'
         or old.verified_by is null or old.verified_at is null then
        raise exception 'Verify the document before publishing';
      end if;
      new.verification_status := old.verification_status;
      new.verified_by := old.verified_by;
      new.verified_at := old.verified_at;
      new.published_at := now();
    elsif new.status = 'VERIFIED' and old.status <> 'VERIFIED' then
      if old.status not in ('UPLOADED','TO_VERIFY') then
        raise exception 'Return the document to verification first';
      end if;
      new.verification_status := 'VERIFIED';
      new.verified_by := auth.uid();
      new.verified_at := now();
    elsif new.status in ('UPLOADED','TO_VERIFY') then
      new.verification_status := 'TO_VERIFY';
      new.verified_by := null;
      new.verified_at := null;
    else
      new.verification_status := old.verification_status;
      new.verified_by := old.verified_by;
      new.verified_at := old.verified_at;
    end if;
    if new.status <> 'PUBLISHED' or old.status = 'PUBLISHED' then
      new.published_at := old.published_at;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_document_publication_audit_trigger on public.public_documents;
create trigger enforce_document_publication_audit_trigger
before insert or update on public.public_documents
for each row execute function public.enforce_document_publication_audit();

revoke all on function public.enforce_document_publication_audit() from public, anon, authenticated;

commit;
