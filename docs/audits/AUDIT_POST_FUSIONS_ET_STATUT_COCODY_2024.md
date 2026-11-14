# Audit Financier Post-Fusions & Preuve de Statut Cocody CA 2024

**Date de contrôle :** 14 novembre 2026  
**Dépôt :** `jeananvoh-cmyk/suivibudget-ci`  
**Base de comparaison Git :** `origin/master` (`c9bd106`, post-fusions `#65`, `#66`, `#67`) · branche de travail `fix/p0-cocody-sql-audit-reconciliation` · PR `#68` ouverte (`1813de0`, non fusionnée)  
**Projet Supabase contrôlé en lecture seule (`GET` uniquement) :** `cdesuvcozcetdtvibgqs` (`eu-west-1`) — **0 écriture distante exécutée**

---

## 1. Statut réel de l'import financier Cocody 2024 en production (Livrable 3)

Contrairement au tableau récapitulatif obsolète de fin octobre (`EN ATTENTE D'AUTORISATION PROPRIÉTAIRE`), les requêtes `GET` en lecture seule sur l'API REST publique de `cdesuvcozcetdtvibgqs` exécutées le 14 novembre 2026 prouvent que **le Compte Administratif 2024 de la Commune de Cocody est déjà publié en production depuis le 13 novembre 2026**.

### 1.1 Preuves brutes relevées sur `cdesuvcozcetdtvibgqs`

| Table / Ressource Supabase | Identifiant / Périmètre | Statut & Champs observés en lecture seule (`GET`) | Réserve / Écart constaté |
|---|---|---|---|
| `public_documents` | `doc-dff4865a-c6a8-418e-8895-626258e409d0` (`inst-com-cocody`, `2024`) | `status = "PUBLISHED"`, `verification_status = "VERIFIED"`, `checksum_status = "COMPUTED"`, `checksum_algorithm = "SHA256_FILE_V1"`, `checksum_sha256 = "941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf"`, `file_size_bytes = 14072943`, `page_count = 44`, `is_multipart = false`, `parts_count = 1`, `downloads_count = 12`, `revision = 4`, `published_at = "2026-11-13T13:47:29.157086+00:00"` | `approval_date = "2025-08-13"` diverge de la date de délibération (`08/07/2025`) ; `is_scanned = false` et `has_text_layer = true` sont hérités sans revalidation. |
| `administrative_accounts` | `ca-cocody-2024` (`inst-com-cocody`, `2024`) | `status = "PUBLISHED"`, `verification_status = "VERIFIED"`, `reconciliation_status = "RECONCILED"`, `source_document_id = "doc-dff4865a-c6a8-418e-8895-626258e409d0"`, `source_page = 40`, `approval_date = "2025-07-08"`, `prefecture_visa_date = "2025-07-22"`, `updated_at = "2026-11-13T04:48:37.461659+00:00"` | `arithmetic_difference = 0` alors que `19 012 357 233 − 16 775 223 443 = 2 237 133 790`, provoquant l'affichage `+0 FCFA` dans `AdministrativeAccountView.tsx` sous le libellé d'écart arithmétique. |
| `ca_investment_operations` | `57` opérations (`inst-com-cocody`, `2024`) | Somme prévue : **`3 900 630 000` FCFA** ; somme exécutée : **`1 366 100 690` FCFA** ; `29` opérations avec exécution `> 0` ; `0` reliée à `budget_project_id` ; pages source `[41, 42, 43]` ; `12` libellés de secteurs. | Aucun rapprochement `budget_project_id` (car `budget_projects` compte `0` ligne en base distante). |
| `ca_procurement_matches` | `28` rapprochements (`inst-com-cocody`) | `19` au niveau `PARTIAL`, `9` au niveau `STRONG`. | Couverture partielle (`28` lignes rapprochées sur `57` opérations). |

### 1.2 Montants officiels Cocody 2024 publiés en production vs pièce source (`source_page = 40`, PDF 40 / imprimée 41/45)

