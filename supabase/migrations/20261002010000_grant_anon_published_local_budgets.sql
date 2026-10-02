-- =========================================================================
-- SUIVIBUDGET CI - MIGRATION : AUTORISATION LECTURE PUBLIQUE BUDGETS PUBLIÉS
-- =========================================================================
-- Règle : Les citoyens non authentifiés (rôle 'anon') doivent pouvoir consulter
-- les budgets primitifs officiellement publiés.
-- Sécurité : RLS activée sur local_budgets avec la politique
-- "Allow public read on published local budgets" USING (status = 'PUBLISHED').
-- Les budgets non publiés (TO_VERIFY, VERIFIED, REJECTED, DRAFT) demeurent strictement invisibles.

GRANT SELECT ON public.local_budgets TO anon;
