-- SuiviBudget CI — impose côté PostgreSQL la file modérée des droits de réponse.
-- Le contrôle React reste une aide UX ; seule cette règle serveur fait autorité.
BEGIN;

-- La date doit être fournie explicitement : aucune date implicite à l'enregistrement.
ALTER TABLE public.ca_institution_responses
  ALTER COLUMN response_date DROP DEFAULT;

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
  IF TG_OP = 'DELETE' THEN
    IF OLD.response_status = 'PUBLISHED' THEN
      RAISE EXCEPTION 'A published institution response must be returned to PENDING before deletion'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.response_status IS DISTINCT FROM 'PENDING' THEN
      RAISE EXCEPTION 'Institution responses must enter moderation as PENDING'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  -- Comparaison générique de la ligne : ne dépend pas d'une liste de colonnes
  -- susceptible de diverger entre le schéma déployé et les fixtures de test.
  IF (to_jsonb(NEW) - 'response_status' - 'created_at')
      IS DISTINCT FROM (to_jsonb(OLD) - 'response_status' - 'created_at')
    AND NEW.response_status IS DISTINCT FROM 'PENDING' THEN
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
