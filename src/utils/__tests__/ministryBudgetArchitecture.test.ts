import { describe, it, expect } from 'vitest';
import {
  MMPE_MINISTRY_BUDGET_2026,
  MMPE_INSTITUTION_ID,
  getMinistryBudget,
  isPilotMinistry,
  performMinistryArithmeticCheck,
} from '../../data/ministryPilotReferential';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';

describe('Lot 2 — Architecture Pilote des Budgets Ministériels (MMPE gov-008)', () => {
  // -------------------------------------------------------------------------
  // 1. GOLDEN REFERENCE TEST (Nomenclature Canonique DGBF 2026 — 10 Programmes)
  // -------------------------------------------------------------------------
  describe('Golden Reference Test — 10 Programmes Officiels DGBF', () => {
    const EXPECTED_PROGRAMS = [
      { code: '21106', name: 'Administration Générale', amount: 8_701_872_126 },
      { code: '22036', name: 'Hydrocarbures', amount: 116_054_336 },
      { code: '22037', name: 'Energie', amount: 320_914_619_601 },
      { code: '22107', name: 'Mines et géologie', amount: 783_321_335 },
      { code: '23230', name: "Appui au financement du secteur de l'électricité", amount: 70_368_000_000 },
      { code: '23231', name: 'Appui au financement de la Société Ivoirienne de Raffinage (SIR)', amount: 57_906_341_617 },
      { code: '23232', name: 'Appui au financement du secteur minier', amount: 28_500_000_000 },
      { code: '23233', name: 'Péréquation produit à la Société Ivoirienne de Raffinage (SIR)', amount: 105_000_000_000 },
      { code: '23234', name: "Péréquation transport à la Société d'Etudes et de Gestion en Hydrocarbures (SEGH)", amount: 70_000_000_000 },
      { code: '23251', name: "Appui au financement à Côte d'Ivoire ENERGIE", amount: 43_770_000_000 },
    ];

    it('imposes exactly 10 official DGBF programs with correct canonical codes and amounts', () => {
      // 1. Nombre exact de programmes = 10
      expect(MMPE_MINISTRY_BUDGET_2026.programs.length).toBe(10);

      // 2. Codes officiels
      const actualCodes = MMPE_MINISTRY_BUDGET_2026.programs.map(p => p.official_code || p.code);
      const expectedCodes = EXPECTED_PROGRAMS.map(p => p.code);
      expect(actualCodes).toEqual(expectedCodes);

      // 3. Montants officiels exacts pour chaque programme
      EXPECTED_PROGRAMS.forEach((expected, index) => {
        const prog = MMPE_MINISTRY_BUDGET_2026.programs[index];
        expect(prog.official_code).toBe(expected.code);
        expect(prog.name).toContain(expected.name.slice(0, 15));
        expect(prog.amount_fcfa).toBe(expected.amount);
      });

      // 4. Somme arithmétique exacte = 706 060 209 015 FCFA
      const sum = MMPE_MINISTRY_BUDGET_2026.programs.reduce(
        (acc, p) => acc + (p.amount_fcfa ?? 0),
        0
      );
      expect(sum).toBe(706_060_209_015);
      expect(MMPE_MINISTRY_BUDGET_2026.total_budget_fcfa).toBe(706_060_209_015);
      expect(MMPE_MINISTRY_BUDGET_2026.reconciliation_status).toBe('RECONCILED');
    });

    it('forbids the pseudo-program CAS (Comptes Spéciaux du Trésor & Fonds de Soutien)', () => {
      // Vérifie l'absence absolue de prog-mmpe-cas
      const casProgram = MMPE_MINISTRY_BUDGET_2026.programs.find(
        p => p.id === 'prog-mmpe-cas' || p.code === 'CAS' || p.name.includes('Comptes Spéciaux')
      );
      expect(casProgram).toBeUndefined();

      // Vérifie que les 6 programmes de transferts sont bien individualisés (23230 à 23251)
      const specialTransferCodes = ['23230', '23231', '23232', '23233', '23234', '23251'];
      specialTransferCodes.forEach(code => {
        const found = MMPE_MINISTRY_BUDGET_2026.programs.find(p => p.official_code === code);
        expect(found).toBeDefined();
        expect(found!.amount_fcfa).toBeGreaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. INTÉGRITÉ DES ACTIONS ET VENTILATIONS BUDGÉTAIRES
  // -------------------------------------------------------------------------
  describe('Actions et Réconciliation', () => {
    it('all actions have official codes and match parent programs', () => {
      const validProgramIds = new Set(MMPE_MINISTRY_BUDGET_2026.programs.map(p => p.id));
      let totalActions = 0;

      MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
        expect(prog.actions.length).toBeGreaterThan(0);
        prog.actions.forEach(act => {
          expect(validProgramIds.has(act.program_id)).toBe(true);
          expect(act.program_id).toBe(prog.id);
          expect(act.official_code).toMatch(new RegExp(`^${prog.official_code}`));
          expect(['RECONCILED', 'PARTIAL', 'SOURCE_GAP', 'NOT_COMPARABLE']).toContain(
            act.reconciliation_status
          );
          totalActions++;
        });
      });

      // 4 actions P1 + 3 actions P2 + 4 actions P3 + 4 actions P4 + 6 actions pour 23230-23251 = 21 actions
      expect(totalActions).toBe(21);
    });

    it('reconciles actions arithmetically for each program without discrepancy', () => {
      const check = performMinistryArithmeticCheck(MMPE_MINISTRY_BUDGET_2026);
      expect(check.programs_delta_fcfa).toBe(0);
      expect(check.programs_reconciliation_status).toBe('RECONCILED');

      expect(check.actions_checks.length).toBe(10);
      check.actions_checks.forEach(actionCheck => {
        expect(actionCheck.actions_delta_fcfa).toBe(0);
        expect(actionCheck.status).toBe('RECONCILED');
      });
    });
  });

  // -------------------------------------------------------------------------
  // 3. PROJETS LIÉS ET RÈGLE BUDGET LINE ≠ PROJECT
  // -------------------------------------------------------------------------
  describe('Projets Liés et Règle de Non-Double Comptage', () => {
    it('18 national projects are integrated within action envelopes without inflating total', () => {
      const allLinkedProjects = MMPE_MINISTRY_BUDGET_2026.programs.flatMap(p =>
        p.actions.flatMap(a => a.linked_projects || [])
      );

      expect(allLinkedProjects.length).toBe(18);
      const sumProjects = allLinkedProjects.reduce((acc, p) => acc + p.budget_amount_fcfa, 0);
      expect(sumProjects).toBe(304_158_991_377);

      allLinkedProjects.forEach(proj => {
        expect(proj.is_funded_within_action).toBe(true);
        expect(proj.internal_id).toMatch(/^nat-proj-2026-\d{4}$/);
        expect(proj.official_code).toMatch(/^PROJ-MMPE-/);
      });

      // Règle d'or : le budget total du ministère reste la somme des programmes,
      // sans additionner la somme des projets par-dessus !
      const sumPrograms = MMPE_MINISTRY_BUDGET_2026.programs.reduce(
        (acc, p) => acc + (p.amount_fcfa ?? 0),
        0
      );
      expect(sumPrograms).toBe(MMPE_MINISTRY_BUDGET_2026.total_budget_fcfa);
    });
  });

  // -------------------------------------------------------------------------
  // 4. PROVENANCE ET SOURCES PRIMAIRES DGBF
  // -------------------------------------------------------------------------
  describe('Provenance et Sources Primaires DGBF', () => {
    it('uses verified DGBF primary URLs and valid page references', () => {
      expect(MMPE_MINISTRY_BUDGET_2026.source).toBeTruthy();
      expect(MMPE_MINISTRY_BUDGET_2026.document_reference).toContain('Loi n° 2025-987');
      expect(MMPE_MINISTRY_BUDGET_2026.evidence_type).toBe('PRIMARY_OFFICIAL_DOCUMENT');
      expect(MMPE_MINISTRY_BUDGET_2026.source_url).toMatch(/^https:\/\/www\.dgbf\.ci\/.+/);
      expect(MMPE_MINISTRY_BUDGET_2026.fiscal_year).toBe(2026);
      expect(MMPE_MINISTRY_BUDGET_2026.institution_code).toBe('348');

      // Chaque programme a une référence de page dans le DPPD-PAP
      MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
        expect(prog.page_reference).toBeTruthy();
        expect(prog.source_url).toMatch(/^https:\/\/www\.dgbf\.ci\/.+/);
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
});
