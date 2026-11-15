import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createProductionSchemaFixture } from './adminPersistenceFixtures';
import { join } from 'node:path';

describe('RLS hardening — local budget administration', () => {
  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261115070000_enforce_primary_document_provenance.sql'),
    'utf8'
  );

  it('does not grant privileges from user-editable user_metadata', () => {
    expect(migration).not.toContain("auth.jwt() -> 'user_metadata'");
    expect(migration).toContain("private.has_staff_role(array['ADMIN','DATA_MANAGER'])");
    expect(migration).toContain("ALTER COLUMN verification_status SET DEFAULT 'DOCUMENT_TO_EXTRACT'");
    expect(migration).not.toContain("SET DEFAULT 'AIP_VERIFIED'");
    expect(migration).toContain("ALTER COLUMN verification_status SET DEFAULT 'TO_VERIFY'");
    expect(migration).toContain("ALTER COLUMN data_provenance SET DEFAULT 'DECLARED_ADMIN'");
    expect(migration).toContain('CREATE OR REPLACE FUNCTION private.validate_import_row(r jsonb)');
    expect(migration).toContain("private.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER'])");
    expect(migration).toContain("'source_document_id'");
    expect(migration).toContain('Primary document requires a published, checksum-verified catalogue record');
    expect(migration).toContain("pd.source_url = s ->> 'url'");
    expect(migration).toContain('d.source_url = source_url_value');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION private.enforce_primary_document_evidence()');
    expect(migration).toContain('CREATE TRIGGER enforce_local_budget_primary_evidence');
    expect(migration).toContain('CREATE TRIGGER enforce_administrative_account_primary_evidence');
    expect(migration).toContain('source_document_id IS NULL OR source_page IS NULL OR source_url IS NULL');
    expect(migration).toContain('IF source_page_value IS NULL OR source_page_value <= 0 THEN');
    expect(migration).toContain('CREATE TRIGGER enforce_procurement_primary_evidence');
    expect(migration).toContain('CREATE TRIGGER enforce_budget_project_primary_evidence');
    expect(migration).toContain('ALTER TABLE public.ca_procurement_matches');

    expect(migration).toContain('d.checksum_status IN (\'COMPUTED\', \'VERIFIED\')');
  });


  it('replays on an isolated production-schema fixture without touching the remote database', async () => {
    const db = await createProductionSchemaFixture();
    try {
      await db.exec(migration);
      await db.exec(migration);
      const defaults = await db.query<{ table_name: string; column_name: string; column_default: string | null }>(
        `SELECT table_name,column_name,column_default
         FROM information_schema.columns
         WHERE table_schema='public'
           AND (table_name,column_name) IN (
             ('local_budgets','verification_status'),
             ('budget_revenue_sources','verification_status'),
             ('administrative_accounts','verification_status'),
             ('ca_procurement_matches','verification_status'),
             ('budget_projects','data_provenance')
           )`
      );
      expect(defaults.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ table_name: 'local_budgets', column_name: 'verification_status', column_default: "'DOCUMENT_TO_EXTRACT'::text" }),
        expect.objectContaining({ table_name: 'budget_revenue_sources', column_name: 'verification_status', column_default: "'DOCUMENT_TO_EXTRACT'::text" }),
        expect.objectContaining({ table_name: 'administrative_accounts', column_name: 'verification_status', column_default: "'TO_VERIFY'::text" }),
        expect.objectContaining({ table_name: 'ca_procurement_matches', column_name: 'verification_status', column_default: "'TO_VERIFY'::text" }),
        expect.objectContaining({ table_name: 'budget_projects', column_name: 'data_provenance', column_default: "'DECLARED_ADMIN'::text" })
      ]));
      const triggers = await db.query<{ tgname: string }>(
        `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal
         AND tgname IN (
           'enforce_local_budget_primary_evidence',
           'enforce_administrative_account_primary_evidence',
           'enforce_procurement_primary_evidence',
           'enforce_budget_project_primary_evidence'
         ) ORDER BY tgname`
      );
      expect(triggers.rows).toHaveLength(4);
      await expect(db.query(
        `INSERT INTO public.budget_projects
          (commune_name,region_name,category,title,budget_amount_fcfa,data_provenance,financial_verification_status)
         VALUES ('Commune test','Région test','Éducation','Projet non documenté',100,'OFFICIAL_SOURCE','TO_VERIFY')`
      )).rejects.toThrow('Primary certification requires');
      await expect(db.query(
        `INSERT INTO public.budget_projects
          (commune_name,region_name,category,title,budget_amount_fcfa,data_provenance,financial_verification_status)
         VALUES ('Commune test','Région test','Éducation','Projet certifié sans pièce',100,'DECLARED_ADMIN','VERIFIED')`
      )).rejects.toThrow('Primary certification requires');
    } finally {
      await db.close();
    }
  }, 60000);

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

    ];

    for (const policy of policies) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "${policy}"`);
      expect(migration).toContain(`CREATE POLICY "${policy}"`);
    }
    expect(migration).toContain('DROP POLICY IF EXISTS "Allow moderators full management on citizen proofs"');
    expect(migration).toContain('DROP POLICY IF EXISTS "admin_entity_staff"');
    expect(migration).not.toContain('CREATE POLICY "Moderators delete citizen proofs"');
    expect(migration).not.toContain('CREATE POLICY "Moderators insert citizen proofs"');
    expect((migration.match(/WITH CHECK/g) || []).length).toBe(11);
  });

  it('is additive and transaction-wrapped; it does not mutate financial records', () => {
    expect(migration).toMatch(/\bBEGIN;\s/);
    expect(migration.trimEnd().endsWith('COMMIT;')).toBe(true);
    expect(migration).toMatch(/UPDATE public\.local_budgets\s+SET verification_status = 'SECONDARY_TO_CORROBORATE'/);
    expect(migration).toMatch(/UPDATE public\.budget_revenue_sources\s+SET verification_status = 'SECONDARY_TO_CORROBORATE'/);
    expect(migration).toMatch(/UPDATE public\.ca_procurement_matches\s+SET verification_status = 'TO_VERIFY'/);
    expect(migration).toMatch(/UPDATE public\.administrative_accounts\s+SET verification_status = 'TO_VERIFY'/);
    expect(migration).toMatch(/UPDATE public.budget_projects\s+SET data_provenance = 'DECLARED_ADMIN'/);
    expect(migration).not.toMatch(/UPDATE public\.local_budgets\s+SET[^;]*(total_amount|operating_amount|investment_amount)/i);
    expect(migration).not.toMatch(/UPDATE public\.budget_revenue_sources\s+SET[^;]*(amount|amount_fcfa)/i);
    expect(migration).not.toMatch(/UPDATE public\.administrative_accounts\s+SET[^;]*(operating_realized|investment_realized|total_realized)/i);
    expect(migration).not.toMatch(/UPDATE public\.ca_procurement_matches\s+SET[^;]*(award_amount|contractor)/i);
    expect(migration).not.toMatch(/UPDATE public\.budget_projects\s+SET[^;]*(budget_amount_fcfa|progress_percentage)/i);
  });
});
