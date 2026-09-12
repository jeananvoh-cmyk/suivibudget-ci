BEGIN;

-- Abort before changing permissions when an existing installation contains data.
-- A reviewed, deployment-specific migration must archive/map these rows first.
-- Never bypass this gate by deleting production data.
DO $$
DECLARE t text; has_rows boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','projects','budget_projects','institutions','citizen_proofs',
    'caidp_directory','news_articles','newsletter_subscribers','site_settings','public_documents',
    'proof_confirmations','caidp_document_requests_log'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)',t) INTO has_rows;
      IF has_rows THEN
        RAISE EXCEPTION 'Legacy data in public.%. Stop: reviewed migration/export required; see docs/DEPLOYMENT.md',t;
      END IF;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='citizen_photos') THEN
    RAISE EXCEPTION 'Legacy evidence exists. Stop: reviewed media migration required; see docs/DEPLOYMENT.md';
  END IF;
END $$;

-- Forward-only migration: retain legacy data, revoke unsafe client permissions.
-- Bootstrap staff using Auth app_metadata from the trusted server console, never profiles.
CREATE SCHEMA IF NOT EXISTS civic_private;
REVOKE ALL ON SCHEMA civic_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA civic_private TO anon, authenticated, service_role;
-- Live lookup prevents stale JWT roles from retaining rights after suspension/deletion.
-- Internal, no arguments, constrained to auth.uid(); auth.users is never exposed to clients.
CREATE FUNCTION civic_private.staff_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT raw_app_meta_data->>'role' FROM auth.users
 WHERE id = auth.uid() AND NOT coalesce(is_anonymous,false)
   AND (banned_until IS NULL OR banned_until <= now())
   AND raw_app_meta_data->>'role' IN ('ADMIN','MODERATOR','DATA_MANAGER')
$$;
REVOKE ALL ON FUNCTION civic_private.staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION civic_private.staff_role() TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.civic_role() RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT civic_private.staff_role()
$$;
REVOKE ALL ON FUNCTION public.civic_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_role() TO anon, authenticated, service_role;

-- Replace all existing policies on the known legacy tables, including either schema variant.
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','projects','budget_projects','institutions','citizen_proofs',
    'caidp_directory','news_articles','newsletter_subscribers','site_settings','public_documents','proof_confirmations',
    'caidp_document_requests_log'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
      END LOOP;
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
      -- Historical content remains available to administrators for reviewed migration/export.
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
      EXECUTE format('CREATE POLICY legacy_admin_read ON public.%I FOR SELECT TO authenticated USING (public.civic_role() = ''ADMIN'')',t);
    END IF;
  END LOOP;
END $$;

-- New public content overlays preserve the checked-in catalogue and record tombstones.
CREATE TABLE public.civic_content (
  kind text NOT NULL CHECK (kind IN ('projects','institutions','articles','documents','caidp','settings')),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 200),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND octet_length(data::text) <= 1000000),
  deleted boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (kind,id),
  CHECK (deleted OR kind <> 'projects' OR coalesce((
    length(data->>'title') > 0 AND jsonb_typeof(data->'budget_amount_fcfa') = 'number'
    AND (data->>'budget_amount_fcfa')::numeric >= 0
    AND data->>'current_status' IN ('UNKNOWN','NOT_STARTED','IN_PROGRESS','COMPLETED','SUSPENDED')
    AND (data->>'fiscal_year')::integer BETWEEN 2000 AND 2200
  ),false))
);
ALTER TABLE public.civic_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.civic_content FROM anon, authenticated;
GRANT SELECT ON public.civic_content TO anon, authenticated;
GRANT INSERT, UPDATE ON public.civic_content TO authenticated;
CREATE POLICY content_read ON public.civic_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY content_insert ON public.civic_content FOR INSERT TO authenticated WITH CHECK (
  public.civic_role() = 'ADMIN' OR
  (public.civic_role() = 'DATA_MANAGER' AND kind IN ('projects','institutions','caidp')) OR
  (public.civic_role() = 'MODERATOR' AND kind IN ('articles','documents'))
);
CREATE POLICY content_update ON public.civic_content FOR UPDATE TO authenticated USING (
  public.civic_role() = 'ADMIN' OR
  (public.civic_role() = 'DATA_MANAGER' AND kind IN ('projects','institutions','caidp')) OR
  (public.civic_role() = 'MODERATOR' AND kind IN ('articles','documents'))
) WITH CHECK (
  public.civic_role() = 'ADMIN' OR
  (public.civic_role() = 'DATA_MANAGER' AND kind IN ('projects','institutions','caidp')) OR
  (public.civic_role() = 'MODERATOR' AND kind IN ('articles','documents'))
);

