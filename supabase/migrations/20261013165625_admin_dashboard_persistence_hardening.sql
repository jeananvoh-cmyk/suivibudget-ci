begin;

create or replace function private.admin_domain_allowed(entity text, row_data jsonb) returns boolean
language sql stable security invoker set search_path='' as $$
  select private.has_staff_role(array['ADMIN']) or
    (entity in ('institutions','budget_projects','budget_lines','public_documents','caidp_directory') and private.has_staff_role(array['DATA_MANAGER'])) or
    (entity in ('news_articles','citizen_proofs') and private.has_staff_role(array['MODERATOR'])) or
    (entity='admin_tasks' and ((row_data->>'type'='PROOF_MODERATION' and private.has_staff_role(array['MODERATOR'])) or
      (row_data->>'type' in ('DOCUMENT_VERIFICATION','CAIDP_CONTACT_COMPLETION') and private.has_staff_role(array['DATA_MANAGER']))))
$$;
revoke all on function private.admin_domain_allowed(text,jsonb) from public,anon;
grant execute on function private.admin_domain_allowed(text,jsonb) to authenticated;

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  occurred_at timestamptz not null default clock_timestamp(),
  before_data jsonb,
  after_data jsonb,
  result text not null default 'CONFIRMED' check (result = 'CONFIRMED'),
  reason text not null,
  provenance jsonb not null default '{}',
  operation_id uuid,
  operation_hash text
);
create index if not exists admin_audit_entity on public.admin_audit_events(entity_type, entity_id, occurred_at);
create index if not exists admin_audit_operation on public.admin_audit_events(actor_id, operation_id);
alter table public.admin_audit_events enable row level security;
revoke all on public.admin_audit_events from anon, authenticated;
grant select on public.admin_audit_events to authenticated;
drop policy if exists admin_audit_read on public.admin_audit_events;
create policy admin_audit_read on public.admin_audit_events for select to authenticated
  using (private.admin_domain_allowed(entity_type,coalesce(after_data,before_data)));

create table if not exists public.admin_operation_receipts (
  operation_id uuid primary key,
  actor_id uuid not null,
  entity_type text not null,
  entity_id text not null,
  input_payload jsonb not null,
  result_data jsonb not null,
  committed_at timestamptz not null default clock_timestamp()
);
alter table public.admin_operation_receipts enable row level security;
revoke all on public.admin_operation_receipts from public,anon,authenticated;
grant select on public.admin_operation_receipts to authenticated;
drop policy if exists admin_receipt_read on public.admin_operation_receipts;
create policy admin_receipt_read on public.admin_operation_receipts for select to authenticated
  using(actor_id=auth.uid() and private.admin_domain_allowed(entity_type,result_data));

alter table public.institutions add column if not exists revision integer not null default 1;
alter table public.institutions add column if not exists archived_at timestamptz;
alter table public.institutions add column if not exists publication_status text not null default 'PUBLISHED';
alter table public.institutions add column if not exists profile_metadata jsonb not null default '{}';
alter table public.budget_projects add column if not exists revision integer not null default 1;
alter table public.budget_projects add column if not exists archived_at timestamptz;
alter table public.budget_projects add column if not exists publication_status text not null default 'PUBLISHED';
alter table public.budget_projects add column if not exists source_document_id text references public.public_documents(id);
alter table public.budget_projects add column if not exists source_page integer;
alter table public.budget_projects add column if not exists source_url text;
alter table public.budget_projects add column if not exists project_metadata jsonb not null default '{}';
alter table public.budget_projects add column if not exists data_provenance text not null default 'OFFICIAL_SOURCE';
alter table public.budget_projects add column if not exists financial_verification_status text not null default 'TO_VERIFY';
alter table public.budget_projects add column if not exists financial_verified_by uuid references public.profiles(id);
alter table public.budget_projects add column if not exists financial_verified_at timestamptz;
alter table public.budget_projects alter column budget_amount_fcfa drop not null;
alter table public.budget_lines add column if not exists revision integer not null default 1;
alter table public.budget_lines add column if not exists updated_at timestamptz not null default clock_timestamp();
alter table public.budget_lines add column if not exists archived_at timestamptz;
alter table public.budget_lines add column if not exists publication_status text not null default 'DRAFT';
alter table public.budget_lines add column if not exists verification_status text not null default 'TO_VERIFY';
alter table public.budget_lines add column if not exists verified_by uuid references public.profiles(id);
alter table public.budget_lines add column if not exists verified_at timestamptz;
alter table public.budget_lines add column if not exists source_document_id text references public.public_documents(id);
alter table public.budget_lines alter column amount drop not null;
alter table public.news_articles add column if not exists revision integer not null default 1;
alter table public.news_articles add column if not exists archived_at timestamptz;
alter table public.news_articles add column if not exists workflow_status text;
alter table public.news_articles add column if not exists article_metadata jsonb not null default '{}';
update public.news_articles set workflow_status = case when is_published then 'PUBLISHED' else 'DRAFT' end where workflow_status is null;
alter table public.news_articles alter column workflow_status set default 'DRAFT';
alter table public.news_articles alter column workflow_status set not null;
alter table public.news_articles alter column is_published set default false;
alter table public.caidp_directory add column if not exists revision integer not null default 1;
alter table public.caidp_directory add column if not exists archived_at timestamptz;
alter table public.caidp_directory add column if not exists publication_status text not null default 'PUBLISHED';
alter table public.caidp_directory add column if not exists verification_status text not null default 'UNKNOWN';
alter table public.caidp_directory add column if not exists source_url text;
alter table public.caidp_directory add column if not exists verification_date timestamptz;
alter table public.caidp_directory add column if not exists verified_by uuid;
alter table public.caidp_directory add column if not exists notes text;
alter table public.public_documents add column if not exists revision integer not null default 1;
alter table public.public_documents add column if not exists is_multipart boolean;
alter table public.public_documents add column if not exists parts_count integer;
alter table public.public_documents add column if not exists document_parts jsonb not null default '[]';
alter table public.public_documents add column if not exists is_scanned boolean;
alter table public.public_documents add column if not exists has_text_layer boolean;
alter table public.public_documents add column if not exists ocr_status text;
alter table public.public_documents add column if not exists checksum_status text not null default 'DECLARED';
alter table public.public_documents add column if not exists checksum_algorithm text not null default 'SHA256_FILE_V1';
alter table public.public_documents add column if not exists manifest_sha256 text;
create or replace function private.admin_normalize_ocr(value text, scanned boolean, text_layer boolean) returns text
language sql immutable set search_path='' as $$
  select case when value='PENDING' then 'OCR_PENDING' when value='NONE' then case when scanned is false and text_layer is true then 'NOT_APPLICABLE' else null end else value end
$$;
revoke all on function private.admin_normalize_ocr(text,boolean,boolean) from public,anon;
grant execute on function private.admin_normalize_ocr(text,boolean,boolean) to authenticated;
alter table public.public_documents alter column ocr_status drop not null;
alter table public.public_documents alter column ocr_status drop default;
update public.public_documents set ocr_status=private.admin_normalize_ocr(ocr_status,is_scanned,has_text_layer) where ocr_status in ('NONE','PENDING');
alter table public.site_settings add column if not exists revision integer not null default 1;
alter table public.site_settings add column if not exists settings_metadata jsonb not null default '{}';

create table if not exists public.admin_tasks (
  id text primary key,
  type text not null,
  source_id text not null,
  title text not null,
  entity_name text not null,
  description text not null default '',
  target_tab text not null,
  target_filter jsonb not null default '{}',
  status text not null default 'PENDING',
  priority text not null default 'NORMAL',
  assigned_to text,
  assignee_id uuid references public.profiles(id),
  assigned_to_role text,
  notes text,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  revision integer not null default 1,
  unique(type, source_id)
);
alter table public.admin_tasks enable row level security;
revoke all on public.admin_tasks from anon, authenticated;
grant select, insert, update on public.admin_tasks to authenticated;
drop policy if exists admin_tasks_staff on public.admin_tasks;
create policy admin_tasks_staff on public.admin_tasks for all to authenticated
  using (private.has_staff_role(array['ADMIN']) or
    (type = 'PROOF_MODERATION' and private.has_staff_role(array['MODERATOR'])) or
    (type <> 'PROOF_MODERATION' and private.has_staff_role(array['DATA_MANAGER'])))
  with check (private.has_staff_role(array['ADMIN']) or
    (type = 'PROOF_MODERATION' and private.has_staff_role(array['MODERATOR'])) or
    (type <> 'PROOF_MODERATION' and private.has_staff_role(array['DATA_MANAGER'])));

