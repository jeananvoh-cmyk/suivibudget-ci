# Rapport de Cohérence Chronologique des Migrations & RLS — PR #68, #77, #76, #78, #75

**Date :** 2026-11-16  
**Environnement de test :** Replay PGlite fidèle au schéma Production (`createProductionSchemaFixture()` + triggers/vues/contraintes PR #63) avec données historiques non vides  
**Suite automatisée reproductible :** [migrationChainCoherence.test.ts](file:///c:/Users/Couple%20ANVOH/Projects/suivibudget-ci/src/utils/__tests__/migrationChainCoherence.test.ts)  
**Production Supabase (`cdesuvcozcetdtvibgqs`) :** Aucune migration appliquée, aucune écriture effectuée (`verify:supabase:read-only` PASS).

---

## 1. Chaîne chronologique auditée

| Ordre | Timestamp | PR | Branche | Rôle principal |
| :---: | :--- | :---: | :--- | :--- |
| Baseline | `20261026183930` .. `20261113011327` | #63 | `master` / prod target | Triggers `admin_validate` / `admin_audit`, receipts, intégrité documentaire, durcissement `SECURITY DEFINER` |
| 1 | `20261115070000_enforce_primary_document_provenance.sql` | #68 | `fix/reconcile-public-indicators` | Provenance documentaire primaire & déclassement des statuts non sourcés |
| 2 | `20261115110000_harden_financial_evidence_guards.sql` | #77 | `fix/pre-go-financial-audit` | Durcissement `budget_lines`, `budget_revenue_sources`, non-révocation des documents primaires référencés |
| 3 | `20261116100000_enforce_passport_document_evidence.sql` | #77 (hérité par #76, #78) | `fix/pre-go-financial-audit` | Triggers de preuve documentaire Passeport (`citizen_need_*`, `audit_*`) + backfill |
| 4 | `20261116140000_optimize_admin_receipt_read_rls.sql` | #76 | `fix/pre-go-supabase-advisors` | Optimisation RLS `(SELECT auth.uid())` sur `admin_operation_receipts` (`admin_receipt_read`) |
| 5 | `20261116150000_move_staff_rpcs_to_private.sql` | #78 | `fix/pre-go-complete-20261115` | Déplacement des 8 RPC privilégiées en `private.*` + wrappers `public.* SECURITY INVOKER` + retrait lectures publiques `site_settings`, `projects`, `sources` |
| 6 | `20261116160000_enforce_institution_response_moderation.sql` | #75 | `feat/institution-response-workflow` | Workflow modéré strict (`PENDING -> VALIDATED -> PUBLISHED`) & date obligatoire sur `ca_institution_responses` |

---

## 2. Anomalies critiques détectées par le replay réel non vide & correctifs appliqués

1. **Bloquant migration sur table `budget_projects` non vide (`20261116100000_enforce_passport_document_evidence.sql`, PR #77 / #76 / #78) :**
   - *Symptôme reproduit en PGlite :* Le backfill `UPDATE public.budget_projects` exécuté sans session opérateur (`auth.uid() IS NULL`) déclenchait le trigger `admin_validate` (`BEFORE UPDATE`, PR #63) et levait `ERROR: Declared progress is not physical certification` (puis `admin_audit`: `Authenticated active operator required`) dès qu'une ligne historique contenait `citizen_need_verification_status = 'VERIFIED'` ou `audit_verification_status = 'VERIFIED'`.
   - *Correctif appliqué :* Encadrement du backfill par `ALTER TABLE public.budget_projects DISABLE TRIGGER USER;` et `ALTER TABLE public.budget_projects ENABLE TRIGGER USER;` (à l'identique du pattern déjà utilisé dans `20261115070000_enforce_primary_document_provenance.sql` lignes 116-139).

2. **Privilèges PostgreSQL absents sur `public.ca_institution_responses` en Production (`20261116160000_enforce_institution_response_moderation.sql`, PR #75) :**
   - *Symptôme reproduit contre `adminProductionSchema.json` :* La migration `20260930030702_grant_schema_privileges.sql` avait révoqué tous les privilèges sur `public.*` et omis `public.ca_institution_responses`. Sans `GRANT` explicite, toute lecture publique ou action staff retournait `ERROR: permission denied for table ca_institution_responses` (masquée dans les tests unitaires initiaux qui exécutaient des `GRANT` manuels en setup).
   - *Correctif appliqué sur PR #75 :* Ajout de `GRANT SELECT ON public.ca_institution_responses TO anon, authenticated;` et `GRANT INSERT, UPDATE, DELETE ON public.ca_institution_responses TO authenticated;` dans `20261116160000_enforce_institution_response_moderation.sql`, accompagné du retrait des `GRANT` artificiels dans `institutionResponseRls.test.ts`.

3. **Contrôle `GRANT USAGE ON SCHEMA private TO authenticated` (PR #78) :**
   - Audit complet des fonctions `private.*` sur toutes les migrations : toutes les fonctions internes (`has_staff_role`, `admin_*`, `apec_submission_event`, `validate_import_row`, `enforce_*`, `prevent_*`) exécutent explicitement `REVOKE ALL ... FROM PUBLIC, anon[, authenticated]` sauf les points d'entrée légitimes explicitement accordés aux rôles attendus.
   - Les 8 RPC publiques (`admin_baseline_visibility`, `admin_staff_directory`, `apec_link_targets`, `import_data_batch`, `publish_apec_need`, `record_apec_decision`, `review_data_import`, `withdraw_apec_need`) ont `prosecdef = false` (`SECURITY INVOKER`), zéro droit `anon`, et délèguent aux corps `private.*` `SECURITY DEFINER`.
   - Aucune requête client en production ne lit `public.projects` ou `public.sources`; `site_settings` n'est lue que côté admin (`refreshAdminEntities`), où un tableau vide sans erreur sous RLS est toléré pour `anon`/`CITIZEN`.

---

## 3. Matrice de vérification par rôle (`migrationChainCoherence.test.ts`)

| Rôle testé | Lectures publiques / restreintes | RPC staff | Écritures / modération | Résultat |
| :--- | :--- | :--- | :--- | :---: |
| **`anon`** | Lit `PUBLISHED` (`ca_institution_responses`); bloqué sur `site_settings`, `projects`, `sources` (0 ligne) | Exécution `admin_staff_directory()` refusée | Aucune écriture | **PASS** |
| **`CITIZEN`** | Bloqué sur `site_settings` et `admin_operation_receipts` | Exécution `admin_staff_directory()` refusée | `INSERT ca_institution_responses` refusé par RLS | **PASS** |
| **`MODERATOR`** | Lit uniquement ses reçus domaine (`news_articles`) via `(SELECT auth.uid())` | Exécution `review_data_import` (`DATA_MANAGER`) refusée | Peut créer `PENDING` -> `VALIDATED` -> `PUBLISHED`; saut direct `PENDING -> PUBLISHED` refusé | **PASS** |
| **`DATA_MANAGER`** | Lit uniquement ses reçus domaine (`budget_projects`) | `public.apec_link_targets(...)` délègue correctement à `private.*` | Claim Passeport `VERIFIED` sans PDF bloqué par triggers | **PASS** |
| **`ADMIN`** | Lit `site_settings` | `public.admin_staff_directory()` retourne le répertoire staff complet | Accès complet conforme RLS | **PASS** |
