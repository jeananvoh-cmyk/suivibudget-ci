-- SuiviBudget CI — preuve documentaire primaire et sécurisation RLS
-- Migration additive, sans modification des montants financiers.
BEGIN;

-- Les valeurs par défaut ne doivent jamais attribuer une qualification officielle.
ALTER TABLE public.local_budgets
  ALTER COLUMN verification_status SET DEFAULT 'DOCUMENT_TO_EXTRACT';
ALTER TABLE public.budget_revenue_sources
  ALTER COLUMN verification_status SET DEFAULT 'DOCUMENT_TO_EXTRACT';
ALTER TABLE public.administrative_accounts
  ALTER COLUMN verification_status SET DEFAULT 'TO_VERIFY';
ALTER TABLE public.ca_procurement_matches
  ALTER COLUMN verification_status SET DEFAULT 'TO_VERIFY';
ALTER TABLE public.public_documents
  ADD COLUMN IF NOT EXISTS checksum_status text NOT NULL DEFAULT 'DECLARED';

ALTER TABLE public.budget_projects
  ADD COLUMN IF NOT EXISTS source_document_id text REFERENCES public.public_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_page integer,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS data_provenance text NOT NULL DEFAULT 'DECLARED_ADMIN',
  ADD COLUMN IF NOT EXISTS financial_verification_status text NOT NULL DEFAULT 'TO_VERIFY';

ALTER TABLE public.budget_lines
  ADD COLUMN IF NOT EXISTS source_document_id text REFERENCES public.public_documents(id),
  ADD COLUMN IF NOT EXISTS source_page integer;

ALTER TABLE public.budget_projects
  ALTER COLUMN data_provenance SET DEFAULT 'DECLARED_ADMIN';

-- Les tables BP et DGMP doivent conserver l'identité documentaire et la page exacte.
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

CREATE INDEX IF NOT EXISTS idx_local_budgets_source_document_id
  ON public.local_budgets(source_document_id);
CREATE INDEX IF NOT EXISTS idx_ca_procurement_matches_source_document_id
  ON public.ca_procurement_matches(source_document_id);
CREATE INDEX IF NOT EXISTS idx_budget_projects_source_document_id
  ON public.budget_projects(source_document_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_source_document_id
  ON public.budget_lines(source_document_id);

-- Les statuts AIP restent secondaires ; les certifications sans pièce primaire
-- publiée, vérifiée et hachée sont rétrogradées sans toucher aux montants.
UPDATE public.local_budgets
  SET verification_status = 'SECONDARY_TO_CORROBORATE'
  WHERE verification_status = 'AIP_VERIFIED';

UPDATE public.local_budgets AS lb
  SET verification_status = 'DOCUMENT_TO_EXTRACT'
  WHERE lb.verification_status IN ('OFFICIAL_DOCUMENT', 'OFFICIAL_INSTITUTION')
    AND (
      lb.source_document_id IS NULL OR lb.source_page IS NULL OR lb.document_url IS NULL
      OR lb.document_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents d
        WHERE d.id = lb.source_document_id
          AND d.status = 'PUBLISHED'
          AND d.verification_status = 'VERIFIED'
          AND d.checksum_status IN ('COMPUTED', 'VERIFIED')
          AND d.checksum_sha256 IS NOT NULL
          AND d.source_url = lb.document_url
      )
    );

UPDATE public.budget_revenue_sources
  SET verification_status = 'SECONDARY_TO_CORROBORATE'
  WHERE verification_status = 'AIP_VERIFIED';

