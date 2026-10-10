import { describe, expect, it } from 'vitest';
import residuals from '../../../docs/references/2026/ministry-reconciliation/PR31_FOUR_UNEXPLAINED_LEGACY_RESIDUALS_2026.json';
import c2d from '../../../docs/references/2026/ministry-reconciliation/PR31_C2D_2026_DISCREPANCY_PROVENANCE.json';
import legal from '../../../docs/references/2026/ministry-reconciliation/LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';

describe('four still-unexplained 2026 historical registry residuals', () => {
  it('recalculates all four exact differences without rounding or manufacturing values', () => {
    expect(residuals.residuals).toHaveLength(4);
    const map = Object.fromEntries(residuals.residuals.map(r => [r.id, r]));
    expect(Object.keys(map).sort()).toEqual(['gov-006','gov-011','gov-013','gov-025']);
    expect([map['gov-006'].residual_fcfa, map['gov-011'].residual_fcfa,
      map['gov-013'].residual_fcfa, map['gov-025'].residual_fcfa])
      .toEqual([-370_246, 481_394, 283_456, 239_982]);
    for (const r of residuals.residuals) {
      expect(Number.isSafeInteger(r.legacy)).toBe(true);
      expect(r.voted + (r.c2d ?? 0)).toBe(r.voted_plus_identified_c2d_fcfa);
      expect(r.legacy - r.voted_plus_identified_c2d_fcfa).toBe(r.residual_fcfa);
      expect(legal.rows.find(x => x.portfolio_id === r.id)?.voted_section_cp_2026_fcfa)
        .toBe(r.voted);
      expect(r.independent_portfolio_certification).toBe(false);
      expect(r.historical_record_status).toBe('PROVENANCE_UNVERIFIED');
      const original = c2d.historical_discrepancy_audit.find(x => x.portfolio_id === r.id);
      expect(original?.legacy_directory_fcfa).toBe(r.legacy);
      expect(original?.lfi_general_section_cp_2026_fcfa).toBe(r.voted);
      expect(original?.c2d_section_cp_2026_fcfa ?? null).toBe(r.c2d);
      if (r.c2d != null) expect(original?.discrepancy_minus_c2d_fcfa).toBe(r.residual_fcfa);
      expect(GOVERNMENT_OFFICIALS.find(x => x.id === r.id)?.budget_fcfa).toBeUndefined();
    }
  });

  it('records the exact scanned official PDF bytes and limits of negative textual evidence', () => {
    expect(residuals.pages_checked).toBe(1901);
    expect(residuals.source_documents).toHaveLength(3);
    expect(residuals.source_documents.reduce((x, d) => x + d.physical_pages, 0)).toBe(1901);
    for (const doc of residuals.source_documents) expect(doc.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(residuals.method).toContain('does not prove');
  });
});
