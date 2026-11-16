-- SuiviBudget CI — garde-fous additionnels de preuve financière et publication.
-- À exécuter après 20261115070000_enforce_primary_document_provenance.sql.
BEGIN;

-- Recreate the CA trigger so a page-only change cannot bypass source validation.
DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

-- Revenue breakdown rows need explicit provenance fields before they can be
-- labelled as verified against a primary source.
ALTER TABLE public.budget_revenue_sources
  ADD COLUMN IF NOT EXISTS source_document_id text REFERENCES public.public_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_page integer,
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE public.budget_revenue_sources
  ADD CONSTRAINT budget_revenue_sources_source_page_positive
  CHECK (source_page IS NULL OR source_page > 0);

CREATE INDEX IF NOT EXISTS idx_budget_revenue_sources_source_document_id
  ON public.budget_revenue_sources(source_document_id);

-- A verified budget line must point to the same checksum-verified primary document
-- as its published parent budget. The legacy admin_validate_change trigger did
-- not bind the line to the parent's document ID or require a computed checksum.
CREATE OR REPLACE FUNCTION private.enforce_budget_line_primary_document_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  parent_budget public.local_budgets%rowtype;
BEGIN
  IF NEW.verification_status <> 'VERIFIED' AND NEW.publication_status <> 'PUBLISHED' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO parent_budget
  FROM public.local_budgets
  WHERE id = NEW.budget_id
  FOR SHARE;

  IF NOT FOUND
    OR parent_budget.status <> 'PUBLISHED'
    OR parent_budget.source_document_id IS NULL
    OR NEW.source_document_id IS DISTINCT FROM parent_budget.source_document_id
    OR NEW.source_page IS NULL
    OR NEW.source_page <= 0 THEN
    RAISE EXCEPTION 'Verified budget line requires the exact primary document and page of its published parent budget';
  END IF;

  PERFORM 1
  FROM public.public_documents d
  WHERE d.id = NEW.source_document_id
    AND d.status = 'PUBLISHED'
    AND d.verification_status = 'VERIFIED'
    AND d.checksum_status IN ('COMPUTED', 'VERIFIED')
    AND d.checksum_sha256 ~ '^[a-f0-9]{64}$'
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.document_type IN ('BUDGET_PRIMITIF', 'BUDGET_MODIFICATIF')
    AND d.source_url = parent_budget.document_url
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verified budget line requires its parent published checksum-verified document';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_budget_line_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_budget_line_primary_document_evidence ON public.budget_lines;
CREATE TRIGGER enforce_budget_line_primary_document_evidence
  BEFORE INSERT OR UPDATE OF verification_status, publication_status, source_document_id, source_page, budget_id, amount
  ON public.budget_lines FOR EACH ROW
  EXECUTE FUNCTION private.enforce_budget_line_primary_document_evidence();

-- Revenue-source amounts may be certified only against the exact verified source
-- document and page of the published parent local budget.
CREATE OR REPLACE FUNCTION private.enforce_budget_revenue_source_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  parent_budget public.local_budgets%rowtype;
  primary_status boolean;
BEGIN
  primary_status := NEW.verification_status IN ('OFFICIAL_DOCUMENT', 'OFFICIAL_INSTITUTION', 'VERIFIED');

  IF TG_OP = 'UPDATE'
    AND OLD.verification_status IN ('OFFICIAL_DOCUMENT', 'OFFICIAL_INSTITUTION', 'VERIFIED')
    AND NEW.verification_status = OLD.verification_status
    AND (
      NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.source_document_id IS DISTINCT FROM OLD.source_document_id
      OR NEW.source_page IS DISTINCT FROM OLD.source_page
      OR NEW.source_url IS DISTINCT FROM OLD.source_url
    ) THEN
    RAISE EXCEPTION 'Changing a certified revenue amount or its source requires a new review';
  END IF;

  IF NOT primary_status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO parent_budget
  FROM public.local_budgets
  WHERE id = NEW.budget_id
  FOR SHARE;

  IF NOT FOUND
    OR parent_budget.status <> 'PUBLISHED'
    OR parent_budget.source_document_id IS NULL
    OR NEW.source_document_id IS DISTINCT FROM parent_budget.source_document_id
    OR NEW.source_page IS NULL
    OR NEW.source_page <= 0
    OR NEW.source_url IS DISTINCT FROM parent_budget.document_url THEN
    RAISE EXCEPTION 'Primary revenue source requires the exact document and page of its published parent budget';
  END IF;

  PERFORM 1
  FROM public.public_documents d
  WHERE d.id = NEW.source_document_id
    AND d.status = 'PUBLISHED'
    AND d.verification_status = 'VERIFIED'
    AND d.checksum_status IN ('COMPUTED', 'VERIFIED')
    AND d.checksum_sha256 ~ '^[a-f0-9]{64}$'
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.document_type IN ('BUDGET_PRIMITIF', 'BUDGET_MODIFICATIF')
    AND d.source_url = NEW.source_url
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Primary revenue source requires a published checksum-verified document';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_budget_revenue_source_evidence()
  FROM public, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_budget_revenue_source_evidence ON public.budget_revenue_sources;
