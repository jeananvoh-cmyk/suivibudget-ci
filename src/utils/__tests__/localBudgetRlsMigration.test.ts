import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('RLS hardening — local budget administration', () => {
  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261115_harden_local_budget_admin_rls.sql'),
    'utf8'
  );

  it('does not grant privileges from user-editable user_metadata', () => {
    expect(migration).not.toContain('user_metadata');
    expect(migration).toContain("auth.jwt() -> 'app_metadata' ->> 'role'");
    expect(migration).toContain("ALTER COLUMN verification_status SET DEFAULT 'DOCUMENT_TO_EXTRACT'");
    expect(migration).not.toContain("SET DEFAULT 'AIP_VERIFIED'");
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
    ];

    for (const policy of policies) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "${policy}"`);
      expect(migration).toContain(`CREATE POLICY "${policy}"`);
    }
    expect((migration.match(/WITH CHECK/g) || []).length).toBe(6);
  });

  it('is additive and transaction-wrapped; it does not mutate financial records', () => {
    expect(migration.trimStart().startsWith('BEGIN;')).toBe(true);
    expect(migration.trimEnd().endsWith('COMMIT;')).toBe(true);
    expect(migration).not.toMatch(/\b(UPDATE|DELETE FROM|INSERT INTO)\s+public\.(local_budgets|budget_lines|budget_sources|budget_revenue_sources)/i);
  });
});
