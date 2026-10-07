import type { ReactNode } from 'react';
import type { ReviewStatus, ReviewValue } from '../domain/evidence';
import { resolveCitation, type SourceDocument } from '../domain/documents';
import type { EvidenceRef } from '../domain/evidence';

const statusLabels: Record<ReviewStatus, string> = {
  AVAILABLE: 'Source documentée', UNKNOWN: 'Information indisponible',
  BLOCKED: 'Données à vérifier', NOT_COMPARABLE: 'Périmètres non comparables',
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={`review-badge review-badge--${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

export function AmountFact({ label, result, explanation }: { label: string; result: ReviewValue; explanation: string }) {
  const known = result.status === 'AVAILABLE' && result.value !== null && Number.isFinite(result.value) && result.value >= 0;
  return <article className="review-card">
    <h3>{label}</h3>
    <p className="review-amount">{known ? `${result.value!.toLocaleString('fr-FR')} FCFA` : 'Non disponible'}</p>
    <StatusBadge status={known ? 'AVAILABLE' : result.status === 'AVAILABLE' ? 'UNKNOWN' : result.status} />
    <p className="review-muted">{explanation}</p>
  </article>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <section className="review-empty"><h3>{title}</h3><div>{children}</div></section>;
}

export function EvidenceDetails({ evidence, documents }: { evidence: EvidenceRef | null; documents: readonly SourceDocument[] }) {
  const citation = resolveCitation(evidence, documents);
  if (!citation) return <p className="review-muted">Document vérifiable non disponible pour cette donnée.</p>;
  return <details className="review-evidence"><summary>Vérifier la source</summary>
    <p>{citation.publisher} · Exercice {citation.fiscalYear}{citation.page !== null ? ` · Page ${citation.page}` : ''}</p>
    <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.title} <span className="review-sr-only">(nouvel onglet)</span></a>
    <p className="review-hash">SHA-256 : {citation.sha256}</p>
  </details>;
}
