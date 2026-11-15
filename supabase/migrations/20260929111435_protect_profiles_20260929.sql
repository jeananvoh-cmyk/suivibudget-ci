
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() = old.id and not public.has_staff_role(array['ADMIN']) then
    if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
      raise exception 'Role and account status cannot be changed by the profile owner';
    end if;
  end if;
  return new;
end
$$;
revoke all on function public.protect_profile_privileges() from public, anon, authenticated;

drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger before update on public.profiles
for each row execute function public.protect_profile_privileges();

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

create policy "Users can read own profile" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));

create policy "Users can insert own citizen profile" on public.profiles
for insert to authenticated
with check (id = (select auth.uid()) and role::text = 'CITIZEN' and is_active = true);

create policy "Users can update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()) or public.has_staff_role(array['ADMIN']))
with check (id = (select auth.uid()) or public.has_staff_role(array['ADMIN']));

alter function public.handle_new_user() set search_path = '';
revoke all on function public.handle_new_user() from public, anon, authenticated;
