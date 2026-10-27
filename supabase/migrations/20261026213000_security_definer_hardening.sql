begin;

-- 1. Harden public.admin_baseline_visibility:
--    - Explicit NULL guards on p_table and p_ids
--    - Exclude dynamic admin draft IDs (id not like 'admin-%') so anon/citizen callers cannot probe draft IDs
create or replace function public.admin_baseline_visibility(p_table text,p_ids text[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if p_table is null or p_ids is null or p_table not in ('institutions','budget_projects','news_articles','caidp_directory') or cardinality(p_ids)>30000 then
    raise exception 'Invalid baseline request';
  end if;
  execute format(
    'select coalesce(jsonb_agg(id),''[]''::jsonb) from public.%I where id=any($1) and id not like ''admin-%%'' and (archived_at is not null or %I<>''PUBLISHED'')',
    p_table,
    case when p_table='news_articles' then 'workflow_status' else 'publication_status' end
  ) into result using p_ids;
  return result;
end $$;
revoke all on function public.admin_baseline_visibility(text,text[]) from public;
grant execute on function public.admin_baseline_visibility(text,text[]) to anon,authenticated;

-- 2. Harden public.admin_staff_directory:
--    - Raise explicit 42501 insufficient_privilege when called by a non-staff authenticated user (e.g. CITIZEN)
create or replace function public.admin_staff_directory() returns table(id uuid,full_name text,role text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not coalesce(private.has_staff_role(array['ADMIN','DATA_MANAGER','MODERATOR']),false) then
    raise exception 'Staff authorization required' using errcode='42501';
  end if;
  return query
    select p.id,p.full_name,p.role::text
    from public.profiles p
    where p.is_active and p.role::text in ('ADMIN','DATA_MANAGER','MODERATOR');
end $$;
revoke all on function public.admin_staff_directory() from public,anon;
grant execute on function public.admin_staff_directory() to authenticated;

-- 3. Harden public.admin_confirm_document_integrity:
--    - Enforce internal service_role/superuser role check in addition to EXECUTE privilege revocation
create or replace function public.admin_confirm_document_integrity(p_id text,p_revision integer,p_actor uuid,p_files jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare document public.public_documents; file jsonb; expected jsonb; total integer;
begin
  if coalesce(current_setting('role',true),'none') not in ('service_role','none','postgres','supabase_admin') then
    raise exception 'Server attestation only' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=p_actor and is_active and role::text in ('ADMIN','DATA_MANAGER')) then raise exception 'Active document operator required'; end if;
  select * into document from public.public_documents where id=p_id for update;
  if not found or document.revision<>p_revision or (document.status not in ('UPLOADED','TO_VERIFY') and not (document.status in ('VERIFIED','PUBLISHED') and document.checksum_status='DECLARED')) then raise exception 'Document conflict or immutable verified version'; end if;
  if jsonb_typeof(p_files)<>'array' then raise exception 'Checked files required'; end if;
  total:=case when document.is_multipart then document.parts_count else 1 end;
  if jsonb_array_length(p_files)<>total then raise exception 'Every original file must be checked'; end if;
  if (select count(distinct value->>'storage_path') from jsonb_array_elements(p_files))<>total then raise exception 'Distinct originals required'; end if;
  for file in select value from jsonb_array_elements(p_files) loop
    if document.is_multipart then
      select value into expected from jsonb_array_elements(document.document_parts) where value->>'storage_path'=file->>'storage_path';
    else expected:=jsonb_build_object('storage_path',document.storage_path,'checksum_sha256',document.checksum_sha256,'file_size_bytes',document.file_size_bytes);
    end if;
    if expected is null or expected->>'storage_path' is distinct from file->>'storage_path' or
      expected->>'checksum_sha256' is distinct from file->>'checksum_sha256' or
      (expected->>'file_size_bytes')::bigint is distinct from (file->>'file_size_bytes')::bigint or
      file->>'checksum_sha256' !~ '^[a-f0-9]{64}$' or (file->>'file_size_bytes')::bigint<=0 or
      not exists(select 1 from storage.objects where bucket_id='public_documents' and name=file->>'storage_path') then raise exception 'Actual bytes do not match the declared original'; end if;
    insert into private.admin_document_file_checks(document_id,storage_bucket,storage_path,checksum_sha256,file_size_bytes,checked_by)
      values(p_id,'public_documents',file->>'storage_path',file->>'checksum_sha256',(file->>'file_size_bytes')::bigint,p_actor)
      on conflict(document_id,storage_bucket,storage_path) do update set checked_at=clock_timestamp(),checked_by=excluded.checked_by
      where admin_document_file_checks.checksum_sha256=excluded.checksum_sha256 and admin_document_file_checks.file_size_bytes=excluded.file_size_bytes;
  end loop;
  if (select count(*) from private.admin_document_file_checks where document_id=p_id)<>total then raise exception 'Distinct originals required'; end if;
end $$;
revoke all on function public.admin_confirm_document_integrity(text,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_confirm_document_integrity(text,integer,uuid,jsonb) to service_role;

-- 4. Harden private.admin_file_checked and private.admin_media_link_allowed:
--    - Raise explicit 42501 if invoked outside authorized staff domain or server/migration context
create or replace function private.admin_file_checked(document_id text,bucket text,path text,checksum text,size bigint) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if not (
    coalesce(private.has_staff_role(array['ADMIN','DATA_MANAGER']),false)
    or (auth.uid() is null and coalesce(current_setting('role',true),'none') in ('none','postgres','supabase_admin','service_role'))
  ) then
    raise exception 'Staff authorization required' using errcode='42501';
  end if;
  return exists(
    select 1 from private.admin_document_file_checks c join storage.objects o on o.bucket_id=c.storage_bucket and o.name=c.storage_path
    where c.document_id=$1 and c.storage_bucket=$2 and c.storage_path=$3 and c.checksum_sha256=$4 and c.file_size_bytes=$5
  );
end $$;
revoke all on function private.admin_file_checked(text,text,text,text,bigint) from public,anon;
grant execute on function private.admin_file_checked(text,text,text,text,bigint) to authenticated;

create or replace function private.admin_media_link_allowed(reference text,entity text,entity_id text) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if not (
    coalesce(private.admin_domain_allowed($2,'{}'::jsonb),false)
    or (auth.uid() is null and coalesce(current_setting('role',true),'none') in ('none','postgres','supabase_admin','service_role'))
  ) then
    raise exception 'Staff authorization required' using errcode='42501';
  end if;
  return (split_part($1,'/',4)=auth.uid()::text or auth.uid() is null) and
    exists(select 1 from storage.objects where bucket_id='admin_media' and name=replace($1,'storage://admin_media/','')) and
    not exists(select 1 from public.institutions where leader_photo_url=$1 and (entity<>'institutions' or id<>entity_id)) and
    not exists(select 1 from public.news_articles where (cover_image_url=$1 or article_metadata->>'document_url'=$1) and (entity<>'news_articles' or id<>entity_id));
end $$;
revoke all on function private.admin_media_link_allowed(text,text,text) from public,anon;
grant execute on function private.admin_media_link_allowed(text,text,text) to authenticated;

-- 5. Ensure SECURITY DEFINER trigger functions are never directly executable by client roles
do $$
declare sig text;
begin
  foreach sig in array array[
    'public.handle_new_user()',
    'public.protect_profile_privileges()',
    'public.rls_auto_enable()',
    'private.apec_submission_event()',
    'private.admin_record_event()',
    'private.admin_source_withdrawal()'
  ] loop
    begin
      execute format('revoke all on function %s from public,anon,authenticated,service_role', sig);
    exception when undefined_function then
      null;
    end;
  end loop;
end $$;

commit;
