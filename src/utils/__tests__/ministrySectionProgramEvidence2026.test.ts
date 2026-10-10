import { describe, expect, it } from 'vitest';
import evidence from '../../../docs/references/2026/ministry-reconciliation/SECTION_PROGRAM_CROSSCHECK_22_2026.json';
import actionEvidence from '../../../docs/references/2026/ministry-reconciliation/ANNEX4_ACTION_SUM_CROSSCHECK_2026.json';
import programmeLabels from '../../data/ministryOfficialProgramLabels2026.json';
import registry from '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json';
import { MINISTRY_CANDIDATE_CP_2026, MINISTRY_DOCUMENTARY_DISCREPANCIES } from '../../data/ministryScopeExceptions';

describe('independent 2026 LFI CP and Annexe 4 section/program documentary crosscheck', () => {
  const sections = evidence.sections;
  const sectionById = new Map(sections.flatMap(section => section.portfolio_ids.map(id => [id, section])));
  const pending = registry.institutions.filter(item => !item.canonical_reference_path);

  it('documents all 23 not-fully-canonical portfolios using 22 distinct non-additive sections', () => {
    expect(sections).toHaveLength(22);
    expect(new Set(sections.map(s => s.section_code)).size).toBe(22);
    expect(pending).toHaveLength(23);
    expect(new Set(pending.map(item => item.institution_id)).size).toBe(23);
    expect(new Set(sections.flatMap(s => s.portfolio_ids))).toEqual(new Set(pending.map(p => p.institution_id)));
    expect(sections.filter(s => s.portfolio_ids.length > 1).map(s => s.section_code)).toEqual(['229']);
    expect(sectionById.get('gov-009')).toBe(sectionById.get('gov-035'));
  });

  it('independently crosschecks 112 numeric program CP rows with exact zero sum delta', () => {
    const programs = sections.flatMap(s => s.programs);
    expect(programs).toHaveLength(112);
    for (const section of sections) {
      expect(section.source_credit_type).toBe('CP_2026');
      expect(section.section_cp_2026_fcfa).toBeGreaterThan(0);
      expect(Number.isSafeInteger(section.section_cp_2026_fcfa)).toBe(true);
      expect(section.programs.reduce((sum, p) => sum + p.cp_2026_fcfa, 0)).toBe(section.section_cp_2026_fcfa);
      expect(section.reconciled_program_total_fcfa).toBe(section.section_cp_2026_fcfa);
      expect(section.programs_sum_delta_fcfa).toBe(0);
      expect(section.annex4_pdf_page_range[0]).toBeLessThanOrEqual(section.annex4_pdf_page_range[1]);
      expect(section.attribution_status).not.toBe('CERTIFIED_PORTFOLIO');
      expect(section.action_documentary_status).toBe('NOT_YET_VERIFIED');
      for (const p of section.programs) {
        expect(p.official_code).toMatch(/^\d{5}$/);
        expect(Number.isSafeInteger(p.cp_2026_fcfa)).toBe(true);
        expect(p.cp_2026_fcfa).toBeGreaterThan(0);
        expect(p.annex4_pdf_page).toBeGreaterThanOrEqual(section.annex4_pdf_page_range[0]);
        expect(p.annex4_pdf_page).toBeLessThanOrEqual(section.annex4_pdf_page_range[1]);
        expect(p.annex4_numeric_amount_found).toBe(true);
      }
    }
  });

  it('keeps the exceptional Annex 4 missing literal program code visible, not invented', () => {
    const unmatched = sections.flatMap(s =>
      s.programs.filter(p => !p.annex4_program_code_found).map(p => [s.section_code, p.official_code] as const),
    );
    expect(unmatched).toEqual([['352', '22121']]);
  });

  it('links each pending registry portfolio to the verified section without claiming full certification', () => {
    for (const item of pending) {
      const section = sectionById.get(item.institution_id);
      expect(section, item.institution_id).toBeDefined();
      expect(section!.section_code).toBe(item.dgbf_code);
      expect(item.section_program_evidence?.section_cp_2026_fcfa).toBe(section!.section_cp_2026_fcfa);
      expect(item.section_program_evidence?.section_programs_count).toBe(section!.programs.length);
      expect(item.section_program_evidence?.action_level_certified).toBe(false);
      expect(item.section_program_evidence?.portfolio_allocation_certified).toBe(false);
      expect(item.total_budget_2026_fcfa).toBeNull();
      expect(item.publication_status).toBe('DRAFT');
    }
  });

  it('validates the nine withheld discrepancies against official candidate section CP evidence', () => {
    expect(Object.keys(MINISTRY_DOCUMENTARY_DISCREPANCIES)).toHaveLength(9);
    for (const [id, sectionCode] of Object.entries(MINISTRY_DOCUMENTARY_DISCREPANCIES)) {
      const section = sectionById.get(id);
      expect(section?.section_code).toBe(sectionCode);
      expect(MINISTRY_CANDIDATE_CP_2026[id]).toBe(section?.section_cp_2026_fcfa);
    }
  });

  it('separates programmes section 322 from its LFI dotations and avoids gov-035 double allocation', () => {
    expect(sectionById.get('gov-007')?.section_cp_2026_fcfa).toBe(671_323_963_425);
    expect(sectionById.get('gov-007')?.lfi_2026_pdf_page).toBe(47);
    expect(sectionById.get('gov-035')?.attribution_status).toBe('SHARED_SECTION_NOT_SEPARATELY_ALLOCATED');
  });

  it('reconciles 340 distinct Annex 4 action rows across 108 programme totals', () => {
    expect(actionEvidence.programs).toHaveLength(112);
    expect(actionEvidence.totals.action_reconciled_programmes).toBe(108);
    expect(actionEvidence.totals.unique_actions).toBe(340);
    const references = new Map(sections.flatMap(sec =>
      sec.programs.map(p => [sec.section_code + '/' + p.official_code, p.cp_2026_fcfa] as const),
    ));
    for (const action of actionEvidence.programs) {
      const expected = references.get(action.section_code + '/' + action.program_code);
      expect(expected).toBeDefined();
      if (action.actions_count > 0) {
        expect(action.status).toBe('ACTION_SUM_RECONCILED');
        expect(action.actions_sum_fcfa).toBe(expected);
        expect(action.first_action_pdf_page).toBeGreaterThan(0);
      } else {
        expect(action.actions_sum_fcfa).toBe(0);
        expect(action.status).not.toBe('ACTION_SUM_RECONCILED');
      }
    }
  });

  it('keeps exactly four programme action-level exceptions visible', () => {
    expect(actionEvidence.programs.filter(x => x.actions_count === 0)
      .map(x => x.section_code + '/' + x.program_code)).toEqual([
        '108/13010', '108/13011', '108/13013', '352/22121',
      ]);
    expect(pending.filter(x => x.section_program_evidence?.action_numeric_reconciliation_complete === false)
      .map(x => x.institution_id)).toEqual(['gov-001', 'gov-028']);
    expect(pending.filter(x => x.section_program_evidence?.action_numeric_reconciliation_complete === true)).toHaveLength(21);
  });

  it('has an official readable programme label for every one of the 112 CP lines', () => {
    const names: Record<string, string> = programmeLabels.names;
    expect(Object.keys(names)).toHaveLength(112);
    for (const section of sections) {
      for (const program of section.programs) {
        expect(names[program.official_code], program.official_code).toBeTruthy();
        expect(names[program.official_code].length).toBeGreaterThan(2);
      }
    }
  });

  it('keeps the source documents auditable by original SHA-256', () => {
    expect(evidence.source_documents).toHaveLength(2);
    expect(evidence.source_documents.map(d => d.sha256)).toEqual([
      'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76',
      '0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10',
    ]);
  });
});
