import React from 'react';
import { Institution } from '../types';
import { 
  getLocalBudgetsForInstitution, 
  exportLocalBudgetsToCsv, 
  exportLocalBudgetsToJson 
} from '../data/localBudgetsReferential';
import { getAdministrativeAccountsForInstitution } from '../data/administrativeAccountsData';
import { formatRecordAmount, amountPrecision, isExactAmount } from '../utils/formatters';
import { 
  History, 
  Download, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  ExternalLink, 
  Info, 
  Layers, 
  FileText,
  Clock
} from 'lucide-react';
import { calculateExecutionRate } from '../utils/budgetCalculations';
import { formatBudgetTypeLabel } from '../utils/budgetCycleEngine';

interface LocalBudgetHistoryViewProps {
  institution: Institution;
  onOpenDocRequest: (documentTitle?: string) => void;
}

export const LocalBudgetHistoryView: React.FC<LocalBudgetHistoryViewProps> = ({
  institution,
  onOpenDocRequest,
}) => {
  // Retrieve historical local budgets (BP versions)
  let budgets = getLocalBudgetsForInstitution(institution.id);
  if (budgets.length === 0) {
    budgets = getLocalBudgetsForInstitution(institution.name);
  }

  // Retrieve administrative accounts (CA)
  let accounts = getAdministrativeAccountsForInstitution(institution.id);
  if (accounts.length === 0) {
    accounts = getAdministrativeAccountsForInstitution(institution.name);
  }

  const handleDownloadCsv = () => {
    const csv = exportLocalBudgetsToCsv(budgets);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historique_budgets_${institution.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadJson = () => {
    const json = exportLocalBudgetsToJson(budgets);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historique_budgets_${institution.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-blue" />
            <h4 className="text-base font-black text-slate-900">
              Historique Budgétaire & Traçabilité Multi-Exercices
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Évolution des budgets primitifs votés, visas de tutelle et comptes administratifs de <strong>{institution.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Exporter l'historique en CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Exporter l'historique en JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* 1. Comptes Administratifs Historiques */}
      <div className="space-y-3">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Comptes Administratifs d'Exécution Archivés
        </h5>

        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(ca => {
              const totalRate = calculateExecutionRate(ca.total_realized, ca.total_planned, amountPrecision(ca, 'total_realized'), amountPrecision(ca, 'total_planned'));
              return (
                <div key={ca.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Exercice {ca.fiscal_year}
                    </span>
                    <span className="text-xs font-black text-brand-blue">
                      Taux d'exécution : {totalRate.formatted}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Réalisé Mandaté</span>
                    <span className="text-lg font-black text-slate-900 block">
                      {formatRecordAmount(ca, 'total_realized')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      sur {formatRecordAmount(ca, 'total_planned')} votés au Budget
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1 text-slate-600">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span>• Fonctionnement réalisé :</span>
                      <strong className="text-slate-900">{formatRecordAmount(ca, 'operating_realized')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>• Investissement réalisé :</span>
                      <strong className="text-slate-900">{formatRecordAmount(ca, 'investment_realized')}</strong>
                    </div>
                    {ca.surplus_or_deficit != null && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span>• Solde de clôture :</span>
                        <strong className={ca.surplus_or_deficit >= 0 ? "text-emerald-700" : "text-rose-700"}>
                          {ca.surplus_or_deficit >= 0 ? '+' : ''}{formatRecordAmount(ca, 'surplus_or_deficit')}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Session : {ca.approval_date}</span>
                    <span>Visa Préfecture : {ca.prefecture_visa_date || 'Enregistré'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Aucun compte administratif antérieur archivé dans le référentiel pour cette collectivité.</span>
          </div>
        )}
      </div>

      {/* 2. Budgets Primitifs Historiques & Versions */}
      <div className="space-y-3">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-blue" />
          Budgets Primitifs Votés & Versions d'Autorisation
        </h5>

        {budgets.length > 0 ? (
          <div className="space-y-3">
            {budgets.map(b => (
              <div 
                key={b.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all bg-white shadow-2xs space-y-3 ${
                  b.is_current_version ? 'border-brand-blue/50 ring-1 ring-brand-blue/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200">
                      Exercice {b.fiscal_year}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-brand-blue border border-blue-200">
                      {b.version_number != null ? `Version ${b.version_number} : ` : ''}{formatBudgetTypeLabel(b.budget_type)}
                    </span>
                    {b.is_current_version && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Version Actuelle
                      </span>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900 block">
                      {formatRecordAmount(b, 'total_amount')}
                    </span>
                    <span className="text-[11px] font-semibold text-brand-blue">

                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap justify-between gap-2 items-center">
                    <span className="text-slate-600">• Fonctionnement :</span>
                    <strong className="text-slate-900">{formatRecordAmount(b, 'operating_amount')}{isExactAmount(b, 'operating_amount') && isExactAmount(b, 'total_amount') && b.operating_percentage != null ? ` (${b.operating_percentage.toFixed(1)} %)` : ''}</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200 flex flex-wrap justify-between gap-2 items-center">
                    <span className="text-emerald-800">• Investissement :</span>
                    <strong className="text-emerald-950">{formatRecordAmount(b, 'investment_amount')}{isExactAmount(b, 'investment_amount') && isExactAmount(b, 'total_amount') && b.investment_percentage != null ? ` (${b.investment_percentage.toFixed(1)} %)` : ''}</strong>
                  </div>
                </div>

                {b.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 italic">
                    « {b.notes} »
                  </p>
                )}

                {/* Historique des révisions de tutelle */}
                {b.revision_history && b.revision_history.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Journal des modifications & arbitrage de tutelle :
                    </span>
                    {b.revision_history.map(rev => (
                      <div key={rev.id} className="p-2 bg-amber-50/60 rounded-lg border border-amber-200/60 text-slate-700 flex justify-between items-center">
                        <span>{rev.reason} ({rev.source})</span>
                        <strong className="text-slate-900">{rev.changed_at.split('T')[0]}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Adoption : {b.adoption_date || 'Enregistrée'}</span>
                  {b.tutelle_approval_date && <span>Visa Tutelle : {b.tutelle_approval_date}</span>}
                  {b.primary_source_label && <span>Source : {b.primary_source_label}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Aucune version antérieure de budget primitif enregistrée pour cette collectivité.</span>
          </div>
        )}
      </div>

    </div>
  );
};
