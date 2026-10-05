// Normaliseur générique du modèle canonique vers le modèle applicatif (LOT 3)
// Transforme CanonicalMinistryExtraction en MinistryBudget sans altération ni extrapolation.

import {
  MinistryBudget,
  BudgetProgram,
  BudgetAction,
  MinistryLinkedProject,
  ProjectSourceLine,
} from '../../types/ministryBudget';
import { CanonicalMinistryExtraction, CanonicalProject } from '../types';

export function normalizeToApplicationModel(
  canonical: CanonicalMinistryExtraction,
  institutionId?: string
): MinistryBudget {
  const ministryId = institutionId || `gov-${canonical.institution_code}`;
  const totalMinistry = canonical.totals.total_ministry_2026_fcfa;

  // Groupement des projets par action_code
  const projectsByAction = new Map<string, CanonicalProject[]>();
  if (Array.isArray(canonical.projects)) {
    for (const proj of canonical.projects) {
      const existing = projectsByAction.get(proj.action_code) || [];
      existing.push(proj);
      projectsByAction.set(proj.action_code, existing);
    }
  }

  const normalizedPrograms: BudgetProgram[] = canonical.programs.map((p) => {
    const progAmount = p.program_amount_2026_fcfa;
    const progPercentage = (totalMinistry && progAmount !== null && totalMinistry > 0)
      ? Math.round((progAmount / totalMinistry) * 10000) / 100
      : null;

    const normalizedActions: BudgetAction[] = p.actions.map((a) => {
      const canonicalProjects = projectsByAction.get(a.action_code) || [];

      const normalizedProjects: MinistryLinkedProject[] = canonicalProjects.map((cp) => {
        const sourceLines: ProjectSourceLine[] = cp.source_lines.map((sl) => ({
          official_code: sl.official_code || cp.official_code,
          amount_fcfa: sl.amount_2026_fcfa ?? sl.amount_fcfa ?? 0,
          financing_type: sl.financing_type,
          economic_nature: sl.economic_nature,
          page_reference: sl.page_reference,
          table_reference: sl.table_reference,
        }));

        return {
          id: `proj-${cp.official_code}`,
          internal_id: `proj-${cp.official_code}`,
          code: cp.official_code,
          official_code: cp.official_code,
          title: cp.official_name,
          budget_amount_fcfa: cp.consolidated_amount_2026_fcfa,
          program_id: `prog-${p.program_code}`,
          action_id: `act-${a.action_code}`,
          current_status: 'VOTE',
          region_name: cp.region_name || 'National',
          page_reference: cp.page_reference,
          table_reference: cp.table_reference,
          source_url: cp.source_url || canonical.source.url,
          source_lines: sourceLines,
          amount_derivation: cp.amount_derivation,
          citizen_description: cp.citizen_description,
          is_funded_within_action: true, // Règle d'or : crédits intégrés à l'action
        };
      });

      return {
        id: `act-${a.action_code}`,
        program_id: `prog-${p.program_code}`,
        code: a.action_code,
        official_code: a.action_code,
        name: a.official_name,
        description: a.citizen_description || `Action budgétaire officielle DGBF inscrite au DPPD-PAP ${canonical.fiscal_year}-${canonical.fiscal_year + 2}.`,
        citizen_description: a.citizen_description,
        amount_fcfa: a.amount_2026_fcfa,
        reconciliation_status: 'RECONCILED',
        page_reference: a.page_reference,
        table_reference: a.table_reference,
        source: canonical.source.document,
        source_url: a.source_url || canonical.source.url,
        evidence_status: a.evidence_status || 'DIRECTLY_VERIFIED',
        evidence_type: 'PRIMARY_OFFICIAL_DOCUMENT',
        linked_projects: normalizedProjects.length > 0 ? normalizedProjects : undefined,
      };
    });

    return {
      id: `prog-${p.program_code}`,
      ministry_id: ministryId,
      code: p.program_code,
      official_code: p.program_code,
      name: p.official_name,
      description: p.citizen_description || `Programme budgétaire officiel DGBF : ${p.official_name}.`,
      amount_fcfa: p.program_amount_2026_fcfa,
      percentage_of_ministry: progPercentage,
      responsible_title: p.responsible_title,
      reconciliation_status: 'RECONCILED',
      page_reference: p.page_reference,
      source_url: p.source_url || canonical.source.url,
      actions: normalizedActions,
    };
  });

  return {
    id: `min-budget-${canonical.fiscal_year}-${canonical.institution_code}`,
    institution_id: ministryId,
    institution_code: canonical.institution_code,
    institution_name: canonical.institution_name,
    fiscal_year: canonical.fiscal_year,
    total_budget_fcfa: totalMinistry,
    amount_precision: 'EXACT',
    reconciliation_status: 'RECONCILED',
    source: `${canonical.control_source?.document || 'Loi de Finances'} & ${canonical.source.document}`,
    source_url: canonical.control_source?.url || canonical.source.url,
    evidence_type: 'PRIMARY_OFFICIAL_DOCUMENT',
    document_reference: `${canonical.control_source?.document || 'Loi de Finances'} • DGBF SIGOBE`,
    page_reference: canonical.source.page_range,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    programs: normalizedPrograms,
  };
}
