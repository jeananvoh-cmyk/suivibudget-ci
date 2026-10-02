# AGENT HANDOFF — SuiviBudget Côte d’Ivoire

## METADATA
- LAST_UPDATED : 2026-10-02
- LAST_AGENT : Antigravity
- CURRENT_BRANCH : `antigravity/budget-cycle-document-console`
- HANDOFF_BASE_SHA : `46c4f1753a1c6d5aa564a70f082f859141d58fd0` (HEAD de PR #13 `antigravity/tiassale-ca-2024-reconciliation`)
- CURRENT_HEAD : `4100118` docs(handoff): document generic budget cycle industrialization and dry-run pipeline ; 216 tests PASS (15 suites), build PASS.
- PR : Dédiée sur `antigravity/budget-cycle-document-console` vers `master` (dépendance explicite sur PR #13, NON FUSIONNÉE, soumise au contrôle de l'orchestrateur).
- SUPABASE_PROJECT : `cdesuvcozcetdtvibgqs`, eu-west-1
- CURRENT_MILESTONE : Industrialisation du Cycle Budgétaire Complet & Console d'Import Documentaire Guidée (Moteur de consolidation BP → Modifications/BS/BM → Crédits Définitifs Dérivés → CA Exécution ; Assistant documentaire avec validation humaine explicite VALIDER/CORRIGER/INCONNU/REJETER ; Pre-flight dry-run strict ; Double taux d'exécution civique ; Non-régression totale Bingerville, Cocody, Tiassalé).
- FOUNDATION_READY : TRUE.

## INDUSTRIALISATION DU CYCLE BUDGÉTAIRE & CONSOLE DOCUMENTAIRE
- **MOTEUR DE CONSOLIDATION DU CYCLE BUDGÉTAIRE (`budgetCycleEngine.ts`)** :
  - **Architecture Unifiée du Cycle** : BP Initial (`PRIMITIF_ADOPTE`, `PRIMITIF_APRES_TUTELLE`) → Actes Modificatifs (`BUDGET_SUPPLEMENTAIRE`, `DECISION_MODIFICATIVE`, `VIREMENT_CREDITS`) → Crédits Définitifs (calculés dynamiquement avec formule traçable) → CA Clôturé (`COMPTE_ADMINISTRATIF`).
  - **Traçabilité & Provenance par Défaut** :
    - Chaque valeur porte son origine (`OFFICIAL_DOCUMENT`, `DERIVED_VALUE`, `AMENDMENT_SUM`, `CITIZEN_OBSERVATION`, `UNKNOWN_NOT_FOUND`).
    - Aucune valeur dérivée n'est présentée comme une donnée brute de source : toute valeur dérivée expose sa formule arithmétique exacte (ex: `618 000 000 FCFA (BP Initial) + 120 000 000 FCFA (Modifications nettes) = 738 000 000 FCFA`).
    - Respect absolu de la règle : `NULL != 0` et `0 FCFA réel` (aucune fabrication de montants).
  - **Double Taux d'Exécution Civique** :
    - Calcul et présentation systématique de deux indicateurs clairs :
      1. Taux d'exécution sur crédits définitifs (respect de l'autorisation budgétaire finale).
      2. Taux d'exécution sur budget primitif initial (mesure de la trajectoire par rapport aux orientations de début d'exercice).
  - **Mentions Pédagogiques Républicaines** :
    - En l'absence de modifications documentées, affichage explicite : « *Aucune décision modificative ou budget supplémentaire n'a été documenté publiquement pour cet exercice. Conformément à nos principes civiques, l'absence de document public ne constitue pas la preuve de son inexistence juridique.* »
- **CONSOLE D'IMPORT DOCUMENTAIRE GUIDÉE (`DataImportConsole.tsx` & `budgetDocumentDryRun.ts`)** :
  - **Assistant de Saisie Structurée** :
    - Sélection parmi les 232 collectivités réelles (201 communes + 31 conseils régionaux).
    - Métadonnées documentaires rigoureuses : type d'acte, nom du document, référence, date, nature de date, page, URL sécurisée, notes.
    - Grille de valeurs financières avec statut de validation humaine : `TO_VALIDATE` → `VALIDATED` (vert), `CORRECTED` (ambre), `UNKNOWN` (ardoise, valeur `null` préservée), `REJECTED` (rouge).
  - **Pre-flight Dry-Run Déterministe** :
    - Validation institutionnelle et détection des collectivités inconnues.
    - Contrôle de cohérence de l'exercice budgétaire (2000-2100).
    - Vérification obligatoire de la traçabilité documentaire (nom, référence, page obligatoires).
    - Détection des conflits avec des versions déjà publiées (`PUBLISHED`).
    - Contrôles arithmétiques stricts : cohérence Total vs Fonctionnement + Investissement, détection des incohérences ou maintien d'`UNKNOWN` si ventilation omise.
    - Transformation en enveloppe standard `data_import_rows` prête pour la simulation et l'ingestion dans le pipeline sans altération du schéma.
- **RESTITUTION CITOYENNE DANS LE COMPTE ADMINISTRATIF (`AdministrativeAccountView.tsx`)** :
  - Bloc supérieur dédié : « *Traçabilité du Cycle Budgétaire — Exercice [Année]* » en 3 étapes claires :
    - A. Budget Primitif Initial
    - B. Modifications Budgétaires (nombre d'actes + montant net ou mention civique d'absence de document)
    - C. Crédits Définitifs (avec badge "Calculé (Dérivé)" et formule explicite)
  - Préservation intégrale et étanche du bandeau civique `SOURCE_ANOMALY` de Tiassalé 2024, des 3 opérations d'investissement et des 3 rapprochements DGMP `STRONG`.
- **ZÉRO IMPACT SUR LA BASE DE DONNÉES DISTANTE** :
  - `NEW_TABLES: NONE`
  - `NEW_COLUMNS: NONE`
  - `NEW_MIGRATIONS: NONE`
  - `SUPABASE_WRITTEN: FALSE`
  - `SUPABASE_PUBLISHED: FALSE`
- **VALIDATION TECHNIQUE & TESTS** :
  - **216/216 tests unitaires et d'intégration PASS** sur 15 suites (`npm test`).
  - **`npm run build` PASS** (zéro erreur TypeScript, sortie Vite propre).
  - Deux nouvelles suites de tests spécialisées :
    - `src/utils/__tests__/budgetCycleEngine.test.ts` (13 tests) : consolidation du cycle, prise en compte des modifications négatives, préservation des valeurs nulles et zéros réels, formules dérivées, double taux d'exécution, préservation de `SOURCE_ANOMALY`, non-régression Bingerville, Cocody et Tiassalé.
    - `src/utils/__tests__/budgetDocumentWorkflow.test.ts` (10 tests) : génération de formulaires d'extraction, pre-flight dry-run (institution invalide, année invalide, provenance manquante, montants négatifs invalides, arithmétique, préservation UNKNOWN=null, conflits de versions publiées), conversion en lot d'import standard.


