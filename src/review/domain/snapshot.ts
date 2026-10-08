import { lot5Blocked, type FinancialObservation, type ReviewStatus } from './evidence';
import { catalogProblems, publicDocumentMetadata, type SourceDocument } from './documents';
import { openDataRows } from './history';

export interface ReviewScope { institutionId: string; sectionCode: string | null; fiscalYear: number }

/** Composition boundary for a future read-only loader. No aggregation or publication decision. */
export function buildReviewSnapshot(scope: ReviewScope, observations: readonly FinancialObservation[], documents: readonly SourceDocument[]) {
  const selected = observations.filter(o => o.institutionId === scope.institutionId && o.fiscalYear === scope.fiscalYear
    && o.sectionCode === scope.sectionCode);
  const records = openDataRows(selected, documents);
  const documentaryProblems = catalogProblems(documents);
  const dependent = lot5Blocked(scope.institutionId, scope.sectionCode, scope.fiscalYear);
  const status: ReviewStatus = dependent || documentaryProblems.length || records.some(r => r.status === 'BLOCKED') ? 'BLOCKED'
    : records.some(r => r.status === 'NOT_COMPARABLE') ? 'NOT_COMPARABLE'
      : records.length > 0 && records.every(r => r.status === 'AVAILABLE') ? 'AVAILABLE' : 'UNKNOWN';
  return { scope, status, records, documents: publicDocumentMetadata(documents, scope.fiscalYear),
    dependenciesBlocked: dependent ? ['LOT5_INCOMPLETE_LFI'] : [], documentaryProblems,
    publicationDecision: 'NOT_REQUESTED' as const };
}
