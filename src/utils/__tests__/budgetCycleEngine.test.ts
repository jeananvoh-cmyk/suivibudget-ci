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

describe('Budget Cycle Engine — Tests Structurés du Cycle Budgétaire (Items 1-18)', () => {

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
    total_amount: 618_000_000,
    operating_amount: 400_000_000,
    investment_amount: 218_000_000,
    amount_precision: 'EXACT',
    operating_percentage: 64.72,
    investment_percentage: 35.28,
    adoption_date: '2024-01-15',
    verification_status: 'OFFICIAL_DOCUMENT',
    confidence_level: 'HIGH',
    sources: [],
    source_page: 36,
    document_name: 'Budget Primitif 2024 Délibéré',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    ...overrides
  });

  const createMockAmendment = (
    id: string, 
    type: 'MODIFICATIF_1' | 'MODIFICATIF_2' | 'BUDGET_SUPPLEMENTAIRE' | 'VIREMENT_CREDITS' | 'DECISION_MODIFICATIVE', 
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
    confidence_level: 'MEDIUM',
    sources: [],
    source_page: 14,
    document_name: `Acte Modificatif ${type}`,
    created_at: '2024-06-20T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
    ...overrides
  });

  // TEST 1
  it('Test 1 : BP seul -> final_credits_status = NOT_ESTABLISHED et NON final_credits = BP', () => {
    const bp = createMockBP({ total_amount: 618_000_000 });
    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp], []);

    expect(consolidation.initial_budget?.total.amount).toBe(618_000_000);
    expect(consolidation.amendments).toHaveLength(0);
    expect(consolidation.amendments_status).toBe('NO_AMENDMENTS_FOUND_PUBLICLY');
    // RÈGLE CRITIQUE : final_credits_status doit être NOT_ESTABLISHED et final_credits doit être null
    expect(consolidation.final_credits_status).toBe('NOT_ESTABLISHED');
    expect(consolidation.final_credits).toBeNull();
    expect(consolidation.final_credits_notice).toContain('Les crédits définitifs ne peuvent pas être établis');
    expect(consolidation.final_credits_notice).toContain('Cela ne prouve pas qu’aucune modification n’a existé');
  });

  // TEST 2
  it('Test 2 : BP + chaîne complète BM1 + BM2 -> Crédits définitifs calculés correctement (DERIVED_FROM_DOCUMENTED_AMENDMENTS)', () => {
    const bp = createMockBP({ total_amount: 618_000_000, operating_amount: 400_000_000, investment_amount: 218_000_000 });
    const bm1 = createMockAmendment('bm-1', 'MODIFICATIF_1', 2, 80_000_000, 50_000_000, 30_000_000);
    const bm2 = createMockAmendment('bm-2', 'MODIFICATIF_2', 3, 40_000_000, 20_000_000, 20_000_000);

    const consolidation = consolidateBudgetCycle(
      'inst-test-01', 
      2024, 
      [bp, bm1, bm2], 
      [],
      { amendmentChainStatus: 'COMPLETE' }
    );

    expect(consolidation.final_credits_status).toBe('DERIVED_FROM_DOCUMENTED_AMENDMENTS');
    expect(consolidation.final_credits).not.toBeNull();
    // 618M + 80M + 40M = 738M
    expect(consolidation.final_credits?.total.amount).toBe(738_000_000);
    expect(consolidation.final_credits?.operating.amount).toBe(470_000_000);
    expect(consolidation.final_credits?.investment.amount).toBe(268_000_000);
    expect(consolidation.final_credits?.is_derived).toBe(true);
    expect(consolidation.final_credits?.total.origin).toBe('DERIVED_VALUE');
    expect(consolidation.final_credits?.total.formula).toContain('738 000 000');
  });

  // TEST 3
  it('Test 3 : BP + BM partiel/non confirmé -> Montant ajusté éventuellement calculable mais crédits définitifs NON ÉTABLIS', () => {
    const bp = createMockBP({ total_amount: 618_000_000 });
    const bm1 = createMockAmendment('bm-1', 'MODIFICATIF_1', 2, 80_000_000, 50_000_000, 30_000_000);

    // amendmentChainStatus n'est pas COMPLETE (par défaut PARTIAL)
    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bm1], []);

    expect(consolidation.final_credits_status).toBe('NOT_ESTABLISHED');
    expect(consolidation.final_credits).toBeNull();
    expect(consolidation.final_credits_notice).toContain('complétude de la chaîne pour cet exercice n\'est pas confirmée');
    // Mais montant ajusté documenté provisoire est exposé séparément
    expect(consolidation.documented_adjusted_amount?.total).toBe(698_000_000);
    expect(consolidation.documented_adjusted_amount?.formula).toContain('698 000 000');
  });

  // TEST 4
  it('Test 4 : Crédits définitifs directement issus d\'un document officiel -> SOURCE_CONFIRMED (SOURCE_VALUE)', () => {
    const bp = createMockBP({ total_amount: 618_000_000 });
    const consolidation = consolidateBudgetCycle(
      'inst-test-01', 
      2024, 
      [bp], 
      [],
      {
        officialFinalCredits: {
          total: 750_000_000,
          operating: 480_000_000,
          investment: 270_000_000,
          source: {
            document_name: 'Compte Administratif Officiel 2024 - Tableau Récapitulatif',
            document_type: 'COMPTE_ADMINISTRATIF',
            fiscal_year: 2024,
            page: 36,
            reference: 'CA-2024-OFFICIEL'
          }
        }
      }
    );

    expect(consolidation.final_credits_status).toBe('SOURCE_CONFIRMED');
    expect(consolidation.final_credits).not.toBeNull();
    expect(consolidation.final_credits?.total.amount).toBe(750_000_000);
    expect(consolidation.final_credits?.total.origin).toBe('SOURCE_VALUE');
    expect(consolidation.final_credits?.is_derived).toBe(false);
    expect(consolidation.final_credits?.total.sources[0].page).toBe(36);
  });

  // TEST 5
  it('Test 5 : BP adopté + BP après tutelle -> Les deux événements restent distincts', () => {
    const bpAdopte = createMockBP({
      id: 'bp-adopte',
      budget_type: 'PRIMITIF_ADOPTE',
      total_amount: 600_000_000,
      document_name: 'Budget Primitif Adopté par le Conseil'
    });
    const bpTutelle = createMockBP({
      id: 'bp-tutelle',
      budget_type: 'PRIMITIF_APRES_TUTELLE',
      total_amount: 580_000_000,
      document_name: 'Budget Primitif Approuvé par la Tutelle DGDDL'
    });

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bpAdopte, bpTutelle], []);

    // Les deux événements sont conservés distinctement
    expect(consolidation.primitive_adopted).toBeDefined();
    expect(consolidation.primitive_adopted?.id).toBe('bp-adopte');
    expect(consolidation.primitive_adopted?.total_amount).toBe(600_000_000);

    expect(consolidation.primitive_after_tutelle).toBeDefined();
    expect(consolidation.primitive_after_tutelle?.id).toBe('bp-tutelle');
    expect(consolidation.primitive_after_tutelle?.total_amount).toBe(580_000_000);

    // Le budget initial de référence prioritaire est PRIMITIF_ADOPTE
    expect(consolidation.initial_budget?.total.amount).toBe(600_000_000);
  });

  // TEST 6
  it('Test 6 : BP adopté + autorisation d\'exécution -> Les deux restent distincts', () => {
    const bpAdopte = createMockBP({
      id: 'bp-adopte',
      budget_type: 'PRIMITIF_ADOPTE',
      total_amount: 600_000_000
    });
    const bpExec = createMockBP({
      id: 'bp-exec',
      budget_type: 'AUTORISATION_EXECUTION',
      total_amount: 600_000_000
    });

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bpAdopte, bpExec], []);

    expect(consolidation.primitive_adopted?.id).toBe('bp-adopte');
    expect(consolidation.execution_authorized?.id).toBe('bp-exec');
  });

  // TEST 7
  it('Test 7 : BS + BM1 + BM2 -> Identités conservées sans écrasement de type', () => {
    const bs = createMockAmendment('act-bs', 'BUDGET_SUPPLEMENTAIRE', 2, 50_000_000, 30_000_000, 20_000_000);
    const bm1 = createMockAmendment('act-bm1', 'MODIFICATIF_1', 3, 20_000_000, 10_000_000, 10_000_000);
    const bm2 = createMockAmendment('act-bm2', 'MODIFICATIF_2', 4, 15_000_000, 5_000_000, 10_000_000);

    const bp = createMockBP();
    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bs, bm1, bm2], []);

    expect(consolidation.amendments).toHaveLength(3);
    expect(consolidation.amendments[0].budget_type).toBe('BUDGET_SUPPLEMENTAIRE');
    expect(consolidation.amendments[1].budget_type).toBe('MODIFICATIF_1');
    expect(consolidation.amendments[2].budget_type).toBe('MODIFICATIF_2');
  });

  // TEST 10
  it('Test 10 : UNKNOWN modification -> Jamais converti en 0 FCFA', () => {
    const bp = createMockBP({ total_amount: 600_000_000 });
    const bmUnknown = createMockAmendment('bm-unk', 'MODIFICATIF_1', 2, null, null, null);

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bmUnknown], []);

    expect(consolidation.amendments[0].total_delta).toBeNull();
    expect(consolidation.net_amendments.total).toBeNull();
    expect(consolidation.net_amendments.total).not.toBe(0);
  });

  // TEST 11
  it('Test 11 : Virement net total = 0 -> Zéro réel conservé', () => {
    const bp = createMockBP({ total_amount: 600_000_000 });
    // Un virement interne qui transfère 15M du fonctionnement vers l'investissement : variation totale nette = 0
    const virement = createMockAmendment('vir-1', 'VIREMENT_CREDITS', 2, 0, -15_000_000, 15_000_000);

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, virement], []);

    expect(consolidation.amendments[0].total_delta).toBe(0);
    expect(consolidation.net_amendments.total).toBe(0);
    expect(consolidation.net_amendments.operating).toBe(-15_000_000);
    expect(consolidation.net_amendments.investment).toBe(15_000_000);
  });

  // TEST 12
  it('Test 12 : BM "REVISED_TOTAL" -> Ne pas traiter comme un delta cumulable', () => {
    const bp = createMockBP({ total_amount: 600_000_000 });
    // Ce BM mentionne le nouveau total arrêté à 700M (et non une augmentation de 700M)
    const bmRevised = createMockAmendment('bm-rev', 'DECISION_MODIFICATIVE', 2, 700_000_000, null, null, {
      amount_semantics: 'REVISED_TOTAL',
      notes: 'Total révisé arrêté par la commission'
    });

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bmRevised], []);

    expect(consolidation.amendments[0].amount_semantics).toBe('REVISED_TOTAL');
    // Le net_amendments.total ne doit PAS être 700M (car ce n'est pas un delta)
    expect(consolidation.net_amendments.total).toBeNull();
  });

  // TEST 13
  it('Test 13 : BM "DELTA" -> Addition correcte au solde des modifications', () => {
    const bp = createMockBP({ total_amount: 600_000_000 });
    const bmDelta = createMockAmendment('bm-delta', 'MODIFICATIF_1', 2, 50_000_000, 30_000_000, 20_000_000, {
      amount_semantics: 'DELTA'
    });

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bmDelta], []);

    expect(consolidation.amendments[0].amount_semantics).toBe('DELTA');
    expect(consolidation.net_amendments.total).toBe(50_000_000);
  });

  // TEST 15
  it('Test 15 : Page source conservée de bout en bout', () => {
    const bp = createMockBP({ source_page: 36 });
    const bm = createMockAmendment('bm-1', 'MODIFICATIF_1', 2, 10_000_000, 5_000_000, 5_000_000, {
      source_page: 42
    });

    const consolidation = consolidateBudgetCycle('inst-test-01', 2024, [bp, bm], []);

    expect(consolidation.initial_budget?.total.sources[0].page).toBe(36);
    expect(consolidation.amendments[0].source.page).toBe(42);
  });

  // TEST 16
  it('Test 16 : Tiassalé reste SOURCE_ANOMALY, crédits définitifs non établis, non publié', () => {
    const ca2024 = CA_PILOT_FIXTURES.find(a => a.institution_id === 'inst-com-tiassale' && a.fiscal_year === 2024);

    expect(ca2024).toBeDefined();
    expect(ca2024?.status).toBe('VERIFIED');
    expect(ca2024?.reconciliation_status).toBe('SOURCE_ANOMALY');
    expect(ca2024?.total_realized).toBe(1_059_255_758);

    // Tiassalé n'a pas de BM 2024 documenté publiquement : crédits définitifs NOT_ESTABLISHED
    const consolidation = consolidateBudgetCycle('inst-com-tiassale', 2024, [], [ca2024!]);
    expect(consolidation.final_credits_status).toBe('NOT_ESTABLISHED');
    expect(consolidation.final_credits).toBeNull();
    expect(consolidation.civic_notices.evidence_disclaimer).toContain('Absence de document public');
  });

  // TEST 17
  it('Test 17 : Non-régression Bingerville BP 2026 inchangé', () => {
    const bingerville = LOCAL_BUDGETS_REFERENTIAL.find(
      b => b.institution_id === 'inst-com-bingerville' && b.fiscal_year === 2026
    );

    expect(bingerville).toBeDefined();
    expect(bingerville?.total_amount).toBe(4_046_222_000);
    expect(bingerville?.operating_amount).toBe(1_877_888_000);
    expect(bingerville?.investment_amount).toBe(2_168_334_000);
    expect(bingerville?.status).toBe('PUBLISHED');
  });

  // TEST 18
  it('Test 18 : Non-régression Cocody BP 2026 inchangé (NULL != 0)', () => {
    const cocody = LOCAL_BUDGETS_REFERENTIAL.find(
      b => b.institution_id === 'inst-com-cocody' && b.fiscal_year === 2026
    );

    expect(cocody).toBeDefined();
    expect(cocody?.total_amount).toBe(19_764_660_000);
    expect(cocody?.operating_amount).toBeNull();
    expect(cocody?.investment_amount).toBeNull();
    expect(cocody?.status).toBe('PUBLISHED');
  });
});
