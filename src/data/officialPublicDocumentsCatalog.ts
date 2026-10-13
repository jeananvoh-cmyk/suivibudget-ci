import type { PublicDocument } from '../types/publicDocument';
import { isDocumentSha256, safeOfficialUrl, verifyDocumentaryAudit, type SourceDocument } from '../review/domain/documents';
import { OFFICIAL_DOCUMENTARY_AUDITS } from '../review/catalog';

type OfficialPublicDocument = PublicDocument & {
  budget_nature?: 'INITIAL_BUDGET' | 'MULTI_YEAR_PROGRAM' | 'PERFORMANCE_REPORT' | 'LOCAL_TRANSFERS' | 'LEGAL_TEXT';
};

// GET et SHA-256 des octets PDF contrôlés le 12 octobre 2026 : docs/CODEX_CHECKPOINT.md.
// Le hash RAP provient de l’acquisition antérieure tracée dans docs/overnight/DOCUMENTS.json.
export const DOCUMENT_CONTROLS: readonly Readonly<Pick<SourceDocument, 'id' | 'officialUrl' | 'sha256' | 'pageCount' | 'accessedAt' | 'httpStatus' | 'availability' | 'verification'>>[] = [
  {
    "id": "DGBF-LFI-2026",
    "officialUrl": "https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf",
    "sha256": "f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76",
    "pageCount": 583,
    "accessedAt": "2026-10-12",
    "httpStatus": 200,
    "availability": "AVAILABLE",
    "verification": "VERIFIED"
  },
  {
    "id": "DGBF-DPPD-PAP-2026-2028-ANNEXE-4",
    "officialUrl": "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf",
    "sha256": "0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10",
    "pageCount": 1229,
    "accessedAt": "2026-10-12",
    "httpStatus": 200,
    "availability": "AVAILABLE",
    "verification": "VERIFIED"
  },
  {
    "id": "DGBF-ANNEXE-6-2026",
    "officialUrl": "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-6-Budgets-des-EPN-2026.pdf",
    "sha256": "3186dc17e1ba51ba1b69b3eed8ee3e40083a8eb0ddd56861dfdd0aa4b8c9bb2e",
    "pageCount": 179,
    "accessedAt": "2026-10-12",
    "httpStatus": 200,
    "availability": "AVAILABLE",
    "verification": "VERIFIED"
  },
  {
    "id": "DGBF-ANNEXE-7-2026",
    "officialUrl": "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-7-Dotations-des-Institutions-2026.pdf",
    "sha256": "567810702fb7ed7cb83945a0af18ef23ee52bf617a305bac36243c08de4a1842",
    "pageCount": 89,
    "accessedAt": "2026-10-12",
    "httpStatus": 200,
    "availability": "AVAILABLE",
    "verification": "VERIFIED"
  },
  {
    "id": "DGBF-TRANSFERTS-LOCAL-2026",
    "officialUrl": "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-8-Concours-financiers-aux-collectivites-territoriales-et-aux-districts-autonomes-2026.pdf",
    "sha256": "b3c2d9b90d847fdefb20d100c606cba0b6430e00f94306da6377ce56014128fc",
    "pageCount": 322,
    "accessedAt": "2026-10-12",
    "httpStatus": 200,
    "availability": "AVAILABLE",
    "verification": "VERIFIED"
  },
  {
    "id": "DGBF-RAP-2022",
    "officialUrl": "https://www.dgbf.ci/wp-content/uploads/2024/04/Rapport-Annuel-de-Performance-2022.pdf",
    "sha256": "b62b716caf5efe9ce8fa6f5edfa853e530f2fb183ff4530689950553ba346156",
    "pageCount": 1750,
    "accessedAt": "2026-10-12",
    "httpStatus": 404,
    "availability": "AVAILABLE_FROM_PRIOR_OFFICIAL_ACQUISITION",
    "verification": "TO_VERIFY"
  },
  {
    "id": "CAIDP-LOI-2013-867",
    "officialUrl": "https://caidp.ci/uploads/86dc0b7227c41f5053334147b7ec76a6.pdf",
    "sha256": null,
    "pageCount": null,
    "accessedAt": "2026-10-12",
    "httpStatus": 404,
    "availability": "NOT_FOUND_PUBLICLY",
    "verification": "TO_VERIFY"
  }
];

