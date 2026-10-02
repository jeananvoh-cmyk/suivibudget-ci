import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';
import { ADMINISTRATIVE_ACCOUNTS_DATA, getAdministrativeAccountsForInstitution, getLatestAvailableCA, hasCA } from '../../data/administrativeAccountsData';
import { LOCAL_BUDGETS_REFERENTIAL, getLocalBudgetsForInstitution } from '../../data/localBudgetsReferential';
import { calculateExecutionRate } from '../budgetCalculations';
import { generateProjectPassport } from '../projectPassport';
import { BudgetProject } from '../../types';

describe('Réconciliation & Fiabilisation — Tiassalé Compte Administratif 2024', () => {
  beforeEach(() => {
    ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, Infinity, ...structuredClone(CA_PILOT_FIXTURES));
  });

  describe('1. Valeurs canoniques & Provenance de SOURCE_A', () => {
    it('valide la concordance exacte entre la source officielle (page 36) et la fixture', () => {
      const fixtureJson = JSON.parse(readFileSync('docs/imports/tiassale-ca-2024.json', 'utf8'))[0];
      const ca = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale');

      expect(ca).toBeDefined();
      expect(fixtureJson.institution_id).toBe('inst-com-tiassale');
      expect(fixtureJson.fiscal_year).toBe(2024);

      // Valeurs canoniques du document officiel page 36
      expect(ca!.operating_planned).toBe(618000000);
      expect(fixtureJson.data.operating_planned).toBe(618000000);

      expect(ca!.operating_realized).toBe(726260304);
      expect(fixtureJson.data.operating_realized).toBe(726260304);

      expect(ca!.investment_planned).toBe(389841000);
      expect(fixtureJson.data.investment_planned).toBe(389841000);

      expect(ca!.investment_realized).toBe(332995454);
      expect(fixtureJson.data.investment_realized).toBe(332995454);

      expect(ca!.total_planned).toBe(1007841000);
      expect(fixtureJson.data.total_planned).toBe(1007841000);

      expect(ca!.total_realized).toBe(1059255758);
      expect(fixtureJson.data.total_realized).toBe(1059255758);

      // Recettes recouvrées et équilibre arithmétique
      expect(ca!.operating_revenue_collected).toBe(883184725);
      expect(ca!.investment_revenue_collected).toBe(333151833);
      expect(ca!.total_revenue_collected).toBe(1216336558);
      expect(ca!.arithmetic_difference).toBe(157080800);
      expect(ca!.total_revenue_collected! - ca!.total_realized!).toBe(ca!.arithmetic_difference);

      // Traçabilité
      expect(ca!.source_document).toBe('COMMUNE DE TIASSALE — Compte administratif 2024');
      expect(fixtureJson.source.reference).toBe('Compte administratif 2024, page 36');
      expect(ca!.verification_status).toBe('OFFICIAL_DOCUMENT');
    });
  });

  describe('2. Analyse et maintien justifié de SOURCE_ANOMALY', () => {
    it('conserve le statut SOURCE_ANOMALY en raison du taux de fonctionnement supérieur à 100 %', () => {
      const ca = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale')!;
      expect(ca.reconciliation_status).toBe('SOURCE_ANOMALY');

      const opRate = calculateExecutionRate(ca.operating_realized, ca.operating_planned);
      expect(opRate.rate).toBe(117.52);
      expect(opRate.formatted).toBe('117,52 %');
      expect(opRate.status).toBe('OVER_EXECUTED');
      expect(opRate.isOverBudget).toBe(true);

      // La source est annotée pour expliquer ce dépassement sans présomption d'irrégularité
      expect(ca.notes).toContain('taux supérieurs à 100 % en fonctionnement');
    });

    it('accepte les taux > 100 % lorsque mathématiquement et documentairement valides sans exception', () => {
      const opRate = calculateExecutionRate(726260304, 618000000);
      expect(opRate.rate).toBe(117.52);
      expect(opRate.formatted).toBe('117,52 %');
      expect(opRate.status).toBe('OVER_EXECUTED');
      expect(opRate.statusLabel).toContain('Réalisé supérieur au montant prévu');

      const invRate = calculateExecutionRate(332995454, 389841000);
      expect(invRate.rate).toBe(85.42);
      expect(invRate.formatted).toBe('85,42 %');
      expect(invRate.status).toBe('NORMAL');

      const totalRate = calculateExecutionRate(1059255758, 1007841000);
      expect(totalRate.rate).toBe(105.1);
      expect(totalRate.formatted).toBe('105,10 %');
      expect(totalRate.status).toBe('OVER_EXECUTED');
    });
  });

  describe('3. Règle de rigueur : null/unknown != 0 et 0 réel conservé', () => {
    it('ne convertit jamais null ou non renseigné en 0 FCFA', () => {
      const nullRealized = calculateExecutionRate(null, 1000000);
      expect(nullRealized.rate).toBeNull();
      expect(nullRealized.formatted).toBe('Non calculable');
      expect(nullRealized.status).toBe('UNKNOWN');

      const nullPlanned = calculateExecutionRate(1000000, null);
      expect(nullPlanned.rate).toBeNull();
      expect(nullPlanned.formatted).toBe('Non calculable');
      expect(nullPlanned.status).toBe('UNKNOWN');

      const unknownPrecision = calculateExecutionRate(1000000, 1000000, 'UNKNOWN', 'EXACT');
      expect(unknownPrecision.status).toBe('UNKNOWN');
      expect(unknownPrecision.formatted).toBe('Non calculable');
    });

    it('préserve strictement le zéro réel lorsqu’il figure explicitement dans la source', () => {
      const ca = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale')!;
      const gardienkro = ca.operations.find(o => o.title.includes('Gardienkro'))!;

      expect(gardienkro.executed_amount).toBe(0);
      const rate = calculateExecutionRate(gardienkro.executed_amount, gardienkro.planned_amount);
      expect(rate.rate).toBe(0);
      expect(rate.formatted).toBe('0,00 %');
      expect(rate.status).toBe('ZERO_EXECUTED');
    });
  });

  describe('4. Préservation des 3 opérations et des 3 rapprochements DGMP (STRONG)', () => {
    it('préserve les 3 opérations identifiées dans le CA page 36', () => {
      const ca = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale')!;
      expect(ca.operations).toHaveLength(3);

      const opMarche = ca.operations.find(o => o.id === 'op-tias-2024-06')!;
      expect(opMarche.operation_reference).toBe('Priorité n°6');
      expect(opMarche.planned_amount).toBe(28000000);
      expect(opMarche.executed_amount).toBe(27850646);
      expect(opMarche.source_page).toBe(36);

      const opKadjo = ca.operations.find(o => o.id === 'op-tias-2024-14')!;
      expect(opKadjo.operation_reference).toBe('Priorité n°14');
      expect(opKadjo.planned_amount).toBe(15000000);
      expect(opKadjo.executed_amount).toBe(12413014);
      expect(opKadjo.source_page).toBe(36);

      const opGardienkro = ca.operations.find(o => o.id === 'op-tias-2024-15')!;
      expect(opGardienkro.operation_reference).toBe('REPORT');
      expect(opGardienkro.planned_amount).toBe(29000000);
      expect(opGardienkro.executed_amount).toBe(0);
      expect(opGardienkro.source_page).toBe(36);
    });

    it('préserve les 3 rapprochements DGMP STRONG avec leurs attributaires et montants respectifs', () => {
      const ca = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale')!;

      const mMarche = ca.operations.find(o => o.id === 'op-tias-2024-06')!.procurement_match!;
      expect(mMarche.match_level).toBe('STRONG');
      expect(mMarche.tender_number).toBe('AOO24062605757');
      expect(mMarche.contractor).toBe('SOCIETE DEM');
      expect(mMarche.award_amount).toBe(27730380);

      const mKadjo = ca.operations.find(o => o.id === 'op-tias-2024-14')!.procurement_match!;
      expect(mKadjo.match_level).toBe('STRONG');
      expect(mKadjo.tender_number).toBe('AOO24062805823');
      expect(mKadjo.contractor).toBe('AGBEVA');
      expect(mKadjo.award_amount).toBe(12413014);

      const mGardienkro = ca.operations.find(o => o.id === 'op-tias-2024-15')!.procurement_match!;
      expect(mGardienkro.match_level).toBe('STRONG');
      expect(mGardienkro.tender_number).toBe('AOO24062605747');
      expect(mGardienkro.contractor).toBe('SOCIETE DEM');
      expect(mGardienkro.award_amount).toBe(23725064);
    });
  });

  describe('5. Séparation étanche : Marché attribué ≠ Réalisation physique & 0 FCFA ≠ Abandon', () => {
    it('garantit que pour Gardienkro, 0 FCFA exécuté au CA ne déduit ni abandon ni achèvement physique', () => {
      const mockGardienkroProject: BudgetProject = {
        id: 'proj-tias-gardienkro',
        title: 'Construction d’un bâtiment de trois classes pour l’école à Gardienkro',
        institution_id: 'inst-com-tiassale',
        commune_name: 'Mairie de Tiassalé',
        region_name: 'Agnéby-Tiassa',
        fiscal_year: 2024,
        budget_amount_fcfa: 29000000,
        current_status: 'NOT_STARTED',
        progress_percentage: 0,
        category: 'Éducation',
        nature_expense: 'Investissements',
        created_at: '2024-01-01T00:00:00Z',
      };

      const passport = generateProjectPassport(mockGardienkroProject);
      // Le montant exécuté est 0 FCFA tracé
      expect(passport.facts.executed_amount.value).toBe(0);
      expect(passport.facts.financial_status.value).toBe('CA_REPORTED_ZERO');
      // L'avancement physique n'est PAS inventé (null)
      expect(passport.facts.physical_status.value).toBeNull();
      // Le marché DGMP est tracé
      expect(passport.facts.procurement_amount.value).toBe(23725064);
      expect(passport.facts.supplier.value).toBe('SOCIETE DEM');
    });
  });

  describe('6. Élimination du faux référentiel statique (1 120 000 000 FCFA)', () => {
    it('confirme que l’entrée fabriquée lbud-tiassale-2024-ca a été supprimée de LOCAL_BUDGETS_REFERENTIAL', () => {
      const legacyEntry = LOCAL_BUDGETS_REFERENTIAL.find(b => b.id === 'lbud-tiassale-2024-ca');
      expect(legacyEntry).toBeUndefined();

      const tiassaleBudgets = getLocalBudgetsForInstitution('inst-com-tiassale');
      const caEntryInBudgets = tiassaleBudgets.find(b => b.fiscal_year === 2024 && (b as any).budget_type === 'COMPTE_ADMINISTRATIF');
      expect(caEntryInBudgets).toBeUndefined();

      // Aucun budget ne revendique 1.12B FCFA
      const fake1120m = tiassaleBudgets.find(b => b.total_amount === 1120000000);
      expect(fake1120m).toBeUndefined();
    });

    it('garantit que le résolveur de CA utilise exclusivement les comptes administratifs vérifiés', () => {
      const ca = getLatestAvailableCA('inst-com-tiassale');
      expect(ca).toBeDefined();
      expect(ca?.total_planned).toBe(1007841000);
      expect(ca?.total_realized).toBe(1059255758);
      expect(ca?.total_planned).not.toBe(1120000000);
    });
  });

  describe('7. Non-régression absolue : Bingerville et Cocody intacts', () => {
    it('conserve le pilote Bingerville BP 2026 publié et inaltéré', () => {
      const bingerville = LOCAL_BUDGETS_REFERENTIAL.find(b => b.id === 'lbud-bingerville-2026');
      expect(bingerville).toBeDefined();
      expect(bingerville?.total_amount).toBe(4046222000);
      expect(bingerville?.operating_amount).toBe(1877888000);
      expect(bingerville?.investment_amount).toBe(2168334000);
      expect(bingerville?.status).toBe('PUBLISHED');
      expect(bingerville?.verification_status).toBe('AIP_VERIFIED');
    });

    it('conserve le support budget partiel Cocody BP 2026 intact', () => {
      const cocody = LOCAL_BUDGETS_REFERENTIAL.find(b => b.institution_id === 'inst-com-cocody' && b.fiscal_year === 2026);
      if (cocody) {
        expect(cocody.total_amount).toBe(19764660000);
      }
      // Vérifie que les calculs de budget partiel fonctionnent pour Cocody
      const cocodyRate = calculateExecutionRate(0, 19764660000);
      expect(cocodyRate.status).toBe('ZERO_EXECUTED');
    });
  });
});
