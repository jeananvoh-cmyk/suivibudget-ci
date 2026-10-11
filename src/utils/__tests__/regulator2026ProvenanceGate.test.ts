import { describe, expect, it } from 'vitest';
import { getBudgetLinesForEntity, REGULATORY_AUTHORITIES_BUDGET_LINES } from '../../data/budgetLinesData';

describe('2026 regulator line-level provenance gate', () => {
  it.each([
    ['aai-arcop', 'ARCOP'],
    ['aai-haca', 'HACA'],
    ['aai-caidp', 'CAIDP'],
    ['aai-artci', 'ARTCI'],
    ['aai-anare', 'ANARE-CI'],
    ['aai-cndh', 'CNDH'],
    ['aai-airp', 'AIRP'],
  ])('never exposes unsupported detailed appropriation for %s', (id, name) => {
    expect(REGULATORY_AUTHORITIES_BUDGET_LINES[id]).toEqual([]);
    expect(getBudgetLinesForEntity(name, 'AUTORITE_REGULATION', undefined, id)).toEqual([]);
    expect(getBudgetLinesForEntity(name, 'AUTORITE_REGULATION')).toEqual([]);
    expect(getBudgetLinesForEntity(name, undefined, undefined, id)).toEqual([]);
  });
});
