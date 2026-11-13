import { BudgetProject, CitizenProof } from '../types';
import { AdministrativeAccount } from '../types/administrativeAccount';
import {
  OcdsAward,
  OcdsContract,
  OcdsDocument,
  OcdsParty,
  OcdsRelease,
  OcdsReleasePackage,
  OcdsTag,
} from '../types/ocds';
import { generateProjectPassport, ProjectAccountabilityPassportData } from './projectPassport';
import { amountPrecision } from './formatters';

export const OCDS_CI_PREFIX = 'ocds-ci-suivibudget';

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
  const token = (rawMethod || '').trim().toUpperCase();
  if (!token || token === 'UNKNOWN') {
    return { procurementMethod: undefined, details: undefined };
  }
  if (token.includes('OPEN') || token.includes('OUVERT') || token === 'AOO') {
    return { procurementMethod: 'open', details: rawMethod };
  }
  if (token.includes('RESTRICT') || token.includes('RESTREINT') || token === 'AOR') {
    return { procurementMethod: 'selective', details: rawMethod };
  }
  if (token.includes('GRE') || token.includes('DIRECT') || token === 'ENTENTE_DIRECTE') {
    return { procurementMethod: 'direct', details: rawMethod };
  }
  return { procurementMethod: 'limited', details: rawMethod };
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
  passport: ProjectAccountabilityPassportData
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
  const planningDocs: OcdsDocument[] = [];
  if (project.source || project.source_url || project.source_document_id) {
    planningDocs.push({
      id: project.source_document_id || `doc-plan-${project.id}`,
      documentType: 'budgetProject',
      title: project.source || 'Source budgétaire référencée',
      url: project.source_url,
      pageStart: project.source_page,
      x_provenance: passport.facts.budget_amount.provenance,
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
    const awardDocs: OcdsDocument[] = matchedProc.source
      ? [
          {
            id: `doc-dgmp-${matchedProc.id}`,
            documentType: 'awardNotice',
            title: matchedProc.source,
            url: matchedProc.source_url,
            x_provenance: 'OFFICIAL_SOURCE',
          },
        ]
      : [];

    const awardId = matchedProc.id || `award-${project.id}`;
    awards.push({
      id: awardId,
      title: matchedProc.procurement_object || project.title,
      status: 'active',
      date: matchedProc.award_date,
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
          source: matchedOp.source_reference || passport.facts.source_reference.source_reference || 'Compte Administratif',
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
        dateSigned: matchedProc.award_date,
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
    date: project.created_at || new Date().toISOString(),
    language: 'fr',
    tag: tags,
    initiationType: 'tender',
    parties,
    buyer: buyerRef,
    planning: {
      rationale: project.citizen_need_origin || project.program_name || project.details || undefined,
      budget: {
        id: project.id,
        description: project.program_name || project.category,
        amount: budgetAmount !== undefined ? { amount: budgetAmount, currency: 'XOF' } : undefined,
        project: project.title,
        fiscalYear: project.fiscal_year || null,
        uri: project.source_url,
        x_amountPrecision: project.data_provenance === 'DECLARED_ADMIN' ? 'DECLARED_ADMIN' : 'EXACT',
        x_dataProvenance: passport.facts.budget_amount.provenance,
      },
      documents: planningDocs.length > 0 ? planningDocs : undefined,
    },
    tender: {
      id: matchedProc?.tender_number || bompRef || `tender-${project.id}`,
      title: project.title,
      description: project.details || undefined,
      status: awards.length > 0 ? 'complete' : 'planned',
      procurementMethod: methodInfo.procurementMethod,
      procurementMethodDetails: methodInfo.details || bompRef,
      mainProcurementCategory: 'works',
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
  const releases = projects.map((project) => {
    const passport = generateProjectPassport(project, [...citizenProofs], accounts);
    const release = mapProjectPassportToOcdsRelease(project, passport);
    if (passport.matchedOperation && release.planning.budget) {
      release.planning.budget.x_amountPrecision = amountPrecision(
        passport.matchedOperation,
        'planned_amount'
      );
    }
    const approvedCount = citizenProofs.filter(
      (p) => p.project_id === project.id && p.verification_status === 'APPROVED' && !p.is_demo
    ).length;
    release.x_suivibudget.approvedCitizenProofsCount = approvedCount;
    return release;
  });

  return {
    uri: packageUri,
    version: '1.1',
    publishedDate: new Date().toISOString(),
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
