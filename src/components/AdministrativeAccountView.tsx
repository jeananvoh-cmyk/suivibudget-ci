import React, { useEffect, useState } from 'react';
import { 
  Institution, 
  AdministrativeAccount, 
  CAInvestmentOperation,
  PublicDocument
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
  formatFCFA, formatFCFAWithWords, formatQualifiedFCFA, formatRecordAmount, amountPrecision, isExactAmount, formatAmountInWords
} from '../utils/formatters';
import { isSafeUrl } from '../utils/security';
import { openPublicDocument } from '../services/documentStorageService';
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
  Scale,
  Hash,
  Copy,
  FileSpreadsheet
} from 'lucide-react';
import { CompteAdministratifExplainerModal } from './CompteAdministratifExplainerModal';
import { fetchAdministrativeAccounts } from '../services/administrativeAccountsService';
import { consolidateBudgetCycle, formatBudgetTypeLabel } from '../utils/budgetCycleEngine';
import { dataStore } from '../services/dataStore';

interface AdministrativeAccountViewProps {
  institution: Institution;
  onOpenDocRequest: (documentTitle?: string) => void;
}

const normalizeInstitutionLabel = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(mairie|commune|conseil\s+regional|region|district(\s+autonome)?)\s+(de\s+|du\s+|des\s+|d'|de\s+la\s+)?/i, '')
    .replace(/[-_'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const detectInstitutionKind = (label: string): 'MAIRIE' | 'REGION' | null => {
  const l = (label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/\b(conseil\s+regional|region)\b/.test(l)) return 'REGION';
  if (/\b(mairie|commune|municipal)\b/.test(l)) return 'MAIRIE';
  return null;
};

export const getOperationPhysicalStatusLabel = (status: CAInvestmentOperation['citizen_status'] | string | null | undefined): string => {
  if (!status) return 'Réalisation physique non documentée';
  if (status === 'COMPLETED') return 'Terminé / Livré';
  if (status === 'IN_PROGRESS') return 'En cours';
  if (status === 'NOT_STARTED') return 'Voté au Budget';
  return status;
};

export const AdministrativeAccountView: React.FC<AdministrativeAccountViewProps> = ({
  institution,
  onOpenDocRequest,
}) => {
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [opSearch, setOpSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedMatchLevel, setSelectedMatchLevel] = useState<'ALL' | 'STRONG' | 'PARTIAL' | 'NONE'>('ALL');
  const [copiedSha256, setCopiedSha256] = useState(false);
  const [fieldContributionMsg, setFieldContributionMsg] = useState<string | null>(null);
  const [, setStoreTick] = useState(0);

  useEffect(() => {
    return dataStore.subscribe(() => setStoreTick(t => t + 1));
  }, []);

  const formatReadableAmount = (value: number | null | undefined) =>
    value == null || !Number.isFinite(value) ? 'Montant à confirmer' : formatFCFAWithWords(value);

  const formatReadableRecordAmount = <T extends { import_provenance?: any; amount_precision?: any }>(
    record: T,
    field: keyof T
  ) => {
    const value = record[field];
    return typeof value === 'number' && Number.isFinite(value)
      ? `${formatRecordAmount(record, field)} (${formatAmountInWords(value)} FCFA)`
      : formatRecordAmount(record, field);
  };

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
        `"${formatReadableRecordAmount(op, 'planned_amount')}"`,
        `"${formatReadableRecordAmount(op, 'executed_amount')}"`,
        `"${rate.formatted}"`,
        `"${op.procurement_match?.contract_number || op.procurement_match?.verification_status || 'Non répertorié'}"`,
        `"${op.procurement_match?.contractor || 'Régie/Gré à gré'}"`,
        `"${getOperationPhysicalStatusLabel(op.citizen_status)}"`
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

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedSha256(true);
    setTimeout(() => setCopiedSha256(false), 2000);
  };

  // Matching document from public library (even when structured CA row is not yet published)
  const documents = dataStore.getDocuments();
  const cleanInstName = normalizeInstitutionLabel(institution.name);
  const isInstitutionCADoc = (d: PublicDocument) => {
    const isCADoc = d.category === 'COMPTE_ADMINISTRATIF' || d.document_type === 'COMPTE_ADMINISTRATIF';
    if (!isCADoc) return false;
    if (d.institution_id) {
      return d.institution_id === institution.id;
    }
    const docKind = detectInstitutionKind(d.institution_name);
    if (docKind && (institution.type === 'MAIRIE' || institution.type === 'REGION') && docKind !== institution.type) {
      return false;
    }
    const docInst = normalizeInstitutionLabel(d.institution_name);
    return Boolean(cleanInstName && docInst && docInst === cleanInstName);
  };

  const matchingDoc = currentCA
    ? documents.find(d => 
        (currentCA.source_document_sha256 && d.checksum_sha256 === currentCA.source_document_sha256) ||
        (isInstitutionCADoc(d) && d.year === currentCA.fiscal_year) ||
        (currentCA.source_document && isInstitutionCADoc(d) && (d.title.includes(currentCA.source_document) || d.file_name.includes(currentCA.source_document)))
      )
    : [...documents]
        .filter(isInstitutionCADoc)
        .sort((a, b) => (b.year || 0) - (a.year || 0))[0];

  const sha256 = currentCA?.source_document_sha256 || matchingDoc?.checksum_sha256 || null;
  const docUrl = currentCA?.source_url || (matchingDoc?.status === 'PUBLISHED' ? matchingDoc.file_url : null) || null;
  const canOpenMatchingDoc = Boolean(
    matchingDoc && matchingDoc.status === 'PUBLISHED'
  );

  // If no structured administrative_accounts row is published for this entity
  if (!currentCA) {
    const docYear = matchingDoc?.year || 2024;
    const isDocPublished = Boolean(
      matchingDoc && matchingDoc.status === 'PUBLISHED'
    );
    const isDocRecordedPendingPublication = Boolean(
      matchingDoc &&
        !isDocPublished &&
        (matchingDoc.status === 'VERIFIED' ||
          matchingDoc.status === 'TO_VERIFY' ||
          matchingDoc.verification_status === 'VERIFIED' ||
          matchingDoc.verification_status === 'TO_VERIFY')
    );

    if (matchingDoc && (isDocPublished || isDocRecordedPendingPublication)) {
      return (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isDocPublished ? 'bg-blue-100 text-brand-blue' : 'bg-amber-100 text-amber-900'
              }`}>
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isDocPublished
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {isDocPublished
                      ? 'Document officiel publié — Exploitation financière en cours'
                      : matchingDoc.status === 'VERIFIED' || matchingDoc.verification_status === 'VERIFIED'
                      ? 'Document officiel vérifié — En attente de publication'
                      : 'Document enregistré — Vérification en cours'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Exercice {docYear}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {isDocPublished
                    ? `Compte administratif ${docYear} disponible à la consultation. Données financières en cours d'exploitation et de validation.`
                    : `Compte administratif ${docYear} enregistré — vérification documentaire et financière en cours avant publication.`}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  {isDocPublished ? (
                    <>
                      Le document officiel du Compte Administratif {docYear} de <strong>{institution.name}</strong> est archivé et disponible pour consultation directe. Conformément à notre protocole d'intégrité des finances publiques, <strong>les montants chiffrés structurés (6 rubriques citoyennes) ne sont affichés qu'après contrôle arithmétique complet et validation humaine explicite</strong>.
                    </>
                  ) : (
                    <>
                      Le fichier du Compte Administratif {docYear} de <strong>{institution.name}</strong> a été déposé dans l'espace d'administration et fait l'objet d'une vérification documentaire avant sa mise en ligne publique.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Document conservé</span>
                <strong className="text-slate-900 break-words">{matchingDoc.title || matchingDoc.file_name}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Statut du document PDF</span>
                <strong className="text-emerald-700 break-words">
                  {isDocPublished
                    ? 'Document publié et consultable'
                    : matchingDoc.status === 'VERIFIED' || matchingDoc.verification_status === 'VERIFIED'
                    ? 'Document vérifié (en attente de publication)'
                    : 'Document enregistré (à vérifier)'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Synthèse chiffrée (6 rubriques)</span>
                <strong className="text-amber-800 break-words">
                  Données financières en cours d'exploitation et de validation
                </strong>
              </div>
            </div>

            {sha256 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Empreinte cryptographique du fichier source conservé</span>
                    <span className="font-mono text-slate-700 text-xs truncate block" title={sha256}>
                      SHA-256 : {sha256.slice(0, 16)}...{sha256.slice(-12)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyHash(sha256)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto flex-shrink-0"
                >
                  {copiedSha256 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copiée !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copier le hash</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isDocPublished && (
                <button
                  type="button"
                  onClick={() => void openPublicDocument(matchingDoc)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Consulter le document</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExplainerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-brand-blue" />
                <span>Qu'est-ce qu'un compte administratif ?</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDocRequest(`Compte Administratif ${docYear} de ${institution.name}`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Demande CAIDP</span>
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
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-5">
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

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
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

  // Calculate sections shares
  const totalRealized = currentCA.total_realized || 0;
  const operatingShare = totalRealized > 0 && currentCA.operating_realized != null
    ? Math.round((currentCA.operating_realized / totalRealized) * 100)
    : null;
  const investmentShare = totalRealized > 0 && currentCA.investment_realized != null
    ? Math.round((currentCA.investment_realized / totalRealized) * 100)
    : null;

  // Priority 5.1: Accounting stage resolution (never default to ORDONNANCE when ENGAGE or unknown)
  const resolvedAccountingStage = currentCA.accounting_stage
    ? currentCA.accounting_stage
    : currentCA.reconciliation_status !== 'SOURCE_ANOMALY' && currentCA.total_expenditure_engaged != null && currentCA.total_expenditure_ordered == null && currentCA.total_expenditure_paid == null
    ? 'ENGAGE'
    : null;

  const accountingStageHeaderLabel =
    resolvedAccountingStage === 'ORDONNANCE'
      ? 'ORDONNANCE'
      : resolvedAccountingStage === 'ENGAGE'
      ? 'Dépenses engagées'
      : resolvedAccountingStage === 'PAYE'
      ? 'PAYE'
      : resolvedAccountingStage === 'LIQUIDE'
      ? 'LIQUIDE'
      : 'Stade comptable à confirmer sur pièce';

  const accountingStageDescription =
    resolvedAccountingStage === 'ORDONNANCE'
      ? "Mandats émis et liquidés par l'ordonnateur au titre de l'exercice clos."
      : resolvedAccountingStage === 'ENGAGE'
      ? "Dépenses engagées au titre de l'exercice clos (stade d'ordonnancement à confirmer sur pièce)."
      : "Dépenses exécutées au titre de l'exercice clos (stade comptable précis à confirmer sur pièce).";

  // Priority 5.3: Closing result and arithmetic difference resolution
  const totalRevenueResolved =
    currentCA.total_revenue_collected ??
    (currentCA.operating_revenue_realized != null || currentCA.investment_revenue_realized != null
      ? (currentCA.operating_revenue_realized || 0) + (currentCA.investment_revenue_realized || 0)
      : null);

  const arithmeticDiffResolved =
    currentCA.arithmetic_difference ??
    (totalRevenueResolved != null && currentCA.total_realized != null
      ? totalRevenueResolved - currentCA.total_realized
      : null);

  const isClosingResultUnconfirmed =
    currentCA.surplus_or_deficit == null ||
    currentCA.reconciliation_status === 'SOURCE_ANOMALY' ||
    amountPrecision(currentCA, 'surplus_or_deficit') === 'UNKNOWN' ||
    (currentCA.surplus_or_deficit === 0 && arithmeticDiffResolved != null && arithmeticDiffResolved !== 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ========================================================================= */}
      {/* EN-TÊTE DE LA FICHE FINANCIÈRE CITOYENNE                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Fiche Financière Citoyenne Contrôlée
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                Exercice Fiscal {currentCA.fiscal_year}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
              Compte Administratif de {institution.name}
            </h3>

            <p className="text-xs text-brand-blue font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Données arrêtées par la collectivité et contrôlées à partir du document source officiel.
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
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
              <span>Comprendre le compte administratif</span>
            </button>
          </div>
        </div>

        {/* Métadonnées Délibération & Tutelle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200/80">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Date Délibération Conseil</span>
            <strong className="text-slate-900 break-words">{currentCA.approval_date || 'Date non renseignée'}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Visa de Tutelle Préfecture</span>
            <strong className="text-slate-900 break-words">{currentCA.prefecture_visa_date || 'Date non renseignée'}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Document Source</span>
            <div className="flex items-center gap-1 truncate">
              <span className="text-slate-900 truncate" title={currentCA.source_document}>
                {currentCA.source_document}
              </span>
              {docUrl && isSafeUrl(docUrl) ? (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue hover:underline inline-flex items-center"
                  title="Consulter le document source"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ) : canOpenMatchingDoc && matchingDoc ? (
                <button
                  type="button"
                  onClick={() => void openPublicDocument(matchingDoc)}
                  className="text-brand-blue hover:underline inline-flex items-center cursor-pointer"
                  title="Consulter le document source"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RUBRIQUE 1 : LES MOYENS FINANCIERS                                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-blue-100 text-brand-blue font-black text-xs flex items-center justify-center">1</span>
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">
                Rubrique 1 : Les moyens financiers
              </h4>
              <p className="text-xs text-slate-500">
                Montants prévus par le conseil municipal ou régional et autorisations budgétaires.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            Autorisations Votées
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          {/* A. Budget Primitif Initial */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Budget Primitif (Voté Initial)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Initial
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">
              {currentCA.initial_budget_total != null
                ? formatReadableAmount(currentCA.initial_budget_total)
                : cycleConsolidation.initial_budget?.total.amount != null
                ? (cycleConsolidation.initial_budget.total.precision === 'EXACT'
                    ? formatReadableAmount(cycleConsolidation.initial_budget.total.amount)
                    : formatQualifiedFCFA(
                        cycleConsolidation.initial_budget.total.amount,
                        cycleConsolidation.initial_budget.total.precision
                      ))
                : <span className="text-slate-500 text-sm font-semibold italic">Non documenté au CA</span>}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {cycleConsolidation.initial_budget && cycleConsolidation.initial_budget.total.precision !== 'EXACT'
                ? `Estimation issue d'une source secondaire (${cycleConsolidation.initial_budget.document?.primary_source_label || cycleConsolidation.initial_budget.total.sources?.[0]?.document_name || 'presse institutionnelle'}) — document BP original à confirmer.`
                : "Crédits votés par le Conseil en début d'exercice fiscal."}
            </p>
          </div>

          {/* B. Modifications en cours d'année */}
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-blue">
                Ajustements en cours d'année
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-blue-200 text-brand-blue">
                {cycleConsolidation.amendments.length > 0 ? `${cycleConsolidation.amendments.length} acte(s)` : 'Modifications'}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-brand-blue">
              {cycleConsolidation.net_amendments.total !== null
                ? `${cycleConsolidation.net_amendments.total >= 0 ? '+' : '-'}${formatReadableAmount(Math.abs(cycleConsolidation.net_amendments.total))}`
                : (currentCA.initial_budget_total != null && currentCA.total_planned != null
                    ? `${(currentCA.total_planned - currentCA.initial_budget_total) >= 0 ? '+' : '-'}${formatReadableAmount(Math.abs(currentCA.total_planned - currentCA.initial_budget_total))}`
                    : 'Non documenté')}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Budgets modificatifs et virements de crédits votés par le Conseil.
            </p>
          </div>

          {/* C. Prévisions Définitives */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                Prévisions Définitives
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Autorisation Finale
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-950">
              {formatReadableRecordAmount(currentCA, 'total_planned')}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Plafond légal définitif des dépenses autorisées pour l'exercice clos.
            </p>
          </div>
        </div>

        {/* Note pédagogique d'évolution des prévisions */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
          <div>
            <strong>Comprendre l'évolution des prévisions :</strong> Le Budget Primitif (BP) est une prévision adoptée avant le début de l'année. En cours d'exercice, des ajustements légaux (budgets modificatifs, décisions modificatives, virements de crédits) peuvent être votés par le Conseil. Les <strong>prévisions définitives</strong> constituent le montant final arrêté au compte administratif.
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RUBRIQUE 2 : LES RECETTES ET LES DÉPENSES                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">2</span>
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">
                Rubrique 2 : Les recettes et les dépenses
              </h4>
              <p className="text-xs text-slate-500">
                Exécution financière attestée de l'exercice : recouvrement, dépenses et résultat de clôture.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            Stade comptable : {accountingStageHeaderLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          {/* Recettes Recouvrées */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
              Recettes Recouvrées
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-700">
              {totalRevenueResolved != null ? formatReadableAmount(totalRevenueResolved) : 'Non documenté au CA'}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Fonds effectivement encaissés (fiscalité locale, dotations de l'État, taxes de marché).
            </p>
          </div>

          {/* Dépenses Exécutées */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                Dépenses Exécutées
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue border border-blue-200">
                {accountingStageHeaderLabel}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">
              {formatReadableRecordAmount(currentCA, 'total_realized')}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {accountingStageDescription}
            </p>
          </div>

          {/* Taux d'Exécution Global */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                Taux d'Exécution Global
              </span>
              {totalRate && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${totalRate.badgeClass}`}>
                  {totalRate.formatted}
                </span>
              )}
            </div>
            <div className="text-lg sm:text-xl font-black text-brand-blue">
              {totalRate?.formatted || 'Non calculable'}
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  (totalRate?.rate || 0) > 100 ? 'bg-purple-600' :
                  (totalRate?.rate || 0) >= 90 ? 'bg-emerald-500' :
                  (totalRate?.rate || 0) >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                }`} 
                style={{ width: `${Math.min(100, totalRate?.rate || 0)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Mesuré par rapport aux prévisions définitives.
            </p>
          </div>
        </div>

        {/* Ligne Différence Arithmétique, Résultat de Clôture, Reports Antérieurs & Résultat Cumulé */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Différence arithmétique (Recettes − Dépenses)</span>
            <strong className="text-sm text-slate-800">
              {arithmeticDiffResolved != null
                ? `${arithmeticDiffResolved >= 0 ? '+' : '-'}${formatReadableAmount(Math.abs(arithmeticDiffResolved))}`
                : 'Non calculable'}
            </strong>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Résultat de l'exercice (clôture)</span>
            <strong className={`text-sm ${
              isClosingResultUnconfirmed ? 'text-amber-800' :
              (currentCA.surplus_or_deficit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {isClosingResultUnconfirmed
                ? 'Résultat de clôture à confirmer'
                : `${(currentCA.surplus_or_deficit ?? 0) >= 0 ? 'Excédent : +' : 'Déficit : -'}${formatReadableAmount(Math.abs(currentCA.surplus_or_deficit ?? 0))}`}
            </strong>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Reports antérieurs (Report à nouveau)</span>
            <strong className="text-sm text-slate-800">
              {currentCA.previous_result_reported != null
                ? `${currentCA.previous_result_reported >= 0 ? '+' : '-'}${formatReadableAmount(Math.abs(currentCA.previous_result_reported))}`
                : 'Non documenté au CA'}
            </strong>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Résultat cumulé final</span>
            <strong className="text-sm text-slate-900">
              {currentCA.reconciliation_status === 'SOURCE_ANOMALY'
                ? 'Résultat de clôture à confirmer'
                : currentCA.cumulative_result != null
                ? `${currentCA.cumulative_result >= 0 ? '+' : '-'}${formatReadableAmount(Math.abs(currentCA.cumulative_result))}`
                : (!isClosingResultUnconfirmed && currentCA.surplus_or_deficit != null && currentCA.previous_result_reported != null
                    ? `${(currentCA.surplus_or_deficit + currentCA.previous_result_reported) >= 0 ? '+' : '-'}${formatReadableAmount(Math.abs(currentCA.surplus_or_deficit + currentCA.previous_result_reported))}`
                    : 'Non documenté au CA')}
            </strong>
          </div>
        </div>

        {(currentCA.reconciliation_status === 'SOURCE_ANOMALY' || currentCA.reconciliation_notes) && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-black text-amber-900 block">
                Observation documentaire et arithmétique sur la pièce source
              </strong>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                {currentCA.reconciliation_notes || "Le document source présente un écart arithmétique entre la différence Recettes − Dépenses et le solde de clôture déclaré. Aucun excédent ou déficit nul n'est présenté comme confirmé sans pièce rectificative."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RUBRIQUE 3 : FONCTIONNEMENT ET INVESTISSEMENT                              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">3</span>
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">
                Rubrique 3 : Fonctionnement et investissement
              </h4>
              <p className="text-xs text-slate-500">
                Montants prévus, montants réalisés et part respective de chaque section dans le budget.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            2 Sections Budgétaires
          </span>
        </div>

        {/* Encart pédagogique de distinction Fonctionnement vs Investissement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div className="space-y-1">
            <span className="font-black text-brand-blue uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-blue inline-block"></span>
              Fonctionnement
            </span>
            <p className="text-slate-600 leading-relaxed">
              Salaires des agents municipaux, fournitures de bureau, carburant, factures d'eau et d'électricité, entretien courant des locaux, charges quotidiennes nécessaires au service public.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-black text-emerald-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              Investissement
            </span>
            <p className="text-slate-600 leading-relaxed">
              Équipements durables, travaux de voirie et de bitumage, construction d'écoles, réhabilitation de centres de santé, ponts, réseaux d'eau et d'assainissement, infrastructures pérennes.
            </p>
          </div>
        </div>

        {/* Les 2 volets financiers détaillés */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          
          {/* Volet Fonctionnement */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-blue-100 text-brand-blue border border-blue-200">
                  Section Fonctionnement
                </span>
                {operatingRate && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${operatingRate.badgeClass}`}>
                    Taux : {operatingRate.formatted}
                  </span>
                )}
              </div>

              <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-medium">Ce qui était prévu :</span>
                  <strong className="text-slate-900">{formatReadableRecordAmount(currentCA, 'operating_planned')}</strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-medium">Ce qui a été réalisé :</span>
                  <strong className="text-slate-900 text-sm font-black">{formatReadableRecordAmount(currentCA, 'operating_realized')}</strong>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500 font-medium">Part dans le total exécuté :</span>
                  <strong className="text-brand-blue">{operatingShare != null ? `${operatingShare} %` : 'N/A'}</strong>
                </div>
              </div>

              {/* Jauge Fonctionnement */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
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
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600">
                Recettes de fonctionnement recouvrées : <strong className="text-slate-900">{formatReadableRecordAmount(currentCA, 'operating_revenue_realized')}</strong>
              </div>
            )}
          </div>

          {/* Volet Investissement */}
          <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Section Investissement
                </span>
                {investmentRate && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${investmentRate.badgeClass}`}>
                    Taux : {investmentRate.formatted}
                  </span>
                )}
              </div>

              <div className="space-y-2 bg-white p-3.5 rounded-xl border border-emerald-200 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-medium">Ce qui était prévu :</span>
                  <strong className="text-slate-900">{formatReadableRecordAmount(currentCA, 'investment_planned')}</strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-medium">Ce qui a été réalisé :</span>
                  <strong className="text-slate-900 text-sm font-black">{formatReadableRecordAmount(currentCA, 'investment_realized')}</strong>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500 font-medium">Part dans le total exécuté :</span>
                  <strong className="text-emerald-700">{investmentShare != null ? `${investmentShare} %` : 'N/A'}</strong>
                </div>
              </div>

              {/* Jauge Investissement */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      (investmentRate?.rate || 0) >= 80 ? 'bg-emerald-600' :
                      (investmentRate?.rate || 0) >= 60 ? 'bg-blue-600' : 'bg-amber-500'
                    }`} 
                    style={{ width: `${Math.min(100, investmentRate?.rate || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                  <span>{currentCA.operations.length} chantiers individualisés</span>
                </div>
              </div>
            </div>

            {currentCA.investment_revenue_realized != null && (
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                Recettes d'investissement recouvrées : <strong className="text-emerald-950">{formatReadableRecordAmount(currentCA, 'investment_revenue_realized')}</strong>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* RUBRIQUE 4 : OPÉRATIONS ET INVESTISSEMENTS IDENTIFIÉS                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">4</span>
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">
                Rubrique 4 : Opérations et investissements identifiés
              </h4>
              <p className="text-xs text-slate-500">
                Chantiers individualisés dans le compte administratif ({currentCA.operations.length} répertoriés).
              </p>
            </div>
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

        {/* Filtres Opérations */}
        <div className="flex flex-col lg:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une opération (santé, école, marché, entreprise...)"
              value={opSearch}
              onChange={(e) => setOpSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-1.5 w-full lg:w-auto">
            {uniqueSectors.length > 0 && (
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="min-w-0 max-w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue"
              >
                <option value="ALL">Tous les secteurs</option>
                {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <select
              value={selectedMatchLevel}
              onChange={(e) => setSelectedMatchLevel(e.target.value as any)}
              className="min-w-0 max-w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue"
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        op.citizen_status === 'COMPLETED' || (op.citizen_status as string) === 'Réalisé'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : op.citizen_status
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {getOperationPhysicalStatusLabel(op.citizen_status)}
                      </span>
                      {op.location && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          📍 {op.location}
                        </span>
                      )}
                      {op.source_page && (
                        <span className="text-[10px] text-brand-blue font-bold bg-blue-50/70 border border-blue-200/60 px-2 py-0.5 rounded-md">
                          Page {op.source_page} du CA
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
                    <strong className="text-slate-900 block">{formatReadableRecordAmount(op, 'planned_amount')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Ce qui a été réalisé</span>
                    <strong className="text-slate-900 block">{formatReadableRecordAmount(op, 'executed_amount')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Écart</span>
                    <span className="font-bold text-slate-700 block">
                      {op.planned_amount != null && op.executed_amount != null
                        ? `${(op.executed_amount - op.planned_amount) >= 0 ? '+' : '-'}${formatReadableAmount(Math.abs(op.planned_amount - op.executed_amount))}`
                        : 'Non calculable'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Taux d'exécution</span>
                    <span className="font-black text-brand-blue block">{opRate.formatted}</span>
                  </div>
                </div>

                {/* Rapprochement Marchés Publics DGMP */}
                <div className="p-3 rounded-xl border text-xs space-y-2 bg-slate-50/70 border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Marchés publics rapprochés (DGMP) :
                      </span>
                      {match?.match_level === 'STRONG' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Marché DGMP Retrouvé
                        </span>
                      )}
                      {match?.match_level === 'PARTIAL' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          Rapprochement Partiel
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

                  {match && match.match_level !== 'NONE' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-400 block font-medium">Contrat / Titulaire :</span>
                        <strong className="text-slate-900 break-words">{match.contractor || 'Non spécifié'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Montant attribué :</span>
                        <strong className="text-slate-900 break-words">{formatReadableRecordAmount(match, 'award_amount')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Date d'attribution :</span>
                        <strong className="text-slate-900 break-words">{match.award_date || 'Exercice clos'}</strong>
                        {match.source_url && isSafeUrl(match.source_url) && (
                          <a
                            href={match.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-blue hover:underline inline-flex items-center gap-1 mt-0.5 block font-bold"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span>Source marché public (DGMP)</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {(!match || match.match_level === 'NONE') && (
                    <p className="text-[11px] text-slate-500 italic">
                      Les travaux exécutés en régie directe municipale ou les commandes sous les seuils d'appel d'offres obligatoires ne figurent pas systématiquement sur le portail centralisé de la DGMP.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {currentCA.operations.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Info className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-800 font-black uppercase tracking-wider">Non documenté</p>
              <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
                Les opérations d'investissement détaillées ne sont pas encore rattachées à cette synthèse ou ne sont pas individualisées à ce stade. Seuls les totaux d'investissement contrôlés sur le document officiel (Rubrique 3) sont publiés.
              </p>
            </div>
          ) : (
            filteredOperations.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <Info className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 font-bold">Aucune opération ne correspond à vos filtres.</p>
                <button
                  onClick={() => {
                    setOpSearch('');
                    setSelectedSector('ALL');
                    setSelectedMatchLevel('ALL');
                  }}
                  className="text-xs text-brand-blue hover:underline font-bold cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RUBRIQUE 5 : SUIVI CITOYEN SUR LE TERRAIN                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-orange-100 text-brand-orange font-black text-xs flex items-center justify-center">5</span>
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">
                Rubrique 5 : Suivi citoyen sur le terrain
              </h4>
              <p className="text-xs text-slate-500">
                Constat physique indépendant et participation citoyenne sur les réalisations effectives.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-brand-orange border border-orange-200">
            Preuves de Terrain
          </span>
        </div>

        {/* Bannière du Principe Non Négociable : Réalisé financier != Réalisation physique */}
        <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-black text-amber-900 text-sm block">
              Principe républicain : Réalisé financier ≠ Réalisation physique
            </span>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              Une dépense ordonnancée ou un marché public attribué documente un engagement financier régulier, <strong>mais ne prouve jamais à elle seule la livraison physique effective des travaux sur le terrain</strong>. De même, 0 FCFA ordonnancé sur un exercice ne signifie pas l'abandon d'un chantier (report budgétaire légal).
            </p>
          </div>
        </div>

        {/* Synthèse des Observations Citoyennes & Bouton d'Action */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-blue" />
              <strong className="text-slate-900 text-xs">
                {currentCA.operations.reduce((sum, op) => sum + (op.citizen_proofs_count || 0), 0)} observation(s) citoyenne(s) enregistrée(s)
              </strong>
            </div>
            <p className="text-slate-600 text-[11px]">
              Contribuez à documenter l'état réel des écoles, voiries, dispensaires et centres de santé de {institution.name}.
            </p>
          </div>

          <button
            onClick={() => {
              setFieldContributionMsg(`Merci pour votre engagement civique ! Vous pouvez transmettre vos photos géolocalisées, vidéos et observations de terrain à l'équipe SuiviBudget CI via contact@suivibudget.ci.`);
              setTimeout(() => setFieldContributionMsg(null), 7000);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex-shrink-0"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>Transmettre une observation ou une photo</span>
          </button>
        </div>

        {/* Message éphémère de contribution citoyenne */}
        {fieldContributionMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <span>{fieldContributionMsg}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DROIT DE RÉPONSE INSTITUTIONNEL (SI PRÉSENT)                               */}
      {/* ========================================================================= */}
      {currentCA.institution_response && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border-l-4 border-l-brand-blue border-y border-r border-slate-200 shadow-2xs space-y-2.5">
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
      {/* RUBRIQUE 6 : SOURCES ET VÉRIFICATION (CAIDP & INTÉGRITÉ)                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">6</span>
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">
                Rubrique 6 : Sources et vérification
              </h4>
              <p className="text-xs text-slate-500">
                Traçabilité documentaire, intégrité cryptographique et droit d'accès à l'information publique.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Loi CAIDP n° 2013-867
          </span>
        </div>

        {/* Détails du document et de son contrôle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Document conservé</span>
            <strong className="text-slate-900 block text-sm">{currentCA.source_document}</strong>
            <p className="text-slate-500 text-[11px]">
              Structure émettrice : {institution.name} ({institution.type === 'MAIRIE' ? 'Commune' : 'Conseil Régional'}).
            </p>
            <div className="text-[11px] text-slate-600 pt-1">
              Statut du contrôle :{' '}
              <strong className={currentCA.reconciliation_status === 'SOURCE_ANOMALY' ? 'text-amber-800' : 'text-emerald-700'}>
                {currentCA.reconciliation_status === 'SOURCE_ANOMALY'
                  ? 'Document officiel avec réserve documentaire (écart arithmétique source signalé)'
                  : 'Données transcrites et contrôlées à partir du document source'}
              </strong>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Pages exploitées du document</span>
            <strong className="text-slate-900 block text-sm">
              {currentCA.source_page ? `Page ${currentCA.source_page}` : 'Pagination non renseignée'}
            </strong>
            <p className="text-slate-500 text-[11px]">
              Date de délibération : {currentCA.approval_date || 'Non spécifiée'} — Visa préfectoral : {currentCA.prefecture_visa_date || 'Non spécifié'}.
            </p>
          </div>
        </div>

        {/* Empreinte SHA-256 */}
        {sha256 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Empreinte cryptographique du fichier source conservé</span>
                <span className="font-mono text-slate-700 text-xs truncate block" title={sha256}>
                  SHA-256 : {sha256.slice(0, 16)}...{sha256.slice(-12)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyHash(sha256)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto flex-shrink-0"
              title="Copier l'empreinte SHA-256 complète pour vérification"
            >
              {copiedSha256 ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copiée !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copier le hash</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Mention légale CAIDP & Actions */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1 max-w-xl">
            <span className="text-amber-300 text-[10px] font-black uppercase tracking-wider block">
              Droit d'accès légal aux documents publics (Loi n° 2013-867)
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              En application de la loi n° 2013-867 du 23 décembre 2013 relative à l'accès à l'information d'intérêt public (CAIDP), tout citoyen peut demander communication des délibérations, budgets primitifs et comptes administratifs certifiés des collectivités ivoiriennes.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {docUrl && isSafeUrl(docUrl) ? (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Consulter le document</span>
              </a>
            ) : canOpenMatchingDoc && matchingDoc ? (
              <button
                type="button"
                onClick={() => void openPublicDocument(matchingDoc)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Consulter le document</span>
              </button>
            ) : null}

            <button
              onClick={() => onOpenDocRequest(`Compte Administratif ${currentCA.fiscal_year} de ${institution.name}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Demande CAIDP</span>
            </button>
          </div>
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
