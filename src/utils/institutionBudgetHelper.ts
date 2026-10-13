import { Institution, PrimitiveBudgetInfo, BreakdownDocumentaryEvidence, StateGrantDocumentaryEvidence } from '../types';
import { DOCUMENT_CONTROLS } from '../data/officialPublicDocumentsCatalog';
import { formatFCFA, formatAmountInWords } from './formatters';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../data/officialPrimitiveBudgets';
import { NATIONAL_DIRECT_ALLOCATIONS_2026 } from '../data/nationalBudgetData';
import legalCP from '../../docs/references/2026/ministry-reconciliation/LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json';

export const LFI_2026_DOCUMENT = {
  title: "Loi de Finances n° 2025-987 du 19 décembre 2025 portant budget de l'État pour l'année 2026",
  reference: "Loi n° 2025-987 • JORCI • DGBF",
  url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf",
  sha256: "f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76",
};

export const DPPD_PAP_2026_DOCUMENT = {
  title: "Annexe 4 — Documents de Programmation Pluriannuelle des Dépenses - Projets Annuels de Performance (DPPD-PAP) 2026-2028",
  reference: "Annexe 4 DPPD-PAP 2026-2028 • DGBF",
  url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf",
  sha256: "0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10",
};

export const ANNEXE_6_EPN_2026_DOCUMENT = {
  title: "Annexe 6 — Budgets des Établissements Publics Nationaux (EPN) et Structures Assimilées (ASS) 2026",
  reference: "Annexe 6 LFI 2026 • État récapitulatif ASS • DGBF",
  url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-6-Budgets-des-EPN-2026.pdf",
  sha256: "3186dc17e1ba51ba1b69b3eed8ee3e40083a8eb0ddd56861dfdd0aa4b8c9bb2e",
};

type AuditedFinancialClaim = {
  audit_id: string;
  document_id: string;
  institution_id: string;
  fiscal_year: number;
  budget_basis: BreakdownDocumentaryEvidence['budget_basis'];
  credit_nature: string;
  pdf_page: number;
  audit_reference: string;
} & ({
  kind: 'BREAKDOWN';
  total_fcfa: number;
  functioning_fcfa: number;
  investment_fcfa: number;
} | {
  kind: 'STATE_GRANT';
  grant_type: StateGrantDocumentaryEvidence['grant_type'];
  amount_fcfa: number;
});

// A controlled PDF does not authorize every amount within it. No primary BP breakdown has been audited yet.
const AUDITED_FINANCIAL_CLAIMS: readonly AuditedFinancialClaim[] = [{
  audit_id: 'LFI-2026-78016001400', document_id: 'DGBF-LFI-2026',
  institution_id: 'inst-com-attecoube', fiscal_year: 2026, budget_basis: 'LFI',
  credit_nature: 'VOTED_CP_FUNCTIONING_TRANSFER', pdf_page: 207,
  audit_reference: 'docs/audits/local-2026/LFI_2026_PROGRAMME_2204040_2380_ACTIONS.csv',
  kind: 'STATE_GRANT', grant_type: 'CONCOURS_ETAT', amount_fcfa: 300_000_000,
}];

export function isValidPrimarySha256(hash: string | null | undefined): boolean {
  return typeof hash === 'string' && DOCUMENT_CONTROLS.some(document =>
    document.verification === 'VERIFIED' && document.sha256 === hash.toLowerCase());
}

function matchesAuditedDocument(claim: AuditedFinancialClaim, sourceUrl: string, hash: string | undefined, page: number | undefined): boolean {
  return isValidPrimarySha256(hash) && DOCUMENT_CONTROLS.some(document =>
    document.id === claim.document_id && document.verification === 'VERIFIED' &&
    document.officialUrl === sourceUrl && document.sha256 === hash!.toLowerCase() &&
    Number.isInteger(page) && page === claim.pdf_page && page > 0 && page <= (document.pageCount ?? 0));
}

export function isValidBreakdownDocumentaryEvidence(
  evidence: BreakdownDocumentaryEvidence | undefined | null,
  institutionId: string,
  fiscalYear: number,
  expectedBasis: string,
  total: number | null | undefined,
  functioning: number | null | undefined,
  investment: number | null | undefined
): boolean {
  if (!evidence || ![total, functioning, investment].every(value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)) return false;
  return evidence.institution_id === institutionId && evidence.fiscal_year === fiscalYear &&
    evidence.budget_basis === expectedBasis && evidence.total_fcfa === total &&
    evidence.functioning_fcfa === functioning && evidence.investment_fcfa === investment &&
    functioning! + investment! === total && AUDITED_FINANCIAL_CLAIMS.some(claim =>
      claim.kind === 'BREAKDOWN' && claim.audit_id === evidence.audit_id &&
      claim.institution_id === institutionId && claim.fiscal_year === fiscalYear &&
      claim.budget_basis === expectedBasis && claim.credit_nature === evidence.credit_nature &&
      claim.total_fcfa === total && claim.functioning_fcfa === functioning && claim.investment_fcfa === investment &&
      matchesAuditedDocument(claim, evidence.source_url, evidence.sha256, evidence.pdf_page));
}

function isValidStateGrantEvidence(evidence: StateGrantDocumentaryEvidence | undefined, institutionId: string, amount: number): boolean {
  return Boolean(evidence && evidence.institution_id === institutionId && evidence.fiscal_year === 2026 &&
    evidence.amount_fcfa === amount && AUDITED_FINANCIAL_CLAIMS.some(claim =>
      claim.kind === 'STATE_GRANT' && claim.audit_id === evidence.audit_id &&
      claim.institution_id === institutionId && claim.fiscal_year === evidence.fiscal_year &&
      claim.budget_basis === evidence.budget_basis && claim.credit_nature === evidence.credit_nature &&
      claim.grant_type === evidence.grant_type && claim.amount_fcfa === amount &&
      matchesAuditedDocument(claim, evidence.source?.source_url, evidence.source?.sha256, evidence.source?.pdf_page)));
}

function primitiveVerification(primitive: PrimitiveBudgetInfo, institutionId: string, fiscalYear: number): BudgetPresentationAmount['verification'] {
  const verified = isValidBreakdownDocumentaryEvidence({
    audit_id: primitive.audit_id, institution_id: institutionId, fiscal_year: primitive.fiscal_year ?? 2026,
    budget_basis: 'PRIMITIVE', credit_nature: primitive.credit_nature,
    document_title: primitive.source, document_reference: primitive.document_reference ?? '',
    source_url: primitive.source_url ?? '', pdf_page: primitive.pdf_page ?? 0, sha256: primitive.sha256 ?? '',
    total_fcfa: primitive.total_voted_fcfa, functioning_fcfa: primitive.functioning_voted_fcfa!, investment_fcfa: primitive.investment_voted_fcfa!,
  }, institutionId, fiscalYear, 'PRIMITIVE', primitive.total_voted_fcfa, primitive.functioning_voted_fcfa, primitive.investment_voted_fcfa);
  if (verified) return 'VERIFIED_AMOUNT';
  return (primitive.fiscal_year ?? 2026) === fiscalYear && primitive.verification_status !== 'OFFICIAL_DOCUMENT' &&
    Boolean(primitive.source?.trim()) && /^https?:\/\//i.test(primitive.source_url ?? '') ? 'SECONDARY_SOURCE' : 'TO_VERIFY';
}

export type InstitutionBudgetStatus = 
  | 'AVAILABLE' 
  | 'NOT_DOCUMENTED' 
  | 'NOT_PUBLISHED' 
  | 'TAX_AUTONOMY'
  | 'UNRECONCILED';

export type BudgetReconciliationStatus =
  | 'RECONCILED'
  | 'UNRECONCILED'
  | 'PARTIAL_BREAKDOWN'
  | 'NO_BREAKDOWN'
  | 'ZERO_TOTAL';

export type InstitutionBudgetVerificationStatus =
  | 'VERIFIED_AMOUNT'
  | 'VERIFIED_ZERO'
  | 'SECONDARY_SOURCE'
  | 'TO_VERIFY'
  | 'UNKNOWN'
  | 'NOT_DOCUMENTED'
  | 'NOT_PUBLISHED'
  | 'UNRECONCILED'
  | 'PARTIAL_BREAKDOWN';

export interface PercentageCalculationResult {
  status: BudgetReconciliationStatus;
  functioningPct: number | null;
  investmentPct: number | null;
  deltaFcfa: number | null;
  isBalanced: boolean;
  reason?: string;
}

