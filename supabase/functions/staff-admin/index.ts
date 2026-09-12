import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { authorizeStaffManagement, validateStaffCommand } from '../_shared/staffPolicy.ts';

Deno.serve(async request => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const headers = { 'Content-Type': 'application/json', 'Vary': 'Origin',
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (!allowedOrigins.includes(origin)) return response({ error: 'Origine refusée.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return response({ error: 'Méthode refusée.' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return response({ error: 'Connexion requise.' }, 401);
  const { data: verified, error: authError } = await admin.auth.getUser(token);
  if (authError || !authorizeStaffManagement(verified.user)) return response({ error: 'Accès refusé.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 10000) return response({ error: 'Requête trop volumineuse.' }, 413);
    const body = JSON.parse(raw);
    validateStaffCommand(body, verified.user!.id);
    if (body.action === 'list') {
      const users = [];
      for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        users.push(...data.users.filter(user => ['MODERATOR','DATA_MANAGER'].includes(user.app_metadata.role)).map(user => ({
          id: user.id, email: user.email, full_name: user.user_metadata.full_name || '', role: user.app_metadata.role,
          created_at: user.created_at, last_login: user.last_sign_in_at,
          status: (user as { banned_until?: string }).banned_until && new Date((user as { banned_until?: string }).banned_until!) > new Date() ? 'SUSPENDED' : 'ACTIVE',
          permissions: { can_moderate_proofs: user.app_metadata.role === 'MODERATOR', can_manage_projects: user.app_metadata.role === 'DATA_MANAGER', can_manage_institutions: user.app_metadata.role === 'DATA_MANAGER', can_manage_news: user.app_metadata.role === 'MODERATOR' }
        })));
        if (data.users.length < 1000) break;
      }
      return response({ users });
    }
    if (body.action === 'create') {
      const { error } = await admin.auth.admin.createUser({ email: body.email.trim().toLowerCase(), password: body.password,
        email_confirm: true, app_metadata: { role: body.role }, user_metadata: { full_name: body.full_name.trim() } });
      if (error) throw error;
    } else {
      const { data, error } = await admin.auth.admin.getUserById(body.id);
      if (error || !data.user || !['MODERATOR','DATA_MANAGER'].includes(data.user.app_metadata.role)) return response({ error: 'Compte cible non gérable.' }, 403);
      if (body.action === 'delete') {
        // Revoke privileges and ban first. Actual deletion is deliberately a trusted maintenance operation.
        const { error } = await admin.auth.admin.updateUserById(body.id, { app_metadata: { role: 'CITIZEN' }, ban_duration: '876000h' });
        if (error) throw error;
      } else {
        const attributes = body.action === 'password' ? { password: body.password } : { ban_duration: body.suspended ? '876000h' : 'none' };
        const { error } = await admin.auth.admin.updateUserById(body.id, attributes);
        if (error) throw error;
      }
    }
    return response({ success: true });
  } catch {
    return response({ error: 'Opération refusée. Vérifiez les champs et les droits du compte.' }, 400);
  }
});
