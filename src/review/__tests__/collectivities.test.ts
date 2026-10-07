import { describe, it, expect } from 'vitest';
import { collectivityDossier, type BudgetVersion } from '../domain/collectivities';
const scope = { institutionId: 'test-only', institutionType: 'COMMUNE' as const, fiscalYear: 2026 };
const budget: BudgetVersion = { id: 'test-budget', institution_id: 'test-only', institution_type: 'COMMUNE',
  fiscal_year: 2026, budget_type: 'PRIMITIF_ADOPTE', status: 'PUBLISHED', is_current_version: true,
  amount_precision: 'EXACT', total_amount: 100, verification_status: 'OFFICIAL_DOCUMENT' };
describe('LOT 7 — local budget dossiers', () => {
  it('keeps missing budgets and execution unknown', () => {
    expect(collectivityDossier(scope, [])).toMatchObject({ initialBudget: null, executionRate: null, status: 'UNKNOWN' });
  });
  it('does not sum versions or choose one by input order', () => {
    const versions = [budget, { ...budget, id: 'second', total_amount: 200 }];
    expect(collectivityDossier(scope, versions).status).toBe('BLOCKED');
    expect(collectivityDossier(scope, versions.reverse()).initialBudget).toBeNull();
  });
  it('selects only the explicit published current version', () => {
    expect(collectivityDossier(scope, [budget, { ...budget, id: 'old', is_current_version: false }]).initialBudget).toBe(100);
    expect(collectivityDossier(scope, [{ ...budget, status: 'VERIFIED' }]).initialBudget).toBeNull();
  });
  it('rejects secondary, approximate and null amounts without changing them', () => {
    for (const patch of [{ total_amount: null }, { verification_status: 'SECONDARY_TO_CORROBORATE' as const }, { amount_precision: 'APPROXIMATE' as const }]) {
      const input = Object.freeze({ ...budget, ...patch });
      expect(collectivityDossier(scope, [input]).initialBudget).toBeNull();
    }
  });
  it('preserves zero, excludes other exercises and distinguishes districts', () => {
    expect(collectivityDossier(scope, [{ ...budget, total_amount: 0 }]).initialBudget).toBe(0);
    expect(collectivityDossier(scope, [{ ...budget, fiscal_year: 2025 }]).initialBudget).toBeNull();
    expect(collectivityDossier({ ...scope, institutionType: 'AUTONOMOUS_DISTRICT' }, []).countedAsCollectivity).toBe(false);
  });
  it('rejects duplicated IDs even if one version is archived', () => {
    expect(collectivityDossier(scope, [budget, { ...budget, is_current_version: false }]).status).toBe('BLOCKED');
  });
});
