import { parseCsv } from '../utils/csv';
import { INITIAL_PUBLIC_DOCUMENTS } from '../data/publicDocuments';
import { 
  BudgetProject, 
  CitizenProof, 
  Institution, 
  ImpactStats, 
  ProjectStatus, 
  UserRole,
  NewsArticle,
  SiteSettings,
  PublicDocument
} from '../types';
import { RAW_BUDGET_PROJECTS, loadBudgetProjects } from '../data/budgetData';
import { INSTITUTIONS_DATA } from '../data/institutionsData';
import { readContent, readProofs, saveContent, saveContentBatch, requireBackend, requireStaff, ensureCitizenSession, type ContentKind } from './backend';
import { INITIAL_ARTICLES } from '../data/initialArticles';
import { detectCategoryFromExpense } from '../data/categories';
import { CAIDP_MASTER_DIRECTORY, CaidpEntity } from '../data/caidpRiData';
import { AuthSecurityService } from './authSecurity';
import { sanitizeCsvCell } from '../utils/security';
import { supabase, isSupabaseConfigured } from './supabase';


export interface CaidpRequestEvent {
  id: string;
  created_at: string;
  action_type: 'EMAIL_OPENED' | 'PRINT_OPENED' | 'COPIED';
  entity_type: 'MAIRIE' | 'REGION' | 'MINISTERE' | 'INSTITUTION' | 'AUTORITE_REGULATION' | 'PROJECT';
  entity_name: string;
  has_ri: boolean;
  document_titles: string[];
  document_categories: string[];
  user_status?: string;
  commune?: string;
}

export interface CaidpRequestStats {
  totalRequests: number;
  emailOpenedCount: number;
  printOpenedCount: number;
  copiedCount: number;
  withRiCount: number;
  withoutRiCount: number;
  byEntityType: Record<string, number>;
  topDocuments: { title: string; count: number }[];
  recentEvents: CaidpRequestEvent[];
}


export interface NewsletterSubscriber {
  id: string;
  first_name: string;
  email: string;
  commune: string;
  created_at: string;
}

export function isTangiblePhysicalProject(p: BudgetProject): boolean {
  if (!p) return false;
  const text = `${p.title || ''} ${p.details || ''} ${p.sub_nature_expense || ''} ${p.category || ''}`.toLowerCase();

  // 1. Exclude ALL Salaries, Bonuses, Missions, Travel, Administration, IT master plans & Operating overhead
  const excludedKeywords = [
    'salaire',
    'salarial',
    'traitement salarial',
    'indemnité',
    'indemnites',
    'prime',
    'émolument',
    'emolument',
    'gratification',
    'vacation',
    'rémunération',
    'remuneration',
    'personnel du conseil',
    'personnel de la mairie',
    'frais de personnel',
    'charges de personnel',
    'charges sociales',
    'frais de mission',
    'mission à l',
    'missions à l',
    'voyage',
    'billet d\'avion',
    'billets d\'avion',
    'frais de séjour',
    'hébergement',
    'carburant et lubrifiant',
    'frais de carburant',
    'consommable',
    'fourniture de bureau',
    'fournitures de bureau',
    'schéma directeur',
    'schema directeur',
    'système d\'information',
    'systeme d\'information',
    'audit organisationnel',
    'étude institutionnelle',
    'frais financiers',
    'remboursement de dette',
    'intérêts de la dette',
    'contentieux judiciaire',
    'assurance du personnel',
    'cotisation sociale',
    'dotation globale de fonctionnement',
    'fonctionnement des services',
    'charges administratives',
    'assurer le fonctionnement',
    'assurer la gestion',
  ];

  for (const kw of excludedKeywords) {
    if (text.includes(kw)) {
      return false;
    }
  }

  // 2. Must be a tangible investment / equipment / construction / rehabilitation / community facility
  const tangibleKeywords = [
    'construction',
    'réhabilitation',
    'rehabilitation',
    'reprofilage',
    'bitumage',
    'voirie',
    'route',
    'piste',
    'pont',
    'caniveau',
    'assainissement',
    'forage',
    'château d\'eau',
    'chateau d\'eau',
    'hydraulique',
    'adduction',
    'eau potable',
    'électrification',
    'electrification',
    'éclairage public',
    'eclairage public',
    'panneau solaire',
    'panneaux solaires',
    'école',
    'ecole',
    'collège',
    'college',
    'lycée',
    'lycee',
    'classe',
    'bâtiment scolaire',
    'batiment scolaire',
    'cantine',
    'table-banc',
    'tables-bancs',
    'maternité',
    'maternite',
    'dispensaire',
    'centre de santé',
    'centre de sante',
    'hôpital',
    'hopital',
    'chr',
    'chu',
    'ambulance',
    'médical',
    'medical',
    'médicament',
    'chambre froide',
    'marché',
    'marche',
    'hangar',
    'abattoir',
    'logement',
    'foyer',
    'stade',
    'terrain de sport',
    'complexe sportif',
    'retenue d\'eau',
    'agricole',
    'irrigation',
    'magasin de stockage',
    'bâtiment',
    'batiment',
    'travaux',
    'aménagement',
    'amenagement',
    'équipement',
    'equipement',
    'acquisition de matériel',
    'acquisition de materiel',
    'acquisition d\'équipements',
  ];

  return tangibleKeywords.some(kw => text.includes(kw));
}

