# 01 — Chaîne Documentaire, Empreintes SHA-256, Catalogue & Pagination Cocody 2024

**Date de contrôle :** 15 novembre 2026  
**Branche de remédiation :** `antigravity/p0-financial-compliance-remediation`  
**Commits associés :** `3693e10a48ada41754671777df1d83bde450b61b`, `7135bd4f2b402f7ed4e76471d57984f79365d6fe`, `1ee42e4b7fbcb0e09d729e143d69050b668e969c`  
**Projet Supabase contrôlé en lecture seule (`GET` uniquement) :** `cdesuvcozcetdtvibgqs` (`remoteSupabaseWrites: 0`)

---

## 1. Pagination et empreinte du Compte Administratif Cocody 2024 (`doc-dff4865a-c6a8-418e-8895-626258e409d0`)

### 1.1 Preuves relevées sur le document réel et la base de production

| Paramètre contrôlé | Valeur observée / attestée | Source de vérification |
|---|---|---|
| Identifiant document (`public_documents.id`) | `doc-dff4865a-c6a8-418e-8895-626258e409d0` | API REST `GET /rest/v1/public_documents` (`cdesuvcozcetdtvibgqs`) |
| Collectivité & exercice | `inst-com-cocody` (Mairie de Cocody) · Exercice `2024` | `public_documents` & `administrative_accounts` (`ca-cocody-2024`) |
| Taille exacte en octets (`file_size_bytes`) | `14 072 943` octets | Fichier PDF physique & `public_documents.file_size_bytes` |
| Algorithme et statut d'empreinte | `SHA256_FILE_V1` · `checksum_status = "COMPUTED"` | `public_documents` & `VerifiedDocumentPaginationControl` |
| Empreinte SHA-256 intégrale | `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf` | Calcul binaire SHA-256 sur les `14 072 943` octets |
| Nombre de pages physiques du PDF | `44` pages physiques (`page_count = 44`, `physical_page_count = 44`) | Contrôle direct du PDF téléversé |
| Pagination imprimée interne | `45` pages imprimées (`1/45` à `45/45`, `printed_page_count = 45`) | Numérotation interne des feuillets scannés |
| Feuillet imprimé manquant dans le scan | `['20/45']` (`missing_printed_pages`) | Rupture de séquence entre `19/45` (page PDF 19) et `21/45` (page PDF 20) |
| Concordance page synthèse CA | Page PDF `40` = page imprimée `41/45` (`source_page = 40`) | Décalage d'une unité à partir de la page PDF 20 suite à l'omission de `20/45` |
| Date de délibération municipale | `2025-07-08` (8 juillet 2025) | `administrative_accounts.approval_date` & texte de délibération |
| Date de visa préfectoral / tutelle | `2025-07-22` (22 juillet 2025) | `administrative_accounts.prefecture_visa_date` |
| Date enregistrée sur `public_documents.approval_date` | `2025-08-13` (13 août 2025) | Divergence documentée avec la délibération du `08/07/2025` |

### 1.2 Garde-fous déterministes implémentés (`src/data/officialPublicDocumentsCatalog.ts`)

La fonction `isVerifiedDocumentPaginationAttested(doc, control)` et l'enrichisseur `applyVerifiedDocumentPagination(doc)` imposent cumulativement **7 conditions strictes** avant d'attester la pagination `44 pages physiques / 45 imprimées / page 20/45 absente` :

1. `checksum_sha256` normalisé (64 caractères hexadécimaux) strictement égal à `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf` ;
2. `checksum_status === 'COMPUTED'` ;
3. `file_size_bytes === 14_072_943` ;
4. `is_multipart !== true` ;
5. `!checksum_algorithm || checksum_algorithm === 'SHA256_FILE_V1'` ;
6. `(status === 'VERIFIED' || status === 'PUBLISHED') && verification_status === 'VERIFIED'` ;
7. Rattachement explicite à `institutionIds: ['inst-com-cocody', 'commune-cocody']` et `fiscalYear: 2024`.

- **En cas d'échec d'une seule condition** (empreinte absente/erronée, taille modifiée, statut `PENDING`, document `TO_VERIFY` ou `DRAFT`, multipartie, mauvaise commune ou mauvais exercice), `applyVerifiedDocumentPagination` purge immédiatement `printed_page_count`, `missing_printed_pages` et `pagination_note`.
- **En cas de validation complète**, `applyVerifiedDocumentPagination` écrase de manière déterministe `page_count` (`44`), `physical_page_count` (`44`), `printed_page_count` (`45`), `missing_printed_pages` (`['20/45']`) et `pagination_note`.

---

## 2. Synchronisation du calcul SHA-256 à l'upload (`SingleCAUploadModal.tsx` & `documentStorageService.ts`)

- Dans `src/components/admin/SingleCAUploadModal.tsx` et `src/services/documentStorageService.ts`, le téléversement d'un document de Compte Administratif calcule systématiquement l'empreinte binaire SHA-256 (`computeFileSha256`) sur les octets exacts du fichier (`file.size`), renseigne `checksum_sha256`, `checksum_status: 'COMPUTED'`, `checksum_algorithm: 'SHA256_FILE_V1'` et `file_size_bytes`, et interdit tout écrasement silencieux (`upsert: false`).
- Pour un lot multipartie (`is_multipart === true`), l'algorithme est qualifié en `SHA256_MANIFEST_V1` et ne peut jamais usurper l'attestation d'un fichier monolithique `SHA256_FILE_V1`.

