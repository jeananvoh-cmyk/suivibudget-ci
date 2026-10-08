import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('SUPABASE_RUNTIME_VARIABLES_NOT_READY');

const guardedFetch = (input, init = {}) => {
  const method = String(init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) throw new Error(`NON_READ_METHOD_BLOCKED:${method}`);
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(15000) });
};

const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: guardedFetch },
});

const checks = [
  ['institutions', client.from('institutions').select('id').limit(1)],
  ['public_documents', client.from('public_documents').select('id').limit(1)],
  ['local_budgets', client.from('local_budgets').select('id').eq('status', 'PUBLISHED').limit(1)],
];
const results = [];
for (const [table, query] of checks) {
  const { data, error, status } = await query;
  results.push({ table, status, ok: !error, rows: Array.isArray(data) ? data.length : null, errorCode: error?.code ?? null });
}

const pass = results.every(result => result.ok);
console.log(JSON.stringify({ clientInitialized: true, credential: 'anon', allowedMethods: ['GET', 'HEAD'], results,
  remoteSupabaseWrites: 0, status: pass ? 'PASS' : 'BLOCKED' }));
if (!pass) process.exitCode = 1;
