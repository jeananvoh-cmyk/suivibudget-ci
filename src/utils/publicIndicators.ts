import type { BudgetProject, CitizenProof, Institution, ImpactStats } from '../types';
import type { AdministrativeAccount } from '../types/administrativeAccount';
import type { LocalBudget } from '../types/localBudget';
import { OFFICIAL_PRIMITIVE_BUDGETS, getPrimitiveBudgetCatalogStats, PrimitiveBudgetCatalogStats } from '../data/officialPrimitiveBudgets';
import {
  classifyAndDeduplicateCatalog,
  reconcileBudgetCatalog,
  type CatalogReconciliationSummary,
} from './budgetCatalogClassification';

export type PublicSectorId =
  | 'INFRASTRUCTURE'
  | 'WATER'
  | 'ADMINISTRATION'
  | 'EDUCATION'
  | 'HOUSING'
  | 'ECONOMY_AGRI'
  | 'HEALTH'
  | 'OTHER';

export interface PublicSectorDefinition {
  id: PublicSectorId;
  name: string;
  filterKey: string;
  bgBar: string;
  badgeBg: string;
  tagline: string;
}

/**
 * Secteurs budgétaires explicites (aucune catégorie fourre-tout « Autres » destinée à masquer des lacunes).
 */
export const PUBLIC_SECTOR_DEFINITIONS: readonly PublicSectorDefinition[] = [
  {
    id: 'INFRASTRUCTURE',
    name: 'Infrastructures, Voirie & Transports',
    filterKey: 'Infrastructure',
    bgBar: 'bg-blue-600',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    tagline: 'Routes, ponts, voirie & mobilité',
  },
  {
    id: 'WATER',
    name: 'Eau Potable & Hydraulique',
    filterKey: 'Eau',
    bgBar: 'bg-sky-600',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
    tagline: "Châteaux d'eau, forages & réseaux",
  },
  {
    id: 'ADMINISTRATION',
    name: 'Administration & Équipements Publics',
    filterKey: 'Administration',
    bgBar: 'bg-slate-600',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    tagline: 'Bâtiments publics, services & équipements',
  },
  {
    id: 'EDUCATION',
    name: 'Éducation & Formation',
    filterKey: 'Éducation',
    bgBar: 'bg-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    tagline: 'Écoles, collèges, lycées & universités',
  },
  {
    id: 'HOUSING',
    name: 'Logement & Urbanisme',
    filterKey: 'Logement',
    bgBar: 'bg-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    tagline: 'Logements sociaux, lotissements & aménagement',
  },
  {
    id: 'ECONOMY_AGRI',
    name: 'Commerce, Agriculture & Marchés',
    filterKey: 'Commerce',
    bgBar: 'bg-amber-600',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    tagline: 'Marchés, infrastructures agricoles & zones économiques',
  },
  {
    id: 'HEALTH',
    name: 'Santé & Hôpitaux',
    filterKey: 'Santé',
    bgBar: 'bg-teal-600',
    badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
    tagline: 'Hôpitaux, CHU, centres de santé & maternités',
  },
  {
    id: 'OTHER',
    name: 'Énergie, Sécurité, Culture & Environnement',
    filterKey: 'Jeunesse',
    bgBar: 'bg-violet-600',
    badgeBg: 'bg-violet-50 text-violet-800 border-violet-200',
    tagline: 'Énergie, sécurité, jeunesse, sport & environnement',
  },
] as const;

export interface PublicSectorSummary extends PublicSectorDefinition {
  amountFcfa: number;
  count: number;
  unknownAmountCount: number;
  exactPct: number;
  pct: number;
  stateCount: number;
  stateAmountFcfa: number;
  localCount: number;
  localAmountFcfa: number;
}

export interface SectorBreakdownResult {
  fiscalYearFilter: number | 'ALL';
  scopeKind: 'PHYSICAL_CLASSIFIED' | 'RAW_BUDGET_LINES';
  denominatorAmountFcfa: number;
  totalProjects: number;
  totalAmountFcfa: number;
  unknownAmountProjectsCount: number;
  unmappedCategoryProjectsCount: number;
  unmappedCategoryAmountFcfa: number;
  excludedOtherYearsCount: number;
  excludedOtherYearsAmountFcfa: number;
  excludedOverlapOrDupesCount: number;
  isExhaustiveCoverage: boolean;
  methodologyNotice: string;
  sectors: PublicSectorSummary[];
}

