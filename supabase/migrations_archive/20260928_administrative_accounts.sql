-- =========================================================================
-- SUIVIBUDGET CI - MIGRATION : COMPTES ADMINISTRATIFS (CA) & EXÉCUTION
-- Migration Additive : Reddition des comptes, Marchés DGMP, Chaîne de Preuve
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLE: administrative_accounts (Comptes Administratifs Annuels)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.administrative_accounts (
    id TEXT PRIMARY KEY DEFAULT ('ca-' || uuid_generate_v4()::text),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    institution_type TEXT NOT NULL CHECK (institution_type IN ('COMMUNE', 'REGIONAL_COUNCIL', 'AUTONOMOUS_DISTRICT')),
    institution_name TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL CHECK (fiscal_year >= 2000 AND fiscal_year <= 2100),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VERIFIED', 'PUBLISHED')),
    
    -- Fonctionnement
    operating_planned BIGINT NOT NULL DEFAULT 0 CHECK (operating_planned >= 0),
    operating_realized BIGINT NOT NULL DEFAULT 0 CHECK (operating_realized >= 0),
    operating_revenue_realized BIGINT DEFAULT 0 CHECK (operating_revenue_realized >= 0),
    
    -- Investissement
    investment_planned BIGINT NOT NULL DEFAULT 0 CHECK (investment_planned >= 0),
    investment_realized BIGINT NOT NULL DEFAULT 0 CHECK (investment_realized >= 0),
    investment_revenue_realized BIGINT DEFAULT 0 CHECK (investment_revenue_realized >= 0),
    
    -- Consolidé
    total_planned BIGINT NOT NULL CHECK (total_planned >= 0),
    total_realized BIGINT NOT NULL CHECK (total_realized >= 0),
    surplus_or_deficit BIGINT DEFAULT 0,
    
    -- Traçabilité & Sources
    source_document TEXT NOT NULL,
    source_url TEXT,
    source_page INTEGER,
    approval_date DATE,
    prefecture_visa_date DATE,
    verification_status TEXT NOT NULL DEFAULT 'OFFICIAL_DOCUMENT',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (institution_id, fiscal_year)
);

CREATE INDEX IF NOT EXISTS idx_ca_inst_year ON public.administrative_accounts(institution_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ca_status ON public.administrative_accounts(status);

ALTER TABLE public.administrative_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on published CA"
    ON public.administrative_accounts FOR SELECT
    USING (status = 'PUBLISHED' OR status = 'VERIFIED');

CREATE POLICY "Allow admin full access on CA"
    ON public.administrative_accounts FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );

-- =========================================================================
-- 2. TABLE: ca_investment_operations (Opérations d'Investissement du CA)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ca_investment_operations (
    id TEXT PRIMARY KEY DEFAULT ('ca-op-' || uuid_generate_v4()::text),
    ca_id TEXT NOT NULL REFERENCES public.administrative_accounts(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    operation_reference TEXT,
    title TEXT NOT NULL,
    sector TEXT NOT NULL,
    location TEXT,
    planned_amount BIGINT NOT NULL CHECK (planned_amount >= 0),
    executed_amount BIGINT NOT NULL DEFAULT 0 CHECK (executed_amount >= 0),
    source_page INTEGER,
    source_reference TEXT,
    linked_project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    citizen_status TEXT CHECK (citizen_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_ops_ca_id ON public.ca_investment_operations(ca_id);
CREATE INDEX IF NOT EXISTS idx_ca_ops_inst_year ON public.ca_investment_operations(institution_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ca_ops_project ON public.ca_investment_operations(linked_project_id);

ALTER TABLE public.ca_investment_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on CA operations"
    ON public.ca_investment_operations FOR SELECT
    USING (true);

CREATE POLICY "Allow admin write on CA operations"
    ON public.ca_investment_operations FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );

-- =========================================================================
-- 3. TABLE: ca_procurement_matches (Marchés Publics DGMP Rapprochés)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ca_procurement_matches (
    id TEXT PRIMARY KEY DEFAULT ('ca-proc-' || uuid_generate_v4()::text),
    operation_id TEXT NOT NULL REFERENCES public.ca_investment_operations(id) ON DELETE CASCADE,
    tender_number TEXT,
    contract_number TEXT,
    procurement_object TEXT NOT NULL,
    contractor TEXT NOT NULL,
    award_amount BIGINT NOT NULL CHECK (award_amount >= 0),
    award_date DATE,
    lot TEXT,
    match_level TEXT NOT NULL DEFAULT 'TO_VERIFY' CHECK (match_level IN ('STRONG', 'PARTIAL', 'NONE', 'TO_VERIFY')),
    source TEXT NOT NULL DEFAULT 'DGMP',
    source_url TEXT,
    verification_status TEXT DEFAULT 'Vérifié DGMP',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_proc_operation ON public.ca_procurement_matches(operation_id);

ALTER TABLE public.ca_procurement_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on CA procurement matches"
    ON public.ca_procurement_matches FOR SELECT
    USING (true);

CREATE POLICY "Allow admin write on CA procurement matches"
    ON public.ca_procurement_matches FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );

-- =========================================================================
-- 4. TABLE: ca_institution_responses (Droits de Réponse & Précisions Mairie)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ca_institution_responses (
    id TEXT PRIMARY KEY DEFAULT ('ca-resp-' || uuid_generate_v4()::text),
    ca_id TEXT REFERENCES public.administrative_accounts(id) ON DELETE CASCADE,
    operation_id TEXT REFERENCES public.ca_investment_operations(id) ON DELETE SET NULL,
    response_text TEXT NOT NULL,
    response_date DATE NOT NULL DEFAULT CURRENT_DATE,
    author_name TEXT NOT NULL,
    author_title TEXT NOT NULL,
    supporting_document_url TEXT,
    supporting_document_name TEXT,
    response_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (response_status IN ('PENDING', 'VALIDATED', 'PUBLISHED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ca_institution_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on published institution responses"
    ON public.ca_institution_responses FOR SELECT
    USING (response_status = 'PUBLISHED');

CREATE POLICY "Allow admin and moderator full access on responses"
    ON public.ca_institution_responses FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER')
    );

-- =========================================================================
-- 5. TABLE: budget_glossary (Glossaire Citoyen des Finances Publiques)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.budget_glossary (
    id TEXT PRIMARY KEY,
    term TEXT NOT NULL,
    category TEXT NOT NULL,
    short_definition TEXT NOT NULL,
    citizen_explanation TEXT NOT NULL,
    warning TEXT,
    aliases TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.budget_glossary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on budget glossary"
    ON public.budget_glossary FOR SELECT
    USING (true);
