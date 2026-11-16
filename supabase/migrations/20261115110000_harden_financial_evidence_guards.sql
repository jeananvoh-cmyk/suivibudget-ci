-- SuiviBudget CI — garde-fous additionnels de preuve financière et publication.
-- À exécuter après 20261115070000_enforce_primary_document_provenance.sql.
BEGIN;

-- Grant explicit PostgREST table privileges on child budget reference tables
-- that were omitted after 20260930030702_grant_schema_privileges.sql revoked
-- default privileges, while keeping RLS authoritative and DELETE disabled.
REVOKE ALL ON TABLE public.budget_sources, public.budget_revenue_sources FROM anon, authenticated;
GRANT SELECT ON TABLE public.budget_sources, public.budget_revenue_sources TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.budget_sources, public.budget_revenue_sources TO authenticated;

-- Harden primary document evidence trigger function:
-- 1. SECURITY DEFINER with empty search_path and revoked direct EXECUTE so row
--    triggers evaluate catalogue evidence consistently under authenticated/anon roles.
-- 2. Reject silent modifications of certified financial amounts without re-review.
-- 3. Bind institution_id and fiscal_year to the catalogue document when present.
CREATE OR REPLACE FUNCTION private.enforce_primary_document_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  row_data jsonb := to_jsonb(NEW);
  old_data jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
  source_id text;
  source_url_value text;
  source_page_value integer;
  evidence_status text;
  old_evidence_status text;
  inst_id text;
  fy_value integer;
  metadata jsonb;
  metadata_doc_id text;
  metadata_url text;
  metadata_page integer;
BEGIN
  source_id := row_data ->> 'source_document_id';
  source_url_value := COALESCE(row_data ->> 'source_url', row_data ->> 'document_url');
  source_page_value := NULLIF(row_data ->> 'source_page', '')::integer;
  inst_id := NULLIF(row_data ->> 'institution_id', '');
  fy_value := NULLIF(row_data ->> 'fiscal_year', '')::integer;

  IF TG_TABLE_NAME = 'budget_projects' THEN
    IF row_data ->> 'data_provenance' = 'OFFICIAL_SOURCE'
      OR row_data ->> 'financial_verification_status' IN ('OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED') THEN
      evidence_status := 'PRIMARY';
    ELSE
      evidence_status := NULL;
    END IF;
    IF TG_OP = 'UPDATE' AND (
      old_data ->> 'data_provenance' = 'OFFICIAL_SOURCE'
      OR old_data ->> 'financial_verification_status' IN ('OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED')
    ) THEN
      old_evidence_status := 'PRIMARY';
    ELSE
      old_evidence_status := NULL;
    END IF;
  ELSE
    evidence_status := row_data ->> 'verification_status';
    old_evidence_status := CASE WHEN TG_OP = 'UPDATE' THEN old_data ->> 'verification_status' ELSE NULL END;
  END IF;

  IF TG_OP = 'UPDATE'
    AND old_evidence_status IN ('PRIMARY','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED','Vérifié DGMP')
    AND evidence_status IN ('PRIMARY','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED','Vérifié DGMP') THEN
    IF (TG_TABLE_NAME = 'local_budgets' AND (
          row_data -> 'total_amount' IS DISTINCT FROM old_data -> 'total_amount'
          OR row_data -> 'operating_amount' IS DISTINCT FROM old_data -> 'operating_amount'
          OR row_data -> 'investment_amount' IS DISTINCT FROM old_data -> 'investment_amount'
        ))
      OR (TG_TABLE_NAME = 'administrative_accounts' AND (
          row_data -> 'operating_planned' IS DISTINCT FROM old_data -> 'operating_planned'
          OR row_data -> 'operating_realized' IS DISTINCT FROM old_data -> 'operating_realized'
          OR row_data -> 'operating_revenue_realized' IS DISTINCT FROM old_data -> 'operating_revenue_realized'
          OR row_data -> 'investment_planned' IS DISTINCT FROM old_data -> 'investment_planned'
          OR row_data -> 'investment_realized' IS DISTINCT FROM old_data -> 'investment_realized'
          OR row_data -> 'investment_revenue_realized' IS DISTINCT FROM old_data -> 'investment_revenue_realized'
          OR row_data -> 'total_planned' IS DISTINCT FROM old_data -> 'total_planned'
          OR row_data -> 'total_realized' IS DISTINCT FROM old_data -> 'total_realized'
        ))
      OR (TG_TABLE_NAME = 'ca_procurement_matches' AND (
          row_data -> 'award_amount' IS DISTINCT FROM old_data -> 'award_amount'
        ))
      OR (TG_TABLE_NAME = 'budget_projects' AND (
          row_data -> 'budget_amount_fcfa' IS DISTINCT FROM old_data -> 'budget_amount_fcfa'
        )) THEN
      RAISE EXCEPTION 'Changing a certified financial amount requires resetting verification status for a new review';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'budget_projects' THEN
    metadata := COALESCE(row_data -> 'project_metadata', '{}'::jsonb);

    IF metadata ->> 'citizen_need_verification_status' = 'VERIFIED' THEN
      metadata_doc_id := NULLIF(metadata ->> 'citizen_need_source_document_id', '');
      metadata_url := NULLIF(metadata ->> 'citizen_need_source_url', '');
      metadata_page := CASE
        WHEN COALESCE(metadata ->> 'citizen_need_source_page', '') ~ '^[1-9][0-9]{0,5}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa, project_metadata
  ON public.budget_projects FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

