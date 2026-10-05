// Moteur de réconciliation arithmétique déterministe (LOT 3)
// Constate les équilibres et écarts sans JAMAIS modifier ni inventer de valeurs.
// Invariants : UNKNOWN != 0, UNKNOWN != estimation, SOURCE_GAP != RECONCILED, NOT_COMPARABLE != RECONCILED, Budget Line != Project

import {
  CanonicalMinistryExtraction,
  ReconciliationLevelResult,
  IngestionReconciliationReport,
  IngestionReconciliationStatus,
} from '../types';

export function reconcileMinistryBudget(data: CanonicalMinistryExtraction): IngestionReconciliationReport {
  let hasAnySourceGap = false;
  let hasAnyNotComparable = false;

  // 1. Réconciliation au niveau des PROGRAMMES (Actions -> Programme)
  const programResults: ReconciliationLevelResult[] = [];
  let totalProgramsSum: number | null = 0;
  let hasNullProgramAmount = false;

  for (const prog of data.programs) {
    let actionsSum = 0;
    let hasNullAction = false;

    for (const act of prog.actions) {
      if (typeof act.amount_2026_fcfa === 'number') {
        actionsSum += act.amount_2026_fcfa;
      } else {
        hasNullAction = true;
      }
    }

    const expectedProgAmount = prog.program_amount_2026_fcfa;

    let progStatus: IngestionReconciliationStatus;
    let delta: number | null = null;
    let observedActionsSum: number | null = null;

    if (expectedProgAmount === null || expectedProgAmount === undefined) {
      // Dotation officielle du programme inconnue => NOT_COMPARABLE
      progStatus = 'NOT_COMPARABLE';
      hasNullProgramAmount = true;
      hasAnyNotComparable = true;
      observedActionsSum = hasNullAction ? null : actionsSum;
    } else if (hasNullAction) {
      // Au moins une action nécessaire à la réconciliation est inconnue => NOT_COMPARABLE
      progStatus = 'NOT_COMPARABLE';
      hasAnyNotComparable = true;
      observedActionsSum = null; // Ne pas afficher de somme incomplète
      if (totalProgramsSum !== null) totalProgramsSum += expectedProgAmount;
    } else {
      // Les actions et le programme sont complètement documentés numériquement
      observedActionsSum = actionsSum;
      delta = actionsSum - expectedProgAmount;
      if (delta === 0) {
        progStatus = 'RECONCILED';
      } else {
        progStatus = 'SOURCE_GAP';
        hasAnySourceGap = true;
      }
      if (totalProgramsSum !== null) totalProgramsSum += expectedProgAmount;
    }

    programResults.push({
      code: prog.program_code,
      name: prog.official_name,
      level: 'PROGRAM',
      expected_amount_fcfa: expectedProgAmount,
      observed_sum_fcfa: observedActionsSum,
      delta_fcfa: delta,
      status: progStatus,
      sub_items_count: prog.actions.length,
      notes: hasNullAction
        ? 'Réconciliation non comparable : au moins une action du programme a un montant inconnu (null).'
        : (expectedProgAmount === null
          ? 'Réconciliation non comparable : dotation officielle du programme inconnue (null).'
          : (delta !== 0 && delta !== null
            ? `Écart constaté entre actions (${actionsSum}) et dotation programme (${expectedProgAmount})`
            : undefined)),
    });
  }

  // 2. Réconciliation au niveau MINISTÈRE (Programmes -> Ministère)
  const expectedMinistryTotal = data.totals.total_ministry_2026_fcfa;
  let ministryStatus: IngestionReconciliationStatus;
  let ministryDelta: number | null = null;
  let observedMinistryProgramsSum: number | null = null;

  if (expectedMinistryTotal === null || expectedMinistryTotal === undefined) {
    ministryStatus = 'NOT_COMPARABLE';
    hasAnyNotComparable = true;
    observedMinistryProgramsSum = hasNullProgramAmount ? null : totalProgramsSum;
  } else if (hasNullProgramAmount || totalProgramsSum === null) {
    ministryStatus = 'NOT_COMPARABLE';
    hasAnyNotComparable = true;
    observedMinistryProgramsSum = null;
  } else {
    observedMinistryProgramsSum = totalProgramsSum;
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
    observed_sum_fcfa: observedMinistryProgramsSum,
    delta_fcfa: ministryDelta,
    status: ministryStatus,
    sub_items_count: data.programs.length,
    notes: (expectedMinistryTotal === null)
      ? 'Montant total ministériel inconnu (null).'
      : (hasNullProgramAmount
        ? 'Somme des programmes non comparable : au moins un programme a un montant inconnu (null).'
        : (ministryDelta !== 0 && ministryDelta !== null
          ? `Écart constaté entre somme des programmes (${totalProgramsSum}) et dotation totale (${expectedMinistryTotal})`
          : undefined)),
  };

  // 3. Réconciliation au niveau ACTIONS (Activités -> Action, si activités présentes)
  const actionResults: ReconciliationLevelResult[] = [];
  for (const prog of data.programs) {
    for (const act of prog.actions) {
      const activities = act.activities || [];
      const expectedActAmount = act.amount_2026_fcfa;

      if (activities.length > 0) {
        let hasNullActivity = false;
        let activitiesSum = 0;

        for (const a of activities) {
          if (typeof a.amount_2026_fcfa === 'number') {
            activitiesSum += a.amount_2026_fcfa;
          } else {
            hasNullActivity = true;
          }
        }

        let actStatus: IngestionReconciliationStatus;
        let actDelta: number | null = null;
        let actObservedSum: number | null = null;

        if (hasNullActivity || expectedActAmount === null || expectedActAmount === undefined) {
          actStatus = 'NOT_COMPARABLE';
          actDelta = null;
          actObservedSum = null;
          hasAnyNotComparable = true;
        } else {
          actObservedSum = activitiesSum;
          actDelta = activitiesSum - expectedActAmount;
          if (actDelta === 0) {
            actStatus = 'RECONCILED';
          } else {
            actStatus = 'SOURCE_GAP';
            hasAnySourceGap = true;
          }
        }

        actionResults.push({
          code: act.action_code,
          name: act.official_name,
          level: 'ACTION',
          expected_amount_fcfa: expectedActAmount,
          observed_sum_fcfa: actObservedSum,
          delta_fcfa: actDelta,
          status: actStatus,
          sub_items_count: activities.length,
          notes: hasNullActivity
            ? 'Décomposition incomplète : au moins une activité a un montant UNKNOWN (null).'
            : (expectedActAmount === null
              ? 'Montant officiel de l\'action inconnu (null).'
              : (actDelta !== 0 && actDelta !== null
                ? `Écart constaté entre activités (${activitiesSum}) et dotation action (${expectedActAmount})`
                : undefined)),
        });
      } else {
        // Pas d'activités décomposées : statut direct de l'action
        const actStatus: IngestionReconciliationStatus =
          expectedActAmount !== null && expectedActAmount !== undefined
            ? 'RECONCILED'
            : 'NOT_COMPARABLE';

        if (actStatus === 'NOT_COMPARABLE') {
          hasAnyNotComparable = true;
        }

        actionResults.push({
          code: act.action_code,
          name: act.official_name,
          level: 'ACTION',
          expected_amount_fcfa: expectedActAmount,
          observed_sum_fcfa: expectedActAmount,
          delta_fcfa: expectedActAmount !== null ? 0 : null,
          status: actStatus,
          sub_items_count: 0,
          notes: expectedActAmount === null ? 'Montant de l\'action inconnu (null).' : undefined,
        });
      }
    }
  }

  // 4. Synthèse des projets liés (sans double comptage)
  const projects = data.projects || [];
  let totalProjectsSum: number | null = 0;
  let multiLineChecked = 0;
  let multiLineErrors = 0;
  let hasIncompleteSourceLines = false;

  for (const proj of projects) {
    if (typeof proj.consolidated_amount_2026_fcfa === 'number') {
      if (totalProjectsSum !== null) {
        totalProjectsSum += proj.consolidated_amount_2026_fcfa;
      }
    } else {
      totalProjectsSum = null;
    }

    if (proj.amount_derivation === 'SUM_OF_OFFICIAL_SOURCE_LINES') {
      multiLineChecked++;
      let hasNullLine = false;
      let linesSum = 0;

      for (const l of proj.source_lines) {
        const val = l.amount_2026_fcfa ?? l.amount_fcfa;
        if (typeof val === 'number') {
          linesSum += val;
        } else {
          hasNullLine = true;
        }
      }

      if (hasNullLine) {
        multiLineErrors++;
        hasIncompleteSourceLines = true;
        hasAnyNotComparable = true;
      } else if (linesSum !== proj.consolidated_amount_2026_fcfa) {
        multiLineErrors++;
        hasAnySourceGap = true;
      }
    }
  }

  let globalStatus: IngestionReconciliationStatus;
  if (hasAnySourceGap) {
    globalStatus = 'SOURCE_GAP';
  } else if (hasAnyNotComparable || ministryStatus === 'NOT_COMPARABLE') {
    globalStatus = 'NOT_COMPARABLE';
  } else if (ministryStatus === 'RECONCILED') {
    globalStatus = 'RECONCILED';
  } else {
    globalStatus = 'NOT_COMPARABLE';
  }

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
      has_incomplete_source_lines: hasIncompleteSourceLines,
    },
    global_status: globalStatus,
  };
}
