import { BudgetProject, CitizenProof } from '../types';
import { AdministrativeAccount } from '../types/administrativeAccount';
import {
  OcdsAmountPrecisionQualifier,
  OcdsAward,
  OcdsContract,
  OcdsDocument,
  OcdsParty,
  OcdsProvenanceQualifier,
  OcdsRelease,
  OcdsReleasePackage,
  OcdsTag,
} from '../types/ocds';
import { generateProjectPassport, ProjectAccountabilityPassportData } from './projectPassport';
import { amountPrecision } from './formatters';

export const OCDS_CI_PREFIX = 'ocds-ci-suivibudget';
export const SUIVIBUDGET_OCDS_EXTENSION_URL =
  'https://suivibudget.vercel.app/ocds/extensions/suivibudget_provenance/v1.0.0/extension.json';

function normalizeNonEmptyString(raw?: string | null): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeValidHttpUri(raw?: string | null): string | undefined {
  const trimmed = normalizeNonEmptyString(raw);
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeOcdsDateTime(raw?: string | null): string | undefined {
  const trimmed = normalizeNonEmptyString(raw);
  if (!trimmed) return undefined;
  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    ) {
      return `${trimmed}T00:00:00Z`;
    }
    return undefined;
  }
  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function resolveProjectBudgetProvenance(dataProvenance?: string): OcdsProvenanceQualifier {
  if (dataProvenance === 'OFFICIAL_SOURCE') return 'OFFICIAL_SOURCE';
  if (dataProvenance === 'DECLARED_ADMIN') return 'DECLARED_ADMIN';
  return 'UNVERIFIED_INPUT';
}

function resolveProcurementDocProvenance(verificationStatus?: string): OcdsProvenanceQualifier {
  if (
    verificationStatus === 'OFFICIAL_DOCUMENT' ||
    verificationStatus === 'OFFICIAL_INSTITUTION' ||
    verificationStatus === 'VERIFIED' ||
    verificationStatus === 'Vérifié DGMP'
  ) {
    return 'OFFICIAL_SOURCE';
  }
  if (verificationStatus === 'DECLARED_ADMIN') {
    return 'DECLARED_ADMIN';
  }
  return 'UNVERIFIED_INPUT';
}

function resolveBudgetAmountPrecision(dataProvenance?: string): OcdsAmountPrecisionQualifier {
  if (dataProvenance === 'DECLARED_ADMIN') return 'DECLARED_ADMIN';
  return 'UNKNOWN';
}

