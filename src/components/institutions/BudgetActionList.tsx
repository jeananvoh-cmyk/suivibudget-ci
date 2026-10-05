import React from 'react';
import { Target, FolderGit2 } from 'lucide-react';
import { BudgetAction, MinistryLinkedProject } from '../../types/ministryBudget';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { LinkedProjectCard } from './LinkedProjectCard';
import { ProvenanceLink } from '../common/ProvenanceLink';

interface BudgetActionListProps {
  actions: BudgetAction[];
  onSelectProject?: (project: MinistryLinkedProject) => void;
}

export const BudgetActionList: React.FC<BudgetActionListProps> = ({
  actions,
  onSelectProject,
}) => {
  return (
    <div className="space-y-3 pt-2">
      <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
        <Target className="w-3.5 h-3.5 text-brand-blue" />
        <span>Actions Budgétaires ({actions.length})</span>
      </div>

      <div className="space-y-3">
        {actions.map((act) => (
          <div
            key={act.id}
            className="p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Action {act.official_code || act.code}
                  </span>
                  {act.page_reference && (
                    <ProvenanceLink
                      source="Source officielle DGBF"
                      sourceUrl={act.source_url}
                      pageReference={act.page_reference}
                      citation
                    />
                  )}
                </div>
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {act.name}
                </h5>
                {act.description && (
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {act.description}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right flex-shrink-0">
                <div className="text-xs sm:text-sm font-black font-mono text-slate-900">
                  {act.amount_fcfa != null ? formatFCFA(act.amount_fcfa) : 'Non individualisé'}
                </div>
                {act.amount_fcfa != null && (
                  <div className="text-[10px] text-slate-500 font-medium">
                    {formatAmountInWords(act.amount_fcfa)}
                  </div>
                )}
              </div>
            </div>

            {act.linked_projects && act.linked_projects.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200/70">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <FolderGit2 className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Projets d'investissements publics rattachés ({act.linked_projects.length})</span>
                </div>
                <div className="space-y-2">
                  {act.linked_projects.map((proj) => (
                    <LinkedProjectCard
                      key={proj.id}
                      project={proj}
                      onClick={() => onSelectProject?.(proj)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
