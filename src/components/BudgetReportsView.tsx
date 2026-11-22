import React, { useState, useMemo } from 'react';
import { BudgetProject } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatAmountInWords, formatDateFR } from '../utils/formatters';
import {
  FileText,
  Printer,
  TrendingUp,
  Building,
  ShieldCheck,
  CheckCircle2,
  PieChart,
  Layers,
  MapPin,
  AlertCircle,
  BarChart3,
  Calendar,
  Share2
} from 'lucide-react';

export type ReportType = 'GLOBAL' | 'INFRASTRUCTURE' | 'SANTE' | 'EDUCATION' | 'EAU_POTABLE' | 'LOCAL';

export interface BudgetReportEntitySummary {
  name: string;
  count: number;
  documentedCount: number;
  unknownCount: number;
  zeroCount: number;
  amount: number | null;
  documentedAmount: number | null;
  consolidatedAmount: number | null;
  isPartial: boolean;
  percentageOfDocumented: number | null;
  isPercentagePartial: boolean;
}

export interface BudgetReportCategorySummary {
  category: string;
  count: number;
  documentedCount: number;
  unknownCount: number;
  zeroCount: number;
  amount: number | null;
  documentedAmount: number | null;
  consolidatedAmount: number | null;
  isPartial: boolean;
  percentage: number | null;
  percentageOfDocumented: number | null;
  isPercentagePartial: boolean;
}

export interface BudgetReportStats {
  totalProjects: number;
  documentedProjectsCount: number;
  unknownAmountProjectsCount: number;
  zeroAmountProjectsCount: number;
  documentedTotalAmount: number | null;
  consolidatedTotalAmount: number | null;
  /** @deprecated Utiliser documentedTotalAmount ou consolidatedTotalAmount selon le besoin */
  totalAmount: number | null;
  isCompleteCoverage: boolean;
  isPartialSum: boolean;
  isPercentagePartial: boolean;
  nationalCount: number;
  nationalDocumentedCount: number;
  nationalUnknownCount: number;
  nationalZeroCount: number;
  nationalAmount: number | null;
  nationalConsolidatedAmount: number | null;
  nationalPercentage: number | null;
  localCount: number;
  localDocumentedCount: number;
  localUnknownCount: number;
  localZeroCount: number;
  localAmount: number | null;
  localConsolidatedAmount: number | null;
  localPercentage: number | null;
  topEntities: BudgetReportEntitySummary[];
  categoryBreakdown: BudgetReportCategorySummary[];
  totalProofs: number;
}