| Rubrique comptable (`ca-cocody-2024`) | Montant en base distante (FCFA) | Traçabilité documentaire |
|---|---:|---|
| Fonctionnement — Prévisions (`operating_planned`) | `18 441 235 000` | PDF p. 40 (imprimée 41/45), `doc-dff4865a-c6a8-418e-8895-626258e409d0`, SHA-256 `941c399b...` |
| Fonctionnement — Recettes recouvrées (`operating_revenue_collected`) | `17 646 256 543` | PDF p. 40 (imprimée 41/45) |
| Fonctionnement — Dépenses ordonnancées (`operating_realized`) | `15 409 122 753` | PDF p. 40 (imprimée 41/45) |
| Investissement — Prévisions (`investment_planned`) | `3 900 630 000` | PDF p. 40 & tableau pp. 41–43 |
| Investissement — Recettes recouvrées (`investment_revenue_collected`) | `1 366 100 690` | PDF p. 40 |
| Investissement — Dépenses ordonnancées (`investment_realized`) | `1 366 100 690` | PDF p. 40 & somme des `57` opérations pp. 41–43 (`1 366 100 690`) |
| Total — Prévisions (`total_planned`) | `22 341 865 000` | Exact (`18 441 235 000 + 3 900 630 000`) |
| Total — Recettes recouvrées (`total_revenue_collected`) | `19 012 357 233` | Exact (`17 646 256 543 + 1 366 100 690`) |
| Total — Dépenses exécutées (`total_realized`) | `16 775 223 443` | Exact (`15 409 122 753 + 1 366 100 690`) |
| Excédent de l'exercice (`surplus_or_deficit`) | `2 237 133 790` | Exact (`19 012 357 233 − 16 775 223 443`) ; report antérieur `944` FCFA ; cumulé `2 237 134 734` FCFA (notes) |

### 1.3 État des autres tables publiques sur `cdesuvcozcetdtvibgqs` (14 novembre 2026)

- **`administrative_accounts` (hors Cocody)** : `ca-tiassale-2024` reste `PUBLISHED` avec `verification_status = "OFFICIAL_DOCUMENT"`, `reconciliation_status = "SOURCE_ANOMALY"`, `total_planned = 1 007 841 000`, `total_revenue_collected = 1 216 336 558`, `total_realized = 1 059 255 758`, `surplus_or_deficit = 0`, `arithmetic_difference = 157 080 800`, `source_document_id = null`, `source_page = null` (`3` opérations : `72 000 000` prévus, `40 263 660` exécutés ; `3` marchés `STRONG`).
- **`local_budgets`** (`3` lignes) : `inst-com-bingerville` (`2026`, `4 046 222 000`, `AIP_VERIFIED`, `is_current_version = false`), `inst-com-cocody` (`2026`, `19 764 660 000`, `SECONDARY_TO_CORROBORATE`, `is_current_version = false`), `inst-com-tiassale` (`2024`, `820 150 000`, `AIP_VERIFIED`, `is_current_version = false`).
- **`institutions`** (`4` lignes : Abobo, Bingerville, Tiassalé, Cocody, toutes à `total_budget_fcfa = null`).
- **`budget_projects` (`0`), `news_articles` (`0`), `caidp_directory` (`0`), `public_citizen_proofs` (`0`), `apec_public_needs` (`0`), `site_settings` (`[]`)** : vides ou non peuplées en lecture anonyme.
- **`apec_contributions`, `citizen_proofs`, `ca_institution_responses`** : HTTP `401` (`permission denied`) en anonyme.

---

## 2. Sécurité SQL, privilèges et pagination Cocody (Livrables 1 & 2)

### 2.1 Durcissement pagination Cocody (`src/data/officialPublicDocumentsCatalog.ts` & UI)

