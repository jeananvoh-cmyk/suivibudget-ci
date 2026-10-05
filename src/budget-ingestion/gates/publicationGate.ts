// Gate de publication pure (LOT 3)
// Décision déterministe protégeant l'espace public contre toute donnée invalide ou non réconciliée.
// Invariants : NOT_COMPARABLE != RECONCILED, SOURCE_GAP != RECONCILED, UNKNOWN != 0

import {
  CanonicalMinistryExtraction,
  IngestionReconciliationReport,
  ValidationResult,
  PublicationGateDecision,
} from '../types';

export function canPublishMinistryBudget(
  first: ValidationResult | CanonicalMinistryExtraction,
  report: IngestionReconciliationReport,
  third?: ValidationResult
): PublicationGateDecision {
  const blockerReasons: string[] = [];
  const warningReasons: string[] = [];

  let validation: ValidationResult;
  let data: CanonicalMinistryExtraction | undefined;

  if ('isValid' in first) {
    validation = first;
    data = undefined;
  } else {
    data = first;
    validation = third ?? { isValid: true, errors: [], warnings: [] };
  }

  // 1. Validation structurelle stricte
  if (!validation.isValid) {
    blockerReasons.push(`Validation en échec : ${validation.errors.length} erreur(s) détectée(s).`);
    const criticalErrors = validation.errors.filter(e => e.critical);
    criticalErrors.forEach(err => {
      blockerReasons.push(`[VALIDATION_ERROR] ${err.rule} à ${err.path}: ${err.message}`);
    });
  }

  // 2. Erreurs non critiques notées comme warnings
  validation.warnings.forEach(warn => {
    warningReasons.push(`[VALIDATION_WARNING] ${warn.rule} à ${warn.path}: ${warn.message}`);
  });

  // 3. Statut de réconciliation global
  if (report.global_status === 'NOT_COMPARABLE') {
    blockerReasons.push(
      '[GLOBAL_STATUS_NOT_COMPARABLE] Données financières non comparables (montant total, dotation de programme, action ou activité inconnue). Publication bloquée.'
    );
  } else if (report.global_status === 'SOURCE_GAP') {
    blockerReasons.push(
      '[GLOBAL_STATUS_SOURCE_GAP] Écart arithmétique officiel constaté non réconcilié. Publication bloquée.'
    );
  }

  // 4. Réconciliation au niveau MINISTÈRE
  if (report.ministry_level.status === 'NOT_COMPARABLE') {
    blockerReasons.push(
      '[NOT_COMPARABLE_MINISTRY] Montant total ministériel inconnu (null) ou somme des programmes non comparable. Publication bloquée.'
    );
  } else if (report.ministry_level.status === 'SOURCE_GAP') {
    blockerReasons.push(
      `[RECONCILIATION_GAP_MINISTRY] Écart arithmétique global non réconcilié (delta: ${report.ministry_level.delta_fcfa} FCFA). La somme des programmes doit égaler le total voté.`
    );
  }

  // 5. Réconciliation au niveau des PROGRAMMES
  for (const progCheck of report.programs_level) {
    if (progCheck.status === 'NOT_COMPARABLE') {
      blockerReasons.push(
        `[NOT_COMPARABLE_PROGRAM] Programme "${progCheck.code}" : dotation ou action nécessaire à la réconciliation inconnue (null). Publication bloquée.`
      );
    } else if (progCheck.status === 'SOURCE_GAP') {
      blockerReasons.push(
        `[RECONCILIATION_GAP_PROGRAM] Programme "${progCheck.code}" : delta de ${progCheck.delta_fcfa} FCFA entre somme des actions (${progCheck.observed_sum_fcfa}) et montant officiel (${progCheck.expected_amount_fcfa}).`
      );
    }
  }

  // 6. Réconciliation au niveau des ACTIONS
  for (const actCheck of report.actions_level) {
    if (actCheck.status === 'NOT_COMPARABLE') {
      blockerReasons.push(
        `[NOT_COMPARABLE_ACTION] Action "${actCheck.code}" : montant ou décomposition d'activité non comparable (UNKNOWN / null). Publication bloquée.`
      );
    } else if (actCheck.status === 'SOURCE_GAP') {
      blockerReasons.push(
        `[ACTION_SOURCE_GAP] Action "${actCheck.code}" : écart de ${actCheck.delta_fcfa} FCFA entre activités et montant officiel de l'action.`
      );
    }
  }

  // 7. Intégrité des projets multi-lignes
  if (report.projects_summary.multi_line_errors_count > 0) {
    blockerReasons.push(
      `[PROJECT_MULTI_LINE_ERROR] ${report.projects_summary.multi_line_errors_count} projet(s) ont une anomalie de sommation ou une ligne source inconnue (null).`
    );
  }

  // 8. Double comptage interdit
  if (!report.projects_summary.is_funded_within_actions) {
    blockerReasons.push(
      '[DOUBLE_COUNTING_VIOLATION] Les projets doivent être strictement financés au sein des actions budgétaires (is_funded_within_actions doit être vrai).'
    );
  }

  // 9. Source primaire officielle vérifiable (si extraction fournie)
  if (data && (!data.source || !data.source.url || !data.source.url.startsWith('https://'))) {
    blockerReasons.push(
      '[MISSING_PRIMARY_SOURCE] URL source primaire HTTPS obligatoire absente ou invalide.'
    );
  }

  const canPublish = blockerReasons.length === 0;

  return {
    canPublish,
    blockerReasons,
    warningReasons,
    reviewed_at: new Date().toISOString(),
  };
}