const DOCUMENT_REFERENCES: OfficialPublicDocument[] = [
  {
    id: 'DGBF-LFI-2026',
    title: "Loi de finances n° 2025-987 du 19 décembre 2025 portant budget de l'État pour l'année 2026",
    category: 'BUDGET_OFFICIEL',
    institution_name: "République de Côte d'Ivoire — Direction Générale du Budget et des Finances",
    year: 2026,
    fiscal_year: 2026,
    description: "Budget général de l'État voté pour l'exercice 2026 (583 pages). Tableaux récapitulatifs par section, dotation, programme et nature économique.",
    file_url: 'https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf',
    file_name: 'Loi-de-Finances-2026.pdf',
    file_format: 'PDF',
    published_at: '2025-12-19T00:00:00.000Z',
    downloads_count: 0,
    is_official: true,
    status: 'PUBLISHED',
    budget_nature: 'INITIAL_BUDGET',
    source_name: 'Direction Générale du Budget et des Finances (DGBF)',
    source_url: 'https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf',
    tags: ['LFI 2026', 'Budget État', 'Crédits de Paiement', 'DGBF', 'Officiel'],
  },
  {
    id: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    title: 'Annexe 4 : Documents de Programmation Pluriannuelle des Dépenses - Projets Annuels de Performance (DPPD-PAP) 2026-2028',
    category: 'BUDGET_OFFICIEL',
    institution_name: 'Direction Générale du Budget et des Finances',
    year: 2026,
    fiscal_year: 2026,
    description: 'Programmation pluriannuelle détaillée des dépenses ministérielles par programme et action (1 229 pages). Tableaux 7 des crédits et indicateurs de performance.',
    file_url: 'https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf',
    file_name: 'Annexe-4-DPPD-PAP-2026-2028.pdf',
    file_format: 'PDF',
    published_at: '2025-12-19T00:00:00.000Z',
    downloads_count: 0,
    is_official: true,
    status: 'PUBLISHED',
    budget_nature: 'MULTI_YEAR_PROGRAM',
    source_name: 'Direction Générale du Budget et des Finances (DGBF)',
    source_url: 'https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf',
    tags: ['DPPD-PAP', 'Budget-Programme', 'Actions', 'Performance', 'DGBF'],
  },
  {
    id: 'DGBF-TRANSFERTS-LOCAL-2026',
    title: "Annexe 8 : Concours financiers aux collectivités territoriales et aux districts autonomes 2026",
    category: 'BUDGET_OFFICIEL',
    institution_name: 'Direction Générale du Budget et des Finances / DGDDL',
    year: 2026,
    fiscal_year: 2026,
    description: "Concours financiers de l’État aux collectivités territoriales et aux districts autonomes. Extraction détaillée à vérifier.",
    file_url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-8-Concours-financiers-aux-collectivites-territoriales-et-aux-districts-autonomes-2026.pdf",
    file_name: "Annexe-8-Concours-financiers-aux-collectivites-territoriales-et-aux-districts-autonomes-2026.pdf",
    file_format: 'PDF',
    published_at: '2025-12-19T00:00:00.000Z',
    downloads_count: 0,
    is_official: true,
    status: 'PUBLISHED',
    budget_nature: 'LOCAL_TRANSFERS',
    source_name: 'Direction Générale du Budget et des Finances',
    source_url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-8-Concours-financiers-aux-collectivites-territoriales-et-aux-districts-autonomes-2026.pdf",
    tags: ['Collectivités', 'Communes', 'Régions', 'DGF', 'DGE', 'Districts autonomes'],
  },
  {
    id: 'DGBF-ANNEXE-7-2026',
    title: "Annexe 7 : Dotations des Institutions 2026",
    category: 'BUDGET_OFFICIEL',
    institution_name: 'Direction Générale du Budget et des Finances',
    year: 2026,
    fiscal_year: 2026,
    description: "Dotations gérées directement par les institutions ; périmètre distinct des crédits totaux de section.",
    file_url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-7-Dotations-des-Institutions-2026.pdf",
    file_name: "Annexe-7-Dotations-des-Institutions-2026.pdf",
    file_format: 'PDF',
    published_at: '2025-12-19T00:00:00.000Z',
    downloads_count: 0,
    is_official: true,
    status: 'PUBLISHED',
    budget_nature: 'INITIAL_BUDGET',
    source_name: 'Direction Générale du Budget et des Finances',
    source_url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-7-Dotations-des-Institutions-2026.pdf",
    tags: ['Grandes Institutions', 'Dotations Directes', 'Annexe 7', 'LFI 2026'],
  },
  {
    id: 'DGBF-ANNEXE-6-2026',
    title: "Annexe 6 : Budgets des Établissements Publics Nationaux (EPN) 2026",
    category: 'BUDGET_OFFICIEL',
    institution_name: 'Direction Générale du Budget et des Finances',
    year: 2026,
    fiscal_year: 2026,
    description: "Budgets des EPN et structures assimilées. Cette annexe ne se limite pas aux autorités de régulation. Extraction détaillée à vérifier.",
    file_url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-6-Budgets-des-EPN-2026.pdf",
    file_name: "Annexe-6-Budgets-des-EPN-2026.pdf",
    file_format: 'PDF',
    published_at: '2025-12-19T00:00:00.000Z',
    downloads_count: 0,
    is_official: true,
    status: 'PUBLISHED',
    budget_nature: 'INITIAL_BUDGET',
    source_name: 'Direction Générale du Budget et des Finances',
    source_url: "https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-6-Budgets-des-EPN-2026.pdf",
    tags: ['Régulateurs', 'AAI', 'Subventions État', 'Annexe 6', 'LFI 2026'],
  },
  {
    id: 'DGBF-RAP-2022',
    title: "Rapports annuels de performance — Loi de règlement portant budget de l'État pour l'année 2022",
    category: 'RAPPORT_AUDIT',
    institution_name: 'Direction Générale du Budget et des Finances',
    year: 2022,
    fiscal_year: 2022,
    description: "Rapport de performance 2022 acquis antérieurement ; lien actuellement indisponible. Extraction des montants non vérifiée.",
    file_url: 'https://www.dgbf.ci/wp-content/uploads/2024/04/Rapport-Annuel-de-Performance-2022.pdf',
    file_name: 'Rapport-Annuel-de-Performance-2022.pdf',
    file_format: 'PDF',
    published_at: null,
    downloads_count: 0,
    is_official: true,
    status: 'PUBLISHED',
    budget_nature: 'PERFORMANCE_REPORT',
    source_name: 'Direction Générale du Budget et des Finances',
    source_url: 'https://www.dgbf.ci/wp-content/uploads/2024/04/Rapport-Annuel-de-Performance-2022.pdf',
    tags: ['RAP 2022', 'Loi de Règlement', 'Exécution', 'Performance', 'Audit'],
  },
  {
    id: 'CAIDP-LOI-2013-867',
    title: "Loi n° 2013-867 du 23 décembre 2013 relative à l'accès à l'information d'intérêt public",
    category: 'LOI_CAIDP',
    institution_name: "Commission d'Accès à l'Information d'Intérêt Public et aux Documents Publics (CAIDP)",
    year: 2013,
    fiscal_year: 2013,
    description: "Texte de loi républicain fondant le droit inaliénable de tout citoyen d'accéder aux documents administratifs, contrats publics et rapports financiers.",
    file_url: 'https://caidp.ci/uploads/86dc0b7227c41f5053334147b7ec76a6.pdf',
    file_name: '86dc0b7227c41f5053334147b7ec76a6.pdf',
    file_format: 'PDF',
    published_at: '2013-12-23T00:00:00.000Z',
    downloads_count: 0,
    is_official: true,
    status: 'PUBLISHED',
    budget_nature: 'LEGAL_TEXT',
    source_name: 'CAIDP Côte d’Ivoire',
    source_url: 'https://caidp.ci/uploads/86dc0b7227c41f5053334147b7ec76a6.pdf',
    tags: ['CAIDP', 'Loi 2013-867', 'Droit d’accès', 'Transparence', 'République'],
  },
];

