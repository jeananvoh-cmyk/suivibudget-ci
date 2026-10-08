import { assessObservation, hasEvidence, lot5Blocked, type EvidenceRef, type FinancialObservation } from './evidence';
import { resolveCitation, type SourceDocument } from './documents';

export interface DocumentedTarget {
  id: string;
  kind: 'PROJECT' | 'BUDGET';
  institutionId: string;
  sectionCode: string | null;
  fiscalYear: number;
  evidence: EvidenceRef | null;
}
export interface ProjectBudgetLink {
  projectId: string;
  budgetId: string;
  institutionId: string;
  fiscalYear: number;
  evidence: EvidenceRef | null;
  budget: FinancialObservation;
}
export interface PhysicalObservation {
  status: 'UNKNOWN' | 'DOCUMENTED';
  description: string | null;
  evidence: EvidenceRef | null;
}

export function assessTarget(target: DocumentedTarget, documents: readonly SourceDocument[]) {
  if (lot5Blocked(target.institutionId, target.sectionCode, target.fiscalYear)) return 'BLOCKED' as const;
  return target.id.trim() && target.institutionId.trim() && hasEvidence(target.evidence, target.fiscalYear)
    && resolveCitation(target.evidence, documents) ? 'AVAILABLE' as const : 'UNKNOWN' as const;
}

/** Edges establish documentary links only. No budget/project/contract aggregation is exposed. */
export function projectDossier(project: DocumentedTarget, links: readonly ProjectBudgetLink[],
  documents: readonly SourceDocument[], physical: PhysicalObservation | null = null) {
  const targetStatus = assessTarget(project, documents);
  const matching = links.filter(l => l.projectId === project.id);
  const duplicate = new Set(matching.map(l => l.budgetId)).size !== matching.length;
  const invalid = matching.some(l => l.institutionId !== project.institutionId || l.fiscalYear !== project.fiscalYear
    || l.budget.institutionId !== project.institutionId || l.budget.fiscalYear !== project.fiscalYear
    || l.budget.sectionCode !== project.sectionCode || !l.budgetId.trim()
    || !hasEvidence(l.evidence, project.fiscalYear) || !resolveCitation(l.evidence, documents));
  const status = duplicate || invalid || project.kind !== 'PROJECT' ? 'BLOCKED' as const : targetStatus;
  const linkedBudgets = status === 'AVAILABLE' ? matching.map(link => {
    const result = assessObservation(link.budget);
    const citation = resolveCitation(link.budget.evidence, documents);
    return { budgetId: link.budgetId, amount: citation ? result.value : null,
      status: result.status === 'BLOCKED' ? 'BLOCKED' : citation ? result.status : 'UNKNOWN', citation };
  }) : [];
  const physicalEvidence = physical?.status === 'DOCUMENTED' && physical.description?.trim()
    && hasEvidence(physical.evidence, project.fiscalYear) && resolveCitation(physical.evidence, documents);
  return { projectId: project.id, status, linkedBudgets,
    physical: status === 'AVAILABLE' && physicalEvidence ? { status: 'DOCUMENTED', description: physical!.description,
      citation: physicalEvidence } : { status: 'UNKNOWN', description: null, citation: null } };
}