UPDATE public.administrative_accounts AS aa
  SET verification_status = 'TO_VERIFY'
  WHERE aa.verification_status IN ('OFFICIAL_DOCUMENT', 'VERIFIED')
    AND (
      aa.source_document_id IS NULL OR aa.source_page IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents d
        WHERE d.id = aa.source_document_id
          AND d.status = 'PUBLISHED'
          AND d.verification_status = 'VERIFIED'
          AND d.checksum_status IN ('COMPUTED', 'VERIFIED')
          AND d.checksum_sha256 ~ '^[a-f0-9]{64}$'
          AND (
            (
              NOT (aa.source_document_id IS NULL OR aa.source_page IS NULL OR aa.source_url IS NULL)
              AND aa.source_url ~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
              AND d.source_url = aa.source_url
            )
            OR (
              COALESCE(d.storage_bucket, 'public_documents') = 'public_documents'
              AND NULLIF(btrim(d.storage_path), '') IS NOT NULL
              AND (NULLIF(btrim(aa.source_url), '') IS NULL OR NULLIF(btrim(d.source_url), '') IS NULL OR d.source_url = aa.source_url)
            )
          )
      )
    );

UPDATE public.ca_procurement_matches AS cm
  SET verification_status = 'TO_VERIFY'
  WHERE cm.verification_status IN ('Vérifié DGMP', 'VERIFIED', 'OFFICIAL_DOCUMENT')
    AND (
      cm.source_document_id IS NULL OR cm.source_page IS NULL OR cm.source_url IS NULL
      OR cm.source_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents d
        WHERE d.id = cm.source_document_id
          AND d.status = 'PUBLISHED'
          AND d.verification_status = 'VERIFIED'
          AND d.checksum_status IN ('COMPUTED', 'VERIFIED')
          AND d.checksum_sha256 IS NOT NULL
          AND d.source_url = cm.source_url
      )
    );

ALTER TABLE public.budget_projects DISABLE TRIGGER USER;

UPDATE public.budget_projects AS bp
  SET data_provenance = 'DECLARED_ADMIN',
      financial_verification_status = 'TO_VERIFY'
  WHERE (
      bp.data_provenance = 'OFFICIAL_SOURCE'
      OR bp.financial_verification_status IN ('VERIFIED','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE')
    )
    AND (
      bp.source_document_id IS NULL OR bp.source_page IS NULL OR bp.source_url IS NULL
      OR bp.source_url !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents d
        WHERE d.id = bp.source_document_id
          AND d.status = 'PUBLISHED'
          AND d.verification_status = 'VERIFIED'
          AND d.checksum_status IN ('COMPUTED', 'VERIFIED')
          AND d.checksum_sha256 IS NOT NULL
          AND d.source_url = bp.source_url
      )
    );

ALTER TABLE public.budget_projects ENABLE TRIGGER USER;

-- Le validateur SQL accepte les nouveaux champs de traçabilité et refuse
-- toute qualification primaire sans document publié, vérifié et page exacte.
CREATE OR REPLACE FUNCTION private.validate_import_row(r jsonb)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  kind text := r ->> 'kind';
  d jsonb := r -> 'data';
  s jsonb := r -> 'source';
  k text;
  v jsonb;
  money text[];
  allowed text[];
  identity_parts jsonb;
  inst public.institutions%rowtype;
