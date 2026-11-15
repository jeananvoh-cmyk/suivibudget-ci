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

-- Les tables exposées doivent porter l'identifiant du document primaire et la page exacte.
ALTER TABLE public.local_budgets
  ADD COLUMN IF NOT EXISTS source_document_id text REFERENCES public.public_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_page integer;
ALTER TABLE public.local_budgets
  ADD CONSTRAINT local_budgets_source_page_positive
  CHECK (source_page IS NULL OR source_page > 0);

ALTER TABLE public.ca_procurement_matches
  ADD COLUMN IF NOT EXISTS source_document_id text REFERENCES public.public_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_page integer;
ALTER TABLE public.ca_procurement_matches
  ADD CONSTRAINT ca_procurement_matches_source_page_positive
  CHECK (source_page IS NULL OR source_page > 0);

-- Aucun statut officiel ne doit être attribué par défaut.
ALTER TABLE public.administrative_accounts
  ALTER COLUMN verification_status SET DEFAULT 'TO_VERIFY';
ALTER TABLE public.ca_procurement_matches
  ALTER COLUMN verification_status SET DEFAULT 'TO_VERIFY';
ALTER TABLE public.budget_projects
  ALTER COLUMN data_provenance SET DEFAULT 'DECLARED_ADMIN';

-- Déclassement conservateur des lignes existantes sans pièce primaire vérifiée.
UPDATE public.local_budgets
  SET verification_status = 'SECONDARY_TO_CORROBORATE'
  WHERE verification_status = 'AIP_VERIFIED';
UPDATE public.local_budgets
  SET verification_status = 'DOCUMENT_TO_EXTRACT'
  WHERE verification_status IN ('OFFICIAL_DOCUMENT', 'OFFICIAL_INSTITUTION')
    AND (
      source_document_id IS NULL OR source_page IS NULL OR document_url IS NULL
      OR document_url !~* '^https://([a-z0-9-]+\\.)*(dgbf\\.ci|marchespublics\\.ci|courdescomptes\\.ci|gouv\\.ci)(/|$)'
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents d
        WHERE d.id = local_budgets.source_document_id
          AND d.status = 'PUBLISHED'
          AND d.verification_status = 'VERIFIED'
          AND d.checksum_status = 'VERIFIED'
          AND d.checksum_sha256 IS NOT NULL
      )
    );
UPDATE public.budget_revenue_sources
  SET verification_status = 'SECONDARY_TO_CORROBORATE'
  WHERE verification_status = 'AIP_VERIFIED';
UPDATE public.administrative_accounts
  SET verification_status = 'TO_VERIFY'
  WHERE verification_status IN ('OFFICIAL_DOCUMENT', 'VERIFIED')
    AND (
      source_document_id IS NULL OR source_url IS NULL
      OR source_url !~* '^https://([a-z0-9-]+\\.)*(dgbf\\.ci|marchespublics\\.ci|courdescomptes\\.ci|gouv\\.ci)(/|$)'
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents d
        WHERE d.id = administrative_accounts.source_document_id
          AND d.status = 'PUBLISHED'
          AND d.verification_status = 'VERIFIED'
          AND d.checksum_status = 'VERIFIED'
          AND d.checksum_sha256 IS NOT NULL
      )
    );
UPDATE public.ca_procurement_matches
  SET verification_status = 'TO_VERIFY'
  WHERE verification_status IN ('Vérifié DGMP', 'VERIFIED', 'OFFICIAL_DOCUMENT')
    AND (
      source_document_id IS NULL OR source_page IS NULL OR source_url IS NULL
      OR source_url !~* '^https://([a-z0-9-]+\\.)*(dgbf\\.ci|marchespublics\\.ci|courdescomptes\\.ci|gouv\\.ci)(/|$)'
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents d
        WHERE d.id = ca_procurement_matches.source_document_id
          AND d.status = 'PUBLISHED'
          AND d.verification_status = 'VERIFIED'
          AND d.checksum_status = 'VERIFIED'
          AND d.checksum_sha256 IS NOT NULL
      )
    );
