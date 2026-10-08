import { assessObservation, hasEvidence, isCalendarDate, type EvidenceRef, type FinancialObservation, type ReviewValue } from './evidence';
import {
  matchFinancialAudit,
  OFFICIAL_FINANCIAL_AUDITS,
  type FinancialAuditRecord,
  type FinancialAuditMatchResult,
} from './financialAudits';

export type { FinancialAuditRecord, FinancialAuditMatchResult };
export { matchFinancialAudit, OFFICIAL_FINANCIAL_AUDITS };

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

/**
 * Enregistrement traçable de contrôle documentaire indépendant.
 * Exigé pour certifier l'extraction financière d'un document primaire.
 */
export interface DocumentaryAuditRecord {
  /** Identifiant unique de contrôle documentaire */
  controlId: string;
  /** Identifiant exact du document primaire contrôlé */
  documentId: string;
  /** SHA-256 vérifié du document contrôlé */
  documentSha256: string;
  /** Périmètre précis de la vérification (sections, programmes, tableaux) */
  controlScope: string;
  /** Exercice budgétaire concerné */
  fiscalYear: number;
  /** Statut du contrôle documentaire indépendant */
  controlStatus: 'VERIFIED' | 'TO_VERIFY' | 'SOURCE_CONFLICT';
  /** Référence traçable vers le résultat ou rapport d'audit vérifiable */
  reportRef: string;
}

export interface AuditVerificationResult {
  verified: boolean;
  matchingAudit: DocumentaryAuditRecord | null;
  reasons: string[];
}

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
  /** Identifiant unique de contrôle documentaire traçable */
  auditRecordId?: string | null;
  /** Référence traçable vers le rapport de contrôle */
  auditReportRef?: string | null;
}

/**
 * Vérifie si un document bénéficie d'un contrôle documentaire traçable et conforme.
 * La seule présence d'un champ déclaratif (ex: CONTROL_SCOPE seul) ne suffit JAMAIS
 * à certifier une extraction comme VERIFIED.
 */
