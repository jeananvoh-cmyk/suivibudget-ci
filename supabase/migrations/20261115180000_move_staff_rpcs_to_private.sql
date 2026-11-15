-- SuiviBudget CI — fermeture des alertes SECURITY DEFINER exposées et des lectures trop larges.
-- Migration additive : conserve les RPC utilisées par le client via des wrappers INVOKER.
-- Les implémentations privilégiées sont déplacées dans le schéma non exposé private.
BEGIN;

-- private is deliberately not part of the PostgREST exposed schemas. Authenticated
-- callers may invoke only the eight explicitly granted implementations through
-- the public SECURITY INVOKER wrappers below.
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.admin_baseline_visibility(text, text[]) SET SCHEMA private;
ALTER FUNCTION public.admin_staff_directory() SET SCHEMA private;
ALTER FUNCTION public.apec_link_targets(text, integer) SET SCHEMA private;
ALTER FUNCTION public.import_data_batch(jsonb, boolean, text) SET SCHEMA private;
ALTER FUNCTION public.publish_apec_need(uuid, text, text, text, date, boolean) SET SCHEMA private;
ALTER FUNCTION public.record_apec_decision(uuid, text, text, text, date, integer, text, text, uuid) SET SCHEMA private;
ALTER FUNCTION public.review_data_import(text[], text, text, boolean) SET SCHEMA private;
ALTER FUNCTION public.withdraw_apec_need(uuid, text) SET SCHEMA private;

-- Keep the original internal authorization checks and execution context.
REVOKE ALL ON FUNCTION private.admin_baseline_visibility(text, text[]) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.admin_staff_directory() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.apec_link_targets(text, integer) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.import_data_batch(jsonb, boolean, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.publish_apec_need(uuid, text, text, text, date, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.record_apec_decision(uuid, text, text, text, date, integer, text, text, uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.review_data_import(text[], text, text, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.withdraw_apec_need(uuid, text) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION private.admin_baseline_visibility(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_staff_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION private.apec_link_targets(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.import_data_batch(jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.publish_apec_need(uuid, text, text, text, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.record_apec_decision(uuid, text, text, text, date, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.review_data_import(text[], text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.withdraw_apec_need(uuid, text) TO authenticated;

-- Public RPC names remain stable for the frontend. They run as INVOKER and
-- delegate to the private SECURITY DEFINER implementations, which check staff
-- roles before any privileged read or mutation.
CREATE OR REPLACE FUNCTION public.admin_baseline_visibility(p_table text, p_ids text[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.admin_baseline_visibility($1, $2) $$;

CREATE OR REPLACE FUNCTION public.admin_staff_directory()
RETURNS TABLE(id uuid, full_name text, role text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.admin_staff_directory() $$;

CREATE OR REPLACE FUNCTION public.apec_link_targets(p_institution_id text, p_fiscal_year integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.apec_link_targets($1, $2) $$;

CREATE OR REPLACE FUNCTION public.import_data_batch(p_rows jsonb, p_commit boolean DEFAULT false, p_plan_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.import_data_batch($1, $2, $3) $$;

CREATE OR REPLACE FUNCTION public.publish_apec_need(
  p_need_id uuid, p_title text, p_summary text, p_source_reference text,
  p_source_date date, p_privacy_reviewed boolean
)
RETURNS void LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.publish_apec_need($1, $2, $3, $4, $5, $6) $$;

CREATE OR REPLACE FUNCTION public.record_apec_decision(
  p_need_id uuid, p_action text, p_body text, p_source_reference text, p_source_date date,
  p_priority integer DEFAULT NULL, p_project_id text DEFAULT NULL,
  p_local_budget_id text DEFAULT NULL, p_contribution_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.record_apec_decision($1, $2, $3, $4, $5, $6, $7, $8, $9) $$;

CREATE OR REPLACE FUNCTION public.review_data_import(
  p_ids text[], p_action text, p_reason text, p_publish_confirmed boolean DEFAULT false
)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.review_data_import($1, $2, $3, $4) $$;

CREATE OR REPLACE FUNCTION public.withdraw_apec_need(p_need_id uuid, p_reason text)
RETURNS void LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.withdraw_apec_need($1, $2) $$;

REVOKE ALL ON FUNCTION public.admin_baseline_visibility(text, text[]) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.admin_staff_directory() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.apec_link_targets(text, integer) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.import_data_batch(jsonb, boolean, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.publish_apec_need(uuid, text, text, text, date, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.record_apec_decision(uuid, text, text, text, date, integer, text, text, uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.review_data_import(text[], text, text, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.withdraw_apec_need(uuid, text) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.admin_baseline_visibility(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_staff_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apec_link_targets(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_data_batch(jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_apec_need(uuid, text, text, text, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_apec_decision(uuid, text, text, text, date, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_data_import(text[], text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_apec_need(uuid, text) TO authenticated;

-- site_settings contains contact_email and internal settings_metadata. The public
-- SELECT policy exposed every column to anon/authenticated. Keep staff-only access;
-- the public application uses its safe defaults and no public direct table read.
DROP POLICY IF EXISTS admin_entity_public ON public.site_settings;

COMMIT;
