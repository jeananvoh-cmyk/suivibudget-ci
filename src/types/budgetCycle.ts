// =========================================================================
// TYPES : CYCLE BUDGÉTAIRE COMPLET & CONSOLE DOCUMENTAIRE
// SuiviBudget Côte d'Ivoire — Modélisation Civique Multi-Actes
// =========================================================================

import type { AmountPrecision, BudgetEventType, LocalBudget } from './localBudget';
import type { AdministrativeAccount, ExecutionRateResult } from './administrativeAccount';

/**
 * Catégorie générique d'un acte ou document budgétaire
 */
export type BudgetDocumentCategory = 
  | 'BUDGET_PRIMITIF'
  | 'BUDGET_SUPPLEMENTAIRE'
  | 'BUDGET_MODIFICATIF'
  | 'DECISION_MODIFICATIVE'
  | 'VIREMENT_CREDITS'
  | 'COMPTE_ADMINISTRATIF'
  | 'DELIBERATION_BUDGETAIRE'
  | 'AUTRE_DOCUMENT_OFFICIEL';

/**
 * Origine probatoire d'une valeur financière
 * - SOURCE_VALUE : valeur directement issue du document officiel (extraite textuellement)
 * - DERIVED_VALUE : valeur calculée à partir de documents successifs (ex: BP initial + modifications)
 */
export type ValueOriginType = 'SOURCE_VALUE' | 'DERIVED_VALUE';

/**
 * Statut d'établissement des crédits définitifs (Item 2 & 14)
 * - SOURCE_CONFIRMED : direct depuis un acte officiel clôturant les crédits
 * - DERIVED_FROM_DOCUMENTED_AMENDMENTS : calculé depuis BP + chaîne complète attestée
 * - NOT_ESTABLISHED : non établi (BP seul, ou chaîne partielle/non exhaustive)
 */
export type FinalCreditsStatus = 
  | 'SOURCE_CONFIRMED'
  | 'DERIVED_FROM_DOCUMENTED_AMENDMENTS'
  | 'NOT_ESTABLISHED';

/**
 * Complétude documentaire de la chaîne de modifications (Item 14)
 * - COMPLETE : tous les actes sont attestés et validés pour l'exercice
 * - PARTIAL : certains actes sont documentés mais complétude non certifiée
 * - UNKNOWN : statut d'exhaustivité inconnu
 */
export type AmendmentChainStatus = 
  | 'COMPLETE'
  | 'PARTIAL'
  | 'UNKNOWN';

/**
 * Sémantique financière du montant d'un acte modificatif (Item 12)
 * - DELTA : variation nette de crédits (+ ou -)
 * - REVISED_TOTAL : nouveau total révisé autorisé
 * - UNKNOWN : nature du montant non documentée (exige revue humaine)
 */
export type AmendmentAmountSemantics = 
  | 'DELTA'
  | 'REVISED_TOTAL'
  | 'UNKNOWN';

/**
 * Source rattachée à une valeur financière
 */
export interface FinancialValueSource {
  document_name: string;
  document_type: BudgetEventType | BudgetDocumentCategory;
  fiscal_year: number;
  page?: number;
  date?: string;
  reference?: string;
  url?: string;
  publisher?: string;
}

/**
 * Valeur financière qualifiée avec traçabilité intégrale
 */
export interface BudgetFinancialValue {
  amount: number | null;
  precision: AmountPrecision;
  origin: ValueOriginType;
  formula?: string; // Formule explicite si DERIVED_VALUE (ex: "618 000 000 (BP) + 120 000 000 (Modifications)")
  sources: FinancialValueSource[];
  notes?: string;
}

/**
 * Modification budgétaire unitaire (BS, BM1, BM2, Décision modificative, Virement)
 */
export interface BudgetAmendment {
  id: string;
  institution_id: string;
  fiscal_year: number;
  budget_type: BudgetEventType;
  version_number?: number;
  label: string;
  amount_semantics: AmendmentAmountSemantics;
  total_delta: number | null;
  operating_delta: number | null;
  investment_delta: number | null;
  precision: AmountPrecision;
  source: {
    name: string;
    reference: string;
    date?: string;
    date_kind?: 'PUBLISHED' | 'ACCESSED' | 'RECORDED';
    url?: string;
    page?: number;
  };
  adoption_date?: string;
  tutelle_approval_date?: string;
  notes?: string;
  is_negative?: boolean; // Réduction de crédits
}

/**
 * Synthèse consolidée du cycle budgétaire complet d'une collectivité pour un exercice
 */
export interface BudgetCycleConsolidation {
  institution_id: string;
  institution_name: string;
  fiscal_year: number;

  // Étapes distinctes du budget initial (Item 3 : ne pas écraser chronologie)
  primitive_adopted?: LocalBudget | null;
  primitive_after_tutelle?: LocalBudget | null;
  execution_authorized?: LocalBudget | null;
  
