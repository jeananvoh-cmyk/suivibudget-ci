import type { AdministrativeAccount, ProcurementMatch } from '../types/administrativeAccount';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export const ADMINISTRATIVE_ACCOUNTS_DATA: AdministrativeAccount[] = [];

export async function refreshPublishedAdministrativeAccounts(): Promise<void> {
  ADMINISTRATIVE_ACCOUNTS_DATA.splice(0);
  if (!isSupabaseConfigured()) return;
  const { data, error } = await supabase.from('administrative_accounts')
    .select('*, operations:ca_investment_operations(*, matches:ca_procurement_matches(*))')
    .eq('status', 'PUBLISHED');
  if (error) throw error;
  const accounts: AdministrativeAccount[] = (data || []).map(row => ({
    ...row,
    operations: row.operations.map((operation: AdministrativeAccount['operations'][number] & { matches: ProcurementMatch[] }) => ({
      ...operation,
      procurement_match: operation.matches.length === 1 ? operation.matches[0] : undefined,
    })),
  }));
  ADMINISTRATIVE_ACCOUNTS_DATA.push(...accounts);
}

const clean = (s: string) => s.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/^(mairie|conseil\s+regional|district)\s+(de\s+|du\s+|des\s+|d'|de\s+la\s+)?/i, '')
  .trim();

export function getAdministrativeAccountsForInstitution(institutionIdOrName: string): AdministrativeAccount[] {
  if (!institutionIdOrName) return [];
  const target = clean(institutionIdOrName);
  return ADMINISTRATIVE_ACCOUNTS_DATA.filter(ca => {
    if (ca.institution_id === institutionIdOrName) return true;
    const caName = clean(ca.institution_name);
    return caName === target || caName.includes(target) || (target.length >= 4 && target.includes(caName));
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
