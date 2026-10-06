// Modèle de Données Budgétaires des Ministères de l'État (LOT 2 Pilote)
// Conforme à la nomenclature budgétaire de l'État de Côte d'Ivoire (Budget-Programmes DGBF)
// Architecture : ÉTAT → MINISTÈRE → PROGRAMMES (10) → ACTIONS → ACTIVITÉS / CRÉDITS (Nature Économique)
// Projets liés rattachés sans double comptage (Budget Line ≠ Project)

export type EvidenceType =
  | 'PRIMARY_OFFICIAL_DOCUMENT'
  | 'INSTITUTIONAL_OFFICIAL_SOURCE'
  | 'SECONDARY_INSTITUTIONAL_CORROBORATION';

export type ReconciliationStatus =
  | 'RECONCILED'
  | 'PARTIAL'
  | 'NOT_COMPARABLE'
  | 'SOURCE_GAP';

export type EconomicNature =
  | 'Personnel'
  | 'Biens et services'
  | 'Transferts'
  | 'Investissements'
  | 'Comptes spéciaux';

export interface BudgetActivity {
  id: string;
  action_id: string;
  code?: string;
  official_code?: string;
  name: string;
  amount_fcfa: number | null;
  economic_nature?: EconomicNature | string;
  fiscal_year: number;
}

export interface ProjectSourceLine {
  official_code?: string;
  amount_fcfa: number | null;
  financing_type?: 'TRESOR' | 'FINANCEMENT_EXTERIEUR' | 'OTHER' | string;
  economic_nature?: 'INVESTISSEMENTS' | string;
  page_reference?: string;
  table_reference?: string;
}

export interface MinistryLinkedProject {
  id: string;
  internal_id?: string;
  code: string;
  official_code: string; // Code officiel DGBF (ex: '90043500010')
  title: string;
  budget_amount_fcfa: number;
  program_id: string;
  action_id: string;
  current_status: string;
  region_name?: string;
  page_reference?: string;
  table_reference?: string;
  source_url?: string;
  source_lines?: ProjectSourceLine[];
  amount_derivation?: 'DIRECT_SOURCE_LINE' | 'SUM_OF_OFFICIAL_SOURCE_LINES';
  citizen_description?: string;
  is_funded_within_action: boolean; // Toujours true pour formaliser l'absence de double comptage
}

export interface BudgetAction {
  id: string;
  program_id: string;
  code: string;
  official_code: string; // Ex: '2110601'
  name: string; // Libellé officiel DGBF
  description?: string;
  citizen_description?: string;
  amount_fcfa: number | null;
  reconciliation_status: ReconciliationStatus;
  page_reference?: string;
  table_reference?: string;
  source?: string;
  source_url?: string;
  evidence_status?: string;
  evidence_type?: EvidenceType;
  activities?: BudgetActivity[];
  linked_projects?: MinistryLinkedProject[];
}

export interface BudgetProgram {
  id: string;
  ministry_id: string;
  code: string;
  official_code: string; // Ex: '21106', '22037' (code canonique DGBF)
  name: string;
  description: string;
  amount_fcfa: number | null;
  percentage_of_ministry?: number | null;
  responsible_title?: string;
  reconciliation_status: ReconciliationStatus;
  page_reference?: string;
  source_url?: string;
  actions: BudgetAction[];
}

export interface MinistryBudget {
  id: string;
  institution_id: string;
  institution_code?: string; // Ex: '348'
  institution_name: string;
  minister_name?: string;
  fiscal_year: number;
  total_budget_fcfa: number | null;
  amount_precision: 'EXACT' | 'APPROXIMATE';
  reconciliation_status: ReconciliationStatus;
  programs: BudgetProgram[];
  source: string;
  source_url: string;
  evidence_type: EvidenceType;
  document_reference: string;
  page_reference?: string;
  created_at: string;
  updated_at: string;
}