- `VerifiedDocumentPaginationControl` impose désormais l'appariement strict `institutionIds` (`['inst-com-cocody', 'commune-cocody']`) et `fiscalYear` (`2024`).
- `isVerifiedDocumentPaginationAttested(doc, control)` n'atteste les valeurs (`page_count = 44`, `physical_page_count = 44`, `printed_page_count = 45`, `missing_printed_pages = ['20/45']`) que si :
  1. `checksum_sha256` normalisé (64 hex) correspond au document contrôlé ;
  2. `checksum_status === 'COMPUTED'` ;
  3. `file_size_bytes === 14_072_943` ;
  4. `is_multipart !== true` ;
  5. `!checksum_algorithm || checksum_algorithm === 'SHA256_FILE_V1'` ;
  6. `(status === 'VERIFIED' || status === 'PUBLISHED') && verification_status === 'VERIFIED'` ;
  7. `institution_id` et `fiscal_year`/`year` correspondent au contrôle.
- Si ces conditions ne sont pas réunies, `applyVerifiedDocumentPagination` purge `printed_page_count`, `missing_printed_pages` et `pagination_note`. Si elles sont réunies, elle écrase de manière déterministe toute valeur altérée ou divergente.
- `AdministrativeAccountView.tsx`, `DocumentsPage.tsx` et `ExamineCADocumentModal.tsx` calculent dynamiquement les pages restituées (`printed_page_count - missing_printed_pages.length`) et n'affichent la note/détail `41/45` qu'en présence d'un contrôle attesté (`attestedPaginationControl`).
- Validé par les tests contradictoires `M` et `N` de `src/utils/__tests__/cocodyCa2024Pilot.test.ts` et `src/utils/__tests__/caGeneralizationAndRubrics.test.tsx`.

### 2.2 Réconciliation SQL `SECURITY DEFINER` et RLS `private.*`

L'audit comparatif de `supabase/migrations/20261113011327_security_definer_hardening_20261026213000.sql` avec PostgreSQL réel (PGlite) avait relevé trois écarts par rapport à la documentation d'octobre :
1. `ENABLE ROW LEVEL SECURITY` et `REVOKE ALL ON TABLE` sur `private.admin_document_file_checks` et `private.document_delivery_receipts` étaient absents de `20261113011327` (`rls_enabled = false`) ;
2. `public.admin_baseline_visibility(p_table text, p_ids text[])` n'excluait que `id not like 'admin-%'` (omettant `csv-%` et `import-%`), et sa liste blanche porte sur `('institutions', 'budget_projects', 'news_articles', 'caidp_directory')` ;
3. les sections 1, 2 et 4 de `20261113011327` ne révoquaient pas explicitement `service_role` sur plusieurs fonctions staff/trigger/dépréciées, et `src/services/dataStore.ts` appelait encore `admin_baseline_visibility` en session anonyme (4 erreurs HTTP `401` sur le site public).

La nouvelle migration locale **`supabase/migrations/20261114183000_reconcile_security_definer_and_private_rls.sql`** (non appliquée sur la base distante) et `src/services/dataStore.ts` (`refreshAdminEntities`) rétablissent la conformité exacte :
- `private.admin_document_file_checks` et `private.document_delivery_receipts` : `ENABLE ROW LEVEL SECURITY` sans aucune politique permissive (`0` policy) + `REVOKE ALL ON TABLE ... FROM public, anon, authenticated, service_role` ;
- Politiques restrictives `storage.objects` (`documents_staff_domain`, `citizen_media_staff_domain`, `protected_admin_originals`) scindées entre `authenticated` (appelant `private.has_staff_role` / `private.admin_original_unreferenced`) et `anon` (`*_anon_deny` explicite sans appel aux fonctions `private.*`, évitant l'erreur `permission denied for function has_staff_role` lors d'un audit en session anonyme) ;
- `USAGE ON SCHEMA private` conservé uniquement pour `anon, authenticated` afin que la vue `public.public_citizen_proofs` (`security_invoker = true`) continue de lire `private.published_citizen_proofs()` ;
- Matrice vérifiée par PGlite dans `src/utils/__tests__/adminPersistenceDatabase.test.ts` sur **21 fonctions `SECURITY DEFINER`** :
  - `private.published_citizen_proofs()` : `anon=true`, `authenticated=true`, `public=false`, `service_role=false` ;
  - `public.admin_confirm_document_integrity(...)` & `public.record_document_delivery(...)` : `service_role=true` uniquement ;
  - 6 fonctions trigger (`private.admin_record_event`, `private.admin_source_withdrawal`, `private.apec_submission_event`, `public.handle_new_user`, `public.protect_profile_privileges`, `public.rls_auto_enable`) : `public=false`, `anon=false`, `authenticated=false`, `service_role=false` ;
  - 12 fonctions/helpers staff (`private.admin_file_checked`, `private.admin_media_link_allowed`, `private.admin_original_unreferenced`, `private.has_staff_role`, `public.admin_baseline_visibility`, `public.admin_staff_directory`, `public.apec_link_targets`, `public.import_data_batch`, `public.publish_apec_need`, `public.record_apec_decision`, `public.review_data_import`, `public.withdraw_apec_need`) : `authenticated=true`, `public=false`, `anon=false`, `service_role=false`.

