-- SuiviBudget CI — optimisations ciblées des politiques RLS et des clés étrangères.
-- Les index correspondent aux dix FK identifiées par Supabase Advisors sur le schéma courant.
BEGIN;

DROP POLICY IF EXISTS admin_receipt_read ON public.admin_operation_receipts;
CREATE POLICY admin_receipt_read
  ON public.admin_operation_receipts
  FOR SELECT
  TO authenticated
  USING (
    actor_id = (SELECT auth.uid())
    AND private.admin_domain_allowed(entity_type, result_data)
  );

CREATE INDEX IF NOT EXISTS idx_admin_document_file_checks_checked_by
  ON private.admin_document_file_checks(checked_by);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assignee_id
  ON public.admin_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_apec_events_actor_id
  ON public.apec_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_apec_events_contribution_id
  ON public.apec_events(contribution_id);
CREATE INDEX IF NOT EXISTS idx_apec_needs_local_budget_id
  ON public.apec_needs(local_budget_id);
CREATE INDEX IF NOT EXISTS idx_apec_needs_project_id
  ON public.apec_needs(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_source_document_id
  ON public.budget_lines(source_document_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_verified_by
  ON public.budget_lines(verified_by);
CREATE INDEX IF NOT EXISTS idx_budget_projects_financial_verified_by
  ON public.budget_projects(financial_verified_by);
CREATE INDEX IF NOT EXISTS idx_budget_projects_source_document_id
  ON public.budget_projects(source_document_id);

COMMIT;
