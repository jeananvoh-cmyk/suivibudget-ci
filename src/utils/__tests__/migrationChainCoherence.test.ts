import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createProductionSchemaFixture } from './adminPersistenceFixtures';

function loadMigrationIfPresent(filename: string): string {
  const fullPath = resolve('supabase/migrations', filename);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required migration file: ${filename}`);
  }
  return readFileSync(fullPath, 'utf8');
}

function loadMigrationFromBranch(filename: string, branchRef: string): string {
  try {
    return execFileSync('git', ['show', `refs/remotes/origin/${branchRef}:${filename}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(
      `Unable to load exact migration ${filename} from origin/${branchRef}. Ensure CI fetched the source branch. ${String(error)}`
    );
  }
}

describe('Cohérence chronologique unifiée des migrations (PR #68 -> #77 -> #76 -> #78 -> #75)', () => {
  let db: Awaited<ReturnType<typeof createProductionSchemaFixture>> | undefined;

  afterEach(async () => {
    await db?.close();
    db = undefined;
  });

  async function asRole<T>(
    role: 'anon' | 'authenticated',
    userId: string | null,
    fn: () => Promise<T>,
    commit = false
  ): Promise<T> {
    if (!db) throw new Error('Database not initialized');
    await db.exec('BEGIN');
    try {
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId ?? '']);
      await db.exec(`SET LOCAL ROLE ${role}`);
      const result = await fn();
      await db.exec(commit ? 'COMMIT' : 'ROLLBACK');
      return result;
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  it('rejoue toute la chaîne sans erreur avec tables non vides et contrôle les 5 rôles', async () => {
    db = await createProductionSchemaFixture();

    const adminId = '00000000-0000-0000-0000-000000000001';
    const managerId = '00000000-0000-0000-0000-000000000002';
    const moderatorId = '00000000-0000-0000-0000-000000000003';
    const citizenId = '00000000-0000-0000-0000-000000000004';

    // 1. Seed non-empty historical rows (existing Production snapshot state prior to PR #68..#78)
    await db.exec(`
      INSERT INTO auth.users(id) VALUES
        ('${adminId}'), ('${managerId}'), ('${moderatorId}'), ('${citizenId}');
      INSERT INTO public.profiles(id, email, full_name, role, is_active) VALUES
        ('${adminId}', 'admin@suivi.ci', 'Admin Test', 'ADMIN', true),
        ('${managerId}', 'manager@suivi.ci', 'Manager Test', 'DATA_MANAGER', true),
        ('${moderatorId}', 'moderator@suivi.ci', 'Moderator Test', 'MODERATOR', true),
        ('${citizenId}', 'citizen@suivi.ci', 'Citizen Test', 'CITIZEN', true);

      ALTER TABLE public.institutions DISABLE TRIGGER USER;
      ALTER TABLE public.public_documents DISABLE TRIGGER USER;
      ALTER TABLE public.budget_projects DISABLE TRIGGER USER;
      ALTER TABLE public.budget_lines DISABLE TRIGGER USER;
      ALTER TABLE public.site_settings DISABLE TRIGGER USER;

      INSERT INTO public.institutions(id, name, type, region, district)
      VALUES ('inst-cocody', 'Mairie de Cocody', 'COMMUNE', 'Lagunes', 'Abidjan');

      INSERT INTO public.public_documents(
        id, title, category, institution_id, institution_name, year,
        file_url, file_name, status, verification_status,
        checksum_sha256, source_url
      ) VALUES (
        'doc-ca-cocody-2024', 'CA Cocody 2024', 'COMPTE_ADMINISTRATIF',
        'inst-cocody', 'Mairie de Cocody', 2024,
        'https://dgbf.ci/ca-cocody-2024.pdf', 'ca-cocody-2024.pdf',
        'PUBLISHED', 'VERIFIED', repeat('a', 64),
        'https://dgbf.ci/ca-cocody-2024.pdf'
      );

      INSERT INTO public.budget_projects(
        id, institution_id, commune_name, region_name, category, title, fiscal_year,
        project_tier
      ) VALUES (
        'proj-passport-legacy', 'inst-cocody', 'Cocody', 'Lagunes', 'Voirie', 'Projet historique sans PDF passeport', 2024,
        'PROJECT'
      );

      INSERT INTO public.local_budgets(
        id, institution_id, institution_type, institution_name, fiscal_year, budget_type,
        status, verification_status, total_amount
      ) VALUES (
        'lb-aip-legacy', 'inst-cocody', 'COMMUNE', 'Mairie de Cocody', 2024, 'PRIMITIF_ADOPTE',
        'PUBLISHED', 'AIP_VERIFIED', 1000000
      );

      INSERT INTO public.administrative_accounts(
        id, institution_id, institution_type, institution_name, fiscal_year,
        status, verification_status, total_realized, source_document
      ) VALUES (
        'ca-legacy-unbacked', 'inst-cocody', 'COMMUNE', 'Mairie de Cocody', 2024,
        'PUBLISHED', 'OFFICIAL_DOCUMENT', 500000, 'CA Historique 2024'
      );

      INSERT INTO public.budget_lines(
        id, budget_id, category, line_label, amount
      ) VALUES (
        'bl-legacy-unbacked', 'lb-aip-legacy', 'INVESTISSEMENT', 'Ligne héritée', 250000
      );

      INSERT INTO public.budget_revenue_sources(
        id, budget_id, category, label, amount, verification_status
      ) VALUES (
        'brs-legacy-aip', 'lb-aip-legacy', 'OWN_REVENUE', 'Source AIP', 100000, 'AIP_VERIFIED'
      );

      INSERT INTO public.ca_institution_responses(
        id, ca_id, response_text, response_date, author_name, author_title, response_status
      ) VALUES (
        'resp-existing-1', 'ca-legacy-unbacked', 'Réponse publiée initiale conforme', '2026-10-01',
        'Secrétaire Général', 'SG', 'PUBLISHED'
      );

      INSERT INTO public.site_settings(id, portal_name, fiscal_year, contact_email)
      VALUES ('global_config', 'SuiviBudget CI', 2026, 'secret-ops@suivi.ci');

      INSERT INTO public.projects(id, title, category, budget_amount_fcfa, commune_name, region_name)
      VALUES ('legacy-proj-1', 'Ancien projet', 'Voirie', 1000, 'Cocody', 'Lagunes');

      INSERT INTO public.sources(id, source_type, publisher, title, url)
      VALUES ('legacy-src-1', 'OFFICIAL_COLLECTIVITY_DOCUMENT', 'DGBF', 'Ancienne source', 'https://dgbf.ci/src.pdf');

      ALTER TABLE public.institutions ENABLE TRIGGER USER;
      ALTER TABLE public.public_documents ENABLE TRIGGER USER;
      ALTER TABLE public.budget_projects ENABLE TRIGGER USER;
      ALTER TABLE public.budget_lines ENABLE TRIGGER USER;
      ALTER TABLE public.site_settings ENABLE TRIGGER USER;
    `);

    // 2. Apply PR #63 baseline migrations (already in Production / target baseline)
    for (const file of [
      '20261026183930_admin_dashboard_persistence_hardening_pr63.sql',
      '20261026184038_multipart_ca_convergence_pr63.sql',
      '20261026184048_document_delivery_counter_pr63.sql',
      '20261113011327_security_definer_hardening_20261026213000.sql',
    ]) {
      await db.exec(loadMigrationIfPresent(file));
    }

    // Backfill legacy Passport unverified-VERIFIED metadata & PR #63 receipts as active migration/seed
    await db.exec(`
      ALTER TABLE public.budget_projects DISABLE TRIGGER USER;
      ALTER TABLE public.public_documents DISABLE TRIGGER USER;
      ALTER TABLE public.site_settings DISABLE TRIGGER USER;
      ALTER TABLE public.budget_lines DISABLE TRIGGER USER;

      UPDATE public.budget_projects
      SET project_metadata = '{"citizen_need_verification_status":"VERIFIED","audit_verification_status":"VERIFIED"}'::jsonb,
          data_provenance = 'OFFICIAL_SOURCE',
          financial_verification_status = 'VERIFIED'
      WHERE id = 'proj-passport-legacy';

      UPDATE public.public_documents
      SET checksum_status = 'COMPUTED', page_count = 44
      WHERE id = 'doc-ca-cocody-2024';

      UPDATE public.site_settings
      SET settings_metadata = '{"internal":"value"}'::jsonb
      WHERE id = 'global_config';

      ALTER TABLE public.budget_projects ENABLE TRIGGER USER;
      ALTER TABLE public.public_documents ENABLE TRIGGER USER;
      ALTER TABLE public.site_settings ENABLE TRIGGER USER;
      ALTER TABLE public.budget_lines ENABLE TRIGGER USER;
    `);

    await db.exec(`
      INSERT INTO public.admin_operation_receipts(operation_id, actor_id, entity_type, entity_id, input_payload, result_data)
      VALUES
        ('11111111-1111-1111-1111-111111111111'::uuid, '${managerId}'::uuid, 'budget_projects', 'proj-1', '{}'::jsonb, '{"id":"proj-1"}'::jsonb),
        ('22222222-2222-2222-2222-222222222222'::uuid, '${moderatorId}'::uuid, 'news_articles', 'news-1', '{}'::jsonb, '{"id":"news-1"}'::jsonb);
    `);

    // 3. Simulate Supabase migration runner with NO JWT user active (auth.uid() IS NULL)
    await db.exec("SELECT set_config('request.jwt.claim.sub', '', false);");

    await db.exec(loadMigrationIfPresent('20261115070000_enforce_primary_document_provenance.sql'));
    await db.exec(loadMigrationIfPresent('20261115110000_harden_financial_evidence_guards.sql'));
    await db.exec(loadMigrationIfPresent('20261116100000_enforce_passport_document_evidence.sql'));
    await db.exec(loadMigrationFromBranch('supabase/migrations/20261116140000_optimize_admin_receipt_read_rls.sql', 'fix/pre-go-supabase-advisors'));
    await db.exec(loadMigrationIfPresent('20261116150000_move_staff_rpcs_to_private.sql'));
    await db.exec(loadMigrationFromBranch('supabase/migrations/20261116160000_enforce_institution_response_moderation.sql', 'feat/institution-response-workflow'));

    // Verify backfills downgraded unbacked legacy claims without inventing amounts
    const bpRow = (
      await db.query<{ data_provenance: string; financial_verification_status: string; project_metadata: Record<string, string> }>(
        "SELECT data_provenance, financial_verification_status, project_metadata FROM public.budget_projects WHERE id = 'proj-passport-legacy'"
      )
    ).rows[0];
    expect(bpRow.data_provenance).toBe('DECLARED_ADMIN');
    expect(bpRow.financial_verification_status).toBe('TO_VERIFY');
    expect(bpRow.project_metadata.citizen_need_verification_status).toBe('TO_VERIFY');
    expect(bpRow.project_metadata.audit_verification_status).toBe('TO_VERIFY');

    // Verify zero SECURITY DEFINER functions left among the 8 moved public RPCs
    const rpcSec = await db.query<{ proname: string; prosecdef: boolean; anon_exec: boolean }>(
      `SELECT p.proname, p.prosecdef, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname IN (
           'admin_baseline_visibility', 'admin_staff_directory', 'apec_link_targets',
           'import_data_batch', 'publish_apec_need', 'record_apec_decision',
           'review_data_import', 'withdraw_apec_need'
         )
       ORDER BY p.proname`
    );
    expect(rpcSec.rows).toHaveLength(8);
    for (const row of rpcSec.rows) {
      expect(row.prosecdef, row.proname).toBe(false);
      expect(row.anon_exec, row.proname).toBe(false);
    }

    // 4. Role 1: ANON
    await asRole('anon', null, async () => {
      const sites = await db!.query('SELECT id FROM public.site_settings');
      expect(sites.rows).toEqual([]);
      const oldProj = await db!.query('SELECT id FROM public.projects');
      expect(oldProj.rows).toEqual([]);
      const oldSrc = await db!.query('SELECT id FROM public.sources');
      expect(oldSrc.rows).toEqual([]);
      const responses = await db!.query('SELECT id FROM public.ca_institution_responses');
      expect(responses.rows).toEqual([{ id: 'resp-existing-1' }]);
      await expect(db!.query('SELECT * FROM public.admin_staff_directory()')).rejects.toThrow();
    });

    // 5. Role 2: CITIZEN
    await asRole('authenticated', citizenId, async () => {
      const sites = await db!.query('SELECT id FROM public.site_settings');
      expect(sites.rows).toEqual([]);
      const receipts = await db!.query('SELECT operation_id FROM public.admin_operation_receipts');
      expect(receipts.rows).toEqual([]);
      await expect(db!.query('SELECT * FROM public.admin_staff_directory()')).rejects.toThrow();
      await expect(
        db!.query(
          "INSERT INTO public.ca_institution_responses(id, ca_id, response_text, response_date, author_name, author_title, response_status) VALUES ('resp-citizen', 'ca-legacy-unbacked', 'Tentative citoyen bloquée', '2026-11-16', 'Citoyen', 'Membre', 'PENDING')"
        )
      ).rejects.toThrow();
    });

    // 6. Role 3: MODERATOR
    await asRole('authenticated', moderatorId, async () => {
      // Can see only own matching domain receipt
      const receipts = await db!.query<{ operation_id: string }>(
        'SELECT operation_id::text FROM public.admin_operation_receipts'
      );
      expect(receipts.rows).toEqual([{ operation_id: '22222222-2222-2222-2222-222222222222' }]);

      // Can queue PENDING response, must pass through VALIDATED before PUBLISHED
      await db!.query(
        "INSERT INTO public.ca_institution_responses(id, ca_id, response_text, response_date, author_name, author_title, response_status) VALUES ('resp-mod-1', 'ca-legacy-unbacked', 'Réponse en attente de modération.', '2026-11-16', 'SG', 'Secrétaire', 'PENDING')"
      );
      await db!.exec('SAVEPOINT mod_skip');
      await expect(
        db!.query("UPDATE public.ca_institution_responses SET response_status='PUBLISHED' WHERE id='resp-mod-1'")
      ).rejects.toThrow();
      await db!.exec('ROLLBACK TO SAVEPOINT mod_skip');
      await db!.query("UPDATE public.ca_institution_responses SET response_status='VALIDATED' WHERE id='resp-mod-1'");
      await db!.query("UPDATE public.ca_institution_responses SET response_status='PUBLISHED' WHERE id='resp-mod-1'");

      // Cannot spoof DATA_MANAGER import review RPC
      await expect(
        db!.query("SELECT public.review_data_import(ARRAY['x'], 'REJECT', 'test', false)")
      ).rejects.toThrow();
    });

    // 7. Role 4: DATA_MANAGER
    await asRole('authenticated', managerId, async () => {
      const receipts = await db!.query<{ operation_id: string }>(
        'SELECT operation_id::text FROM public.admin_operation_receipts'
      );
      expect(receipts.rows).toEqual([{ operation_id: '11111111-1111-1111-1111-111111111111' }]);

      // Wrapper delegates properly to private.apec_link_targets
      const targets = await db!.query<{ apec_link_targets: unknown }>(
        "SELECT public.apec_link_targets('inst-cocody', 2024)"
      );
      expect(targets.rows[0].apec_link_targets).toBeTruthy();

      // Cannot verify Passport claim without verified primary PDF page
      await db!.exec('SAVEPOINT unverified_passport');
      await expect(
        db!.query(
          `UPDATE public.budget_projects
           SET project_metadata = '{"citizen_need_verification_status":"VERIFIED"}'::jsonb
           WHERE id = 'proj-passport-legacy'`
        )
      ).rejects.toThrow(/(Verified citizen need requires|Declared progress is not physical certification)/);
      await db!.exec('ROLLBACK TO SAVEPOINT unverified_passport');
    });

    // 8. Role 5: ADMIN
    await asRole('authenticated', adminId, async () => {
      const dir = await db!.query<{ id: string; role: string }>(
        'SELECT id::text, role FROM public.admin_staff_directory() ORDER BY role'
      );
      expect(dir.rows.map((r) => r.role)).toEqual(['ADMIN', 'DATA_MANAGER', 'MODERATOR']);
      const settings = await db!.query<{ id: string }>(
        'SELECT id FROM public.site_settings'
      );
      expect(settings.rows).toEqual([{ id: 'global_config' }]);
    });
  }, 60000);
});
