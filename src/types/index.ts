// Types for Suivi Budget CI Platform

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type UserRole = 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER' | 'CITIZEN';

export type InstitutionType = 'MAIRIE' | 'REGION' | 'DISTRICT' | 'MINISTERE' | 'INSTITUTION' | 'AUTORITE_REGULATION';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  region: string;
  district: string;
  departement?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  web_status?: 'FONCTIONNEL' | 'INACTIF' | 'AUCUN';
  web_observations?: string;
  address?: string;
  // Responsable de l'Information (RI) - Loi d'accès à l'information publique
  info_officer_name?: string;
  info_officer_email?: string;
  info_officer_phone?: string;
  info_officer_title?: string;
  green_line_number?: string;
  // Budget annuel (Dotation État / Loi de Finances)
  budget_functioning_fcfa: number;
  budget_investment_fcfa: number;
  total_budget_fcfa: number;
  budget_not_published?: boolean;
  is_tax_quota_commune?: boolean;
  tax_quota_note?: string;
  // Budget Primitif Municipal Voté (Délibération Conseil Municipal / Source Officielle)
  primitive_budget?: PrimitiveBudgetInfo;
  // Premier Responsable & Présence Numérique
  leader_name?: string;
  leader_gender?: 'M' | 'F';
  leader_title?: string;
  leader_photo_url?: string;
  leader_bio?: string;
  political_party?: string;
  mandature?: string;
  facebook_url?: string;
  mission_summary?: string;
  organigramme_summary?: string[];
  organigramme_details?: { title: string; items: string[] }[];
  leader_experience?: string[];
  leader_education?: string[];
  official_programs?: string[];
  budget_lines?: BudgetLineItem[];
  // Référentiel Historique & Multi-Exercices des Budgets Locaux
  local_budgets?: import('./localBudget').LocalBudget[];
}

export interface PrimitiveBudgetInfo {
  total_voted_fcfa: number;
  investment_voted_fcfa: number | null;
  functioning_voted_fcfa: number | null;
  voted_date: string;
  source: string;
  source_url?: string;
  projects_count?: number;
  session_notes?: string;
  precision?: 'EXACT' | 'APPROXIMATE' | 'LOWER_BOUND' | 'UPPER_BOUND' | 'UNKNOWN';
  editor_source?: string;
}

export interface BudgetLineItem {
  id?: string;
  libelle: string;
  montant_fcfa: number;
  evolution_pct?: number;
  categorie?: string;
  sous_categorie_1?: string;
  sous_categorie_2?: string;
  sous_categorie_3?: string;
  nature?: 'Biens et services' | 'Investissements' | 'Transferts' | 'Personnel' | string;
  year?: number;
}

export interface ApecCycle {
  id: string;
  institution_id: string;
  fiscal_year: number;
  title: string;
  source_reference: string;
  source_date: string;
  status: 'OPEN' | 'CLOSED';
}

export interface ApecNeed {
  id: string;
  cycle_id: string;
  user_id: string;
  title: string;
  description: string;
  source_reference: string;
  source_date: string;
  created_at: string;
  provenance: 'CITIZEN_OBSERVATION';
  verification_status: 'TO_VERIFY' | 'VERIFIED' | 'REJECTED';
  status: 'SUBMITTED' | 'PRIORITIZED' | 'LINKED' | 'ANSWERED';
  priority: number | null;
  project_id: string | null;
  local_budget_id: string | null;
}

export interface ApecContribution {
  id: string;
  need_id: string;
  body: string;
  source_reference: string;
  source_date: string;
  verification_status: ApecNeed['verification_status'];
  provenance: 'CITIZEN_OBSERVATION';
  created_at: string;
}

export interface ApecPublicNeed {
  need_id: string;
  institution_id: string;
  fiscal_year: number;
  title: string;
  summary: string;
  source_reference: string;
  source_date: string;
  provenance: 'CITIZEN_OBSERVATION';
  status: 'PUBLISHED';
  reviewed_at: string;
}

export type ApecDecision = 'VERIFY' | 'REJECT' | 'PRIORITIZE' | 'LINK' | 'RESPONSE' | 'FOLLOW_UP' | 'VERIFY_CONTRIBUTION' | 'REJECT_CONTRIBUTION';

