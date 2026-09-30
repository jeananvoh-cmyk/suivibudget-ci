begin;

-- RLS does not restrict TRUNCATE; rebuild an explicit application privilege allowlist.
revoke all privileges on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on table
  public.projects,
  public.news_articles,
  public.site_settings,
  public.caidp_directory,
  public.sources,
  public.institutions,
  public.public_documents,
  public.administrative_accounts,
  public.ca_investment_operations,
  public.ca_procurement_matches,
  public.ca_financial_lines,
  public.public_citizen_proofs
to anon, authenticated;

grant insert, update on table
  public.institutions,
  public.public_documents
to authenticated;

grant select, insert, update on table
  public.profiles,
  public.local_budgets
to authenticated;

grant insert, update, delete on table
  public.administrative_accounts,
  public.ca_investment_operations,
  public.ca_procurement_matches,
  public.ca_financial_lines
to authenticated;

grant select, update, delete on table public.citizen_proofs to authenticated;
grant insert on table
  public.citizen_proofs,
  public.caidp_document_requests_log,
  public.newsletter_subscribers
to anon, authenticated;
grant select on table public.caidp_document_requests_log to authenticated;

commit;