export interface DocumentaryProvenance {
  document_title: string | null;
  document_reference: string | null;
  source_url: string | null;
  pdf_page: number | string | null;
  doc_page?: number | string | null;
  sha256?: string | null;
  table_or_line?: string | null;
}

export interface FinancialProgramItem {
  code: string;
  name: string;
  amount_fcfa: number | null;
  actions_count?: number;
}

export interface FinancialActionItem {
  code: string;
  name: string;
  amount_fcfa: number | null;
  program_code?: string;
}

export interface InstitutionFinancialView {
  institution_id: string;
  institution_name: string;
  institution_type: string;
  official_section_code: string | null;
  fiscal_year: number;
  nature_credits: string | null;
  budget_basis: 'LFI' | 'PRIMITIVE' | 'RECTIFICATIF' | 'ADMINISTRATIVE_ACCOUNT' | 'NOT_APPLICABLE';
  budget_measure: 'CREDITS_VOTES' | 'AUTONOMIE_FISCALE' | 'NON_INDIVIDUALISE' | 'NON_PUBLIE';
  total_amount_fcfa: number | null;
  functioning_amount_fcfa: number | null;
  investment_amount_fcfa: number | null;
  total_formatted: string;
  total_words: string | null;
  functioning_formatted: string | null;
  investment_formatted: string | null;
  functioning_pct: number | null;
  investment_pct: number | null;
  has_breakdown: boolean;
  delta_fcfa: number | null;
  programs: FinancialProgramItem[];
  actions: FinancialActionItem[];
  documentary_provenance: DocumentaryProvenance | null;
  verification_status: InstitutionBudgetVerificationStatus;
  reconciliation_status: BudgetReconciliationStatus;
  blocking_reasons: string[];
  badge_text: string;
  badge_class: string;
  notice_text: string | null;
  is_cour_supreme: boolean;
  is_tax_quota_commune: boolean;
  // Compatibilité ascendante avec InstitutionBudgetAssessment
  status: InstitutionBudgetStatus;
}

export interface InstitutionBudgetAssessment {
  status: InstitutionBudgetStatus;
  totalFormatted: string;
  totalWords: string | null;
  functioningFormatted: string | null;
  investmentFormatted: string | null;
  functioningPct: number | null;
  investmentPct: number | null;
  hasBreakdown: boolean;
  badgeText: string;
  badgeClass: string;
  noticeText: string | null;
  isCourSupreme: boolean;
  isTaxQuotaCommune: boolean;
  // Données enrichies
  reconciliationStatus?: BudgetReconciliationStatus;
  verificationStatus?: InstitutionBudgetVerificationStatus;
  deltaFcfa?: number | null;
}

/**
 * Registre LFI 2026 : recapitulatif par section/dotation/programme (PDF pp.45-54).
 * Pour IGE/HABG, la section 103 est la PRESIDENCE ; leurs montants sont des
 * PROGRAMMES INTERNES 13003/13004 (ne JAMAIS les ajouter au total section 103).
 */
export const NATIONAL_INSTITUTIONS_SECTIONS: Record<string, {
  section_code: string; pdf_page: number; doc_page: number;
  lfi_amount_fcfa: number; program_code?: string;
}> = {
  'inst-presidence': { section_code: '103', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 193633705615 },
  'inst-assnat': { section_code: '101', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 38578972451 },
  'inst-senat': { section_code: '102', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 14665806742 },
  'inst-conseil-const': { section_code: '106', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 3860437235 },
  'inst-cesec': { section_code: '105', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 8069692846 },
  'inst-cour-comptes': { section_code: '115', pdf_page: 46, doc_page: 2, lfi_amount_fcfa: 8851161351 },
  'inst-chancellerie': { section_code: '107', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 3743870172 },
  'inst-mediateur': { section_code: '109', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 8285468221 },
  'inst-habg': { section_code: '103', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 5552174916, program_code: '13004' },
  'inst-cnrct': { section_code: '111', pdf_page: 46, doc_page: 2, lfi_amount_fcfa: 5794171874 },
  'inst-conseil-etat': { section_code: '118', pdf_page: 46, doc_page: 2, lfi_amount_fcfa: 5164531081 },
  'inst-cour-cassation': { section_code: '114', pdf_page: 46, doc_page: 2, lfi_amount_fcfa: 7931309608 },
  'inst-ige': { section_code: '103', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 9872577575, program_code: '13003' },
};

/**
 * Sections LFI 2026 des portefeuilles 2026 (35 portefeuilles, 34 sections).
 * Les crédits des sections et les budgets de portefeuille ne sont PAS synonymes.
 * Source: LFI 2026 PDF pp.45-54. Le poste gov-035 n'a pas de section autonome.
 */
export const MINISTRIES_SECTIONS: Record<string, {
  section_code: string; pdf_page: number; doc_page: number; lfi_amount_fcfa: number;
}> = {
  'gov-001': { section_code: '108', pdf_page: 45, doc_page: 1, lfi_amount_fcfa: 71326766299 },
  'gov-002': { section_code: '226', pdf_page: 46, doc_page: 2, lfi_amount_fcfa: 481041827995 },
  'gov-003': { section_code: '237', pdf_page: 47, doc_page: 3, lfi_amount_fcfa: 45121940916 },
  'gov-004': { section_code: '321', pdf_page: 47, doc_page: 3, lfi_amount_fcfa: 146728395147 },
  'gov-005': { section_code: '325', pdf_page: 48, doc_page: 4, lfi_amount_fcfa: 129151307791 },
  'gov-006': { section_code: '323', pdf_page: 48, doc_page: 4, lfi_amount_fcfa: 945963329452 },
  'gov-007': { section_code: '322', pdf_page: 46, doc_page: 2, lfi_amount_fcfa: 8699982915992 },
  'gov-008': { section_code: '348', pdf_page: 51, doc_page: 7, lfi_amount_fcfa: 706060209015 },
  'gov-009': { section_code: '229', pdf_page: 47, doc_page: 3, lfi_amount_fcfa: 333878089526 },
  'gov-010': { section_code: '340', pdf_page: 50, doc_page: 6, lfi_amount_fcfa: 307769615082 },
  'gov-011': { section_code: '366', pdf_page: 53, doc_page: 9, lfi_amount_fcfa: 502893150963 },
  'gov-012': { section_code: '357', pdf_page: 52, doc_page: 8, lfi_amount_fcfa: 81484195624 },
  'gov-013': { section_code: '335', pdf_page: 49, doc_page: 5, lfi_amount_fcfa: 808992158914 },
  'gov-014': { section_code: '358', pdf_page: 52, doc_page: 8, lfi_amount_fcfa: 123247714398 },
  'gov-015': { section_code: '351', pdf_page: 52, doc_page: 8, lfi_amount_fcfa: 26700912028 },
  'gov-016': { section_code: '376', pdf_page: 53, doc_page: 9, lfi_amount_fcfa: 49213125398 },
  'gov-017': { section_code: '336', pdf_page: 49, doc_page: 5, lfi_amount_fcfa: 39806735298 },
  'gov-018': { section_code: '345', pdf_page: 50, doc_page: 6, lfi_amount_fcfa: 103197582643 },
  'gov-019': { section_code: '347', pdf_page: 51, doc_page: 7, lfi_amount_fcfa: 96866871722 },
  'gov-020': { section_code: '350', pdf_page: 51, doc_page: 7, lfi_amount_fcfa: 19207286052 },
  'gov-021': { section_code: '328', pdf_page: 48, doc_page: 4, lfi_amount_fcfa: 44194260102 },
  'gov-022': { section_code: '333', pdf_page: 49, doc_page: 5, lfi_amount_fcfa: 338779408246 },
  'gov-023': { section_code: '362', pdf_page: 53, doc_page: 9, lfi_amount_fcfa: 91411414044 },
  'gov-024': { section_code: '331', pdf_page: 49, doc_page: 5, lfi_amount_fcfa: 1563721366602 },
  'gov-025': { section_code: '330', pdf_page: 49, doc_page: 5, lfi_amount_fcfa: 734442904943 },
  'gov-026': { section_code: '369', pdf_page: 53, doc_page: 9, lfi_amount_fcfa: 57361750199 },
  'gov-027': { section_code: '356', pdf_page: 52, doc_page: 8, lfi_amount_fcfa: 83275503595 },
  'gov-028': { section_code: '352', pdf_page: 52, doc_page: 8, lfi_amount_fcfa: 31263058865 },
  'gov-029': { section_code: '346', pdf_page: 50, doc_page: 6, lfi_amount_fcfa: 37598620420 },
  'gov-030': { section_code: '444', pdf_page: 54, doc_page: 10, lfi_amount_fcfa: 70427777385 },
  'gov-031': { section_code: '343', pdf_page: 50, doc_page: 6, lfi_amount_fcfa: 36680067253 },
  'gov-032': { section_code: '440', pdf_page: 54, doc_page: 10, lfi_amount_fcfa: 13746365872 },
  'gov-033': { section_code: '439', pdf_page: 53, doc_page: 9, lfi_amount_fcfa: 5122516889 },
  'gov-034': { section_code: '334', pdf_page: 49, doc_page: 5, lfi_amount_fcfa: 182301855312 },
};

