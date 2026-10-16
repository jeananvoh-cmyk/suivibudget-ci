import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Building2, 
  ShieldCheck, 
  ArrowRight,
  Scale,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Hash,
  CheckCircle2,
  FileCheck2,
  Info
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { PublicDocument, DocumentCategory } from '../types';
import { matchesSmartSearch } from '../utils/searchHelpers';
import { publicDocumentMetadata } from '../review/domain/documents';
import { openDataCsv, openDataJson, auditedObservationsFromCatalog } from '../review/domain/history';
import { getReviewSourceDocuments } from '../data/officialPublicDocumentsCatalog';

interface DocumentsPageProps {
  onNavigateToCaidp?: () => void;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  COMPTE_ADMINISTRATIF: 'Comptes administratifs',
  RAPPORT_AUDIT: "Rapports d'Audit",
  MARCHE_PUBLIC: "Marchés Publics",
  BUDGET_OFFICIEL: "Budgets de l'État",
  LOI_CAIDP: "Textes CAIDP & Lois",
  ETUDE_TECHNIQUE: "Études Techniques",
  GUIDE_CITOYEN: "Guides Citoyens",
};

export function getBudgetNatureLabel(doc: PublicDocument): string {
  const id = doc.id.toUpperCase();
  if (id.includes('LFI') && !id.includes('TRANSFERT') && !id.includes('ANNEXE')) {
    return 'Budget Primitif (LFI)';
  }
  if (id.includes('DPPD') || id.includes('PAP')) {
    return 'Programmation Pluriannuelle (DPPD-PAP)';
  }
  if (id.includes('TRANSFERT') || id.includes('LOCAL')) {
    return 'Concours Collectivités et Districts';
  }
  if (id.includes('ANNEXE-6')) {
    return 'Budgets EPN et structures assimilées';
  }
  if (id.includes('ANNEXE-7')) {
    return 'Dotations Directes Institutions';
  }
  if (id.includes('RAP') || doc.category === 'RAPPORT_AUDIT') {
    return 'Rapport Annuel de Performance (RAP)';
  }
  if (id.includes('CA-') || doc.category === 'COMPTE_ADMINISTRATIF') {
    return "Compte Administratif d'Exécution";
  }
  if (id.includes('CAIDP') || doc.category === 'LOI_CAIDP') {
    return "Texte Fondateur d'Accès Public";
  }
  return CATEGORY_LABELS[doc.category] || 'Document Officiel';
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onNavigateToCaidp }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<PublicDocument[]>(() => 
    dataStore.getDocuments().filter(document => document.status === 'PUBLISHED')
  );

  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => 
      setDocuments(dataStore.getDocuments().filter(document => document.status === 'PUBLISHED'))
    );
    if (isSupabaseConfigured()) {
      void supabase
        .from('public_documents')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && Array.isArray(data)) {
            // Re-read dataStore to preserve combined baseline
            setDocuments(dataStore.getDocuments().filter(d => d.status === 'PUBLISHED'));
          }
        });
    }
    return unsubscribe;
  }, []);

  // Extract unique years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map(d => d.year))).sort((a, b) => b - a);
    return years;
  }, [documents]);

  // Categories with counts
  const categoriesList = useMemo(() => {
    const cats: { key: string; label: string; count: number }[] = [
      { key: 'ALL', label: 'Tous', count: documents.length },
    ];

    Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
      const count = documents.filter(d => d.category === key).length;
      if (count > 0) {
        cats.push({ key, label, count });
      }
    });

    return cats;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (doc.status && doc.status !== 'PUBLISHED') return false;
      // Category filter
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }

      // Year filter
      if (selectedYear !== 'ALL' && doc.year.toString() !== selectedYear) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        return matchesSmartSearch([
          doc.title, 
          doc.institution_name, 
          doc.description, 
          doc.checksum_sha256 || '',
          getBudgetNatureLabel(doc),
          ...(doc.tags || [])
        ], searchQuery);
      }

      return true;
    });
  }, [documents, selectedCategory, selectedYear, searchQuery]);

  const handleDownload = async (doc: PublicDocument, partId?: string) => {
    if (doc.http_status === 404) return;
    let targetUrl = doc.file_url;
    if ((doc.storage_path || doc.is_multipart) && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.functions.invoke('public-document-url', {
          body: { document_id: doc.id, ...(partId ? {part_id:partId} : {}) },
        });
        if (error || !data?.url) return;
        targetUrl = data.url;
      } catch {
        return;
      }
    }
    if (!targetUrl) return;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    dataStore.incrementDocumentDownloads(doc.id);
  };

  const handleCopySha256 = (docId: string, hash: string) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHashId(docId);
      setTimeout(() => setCopiedHashId(null), 2500);
    }).catch(() => {
      // Fallback
    });
  };

  const handleExportOpenDataCsv = () => {
    const yearNumber = selectedYear !== 'ALL' ? Number(selectedYear) : 2026;
    const sourceDocs = getReviewSourceDocuments();
    const obs = auditedObservationsFromCatalog();
    const csvContent = openDataCsv(obs, sourceDocs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suivibudget-opendata-certifie-${yearNumber}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportOpenDataJson = () => {
    const yearNumber = selectedYear !== 'ALL' ? Number(selectedYear) : 2026;
    const sourceDocs = getReviewSourceDocuments();
    const obs = auditedObservationsFromCatalog();
    const jsonContent = openDataJson(obs, sourceDocs);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suivibudget-opendata-certifie-${yearNumber}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportCatalogJson = () => {
    const yearNumber = selectedYear !== 'ALL' ? Number(selectedYear) : 2026;
    const sourceDocs = getReviewSourceDocuments();
    const metadata = publicDocumentMetadata(sourceDocs, yearNumber);
    const blob = new Blob([
      JSON.stringify({
        schema_version: '1.0.0',
        platform: 'SuiviBudget Côte d’Ivoire',
        exported_at: new Date().toISOString(),
        fiscal_year: yearNumber,
        total_documents: metadata.length,
        legal_basis: 'Loi n° 2013-867 du 23 décembre 2013 (CAIDP)',
        documents: metadata,
      }, null, 2)
    ], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suivibudget-catalogue-sources-${yearNumber}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedYear('ALL');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* ========================================================================= */}
      {/* 1. REPUBLICAN HERO BANNER                                                 */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-blue to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-orange text-white text-xs font-black uppercase tracking-wider mb-2 shadow-2xs">
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              <span>Transparence & Accès aux Documents (CAIDP)</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              Bibliothèque Publique & Documents Administratifs
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1.5 max-w-2xl leading-relaxed">
            Consultez les sources publiques et leur état de contrôle. Une empreinte identifie le fichier acquis ; elle ne certifie ni son contenu ni l’ensemble de son extraction.
            </p>
          </div>

          {/* Quick Metrics & Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 flex-shrink-0">
              <div>
                <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Documents</span>
                <span className="text-lg sm:text-2xl font-black text-white">{documents.length}</span>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div>
                <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Téléchargements</span>
                <span className="text-lg sm:text-2xl font-black text-brand-orange">
                  {documents.reduce((sum, d) => sum + (d.downloads_count || 0), 0) > 0
                    ? documents.reduce((sum, d) => sum + (d.downloads_count || 0), 0)
                    : 'Accès public'}
                </span>
              </div>
              <div className="w-px h-8 bg-white/20 hidden sm:block"></div>
              <div className="hidden sm:block">
                <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Accès Libre</span>
                <span className="text-xs font-black text-white flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Public
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportOpenDataCsv}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-2xs"
                title="Télécharger les observations financières vérifiées au format Open Data CSV"
                aria-label="Exporter les observations financières au format Open Data CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open Data (CSV)</span>
              </button>

              <button
                onClick={handleExportOpenDataJson}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-2xs"
                title="Télécharger les observations financières vérifiées au format Open Data JSON"
                aria-label="Exporter les observations financières au format Open Data JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open Data (JSON)</span>
              </button>

              <button
                onClick={handleExportCatalogJson}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-2xs"
                title="Télécharger les métadonnées des originaux contrôlés au format JSON"
                aria-label="Exporter le catalogue des sources au format JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sources (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & MINIMAL UNIFIED FILTER BAR                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Rechercher un document officiel par titre, institution ou empreinte SHA-256"
              placeholder="Rechercher par titre, institution, empreinte SHA-256 (ex: Loi de Finances, DPPD-PAP, DGBF)..."
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded bg-slate-200/80 font-bold cursor-pointer"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Filtrer les documents par année"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
            >
              <option value="ALL">Toutes les années</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr.toString()}>Année {yr}</option>
              ))}
            </select>

            {(searchQuery || selectedCategory !== 'ALL' || selectedYear !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                aria-label="Réinitialiser tous les filtres documentaires"
                className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Réinitialiser les filtres"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {categoriesList.map(cat => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DOCUMENTS GRID                                                         */}
      {/* ========================================================================= */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucun document ne correspond à vos critères de recherche</h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Principe d'intégrité républicain (Principe 9) : l'absence temporaire d'un document sur cette plateforme ne signifie pas qu'il n'existe pas dans les archives publiques de l'État.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-brand-blue transition-colors cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
            {onNavigateToCaidp && (
              <button
                onClick={onNavigateToCaidp}
                className="px-4 py-2 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Demander via la CAIDP
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => {
            const isOfficial = doc.is_official && doc.source_provenance === 'OFFICIAL_SOURCE';
            const isVerified = doc.extraction_status === 'VERIFIED' && !!doc.control_scope;
            const budgetNature = getBudgetNatureLabel(doc);
            const hasSha256 = Boolean(doc.checksum_sha256);
            const isCopied = copiedHashId === doc.id;

            return (
              <div 
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-brand-blue/50 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Content */}
                <div className="p-5 pb-3 space-y-3">
                  {/* Category Badge & Year */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-700 border border-slate-200/80">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>{CATEGORY_LABELS[doc.category] || doc.category}</span>
                    </span>
                    <span className="text-xs font-black text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {doc.year}
                    </span>
                  </div>

                  {/* Nature Budgétaire Spécifique */}
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-brand-blue bg-blue-50/80 border border-blue-200/70 px-2.5 py-0.5 rounded-lg">
                    <FileCheck2 className="w-3.5 h-3.5 text-brand-blue flex-shrink-0" />
                    <span className="truncate">{budgetNature}</span>
                  </div>

                  {/* Institution Source */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{doc.institution_name}</span>
                  </div>

                  {/* Document Title */}
                  <h3 
                    className="text-sm sm:text-base font-black text-slate-900 line-clamp-2 group-hover:text-brand-blue transition-colors leading-snug min-h-[44px]"
                    title={doc.title}
                  >
                    {doc.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-normal">
                    {doc.description}
                  </p>

                  {/* Badges de Provenance et Contrôle Républicain */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {isOfficial && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-md">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Source : {doc.source_name || doc.institution_name || 'Institution officielle'}</span>
                      </span>
                    )}

                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-800 bg-blue-50 border border-blue-200/90 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span title={doc.control_scope || undefined}>Document officiel vérifié</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        <span>Document officiel publié</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    {doc.verification_status === 'VERIFIED' ? 'Document vérifié' : 'Document enregistré'}
                    {' · '}{doc.http_status === 200 ? 'Fichier accessible' : doc.http_status === 404 ? 'Lien indisponible (HTTP 404)' : (!doc.file_url && !doc.storage_path ? 'Document non numérisé' : 'Consultation')}
                    {doc.accessed_at && ` — ${doc.accessed_at}`}
                    {doc.availability === 'AVAILABLE_FROM_PRIOR_OFFICIAL_ACQUISITION' && ' · Archive officielle acquise'}
                  </p>
                  {hasSha256 && (
                    <div className="pt-1">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Hash className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-[10px] font-mono text-slate-600 truncate" title={doc.checksum_sha256!}>
                            SHA-256 : {doc.checksum_sha256!.slice(0, 10)}...{doc.checksum_sha256!.slice(-8)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySha256(doc.id, doc.checksum_sha256!)}
                          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-200/70 transition-colors cursor-pointer"
                          aria-label="Copier l’empreinte SHA-256"
                          title="Copier l'empreinte SHA-256 complète pour vérification"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {isCopied && (
                        <p className="text-[9px] font-bold text-emerald-600 mt-0.5 ml-1 animate-fade-in">
                          Empreinte copiée dans le presse-papier !
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded-lg">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Section: Format, Size & Download */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-800">{doc.file_format}</span>
                    <span className="mx-1">•</span>
                    <span>{doc.file_size || (doc.page_count ? `${doc.page_count} pages` : 'PDF')}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {doc.downloads_count && doc.downloads_count > 1 
                        ? `${doc.downloads_count} téléchargements` 
                        : doc.downloads_count === 1
                        ? '1 téléchargement'
                        : 'Accès direct'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
                        aria-label="Ouvrir la source documentaire dans un nouvel onglet"
                        title="Ouvrir la source documentaire dans un nouvel onglet"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {doc.is_multipart ? (
                      <div className="flex flex-wrap gap-2">
                        {doc.document_parts?.map(part => (
                          <button
                            key={part.id || part.part_number}
                            onClick={() => void handleDownload(doc, part.id)}
                            className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 focus-visible:outline-brand-blue cursor-pointer"
                          >
                            Fascicule {part.part_number}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        disabled={doc.http_status === 404 || (!doc.file_url && !doc.storage_path)}
                        onClick={() => handleDownload(doc)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                          doc.http_status === 404 || (!doc.file_url && !doc.storage_path)
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-brand-blue hover:bg-blue-700 active:scale-95 text-white cursor-pointer'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{doc.http_status === 404 ? 'Lien indisponible' : (!doc.file_url && !doc.storage_path ? 'Non disponible' : 'Télécharger')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CAIDP CITIZEN CALL TO ACTION                                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-brand-orange text-xs font-bold uppercase tracking-wider border border-orange-200/60">
            <Scale className="w-3.5 h-3.5" />
            <span>Document Introuvable ou Non Publié ?</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            Exercez votre droit légal d'accès à l'information (Loi n° 2013-867)
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tout citoyen, journaliste ou organisation peut demander la communication d'un rapport officiel, 
            d'un contrat ou d'une délibération auprès du Responsable de l'Information (RI) de l'organisme public concerné.
          </p>
        </div>

        <button
          onClick={onNavigateToCaidp}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-brand-blue text-white font-bold text-xs shadow-sm transition-all flex-shrink-0 cursor-pointer"
        >
          <span>Générer une demande officielle</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
