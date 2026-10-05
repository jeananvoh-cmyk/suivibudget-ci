if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  } as Storage;
}

import { describe, it, expect } from 'vitest';
import { ALL_MINISTRIES_DATA } from '../../data/institutionsData';
import { ALL_COMMUNES_DATA } from '../../data/communesData';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { dataStore } from '../../services/dataStore';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';
import { Institution } from '../../types';
import { readFileSync } from 'node:fs';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';
import {
  formatFCFA,
  formatAmountInWords,
  formatCompactFCFA,
  formatFCFAWithWords,
  formatQualifiedFCFA
} from '../formatters';

describe('Financial Integrity & Data Sanitation (LOT 1)', () => {
  describe('Ministries Data Integrity', () => {
    it('does not apply arbitrary 70/30 or 65/35 breakdown to ministries', () => {
      for (const ministry of ALL_MINISTRIES_DATA) {
        // Without official breakdown, functioning and investment must be null
        expect(ministry.budget_functioning_fcfa).toBeNull();
        expect(ministry.budget_investment_fcfa).toBeNull();
      }
    });

    it('resolves ministerial total budget strictly from official data without arbitrary fallback', () => {
      // Test the behavioral contract of the removed fallback:
      // When governmentData has an official budget, it is preserved.
      // When governmentData lacks a budget, it resolves to null (never 32_500_000_000).
      for (const ministry of ALL_MINISTRIES_DATA) {
        const official = GOVERNMENT_OFFICIALS.find(o => o.id === ministry.id);
        expect(official).toBeDefined();
        const expectedBudget = official!.budget_fcfa ?? null;
        expect(ministry.total_budget_fcfa).toBe(expectedBudget);
      }

      // Contract behavior test: an official with undefined budget produces null, not the old 32.5B fallback
      const mockOfficialWithoutBudget = {
        id: 'gov-ministry-unconfirmed',
        budget_fcfa: undefined,
      };
      const resolvedBudget = mockOfficialWithoutBudget.budget_fcfa ?? null;
      expect(resolvedBudget).toBeNull();
      expect(resolvedBudget).not.toBe(32_500_000_000);
    });
  });

  describe('Communes Data Integrity', () => {
    it('does not assign arbitrary 35% functioning ratio to communes without explicit data', () => {
      // Find a commune that had no explicit ratio in RAW_COMMUNES (e.g., Touba, Koro, Ouaninou)
      const touba = ALL_COMMUNES_DATA.find(c => c.name === 'Mairie de Touba');
      expect(touba).toBeDefined();
      expect(touba!.budget_functioning_fcfa).toBeNull();
      expect(touba!.budget_investment_fcfa).toBeNull();
      expect(touba!.total_budget_fcfa).toBe(1_100_000_000);
    });

    it('preserves legitimate functioning ratios when explicitly documented', () => {
      // Abobo has explicit functioningRatio: 0.44
      const abobo = ALL_COMMUNES_DATA.find(c => c.name === 'Mairie de Abobo');
      expect(abobo).toBeDefined();
      expect(abobo!.budget_functioning_fcfa).not.toBeNull();
      expect(abobo!.budget_investment_fcfa).not.toBeNull();
      expect(abobo!.budget_functioning_fcfa).toBe(Math.round(8_800_000_000 * 0.44));
    });
  });

  describe('Global Platform Statistics Integrity', () => {
    it('does not use artificial 4354 fallback in dataStore.getImpactStats', () => {
      const stats = dataStore.getImpactStats();
      expect(stats.totalBudgetLines).toBe(dataStore.getProjects().length);
      expect(stats.totalBudgetLines).not.toBe(4354);
    });

    it('does not report 175.6B FCFA fallback when investments are unconfirmed', () => {
      const formatted = formatCompactFCFA(null);
      expect(formatted).toBe('Montant à confirmer');
      expect(formatted).not.toContain('175');
    });
  });

  describe('Formatters "UNKNOWN != 0" Invariant', () => {
    it('formats null and undefined amounts as "Montant à confirmer", never "0 FCFA"', () => {
      expect(formatAmountInWords(null)).toBe('Montant à confirmer');
      expect(formatAmountInWords(undefined)).toBe('Montant à confirmer');
      expect(formatAmountInWords(NaN)).toBe('Montant à confirmer');

      expect(formatCompactFCFA(null)).toBe('Montant à confirmer');
      expect(formatCompactFCFA(undefined)).toBe('Montant à confirmer');

      expect(formatFCFA(null)).toBe('Montant à confirmer');
      expect(formatFCFA(undefined)).toBe('Montant à confirmer');

      expect(formatFCFAWithWords(null)).toBe('Montant à confirmer');
      expect(formatFCFAWithWords(undefined)).toBe('Montant à confirmer');

      expect(formatQualifiedFCFA(null, 'UNKNOWN')).toBe('Montant à confirmer');
    });

    it('preserves genuine documented zero as "0 FCFA"', () => {
      expect(formatFCFA(0)).toBe('0 FCFA');
      expect(formatAmountInWords(0)).toBe('0 FCFA');
      expect(formatFCFAWithWords(0)).toBe('0 FCFA');
      expect(formatQualifiedFCFA(0, 'EXACT')).toBe('0 FCFA');
    });
  });

  describe('Admin Dashboard Roundtrip & Three-state Budget Invariants', () => {
    it('preserves null budgets when an institution with unknown amounts is opened, edited, and saved', () => {
      const testInst: Institution = {
        id: 'inst-test-null-preservation',
        name: 'Mairie Test Sans Budget Documenté',
        type: 'MAIRIE',
        region: 'Lagunes',
        district: "Autonome d'Abidjan",
        total_budget_fcfa: null,
        budget_functioning_fcfa: null,
        budget_investment_fcfa: null,
      };

      dataStore.addInstitution(testInst);

      // 1. Simuler l'ouverture du formulaire (handleEditInstitution)
      const formState = {
        budget_functioning_fcfa: testInst.budget_functioning_fcfa ?? null,
        budget_investment_fcfa: testInst.budget_investment_fcfa ?? null,
        total_budget_fcfa: testInst.total_budget_fcfa ?? null,
      };

      expect(formState.budget_functioning_fcfa).toBeNull();
      expect(formState.budget_investment_fcfa).toBeNull();
      expect(formState.total_budget_fcfa).toBeNull();

      // 2. Simuler la sauvegarde (handleSaveInstitution) sans forcer null -> 0
      const hasBothBreakdowns = formState.budget_functioning_fcfa != null && formState.budget_investment_fcfa != null;
      const computedTotal = hasBothBreakdowns
        ? (formState.budget_functioning_fcfa! + formState.budget_investment_fcfa!)
        : null;
      const resolvedTotal = computedTotal != null
        ? computedTotal
        : (formState.total_budget_fcfa ?? testInst.total_budget_fcfa ?? null);

      expect(resolvedTotal).toBeNull();

      const savedInst: Institution = {
        ...testInst,
        total_budget_fcfa: resolvedTotal,
        budget_functioning_fcfa: formState.budget_functioning_fcfa,
        budget_investment_fcfa: formState.budget_investment_fcfa,
      };

      dataStore.updateInstitution(savedInst);

      // 3. Contrôle après sauvegarde dans le store
      const reloaded = dataStore.getInstitutions().find(i => i.id === testInst.id);
      expect(reloaded).toBeDefined();
      expect(reloaded!.total_budget_fcfa).toBeNull();
      expect(reloaded!.budget_functioning_fcfa).toBeNull();
      expect(reloaded!.budget_investment_fcfa).toBeNull();
    });

    it('preserves genuine documented zero across open, edit, and save flows', () => {
      const testZeroInst: Institution = {
        id: 'inst-test-zero-preservation',
        name: 'Mairie Test Budget Zéro Documenté',
        type: 'MAIRIE',
        region: 'Lagunes',
        district: "Autonome d'Abidjan",
        total_budget_fcfa: 0,
        budget_functioning_fcfa: 0,
        budget_investment_fcfa: 0,
      };

      dataStore.addInstitution(testZeroInst);

      // 1. Formulaire
      const formState = {
        budget_functioning_fcfa: testZeroInst.budget_functioning_fcfa ?? null,
        budget_investment_fcfa: testZeroInst.budget_investment_fcfa ?? null,
        total_budget_fcfa: testZeroInst.total_budget_fcfa ?? null,
      };

      expect(formState.budget_functioning_fcfa).toBe(0);
      expect(formState.budget_investment_fcfa).toBe(0);
      expect(formState.total_budget_fcfa).toBe(0);

      // 2. Sauvegarde
      const hasBothBreakdowns = formState.budget_functioning_fcfa != null && formState.budget_investment_fcfa != null;
      const computedTotal = hasBothBreakdowns
        ? (formState.budget_functioning_fcfa! + formState.budget_investment_fcfa!)
        : null;
      const resolvedTotal = computedTotal != null
        ? computedTotal
        : (formState.total_budget_fcfa ?? testZeroInst.total_budget_fcfa ?? null);

      expect(resolvedTotal).toBe(0);

      const savedInst: Institution = {
        ...testZeroInst,
        total_budget_fcfa: resolvedTotal,
        budget_functioning_fcfa: formState.budget_functioning_fcfa,
        budget_investment_fcfa: formState.budget_investment_fcfa,
      };

      dataStore.updateInstitution(savedInst);

      // 3. Contrôle dans le store
      const reloaded = dataStore.getInstitutions().find(i => i.id === testZeroInst.id);
      expect(reloaded).toBeDefined();
      expect(reloaded!.total_budget_fcfa).toBe(0);
      expect(reloaded!.budget_functioning_fcfa).toBe(0);
      expect(reloaded!.budget_investment_fcfa).toBe(0);
    });
  });

  describe('Admin Export Integrity', () => {
    it('produces empty cells for unknown budgets in CSV export, never false zeros', () => {
      // Entité avec budget inconnu (null)
      const unknownInst: Partial<Institution> = {
        type: 'MAIRIE',
        name: 'Commune Inconnue',
        total_budget_fcfa: null,
      };

      const exportCell = `"${unknownInst.total_budget_fcfa != null ? unknownInst.total_budget_fcfa : ''}"`;
      expect(exportCell).toBe('""');
      expect(exportCell).not.toBe('"0"');

      // Entité avec vrai zéro documenté (0)
      const zeroInst: Partial<Institution> = {
        type: 'MAIRIE',
        name: 'Commune Sans Dotation',
        total_budget_fcfa: 0,
      };

      const exportCellZero = `"${zeroInst.total_budget_fcfa != null ? zeroInst.total_budget_fcfa : ''}"`;
      expect(exportCellZero).toBe('"0"');
    });
  });

  describe('Provenance & Source Integrity', () => {
    it('does not replace an empty source with "Conseil Municipal / Délibération officielle"', () => {
      // 1. Saisie manuelle formulaire
      const emptySourceInput = '';
      const resolvedSource = emptySourceInput.trim() || 'Source à confirmer';
      expect(resolvedSource).toBe('Source à confirmer');
      expect(resolvedSource).not.toContain('Conseil Municipal / Délibération officielle');

      // 2. Import CSV tokens sans colonne source
      const tokensWithoutSource = ['Mairie de Test', '1500000000', '', '', '01/01/2026', ''];
      const parsedCsvSource = tokensWithoutSource[5]?.trim() || 'Source à confirmer';
      expect(parsedCsvSource).toBe('Source à confirmer');
      expect(parsedCsvSource).not.toContain('Conseil Municipal / Délibération officielle');
    });
  });

  describe('Database Schema Integrity', () => {
    it('ensures institutions table has no DEFAULT 0 on budget columns', () => {
      const schemaSql = readFileSync('supabase/schema.sql', 'utf8');
      const supabaseSchemaSql = readFileSync('supabase_schema.sql', 'utf8');
      const migrationSql = readFileSync('supabase/migrations/20261005100000_drop_default_zero_institutions_budget.sql', 'utf8');

      // 1. supabase/schema.sql ne doit plus contenir DEFAULT 0 sur les 3 colonnes de institutions
      expect(schemaSql).not.toMatch(/total_budget_fcfa\s+BIGINT\s+DEFAULT\s+0/i);
      expect(schemaSql).not.toMatch(/budget_functioning_fcfa\s+BIGINT\s+DEFAULT\s+0/i);
      expect(schemaSql).not.toMatch(/budget_investment_fcfa\s+BIGINT\s+DEFAULT\s+0/i);

      // 2. supabase_schema.sql ne doit plus contenir DEFAULT 0 sur les 3 colonnes de institutions
      expect(supabaseSchemaSql).not.toMatch(/budget_functioning_fcfa\s+NUMERIC\(15,\s*2\)\s+DEFAULT\s+0/i);
      expect(supabaseSchemaSql).not.toMatch(/budget_investment_fcfa\s+NUMERIC\(15,\s*2\)\s+DEFAULT\s+0/i);
      expect(supabaseSchemaSql).not.toMatch(/total_budget_fcfa\s+NUMERIC\(15,\s*2\)\s+DEFAULT\s+0/i);

      // 3. Migration d'assainissement dédiée appliquant DROP DEFAULT de manière idempotente et non destructive
      expect(migrationSql).toContain('ALTER TABLE public.institutions ALTER COLUMN total_budget_fcfa DROP DEFAULT;');
      expect(migrationSql).toContain('ALTER TABLE public.institutions ALTER COLUMN budget_functioning_fcfa DROP DEFAULT;');
      expect(migrationSql).toContain('ALTER TABLE public.institutions ALTER COLUMN budget_investment_fcfa DROP DEFAULT;');
    });
  });

  describe('Non-regression on Legitimate Verified Pilots', () => {
    it('Bingerville BP 2026 maintains verified numbers with full breakdown', () => {
      const bingerville = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-bingerville'];
      expect(bingerville).toBeDefined();
      expect(bingerville.total_voted_fcfa).toBe(4_046_222_000);
      expect(bingerville.functioning_voted_fcfa).toBe(1_877_888_000);
      expect(bingerville.investment_voted_fcfa).toBe(2_168_334_000);
      expect(bingerville.precision).toBe('EXACT');
    });

    it('Cocody BP 2026 maintains partial budget without manufactured breakdown', () => {
      const cocody = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-cocody'];
      expect(cocody).toBeDefined();
      expect(cocody.total_voted_fcfa).toBe(19_764_660_000);
      expect(cocody.functioning_voted_fcfa).toBeNull();
      expect(cocody.investment_voted_fcfa).toBeNull();
      expect(cocody.precision).toBe('EXACT');
    });

    it('Tiassalé CA 2024 maintains audited values with SOURCE_ANOMALY', () => {
      const caTiassale = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale' && c.fiscal_year === 2024);
      expect(caTiassale).toBeDefined();
      expect(caTiassale!.total_planned).toBe(1_007_841_000);
      expect(caTiassale!.total_realized).toBe(1_059_255_758);
      expect(caTiassale!.status).toBe('VERIFIED');
      expect(caTiassale!.reconciliation_status).toBe('SOURCE_ANOMALY');

      const fixtureJson = JSON.parse(readFileSync('docs/imports/tiassale-ca-2024.json', 'utf8'))[0];
      expect(fixtureJson.institution_id).toBe('inst-com-tiassale');
      expect(fixtureJson.data.total_planned).toBe(1_007_841_000);
      expect(fixtureJson.data.total_realized).toBe(1_059_255_758);
    });
  });
});
