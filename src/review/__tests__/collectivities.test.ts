import { describe, it, expect } from 'vitest';
import { collectivityDossier, type BudgetVersion } from '../domain/collectivities';
import type { SourceDocument } from '../domain/documents';
const scope = { institutionId: 'test-only', institutionType: 'COMMUNE' as const, fiscalYear: 2026 };
const evidence = { documentId: 'test-only', fiscalYear: 2026, page: 1, reference: null, verification: 'VERIFIED' as const };
const doc: SourceDocument = { id: 'test-only', title: 'Test only', publisher: 'Test only', officialUrl: 'https://example.org/test',
  fiscalYear: 2026, accessedAt: '2026-10-07', httpStatus: 200, sha256: 'a'.repeat(64), pageCount: 1,
  verification: 'VERIFIED', visibility: 'PUBLIC', previousVersionId: null };
const budget: BudgetVersion = { id: 'test-budget', institution_id: 'test-only', institution_type: 'COMMUNE',
  fiscal_year: 2026, budget_type: 'PRIMITIF_ADOPTE', status: 'PUBLISHED', is_current_version: true,
  amount_precision: 'EXACT', total_amount: 100, verification_status: 'OFFICIAL_DOCUMENT', evidence };
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
    expect(collectivityDossier(scope, [budget, { ...budget, id: 'old', is_current_version: false }], [], [doc]).initialBudget).toBe(100);
    expect(collectivityDossier(scope, [{ ...budget, status: 'VERIFIED' }]).initialBudget).toBeNull();
  });
  it('rejects secondary, approximate and null amounts without changing them', () => {
    for (const patch of [{ total_amount: null }, { verification_status: 'SECONDARY_TO_CORROBORATE' as const }, { amount_precision: 'APPROXIMATE' as const }]) {
      const input = Object.freeze({ ...budget, ...patch });
      expect(collectivityDossier(scope, [input]).initialBudget).toBeNull();
    }
  });
  it('preserves zero, excludes other exercises and distinguishes districts', () => {
    expect(collectivityDossier(scope, [{ ...budget, total_amount: 0 }], [], [doc]).initialBudget).toBe(0);
    expect(collectivityDossier(scope, [{ ...budget, fiscal_year: 2025 }]).initialBudget).toBeNull();
    expect(collectivityDossier({ ...scope, institutionType: 'AUTONOMOUS_DISTRICT' }, []).countedAsCollectivity).toBe(false);
  });
  it('rejects duplicated IDs even if one version is archived', () => {
    expect(collectivityDossier(scope, [budget, { ...budget, is_current_version: false }]).status).toBe('BLOCKED');
  });
  it('does not accept a verification flag without an accessible public source', () => {
    expect(collectivityDossier(scope, [budget]).initialBudget).toBeNull();
    expect(collectivityDossier(scope, [budget], [], [{ ...doc, visibility: 'PRIVATE' }]).initialBudget).toBeNull();
  });
});
