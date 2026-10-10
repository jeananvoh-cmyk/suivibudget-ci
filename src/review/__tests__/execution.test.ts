import { describe, expect, it } from 'vitest';
import { assessObservation, type FinancialObservation } from '../domain/evidence';
import { executionRate } from '../domain/execution';

// Arithmetic test inputs only: never official records, never loaded by the review UI.
export function observation(overrides: Partial<FinancialObservation> = {}): FinancialObservation {
  return { institutionId: 'test-only', sectionCode: null, fiscalYear: 2026, scope: 'test-scope',
    periodEnd: '2026-12-31', currency: 'XOF', measure: 'PLANNED', basis: 'FINAL_CREDITS',
    amount: 100, precision: 'EXACT', evidence: { documentId: 'test-only', page: 1, reference: null,
      fiscalYear: 2026, verification: 'VERIFIED' }, ...overrides };
}

describe('LOT 6 — execution with explicit documentary boundaries', () => {
  it.each([null, undefined, NaN, Infinity, -1])('does not turn invalid amount %s into zero', amount => {
    expect(assessObservation(observation({ amount: amount as number | null })).value).toBeNull();
  });
  it('preserves an evidenced zero and rates above 100%', () => {
    expect(assessObservation(observation({ amount: 0 })).value).toBe(0);
    expect(executionRate(observation(), observation({ measure: 'PAID', basis: 'EXECUTION', amount: 120 })).value).toBe(120);
  });
  it('never returns a zero or 100% rate for a zero denominator', () => {
    expect(executionRate(observation({ amount: 0 }), observation({ measure: 'PAID', basis: 'EXECUTION', amount: 0 })).value).toBeNull();
  });
  it.each(['gov-017', 'gov-030', 'gov-034'])('does not retain a resolved LOT 5 blocker for %s', institutionId => {
    expect(assessObservation(observation({ institutionId })).status).toBe('AVAILABLE');
  });
  it('requires same period, scope and financial measure', () => {
    for (const patch of [{ periodEnd: '2026-06-30' }, { scope: 'other' }, { measure: 'COLLECTED' as const }]) {
      expect(executionRate(observation(), observation({ basis: 'EXECUTION', measure: 'PAID', ...patch })).status).toBe('NOT_COMPARABLE');
    }
  });
  it('requires documentary verification and exact amounts', () => {
    expect(assessObservation(observation({ evidence: null })).value).toBeNull();
    expect(assessObservation(observation({ precision: 'APPROXIMATE' })).value).toBeNull();
  });
});
