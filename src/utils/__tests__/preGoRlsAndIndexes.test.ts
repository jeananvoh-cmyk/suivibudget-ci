import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

describe('pre-GO admin receipt RLS optimization', () => {
  let db: PGlite | undefined;
  afterEach(async () => { await db?.close(); db = undefined; });

  it('uses an initplan for auth.uid() and preserves actor/domain isolation', async () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261115181000_optimize_admin_receipt_read_rls.sql'),
      'utf8'
    );
    db = new PGlite();
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE SCHEMA private;
      CREATE FUNCTION auth.uid()
        RETURNS uuid LANGUAGE sql STABLE
        AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION private.admin_domain_allowed(entity text, row_data jsonb)
        RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT entity = 'institutions' $$;

      CREATE TABLE public.admin_operation_receipts (
        id text PRIMARY KEY, actor_id uuid NOT NULL, entity_type text NOT NULL, result_data jsonb NOT NULL
      );
      ALTER TABLE public.admin_operation_receipts ENABLE ROW LEVEL SECURITY;
      CREATE POLICY admin_receipt_read ON public.admin_operation_receipts
        FOR SELECT TO authenticated USING (actor_id = auth.uid() AND private.admin_domain_allowed(entity_type,result_data));


      GRANT USAGE ON SCHEMA public,auth,private TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid(),private.admin_domain_allowed(text,jsonb) TO authenticated;
      GRANT SELECT ON public.admin_operation_receipts TO authenticated;
      INSERT INTO public.admin_operation_receipts(id,actor_id,entity_type,result_data) VALUES
        ('actor-one-allowed','00000000-0000-0000-0000-000000000001','institutions','{}'),
        ('actor-one-wrong-domain','00000000-0000-0000-0000-000000000001','projects','{}'),
        ('actor-two-allowed','00000000-0000-0000-0000-000000000002','institutions','{}');
    `);
    await db.exec(migration);

    const policy = await db.query<{ qual: string }>(
      `SELECT qual FROM pg_policies WHERE schemaname='public'
       AND tablename='admin_operation_receipts' AND policyname='admin_receipt_read'`
    );
    expect(policy.rows).toHaveLength(1);
    expect(policy.rows[0].qual).toContain('SELECT auth.uid()');
    expect(policy.rows[0].qual).toContain('private.admin_domain_allowed');

    await db.exec('BEGIN');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",['00000000-0000-0000-0000-000000000001']);
    await db.exec('SET LOCAL ROLE authenticated');
    const actorOne = await db.query<{ id: string }>('SELECT id FROM public.admin_operation_receipts ORDER BY id');
    expect(actorOne.rows).toEqual([{id:'actor-one-allowed'}]);
    await db.exec('ROLLBACK');

  });
});