function slugifyToken(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Construit un identifiant OCDS pérenne à partir d'un projet budgétaire.
 */
export function buildProjectOcid(project: Pick<BudgetProject, 'id' | 'ocid'>): string {
  if (project.ocid && project.ocid.startsWith('ocds-')) {
    return project.ocid;
  }
  const cleanId = slugifyToken(project.id) || 'projet';
  return `${OCDS_CI_PREFIX}-${cleanId}`;
}

function mapProcurementMethod(rawMethod?: string): OcdsTenderMethodInfo {
  const cleanRaw = normalizeNonEmptyString(rawMethod);
  const token = (cleanRaw || '').toUpperCase();
  if (!token || token === 'UNKNOWN') {
    return { procurementMethod: undefined, details: undefined };
  }
  if (token.includes('OPEN') || token.includes('OUVERT') || token === 'AOO') {
    return { procurementMethod: 'open', details: cleanRaw };
  }
  if (token.includes('RESTRICT') || token.includes('RESTREINT') || token === 'AOR') {
    return { procurementMethod: 'selective', details: cleanRaw };
  }
  if (token.includes('GRE') || token.includes('DIRECT') || token === 'ENTENTE_DIRECTE') {
    return { procurementMethod: 'direct', details: cleanRaw };
  }
  if (token.includes('LIMITED')) {
    return { procurementMethod: 'limited', details: cleanRaw };
  }
  // An unrecognized local label must not be converted into a false OCDS method.
  return { procurementMethod: undefined, details: cleanRaw };
}

interface OcdsTenderMethodInfo {
  procurementMethod?: 'open' | 'selective' | 'limited' | 'direct';
  details?: string;
}

function normalizeExactAmount(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Transforme un projet et son Passeport de Redevabilité en Release OCDS v1.1.
 * Garanties non négociables :
 * - Aucun montant inconnu remplacé par 0
 * - Aucun award/contract généré sans marché DGMP rapproché (`hasMatchedDgmpTender`)
 * - Séparation stricte entre exécution financière (CA) et constat physique terrain
 */
export function mapProjectPassportToOcdsRelease(
  project: BudgetProject,
  passport: ProjectAccountabilityPassportData,
  releaseDate = new Date().toISOString()
): OcdsRelease {
  const ocid = buildProjectOcid(project);
  const buyerId = project.institution_id || `ci-inst-${slugifyToken(passport.institutionName) || 'public'}`;
  const buyerRef = {
    id: buyerId,
    name: passport.institutionName,
  };

  const parties: OcdsParty[] = [
    {
      ...buyerRef,
      roles: ['buyer', 'procuringEntity'],
      address: {
        locality: project.commune_name || undefined,
        region: project.region_name || undefined,
        countryName: "Côte d'Ivoire",
      },
    },
  ];

  const budgetAmount = normalizeExactAmount(project.budget_amount_fcfa);
  const projectBudgetProvenance = resolveProjectBudgetProvenance(project.data_provenance);
  const planningDocs: OcdsDocument[] = [];
  const validProjectSourceUrl = normalizeValidHttpUri(project.source_url);
  const validProjectPage =
    typeof project.source_page === 'number' && Number.isInteger(project.source_page) && project.source_page >= 1
      ? project.source_page
      : undefined;
  if (project.source || validProjectSourceUrl || project.source_document_id) {
    planningDocs.push({
      id: project.source_document_id || `doc-plan-${project.id}`,
      documentType: 'budgetProject',
      title: normalizeNonEmptyString(project.source) || 'Source budgétaire référencée',
      url: validProjectSourceUrl,
      pageStart: validProjectPage,
      x_provenance: projectBudgetProvenance,
    });
  }

  const tags: OcdsTag[] = ['planning', 'tender'];
  const awards: OcdsAward[] = [];
  const contracts: OcdsContract[] = [];

  const matchedProc = passport.matchedProcurement;
  const matchedOp = passport.matchedOperation;

  if (passport.hasMatchedDgmpTender && matchedProc) {
    tags.push('award');

    const supplierName = matchedProc.contractor?.trim();
    const supplierRef = supplierName
      ? {
          id: `ci-supplier-${slugifyToken(supplierName) || matchedProc.id}`,
          name: supplierName,
        }
      : null;

    if (supplierRef && !parties.some((p) => p.id === supplierRef.id)) {
      parties.push({
        ...supplierRef,
        roles: ['supplier'],
        address: {
          countryName: "Côte d'Ivoire",
        },
      });
    }

    const awardAmount = normalizeExactAmount(matchedProc.award_amount);
    const validProcSourceUrl = normalizeValidHttpUri(matchedProc.source_url);
    const procDateTime = normalizeOcdsDateTime(matchedProc.award_date);
    const awardDocs: OcdsDocument[] = matchedProc.source
      ? [
          {
            id: `doc-dgmp-${matchedProc.id}`,
            documentType: 'awardNotice',
            title: matchedProc.source,
            url: validProcSourceUrl,
            x_provenance: resolveProcurementDocProvenance(matchedProc.verification_status),
          },
        ]
      : [];

    const awardId = matchedProc.id || `award-${project.id}`;
    awards.push({
      id: awardId,
      title: matchedProc.procurement_object || project.title,
      status: 'active',
      date: procDateTime,
      value: awardAmount !== undefined ? { amount: awardAmount, currency: 'XOF' } : undefined,
      suppliers: supplierRef ? [supplierRef] : [],
      documents: awardDocs.length > 0 ? awardDocs : undefined,
    });

    if (matchedProc.contract_number || matchedOp) {
      tags.push('contract');
      const executedAmount = normalizeExactAmount(matchedOp?.executed_amount);
      const transactions: NonNullable<OcdsContract['implementation']>['transactions'] = [];

      if (matchedOp && executedAmount !== undefined) {
        tags.push('implementation');
        transactions.push({
          id: `ca-tx-${matchedOp.id}`,
          source: normalizeValidHttpUri(passport.facts.source_reference.source_url),
          x_sourceReference:
            normalizeNonEmptyString(matchedOp.source_reference) ||
            normalizeNonEmptyString(passport.facts.source_reference.source_reference) ||
            'Compte Administratif',
          value: { amount: executedAmount, currency: 'XOF' },
          payer: buyerRef,
          payee: supplierRef || undefined,
        });
      }

      contracts.push({
        id: matchedProc.contract_number || `contract-${awardId}`,
        awardID: awardId,
        title: matchedProc.procurement_object || project.title,
        status: 'active',
        dateSigned: procDateTime,
        value: awardAmount !== undefined ? { amount: awardAmount, currency: 'XOF' } : undefined,
        implementation:
          transactions.length > 0
            ? {
                transactions,
              }
            : undefined,
      });
    }
  } else if (matchedOp) {
    const executedAmount = normalizeExactAmount(matchedOp.executed_amount);
    if (executedAmount !== undefined) {
      tags.push('implementation');
    }
  }

  const methodInfo = mapProcurementMethod(
    matchedProc?.procurement_method || project.procurement_method
  );

  const financialFact = passport.facts.financial_status.value;
  const financialExecutionStatus: OcdsRelease['x_suivibudget']['financialExecutionStatus'] =
    financialFact === 'CA_REPORTED_EXECUTION'
      ? 'CA_REPORTED_EXECUTION'
      : financialFact === 'CA_REPORTED_ZERO'
        ? 'CA_REPORTED_ZERO'
        : 'NOT_FOUND_PUBLICLY';

  const physicalFact = passport.facts.physical_status.value;
  const physicalRealizationStatus: OcdsRelease['x_suivibudget']['physicalRealizationStatus'] =
    physicalFact === 'CITIZEN_OBSERVATION'
      ? 'CITIZEN_OBSERVATION'
      : physicalFact === 'OFFICIAL_DECLARATION'
        ? 'OFFICIAL_DECLARATION'
        : 'UNKNOWN';

  const procurementStatus: OcdsRelease['x_suivibudget']['procurementStatus'] =
    passport.hasMatchedDgmpTender && matchedProc
      ? 'MATCHED_DGMP'
      : project.contractor_name && !project.contractor_name.toLowerCase().includes("appel d'offres")
        ? 'DECLARED_UNVERIFIED'
        : 'NOT_FOUND_PUBLICLY';

  const approvedProofsCount =
    typeof passport.approvedProofsCount === 'number'
      ? passport.approvedProofsCount
      : passport.hasCitizenFieldProofs
        ? 1
        : 0;

  const bompRef = matchedProc?.bomp_reference || project.bomp_reference;

  return {
    ocid,
    id: `${ocid}-fy${project.fiscal_year || 'na'}`,
    date: releaseDate,
    language: 'fr',
    tag: tags,
    initiationType: 'tender',
    parties,
    buyer: buyerRef,
    planning: {
      rationale:
        normalizeNonEmptyString(project.citizen_need_origin) ||
        normalizeNonEmptyString(project.program_name) ||
        normalizeNonEmptyString(project.details),
      budget: {
        id: project.id,
        description: normalizeNonEmptyString(project.program_name) || normalizeNonEmptyString(project.category),
        amount: budgetAmount !== undefined ? { amount: budgetAmount, currency: 'XOF' } : undefined,
        project: project.title,
        fiscalYear: project.fiscal_year || null,
        uri: validProjectSourceUrl,
        // No precision metadata exists on BudgetProject today; never infer EXACT from a number alone.
        x_amountPrecision: resolveBudgetAmountPrecision(project.data_provenance),
        x_dataProvenance: projectBudgetProvenance,
      },
      documents: planningDocs.length > 0 ? planningDocs : undefined,
    },
    tender: {
      id: matchedProc?.tender_number || bompRef || `tender-${project.id}`,
      title: project.title,
      description: normalizeNonEmptyString(project.details),
      status: awards.length > 0 ? 'complete' : 'planned',
      procurementMethod: methodInfo.procurementMethod,
      procurementMethodDetails: methodInfo.details || normalizeNonEmptyString(bompRef),
      // The project category does not reliably identify the procurement category.
      procuringEntity: buyerRef,
      value: budgetAmount !== undefined ? { amount: budgetAmount, currency: 'XOF' } : undefined,
    },
    awards: awards.length > 0 ? awards : undefined,
    contracts: contracts.length > 0 ? contracts : undefined,
    x_suivibudget: {
      projectId: project.id,
      fiscalYear: project.fiscal_year || null,
      scopeLevel: project.scope_level === 'NATIONAL' ? 'NATIONAL' : 'LOCAL',
      budgetAmountStatus: budgetAmount !== undefined ? 'AVAILABLE' : 'UNKNOWN',
      procurementStatus,
      financialExecutionStatus,
      physicalRealizationStatus,
      approvedCitizenProofsCount: approvedProofsCount,
      documentationCompletenessPct: passport.documentationCompletenessPct,
    },
  };
}

/**
 * Génère un paquet OCDS v1.1 complet à partir d'une liste de projets.
 */
export function createOcdsReleasePackage(
  projects: readonly BudgetProject[],
  citizenProofs: readonly CitizenProof[] = [],
  accounts?: AdministrativeAccount[],
  packageUri = 'https://suivibudget.vercel.app/open-data/ocds-releases.json'
): OcdsReleasePackage {
  const publishedDate = new Date().toISOString();
  const releases = projects.map((project) => {
    const passport = generateProjectPassport(project, [...citizenProofs], accounts);
    // The release timestamp is the package publication time, not the project's created_at.
    const release = mapProjectPassportToOcdsRelease(project, passport, publishedDate);
    const approvedCount = citizenProofs.filter(
      (p) => p.project_id === project.id && p.verification_status === 'APPROVED' && !p.is_demo
    ).length;
    release.x_suivibudget.approvedCitizenProofsCount = approvedCount;
    return release;
  });

  return {
    uri: packageUri,
    version: '1.1',
    extensions: [SUIVIBUDGET_OCDS_EXTENSION_URL],
    publishedDate,
    publisher: {
      name: "SuiviBudget Côte d'Ivoire",
      uri: 'https://suivibudget.vercel.app',
    },
    license: 'https://opendatacommons.org/licenses/odbl/1-0/',
    publicationPolicy: 'https://suivibudget.vercel.app/documents',
    releases,
  };
}

export interface OcdsFilterOptions {
  institutionId?: string;
  fiscalYear?: number;
}

/**
 * Construit un paquet Open Data OCDS v1.1 filtré par collectivité et/ou exercice budgétaire.
 */
export function createFilteredOcdsReleasePackage(
  projects: readonly BudgetProject[],
  citizenProofs: readonly CitizenProof[] = [],
  options: OcdsFilterOptions = {},
  accounts?: AdministrativeAccount[]
): OcdsReleasePackage {
  const institutionId = options.institutionId?.trim();
  const fiscalYear =
    typeof options.fiscalYear === 'number' && Number.isInteger(options.fiscalYear)
      ? options.fiscalYear
      : undefined;

  const filtered = projects.filter((project) => {
    if (institutionId && project.institution_id !== institutionId) {
      return false;
    }
    if (fiscalYear !== undefined && project.fiscal_year !== fiscalYear) {
      return false;
    }
    return true;
  });

  const parts: string[] = [];
  if (institutionId) parts.push(slugifyToken(institutionId));
  if (fiscalYear !== undefined) parts.push(String(fiscalYear));
  const suffix = parts.length > 0 ? `-${parts.join('-')}` : '';
  const packageUri = `https://suivibudget.vercel.app/open-data/ocds-releases${suffix}.json`;

  return createOcdsReleasePackage(filtered, citizenProofs, accounts, packageUri);
}
