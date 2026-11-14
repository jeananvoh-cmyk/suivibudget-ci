import { describe, it, expect } from 'vitest';
import { OFFICIAL_PRIMITIVE_BUDGETS, getPrimitiveBudgetCatalogStats } from '../../data/officialPrimitiveBudgets';
import { LOCAL_BUDGETS_REFERENTIAL, LOCAL_BUDGET_SOURCES } from '../../data/localBudgetsReferential';
import { computePublicIndicators } from '../../utils/publicIndicators';
import { RAW_BUDGET_PROJECTS } from '../../data/budgetData';
import { INSTITUTIONS_DATA } from '../../data/institutionsData';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';

describe('Dual-Referential Verification Suite (M2 Verification Gate)', () => {
  describe('1. Socle canonique OFFICIAL_PRIMITIVE_BUDGETS', () => {
    it('comporte exactement 46 collectivités territoriales (30 communes + 16 régions, 0 district)', () => {
      const keys = Object.keys(OFFICIAL_PRIMITIVE_BUDGETS);
      expect(keys).toHaveLength(46);

      const stats = getPrimitiveBudgetCatalogStats();
      expect(stats.totalEntries).toBe(46);
      expect(stats.communesCount).toBe(30);
      expect(stats.regionsCount).toBe(16);
      expect(stats.districtsCount).toBe(0);
      expect(stats.otherEntitiesCount).toBe(0);
    });

    it('qualifie 100 % des 46 entrées en source secondaire (SECONDARY_MEDIA, 0 délibération primaire consultée)', () => {
      const stats = getPrimitiveBudgetCatalogStats();
      expect(stats.bySourceType.SECONDARY_MEDIA).toBe(46);
      expect((stats.bySourceType as any).OFFICIAL_DELIBERATION ?? 0).toBe(0);

      for (const [id, primitive] of Object.entries(OFFICIAL_PRIMITIVE_BUDGETS)) {
        expect(primitive.source_type, id).toBe('SECONDARY_MEDIA');
        expect(primitive.verification_status, id).toMatch(/^(REPORTED|APPROXIMATE|LOWER_BOUND)$/);
      }
    });

    it('respecte la ventilation des statuts de vérification secondaire (35 REPORTED, 8 APPROXIMATE, 3 LOWER_BOUND)', () => {
      const stats = getPrimitiveBudgetCatalogStats();
      expect(stats.byVerificationStatus.REPORTED).toBe(35);
      expect(stats.byVerificationStatus.APPROXIMATE).toBe(8);
      expect(stats.byVerificationStatus.LOWER_BOUND).toBe(3);
    });

    it('ne force aucune ventilation synthétique 60/40 sur les montants rapportés sans ventilation', () => {
      const withoutBreakdown = [
        'inst-com-agboville',
        'inst-com-bettie',
        'inst-com-boundiali',
        'inst-com-tanda',
        'inst-com-toumodi',
        'inst-com-yopougon',
      ];
      for (const id of withoutBreakdown) {
        const item = OFFICIAL_PRIMITIVE_BUDGETS[id];
        expect(item, id).toBeDefined();
        expect(item.functioning_voted_fcfa, id).toBeNull();
        expect(item.investment_voted_fcfa, id).toBeNull();
      }
    });
  });

  describe('2. Référentiel étendu LOCAL_BUDGETS_REFERENTIAL — Décomposition 46 vs 47 vs 48', () => {
    it('comporte exactement 48 enregistrements pour l\'exercice 2026', () => {
      const records2026 = LOCAL_BUDGETS_REFERENTIAL.filter((b) => b.fiscal_year === 2026);
      expect(records2026).toHaveLength(48);
    });

    it('couvre exactement 47 collectivités distinctes en 2026 (46 socle + Tiassalé)', () => {
      const records2026 = LOCAL_BUDGETS_REFERENTIAL.filter((b) => b.fiscal_year === 2026);
      const uniqueInstitutions = new Set(records2026.map((b) => b.institution_id));
      expect(uniqueInstitutions.size).toBe(47);

      // Les 46 du socle canonique sont intégralement couvertes
      for (const id of Object.keys(OFFICIAL_PRIMITIVE_BUDGETS)) {
        expect(uniqueInstitutions.has(id), `Collectivité du socle manquante : ${id}`).toBe(true);
      }

      // La 47e collectivité unique est Tiassalé (lbud-tiassale-2026)
      expect(uniqueInstitutions.has('inst-com-tiassale')).toBe(true);
      expect(uniqueInstitutions.size - Object.keys(OFFICIAL_PRIMITIVE_BUDGETS).length).toBe(1);
    });

    it('présente exactement 47 versions actuelles (is_current_version: true) et 1 version historique (Bingerville v1)', () => {
      const records2026 = LOCAL_BUDGETS_REFERENTIAL.filter((b) => b.fiscal_year === 2026);
      const currentVersions = records2026.filter((b) => b.is_current_version);
      const nonCurrentVersions = records2026.filter((b) => !b.is_current_version);

      expect(currentVersions).toHaveLength(47);
      expect(nonCurrentVersions).toHaveLength(1);

      const nonCurrent = nonCurrentVersions[0];
      expect(nonCurrent.id).toBe('lbud-bingerville-2026-v1');
      expect(nonCurrent.institution_id).toBe('inst-com-bingerville');
      expect(nonCurrent.version_number).toBe(1);
    });

    it('documente la seconde version de Bingerville (v1 votée 4,144 Md vs v2 approuvée tutelle 4,046 Md)', () => {
      const v1 = LOCAL_BUDGETS_REFERENTIAL.find((b) => b.id === 'lbud-bingerville-2026-v1');
      const v2 = LOCAL_BUDGETS_REFERENTIAL.find((b) => b.id === 'lbud-bingerville-2026');

      expect(v1).toBeDefined();
      expect(v2).toBeDefined();

      // Version 1 : votée en séance municipale ordinaire
      expect(v1!.total_amount).toBe(4_144_682_000);
      expect(v1!.operating_amount).toBe(1_475_739_000);
      expect(v1!.investment_amount).toBe(2_668_943_000);
      expect(v1!.is_current_version).toBe(false);
      expect(v1!.status).toBe('PUBLISHED');
      expect(v1!.verification_status).toBe('AIP_REPORTED');

      // Version 2 : approuvée par la commission tutelle DGDDL
      expect(v2!.total_amount).toBe(4_046_222_000);
      expect(v2!.operating_amount).toBe(1_877_888_000);
      expect(v2!.investment_amount).toBe(2_168_334_000);
      expect(v2!.is_current_version).toBe(true);
      expect(v2!.version_number).toBe(2);
      expect(v2!.verification_status).toBe('AIP_REPORTED');

      // Les deux versions restent des sources secondaires rapportées
      expect(v1!.source_role).toBe('SECONDARY');
      expect(v2!.source_role).toBe('SECONDARY');
    });

    it('conserve les 2 fiches historiques 2025 (total plateforme = 50 enregistrements)', () => {
      const records2025 = LOCAL_BUDGETS_REFERENTIAL.filter((b) => b.fiscal_year === 2025);
      expect(records2025).toHaveLength(2);

      const tiassale2025 = records2025.find((b) => b.id === 'lbud-tiassale-2025');
      const tafire2025 = records2025.find((b) => b.id === 'lbud-tafire-2025');

      expect(tiassale2025).toBeDefined();
      expect(tiassale2025!.total_amount).toBe(1_055_511_000);
      expect(tiassale2025!.verification_status).toBe('AIP_REPORTED');

      expect(tafire2025).toBeDefined();
      expect(tafire2025!.total_amount).toBe(760_400_000);
      expect(tafire2025!.verification_status).toBe('AIP_REPORTED');

      expect(LOCAL_BUDGETS_REFERENTIAL).toHaveLength(50);
    });
  });

  describe('3. Rôles de source — Règle absolue : 0 média secondaire en PRIMARY', () => {
    it('assure que 0 média secondaire ne porte le rôle PRIMARY dans LOCAL_BUDGETS_REFERENTIAL', () => {
      const records2026 = LOCAL_BUDGETS_REFERENTIAL.filter((b) => b.fiscal_year === 2026);

      let primarySourceRoleCount = 0;
      let primarySourceInSourcesCount = 0;

      for (const budget of records2026) {
        if (budget.source_role === 'PRIMARY') {
          primarySourceRoleCount++;
        }
        for (const sourceRef of budget.sources || []) {
          if (sourceRef.role === 'PRIMARY') {
            primarySourceInSourcesCount++;
          }
        }
      }

      // 0 média secondaire marqué PRIMARY
      expect(primarySourceRoleCount).toBe(0);
      expect(primarySourceInSourcesCount).toBe(0);
    });

    it('définit source_role: "SECONDARY" pour l\'ensemble des 48 enregistrements 2026', () => {
      const records2026 = LOCAL_BUDGETS_REFERENTIAL.filter((b) => b.fiscal_year === 2026);
      for (const budget of records2026) {
        expect(budget.source_role, budget.id).toBe('SECONDARY');
        expect(budget.sources.length, budget.id).toBeGreaterThan(0);
        for (const s of budget.sources) {
          expect(s.role, `${budget.id} -> ${s.source?.publisher}`).toBe('SECONDARY');
        }
      }
    });

    it('n\'attribue pas le source_type OFFICIAL_COLLECTIVITY_DOCUMENT sans document primaire attesté', () => {
      const bingervilleSessionSource = LOCAL_BUDGET_SOURCES['src-bingerville-session'];
      expect(bingervilleSessionSource.source_type).toBe('AIP');

      const gbelebanSource = LOCAL_BUDGET_SOURCES['src-gbeleban'];
      expect(gbelebanSource.source_type).toBe('PRESS');
    });
  });

  describe('4. Statuts de vérification honnêtes — Distinction dépêche vs délibération', () => {
    it('attribue des statuts secondaires explicites (47 AIP_REPORTED + 1 SECONDARY_TO_CORROBORATE)', () => {
      const records2026 = LOCAL_BUDGETS_REFERENTIAL.filter((b) => b.fiscal_year === 2026);

      const statusCounts: Record<string, number> = {};
      for (const b of records2026) {
        statusCounts[b.verification_status] = (statusCounts[b.verification_status] || 0) + 1;
      }

      expect(statusCounts.AIP_REPORTED).toBe(47);
      expect(statusCounts.SECONDARY_TO_CORROBORATE).toBe(1); // Cocody 2026
      expect(statusCounts.AIP_VERIFIED).toBeUndefined();
      expect(statusCounts.OFFICIAL_DOCUMENT).toBeUndefined();
    });

    it('conserve Cocody 2026 en SECONDARY_TO_CORROBORATE sans inventer de ventilation', () => {
      const cocody = LOCAL_BUDGETS_REFERENTIAL.find(
        (b) => b.institution_id === 'inst-com-cocody' && b.fiscal_year === 2026
      );
      expect(cocody).toBeDefined();
      expect(cocody!.total_amount).toBe(19_764_660_000);
      expect(cocody!.operating_amount).toBeNull();
      expect(cocody!.investment_amount).toBeNull();
      expect(cocody!.verification_status).toBe('SECONDARY_TO_CORROBORATE');
      expect(cocody!.source_role).toBe('SECONDARY');
    });

    it('n\'inclut aucun statut ambigu laissant croire à une délibération certifiée', () => {
      for (const b of LOCAL_BUDGETS_REFERENTIAL) {
        expect(b.verification_status).not.toBe('OFFICIAL_DOCUMENT');
        expect(b.verification_status).not.toBe('AIP_VERIFIED');
      }
    });
  });

  describe('5. Cohérence croisée 1:1 entre les deux référentiels et indicateurs publics', () => {
    it('assure la cohérence stricte 1:1 entre OFFICIAL_PRIMITIVE_BUDGETS et LOCAL_BUDGETS_REFERENTIAL (version actuelle)', () => {
      for (const [id, canonical] of Object.entries(OFFICIAL_PRIMITIVE_BUDGETS)) {
        const ref = LOCAL_BUDGETS_REFERENTIAL.find(
          (b) => b.institution_id === id && b.fiscal_year === 2026 && b.is_current_version
        );
        expect(ref, `Entrée manquante dans LOCAL_BUDGETS_REFERENTIAL : ${id}`).toBeDefined();
        expect(ref!.total_amount, id).toBe(canonical.total_voted_fcfa);
        expect(ref!.investment_amount, id).toBe(canonical.investment_voted_fcfa);
        expect(ref!.operating_amount, id).toBe(canonical.functioning_voted_fcfa);
      }
    });

    it('maintient Tiassalé 2026 fidèle aux données de source (1,76 Md FCFA APPROXIMATE sans ventilation reconstruite)', () => {
      const tiassale = LOCAL_BUDGETS_REFERENTIAL.find((b) => b.id === 'lbud-tiassale-2026');
      expect(tiassale).toBeDefined();
      expect(tiassale!.total_amount).toBe(1_760_000_000);
      expect(tiassale!.amount_precision).toBe('APPROXIMATE');
      expect(tiassale!.operating_amount).toBeNull();
      expect(tiassale!.investment_amount).toBeNull();
      expect(tiassale!.verification_status).toBe('AIP_REPORTED');
      expect(tiassale!.source_role).toBe('SECONDARY');
    });

    it('produit collectivitiesTotalInvestments2026.value === null dans computePublicIndicators', () => {
      const snapshot = computePublicIndicators({
        projects: RAW_BUDGET_PROJECTS,
        rawProjects: RAW_BUDGET_PROJECTS,
        institutions: INSTITUTIONS_DATA,
        proofs: [],
        administrativeAccounts: CA_PILOT_FIXTURES,
        localBudgets: LOCAL_BUDGETS_REFERENTIAL,
        strategicShowcasesCount: 6,
      });

      // Le total national des investissements primitifs locaux reste nul (interdiction d'agréger valeurs approximatives)
      expect(snapshot.indicators.collectivitiesTotalInvestments2026.value).toBeNull();
      expect(snapshot.indicators.collectivitiesTotalInvestments2026.verificationStatus).toBe('NOT_CONSOLIDATED');
      expect(snapshot.collectivities.collectivitiesOwnTotalInvestment2026Fcfa).toBeNull();
    });

    it('préserve le filtrage 1:1 des opérations physiques (3 279 chantiers physiques sur 7 169 lignes brutes)', () => {
      const snapshot = computePublicIndicators({
        projects: RAW_BUDGET_PROJECTS,
        rawProjects: RAW_BUDGET_PROJECTS,
        institutions: INSTITUTIONS_DATA,
        proofs: [],
        administrativeAccounts: CA_PILOT_FIXTURES,
        localBudgets: LOCAL_BUDGETS_REFERENTIAL,
        strategicShowcasesCount: 6,
      });

      expect(snapshot.investments.physicalAllCount).toBe(3279);
      expect(snapshot.citizenProofs.independentlyVerifiedCount).toBe(0);
      expect(snapshot.citizenProofs.target2026).toBe(1000);
    });
  });

  describe('6. Non-régression absolue — Pilote Bingerville, Cocody et Intégrité', () => {
    it('préserve les montants et métadonnées du pilote Bingerville BP 2026 sans altération', () => {
      const bingerville = LOCAL_BUDGETS_REFERENTIAL.find((b) => b.id === 'lbud-bingerville-2026');
      expect(bingerville).toBeDefined();
      expect(bingerville!.total_amount).toBe(4_046_222_000);
      expect(bingerville!.operating_amount).toBe(1_877_888_000);
      expect(bingerville!.investment_amount).toBe(2_168_334_000);
      expect(bingerville!.status).toBe('PUBLISHED');
      expect(bingerville!.verification_status).toBe('AIP_REPORTED');
      expect(bingerville!.source_role).toBe('SECONDARY');
      expect(bingerville!.sources[0].role).toBe('SECONDARY');
    });

    it('préserve les montants du compte administratif pilote Tiassalé 2024', () => {
      const caTiassale = CA_PILOT_FIXTURES.find(
        (c) => c.institution_id === 'inst-com-tiassale' && c.fiscal_year === 2024
      );
      expect(caTiassale).toBeDefined();
      expect(caTiassale!.total_planned).toBe(1_007_841_000);
      expect(caTiassale!.total_realized).toBe(1_059_255_758);
      expect(caTiassale!.reconciliation_status).toBe('SOURCE_ANOMALY');
    });
  });
});
