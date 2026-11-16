-- SuiviBudget CI — certification documentaire indépendante des étapes Besoin et Audit du Passeport.
-- Les références en project_metadata doivent pointer vers un PDF primaire réellement publié et vérifié.
BEGIN;

CREATE OR REPLACE FUNCTION private.enforce_project_passport_document_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  metadata jsonb := COALESCE(NEW.project_metadata, '{}'::jsonb);
  metadata_doc_id text;
  metadata_url text;
  metadata_page integer;
BEGIN
  IF metadata ->> 'citizen_need_verification_status' = 'VERIFIED' THEN
    metadata_doc_id := NULLIF(metadata ->> 'citizen_need_source_document_id', '');
    metadata_url := NULLIF(metadata ->> 'citizen_need_source_url', '');
    metadata_page := CASE
      WHEN COALESCE(metadata ->> 'citizen_need_source_page', '') ~ '^[1-9][0-9]{0,5}$'
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
          AND pd.checksum_sha256 ~ '^[a-f0-9]{64}$'
          AND pd.page_count IS NOT NULL
          AND metadata_page <= pd.page_count
          AND pd.source_url = metadata_url
          AND (NEW.institution_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = NEW.institution_id)
          AND (NEW.fiscal_year IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = NEW.fiscal_year)
      ) THEN
      RAISE EXCEPTION 'Verified citizen need requires a published, checksum-verified primary document and an existing page';
    END IF;
  END IF;

  IF metadata ->> 'audit_verification_status' = 'VERIFIED' THEN
    metadata_doc_id := NULLIF(metadata ->> 'audit_source_document_id', '');
    metadata_url := NULLIF(metadata ->> 'audit_source_url', '');
    metadata_page := CASE
      WHEN COALESCE(metadata ->> 'audit_source_page', '') ~ '^[1-9][0-9]{0,5}$'
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
          AND pd.checksum_sha256 ~ '^[a-f0-9]{64}$'
          AND pd.page_count IS NOT NULL
          AND metadata_page <= pd.page_count
          AND pd.source_url = metadata_url
          AND (NEW.institution_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = NEW.institution_id)
          AND (NEW.fiscal_year IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = NEW.fiscal_year)
      ) THEN
      RAISE EXCEPTION 'Verified audit requires a published, checksum-verified primary document and an existing page';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_project_passport_document_evidence()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_project_passport_document_evidence ON public.budget_projects;
CREATE TRIGGER enforce_project_passport_document_evidence
  BEFORE INSERT OR UPDATE OF project_metadata, institution_id, fiscal_year
  ON public.budget_projects FOR EACH ROW
  EXECUTE FUNCTION private.enforce_project_passport_document_evidence();

-- Fail closed for historical Passport claims that cannot be tied to an existing verified PDF page.
UPDATE public.budget_projects bp
SET project_metadata = jsonb_set(COALESCE(bp.project_metadata, '{}'::jsonb),
  '{citizen_need_verification_status}', '"TO_VERIFY"'::jsonb, true)
WHERE bp.project_metadata ->> 'citizen_need_verification_status' = 'VERIFIED'
  AND NOT EXISTS (
    SELECT 1 FROM public.public_documents pd
    WHERE pd.id = NULLIF(bp.project_metadata ->> 'citizen_need_source_document_id', '')
      AND pd.status = 'PUBLISHED'
      AND pd.verification_status = 'VERIFIED'
      AND pd.checksum_status IN ('COMPUTED','VERIFIED')
      AND pd.checksum_sha256 ~ '^[a-f0-9]{64}$'
      AND pd.page_count IS NOT NULL
      AND CASE WHEN COALESCE(bp.project_metadata ->> 'citizen_need_source_page', '') ~ '^[1-9][0-9]{0,5}$'
        THEN (bp.project_metadata ->> 'citizen_need_source_page')::integer ELSE NULL END <= pd.page_count
      AND pd.source_url = bp.project_metadata ->> 'citizen_need_source_url'
      AND (bp.institution_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = bp.institution_id)
      AND (bp.fiscal_year IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = bp.fiscal_year)
  );

UPDATE public.budget_projects bp
SET project_metadata = jsonb_set(COALESCE(bp.project_metadata, '{}'::jsonb),
  '{audit_verification_status}', '"TO_VERIFY"'::jsonb, true)
WHERE bp.project_metadata ->> 'audit_verification_status' = 'VERIFIED'
  AND NOT EXISTS (
    SELECT 1 FROM public.public_documents pd
    WHERE pd.id = NULLIF(bp.project_metadata ->> 'audit_source_document_id', '')
      AND pd.status = 'PUBLISHED'
      AND pd.verification_status = 'VERIFIED'
      AND pd.checksum_status IN ('COMPUTED','VERIFIED')
      AND pd.checksum_sha256 ~ '^[a-f0-9]{64}$'
      AND pd.page_count IS NOT NULL
      AND CASE WHEN COALESCE(bp.project_metadata ->> 'audit_source_page', '') ~ '^[1-9][0-9]{0,5}$'
        THEN (bp.project_metadata ->> 'audit_source_page')::integer ELSE NULL END <= pd.page_count
      AND pd.source_url = bp.project_metadata ->> 'audit_source_url'
      AND (bp.institution_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = bp.institution_id)
      AND (bp.fiscal_year IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = bp.fiscal_year)
  );

COMMIT;
