alter table public.local_budgets alter column total_amount drop not null, alter column operating_amount drop not null, alter column investment_amount drop not null;
alter table public.administrative_accounts alter column operating_planned drop not null, alter column operating_realized drop not null, alter column investment_planned drop not null, alter column investment_realized drop not null, alter column total_planned drop not null, alter column total_realized drop not null;
alter table public.ca_investment_operations alter column planned_amount drop not null, alter column executed_amount drop not null;
alter table public.ca_procurement_matches alter column award_amount drop not null;

drop function public.review_data_import(text[],text,text);
create function public.review_data_import(p_ids text[],p_action text,p_reason text,p_publish_confirmed boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id text; rec public.data_import_rows%rowtype; r jsonb; d jsonb; s jsonb; target text; required text[]; k text; output jsonb:='[]'; state text; inst_name text; parent_inst text; parent_year int; parent_status text; precision text;
begin
  if private.has_staff_role(array['ADMIN','DATA_MANAGER']) is not true then raise exception 'Staff authorization required'; end if;
  if cardinality(p_ids) not between 1 and 100 or p_ids is null or p_action is null or p_action not in ('VERIFY','PUBLISH','REJECT') or coalesce(length(btrim(p_reason)),0)<5 then raise exception 'Explicit action, reason and 1..100 ids required'; end if;
  if p_action='PUBLISH' and p_publish_confirmed is distinct from true then raise exception 'Explicit publication confirmation required'; end if;
  perform pg_advisory_xact_lock(20261001,91748);
  foreach v_id in array p_ids loop
    begin
      select * into rec from public.data_import_rows where data_import_rows.id=v_id for update;
      if not found then raise exception 'Import row not found'; end if;
      if rec.status='PUBLISHED' and p_action='PUBLISH' then state:='IGNORED';
      elsif p_action='VERIFY' and rec.status='TO_VERIFY' then
        update public.data_import_rows set status='VERIFIED',verified_by=auth.uid(),verified_at=now() where data_import_rows.id=v_id; state:='VERIFIED';
      elsif p_action='REJECT' and rec.status in ('TO_VERIFY','VERIFIED') then
        update public.data_import_rows set status='REJECTED' where data_import_rows.id=v_id; state:='REJECTED';
      elsif p_action='PUBLISH' and rec.status='VERIFIED' then
        r:=rec.payload; perform private.validate_import_row(r); d:=r->'data'; s:=r->'source';
        select name into inst_name from public.institutions where institutions.id=r->>'institution_id';
        precision:=coalesce(r->'precision'->>'total_amount','UNKNOWN');
        d:=d||jsonb_build_object('id',v_id,'institution_id',r->>'institution_id','institution_type',r->>'institution_type','institution_name',inst_name,'fiscal_year',(r->>'fiscal_year')::int,'status','PUBLISHED','created_at',now(),'updated_at',now(),'import_provenance',jsonb_build_object('source',s,'precision',r->'precision','import_id',v_id));
        case r->>'kind'
        when 'BP' then
          target:='local_budgets'; required:=array['total_amount','operating_amount','investment_amount','verification_status','confidence_level'];
          if exists(select 1 from public.local_budgets b where b.institution_id=r->>'institution_id' and b.fiscal_year=(r->>'fiscal_year')::int and b.budget_type=d->>'budget_type' and b.version_number=(d->>'version_number')::int) then raise exception 'Existing BP version conflict'; end if;
          d:=d||jsonb_build_object('is_current_version',false,'amount_precision',precision,'document_name',s->>'name','document_url',s->>'url','source_access_date',case when s->>'date_kind'='ACCESSED' then s->>'date' end,'publication_date',case when s->>'date_kind'='PUBLISHED' then s->>'date' end);
        when 'CA' then
          target:='administrative_accounts'; required:=array['operating_planned','operating_realized','investment_planned','investment_realized','total_planned','total_realized','verification_status'];
          if exists(select 1 from public.administrative_accounts a where a.institution_id=r->>'institution_id' and a.fiscal_year=(r->>'fiscal_year')::int) then raise exception 'Existing CA conflict'; end if;
          d:=d||jsonb_build_object('source_document',s->>'name','source_url',s->>'url','reconciliation_status','TO_VERIFY');
        when 'OPERATION' then
          target:='ca_investment_operations'; required:=array['planned_amount','executed_amount','title','sector'];
          select a.institution_id,a.fiscal_year,a.status into parent_inst,parent_year,parent_status from public.administrative_accounts a where a.id=d->>'ca_id' for share;
          if parent_inst is distinct from r->>'institution_id' or parent_year is distinct from (r->>'fiscal_year')::int or parent_status is distinct from 'PUBLISHED' then raise exception 'Published CA institution/year mismatch'; end if;
          if exists(select 1 from public.ca_investment_operations o where o.ca_id=d->>'ca_id' and o.operation_reference=d->>'operation_reference') then raise exception 'Existing operation conflict'; end if;
          d:=d||jsonb_build_object('source_reference',s->>'reference');
        when 'DGMP' then
          target:='ca_procurement_matches'; required:=array['award_amount','procurement_object','contractor','operation_id','match_evidence'];
          if d->>'match_level' is distinct from 'STRONG' then raise exception 'Ambiguous DGMP matching cannot be published'; end if;
          select o.institution_id,o.fiscal_year,a.status into parent_inst,parent_year,parent_status from public.ca_investment_operations o join public.administrative_accounts a on a.id=o.ca_id where o.id=d->>'operation_id' for share of o,a;
          if parent_inst is distinct from r->>'institution_id' or parent_year is distinct from (r->>'fiscal_year')::int or parent_status is distinct from 'PUBLISHED' then raise exception 'Published operation institution/year mismatch'; end if;
          if exists(select 1 from public.ca_procurement_matches m where m.operation_id=d->>'operation_id' or (m.tender_number=d->>'tender_number' and coalesce(m.lot,'')=coalesce(d->>'lot',''))) then raise exception 'Existing DGMP match conflict'; end if;
          d:=d||jsonb_build_object('source',s->>'name','source_url',s->>'url','verification_status','VERIFIED','import_provenance',d->'import_provenance'||jsonb_build_object('match_evidence',d->>'match_evidence'));
        end case;
        foreach k in array required loop
          if r->'precision' ? k then
            if not (r->'data' ? k) then raise exception 'Publication requires qualified amount: %',k; end if;
          elsif coalesce(btrim(d->>k),'')='' then raise exception 'Publication requires sourced field: %',k;
          end if;
        end loop;
        -- Fixed table allowlist above; populate all columns so absent nullable amounts stay NULL instead of historical DEFAULT 0.
        execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I,$1)',target,target) using d;
        update public.data_import_rows set status='PUBLISHED',published_at=now() where data_import_rows.id=v_id; state:='PUBLISHED';
      else raise exception 'Invalid review transition'; end if;
      if state<>'IGNORED' then insert into public.data_import_events(row_id,action,reason) values(v_id,state,p_reason); end if;
      output:=output||jsonb_build_array(jsonb_build_object('id',v_id,'status',state));
    exception when others then output:=output||jsonb_build_array(jsonb_build_object('id',v_id,'status','ERROR','message',sqlerrm));
    end;
  end loop;
  return jsonb_build_object('rows',output);
end $$;

revoke all on function public.review_data_import(text[],text, text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.review_data_import(text[],text,text,boolean) to authenticated;
