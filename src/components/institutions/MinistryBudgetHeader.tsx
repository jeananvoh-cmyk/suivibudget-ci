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
  const isLocalEntity = ['MAIRIE', 'REGION', 'DISTRICT'].includes(institution.type || '');
  const statusLabels = {
    VERIFIED_AMOUNT: 'Montant recoupé dans le document',
    SECONDARY_SOURCE: 'Source en ligne vérifiable (publication secondaire — délibération PDF attendue)',
    TO_VERIFY: 'À vérifier',
    UNKNOWN: isLocalEntity ? 'Aucune source en ligne disponible pour le BP' : 'Non documenté',
  };
  const renderAmount = (amount: BudgetPresentationAmount, isReference = false) => (
    <div className="space-y-1 min-w-0">
      <p className="text-xs font-bold text-slate-700">{amount.label} · {view.fiscal_year}</p>
      <p className={`${compact ? 'text-sm' : 'text-xl sm:text-2xl'} font-black text-slate-900 break-words`}>
        {amount.amount_fcfa == null
          ? (isReference && isLocalEntity ? 'Non documenté (aucune source en ligne)' : 'Non documenté')
          : amount.precision === 'UNKNOWN'
            ? formatFCFA(amount.amount_fcfa)
            : formatQualifiedFCFA(amount.amount_fcfa, amount.precision)}
      </p>
      {amount.amount_fcfa != null && <p className="text-xs text-slate-600 break-words">{formatAmountInWords(amount.amount_fcfa)}</p>}
      <p className="text-[11px] text-slate-600">{statusLabels[amount.verification]}</p>
      {amount.source?.source_url && (
        <a href={`${amount.source.source_url}${amount.source.pdf_page ? `#page=${amount.source.pdf_page}` : ''}`} target="_blank" rel="noopener noreferrer"
          onClick={event => event.stopPropagation()} className="inline-block text-xs underline text-brand-blue focus-visible:outline focus-visible:outline-2 rounded break-words">
          {amount.source.document_title}{amount.source.pdf_page ? ` · PDF p. ${amount.source.pdf_page}` : ''}
        </a>
      )}
    </div>
  );
  const visibleSupplements = view.supplements.filter((amount) => !(
    view.lfi_grant?.status === 'VERIFIED_LFI' &&
    amount.source == null &&
    amount.verification === 'TO_VERIFY' &&
    amount.amount_fcfa === view.lfi_grant.total_cp_fcfa
  ));
  const download = (format: 'CSV' | 'JSON') => {
    const url = URL.createObjectURL(new Blob([exportInstitutionBudget(institution, format)], { type: format === 'JSON' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `budget-${view.institution_id}-2026.${format.toLowerCase()}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const lfi = view.lfi_grant;
  const lfiBreakdownItems = lfi?.status === 'VERIFIED_LFI'
    ? [
        { label: 'Fonctionnement services', amount: lfi.operating_cp_fcfa },
        { label: 'Personnel / salaires', amount: lfi.salaries_cp_fcfa },
        { label: 'Cantines scolaires', amount: lfi.canteens_cp_fcfa },
        { label: 'Investissements LFI', amount: lfi.investment_cp_fcfa },
        { label: 'Complément Annexe 4', amount: lfi.annexe4_supplement_fcfa },
        { label: 'Complément Annexe 8', amount: lfi.annexe8_supplement_fcfa },
      ].filter((item) => item.amount > 0)
    : [];
  const provenanceAmounts: BudgetPresentationAmount[] = [
    view.reference,
    ...(lfi?.status === 'VERIFIED_LFI' && lfi.total_cp_fcfa != null
      ? [{
          amount_fcfa: lfi.total_cp_fcfa,
          label: lfi.label,
          precision: 'EXACT' as const,
          verification: 'VERIFIED_AMOUNT' as const,
          source: lfi.source,
        }]
      : []),
    ...visibleSupplements,
  ];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3 text-slate-800 min-w-0" aria-label="Comprendre le budget de référence">
      {!compact && <h3 className="font-black text-sm">Comprendre — budget de référence</h3>}
      {renderAmount(view.reference, true)}
      {lfi?.status === 'VERIFIED_LFI' && lfi.total_cp_fcfa != null && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-2.5 sm:p-3 space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[11px] font-black text-sky-950">
              Dotation de l’État (LFI 2026)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-200">
              {view.reference.amount_fcfa == null ? 'Disponible en attente du BP définitif' : 'Périmètre distinct du BP'}
            </span>
          </div>
          <p className={`${compact ? 'text-sm' : 'text-lg sm:text-xl'} font-black text-sky-950 break-words`}>
            {formatQualifiedFCFA(lfi.total_cp_fcfa, 'EXACT')}
          </p>
          <p className="text-xs text-sky-900/80 break-words">{formatAmountInWords(lfi.total_cp_fcfa)}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            {lfi.source.source_url && (
              <a
                href={`${lfi.source.source_url}${lfi.source.pdf_page ? `#page=${lfi.source.pdf_page}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={event => event.stopPropagation()}
                className="underline font-semibold text-brand-blue focus-visible:outline focus-visible:outline-2 rounded"
              >
                Loi de Finances 2026{lfi.source.pdf_page ? ` · PDF p. ${lfi.source.pdf_page}` : ''}
              </a>
            )}
            {lfi.annexe8_source_url && (
              <a
                href={`${lfi.annexe8_source_url}${lfi.annexe8_pdf_page ? `#page=${lfi.annexe8_pdf_page}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={event => event.stopPropagation()}
                className="underline font-semibold text-brand-blue focus-visible:outline focus-visible:outline-2 rounded"
              >
                Annexe 8 DGBF 2026{lfi.annexe8_pdf_page ? ` · PDF p. ${lfi.annexe8_pdf_page}` : ''}
              </a>
            )}
            {!compact && lfi.lfi_action_code && (
              <span className="text-slate-600 font-medium">Action LFI : {lfi.lfi_action_code}</span>
            )}
          </div>
          {!compact && lfiBreakdownItems.length > 0 && (
            <div className="pt-1.5 mt-1 border-t border-sky-200/80 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
              {lfiBreakdownItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span>{item.label} :</span>
                  <span className="font-bold text-slate-900">{formatFCFA(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {lfi?.status === 'NO_NOMINATIVE_LFI_LINE' && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-700 leading-relaxed">
          Dotation État (LFI 2026) : aucune ligne nominative identifiée dans le programme 2204040 (ne prouve pas l’absence de concours).
        </p>
      )}
      <p className="text-xs text-slate-600 leading-relaxed" role="note">{view.notice}</p>
      {!compact && (
        <>
          {visibleSupplements.map((amount, index) => <div key={index} className="border-t border-slate-200 pt-3">{renderAmount(amount)}</div>)}
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
              {provenanceAmounts.map((amount, index) => <div key={index} className="space-y-1">
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
