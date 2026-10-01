import { supabase, isSupabaseConfigured } from './supabase';
import { AdministrativeAccount, CAInvestmentOperation, ProcurementMatch } from '../types';
import type { LocalBudget } from '../types/localBudget';
import { amountPrecision } from '../utils/formatters';

export async function fetchPublishedLocalBudgets(): Promise<LocalBudget[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('local_budgets').select('*').eq('status', 'PUBLISHED');
  if (error) throw error;
  return (data || []).map(row => ({
    ...row,
    operating_percentage: row.total_amount > 0 && row.operating_amount != null && amountPrecision(row,'total_amount') === 'EXACT' && amountPrecision(row,'operating_amount') === 'EXACT' ? row.operating_amount / row.total_amount * 100 : null,
    investment_percentage: row.total_amount > 0 && row.investment_amount != null && amountPrecision(row,'total_amount') === 'EXACT' && amountPrecision(row,'investment_amount') === 'EXACT' ? row.investment_amount / row.total_amount * 100 : null,
    sources: [],
    primary_source_label: row.import_provenance?.source?.name || row.document_name,
    primary_source_url: row.import_provenance?.source?.url || row.document_url,
  })) as LocalBudget[];
}

export async function fetchAdministrativeAccounts(institutionId: string): Promise<AdministrativeAccount[]> {
  if (!isSupabaseConfigured()) return [];

  const { data: accounts, error } = await supabase
    .from('administrative_accounts')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('status', 'PUBLISHED')
    .order('fiscal_year', { ascending: false });

  if (error) throw error;
  if (!accounts?.length) return [];

  const caIds = accounts.map(a => a.id);
  const { data: operations, error: opError } = await supabase
    .from('ca_investment_operations')
    .select('*')
    .in('ca_id', caIds)
    .order('source_page', { ascending: true });
  if (opError) throw opError;

  const operationIds = (operations || []).map(o => o.id);
  let matches: any[] = [];
  if (operationIds.length) {
    const { data, error: matchError } = await supabase
      .from('ca_procurement_matches')
      .select('*')
      .in('operation_id', operationIds);
    if (matchError) throw matchError;
    matches = data || [];
  }

  const matchByOperation = new Map<string, ProcurementMatch>();
  for (const match of matches) {
    if (!matchByOperation.has(match.operation_id)) {
      matchByOperation.set(match.operation_id, match as ProcurementMatch);
    }
  }

  const operationsByCA = new Map<string, CAInvestmentOperation[]>();
  for (const op of operations || []) {
    const mapped: CAInvestmentOperation = {
      ...op,
      procurement_match: matchByOperation.get(op.id),
    } as CAInvestmentOperation;
    const list = operationsByCA.get(op.ca_id) || [];
    list.push(mapped);
    operationsByCA.set(op.ca_id, list);
  }

  return accounts.map(account => ({
    ...account,
    operations: operationsByCA.get(account.id) || [],
  })) as AdministrativeAccount[];
}
