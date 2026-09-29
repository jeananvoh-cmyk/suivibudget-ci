-- SuiviBudget CI — Grant PostgreSQL privileges to anon & authenticated for RLS evaluation
-- Prerequisite for PostgreSQL RLS: without table-level SELECT, PostgREST returns 42501 (HTTP 401).
-- Row Level Security policies remain strictly authoritative for row filtering.

begin;

grant usage on schema public to anon, authenticated;

grant select on table public.projects to anon, authenticated;
grant select on table public.institutions to anon, authenticated;
grant select on table public.news_articles to anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant select on table public.public_documents to anon, authenticated;
grant select on table public.administrative_accounts to anon, authenticated;
grant select on table public.ca_investment_operations to anon, authenticated;
grant select on table public.ca_procurement_matches to anon, authenticated;
grant select on table public.ca_financial_lines to anon, authenticated;
grant select on table public.citizen_proofs to anon, authenticated;
grant select on table public.profiles to authenticated;

-- Allow submissions under strict RLS check policies
grant insert on table public.citizen_proofs to anon, authenticated;
grant insert, select on table public.caidp_requests to anon, authenticated;

commit;
