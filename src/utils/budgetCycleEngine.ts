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
  FinancialValueSource,
  FinalCreditsStatus,
  AmendmentChainStatus,
  AmendmentAmountSemantics
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
 * Extrait le numéro de page source d'un document budgétaire (Item 9)
 */
function extractSourcePage(doc: LocalBudget): number | undefined {
  if (doc.source_page) return doc.source_page;
  if (doc.import_provenance?.source?.page) return doc.import_provenance.source.page;
  return undefined;
}

/**
 * Options de consolidation pour le cycle budgétaire
 */
export interface ConsolidateCycleOptions {
  amendmentChainStatus?: AmendmentChainStatus;
  officialFinalCredits?: {
    total: number | null;
    operating?: number | null;
    investment?: number | null;
    precision?: AmountPrecision;
    source: FinancialValueSource;
  };
}

/**
 * Consolide l'ensemble du cycle budgétaire pour une collectivité et un exercice donné
 * 
 * @param institutionId Identifiant canonique de la collectivité (ex: "inst-com-tiassale")
 * @param fiscalYear Exercice budgétaire (ex: 2024, 2025, 2026)
 * @param budgets Liste de tous les budgets référencés (BP + modifications)
 * @param accounts Liste de tous les comptes administratifs
 * @param options Options d'exhaustivité et de crédits définitifs officiels
 */
