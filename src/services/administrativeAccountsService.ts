import { supabase, isSupabaseConfigured } from './supabase';
import { AdministrativeAccount, CAInvestmentOperation, InstitutionResponse, ProcurementMatch } from '../types';
import type { LocalBudget } from '../types/localBudget';
import { amountPrecision } from '../utils/formatters';
import { hydrateAdministrativeAccountFromRow } from '../utils/budgetDocumentDryRun';

export async function fetchPublishedLocalBudgets(): Promise<LocalBudget[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('local_budgets').select('*').eq('status', 'PUBLISHED');
  if (error) {
    console.warn("Could not fetch published local budgets:", error.message);
    return [];
  }
  return (data || []).map(row => {
    const totalAmount = row.total_amount != null ? Number(row.total_amount) : null;
    const operatingAmount = row.operating_amount != null ? Number(row.operating_amount) : null;
    const investmentAmount = row.investment_amount != null ? Number(row.investment_amount) : null;
    return {
      ...row,
      total_amount: totalAmount,
      operating_amount: operatingAmount,
      investment_amount: investmentAmount,
      operating_percentage:
        totalAmount != null &&
        totalAmount > 0 &&
        operatingAmount != null &&
        amountPrecision(row, 'total_amount') === 'EXACT' &&
        amountPrecision(row, 'operating_amount') === 'EXACT'
          ? (operatingAmount / totalAmount) * 100
          : null,
      investment_percentage:
        totalAmount != null &&
        totalAmount > 0 &&
        investmentAmount != null &&
        amountPrecision(row, 'total_amount') === 'EXACT' &&
        amountPrecision(row, 'investment_amount') === 'EXACT'
          ? (investmentAmount / totalAmount) * 100
          : null,
      sources: [],
      primary_source_label: row.import_provenance?.source?.name || row.document_name,
      primary_source_url: row.import_provenance?.source?.url || row.document_url,
    };
  }) as LocalBudget[];
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
      planned_amount: op.planned_amount != null ? Number(op.planned_amount) : null,
      executed_amount: op.executed_amount != null ? Number(op.executed_amount) : null,
      procurement_match: matchByOperation.get(op.id),
    } as CAInvestmentOperation;
    const list = operationsByCA.get(op.ca_id) || [];
    list.push(mapped);
    operationsByCA.set(op.ca_id, list);
  }

  let publishedResponses: InstitutionResponse[] = [];
  try {
    const { data: respData, error: respError } = await supabase
      .from('ca_institution_responses')
      .select('*')
      .in('ca_id', caIds)
      .eq('response_status', 'PUBLISHED')
      .order('response_date', { ascending: false });
    if (!respError && Array.isArray(respData)) {
      publishedResponses = respData as InstitutionResponse[];
    }
  } catch {
    publishedResponses = [];
  }

  const responsesByCA = new Map<string, InstitutionResponse[]>();
  for (const resp of publishedResponses) {
    if (!resp.ca_id) continue;
    const list = responsesByCA.get(resp.ca_id) || [];
    list.push(resp);
    responsesByCA.set(resp.ca_id, list);
  }

  return accounts.map(account => {
    const caResponses = responsesByCA.get(account.id) || [];
    const primaryResponse = caResponses.find(r => !r.operation_id) || caResponses[0];
    return hydrateAdministrativeAccountFromRow({
      ...account,
      institution_response: primaryResponse,
      institution_responses: caResponses.length > 0 ? caResponses : undefined,
      operations: operationsByCA.get(account.id) || [],
    });
  }) as AdministrativeAccount[];
}
