import { supabase, isSupabaseConfigured } from './supabase';
import { AuthSecurityService } from './authSecurity';
import type { CitizenProof } from '../types';

export type ContentKind = 'projects' | 'institutions' | 'articles' | 'documents' | 'caidp' | 'settings';
export interface ContentRecord { kind: ContentKind; id: string; data: Record<string, any>; deleted: boolean; revision: number }
const revisions = new Map<string, number>();
export function requireBackend() {
  if (!isSupabaseConfigured()) throw new Error('Service indisponible. Votre modification n’a pas été envoyée.');
}
export async function requireStaff(roles: string[]) {
  requireBackend();
  await AuthSecurityService.refreshSession();
  const auth = AuthSecurityService.validateCurrentSession();
  if (!auth.user || !roles.includes(auth.user.role)) throw new Error('Accès refusé. Reconnectez-vous avec un compte habilité.');
}
export async function ensureCitizenSession() {
  requireBackend();
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error || !signed.user) throw new Error('Envoi indisponible. Votre brouillon est conservé ; réessayez ultérieurement.');
  return signed.user.id;
}

export async function readAll(table: string, order = 'id'): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from(table).select('*').order(order);
    if (table === 'civic_content') query = query.order('kind');
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw new Error('Lecture des données partagées impossible. Réessayez.');
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}
export async function readContent(): Promise<ContentRecord[]> {
  const rows = await readAll('civic_content');
  revisions.clear();
  rows.forEach(row => revisions.set(`${row.kind}/${row.id}`, row.revision));
  return rows;
}
export async function saveContentBatch(changes: Array<{ kind: ContentKind; id: string; data: object; deleted?: boolean }>) {
  requireBackend();
  if (!changes.length) return;
  const input = changes.map(change => ({ ...change, deleted: change.deleted || false,
    expected_revision: revisions.get(`${change.kind}/${change.id}`) || 0 }));
  const { data, error } = await supabase.rpc('civic_save_content', { changes: input });
  if (error) throw new Error(error.code === '40001'
    ? 'Cette fiche a été modifiée par un collègue. Actualisez la page avant de recommencer.'
    : 'Enregistrement refusé ou indisponible. Aucune modification confirmée.');
  if (!Array.isArray(data) || data.length !== input.length) throw new Error('Confirmation serveur incomplète. Actualisez avant de réessayer.');
  data.forEach(row => revisions.set(`${row.kind}/${row.id}`, row.revision));
}
export async function saveContent(kind: ContentKind, id: string, data: object, deleted = false) {
  await saveContentBatch([{ kind, id, data, deleted }]);
}

export const EVIDENCE_BUCKET = 'civic-evidence';
export async function uploadEvidence(file: File, requestId: string): Promise<string> {
  const userId = await ensureCitizenSession();
  if (file.size > 25 * 1024 * 1024 || file.size === 0) throw new Error('Fichier vide ou supérieur à 25 Mo.');
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
  const extension = extensions[file.type];
  if (!extension) throw new Error('Format de fichier non accepté.');
  const path = `${userId}/${requestId}.${extension}`;
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Le fichier n’a pas pu être transmis. Réessayez.');
  return path;
}
export async function readProofs(): Promise<CitizenProof[]> {
  const rows = await readAll('civic_submissions');
  const paths = rows.map(row => row.evidence_path);
  const { data, error } = paths.length
    ? await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrls(paths, 300)
    : { data: [], error: null };
  if (error) throw new Error('Lecture des médias impossible. Réessayez.');
  const urls = new Map((data || []).map(item => [item.path, item.signedUrl]));
  return rows.map(row => {
    const url = urls.get(row.evidence_path) || '';
    return { ...row.data, id: row.id, verification_status: row.verification_status, created_at: row.created_at,
      is_demo: false, image_url: row.data.media_type === 'VIDEO' ? '/favicon.svg' : url,
      photo_url: row.data.media_type === 'VIDEO' ? '/favicon.svg' : url,
      video_url: row.data.media_type === 'VIDEO' ? url : undefined, confirmations_count: 0 } as CitizenProof;
  });
}
