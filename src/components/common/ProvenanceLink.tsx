import React from 'react';
import { ExternalLink, ShieldCheck, FileText, CheckCircle2, Info } from 'lucide-react';
import { EvidenceType } from '../../types/ministryBudget';

interface ProvenanceLinkProps {
  source: string;
  sourceUrl?: string;
  documentReference?: string;
  pageReference?: string;
  evidenceType?: EvidenceType;
  fiscalYear?: number;
  compact?: boolean;
  citation?: boolean;
  className?: string;
}

export const ProvenanceLink: React.FC<ProvenanceLinkProps> = ({
  source,
  sourceUrl,
  documentReference,
  pageReference,
  evidenceType = 'PRIMARY_OFFICIAL_DOCUMENT',
  fiscalYear = 2026,
  compact = false,
  citation = false,
  className = '',
}) => {
  if (citation) {
    if (!sourceUrl) {
      return pageReference ? (
        <span className={`text-[10px] text-slate-500 font-medium ${className}`}>
          {pageReference}
        </span>
      ) : null;
    }

    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-brand-blue hover:underline font-medium transition-colors focus:outline-hidden focus:ring-1 focus:ring-brand-blue rounded ${className}`}
        title={`Consulter le document source officiel (${source})`}
      >
        <span>{source}</span>
        {pageReference && <span>· {pageReference}</span>}
        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 text-slate-400" />
      </a>
    );
  }
  const getBadgeStyle = () => {
    switch (evidenceType) {
      case 'PRIMARY_OFFICIAL_DOCUMENT':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Acte Officiel (Force de loi)',
          icon: ShieldCheck,
        };
      case 'INSTITUTIONAL_OFFICIAL_SOURCE':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Document Institutionnel Certifié',
          icon: CheckCircle2,
        };
      case 'SECONDARY_INSTITUTIONAL_CORROBORATION':
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: 'Corroboration Publique',
          icon: Info,
        };
    }
  };

  const badge = getBadgeStyle();
  const Icon = badge.icon;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-[11px] ${className}`}>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          <span>{badge.label}</span>
        </span>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue hover:text-brand-blue/80 hover:underline font-semibold inline-flex items-center gap-1 transition-colors"
            title={`${source} • Exercice ${fiscalYear}`}
          >
            <span>{documentReference || source}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-slate-600 font-medium">
            {documentReference || source}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1.5 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
          <Icon className="w-3 h-3" />
          <span>{badge.label}</span>
        </span>
        <span className="text-[10px] font-semibold text-slate-500">
          Exercice Budgétaire {fiscalYear}
        </span>
      </div>

      <div className="text-slate-800 font-semibold flex items-start gap-1.5 pt-0.5">
        <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
        <span className="leading-snug">{source}</span>
      </div>

      {(documentReference || pageReference) && (
        <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 pl-5">
          {documentReference && (
            <span>
              <strong className="text-slate-700">Réf :</strong> {documentReference}
            </span>
          )}
          {pageReference && (
            <span>
              <strong className="text-slate-700">Nomenclature :</strong> {pageReference}
            </span>
          )}
        </div>
      )}

      {sourceUrl && (
        <div className="pt-1 pl-5">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue hover:text-brand-blue/80 hover:underline"
          >
            <span>Consulter la source officielle (Portail DGBF / Journal Officiel)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
