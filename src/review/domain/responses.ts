import { hasEvidence, type EvidenceRef } from './evidence';
import { assessTarget, type DocumentedTarget } from './projects';
import { resolveCitation, type SourceDocument } from './documents';

export interface InstitutionalStatement {
  id: string;
  targetId: string;
  institutionId: string;
  fiscalYear: number;
  kind: 'INSTITUTION_RESPONSE' | 'OFFICIAL_AUDIT';
  publicText: string;
  publicationStatus: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
  privacyReviewed: boolean;
  evidence: EvidenceRef | null;
}

/** A right of reply is attributed evidence, never an automatic verification of the project. */
export function institutionalRecord(target: DocumentedTarget, statements: readonly InstitutionalStatement[], documents: readonly SourceDocument[]) {
  const targetStatus = assessTarget(target, documents);
  const candidates = statements.filter(s => s.targetId === target.id && s.publicationStatus === 'PUBLISHED' && s.privacyReviewed);
  const inconsistent = new Set(candidates.map(s => s.id)).size !== candidates.length
    || candidates.some(s => !s.id.trim() || s.institutionId !== target.institutionId || s.fiscalYear !== target.fiscalYear);
  if (targetStatus !== 'AVAILABLE' || inconsistent) return {
    status: inconsistent ? 'BLOCKED' as const : targetStatus, responses: [], audits: [], independentVerification: 'UNKNOWN' as const,
  };
  const documented = candidates.flatMap(s => {
    const citation = hasEvidence(s.evidence, s.fiscalYear) ? resolveCitation(s.evidence, documents) : null;
    return citation && s.publicText.trim() ? [{ id: s.id, text: s.publicText, kind: s.kind,
      provenance: s.kind === 'INSTITUTION_RESPONSE' ? 'INSTITUTION_RESPONSE' as const : 'OFFICIAL_SOURCE' as const,
      citation }] : [];
  });
  return { status: documented.length ? 'AVAILABLE' as const : 'UNKNOWN' as const,
    responses: documented.filter(s => s.kind === 'INSTITUTION_RESPONSE'),
    audits: documented.filter(s => s.kind === 'OFFICIAL_AUDIT'), independentVerification: 'UNKNOWN' as const };
}
