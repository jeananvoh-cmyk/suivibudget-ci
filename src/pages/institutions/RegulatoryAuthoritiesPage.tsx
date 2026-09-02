import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  ArrowRight,
  Search, 
  FileText, 
  Info, 
  ExternalLink, 
  Globe 
} from 'lucide-react';
import { Institution, BudgetProject } from '../../types';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { matchesSmartSearch, normalizeSearchText } from '../../utils/searchHelpers';
import { REGULATORY_AUTHORITIES_DATA } from '../../data/regulatoryAuthoritiesData';
import { InstitutionDetailModal } from '../../components/InstitutionDetailModal';
import { OfficialDocRequestModal } from '../../components/OfficialDocRequestModal';

interface RegulatoryAuthoritiesPageProps {
  onBack: () => void;
  onNavigateToProjects: (query: string) => void;
  allProjects?: BudgetProject[];
}

type RegulatorCategory = 'ALL' | 'MEDIA_TELECOM' | 'TRANSPARENCY_PROCUREMENT' | 'ENERGY_HEALTH_RIGHTS';

export const RegulatoryAuthoritiesPage: React.FC<RegulatoryAuthoritiesPageProps> = ({
  onBack,
  allProjects = [],
  onNavigateToProjects,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RegulatorCategory>('ALL');
  const [selectedInstForDetail, setSelectedInstForDetail] = useState<Institution | null>(null);
  const [selectedInstForDoc, setSelectedInstForDoc] = useState<Institution | null>(null);

  // Filter authorities by search and sector category
  const filteredAuthorities = useMemo(() => {
    return REGULATORY_AUTHORITIES_DATA.filter((item) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = normalizeSearchText(searchQuery);
        const isMatch = matchesSmartSearch([item.name, item.leader_name, item.mission_summary], query);
        if (!isMatch) {
          return false;
        }
      }

      // 2. Category Tab Filter
      if (selectedCategory === 'MEDIA_TELECOM') {
        return item.id === 'aai-haca' || item.id === 'aai-artci';
      }
      if (selectedCategory === 'TRANSPARENCY_PROCUREMENT') {
        return item.id === 'aai-caidp' || item.id === 'aai-arcop';
      }
      if (selectedCategory === 'ENERGY_HEALTH_RIGHTS') {
        return item.id === 'aai-anare' || item.id === 'aai-airp' || item.id === 'aai-cndh';
      }

      return true;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-sans">
          Autorités & Organes de Régulation
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto font-medium">
          Autorités administratives indépendantes et agences de régulation sectorielle de la République de Côte d'Ivoire : budgets, dirigeants et missions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Rechercher une autorité, un président, un secteur (ex: HACA, CAIDP, ARCOP, ARTCI, Télécoms, Marchés publics)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: 'ALL', label: 'Toutes les Autorités' },
            { id: 'MEDIA_TELECOM', label: 'Médias & Télécoms (HACA, ARTCI)' },
            { id: 'TRANSPARENCY_PROCUREMENT', label: 'Commande Publique & Transparence (ARCOP, CAIDP)' },
            { id: 'ENERGY_HEALTH_RIGHTS', label: 'Énergie, Santé & Droits (ANARE-CI, AIRP, CNDH)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Authorities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAuthorities.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedInstForDetail(item)}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs hover:shadow-xl hover:border-brand-blue/40 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden cursor-pointer"
          >
            <div className="space-y-4">
              
              {/* Header: Title, Leader Info & Optional Photo */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <h2 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors leading-snug">
                    {item.name}
                  </h2>
                  <div className="text-xs font-bold text-slate-700">
                    {item.leader_name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {item.leader_title}
                  </div>
                </div>

                {/* Only display portrait if official photo URL exists, never display placeholder initials like MN, MA, MC */}
                {item.leader_photo_url ? (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-2xs bg-slate-50 flex-shrink-0">
                    <img
                      src={item.leader_photo_url}
                      alt={item.leader_name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {/* Mission Summary */}
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {item.mission_summary}
              </p>

              {/* Budget Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                  <span>Dotation Budgétaire</span>
                  <span className="text-slate-600 font-bold">2026</span>
                </div>
                
                <div>
                  <div className="text-sm font-black text-slate-900 whitespace-nowrap">
                    {formatFCFA(item.total_budget_fcfa)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">
                    ({formatAmountInWords(item.total_budget_fcfa)})
                  </div>
                </div>

                {/* Operating vs Investment mini-bar */}
                {item.total_budget_fcfa > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                      <div 
                        className="bg-brand-blue h-full" 
                        style={{ width: `${Math.round((item.budget_functioning_fcfa / item.total_budget_fcfa) * 100)}%` }} 
                      />
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${Math.round((item.budget_investment_fcfa / item.total_budget_fcfa) * 100)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>Fonct. {Math.round((item.budget_functioning_fcfa / item.total_budget_fcfa) * 100)}%</span>
                      {item.budget_investment_fcfa > 0 && (
                        <span>Invest. {Math.round((item.budget_investment_fcfa / item.total_budget_fcfa) * 100)}%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Card Footer : Harmonized with MinistriesPage */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {item.website && (
                  <a
                    href={item.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-600 flex items-center justify-center transition-colors shadow-2xs flex-shrink-0"
                    title={`Site officiel : ${item.website}`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </a>
                )}
                {item.facebook_url && (
                  <a
                    href={item.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 flex items-center justify-center transition-colors shadow-2xs flex-shrink-0"
                    title={`Page Facebook : ${item.facebook_url}`}
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInstForDoc(item);
                  }}
                  className="px-2 sm:px-2.5 py-1 bg-blue-50/90 hover:bg-brand-blue hover:text-white text-brand-blue border border-blue-100 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                  title="Générer une demande officielle de documents publics (Loi n°2013-867)"
                >
                  <FileText className="w-3 h-3 text-brand-orange" />
                  <span className="whitespace-nowrap">Demande de Documents</span>
                </button>
              </div>

              <span className="font-bold text-brand-blue flex items-center gap-1 group-hover:translate-x-0.5 transition-transform flex-shrink-0 text-xs">
                Fiche & Budget <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* Modals */}
      {selectedInstForDetail && (
        <InstitutionDetailModal
          isOpen={!!selectedInstForDetail}
          onClose={() => setSelectedInstForDetail(null)}
          institution={selectedInstForDetail}
          allProjects={allProjects}
          onNavigateToProjects={onNavigateToProjects}
        />
      )}

      {selectedInstForDoc && (
        <OfficialDocRequestModal
          isOpen={!!selectedInstForDoc}
          onClose={() => setSelectedInstForDoc(null)}
          institution={selectedInstForDoc}
        />
      )}

    </div>
  );
};
