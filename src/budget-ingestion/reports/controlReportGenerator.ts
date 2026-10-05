// Générateur de rapport de contrôle auditable et machine-readable (LOT 3)
// Destiné aux contrôles automatisés, aux audits indépendants et à la gouvernance civique.

import {
  CanonicalMinistryExtraction,
  IngestionReconciliationReport,
  ValidationResult,
  PublicationGateDecision,
  ControlReport,
} from '../types';

export function generateControlReport(
  data: CanonicalMinistryExtraction,
  reconciliation: IngestionReconciliationReport,
  validation: ValidationResult,
  decision: PublicationGateDecision
): ControlReport {
  const sourceGaps: ControlReport['source_gaps'] = [];

  // Recensement des écarts au niveau ministériel
  if (reconciliation.ministry_level.status === 'SOURCE_GAP') {
    sourceGaps.push({
      level: 'MINISTRY',
      code: reconciliation.ministry_level.code,
      expected: reconciliation.ministry_level.expected_amount_fcfa,
      observed: reconciliation.ministry_level.observed_sum_fcfa,
      delta: reconciliation.ministry_level.delta_fcfa,
    });
  }

  // Recensement des écarts au niveau programmes
  for (const p of reconciliation.programs_level) {
    if (p.status === 'SOURCE_GAP') {
      sourceGaps.push({
        level: 'PROGRAM',
        code: p.code,
        expected: p.expected_amount_fcfa,
        observed: p.observed_sum_fcfa,
        delta: p.delta_fcfa,
      });
    }
  }

  // Recensement des écarts au niveau actions
  for (const a of reconciliation.actions_level) {
    if (a.status === 'SOURCE_GAP') {
      sourceGaps.push({
        level: 'ACTION',
        code: a.code,
        expected: a.expected_amount_fcfa,
        observed: a.observed_sum_fcfa,
        delta: a.delta_fcfa,
      });
    }
  }

  const programCount = data.programs.length;
  const actionCount = data.programs.reduce((acc, p) => acc + p.actions.length, 0);
  const projectCount = data.projects ? data.projects.length : 0;

  const programsSum = reconciliation.ministry_level.observed_sum_fcfa;
  const actionsSum = reconciliation.programs_level.reduce((acc, p) => acc + p.observed_sum_fcfa, 0);

  return {
    ministry_code: data.institution_code,
    ministry_name: data.institution_name,
    fiscal_year: data.fiscal_year,
    program_count: programCount,
    action_count: actionCount,
    project_count: projectCount,
    ministry_total: reconciliation.ministry_level.expected_amount_fcfa,
    programs_sum: programsSum,
    program_delta: reconciliation.ministry_level.delta_fcfa,
    actions_sum: actionsSum,
    projects_sum: reconciliation.projects_summary.total_projects_amount_fcfa,
    reconciliation_status: reconciliation.global_status,
    source_gaps: sourceGaps,
    errors: validation.errors.map(e => `[${e.rule}] ${e.message}`),
    warnings: validation.warnings.map(w => `[${w.rule}] ${w.message}`),
    can_publish: decision.canPublish,
    blockers: decision.blockerReasons,
    generated_at: new Date().toISOString(),
  };
}
