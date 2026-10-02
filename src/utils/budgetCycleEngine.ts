// =========================================================================
// MOTEUR DU CYCLE BUDGÉTAIRE COMPLET — SUIVIBUDGET CÔTE D'IVOIRE
// Consolidation générique : BP → Modifications (BS/BM) → Crédits Définitifs → CA
// Respect absolu des principes civiques : Traçabilité, NULL != 0, 0 réel préservé
// =========================================================================

import type { LocalBudget, BudgetEventType, AmountPrecision } from '../types/localBudget';
import type { AdministrativeAccount, ExecutionRateResult } from '../types/administrativeAccount';
import type { 
  BudgetCycleConsolidation, 
  BudgetAmendment, 
  BudgetFinancialValue,
  FinancialValueSource
} from '../types/budgetCycle';
import { calculateExecutionRate } from './budgetCalculations';
import { formatFCFA } from './formatters';

/**
 * Types considérés comme actes budgétaires initiaux (BP)
 */
export const INITIAL_BUDGET_TYPES: BudgetEventType[] = [
  'PRIMITIF_ADOPTE',
  'PRIMITIF_APRES_TUTELLE',
  'AUTORISATION_EXECUTION'
];

/**
 * Types considérés comme modifications budgétaires en cours d'exercice
 */
export const AMENDMENT_BUDGET_TYPES: BudgetEventType[] = [
  'BUDGET_SUPPLEMENTAIRE',
  'MODIFICATIF_1',
  'MODIFICATIF_2',
  'AUTRE_MODIFICATIF',
  'DECISION_MODIFICATIVE',
  'VIREMENT_CREDITS'
];

/**
 * Vérifie si un type d'événement correspond à une modification budgétaire
 */
export function isBudgetAmendment(budgetType: BudgetEventType): boolean {
  return AMENDMENT_BUDGET_TYPES.includes(budgetType);
}

/**
 * Vérifie si un type d'événement correspond à un budget initial (primitif)
 */
export function isInitialBudget(budgetType: BudgetEventType): boolean {
  return INITIAL_BUDGET_TYPES.includes(budgetType);
}

/**
 * Libellé lisible pour un type d'acte budgétaire
 */
export function formatBudgetTypeLabel(type: BudgetEventType): string {
  switch (type) {
    case 'PRIMITIF_ADOPTE': return 'Budget Primitif Adopté (Conseil)';
    case 'PRIMITIF_APRES_TUTELLE': return 'Budget Primitif après Tutelle (DGDDL)';
    case 'AUTORISATION_EXECUTION': return 'Budget Exécutoire Autorisé';
    case 'BUDGET_SUPPLEMENTAIRE': return 'Budget Supplémentaire (BS)';
    case 'MODIFICATIF_1': return 'Budget Modificatif n°1 (BM1)';
    case 'MODIFICATIF_2': return 'Budget Modificatif n°2 (BM2)';
    case 'AUTRE_MODIFICATIF': return 'Modification Budgétaire';
    case 'DECISION_MODIFICATIVE': return 'Décision Modificative';
    case 'VIREMENT_CREDITS': return 'Virement de Crédits';
    case 'EXECUTION_TRIMESTRIELLE': return 'Point d’Exécution Trimestriel';
    case 'COMPTE_ADMINISTRATIF': return 'Compte Administratif (CA)';
    default: return type;
  }
}

/**
 * Consolide l'ensemble du cycle budgétaire pour une collectivité et un exercice donné
 * 
 * @param institutionId Identifiant canonique de la collectivité (ex: "inst-com-tiassale")
 * @param fiscalYear Exercice budgétaire (ex: 2024, 2025, 2026)
 * @param budgets Liste de tous les budgets référencés (BP + modifications)
 * @param accounts Liste de tous les comptes administratifs
 */
