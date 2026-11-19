
create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role::text = any(allowed_roles)
  )
$$;
revoke all on function public.has_staff_role(text[]) from public, anon;
grant execute on function public.has_staff_role(text[]) to authenticated;

create or replace function public.is_admin_or_moderator()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']) $$;
revoke all on function public.is_admin_or_moderator() from public, anon;
grant execute on function public.is_admin_or_moderator() to authenticated;

alter policy "Allow admin full access on CA" on public.administrative_accounts using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on budget lines" on public.budget_lines using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on budget revenue sources" on public.budget_revenue_sources using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin insert on budget revisions" on public.budget_revision_history with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin read on budget revisions" on public.budget_revision_history using (public.has_staff_role(array['ADMIN','DATA_MANAGER','AUDITOR']));
alter policy "Allow admin write on budget sources" on public.budget_sources using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin and moderator full access on responses" on public.ca_institution_responses using (public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
alter policy "Allow admin write on CA operations" on public.ca_investment_operations using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on CA procurement matches" on public.ca_procurement_matches using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write access on caidp directory" on public.caidp_directory using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin full access on local budgets" on public.local_budgets using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow staff full access on news articles" on public.news_articles using (public.has_staff_role(array['ADMIN','MODERATOR'])) with check (public.has_staff_role(array['ADMIN','MODERATOR']));
alter policy "Allow admin write access on projects" on public.projects using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
alter policy "Allow admin write on site settings" on public.site_settings using (public.has_staff_role(array['ADMIN'])) with check (public.has_staff_role(array['ADMIN']));
alter policy "Allow admin write on sources" on public.sources using (public.has_staff_role(array['ADMIN','DATA_MANAGER'])) with check (public.has_staff_role(array['ADMIN','DATA_MANAGER']));