/**
 * Calcule de façon strictement arithmétique et déterministe les ratios budgétaires.
 * Règles non négociables (P1-A) :
 * - Vérifie que les montants sont présents, finis, non-négatifs et de précision exacte (safe integers).
 * - Vérifie que fonctionnement + investissement === total à 1 FCFA près.
 * - Ne masque jamais un écart par un arrondi.
 * - Ne force jamais le second pourcentage à compléter artificiellement le premier (100 - fPct interdit en cas d'écart).
 * - En cas de déséquilibre : retourne UNRECONCILED, expose deltaFcfa, et refuse d'afficher des pourcentages trompeurs (null).
 * - En cas de ventilation partielle : retourne PARTIAL_BREAKDOWN, n'invente jamais la composante manquante.
 * - En cas de total nul officiellement documenté : ne produit aucune division par zéro.
 */
export function calculateSafePercentages(
  functioning: number | null | undefined,
  investment: number | null | undefined,
  total: number | null | undefined
): PercentageCalculationResult {
  // 1. Total absent
  if (total == null) {
    return {
      status: 'NO_BREAKDOWN',
      functioningPct: null,
      investmentPct: null,
      deltaFcfa: null,
      isBalanced: false,
      reason: 'Montant total du budget non renseigné (null/undefined).'
    };
  }

  // 2. Validation de type et de finitude
  if (!Number.isFinite(total) || !Number.isSafeInteger(total) || total < 0 || total > Number.MAX_SAFE_INTEGER) {
    return {
      status: 'UNRECONCILED',
      functioningPct: null,
      investmentPct: null,
      deltaFcfa: null,
      isBalanced: false,
      reason: 'Montant total invalide (non fini, non entier sûr, négatif ou hors limites de précision exacte).'
    };
  }

  // 3. Cas particulier : Total nul (0 FCFA) officiellement documenté
  if (total === 0) {
    if ((functioning != null && !Number.isSafeInteger(functioning)) ||
        (investment != null && !Number.isSafeInteger(investment)) ||
        (functioning != null && functioning < 0) ||
        (investment != null && investment < 0)) {
      return { status: 'UNRECONCILED', functioningPct: null, investmentPct: null,
        deltaFcfa: null, isBalanced: false, reason: 'Ventilation nulle invalide : montant negatif, NaN, infini ou non entier.' };
    }
    if (functioning === 0 && investment === 0) {
      return {
        status: 'ZERO_TOTAL',
        functioningPct: null,
        investmentPct: null,
        deltaFcfa: 0,
        isBalanced: true,
        reason: 'Dotation totale nulle (0 FCFA) officiellement documentée sans ventilation active.'
      };
    }
    if (functioning == null || investment == null) {
      return { status: 'NO_BREAKDOWN', functioningPct: null, investmentPct: null,
        deltaFcfa: null, isBalanced: false,
        reason: 'Ventilation manquante : un total nul ne prouve pas les composantes.' };
    }
    const nonZeroParts = functioning + investment;
    return {
      status: 'UNRECONCILED',
      functioningPct: null,
      investmentPct: null,
      deltaFcfa: -nonZeroParts,
      isBalanced: false,
      reason: 'Total nul alors qu\'une composante de fonctionnement ou d\'investissement est non nulle.'
    };
  }

  // 4. Ventilation manquante ou partielle pour un total strictement positif
  if (functioning == null || investment == null) {
    const isBothNull = functioning == null && investment == null;
    return {
      status: isBothNull ? 'NO_BREAKDOWN' : 'PARTIAL_BREAKDOWN',
      functioningPct: null,
      investmentPct: null,
      deltaFcfa: null,
      isBalanced: false,
      reason: isBothNull 
        ? 'Aucune ventilation fonctionnement/investissement disponible.'
        : 'Ventilation partielle : une des composantes fonctionnement ou investissement est manquante.'
    };
  }

  // 5. Validation des composantes
  if (!Number.isSafeInteger(functioning) || !Number.isSafeInteger(investment) ||
      functioning < 0 || investment < 0 ||
      functioning > Number.MAX_SAFE_INTEGER || investment > Number.MAX_SAFE_INTEGER) {
    return {
      status: 'UNRECONCILED',
      functioningPct: null,
      investmentPct: null,
      deltaFcfa: null,
      isBalanced: false,
      reason: 'Composante(s) invalide(s) (non finie(s), négative(s) ou hors précision sûre).'
    };
  }

  // 6. Rapprochement arithmétique exact en entiers FCFA
  const deltaFcfa = total - (functioning + investment);

  if (deltaFcfa !== 0) {
    return {
      status: 'UNRECONCILED',
      functioningPct: null,
      investmentPct: null,
      deltaFcfa,
      isBalanced: false,
      reason: `Écart arithmétique de ${deltaFcfa} FCFA : fonctionnement (${functioning}) + investissement (${investment}) = ${functioning + investment} ≠ total (${total}).`
    };
  }

  // 7. Équilibre certifié exact (deltaFcfa === 0)
  if (investment === 0 && functioning > 0) {
    return {
      status: 'RECONCILED',
      functioningPct: 100,
      investmentPct: 0,
      deltaFcfa: 0,
      isBalanced: true
    };
  }

  if (functioning === 0 && investment > 0) {
    return {
      status: 'RECONCILED',
      functioningPct: 0,
      investmentPct: 100,
      deltaFcfa: 0,
      isBalanced: true
    };
  }

  // Ventilation mixte : calcul des pourcentages arrondis certifiés
  const rawFPct = (functioning / total) * 100;
  const rawIPct = (investment / total) * 100;
  let fPct = Math.round(rawFPct);
  let iPct = Math.round(rawIPct);

  // Correction équitable si la somme des arrondis entiers fait 99 ou 101
  if (fPct + iPct !== 100) {
    const diff = 100 - (fPct + iPct);
    const fRemainder = rawFPct - Math.floor(rawFPct);
    const iRemainder = rawIPct - Math.floor(rawIPct);
    if (fRemainder >= iRemainder) {
      fPct += diff;
    } else {
      iPct += diff;
    }
  }

  return {
    status: 'RECONCILED',
    functioningPct: fPct,
    investmentPct: iPct,
    deltaFcfa: 0,
    isBalanced: true
  };
}

/**
 * Résolveur Financier Commun Unique (P1-B).
 * Utilisé par les cartes institutionnelles, les fiches détaillées (modals),
 * les exports et les moteurs de vérification.
 * 
 * Élimine toute divergence d'observation entre la carte et la fiche détaillée.
 */
