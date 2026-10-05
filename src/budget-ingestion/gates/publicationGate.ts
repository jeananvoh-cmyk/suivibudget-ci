// Gate de publication pure (LOT 3)
// Décision déterministe protégeant l'espace public contre toute donnée invalide ou non réconciliée.
// Invariant : Aucune publication automatique si anomalie structurelle ou écart non documenté.

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

  // 3. Réconciliation du montant ministériel
  if (report.ministry_level.status === 'SOURCE_GAP') {
    blockerReasons.push(
      `Écart arithmétique global non réconcilié (delta: ${report.ministry_level.delta_fcfa} FCFA). La somme des programmes doit égaler le total voté.`
    );
  }

  // 4. Réconciliation au niveau des programmes
  for (const progCheck of report.programs_level) {
    if (progCheck.status === 'SOURCE_GAP') {
      blockerReasons.push(
        `Programme "${progCheck.code}" : delta de ${progCheck.delta_fcfa} FCFA entre somme des actions (${progCheck.observed_sum_fcfa}) et montant officiel (${progCheck.expected_amount_fcfa}).`
      );
    }
  }

  // 5. Intégrité des projets multi-lignes
  if (report.projects_summary.multi_line_errors_count > 0) {
    blockerReasons.push(
      `[PROJECT_MULTI_LINE_ERROR] ${report.projects_summary.multi_line_errors_count} projet(s) ont une somme de lignes source incohérente avec leur montant consolidé.`
    );
  }

  // 6. Double comptage interdit
  if (!report.projects_summary.is_funded_within_actions) {
    blockerReasons.push(
      '[DOUBLE_COUNTING_VIOLATION] Les projets doivent être strictement financés au sein des actions budgétaires (is_funded_within_actions doit être vrai).'
    );
  }

  // 7. Source primaire officielle vérifiable (si extraction fournie)
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
