-- SuiviBudget CI — impose côté PostgreSQL la file modérée des droits de réponse.
-- Le contrôle React reste une aide UX ; seule cette règle serveur fait autorité.
BEGIN;

-- Ne jamais utiliser user_metadata pour une autorisation : l'utilisateur peut le modifier.
DROP POLICY IF EXISTS "Allow admin and moderator full access on responses"
  ON public.ca_institution_responses;

CREATE POLICY "Staff manage institution responses"
  ON public.ca_institution_responses
  FOR ALL
  TO authenticated
  USING (private.has_staff_role(ARRAY['ADMIN','MODERATOR','DATA_MANAGER']))
  WITH CHECK (private.has_staff_role(ARRAY['ADMIN','MODERATOR','DATA_MANAGER']));

CREATE OR REPLACE FUNCTION private.enforce_institution_response_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.response_status IS DISTINCT FROM 'PENDING' THEN
      RAISE EXCEPTION 'Institution responses must enter moderation as PENDING'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF (
    NEW.ca_id IS DISTINCT FROM OLD.ca_id
    OR NEW.operation_id IS DISTINCT FROM OLD.operation_id
    OR NEW.response_text IS DISTINCT FROM OLD.response_text
    OR NEW.response_date IS DISTINCT FROM OLD.response_date
    OR NEW.author_name IS DISTINCT FROM OLD.author_name
    OR NEW.author_title IS DISTINCT FROM OLD.author_title
    OR NEW.supporting_document_url IS DISTINCT FROM OLD.supporting_document_url
    OR NEW.supporting_document_name IS DISTINCT FROM OLD.supporting_document_name
  ) AND NEW.response_status IS DISTINCT FROM 'PENDING' THEN
    RAISE EXCEPTION 'Editing institution response content requires returning it to PENDING'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.response_status IS NOT DISTINCT FROM OLD.response_status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.response_status = 'PENDING' AND NEW.response_status = 'VALIDATED')
    OR (OLD.response_status = 'VALIDATED' AND NEW.response_status IN ('PUBLISHED','PENDING'))
    OR (OLD.response_status = 'PUBLISHED' AND NEW.response_status = 'PENDING')
  ) THEN
    RAISE EXCEPTION 'Invalid institution response moderation transition: % -> %',
      OLD.response_status, NEW.response_status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enforce_institution_response_moderation()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_institution_response_moderation
  ON public.ca_institution_responses;

CREATE TRIGGER enforce_institution_response_moderation
  BEFORE INSERT OR UPDATE OR DELETE
  ON public.ca_institution_responses
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_institution_response_moderation();

COMMIT;
