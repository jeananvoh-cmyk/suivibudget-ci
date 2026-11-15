# 06 — Bloqueurs Restants (Sources Primaires Manquantes vs Opérations de Production Soumises à Autorisation)

**Date de contrôle :** 15 novembre 2026  
**Branche de remédiation :** `antigravity/p0-financial-compliance-remediation`  
**Projet Supabase contrôlé en lecture seule (`GET` uniquement) :** `cdesuvcozcetdtvibgqs` (`remoteSupabaseWrites: 0`)

---

## 1. Principe de séparation stricte des responsabilités

Conformément aux **Règles de Sécurité et Autorisations (Section 2)** de la mission :
- **100 % des anomalies corrigibles dans le code, les helpers de calcul, l'interface citoyenne, les migrations SQL du dépôt, les référentiels locaux et la suite de tests** ont été corrigées, testées et poussées sur la branche `antigravity/p0-financial-compliance-remediation`.
- Les éléments qui ne peuvent être soldés sans :
  1. **une pièce documentaire primaire officielle externe** (délibération municipale signée, PDF officiel avec page et SHA-256), ou
  2. **une autorisation explicite du propriétaire** (application de migration SQL en production, écriture corrective sur `cdesuvcozcetdtvibgqs`, fusion sur `master` et déploiement Vercel)
  sont inventoriés ci-dessous de manière transparente, sans jamais masquer un écart ni inventer une source.

---

## 2. Catégorie A — Éléments `BLOQUÉ_PAR_AUTORISATION` (Prêts techniquement, en attente d'action propriétaire)

| # | Identifiant | Périmètre technique | État sur `antigravity/p0-financial-compliance-remediation` | Action requise (Propriétaire uniquement) |
|---:|---|---|---|---|
| A1 | `AUTH-MIGRATION-20261114183000` | Base Supabase Production `cdesuvcozcetdtvibgqs` (`private.*` RLS, `admin_baseline_visibility` excluant `csv-%`/`import-%`, privilèges des 21 fonctions `SECURITY DEFINER`, politiques `storage.objects` scindées `authenticated`/`anon`) | **Prêt & testé sous PGlite** dans `supabase/migrations/20261114183000_reconcile_security_definer_and_private_rls.sql` (`adminPersistenceDatabase.test.ts` PASS). | Appliquer la migration `20261114183000_reconcile_security_definer_and_private_rls.sql` sur `cdesuvcozcetdtvibgqs`. |
| A2 | `AUTH-PROD-DATA-COCODY-ARITH` | Ligne `ca-cocody-2024` dans `public.administrative_accounts` et `doc-dff4865a-c6a8-418e-8895-626258e409d0` dans `public.public_documents` (`cdesuvcozcetdtvibgqs`) | **Contourné et sécurisé côté UI** (`AdministrativeAccountView.tsx` recalcule dynamiquement `+2 237 133 790 FCFA` à partir de `19 012 357 233 − 16 775 223 443`). En base distante, `arithmetic_difference` vaut encore `0` et `public_documents.approval_date` vaut `2025-08-13` (au lieu de `2025-07-08`). | Exécuter après autorisation un `UPDATE` ciblé sur `cdesuvcozcetdtvibgqs` (`arithmetic_difference = 2237133790`, alignement de `approval_date = '2025-07-08'`). |
| A3 | `AUTH-PROD-DATA-TIASSALE-LOCAL-BUDGETS` | Ligne `ca-tiassale-2024` (`administrative_accounts`) et 3 lignes de `public.local_budgets` (`Bingerville`, `Cocody`, `Tiassalé`) en base `cdesuvcozcetdtvibgqs` | **Sécurisé côté UI et référentiels locaux** (`AdministrativeAccountView.tsx` déclasse tout CA sans `source_document_id` ou en `SOURCE_ANOMALY` ; `localBudgetsReferential.ts` et `docs/imports/tiassale-ca-2024.json` sont corrigés). En base distante, `ca-tiassale-2024` porte encore `verification_status = 'OFFICIAL_DOCUMENT'` et `local_budgets` porte `AIP_VERIFIED` (`is_current_version = false`). | Mettre à jour en base distante `ca-tiassale-2024.verification_status = 'TO_VERIFY'` et aligner les 3 lignes de `local_budgets` sur `SECONDARY_TO_CORROBORATE`. |
| A4 | `AUTH-MERGE-DEPLOY-VERCEL` | Fusion sur `master` et déploiement de production `https://suivibudget.vercel.app/` | **Interdit par les règles de la mission** (aucune fusion de PR, aucun push sur `master`, aucun déploiement Vercel). Le site de production sert encore le build antérieur tant que la branche n'est pas fusionnée et déployée. | Après contre-vérification finale par le propriétaire, fusionner la branche de remédiation sur `master` et déclencher le déploiement Vercel. |

