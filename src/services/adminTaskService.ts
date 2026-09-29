// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — SERVICE DE FILE DE TRAVAIL & AUDIT ADMIN
// Agrégation opérationnelle des tâches prioritaires issues des données réelles
// =========================================================================

import { AdminWorkTask, AdminActivityLog, TaskPriority, TaskStatus } from '../types/adminWorkflow';
import { dataStore } from './dataStore';

const STORAGE_KEYS = {
  TASK_OVERRIDES: 'suivibudget_admin_task_overrides_v1',
  ACTIVITY_LOGS: 'suivibudget_admin_activity_logs_v1',
};

interface TaskOverride {
  status?: TaskStatus;
  assigned_to?: string;
  assigned_to_role?: 'ADMIN' | 'MODERATOR';
  priority?: TaskPriority;
  notes?: string;
  completed_at?: string;
  completed_by?: string;
}

// Initial demo activity logs to provide rich initial traceability
const INITIAL_ACTIVITY_LOGS: AdminActivityLog[] = [
  {
    id: 'log-init-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    actor_name: 'Jean Anvoh',
    actor_email: 'admin@suivibudget.ci',
    actor_role: 'ADMIN',
    action_type: 'UPDATE_RI_CONTACT',
    entity_type: 'MAIRIE',
    entity_name: 'Mairie de Tiassalé',
    summary: 'Email officiel et téléphone du Responsable de l\'Information mis à jour.',
    details: 'Coordonnées certifiées conformes au registre officiel CAIDP.',
  },
  {
    id: 'log-init-2',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    actor_name: 'Koffi Modérateur',
    actor_email: 'moderateur@suivibudget.ci',
    actor_role: 'MODERATOR',
    action_type: 'MODERATE_PROOF',
    entity_type: 'SIGNALEMENT',
    entity_name: 'Chantier EPP Danho Paulin',
    summary: 'Signalement citoyen validé avec photo de conformité.',
    details: 'Preuve photographique vérifiée sur site à Attécoubé.',
  },
  {
    id: 'log-init-3',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    actor_name: 'Jean Anvoh',
    actor_email: 'admin@suivibudget.ci',
    actor_role: 'ADMIN',
    action_type: 'VALIDATE_DOCUMENT',
    entity_type: 'DOCUMENT',
    entity_name: 'Budget Primitif 2026 - Mairie de Cocody',
    summary: 'Document certifié officiel visé par le Conseil Municipal.',
    details: 'Montant consolidé : 19 764 660 000 FCFA.',
  }
];

class AdminTaskService {
  private taskOverrides: Record<string, TaskOverride> = {};
  private activityLogs: AdminActivityLog[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const storedOverrides = localStorage.getItem(STORAGE_KEYS.TASK_OVERRIDES);
      if (storedOverrides) {
        this.taskOverrides = JSON.parse(storedOverrides);
      }
    } catch (e) {
      console.warn('Error loading task overrides from localStorage', e);
    }