---

## 3. Audit financier post-fusions de `origin/master` (`c9bd106`) vs PR `#68` (`1813de0`) (Livrable 4)

### 3.1 Inventaire des sources primaires (`DOCUMENT_CONTROLS` & `getOfficialPublicDocuments()`)

| Identifiant catalogue | Statut / Vérification | Pages | Empreinte SHA-256 | Usage vérifié |
|---|---|---:|---|---|
| `DGBF-LFI-2026` | `PUBLISHED` / `VERIFIED` | `583` | `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76` | Articles 14–15 (pp. 12–20) et programme 2204040 (`gov-*`, `inst-com-attecoube`) |
| `DGBF-DPPD-PAP-2026-2028-ANNEXE-4` | `PUBLISHED` / `VERIFIED` | `1229` | `0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10` | Annexe 4 DPPD-PAP 2026-2028 |
| `DGBF-ANNEXE-6-2026` | `PUBLISHED` / `VERIFIED` | `179` | `3186dc17e1ba51ba1b69b3eed8ee3e40083a8eb0ddd56861dfdd0aa4b8c9bb2e` | EPN et structures assimilées 2026 |
| `DGBF-ANNEXE-7-2026` | `PUBLISHED` / `VERIFIED` | `89` | `567810702fb7ed7cb83945a0af18ef23ee52bf617a305bac36243c08de4a1842` | Dotations des Institutions 2026 |
| `DGBF-TRANSFERTS-LOCAL-2026` | `PUBLISHED` / `VERIFIED` | `322` | `b3c2d9b90d847fdefb20d100c606cba0b6430e00f94306da6377ce56014128fc` | Concours financiers aux collectivités 2026 (Annexe 8) |
| `DGBF-RAP-2022` | `PUBLISHED` / `TO_VERIFY` | `1750` | `b62b716caf5efe9ce8fa6f5edfa853e530f2fb183ff4530689950553ba346156` | Loi de règlement 2022 (non certifiée) |
| `CAIDP-LOI-2013-867` | `PUBLISHED` / `TO_VERIFY` | `null` | `null` | Référence juridique CAIDP sans empreinte ni PDF local vérifié |

### 3.2 Inventaire des montants publics calculés sur `origin/master` (`c9bd106`)

