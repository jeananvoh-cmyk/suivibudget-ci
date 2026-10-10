import { describe, expect, it } from 'vitest';
import legal from '../../../docs/references/2026/ministry-reconciliation/LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json';
import prior from '../../../docs/references/2026/ministry-reconciliation/SECTION_PROGRAM_CROSSCHECK_22_2026.json';
import additional from '../../data/ministryLfiArticle15Programs2026.json';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';

describe('2026 ministerial financial data actually available to citizen-facing cards and detail', () => {
  const priorBySection = new Map(prior.sections.map(section => [section.section_code, section]));
  const additionalBySection = new Map(additional.records.map(section => [section.section_code, section]));

  it('covers the 35 official portfolio cards and 34 different voted budget sections', () => {
    expect(GOVERNMENT_OFFICIALS).toHaveLength(35);
    expect(legal.rows).toHaveLength(35);
    expect(new Set(legal.rows.map(item => item.portfolio_id))).toEqual(
      new Set(GOVERNMENT_OFFICIALS.map(item => item.id)),
    );
    expect(new Set(legal.rows.map(item => item.section_code)).size).toBe(34);
    expect(legal.rows.every(item => item.official_lfi_pdf_page >= 12
      && item.official_lfi_pdf_page <= 20
      && Number.isSafeInteger(item.voted_section_cp_2026_fcfa)
      && item.voted_section_cp_2026_fcfa > 0)).toBe(true);
  });

  it('provides exhaustive named and accounted programme lines for all 34 sections', () => {
    expect(prior.sections).toHaveLength(22);
    expect(additional.records).toHaveLength(12);
    expect(new Set([...priorBySection.keys(), ...additionalBySection.keys()]).size).toBe(34);
    const allSections = new Map(legal.rows.map(item => [item.section_code, item.voted_section_cp_2026_fcfa]));
    let lineCount = 0;
    for (const [code, votedCP] of allSections) {
      const prev = priorBySection.get(code);
      const extra = additionalBySection.get(code);
      expect(Number(Boolean(prev)) + Number(Boolean(extra)), code).toBe(1);
      const rows = prev ? prev.programs : extra!.programmes;
      expect(rows.length, code).toBeGreaterThan(0);
      expect(rows.reduce((total, line) => total + line.cp_2026_fcfa, 0), code).toBe(votedCP);
      lineCount += rows.length;
    }
    expect(lineCount).toBe(161); // 112 DGBF technical programmes + 49 LFI article 15 programme lines
  });

  it('retains precise official PDF and does not pass off a shared section as a second allocation', () => {
    expect(additional.source_pdf_sha256).toBe(legal.source_pdf_sha256);
    for (const record of additional.records) {
      const voted = legal.rows.find(item => item.section_code === record.section_code);
      expect(record.lfi_pdf_page, record.section_code).toBe(voted?.official_lfi_pdf_page);
      expect(record.section_cp_2026_fcfa).toBe(voted?.voted_section_cp_2026_fcfa);
      record.programmes.forEach((programme, index) => {
        expect(programme.number).toBe(index + 1);
        expect(programme.name.trim().length).toBeGreaterThan(2);
        expect(Number.isSafeInteger(programme.cp_2026_fcfa)).toBe(true);
        expect(programme.cp_2026_fcfa).toBeGreaterThan(0);
      });
    }
    const delegated = legal.rows.find(item => item.portfolio_id === 'gov-035');
    expect(delegated?.section_code).toBe('229');
    expect(delegated?.section_shared_with_other_portfolio).toBe(true);
    const totalUniqueSections = [...new Map(legal.rows.map(item =>
      [item.section_code, item.voted_section_cp_2026_fcfa],
    )).values()].reduce((a,b)=>a+b,0);
    expect(totalUniqueSections).toBe(
      legal.rows.reduce((total, item) =>
        total + (item.portfolio_id === 'gov-035' ? 0 : item.voted_section_cp_2026_fcfa), 0),
    );
  });
});
