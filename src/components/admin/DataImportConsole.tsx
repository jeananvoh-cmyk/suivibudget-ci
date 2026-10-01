import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { listImports, parseImportInput, reviewImport, runImport, type ImportReport, type ImportRow } from '../../services/dataImportService';
import { formatQualifiedFCFA } from '../../utils/formatters';
import { isSafeUrl } from '../../utils/security';

export function DataImportConsole({ role }: { role: string }) {
  const [sessionEnded, setSessionEnded] = useState(false);
  const allowed = !sessionEnded && (role === 'ADMIN' || role === 'DATA_MANAGER');
  const [text, setText] = useState('');
  const [jsonl, setJsonl] = useState(false);
  const [preview, setPreview] = useState<{ rows: unknown[]; report: ImportReport } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filter, setFilter] = useState('TO_VERIFY');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ImportRow | null>(null);
  const [history, setHistory] = useState<{ id: number; action: string; reason: string; created_at: string }[]>([]);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const button = 'min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue disabled:opacity-50';
  const input = 'w-full min-h-[44px] rounded-lg border border-slate-300 bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue';

  useEffect(() => {
    let active = true;
    setRows([]); setSelected(null); setHistory([]);
    if (allowed) listImports(filter, page).then(result => { if (active) setRows(result); }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [allowed, filter, page, revision]);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { setSessionEnded(true); setRows([]); setSelected(null); setHistory([]); setText(''); setReport(null); setPreview(null); }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    setHistory([]); setReason(''); setConfirmed(false);
    if (allowed && selected) void supabase.from('data_import_events').select('id,action,reason,created_at').eq('row_id', selected.id).order('created_at').order('id').then(({ data, error }) => {
      if (active) { if (error) setMessage(error.message); else setHistory(data || []); }
    });
    return () => { active = false; };
  }, [allowed, selected]);

  const execute = async (run: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await run(); } catch (error) { setMessage(error instanceof Error ? error.message : (error as { message?: string }).message || 'Action non confirmée.'); }
    finally { setBusy(false); }
  };
  if (!allowed) return <p role="status">Accès réservé aux gestionnaires de données.</p>;

  return <section className="space-y-6 text-sm text-slate-800" aria-label="Console données">
    <header><h2 className="text-2xl font-bold">Console données</h2><p className="mt-2">Simuler un lot, relire ses sources, puis décider de sa publication. Vérifié ne signifie pas publié.</p></header>
    <p role="status" aria-live="polite" className="break-words">{busy ? 'Traitement en cours…' : message}</p>
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-bold">Nouveau lot privé</h3>
      <label className="block">Fichier JSON ou JSONL (100 lignes, 1 Mo maximum)<input className={input} type="file" accept=".json,.jsonl" disabled={busy} onChange={event => {
        const file = event.target.files?.[0]; if (!file) return;
        setPreview(null); setReport(null);
        void execute(async () => { if (file.size > 1_000_000) throw new Error('Lot limité à 1 Mo.'); setText(await file.text()); setJsonl(file.name.endsWith('.jsonl')); });
      }} /></label>
      <label className="block">Contenu du lot<textarea aria-label="Contenu du lot" rows={7} className={`${input} font-mono text-xs`} value={text} disabled={busy} onChange={event => { setText(event.target.value); setPreview(null); setReport(null); }} /></label>
      <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={jsonl} disabled={busy} onChange={event => { setJsonl(event.target.checked); setPreview(null); setReport(null); }} />Une ligne JSON par ligne (JSONL)</label>
      <div className="flex flex-wrap gap-3">
        <button className={button} disabled={busy || !text.trim()} onClick={() => void execute(async () => {
          setPreview(null); const parsed = parseImportInput(text, jsonl); const result = await runImport(parsed); setReport(result); setPreview({ rows: parsed, report: result });
        })}>Simuler sans écrire</button>
        <button className={`${button} bg-slate-900 text-white`} disabled={busy || !preview?.report.counts.ready} onClick={() => void execute(async () => {
          if (!preview) return;
          const plan = preview; setPreview(null);
          const result = await runImport(plan.rows, plan.report.plan_hash); setReport(result); setRevision(value => value + 1); setMessage('Import terminé. Les lignes restent privées jusqu’à publication explicite.');
        })}>Importer les lignes prêtes</button>
      </div>
      <details><summary className="min-h-[44px] cursor-pointer py-3 font-semibold">Format et règles du lot</summary><p>Chaque ligne contient kind (BP/CA/OPERATION/DGMP), institution_id, institution_type, fiscal_year, source (name, reference, date, date_kind, url facultative), data et precision par montant. UNKNOWN exige null. Aucun conflit n’est écrasé. Les données existantes ne sont pas remplacées.</p></details>
      {report && <div aria-label="Rapport du lot" className="space-y-3">
        <p className="font-semibold">{report.dry_run ? 'Simulation' : 'Import'} — Prêtes : {report.counts.ready} · Importées : {report.counts.imported} · Ignorées : {report.counts.ignored} · Conflits : {report.counts.conflicts} · Erreurs : {report.counts.errors}</p>
        {report.rows.map(row => <details key={row.line} className="rounded-lg border border-slate-200 p-3 [overflow-wrap:anywhere]"><summary className="min-h-[44px] cursor-pointer">Ligne {row.line} — {row.status}</summary><p>{row.message || row.id}</p><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(preview?.rows[row.line - 1], null, 2)}</pre></details>)}
      </div>}
    </div>
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-bold">Imports et décisions</h3>
      <label className="block max-w-sm">Statut<select aria-label="Statut" className={input} value={filter} disabled={busy} onChange={event => { setFilter(event.target.value); setPage(0); }}>{['TO_VERIFY','VERIFIED','PUBLISHED','REJECTED','ALL'].map(status => <option key={status}>{status}</option>)}</select></label>
      {!rows.length && <p>Aucun import dans cette sélection.</p>}
      <div className="grid gap-3 lg:grid-cols-2">{rows.map(row => <button key={row.id} className={`${button} text-left [overflow-wrap:anywhere]`} disabled={busy} onClick={() => setSelected(row)}><strong>{row.payload.kind} · {row.payload.institution_id} · {row.payload.fiscal_year}</strong><span className="block">{row.status} — {row.payload.source.name}</span><span className="block text-xs">{row.id}</span></button>)}</div>
      <div className="flex flex-wrap items-center gap-3"><button className={button} disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Précédent</button><span>Page {page + 1}</span><button className={button} disabled={busy || rows.length < 25} onClick={() => setPage(value => value + 1)}>Suivant</button></div>
      {selected && <article className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4 [overflow-wrap:anywhere]" aria-label="Détail import">
        <h4 className="font-bold">{selected.payload.kind} — {selected.status}</h4><p>{selected.id}</p>
        <p>{selected.payload.institution_id} · {selected.payload.institution_type} · Exercice {selected.payload.fiscal_year}</p>
        <p>Source : {selected.payload.source.name}<br />Référence : {selected.payload.source.reference}<br />Date : {selected.payload.source.date} ({selected.payload.source.date_kind})</p>
        {selected.payload.source.url && isSafeUrl(selected.payload.source.url) && <a className="underline" href={selected.payload.source.url} target="_blank" rel="noopener noreferrer">Consulter la source</a>}
        <dl className="space-y-2">{Object.entries(selected.payload.data).map(([field, value]) => <div key={field}><dt className="font-semibold">{field}</dt><dd>{selected.payload.precision[field] ? formatQualifiedFCFA(typeof value === 'number' ? value : null, selected.payload.precision[field]) : String(value ?? 'Non renseigné')}</dd></div>)}</dl>
        {['TO_VERIFY','VERIFIED'].includes(selected.status) && <>
          <label className="block">Motif et référence de relecture<textarea aria-label="Motif et référence de relecture" className={input} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
          {selected.status === 'VERIFIED' && <label className="flex min-h-[44px] items-start gap-3"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />J’ai relu les sources et les précisions ; je confirme la diffusion publique de cette ligne.</label>}
          <div className="flex flex-wrap gap-3">{(selected.status === 'TO_VERIFY' ? ['VERIFY','REJECT'] as const : ['PUBLISH','REJECT'] as const).map(action => <button key={action} className={button} disabled={busy || reason.trim().length < 5 || (action === 'PUBLISH' && !confirmed)} onClick={() => void execute(async () => { await reviewImport(selected.id, action, reason, confirmed); setRevision(value => value + 1); setMessage(action === 'PUBLISH' ? 'Publication confirmée.' : 'Décision enregistrée.'); })}>{action === 'VERIFY' ? 'Vérifier' : action === 'PUBLISH' ? 'Publier explicitement' : 'Rejeter'}</button>)}</div>
        </>}
        <h5 className="font-semibold">Historique privé</h5>{history.map(event => <p key={event.id}>{event.created_at} · {event.action} — {event.reason}</p>)}
      </article>}
    </div>
  </section>;
}
