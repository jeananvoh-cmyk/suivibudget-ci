import React, { useState } from 'react';
import { CitizenProof, ProjectStatus, BudgetProject } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatAmountInWords, formatDateFR, getStatusConfig } from '../utils/formatters';
import { BudgetReportsView } from '../components/BudgetReportsView';
import { 
  Camera, 
  Video,
  MapPin, 
  ThumbsUp, 
  CheckCircle2, 
  Search, 
  TrendingUp,
  FileText,
  Info,
  ArrowRight,
  HardHat,
  Sparkles
} from 'lucide-react';

interface ObservatoryPageProps {
  onOpenSendProof: (project?: BudgetProject) => void;
  onSelectProjectById: (projectId: string) => void;
}

export const ObservatoryPage: React.FC<ObservatoryPageProps> = ({
  onOpenSendProof,
  onSelectProjectById,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'reports'>('gallery');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const approvedProofs = dataStore.getApprovedProofs();
  const allProjects = dataStore.getProjects();
  const hasRealProofs = dataStore.hasRealProofs();

  const filteredProofs = approvedProofs.filter((proof) => {
    const matchesSearch =
      !searchQuery ||
      (proof.project_title && proof.project_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (proof.commune_name && proof.commune_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      proof.comment.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'ALL' || proof.citizen_status_claim === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleConfirm = (proofId: string) => {
    dataStore.confirmProof(proofId);
  };

  // Metrics for Budget Voté vs Avancement Constaté
  const totalVerifiedProofs = approvedProofs.length;
  const inProgressProofs = approvedProofs.filter(p => p.citizen_status_claim === 'IN_PROGRESS').length;
  const completedProofs = approvedProofs.filter(p => p.citizen_status_claim === 'COMPLETED').length;
  const notStartedProofs = approvedProofs.filter(p => p.citizen_status_claim === 'NOT_STARTED').length;

  // Uninspected candidate projects for the Action 3 Discovery flow
  const candidateProjects = allProjects.slice(0, 3);

  return (
    <div className="relative">
      {/* Mobile Floating Action Button (FAB) */}
      {activeTab === 'gallery' && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden print:hidden">
          <button
            onClick={() => onOpenSendProof()}
            className="flex items-center gap-2 px-5 py-3.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-full shadow-2xl font-black text-sm active:scale-95 transition-all border-2 border-white cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            <span>Déposer un constat</span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 pb-24 bg-[#FAFAFA]">
        
        {/* ========================================================================= */}
        {/* 1. CLEAN PAGE HEADER */}
        {/* ========================================================================= */}
        <div className="print:hidden flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-sans">
              Observatoire Citoyen des Chantiers Publics
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Suivi photographique de terrain, contrôle participatif et vérification citoyenne des <strong>3 453,8 Milliards FCFA</strong> d'investissements de la Loi de Finances 2026.
            </p>
          </div>

          {/* Top Primary CTA */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => onOpenSendProof()}
              className="py-3 px-6 bg-brand-orange hover:bg-brand-orange-dark active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Déposer un Constat Terrain</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SECTION TABS SWITCHER */}
        {/* ========================================================================= */}
        <div className="print:hidden flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-xl">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Camera className="w-4 h-4 text-brand-orange" />
            <span>Galerie des Constats ({approvedProofs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4 text-brand-blue" />
            <span>Bilans & Rapports d'Étape 2026</span>
          </button>
        </div>

        {/* TAB 1: REPORTS VIEW */}
        {activeTab === 'reports' ? (
          <BudgetReportsView />
        ) : (
          <>
            {/* ========================================================================= */}
            {/* 3. TRANSPARENT DEMONSTRATION NOTICE (Action 1) */}
            {/* ========================================================================= */}
            {!hasRealProofs && (
              <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-brand-blue flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-200">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>Espace Démonstration Pédagogique</span>
                    <span className="text-[10px] bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full font-semibold">Phase Initiale</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Ces premières fiches illustrent concrètement comment les constats photographiques et vidéos permettent de vérifier l'avancement des chantiers. Dès la validation des premiers signalements transmis par les citoyens de votre commune, cet espace basculera automatiquement sur les preuves du terrain.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. COMPARATIVE PROGRESS STATS */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Budget Voté vs Avancement Constaté sur le Terrain
                  </h3>
                  <p className="text-xs text-slate-500">
                    Synthèse des observations vérifiées par la communauté citoyenne
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold self-start sm:self-auto border border-slate-200/70">
                  {totalVerifiedProofs} constat{totalVerifiedProofs > 1 ? 's' : ''} documenté{totalVerifiedProofs > 1 ? 's' : ''}
                </span>
              </div>

              {/* 3 Metric Progress Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Box 1: En chantier */}
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-900 font-bold block">En chantier effectif</span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5 block">{inProgressProofs}</span>
                    <span className="text-[11px] text-slate-600">Travaux en cours constatés</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    🟡
                  </div>
                </div>

                {/* Box 2: Livré */}
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-900 font-bold block">Terminé & Livré</span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5 block">{completedProofs}</span>
                    <span className="text-[11px] text-slate-600">Ouvrages opérationnels</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    🟢
                  </div>
                </div>

                {/* Box 3: Non démarré */}
                <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-rose-900 font-bold block">Pas encore démarré</span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5 block">{notStartedProofs}</span>
                    <span className="text-[11px] text-slate-600">Chantiers en attente</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                    🔴
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 5. FILTERS & SEARCH BAR */}
            {/* ========================================================================= */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              
              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Toutes ({approvedProofs.length})
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('IN_PROGRESS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedStatusFilter === 'IN_PROGRESS'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>En chantier ({inProgressProofs})</span>
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('COMPLETED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedStatusFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Livré ({completedProofs})</span>
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('NOT_STARTED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedStatusFilter === 'NOT_STARTED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Non démarré ({notStartedProofs})</span>
                </button>
              </div>

              {/* Search */}
              <div className="w-full sm:w-64 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrer par commune, titre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-blue"
                />
              </div>

            </div>

            {/* ========================================================================= */}
            {/* 6. OBSERVATORY FEED (MEDIA CARDS) */}
            {/* ========================================================================= */}
            {filteredProofs.length === 0 ? (
              /* Action 3 : Actionable Discovery & Candidate Projects */
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6">
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
                    <Search className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Aucun constat ne correspond à cette recherche
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Soyez le premier citoyen à documenter un chantier dans cette zone géographique.
                  </p>
                </div>

                {/* Candidate projects waiting for inspection */}
                <div className="max-w-3xl mx-auto text-left pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Chantiers prioritaires à vérifier près de chez vous :
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {candidateProjects.map((p) => (
                      <div key={p.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-brand-orange uppercase">{p.commune_name}</span>
                          <h5 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">{p.title}</h5>
                          <div className="text-[11px] font-black text-slate-700">{formatFCFA(p.budget_amount_fcfa)}</div>
                        </div>
                        <button
                          onClick={() => onOpenSendProof(p)}
                          className="mt-3 w-full py-1.5 bg-white hover:bg-brand-blue hover:text-white text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Déposer le 1er constat</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProofs.map((proof) => {
                  const project = allProjects.find(p => p.id === proof.project_id);
                  const status = getStatusConfig(proof.citizen_status_claim);

                  return (
                    <div 
                      key={proof.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-brand-blue/40 transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                    >
                      <div>
                        
                        {/* Media Container */}
                        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
                          {proof.media_type === 'VIDEO' && proof.video_url ? (
                            <video
                              src={proof.video_url}
                              controls
                              className="w-full h-full object-cover bg-black"
                            />
                          ) : (
                            <img
                              src={proof.photo_url || proof.image_url}
                              alt={proof.project_title || "Preuve citoyenne"}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80';
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          )}
                          
                          {/* Floating Status Pill */}
                          <div className="absolute top-3 right-3 pointer-events-none">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md bg-white/95 border ${status.badgeClass}`}>
                              <span className={`w-2 h-2 rounded-full ${status.dotClass}`}></span>
                              <span>{status.label}</span>
                            </span>
                          </div>

                          {/* Demonstration Pill if is_demo */}
                          {proof.is_demo && (
                            <div className="absolute top-3 left-3 pointer-events-none bg-slate-900/80 backdrop-blur-xs text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                              <span>Exemple Illustratif</span>
                            </div>
                          )}

                          {/* Media Type Badge */}
                          {!proof.is_demo && (
                            <div className="absolute top-3 left-3 pointer-events-none bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                              {proof.media_type === 'VIDEO' ? <Video className="w-3 h-3 text-sky-400" /> : <Camera className="w-3 h-3 text-orange-400" />}
                              <span>{proof.media_type === 'VIDEO' ? 'Vidéo 15-30s' : 'Photo HD'}</span>
                            </div>
                          )}

                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 pointer-events-none">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Observation vérifiée</span>
                          </div>
                        </div>

                        {/* Body Content */}
                        <div className="p-5 space-y-3">
                          
                          {/* Title & Location */}
                          <div>
                            <h4 
                              onClick={() => proof.project_id && onSelectProjectById(proof.project_id)}
                              className="font-black text-base text-slate-900 line-clamp-2 hover:text-brand-blue cursor-pointer transition-colors leading-snug"
                              title="Voir la fiche détaillée du projet"
                            >
                              {proof.project_title || "Chantier public"}
                            </h4>

                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-brand-orange flex-shrink-0" />
                              <span className="font-bold text-slate-700">{proof.commune_name}</span>
                              <span>•</span>
                              <span>{formatDateFR(proof.created_at)}</span>
                            </div>
                          </div>

                          {/* Citizen Observation */}
                          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                            "{proof.comment}"
                          </p>

                          {/* Project Budget Context */}
                          {project && (
                            <div className="text-[11px] flex justify-between items-center text-slate-500 pt-1 border-t border-slate-100">
                              <span>Budget alloué :</span>
                              <span className="font-black text-slate-900">{formatFCFA(project.budget_amount_fcfa)} <span className="text-brand-blue font-bold">({formatAmountInWords(project.budget_amount_fcfa)})</span></span>
                            </div>
                          )}

                        </div>

                      </div>

                      {/* Card Footer: Confirmation Counter */}
                      <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs text-slate-600 font-semibold">
                          <span>Par <strong>{proof.user_name}</strong></span>
                        </div>

                        <button
                          onClick={() => handleConfirm(proof.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition-all cursor-pointer"
                          title="Confirmer cette observation citoyenne"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Confirmer ({proof.confirmations_count})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
