# 05 — Preuves de Tests Transversaux, Compilation, Builds et Lecture Seule Supabase

**Date d'exécution :** 15 novembre 2026  
**Branche de remédiation :** `antigravity/p0-financial-compliance-remediation`  
**SHA testé avant clôture documentaire :** `48ac40b9fdab1b93018e43786b4aae84d8e4af3a`

---

## 1. Synthèse des contrôles qualité exécutés (Section 10)

| Commande exécutée | Résultat | Détails mesurés |
|---|---|---|
| `npx tsc --noEmit` | **PASS (code 0)** | `0` erreur de typage sur l'ensemble du projet TypeScript |
| `npx vitest run` | **PASS (code 0)** | **`71` fichiers de tests passés sur `71`** · **`1 001` tests unitaires et d'intégration passés sur `1 001` (`0` échec)** · Durée `85,11 s` |
| `npm run build` | **PASS (code 0)** | `tsc && vite build` · `1 770` modules transformés · construit en `18,01 s` |
| `npm run build:review` | **PASS (code 0)** | `vite build --config vite.review.config.ts` · `39` modules transformés · construit en `2,92 s` |
| `npm run verify:supabase:read-only` | **PASS (code 0)** | `{"clientInitialized":true,"credential":"anon","allowedMethods":["GET","HEAD"],"remoteSupabaseWrites":0,"status":"PASS"}` |

---

## 2. Couverture des suites de tests dédiées aux bloqueurs P0

| Suite de tests | Fichier | Nombre de tests | Invariants & Bloqueurs P0 vérifiés |
|---|---|---:|---|
| Intégrité de la chaîne documentaire & SHA-256 | `src/utils/__tests__/documentaryChainIntegrity.test.ts` | `26` | Calcul SHA-256 à l'upload, badges HTTP `404` (`DGBF-RAP-2022`, `CAIDP-LOI-2013-867`), garde-fous d'attestation de pagination Cocody 2024 (`14 072 943` octets, `44` pages physiques, page `20/45` absente, purge si non attesté) |
| Symétrie des deux référentiels locaux | `src/utils/__tests__/dualReferentialVerification.test.ts` | `22` | Concordance `OFFICIAL_PRIMITIVE_BUDGETS` (`46` entrées) vs `LOCAL_BUDGETS_REFERENTIAL` (`50` lignes / `48` en 2026 / `47` collectivités, Bingerville v1 archivée vs v2 active), `0` rôle `PRIMARY` sur dépêches AIP/presse |
| Base PostgreSQL réelle (PGlite), RLS & 21 `SECURITY DEFINER` | `src/utils/__tests__/adminPersistenceDatabase.test.ts` | `37` | Application séquentielle des migrations incluant `20261114183000_reconcile_security_definer_and_private_rls.sql`, RLS default-deny sur `private.*`, filtre `admin-%` / `csv-%` / `import-%` sur `admin_baseline_visibility`, matrice exacte des 21 fonctions `SECURITY DEFINER` |
| Service de persistance & zéro appel RPC `401` anonyme | `src/utils/__tests__/adminPersistenceService.test.ts` | `14` | Court-circuit de `fetchAdminBaselineVisibility` en session anonyme (`0` appel réseau `401` sur `rpc/admin_baseline_visibility`) |
| Sécurité des médias & compteur atomique Edge | `src/utils/__tests__/adminMediaSecurity.test.ts` | `15` | Politiques `storage.objects` scindées `authenticated` / `anon` sans erreur `permission denied for function has_staff_role`, vérification SHA-256 des octets |
| Pilote Compte Administratif Cocody 2024 | `src/utils/__tests__/cocodyCa2024Pilot.test.ts` | `16` | Concordance des 8 rubriques financières avec la page PDF 40 (`41/45`), `57` opérations d'investissement (`3 900 630 000` prévus, `1 366 100 690` exécutés), tests contradictoires de pagination `M` et `N` |
| Réconciliation Tiassalé 2024 & alertes dynamiques | `src/utils/__tests__/tiassaleCaReconciliation.test.ts` & `src/utils/__tests__/caGeneralizationAndRubrics.test.tsx` | `29` | Déclassement `OFFICIAL_DOCUMENT -> TO_VERIFY` en l'absence de `source_document_id`, calcul dynamique `+2 237 133 790 FCFA` (Cocody) et `+157 080 800 FCFA` (Tiassalé), paramétrisation sur les 232 collectivités |
| Normalisation sectorielle & séparation des exercices | `src/utils/__tests__/sectorNormalization.test.ts` & `src/utils/__tests__/publicIndicators.test.tsx` | `26` | Insensibilité aux accents (`Santé`/`SANTE`, `Éducation`/`EDUCATION`), suppression du plancher `2 %`, réconciliation à 100 % sur `1 798 733 552 572 FCFA` (`4 657` opérations 2026), exclusion de `Séguéla-Touba` (`2021`, `104,7 Mds FCFA`), périmètre `232` collectivités (`201` + `31`) + `2` districts séparés |
| Séparation stricte `null` vs `0` & agrégats LFI sans doublon | `src/utils/__tests__/institutionBudgetIntegrity.test.ts` | `25` | `formatFCFA(null)` = `'Montant à confirmer'`, `budget_investment_fcfa: null` sur le District Autonome d'Abidjan, rejet des valeurs négatives dans `calculateExecutionRate`, `CommuneComparatorModal` sans coercition `null -> 0`, notice `gov-007` (3 montants), totaux additifs `298 579 127 196 FCFA` (11 sections institutions hors `IGE`/`HABG`) et `34` sections ministérielles uniques (hors doublon `229`) |

---

## 3. Extrait du journal d'exécution (`task-3274`)

```text
Test Files  71 passed (71)
     Tests  1001 passed (1001)
  Start at  03:37:18
  Duration  85.11s (transform 13.70s, setup 0ms, import 86.62s, tests 123.94s, environment 36ms)

> suivibudget-ci@1.0.0 build
> tsc && vite build
✓ 1770 modules transformed.
✓ built in 18.01s

> suivibudget-ci@1.0.0 build:review
> vite build --config vite.review.config.ts
✓ 39 modules transformed.
✓ built in 2.92s

> suivibudget-ci@1.0.0 verify:supabase:read-only
> node scripts/verify-supabase-readonly.mjs
{"clientInitialized":true,"credential":"anon","allowedMethods":["GET","HEAD"],"results":[{"table":"institutions","status":200,"ok":true,"rows":1,"errorCode":null},{"table":"public_documents","status":200,"ok":true,"rows":1,"errorCode":null},{"table":"local_budgets","status":200,"ok":true,"rows":1,"errorCode":null}],"remoteSupabaseWrites":0,"status":"PASS"}
```
