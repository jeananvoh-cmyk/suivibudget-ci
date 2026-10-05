import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  runMinistryIngestionPipeline,
  validateGenericMinistryBudget,
  reconcileMinistryBudget,
  canPublishMinistryBudget,
  generateControlReport,
  normalizeToApplicationModel,
  listRegisteredMinistries,
  getMinistryRegistryEntry,
  isMinistryPublished,
  getPublishedMinistries,
  getPendingMinistries,
  CanonicalMinistryExtraction,
  ValidationResult,
  IngestionReconciliationReport,
} from '../index';

// Charger le référentiel canonique MMPE 2026 verrouillé
const canonicalPath = path.resolve(
  __dirname,
  '../../../docs/references/2026/ministry-mines-petroleum-energy/MMPE_CANONICAL_BUDGET_2026.json'
);
const MMPE_CANONICAL: CanonicalMinistryExtraction = JSON.parse(fs.readFileSync(canonicalPath, 'utf-8'));

describe('LOT 3 — Pipeline Industriel d\'Ingestion Budgétaire Ministérielle', () => {
  // =========================================================================
  // 1. GOLDEN REFERENCE MASTER TEST (MMPE 2026)
  // =========================================================================
  describe('1. Golden Reference Master Test (MMPE 2026)', () => {
    it('processes MMPE canonical referential end-to-end with zero errors and validates publication', () => {
      const result = runMinistryIngestionPipeline(MMPE_CANONICAL, {
        institutionIdOverride: 'gov-008',
      });

      // Pipeline execution success & publication gate
      expect(result.success).toBe(true);
      expect(result.canPublish).toBe(true);
      expect(result.blockers).toEqual([]);

      // Validation
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);

      // Reconciliation Report
      expect(result.reconciliation).toBeDefined();
      const recon = result.reconciliation!;
      expect(recon.global_status).toBe('RECONCILED');

      // Ministry Level
      expect(recon.ministry_level.code).toBe('348');
      expect(recon.ministry_level.expected_amount_fcfa).toBe(706_060_209_015);
      expect(recon.ministry_level.observed_sum_fcfa).toBe(706_060_209_015);
      expect(recon.ministry_level.delta_fcfa).toBe(0);
      expect(recon.ministry_level.status).toBe('RECONCILED');
      expect(recon.ministry_level.sub_items_count).toBe(10);

      // Programs Level (Exactly 10)
      expect(recon.programs_level).toHaveLength(10);
      recon.programs_level.forEach(prog => {
        expect(prog.status).toBe('RECONCILED');
        expect(prog.delta_fcfa).toBe(0);
      });

      // Actions Level (Exactly 21)
      expect(recon.actions_level).toHaveLength(21);
      const totalActionsSum = recon.actions_level.reduce((acc, a) => acc + (a.expected_amount_fcfa ?? 0), 0);
      expect(totalActionsSum).toBe(706_060_209_015);

      // Projects Summary (Exactly 18 projects, 304 158 991 377 FCFA)
      expect(recon.projects_summary.total_projects_count).toBe(18);
      expect(recon.projects_summary.total_projects_amount_fcfa).toBe(304_158_991_377);
      expect(recon.projects_summary.is_funded_within_actions).toBe(true);
      expect(recon.projects_summary.multi_line_errors_count).toBe(0);

      // Control Report
      expect(result.controlReport).toBeDefined();
      const report = result.controlReport!;
      expect(report.ministry_code).toBe('348');
      expect(report.fiscal_year).toBe(2026);
      expect(report.program_count).toBe(10);
      expect(report.action_count).toBe(21);
      expect(report.project_count).toBe(18);
      expect(report.ministry_total).toBe(706_060_209_015);
      expect(report.programs_sum).toBe(706_060_209_015);
      expect(report.program_delta).toBe(0);
      expect(report.actions_sum).toBe(706_060_209_015);
      expect(report.projects_sum).toBe(304_158_991_377);
      expect(report.reconciliation_status).toBe('RECONCILED');
      expect(report.source_gaps).toHaveLength(0);
      expect(report.errors).toHaveLength(0);
      expect(report.can_publish).toBe(true);

      // Normalized Application Model
      expect(result.normalizedModel).toBeDefined();
      const model = result.normalizedModel!;
      expect(model.id).toBe('min-budget-2026-348');
      expect(model.institution_id).toBe('gov-008');
      expect(model.institution_code).toBe('348');
      expect(model.fiscal_year).toBe(2026);
      expect(model.total_budget_fcfa).toBe(706_060_209_015);
      expect(model.reconciliation_status).toBe('RECONCILED');
      expect(model.programs).toHaveLength(10);

      // Vérifier que les 18 projets sont tous rattachés à des actions
      const linkedProjects = model.programs.flatMap(p => p.actions.flatMap(a => a.linked_projects || []));
      expect(linkedProjects).toHaveLength(18);
      const totalLinkedProjectSum = linkedProjects.reduce((acc, p) => acc + p.budget_amount_fcfa, 0);
      expect(totalLinkedProjectSum).toBe(304_158_991_377);
    });
  });

  // =========================================================================
  // 2. SUITE DE TESTS NÉGATIFS DU VALIDATEUR GÉNÉRIQUE (12+ CAS)
  // =========================================================================
  describe('2. Tests Négatifs du Validateur Générique (Blocage Strict)', () => {
    it('Cas 1 : bloque un payload non-objet ou null (ROOT_NOT_OBJECT)', () => {
      expect(validateGenericMinistryBudget(null).isValid).toBe(false);
      expect(validateGenericMinistryBudget(undefined).isValid).toBe(false);
      expect(validateGenericMinistryBudget('string').isValid).toBe(false);
      expect(validateGenericMinistryBudget(42).isValid).toBe(false);
      expect(validateGenericMinistryBudget([]).isValid).toBe(false);

      const res = validateGenericMinistryBudget(null);
      expect(res.errors.some(e => e.rule === 'ROOT_NOT_OBJECT')).toBe(true);
    });

    it('Cas 2 : bloque l\'absence de métadonnées obligatoires (MISSING_REQUIRED_FIELD)', () => {
      const invalid = {
        ...MMPE_CANONICAL,
        institution_code: '',
        institution_name: '   ',
        fiscal_year: 1990,
      };
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'MISSING_INSTITUTION_CODE')).toBe(true);
      expect(res.errors.some(e => e.rule === 'MISSING_INSTITUTION_NAME')).toBe(true);
      expect(res.errors.some(e => e.rule === 'INVALID_FISCAL_YEAR')).toBe(true);
    });

    it('Cas 3 : bloque un montant ministériel négatif (NEGATIVE_AMOUNT)', () => {
      const invalid = {
        ...MMPE_CANONICAL,
        totals: {
          ...MMPE_CANONICAL.totals,
          total_ministry_2026_fcfa: -5000,
        },
      };
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'NEGATIVE_AMOUNT')).toBe(true);
    });

    it('Cas 4 : bloque les codes programmes en doublon (DUPLICATE_PROGRAM_CODE)', () => {
      const invalid: CanonicalMinistryExtraction = {
        ...MMPE_CANONICAL,
        programs: [
          ...MMPE_CANONICAL.programs,
          {
            ...MMPE_CANONICAL.programs[0],
            official_name: 'Copie illégale de programme',
          },
        ],
      };
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'DUPLICATE_PROGRAM_CODE')).toBe(true);
    });

    it('Cas 5 : bloque un programme vide sans aucune action (EMPTY_PROGRAM)', () => {
      const invalid: CanonicalMinistryExtraction = {
        ...MMPE_CANONICAL,
        programs: [
          {
            program_code: '99999',
            official_name: 'Programme Fantôme Sans Actions',
            program_amount_2026_fcfa: 1000,
            page_reference: 'p. 10',
            actions: [],
          },
        ],
      };
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'EMPTY_PROGRAM')).toBe(true);
    });

    it('Cas 6 : bloque les codes actions en doublon (DUPLICATE_ACTION_CODE)', () => {
      const invalid: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      // Dupliquer la première action dans le deuxième programme
      invalid.programs[1].actions.push({
        ...invalid.programs[0].actions[0],
      });
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'DUPLICATE_ACTION_CODE')).toBe(true);
    });

    it('Cas 7 : bloque une action orpheline avec un program_code incohérent (ORPHAN_ACTION)', () => {
      const invalid: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      invalid.programs[0].actions[0].program_code = 'WRONG_PROGRAM_CODE';
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'ORPHAN_ACTION')).toBe(true);
    });

    it('Cas 8 : émet des avertissements/erreurs en cas d\'absence de référence documentaire (page)', () => {
      const invalid: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      delete invalid.programs[0].page_reference;
      delete invalid.programs[0].actions[0].page_reference;
      const res = validateGenericMinistryBudget(invalid);
      expect(res.warnings.some(w => w.rule === 'MISSING_PAGE_REFERENCE')).toBe(true);
    });

    it('Cas 9 : bloque les codes projets en doublon (DUPLICATE_PROJECT_CODE)', () => {
      const invalid: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      if (invalid.projects && invalid.projects.length > 0) {
        invalid.projects.push({ ...invalid.projects[0] });
      }
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'DUPLICATE_PROJECT_CODE')).toBe(true);
    });

    it('Cas 10 : bloque un projet orphelin rattaché à un programme ou action inexistants (ORPHAN_PROJECT)', () => {
      const invalid: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      if (invalid.projects && invalid.projects.length > 0) {
        invalid.projects[0].program_code = 'UNKNOWN_PROG';
        invalid.projects[0].action_code = 'UNKNOWN_ACT';
      }
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'ORPHAN_PROJECT')).toBe(true);
    });

    it('Cas 11 : bloque un projet multi-lignes dont la somme des lignes ne correspond pas au consolidé (MULTI_LINE_SUM_MISMATCH)', () => {
      const invalid: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      // Trouver un projet multi-lignes déclaré
      const multiLineProj = invalid.projects?.find(p => p.amount_derivation === 'SUM_OF_OFFICIAL_SOURCE_LINES');
      expect(multiLineProj).toBeDefined();
      if (multiLineProj) {
        multiLineProj.consolidated_amount_2026_fcfa = multiLineProj.consolidated_amount_2026_fcfa + 100_000; // Altération de la somme
      }
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'MULTI_LINE_SUM_MISMATCH')).toBe(true);
    });

    it('Cas 12 : bloque un montant négatif dans les lignes sources d\'un projet (NEGATIVE_AMOUNT)', () => {
      const invalid: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      if (invalid.projects && invalid.projects[0]?.source_lines?.length > 0) {
        invalid.projects[0].source_lines[0].amount_2026_fcfa = -1000;
        invalid.projects[0].source_lines[0].amount_fcfa = -1000;
      }
      const res = validateGenericMinistryBudget(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.rule === 'NEGATIVE_AMOUNT')).toBe(true);
    });

    it('Cas 13 : invariant UNKNOWN != 0 respecté (null est valide, mais non confondu avec zéro)', () => {
      const withNull: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      withNull.programs[0].program_amount_2026_fcfa = null;
      withNull.programs[0].actions[0].amount_2026_fcfa = null;
      const res = validateGenericMinistryBudget(withNull);
      // Null est syntaxiquement accepté (non rejeté par ROOT validator car un montant inconnu peut exister)
      // mais le réconciliateur signalera un statut SOURCE_GAP ou NOT_COMPARABLE
      expect(res.errors.filter(e => e.rule === 'NEGATIVE_AMOUNT')).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. TESTS DU RÉCONCILIATEUR ET DU PORTAIL DE PUBLICATION (GATES)
  // =========================================================================
  describe('3. Réconciliation Arithmétique et Portail de Publication', () => {
    it('détecte un écart entre somme des programmes et total ministère et bloque la publication', () => {
      const withGap: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      // Altération du montant d'un programme
      withGap.programs[0].program_amount_2026_fcfa = (withGap.programs[0].program_amount_2026_fcfa ?? 0) + 1_000_000;

      const recon = reconcileMinistryBudget(withGap);
      expect(recon.ministry_level.status).toBe('SOURCE_GAP');
      expect(recon.ministry_level.delta_fcfa).toBe(1_000_000);
      expect(recon.global_status).toBe('SOURCE_GAP');

      const val = validateGenericMinistryBudget(withGap);
      const gate = canPublishMinistryBudget(val, recon);
      expect(gate.canPublish).toBe(false);
      expect(gate.blockerReasons.some(b => b.includes('Écart arithmétique global'))).toBe(true);
    });

    it('détecte un écart entre actions et programme parent et bloque la publication', () => {
      const withGap: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(MMPE_CANONICAL));
      // Altération de la somme des actions du programme 1
      withGap.programs[0].actions[0].amount_2026_fcfa = (withGap.programs[0].actions[0].amount_2026_fcfa ?? 0) + 500_000;

      const recon = reconcileMinistryBudget(withGap);
      const progCheck = recon.programs_level.find(p => p.code === withGap.programs[0].program_code);
      expect(progCheck?.status).toBe('SOURCE_GAP');
      expect(progCheck?.delta_fcfa).toBe(500_000);
      expect(recon.global_status).toBe('SOURCE_GAP');

      const val = validateGenericMinistryBudget(withGap);
      const gate = canPublishMinistryBudget(val, recon);
      expect(gate.canPublish).toBe(false);
      expect(gate.blockerReasons.some(b => b.includes('Programme'))).toBe(true);
    });

    it('bloque la publication si la validation contient des erreurs critiques', () => {
      const mockValidation: ValidationResult = {
        isValid: false,
        errors: [{ path: 'root', rule: 'CRITICAL_ERROR', message: 'Erreur critique de test', critical: true }],
        warnings: [],
      };
      const mockReconciliation: IngestionReconciliationReport = {
        institution_code: '348',
        fiscal_year: 2026,
        ministry_level: {
          code: '348',
          name: 'MMPE',
          level: 'MINISTRY',
          expected_amount_fcfa: 100,
          observed_sum_fcfa: 100,
          delta_fcfa: 0,
          status: 'RECONCILED',
          sub_items_count: 1,
        },
        programs_level: [],
        actions_level: [],
        projects_summary: {
          total_projects_count: 0,
          total_projects_amount_fcfa: 0,
          is_funded_within_actions: true,
          multi_line_projects_checked: 0,
          multi_line_errors_count: 0,
        },
        global_status: 'RECONCILED',
      };

      const gate = canPublishMinistryBudget(mockValidation, mockReconciliation);
      expect(gate.canPublish).toBe(false);
      expect(gate.blockerReasons).toContain('Validation en échec : 1 erreur(s) détectée(s).');
    });
  });

  // =========================================================================
  // 4. TESTS DU REGISTRE DES 35 MINISTÈRES
  // =========================================================================
  describe('4. Registre Central des 35 Ministères (Industrialisation)', () => {
    it('enregistre exactement les 35 entités gouvernementales 2026', () => {
      const list = listRegisteredMinistries();
      expect(list).toHaveLength(35);
    });

    it('isole MMPE (gov-008 / 348) comme le seul ministère PUBLISHED et VERIFIED', () => {
      const mmpeById = getMinistryRegistryEntry('gov-008');
      expect(mmpeById).toBeDefined();
      expect(mmpeById?.ministry_code).toBe('348');
      expect(mmpeById?.institution_id).toBe('gov-008');
      expect(mmpeById?.validation_status).toBe('VERIFIED');
      expect(mmpeById?.publication_status).toBe('PUBLISHED');
      expect(mmpeById?.canonical_reference_path).toBe(
        'docs/references/2026/ministry-mines-petroleum-energy/MMPE_CANONICAL_BUDGET_2026.json'
      );
      expect(mmpeById?.application_data_path).toBe('src/data/ministryBudgets/2026/mmpe.json');

      const mmpeByCode = getMinistryRegistryEntry('348');
      expect(mmpeByCode).toBeDefined();
      expect(mmpeByCode?.institution_id).toBe('gov-008');

      expect(isMinistryPublished('gov-008')).toBe(true);
      expect(isMinistryPublished('348')).toBe(true);
    });

    it('maintient les 34 autres ministères en statut PENDING_DOCUMENTATION et DRAFT', () => {
      const published = getPublishedMinistries();
      expect(published).toHaveLength(1);
      expect(published[0].institution_id).toBe('gov-008');

      const pending = getPendingMinistries();
      expect(pending).toHaveLength(34);

      // Exemple : Primature gov-001
      const primature = getMinistryRegistryEntry('gov-001');
      expect(primature).toBeDefined();
      expect(primature?.validation_status).toBe('PENDING_DOCUMENTATION');
      expect(primature?.publication_status).toBe('DRAFT');
      expect(primature?.canonical_reference_path).toBe('');
      expect(isMinistryPublished('gov-001')).toBe(false);
    });

    it('retourne undefined pour un identifiant inconnu', () => {
      expect(getMinistryRegistryEntry('non-existent-gov')).toBeUndefined();
      expect(isMinistryPublished('non-existent-gov')).toBe(false);
    });
  });
});
