-- Migration: Drop DEFAULT 0 on institutions financial columns to preserve UNKNOWN = NULL
-- Conforme a l'invariant UNKNOWN != 0.
-- Les montants non renseignes doivent rester NULL plutot que d'etre implicitement transformes en 0 FCFA.
-- Ne modifie aucune donnee existante (DROP DEFAULT ne modifie pas les lignes deja enregistrees).

ALTER TABLE public.institutions ALTER COLUMN total_budget_fcfa DROP DEFAULT;
ALTER TABLE public.institutions ALTER COLUMN budget_functioning_fcfa DROP DEFAULT;
ALTER TABLE public.institutions ALTER COLUMN budget_investment_fcfa DROP DEFAULT;
