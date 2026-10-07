import { assessObservation, hasEvidence, type EvidenceRef, type FinancialObservation, type ReviewValue } from './evidence';
import { resolveCitation, type SourceDocument } from './documents';

/** Cross-year scope equivalence must be documented separately, not guessed from a shared name. */
export function compareHistory(before: FinancialObservation, after: FinancialObservation,
  equivalence: EvidenceRef | null, documents: readonly SourceDocument[]): ReviewValue & { nominalDelta: number | null } {
  const values = [assessObservation(before), assessObservation(after)];
  const blocked = values.find(v => v.status === 'BLOCKED') ?? values.find(v => v.status !== 'AVAILABLE');
  if (blocked) return { ...blocked, nominalDelta: null };
  const comparable = before.institutionId === after.institutionId && before.sectionCode === after.sectionCode
    && before.fiscalYear < after.fiscalYear && before.scope === after.scope && before.measure === after.measure
    && before.currency === after.currency && before.basis === after.basis
    && before.periodEnd.slice(5) === after.periodEnd.slice(5)
    && hasEvidence(equivalence, after.fiscalYear) && resolveCitation(equivalence, documents)
    && resolveCitation(before.evidence, documents) && resolveCitation(after.evidence, documents);
  if (!comparable) return { value: null, nominalDelta: null, status: 'NOT_COMPARABLE', reasons: ['DOCUMENTED_SCOPE_EQUIVALENCE_REQUIRED'] };
  const delta = after.amount! - before.amount!;
  return { nominalDelta: delta, value: before.amount === 0 ? null : delta / before.amount! * 100,
    status: 'AVAILABLE', reasons: before.amount === 0 ? ['ZERO_BASE_NO_PERCENTAGE'] : ['NOMINAL_COMPARISON_NO_INFLATION_ADJUSTMENT'] };
}

/** A fixed public schema: no source payload spread, credentials, names or private attributes. */
export function openDataRows(observations: readonly FinancialObservation[], documents: readonly SourceDocument[]) {
  return observations.map(o => {
    const assessment = assessObservation(o);
    const citation = resolveCitation(o.evidence, documents);
    const status = assessment.status === 'BLOCKED' ? 'BLOCKED' : citation ? assessment.status : 'UNKNOWN';
    return { institution_id: o.institutionId, section_code: o.sectionCode, fiscal_year: o.fiscalYear,
      scope: o.scope, period_end: o.periodEnd, measure: o.measure, basis: o.basis, currency: o.currency,
      amount: status === 'AVAILABLE' ? assessment.value : null, status,
      document_id: citation?.documentId ?? null, source_url: citation?.url ?? null, source_sha256: citation?.sha256 ?? null,
      source_page: citation?.page ?? null };
  });
}

export function openDataJson(observations: readonly FinancialObservation[], documents: readonly SourceDocument[]): string {
  return JSON.stringify({ schema_version: 1, unknown_encoding: 'null', records: openDataRows(observations, documents) }, null, 2);
}

export function openDataCsv(observations: readonly FinancialObservation[], documents: readonly SourceDocument[]): string {
  const columns = ['institution_id', 'section_code', 'fiscal_year', 'scope', 'period_end', 'measure', 'basis', 'currency',
    'amount', 'status', 'document_id', 'source_url', 'source_sha256', 'source_page'] as const;
  function cell(value: string | number | null) {
    if (value === null) return 'null';
    const text = String(value);
    const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return [columns.join(','), ...openDataRows(observations, documents).map(row => columns.map(key => cell(row[key])).join(','))].join('\r\n');
}
