import { describe, expect, it } from 'vitest';
import { resolveInstitutionFinancialView, assessInstitutionBudget } from '../institutionBudgetHelper';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';
import { NATIONAL_INSTITUTIONS_DATA } from '../../data/nationalBudgetData';
import { Institution } from '../../types';

describe('Point A — Intégrité des ventilations budgétaires (Gate de contrôle)', () => {
  // Cas 1 : Ventilation prouvée avec le même exercice, la même assiette et la même nature de crédits -> la conserver
  it('Cas 1 : conserve la ventilation officielle prouvée pour une collectivité avec budget primitif documenté (Bingerville)', () => {
    const bingervillePrim = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-bingerville'];
    expect(bingervillePrim).toBeDefined();
    expect(bingervillePrim.precision).toBe('EXACT');
    expect(bingervillePrim.source_url).toBeTruthy();

    const bingervilleInst: Partial<Institution> = {
      id: 'inst-com-bingerville',
      name: 'Mairie de Bingerville',
      type: 'MAIRIE',
      total_budget_fcfa: bingervillePrim.total_voted_fcfa,
      budget_functioning_fcfa: bingervillePrim.functioning_voted_fcfa,
      budget_investment_fcfa: bingervillePrim.investment_voted_fcfa,
    };

    const view = resolveInstitutionFinancialView(bingervilleInst, 2026, 'PRIMITIVE');
    expect(view.has_breakdown).toBe(true);
    expect(view.functioning_pct).toBe(46);
    expect(view.investment_pct).toBe(54);
    expect(view.functioning_pct! + view.investment_pct!).toBe(100);
    expect(view.functioning_amount_fcfa).toBe(1877888000);
    expect(view.investment_amount_fcfa).toBe(2168334000);
    expect(view.verification_status).toBe('VERIFIED_AMOUNT');

    const assessment = assessInstitutionBudget(bingervilleInst);
    expect(assessment.hasBreakdown).toBe(true);
    expect(assessment.functioningPct).toBe(46);
    expect(assessment.investmentPct).toBe(54);
  });

  it('Cas 1 bis : conserve la ventilation pour une entité portant une preuve documentaire explicite', () => {
    const provenEntity: Partial<Institution> & { has_verified_breakdown: boolean } = {
      id: 'inst-test-proven',
      name: 'Entité Test Prouvée',
      type: 'MAIRIE',
      total_budget_fcfa: 10_000_000,
      budget_functioning_fcfa: 7_000_000,
      budget_investment_fcfa: 3_000_000,
      has_verified_breakdown: true,
    };

    const view = resolveInstitutionFinancialView(provenEntity, 2026, 'PRIMITIVE');
    expect(view.has_breakdown).toBe(true);
    expect(view.functioning_pct).toBe(70);
    expect(view.investment_pct).toBe(30);
  });

  // Cas 2 : Ventilation non prouvée -> afficher « Non documentée » et neutraliser les pourcentages
  it('Cas 2 : affiche Non documentée pour les institutions nationales LFI 2026 sans tableau officiel de répartition', () => {
    for (const inst of NATIONAL_INSTITUTIONS_DATA) {
      if (inst.total_budget_fcfa != null) {
        const view = resolveInstitutionFinancialView(inst, 2026, 'LFI');
        expect(view.has_breakdown).toBe(false);
        expect(view.functioning_pct).toBeNull();
        expect(view.investment_pct).toBeNull();
        expect(view.notice_text).toContain('Ventilation fonctionnement/investissement non documentée');
      }
    }
  });

  // Cas 3 : Une somme arithmétiquement équilibrée ne constitue pas une preuve officielle
  it('Cas 3 : une somme arithmétiquement équilibrée (60 + 40 === 100) sans source probante est rejetée (non certifiée)', () => {
    const unverifiedBalancedEntity: Partial<Institution> = {
      id: 'inst-unverified-pseudo-balanced',
      name: 'Structure sans source',
      type: 'AUTORITE_REGULATION',
      total_budget_fcfa: 100_000_000,
      budget_functioning_fcfa: 60_000_000,
      budget_investment_fcfa: 40_000_000,
    };

    const view = resolveInstitutionFinancialView(unverifiedBalancedEntity, 2026, 'LFI');
    // Malgré 60M + 40M === 100M, aucune preuve documentaire n'existe
    expect(view.has_breakdown).toBe(false);
    expect(view.functioning_pct).toBeNull();
    expect(view.investment_pct).toBeNull();
    expect(view.reconciliation_status).toBe('NO_BREAKDOWN');
    expect(view.blocking_reasons).toContain('Ventilation fonctionnement/investissement non documentée sur cette assiette officielle.');

    const assessment = assessInstitutionBudget(unverifiedBalancedEntity);
    expect(assessment.hasBreakdown).toBe(false);
    expect(assessment.functioningPct).toBeNull();
    expect(assessment.investmentPct).toBeNull();
  });

  // Cas 4 : Un montant inconnu ne devient jamais 0 FCFA
  it('Cas 4 : un montant inconnu ne devient jamais 0 FCFA (Cour Suprême & entités non publiées)', () => {
    const courSupreme = NATIONAL_INSTITUTIONS_DATA.find(i => i.id === 'inst-cour-supreme')!;
    expect(courSupreme).toBeDefined();

    const view = resolveInstitutionFinancialView(courSupreme, 2026, 'LFI');
    expect(view.total_amount_fcfa).toBeNull();
    expect(view.total_formatted).not.toContain('0 FCFA');
    expect(view.total_formatted).toBe('Non individualisé (LFI 2026)');

    const unknownEntity: Partial<Institution> = {
      id: 'inst-unknown-test',
      name: 'Collectivité sans document',
      type: 'MAIRIE',
      total_budget_fcfa: null,
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
    };

    const unknownView = resolveInstitutionFinancialView(unknownEntity, 2026, 'PRIMITIVE');
    expect(unknownView.total_amount_fcfa).toBeNull();
    expect(unknownView.total_formatted).not.toContain('0 FCFA');
    expect(unknownView.total_formatted).toBe('Non documenté publiquement');

    // Grand Abidjan avec autonomie fiscale
    const taxQuotaEntity: Partial<Institution> = {
      id: 'inst-com-cocody',
      name: 'Mairie de Cocody',
      type: 'MAIRIE',
      is_tax_quota_commune: true,
      total_budget_fcfa: null,
    };
    const taxQuotaView = resolveInstitutionFinancialView(taxQuotaEntity, 2026, 'PRIMITIVE');
    expect(taxQuotaView.total_amount_fcfa).toBeNull();
    expect(taxQuotaView.total_formatted).not.toContain('0 FCFA');
    expect(taxQuotaView.total_formatted).toBe('Budget municipal propre');
  });
});
