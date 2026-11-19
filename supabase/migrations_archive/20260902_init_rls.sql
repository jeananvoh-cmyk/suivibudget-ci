-- =========================================================================
-- SUIVIBUDGET CI / CIVICDATA CI - SUPABASE DATABASE SCHEMA & RLS SECURITY
-- Standard de Sécurité : Row Level Security (RLS) activé sur 100% des tables
-- Protection stricte : Séparation des rôles (PUBLIC, CITOYEN, MODERATEUR, ADMIN)
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLE: projects (Catalogue des Projets & Investissements Publics)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT ('proj-' || uuid_generate_v4()::text),
    title TEXT NOT NULL,
    details TEXT,
    commune_name TEXT NOT NULL,
    region_name TEXT,
    category TEXT NOT NULL DEFAULT 'INFRASTRUCTURE',
    nature_expense TEXT DEFAULT 'Investissements',
    sub_nature_expense TEXT,
    budget_amount_fcfa BIGINT NOT NULL CHECK (budget_amount_fcfa >= 0),
    fiscal_year INTEGER NOT NULL DEFAULT 2026,
    current_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (current_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    contractor_name TEXT DEFAULT 'Marché public / Appel d''offres',
    locality_village_neighborhood TEXT,
    scope_level TEXT DEFAULT 'LOCAL' CHECK (scope_level IN ('LOCAL', 'NATIONAL')),
    source TEXT DEFAULT 'Budget Primitif',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexation performante
CREATE INDEX IF NOT EXISTS idx_projects_commune ON public.projects(commune_name);
CREATE INDEX IF NOT EXISTS idx_projects_fiscal_year ON public.projects(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);

-- Activer RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
-- 1. Lecture publique pour la transparence citoyenne
CREATE POLICY "Allow public read access on projects" 
    ON public.projects FOR SELECT 
    USING (true);

-- 2. Écriture réservée aux administrateurs et gestionnaires de données
CREATE POLICY "Allow admin write access on projects" 
    ON public.projects FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );


-- =========================================================================
-- 2. TABLE: institutions (Annuaire des Collectivités & Ministères)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.institutions (
    id TEXT PRIMARY KEY DEFAULT ('inst-' || uuid_generate_v4()::text),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('MAIRIE', 'REGION', 'DISTRICT', 'MINISTERE', 'INSTITUTION_NATIONALE')),
    region TEXT,
    district TEXT,
    departement TEXT,
    leader_name TEXT,
    leader_title TEXT,
    total_budget_fcfa BIGINT DEFAULT 0,
    budget_functioning_fcfa BIGINT DEFAULT 0,
    budget_investment_fcfa BIGINT DEFAULT 0,
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    info_officer_name TEXT,
    info_officer_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institutions_type ON public.institutions(type);
CREATE INDEX IF NOT EXISTS idx_institutions_name ON public.institutions(name);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on institutions" 
    ON public.institutions FOR SELECT 
    USING (true);

CREATE POLICY "Allow admin write access on institutions" 
    ON public.institutions FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );


-- =========================================================================
-- 3. TABLE: citizen_proofs (Constats & Preuves Citoyennes Terrain)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.citizen_proofs (
    id TEXT PRIMARY KEY DEFAULT ('proof-' || uuid_generate_v4()::text),
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    project_title TEXT NOT NULL,
    commune_name TEXT NOT NULL,
    region_name TEXT,
    citizen_name TEXT DEFAULT 'Sentinelle Citoyenne',
    image_url TEXT NOT NULL,
    video_url TEXT,
    media_type TEXT DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO')),
    citizen_status_claim TEXT NOT NULL CHECK (citizen_status_claim IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED')),
    comment TEXT NOT NULL,
    locality_details TEXT,
    verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    moderator_notes TEXT,
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proofs_project_id ON public.citizen_proofs(project_id);
CREATE INDEX IF NOT EXISTS idx_proofs_status ON public.citizen_proofs(verification_status);

ALTER TABLE public.citizen_proofs ENABLE ROW LEVEL SECURITY;

-- 1. Le public ne peut voir QUE les preuves validées par la modération (Protection contre les faux constats)
CREATE POLICY "Allow public read access on approved proofs only" 
    ON public.citizen_proofs FOR SELECT 
    USING (verification_status = 'APPROVED');

-- 2. Tout citoyen (anonyme ou authentifié) peut SOUMETTRE un constat (le statut reste forcé à PENDING)
CREATE POLICY "Allow citizen proof submission" 
    ON public.citizen_proofs FOR INSERT 
    WITH CHECK (verification_status = 'PENDING');

-- 3. Les modérateurs et administrateurs peuvent TOUT voir et modérer
CREATE POLICY "Allow moderators full management on citizen proofs" 
    ON public.citizen_proofs FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER')
    );


-- =========================================================================
-- 4. TABLE: caidp_directory (Répertoire Officiel CAIDP & Responsables RI)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.caidp_directory (
    id TEXT PRIMARY KEY DEFAULT ('caidp-' || uuid_generate_v4()::text),
    company_name TEXT NOT NULL,
    category TEXT NOT NULL,
    region TEXT,
    commune TEXT,
    ri_name TEXT DEFAULT 'Non désigné',
    ri_function TEXT,
    email TEXT,
    phone TEXT,
    source TEXT DEFAULT 'CAIDP Officiel',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caidp_company ON public.caidp_directory(company_name);

ALTER TABLE public.caidp_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on caidp directory" 
    ON public.caidp_directory FOR SELECT 
    USING (true);

CREATE POLICY "Allow admin write access on caidp directory" 
    ON public.caidp_directory FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'DATA_MANAGER')
    );


-- =========================================================================
-- 5. TABLE: news_articles (Publications, Rapports & Guides Citoyens)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.news_articles (
    id TEXT PRIMARY KEY DEFAULT ('art-' || uuid_generate_v4()::text),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT DEFAULT 'Comité SuiviBudget CI',
    cover_image_url TEXT,
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on published articles" 
    ON public.news_articles FOR SELECT 
    USING (is_published = true);

CREATE POLICY "Allow staff full access on news articles" 
    ON public.news_articles FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR')
    );


-- =========================================================================
-- 6. TABLE: newsletter_subscribers (Abonnés aux Alertes Citoyennes)
-- SÉCURITÉ CRITIQUE : Les emails des citoyens ne sont JAMAIS lisibles par le public
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id TEXT PRIMARY KEY DEFAULT ('sub-' || uuid_generate_v4()::text),
    first_name TEXT DEFAULT 'Citoyen',
    email TEXT UNIQUE NOT NULL,
    commune TEXT DEFAULT 'Côte d''Ivoire',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Inscription publique permise
CREATE POLICY "Allow public insert on newsletter subscribers" 
    ON public.newsletter_subscribers FOR INSERT 
    WITH CHECK (true);

-- Lecture STRICTEMENT réservée au Super Administrateur
CREATE POLICY "Allow admin only read on newsletter subscribers" 
    ON public.newsletter_subscribers FOR SELECT 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    );


-- =========================================================================
-- 7. TABLE: site_settings (Configuration & Paramètres Plateforme)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    fiscal_year INTEGER DEFAULT 2026,
    portal_name TEXT DEFAULT 'SuiviBudget Côte d''Ivoire',
    contact_email TEXT DEFAULT 'contact.suivi@gmail.com',
    allow_citizen_submissions BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on site settings" 
    ON public.site_settings FOR SELECT 
    USING (true);

CREATE POLICY "Allow admin write on site settings" 
    ON public.site_settings FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    );