CREATE TABLE civic_private.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  happened_at timestamptz NOT NULL DEFAULT now(), actor uuid,
  resource text NOT NULL, old_data jsonb, new_data jsonb
);
ALTER TABLE civic_private.audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON civic_private.audit_log FROM PUBLIC, anon, authenticated;
-- Trigger-only privileged insert. No client-executable SECURITY DEFINER RPC.
CREATE FUNCTION civic_private.audit_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO civic_private.audit_log(actor,resource,old_data,new_data)
  VALUES(auth.uid(),TG_TABLE_NAME, CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,to_jsonb(NEW));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION civic_private.audit_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER civic_content_audit AFTER INSERT OR UPDATE ON public.civic_content
FOR EACH ROW EXECUTE FUNCTION civic_private.audit_change();

CREATE FUNCTION public.civic_save_content(changes jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE item jsonb; result jsonb := '[]'; saved public.civic_content; expected integer;
BEGIN
  IF auth.uid() IS NULL OR public.civic_role() IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(changes) <> 'array' OR jsonb_array_length(changes) NOT BETWEEN 1 AND 20000 THEN
    RAISE EXCEPTION 'Invalid changes';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(changes) LOOP
    expected := (item->>'expected_revision')::integer;
    IF expected IS NULL OR expected < 0 THEN RAISE EXCEPTION 'Invalid revision'; END IF;
    IF expected = 0 THEN
      INSERT INTO public.civic_content(kind,id,data,deleted,revision,updated_by)
      VALUES(item->>'kind',item->>'id',item->'data',coalesce((item->>'deleted')::boolean,false),1,auth.uid())
      ON CONFLICT DO NOTHING RETURNING * INTO saved;
    ELSE
      UPDATE public.civic_content SET data=item->'data', deleted=coalesce((item->>'deleted')::boolean,false),
        revision=revision+1,updated_at=now(),updated_by=auth.uid()
      WHERE kind=item->>'kind' AND id=item->>'id' AND revision=expected RETURNING * INTO saved;
    END IF;
    IF saved IS NULL THEN RAISE EXCEPTION 'Concurrent modification' USING ERRCODE='40001'; END IF;
    result := result || jsonb_build_array(jsonb_build_object('kind',saved.kind,'id',saved.id,'revision',saved.revision));
  END LOOP;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.civic_save_content(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_save_content(jsonb) TO authenticated;

-- Evidence is private while pending, rejected or unattached. Public sees approved evidence only.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('civic-evidence','civic-evidence',false,26214400,ARRAY['image/jpeg','video/mp4','video/webm','video/quicktime'])
ON CONFLICT(id) DO UPDATE SET public=false, file_size_limit=26214400,
  allowed_mime_types=excluded.allowed_mime_types;
-- Legacy files also become private, without deletion. Staff can review/export them.
UPDATE storage.buckets SET public=false WHERE id='citizen_photos';
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
 AND (coalesce(qual,'') || coalesce(with_check,'')) LIKE '%citizen_photos%' LOOP
   EXECUTE format('DROP POLICY %I ON storage.objects',p.policyname);
 END LOOP;
END $$;
CREATE POLICY legacy_evidence_staff_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='citizen_photos' AND public.civic_role()='ADMIN');

CREATE TABLE public.civic_submissions (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  evidence_path text NOT NULL UNIQUE,
  data jsonb NOT NULL CHECK (jsonb_typeof(data)='object' AND octet_length(data::text) <= 20000),
  verification_status text NOT NULL DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(data->>'project_id') BETWEEN 1 AND 200),
  CHECK (length(data->>'comment') BETWEEN 8 AND 5000),
  CHECK (data->>'citizen_status_claim' IN ('UNKNOWN','NOT_STARTED','IN_PROGRESS','COMPLETED','SUSPENDED')),
  CHECK (data->>'media_type' IN ('IMAGE','VIDEO'))
);
CREATE INDEX civic_submissions_status ON public.civic_submissions(verification_status,created_at);
ALTER TABLE public.civic_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.civic_submissions FROM anon, authenticated;
GRANT SELECT ON public.civic_submissions TO anon, authenticated;
GRANT INSERT ON public.civic_submissions TO authenticated;
GRANT UPDATE(verification_status) ON public.civic_submissions TO authenticated;
CREATE POLICY submissions_read ON public.civic_submissions FOR SELECT TO anon, authenticated
USING(verification_status='APPROVED' OR owner_id=auth.uid() OR public.civic_role() IN ('ADMIN','MODERATOR'));
CREATE POLICY submissions_insert ON public.civic_submissions FOR INSERT TO authenticated
WITH CHECK(owner_id=auth.uid() AND verification_status='PENDING'
  AND evidence_path LIKE auth.uid()::text || '/' || id::text || '.%'
  AND EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='civic-evidence' AND name=evidence_path));
