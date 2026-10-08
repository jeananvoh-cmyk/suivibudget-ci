import { assessObservation, hasEvidence, isCalendarDate, type EvidenceRef, type FinancialObservation, type ReviewValue } from './evidence';

export type DocumentAvailability =
  | 'AVAILABLE'
  | 'AVAILABLE_FROM_PRIOR_OFFICIAL_ACQUISITION'
  | 'PENDING'
  | 'NOT_FOUND_PUBLICLY'
  | 'BLOCKED_NETWORK_POLICY';

export type DocumentProvenance =
  | 'OFFICIAL_SOURCE'
  | 'SECONDARY_SOURCE'
  | 'CITIZEN_OBSERVATION'
  | 'UNVERIFIED';

export type ExtractionVerificationStatus =
  | 'VERIFIED'
  | 'TO_VERIFY'
  | 'SOURCE_CONFLICT'
  | 'NOT_EXTRACTED';

export type DocumentaryVerificationStatus =
  | 'VERIFIED'
  | 'TO_VERIFY'
  | 'SOURCE_CONFLICT';

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
  /** Documentary verification status (authenticity and metadata confirmed). */
  verification: DocumentaryVerificationStatus;
  visibility: 'PUBLIC' | 'PRIVATE';
  previousVersionId: string | null;
  /** Physical/network availability status of the source document. */
  availability?: DocumentAvailability;
  /** Provenance and institutional origin of the document. */
  provenance?: DocumentProvenance;
  /** Status of financial data extraction verified against physical tables. */
  extractionStatus?: ExtractionVerificationStatus;
  /** Optional documentation of the verification audit scope. */
  controlScope?: string | null;
}

/** Only direct public HTTPS references; never display signed storage URLs or credentials. */
export function safeOfficialUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = '';
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
      if (parent.fiscalYear !== doc.fiscalYear) problems.add('VERSION_EXERCISE_CONFLICT');
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
    || !doc.sha256 || !/^[a-f0-9]{64}$/i.test(doc.sha256) || !doc.accessedAt || !isCalendarDate(doc.accessedAt)
    || !doc.title.trim() || !doc.publisher.trim()) return null;
  if (doc.provenance === 'UNVERIFIED') return null;
  if (doc.availability && doc.availability !== 'AVAILABLE') return null;
  if (doc.extractionStatus && doc.extractionStatus !== 'VERIFIED') return null;
  if (ref.page !== null && (!Number.isInteger(doc.pageCount) || ref.page > doc.pageCount! || ref.page < 1)) return null;
  const url = safeOfficialUrl(doc.officialUrl);
  if (!url) return null;
  const target = new URL(url);
  if (ref.page !== null) target.hash = `page=${ref.page}`;
  return { documentId: doc.id, title: doc.title, publisher: doc.publisher, url: target.href,
    fiscalYear: doc.fiscalYear, page: ref.page, reference: ref.reference, sha256: doc.sha256 };
}

/**
 * Assesses whether a financial observation meets all criteria to be published as official,
 * strictly requiring verified document availability, authentic provenance,
 * verified extraction status, and exact citation resolution.
 * Never allows publishing an amount simply because a PDF is available.
 */
export function canPublishOfficialObservation(
  observation: FinancialObservation,
  documents: readonly SourceDocument[],
): ReviewValue {
  const baseAssessment = assessObservation(observation);
  if (baseAssessment.status !== 'AVAILABLE') {
    return baseAssessment;
  }
  const citation = resolveCitation(observation.evidence, documents);
  if (!citation) {
    return { value: null, status: 'UNKNOWN', reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION'] };
  }
  return baseAssessment;
}

/** Public PDF metadata projection; strips arbitrary/private properties on incoming objects. */
export function publicDocumentMetadata(documents: readonly SourceDocument[], year: number): SourceDocument[] {
  return documents.flatMap(doc => {
    const citation = resolveCitation({ documentId: doc.id, page: 1, reference: null, fiscalYear: year, verification: 'VERIFIED' }, documents);
    return citation ? [{ id: doc.id, title: doc.title, publisher: doc.publisher, officialUrl: safeOfficialUrl(doc.officialUrl),
      fiscalYear: doc.fiscalYear, accessedAt: doc.accessedAt, httpStatus: doc.httpStatus, sha256: doc.sha256,
      pageCount: doc.pageCount, verification: doc.verification, visibility: doc.visibility, previousVersionId: doc.previousVersionId,
      availability: doc.availability, provenance: doc.provenance, extractionStatus: doc.extractionStatus, controlScope: doc.controlScope }] : [];
  });
}
