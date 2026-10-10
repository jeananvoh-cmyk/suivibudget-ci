import { describe, expect, it } from 'vitest';
import documentationRegistry from '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';

interface CanonicalBudget {
  institution_code: string;
  totals: {
    total_ministry_2026_fcfa: number;
    programs_sum_2026_fcfa: number;
    actions_sum_2026_fcfa: number;
    programs_delta: number;
    actions_delta: number;
    reconciliation_status: string;
  };
}

const canonicalFiles = import.meta.glob('../../../docs/references/2026/ministry-*/*_CANONICAL_BUDGET_2026.json', {
  eager: true,
  import: 'default',
}) as Record<string, CanonicalBudget>;

describe('2026 documentation registry consistency against canonical sources', () => {
  it('references exactly 35 unique portfolio identities', () => {
    expect(documentationRegistry.institutions).toHaveLength(35);
    expect(new Set(documentationRegistry.institutions.map(x => x.institution_id)).size).toBe(35);
  });

  it('keeps every registered canonical total synchronized with its reconciled source', () => {
    const sourced = documentationRegistry.institutions.filter(x => x.canonical_reference_path);
    expect(sourced).toHaveLength(12);
    for (const item of sourced) {
      const path = '../../../' + item.canonical_reference_path;
      const budget = canonicalFiles[path];
      expect(budget, `Missing canonical file for ${item.institution_id}: ${path}`).toBeDefined();
      expect(item.dgbf_code).toBe(budget.institution_code);
      const total = budget.totals.total_ministry_2026_fcfa;
      expect(item.total_budget_2026_fcfa, item.institution_id).toBe(total);
      expect(budget.totals.programs_sum_2026_fcfa).toBe(total);
      expect(budget.totals.actions_sum_2026_fcfa).toBe(total);
      expect(budget.totals.programs_delta).toBe(0);
      expect(budget.totals.actions_delta).toBe(0);
      expect(budget.totals.reconciliation_status).toBe('RECONCILED');
    }
  });

  it('keeps six corrected public directory totals aligned with canonical CP evidence', () => {
    const correctedIds = ['gov-005', 'gov-018', 'gov-025', 'gov-031', 'gov-032', 'gov-034'];
    for (const id of correctedIds) {
      const item = documentationRegistry.institutions.find(x => x.institution_id === id);
      expect(item?.canonical_reference_path).toBeTruthy();
      const budget = canonicalFiles['../../../' + item!.canonical_reference_path];
      const official = GOVERNMENT_OFFICIALS.find(x => x.id === id);
      expect(official?.budget_fcfa, id).toBe(budget.totals.total_ministry_2026_fcfa);
    }
  });

  it('does not manufacture a canonical total for portfolios without a canonical file', () => {
    for (const item of documentationRegistry.institutions) {
      if (item.canonical_reference_path) continue;
      expect(item.total_budget_2026_fcfa, item.institution_id).toBeNull();
    }
  });
});
