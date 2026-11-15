# 02 — Audit et Réconciliation des Migrations SQL, RLS, `private.*` et Privilèges RPC

**Date de contrôle :** 15 novembre 2026  
**Branche de remédiation :** `antigravity/p0-financial-compliance-remediation`  
**Commits associés :** `3693e10a48ada41754671777df1d83bde450b61b`, `ecc0e8c17dff1bd11292745fe3717c1d709eee69`  
**Projet Supabase contrôlé en lecture seule (`GET` uniquement) :** `cdesuvcozcetdtvibgqs` (`remoteSupabaseWrites: 0`)

---

## 1. Diagnostic des écarts entre `20261113011327_security_definer_hardening_20261026213000.sql` et l'état attendu

L'audit sur PostgreSQL réel (PGlite exécutant l'intégralité de la chaîne de migrations `supabase/migrations/`) a mis en évidence 4 écarts techniques dans la migration historique `20261113011327_security_definer_hardening_20261026213000.sql` :

1. **Tables internes `private.admin_document_file_checks` et `private.document_delivery_receipts` :**
   - `rls_enabled` était resté à `false` dans `pg_class` (`relrowsecurity = false`) ;
   - Les privilèges de table n'étaient pas explicitement révoqués pour `public, anon, authenticated, service_role`.
2. **Fonction RPC `public.admin_baseline_visibility(p_table text, p_ids text[])` :**
   - Le filtre d'exclusion ne filtrait que `id not like 'admin-%'`, omettant les préfixes `csv-%` et `import-%` ;
   - En outre, `src/services/dataStore.ts` (`refreshAdminEntities`) appelait `supabase.rpc('admin_baseline_visibility', ...)` lors du chargement initial du site public en session anonyme (`anon`), générant **4 erreurs réseau HTTP `401`** (`permission denied for function admin_baseline_visibility`) dans la console navigateur.
3. **Politiques RLS `AS RESTRICTIVE` sur `storage.objects` (`documents_staff_domain`, `citizen_media_staff_domain`, `protected_admin_originals`) :**
   - Ces politiques s'appliquaient à `public` (incluant `anon`) et invoquaient `private.has_staff_role()` ou `private.admin_original_unreferenced()`. Comme `EXECUTE` sur ces fonctions est révoqué pour `anon`, toute requête `anon` sur `storage.objects` déclenchait `permission denied for function has_staff_role` au lieu d'un refus RLS propre.
4. **Privilèges `EXECUTE` sur les 21 fonctions `SECURITY DEFINER` :**
   - Les sections 1, 2 et 4 de `20261113011327` ne révoquaient pas explicitement `service_role` sur plusieurs fonctions staff/trigger/dépréciées.

---

## 2. Remédiation implémentée (`supabase/migrations/20261114183000_reconcile_security_definer_and_private_rls.sql` & `src/services/dataStore.ts`)

### 2.1 Durcissement SQL (`20261114183000_reconcile_security_definer_and_private_rls.sql`)

1. **Verrouillage complet des tables `private.*` :**
   ```sql
   alter table private.admin_document_file_checks enable row level security;
   alter table private.document_delivery_receipts enable row level security;
   revoke all on table private.admin_document_file_checks from public, anon, authenticated, service_role;
   revoke all on table private.document_delivery_receipts from public, anon, authenticated, service_role;
   ```
   Aucune politique permissive n'est créée (`0` policy sur chacune des deux tables) : seuls les propriétaires `SECURITY DEFINER` (`postgres`) peuvent y accéder en interne.
2. **Séparation propre des politiques `AS RESTRICTIVE` sur `storage.objects` entre `authenticated` et `anon` :**
   - `documents_staff_domain`, `citizen_media_staff_domain` et `protected_admin_originals` sont ciblées `to authenticated` ;
   - Trois politiques restrictives dédiées `documents_staff_domain_anon_deny`, `citizen_media_staff_domain_anon_deny` et `protected_admin_originals_anon_deny` (`to anon`, `using (false) with check (false)`) bloquent `anon` sans appeler `private.has_staff_role()`.
