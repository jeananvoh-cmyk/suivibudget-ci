import { MinistryBudget } from '../types/ministryBudget';
import mmpeDataRaw from './ministryBudgets/2026/mmpe.json';

// ============================================================================
// RÉFÉRENTIEL DES BUDGETS MINISTÉRIELS (LOT 2)
// Données officielles externalisées dans ./ministryBudgets/2026/
// Conforme à la nomenclature DGBF 2026 (10 Programmes officiels pour le MMPE)
// ============================================================================

export const MMPE_INSTITUTION_ID = 'gov-008';

export const MMPE_MINISTRY_BUDGET_2026: MinistryBudget = mmpeDataRaw as unknown as MinistryBudget;

export const OFFICIAL_MINISTRY_BUDGETS: Record<string, MinistryBudget> = {
  [MMPE_INSTITUTION_ID]: MMPE_MINISTRY_BUDGET_2026,
};

export function getMinistryBudget(institutionId: string, fiscalYear: number = 2026): MinistryBudget | null {
  const budget = OFFICIAL_MINISTRY_BUDGETS[institutionId];
  if (!budget || budget.fiscal_year !== fiscalYear) return null;
  return budget;
}

export function isPilotMinistry(institutionId: string): boolean {
  return institutionId === MMPE_INSTITUTION_ID;
}

export interface MinistryArithmeticCheck {
  total_budget_fcfa: number | null;
  programs_sum_fcfa: number;
  programs_delta_fcfa: number;
  programs_reconciliation_status: 'RECONCILED' | 'SOURCE_GAP';
  actions_checks: {
    program_id: string;
    program_code: string;
    program_name: string;
    program_amount_fcfa: number | null;
    actions_sum_fcfa: number;
    actions_delta_fcfa: number;
    status: 'RECONCILED' | 'SOURCE_GAP';
  }[];
  total_projects_count: number;
  total_projects_sum_fcfa: number;
}

export function performMinistryArithmeticCheck(budget: MinistryBudget): MinistryArithmeticCheck {
  let programsSum = 0;
  const actionsChecks: MinistryArithmeticCheck['actions_checks'] = [];
  let totalProjectsCount = 0;
  let totalProjectsSum = 0;

  for (const prog of budget.programs) {
    if (prog.amount_fcfa != null) {
      programsSum += prog.amount_fcfa;
    }

    let actionsSum = 0;
    for (const act of prog.actions) {
      if (act.amount_fcfa != null) {
        actionsSum += act.amount_fcfa;
      }
      if (act.linked_projects) {
        totalProjectsCount += act.linked_projects.length;
        for (const proj of act.linked_projects) {
          totalProjectsSum += proj.budget_amount_fcfa;
        }
      }
    }

    const progAmount = prog.amount_fcfa ?? 0;
    const actionsDelta = actionsSum - progAmount;
    actionsChecks.push({
      program_id: prog.id,
      program_code: prog.official_code || prog.code,
      program_name: prog.name,
      program_amount_fcfa: prog.amount_fcfa,
      actions_sum_fcfa: actionsSum,
      actions_delta_fcfa: actionsDelta,
      status: actionsDelta === 0 ? 'RECONCILED' : 'SOURCE_GAP',
    });
  }

  const expectedTotal = budget.total_budget_fcfa ?? 0;
  const programsDelta = programsSum - expectedTotal;

  return {
    total_budget_fcfa: budget.total_budget_fcfa,
    programs_sum_fcfa: programsSum,
    programs_delta_fcfa: programsDelta,
    programs_reconciliation_status: programsDelta === 0 ? 'RECONCILED' : 'SOURCE_GAP',
    actions_checks: actionsChecks,
    total_projects_count: totalProjectsCount,
    total_projects_sum_fcfa: totalProjectsSum,
  };
}