---

## 3. Catégorie B — Éléments `BLOQUÉ_PAR_SOURCE_MANQUANTE` (Sécurisés dans l'UI, en attente de pièces officielles primaires)

| # | Identifiant | Périmètre documentaire | Traitement sécurisé déjà actif dans le code | Pièce primaire requise pour certification finale |
|---:|---|---|---|---|
| B1 | `SRC-TIASSALE-CA-2024-PDF` | Compte Administratif 2024 de la Mairie de Tiassalé (`ca-tiassale-2024`) | Affiché avec badge ambre `Anomalie arithmétique de la source` / `En attente de pièce officielle (PDF)`, résultat de clôture marqué `Résultat de clôture à confirmer`, écart `+157 080 800 FCFA` signalé dynamiquement. | Délibération municipale signée et PDF complet du Compte Administratif 2024 de Tiassalé (avec page de synthèse et empreinte SHA-256) expliquant l'écart de `157 080 800 FCFA`. |
| B2 | `SRC-LOCAL-BP-2026-DELIBERATIONS` | 47 collectivités à Budget Primitif 2026 rapporté par voie de presse (`OFFICIAL_PRIMITIVE_BUDGETS` : 46 entrées ; `LOCAL_BUDGETS_REFERENTIAL` : 48 lignes 2026) et 185 collectivités sans BP 2026 répertorié | Qualifiées en `SECONDARY_TO_CORROBORATE` / `SECONDARY_REPORTING` (`Publication secondaire — à confirmer`) ou `Non documenté publiquement` (`null`, jamais `0 FCFA`). | Délibérations budgétaires primitives 2026 signées et visées par la tutelle (DGDDL / Préfectures) avec pagination et SHA-256. |
| B3 | `SRC-MINISTRIES-REMANIEMENT-2026` | Affectation par portefeuille ministériel remanié en janvier 2026 (`10` portefeuilles retenus dans `WITHHELD_MINISTRY_PORTFOLIO_IDS`, section partagée `229` `gov-009`/`gov-035`, `4` résiduels historiques `gov-006`, `gov-011`, `gov-013`, `gov-025`) | `resolveInstitutionBudgetPresentation` publie les CP votés par section LFI initiale (Articles 14–15, `34` sections uniques) en précisant explicitement que l'affectation au portefeuille remanié n'est pas certifiée et en interdisant tout double comptage. | Décret de répartition / arrêté de transfert de crédits post-remaniement ou Loi de Finances Rectificative 2026. |
| B4 | `SRC-COUR-SUPREME-AAI-BUDGETS` | Cour Suprême (`inst-cour-supreme`) et 7 Autorités Administratives Indépendantes (`aai-arcop`, `aai-haca`, `aai-cndh`, `aai-caidp`, `aai-airp`, `aai-artci`, `aai-anare`) | `total_budget_fcfa = null` (`Non individualisé (LFI 2026)` pour la Cour Suprême ; `Non documenté` pour le budget global des 7 AAI, avec subventions ASS Annexe 6 isolées en `supplements` non additifs). | Budgets primitifs approuvés / rapports financiers annuels propres des 7 AAI. |
| B5 | `SRC-EXTERNAL-404-DOCS` | `DGBF-RAP-2022` (Loi de règlement 2022, URL `dgbf.ci` en HTTP `404`) et `CAIDP-LOI-2013-867` (Loi n°2013-867, URL `caidp.ci` en HTTP `404`) | Statut `TO_VERIFY`, badge `Source distante indisponible (404)`, bouton de téléchargement remplacé par `Lien source indisponible (404)` désactivé. | Nouvelles URL officielles actives ou copies archivistiques certifiées hébergées dans le bucket vérifié. |
