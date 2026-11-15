-- =========================================================================
-- SUIVIBUDGET CI - MIGRATION : RÉFÉRENTIEL HISTORIQUE DES BUDGETS LOCAUX
-- Migration Additive : Traçabilité, Multi-Exercices, Multi-Versions et Sources
-- Périmètre : 201 Communes, 31 Conseils Régionaux, 2 Districts Autonomes
-- =========================================================================

-- Activer l'extension UUID si besoin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLE: sources (Registre Centralisé des Sources Documentaires)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.sources (
    id TEXT PRIMARY KEY DEFAULT ('src-' || uuid_generate_v4()::text),
    source_type TEXT NOT NULL CHECK (source_type IN (
        'OFFICIAL_COLLECTIVITY_DOCUMENT',
        'OFFICIAL_COLLECTIVITY_WEBSITE',
        'DGDDL',
        'PREFECTURE_OR_TUTELLE',
        'AIP',
        'OTHER_PUBLIC_INSTITUTION',
        'PRESS',
        'SECONDARY_SOURCE'
    )),
    publisher TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    document_url TEXT,
    publication_date DATE,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    source_year INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_publisher ON public.sources(publisher);
CREATE INDEX IF NOT EXISTS idx_sources_type ON public.sources(source_type);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on sources"
    ON public.sources FOR SELECT
    USING (true);

CREATE POLICY "Allow admin write on sources"
    ON public.sources FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );

-- =========================================================================
-- 2. TABLE: local_budgets (Référentiel des Budgets des Collectivités)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.local_budgets (
    id TEXT PRIMARY KEY DEFAULT ('lbud-' || uuid_generate_v4()::text),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    institution_type TEXT NOT NULL CHECK (institution_type IN ('COMMUNE', 'REGIONAL_COUNCIL', 'AUTONOMOUS_DISTRICT')),
    institution_name TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL CHECK (fiscal_year >= 2000 AND fiscal_year <= 2100),
    budget_type TEXT NOT NULL CHECK (budget_type IN (
        'PRIMITIF_ADOPTE',
        'PRIMITIF_APRES_TUTELLE',
        'AUTORISATION_EXECUTION',
        'MODIFICATIF_1',
        'MODIFICATIF_2',
        'AUTRE_MODIFICATIF',
        'EXECUTION_TRIMESTRIELLE',
        'COMPTE_ADMINISTRATIF'
    )),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REVIEW', 'VERIFIED', 'PUBLISHED')),
    is_current_version BOOLEAN NOT NULL DEFAULT false,
    version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number >= 1),
    
    -- Montants financiers en FCFA
    total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
    operating_amount BIGINT NOT NULL DEFAULT 0 CHECK (operating_amount >= 0),
    investment_amount BIGINT NOT NULL DEFAULT 0 CHECK (investment_amount >= 0),
    amount_precision TEXT NOT NULL DEFAULT 'EXACT' CHECK (amount_precision IN ('EXACT', 'APPROXIMATE', 'LOWER_BOUND', 'UPPER_BOUND', 'UNKNOWN')),
    
    -- Dates formelles du cycle
    adoption_date DATE,
    tutelle_approval_date DATE,
    execution_authorization_date DATE,
    publication_date DATE,
    source_access_date DATE,
    
    -- Traçabilité et confiance
    verification_status TEXT NOT NULL DEFAULT 'AIP_VERIFIED' CHECK (verification_status IN (
        'OFFICIAL_DOCUMENT',
        'OFFICIAL_INSTITUTION',
        'AIP_VERIFIED',
        'SECONDARY_TO_CORROBORATE',
        'CALCULATED_TO_VERIFY',
        'SOURCE_ANOMALY',
        'DOCUMENT_TO_EXTRACT',
        'NOT_FOUND',
        'SOURCE_CONFLICT'
    )),
    confidence_level TEXT NOT NULL DEFAULT 'HIGH' CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW')),
    notes TEXT,
    session_notes TEXT,
    projects_count INTEGER DEFAULT 0 CHECK (projects_count >= 0),
    document_url TEXT,
    document_name TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexation optimisée
