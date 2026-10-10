import { describe, expect, it } from 'vitest';
import { selectMinistryBudgetAmount } from '../ministryBudgetSelection';

describe('ministry budget display source priority', () => {
  it('uses directory value only if no institution store record exists', () => {
    expect(selectMinistryBudgetAmount(100, false)).toBe(100);
    expect(selectMinistryBudgetAmount(null, false)).toBeUndefined();
  });
  it('never revives a static amount when store explicitly says unknown', () => {
    expect(selectMinistryBudgetAmount(100, true, null)).toBeUndefined();
    expect(selectMinistryBudgetAmount(100, true, undefined)).toBeUndefined();
  });
  it('preserves legitimate zero without falling back to a directory amount', () => {
    expect(selectMinistryBudgetAmount(100, true, 0)).toBe(0);
  });
  it('preserves nonzero store amount without silently mixing data sources', () => {
    expect(selectMinistryBudgetAmount(100, true, 97)).toBe(97);
  });
});
