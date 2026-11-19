
alter table public.administrative_accounts
  add column if not exists source_document_id text references public.public_documents(id) on delete set null,
  add column if not exists operating_revenue_planned bigint,
  add column if not exists operating_revenue_emitted bigint,
  add column if not exists operating_revenue_collected bigint,
  add column if not exists operating_expenditure_planned bigint,
  add column if not exists operating_expenditure_engaged bigint,
  add column if not exists investment_revenue_planned bigint,
  add column if not exists investment_revenue_emitted bigint,
  add column if not exists investment_revenue_collected bigint,
  add column if not exists investment_expenditure_planned bigint,
  add column if not exists investment_expenditure_engaged bigint,
  add column if not exists total_revenue_collected bigint,
  add column if not exists total_expenditure_engaged bigint,
  add column if not exists arithmetic_difference bigint,
  add column if not exists reconciliation_status text not null default 'TO_VERIFY',
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconciled_by uuid references public.profiles(id) on delete set null;

alter table public.administrative_accounts drop constraint if exists administrative_accounts_reconciliation_status_check;
alter table public.administrative_accounts add constraint administrative_accounts_reconciliation_status_check
check (reconciliation_status in ('TO_VERIFY','RECONCILED','SOURCE_ANOMALY','INCOMPLETE_SOURCE'));

create unique index if not exists uq_administrative_accounts_institution_year
on public.administrative_accounts(institution_id,fiscal_year);
create index if not exists idx_administrative_accounts_source_document on public.administrative_accounts(source_document_id);
create index if not exists idx_administrative_accounts_reconciled_by on public.administrative_accounts(reconciled_by);

create table if not exists public.ca_financial_lines (
  id text primary key default ('ca-line-' || extensions.uuid_generate_v4()::text),
  ca_id text not null references public.administrative_accounts(id) on delete cascade,
  institution_id text not null references public.institutions(id) on delete cascade,
  fiscal_year integer not null,
  section text not null check (section in ('OPERATING','INVESTMENT','GLOBAL','PATRIMONY','OTHER')),
  flow_type text not null check (flow_type in ('REVENUE','EXPENDITURE','RESULT','PATRIMONY','OTHER')),
  exact_heading text not null,
  account_code text,
  measure_type text not null check (measure_type in ('PLANNED','EMITTED','COLLECTED','ENGAGED','ORDERED','PAID','REALIZED','BALANCE','OTHER')),
  amount_fcfa bigint not null,
  source_document_id text references public.public_documents(id) on delete set null,
  source_page integer,
  source_reference text,
  verification_status text not null default 'TO_VERIFY' check (verification_status in ('TO_VERIFY','VERIFIED','SOURCE_ANOMALY')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ca_financial_lines enable row level security;
create index if not exists idx_ca_financial_lines_ca on public.ca_financial_lines(ca_id);
create index if not exists idx_ca_financial_lines_inst_year on public.ca_financial_lines(institution_id,fiscal_year);
create index if not exists idx_ca_financial_lines_document on public.ca_financial_lines(source_document_id);

drop policy if exists "Published CA financial lines are public" on public.ca_financial_lines;
create policy "Published CA financial lines are public" on public.ca_financial_lines
for select to public
using (exists(select 1 from public.administrative_accounts a where a.id=ca_id and a.status in ('VERIFIED','PUBLISHED')));

drop policy if exists "Staff manage CA financial lines" on public.ca_financial_lines;
create policy "Staff manage CA financial lines" on public.ca_financial_lines
for all to authenticated
using (private.has_staff_role(array['ADMIN','DATA_MANAGER']))
with check (private.has_staff_role(array['ADMIN','DATA_MANAGER']));

alter table public.public_documents drop constraint if exists public_documents_publish_requires_verification;
alter table public.public_documents add constraint public_documents_publish_requires_verification
check (status <> 'PUBLISHED' or verification_status='VERIFIED');

create or replace function public.enforce_document_publication_audit()
returns trigger language plpgsql set search_path=''
as $$
begin
  if new.status='PUBLISHED' and (old.status is distinct from 'PUBLISHED') then
    if auth.uid() is null then raise exception 'Authenticated staff required to publish a document'; end if;
    new.verification_status := 'VERIFIED';
    new.verified_by := auth.uid();
    new.verified_at := coalesce(new.verified_at,now());
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists enforce_document_publication_audit_trigger on public.public_documents;
create trigger enforce_document_publication_audit_trigger
before update on public.public_documents
for each row execute function public.enforce_document_publication_audit();

drop index if exists public.idx_budget_lines_linked_project;
drop index if exists public.idx_ca_operations_linked_project;
