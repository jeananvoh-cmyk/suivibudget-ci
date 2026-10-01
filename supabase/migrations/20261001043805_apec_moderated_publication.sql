CREATE TABLE public.apec_public_needs (
  need_id uuid PRIMARY KEY REFERENCES public.apec_needs(id),
  institution_id text NOT NULL REFERENCES public.institutions(id),
  fiscal_year integer NOT NULL,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 240),
  summary text NOT NULL CHECK (length(btrim(summary)) BETWEEN 3 AND 2000),
  source_reference text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 3 AND 1000),
  source_date date NOT NULL,
  provenance text NOT NULL DEFAULT 'CITIZEN_OBSERVATION' CHECK (provenance='CITIZEN_OBSERVATION'),
  status text NOT NULL CHECK (status IN ('PUBLISHED','WITHDRAWN')),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apec_public_needs_institution_idx ON public.apec_public_needs(institution_id,fiscal_year);
ALTER TABLE public.apec_public_needs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.apec_public_needs FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.apec_public_needs TO anon,authenticated;
CREATE POLICY apec_public_read ON public.apec_public_needs FOR SELECT TO anon,authenticated USING (status='PUBLISHED');

CREATE FUNCTION public.publish_apec_need(p_need_id uuid,p_title text,p_summary text,p_source_reference text,p_source_date date,p_privacy_reviewed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n public.apec_needs; c public.apec_cycles; snapshot public.apec_public_needs;
BEGIN
  IF NOT coalesce(private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']),false) THEN RAISE EXCEPTION 'APEC staff required' USING ERRCODE='42501'; END IF;
  IF p_privacy_reviewed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Explicit privacy review required'; END IF;
  SELECT * INTO STRICT n FROM public.apec_needs WHERE id=p_need_id FOR UPDATE;
  IF n.verification_status<>'VERIFIED' THEN RAISE EXCEPTION 'Verified need required'; END IF;
  SELECT * INTO STRICT c FROM public.apec_cycles WHERE id=n.cycle_id;
  INSERT INTO public.apec_public_needs(need_id,institution_id,fiscal_year,title,summary,source_reference,source_date,status)
  VALUES(n.id,c.institution_id,c.fiscal_year,p_title,p_summary,p_source_reference,p_source_date,'PUBLISHED')
  ON CONFLICT(need_id) DO UPDATE SET title=excluded.title,summary=excluded.summary,source_reference=excluded.source_reference,source_date=excluded.source_date,status='PUBLISHED',reviewed_at=now()
  RETURNING * INTO snapshot;
  INSERT INTO public.apec_events(need_id,actor_id,kind,body,source_reference,source_date,provenance,decision_data)
  VALUES(n.id,auth.uid(),'FOLLOW_UP','Résumé public relu et publié',p_source_reference,p_source_date,'SUIVIBUDGET_CALCULATION',jsonb_build_object('publication','PUBLISHED','snapshot',to_jsonb(snapshot)));
END $$;

CREATE FUNCTION public.withdraw_apec_need(p_need_id uuid,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE snapshot public.apec_public_needs;
BEGIN
  IF NOT coalesce(private.has_staff_role(ARRAY['ADMIN','DATA_MANAGER']),false) THEN RAISE EXCEPTION 'APEC staff required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.apec_needs WHERE id=p_need_id FOR UPDATE;
  UPDATE public.apec_public_needs SET status='WITHDRAWN',reviewed_at=now() WHERE need_id=p_need_id AND status='PUBLISHED' RETURNING * INTO snapshot;
  IF NOT FOUND THEN RAISE EXCEPTION 'Published summary required'; END IF;
  INSERT INTO public.apec_events(need_id,actor_id,kind,body,source_reference,source_date,provenance,decision_data)
  VALUES(p_need_id,auth.uid(),'FOLLOW_UP',p_reason,snapshot.source_reference,snapshot.source_date,'SUIVIBUDGET_CALCULATION',jsonb_build_object('publication','WITHDRAWN','snapshot',to_jsonb(snapshot)));
END $$;
REVOKE ALL ON FUNCTION public.publish_apec_need(uuid,text,text,text,date,boolean),public.withdraw_apec_need(uuid,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.publish_apec_need(uuid,text,text,text,date,boolean),public.withdraw_apec_need(uuid,text) TO authenticated;
