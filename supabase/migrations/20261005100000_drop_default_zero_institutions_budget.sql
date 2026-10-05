-- Migration: Drop DEFAULT 0 on institutions and local_budgets financial columns to preserve UNKNOWN = NULL
-- Conforme a l'invariant UNKNOWN != 0.
-- Les montants non renseignes doivent rester NULL plutot que d'etre implicitement transformes en 0 FCFA.
-- Ne modifie aucune donnee existante (DROP DEFAULT ne modifie pas les lignes deja enregistrees).

ALTER TABLE public.institutions ALTER COLUMN total_budget_fcfa DROP DEFAULT;
ALTER TABLE public.institutions ALTER COLUMN budget_functioning_fcfa DROP DEFAULT;
ALTER TABLE public.institutions ALTER COLUMN budget_investment_fcfa DROP DEFAULT;

ALTER TABLE public.local_budgets ALTER COLUMN operating_amount DROP DEFAULT;
ALTER TABLE public.local_budgets ALTER COLUMN investment_amount DROP DEFAULT;

-- Assainissement legacy exceptionnel strictement cible sur les 4 institutions historiques
-- dont les zeros provenaient de l'ancien modele DEFAULT 0.
-- Seules les valeurs egales a 0 exact sont remises a NULL, exclusivement pour ces 4 IDs.
-- 0 reste une valeur financiere legitime lorsqu'elle est explicitement documentee.
UPDATE public.institutions
SET
  budget_functioning_fcfa =
    CASE WHEN budget_functioning_fcfa = 0
         THEN NULL
         ELSE budget_functioning_fcfa END,

  budget_investment_fcfa =
    CASE WHEN budget_investment_fcfa = 0
         THEN NULL
         ELSE budget_investment_fcfa END,

  total_budget_fcfa =
    CASE WHEN total_budget_fcfa = 0
         THEN NULL
         ELSE total_budget_fcfa END

WHERE id IN (
  'inst-com-abobo',
  'inst-com-bingerville',
  'inst-com-cocody',
  'inst-com-tiassale'
);
