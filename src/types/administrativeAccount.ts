// =========================================================================
// TYPES : COMPTE ADMINISTRATIF (CA) & EXÉCUTION BUDGÉTAIRE
// SuiviBudget Côte d'Ivoire - Architecture Multi-Exercices & Traçabilité
// =========================================================================

import { LocalInstitutionType, LocalVerificationStatus, ImportProvenance } from './localBudget';
import { ProjectStatus } from './index';

/**
 * Niveau de rapprochement avec un marché public DGMP
 */
export type ProcurementMatchLevel = 
  | 'STRONG'    // Marché public correspondant identifié
  | 'PARTIAL'   // Correspondance partielle
  | 'NONE'      // Aucun marché correspondant retrouvé dans les sources consultées
  | 'TO_VERIFY'; // À vérifier / Données incomplètes

/**
 * Marché public DGMP associé à une opération du CA
 */
export interface ProcurementMatch {
  import_provenance?: ImportProvenance;
  id: string;
  operation_id?: string;
  tender_number?: string;        // N° Appel d'offres / Dossier
  contract_number?: string;      // N° Marché enregistré à la DGMP
  procurement_object: string;    // Objet du marché
  contractor: string;            // Entreprise attributaire
  award_amount: number | null;          // Montant adjugé en FCFA
  award_date?: string;           // Date d'approbation / notification
  lot?: string;                  // Lot éventuel
  match_level: ProcurementMatchLevel;
  source: string;                // Bulletin Officiel DGMP / Portail Marchés Publics
  source_url?: string;
  verification_status: string;
  notes?: string;
}

/**
 * Droit de réponse ou précision officielle fournie par la collectivité
 */
export interface InstitutionResponse {
  id: string;
  operation_id?: string;
  ca_id?: string;
  response_text: string;
  response_date: string;
  author_name: string;
  author_title: string;          // Ex: "Secrétaire Général de la Mairie", "Directeur des Services Techniques"
  supporting_document_url?: string;
  supporting_document_name?: string;
  response_status: 'PENDING' | 'VALIDATED' | 'PUBLISHED';
}

/**
 * Opération d'investissement inscrite au Compte Administratif
 */
export interface CAInvestmentOperation {
  import_provenance?: ImportProvenance;
  id: string;
  ca_id: string;
  institution_id: string;
  institution_name?: string;
  fiscal_year: number;
  operation_reference?: string;  // N° de ligne ou code opération dans le CA officiel
  title: string;
  sector: string;                // Éducation, Santé, Voirie, Hydraulique, Bâtiment...
  location?: string;             // Village, quartier, sous-préfecture
  planned_amount: number | null;        // Montant prévu / crédits ouverts (FCFA)
  executed_amount: number | null;       // Montant effectivement ordonnancé / mandaté (FCFA)
  execution_rate?: number;       // Calculé dynamiquement (executed_amount / planned_amount)
  source_page?: number;          // Page dans le document PDF officiel
  source_reference?: string;
  procurement_match?: ProcurementMatch;
  linked_project_id?: string;    // Référence vers un projet physique dans le catalogue SuiviBudget
  citizen_proofs_count?: number; // Nombre d'observations citoyennes associées
  citizen_status?: ProjectStatus; // État d'avancement physique documenté sur le terrain
  notes?: string;
}

/**
 * Compte Administratif (Reddition annuelle de l'exécution budgétaire)
 */
export interface AdministrativeAccount {
  import_provenance?: ImportProvenance;
  id: string;
  institution_id: string;
  institution_type: LocalInstitutionType;
  institution_name: string;
  fiscal_year: number;           // Ex: 2024, 2025 (NE JAMAIS afficher un CA 2024 comme 2025)
  status: 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
  
  // Volet Fonctionnement
  operating_planned: number | null;     // Crédits de fonctionnement votés (FCFA)
  operating_realized: number | null;    // Dépenses de fonctionnement ordonnancées (FCFA)
  operating_revenue_realized?: number; // Champ historique : recettes effectivement recouvrées
  operating_revenue_planned?: number;
  operating_revenue_emitted?: number;
  operating_revenue_collected?: number;
  operating_expenditure_planned?: number;
  operating_expenditure_engaged?: number;
  
  // Volet Investissement / Équipement
  investment_planned: number | null;    // Crédits d'équipement votés (FCFA)
  investment_realized: number | null;   // Dépenses d'équipement ordonnancées (FCFA)
  investment_revenue_realized?: number; // Champ historique : recettes d'investissement recouvrées
  investment_revenue_planned?: number;
  investment_revenue_emitted?: number;
  investment_revenue_collected?: number;
  investment_expenditure_planned?: number;
  investment_expenditure_engaged?: number;
  
  // Totaux consolidés
  total_planned: number | null;         // Total prévu (Fonctionnement + Investissement)
  total_realized: number | null;        // Total exécuté
  surplus_or_deficit?: number;   // Uniquement si le document source qualifie explicitement ce montant ainsi
  total_revenue_collected?: number;
  total_expenditure_engaged?: number;
  arithmetic_difference?: number; // Différence arithmétique, ne jamais présenter automatiquement comme bénéfice/excédent
  reconciliation_status?: 'TO_VERIFY' | 'RECONCILED' | 'SOURCE_ANOMALY' | 'INCOMPLETE_SOURCE';
  
  // Traçabilité & Sources
  source_document: string;       // Titre du document officiel
  source_document_id?: string;
  source_url?: string;           // Lien de consultation ou téléchargement
  source_page?: number;
  approval_date?: string;        // Date de délibération du Conseil
  prefecture_visa_date?: string; // Date de validation de la tutelle / Trésor
  verification_status: LocalVerificationStatus;
  
  // Opérations d'investissement détaillées
  operations: CAInvestmentOperation[];
  
  // Droit de réponse institutionnel
  institution_response?: InstitutionResponse;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Résultat du calcul d'un taux d'exécution avec gardes-fous civiques
 */
export interface ExecutionRateResult {
  rate: number | null;
  formatted: string;             // "99,95 %"
  status: 'NORMAL' | 'OVER_EXECUTED' | 'ZERO_PLANNED' | 'ZERO_EXECUTED' | 'UNKNOWN';
  isOverBudget: boolean;
  statusLabel: string;
  badgeClass: string;
}


export type CAFinancialSection = 'OPERATING' | 'INVESTMENT' | 'GLOBAL' | 'PATRIMONY' | 'OTHER';
export type CAFinancialFlow = 'REVENUE' | 'EXPENDITURE' | 'RESULT' | 'PATRIMONY' | 'OTHER';
export type CAFinancialMeasure = 'PLANNED' | 'EMITTED' | 'COLLECTED' | 'ENGAGED' | 'ORDERED' | 'PAID' | 'REALIZED' | 'BALANCE' | 'OTHER';

export interface CAFinancialLine {
  id: string;
  ca_id: string;
  institution_id: string;
  fiscal_year: number;
  section: CAFinancialSection;
  flow_type: CAFinancialFlow;
  exact_heading: string; // libellé du CA conservé sans normalisation silencieuse
  account_code?: string;
  measure_type: CAFinancialMeasure;
  amount_fcfa: number;
  source_document_id?: string;
  source_page?: number;
  source_reference?: string;
  verification_status: 'TO_VERIFY' | 'VERIFIED' | 'SOURCE_ANOMALY';
  notes?: string;
}
