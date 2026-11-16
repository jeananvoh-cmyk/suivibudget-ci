import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createProductionSchemaFixture } from './adminPersistenceFixtures';
import { join } from 'node:path';

describe('RLS hardening — local budget administration', () => {
  it('uses unique 14-digit versions for every active migration file', () => {
    const migrationDir = join(process.cwd(), 'supabase', 'migrations');
    const files = readdirSync(migrationDir).filter(file => file.endsWith('.sql'));
    const versions = files.map(file => file.match(/^(\d{14})_/)?.[1]);
    expect(versions.every(Boolean)).toBe(true);
    expect(new Set(versions).size).toBe(files.length);
  });

  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261115070000_enforce_primary_document_provenance.sql'),
    'utf8'
  );
  const hardeningMigration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261115110000_harden_financial_evidence_guards.sql'),
    'utf8'
  );
  const passportMigration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261116100000_enforce_passport_document_evidence.sql'),
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
    expect(migration).toContain('d.source_url = bp.source_url');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION private.enforce_primary_document_evidence()');
    expect(migration).toContain('CREATE TRIGGER enforce_local_budget_primary_evidence');
    expect(migration).toContain('CREATE TRIGGER enforce_administrative_account_primary_evidence');
    expect(migration).toContain('aa.source_document_id IS NULL OR aa.source_page IS NULL OR aa.source_url IS NULL');
    expect(migration).toContain('IF source_page_value IS NULL OR source_page_value <= 0 THEN');
    expect(migration).toContain('CREATE TRIGGER enforce_procurement_primary_evidence');
    expect(migration).toContain('CREATE TRIGGER enforce_budget_project_primary_evidence');
    expect(hardeningMigration).toContain('BEFORE INSERT OR UPDATE OF verification_status, source_document_id, source_page, source_url');
    expect(hardeningMigration).toContain('operating_revenue_realized, investment_planned, investment_realized');
    expect(hardeningMigration).toContain('NEW.amount IS DISTINCT FROM OLD.amount');
    expect(migration).toContain('total_amount, operating_amount, investment_amount');
    expect(migration).toContain('budget_amount_fcfa');
    expect(hardeningMigration).toContain('GRANT SELECT ON TABLE public.budget_sources, public.budget_revenue_sources TO anon, authenticated;');
    expect(hardeningMigration).toContain('GRANT INSERT, UPDATE ON TABLE public.budget_sources, public.budget_revenue_sources TO authenticated;');
    expect(hardeningMigration).toContain('CREATE OR REPLACE FUNCTION private.prevent_revoking_referenced_primary_document()');
    expect(hardeningMigration).toContain('CREATE TRIGGER prevent_revoking_referenced_primary_document\n  BEFORE UPDATE ON public.public_documents');
    expect(hardeningMigration).toContain('CREATE OR REPLACE FUNCTION private.enforce_budget_line_primary_document_evidence()');
    expect(hardeningMigration).toContain('CREATE TRIGGER enforce_budget_line_primary_document_evidence');
    expect(hardeningMigration).toContain('CREATE OR REPLACE FUNCTION private.enforce_budget_revenue_source_evidence()');
    expect(migration).toContain('AND pd.page_count IS NOT NULL');
    expect(migration).toContain('AND source_page_value <= pd.page_count');
    expect(hardeningMigration).toContain('AND NEW.source_page <= d.page_count');
    expect(hardeningMigration).toContain('OR NEW.page_count IS DISTINCT FROM OLD.page_count');
    expect(hardeningMigration).toContain("NEW.checksum_status IS DISTINCT FROM 'COMPUTED'");
    expect(passportMigration).toContain('CREATE OR REPLACE FUNCTION private.enforce_project_passport_document_evidence()');
    expect(passportMigration).toContain("metadata ->> 'citizen_need_verification_status' = 'VERIFIED'");
    expect(passportMigration).toContain("metadata ->> 'audit_verification_status' = 'VERIFIED'");
    expect(passportMigration).toContain('metadata_page <= pd.page_count');
    expect(passportMigration).toContain('BEFORE INSERT OR UPDATE OF project_metadata, institution_id, fiscal_year');
    expect(passportMigration).toContain("'{citizen_need_verification_status}'");
    expect(passportMigration).toContain("'{audit_verification_status}'");
    expect(passportMigration).toContain("metadata ->> 'citizen_need_verification_status' = 'VERIFIED'");
    expect(passportMigration).toContain("metadata ->> 'audit_verification_status' = 'VERIFIED'");
    expect(passportMigration).toContain('UPDATE public.budget_projects bp');
    expect(passportMigration).toContain('Verified citizen need requires a published, checksum-verified primary document and an existing page');
    expect(passportMigration).toContain('Verified audit requires a published, checksum-verified primary document and an existing page');
    expect(passportMigration).toContain("'{citizen_need_verification_status}'");
    expect(passportMigration).toContain("'{audit_verification_status}'");
    expect(migration).toContain('AND pd.page_count IS NOT NULL');
    expect(migration).toContain('AND source_page_value <= pd.page_count');
    expect(hardeningMigration).toContain('CREATE TRIGGER enforce_budget_revenue_source_evidence');
    expect(hardeningMigration).toContain('NEW.source_document_id IS DISTINCT FROM parent_budget.source_document_id');
    expect(hardeningMigration).toContain('DROP POLICY IF EXISTS "Allow public read on budget sources"');
    expect(hardeningMigration).toContain('DROP POLICY IF EXISTS "Allow public read on budget revenue sources"');
    expect(hardeningMigration).toContain("lb.status = 'PUBLISHED'");
    expect(migration).toContain('ALTER TABLE public.budget_projects DISABLE TRIGGER USER;');
    expect(migration).toContain('ALTER TABLE public.budget_projects ENABLE TRIGGER USER;');
    expect(migration).toContain('ALTER TABLE public.ca_procurement_matches');

    expect(migration).toContain('d.checksum_status IN (\'COMPUTED\', \'VERIFIED\')');
  });


  it('replays on an isolated production-schema fixture without touching the remote database', async () => {
    const db = await createProductionSchemaFixture();
    try {
      await db.exec(`
        CREATE OR REPLACE FUNCTION private.simulate_immutable_project_provenance()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF TG_OP = 'UPDATE' AND NEW.data_provenance IS DISTINCT FROM OLD.data_provenance THEN
            RAISE EXCEPTION 'Immutable project provenance';
          END IF;
          RETURN NEW;
        END;
        $$;
        CREATE TRIGGER admin_validate_project_provenance
          BEFORE UPDATE ON public.budget_projects
          FOR EACH ROW EXECUTE FUNCTION private.simulate_immutable_project_provenance();
        INSERT INTO public.institutions(id,name,type) VALUES ('migration-inst','Commune de test','MAIRIE');
        INSERT INTO public.budget_projects
          (id,institution_id,commune_name,region_name,category,title,budget_amount_fcfa,fiscal_year,data_provenance,financial_verification_status,project_metadata)
        VALUES ('migration-project','migration-inst','Commune de test','Région test','Éducation','Projet préexistant sans pièce',150,2026,'OFFICIAL_SOURCE','VERIFIED',
          '{"citizen_need_verification_status":"VERIFIED","citizen_need_source_document_id":"missing-need-doc","citizen_need_source_url":"https://gouv.ci/need.pdf","citizen_need_source_page":1,"audit_verification_status":"VERIFIED","audit_source_document_id":"missing-audit-doc","audit_source_url":"https://gouv.ci/audit.pdf","audit_source_page":2}'::jsonb);
        INSERT INTO public.local_budgets
          (id,institution_id,institution_type,institution_name,fiscal_year,budget_type,total_amount,verification_status)
        VALUES ('migration-budget','migration-inst','COMMUNE','Commune de test',2026,'PRIMITIF_ADOPTE',100,'AIP_VERIFIED');
        INSERT INTO public.budget_revenue_sources
          (id,budget_id,category,label,amount,verification_status)
        VALUES ('migration-revenue','migration-budget','OWN_REVENUE','Recettes propres',25,'AIP_VERIFIED');
        INSERT INTO public.administrative_accounts
          (id,institution_id,institution_type,institution_name,fiscal_year,source_document,operating_planned,verification_status)
        VALUES ('migration-ca','migration-inst','COMMUNE','Commune de test',2024,'CA 2024.pdf',20,'OFFICIAL_DOCUMENT');
        INSERT INTO public.ca_investment_operations
          (id,ca_id,institution_id,fiscal_year,title,sector,planned_amount,executed_amount)
        VALUES ('migration-operation','migration-ca','migration-inst',2024,'École test','Éducation',50,10);
        INSERT INTO public.ca_procurement_matches
          (id,operation_id,procurement_object,contractor,award_amount,verification_status)
        VALUES ('migration-market','migration-operation','Travaux école','Entreprise test',40,'Vérifié DGMP');
      `);
      await db.exec(migration);
      await db.exec(hardeningMigration);
      await db.exec(passportMigration);
      const demotions = await db.query<{ table_name: string; status: string; amount: string | number }>(
        `SELECT 'local_budgets' table_name,verification_status status,total_amount::text amount FROM public.local_budgets WHERE id='migration-budget'
         UNION ALL
         SELECT 'budget_revenue_sources',verification_status,amount::text FROM public.budget_revenue_sources WHERE id='migration-revenue'
         UNION ALL
         SELECT 'administrative_accounts',verification_status,operating_planned::text amount FROM public.administrative_accounts WHERE id='migration-ca'
         UNION ALL
         SELECT 'ca_procurement_matches',verification_status,award_amount::text amount FROM public.ca_procurement_matches WHERE id='migration-market'
         UNION ALL
         SELECT 'budget_projects',data_provenance || ':' || financial_verification_status,budget_amount_fcfa::text amount FROM public.budget_projects WHERE id='migration-project'
         UNION ALL
         SELECT 'budget_project_need_evidence',project_metadata ->> 'citizen_need_verification_status','n/a' FROM public.budget_projects WHERE id='migration-project'
         UNION ALL
         SELECT 'budget_project_audit_evidence',project_metadata ->> 'audit_verification_status','n/a' FROM public.budget_projects WHERE id='migration-project'`
      );
      expect(demotions.rows).toEqual(expect.arrayContaining([
        { table_name: 'local_budgets', status: 'SECONDARY_TO_CORROBORATE', amount: '100' },
        { table_name: 'budget_revenue_sources', status: 'SECONDARY_TO_CORROBORATE', amount: '25' },
        { table_name: 'administrative_accounts', status: 'TO_VERIFY', amount: '20' },
        { table_name: 'ca_procurement_matches', status: 'TO_VERIFY', amount: '40' },
        { table_name: 'budget_projects', status: 'DECLARED_ADMIN:TO_VERIFY', amount: '150' },
        { table_name: 'budget_project_need_evidence', status: 'TO_VERIFY', amount: 'n/a' },
        { table_name: 'budget_project_audit_evidence', status: 'TO_VERIFY', amount: 'n/a' }
      ]));
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
           'enforce_budget_project_primary_evidence',
           'enforce_budget_line_primary_document_evidence',
           'enforce_budget_revenue_source_evidence',
           'prevent_revoking_referenced_primary_document',
           'enforce_project_passport_document_evidence'
         ) ORDER BY tgname`
      );
      expect(triggers.rows).toHaveLength(8);

      // A certified CA must not retain its certification if its exact source page is removed.
      await db.exec(`
        INSERT INTO auth.users(id,email)
        VALUES ('00000000-0000-0000-0000-000000000001','admin-isole@example.invalid');
        INSERT INTO public.profiles(id,email,full_name,role,is_active)
        VALUES ('00000000-0000-0000-0000-000000000001','admin-isole@example.invalid','Admin isolé','ADMIN',true);
        SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
        SELECT set_config('app.admin_reason','Validation de test du document primaire',false);
        INSERT INTO public.public_documents
          (id,title,category,institution_name,file_url,file_name,status,verification_status,checksum_status,
           checksum_sha256,source_url,source_name,institution_id,fiscal_year,document_type,page_count)
        VALUES
          ('migration-primary-ca-doc','CA primaire de test','CA','Commune de test',
           'https://dgbf.ci/ca-2023.pdf','ca-2023.pdf','TO_VERIFY','TO_VERIFY','COMPUTED',repeat('a',64),
           'https://dgbf.ci/ca-2023.pdf','DGBF — CA primaire','migration-inst',2023,'COMPTE_ADMINISTRATIF',60);
        UPDATE public.public_documents SET status='VERIFIED' WHERE id='migration-primary-ca-doc';
        UPDATE public.public_documents SET status='PUBLISHED' WHERE id='migration-primary-ca-doc';
        INSERT INTO public.budget_projects
          (id,institution_id,commune_name,region_name,category,title,budget_amount_fcfa,fiscal_year,
           data_provenance,financial_verification_status,project_metadata)
        VALUES
          ('migration-passport-valid','migration-inst','Commune de test','Région test','Éducation',
           'Projet avec pièces de besoin et audit',100,2023,'DECLARED_ADMIN','TO_VERIFY',
           '{"citizen_need_verification_status":"VERIFIED","citizen_need_source_document_id":"migration-primary-ca-doc","citizen_need_source_url":"https://dgbf.ci/ca-2023.pdf","citizen_need_source_page":5,"audit_verification_status":"VERIFIED","audit_source_document_id":"migration-primary-ca-doc","audit_source_url":"https://dgbf.ci/ca-2023.pdf","audit_source_page":6}'::jsonb);
        INSERT INTO public.administrative_accounts
          (id,institution_id,institution_type,institution_name,fiscal_year,status,source_document,
           source_document_id,source_url,source_page,verification_status,reconciliation_status)
        VALUES
          ('migration-ca-certified','migration-inst','COMMUNE','Commune de test',2023,'VERIFIED',
           'CA primaire de test','migration-primary-ca-doc','https://dgbf.ci/ca-2023.pdf',5,
           'OFFICIAL_DOCUMENT','TO_VERIFY');
      `);
      const passportEvidence = await db.query<{ need_status: string; audit_status: string }>(
        `SELECT project_metadata ->> 'citizen_need_verification_status' AS need_status,
                project_metadata ->> 'audit_verification_status' AS audit_status
         FROM public.budget_projects WHERE id='migration-passport-valid'`
      );
      expect(passportEvidence.rows).toEqual([{ need_status: 'VERIFIED', audit_status: 'VERIFIED' }]);
      await expect(db.query(
        `UPDATE public.administrative_accounts
         SET source_page = NULL
         WHERE id = 'migration-ca-certified'`
      )).rejects.toThrow('Primary certification requires the exact source page');
      await expect(db.query(
        `UPDATE public.public_documents
         SET status = 'TO_VERIFY'
         WHERE id = 'migration-primary-ca-doc'`
      )).rejects.toThrow('Cannot revoke a primary document while certified financial records depend on it');
      await expect(db.query(
        `INSERT INTO public.budget_projects
          (commune_name,region_name,category,title,budget_amount_fcfa,data_provenance,financial_verification_status)
         VALUES ('Commune test','Région test','Éducation','Projet non documenté',100,'OFFICIAL_SOURCE','TO_VERIFY')`
      )).rejects.toThrow('Primary certification requires');
      await expect(db.query(
        `INSERT INTO public.budget_projects
          (commune_name,region_name,category,title,budget_amount_fcfa,data_provenance,financial_verification_status,project_metadata)
         VALUES ('Commune test','Région test','Éducation','Besoin certifié sans pièce catalogue',100,'DECLARED_ADMIN','TO_VERIFY',
           '{"citizen_need_verification_status":"VERIFIED","citizen_need_source_document_id":"missing-doc","citizen_need_source_url":"https://gouv.ci/need.pdf","citizen_need_source_page":1}'::jsonb)`
      )).rejects.toThrow('Verified citizen need requires');

      await expect(db.query(
        `INSERT INTO public.budget_projects
          (commune_name,region_name,category,title,budget_amount_fcfa,data_provenance,financial_verification_status,project_metadata)
         VALUES ('Commune test','Région test','Éducation','Audit certifié sans pièce catalogue',100,'DECLARED_ADMIN','TO_VERIFY',
           '{"audit_verification_status":"VERIFIED","audit_source_document_id":"missing-doc","audit_source_url":"https://gouv.ci/audit.pdf","audit_source_page":1}'::jsonb)`
      )).rejects.toThrow('Verified audit requires');

      // P1-3: Silent amount mutation on a certified record without resetting verification_status is blocked.
      await expect(db.query(
        `UPDATE public.administrative_accounts
         SET operating_planned = 999999
         WHERE id = 'migration-ca-certified'`
      )).rejects.toThrow('Changing a certified financial amount requires resetting verification status for a new review');

      // P1-3: Cross-institution or cross-fiscal-year document spoofing is rejected.
      await expect(db.query(
        `INSERT INTO public.administrative_accounts
          (id,institution_id,institution_type,institution_name,fiscal_year,status,source_document,
           source_document_id,source_url,source_page,verification_status,reconciliation_status)
         VALUES
          ('migration-ca-wrong-year','migration-inst','COMMUNE','Commune de test',2025,'VERIFIED',
           'CA mauvaise année','migration-primary-ca-doc','https://dgbf.ci/ca-2023.pdf',5,
           'OFFICIAL_DOCUMENT','TO_VERIFY')`
      )).rejects.toThrow('Primary certification requires a published, verified catalogue document with SHA-256');

      // P0-2: Even when an earlier BEFORE UPDATE trigger (like admin_document_integrity)
      // downgrades NEW.status to TO_VERIFY on a page_count change, prevent_revoking_referenced_primary_document
      // still fires and blocks revoking the referenced primary document.
      await db.exec(`
        CREATE OR REPLACE FUNCTION private.simulate_admin_doc_page_downgrade()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.page_count IS DISTINCT FROM OLD.page_count THEN
            NEW.status := 'TO_VERIFY';
            NEW.verification_status := 'TO_VERIFY';
          END IF;
          RETURN NEW;
        END;
        $$;
        CREATE TRIGGER a_simulate_admin_doc_page_downgrade
          BEFORE UPDATE ON public.public_documents
          FOR EACH ROW EXECUTE FUNCTION private.simulate_admin_doc_page_downgrade();
      `);
      await expect(db.query(
        `UPDATE public.public_documents
         SET page_count = 42
         WHERE id = 'migration-primary-ca-doc'`
      )).rejects.toThrow('Cannot revoke a primary document while certified financial records depend on it');

      // Also block archiving a PUBLISHED document while certified records depend on it.
      await expect(db.query(
        `UPDATE public.public_documents
         SET status = 'ARCHIVED'
         WHERE id = 'migration-primary-ca-doc'`
      )).rejects.toThrow('Cannot revoke a primary document while certified financial records depend on it');

      // P0-1: Under SET LOCAL ROLE authenticated (non-superuser staff session),
      // updating public_documents must not fail with 42501 permission denied on budget_revenue_sources,
      // and RLS/grants on budget_sources and budget_revenue_sources work for authenticated and anon roles.
      await db.exec('BEGIN');
      try {
        await db.exec(`
          SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
          SET LOCAL ROLE authenticated;
        `);
        await expect(db.query(
          `UPDATE public.public_documents
           SET status = 'TO_VERIFY'
           WHERE id = 'migration-primary-ca-doc'`
        )).rejects.toThrow('Cannot revoke a primary document while certified financial records depend on it');
      } finally {
        await db.exec('ROLLBACK');
      }

      // Verify anon visibility of budget_revenue_sources depends on published parent local_budget.
      await db.exec(`
        UPDATE public.local_budgets SET status = 'DRAFT' WHERE id = 'migration-budget';
      `);
      await db.exec('BEGIN');
      try {
        await db.exec('SET LOCAL ROLE anon');
        const draftRead = await db.query(
          `SELECT id FROM public.budget_revenue_sources WHERE id = 'migration-revenue'`
        );
        expect(draftRead.rows).toHaveLength(0);
      } finally {
        await db.exec('ROLLBACK');
      }
      await db.exec(`
        UPDATE public.local_budgets SET status = 'PUBLISHED' WHERE id = 'migration-budget';
      `);
      await db.exec('BEGIN');
      try {
        await db.exec('SET LOCAL ROLE anon');
        const publishedRead = await db.query(
          `SELECT id FROM public.budget_revenue_sources WHERE id = 'migration-revenue'`
        );
        expect(publishedRead.rows).toHaveLength(1);
      } finally {
        await db.exec('ROLLBACK');
      }

      // P1-1: Archived budget_lines / budget_projects (archived_at IS NOT NULL, publication_status = 'ARCHIVED')
      // do not deadlock document revocation once active certifications are downgraded.
      await db.exec(`
        UPDATE public.administrative_accounts
        SET status = 'DRAFT', verification_status = 'TO_VERIFY'
        WHERE id = 'migration-ca-certified';
      `);
      // Passport metadata is also a certified dependency, even when the project's
      // financial source_document_id is empty or points to another PDF.
      await expect(db.query(
        `UPDATE public.public_documents
         SET page_count = 61
         WHERE id = 'migration-primary-ca-doc'`
      )).rejects.toThrow('Cannot revoke a primary document while certified financial records depend on it');
      await db.exec(`
        UPDATE public.budget_projects
        SET project_metadata = jsonb_set(
          jsonb_set(project_metadata, '{citizen_need_verification_status}', '"TO_VERIFY"'::jsonb, true),
          '{audit_verification_status}', '"TO_VERIFY"'::jsonb, true
        )
        WHERE id = 'migration-passport-valid';
        INSERT INTO public.budget_projects
          (id,institution_id,commune_name,region_name,category,title,budget_amount_fcfa,fiscal_year,
           publication_status,archived_at,data_provenance,financial_verification_status,
           source_document_id,source_page,source_url)
        VALUES
          ('migration-archived-proj','migration-inst','Commune de test','Région test','Éducation',
           'Projet archivé',100,2023,'ARCHIVED',now(),'DECLARED_ADMIN','VERIFIED',
           'migration-primary-ca-doc',5,'https://dgbf.ci/ca-2023.pdf');
      `);
      await expect(db.query(
        `UPDATE public.public_documents
         SET status = 'TO_VERIFY'
         WHERE id = 'migration-primary-ca-doc'`
      )).resolves.toBeDefined();
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
    expect(migration).toMatch(/UPDATE public\.ca_procurement_matches(?: AS cm)?\s+SET verification_status = 'TO_VERIFY'/);
    expect(migration).toMatch(/UPDATE public\.administrative_accounts(?: AS aa)?\s+SET verification_status = 'TO_VERIFY'/);
    expect(migration).toMatch(/UPDATE public.budget_projects(?: AS bp)?\s+SET data_provenance = 'DECLARED_ADMIN'/);
    expect(migration).not.toMatch(/UPDATE public\.local_budgets\s+SET[^;]*(total_amount|operating_amount|investment_amount)/i);
    expect(migration).not.toMatch(/UPDATE public\.budget_revenue_sources\s+SET[^;]*(amount|amount_fcfa)/i);
    expect(migration).not.toMatch(/UPDATE public\.administrative_accounts\s+SET[^;]*(operating_realized|investment_realized|total_realized)/i);
    expect(migration).not.toMatch(/UPDATE public\.ca_procurement_matches\s+SET[^;]*(award_amount|contractor)/i);
    expect(migration).not.toMatch(/UPDATE public\.budget_projects\s+SET[^;]*(budget_amount_fcfa|progress_percentage)/i);
  });
});
