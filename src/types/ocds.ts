/**
 * Types conformes au standard international OCDS v1.1 (Open Contracting Data Standard)
 * adaptés à SuiviBudget Côte d'Ivoire (GIFT / OCP / OGP).
 */

export type OcdsTag =
  | 'planning'
  | 'tender'
  | 'award'
  | 'contract'
  | 'implementation';

export interface OcdsAmount {
  amount: number;
  currency: 'XOF';
}

export interface OcdsClassification {
  scheme: string;
  id: string;
  description: string;
}

export interface OcdsOrganizationReference {
  id: string;
  name: string;
}

export interface OcdsParty extends OcdsOrganizationReference {
  roles: Array<'buyer' | 'procuringEntity' | 'supplier'>;
  address?: {
    locality?: string;
    region?: string;
    countryName: "Côte d'Ivoire";
  };
}

export interface OcdsDocument {
  id: string;
  documentType: string;
  title: string;
  url?: string;
  datePublished?: string;
  pageStart?: number;
  x_provenance?: string;
}

export interface OcdsPlanning {
  rationale?: string;
  budget?: {
    id?: string;
    description?: string;
    amount?: OcdsAmount;
    project?: string;
    fiscalYear?: number | null;
    uri?: string;
    x_amountPrecision?: string;
    x_dataProvenance?: string;
  };
  documents?: OcdsDocument[];
}

export interface OcdsTender {
  id: string;
  title: string;
  description?: string;
  status: 'planned' | 'active' | 'complete' | 'unsuccessful' | 'cancelled';
  procurementMethod?: 'open' | 'selective' | 'limited' | 'direct';
  procurementMethodDetails?: string;
  mainProcurementCategory?: 'works' | 'goods' | 'services';
  procuringEntity?: OcdsOrganizationReference;
  value?: OcdsAmount;
  documents?: OcdsDocument[];
}

export interface OcdsAward {
  id: string;
  title?: string;
  status: 'active' | 'pending' | 'cancelled' | 'unsuccessful';
  date?: string;
  value?: OcdsAmount;
  suppliers: OcdsOrganizationReference[];
  documents?: OcdsDocument[];
}

export interface OcdsContract {
  id: string;
  awardID: string;
  title?: string;
  status: 'pending' | 'active' | 'terminated' | 'cancelled';
  dateSigned?: string;
  value?: OcdsAmount;
  implementation?: {
    transactions: Array<{
      id: string;
      source?: string;
      date?: string;
      value?: OcdsAmount;
      payer?: OcdsOrganizationReference;
      payee?: OcdsOrganizationReference;
    }>;
    milestones?: Array<{
      id: string;
      title: string;
      type: 'preProcurement' | 'approval' | 'delivery' | 'assessment' | 'financing';
      status: 'scheduled' | 'met' | 'notMet' | 'partiallyMet';
      description?: string;
    }>;
  };
}

export interface OcdsRelease {
  ocid: string;
  id: string;
  date: string;
  language: 'fr';
  tag: OcdsTag[];
  initiationType: 'tender';
  parties: OcdsParty[];
  buyer: OcdsOrganizationReference;
  planning: OcdsPlanning;
  tender: OcdsTender;
  awards?: OcdsAward[];
  contracts?: OcdsContract[];
  /**
   * Champs d'extension civique SuiviBudget (Principe 7 : Financier != Physique,
   * Principe 9 : Absence de donnée != donnée d'absence).
   */
  x_suivibudget: {
    projectId: string;
    fiscalYear: number | null;
    scopeLevel: 'LOCAL' | 'NATIONAL';
    budgetAmountStatus: 'AVAILABLE' | 'UNKNOWN';
    procurementStatus: 'MATCHED_DGMP' | 'DECLARED_UNVERIFIED' | 'NOT_FOUND_PUBLICLY';
    financialExecutionStatus: 'CA_REPORTED_EXECUTION' | 'CA_REPORTED_ZERO' | 'NOT_FOUND_PUBLICLY';
    physicalRealizationStatus: 'CITIZEN_OBSERVATION' | 'OFFICIAL_DECLARATION' | 'UNKNOWN';
    approvedCitizenProofsCount: number;
    documentationCompletenessPct: number;
  };
}

export interface OcdsReleasePackage {
  uri: string;
  version: '1.1';
  publishedDate: string;
  publisher: {
    name: "SuiviBudget Côte d'Ivoire";
    uri: 'https://suivibudget.vercel.app';
  };
  license: 'https://opendatacommons.org/licenses/odbl/1-0/';
  publicationPolicy: 'https://suivibudget.vercel.app/documents';
  releases: OcdsRelease[];
}
