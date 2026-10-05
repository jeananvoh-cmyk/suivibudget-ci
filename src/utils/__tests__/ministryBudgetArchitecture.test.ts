import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  MMPE_MINISTRY_BUDGET_2026,
  MMPE_INSTITUTION_ID,
  getMinistryBudget,
  isPilotMinistry,
  performMinistryArithmeticCheck,
  validateMinistryBudget,
} from '../../data/ministryPilotReferential';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';

// Load canonical referential locked during documentary validation
const canonicalPath = path.resolve(
  __dirname,
  '../../../docs/references/2026/ministry-mines-petroleum-energy/MMPE_CANONICAL_BUDGET_2026.json'
);
const CANONICAL_DATA = JSON.parse(fs.readFileSync(canonicalPath, 'utf-8'));

describe('Lot 2 — Architecture Pilote des Budgets Ministériels (MMPE gov-008)', () => {
  // -------------------------------------------------------------------------
  // 1. GOLDEN REFERENCE TEST (Nomenclature Canonique DGBF 2026 — 10 Programmes)
  // -------------------------------------------------------------------------
  describe('Golden Reference Test — 10 Programmes Officiels DGBF', () => {
    it('imposes exactly 10 official DGBF programs perfectly matching canonical referential', () => {
      // 1. Nombre exact de programmes = 10
      expect(MMPE_MINISTRY_BUDGET_2026.programs.length).toBe(10);
      expect(CANONICAL_DATA.programs.length).toBe(10);

      // 2. Alignement strict avec le référentiel canonique pour chaque programme
      CANONICAL_DATA.programs.forEach((canonicalProg: any, index: number) => {
        const prog = MMPE_MINISTRY_BUDGET_2026.programs[index];
        expect(prog.official_code).toBe(canonicalProg.program_code);
        expect(prog.code).toBe(canonicalProg.program_code);
        expect(prog.name).toBe(canonicalProg.official_name);
        expect(prog.amount_fcfa).toBe(canonicalProg.program_amount_2026_fcfa);
        expect(prog.reconciliation_status).toBe('RECONCILED');
      });

      // 3. Somme arithmétique exacte = 706 060 209 015 FCFA avec delta = 0
      const sum = MMPE_MINISTRY_BUDGET_2026.programs.reduce(
        (acc, p) => acc + (p.amount_fcfa ?? 0),
        0
      );
      expect(sum).toBe(706_060_209_015);
      expect(MMPE_MINISTRY_BUDGET_2026.total_budget_fcfa).toBe(706_060_209_015);
      expect(MMPE_MINISTRY_BUDGET_2026.reconciliation_status).toBe('RECONCILED');
    });

    it('forbids the pseudo-program CAS (Comptes Spéciaux du Trésor & Fonds de Soutien)', () => {
      const casProgram = MMPE_MINISTRY_BUDGET_2026.programs.find(
        p => p.id === 'prog-mmpe-cas' || p.code === 'CAS' || p.name.includes('Comptes Spéciaux')
      );
      expect(casProgram).toBeUndefined();

      // Vérifie que les 6 programmes de transferts/fonds sont individualisés (23230 à 23251)
      const specialTransferCodes = ['23230', '23231', '23232', '23233', '23234', '23251'];
      specialTransferCodes.forEach(code => {
        const found = MMPE_MINISTRY_BUDGET_2026.programs.find(p => p.official_code === code);
        expect(found).toBeDefined();
        expect(found!.amount_fcfa).toBeGreaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. INTÉGRITÉ DES 21 ACTIONS OFFICIELLES ET RÉCONCILIATION ARITHMÉTIQUE
  // -------------------------------------------------------------------------
  describe('Actions et Réconciliation (21 Actions Officielles DGBF)', () => {
    it('all 21 actions match canonical referential exactly without discrepancy', () => {
      const allRuntimeActions = MMPE_MINISTRY_BUDGET_2026.programs.flatMap(p => p.actions);
      const allCanonicalActions = CANONICAL_DATA.programs.flatMap((p: any) => p.actions);

      expect(allRuntimeActions.length).toBe(21);
      expect(allCanonicalActions.length).toBe(21);

      allCanonicalActions.forEach((canonicalAct: any) => {
        const runtimeAct = allRuntimeActions.find(a => a.official_code === canonicalAct.action_code);
        expect(runtimeAct).toBeDefined();
        expect(runtimeAct!.name).toBe(canonicalAct.official_name);
        expect(runtimeAct!.amount_fcfa).toBe(canonicalAct.amount_2026_fcfa);
        expect(runtimeAct!.reconciliation_status).toBe('RECONCILED');
      });
    });

    it('reconciles actions arithmetically for each program with delta = 0', () => {
      const check = performMinistryArithmeticCheck(MMPE_MINISTRY_BUDGET_2026);
      expect(check.programs_delta_fcfa).toBe(0);
      expect(check.programs_reconciliation_status).toBe('RECONCILED');

      expect(check.actions_checks.length).toBe(10);
      check.actions_checks.forEach(actionCheck => {
        expect(actionCheck.actions_delta_fcfa).toBe(0);
        expect(actionCheck.status).toBe('RECONCILED');
      });
    });

    it('forbids fabricated action amounts and non-existent Action 2210704', () => {
      const allRuntimeActions = MMPE_MINISTRY_BUDGET_2026.programs.flatMap(p => p.actions);
      const allActionAmounts = allRuntimeActions.map(a => a.amount_fcfa);

      // 8 montants fabriqués dans l'ancienne version qui doivent être rigoureusement absents
      const FORBIDDEN_OLD_AMOUNTS = [
        5_450_635_152,
        880_412_900,
        1_730_544_074,
        640_280_000,
        45_200_000,
        42_854_336,
        28_000_000,
        102_000_000,
      ];

      FORBIDDEN_OLD_AMOUNTS.forEach(forbiddenAmount => {
        expect(allActionAmounts).not.toContain(forbiddenAmount);
      });

      // L'Action 2210704 (102 000 000 FCFA) n'existe pas dans le document officiel DGBF
      const forbiddenAction = allRuntimeActions.find(a => a.official_code === '2210704');
      expect(forbiddenAction).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. PROJETS LIÉS ET RÈGLE BUDGET LINE ≠ PROJECT (18 PROJETS D'INVESTISSEMENT)
  // -------------------------------------------------------------------------
  describe('Projets Liés et Règle de Non-Double Comptage (18 Projets)', () => {
    it('18 national projects are integrated within action envelopes without inflating total', () => {
      const allLinkedProjects = MMPE_MINISTRY_BUDGET_2026.programs.flatMap(p =>
        p.actions.flatMap(a => a.linked_projects || [])
      );

      expect(allLinkedProjects.length).toBe(18);
      const sumProjects = allLinkedProjects.reduce((acc, p) => acc + p.budget_amount_fcfa, 0);
      expect(sumProjects).toBe(304_158_991_377);

      // Vérifie les codes officiels à 11 chiffres (pas de code inventé PROJ-MMPE-)
      allLinkedProjects.forEach(proj => {
        expect(proj.is_funded_within_action).toBe(true);
        expect(proj.official_code).toMatch(/^\d{11}$/);
        expect(proj.code).toMatch(/^\d{11}$/);
      });

      // Règle d'or : le budget total du ministère reste la somme des programmes
      const sumPrograms = MMPE_MINISTRY_BUDGET_2026.programs.reduce(
        (acc, p) => acc + (p.amount_fcfa ?? 0),
        0
      );
      expect(sumPrograms).toBe(MMPE_MINISTRY_BUDGET_2026.total_budget_fcfa);
    });

    it('validates multi-line source breakdown and amounts derivation for complex projects', () => {
      const allLinkedProjects = MMPE_MINISTRY_BUDGET_2026.programs.flatMap(p =>
        p.actions.flatMap(a => a.linked_projects || [])
      );

      // Projet 90043500010 (Numérisation électricité) : Trésor 10 Md + Fin Ext 50 Md = 60 Md
      const proj90043500010 = allLinkedProjects.find(p => p.official_code === '90043500010');
      expect(proj90043500010).toBeDefined();
      expect(proj90043500010!.budget_amount_fcfa).toBe(60_000_000_000);
      expect(proj90043500010!.amount_derivation).toBe('SUM_OF_OFFICIAL_SOURCE_LINES');
      expect(proj90043500010!.source_lines?.length).toBe(2);
      const sum90043500010 = proj90043500010!.source_lines!.reduce((acc, l) => acc + l.amount_fcfa, 0);
      expect(sum90043500010).toBe(60_000_000_000);

      // Projet 78043500065 (Dorsale Abidjan PK24-Bingerville) : Trésor 6,45 Md + Fin Ext 28,53 Md = 34,99 Md
      const proj78043500065 = allLinkedProjects.find(p => p.official_code === '78043500065');
      expect(proj78043500065).toBeDefined();
      expect(proj78043500065!.budget_amount_fcfa).toBe(34_990_845_661);
      expect(proj78043500065!.amount_derivation).toBe('SUM_OF_OFFICIAL_SOURCE_LINES');
      expect(proj78043500065!.source_lines?.length).toBe(2);

      // Projet 90043500017 (Corridor Nord) : Trésor 6 Md + Fin Ext 40 Md = 46 Md
      const proj90043500017 = allLinkedProjects.find(p => p.official_code === '90043500017');
      expect(proj90043500017).toBeDefined();
      expect(proj90043500017!.budget_amount_fcfa).toBe(46_000_000_000);
      expect(proj90043500017!.source_lines?.length).toBe(2);

      // Projet 78043200113 (Schéma Directeur SI) : 300 M sous action 2110601 (Programme 21106)
      const projSI = allLinkedProjects.find(p => p.official_code === '78043200113');
      expect(projSI).toBeDefined();
      expect(projSI!.budget_amount_fcfa).toBe(300_000_000);
      expect(projSI!.action_id).toBe('act-2110601');
      expect(projSI!.program_id).toBe('prog-21106');
    });
  });

  // -------------------------------------------------------------------------
  // 4. PROVENANCE ET SOURCES PRIMAIRES DGBF
  // -------------------------------------------------------------------------
  describe('Provenance et Sources Primaires DGBF', () => {
    const CANONICAL_DPPD_URL = 'https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf';

    it('uses verified DGBF primary URLs and valid page references across all hierarchy levels', () => {
      expect(MMPE_MINISTRY_BUDGET_2026.source).toBeTruthy();
      expect(MMPE_MINISTRY_BUDGET_2026.document_reference).toContain('Loi n° 2025-987');
      expect(MMPE_MINISTRY_BUDGET_2026.evidence_type).toBe('PRIMARY_OFFICIAL_DOCUMENT');
      expect(MMPE_MINISTRY_BUDGET_2026.source_url).toBe('https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf');
      expect(MMPE_MINISTRY_BUDGET_2026.fiscal_year).toBe(2026);
      expect(MMPE_MINISTRY_BUDGET_2026.institution_code).toBe('348');

      // 10 programmes ont l'URL officielle et leur référence de page préservée
      expect(MMPE_MINISTRY_BUDGET_2026.programs.length).toBe(10);
      MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
        expect(prog.source_url).toBe(CANONICAL_DPPD_URL);
        expect(prog.page_reference).toMatch(/p\.\s*\d+/);
      });

      // 21 actions ont l'URL officielle et leur référence de page préservée
      const allActions = MMPE_MINISTRY_BUDGET_2026.programs.flatMap(p => p.actions);
      expect(allActions.length).toBe(21);
      allActions.forEach(act => {
        expect(act.source_url).toBe(CANONICAL_DPPD_URL);
        expect(act.page_reference).toMatch(/p\.\s*\d+/);
      });

      // 18 projets ont l'URL officielle et leur référence de page préservée
      const allProjects = allActions.flatMap(a => a.linked_projects || []);
      expect(allProjects.length).toBe(18);
      allProjects.forEach(proj => {
        expect(proj.source_url).toBe(CANONICAL_DPPD_URL);
        expect(proj.page_reference).toMatch(/p\.\s*\d+/);
      });
    });
  });

  // -------------------------------------------------------------------------
  // 5. ISOLATION STRICTE VS BUDGETS COMMUNAUX
  // -------------------------------------------------------------------------
  describe('Isolation Stricte vs Budgets Communaux', () => {
    it('ministry model contains ZERO communal or municipal concepts', () => {
      const pilot = getMinistryBudget(MMPE_INSTITUTION_ID);
      expect(pilot).not.toBeNull();
      expect((pilot as any).primitive_budget).toBeUndefined();
      expect((pilot as any).dgf_fcfa).toBeUndefined();
      expect((pilot as any).dge_fcfa).toBeUndefined();
      expect((pilot as any).is_tax_quota_commune).toBeUndefined();
      expect((pilot as any).administrative_account).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 6. NON-RÉGRESSION ET DOCTRINE FINANCIÈRE
  // -------------------------------------------------------------------------
  describe('Non-Régression et Intégrité Financière', () => {
    it('no arbitrary ratios (65/35, 70/30, 55/45) present in data', () => {
      const total = MMPE_MINISTRY_BUDGET_2026.total_budget_fcfa!;
      MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
        expect(prog.amount_fcfa).not.toBe(Math.round(total * 0.65));
        expect(prog.amount_fcfa).not.toBe(Math.round(total * 0.35));
        expect(prog.amount_fcfa).not.toBe(Math.round(total * 0.70));
        expect(prog.amount_fcfa).not.toBe(Math.round(total * 0.30));
      });
    });

    it('unknown amounts remain null without artificial zeroes', () => {
      const unbudgetedOfficials = GOVERNMENT_OFFICIALS.filter(o => o.budget_fcfa === undefined || o.budget_fcfa === null);
      unbudgetedOfficials.forEach(official => {
        expect(official.budget_fcfa).toBeFalsy();
        expect(official.budget_fcfa).not.toBe(0);
      });
      expect(getMinistryBudget('gov-non-existent')).toBeNull();
    });

    it('preserves verified communal data for Bingerville, Cocody and Tiassale', () => {
      const bingerville = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-bingerville'];
      expect(bingerville).toBeDefined();
      expect(bingerville.total_voted_fcfa).toBe(4_046_222_000);

      const cocody = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-cocody'];
      expect(cocody).toBeDefined();
      expect(cocody.total_voted_fcfa).toBe(19_764_660_000);

      // Non-régression Tiassalé CA 2024
      const tiassale = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale');
      expect(tiassale).toBeDefined();
      expect(tiassale!.operating_planned).toBe(618_000_000);
      expect(tiassale!.total_realized).toBe(1_059_255_758);
    });
  });

  // -------------------------------------------------------------------------
  // 7. VALIDATION RUNTIME TYPÉE DU BUDGET MINISTÉRIEL (ZÉRO ANY, SÉCURITÉ RUNTIME)
  // -------------------------------------------------------------------------
  describe('Validation Runtime (validateMinistryBudget)', () => {
    it('accepts valid MMPE ministry budget structure and throws on corrupt payloads', () => {
      // Structure valide acceptée
      expect(() => validateMinistryBudget(MMPE_MINISTRY_BUDGET_2026)).not.toThrow();

      // Rejette null ou non-objet
      expect(() => validateMinistryBudget(null)).toThrow(/doit être un objet JSON valide/);
      expect(() => validateMinistryBudget('not-an-object')).toThrow(/doit être un objet JSON valide/);

      // Rejette fiscal_year invalide
      expect(() => validateMinistryBudget({ ...MMPE_MINISTRY_BUDGET_2026, fiscal_year: 1999 })).toThrow(/fiscal_year invalide/);

      // Rejette total_budget_fcfa négatif
      expect(() => validateMinistryBudget({ ...MMPE_MINISTRY_BUDGET_2026, total_budget_fcfa: -500 })).toThrow(/total_budget_fcfa doit être un nombre positif/);

      // Rejette programs vide
      expect(() => validateMinistryBudget({ ...MMPE_MINISTRY_BUDGET_2026, programs: [] })).toThrow(/programs doit être un tableau non vide/);
    });
  });
});
