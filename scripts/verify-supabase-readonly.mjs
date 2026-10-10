import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

/**
 * Creates a fetch transport strictly restricted to allowed HTTP methods (default: GET, HEAD).
 * Any attempt to invoke POST, PATCH, PUT, DELETE or other mutation methods throws
 * synchronously before any network emission occurs.
 */
export const createGuardedFetch = (allowedMethods = ['GET', 'HEAD'], timeoutMs = 15000) => {
  const allowedSet = new Set(allowedMethods.map(m => m.toUpperCase()));
  return (input, init = {}) => {
    const method = String(init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!allowedSet.has(method)) {
      throw new Error(`NON_READ_METHOD_BLOCKED:${method}`);
    }
    return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
  };
};

export const guardedFetch = createGuardedFetch(['GET', 'HEAD']);

export async function runReadOnlyVerification() {
  let url = process.env.VITE_SUPABASE_URL;
  let anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const match = line.trim().match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const val = match[2].trim();
            if (key === 'VITE_SUPABASE_URL' && !url) url = val;
            if (key === 'VITE_SUPABASE_ANON_KEY' && !anonKey) anonKey = val;
          }
        }
      }
    } catch {
      // ignore fallback errors
    }
  }
  if (!url || !anonKey) throw new Error('SUPABASE_RUNTIME_VARIABLES_NOT_READY');

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
  return { pass, results };
}

const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()
  || process.argv[1].endsWith('verify-supabase-readonly.mjs')
);

if (isMain) {
  runReadOnlyVerification().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