export function resolveInstitutionFinancialView(
  institution: Partial<Institution>,
  fiscalYear: number = 2026,
  requestedBasis?: 'LFI' | 'PRIMITIVE' | 'RECTIFICATIF' | 'ADMINISTRATIVE_ACCOUNT'
): InstitutionFinancialView {
  const instId = institution.id || 'unknown-institution';
  const instName = institution.name || 'Institution non dénommée';
  const instType = institution.type || 'INSTITUTION';

  const localPrimitiveBasis = ['MAIRIE', 'REGION', 'DISTRICT'].includes(instType) && (requestedBasis == null || requestedBasis === 'PRIMITIVE');
  if (localPrimitiveBasis) {
    const candidate = institution.primitive_budget ?? OFFICIAL_PRIMITIVE_BUDGETS[instId];
    const primitive = candidate && (candidate.fiscal_year ?? 2026) === fiscalYear ? candidate : undefined;
    institution = { ...institution,
      total_budget_fcfa: primitive?.total_voted_fcfa ?? null,
      budget_functioning_fcfa: primitive?.functioning_voted_fcfa ?? null,
      budget_investment_fcfa: primitive?.investment_voted_fcfa ?? null,
      budget_not_published: primitive ? false : institution.budget_not_published,
    };
  }

  const isCourSupreme = instId === 'inst-cour-supreme' || 
    (instName.toLowerCase().includes('cour suprême') && 
     !instName.toLowerCase().includes('cassation') && 
     !instName.toLowerCase().includes('comptes'));

  // 1. CAS PARTICULIER CONSTITUTIONNEL : Cour Suprême de Côte d'Ivoire
  if (isCourSupreme) {
    return {
      institution_id: instId,
      institution_name: instName,
      institution_type: instType,
      official_section_code: null,
      fiscal_year: fiscalYear,
      nature_credits: null,
      budget_basis: 'LFI',
      budget_measure: 'NON_INDIVIDUALISE',
      total_amount_fcfa: null,
      functioning_amount_fcfa: null,
      investment_amount_fcfa: null,
      total_formatted: 'Non individualisé (LFI 2026)',
      total_words: null,
      functioning_formatted: null,
      investment_formatted: null,
      functioning_pct: null,
      investment_pct: null,
      has_breakdown: false,
      delta_fcfa: null,
      programs: [],
      actions: [],
      documentary_provenance: {
        document_title: LFI_2026_DOCUMENT.title,
        document_reference: "Loi n° 2025-987 • Constitution de 2016 (Titre VII)",
        source_url: LFI_2026_DOCUMENT.url,
        pdf_page: "45-54",
        sha256: LFI_2026_DOCUMENT.sha256,
        table_or_line: "Tableau récapitulatif des crédits par section"
      },
      verification_status: 'NOT_DOCUMENTED',
      reconciliation_status: 'NO_BREAKDOWN',
      blocking_reasons: [
        "Compétences juridictionnelles réparties sous la Constitution de 2016 entre Cassation (114), Conseil d'État (118) et Cour des Comptes (115). Aucune section budgétaire autonome propre dans la LFI 2026."
      ],
      badge_text: 'Dotation non individualisée (LFI 2026)',
      badge_class: 'bg-slate-100 text-slate-700 border-slate-300',
      notice_text: "Conformément à la Constitution ivoirienne de 2016 (Titre VII), les compétences juridictionnelles historiques de la Cour Suprême sont exercées par trois juridictions suprêmes autonomes, chacune dotée de sa propre section budgétaire dans la Loi de Finances 2026 : la Cour de Cassation (Section 114), le Conseil d'État (Section 118) et la Cour des Comptes (Section 115). Aucune dotation distincte n'est individualisée pour la Cour Suprême dans le budget général de l'État.",
      is_cour_supreme: true,
      is_tax_quota_commune: false,
      status: 'NOT_DOCUMENTED'
    };
  }

  // 2. CAS PARTICULIER : Communes du Grand Abidjan en autonomie fiscale sans budget primitif centralisé
  const GRAND_ABIDJAN_COMMUNE_IDS = new Set([
    'inst-com-abobo', 'inst-com-adjame', 'inst-com-attecoube', 'inst-com-cocody',
    'inst-com-koumassi', 'inst-com-marcory', 'inst-com-plateau', 'inst-com-port-bouet',
    'inst-com-treichville', 'inst-com-yopougon',
    'com-abobo', 'com-adjame', 'com-attecoube', 'com-cocody',
    'com-koumassi', 'com-marcory', 'com-plateau', 'com-port-bouet',
    'com-treichville', 'com-yopougon'
  ]);
  const isTaxQuota = Boolean(institution.is_tax_quota_commune) || GRAND_ABIDJAN_COMMUNE_IDS.has(instId);
  const isUnpublishedOrNull = institution.budget_not_published || institution.total_budget_fcfa == null;

  if (isTaxQuota && isUnpublishedOrNull) {
    return {
      institution_id: instId,
      institution_name: instName,
      institution_type: instType,
      official_section_code: null,
      fiscal_year: fiscalYear,
      nature_credits: "Recettes Propres & Fiscalité Locale",
      budget_basis: 'PRIMITIVE',
      budget_measure: 'AUTONOMIE_FISCALE',
      total_amount_fcfa: null,
      functioning_amount_fcfa: null,
      investment_amount_fcfa: null,
      total_formatted: 'Budget municipal propre',
      total_words: null,
      functioning_formatted: null,
      investment_formatted: null,
      functioning_pct: null,
      investment_pct: null,
      has_breakdown: false,
      delta_fcfa: null,
      programs: [],
      actions: [],
      documentary_provenance: {
        document_title: "Délibération municipale en attente de transmission",
        document_reference: "Loi n°2013-867 relative à la CAIDP • Autonomie financière et fiscale",
        source_url: null,
        pdf_page: null,
      },
      verification_status: 'NOT_PUBLISHED',
      reconciliation_status: 'NO_BREAKDOWN',
      blocking_reasons: [
        "Commune du Grand Abidjan sous autonomie fiscale (quotes-parts DGI, patentes, taxes locales). Délibération du Budget Primitif 2026 en attente de centralisation."
      ],
      badge_text: 'Ressources Propres & Impôts Locaux',
      badge_class: 'bg-blue-100 text-brand-blue border-blue-200',
      notice_text: 'Commune du Grand Abidjan fonctionnant sous le régime de l\'autonomie financière et fiscale (quotes-parts DGI, patentes, taxes municipales). Délibération du Budget Primitif 2026 en attente de centralisation.',
      is_cour_supreme: false,
      is_tax_quota_commune: true,
      status: 'TAX_AUTONOMY'
    };
  }

  // 3. CAS DU BUDGET NON PUBLIÉ OU NON DOCUMENTÉ
  if (institution.budget_not_published || institution.total_budget_fcfa == null) {
    const isExplicitlyUnpublished = institution.budget_not_published === true;
    const vStatus: InstitutionBudgetVerificationStatus = institution.breakdown_evidence ? 'TO_VERIFY' : isExplicitlyUnpublished ? 'NOT_PUBLISHED' : 'NOT_DOCUMENTED';
    const sStatus: InstitutionBudgetStatus = isExplicitlyUnpublished ? 'NOT_PUBLISHED' : 'NOT_DOCUMENTED';
    const referenceOnly = fiscalYear === 2026 && (requestedBasis == null || requestedBasis === 'LFI')
      ? (NATIONAL_INSTITUTIONS_SECTIONS[instId] ?? MINISTRIES_SECTIONS[instId]) : undefined;
    const totalFormatted = isExplicitlyUnpublished ? 'Montant à confirmer' : 'Non documenté publiquement';
    const badgeText = isExplicitlyUnpublished ? 'Budget non publié' : 'Non documenté publiquement';

    return {
      institution_id: instId,
      institution_name: instName,
      institution_type: instType,
      official_section_code: referenceOnly?.section_code ?? null,
      fiscal_year: fiscalYear,
      nature_credits: null,
      budget_basis: requestedBasis || (['MAIRIE', 'REGION', 'DISTRICT'].includes(instType) ? 'PRIMITIVE' : 'LFI'),
      budget_measure: isExplicitlyUnpublished ? 'NON_PUBLIE' : 'NON_INDIVIDUALISE',
      total_amount_fcfa: null,
      functioning_amount_fcfa: null,
      investment_amount_fcfa: null,
      total_formatted: totalFormatted,
      total_words: null,
      functioning_formatted: null,
      investment_formatted: null,
      functioning_pct: null,
      investment_pct: null,
      has_breakdown: false,
      delta_fcfa: null,
      programs: [],
      actions: [],
      documentary_provenance: referenceOnly ? {
        document_title: LFI_2026_DOCUMENT.title,
        document_reference: `Référence de section ${referenceOnly.section_code} uniquement : ne certifie pas une allocation de portefeuille`,
        source_url: LFI_2026_DOCUMENT.url,
        pdf_page: referenceOnly.pdf_page,
        doc_page: referenceOnly.doc_page,
        sha256: LFI_2026_DOCUMENT.sha256,
        table_or_line: `Total LFI de section ${referenceOnly.section_code}, sans imputation certifiée au portefeuille`
      } : null,
      verification_status: vStatus,
      reconciliation_status: 'NO_BREAKDOWN',
      blocking_reasons: [
        isExplicitlyUnpublished
          ? "Document officiel d'approbation budgétaire ou annexe de la Loi de Finances non encore publié ou en cours d'obtention."
          : "Aucune documentation budgétaire publique disponible ou document non encore transmis à SuiviBudget.",
        ...(referenceOnly ? [`Section LFI ${referenceOnly.section_code} connue, mais montant affectable à ce portefeuille inconnu.`] : [])
      ],
      badge_text: badgeText,
      badge_class: isExplicitlyUnpublished ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-300',
      notice_text: isExplicitlyUnpublished
        ? 'La dotation officielle ou le budget primitif de cette entité n\'est pas encore individualisé ou publié dans les documents officiels disponibles.'
        : 'Cette entité ne dispose pas de document budgétaire officiel public répertorié pour l\'exercice.',
      is_cour_supreme: false,
      is_tax_quota_commune: false,
      status: sStatus
    };
  }

  // 4. CAS DU ZÉRO DOCUMENTÉ (total === 0)
  if (institution.total_budget_fcfa === 0) {
    const arithmetic = calculateSafePercentages(institution.budget_functioning_fcfa, institution.budget_investment_fcfa, 0);
    return {
      institution_id: instId, institution_name: instName, institution_type: instType,
      official_section_code: null, fiscal_year: fiscalYear, nature_credits: null,
      budget_basis: requestedBasis || (localPrimitiveBasis ? 'PRIMITIVE' : 'LFI'), budget_measure: 'CREDITS_VOTES',
      total_amount_fcfa: 0,
      functioning_amount_fcfa: institution.budget_functioning_fcfa ?? null,
      investment_amount_fcfa: institution.budget_investment_fcfa ?? null,
      total_formatted: '0 FCFA (non vérifié)', total_words: null,
      functioning_formatted: institution.budget_functioning_fcfa != null ? formatFCFA(institution.budget_functioning_fcfa) : null,
      investment_formatted: institution.budget_investment_fcfa != null ? formatFCFA(institution.budget_investment_fcfa) : null,
      functioning_pct: null, investment_pct: null, has_breakdown: false,
      delta_fcfa: arithmetic.status === 'ZERO_TOTAL' ? 0 : null,
      programs: [], actions: [], documentary_provenance: null,
      verification_status: 'NOT_DOCUMENTED',
      reconciliation_status: arithmetic.status,
      blocking_reasons: ['Valeur nulle présente dans les données, mais aucune pièce officielle ne permet de la certifier.'],
      badge_text: 'Zéro déclaré, preuve manquante',
      badge_class: 'bg-amber-100 text-amber-800 border-amber-300',
      notice_text: 'Zéro non certifié : la donnée est conservée mais nécessite une ligne budgétaire officielle individuelle.',
      is_cour_supreme: false, is_tax_quota_commune: false, status: 'NOT_DOCUMENTED'
    };
  }

  // 5. CAS NOMINAL : TOTAL DISPONIBLE > 0
  const total = institution.total_budget_fcfa;
  const fonct = institution.budget_functioning_fcfa;
  const inv = institution.budget_investment_fcfa;

  const pctResult = calculateSafePercentages(fonct, inv, total);

  // Recherche de section officielle
  const nationalSection = NATIONAL_INSTITUTIONS_SECTIONS[instId];
  const ministrySection = MINISTRIES_SECTIONS[instId];
  const officialSectionCode = nationalSection?.section_code || ministrySection?.section_code || null;
  const pdfPage = nationalSection?.pdf_page ?? ministrySection?.pdf_page ?? null;
  const docPage = nationalSection?.doc_page ?? ministrySection?.doc_page ?? null;

  // Provenance documentaire par défaut selon l'entité
  const provenance: DocumentaryProvenance = {
    document_title: LFI_2026_DOCUMENT.title,
    document_reference: officialSectionCode 
      ? `Loi n° 2025-987 • Section ${officialSectionCode}${nationalSection?.program_code ? ` • Programme ${nationalSection.program_code}` : ''}` 
      : LFI_2026_DOCUMENT.reference,
    source_url: LFI_2026_DOCUMENT.url,
    pdf_page: pdfPage,
    doc_page: docPage,
    sha256: LFI_2026_DOCUMENT.sha256,
    table_or_line: nationalSection?.program_code
      ? `Programme interne ${nationalSection.program_code} de la section 103 (Présidence)`
      : "Tableau des crédits par section et par programme"
  };

  // Verification documentaire INDEPENDANTE de l'egalite arithmetique.
  // Aucune preuve PDF = jamais VERIFIED_AMOUNT, meme si les composantes s'additionnent.
  const amountEvidence = nationalSection ?? ministrySection;
  const isLfi2026AmountConfirmed = fiscalYear === 2026 && (requestedBasis == null || requestedBasis === 'LFI') &&
    amountEvidence != null && amountEvidence.lfi_amount_fcfa === total;
  const documentaryDiscrepancy = amountEvidence != null && !isLfi2026AmountConfirmed;
  const isReconciled = pctResult.status === 'RECONCILED';
  const effectiveBasis = requestedBasis || (['MAIRIE', 'REGION', 'DISTRICT'].includes(instType) ? 'PRIMITIVE' : 'LFI');

  const primitiveInfo = ['MAIRIE', 'REGION', 'DISTRICT'].includes(instType) && effectiveBasis === 'PRIMITIVE'
    ? institution.primitive_budget ?? OFFICIAL_PRIMITIVE_BUDGETS[instId] : undefined;
  const primitiveStatus = primitiveInfo ? primitiveVerification(primitiveInfo, instId, fiscalYear) : undefined;
  const isPrimitiveBalancedAndMatching = Boolean(
    primitiveInfo && primitiveInfo.precision === 'EXACT' &&
    calculateSafePercentages(primitiveInfo.functioning_voted_fcfa, primitiveInfo.investment_voted_fcfa, primitiveInfo.total_voted_fcfa).status === 'RECONCILED' &&
    total === primitiveInfo.total_voted_fcfa && fonct === primitiveInfo.functioning_voted_fcfa && inv === primitiveInfo.investment_voted_fcfa
  );
  const isPrimitivePrimaryCertified = isPrimitiveBalancedAndMatching && primitiveStatus === 'VERIFIED_AMOUNT';

  const hasStructuredBreakdownEvidence = isValidBreakdownDocumentaryEvidence(
    institution.breakdown_evidence,
    instId,
    fiscalYear,
    effectiveBasis,
    total,
    fonct,
    inv
  );

  const isPrimitiveSecondaryReported = primitiveStatus === 'SECONDARY_SOURCE' && primitiveInfo?.total_voted_fcfa === total;
  const isBreakdownPrimaryVerified = (isPrimitivePrimaryCertified || hasStructuredBreakdownEvidence) && isReconciled;
  const isBreakdownSecondaryReported = !isBreakdownPrimaryVerified && isPrimitiveBalancedAndMatching && primitiveStatus === 'SECONDARY_SOURCE' && isReconciled;
  const isBreakdownDisplayable = isBreakdownPrimaryVerified || isBreakdownSecondaryReported;

  const resolvedProvenance: DocumentaryProvenance | null = isLfi2026AmountConfirmed
    ? provenance
    : hasStructuredBreakdownEvidence
    ? {
        document_title: institution.breakdown_evidence!.document_title,
        document_reference: institution.breakdown_evidence!.document_reference,
        source_url: institution.breakdown_evidence!.source_url,
        pdf_page: institution.breakdown_evidence!.pdf_page,
        sha256: institution.breakdown_evidence!.sha256,
        table_or_line: 'Ventilation fonctionnement/investissement vérifiée sur source primaire',
      }
    : isPrimitivePrimaryCertified
    ? {
        document_title: primitiveInfo!.source,
        document_reference: primitiveInfo!.document_reference ?? primitiveInfo!.session_notes ?? 'Délibération budgétaire primitive officielle',
        source_url: primitiveInfo!.source_url ?? null,
        pdf_page: primitiveInfo!.pdf_page!,
        sha256: primitiveInfo!.sha256!,
        table_or_line: 'Délibération / document budgétaire primaire vérifié',
      }
    : isPrimitiveSecondaryReported
    ? {
        document_title: primitiveInfo!.source,
        document_reference: primitiveInfo!.session_notes ?? 'Publication secondaire relative au BP',
        source_url: primitiveInfo!.source_url ?? null,
        pdf_page: null,
        sha256: null,
        table_or_line: 'Source secondaire rapportée — délibération originale à confirmer',
      }
    : null;

  const resolvedVerificationStatus: InstitutionBudgetVerificationStatus =
    pctResult.status === 'UNRECONCILED'
      ? 'UNRECONCILED'
      : isBreakdownPrimaryVerified
      ? 'VERIFIED_AMOUNT'
      : isPrimitiveSecondaryReported
      ? 'SECONDARY_SOURCE'
      : isLfi2026AmountConfirmed
      ? 'PARTIAL_BREAKDOWN'
      : primitiveInfo || institution.breakdown_evidence ? 'TO_VERIFY' : 'NOT_DOCUMENTED';

  return {
    institution_id: instId,
    institution_name: instName,
    institution_type: instType,
    official_section_code: officialSectionCode,
    fiscal_year: fiscalYear,
    nature_credits: localPrimitiveBasis ? 'Budget primitif local déclaré — prévision' : nationalSection?.program_code
      ? `Programme interne ${nationalSection.program_code} de la Présidence, non additif au total de la section 103`
      : "Autorisations d'Engagement & Crédits de Paiement (LFI 2026)",
    budget_basis: effectiveBasis,
    budget_measure: 'CREDITS_VOTES',
    total_amount_fcfa: total,
    functioning_amount_fcfa: fonct ?? null,
    investment_amount_fcfa: inv ?? null,
    total_formatted: formatFCFA(total),
    total_words: formatAmountInWords(total),
    functioning_formatted: fonct != null ? formatFCFA(fonct) : null,
    investment_formatted: inv != null ? formatFCFA(inv) : null,
    functioning_pct: isBreakdownDisplayable ? pctResult.functioningPct : null,
    investment_pct: isBreakdownDisplayable ? pctResult.investmentPct : null,
    has_breakdown: isBreakdownDisplayable && isReconciled,
    delta_fcfa: pctResult.deltaFcfa,
    programs: [],
    actions: [],
    documentary_provenance: resolvedProvenance,
    verification_status: resolvedVerificationStatus,
    reconciliation_status: !isBreakdownDisplayable && pctResult.status === 'RECONCILED' ? 'NO_BREAKDOWN' : pctResult.status,
    blocking_reasons: [
      ...(pctResult.reason ? [pctResult.reason] : []),
      ...(!isBreakdownDisplayable && fonct != null && inv != null ? ['Ventilation fonctionnement/investissement non documentée sur cette assiette officielle.'] : []),
      ...(isBreakdownSecondaryReported ? ['Ventilation issue d’une publication secondaire citée : délibération budgétaire primaire (page PDF et SHA-256) requise avant certification officielle.'] : []),
      ...(nationalSection?.program_code ? [`Le programme ${nationalSection.program_code} est déjà inclus dans les 193 633 705 615 FCFA de la Présidence (section 103). Ne pas additionner.`] : []),
      ...(!isLfi2026AmountConfirmed && !isBreakdownDisplayable ? [documentaryDiscrepancy
        ? `Montant de la fiche non identique aux credits de la section LFI ${officialSectionCode} : ${total} FCFA affiche contre ${amountEvidence!.lfi_amount_fcfa} FCFA section. Portefeuille, C2D et transferts a rapprocher sans remplacement automatique.`
        : 'Aucune ligne officielle LFI 2026 probante pour ce montant et ce perimetre.'] : []),
    ],
    badge_text: nationalSection?.program_code
      ? 'Programme Présidence - non additif'
      : isBreakdownPrimaryVerified
      ? (isLfi2026AmountConfirmed ? 'Montant recoupé LFI 2026' : 'Ventilation officielle vérifiée')
      : isPrimitiveSecondaryReported
      ? 'Montant rapporté — à confirmer'
      : isLfi2026AmountConfirmed
      ? 'Montant recoupe LFI 2026'
      : 'Montant a rapprocher - source insuffisante',
    badge_class: isBreakdownPrimaryVerified
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
      : 'bg-amber-100 text-amber-800 border-amber-300',
    notice_text: nationalSection?.program_code
      ? `Crédits du programme ${nationalSection.program_code}, inclus dans le total de la section 103 Présidence ; ils ne constituent pas une dotation autonome supplémentaire. Ventilation fonctionnement/investissement non documentée.`
      : isPrimitiveSecondaryReported
      ? 'Publication secondaire : montants et ventilation rapportés à confirmer par la délibération originale ou le document budgétaire primaire.'
      : isBreakdownPrimaryVerified && !isLfi2026AmountConfirmed
      ? 'Ventilation fonctionnement/investissement certifiée par une preuve documentaire primaire vérifiée.'
      : !isLfi2026AmountConfirmed
      ? 'Le montant actuellement reference ne peut etre certifie comme credit de section LFI 2026. provenance documentaire insuffisante ; les ecarts C2D ou de portefeuille necessitent un acte de rapprochement.'
      : !isBreakdownDisplayable
      ? 'Ventilation fonctionnement/investissement non documentée sur cette assiette officielle.'
      : !isReconciled ? `${pctResult.reason || 'Ventilation incomplète.'} La concordance du total LFI ne certifie pas les ratios.`
      : null,
    is_cour_supreme: false,
    is_tax_quota_commune: false,
    status: pctResult.status === 'UNRECONCILED' ? 'UNRECONCILED' : 'AVAILABLE'
  };
}

