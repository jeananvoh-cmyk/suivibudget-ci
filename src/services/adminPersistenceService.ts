import { isSupabaseConfigured, supabase } from './supabase';

export type AdminEntityTable = 'institutions' | 'budget_projects' | 'budget_lines' | 'public_documents' | 'news_articles' | 'caidp_directory' | 'admin_tasks' | 'site_settings';
export type PersistedRow = Record<string, unknown> & { id: string; revision: number; updated_at: string };
export interface AdminMutation {
  table: AdminEntityTable;
  id: string;
  revision: number | null;
  patch: Record<string, unknown>;
  reason: string;
  operationId?: string;
}

const pending = new Set<string>();
const retries = new Map<string, { payload: string; id: string }>();
const creations = new Map<string, string>();

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value==='object') return `{${Object.entries(value).filter(([,item])=>item!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

async function digest(value: unknown): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)))),byte=>byte.toString(16).padStart(2,'0')).join('');
}

function readRetry(key: string): {payload:string;id:string}|undefined {
  if(retries.has(key)) return retries.get(key);
  const value=typeof sessionStorage==='undefined' ? null : sessionStorage.getItem(`admin-retry:${key}`);
  if(!value) return undefined;
  try {
    const row=JSON.parse(value);
    return /^[a-f0-9]{64}$/.test(row.payload) && /^[a-f0-9-]{36}$/.test(row.id) ? row : undefined;
  } catch {return undefined;}
}

function keepRetry(key: string, value: {payload:string;id:string}): void {
  retries.set(key,value);
  if(typeof sessionStorage!=='undefined') sessionStorage.setItem(`admin-retry:${key}`,JSON.stringify(value));
}

export async function adminCreationId(table: AdminEntityTable, value: object): Promise<string> {
  const {data,error}=await supabase.auth.getUser();
  if(error || !data.user) throw new Error('Authentication required');
  const key = `${data.user.id}:${table}:${await digest(value)}`;
  const saved=typeof sessionStorage==='undefined' ? null : sessionStorage.getItem(`admin-create:${key}`);
  if (!creations.has(key)) creations.set(key, saved && /^admin-[a-f0-9-]{36}$/.test(saved) ? saved : `admin-${crypto.randomUUID()}`);
  if(typeof sessionStorage!=='undefined') sessionStorage.setItem(`admin-create:${key}`,creations.get(key)!);
  return creations.get(key)!;
}

export async function confirmAdminCreation(table: AdminEntityTable, value: object): Promise<void> {
  const {data}=await supabase.auth.getUser();
  if(!data.user) return;
  const key=`${data.user.id}:${table}:${await digest(value)}`;
  creations.delete(key);
  if(typeof sessionStorage!=='undefined') sessionStorage.removeItem(`admin-create:${key}`);
}

export function adminErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Erreur réseau : sauvegarde non confirmée.';
  if (/conflict|already exists/i.test(message)) return 'Conflit avec une autre session. Rechargez la version serveur ; votre formulaire est conservé.';
  if (/permission|row.level|authentication|jwt|operator/i.test(message)) return 'Session expirée ou droits insuffisants. Reconnectez-vous ; votre formulaire est conservé.';
  if (/function.*does not exist|schema cache|PGRST202/i.test(message)) return 'Contrat serveur non installé. Migration locale à valider ; aucune sauvegarde effectuée.';
  return message;
}

export async function requireAdminPersistence(): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase indisponible : aucune sauvegarde serveur possible.');
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!identity.user) throw new Error('Authentication required');
  const { data, error } = await supabase.rpc('admin_persistence_version');
  if (error) throw new Error(adminErrorMessage(error));
  if (data !== 3) throw new Error('Contrat serveur incompatible : sauvegarde bloquée.');
}

export async function readAdminRows(table: AdminEntityTable): Promise<PersistedRow[]> {
  const rows: PersistedRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select('*').order('id').range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []) as PersistedRow[]);
    if (!data || data.length < 500) return rows;
  }
}

export async function resolveAdminMedia(row: PersistedRow, table: 'institutions' | 'news_articles'): Promise<PersistedRow> {
  const result={...row};
  const metadata=(row.article_metadata || {}) as Record<string,unknown>;
  for(const field of table==='institutions' ? ['leader_photo_url'] : ['cover_image_url','document_url']) {
    const reference=field==='document_url' ? metadata[field] : row[field];
    if(typeof reference==='string' && reference.startsWith('storage://admin_media/')) {
      const {data,error}=await supabase.functions.invoke('admin-media-url',{body:{table,id:row.id,field}});
      result[field.replace('_url','_display_url')]=!error && typeof data?.url==='string' && data.url.startsWith('https://') ? data.url : undefined;
    }
  }
  return result;
}

export async function hiddenBaselineIds(table: AdminEntityTable, ids: string[]): Promise<Set<string>> {
  const {data,error}=await supabase.rpc('admin_baseline_visibility',{p_table:table,p_ids:ids});
  if(error) {
    if(error.code==='PGRST202') return new Set();
    throw error;
  }
  return new Set(Array.isArray(data) ? data : []);
}

export async function readStaffOperators(): Promise<{id:string;full_name:string;role:string}[]> {
  const {data,error}=await supabase.rpc('admin_staff_directory');
  if(error) throw error;
  return data || [];
}

export async function mutateAdminEntity(input: AdminMutation): Promise<PersistedRow> {
  const key = `${input.table}:${input.id}`;
  if (pending.has(key)) throw new Error('Une sauvegarde de cet objet est déjà en cours.');
  pending.add(key);
  try {
    await requireAdminPersistence();
    const {data:identity}=await supabase.auth.getUser();
    if(!identity.user) throw new Error('Authentication required');
    const retryKey=`${identity.user.id}:${key}`;
    const payload = await digest({ revision: input.revision, patch: input.patch, reason: input.reason });
    const retry = readRetry(retryKey);
    const operationId = input.operationId || (retry?.payload === payload ? retry.id : crypto.randomUUID());
    keepRetry(retryKey, { payload, id: operationId });
    const { data: committed, error } = await supabase.rpc('admin_mutate', {
      p_table: input.table, p_id: input.id, p_expected_revision: input.revision,
      p_patch: input.patch, p_operation_id: operationId, p_reason: input.reason,
    });
    if (error) throw new Error(adminErrorMessage(error));
    if(committed?._operation?.changed) throw new Error('Conflit : cette opération a été confirmée, puis la ressource a changé. Votre formulaire est conservé ; rechargez avant toute nouvelle écriture.');
    if(committed?._operation?.original?.revision!==committed?.revision || committed?._operation?.id!==operationId) throw new Error('Confirmation serveur invalide. Rechargez avant de réessayer.');
    if (committed?.id !== input.id || !Number.isInteger(committed.revision)) throw new Error('Confirmation serveur invalide. Rechargez avant de réessayer.');
    const { data, error: readError } = await supabase.from(input.table).select('*').eq('id', input.id).single();
    if (readError) throw new Error('Écriture confirmée, mais relecture indisponible. Réessayez la même sauvegarde pour relire sans doublon.');
    if (data?.id !== input.id || data.revision !== committed.revision) throw new Error('Conflit après confirmation : la ressource a changé. Votre formulaire est conservé ; rechargez avant de poursuivre.');
    return data as PersistedRow;
  } finally {
    pending.delete(key);
  }
}

export function pickAdminFields(value: object, fields: readonly string[]): Record<string, unknown> {
  const record = value as Record<string, unknown>;
  return Object.fromEntries(fields.filter(key => record[key] !== undefined).map(key => [key, record[key]]));
}

export const institutionFields = ['name','type','region','district','departement','address','contact_email','contact_phone','website',
  'facebook_url','leader_name','leader_title','leader_photo_url','political_party','web_status','web_observations','info_officer_name',
  'info_officer_title','info_officer_email','info_officer_phone','green_line_number'] as const;
export const institutionMetadataFields = ['leader_gender','leader_bio','mandature','mission_summary','organigramme_summary',
  'organigramme_details','leader_experience','leader_education','official_programs'] as const;
export const projectFields = ['institution_id','commune_name','region_name','district_name','departement_name','category','nature_expense',
  'sub_nature_expense','title','details','budget_amount_fcfa','fiscal_year','fiscal_year_label','current_status','progress_percentage',
  'contractor_name','target_delivery_date','locality_village_neighborhood','start_date','scope_level','ministry_name','program_name',
  'service_name','partner_or_donor','master_builder','project_tier','source_document_id','source_page','source_url','publication_status'] as const;
export const projectMetadataFields=['institution_name','source','contractual_duration_months','execution_deadline','image_url','citizen_need_origin','initiative_source','official_progress_source'] as const;
export const directoryFields = ['company_name','category','region','commune','ri_name','ri_function','email','phone','source','source_url',
  'notes','verification_status','publication_status'] as const;
export const budgetLineFields = ['budget_id','program_name','line_label','original_label','category','amount','sector','normalized_sector',
  'source_page','source_reference','linked_project_id','source_document_id'] as const;
export const documentFields = ['title','category','institution_name','year','fiscal_year','description','file_url','file_name','file_size',
  'file_format','is_official','tags','institution_id','institution_type','document_type','storage_bucket','storage_path','original_filename',
  'mime_type','file_size_bytes','page_count','source_name','source_url','adoption_date','approval_date','approval_reference','status',
  'verification_status','checksum_sha256','version','replaces_document_id','replacement_reason','is_multipart','parts_count',
  'document_parts','is_scanned','has_text_layer','ocr_status','checksum_algorithm','manifest_sha256'] as const;

export async function mutateAdminBatch(inputs: AdminMutation[]): Promise<void> {
  if (inputs.length < 1 || inputs.length > 100) throw new Error('Lot limité à 100 objets.');
  const keys = inputs.map(input => `${input.table}:${input.id}`);
  if (new Set(keys).size !== keys.length || keys.some(key=>pending.has(key))) throw new Error('Objet dupliqué ou sauvegarde déjà en cours.');
  keys.forEach(key=>pending.add(key));
  try {
    await requireAdminPersistence();
    const {data:identity}=await supabase.auth.getUser();
    if(!identity.user) throw new Error('Authentication required');
    const rows = await Promise.all(inputs.map(async(input,index) => {
      const retryKey=`${identity.user.id}:${keys[index]}`;
      const payload = await digest({revision:input.revision,patch:input.patch,reason:input.reason});
      const retry = readRetry(retryKey);
      const operationId = input.operationId || (retry?.payload === payload ? retry.id : crypto.randomUUID());
      keepRetry(retryKey,{payload,id:operationId});
      return {...input,operationId};
    }));
    const {data,error} = await supabase.rpc('admin_mutate_batch',{p_rows:rows});
    if (error) throw new Error(adminErrorMessage(error));
    if (!Array.isArray(data) || data.length !== inputs.length) throw new Error('Confirmation du lot invalide.');
    for (const [index,input] of inputs.entries()) {
      if(data[index]?._operation?.changed) throw new Error('Conflit : un élément du lot confirmé a changé. Rechargez ; aucune nouvelle écriture effectuée.');
      if(data[index]?.id!==input.id || !Number.isInteger(data[index]?.revision) || data[index]?._operation?.original?.revision!==data[index].revision || data[index]?._operation?.id!==rows[index].operationId) throw new Error('Confirmation du lot invalide.');
      const reread = await supabase.from(input.table).select('*').eq('id',input.id).single();
      if (reread.error || reread.data?.id!==input.id || reread.data.revision !== data[index].revision) throw new Error('Lot confirmé, relecture indisponible ou conflit. Réessayez le même lot sans modifier son contenu.');
    }
  } finally { keys.forEach(key=>pending.delete(key)); }
}

export function parseAdminCsv(text: string): Record<string,string>[] {
  if (new TextEncoder().encode(text).length>1_000_000) throw new Error('CSV limité à 1 Mo.');
  const input = text.replace(/^\uFEFF/,'');
  const separator = input.split(/\r?\n/,1)[0].includes(';') ? ';' : ',';
  const rows: string[][] = []; let row: string[]=[]; let cell=''; let quoted=false;
  for (let index=0;index<input.length;index++) {
    const char=input[index];
    if (char==='"') {
      if (quoted && input[index+1]==='"') {cell+='"';index++;} else quoted=!quoted;
    } else if (!quoted && char===separator) {row.push(cell.trim());cell='';}
    else if (!quoted && char==='\n') {row.push(cell.trim());if(row.some(Boolean)) rows.push(row);row=[];cell='';}
    else if (char!=='\r') cell+=char;
  }
  if (quoted) throw new Error('Guillemets CSV non fermés.');
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  const header=rows.shift()?.map(key=>key.toLowerCase()) || [];
  if (new Set(header).size!==header.length || !header.length || rows.length<1 || rows.length>100) throw new Error('En-têtes uniques et 1 à 100 lignes requis.');
  return rows.map((values,index)=>{
    if(values.length!==header.length) throw new Error(`Ligne ${index+2} : nombre de colonnes invalide.`);
    return Object.fromEntries(header.map((key,position)=>[key,values[position]]));
  });
}

export function summarizeCsvAmounts(rows: Record<string,string>[], field='budget_amount_fcfa') {
  let unknownAmountCount=0, invalidAmountCount=0, knownAmountFcfa=0;
  for(const row of rows) {
    const value=row[field]?.trim();
    if(!value) unknownAmountCount++;
    else if(!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) invalidAmountCount++;
    else knownAmountFcfa+=Number(value);
  }
  if(!Number.isSafeInteger(knownAmountFcfa)) throw new Error('Somme hors de la précision entière autorisée.');
  return {unknownAmountCount,invalidAmountCount,knownAmountFcfa,totalAmountFcfa:unknownAmountCount || invalidAmountCount ? null : knownAmountFcfa};
}

export async function importAdminCsv(table: 'budget_projects' | 'budget_lines' | 'caidp_directory', text: string): Promise<number> {
  await requireAdminPersistence();
  const rows = parseAdminCsv(text);
  if(table!=='caidp_directory') {
    const summary=summarizeCsvAmounts(rows,table==='budget_projects' ? 'budget_amount_fcfa' : 'amount');
    if(summary.invalidAmountCount) throw new Error(`0 ligne intégrée ; ${rows.length} lignes rejetées (lot atomique) : ${summary.invalidAmountCount} montant invalide ; ${summary.unknownAmountCount} montant inconnu. Somme connue partielle : ${summary.knownAmountFcfa} FCFA.`);
  }
  const existing = await readAdminRows(table);
  const mutations: AdminMutation[]=[];
  for (const [index,row] of rows.entries()) {
    const fields=table==='budget_projects' ? projectFields : table==='budget_lines' ? budgetLineFields : directoryFields;
    const required=table==='budget_projects' ? ['title','commune_name','region_name','category','fiscal_year','source_url'] : table==='budget_lines' ? ['budget_id','line_label','source_document_id','source_page'] : ['company_name','category','region','source'];
    if(Object.keys(row).some(key=>!['id','revision',...fields].includes(key))) throw new Error(`Ligne ${index+2} : colonne inconnue.`);
    if(required.some(key=>!row[key])) throw new Error(`Ligne ${index+2} : champs obligatoires manquants (${required.join(', ')}).`);
    const patch=pickAdminFields(row,fields);
    if (table==='budget_projects') {
      patch.fiscal_year=Number(row.fiscal_year);
      patch.budget_amount_fcfa=row.budget_amount_fcfa?.trim()==='' || row.budget_amount_fcfa===undefined ? null : Number(row.budget_amount_fcfa);
      if(!Number.isInteger(patch.fiscal_year) || (patch.budget_amount_fcfa!==null && (!Number.isSafeInteger(patch.budget_amount_fcfa) || Number(patch.budget_amount_fcfa)<0))) throw new Error(`Ligne ${index+2} : exercice ou montant invalide.`);
      patch.progress_percentage=Number(row.progress_percentage || '0');
      patch.current_status=patch.progress_percentage ? 'IN_PROGRESS' : 'NOT_STARTED';
      patch.nature_expense=row.nature_expense || 'Investissements';
      if(row.source_page) patch.source_page=Number(row.source_page);
    } else if(table==='budget_lines') {
      patch.amount=row.amount?.trim()==='' || row.amount===undefined ? null : Number(row.amount);
      patch.source_page=Number(row.source_page);
      if((patch.amount!==null && (!Number.isSafeInteger(patch.amount) || Number(patch.amount)<0)) || !Number.isInteger(patch.source_page) || Number(patch.source_page)<1) throw new Error(`Ligne ${index+2} : montant ou page invalide.`);
      if(!row.linked_project_id) delete patch.linked_project_id;
    } else patch.verification_status='TO_VERIFY';
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${table}:${JSON.stringify(patch)}`));
    const hash=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
    const id=row.id || `csv-${hash}`;
    const current=existing.find(item=>item.id===id);
    if(current && !row.id) continue;
    if(current && Number(row.revision)!==current.revision) throw new Error(`Ligne ${index+2} : revision serveur explicite requise pour la mise à jour.`);
    mutations.push({table,id,revision:current?.revision ?? null,patch,reason:'Import CSV déclaré, sans certification ni remplacement d’exercice'});
  }
  if(mutations.length) await mutateAdminBatch(mutations);
  return mutations.length;
}
