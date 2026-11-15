-- =========================================================================
-- SUIVIBUDGET CI — HARDENING RLS DES BUDGETS LOCAUX
-- Les rôles d'autorisation ne doivent provenir que de app_metadata,
-- modifiable côté serveur de confiance. user_metadata est modifiable par
-- l'utilisateur et ne doit jamais accorder de privilèges.
-- Migration additive : aucune donnée n'est modifiée.
-- =========================================================================

BEGIN;

-- Ne jamais attribuer implicitement un statut AIP vérifié à un budget inséré
-- sans qualification documentaire explicite.
ALTER TABLE public.local_budgets
  ALTER COLUMN verification_status SET DEFAULT 'DOCUMENT_TO_EXTRACT';
ALTER TABLE public.budget_revenue_sources
  ALTER COLUMN verification_status SET DEFAULT 'DOCUMENT_TO_EXTRACT';

DROP POLICY IF EXISTS "Allow admin write on sources" ON public.sources;
CREATE POLICY "Allow admin write on sources"
  ON public.sources FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin full access on local budgets" ON public.local_budgets;
CREATE POLICY "Allow admin full access on local budgets"
  ON public.local_budgets FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin write on budget sources" ON public.budget_sources;
CREATE POLICY "Allow admin write on budget sources"
  ON public.budget_sources FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin write on budget revenue sources" ON public.budget_revenue_sources;
CREATE POLICY "Allow admin write on budget revenue sources"
  ON public.budget_revenue_sources FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin write on budget lines" ON public.budget_lines;
CREATE POLICY "Allow admin write on budget lines"
  ON public.budget_lines FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin read on budget revisions" ON public.budget_revision_history;
CREATE POLICY "Allow admin read on budget revisions"
  ON public.budget_revision_history FOR SELECT TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER','AUDITOR']));

DROP POLICY IF EXISTS "Allow admin insert on budget revisions" ON public.budget_revision_history;
CREATE POLICY "Allow admin insert on budget revisions"
  ON public.budget_revision_history FOR INSERT TO authenticated
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

-- Les mêmes défauts d'autorisation existaient sur les Comptes Administratifs,
-- leurs opérations, les marchés associés et les réponses institutionnelles.
DROP POLICY IF EXISTS "Allow admin full access on CA" ON public.administrative_accounts;
CREATE POLICY "Allow admin full access on CA"
  ON public.administrative_accounts FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin write on CA operations" ON public.ca_investment_operations;
CREATE POLICY "Allow admin write on CA operations"
  ON public.ca_investment_operations FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin write on CA procurement matches" ON public.ca_procurement_matches;
CREATE POLICY "Allow admin write on CA procurement matches"
  ON public.ca_procurement_matches FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin and moderator full access on responses" ON public.ca_institution_responses;
CREATE POLICY "Allow admin and moderator full access on responses"
  ON public.ca_institution_responses FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','MODERATOR']))
  WITH CHECK (private.has_staff_role(array['ADMIN','MODERATOR']));

-- Champs de preuve primaire manquants sur les rapprochements DGMP.
ALTER TABLE public.ca_procurement_matches
  ADD COLUMN IF NOT EXISTS source_document_id text REFERENCES public.public_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_page integer;

-- Suppression des anciennes politiques permissives fondées sur user_metadata.
-- Les politiques de publication et de gestion staff ci-dessous sont déjà
-- remplacées par les migrations de frontières de publication et de persistance.
DROP POLICY IF EXISTS "Allow admin write access on projects" ON public.projects;
CREATE POLICY "Allow admin write access on projects"
  ON public.projects FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow moderators full management on citizen proofs" ON public.citizen_proofs;
CREATE POLICY "Allow moderators full management on citizen proofs"
  ON public.citizen_proofs FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin only read on newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Allow admin only read on newsletter subscribers"
  ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (private.has_staff_role(array['ADMIN']));

-- Les documents sont déjà gérés par "Staff manage documents" et les fichiers
-- par les politiques de staging privées basées sur private.has_staff_role.
DROP POLICY IF EXISTS "Allow staff full access on public documents" ON public.public_documents;
DROP POLICY IF EXISTS "Staff can upload public documents files" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete public documents files" ON storage.objects;
DROP POLICY IF EXISTS "Public documents files are publicly readable" ON storage.objects;

COMMIT;
