ALTER TABLE public.institutions ALTER COLUMN total_budget_fcfa DROP DEFAULT;
ALTER TABLE public.institutions ALTER COLUMN budget_functioning_fcfa DROP DEFAULT;
ALTER TABLE public.institutions ALTER COLUMN budget_investment_fcfa DROP DEFAULT;

ALTER TABLE public.local_budgets ALTER COLUMN operating_amount DROP DEFAULT;
ALTER TABLE public.local_budgets ALTER COLUMN investment_amount DROP DEFAULT;

UPDATE public.institutions
SET
  budget_functioning_fcfa = CASE WHEN budget_functioning_fcfa = 0 THEN NULL ELSE budget_functioning_fcfa END,
  budget_investment_fcfa = CASE WHEN budget_investment_fcfa = 0 THEN NULL ELSE budget_investment_fcfa END,
  total_budget_fcfa = CASE WHEN total_budget_fcfa = 0 THEN NULL ELSE total_budget_fcfa END
WHERE id IN (
  'inst-com-abobo',
  'inst-com-bingerville',
  'inst-com-cocody',
  'inst-com-tiassale'
);