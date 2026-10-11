import { describe, expect, it } from 'vitest';
import { getBudgetLinesForEntity, REGULATORY_AUTHORITIES_BUDGET_LINES } from '../../data/budgetLinesData';

describe('2026 regulator financial provenance gate', () => {
  it.each([
    ['aai-artci', "Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI)"],
    ['aai-anare', "Autorité Nationale de Régulation du Secteur de l'Électricité (ANARE-CI)"],
  ])('never returns unverified 2026 breakdown for %s', (id, name) => {
    expect(REGULATORY_AUTHORITIES_BUDGET_LINES[id]).toEqual([]);
    expect(getBudgetLinesForEntity(name, 'AUTORITE_REGULATION', undefined, id)).toEqual([]);
    expect(getBudgetLinesForEntity(name, 'AUTORITE_REGULATION')).toEqual([]);
  });
});