---

## 3. Statuts de vérification du catalogue officiel et traitement des sources 404 (`DGBF-RAP-2022`, `CAIDP-LOI-2013-867`)

### 3.1 Inventaire des 7 entrées de `DOCUMENT_CONTROLS` (`src/data/officialPublicDocumentsCatalog.ts`)

| ID Document | Statut publication | Statut vérification | Pages PDF | SHA-256 | Disponibilité URL | Traitement UI (`DocumentsPage.tsx`) |
|---|---|---|---:|---|---|---|
| `DGBF-LFI-2026` | `PUBLISHED` | `VERIFIED` | `583` | `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76` | HTTP `200` | Badge `Vérifié (SHA-256)` + lien direct actif |
| `DGBF-DPPD-PAP-2026-2028-ANNEXE-4` | `PUBLISHED` | `VERIFIED` | `1229` | `0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10` | HTTP `200` | Badge `Vérifié (SHA-256)` + lien direct actif |
| `DGBF-ANNEXE-6-2026` | `PUBLISHED` | `VERIFIED` | `179` | `3186dc17e1ba51ba1b69b3eed8ee3e40083a8eb0ddd56861dfdd0aa4b8c9bb2e` | HTTP `200` | Badge `Vérifié (SHA-256)` + lien direct actif |
| `DGBF-ANNEXE-7-2026` | `PUBLISHED` | `VERIFIED` | `89` | `567810702fb7ed7cb83945a0af18ef23ee52bf617a305bac36243c08de4a1842` | HTTP `200` | Badge `Vérifié (SHA-256)` + lien direct actif |
| `DGBF-TRANSFERTS-LOCAL-2026` | `PUBLISHED` | `VERIFIED` | `322` | `b3c2d9b90d847fdefb20d100c606cba0b6430e00f94306da6377ce56014128fc` | HTTP `200` | Badge `Vérifié (SHA-256)` + lien direct actif |
| `DGBF-RAP-2022` | `PUBLISHED` | `TO_VERIFY` | `1750` | `b62b716caf5efe9ce8fa6f5edfa853e530f2fb183ff4530689950553ba346156` | HTTP `404` sur `dgbf.ci` (`source_url_status: 'UNAVAILABLE_404'`) | Badge ambre `À vérifier` + badge `Source distante indisponible (404)` ; bouton de téléchargement remplacé par `Lien source indisponible (404)` désactivé |
| `CAIDP-LOI-2013-867` | `PUBLISHED` | `TO_VERIFY` | `null` | `null` | HTTP `404` sur `caidp.ci` (`source_url_status: 'UNAVAILABLE_404'`) | Badge ambre `À vérifier` + badge `Source distante indisponible (404)` ; aucun SHA-256 inventé |

---

## 4. Référentiels budgétaires locaux (`OFFICIAL_PRIMITIVE_BUDGETS` & `LOCAL_BUDGETS_REFERENTIAL`)

Conformément à la règle non négociable *« Aucune source secondaire présentée comme une source primaire »* :

1. **`OFFICIAL_PRIMITIVE_BUDGETS` (`src/data/officialPrimitiveBudgets.ts`)** :
   - Contient **46 entrées** (30 communes + 16 conseils régionaux) pour l'exercice 2026 (`212 659 313 000 FCFA` au total).
   - Toutes les entrées issues de dépêches de presse (AIP, portails municipaux, presse nationale) portent `verification_status: 'SECONDARY_TO_CORROBORATE'` et `source_role: 'SECONDARY_REPORTING'`. Aucune ne porte `OFFICIAL_DOCUMENT` sans PDF primaire, page et SHA-256 vérifié.
2. **`LOCAL_BUDGETS_REFERENTIAL` (`src/data/localBudgetsReferential.ts`)** :
   - Contient **50 enregistrements** couvrant **47 collectivités distinctes** :
     - **48 enregistrements** pour l'exercice **2026** (dont **47 versions courantes** `is_current_version: true` totalisant `214 419 313 000 FCFA`, soit les 46 entrées de `OFFICIAL_PRIMITIVE_BUDGETS` + Toumodi `1 760 000 000 FCFA` + **1 version antérieure** `is_current_version: false` de Bingerville `lb-2026-bingerville-v1-bm` à `3 379 441 000 FCFA` précédant le BP 2026 `lb-2026-bingerville` à `4 046 222 000 FCFA`) ;
     - **2 enregistrements** pour l'exercice **2025** (`lb-2025-cocody` à `19 998 358 000 FCFA` et `lb-2025-grand-bassam` à `4 148 399 000 FCFA`).
   - **0 enregistrement** issu d'une dépêche AIP ou d'un article de presse ne porte `source_role: 'PRIMARY'` ni `verification_status: 'OFFICIAL_DOCUMENT'`. Toutes ces entrées portent `source_role: 'SECONDARY_REPORTING'` et `verification_status: 'SECONDARY_TO_CORROBORATE'`.
   - Cette symétrie est verrouillée par les tests automatisés de `src/utils/__tests__/dualReferentialVerification.test.ts` et `src/utils/__tests__/documentaryChainIntegrity.test.ts`.
