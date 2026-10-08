import inventory from '../../docs/budget-ingestion/LOT5_DOCUMENT_MANIFEST.json';
import supplement from '../../docs/overnight/DOCUMENTS.json';
import {
  verifyDocumentaryAudit,
  type DocumentaryAuditRecord,
  type DocumentAvailability,
  type SourceDocument,
} from './domain/documents';
import { OFFICIAL_FINANCIAL_AUDITS } from './domain/financialAudits';

export { OFFICIAL_FINANCIAL_AUDITS };

/**
 * Registre des contrôles documentaires indépendants traçables.
 *
 * Règle républicaine stricte :
 * La seule présence d'un champ déclaratif (ex: CONTROL_SCOPE dans le manifeste)
 * ne suffit JAMAIS à certifier une extraction comme VERIFIED.
 * L'extraction n'est certifiée VERIFIED que si elle est adossée à un contrôle
 * indépendant traçable correspondant au document exact, à son empreinte SHA-256,
 * à l'exercice budgétaire, avec un rapport de contrôle vérifiable.
 */
export const OFFICIAL_DOCUMENTARY_AUDITS: readonly DocumentaryAuditRecord[] = [
  {
    controlId: 'AUDIT-DGBF-LFI-2026-LOT5',
    documentId: 'DGBF-LFI-2026',
    documentSha256: 'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76',
    controlScope: 'Totaux de section et listes exhaustives de programmes LFI 2026 (sections 237, 334, 336, 362, 439, 440, 444)',
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
  },
  {
    controlId: 'AUDIT-DGBF-DPPD-PAP-2026-LOT5',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: '0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10',
    controlScope: 'Tableaux 7 DPPD-PAP 2026-2028 (25 programmes, 66 actions des 7 sections ministérielles LOT5)',
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
  },
];

/**
 * Public metadata of downloaded originals.
 *
 * Separation of documentary dimensions:
 * 1. Availability: Determined by HTTP 200 and LOCAL_AVAILABILITY === 'AVAILABLE'.
 * 2. Provenance: Authentic official source ('OFFICIAL_SOURCE').
 * 3. Extraction verification: 'VERIFIED' only if verified by an independent, traceable
 *    documentary audit record (verifyDocumentaryAudit) matching document ID, SHA-256 and year.
 *    Mere availability (HTTP 200) or declarative CONTROL_SCOPE alone NEVER infers verified extraction.
 * 4. Exact citation: Validated via resolveCitation.
 */
export const reviewDocuments: SourceDocument[] = [...inventory.documents, ...supplement.documents]
  .filter(d => 'HTTP_STATUS' in d && d.HTTP_STATUS === 200 && d.LOCAL_AVAILABILITY === 'AVAILABLE' && 'PDF_PAGES' in d)
  .map(d => {
    const auditResult = verifyDocumentaryAudit(
      { id: d.DOCUMENT_ID, sha256: d.SHA256, fiscalYear: d.FISCAL_YEAR },
      OFFICIAL_DOCUMENTARY_AUDITS,
    );
    const isExtractionVerified = auditResult.verified;
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
      verification: isExtractionVerified ? 'VERIFIED' : 'TO_VERIFY',
      extractionStatus: isExtractionVerified ? 'VERIFIED' : 'TO_VERIFY',
      controlScope: auditResult.matchingAudit?.controlScope ?? null,
      auditRecordId: auditResult.matchingAudit?.controlId ?? null,
      auditReportRef: auditResult.matchingAudit?.reportRef ?? null,
      visibility: 'PUBLIC',
      previousVersionId: null,
    };
  });


