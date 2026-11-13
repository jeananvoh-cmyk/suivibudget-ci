import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { dataStore, INITIAL_PUBLIC_DOCUMENTS } from '../../services/dataStore';
import { RAW_BUDGET_PROJECTS } from '../../data/budgetData';
import { OFFICIAL_PRIMITIVE_BUDGETS, getPrimitiveBudgetCatalogStats } from '../../data/officialPrimitiveBudgets';
import { LOCAL_BUDGETS_REFERENTIAL } from '../../data/localBudgetsReferential';
import { ADMINISTRATIVE_ACCOUNTS_DATA, hasCA } from '../../data/administrativeAccountsData';
import { formatQualifiedFCFA } from '../formatters';
import { generateProjectPassport } from '../projectPassport';
import { classifyBudgetCatalogLine } from '../budgetCatalogClassification';
import {
  CITIZEN_PROOF_TARGET_2026,
  LFI_2026_OFFICIAL_MACRO,
  computePublicIndicators,
  computeSectorBreakdown,
  normalizeSectorCategory,
} from '../publicIndicators';
import type { BudgetProject, CitizenProof, Institution } from '../../types';
import { HeroSection } from '../../components/HeroSection';
import { StatImpactBanner } from '../../components/StatImpactBanner';
import { HomePage } from '../../pages/HomePage';
import { ObservatoryPage } from '../../pages/ObservatoryPage';
import { AnnuaireIndexPage } from '../../pages/institutions/AnnuaireIndexPage';
import { Footer } from '../../components/Footer';

