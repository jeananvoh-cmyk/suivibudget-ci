import React, { useEffect, useState } from 'react';
import type { ApecDecision, ApecEvent, ApecContribution, BudgetProject } from '../types';
import { createApecCycle, loadApec, loadApecHistory, recordApecDecision, submitApecContribution, submitApecNeed } from '../services/apecService';
import { supabase } from '../services/supabase';

const labels: Record<string,string> = {
  SUBMITTED:'Besoin reçu', TO_VERIFY:'À vérifier', VERIFIED:'Vérifié — reste une contribution citoyenne', REJECTED:'Non retenu après vérification',
  PRIORITIZED:'Priorisé', LINKED:'Rattaché au budget / projet', ANSWERED:'Réponse institutionnelle enregistrée',
  VERIFY:'Vérifier le besoin', REJECT:'Rejeter le besoin', PRIORITIZE:'Prioriser', LINK:'Rattacher', RESPONSE:'Consigner une réponse institutionnelle',
  FOLLOW_UP:'Consigner un suivi', CONTRIBUTION:'Contribution reçue', VERIFY_CONTRIBUTION:'Vérifier une contribution', REJECT_CONTRIBUTION:'Rejeter une contribution',
};
const inputClass='mt-1 block w-full min-h-[44px] rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600';
const buttonClass='min-h-[44px] rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

