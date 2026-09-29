// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — TYPES WORKFLOW & ESPACE DE TRAVAIL ADMIN
// =========================================================================

export type TaskPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export type TaskType = 
  | 'PROOF_MODERATION' 
  | 'DOCUMENT_VERIFICATION' 
  | 'CAIDP_CONTACT_COMPLETION' 
  | 'CAIDP_REQUEST_FOLLOWUP' 
  | 'WEB_AUDIT' 
  | 'BUDGET_ANOMALY';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export interface AdminWorkTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  title: string;
  entity_name: string;
  entity_id?: string;
  description: string;
  status: TaskStatus;
  assigned_to?: string; // Nom ou email du modérateur
  assigned_to_role?: 'ADMIN' | 'MODERATOR';
  created_at: string;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  target_tab: 'moderation' | 'documents_manager' | 'caidp_manager' | 'caidp_analytics' | 'digital_opportunities' | 'budget_table';
  target_filter?: Record<string, string>;
  source_id: string; // ID de la preuve, du document, de l'entité CAIDP ou de la demande
  metadata?: Record<string, any>;
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action_type: 
    | 'UPDATE_RI_CONTACT'
    | 'BULK_UPDATE_RI'
    | 'MODERATE_PROOF'
    | 'ADD_DOCUMENT'
    | 'VALIDATE_DOCUMENT'
    | 'DELETE_DOCUMENT'
    | 'UPDATE_BUDGET'
    | 'IMPORT_DATA'
    | 'UPDATE_INSTITUTION'
    | 'ASSIGN_TASK'
    | 'COMPLETE_TASK'
    | 'SYSTEM_SETTING';
  entity_type: string;
  entity_name: string;
  summary: string;
  details?: string;
}

export type AdminModuleCategory = 
  | 'WORK_QUEUE'
  | 'PUBLIC_DATA'
  | 'CITIZEN_PARTICIPATION'
  | 'COMMUNICATION'
  | 'ADMINISTRATION';

export interface AdminModuleConfig {
  id: string;
  label: string;
  category: AdminModuleCategory;
  icon: string;
  badgeCount?: number;
  badgeColor?: string;
  minRole?: 'ADMIN' | 'MODERATOR';
  description: string;
}
