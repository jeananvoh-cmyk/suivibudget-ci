import { Institution } from '../types';
import { formatFCFA, formatAmountInWords } from './formatters';

export type InstitutionBudgetStatus = 
  | 'AVAILABLE' 
  | 'NOT_DOCUMENTED' 
  | 'NOT_PUBLISHED' 
  | 'TAX_AUTONOMY';

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
}

/**
 * Deterministically computes budget percentages between functioning and investment.
 * Returns null for both if total is null, zero, negative, or if either part is null.
 * Strictly respects null !== 0.
 */
export function calculateSafePercentages(
  functioning: number | null | undefined,
  investment: number | null | undefined,
  total: number | null | undefined
): { functioningPct: number | null; investmentPct: number | null } {
  if (total == null || total <= 0 || functioning == null || investment == null) {
    return { functioningPct: null, investmentPct: null };
  }

  // Monetary reconciliation is exact: never turn a missing or inconsistent
  // budget breakdown into an apparently complete 100% allocation.
  if (![total, functioning, investment].every(Number.isSafeInteger) ||
      functioning < 0 || investment < 0 ||
      BigInt(functioning) + BigInt(investment) !== BigInt(total)) {
    return { functioningPct: null, investmentPct: null };
  }

  if (investment === 0 && functioning > 0) {
    return { functioningPct: 100, investmentPct: 0 };
  }

  if (functioning === 0 && investment > 0) {
    return { functioningPct: 0, investmentPct: 100 };
  }

  const fPct = Math.round((functioning / total) * 100);
  const iPct = 100 - fPct;

  return { functioningPct: fPct, investmentPct: iPct };
}

/**
 * Evaluates an institution's budget status, formatting, ratios and citizen explanatory notice.
 * Strictly adheres to SuiviBudget's core civic rule:
 * - null !== 0
 * - Never infer a 0 FCFA or 0% budget from missing documentation.
 * - Cour Suprême is handled as an unbundled constitutional jurisdiction under the 2016 Constitution.
 * - Grand Abidjan tax quota communes are handled as autonomous local revenue entities.
 */
export function assessInstitutionBudget(
  inst: Partial<Institution>
): InstitutionBudgetAssessment {
  const isCourSupreme = inst.id === 'inst-cour-supreme' || 
    (inst.name != null && inst.name.toLowerCase().includes('cour suprême') && !inst.name.toLowerCase().includes('cassation') && !inst.name.toLowerCase().includes('comptes'));

  // 1. Cour Suprême : Juridiction historique scindée sous la Constitution de 2016
  if (isCourSupreme) {
    return {
      status: 'NOT_DOCUMENTED',
      totalFormatted: 'Non individualisé (LFI 2026)',
      totalWords: null,
      functioningFormatted: null,
      investmentFormatted: null,
      functioningPct: null,
      investmentPct: null,
      hasBreakdown: false,
      badgeText: 'Dotation non individualisée (LFI 2026)',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      noticeText: 'Conformément à la Constitution de 2016, les compétences juridictionnelles sont réparties entre la Cour de Cassation (Section 114), le Conseil d\'État (Section 118) et la Cour des Comptes (Section 115), chacune dotée de sa propre section budgétaire dans la Loi de Finances.',
      isCourSupreme: true,
      isTaxQuotaCommune: false,
    };
  }

  // 2. Communes à quote-part fiscale autonome sans budget primitif publié
  const isTaxQuota = Boolean(inst.is_tax_quota_commune);
  const isUnpublishedOrZero = inst.budget_not_published || inst.total_budget_fcfa == null || inst.total_budget_fcfa === 0;

  if (isTaxQuota && isUnpublishedOrZero && inst.type === 'MAIRIE') {
    return {
      status: 'TAX_AUTONOMY',
      totalFormatted: 'Budget municipal propre',
      totalWords: null,
      functioningFormatted: null,
      investmentFormatted: null,
      functioningPct: null,
      investmentPct: null,
      hasBreakdown: false,
      badgeText: 'Ressources Propres & Impôts Locaux',
      badgeClass: 'bg-blue-100 text-brand-blue border-blue-200',
      noticeText: 'Commune du Grand Abidjan fonctionnant sous le régime de l\'autonomie financière et fiscale (quotes-parts DGI, patentes, taxes municipales). Délibération du Budget Primitif 2026 en attente de centralisation.',
      isCourSupreme: false,
      isTaxQuotaCommune: true,
    };
  }

  // 3. Budget non publié ou non renseigné (null)
  if (inst.budget_not_published || inst.total_budget_fcfa == null) {
    return {
      status: 'NOT_PUBLISHED',
      totalFormatted: 'Montant à confirmer',
      totalWords: null,
      functioningFormatted: null,
      investmentFormatted: null,
      functioningPct: null,
      investmentPct: null,
      hasBreakdown: false,
      badgeText: 'Budget non publié',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      noticeText: 'La dotation officielle ou le budget primitif de cette entité n\'est pas encore individualisé ou publié dans les documents officiels disponibles.',
      isCourSupreme: false,
      isTaxQuotaCommune: false,
    };
  }

  // 4. Dotation égale à 0 FCFA légitimement documentée
  if (inst.total_budget_fcfa === 0) {
    return {
      status: 'AVAILABLE',
      totalFormatted: '0 FCFA',
      totalWords: '0 FCFA',
      functioningFormatted: inst.budget_functioning_fcfa != null ? formatFCFA(inst.budget_functioning_fcfa) : '0 FCFA',
      investmentFormatted: inst.budget_investment_fcfa != null ? formatFCFA(inst.budget_investment_fcfa) : '0 FCFA',
      functioningPct: null,
      investmentPct: null,
      hasBreakdown: false,
      badgeText: 'Dotation 0 FCFA',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      noticeText: 'Aucun crédit direct alloué au titre de cet exercice.',
      isCourSupreme: false,
      isTaxQuotaCommune: false,
    };
  }

  // 5. Budget officiel disponible et strictement supérieur à zéro
  const total = inst.total_budget_fcfa;
  const fonct = inst.budget_functioning_fcfa;
  const inv = inst.budget_investment_fcfa;
  const hasBreakdown = fonct != null && inv != null;
  const { functioningPct, investmentPct } = calculateSafePercentages(fonct, inv, total);

  return {
    status: 'AVAILABLE',
    totalFormatted: formatFCFA(total),
    totalWords: formatAmountInWords(total),
    functioningFormatted: fonct != null ? formatFCFA(fonct) : null,
    investmentFormatted: inv != null ? formatFCFA(inv) : null,
    functioningPct,
    investmentPct,
    hasBreakdown,
    badgeText: 'Dotation Officielle (LFI 2026)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    noticeText: null,
    isCourSupreme: false,
    isTaxQuotaCommune: false,
  };
}
