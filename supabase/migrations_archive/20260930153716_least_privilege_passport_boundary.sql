REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.public_documents, public.citizen_proofs, public.administrative_accounts,
  public.ca_investment_operations, public.ca_procurement_matches, public.ca_financial_lines,
  public.profiles, public.local_budgets, public.institutions, public.public_citizen_proofs
FROM service_role;

ALTER POLICY "Allow public read on published local budgets" ON public.local_budgets
USING (status = 'PUBLISHED');
