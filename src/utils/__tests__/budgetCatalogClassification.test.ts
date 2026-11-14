import { describe, it, expect } from 'vitest';
import { RAW_BUDGET_PROJECTS } from '../../data/budgetData';
import { reconcileBudgetCatalog, classifyBudgetCatalogLine } from '../budgetCatalogClassification';

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
});
