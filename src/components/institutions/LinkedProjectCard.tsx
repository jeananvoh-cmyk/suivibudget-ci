import React from 'react';
import { MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';
import { MinistryLinkedProject } from '../../types/ministryBudget';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { ProvenanceLink } from '../common/ProvenanceLink';

interface LinkedProjectCardProps {
  project: MinistryLinkedProject;
  onClick?: () => void;
}

export const LinkedProjectCard: React.FC<LinkedProjectCardProps> = ({
  project,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-3.5 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 transition-all ${
        onClick ? 'cursor-pointer hover:border-brand-blue/40 shadow-2xs' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {project.official_code || project.code}
            </span>
            {project.region_name && (
              <span className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-brand-orange" />
                <span>{project.region_name}</span>
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {project.current_status}
            </span>
          </div>

          <h5 className="text-xs font-bold text-slate-900 leading-snug">
            {project.title}
          </h5>

          {project.page_reference && (
            <div className="pt-0.5">
              <ProvenanceLink
                source="Source officielle DGBF"
                sourceUrl={project.source_url}
                pageReference={project.page_reference}
                citation
              />
            </div>
          )}
        </div>

        <div className="text-left sm:text-right flex-shrink-0">
          <div className="text-xs sm:text-sm font-black font-mono text-brand-blue">
            {formatFCFA(project.budget_amount_fcfa)}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {formatAmountInWords(project.budget_amount_fcfa)}
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Inscrit au Budget National 2026</span>
        </div>
        <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
          Crédit intégré à l'action
        </span>
      </div>
    </div>
  );
};