/**
 * Rétro-compatibilité intégrale avec l'ancienne signature assessInstitutionBudget(inst).
 * Délègue de façon transparente à resolveInstitutionFinancialView.
 */
export function assessInstitutionBudget(
  inst: Partial<Institution>
): InstitutionBudgetAssessment {
  const view = resolveInstitutionFinancialView(inst, 2026);

  return {
    status: view.status,
    totalFormatted: view.total_formatted,
    totalWords: view.total_words,
    functioningFormatted: view.functioning_formatted,
    investmentFormatted: view.investment_formatted,
    functioningPct: view.functioning_pct,
    investmentPct: view.investment_pct,
    hasBreakdown: view.has_breakdown,
    badgeText: view.badge_text,
    badgeClass: view.badge_class,
    noticeText: view.notice_text,
    isCourSupreme: view.is_cour_supreme,
    isTaxQuotaCommune: view.is_tax_quota_commune,
    reconciliationStatus: view.reconciliation_status,
    verificationStatus: view.verification_status,
    deltaFcfa: view.delta_fcfa,
  };
}

export interface BudgetPresentationAmount {
  amount_fcfa: number | null;
  label: string;
  precision: 'EXACT' | 'APPROXIMATE' | 'LOWER_BOUND' | 'UPPER_BOUND' | 'UNKNOWN';
  verification: 'VERIFIED_AMOUNT' | 'SECONDARY_SOURCE' | 'TO_VERIFY' | 'UNKNOWN';
  source: DocumentaryProvenance | null;
}