create or replace function private.admin_redact(value jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_object_agg(key,content) from jsonb_each(value) as entry(key,content)
  where key=any(array['id','revision','type','name','title','institution_id','fiscal_year','year','document_type','version',
    'status','verification_status','financial_verification_status','publication_status','workflow_status','is_published','is_official',
    'archived_at','published_at','updated_at','created_at','verified_by','verified_at','financial_verified_by','financial_verified_at',
    'budget_amount_fcfa','amount','total_budget_fcfa','budget_functioning_fcfa','budget_investment_fcfa','source_document_id',
    'source_page','source_id','budget_id','priority','assignee_id','assigned_to_role','completed_at','completed_by','moderated_by','moderated_at'])
$$;
revoke all on function private.admin_redact(jsonb) from public,anon,authenticated;

create or replace function private.admin_record_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  current_data jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  staff_role text;
begin
  select role into staff_role from public.profiles where id = auth.uid() and is_active;
  if staff_role is null then raise exception 'Authenticated active operator required'; end if;
  insert into public.admin_audit_events(actor_id,actor_role,action,entity_type,entity_id,before_data,after_data,reason,provenance,operation_id,operation_hash)
  values(auth.uid(),staff_role,tg_op,tg_table_name,coalesce(current_data->>'id',previous->>'id'),
    private.admin_redact(previous),private.admin_redact(current_data),
    regexp_replace(regexp_replace(coalesce(nullif(current_setting('app.admin_reason',true),''),'Modification directe contrôlée par RLS'),
      '(https?://[^[:space:]]+|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,})','[référence privée]','gi'),
      '\+?[0-9][0-9 .()-]{7,}[0-9]','[coordonnée privée]','g'),
    jsonb_strip_nulls(jsonb_build_object('source_document_id',current_data->>'source_document_id')),
    nullif(current_setting('app.admin_operation',true),'')::uuid,
    nullif(current_setting('app.admin_operation_hash',true),''));
  if nullif(current_setting('app.admin_operation',true),'') is not null then
    insert into public.admin_operation_receipts(operation_id,actor_id,entity_type,entity_id,input_payload,result_data)
    values(current_setting('app.admin_operation',true)::uuid,auth.uid(),tg_table_name,current_data->>'id',
      current_setting('app.admin_payload',true)::jsonb,jsonb_strip_nulls(jsonb_build_object('id',current_data->>'id',
        'revision',current_data->'revision','updated_at',current_data->'updated_at','type',current_data->'type')));
  end if;
  return coalesce(new,old);
end $$;
revoke all on function private.admin_record_event() from public, anon, authenticated;

create or replace function private.admin_validate_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  row_data jsonb := to_jsonb(new);
  valid_target boolean := false;
  target_role text;
  target_identity text;
  field text;
  url_value text;
begin
  if tg_op = 'DELETE' then raise exception 'Archive required; deletion is disabled'; end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id then raise exception 'Immutable identifier'; end if;
    new.revision := old.revision + 1;
  else new.revision := 1;
  end if;
  foreach field in array array['website','facebook_url','source_url','leader_photo_url','cover_image_url'] loop
    url_value := row_data->>field;
    if (tg_op='INSERT' or row_data->field is distinct from to_jsonb(old)->field) and url_value is not null and url_value <> '' and url_value !~ '^https://' and url_value !~ '^/images/[a-zA-Z0-9_./-]+$'
      and url_value !~ '^storage://admin_media/[a-f0-9-]+/[a-f0-9]{64}\.(webp|png|jpg|pdf)$' then raise exception 'Invalid or nonpersistent URL'; end if;
  end loop;
  if tg_table_name in ('institutions','budget_projects','news_articles','caidp_directory') and length(trim(coalesce(row_data->>'name',row_data->>'title',row_data->>'company_name',''))) = 0 then raise exception 'Entity title required'; end if;
  if row_data->>'archived_at' is not null then new.archived_at := clock_timestamp(); end if;
  if tg_table_name = 'institutions' then
    if tg_op = 'UPDATE' and (row_data->'budget_functioning_fcfa' is distinct from to_jsonb(old)->'budget_functioning_fcfa'
      or row_data->'budget_investment_fcfa' is distinct from to_jsonb(old)->'budget_investment_fcfa'
      or row_data->'total_budget_fcfa' is distinct from to_jsonb(old)->'total_budget_fcfa') then
      raise exception 'Financial values require the qualified import workflow';
    end if;
    if tg_op = 'INSERT' and (new.total_budget_fcfa is not null or new.budget_functioning_fcfa is not null or new.budget_investment_fcfa is not null) then
      raise exception 'New profiles cannot certify budgets';
    end if;
    if new.profile_metadata - array['leader_gender','leader_bio','mandature','mission_summary','organigramme_summary',
      'organigramme_details','leader_experience','leader_education','official_programs'] <> '{}'::jsonb then
      raise exception 'Unsupported profile metadata';
    end if;
  elsif tg_table_name = 'budget_projects' then
    if tg_op='INSERT' then new.data_provenance := 'DECLARED_ADMIN';
    elsif new.data_provenance is distinct from old.data_provenance then raise exception 'Immutable project provenance'; end if;
    if tg_op = 'UPDATE' and old.publication_status='PUBLISHED' and new.budget_amount_fcfa is distinct from old.budget_amount_fcfa then raise exception 'Published financial values require qualified review'; end if;
    if new.current_status='COMPLETED' and (tg_op='INSERT' or old.current_status<>'COMPLETED') then raise exception 'Declared progress cannot certify physical completion'; end if;
    if new.budget_amount_fcfa < 0 or new.progress_percentage < 0 or new.progress_percentage > 100
      or new.fiscal_year < 1960 or new.fiscal_year > extract(year from current_date)::integer + 1 then raise exception 'Invalid project values'; end if;
    if tg_op = 'INSERT' and new.publication_status <> 'DRAFT' then raise exception 'New projects must remain drafts'; end if;
    if tg_op = 'UPDATE' and new.fiscal_year <> old.fiscal_year then raise exception 'Fiscal year is immutable; create a separate project'; end if;
    if tg_op='INSERT' then new.financial_verification_status:='TO_VERIFY'; new.financial_verified_by:=null; new.financial_verified_at:=null;
    elsif new.budget_amount_fcfa is distinct from old.budget_amount_fcfa or new.source_document_id is distinct from old.source_document_id
      or new.source_page is distinct from old.source_page or new.institution_id is distinct from old.institution_id then
      new.financial_verification_status:='TO_VERIFY'; new.financial_verified_by:=null; new.financial_verified_at:=null; new.publication_status:='DRAFT';
    elsif new.financial_verification_status='VERIFIED' and old.financial_verification_status<>'VERIFIED' then
      select exists(select 1 from public.public_documents d where d.id = new.source_document_id
        and d.status = 'PUBLISHED' and d.verification_status = 'VERIFIED'
        and d.document_type in ('BUDGET_PRIMITIF','BUDGET_MODIFICATIF')
        and d.institution_id = new.institution_id and d.fiscal_year = new.fiscal_year
        and new.source_page > 0 and new.budget_amount_fcfa is not null) into valid_target;
      if not valid_target or length(trim(coalesce(current_setting('app.admin_reason',true),'')))<10 then raise exception 'Financial evidence and human review reason required'; end if;
      new.financial_verified_by:=auth.uid(); new.financial_verified_at:=clock_timestamp();
    elsif new.financial_verification_status='TO_VERIFY' then new.financial_verified_by:=null; new.financial_verified_at:=null;
    else new.financial_verified_by:=old.financial_verified_by; new.financial_verified_at:=old.financial_verified_at;
    end if;
    if new.financial_verification_status not in ('TO_VERIFY','VERIFIED') then raise exception 'Invalid financial review status'; end if;
    if tg_op='UPDATE' and new.publication_status='PUBLISHED' and old.publication_status<>'PUBLISHED' then
      if old.financial_verification_status<>'VERIFIED' or new.financial_verification_status<>'VERIFIED' or new.financial_verified_by is null then raise exception 'Reviewed financial evidence required before publication'; end if;
      perform 1 from public.public_documents d where d.id=new.source_document_id and d.status='PUBLISHED' and d.verification_status='VERIFIED'
        and d.document_type in ('BUDGET_PRIMITIF','BUDGET_MODIFICATIF') and d.institution_id=new.institution_id and d.fiscal_year=new.fiscal_year for share;
      if not found then raise exception 'Primary planning evidence no longer published'; end if;
    end if;
    if new.project_metadata - array['institution_name','source','contractual_duration_months','execution_deadline','image_url','citizen_need_origin','initiative_source','official_progress_source'] <> '{}'::jsonb then raise exception 'Declared progress is not physical certification'; end if;
    url_value:=new.project_metadata->>'image_url';
    if url_value is not null and url_value<>'' and url_value !~ '^https://' and url_value !~ '^/images/[a-zA-Z0-9_./-]+$' then raise exception 'Invalid project image URL'; end if;
  elsif tg_table_name='budget_lines' then
    if length(trim(new.line_label))=0 then raise exception 'Budget line label required'; end if;
    if tg_op='UPDATE' and new.budget_id<>old.budget_id then raise exception 'Budget identity is immutable'; end if;
    if tg_op='UPDATE' and old.publication_status='PUBLISHED' and new.amount is distinct from old.amount then raise exception 'Published financial values require qualified review'; end if;
    if tg_op='INSERT' then new.publication_status:='DRAFT'; new.verification_status:='TO_VERIFY'; new.verified_by:=null; new.verified_at:=null;
    elsif new.amount is distinct from old.amount or new.source_document_id is distinct from old.source_document_id or new.source_page is distinct from old.source_page
      or new.line_label is distinct from old.line_label or new.original_label is distinct from old.original_label or new.category is distinct from old.category then
      new.verification_status:='TO_VERIFY'; new.verified_by:=null; new.verified_at:=null; new.publication_status:='DRAFT';
    elsif new.verification_status='VERIFIED' and old.verification_status<>'VERIFIED' then
      perform 1 from public.local_budgets b join public.public_documents d on d.id=new.source_document_id
        where b.id=new.budget_id and b.status='PUBLISHED' and b.budget_type not in ('COMPTE_ADMINISTRATIF','EXECUTION_TRIMESTRIELLE')
        and d.institution_id=b.institution_id and d.fiscal_year=b.fiscal_year and d.document_type in ('BUDGET_PRIMITIF','BUDGET_MODIFICATIF')
        and d.status='PUBLISHED' and d.verification_status='VERIFIED' and new.source_page>0 and new.amount is not null for share;
      if not found or length(trim(coalesce(current_setting('app.admin_reason',true),'')))<10 then raise exception 'Planning evidence and human review reason required'; end if;
      new.verified_by:=auth.uid(); new.verified_at:=clock_timestamp();
    elsif new.verification_status='TO_VERIFY' then new.verified_by:=null; new.verified_at:=null;
    else new.verified_by:=old.verified_by; new.verified_at:=old.verified_at;
    end if;
    if new.verification_status not in ('TO_VERIFY','VERIFIED') then raise exception 'Invalid line verification'; end if;
    if new.publication_status='PUBLISHED' and (tg_op='INSERT' or old.publication_status<>'PUBLISHED') then
      if old.verification_status<>'VERIFIED' or new.verification_status<>'VERIFIED' or new.verified_by is null then raise exception 'Review the budget line before publication'; end if;
      perform 1 from public.local_budgets b join public.public_documents d on d.id=new.source_document_id where b.id=new.budget_id and b.status='PUBLISHED'
        and d.status='PUBLISHED' and d.verification_status='VERIFIED' for share;
      if not found then raise exception 'Source no longer published'; end if;
    end if;
  elsif tg_table_name = 'news_articles' then
    if new.article_metadata - array['document_url','document_name','is_featured'] <> '{}'::jsonb then raise exception 'Invalid article metadata'; end if;
    url_value := new.article_metadata->>'document_url';
    if url_value is not null and url_value<>'' and url_value !~ '^https://' and url_value !~ '^storage://admin_media/[a-f0-9-]+/[a-f0-9]{64}\.pdf$' then raise exception 'Invalid attachment URL'; end if;
    if new.workflow_status not in ('DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED') then raise exception 'Invalid editorial status'; end if;
    if tg_op = 'INSERT' and new.workflow_status <> 'DRAFT' then raise exception 'New articles must be drafts'; end if;
    if new.workflow_status='PUBLISHED' and old.workflow_status is distinct from 'PUBLISHED' and (old.workflow_status is distinct from 'IN_REVIEW' or length(trim(coalesce(current_setting('app.admin_reason',true),'')))<10) then raise exception 'Editorial review and reason required before publication'; end if;
    if new.workflow_status='PUBLISHED' and (new.content is distinct from old.content or new.title is distinct from old.title or new.category is distinct from old.category or new.article_metadata is distinct from old.article_metadata) then raise exception 'Return article to draft before editing published content'; end if;
    if new.workflow_status = 'PUBLISHED' and (length(trim(new.title)) = 0 or length(trim(new.content)) = 0) then raise exception 'Article content required'; end if;
    new.is_published := new.workflow_status = 'PUBLISHED' and new.archived_at is null;
    new.published_at := case when new.is_published then coalesce(old.published_at,clock_timestamp()) else null end;
  elsif tg_table_name = 'caidp_directory' then
    if new.verification_status not in ('UNKNOWN','TO_VERIFY','VERIFIED','OUTDATED') then raise exception 'Invalid contact verification'; end if;
    if tg_op = 'INSERT' and new.verification_status = 'VERIFIED' then raise exception 'New contacts need human review'; end if;
    if tg_op = 'UPDATE' and (new.email is distinct from old.email or new.phone is distinct from old.phone or new.ri_name is distinct from old.ri_name) then
      new.verification_status := 'TO_VERIFY'; new.verified_by := null; new.verification_date := null;
      new.publication_status := 'DRAFT';
    elsif tg_op = 'UPDATE' and new.verification_status = 'VERIFIED' and old.verification_status <> 'VERIFIED' then
      if length(trim(coalesce(nullif(new.source_url,''),new.source,''))) < 5 or coalesce(nullif(new.source_url,''),new.source,'') ~* '^(créé par|mis à jour par|admin|source à confirmer)'
        or length(trim(coalesce(current_setting('app.admin_reason',true),''))) < 10 then
        raise exception 'Contact verification requires provenance and a review reason';
      end if;
      new.verified_by := auth.uid(); new.verification_date := clock_timestamp();
    end if;
    if new.publication_status='PUBLISHED' and (tg_op='INSERT' or old.publication_status<>'PUBLISHED') and new.verification_status<>'VERIFIED' then raise exception 'Directory publication requires reviewed contacts'; end if;
    perform pg_advisory_xact_lock(hashtextextended(lower(trim(new.company_name)) || ':' || lower(trim(coalesce(new.commune,''))),0));
    if exists(select 1 from public.caidp_directory d where d.id <> new.id and d.archived_at is null
      and lower(trim(d.company_name)) = lower(trim(new.company_name))
      and lower(trim(coalesce(d.commune,''))) = lower(trim(coalesce(new.commune,'')))) then raise exception 'Duplicate directory organisation'; end if;
  elsif tg_table_name = 'public_documents' then
    if new.fiscal_year is not null and new.year<>new.fiscal_year then raise exception 'Document year mismatch'; end if;
    if new.file_url<>'' and new.file_url !~ '^https://' and new.file_url is distinct from new.storage_path then raise exception 'Invalid document URL'; end if;
    if new.status='VERIFIED' and (tg_op='INSERT' or old.status<>'VERIFIED') and
      (length(trim(coalesce(new.source_name,'')))<3 or length(trim(coalesce(current_setting('app.admin_reason',true),'')))<10) then raise exception 'Document source and human review reason required'; end if;
    if tg_op = 'UPDATE' and (new.storage_path is distinct from old.storage_path or new.checksum_sha256 is distinct from old.checksum_sha256
      or new.version is distinct from old.version or new.replaces_document_id is distinct from old.replaces_document_id
      or new.institution_id is distinct from old.institution_id or new.fiscal_year is distinct from old.fiscal_year
      or new.document_type is distinct from old.document_type or new.file_url is distinct from old.file_url) then
      raise exception 'Create a new version instead of replacing documentary identity';
    end if;
    if new.storage_path is not null and (new.checksum_sha256 is null or new.checksum_sha256 !~ '^[a-f0-9]{64}$' or new.checksum_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') then raise exception 'Invalid documentary checksum'; end if;
    if tg_op='INSERT' and new.replaces_document_id is not null and length(trim(coalesce(new.replacement_reason,'')))<10 then raise exception 'Replacement reason required'; end if;
    if new.status in ('VERIFIED','PUBLISHED') and not new.is_multipart and (new.file_url='' and new.storage_path is null) then raise exception 'Document content required'; end if;
    if new.status in ('VERIFIED','PUBLISHED') and new.storage_path is not null and not exists(select 1 from storage.objects o where o.bucket_id=new.storage_bucket and o.name=new.storage_path) then raise exception 'Stored document object missing'; end if;
    if tg_op='INSERT' and new.institution_id is not null and new.fiscal_year is not null and new.document_type is not null then
      perform pg_advisory_xact_lock(hashtextextended(new.institution_id || ':' || new.fiscal_year::text || ':' || new.document_type,0));
      if exists(select 1 from public.public_documents d where d.institution_id=new.institution_id and d.fiscal_year=new.fiscal_year
        and d.document_type=new.document_type and d.version=new.version) then raise exception 'Document version already exists'; end if;
    end if;
    perform pg_advisory_xact_lock(hashtextextended(coalesce(new.institution_id,'') || ':' || coalesce(new.fiscal_year::text,'') || ':' || coalesce(new.document_type,'') || ':' || coalesce(new.checksum_sha256,''),0));
    if new.checksum_sha256 is not null and exists(select 1 from public.public_documents d where d.id <> new.id
      and d.institution_id is not distinct from new.institution_id and d.fiscal_year is not distinct from new.fiscal_year
      and d.document_type is not distinct from new.document_type and d.checksum_sha256 = new.checksum_sha256) then raise exception 'Duplicate documentary content'; end if;
  elsif tg_table_name='site_settings' then
    if new.settings_metadata - array['contact_phone','facebook_url','announcement_banner_enabled','announcement_banner_text','announcement_banner_link','announcement_banner_type'] <> '{}'::jsonb then raise exception 'Unsupported public settings'; end if;
    foreach field in array array['facebook_url','announcement_banner_link'] loop
      url_value:=new.settings_metadata->>field;
      if url_value is not null and url_value<>'' and url_value !~ '^https://' and url_value !~ '^/[^/]' then raise exception 'Invalid public settings URL'; end if;
    end loop;
  elsif tg_table_name = 'admin_tasks' then
    if new.status not in ('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED') or new.priority not in ('URGENT','HIGH','NORMAL','LOW') then raise exception 'Invalid task state'; end if;
    if tg_op = 'UPDATE' and (new.type <> old.type or new.source_id <> old.source_id) then raise exception 'Immutable task source'; end if;
    if new.type = 'DOCUMENT_VERIFICATION' then select exists(select 1 from public.public_documents where id=new.source_id) into valid_target;
    elsif new.type = 'PROOF_MODERATION' then select exists(select 1 from public.citizen_proofs where id=new.source_id) into valid_target;
    elsif new.type = 'CAIDP_CONTACT_COMPLETION' then select exists(select 1 from public.caidp_directory where id=new.source_id) into valid_target;
    else raise exception 'This task type does not yet support persistent decisions'; end if;
    if not valid_target then raise exception 'Real server source required'; end if;
    if new.type='DOCUMENT_VERIFICATION' then perform 1 from public.public_documents where id=new.source_id for share;
    elsif new.type='PROOF_MODERATION' then perform 1 from public.citizen_proofs where id=new.source_id for share;
    else perform 1 from public.caidp_directory where id=new.source_id for share;
    end if;
    if new.assignee_id is not null then
      select role into target_role from public.admin_staff_directory() where id=new.assignee_id;
      if target_role is null or target_role not in ('ADMIN','DATA_MANAGER','MODERATOR') or
        (new.type = 'PROOF_MODERATION' and target_role='DATA_MANAGER') or
        (new.type <> 'PROOF_MODERATION' and target_role='MODERATOR') then raise exception 'Incompatible or inactive assignee'; end if;
      new.assigned_to := new.assignee_id::text; new.assigned_to_role := target_role;
    else new.assigned_to := null; new.assigned_to_role := null;
    end if;
    if new.status = 'COMPLETED' then
      if new.type='DOCUMENT_VERIFICATION' then select exists(select 1 from public.public_documents where id=new.source_id and verification_status='VERIFIED' and status in ('VERIFIED','PUBLISHED')) into valid_target;
      elsif new.type='PROOF_MODERATION' then select exists(select 1 from public.citizen_proofs where id=new.source_id and verification_status in ('APPROVED','REJECTED')) into valid_target;
      elsif new.type='CAIDP_CONTACT_COMPLETION' then select exists(select 1 from public.caidp_directory where id=new.source_id and verification_status='VERIFIED') into valid_target;
      end if;
      if not valid_target then raise exception 'Source state does not justify closing the task'; end if;
      new.completed_at := clock_timestamp(); new.completed_by := auth.uid()::text;
    else new.completed_at := null; new.completed_by := null;
    end if;
  end if;
  if tg_table_name in ('institutions','budget_projects','budget_lines','caidp_directory') then
    if row_data->>'publication_status' not in ('DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED') then raise exception 'Invalid publication status'; end if;
    if tg_table_name in ('institutions','budget_projects','budget_lines') and new.publication_status='PUBLISHED' and (tg_op='INSERT' or old.publication_status is distinct from 'PUBLISHED') and (old.publication_status is distinct from 'IN_REVIEW' or length(trim(coalesce(current_setting('app.admin_reason',true),'')))<10) then raise exception 'Publication requires IN_REVIEW and a review reason'; end if;
    if new.publication_status='ARCHIVED' then new.archived_at:=coalesce(old.archived_at,clock_timestamp()); end if;
  end if;
  if tg_table_name='news_articles' then
    if new.workflow_status='ARCHIVED' then new.archived_at:=coalesce(old.archived_at,clock_timestamp()); end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
revoke all on function private.admin_validate_change() from public, anon, authenticated;

do $$ declare table_name text; policy_record record; staff_roles text[];
begin
  foreach table_name in array array['institutions','budget_projects','budget_lines','news_articles','caidp_directory','public_documents','admin_tasks','site_settings'] loop
    execute format('drop trigger if exists admin_validate on public.%I',table_name);
    execute format('create trigger admin_validate before insert or update or delete on public.%I for each row execute function private.admin_validate_change()',table_name);
    execute format('drop trigger if exists admin_audit on public.%I',table_name);
    execute format('create trigger admin_audit after insert or update or delete on public.%I for each row execute function private.admin_record_event()',table_name);
    execute format('revoke delete on public.%I from authenticated',table_name);
    if table_name in ('institutions','budget_projects','budget_lines','news_articles','caidp_directory','site_settings') then
      for policy_record in select policyname from pg_policies where schemaname='public' and tablename=table_name loop
        execute format('drop policy %I on public.%I',policy_record.policyname,table_name);
      end loop;
      execute format('alter table public.%I enable row level security',table_name);
      execute format('grant select on public.%I to anon, authenticated',table_name);
      execute format('grant insert,update on public.%I to authenticated',table_name);
      staff_roles := case when table_name='site_settings' then array['ADMIN'] when table_name='news_articles' then array['ADMIN','MODERATOR'] else array['ADMIN','DATA_MANAGER'] end;
      execute format('create policy admin_entity_staff on public.%I for all to authenticated using(private.has_staff_role(%L::text[])) with check(private.has_staff_role(%L::text[]))',table_name,staff_roles,staff_roles);
      if table_name='site_settings' then execute 'create policy admin_entity_public on public.site_settings for select to anon,authenticated using(true)';
      elsif table_name='budget_lines' then execute 'create policy admin_entity_public on public.budget_lines for select to anon,authenticated using(archived_at is null and publication_status=''PUBLISHED'' and exists(select 1 from public.local_budgets b where b.id=budget_id and b.status=''PUBLISHED''))';
      else execute format('create policy admin_entity_public on public.%I for select to anon,authenticated using(archived_at is null and %I = %L)',table_name,case when table_name='news_articles' then 'workflow_status' else 'publication_status' end,'PUBLISHED'); end if;
    end if;
  end loop;
end $$;

create or replace function private.admin_moderation_identity() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not private.has_staff_role(array['ADMIN','MODERATOR']) then raise exception 'Protected moderator role required'; end if;
  if new.id<>old.id then raise exception 'Immutable proof identifier'; end if;
  if new.verification_status not in ('PENDING','APPROVED','REJECTED') then raise exception 'Invalid moderation status'; end if;
  if new.verification_status is distinct from old.verification_status then
    new.verified_by:=auth.uid()::text; new.verified_at:=clock_timestamp();
    new.moderated_by:=auth.uid(); new.moderated_at:=clock_timestamp();
  else
    new.verified_by:=old.verified_by; new.verified_at:=old.verified_at;
    new.moderated_by:=old.moderated_by; new.moderated_at:=old.moderated_at;
  end if;
  new.updated_at:=clock_timestamp();
  return new;
end $$;
revoke all on function private.admin_moderation_identity() from public,anon,authenticated;
drop trigger if exists admin_moderation_identity on public.citizen_proofs;
create trigger admin_moderation_identity before update on public.citizen_proofs for each row execute function private.admin_moderation_identity();
drop trigger if exists admin_moderation_audit on public.citizen_proofs;
revoke delete on public.citizen_proofs from authenticated;
create trigger admin_moderation_audit after update on public.citizen_proofs for each row
when (private.has_staff_role(array['ADMIN','MODERATOR'])) execute function private.admin_record_event();

create or replace function public.admin_persistence_version() returns integer language sql stable security invoker set search_path='' as $$ select 3 $$;
revoke all on function public.admin_persistence_version() from public;
grant execute on function public.admin_persistence_version() to anon,authenticated;

create or replace function public.admin_mutate(p_table text,p_id text,p_expected_revision integer,p_patch jsonb,p_operation_id uuid,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  allowed text[];
  columns_sql text;
  values_sql text;
  assignments_sql text;
  existing jsonb;
  result_row jsonb;
  receipt public.admin_operation_receipts;
  patch jsonb := p_patch;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_operation_id is null or p_reason is null or length(trim(p_reason)) < 5 or length(p_reason)>1000 or p_id is null or length(trim(p_id))=0 or length(p_id)>200 or p_patch is null or length(p_patch::text)>1000000 then raise exception 'Operation identifier and reason required'; end if;
  allowed := case p_table
    when 'institutions' then array['name','type','region','district','departement','address','contact_email','contact_phone','website','facebook_url','leader_name','leader_title','leader_photo_url','political_party','web_status','web_observations','info_officer_name','info_officer_title','info_officer_email','info_officer_phone','green_line_number','profile_metadata','publication_status','archived_at']
    when 'budget_projects' then array['institution_id','commune_name','region_name','district_name','departement_name','category','nature_expense','sub_nature_expense','title','details','budget_amount_fcfa','fiscal_year','fiscal_year_label','current_status','progress_percentage','contractor_name','target_delivery_date','locality_village_neighborhood','start_date','scope_level','ministry_name','program_name','service_name','partner_or_donor','master_builder','project_tier','source_document_id','source_page','source_url','project_metadata','publication_status','archived_at','financial_verification_status']
    when 'budget_lines' then array['budget_id','program_name','line_label','original_label','category','amount','sector','normalized_sector','source_page','source_reference','linked_project_id','source_document_id','verification_status','publication_status','archived_at']
    when 'public_documents' then array['title','category','institution_name','year','fiscal_year','description','file_url','file_name','file_size','file_format','is_official','tags','institution_id','institution_type','document_type','storage_bucket','storage_path','original_filename','mime_type','file_size_bytes','page_count','source_name','source_url','adoption_date','approval_date','approval_reference','status','verification_status','checksum_sha256','version','replaces_document_id','replacement_reason','is_multipart','parts_count','document_parts','is_scanned','has_text_layer','ocr_status','checksum_algorithm','manifest_sha256']
    when 'news_articles' then array['title','slug','category','summary','content','author','cover_image_url','article_metadata','workflow_status','archived_at']
    when 'caidp_directory' then array['company_name','category','region','commune','ri_name','ri_function','email','phone','source','source_url','notes','verification_status','publication_status','archived_at']
    when 'admin_tasks' then array['type','source_id','title','entity_name','description','target_tab','target_filter','status','priority','assignee_id','notes']
    when 'site_settings' then array['fiscal_year','portal_name','contact_email','allow_citizen_submissions','maintenance_mode','settings_metadata']
    else null end;
  if allowed is null or jsonb_typeof(patch)<>'object' or patch='{}'::jsonb or patch - allowed <> '{}'::jsonb then raise exception 'Unsupported entity or fields'; end if;
  if not private.admin_domain_allowed(p_table,p_patch) and p_table<>'admin_tasks' then raise exception 'Current operator permission required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id::text,0));
  select * into receipt from public.admin_operation_receipts where operation_id=p_operation_id;
  if found then
    if receipt.actor_id<>auth.uid() or receipt.entity_type<>p_table or receipt.entity_id<>p_id or
      receipt.input_payload<>jsonb_build_object('patch',p_patch,'revision',p_expected_revision,'reason',p_reason) then raise exception 'Operation identifier already used'; end if;
    execute format('select to_jsonb(t) from public.%I t where id=$1',p_table) into result_row using p_id;
    if result_row is null or not private.admin_domain_allowed(p_table,result_row) then raise exception 'Current operator permission required'; end if;
    return result_row || jsonb_build_object('_operation',jsonb_build_object('id',p_operation_id,'replayed',true,
      'original',receipt.result_data,'current_revision',result_row->'revision',
      'changed',(result_row->'revision') is distinct from receipt.result_data->'revision'));
  end if;
  perform set_config('app.admin_operation',p_operation_id::text,true);
  perform set_config('app.admin_reason',p_reason,true);
  perform set_config('app.admin_operation_hash',encode(sha256(convert_to(jsonb_build_object('patch',p_patch,'revision',p_expected_revision,'reason',p_reason)::text,'UTF8')),'hex'),true);
  perform set_config('app.admin_payload',jsonb_build_object('patch',p_patch,'revision',p_expected_revision,'reason',p_reason)::text,true);
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_table) into existing using p_id;
  if p_expected_revision is null then
    if existing is not null then raise exception 'Record already exists; reload before editing'; end if;
    if p_table in ('institutions','budget_projects','caidp_directory') then patch := patch || '{"publication_status":"DRAFT"}'; end if;
    if p_table='news_articles' then patch := patch || '{"workflow_status":"DRAFT"}'; end if;
    if p_table='caidp_directory' then patch := patch || '{"verification_status":"TO_VERIFY"}'; end if;
    patch := patch || jsonb_build_object('id',p_id);
    select string_agg(format('%I',key),',' order by key), string_agg(format('r.%I',key),',' order by key)
      into columns_sql,values_sql from jsonb_object_keys(patch) key;
    execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) r returning to_jsonb(%I.*)',p_table,columns_sql,values_sql,p_table,p_table) into result_row using patch;
  else
    if existing is null or (existing->>'revision')::integer<>p_expected_revision then raise exception 'Conflict: reload the server version before retrying'; end if;
    select string_agg(format('%I=r.%I',key,key),',' order by key) into assignments_sql from jsonb_object_keys(patch) key;
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where t.id=$2 returning to_jsonb(t.*)',p_table,assignments_sql,p_table) into result_row using patch,p_id;
  end if;
  if result_row is null then raise exception 'Mutation not confirmed'; end if;
  perform set_config('app.admin_operation','',true);
  perform set_config('app.admin_operation_hash','',true);
  perform set_config('app.admin_payload','',true);
  perform set_config('app.admin_reason','',true);
  return result_row || jsonb_build_object('_operation',jsonb_build_object('id',p_operation_id,'replayed',false,
    'original',jsonb_build_object('id',p_id,'revision',result_row->'revision','updated_at',result_row->'updated_at'),
    'current_revision',result_row->'revision','changed',false));
end $$;
revoke all on function public.admin_mutate(text,text,integer,jsonb,uuid,text) from public,anon;
grant execute on function public.admin_mutate(text,text,integer,jsonb,uuid,text) to authenticated;

create or replace function public.admin_mutate_batch(p_rows jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item jsonb; result_item jsonb; results jsonb := '[]';
begin
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)<1 or jsonb_array_length(p_rows)>100 then raise exception 'Batch must contain 1 to 100 objects'; end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    result_item:=public.admin_mutate(item->>'table',item->>'id',(item->>'revision')::integer,item->'patch',(item->>'operationId')::uuid,item->>'reason');
    if result_item->'_operation'->>'changed'='true' then raise exception 'Conflict: a committed batch resource has changed'; end if;
    results:=results || jsonb_build_array(result_item);
  end loop;
  return results;
end $$;
revoke all on function public.admin_mutate_batch(jsonb) from public,anon;
grant execute on function public.admin_mutate_batch(jsonb) to authenticated;

create table if not exists private.admin_document_file_checks (
  document_id text not null references public.public_documents(id),
  storage_bucket text not null,
  storage_path text not null,
  checksum_sha256 text not null check(checksum_sha256 ~ '^[a-f0-9]{64}$'),
  file_size_bytes bigint not null check(file_size_bytes>0),
  checked_by uuid not null references public.profiles(id),
  checked_at timestamptz not null default clock_timestamp(),
  primary key(document_id,storage_bucket,storage_path)
);
revoke all on private.admin_document_file_checks from public,anon,authenticated;

create or replace function private.admin_file_checked(document_id text,bucket text,path text,checksum text,size bigint) returns boolean
language sql stable security definer set search_path='' as $$
  select private.has_staff_role(array['ADMIN','DATA_MANAGER']) and exists(
    select 1 from private.admin_document_file_checks c join storage.objects o on o.bucket_id=c.storage_bucket and o.name=c.storage_path
    where c.document_id=$1 and c.storage_bucket=$2 and c.storage_path=$3 and c.checksum_sha256=$4 and c.file_size_bytes=$5)
$$;
revoke all on function private.admin_file_checked(text,text,text,text,bigint) from public,anon;
grant execute on function private.admin_file_checked(text,text,text,text,bigint) to authenticated;

create or replace function public.admin_confirm_document_integrity(p_id text,p_revision integer,p_actor uuid,p_files jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare document public.public_documents; file jsonb; expected jsonb; total integer;
begin
  if not exists(select 1 from public.profiles where id=p_actor and is_active and role::text in ('ADMIN','DATA_MANAGER')) then raise exception 'Active document operator required'; end if;
  select * into document from public.public_documents where id=p_id for update;
  if not found or document.revision<>p_revision or document.status not in ('UPLOADED','TO_VERIFY') then raise exception 'Document conflict or immutable verified version'; end if;
  if jsonb_typeof(p_files)<>'array' then raise exception 'Checked files required'; end if;
  total:=case when document.is_multipart then document.parts_count else 1 end;
  if jsonb_array_length(p_files)<>total then raise exception 'Every original file must be checked'; end if;
  if (select count(distinct value->>'storage_path') from jsonb_array_elements(p_files))<>total then raise exception 'Distinct originals required'; end if;
  for file in select value from jsonb_array_elements(p_files) loop
    if document.is_multipart then
      select value into expected from jsonb_array_elements(document.document_parts) where value->>'storage_path'=file->>'storage_path';
    else expected:=jsonb_build_object('storage_path',document.storage_path,'checksum_sha256',document.checksum_sha256,'file_size_bytes',document.file_size_bytes);
    end if;
    if expected is null or expected->>'storage_path' is distinct from file->>'storage_path' or
      expected->>'checksum_sha256' is distinct from file->>'checksum_sha256' or
      (expected->>'file_size_bytes')::bigint is distinct from (file->>'file_size_bytes')::bigint or
      file->>'checksum_sha256' !~ '^[a-f0-9]{64}$' or (file->>'file_size_bytes')::bigint<=0 or
      not exists(select 1 from storage.objects where bucket_id='public_documents' and name=file->>'storage_path') then raise exception 'Actual bytes do not match the declared original'; end if;
    insert into private.admin_document_file_checks(document_id,storage_bucket,storage_path,checksum_sha256,file_size_bytes,checked_by)
      values(p_id,'public_documents',file->>'storage_path',file->>'checksum_sha256',(file->>'file_size_bytes')::bigint,p_actor)
      on conflict(document_id,storage_bucket,storage_path) do update set checked_at=clock_timestamp(),checked_by=excluded.checked_by
      where admin_document_file_checks.checksum_sha256=excluded.checksum_sha256 and admin_document_file_checks.file_size_bytes=excluded.file_size_bytes;
  end loop;
  if (select count(*) from private.admin_document_file_checks where document_id=p_id)<>total then raise exception 'Distinct originals required'; end if;
end $$;
revoke all on function public.admin_confirm_document_integrity(text,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_confirm_document_integrity(text,integer,uuid,jsonb) to service_role;

create or replace function private.admin_manifest_sha256(parts jsonb) returns text
language plpgsql immutable set search_path='' as $$
declare part jsonb; position integer:=0; last_page bigint:=0; manifest text:=E'SUIVIBUDGET_PARTS_V1\n';
  ids text[]:='{}'; paths text[]:='{}'; hashes text[]:='{}';
begin
  if jsonb_typeof(parts) is distinct from 'array' or jsonb_array_length(parts) not between 2 and 100 then raise exception 'Invalid manifest count'; end if;
  for part in select value from jsonb_array_elements(parts) loop
    position:=position+1;
    if jsonb_typeof(part->'part_number') is distinct from 'number' or jsonb_typeof(part->'file_size_bytes') is distinct from 'number' or
      jsonb_typeof(part->'page_start') is distinct from 'number' or jsonb_typeof(part->'page_end') is distinct from 'number' or
      (part->>'part_number')::numeric is distinct from position or
      coalesce(part->>'id','') !~ '^[a-zA-Z0-9-]+$' or
      coalesce(part->>'storage_path','') !~ '^[a-zA-Z0-9_./-]+$' or part->>'storage_path' ~ '(^|/)\.\.(/|$)' or
      coalesce(part->>'checksum_sha256','') !~ '^[a-f0-9]{64}$' or
      coalesce(part->>'file_size_bytes','') !~ '^[1-9][0-9]*$' or (part->>'file_size_bytes')::numeric>9007199254740991 or
      coalesce(part->>'page_start','') !~ '^[1-9][0-9]*$' or coalesce(part->>'page_end','') !~ '^[1-9][0-9]*$' or
      (part->>'page_start')::numeric is distinct from last_page+1 or
      (part->>'page_end')::numeric<(part->>'page_start')::numeric or (part->>'page_end')::numeric>9007199254740991 or
      part->>'id'=any(ids) or part->>'storage_path'=any(paths) or part->>'checksum_sha256'=any(hashes) then raise exception 'Invalid manifest identity, order or pages'; end if;
    ids:=array_append(ids,part->>'id'); paths:=array_append(paths,part->>'storage_path'); hashes:=array_append(hashes,part->>'checksum_sha256');
    last_page:=(part->>'page_end')::bigint;
    manifest:=manifest || position || '|' || (part->>'id') || '|' || (part->>'storage_path') || '|' || (part->>'file_size_bytes') || '|' || (part->>'checksum_sha256') || '|' || (part->>'page_start') || '|' || (part->>'page_end') || E'\n';
  end loop;
  return encode(sha256(convert_to(manifest,'UTF8')),'hex');
end $$;
revoke all on function private.admin_manifest_sha256(jsonb) from public,anon;
grant execute on function private.admin_manifest_sha256(jsonb) to authenticated,service_role;


create or replace function private.admin_validate_document_integrity() returns trigger
language plpgsql security invoker set search_path='' as $$
declare part jsonb; normalized jsonb:='[]'; pages text[]; start_page integer; end_page integer;
  previous_end integer:=0; index integer:=0; known_ranges integer:=0; manifest text:=E'SUIVIBUDGET_PARTS_V1\n';
  computed boolean:=true; identity_before jsonb; identity_after jsonb;
begin
  new.ocr_status:=private.admin_normalize_ocr(new.ocr_status,new.is_scanned,new.has_text_layer);
  if new.parts_count<1 or new.parts_count>100 or jsonb_typeof(new.document_parts)<>'array' or
    new.ocr_status not in ('NOT_APPLICABLE','NOT_IMPLEMENTED','OCR_PENDING','PROCESSED','FAILED','MANUAL_TRANSCRIPTION') or (new.ocr_status='NOT_APPLICABLE' and (new.is_scanned is true or new.has_text_layer is false)) or
    (new.page_count is not null and new.page_count<1) then raise exception 'Invalid documentary metadata'; end if;
  if tg_op='UPDATE' and (new.is_multipart is distinct from old.is_multipart or new.parts_count is distinct from old.parts_count or
    new.file_size_bytes is distinct from old.file_size_bytes or new.original_filename is distinct from old.original_filename or
    new.checksum_algorithm is distinct from old.checksum_algorithm or new.manifest_sha256 is distinct from old.manifest_sha256) then raise exception 'Create a new version for documentary identity'; end if;
  if tg_op='UPDATE' and (new.page_count is distinct from old.page_count or new.is_scanned is distinct from old.is_scanned or
    new.has_text_layer is distinct from old.has_text_layer or new.ocr_status is distinct from old.ocr_status) then new.status:='TO_VERIFY'; end if;
  if new.is_multipart then
    if new.parts_count is null or new.parts_count<2 or new.parts_count<>jsonb_array_length(new.document_parts) or new.storage_path is not null or new.file_url<>'' then raise exception 'Multipart document requires distinct originals, not a substitute primary file'; end if;
    new.checksum_algorithm:='SHA256_PARTS_MANIFEST_V1';
    for part in select value from jsonb_array_elements(new.document_parts) loop
      index:=index+1;
      if (part->>'part_number')::integer is distinct from index or length(trim(coalesce(part->>'file_name','')))=0 or
        part - array['id','part_number','file_name','original_filename','page_range','page_start','page_end','checksum_sha256',
          'checksum_status','file_size_bytes','file_size','storage_path','file_url','status','page_range_verified','notes'] <> '{}'::jsonb then raise exception 'Invalid part order or fields'; end if;
      part:=part || jsonb_build_object('id',coalesce(part->>'id',new.id || '-part-' || index));
      if part->>'id' !~ '^[a-zA-Z0-9-]+$' or (part->>'storage_path' is not null and (part->>'storage_path' !~ '^[a-zA-Z0-9_./-]+$' or part->>'storage_path' ~ '(^|/)\.\.(/|$)')) or
        coalesce(part->>'file_url','')<>'' or (part->>'checksum_sha256' is not null and part->>'checksum_sha256' !~ '^[a-f0-9]{64}$') then raise exception 'Invalid part identity'; end if;
      if part->>'page_start' is not null and part->>'page_end' is not null then
        start_page:=(part->>'page_start')::integer; end_page:=(part->>'page_end')::integer;
      else
        pages:=regexp_match(coalesce(part->>'page_range',''),'^(?:Pages?\s*)?([0-9]+)\s*(?:à|-|–)\s*([0-9]+)$','i');
        start_page:=pages[1]::integer; end_page:=pages[2]::integer;
      end if;
      if (start_page is null)<>(end_page is null) or (start_page is not null and (start_page<1 or end_page<start_page or start_page<>previous_end+1)) then raise exception 'Part page overlap, gap or invalid range'; end if;
      if start_page is not null then known_ranges:=known_ranges+1; previous_end:=end_page; end if;
      part:=part || jsonb_build_object('page_start',start_page,'page_end',end_page,'original_filename',coalesce(part->>'original_filename',part->>'file_name'));
      if exists(select 1 from jsonb_array_elements(normalized) p where p->>'id'=part->>'id' or
        (part->>'storage_path' is not null and p->>'storage_path'=part->>'storage_path') or
        (part->>'checksum_sha256' is not null and p->>'checksum_sha256'=part->>'checksum_sha256')) then raise exception 'Duplicate original part'; end if;
      computed:=computed and coalesce(private.admin_file_checked(new.id,'public_documents',part->>'storage_path',part->>'checksum_sha256',(part->>'file_size_bytes')::bigint),false);
      part:=part || jsonb_build_object('checksum_status',case when private.admin_file_checked(new.id,'public_documents',part->>'storage_path',part->>'checksum_sha256',(part->>'file_size_bytes')::bigint) then 'COMPUTED' else 'DECLARED' end,
        'status',case when new.status in ('VERIFIED','PUBLISHED') then 'VERIFIED' else 'TO_VERIFY' end,'page_range_verified',new.status in ('VERIFIED','PUBLISHED') and start_page is not null);
      normalized:=normalized || jsonb_build_array(part);
      manifest:=manifest || index || '|' || (part->>'id') || '|' || coalesce(part->>'storage_path','') || '|' || coalesce(part->>'file_size_bytes','') || '|' || coalesce(part->>'checksum_sha256','') || '|' || coalesce(start_page::text,'') || '|' || coalesce(end_page::text,'') || E'\n';
    end loop;
    if known_ranges<>0 and known_ranges<>index then raise exception 'All page ranges must be known together'; end if;
    if known_ranges=index and new.page_count is not null and previous_end<>new.page_count then raise exception 'Total pages mismatch'; end if;
    if tg_op='UPDATE' then
      select jsonb_agg(value - array['checksum_status','status','page_range_verified']) into identity_before from jsonb_array_elements(old.document_parts);
      select jsonb_agg(value - array['checksum_status','status','page_range_verified']) into identity_after from jsonb_array_elements(normalized);
      if identity_after is distinct from identity_before then raise exception 'Create a new version for original parts'; end if;
    end if;
    new.document_parts:=normalized;
    if new.manifest_sha256 is not null and new.manifest_sha256 is distinct from private.admin_manifest_sha256(normalized) then raise exception 'Invalid manifest checksum'; end if;
    if new.status in ('VERIFIED','PUBLISHED') and (not computed or known_ranges<>index or
      new.manifest_sha256 is distinct from private.admin_manifest_sha256(normalized)) then raise exception 'Actual part checksums and human page review required'; end if;
  else
    if new.manifest_sha256 is not null or new.parts_count<>1 or jsonb_array_length(new.document_parts)<>0 or new.checksum_algorithm<>'SHA256_FILE_V1' then raise exception 'Single file metadata mismatch'; end if;
    computed:=new.storage_path is not null and coalesce(private.admin_file_checked(new.id,new.storage_bucket,new.storage_path,new.checksum_sha256,new.file_size_bytes),false);
    if new.status in ('VERIFIED','PUBLISHED') and new.storage_path is not null and not computed then
      if not exists(select 1 from storage.objects where bucket_id=new.storage_bucket and name=new.storage_path) then raise exception 'Stored document object missing'; end if;
      raise exception 'Actual file checksum required before verification';
    end if;
  end if;
  new.checksum_status:=case when computed then 'COMPUTED' else 'DECLARED' end;
  return new;
end $$;
revoke all on function private.admin_validate_document_integrity() from public,anon,authenticated;
drop trigger if exists admin_document_integrity on public.public_documents;
create trigger admin_document_integrity before insert or update on public.public_documents for each row execute function private.admin_validate_document_integrity();

create or replace function private.admin_source_withdrawal() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  row_data jsonb:=to_jsonb(new);
  task_type text;
  valid_decision boolean;
  operation text:=current_setting('app.admin_operation',true);
  operation_hash text:=current_setting('app.admin_operation_hash',true);
  reason text:=current_setting('app.admin_reason',true);
begin
  if tg_table_name='public_documents' then
    task_type:='DOCUMENT_VERIFICATION';
    valid_decision:=row_data->>'verification_status'='VERIFIED' and row_data->>'status' in ('VERIFIED','PUBLISHED');
  elsif tg_table_name='caidp_directory' then
    task_type:='CAIDP_CONTACT_COMPLETION'; valid_decision:=row_data->>'verification_status'='VERIFIED';
  else
    task_type:='PROOF_MODERATION'; valid_decision:=row_data->>'verification_status' in ('APPROVED','REJECTED');
  end if;
  perform set_config('app.admin_operation','',true);
  perform set_config('app.admin_operation_hash','',true);
  perform set_config('app.admin_reason','Réouverture après retrait ou modification de la source ' || new.id,true);
  if not coalesce(valid_decision,false) then
    update public.admin_tasks set status='ON_HOLD',assignee_id=null
      where type=task_type and source_id=new.id and status='COMPLETED';
  end if;
  if tg_table_name='public_documents' and (row_data->>'status'<>'PUBLISHED' or row_data->>'verification_status'<>'VERIFIED') then
    update public.budget_projects set publication_status='DRAFT',financial_verification_status='TO_VERIFY'
      where source_document_id=new.id and publication_status='PUBLISHED' and data_provenance='DECLARED_ADMIN';
    update public.budget_lines set publication_status='DRAFT',verification_status='TO_VERIFY'
      where source_document_id=new.id and publication_status='PUBLISHED';
  end if;
  perform set_config('app.admin_operation',coalesce(operation,''),true);
  perform set_config('app.admin_operation_hash',coalesce(operation_hash,''),true);
  perform set_config('app.admin_reason',coalesce(reason,''),true);
  return new;
end $$;
revoke all on function private.admin_source_withdrawal() from public,anon,authenticated;
drop trigger if exists admin_source_withdrawal on public.public_documents;
create trigger admin_source_withdrawal after update on public.public_documents for each row execute function private.admin_source_withdrawal();
drop trigger if exists admin_source_withdrawal on public.caidp_directory;
create trigger admin_source_withdrawal after update on public.caidp_directory for each row execute function private.admin_source_withdrawal();
drop trigger if exists admin_source_withdrawal on public.citizen_proofs;
create trigger admin_source_withdrawal after update on public.citizen_proofs for each row execute function private.admin_source_withdrawal();

create or replace function public.admin_baseline_visibility(p_table text,p_ids text[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if p_table not in ('institutions','budget_projects','news_articles','caidp_directory') or cardinality(p_ids)>30000 then raise exception 'Invalid baseline request'; end if;
  execute format('select coalesce(jsonb_agg(id),''[]''::jsonb) from public.%I where id=any($1) and (archived_at is not null or %I<>''PUBLISHED'')',
    p_table,case when p_table='news_articles' then 'workflow_status' else 'publication_status' end) into result using p_ids;
  return result;
end $$;
revoke all on function public.admin_baseline_visibility(text,text[]) from public;
grant execute on function public.admin_baseline_visibility(text,text[]) to anon,authenticated;

create or replace function public.admin_staff_directory() returns table(id uuid,full_name text,role text)
language sql stable security definer set search_path='' as $$
  select p.id,p.full_name,p.role::text from public.profiles p
  where p.is_active and p.role::text in ('ADMIN','DATA_MANAGER','MODERATOR')
    and private.has_staff_role(array['ADMIN','DATA_MANAGER','MODERATOR'])
$$;
revoke all on function public.admin_staff_directory() from public,anon;
grant execute on function public.admin_staff_directory() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('admin_media','admin_media',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists admin_media_upload on storage.objects;
create policy admin_media_upload on storage.objects for insert to authenticated with check(
  bucket_id='admin_media' and split_part(name,'/',1)=auth.uid()::text
  and private.has_staff_role(array['ADMIN','DATA_MANAGER','MODERATOR']));
drop policy if exists admin_media_read on storage.objects;
drop policy if exists admin_media_no_direct_read on storage.objects;
create policy admin_media_no_direct_read on storage.objects as restrictive for select to public using(bucket_id<>'admin_media');
drop policy if exists immutable_admin_originals on storage.objects;
create policy immutable_admin_originals on storage.objects as restrictive for update to public
  using(bucket_id not in ('admin_media','public_documents')) with check(bucket_id not in ('admin_media','public_documents'));
drop policy if exists protected_admin_originals on storage.objects;
create or replace function private.admin_original_unreferenced(bucket text,path text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.has_staff_role(array['ADMIN','DATA_MANAGER']) and not exists(
    select 1 from public.public_documents d where d.storage_path=$2 or
      exists(select 1 from jsonb_array_elements(d.document_parts) p where p->>'storage_path'=$2))
    and not exists(select 1 from private.admin_document_file_checks where storage_bucket=$1 and storage_path=$2)
$$;
revoke all on function private.admin_original_unreferenced(text,text) from public,anon;
grant execute on function private.admin_original_unreferenced(text,text) to authenticated;
create policy protected_admin_originals on storage.objects as restrictive for delete to public using(
  bucket_id<>'admin_media' and (bucket_id<>'public_documents' or private.admin_original_unreferenced(bucket_id,name)));
drop policy if exists documents_staff_domain on storage.objects;
create policy documents_staff_domain on storage.objects as restrictive for select to public using(
  bucket_id<>'public_documents' or private.has_staff_role(array['ADMIN','DATA_MANAGER']));
drop policy if exists citizen_media_staff_domain on storage.objects;
create policy citizen_media_staff_domain on storage.objects as restrictive for select to public using(
  bucket_id<>'citizen_photos' or private.has_staff_role(array['ADMIN','MODERATOR']));

create or replace function private.admin_media_link_allowed(reference text,entity text,entity_id text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.admin_domain_allowed($2,'{}'::jsonb) and split_part($1,'/',4)=auth.uid()::text and
    exists(select 1 from storage.objects where bucket_id='admin_media' and name=replace($1,'storage://admin_media/','')) and
    not exists(select 1 from public.institutions where leader_photo_url=$1 and (entity<>'institutions' or id<>entity_id)) and
    not exists(select 1 from public.news_articles where (cover_image_url=$1 or article_metadata->>'document_url'=$1) and (entity<>'news_articles' or id<>entity_id))
$$;
revoke all on function private.admin_media_link_allowed(text,text,text) from public,anon;
grant execute on function private.admin_media_link_allowed(text,text,text) to authenticated;

create or replace function private.admin_validate_media_link() returns trigger
language plpgsql security invoker set search_path='' as $$
declare field text; reference text; old_reference text;
begin
  foreach field in array case when tg_table_name='institutions' then array['leader_photo_url'] else array['cover_image_url','document_url'] end loop
    reference:=case when field='document_url' then to_jsonb(new)->'article_metadata'->>field else to_jsonb(new)->>field end;
    old_reference:=case when tg_op='INSERT' then null when field='document_url' then to_jsonb(old)->'article_metadata'->>field else to_jsonb(old)->>field end;
    if reference like 'storage://admin_media/%' and reference is distinct from old_reference and
      not private.admin_media_link_allowed(reference,tg_table_name,new.id) then raise exception 'Media attachment requires an owned unshared original'; end if;
  end loop;
  return new;
end $$;
revoke all on function private.admin_validate_media_link() from public,anon,authenticated;
drop trigger if exists admin_media_link on public.institutions;
create trigger admin_media_link before insert or update on public.institutions for each row execute function private.admin_validate_media_link();
drop trigger if exists admin_media_link on public.news_articles;
create trigger admin_media_link before insert or update on public.news_articles for each row execute function private.admin_validate_media_link();

revoke all on function public.enforce_document_publication_audit() from public,anon,authenticated;

commit;
