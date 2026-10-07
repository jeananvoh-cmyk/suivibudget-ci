import { describe, it, expect } from 'vitest';
import { compareHistory, openDataCsv, openDataJson } from '../domain/history';
import type { FinancialObservation } from '../domain/evidence';
import type { SourceDocument } from '../domain/documents';
const evidence = (year: number) => ({ documentId: `test-${year}`, page: 1, reference: null, fiscalYear: year, verification: 'VERIFIED' as const });
const observation = (year: number, amount: number | null): FinancialObservation => ({ institutionId: 'test-only', sectionCode: null,
  fiscalYear: year, scope: 'test-only', periodEnd: `${year}-12-31`, measure: 'PLANNED', basis: 'INITIAL_BUDGET',
  currency: 'XOF', amount, precision: 'EXACT', evidence: evidence(year) });
const documents: SourceDocument[] = [2025, 2026].map(year => ({ id: `test-${year}`, title: 'Test only', publisher: 'Test', officialUrl: 'https://example.org/test',
  fiscalYear: year, accessedAt: '2026-10-07', httpStatus: 200, sha256: 'a'.repeat(64), pageCount: 1,
  verification: 'VERIFIED', visibility: 'PUBLIC', previousVersionId: null }));
describe('LOT 12 — history and portable public data', () => {
  it('requires evidence of cross-year comparability', () => {
    expect(compareHistory(observation(2025, 100), observation(2026, 120), null, documents).status).toBe('NOT_COMPARABLE');
    expect(compareHistory(observation(2025, 100), observation(2026, 120), evidence(2026), documents)).toMatchObject({ nominalDelta: 20, value: 20 });
  });
  it('does not compute growth from a zero base or missing value', () => {
    expect(compareHistory(observation(2025, 0), observation(2026, 120), evidence(2026), documents)).toMatchObject({ nominalDelta: 120, value: null });
    expect(compareHistory(observation(2025, null), observation(2026, 120), evidence(2026), documents).nominalDelta).toBeNull();
  });
  it('blocks incompatible scopes and incomplete ministries', () => {
    expect(compareHistory(observation(2025, 100), { ...observation(2026, 120), scope: 'other' }, evidence(2026), documents).status).toBe('NOT_COMPARABLE');
    expect(compareHistory(observation(2025, 100), { ...observation(2026, 120), sectionCode: '444' }, evidence(2026), documents).status).toBe('BLOCKED');
  });
  it('exports literal null and excludes arbitrary private payload fields', () => {
    const input = { ...observation(2026, null), email: 'private-test' };
    const json = openDataJson([input], documents);
    expect(JSON.parse(json).records[0].amount).toBeNull();
    expect(json).not.toContain('private-test');
    expect(openDataCsv([input], documents)).toContain(',null,');
  });
  it('does not export blocked or privately sourced amounts', () => {
    expect(JSON.parse(openDataJson([{ ...observation(2026, 100), sectionCode: '336' }], documents)).records[0].amount).toBeNull();
    expect(JSON.parse(openDataJson([observation(2026, 100)], documents.map(d => ({ ...d, visibility: 'PRIVATE' })))).records[0].source_url).toBeNull();
  });
  it('neutralizes spreadsheet formulas in string fields', () => {
    const csv = openDataCsv([{ ...observation(2026, 100), scope: '=test-only()' }], documents);
    expect(csv).toContain('"\'=test-only()"');
  });
});