  // 1. Budget Initial (référence retenue pour le cycle)
  initial_budget: {
    total: BudgetFinancialValue;
    operating: BudgetFinancialValue;
    investment: BudgetFinancialValue;
    document?: LocalBudget;
    adoption_date?: string;
    tutelle_approval_date?: string;
  } | null;

  // 2. Modifications Budgétaires (BS, BM, Décisions, Virements)
  amendments: BudgetAmendment[];
  amendments_status: 'DOCUMENTED' | 'NO_AMENDMENTS_FOUND_PUBLICLY';
  amendment_chain_status: AmendmentChainStatus;
  amendments_explanation: string;
  net_amendments: {
    total: number | null;
    operating: number | null;
    investment: number | null;
    precision: AmountPrecision;
  };

  // Montant ajusté documenté provisoire (si chaîne partielle, distinct de crédits définitifs)
  documented_adjusted_amount?: {
    total: number | null;
    operating: number | null;
    investment: number | null;
    precision: AmountPrecision;
    formula?: string;
  };

  // 3. Crédits Définitifs (Item 2 & 14 : distingué de BP)
  final_credits_status: FinalCreditsStatus;
  final_credits: {
    total: BudgetFinancialValue;
    operating: BudgetFinancialValue;
    investment: BudgetFinancialValue;
    is_derived: boolean;
  } | null;
  final_credits_notice?: string;

  // 4. Compte Administratif (Exécution Financière de Clôture)
  administrative_account: AdministrativeAccount | null;

  // 5. Comparaisons Civiques & Doubles Taux d'Exécution
  execution_comparison: {
    // Taux vs Crédits Définitifs (si statut SOURCE_CONFIRMED ou DERIVED_FROM_DOCUMENTED_AMENDMENTS)
    vs_final_credits: {
      total: ExecutionRateResult;
      operating: ExecutionRateResult;
      investment: ExecutionRateResult;
    } | null;
    // Taux vs Budget Primitif Initial (taux d'orientation initial)
    vs_initial_budget: {
      total: ExecutionRateResult;
      operating: ExecutionRateResult;
      investment: ExecutionRateResult;
    } | null;
  } | null;

  // 6. Alertes civiques et statut de corroboration
  civic_notices: {
    has_operating_overrun: boolean;
    has_missing_modifications_notice: boolean;
    notice_text: string;
    evidence_disclaimer: string;
  };
}

// =========================================================================
// TYPES : CONSOLE DOCUMENTAIRE & WORKFLOW D'EXTRACTION
// =========================================================================

/**
 * Section financière d'une ligne extraite
 */
export type FinancialSection = 'FONCTIONNEMENT' | 'INVESTISSEMENT' | 'GLOBAL' | 'RECETTES' | 'AUTRE';

/**
 * Nature budgétaire d'une ligne
 */
export type FinancialNature = 'PREVISION' | 'MODIFICATION' | 'EXECUTION' | 'ORDONNANCEMENT' | 'RECOUVREMENT' | 'MARCHE';

/**
 * Valeur unitaire proposée pour validation humaine
 */
export interface ProposedFinancialValue {
  id: string;
  field: string;
  label: string;
  section: FinancialSection;
  nature: FinancialNature;
  amount: number | null; // NULL != 0
  precision: AmountPrecision;
  source_page?: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
  status: 'PENDING' | 'VALIDATED' | 'CORRECTED' | 'MARKED_UNKNOWN' | 'REJECTED';
  original_amount?: number | null;
  correction_reason?: string;
}

/**
 * Métadonnées d'un document budgétaire à ingérer
 */
export interface DocumentIngestionMetadata {
  institution_id: string;
  institution_name?: string;
  fiscal_year: number;
  document_type: BudgetDocumentCategory;
  source_name: string;
  source_reference: string;
  source_date: string;
  source_date_kind: 'PUBLISHED' | 'ACCESSED' | 'RECORDED';
  source_url?: string;
  source_page?: number;
  notes?: string;
  file_name?: string;
  amount_semantics?: AmendmentAmountSemantics;
  amendment_chain_status?: AmendmentChainStatus;
  version_number?: number;
}

/**
 * Résultat du contrôle de cohérence préalable (Dry-Run)
 */
export interface DocumentDryRunResult {
  is_valid: boolean;
  can_import: boolean;
  errors: string[];
  warnings: string[];
  conflicts: string[];
  checks: {
    institution_exists: boolean;
    fiscal_year_coherent: boolean;
    source_metadata_complete: boolean;
    duplicate_detected: boolean;
    arithmetic_valid: boolean;
    conflicts_with_published: boolean;
    unknown_values_count: number;
    zero_values_count: number;
    fingerprint?: string;
  };
  summary_message: string;
}