-- Legacy Passport metadata is downgraded when its claimed need/audit evidence
-- cannot be tied to a published, verified catalogue PDF and an existing page.
UPDATE public.budget_projects bp
SET project_metadata = jsonb_set(
  COALESCE(bp.project_metadata, '{}'::jsonb),
  '{citizen_need_verification_status}',
  '"TO_VERIFY"'::jsonb,
  true
)
WHERE bp.project_metadata ->> 'citizen_need_verification_status' = 'VERIFIED'
  AND NOT EXISTS (
    SELECT 1
    FROM public.public_documents pd
    WHERE pd.id = NULLIF(bp.project_metadata ->> 'citizen_need_source_document_id', '')
      AND pd.status = 'PUBLISHED'
      AND pd.verification_status = 'VERIFIED'
      AND pd.checksum_status IN ('COMPUTED','VERIFIED')
      AND pd.checksum_sha256 ~ '^[a-f0-9]{64}-- labelled as verified against a primary source.
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'citizen_need_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified citizen need requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;

    IF metadata ->> 'audit_verification_status' = 'VERIFIED' THEN
      metadata_doc_id := NULLIF(metadata ->> 'audit_source_document_id', '');
      metadata_url := NULLIF(metadata ->> 'audit_source_url', '');
      metadata_page := CASE
        WHEN COALESCE(metadata ->> 'audit_source_page', '') ~ '^[1-9][0-9]{0,5}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'audit_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified audit requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;
  END IF;

  IF evidence_status IN ('PRIMARY','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED','Vérifié DGMP') THEN
    IF source_id IS NULL OR source_url_value IS NULL
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

      AND pd.page_count IS NOT NULL
      AND CASE
        WHEN COALESCE(bp.project_metadata ->> 'citizen_need_source_page', '') ~ '^[1-9][0-9]{0,5}-- labelled as verified against a primary source.
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'citizen_need_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified citizen need requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;

    IF metadata ->> 'audit_verification_status' = 'VERIFIED' THEN
      metadata_doc_id := NULLIF(metadata ->> 'audit_source_document_id', '');
      metadata_url := NULLIF(metadata ->> 'audit_source_url', '');
      metadata_page := CASE
        WHEN COALESCE(metadata ->> 'audit_source_page', '') ~ '^[1-9][0-9]{0,5}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'audit_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified audit requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;
  END IF;

  IF evidence_status IN ('PRIMARY','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED','Vérifié DGMP') THEN
    IF source_id IS NULL OR source_url_value IS NULL
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (bp.project_metadata ->> 'citizen_need_source_page')::integer
        ELSE NULL
      END <= pd.page_count
      AND pd.source_url = bp.project_metadata ->> 'citizen_need_source_url'
      AND (bp.institution_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = bp.institution_id)
      AND (bp.fiscal_year IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = bp.fiscal_year)
  );

