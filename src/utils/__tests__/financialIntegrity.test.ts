import { describe, it, expect } from 'vitest';
import { ALL_MINISTRIES_DATA } from '../../data/institutionsData';
import { ALL_COMMUNES_DATA } from '../../data/communesData';
import { dataStore } from '../../services/dataStore';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';
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

    it('does not apply 32.5 Billion FCFA fallback to ministries without official budget', () => {
      const FALLBACK_32_5_B = 32_500_000_000;
      for (const ministry of ALL_MINISTRIES_DATA) {
        if (ministry.total_budget_fcfa !== null) {
          // If a budget exists, verify it was not filled by the arbitrary 32.5B fallback
          // unless that's an explicitly documented government figure
          expect(ministry.total_budget_fcfa).not.toBe(FALLBACK_32_5_B);
        }
      }
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
