import React, { useEffect, useState } from 'react';
import { 
  Institution, 
  AdministrativeAccount, 
  CAInvestmentOperation 
} from '../types';
import { 
  getAdministrativeAccountsForInstitution, 
  getLatestAvailableCA 
} from '../data/administrativeAccountsData';
import { 
  calculateExecutionRate, 
  getExecutionRateBadgeColor, 
  getExecutionStatusLabel 
} from '../utils/budgetCalculations';
import { 
  formatFCFA, formatRecordAmount, amountPrecision, isExactAmount,
  formatAmountInWords 
} from '../utils/formatters';
import { isSafeUrl } from '../utils/security';
import { 
  ShieldCheck, 
  CheckCircle2, 
  HelpCircle, 
  TrendingUp, 
  Layers, 
  FileText, 
  ExternalLink, 
  Search, 
  Filter, 
  AlertCircle, 
  Info, 
  Download, 
  MessageSquare, 
  Camera, 
  Building2, 
  Calendar, 
  Check, 
  ArrowRight,
  Scale
} from 'lucide-react';
import { CompteAdministratifExplainerModal } from './CompteAdministratifExplainerModal';
import { fetchAdministrativeAccounts } from '../services/administrativeAccountsService';
import { consolidateBudgetCycle, formatBudgetTypeLabel } from '../utils/budgetCycleEngine';
import { dataStore } from '../services/dataStore';

interface AdministrativeAccountViewProps {
  institution: Institution;
  onOpenDocRequest: (documentTitle?: string) => void;
}

