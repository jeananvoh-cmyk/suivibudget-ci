create table public.data_import_rows (
  id text primary key,
  payload jsonb not null,
  status text not null default 'TO_VERIFY' check(status in ('TO_VERIFY','VERIFIED','PUBLISHED','REJECTED')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  verified_by uuid,
  verified_at timestamptz,
  published_at timestamptz
);
create table public.data_import_events (
  id bigint generated always as identity primary key,
  row_id text not null references public.data_import_rows(id),
  action text not null,
  reason text not null,
  actor_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index data_import_events_row_idx on public.data_import_events(row_id);
alter table public.data_import_rows enable row level security;
alter table public.data_import_events enable row level security;
create policy "Import staff read" on public.data_import_rows for select to authenticated using ((select private.has_staff_role(array['ADMIN','DATA_MANAGER'])));
create policy "Import audit staff read" on public.data_import_events for select to authenticated using ((select private.has_staff_role(array['ADMIN','DATA_MANAGER'])));
revoke all on public.data_import_rows, public.data_import_events from public,anon,authenticated,service_role;
grant select on public.data_import_rows, public.data_import_events to authenticated;
revoke all on sequence public.data_import_events_id_seq from public,anon,authenticated,service_role;

alter table public.local_budgets add column import_provenance jsonb;
alter table public.administrative_accounts add column import_provenance jsonb;
alter table public.ca_investment_operations add column import_provenance jsonb;
alter table public.ca_procurement_matches add column import_provenance jsonb;

create function private.validate_import_row(r jsonb) returns text language plpgsql set search_path='' as $$
declare kind text:=r->>'kind'; d jsonb:=r->'data'; s jsonb:=r->'source'; k text; v jsonb; money text[]; allowed text[]; identity_parts jsonb; inst public.institutions%rowtype;
begin
  if jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(s) is distinct from 'object' or jsonb_typeof(r->'precision') is distinct from 'object' then raise exception 'Row, data, source and precision must be objects'; end if;
  if exists(select 1 from jsonb_object_keys(r) x where x not in ('kind','institution_id','institution_type','fiscal_year','source','data','precision')) then raise exception 'Unknown envelope field'; end if;
  select * into inst from public.institutions where id=r->>'institution_id';
  if not found or r->>'institution_type' is distinct from (case inst.type when 'MAIRIE' then 'COMMUNE' when 'REGION' then 'REGIONAL_COUNCIL' end) or r->>'institution_type' not in ('COMMUNE','REGIONAL_COUNCIL') then raise exception 'Institution/type mismatch'; end if;
  if coalesce(r->>'fiscal_year','') !~ '^[0-9]{4}$' or (r->>'fiscal_year')::int not between 2000 and 2100 then raise exception 'Fiscal year required'; end if;
  if jsonb_typeof(s->'name') is distinct from 'string' or jsonb_typeof(s->'reference') is distinct from 'string' or coalesce(btrim(s->>'name'),'')='' or coalesce(btrim(s->>'reference'),'')='' or coalesce(s->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(s->>'date_kind','') not in ('PUBLISHED','ACCESSED','RECORDED') then raise exception 'Source name/reference/date/date_kind required'; end if;
  perform (s->>'date')::date;
  if s ? 'url' and coalesce(s->>'url','') !~ '^https?://[^[:space:]]+$' then raise exception 'Invalid source URL'; end if;
  if exists(select 1 from jsonb_object_keys(s) x where x not in ('name','reference','date','date_kind','url')) then raise exception 'Unknown source field'; end if;
  case kind
  when 'BP' then
    money:=array['total_amount','operating_amount','investment_amount'];
    allowed:=money||array['budget_type','version_number','adoption_date','tutelle_approval_date','notes','verification_status','confidence_level'];
    if coalesce(d->>'budget_type','') not in ('PRIMITIF_ADOPTE','PRIMITIF_APRES_TUTELLE','AUTORISATION_EXECUTION','MODIFICATIF_1','MODIFICATIF_2','AUTRE_MODIFICATIF') or coalesce(d->>'version_number','') !~ '^[1-9][0-9]{0,3}$' then raise exception 'BP type/version required'; end if;
    identity_parts:=jsonb_build_array(kind,inst.id,r->>'fiscal_year',d->>'budget_type',d->>'version_number');
  when 'CA' then
    money:=array['operating_planned','operating_realized','operating_revenue_realized','investment_planned','investment_realized','investment_revenue_realized','total_planned','total_realized','surplus_or_deficit','operating_revenue_planned','operating_revenue_emitted','operating_revenue_collected','operating_expenditure_planned','operating_expenditure_engaged','investment_revenue_planned','investment_revenue_emitted','investment_revenue_collected','investment_expenditure_planned','investment_expenditure_engaged','total_revenue_collected','total_expenditure_engaged','arithmetic_difference'];
    allowed:=money||array['source_page','approval_date','prefecture_visa_date','notes','verification_status'];
    identity_parts:=jsonb_build_array(kind,inst.id,r->>'fiscal_year');
  when 'OPERATION' then
    money:=array['planned_amount','executed_amount'];
    allowed:=money||array['ca_id','operation_reference','title','sector','location','source_page','notes'];
    if coalesce(btrim(d->>'ca_id'),'')='' or coalesce(btrim(d->>'operation_reference'),'')='' then raise exception 'CA id and operation reference required'; end if;
    identity_parts:=jsonb_build_array(kind,inst.id,r->>'fiscal_year',d->>'ca_id',d->>'operation_reference');
  when 'DGMP' then
    money:=array['award_amount'];
    allowed:=money||array['operation_id','tender_number','contract_number','procurement_object','contractor','award_date','lot','match_level','match_evidence','notes'];
    if coalesce(btrim(d->>'tender_number'),'')='' then raise exception 'Tender number required'; end if;
    if coalesce(d->>'match_level','') not in ('STRONG','PARTIAL','NONE','TO_VERIFY') then raise exception 'Explicit matching status required'; end if;
    identity_parts:=jsonb_build_array(kind,inst.id,r->>'fiscal_year',d->>'tender_number',coalesce(d->>'lot',''));
  else raise exception 'Unknown import kind';
  end case;
  for k,v in select * from jsonb_each(d) loop
    if not k=any(allowed) then raise exception 'Unsupported data field: %',k; end if;
    if k=any(money) then
      if coalesce(r->'precision'->>k,'') not in ('EXACT','APPROXIMATE','LOWER_BOUND','UNKNOWN') then raise exception 'Amount precision required: %',k; end if;
      if r->'precision'->>k='UNKNOWN' then
        if v<>'null'::jsonb then raise exception 'UNKNOWN amount must be null'; end if;
      elsif jsonb_typeof(v) is distinct from 'number' or v::text !~ '^-?[0-9]+$' or abs(v::text::numeric)>9007199254740991 or (v::text::numeric<0 and k not in ('surplus_or_deficit','arithmetic_difference')) then raise exception 'Invalid FCFA integer: %',k; end if;
    elsif k='source_page' then
      if v::text !~ '^[1-9][0-9]*$' then raise exception 'Positive source page required'; end if;
    elsif k<>'version_number' and jsonb_typeof(v) not in ('string','null') then raise exception 'Invalid text field: %',k;
    end if;
    if k like '%date' and v<>'null'::jsonb then perform (d->>k)::date; end if;
  end loop;
  if exists(select 1 from jsonb_object_keys(r->'precision') x where not x=any(money) or not d ? x) then raise exception 'Precision without matching amount'; end if;
  return 'import-'||encode(sha256(convert_to(identity_parts::text,'UTF8')),'hex');
end $$;
revoke all on function private.validate_import_row(jsonb) from public,anon,authenticated,service_role;

create function public.import_data_batch(p_rows jsonb,p_commit boolean default false,p_plan_hash text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r jsonb; other jsonb; old jsonb; v_id text; other_id text; result jsonb:='[]'; preview jsonb; seen jsonb:='{}'; n int:=0; state text; message text; plan_hash text; item jsonb; counts jsonb;
begin
  if private.has_staff_role(array['ADMIN','DATA_MANAGER']) is not true then raise exception 'Staff authorization required'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 100 or octet_length(p_rows::text)>1000000 then raise exception 'Batch must contain 1..100 rows, at most 1 MB'; end if;
  perform pg_advisory_xact_lock(20261001,91748);
  for r in select * from jsonb_array_elements(p_rows) loop
    n:=n+1; v_id:=null; message:=null;
    begin
      v_id:=private.validate_import_row(r); state:='READY';
      for other in select * from jsonb_array_elements(p_rows) loop
        begin other_id:=private.validate_import_row(other); exception when others then other_id:=null; end;
        if other_id=v_id and other<>r then state:='CONFLICT'; message:='Conflicting versions in this batch'; end if;
      end loop;
      select payload into old from public.data_import_rows where data_import_rows.id=v_id;
      if found then
        if old=r then state:='IGNORED'; else state:='CONFLICT'; message:='Existing source version differs; no overwrite'; end if;
      elsif (r->>'kind'='CA' and exists(select 1 from public.administrative_accounts a where a.institution_id=r->>'institution_id' and a.fiscal_year=(r->>'fiscal_year')::int))
        or (r->>'kind'='BP' and exists(select 1 from public.local_budgets b where b.institution_id=r->>'institution_id' and b.fiscal_year=(r->>'fiscal_year')::int and b.budget_type=r->'data'->>'budget_type' and b.version_number=(r->'data'->>'version_number')::int))
        or (r->>'kind'='OPERATION' and exists(select 1 from public.ca_investment_operations o where o.ca_id=r->'data'->>'ca_id' and o.operation_reference=r->'data'->>'operation_reference'))
        or (r->>'kind'='DGMP' and exists(select 1 from public.ca_procurement_matches m where m.operation_id=r->'data'->>'operation_id' or (m.tender_number=r->'data'->>'tender_number' and coalesce(m.lot,'')=coalesce(r->'data'->>'lot','')))) then
        state:='CONFLICT'; message:='Existing canonical record; no overwrite';
      elsif state='READY' and seen ? v_id then state:='IGNORED';
      end if;
      if state='READY' then seen:=seen||jsonb_build_object(v_id,true); end if;
    exception when others then state:='ERROR'; message:=sqlerrm;
    end;
    result:=result||jsonb_build_array(jsonb_build_object('line',n,'id',v_id,'status',state,'message',message));
  end loop;
  plan_hash:=encode(sha256(convert_to(jsonb_build_array(p_rows,result)::text,'UTF8')),'hex');
  if p_commit then
    if p_plan_hash is distinct from plan_hash then raise exception 'Dry-run required or stale; regenerate the plan'; end if;
    preview:=result; result:='[]'; n:=0; seen:='{}';
    for r in select * from jsonb_array_elements(p_rows) loop
      n:=n+1;
      -- Reuse the reviewed plan while holding the import lock; duplicates cannot race.
      item:=preview->(n-1);
      if item->>'status'='READY' then
        begin
          insert into public.data_import_rows(id,payload) values(item->>'id',r);
          insert into public.data_import_events(row_id,action,reason) values(item->>'id','IMPORTED','Dry-run '||p_plan_hash);
          item:=jsonb_set(item,'{status}','"IMPORTED"');
        exception when others then item:=item||jsonb_build_object('status','ERROR','message',sqlerrm);
        end;
      end if;
      result:=result||jsonb_build_array(item);
    end loop;
  end if;
  select jsonb_build_object('ready',count(*) filter(where x->>'status'='READY'),'imported',count(*) filter(where x->>'status'='IMPORTED'),'ignored',count(*) filter(where x->>'status'='IGNORED'),'conflicts',count(*) filter(where x->>'status'='CONFLICT'),'errors',count(*) filter(where x->>'status'='ERROR')) into counts from jsonb_array_elements(result) x;
  return jsonb_build_object('dry_run',not p_commit,'plan_hash',plan_hash,'counts',counts,'rows',result);
end $$;

create function public.review_data_import(p_ids text[],p_action text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id text; rec public.data_import_rows%rowtype; r jsonb; d jsonb; s jsonb; target text; required text[]; k text; output jsonb:='[]'; state text; inst_name text; parent_inst text; parent_year int; parent_status text; precision text;
begin
  if private.has_staff_role(array['ADMIN','DATA_MANAGER']) is not true then raise exception 'Staff authorization required'; end if;
  if cardinality(p_ids) not between 1 and 100 or p_ids is null or p_action is null or p_action not in ('VERIFY','PUBLISH','REJECT') or coalesce(length(btrim(p_reason)),0)<5 then raise exception 'Explicit action, reason and 1..100 ids required'; end if;
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
        if r->>'kind'='BP' then
          select min(value) into precision from jsonb_each_text(r->'precision');
          if precision='UNKNOWN' or (select count(distinct value) from jsonb_each_text(r->'precision'))<>1 then raise exception 'BP publication requires one known precision for all amounts'; end if;
        elsif exists(select 1 from jsonb_each_text(r->'precision') x where value<>'EXACT') then raise exception 'Legacy publication requires exact amounts; retain qualified/unknown values in staging'; end if;
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
        foreach k in array required loop if coalesce(btrim(d->>k),'')='' then raise exception 'Publication requires sourced field: %',k; end if; end loop;
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
revoke all on function public.import_data_batch(jsonb,boolean,text), public.review_data_import(text[],text,text) from public,anon,authenticated,service_role;
grant execute on function public.import_data_batch(jsonb,boolean,text), public.review_data_import(text[],text,text) to authenticated;
