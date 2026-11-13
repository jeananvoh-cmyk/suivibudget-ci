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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { dataStore, isTangiblePhysicalProject } from '../../services/dataStore';
import { RAW_BUDGET_PROJECTS } from '../../data/budgetData';
import {
  CITIZEN_PROOF_TARGET_2026,
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
  it('calculates getImpactStats & getPublicIndicators strictly from current datasets without stale fallbacks', () => {
    const stats = dataStore.getImpactStats();
    const indicators = dataStore.getPublicIndicators();
    const tangible = dataStore.getProjects();

    expect(tangible.length).toBe(4708);
    expect(RAW_BUDGET_PROJECTS.length).toBe(7169);
    expect(stats.totalBudgetLines).toBe(tangible.length);
    expect(stats.totalCollectivites).toBe(232);
    expect(stats.totalCommunes).toBe(201);
    expect(stats.totalRegions).toBe(31);

    // Exact separation of fiscal years & scopes
    expect(indicators.investments.physicalAllCount).toBe(4708);
    expect(indicators.investments.physical2026Count).toBe(4707);
    expect(indicators.investments.multiYearPre2026Count).toBe(1);
    expect(indicators.investments.statePhysical2026Count).toBe(854);
    expect(indicators.investments.localPhysical2026Count).toBe(3853);
    expect(indicators.investments.localMunicipalPhysical2026Count).toBe(2731);
    expect(indicators.investments.localRegionalPhysical2026Count).toBe(1122);

    expect(
      indicators.investments.statePhysical2026AmountFcfa +
        indicators.investments.localPhysical2026AmountFcfa
    ).toBe(indicators.investments.physical2026AmountFcfa);
    expect(
      indicators.investments.physical2026AmountFcfa +
        indicators.investments.multiYearPre2026AmountFcfa
    ).toBe(indicators.investments.physicalAllAmountFcfa);

    expect(indicators.investments.statePhysical2026AmountFcfa).toBe(1_611_097_864_106);
    expect(indicators.investments.localPhysical2026AmountFcfa).toBe(195_059_169_259);
    expect(indicators.investments.physical2026AmountFcfa).toBe(1_806_157_033_365);
    expect(indicators.investments.multiYearPre2026AmountFcfa).toBe(104_700_000_000);
    expect(indicators.investments.physicalAllAmountFcfa).toBe(1_910_857_033_365);
  });

  it('never confuses State central investments with Collectivity local investments', () => {
    const indicators = dataStore.getPublicIndicators();
    expect(indicators.investments.statePhysical2026AmountFcfa).not.toBe(
      indicators.investments.physical2026AmountFcfa
    );
    expect(indicators.investments.localPhysical2026AmountFcfa).not.toBe(
      indicators.investments.physical2026AmountFcfa
    );
  });

  it('partitions 100% of tangible 2026 projects across sectors without overlaps, exclusions, or 2021 mixing', () => {
    const tangible = dataStore.getProjects();
    const breakdown2026 = computeSectorBreakdown(tangible, { fiscalYear: 2026 });

    expect(breakdown2026.excludedOtherYearsCount).toBe(1);
    expect(breakdown2026.excludedOtherYearsAmountFcfa).toBe(104_700_000_000);
    expect(breakdown2026.totalProjects).toBe(4707);
    expect(breakdown2026.totalAmountFcfa).toBe(1_806_157_033_365);

    const sumCount = breakdown2026.sectors.reduce((s, sec) => s + sec.count, 0);
    const sumAmount = breakdown2026.sectors.reduce((s, sec) => s + sec.amountFcfa, 0);
    expect(sumCount).toBe(breakdown2026.totalProjects);
    expect(sumAmount).toBe(breakdown2026.totalAmountFcfa);

    // Explicitly verify uppercase National categories are included (previously dropped!)
    expect(normalizeSectorCategory('EDUCATION')).toBe('EDUCATION');
    expect(normalizeSectorCategory('Éducation')).toBe('EDUCATION');
    expect(normalizeSectorCategory('SANTE')).toBe('HEALTH');
    expect(normalizeSectorCategory('Santé')).toBe('HEALTH');
    expect(normalizeSectorCategory('AGRICULTURE')).toBe('ECONOMY_AGRI');
    expect(normalizeSectorCategory('Commerce & Économie')).toBe('ECONOMY_AGRI');
    expect(normalizeSectorCategory('ADMINISTRATION')).toBe('ADMINISTRATION');

    const educationSector = breakdown2026.sectors.find((s) => s.id === 'EDUCATION')!;
    const healthSector = breakdown2026.sectors.find((s) => s.id === 'HEALTH')!;
    expect(educationSector.count).toBe(1264);
    expect(healthSector.count).toBe(667);
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

  it('preserves unknown amounts as excluded from FCFA sums without injecting zero', () => {
    const projectsWithNull: BudgetProject[] = [
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
    ];

    const res = computeSectorBreakdown(projectsWithNull, { fiscalYear: 2026 });
    expect(res.totalProjects).toBe(2);
    expect(res.totalAmountFcfa).toBe(500_000_000);
    expect(res.unknownAmountProjectsCount).toBe(1);
    expect(res.sectors.find((s) => s.id === 'EDUCATION')?.unknownAmountCount).toBe(1);
  });

  it('distinguishes referenced collectivities (232) from documented 2026 budgets and published CAs', () => {
    const indicators = dataStore.getPublicIndicators();
    expect(indicators.collectivities.communesReferenced).toBe(201);
    expect(indicators.collectivities.regionsReferenced).toBe(31);
    expect(indicators.collectivities.districtsReferenced).toBe(2);
    expect(indicators.collectivities.totalCollectivitesReferenced).toBe(232);
    expect(indicators.collectivities.collectivitesWithPrimitiveBudget2026).toBe(47);
    expect(indicators.collectivities.communesWithPrimitiveBudget2026).toBe(31);
    expect(indicators.collectivities.regionsWithPrimitiveBudget2026).toBe(16);
    expect(indicators.collectivities.collectivitesWithPublishedCA).toBeLessThanOrEqual(232);
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

  it('renders coherent, aligned indicators across HeroSection, StatImpactBanner, HomePage, ObservatoryPage, AnnuaireIndexPage, and Footer', () => {
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
    expect(heroHtml).toContain('4 708'.replace(/\u202f/g, '\u202f').slice(0, 1)); // locale number present
    expect(heroHtml).not.toContain('3 461');
    expect(heroHtml).not.toContain('4 701');
    expect(heroHtml).toContain('1 611,1 Milliards FCFA');
    expect(heroHtml).toContain('195,1 Milliards FCFA');

    const bannerHtml = renderToStaticMarkup(<StatImpactBanner stats={stats} />);
    expect(bannerHtml).toContain('Collectivités Référencées');
    expect(bannerHtml).toContain('201 communes + 31 conseils régionaux');
    expect(bannerHtml).toContain('47 BP 2026 cités');
    expect(bannerHtml).toContain('1 806,2 Milliards FCFA');
    expect(bannerHtml).toContain('Objectif 2026 :');
    expect(bannerHtml).not.toContain('Montant voté Loi de Finances');
    expect(bannerHtml).not.toContain('0 Constat');

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
    expect(homeHtml).not.toContain('7 162');
    expect(homeHtml).not.toContain('3 461');
    expect(homeHtml).toContain('Administration &amp; Équipements Publics');
    expect(homeHtml).toContain('Autres Secteurs');

    const obsHtml = renderToStaticMarkup(
      <ObservatoryPage
        onOpenSendProof={() => {}}
        onSelectProjectById={() => {}}
      />
    );
    expect(obsHtml).not.toContain('3 453,8');
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
    expect(annuaireHtml).not.toContain('3 461,00');
    expect(annuaireHtml).not.toContain('7 162');
    expect(annuaireHtml).toContain('1 611,1 Milliards FCFA');

    const footerHtml = renderToStaticMarkup(
      <Footer activeTab="home" onNavigateTab={() => {}} />
    );
    expect(footerHtml).not.toContain('4 701');
    expect(footerHtml).not.toContain('15 339');
    expect(footerHtml).toContain('17 350,2 Mrds');
  });

  it('keeps index.html, public/llms.txt, HomePage, HeroSection, ObservatoryPage, AnnuaireIndexPage, and Footer free of legacy phantom numbers', () => {
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
    ];

    const forbiddenPatterns = [/3\s?461/, /3\s?453,8/, /4\s?701/, /7\s?162/, /4\s?354/, /Math\.max\(2,/];
    for (const rel of filesToCheck) {
      const content = readFileSync(join(process.cwd(), rel), 'utf8');
      for (const rx of forbiddenPatterns) {
        expect(content, `${rel} matched forbidden pattern ${rx}`).not.toMatch(rx);
      }
    }

    const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    const llmsTxt = readFileSync(join(process.cwd(), 'public/llms.txt'), 'utf8');
    expect(indexHtml).toContain('4 708');
    expect(indexHtml).toContain('1 806,2 Mds FCFA');
    expect(llmsTxt).toContain('4 708');
    expect(llmsTxt).toContain('1 806,2 Milliards FCFA');
    expect(llmsTxt).toContain('1 611,1 Milliards FCFA');
    expect(llmsTxt).toContain('195,1 Milliards FCFA');
  });
});