    try {
      const storedLogs = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
      if (storedLogs) {
        this.activityLogs = JSON.parse(storedLogs);
      } else {
        this.activityLogs = [...INITIAL_ACTIVITY_LOGS];
        this.saveActivityLogs();
      }
    } catch (e) {
      console.warn('Error loading activity logs from localStorage', e);
      this.activityLogs = [...INITIAL_ACTIVITY_LOGS];
    }
  }

  private saveTaskOverrides() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASK_OVERRIDES, JSON.stringify(this.taskOverrides));
    } catch (e) {
      console.warn('Error saving task overrides to localStorage', e);
    }
  }

  private saveActivityLogs() {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(this.activityLogs.slice(0, 200)));
    } catch (e) {
      console.warn('Error saving activity logs to localStorage', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  /**
   * Log an administrative activity for audit trail
   */
  public logActivity(
    actorOrEntry: string | {
      action_type?: string;
      description?: string;
      author?: string;
      author_role?: string;
      target_id?: string;
      target_type?: string;
      metadata?: any;
    },
    actorEmail?: string,
    actorRole?: string,
    actionType?: AdminActivityLog['action_type'],
    entityType?: string,
    entityName?: string,
    summary?: string,
    details?: string
  ) {
    if (typeof actorOrEntry === 'object') {
      const entry = actorOrEntry;
      const newLog: AdminActivityLog = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        actor_name: entry.author || 'Admin',
        actor_email: 'admin@suivibudget.ci',
        actor_role: (entry.author_role as any) || 'ADMIN',
        action_type: (entry.action_type as any) || 'UPDATE_RI_CONTACT',
        entity_type: entry.target_type || 'SYSTEM',
        entity_name: entry.target_id || 'Platform',
        summary: entry.description || 'Action administrative',
        details: entry.metadata ? JSON.stringify(entry.metadata) : undefined
      };
      this.activityLogs.unshift(newLog);
      this.saveActivityLogs();
      this.notify();
      return;
    }

    const newLog: AdminActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      actor_name: actorOrEntry,
      actor_email: actorEmail || 'admin@suivibudget.ci',
      actor_role: actorRole || 'ADMIN',
      action_type: actionType || 'UPDATE_RI_CONTACT',
      entity_type: entityType || 'SYSTEM',
      entity_name: entityName || 'Plateforme',
      summary: summary || 'Action administrative',
      details
    };

    this.activityLogs.unshift(newLog);
    this.saveActivityLogs();
    this.notify();
  }

  public getActivityLogs(): AdminActivityLog[] {
    return [...this.activityLogs];
  }

  /**
   * Aggregates real operational tasks from the dataStore:
   * 1. Citizen proofs awaiting moderation
   * 2. Documents awaiting validation or missing metadata
   * 3. Priority CAIDP public entities missing contacts
   * 4. CAIDP requests awaiting followup
   * 5. Key budget/project anomalies
   */
  public getWorkQueueTasks(): AdminWorkTask[] {
    const tasks: AdminWorkTask[] = [];

    // 1. SIGNALEMENTS TERRAIN (CITIZEN PROOFS)
    const pendingProofs = dataStore.getPendingProofs();
    pendingProofs.forEach(proof => {
      const isUrgent = Boolean(proof.image_url) || 
        (proof.comment && (
          proof.comment.toLowerCase().includes('retard') ||
          proof.comment.toLowerCase().includes('arrêt') ||
          proof.comment.toLowerCase().includes('bloqu') ||
          proof.comment.toLowerCase().includes('urgent')
        ));

      const taskId = `task-proof-${proof.id}`;
      const override = this.taskOverrides[taskId] || {};

      tasks.push({
        id: taskId,
        type: 'PROOF_MODERATION',
        priority: override.priority || (isUrgent ? 'URGENT' : 'NORMAL'),
        title: `Signalement citoyen : ${proof.project_title || 'Chantier local'}`,
        entity_name: proof.commune_name || 'Localité ivoirienne',
        description: proof.comment || 'Preuve citoyenne soumise nécessitant examen et modération.',
        status: override.status || 'PENDING',
        assigned_to: override.assigned_to,
        assigned_to_role: override.assigned_to_role,
        created_at: proof.created_at || new Date().toISOString(),
        completed_at: override.completed_at,
        completed_by: override.completed_by,
        target_tab: 'moderation',
        source_id: proof.id,
        metadata: {
          has_photo: Boolean(proof.image_url),
          photo_url: proof.image_url,
          author_role: 'CITOYEN',
        }
      });
    });

    // 2. DOCUMENTS PUBLICS À VÉRIFIER
    const allDocuments = dataStore.getDocuments();
    allDocuments.forEach(doc => {
      // Missing verification or uploaded documents needing validation
      const needsReview = !doc.is_official || !doc.year || !doc.file_url;
      if (needsReview) {
        const taskId = `task-doc-${doc.id}`;
        const override = this.taskOverrides[taskId] || {};

        tasks.push({
          id: taskId,
          type: 'DOCUMENT_VERIFICATION',
          priority: override.priority || 'HIGH',
          title: `Document à valider : ${doc.title}`,
          entity_name: doc.institution_name || 'Organisme public',
          description: `Catégorie : ${doc.category}. Fichier : ${doc.file_name || 'En attente de rattachement'}.`,
          status: override.status || 'PENDING',
          assigned_to: override.assigned_to,
          assigned_to_role: override.assigned_to_role,
          created_at: doc.published_at || new Date().toISOString(),
          completed_at: override.completed_at,
          completed_by: override.completed_by,
          target_tab: 'documents_manager',
          source_id: doc.id,
          metadata: {
            category: doc.category,
            file_url: doc.file_url,
            is_official: doc.is_official
          }
        });
      }
    });

    // 3. RÉPERTOIRE CAIDP — ORGANISMES INCOMPLETS PRIORITAIRES
    // Prioritize Ministères, Grandes Institutions, Conseils Régionaux, and major Mairies without email
    const caidpEntities = dataStore.getCaidpDirectory();
    const priorityIncompleteEntities = caidpEntities.filter(e => {
      const hasValidEmail = e.email && e.email !== "Pas d'email" && e.email.includes('@');
      const hasValidPhone = e.phone && e.phone !== "Pas de numéro" && e.phone.length > 5;
      const hasValidRi = e.ri_name && e.ri_name !== 'Non désigné';

      // Needs attention if missing email or RI
      const isIncomplete = !hasValidEmail || !hasValidRi;
      const isHighProfile = e.category === 'MINISTERE' || e.category === 'INSTITUTION' || e.category === 'REGION';
      return isIncomplete && (isHighProfile || !hasValidPhone);
    }).slice(0, 30); // Focus on top priority 30 to keep queue sharp and actionable

    priorityIncompleteEntities.forEach(entity => {
      const taskId = `task-caidp-${entity.id}`;
      const override = this.taskOverrides[taskId] || {};
      const isHighProfile = entity.category === 'MINISTERE' || entity.category === 'INSTITUTION' || entity.category === 'REGION';

      tasks.push({
        id: taskId,
        type: 'CAIDP_CONTACT_COMPLETION',
        priority: override.priority || (isHighProfile ? 'HIGH' : 'NORMAL'),
        title: `Contact RI incomplet : ${entity.company_name}`,
        entity_name: entity.company_name,
        entity_id: entity.id,
        description: `Responsable : ${entity.ri_name || 'Non désigné'} • Email : ${entity.email || 'Manquant'}.`,
        status: override.status || 'PENDING',
        assigned_to: override.assigned_to,
        assigned_to_role: override.assigned_to_role,
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        completed_at: override.completed_at,
        completed_by: override.completed_by,
        target_tab: 'caidp_manager',
        target_filter: { search: entity.company_name },
        source_id: entity.id,
        metadata: {
          category: entity.category,
          region: entity.region,
          ri_name: entity.ri_name
        }
      });
    });

    // 4. DEMANDES CAIDP RÉCENTES
    const caidpStats = dataStore.getCaidpRequestStats();
    (caidpStats.recentEvents || []).slice(0, 8).forEach(event => {
      const taskId = `task-caidp-req-${event.id}`;
      const override = this.taskOverrides[taskId] || {};

      tasks.push({
        id: taskId,
        type: 'CAIDP_REQUEST_FOLLOWUP',
        priority: override.priority || 'NORMAL',
        title: `Suivi demande CAIDP : ${event.entity_name}`,
        entity_name: event.entity_name,
        description: `Action : ${event.action_type === 'EMAIL_SENT' ? 'Courriel expédié' : 'Dossier imprimé/téléchargé'} (${(event.document_titles || []).join(', ') || 'Documents publics'}).`,
        status: override.status || 'PENDING',
        assigned_to: override.assigned_to,
        assigned_to_role: override.assigned_to_role,
        created_at: event.created_at || new Date().toISOString(),
        completed_at: override.completed_at,
        completed_by: override.completed_by,
        target_tab: 'caidp_analytics',
        source_id: event.id,
        metadata: {
          action_type: event.action_type,
          has_ri: event.has_ri
        }
      });
    });

    // Sort by priority and creation date
    const priorityWeight: Record<TaskPriority, number> = {
      URGENT: 4,
      HIGH: 3,
      NORMAL: 2,
      LOW: 1
    };

    return tasks.sort((a, b) => {
      // Pending first, then completed
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
      
      const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  /**
   * Update task state (mark completed, in progress, on hold, change priority)
   */
  public updateTask(taskId: string, updates: TaskOverride) {
    this.taskOverrides[taskId] = {
      ...(this.taskOverrides[taskId] || {}),
      ...updates
    };
    this.saveTaskOverrides();
    this.notify();
  }

  /**
   * Assign task to a user
   */
  public assignTask(taskId: string, assignedTo: string, assignedRole: 'ADMIN' | 'MODERATOR' = 'MODERATOR') {
    this.updateTask(taskId, {
      assigned_to: assignedTo,
      assigned_to_role: assignedRole,
      status: 'IN_PROGRESS'
    });
  }

  /**
   * Bulk assign tasks
   */
  public bulkAssignTasks(taskIds: string[], assignedTo: string, assignedRole: 'ADMIN' | 'MODERATOR' = 'MODERATOR') {
    taskIds.forEach(id => {
      this.taskOverrides[id] = {
        ...(this.taskOverrides[id] || {}),
        assigned_to: assignedTo,
        assigned_to_role: assignedRole,
        status: 'IN_PROGRESS'
      };
    });
    this.saveTaskOverrides();
    this.notify();
  }

  /**
   * Bulk status change
   */
  public bulkUpdateStatus(taskIds: string[], status: TaskStatus) {
    taskIds.forEach(id => {
      this.taskOverrides[id] = {
        ...(this.taskOverrides[id] || {}),
        status,
        ...(status === 'COMPLETED' ? { completed_at: new Date().toISOString() } : {})
      };
    });
    this.saveTaskOverrides();
    this.notify();
  }

  /**
   * Calculate action KPIs for the top banner cards
   */
  public getActionKpis() {
    const pendingProofsCount = dataStore.getPendingProofs().length;
    const documents = dataStore.getDocuments();
    const unverifiedDocsCount = documents.filter(d => !d.is_official || !d.file_url).length;
    
    const caidpEntities = dataStore.getCaidpDirectory();
    const incompleteRiCount = caidpEntities.filter(e => 
      !e.email || e.email === "Pas d'email" || !e.email.includes('@') || e.ri_name === 'Non désigné'
    ).length;

    const caidpRequests = dataStore.getCaidpRequestStats();
    const pendingCaidpCount = caidpRequests.totalRequests;

    // Anomalies on budget projects
    const allProjects = dataStore.getProjects();
    const anomaliesCount = allProjects.filter(p => 
      p.budget_amount_fcfa <= 0 || 
      (p.progress_percentage === 0 && p.current_status === 'COMPLETED') ||
      !p.commune_name
    ).length;

    return {
      pendingProofsCount,
      unverifiedDocsCount,
      incompleteRiCount,
      pendingCaidpCount,
      anomaliesCount
    };
  }

  public getOperationalKpis() {
    const kpis = this.getActionKpis();
    const tasks = this.getWorkQueueTasks();
    const urgentCount = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length;
    const totalActionableTasks = tasks.filter(t => t.status !== 'COMPLETED').length;
    return {
      ...kpis,
      urgentCount,
      totalActionableTasks,
    };
  }
}

export const adminTaskService = new AdminTaskService();
