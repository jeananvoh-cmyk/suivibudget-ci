-- =========================================================================
-- SUIVIBUDGET CI — MIGRATION : SUPPORT MULTI-FASCICULES & SCAN COMPTES ADMINISTRATIFS
-- Extension additive et rétrocompatible de public.public_documents
-- =========================================================================

ALTER TABLE public.public_documents
    ADD COLUMN IF NOT EXISTS is_multipart BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS parts_count INTEGER,
    ADD COLUMN IF NOT EXISTS document_parts JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS is_scanned BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS has_text_layer BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS ocr_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE';

-- Contrainte de validation sur ocr_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_pubdocs_ocr_status'
    ) THEN
        ALTER TABLE public.public_documents
            ADD CONSTRAINT chk_pubdocs_ocr_status CHECK (
                ocr_status IN (
                    'NOT_APPLICABLE',
                    'NOT_IMPLEMENTED',
                    'OCR_PENDING',
                    'MANUAL_TRANSCRIPTION',
                    'PROCESSED'
                )
            );
    END IF;
END $$;

COMMENT ON COLUMN public.public_documents.is_multipart IS 'Indique si le document officiel est composé de plusieurs fascicules ou tomes physiques.';
COMMENT ON COLUMN public.public_documents.parts_count IS 'Nombre total de fascicules ou parties composant le document logique.';
COMMENT ON COLUMN public.public_documents.document_parts IS 'Tableau JSONB détaillant chaque partie (part_number, file_name, page_range, page_start, page_end, file_size, checksum_sha256, storage_path).';
COMMENT ON COLUMN public.public_documents.is_scanned IS 'Indique si le document provient d''un scan papier/photocopie sans texte natif.';
COMMENT ON COLUMN public.public_documents.has_text_layer IS 'Indique si le PDF dispose d''une couche de texte sélectionnable/indexable.';
COMMENT ON COLUMN public.public_documents.ocr_status IS 'Statut du traitement OCR (NOT_APPLICABLE, NOT_IMPLEMENTED, OCR_PENDING, MANUAL_TRANSCRIPTION, PROCESSED).';
