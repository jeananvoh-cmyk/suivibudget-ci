import { describe, it, expect } from 'vitest';
import { assessObservation, isCalendarDate, type FinancialObservation } from '../domain/evidence';
import { publicDocumentMetadata, resolveCitation, type SourceDocument, type FinancialAuditRecord } from '../domain/documents';
import { performanceGap, type PerformanceIndicator } from '../domain/execution';
import { buildReviewSnapshot } from '../domain/snapshot';
const evidence = { documentId: 'test-only', page: 1, reference: null, fiscalYear: 2026, verification: 'VERIFIED' as const };
const doc: SourceDocument = { id: 'test-only', title: 'Test only', publisher: 'Test only', officialUrl: 'https://example.org/test',
  fiscalYear: 2026, accessedAt: '2026-10-07', httpStatus: 200, sha256: 'a'.repeat(64), pageCount: 1,
  verification: 'VERIFIED', visibility: 'PUBLIC', previousVersionId: null,
  availability: 'AVAILABLE', provenance: 'OFFICIAL_SOURCE', extractionStatus: 'VERIFIED' };
const observation: FinancialObservation = { institutionId: 'test-only', sectionCode: null, fiscalYear: 2026, scope: 'test-only',
  periodEnd: '2026-12-31', currency: 'XOF', basis: 'FINAL_CREDITS', measure: 'PLANNED', amount: 100, precision: 'EXACT', evidence };
const testAudits: FinancialAuditRecord[] = [{
  controlId: 'AUDIT-TEST-336', documentId: 'test-only', documentSha256: 'a'.repeat(64),
  fiscalYear: 2026, controlStatus: 'VERIFIED', reportRef: 'test-report',
  institutionId: 'gov-017', sectionCode: '336', scope: 'test-only',
  measure: 'PLANNED', basis: 'FINAL_CREDITS', currency: 'XOF', auditedAmount: 100, page: 1,
}];
describe('LOT 15 — end-to-end documentary boundaries', () => {
  it('rejects impossible calendar dates instead of normalizing them', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(assessObservation({ ...observation, periodEnd: '2026-02-30' }).status).toBe('NOT_COMPARABLE');
  });
  it('does not let a section reference hide an invalid page', () => {
    expect(assessObservation({ ...observation, evidence: { ...evidence, page: -1, reference: 'test' } }).value).toBeNull();
  });
  it('requires a real access date and strips private metadata at export', () => {
    expect(resolveCitation(evidence, [{ ...doc, accessedAt: '2026-02-30' }])).toBeNull();
    const result = publicDocumentMetadata([{ ...doc, privateContact: 'private-test' } as SourceDocument], 2026);
    expect(JSON.stringify(result)).not.toContain('private-test');
  });
  it('removes the resolved LOT 5 blocker without requesting publication', () => {
    const scope = { institutionId: 'gov-017', sectionCode: '336', fiscalYear: 2026 };
    const result = buildReviewSnapshot(scope, [{ ...observation, ...scope }], [doc], testAudits);
    expect(result.status).toBe('AVAILABLE');
    expect(result.records[0].amount).toBe(100);
    expect(result.publicationDecision).toBe('NOT_REQUESTED');
    expect(buildReviewSnapshot(scope, [], [doc], testAudits).status).toBe('UNKNOWN');
  });
  it('keeps empty data unknown and filters unrelated institutional observations', () => {
    const scope = { institutionId: 'other-test', sectionCode: null, fiscalYear: 2026 };
    expect(buildReviewSnapshot(scope, [observation], [doc])).toMatchObject({ status: 'UNKNOWN', records: [] });
  });
  it('retains NOT_COMPARABLE through the export layer', () => {
    const scope = { institutionId: 'test-only', sectionCode: null, fiscalYear: 2026 };
    const result = buildReviewSnapshot(scope, [{ ...observation, periodEnd: '2026-02-30' }], [doc]);
    expect(result.records[0].status).toBe('NOT_COMPARABLE');
    expect(result.records[0].amount).toBeNull();
  });
  it('treats performance indicators separately from money and does not infer success', () => {
    const indicator: PerformanceIndicator = { institutionId: 'test-only', sectionCode: null, fiscalYear: 2026,
      label: 'Test indicator only', unit: 'test-unit', periodEnd: '2026-12-31', target: { value: 1.5, evidence }, observed: { value: 1.2, evidence } };
    const result = performanceGap(indicator, [doc]);
    expect(result.value).toBeCloseTo(-0.3);
    expect(result.reasons).toContain('GAP_ONLY_NO_SUCCESS_INFERENCE');
    expect(performanceGap({ ...indicator, observed: null }, [doc]).value).toBeNull();
    expect(performanceGap({ ...indicator, sectionCode: '334' }, [doc]).status).toBe('AVAILABLE');
  });
});
