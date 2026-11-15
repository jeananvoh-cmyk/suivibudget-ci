-- =========================================================================
-- SUIVIBUDGET CI - MIGRATION : GESTION DES COMPTES ADMINISTRATIFS & DOCUMENTS
-- Extension additive et rétrocompatible de public_documents & Supabase Storage
-- Multi-exercices (2024, 2025, 2026, 2027+) & Suivi des 232 Collectivités
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. EXTENSION DE LA TABLE: public_documents
-- =========================================================================

-- Ajout des colonnes de liaison et de gouvernance si elles n'existent pas
ALTER TABLE public.public_documents
    ADD COLUMN IF NOT EXISTS institution_id TEXT,
    ADD COLUMN IF NOT EXISTS institution_type TEXT CHECK (institution_type IN ('MAIRIE', 'REGION', 'DISTRICT', 'MINISTERE', 'AUTORITE_REGULATION')),
    ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'AUTRE',
    ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
    ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'public_documents',
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS original_filename TEXT,
    ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'application/pdf',
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS page_count INTEGER,
    ADD COLUMN IF NOT EXISTS source_name TEXT DEFAULT 'AUTRE_SOURCE_OFFICIELLE',
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS adoption_date DATE,
    ADD COLUMN IF NOT EXISTS approval_date DATE,
    ADD COLUMN IF NOT EXISTS approval_reference TEXT,
    ADD COLUMN IF NOT EXISTS document_status TEXT NOT NULL DEFAULT 'TO_VERIFY',
    ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'TO_VERIFY',
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_by TEXT,
    ADD COLUMN IF NOT EXISTS verified_by TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Contraintes de vérification sur document_type et statuts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_pubdocs_document_type'
    ) THEN
        ALTER TABLE public.public_documents
            ADD CONSTRAINT chk_pubdocs_document_type CHECK (
                document_type IN (
                    'COMPTE_ADMINISTRATIF',
                    'BUDGET_PRIMITIF',
                    'BUDGET_MODIFICATIF',
                    'DELIBERATION',
                    'PROGRAMME_TRIENNAL',
                    'MARCHE_PUBLIC',
                    'ARRETE',
                    'RAPPORT_AUDIT',
                    'AUTRE'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_pubdocs_document_status'
    ) THEN
        ALTER TABLE public.public_documents
            ADD CONSTRAINT chk_pubdocs_document_status CHECK (
                document_status IN (
                    'UPLOADED',
                    'TO_VERIFY',
                    'VERIFIED',
                    'PUBLISHED',
                    'ARCHIVED'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_pubdocs_source_name'
    ) THEN
        ALTER TABLE public.public_documents
            ADD CONSTRAINT chk_pubdocs_source_name CHECK (
                source_name IN (
                    'DGDDL',
                    'SYGIDAN_CTI',
                    'COLLECTIVITE',
                    'CAIDP',
                    'TRESOR_PUBLIC',
                    'COUR_DES_COMPTES',
                    'AUTRE_SOURCE_OFFICIELLE'
                )
            );
    END IF;
END $$;

-- Synchronisation de fiscal_year avec la colonne existante year si vide
UPDATE public.public_documents
SET fiscal_year = year
WHERE fiscal_year IS NULL AND year IS NOT NULL;

-- Indexation performante pour les requêtes multi-exercices et par collectivité
CREATE INDEX IF NOT EXISTS idx_pubdocs_inst_year_type 
    ON public.public_documents(institution_id, fiscal_year, document_type);

CREATE INDEX IF NOT EXISTS idx_pubdocs_type_year 
    ON public.public_documents(document_type, fiscal_year);

CREATE INDEX IF NOT EXISTS idx_pubdocs_checksum 
    ON public.public_documents(checksum_sha256);

CREATE INDEX IF NOT EXISTS idx_pubdocs_doc_status 
    ON public.public_documents(document_status);

CREATE INDEX IF NOT EXISTS idx_pubdocs_is_public 
    ON public.public_documents(is_public);

-- =========================================================================
-- 2. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE public.public_documents ENABLE ROW LEVEL SECURITY;

-- 1. Lecture publique : uniquement les documents PUBLIÉS et marqués publics
DROP POLICY IF EXISTS "Allow public read access on published documents" ON public.public_documents;
CREATE POLICY "Allow public read access on published documents" 
    ON public.public_documents FOR SELECT 
    USING (
        document_status = 'PUBLISHED' 
        OR is_public = true
    );

-- 2. Accès complet pour les Administrateurs et Modérateurs authentifiés
DROP POLICY IF EXISTS "Allow staff full access on public documents" ON public.public_documents;
CREATE POLICY "Allow staff full access on public documents" 
    ON public.public_documents FOR ALL 
    TO authenticated 
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER')
    );

-- =========================================================================
-- 3. BUCKET SUPABASE STORAGE: public_documents
-- =========================================================================

-- S'assurer que le bucket public_documents existe et accepte les PDF jusqu'à 50 Mo
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'public_documents',
    'public_documents',
    true,
    52428800,
    ARRAY[
        'application/pdf', 
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
        'application/pdf', 
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'text/csv'
    ];

-- Politiques de sécurité Storage
DROP POLICY IF EXISTS "Public documents files are publicly readable" ON storage.objects;
CREATE POLICY "Public documents files are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'public_documents');

DROP POLICY IF EXISTS "Staff can upload public documents files" ON storage.objects;
CREATE POLICY "Staff can upload public documents files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'public_documents'
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER') OR
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER')
        )
    );

DROP POLICY IF EXISTS "Staff can delete public documents files" ON storage.objects;
CREATE POLICY "Staff can delete public documents files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'public_documents'
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER') OR
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'MODERATOR', 'DATA_MANAGER')
        )
    );

COMMENT ON TABLE public.public_documents IS 'Référentiel des documents administratifs et budgétaires officiels (dont Comptes Administratifs des 232 Collectivités)';
