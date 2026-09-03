import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Scale
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { PublicDocument, DocumentCategory } from '../types';
import { matchesSmartSearch } from '../utils/searchHelpers';

interface DocumentsPageProps {
  onNavigateToCaidp?: () => void;
}

const CATEGORY_CONFIG: Record<DocumentCategory, { label: string; bg: string; text: string; border: string }> = {
  RAPPORT_AUDIT: {
    label: "Rapports d'Audit & Contrôle",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200"
  },
  MARCHE_PUBLIC: {
    label: "Marchés Publics & Contrats",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200"
  },
  BUDGET_OFFICIEL: {
    label: "Budgets & Finances Publiques",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200"
  },
  LOI_CAIDP: {
    label: "Lois & Textes Juridiques (CAIDP)",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200"
  },
  ETUDE_TECHNIQUE: {
    label: "Études & Infrastructures",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200"
  },
  GUIDE_CITOYEN: {
    label: "Guides Pratiques Citoyens",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200"
  }
};

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onNavigateToCaidp }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const documents = dataStore.getDocuments();

  // Extract unique years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map(d => d.year))).sort((a, b) => b - a);
    return years;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
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
        return matchesSmartSearch([doc.title, doc.institution_name, doc.description, ...(doc.tags || [])], searchQuery);
      }

      return true;
    });
  }, [documents, selectedCategory, selectedYear, searchQuery]);

  const handleDownload = (doc: PublicDocument) => {
    dataStore.incrementDocumentDownloads(doc.id);
    window.open(doc.file_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-10 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-brand-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-20 w-80 h-80 bg-brand-orange/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-brand-orange text-xs font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" />
            Transparence Républicaine & Accès aux Documents (Loi CAIDP)
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-sans">
            Bibliothèque Publique & Documents Administratifs
          </h1>
          
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Consultez, recherchez et téléchargez librement les rapports officiels, budgets, audits 
            et lois publiques de la République de Côte d'Ivoire. Tous ces documents sont d'accès public 
            conformément à la Loi n° 2013-867.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400 block">Documents Disponibles</span>
              <span className="text-2xl font-black text-white">{documents.length}</span>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400 block">Téléchargements Citoyens</span>
              <span className="text-2xl font-black text-brand-orange">
                {documents.reduce((sum, d) => sum + (d.downloads_count || 0), 0)}
              </span>
            </div>
            <div className="hidden sm:block bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400 block">Droit Constitutionnel</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-4 h-4" /> 100% Libre d'Accès
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un rapport, une loi, un audit (ex: Cour des Comptes, AGEROUTE, Budget 2026)..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-200"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              <option value="ALL">Toutes les années</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr.toString()}>{yr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({documents.length})
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => {
            const count = documents.filter(d => d.category === catKey).length;
            if (count === 0 && selectedCategory !== catKey) return null;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  selectedCategory === catKey
                    ? 'bg-brand-blue text-white shadow-sm'
                    : `${config.bg} ${config.text} hover:opacity-90`
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Aucun document trouvé</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Aucun document ne correspond à vos critères de recherche. Vous pouvez modifier vos filtres 
            ou utiliser notre formulaire officiel CAIDP pour demander ce document à l'administration.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedYear('ALL'); }}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => {
            const catConfig = CATEGORY_CONFIG[doc.category] || {
              label: doc.category,
              bg: 'bg-slate-100',
              text: 'text-slate-700',
              border: 'border-slate-200'
            };

            return (
              <div 
                key={doc.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Badge & Year */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>
                      {catConfig.label}
                    </span>
                    <span className="text-xs font-extrabold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {doc.year}
                    </span>
                  </div>

                  {/* Institution source */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{doc.institution_name}</span>
                  </div>

                  {/* Document Title */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-blue transition-colors leading-snug">
                    {doc.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {doc.description}
                  </p>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-medium bg-slate-50 text-slate-500 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions & Meta */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div className="font-bold text-slate-600">
                      {doc.file_format} • {doc.file_size || 'PDF'}
                    </div>
                    <div>{doc.downloads_count || 0} téléchargements</div>
                  </div>

                  <button
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CAIDP Call to Action Banner */}
      <section className="bg-gradient-to-br from-brand-blue/5 via-orange-50/50 to-white rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Document Introuvable ou Non Publié ?
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            Faites valoir votre droit légal d'accès à l'information (Loi CAIDP)
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tout citoyen, journaliste ou organisation peut demander la communication d'un rapport, 
            d'un contrat ou d'une délibération budgétaire auprès des Responsables de l'Information 
            de n'importe quel ministère, mairie ou institution publique de Côte d'Ivoire.
          </p>
        </div>

        <button
          onClick={onNavigateToCaidp}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-brand-blue transition-all shadow-lg hover:shadow-xl flex-shrink-0"
        >
          <span>Générer une demande officielle</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