export const OFFICIAL_PUBLIC_DOCUMENTS_REGISTRY: readonly OfficialPublicDocument[] = DOCUMENT_REFERENCES.map(doc => {
  const control = DOCUMENT_CONTROLS.find(c => c.id === doc.id)!;
  const audit = verifyDocumentaryAudit({ id: doc.id, sha256: control.sha256, fiscalYear: doc.year }, OFFICIAL_DOCUMENTARY_AUDITS);
  return Object.freeze({
    ...doc,
    checksum_sha256: control.sha256,
    page_count: control.pageCount ?? undefined,
    file_size: control.pageCount ? `${control.pageCount} pages` : undefined,
    verification_status: control.verification,
    source_provenance: 'OFFICIAL_SOURCE' as const,
    extraction_status: audit.verified ? 'VERIFIED' as const : 'TO_VERIFY' as const,
    availability: control.availability,
    accessed_at: control.accessedAt,
    http_status: control.httpStatus,
    control_scope: audit.matchingAudit?.controlScope ?? null,
  });
});

export function getOfficialPublicDocuments(): PublicDocument[] {
  return OFFICIAL_PUBLIC_DOCUMENTS_REGISTRY.map(doc => ({ ...doc, tags: doc.tags ? [...doc.tags] : undefined }));
}