BEGIN
  IF jsonb_typeof(r) IS DISTINCT FROM 'object'
    OR jsonb_typeof(d) IS DISTINCT FROM 'object'
    OR jsonb_typeof(s) IS DISTINCT FROM 'object'
    OR jsonb_typeof(r -> 'precision') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Row, data, source and precision must be objects';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(r) x
    WHERE x NOT IN ('kind','institution_id','institution_type','fiscal_year','source','data','precision')
  ) THEN RAISE EXCEPTION 'Unknown envelope field'; END IF;

  SELECT * INTO inst FROM public.institutions WHERE id = r ->> 'institution_id';
  IF NOT FOUND
    OR r ->> 'institution_type' IS DISTINCT FROM (
      CASE inst.type WHEN 'MAIRIE' THEN 'COMMUNE' WHEN 'REGION' THEN 'REGIONAL_COUNCIL' END
    )
    OR r ->> 'institution_type' NOT IN ('COMMUNE','REGIONAL_COUNCIL') THEN
    RAISE EXCEPTION 'Institution/type mismatch';
  END IF;
  IF COALESCE(r ->> 'fiscal_year','') !~ '^[0-9]{4}$'
    OR (r ->> 'fiscal_year')::int NOT BETWEEN 2000 AND 2100 THEN
    RAISE EXCEPTION 'Fiscal year required';
  END IF;
  IF jsonb_typeof(s -> 'name') IS DISTINCT FROM 'string'
    OR jsonb_typeof(s -> 'reference') IS DISTINCT FROM 'string'
    OR COALESCE(btrim(s ->> 'name'),'') = ''
    OR COALESCE(btrim(s ->> 'reference'),'') = ''
    OR COALESCE(s ->> 'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    OR COALESCE(s ->> 'date_kind','') NOT IN ('PUBLISHED','ACCESSED','RECORDED') THEN
    RAISE EXCEPTION 'Source name/reference/date/date_kind required';
  END IF;
  PERFORM (s ->> 'date')::date;
  IF s ? 'url' AND COALESCE(s ->> 'url','') !~ '^https?://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'Invalid source URL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(s) x
    WHERE x NOT IN ('name','reference','date','date_kind','url')
  ) THEN RAISE EXCEPTION 'Unknown source field'; END IF;

  CASE kind
    WHEN 'BP' THEN
      money := ARRAY['total_amount','operating_amount','investment_amount'];
      allowed := money || ARRAY['budget_type','source_page','source_document_id','version_number','adoption_date','tutelle_approval_date','notes','verification_status','confidence_level'];
      IF COALESCE(d ->> 'budget_type','') NOT IN ('PRIMITIF_ADOPTE','PRIMITIF_APRES_TUTELLE','AUTORISATION_EXECUTION','MODIFICATIF_1','MODIFICATIF_2','AUTRE_MODIFICATIF')
        OR COALESCE(d ->> 'version_number','') !~ '^[1-9][0-9]{0,3}$' THEN
        RAISE EXCEPTION 'BP type/version required';
      END IF;
      identity_parts := jsonb_build_array(kind,inst.id,r ->> 'fiscal_year',d ->> 'budget_type',d ->> 'version_number');
    WHEN 'CA' THEN
      money := ARRAY['operating_planned','operating_realized','operating_revenue_realized','investment_planned','investment_realized','investment_revenue_realized','total_planned','total_realized','surplus_or_deficit','operating_revenue_planned','operating_revenue_emitted','operating_revenue_collected','operating_expenditure_planned','operating_expenditure_engaged','investment_revenue_planned','investment_revenue_emitted','investment_revenue_collected','investment_expenditure_planned','investment_expenditure_engaged','total_revenue_collected','total_expenditure_engaged','arithmetic_difference'];
      allowed := money || ARRAY['source_page','source_document_id','approval_date','prefecture_visa_date','notes','verification_status'];
      identity_parts := jsonb_build_array(kind,inst.id,r ->> 'fiscal_year');
    WHEN 'OPERATION' THEN
      money := ARRAY['planned_amount','executed_amount'];
      allowed := money || ARRAY['ca_id','operation_reference','title','sector','location','source_page','notes'];
      IF COALESCE(btrim(d ->> 'ca_id'),'') = '' OR COALESCE(btrim(d ->> 'operation_reference'),'') = '' THEN
        RAISE EXCEPTION 'CA id and operation reference required';
      END IF;
      identity_parts := jsonb_build_array(kind,inst.id,r ->> 'fiscal_year',d ->> 'ca_id',d ->> 'operation_reference');
    WHEN 'DGMP' THEN
      money := ARRAY['award_amount'];
      allowed := money || ARRAY['source_page','source_document_id','operation_id','tender_number','contract_number','procurement_object','contractor','award_date','lot','match_level','match_evidence','notes'];
      IF COALESCE(btrim(d ->> 'tender_number'),'') = '' THEN RAISE EXCEPTION 'Tender number required'; END IF;
      IF COALESCE(d ->> 'match_level','') NOT IN ('STRONG','PARTIAL','NONE','TO_VERIFY') THEN RAISE EXCEPTION 'Explicit matching status required'; END IF;
      identity_parts := jsonb_build_array(kind,inst.id,r ->> 'fiscal_year',d ->> 'tender_number',COALESCE(d ->> 'lot',''));
    ELSE
      RAISE EXCEPTION 'Unknown import kind';
  END CASE;

  FOR k,v IN SELECT * FROM jsonb_each(d) LOOP
    IF NOT k = ANY(allowed) THEN RAISE EXCEPTION 'Unsupported data field: %',k; END IF;
    IF k = ANY(money) THEN
      IF COALESCE(r -> 'precision' ->> k,'') NOT IN ('EXACT','APPROXIMATE','LOWER_BOUND','UNKNOWN') THEN RAISE EXCEPTION 'Amount precision required: %',k; END IF;
      IF r -> 'precision' ->> k = 'UNKNOWN' THEN
        IF v <> 'null'::jsonb THEN RAISE EXCEPTION 'UNKNOWN amount must be null'; END IF;
      ELSIF jsonb_typeof(v) IS DISTINCT FROM 'number'
        OR v::text !~ '^-?[0-9]+$'
        OR abs(v::text::numeric) > 9007199254740991
        OR (v::text::numeric < 0 AND k NOT IN ('surplus_or_deficit','arithmetic_difference')) THEN
        RAISE EXCEPTION 'Invalid FCFA integer: %',k;
      END IF;
    ELSIF k = 'source_page' THEN
      IF v::text !~ '^[1-9][0-9]*$' THEN RAISE EXCEPTION 'Positive source page required'; END IF;
    ELSIF k <> 'version_number' AND jsonb_typeof(v) NOT IN ('string','null') THEN
      RAISE EXCEPTION 'Invalid text field: %',k;
    END IF;
    IF k LIKE '%date' AND v <> 'null'::jsonb THEN PERFORM (d ->> k)::date; END IF;
  END LOOP;

  IF d ? 'source_document_id' AND NOT EXISTS (
    SELECT 1 FROM public.public_documents pd WHERE pd.id = d ->> 'source_document_id'
  ) THEN RAISE EXCEPTION 'Unknown source document id'; END IF;

  IF d ->> 'verification_status' IN ('OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION') THEN
    IF COALESCE(d ->> 'source_document_id','') = ''
      OR COALESCE(d ->> 'source_page','') !~ '^[1-9][0-9]*$'
      OR COALESCE(s ->> 'url','') !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
      OR NOT EXISTS (
        SELECT 1 FROM public.public_documents pd
        WHERE pd.id = d ->> 'source_document_id'
          AND pd.status = 'PUBLISHED'
          AND pd.verification_status = 'VERIFIED'
          AND pd.checksum_status IN ('COMPUTED','VERIFIED')
          AND pd.checksum_sha256 IS NOT NULL
          AND pd.source_url = s ->> 'url'
      ) THEN
      RAISE EXCEPTION 'Primary document requires a published, checksum-verified catalogue record, official URL and exact page';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(r -> 'precision') x
    WHERE NOT x = ANY(money) OR NOT d ? x
  ) THEN RAISE EXCEPTION 'Precision without matching amount'; END IF;

  RETURN 'import-' || encode(sha256(convert_to(identity_parts::text,'UTF8')),'hex');
