// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — COMPOSANT FILE DE TRAVAIL UNIFIÉE (WORK QUEUE)
// Agrémente et priorise l'ensemble des tâches opérationnelles de l'équipe
// =========================================================================

import React, { useState, useMemo } from 'react';
import { 
  AdminWorkTask, 
  TaskPriority, 
  TaskStatus, 
  TaskType 
} from '../../types/adminWorkflow';
import { adminTaskService } from '../../services/adminTaskService';
import { AuthSecurityService, ModeratorUser } from '../../services/authSecurity';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Camera, 
  FileText, 
  Building2, 
  Mail, 
  UserCheck, 
  UserPlus, 
  Filter, 
  Search, 
  Check, 
  X, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Inbox,
  User,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '../../types';
import { formatDateFR } from '../../utils/formatters';

interface AdminWorkQueueProps {
  currentUserEmail: string;
  currentUserName: string;
  currentUserRole: UserRole;
  onNavigateToTab: (tabId: string, filter?: Record<string, string>) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminWorkQueue: React.FC<AdminWorkQueueProps> = ({
  currentUserEmail,
  currentUserName,
  currentUserRole,
  onNavigateToTab,
  onShowToast,
}) => {
  const [tasks, setTasks] = useState<AdminWorkTask[]>(() => adminTaskService.getWorkQueueTasks());
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MY_TASKS' | 'UNASSIGNED' | 'URGENT' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Multi-selection state for bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Assign modal / popover state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [moderatorsList, setModeratorsList] = useState<ModeratorUser[]>([]);

  // Refresh tasks on service update
  React.useEffect(() => {
    return adminTaskService.subscribe(() => {
      setTasks(adminTaskService.getWorkQueueTasks());
    });
  }, []);

  React.useEffect(() => {
    setModeratorsList(AuthSecurityService.getModerators());
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (activeFilter === 'MY_TASKS') {
        const isAssignedToMe = task.assigned_to === currentUserEmail || task.assigned_to === currentUserName;
        if (!isAssignedToMe) return false;
      } else if (activeFilter === 'UNASSIGNED') {
        if (task.assigned_to && task.assigned_to.trim().length > 0) return false;
        if (task.status === 'COMPLETED') return false;
      } else if (activeFilter === 'URGENT') {
        if (task.priority !== 'URGENT' && task.priority !== 'HIGH') return false;
        if (task.status === 'COMPLETED') return false;
      } else if (activeFilter === 'COMPLETED') {
        if (task.status !== 'COMPLETED') return false;
      } else if (activeFilter === 'ALL') {
        // By default show pending/in_progress first, completed only if searched
        if (task.status === 'COMPLETED' && !searchQuery) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && task.type !== typeFilter) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesEntity = task.entity_name.toLowerCase().includes(q);
        const matchesDesc = task.description.toLowerCase().includes(q);
        const matchesAssignee = (task.assigned_to || '').toLowerCase().includes(q);
        return matchesTitle || matchesEntity || matchesDesc || matchesAssignee;
      }

      return true;
    });
  }, [tasks, activeFilter, typeFilter, searchQuery, currentUserEmail, currentUserName]);

  // Priority badge config
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            Élevée
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            Normale
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200">
            Basse
          </span>
        );
    }
  };

  // Type badge and icon
  const getTypeBadge = (type: TaskType) => {
    switch (type) {
      case 'PROOF_MODERATION':
        return {
          icon: <Camera className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Signalement',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'DOCUMENT_VERIFICATION':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-purple-600" />,
          label: 'Document',
          bg: 'bg-purple-50 text-purple-800 border-purple-200'
        };
      case 'CAIDP_CONTACT_COMPLETION':
        return {
          icon: <Building2 className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Contact RI',
          bg: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'CAIDP_REQUEST_FOLLOWUP':
        return {
          icon: <Mail className="w-3.5 h-3.5 text-sky-600" />,
          label: 'Demande CAIDP',
          bg: 'bg-sky-50 text-sky-800 border-sky-200'
        };
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />,
          label: 'Contrôle',
          bg: 'bg-slate-50 text-slate-800 border-slate-200'
        };
    }
  };

  // Actions
  const handleAssignToMe = (taskId: string) => {
    adminTaskService.assignTask(taskId, currentUserName, currentUserRole === 'ADMIN' ? 'ADMIN' : 'MODERATOR');
    adminTaskService.logActivity(
      currentUserName,
      currentUserEmail,
      currentUserRole,
      'ASSIGN_TASK',
      'TÂCHE',
      taskId,
      `Tâche prise en charge par ${currentUserName}.`
    );
    onShowToast(`Tâche prise en charge par ${currentUserName}.`, 'success');
  };

  const handleMarkCompleted = (taskId: string) => {
    adminTaskService.updateTask(taskId, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      completed_by: currentUserName
    });
    adminTaskService.logActivity(
      currentUserName,
      currentUserEmail,
      currentUserRole,
      'COMPLETE_TASK',
      'TÂCHE',
      taskId,
      `Tâche marquée comme terminée par ${currentUserName}.`
    );
    onShowToast('Tâche marquée comme terminée.', 'success');
  };

  const handleBulkComplete = () => {
    adminTaskService.bulkUpdateStatus(selectedTaskIds, 'COMPLETED');
    adminTaskService.logActivity(
      currentUserName,
      currentUserEmail,
      currentUserRole,
      'COMPLETE_TASK',
      'TÂCHES',
      `${selectedTaskIds.length} éléments`,
      `${selectedTaskIds.length} tâches marquées comme terminées en lot.`
    );
    onShowToast(`${selectedTaskIds.length} tâches terminées avec succès.`, 'success');
    setSelectedTaskIds([]);
  };

  const handleBulkAssign = (assignee: string) => {
    adminTaskService.bulkAssignTasks(selectedTaskIds, assignee);
    adminTaskService.logActivity(
      currentUserName,
      currentUserEmail,
      currentUserRole,
      'ASSIGN_TASK',
      'TÂCHES',
      `${selectedTaskIds.length} éléments`,
      `Assignation groupée à ${assignee}.`
    );
    onShowToast(`${selectedTaskIds.length} tâches assignées à ${assignee}.`, 'success');
    setSelectedTaskIds([]);
    setIsAssignModalOpen(false);
  };

  const handleExecuteTask = (task: AdminWorkTask) => {
    onNavigateToTab(task.target_tab, task.target_filter);
  };

  // Toggle select all
  const isAllSelected = filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
      
      {/* 1. Header with View Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-pulse" />
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              File de Travail Opérationnelle
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
              {filteredTasks.length} {filteredTasks.length <= 1 ? 'tâche' : 'tâches'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Centre d'action unifié : traitez vos signalements, validations documentaires et complétions de données.
          </p>
        </div>

        {/* Tab Filters (Tous, Mes tâches, Non assignés, Urgents, Terminés) */}
        <div className="flex items-center gap-1.5 flex-wrap bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            Toutes ({tasks.filter(t => t.status !== 'COMPLETED').length})
          </button>

          <button
            onClick={() => setActiveFilter('MY_TASKS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'MY_TASKS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Mes tâches</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-brand-orange text-white">
              {tasks.filter(t => (t.assigned_to === currentUserEmail || t.assigned_to === currentUserName) && t.status !== 'COMPLETED').length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('UNASSIGNED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'UNASSIGNED'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            Non assignées ({tasks.filter(t => (!t.assigned_to || t.assigned_to.trim() === '') && t.status !== 'COMPLETED').length})
          </button>

          <button
            onClick={() => setActiveFilter('URGENT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'URGENT'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-100/70'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-500" />
            <span>Urgentes ({tasks.filter(t => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'COMPLETED').length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'COMPLETED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-100/70'
            }`}
          >
            Terminées ({tasks.filter(t => t.status === 'COMPLETED').length})
          </button>
        </div>
      </div>

      {/* 2. Search & Secondary Type Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par objet, organisme, commune ou assigné..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-blue"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-blue"
          >
            <option value="ALL">Tous types d'éléments</option>
            <option value="PROOF_MODERATION">Signalements terrain</option>
            <option value="DOCUMENT_VERIFICATION">Documents à valider</option>
            <option value="CAIDP_CONTACT_COMPLETION">Contacts RI à compléter</option>
            <option value="CAIDP_REQUEST_FOLLOWUP">Demandes CAIDP</option>
          </select>
        </div>
      </div>

      {/* 3. Bulk Actions Toolbar (Visible when rows selected) */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-orange" />
            <span className="text-xs font-black">
              {selectedTaskIds.length} {selectedTaskIds.length <= 1 ? 'tâche sélectionnée' : 'tâches sélectionnées'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <UserPlus className="w-3.5 h-3.5 text-sky-400" />
              <span>Assigner</span>
            </button>

            <button
              onClick={handleBulkComplete}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marquer terminées</span>
            </button>

            <button
              onClick={() => setSelectedTaskIds([])}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-bold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* 4. Table view of tasks (Desktop) & Cards (Mobile) */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200/80 p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-800">
            Aucune tâche en attente dans cette vue
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeFilter === 'MY_TASKS' 
              ? "Vous n'avez aucune tâche assignée en cours. Vous pouvez prendre en charge des tâches non assignées."
              : "Toutes les opérations de cette file ont été traitées ou aucun résultat ne correspond aux filtres."}
          </p>
          {(activeFilter !== 'ALL' || searchQuery || typeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setActiveFilter('ALL');
                setSearchQuery('');
                setTypeFilter('ALL');
              }}
              className="px-3.5 py-1.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition-colors cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-200 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                  </th>
                  <th className="py-3 px-3">Priorité</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Élément / Objet</th>
                  <th className="py-3 px-3">Organisme / Localité</th>
                  <th className="py-3 px-3">Assigné à</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-right">Action immédiate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTasks.map(task => {
                  const typeInfo = getTypeBadge(task.type);
                  const isSelected = selectedTaskIds.includes(task.id);
                  const isAssignedToMe = task.assigned_to === currentUserEmail || task.assigned_to === currentUserName;

                  return (
                    <tr 
                      key={task.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/50' : ''} ${task.status === 'COMPLETED' ? 'opacity-60 bg-slate-50/40' : ''}`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTask(task.id)}
                          className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                        />
                      </td>

                      {/* Priorité */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getPriorityBadge(task.priority)}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.bg}`}>
                          {typeInfo.icon}
                          <span>{typeInfo.label}</span>
                        </span>
                      </td>

                      {/* Élément / Titre */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={task.title}>
                          {task.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1" title={task.description}>
                          {task.description}
                        </div>
                      </td>

                      {/* Organisme / Commune */}
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-800">
                        {task.entity_name}
                      </td>

                      {/* Assigné à */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {task.assigned_to ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAssignedToMe ? 'bg-amber-100 text-amber-900 border border-amber-200 font-black' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <UserCheck className="w-3 h-3 text-slate-500" />
                            <span>{isAssignedToMe ? 'Moi' : task.assigned_to}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAssignToMe(task.id)}
                            className="text-[10px] font-bold text-brand-blue hover:underline cursor-pointer flex items-center gap-1"
                            title="Prendre en charge cette tâche"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Prendre</span>
                          </button>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {task.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Terminé
                          </span>
                        ) : task.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> En cours
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            À faire
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {task.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleMarkCompleted(task.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Marquer comme terminée"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleExecuteTask(task)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-brand-blue text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer group"
                            title="Ouvrir le module et traiter l'élément"
                          >
                            <span>Traiter</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-black text-slate-900">
                Assigner {selectedTaskIds.length} tâches
              </h4>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Sélectionner le modérateur responsable :
              </label>
              
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                <button
                  onClick={() => setSelectedAssignee(currentUserName)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                    selectedAssignee === currentUserName ? 'bg-blue-50 border-brand-blue text-brand-blue' : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>M'assigner ces tâches ({currentUserName})</span>
                  </div>
                  {selectedAssignee === currentUserName && <Check className="w-4 h-4 text-brand-blue" />}
                </button>

                {moderatorsList.map(mod => (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedAssignee(mod.full_name)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                      selectedAssignee === mod.full_name ? 'bg-blue-50 border-brand-blue text-brand-blue' : 'hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{mod.full_name} ({mod.role})</span>
                    </div>
                    {selectedAssignee === mod.full_name && <Check className="w-4 h-4 text-brand-blue" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                disabled={!selectedAssignee}
                onClick={() => handleBulkAssign(selectedAssignee)}
                className="px-4 py-2 bg-brand-blue disabled:opacity-50 text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition-colors shadow-xs"
              >
                Confirmer l'assignation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
