import { describe, it, expect } from 'vitest';
import { compareHistory, openDataCsv, openDataJson } from '../domain/history';
import type { FinancialObservation } from '../domain/evidence';
import type { SourceDocument, FinancialAuditRecord } from '../domain/documents';

const evidence = (year: number) => ({ documentId: `test-${year}`, page: 1, reference: null, fiscalYear: year, verification: 'VERIFIED' as const });
const observation = (year: number, amount: number | null): FinancialObservation => ({
  institutionId: 'test-only', sectionCode: null,
  fiscalYear: year, scope: 'test-only', periodEnd: `${year}-12-31`, measure: 'PLANNED', basis: 'INITIAL_BUDGET',
  currency: 'XOF', amount, precision: 'EXACT', evidence: evidence(year)
});

const documents: SourceDocument[] = [2025, 2026].map(year => ({
  id: `test-${year}`, title: 'Test only', publisher: 'Test', officialUrl: 'https://example.org/test',
  fiscalYear: year, accessedAt: '2026-10-07', httpStatus: 200, sha256: 'a'.repeat(64), pageCount: 1,
  verification: 'VERIFIED', visibility: 'PUBLIC', previousVersionId: null,
  availability: 'AVAILABLE', provenance: 'OFFICIAL_SOURCE', extractionStatus: 'VERIFIED',
}));

const testAudits = (amt25 = 100, amt26 = 120): FinancialAuditRecord[] => [
  {
    controlId: `AUDIT-TEST-2025-${amt25}`, documentId: 'test-2025', documentSha256: 'a'.repeat(64),
    fiscalYear: 2025, controlStatus: 'VERIFIED', reportRef: 'test-report', institutionId: 'test-only',
    sectionCode: null, scope: 'test-only', measure: 'PLANNED', basis: 'INITIAL_BUDGET', currency: 'XOF',
    auditedAmount: amt25, page: 1,
  },
  {
    controlId: `AUDIT-TEST-2026-${amt26}`, documentId: 'test-2026', documentSha256: 'a'.repeat(64),
    fiscalYear: 2026, controlStatus: 'VERIFIED', reportRef: 'test-report', institutionId: 'test-only',
    sectionCode: null, scope: 'test-only', measure: 'PLANNED', basis: 'INITIAL_BUDGET', currency: 'XOF',
    auditedAmount: amt26, page: 1,
  },
];

const formulaAudits: FinancialAuditRecord[] = [
  {
    controlId: 'AUDIT-TEST-2026-FORMULA', documentId: 'test-2026', documentSha256: 'a'.repeat(64),
    fiscalYear: 2026, controlStatus: 'VERIFIED', reportRef: 'test-report', institutionId: 'test-only',
    sectionCode: null, scope: '=test-only()', measure: 'PLANNED', basis: 'INITIAL_BUDGET', currency: 'XOF',
    auditedAmount: 100, page: 1,
  },
];

describe('LOT 12 — history and portable public data', () => {
  it('requires evidence of cross-year comparability', () => {
    expect(compareHistory(observation(2025, 100), observation(2026, 120), null, documents, testAudits()).status).toBe('NOT_COMPARABLE');
    expect(compareHistory(observation(2025, 100), observation(2026, 120), evidence(2026), documents, testAudits())).toMatchObject({ nominalDelta: 20, value: 20 });
  });
  it('does not compute growth from a zero base or missing value', () => {
    expect(compareHistory(observation(2025, 0), observation(2026, 120), evidence(2026), documents, testAudits(0, 120))).toMatchObject({ nominalDelta: 120, value: null });
    expect(compareHistory(observation(2025, null), observation(2026, 120), evidence(2026), documents, testAudits(0, 120)).nominalDelta).toBeNull();
  });
  it('preserves NOT_COMPARABLE for incompatible scopes and sections', () => {
    expect(compareHistory(observation(2025, 100), { ...observation(2026, 120), scope: 'other' }, evidence(2026), documents, testAudits()).status).toBe('NOT_COMPARABLE');
    expect(compareHistory(observation(2025, 100), { ...observation(2026, 120), sectionCode: '444' }, evidence(2026), documents, testAudits()).status).toBe('NOT_COMPARABLE');
  });
  it('exports literal null and excludes arbitrary private payload fields', () => {
    const input = { ...observation(2026, null), email: 'private-test' };
    const json = openDataJson([input], documents, testAudits());
    expect(JSON.parse(json).records[0].amount).toBeNull();
    expect(json).not.toContain('private-test');
    expect(openDataCsv([input], documents, testAudits())).toContain(',null,');
  });
  it('does not export invalid or privately sourced amounts', () => {
    expect(JSON.parse(openDataJson([{ ...observation(2026, -1) }], documents, testAudits())).records[0].amount).toBeNull();
    expect(JSON.parse(openDataJson([observation(2026, 100)], documents.map(d => ({ ...d, visibility: 'PRIVATE' })), testAudits(100, 100))).records[0].source_url).toBeNull();
  });
  it('neutralizes spreadsheet formulas in string fields', () => {
    const csv = openDataCsv([{ ...observation(2026, 100), scope: '=test-only()' }], documents, formulaAudits);
    expect(csv).toContain('"\'=test-only()"');
  });
});
