import type { BudgetProject, CitizenProof, Institution, ImpactStats } from '../types';
import type { AdministrativeAccount } from '../types/administrativeAccount';
import type { LocalBudget } from '../types/localBudget';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../data/officialPrimitiveBudgets';

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
    name: 'Autres Secteurs (Culture, Sécurité, Énergie, Env.)',
    filterKey: 'Jeunesse',
    bgBar: 'bg-violet-600',
    badgeBg: 'bg-violet-50 text-violet-800 border-violet-200',
    tagline: 'Jeunesse, sport, sécurité, énergie & environnement',
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
  totalProjects: number;
  totalAmountFcfa: number;
  unknownAmountProjectsCount: number;
  excludedOtherYearsCount: number;
  excludedOtherYearsAmountFcfa: number;
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
}

export interface CitizenProofSummary {
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalSubmittedCount: number;
  verificationRatePct: number | null;
  target2026: number;
  strategicShowcasesCount: number;
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
}

export interface PublicIndicatorsSnapshot {
  investments: PublicInvestmentScopeSummary;
  collectivities: CollectivityCoverageSummary;
  citizenProofs: CitizenProofSummary;
  sectorBreakdown2026: SectorBreakdownResult;
}

export const CITIZEN_PROOF_TARGET_2026 = 1000;

export const LFI_2026_OFFICIAL_MACRO = {
  legalTextTitle: "Loi de finances n° 2025-987 du 19 décembre 2025 portant budget de l'État pour l'année 2026",
  totalBudgetMilliardsLabel: '17 350,2 Mds FCFA',
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

export function normalizeSectorCategory(rawCategory?: string): PublicSectorId {
  const token = normalizeCategoryToken(rawCategory);
  if (!token) return 'OTHER';

  if (
    token === 'infrastructure' ||
    token.includes('voirie') ||
    token.includes('transport') ||
    token.includes('infrastructure')
  ) {
    return 'INFRASTRUCTURE';
  }
  if (token.includes('eau')) {
    return 'WATER';
  }
  if (token.includes('administration')) {
    return 'ADMINISTRATION';
  }
  if (token.includes('education')) {
    return 'EDUCATION';
  }
  if (token.includes('logement') || token.includes('urbanisme')) {
    return 'HOUSING';
  }
  if (token.includes('commerce') || token.includes('agriculture')) {
    return 'ECONOMY_AGRI';
  }
  if (token.includes('sante')) {
    return 'HEALTH';
  }
  return 'OTHER';
}

function getConfirmedAmount(amount: number | null | undefined): number | null {
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : null;
}

function isStateProject(p: BudgetProject): boolean {
  return p.scope_level === 'NATIONAL' || p.project_tier === 'STATE';
}

export function computeSectorBreakdown(
  projects: readonly BudgetProject[],
  options: { fiscalYear?: number | 'ALL' } = {}
): SectorBreakdownResult {
  const fiscalYearFilter = options.fiscalYear ?? 2026;
  const scopedProjects =
    fiscalYearFilter === 'ALL'
      ? projects
      : projects.filter((p) => p.fiscal_year === fiscalYearFilter);
  const excludedOtherYears =
    fiscalYearFilter === 'ALL'
      ? []
      : projects.filter((p) => p.fiscal_year !== fiscalYearFilter);

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

  for (const p of scopedProjects) {
    const sectorId = normalizeSectorCategory(p.category);
    const bucket = buckets.get(sectorId)!;
    const confirmed = getConfirmedAmount(p.budget_amount_fcfa);
    const isState = isStateProject(p);

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

  const excludedOtherYearsAmountFcfa = excludedOtherYears.reduce((sum, p) => {
    const c = getConfirmedAmount(p.budget_amount_fcfa);
    return sum + (c ?? 0);
  }, 0);

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

  return {
    fiscalYearFilter,
    totalProjects: scopedProjects.length,
    totalAmountFcfa,
    unknownAmountProjectsCount,
    excludedOtherYearsCount: excludedOtherYears.length,
    excludedOtherYearsAmountFcfa,
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

  let physicalAllAmountFcfa = 0;
  let physical2026Count = 0;
  let physical2026AmountFcfa = 0;
  let statePhysical2026Count = 0;
  let statePhysical2026AmountFcfa = 0;
  let localPhysical2026Count = 0;
  let localPhysical2026AmountFcfa = 0;
  let localMunicipalPhysical2026Count = 0;
  let localMunicipalPhysical2026AmountFcfa = 0;
  let localRegionalPhysical2026Count = 0;
  let localRegionalPhysical2026AmountFcfa = 0;
  let multiYearPre2026Count = 0;
  let multiYearPre2026AmountFcfa = 0;
  let unknownAmountProjectsCount = 0;

  for (const p of projects) {
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

  for (const p of rawProjects) {
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
  for (const p of rawProjects) {
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

  return {
    investments: {
      physicalAllCount: projects.length,
      physicalAllAmountFcfa,
      physical2026Count,
      physical2026AmountFcfa,
      statePhysical2026Count,
      statePhysical2026AmountFcfa,
      localPhysical2026Count,
      localPhysical2026AmountFcfa,
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
    },
    citizenProofs: {
      approvedCount,
      pendingCount,
      rejectedCount,
      totalSubmittedCount,
      verificationRatePct,
      target2026: CITIZEN_PROOF_TARGET_2026,
      strategicShowcasesCount,
    },
    sectorBreakdown2026: computeSectorBreakdown(projects, { fiscalYear: 2026 }),
  };
}

export function impactStatsToPublicSnapshotFallback(stats: ImpactStats): PublicIndicatorsSnapshot | null {
  return stats.detailed ?? null;
}