END;
$$;
REVOKE ALL ON FUNCTION private.validate_import_row(jsonb) FROM public, anon, authenticated, service_role;

-- Garde-fou serveur pour les écritures directes et les imports publiés.
CREATE OR REPLACE FUNCTION private.enforce_primary_document_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
  ELSE
    evidence_status := row_data ->> 'verification_status';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'budget_projects' THEN
      IF old_data ->> 'data_provenance' = 'OFFICIAL_SOURCE'
        OR old_data ->> 'financial_verification_status' IN ('OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED') THEN
        old_evidence_status := 'PRIMARY';
      END IF;
    ELSE
      old_evidence_status := old_data ->> 'verification_status';
    END IF;
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

  IF evidence_status IN ('PRIMARY','OFFICIAL_DOCUMENT','OFFICIAL_INSTITUTION','OFFICIAL_SOURCE','VERIFIED','Vérifié DGMP') THEN
    IF source_id IS NULL THEN
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
        AND pd.checksum_sha256 ~ '^[a-f0-9]{64}$'
        AND pd.page_count IS NOT NULL
        AND source_page_value <= pd.page_count
        AND (inst_id IS NULL OR pd.institution_id IS NULL OR pd.institution_id = inst_id)
        AND (fy_value IS NULL OR pd.fiscal_year IS NULL OR pd.fiscal_year = fy_value)
        AND (
          (
            source_url_value IS NOT NULL
            AND source_url_value ~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)'
            AND pd.source_url = source_url_value
          )
          OR (
            COALESCE(pd.storage_bucket, 'public_documents') = 'public_documents'
            AND NULLIF(btrim(pd.storage_path), '') IS NOT NULL
            AND (NULLIF(btrim(source_url_value), '') IS NULL OR NULLIF(btrim(pd.source_url), '') IS NULL OR pd.source_url = source_url_value)
          )
        )
    ) THEN
      IF source_url_value IS NULL
        OR source_url_value !~* '^https://([a-z0-9-]+[.])*(dgbf[.]ci|marchespublics[.]ci|courdescomptes[.]ci|gouv[.]ci)(/|$)' THEN
        RAISE EXCEPTION 'Primary certification requires a catalogue document ID and institutional HTTPS URL';
      END IF;
      RAISE EXCEPTION 'Primary certification requires a published, verified catalogue document with SHA-256';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_local_budget_primary_evidence ON public.local_budgets;
