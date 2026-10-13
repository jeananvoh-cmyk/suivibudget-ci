import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { MinistryBudget } from '../../types/ministryBudget';
import { formatFCFA, formatAmountInWords, formatQualifiedFCFA } from '../../utils/formatters';
import { Institution } from '../../types';
import { BudgetPresentationAmount, resolveInstitutionBudgetPresentation, exportInstitutionBudget } from '../../utils/institutionBudgetHelper';
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
          Périmètre historique des programmes détaillés — à rapprocher des CP de section
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

export const BudgetReferenceHeader: React.FC<{ institution: Partial<Institution>; compact?: boolean }> = ({ institution, compact = false }) => {
  const view = resolveInstitutionBudgetPresentation(institution);
  const statusLabels = { VERIFIED_AMOUNT: 'Montant recoupé dans le document', SECONDARY_SOURCE: 'Publication secondaire — à confirmer', TO_VERIFY: 'À vérifier', UNKNOWN: 'Non documenté' };
  const renderAmount = (amount: BudgetPresentationAmount) => (
    <div className="space-y-1 min-w-0">
      <p className="text-xs font-bold text-slate-700">{amount.label} · {view.fiscal_year}</p>
      <p className={`${compact ? 'text-sm' : 'text-xl sm:text-2xl'} font-black text-slate-900 break-words`}>
        {amount.amount_fcfa == null ? 'Non documenté' : amount.precision === 'UNKNOWN' ? formatFCFA(amount.amount_fcfa) : formatQualifiedFCFA(amount.amount_fcfa, amount.precision)}
      </p>
      {amount.amount_fcfa != null && <p className="text-xs text-slate-600 break-words">{formatAmountInWords(amount.amount_fcfa)}</p>}
      <p className="text-[11px] text-slate-600">{statusLabels[amount.verification]}</p>
      {amount.source?.source_url && (
        <a href={`${amount.source.source_url}${amount.source.pdf_page ? `#page=${amount.source.pdf_page}` : ''}`} target="_blank" rel="noopener noreferrer"
          onClick={event => event.stopPropagation()} className="inline-block text-xs underline text-brand-blue focus-visible:outline focus-visible:outline-2 rounded">
          {amount.source.document_title}{amount.source.pdf_page ? ` · PDF p. ${amount.source.pdf_page}` : ''}
        </a>
      )}
    </div>
  );
  const download = (format: 'CSV' | 'JSON') => {
    const url = URL.createObjectURL(new Blob([exportInstitutionBudget(institution, format)], { type: format === 'JSON' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `budget-${view.institution_id}-2026.${format.toLowerCase()}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3 text-slate-800 min-w-0" aria-label="Comprendre le budget de référence">
      {!compact && <h3 className="font-black text-sm">Comprendre — budget de référence</h3>}
      {renderAmount(view.reference)}
      <p className="text-xs text-slate-600 leading-relaxed" role="note">{view.notice}</p>
      {!compact && (
        <>
          {view.supplements.map((amount, index) => <div key={index} className="border-t border-slate-200 pt-3">{renderAmount(amount)}</div>)}
          {(view.functioning_fcfa != null || view.investment_fcfa != null) && (
            <div className="border-t border-slate-200 pt-3 text-xs space-y-1">
              <p className="font-bold">Dépenses citées dans la publication du BP — à confirmer</p>
              <p>Fonctionnement : {formatQualifiedFCFA(view.functioning_fcfa, view.reference.precision)}{view.functioning_pct != null ? ` (${view.functioning_pct} %)` : ''}</p>
              <p>Investissement : {formatQualifiedFCFA(view.investment_fcfa, view.reference.precision)}{view.investment_pct != null ? ` (${view.investment_pct} %)` : ''}</p>
              <p>Les parts ne sont calculées que pour des montants exacts cités et une somme équilibrée. Cette cohérence arithmétique ne certifie pas la délibération.</p>
            </div>
          )}
          <details className="border-t border-slate-200 pt-3 text-xs">
            <summary className="cursor-pointer font-bold focus-visible:outline focus-visible:outline-2 rounded">Vérifier — provenance et limites</summary>
            <div className="space-y-2 mt-2">
              {[view.reference, ...view.supplements].map((amount, index) => <div key={index} className="space-y-1">
                <p className="font-semibold">{amount.label}</p>
                <p>{amount.source?.document_reference ?? 'Source individuelle non établie'}</p>
                {amount.source?.sha256 && <p className="break-all">SHA-256 du document : {amount.source.sha256}</p>}
              </div>)}
              <p>Une source documentaire et un montant voté ne prouvent ni une dépense exécutée ni une réalisation physique.</p>
            </div>
          </details>
          <div className="flex flex-wrap gap-2">
            {(['CSV', 'JSON'] as const).map(format => <button key={format} type="button" onClick={() => download(format)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50 focus-visible:outline focus-visible:outline-2">
              Exporter cette fiche ({format})
            </button>)}
          </div>
        </>
      )}
    </section>
  );
};
