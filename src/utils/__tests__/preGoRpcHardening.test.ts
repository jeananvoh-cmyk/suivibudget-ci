import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

describe('pre-GO privileged RPC exposure hardening', () => {
  let db: PGlite | undefined;
  afterEach(async () => { await db?.close(); db = undefined; });

  it('keeps public RPC contracts as INVOKER wrappers and moves privileged bodies to private', async () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261116150000_move_staff_rpcs_to_private.sql'),
      'utf8'
    );
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA private;
      CREATE TABLE public.site_settings(id text primary key, contact_email text, settings_metadata jsonb);
      CREATE TABLE public.projects(id text primary key);
      CREATE TABLE public.sources(id text primary key);
      ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
      CREATE POLICY admin_entity_public ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
      CREATE POLICY admin_entity_staff ON public.site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY \"Allow public read access on projects\" ON public.projects FOR SELECT TO public USING (true);
      CREATE POLICY \"Allow admin write access on projects\" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY \"Allow public read on sources\" ON public.sources FOR SELECT TO public USING (true);
      CREATE POLICY \"Allow admin write on sources\" ON public.sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

      CREATE FUNCTION public.admin_baseline_visibility(text,text[]) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '[]'::jsonb $$;
      CREATE FUNCTION public.admin_staff_directory() RETURNS TABLE(id uuid,full_name text,role text) LANGUAGE sql SECURITY DEFINER AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid,'Staff'::text,'ADMIN'::text $$;
      CREATE FUNCTION public.apec_link_targets(text,integer) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
      CREATE FUNCTION public.import_data_batch(jsonb,boolean,text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
      CREATE FUNCTION public.publish_apec_need(uuid,text,text,text,date,boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$ BEGIN RETURN; END $fn$;
      CREATE FUNCTION public.record_apec_decision(uuid,text,text,text,date,integer,text,text,uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$ BEGIN RETURN; END $fn$;
      CREATE FUNCTION public.review_data_import(text[],text,text,boolean) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
      CREATE FUNCTION public.withdraw_apec_need(uuid,text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$ BEGIN RETURN; END $fn$;
    `);
    await db.exec(migration);

    const result = await db.query<{ name: string; public_definer: boolean; private_definer: boolean; anon_public: boolean; auth_public: boolean }>(`
      SELECT p.proname AS name, p.prosecdef AS public_definer,
        q.prosecdef AS private_definer,
        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_public,
        has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_public
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
      JOIN pg_proc q ON q.proname=p.proname
      JOIN pg_namespace pn ON pn.oid=q.pronamespace AND pn.nspname='private'
      WHERE n.nspname='public'
        AND p.proname IN ('admin_baseline_visibility','admin_staff_directory','apec_link_targets',
          'import_data_batch','publish_apec_need','record_apec_decision','review_data_import','withdraw_apec_need')
      ORDER BY p.proname
    `);
    expect(result.rows).toHaveLength(8);
    for (const row of result.rows) {
      expect(row.public_definer, row.name).toBe(false);
      expect(row.private_definer, row.name).toBe(true);
      expect(row.anon_public, row.name).toBe(false);
      expect(row.auth_public, row.name).toBe(true);
    }

    await db.exec('BEGIN');
    await db.exec('SET LOCAL ROLE authenticated');
    const staff = await db.query<{ id: string; full_name: string; role: string }>(
      'SELECT * FROM public.admin_staff_directory()'
    );
    expect(staff.rows).toEqual([{
      id: '00000000-0000-0000-0000-000000000001', full_name: 'Staff', role: 'ADMIN'
    }]);
    await db.exec('ROLLBACK');

    const policies = await db.query<{ policyname: string }>(
      "SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='site_settings'"
    );
    expect(policies.rows.map(row => row.policyname)).toEqual(['admin_entity_staff']);
    const legacyPublicPolicies = await db.query<{ tablename: string; policyname: string }>(
      `SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('projects','sources') AND cmd='SELECT' AND roles @> ARRAY['public']::name[]`
    );
    expect(legacyPublicPolicies.rows).toEqual([]);
  });
});