## TIASSALÉ CA 2024 — RÉCONCILIATION & FIABILISATION DOCUMENTAIRE
- **AUDIT DE PROVENANCE DES SOURCES** :
  - **SOURCE_A (OFFICIELLE / CANONIQUE)** :
    - Document source : `COMMUNE DE TIASSALE — Compte administratif 2024`, page 36.
    - Exercice : 2024 (clos).
    - Fonctionnement : Prévu = **618 000 000 FCFA** (`EXACT`), Réalisé (ordonnancé) = **726 260 304 FCFA** (`EXACT`).
    - Recettes fonctionnement recouvrées : **883 184 725 FCFA** (`EXACT`).
    - Investissement : Prévu = **389 841 000 FCFA** (`EXACT`), Réalisé (ordonnancé) = **332 995 454 FCFA** (`EXACT`).
    - Recettes investissement recouvrées : **333 151 833 FCFA** (`EXACT`).
    - Total Prévu : **1 007 841 000 FCFA** (`EXACT`) (618 000 000 + 389 841 000).
    - Total Réalisé : **1 059 255 758 FCFA** (`EXACT`) (726 260 304 + 332 995 454).
    - Total Recettes recouvrées : **1 216 336 558 FCFA** (`EXACT`) (883 184 725 + 333 151 833).
    - Différence arithmétique globale : **+157 080 800 FCFA** (1 216 336 558 - 1 059 255 758).
    - Statut dans Supabase `administrative_accounts` : `VERIFIED`, `OFFICIAL_DOCUMENT`, `reconciliation_status: SOURCE_ANOMALY`.
    - Fixture : `docs/imports/tiassale-ca-2024.json`.
  - **SOURCE_B (MOCK FABRIQUÉ / ANCIEN RÉFÉRENTIEL)** :
    - Provenance : Entrée `lbud-tiassale-2024-ca` insérée dans `src/data/localBudgetsReferential.ts` lors du commit de scaffolding `de0916b`.
    - Montants : Total = 1 120 000 000 FCFA, Fonctionnement = 470 400 000 FCFA (42%), Investissement = 649 600 000 FCFA (58%).
    - Sources rattachées : `sources: []` (aucune pièce officielle, aucune délibération, aucune URL, aucune page).
    - Diagnostic : Fabrication purement arithmétique non sourcée, placée à tort dans le référentiel des budgets primitifs avec `budget_type: 'COMPTE_ADMINISTRATIF'`.
    - Résolution : **SUPPRIMÉ DÉFINITIVEMENT** de `src/data/localBudgetsReferential.ts`.
