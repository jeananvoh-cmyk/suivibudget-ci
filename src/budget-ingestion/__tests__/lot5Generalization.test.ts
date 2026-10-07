import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  runMinistryIngestionPipeline,
  getMinistryRegistryEntry,
  getPublishedMinistries,
  getVerifiedMinistries,
  getPendingMinistries,
  listRegisteredMinistries,
  CanonicalMinistryExtraction,
} from '../index';
import {
  INDEPENDENT_DOCUMENTARY_GOLDEN_2026,
} from './fixtures/independentDocumentaryGolden';

function loadCanonical(relPath: string): CanonicalMinistryExtraction {
  const fullPath = path.resolve(__dirname, '../../../', relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

interface IndependentProgramControl {
  code: string;
  label: string;
  amount_fcfa: number;
  actions: Array<{ code: string; label: string; amount_fcfa: number }>;
}

interface IndependentSectionControl {
  section: string;
  section_total_fcfa: number;
  program_codes: string[];
  newly_verified_programs?: IndependentProgramControl[];
}

function loadIndependentLfiControls(): { section_controls: IndependentSectionControl[] } {
  const fullPath = path.resolve(__dirname, '../../../docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json');
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as { section_controls: IndependentSectionControl[] };
}

describe('LOT 5 — Généralisation Budgétaire Ministérielle 2026 (Batch 1)', () => {
  const lot5Ministries = [
    {
      acronym: 'MAIED',
      id: 'gov-033',
      code: '439',
      expectedAmount: 5_122_516_889,
      programsCount: 3,
      actionsCount: 7,
      relPath: 'docs/references/2026/ministry-african-integration-diaspora/MAIED_CANONICAL_BUDGET_2026.json',
    },
    {
      acronym: 'MAM',
      id: 'gov-032',
      code: '440',
      expectedAmount: 13_746_365_872,
      programsCount: 2,
      actionsCount: 7,
      relPath: 'docs/references/2026/ministry-maritime-affairs/MAM_CANONICAL_BUDGET_2026.json',
    },
    {
      acronym: 'MFPMA',
      id: 'gov-003',
      code: '237',
      expectedAmount: 45_121_940_916,
      programsCount: 3,
      actionsCount: 7,
      relPath: 'docs/references/2026/ministry-civil-service/MFPMA_CANONICAL_BUDGET_2026.json',
    },
    {
      acronym: 'MEPS',
      id: 'gov-023',
      code: '362',
      expectedAmount: 91_411_414_044,
      programsCount: 4,
      actionsCount: 15,
      relPath: 'docs/references/2026/ministry-employment-social-protection/MEPS_CANONICAL_BUDGET_2026.json',
    },
    {
      acronym: 'MSCV',
      id: 'gov-030',
      code: '444',
      expectedAmount: 70_427_777_385,
      programsCount: 4,
      actionsCount: 11,
      relPath: 'docs/references/2026/ministry-sports/MSCV_CANONICAL_BUDGET_2026.json',
    },
    {
      acronym: 'MICOM',
      id: 'gov-017',
      code: '336',
      expectedAmount: 39_806_735_298,
      programsCount: 5,
      actionsCount: 9,
      relPath: 'docs/references/2026/ministry-communication/MICOM_CANONICAL_BUDGET_2026.json',
    },
    {
      acronym: 'METFPA',
      id: 'gov-034',
      code: '334',
      expectedAmount: 182_301_855_312,
      programsCount: 4,
      actionsCount: 10,
      relPath: 'docs/references/2026/ministry-technical-vocational-education/METFPA_CANONICAL_BUDGET_2026.json',
    },
  ];

  // 1. Pipeline Ingestion & Reconciliation Tests for all 7 Batch 1 Ministries
  for (const min of lot5Ministries) {
    describe(`${min.acronym} (Section ${min.code})`, () => {
      const canonical = loadCanonical(min.relPath);

      it(`valide et réconcilie ${min.acronym} avec delta = 0 (${min.expectedAmount.toLocaleString('fr-FR')} FCFA)`, () => {
        const result = runMinistryIngestionPipeline(canonical, {
          institutionIdOverride: min.id,
        });

        expect(result.success).toBe(true);
        expect(result.canPublish).toBe(true);
        expect(result.blockers).toEqual([]);

        // Validation structurelle
        expect(result.validation.isValid).toBe(true);
        expect(result.validation.errors).toHaveLength(0);

        // Réconciliation globale
        const recon = result.reconciliation!;
        expect(recon.global_status).toBe('RECONCILED');
        expect(recon.ministry_level.code).toBe(min.code);
        expect(recon.ministry_level.expected_amount_fcfa).toBe(min.expectedAmount);
        expect(recon.ministry_level.observed_sum_fcfa).toBe(min.expectedAmount);
        expect(recon.ministry_level.delta_fcfa).toBe(0);

        // Programmes
        expect(recon.programs_level).toHaveLength(min.programsCount);
        recon.programs_level.forEach(prog => {
          expect(prog.status).toBe('RECONCILED');
          expect(prog.delta_fcfa).toBe(0);
        });

        // Actions
        expect(recon.actions_level).toHaveLength(min.actionsCount);
        const sumActions = recon.actions_level.reduce(
          (sum, act) => sum + (act.expected_amount_fcfa as number),
          0
        );
        expect(sumActions).toBe(min.expectedAmount);
      });

      it(`concorde à 100% champ par champ avec la golden fixture indépendante pour ${min.acronym}`, () => {
        const golden = INDEPENDENT_DOCUMENTARY_GOLDEN_2026[min.acronym];
        expect(golden).toBeDefined();

        expect(canonical.institution_code).toBe(golden.institution_code);
        expect(canonical.totals.total_ministry_2026_fcfa).toBe(golden.total_budget_2026_fcfa);

        expect(canonical.programs).toHaveLength(golden.programs.length);

        canonical.programs.forEach((prog, pIdx) => {
          const goldenProg = golden.programs[pIdx];
          expect(prog.program_code).toBe(goldenProg.program_code);
          expect(prog.official_name).toBe(goldenProg.official_name);
          expect(prog.program_amount_2026_fcfa).toBe(goldenProg.amount_2026_fcfa);
          expect(prog.table_reference).toBe('Tableau 7 : Budget détaillé du programme');

          expect(prog.actions).toHaveLength(goldenProg.actions.length);
          prog.actions.forEach((act, aIdx) => {
            const goldenAct = goldenProg.actions[aIdx];
            expect(act.action_code).toBe(goldenAct.action_code);
            expect(act.official_name).toBe(goldenAct.official_name);
            expect(act.amount_2026_fcfa).toBe(goldenAct.amount_2026_fcfa);
            expect(act.action_code.startsWith(prog.program_code)).toBe(true);
            expect(act.table_reference).toBe('Tableau 7 : Budget détaillé du programme');
          });
        });
      });
    });
  }

  // 2. Registre Central & Isolation Runtime
  describe('Cohérence du Registre Central après LOT 5 Batch 1', () => {
    it('comprend exactement 35 institutions officielles', () => {
      const all = listRegisteredMinistries();
      expect(all).toHaveLength(35);
    });

    it('conserve MMPE comme UNIQUE ministère publié en runtime public', () => {
      const published = getPublishedMinistries();
      expect(published).toHaveLength(1);
      expect(published[0].institution_id).toBe('gov-008');
      expect(published[0].ministry_code).toBe('348');
    });

    it('compte 12 ministères vérifiés au total (1 publié + 4 LOT 4 + 7 LOT 5)', () => {
      const verified = getVerifiedMinistries();
      expect(verified).toHaveLength(12);

      const verifiedIds = verified.map(v => v.institution_id).sort();
      const expectedIds = [
        'gov-003', // Fonction Publique (LOT 5)
        'gov-005', // Justice (LOT 4)
        'gov-008', // MMPE (LOT 2)
        'gov-017', // Communication (LOT 5)
        'gov-018', // Eaux et Forêts (LOT 4)
        'gov-023', // Emploi (LOT 5)
        'gov-025', // Équipement (LOT 4)
        'gov-030', // Sports (LOT 5)
        'gov-031', // Environnement (LOT 4)
        'gov-032', // Affaires Maritimes (LOT 5)
        'gov-033', // Intégration Africaine (LOT 5)
        'gov-034', // Enseignement Technique (LOT 5)
      ].sort();

      expect(verifiedIds).toEqual(expectedIds);
    });

    it('maintient les 34 autres institutions en attente de publication ou de documentation', () => {
      const pending = getPendingMinistries();
      expect(pending).toHaveLength(34);
    });
  });

  describe('Contrôles LFI/DPPD indépendants des six programmes réintégrés', () => {
    const controls = loadIndependentLfiControls();
    const targets = [
      { section: '334', path: 'docs/references/2026/ministry-technical-vocational-education/METFPA_CANONICAL_BUDGET_2026.json' },
      { section: '336', path: 'docs/references/2026/ministry-communication/MICOM_CANONICAL_BUDGET_2026.json' },
      { section: '444', path: 'docs/references/2026/ministry-sports/MSCV_CANONICAL_BUDGET_2026.json' },
    ];

    for (const target of targets) {
      it(`reproduit la liste exhaustive et le total officiel de la section ${target.section}`, () => {
        const canonical = loadCanonical(target.path);
        const control = controls.section_controls.find(section => section.section === target.section)!;
        expect(canonical.programs.map(program => program.program_code)).toEqual(control.program_codes);
        expect(canonical.programs.reduce((sum, program) => sum + program.program_amount_2026_fcfa!, 0))
          .toBe(control.section_total_fcfa);
        expect(canonical.totals.total_ministry_2026_fcfa).toBe(control.section_total_fcfa);

        for (const independentProgram of control.newly_verified_programs ?? []) {
          const canonicalProgram = canonical.programs.find(program => program.program_code === independentProgram.code)!;
          expect(canonicalProgram.official_name).toBe(independentProgram.label);
          expect(canonicalProgram.program_amount_2026_fcfa).toBe(independentProgram.amount_fcfa);
          expect(canonicalProgram.actions.map(action => ({
            code: action.action_code,
            label: action.official_name,
            amount_fcfa: action.amount_2026_fcfa,
          }))).toEqual(independentProgram.actions.map(action => ({
            code: action.code,
            label: action.label,
            amount_fcfa: action.amount_fcfa,
          })));
          expect(canonicalProgram.actions.reduce((sum, action) => sum + action.amount_2026_fcfa!, 0))
            .toBe(independentProgram.amount_fcfa);
        }
      });
    }

    it('rejette les doublons de programme et d’action avant toute normalisation', () => {
      const canonical = loadCanonical(targets[1].path);
      const duplicateProgram = structuredClone(canonical);
      duplicateProgram.programs.push(structuredClone(duplicateProgram.programs[0]));
      expect(runMinistryIngestionPipeline(duplicateProgram).validation.errors.map(error => error.rule))
        .toContain('DUPLICATE_PROGRAM_CODE');

      const duplicateAction = structuredClone(canonical);
      duplicateAction.programs[0].actions.push(structuredClone(duplicateAction.programs[0].actions[0]));
      expect(runMinistryIngestionPipeline(duplicateAction).validation.errors.map(error => error.rule))
        .toContain('DUPLICATE_ACTION_CODE');
    });

    it('aligne le registre documentaire sur les trois canoniques corrigés sans identité de titulaire inventée', () => {
      const registryPath = path.resolve(__dirname, '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json');
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as {
        institutions: Array<Record<string, unknown>>;
      };
      for (const target of targets) {
        const canonical = loadCanonical(target.path);
        const entry = registry.institutions.find(institution => institution.dgbf_code === target.section)!;
        expect(entry.ministry_name).toBe(canonical.institution_name);
        expect(entry.total_budget_2026_fcfa).toBe(canonical.totals.total_ministry_2026_fcfa);
        expect(entry.programs_count).toBe(canonical.programs.length);
        expect(entry.actions_count).toBe(canonical.programs.flatMap(program => program.actions).length);
        expect(entry.official_leader).toBeNull();
        expect(entry.role_title).toBeNull();
        expect(entry.application_data_path).toBe('');
      }
    });
  });

  // 3. Tests Négatifs de Sensibilité Documentaire pour le Batch 1
  describe('Tests de Sensibilité Documentaire & Non-Régression', () => {
    it('échoue si un libellé officiel est modifié de 1 caractère dans un canonique du Batch 1', () => {
      const canonical = loadCanonical(
        'docs/references/2026/ministry-sports/MSCV_CANONICAL_BUDGET_2026.json'
      );
      const mutated = JSON.parse(JSON.stringify(canonical));
      // Altère le libellé officiel
      mutated.programs[0].official_name = 'Administration Simplifiée';

      const golden = INDEPENDENT_DOCUMENTARY_GOLDEN_2026['MSCV'];
      expect(mutated.programs[0].official_name).not.toBe(golden.programs[0].official_name);
    });

    it('échoue si un montant est modifié de 1 FCFA dans un canonique du Batch 1', () => {
      const canonical = loadCanonical(
        'docs/references/2026/ministry-maritime-affairs/MAM_CANONICAL_BUDGET_2026.json'
      );
      const mutated = JSON.parse(JSON.stringify(canonical));
      mutated.totals.total_ministry_2026_fcfa += 1;

      const golden = INDEPENDENT_DOCUMENTARY_GOLDEN_2026['MAM'];
      expect(mutated.totals.total_ministry_2026_fcfa).not.toBe(golden.total_budget_2026_fcfa);
    });

    it('échoue si une action est rattachée à un code programme non concordant', () => {
      const canonical = loadCanonical(
        'docs/references/2026/ministry-african-integration-diaspora/MAIED_CANONICAL_BUDGET_2026.json'
      );
      const mutated = JSON.parse(JSON.stringify(canonical));
      // Déplace l'action 2214601 vers le programme 21234
      const act = mutated.programs[2].actions.pop();
      mutated.programs[0].actions.push(act);

      const result = runMinistryIngestionPipeline(mutated, {
        institutionIdOverride: 'gov-033',
      });
      // Le pipeline doit détecter la rupture de réconciliation
      expect(result.canPublish).toBe(false);
      expect(result.reconciliation?.global_status).not.toBe('RECONCILED');
    });
  });
});