export interface InstitutionBudgetPresentation {
  institution_id: string;
  fiscal_year: number;
  reference: BudgetPresentationAmount;
  supplements: BudgetPresentationAmount[];
  section_code: string | null;
  program_code: string | null;
  aggregation: 'UNIQUE_SECTION' | 'SHARED_SECTION' | 'INCLUDED_IN_PARENT' | 'SEPARATE_SCOPE';
  notice: string;
  functioning_fcfa: number | null;
  investment_fcfa: number | null;
  functioning_pct: number | null;
  investment_pct: number | null;
}

export interface RegulatorDocumentedScope {
  id: string;
  dgbf_ass_code: string | null;
  ass_state_subsidy_2026_fcfa: number | null;
  ass_other_resources_2026_fcfa: number | null;
  ass_total_2026_fcfa: number | null;
  lfi_partial_activity_code: string | null;
  lfi_partial_subsidy_2026_fcfa: number | null;
  notice: string;
  supplements: BudgetPresentationAmount[];
}

export const REGULATOR_2026_DOCUMENTED_SCOPES: Record<string, RegulatorDocumentedScope> = {
  'aai-arcop': {
    id: 'aai-arcop',
    dgbf_ass_code: '32040003',
    ass_state_subsidy_2026_fcfa: 200_000_000,
    ass_other_resources_2026_fcfa: 11_087_646_212,
    ass_total_2026_fcfa: 11_287_646_212,
    lfi_partial_activity_code: null,
    lfi_partial_subsidy_2026_fcfa: null,
    notice: 'Classée parmi les Structures Assimilées (ASS, code DGBF 32040003) dans l’Annexe 6 EPN 2026 (200 000 000 FCFA de subventions État + 11 087 646 212 FCFA d’autres ressources = 11 287 646 212 FCFA). Ces composantes sont conservées hors de la dotation principale sans élargir le produit aux EPN généraux ni assimiler une subvention isolée au budget global.',
    supplements: [
      {
        amount_fcfa: 200_000_000,
        label: 'Subventions État 2026 — Annexe 6 ASS (code DGBF 32040003, composante non globale)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040003 (Subventions État)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
      {
        amount_fcfa: 11_087_646_212,
        label: 'Autres ressources 2026 (ressources propres / excédents) — Annexe 6 ASS (code DGBF 32040003)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040003 (Autres ressources)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
      {
        amount_fcfa: 11_287_646_212,
        label: 'Total prévisionnel Structure Assimilée (ASS) — Annexe 6 DGBF (code 32040003, hors dotation principale)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040003 (Total 2026)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
    ],
  },
  'aai-haca': {
    id: 'aai-haca',
    dgbf_ass_code: '32040004',
    ass_state_subsidy_2026_fcfa: 1_454_056_138,
    ass_other_resources_2026_fcfa: 1_471_878_928,
    ass_total_2026_fcfa: 2_925_935_066,
    lfi_partial_activity_code: null,
    lfi_partial_subsidy_2026_fcfa: null,
    notice: 'Classée parmi les Structures Assimilées (ASS, code DGBF 32040004) dans l’Annexe 6 EPN 2026 (1 454 056 138 FCFA de subventions État + 1 471 878 928 FCFA d’autres ressources = 2 925 935 066 FCFA). Composantes conservées hors de la dotation principale.',
    supplements: [
      {
        amount_fcfa: 1_454_056_138,
        label: 'Subventions État 2026 — Annexe 6 ASS (code DGBF 32040004, composante non globale)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040004 (Subventions État)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
      {
        amount_fcfa: 1_471_878_928,
        label: 'Autres ressources 2026 (ressources propres / excédents) — Annexe 6 ASS (code DGBF 32040004)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040004 (Autres ressources)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
      {
        amount_fcfa: 2_925_935_066,
        label: 'Total prévisionnel Structure Assimilée (ASS) — Annexe 6 DGBF (code 32040004, hors dotation principale)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040004 (Total 2026)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
    ],
  },
  'aai-cndh': {
    id: 'aai-cndh',
    dgbf_ass_code: '32040005',
    ass_state_subsidy_2026_fcfa: 1_927_737_123,
    ass_other_resources_2026_fcfa: 6_000_000,
    ass_total_2026_fcfa: 1_933_737_123,
    lfi_partial_activity_code: null,
    lfi_partial_subsidy_2026_fcfa: null,
    notice: 'Classée parmi les Structures Assimilées (ASS, code DGBF 32040005) dans l’Annexe 6 EPN 2026 (1 927 737 123 FCFA de subventions État + 6 000 000 FCFA d’autres ressources = 1 933 737 123 FCFA). Composantes conservées hors de la dotation principale.',
    supplements: [
      {
        amount_fcfa: 1_927_737_123,
        label: 'Subventions État 2026 — Annexe 6 ASS (code DGBF 32040005, composante non globale)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040005 (Subventions État)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
      {
        amount_fcfa: 6_000_000,
        label: 'Autres ressources 2026 — Annexe 6 ASS (code DGBF 32040005)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040005 (Autres ressources)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
      {
        amount_fcfa: 1_933_737_123,
        label: 'Total prévisionnel Structure Assimilée (ASS) — Annexe 6 DGBF (code 32040005, hors dotation principale)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040005 (Total 2026)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
    ],
  },
  'aai-caidp': {
    id: 'aai-caidp',
    dgbf_ass_code: '32040018',
    ass_state_subsidy_2026_fcfa: 938_179_346,
    ass_other_resources_2026_fcfa: 0,
    ass_total_2026_fcfa: 938_179_346,
    lfi_partial_activity_code: null,
    lfi_partial_subsidy_2026_fcfa: 419_179_346,
    notice: 'Classée parmi les Structures Assimilées (ASS, code DGBF 32040018) dans l’Annexe 6 EPN 2026 (938 179 346 FCFA de subventions État, 0 FCFA d’autres ressources attesté ; dont 419 179 346 FCFA de ligne LFI de subvention de personnel non additionnelle). Composantes conservées hors de la dotation principale.',
    supplements: [
      {
        amount_fcfa: 938_179_346,
        label: 'Subventions État / Total prévisionnel ASS — Annexe 6 DGBF (code 32040018, autres ressources = 0 attesté)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: ANNEXE_6_EPN_2026_DOCUMENT.title,
          document_reference: 'État récapitulatif ASS • Code DGBF 32040018 (Total ASS 2026)',
          source_url: ANNEXE_6_EPN_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: ANNEXE_6_EPN_2026_DOCUMENT.sha256,
        },
      },
      {
        amount_fcfa: 419_179_346,
        label: 'Ligne LFI 2026 de subvention de personnel (composante partielle non additionnelle)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: LFI_2026_DOCUMENT.title,
          document_reference: 'LFI 2026 • Subvention de personnel CAIDP (composante partielle)',
          source_url: LFI_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: LFI_2026_DOCUMENT.sha256,
        },
      },
    ],
  },
  'aai-airp': {
    id: 'aai-airp',
    dgbf_ass_code: null,
    ass_state_subsidy_2026_fcfa: null,
    ass_other_resources_2026_fcfa: null,
    ass_total_2026_fcfa: null,
    lfi_partial_activity_code: '78074000605',
    lfi_partial_subsidy_2026_fcfa: 996_632_520,
    notice: 'Budget global non documenté. Seule une ligne partielle de subvention d’équilibre personnel (996 632 520 FCFA, code activité LFI 78074000605) est identifiée ; une subvention isolée ne représente pas le budget global.',
    supplements: [
      {
        amount_fcfa: 996_632_520,
        label: 'Subvention d’équilibre personnel uniquement — LFI 2026 (activité 78074000605, composante partielle non globale)',
        precision: 'EXACT',
        verification: 'SECONDARY_SOURCE',
        source: {
          document_title: LFI_2026_DOCUMENT.title,
          document_reference: 'LFI 2026 • Code activité 78074000605 (Subventions équilibre personnel seulement)',
          source_url: LFI_2026_DOCUMENT.url,
          pdf_page: null,
          sha256: LFI_2026_DOCUMENT.sha256,
        },
      },
    ],
  },
  'aai-artci': {
    id: 'aai-artci',
    dgbf_ass_code: null,
    ass_state_subsidy_2026_fcfa: null,
    ass_other_resources_2026_fcfa: null,
    ass_total_2026_fcfa: null,
    lfi_partial_activity_code: null,
    lfi_partial_subsidy_2026_fcfa: null,
    notice: 'Budget global non documenté sur source primaire (budget approuvé / rapport financier officiel requis). Une subvention de l’État ou une recette affectée ne représente pas à elle seule le budget global.',
    supplements: [],
  },
  'aai-anare': {
    id: 'aai-anare',
    dgbf_ass_code: null,
    ass_state_subsidy_2026_fcfa: null,
    ass_other_resources_2026_fcfa: null,
    ass_total_2026_fcfa: null,
    lfi_partial_activity_code: null,
    lfi_partial_subsidy_2026_fcfa: null,
    notice: 'Budget global non documenté sur source primaire (budget approuvé / rapport financier officiel requis). Une subvention de l’État ou une recette affectée ne représente pas à elle seule le budget global.',
    supplements: [],
  },
};

export function resolveInstitutionBudgetPresentation(institution: Partial<Institution>): InstitutionBudgetPresentation {
  const id = institution.id || 'unknown-institution';
  const local = ['MAIRIE', 'REGION', 'DISTRICT'].includes(institution.type || '');
  const national = institution.type === 'INSTITUTION' ? NATIONAL_INSTITUTIONS_SECTIONS[id] : undefined;
  const ministry = institution.type === 'MINISTERE' ? legalCP.rows.find(row => row.portfolio_id === id) : undefined;
  const candidate = local ? (institution.primitive_budget ?? OFFICIAL_PRIMITIVE_BUDGETS[id]) : undefined;
  const primitive = candidate && (candidate.fiscal_year ?? 2026) === 2026 ? candidate : undefined;
  const regulatorScope = institution.type === 'AUTORITE_REGULATION' ? REGULATOR_2026_DOCUMENTED_SCOPES[id] : undefined;
  const result: InstitutionBudgetPresentation = {
    institution_id: id, fiscal_year: 2026,
    reference: {
      amount_fcfa: null,
      label: local ? 'Budget primitif propre (BP)' : institution.type === 'AUTORITE_REGULATION' ? 'Budget global de l’autorité' : 'Crédits de paiement (CP) votés — LFI',
      precision: 'UNKNOWN', verification: 'UNKNOWN', source: null,
    },
    supplements: [], section_code: null, program_code: null, aggregation: 'SEPARATE_SCOPE',
    notice: local
      ? 'Budget primitif propre non documenté. Les concours de l’État ne le remplacent pas. BP, BS et BM décrivent des prévisions ; le compte administratif (CA) décrit l’exécution.'
      : regulatorScope
        ? regulatorScope.notice
        : institution.type === 'AUTORITE_REGULATION'
          ? 'Budget global non documenté. Une subvention de l’État ou une recette affectée ne représente pas à elle seule le budget global.'
          : 'Montant de référence non documenté pour ce périmètre. Inconnu ne signifie pas zéro.',
    functioning_fcfa: null, investment_fcfa: null, functioning_pct: null, investment_pct: null,
  };
  if (regulatorScope && regulatorScope.supplements.length > 0) {
    result.supplements.push(...regulatorScope.supplements);
  }
  if (ministry || national) {
    const section = ministry?.section_code ?? national!.section_code;
    const program = national?.program_code ?? null;
    result.section_code = section;
    result.program_code = program;
    result.aggregation = program ? 'INCLUDED_IN_PARENT' : ministry?.section_shared_with_other_portfolio ? 'SHARED_SECTION' : 'UNIQUE_SECTION';
    result.reference = {
      amount_fcfa: ministry?.voted_section_cp_2026_fcfa ?? national!.lfi_amount_fcfa,
      label: program ? `CP votés — programme ${program}, inclus dans la section ${section}` : `CP votés — section ${section} (LFI initiale)`,
      precision: 'EXACT', verification: 'VERIFIED_AMOUNT',
      source: {
        document_title: LFI_2026_DOCUMENT.title, document_reference: ministry ? `Article ${ministry.legal_article}, section ${section}` : `Section ${section}${program ? `, programme ${program}` : ''}`,
        source_url: LFI_2026_DOCUMENT.url, pdf_page: ministry?.official_lfi_pdf_page ?? national!.pdf_page,
        sha256: LFI_2026_DOCUMENT.sha256,
      },
    };
    result.notice = program
      ? `Programme interne de la Présidence, déjà inclus dans les 193 633 705 615 FCFA de la section 103. Ne pas additionner au total de la section.`
      : ministry
        ? `${ministry.section_shared_with_other_portfolio ? 'Section partagée : compter une seule fois. ' : ''}Le vote porte sur la section historique de la LFI ; l’affectation au portefeuille remanié n’est pas établie. L’Annexe 4 décrit les programmes et actions, sans prouver un transfert de crédits.`
        : 'Crédits votés pour la section, distincts des dépenses exécutées. La concordance du total ne certifie pas une ventilation fonctionnement/investissement.';
  }
  if (primitive) {
    const arithmetic = calculateSafePercentages(primitive.functioning_voted_fcfa, primitive.investment_voted_fcfa, primitive.total_voted_fcfa);
    const isBalancedExact = primitive.precision === 'EXACT' && Boolean(primitive.source_url) && arithmetic.isBalanced && arithmetic.status === 'RECONCILED';
    const verification = primitiveVerification(primitive, id, 2026);
    const isPrimaryDoc = verification === 'VERIFIED_AMOUNT';
    result.reference = {
      amount_fcfa: primitive.total_voted_fcfa,
      label: isPrimaryDoc ? 'Budget primitif propre (BP) — délibération officielle' : verification === 'SECONDARY_SOURCE' ? 'Budget primitif propre (BP) rapporté' : 'Budget primitif déclaré — preuve à vérifier',
      precision: primitive.precision ?? 'UNKNOWN',
      verification,
      source: {
        document_title: primitive.source,
        document_reference: primitive.document_reference ?? primitive.session_notes ?? 'Publication relative au BP 2026',
        source_url: primitive.source_url ?? null,
        pdf_page: isPrimaryDoc ? primitive.pdf_page! : null,
        sha256: isPrimaryDoc ? primitive.sha256! : null,
      },
    };
    result.notice = isPrimaryDoc
      ? 'Budget primitif voté documenté par une source primaire vérifiée. BP/BS/BM : prévisions ; CA : exécution.'
      : verification === 'TO_VERIFY' ? 'Preuve déclarée non auditée : le document et la ligne budgétaire doivent être contrôlés avant certification. BP : prévision ; CA : exécution.'
      : 'Publication secondaire : délibération originale à obtenir avant certification. La ventilation des recettes propres et concours de l’État ne se déduit pas du total. BP/BS/BM : prévisions ; CA : exécution.';
    if (isBalancedExact && verification !== 'TO_VERIFY') {
      result.functioning_fcfa = primitive.functioning_voted_fcfa;
      result.investment_fcfa = primitive.investment_voted_fcfa;
      result.functioning_pct = arithmetic.functioningPct;
      result.investment_pct = arithmetic.investmentPct;
    } else if (arithmetic.status === 'PARTIAL_BREAKDOWN' || arithmetic.status === 'NO_BREAKDOWN') {
      result.functioning_fcfa = primitive.functioning_voted_fcfa;
      result.investment_fcfa = primitive.investment_voted_fcfa;
      result.functioning_pct = null;
      result.investment_pct = null;
    } else {
      result.functioning_fcfa = null;
      result.investment_fcfa = null;
      result.functioning_pct = null;
      result.investment_pct = null;
    }
  }
  const direct = national ? NATIONAL_DIRECT_ALLOCATIONS_2026[id] : undefined;
  if (direct) {
    result.supplements.push({
      amount_fcfa: direct.amount_fcfa, label: 'Dotation gérée directement — Annexe 7 (périmètre distinct)', precision: 'EXACT', verification: 'VERIFIED_AMOUNT',
      source: {
        document_title: 'Annexe 7 — Dotations des institutions 2026', document_reference: `Chapitre / destination ${direct.chapter}`,
        source_url: 'https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-7-Dotations-des-Institutions-2026.pdf', pdf_page: direct.pdf_page,
        sha256: '567810702fb7ed7cb83945a0af18ef23ee52bf617a305bac36243c08de4a1842',
      },
    });
    result.notice += ' Ne pas additionner la dotation directe Annexe 7 au montant LFI : les périmètres diffèrent.';
    if (id === 'inst-cesec') result.notice += ' Écart arithmétique : 107 562 492 FCFA, égal à la ligne « Abonnements ». L’explication administrative précise reste non établie ; cette égalité ne démontre aucune irrégularité.';
  }
  const recorded = institution.total_budget_fcfa;
  if (recorded != null && Number.isSafeInteger(recorded) && recorded >= 0 && (local || institution.type === 'AUTORITE_REGULATION' || recorded !== result.reference.amount_fcfa)) {
    const grantEvidence = institution.state_grant_evidence;
    if (local && isValidStateGrantEvidence(grantEvidence, id, recorded)) {
      result.supplements.push({
        amount_fcfa: recorded, precision: 'EXACT', verification: 'VERIFIED_AMOUNT',
        source: {
          document_title: LFI_2026_DOCUMENT.title,
          document_reference: 'LFI 2026 • Action 78016001400 • Crédits de paiement votés',
          source_url: LFI_2026_DOCUMENT.url, pdf_page: 207, sha256: LFI_2026_DOCUMENT.sha256,
          table_or_line: 'Fonctionnement des services de la commune d’Attécoubé — transfert',
        },
        label: 'Crédits de l’État pour le fonctionnement des services — distincts du budget primitif',
      });
    } else if (recorded !== result.reference.amount_fcfa) {
      result.supplements.push({
        amount_fcfa: recorded,
        precision: 'UNKNOWN',
        verification: 'TO_VERIFY',
        source: null,
        label: 'Montant historique enregistré — nature et source à confirmer',
      });
    }
  }
  if (id === 'inst-cour-supreme') result.notice = 'Aucune section LFI autonome pour la Cour Suprême. Les sections 114 (Cassation), 118 (Conseil d’État) et 115 (Cour des comptes) sont distinctes.';
  return result;
}

export function exportInstitutionBudget(institution: Partial<Institution>, format: 'CSV' | 'JSON'): string {
  const view = resolveInstitutionBudgetPresentation(institution);
  if (format === 'JSON') return JSON.stringify({ schema_version: 1, name: institution.name, ...view }, null, 2);
  const cell = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
  };
  const headers = ['identifiant', 'nom', 'exercice', 'role', 'nature', 'montant_fcfa', 'precision', 'verification', 'section', 'programme', 'aggregation', 'source_url', 'page_pdf', 'document', 'sha256', 'limites'];
  const rows = [view.reference, ...view.supplements].map((amount, index) => [
    view.institution_id, institution.name, view.fiscal_year, index === 0 ? 'REFERENCE' : 'COMPLEMENT_NON_ADDITIF',
    amount.label, amount.amount_fcfa, amount.precision, amount.verification, view.section_code, view.program_code,
    index === 0 ? view.aggregation : 'SEPARATE_SCOPE', amount.source?.source_url, amount.source?.pdf_page, amount.source?.document_title, amount.source?.sha256, view.notice,
  ]);
  return [headers, ...rows].map(row => row.map(cell).join(';')).join('\n');
}