export interface AuthState {
  isAuthenticated: boolean;
  email: string;
  fullName: string;
  role: UserRole;
  expiresAt?: number;
}


const DEFAULT_SETTINGS: SiteSettings = {
  fiscal_year: 2026,
  contact_email: 'contact.suivi@gmail.com',
  contact_phone: '+225 07 00 00 00 00',
  facebook_url: 'https://www.facebook.com/profile.php?id=61593791261798',
  platform_title: 'SuiviBudget Côte d\'Ivoire - Observatoire Citoyen des Budgets Publics & Chantiers',
  announcement_banner_enabled: false,
  announcement_banner_text: "",
  announcement_banner_link: "",
  announcement_banner_type: "info",
};

export class DataStore {
  private projects: BudgetProject[] = [];
  private institutions: Institution[] = [];
  private proofs: CitizenProof[] = [];
  private articles: NewsArticle[] = [];
  private documents: PublicDocument[] = [];
  private caidpDirectory: CaidpEntity[] = [];
  private caidpLogs: CaidpRequestEvent[] = [];
  private subscribers: NewsletterSubscriber[] = [];
  private settings: SiteSettings = { ...DEFAULT_SETTINGS };
  private authState: AuthState = {
    isAuthenticated: false,
    email: '',
    fullName: '',
    role: 'CITIZEN',
  };
  private listeners: (() => void)[] = [];

  public readonly ready: Promise<void>;
  constructor() {
    this.ready = this.init();
  }

  private async init() {
    await loadBudgetProjects();
    this.projects = RAW_BUDGET_PROJECTS.filter(isTangiblePhysicalProject);
    this.institutions = [...INSTITUTIONS_DATA];
    this.articles = [...INITIAL_ARTICLES];
    this.documents = INITIAL_PUBLIC_DOCUMENTS.map(d => ({ ...d, downloads_count: 0 }));
    this.caidpDirectory = [...CAIDP_MASTER_DIRECTORY];
    this.proofs = [];
    this.caidpLogs = [];
    this.settings = { ...DEFAULT_SETTINGS };
    if (isSupabaseConfigured()) {
      void this.refreshAuth();
      void this.initSupabaseSync();
      // Don't await Auth calls inside the Supabase auth-state callback (deadlock).
      supabase.auth.onAuthStateChange(() => {
        ++this.syncGeneration;
        AuthSecurityService.clearSession();
        this.proofs = []; this.subscribers = []; this.caidpLogs = [];
        this.notify();
        setTimeout(() => { void this.refreshAuth(); void this.initSupabaseSync(); }, 0);
      });
    }
  }

