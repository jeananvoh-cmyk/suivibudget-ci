import { describe, expect, it } from 'vitest';
import c2d from '../../../docs/references/2026/ministry-reconciliation/PR31_C2D_2026_DISCREPANCY_PROVENANCE.json';
import registry from '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json';
import { MINISTRY_DOCUMENTARY_DISCREPANCIES } from '../../data/ministryScopeExceptions';

describe('LFI 2026 project financing C2D and historical ministry discrepancies', () => {
  const sections = c2d.sections;
  const audits = c2d.historical_discrepancy_audit;
  const bySection = new Map(sections.map(x => [x.section_code, x]));

  it('preserves exactly 14 independent C2D CP sections totalling 74.4 billion FCFA', () => {
    expect(sections).toHaveLength(14);
    expect(new Set(sections.map(x => x.section_code)).size).toBe(14);
    expect(sections.reduce((sum, row) => sum + row.c2d_cp_2026_fcfa, 0))
      .toBe(74_400_000_000);
    expect(c2d.total_official_C2D_cp_fcfa).toBe(74_400_000_000);
    for (const section of sections) {
      expect(section.lfi_pdf_page).toBeGreaterThanOrEqual(565);
      expect(section.lfi_pdf_page).toBeLessThanOrEqual(568);
      expect(Number.isSafeInteger(section.c2d_cp_2026_fcfa)).toBe(true);
      expect(section.c2d_cp_2026_fcfa).toBeGreaterThan(0);
    }
  });

  it('accounts for all 15 original discrepancies while retaining three small residuals', () => {
    expect(audits).toHaveLength(15);
    expect(new Set(audits.map(a => a.portfolio_id)).size).toBe(15);
    const statuses = audits.reduce((acc, audit) => {
      expect(registry.institutions.some(x => x.institution_id === audit.portfolio_id)).toBe(true);
      const initialDelta = audit.legacy_directory_fcfa - audit.lfi_general_section_cp_2026_fcfa;
      expect(audit.original_discrepancy_fcfa).toBe(initialDelta);
      const c2dRow = bySection.get(audit.lfi_section);
      expect(audit.c2d_section_cp_2026_fcfa).toBe(c2dRow?.c2d_cp_2026_fcfa ?? null);
      if (c2dRow) {
        const residual = initialDelta - c2dRow.c2d_cp_2026_fcfa;
        expect(audit.discrepancy_minus_c2d_fcfa).toBe(residual);
        expect(audit.classification).toBe(
          residual === 0 ? 'EXACTLY_EXPLAINED_BY_C2D' : 'C2D_CLOSE_WITH_RESIDUAL_UNEXPLAINED',
        );
      } else {
        expect(audit.classification).toBe('NO_C2D_SECTION_ENTRY');
        expect(audit.discrepancy_minus_c2d_fcfa).toBeNull();
      }
      acc[audit.classification] = (acc[audit.classification] ?? 0) + 1;
      expect(audit.portfolio_allocation_certified).toBe(false);
      return acc;
    }, {} as Record<string, number>);
    expect(statuses).toEqual({
      EXACTLY_EXPLAINED_BY_C2D: 9,
      C2D_CLOSE_WITH_RESIDUAL_UNEXPLAINED: 3,
      NO_C2D_SECTION_ENTRY: 3,
    });
  });

  it('identifies exactly three residual amounts requiring further source checking', () => {
    expect(audits.filter(a => a.classification === 'C2D_CLOSE_WITH_RESIDUAL_UNEXPLAINED')
      .map(a => [a.portfolio_id, a.discrepancy_minus_c2d_fcfa])).toEqual([
        ['gov-006', -370_246],
        ['gov-011', 481_394],
        ['gov-013', 283_456],
      ]);
  });

  it('prevents mistaken classification of numeric provenance as certified ministry appropriations', () => {
    for (const a of audits) {
      expect(a.portfolio_allocation_certified).toBe(false);
      if (a.classification === 'EXACTLY_EXPLAINED_BY_C2D' &&
          a.portfolio_id in MINISTRY_DOCUMENTARY_DISCREPANCIES) {
        expect(Number.isSafeInteger(a.legacy_directory_fcfa)).toBe(true);
      }
    }
    expect(c2d.source_scope_warning).toContain('Do not add CP columns');
  });
});
