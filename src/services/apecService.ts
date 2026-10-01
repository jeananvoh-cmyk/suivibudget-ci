import { supabase } from './supabase';
import type { ApecContribution, ApecCycle, ApecDecision, ApecEvent, ApecNeed, ApecPublicNeed } from '../types';

export async function loadApec(institutionId: string, fiscalYear: number) {
  const { data: { user } } = await supabase.auth.getUser();
  const cycles = await supabase.from('apec_cycles').select('*').eq('institution_id', institutionId).eq('fiscal_year', fiscalYear).order('created_at');
  if (cycles.error) throw cycles.error;
  const publicNeeds = await supabase.from('apec_public_needs').select('*').eq('institution_id',institutionId).eq('fiscal_year',fiscalYear).eq('status','PUBLISHED').order('reviewed_at',{ascending:false});
  if(publicNeeds.error) throw publicNeeds.error;
  let canManage = false;
  let needs: ApecNeed[] = [];
  if (user) {
    const profile = await supabase.from('profiles').select('role,is_active').eq('id', user.id).single();
    if (profile.error) throw profile.error;
    canManage = profile.data.is_active && ['ADMIN','DATA_MANAGER'].includes(profile.data.role);
    if (cycles.data.length) {
      let query = supabase.from('apec_needs').select('*').in('cycle_id', cycles.data.map(c => c.id)).order('created_at');
      if (!canManage) query = query.eq('user_id', user.id);
      const result = await query;
      if (result.error) throw result.error;
      needs = result.data as ApecNeed[];
    }
  }
  return { cycles: cycles.data as ApecCycle[], publicNeeds: publicNeeds.data as ApecPublicNeed[], needs, canManage, signedIn: Boolean(user) };
}

export async function loadApecHistory(needId: string, canManage = false) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { events: [], contributions: [] };
  let contributionQuery = supabase.from('apec_contributions').select('id,need_id,body,source_reference,source_date,verification_status,provenance,created_at').eq('need_id',needId).order('created_at');
  if (!canManage) contributionQuery = contributionQuery.eq('user_id',user.id);
  const [events, contributions] = await Promise.all([
    supabase.from('apec_events').select('id,need_id,contribution_id,kind,body,source_reference,source_date,provenance,created_at,decision_data').eq('need_id',needId).order('sequence'),
    contributionQuery,
  ]);
  if (events.error) throw events.error;
  if (contributions.error) throw contributions.error;
  return { events: events.data as ApecEvent[], contributions: contributions.data as ApecContribution[] };
}

export async function createApecCycle(input: Pick<ApecCycle,'institution_id'|'fiscal_year'|'title'|'source_reference'|'source_date'>) {
  const { error } = await supabase.from('apec_cycles').insert(input);
  if (error) throw error;
}

export async function submitApecNeed(input: Pick<ApecNeed,'cycle_id'|'title'|'description'|'source_reference'|'source_date'>) {
  const { data, error } = await supabase.from('apec_needs').insert(input).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function submitApecContribution(input: Pick<ApecContribution,'need_id'|'body'|'source_reference'|'source_date'>) {
  const { data, error } = await supabase.from('apec_contributions').insert(input).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function recordApecDecision(input: { needId: string; action: ApecDecision; body: string; source: string; date: string; priority?: number; projectId?: string; budgetId?: string; contributionId?: string }) {
  const { error } = await supabase.rpc('record_apec_decision', {
    p_need_id:input.needId, p_action:input.action, p_body:input.body, p_source_reference:input.source, p_source_date:input.date,
    p_priority:input.priority ?? null, p_project_id:input.projectId || null, p_local_budget_id:input.budgetId || null, p_contribution_id:input.contributionId || null,
  });
  if (error) throw error;
}

export async function publishApecNeed(input: {needId:string;title:string;summary:string;source:string;date:string;privacyReviewed:boolean}) {
  const {error}=await supabase.rpc('publish_apec_need',{p_need_id:input.needId,p_title:input.title,p_summary:input.summary,p_source_reference:input.source,p_source_date:input.date,p_privacy_reviewed:input.privacyReviewed});
  if(error) throw error;
}

export async function withdrawApecNeed(needId:string,reason:string) {
  const {error}=await supabase.rpc('withdraw_apec_need',{p_need_id:needId,p_reason:reason});
  if(error) throw error;
}
