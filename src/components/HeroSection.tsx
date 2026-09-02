import React from 'react';
import { dataStore } from '../services/dataStore';
import { Search, Camera, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;
  onExploreClick: () => void;
  onSelectCommune?: (commune: string) => void;
  onOpenSendProof?: () => void;
  onNavigateTab?: (tab: 'institutions' | 'projects' | 'observatory') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  onExploreClick,
  onOpenSendProof,
  onNavigateTab,
}) => {
  const allProjects = dataStore.getProjects();

  return (
    <div className="bg-white border-b border-slate-200/80 pt-12 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto text-center">
        
        {/* Institutional Eyebrow Tag (Clean without blue dot) */}
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold tracking-wide mb-6 border border-slate-200 shadow-2xs">
          <span>Observatoire Citoyen & Plateforme de Transparence Budgétaire en Côte d'Ivoire</span>
        </div>

        {/* Big Heading (Fluid & impactful continuation) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight font-sans leading-[1.12] max-w-5xl mx-auto">
          Rendre chaque Franc public <span className="text-brand-blue">visible & utile</span> à chaque citoyen
        </h1>

        {/* Editorial Summary */}
        <p className="mt-5 text-base sm:text-lg md:text-xl text-slate-600 max-w-4xl mx-auto font-normal leading-relaxed">
          Explorez en toute transparence les <strong>{allProjects.length.toLocaleString('fr-FR')} chantiers d'écoles, de santé, d'eau potable et de voirie</strong>. Suivez les <strong>3 461 Mds FCFA</strong> d'investissements publics votés et participez activement au contrôle citoyen avec vos constats de terrain.
        </p>

        {/* Dual Audience Quick Action Links */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <button
            onClick={onExploreClick}
            className="px-6 py-3 bg-brand-blue hover:bg-brand-blue-dark active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <span>Trouver les chantiers de ma commune</span>
          </button>
          
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('institutions')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-sm font-bold transition-all border border-slate-200 flex items-center gap-2"
            >
              <span>Consulter le Budget de l'État & Ministères</span>
            </button>
          )}
        </div>

        {/* Clean Harmonized Search Bar */}
        <div className="mt-9 max-w-3xl mx-auto">
          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-2xl sm:rounded-full border border-slate-200 shadow-sm hover:border-slate-300 focus-within:border-brand-blue focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full flex items-center">
              <Search className="absolute left-4.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une commune, un ministère, un projet (ex: Bouaké, CHU, Route)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-transparent rounded-full text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus:outline-hidden font-medium"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onExploreClick}
                className="flex-1 sm:flex-none px-6 py-3 bg-brand-blue hover:bg-brand-blue-dark active:scale-95 text-white text-sm font-bold rounded-full shadow-sm transition-all flex items-center justify-center gap-2 flex-shrink-0"
              >
                <span>Explorer</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onOpenSendProof && (
                <button
                  onClick={onOpenSendProof}
                  className="flex-1 sm:flex-none px-5 py-3 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-sm font-bold rounded-full border border-slate-200 shadow-2xs transition-all flex items-center justify-center gap-2 flex-shrink-0"
                  title="Transmettre une photo de terrain"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Constat Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
