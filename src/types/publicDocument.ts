// =========================================================================
// TYPES : GESTION DES DOCUMENTS PUBLICS & COMPTES ADMINISTRATIFS (CA)
// SuiviBudget Côte d'Ivoire - Architecture Multi-Exercices & Matrice 232
// =========================================================================

export type DocumentCategory = 
  | 'RAPPORT_AUDIT' 
  | 'MARCHE_PUBLIC' 
  | 'BUDGET_OFFICIEL' 
  | 'LOI_CAIDP' 
  | 'ETUDE_TECHNIQUE' 
  | 'GUIDE_CITOYEN'
  | 'COMPTE_ADMINISTRATIF';

export type DocumentFormat = 'PDF' | 'EXCEL' | 'WORD' | 'CSV';

export type OfficialDocumentType =
  | 'COMPTE_ADMINISTRATIF'
  | 'BUDGET_PRIMITIF'
  | 'BUDGET_MODIFICATIF'
  | 'DELIBERATION'
  | 'PROGRAMME_TRIENNAL'
  | 'MARCHE_PUBLIC'
  | 'ARRETE'
  | 'RAPPORT_AUDIT'
  | 'AUTRE_DOCUMENT_OFFICIEL';

export type DocumentLifecycleStatus =
  | 'UPLOADED'
  | 'TO_VERIFY'
  | 'VERIFIED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type OfficialDocumentSource =
  | 'DGDDL'
  | 'SYGIDAN_CTI'
  | 'COLLECTIVITE'
  | 'CAIDP'
  | 'TRESOR_PUBLIC'
  | 'COUR_DES_COMPTES'
  | 'AUTRE_SOURCE_OFFICIELLE';

/**
 * Modèle unifié d'un Document Public
 */
export interface PublicDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  institution_name: string;
  year: number; // Année d'exercice fiscal
  fiscal_year?: number;
  description: string;
  file_url: string;
  file_name: string;
  file_size?: string;
  file_format: DocumentFormat;
  published_at: string | null;
  downloads_count: number;
  is_official: boolean;
  tags?: string[];

  // Champs de gouvernance & liaison collectivité
  institution_id?: string | null;
  institution_type?: 'MAIRIE' | 'REGION' | 'DISTRICT' | 'MINISTERE' | 'AUTORITE_REGULATION';
  document_type?: OfficialDocumentType | null;
  storage_bucket?: string;
  storage_path?: string | null;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  page_count?: number;
  source_name?: string | null;
  source_url?: string | null;
  adoption_date?: string;
  approval_date?: string;
  approval_reference?: string;
  status?: DocumentLifecycleStatus;
  verification_status?: DocumentLifecycleStatus | 'REJECTED' | 'SOURCE_CONFLICT';
  version?: number;
  checksum_sha256?: string | null;
  replaces_document_id?: string | null;
  replacement_reason?: string | null;
  created_by?: string;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;

}

/**
 * Statut d'une collectivité dans la matrice de couverture des CA
 */
export interface CollectiviteCaStatus {
  institution_id: string;
  institution_name: string;
  institution_type: 'MAIRIE' | 'REGION';
  region_name: string;
  district_name?: string;
  fiscal_year: number;
  status: 'PUBLISHED' | 'VERIFIED' | 'TO_VERIFY' | 'MISSING' | 'ARCHIVED';
  document?: PublicDocument;
  versions_count: number;
  last_updated?: string;
}

/**
 * Synthèse métrique de la couverture des 232 collectivités
 */
export interface CollectivitesCaMatrixSummary {
  fiscal_year: number;
  totalExpected: number;      // 232
  totalCommunes: number;      // 201
  totalRegions: number;       // 31
  receivedCount: number;      // Total reçus (TO_VERIFY + VERIFIED + PUBLISHED)
  verifiedCount: number;      // Total vérifiés
  publishedCount: number;     // Total publiés
  toVerifyCount: number;      // En attente d'examen
  missingCount: number;       // Manquants
  communesReceivedCount: number;
  communesPublishedCount: number;
  regionsReceivedCount: number;
  regionsPublishedCount: number;
  globalCoveragePct: number;
}

/**
 * Proposition de matching automatique pour l'import par lot de PDF
 */
export interface BatchCaMatchProposal {
  id: string;
  file: File;
  fileName: string;
  fileSize: string;
  fileSizeBytes: number;
  detectedYear: number;
  matchedInstitutionId?: string;
  matchedInstitutionName?: string;
  matchedInstitutionType?: 'MAIRIE' | 'REGION';
  confidence: 'STRONG' | 'UNCERTAIN' | 'NONE';
  confidenceScore: number; // 0 - 100
  checksum_sha256?: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  existingDocId?: string;
  isNewVersion: boolean;
  sourceName: OfficialDocumentSource;
  sourceUrl?: string;
  adoptionDate?: string;
  approvalDate?: string;
  approvalReference?: string;
}
