# Rapport de Clôture — Mission P0 : Stabilisation de Production & Finalisation du CA 2024 de Cocody

- **Dépôt** : `jeananvoh-cmyk/suivibudget-ci`
- **Branche / PR** : `codex/p0-production-cocody-2024` (PR #65 ciblant `master`)
- **Base `master`** : `901a20396603de2c2bc0a3f9744d3977d33dbdb0` (fusion PR #63)
- **Projet Supabase autorisé** : `cdesuvcozcetdtvibgqs` (`eu-west-1`) — **Contrôlé en lecture seule (`REMOTE_SUPABASE_WRITES = 0`)**

---

## 1. Chantier A — Recette et Stabilisation de Production

### 1.1 Vérification de l'état de production déployé (`https://suivibudget.vercel.app/` & `cdesuvcozcetdtvibgqs`)

| Composant / Contrat | Résultat vérifié | Détails & Preuve |
|---|---|---|
| **Production Vercel (`https://suivibudget.vercel.app/`)** | **OPÉRATIONNEL (`HTTP 200`)** | Bundle déployé depuis `master` (`901a203`), chargement sans erreur console, routes publiques et administratives actives. |
| **RPC `public.admin_persistence_version()`** | **ACTIVE (`3`)** | Contrat de persistance admin v3 déployé et actif sur `cdesuvcozcetdtvibgqs`. |
| **RPC `public.document_delivery_metric()`** | **ACTIVE (`'SERVER_FILE_DELIVERY_V1'`)** | Compteur de délivrance binaire côté serveur actif sur `cdesuvcozcetdtvibgqs`. |
| **Edge Function `public-document-url`** | **ACTIVE (`HTTP 200` OPTIONS / `401` ou URL signée)** | Vérification SHA-256 côté serveur, support `part_number`, limitation de débit par IP relayée (`20/min`), déduplication UUID `24h`. |
| **Edge Function `admin-media-url`** | **ACTIVE (`HTTP 200` OPTIONS / `401` sans JWT staff)** | Lecture signée des médias `admin_media` et action `verify_document_integrity` (`service_role` -> `public.admin_confirm_document_integrity`). |
| **Tables `public_documents` / `administrative_accounts`** | **INTACTES** | `doc-dff4865a-c6a8-418e-8895-626258e409d0` (Cocody CA 2024, `PUBLISHED`/`VERIFIED`) et `ca-tiassale-2024` (Tiassalé CA 2024, `PUBLISHED` + 3 opérations + 3 marchés) intacts. |

### 1.2 Audit et durcissement des fonctions `SECURITY DEFINER` (`supabase/migrations/20261026213000_security_definer_hardening.sql`)

L'audit exhaustif des fonctions `SECURITY DEFINER` des schémas `public` et `private` a conduit aux durcissements ciblés suivants :

1. **`public.admin_baseline_visibility(p_table text, p_ids text[])`** :
   - Ajout d'une garde explicite `if p_table is null or p_ids is null` levant `'Invalid baseline request'`.
   - Exclusion des identifiants brouillons créés dynamiquement (`and id not like 'admin-%'`) afin qu'un appelant anonyme (`anon`) ou `CITIZEN` ne puisse jamais sonder l'existence d'un brouillon administratif hors référentiel statique.
2. **`public.admin_staff_directory()`** :
   - Passage d'un filtre silencieux à une garde explicite `if not coalesce(private.has_staff_role(array['ADMIN','DATA_MANAGER','MODERATOR']), false) then raise exception 'Staff authorization required' using errcode = '42501'; end if;` rejetant formellement tout appel d'un utilisateur authentifié non-staff (`CITIZEN`).
3. **`public.admin_confirm_document_integrity(p_id, p_revision, p_actor, p_files)`** :
   - Ajout d'une garde interne sur le rôle d'exécution (`if coalesce(current_setting('role', true), 'none') not in ('service_role', 'none', 'postgres') then raise exception 'Server attestation only' using errcode = '42501'; end if;`) en défense en profondeur au-delà du `REVOKE EXECUTE`.
4. **`private.admin_file_checked(...)` et `private.admin_media_link_allowed(...)`** :
   - Levée explicite de `42501` (`Staff authorization required`) si invoquées hors du domaine staff autorisé.
5. **Fonctions triggers `SECURITY DEFINER`** (`public.handle_new_user`, `public.protect_profile_privileges`, `public.rls_auto_enable`, `private.apec_submission_event`, `private.admin_record_event`, `private.admin_source_withdrawal`) :
   - Révocation explicite de `EXECUTE` pour `public`, `anon`, `authenticated` et `service_role`.

---

## 2. Chantier B — Finalisation et Réconciliation du CA 2024 de Cocody

### 2.1 Vérification de l'original de production (`doc-dff4865a-c6a8-418e-8895-626258e409d0`)

- **Identifiant `public_documents`** : `doc-dff4865a-c6a8-418e-8895-626258e409d0`
- **Collectivité** : Commune de Cocody (`inst-com-cocody`, `COMMUNE`)
- **Exercice** : `2024` (`COMPTE_ADMINISTRATIF`)
- **Fichier Stockage** : `public_documents/ca/2024/inst-com-cocody/1791994418805-COMMUNE_DE_COCODY.pdf`
- **Taille exacte** : `14 072 943` octets
- **Empreinte SHA-256** : `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`
- **Pagination physique** : `44` pages PDF (fascicule 1 = `22` pages `580b42cd...` + fascicule 2 = `22` pages `796921a9...` ; la numérotation imprimée en pied de page va jusqu'à `44/45`, la page `20/45` étant absente de la reliure scannée d'origine).
- **Actes officiels attestés sur la pièce** :
  - Délibération / Arrêté en séance du Conseil Municipal : **8 juillet 2025** (`2025-07-08`)
  - Approbation préfectorale (Préfet d'Abidjan) : **22 juillet 2025** (`2025-07-22`) sous la référence **`n° 002/PA/D.CAB`**

### 2.2 Les 12 indicateurs financiers officiels contrôlés sur pièce

Source primaire : **`TABLEAU DES RESULTATS DU COMPTE ADMINISTRATIF`** — **Page PDF `40`** (Fascicule 2 page `18`, pagination imprimée **`Page 41 / 45`**), recoupé avec les états détaillés des pages PDF `2` (imprimée `2/45`), `30` (`31/45`), `34` (`35/45`), `39` (`40/45`) et `41–43` (`42/45` à `44/45`) :

| # | Champ normalisé | Intitulé officiel dans le CA 2024 | Montant exact (FCFA) | Référence page PDF / imprimée | Contrôle arithmétique |
|---:|---|---|---:|---|---|
| 1 | `operating_planned` | Prévisions définitives de Fonctionnement (Titre I) | **`18 441 235 000`** | PDF p. 2, 30, 40 (`41/45`) | Base Titre I |
| 2 | `operating_revenue_realized` | Recettes recouvrées de Fonctionnement (Prise en charge Titre I) | **`17 646 256 543`** | PDF p. 2, 40 (`41/45`) | Taux recouvrement Titre I : `95,69 %` |
| 3 | `operating_realized` | Dépenses ordonnancées de Fonctionnement (Mandats émis Titre I) | **`15 409 122 753`** | PDF p. 30, 40 (`41/45`) | Taux exécution Titre I : `83,56 %` |
| 4 | `investment_planned` | Prévisions définitives d'Investissement (Titre II) | **`3 900 630 000`** | PDF p. 34, 39, 40 (`41/45`) | Base Titre II |
| 5 | `investment_revenue_realized` | Recettes recouvrées d'Investissement (Prise en charge Titre II) | **`1 366 100 690`** | PDF p. 34, 40 (`41/45`) | Taux recouvrement Titre II : `35,02 %` |
| 6 | `investment_realized` | Dépenses ordonnancées d'Investissement (Mandats émis Titre II) | **`1 366 100 690`** | PDF p. 39, 40, 41–43 (`41–44/45`) | Taux exécution Titre II : `35,02 %` |
| 7 | `total_planned` | **Total Prévisions Définitives (Titre I + Titre II)** | **`22 341 865 000`** | PDF p. 40 (`41/45`) | `18 441 235 000 + 3 900 630 000 = 22 341 865 000` (écart `0`) |
| 8 | `total_revenue_collected` | **Total Recettes Recouvrées (Titre I + Titre II)** | **`19 012 357 233`** | PDF p. 40 (`41/45`) | `17 646 256 543 + 1 366 100 690 = 19 012 357 233` (écart `0`) |
| 9 | `total_realized` | **Total Dépenses Ordonnancées (Titre I + Titre II)** | **`16 775 223 443`** | PDF p. 40 (`41/45`) | `15 409 122 753 + 1 366 100 690 = 16 775 223 443` (écart `0`) |
| 10 | `surplus_or_deficit` | **Résultat de l'exercice 2024 (Excédent Titre I : `2 237 133 790` + Solde Titre II : `0`)** | **`2 237 133 790`** | PDF p. 40 (`41/45`) | `19 012 357 233 − 16 775 223 443 = 2 237 133 790` (écart `0`) |
| 11 | `previous_result_reported` | **Résultat de l'exercice précédent reporté (Section Fonctionnement)** | **`944`** | PDF p. 2, 40 (`41/45`) | Compte `820` (`944 FCFA` recouvrés sur `1 000 FCFA` prévus) |
| 12 | `cumulative_result` | **Résultat de clôture cumulé (Excédent 2024 + Report antérieur)** | **`2 237 134 734`** | PDF p. 40 (`41/45`) | `2 237 133 790 + 944 = 2 237 134 734` (écart `0`) |

**Concordance patrimoniale certifiée (Pages PDF `41–43` / imprimées `42/45` à `44/45`)** :
- Patrimoine immobilier (`810 959 095 FCFA`) + Patrimoine incorporel (`20 000 000 FCFA`) + Patrimoine mobilier (`535 141 595 FCFA`) = **`1 366 100 690 FCFA`**, strictement égal aux dépenses d'investissement ordonnancées (`investment_realized`) de la page PDF `40`.

### 2.3 Alignement de bout en bout du Pipeline d'Import et d'Hydratation

1. **`toPipelineImportRow(envelope)` (`src/utils/budgetDocumentDryRun.ts` & `src/components/admin/DataImportConsole.tsx`)** :
   - Convertit l'enveloppe issue de l'Assistant Documentaire Guidé (`StandardImportEnvelope`) au contrat SQL strict de `private.validate_import_row` / `public.import_data_batch` (`source` restreint à `name`, `reference`, `date`, `date_kind`, et `url` HTTP(S) optionnelle ; `data` restreint à la liste blanche des colonnes financières `CA`/`BP` + `source_page`, `approval_date`, `prefecture_visa_date`, `notes`, `verification_status`), tout en consignant de manière structurée et sans perte dans `data.notes` les métadonnées comptables attestées (`Stade comptable : ORDONNANCE.`, `Report antérieur : 944 FCFA.`, `Résultat cumulé : 2237134734 FCFA.`) ainsi que les 6 champs monétaires obligatoires exigés par `public.review_data_import('PUBLISH')`.
2. **`hydrateAdministrativeAccountFromRow(row)` (`src/utils/budgetDocumentDryRun.ts`, `src/services/administrativeAccountsService.ts`, `src/data/administrativeAccountsData.ts`)** :
   - Normalise les montants `bigint` PostgreSQL (y compris dans `operations` et `procurement_match.award_amount`), recalcule `total_revenue_collected` uniquement lorsque les deux composantes sont numériques et non `UNKNOWN` en propageant leur précision combinée, et réhydrate fidèlement depuis `notes` les champs `accounting_stage`, `previous_result_reported` et `cumulative_result` avec leur qualification de précision dans `import_provenance.precision`.
   - Préserve `accounting_stage = undefined` lorsqu'un enregistrement porte `verification_status = 'SOURCE_ANOMALY'` sans stade explicite attesté, maintenant l'affichage *« Stade comptable à confirmer sur pièce »* pour Tiassalé 2024.
3. **Rubrique 4 & États pré-publication de `AdministrativeAccountView.tsx`** :
   - Lorsque le Compte Administratif global est publié mais que les opérations détaillées d'investissement ne sont pas encore rattachées (`operations.length === 0`), la Rubrique 4 affiche un badge explicite **`Non documenté`** et indique que la ventilation par opération/projet d'investissement n'est pas encore rattachée, sans jamais afficher un tableau vide trompeur ni confondre absence de détail et absence d'investissement.
   - Rapprochement documentaire strict par `institution_id` (ou égalité exacte normalisée et type institutionnel compatible sans `.includes()`), et distinction stricte `VERIFIED !== PUBLISHED` (seuls les documents `status === 'PUBLISHED'` exposent le bouton public de consultation PDF).

### 2.4 Lot JSON exact du CA 2024 de Cocody prêt pour import et publication (soumis à approbation propriétaire)

Conformément aux règles non négociables (`REMOTE_SUPABASE_WRITES = 0`), **aucune écriture n'a été exécutée sur `cdesuvcozcetdtvibgqs`**. Le lot ci-dessous respecte strictement la liste blanche SQL de `private.validate_import_row` et est validé à 100 % sous PGlite (`import_data_batch` -> `review_data_import('VERIFY')` -> `review_data_import('PUBLISH', true)`) :

```json
[
  {
    "kind": "CA",
    "institution_id": "inst-com-cocody",
    "institution_type": "COMMUNE",
    "fiscal_year": 2024,
    "source": {
      "name": "Mairie de la Commune de Cocody - Compte Administratif de l'Exercice 2024",
      "reference": "CA-2024-COCODY / Approbation Préfectorale n° 002/PA/D.CAB du 22/07/2025",
      "date": "2025-07-22",
      "date_kind": "PUBLISHED"
    },
    "data": {
      "operating_planned": 18441235000,
      "operating_revenue_realized": 17646256543,
      "operating_realized": 15409122753,
      "investment_planned": 3900630000,
      "investment_revenue_realized": 1366100690,
      "investment_realized": 1366100690,
      "total_planned": 22341865000,
      "total_revenue_collected": 19012357233,
      "total_realized": 16775223443,
      "surplus_or_deficit": 2237133790,
      "source_page": 40,
      "approval_date": "2025-07-08",
      "prefecture_visa_date": "2025-07-22",
      "verification_status": "OFFICIAL_DOCUMENT",
      "notes": "Tableau des résultats du Compte Administratif 2024 (page PDF 40 / imprimée 41/45). Stade comptable : ORDONNANCE. Report antérieur : 944 FCFA. Résultat cumulé : 2237134734 FCFA."
    },
    "precision": {
      "operating_planned": "EXACT",
      "operating_realized": "EXACT",
      "operating_revenue_realized": "EXACT",
      "investment_planned": "EXACT",
      "investment_realized": "EXACT",
      "investment_revenue_realized": "EXACT",
      "total_planned": "EXACT",
      "total_realized": "EXACT",
      "total_revenue_collected": "EXACT",
      "surplus_or_deficit": "EXACT"
    }
  }
]
```

---

## 3. Résultats des Tests et Recette Multi-Viewports

- **Compilation TypeScript (`npx tsc --noEmit`)** : **PASS** (`0` erreur)
- **Build Production (`npm run build`)** : **PASS** (`code 0`)
- **Suite Vitest complète (`npx vitest run`)** : **PASS** (`66/66` fichiers de tests, `911/911` tests réussis, `0` échec)
- **Recette Navigateur Chromium (`scripts/verify-admin-persistence-browser.cjs`)** : **PASS** (`16/16` scénarios E2E incluant authentification par rôle, RLS/RPC PGlite réels, téléversement multipart PDF, attestation binaire `admin-media-url`, vérification humaine, publication, et viewports `360px`, `640px`, `768px`, `1024px`, `1440px`, `0` erreur console/API, `0` fuite externe).

---

## 4. Statuts de Livraison Explicites

| Jalon | Statut | Justification |
|---|---|---|
| **Prêt pour revue indépendante (`READY_FOR_INDEPENDENT_REVIEW`)** | **OUI** | Code, migration `20261026213000_security_definer_hardening.sql`, tests PGlite/Vitest (`911/911`), recette navigateur (`16/16`) et lot Cocody 2024 vérifiés et poussés sur la PR #65. |
| **Prêt pour fusion (`READY_FOR_MERGE`)** | **OUI (après approbation propriétaire)** | CI GitHub Actions `Quality` et déploiement Vercel Preview au vert (`SUCCESS`), aucun conflit avec `master`. |
| **Prêt pour migration backend (`READY_FOR_BACKEND_MIGRATION`)** | **OUI (sur action propriétaire)** | `supabase/migrations/20261026213000_security_definer_hardening.sql` est idempotente, purement sécuritaire (`CREATE OR REPLACE FUNCTION` + `REVOKE ALL`), sans modification destructive de table ni de données. |
| **Prêt pour publication production Cocody 2024 (`READY_FOR_PRODUCTION_PUBLICATION`)** | **EN ATTENTE D'AUTORISATION PROPRIÉTAIRE** | Lot JSON certifié prêt à être soumis dans `import_data_batch` -> `review_data_import('VERIFY')` -> `review_data_import('PUBLISH', true)` par un opérateur `ADMIN` / `DATA_MANAGER`. |
