import inventory from '../../docs/budget-ingestion/LOT5_DOCUMENT_MANIFEST.json';
import supplement from '../../docs/overnight/DOCUMENTS.json';
import type { DocumentAvailability, SourceDocument } from './domain/documents';

/**
 * Public metadata of downloaded originals.
 *
 * Separation of documentary dimensions:
 * 1. Availability: Determined by HTTP 200 and LOCAL_AVAILABILITY === 'AVAILABLE'.
 * 2. Provenance: Authentic official source ('OFFICIAL_SOURCE').
 * 3. Extraction verification: 'VERIFIED' only for documents with confirmed, audited
 *    control scope (e.g. LFI 2026 and DPPD-PAP Annexe 4 controlled against physical tables and section totals).
 *    Mere availability (HTTP 200) NEVER infers that financial extraction is verified.
 * 4. Exact citation: Validated via resolveCitation.
 */
export const reviewDocuments: SourceDocument[] = [...inventory.documents, ...supplement.documents]
  .filter(d => 'HTTP_STATUS' in d && d.HTTP_STATUS === 200 && d.LOCAL_AVAILABILITY === 'AVAILABLE' && 'PDF_PAGES' in d)
  .map(d => {
    const hasAuditedControlScope = 'CONTROL_SCOPE' in d && Boolean(d.CONTROL_SCOPE) && Boolean(d.SHA256);
    const availability: DocumentAvailability = d.LOCAL_AVAILABILITY === 'AVAILABLE' ? 'AVAILABLE' : 'PENDING';
    return {
      id: d.DOCUMENT_ID,
      title: d.TITLE,
      publisher: d.PUBLISHER,
      officialUrl: d.OFFICIAL_URL,
      fiscalYear: d.FISCAL_YEAR,
      accessedAt: d.ACCESS_DATE,
      httpStatus: 'HTTP_STATUS' in d ? d.HTTP_STATUS ?? null : null,
      sha256: d.SHA256,
      pageCount: 'PDF_PAGES' in d ? d.PDF_PAGES ?? null : null,
      availability,
      provenance: 'OFFICIAL_SOURCE',
      verification: hasAuditedControlScope ? 'VERIFIED' : 'TO_VERIFY',
      extractionStatus: hasAuditedControlScope ? 'VERIFIED' : 'TO_VERIFY',
      controlScope: 'CONTROL_SCOPE' in d ? String(d.CONTROL_SCOPE) : null,
      visibility: 'PUBLIC',
      previousVersionId: null,
    };
  });


