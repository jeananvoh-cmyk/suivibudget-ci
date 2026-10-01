import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function parseImport(text, jsonl = false) {
  if (!jsonl) {
    const rows = JSON.parse(text);
    if (!Array.isArray(rows)) throw new Error('Le fichier JSON doit contenir un tableau.');
    return rows;
  }
  return text.trimEnd().split(/\r?\n/).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  });
}

async function main() {
  const [command, file, extra] = process.argv.slice(2);
  if (!['dry-run', 'import', 'list', 'verify', 'publish', 'reject'].includes(command)) {
    console.log('dry-run <lot.json|jsonl> <plan.json> | import <lot> <plan> | list | verify|publish|reject <id[,id]> "motif sourcé"');
    return;
  }
  const token = process.env.SUIVIBUDGET_ACCESS_TOKEN;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!token || !key) throw new Error('SUIVIBUDGET_ACCESS_TOKEN (session staff) et SUPABASE_ANON_KEY requis ; aucune clé service_role.');
  const request = async (path, body) => {
    const response = await fetch(`https://cdesuvcozcetdtvibgqs.supabase.co/rest/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  };
  let result;
  if (command === 'list') {
    result = await request('data_import_rows?select=*&order=created_at.desc&limit=100');
  } else if (['verify','publish','reject'].includes(command)) {
    if (!file || !extra) throw new Error('Identifiants et motif de relecture requis.');
    const confirmed = process.argv.includes('--confirm-publication');
    if (command === 'publish' && !confirmed) throw new Error('Publication : relire les sources puis ajouter --confirm-publication.');
    result = await request('rpc/review_data_import', { p_ids: file.split(','), p_action: command.toUpperCase(), p_reason: extra, p_publish_confirmed: confirmed });
  } else {
    if (!file || !extra) throw new Error('Fichier de lot et chemin du plan requis.');
    if ((await stat(file)).size > 1_000_000) throw new Error('Lot limité à 1 Mo et 100 lignes.');
    const text = await readFile(file, 'utf8');
    const inputHash = createHash('sha256').update(text).digest('hex');
    const rows = parseImport(text, file.endsWith('.jsonl'));
    let planHash = null;
    if (command === 'import') {
      const plan = JSON.parse(await readFile(extra, 'utf8'));
      if (plan.input_sha256 !== inputHash || plan.dry_run !== true) throw new Error('Lot modifié ou plan invalide : refaire le dry-run.');
      planHash = plan.plan_hash;
    }
    result = await request('rpc/import_data_batch', { p_rows: rows, p_commit: command === 'import', p_plan_hash: planHash });
    if (command === 'dry-run') await writeFile(extra, JSON.stringify({ ...result, input_sha256: inputHash }, null, 2), { flag: 'wx', mode: 0o600 });
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.counts?.errors || result.counts?.conflicts || result.rows?.some(row => row.status === 'ERROR')) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