export function consolidateBudgetCycle(
  institutionId: string,
  fiscalYear: number,
  budgets: LocalBudget[],
  accounts: AdministrativeAccount[] = [],
  options?: ConsolidateCycleOptions
): BudgetCycleConsolidation {
  // 1. Filtrer les budgets pour cette collectivité et cet exercice
  const matchingBudgets = budgets.filter(
    b => b.institution_id === institutionId && b.fiscal_year === fiscalYear
  );

  // Institution name fallback
  const institutionName = matchingBudgets[0]?.institution_name || 
    accounts.find(a => a.institution_id === institutionId)?.institution_name || 
    institutionId;

  // 2. Extraire et préserver les étapes distinctes du BP (Item 3)
  const primitiveAdoptedDoc = matchingBudgets.find(b => b.budget_type === 'PRIMITIF_ADOPTE') || null;
  const primitiveAfterTutelleDoc = matchingBudgets.find(b => b.budget_type === 'PRIMITIF_APRES_TUTELLE') || null;
  const executionAuthorizedDoc = matchingBudgets.find(b => b.budget_type === 'AUTORISATION_EXECUTION') || null;

  // Le véritable BP initial de référence est le PRIMITIF_ADOPTE.
  // En cas d'absence, repli explicite sur l'acte le plus proche avec traçabilité.
  const initialBudgetDoc = primitiveAdoptedDoc || primitiveAfterTutelleDoc || executionAuthorizedDoc;

  // Construire les valeurs financières du budget initial
  const initialSources: FinancialValueSource[] = initialBudgetDoc ? [{
    document_name: initialBudgetDoc.document_name || formatBudgetTypeLabel(initialBudgetDoc.budget_type),
    document_type: initialBudgetDoc.budget_type,
    fiscal_year: initialBudgetDoc.fiscal_year,
    date: initialBudgetDoc.publication_date || initialBudgetDoc.adoption_date,
    url: initialBudgetDoc.document_url || initialBudgetDoc.primary_source_url,
    page: extractSourcePage(initialBudgetDoc)
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
  // PRÉSERVER LE TYPE RÉEL DU DOCUMENT (Item 4 & 5)
  const amendmentDocs = matchingBudgets
    .filter(b => isBudgetAmendment(b.budget_type))
    .sort((a, b) => (a.version_number || 0) - (b.version_number || 0));

  const amendments: BudgetAmendment[] = amendmentDocs.map(doc => {
    const isNegative = (doc.total_amount !== null && doc.total_amount < 0) ||
      (doc.notes?.toLowerCase().includes('réduction') || doc.notes?.toLowerCase().includes('diminution'));

    // Sémantique financière du montant (Item 12 : DELTA vs REVISED_TOTAL vs UNKNOWN)
    const rawSemantics = (doc as unknown as { amount_semantics?: string }).amount_semantics || '';
    let amountSemantics: AmendmentAmountSemantics = 'DELTA';
    if (rawSemantics === 'REVISED_TOTAL' || doc.notes?.toLowerCase().includes('total révisé') || doc.notes?.toLowerCase().includes('revised_total')) {
      amountSemantics = 'REVISED_TOTAL';
    } else if (rawSemantics === 'UNKNOWN' || doc.notes?.toLowerCase().includes('semantics_unknown')) {
      amountSemantics = 'UNKNOWN';
    } else if (rawSemantics === 'DELTA') {
      amountSemantics = 'DELTA';
    }

    return {
      id: doc.id,
      institution_id: doc.institution_id,
      fiscal_year: doc.fiscal_year,
      budget_type: doc.budget_type, // Type réel préservé (Item 5)
      version_number: doc.version_number,
      label: formatBudgetTypeLabel(doc.budget_type),
      amount_semantics: amountSemantics,
      total_delta: doc.total_amount,
      operating_delta: doc.operating_amount,
      investment_delta: doc.investment_amount,
      precision: doc.total_amount === null ? 'UNKNOWN' : doc.amount_precision,
      source: {
        name: doc.document_name || doc.primary_source_label || formatBudgetTypeLabel(doc.budget_type),
        reference: doc.import_provenance?.source?.reference || doc.document_name || 'Acte officiel',
        date: doc.publication_date || doc.adoption_date,
        url: doc.document_url || doc.primary_source_url,
        page: extractSourcePage(doc) // Page préservée (Item 9)
      },
      adoption_date: doc.adoption_date,
      tutelle_approval_date: doc.tutelle_approval_date,
      notes: doc.notes,
      is_negative: isNegative
    };
  });

  // Calcul du solde net des modifications (Item 12 & 13)
  let netTotalDelta: number | null = amendments.length > 0 ? 0 : null;
  let netOperatingDelta: number | null = amendments.length > 0 ? 0 : null;
  let netInvestmentDelta: number | null = amendments.length > 0 ? 0 : null;
  let deltaPrecision: AmountPrecision = 'EXACT';
  let hasNonDeltaSemantics = false;

  for (const a of amendments) {
    // Si la sémantique n'est pas un DELTA (ex: REVISED_TOTAL ou UNKNOWN), on ne peut pas additionner aveuglément
    if (a.amount_semantics !== 'DELTA') {
      hasNonDeltaSemantics = true;
    }

    if (a.total_delta !== null && netTotalDelta !== null) {
      netTotalDelta += a.total_delta;
    } else if (a.total_delta === null) {
      netTotalDelta = null; // UNKNOWN != 0 (Item 13)
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

  // Si au moins un acte est un nouveau total révisé ou inconnu, le solde cumulé par addition est bloqué
  if (hasNonDeltaSemantics) {
    netTotalDelta = null;
    netOperatingDelta = null;
    netInvestmentDelta = null;
  }

  const amendmentsStatus: 'DOCUMENTED' | 'NO_AMENDMENTS_FOUND_PUBLICLY' = 
    amendments.length > 0 ? 'DOCUMENTED' : 'NO_AMENDMENTS_FOUND_PUBLICLY';

  const amendmentsExplanation = amendments.length > 0
    ? `${amendments.length} modification(s) budgétaire(s) officielle(s) documentée(s) pour un solde net de ${netTotalDelta !== null ? formatFCFA(netTotalDelta) : 'montant à corroborer'}.`
    : 'Aucune modification budgétaire documentée dans les sources actuellement disponibles.';

  // 4. Établissement des Crédits Définitifs (Items 2 & 14)
  // RÈGLE CRITIQUE : BP seul + pas de modifications documentées NE DOIT JAMAIS produire final_credits = BP !
  // Il produit NOT_ESTABLISHED avec notice pédagogique républicaine.
  let finalCreditsStatus: FinalCreditsStatus = 'NOT_ESTABLISHED';
  let finalCredits: BudgetCycleConsolidation['final_credits'] = null;
  let finalCreditsNotice: string | undefined;
  let documentedAdjustedAmount: BudgetCycleConsolidation['documented_adjusted_amount'] = undefined;

  // Statut de complétude de la chaîne de modifications
  const amendmentChainStatus: AmendmentChainStatus = options?.amendmentChainStatus ?? (
    amendments.length > 0 ? 'PARTIAL' : 'UNKNOWN'
  );

  // CAS C : Document officiel indiquant directement les crédits définitifs (SOURCE_CONFIRMED)
  if (options?.officialFinalCredits) {
    finalCreditsStatus = 'SOURCE_CONFIRMED';
    const off = options.officialFinalCredits;
    finalCredits = {
      total: {
        amount: off.total,
        precision: off.precision || (off.total === null ? 'UNKNOWN' : 'EXACT'),
        origin: 'SOURCE_VALUE',
        sources: [off.source]
      },
      operating: {
        amount: off.operating ?? null,
        precision: off.operating === null ? 'UNKNOWN' : 'EXACT',
        origin: 'SOURCE_VALUE',
        sources: [off.source]
      },
      investment: {
        amount: off.investment ?? null,
        precision: off.investment === null ? 'UNKNOWN' : 'EXACT',
        origin: 'SOURCE_VALUE',
        sources: [off.source]
      },
      is_derived: false
    };
  } else if (initialBudget && amendments.length > 0 && amendmentChainStatus === 'COMPLETE' && !hasNonDeltaSemantics && netTotalDelta !== null) {
    // CAS A / D : BP connu + chaîne complète d'amendements documentée et validée (DERIVED_FROM_DOCUMENTED_AMENDMENTS)
    finalCreditsStatus = 'DERIVED_FROM_DOCUMENTED_AMENDMENTS';
    
    const finalSources: FinancialValueSource[] = [
      ...initialSources,
      ...amendments.map(a => ({
        document_name: a.source.name,
        document_type: a.budget_type,
        fiscal_year: a.fiscal_year,
        date: a.source.date,
        reference: a.source.reference,
        url: a.source.url,
        page: a.source.page
      }))
    ];

    const finalTotalAmount = initialBudget.total.amount !== null ? initialBudget.total.amount + netTotalDelta : null;
    const finalOperatingAmount = (initialBudget.operating.amount !== null && netOperatingDelta !== null) ? initialBudget.operating.amount + netOperatingDelta : null;
    const finalInvestmentAmount = (initialBudget.investment.amount !== null && netInvestmentDelta !== null) ? initialBudget.investment.amount + netInvestmentDelta : null;

    const finalTotalFormula = (initialBudget.total.amount !== null && finalTotalAmount !== null)
      ? `${formatFCFA(initialBudget.total.amount)} (BP initial) ${netTotalDelta >= 0 ? '+' : '-'} ${formatFCFA(Math.abs(netTotalDelta))} (Modifications nettes) = ${formatFCFA(finalTotalAmount)}`
      : undefined;

    finalCredits = {
      total: {
        amount: finalTotalAmount,
        precision: initialBudget.total.precision,
        origin: 'DERIVED_VALUE',
        formula: finalTotalFormula,
        sources: finalSources
      },
      operating: {
        amount: finalOperatingAmount,
        precision: initialBudget.operating.precision,
        origin: 'DERIVED_VALUE',
        sources: finalSources
      },
      investment: {
        amount: finalInvestmentAmount,
        precision: initialBudget.investment.precision,
        origin: 'DERIVED_VALUE',
        sources: finalSources
      },
      is_derived: true
    };
  } else {
    // CAS B : BP seul OU chaîne d'amendements incomplète/inconnue -> NOT_ESTABLISHED
    finalCreditsStatus = 'NOT_ESTABLISHED';
    finalCredits = null; // ZÉRO FALSIFICATION : NE PAS REPRENDRE LE BP !

    if (amendments.length === 0) {
      finalCreditsNotice = "Les crédits définitifs ne peuvent pas être établis avec les documents actuellement disponibles. Aucune modification budgétaire n’est actuellement documentée dans SuiviBudget. Cela ne prouve pas qu’aucune modification n’a existé.";
    } else {
      finalCreditsNotice = "Les crédits définitifs ne peuvent pas être établis avec certitude : des actes modificatifs sont documentés mais la complétude de la chaîne pour cet exercice n'est pas confirmée.";

      // Calcul d'un montant ajusté documenté provisoire sans le qualifier de crédits définitifs (Item 14)
      if (initialBudget && initialBudget.total.amount !== null && netTotalDelta !== null && !hasNonDeltaSemantics) {
        documentedAdjustedAmount = {
          total: initialBudget.total.amount + netTotalDelta,
          operating: (initialBudget.operating.amount !== null && netOperatingDelta !== null) ? initialBudget.operating.amount + netOperatingDelta : null,
          investment: (initialBudget.investment.amount !== null && netInvestmentDelta !== null) ? initialBudget.investment.amount + netInvestmentDelta : null,
          precision: deltaPrecision,
          formula: `${formatFCFA(initialBudget.total.amount)} (BP) ${netTotalDelta >= 0 ? '+' : '-'} ${formatFCFA(Math.abs(netTotalDelta))} (Actes connus) = ${formatFCFA(initialBudget.total.amount + netTotalDelta)}`
        };
      }
    }
  }

  // 5. Compte Administratif (Exécution Financière)
  const caDoc = accounts.find(
    a => a.institution_id === institutionId && a.fiscal_year === fiscalYear
  ) || null;

  // 6. Comparaisons d'exécution et calculs de taux
  let executionComparison: BudgetCycleConsolidation['execution_comparison'] = null;

  if (caDoc) {
    // Taux vs Crédits Définitifs (SEULEMENT SI CRÉDITS DÉFINITIFS ÉTABLIS)
    let vsFinalCredits: { total: ExecutionRateResult; operating: ExecutionRateResult; investment: ExecutionRateResult } | null = null;
    if (finalCredits && finalCredits.total.amount !== null) {
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
    if (initialBudget && initialBudget.total.amount !== null) {
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
    primitive_adopted: primitiveAdoptedDoc,
    primitive_after_tutelle: primitiveAfterTutelleDoc,
    execution_authorized: executionAuthorizedDoc,
    initial_budget: initialBudget,
    amendments,
    amendments_status: amendmentsStatus,
    amendment_chain_status: amendmentChainStatus,
    amendments_explanation: amendmentsExplanation,
    net_amendments: {
      total: netTotalDelta,
      operating: netOperatingDelta,
      investment: netInvestmentDelta,
      precision: deltaPrecision
    },
    documented_adjusted_amount: documentedAdjustedAmount,
    final_credits_status: finalCreditsStatus,
    final_credits: finalCredits,
    final_credits_notice: finalCreditsNotice,
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
