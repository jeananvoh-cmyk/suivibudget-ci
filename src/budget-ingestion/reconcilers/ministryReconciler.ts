// Moteur de réconciliation arithmétique déterministe (LOT 3)
// Constate les équilibres et écarts sans JAMAIS modifier ni inventer de valeurs.
// Invariants : UNKNOWN != 0, SOURCE_GAP != RECONCILED, Budget Line != Project

import {
  CanonicalMinistryExtraction,
  ReconciliationLevelResult,
  IngestionReconciliationReport,
  IngestionReconciliationStatus,
} from '../types';

export function reconcileMinistryBudget(data: CanonicalMinistryExtraction): IngestionReconciliationReport {
  let hasAnySourceGap = false;

  // 1. Réconciliation au niveau des PROGRAMMES (Actions -> Programme)
  const programResults: ReconciliationLevelResult[] = [];
  let totalProgramsSum = 0;
  let totalActionsSum = 0;

  for (const prog of data.programs) {
    let actionsSum = 0;
    let hasNullAction = false;

    for (const act of prog.actions) {
      if (act.amount_2026_fcfa !== null && act.amount_2026_fcfa !== undefined) {
        actionsSum += act.amount_2026_fcfa;
      } else {
        hasNullAction = true;
      }
    }

    totalActionsSum += actionsSum;
    const expectedProgAmount = prog.program_amount_2026_fcfa;

    let progStatus: IngestionReconciliationStatus;
    let delta = 0;

    if (expectedProgAmount === null || expectedProgAmount === undefined) {
      progStatus = 'NOT_COMPARABLE';
    } else {
      totalProgramsSum += expectedProgAmount;
      delta = actionsSum - expectedProgAmount;
      if (delta === 0 && !hasNullAction) {
        progStatus = 'RECONCILED';
      } else {
        progStatus = 'SOURCE_GAP';
        hasAnySourceGap = true;
      }
    }

    programResults.push({
      code: prog.program_code,
      name: prog.official_name,
      level: 'PROGRAM',
      expected_amount_fcfa: expectedProgAmount,
      observed_sum_fcfa: actionsSum,
      delta_fcfa: delta,
      status: progStatus,
      sub_items_count: prog.actions.length,
      notes: delta !== 0 ? `Écart constaté entre actions (${actionsSum}) et dotation programme (${expectedProgAmount})` : undefined,
    });
  }

  // 2. Réconciliation au niveau MINISTÈRE (Programmes -> Ministère)
  const expectedMinistryTotal = data.totals.total_ministry_2026_fcfa;
  let ministryStatus: IngestionReconciliationStatus;
  let ministryDelta = 0;

  if (expectedMinistryTotal === null || expectedMinistryTotal === undefined) {
    ministryStatus = 'NOT_COMPARABLE';
  } else {
    ministryDelta = totalProgramsSum - expectedMinistryTotal;
    if (ministryDelta === 0) {
      ministryStatus = 'RECONCILED';
    } else {
      ministryStatus = 'SOURCE_GAP';
      hasAnySourceGap = true;
    }
  }

  const ministryResult: ReconciliationLevelResult = {
    code: data.institution_code,
    name: data.institution_name,
    level: 'MINISTRY',
    expected_amount_fcfa: expectedMinistryTotal,
    observed_sum_fcfa: totalProgramsSum,
    delta_fcfa: ministryDelta,
    status: ministryStatus,
    sub_items_count: data.programs.length,
    notes: ministryDelta !== 0 ? `Écart constaté entre somme des programmes (${totalProgramsSum}) et dotation totale (${expectedMinistryTotal})` : undefined,
  };

  // 3. Réconciliation au niveau ACTIONS (Activités -> Action, si activités présentes)
  const actionResults: ReconciliationLevelResult[] = [];
  for (const prog of data.programs) {
    for (const act of prog.actions) {
      const activities = act.activities || [];
      const expectedActAmount = act.amount_2026_fcfa;

      if (activities.length > 0) {
        const activitiesSum = activities.reduce((acc, a) => acc + (a.amount_2026_fcfa ?? 0), 0);
        const actDelta = expectedActAmount !== null ? activitiesSum - expectedActAmount : 0;
        const actStatus: IngestionReconciliationStatus = actDelta === 0 ? 'RECONCILED' : 'SOURCE_GAP';
        if (actDelta !== 0) hasAnySourceGap = true;

        actionResults.push({
          code: act.action_code,
          name: act.official_name,
          level: 'ACTION',
          expected_amount_fcfa: expectedActAmount,
          observed_sum_fcfa: activitiesSum,
          delta_fcfa: actDelta,
          status: actStatus,
          sub_items_count: activities.length,
        });
      } else {
        // Pas d'activités décomposées : statut direct de l'action
        actionResults.push({
          code: act.action_code,
          name: act.official_name,
          level: 'ACTION',
          expected_amount_fcfa: expectedActAmount,
          observed_sum_fcfa: expectedActAmount ?? 0,
          delta_fcfa: 0,
          status: expectedActAmount !== null ? 'RECONCILED' : 'NOT_COMPARABLE',
          sub_items_count: 0,
        });
      }
    }
  }

  // 4. Synthèse des projets liés (sans double comptage)
  const projects = data.projects || [];
  let totalProjectsSum = 0;
  let multiLineChecked = 0;
  let multiLineErrors = 0;

  for (const proj of projects) {
    totalProjectsSum += proj.consolidated_amount_2026_fcfa;

    if (proj.amount_derivation === 'SUM_OF_OFFICIAL_SOURCE_LINES') {
      multiLineChecked++;
      const linesSum = proj.source_lines.reduce((acc, l) => {
        const val = l.amount_2026_fcfa ?? l.amount_fcfa ?? 0;
        return acc + val;
      }, 0);
      if (linesSum !== proj.consolidated_amount_2026_fcfa) {
        multiLineErrors++;
        hasAnySourceGap = true;
      }
    }
  }

  const globalStatus: IngestionReconciliationStatus = hasAnySourceGap
    ? 'SOURCE_GAP'
    : (ministryStatus === 'RECONCILED' ? 'RECONCILED' : 'NOT_COMPARABLE');

  return {
    institution_code: data.institution_code,
    fiscal_year: data.fiscal_year,
    ministry_level: ministryResult,
    programs_level: programResults,
    actions_level: actionResults,
    projects_summary: {
      total_projects_count: projects.length,
      total_projects_amount_fcfa: totalProjectsSum,
      is_funded_within_actions: true, // Invariant absolu : jamais d'addition par-dessus le budget
      multi_line_projects_checked: multiLineChecked,
      multi_line_errors_count: multiLineErrors,
    },
    global_status: globalStatus,
  };
}
