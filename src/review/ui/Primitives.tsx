import type { ReactNode } from 'react';
import type { ReviewStatus, ReviewValue } from '../domain/evidence';
import { resolveCitation, type SourceDocument } from '../domain/documents';
import type { EvidenceRef } from '../domain/evidence';

const statusLabels: Record<ReviewStatus, string> = {
  AVAILABLE: 'Source documentée', UNKNOWN: 'Information indisponible',
  BLOCKED: 'Données à vérifier', NOT_COMPARABLE: 'Périmètres non comparables',
};

const statusClasses: Record<ReviewStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  UNKNOWN: 'bg-slate-100 text-slate-800 border-slate-300',
  BLOCKED: 'bg-rose-100 text-rose-900 border-rose-300',
  NOT_COMPARABLE: 'bg-amber-100 text-amber-900 border-amber-300',
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={`review-badge review-badge--${status.toLowerCase()} inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black border ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export function AmountFact({ label, result, explanation }: { label: string; result: ReviewValue; explanation: string }) {
  const known = result.status === 'AVAILABLE' && result.value !== null && Number.isFinite(result.value) && result.value >= 0;
  return (
    <article className="review-card bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</h3>
      <p className="review-amount text-xl sm:text-2xl font-black text-slate-900">
        {known ? `${result.value!.toLocaleString('fr-FR')} FCFA` : 'Non disponible'}
      </p>
      <div>
        <StatusBadge status={known ? 'AVAILABLE' : result.status === 'AVAILABLE' ? 'UNKNOWN' : result.status} />
      </div>
      <p className="review-muted text-xs text-slate-500 leading-relaxed">{explanation}</p>
    </article>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="review-empty bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-2">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <div className="text-xs text-slate-600 max-w-lg mx-auto">{children}</div>
    </section>
  );
}

export function EvidenceDetails({ evidence, documents }: { evidence: EvidenceRef | null; documents: readonly SourceDocument[] }) {
  const citation = resolveCitation(evidence, documents);
  if (!citation) {
    return <p className="review-muted text-xs text-slate-500">Document vérifiable non disponible pour cette donnée.</p>;
  }
  return (
    <details className="review-evidence bg-slate-50/80 rounded-xl p-3 border border-slate-200 text-xs space-y-1 text-slate-700">
      <summary className="font-bold text-slate-800 cursor-pointer min-h-[44px] flex items-center hover:text-brand-blue">
        Vérifier la source documentaire
      </summary>
      <p className="text-slate-600">
        {citation.publisher} · Exercice {citation.fiscalYear}
        {citation.page !== null ? ` · Page ${citation.page}` : ''}
      </p>
      <div>
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-brand-blue hover:underline inline-flex items-center gap-1 min-h-[44px]"
        >
          <span>{citation.title}</span>
          <span className="review-sr-only text-[10px] text-slate-400">(nouvel onglet)</span>
        </a>
      </div>
      <p className="review-hash text-[11px] font-mono text-slate-500 break-all">
        SHA-256 : {citation.sha256}
      </p>
    </details>
  );
}
