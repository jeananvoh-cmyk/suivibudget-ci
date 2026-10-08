import inventory from '../../docs/budget-ingestion/LOT5_DOCUMENT_MANIFEST.json';
import supplement from '../../docs/overnight/DOCUMENTS.json';
import type { SourceDocument } from './domain/documents';

/** Public metadata of downloaded originals. This does not validate any extracted financial dataset. */
export const reviewDocuments: SourceDocument[] = [...inventory.documents, ...supplement.documents]
  .filter(d => 'HTTP_STATUS' in d && d.HTTP_STATUS === 200 && d.LOCAL_AVAILABILITY === 'AVAILABLE' && 'PDF_PAGES' in d)
  .map(d => ({ id: d.DOCUMENT_ID, title: d.TITLE, publisher: d.PUBLISHER, officialUrl: d.OFFICIAL_URL,
    fiscalYear: d.FISCAL_YEAR, accessedAt: d.ACCESS_DATE,
    httpStatus: 'HTTP_STATUS' in d ? d.HTTP_STATUS ?? null : null, sha256: d.SHA256,
    pageCount: 'PDF_PAGES' in d ? d.PDF_PAGES ?? null : null, verification: 'VERIFIED', visibility: 'PUBLIC', previousVersionId: null }));
