-- SuiviBudget CI — optimisation ciblée de la politique de lecture des reçus admin.
-- auth.uid() est évalué une fois par instruction ; le filtre métier reste inchangé.
-- Les dix index FK signalés par Advisors sont différés : le triage read-only #76
-- a relevé des tables de 0 à 1 ligne et aucune mesure ne justifie leur coût d'écriture.
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
