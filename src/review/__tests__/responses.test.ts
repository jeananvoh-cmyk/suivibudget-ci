import { describe, it, expect } from 'vitest';
import { institutionalRecord, type InstitutionalStatement } from '../domain/responses';
import type { DocumentedTarget } from '../domain/projects';
import type { SourceDocument } from '../domain/documents';
const evidence = { documentId: 'test-doc', page: 1, reference: null, fiscalYear: 2026, verification: 'VERIFIED' as const };
const doc: SourceDocument = { id: 'test-doc', title: 'Test only', publisher: 'Test', officialUrl: 'https://example.org/test', fiscalYear: 2026,
  accessedAt: '2026-01-01', httpStatus: 200, sha256: 'b'.repeat(64), pageCount: 1, verification: 'VERIFIED', visibility: 'PUBLIC', previousVersionId: null };
const target: DocumentedTarget = { id: 'test-target', kind: 'PROJECT', institutionId: 'test-only', sectionCode: null, fiscalYear: 2026, evidence };
const response: InstitutionalStatement = { id: 'test-response', targetId: target.id, institutionId: target.institutionId, fiscalYear: 2026,
  kind: 'INSTITUTION_RESPONSE', publicText: 'Test only', publicationStatus: 'PUBLISHED', privacyReviewed: true, evidence };
describe('LOT 11 — institutional responses and official control', () => {
  it('keeps a response distinct from an audit and independent verification', () => {
    const result = institutionalRecord(target, [response, { ...response, id: 'audit', kind: 'OFFICIAL_AUDIT' }], [doc]);
    expect(result.responses[0].provenance).toBe('INSTITUTION_RESPONSE');
    expect(result.audits[0].provenance).toBe('OFFICIAL_SOURCE');
    expect(result.independentVerification).toBe('UNKNOWN');
  });
  it('does not treat absence of a response as refusal or lack of action', () => {
    expect(institutionalRecord(target, [], [doc]).status).toBe('UNKNOWN');
  });
  it('rejects wrong institutional or fiscal scope', () => {
    expect(institutionalRecord(target, [{ ...response, fiscalYear: 2025 }], [doc]).status).toBe('BLOCKED');
    expect(institutionalRecord(target, [{ ...response, institutionId: 'other' }], [doc]).status).toBe('BLOCKED');
  });
  it('omits unpublished or unsourced responses', () => {
    expect(institutionalRecord(target, [{ ...response, publicationStatus: 'DRAFT' }], [doc]).responses).toEqual([]);
    expect(institutionalRecord(target, [{ ...response, evidence: null }], [doc]).responses).toEqual([]);
  });
  it('removes the resolved LOT 5 dependency and rejects duplicate statements', () => {
    expect(institutionalRecord({ ...target, sectionCode: '334' }, [response], [doc]).status).toBe('AVAILABLE');
    expect(institutionalRecord(target, [response, response], [doc]).status).toBe('BLOCKED');
  });
});