CREATE TRIGGER enforce_budget_revenue_source_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, budget_id, amount
  ON public.budget_revenue_sources FOR EACH ROW
  EXECUTE FUNCTION private.enforce_budget_revenue_source_evidence();

-- Child budget references are visible only with their published parent budget.
DROP POLICY IF EXISTS "Allow public read on budget sources" ON public.budget_sources;
CREATE POLICY "Allow public read on budget sources"
  ON public.budget_sources FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.local_budgets lb
      WHERE lb.id = budget_sources.budget_id
        AND lb.status = 'PUBLISHED'
    )
  );

DROP POLICY IF EXISTS "Allow public read on budget revenue sources" ON public.budget_revenue_sources;
CREATE POLICY "Allow public read on budget revenue sources"
  ON public.budget_revenue_sources FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.local_budgets lb
      WHERE lb.id = budget_revenue_sources.budget_id
        AND lb.status = 'PUBLISHED'
    )
  );

-- A document cannot be downgraded, replaced or detached while certified financial
-- records still rely on it. Revoke dependent certifications first, then change it.
CREATE OR REPLACE FUNCTION private.prevent_revoking_referenced_primary_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  has_certified_dependents boolean;
BEGIN
  IF OLD.status IN ('VERIFIED', 'PUBLISHED')
    AND (
      (OLD.status = 'PUBLISHED' AND NEW.status IS DISTINCT FROM 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status IS DISTINCT FROM 'VERIFIED'
      OR (NEW.checksum_status IS DISTINCT FROM 'COMPUTED' AND NEW.checksum_status IS DISTINCT FROM 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
      OR NEW.page_count IS DISTINCT FROM OLD.page_count
      OR NEW.source_url IS DISTINCT FROM OLD.source_url
      OR NEW.source_name IS DISTINCT FROM OLD.source_name
      OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
      OR NEW.fiscal_year IS DISTINCT FROM OLD.fiscal_year
      OR NEW.document_type IS DISTINCT FROM OLD.document_type
      OR NEW.file_url IS DISTINCT FROM OLD.file_url
      OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
    ) THEN
    SELECT
      EXISTS (SELECT 1 FROM public.local_budgets lb
        WHERE lb.source_document_id = OLD.id
          AND (lb.status = 'PUBLISHED' OR lb.verification_status IN ('OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION')))
      OR EXISTS (SELECT 1 FROM public.budget_projects bp
        WHERE bp.source_document_id = OLD.id
          AND bp.archived_at IS NULL
          AND bp.publication_status <> 'ARCHIVED'
          AND (bp.publication_status = 'PUBLISHED'
            OR bp.data_provenance = 'OFFICIAL_SOURCE'
            OR bp.financial_verification_status IN ('VERIFIED','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE')))
      OR EXISTS (SELECT 1 FROM public.budget_projects bp
        WHERE bp.archived_at IS NULL
          AND bp.publication_status <> 'ARCHIVED'
          AND (
            (bp.project_metadata ->> 'citizen_need_verification_status' = 'VERIFIED'
              AND bp.project_metadata ->> 'citizen_need_source_document_id' = OLD.id)
            OR (bp.project_metadata ->> 'audit_verification_status' = 'VERIFIED'
              AND bp.project_metadata ->> 'audit_source_document_id' = OLD.id)
          ))
      OR EXISTS (SELECT 1 FROM public.budget_lines bl
        WHERE bl.source_document_id = OLD.id
          AND bl.archived_at IS NULL
          AND bl.publication_status <> 'ARCHIVED'
          AND (bl.publication_status = 'PUBLISHED' OR bl.verification_status = 'VERIFIED'))
      OR EXISTS (SELECT 1 FROM public.budget_revenue_sources brs
        WHERE brs.source_document_id = OLD.id
          AND brs.verification_status IN ('OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','VERIFIED'))
      OR EXISTS (SELECT 1 FROM public.administrative_accounts aa
        WHERE aa.source_document_id = OLD.id
          AND (aa.status IN ('VERIFIED','PUBLISHED')
            OR aa.verification_status IN ('OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','VERIFIED')))
      OR EXISTS (SELECT 1 FROM public.ca_procurement_matches cm
        WHERE cm.source_document_id = OLD.id
          AND cm.verification_status IN ('Vérifié DGMP','OFFICIAL_DOCUMENT','VERIFIED'))
    INTO has_certified_dependents;

    IF has_certified_dependents THEN
      RAISE EXCEPTION 'Cannot revoke a primary document while certified financial records depend on it; downgrade those records first';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.prevent_revoking_referenced_primary_document()
  FROM public, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS prevent_revoking_referenced_primary_document ON public.public_documents;
CREATE TRIGGER prevent_revoking_referenced_primary_document
  BEFORE UPDATE ON public.public_documents
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_revoking_referenced_primary_document();
COMMIT;
