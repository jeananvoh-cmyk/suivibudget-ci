import { describe, expect, it } from 'vitest';
import registry from '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json';
import decree from '../../../docs/references/2026/ministry-reconciliation/DECREE_2026_84_ADMINISTRATIVE_MAPPING_35.json';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';

describe('2026 legal attributions of 35 government portfolios', () => {
  const officialIds = new Set(GOVERNMENT_OFFICIALS.map(x => x.id));
  const decreeIds = decree.entries.map(x => x.id);
  const byId = new Map(decree.entries.map(x => [x.id, x]));

  it('provides exactly one official-annex PDF locator for every public government card', () => {
    expect(decree.entries).toHaveLength(35);
    expect(new Set(decreeIds).size).toBe(35);
    expect(new Set(decreeIds)).toEqual(officialIds);
    expect(decree.annex_official_pdf).toBe('https://www.gouv.ci/uploads/publications/177580607447.pdf');
    for (const item of decree.entries) {
      expect(item.pdf_page).toBeGreaterThanOrEqual(2);
      expect(item.pdf_page).toBeLessThanOrEqual(11);
      expect(item.verified_type).toBe('LEGAL_ADMINISTRATIVE_TUTELLE_STRUCTURE_NOT_BUDGET_ALLOCATION');
    }
  });

  it('binds all 35 documentary records to the legal decree without claiming budget allocation', () => {
    expect(registry.institutions).toHaveLength(35);
    for (const item of registry.institutions) {
      const legal = item.administrative_attribution_provenance;
      expect(legal).toBeDefined();
      expect(legal?.decree).toBe('2026-84');
      expect(legal?.annex_pdf_page).toBe(byId.get(item.institution_id)?.pdf_page);
      expect(legal?.scope_status).toBe('ADMINISTRATIVE_TUTELLE_CONFIRMED');
      expect(legal?.budget_CP_reallocation_certified).toBe(false);
    }
  });

  it('preserves financial non-double-counting despite clarification of tutelle structures', () => {
    expect(byId.get('gov-009')?.pdf_page).toBe(4);
    expect(byId.get('gov-035')?.pdf_page).toBe(4);
    expect(byId.get('gov-010')?.pdf_page).toBe(5);
    expect(byId.get('gov-032')?.pdf_page).toBe(5);
    expect(byId.get('gov-024')?.pdf_page).toBe(9);
    expect(byId.get('gov-034')?.pdf_page).toBe(9);
    expect(decree.explicit_non_coverage).toContain('budget_credit_transfers');
    expect(decree.composite_cases.find(c => c.ids.includes('gov-035'))?.budget_conclusion)
      .toContain('NO_SEPARATE_DELEGATED_CP_PROVEN');
  });
});
