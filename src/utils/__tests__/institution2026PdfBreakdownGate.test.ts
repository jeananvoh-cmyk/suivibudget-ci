import { describe, expect, it } from 'vitest';
import { NATIONAL_INSTITUTIONS_DATA } from '../../data/nationalBudgetData';
import { NATIONAL_INSTITUTIONS_SECTIONS } from '../institutionBudgetHelper';

const lfi2026Totals: Record<string, number | null> = {
  'inst-presidence': 193633705615,
  'inst-assnat': 38578972451,
  'inst-senat': 14665806742,
  'inst-conseil-const': 3860437235,
  'inst-cour-supreme': null,
  'inst-cour-comptes': 8851161351,
  'inst-conseil-etat': 5164531081,
  'inst-cour-cassation': 7931309608,
  'inst-mediateur': 8285468221,
  'inst-ige': 9872577575,
  'inst-chancellerie': 3743870172,
  'inst-cesec': 8069692846,
  'inst-cnrct': 5794171874,
  'inst-habg': 5552174916,
};

describe('LFI 2026 institution financial source scope', () => {
  it('preserves all 13 independently located programme/section totals and does not fabricate the Cour suprême', () => {
    expect(NATIONAL_INSTITUTIONS_DATA).toHaveLength(14);
    expect(Object.keys(lfi2026Totals)).toHaveLength(14);
    for (const institution of NATIONAL_INSTITUTIONS_DATA) {
      expect(institution.total_budget_fcfa).toBe(lfi2026Totals[institution.id]);
      if (institution.total_budget_fcfa !== null) {
        expect(NATIONAL_INSTITUTIONS_SECTIONS[institution.id]?.lfi_amount_fcfa).toBe(institution.total_budget_fcfa);
      }
    }
  });

  it('does not publish operating/investment percentages without same-scope documented components', () => {
    for (const institution of NATIONAL_INSTITUTIONS_DATA) {
      expect(institution.budget_functioning_fcfa, institution.id).toBeNull();
      expect(institution.budget_investment_fcfa, institution.id).toBeNull();
    }
  });

  it('keeps HABG and IGE inside the President section, avoiding double counting', () => {
    expect(NATIONAL_INSTITUTIONS_SECTIONS['inst-presidence'].section_code).toBe('103');
    expect(NATIONAL_INSTITUTIONS_SECTIONS['inst-habg']).toMatchObject({ section_code: '103', program_code: '13004' });
    expect(NATIONAL_INSTITUTIONS_SECTIONS['inst-ige']).toMatchObject({ section_code: '103', program_code: '13003' });
  });
});
