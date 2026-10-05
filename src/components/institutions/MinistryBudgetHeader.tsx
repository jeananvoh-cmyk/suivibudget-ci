import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { MinistryBudget } from '../../types/ministryBudget';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { ProvenanceLink } from '../common/ProvenanceLink';

interface MinistryBudgetHeaderProps {
  budget: MinistryBudget;
}

export const MinistryBudgetHeader: React.FC<MinistryBudgetHeaderProps> = ({ budget }) => {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-brand-blue text-white rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[11px] font-bold text-emerald-300 border border-white/15">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nomenclature Officielle Budget-Programmes • DGBF</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-300" />
            <span>10 programmes budgétaires</span>
          </span>
          <span className="text-xs font-semibold text-slate-300">
            Exercice 2026
          </span>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Crédits Budgétaires Votés (Loi de Finances Initiale 2026)
        </div>
        <div className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-white mt-1">
          {formatFCFA(budget.total_budget_fcfa)}
        </div>
        <div className="text-xs sm:text-sm text-slate-200 font-medium mt-1 leading-snug">
          {formatAmountInWords(budget.total_budget_fcfa)}
        </div>
      </div>

      <ProvenanceLink
        source={budget.source}
        sourceUrl={budget.source_url}
        documentReference={budget.document_reference}
        pageReference={budget.page_reference}
        evidenceType={budget.evidence_type}
        fiscalYear={budget.fiscal_year}
        className="bg-white/10 border-white/15 text-white"
      />
    </div>
  );
};
