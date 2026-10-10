import { describe, expect, it } from 'vitest';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';
import exceptions from '../../../docs/audits/local-budgets/2026_UNRECONCILED_PRIMITIVE_SPLITS.json';

describe('2026 communal and regional primitive budget integrity', () => {
  it('retains the 46 existing municipal and regional BP source references', () => {
    const entries = Object.entries(OFFICIAL_PRIMITIVE_BUDGETS);
    expect(entries).toHaveLength(46);
    for (const [id, budget] of entries) {
      expect(id).toMatch(/^inst-(com|reg)-/);
      expect(budget.total_voted_fcfa, id).toBeGreaterThan(0);
      expect(Number.isSafeInteger(budget.total_voted_fcfa), id).toBe(true);
      expect(budget.source_url, id).toMatch(/^https:\/\//);
      expect(['EXACT', 'APPROXIMATE', 'LOWER_BOUND']).toContain(budget.precision);
    }
  });

  it('never publishes an arithmetically inconsistent functioning/investment breakdown', () => {
    for (const [id, budget] of Object.entries(OFFICIAL_PRIMITIVE_BUDGETS)) {
      const inv = budget.investment_voted_fcfa;
      const fct = budget.functioning_voted_fcfa;
      if (inv == null || fct == null) continue;
      expect(inv + fct, id).toBe(budget.total_voted_fcfa);
    }
  });

  it('preserves the original nine differences for documentary review instead of silently inventing a correction', () => {
    expect(exceptions.entries).toHaveLength(9);
    const ids = new Set(exceptions.entries.map(x => x.id));
    expect(ids.size).toBe(9);
    for (const row of exceptions.entries) {
      const present = OFFICIAL_PRIMITIVE_BUDGETS[row.id];
      expect(present, row.id).toBeDefined();
      expect(present.total_voted_fcfa).toBe(row.total_voted_fcfa);
      expect(present.investment_voted_fcfa).toBeNull();
      expect(present.functioning_voted_fcfa).toBeNull();
      expect(row.total_voted_fcfa -
        row.investment_voted_fcfa_reported -
        row.functioning_voted_fcfa_reported).toBe(row.difference_fcfa);
      expect(row.difference_fcfa).not.toBe(0);
    }
  });
});
