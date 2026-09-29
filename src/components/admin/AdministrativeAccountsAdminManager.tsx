// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — PILOTAGE DES COMPTES ADMINISTRATIFS (CA 232)
// Tableau de Bord Multi-Exercices, Matrice de Couverture, Ingestion & Audit
// =========================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  FileText, 
  UploadCloud, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  Layers, 
  Archive, 
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Eye,
  FileCheck
} from 'lucide-react';
import { 
  Institution, 
  PublicDocument, 
  CollectiviteCaStatus, 
  CollectivitesCaMatrixSummary, 
  DocumentLifecycleStatus 
} from '../../types';
import { dataStore } from '../../services/dataStore';
import { sanitizeCsvCell } from '../../utils/security';
import { matchesSmartSearch } from '../../utils/searchHelpers';
import { BatchCAImportModal } from './BatchCAImportModal';
import { SingleCAUploadModal } from './SingleCAUploadModal';
import { ExamineCADocumentModal } from './ExamineCADocumentModal';

interface AdministrativeAccountsAdminManagerProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027];

export const AdministrativeAccountsAdminManager: React.FC<AdministrativeAccountsAdminManagerProps> = ({
  onShowToast,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAIRIE' | 'REGION'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MISSING' | 'TO_VERIFY' | 'VERIFIED' | 'PUBLISHED' | 'ARCHIVED'>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');

  // Modals state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSingleUploadModalOpen, setIsSingleUploadModalOpen] = useState(false);
  const [isExamineModalOpen, setIsExamineModalOpen] = useState(false);
  const [selectedCollectiviteForUpload, setSelectedCollectiviteForUpload] = useState<Institution | undefined>(undefined);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<PublicDocument | undefined>(undefined);
  const [selectedDocForExamine, setSelectedDocForExamine] = useState<PublicDocument | undefined>(undefined);

  // Live state from dataStore
  const [institutions, setInstitutions] = useState<Institution[]>(() => dataStore.getInstitutions());
  const [documents, setDocuments] = useState<PublicDocument[]>(() => dataStore.getDocuments());

  useEffect(() => {
    return dataStore.subscribe(() => {
      setInstitutions(dataStore.getInstitutions());
      setDocuments(dataStore.getDocuments());
    });
  }, []);

  // Compute 232 Matrix & Summary
  const { summary, matrix } = useMemo(() => {
    return dataStore.getCollectivitesCaMatrix(selectedYear);
  }, [institutions, documents, selectedYear]);

  // Target 232 collectivités (201 communes + 31 conseils régionaux)
  const targetCollectivites = useMemo(() => {
    return institutions.filter(
      inst => inst.type === 'MAIRIE' || (inst.type === 'REGION' && !inst.id.startsWith('dist-'))
    );
  }, [institutions]);

  // Unique regions list for filter
  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    targetCollectivites.forEach(c => {
      if (c.region) set.add(c.region);
    });
    return Array.from(set).sort();
  }, [targetCollectivites]);

  // Filtered rows
  const filteredMatrix = useMemo(() => {
    return matrix.filter(row => {
      if (typeFilter !== 'ALL' && row.institution_type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
      if (regionFilter !== 'ALL' && row.region_name !== regionFilter) return false;

      if (searchQuery.trim()) {
        const docTerms = row.document ? [row.document.title, row.document.file_name, row.document.source_name || ''] : [];
        return matchesSmartSearch([row.institution_name, row.region_name, row.district_name || '', ...docTerms], searchQuery);
      }

      return true;
    });
  }, [matrix, typeFilter, statusFilter, regionFilter, searchQuery]);

  // Actions Handlers
  const handleOpenAdd = (col?: Institution) => {
    setSelectedDocForEdit(undefined);
    setSelectedCollectiviteForUpload(col);
    setIsSingleUploadModalOpen(true);
  };

  const handleOpenEdit = (doc: PublicDocument) => {
    const col = targetCollectivites.find(c => c.id === doc.institution_id);
    setSelectedCollectiviteForUpload(col);
    setSelectedDocForEdit(doc);
    setIsSingleUploadModalOpen(true);
  };

  const handleOpenExamine = (doc: PublicDocument) => {
    setSelectedDocForExamine(doc);
    setIsExamineModalOpen(true);
  };

  // Export Matrix to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID_Collectivite',
      'Nom_Collectivite',
      'Type',
      'Region',
      'District',
      'Exercice',
      'Statut_CA',
      'Version',
      'Nom_Fichier',
      'Taille',
      'Source_Officielle',
      'Empreinte_SHA256',
      'Date_Maj'
    ];

    const rows = matrix.map(r => [
      sanitizeCsvCell(r.institution_id),
      sanitizeCsvCell(r.institution_name),
      sanitizeCsvCell(r.institution_type === 'REGION' ? 'Conseil Régional' : 'Commune'),
      sanitizeCsvCell(r.region_name),
      sanitizeCsvCell(r.district_name || ''),
      sanitizeCsvCell(r.fiscal_year),
      sanitizeCsvCell(r.status),
      sanitizeCsvCell(r.document?.version || (r.status === 'MISSING' ? 0 : 1)),
      sanitizeCsvCell(r.document?.file_name || ''),
      sanitizeCsvCell(r.document?.file_size || ''),
      sanitizeCsvCell(r.document?.source_name || ''),
      sanitizeCsvCell(r.document?.checksum_sha256 || ''),
      sanitizeCsvCell(r.last_updated || '')
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Matrice_Comptes_Administratifs_${selectedYear}_SuiviBudget_CI.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast(`Matrice ${selectedYear} exportée avec succès (${matrix.length} collectivités).`);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & EXERCICE SELECTOR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-brand-blue/10 text-brand-blue">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                Pilotage des Comptes Administratifs (CA 232)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi multi-exercices de la reddition des comptes des 201 communes et 31 régions de Côte d'Ivoire.
              </p>
            </div>
          </div>
        </div>

        {/* Exercice Fiscal Tabs & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Year selector pills */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
            {AVAILABLE_YEARS.map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedYear === yr
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {yr}
                {yr === 2025 && (
                  <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-900 font-bold">
                    Cible
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-2"
            title="Télécharger la matrice de couverture en CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-colors shadow-xs flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import par lot</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-black transition-colors shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Déposer un CA</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KPI PILOTAGE CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Collectivités */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Attendues</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.totalExpected}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            201 com. • 31 rég.
          </div>
        </div>

        {/* Total Reçus */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 text-xs font-bold">
            <span>Reçus</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">
            {summary.receivedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {summary.communesReceivedCount} com. • {summary.regionsReceivedCount} rég.
          </div>
        </div>

        {/* À Vérifier */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 text-xs font-bold">
            <span>À vérifier</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {summary.toVerifyCount}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5 font-medium">
            En attente d'audit
          </div>
        </div>

        {/* Vérifiés */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 text-xs font-bold">
            <span>Vérifiés</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">
            {summary.verifiedCount}
          </div>
          <div className="text-[11px] text-indigo-700 mt-0.5 font-medium">
            Prêts à publier
          </div>
        </div>

        {/* Publiés */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-bold">
            <span>Publiés</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {summary.publishedCount}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-bold">
            {summary.globalCoveragePct}% de couverture
          </div>
        </div>

        {/* Manquants */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 text-xs font-bold">
            <span>Manquants</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {summary.missingCount}
          </div>
          <div className="text-[11px] text-rose-700 mt-0.5 font-medium">
            Non parvenus
          </div>
        </div>
      </div>

      {/* National Coverage Progress Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-blue" />
            <span>Taux National de Publication des Comptes Administratifs ({selectedYear})</span>
          </span>
          <span className="font-mono text-brand-blue font-black">
            {summary.publishedCount} / {summary.totalExpected} ({summary.globalCoveragePct}%)
          </span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div 
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(summary.publishedCount / summary.totalExpected) * 100}%` }}
            title={`Publiés : ${summary.publishedCount}`}
          />
          <div 
            className="bg-indigo-400 h-full transition-all duration-500"
            style={{ width: `${(summary.verifiedCount / summary.totalExpected) * 100}%` }}
            title={`Vérifiés : ${summary.verifiedCount}`}
          />
          <div 
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${(summary.toVerifyCount / summary.totalExpected) * 100}%` }}
            title={`À vérifier : ${summary.toVerifyCount}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Publiés ({summary.publishedCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
            <span>Vérifiés ({summary.verifiedCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>À vérifier ({summary.toVerifyCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />
            <span>Manquants ({summary.missingCount})</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER & SEARCH BAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une collectivité, région..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="ALL">Toutes collectivités ({summary.totalExpected})</option>
            <option value="MAIRIE">201 Communes</option>
            <option value="REGION">31 Conseils Régionaux</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PUBLISHED">Publiés ({summary.publishedCount})</option>
            <option value="VERIFIED">Vérifiés ({summary.verifiedCount})</option>
            <option value="TO_VERIFY">À vérifier ({summary.toVerifyCount})</option>
            <option value="MISSING">Manquants ({summary.missingCount})</option>
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 max-w-[180px]"
          >
            <option value="ALL">Toutes régions</option>
            {uniqueRegions.map(reg => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. THE 232 COLLECTIVITÉS INTERACTIVE TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Collectivité Territoriale</th>
                <th className="py-3.5 px-4">Région / District</th>
                <th className="py-3.5 px-4 text-center">Exercice</th>
                <th className="py-3.5 px-4">Statut Compte Administratif</th>
                <th className="py-3.5 px-4">Fichier & Empreinte</th>
                <th className="py-3.5 px-4">Source & Tutelle</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Aucune collectivité ne correspond aux critères de filtre.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map(row => {
                  const hasDoc = Boolean(row.document);
                  const doc = row.document;

                  return (
                    <tr key={row.institution_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Collectivité & Type */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 flex items-center gap-2">
                          <span>{row.institution_name}</span>
                          {row.institution_type === 'REGION' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
                              Région
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-brand-blue">
                              Commune
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {row.institution_id}
                        </div>
                      </td>

                      {/* Région / District */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{row.region_name}</div>
                        {row.district_name && (
                          <div className="text-[11px] text-slate-400">{row.district_name}</div>
                        )}
                      </td>

                      {/* Exercice */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">
                          {row.fiscal_year}
                        </span>
                      </td>

                      {/* Statut CA */}
                      <td className="py-3.5 px-4">
                        {row.status === 'PUBLISHED' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Publié en ligne
                          </span>
                        )}
                        {row.status === 'VERIFIED' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-brand-blue inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                            Vérifié (non publié)
                          </span>
                        )}
                        {row.status === 'TO_VERIFY' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            À vérifier
                          </span>
                        )}
                        {row.status === 'ARCHIVED' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 inline-flex items-center gap-1.5">
                            <Archive className="w-3.5 h-3.5 text-purple-600" />
                            Archivé
                          </span>
                        )}
                        {row.status === 'MISSING' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 inline-flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            Non parvenu
                          </span>
                        )}

                        {row.versions_count > 1 && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                            v{row.document?.version || row.versions_count}
                          </span>
                        )}
                      </td>

                      {/* Fichier & Empreinte */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {hasDoc ? (
                          <div>
                            <div className="font-semibold text-slate-900 truncate" title={doc?.file_name}>
                              {doc?.file_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>{doc?.file_size || 'PDF'}</span>
                              {doc?.checksum_sha256 && (
                                <span title={doc.checksum_sha256}>
                                  • #{doc.checksum_sha256.substring(0, 6)}...
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Aucun fichier</span>
                        )}
                      </td>

                      {/* Source & Tutelle */}
                      <td className="py-3.5 px-4">
                        {hasDoc ? (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {doc?.source_name || 'Non spécifiée'}
                            </span>
                            {doc?.approval_reference && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px] mt-0.5" title={doc.approval_reference}>
                                {doc.approval_reference}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDoc ? (
                            <>
                              <button
                                onClick={() => handleOpenExamine(doc!)}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-brand-blue hover:bg-blue-100 text-xs font-bold transition-colors flex items-center gap-1"
                                title="Examiner et valider le document"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Examiner</span>
                              </button>

                              <a
                                href={doc?.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-slate-100"
                                title="Ouvrir le PDF"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                const col = targetCollectivites.find(c => c.id === row.institution_id);
                                handleOpenAdd(col);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Déposer</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODALS INTEGRATION */}
      {/* ========================================================================= */}

      {/* Batch Import Modal */}
      <BatchCAImportModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedYear={selectedYear}
        collectivites={targetCollectivites}
        existingDocuments={documents}
        onSuccess={(count) => {
          // dataStore notifications automatically update state
        }}
        onShowToast={onShowToast}
      />

      {/* Single CA Upload Modal */}
      <SingleCAUploadModal
        isOpen={isSingleUploadModalOpen}
        onClose={() => {
          setIsSingleUploadModalOpen(false);
          setSelectedCollectiviteForUpload(undefined);
          setSelectedDocForEdit(undefined);
        }}
        targetCollectivite={selectedCollectiviteForUpload}
        collectivites={targetCollectivites}
        selectedYear={selectedYear}
        existingDocument={selectedDocForEdit}
        onSuccess={(savedDoc) => {
          // updated
        }}
        onShowToast={onShowToast}
      />

      {/* Examine CA Document Modal */}
      <ExamineCADocumentModal
        isOpen={isExamineModalOpen}
        onClose={() => {
          setIsExamineModalOpen(false);
          setSelectedDocForExamine(undefined);
        }}
        document={selectedDocForExamine}
        onOpenEdit={(doc) => handleOpenEdit(doc)}
        onStatusChange={(docId, newStatus) => {
          // updated
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
