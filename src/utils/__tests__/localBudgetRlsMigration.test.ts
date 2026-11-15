import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('RLS hardening — local budget administration', () => {
  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261115060000_harden_local_budget_admin_rls.sql'),
    'utf8'
  );

  it('does not grant privileges from user-editable user_metadata', () => {
    expect(migration).not.toContain("auth.jwt() -> 'user_metadata'");
    expect(migration).toContain("private.has_staff_role(array['ADMIN','DATA_MANAGER'])");
    expect(migration).toContain("ALTER COLUMN verification_status SET DEFAULT 'DOCUMENT_TO_EXTRACT'");
    expect(migration).not.toContain("SET DEFAULT 'AIP_VERIFIED'");
    expect(migration).not.toContain("auth.jwt() -> 'user_metadata'");
    expect(migration).toContain('ALTER TABLE public.ca_procurement_matches');
    expect(migration).toContain('DROP POLICY IF EXISTS "Allow staff full access on public documents"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Public documents files are publicly readable"');
  });

  it('replaces every local-budget administrative policy with trusted role checks', () => {
    const policies = [
      'Allow admin write on sources',
      'Allow admin full access on local budgets',
      'Allow admin write on budget sources',
      'Allow admin write on budget revenue sources',
      'Allow admin write on budget lines',
      'Allow admin read on budget revisions',
      'Allow admin insert on budget revisions',
      'Allow admin full access on CA',
      'Allow admin write on CA operations',
      'Allow admin write on CA procurement matches',
      'Allow admin and moderator full access on responses',
      'Allow admin write access on projects',
      'Allow moderators full management on citizen proofs',
      'Allow admin only read on newsletter subscribers',
    ];

    for (const policy of policies) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "${policy}"`);
      expect(migration).toContain(`CREATE POLICY "${policy}"`);
    }
    expect((migration.match(/WITH CHECK/g) || []).length).toBe(12);
  });

  it('is additive and transaction-wrapped; it does not mutate financial records', () => {
    expect(migration).toMatch(/\bBEGIN;\s/);
    expect(migration.trimEnd().endsWith('COMMIT;')).toBe(true);
    expect(migration).not.toMatch(/\b(UPDATE|DELETE FROM|INSERT INTO)\s+public\.(local_budgets|budget_lines|budget_sources|budget_revenue_sources)/i);
  });
});
