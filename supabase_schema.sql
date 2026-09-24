-- ==============================================================================
-- CIVICDATA CI / SUIVIBUDGET CI - SCHEMA SUPABASE SQL COMPLET & IDEMPOTENT
-- Standard de Securite : Row Level Security (RLS) active sur 100% des tables
-- Compatible avec les identifiants TEXT ('gov-001', 'nat-proj-...', 'proof-...', etc.)
-- ==============================================================================

-- 1. EXTENSIONS & CONFIGURATION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TYPES ENUMERES (Creation securisee si non existants)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'MODERATOR', 'DATA_MANAGER', 'CITIZEN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_type') THEN
        CREATE TYPE institution_type AS ENUM ('MAIRIE', 'REGION', 'DISTRICT', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- ==============================================================================
-- 3. TABLES DU SYSTEME & MIGRATIONS PROGRESSIVES
-- ==============================================================================

-- 3.1 TABLE DES PROFILS UTILISATEURS (Liee a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role DEFAULT 'CITIZEN',
    commune_interest TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger automatique pour creer le profil des nouvel utilisateur auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'CITIZEN'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.2 TABLE DES INSTITUTIONS PUBLIQUES
CREATE TABLE IF NOT EXISTS public.institutions (
    id TEXT PRIMARY KEY DEFAULT ('inst-' || uuid_generate_v4()::text),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    region TEXT DEFAULT 'National',
    district TEXT,
    departement TEXT,
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    facebook_url TEXT,
    leader_name TEXT,
    leader_title TEXT,
    leader_photo_url TEXT,
    political_party TEXT,
    web_status TEXT DEFAULT 'FONCTIONNEL',
    web_observations TEXT,
    -- Responsable de l'Information (RI) - Loi d'acces a l'information publique
    info_officer_name TEXT,
    info_officer_email TEXT,
    info_officer_phone TEXT,
    info_officer_title TEXT DEFAULT 'Responsable de l''Information et des Relations Publiques',
    green_line_number TEXT,
    -- Repartition budgetaire annuelle 2026
    budget_functioning_fcfa NUMERIC(15, 2) DEFAULT 0,
    budget_investment_fcfa NUMERIC(15, 2) DEFAULT 0,
    total_budget_fcfa NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ajout idempotent de colonnes si la table existait deja
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS leader_name TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS leader_title TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS leader_photo_url TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS political_party TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS web_status TEXT DEFAULT 'FONCTIONNEL';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS web_observations TEXT;
ALTER TABLE public.institutions ALTER COLUMN region SET DEFAULT 'National';
ALTER TABLE public.institutions ALTER COLUMN region DROP NOT NULL;

-- 3.3 TABLE DES PROJETS BUDGETAIRES
CREATE TABLE IF NOT EXISTS public.budget_projects (
    id TEXT PRIMARY KEY DEFAULT ('proj-' || uuid_generate_v4()::text),
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    commune_name TEXT NOT NULL,
    region_name TEXT NOT NULL,
    district_name TEXT,
    departement_name TEXT,
    category TEXT NOT NULL,
    nature_expense TEXT NOT NULL DEFAULT 'Investissements',
    sub_nature_expense TEXT,
    title TEXT NOT NULL,
    details TEXT,
    budget_amount_fcfa NUMERIC(15, 2) NOT NULL,
    fiscal_year INTEGER NOT NULL DEFAULT 2026,
    fiscal_year_label TEXT,
    current_status TEXT DEFAULT 'IN_PROGRESS',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    contractor_name TEXT,
    target_delivery_date DATE,
    start_date DATE,
    locality_village_neighborhood TEXT,
    source TEXT,
    scope_level TEXT DEFAULT 'LOCAL',
    ministry_name TEXT,
    program_name TEXT,
    service_name TEXT,
    partner_or_donor TEXT,
    master_builder TEXT,
    project_tier TEXT DEFAULT 'MUNICIPAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS fiscal_year_label TEXT;
ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS scope_level TEXT DEFAULT 'LOCAL';
ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS ministry_name TEXT;
ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS program_name TEXT;
ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS partner_or_donor TEXT;
ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS master_builder TEXT;
ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS project_tier TEXT DEFAULT 'MUNICIPAL';

-- 3.4 TABLE DES PREUVES & SIGNALEMENTS CITOYENS (Module Observatoire Terrain)
CREATE TABLE IF NOT EXISTS public.citizen_proofs (
    id TEXT PRIMARY KEY DEFAULT ('proof-' || uuid_generate_v4()::text),
    project_id TEXT NOT NULL,
    citizen_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tracking_code TEXT,
    project_title TEXT,
    commune_name TEXT,
    region_name TEXT,
    citizen_name TEXT DEFAULT 'Citoyen Observateur',
    citizen_whatsapp TEXT,
    signboard_status TEXT DEFAULT 'UNSPECIFIED',
    image_url TEXT NOT NULL,
    secondary_image_url TEXT,
    video_url TEXT,
    media_type TEXT DEFAULT 'IMAGE',
    citizen_status_claim TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    comment TEXT NOT NULL,
    locality_details TEXT,
    geo_latitude NUMERIC(10, 7),
    geo_longitude NUMERIC(10, 7),
    verification_status TEXT DEFAULT 'PENDING',
    moderator_notes TEXT,
    moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by TEXT,
    source_url TEXT,
    source_credit TEXT,
    additional_photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    confirmations_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS citizen_whatsapp TEXT;
ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS signboard_status TEXT DEFAULT 'UNSPECIFIED';
ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS secondary_image_url TEXT;
ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS source_credit TEXT;
ALTER TABLE public.citizen_proofs ADD COLUMN IF NOT EXISTS additional_photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3.5 TABLE DES CONFIRMATIONS / UPVOTES CITOYENS
CREATE TABLE IF NOT EXISTS public.proof_confirmations (
    id TEXT PRIMARY KEY DEFAULT ('conf-' || uuid_generate_v4()::text),
    proof_id TEXT NOT NULL REFERENCES public.citizen_proofs(id) ON DELETE CASCADE,
    user_identifier TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(proof_id, user_identifier)
);

-- 3.6 TABLE DES DOCUMENTS PUBLICS (Transparence Budgetaire & CAIDP)
CREATE TABLE IF NOT EXISTS public.public_documents (
    id TEXT PRIMARY KEY DEFAULT ('doc-' || uuid_generate_v4()::text),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 2026,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size TEXT DEFAULT '1.0 Mo',
    file_format TEXT DEFAULT 'PDF',
    downloads_count INTEGER DEFAULT 0,
    is_official BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.7 TABLE DES ABONNES NEWSLETTER & ALERTES CITOYENNES
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id TEXT PRIMARY KEY DEFAULT ('sub-' || uuid_generate_v4()::text),
    first_name TEXT DEFAULT 'Citoyen',
    email TEXT UNIQUE NOT NULL,
    commune TEXT DEFAULT 'Cote d''Ivoire',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.8 TABLE DES LOGS STATISTIQUES REQUETES CAIDP (Loi d'Acces a l'Information)
CREATE TABLE IF NOT EXISTS public.caidp_document_requests_log (
    id TEXT PRIMARY KEY DEFAULT ('caidp-req-' || uuid_generate_v4()::text),
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    has_ri BOOLEAN DEFAULT false,
    document_titles TEXT[] DEFAULT ARRAY[]::TEXT[],
    document_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    user_status TEXT,
    commune TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. INDEX POUR PERFORMANCES OPTIMALES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_budget_projects_commune ON public.budget_projects(commune_name);
CREATE INDEX IF NOT EXISTS idx_budget_projects_region ON public.budget_projects(region_name);
CREATE INDEX IF NOT EXISTS idx_budget_projects_category ON public.budget_projects(category);
CREATE INDEX IF NOT EXISTS idx_budget_projects_institution ON public.budget_projects(institution_id);
CREATE INDEX IF NOT EXISTS idx_citizen_proofs_project ON public.citizen_proofs(project_id);
CREATE INDEX IF NOT EXISTS idx_citizen_proofs_verification ON public.citizen_proofs(verification_status);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON public.institutions(type);
CREATE INDEX IF NOT EXISTS idx_public_documents_category ON public.public_documents(category);
CREATE INDEX IF NOT EXISTS idx_caidp_requests_entity ON public.caidp_document_requests_log(entity_name);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Activation du RLS sur 100% des tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caidp_document_requests_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin/moderator role
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER') AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.1 POLICIES POUR PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
    ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
    ON public.profiles FOR UPDATE USING (auth.uid() = id OR is_admin_or_moderator());

-- 5.2 POLICIES POUR INSTITUTIONS
DROP POLICY IF EXISTS "Institutions are viewable by everyone." ON public.institutions;
CREATE POLICY "Institutions are viewable by everyone."
    ON public.institutions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Data Managers can insert institutions." ON public.institutions;
CREATE POLICY "Admins and Data Managers can insert institutions."
    ON public.institutions FOR INSERT WITH CHECK (is_admin_or_moderator());

DROP POLICY IF EXISTS "Admins and Data Managers can update institutions." ON public.institutions;
CREATE POLICY "Admins and Data Managers can update institutions."
    ON public.institutions FOR UPDATE USING (is_admin_or_moderator());

DROP POLICY IF EXISTS "Admins and Data Managers can delete institutions." ON public.institutions;
CREATE POLICY "Admins and Data Managers can delete institutions."
    ON public.institutions FOR DELETE USING (is_admin_or_moderator());

-- 5.3 POLICIES POUR BUDGET_PROJECTS
DROP POLICY IF EXISTS "Budget projects are viewable by everyone." ON public.budget_projects;
CREATE POLICY "Budget projects are viewable by everyone."
    ON public.budget_projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Data Managers can insert budget projects." ON public.budget_projects;
CREATE POLICY "Admins and Data Managers can insert budget projects."
    ON public.budget_projects FOR INSERT WITH CHECK (is_admin_or_moderator());

DROP POLICY IF EXISTS "Admins and Data Managers can update budget projects." ON public.budget_projects;
CREATE POLICY "Admins and Data Managers can update budget projects."
    ON public.budget_projects FOR UPDATE USING (is_admin_or_moderator());

DROP POLICY IF EXISTS "Admins and Data Managers can delete budget projects." ON public.budget_projects;
CREATE POLICY "Admins and Data Managers can delete budget projects."
    ON public.budget_projects FOR DELETE USING (is_admin_or_moderator());

-- 5.4 POLICIES POUR CITIZEN_PROOFS
DROP POLICY IF EXISTS "Approved citizen proofs are viewable by everyone." ON public.citizen_proofs;
CREATE POLICY "Approved citizen proofs are viewable by everyone."
    ON public.citizen_proofs FOR SELECT
    USING (verification_status = 'APPROVED' OR is_admin_or_moderator() OR (auth.uid() IS NOT NULL AND citizen_user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can submit a citizen proof." ON public.citizen_proofs;
CREATE POLICY "Anyone can submit a citizen proof."
    ON public.citizen_proofs FOR INSERT
    WITH CHECK (verification_status = 'PENDING');

DROP POLICY IF EXISTS "Admins and Moderators can update proofs." ON public.citizen_proofs;
CREATE POLICY "Admins and Moderators can update proofs."
    ON public.citizen_proofs FOR UPDATE
    USING (is_admin_or_moderator());

DROP POLICY IF EXISTS "Admins can delete citizen proofs." ON public.citizen_proofs;
CREATE POLICY "Admins can delete citizen proofs."
    ON public.citizen_proofs FOR DELETE
    USING (is_admin_or_moderator());

-- 5.5 POLICIES POUR PROOF_CONFIRMATIONS
DROP POLICY IF EXISTS "Confirmations are viewable by everyone." ON public.proof_confirmations;
CREATE POLICY "Confirmations are viewable by everyone."
    ON public.proof_confirmations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert a confirmation." ON public.proof_confirmations;
CREATE POLICY "Anyone can insert a confirmation."
    ON public.proof_confirmations FOR INSERT WITH CHECK (true);

-- 5.6 POLICIES POUR PUBLIC_DOCUMENTS
DROP POLICY IF EXISTS "Public documents are viewable by everyone." ON public.public_documents;
CREATE POLICY "Public documents are viewable by everyone."
    ON public.public_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage public documents." ON public.public_documents;
CREATE POLICY "Admins can manage public documents."
    ON public.public_documents FOR ALL
    USING (is_admin_or_moderator());

-- 5.7 POLICIES POUR NEWSLETTER_SUBSCRIBERS
DROP POLICY IF EXISTS "Anyone can subscribe to alerts" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to alerts"
    ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can view subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Only admins can view subscribers"
    ON public.newsletter_subscribers FOR SELECT
    USING (is_admin_or_moderator());

-- 5.8 POLICIES POUR CAIDP_DOCUMENT_REQUESTS_LOG
DROP POLICY IF EXISTS "Anyone can log a caidp request event." ON public.caidp_document_requests_log;
CREATE POLICY "Anyone can log a caidp request event."
    ON public.caidp_document_requests_log FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Data Managers can view caidp request events." ON public.caidp_document_requests_log;
CREATE POLICY "Admins and Data Managers can view caidp request events."
    ON public.caidp_document_requests_log FOR SELECT
    USING (is_admin_or_moderator());

-- ==============================================================================
-- 6. STORAGE BUCKETS CONFIGURATION (Photos & Documents)
-- ==============================================================================

-- 6.1 Bucket photos & videos citoyennes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'citizen_photos', 
    'citizen_photos', 
    true, 
    26214400, 
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

-- Consultation publique des medias
DROP POLICY IF EXISTS "Citizen photos are publicly accessible" ON storage.objects;
CREATE POLICY "Citizen photos are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'citizen_photos');

-- Upload securise : verification stricte d'extension et taille maximale (25 Mo)
DROP POLICY IF EXISTS "Anyone can upload citizen photos" ON storage.objects;
DROP POLICY IF EXISTS "Strict citizen media upload only" ON storage.objects;
CREATE POLICY "Strict citizen media upload only"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'citizen_photos' 
        AND (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'))
        AND ((metadata->>'size')::bigint <= 26214400)
    );

-- Suppression securisee : administrateurs et moderateurs uniquement
DROP POLICY IF EXISTS "Admins and Moderators can delete citizen media" ON storage.objects;
CREATE POLICY "Admins and Moderators can delete citizen media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'citizen_photos' 
        AND is_admin_or_moderator()
    );

-- 6.2 Bucket documents publics & rapports officiels
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'public_documents',
    'public_documents',
    true,
    52428800,
    ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];

DROP POLICY IF EXISTS "Public documents are publicly accessible" ON storage.objects;
CREATE POLICY "Public documents are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'public_documents');

DROP POLICY IF EXISTS "Admins can upload public documents" ON storage.objects;
CREATE POLICY "Admins can upload public documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'public_documents'
        AND is_admin_or_moderator()
    );
