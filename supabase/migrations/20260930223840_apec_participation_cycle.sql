CREATE TABLE public.apec_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id text NOT NULL REFERENCES public.institutions(id),
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 240),
  source_reference text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 3 AND 1000),
  source_date date NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.apec_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.apec_cycles(id),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 240),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 3 AND 4000),
  source_reference text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 3 AND 1000),
  source_date date NOT NULL,
  provenance text NOT NULL DEFAULT 'CITIZEN_OBSERVATION' CHECK (provenance = 'CITIZEN_OBSERVATION'),
  verification_status text NOT NULL DEFAULT 'TO_VERIFY' CHECK (verification_status IN ('TO_VERIFY','VERIFIED','REJECTED')),
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','PRIORITIZED','LINKED','ANSWERED')),
  priority integer CHECK (priority BETWEEN 1 AND 999),
  project_id text REFERENCES public.budget_projects(id),
  local_budget_id text REFERENCES public.local_budgets(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.apec_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES public.apec_needs(id),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 3 AND 4000),
  source_reference text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 3 AND 1000),
  source_date date NOT NULL,
  provenance text NOT NULL DEFAULT 'CITIZEN_OBSERVATION' CHECK (provenance = 'CITIZEN_OBSERVATION'),
  verification_status text NOT NULL DEFAULT 'TO_VERIFY' CHECK (verification_status IN ('TO_VERIFY','VERIFIED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.apec_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  need_id uuid NOT NULL REFERENCES public.apec_needs(id),
  contribution_id uuid REFERENCES public.apec_contributions(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  kind text NOT NULL CHECK (kind IN ('SUBMITTED','CONTRIBUTION','VERIFY','REJECT','PRIORITIZE','LINK','RESPONSE','FOLLOW_UP','VERIFY_CONTRIBUTION','REJECT_CONTRIBUTION')),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 3 AND 4000),
  source_reference text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 3 AND 1000),
  source_date date NOT NULL,
  provenance text NOT NULL CHECK (provenance IN ('CITIZEN_OBSERVATION','SUIVIBUDGET_CALCULATION','INSTITUTION_RESPONSE')),
  decision_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX apec_cycles_institution_idx ON public.apec_cycles(institution_id,fiscal_year);
CREATE INDEX apec_needs_owner_idx ON public.apec_needs(user_id);
CREATE INDEX apec_needs_cycle_idx ON public.apec_needs(cycle_id);
CREATE INDEX apec_contributions_need_idx ON public.apec_contributions(need_id);
CREATE INDEX apec_contributions_owner_idx ON public.apec_contributions(user_id);
CREATE INDEX apec_events_need_idx ON public.apec_events(need_id,sequence);

ALTER TABLE public.apec_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apec_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apec_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apec_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.apec_cycles,public.apec_needs,public.apec_contributions,public.apec_events FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE public.apec_events_sequence_seq FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.apec_cycles TO anon,authenticated;
GRANT INSERT (institution_id,fiscal_year,title,source_reference,source_date), UPDATE (status) ON public.apec_cycles TO authenticated;
GRANT SELECT ON public.apec_needs,public.apec_contributions,public.apec_events TO authenticated;
GRANT INSERT (cycle_id,title,description,source_reference,source_date) ON public.apec_needs TO authenticated;
GRANT INSERT (need_id,body,source_reference,source_date) ON public.apec_contributions TO authenticated;

CREATE POLICY apec_cycles_read ON public.apec_cycles FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY apec_cycles_create ON public.apec_cycles FOR INSERT TO authenticated WITH CHECK (private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']));
CREATE POLICY apec_cycles_close ON public.apec_cycles FOR UPDATE TO authenticated USING (private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER'])) WITH CHECK (private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']));
CREATE POLICY apec_needs_read ON public.apec_needs FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) OR private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']));
CREATE POLICY apec_needs_submit ON public.apec_needs FOR INSERT TO authenticated WITH CHECK (
  user_id=(SELECT auth.uid()) AND verification_status='TO_VERIFY' AND status='SUBMITTED'
  AND EXISTS (SELECT 1 FROM public.apec_cycles c WHERE c.id=cycle_id AND c.status='OPEN')
);
CREATE POLICY apec_contributions_read ON public.apec_contributions FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) OR private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']));
CREATE POLICY apec_contributions_submit ON public.apec_contributions FOR INSERT TO authenticated WITH CHECK (
  user_id=(SELECT auth.uid()) AND verification_status='TO_VERIFY'
  AND EXISTS (SELECT 1 FROM public.apec_needs n JOIN public.apec_cycles c ON c.id=n.cycle_id WHERE n.id=need_id AND c.status='OPEN' AND n.verification_status<>'REJECTED')
);
CREATE POLICY apec_events_read ON public.apec_events FOR SELECT TO authenticated USING (
  private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']) OR EXISTS (SELECT 1 FROM public.apec_needs n WHERE n.id=need_id AND n.user_id=(SELECT auth.uid()))
);

CREATE FUNCTION private.apec_submission_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_TABLE_NAME='apec_needs' THEN
    INSERT INTO public.apec_events(need_id,actor_id,kind,body,source_reference,source_date,provenance)
    VALUES (NEW.id,NEW.user_id,'SUBMITTED',NEW.description,NEW.source_reference,NEW.source_date,'CITIZEN_OBSERVATION');
  ELSE
    INSERT INTO public.apec_events(need_id,contribution_id,actor_id,kind,body,source_reference,source_date,provenance)
    VALUES (NEW.need_id,NEW.id,NEW.user_id,'CONTRIBUTION','Contribution reçue, à vérifier',NEW.source_reference,NEW.source_date,'CITIZEN_OBSERVATION');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.apec_submission_event() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER apec_need_receipt AFTER INSERT ON public.apec_needs FOR EACH ROW EXECUTE FUNCTION private.apec_submission_event();
