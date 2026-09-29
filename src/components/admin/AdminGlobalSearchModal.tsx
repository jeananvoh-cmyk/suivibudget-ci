// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — RECHERCHE GLOBALE ADMIN MULTI-ENTITÉS (CTRL+K)
// Recherche instantanée dans les Organismes, Élus, Documents, Projets et Signalements
// =========================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Building2, 
  Landmark, 
  FileText, 
  Camera, 
  FileSpreadsheet, 
  ArrowRight,
  User,
  ExternalLink,
  CornerDownLeft
} from 'lucide-react';
import { dataStore } from '../../services/dataStore';
import { normalizeSearchText } from '../../utils/searchHelpers';
import { formatFCFA } from '../../utils/formatters';

interface AdminGlobalSearchResult {
  id: string;
  category: 'ORGANISME' | 'ELU' | 'DOCUMENT' | 'PROJET' | 'SIGNALEMENT';
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  targetTab: string;
  targetFilter?: Record<string, string>;
}

interface AdminGlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (tabId: string, filter?: Record<string, string>) => void;
}

export const AdminGlobalSearchModal: React.FC<AdminGlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Aggregate searchable items from real data
  const searchResults = useMemo<AdminGlobalSearchResult[]>(() => {
    if (!query.trim() || query.length < 2) return [];

    const q = normalizeSearchText(query);
    const results: AdminGlobalSearchResult[] = [];

    // 1. Organismes CAIDP & Mairies
    const caidpEntities = dataStore.getCaidpDirectory();
    caidpEntities.forEach(ent => {
      const matchName = normalizeSearchText(ent.company_name).includes(q);
      const matchRi = normalizeSearchText(ent.ri_name).includes(q);
      const matchEmail = (ent.email || '').toLowerCase().includes(q);
      if (matchName || matchRi || matchEmail) {
        results.push({
          id: `caidp-${ent.id}`,
          category: 'ORGANISME',
          title: ent.company_name,
          subtitle: `RI : ${ent.ri_name} • Email : ${ent.email || "Non renseigné"}`,
          badge: ent.category,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
          targetTab: 'caidp_manager',
          targetFilter: { search: ent.company_name }
        });
      }
    });

    // 2. Institutions & Élus
    const institutions = dataStore.getInstitutions();
    institutions.forEach(inst => {
      const matchInst = normalizeSearchText(inst.name).includes(q);
      const matchLeader = inst.leader_name && normalizeSearchText(inst.leader_name).includes(q);
      if (matchInst || matchLeader) {
        results.push({
          id: `inst-${inst.id}`,
          category: 'ELU',
          title: inst.name,
          subtitle: `${inst.leader_title || 'Premier Responsable'} : ${inst.leader_name || 'Non renseigné'} (${inst.region})`,
          badge: inst.type,
          badgeColor: 'bg-blue-100 text-brand-blue border-blue-200',
          targetTab: 'institutions_manager',
          targetFilter: { search: inst.name }
        });
      }
    });

    // 3. Documents Publics
    const documents = dataStore.getDocuments();
    documents.forEach(doc => {
      const matchTitle = normalizeSearchText(doc.title).includes(q);
      const matchInst = normalizeSearchText(doc.institution_name).includes(q);
      if (matchTitle || matchInst) {
        results.push({
          id: `doc-${doc.id}`,
          category: 'DOCUMENT',
          title: doc.title,
          subtitle: `${doc.institution_name} • Exercice ${doc.year || 'Non spécifié'} • ${doc.category}`,
          badge: 'DOCUMENT',
          badgeColor: 'bg-purple-100 text-purple-900 border-purple-200',
          targetTab: 'documents_manager',
          targetFilter: { search: doc.title }
        });
      }
    });

    // 4. Projets & Lignes Budgétaires
    const projects = dataStore.getProjects();
    projects.forEach(proj => {
      const matchTitle = normalizeSearchText(proj.title).includes(q);
      const matchCommune = normalizeSearchText(proj.commune_name).includes(q);
      if (matchTitle || matchCommune) {
        results.push({
          id: `proj-${proj.id}`,
          category: 'PROJET',
          title: proj.title,
          subtitle: `${proj.commune_name} (${proj.region_name}) • ${formatFCFA(proj.budget_amount_fcfa)}`,
          badge: 'INVESTISSEMENT',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          targetTab: 'budget_table',
          targetFilter: { search: proj.title }
        });
      }
    });

    // 5. Signalements Citoyens
    const proofs = dataStore.getAllProofs();
    proofs.forEach(proof => {
      const matchComment = proof.comment && normalizeSearchText(proof.comment).includes(q);
      const matchProj = proof.project_title && normalizeSearchText(proof.project_title).includes(q);
      const matchCom = proof.commune_name && normalizeSearchText(proof.commune_name).includes(q);
      if (matchComment || matchProj || matchCom) {
        results.push({
          id: `proof-${proof.id}`,
          category: 'SIGNALEMENT',
          title: `Signalement : ${proof.project_title || proof.commune_name || 'Localité'}`,
          subtitle: `${proof.commune_name || 'Côte d\'Ivoire'} • Statut : ${proof.verification_status} • "${proof.comment || ''}"`,
          badge: 'TERRAIN',
          badgeColor: 'bg-rose-100 text-rose-900 border-rose-200',
          targetTab: 'moderation',
          targetFilter: { search: proof.project_title || proof.commune_name || '' }
        });
      }
    });

    return results.slice(0, 15);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = searchResults[selectedIndex];
      if (current) {
        onSelectResult(current.targetTab, current.targetFilter);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher organisme, élu, document, projet, commune..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
          />
          {query ? (
            <button 
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-black">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {query.trim().length < 2 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tapez au moins 2 caractères pour rechercher instantanément dans l'ensemble des bases d'administration.
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">Aucun résultat trouvé pour « {query} »</p>
              <p className="text-xs text-slate-500">Vérifiez l'orthographe ou essayez un nom de commune plus court.</p>
            </div>
          ) : (
            searchResults.map((res, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={res.id}
                  onClick={() => {
                    onSelectResult(res.targetTab, res.targetFilter);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {res.category === 'ORGANISME' && <Building2 className="w-4 h-4 text-amber-500" />}
                      {res.category === 'ELU' && <Landmark className="w-4 h-4 text-brand-blue" />}
                      {res.category === 'DOCUMENT' && <FileText className="w-4 h-4 text-purple-500" />}
                      {res.category === 'PROJET' && <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
                      {res.category === 'SIGNALEMENT' && <Camera className="w-4 h-4 text-rose-500" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-xs sm:text-sm truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {res.title}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isSelected ? 'bg-white/20 text-white border-white/30' : res.badgeColor
                        }`}>
                          {res.badge}
                        </span>
                      </div>
                      <div className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {res.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSelected && (
                      <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20 text-white text-[10px] font-bold">
                        <span>Entrée</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </kbd>
                    )}
                    <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-brand-orange' : 'text-slate-400'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-4">
          <div className="flex items-center gap-3">
            <span>↑↓ Naviguer</span>
            <span>↵ Ouvrir</span>
            <span>ESC Quitter</span>
          </div>
          <span className="font-bold text-slate-700">Recherche Universelle SuiviBudget</span>
        </div>

      </div>
    </div>
  );
};
