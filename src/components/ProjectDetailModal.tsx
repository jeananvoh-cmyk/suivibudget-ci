import React, { useState } from 'react';
import { BudgetProject, CitizenProof } from '../types';
import { formatFCFA, formatAmountInWords, formatDateFR, getStatusConfig, getProjectEntityInfo, getProjectTypeActionInfo } from '../utils/formatters';
import { 
  X, 
  MapPin, 
  Building, 
  Calendar, 
  Briefcase, 
  Camera, 
  Video, 
  Share2, 
  Clock, 
  ShieldCheck,
  AlertCircle,
  FileText,
  Printer,
  Scale,
  MessageCircle,
  CheckCircle2,
  Play,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { dataStore } from '../services/dataStore';

interface ProjectDetailModalProps {
  project: BudgetProject | null;
  onClose: () => void;
  onOpenSendProof: (project: BudgetProject) => void;
  onOpenShare: (project: BudgetProject) => void;
  onOpenDocRequest: (project: BudgetProject) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  onOpenSendProof,
  onOpenShare,
  onOpenDocRequest,
}) => {
  if (!project) return null;

  // 2-Tab Navigation: 'budget' (Données & Budget) | 'proofs' (Constats & Vidéos Citoyennes)
  const [activeTab, setActiveTab] = useState<'budget' | 'proofs'>('budget');

  const proofs = dataStore.getProofsForProject(project.id);
  const verifiedProofs = proofs.filter(p => p.verification_status === 'APPROVED');
  const entityInfo = getProjectEntityInfo(project.commune_name, project.region_name, project.ministry_name);
  const actionInfo = getProjectTypeActionInfo(project.title, project.category, project.scope_level);
  
  const hasSpecificNeighborhood = !!project.locality_village_neighborhood && 
    !project.title.toLowerCase().includes(project.locality_village_neighborhood.toLowerCase());
  
  const isDetailsRedundant = !project.details || 
    project.details.trim().toLowerCase() === project.title.trim().toLowerCase() ||
    project.details.trim().length < 5;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      ` *SUIVI CITOYEN - ${actionInfo.shareCategoryLabel}*\n\n` +
      ` *Intitulé :* ${project.title}\n` +
      ` *Budget Alloué :* ${formatFCFA(project.budget_amount_fcfa)} (${formatAmountInWords(project.budget_amount_fcfa)} FCFA)\n` +
      `*Autorité Responsable :* ${entityInfo.entityName}\n` +
      `*Localisation :* ${project.region_name || project.commune_name}\n\n` +
      `Citoyens et riverains, suivez la réalisation effective sur la plateforme citoyenne : ${window.location.origin}/projets?project=${encodeURIComponent(project.id)}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex items-start justify-between gap-4 print:border-b-2 print:border-slate-900">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${entityInfo.entityBadgeClass}`}>
                <Building className="w-3.5 h-3.5" />
                <span>{entityInfo.entityName}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                Exercice {project.fiscal_year || 2026}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {project.title}
            </h2>

            {/* Sub-location */}
            {hasSpecificNeighborhood && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 mt-2">
                <MapPin className="w-4 h-4 text-brand-orange flex-shrink-0" />
                <span className="font-semibold text-slate-800">{project.locality_village_neighborhood}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              title="Imprimer / Exporter la fiche officielle"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              title="Fermer la fenêtre"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2-TAB SWITCHER: DONNÉES & BUDGET vs CONSTATS & VIDÉOS TERRAIN             */}
        {/* ========================================================================= */}
        <div className="px-6 pt-4 bg-slate-50/70 border-b border-slate-200 flex items-center gap-2 print:hidden">
          
          <button
            onClick={() => setActiveTab('budget')}
            className={`pb-3 px-4 font-black text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'budget'
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fiche & Budget Officiel</span>
          </button>

          <button
            onClick={() => setActiveTab('proofs')}
            className={`pb-3 px-4 font-black text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'proofs'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Suivi Terrain & Vidéos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              proofs.length > 0
                ? 'bg-brand-orange text-white'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {proofs.length}
            </span>
          </button>

        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* ===================================================================== */}
          {/* ONGLET 1 : FICHE & BUDGET OFFICIEL                                     */}
          {/* ===================================================================== */}
          {activeTab === 'budget' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* BUDGET & STATUS HIGHLIGHT BOX */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Box 1: Budget Voté */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
                      Budget Public Alloué
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      {formatFCFA(project.budget_amount_fcfa)}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
                      ({formatAmountInWords(project.budget_amount_fcfa)} FCFA)
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span>Source officielle</span>
                    <span className="font-bold text-slate-800">{project.source || 'Loi de Finances 2026 (DGBF)'}</span>
                  </div>
                </div>

                {/* Box 2: Statut Terrain */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
                        Statut du Projet
                      </span>
                      
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span>Voté au Budget</span>
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                        <span>Constat citoyen terrain</span>
                        {proofs.length > 0 ? (
                          <button
                            onClick={() => setActiveTab('proofs')}
                            className="text-brand-orange hover:underline font-black"
                          >
                            {proofs.length} constat(s) disponible(s) →
                          </button>
                        ) : (
                          <span className="text-slate-400">En attente de photo/vidéo</span>
                        )}
                      </div>
                      
                      {proofs.length > 0 ? (
                        <div 
                          onClick={() => setActiveTab('proofs')}
                          className="p-3 bg-white rounded-xl border border-brand-orange/30 cursor-pointer hover:bg-orange-50/50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{proofs[0].citizen_status_claim === 'COMPLETED' ? 'Terminé sur le terrain' : proofs[0].citizen_status_claim === 'IN_PROGRESS' ? 'En cours d\'exécution' : 'Non démarré'}</span>
                          </div>
                          <span className="text-xs font-bold text-brand-orange">Voir les médias ➔</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-100/70 rounded-xl text-xs text-slate-500 italic">
                          Aucun constat photo/vidéo validé pour l'instant.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span>Nature de la dépense</span>
                    <span className="font-bold text-slate-800">{project.nature_expense || 'Investissements'}</span>
                  </div>
                </div>

              </div>

              {/* ADMINISTRATIVE DETAILS & ATTRIBUTION */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Détails & Attribution Administrative
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2.5">
                    <Briefcase className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">Attribution & Marché</span>
                      <span className="font-bold text-slate-900">
                        {project.contractor_name && !project.contractor_name.includes('Bailleurs')
                          ? project.contractor_name
                          : "Marché public / Appel d'offres ouvert"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Building className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">Tutelle Administrative</span>
                      <span className="font-bold text-slate-900">
                        {project.ministry_name || entityInfo.entityName}
                      </span>
                    </div>
                  </div>

                  {!isDetailsRedundant && (
                    <div className="flex items-start gap-2.5 sm:col-span-2">
                      <FileText className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-slate-500 block">Programme & Spécifications</span>
                        <span className="text-xs font-medium text-slate-700">
                          {project.details}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TABLEAU DE BORD D'ACTIONS CITOYENNES */}
              <div className="print:hidden bg-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-md">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-orange text-white mb-1.5">
                    {actionInfo.badge}
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white">
                    {actionInfo.heading}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    {actionInfo.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  
                  {/* Action 1: Photo / Vidéo */}
                  <button
                    onClick={() => onOpenSendProof(project)}
                    className="py-3 px-4 bg-brand-orange hover:bg-brand-orange-dark active:scale-98 text-white rounded-2xl text-xs font-black shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Envoyer photo / vidéo</span>
                  </button>

                  {/* Action 2: Demande CAIDP */}
                  <button
                    onClick={() => onOpenDocRequest(project)}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white border border-slate-700 rounded-2xl text-xs font-black shadow-sm flex items-center justify-center gap-2 transition-all"
                    title="Demander les documents officiels du marché (Délai légal CAIDP : 30 jours)"
                  >
                    <Scale className="w-4 h-4 text-brand-orange" />
                    <span>Demander les pièces (CAIDP)</span>
                  </button>

                  {/* Action 3: WhatsApp Share */}
                  <button
                    onClick={handleWhatsAppShare}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs font-black shadow-sm flex items-center justify-center gap-2 transition-all"
                    title="Partager cette fiche sur WhatsApp"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#25D366" d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.95.56 3.77 1.53 5.31L2.2 21.8a.5.5 0 0 0 .61.61l4.57-1.34a9.96 9.96 0 0 0 4.62 1.14c5.52 0 10-4.48 10-10.004C22.004 6.48 17.524 2 12.004 2z"/>
                      <path fill="#FFFFFF" d="M17.47 14.38c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78 1-.95 1.2-.18.2-.35.23-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.68-2.09-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.63-.92-2.23-.25-.6-.5-.51-.68-.52h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35z"/>
                    </svg>
                    <span>Partager sur WhatsApp</span>
                  </button>

                </div>
              </div>

            </div>
          )}

          {/* ===================================================================== */}
          {/* ONGLET 2 : CONSTATS, PHOTOS & VIDÉOS CITOYENNES                        */}
          {/* ===================================================================== */}
          {activeTab === 'proofs' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-brand-orange" />
                    <span>Constats et Preuves Multimédias ({proofs.length})</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Photographies et courtes vidéos (15-30s) vérifiées et publiées par les riverains
                  </p>
                </div>

                <button
                  onClick={() => onOpenSendProof(project)}
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Ajouter un constat</span>
                </button>
              </div>

              {proofs.length === 0 ? (
                /* Clean Empty State */
                <div className="text-center py-12 px-6 bg-slate-50/70 rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 text-brand-orange flex items-center justify-center mx-auto shadow-2xs">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-sm font-black text-slate-900">
                      Aucun constat citoyen pour ce chantier
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Vous êtes dans la commune ou à proximité du site ? Filmez ou photographiez l'état actuel des travaux pour informer la communauté !
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenSendProof(project)}
                    className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-full text-xs font-bold shadow-sm transition-all inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Déposer la première photo / vidéo</span>
                  </button>
                </div>
              ) : (
                /* Grid of Photos & Videos */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {proofs.map((proof) => {
                    const isVideo = proof.media_type === 'VIDEO' || Boolean(proof.video_url);

                    return (
                      <div key={proof.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between">
                        <div>
                          
                          {/* Media Header (Video player or Photo) */}
                          <div className="h-48 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                            {isVideo && proof.video_url ? (
                              <video
                                src={proof.video_url}
                                controls
                                className="w-full h-full object-cover bg-black"
                              />
                            ) : (
                              <img
                                src={proof.image_url || (proof as any).photo_url}
                                alt="Preuve terrain"
                                className="w-full h-full object-cover"
                              />
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-2.5 left-2.5 pointer-events-none">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                proof.citizen_status_claim === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                                proof.citizen_status_claim === 'IN_PROGRESS' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                              }`}>
                                {proof.citizen_status_claim === 'COMPLETED' ? 'Terminé' :
                                 proof.citizen_status_claim === 'IN_PROGRESS' ? 'En chantier' : 'Non démarré'}
                              </span>
                            </div>

                            {/* Media Type Tag */}
                            <div className="absolute top-2.5 right-2.5 pointer-events-none bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                              {isVideo ? <Video className="w-3 h-3 text-sky-400" /> : <Camera className="w-3 h-3 text-orange-400" />}
                              <span>{isVideo ? 'Vidéo 15-30s' : 'Photo HD'}</span>
                            </div>

                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white rounded text-[10px] font-semibold pointer-events-none">
                              {formatDateFR(proof.created_at)}
                            </div>
                          </div>

                          {/* Body details */}
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="font-bold text-slate-800">
                                {proof.citizen_name || 'Citoyen Observateur'}
                              </span>
                              {proof.verification_status === 'APPROVED' && (
                                <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  Vérifié
                                </span>
                              )}
                            </div>
                            
                            <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 italic leading-relaxed">
                              "{proof.comment}"
                            </p>
                          </div>

                        </div>

                        {/* Card Footer: Locality */}
                        {proof.locality_details && (
                          <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-[11px] text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-brand-orange flex-shrink-0" />
                            <span className="truncate">{proof.locality_details}</span>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-[11px] text-slate-400 font-mono">
            Réf : {project.id}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
