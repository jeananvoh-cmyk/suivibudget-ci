import { describe, expect, it } from 'vitest';
import { getBudgetLinesForEntity, NATIONAL_INSTITUTIONS_EXTRA_LINES } from '../../data/budgetLinesData';

describe('HABG and IGE 2026 per-line provenance gate', () => {
  it.each([
    ['inst-habg', 'La Haute Autorité pour la Bonne Gouvernance (HABG)'],
    ['inst-ige', "Inspection Générale d'État (IGE)"],
  ])('does not publish unsupported financial lines for %s', (id, name) => {
    expect(NATIONAL_INSTITUTIONS_EXTRA_LINES[id]).toEqual([]);
    expect(getBudgetLinesForEntity(name, 'GRANDE_INSTITUTION', undefined, id)).toEqual([]);
    expect(getBudgetLinesForEntity(name, 'GRANDE_INSTITUTION')).toEqual([]);
    expect(getBudgetLinesForEntity(name, undefined, undefined, id)).toEqual([]);
  });
});