export function verifyDocumentaryAudit(
  doc: Pick<SourceDocument, 'id' | 'sha256' | 'fiscalYear'>,
  audits: readonly DocumentaryAuditRecord[],
): AuditVerificationResult {
  if (!doc.id?.trim() || !doc.sha256?.trim()) {
    return { verified: false, matchingAudit: null, reasons: ['MISSING_DOCUMENT_IDENTITY_OR_HASH'] };
  }
  if (!/^[a-f0-9]{64}$/i.test(doc.sha256)) {
    return { verified: false, matchingAudit: null, reasons: ['INVALID_DOCUMENT_SHA256'] };
  }
  const matching = audits.find(a =>
    a.documentId === doc.id
    && a.documentSha256.toLowerCase() === doc.sha256?.toLowerCase()
    && a.fiscalYear === doc.fiscalYear
  );
  if (!matching) {
    return { verified: false, matchingAudit: null, reasons: ['NO_MATCHING_AUDIT_RECORD'] };
  }
  if (matching.controlStatus !== 'VERIFIED') {
    return { verified: false, matchingAudit: matching, reasons: ['AUDIT_STATUS_NOT_VERIFIED'] };
  }
  if (!matching.controlScope?.trim() || !matching.reportRef?.trim()) {
    return { verified: false, matchingAudit: matching, reasons: ['INCOMPLETE_AUDIT_TRACE'] };
  }
  return { verified: true, matchingAudit: matching, reasons: [] };
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

/**
 * Résout une citation documentaire (URL, page, métadonnées publiques).
 * Note : résout la citation documentaire d'un original public sans pour autant
 * certifier ou autoriser la publication d'un montant financier extrait.
 */
export function resolveCitation(ref: EvidenceRef | null, documents: readonly SourceDocument[]) {
  if (!ref || !hasEvidence(ref, ref.fiscalYear) || catalogProblems(documents).length) return null;
  const doc = documents.find(d => d.id === ref.documentId);
  if (!doc || doc.verification !== 'VERIFIED' || doc.visibility !== 'PUBLIC'
    || doc.fiscalYear !== ref.fiscalYear || doc.httpStatus !== 200
    || !doc.sha256 || !/^[a-f0-9]{64}$/i.test(doc.sha256) || !doc.accessedAt || !isCalendarDate(doc.accessedAt)
    || !doc.title.trim() || !doc.publisher.trim()) return null;
  if (doc.provenance === 'UNVERIFIED') return null;
  if (doc.availability && doc.availability !== 'AVAILABLE') return null;
  if (ref.page !== null && (!Number.isInteger(doc.pageCount) || ref.page > doc.pageCount! || ref.page < 1)) return null;
  const url = safeOfficialUrl(doc.officialUrl);
  if (!url) return null;
  const target = new URL(url);
  if (ref.page !== null) target.hash = `page=${ref.page}`;
  return { documentId: doc.id, title: doc.title, publisher: doc.publisher, url: target.href,
    fiscalYear: doc.fiscalYear, page: ref.page, reference: ref.reference, sha256: doc.sha256 };
}


/**
 * Évalue si une observation financière satisfait à TOUTES les exigences républicaines
 * pour être publiée comme montant officiel.
 *
 * Chemin de publication financière strict :
 * 1. L'observation doit être arithmétiquement et temporellement valide (assessObservation).
 * 2. Un montant exact égal à zéro (amount === 0 avec precision === 'EXACT') est préservé.
 * 3. La citation documentaire doit être résolue (resolveCitation).
 * 4. Le document cité doit exister dans `documents` et posséder EXPLICITEMENT :
 *    - provenance: 'OFFICIAL_SOURCE' (les provenances manquantes, secondaires ou non vérifiées sont REJETÉES).
 *    - extractionStatus: 'VERIFIED' (les extractions manquantes, 'TO_VERIFY', 'SOURCE_CONFLICT' ou 'NOT_EXTRACTED' sont REJETÉES).
 *    - availability: 'AVAILABLE' (les statuts manquants, 'PENDING', 'NOT_FOUND_PUBLICLY' sont REJETÉS).
 *    - verification: 'VERIFIED'.
 * 5. CONTRÔLE FINANCIER GRANULAIRE (Règle d'or républicaine) :
 *    Un document officiel vérifié ne signifie pas que tous les montants contenus dans ce document sont vérifiés.
 *    L'observation candidate doit correspondre exactement à un enregistrement d'audit financier
 *    formellement vérifié dans `financialAudits` (institution, section, scope, mesure, base,
 *    montant exact, devise, document, SHA-256, page).
 *    Un contrôle d'agrégat (ex: SECTION_TOTAL) ne valide jamais des détails (programmes ou actions).
 * 6. Si une seule preuve manque ou est ambiguë, la publication est REFUSÉE :
 *    - L'état renvoyé est 'UNKNOWN' (ou 'BLOCKED' / 'NOT_COMPARABLE' si l'observation l'exige).
 *    - La valeur financière renvoyée est null.
 */
export function canPublishOfficialObservation(
  observation: FinancialObservation,
  documents: readonly SourceDocument[],
  financialAudits: readonly FinancialAuditRecord[] = OFFICIAL_FINANCIAL_AUDITS,
): ReviewValue {
  const baseAssessment = assessObservation(observation);
  if (baseAssessment.status !== 'AVAILABLE') {
    return baseAssessment;
  }
  if (!observation.evidence) {
    return { value: null, status: 'UNKNOWN', reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION'] };
  }
  const citation = resolveCitation(observation.evidence, documents);
  if (!citation) {
    return { value: null, status: 'UNKNOWN', reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION'] };
  }
  const doc = documents.find(d => d.id === observation.evidence!.documentId);
  if (!doc) {
    return { value: null, status: 'UNKNOWN', reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION'] };
  }
  // Provenance must be explicitly OFFICIAL_SOURCE (missing, undefined, secondary, or unverified is strictly rejected)
  if (doc.provenance !== 'OFFICIAL_SOURCE') {
    return { value: null, status: 'UNKNOWN', reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION'] };
  }
  // Extraction must be explicitly VERIFIED (missing, undefined, TO_VERIFY, SOURCE_CONFLICT is strictly rejected)
  if (doc.extractionStatus !== 'VERIFIED') {
    return { value: null, status: 'UNKNOWN', reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION'] };
  }
  // Availability must be explicitly AVAILABLE (missing, undefined, PENDING, BLOCKED is strictly rejected)
  if (doc.availability !== 'AVAILABLE') {
    return { value: null, status: 'UNKNOWN', reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION'] };
  }
  // Documentary verification must be VERIFIED
  if (doc.verification !== 'VERIFIED') {
    return { value: null, status: 'UNKNOWN', reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION'] };
  }

  // Contrôle financier granulaire étanche
  const auditMatch = matchFinancialAudit(observation, financialAudits, doc);
  if (!auditMatch.matched) {
    return {
      value: null,
      status: 'UNKNOWN',
      reasons: ['UNVERIFIED_DOCUMENT_OR_EXTRACTION', ...auditMatch.reasons],
    };
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
      availability: doc.availability, provenance: doc.provenance, extractionStatus: doc.extractionStatus, controlScope: doc.controlScope,
      auditRecordId: doc.auditRecordId, auditReportRef: doc.auditReportRef }] : [];
  });
}
