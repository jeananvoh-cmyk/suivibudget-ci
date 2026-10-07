import { describe, expect, it } from 'vitest';
import { catalogProblems, resolveCitation, safeOfficialUrl, type SourceDocument } from '../domain/documents';
const doc: SourceDocument = { id: 'test-only', title: 'Test only', publisher: 'Test only', officialUrl: 'https://example.org/test.pdf',
  fiscalYear: 2026, accessedAt: '2026-10-07', httpStatus: 200, sha256: 'a'.repeat(64), pageCount: 2,
  verification: 'VERIFIED', visibility: 'PUBLIC', previousVersionId: null };
const ref = { documentId: doc.id, page: 1, reference: null, fiscalYear: 2026, verification: 'VERIFIED' as const };
describe('LOT 8 — documentary catalog', () => {
  it('resolves a page against a public verified original', () => {
    expect(resolveCitation(ref, [doc])?.url).toBe('https://example.org/test.pdf#page=1');
  });
  it.each(['javascript:alert(1)', 'http://example.org', 'https://user:password@example.org', 'https://example.org?token=secret'])('rejects unsafe reference %s', url => {
    expect(safeOfficialUrl(url)).toBeNull();
  });
  it('does not expose private documents or unverified hashes', () => {
    expect(resolveCitation(ref, [{ ...doc, visibility: 'PRIVATE' }])).toBeNull();
    expect(resolveCitation(ref, [{ ...doc, sha256: null }])).toBeNull();
    expect(resolveCitation(ref, [{ ...doc, verification: 'TO_VERIFY' }])).toBeNull();
  });
  it('rejects wrong years, missing references and pages outside the document', () => {
    expect(resolveCitation({ ...ref, page: 3 }, [doc])).toBeNull();
    expect(resolveCitation({ ...ref, fiscalYear: 2025 }, [doc])).toBeNull();
    expect(resolveCitation({ ...ref, page: null }, [doc])).toBeNull();
  });
  it('rejects duplicate identity and cyclic or orphan versions', () => {
    expect(catalogProblems([doc, doc])).toContain('DUPLICATE_OR_EMPTY_DOCUMENT_ID');
    expect(catalogProblems([{ ...doc, previousVersionId: doc.id }])).toContain('VERSION_CYCLE');
    expect(catalogProblems([{ ...doc, previousVersionId: 'missing' }])).toContain('MISSING_PREVIOUS_VERSION');
  });
});