export function getReviewSourceDocuments(documents: readonly PublicDocument[] = OFFICIAL_PUBLIC_DOCUMENTS_REGISTRY): SourceDocument[] {
  return documents.map(doc => {
    const control = DOCUMENT_CONTROLS.find(c => c.id === doc.id);
    const original = DOCUMENT_REFERENCES.find(d => d.id === doc.id);
    const ambiguous = documents.filter(other => other.id === doc.id
      || other.file_url === doc.file_url
      || (doc.checksum_sha256 && other.checksum_sha256?.toLowerCase() === doc.checksum_sha256.toLowerCase())).length > 1;
    const matches = !ambiguous && control && original?.year === doc.year
      && original.title === doc.title && original.institution_name === doc.institution_name
      && safeOfficialUrl(doc.file_url) === control.officialUrl
      && (doc.checksum_sha256 ?? null) === control.sha256
      && (!control.sha256 || isDocumentSha256(control.sha256));
    const audit = verifyDocumentaryAudit({ id: doc.id, sha256: matches ? control.sha256 : null, fiscalYear: doc.year }, OFFICIAL_DOCUMENTARY_AUDITS);
    return {
      id: doc.id, title: doc.title, publisher: doc.institution_name,
      officialUrl: safeOfficialUrl(doc.file_url), fiscalYear: doc.year,
      accessedAt: matches ? control.accessedAt : null,
      httpStatus: matches ? control.httpStatus : null,
      sha256: matches ? control.sha256 : null,
      pageCount: matches ? control.pageCount : null,
      verification: matches ? control.verification : 'TO_VERIFY',
      visibility: 'PUBLIC', previousVersionId: null,
      availability: matches ? control.availability : 'UNKNOWN',
      provenance: matches ? 'OFFICIAL_SOURCE' : 'UNVERIFIED',
      extractionStatus: audit.verified ? 'VERIFIED' : 'TO_VERIFY',
      controlScope: audit.matchingAudit?.controlScope ?? null,
      auditRecordId: audit.matchingAudit?.controlId ?? null,
      auditReportRef: audit.matchingAudit?.reportRef ?? null,
    };
  });
}

export function findOfficialDocumentByChecksum(sha256: string, documents: readonly PublicDocument[] = OFFICIAL_PUBLIC_DOCUMENTS_REGISTRY): PublicDocument | undefined {
  if (!isDocumentSha256(sha256)) return undefined;
  const matches = documents.filter(d => d.checksum_sha256?.toLowerCase() === sha256.toLowerCase());
  if (matches.length !== 1) return undefined;
  const source = getReviewSourceDocuments(documents).find(doc => doc.id === matches[0].id)!;
  return source.sha256 ? { ...matches[0], tags: matches[0].tags ? [...matches[0].tags] : undefined } : undefined;
}
