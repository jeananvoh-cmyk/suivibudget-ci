export function authorizeStaffManagement(user: { id: string; is_anonymous?: boolean; banned_until?: string; app_metadata?: Record<string, unknown> } | null) {
  return !!user && !user.is_anonymous && user.app_metadata?.role === 'ADMIN'
    && (!user.banned_until || Date.parse(user.banned_until) <= Date.now());
}
export function validateStaffCommand(input: Record<string, unknown>, callerId: string) {
  const action = input.action;
  if (!['list','create','status','delete','password'].includes(String(action))) throw new Error('Action invalide.');
  if (action === 'list') return;
  if (action !== 'create' && (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id) || input.id === callerId)) throw new Error('Compte cible invalide.');
  if (action === 'create') {
    if (!['MODERATOR','DATA_MANAGER'].includes(String(input.role))) throw new Error('Rôle invalide.');
    if (typeof input.email !== 'string' || input.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Email invalide.');
    if (typeof input.full_name !== 'string' || input.full_name.length > 120 || !input.full_name.trim()) throw new Error('Nom invalide.');
  }
  if ((action === 'create' || action === 'password') && (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128)) throw new Error('Le mot de passe doit comporter entre 12 et 128 caractères.');
  if (action === 'status' && typeof input.suspended !== 'boolean') throw new Error('Statut invalide.');
}
