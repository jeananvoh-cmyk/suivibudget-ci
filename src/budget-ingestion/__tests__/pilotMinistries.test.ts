import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  runMinistryIngestionPipeline,
  getMinistryRegistryEntry,
  getPublishedMinistries,
  getVerifiedMinistries,
  getPendingMinistries,
  CanonicalMinistryExtraction,
} from '../index';

function loadCanonical(relPath: string): CanonicalMinistryExtraction {
  const fullPath = path.resolve(__dirname, '../../../', relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

describe('LOT 4 — Onboarding Documentaire des Ministères Pilotes 2026', () => {
  // =========================================================================
  // 1. MINISTÈRE DE LA JUSTICE ET DES DROITS DE L'HOMME (MJDH — 325)
  // =========================================================================
  describe('1. MJDH (Justice & Droits de l\'Homme — Section 325)', () => {
    const mjdhCanonical = loadCanonical(
      'docs/references/2026/ministry-justice-human-rights/MJDH_CANONICAL_BUDGET_2026.json'
    );

    it('valide et réconcilie le MJDH avec zéro anomalie (129 151 307 791 FCFA)', () => {
      const result = runMinistryIngestionPipeline(mjdhCanonical, {
        institutionIdOverride: 'gov-005',
      });

      expect(result.success).toBe(true);
      expect(result.canPublish).toBe(true);
      expect(result.blockers).toEqual([]);

      // Validation structurelle
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);

      // Réconciliation
      const recon = result.reconciliation!;
      expect(recon.global_status).toBe('RECONCILED');
      expect(recon.ministry_level.code).toBe('325');
      expect(recon.ministry_level.expected_amount_fcfa).toBe(129_151_307_791);
      expect(recon.ministry_level.observed_sum_fcfa).toBe(129_151_307_791);
      expect(recon.ministry_level.delta_fcfa).toBe(0);

      // 4 programmes officiels
      expect(recon.programs_level).toHaveLength(4);
      recon.programs_level.forEach(prog => {
        expect(prog.status).toBe('RECONCILED');
        expect(prog.delta_fcfa).toBe(0);
      });

      // 14 actions officielles
      expect(recon.actions_level).toHaveLength(14);
      const sumActions = recon.actions_level.reduce(
        (sum, a) => sum + (a.expected_amount_fcfa as number),
        0
      );
      expect(sumActions).toBe(129_151_307_791);

      // Modèle normalisé
      expect(result.normalizedModel).toBeDefined();
      expect(result.normalizedModel?.institution_id).toBe('gov-005');
      expect(result.normalizedModel?.total_budget_fcfa).toBe(129_151_307_791);
    });
  });

  // =========================================================================
  // 2. MINISTÈRE DE L'ÉQUIPEMENT ET DE L'ENTRETIEN ROUTIER (MEER — 330)
  // =========================================================================
  describe('2. MEER (Équipement & Entretien Routier — Section 330)', () => {
    const meerCanonical = loadCanonical(
      'docs/references/2026/ministry-equipment-road-maintenance/MEER_CANONICAL_BUDGET_2026.json'
    );

    it('valide et réconcilie le MEER incluant le FER avec zéro anomalie (734 442 904 943 FCFA)', () => {
      const result = runMinistryIngestionPipeline(meerCanonical, {
        institutionIdOverride: 'gov-025',
      });

      expect(result.success).toBe(true);
      expect(result.canPublish).toBe(true);
      expect(result.blockers).toEqual([]);

      // Validation
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);

      // Réconciliation
      const recon = result.reconciliation!;
      expect(recon.global_status).toBe('RECONCILED');
      expect(recon.ministry_level.code).toBe('330');
      expect(recon.ministry_level.expected_amount_fcfa).toBe(734_442_904_943);
      expect(recon.ministry_level.observed_sum_fcfa).toBe(734_442_904_943);
      expect(recon.ministry_level.delta_fcfa).toBe(0);

      // 3 programmes (Administration 21058, Infrastructures 22059, FER 23219)
      expect(recon.programs_level).toHaveLength(3);
      recon.programs_level.forEach(prog => {
        expect(prog.status).toBe('RECONCILED');
        expect(prog.delta_fcfa).toBe(0);
      });

      // 11 actions officielles
      expect(recon.actions_level).toHaveLength(11);
      const sumActions = recon.actions_level.reduce(
        (sum, a) => sum + (a.expected_amount_fcfa as number),
        0
      );
      expect(sumActions).toBe(734_442_904_943);

      // Modèle normalisé
      expect(result.normalizedModel).toBeDefined();
      expect(result.normalizedModel?.institution_id).toBe('gov-025');
      expect(result.normalizedModel?.total_budget_fcfa).toBe(734_442_904_943);
    });
  });

  // =========================================================================
  // 3. MINISTÈRE DE L'ENVIRONNEMENT ET TRANSITION ÉCOLOGIQUE (MINEDDTE — 343)
  // =========================================================================
  describe('3. MINEDDTE (Environnement & Transition Écologique — Section 343)', () => {
    const mineddteCanonical = loadCanonical(
      'docs/references/2026/ministry-environment-ecological-transition/MINEDDTE_CANONICAL_BUDGET_2026.json'
    );

    it('valide et réconcilie le MINEDDTE avec zéro anomalie (36 680 067 253 FCFA)', () => {
      const result = runMinistryIngestionPipeline(mineddteCanonical, {
        institutionIdOverride: 'gov-031',
      });

      expect(result.success).toBe(true);
      expect(result.canPublish).toBe(true);
      expect(result.blockers).toEqual([]);

      // Validation
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);

      // Réconciliation
      const recon = result.reconciliation!;
      expect(recon.global_status).toBe('RECONCILED');
      expect(recon.ministry_level.code).toBe('343');
      expect(recon.ministry_level.expected_amount_fcfa).toBe(36_680_067_253);
      expect(recon.ministry_level.observed_sum_fcfa).toBe(36_680_067_253);
      expect(recon.ministry_level.delta_fcfa).toBe(0);

      // 2 programmes (21079 et 22080)
      expect(recon.programs_level).toHaveLength(2);
      recon.programs_level.forEach(prog => {
        expect(prog.status).toBe('RECONCILED');
        expect(prog.delta_fcfa).toBe(0);
      });

      // 9 actions officielles
      expect(recon.actions_level).toHaveLength(9);
      const sumActions = recon.actions_level.reduce(
        (sum, a) => sum + (a.expected_amount_fcfa as number),
        0
      );
      expect(sumActions).toBe(36_680_067_253);

      // Modèle normalisé
      expect(result.normalizedModel).toBeDefined();
      expect(result.normalizedModel?.institution_id).toBe('gov-031');
      expect(result.normalizedModel?.total_budget_fcfa).toBe(36_680_067_253);
    });
  });

  // =========================================================================
  // 4. MINISTÈRE DES EAUX ET FORÊTS (MINEF — 345)
  // =========================================================================
  describe('4. MINEF (Eaux & Forêts — Section 345)', () => {
    const minefCanonical = loadCanonical(
      'docs/references/2026/ministry-water-forests/MINEF_CANONICAL_BUDGET_2026.json'
    );

    it('valide et réconcilie le MINEF incluant le FFN avec zéro anomalie (103 197 582 643 FCFA)', () => {
      const result = runMinistryIngestionPipeline(minefCanonical, {
        institutionIdOverride: 'gov-018',
      });

      expect(result.success).toBe(true);
      expect(result.canPublish).toBe(true);
      expect(result.blockers).toEqual([]);

      // Validation
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);

      // Réconciliation
      const recon = result.reconciliation!;
      expect(recon.global_status).toBe('RECONCILED');
      expect(recon.ministry_level.code).toBe('345');
      expect(recon.ministry_level.expected_amount_fcfa).toBe(103_197_582_643);
      expect(recon.ministry_level.observed_sum_fcfa).toBe(103_197_582_643);
      expect(recon.ministry_level.delta_fcfa).toBe(0);

      // 5 programmes (21088, 22089, 22090, 22091, 23228)
      expect(recon.programs_level).toHaveLength(5);
      recon.programs_level.forEach(prog => {
        expect(prog.status).toBe('RECONCILED');
        expect(prog.delta_fcfa).toBe(0);
      });

      // 18 actions officielles
      expect(recon.actions_level).toHaveLength(18);
      const sumActions = recon.actions_level.reduce(
        (sum, a) => sum + (a.expected_amount_fcfa as number),
        0
      );
      expect(sumActions).toBe(103_197_582_643);

      // Modèle normalisé
      expect(result.normalizedModel).toBeDefined();
      expect(result.normalizedModel?.institution_id).toBe('gov-018');
      expect(result.normalizedModel?.total_budget_fcfa).toBe(103_197_582_643);
    });
  });

  // =========================================================================
  // 5. REGISTRE DOCUMENTAIRE DES 35 MINISTÈRES & GOUVERNEMENT
  // =========================================================================
  describe('5. Registre Central & État d\'Onboarding', () => {
    it('enregistre 5 ministères vérifiés (MMPE + 4 pilotes LOT 4)', () => {
      const verified = getVerifiedMinistries();
      expect(verified).toHaveLength(5);
      const verifiedIds = verified.map(m => m.institution_id);
      expect(verifiedIds).toContain('gov-008'); // MMPE
      expect(verifiedIds).toContain('gov-005'); // MJDH
      expect(verifiedIds).toContain('gov-025'); // MEER
      expect(verifiedIds).toContain('gov-031'); // MINEDDTE
      expect(verifiedIds).toContain('gov-018'); // MINEF
    });

    it('seul MMPE reste PUBLISHED dans l\'application runtime (isolation stricte)', () => {
      const published = getPublishedMinistries();
      expect(published).toHaveLength(1);
      expect(published[0].institution_id).toBe('gov-008');

      const pending = getPendingMinistries();
      expect(pending).toHaveLength(34);
    });

    it('permet la recherche d\'un ministère par code DGBF officiel', () => {
      expect(getMinistryRegistryEntry('325')?.institution_id).toBe('gov-005');
      expect(getMinistryRegistryEntry('330')?.institution_id).toBe('gov-025');
      expect(getMinistryRegistryEntry('343')?.institution_id).toBe('gov-031');
      expect(getMinistryRegistryEntry('345')?.institution_id).toBe('gov-018');
      expect(getMinistryRegistryEntry('348')?.institution_id).toBe('gov-008');
    });

    it('valide le registre documentaire complet (MINISTRY_DOCUMENTATION_REGISTRY_2026.json)', () => {
      const regPath = path.resolve(
        __dirname,
        '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json'
      );
      expect(fs.existsSync(regPath)).toBe(true);

      const registryData = JSON.parse(fs.readFileSync(regPath, 'utf-8'));
      expect(registryData.total_institutions).toBe(35);
      expect(registryData.institutions).toHaveLength(35);

      // Vérifier les 5 ministères onboardés
      const validatedList = registryData.institutions.filter(
        (i: { canonical_status: string }) =>
          i.canonical_status === 'VALIDATED' || i.canonical_status === 'READY_FOR_PUBLICATION'
      );
      expect(validatedList).toHaveLength(5);

      // Les 30 autres en attente
      const pendingList = registryData.institutions.filter(
        (i: { canonical_status: string }) => i.canonical_status === 'PENDING_CANONICAL_EXTRACTION'
      );
      expect(pendingList).toHaveLength(30);
    });
  });
});