function isDocumentedBudgetAmount(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Calcule les agrégats financiers d'un rapport budgétaire sans jamais transformer `null` en `0`.
 * Distingue strictement :
 * 1. Nombre total de projets recensés (`totalProjects`)
 * 2. Nombre de projets avec montant renseigné (`documentedProjectsCount`)
 * 3. Nombre de projets sans montant connu (`unknownAmountProjectsCount`)
 * 4. Nombre de projets avec montant nul documenté (`zeroAmountProjectsCount`)
 * 5. Somme des montants renseignés (`documentedTotalAmount`)
 * 6. Total consolidé (`consolidatedTotalAmount`), non-null uniquement si tous les projets recensés ont un montant renseigné.
 */
export function computeBudgetReportStats(
  allProjects: BudgetProject[],
  selectedReport: ReportType = 'GLOBAL',
  totalProofs = 0
): BudgetReportStats {
  let filteredProjects = allProjects;
  if (selectedReport === 'INFRASTRUCTURE') {
    filteredProjects = allProjects.filter(p => p.category === 'INFRASTRUCTURE');
  } else if (selectedReport === 'SANTE') {
    filteredProjects = allProjects.filter(p => p.category === 'SANTE');
  } else if (selectedReport === 'EDUCATION') {
    filteredProjects = allProjects.filter(p => p.category === 'EDUCATION');
  } else if (selectedReport === 'EAU_POTABLE') {
    filteredProjects = allProjects.filter(p => p.category === 'EAU_POTABLE');
  } else if (selectedReport === 'LOCAL') {
    filteredProjects = allProjects.filter(p => p.scope_level === 'LOCAL');
  }

  const totalProjects = filteredProjects.length;
  const documentedProjects = filteredProjects.filter(p => isDocumentedBudgetAmount(p.budget_amount_fcfa));
  const documentedProjectsCount = documentedProjects.length;
  const unknownAmountProjectsCount = totalProjects - documentedProjectsCount;
  const zeroAmountProjectsCount = documentedProjects.filter(p => p.budget_amount_fcfa === 0).length;

  const documentedTotalAmount =
    documentedProjectsCount > 0
      ? documentedProjects.reduce((sum, p) => sum + p.budget_amount_fcfa!, 0)
      : null;

  const isCompleteCoverage = totalProjects > 0 && unknownAmountProjectsCount === 0;
  const isPartialSum = unknownAmountProjectsCount > 0 && documentedProjectsCount > 0;
  const isPercentagePartial = unknownAmountProjectsCount > 0;
  const consolidatedTotalAmount = isCompleteCoverage ? documentedTotalAmount : null;

  const nationalProjects = filteredProjects.filter(p => p.scope_level === 'NATIONAL');
  const nationalCount = nationalProjects.length;
  const nationalDocumented = nationalProjects.filter(p => isDocumentedBudgetAmount(p.budget_amount_fcfa));
  const nationalDocumentedCount = nationalDocumented.length;
  const nationalUnknownCount = nationalCount - nationalDocumentedCount;
  const nationalZeroCount = nationalDocumented.filter(p => p.budget_amount_fcfa === 0).length;
  const nationalAmount =
    nationalDocumentedCount > 0
      ? nationalDocumented.reduce((sum, p) => sum + p.budget_amount_fcfa!, 0)
      : null;
  const nationalConsolidatedAmount =
    nationalCount > 0 && nationalUnknownCount === 0 ? nationalAmount : null;

  const localProjects = filteredProjects.filter(p => p.scope_level === 'LOCAL');
  const localCount = localProjects.length;
  const localDocumented = localProjects.filter(p => isDocumentedBudgetAmount(p.budget_amount_fcfa));
  const localDocumentedCount = localDocumented.length;
  const localUnknownCount = localCount - localDocumentedCount;
  const localZeroCount = localDocumented.filter(p => p.budget_amount_fcfa === 0).length;
  const localAmount =
    localDocumentedCount > 0
      ? localDocumented.reduce((sum, p) => sum + p.budget_amount_fcfa!, 0)
      : null;
  const localConsolidatedAmount =
    localCount > 0 && localUnknownCount === 0 ? localAmount : null;

  const nationalPercentage =
    documentedTotalAmount != null && documentedTotalAmount > 0 && nationalAmount != null
      ? (nationalAmount / documentedTotalAmount) * 100
      : null;
  const localPercentage =
    documentedTotalAmount != null && documentedTotalAmount > 0 && localAmount != null
      ? (localAmount / documentedTotalAmount) * 100
      : null;

  // Top entities in this report
  const entityMap = new Map<
    string,
    {
      name: string;
      count: number;
      documentedCount: number;
      unknownCount: number;
      zeroCount: number;
      sumDocumented: number;
    }
  >();

  filteredProjects.forEach(p => {
    const name = p.ministry_name || p.institution_name || p.commune_name || p.region_name || 'Collectivité';
    const existing = entityMap.get(name) || {
      name,
      count: 0,
      documentedCount: 0,
      unknownCount: 0,
      zeroCount: 0,
      sumDocumented: 0,
    };
    existing.count += 1;
    if (isDocumentedBudgetAmount(p.budget_amount_fcfa)) {
      existing.documentedCount += 1;
      existing.sumDocumented += p.budget_amount_fcfa;
      if (p.budget_amount_fcfa === 0) {
        existing.zeroCount += 1;
      }
    } else {
      existing.unknownCount += 1;
    }
    entityMap.set(name, existing);
  });

  const topEntities: BudgetReportEntitySummary[] = Array.from(entityMap.values())
    .map(ent => {
      const documentedAmount = ent.documentedCount > 0 ? ent.sumDocumented : null;
      const consolidatedAmount = ent.count > 0 && ent.unknownCount === 0 ? documentedAmount : null;
      const isPartial = ent.unknownCount > 0;
      const percentageOfDocumented =
        documentedTotalAmount != null && documentedTotalAmount > 0 && documentedAmount != null
          ? (documentedAmount / documentedTotalAmount) * 100
          : null;
      return {
        name: ent.name,
        count: ent.count,
        documentedCount: ent.documentedCount,
        unknownCount: ent.unknownCount,
        zeroCount: ent.zeroCount,
        amount: documentedAmount,
        documentedAmount,
        consolidatedAmount,
        isPartial,
        percentageOfDocumented,
        isPercentagePartial: isPercentagePartial || isPartial,
      };
    })
    .sort((a, b) => (b.documentedAmount ?? -1) - (a.documentedAmount ?? -1) || b.count - a.count)
    .slice(0, 8);

  // Categories breakdown
  const catMap = new Map<
    string,
    {
      category: string;
      count: number;
      documentedCount: number;
      unknownCount: number;
      zeroCount: number;
      sumDocumented: number;
    }
  >();

  filteredProjects.forEach(p => {
    const cat = p.category || 'Autres';
    const existing = catMap.get(cat) || {
      category: cat,
      count: 0,
      documentedCount: 0,
      unknownCount: 0,
      zeroCount: 0,
      sumDocumented: 0,
    };
    existing.count += 1;
    if (isDocumentedBudgetAmount(p.budget_amount_fcfa)) {
      existing.documentedCount += 1;
      existing.sumDocumented += p.budget_amount_fcfa;
      if (p.budget_amount_fcfa === 0) {
        existing.zeroCount += 1;
      }
    } else {
      existing.unknownCount += 1;
    }
    catMap.set(cat, existing);
  });

  const categoryBreakdown: BudgetReportCategorySummary[] = Array.from(catMap.values())
    .map(cat => {
      const documentedAmount = cat.documentedCount > 0 ? cat.sumDocumented : null;
      const consolidatedAmount = cat.count > 0 && cat.unknownCount === 0 ? documentedAmount : null;
      const isPartial = cat.unknownCount > 0;
      const percentageOfDocumented =
        documentedTotalAmount != null && documentedTotalAmount > 0 && documentedAmount != null
          ? (documentedAmount / documentedTotalAmount) * 100
          : null;
      return {
        category: cat.category,
        count: cat.count,
        documentedCount: cat.documentedCount,
        unknownCount: cat.unknownCount,
        zeroCount: cat.zeroCount,
        amount: documentedAmount,
        documentedAmount,
        consolidatedAmount,
        isPartial,
        percentage: percentageOfDocumented,
        percentageOfDocumented,
        isPercentagePartial: isPercentagePartial || isPartial,
      };
    })
    .sort((a, b) => (b.documentedAmount ?? -1) - (a.documentedAmount ?? -1) || b.count - a.count);

  return {
    totalProjects,
    documentedProjectsCount,
    unknownAmountProjectsCount,
    zeroAmountProjectsCount,
    documentedTotalAmount,
    consolidatedTotalAmount,
    totalAmount: documentedTotalAmount,
    isCompleteCoverage,
    isPartialSum,
    isPercentagePartial,
    nationalCount,
    nationalDocumentedCount,
    nationalUnknownCount,
    nationalZeroCount,
    nationalAmount,
    nationalConsolidatedAmount,
    nationalPercentage,
    localCount,
    localDocumentedCount,
    localUnknownCount,
    localZeroCount,
    localAmount,
    localConsolidatedAmount,
    localPercentage,
    topEntities,
    categoryBreakdown,
    totalProofs,
  };
}

export const BudgetReportsView: React.FC<{ projectsOverride?: BudgetProject[] }> = ({ projectsOverride }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('GLOBAL');
  const allProjects = projectsOverride ?? dataStore.getProjects();
  const approvedProofs = dataStore.getApprovedProofs();

  const stats = useMemo(
    () => computeBudgetReportStats(allProjects, selectedReport, approvedProofs.length),
    [allProjects, approvedProofs.length, selectedReport]
  );

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    switch (selectedReport) {
      case 'INFRASTRUCTURE': return 'Rapport Thématique : Infrastructures, Routes & Transports 2026';
      case 'SANTE': return 'Rapport Thématique : Santé Publique & Équipements Médicaux 2026';
      case 'EDUCATION': return 'Rapport Thématique : Éducation Nationale & Universités 2026';
      case 'EAU_POTABLE': return 'Rapport Thématique : Hydraulique, Eau Potable & Assainissement 2026';
      case 'LOCAL': return 'Rapport de Décentralisation : Investissements des 201 Communes, 31 Conseils Régionaux & 2 Districts Autonomes 2026';
      default: return 'Bilan Annuel Global de l\'Observatoire Budgétaire & Citoyen 2026';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Header & Controls (Hidden in Print Mode) */}
      <div className="print:hidden bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-brand-blue text-xs font-black uppercase tracking-wider mb-2 border border-blue-200">
              <FileText className="w-3.5 h-3.5" />
              <span>Générateur Officiel de Rapports d'Étape</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Rapports Budgétaires & Bilans Citoyens 2026
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Consultez, imprimez et partagez les bilans consolidés des investissements publics votés dans la Loi de Finances 2026 et suivis par les citoyens.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="py-3 px-5 bg-brand-blue hover:bg-navy-900 active:scale-95 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / Télécharger PDF</span>
            </button>
          </div>
        </div>

        {/* Report Category Switcher */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
            Sélectionnez le Type de Rapport à Générer :
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: 'GLOBAL', label: 'Bilan Global 2026' },
              { id: 'LOCAL', label: 'Mairies & Régions' },
              { id: 'INFRASTRUCTURE', label: 'Infrastructures' },
              { id: 'SANTE', label: 'Santé Publique' },
              { id: 'EDUCATION', label: 'Éducation' },
              { id: 'EAU_POTABLE', label: 'Eau Potable' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedReport(tab.id as ReportType)}
                className={`p-3 rounded-2xl text-xs font-black border transition-all text-center flex items-center justify-center ${
                  selectedReport === tab.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL REPORT DOCUMENT (PRINTABLE A4 FRIENDLY) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200 shadow-lg space-y-10 print:border-none print:shadow-none print:p-0">

        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              RÉPUBLIQUE DE CÔTE D'IVOIRE — OBSERVATOIRE CITOYEN DES PROJETS PUBLICS
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {getReportTitle()}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Exercice Budgétaire : 2026</span>
              </span>
              <span>Source : Loi de Finances 2026 (DGBF) & Suivi Terrain Citoyen</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-right flex-shrink-0">
            <div className="text-[10px] font-black text-slate-400 uppercase">Édition du Rapport</div>
            <div className="text-xs font-black text-slate-800">{formatDateFR(new Date().toISOString())}</div>
            <div className="text-[10px] font-bold text-slate-600">Classification automatisée — à vérifier sur pièce</div>
          </div>
        </div>

        {/* 1. SYNTHÈSE EXÉCUTIVE DES CHIFFRES CLÉS */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>1. Synthèse Exécutive & Volumes Budgétaires</span>
          </h3>

          {stats.unknownAmountProjectsCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-black">Somme partielle — Total consolidé non disponible :</span>{' '}
                <span>
                  {stats.unknownAmountProjectsCount.toLocaleString('fr-FR')} opération(s) sur{' '}
                  {stats.totalProjects.toLocaleString('fr-FR')} ne disposent pas d'un montant renseigné (`null`). Conformément à la charte d'intégrité, aucune valeur inconnue n'est remplacée par 0 FCFA et la somme ci-dessous porte uniquement sur les {stats.documentedProjectsCount.toLocaleString('fr-FR')} opération(s) documentée(s).
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">
                {stats.consolidatedTotalAmount !== null
                  ? 'Total Consolidé (100% renseigné)'
                  : stats.documentedTotalAmount !== null
                    ? 'Somme des Montants Renseignés (Partielle)'
                    : 'Montant Budgétaire'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                {stats.documentedTotalAmount !== null
                  ? formatFCFA(stats.documentedTotalAmount)
                  : 'Montant inconnu (non documenté)'}
              </span>
              <span className="text-[11px] font-bold text-brand-blue block">
                {stats.documentedTotalAmount !== null
                  ? `(${formatAmountInWords(stats.documentedTotalAmount)})`
                  : 'Aucun montant renseigné sur ce périmètre'}
              </span>
              <span className="text-[10px] font-bold text-slate-600 mt-1 block">
                {stats.consolidatedTotalAmount !== null
                  ? 'Total consolidé justifié (0 montant inconnu)'
                  : `Total consolidé : Non consolidé (${stats.unknownAmountProjectsCount} inconnu(s))`}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">Projets Recensés & Couverture</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                {stats.totalProjects.toLocaleString('fr-FR')} recensés
              </span>
              <span className="text-[11px] text-slate-600 block font-semibold">
                {stats.documentedProjectsCount.toLocaleString('fr-FR')} avec montant renseigné,{' '}
                {stats.unknownAmountProjectsCount.toLocaleString('fr-FR')} sans montant connu
                {stats.zeroAmountProjectsCount > 0 ? `, ${stats.zeroAmountProjectsCount} à 0 FCFA documenté` : ''}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {stats.nationalCount} Nationaux, {stats.localCount} Locaux
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">Couverture Territoriale</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                232 Collectivités
              </span>
              <span className="text-[11px] text-slate-500">
                201 Communes & 31 Conseils Régionaux (+ 2 Districts)
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">Contrôle & Preuves Citoyennes</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
                {stats.totalProofs} Constats
              </span>
              <span className="text-[11px] text-emerald-800 font-bold">
                Transmis par les citoyens
              </span>
            </div>
          </div>
        </div>

        {/* 2. VENTILATION PAR NIVEAU D'INTERVENTION */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            <span>2. Double Échelle d'Investissement Public</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-brand-blue uppercase flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Grands Projets & Opérations de l'État</span>
                </span>
                <span className="text-xs font-black text-slate-800 text-right">
                  {stats.nationalPercentage !== null
                    ? `${stats.nationalPercentage.toFixed(1)} %${stats.isPercentagePartial ? ' (des montants renseignés)' : ''}`
                    : 'Part non calculable'}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {stats.nationalAmount !== null ? (
                  <>
                    {formatFCFA(stats.nationalAmount)}{' '}
                    <span className="block text-xs font-semibold text-slate-500 break-words">
                      ({formatAmountInWords(stats.nationalAmount)})
                      {stats.nationalUnknownCount > 0
                        ? ` — Somme partielle (${stats.nationalDocumentedCount}/${stats.nationalCount} renseignés, ${stats.nationalUnknownCount} inconnu(s))`
                        : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-base font-bold text-slate-500">Montant non documenté ({stats.nationalUnknownCount} inconnu(s))</span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pilotés par les Ministères sectoriels pour les grandes liaisons routières, hôpitaux régionaux, universités et centrales électriques.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-emerald-800 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Investissements Locaux & Communaux</span>
                </span>
                <span className="text-xs font-black text-slate-800 text-right">
                  {stats.localPercentage !== null
                    ? `${stats.localPercentage.toFixed(1)} %${stats.isPercentagePartial ? ' (des montants renseignés)' : ''}`
                    : 'Part non calculable'}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {stats.localAmount !== null ? (
                  <>
                    {formatFCFA(stats.localAmount)}{' '}
                    <span className="block text-xs font-semibold text-slate-500 break-words">
                      ({formatAmountInWords(stats.localAmount)})
                      {stats.localUnknownCount > 0
                        ? ` — Somme partielle (${stats.localDocumentedCount}/${stats.localCount} renseignés, ${stats.localUnknownCount} inconnu(s))`
                        : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-base font-bold text-slate-500">Montant non documenté ({stats.localUnknownCount} inconnu(s))</span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gérés directement par les Mairies et Conseils Régionaux pour les écoles primaires, centres de santé de proximité et hydraulique villageoise.
              </p>
            </div>
          </div>

          {/* Graphique de répartition par catégorie (respectant les montants inconnus et nuls) */}
          {stats.categoryBreakdown.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-brand-blue" />
                  <span>Répartition Sectorielle des Montants Renseignés (FCFA — Exercice 2026)</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {stats.isPercentagePartial
                    ? `Dénominateur partiel : ${stats.documentedProjectsCount}/${stats.totalProjects} opération(s) renseignée(s)`
                    : `Base exhaustive : ${stats.totalProjects} opération(s) renseignée(s)`}
                </span>
              </div>
              <div className="space-y-2.5">
                {stats.categoryBreakdown.map(cat => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-800">
                        {cat.category}{' '}
                        <span className="text-slate-500 font-medium">
                          ({cat.documentedCount}/{cat.count} renseigné(s)
                          {cat.unknownCount > 0 ? `, ${cat.unknownCount} inconnu(s)` : ''}
                          {cat.zeroCount > 0 ? `, ${cat.zeroCount} à 0 FCFA documenté` : ''})
                        </span>
                      </span>
                      <span className="font-black text-slate-900">
                        {cat.documentedAmount !== null
                          ? `${formatFCFA(cat.documentedAmount)}${cat.isPartial ? ' (somme partielle)' : ''}`
                          : 'Montant inconnu'}
                        {cat.percentageOfDocumented !== null
                          ? ` (${cat.percentageOfDocumented.toFixed(1)} %${cat.isPercentagePartial ? ' des renseignés' : ''})`
                          : ''}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-blue rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, cat.percentageOfDocumented ?? 0))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. TOP DES MAÎTRES D'OUVRAGE & ENTITÉS LES PLUS DOTÉES */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
            <span>3. Principaux Maîtres d'Ouvrage & Entités Publiques</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black">
                <tr>
                  <th className="p-3.5">Rang</th>
                  <th className="p-3.5">Autorité / Ministère / Collectivité</th>
                  <th className="p-3.5 text-center">Opérations (Renseignées / Total)</th>
                  <th className="p-3.5 text-right">Montant Renseigné (FCFA)</th>
                  <th className="p-3.5 text-right">
                    Poids Budgétaire {stats.isPercentagePartial ? '(sur renseignés)' : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.topEntities.map((ent, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="p-3.5 font-black text-slate-900">{ent.name}</td>
                    <td className="p-3.5 text-center font-bold text-slate-700">
                      {ent.documentedCount} / {ent.count}
                      {ent.unknownCount > 0 && (
                        <span className="block text-[10px] font-semibold text-amber-700">
                          {ent.unknownCount} sans montant connu
                        </span>
                      )}
                      {ent.zeroCount > 0 && (
                        <span className="block text-[10px] font-semibold text-slate-500">
                          {ent.zeroCount} à 0 FCFA documenté
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900">
                      {ent.documentedAmount !== null ? (
                        <>
                          {formatFCFA(ent.documentedAmount)}
                          <span className="block text-[10px] font-semibold text-slate-500 break-words">
                            ({formatAmountInWords(ent.documentedAmount)})
                            {ent.isPartial ? ' — Somme partielle' : ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-500 font-semibold">Montant inconnu</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-bold text-brand-blue">
                      {ent.percentageOfDocumented !== null
                        ? `${ent.percentageOfDocumented.toFixed(1)} %${ent.isPercentagePartial ? ' (partiel)' : ''}`
                        : 'Non calculable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. CONSTATS & RECOMMANDATIONS DE L'OBSERVATOIRE */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>4. Recommandations Citoyennes pour l'Exécution Budgétaire</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-900 block">1. Transparence des Marchés</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Publier systématiquement le nom des entreprises adjudicataires et les délais contractuels de livraison pour chaque ligne budgétaire.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-900 block">2. Affichage des Panneaux</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Imposer l'installation sur chaque site de projet du panneau officiel mentionnant le montant alloué et le maître d'ouvrage responsable.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-900 block">3. Contrôle Citoyen Permanent</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Encourager les populations locales à transmettre des preuves photographiques régulières pour documenter l'avancement physique réel.
              </p>
            </div>
          </div>
        </div>

        {/* Document Footer */}
        <div className="pt-6 border-t-2 border-slate-900 text-center text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">
            Document généré automatiquement par SuiviBudget Côte d'Ivoire — Observatoire & Plateforme Citoyenne de Transparence Budgétaire.
          </p>
          <p className="text-[11px]">
            Extraction issue des catalogues budgétaires (LFI 2026, budgets primitifs et données ouvertes) — classification algorithmique à vérifier sur pièce.
          </p>
        </div>

      </div>

    </div>
  );
};