export interface CollectivityCoverageSummary {
  communesReferenced: number;
  regionsReferenced: number;
  districtsReferenced: number;
  totalCollectivitesReferenced: number;
  collectivitesWithPrimitiveBudget2026: number;
  communesWithPrimitiveBudget2026: number;
  regionsWithPrimitiveBudget2026: number;
  collectivitesWithCatalogProjects2026: number;
  collectivitesWithPublishedCA: number;
  collectivitiesOwnTotalInvestment2026Fcfa: null;
  primitiveBudgetsCatalog: PrimitiveBudgetCatalogStats;
}

export interface CitizenProofSummary {
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalSubmittedCount: number;
  verificationRatePct: number | null;
  target2026: number;
  strategicShowcasesCount: number;
  independentlyVerifiedCount: number;
}

export type IndicatorVerificationStatus =
  | 'VERIFIED'
  | 'REPORTED'
  | 'SECONDARY_SOURCE'
  | 'APPROXIMATE'
  | 'LOWER_BOUND'
  | 'AUTOMATED_CLASSIFICATION'
  | 'UNVERIFIED'
  | 'NOT_CONSOLIDATED';

export interface StructuredPublicIndicator {
  id: string;
  label: string;
  value: number | null;
  unit: 'FCFA' | 'PROJECTS' | 'COLLECTIVITIES' | 'PROOFS';
  fiscalYear: number | 'MULTI_YEAR';
  scope: string;
  category: 'MACRO_BUDGET' | 'CATALOG_EXTRACTION' | 'TERRITORIAL_COVERAGE' | 'CITIZEN_PROOF';
  sourceDocument: string;
  sourceUrl: string;
  sourcePage: string;
  verificationStatus: IndicatorVerificationStatus;
  calculationMethod: string;
}

export interface PublicInvestmentScopeSummary {
  physicalAllCount: number;
  physicalAllAmountFcfa: number;
  physical2026Count: number;
  physical2026AmountFcfa: number;
  statePhysical2026Count: number;
  statePhysical2026AmountFcfa: number;
  localPhysical2026Count: number;
  localPhysical2026AmountFcfa: number;
  localCsvPhysical2026Count: number;
  localCsvPhysical2026AmountFcfa: number;
  localPortalBouakePhysical2026Count: number;
  localPortalBouakePhysical2026AmountFcfa: number;
  localMunicipalPhysical2026Count: number;
  localMunicipalPhysical2026AmountFcfa: number;
  localRegionalPhysical2026Count: number;
  localRegionalPhysical2026AmountFcfa: number;
  multiYearPre2026Count: number;
  multiYearPre2026AmountFcfa: number;
  unknownAmountProjectsCount: number;
  rawCatalogLinesCount: number;
  stateRawCatalog2026Count: number;
  stateRawCatalog2026AmountFcfa: number;
  localRawCatalog2026Count: number;
  localRawCatalog2026AmountFcfa: number;
  lfi2026OfficialInvestmentsTotalFcfa: number;
  lfi2026OfficialStateBudgetTotalFcfa: number;
  lfi2026OfficialLocalTransfersTotalFcfa: number;
  physicalClassificationLabel: string;
  isPhysicalClassificationCertified: false;
  catalogReconciliation: CatalogReconciliationSummary;
}

export interface PublicIndicatorsSnapshot {
  investments: PublicInvestmentScopeSummary;
  collectivities: CollectivityCoverageSummary;
  citizenProofs: CitizenProofSummary;
  sectorBreakdown2026: SectorBreakdownResult;
  indicators: Record<string, StructuredPublicIndicator>;
}

export const CITIZEN_PROOF_TARGET_2026 = 1000;

export const LFI_2026_OFFICIAL_DOC_URL =
  'https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf';

export const LFI_2026_OFFICIAL_SHA256 =
  'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76';

export const LFI_2026_OFFICIAL_MACRO = {
  legalTextTitle:
    "Loi de finances n° 2025-987 du 19 décembre 2025 portant budget de l'État pour l'année 2026",
  officialPdfUrl: LFI_2026_OFFICIAL_DOC_URL,
  officialPdfSha256: LFI_2026_OFFICIAL_SHA256,
  stateBudgetGlobal2026Fcfa: 17_350_151_982_383,
  stateBudgetGeneralOps2026Fcfa: 10_893_770_624_368,
  stateBudgetTreasury2026Fcfa: 4_916_189_128_757,
  stateBudgetSpecialAccounts2026Fcfa: 1_540_192_229_258,
  lfiInvestmentsTotal2026Fcfa: 4_195_734_580_603,
  lfiInvestmentsTreasury2026Fcfa: 2_642_107_662_084,
  lfiInvestmentsExternal2026Fcfa: 1_553_626_918_519,
  lfiLocalTransfersTotal2026Fcfa: 224_690_561_296,
  lfiLocalTransfersInvestment2026Fcfa: 172_400_000_000,
  lfiLocalTransfersOperating2026Fcfa: 52_290_561_296,
  totalBudgetMilliardsLabel: '17 350,2 Mds FCFA',
  investmentsMilliardsLabel: '4 195,7 Mds FCFA',
  budgetRecettesMilliardsLabel: '8 728,5 Mds FCFA',
  tresorerieMilliardsLabel: '7 081,5 Mds FCFA',
  comptesSpeciauxMilliardsLabel: '1 540,2 Mds FCFA',
} as const;

