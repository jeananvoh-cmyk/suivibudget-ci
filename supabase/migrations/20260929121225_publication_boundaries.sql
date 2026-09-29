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
  and (citizen_user_id is null or citizen_user_id = (select auth.uid()))
  and moderated_by is null and moderated_at is null and moderator_notes is null
  and verified_by is null and verified_at is null
  and coalesce(confirmations_count, 0) = 0
);

-- 9. Trigger d'audit de publication obligatoire
create or replace function public.enforce_document_publication_audit()
returns trigger language plpgsql set search_path = ''
as $$
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
  else
    if new.storage_path is distinct from old.storage_path
       or new.checksum_sha256 is distinct from old.checksum_sha256
       or new.version is distinct from old.version
       or new.file_url is distinct from old.file_url then
      raise exception 'Create a new document version to replace the source';
    end if;
    if new.status = 'PUBLISHED' and old.status <> 'PUBLISHED' then
      if old.status <> 'VERIFIED' or old.verification_status <> 'VERIFIED'
         or old.verified_by is null or old.verified_at is null then
        raise exception 'Verify the document before publishing';
      end if;
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
