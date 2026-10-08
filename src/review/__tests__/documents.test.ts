import { describe, expect, it } from 'vitest';
import {
  catalogProblems,
  resolveCitation,
  safeOfficialUrl,
  canPublishOfficialObservation,
  publicDocumentMetadata,
  type SourceDocument,
} from '../domain/documents';
import { reviewDocuments } from '../catalog';
import type { FinancialObservation } from '../domain/evidence';

const doc: SourceDocument = {
  id: 'test-only',
  title: 'Test only',
  publisher: 'Test only',
  officialUrl: 'https://example.org/test.pdf',
  fiscalYear: 2026,
  accessedAt: '2026-10-07',
  httpStatus: 200,
  sha256: 'a'.repeat(64),
  pageCount: 2,
  verification: 'VERIFIED',
  visibility: 'PUBLIC',
  previousVersionId: null,
  availability: 'AVAILABLE',
  provenance: 'OFFICIAL_SOURCE',
  extractionStatus: 'VERIFIED',
};

const ref = { documentId: doc.id, page: 1, reference: null, fiscalYear: 2026, verification: 'VERIFIED' as const };

const observation: FinancialObservation = {
  institutionId: 'gov-003',
  sectionCode: '237',
  fiscalYear: 2026,
  scope: 'SECTION_TOTAL',
  periodEnd: '2026-12-31',
  currency: 'XOF',
  measure: 'ORDERED',
  basis: 'INITIAL_BUDGET',
  amount: 45121940916,
  precision: 'EXACT',
  evidence: ref,
};

describe('LOT 8 — documentary catalog', () => {
  it('resolves a page against a public verified original', () => {
    expect(resolveCitation(ref, [doc])?.url).toBe('https://example.org/test.pdf#page=1');
  });

  it.each(['javascript:alert(1)', 'http://example.org', 'https://user:password@example.org', 'https://example.org?token=secret'])(
    'rejects unsafe reference %s',
    url => {
      expect(safeOfficialUrl(url)).toBeNull();
    },
  );

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

  describe('Separation of availability, provenance, and extraction verification', () => {
    it('rejects citation if document is available but documentary verification is TO_VERIFY', () => {
      const availableUnverified: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        verification: 'TO_VERIFY',
      };
      expect(resolveCitation(ref, [availableUnverified])).toBeNull();
    });

    it('rejects citation if document is available but financial extraction is TO_VERIFY', () => {
      const unverifiedExtraction: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        extractionStatus: 'TO_VERIFY',
      };
      expect(resolveCitation(ref, [unverifiedExtraction])).toBeNull();
    });

    it('rejects citation if document has UNVERIFIED provenance', () => {
      const unverifiedProvenance: SourceDocument = {
        ...doc,
        provenance: 'UNVERIFIED',
      };
      expect(resolveCitation(ref, [unverifiedProvenance])).toBeNull();
    });

    it('rejects citation if document availability is PENDING or NOT_FOUND_PUBLICLY', () => {
      expect(resolveCitation(ref, [{ ...doc, availability: 'PENDING' }])).toBeNull();
      expect(resolveCitation(ref, [{ ...doc, availability: 'NOT_FOUND_PUBLICLY' }])).toBeNull();
      expect(resolveCitation(ref, [{ ...doc, availability: 'BLOCKED_NETWORK_POLICY' }])).toBeNull();
    });

    it('never allows publishing an official amount when the cited document is available but unverified', () => {
      const availableUnverified: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        httpStatus: 200,
        verification: 'TO_VERIFY',
        extractionStatus: 'TO_VERIFY',
      };
      const result = canPublishOfficialObservation(observation, [availableUnverified]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    it('never allows publishing an official amount when extractionStatus is TO_VERIFY even if verification is VERIFIED', () => {
      const unverifiedExtraction: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        httpStatus: 200,
        verification: 'VERIFIED',
        extractionStatus: 'TO_VERIFY',
      };
      const result = canPublishOfficialObservation(observation, [unverifiedExtraction]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    it('allows publishing an official amount when availability, provenance, verification, and extraction are all verified', () => {
      const fullyVerified: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        httpStatus: 200,
        provenance: 'OFFICIAL_SOURCE',
        verification: 'VERIFIED',
        extractionStatus: 'VERIFIED',
      };
      const result = canPublishOfficialObservation(observation, [fullyVerified]);
      expect(result.status).toBe('AVAILABLE');
      expect(result.value).toBe(45121940916);
      expect(result.reasons).toEqual([]);
    });

    it('preserves existing verified primary documents without arbitrary downgrades', () => {
      const lfi = reviewDocuments.find(d => d.id === 'DGBF-LFI-2026');
      const dppd = reviewDocuments.find(d => d.id === 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4');

      expect(lfi).toBeDefined();
      expect(lfi?.verification).toBe('VERIFIED');
      expect(lfi?.extractionStatus).toBe('VERIFIED');
      expect(lfi?.provenance).toBe('OFFICIAL_SOURCE');
      expect(lfi?.availability).toBe('AVAILABLE');

      expect(dppd).toBeDefined();
      expect(dppd?.verification).toBe('VERIFIED');
      expect(dppd?.extractionStatus).toBe('VERIFIED');
      expect(dppd?.provenance).toBe('OFFICIAL_SOURCE');
      expect(dppd?.availability).toBe('AVAILABLE');
    });

    it('includes orthogonal statuses in publicDocumentMetadata projection', () => {
      const meta = publicDocumentMetadata([doc], 2026);
      expect(meta).toHaveLength(1);
      expect(meta[0].availability).toBe('AVAILABLE');
      expect(meta[0].provenance).toBe('OFFICIAL_SOURCE');
      expect(meta[0].extractionStatus).toBe('VERIFIED');
    });
  });
});
