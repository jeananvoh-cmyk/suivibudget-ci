import { describe, it, expect } from 'vitest';
import evidence from '../../../docs/audits/institution-reconciliation/LFI_2026_SECTION_EVIDENCE.json';
import matrix from '../../../docs/audits/institution-reconciliation/matrix.json';
import {
  NATIONAL_INSTITUTIONS_SECTIONS, MINISTRIES_SECTIONS,
  resolveInstitutionFinancialView, calculateSafePercentages
} from '../institutionBudgetHelper';
import { NATIONAL_INSTITUTIONS_DATA } from '../../data/nationalBudgetData';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { REGULATORY_AUTHORITIES_DATA } from '../../data/regulatoryAuthoritiesData';

describe('LFI 2026 — source, section, page and entity invariants', () => {
  const matrixById = new Map(matrix.entities.map(e => [e.institution_id, e]));

  it('stores a nominative PDF-line reference for 13 institutions and 34 ministry sections', () => {
    expect(evidence.national).toHaveLength(13);
    expect(evidence.ministries).toHaveLength(34);
    expect(new Set(evidence.ministries.map(e => e.section_code)).size).toBe(34);
    expect(GOVERNMENT_OFFICIALS).toHaveLength(35);
    expect(matrix.entities).toHaveLength(66);
    expect(evidence.pdf_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('checks institution section codes, amounts, PDF pages and matrix provenance', () => {
    for (const row of evidence.national) {
      const ref = NATIONAL_INSTITUTIONS_SECTIONS[row.id];
      expect(ref, row.id).toBeDefined();
      expect(ref.section_code, row.id).toBe(row.section_code);
      expect(ref.pdf_page, row.id).toBe(row.pdf_page);
      expect(ref.doc_page, row.id).toBe(row.doc_page);
      expect(ref.lfi_amount_fcfa, row.id).toBe(row.amount_fcfa);
      const entity = NATIONAL_INSTITUTIONS_DATA.find(e => e.id === row.id);
      expect(entity, row.id).toBeDefined();
      expect(entity!.total_budget_fcfa, row.id).toBe(row.amount_fcfa);
      const financial = resolveInstitutionFinancialView(entity!, 2026, 'LFI');
      const matrixRow = matrixById.get(row.id)!;
      expect(financial.official_section_code, row.id).toBe(row.section_code);
      expect(financial.documentary_provenance?.pdf_page, row.id).toBe(row.pdf_page);
      expect(financial.verification_status, row.id).toBe('VERIFIED_AMOUNT');
      expect(matrixRow.provenance?.pdf_page, row.id).toBe(row.pdf_page);
      expect(matrixRow.official_section_code, row.id).toBe(row.section_code);
      expect(matrixRow.verification_status, row.id).toBe('VERIFIED_AMOUNT');
    }
  });

  it('distinguishes 2 Presidency internal programmes from the additive section total', () => {
    const presidency = evidence.national.find(e => e.id === 'inst-presidence')!;
    const programs = evidence.national.filter(e => e.record_kind === 'INTERNAL_PROGRAM');
    expect(presidency.section_code).toBe('103');
    expect(programs).toHaveLength(2);
    expect(programs.map(e => e.id).sort()).toEqual(['inst-habg', 'inst-ige']);
    for (const row of programs) {
      expect(row.section_code).toBe('103');
      expect(matrixById.get(row.id)?.accounting_treatment).toBe('INTERNAL_PROGRAM');
    }
    const distinctSectionSum = evidence.national
      .filter(e => e.record_kind === 'SECTION')
      .reduce((sum, e) => sum + e.amount_fcfa, 0);
    expect(distinctSectionSum).toBe(298_579_127_196);
    expect(matrix.audit_metadata.total_fcfa_verified).toBe(distinctSectionSum);
    expect(matrix.audit_metadata.non_additive_presidency_programs).toBe(2);
  });

  it('checks 34 section references independently from 35 portfolio allocations', () => {
    for (const row of evidence.ministries) {
      const ref = MINISTRIES_SECTIONS[row.id];
      expect(ref, row.id).toBeDefined();
      expect(ref.section_code, row.id).toBe(row.section_code);
      expect(ref.pdf_page, row.id).toBe(row.pdf_page);
      expect(ref.doc_page, row.id).toBe(row.doc_page);
      expect(ref.lfi_amount_fcfa, row.id).toBe(row.amount_fcfa);
      const official = GOVERNMENT_OFFICIALS.find(e => e.id === row.id)!;
      expect(official).toBeDefined();
      const view = resolveInstitutionFinancialView({
        id: official.id, name: official.department_ministry,
        type: 'MINISTERE', total_budget_fcfa: official.budget_fcfa ?? null
      }, 2026, 'LFI');
      expect(view.official_section_code, row.id).toBe(row.section_code);
      expect(view.documentary_provenance?.pdf_page, row.id).toBe(row.pdf_page);
      const matrixRow = matrixById.get(row.id)!;
      expect(matrixRow.official_section_code, row.id).toBe(row.section_code);
      expect(matrixRow.provenance?.pdf_page, row.id).toBe(row.pdf_page);
      const sameScopeAmount = official.budget_fcfa === row.amount_fcfa;
      expect(view.verification_status, row.id).toBe(sameScopeAmount ? 'PARTIAL_BREAKDOWN' : 'NOT_DOCUMENTED');
      expect(matrixRow.verification_status, row.id).toBe(sameScopeAmount ? 'PARTIAL_BREAKDOWN' : 'NOT_DOCUMENTED');
    }
    expect(MINISTRIES_SECTIONS['gov-035']).toBeUndefined();
    expect(matrix.audit_metadata.ministry_section_reference_rows).toBe(34);
    expect(matrix.audit_metadata.ministry_portfolios).toBe(35);
  });

  it('blocks 7 unsupported regulator figures; neither proof nor artificial zero', () => {
    expect(REGULATORY_AUTHORITIES_DATA).toHaveLength(7);
    for (const regulator of REGULATORY_AUTHORITIES_DATA) {
      expect(regulator.total_budget_fcfa, regulator.id).toBeNull();
      expect(regulator.budget_functioning_fcfa, regulator.id).toBeNull();
      expect(regulator.budget_investment_fcfa, regulator.id).toBeNull();
      const v = resolveInstitutionFinancialView(regulator, 2026, 'LFI');
      expect(v.verification_status, regulator.id).toBe('NOT_DOCUMENTED');
      expect(v.total_formatted, regulator.id).not.toBe('0 FCFA');
      const matrixRow = matrixById.get(regulator.id)!;
      expect(matrixRow.total_fcfa, regulator.id).toBeNull();
      expect(matrixRow.verification_status, regulator.id).toBe('NOT_DOCUMENTED');
      expect(matrixRow.provenance, regulator.id).toBeNull();
    }
    expect(matrix.audit_metadata.unverified_regulatory_entities).toBe(7);
    expect(matrix.audit_metadata.regulators_previously_reported_sum_fcfa).toBe(42_150_000_000);
  });

  it('prevents zero/negative/fractional/NaN observations from turning into percentages', () => {
    for (const [f, i, t] of [
      [null, null, 0], [NaN, 0, 0], [-1, 1, 0], [0.5, 0, 0],
      [50.1, 49.9, 100], [null, 10, 100]
    ] as const) {
      const p = calculateSafePercentages(f, i, t);
      expect(p.functioningPct).toBeNull();
      expect(p.investmentPct).toBeNull();
    }
    const zero = resolveInstitutionFinancialView({
      id: 'synthetic-undocumented-zero', name: 'Test', type: 'INSTITUTION',
      total_budget_fcfa: 0, budget_functioning_fcfa: 0, budget_investment_fcfa: 0
    }, 2026, 'LFI');
    expect(zero.verification_status).toBe('NOT_DOCUMENTED');
    expect(zero.status).toBe('NOT_DOCUMENTED');
    expect(zero.documentary_provenance).toBeNull();
  });

  it('does not certify 2026 LFI values when a different budget basis is requested', () => {
    const inst = NATIONAL_INSTITUTIONS_DATA.find(e => e.id === 'inst-senat')!;
    const view = resolveInstitutionFinancialView(inst, 2026, 'RECTIFICATIF');
    expect(view.verification_status).not.toBe('VERIFIED_AMOUNT');
    expect(view.blocking_reasons.length).toBeGreaterThan(0);
  });
});
