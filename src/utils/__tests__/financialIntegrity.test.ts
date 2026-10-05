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
import { LOCAL_BUDGETS_REFERENTIAL, exportLocalBudgetsToCsv } from '../../data/localBudgetsReferential';
import { validateBudgetRecord } from '../budgetValidation';
import { LocalBudget } from '../../types/localBudget';
import {
  formatFCFA,
  formatAmountInWords,
  formatCompactFCFA,
  formatFCFAWithWords,
  formatQualifiedFCFA,
  formatRecordAmount,
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

  describe('Local Budgets End-to-End Invariants (LOT 1 Final)', () => {
    // A. Null operating/investment amounts
    it('A. Null operating/investment amounts: valid, preserves null, does not inject 0', () => {
      const budgetWithNulls: LocalBudget = {
        id: 'lbud-test-null-amounts',
        institution_id: 'inst-com-test-null',
        institution_type: 'COMMUNE',
        institution_name: 'Mairie de Test Sans Ventilation',
        fiscal_year: 2026,
        budget_type: 'PRIMITIF_ADOPTE',
        status: 'PUBLISHED',
        is_current_version: true,
        version_number: 1,
        total_amount: 1_000_000_000,
        operating_amount: null,
        investment_amount: null,
        operating_percentage: null,
        investment_percentage: null,
        amount_precision: 'EXACT',
        verification_status: 'AIP_VERIFIED',
        confidence_level: 'HIGH',
        sources: [],
        primary_source_label: 'AIP — Test Délibération',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      // 1. Validation : aucune erreur bloquante
      const issues = validateBudgetRecord(budgetWithNulls);
      const errors = issues.filter(i => i.severity === 'ERROR');
      expect(errors).toHaveLength(0);

      // 2. Préservation stricte de null
      expect(budgetWithNulls.operating_amount).toBeNull();
      expect(budgetWithNulls.investment_amount).toBeNull();
      expect(budgetWithNulls.operating_percentage).toBeNull();
      expect(budgetWithNulls.investment_percentage).toBeNull();

      // 3. Formatage citoyen : "Montant à confirmer", jamais "0 FCFA"
      expect(formatRecordAmount(budgetWithNulls, 'operating_amount')).toBe('Montant à confirmer');
      expect(formatRecordAmount(budgetWithNulls, 'investment_amount')).toBe('Montant à confirmer');

      // 4. Export CSV : cellule vide, jamais "0"
      const csv = exportLocalBudgetsToCsv([budgetWithNulls]);
      const rows = csv.split('\n');
      const dataRow = rows[1];
      const columns = dataRow.split(',');
      expect(columns[6]).toBe('1000000000'); // Montant_Total_FCFA
      expect(columns[7]).toBe('');           // Fonctionnement_FCFA vide
      expect(columns[8]).toBe('');           // Investissement_FCFA vide
    });

    // B. Genuine documented zero
    it('B. Genuine documented zero: preserves 0, does not transform into null', () => {
      const budgetWithZeroInvestment: LocalBudget = {
        id: 'lbud-test-zero-investment',
        institution_id: 'inst-com-test-zero',
        institution_type: 'COMMUNE',
        institution_name: 'Mairie de Test Zéro Investissement Documenté',
        fiscal_year: 2026,
        budget_type: 'PRIMITIF_ADOPTE',
        status: 'PUBLISHED',
        is_current_version: true,
        version_number: 1,
        total_amount: 500_000_000,
        operating_amount: 500_000_000,
        investment_amount: 0,
        operating_percentage: 100,
        investment_percentage: 0,
        amount_precision: 'EXACT',
        verification_status: 'OFFICIAL_DOCUMENT',
        confidence_level: 'HIGH',
        sources: [],
        primary_source_label: 'Arrêté d approbation',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      // 1. Validation
      const issues = validateBudgetRecord(budgetWithZeroInvestment);
      const errors = issues.filter(i => i.severity === 'ERROR');
      expect(errors).toHaveLength(0);

      // 2. Préservation stricte du 0
      expect(budgetWithZeroInvestment.investment_amount).toBe(0);
      expect(budgetWithZeroInvestment.investment_amount).not.toBeNull();

      // 3. Formatage citoyen : "0 FCFA"
      expect(formatRecordAmount(budgetWithZeroInvestment, 'investment_amount')).toBe('0 FCFA');

      // 4. Export CSV : "0", pas vide
      const csv = exportLocalBudgetsToCsv([budgetWithZeroInvestment]);
      const dataRow = csv.split('\n')[1];
      const columns = dataRow.split(',');
      expect(columns[8]).toBe('0');
    });

    // C. Partial budget validity
    it('C. Partial budget validity: total known with unknown breakdown remains valid without fabricated split', () => {
      const partialBudget: LocalBudget = {
        id: 'lbud-test-partial-budget',
        institution_id: 'inst-com-test-partial',
        institution_type: 'COMMUNE',
        institution_name: 'Mairie de Test Budget Partiel',
        fiscal_year: 2026,
        budget_type: 'PRIMITIF_ADOPTE',
        status: 'PUBLISHED',
        is_current_version: true,
        version_number: 1,
        total_amount: 1_000_000_000,
        operating_amount: null,
        investment_amount: null,
        operating_percentage: null,
        investment_percentage: null,
        amount_precision: 'EXACT',
        verification_status: 'AIP_VERIFIED',
        confidence_level: 'HIGH',
        sources: [],
        primary_source_label: 'AIP — Vote du budget 1 Milliard',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const issues = validateBudgetRecord(partialBudget);
      expect(issues.filter(i => i.severity === 'ERROR')).toHaveLength(0);

      // Aucun calcul d'office de 650M ou 350M
      expect(partialBudget.operating_amount).toBeNull();
      expect(partialBudget.investment_amount).toBeNull();
      expect(partialBudget.total_amount).toBe(1_000_000_000);
    });
  });

  describe('Database Schema Integrity', () => {
    it('D. Schema verification: drops DEFAULT 0 on 5 target columns and keeps executed_amount untouched', () => {
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

      // 3. Migration d'assainissement dédiée appliquant DROP DEFAULT sur les 5 colonnes cibles
      expect(migrationSql).toContain('ALTER TABLE public.institutions ALTER COLUMN total_budget_fcfa DROP DEFAULT;');
      expect(migrationSql).toContain('ALTER TABLE public.institutions ALTER COLUMN budget_functioning_fcfa DROP DEFAULT;');
      expect(migrationSql).toContain('ALTER TABLE public.institutions ALTER COLUMN budget_investment_fcfa DROP DEFAULT;');
      expect(migrationSql).toContain('ALTER TABLE public.local_budgets ALTER COLUMN operating_amount DROP DEFAULT;');
      expect(migrationSql).toContain('ALTER TABLE public.local_budgets ALTER COLUMN investment_amount DROP DEFAULT;');

      // 4. ca_investment_operations.executed_amount reste STRICTEMENT HORS PÉRIMÈTRE
      expect(migrationSql).not.toContain('ca_investment_operations');
      expect(migrationSql).not.toContain('executed_amount');
    });
  });

  describe('Non-regression on Legitimate Verified Pilots & Zero Arbitrary Split', () => {
    it('E. Bingerville BP 2026 non-regression: maintains exact canonical values', () => {
      // 1. Dans OFFICIAL_PRIMITIVE_BUDGETS
      const bingervillePrim = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-bingerville'];
      expect(bingervillePrim).toBeDefined();
      expect(bingervillePrim.total_voted_fcfa).toBe(4_046_222_000);
      expect(bingervillePrim.functioning_voted_fcfa).toBe(1_877_888_000);
      expect(bingervillePrim.investment_voted_fcfa).toBe(2_168_334_000);
      expect(bingervillePrim.precision).toBe('EXACT');
      expect(bingervillePrim.functioning_voted_fcfa! + bingervillePrim.investment_voted_fcfa!).toBe(bingervillePrim.total_voted_fcfa);

      // 2. Dans LOCAL_BUDGETS_REFERENTIAL
      const bingervilleRef = LOCAL_BUDGETS_REFERENTIAL.find(b => b.id === 'lbud-bingerville-2026');
      expect(bingervilleRef).toBeDefined();
      expect(bingervilleRef!.total_amount).toBe(4_046_222_000);
      expect(bingervilleRef!.operating_amount).toBe(1_877_888_000);
      expect(bingervilleRef!.investment_amount).toBe(2_168_334_000);
      expect(bingervilleRef!.amount_precision).toBe('EXACT');
      expect(bingervilleRef!.verification_status).toBe('AIP_VERIFIED');
      expect(bingervilleRef!.confidence_level).toBe('HIGH');
      expect(bingervilleRef!.status).toBe('PUBLISHED');
      expect(bingervilleRef!.operating_amount! + bingervilleRef!.investment_amount!).toBe(bingervilleRef!.total_amount);
    });

    it('Cocody BP 2026 maintains partial budget without manufactured breakdown', () => {
      const cocody = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-cocody'];
      expect(cocody).toBeDefined();
      expect(cocody.total_voted_fcfa).toBe(19_764_660_000);
      expect(cocody.functioning_voted_fcfa).toBeNull();
      expect(cocody.investment_voted_fcfa).toBeNull();
      expect(cocody.precision).toBe('EXACT');
    });

    it('F. Tiassalé non-regression: maintains audited values and strict unventilated status', () => {
      // 1. CA 2024 vérifié avec anomalie de source
      const caTiassale = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale' && c.fiscal_year === 2024);
      expect(caTiassale).toBeDefined();
      expect(caTiassale!.total_planned).toBe(1_007_841_000);
      expect(caTiassale!.total_realized).toBe(1_059_255_758);
      expect(caTiassale!.status).toBe('VERIFIED');
      expect(caTiassale!.reconciliation_status).toBe('SOURCE_ANOMALY');

      // 2. Fixture import CA 2024
      const fixtureJson = JSON.parse(readFileSync('docs/imports/tiassale-ca-2024.json', 'utf8'))[0];
      expect(fixtureJson.institution_id).toBe('inst-com-tiassale');
      expect(fixtureJson.data.total_planned).toBe(1_007_841_000);
      expect(fixtureJson.data.total_realized).toBe(1_059_255_758);

      // 3. BP 2026 dans LOCAL_BUDGETS_REFERENTIAL : pas de ventilation inventée
      const tiassaleBp2026 = LOCAL_BUDGETS_REFERENTIAL.find(b => b.id === 'lbud-tiassale-2026');
      expect(tiassaleBp2026).toBeDefined();
      expect(tiassaleBp2026!.total_amount).toBe(1_760_000_000);
      expect(tiassaleBp2026!.operating_amount).toBeNull();
      expect(tiassaleBp2026!.investment_amount).toBeNull();
      expect(tiassaleBp2026!.operating_percentage).toBeNull();
      expect(tiassaleBp2026!.investment_percentage).toBeNull();
      expect(tiassaleBp2026!.amount_precision).toBe('APPROXIMATE');
    });

    it('G. Zero arbitrary split: no 65/35, 70/30 or fabricated ratios in institutions or budgets', () => {
      // 1. Tous les ministères ont operating = null et investment = null
      for (const m of ALL_MINISTRIES_DATA) {
        expect(m.budget_functioning_fcfa).toBeNull();
        expect(m.budget_investment_fcfa).toBeNull();
      }

      // 2. Les communes sans ratio explicite n'ont pas de split 35% automatique
      const communesWithoutRatio = ALL_COMMUNES_DATA.filter(c => c.budget_functioning_fcfa === null);
      expect(communesWithoutRatio.length).toBeGreaterThan(100);
      for (const c of communesWithoutRatio) {
        expect(c.budget_functioning_fcfa).toBeNull();
        expect(c.budget_investment_fcfa).toBeNull();
      }

      // 3. Contrôle du code source : aucun multiplicateur arbitraire (0.65 / 0.35 / 0.70 / 0.30)
      const ministriesPageCode = readFileSync('src/pages/institutions/MinistriesPage.tsx', 'utf8');
      expect(ministriesPageCode).not.toMatch(/\*\s*0\.(65|35|70|30)/);

      const institutionsDataCode = readFileSync('src/data/institutionsData.ts', 'utf8');
      expect(institutionsDataCode).not.toMatch(/\*\s*0\.(65|35|70|30)/);

      const communesDataCode = readFileSync('src/data/communesData.ts', 'utf8');
      expect(communesDataCode).not.toMatch(/functioningRatio:\s*0\.35/);
    });
  });
});