3. **Réconciliation de `public.admin_baseline_visibility(p_table text, p_ids text[])` :**
   - Liste blanche stricte : `('institutions', 'budget_projects', 'news_articles', 'caidp_directory')` ;
   - Contrôle d'autorisation : `if not private.has_staff_role(array['ADMIN', 'DATA_MANAGER', 'MODERATOR']) then raise exception 'Forbidden' using errcode = '42501'; end if;` ;
   - Exclusion complète des identifiants créés/importés par l'administration :
     `and t.id not like 'admin-%' and t.id not like 'csv-%' and t.id not like 'import-%'`.
4. **Suppression des 4 appels RPC anonymes `401` côté client (`src/services/dataStore.ts` & `src/services/adminPersistenceService.ts`) :**
   - `fetchAdminBaselineVisibility` vérifie désormais l'existence d'une session authentifiée (`supabase.auth.getSession()`) avant tout appel RPC `admin_baseline_visibility`. En visiteur anonyme (`!session?.user`), aucun appel réseau vers `rpc/admin_baseline_visibility` n'est émis (`0` requête `401`).

---

## 3. Matrice exacte des privilèges des 21 fonctions `SECURITY DEFINER` (vérifiée sous PGlite)

| # | Schéma & Fonction (`regprocedure`) | Catégorie | `public` | `anon` | `authenticated` | `service_role` |
|---:|---|---|:---:|:---:|:---:|:---:|
| 1 | `private.published_citizen_proofs()` | Lecture publique via vue `public_citizen_proofs` (`security_invoker = true`) | `false` | **`true`** | **`true`** | `false` |
| 2 | `public.admin_confirm_document_integrity(text,text,bigint,text,integer)` | Edge Function / Service | `false` | `false` | `false` | **`true`** |
| 3 | `public.record_document_delivery(text,text)` | Edge Function / Service | `false` | `false` | `false` | **`true`** |
| 4 | `private.admin_record_event()` | Trigger interne | `false` | `false` | `false` | `false` |
| 5 | `private.admin_source_withdrawal()` | Trigger interne | `false` | `false` | `false` | `false` |
| 6 | `private.apec_submission_event()` | Trigger interne | `false` | `false` | `false` | `false` |
| 7 | `public.handle_new_user()` | Trigger interne | `false` | `false` | `false` | `false` |
| 8 | `public.protect_profile_privileges()` | Trigger interne | `false` | `false` | `false` | `false` |
| 9 | `public.rls_auto_enable()` | Event trigger interne | `false` | `false` | `false` | `false` |
| 10 | `private.admin_file_checked(text,text,text,bigint,integer)` | Helper RLS staff | `false` | `false` | **`true`** | `false` |
| 11 | `private.admin_media_link_allowed(text,text,text)` | Helper RLS staff | `false` | `false` | **`true`** | `false` |
| 12 | `private.admin_original_unreferenced(text,text)` | Helper RLS staff | `false` | `false` | **`true`** | `false` |
| 13 | `private.has_staff_role(text[])` | Helper RLS staff | `false` | `false` | **`true`** | `false` |
| 14 | `public.admin_baseline_visibility(text,text[])` | RPC Staff | `false` | `false` | **`true`** | `false` |
| 15 | `public.admin_staff_directory()` | RPC ADMIN | `false` | `false` | **`true`** | `false` |
| 16 | `public.apec_link_targets()` | RPC Staff | `false` | `false` | **`true`** | `false` |
| 17 | `public.import_data_batch(text,text,text,jsonb,jsonb)` | RPC Staff | `false` | `false` | **`true`** | `false` |
| 18 | `public.publish_apec_need(text,text)` | RPC Staff | `false` | `false` | **`true`** | `false` |
| 19 | `public.record_apec_decision(text,text,text,text,text,text,text)` | RPC Staff | `false` | `false` | **`true`** | `false` |
| 20 | `public.review_data_import(text,text,text)` | RPC ADMIN | `false` | `false` | **`true`** | `false` |
| 21 | `public.withdraw_apec_need(text,text)` | RPC Staff | `false` | `false` | **`true`** | `false` |

> **Statut d'application en production (`cdesuvcozcetdtvibgqs`) :** Conformément aux règles de sécurité absolues de la mission (`remoteSupabaseWrites: 0`, aucune migration appliquée en production sans autorisation distincte), la migration `20261114183000_reconcile_security_definer_and_private_rls.sql` est committée, poussée et validée sous PGlite (`src/utils/__tests__/adminPersistenceDatabase.test.ts`), prête à être appliquée par le propriétaire.
