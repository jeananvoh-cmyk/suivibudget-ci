import { supabase } from './supabase';
import type { ImportProvenance } from '../types/localBudget';

export interface ImportRow {
  id: string;
  status: 'TO_VERIFY' | 'VERIFIED' | 'PUBLISHED' | 'REJECTED';
  created_at: string;
  payload: { kind: string; institution_id: string; institution_type: string; fiscal_year: number; source: NonNullable<ImportProvenance['source']>; data: Record<string, unknown>; precision: ImportProvenance['precision'] };
}
export interface ImportReport {
  dry_run: boolean;
  plan_hash: string;
  counts: { ready: number; imported: number; ignored: number; conflicts: number; errors: number };
  rows: { line: number; id: string | null; status: string; message: string | null }[];
}
export function parseImportInput(text: string, jsonl: boolean): unknown[] {
  if (new TextEncoder().encode(text).length > 1_000_000) throw new Error('Lot limité à 1 Mo.');
  const rows = jsonl ? text.trimEnd().split(/\r?\n/).map(line => { try { return JSON.parse(line); } catch { return null; } }) : JSON.parse(text);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) throw new Error('Le lot doit contenir de 1 à 100 lignes.');
  return rows;
}
export async function runImport(rows: unknown[], planHash?: string): Promise<ImportReport> {
  const { data, error } = await supabase.rpc('import_data_batch', { p_rows: rows, p_commit: !!planHash, p_plan_hash: planHash || null });
  if (error) throw error;
  return data;
}
export async function listImports(status: string, page: number): Promise<ImportRow[]> {
  let query = supabase.from('data_import_rows').select('*').order('created_at', { ascending: false }).order('id').range(page * 25, page * 25 + 24);
  if (status !== 'ALL') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
export async function reviewImport(id: string, action: 'VERIFY' | 'PUBLISH' | 'REJECT', reason: string, confirmed: boolean): Promise<void> {
  if (action === 'PUBLISH' && !confirmed) throw new Error('Confirmez explicitement la publication.');
  const { data, error } = await supabase.rpc('review_data_import', { p_ids: [id], p_action: action, p_reason: reason, p_publish_confirmed: confirmed });
  if (error) throw error;
  if (data.rows[0]?.status === 'ERROR') throw new Error(data.rows[0].message);
}
