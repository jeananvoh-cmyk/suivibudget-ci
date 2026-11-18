-- SuiviBudget CI — optimisation ciblée de la politique de lecture des reçus admin.
-- L'identité du JWT est évaluée une seule fois par instruction, pas pour chaque ligne.
-- Le contrôle métier admin_domain_allowed reste évalué sur chaque ligne.
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

COMMIT;
