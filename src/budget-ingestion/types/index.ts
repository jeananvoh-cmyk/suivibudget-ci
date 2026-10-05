// Types canoniques génériques pour l'ingestion budgétaire ministérielle (LOT 3)
// Nomenclature Budget-Programmes DGBF de l'État de Côte d'Ivoire
// Invariants : UNKNOWN != 0, UNKNOWN != estimation, UNKNOWN != fallback, SOURCE_GAP != RECONCILED

export type EconomicNature =
  | 'Personnel'
  | 'Biens et services'
  | 'Transferts'
  | 'Investissements'
  | 'Comptes spéciaux'
  | string;

export type FinancingType =
  | 'TRESOR'
  | 'FINANCEMENT_EXTERIEUR'
  | 'FONDS_PROPRES'
  | 'AUTRE'
  | string;

export type AmountDerivation =
  | 'DIRECT_SOURCE_LINE'
  | 'SUM_OF_OFFICIAL_SOURCE_LINES';

export type IngestionEvidenceStatus =
  | 'DIRECTLY_VERIFIED'
  | 'SECONDARY_TO_CORROBORATE'
  | 'SOURCE_GAP';

export type IngestionReconciliationStatus =
  | 'RECONCILED'
  | 'SOURCE_GAP'
  | 'NOT_COMPARABLE';

export interface CanonicalSourceLine {
  official_code?: string;
  financing_type?: FinancingType;
  economic_nature?: EconomicNature;
  amount_fcfa?: number;
  amount_2026_fcfa?: number;
  page_reference?: string;
  table_reference?: string;
  notes?: string;
}

export interface CanonicalProject {
  official_code: string;
  official_name: string;
  program_code: string;
  action_code: string;
  economic_nature?: EconomicNature;
  consolidated_amount_2026_fcfa: number;
  amount_derivation: AmountDerivation;
  source_lines: CanonicalSourceLine[];
  page_reference?: string;
  table_reference?: string;
  source_url?: string;
  evidence_status?: IngestionEvidenceStatus;
  region_name?: string;
  citizen_description?: string;
}

export interface CanonicalActivity {
  official_code: string;
  official_name: string;
  program_code: string;
  action_code: string;
  amount_2026_fcfa: number | null;
  economic_nature?: EconomicNature;
  page_reference?: string;
  table_reference?: string;
}

export interface CanonicalAction {
  action_code: string;
  official_name: string;
  program_code?: string;
  amount_2026_fcfa: number | null;
  page_reference?: string;
  table_reference?: string;
  source_url?: string;
  evidence_status?: IngestionEvidenceStatus;
  citizen_description?: string;
  activities?: CanonicalActivity[];
}

export interface CanonicalProgram {
  program_code: string;
  official_name: string;
  program_amount_2026_fcfa: number | null;
  page_reference?: string;
  table_reference?: string;
  source_url?: string;
  responsible_title?: string;
  citizen_description?: string;
  actions: CanonicalAction[];
}

export interface CanonicalDocumentSource {
  publisher: string;
  document: string;
  url: string;
  section_reference?: string;
  page_range?: string;
  accessed_at?: string;
}

export interface CanonicalMinistryTotals {
  total_ministry_2026_fcfa: number | null;
  programs_sum_2026_fcfa?: number;
  programs_delta?: number;
  actions_sum_2026_fcfa?: number;
  actions_delta?: number;
  reconciliation_status?: IngestionReconciliationStatus;
}

export interface CanonicalMinistryExtraction {
  institution_code: string;
  institution_name: string;
  fiscal_year: number;
  extraction_date?: string;
  source: CanonicalDocumentSource;
  control_source?: CanonicalDocumentSource;
  totals: CanonicalMinistryTotals;
  programs: CanonicalProgram[];
  projects?: CanonicalProject[];
  projects_zero_in_2026?: Array<{
    official_code: string;
    official_name: string;
    program_code: string;
    action_code: string;
    reason?: string;
  }>;
}

export interface ValidationError {
  path: string;
  rule: string;
  message: string;
  critical: boolean;
}

export interface ValidationWarning {
  path: string;
  rule: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ReconciliationLevelResult {
  code: string;
  name: string;
  level: 'MINISTRY' | 'PROGRAM' | 'ACTION' | 'PROJECT';
  expected_amount_fcfa: number | null;
  observed_sum_fcfa: number;
  delta_fcfa: number;
  status: IngestionReconciliationStatus;
  sub_items_count: number;
  notes?: string;
}

export interface IngestionReconciliationReport {
  institution_code: string;
  fiscal_year: number;
  ministry_level: ReconciliationLevelResult;
  programs_level: ReconciliationLevelResult[];
  actions_level: ReconciliationLevelResult[];
  projects_summary: {
    total_projects_count: number;
    total_projects_amount_fcfa: number;
    is_funded_within_actions: boolean;
    multi_line_projects_checked: number;
    multi_line_errors_count: number;
  };
  global_status: IngestionReconciliationStatus;
}

export interface PublicationGateDecision {
  canPublish: boolean;
  blockerReasons: string[];
  warningReasons: string[];
  reviewed_at: string;
}

export interface ControlReport {
  ministry_code: string;
  ministry_name: string;
  fiscal_year: number;
  program_count: number;
  action_count: number;
  project_count: number;
  ministry_total: number | null;
  programs_sum: number;
  program_delta: number;
  actions_sum: number;
  projects_sum: number;
  reconciliation_status: IngestionReconciliationStatus;
  source_gaps: Array<{
    level: string;
    code: string;
    expected: number | null;
    observed: number;
    delta: number;
  }>;
  errors: string[];
  warnings: string[];
  can_publish: boolean;
  blockers: string[];
  generated_at: string;
}

export interface MinistryRegistryEntry {
  ministry_code: string;
  ministry_name: string;
  institution_id: string;
  fiscal_year: number;
  canonical_reference_path: string;
  application_data_path: string;
  validation_status: 'VERIFIED' | 'PENDING_DOCUMENTATION' | 'TO_VERIFY';
  publication_status: 'PUBLISHED' | 'STAGED' | 'DRAFT';
}