  private syncGeneration = 0;
  private async initSupabaseSync() {
    const generation = ++this.syncGeneration;
    if (!isSupabaseConfigured()) return;
    try {
      const [content, proofs] = await Promise.all([readContent(), readProofs()]);
      if (generation !== this.syncGeneration) return;
      const merge = <T extends { id: string }>(defaults: T[], kind: ContentKind): T[] => {
        const map = new Map(defaults.map(item => [item.id, item]));
        for (const row of content.filter(row => row.kind === kind)) {
          if (row.deleted) map.delete(row.id);
          else map.set(row.id, { ...row.data, id: row.id } as T);
        }
        return [...map.values()];
      };
      this.projects = merge(RAW_BUDGET_PROJECTS, 'projects').filter(isTangiblePhysicalProject);
      this.institutions = merge(INSTITUTIONS_DATA, 'institutions');
      this.articles = merge(INITIAL_ARTICLES, 'articles');
      this.documents = merge(INITIAL_PUBLIC_DOCUMENTS, 'documents');
      this.caidpDirectory = merge(CAIDP_MASTER_DIRECTORY, 'caidp');
      const settings = content.find(row => row.kind === 'settings' && row.id === 'global' && !row.deleted);
      this.settings = { ...DEFAULT_SETTINGS, ...settings?.data };
      this.proofs = proofs;
      this.syncError = null;
      this.notify();
    } catch (error) {
      if (generation !== this.syncGeneration) return;
      this.syncError = 'Les mises à jour partagées sont indisponibles. Le catalogue initial reste consultable.';
      this.notify();
    }
  }

  public syncError: string | null = null;
  public async refreshAuth() {
    try { await AuthSecurityService.refreshSession(); }
    catch { AuthSecurityService.clearSession(); }
    this.notify();
  }
  public async refreshSharedData() { await this.initSupabaseSync(); }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- GETTERS ---
  public getProjects(): BudgetProject[] {
    return this.projects;
  }

  public getInstitutions(): Institution[] {
    return this.institutions;
  }

  public getApprovedProofs(): CitizenProof[] {
    return this.proofs.filter(p => p.verification_status === 'APPROVED' && !p.is_demo);
  }

  public hasRealProofs(): boolean {
    return this.proofs.some(p => p.verification_status === 'APPROVED' && !p.is_demo);
  }

  public getAllProofs(): CitizenProof[] {
    if (!['ADMIN', 'MODERATOR'].includes(this.getAuth().role)) return [];
    return this.proofs;
  }

  public getPendingProofs(): CitizenProof[] {
    return this.getAllProofs().filter(p => p.verification_status === 'PENDING');
  }

  public getArticles(): NewsArticle[] {
    return this.articles;
  }

  public getSettings(): SiteSettings {
    return this.settings;
  }

  public getActiveFiscalYear(): number {
    return this.settings.fiscal_year || 2026;
  }

  public getAvailableFiscalYears(): number[] {
    const years = Array.from(new Set(this.projects.map(p => p.fiscal_year || 2026)));
    if (!years.includes(2026)) years.push(2026);
    return years.sort((a, b) => b - a);
  }

  public getProjectById(id: string): BudgetProject | undefined {
    return this.projects.find(p => p.id === id);
  }

  public getProofsForProject(projectId: string): CitizenProof[] {
    return this.proofs.filter(p => p.project_id === projectId && p.verification_status === 'APPROVED' && !p.is_demo);
  }

  public getAuth(): AuthState {
    const session = AuthSecurityService.validateCurrentSession();
    if (session.isAuthenticated && session.user) {
      this.authState = {
        isAuthenticated: true,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role as UserRole,
        expiresAt: session.user.expiresAt,
      };
      return { ...this.authState };
    }
    this.authState = { isAuthenticated: false, email: '', fullName: '', role: 'CITIZEN', expiresAt: 0 };
    return { ...this.authState };
  }