CREATE TRIGGER apec_contribution_receipt AFTER INSERT ON public.apec_contributions FOR EACH ROW EXECUTE FUNCTION private.apec_submission_event();

CREATE FUNCTION public.record_apec_decision(
  p_need_id uuid,p_action text,p_body text,p_source_reference text,p_source_date date,
  p_priority integer DEFAULT NULL,p_project_id text DEFAULT NULL,p_local_budget_id text DEFAULT NULL,p_contribution_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n public.apec_needs; c public.apec_cycles;
BEGIN
  IF NOT coalesce(private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']),false) THEN RAISE EXCEPTION 'APEC staff required' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT n FROM public.apec_needs WHERE id=p_need_id FOR UPDATE;
  SELECT * INTO STRICT c FROM public.apec_cycles WHERE id=n.cycle_id;
  IF p_contribution_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.apec_contributions WHERE id=p_contribution_id AND need_id=n.id) THEN RAISE EXCEPTION 'Contribution does not belong to need'; END IF;
  CASE p_action
    WHEN 'VERIFY','REJECT' THEN
      IF n.status<>'SUBMITTED' OR n.verification_status<>'TO_VERIFY' THEN RAISE EXCEPTION 'Need already reviewed'; END IF;
      UPDATE public.apec_needs SET verification_status=CASE WHEN p_action='VERIFY' THEN 'VERIFIED' ELSE 'REJECTED' END WHERE id=n.id;
    WHEN 'PRIORITIZE' THEN
      IF n.verification_status<>'VERIFIED' OR n.status NOT IN ('SUBMITTED','PRIORITIZED') OR p_priority IS NULL THEN RAISE EXCEPTION 'Verified need and priority required'; END IF;
      UPDATE public.apec_needs SET priority=p_priority,status='PRIORITIZED' WHERE id=n.id;
    WHEN 'LINK' THEN
      IF n.verification_status<>'VERIFIED' OR n.status NOT IN ('PRIORITIZED','LINKED') OR (p_project_id IS NULL AND p_local_budget_id IS NULL) THEN RAISE EXCEPTION 'Prioritised need and link required'; END IF;
      IF p_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.budget_projects WHERE id=p_project_id AND institution_id=c.institution_id AND fiscal_year=c.fiscal_year) THEN RAISE EXCEPTION 'Project institution or year mismatch'; END IF;
      IF p_local_budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.local_budgets WHERE id=p_local_budget_id AND institution_id=c.institution_id AND fiscal_year=c.fiscal_year AND status='PUBLISHED') THEN RAISE EXCEPTION 'Published budget institution or year mismatch'; END IF;
      UPDATE public.apec_needs SET project_id=p_project_id,local_budget_id=p_local_budget_id,status='LINKED' WHERE id=n.id;
    WHEN 'RESPONSE' THEN
      IF n.status NOT IN ('LINKED','ANSWERED') THEN RAISE EXCEPTION 'Linked need required'; END IF;
      UPDATE public.apec_needs SET status='ANSWERED' WHERE id=n.id;
    WHEN 'FOLLOW_UP' THEN NULL;
    WHEN 'VERIFY_CONTRIBUTION','REJECT_CONTRIBUTION' THEN
      IF p_contribution_id IS NULL THEN RAISE EXCEPTION 'Contribution required'; END IF;
      UPDATE public.apec_contributions SET verification_status=CASE WHEN p_action='VERIFY_CONTRIBUTION' THEN 'VERIFIED' ELSE 'REJECTED' END WHERE id=p_contribution_id AND verification_status='TO_VERIFY';
      IF NOT FOUND THEN RAISE EXCEPTION 'Contribution already reviewed'; END IF;
    ELSE RAISE EXCEPTION 'Unknown APEC action';
  END CASE;
  INSERT INTO public.apec_events(need_id,contribution_id,actor_id,kind,body,source_reference,source_date,provenance,decision_data)
  SELECT n.id,p_contribution_id,auth.uid(),p_action,p_body,p_source_reference,p_source_date,CASE WHEN p_action='RESPONSE' THEN 'INSTITUTION_RESPONSE' ELSE 'SUIVIBUDGET_CALCULATION' END,
    jsonb_build_object('priority',priority,'project_id',project_id,'local_budget_id',local_budget_id,'status',status,'verification_status',verification_status)
  FROM public.apec_needs WHERE id=n.id;
END $$;
REVOKE ALL ON FUNCTION public.record_apec_decision(uuid,text,text,text,date,integer,text,text,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.record_apec_decision(uuid,text,text,text,date,integer,text,text,uuid) TO authenticated;

CREATE FUNCTION public.apec_link_targets(p_institution_id text,p_fiscal_year integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']),false) THEN RAISE EXCEPTION 'APEC staff required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'projects',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title) ORDER BY id) FROM public.budget_projects WHERE institution_id=p_institution_id AND fiscal_year=p_fiscal_year),'[]'::jsonb),
    'budgets',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id) ORDER BY id) FROM public.local_budgets WHERE institution_id=p_institution_id AND fiscal_year=p_fiscal_year AND status='PUBLISHED'),'[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.apec_link_targets(text,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.apec_link_targets(text,integer) TO authenticated;