- **ANALYSE DE SOURCE_ANOMALY & DÉCISION DE MAINTIEN JUSTIFIÉ** :
  - Cause exacte du statut : Le taux d'exécution des dépenses de fonctionnement est de `726 260 304 / 618 000 000 = 117,52 %` (> 100 %).
  - Analyse comptable municipale : Les dépenses de fonctionnement ordonnancées (726,26M) ont dépassé les crédits primitifs votés (618M) de +108,26M FCFA. Ce dépassement a été couvert financièrement par une surperformance des recettes de fonctionnement recouvrées (883,18M FCFA, soit 142,91 % de recouvrement, +265,18M FCFA d'excédent de recettes).
  - Décision de gouvernance : Le statut `reconciliation_status = 'SOURCE_ANOMALY'` est **strictement maintenu** tant qu'une décision modificative ou délibération complémentaire formelle de la tutelle n'est pas réceptionnée et jointe au dossier. Il ne s'agit pas d'une accusation mais d'une exigence de rigueur probatoire (Principe 2 & 9).
  - Statut CA proposé : **VERIFIED** / **SOURCE_ANOMALY** (pas de passage en PUBLISHED sans ordre formel de l'orchestrateur).
- **SÉPARATION ÉTANCHE : FINANCIER ≠ PHYSIQUE & 0 FCFA ≠ ABANDON** :
  - **Priorité n°6** : Construction de 20 magasins au marché de Tiassalé. Prévu: 28 000 000 FCFA, Réalisé: 27 850 646 FCFA (page 36). Rapprochement DGMP: AOO24062605757, SOCIETE DEM, 27 730 380 FCFA (`STRONG`).
  - **Priorité n°14** : Construction de 3 classes EPP François KADJO. Prévu: 15 000 000 FCFA, Réalisé: 12 413 014 FCFA (page 36). Rapprochement DGMP: AOO24062805823, AGBEVA, 12 413 014 FCFA (`STRONG`).
  - **REPORT / Gardienkro** : Construction d'un bâtiment de 3 classes, bureau et latrines à Gardienkro. Prévu: 29 000 000 FCFA, Réalisé: **0 FCFA** (page 36). Rapprochement DGMP: AOO24062605747, SOCIETE DEM, 23 725 064 FCFA (`STRONG`).
  - Garde-fous appliqués :
    - Le 0 FCFA exécuté au CA est conservé strictement comme 0 réel (`ZERO_EXECUTED`).
    - 0 FCFA ne signifie pas l'abandon du projet (report d'exercice tracé).
    - L'attribution du marché DGMP ne prouve pas l'achèvement physique des travaux sur le terrain.
    - `physical_status` reste `null` / non inventé dans le Passport citoyen.
- **AMÉLIORATION UX CITOYENNE (`AdministrativeAccountView.tsx`)** :
  - Bandeau d'alerte civique de réconciliation documentaire expliquant le taux de 117,52% et sa couverture par les recettes recouvrées sans présomption d'irrégularité.
  - Cartes de synthèse Fonctionnement, Investissement et Total consolidé articulées autour de 4 indicateurs clairs : « Ce qui était prévu », « Ce qui a été réalisé financièrement », « Écart », « Taux d’exécution ».
  - Chaque opération d'investissement intègre une ventilation financière dédiée, le bloc de contrôle DGMP, et un bloc pédagogique d'imputabilité séparant distinctement :
    - « Ce que les documents prouvent »
    - « Ce qu’ils ne permettent pas encore d’affirmer »
  - Bandeau républicain non négociable : *Réalisé financier ≠ Réalisation physique*.
- **NON-RÉGRESSION ABSOLUE** :
  - **Bingerville BP 2026** : Total 4 046 222 000 FCFA, Fonctionnement 1 877 888 000 FCFA, Investissement 2 168 334 000 FCFA, 100% intact.
  - **Cocody BP 2026** : Total 19 764 660 000 FCFA, ventilation `null` préservée, 100% intact.
- **VALIDATION TECHNIQUE** :
  - **193/193 tests unitaires et d'intégration PASS** sur 13 suites (`npm test`).
  - **`npm run build` PASS** (1726 modules, zéro erreur TypeScript).
  - Nouvelle suite dédiée `src/utils/__tests__/tiassaleCaReconciliation.test.ts` (12 tests) couvrant :
    - Concordance canonique SOURCE_A vs fixture vs page 36.
    - Maintien justifié de SOURCE_ANOMALY.
    - Acceptation des taux >100% documentairement fondés.
    - Règle `null/unknown != 0` et préservation du zéro réel.
    - Préservation des 3 opérations et des 3 rapprochements DGMP STRONG.
    - Séparation étanche financier != physique pour Gardienkro.
    - Suppression effective du faux mock 1.12B.
    - Non-régression Bingerville et Cocody.


## COCODY BP 2026 — INDUSTRIALISATION DU PIPELINE (BUDGET PARTIEL)
- **DISTINCTION STATUT RÉEL : LOCAL vs DISTANT** :
  - **LOCAL_TEST_VALIDATED** : **TRUE** (Chaîne complète dry-run → staging `TO_VERIFY` → revue `VERIFIED` → publication `PUBLISHED` et restitution citoyenne sans falsification des montants nuls validée sous PostgreSQL PGlite dans `src/utils/__tests__/realPilotChain.test.ts`).
  - **REMOTE_SUPABASE_VALIDATED** : **TRUE** — orchestrateur : dry-run réel puis import/revue/publication exécutés sur `cdesuvcozcetdtvibgqs`.
  - **COCODY_REAL_SUPABASE_IMPORTED** : **TRUE** — 1 ligne de staging canonique, sans doublon.
  - **COCODY_REAL_SUPABASE_PUBLISHED** : **TRUE** — `inst-com-cocody`, 2026, `PUBLISHED`, total 19 764 660 000 FCFA, fonctionnement/investissement `NULL`, `SECONDARY_TO_CORROBORATE`, confiance `MEDIUM`.
  - **BLOCKER TECHNIQUE DISTANT** : **LEVÉ** — l'orchestrateur a utilisé un profil ADMIN actif existant via le workflow RPC protégé ; aucun RLS/GRANT/service_role ajouté.
- **QUALIFICATION DES SOURCES** : **VALIDÉE**
  - Source : Abidjan.net / Le Nouveau Réveil (25 février 2026, 1ère session ordinaire du conseil municipal de Cocody tenue le 24 février 2026).
  - Montant total voté : **19 764 660 000 FCFA** (19,7 milliards FCFA). Précision : `EXACT`.
  - Ventilation fonctionnement / investissement : Unités omises dans le compte-rendu de presse. Rigoureusement qualifiées `null` / `UNKNOWN`. Règle d'or respectée : `UNKNOWN != 0 FCFA` et `ABSENCE DE DONNÉE != 0 FCFA`.
  - Statut de vérification : `SECONDARY_TO_CORROBORATE`, niveau de confiance `MEDIUM`.
- **RÉUTILISABILITÉ DU MOTEUR & ÉVOLUTIONS GÉNÉRIQUES** : **VALIDÉES** (0 règle ad-hoc `if Cocody`)
  - `PrimitiveBudgetInfo` (`src/types/index.ts`) : `investment_voted_fcfa` et `functioning_voted_fcfa` acceptent `number | null`.
  - `dataStore.enrichInstitutionsWithBudgets()` : enrichit dès que `current.total_amount != null`, sans forcer un fallback statique erroné lorsque la ventilation est en cours de corroboration.
  - `InstitutionDetailModal` : calcul conditionnel `hasBreakdown`. En l'absence de ventilation exacte vérifiée :
    - Affiche "Part non calculée" et "Montant à confirmer" via `formatQualifiedFCFA`.
    - Masque la jauge bicolore (évite d'afficher un faux 0% / 100%).
    - Affiche un encadré informatif citoyen neutre et sourcé.
  - `getBudgetLinesForEntity` (`budgetLinesData.ts`) et `InstitutionDetailModal` : retour défensif `[]` garantissant qu'aucune absence de lignes budgétaires nationales ne génère d'erreur runtime.
- **RÉFÉRENTIELS ET FIXTURES ALIGNÉS** :
  - `docs/imports/cocody-bp-2026.json` : validé conforme aux gates de staging / publication.
  - `src/data/localBudgetsReferential.ts` et `src/data/officialPrimitiveBudgets.ts` : données statiques corrigées pour Cocody (montants nuls, source de presse `SECONDARY_TO_CORROBORATE` / `MEDIUM`, suppression de l'ancien mock non sourcé).
- **NON-RÉGRESSION BINGERVILLE (RÉFÉRENCE D'OR)** : **100% VALIDÉE & INTACTE**
  - Montant Total : **4 046 222 000 FCFA** (`EXACT`).
  - Fonctionnement : **1 877 888 000 FCFA** (`EXACT`, 46.0%).
  - Investissement : **2 168 334 000 FCFA** (`EXACT`, 54.0%).
  - Jauge bicolore et 29 lignes budgétaires intactes.
- **VALIDATION TECHNIQUE** :
  - **181/181 tests unitaires et d'intégration PASS** sur 12 suites (`npm test`).
  - **`npm run build` PASS** (1726 modules, zéro erreur TypeScript).
  - Test d'intégration bout en bout dans `src/utils/__tests__/realPilotChain.test.ts` (test 3) validant la chaîne complète Cocody : dry-run → staging → revue → publication → restitution `dataStore` avec `null` préservés.
- **VALIDATION VISUELLE & RESPONSIVE (Playwright 375, 768, 1440 px)** :
  - Testé sur fiche Cocody (`/institutions/mairies` → Cocody → onglet `BUDGET & FINANCES`).
  - 375 px (Mobile) : `windowWidth: 375`, `bodyScrollWidth: 375`, `hasHorizontalOverflow: false`.
  - 768 px (Tablette) : `windowWidth: 768`, `bodyScrollWidth: 768`, `hasHorizontalOverflow: false`.
  - 1440 px (Desktop) : `windowWidth: 1440`, `bodyScrollWidth: 1440`, `hasHorizontalOverflow: false`.
  - 0 erreur console, 0 avertissement.

## BINGERVILLE BP 2026 — STATUT DE VALIDATION (RÉFÉRENCE D'OR)
- **SUPABASE PUBLISHED** : **VALIDÉ** (1 enregistrement canonique 2026 publié dans `local_budgets`, `data_import_rows` et 3 événements au journal).
- **ACCÈS ANON SUPABASE** : **VALIDÉ** (`has_table_privilege('anon', 'public.local_budgets', 'SELECT') = TRUE`, PostgREST HTTP 200, migration `20261002090824_grant_anon_published_local_budgets` appliquée avec succès sur `cdesuvcozcetdtvibgqs`).
- **RLS SUPABASE** : **VALIDÉ** (policy "Allow public read on published local budgets" `USING (status = 'PUBLISHED')` active ; 0 ligne non-PUBLISHED accessible à anon).
- **SYNCHRONISATION FRONTEND** : **VALIDÉE** (`enrichInstitutionsWithBudgets()` connecte les données distantes Supabase directement à l'institution et écrase le fallback statique).
- **RENDU CITOYEN SUR PREVIEW & BUNDLE PROD** : **VALIDÉ** (vue citoyenne responsive 375/768/1440 sans débordement horizontal).
- **PRODUCTION (`suivibudget.vercel.app`)** : **VALIDÉ** (Production Vercel READY sur `4fb9c7d`, données Supabase 2026 affichées, 0 erreur console, 0 erreur réseau).
- **BINGERVILLE** : **PILOTE TERMINÉ & PRÉSERVÉ INTACT**
- **NE PLUS RÉIMPORTER BINGERVILLE** : Le lot Bingerville est définitivement importé et publié, aucun ré-import requis.

## COMPLETED
### Parcours citoyen réel Bingerville BP 2026 — 2 octobre
- **État Supabase réel vérifié indépendamment** :
  - `local_budgets` : 1 enregistrement canonique publié (`inst-com-bingerville`, 2026, `status = 'PUBLISHED'`).
  - `data_import_rows` : 1 ligne de staging (Bingerville BP 2026).
  - `data_import_events` : 3 événements au journal (`IMPORTED` → `VERIFIED` → `PUBLISHED`).
  - **B. Recette réelle Supabase** : **EFFECTUÉE**.
  - **C. Publication canonique Supabase** : **EFFECTUÉE**.
- **Traçage du flux de bout en bout et ruptures identifiées/corrigées** :
  - Flux : Supabase `local_budgets` → `administrativeAccountsService.fetchPublishedLocalBudgets` → `dataStore.initSupabaseSync` / `enrichInstitutionsWithBudgets` → `dataStore.institutions` / `primitive_budget` → `InstitutionDetailModal` / `MunicipalitiesPage` → Rendu citoyen.
  - **Rupture DDL (Base de données)** : Le rôle `anon` ne disposait pas de `GRANT SELECT ON public.local_budgets TO anon;` (omis lors de `20260929141800_grant_schema_privileges.sql`), causant un HTTP 401 / code `42501 permission denied for table local_budgets` pour les citoyens non connectés malgré la policy RLS `USING (status = 'PUBLISHED')`.
    - Migration additive rédigée : `supabase/migrations/20261002010000_grant_anon_published_local_budgets.sql` (`GRANT SELECT ON public.local_budgets TO anon;`).
    - Test PGlite ajouté dans `src/utils/__tests__/publicationDatabase.test.ts` garantissant que `anon` lit les budgets `PUBLISHED` mais que les budgets non publiés (`VERIFIED`, `TO_VERIFY`, `DRAFT`) restent strictement invisibles.
  - **Rupture Synchronisation Frontend (`dataStore.ts`)** : `initSupabaseSync` mettait à jour `this.localBudgets` mais ne ré-enrichissait pas `this.institutions`. Ajout de la méthode `enrichInstitutionsWithBudgets()` appelée après la récupération des budgets distants et dans `saveLocalBudget`.
  - **Rupture Libellé de Provenance** : Libellé source harmonisé avec la donnée officielle publiée : `"AIP — Budget primitif 2026 de Bingerville"`.
- **Validation visuelle & Responsive (Playwright sur 375, 768, 1440 px)** :
  - Route testée : `/institutions/mairies` → Fiche Bingerville (`InstitutionDetailModal` > onglet `BUDGET & FINANCES` et sous-onglets).
  - Total : **4 046 222 000 FCFA**
  - Fonctionnement : **1 877 888 000 FCFA** (46.0 %)
  - Investissement : **2 168 334 000 FCFA** (54.0 %)
  - Exercice : **2026**
  - Précision : **EXACT** (Montant Délibéré Exact)
  - Source : **AIP — Budget primitif 2026 de Bingerville**
  - Aucun débordement horizontal (`bodyScrollWidth = windowWidth` : 375, 768, 1440 px).
- **Validation technique locale** :
  - **180/180 tests PASS** sur 12 suites de tests (`npm test`).
  - **`npm run build` PASS** (1726 modules, zéro erreur TypeScript).
- Trois fichiers de lots réels documentés et vérifiés créés dans `docs/imports/` :
  1. `docs/imports/bingerville-bp-2026.json` : BP 2026 Bingerville (Total: 4 046 222 000 FCFA EXACT, Fonctionnement: 1 877 888 000 FCFA EXACT, Investissement: 2 168 334 000 FCFA EXACT). Source AIP 2026-01-28 (`AIP_VERIFIED`, `HIGH`). Non conflictuel (0 ligne dans local_budgets).
  2. `docs/imports/cocody-bp-2026.json` : BP 2026 Cocody (Total: 19 764 660 000 FCFA EXACT, Fonctionnement: null UNKNOWN, Investissement: null UNKNOWN). Source Abidjan.net / Le Nouveau Réveil 2026-02-25. Statut rigoureusement classifié en `SECONDARY_TO_CORROBORATE` et `MEDIUM` (source de presse corroborée, jamais transformée en source AIP ou officielle). Démontre la règle fondamentale `UNKNOWN != 0` (restitution citoyenne "Montant à confirmer", zéro exact distinct).
  3. `docs/imports/tiassale-ca-2024.json` : CA 2024 Tiassalé (Total Prévu: 1 007 841 000 FCFA, Total Réalisé: 1 059 255 758 FCFA, tous EXACT). Source CA 2024 page 36.
- Règle de cohérence source / vérification ajoutée dans `src/utils/budgetValidation.ts` (`validateImportProvenanceConsistency` et `validateBudgetRecord`) empêchant toute contradiction entre source de presse et statut officiel/AIP.
- Suite complète d'intégration de bout en bout implémentée dans `src/utils/__tests__/realPilotChain.test.ts` (5 tests réels sous PGlite exécutant le schéma SQL et les migrations réelles du projet) :
  - Validation structurelle, de provenance et anti-contradiction des fichiers JSON.
  - Chaîne complète Bingerville BP 2026 : dry-run (plan_hash et SHA-256 déterministe sans écriture) → staging (TO_VERIFY) → revue humaine (VERIFIED) → rejet de publication sans confirmation explicite (`p_publish_confirmed = false`) → acceptation avec confirmation explicite (`p_publish_confirmed = true`) → publication dans `local_budgets` avec formatage FCFA exact.
  - Chaîne complète Cocody BP 2026 : respect strict des montants nuls (UNKNOWN) non transformés en 0 et statut `SECONDARY_TO_CORROBORATE`.
  - Chaîne complète Tiassalé 2024 : CA 2024 publié → Opération n°6 (Marché 20 magasins) reliée au CA parent → Rapprochement DGMP (AOO24062605757, Société DEM, match STRONG) relié à l'opération → Restitution Project Accountability Passport (taux financier 99.46%, séparation financier != physique).
  - Détection canonique de conflit : le pipeline refuse tout écrasement silencieux d'un enregistrement canonique préexistant avec `CONFLICT: Existing canonical record; no overwrite`.
- Validation technique locale : 179/179 tests PASS sur 12 suites de test, `npm run build` PASS (1726 modules transformés, zéro erreur TypeScript).
- Base Supabase distante `cdesuvcozcetdtvibgqs` préservée intacte : aucune migration réappliquée, aucune ingestion massive non autorisée, aucun compte de test créé en production.

### Console données et précisions — 1er octobre, après #8
- #8 contrôlée brièvement puis fusionnée au SHA attendu ; master synchronisé sans perte à 8e934d1. Post-merge ciblé : 16 tests pipeline PASS.
- Console ADMIN/DATA_MANAGER : JSON/JSONL, simulation obligatoire, rapport ligne par ligne, pagination, source/provenance et historique privés. VERIFY / REJECT / PUBLISH séparés ; confirmation explicite contrôlée aussi en SQL. Aucun service_role client, RLS inchangée.
- BP / CA / opérations / DGMP et Passport : EXACT, Environ, Plus de, Montant à confirmer ; UNKNOWN reste null, zéro exact distinct. Pas de taux/écart calculé sur montants incertains, aucune réalisation physique inférée.
- Migration locale `20261001144423_import_console_qualified_amounts.sql` APPLIED une seule fois sous version distante `20261001150911`. Montants nullables sans suppression de données, provenance par champ conservée. Ne rejouer aucune version APPLIED, notamment 20261001093613 et 20261001044508.
- Validation finale : 174 tests / 11 fichiers, TypeScript + build PASS (1726 modules), six HTTP/RLS PASS. RLS active, RPC refusée à anon/service_role et profil contrôlé pour authenticated. Base préservée : staging/journal/BP=0, CA/opérations/DGMP=3 chacun. Aucun import réel.
- UX/UI VALIDATED sur console, CA/opérations/DGMP, historique BP et Passport : huit largeurs 360/375/390/430/768/1280/1440/1920, aucune erreur JS ni débordement ; captures mobile/desktop inspectées. Parcours privés avec API interceptée localement, refus MODERATOR et confirmation de publication vérifiés.
- Advisors inchangés : six RPC SECURITY DEFINER intentionnelles protégées par profiles/search_path/grants ([règle 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)) ; [protection Auth des mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) toujours désactivée. Bundles de données volumineux préexistants.
- Limite restante : correction des versions immuables/conflictuelles via futur workflow dédié, aucun écrasement silencieux. Les limites CLI/montants incertains du bloc historique ci-dessous sont levées.

### Pipeline données réelles — 1er octobre, après #7
- #7 e5454ca contrôlée très brièvement (mergeable, CI/Vercel SUCCESS), fusionnée avec SHA attendu ; master synchronisé sans perte à 26711d5. Contrôle post-merge ciblé : 27 tests PostgreSQL PASS. Aucun réaudit historique.
- Outil opérateur `npm run import:data` : fichiers JSON/JSONL, dry-run sans écriture, plan lié au SHA-256 du fichier et à l’état serveur, import plafonné à 100 lignes/1 Mo, liste/relecture/publication/rejet. Instructions et contrat : [DATA_IMPORT.md](DATA_IMPORT.md). Aucune collecte automatique.
- Staging privé immutable et journal RLS ; origine/URL ou référence/date qualifiée/exercice/institution/type obligatoires. Montants entiers explicitement qualifiés EXACT/APPROXIMATE/LOWER_BOUND/UNKNOWN, UNKNOWN=null. Aucune conversion de valeur manquante en zéro. Date RECORDED distinguée de la publication/consultation.
- Identités déterministes, doublons identiques ignorés, divergences et données canoniques existantes signalées sans écrasement. Lots et décisions traités ligne par ligne ; isolation des erreurs. Imports concurrents sérialisés par verrou transactionnel, aperçu périmé refusé.
- TO_VERIFY → VERIFIED → PUBLISHED par deux décisions humaines séparées. Promotion vers local_budgets / administrative_accounts / ca_investment_operations / ca_procurement_matches ; les sources et précisions accompagnent les lignes dans import_provenance. Compatibilité institution/exercice et parents publiés contrôlée. Aucun DGMP ambigu publié ; STRONG et preuve de rapprochement explicitement relue requis.
- Lecture des BP PUBLISHED depuis Supabase reliée à l’historique existant, sans modification manuelle du code pour ajouter des budgets. Lecture CA/opérations/DGMP déjà dynamique préservée. Aucun changement de disposition UI ; validations UX historiques conservées, aucune nouvelle revendication d’audit visuel global.
- 166 tests / 11 fichiers PASS, dont 16 nouveaux tests pipeline PostgreSQL/intégration et 27 tests RLS existants ; TypeScript + build PASS (1724 modules). Parseur CLI JSON/JSONL contrôlé. Six contrôles HTTP/RLS réels PASS, RLS active, droits directs/service_role refusés, tables d’import/journal vides. Base inchangée : 0 BP, 3 CA, 3 opérations, 3 marchés.
- Petites fixtures exclusivement locales : Abobo, Bingerville, Tiassalé et Cocody déjà présents dans le dépôt. La ventilation Cocody incertaine reste UNKNOWN ; aucune donnée ni compte de test créé en production, aucune ingestion réelle ou massive.
- Limites explicites : outil opérateur CLI, pas de nouvelle console graphique ; corrections de versions immuables/conflictuelles à traiter dans un futur workflow dédié. CA/opérations/DGMP aux montants non exacts restent privés tant que leurs écrans ne restituent pas cette qualification ; BP à précision connue homogène publiable. Champs obligatoires manquants bloquent la publication. Aucun contournement des tables existantes.
- Migration locale 20261001091748 APPLIED une seule fois sous version distante 20261001093613. Ne jamais la rejouer. Les deux RPC métier utilisent une élévation limitée, profils protégés contrôlés avant accès, search_path vide et liste fermée de tables pour la promotion SQL paramétrée.

### APEC produit citoyen — 1er octobre, après fusion #6
- Master synchronisé sans perte de travail ; contrôle unique après fusion : 145 tests et TypeScript/build PASS. Aucun réaudit ni rejeu de migration APPLIED.
- Onglet Participation APEC sur les fiches MAIRIE/REGION, indépendant des projets, avec filtre d’exercice. Accès Passport conservé avec le même composant. Besoin, dépôt, contributions, suivi et décisions privées préservés.
- Projection additive apec_public_needs : dix champs publics seulement, aucun auteur/contact privé. Vérification préalable du besoin et publication explicite ADMIN/DATA_MANAGER ; formulaire de résumé distinct, champs vierges et confirmation obligatoire de relecture anonymisante. Aucun texte original recopié automatiquement. L’identification de données personnelles dans le texte libre reste une responsabilité humaine.
- RLS publique limitée à PUBLISHED, retrait explicite et versions des résumés conservées dans l’historique privé immuable. Aucune mutation directe accordée aux clients ni à service_role. Provenance toujours CITIZEN_OBSERVATION ; participation non représentative, besoin distinct de la programmation budgétaire.
- 150 tests / 10 fichiers PASS, dont 27 PostgreSQL : refus de publication citoyenne/non vérifiée/sans relecture, projection exacte sans identité/contact des originaux, retrait, historique et rejet des liens d’un autre exercice. TypeScript + build PASS, 1724 modules.
- Quatre contrôles HTTP réels ciblés PASS : lecture publique, refus DELETE et RPC publication/retrait anonymes. Mode : node scripts/verify-foundation-http.mjs apec-public. RLS/grants distants contrôlés ; zéro ligne publique, besoins privés vides, trois CA préservés. Aucun compte ni donnée de test créé en production.
- UX/UI VALIDATED : communes et régions sans projet sur 360/375/390/430/768/1280/1440/1920, zéro débordement/erreur JS, captures 375/1440 inspectées. Onglets mobiles en grille. Passport, connexion/dépôt et publication/retrait testés par API interceptée localement ; état public vide lu sur Supabase réel.
- Migration locale 20261001043805 appliquée une seule fois sous version distante 20261001044508. Ne jamais la rejouer. BP, CA, DGMP, Passport, preuves et sources privées existants préservés ; aucune ingestion massive.

Les sections de consolidation suivantes décrivent les validations historiques, sans remplacer ce bloc courant.

### Consolidation et APEC Phase 2C — 1er octobre
- Chaîne Git linéaire #3 → #4 → #5 et CI exactes vérifiées sans refaire les audits. Fusions : `1ebd9ab` (#3), `abc884a` (#4), `4aed61d` (#5). Arbre final identique au HEAD validé de #5. Quality / verify SUCCESS sur master consolidé : run 36786596459.
- Quatre tables additives : apec_cycles, apec_needs, apec_contributions, apec_events. Aucun changement des tables BP/CA/Passport/DGMP/preuves. Aucune ancienne migration rejouée et aucune ingestion.
- Besoin → vérification → priorité documentée → projet canonique budget_projects / budget local PUBLISHED de même institution et exercice → contributions → suivi/réponse. Un rang n’est ni un vote représentatif ni une décision de financement. La source citoyenne reste CITIZEN_OBSERVATION même après vérification.
- Source, date, auteur serveur, vérification et rattachement conservés ; événements immuables et ordonnés, identifiants de dépôt et état des rattachements dans l’historique. Refus des transitions invalides, usurpations, auto-validation, liens vers autre institution/exercice et budgets non publiés.
- RLS : cycles lisibles ; besoins privés auteur / ADMIN / DATA_MANAGER ; contributions privées auteur / gestionnaires ; événements visibles à l’auteur du besoin et aux gestionnaires. Aucune lecture privée anonyme, aucun droit service_role, aucun UPDATE/DELETE direct des besoins/contributions/événements. Modérateur sans pouvoir APEC de gestion.
- Panneau APEC dans le Passport : cycles documentés, dépôt, suivi, sources et décisions. Connexion/inscription citoyenne par Supabase Auth et déconnexion, sans utiliser l’accès back-office qui refuse les citoyens. Les formulaires n’accordent jamais un rôle.
- 145 tests / 10 fichiers PASS, dont 22 tests PostgreSQL et 9 nouveaux tests APEC écrits avant l’implémentation. TypeScript + build PASS (1724 modules), git diff --check PASS sur ce bloc.
- CI exacte de `51bf265` : [Quality / verify SUCCESS](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/36815164988/job/110218535405), Vercel Preview Comments SUCCESS. Le descendant documentaire sera poussé et contrôlé, sans nouveau commit pour réinscrire son hash.
- 10/10 contrôles HTTP réels APEC PASS : cycles lisibles, tables privées et RPC interdites à ANON, DELETE refusé sur les quatre tables. Mode reproductible : node scripts/verify-foundation-http.mjs apec.
- UX/UI ApecParticipation VALIDATED sur 360/375/390/430/768/1280/1440/1920 : zéro débordement, captures 375/1440 inspectées ; parcours staff et connexion/dépôt citoyen vérifiés avec réponses réseau interceptées localement. État public vide vérifié contre Supabase réel. Aucun compte ou objet de test créé en production.
- Contrôle distant final : RLS active sur quatre tables, zéro ligne APEC, un compte Auth et trois CA préservés. Migration locale 20260930223840 appliquée une seule fois sous version distante 20261001040746.
- Limite assumée de ce bloc : besoins/contributions privés, sans publication publique automatique ni agrégat de représentativité ; entrée actuelle par le Passport d’un projet. L’inscription peut demander une confirmation e-mail selon la configuration Auth ; aucun e-mail envoyé pendant les tests.
- Advisors : protection des mots de passe compromis toujours désactivée. Deux WARN SECURITY DEFINER pour record_apec_decision et apec_link_targets : élévation intentionnelle, autorisation ADMIN/DATA_MANAGER vérifiée avant lecture/écriture, search_path vide, SQL statique et paramètres bornés par contraintes. Elle évite d’accorder les mutations directes et l’accès intégral aux projets. Refus citoyen/anonyme testé. Voir [règle 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Les blocs suivants sont historiques ; leurs anciennes interdictions de fusion et leurs anciens statuts de PR ne décrivent plus l’état courant ci-dessus.

### Bloc DGMP Phase 2B — 30 septembre, après Phase 2A
- Branche `codex/dgmp-phase-2b-deterministic` créée depuis le HEAD réel de PR #4 `2657acbf63154730835c80d07edb0d94d337c61c`. PR #5 ouverte sur la branche Phase 2A ; aucune fusion.
- `findCandidate` n’arrête plus la recherche au premier candidat plausible : tous les candidats compatibles sont évalués, classés avec un score déterministe puis départagés par une clé stable indépendante de l’ordre d’entrée.
- Une égalité de niveau de confiance et de score entre opérations distinctes est explicitement déclassée en `TO_VERIFY` avec `ambiguous_candidates` ; aucune ambiguïté n’est publiée comme correspondance certaine.
- Les niveaux `STRONG / PROBABLE / WEAK / NONE / TO_VERIFY`, les conflits institution/exercice/localisation, les champs manquants et les justifications temporelles sont conservés.
- Tests ajoutés avant clôture : candidats plausibles intervertis, opérations homonymes équivalentes, bonne collectivité/mauvais exercice, montant proche avec objet/localisation incompatibles, et stabilité des trois rapprochements Tiassalé dans les deux ordres.
- Les trois pilotes CA n’ont pas été modifiés ; aucune ingestion DGMP massive ; aucune migration Supabase ajoutée ou rejouée.
- CI Quality run 36785358174 SUCCESS sur le commit fonctionnel `a7e71b5d91168bb9a63a2e54e17a6618a738f921` : 10 fichiers de tests, 136/136 tests PASS, TypeScript + Vite build PASS, 1722 modules. L’avertissement préexistant sur la taille des bundles demeure.
- Prochain bloc fonctionnel : APEC Phase 2C. Ne pas étendre le rapprochement DGMP à une ingestion massive avant définition d’un pipeline de provenance et de validation.

### Bloc Phase 2A — 30 septembre, après 9457f07
- Vingt champs factuels explicites : institution, exercice, objet, localisation, trois montants distincts, référence marché, attributaire, document/page/libellé source, états financier/physique, preuve, réponse, confiance, méthode et vérification. Valeurs absentes UNKNOWN/NOT_FOUND_PUBLICLY ; aucun exercice par défaut inventé.
- Rapprochement : champs concordants, contradictoires et absents ; conflit d’identifiant institutionnel ou de localisation déclassé TO_VERIFY ; mention « phase » dans le projet insuffisante pour établir une pluriannualité.
- Trois marchés Tiassalé préservés ; Abobo/Bingerville ne produisent pas de liaison d’opération à partir de leurs seules synthèses. Gardienkro conserve 0 FCFA et « cause non établie ». Aucun CA VERIFIED publié implicitement.
- UI Comprendre / Explorer / Vérifier, cartes mobiles, lien source externe et accès au document par Edge lorsque son identifiant existe. Réponse institutionnelle distincte de la validation indépendante ; preuves d’autres projets et démonstrations exclues.
- Deux corrections SQL ciblées : retrait des droits techniques service_role et lecture citoyenne des budgets limitée à PUBLISHED. Matrice complète dans CA_SECURITY_STATUS_20260929.md.
- 131/131 tests, dont 18 Passport et 13 PGlite ; 23/23 contrôles HTTP publics ; 16/16 scénarios navigateur sur 360/375/390/430/768/1280/1440/1920. Aucun débordement ni erreur JS. Inspection visuelle des captures 375 et 1440.
- Build final TypeScript/Vite PASS (1722 modules), git diff --check PASS. Le seul avertissement build reste la taille des bundles de données existants.
- Commits poussés : `1771f67` moindre privilège et `ecfb1f7` Passport. CI du HEAD fonctionnel exact SUCCESS : [Quality / verify](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/36781974758/job/110114182806), Vercel Preview Comments SUCCESS. La CI du descendant documentaire sera contrôlée après push sans autre commit pour réinscrire son hash.
- Le navigateur utilise le composant réel dans un aperçu local scratch avec les sources pilotes de tests, puis un état public vide. Ce contrôle ne prétend pas publier ces sources ni revalider toutes les pages.

### Fondation — validations antérieures conservées
- 197 contrôles HTTP réels réussis avec ANON, ADMIN, DATA_MANAGER, MODERATOR, CITIZEN propriétaire et second CITIZEN ; 2 contrôles supplémentaires des relations CA/opérations/marchés réussis.
- Sources documentaires : upload ADMIN/DATA_MANAGER, refus autres rôles, doublon et overwrite refusés, suppression staging permise, suppression source référencée refusée.
- Cycle TO_VERIFY → VERIFIED → PUBLISHED réel, publication directe refusée, created_by/verified_by/verified_at/published_at serveur contrôlés. Tests SQL existants couvrent immutabilité, checksum et versionnement.
- Documents non publiés et preuves PENDING/REJECTED : aucune URL délivrée, même au staff par le point d’accès public. APPROVED/PUBLISHED : signatures de 300 secondes fonctionnelles puis effectivement expirées.
- Upload citoyen et anonyme réel, MIME interdit et fichier >25 MiB refusés, accès direct public aux deux buckets refusé.
- Matrice PostgREST : visibilité des CA et enfants, documents selon statut/rôle, preuve privée propriétaire/staff, refus usurpation et modération hors ADMIN/MODERATOR, projection publique sans données privées, journal CAIDP INSERT sans lecture publique ni mutation.
- Médias affichés via Edge pour APPROVED ; médias privés signés seulement si la RLS Storage l’autorise. Seconde photo prise en charge, renouvellement toutes les quatre minutes quand la page est visible ; pas de chemin privé utilisé comme URL d’image.
- CA publics chargés par PostgREST avec filtre PUBLISHED et relations réelles. Les trois CA VERIFIED ont été retirés du bundle applicatif et conservés uniquement comme fixtures de tests. Vérification du bundle : aucun identifiant des trois pilotes ni de leurs marchés embarqué.
- Page Documents filtrée PUBLISHED également lors des notifications du cache ; cache documentaire effacé à la déconnexion.
- 121 tests / 10 fichiers PASS ; build TypeScript + Vite PASS (1722 modules).
- Fixtures SQL, Auth, profils, objets Storage, journaux CAIDP et fichier local de mots de passe temporaires supprimés.
- Dépendance de développement xlsx inutilisée supprimée après alerte GitHub ; npm audit : zéro vulnérabilité. Le signal sur master peut rester ouvert tant que PR #3 n’est pas mergée.

## MIGRATIONS_REMOTE / REMOTE_SCHEMA_STATE
| Fichier local | Version distante | État |
| --- | --- | --- |
| 20260929121408_document_metadata_versions.sql | 20260930030522 | APPLIED |
| 20260929121225_publication_boundaries.sql | 20260930030614 | APPLIED |
| 20260929141800_grant_schema_privileges.sql | 20260930030702 | APPLIED |
| 20260930030840_public_proof_projection_boundary.sql | 20260930031058 | APPLIED |
| 20260930033244_foundation_http_access.sql | 20260930144753 | APPLIED |
| 20260930153716_least_privilege_passport_boundary.sql | 20260930153938 | APPLIED |
| 20260930223840_apec_participation_cycle.sql | 20261001040746 | APPLIED |
| 20261001043805_apec_moderated_publication.sql | 20261001044508 | APPLIED |
| 20261001091748_controlled_data_import.sql | 20261001093613 | APPLIED |
| 20261001144423_import_console_qualified_amounts.sql | 20261001150911 | APPLIED |
| 20261002010000_grant_anon_published_local_budgets.sql | 20261002090824 | APPLIED |

Les quatre premières migrations n’ont pas été rejouées. Les horodatages distants sont attribués par l’outil ; ne pas rejouer sur la seule différence de préfixe. Schéma metadata, vue publique, triggers, grants et RLS contrôlés.

## RLS_STATE / GRANTS_STATE / POSTGREST_STATE
PASS. Rôles issus de profiles protégés, aucune autorité user_metadata/client. La nouvelle migration accorde seulement SELECT sur public_documents et citizen_proofs à service_role : les fonctions Edge renvoyaient 404 car ces droits SQL manquaient. Aucun droit de mutation documentaire ajouté au service.

Projection publique : vue security_invoker + security_barrier sur fonction privée SQL stable SECURITY DEFINER sans paramètres, search_path vide, projection fixe APPROVED sans identité privée/contact/notes/tracking. Cette élévation limitée est volontaire ; le filtre est dans la fonction, pas seulement dans la vue.

## STORAGE_STATE / EDGE_FUNCTIONS_STATE
- Buckets public_documents et citizen_photos privés. Limites : 50 MiB et 25 MiB.
- Ancienne policy photo rejetait chaque upload car metadata.size n’existe pas encore lors du contrôle INSERT. Taille et MIME imposés par le bucket ; extensions autorisées conservées par RLS.
- public-document-url v3 ACTIVE ; citizen-proof-media-url v2 ACTIVE ; verify_jwt=true conservé.
- Appels publics avec la clé anon dans Authorization fonctionnent sans session citoyenne. Aucun besoin démontré de désactiver verify_jwt.
- OPTIONS, POST, méthode interdite, identifiant invalide/absent, média absent, seconde image, URL réelle et expiration testés.
- Suppression du compteur de téléchargements non fonctionnel dans l’Edge : générer une URL ne prouve pas un téléchargement et l’UPDATE service_role était refusé.
- Une URL déjà émise pendant APPROVED reste valable jusqu’à sa limite de 300 secondes après un retrait. Aucun nouveau lien n’est émis après retrait ; le mécanisme ne promet pas une révocation instantanée.

## PRODUCTION_FIXTURES_AFTER_TESTS
Contrôle SQL final : auth.users=1 ; administrative_accounts=3 ; public_documents=0 ; citizen_proofs=0 ; storage.objects des deux buckets=0 ; profils temporaires=0 ; journaux temporaires=0.
Trois CA pilotes VERIFIED préservés : Abobo, Bingerville, Tiassalé 2024. Aucune donnée métier fabriquée. Aucun changement sur un autre projet Supabase ou Vercel Civic Signal.

## PASSPORT_STATE
PASS pour la fondation : 10 tests de rapprochement, séparation financier/physique, origine citoyenne non inventée, frontière de publication réelle. La requête imbriquée a retrouvé les trois CA, trois opérations et trois marchés sous le compte ADMIN temporaire ; zéro CA publié sous ANON.
Consolidation Phase 2A VALIDATED : vingt champs et trois niveaux de lecture, 18 tests Passport, trois opérations réelles Tiassalé et deux synthèses sans opérations, CI fonctionnelle SUCCESS sur ecfb1f7. Les document_id manquants, localisations non renseignées et numéros de contrat absents restent explicitement inconnus ; l’identifiant d’appel d’offres n’est pas présenté comme numéro de contrat.
DGMP Phase 2B VALIDATED et fusionnée ; aucune ingestion massive. APEC Phase 2C minimal VALIDATED localement, avec suivi privé et historique sourcé ; voir bloc courant ci-dessus pour CI et limites.

## ADVISORS / KNOWN_ANOMALIES
- SECURITY_ADVISORS : WARN Leaked Password Protection Disabled inchangé ; six WARN [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) intentionnels (quatre RPC APEC, deux RPC import). Autorisation profiles ADMIN/DATA_MANAGER avant accès, search_path vide, mutations staging directes interdites et refus testés. Promotion import paramétrée avec liste fermée de quatre tables. Aucun autre signal sécurité.
- PERFORMANCE_ADVISORS : 31 unused indexes INFO et 16 multiple permissive policies WARN au contrôle final après nettoyage (38 index à 14:58 UTC ; les tests ont exercé certains index). Pas de suppression ni consolidation mécanique, aucun gain mesuré ne justifie ce refactoring pour fermer la fondation.
- Bundle volumineux préexistant (données budgétaires notamment) : avertissement build, pas une erreur.
- KNOWN_FAILURES : aucune dans les validations terminées ; CI 454d62c et 3b502b1 SUCCESS.
- BLOCKED : aucun blocage du travail local. Navigateur intégré indisponible (kernel assets) ; repli Playwright/Edge local utilisé.
- MANUAL_ACTION_REQUIRED : activer [Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) dans Authentication sur le seul projet autorisé. Non activée par l’agent ; ce WARN seul ne bloque pas FOUNDATION_READY.
- Remédiations performance : [index inutilisés](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [policies permissives multiples](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).

## TESTS_EXECUTED / TEST_RESULTS / BUILD_STATUS / CI_STATUS
- `node scripts/verify-foundation-http.mjs <configuration-temporaire>` : 197/197 ; mode `ca` : 2/2 ; mode `cleanup` : deux buckets vides.
- Configuration contient des comptes Auth éphémères ; ne jamais la committer. Nettoyer d’abord les lignes SQL strictement identifiées, ensuite Storage, puis les comptes Auth. Le script ne crée ni ne supprime les comptes.
- Journaux locaux non sensibles : scratch/foundation-http-final.jsonl ; credentials supprimés.
- `npm test -- --run` : 121/121 PASS ; `npm run build` : PASS ; `git diff --check` : PASS.
- CI_STATUS : SUCCESS sur 3b502b1223d304b12f904087430882ea8156f324 : [Quality / verify](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/36736286683/job/109958748296) et Vercel Preview Comments. La clôture documentaire est le seul changement ultérieur ; son contrôle GitHub sera vérifié après push sans autre commit de métadonnées.
- Playwright/Edge : Documents, Observatoire, Institutions sur 375/768/1440 PASS, aucun débordement horizontal ni erreur JavaScript ; état documentaire vide conforme à la base. Captures Documents dans scratch/foundation-documents-*.png.

## UX/UI AUDIT STATUS — historique conservé
Les validations suivantes proviennent du bloc antérieur. Le contrôle de ce bloc porte sur les flux de publication ; il ne prétend pas refaire toutes les pages.
| Page / Route | Path / Trigger | Status | Tested Viewports | Key Issues & Remediations | Validation Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HomePage** | `/` (tab: `home`) | VALIDATED | 375, 768, 1440 | Aligned territory card to 232 collectivités (201 communes + 31 régions), verified bottom nav, CTA touch targets, no horizontal overflow | Playwright inspection, Build |
| **InstitutionsPage** | `/institutions` | VALIDATED | 375, 768, 1440 | Horizontal scrollable category pills, official source badges, card layouts | Playwright inspection, Build |
| **ProjectsPage** | `/projets` | VALIDATED | 375, 768, 1440 | Segmented pills, mobile table view prioritizing primary columns, GPS & filter modals | Playwright inspection, Build |
| **ObservatoryPage** | `/observatoire` | VALIDATED | 375, 768, 1440 | Real vs voted cards, citizen proof deposit CTA, status pills | Playwright inspection, Build |
| **DocumentsPage** | `/documents` | VALIDATED | 375, 768, 1440 | Empty state layout, CAIDP request template CTA, search and year dropdowns | Playwright inspection, Build |
| **AdminLoginPage** | `/admin/login` | VALIDATED | 375, 768, 1440 | Fixed /admin/login routing in parseRoute, verified cybersecurity legal banner and responsive inputs | Playwright inspection, Build |
| **AdminDashboardPage** | `/admin` | VALIDATED | 375, 768, 1024, 1440 | Multi-tab admin navigation (CAIDP, CA 232, Documents, Modération, Work Queue) verified across viewports, zero horizontal overflow (scrollWidth = 375px), full responsive layout | Playwright inspection, Build |
| **ProjectDetailModal** | `handleSelectProject` | VALIDATED | 375, 768, 1440 | Modal full-width mobile container, print & close buttons (>=44px), financial vs physical execution breakdown | Playwright inspection, Build |
| **SendProofModal** | `isSendProofOpen` | VALIDATED | 375, 768, 1440 | Mobile container width 351px, zero horizontal overflow, primary action button height 52px (>=44px), status cards and dropzone responsive | Playwright inspection, Build |
| **OfficialDocRequestModal**| `isDocRequestOpen` | VALIDATED | 375, 768, 1440 | Mobile container width 355px, zero horizontal overflow, 3-step document pack selector, applicant form and letter generation verified | Playwright inspection, Build |
| **ExamineCADocumentModal** | Admin CA review | VALIDATED | 375, 768, 1440 | Modal width 343px mobile / 672px desktop, zero horizontal overflow, verification checklist, action buttons refined to min-h-[44px] >= 44px, decoupled TO_VERIFY/VERIFIED/PUBLISHED workflow | Playwright inspection, Build |
| **SingleCAUploadModal** | Admin CA upload | VALIDATED | 375, 768, 1440 | Modal width 343px mobile / 672px desktop, zero horizontal overflow, 8 responsive inputs, buttons refined to min-h-[44px] >= 44px, checksum computation | Playwright inspection, Build |
| **BatchCAImportModal** | Admin batch import | VALIDATED | 375, 768, 1440 | Modal width 343px mobile / 1024px desktop, zero horizontal overflow, drag-and-drop zone, proposal items, buttons refined to min-h-[44px] >= 44px, error handling | Playwright inspection, Build |

## DECISIONS_MADE
- Sur instruction explicite du 30 septembre, #3, #4 et #5 fusionnées sur master. Phase 2C proposée dans une PR distincte, sans fusion automatique.
- L’absence de publication des trois pilotes entraîne un état public sans CA disponible, pas une publication implicite depuis des constantes.
- Aucune liaison besoin/budget/marché n’est créée sans provenance. 0 FCFA ≠ abandon ; dépense ≠ réalisation ; observation citoyenne ≠ source officielle.

## NEXT_EXECUTABLE_TASK / NEXT_3_TASKS
1. Contrôle externe de la PR Cycle Budgétaire & Console Documentaire (`antigravity/budget-cycle-document-console`) par l'orchestrateur (tests 216/216 PASS, build PASS).
2. Revue de l'intégration du cycle complet (BP → Modifications → Crédits Définitifs → CA) et de l'assistant documentaire guidé.
3. Arbitrage sur le déploiement ou l'ingestion d'actes modificatifs réels (budgets supplémentaires ou décisions modificatives) pour les collectivités pilotes.

## COCODY_REMOTE_CLOSEOUT — ORCHESTRATEUR 2026-10-02
- Institution canonique ajoutée à `public.institutions` : `inst-com-cocody`, `Mairie de Cocody`, type applicatif `MAIRIE`, région Abidjan, District Autonome d'Abidjan.
- Dry-run distant : READY=1, errors=0, conflicts=0 ; plan_hash `eb38f544e2c4b8bf11372dcc342c1ca73bb9b0f7f05f3dbf945b68f2e9f9bd9d`.
- Import distant : IMPORTED.
- Revue distante : VERIFIED.
- Publication distante : PUBLISHED.
- `data_import_events` : IMPORTED → VERIFIED → PUBLISHED.
- `local_budgets` : exactement 1 ligne Cocody 2026 canonique.
- Total : 19 764 660 000 FCFA ; fonctionnement : NULL ; investissement : NULL ; précision : EXACT ; vérification : SECONDARY_TO_CORROBORATE ; confiance : MEDIUM.
- Lecture sous rôle `anon` : PASS sur la ligne PUBLISHED.
- Bingerville Golden Reference contrôlée intacte : 4 046 222 000 / 1 877 888 000 / 2 168 334 000 FCFA.
- Aucune migration créée ; aucun RLS/GRANT modifié.