UPDATE public.budget_projects
  SET data_provenance = 'DECLARED_ADMIN',
      financial_verification_status = 'TO_VERIFY'
  WHERE data_provenance = 'OFFICIAL_SOURCE'
    AND (
      source_document_id IS NULL OR source_page IS NULL OR source_url IS NULL
      OR source_url !~* '^https://([a-z0-9-]+\\.)*(dgbf\\.ci|marchespublics\\.ci|courdescomptes\\.ci|gouv\\.ci)(/|$)'
      OR financial_verification_status <> 'VERIFIED'
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents d
        WHERE d.id = budget_projects.source_document_id
          AND d.status = 'PUBLISHED'
          AND d.verification_status = 'VERIFIED'
          AND d.checksum_status = 'VERIFIED'
          AND d.checksum_sha256 IS NOT NULL
      )
    );

-- Garde-fou serveur : une écriture directe ou un import ne peut pas contourner
-- les exigences de pièce officielle vérifiée, d'URL institutionnelle et de page.
CREATE OR REPLACE FUNCTION private.enforce_primary_document_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $
DECLARE
  row_data jsonb := to_jsonb(NEW);
  source_id text;
  source_url_value text;
  source_page_value integer;
  evidence_status text;
  needs_page boolean := true;
BEGIN
  source_id := row_data ->> 'source_document_id';
  source_url_value := COALESCE(row_data ->> 'source_url', row_data ->> 'document_url');
  source_page_value := NULLIF(row_data ->> 'source_page', '')::integer;

  IF TG_TABLE_NAME = 'budget_projects' THEN
    evidence_status := row_data ->> 'financial_verification_status';
  ELSE
    evidence_status := row_data ->> 'verification_status';
  END IF;

  IF TG_TABLE_NAME = 'administrative_accounts' THEN
    needs_page := false; -- la page est portée par chaque opération du CA
  END IF;

  IF evidence_status IN ('OFFICIAL_DOCUMENT', 'OFFICIAL_INSTITUTION', 'OFFICIAL_SOURCE', 'VERIFIED', 'Vérifié DGMP') THEN
    IF source_id IS NULL OR source_url_value IS NULL
       OR source_url_value !~* '^https://([a-z0-9-]+\\.)*(dgbf\\.ci|marchespublics\\.ci|courdescomptes\\.ci|gouv\\.ci)(/|$)' THEN
      RAISE EXCEPTION 'Certification primaire refusée : identifiant documentaire et URL institutionnelle HTTPS obligatoires';
    END IF;
    IF needs_page AND (source_page_value IS NULL OR source_page_value <= 0) THEN
      RAISE EXCEPTION 'Certification primaire refusée : page exacte du document obligatoire';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents d
      WHERE d.id = source_id
        AND d.status = 'PUBLISHED'
        AND d.verification_status = 'VERIFIED'
        AND d.checksum_status = 'VERIFIED'
        AND d.checksum_sha256 IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Certification primaire refusée : le document lié doit être publié, vérifié et doté d’une empreinte SHA-256 vérifiée';
    END IF;
  END IF;

  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url
  ON public.local_budgets FOR EACH ROW EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_url
  ON public.administrative_accounts FOR EACH ROW EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url
  ON public.ca_procurement_matches FOR EACH ROW EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id, source_page, source_url
  ON public.budget_projects FOR EACH ROW EXECUTE FUNCTION private.enforce_primary_document_evidence();

-- Les anciens statuts AIP_VERIFIED ne doivent plus être présentés comme preuve primaire.
UPDATE public.local_budgets
  SET verification_status = 'SECONDARY_TO_CORROBORATE'
  WHERE verification_status = 'AIP_VERIFIED';
UPDATE public.budget_revenue_sources
  SET verification_status = 'SECONDARY_TO_CORROBORATE'
  WHERE verification_status = 'AIP_VERIFIED';

-- Un rapprochement DGMP sans identifiant de document primaire et page exacte
-- reste à vérifier, même si une ancienne version portait le libellé VERIFIED.
UPDATE public.ca_procurement_matches
  SET verification_status = 'TO_VERIFY'
  WHERE verification_status IN ('Vérifié DGMP', 'VERIFIED', 'OFFICIAL_DOCUMENT')
    AND (source_document_id IS NULL OR source_page IS NULL);

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
  USING (private.has_staff_role(array['ADMIN','MODERATOR']))
  WITH CHECK (private.has_staff_role(array['ADMIN','MODERATOR']));

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
