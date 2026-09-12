import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ configured: true, getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() }));
vi.mock('../supabase', () => ({ isSupabaseConfigured: () => mocks.configured, supabase: { auth: mocks } }));
import { AuthSecurityService, getStaffRole } from '../authSecurity';
import { authorizeStaffManagement, validateStaffCommand } from '../../../supabase/functions/_shared/staffPolicy';
beforeEach(() => { vi.resetAllMocks(); mocks.configured = true; AuthSecurityService.clearSession(); });
describe('Server-authorized staff access', () => {
  it('rejects missing roles, user metadata roles and anonymous admins', () => {
    expect(getStaffRole(null)).toBeNull();
    expect(getStaffRole({ app_metadata: {}, user_metadata: { role: 'ADMIN' } } as any)).toBeNull();
    expect(getStaffRole({ app_metadata: { role: 'ADMIN' }, is_anonymous: true })).toBeNull();
    expect(getStaffRole({ app_metadata: { role: 'CITIZEN' } })).toBeNull();
    expect(getStaffRole({ app_metadata: { role: 'ADMIN' } })).toBe('ADMIN');
  });
  it('does not accept a local admin login when the backend is absent', async () => {
    mocks.configured = false;
    expect((await AuthSecurityService.verifyCredentials('admin', 'admin')).success).toBe(false);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it('fails closed on Auth errors, without fallback', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: new Error('Invalid') });
    expect((await AuthSecurityService.verifyCredentials('admin@example.test', 'password')).success).toBe(false);
    expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(false);
  });
  it('refuses a successfully authenticated citizen', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'a@test.test', app_metadata: {}, user_metadata: { role: 'ADMIN' } } }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    expect((await AuthSecurityService.verifyCredentials('a@test.test', ' password ')).success).toBe(false);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'a@test.test', password: ' password ' });
  });
  it('validates a staff user with the server and clears the cached identity on logout', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'a@test.test', app_metadata: { role: 'MODERATOR' }, user_metadata: {} } }, error: null });
    await AuthSecurityService.refreshSession();
    expect(AuthSecurityService.validateCurrentSession().user?.role).toBe('MODERATOR');
    AuthSecurityService.clearSession();
    expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(false);
  });
  it('does not reinstate a session after logout races an Auth response', async () => {
    let resolve!: (value: any) => void;
    mocks.getUser.mockReturnValue(new Promise(r => { resolve = r; }));
    const pending = AuthSecurityService.refreshSession();
    AuthSecurityService.clearSession();
    resolve({ data: { user: { app_metadata: { role: 'ADMIN' }, user_metadata: {} } }, error: null });
    await pending;
    expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(false);
  });
  it('restricts staff administration to admins and disallows creating another admin', () => {
    expect(authorizeStaffManagement({ id: 'x', app_metadata: { role: 'MODERATOR' } })).toBe(false);
    expect(authorizeStaffManagement({ id: 'x', app_metadata: { role: 'ADMIN' } })).toBe(true);
    expect(authorizeStaffManagement({ id: 'x', app_metadata: { role: 'ADMIN' }, banned_until: '2999-01-01T00:00:00Z' })).toBe(false);
    expect(() => validateStaffCommand({ action: 'create', role: 'ADMIN' }, 'x')).toThrow();
    expect(() => validateStaffCommand({ action: 'delete', id: 'x' }, 'x')).toThrow();
  });
});
