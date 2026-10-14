// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — SERVICE DE FILE DE TRAVAIL & AUDIT ADMIN
// Agrégation opérationnelle des tâches prioritaires issues des données réelles
// =========================================================================

import { AdminWorkTask, AdminActivityLog, TaskPriority, TaskStatus } from '../types/adminWorkflow';
import { dataStore } from './dataStore';

import { mutateAdminBatch, readAdminRows, requireAdminPersistence, type AdminMutation } from './adminPersistenceService';
import { supabase } from './supabase';

interface TaskOverride {
  status?: TaskStatus;
  assigned_to?: string;
  assigned_to_role?: 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER';
  priority?: TaskPriority;
  notes?: string;
  completed_at?: string;
  completed_by?: string;
  revision?: number;
}

class AdminTaskService {
  private taskOverrides: Record<string, TaskOverride> = {};
  private persistedTasks: AdminWorkTask[] = [];
  private activityLogs: AdminActivityLog[] = [];
  private listeners: (() => void)[] = [];
  private refreshGeneration=0;

  public async refresh(): Promise<void> {
    const generation=++this.refreshGeneration;
    const auth=dataStore.getAuth();
    await requireAdminPersistence();
    const [tasks,logs] = await Promise.all([readAdminRows('admin_tasks'),
      supabase.from('admin_audit_events').select('*').order('occurred_at',{ascending:false}).limit(200)]);
    if(logs.error) throw logs.error;
    if(generation!==this.refreshGeneration || !dataStore.getAuth().isAuthenticated || dataStore.getAuth().email!==auth.email) return;
    this.persistedTasks=tasks as unknown as AdminWorkTask[];
    this.taskOverrides=Object.fromEntries(this.persistedTasks.map(task=>[task.id,task]));
    this.activityLogs=(logs.data || []).map(event=>({id:event.id,timestamp:event.occurred_at,
      actor_name:event.actor_id,actor_email:'',actor_role:event.actor_role,action_type:event.action,
      entity_type:event.entity_type,entity_name:event.entity_id,summary:event.reason,
      details:JSON.stringify({before:event.before_data,after:event.after_data,result:event.result,provenance:event.provenance})}));
    this.notify();
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

  public getActivityLogs(): AdminActivityLog[] {
    if(!dataStore.getAuth().isAuthenticated) {this.activityLogs=[];this.persistedTasks=[];this.taskOverrides={};return [];}
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
    if(!dataStore.getAuth().isAuthenticated) {this.persistedTasks=[];this.taskOverrides={};this.activityLogs=[];}
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
        created_at: proof.created_at || '',
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
      const needsReview = doc.status === 'TO_VERIFY' || doc.status === 'UPLOADED' ||
        (doc.status === 'VERIFIED' && doc.verification_status !== 'VERIFIED');
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
          created_at: doc.published_at || '',
          completed_at: override.completed_at,
          completed_by: override.completed_by,
          target_tab: doc.document_type === 'COMPTE_ADMINISTRATIF' || doc.category === 'COMPTE_ADMINISTRATIF'
            ? 'comptes_administratifs' : 'documents_manager',
          target_filter: doc.document_type === 'COMPTE_ADMINISTRATIF' || doc.category === 'COMPTE_ADMINISTRATIF'
            ? { year: String(doc.fiscal_year || doc.year), search: doc.institution_name }
            : { filter: 'unverified', search: doc.title },
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
    const caidpEntities = dataStore.getCaidpDirectory(true);
    const priorityIncompleteEntities = caidpEntities.filter(e => {
      const hasValidEmail = e.email && e.email !== "Pas d'email" && e.email.includes('@');
      const hasValidPhone = e.phone && e.phone !== "Pas de numéro" && e.phone.length > 5;
      const hasValidRi = e.ri_name && e.ri_name !== 'Non désigné';

      // Needs attention if missing email or RI
      const isIncomplete = !hasValidEmail || !hasValidRi;
      const isHighProfile = e.category === 'MINISTERE' || e.category === 'INSTITUTION' || e.category === 'REGION';
      return (e.revision && e.verification_status!=='VERIFIED') || (isIncomplete && (isHighProfile || !hasValidPhone));
    });

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
        created_at: '',
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
        created_at: event.created_at || '',
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

    const result=tasks.map(task=>({...task,...this.persistedTasks.find(saved=>saved.id===task.id)}));
    result.push(...this.persistedTasks.filter(saved=>!result.some(task=>task.id===saved.id)));
    return result.sort((a, b) => {
      // Pending first, then completed
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;

      const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  private mutation(taskId: string, updates: TaskOverride & {assignee_id?: string | null}): AdminMutation {
    const task=this.getWorkQueueTasks().find(item=>item.id===taskId);
    if(!task) throw new Error('Tâche introuvable.');
    const patch: Record<string,unknown>={};
    for(const field of ['status','priority','notes','assignee_id'] as const) if(updates[field]!==undefined) patch[field]=updates[field];
    if(!task.revision) Object.assign(patch,{type:task.type,source_id:task.source_id,title:task.title,
      entity_name:task.entity_name,description:task.description,target_tab:task.target_tab,target_filter:task.target_filter || {}});
    return {table:'admin_tasks',id:taskId,revision:task.revision ?? null,patch,reason:'Décision de traitement de la file de travail'};
  }

  public async updateTask(taskId: string, updates: TaskOverride): Promise<void> {
    await mutateAdminBatch([this.mutation(taskId,updates)]);
    await this.refresh();
  }

  private async assignee(value: string): Promise<string> {
    const {data:identity,error}=await supabase.auth.getUser();
    if(error || !identity.user) throw new Error('Authentication required');
    if(value===dataStore.getAuth().email || value===dataStore.getAuth().fullName) return identity.user.id;
    const {data,error:staffError}=await supabase.rpc('admin_staff_directory');
    if(staffError) throw staffError;
    const matches=(data || []).filter((staff: {id:string;full_name:string})=>staff.id===value || staff.full_name===value);
    if(matches.length!==1) throw new Error('Sélectionnez un compte actif et identifiable dans la liste des opérateurs.');
    return matches[0].id;
  }

  public async assignTask(taskId: string, assignedTo: string): Promise<void> {
    await this.bulkAssignTasks([taskId],assignedTo);
  }

  public async bulkAssignTasks(taskIds: string[], assignedTo: string): Promise<void> {
    const id=await this.assignee(assignedTo);
    await mutateAdminBatch(taskIds.map(taskId=>this.mutation(taskId,{assignee_id:id,status:'IN_PROGRESS'})));
    await this.refresh();
  }

  public async bulkUpdateStatus(taskIds: string[], status: TaskStatus): Promise<void> {
    await mutateAdminBatch(taskIds.map(taskId=>this.mutation(taskId,{status})));
    await this.refresh();
  }

  /**
   * Calculate action KPIs for the top banner cards
   */
  public getActionKpis() {
    const pendingProofsCount = dataStore.getPendingProofs().length;
    const documents = dataStore.getDocuments();
    const unverifiedDocsCount = documents.filter(d =>
      d.status === 'TO_VERIFY' || d.status === 'UPLOADED' ||
      (d.status === 'VERIFIED' && d.verification_status !== 'VERIFIED')
    ).length;

    const caidpEntities = dataStore.getCaidpDirectory(true);
    const incompleteRiCount = caidpEntities.filter(e =>
      !e.email || e.email === "Pas d'email" || !e.email.includes('@') || e.ri_name === 'Non désigné'
    ).length;

    const caidpRequests = dataStore.getCaidpRequestStats();
    const pendingCaidpCount = caidpRequests.totalRequests;

    // Anomalies on budget projects
    const allProjects = dataStore.getProjects(true);
    const anomaliesCount = allProjects.filter(p =>
      (p.budget_amount_fcfa != null && p.budget_amount_fcfa <= 0) ||
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
