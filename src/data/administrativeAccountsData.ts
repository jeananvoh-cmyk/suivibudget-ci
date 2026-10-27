import type { AdministrativeAccount, ProcurementMatch } from '../types/administrativeAccount';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { hydrateAdministrativeAccountFromRow } from '../utils/budgetDocumentDryRun';

export const ADMINISTRATIVE_ACCOUNTS_DATA: AdministrativeAccount[] = [];

export async function refreshPublishedAdministrativeAccounts(): Promise<void> {
  ADMINISTRATIVE_ACCOUNTS_DATA.splice(0);
  if (!isSupabaseConfigured()) return;
  const { data, error } = await supabase.from('administrative_accounts')
    .select('*, operations:ca_investment_operations(*, matches:ca_procurement_matches(*))')
    .eq('status', 'PUBLISHED');
  if (error) throw error;
  const accounts: AdministrativeAccount[] = (data || []).map(row => hydrateAdministrativeAccountFromRow({
    ...row,
    operations: (row.operations || []).map((operation: AdministrativeAccount['operations'][number] & { matches: ProcurementMatch[] }) => ({
      ...operation,
      planned_amount: operation.planned_amount != null ? Number(operation.planned_amount) : null,
      executed_amount: operation.executed_amount != null ? Number(operation.executed_amount) : null,
      procurement_match: operation.matches?.length === 1 ? operation.matches[0] : undefined,
    })),
  }));
  ADMINISTRATIVE_ACCOUNTS_DATA.push(...accounts);
}

const clean = (s: string) => s.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/^(mairie|commune|conseil\s+regional|region|district(\s+autonome)?)\s+(de\s+|du\s+|des\s+|d'|de\s+la\s+)?/i, '')
  .replace(/[-_'’]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const detectQueryInstitutionType = (s: string): 'COMMUNE' | 'REGIONAL_COUNCIL' | null => {
  const l = (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/\b(conseil\s+regional|region)\b/.test(l)) return 'REGIONAL_COUNCIL';
  if (/\b(mairie|commune|municipal)\b/.test(l)) return 'COMMUNE';
  return null;
};

export function getAdministrativeAccountsForInstitution(institutionIdOrName: string): AdministrativeAccount[] {
  if (!institutionIdOrName) return [];
  const target = clean(institutionIdOrName);
  const targetType = detectQueryInstitutionType(institutionIdOrName);
  return ADMINISTRATIVE_ACCOUNTS_DATA.filter(ca => {
    if (ca.institution_id === institutionIdOrName) return true;
    if (targetType && ca.institution_type && ca.institution_type !== targetType) return false;
    const caName = clean(ca.institution_name);
    return Boolean(target && caName && caName === target);
  }).sort((a,b) => b.fiscal_year-a.fiscal_year);
}

export function getLatestAvailableCA(institutionIdOrName: string): AdministrativeAccount | undefined {
  return getAdministrativeAccountsForInstitution(institutionIdOrName)[0];
}

export function hasCA(institutionIdOrName: string): boolean {
  return getAdministrativeAccountsForInstitution(institutionIdOrName).length > 0;
}

export function getAvailableCAYears(institutionId: string): number[] {
  return getAdministrativeAccountsForInstitution(institutionId).map(ca => ca.fiscal_year);
}
