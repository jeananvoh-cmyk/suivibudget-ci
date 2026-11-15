
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
alter function public.rls_auto_enable() set search_path = '';

create index if not exists idx_ca_responses_ca_id on public.ca_institution_responses(ca_id);
create index if not exists idx_ca_responses_operation_id on public.ca_institution_responses(operation_id);
create index if not exists idx_citizen_proofs_citizen_user_id on public.citizen_proofs(citizen_user_id);
create index if not exists idx_citizen_proofs_moderated_by on public.citizen_proofs(moderated_by);

alter policy "Approved citizen proofs are viewable by everyone." on public.citizen_proofs
using ((verification_status = 'APPROVED') or ((select auth.uid()) = citizen_user_id));

drop policy if exists "Admins can manage public documents." on public.public_documents;
drop policy if exists "Admins can manage public documents" on public.public_documents;
