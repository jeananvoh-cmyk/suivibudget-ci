import { supabase, isSupabaseConfigured } from './supabase';

export interface ModeratorUser {
  id: string;
  email: string;
  full_name: string;
  role: 'MODERATOR' | 'DATA_MANAGER';
  created_at: string;
  last_login?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  permissions: {
    can_moderate_proofs: boolean;
    can_manage_projects: boolean;
    can_manage_institutions: boolean;
    can_manage_news: boolean;
  };
}

export interface PasswordStrengthResult {
  score: number;
  label: 'Très faible' | 'Faible' | 'Moyen' | 'Fort' | 'Excellent';
  color: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export interface SessionPayload {
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER';
  issuedAt: number;
  expiresAt: number;
}

export interface SignedSessionToken {
  payload: SessionPayload;
  signature: string;
}

/**
 * Production authentication is exclusively delegated to Supabase Auth.
 * No password hash, fallback password, moderator credential or signing secret
 * is stored in the browser bundle.
 */
export class AuthSecurityService {
  public static initializeSecurity() {}

  public static needsPasswordChange(): boolean {
    return false;
  }

  public static checkLockout(): { isLocked: boolean; remainingSeconds: number } {
    return { isLocked: false, remainingSeconds: 0 };
  }

  public static recordFailedAttempt(): { isNowLocked: boolean; attemptsLeft: number } {
    return { isNowLocked: false, attemptsLeft: 0 };
  }

  public static resetFailedAttempts() {}

  public static getModerators(): ModeratorUser[] {
    return [];
  }

  public static saveModerators(_list: ModeratorUser[]) {}

  public static async createModerator(): Promise<{ success: boolean; message?: string }> {
    return { success: false, message: 'La création des comptes doit être effectuée via Supabase Auth.' };
  }

  public static toggleModeratorStatus(): boolean { return false; }
  public static deleteModerator(): boolean { return false; }

  public static async updateModeratorPassword(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'La gestion des mots de passe est déléguée à Supabase Auth.' };
  }

  public static async verifyCredentials(identifier: string, plaintextPassword: string): Promise<{
    success: boolean;
    needsPasswordChange: boolean;
    role?: 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER';
    fullName?: string;
    email?: string;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return { success: false, needsPasswordChange: false, error: 'Service d’authentification indisponible.' };
    }

    const email = identifier.trim().toLowerCase();
    if (!email.includes('@')) {
      return { success: false, needsPasswordChange: false, error: 'Utilisez votre adresse e-mail professionnelle.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: plaintextPassword });
    if (error || !data.user) {
      return { success: false, needsPasswordChange: false, error: 'Identifiant ou mot de passe incorrect.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role, is_active')
      .eq('id', data.user.id)
      .single();

    const allowed = ['ADMIN', 'MODERATOR', 'DATA_MANAGER'];
    if (profileError || !profile || !profile.is_active || !allowed.includes(String(profile.role))) {
      await supabase.auth.signOut();
      return {
        success: false,
        needsPasswordChange: false,
        error: 'Ce compte ne dispose pas d’un accès autorisé au back-office.',
      };
    }

    return {
      success: true,
      needsPasswordChange: false,
      role: profile.role as 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER',
      fullName: profile.full_name || data.user.email || 'Utilisateur',
      email: data.user.email || email,
    };
  }

  public static emergencyReset() {
    // Intentionally disabled: browser-side password resets are unsafe.
  }

  public static async updateAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const strength = this.evaluatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return { success: false, error: 'Utilisez au moins 8 caractères avec majuscule, minuscule et chiffre ou caractère spécial.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { success: false, error: error.message } : { success: true };
  }

  public static evaluatePasswordStrength(password: string): PasswordStrengthResult {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    const score = Math.min(4,
      Number(password.length >= 8) +
      Number(password.length >= 12) +
      Number(hasUppercase && hasLowercase) +
      Number(hasNumber || hasSpecialChar)
    );
    const labels: PasswordStrengthResult['label'][] = ['Très faible','Faible','Moyen','Fort','Excellent'];
    return {
      score,
      label: labels[score],
      color: score >= 3 ? 'bg-emerald-500 text-emerald-700' : score === 2 ? 'bg-amber-500 text-amber-700' : 'bg-rose-500 text-rose-700',
      hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar,
      isValid: hasMinLength && hasUppercase && hasLowercase && (hasNumber || hasSpecialChar),
    };
  }

  public static createSignedSession(user: { email: string; fullName: string; role: 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER' }): SignedSessionToken {
    const now = Date.now();
    return { payload: { ...user, issuedAt: now, expiresAt: now + 2 * 60 * 60 * 1000 }, signature: 'supabase-auth' };
  }

  public static validateCurrentSession(): { isAuthenticated: boolean; user?: SessionPayload } {
    // Synchronous compatibility shim only. Authorization is enforced by Supabase RLS.
    return { isAuthenticated: false };
  }

  public static clearSession() {
    if (isSupabaseConfigured()) void supabase.auth.signOut();
  }
}
