import { BudgetDataDownloads } from '../../components/institutions/BudgetDataDownloads';
import { normalizeSearchText } from '../../utils/searchHelpers';
import React, { useState } from 'react';
import { ArrowLeft, Search, Building2, ChevronDown, ArrowRight, FileText, ArrowRightLeft, Globe, ExternalLink, Info, Eye, EyeOff, Scale } from 'lucide-react';
import { Institution, BudgetProject } from '../../types';
import { formatFCFA, formatAmountInWords, getInstitutionLeaderGender } from '../../utils/formatters';
import { getProjectsForInstitution } from '../../utils/institutionProjects';
import { OfficialDocRequestModal } from '../../components/OfficialDocRequestModal';
import { CommuneComparatorModal } from '../../components/CommuneComparatorModal';
import { InstitutionDetailModal } from '../../components/InstitutionDetailModal';
import { LeaderPortrait } from '../../components/LeaderPortrait';
import { PaginationBar } from '../../components/PaginationBar';
import { getLatestAvailableCA } from '../../data/administrativeAccountsData';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';

interface MunicipalitiesPageProps {
  onBack: () => void;
  institutions: Institution[];
  allProjects: BudgetProject[];
  onNavigateToProjects: (communeName: string) => void;
}

export const MunicipalitiesPage: React.FC<MunicipalitiesPageProps> = ({
  onBack,
  institutions,
  allProjects,
  onNavigateToProjects,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('ALL');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('ALL');
  const [selectedLetterFilter, setSelectedLetterFilter] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'BUDGET_DESC' | 'BUDGET_ASC'>('NAME_ASC');
  const [page, setPage] = useState(1);
  const [revealedParties, setRevealedParties] = useState<Record<string, boolean>>({});
  const [revealAllParties, setRevealAllParties] = useState<boolean>(false);

  const toggleRevealParty = (id: string) => {
    setRevealedParties(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const [pageSize, setPageSize] = useState(8);

  // Modal states
  const [selectedInstForDoc, setSelectedInstForDoc] = useState<Institution | null>(null);
  const [selectedInstForDetail, setSelectedInstForDetail] = useState<Institution | null>(null);
  const [detailInitialSubTab, setDetailInitialSubTab] = useState<'BUDGET_2026' | 'EXECUTION' | 'HISTORY'>('BUDGET_2026');
  const [comparatorOpen, setComparatorOpen] = useState(false);
  const [compareCommuneA, setCompareCommuneA] = useState<Institution | null>(null);

  // String normalizer helper
  const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Helper to extract clean commune name without prefix
  const getCleanCommuneName = (name: string) => {
    return (name || '')
      .replace(/^Mairie du\s+/i, '')
      .replace(/^Mairie de la\s+/i, '')
      .replace(/^Mairie des\s+/i, '')
      .replace(/^Mairie de\s+/i, '')
      .replace(/^Mairie d['’]\s*/i, '')
      .trim();
  };

  // Dynamic Parity Stats for Mairies / Communes
  const allMairies = institutions.filter(i => i.type === 'MAIRIE');
  const totalMairiesCount = allMairies.length;
  const femaleMairiesCount = allMairies.filter(m => getInstitutionLeaderGender(m) === 'F').length;
  const maleMairiesCount = totalMairiesCount - femaleMairiesCount;
  const femaleMairiesPct = totalMairiesCount > 0 ? Math.round((femaleMairiesCount / totalMairiesCount) * 100) : 0;
  const maleMairiesPct = totalMairiesCount > 0 ? 100 - femaleMairiesPct : 0;

  // Unique Districts
  const uniqueDistricts = Array.from(
    new Set(institutions.filter(i => i.type === 'MAIRIE' && i.district).map(i => i.district))
  ).filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

  // Unique Regions (filtered by selectedDistrictFilter if selected)
  const uniqueRegions = Array.from(
    new Set(
      institutions
        .filter(i => i.type === 'MAIRIE' && (selectedDistrictFilter === 'ALL' || normalize(i.district) === normalize(selectedDistrictFilter)))
        .map(i => i.region)
    )
  ).filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

  // Letters count for A-Z bar (respecting gender filter)
  const availableLettersCount: Record<string, number> = {};
  allMairies
    .filter(i => selectedGender === 'ALL' || getInstitutionLeaderGender(i) === selectedGender)
    .forEach(i => {
      const first = getCleanCommuneName(i.name).charAt(0).toUpperCase();
      if (first >= 'A' && first <= 'Z') {
        availableLettersCount[first] = (availableLettersCount[first] || 0) + 1;
      }
    });

  // Filtered Mairies
  const filteredMairies = institutions.filter(i => {
    if (i.type !== 'MAIRIE') return false;

    const cleanName = getCleanCommuneName(i.name);
    const firstLetter = cleanName.charAt(0).toUpperCase();

    const matchesGender = selectedGender === 'ALL' || getInstitutionLeaderGender(i) === selectedGender;

    const matchesSearch = !searchQuery.trim() || 
      normalize(i.name).includes(normalize(searchQuery)) ||
      normalize(i.region).includes(normalize(searchQuery)) ||
      (i.district && normalize(i.district).includes(normalize(searchQuery))) ||
      (i.departement && normalize(i.departement).includes(normalize(searchQuery))) ||
      (i.info_officer_name && normalize(i.info_officer_name).includes(normalize(searchQuery)));

    const matchesDistrict = selectedDistrictFilter === 'ALL' || 
      normalize(i.district) === normalize(selectedDistrictFilter);

    const matchesReg = selectedRegionFilter === 'ALL' || 
      normalize(i.region) === normalize(selectedRegionFilter);

    const matchesLetter = selectedLetterFilter === 'ALL' || 
      firstLetter === selectedLetterFilter;

    return matchesSearch && matchesDistrict && matchesReg && matchesLetter && matchesGender;
  });

  // Sorted Mairies
  const sortedMairies = [...filteredMairies].sort((a, b) => {
    const nameA = getCleanCommuneName(a.name);
    const nameB = getCleanCommuneName(b.name);

    if (sortBy === 'NAME_ASC') {
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
    } else if (sortBy === 'NAME_DESC') {
      return nameB.localeCompare(nameA, 'fr', { sensitivity: 'base' });
    } else if (sortBy === 'BUDGET_DESC') {
      const budgetA = a.primitive_budget?.total_voted_fcfa ?? OFFICIAL_PRIMITIVE_BUDGETS[a.id]?.total_voted_fcfa ?? a.total_budget_fcfa ?? null;
      const budgetB = b.primitive_budget?.total_voted_fcfa ?? OFFICIAL_PRIMITIVE_BUDGETS[b.id]?.total_voted_fcfa ?? b.total_budget_fcfa ?? null;
      if (budgetA === null && budgetB === null) return 0;
      if (budgetA === null) return 1;
      if (budgetB === null) return -1;
      return budgetB - budgetA;
    } else if (sortBy === 'BUDGET_ASC') {
      const budgetA = a.primitive_budget?.total_voted_fcfa ?? OFFICIAL_PRIMITIVE_BUDGETS[a.id]?.total_voted_fcfa ?? a.total_budget_fcfa ?? null;
      const budgetB = b.primitive_budget?.total_voted_fcfa ?? OFFICIAL_PRIMITIVE_BUDGETS[b.id]?.total_voted_fcfa ?? b.total_budget_fcfa ?? null;
      if (budgetA === null && budgetB === null) return 0;
      if (budgetA === null) return 1;
      if (budgetB === null) return -1;
      return budgetA - budgetB;
    }
    return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedMairies.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedMairies.length);
  const paginatedMairies = sortedMairies.slice(startIndex, endIndex);

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <BudgetDataDownloads scope="COMMUNE" />
      
      {/* Top Navigation & Clean Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            Mairies (201)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl font-medium">
            Dotations budgétaires de l'État (LFI 2026 : communes de l'intérieur et communes périphériques d'Abidjan) et budgets municipaux votés (autonomie fiscale DGI).
          </p>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="space-y-4">
        
        {/* Selectors Row */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. District Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
              District ({uniqueDistricts.length})
            </label>
            <div className="relative">
              <select
                value={selectedDistrictFilter}
                onChange={(e) => {
                  setSelectedDistrictFilter(e.target.value);
                  setSelectedRegionFilter('ALL');
                  setPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-brand-blue"
              >
                <option value="ALL"> Tous les Districts</option>
                {uniqueDistricts.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Region Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
              Région ({uniqueRegions.length})
            </label>
            <div className="relative">
              <select
                value={selectedRegionFilter}
                onChange={(e) => {
                  setSelectedRegionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-brand-blue"
              >
                <option value="ALL"> Toutes les Régions</option>
                {uniqueRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. Sort Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
              Tri alphabétique / budget
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-brand-blue"
              >
                <option value="NAME_ASC"> Alphabétique (A → Z)</option>
                <option value="NAME_DESC"> Alphabétique (Z → A)</option>
                <option value="BUDGET_DESC"> Dotation (Plus élevée)</option>
                <option value="BUDGET_ASC"> Dotation (Moins élevée)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Text Search */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Commune, département..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-brand-blue"
              />
            </div>
          </div>

        </div>

        {/* Filtre paritaire républicain (Segmented Control tactile) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedGender('ALL');
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                selectedGender === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Tous <span className="ml-1 text-[11px] font-semibold text-slate-500">{totalMairiesCount}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedGender('F');
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                selectedGender === 'F'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Femmes <span className="ml-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">{femaleMairiesCount} • {femaleMairiesPct}%</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedGender('M');
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                selectedGender === 'M'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Hommes <span className="ml-1 text-[11px] font-semibold text-blue-800 bg-blue-100/80 px-1.5 py-0.5 rounded-md">{maleMairiesCount} • {maleMairiesPct}%</span>
            </button>
          </div>

          <div className="text-[11px] font-medium text-slate-500 px-2 sm:px-1 flex items-center justify-between sm:justify-end gap-2">
            <span>Observatoire parité exécutif</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">Loi n°2019-870</span>
          </div>
        </div>

        {/* Alphabetical Quick-Filter Bar (A to Z) */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setSelectedLetterFilter('ALL');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex-shrink-0 ${
              selectedLetterFilter === 'ALL'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            TOUTES ({sortedMairies.length})
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 flex-shrink-0"></div>

          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map(letter => {
            const count = availableLettersCount[letter] || 0;
            const hasItems = count > 0;
            const isSelected = selectedLetterFilter === letter;

            return (
              <button
                key={letter}
                disabled={!hasItems}
                onClick={() => {
                  setSelectedLetterFilter(letter);
                  setPage(1);
                }}
                title={hasItems ? `${count} commune(s) commençant par ${letter}` : `Aucune commune commençant par ${letter}`}
                className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-black transition-all ${
                  isSelected
                    ? 'bg-brand-blue text-white shadow-xs ring-2 ring-brand-blue/30'
                    : hasItems
                    ? 'bg-slate-50 border border-slate-200 text-slate-800 hover:border-brand-blue hover:text-brand-blue hover:bg-white'
                    : 'text-slate-300 opacity-40 cursor-not-allowed'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Results Summary Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
          <div>
            Affichage de <span className="text-brand-blue font-black">{paginatedMairies.length}</span> sur <span className="font-bold text-slate-800">{sortedMairies.length}</span> commune(s)
            {selectedDistrictFilter !== 'ALL' && <span> • District : <strong className="text-slate-800">{selectedDistrictFilter}</strong></span>}
            {selectedRegionFilter !== 'ALL' && <span> • Région : <strong className="text-slate-800">{selectedRegionFilter}</strong></span>}
            {selectedLetterFilter !== 'ALL' && <span> • Lettre : <strong className="text-brand-blue">{selectedLetterFilter}</strong></span>}
            {searchQuery && <span> • Recherche : « <strong className="text-slate-800">{searchQuery}</strong> »</span>}
          </div>
          {(selectedDistrictFilter !== 'ALL' || selectedRegionFilter !== 'ALL' || selectedLetterFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDistrictFilter('ALL');
                setSelectedRegionFilter('ALL');
                setSelectedLetterFilter('ALL');
                setSearchQuery('');
                setPage(1);
              }}
              className="text-brand-orange hover:underline font-bold text-xs"
            >
              Effacer tous les filtres
            </button>
          )}
        </div>

      </div>

      {/* Empty State */}
      {sortedMairies.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-sm">
          <div className="text-5xl"></div>
          <h3 className="text-xl font-black text-slate-900">Aucune commune ne correspond aux filtres</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Essayez d'ajuster votre recherche, de sélectionner une autre lettre ou de réinitialiser les filtres.
          </p>
          <button
            onClick={() => {
              setSelectedDistrictFilter('ALL');
              setSelectedRegionFilter('ALL');
              setSelectedLetterFilter('ALL');
              setSearchQuery('');
              setPage(1);
            }}
            className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            Réinitialiser tous les filtres
          </button>
        </div>
      )}

      {/* Grid of Mairies (Paginated) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {paginatedMairies.map((inst) => {
          const hasBreakdown = inst.budget_functioning_fcfa != null && inst.budget_investment_fcfa != null && (inst.total_budget_fcfa ?? 0) > 0;
          const functioningPct = hasBreakdown 
            ? Math.round((inst.budget_functioning_fcfa! / inst.total_budget_fcfa!) * 100) 
            : 0;
          const investmentPct = hasBreakdown ? (100 - functioningPct) : 0;
          const cleanName = getCleanCommuneName(inst.name);
          const relatedProjects = getProjectsForInstitution(inst, allProjects);
          const relatedProjectsCount = relatedProjects.length;

          const isDistrictAutonome = (inst.district && inst.district.toLowerCase().includes('autonome')) ||
            (inst.region && (inst.region.toLowerCase().includes('abidjan') || inst.region.toLowerCase().includes('yamoussoukro')));

          const territorialLabel = isDistrictAutonome
            ? (inst.region?.toLowerCase().includes('yamoussoukro') || inst.district?.toLowerCase().includes('yamoussoukro')
                ? "District Autonome de Yamoussoukro"
                : "District Autonome d'Abidjan")
            : `Région ${inst.region}`;

          const isGrandAbidjan = (inst.district?.toLowerCase().includes('abidjan') || inst.region?.toLowerCase().includes('abidjan') || ['abobo', 'adjamé', 'attécoubé', 'koumassi', 'marcory', 'plateau', 'port-bouët', 'treichville', 'anyama', 'bingerville', 'songon'].some(name => inst.name.toLowerCase().includes(name)));

          const isPeripheralAbidjan = ['inst-com-anyama', 'inst-com-bingerville', 'inst-com-songon'].includes(inst.id) ||
            ['anyama', 'bingerville', 'songon'].some(name => inst.name.toLowerCase().includes(name));

          const isAttecoube = inst.id === 'inst-com-attecoube' || inst.name.toLowerCase().includes('attécoubé');

          return (
            <div key={inst.id} className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md hover:border-brand-blue/50 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start gap-4 mb-3">
                  <LeaderPortrait
                    photoUrl={inst.leader_photo_url}
                    name={inst.leader_name || inst.name}
                    title={inst.leader_title || 'Maire'}
                    sizeClass="w-20 h-20 sm:w-24 sm:h-24 min-w-[5rem] max-w-[5rem] sm:min-w-[6rem] sm:max-w-[6rem]"
                  />

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-blue/10 text-brand-blue">
                        {territorialLabel}
                      </span>
                      {isPeripheralAbidjan && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Grand Abidjan • Commune Périphérique (DGE)
                        </span>
                      )}
                      {isAttecoube && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                          Grand Abidjan • 6 Chantiers Prioritaires (200 M)
                        </span>
                      )}
                      {inst.political_party && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRevealParty(inst.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                            (revealAllParties || revealedParties[inst.id])
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Cliquer pour afficher ou masquer l'étiquette politique de l'élu"
                        >
                          {(revealAllParties || revealedParties[inst.id]) ? (
                            <>
                              <EyeOff className="w-3 h-3 text-brand-orange" />
                              <span>{inst.political_party}</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-slate-400" />
                              <span>Parti politique</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-brand-blue transition-colors leading-snug">
                      {inst.name}
                    </h3>
                    {inst.leader_name && (
                      <div className="text-xs text-slate-600 font-bold mt-0.5">
                        {inst.leader_title || 'Maire'} : <span className="text-brand-blue">{inst.leader_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const prim = inst.primitive_budget || OFFICIAL_PRIMITIVE_BUDGETS[inst.id];
                  if (prim) {
                    const primTotal = prim.total_voted_fcfa;

                    return (
                      <div className="space-y-2 pt-2 mt-2">
                        <div className="flex justify-between items-baseline text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-800 font-black uppercase text-[10px] tracking-wider">Budget Voté</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Conseil Municipal
                            </span>
                            {prim.precision === 'APPROXIMATE' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                ≈ Arrondi
                              </span>
                            )}
                            {prim.precision === 'LOWER_BOUND' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                Plus de
                              </span>
                            )}
                          </div>
                          <span className="font-black text-slate-900 text-sm">
                            {formatFCFA(primTotal)}{' '}
                            <span className="text-brand-blue font-bold text-xs">
                              ({formatAmountInWords(primTotal)})
                            </span>
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-600 rounded-lg bg-slate-50 p-2" role="note">
                          Budget primitif de la commune. La part des subventions de l'État et celle
                          des ressources propres ne peuvent être établies sans tableau officiel
                          de recettes ventilées. Aucune répartition fictive n'est calculée.
                        </p>
                        {prim.source_url && (
                          <a href={prim.source_url} target="_blank" rel="noopener noreferrer"
                            onClick={event => event.stopPropagation()}
                            className="text-[10px] text-brand-blue underline">
                            Consulter la source du budget primitif 2026
                          </a>
                        )}
                      </div>
                    );
                  }

                  if (inst.is_tax_quota_commune) {
                    return (
                      <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl space-y-1.5 mt-3">
                        <div className="flex items-center justify-between gap-1 text-xs font-black text-amber-950">
                          <span className="flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-amber-700" />
                            Autonomie Fiscale & Recettes DGI
                          </span>
                          {isAttecoube ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              6 Projets État (200 M FCFA)
                            </span>
                          ) : isGrandAbidjan && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-brand-blue border border-blue-200">
                              Grand Abidjan • Prêt pour BP
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-900 leading-snug font-medium">
                          {isAttecoube
                            ? "Commune urbaine d'Abidjan à autonomie fiscale directe (DGI), complétée par 200 000 000 FCFA d'opérations d'urgence de l'État pour 6 chantiers d'écoles et de santé de proximité."
                            : isGrandAbidjan
                            ? "Commune du Grand Abidjan à forte assiette fiscale. Fiche calibrée pour la double lecture dès transmission officielle de la délibération du Conseil Municipal 2026."
                            : "Non bénéficiaire des dotations directes de l'État en raison de l'importance des quotes-parts d'impôts directes reversées par la DGI."}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 pt-2 mt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold uppercase">
                          {isPeripheralAbidjan ? "Dotation de l'État — DGE & DGF (LFI 2026)" : "Dotation de l'État (LFI 2026)"}
                        </span>
                        <span className="font-black text-slate-900">
                          {formatFCFA(inst.total_budget_fcfa)} <span className="text-brand-blue font-bold">({formatAmountInWords(inst.total_budget_fcfa)})</span>
                        </span>
                      </div>
                      {hasBreakdown ? (
                        <>
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex">
                            <div className="bg-brand-blue h-full" style={{ width: `${functioningPct}%` }}></div>
                            <div className="bg-emerald-500 h-full" style={{ width: `${investmentPct}%` }}></div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] font-semibold text-slate-600 gap-1 pt-1">
                            <span className="text-brand-blue">
                              Fonctionnement (DGF) : <strong>{functioningPct}%</strong> ({formatAmountInWords(inst.budget_functioning_fcfa)})
                            </span>
                            <span className="text-emerald-700">
                              Investissement (DGE) : <strong>{investmentPct}%</strong> ({formatAmountInWords(inst.budget_investment_fcfa)})
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 italic">
                          Ventilation Fonctionnement / Investissement à confirmer via l'annexe budgétaire.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Indicateur discret Compte Administratif d'exécution disponible */}
                {(() => {
                  const latestCA = getLatestAvailableCA(inst.id) || getLatestAvailableCA(inst.name);
                  if (!latestCA) return null;
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailInitialSubTab('EXECUTION');
                        setSelectedInstForDetail(inst);
                      }}
                      className="w-full mt-3 px-3 py-1.5 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 text-[11px] font-bold flex items-center justify-between transition-all group/ca cursor-pointer shadow-2xs"
                      title={`Consulter le Compte Administratif officiel certifié de l'exercice ${latestCA.fiscal_year}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Dernière exécution disponible : <strong>Exercice {latestCA.fiscal_year}</strong></span>
                      </div>
                      <span className="text-emerald-700 font-black group-hover/ca:translate-x-0.5 transition-transform flex items-center gap-1">
                        Voir l'exécution →
                      </span>
                    </button>
                  );
                })()}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
                  {inst.website && (
                    <a
                      href={inst.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-600 flex items-center justify-center transition-colors shadow-2xs flex-shrink-0"
                      title={`Site officiel : ${inst.website}`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {inst.facebook_url && (
                    <a
                      href={inst.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 flex items-center justify-center transition-colors shadow-2xs flex-shrink-0"
                      title={`Page Facebook : ${inst.facebook_url}`}
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInstForDoc(inst);
                    }}
                    className="px-2 py-1.5 bg-blue-50/90 hover:bg-brand-blue hover:text-white text-brand-blue border border-blue-100 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                    title="Générer une demande officielle de documents publics (Loi n°2013-867)"
                  >
                    <FileText className="w-3 h-3 text-brand-orange" />
                    <span className="whitespace-nowrap">Demande CAIDP</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompareCommuneA(inst);
                      setComparatorOpen(true);
                    }}
                    className="px-2 py-1.5 bg-slate-100 hover:bg-brand-orange hover:text-white text-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    title="Comparer cette commune avec une autre"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-brand-orange" />
                    <span className="whitespace-nowrap">Comparer</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailInitialSubTab('BUDGET_2026');
                      setSelectedInstForDetail(inst);
                    }}
                    className="px-2 py-1.5 bg-brand-blue/10 hover:bg-brand-blue hover:text-white text-brand-blue rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    title="Voir la fiche détaillée de la commune"
                  >
                    <Info className="w-3 h-3" />
                    <span className="whitespace-nowrap">Fiche</span>
                  </button>
                </div>

                <div className="flex-shrink-0 w-full sm:w-auto">
                  {relatedProjectsCount > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToProjects(cleanName);
                      }}
                      className="w-full sm:w-auto px-3.5 py-1.5 sm:py-2 bg-brand-blue hover:bg-brand-blue-dark active:scale-95 text-white text-xs font-bold rounded-xl sm:rounded-full transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      <span>Voir les projets ({relatedProjectsCount})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInstForDoc(inst);
                      }}
                      className="w-full sm:w-auto px-3 py-1.5 sm:py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl sm:rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Aucun projet recensé pour l'instant. Cliquer pour demander le programme triennal d'investissement (Loi n°2013-867)."
                    >
                      <FileText className="w-3 h-3 text-amber-700" />
                      <span>Demander le PTI</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* PAGINATION BAR                                                            */}
      {/* ========================================================================= */}
      <PaginationBar
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={sortedMairies.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[8, 16, 24, 48]}
        itemLabel="commune"
      />

      {/* Modals */}
      <OfficialDocRequestModal
        isOpen={!!selectedInstForDoc}
        onClose={() => setSelectedInstForDoc(null)}
        institution={selectedInstForDoc}
      />

      <CommuneComparatorModal
        isOpen={comparatorOpen}
        onClose={() => setComparatorOpen(false)}
        institutions={institutions}
        projects={allProjects}
        initialCommuneA={compareCommuneA}
        onNavigateToProjects={onNavigateToProjects}
      />

      <InstitutionDetailModal
        isOpen={!!selectedInstForDetail}
        onClose={() => {
          setSelectedInstForDetail(null);
          setDetailInitialSubTab('BUDGET_2026');
        }}
        institution={selectedInstForDetail}
        allProjects={allProjects}
        onNavigateToProjects={onNavigateToProjects}
        initialFinanceSubTab={detailInitialSubTab}
      />

    </div>
  );
};