CREATE INDEX IF NOT EXISTS idx_local_budgets_inst_year ON public.local_budgets(institution_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_local_budgets_type ON public.local_budgets(institution_type);
CREATE INDEX IF NOT EXISTS idx_local_budgets_status ON public.local_budgets(status);
CREATE INDEX IF NOT EXISTS idx_local_budgets_current ON public.local_budgets(institution_id, fiscal_year, is_current_version);

ALTER TABLE public.local_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on published local budgets"
    ON public.local_budgets FOR SELECT
    USING (status = 'PUBLISHED' OR status = 'VERIFIED');

CREATE POLICY "Allow admin full access on local budgets"
    ON public.local_budgets FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );

-- =========================================================================
-- 3. TABLE: budget_sources (Pivot N:N Budget <-> Sources)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.budget_sources (
    id TEXT PRIMARY KEY DEFAULT ('bsrc-' || uuid_generate_v4()::text),
    budget_id TEXT NOT NULL REFERENCES public.local_budgets(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (role IN ('PRIMARY', 'CORROBORATION', 'CONTEXT', 'SUPERSEDED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (budget_id, source_id, role)
);

CREATE INDEX IF NOT EXISTS idx_budget_sources_budget ON public.budget_sources(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_sources_source ON public.budget_sources(source_id);

ALTER TABLE public.budget_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on budget sources"
    ON public.budget_sources FOR SELECT
    USING (true);

CREATE POLICY "Allow admin write on budget sources"
    ON public.budget_sources FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );

-- =========================================================================
-- 4. TABLE: budget_revenue_sources (Ventilation des Recettes de Financement)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.budget_revenue_sources (
    id TEXT PRIMARY KEY DEFAULT ('brev-' || uuid_generate_v4()::text),
    budget_id TEXT NOT NULL REFERENCES public.local_budgets(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('OWN_REVENUE', 'STATE_TRANSFER', 'STATE_GRANT', 'DGE', 'CARRY_FORWARD', 'OTHER')),
    label TEXT NOT NULL,
    original_label TEXT,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    percentage NUMERIC(5,2),
    source_reference TEXT,
    verification_status TEXT DEFAULT 'AIP_VERIFIED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_revenues_budget ON public.budget_revenue_sources(budget_id);

ALTER TABLE public.budget_revenue_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on budget revenue sources"
    ON public.budget_revenue_sources FOR SELECT
    USING (true);

CREATE POLICY "Allow admin write on budget revenue sources"
    ON public.budget_revenue_sources FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );

-- =========================================================================
-- 5. TABLE: budget_lines (Lignes de Dépenses Détaillées & Programmes)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.budget_lines (
    id TEXT PRIMARY KEY DEFAULT ('bline-' || uuid_generate_v4()::text),
    budget_id TEXT NOT NULL REFERENCES public.local_budgets(id) ON DELETE CASCADE,
    program_name TEXT,
    line_label TEXT NOT NULL,
    original_label TEXT,
    category TEXT CHECK (category IN ('FONCTIONNEMENT', 'INVESTISSEMENT')),
    amount BIGINT NOT NULL CHECK (amount >= 0),
    sector TEXT,
    normalized_sector TEXT,
    source_page INTEGER,
    source_reference TEXT,
    linked_project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON public.budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_project ON public.budget_lines(linked_project_id);

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on budget lines"
    ON public.budget_lines FOR SELECT
    USING (true);

CREATE POLICY "Allow admin write on budget lines"
    ON public.budget_lines FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );

-- =========================================================================
-- 6. TABLE: budget_revision_history (Traçabilité des Corrections)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.budget_revision_history (
    id TEXT PRIMARY KEY DEFAULT ('brevhist-' || uuid_generate_v4()::text),
    budget_id TEXT NOT NULL REFERENCES public.local_budgets(id) ON DELETE CASCADE,
    old_value JSONB,
    new_value JSONB,
    reason TEXT NOT NULL,
    source TEXT,
    changed_by TEXT NOT NULL DEFAULT 'SYSTEM',
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_revisions_budget ON public.budget_revision_history(budget_id);

ALTER TABLE public.budget_revision_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin read on budget revisions"
    ON public.budget_revision_history FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER', 'AUDITOR') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER', 'AUDITOR')
    );

CREATE POLICY "Allow admin insert on budget revisions"
    ON public.budget_revision_history FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );
