import { hasEvidence, type EvidenceRef } from './evidence';

export interface SourceDocument {
  id: string;
  title: string;
  publisher: string;
  officialUrl: string | null;
  fiscalYear: number | null;
  accessedAt: string | null;
  httpStatus: number | null;
  sha256: string | null;
  pageCount: number | null;
  verification: 'VERIFIED' | 'TO_VERIFY' | 'SOURCE_CONFLICT';
  visibility: 'PUBLIC' | 'PRIVATE';
  previousVersionId: string | null;
}

/** Only direct public HTTPS references; never display signed storage URLs or credentials. */
export function safeOfficialUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search ? url.href : null;
  } catch { return null; }
}

export function catalogProblems(documents: readonly SourceDocument[]): string[] {
  const problems = new Set<string>();
  const ids = new Set<string>();
  for (const doc of documents) {
    if (!doc.id.trim() || ids.has(doc.id)) problems.add('DUPLICATE_OR_EMPTY_DOCUMENT_ID');
    ids.add(doc.id);
    const visited = new Set([doc.id]);
    let previous = doc.previousVersionId;
    while (previous) {
      if (visited.has(previous)) { problems.add('VERSION_CYCLE'); break; }
      visited.add(previous);
      const parent = documents.find(d => d.id === previous);
      if (!parent) { problems.add('MISSING_PREVIOUS_VERSION'); break; }
      previous = parent.previousVersionId;
    }
  }
  return [...problems];
}

export function resolveCitation(ref: EvidenceRef | null, documents: readonly SourceDocument[]) {
  if (!ref || !hasEvidence(ref, ref.fiscalYear) || catalogProblems(documents).length) return null;
  const doc = documents.find(d => d.id === ref.documentId);
  if (!doc || doc.verification !== 'VERIFIED' || doc.visibility !== 'PUBLIC'
    || doc.fiscalYear !== ref.fiscalYear || doc.httpStatus !== 200
    || !doc.sha256 || !/^[a-f0-9]{64}$/i.test(doc.sha256) || !doc.accessedAt
    || !doc.title.trim() || !doc.publisher.trim()) return null;
  if (ref.page !== null && (!Number.isInteger(doc.pageCount) || ref.page > doc.pageCount! || ref.page < 1)) return null;
  const url = safeOfficialUrl(doc.officialUrl);
  if (!url) return null;
  const target = new URL(url);
  if (ref.page !== null) target.hash = `page=${ref.page}`;
  return { documentId: doc.id, title: doc.title, publisher: doc.publisher, url: target.href,
    fiscalYear: doc.fiscalYear, page: ref.page, reference: ref.reference, sha256: doc.sha256 };
}