  // --- STATS CALCULATION ---
  public getImpactStats(): ImpactStats {
    const totalCommunes = this.institutions.filter(i => i.type === 'MAIRIE').length;
    const totalRegions = this.institutions.filter(i => i.type === 'REGION' || i.type === 'DISTRICT').length;
    const totalCollectivites = totalCommunes + totalRegions;
    const totalBudgetLines = this.projects.length;
    const totalInvestmentsFcfa = this.projects.reduce((sum, p) => sum + p.budget_amount_fcfa, 0);
    const verifiedProofs = this.getApprovedProofs().length;
    const totalProofs = this.proofs.filter(p => !p.is_demo).length;
    const proofsVerificationRate = totalProofs > 0 ? Math.round((verifiedProofs / totalProofs) * 100) : 0;

    return {
      totalCommunes,
      totalRegions,
      totalCollectivites,
      totalBudgetLines,
      totalInvestmentsFcfa,
      verifiedProofsCount: verifiedProofs,
      proofsVerificationRate,
    };
  }

  // --- AUTH MANAGEMENT ---
  // Staff identity can only come from a server-validated session.
  public async login() { await this.refreshAuth(); }

  public async logout() {
    ++this.syncGeneration;
    AuthSecurityService.clearSession();
    this.proofs = []; this.subscribers = []; this.caidpLogs = [];
    this.notify();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw new Error('Déconnexion serveur non confirmée. Réessayez.');
      await this.initSupabaseSync();
    }
  }

  // --- CITIZEN PROOF SUBMISSION & MODERATION ---
  public async submitProof(proofData: {
    request_id: string; evidence_path: string; project_id: string;
    media_type: 'IMAGE' | 'VIDEO'; citizen_status_claim: ProjectStatus;
    comment: string; locality_details?: string; citizen_name?: string; observation_date?: string;
  }): Promise<CitizenProof> {
    const ownerId = await ensureCitizenSession();
    const project = this.getProjectById(proofData.project_id);
    if (!project) throw new Error('Projet introuvable. Sélectionnez à nouveau le chantier.');
    if (!proofData.evidence_path.startsWith(ownerId + '/')) throw new Error('Fichier non associé à votre envoi.');
    const { request_id, evidence_path, ...input } = proofData;
    const payload = { ...input, project_title: project.title, commune_name: project.commune_name,
      region_name: project.region_name, citizen_name: proofData.citizen_name || 'Citoyen observateur' };
    const { data, error } = await supabase.rpc('civic_submit_proof', {
      request_id, evidence_path, payload,
    });
    if (error || data !== request_id) throw new Error('Réception non confirmée. Votre brouillon est conservé ; réessayez.');
    // No optimistic approval or durable storage of private evidence in localStorage.
    return { ...payload, id: request_id, image_url: '', verification_status: 'PENDING',
      confirmations_count: 0, created_at: new Date().toISOString() } as CitizenProof;
  }

  public async confirmProof(proofId: string) {
    await ensureCitizenSession();
    const { error } = await supabase.rpc('civic_confirm_proof', { proof_id: proofId });
    if (error) throw new Error('Confirmation non enregistrée. Réessayez.');
  }

  public async moderateProof(proofId: string, status: 'APPROVED' | 'REJECTED', moderatorNotes?: string) {
    await requireStaff(['ADMIN', 'MODERATOR']);
    const { error } = await supabase.rpc('civic_moderate_proof', { proof_id: proofId, decision: status,
      notes: moderatorNotes || '' });
    if (error) throw new Error('Décision non enregistrée. Réessayez.');
    await this.initSupabaseSync();
  }

  public async deleteProof(proofId: string) {
    await this.moderateProof(proofId, 'REJECTED', 'Retiré de la publication');
  }

  // --- PROJECT CRUD ---
  public async addProject(project: Omit<BudgetProject, 'id' | 'created_at'>): Promise<BudgetProject> {
    const record = { ...project, id: crypto.randomUUID(), created_at: new Date().toISOString() } as BudgetProject;
    await saveContent('projects', record.id, record);
    this.projects = [record, ...this.projects]; this.notify();
    return record;
  }

  public async updateProject(id: string, updates: Partial<BudgetProject>): Promise<boolean> {
    const current = this.projects.find(item => item.id === id);
    if (!current) throw new Error('Fiche introuvable. Actualisez la page.');
    const record = { ...current, ...updates, id };
    await saveContent('projects', id, record);
    this.projects = this.projects.map(item => item.id === id ? record : item);
    this.notify(); return true;
  }

  public async deleteProject(id: string): Promise<boolean> {
    await saveContent('projects', id, {}, true);
    this.projects = this.projects.filter(item => item.id !== id);
    this.notify(); return true;
  }

  // --- INSTITUTION CRUD ---
  public async addInstitution(instData: Omit<Institution, 'id'>): Promise<Institution> {
    const record = { ...instData, id: crypto.randomUUID() } as Institution;
    await saveContent('institutions', record.id, record);
    this.institutions = [record, ...this.institutions]; this.notify();
    return record;
  }

  public async updateInstitution(updatedInst: Institution): Promise<boolean> {
    const current = this.institutions.find(item => item.id === updatedInst.id);
    if (!current) throw new Error('Fiche introuvable. Actualisez la page.');
    const record = updatedInst;
    await saveContent('institutions', updatedInst.id, record);
    this.institutions = this.institutions.map(item => item.id === updatedInst.id ? record : item);
    this.notify(); return true;
  }

  public async deleteInstitution(id: string): Promise<boolean> {
    await saveContent('institutions', id, {}, true);
    this.institutions = this.institutions.filter(item => item.id !== id);
    this.notify(); return true;
  }

  // --- ARTICLES / PUBLICATIONS CRUD ---
  public async addArticle(articleData: Omit<NewsArticle, 'id' | 'published_at'>): Promise<NewsArticle> {
    const record = { ...articleData, id: crypto.randomUUID(), published_at: new Date().toISOString() } as NewsArticle;
    await saveContent('articles', record.id, record);
    this.articles = [record, ...this.articles]; this.notify();
    return record;
  }

  public async updateArticle(id: string, updates: Partial<NewsArticle>): Promise<boolean> {
    const current = this.articles.find(item => item.id === id);
    if (!current) throw new Error('Fiche introuvable. Actualisez la page.');
    const record = { ...current, ...updates, id };
    await saveContent('articles', id, record);
    this.articles = this.articles.map(item => item.id === id ? record : item);
    this.notify(); return true;
  }

  public async deleteArticle(id: string): Promise<boolean> {
    await saveContent('articles', id, {}, true);
    this.articles = this.articles.filter(item => item.id !== id);
    this.notify(); return true;
  }

  // --- PUBLIC DOCUMENTS MANAGEMENT ---
  public getDocuments(): PublicDocument[] {
    return [...this.documents];
  }

  public getDocumentById(id: string): PublicDocument | undefined {
    return this.documents.find(d => d.id === id);
  }

  public async addDocument(docData: Omit<PublicDocument, 'id' | 'downloads_count' | 'published_at'> & { published_at?: string }): Promise<PublicDocument> {
    const record = { ...docData, id: crypto.randomUUID(), published_at: docData.published_at || new Date().toISOString(), downloads_count: 0 } as PublicDocument;
    await saveContent('documents', record.id, record);
    this.documents = [record, ...this.documents]; this.notify();
    return record;
  }

  public async updateDocument(id: string, updates: Partial<PublicDocument>): Promise<boolean> {
    const current = this.documents.find(item => item.id === id);
    if (!current) throw new Error('Fiche introuvable. Actualisez la page.');
    const record = { ...current, ...updates, id };
    await saveContent('documents', id, record);
    this.documents = this.documents.map(item => item.id === id ? record : item);
    this.notify(); return true;
  }

  public async deleteDocument(id: string): Promise<boolean> {
    await saveContent('documents', id, {}, true);
    this.documents = this.documents.filter(item => item.id !== id);
    this.notify(); return true;
  }

  public incrementDocumentDownloads(_id: string): void {
    // Opening a link does not prove a completed download. No fabricated counter.
  }

  // --- SITE SETTINGS ---
  public async updateSettings(newSettings: Partial<SiteSettings>) {
    const settings = { ...this.settings, ...newSettings };
    await saveContent('settings', 'global', settings);
    this.settings = settings; this.notify();
  }

  // --- SMART MULTI-YEAR CSV IMPORT ---
  public async importFromCSV(csvText: string, options?: { mode?: 'APPEND' | 'REPLACE_YEAR'; targetYear?: number }): Promise<{ successCount: number; errorCount: number; detectedYear: number; totalAmountFcfa: number }> {
    const rows = parseCsv(csvText);
    const headers = rows.shift()?.map(h => h.trim()) || [];
    const required = ['title','commune_name','region_name','budget_amount_fcfa','fiscal_year','source'];
    if (required.some(key => !headers.includes(key)) || new Set(headers).size !== headers.length) throw new Error('Colonnes requises : ' + required.join(';'));
    const seen = new Set<string>();
    const projects = rows.map((row, index) => {
      if (row.length !== headers.length) throw new Error(`Nombre de colonnes incorrect à la ligne ${index + 2}.`);
      const item = Object.fromEntries(headers.map((key,i) => [key, row[i].trim()]));
      const amount = Number(item.budget_amount_fcfa.replace(/[\s\u202f\u00a0]/g,'').replace(',','.'));
      const year = Number(item.fiscal_year);
      if (!item.title || !item.source || !item.budget_amount_fcfa || !Number.isSafeInteger(amount) || amount < 0 || !Number.isInteger(year) || year < 2000 || year > 2200) throw new Error(`Donnée budgétaire invalide à la ligne ${index + 2}.`);
      if (options?.targetYear && options.targetYear !== year) throw new Error('Exercice différent de celui sélectionné.');
      const id = item.id || crypto.randomUUID();
      if (seen.has(id)) throw new Error(`Identifiant en double : ${id}`);
      seen.add(id);
      return { ...item, id, budget_amount_fcfa: amount, fiscal_year: year, current_status: 'UNKNOWN',
        progress_percentage: 0, nature_expense: 'Investissements', scope_level: item.scope_level === 'NATIONAL' ? 'NATIONAL' : 'LOCAL', budget_stage: 'VOTED' } as BudgetProject;
    });
    if (!projects.length) throw new Error('Aucun projet à importer.');
    const year = projects[0].fiscal_year;
    if (projects.some(p => p.fiscal_year !== year)) throw new Error('Importez un seul exercice à la fois.');
    const removed = options?.mode === 'REPLACE_YEAR' ? this.projects.filter(p => p.fiscal_year === year && !seen.has(p.id)) : [];
    await saveContentBatch([
      ...removed.map(p => ({ kind: 'projects' as const, id: p.id, data: {}, deleted: true })),
      ...projects.map(p => ({ kind: 'projects' as const, id: p.id, data: p })),
    ]);
    const map = new Map(this.projects.filter(p => !removed.includes(p)).map(p => [p.id,p]));
    projects.forEach(p => map.set(p.id,p));
    this.projects = [...map.values()]; this.notify();
    return { successCount: projects.length, errorCount: 0, detectedYear: year, totalAmountFcfa: projects.reduce((sum,p) => sum+p.budget_amount_fcfa,0) };
  }

  // --- FULL BACKUP & RESTORE (JSON) ---
  public exportFullBackup(): string {
    const backupData = {
      version: '6.0',
      exported_at: new Date().toISOString(),
      projects: this.projects,
      institutions: this.institutions,
      articles: this.articles,
      proofs: this.proofs,
      settings: this.settings,
    };
    return JSON.stringify(backupData, null, 2);
  }

  public async importFullBackup(_jsonString: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'La restauration globale doit être effectuée depuis une sauvegarde serveur vérifiée. Utilisez les imports par catalogue pour les corrections ciblées.' };
  }

  public async resetToFactoryDefaults() {
    throw new Error('La réinitialisation globale est désactivée pour protéger les données partagées.');
  }

  // --- CAIDP RI DIRECTORY CRUD ---
  public getCaidpDirectory(): CaidpEntity[] {
    return [...this.caidpDirectory];
  }

  public findCaidpEntity(entityName: string): CaidpEntity | undefined {
    if (!entityName) return undefined;
    const clean = entityName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

    return this.caidpDirectory.find(ri => {
      const comp = ri.company_name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .trim();
      return comp.includes(clean) || clean.includes(comp);
    });
  }

  public async updateCaidpEntity(id: string, updates: Partial<CaidpEntity>): Promise<boolean> {
    const current = this.caidpDirectory.find(item => item.id === id);
    if (!current) throw new Error('Fiche introuvable. Actualisez la page.');
    const record = { ...current, ...updates, id };
    await saveContent('caidp', id, record);
    this.caidpDirectory = this.caidpDirectory.map(item => item.id === id ? record : item);
    this.notify(); return true;
  }

  public async addCaidpEntity(entityData: Omit<CaidpEntity, 'id'>): Promise<CaidpEntity> {
    const record = { ...entityData, id: crypto.randomUUID() } as CaidpEntity;
    await saveContent('caidp', record.id, record);
    this.caidpDirectory = [record, ...this.caidpDirectory]; this.notify();
    return record;
  }

  public async deleteCaidpEntity(id: string): Promise<boolean> {
    await saveContent('caidp', id, {}, true);
    this.caidpDirectory = this.caidpDirectory.filter(item => item.id !== id);
    this.notify(); return true;
  }

  public async resetCaidpDirectory() {
    throw new Error('La réinitialisation globale est désactivée pour protéger les données partagées.');
  }

  public exportCaidpDirectoryToCSV(): string {
    const headers = ['ID', 'Organisme', 'Categorie', 'Region', 'Commune', 'Nom_RI', 'Fonction_RI', 'Email_RI', 'Telephone_RI', 'Source'];
    const rows = this.caidpDirectory.map(e => [
      sanitizeCsvCell(e.id),
      sanitizeCsvCell(e.company_name),
      sanitizeCsvCell(e.category),
      sanitizeCsvCell(e.region),
      sanitizeCsvCell(e.commune),
      sanitizeCsvCell(e.ri_name),
      sanitizeCsvCell(e.ri_function),
      sanitizeCsvCell(e.email),
      sanitizeCsvCell(e.phone),
      sanitizeCsvCell(e.source),
    ]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  public async importCaidpDirectoryFromCSV(csvText: string): Promise<{ successCount: number; errorCount: number }> {
    const directory = this.caidpDirectory.map(item => ({ ...item }));
    let successCount = 0;
    let errorCount = 0;
    const lines = parseCsv(csvText);
    if (lines.length <= 1) return { successCount: 0, errorCount: 0 };

    if (lines[0].length !== 10) throw new Error('Utilisez le format CSV exporté par le répertoire (10 colonnes).');

    for (let i = 1; i < lines.length; i++) {
      try {
        const parts = lines[i].map(p => p.trim());
        if (parts.length != 10 || !parts[1]) throw new Error('Ligne incomplète');

        const orgName = parts[1] || parts[0];
        const category = (parts[2] as any) || 'SOCIETE_ETAT';
        const riName = parts[5] || parts[2] || '';
        const riFunc = parts[6] || parts[3] || '';
        const email = parts[7] || parts[4] || "Pas d'email";
        const phone = parts[8] || parts[5] || "Pas de numéro";

        const existingIdx = directory.findIndex(e =>
          e.company_name.toLowerCase().trim() === orgName.toLowerCase().trim()
        );

        if (existingIdx !== -1) {
          directory[existingIdx] = {
            ...directory[existingIdx],
            ri_name: riName || directory[existingIdx].ri_name,
            ri_function: riFunc || directory[existingIdx].ri_function,
            email: email || directory[existingIdx].email,
            phone: phone || directory[existingIdx].phone,
            source: "Importé par l'Admin"
          };
        } else {
          directory.push({
            id: `caidp-import-${Date.now()}-${i}`,
            company_name: orgName,
            category: category,
            region: parts[3] || 'Côte d\'Ivoire',
            commune: parts[4] || '',
            ri_name: riName || 'Non désigné',
            ri_function: riFunc || "Service d'Accès aux Documents Publics",
            email: email || "Pas d'email",
            phone: phone || "Pas de numéro",
            source: "Importé par l'Admin"
          });
        }
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    if (errorCount) throw new Error('Import annulé : corrigez les lignes invalides.');
    await saveContentBatch(directory.filter(item => JSON.stringify(item) !== JSON.stringify(this.caidpDirectory.find(old => old.id === item.id)))
      .map(item => ({ kind: 'caidp' as const, id: item.id, data: item })));
    this.caidpDirectory = directory; this.notify();
    return { successCount, errorCount };
  }

  // --- PERSISTENCE HELPERS ---






  // ==========================================
  // NEWSLETTER & CITIZEN ALERTS SUBSCRIBERS
  // ==========================================
  public async subscribeNewsletter(firstName: string, email: string, commune: string): Promise<{ success: boolean; message: string }> {
    try {
      await ensureCitizenSession();
      const { error } = await supabase.rpc('civic_subscribe', { subscriber_email: email.trim().toLowerCase(),
        subscriber_name: firstName.trim(), subscriber_commune: commune.trim() });
      if (error) throw error;
      return { success: true, message: 'Votre demande d’inscription est enregistrée.' };
    } catch { return { success: false, message: 'Inscription non confirmée. Réessayez ultérieurement.' }; }
  }

  public getSubscribers(): NewsletterSubscriber[] {
    return [...this.subscribers];
  }

  private saveSubscribers() {}

  // ==========================================
  // CAIDP REQUESTS & ANALYTICS TRACKING
  // ==========================================
  public logCaidpRequest(event: Omit<CaidpRequestEvent, 'id' | 'created_at'>): void {
    const newLog = { ...event, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    // Local action history only. No claim of national impact, delivery, or response.
    this.caidpLogs.unshift(newLog); this.notify();
  }

  public getCaidpRequests(): CaidpRequestEvent[] {
    return [...this.caidpLogs];
  }

  public getCaidpRequestStats(): CaidpRequestStats {
    const totalRequests = this.caidpLogs.length;
    let emailOpenedCount = 0;
    let printOpenedCount = 0;
    let copiedCount = 0;
    let withRiCount = 0;
    let withoutRiCount = 0;
    const byEntityType: Record<string, number> = {
      MAIRIE: 0,
      REGION: 0,
      MINISTERE: 0,
      INSTITUTION: 0,
      AUTORITE_REGULATION: 0,
      PROJECT: 0,
    };
    const docCountMap: Record<string, number> = {};

    for (const log of this.caidpLogs) {
      if (log.action_type === 'EMAIL_OPENED') emailOpenedCount++;
      else if (log.action_type === 'PRINT_OPENED') printOpenedCount++;
      else if (log.action_type === 'COPIED') copiedCount++;

      if (log.has_ri) withRiCount++;
      else withoutRiCount++;

      if (log.entity_type) {
        byEntityType[log.entity_type] = (byEntityType[log.entity_type] || 0) + 1;
      }

      if (Array.isArray(log.document_titles)) {
        for (const title of log.document_titles) {
          docCountMap[title] = (docCountMap[title] || 0) + 1;
        }
      }
    }

    const topDocuments = Object.entries(docCountMap)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      emailOpenedCount,
      printOpenedCount,
      copiedCount,
      withRiCount,
      withoutRiCount,
      byEntityType,
      topDocuments,
      recentEvents: this.caidpLogs.slice(0, 50),
    };
  }

  public clearCaidpRequests(): void {
    this.caidpLogs = [];

    this.notify();
  }


}

export const dataStore = new DataStore();