function normalizeCategoryToken(rawCategory?: string): string {
  return (rawCategory || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeSectorCategory(rawCategory?: string): PublicSectorId | null {
  const token = normalizeCategoryToken(rawCategory);
  if (!token) return null;

  if (
    token === 'infrastructure' ||
    token.includes('voirie') ||
    token.includes('transport') ||
    token.includes('infrastructure')
  ) {
    return 'INFRASTRUCTURE';
  }
  if (token.includes('eau') || token.includes('hydraulique')) {
    return 'WATER';
  }
  if (token.includes('administration')) {
    return 'ADMINISTRATION';
  }
  if (token.includes('education') || token.includes('formation')) {
    return 'EDUCATION';
  }
  if (token.includes('logement') || token.includes('urbanisme')) {
    return 'HOUSING';
  }
  if (
    token.includes('commerce') ||
    token.includes('agriculture') ||
    token.includes('economie') ||
    token.includes('marche')
  ) {
    return 'ECONOMY_AGRI';
  }
  if (token.includes('sante')) {
    return 'HEALTH';
  }
  if (
    token.includes('energie') ||
    token.includes('eclairage') ||
    token.includes('securite') ||
    token.includes('jeunesse') ||
    token.includes('culture') ||
    token.includes('sport') ||
    token.includes('salubrite') ||
    token.includes('environnement') ||
    token.includes('developpement local')
  ) {
    return 'OTHER';
  }
  return null;
}

function getConfirmedAmount(amount: number | null | undefined): number | null {
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : null;
}

function isStateProject(p: BudgetProject): boolean {
  return p.scope_level === 'NATIONAL' || p.project_tier === 'STATE';
}

export function computeSectorBreakdown(
  projects: readonly BudgetProject[],
  options: {
    fiscalYear?: number | 'ALL';
    scopeKind?: 'PHYSICAL_CLASSIFIED' | 'RAW_BUDGET_LINES';
    excludeLfi2204040Overlap?: boolean;
  } = {}
): SectorBreakdownResult {
  const fiscalYearFilter = options.fiscalYear ?? 2026;
  const scopeKind = options.scopeKind ?? 'PHYSICAL_CLASSIFIED';
  const excludeOverlap = options.excludeLfi2204040Overlap ?? true;

  const classified = classifyAndDeduplicateCatalog(projects);

  let excludedOverlapOrDupesCount = 0;
  let excludedOtherYearsCount = 0;
  let excludedOtherYearsAmountFcfa = 0;

  const scopedItems: Array<{ project: BudgetProject; sectorId: PublicSectorId | null }> = [];

  for (const { project, classification } of classified) {
    if (classification.isExactDuplicate) {
      excludedOverlapOrDupesCount += 1;
      continue;
    }
    if (excludeOverlap && classification.isCrossCatalogOverlap) {
      excludedOverlapOrDupesCount += 1;
      continue;
    }

    const confirmed = getConfirmedAmount(project.budget_amount_fcfa);
    if (fiscalYearFilter !== 'ALL' && project.fiscal_year !== fiscalYearFilter) {
      excludedOtherYearsCount += 1;
      excludedOtherYearsAmountFcfa += confirmed ?? 0;
      continue;
    }

    scopedItems.push({
      project,
      sectorId: normalizeSectorCategory(project.category),
    });
  }

  const buckets = new Map<
    PublicSectorId,
    {
      amountFcfa: number;
      count: number;
      unknownAmountCount: number;
      stateCount: number;
      stateAmountFcfa: number;
      localCount: number;
      localAmountFcfa: number;
    }
  >();

  for (const def of PUBLIC_SECTOR_DEFINITIONS) {
    buckets.set(def.id, {
      amountFcfa: 0,
      count: 0,
      unknownAmountCount: 0,
      stateCount: 0,
      stateAmountFcfa: 0,
      localCount: 0,
      localAmountFcfa: 0,
    });
  }

  let totalAmountFcfa = 0;
  let unknownAmountProjectsCount = 0;
  let unmappedCategoryProjectsCount = 0;
  let unmappedCategoryAmountFcfa = 0;

  for (const { project, sectorId } of scopedItems) {
    const confirmed = getConfirmedAmount(project.budget_amount_fcfa);
    const isState = isStateProject(project);

    if (sectorId === null) {
      unmappedCategoryProjectsCount += 1;
      if (confirmed === null) {
        unknownAmountProjectsCount += 1;
      } else {
        unmappedCategoryAmountFcfa += confirmed;
        totalAmountFcfa += confirmed;
      }
      continue;
    }

    const bucket = buckets.get(sectorId)!;
    bucket.count += 1;
    if (confirmed === null) {
      bucket.unknownAmountCount += 1;
      unknownAmountProjectsCount += 1;
    } else {
      bucket.amountFcfa += confirmed;
      totalAmountFcfa += confirmed;
      if (isState) {
        bucket.stateAmountFcfa += confirmed;
      } else {
        bucket.localAmountFcfa += confirmed;
      }
    }

    if (isState) {
      bucket.stateCount += 1;
    } else {
      bucket.localCount += 1;
    }
  }

  const sectors: PublicSectorSummary[] = PUBLIC_SECTOR_DEFINITIONS.map((def) => {
    const b = buckets.get(def.id)!;
    const exactPct = totalAmountFcfa > 0 ? (b.amountFcfa / totalAmountFcfa) * 100 : 0;
    const pct = totalAmountFcfa > 0 ? Math.round(exactPct * 10) / 10 : 0;
    return {
      ...def,
      amountFcfa: b.amountFcfa,
      count: b.count,
      unknownAmountCount: b.unknownAmountCount,
      exactPct,
      pct,
      stateCount: b.stateCount,
      stateAmountFcfa: b.stateAmountFcfa,
      localCount: b.localCount,
      localAmountFcfa: b.localAmountFcfa,
    };
  });

  const isExhaustiveCoverage =
    unmappedCategoryProjectsCount === 0 && unknownAmountProjectsCount === 0 && totalAmountFcfa > 0;

  const methodologyNotice = isExhaustiveCoverage
    ? "Répartition exhaustive sur le périmètre classifié présenté (total ≈ 100 % à l'arrondi près)."
    : 'Principaux secteurs recensés — pourcentage calculé sur le périmètre présenté';

  return {
    fiscalYearFilter,
    scopeKind,
    denominatorAmountFcfa: totalAmountFcfa,
    totalProjects: scopedItems.length,
    totalAmountFcfa,
    unknownAmountProjectsCount,
    unmappedCategoryProjectsCount,
    unmappedCategoryAmountFcfa,
    excludedOtherYearsCount,
    excludedOtherYearsAmountFcfa,
    excludedOverlapOrDupesCount,
    isExhaustiveCoverage,
    methodologyNotice,
    sectors,
  };
}

function normalizeCollectivityKey(name?: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(mairie|commune|conseil\s+regional|region)\s+(de\s+|du\s+|des\s+|d['’]\s*|de\s+la\s+)?/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function computePublicIndicators(params: {
  projects: readonly BudgetProject[];
  rawProjects?: readonly BudgetProject[];
  institutions: readonly Institution[];
  proofs: readonly CitizenProof[];
  administrativeAccounts?: readonly AdministrativeAccount[];
  localBudgets?: readonly LocalBudget[];
  strategicShowcasesCount?: number;
}): PublicIndicatorsSnapshot {
  const {
    projects,
    rawProjects = projects,
    institutions,
    proofs,
    administrativeAccounts = [],
    localBudgets = [],
    strategicShowcasesCount = 1,
  } = params;

  const catalogReconciliation = reconcileBudgetCatalog(rawProjects);
  const classifiedProjects = classifyAndDeduplicateCatalog(projects).filter(
    ({ classification }) =>
      (classification.category === 'PROJECT_PHYSICAL' || classification.isPhysicalProject) &&
      !classification.isCrossCatalogOverlap &&
      !classification.isExactDuplicate
  );

  let physicalAllAmountFcfa = 0;
  let physical2026Count = 0;
  let physical2026AmountFcfa = 0;
  let statePhysical2026Count = 0;
  let statePhysical2026AmountFcfa = 0;
  let localPhysical2026Count = 0;
  let localPhysical2026AmountFcfa = 0;
  let localCsvPhysical2026Count = 0;
  let localCsvPhysical2026AmountFcfa = 0;
  let localPortalBouakePhysical2026Count = 0;
  let localPortalBouakePhysical2026AmountFcfa = 0;
  let localMunicipalPhysical2026Count = 0;
  let localMunicipalPhysical2026AmountFcfa = 0;
  let localRegionalPhysical2026Count = 0;
  let localRegionalPhysical2026AmountFcfa = 0;
  let multiYearPre2026Count = 0;
  let multiYearPre2026AmountFcfa = 0;
  let unknownAmountProjectsCount = 0;

  for (const { project: p, classification } of classifiedProjects) {
    const confirmed = getConfirmedAmount(p.budget_amount_fcfa);
    if (confirmed === null) {
      unknownAmountProjectsCount += 1;
    } else {
      physicalAllAmountFcfa += confirmed;
    }
    const amt = confirmed ?? 0;

    if (p.fiscal_year === 2026) {
      physical2026Count += 1;
      physical2026AmountFcfa += amt;
      if (isStateProject(p)) {
        statePhysical2026Count += 1;
        statePhysical2026AmountFcfa += amt;
      } else {
        localPhysical2026Count += 1;
        localPhysical2026AmountFcfa += amt;
        if (classification.provenancePool === 'LOCAL_PORTAL_BOUAKE_2026') {
          localPortalBouakePhysical2026Count += 1;
          localPortalBouakePhysical2026AmountFcfa += amt;
        } else {
          localCsvPhysical2026Count += 1;
          localCsvPhysical2026AmountFcfa += amt;
        }
        if (p.project_tier === 'REGIONAL') {
          localRegionalPhysical2026Count += 1;
          localRegionalPhysical2026AmountFcfa += amt;
        } else {
          localMunicipalPhysical2026Count += 1;
          localMunicipalPhysical2026AmountFcfa += amt;
        }
      }
    } else {
      multiYearPre2026Count += 1;
      multiYearPre2026AmountFcfa += amt;
    }
  }

  let stateRawCatalog2026Count = 0;
  let stateRawCatalog2026AmountFcfa = 0;
  let localRawCatalog2026Count = 0;
  let localRawCatalog2026AmountFcfa = 0;

  const classifiedRaw = classifyAndDeduplicateCatalog(rawProjects);
  for (const { project: p, classification } of classifiedRaw) {
    if (classification.isExactDuplicate || classification.isCrossCatalogOverlap) continue;
    if (p.fiscal_year !== 2026) continue;
    const amt = getConfirmedAmount(p.budget_amount_fcfa) ?? 0;
    if (isStateProject(p)) {
      stateRawCatalog2026Count += 1;
      stateRawCatalog2026AmountFcfa += amt;
    } else {
      localRawCatalog2026Count += 1;
      localRawCatalog2026AmountFcfa += amt;
    }
  }

  const communes = institutions.filter((i) => i.type === 'MAIRIE');
  const regions = institutions.filter((i) => i.type === 'REGION');
  const districts = institutions.filter((i) => i.type === 'DISTRICT');
  const communesReferenced = communes.length;
  const regionsReferenced = regions.length;
  const districtsReferenced = districts.length;
  const totalCollectivitesReferenced = communesReferenced + regionsReferenced;

  const primitive2026BudgetIds = new Set<string>(
    localBudgets
      .filter((b) => b.fiscal_year === 2026 && b.total_amount != null && b.status === 'PUBLISHED')
      .map((b) => b.institution_id)
  );
  for (const id of Object.keys(OFFICIAL_PRIMITIVE_BUDGETS)) {
    primitive2026BudgetIds.add(id);
  }

  const communesWithPrimitiveBudget2026 = communes.filter(
    (c) => primitive2026BudgetIds.has(c.id) || c.primitive_budget?.total_voted_fcfa != null
  ).length;
  const regionsWithPrimitiveBudget2026 = regions.filter(
    (r) => primitive2026BudgetIds.has(r.id) || r.primitive_budget?.total_voted_fcfa != null
  ).length;
  const collectivitesWithPrimitiveBudget2026 =
    communesWithPrimitiveBudget2026 + regionsWithPrimitiveBudget2026;

  const catalogCollectivityKeys = new Set<string>();
  for (const { project: p, classification } of classifiedRaw) {
    if (classification.isExactDuplicate || classification.isCrossCatalogOverlap) continue;
    if (p.fiscal_year === 2026 && !isStateProject(p)) {
      const k = normalizeCollectivityKey(p.institution_name || p.commune_name);
      if (k) catalogCollectivityKeys.add(k);
    }
  }

  const publishedCaIds = new Set(
    administrativeAccounts
      .filter((ca) => ca.status === 'PUBLISHED')
      .map((ca) => ca.institution_id || normalizeCollectivityKey(ca.institution_name))
  );

  const approvedCount = proofs.filter((p) => p.verification_status === 'APPROVED').length;
  const pendingCount = proofs.filter((p) => p.verification_status === 'PENDING').length;
  const rejectedCount = proofs.filter((p) => p.verification_status === 'REJECTED').length;
  const totalSubmittedCount = proofs.length;
  const verificationRatePct =
    totalSubmittedCount > 0 ? Math.round((approvedCount / totalSubmittedCount) * 100) : null;

  const dedupedPhysicalCount = classifiedProjects.length;
  const physicalClassificationLabel =
    'Projets et opérations physiques répertoriés selon une classification automatisée';

  const indicators: Record<string, StructuredPublicIndicator> = {
    stateBudgetTotal2026: {
      id: 'stateBudgetTotal2026',
      label: "Budget global de l'État (LFI 2026)",
      value: LFI_2026_OFFICIAL_MACRO.stateBudgetGlobal2026Fcfa,
      unit: 'FCFA',
      fiscalYear: 2026,
      scope: 'ÉTAT CENTRAL — BUDGET GÉNÉRAL, TRÉSORERIE & CST',
      category: 'MACRO_BUDGET',
      sourceDocument: LFI_2026_OFFICIAL_MACRO.legalTextTitle,
      sourceUrl: LFI_2026_OFFICIAL_DOC_URL,
      sourcePage: 'Articles 1, 7 et 13 (pp. 7–11 et 41)',
      verificationStatus: 'VERIFIED',
      calculationMethod:
        'Somme officielle votée en ressources/charges : 10 893,77 Mds (opérations budgétaires) + 4 916,19 Mds (trésorerie) + 1 540,19 Mds (CST).',
    },
    lfiInvestmentsTotal2026: {
      id: 'lfiInvestmentsTotal2026',
      label: 'Investissements publics votés en LFI 2026 (Dépenses en capital)',
      value: LFI_2026_OFFICIAL_MACRO.lfiInvestmentsTotal2026Fcfa,
      unit: 'FCFA',
      fiscalYear: 2026,
      scope: 'ÉTAT CENTRAL — DÉPENSES EN CAPITAL (TRÉSOR + EXTÉRIEUR)',
      category: 'MACRO_BUDGET',
      sourceDocument: LFI_2026_OFFICIAL_MACRO.legalTextTitle,
      sourceUrl: LFI_2026_OFFICIAL_DOC_URL,
      sourcePage: 'Articles 6, 8, 13 et 16 (pp. 8–9, 11, 21–25 et 41)',
      verificationStatus: 'VERIFIED',
      calculationMethod:
        'Montant officiel LFI : 2 642 107 662 084 FCFA (Trésor) + 1 553 626 918 519 FCFA (financements extérieurs : dons et emprunts-projets).',
    },
    localLfiTransfers2026: {
      id: 'localLfiTransfers2026',
      label: 'Transferts de l’État aux collectivités territoriales et districts (LFI 2026)',
      value: LFI_2026_OFFICIAL_MACRO.lfiLocalTransfersTotal2026Fcfa,
      unit: 'FCFA',
      fiscalYear: 2026,
      scope: 'DOTATIONS & TRANSFERTS LFI 2026 AUX COLLECTIVITÉS ET DISTRICTS',
      category: 'MACRO_BUDGET',
      sourceDocument: LFI_2026_OFFICIAL_MACRO.legalTextTitle,
      sourceUrl: LFI_2026_OFFICIAL_DOC_URL,
      sourcePage: 'Article 21 (p. 29)',
      verificationStatus: 'VERIFIED',
      calculationMethod:
        'Dotation officielle Article 21 : 52 290 561 296 FCFA (fonctionnement) + 172 400 000 000 FCFA (investissement).',
    },
    stateCatalogPhysical2026: {
      id: 'stateCatalogPhysical2026',
      label: `${physicalClassificationLabel} — État (2026, sous-ensemble extrait)`,
      value: statePhysical2026AmountFcfa,
      unit: 'FCFA',
      fiscalYear: 2026,
      scope: 'EXTRACTION CATALOGUE ÉTAT 2026 HORS PROGRAMME 2204040 (NON EXHAUSTIF VS 4 195,7 MDS LFI)',
      category: 'CATALOG_EXTRACTION',
      sourceDocument: 'Catalogue extrait LFI 2026 (officialNationalProjects2026.json)',
      sourceUrl: LFI_2026_OFFICIAL_DOC_URL,
      sourcePage: 'Non consolidé page par page (classification automatisée)',
      verificationStatus: 'AUTOMATED_CLASSIFICATION',
      calculationMethod:
        'Somme des lignes nationales 2026 classifiées PROJECT_PHYSICAL après exclusion des 2 024 lignes du Programme 2204040 et des dépenses non physiques.',
    },
    localCsvPhysical2026: {
      id: 'localCsvPhysical2026',
      label: `${physicalClassificationLabel} — Collectivités (extraction LFI 2026)`,
      value: localCsvPhysical2026AmountFcfa,
      unit: 'FCFA',
      fiscalYear: 2026,
      scope: 'EXTRACTION CSV COLLECTIVITÉS LFI 2026 (DÉDUPLIQUÉE, HORS SALAIRES)',
      category: 'CATALOG_EXTRACTION',
      sourceDocument: 'Extraction locale LFI 2026 (officialProjectsFromCsv.json)',
      sourceUrl: LFI_2026_OFFICIAL_DOC_URL,
      sourcePage: 'Programme 2204040 décomposé (non certifié individuellement)',
      verificationStatus: 'AUTOMATED_CLASSIFICATION',
      calculationMethod:
        'Somme des opérations communales/régionales 2026 classifiées PROJECT_PHYSICAL, après retrait des 32 lignes salariales et doublons exacts.',
    },
    bouakePortalPhysical2026: {
      id: 'bouakePortalPhysical2026',
      label: 'Projets municipaux Bouaké sourcés sur portail communal (hors LFI 2026)',
      value: localPortalBouakePhysical2026AmountFcfa,
      unit: 'FCFA',
      fiscalYear: 2026,
      scope: 'PORTAIL EXTERNE MAIRIEDEBOUAKE.CI (C2D / AFD / PPP, HORS DOTATION LFI)',
      category: 'CATALOG_EXTRACTION',
      sourceDocument: 'Portail officiel de la Mairie de Bouaké (mairiedebouake.ci/projets)',
      sourceUrl: 'https://mairiedebouake.ci/projets',
      sourcePage: 'Portail projets (vérification documentaire en cours)',
      verificationStatus: 'SECONDARY_SOURCE',
      calculationMethod:
        'Agrégat isolé des projets physiques issus du portail communal Bouaké (excluant la digitalisation des taxes). Ne pas additionner au total LFI.',
    },
    multiYearStateCatalogPre2026: {
      id: 'multiYearStateCatalogPre2026',
      label: 'Grand marché pluriannuel de l’État engagé en 2021 (hors exercice 2026)',
      value: multiYearPre2026AmountFcfa,
      unit: 'FCFA',
      fiscalYear: 'MULTI_YEAR',
      scope: 'EXERCICE 2021 — AXE SÉGUÉLA-SIFIÉ-TOUBA (HORS LFI 2026)',
      category: 'CATALOG_EXTRACTION',
      sourceDocument: "Marché de l'État engagé en 2021 (MEER / AGEROUTE / Trésor Public)",
      sourceUrl: '',
      sourcePage: 'Référence contractuelle non rattachée à une page PDF LFI 2026',
      verificationStatus: 'UNVERIFIED',
      calculationMethod: 'Montant isolé sur exercice 2021, jamais cumulé avec les crédits 2026.',
    },
    collectivitiesTotalInvestments2026: {
      id: 'collectivitiesTotalInvestments2026',
      label: 'Total consolidé des investissements votés des 232 collectivités (2026)',
      value: null,
      unit: 'FCFA',
      fiscalYear: 2026,
      scope: '201 COMMUNES + 31 RÉGIONS — BUDGETS PRIMITIFS PROPRES COMPLETS',
      category: 'MACRO_BUDGET',
      sourceDocument: 'Consolidation nationale des budgets primitifs 2026 en cours',
      sourceUrl: '',
      sourcePage: 'Non disponible pour les 232 entités',
      verificationStatus: 'NOT_CONSOLIDATED',
      calculationMethod:
        'Donnée non consolidée (null) : seuls les transferts LFI (224,69 Mds) et les BP 2026 partiellement publiés sur presse secondaire sont documentés.',
    },
    collectivitiesReferenced: {
      id: 'collectivitiesReferenced',
      label: 'Collectivités territoriales référencées dans l’annuaire',
      value: totalCollectivitesReferenced,
      unit: 'COLLECTIVITIES',
      fiscalYear: 2026,
      scope: '201 COMMUNES + 31 RÉGIONS (2 DISTRICTS AUTONOMES SUIVIS SÉPARÉMENT)',
      category: 'TERRITORIAL_COVERAGE',
      sourceDocument: 'Loi n° 2012-1128 portant organisation des collectivités territoriales (référentiel DGDDL)',
      sourceUrl: '',
      sourcePage: 'Référentiel territorial SuiviBudget CI (PDF JO non annexé)',
      verificationStatus: 'REPORTED',
      calculationMethod: 'Comptage exact des entités MAIRIE (201) + REGION (31) dans le référentiel annuaire.',
    },
    citizenProofsVerified: {
      id: 'citizenProofsVerified',
      label: 'Constats citoyens de terrain approuvés et publiés',
      value: approvedCount,
      unit: 'PROOFS',
      fiscalYear: 2026,
      scope: 'PREUVES TERRAIN CITOYENNES MODÉRÉES (STATUT APPROVED)',
      category: 'CITIZEN_PROOF',
      sourceDocument: 'Base citoyenne SuiviBudget CI (table citizen_proofs, modération STAFF)',
      sourceUrl: 'https://suivibudget.vercel.app/observatoire',
      sourcePage: 'Observatoire citoyen',
      verificationStatus: 'REPORTED',
      calculationMethod: 'Comptage dynamique des preuves citoyennes modérées et publiées (APPROVED = modération éditoriale, 0 vérification indépendante certifiée), objectif 2026 : 1 000 (constat citoyen distinct d\'une certification comptable officielle).',
    },
  };

  return {
    investments: {
      physicalAllCount: dedupedPhysicalCount,
      physicalAllAmountFcfa,
      physical2026Count,
      physical2026AmountFcfa,
      statePhysical2026Count,
      statePhysical2026AmountFcfa,
      localPhysical2026Count,
      localPhysical2026AmountFcfa,
      localCsvPhysical2026Count,
      localCsvPhysical2026AmountFcfa,
      localPortalBouakePhysical2026Count,
      localPortalBouakePhysical2026AmountFcfa,
      localMunicipalPhysical2026Count,
      localMunicipalPhysical2026AmountFcfa,
      localRegionalPhysical2026Count,
      localRegionalPhysical2026AmountFcfa,
      multiYearPre2026Count,
      multiYearPre2026AmountFcfa,
      unknownAmountProjectsCount,
      rawCatalogLinesCount: rawProjects.length,
      stateRawCatalog2026Count,
      stateRawCatalog2026AmountFcfa,
      localRawCatalog2026Count,
      localRawCatalog2026AmountFcfa,
      lfi2026OfficialInvestmentsTotalFcfa: LFI_2026_OFFICIAL_MACRO.lfiInvestmentsTotal2026Fcfa,
      lfi2026OfficialStateBudgetTotalFcfa: LFI_2026_OFFICIAL_MACRO.stateBudgetGlobal2026Fcfa,
      lfi2026OfficialLocalTransfersTotalFcfa: LFI_2026_OFFICIAL_MACRO.lfiLocalTransfersTotal2026Fcfa,
      physicalClassificationLabel,
      isPhysicalClassificationCertified: false,
      catalogReconciliation,
    },
    collectivities: {
      communesReferenced,
      regionsReferenced,
      districtsReferenced,
      totalCollectivitesReferenced,
      collectivitesWithPrimitiveBudget2026,
      communesWithPrimitiveBudget2026,
      regionsWithPrimitiveBudget2026,
      collectivitesWithCatalogProjects2026: catalogCollectivityKeys.size,
      collectivitesWithPublishedCA: publishedCaIds.size,
      collectivitiesOwnTotalInvestment2026Fcfa: null,
      primitiveBudgetsCatalog: getPrimitiveBudgetCatalogStats(),
    },
    citizenProofs: {
      approvedCount,
      pendingCount,
      rejectedCount,
      totalSubmittedCount,
      verificationRatePct,
      target2026: CITIZEN_PROOF_TARGET_2026,
      strategicShowcasesCount,
      independentlyVerifiedCount: 0,
    },
    sectorBreakdown2026: computeSectorBreakdown(
      classifiedProjects.map(({ project }) => project),
      {
        fiscalYear: 2026,
        scopeKind: 'PHYSICAL_CLASSIFIED',
        excludeLfi2204040Overlap: true,
      }
    ),
    indicators,
  };
}

export function impactStatsToPublicSnapshotFallback(stats: ImpactStats): PublicIndicatorsSnapshot | null {
  return stats.detailed ?? null;
}
