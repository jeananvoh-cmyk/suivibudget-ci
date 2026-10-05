import { MinistryBudget } from '../types/ministryBudget';
import mmpeDataRaw from './ministryBudgets/2026/mmpe.json';

// ============================================================================
// RÉFÉRENTIEL DES BUDGETS MINISTÉRIELS (LOT 2)
// Données officielles externalisées dans ./ministryBudgets/2026/
// Conforme à la nomenclature DGBF 2026 (10 Programmes officiels pour le MMPE)
// ============================================================================

export function validateMinistryBudget(data: unknown): MinistryBudget {
  if (typeof data !== 'object' || data === null) {
    throw new Error('[MinistryBudgetValidationError] Le budget ministériel doit être un objet JSON valide.');
  }

  const root = data as Record<string, unknown>;

  if (typeof root.id !== 'string' || !root.id) {
    throw new Error('[MinistryBudgetValidationError] Champ root.id manquant ou non-string.');
  }
  if (typeof root.institution_id !== 'string' || !root.institution_id) {
    throw new Error('[MinistryBudgetValidationError] Champ root.institution_id manquant ou non-string.');
  }
  if (typeof root.fiscal_year !== 'number' || root.fiscal_year <= 2000) {
    throw new Error('[MinistryBudgetValidationError] Champ root.fiscal_year invalide.');
  }
  if (root.total_budget_fcfa !== null && (typeof root.total_budget_fcfa !== 'number' || root.total_budget_fcfa < 0)) {
    throw new Error('[MinistryBudgetValidationError] Champ root.total_budget_fcfa doit être un nombre positif ou null.');
  }
  if (!Array.isArray(root.programs) || root.programs.length === 0) {
    throw new Error('[MinistryBudgetValidationError] root.programs doit être un tableau non vide.');
  }

  for (const p of root.programs) {
    if (typeof p !== 'object' || p === null) {
      throw new Error('[MinistryBudgetValidationError] Chaque programme doit être un objet non-null.');
    }
    const prog = p as Record<string, unknown>;
    if (typeof prog.code !== 'string' || !prog.code) {
      throw new Error('[MinistryBudgetValidationError] Code de programme manquant ou invalide.');
    }
    if (typeof prog.name !== 'string' || !prog.name) {
      throw new Error(`[MinistryBudgetValidationError] Nom manquant pour le programme ${prog.code}.`);
    }
    if (prog.amount_fcfa !== null && (typeof prog.amount_fcfa !== 'number' || prog.amount_fcfa < 0)) {
      throw new Error(`[MinistryBudgetValidationError] Montant amount_fcfa invalide pour le programme ${prog.code}.`);
    }
    if (!Array.isArray(prog.actions) || prog.actions.length === 0) {
      throw new Error(`[MinistryBudgetValidationError] Actions manquantes pour le programme ${prog.code}.`);
    }

    for (const a of prog.actions) {
      if (typeof a !== 'object' || a === null) {
        throw new Error('[MinistryBudgetValidationError] Chaque action doit être un objet non-null.');
      }
      const act = a as Record<string, unknown>;
      if (typeof act.code !== 'string' || !act.code) {
        throw new Error('[MinistryBudgetValidationError] Code d\'action manquant.');
      }
      if (typeof act.name !== 'string' || !act.name) {
        throw new Error(`[MinistryBudgetValidationError] Nom d\'action manquant pour ${act.code}.`);
      }
      if (act.amount_fcfa !== null && (typeof act.amount_fcfa !== 'number' || act.amount_fcfa < 0)) {
        throw new Error(`[MinistryBudgetValidationError] Montant amount_fcfa invalide pour l'action ${act.code}.`);
      }

      if (act.linked_projects !== undefined) {
        if (!Array.isArray(act.linked_projects)) {
          throw new Error(`[MinistryBudgetValidationError] linked_projects doit être un tableau pour l'action ${act.code}.`);
        }
        for (const pr of act.linked_projects) {
          if (typeof pr !== 'object' || pr === null) {
            throw new Error('[MinistryBudgetValidationError] Chaque projet lié doit être un objet.');
          }
          const proj = pr as Record<string, unknown>;
          if (typeof proj.official_code !== 'string' || !proj.official_code) {
            throw new Error('[MinistryBudgetValidationError] official_code manquant pour un projet lié.');
          }
          if (typeof proj.budget_amount_fcfa !== 'number' || proj.budget_amount_fcfa < 0) {
            throw new Error(`[MinistryBudgetValidationError] budget_amount_fcfa invalide pour le projet ${proj.official_code}.`);
          }
        }
      }
    }
  }

  return data as MinistryBudget;
}

export const MMPE_INSTITUTION_ID = 'gov-008';

export const MMPE_MINISTRY_BUDGET_2026: MinistryBudget = validateMinistryBudget(mmpeDataRaw);

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
