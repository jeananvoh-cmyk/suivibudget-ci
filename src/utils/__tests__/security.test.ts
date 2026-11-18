import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeInput, isSafeUrl, sanitizeCsvCell, sanitizeCoordinates } from '../security';
import { AuthSecurityService } from '../../services/authSecurity';
import { RateLimiter } from '../../services/rateLimiter';
import { buildCaOperationsCsvContent } from '../../components/AdministrativeAccountView';
import { buildProjectsCsvContent } from '../../pages/ProjectsPage';
import { buildProspectsCsvContent } from '../../pages/AdminDashboardPage';

const authMock = vi.hoisted(() => ({
  configured: vi.fn(), getSession: vi.fn(), getUser: vi.fn(), signOut: vi.fn(),
  signInWithPassword: vi.fn(), single: vi.fn(),
}));
vi.mock('../../services/supabase', () => ({
  isSupabaseConfigured: authMock.configured,
  supabase: {
    auth: authMock,
    from: () => ({ select: () => ({ eq: () => ({ single: authMock.single }) }) }),
  },
}));

describe('Cybersecurity & Defensive Engineering Test Suite', () => {
  
  // =========================================================================
  // 1. XSS & HTML INJECTION SANITIZATION
  // =========================================================================
  describe('XSS Sanitization (sanitizeInput)', () => {
    it('sanitizes malicious script tags and HTML injections', () => {
      const malicious = '<script>alert("XSS")</script>';
      const clean = sanitizeInput(malicious);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('&lt;script&gt;');
    });

    it('handles quotes and special characters safely', () => {
      expect(sanitizeInput('Loi "Finances" & Projets')).toBe('Loi &quot;Finances&quot; &amp; Projets');
    });

    it('handles null, undefined and empty inputs without crashing', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  // =========================================================================
  // 2. SAFE URL VALIDATION (Anti-XSS & Protocol Hijacking)
  // =========================================================================
  describe('Safe URL Validation (isSafeUrl)', () => {
    it('accepts safe HTTPS and HTTP URLs', () => {
      expect(isSafeUrl('https://suivibudget.ci')).toBe(true);
      expect(isSafeUrl('http://mairie-bouake.ci/budget')).toBe(true);
      expect(isSafeUrl('https://facebook.com/suivibudget.ci')).toBe(true);
    });

    it('accepts safe relative application paths', () => {
      expect(isSafeUrl('/documents/rapport.pdf')).toBe(true);
      expect(isSafeUrl('/api/projects')).toBe(true);
    });

    it('strictly blocks dangerous javascript:, data: and vbscript: URIs', () => {
      expect(isSafeUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox("test")')).toBe(false);
      expect(isSafeUrl('//evil-domain.com/steal')).toBe(false);
    });

    it('handles invalid or empty URLs safely', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
      expect(isSafeUrl('not a valid url at all')).toBe(false);
    });
  });

  // =========================================================================
  // 3. CSV & EXCEL FORMULA INJECTION DEFENSE (CSV Injection Shield)
  // =========================================================================
  describe('CSV Injection Shield (sanitizeCsvCell)', () => {
    it('neutralizes cells starting with formula execution triggers (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=CMD|\' /C calc\'!A0')).toBe('"\'=CMD|\' /C calc\'!A0"');
      expect(sanitizeCsvCell('+12345')).toBe('"\'\+12345"');
      expect(sanitizeCsvCell('-500000')).toBe('"\'\-500000"');
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe('"\'@SUM(A1:A10)"');
    });

    it('properly quotes standard text and escapes internal quotes', () => {
      expect(sanitizeCsvCell('Mairie de Bouaké')).toBe('"Mairie de Bouaké"');
      expect(sanitizeCsvCell('Marché "Grand Centre"')).toBe('"Marché ""Grand Centre"""');
    });

    it('handles null and undefined values safely', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it('neutralizes formula triggers (=, +, -, @) and embedded quotes in AdministrativeAccountView, ProjectsPage, and AdminDashboardPage CSV exports', () => {
      const payloads = [
        "=CMD|' /C calc'!A0",
        '+SUM(1,1)',
        '-1',
        '@SUM(A1:A10)',
        'Marché "Grand Centre"',
      ];

      const caCsv = buildCaOperationsCsvContent({
        operations: [
          {
            id: 'op-inj',
            ca_id: 'ca-1',
            institution_id: 'inst-1',
            fiscal_year: 2024,
            operation_reference: payloads[2],
            title: payloads[0],
            sector: payloads[4],
            location: payloads[1],
            planned_amount: 1000,
            executed_amount: 0,
            procurement_match: {
              id: 'm-1',
              tender_number: payloads[3],
              contractor: payloads[0],
              award_amount: 1000,
              match_level: 'STRONG',
              source: 'DGMP',
              verification_status: 'VERIFIED',
              procurement_object: 'Test',
            },
          },
        ],
      });
      expect(caCsv).toContain(`"'-1";"'=CMD|' /C calc'!A0";"Marché ""Grand Centre""";"+SUM(1,1)"`.replace('"+SUM(1,1)"', `"'${payloads[1]}"`));
      expect(caCsv).toContain(`"'@SUM(A1:A10)";"'=CMD|' /C calc'!A0"`);
      expect(caCsv).not.toContain(`;"=CMD`);
      expect(caCsv).not.toContain(`;"+SUM`);
      expect(caCsv).not.toContain(`;"@SUM`);
      expect(caCsv).not.toContain('0 FCFA FCFA');

      const projectsCsv = buildProjectsCsvContent([
        {
          id: payloads[2],
          title: payloads[0],
          commune_name: payloads[1],
          region_name: payloads[3],
          category: payloads[4],
          nature_expense: 'Investissements',
          budget_amount_fcfa: -1,
          fiscal_year: 2026,
          current_status: 'IN_PROGRESS',
          progress_percentage: 0,
          created_at: '2026-01-01',
        },
      ]);
      expect(projectsCsv).toContain(`"'-1","'=CMD|' /C calc'!A0","Mairie de +SUM(1,1)","'@SUM(A1:A10)","Marché ""Grand Centre""","'-1","IN_PROGRESS"`);
      expect(projectsCsv).not.toContain(`,"=CMD`);
      expect(projectsCsv).not.toContain(`,"@SUM`);

      const prospectsCsv = buildProspectsCsvContent([
        {
          id: 'inst-inj',
          name: payloads[0],
          type: 'MAIRIE',
          region: payloads[1],
          district: payloads[2],
          leader_name: payloads[3],
          political_party: payloads[4],
          website: '=HYPERLINK("http://evil")',
          facebook_url: '+123',
          contact_phone: '-225',
          contact_email: '@admin',
          budget_functioning_fcfa: null,
          budget_investment_fcfa: null,
          total_budget_fcfa: -1,
        },
      ]);
      expect(prospectsCsv).toContain(`"'=CMD|' /C calc'!A0";"'+SUM(1,1)";"'-1";"'@SUM(A1:A10)";"Marché ""Grand Centre"""`);
      expect(prospectsCsv).toContain(`"'=HYPERLINK(""http://evil"")";"'+123";"'-225";"'@admin";"'-1"`);
      expect(prospectsCsv).not.toContain(`;"=CMD`);
      expect(prospectsCsv).not.toContain(`;"+SUM`);
      expect(prospectsCsv).not.toContain(`;"@admin`);
    });
  });

  // =========================================================================
  // 4. CITIZEN PRIVACY BY DESIGN (GPS Truncation)
  // =========================================================================
  describe('Citizen Privacy (sanitizeCoordinates)', () => {
    it('truncates high-precision coordinates to 3 decimals (~100m radius)', () => {
      const { lat, lng } = sanitizeCoordinates(5.359876543, -4.008321987);
      expect(lat).toBe(5.36);
      expect(lng).toBe(-4.008);
    });

    it('bounds latitude between -90 and 90, and longitude between -180 and 180', () => {
      const outOfBounds = sanitizeCoordinates(150, -250);
      expect(outOfBounds.lat).toBe(90);
      expect(outOfBounds.lng).toBe(-180);
    });
  });

  describe('Supabase staff sessions', () => {
    beforeEach(async () => {
      vi.resetAllMocks();
      authMock.configured.mockReturnValue(false);
      await AuthSecurityService.clearSession();
      authMock.configured.mockReturnValue(true);
      authMock.getSession.mockResolvedValue({ data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } }, error: null });
      authMock.getUser.mockResolvedValue({ data: { user: { id: 'staff-id', email: 'staff@example.test', user_metadata: { role: 'ADMIN' } } }, error: null });
      authMock.single.mockResolvedValue({ data: { role: 'ADMIN', is_active: true, full_name: 'Staff' }, error: null });
      authMock.signOut.mockResolvedValue({ error: null });
    });
    it.each(['ADMIN', 'DATA_MANAGER', 'MODERATOR'])('restores the protected %s role', async role => {
      authMock.single.mockResolvedValue({ data: { role, is_active: true }, error: null });
      const restored = await AuthSecurityService.restoreSupabaseSession();
      expect(restored.user?.role).toBe(role);
      expect(authMock.getUser).toHaveBeenCalledOnce();
      expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(true);
    });
    it.each([{ role: 'CITIZEN', is_active: true }, { role: 'ADMIN', is_active: false }, null])('denies unauthorized profile %j', async profile => {
      authMock.single.mockResolvedValue({ data: profile, error: null });
      expect((await AuthSecurityService.restoreSupabaseSession()).isAuthenticated).toBe(false);
      expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(false);
      expect(authMock.signOut).toHaveBeenCalledOnce();
    });
    it('rejects expired sessions', async () => {
      authMock.getSession.mockResolvedValue({ data: { session: { expires_at: 1 } }, error: null });
      expect((await AuthSecurityService.restoreSupabaseSession()).isAuthenticated).toBe(false);
      expect(authMock.getUser).not.toHaveBeenCalled();
    });
    it('rejects a user the auth server cannot verify', async () => {
      authMock.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Expired') });
      expect((await AuthSecurityService.restoreSupabaseSession()).isAuthenticated).toBe(false);
    });
    it('clears cached privileges when the server session disappears', async () => {
      await AuthSecurityService.restoreSupabaseSession();
      authMock.getSession.mockResolvedValue({ data: { session: null }, error: null });
      await AuthSecurityService.restoreSupabaseSession();
      expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(false);
    });
    it('does not allow callers to mutate cached privileges', async () => {
      authMock.single.mockResolvedValue({ data: { role: 'MODERATOR', is_active: true }, error: null });
      const restored = await AuthSecurityService.restoreSupabaseSession();
      restored.user!.role = 'ADMIN';
      expect(AuthSecurityService.validateCurrentSession().user?.role).toBe('MODERATOR');
    });
    it('awaits logout and clears privileges even when logout fails', async () => {
      await AuthSecurityService.restoreSupabaseSession();
      authMock.signOut.mockResolvedValue({ error: new Error('Network') });
      await expect(AuthSecurityService.clearSession()).rejects.toThrow('Network');
      expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(false);
    });
    it('rejects invalid credentials without a local fallback', async () => {
      authMock.signInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error('Invalid') });
      expect((await AuthSecurityService.verifyCredentials('staff@example.test', 'invalid')).success).toBe(false);
    });
  });

  // =========================================================================
  // 6. RATE LIMITING & ANTI-ABUSE (RateLimiter)
  // =========================================================================
  describe('Rate Limiter Service (RateLimiter)', () => {
    it('allows requests within the limit and blocks when exhausted', () => {
      RateLimiter.reset('test_action');

      // Allow 3 requests in 10 seconds
      const res1 = RateLimiter.check('test_action', 3, 10);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = RateLimiter.check('test_action', 3, 10);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = RateLimiter.check('test_action', 3, 10);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // 4th request must be blocked
      const res4 = RateLimiter.check('test_action', 3, 10);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

});
