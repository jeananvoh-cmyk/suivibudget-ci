import { supabase, isSupabaseConfigured } from './supabase';
import type { User } from '@supabase/supabase-js';

export type StaffRole = 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER';
export interface SessionPayload {
  email: string; fullName: string; role: StaffRole; issuedAt: number; expiresAt: number;
}
export interface ModeratorUser {
  id: string; email: string; full_name: string; role: 'MODERATOR' | 'DATA_MANAGER';
  created_at: string; last_login?: string; status: 'ACTIVE' | 'SUSPENDED';
  permissions: { can_moderate_proofs: boolean; can_manage_projects: boolean;
    can_manage_institutions: boolean; can_manage_news: boolean };
}
export interface PasswordStrengthResult {
  score: number; label: 'Très faible' | 'Faible' | 'Moyen' | 'Fort' | 'Excellent'; color: string;
  hasMinLength: boolean; hasUppercase: boolean; hasLowercase: boolean;
  hasNumber: boolean; hasSpecialChar: boolean; isValid: boolean;
}

// Only server-owned app_metadata authorizes staff. Profiles and user_metadata never do.
export function getStaffRole(user: Pick<User, 'app_metadata' | 'is_anonymous'> | null): StaffRole | null {
  if (!user || user.is_anonymous) return null;
  const role: unknown = user.app_metadata?.role;
  return role === 'ADMIN' || role === 'MODERATOR' || role === 'DATA_MANAGER' ? role : null;
}

export class AuthSecurityService {
  private static user: SessionPayload | undefined;
  private static generation = 0;

  public static validateCurrentSession(): { isAuthenticated: boolean; user?: SessionPayload } {
    if (this.user && Date.now() < this.user.expiresAt) return { isAuthenticated: true, user: { ...this.user } };
    return { isAuthenticated: false };
  }
  
  public static async refreshSession(): Promise<void> {
    const generation = ++this.generation;
    this.user = undefined;
    if (!isSupabaseConfigured()) return;
    // getUser validates with Auth; never grant rights from a locally forged session.
    const { data, error } = await supabase.auth.getUser();
    if (generation !== this.generation || error) return;
    const role = getStaffRole(data.user);
    if (!data.user || !role) return;
    this.user = { email: data.user.email || '', fullName: data.user.user_metadata?.full_name || 'Équipe SuiviBudget',
      role, issuedAt: Date.now(), expiresAt: Date.now() + 5 * 60 * 1000 };
  }
  
  public static async verifyCredentials(identifier: string, password: string) {
    this.clearSession();
    if (!isSupabaseConfigured()) return { success: false, error: 'Connexion indisponible. Réessayez ultérieurement.' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim().toLowerCase(), password });
      if (error) return { success: false, error: 'Connexion refusée. Vérifiez vos identifiants ou réessayez plus tard.' };
      await this.refreshSession();
      if (!this.validateCurrentSession().isAuthenticated) {
        await supabase.auth.signOut({ scope: 'local' });
        return { success: false, error: 'Ce compte ne possède pas de droits de gestion.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Connexion impossible. Vérifiez votre connexion Internet.' };
    }
  }

  public static clearSession() {
    ++this.generation;
    this.user = undefined;
    // Remove obsolete local credentials without ever interpreting them.
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('civicdata_sec_') || key === 'civicdata_auth_v7') localStorage.removeItem(key);
      }
      sessionStorage.removeItem('civicdata_sec_session_v3');
    } catch { /* Storage can be unavailable; authorization is never stored there. */ }
  }

  public static async updateAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Connexion indisponible.' };
    if (!this.evaluatePasswordStrength(newPassword).isValid) return { success: false, error: 'Choisissez un mot de passe plus robuste.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { success: false, error: 'Modification refusée. Reconnectez-vous et réessayez.' } : { success: true };
  }

  private static async manageStaff(body: Record<string, unknown>): Promise<any> {
    if (!isSupabaseConfigured()) throw new Error('Gestion des comptes indisponible.');
    const { data, error } = await supabase.functions.invoke('staff-admin', { body });
    if (error || data?.error) throw new Error(data?.error || 'Gestion des comptes indisponible ou accès refusé.');
    return data;
  }
  public static async getModerators(): Promise<ModeratorUser[]> { return (await this.manageStaff({ action: 'list' })).users; }
  public static async createModerator(full_name: string, email: string, role: StaffRole, password: string, _permissions?: unknown) {
    try { await this.manageStaff({ action: 'create', full_name, email, role, password }); return { success: true }; }
    catch (e) { return { success: false, message: (e as Error).message }; }
  }
  public static async toggleModeratorStatus(id: string, suspended: boolean) {
    await this.manageStaff({ action: 'status', id, suspended });
  }
  public static async deleteModerator(id: string) { await this.manageStaff({ action: 'delete', id }); }
  public static async updateModeratorPassword(id: string, password: string) {
    try { await this.manageStaff({ action: 'password', id, password }); return { success: true }; }
    catch (e) { return { success: false, error: (e as Error).message }; }
  }
  public static evaluatePasswordStrength(password: string): PasswordStrengthResult {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (hasUppercase && hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;

    const normalizedScore = Math.min(4, Math.max(0, score - (password.length < 8 ? 2 : 0)));

    let label: PasswordStrengthResult['label'] = 'Très faible';
    let color = 'bg-rose-500 text-rose-700';

    if (normalizedScore === 1) {
      label = 'Faible';
      color = 'bg-orange-500 text-orange-700';
    } else if (normalizedScore === 2) {
      label = 'Moyen';
      color = 'bg-amber-500 text-amber-700';
    } else if (normalizedScore === 3) {
      label = 'Fort';
      color = 'bg-emerald-500 text-emerald-700';
    } else if (normalizedScore === 4) {
      label = 'Excellent';
      color = 'bg-teal-500 text-teal-700';
    }

    const isValid = hasMinLength && hasUppercase && hasLowercase && (hasNumber || hasSpecialChar);

    return {
      score: normalizedScore,
      label,
      color,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      isValid,
    };
  }

}
