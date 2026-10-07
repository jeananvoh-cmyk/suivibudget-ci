import type { LocalBudget, LocalInstitutionType } from '../../types/localBudget';
import type { AdministrativeAccount } from '../../types/administrativeAccount';
import { isInitialBudget } from '../../utils/budgetCycleEngine';

export type BudgetVersion = Pick<LocalBudget, 'id' | 'institution_id' | 'institution_type' | 'fiscal_year'
  | 'budget_type' | 'status' | 'is_current_version' | 'amount_precision' | 'total_amount' | 'verification_status'>;
export interface LocalReviewScope { institutionId: string; institutionType: LocalInstitutionType; fiscalYear: number }

/** No imports or version selection by array order. Versions are alternatives, never additive. */
export function collectivityDossier(scope: LocalReviewScope, budgets: readonly BudgetVersion[],
  accounts: readonly AdministrativeAccount[] = []) {
  const matching = budgets.filter(b => b.institution_id === scope.institutionId
    && b.institution_type === scope.institutionType && b.fiscal_year === scope.fiscalYear);
  const candidates = matching.filter(b => b.status === 'PUBLISHED' && b.is_current_version && isInitialBudget(b.budget_type));
  const duplicateIds = new Set(matching.map(b => b.id)).size !== matching.length;
  const conflict = duplicateIds || candidates.length > 1;
  const selected = !conflict && candidates.length === 1 ? candidates[0] : null;
  const sourceConfirmed = selected?.verification_status === 'OFFICIAL_DOCUMENT';
  const usableAmount = sourceConfirmed && selected?.amount_precision === 'EXACT' && selected.total_amount !== null
    && Number.isSafeInteger(selected.total_amount) && selected.total_amount >= 0;
  const caCandidates = accounts.filter(c => c.institution_id === scope.institutionId
    && c.institution_type === scope.institutionType && c.fiscal_year === scope.fiscalYear);
  return {
    scope,
    countedAsCollectivity: scope.institutionType !== 'AUTONOMOUS_DISTRICT',
    budgetId: selected?.id ?? null,
    initialBudget: usableAmount ? selected!.total_amount : null,
    finalCredits: null,
    executionRate: null,
    status: conflict ? 'BLOCKED' as const : usableAmount ? 'AVAILABLE' as const : 'UNKNOWN' as const,
    reasons: conflict ? ['AMBIGUOUS_BUDGET_VERSION'] : !usableAmount ? ['OFFICIAL_EXACT_BUDGET_REQUIRED'] : [],
    administrativeAccountIds: caCandidates.map(c => c.id).sort(),
    // A CA may contain revenues or ordered expenditure: do not infer a paid amount from total_realized.
    executionStatus: caCandidates.length > 1 ? 'BLOCKED' as const : 'UNKNOWN' as const,
  };
}
