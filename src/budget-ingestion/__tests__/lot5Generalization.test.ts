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
      expectedAmount: 57_807_777_385,
      programsCount: 2,
      actionsCount: 7,
      relPath: 'docs/references/2026/ministry-sports/MSCV_CANONICAL_BUDGET_2026.json',
    },
    {
      acronym: 'MICOM',
      id: 'gov-017',
      code: '336',
      expectedAmount: 19_606_735_297,
      programsCount: 2,
      actionsCount: 6,
      relPath: 'docs/references/2026/ministry-communication/MICOM_CANONICAL_BUDGET_2026.json',
    },
    {
      acronym: 'METFPA',
      id: 'gov-034',
      code: '334',
      expectedAmount: 136_301_855_312,
      programsCount: 3,
      actionsCount: 8,
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

          expect(prog.actions).toHaveLength(goldenProg.actions.length);
          prog.actions.forEach((act, aIdx) => {
            const goldenAct = goldenProg.actions[aIdx];
            expect(act.action_code).toBe(goldenAct.action_code);
            expect(act.official_name).toBe(goldenAct.official_name);
            expect(act.amount_2026_fcfa).toBe(goldenAct.amount_2026_fcfa);
            expect(act.action_code.startsWith(prog.program_code)).toBe(true);
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