export interface ApecEvent {
  id: string;
  need_id: string;
  contribution_id: string | null;
  kind: ApecDecision | 'SUBMITTED' | 'CONTRIBUTION';
  body: string;
  source_reference: string;
  source_date: string;
  provenance: 'CITIZEN_OBSERVATION' | 'SUIVIBUDGET_CALCULATION' | 'INSTITUTION_RESPONSE';
  created_at: string;
  decision_data: { priority?: number | null; project_id?: string | null; local_budget_id?: string | null };
}

export interface BudgetProject {
  institution_type?: import('./localBudget').LocalInstitutionType;
  source_document_id?: string;
  source_page?: number;
  source_url?: string;
  citizen_need_origin?: string;
  initiative_source?: string;
  id: string;
  institution_id?: string;
  institution_name?: string;
  commune_name: string;
  region_name: string;
  district_name?: string;
  departement_name?: string;
  category: string; // Santé, Éducation, Eau, Voirie, Logement, Électrification, etc.
  nature_expense: 'Investissements' | 'Transferts' | 'Personnel';
  sub_nature_expense?: string;
  title: string;
  details?: string;
  budget_amount_fcfa: number;
  fiscal_year: number; // 2026
  fiscal_year_label?: string; // ex: "Marché Pluriannuel (Engagé en 2021)"
  current_status: ProjectStatus;
  progress_percentage: number;
  contractor_name?: string;
  target_delivery_date?: string;
  start_date?: string;
  contractual_duration_months?: number;
  execution_deadline?: string;
  locality_village_neighborhood?: string;
  created_at: string;
  source?: string;
  scope_level?: 'LOCAL' | 'NATIONAL';
  ministry_name?: string;
  program_name?: string;
  service_name?: string;
  image_url?: string;
  partner_or_donor?: string;
  master_builder?: string;
  project_tier?: 'MUNICIPAL' | 'REGIONAL' | 'STATE';
  official_progress_source?: string;
}

export interface CitizenProof {
  id: string;
  project_id: string;
  project_title?: string;
  commune_name?: string;
  region_name?: string;
  citizen_name?: string;
  user_name?: string;
  image_url: string;
  photo_url?: string;
  video_url?: string;
  media_type?: 'IMAGE' | 'VIDEO';
  citizen_status_claim: ProjectStatus;
  comment: string;
  locality_details?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  verification_status: VerificationStatus;
  moderator_notes?: string;
  confirmations_count: number;
  is_demo?: boolean;
  created_at: string;
  source_url?: string;
  source_credit?: string;
  additional_photos?: string[];
  contractual_duration?: string;
  start_date?: string;
  target_delivery_date?: string;
  contractor_name?: string;
  financial_source?: string;
  tracking_code?: string;
  citizen_whatsapp?: string;
  signboard_status?: 'PRESENT' | 'ABSENT' | 'UNSPECIFIED';
  secondary_image_url?: string;
}

export interface ImpactStats {
  totalCommunes: number;
  totalCollectivites?: number;
  totalRegions: number;
  totalBudgetLines: number;
  totalInvestmentsFcfa: number;
  verifiedProofsCount: number;
  proofsVerificationRate: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: 'ACTUALITE' | 'RAPPORT' | 'COMMUNIQUE' | 'GUIDE';
  summary: string;
  content: string;
  cover_image_url?: string;
  document_url?: string;
  document_name?: string;
  published_at: string;
  author_name?: string;
  is_featured?: boolean;
}

export interface SiteSettings {
  fiscal_year: number;
  contact_email: string;
  contact_phone: string;
  facebook_url?: string;
  platform_title: string;
  announcement_banner_enabled: boolean;
  announcement_banner_text: string;
  announcement_banner_link?: string;
  announcement_banner_type?: 'info' | 'success' | 'warning';
}

export * from './publicDocument';

export type ActiveTab = 'home' | 'institutions' | 'projects' | 'observatory' | 'documents' | 'admin';

// Exportation du domaine Référentiel des Budgets Locaux
export * from './localBudget';

// Exportation du domaine Comptes Administratifs (CA) & Exécution
export * from './administrativeAccount';