export const AdministrativeAccountView: React.FC<AdministrativeAccountViewProps> = ({
  institution,
  onOpenDocRequest,
}) => {
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [opSearch, setOpSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedMatchLevel, setSelectedMatchLevel] = useState<'ALL' | 'STRONG' | 'PARTIAL' | 'NONE'>('ALL');
  const [copiedData, setCopiedData] = useState(false);
  const [fieldContributionMsg, setFieldContributionMsg] = useState<string | null>(null);

  const staticAccountsById = getAdministrativeAccountsForInstitution(institution.id) || [];
  const staticAccounts = staticAccountsById.length
    ? staticAccountsById
    : getAdministrativeAccountsForInstitution(institution.name);
  const [remoteAccounts, setRemoteAccounts] = useState<AdministrativeAccount[] | null>(null);

  useEffect(() => {
    let active = true;
    setRemoteAccounts(null);
    void fetchAdministrativeAccounts(institution.id)
      .then(accounts => { if (active) setRemoteAccounts(accounts); })
      .catch(() => { if (active) setRemoteAccounts([]); });
    return () => { active = false; };
  }, [institution.id]);

  const effectiveAccounts = remoteAccounts && remoteAccounts.length > 0 ? remoteAccounts : staticAccounts;
  const availableYears = effectiveAccounts.map(a => a.fiscal_year);
  const [selectedYear, setSelectedYear] = useState<number>(staticAccounts[0]?.fiscal_year || 2024);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears.join(','), selectedYear]);

  const currentCA: AdministrativeAccount | undefined = effectiveAccounts.find(
    a => a.fiscal_year === selectedYear
  ) || effectiveAccounts[0];

  // Complete Budget Cycle Consolidation (BP -> BS/BM -> Final Credits -> CA)
  const allBudgets = dataStore.getLocalBudgets(institution.id);
  const cycleConsolidation = consolidateBudgetCycle(
    institution.id, 
    selectedYear, 
    allBudgets, 
    effectiveAccounts
  );

  // Dynamic calculations
  const operatingRate = currentCA 
    ? calculateExecutionRate(currentCA.operating_realized, currentCA.operating_planned, amountPrecision(currentCA, 'operating_realized'), amountPrecision(currentCA, 'operating_planned'))
    : null;

  const investmentRate = currentCA 
    ? calculateExecutionRate(currentCA.investment_realized, currentCA.investment_planned, amountPrecision(currentCA, 'investment_realized'), amountPrecision(currentCA, 'investment_planned'))
    : null;

  const totalRate = currentCA 
    ? calculateExecutionRate(currentCA.total_realized, currentCA.total_planned, amountPrecision(currentCA, 'total_realized'), amountPrecision(currentCA, 'total_planned'))
    : null;

  // Filter operations
  const filteredOperations = (currentCA?.operations || []).filter(op => {
    const matchesSearch = !opSearch.trim() ||
      op.title.toLowerCase().includes(opSearch.toLowerCase().trim()) ||
      (op.location && op.location.toLowerCase().includes(opSearch.toLowerCase().trim())) ||
      (op.operation_reference && op.operation_reference.toLowerCase().includes(opSearch.toLowerCase().trim())) ||
      (op.procurement_match?.contractor && op.procurement_match.contractor.toLowerCase().includes(opSearch.toLowerCase().trim()));

    const matchesSector = selectedSector === 'ALL' || op.sector === selectedSector;
    const matchesMatch = selectedMatchLevel === 'ALL' || (op.procurement_match && op.procurement_match.match_level === selectedMatchLevel);

    return matchesSearch && matchesSector && matchesMatch;
  });

  const uniqueSectors = Array.from(
    new Set((currentCA?.operations || []).map(op => op.sector).filter(Boolean))
  );

  // Export functions
  const handleExportJson = () => {
    if (!currentCA) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentCA, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `compte_administratif_${currentCA.institution_name.replace(/\s+/g, '_')}_${currentCA.fiscal_year}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    if (!currentCA) return;
    const headers = ["Reference", "Titre", "Secteur", "Localisation", "Prevu_FCFA", "Realise_FCFA", "Taux_Execution_Pct", "Marche_DGMP", "Attributaire", "Statut_Terrain"];
    const rows = (currentCA.operations || []).map(op => {
      const rate = calculateExecutionRate(op.executed_amount, op.planned_amount, amountPrecision(op, 'executed_amount'), amountPrecision(op, 'planned_amount'));
      return [
        `"${op.operation_reference || ''}"`,
        `"${op.title.replace(/"/g, '""')}"`,
        `"${op.sector}"`,
        `"${op.location || ''}"`,
        `"${formatRecordAmount(op, 'planned_amount')}"`,
        `"${formatRecordAmount(op, 'executed_amount')}"`,
        `"${rate.formatted}"`,
        `"${op.procurement_match?.contract_number || op.procurement_match?.verification_status || 'Non répertorié'}"`,
        `"${op.procurement_match?.contractor || 'Régie/Gré à gré'}"`,
        `"${op.citizen_status}"`
      ].join(';');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `operations_ca_${currentCA.institution_name.replace(/\s+/g, '_')}_${currentCA.fiscal_year}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // If no account exists for this entity
  if (!currentCA) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  Compte Administratif en attente de publication
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Exercice 2024 / 2025
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Compte Administratif non disponible dans le référentiel public pour {institution.name}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                Le Compte Administratif (CA) retrace <strong>l'exécution financière réelle et définitive</strong> de l'exercice clos (recettes recouvrées et dépenses ordonnancées). Il est arrêté par le Maire ou le Président et voté par le Conseil avant d'être transmis à la tutelle (Direction Générale de la Décentralisation et du Développement Local — DGDDL).
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Engagement Républicain de Vérifiabilité & Open Data</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              Conformément à notre charte de déontologie, <strong>aucun taux d'exécution approximatif ou non certifié n'est publié sans pièce justificative officielle</strong> (délibération du Conseil + visa du Trésor Public).
            </p>
            <p className="text-slate-500 text-[11px]">
              Vous pouvez exercer votre droit citoyen d'accès à l'information publique (Loi n°2013-867 relative à la CAIDP) pour demander communication de la délibération du Compte Administratif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onOpenDocRequest(`Compte Administratif officiel de ${institution.name}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>Faire une demande de Compte Administratif (Loi CAIDP)</span>
            </button>

            <button
              onClick={() => setIsExplainerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-brand-blue" />
              <span>Qu'est-ce qu'un compte administratif ?</span>
            </button>
          </div>
        </div>

        <CompteAdministratifExplainerModal 
          isOpen={isExplainerOpen}
          onClose={() => setIsExplainerOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* ========================================================================= */}
      {/* 1. EN-TÊTE OFFICIEL DE L'EXÉCUTION + SELECTEUR D'EXERCICE + BOUTON GUIDE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Compte Administratif Officiel Vérifié
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                Exercice {currentCA.fiscal_year}
              </span>
              {currentCA.verification_status === 'OFFICIAL_DOCUMENT' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-brand-blue border border-blue-200">
                  Délibération Certifiée
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
              Exécution Budgétaire Réelle de {institution.name}
            </h3>

            {/* Smart fallback note */}
            <p className="text-xs text-brand-blue font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Dernier compte administratif disponible : <strong>exercice {currentCA.fiscal_year}</strong>. Le compte administratif de l'exercice suivant sera publié dès son adoption par le Conseil et visa par la tutelle.
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
            {/* Multi-exercices selector if available */}
            {availableYears.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-500 pl-2">Exercice :</span>
                {availableYears.map(yr => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      selectedYear === yr
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsExplainerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-brand-blue border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <HelpCircle className="w-3.5 h-3.5 text-brand-blue" />
              <span>Qu'est-ce qu'un compte administratif ?</span>
            </button>
          </div>
        </div>

        {/* Métadonnées Délibération & Tutelle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Date Délibération Conseil</span>
            <strong className="text-slate-900">{currentCA.approval_date || 'Enregistrée'}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Visa de Tutelle Préfecture</span>
            <strong className="text-slate-900">{currentCA.prefecture_visa_date || 'Visé par la Préfecture'}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Document Source</span>
            <div className="flex items-center gap-1 truncate">
              <span className="text-slate-900 truncate" title={currentCA.source_document}>
                {currentCA.source_document}
              </span>
              {currentCA.source_url && isSafeUrl(currentCA.source_url) && (
                <a
                  href={currentCA.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue hover:underline inline-flex items-center"
                  title="Consulter la source"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 1.5 TRAÇABILITÉ DU CYCLE BUDGÉTAIRE : BP → MODIFICATIONS → CRÉDITS DÉFINITIFS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-blue" />
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Traçabilité du Cycle Budgétaire — Exercice {selectedYear}
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            BP initial → Modifications officielles → Crédits définitifs calculés
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Étape A : Budget Primitif Initial */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              A. Budget Primitif Initial
            </span>
            <div className="text-base font-black text-slate-900">
              {cycleConsolidation.initial_budget?.total.amount != null
                ? formatFCFA(cycleConsolidation.initial_budget.total.amount)
                : formatRecordAmount(currentCA, 'total_planned')}
            </div>
            <p className="text-[11px] text-slate-500">
              {cycleConsolidation.initial_budget?.document?.document_name || 'Crédits votés initiaux extraits de l\'acte budgétaire officiel.'}
            </p>
          </div>

          {/* Étape B : Modifications Budgétaires */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-blue block">
                B. Modifications Budgétaires
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-blue-200 text-brand-blue">
                {cycleConsolidation.amendments.length} acte(s)
              </span>
            </div>
            <div className="text-base font-black text-brand-blue">
              {cycleConsolidation.net_amendments.total !== null
                ? `${cycleConsolidation.net_amendments.total >= 0 ? '+' : '-'}${formatFCFA(Math.abs(cycleConsolidation.net_amendments.total))}`
                : 'Non documenté'}
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              {cycleConsolidation.amendments_explanation}
            </p>
          </div>

          {/* Étape C : Crédits Définitifs (Valeur Dérivée ou Source Confirmée) */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                C. Crédits Définitifs
              </span>
              {cycleConsolidation.final_credits_status === 'DERIVED_FROM_DOCUMENTED_AMENDMENTS' && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 uppercase">
                  Calculé (Dérivé)
                </span>
              )}
              {cycleConsolidation.final_credits_status === 'SOURCE_CONFIRMED' && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 uppercase">
                  Source Officielle
                </span>
              )}
              {cycleConsolidation.final_credits_status === 'NOT_ESTABLISHED' && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                  Non Établis
                </span>
              )}
            </div>
            <div className="text-base font-black text-emerald-950">
              {cycleConsolidation.final_credits?.total.amount != null ? (
                formatFCFA(cycleConsolidation.final_credits.total.amount)
              ) : (
                <span className="text-slate-500 font-bold text-sm">Non établis</span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              {cycleConsolidation.final_credits?.total.formula || cycleConsolidation.final_credits_notice || 'Les crédits définitifs ne peuvent pas être établis avec les documents actuellement disponibles.'}
            </p>
            {cycleConsolidation.documented_adjusted_amount?.total != null && (
              <div className="text-[10px] text-amber-800 bg-amber-50 rounded p-1 border border-amber-200">
                Montant ajusté provisoire : <strong>{formatFCFA(cycleConsolidation.documented_adjusted_amount.total)}</strong> (chaîne d'actes partielle)
              </div>
            )}
          </div>
        </div>

        {/* Détail pédagogique des doubles taux d'exécution si crédits définitifs établis */}
        {cycleConsolidation.execution_comparison?.vs_final_credits && cycleConsolidation.execution_comparison?.vs_initial_budget ? (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-slate-700">
              <strong>Double lecture civique :</strong> Taux d'exécution sur crédits définitifs = <strong>{cycleConsolidation.execution_comparison.vs_final_credits.total.formatted}</strong> vs Taux sur budget primitif initial = <strong>{cycleConsolidation.execution_comparison.vs_initial_budget.total.formatted}</strong>.
            </span>
            <span className="text-[10px] text-slate-500 italic">
              Les deux indicateurs mesurent respectivement le respect de l'autorisation finale et l'évolution par rapport aux orientations initiales.
            </span>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-slate-700">
              <strong>Lecture civique :</strong> Taux d'exécution mesuré sur le budget primitif initial ({cycleConsolidation.execution_comparison?.vs_initial_budget?.total.formatted || 'non calculé'}). Crédits définitifs non établis à ce jour.
            </span>
            <span className="text-[10px] text-slate-500 italic">
              Absence de document public ≠ Preuve d'absence d'actes administratifs.
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SYNTHÈSE DES 3 VOLETS FINANCIERS AVEC FORMULE DYNAMIQUE CALCULÉE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        
        {/* Volet 1 : Fonctionnement */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                1. Dépenses de Fonctionnement
              </span>
              {operatingRate && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${operatingRate.badgeClass}`}>
                  {operatingRate.formatted}
                </span>
              )}
            </div>

            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500 font-medium">Ce qui était prévu :</span>
                <strong className="text-slate-900">{formatRecordAmount(currentCA, 'operating_planned')}</strong>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500 font-medium">Ce qui a été réalisé financièrement :</span>
                <strong className="text-slate-900 text-sm font-black">{formatRecordAmount(currentCA, 'operating_realized')}</strong>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500 font-medium">Écart :</span>
                <span className={`font-bold ${isExactAmount(currentCA, 'operating_planned') && isExactAmount(currentCA, 'operating_realized') && currentCA.operating_realized! > currentCA.operating_planned! ? 'text-purple-700' : 'text-slate-700'}`}>
                  {isExactAmount(currentCA, 'operating_planned') && isExactAmount(currentCA, 'operating_realized')
                    ? `${(currentCA.operating_realized! - currentCA.operating_planned!) >= 0 ? '+' : '-'}${formatFCFA(Math.abs(currentCA.operating_planned! - currentCA.operating_realized!))}`
                    : 'Non calculable'}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-[11px]">
                <span className="text-slate-500 font-medium">Taux d'exécution :</span>
                <span className="font-black text-brand-blue">{operatingRate?.formatted}</span>
              </div>
            </div>

            {/* Jauge */}
            <div className="space-y-1 pt-1">
              <div hidden={operatingRate?.rate == null} className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (operatingRate?.rate || 0) > 100 ? 'bg-purple-600' :
                    (operatingRate?.rate || 0) >= 90 ? 'bg-emerald-500' :
                    (operatingRate?.rate || 0) >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                  }`} 
                  style={{ width: `${Math.min(100, operatingRate?.rate || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {currentCA.operating_revenue_realized != null && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
              Recettes de fonctionnement encaissées : <strong className="text-slate-900">{formatRecordAmount(currentCA, 'operating_revenue_realized')}</strong>
            </div>
          )}
        </div>

        {/* Volet 2 : Investissement */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                2. Dépenses d'Investissement
              </span>
              {investmentRate && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${investmentRate.badgeClass}`}>
                  {investmentRate.formatted}
                </span>
              )}
            </div>

            <div className="space-y-1.5 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500 font-medium">Ce qui était prévu :</span>
                <strong className="text-slate-900">{formatRecordAmount(currentCA, 'investment_planned')}</strong>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500 font-medium">Ce qui a été réalisé financièrement :</span>
                <strong className="text-slate-900 text-sm font-black">{formatRecordAmount(currentCA, 'investment_realized')}</strong>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-emerald-200 text-[11px]">
                <span className="text-slate-500 font-medium">Écart :</span>
                <span className="font-bold text-slate-700">
                  {isExactAmount(currentCA, 'investment_planned') && isExactAmount(currentCA, 'investment_realized')
                    ? `${(currentCA.investment_realized! - currentCA.investment_planned!) >= 0 ? '+' : '-'}${formatFCFA(Math.abs(currentCA.investment_planned! - currentCA.investment_realized!))}`
                    : 'Non calculable'}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-[11px]">
                <span className="text-slate-500 font-medium">Taux d'exécution :</span>
                <span className="font-black text-emerald-700">{investmentRate?.formatted}</span>
              </div>
            </div>

            {/* Jauge */}
            <div className="space-y-1 pt-1">
              <div hidden={investmentRate?.rate == null} className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (investmentRate?.rate || 0) >= 80 ? 'bg-emerald-600' :
                    (investmentRate?.rate || 0) >= 60 ? 'bg-blue-600' : 'bg-amber-500'
                  }`} 
                  style={{ width: `${Math.min(100, investmentRate?.rate || 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>{currentCA.operations.length} opérations identifiées</span>
              </div>
            </div>
          </div>

          {currentCA.investment_revenue_realized != null && (
            <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
              Recettes d'investissement recouvrées : <strong className="text-emerald-950">{formatRecordAmount(currentCA, 'investment_revenue_realized')}</strong>
            </div>
          )}
        </div>

        {/* Volet 3 : Total Consolidé & Résultat */}
        <div className="bg-gradient-to-br from-slate-900 to-brand-blue-dark text-white rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/20">
                3. Total Consolidé
              </span>
              {totalRate && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                  {totalRate.formatted}
                </span>
              )}
            </div>

            <div className="space-y-1.5 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-blue-200 font-medium">Ce qui était prévu :</span>
                <strong className="text-white">{formatRecordAmount(currentCA, 'total_planned')}</strong>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-blue-200 font-medium">Ce qui a été réalisé financièrement :</span>
                <strong className="text-amber-300 text-sm font-black">{formatRecordAmount(currentCA, 'total_realized')}</strong>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-white/15 text-[11px]">
                <span className="text-blue-200 font-medium">Écart :</span>
                <span className="font-bold text-amber-200">
                  {isExactAmount(currentCA, 'total_planned') && isExactAmount(currentCA, 'total_realized')
                    ? `${(currentCA.total_realized! - currentCA.total_planned!) >= 0 ? '+' : '-'}${formatFCFA(Math.abs(currentCA.total_planned! - currentCA.total_realized!))}`
                    : 'Non calculable'}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-[11px]">
                <span className="text-blue-200 font-medium">Taux d'exécution global :</span>
                <span className="font-black text-amber-300">{totalRate?.formatted}</span>
              </div>
            </div>

            {/* Jauge globale */}
            <div className="space-y-1 pt-1">
              <div hidden={totalRate?.rate == null} className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, totalRate?.rate || 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-blue-200 font-medium">
                <span>{getExecutionStatusLabel(totalRate?.status || 'NORMAL')}</span>
              </div>
            </div>
          </div>

          {currentCA.surplus_or_deficit != null && (
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 text-[11px] text-white">
              {currentCA.surplus_or_deficit >= 0 ? (
                <>
                  Excédent budgétaire de clôture : <strong className="text-emerald-300">{formatRecordAmount(currentCA, 'surplus_or_deficit')}</strong>
                </>
              ) : (
                <>
                  Déficit d'exercice : <strong className="text-rose-300">{formatRecordAmount(currentCA, 'surplus_or_deficit')}</strong>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. DÉTAIL DES OPÉRATIONS D'INVESTISSEMENT & RAPPROCHEMENT MARCHÉS PUBLICS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-blue" />
              <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Chantiers d'Investissement & Rapprochement Marchés Publics (DGMP)
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Traçabilité des {currentCA.operations.length} opérations d'infrastructures financées sur l'exercice {currentCA.fiscal_year}.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Exporter les opérations en CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Exporter les données en JSON Open Data"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Règle Républicaine Non Négociable */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
          <Scale className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block text-amber-900">Règle républicaine d'imputabilité : Réalisé financier ≠ Réalisation physique</span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Une dépense ordonnancée ou un marché public attribué documentent un engagement financier et juridique, jamais la livraison physique des travaux sur le terrain. À l'inverse, 0 FCFA ordonnancé au CA sur un exercice ne signifie pas l'abandon d'un projet (report budgétaire).
            </p>
          </div>
        </div>

        {/* Filtres Opérations */}
        <div className="flex flex-col lg:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une opération (santé, école, marché, entreprise...)"
              value={opSearch}
              onChange={(e) => setOpSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-1.5 w-full lg:w-auto">
            {uniqueSectors.length > 0 && (
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="min-w-0 max-w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <option value="ALL">Tous les secteurs</option>
                {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <select
              value={selectedMatchLevel}
              onChange={(e) => setSelectedMatchLevel(e.target.value as any)}
              className="min-w-0 max-w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <option value="ALL">Tous les rapprochements DGMP</option>
              <option value="STRONG">Marché Retrouvé (DGMP)</option>
              <option value="PARTIAL">Rapprochement Partiel</option>
              <option value="NONE">Non Retrouvé (DGMP)</option>
            </select>
          </div>
        </div>

        {/* Liste des Opérations */}
        <div className="space-y-3 pt-1">
          {filteredOperations.map((op) => {
            const opRate = calculateExecutionRate(op.executed_amount, op.planned_amount, amountPrecision(op, 'executed_amount'), amountPrecision(op, 'planned_amount'));
            const match = op.procurement_match;

            return (
              <div 
                key={op.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-white space-y-3 shadow-2xs"
              >
                {/* Ligne 1 : Titre + Statut Citoyen + Taux */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {op.operation_reference}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-brand-blue border border-blue-200">
                        {op.sector}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        📍 {op.location}
                      </span>
                      {op.source_page && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          (Page {op.source_page} du CA)
                        </span>
                      )}
                    </div>
                    <h5 className="text-sm font-black text-slate-900 leading-snug">
                      {op.title}
                    </h5>
                  </div>

                  <div className="text-left sm:text-right flex-shrink-0 space-y-0.5">
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <span className="text-xs font-bold text-slate-500">Taux :</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${opRate.badgeClass}`}>
                        {opRate.formatted}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ventilation Financière : Prévu vs Réalisé Financièrement */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Ce qui était prévu</span>
                    <strong className="text-slate-900 block">{formatRecordAmount(op, 'planned_amount')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Ce qui a été réalisé financièrement</span>
                    <strong className="text-slate-900 block">{formatRecordAmount(op, 'executed_amount')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Écart</span>
                    <span className="font-bold text-slate-700 block">
                      {op.planned_amount != null && op.executed_amount != null
                        ? `${(op.executed_amount - op.planned_amount) >= 0 ? '+' : '-'}${formatFCFA(Math.abs(op.planned_amount - op.executed_amount))}`
                        : 'Non calculable'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Taux d'exécution</span>
                    <span className="font-black text-brand-blue block">{opRate.formatted}</span>
                  </div>
                </div>

                {/* Ligne 2 : Bloc Rapprochement Marchés Publics DGMP */}
                <div className="p-3 rounded-xl border text-xs space-y-2 bg-slate-50/70 border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Marchés publics rapprochés (DGMP) :
                      </span>
                      {match?.match_level === 'STRONG' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Marché DGMP Retrouvé & Validé
                        </span>
                      )}
                      {match?.match_level === 'PARTIAL' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          Rapprochement DGMP Partiel
                        </span>
                      )}
                      {(!match || match.match_level === 'NONE') && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                          <Info className="w-3 h-3 text-slate-500" />
                          Non retrouvé sur le portail DGMP
                        </span>
                      )}
                    </div>

                    {match?.tender_number && (
                      <span className="text-[11px] font-mono text-slate-600 font-bold">
                        Avis : {match.tender_number}
                      </span>
                    )}
                  </div>

                  {/* Détails du marché si retrouvé */}
                  {match && match.match_level !== 'NONE' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-400 block font-medium">Contrat / Titulaire :</span>
                        <strong className="text-slate-900">{match.contractor || 'Non spécifié'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Montant attribué :</span>
                        <strong className="text-slate-900">{formatRecordAmount(match, 'award_amount')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Date d'attribution :</span>
                        <strong className="text-slate-900">{match.award_date || 'Exercice clos'}</strong>
                      </div>
                    </div>
                  )}

                  {/* Clarification citoyenne pour "NON RETROUVÉ" */}
                  {(!match || match.match_level === 'NONE') && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-snug space-y-1">
                      <p>
                        <strong>Note républicaine d'équité :</strong> « Non retrouvé » ne signifie <strong>pas</strong> que le marché n'existe pas.
                      </p>
                      <p className="text-slate-500 italic">
                        Les prestations exécutées en régie directe municipale, par bons de commande sous les seuils d'appel d'offres obligatoires ou par entente directe ne figurent pas systématiquement sur le portail centralisé de la DGMP.
                      </p>
                    </div>
                  )}

                  {match?.notes && (
                    <p className="text-[11px] text-slate-500 italic pt-0.5">
                      Précision : {match.notes}
                    </p>
                  )}
                </div>

                {/* Bloc Pédagogique d'Imputabilité : Ce que les documents prouvent vs ce qu'ils ne permettent pas d'affirmer */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Ce que les documents prouvent
                    </span>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {op.executed_amount === 0 && match ? (
                        <>Attribution officielle du marché public DGMP (n° <strong>{match.tender_number}</strong>, {formatRecordAmount(match, 'award_amount')}, titulaire <strong>{match.contractor}</strong>), mais <strong>0 FCFA ordonnancé</strong> au Compte Administratif {op.fiscal_year} (opération reportée / non mandatée sur l'exercice clos).</>
                      ) : match && match.match_level === 'STRONG' ? (
                        <>Attribution du marché public (Avis <strong>{match.tender_number}</strong>, {formatRecordAmount(match, 'award_amount')}, <strong>{match.contractor}</strong>) et ordonnancement effectif de <strong>{formatRecordAmount(op, 'executed_amount')}</strong> retracé au Compte Administratif{op.source_page ? ` (page ${op.source_page})` : ''}.</>
                      ) : (
                        <>Ordonnancement financier de <strong>{formatRecordAmount(op, 'executed_amount')}</strong> consigné dans le Compte Administratif officiel{op.source_page ? ` (page ${op.source_page})` : ''}.</>
                      )}
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Ce qu'ils ne permettent pas encore d'affirmer
                    </span>
                    <p className="text-slate-600 text-[11px] leading-relaxed italic">
                      Un mandat financier ou un marché attribué ne prouvent jamais à eux seuls l'achèvement physique des travaux sur le terrain. De même, 0 FCFA ordonnancé sur un exercice ne signifie pas que le projet est abandonné.
                    </p>
                  </div>
                </div>

                {/* Ligne 3 : Observation Citoyenne & Preuve de Terrain */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      <Camera className="w-3 h-3 text-slate-500" />
                      <span>{op.citizen_proofs_count || 0} observation(s) citoyenne(s) de terrain</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      op.citizen_status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800' :
                      op.citizen_status === 'IN_PROGRESS' ? 'bg-blue-50 text-brand-blue' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {op.citizen_status === 'COMPLETED' ? 'Chantier Livré' :
                       op.citizen_status === 'IN_PROGRESS' ? 'En Cours d\'Exécution' : 'Programmé'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setFieldContributionMsg(`Merci pour votre engagement civique ! L'équipe SuiviBudget CI a bien noté votre volonté de documenter l'opération "${op.title}". Vous pouvez envoyer vos photos géolocalisées ou documents à contact@suivibudget.ci.`);
                      setTimeout(() => setFieldContributionMsg(null), 6000);
                    }}
                    className="inline-flex items-center gap-1.5 text-brand-blue hover:text-brand-blue-dark font-bold text-xs hover:underline cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Transmettre une observation de terrain →</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredOperations.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Info className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-bold">Aucune opération ne correspond à vos filtres.</p>
              <button
                onClick={() => {
                  setOpSearch('');
                  setSelectedSector('ALL');
                  setSelectedMatchLevel('ALL');
                }}
                className="text-xs text-brand-blue hover:underline font-bold"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Message éphémère de contribution citoyenne */}
        {fieldContributionMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <span>{fieldContributionMsg}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. DROIT DE RÉPONSE ET PRÉCISIONS DE L'INSTITUTION */}
      {/* ========================================================================= */}
      {currentCA.institution_response && (
        <div className="bg-white rounded-2xl p-5 border-l-4 border-l-brand-blue border-y border-r border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-blue" />
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Droit de Réponse & Précisions Officielles de l'Institution
              </h5>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Transmis le {currentCA.institution_response.response_date}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 italic">
            « {currentCA.institution_response.response_text} »
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>
              Auteur : <strong>{currentCA.institution_response.author_name}</strong> ({currentCA.institution_response.author_title})
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Vérifié Officiel
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TÉLÉCHARGEMENT & DEMANDE DE PIÈCES COMPLÉMENTAIRES (CAIDP) */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-black text-slate-900 block">
            Accès aux Documents Budgétaires & Données Ouvertes
          </span>
          <p className="text-slate-600">
            Téléchargez les données structurées ou demandez l'extrait certifié du procès-verbal de séance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenDocRequest(`Procès-verbal et compte de gestion du Compte Administratif ${currentCA.fiscal_year} de ${institution.name}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>Demande de pièces complémentaires (Loi CAIDP)</span>
          </button>
        </div>
      </div>

      {/* Modal explicative pédagogique */}
      <CompteAdministratifExplainerModal 
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

    </div>
  );
};
