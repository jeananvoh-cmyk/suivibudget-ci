import { Institution } from '../types';
import { formatFCFA, formatAmountInWords } from './formatters';

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
    const vStatus: InstitutionBudgetVerificationStatus = isExplicitlyUnpublished ? 'NOT_PUBLISHED' : 'NOT_DOCUMENTED';
    const sStatus: InstitutionBudgetStatus = isExplicitlyUnpublished ? 'NOT_PUBLISHED' : 'NOT_DOCUMENTED';
    const totalFormatted = isExplicitlyUnpublished ? 'Montant à confirmer' : 'Non documenté publiquement';
    const badgeText = isExplicitlyUnpublished ? 'Budget non publié' : 'Non documenté publiquement';

    return {
      institution_id: instId,
      institution_name: instName,
      institution_type: instType,
      official_section_code: null,
      fiscal_year: fiscalYear,
      nature_credits: null,
      budget_basis: requestedBasis || (instType === 'MAIRIE' || instType === 'REGION' ? 'PRIMITIVE' : 'LFI'),
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
      documentary_provenance: null,
      verification_status: vStatus,
      reconciliation_status: 'NO_BREAKDOWN',
      blocking_reasons: [
        isExplicitlyUnpublished
          ? "Document officiel d'approbation budgétaire ou annexe de la Loi de Finances non encore publié ou en cours d'obtention."
          : "Aucune documentation budgétaire publique disponible ou document non encore transmis à SuiviBudget."
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
      budget_basis: requestedBasis || 'LFI', budget_measure: 'CREDITS_VOTES',
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
      ? `Loi n° 2025-987 • Section ${officialSectionCode}` 
      : LFI_2026_DOCUMENT.reference,
    source_url: LFI_2026_DOCUMENT.url,
    pdf_page: pdfPage,
    doc_page: docPage,
    sha256: LFI_2026_DOCUMENT.sha256,
    table_or_line: "Tableau des crédits par section et par programme"
  };

  // Verification documentaire INDEPENDANTE de l'egalite arithmetique.
  // Aucune preuve PDF = jamais VERIFIED_AMOUNT, meme si les composantes s'additionnent.
  const amountEvidence = nationalSection ?? ministrySection;
  const isLfi2026AmountConfirmed = fiscalYear === 2026 && requestedBasis !== 'RECTIFICATIF' &&
    requestedBasis !== 'ADMINISTRATIVE_ACCOUNT' &&
    amountEvidence != null && amountEvidence.lfi_amount_fcfa === total;
  const documentaryDiscrepancy = amountEvidence != null && !isLfi2026AmountConfirmed;
  const isReconciled = pctResult.status === 'RECONCILED';
  const hasBreakdown = fonct != null && inv != null;

  return {
    institution_id: instId,
    institution_name: instName,
    institution_type: instType,
    official_section_code: officialSectionCode,
    fiscal_year: fiscalYear,
    nature_credits: "Autorisations d'Engagement & Crédits de Paiement (LFI 2026)",
    budget_basis: requestedBasis || (instType === 'MAIRIE' || instType === 'REGION' ? 'PRIMITIVE' : 'LFI'),
    budget_measure: 'CREDITS_VOTES',
    total_amount_fcfa: total,
    functioning_amount_fcfa: fonct ?? null,
    investment_amount_fcfa: inv ?? null,
    total_formatted: formatFCFA(total),
    total_words: formatAmountInWords(total),
    functioning_formatted: fonct != null ? formatFCFA(fonct) : null,
    investment_formatted: inv != null ? formatFCFA(inv) : null,
    functioning_pct: pctResult.functioningPct,
    investment_pct: pctResult.investmentPct,
    has_breakdown: hasBreakdown && isReconciled,
    delta_fcfa: pctResult.deltaFcfa,
    programs: [],
    actions: [],
    documentary_provenance: provenance,
    verification_status: pctResult.status === 'UNRECONCILED' ? 'UNRECONCILED'
      : !isLfi2026AmountConfirmed ? 'NOT_DOCUMENTED'
      : isReconciled ? 'VERIFIED_AMOUNT' : 'PARTIAL_BREAKDOWN',
    reconciliation_status: pctResult.status,
    blocking_reasons: [
      ...(pctResult.reason ? [pctResult.reason] : []),
      ...(!isLfi2026AmountConfirmed ? [documentaryDiscrepancy
        ? `Montant de la fiche non identique aux credits de la section LFI ${officialSectionCode} : ${total} FCFA affiche contre ${amountEvidence!.lfi_amount_fcfa} FCFA section. Portefeuille, C2D et transferts a rapprocher sans remplacement automatique.`
        : 'Aucune ligne officielle LFI 2026 probante pour ce montant et ce perimetre.'] : []),
    ],
    badge_text: isLfi2026AmountConfirmed ? 'Montant recoupe LFI 2026' : 'Montant a rapprocher - source insuffisante',
    badge_class: isLfi2026AmountConfirmed && isReconciled 
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
      : 'bg-amber-100 text-amber-800 border-amber-300',
    notice_text: !isLfi2026AmountConfirmed
      ? 'Le montant actuellement reference ne peut etre certifie comme credit de section LFI 2026. Voir les reserves documentaires ; les ecarts C2D ou de portefeuille necessitent un acte de rapprochement.'
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
  const view = resolveInstitutionFinancialView(inst, 2026, 'LFI');

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
