import { hasEvidence, assessObservation, type EvidenceRef, type FinancialObservation, type ReviewStatus, type ReviewValue } from './evidence';
import {
  canPublishOfficialObservation,
  resolveCitation,
  areDocumentIdsEquivalent,
  type SourceDocument,
  type FinancialAuditRecord,
  OFFICIAL_FINANCIAL_AUDITS,
} from './documents';

/** Cross-year scope equivalence must be documented separately, not guessed from a shared name. */
export function compareHistory(
  before: FinancialObservation,
  after: FinancialObservation,
  equivalence: EvidenceRef | null,
  documents: readonly SourceDocument[],
  financialAudits: readonly FinancialAuditRecord[] = OFFICIAL_FINANCIAL_AUDITS,
): ReviewValue & { nominalDelta: number | null } {
  const comparable = before.institutionId === after.institutionId && before.sectionCode === after.sectionCode
    && before.fiscalYear < after.fiscalYear && before.scope === after.scope && before.measure === after.measure
    && before.currency === after.currency && before.basis === after.basis
    && before.periodEnd.slice(5) === after.periodEnd.slice(5)
    && hasEvidence(equivalence, after.fiscalYear) && resolveCitation(equivalence, documents)
    && resolveCitation(before.evidence, documents) && resolveCitation(after.evidence, documents);
  if (!comparable) return { value: null, nominalDelta: null, status: 'NOT_COMPARABLE', reasons: ['DOCUMENTED_SCOPE_EQUIVALENCE_REQUIRED'] };

  const hasBeforeAudit = financialAudits.some(a => areDocumentIdsEquivalent(a.documentId, before.evidence?.documentId ?? ''));
  const hasAfterAudit = financialAudits.some(a => areDocumentIdsEquivalent(a.documentId, after.evidence?.documentId ?? ''));

  const beforeAssessment = hasBeforeAudit ? canPublishOfficialObservation(before, documents, financialAudits) : assessObservation(before);
  const afterAssessment = hasAfterAudit ? canPublishOfficialObservation(after, documents, financialAudits) : assessObservation(after);

  const values = [beforeAssessment, afterAssessment];
  const blocked = values.find(v => v.status === 'BLOCKED') ?? values.find(v => v.status !== 'AVAILABLE');
  if (blocked) return { ...blocked, value: null, nominalDelta: null };

  const delta = after.amount! - before.amount!;
  return {
    nominalDelta: delta,
    value: before.amount === 0 ? null : delta / before.amount! * 100,
    status: 'AVAILABLE',
    reasons: before.amount === 0 ? ['ZERO_BASE_NO_PERCENTAGE'] : ['NOMINAL_COMPARISON_NO_INFLATION_ADJUSTMENT'],
  };
}

/** A fixed public schema: no source payload spread, credentials, names or private attributes. */
export function openDataRows(
  observations: readonly FinancialObservation[],
  documents: readonly SourceDocument[],
  financialAudits: readonly FinancialAuditRecord[] = OFFICIAL_FINANCIAL_AUDITS,
) {
  return observations.map(o => {
    const assessment = canPublishOfficialObservation(o, documents, financialAudits);
    const citation = resolveCitation(o.evidence, documents);
    const status = assessment.status;
    return {
      institution_id: o.institutionId,
      section_code: o.sectionCode,
      fiscal_year: o.fiscalYear,
      scope: o.scope,
      period_end: o.periodEnd,
      measure: o.measure,
      basis: o.basis,
      currency: o.currency,
      amount: status === 'AVAILABLE' ? assessment.value : null,
      status,
      document_id: citation?.documentId ?? null,
      source_url: citation?.url ?? null,
      source_sha256: citation?.sha256 ?? null,
      source_page: citation?.page ?? null,
    };
  });
}

export function openDataJson(
  observations: readonly FinancialObservation[],
  documents: readonly SourceDocument[],
  financialAudits: readonly FinancialAuditRecord[] = OFFICIAL_FINANCIAL_AUDITS,
): string {
  return JSON.stringify({
    schema_version: 1,
    unknown_encoding: 'null',
    records: openDataRows(observations, documents, financialAudits),
  }, null, 2);
}

export function openDataCsv(
  observations: readonly FinancialObservation[],
  documents: readonly SourceDocument[],
  financialAudits: readonly FinancialAuditRecord[] = OFFICIAL_FINANCIAL_AUDITS,
): string {
  const columns = ['institution_id', 'section_code', 'fiscal_year', 'scope', 'period_end', 'measure', 'basis', 'currency',
    'amount', 'status', 'document_id', 'source_url', 'source_sha256', 'source_page'] as const;
  function cell(value: string | number | null) {
    if (value === null) return 'null';
    const text = String(value);
    const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return [
    columns.join(','),
    ...openDataRows(observations, documents, financialAudits).map(row => columns.map(key => cell(row[key])).join(',')),
  ].join('\r\n');
}

/**
 * Agrégation contrôlée d'observations financières.
 * Règle d'or républicaine : si une seule observation est rejetée ou non vérifiée,
 * l'agrégat entier est strictement rejeté (null / UNKNOWN ou BLOCKED).
 */
export function aggregateObservations(
  observations: readonly FinancialObservation[],
  documents: readonly SourceDocument[],
  financialAudits: readonly FinancialAuditRecord[] = OFFICIAL_FINANCIAL_AUDITS,
): ReviewValue {
  if (observations.length === 0) {
    return { value: 0, status: 'AVAILABLE', reasons: [] };
  }
  let sum = 0;
  let blockedStatus: ReviewStatus | null = null;
  const reasons: string[] = [];

  for (const o of observations) {
    const assessed = canPublishOfficialObservation(o, documents, financialAudits);
    if (assessed.status !== 'AVAILABLE') {
      if (assessed.status === 'BLOCKED') {
        blockedStatus = 'BLOCKED';
      } else if (!blockedStatus && assessed.status === 'NOT_COMPARABLE') {
        blockedStatus = 'NOT_COMPARABLE';
      } else if (!blockedStatus) {
        blockedStatus = 'UNKNOWN';
      }
      reasons.push(...assessed.reasons);
    } else {
      sum += assessed.value!;
    }
  }

  if (blockedStatus) {
    return {
      value: null,
      status: blockedStatus,
      reasons: ['AGGREGATE_CONTAINS_UNVERIFIED_AMOUNT', ...reasons],
    };
  }

  return { value: sum, status: 'AVAILABLE', reasons: [] };
}
