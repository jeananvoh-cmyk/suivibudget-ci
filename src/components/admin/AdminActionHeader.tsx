// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — ZONE D'ACTIONS OPÉRATIONNELLES « À TRAITER »
// Cartes d'action immédiates 100% interactives filtrant directement les modules
// =========================================================================

import React from 'react';
import { 
  Camera, 
  FileText, 
  Building2, 
  MailCheck, 
  AlertTriangle, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  ListTodo
} from 'lucide-react';
import { adminTaskService } from '../../services/adminTaskService';
import { UserRole } from '../../types';

interface AdminActionHeaderProps {
  userRole: UserRole;
  userName: string;
  onNavigateToTab: (tabId: string, filter?: Record<string, string>) => void;
  onOpenWorkQueue: () => void;
  urgentTasksCount: number;
}

export const AdminActionHeader: React.FC<AdminActionHeaderProps> = ({
  userRole,
  userName,
  onNavigateToTab,
  onOpenWorkQueue,
  urgentTasksCount,
}) => {
  const kpis = adminTaskService.getActionKpis();
  const firstName = userName ? userName.split(' ')[0] : 'Collègue';

  if (userRole === 'MODERATOR') {
    return (
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Bonjour {firstName},
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Voici votre espace de travail opérationnel et vos priorités du jour.
            </p>
          </div>

          <button
            onClick={onOpenWorkQueue}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-orange hover:bg-orange-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer self-start sm:self-auto"
          >
            <ListTodo className="w-4 h-4" />
            <span>Ouvrir Ma File de Travail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Cards for Moderator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateToTab('moderation', { status: 'PENDING' })}
            className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-emerald-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                Action
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-emerald-400 transition-colors">
              {kpis.pendingProofsCount}
            </div>
            <div className="text-xs font-bold text-slate-300">
              Signalements à modérer
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium group-hover:translate-x-1 transition-transform">
              <span>Examiner</span> →
            </div>
          </button>

          <button
            onClick={() => onNavigateToTab('documents_manager', { filter: 'unverified' })}
            className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-purple-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/60">
                Contrôle
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-purple-400 transition-colors">
              {kpis.unverifiedDocsCount}
            </div>
            <div className="text-xs font-bold text-slate-300">
              Documents à vérifier
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium group-hover:translate-x-1 transition-transform">
              <span>Valider</span> →
            </div>
          </button>

          <button
            onClick={() => onNavigateToTab('caidp_manager', { filter: 'WITHOUT_EMAIL' })}
            className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-amber-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60">
                Complétion
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-amber-400 transition-colors">
              {kpis.incompleteRiCount}
            </div>
            <div className="text-xs font-bold text-slate-300">
              Organismes à compléter
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium group-hover:translate-x-1 transition-transform">
              <span>Renseigner</span> →
            </div>
          </button>

          <button
            onClick={onOpenWorkQueue}
            className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-brand-orange/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Flame className="w-4 h-4 text-brand-orange" />
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange bg-orange-950/60 px-2 py-0.5 rounded-full border border-orange-800/60">
                Priorité
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-brand-orange transition-colors">
              {urgentTasksCount}
            </div>
            <div className="text-xs font-bold text-slate-300">
              Tâches urgentes
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium group-hover:translate-x-1 transition-transform">
              <span>Traiter</span> →
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Super Admin view
  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Bonjour {firstName},
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Voici les éléments opérationnels qui nécessitent votre attention aujourd'hui.
          </p>
        </div>

        <button
          onClick={onOpenWorkQueue}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-orange hover:bg-orange-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer self-start sm:self-auto"
        >
          <ListTodo className="w-4 h-4" />
          <span>Ouvrir la File de Travail Globale</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Cards (5 clickable direct targets) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* 1. Signalements */}
        <button
          onClick={() => onNavigateToTab('moderation', { status: 'PENDING' })}
          className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-emerald-500/50 transition-all text-left group cursor-pointer shadow-sm"
          title="Ouvrir la modération terrain filtrée sur les signalements en attente"
        >
          <div className="flex items-center justify-between">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
              Terrain
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-emerald-400 transition-colors">
            {kpis.pendingProofsCount}
          </div>
          <div className="text-xs font-bold text-slate-200">
            Signalements
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
            À modérer →
          </div>
        </button>

        {/* 2. Documents */}
        <button
          onClick={() => onNavigateToTab('documents_manager', { filter: 'unverified' })}
          className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-purple-500/50 transition-all text-left group cursor-pointer shadow-sm"
          title="Ouvrir les documents publics nécessitant contrôle ou validation"
        >
          <div className="flex items-center justify-between">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/50">
              Contrôle
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-purple-400 transition-colors">
            {kpis.unverifiedDocsCount}
          </div>
          <div className="text-xs font-bold text-slate-200">
            Documents
          </div>
          <div className="text-[10px] text-purple-400 font-semibold mt-0.5">
            À vérifier →
          </div>
        </button>

        {/* 3. Organismes CAIDP */}
        <button
          onClick={() => onNavigateToTab('caidp_manager', { filter: 'WITHOUT_EMAIL' })}
          className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-amber-500/50 transition-all text-left group cursor-pointer shadow-sm"
          title="Ouvrir le Répertoire CAIDP filtré sur les organismes sans email"
        >
          <div className="flex items-center justify-between">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/50">
              Données
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-amber-400 transition-colors">
            {kpis.incompleteRiCount}
          </div>
          <div className="text-xs font-bold text-slate-200">
            Organismes
          </div>
          <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
            À compléter →
          </div>
        </button>

        {/* 4. Demandes CAIDP */}
        <button
          onClick={() => onNavigateToTab('caidp_analytics')}
          className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-sky-500/50 transition-all text-left group cursor-pointer shadow-sm"
          title="Ouvrir le suivi des demandes CAIDP citoyennes"
        >
          <div className="flex items-center justify-between">
            <MailCheck className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-black uppercase text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-800/50">
              Accès
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-sky-400 transition-colors">
            {kpis.pendingCaidpCount}
          </div>
          <div className="text-xs font-bold text-slate-200">
            Demandes CAIDP
          </div>
          <div className="text-[10px] text-sky-400 font-semibold mt-0.5">
            En suivi / relance →
          </div>
        </button>

        {/* 5. Anomalies */}
        <button
          onClick={() => onNavigateToTab('budget_table', { filter: 'anomaly' })}
          className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-rose-500/50 transition-all text-left group cursor-pointer shadow-sm col-span-2 sm:col-span-1"
          title="Ouvrir les anomalies budgétaires et chantiers sans montant ou en retard"
        >
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/50">
              Audit
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2 group-hover:text-rose-400 transition-colors">
            {kpis.anomaliesCount}
          </div>
          <div className="text-xs font-bold text-slate-200">
            Anomalies
          </div>
          <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
            À examiner →
          </div>
        </button>

      </div>
    </div>
  );
};