CREATE TRIGGER enforce_local_budget_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, document_url,
    institution_id, fiscal_year, total_amount, operating_amount, investment_amount
  ON public.local_budgets FOR EACH ROW EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_administrative_account_primary_evidence ON public.administrative_accounts;
CREATE TRIGGER enforce_administrative_account_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url,
    status, institution_id, fiscal_year, operating_planned, operating_realized,
    operating_revenue_realized, investment_planned, investment_realized,
    investment_revenue_realized, total_planned, total_realized
  ON public.administrative_accounts FOR EACH ROW EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_procurement_primary_evidence ON public.ca_procurement_matches;
CREATE TRIGGER enforce_procurement_primary_evidence
  BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url, award_amount
  ON public.ca_procurement_matches FOR EACH ROW EXECUTE FUNCTION private.enforce_primary_document_evidence();

DROP TRIGGER IF EXISTS enforce_budget_project_primary_evidence ON public.budget_projects;
CREATE TRIGGER enforce_budget_project_primary_evidence
  BEFORE INSERT OR UPDATE OF financial_verification_status, data_provenance, source_document_id, source_page, source_url,
    institution_id, fiscal_year, budget_amount_fcfa
  ON public.budget_projects FOR EACH ROW EXECUTE FUNCTION private.enforce_primary_document_evidence();

REVOKE ALL ON FUNCTION private.enforce_primary_document_evidence() FROM public, anon, authenticated, service_role;

-- Les autorisations de gestion reposent sur le rôle actif côté serveur.
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
DROP POLICY IF EXISTS "admin_entity_staff" ON public.budget_lines;
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
  USING (private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));

DROP POLICY IF EXISTS "Allow admin write access on projects" ON public.projects;
CREATE POLICY "Allow admin write access on projects"
  ON public.projects FOR ALL TO authenticated
  USING (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

-- Preserve the deployed citizen submission, moderation and deletion policies.
-- Only remove the legacy all-operations policy if it exists; do not grant
-- moderators additional INSERT or DELETE permissions.
DROP POLICY IF EXISTS "Allow moderators full management on citizen proofs" ON public.citizen_proofs;

-- Preserve the verified newsletter, document and Storage policies by name and predicate.

COMMIT;
