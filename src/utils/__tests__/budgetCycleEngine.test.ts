import { describe, it, expect } from 'vitest';
import { 
  consolidateBudgetCycle, 
  isBudgetAmendment, 
  isInitialBudget,
  formatBudgetTypeLabel
} from '../budgetCycleEngine';
import type { LocalBudget } from '../../types/localBudget';
import type { AdministrativeAccount } from '../../types/administrativeAccount';
import { LOCAL_BUDGETS_REFERENTIAL } from '../../data/localBudgetsReferential';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';

describe('Budget Cycle Engine — Cycle Budgétaire Complet & Traçabilité', () => {

  // Fixture synthétique pour tests de cycle (clairement identifiée comme fixture de test)
  const createMockBP = (overrides: Partial<LocalBudget> = {}): LocalBudget => ({
    id: 'test-bp-2024',
    institution_id: 'inst-test-01',
    institution_type: 'COMMUNE',
    institution_name: 'Commune Test',
    fiscal_year: 2024,
    budget_type: 'PRIMITIF_ADOPTE',
    status: 'VERIFIED',
    is_current_version: true,
    version_number: 1,
    total_amount: 600_000_000,
    operating_amount: 350_000_000,
    investment_amount: 250_000_000,
    amount_precision: 'EXACT',
    operating_percentage: 58.33,
    investment_percentage: 41.67,
    adoption_date: '2024-01-15',
    verification_status: 'OFFICIAL_DOCUMENT',
    confidence_level: 'HIGH',
    sources: [],
    document_name: 'Budget Primitif 2024 Délibéré',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    ...overrides
  });

  const createMockAmendment = (
    id: string, 
    type: 'MODIFICATIF_1' | 'MODIFICATIF_2' | 'BUDGET_SUPPLEMENTAIRE' | 'VIREMENT_CREDITS', 
    versionNumber: number,
    totalDelta: number | null, 
    operatingDelta: number | null, 
    investmentDelta: number | null,
    overrides: Partial<LocalBudget> = {}
  ): LocalBudget => ({
    id,
    institution_id: 'inst-test-01',
    institution_type: 'COMMUNE',
    institution_name: 'Commune Test',
    fiscal_year: 2024,
    budget_type: type,
    status: 'VERIFIED',
    is_current_version: false,
    version_number: versionNumber,
    total_amount: totalDelta,
    operating_amount: operatingDelta,
    investment_amount: investmentDelta,
    amount_precision: totalDelta === null ? 'UNKNOWN' : 'EXACT',
    operating_percentage: null,
    investment_percentage: null,
    adoption_date: '2024-06-20',
    verification_status: 'OFFICIAL_DOCUMENT',
    confidence_level: 'HIGH',
    sources: [],
    document_name: `Acte Modificatif ${type}`,
    created_at: '2024-06-20T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
    ...overrides
  });

  it('1. Cycle budgétaire standard : BP + BM → crédits définitifs calculés', () => {
    const bp = createMockBP({ total_amount: 618_000_000, operating_amount: 400_000_000, investment_amount: 218_000_000 });
    const bm = createMockAmendment('test-bm1', 'MODIFICATIF_1', 2, 120_000_000, 80_000_000, 40_000_000);

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bm], []);

    expect(consolidation.initial_budget?.total.amount).toBe(618_000_000);
    expect(consolidation.amendments).toHaveLength(1);
    expect(consolidation.amendments[0].total_delta).toBe(120_000_000);
    expect(consolidation.final_credits?.total.amount).toBe(738_000_000);
    expect(consolidation.final_credits?.operating.amount).toBe(480_000_000);
    expect(consolidation.final_credits?.investment.amount).toBe(258_000_000);
    expect(consolidation.final_credits?.is_derived).toBe(true);
    expect(consolidation.final_credits?.total.origin).toBe('DERIVED_VALUE');
  });

  it('2. Plusieurs modifications cumulées : BP + BM1 + BM2', () => {
    const bp = createMockBP({ total_amount: 600_000_000, operating_amount: 350_000_000, investment_amount: 250_000_000 });
    const bm1 = createMockAmendment('test-bm1', 'MODIFICATIF_1', 2, 80_000_000, 50_000_000, 30_000_000);
    const bm2 = createMockAmendment('test-bm2', 'MODIFICATIF_2', 3, 40_000_000, 20_000_000, 20_000_000);

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bm1, bm2], []);

    expect(consolidation.amendments).toHaveLength(2);
    expect(consolidation.net_amendments.total).toBe(120_000_000);
    expect(consolidation.net_amendments.operating).toBe(70_000_000);
    expect(consolidation.net_amendments.investment).toBe(50_000_000);
    expect(consolidation.final_credits?.total.amount).toBe(720_000_000);
    expect(consolidation.final_credits?.operating.amount).toBe(420_000_000);
    expect(consolidation.final_credits?.investment.amount).toBe(300_000_000);
  });

  it('3. Modification négative : réduction de crédits supportée et soustraite', () => {
    const bp = createMockBP({ total_amount: 500_000_000, operating_amount: 300_000_000, investment_amount: 200_000_000 });
    const bmReduction = createMockAmendment('test-bm-neg', 'MODIFICATIF_1', 2, -50_000_000, -30_000_000, -20_000_000, {
      notes: 'Décision modificative portant réduction de crédits suite à révision de recettes'
    });

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bmReduction], []);

    expect(consolidation.amendments[0].is_negative).toBe(true);
    expect(consolidation.net_amendments.total).toBe(-50_000_000);
    expect(consolidation.final_credits?.total.amount).toBe(450_000_000);
    expect(consolidation.final_credits?.operating.amount).toBe(270_000_000);
    expect(consolidation.final_credits?.investment.amount).toBe(180_000_000);
  });

  it('4. Valeur inconnue : NULL != 0, un montant inconnu ne se transforme jamais en 0', () => {
    const bpUnknown = createMockBP({ total_amount: 500_000_000, operating_amount: null, investment_amount: null });
    const bm = createMockAmendment('test-bm1', 'MODIFICATIF_1', 2, 50_000_000, null, null);

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bpUnknown, bm], []);

    expect(consolidation.initial_budget?.operating.amount).toBeNull();
    expect(consolidation.initial_budget?.operating.precision).toBe('UNKNOWN');
    expect(consolidation.final_credits?.operating.amount).toBeNull();
    expect(consolidation.final_credits?.operating.precision).toBe('UNKNOWN');
    // Le total connu est additionné
    expect(consolidation.final_credits?.total.amount).toBe(550_000_000);
  });

  it('5. Zéro réel préservé : 0 reste 0 et est distingué de null/inconnu', () => {
    const bpWithZero = createMockBP({ total_amount: 100_000_000, operating_amount: 100_000_000, investment_amount: 0 });
    const bmWithZero = createMockAmendment('test-bm-zero', 'MODIFICATIF_1', 2, 0, 0, 0);

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bpWithZero, bmWithZero], []);

    expect(consolidation.initial_budget?.investment.amount).toBe(0);
    expect(consolidation.initial_budget?.investment.precision).toBe('EXACT');
    expect(consolidation.net_amendments.investment).toBe(0);
    expect(consolidation.final_credits?.investment.amount).toBe(0);
  });

  it('6. Traçabilité et Provenance : chaque modification possède une source et une référence', () => {
    const bp = createMockBP();
    const bm = createMockAmendment('test-bm1', 'MODIFICATIF_1', 2, 50_000_000, 25_000_000, 25_000_000, {
      document_name: 'Délibération Conseil Municipal n°2024-03',
      adoption_date: '2024-06-15',
      tutelle_approval_date: '2024-07-02'
    });

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bm], []);

    expect(consolidation.amendments[0].source.name).toBe('Délibération Conseil Municipal n°2024-03');
    expect(consolidation.amendments[0].adoption_date).toBe('2024-06-15');
    expect(consolidation.amendments[0].tutelle_approval_date).toBe('2024-07-02');
  });

  it('7. Derived Value : les crédits définitifs calculés sont identifiés comme calculés avec formule explicite', () => {
    const bp = createMockBP({ total_amount: 618_000_000 });
    const bm = createMockAmendment('test-bm1', 'MODIFICATIF_1', 2, 120_000_000, 60_000_000, 60_000_000);

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bm], []);

    expect(consolidation.final_credits?.is_derived).toBe(true);
    expect(consolidation.final_credits?.total.origin).toBe('DERIVED_VALUE');
    expect(consolidation.final_credits?.total.formula).toContain('BP initial');
    expect(consolidation.final_credits?.total.formula).toContain('Modifications');
  });

  it('8. Comparaison CA vs Crédits Définitifs vs Budget Primitif Initial : les deux taux diffèrent', () => {
    const bp = createMockBP({ total_amount: 618_000_000, operating_amount: 618_000_000, investment_amount: 0 });
    const bm = createMockAmendment('test-bm1', 'MODIFICATIF_1', 2, 120_000_000, 120_000_000, 0);

    const mockCA: AdministrativeAccount = {
      id: 'ca-test-2024',
      institution_id: 'inst-test-01',
      institution_type: 'COMMUNE',
      institution_name: 'Commune Test',
      fiscal_year: 2024,
      status: 'VERIFIED',
      operating_planned: 618_000_000,
      operating_realized: 726_260_304,
      investment_planned: 0,
      investment_realized: 0,
      total_planned: 618_000_000,
      total_realized: 726_260_304,
      source_document: 'Compte administratif 2024',
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: [],
      created_at: '2024-12-31T00:00:00Z',
      updated_at: '2024-12-31T00:00:00Z'
    };

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bm], [mockCA]);

    // Crédits définitifs = 618M + 120M = 738M
    // Réalisé = 726,26M
    // Taux vs crédits définitifs = 726 260 304 / 738 000 000 = 98,41 %
    expect(consolidation.execution_comparison?.vs_final_credits?.total.formatted).toBe('98,41 %');
    expect(consolidation.execution_comparison?.vs_final_credits?.total.status).toBe('NORMAL');

    // Taux vs budget primitif initial = 726 260 304 / 618 000 000 = 117,52 %
    expect(consolidation.execution_comparison?.vs_initial_budget?.total.formatted).toBe('117,52 %');
    expect(consolidation.execution_comparison?.vs_initial_budget?.total.status).toBe('OVER_EXECUTED');
  });

  it('9. Source Anomaly : ne disparaît pas automatiquement et conserve l\'analyse d\'écart', () => {
    const mockCA: AdministrativeAccount = {
      id: 'ca-anomaly-2024',
      institution_id: 'inst-test-01',
      institution_type: 'COMMUNE',
      institution_name: 'Commune Test',
      fiscal_year: 2024,
      status: 'VERIFIED',
      reconciliation_status: 'SOURCE_ANOMALY',
      operating_planned: 618_000_000,
      operating_realized: 726_260_304,
      investment_planned: 389_841_000,
      investment_realized: 332_995_454,
      total_planned: 1_007_841_000,
      total_realized: 1_059_255_758,
      source_document: 'Compte administratif 2024',
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: [],
      created_at: '2024-12-31T00:00:00Z',
      updated_at: '2024-12-31T00:00:00Z'
    };

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [], [mockCA]);

    expect(consolidation.administrative_account?.reconciliation_status).toBe('SOURCE_ANOMALY');
    expect(consolidation.civic_notices.has_operating_overrun).toBe(true);
    expect(consolidation.civic_notices.has_missing_modifications_notice).toBe(true);
    expect(consolidation.civic_notices.evidence_disclaimer).toContain('Absence de document public');
  });

  it('10. Document absent : absence de BM ne signifie pas « aucune modification », mais « aucune modification documentée »', () => {
    const bp = createMockBP();
    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp], []);

    expect(consolidation.amendments).toHaveLength(0);
    expect(consolidation.amendments_status).toBe('NO_AMENDMENTS_FOUND_PUBLICLY');
    expect(consolidation.amendments_explanation).toBe(
      'Aucune modification budgétaire documentée dans les sources actuellement disponibles.'
    );
  });

  it('11. Non-régression Bingerville BP 2026 : intact, PUBLISHED, valeurs exactes', () => {
    const bingerville = LOCAL_BUDGETS_REFERENTIAL.find(
      b => b.institution_id === 'inst-com-bingerville' && b.fiscal_year === 2026
    );

    expect(bingerville).toBeDefined();
    expect(bingerville?.total_amount).toBe(4_046_222_000);
    expect(bingerville?.operating_amount).toBe(1_877_888_000);
    expect(bingerville?.investment_amount).toBe(2_168_334_000);
    expect(bingerville?.status).toBe('PUBLISHED');
    expect(bingerville?.verification_status).toBe('AIP_VERIFIED');
    expect(bingerville?.amount_precision).toBe('EXACT');
  });

  it('12. Non-régression Cocody BP 2026 : intact, PUBLISHED, NULL != 0', () => {
    const cocody = LOCAL_BUDGETS_REFERENTIAL.find(
      b => b.institution_id === 'inst-com-cocody' && b.fiscal_year === 2026
    );

    expect(cocody).toBeDefined();
    expect(cocody?.total_amount).toBe(19_764_660_000);
    expect(cocody?.operating_amount).toBeNull();
    expect(cocody?.investment_amount).toBeNull();
    expect(cocody?.status).toBe('PUBLISHED');
    expect(cocody?.verification_status).toBe('SECONDARY_TO_CORROBORATE');
  });

  it('13. Non-régression Tiassalé CA 2024 : VERIFIED, SOURCE_ANOMALY, NOT PUBLISHED, 3 opérations & 3 DGMP matches intacts', () => {
    const ca2024 = CA_PILOT_FIXTURES.find(a => a.institution_id === 'inst-com-tiassale' && a.fiscal_year === 2024);

    expect(ca2024).toBeDefined();
    expect(ca2024?.status).toBe('VERIFIED');
    expect(ca2024?.reconciliation_status).toBe('SOURCE_ANOMALY');
    expect(ca2024?.total_planned).toBe(1_007_841_000);
    expect(ca2024?.total_realized).toBe(1_059_255_758);
    expect(ca2024?.operating_planned).toBe(618_000_000);
    expect(ca2024?.operating_realized).toBe(726_260_304);
    expect(ca2024?.investment_planned).toBe(389_841_000);
    expect(ca2024?.investment_realized).toBe(332_995_454);

    // 3 opérations d'investissement
    expect(ca2024?.operations).toHaveLength(3);
    const op1 = ca2024?.operations.find(o => o.operation_reference === 'Priorité n°6');
    const op2 = ca2024?.operations.find(o => o.operation_reference === 'Priorité n°14');
    const op3 = ca2024?.operations.find(o => o.operation_reference === 'REPORT');

    expect(op1?.procurement_match?.match_level).toBe('STRONG');
    expect(op1?.procurement_match?.award_amount).toBe(27_730_380);

    expect(op2?.procurement_match?.match_level).toBe('STRONG');
    expect(op2?.procurement_match?.award_amount).toBe(12_413_014);

    expect(op3?.procurement_match?.match_level).toBe('STRONG');
    expect(op3?.procurement_match?.award_amount).toBe(23_725_064);
    expect(op3?.executed_amount).toBe(0); // 0 FCFA ordonnancé préservé
  });
});
