import { describe, expect, it } from 'vitest';
import legal from '../../../docs/references/2026/ministry-reconciliation/LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json';
import registry from '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json';
import sections from '../../../docs/references/2026/ministry-reconciliation/SECTION_PROGRAM_CROSSCHECK_22_2026.json';

describe('legally voted 2026 CP baseline, articles 14/15', () => {
  const registered = new Map(registry.institutions.map(i => [i.institution_id, i]));
  const pendingById = new Map(sections.sections.flatMap(s => s.portfolio_ids.map(id => [id, s])));

  it('covers exactly 34 independent initial LFI sections referenced by 35 portfolios', () => {
    expect(legal.rows).toHaveLength(35);
    expect(new Set(legal.rows.map(x => x.portfolio_id)).size).toBe(35);
    expect(new Set(legal.rows.map(x => x.section_code)).size).toBe(34);
    const article14 = legal.rows.filter(x => x.legal_article === '14');
    const article15 = legal.rows.filter(x => x.legal_article === '15');
    expect(article14.map(x => x.portfolio_id)).toEqual(['gov-001']);
    expect(article15).toHaveLength(34);
    expect(legal.rows.filter(x => x.section_shared_with_other_portfolio)
      .map(x => x.portfolio_id)).toEqual(['gov-009','gov-035']);
  });

  it('matches the initial voted CP exactly to canonical and section-program sources', () => {
    for (const basis of legal.rows) {
      const item = registered.get(basis.portfolio_id);
      expect(item, basis.portfolio_id).toBeDefined();
      const cp = item!.total_budget_2026_fcfa ??
        pendingById.get(basis.portfolio_id)?.section_cp_2026_fcfa;
      expect(cp, basis.portfolio_id).toBe(basis.voted_section_cp_2026_fcfa);
      expect(item!.initial_2026_lfi_legal_cp_basis.verified_against_original_lfi).toBe(true);
      expect(item!.initial_2026_lfi_legal_cp_basis.lfi_pdf_page).toBe(basis.official_lfi_pdf_page);
      expect(item!.initial_2026_lfi_legal_cp_basis.article).toBe(basis.legal_article);
      expect(item!.certification_control_2026.voted_2026_initial_CP_section_proven).toBe(true);
      expect(item!.certification_control_2026.certified_public_budget).toBe(false);
      expect(basis.current_2026_minister_independent_allocation_proven).toBe(false);
      expect(basis.official_lfi_pdf_page).toBeGreaterThanOrEqual(12);
      expect(basis.official_lfi_pdf_page).toBeLessThanOrEqual(20);
    }
  });

  it('never counts delegated agriculture budget as another autonomous appropriation', () => {
    const agriculture = legal.rows.find(x => x.portfolio_id === 'gov-009');
    const delegated = legal.rows.find(x => x.portfolio_id === 'gov-035');
    expect(agriculture?.section_code).toBe('229');
    expect(delegated?.section_code).toBe('229');
    expect(agriculture?.voted_section_cp_2026_fcfa).toBe(delegated?.voted_section_cp_2026_fcfa);
    expect(delegated?.current_2026_minister_independent_allocation_proven).toBe(false);
  });
});
