
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.has_staff_role(allowed_roles text[])
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true and p.role::text=any(allowed_roles)) $$;
revoke all on function private.has_staff_role(text[]) from public, anon;
grant execute on function private.has_staff_role(text[]) to authenticated;

alter policy "Allow admin full access on CA" on public.administrative_accounts using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on budget lines" on public.budget_lines using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on budget revenue sources" on public.budget_revenue_sources using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin insert on budget revisions" on public.budget_revision_history with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin read on budget revisions" on public.budget_revision_history using (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on budget sources" on public.budget_sources using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin and moderator full access on responses" on public.ca_institution_responses using (private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
alter policy "Allow admin write on CA operations" on public.ca_investment_operations using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on CA procurement matches" on public.ca_procurement_matches using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write access on caidp directory" on public.caidp_directory using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin full access on local budgets" on public.local_budgets using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow staff full access on news articles" on public.news_articles using (private.has_staff_role(array['ADMIN','MODERATOR'])) with check (private.has_staff_role(array['ADMIN','MODERATOR']));
alter policy "Allow admin write access on projects" on public.projects using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on site settings" on public.site_settings using (private.has_staff_role(array['ADMIN'])) with check (private.has_staff_role(array['ADMIN']));
alter policy "Allow admin write on sources" on public.sources using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Staff manage documents" on public.public_documents using (private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
alter policy "Users can read own profile" on public.profiles using (id=(select auth.uid()) or private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
alter policy "Users can update own profile" on public.profiles using (id=(select auth.uid()) or private.has_staff_role(array['ADMIN'])) with check (id=(select auth.uid()) or private.has_staff_role(array['ADMIN']));

alter policy "Admins and Data Managers can insert institutions." on public.institutions to authenticated with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Admins and Data Managers can update institutions." on public.institutions to authenticated using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Admins and Data Managers can delete institutions." on public.institutions to authenticated using (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Admins and Data Managers can insert budget projects." on public.budget_projects to authenticated with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Admins and Data Managers can update budget projects." on public.budget_projects to authenticated using (private.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Admins and Data Managers can delete budget projects." on public.budget_projects to authenticated using (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Admins and Moderators can update proofs." on public.citizen_proofs to authenticated using (private.has_staff_role(array['ADMIN','MODERATOR'])) with check (private.has_staff_role(array['ADMIN','MODERATOR']));
alter policy "Admins can delete citizen proofs." on public.citizen_proofs to authenticated using (private.has_staff_role(array['ADMIN']));
alter policy "Only admins can view subscribers" on public.newsletter_subscribers to authenticated using (private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Admins and Data Managers can view caidp request events." on public.caidp_document_requests_log to authenticated using (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

alter policy "Authenticated staff read staged documents" on storage.objects using (bucket_id='public_documents' and private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
alter policy "Authenticated staff upload staged documents" on storage.objects with check (bucket_id='public_documents' and private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
alter policy "Authenticated staff update staged documents" on storage.objects using (bucket_id='public_documents' and private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER'])) with check (bucket_id='public_documents' and private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
alter policy "Authenticated staff delete staged documents" on storage.objects using (bucket_id='public_documents' and private.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Staff read citizen evidence" on storage.objects using (bucket_id='citizen_photos' and private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
alter policy "Admins and Moderators can delete citizen media" on storage.objects to authenticated using (bucket_id='citizen_photos' and private.has_staff_role(array['ADMIN','MODERATOR']));
alter policy "Admins can upload public documents" on storage.objects to authenticated with check (bucket_id='public_documents' and private.has_staff_role(array['ADMIN','DATA_MANAGER']));

create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid()=old.id and not private.has_staff_role(array['ADMIN']) then
    if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
      raise exception 'Role and account status cannot be changed by the profile owner';
    end if;
  end if;
  return new;
end
$$;

drop function public.is_admin_or_moderator();
drop function public.has_staff_role(text[]);