UPDATE public.budget_projects bp
SET project_metadata = jsonb_set(
  COALESCE(bp.project_metadata, '{}'::jsonb),
  '{audit_verification_status}',
  '"TO_VERIFY"'::jsonb,
  true
)
WHERE bp.project_metadata ->> 'audit_verification_status' = 'VERIFIED'
  AND NOT EXISTS (
    SELECT 1
    FROM public.public_documents pd
    WHERE pd.id = NULLIF(bp.project_metadata ->> 'audit_source_document_id', '')
      AND pd.status = 'PUBLISHED'
      AND pd.verification_status = 'VERIFIED'
      AND pd.checksum_status IN ('COMPUTED','VERIFIED')
      AND pd.checksum_sha256 ~ '^[a-f0-9]{64}-- labelled as verified against a primary source.
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'citizen_need_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified citizen need requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;

    IF metadata ->> 'audit_verification_status' = 'VERIFIED' THEN
      metadata_doc_id := NULLIF(metadata ->> 'audit_source_document_id', '');
      metadata_url := NULLIF(metadata ->> 'audit_source_url', '');
      metadata_page := CASE
        WHEN COALESCE(metadata ->> 'audit_source_page', '') ~ '^[1-9][0-9]{0,5}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'audit_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified audit requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;
  END IF;

  IF evidence_status IN ('PRIMARY','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED','Vérifié DGMP') THEN
    IF source_id IS NULL OR source_url_value IS NULL
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

      AND pd.page_count IS NOT NULL
      AND CASE
        WHEN COALESCE(bp.project_metadata ->> 'audit_source_page', '') ~ '^[1-9][0-9]{0,5}-- labelled as verified against a primary source.
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'citizen_need_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified citizen need requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;

    IF metadata ->> 'audit_verification_status' = 'VERIFIED' THEN
      metadata_doc_id := NULLIF(metadata ->> 'audit_source_document_id', '');
      metadata_url := NULLIF(metadata ->> 'audit_source_url', '');
      metadata_page := CASE
        WHEN COALESCE(metadata ->> 'audit_source_page', '') ~ '^[1-9][0-9]{0,5}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'audit_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified audit requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;
  END IF;

  IF evidence_status IN ('PRIMARY','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED','Vérifié DGMP') THEN
    IF source_id IS NULL OR source_url_value IS NULL
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (bp.project_metadata ->> 'audit_source_page')::integer
        ELSE NULL
      END <= pd.page_count
      AND pd.source_url = bp.project_metadata ->> 'audit_source_url'
      AND (bp.institution_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = bp.institution_id)
      AND (bp.fiscal_year IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = bp.fiscal_year)
  );

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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'citizen_need_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified citizen need requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;

    IF metadata ->> 'audit_verification_status' = 'VERIFIED' THEN
      metadata_doc_id := NULLIF(metadata ->> 'audit_source_document_id', '');
      metadata_url := NULLIF(metadata ->> 'audit_source_url', '');
      metadata_page := CASE
        WHEN COALESCE(metadata ->> 'audit_source_page', '') ~ '^[1-9][0-9]{0,5}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

        THEN (metadata ->> 'audit_source_page')::integer
        ELSE NULL
      END;
      IF metadata_doc_id IS NULL OR metadata_url IS NULL
        OR metadata_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
        OR metadata_page IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.public_documents pd
          WHERE pd.id = metadata_doc_id
            AND pd.status = 'PUBLISHED'
            AND pd.verification_status = 'VERIFIED'
            AND pd.checksum_status IN ('COMPUTED','VERIFIED')
            AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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

            AND pd.page_count IS NOT NULL
            AND metadata_page <= pd.page_count
            AND pd.source_url = metadata_url
            AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        ) THEN
        RAISE EXCEPTION 'Verified audit requires a published, checksum-verified primary document and an existing page';
      END IF;
    END IF;
  END IF;

  IF evidence_status IN ('PRIMARY','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED','Vérifié DGMP') THEN
    IF source_id IS NULL OR source_url_value IS NULL
      OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
      RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
    END IF;
    IF source_page_value IS NULL OR source_page_value <= 0 THEN
      RAISE EXCEPTION 'Primary certification requires the exact source page';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.public_documents pd
      WHERE pd.id = source_id
        AND pd.status = 'PUBLISHED'
        AND pd.verification_status = 'VERIFIED'
        AND pd.checksum_status IN ('COMPUTED','VERIFIED')
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
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

        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND pd.source_url = source_url_value
        AND (
          TG_TABLE_NAME NOT IN ('local_budgets','administrative_accounts','budget_projects')
          OR (
            (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
            AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence()
  FROM public, anon, authenticated, service_role;

-- Recreate evidence triggers so page-only or amount-only changes cannot bypass validation.
DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW
  EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id,
    source_page, source_url, institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
SECURITY DEFINER
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
    OR parent_budget.document_url IS NULL
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
    AND d.institution_id = parent_budget.institution_id
    AND d.fiscal_year = parent_budget.fiscal_year
    AND d.page_count IS NOT NULL
    AND NEW.source_page <= d.page_count
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
-- Declared SECURITY DEFINER so cross-table dependency checks never fail with
-- 42501 or miss rows under authenticated/anon RLS policies, and triggered on
-- every BEFORE UPDATE (without column restriction) so indirect status downgrades
-- performed by earlier BEFORE triggers (e.g. admin_document_integrity on
-- page_count / is_scanned / has_text_layer / ocr_status) cannot bypass this guard.
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
      (OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED')
      OR (OLD.status = 'VERIFIED' AND NEW.status NOT IN ('VERIFIED', 'PUBLISHED'))
      OR NEW.verification_status <> 'VERIFIED'
      OR NEW.checksum_status NOT IN ('COMPUTED', 'VERIFIED')
      OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
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