CREATE POLICY submissions_moderate ON public.civic_submissions FOR UPDATE TO authenticated
USING(public.civic_role() IN ('ADMIN','MODERATOR')) WITH CHECK(public.civic_role() IN ('ADMIN','MODERATOR'));
CREATE TRIGGER civic_submission_audit AFTER INSERT OR UPDATE ON public.civic_submissions
FOR EACH ROW EXECUTE FUNCTION civic_private.audit_change();

CREATE POLICY evidence_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='civic-evidence' AND split_part(name,'/',1)=auth.uid()::text
  AND name ~ '^[0-9a-f-]+/[0-9a-f-]+\.(jpg|mp4|webm|mov)$');
CREATE POLICY evidence_read ON storage.objects FOR SELECT TO anon, authenticated
USING(bucket_id='civic-evidence' AND (
  split_part(name,'/',1)=auth.uid()::text OR public.civic_role() IN ('ADMIN','MODERATOR') OR
  EXISTS(SELECT 1 FROM public.civic_submissions s WHERE s.evidence_path=name AND s.verification_status='APPROVED')
));
-- No client deletion/update of stored files: retries preserve evidence and uploads cannot overwrite.

CREATE FUNCTION public.civic_submission_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF auth.uid() IS NULL OR NEW.owner_id <> auth.uid() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 IF (SELECT count(*) FROM public.civic_submissions WHERE owner_id=auth.uid() AND created_at>now()-interval '1 hour') >= 5
 THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;
 IF NEW.data->>'project_id' IS NULL OR NEW.data->>'comment' IS NULL OR NEW.data->>'media_type' IS NULL
 OR NEW.data->>'citizen_status_claim' IS NULL THEN RAISE EXCEPTION 'Missing fields'; END IF;
 IF NEW.data - ARRAY['project_id','project_title','commune_name','region_name','comment','citizen_status_claim',
 'media_type','citizen_name','locality_details','observation_date']::text[] <> '{}'::jsonb THEN RAISE EXCEPTION 'Unexpected fields'; END IF;
 NEW.created_at := now();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.civic_submission_guard() FROM PUBLIC;
CREATE TRIGGER civic_submission_guard BEFORE INSERT ON public.civic_submissions
FOR EACH ROW EXECUTE FUNCTION public.civic_submission_guard();

