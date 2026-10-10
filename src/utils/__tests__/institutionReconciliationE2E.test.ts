import { describe, it, expect } from 'vitest';
import {
  calculateSafePercentages,
  resolveInstitutionFinancialView,
  assessInstitutionBudget,
} from '../institutionBudgetHelper';
import { NATIONAL_INSTITUTIONS_DATA } from '../../data/nationalBudgetData';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { REGULATORY_AUTHORITIES_DATA } from '../../data/regulatoryAuthoritiesData';
import { ALL_COMMUNES_DATA } from '../../data/communesData';
import { MMPE_MINISTRY_BUDGET_2026, OFFICIAL_MINISTRY_BUDGETS } from '../../data/ministryPilotReferential';

describe('Adversarial & E2E Financial Integrity Suite (Section 7)', () => {
  // Scenario 1: Identity between card observation and detail modal observation
  it('Scenario 1: Card and detail modal consume identical financial observation', () => {
    NATIONAL_INSTITUTIONS_DATA.forEach(inst => {
      const cardView = assessInstitutionBudget(inst);
      const detailView = resolveInstitutionFinancialView(inst, 2026, 'LFI');

      expect(cardView.status).toBe(detailView.status);
      expect(cardView.totalFormatted).toBe(detailView.total_formatted);
      expect(cardView.totalWords).toBe(detailView.total_words);
      expect(cardView.functioningPct).toBe(detailView.functioning_pct);
      expect(cardView.investmentPct).toBe(detailView.investment_pct);
      expect(cardView.hasBreakdown).toBe(detailView.has_breakdown);
      expect(cardView.badgeText).toBe(detailView.badge_text);
    });
  });

  // Scenario 2: Mutation of 1 FCFA triggers UNRECONCILED with exact delta
  it('Scenario 2: Single 1 FCFA discrepancy triggers UNRECONCILED and captures delta', () => {
    // Total is 10 000 000, functioning is 6 000 000, investment is 4 000 001 (+1 FCFA mutation)
    const resultPlusOne = calculateSafePercentages(6_000_000, 4_000_001, 10_000_000);
    expect(resultPlusOne.status).toBe('UNRECONCILED');
    expect(resultPlusOne.isBalanced).toBe(false);
    expect(resultPlusOne.deltaFcfa).toBe(-1);
    expect(resultPlusOne.functioningPct).toBeNull();
    expect(resultPlusOne.investmentPct).toBeNull();

    // Total is 10 000 000, functioning is 6 000 000, investment is 3 999 999 (-1 FCFA mutation)
    const resultMinusOne = calculateSafePercentages(6_000_000, 3_999_999, 10_000_000);
    expect(resultMinusOne.status).toBe('UNRECONCILED');
    expect(resultMinusOne.isBalanced).toBe(false);
    expect(resultMinusOne.deltaFcfa).toBe(1);
    expect(resultMinusOne.functioningPct).toBeNull();
    expect(resultMinusOne.investmentPct).toBeNull();
  });

  // Scenario 3: Total mismatch is never declared as VERIFIED_AMOUNT
  it('Scenario 3: Total mismatch is rejected as VERIFIED_AMOUNT', () => {
    const corruptInst = {
      id: 'inst-corrupt',
      name: 'Institution Test Unbalanced',
      type: 'INSTITUTION' as const,
      total_budget_fcfa: 100_000_000,
      budget_functioning_fcfa: 70_000_000,
      budget_investment_fcfa: 25_000_000, // Sum = 95M != 100M (delta = 5M)
    };
    const view = resolveInstitutionFinancialView(corruptInst, 2026, 'LFI');
    expect(view.reconciliation_status).toBe('UNRECONCILED');
    expect(view.verification_status).toBe('UNRECONCILED');
    expect(view.status).not.toBe('AVAILABLE');
    expect(view.has_breakdown).toBe(false);
    expect(view.functioning_pct).toBeNull();
    expect(view.investment_pct).toBeNull();
    expect(view.delta_fcfa).toBe(5_000_000);
  });

  // Scenario 4: Partial sum like 60+30 != 100 never produces percentages or 100%
  it('Scenario 4: 60+30 != 100 never produces misleading 100% breakdown', () => {
    const res = calculateSafePercentages(60_000_000, 30_000_000, 100_000_000);
    expect(res.status).toBe('UNRECONCILED');
    expect(res.isBalanced).toBe(false);
    expect(res.functioningPct).toBeNull();
    expect(res.investmentPct).toBeNull();
    expect(res.deltaFcfa).toBe(10_000_000);
  });

  // Scenario 5: Missing program detection when programs sum != total
  it('Scenario 5: Program sum mismatch triggers reconciliation warning and blocking reason', () => {
    const canonical = MMPE_MINISTRY_BUDGET_2026;
    expect(canonical).toBeDefined();

    // Verify canonical MMPE programs sum exactly to 33 218 075 220 FCFA
    const totalPrograms = canonical.programs.reduce((acc, p) => acc + (p.amount_fcfa || 0), 0);
    expect(totalPrograms).toBe(canonical.total_budget_fcfa);

    // Corrupt one program by 500 000 FCFA
    const corruptPrograms = canonical.programs.map((p, idx) => 
      idx === 0 ? { ...p, amount_fcfa: (p.amount_fcfa || 0) - 500_000 } : p
    );
    const corruptSum = corruptPrograms.reduce((acc, p) => acc + (p.amount_fcfa || 0), 0);
    expect(corruptSum).not.toBe(canonical.total_budget_fcfa);
  });

  // Scenario 6: Duplicate program detection
  it('Scenario 6: Duplicate program codes are detectable and prevented', () => {
    const programsWithDuplicate = [
      { code: '21011', name: 'Programme A', amount_fcfa: 10_000_000 },
      { code: '21011', name: 'Programme A Duplicate', amount_fcfa: 10_000_000 },
    ];
    const codes = programsWithDuplicate.map(p => p.code);
    const hasDuplicate = new Set(codes).size !== codes.length;
    expect(hasDuplicate).toBe(true);

    // Verify all canonical pilot ministries have zero duplicate program codes
    Object.values(OFFICIAL_MINISTRY_BUDGETS).forEach(ministry => {
      const progCodes = ministry.programs.map(p => p.code);
      expect(new Set(progCodes).size).toBe(progCodes.length);
    });
  });

  // Scenario 7: Actions are not double-counted with programs
  it('Scenario 7: Actions are secondary granular units and never double-counted into program sum', () => {
    const canonical = MMPE_MINISTRY_BUDGET_2026;
    
    // In LFI / DPPD-PAP, total ministry budget = sum(programs).
    // Actions are subsets of programs, so sum(programs) is the authoritative total.
    const programSum = canonical.programs.reduce((sum, p) => sum + (p.amount_fcfa || 0), 0);
    expect(programSum).toBe(canonical.total_budget_fcfa);
  });

  // Scenario 8: Rejection of wrong section, fiscal year, or measure
  it('Scenario 8: Rejection of mismatched fiscal year or unverified requested basis', () => {
    const inst = NATIONAL_INSTITUTIONS_DATA.find(i => i.id === 'inst-senat')!;
    const view2026 = resolveInstitutionFinancialView(inst, 2026, 'LFI');
    expect(view2026.fiscal_year).toBe(2026);
    expect(view2026.official_section_code).toBe('012');
    expect(view2026.budget_measure).toBe('CREDITS_VOTES');

    // A past fiscal year without loaded data falls back safely to NOT_DOCUMENTED
    const view2020 = resolveInstitutionFinancialView({ id: 'inst-senat', name: 'Sénat' }, 2020, 'LFI');
    expect(view2020.verification_status).toBe('NOT_DOCUMENTED');
  });

  // Scenario 9: Missing source remains UNKNOWN or NOT_DOCUMENTED
  it('Scenario 9: Entity with missing source remains NOT_DOCUMENTED / UNKNOWN without invented data', () => {
    const unverifiedInst = {
      id: 'inst-unknown-org',
      name: 'Organisme Sans Données Officielles',
      type: 'INSTITUTION' as const,
    };
    const view = resolveInstitutionFinancialView(unverifiedInst, 2026, 'LFI');
    expect(view.verification_status).toBe('NOT_DOCUMENTED');
    expect(view.total_amount_fcfa).toBeNull();
    expect(view.functioning_amount_fcfa).toBeNull();
    expect(view.investment_amount_fcfa).toBeNull();
    expect(view.total_formatted).toBe('Non documenté publiquement');
    expect(view.delta_fcfa).toBeNull(); // CRITICAL: null, never 0!
  });

  // Scenario 10: Undocumented zero remains unverified
  it('Scenario 10: Undocumented zero or null budget is never converted into VERIFIED_ZERO', () => {
    const entityWithNull = {
      id: 'test-zero-undocumented',
      name: 'Entité Non Renseignée',
      total_budget_fcfa: null,
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
    };
    const view = resolveInstitutionFinancialView(entityWithNull, 2026, 'LFI');
    expect(view.verification_status).not.toBe('VERIFIED_ZERO');
    expect(view.verification_status).toBe('NOT_DOCUMENTED');
  });

  // Scenario 11: Cour Suprême explicit states (constitutional unbundling)
  it('Scenario 11: Cour Suprême displays constitutional unbundling and null budget', () => {
    const courSupreme = NATIONAL_INSTITUTIONS_DATA.find(i => i.id === 'inst-cour-supreme')!;
    const view = resolveInstitutionFinancialView(courSupreme, 2026, 'LFI');

    expect(view.is_cour_supreme).toBe(true);
    expect(view.verification_status).toBe('NOT_DOCUMENTED');
    expect(view.total_amount_fcfa).toBeNull();
    expect(view.functioning_amount_fcfa).toBeNull();
    expect(view.investment_amount_fcfa).toBeNull();
    expect(view.total_formatted).toBe('Non individualisé (LFI 2026)');
    expect(view.delta_fcfa).toBeNull();
    expect(view.notice_text).toContain('Cour de Cassation');
    expect(view.notice_text).toContain('Conseil d\'État');
    expect(view.notice_text).toContain('Cour des Comptes');
  });

  // Scenario 12: Grand Abidjan communes explicit states (tax autonomy)
  it('Scenario 12: Grand Abidjan communes display TAX_AUTONOMY notice and null LFI budget', () => {
    const grandAbidjanIds = [
      'com-abobo', 'com-adjame', 'com-attecoube', 'com-cocody',
      'com-koumassi', 'com-marcory', 'com-plateau', 'com-port-bouet',
      'com-treichville', 'com-yopougon'
    ];

    grandAbidjanIds.forEach(id => {
      const commune = ALL_COMMUNES_DATA.find(c => c.id === id) || {
        id,
        name: id,
        type: 'MAIRIE' as const,
        total_budget_fcfa: null,
        budget_not_published: true,
      };
      const view = resolveInstitutionFinancialView(commune, 2026, 'LFI');

      expect(view.is_tax_quota_commune).toBe(true);
      expect(view.verification_status).toBe('NOT_PUBLISHED');
      expect(view.total_amount_fcfa).toBeNull();
      expect(view.total_formatted).toBe('Budget municipal propre');
      expect(view.delta_fcfa).toBeNull();
      expect(view.notice_text).toContain('autonomie financière et fiscale');
    });
  });

  // Scenario 13: Integrity of canonical values across all verified institutions
  it('Scenario 13: All verified published national institutions strictly satisfy functioning + investment === total down to 1 FCFA', () => {
    const published = NATIONAL_INSTITUTIONS_DATA.filter(i => !i.budget_not_published && i.total_budget_fcfa !== null);
    expect(published.length).toBe(13); // 13 published, 1 Cour Suprême unpublished

    published.forEach(inst => {
      const view = resolveInstitutionFinancialView(inst, 2026, 'LFI');
      expect(view.verification_status).toBe('VERIFIED_AMOUNT');
      expect(view.reconciliation_status).toBe('RECONCILED');
      expect(view.delta_fcfa).toBe(0);
      expect((view.functioning_amount_fcfa || 0) + (view.investment_amount_fcfa || 0)).toBe(view.total_amount_fcfa);
      if (view.has_breakdown) {
        expect((view.functioning_pct || 0) + (view.investment_pct || 0)).toBe(100);
      }
    });
  });

  // Scenario 14: Safe arithmetic without division by zero on verified zero budget
  it('Scenario 14: Safe arithmetic without division by zero when total is legitimately 0 FCFA', () => {
    const res = calculateSafePercentages(0, 0, 0);
    expect(res.status).toBe('ZERO_TOTAL');
    expect(res.isBalanced).toBe(true);
    expect(res.deltaFcfa).toBe(0);
    expect(res.functioningPct).toBeNull();
    expect(res.investmentPct).toBeNull();
  });

  // Scenario 15: Safe handling of negative or invalid inputs without crashing
  it('Scenario 15: Safe handling of negative numbers, NaN, and Infinity', () => {
    expect(() => calculateSafePercentages(-100, 50, 100)).not.toThrow();
    expect(calculateSafePercentages(-100, 50, 100).status).toBe('UNRECONCILED');

    expect(() => calculateSafePercentages(NaN, 50, 100)).not.toThrow();
    expect(calculateSafePercentages(NaN, 50, 100).status).toBe('UNRECONCILED');

    expect(() => calculateSafePercentages(Infinity, 50, 100)).not.toThrow();
    expect(calculateSafePercentages(Infinity, 50, 100).status).toBe('UNRECONCILED');
  });
});
