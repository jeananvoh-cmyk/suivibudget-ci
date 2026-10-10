import { describe, it, expect } from 'vitest';
import { 
  assessInstitutionBudget, 
  calculateSafePercentages, 
  InstitutionBudgetAssessment 
} from '../institutionBudgetHelper';
import { formatFCFA, formatAmountInWords } from '../formatters';
import { NATIONAL_INSTITUTIONS_DATA } from '../../data/nationalBudgetData';
import { ALL_COMMUNES_DATA } from '../../data/officialDataFromCsv';
import { getBudgetLinesForEntity } from '../../data/budgetLinesData';
import { Institution } from '../../types';

describe('Institution Budget Integrity & Safe Rendering', () => {
  describe('Rule: null !== 0 strict separation', () => {
    it('formats null and undefined as "Montant à confirmer", never as 0 FCFA', () => {
      expect(formatFCFA(null)).toBe('Montant à confirmer');
      expect(formatFCFA(undefined)).toBe('Montant à confirmer');
      expect(formatAmountInWords(null)).toBe('Montant à confirmer');
      expect(formatAmountInWords(undefined)).toBe('Montant à confirmer');
    });

    it('formats 0 as "0 FCFA" only when legitimate numerical 0 is supplied', () => {
      expect(formatFCFA(0)).toBe('0 FCFA');
      expect(formatAmountInWords(0)).toBe('0 FCFA');
    });
  });

  describe('calculateSafePercentages', () => {
    it('returns null for both percentages when total is null, undefined, 0, or negative', () => {
      expect(calculateSafePercentages(100, 50, null)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'NO_BREAKDOWN' });
      expect(calculateSafePercentages(100, 50, undefined)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'NO_BREAKDOWN' });
      expect(calculateSafePercentages(100, 50, 0)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'UNRECONCILED' });
      expect(calculateSafePercentages(0, 0, 0)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'ZERO_TOTAL' });
      expect(calculateSafePercentages(100, 50, -1000)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'UNRECONCILED' });
    });

    it('returns null when either functioning or investment component is missing', () => {
      expect(calculateSafePercentages(null, 50, 100)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'PARTIAL_BREAKDOWN' });
      expect(calculateSafePercentages(50, null, 100)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'PARTIAL_BREAKDOWN' });
      expect(calculateSafePercentages(undefined, 50, 100)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'PARTIAL_BREAKDOWN' });
    });

    it('returns 100% functioning and 0% investment when investment is 0', () => {
      const res = calculateSafePercentages(10_000_000, 0, 10_000_000);
      expect(res).toMatchObject({ functioningPct: 100, investmentPct: 0, status: 'RECONCILED', isBalanced: true });
    });

    it('returns 0% functioning and 100% investment when functioning is 0', () => {
      const res = calculateSafePercentages(0, 10_000_000, 10_000_000);
      expect(res).toMatchObject({ functioningPct: 0, investmentPct: 100, status: 'RECONCILED', isBalanced: true });
    });

    it('returns correctly rounded percentages summing to 100%', () => {
      const res = calculateSafePercentages(7_000_000, 3_000_000, 10_000_000);
      expect(res.functioningPct).toBe(70);
      expect(res.investmentPct).toBe(30);
      expect(res.functioningPct! + res.investmentPct!).toBe(100);
    });
  });

  describe('financial arithmetic gate', () => {
    it('rejects a non-reconciled 60 + 30 vs 100 breakdown', () => {
      expect(calculateSafePercentages(60, 30, 100)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'UNRECONCILED' });
    });
    it('rejects a one-franc mismatch', () => {
      expect(calculateSafePercentages(60, 39, 100)).toMatchObject({ functioningPct: null, investmentPct: null, status: 'UNRECONCILED' });
    });
    it('rejects negative or unsafe monetary numbers', () => {
      expect(calculateSafePercentages(-1, 101, 100).functioningPct).toBeNull();
      expect(calculateSafePercentages(Number.MAX_SAFE_INTEGER + 1, 0, Number.MAX_SAFE_INTEGER + 1).functioningPct).toBeNull();
    });
    it('accepts a reconciled breakdown', () => {
      expect(calculateSafePercentages(60, 40, 100)).toMatchObject({ functioningPct: 60, investmentPct: 40, status: 'RECONCILED' });
    });
  });

  describe('Cour Suprême de Côte d\'Ivoire (inst-cour-supreme)', () => {
    const courSupreme = NATIONAL_INSTITUTIONS_DATA.find(i => i.id === 'inst-cour-supreme')!;

    it('exists in canonical repository with null budget fields and budget_not_published flag', () => {
      expect(courSupreme).toBeDefined();
      expect(courSupreme.total_budget_fcfa).toBeNull();
      expect(courSupreme.budget_functioning_fcfa).toBeNull();
      expect(courSupreme.budget_investment_fcfa).toBeNull();
      expect(courSupreme.budget_not_published).toBe(true);
    });

    it('assesses Cour Suprême as NOT_DOCUMENTED and displays constitutional unbundling notice', () => {
      const assessment: InstitutionBudgetAssessment = assessInstitutionBudget(courSupreme);

      expect(assessment.status).toBe('NOT_DOCUMENTED');
      expect(assessment.isCourSupreme).toBe(true);
      expect(assessment.totalFormatted).toBe('Non individualisé (LFI 2026)');
      expect(assessment.totalWords).toBeNull();
      expect(assessment.functioningPct).toBeNull();
      expect(assessment.investmentPct).toBeNull();
      expect(assessment.hasBreakdown).toBe(false);

      // Never shows 0 FCFA or 0%
      expect(assessment.totalFormatted).not.toContain('0 FCFA');
      expect(assessment.noticeText).toContain('Cour de Cassation (Section 114)');
      expect(assessment.noticeText).toContain('Conseil d\'État (Section 118)');
      expect(assessment.noticeText).toContain('Cour des Comptes (Section 115)');
    });

    it('does not return fabricated budget lines for inst-cour-supreme', () => {
      const lines = getBudgetLinesForEntity(courSupreme.name, courSupreme.type, courSupreme.leader_name, courSupreme.id);
      expect(lines).toEqual([]);
    });
  });

  describe('Grand Abidjan Tax Quota Communes', () => {
    const taxQuotaCommuneIds = [
      'inst-com-abobo',
      'inst-com-adjame',
      'inst-com-attecoube',
      'inst-com-cocody',
      'inst-com-koumassi',
      'inst-com-marcory',
      'inst-com-plateau',
      'inst-com-port-bouet',
      'inst-com-treichville',
      'inst-com-yopougon'
    ];

    it('all 10 Grand Abidjan communes have null budgets and budget_not_published: true', () => {
      taxQuotaCommuneIds.forEach(id => {
        const com = ALL_COMMUNES_DATA.find(c => c.id === id);
        expect(com, `Commune ${id} should exist`).toBeDefined();
        expect(com!.total_budget_fcfa, `${id} total_budget_fcfa must be null`).toBeNull();
        expect(com!.budget_functioning_fcfa, `${id} budget_functioning_fcfa must be null`).toBeNull();
        expect(com!.budget_investment_fcfa, `${id} budget_investment_fcfa must be null`).toBeNull();
        expect(com!.budget_not_published, `${id} budget_not_published must be true`).toBe(true);
        expect(com!.is_tax_quota_commune, `${id} is_tax_quota_commune must be true`).toBe(true);
      });
    });

    it('assesses Grand Abidjan communes as TAX_AUTONOMY with municipal revenue notice, never 0 FCFA', () => {
      taxQuotaCommuneIds.forEach(id => {
        const com = ALL_COMMUNES_DATA.find(c => c.id === id)!;
        const assessment = assessInstitutionBudget(com);
        expect(assessment.status).toBe('TAX_AUTONOMY');
        expect(assessment.isTaxQuotaCommune).toBe(true);
        expect(assessment.totalFormatted).toBe('Budget municipal propre');
        expect(assessment.totalWords).toBeNull();
        expect(assessment.functioningPct).toBeNull();
        expect(assessment.investmentPct).toBeNull();
        expect(assessment.totalFormatted).not.toContain('0 FCFA');
      });
    });
  });

  describe('Autonomous Supreme Jurisdictions in LFI 2026', () => {
    it('Cour de Cassation has authentic verified allocation (Section 114: 7 931 309 608 FCFA)', () => {
      const cassation = NATIONAL_INSTITUTIONS_DATA.find(i => i.id === 'inst-cour-cassation')!;
      expect(cassation).toBeDefined();
      expect(cassation.total_budget_fcfa).toBe(7_931_309_608);
      const assessment = assessInstitutionBudget(cassation);
      expect(assessment.status).toBe('AVAILABLE');
      expect(assessment.totalFormatted).toContain('7 931 309 608 FCFA');
      expect(assessment.functioningPct).toBe(100);
      expect(assessment.investmentPct).toBe(0);
    });

    it('Conseil d\'État has authentic verified allocation (Section 118: 5 164 531 081 FCFA)', () => {
      const conseilEtat = NATIONAL_INSTITUTIONS_DATA.find(i => i.id === 'inst-conseil-etat')!;
      expect(conseilEtat).toBeDefined();
      expect(conseilEtat.total_budget_fcfa).toBe(5_164_531_081);
      const assessment = assessInstitutionBudget(conseilEtat);
      expect(assessment.status).toBe('AVAILABLE');
      expect(assessment.totalFormatted).toContain('5 164 531 081 FCFA');
      expect(assessment.functioningPct).toBe(100);
      expect(assessment.investmentPct).toBe(0);
    });

    it('Cour des Comptes has authentic verified allocation (Section 115: 8 851 161 351 FCFA)', () => {
      const courComptes = NATIONAL_INSTITUTIONS_DATA.find(i => i.id === 'inst-cour-comptes')!;
      expect(courComptes).toBeDefined();
      expect(courComptes.total_budget_fcfa).toBe(8_851_161_351);
      const assessment = assessInstitutionBudget(courComptes);
      expect(assessment.status).toBe('AVAILABLE');
      expect(assessment.totalFormatted).toContain('8 851 161 351 FCFA');
      expect(assessment.hasBreakdown).toBe(true);
      expect(assessment.functioningPct).toBe(78);
      expect(assessment.investmentPct).toBe(22);
    });
  });

  describe('Unreconciled breakdown safeguard', () => {
    it('does not present percentages or a complete breakdown for amounts that do not sum to total', () => {
      const assessment = assessInstitutionBudget({
        id: 'test-unreconciled',
        name: 'Institution de test',
        type: 'INSTITUTION',
        total_budget_fcfa: 100,
        budget_functioning_fcfa: 60,
        budget_investment_fcfa: 30,
        budget_not_published: false,
      });
      expect(assessment.hasBreakdown).toBe(false);
      expect(assessment.functioningPct).toBeNull();
      expect(assessment.investmentPct).toBeNull();
      expect(assessment.badgeText).not.toContain('Officielle');
      expect(assessment.noticeText).toContain('provenance');
    });
  });

  describe('Legitimate Documented Zero Budget', () => {
    it('requires official evidence even when zero is numerically explicit', () => {
      const dummyEntity: Partial<Institution> = {
        id: 'test-zero-inst',
        name: 'Agence Spécifique',
        type: 'INSTITUTION',
        total_budget_fcfa: 0,
        budget_functioning_fcfa: 0,
        budget_investment_fcfa: 0,
        budget_not_published: false
      };

      const assessment = assessInstitutionBudget(dummyEntity);
      expect(assessment.status).toBe('NOT_DOCUMENTED');
      expect(assessment.verificationStatus).toBe('NOT_DOCUMENTED');
      expect(assessment.totalFormatted).toBe('0 FCFA (non vérifié)');
      expect(assessment.functioningPct).toBeNull();
      expect(assessment.investmentPct).toBeNull();
    });
  });
});