CREATE FUNCTION public.civic_submit_proof(request_id uuid,evidence_path text,payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE existing public.civic_submissions; safe_data jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  -- Serialize this citizen's submissions so the per-account limit cannot race.
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  safe_data := jsonb_build_object('project_id',payload->>'project_id','project_title',payload->>'project_title',
    'commune_name',payload->>'commune_name','region_name',payload->>'region_name',
    'comment',payload->>'comment','citizen_status_claim',payload->>'citizen_status_claim',
    'media_type',payload->>'media_type','citizen_name',payload->>'citizen_name',
    'locality_details',payload->>'locality_details','observation_date',payload->>'observation_date');
  SELECT * INTO existing FROM public.civic_submissions WHERE id=request_id;
  IF existing.id IS NOT NULL THEN
    IF existing.owner_id=auth.uid() AND existing.evidence_path=civic_submit_proof.evidence_path AND existing.data=safe_data THEN RETURN existing.id; END IF;
    RAISE EXCEPTION 'Duplicate request';
  END IF;
  IF (SELECT count(*) FROM public.civic_submissions WHERE owner_id=auth.uid() AND created_at>now()-interval '1 hour') >= 5
  THEN RAISE EXCEPTION 'Rate limit exceeded'; END IF;
  IF safe_data->>'project_id' IS NULL OR safe_data->>'comment' IS NULL OR safe_data->>'media_type' IS NULL
    OR safe_data->>'citizen_status_claim' IS NULL THEN RAISE EXCEPTION 'Missing fields'; END IF;
  INSERT INTO public.civic_submissions(id,owner_id,evidence_path,data)
  VALUES(request_id,auth.uid(),evidence_path,safe_data);
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.civic_submit_proof(uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_submit_proof(uuid,text,jsonb) TO authenticated;

CREATE TABLE public.civic_moderation_decisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proof_id uuid NOT NULL REFERENCES public.civic_submissions(id),
  actor uuid NOT NULL DEFAULT auth.uid(), decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED')),
  notes text NOT NULL DEFAULT '' CHECK(length(notes)<=5000), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.civic_moderation_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.civic_moderation_decisions FROM anon, authenticated;
GRANT SELECT, INSERT ON public.civic_moderation_decisions TO authenticated;
GRANT USAGE ON SEQUENCE public.civic_moderation_decisions_id_seq TO authenticated;
CREATE POLICY decisions_staff ON public.civic_moderation_decisions FOR ALL TO authenticated
USING(public.civic_role() IN ('ADMIN','MODERATOR'))
WITH CHECK(public.civic_role() IN ('ADMIN','MODERATOR') AND actor=auth.uid());
CREATE FUNCTION public.civic_moderate_proof(proof_id uuid,decision text,notes text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF public.civic_role() IS NULL OR public.civic_role() NOT IN ('ADMIN','MODERATOR') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF decision NOT IN ('APPROVED','REJECTED') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  UPDATE public.civic_submissions SET verification_status=decision WHERE id=proof_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown submission'; END IF;
  INSERT INTO public.civic_moderation_decisions(proof_id,decision,notes) VALUES(proof_id,decision,notes);
END $$;
REVOKE ALL ON FUNCTION public.civic_moderate_proof(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_moderate_proof(uuid,text,text) TO authenticated;

CREATE TABLE public.civic_confirmations (
  proof_id uuid NOT NULL REFERENCES public.civic_submissions(id), owner_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(proof_id,owner_id)
);
ALTER TABLE public.civic_confirmations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.civic_confirmations FROM anon, authenticated;
GRANT SELECT,INSERT ON public.civic_confirmations TO authenticated;
CREATE POLICY own_confirmations ON public.civic_confirmations FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE POLICY insert_confirmation ON public.civic_confirmations FOR INSERT TO authenticated
WITH CHECK(owner_id=auth.uid() AND EXISTS(SELECT 1 FROM public.civic_submissions WHERE id=proof_id AND verification_status='APPROVED'));
CREATE FUNCTION public.civic_confirm_proof(proof_id uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
 INSERT INTO public.civic_confirmations(proof_id,owner_id) VALUES(proof_id,auth.uid()) ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.civic_confirm_proof(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_confirm_proof(uuid) TO authenticated;

CREATE TABLE public.civic_subscribers (
  owner_id uuid PRIMARY KEY DEFAULT auth.uid(), email text NOT NULL CHECK(length(email)<=320 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  first_name text NOT NULL CHECK(length(first_name)<=120), commune text NOT NULL CHECK(length(commune)<=120),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.civic_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.civic_subscribers FROM anon,authenticated;
GRANT INSERT,UPDATE,SELECT ON public.civic_subscribers TO authenticated;
CREATE POLICY subscriber_read ON public.civic_subscribers FOR SELECT TO authenticated USING(owner_id=auth.uid() OR public.civic_role()='ADMIN');
CREATE POLICY subscriber_insert ON public.civic_subscribers FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid());
CREATE POLICY subscriber_update ON public.civic_subscribers FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
CREATE FUNCTION public.civic_subscribe(subscriber_email text,subscriber_name text,subscriber_commune text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
 INSERT INTO public.civic_subscribers(owner_id,email,first_name,commune)
 VALUES(auth.uid(),subscriber_email,subscriber_name,subscriber_commune)
 ON CONFLICT(owner_id) DO UPDATE SET email=excluded.email,first_name=excluded.first_name,commune=excluded.commune;
$$;
REVOKE ALL ON FUNCTION public.civic_subscribe(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_subscribe(text,text,text) TO authenticated;

COMMIT;