export function consolidateBudgetCycle(
  institutionId: string,
  fiscalYear: number,
  budgets: LocalBudget[],
  accounts: AdministrativeAccount[] = []
): BudgetCycleConsolidation {
  // 1. Filtrer les budgets pour cette collectivité et cet exercice
  const matchingBudgets = budgets.filter(
    b => b.institution_id === institutionId && b.fiscal_year === fiscalYear
  );

  // Institution name fallback
  const institutionName = matchingBudgets[0]?.institution_name || 
    accounts.find(a => a.institution_id === institutionId)?.institution_name || 
    institutionId;

  // 2. Extraire le Budget Primitif (Initial)
  const initialBudgetDoc = matchingBudgets
    .filter(b => isInitialBudget(b.budget_type))
    .sort((a, b) => {
      // Priorité à la version active ou à la version la plus haute
      if (a.is_current_version && !b.is_current_version) return -1;
      if (!a.is_current_version && b.is_current_version) return 1;
      return (b.version_number || 0) - (a.version_number || 0);
    })[0] || null;

  // Construire les valeurs financières du budget initial
  const initialSources: FinancialValueSource[] = initialBudgetDoc ? [{
    document_name: initialBudgetDoc.document_name || formatBudgetTypeLabel(initialBudgetDoc.budget_type),
    document_type: initialBudgetDoc.budget_type,
    fiscal_year: initialBudgetDoc.fiscal_year,
    date: initialBudgetDoc.publication_date || initialBudgetDoc.adoption_date,
    url: initialBudgetDoc.document_url || initialBudgetDoc.primary_source_url
  }] : [];

  const initialBudget = initialBudgetDoc ? {
    total: {
      amount: initialBudgetDoc.total_amount,
      precision: initialBudgetDoc.total_amount === null ? 'UNKNOWN' : initialBudgetDoc.amount_precision,
      origin: 'SOURCE_VALUE' as const,
      sources: initialSources,
      notes: initialBudgetDoc.notes
    },
    operating: {
      amount: initialBudgetDoc.operating_amount,
      precision: initialBudgetDoc.operating_amount === null ? 'UNKNOWN' : initialBudgetDoc.amount_precision,
      origin: 'SOURCE_VALUE' as const,
      sources: initialSources
    },
    investment: {
      amount: initialBudgetDoc.investment_amount,
      precision: initialBudgetDoc.investment_amount === null ? 'UNKNOWN' : initialBudgetDoc.amount_precision,
      origin: 'SOURCE_VALUE' as const,
      sources: initialSources
    },
    document: initialBudgetDoc,
    adoption_date: initialBudgetDoc.adoption_date,
    tutelle_approval_date: initialBudgetDoc.tutelle_approval_date
  } : null;

  // 3. Extraire les modifications budgétaires documentées (BS, BM1, BM2, virements)
  const amendmentDocs = matchingBudgets
    .filter(b => isBudgetAmendment(b.budget_type))
    .sort((a, b) => (a.version_number || 0) - (b.version_number || 0));

  const amendments: BudgetAmendment[] = amendmentDocs.map(doc => {
    const isNegative = (doc.total_amount !== null && doc.total_amount < 0) ||
      (doc.notes?.toLowerCase().includes('réduction') || doc.notes?.toLowerCase().includes('diminution'));

    return {
      id: doc.id,
      institution_id: doc.institution_id,
      fiscal_year: doc.fiscal_year,
      budget_type: doc.budget_type,
      version_number: doc.version_number,
      label: formatBudgetTypeLabel(doc.budget_type),
      total_delta: doc.total_amount,
      operating_delta: doc.operating_amount,
      investment_delta: doc.investment_amount,
      precision: doc.total_amount === null ? 'UNKNOWN' : doc.amount_precision,
      source: {
        name: doc.document_name || doc.primary_source_label || formatBudgetTypeLabel(doc.budget_type),
        reference: doc.import_provenance?.source?.reference || doc.document_name || 'Acte officiel',
        date: doc.publication_date || doc.adoption_date,
        url: doc.document_url || doc.primary_source_url
      },
      adoption_date: doc.adoption_date,
      tutelle_approval_date: doc.tutelle_approval_date,
      notes: doc.notes,
      is_negative: isNegative
    };
  });

  // Calcul du net des modifications
  let netTotalDelta: number | null = amendments.length > 0 ? 0 : null;
  let netOperatingDelta: number | null = amendments.length > 0 ? 0 : null;
  let netInvestmentDelta: number | null = amendments.length > 0 ? 0 : null;
  let deltaPrecision: AmountPrecision = 'EXACT';

  for (const a of amendments) {
    if (a.total_delta !== null && netTotalDelta !== null) {
      netTotalDelta += a.total_delta;
    } else if (a.total_delta === null) {
      netTotalDelta = null; // UNKNOWN != 0
    }

    if (a.operating_delta !== null && netOperatingDelta !== null) {
      netOperatingDelta += a.operating_delta;
    } else if (a.operating_delta === null) {
      netOperatingDelta = null;
    }

    if (a.investment_delta !== null && netInvestmentDelta !== null) {
      netInvestmentDelta += a.investment_delta;
    } else if (a.investment_delta === null) {
      netInvestmentDelta = null;
    }

    if (a.precision !== 'EXACT') {
      deltaPrecision = a.precision;
    }
  }

  const amendmentsStatus: 'DOCUMENTED' | 'NO_AMENDMENTS_FOUND_PUBLICLY' = 
    amendments.length > 0 ? 'DOCUMENTED' : 'NO_AMENDMENTS_FOUND_PUBLICLY';

  const amendmentsExplanation = amendments.length > 0
    ? `${amendments.length} modification(s) budgétaire(s) officielle(s) documentée(s) pour un solde net de ${netTotalDelta !== null ? formatFCFA(netTotalDelta) : 'montant à corroborer'}.`
    : 'Aucune modification budgétaire documentée dans les sources actuellement disponibles.';

  // 4. Calcul des Crédits Définitifs (Budget Révisé)
  // RÈGLE : Crédits définitifs = Budget Initial + Somme des Modifications
  let finalCredits: BudgetCycleConsolidation['final_credits'] = null;

  if (initialBudget) {
    const hasAmendments = amendments.length > 0;
    const finalSources: FinancialValueSource[] = [
      ...initialSources,
      ...amendments.map(a => ({
        document_name: a.source.name,
        document_type: a.budget_type,
        fiscal_year: a.fiscal_year,
        date: a.source.date,
        reference: a.source.reference,
        url: a.source.url
      }))
    ];

    // Total final
    let finalTotalAmount: number | null = null;
    let finalTotalPrecision: AmountPrecision = initialBudget.total.precision;
    let finalTotalFormula: string | undefined;

    if (initialBudget.total.amount !== null && (!hasAmendments || netTotalDelta !== null)) {
      finalTotalAmount = initialBudget.total.amount + (netTotalDelta || 0);
      if (hasAmendments && netTotalDelta !== 0) {
        finalTotalFormula = `${formatFCFA(initialBudget.total.amount)} (BP initial) ${netTotalDelta! >= 0 ? '+' : '-'} ${formatFCFA(Math.abs(netTotalDelta!))} (Modifications)`;
      }
    }

    // Fonctionnement final
    let finalOperatingAmount: number | null = null;
    let finalOperatingPrecision: AmountPrecision = initialBudget.operating.precision;
    let finalOperatingFormula: string | undefined;

    if (initialBudget.operating.amount !== null && (!hasAmendments || netOperatingDelta !== null)) {
      finalOperatingAmount = initialBudget.operating.amount + (netOperatingDelta || 0);
      if (hasAmendments && netOperatingDelta !== 0) {
        finalOperatingFormula = `${formatFCFA(initialBudget.operating.amount)} (BP initial) ${netOperatingDelta! >= 0 ? '+' : '-'} ${formatFCFA(Math.abs(netOperatingDelta!))} (Modifications)`;
      }
    }

    // Investissement final
    let finalInvestmentAmount: number | null = null;
    let finalInvestmentPrecision: AmountPrecision = initialBudget.investment.precision;
    let finalInvestmentFormula: string | undefined;

    if (initialBudget.investment.amount !== null && (!hasAmendments || netInvestmentDelta !== null)) {
      finalInvestmentAmount = initialBudget.investment.amount + (netInvestmentDelta || 0);
      if (hasAmendments && netInvestmentDelta !== 0) {
        finalInvestmentFormula = `${formatFCFA(initialBudget.investment.amount)} (BP initial) ${netInvestmentDelta! >= 0 ? '+' : '-'} ${formatFCFA(Math.abs(netInvestmentDelta!))} (Modifications)`;
      }
    }

    finalCredits = {
      total: {
        amount: finalTotalAmount,
        precision: finalTotalPrecision,
        origin: hasAmendments ? 'DERIVED_VALUE' : 'SOURCE_VALUE',
        formula: finalTotalFormula,
        sources: finalSources
      },
      operating: {
        amount: finalOperatingAmount,
        precision: finalOperatingPrecision,
        origin: hasAmendments ? 'DERIVED_VALUE' : 'SOURCE_VALUE',
        formula: finalOperatingFormula,
        sources: finalSources
      },
      investment: {
        amount: finalInvestmentAmount,
        precision: finalInvestmentPrecision,
        origin: hasAmendments ? 'DERIVED_VALUE' : 'SOURCE_VALUE',
        formula: finalInvestmentFormula,
        sources: finalSources
      },
      is_derived: hasAmendments
    };
  }

  // 5. Compte Administratif (Exécution Financière)
  const caDoc = accounts.find(
    a => a.institution_id === institutionId && a.fiscal_year === fiscalYear
  ) || null;

  // 6. Comparaisons d'exécution et calculs de taux
  let executionComparison: BudgetCycleConsolidation['execution_comparison'] = null;

  if (caDoc) {
    // Taux vs Crédits Définitifs
    let vsFinalCredits: { total: ExecutionRateResult; operating: ExecutionRateResult; investment: ExecutionRateResult } | null = null;
    if (finalCredits) {
      vsFinalCredits = {
        total: calculateExecutionRate(
          caDoc.total_realized, 
          finalCredits.total.amount, 
          caDoc.total_realized === null ? 'UNKNOWN' : 'EXACT',
          finalCredits.total.precision
        ),
        operating: calculateExecutionRate(
          caDoc.operating_realized, 
          finalCredits.operating.amount, 
          caDoc.operating_realized === null ? 'UNKNOWN' : 'EXACT',
          finalCredits.operating.precision
        ),
        investment: calculateExecutionRate(
          caDoc.investment_realized, 
          finalCredits.investment.amount, 
          caDoc.investment_realized === null ? 'UNKNOWN' : 'EXACT',
          finalCredits.investment.precision
        )
      };
    }

    // Taux vs Budget Primitif Initial (taux d'orientation initial)
    let vsInitialBudget: { total: ExecutionRateResult; operating: ExecutionRateResult; investment: ExecutionRateResult } | null = null;
    if (initialBudget) {
      vsInitialBudget = {
        total: calculateExecutionRate(
          caDoc.total_realized, 
          initialBudget.total.amount, 
          caDoc.total_realized === null ? 'UNKNOWN' : 'EXACT',
          initialBudget.total.precision
        ),
        operating: calculateExecutionRate(
          caDoc.operating_realized, 
          initialBudget.operating.amount, 
          caDoc.operating_realized === null ? 'UNKNOWN' : 'EXACT',
          initialBudget.operating.precision
        ),
        investment: calculateExecutionRate(
          caDoc.investment_realized, 
          initialBudget.investment.amount, 
          caDoc.investment_realized === null ? 'UNKNOWN' : 'EXACT',
          initialBudget.investment.precision
        )
      };
    }

    executionComparison = {
      vs_final_credits: vsFinalCredits,
      vs_initial_budget: vsInitialBudget
    };
  }

  // 7. Alertes Civiques et Notices Documentaires
  const hasOperatingOverrun = caDoc != null && 
    caDoc.operating_realized !== null && 
    caDoc.operating_planned !== null && 
    caDoc.operating_realized > caDoc.operating_planned;

  const hasMissingModificationsNotice = amendments.length === 0;

  let noticeText = '';
  if (hasOperatingOverrun && hasMissingModificationsNotice) {
    noticeText = "Les dépenses de fonctionnement ordonnancées sont supérieures aux crédits primitifs votés. En l'absence de budget modificatif, décision modificative ou virement de crédits actuellement versé aux pièces publiques, cet écart fait l'objet d'un suivi de corroboration documentaire sans présumer d'aucune irrégularité.";
  } else if (hasOperatingOverrun && amendments.length > 0) {
    noticeText = "Les dépenses de fonctionnement ordonnancées ont fait l'objet d'ajustements au cours de l'exercice via les modifications budgétaires documentées ci-dessus.";
  }

  const evidenceDisclaimer = "Conformément à la charte SuiviBudget CI : Absence de document public ≠ Preuve d'absence d'acte administratif. La concomitance ou surperformance de recettes ne préjuge pas, à elle seule, de la qualification juridique de l'autorisation de dépense.";

  return {
    institution_id: institutionId,
    institution_name: institutionName,
    fiscal_year: fiscalYear,
    initial_budget: initialBudget,
    amendments,
    amendments_status: amendmentsStatus,
    amendments_explanation: amendmentsExplanation,
    net_amendments: {
      total: netTotalDelta,
      operating: netOperatingDelta,
      investment: netInvestmentDelta,
      precision: deltaPrecision
    },
    final_credits: finalCredits,
    administrative_account: caDoc,
    execution_comparison: executionComparison,
    civic_notices: {
      has_operating_overrun: hasOperatingOverrun,
      has_missing_modifications_notice: hasMissingModificationsNotice,
      notice_text: noticeText,
      evidence_disclaimer: evidenceDisclaimer
    }
  };
}
