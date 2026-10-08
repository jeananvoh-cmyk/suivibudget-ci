import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  runMinistryIngestionPipeline,
  getMinistryRegistryEntry,
  getPublishedMinistries,
  getVerifiedMinistries,
  listRegisteredMinistries,
  CanonicalMinistryExtraction,
} from '../index';
import {
  INDEPENDENT_DOCUMENTARY_GOLDEN_2026,
  INDEPENDENT_LFI_REFERENCES_2026,
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

  // 1. Contrôle Indépendant LFI 2026 : Périmètre Complet & Référence en dur
  describe('Contrôles Indépendants LFI 2026 (Périmètre LFI Complet)', () => {
    for (const min of lot5Ministries) {
      it(`vérifie la conformité absolue de ${min.acronym} contre la référence indépendante LFI 2026`, () => {
        const canonical = loadCanonical(min.relPath);
        const lfiRef = INDEPENDENT_LFI_REFERENCES_2026[min.acronym];
        expect(lfiRef).toBeDefined();

        // Contrôle 1 : Total LFI officiel exact
        expect(canonical.totals.total_ministry_2026_fcfa).toBe(lfiRef.lfi_total_fcfa);
        expect(canonical.totals.total_ministry_2026_fcfa).toBe(min.expectedAmount);

        // Contrôle 2 : Nombre complet de programmes officiels
        expect(canonical.programs.length).toBe(lfiRef.program_count);
        expect(canonical.programs.length).toBe(min.programsCount);

        // Contrôle 3 : Codes programmes officiels
        const canonicalProgCodes = canonical.programs.map((p) => p.program_code).sort();
        const expectedProgCodes = [...lfiRef.program_codes].sort();
        expect(canonicalProgCodes).toEqual(expectedProgCodes);

        // Contrôle 4 : Montants individuels de chaque programme LFI
        for (const p of canonical.programs) {
          const expectedAmt = lfiRef.program_amounts_fcfa[p.program_code];
          expect(expectedAmt).toBeDefined();
          expect(p.program_amount_2026_fcfa).toBe(expectedAmt);
        }

        // Contrôle 5 : Somme de tous les programmes = Total LFI officiel (delta = 0)
        const progSum = canonical.programs.reduce(
          (acc, p) => acc + (p.program_amount_2026_fcfa ?? 0),
          0
        );
        expect(progSum).toBe(lfiRef.lfi_total_fcfa);
      });
    }
  });

  // 2. Pipeline Ingestion & Reconciliation Tests for all 7 Batch 1 Ministries
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

        const recon = result.reconciliation!;
        expect(recon).toBeDefined();
        expect(recon.global_status).toBe('RECONCILED');
        expect(recon.ministry_level.status).toBe('RECONCILED');
        expect(recon.ministry_level.delta_fcfa).toBe(0);
        expect(recon.ministry_level.expected_amount_fcfa).toBe(min.expectedAmount);

        // Vérification du nombre de programmes et actions
        expect(canonical.programs.length).toBe(min.programsCount);
        const totalActions = canonical.programs.reduce((acc, p) => acc + p.actions.length, 0);
        expect(totalActions).toBe(min.actionsCount);
      });

      it(`vérifie la conformité de ${min.acronym} avec la fixture golden indépendante`, () => {
        const golden = INDEPENDENT_DOCUMENTARY_GOLDEN_2026[min.acronym];
        expect(golden).toBeDefined();
        expect(canonical.totals.total_ministry_2026_fcfa).toBe(golden.total_budget_2026_fcfa);
        expect(canonical.programs.length).toBe(golden.programs.length);

        for (let i = 0; i < golden.programs.length; i++) {
          const expectedProg = golden.programs[i];
          const actualProg = canonical.programs.find((p) => p.program_code === expectedProg.program_code);
          expect(actualProg).toBeDefined();
          expect(actualProg!.official_name).toBe(expectedProg.official_name);
          expect(actualProg!.program_amount_2026_fcfa).toBe(expectedProg.amount_2026_fcfa);

          // Vérification des actions
          expect(actualProg!.actions.length).toBe(expectedProg.actions.length);
          for (const expectedAct of expectedProg.actions) {
            const actualAct = actualProg!.actions.find((a) => a.action_code === expectedAct.action_code);
            expect(actualAct).toBeDefined();
            expect(actualAct!.official_name).toBe(expectedAct.official_name);
            expect(actualAct!.amount_2026_fcfa).toBe(expectedAct.amount_2026_fcfa);
          }
        }
      });
    });
  }

  // 3. Contrôle de l'Isolation de Publication (Seul MMPE est PUBLISHED)
  describe('Isolation Stricte de Publication', () => {
    it('confirme que SEUL le MMPE (gov-008) est PUBLISHED dans le registre', () => {
      const published = getPublishedMinistries();
      expect(published.length).toBe(1);
      expect(published[0].institution_id).toBe('gov-008');
      expect(published[0].ministry_code).toBe('348');
    });

    it('confirme que les 7 ministères du Batch 1 ne sont PAS publiés publiquement (statut STAGED)', () => {
      for (const min of lot5Ministries) {
        const entry = getMinistryRegistryEntry(min.id);
        expect(entry).toBeDefined();
        expect(entry!.publication_status).toBe('STAGED');
        expect(entry!.validation_status).toBe('VERIFIED');
      }
    });

    it('confirme que le registre compte exactement 12 ministères vérifiés (MMPE + 4 pilotes LOT 4 + 7 Batch 1)', () => {
      const verified = getVerifiedMinistries();
      expect(verified.length).toBe(12);

      const verifiedIds = verified.map((m) => m.institution_id);
      expect(verifiedIds).toContain('gov-008'); // MMPE
      expect(verifiedIds).toContain('gov-005'); // MJDH
      expect(verifiedIds).toContain('gov-025'); // MEER
      expect(verifiedIds).toContain('gov-031'); // MINEDDTE
      expect(verifiedIds).toContain('gov-018'); // MINEF
      for (const min of lot5Ministries) {
        expect(verifiedIds).toContain(min.id);
      }
    });

    it('confirme que les 23 autres institutions restent en attente de documentation', () => {
      const all = listRegisteredMinistries();
      expect(all.length).toBe(35);
      const pendingDocs = all.filter((m) => m.validation_status === 'PENDING_DOCUMENTATION');
      expect(pendingDocs.length).toBe(23);
    });
  });

  // 4. Tests Négatifs de Sensibilité & Rejet d'Écarts
  describe('Tests Négatifs de Sensibilité & Détection de Périmètre Incomplet', () => {
    it('rejette immédiatement une section si un programme LFI obligatoire est omis (périmètre incomplet)', () => {
      const canonical = loadCanonical(lot5Ministries[5].relPath); // MICOM (5 progs)
      // Simuler l'omission des 3 programmes d'appui (RTI, IDT, Médias)
      const incompleteCanonical: CanonicalMinistryExtraction = {
        ...canonical,
        programs: canonical.programs.slice(0, 2), // seulement les 2 premiers
      };

      const result = runMinistryIngestionPipeline(incompleteCanonical, {
        institutionIdOverride: 'gov-017',
      });
      expect(result.canPublish).toBe(false);
      expect(result.reconciliation).toBeDefined();
      expect(result.reconciliation!.global_status).toBe('SOURCE_GAP');
      expect(result.reconciliation!.ministry_level.status).toBe('SOURCE_GAP');
      expect(result.reconciliation!.ministry_level.delta_fcfa).not.toBe(0);
    });

    it('rejette immédiatement une section si le total ministériel est altéré', () => {
      const canonical = loadCanonical(lot5Ministries[0].relPath);
      const tampered: CanonicalMinistryExtraction = {
        ...canonical,
        totals: {
          ...canonical.totals,
          total_ministry_2026_fcfa: (canonical.totals.total_ministry_2026_fcfa ?? 0) + 1_000_000,
        },
      };

      const result = runMinistryIngestionPipeline(tampered, {
        institutionIdOverride: 'gov-033',
      });
      expect(result.canPublish).toBe(false);
      expect(result.reconciliation).toBeDefined();
      expect(result.reconciliation!.ministry_level.status).toBe('SOURCE_GAP');
      expect(result.reconciliation!.ministry_level.delta_fcfa).toBe(-1_000_000);
    });

    it('rejette une section si une action est altérée créant un delta au niveau programme', () => {
      const canonical = loadCanonical(lot5Ministries[1].relPath);
      const tampered: CanonicalMinistryExtraction = JSON.parse(JSON.stringify(canonical));
      tampered.programs[0].actions[0].amount_2026_fcfa = (tampered.programs[0].actions[0].amount_2026_fcfa ?? 0) + 500_000;

      const result = runMinistryIngestionPipeline(tampered, {
        institutionIdOverride: 'gov-032',
      });
      expect(result.canPublish).toBe(false);
      expect(result.reconciliation).toBeDefined();
      expect(result.reconciliation!.programs_level[0].status).toBe('SOURCE_GAP');
      expect(result.reconciliation!.programs_level[0].delta_fcfa).toBe(500_000);
    });

    it('refuse catégoriquement de publier un ministère du Batch 1 en mode direct non-autorisé', () => {
      const canonical = loadCanonical(lot5Ministries[2].relPath); // MFPMA
      const result = runMinistryIngestionPipeline(canonical, {
        institutionIdOverride: 'gov-003',
      });

      expect(result.success).toBe(true);
      const entry = getMinistryRegistryEntry('gov-003');
      expect(entry!.publication_status).toBe('STAGED');
    });
  });
});
