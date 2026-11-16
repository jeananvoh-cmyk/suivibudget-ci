import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

describe('institution response moderation is enforced by PostgreSQL', () => {
  let db: PGlite | undefined;
  afterEach(async () => { await db?.close(); db = undefined; });

  it('rejects citizen writes and direct publication, and allows only moderated staff transitions', async () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261116160000_enforce_institution_response_moderation.sql'),
      'utf8'
    );
    db = new PGlite();
    const adminId = '00000000-0000-0000-0000-000000000001';
    const citizenId = '00000000-0000-0000-0000-000000000002';

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE SCHEMA private;
      GRANT USAGE ON SCHEMA private TO authenticated;
      CREATE TABLE public.profiles(id uuid primary key, role text not null, is_active boolean not null);
      INSERT INTO public.profiles VALUES
        ('${adminId}', 'ADMIN', true),
        ('${citizenId}', 'CITIZEN', true);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION private.has_staff_role(allowed_roles text[])
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
      AS $$ SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id=auth.uid() AND p.is_active=true AND p.role=ANY(allowed_roles)
      ) $$;
      GRANT EXECUTE ON FUNCTION private.has_staff_role(text[]) TO authenticated;
      CREATE TABLE public.ca_institution_responses(
        id text primary key,
        response_date date not null default current_date,
        response_status text not null CHECK (response_status IN ('PENDING','VALIDATED','PUBLISHED'))
      );
      ALTER TABLE public.ca_institution_responses ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow public read on published institution responses"
        ON public.ca_institution_responses FOR SELECT
        USING (response_status='PUBLISHED');
      CREATE POLICY "Allow admin and moderator full access on responses"
        ON public.ca_institution_responses FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
      GRANT SELECT ON public.ca_institution_responses TO anon;
      GRANT SELECT, INSERT, UPDATE ON public.ca_institution_responses TO authenticated;
    `);
    await db.exec(migration);

    // A citizen cannot create a response, even with an otherwise valid payload.
    await db.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await db.query(`SELECT set_config('request.jwt.claim.sub','${citizenId}',true)`);
    await expect(
      db.query("INSERT INTO public.ca_institution_responses(id,response_date,response_status) VALUES ('citizen','2026-11-16','PENDING')")
    ).rejects.toThrow();
    await db.exec('ROLLBACK');

    // Staff cannot skip the moderation queue at insertion or publication.
    await db.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await db.query(`SELECT set_config('request.jwt.claim.sub','${adminId}',true)`);
    await db.exec('SAVEPOINT direct_insert');
    await expect(
      db.query("INSERT INTO public.ca_institution_responses(id,response_date,response_status) VALUES ('direct-insert','2026-11-16','PUBLISHED')")
    ).rejects.toThrow();
    await db.exec('ROLLBACK TO SAVEPOINT direct_insert');
    await db.exec('RELEASE SAVEPOINT direct_insert');
    await db.exec("INSERT INTO public.ca_institution_responses(id,response_date,response_status) VALUES ('response-1','2026-11-16','PENDING')");
    await db.exec('SAVEPOINT direct_publish');
    await expect(
      db.query("UPDATE public.ca_institution_responses SET response_status='PUBLISHED' WHERE id='response-1'")
    ).rejects.toThrow();
    await db.exec('ROLLBACK TO SAVEPOINT direct_publish');
    await db.exec('RELEASE SAVEPOINT direct_publish');
    await db.exec("UPDATE public.ca_institution_responses SET response_status='VALIDATED' WHERE id='response-1'");
    await db.exec("UPDATE public.ca_institution_responses SET response_status='PUBLISHED' WHERE id='response-1'");
    await db.exec('SAVEPOINT published_edit');
    await expect(
      db.query("UPDATE public.ca_institution_responses SET response_text='Edited without reopening' WHERE id='response-1'")
    ).rejects.toThrow();
    await db.exec('ROLLBACK TO SAVEPOINT published_edit');
    await db.exec('RELEASE SAVEPOINT published_edit');
    await db.exec('SAVEPOINT published_delete');
    await expect(
      db.query("DELETE FROM public.ca_institution_responses WHERE id='response-1'")
    ).rejects.toThrow();
    await db.exec('ROLLBACK TO SAVEPOINT published_delete');
    await db.exec('RELEASE SAVEPOINT published_delete');
    await db.exec("UPDATE public.ca_institution_responses SET response_status='PENDING', response_text='Correction demandée par la modération.' WHERE id='response-1'");
    await db.exec('COMMIT');

    // Public access is restricted to published responses.
    await db.exec('BEGIN; SET LOCAL ROLE anon;');
    const publicRows = await db.query("SELECT id FROM public.ca_institution_responses");
    expect(publicRows.rows).toEqual([]);
    await db.exec('ROLLBACK');

    // A citizen role cannot see pending records; published records remain public.
    await db.exec("INSERT INTO public.ca_institution_responses(id,response_date,response_status) VALUES ('published-public','2026-11-16','PENDING')");
    await db.exec("BEGIN; SET LOCAL ROLE authenticated;");
    await db.query(`SELECT set_config('request.jwt.claim.sub','${adminId}',true)`);
    await db.exec("UPDATE public.ca_institution_responses SET response_status='VALIDATED' WHERE id='published-public'");
    await db.exec("UPDATE public.ca_institution_responses SET response_status='PUBLISHED' WHERE id='published-public'");
    await db.exec('COMMIT');
    await db.exec('BEGIN; SET LOCAL ROLE anon;');
    const publishedRows = await db.query("SELECT id FROM public.ca_institution_responses");
    expect(publishedRows.rows).toEqual([{ id: 'published-public' }]);
    await db.exec('ROLLBACK');
  });
});