describe('Public Indicators Reconciliation & Traceability', () => {
  it('reconciles datasets without Programme 2204040 double-counting, ID-prefix shortcuts, or unverified local sums', () => {
    const stats = dataStore.getImpactStats();
    const indicators = dataStore.getPublicIndicators();
    const tangible = dataStore.getProjects();

    expect(RAW_BUDGET_PROJECTS.length).toBe(7169);
    expect(tangible.length).toBe(3279);
    expect(stats.totalBudgetLines).toBe(tangible.length);
    expect(stats.totalCollectivites).toBe(232);
    expect(stats.totalCommunes).toBe(201);
    expect(stats.totalRegions).toBe(31);

    expect(indicators.investments.isPhysicalClassificationCertified).toBe(false);
    expect(indicators.investments.physicalClassificationLabel).toBe(
      'Projets et opérations physiques répertoriés selon une classification automatisée'
    );

    // Exact separation of fiscal years, State LFI, Local LFI CSV, and external Bouaké portal
    expect(indicators.investments.physicalAllCount).toBe(3279);
    expect(indicators.investments.physical2026Count).toBe(3278);
    expect(indicators.investments.multiYearPre2026Count).toBe(1);
    expect(indicators.investments.statePhysical2026Count).toBe(248);
    expect(indicators.investments.localCsvPhysical2026Count).toBe(3026);
    expect(indicators.investments.localPortalBouakePhysical2026Count).toBe(4);
    expect(indicators.investments.localPhysical2026Count).toBe(3030);

    expect(indicators.investments.statePhysical2026AmountFcfa).toBe(1_062_662_891_466);
    expect(indicators.investments.localCsvPhysical2026AmountFcfa).toBe(122_506_293_104);
    expect(indicators.investments.localPortalBouakePhysical2026AmountFcfa).toBe(42_700_000_000);
    expect(indicators.investments.localPhysical2026AmountFcfa).toBe(165_206_293_104);
    expect(indicators.investments.physical2026AmountFcfa).toBe(1_227_869_184_570);
    expect(indicators.investments.multiYearPre2026AmountFcfa).toBe(104_700_000_000);
    expect(indicators.investments.physicalAllAmountFcfa).toBe(1_332_569_184_570);

    expect(indicators.investments.catalogReconciliation.crossCatalogOverlapCount).toBe(2024);
    expect(indicators.investments.catalogReconciliation.exactDuplicatesCount).toBe(1);
  });

  it('exposes centralized StructuredPublicIndicator entries with explicit verificationStatus and official LFI 2026 sources', () => {
    const snapshot = dataStore.getPublicIndicators();
    const {
      stateBudgetTotal2026,
      lfiInvestmentsTotal2026,
      localLfiTransfers2026,
      stateCatalogPhysical2026,
      localCsvPhysical2026,
      bouakePortalPhysical2026,
      collectivitiesTotalInvestments2026,
    } = snapshot.indicators;

    expect(stateBudgetTotal2026.value).toBe(17_350_151_982_383);
    expect(stateBudgetTotal2026.verificationStatus).toBe('VERIFIED');
    expect(stateBudgetTotal2026.sourceUrl).toBe(LFI_2026_OFFICIAL_MACRO.officialPdfUrl);

    expect(lfiInvestmentsTotal2026.value).toBe(4_195_734_580_603);
    expect(lfiInvestmentsTotal2026.verificationStatus).toBe('VERIFIED');
    expect(lfiInvestmentsTotal2026.sourcePage).toContain('Articles 6, 8, 13 et 16');

    expect(localLfiTransfers2026.value).toBe(224_690_561_296);
    expect(localLfiTransfers2026.verificationStatus).toBe('VERIFIED');
    expect(localLfiTransfers2026.sourcePage).toContain('Article 21');

    // Catalog extractions MUST NEVER claim VERIFIED status
    expect(stateCatalogPhysical2026.verificationStatus).toBe('AUTOMATED_CLASSIFICATION');
    expect(stateCatalogPhysical2026.value).not.toBe(lfiInvestmentsTotal2026.value);
    expect(localCsvPhysical2026.verificationStatus).toBe('AUTOMATED_CLASSIFICATION');
    expect(bouakePortalPhysical2026.verificationStatus).toBe('SECONDARY_SOURCE');

    // National sum of collectivities' own voted investments must stay null / NOT_CONSOLIDATED
    expect(collectivitiesTotalInvestments2026.value).toBeNull();
    expect(collectivitiesTotalInvestments2026.verificationStatus).toBe('NOT_CONSOLIDATED');
    expect(snapshot.indicators.collectivitiesReferenced.verificationStatus).toBe('REPORTED');
    expect(snapshot.indicators.citizenProofsVerified.verificationStatus).toBe('REPORTED');
  });

  it('prevents reappearance of erroneous legal reference Loi n° 2025-998 and enforces Loi n° 2025-987', () => {
    const lfiDoc = INITIAL_PUBLIC_DOCUMENTS.find((d) => d.id === 'doc-lfi-2026-officiel-dgbf');
    expect(lfiDoc).toBeDefined();
    expect(lfiDoc?.title).toContain('2025-987');
    expect(lfiDoc?.title).not.toContain('2025-998');
    expect(lfiDoc?.published_at).toBe('2025-12-19');
    expect(lfiDoc?.file_url).toBe('https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf');

    const dataStoreSource = readFileSync(join(process.cwd(), 'src/services/dataStore.ts'), 'utf8');
    expect(dataStoreSource).not.toContain('2025-998');
  });

  it('never double-counts LFI Programme 2204040 lines when computePublicIndicators receives raw overlapping lines', () => {
    const overlapLine: BudgetProject = {
      id: 'nat-proj-overlap',
      title: "Construction d'un centre de santé",
      commune_name: 'Goulia',
      region_name: 'Folon',
      category: 'SANTE',
      nature_expense: 'Investissements',
      program_name: 'Suivi des activités des collectivités territoriales',
      budget_amount_fcfa: 50_000_000,
      fiscal_year: 2026,
      current_status: 'NOT_STARTED',
      progress_percentage: 0,
      created_at: '2026-01-01',
      scope_level: 'NATIONAL',
    };

    const snapshot = computePublicIndicators({
      projects: [overlapLine],
      rawProjects: [overlapLine],
      institutions: [],
      proofs: [],
    });

    expect(snapshot.investments.statePhysical2026Count).toBe(0);
    expect(snapshot.investments.statePhysical2026AmountFcfa).toBe(0);
    expect(snapshot.investments.catalogReconciliation.crossCatalogOverlapCount).toBe(1);
  });

  it('partitions 100% of classified 2026 projects across sectors without overlaps, exclusions, or 2021 mixing', () => {
    const tangible = dataStore.getProjects();
    const breakdown2026 = computeSectorBreakdown(tangible, { fiscalYear: 2026 });

    expect(breakdown2026.excludedOtherYearsCount).toBe(1);
    expect(breakdown2026.excludedOtherYearsAmountFcfa).toBe(104_700_000_000);
    expect(breakdown2026.totalProjects).toBe(3278);
    expect(breakdown2026.totalAmountFcfa).toBe(1_227_869_184_570);
    expect(breakdown2026.unmappedCategoryProjectsCount).toBe(0);

    const sumCount = breakdown2026.sectors.reduce((s, sec) => s + sec.count, 0);
    const sumAmount = breakdown2026.sectors.reduce((s, sec) => s + sec.amountFcfa, 0);
    const sumExactPct = breakdown2026.sectors.reduce((s, sec) => s + sec.exactPct, 0);
    expect(sumCount).toBe(breakdown2026.totalProjects);
    expect(sumAmount).toBe(breakdown2026.totalAmountFcfa);
    expect(sumExactPct).toBeCloseTo(100, 6);

    expect(normalizeSectorCategory('EDUCATION')).toBe('EDUCATION');
    expect(normalizeSectorCategory('Éducation')).toBe('EDUCATION');
    expect(normalizeSectorCategory('SANTE')).toBe('HEALTH');
    expect(normalizeSectorCategory('Santé')).toBe('HEALTH');
    expect(normalizeSectorCategory('AGRICULTURE')).toBe('ECONOMY_AGRI');
    expect(normalizeSectorCategory('Commerce & Économie')).toBe('ECONOMY_AGRI');
    expect(normalizeSectorCategory('ADMINISTRATION')).toBe('ADMINISTRATION');
    expect(normalizeSectorCategory('Catégorie Inconnue')).toBeNull();
  });

  it('does not clamp small sector percentages to Math.max(2, ...) or Math.max(3, ...)', () => {
    const syntheticProjects: BudgetProject[] = [
      {
        id: 'p-big',
        title: 'Pont autoroutier test',
        commune_name: 'Abidjan',
        region_name: 'Abidjan',
        category: 'INFRASTRUCTURE',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 999_000_000_000,
        fiscal_year: 2026,
        current_status: 'NOT_STARTED',
        progress_percentage: 0,
        created_at: '2026-01-01',
        scope_level: 'NATIONAL',
      },
      {
        id: 'p-tiny',
        title: 'Dispensaire test',
        commune_name: 'Touba',
        region_name: 'Bafing',
        category: 'Santé',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 1_000_000_000,
        fiscal_year: 2026,
        current_status: 'NOT_STARTED',
        progress_percentage: 0,
        created_at: '2026-01-01',
        scope_level: 'LOCAL',
      },
    ];

    const res = computeSectorBreakdown(syntheticProjects, { fiscalYear: 2026 });
    const health = res.sectors.find((s) => s.id === 'HEALTH')!;
    const emptyEdu = res.sectors.find((s) => s.id === 'EDUCATION')!;

    expect(health.pct).toBe(0.1);
    expect(health.pct).not.toBe(2);
    expect(emptyEdu.pct).toBe(0);
    expect(emptyEdu.pct).not.toBe(2);
  });

  it('preserves unknown amounts and unmapped categories explicitly without inventing zero or "Autres"', () => {
    const projectsWithNullAndUnmapped: BudgetProject[] = [
      {
        id: 'p-known',
        title: 'École connue',
        commune_name: 'Cocody',
        region_name: 'Abidjan',
        category: 'Éducation',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 500_000_000,
        fiscal_year: 2026,
        current_status: 'NOT_STARTED',
        progress_percentage: 0,
        created_at: '2026-01-01',
      },
      {
        id: 'p-unknown',
        title: 'École montant inconnu',
        commune_name: 'Cocody',
        region_name: 'Abidjan',
        category: 'Éducation',
        nature_expense: 'Investissements',
        budget_amount_fcfa: null,
        fiscal_year: 2026,
        current_status: 'NOT_STARTED',
        progress_percentage: 0,
        created_at: '2026-01-01',
      },
      {
        id: 'p-unmapped',
        title: 'Opération sans rubrique connue',
        commune_name: 'Cocody',
        region_name: 'Abidjan',
        category: 'Secteur Non Cartographié',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 500_000_000,
        fiscal_year: 2026,
        current_status: 'NOT_STARTED',
        progress_percentage: 0,
        created_at: '2026-01-01',
      },
    ];

    const res = computeSectorBreakdown(projectsWithNullAndUnmapped, { fiscalYear: 2026 });
    expect(res.totalProjects).toBe(3);
    expect(res.totalAmountFcfa).toBe(1_000_000_000);
    expect(res.unknownAmountProjectsCount).toBe(1);
    expect(res.unmappedCategoryProjectsCount).toBe(1);
    expect(res.unmappedCategoryAmountFcfa).toBe(500_000_000);
    expect(res.isExhaustiveCoverage).toBe(false);
    expect(res.methodologyNotice).toBe(
      'Principaux secteurs recensés — pourcentage calculé sur le périmètre présenté'
    );
  });

  it('distinguishes referenced collectivities (232) from documented 2026 budgets and published CAs while preserving Cocody 2024 CA accounting', () => {
    const indicators = dataStore.getPublicIndicators();
    expect(indicators.collectivities.communesReferenced).toBe(201);
    expect(indicators.collectivities.regionsReferenced).toBe(31);
    expect(indicators.collectivities.districtsReferenced).toBe(2);
    expect(indicators.collectivities.totalCollectivitesReferenced).toBe(232);
    expect(indicators.collectivities.collectivitesWithPrimitiveBudget2026).toBe(47);
    expect(indicators.collectivities.communesWithPrimitiveBudget2026).toBe(31);
    expect(indicators.collectivities.regionsWithPrimitiveBudget2026).toBe(16);
    expect(indicators.collectivities.collectivitesWithPublishedCA).toBeLessThanOrEqual(232);
    expect(indicators.collectivities.collectivitiesOwnTotalInvestment2026Fcfa).toBeNull();
    expect(typeof hasCA('Mairie de Cocody')).toBe('boolean');

    // Vérifie que computePublicIndicators comptabilise exactement les CA PUBLISHED fournis (ex: Cocody CA 2024 hydraté depuis Supabase)
    const publishedFromRuntime = ADMINISTRATIVE_ACCOUNTS_DATA.filter((ca) => ca.status === 'PUBLISHED');
    expect(indicators.collectivities.collectivitesWithPublishedCA).toBe(publishedFromRuntime.length);
  });

  it('keeps citizen proofs separate by moderation status and never computes 100% when 0 proofs exist', () => {
    const snapshotZero = computePublicIndicators({
      projects: [],
      institutions: [] as Institution[],
      proofs: [],
    });
    expect(snapshotZero.citizenProofs.approvedCount).toBe(0);
    expect(snapshotZero.citizenProofs.verificationRatePct).toBeNull();
    expect(snapshotZero.citizenProofs.target2026).toBe(CITIZEN_PROOF_TARGET_2026);

    const proofs: CitizenProof[] = [
      {
        id: '1',
        project_id: 'p1',
        citizen_name: 'A',
        citizen_status_claim: 'IN_PROGRESS',
        comment: 'ok',
        image_url: 'x.jpg',
        confirmations_count: 0,
        verification_status: 'APPROVED',
        created_at: '2026-01-01',
      },
      {
        id: '2',
        project_id: 'p2',
        citizen_name: 'B',
        citizen_status_claim: 'COMPLETED',
        comment: 'ok',
        image_url: 'y.jpg',
        confirmations_count: 0,
        verification_status: 'PENDING',
        created_at: '2026-01-01',
      },
    ];
    const snapshotTwo = computePublicIndicators({
      projects: [],
      institutions: [],
      proofs,
    });
    expect(snapshotTwo.citizenProofs.approvedCount).toBe(1);
    expect(snapshotTwo.citizenProofs.pendingCount).toBe(1);
    expect(snapshotTwo.citizenProofs.rejectedCount).toBe(0);
    expect(snapshotTwo.citizenProofs.verificationRatePct).toBe(50);
  });

  it(
    'renders coherent indicators across HeroSection, StatImpactBanner, and Footer',
    () => {
      const stats = dataStore.getImpactStats();

      const heroHtml = renderToStaticMarkup(
        <HeroSection
          searchQuery=""
          setSearchQuery={() => {}}
          selectedCategory="ALL"
          setSelectedCategory={() => {}}
          onExploreClick={() => {}}
          onOpenSendProof={() => {}}
          onNavigateTab={() => {}}
        />
      );
      expect(heroHtml).toContain('classification automatisée');
      expect(heroHtml).toContain('1 062,7 Milliards FCFA');
      expect(heroHtml).toContain('122,5 Milliards FCFA');
      expect(heroHtml).toContain('4 195,7 Mds FCFA');

      const bannerHtml = renderToStaticMarkup(<StatImpactBanner stats={stats} />);
      expect(bannerHtml).toContain('Collectivités Référencées');
      expect(bannerHtml).toContain('201 communes + 31 conseils régionaux');
      expect(bannerHtml).toContain('47 BP 2026 cités');
      expect(bannerHtml).toContain('4 195,7 Mds FCFA');
      expect(bannerHtml).toContain('classification automatisée');
      expect(bannerHtml).toContain('Objectif 2026 :');
      expect(bannerHtml).not.toContain('0 Constat');

      const footerHtml = renderToStaticMarkup(
        <Footer activeTab="home" onNavigateTab={() => {}} />
      );
      expect(footerHtml).toContain('17 350,2 Mrds');
      expect(footerHtml).toContain('Auto. CSV');
    },
    25000
  );

  it(
    'renders aligned sector breakdown and disclaimers on HomePage',
    () => {
      const homeHtml = renderToStaticMarkup(
        <HomePage
          searchQuery=""
          setSearchQuery={() => {}}
          onSelectProject={() => {}}
          onOpenSendProof={() => {}}
          onOpenShare={() => {}}
          onNavigateTab={() => {}}
        />
      );
      expect(homeHtml).toContain('classification automatisée');
      expect(homeHtml).toContain('Administration &amp; Équipements Publics');
      expect(homeHtml).toContain('Énergie, Sécurité, Culture &amp; Environnement');
    },
    25000
  );

  it(
    'renders aligned indicators and automated-classification disclaimers on ObservatoryPage and AnnuaireIndexPage',
    () => {
      const obsHtml = renderToStaticMarkup(
        <ObservatoryPage
          onOpenSendProof={() => {}}
          onSelectProjectById={() => {}}
        />
      );
      expect(obsHtml).toContain('classification automatisée');
      expect(obsHtml).toContain('1 enquête stratégique');
      expect(obsHtml).toContain('0 / ');

      const annuaireHtml = renderToStaticMarkup(
        <AnnuaireIndexPage
          onNavigateToSection={() => {}}
          mairiesCount={201}
          regionsCount={31}
          ministersCount={35}
          institutionsCount={14}
          regulatorsCount={7}
        />
      );
      expect(annuaireHtml).toContain('4 195,7 Milliards FCFA');
      expect(annuaireHtml).toContain('224,7 Milliards FCFA');
      expect(annuaireHtml).toContain('1 062,7 Milliards FCFA');
      expect(annuaireHtml).toContain('non consolidé publiquement');
    },
    25000
  );

  it('keeps public HTML, llms.txt, components, and dataStore free of phantom legacy numbers and 2025-998', () => {
    const filesToCheck = [
      'index.html',
      'public/llms.txt',
      'src/components/HeroSection.tsx',
      'src/components/StatImpactBanner.tsx',
      'src/pages/HomePage.tsx',
      'src/pages/ObservatoryPage.tsx',
      'src/pages/institutions/AnnuaireIndexPage.tsx',
      'src/components/Footer.tsx',
      'src/data/categories.ts',
      'src/services/dataStore.ts',
    ];

    const forbiddenPatterns = [
      /3\s?461/,
      /3\s?453,8/,
      /4\s?701/,
      /4\s?708/,
      /1\s?910,9/,
      /1\s?806,2/,
      /1\s?611,1/,
      /195,1/,
      /7\s?162/,
      /4\s?354/,
      /2025-998/,
      /Math\.max\(2,/,
    ];
    for (const rel of filesToCheck) {
      const content = readFileSync(join(process.cwd(), rel), 'utf8');
      for (const rx of forbiddenPatterns) {
        expect(content, `${rel} matched forbidden pattern ${rx}`).not.toMatch(rx);
      }
    }

    const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    const llmsTxt = readFileSync(join(process.cwd(), 'public/llms.txt'), 'utf8');
    expect(indexHtml).toContain('3 279');
    expect(indexHtml).toContain('4 195,7 Mds FCFA');
    expect(indexHtml).toContain('classification automatisée');
    expect(llmsTxt).toContain('3 279');
    expect(llmsTxt).toContain('17 350,2 Milliards FCFA');
    expect(llmsTxt).toContain('4 195,7 Milliards FCFA');
    expect(llmsTxt).toContain('224,7 Milliards FCFA');
    expect(llmsTxt).toContain('1 062,7 Milliards FCFA');
    expect(llmsTxt).toContain('122,5 Milliards FCFA');
    expect(llmsTxt).toContain('classification automatisée');
  });

  it('Section 9 closure gate: keeps OFFICIAL_PRIMITIVE_BUDGETS (46) + LOCAL_BUDGETS_REFERENTIAL 2026 (47, +Tiassalé) reconciled, free of 60/40 splits, and strictly honest on verification status', () => {
    const stats = getPrimitiveBudgetCatalogStats();
    expect(stats.totalEntries).toBe(46);
    expect(stats.communesCount).toBe(30);
    expect(stats.regionsCount).toBe(16);
    expect(stats.districtsCount).toBe(0);
    expect(stats.otherEntitiesCount).toBe(0);
    expect(stats.duplicateSourceUrlsCount).toBe(0);
    expect(stats.bySourceType.SECONDARY_MEDIA).toBe(46);
    expect(stats.byVerificationStatus.REPORTED).toBe(35);
    expect(stats.byVerificationStatus.APPROXIMATE).toBe(8);
    expect(stats.byVerificationStatus.LOWER_BOUND).toBe(3);

    // 1:1 parity across the 46 OFFICIAL_PRIMITIVE_BUDGETS entries + explicit Tiassalé 2026 APPROXIMATE entry (= 47 in LOCAL_BUDGETS_REFERENTIAL)
    const ref2026Current = LOCAL_BUDGETS_REFERENTIAL.filter(
      (b) => b.fiscal_year === 2026 && b.is_current_version
    );
    expect(ref2026Current).toHaveLength(47);
    for (const ref of ref2026Current) {
      if (ref.institution_id === 'inst-com-tiassale') {
        expect(ref.total_amount).toBe(1_760_000_000);
        expect(ref.amount_precision).toBe('APPROXIMATE');
        expect(ref.operating_amount).toBeNull();
        expect(ref.investment_amount).toBeNull();
        continue;
      }
      const canonical = OFFICIAL_PRIMITIVE_BUDGETS[ref.institution_id];
      expect(canonical, ref.institution_id).toBeDefined();
      expect(ref.total_amount, ref.institution_id).toBe(canonical.total_voted_fcfa);
      expect(ref.investment_amount, ref.institution_id).toBe(canonical.investment_voted_fcfa);
      expect(ref.operating_amount, ref.institution_id).toBe(canonical.functioning_voted_fcfa);
    }

    // Never invent splits or functioning/investment subtraction on reported secondary articles
    for (const id of [
      'inst-com-agboville',
      'inst-com-bettie',
      'inst-com-boundiali',
      'inst-com-tanda',
      'inst-com-toumodi',
      'inst-com-yopougon',
      'inst-com-cocody',
    ]) {
      expect(OFFICIAL_PRIMITIVE_BUDGETS[id].investment_voted_fcfa, id).toBeNull();
      expect(OFFICIAL_PRIMITIVE_BUDGETS[id].functioning_voted_fcfa, id).toBeNull();
    }

    // Formatters must never present LOWER_BOUND / APPROXIMATE figures as exact amounts
    expect(formatQualifiedFCFA(17_000_000_000, 'LOWER_BOUND')).toMatch(/^Plus de /);
    expect(formatQualifiedFCFA(1_586_000_000, 'APPROXIMATE')).toMatch(/^Environ /);

    // Catalog lines preserve DGBF PDF traceability without pretending verified per-page or physical certification
    const sampleState = RAW_BUDGET_PROJECTS.find((p) => p.scope_level === 'NATIONAL' && p.id !== 'proj-infra-seguela-touba-104mrd')!;
    expect(sampleState.source_url).toContain('LOI_DE_FINANCES');
    expect(sampleState.source_document_id).toBe('doc-lfi-2026-officiel-dgbf');
    expect(sampleState.financial_verification_status).toBe('TO_VERIFY');
    const classification = classifyBudgetCatalogLine(sampleState);
    expect(classification.classificationMethod).toBe('AUTOMATED_KEYWORD_AND_SCOPE_RULES');
    expect(classification.verificationStatus).toBe('AUTOMATED_CLASSIFICATION');

    const catalogPassport = generateProjectPassport(sampleState);
    const budgetStage = catalogPassport.stages.find((s) => s.id === 'BUDGET_VOTED')!;
    expect(budgetStage.status).toBe('PENDING_DOCUMENTATION');
    expect(budgetStage.status).not.toBe('VERIFIED_OFFICIAL');

    // Never elevate DECLARED_ADMIN to OFFICIAL_SOURCE or VERIFIED_OFFICIAL
    const declaredPassport = generateProjectPassport({
      ...sampleState,
      id: 'proj-declared-test',
      data_provenance: 'DECLARED_ADMIN',
      source_page: undefined,
      financial_verification_status: undefined,
    });
    expect(declaredPassport.facts.budget_amount.provenance).toBe('UNVERIFIED_INPUT');
    expect(declaredPassport.stages.find((s) => s.id === 'BUDGET_VOTED')!.status).toBe('PENDING_DOCUMENTATION');

    // Separate Bouake portal and 2021 multi-year outside LFI 2026 totals
    const snapshot = dataStore.getPublicIndicators();
    expect(snapshot.indicators.bouakePortalPhysical2026.verificationStatus).toBe('SECONDARY_SOURCE');
    expect(snapshot.indicators.multiYearStateCatalogPre2026.fiscalYear).toBe('MULTI_YEAR');
    expect(snapshot.investments.statePhysical2026AmountFcfa).not.toBe(
      LFI_2026_OFFICIAL_MACRO.lfiInvestmentsTotal2026Fcfa
    );
  });
});
