import { createClient } from '@supabase/supabase-js';

// Supabase client initialization with security guards
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-civic-ci.supabase.co';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo';

// CRITICAL SECURITY GUARD: Block any accidental exposure of the service_role key in frontend bundle
if (rawAnonKey.toLowerCase().includes('service_role') || (rawAnonKey.startsWith('eyJ') && (() => {
  try {
    const payload = JSON.parse(atob(rawAnonKey.split('.')[1]));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
})())) {
  console.error("🚨 CRITICAL SECURITY ERROR: SUPABASE_SERVICE_ROLE_KEY MUST NEVER BE EXPOSED TO CLIENT-SIDE FRONTEND. Use VITE_SUPABASE_ANON_KEY instead.");
  throw new Error("Sécurité critique compromise : La clé secrète service_role ne doit jamais être exposée dans le navigateur.");
}

export const supabase = createClient(rawUrl, rawAnonKey);

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('demo')
  );
};