export function ApecParticipation({ project }: { project: BudgetProject }) {
  const [data,setData]=useState<Awaited<ReturnType<typeof loadApec>> | null>(null);
  const [selected,setSelected]=useState('');
  const [events,setEvents]=useState<ApecEvent[]>([]);
  const [contributions,setContributions]=useState<ApecContribution[]>([]);
  const [revision,setRevision]=useState(0);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [loadError,setLoadError]=useState(false);
  const [action,setAction]=useState<ApecDecision>('VERIFY');
  const [createAccount,setCreateAccount]=useState(false);
  const [targets,setTargets]=useState<{projects:{id:string,title:string}[];budgets:{id:string}[]}>({projects:[],budgets:[]});

  useEffect(() => {
    const { data: listener }=supabase.auth.onAuthStateChange(() => { setData(null); setEvents([]); setContributions([]); setRevision(v=>v+1); });
    return () => listener.subscription.unsubscribe();
  },[]);

  useEffect(() => {
    let active=true;
    setLoadError(false);
    loadApec(project.institution_id!,project.fiscal_year).then(result=>{if(active)setData(result);}).catch(()=>{if(active){setData(null);setLoadError(true);}});
    return ()=>{active=false;};
  },[project.institution_id,project.fiscal_year,revision]);

  useEffect(()=>{
    let active=true;
    setEvents([]); setContributions([]);
    if(selected && data?.signedIn) loadApecHistory(selected,data.canManage).then(result=>{if(active){setEvents(result.events);setContributions(result.contributions);}}).catch(()=>{if(active)setMessage('Historique indisponible. Réessayez.');});
    return ()=>{active=false;};
  },[selected,data,revision]);

  useEffect(()=>{
    let active=true;
    setTargets({projects:[],budgets:[]});
    if(data?.canManage) supabase.rpc('apec_link_targets',{p_institution_id:project.institution_id,p_fiscal_year:project.fiscal_year})
      .then(({data:links,error})=>{if(active){if(error)setMessage('Rattachements indisponibles. Réessayez.');else setTargets(links);}});
    return ()=>{active=false;};
  },[data?.canManage,project.institution_id,project.fiscal_year]);

  async function run(event: React.FormEvent<HTMLFormElement>, operation:(form:FormData)=>Promise<string>) {
    event.preventDefault();
    const form=event.currentTarget;
    setBusy(true); setMessage('');
    try { setMessage(await operation(new FormData(form))); form.reset(); setRevision(v=>v+1); }
    catch { setMessage('Action refusée ou service indisponible. Vérifiez les informations, le statut et les sources, puis réessayez.'); }
    finally { setBusy(false); }
  }
  const sourceFields=<>
    <label className="block">Source / référence du document ou du constat<input name="source" required minLength={3} maxLength={1000} className={inputClass}/></label>
    <label className="block">Date de la source<input name="date" type="date" required className={inputClass}/></label>
  </>;
  const need=data?.needs.find(n=>n.id===selected);

  return <section aria-label="Participation APEC" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <h3 className="text-lg font-bold">Besoins citoyens et suivi APEC</h3>
    <p className="text-sm text-slate-600">La participation observée ne représente pas l’ensemble de la population. Une contribution citoyenne, même vérifiée, n’est pas une donnée officielle. Une priorité ne constitue pas une décision de financement.</p>
    <p className="text-sm text-slate-600">Les besoins et contributions de ce premier dispositif sont privés : accessibles à leur auteur et aux gestionnaires habilités. Chaque dépôt conserve un identifiant et un historique.</p>
    {loadError ? <button className={buttonClass} onClick={()=>setRevision(v=>v+1)}>Réessayer le chargement APEC</button> : !data ? <p role="status">Chargement du suivi…</p> : <>
      {!data.cycles.length && <p>Aucun cycle documenté pour cette collectivité et cet exercice. Cela ne prouve pas l’absence de participation locale.</p>}
      {data.cycles.map(c=><p key={c.id} className="text-sm break-words"><strong>{c.title}</strong> — {c.status==='OPEN'?'Ouvert':'Clos'} · {c.fiscal_year}<br/>Source : {c.source_reference} · {c.source_date}</p>)}
      {!data.signedIn && <details><summary className="min-h-[44px] cursor-pointer font-semibold focus-visible:outline">Se connecter pour participer</summary>
        <form className="space-y-3" onSubmit={e=>void run(e,async f=>{
          const credentials={email:String(f.get('email')),password:String(f.get('password'))};
          const result=createAccount ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword(credentials);
          if(result.error) throw result.error;
          return createAccount && !result.data.session ? 'Consultez votre messagerie pour confirmer votre inscription si une confirmation est requise, puis connectez-vous.' : 'Connexion établie.';
        })}>
          <label className="block">Adresse e-mail<input name="email" type="email" autoComplete="email" required className={inputClass}/></label>
          <label className="block">Mot de passe<input name="password" type="password" autoComplete={createAccount?'new-password':'current-password'} minLength={createAccount?12:1} required className={inputClass}/></label>
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={createAccount} onChange={e=>setCreateAccount(e.target.checked)}/>Créer un compte citoyen (mot de passe de 12 caractères minimum)</label>
          <button disabled={busy} className={buttonClass}>{createAccount?'Créer mon compte':'Me connecter'}</button>
        </form></details>}
      {data.signedIn && <button type="button" disabled={busy} className="min-h-[44px] text-sm text-blue-700 underline focus-visible:outline" onClick={()=>{void supabase.auth.signOut().then(({error})=>{if(error)setMessage('Déconnexion indisponible. Réessayez.');else{setSelected('');setMessage('Déconnexion effectuée.');}});}}>Me déconnecter</button>}
      {data.canManage && <details><summary className="min-h-[44px] cursor-pointer font-semibold focus-visible:outline">Ouvrir un cycle documenté</summary>
        <form className="space-y-3" onSubmit={e=>void run(e,async f=>{await createApecCycle({institution_id:project.institution_id!,fiscal_year:project.fiscal_year,title:String(f.get('title')),source_reference:String(f.get('source')),source_date:String(f.get('date'))});return 'Cycle enregistré.';})}>
          <label className="block">Intitulé du cycle<input name="title" required minLength={3} maxLength={240} className={inputClass}/></label>{sourceFields}<button disabled={busy} className={buttonClass}>Ouvrir le cycle</button>
        </form></details>}
      {data.signedIn && data.cycles.some(c=>c.status==='OPEN') && <details><summary className="min-h-[44px] cursor-pointer font-semibold focus-visible:outline">Déposer un besoin citoyen</summary>
        <form className="space-y-3" onSubmit={e=>void run(e,async f=>{const id=await submitApecNeed({cycle_id:String(f.get('cycle')),title:String(f.get('title')),description:String(f.get('body')),source_reference:String(f.get('source')),source_date:String(f.get('date'))});setSelected(id);return `Besoin reçu : ${id}. À vérifier.`;})}>
          <label className="block">Cycle<select name="cycle" required className={inputClass}>{data.cycles.filter(c=>c.status==='OPEN').map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          <label className="block">Besoin<input name="title" required minLength={3} maxLength={240} className={inputClass}/></label>
          <label className="block">Description factuelle<textarea name="body" required minLength={3} maxLength={4000} className={inputClass}/></label>{sourceFields}<button disabled={busy} className={buttonClass}>Envoyer le besoin</button>
        </form></details>}
      {data.signedIn && <label className="block">{data.canManage?'Besoins à suivre':'Mes besoins'}<select value={selected} onChange={e=>setSelected(e.target.value)} className={inputClass}><option value="">Choisir un besoin</option>{data.needs.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select></label>}
      {need && <div className="space-y-4 break-words">
        <p><strong>{need.title}</strong><br/>{need.description}</p><p className="text-sm">Identifiant : {need.id}<br/>{labels[need.status]} · {labels[need.verification_status]}<br/>Source citoyenne : {need.source_reference} · {need.source_date}</p>
        <p className="text-sm">Priorité : {need.priority ?? 'Non définie'} · Projet : {need.project_id ?? 'Non relié'} · Budget : {need.local_budget_id ?? 'Non relié'}</p>
        {data.cycles.some(c=>c.id===need.cycle_id && c.status==='OPEN') && need.verification_status!=='REJECTED' && <details><summary className="min-h-[44px] cursor-pointer font-semibold focus-visible:outline">Ajouter une contribution</summary>
          <form className="space-y-3" onSubmit={e=>void run(e,async f=>{const id=await submitApecContribution({need_id:need.id,body:String(f.get('body')),source_reference:String(f.get('source')),source_date:String(f.get('date'))});return `Contribution reçue : ${id}. À vérifier.`;})}>
            <label className="block">Contribution factuelle<textarea name="body" required minLength={3} maxLength={4000} className={inputClass}/></label>{sourceFields}<button disabled={busy} className={buttonClass}>Envoyer la contribution</button>
          </form></details>}
        {contributions.map(c=><p key={c.id} className="rounded-lg bg-slate-50 p-3 text-sm">{c.body}<br/>Contribution {c.id} · {labels[c.verification_status]}<br/>Source : {c.source_reference} · {c.source_date}</p>)}
        {data.canManage && <details><summary className="min-h-[44px] cursor-pointer font-semibold focus-visible:outline">Documenter une décision ou une réponse</summary>
          <form className="space-y-3" onSubmit={e=>void run(e,async f=>{await recordApecDecision({needId:need.id,action,body:String(f.get('body')),source:String(f.get('source')),date:String(f.get('date')),priority:f.get('priority')?Number(f.get('priority')):undefined,projectId:String(f.get('project')||''),budgetId:String(f.get('budget')||''),contributionId:String(f.get('contribution')||'')});return 'Décision et source ajoutées à l’historique.';})}>
            <label className="block">Action<select value={action} onChange={e=>setAction(e.target.value as ApecDecision)} className={inputClass}>{(['VERIFY','REJECT','PRIORITIZE','LINK','FOLLOW_UP','RESPONSE','VERIFY_CONTRIBUTION','REJECT_CONTRIBUTION'] as const).map(a=><option key={a} value={a}>{labels[a]}</option>)}</select></label>
            {action==='PRIORITIZE' && <label className="block">Rang documenté<input name="priority" type="number" min={1} max={999} required className={inputClass}/></label>}
            {action==='LINK' && <><label className="block">Projet de la collectivité<select name="project" className={inputClass}><option value="">Non relié</option>{targets.projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label className="block">Budget publié<select name="budget" className={inputClass}><option value="">Non relié</option>{targets.budgets.map(b=><option key={b.id}>{b.id}</option>)}</select></label></>}
            {action.endsWith('_CONTRIBUTION') && <label className="block">Contribution<select name="contribution" required className={inputClass}><option value="">Choisir</option>{contributions.filter(c=>c.verification_status==='TO_VERIFY').map(c=><option key={c.id} value={c.id}>{c.body.slice(0,80)}</option>)}</select></label>}
            <label className="block">Motif / texte de la réponse<textarea name="body" required minLength={3} maxLength={4000} className={inputClass}/></label>{sourceFields}
            {action==='RESPONSE' && <p className="text-sm">Consigner uniquement une réponse institutionnelle reçue et sourcée. Elle ne constitue pas une validation citoyenne indépendante.</p>}
            <button disabled={busy} className={buttonClass}>Enregistrer dans l’historique</button>
          </form></details>}
        <h4 className="font-bold">Historique du besoin</h4>
        <ol className="space-y-3">{events.map(e=><li key={e.id} className="rounded-lg border border-slate-200 p-3 text-sm"><strong>{labels[e.kind]}</strong> · {new Date(e.created_at).toLocaleString('fr-FR')}<p>{e.body}</p><p>Source : {e.source_reference} · {e.source_date}</p><p>{e.provenance==='INSTITUTION_RESPONSE'?'Réponse institutionnelle, sans validation indépendante':e.provenance==='CITIZEN_OBSERVATION'?'Contribution citoyenne':'Traitement documenté par SuiviBudget'}</p>{e.kind==='LINK' && <p>Projet : {e.decision_data.project_id || 'Non relié'} · Budget : {e.decision_data.local_budget_id || 'Non relié'}</p>}{e.kind==='PRIORITIZE' && <p>Rang : {e.decision_data.priority}</p>}</li>)}</ol>
      </div>}
    </>}
    <p role="status" className="break-words text-sm">{message}</p>
  </section>;
}
