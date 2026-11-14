-- Additive & idempotent security reconciliation migration.
-- Prepared & verified locally under PGlite (NOT yet applied on Supabase Production).
-- Reconciles private-schema RLS, admin_baseline_visibility dynamic ID filters,
-- and explicit service_role/anon/public EXECUTE privileges on all SECURITY DEFINER functions.
begin;

-- 1. Enable RLS (default-deny, 0 permissive policies) and revoke all direct table privileges in schema private
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'private.admin_document_file_checks',
    'private.document_delivery_receipts'
  ] loop
    if to_regclass(tbl) is not null then
      execute format('alter table %s enable row level security', tbl);
      execute format('revoke all on table %s from public, anon, authenticated, service_role', tbl);
    end if;
  end loop;
end $$;

-- 2. Reconcile public.admin_baseline_visibility:
--    - Remains restricted to authenticated active staff (ADMIN, DATA_MANAGER, MODERATOR).
--    - Excludes dynamically generated/imported baseline probes (admin-%, csv-%, import-%).
create or replace function public.admin_baseline_visibility(p_table text, p_ids text[]) returns jsonb
language plpgsql stable security definer set search_path='' as $baseline$
declare result jsonb;
begin
  if not coalesce(private.has_staff_role(array['ADMIN','DATA_MANAGER','MODERATOR']), false) then
    raise exception 'Staff authorization required' using errcode='42501';
  end if;
  if p_table is null or p_ids is null or p_table not in ('institutions','budget_projects','news_articles','caidp_directory') or cardinality(p_ids) > 30000 then
    raise exception 'Invalid baseline request';
  end if;
  execute format(
    'select coalesce(jsonb_agg(id),''[]''::jsonb) from public.%I where id=any($1) and id not like ''admin-%%'' and id not like ''csv-%%'' and id not like ''import-%%'' and (archived_at is not null or %I<>''PUBLISHED'')',
    p_table,
    case when p_table='news_articles' then 'workflow_status' else 'publication_status' end
  ) into result using p_ids;
  return result;
end $baseline$;

-- 3. Enforce strict EXECUTE privilege matrix across all staff, service_role, trigger, and deprecated SECURITY DEFINER functions
do $$
declare sig text;
begin
  -- 3a. Staff-only functions (authenticated active staff only; revoke public, anon, service_role)
  foreach sig in array array[
    'public.admin_baseline_visibility(text,text[])',
    'public.admin_staff_directory()',
    'public.admin_mutate(text,text,integer,jsonb,uuid,text)',
    'public.admin_mutate_batch(jsonb)',
    'private.admin_file_checked(text,text,text,text,bigint)',
    'private.admin_media_link_allowed(text,text,text)',
    'private.admin_original_unreferenced(text,text)',
    'private.has_staff_role(text[])',
    'private.admin_domain_allowed(text,jsonb)',
    'private.admin_normalize_ocr(text,boolean,boolean)',
    'public.apec_link_targets(text,integer)',
    'public.publish_apec_need(uuid,text,text,text,date,boolean)',
    'public.record_apec_decision(uuid,text,text,text,date,integer,text,text,uuid)',
    'public.withdraw_apec_need(uuid,text)',
    'public.import_data_batch(jsonb,boolean,text)',
    'public.review_data_import(text[],text,text,boolean)',
    'public.review_data_import(text[],text,text)'
  ] loop
    begin
      execute format('revoke all on function %s from public, anon, service_role', sig);
      execute format('grant execute on function %s to authenticated', sig);
    exception when undefined_function then
      null;
    end;
  end loop;

  -- 3b. Edge / server-only SECURITY DEFINER RPCs (service_role only; revoke public, anon, authenticated)
  foreach sig in array array[
    'public.admin_confirm_document_integrity(text,integer,uuid,jsonb)',
    'public.record_document_delivery(text,uuid,text,text,text)'
  ] loop
    begin
      execute format('revoke all on function %s from public, anon, authenticated', sig);
      execute format('grant execute on function %s to service_role', sig);
    exception when undefined_function then
      null;
    end;
  end loop;

  -- 3c. Trigger functions & deprecated helpers (no direct client or service_role EXECUTE)
  foreach sig in array array[
    'public.handle_new_user()',
    'public.protect_profile_privileges()',
    'public.rls_auto_enable()',
    'public.enforce_document_publication_audit()',
    'public.increment_document_download(text)',
    'private.apec_submission_event()',
    'private.enforce_apec_contribution_status_transition()',
    'private.admin_record_event()',
    'private.admin_validate_change()',
    'private.admin_moderation_identity()',
    'private.admin_validate_document_integrity()',
    'private.admin_source_withdrawal()',
    'private.admin_validate_media_link()',
    'private.admin_redact(jsonb)',
    'private.validate_import_row(jsonb)'
  ] loop
    begin
      execute format('revoke all on function %s from public, anon, authenticated, service_role', sig);
    exception when undefined_function then
      null;
    end;
  end loop;
end $$;

-- 4. Scope storage.objects restrictive policies cleanly between authenticated and anon
--    so anon queries never fail with "permission denied for function has_staff_role"
--    even if a permissive SELECT/DELETE policy exists, while remaining strictly fail-closed.
do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists documents_staff_domain on storage.objects;
    drop policy if exists documents_anon_deny on storage.objects;
    create policy documents_staff_domain on storage.objects as restrictive for select to authenticated using (
      bucket_id <> 'public_documents' or private.has_staff_role(array['ADMIN','DATA_MANAGER'])
    );
    create policy documents_anon_deny on storage.objects as restrictive for select to anon using (
      bucket_id <> 'public_documents'
    );

    drop policy if exists citizen_media_staff_domain on storage.objects;
    drop policy if exists citizen_media_anon_deny on storage.objects;
    create policy citizen_media_staff_domain on storage.objects as restrictive for select to authenticated using (
      bucket_id <> 'citizen_photos' or private.has_staff_role(array['ADMIN','MODERATOR'])
    );
    create policy citizen_media_anon_deny on storage.objects as restrictive for select to anon using (
      bucket_id <> 'citizen_photos'
    );

    drop policy if exists protected_admin_originals on storage.objects;
    drop policy if exists protected_admin_originals_anon_deny on storage.objects;
    create policy protected_admin_originals on storage.objects as restrictive for delete to authenticated using (
      bucket_id <> 'admin_media'
      and (bucket_id <> 'public_documents' or private.admin_original_unreferenced(bucket_id, name))
    );
    create policy protected_admin_originals_anon_deny on storage.objects as restrictive for delete to anon using (
      bucket_id <> 'admin_media' and bucket_id <> 'public_documents'
    );
  end if;
end $$;

commit;