| Surface / Jeu de données | Comptage & Montant observés sur `origin/master` | Source & Traçabilité | Anomalie / Limite identifiée sur `origin/master` |
|---|---|---|---|
| **Catalogue brut projets** (`RAW_BUDGET_PROJECTS`) | `7 169` lignes = **`3 611 622 442 436` FCFA** (`2 808` nationaux `3 285 399 843 239` + `4 354` locaux `175 602 599 197` + `7` stratégiques `150 620 000 000`) | Exports JSON/CSV `2026` + fiche stratégique `2021` (`104 700 000 000`) | Inclut fonctionnement, salaires, équipements, études et multi-exercices sans traçabilité ligne par page/SHA (`0` SHA-256, `0` page PDF sur les objets `BudgetProject`). |
| **Projets retenus par `dataStore.getProjects()` & `getImpactStats()`** | `4 708` lignes = **`1 910 857 033 365` FCFA** (`NATIONAL`: `855` lignes / `1 715 797 864 106` ; `LOCAL`: `3 853` lignes / `195 059 169 259` ; `2021`: `1` ligne / `104 700 000 000` ; `2026`: `4 707` lignes / `1 806 157 033 365`) | Filtre `isTangiblePhysicalProject` dans `dataStore.ts` | **[P0 sur `master`, corrigé dans PR #68 non fusionnée]** : mélange `NATIONAL` + `LOCAL` et `2021` + `2026`, conserve des lignes non physiques (ex. `ADMINISTRATION`), et retourne `proofsVerificationRate = 100` lorsque `totalProofs === 0`. |
| **Ventilation sectorielle `HomePage.tsx`** | `6` secteurs matchant `3 351` lignes = **`1 344 586 248 810` FCFA** (`Infrastructure`: `287` / `767 275 518 965` / `40%` ; `Eau`: `657` / `340 462 708 329` / `18%` ; `Logement`: `383` / `124 940 144 708` / `7%` ; `Éducation`: `1 214` / `47 550 276 444` / `2%` ; `Commerce`: `306` / `43 805 272 039` / `2%` ; `Santé`: `504` / `20 552 328 325` / `2%`) | Filtrage `category.toLowerCase().includes(key)` dans `HomePage.tsx` | **[P0 sur `master`, corrigé dans PR #68 non fusionnée]** : omet **`566 270 784 555` FCFA (`1 357` lignes = 29,6 %)** dont `EDUCATION` sans accent (`174 815 470 890` FCFA), `SANTE` sans accent (`34 552 730 073` FCFA), `ADMINISTRATION` (`270 617 449 159` FCFA), `AGRICULTURE` (`28 730 178 900` FCFA), `SECURITE`, `ENERGIE` ; plancher artificiel `Math.max(2, ...)` sur les pourcentages. |
| **Ministères (`35` portefeuilles)** | `ALL_MINISTRIES_DATA` : `25/35` non nuls = **`7 110 948 983 368` FCFA** ; référentiel légal `LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json` : **`34` sections uniques = `8 980 302 047 415` FCFA** (`9 314 180 136 941` brut avant déduplication de section `229` = `333 878 089 526` entre `gov-009` et `gov-035`) | `DGBF-LFI-2026` Art. 14–15 (p. 12–20), SHA `f06035b6...` | **[P1]** : `assessInstitutionBudget(inst)` sans contexte place `23` ministères en `PARTIAL_BREAKDOWN` et `12` (`10` nuls + `gov-009`/`gov-035`) en `NOT_DOCUMENTED` ; `ALL_MINISTRIES_DATA` reste incomplet (`25/35`). |
| **Institutions nationales (`14`) & Autorités (`7`)** | `13/14` institutions dans `NATIONAL_INSTITUTIONS_DATA` = **`314 003 879 687` FCFA** (`NATIONAL_DIRECT_ALLOCATIONS_2026` = **`126 589 744 830` FCFA** sur `13` chapitres) ; `inst-cour-supreme` = `null` ; Autorités `0/7` = `null` (`NOT_DOCUMENTED`) | `DGBF-ANNEXE-7-2026` (`89` p.) & LFI 2026 | **[P1]** : 1 institution (`Cour Suprême`) et 7 autorités sans ventilation publiée (correctement conservées à `null`, jamais remplacées par `0`). |
| **Collectivités (`232` = `201` communes + `31` régions) & `2` districts** | CSV concours État : `191/201` communes = **`125 150 961 275` FCFA** (`26 453 694 756` + `98 697 266 519`) ; `31/31` régions = **`88 369 283 478` FCFA** ; Districts hors compteur : Abidjan (`3 400 000 000`), Yamoussoukro (`3 570 316 543`) | `DGBF-TRANSFERTS-LOCAL-2026` (`322` p.) | Les dotations CSV représentent les concours de l'État, distincts des budgets primitifs locaux ; `assessInstitutionBudget` bloque correctement leur confusion avec un BP complet. |
| **Budgets primitifs locaux (`OFFICIAL_PRIMITIVE_BUDGETS` & `LOCAL_BUDGETS_REFERENTIAL`)** | `OFFICIAL_PRIMITIVE_BUDGETS` (`46` entrées) = **`212 659 313 000` FCFA** ; `LOCAL_BUDGETS_REFERENTIAL` (`50` lignes, `47` collectivités) : `48` en 2026 (`47` versions actives = **`214 419 313 000` FCFA**) + `2` en 2025 | Dépêches AIP & communiqués mairies ; `48 AIP_VERIFIED`, `1 SECONDARY_TO_CORROBORATE`, `1 OFFICIAL_DOCUMENT` sur `origin/master` | **[P0 sur `master` & en prod, corrigé dans PR #68 non fusionnée]** : `LOCAL_BUDGETS_REFERENTIAL` porte encore `AIP_VERIFIED` sur `48` lignes alors que les dépêches AIP sont des sources secondaires à corroborer par délibération primaire (et `3` lignes en prod ont `AIP_VERIFIED` + `is_current_version = false`). |

### 3.3 Anomalies restantes classées par priorité (post-audit)

| Priorité | Code | Description & périmètre | Statut actuel |
|---|---|---|---|
| **P0** | `P0-MASTER-PR68` | Calculs d'indicateurs publics (`getImpactStats`, ventilation sectorielle `HomePage.tsx` omettant `566,27` Md FCFA, classification catalogue et statuts `AIP_VERIFIED` dans `localBudgetsReferential.ts`) non encore fusionnés sur `master`. | **Résolu sur PR #68 (`1813de0`), en attente de fusion sur `master`.** |
| **P0** | `P0-PROD-COCODY-ARITH` | En production (`cdesuvcozcetdtvibgqs`), `ca-cocody-2024.arithmetic_difference = 0` déclenche l'affichage `+0 FCFA` sous l'écart recettes − dépenses ; `public_documents.approval_date = "2025-08-13"` diverge de `2025-07-08`. | **Ouvert en production (écriture distante requise après accord propriétaire).** |
| **P0** | `P0-PROD-LOCAL-BUDGETS` | En production (`local_budgets`), les `3` lignes (`Bingerville`, `Cocody`, `Tiassalé`) conservent `is_current_version = false` et le statut `AIP_VERIFIED` pour Bingerville et Tiassalé ; `ca-tiassale-2024` reste `PUBLISHED` en `SOURCE_ANOMALY` sans `source_document_id` ni `source_page`. | **Ouvert en production.** |
| **P0** | `P0-DB-MIGRATION` | La migration de réconciliation `20261114183000_reconcile_security_definer_and_private_rls.sql` (RLS sur `private.*`, filtre `csv-%`/`import-%`, privilèges des 21 fonctions `SECURITY DEFINER`) est vérifiée en PGlite localement mais non encore appliquée en production. | **Préparé sur cette branche, à appliquer par le propriétaire.** |
| **P1** | `P1-FRONTEND-SYNC` | `src/services/dataStore.ts` corrigé sur cette branche pour supprimer les 4 appels anonymes `401` sur `admin_baseline_visibility`, à déployer après fusion. | **Corrigé sur cette branche.** |
| **P1** | `P1-CAT-MINISTRIES` | Absence de `sha256` et `pdf_page` sur les `BudgetProject` individuels et couverture partielle `25/35` des montants de `ALL_MINISTRIES_DATA`. | **À traiter dans le lot documentaire ministériel/projets ultérieur.** |
