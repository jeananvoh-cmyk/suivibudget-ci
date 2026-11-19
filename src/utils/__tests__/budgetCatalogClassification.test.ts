import { describe, it, expect } from 'vitest';
import { RAW_BUDGET_PROJECTS } from '../../data/budgetData';
import { reconcileBudgetCatalog, classifyBudgetCatalogLine, classifyAndDeduplicateCatalog } from '../budgetCatalogClassification';

describe('Budget Catalog Classification & Reconciliation (7,169 raw lines)', () => {
  it('partitions 100% of all 7,169 raw lines without double-counting Programme 2204040 or duplicates', () => {
    const summary = reconcileBudgetCatalog(RAW_BUDGET_PROJECTS);

    expect(summary.totalRawLines).toBe(7169);
    expect(summary.isCertified).toBe(false);
    expect(summary.physicalClassificationLabel).toBe(
      'Projets et opérations physiques répertoriés selon une classification automatisée'
    );

    const sumCategoryCounts = Object.values(summary.categoryCounts).reduce((s, c) => s + c.count, 0);
    expect(sumCategoryCounts).toBe(summary.totalRawLines);

    const sumDedupCategories =
      summary.physicalProjectsCount +
      summary.equipmentAcquisitionsCount +
      summary.nonPhysicalExpensesCount +
      summary.undeterminedLinesCount +
      summary.exactDuplicatesCount;
    expect(sumDedupCategories).toBe(summary.totalRawLines);

    // Overlap Programme 2204040 (2,024 rows inside officialNationalProjects2026) and exact dupe proj-reg-1242
    expect(summary.crossCatalogOverlapCount).toBe(2024);
    expect(summary.exactDuplicatesCount).toBe(1);

    // Never accept ID-prefix shortcuts for non-physical or multi-component titles
    const bouakeDigital = RAW_BUDGET_PROJECTS.find((p) => p.id === 'proj-bouake-digitalisation-taxes')!;
    expect(classifyBudgetCatalogLine(bouakeDigital).category).toBe('ADMINISTRATIVE_EXPENSE');
    expect(classifyBudgetCatalogLine(bouakeDigital).isPhysicalProject).toBe(false);

    // Emit structured reconciliation snapshot for audit logs
    console.info('CATALOG_RECONCILIATION_AUDIT', JSON.stringify({
      totalRawLines: summary.totalRawLines,
      physicalProjectsCount: summary.physicalProjectsCount,
      physicalProjectsAmountFcfa: summary.physicalProjectsAmountFcfa,
      equipmentAcquisitionsCount: summary.equipmentAcquisitionsCount,
      equipmentAcquisitionsAmountFcfa: summary.equipmentAcquisitionsAmountFcfa,
      nonPhysicalExpensesCount: summary.nonPhysicalExpensesCount,
      nonPhysicalExpensesAmountFcfa: summary.nonPhysicalExpensesAmountFcfa,
      undeterminedLinesCount: summary.undeterminedLinesCount,
      undeterminedLinesAmountFcfa: summary.undeterminedLinesAmountFcfa,
      exactDuplicatesCount: summary.exactDuplicatesCount,
      crossCatalogOverlapCount: summary.crossCatalogOverlapCount,
      crossCatalogOverlapAmountFcfa: summary.crossCatalogOverlapAmountFcfa,
      byProvenancePool: summary.byProvenancePool,
      categoryCounts: summary.categoryCounts,
    }));
  });

  it('does not deduplicate projects with unknown amounts and marks reconciliation totals as partial', () => {
    const template = RAW_BUDGET_PROJECTS[0];
    const unknownProjects = [
      {
        ...template,
        id: 'audit-unknown-project-a',
        title: 'Construction d’un centre de santé à Commune témoin',
        commune_name: 'Commune témoin',
        institution_name: 'Commune témoin',
        fiscal_year: 2026,
        scope_level: 'LOCAL' as const,
        budget_amount_fcfa: null,
      },
      {
        ...template,
        id: 'audit-unknown-project-b',
        title: 'Construction d’un centre de santé à Commune témoin',
        commune_name: 'Commune témoin',
        institution_name: 'Commune témoin',
        fiscal_year: 2026,
        scope_level: 'LOCAL' as const,
        budget_amount_fcfa: null,
      },
    ];

    const classified = classifyAndDeduplicateCatalog(unknownProjects);
    expect(classified).toHaveLength(2);
    expect(classified.every(({ classification }) => !classification.isExactDuplicate)).toBe(true);

    const summary = reconcileBudgetCatalog(unknownProjects);
    expect(summary.totalRawLines).toBe(2);
    expect(summary.knownAmountLinesCount).toBe(0);
    expect(summary.unknownAmountLinesCount).toBe(2);
    expect(summary.isPartialRawAmount).toBe(true);
    expect(summary.consolidatedRawAmountFcfa).toBeNull();
  });

  it('exposes a consolidated raw amount only when every line has a known finite amount', () => {
    const template = RAW_BUDGET_PROJECTS[0];
    const summary = reconcileBudgetCatalog([{
      ...template,
      id: 'audit-known-project',
      budget_amount_fcfa: 125_000_000,
    }]);

    expect(summary.knownAmountLinesCount).toBe(1);
    expect(summary.unknownAmountLinesCount).toBe(0);
    expect(summary.isPartialRawAmount).toBe(false);
    expect(summary.consolidatedRawAmountFcfa).toBe(125_000_000);
  });

});
