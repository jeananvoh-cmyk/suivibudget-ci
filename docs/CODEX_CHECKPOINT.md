## 12 octobre 2026 — Clôture technique et auditrice de la PR #58 par Antigravity

- **PR GitHub** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58 (`codex/budget-presentation-final`).
- **Base master** : `ab159d4e3de829e11d1e146c8d9b0f9dbfb72bfe` (PR #57 incluse).
- **HEAD validé** : `7d6a2204c34a06ea95d249f31525a81ca5bc88e1` (suivi du commit documentaire).
- **Statut PR** : Ouverte, fusionnable, CI verte, prête pour décision de fusion par ChatGPT.
- **Récupération Codex** : Sauvegarde des modifications locales de `src/components/InstitutionDetailModal.tsx` (Escape, backdrop, role dialog, aria-modal, aria-label).
- **Durcissement financier** : Neutralisation de toute ventilation fonctionnement/investissement non prouvée sur la même assiette officielle dans `resolveInstitutionFinancialView` (`src/utils/institutionBudgetHelper.ts`).
- **Périmètre institutionnel** : 35 ministères / 34 sections LFI (section 229 partagée comptabilisée 1 fois), HABG/IGE dans section 103 sans double comptage, CESEC documenté avec écart noté sans irrégularité, Cour Suprême sans section autonome ("Non documenté"), 201 communes + 31 régions étanches des concours État, régulateurs sans budget global inventé, jamais 0 FCFA pour inconnu.
- **Validation technique** : 58 fichiers de tests, 745/745 tests PASS (100%), build TypeScript et Vite PASS.
- **Recette visuelle Playwright** : 10 entités vérifiées aux viewports 390px, 768px, 1440px. 0 débordement horizontal, 0 erreur console, accessibilité modale confirmée.
- **Garde-fous** : `REMOTE_SUPABASE_WRITES = 0` ; migrations = 0 ; fusion master = non effectuée (réservée à ChatGPT) ; déploiement production = non tenté.
- **NEXT_EXECUTABLE_TASK** : Revue finale et décision de fusion de la PR #58 sur master par ChatGPT.

# Checkpoint — 29 septembre 2026 (Relais Antigravity après Codex)

## 9 octobre — Clôture définitive des bloqueurs financiers de l'audit indépendant (PR #30) sur PR #29

Sur la branche `antigravity/reconcile-lots6-15-post-lot5` (PR #29) :
1. **Protection étanche de tous les chemins d'export (Bloqueur P1)** : `openDataRows()`, `openDataJson()`, `openDataCsv()` (`src/review/domain/history.ts`) et `buildReviewSnapshot()` (`src/review/domain/snapshot.ts`) appliquent désormais sans exception `canPublishOfficialObservation()`. Tout montant non vérifié ou muté (+1 FCFA, -1 FCFA, hash SHA-256 falsifié, discordance de page, etc.) est exporté sous forme `amount: null`, `status: 'UNKNOWN'`. `aggregateObservations()` neutralise la totalité de la somme agrégée avec `AGGREGATE_CONTAINS_UNVERIFIED_AMOUNT` dès lors qu'une observation est compromise. `compareHistory()` refuse les comparaisons interannuelles sur montants compromis.
2. **Conformité de sémantique budgétaire LOLF (Bloqueur P1)** : Réconciliation rigoureuse des autorisations budgétaires initiales de la LFI 2026 et du DPPD-PAP Annexe 4 : la mesure canonique est `PLANNED` (base `INITIAL_BUDGET`), et non `ORDERED` (réservé aux mandats/ordonnancements exécutés). `transformLot5ControlsToAudits()` et `verifyAuditRecordAgainstReferential()` imposent `measure: 'PLANNED'`. Toute tentative d'associer `ORDERED` aux montants de la LFI 2026 est rejetée avec `MEASURE_MISMATCH`.
3. **Script de vérification navigateur (Bloqueur P2)** : Correction de `scripts/verify-review-browser.cjs` avec l'import `const assert = require('node:assert/strict');` (vérification syntaxique node -c PASS).
4. **Suite de tests d'intégrité d'export (21 tests)** : Ajout de `src/review/__tests__/exportIntegrityHardening.test.ts` couvrant l'ensemble des cas limites et tentatives d'injection/altération sur exports JSON, CSV, snapshots et agrégats.
5. **Résultats de validation** : 35 fichiers de test / 569 tests PASS (100%), `npx tsc --noEmit` PASS, `npm run build` PASS, `npm run build:review` PASS, sonde Supabase en lecture seule PASS (`remoteSupabaseWrites: 0`).

## 8 octobre — garde-fou final d'intégrité documentaire PR #29

Sur `antigravity/reconcile-lots6-15-post-lot5`, contrôle LOT5 strict par périmètre : section/programme = ID et SHA-256 LFI 2026 ; action = ID et SHA-256 DPPD-PAP 2026–2028, alias `-ANNEXE-4` explicite. Page du référentiel exigée pour l'audit et identique dans la citation publique ; absence de localisation vérifiée = publication refusée. Aucun montant canonique, migration ou fichier protégé modifié. Chemin de publication limité au domaine de revue, non branché au runtime public.

Tests adversariaux ajoutés avant le correctif (6 échecs attendus constatés), puis 59/59 tests financiers et 547/547 tests globaux PASS ; TypeScript, build production et build revue PASS. Sonde Supabase anon GET/HEAD PASS, 0 écriture distante. PR #29 à revoir indépendamment, sans fusion par Codex.

## 8 octobre — Réconciliation contrôlée LOTS 6 à 15, durcissement des preuves financières et levée définitive des réserves PR #29

- **Base de travail** : `master` post-LOT5 (`707b3b688f23bd33dc0f3504e13b79c65908dd50`, PR #28 fusionnée).
- **Branche** : `antigravity/reconcile-lots6-15-post-lot5` (PR #29).
- **Réconciliation** : Intégration sous `src/review/` des contrats d'exécution budgétaire (LOT6), versions de collectivités (LOT7), catalogue documentaire et SHA-256 (LOT8), liens projets-budgets sans agrégation abusive (LOT9), suivi citoyen avec protection de la vie privée (LOT10), réponses institutionnelles et audits officiels séparés (LOT11), historique et exports Open Data avec protection injection CSV (LOT12), primitives UI orientées preuve (LOT13), workspace de revue isolé (LOT14), et stabilisation en composition read-only (LOT15).
- **Suppression du blocage LOT5 obsolète** : Remplacement du filtre codé en dur par `LOT5_UNRESOLVED_SCOPES = []`. Les trois ministères (MICOM 336, MSCV 444, METFPA 334) sont évalués selon les règles normales du moteur (UNKNOWN sans source, AVAILABLE avec preuve officielle vérifiée).
- **Résolution définitive des réserves de l'audit indépendant (Corrections ciblées & durcissement approfondi)** :
  1. Élimination de la sélection arbitraire `.find()` & traitement déterministe des audits contradictoires : Analyse exhaustive de tous les audits applicables au même périmètre. Rejet déterministe de toute ambiguïté ou divergence (`CONTRADICTORY_AUDIT_AMOUNTS`, `CONTRADICTORY_AUDIT_PAGES`, `CONTRADICTORY_AUDIT_RECORDS`, `SOURCE_CONFLICT`, `TO_VERIFY`).
  2. Page documentaire obligatoire : Si un audit spécifie une page, l'observation doit impérativement fournir cette page exacte (`PAGE_REQUIRED` si absente, `PAGE_MISMATCH` si discordante). Correspondance explicite sur `evidence.reference` si contrôle par tableau (`tableRef`).
  3. Cohérence structurelle des codes & formats obligatoires : Validation de la cohérence entre `scope`, `programCode`, `actionCode` et `sectionCode`. Format 5 chiffres pour les programmes (`INVALID_PROGRAM_CODE_LENGTH`), 7 chiffres pour les actions, préfixe hiérarchique strict (`actionCode.startsWith(programCode)` sinon `ACTION_PROGRAM_MISMATCH`). Rejet de codes d'action pour totaux de section ou scopes programmes (`PROGRAM_HAS_ACTION_CODE`, `SECTION_TOTAL_HAS_ACTION_CODE`).
  4. Correspondance exacte avec le référentiel LOT5 : `verifyAuditRecordAgainstReferential` intégré dans le matching `matchFinancialAudit`. Détection des revendications LOT5 via `isLot5ReferentialClaim`. Validation au niveau de la ligne exacte (section, programme, action, mesure `ORDERED`, base `INITIAL_BUDGET`, devise `XOF`, montant exact, doc ID, hash SHA-256, page PDF). Rejet strict des audits fabriqués ou discordants (`AMOUNT_NOT_IN_DOCUMENTARY_REFERENTIAL`, `PROGRAM_NOT_IN_REFERENTIAL`, `ACTION_NOT_IN_REFERENTIAL`). Préservation étanche des audits synthétiques de tests.
  5. Suite de tests adversariaux portée à 41 tests dans `src/review/__tests__/financialEvidenceHardening.test.ts` couvrant l'ensemble des 10 scénarios d'attaque initiaux et les 16 nouveaux scénarios de conformité stricts Phase 4 (S1 à S16).
  6. Découplage strict des statuts documentaires et chemin financier : disponibilité (`availability`), provenance officielle (`provenance`), vérification d'extraction financière (`extractionStatus`), et citation exacte (`resolveCitation`). Interdiction d'inférer la vérification d'un montant depuis la simple présence d'un PDF (`canPublishOfficialObservation`). Préservation de l'exact zéro (`amount: 0, precision: 'EXACT'`).
  7. Registre de contrôle documentaire traçable : Contrat `DocumentaryAuditRecord` et `verifyDocumentaryAudit()` dans `src/review/domain/documents.ts`. Registre `OFFICIAL_DOCUMENTARY_AUDITS` reliant LFI 2026 et DPPD-PAP Annexe 4 aux contrôles traçables (`LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls`).
  8. Garde-fou transport Supabase `guardedFetch` dans `scripts/verify-supabase-readonly.mjs` interdisant toute méthode non-GET/HEAD de façon synchrone avant le réseau, validé par 9 tests unitaires (`supabaseReadOnlyGuard.test.ts`). Sonde strictement limitée à ses propres requêtes avec fallback sécurisé `.env`, clé anon, aucun service_role, 0 écriture distante.
  9. Validation visuelle Chromium `CHROMIUM_CHECK = PASS` via Playwright / Chrome DevTools MCP sur `http://127.0.0.1:5174/review.html` (0 erreur console applicative, sources DGBF et SHA-256 exacts affichés).
- **Suite de tests** : 34 fichiers de tests, 529 tests réussis (529/529 PASS, 0 FAIL, 100% PASS), dont 30 tests sur les contrôles documentaires et 41 tests adversariaux sur les preuves financières.
- **Builds** : Build production `npm run build` PASS (tsc && vite build), build review `npm run build:review` PASS (vite build --config vite.review.config.ts).
- **Données protégées & Supabase** : Inchangées (`src/data`, `docs/imports`, `docs/references/2026`, `src/budget-ingestion`, `supabase`). Zéro écriture distante Supabase (`REMOTE_SUPABASE_WRITES = 0`). Aucun merge effectué (`MERGE_PERFORMED = FALSE`). Statut : `READY_FOR_INDEPENDENT_REVIEW`.

## 1er octobre — console données et montants qualifiés, après #8

#8 fusionnée au SHA attendu, master synchronisé sans perte à `8e934d19dcdbf0172259d4028aa969cb29084918`. Post-merge ciblé : 16 tests PASS. Branche `codex/import-console-amount-precision`, nouvelle PR à laisser ouverte.

Console privée ADMIN/DATA_MANAGER : dry-run, import, rapports et provenance ligne par ligne, historique, décisions VERIFY/PUBLISH/REJECT séparées et confirmation explicite de publication côté serveur. Restitution publique BP/CA/opérations/DGMP/Passport qualifiée ; UNKNOWN=null, zéro exact distinct, calculs financiers suspendus pour les montants incertains. Aucun effet déduit sur réalisation physique.

Tests-first critiques puis 174 tests / 11 fichiers PASS ; TypeScript/build PASS (1726 modules), six HTTP/RLS PASS. Huit largeurs 360 à 1920 px sans overflow ni erreur JS ; captures 375/1440 inspectées. Parcours privés vérifiés avec API interceptée, MODERATOR refusé, simulation invalidée après édition et publication impossible sans confirmation. Aucun compte ni fixture en production.

Nouvelle migration locale `20261001144423_import_console_qualified_amounts.sql` appliquée une seule fois sous version distante `20261001150911` ; anciennes migrations APPLIED intactes et non rejouées. Staging/journal/BP=0 ; CA/opérations/DGMP=3 chacun. RLS et grants vérifiés, advisors inchangés documentés dans AGENT_HANDOFF.md. Les limites historiques CLI et affichage des montants qualifiés sont levées ; les corrections de versions conflictuelles restent hors périmètre. Mode opératoire actualisé dans DATA_IMPORT.md.

## 1er octobre — pipeline contrôlé des données réelles

#7 e5454ca fusionnée après contrôle final court des statuts GitHub/Vercel et du SHA attendu. Master synchronisé sans perte à `26711d57e39d84848a5b4629facbe37ea4ec5040`. Contrôle post-merge limité aux 27 tests PostgreSQL de frontières de publication : PASS. Branche `codex/controlled-data-import`, nouvelle PR à laisser ouverte.

Pipeline opérateur JSON/JSONL : simulation sans écriture, plan lié au fichier et à l’état de déduplication, import idempotent dans staging privé immutable, rapports ligne par ligne, vérification/publication/rejet humains distincts. Publication dans les quatre tables métier existantes, avec source/date/exercice/type collectivité et précisions conservées ; aucun écrasement des données existantes ni rapprochement DGMP automatique. Compatibilité parents/institution/exercice et preuve de rapprochement STRONG exigées. BP publiés chargés dynamiquement dans l’historique existant ; CA/Passport/APEC/préuves préservés.

Tests-first : huit règles critiques initialement rouges puis implémentées et étendues à seize contrôles. Petites fixtures locales Abobo/Bingerville/Tiassalé/Cocody provenant du dépôt, aucune ingestion réelle. Cocody conserve UNKNOWN pour sa ventilation contestée ; dates de fixtures étiquetées RECORDED. Résultat final : 166 tests / 11 fichiers, TypeScript et Vite build PASS (1724 modules), parseur CLI contrôlé, six tests HTTP/RLS ciblés PASS. Aucun audit historique répété.

Migration locale `20261001091748_controlled_data_import.sql` appliquée une seule fois sous version distante `20261001093613` ; ne jamais rejouer, ni la migration APEC `20261001044508`. État distant après contrôle : staging=0, journal=0, BP=0, CA=3, opérations=3, marchés=3. Aucune fixture ni compte créé. Advisors : six RPC SECURITY DEFINER intentionnelles (dont deux import) contrôlées par profiles et moindre privilège ; avertissement Auth préexistant inchangé. Garde-fous et [remédiations](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) documentés dans AGENT_HANDOFF.md.

Mode opératoire : DATA_IMPORT.md. Limites explicites : CLI, pas encore de console graphique ; aucune correction automatique de version/conflict ; CA/opérations/DGMP incertains conservés privés avant prise en charge fidèle par les écrans. BP à précision homogène connue publiable. La publication refuse toute donnée obligatoire absente au lieu d’inventer un zéro. Vérifier la CI du HEAD poussé, sans boucle de commits de hash ; ne pas fusionner la nouvelle PR.

## 1er octobre — APEC produit citoyen, après #6

#6 fusionnée sur autorisation, master synchronisé à `3958dd17639f61e381da755a8826abb342580b37` sans perte locale. Contrôle unique après fusion : 145 tests et TypeScript/build PASS. Branche produit `codex/apec-collectivities-publication` ; nouvelle PR à laisser ouverte, sans fusion.

Entrée Participation APEC depuis les fiches communes/régions même sans projet, filtre d’exercice éditable et accès Passport conservé. Dépôt, suivi privé, contributions et décisions sourcées préservés. Publication séparée : besoin VERIFIED, résumé rédigé spécifiquement pour le public, confirmation explicite d’absence de données privées, RPC réservées ADMIN/DATA_MANAGER. Projection de dix champs sans identité/contact des originaux, provenance CITIZEN_OBSERVATION permanente, retrait et versions conservées dans l’historique privé. L’anonymisation du texte libre requiert une relecture humaine ; aucune publication automatique.

Migration additive `20261001043805_apec_moderated_publication.sql` APPLIED une seule fois sous version distante `20261001044508` sur cdesuvcozcetdtvibgqs. Aucune migration antérieure rejouée, aucune ingestion ni fixture de production. Zéro résumé public/besoin privé, trois CA préservés au contrôle distant.

Validation finale : 150 tests / 10 fichiers dont 27 PostgreSQL PASS, TypeScript et Vite build PASS (1724 modules). Quatre contrôles HTTP publics ciblés PASS. Fiches communes/régions sans projet vérifiées sur huit largeurs 360 à 1920 px, sans débordement ni erreur JS, captures 375/1440 inspectées ; navigation mobile en grille. Publication/retrait, parcours staff, connexion/dépôt et maintien Passport vérifiés avec API interceptée localement, état vide réel vérifié sur Supabase. Advisors : quatre RPC SECURITY DEFINER intentionnelles protégées par profiles/search_path/grants, avertissement Auth préexistant inchangé. Aucun autre signal sécurité. Bundles de données volumineux préexistants.

Relais : AGENT_HANDOFF.md porte les versions APPLIED et les prochaines tâches. Vérifier la CI du HEAD poussé sans boucle de commits de hash ; ne pas fusionner cette nouvelle PR.

## 1er octobre — consolidation master et APEC Phase 2C

Sur autorisation explicite, #3 → #4 → #5 fusionnées dans cet ordre, avec retarget des deux PR empilées vers master. HEAD consolidé `4aed61d18d4ebf139009dc3d72e5bbebda994380`, arbre identique à #5, CI Quality SUCCESS (run 36786596459). Les audits antérieurs n’ont pas été recommencés ; aucune migration APPLIED rejouée.

Branche `codex/apec-phase-2c`. Tests critiques écrits avant implémentation. Nouveau modèle additif cycle / besoin / contribution / événements : provenance citoyenne permanente, vérification staff, priorité documentée, rattachement institution/exercice au budget publié ou projet canonique, suivi et réponse institutionnelle sourcée. Historique immutable et dépôts avec ID ; pas de représentativité déduite de la participation. Tables privées protégées par RLS et grants minimaux. Deux RPC staff à search_path vide, sans SQL dynamique, évitent de distribuer les droits de mutation directe. Sources originales non modifiables par les clients.

Panneau APEC intégré après les informations Passport existantes, avec connexion/inscription citoyenne Auth (back-office inchangé), dépôt, contributions, sources, historique et décisions staff. Aucune donnée métier fabriquée, aucune ingestion. Migration locale `20260930223840_apec_participation_cycle.sql` appliquée une seule fois sous version distante `20261001040746` sur cdesuvcozcetdtvibgqs ; quatre tables vides après contrôles, trois CA préservés.

Validation : 145 tests / 10 fichiers PASS (22 PostgreSQL dont 9 nouveaux APEC), TypeScript + Vite PASS (1724 modules), diff du bloc sans défaut d’espacement. Dix contrôles HTTP réels APEC PASS. Huit largeurs 360/375/390/430/768/1280/1440/1920 et parcours connexion/dépôt citoyen avec API interceptée localement ; état public vide réel vérifié, captures 375/1440 inspectées, aucun overflow/erreur JS du parcours staff. Aucun compte ou fixture créé en production. Le premier test SQL a révélé une fixture sans les colonnes réelles et un test historique de rejeu à isoler du nouveau schéma initial ; corrigés avant application. Les premiers appels réseau natifs étaient bloqués par le sandbox ; les contrôles autorisés hors sandbox passent.

Advisors : avertissement Auth préexistant et deux WARN 0029 sur les RPC SECURITY DEFINER intentionnelles, documentés avec les garde-fous et tests de refus dans AGENT_HANDOFF.md. Aucun autre signal sécurité Advisors. Limites du bloc : suivi privé, entrée par Passport ; publication publique et entrée indépendante depuis les collectivités à traiter séparément.

Commit fonctionnel `51bf26577a057af3f734b9547c9706c9c3b9e5b0` poussé, PR #6 ouverte sur master. CI Quality / verify SUCCESS (run 36815164988), Vercel Preview Comments SUCCESS. Dernier contrôle distant : 1 compte Auth, 3 CA, 0 ligne dans chacune des 4 tables APEC. Ce checkpoint documentaire sera également poussé et sa CI contrôlée sans boucle de commits de hash. Serveur de test local arrêté.


## 30 septembre — DGMP Phase 2B déterministe

Branche `codex/dgmp-phase-2b-deterministic` créée depuis le HEAD de PR #4 `2657acbf63154730835c80d07edb0d94d337c61c`. PR #5 ouverte avec PR #4 comme base ; aucune fusion. Aucune migration rejouée et aucun pilote CA modifié.

`findCandidate` compare désormais tous les candidats compatibles au lieu de retourner le premier résultat plausible. Classement déterministe par niveau de confiance, score de concordance puis clé stable. Les égalités réelles entre opérations distinctes sont déclassées en `TO_VERIFY` avec `ambiguous_candidates`. Les conflits institution, exercice et localisation restent explicites et un montant proche n’est pas utilisé pour compenser un objet/localisation incompatibles.

Cinq tests Phase 2B ajoutés : ordre inversé de candidats, homonymes équivalents, mauvais exercice, montant proche mais objet/localisation incompatibles, et non-régression des trois rapprochements Tiassalé dans les deux ordres. CI Quality run `36785358174` SUCCESS sur `a7e71b5d91168bb9a63a2e54e17a6618a738f921` : **10 fichiers / 136 tests PASS**, `tsc && vite build` PASS, 1722 modules. Seul l’avertissement préexistant de taille de bundles demeure.

Phase 2B est VALIDATED sans ingestion DGMP massive. Prochaine tâche : APEC Phase 2C, modèle minimal et tests contrôlés avant toute extension de données.

## 30 septembre — Passport Phase 2A et moindre privilège

Branche `codex/passport-phase-2a` créée depuis `9457f07`, après confirmation de la CI de la fondation et inspection du diff de PR #3 contre master. PR #3 reste ouverte, non fusionnée. Les contrôles antérieurs HTTP/Storage/Edge ne sont pas rejoués intégralement.

Migration locale `20260930153716_least_privilege_passport_boundary.sql` appliquée sous la version distante `20260930153938` : retrait TRUNCATE/REFERENCES/TRIGGER de service_role sur dix relations sensibles, et lecture citoyenne des local_budgets limitée à PUBLISHED. SELECT service_role sur documents/preuves préservé. Transactions SQL temporaires annulées pour ADMIN/DATA_MANAGER/MODERATOR/CITIZEN ; contrôle HTTP public 23/23. État final : 1 compte Auth, 3 CA VERIFIED, 0 document/preuve/objet Storage. Matrice explicite dans CA_SECURITY_STATUS_20260929.md.

Passport : vingt faits typés avec provenance et source, conflits et champs manquants explicites, plus de défaut d’exercice 2026, preuves limitées au projet et hors démonstration, réponse institutionnelle publiée et liée à l’opération/CA. UI Comprendre / Explorer / Vérifier. Trois correspondances Tiassalé préservées, aucun détail inventé pour Abobo/Bingerville ; 0 FCFA ne devient ni retard ni abandon et aucune dépense ne prouve le physique.

131/131 tests réussis (10 fichiers), dont 18 Passport et 13 base PostgreSQL PGlite. Un premier passage concurrent au build a dépassé le délai d’un test préexistant ; le passage isolé réussit sans augmenter le délai. Validation navigateur Playwright/Edge du composant réel : deux états (sources pilotes en aperçu local, public vide) × huit largeurs 360/375/390/430/768/1280/1440/1920 ; 16/16, zéro débordement et erreur JS. Captures 375/1440 inspectées. Advisors inchangés : protection des mots de passe compromis désactivée, 31 index inutilisés et 16 policies permissives multiples. Aucune optimisation mécanique.

Commits poussés : 1771f67 (moindre privilège), ecfb1f789dfd31ecc636e2c1d002e437d634da0e (Passport). PR #4 créée avec la branche de PR #3 comme base, aucune fusion. Quality / verify et Vercel Preview Comments SUCCESS sur ecfb1f7. Build final 1722 modules réussi ; 18 tests Passport ciblés réussis après le dernier ajustement. Cette clôture documentaire sera également poussée et sa CI vérifiée sans boucle de commits de métadonnées. DGMP 2B et APEC 2C restent NOT_STARTED dans ce bloc ; tâche suivante précise dans AGENT_HANDOFF.md.

## 30 septembre — fermeture HTTP et publication frontend

197 tests HTTP réels et 2 contrôles des relations CA/opérations/marchés passent. Défauts corrigés : droits SELECT service_role manquants sur documents/preuves, metadata.size indisponible au contrôle INSERT Storage, médias privés non résolus côté client, CA VERIFIED embarqués dans le bundle public. Nouvelle migration locale 20260930033244 appliquée à distance sous 20260930144753 ; quatre migrations précédentes non rejouées. Edge documents v3 et preuves v2 avec verify_jwt=true. CA publics issus uniquement de PostgREST PUBLISHED ; sources pilotes déplacées en fixtures de tests, données distantes intactes.

Nettoyage confirmé : 1 compte Auth, 3 CA, 0 document, 0 preuve, 0 objet Storage, 0 profil/journal temporaire. 121 tests et build réussis. Advisors finaux après nettoyage : seul WARN sécurité mot de passe compromis ; 31 index inutilisés et 16 policies permissives multiples conservés. Playwright Documents/Observatoire/Institutions : 375/768/1440, aucun débordement ni erreur JavaScript. Dépendance xlsx inutilisée retirée ; npm audit zéro vulnérabilité.

Commits 454d62c (publication/HTTP) puis 3b502b1 (dépendance) poussés, CI verify et Vercel Preview Comments SUCCESS sur chacun. FOUNDATION_READY=TRUE sur 3b502b1223d304b12f904087430882ea8156f324. PR #3 ouverte, non mergée. Prochain bloc : consolidation Passport sur branche produit distincte, puis DGMP contrôlé, APEC ultérieurement. AGENT_HANDOFF.md est le relais courant ; les sections suivantes restent historiques.

## 30 septembre — état courant Codex

Commit fonctionnel b2b3b1f poussé, CI verify SUCCESS. Metadata, publication et grants appliqués individuellement, puis complément de projection publique : versions distantes 20260930030522, 20260930030614, 20260930030702, 20260930031058. Vérifications SQL distantes avec rollback, aucune fixture restante. 116 tests et build passent. Security advisor : uniquement Leaked Password Protection Disabled. FOUNDATION_READY reste FALSE : tests exhaustifs Storage/Edge/PostgREST encore nécessaires. AGENT_HANDOFF.md porte le relais opérationnel.

## Mandat et état

Poursuite sans interruption du backlog de sécurisation, RLS, gestion documentaire, CA et UX/UI responsive sur la branche `security-ca-final-20260929` (PR #3).

GitHub : master distant `529db22012848e34afdf8b286983eebfc917b9f7`. Branche PR active `security-ca-final-20260929`, commit head de reprise `8e1654cb0d234d22bf7662467b1b544d61dfa83e`.

## Résolution des Tests et du Build
- **Tests unitaires** : Les 4 tests qui échouaient initialement (`caManagement.test.ts` et `security.test.ts`) ont été totalement corrigés et isolés via des mocks Supabase sécurisés.
  - Résultat d'exécution : **8 fichiers de test validés (8/8), 91 tests réussis (91/91)** en 20.31s.
  - Zéro régression sur la matrice des 232 collectivités, la sécurité RBAC, les formats financiers ou les projets d'investissement.
- **Build de production** : `npm run build` (`tsc && vite build`) s'exécute avec succès avec **0 erreur** (1721 modules transformés).

## État Supabase & Sécurité
- Projet autorisé : `cdesuvcozcetdtvibgqs` (eu-west-1).
- Authentification : Suppression intégrale de `createSignedSession` et des signatures locales factices. L'authentification passe exclusivement par `supabase.auth.getSession()` et `public.profiles`. Les rôles (`ADMIN`, `DATA_MANAGER`, `MODERATOR`) ne sont jamais attribués côté client ni lus depuis `user_metadata`.
- Stockage privé : Buckets `public_documents` et `citizen_photos` privés. Pas de `getPublicUrl` non sécurisé. Téléversements avec `upsert: false`, contrôle SHA-256 et signature PDF.
- Workflow CA : Découplage strict entre `VERIFIED` (audit de conformité) et `PUBLISHED` (visibilité citoyenne). La matrice dynamique des 232 collectivités calcule en temps réel les comptes manquants sans insertion de lignes factices.

## Migrations Préparées (supabase/migrations/)
- `20260929121225_publication_boundaries.sql` : RLS de publication parent pour les opérations financières, contrôle staff sur documents et modération des preuves, trigger `enforce_document_publication_audit()`.
- `20260929121408_document_metadata_versions.sql` : Colonnes de métadonnées et versionnement documentaire avec contraintes d'unicité.
- Prêtes pour validation et application après inspection de drift.

## UX/UI Responsive & Accessibilité
- Intégration de l'Addendum UX/UI dans le Goal permanent et dans `AGENTS.md`.
- Audit d'inventaire et validation Playwright multi-viewports (375px mobile, 1440px desktop) :
  - `HomePage` : Aligné sur 232 collectivités (201 communes + 31 régions) dans `StatImpactBanner.tsx`, bottom navigation tactile, zéro overflow.
  - `InstitutionsPage` : Pannes et badges officiels vérifiés.
  - `ProjectsPage` : Bascule grille / tableau réactif sans rétrécissement illisible, modal de détail projet `ProjectDetailModal` responsive avec boutons tactiles >= 44px.
  - `ObservatoryPage` : Bilan réel vs voté et CTA dépot de constat.
  - `DocumentsPage` : État vide informatif, CTA de demande CAIDP, recherche et filtres.
  - `AdminLoginPage` : Route `/admin/login` rétablie dans `parseRoute` et sécurisée visuellement.
  - `SendProofModal` : Largeur mobile 351px, zéro débordement horizontal, bouton CTA >= 44px (52px), validation des statuts de chantier et dropzone.
  - `OfficialDocRequestModal` : Largeur mobile 355px, zéro débordement, parcours en 3 étapes (packs documentaires, demandeur, génération de lettre CAIDP).
  - `AdminDashboardPage` : Navigation multi-onglets (CAIDP, CA 232, Documents, Modération, File de Travail) validée sur mobile (375px) et desktop (1440px), zéro overflow horizontal, boutons interactifs.
  - `SingleCAUploadModal` : Formulaire de dépôt individuel validé (343px mobile, 672px desktop), 8 champs responsive, cibles tactiles >= 44px.
  - `BatchCAImportModal` : Import par lot validé (343px mobile, 1024px desktop), glisser-déposer, proposition d'appariement, cibles tactiles >= 44px.
  - `ExamineCADocumentModal` : Examen et cycle de vie découplé (`TO_VERIFY` → `VERIFIED` → `PUBLISHED`) validé (343px mobile, 672px desktop), checklist de conformité, cibles tactiles >= 44px.
- Suite de tests : **106/106 tests validés (9/9 fichiers)**, `npm run build` propre (0 erreur en 25.78s). 100% des 13 vues et modales déclarées `VALIDATED`.

## Documents de Continuité Multi-Agents
- `AGENTS.md` : Mis à jour avec le Goal permanent enrichi, les 16 principes non négociables et les garde-fous techniques.
- `docs/AGENT_HANDOFF.md` : Maintenu avec la matrice complète `UX_UI_AUDIT_STATUS` (13/13 VALIDATED), le Passeport de Redevabilité et les prochaines tâches exécutables.

## Passeport de Redevabilité du Projet (Project Accountability Passport) — 30 septembre 2026
- **Architecture & Cycle Civique** : Implémentation du cycle complet en 6 étapes (`NEED_PROGRAMMING` → `BUDGET_VOTED` → `PROCUREMENT_DGMP` → `BUDGET_EXECUTION_CA` → `PHYSICAL_REALIZATION` → `AUDIT_ACCOUNTABILITY`) dans `src/utils/projectPassport.ts`.
- **Rapprochement Temporel & Multi-Critères** : Fonction `findMatchingCaOperationResult` avec vérification stricte des exercices budgétaires. Empêche toute hallucination d'appariement direct entre un projet 2026 et un CA 2024 (classé `WEAK` ou `TO_VERIFY`, `conflictingFields: ['fiscal_year']`) sauf justification documentaire explicite (`REPORT`, `TRANCHE`, référence pluriannuelle).
- **Neutralité Politique & Formulation Factuelle (Principe 11)** : Élimination totale des spéculations (« report probable », « retard », « fraude ») pour les opérations à 0 FCFA ordonnancé (ex. école de Gardienkro). Formulation strictement neutre : *« Le Compte Administratif consulté indique 0 FCFA exécuté/ordonnancé pour cette opération sur l’exercice observé. La cause de cet écart n’est pas établie par les sources actuellement reliées. »*
- **Typage Strict de la Provenance & Disponibilité** : Types explicites sans cast `as any` (`DataProvenance` : `OFFICIAL_SOURCE`, `SUIVIBUDGET_CALCULATION`, `CITIZEN_OBSERVATION`, `INSTITUTION_RESPONSE`, `UNVERIFIED_INPUT` ; `DataAvailability` : `AVAILABLE`, `NOT_FOUND_PUBLICLY`, `PENDING_COLLECTION`, `SOURCE_CONFLICT`).
- **Besoin Initial vs Programmation** : Distinction formelle dès l'étape 1 entre le besoin citoyen initial et l'inscription budgétaire officielle.
- **Score Global Neutre** : Jauge renommée « Complétude Documentaire » (`documentationCompletenessPct`) mesurant la présence de sources documentaires sans jugement politique ni notation subjective.
- **Composant Visuel & UX** : Composant `ProjectAccountabilityPassport.tsx` avec cartes d'étapes expansibles, badges de provenance explicites, gestion du principe 9 (`NOT_FOUND_PUBLICLY`), et actions citoyennes directes (demande CAIDP, envoi de preuve terrain).
- **Intégration & Accessibilité** : 3e onglet « Passeport Redevabilité » dans `ProjectDetailModal.tsx` avec pastille dynamique (« Lié DGMP/CA » ou « 6 étapes »), cibles tactiles WCAG AA (>= 44px).
- **Validation** : 10 fichiers de test validés (**116/116 tests réussis**), `npm run build` propre (0 erreur, 1722 modules). Validation visuelle multi-viewports (375px mobile et 1440px desktop) avec zéro overflow horizontal.



## Correctif des bloqueurs PR #44–#48 — 12 octobre 2026

Base exacte : PR #48, `antigravity/bloc-e-final-validation-closure`, `326558f48ba2e8cd960f1e3fd2f9b34be20f6204`. Branche corrective : `codex/pr48-integrity-privacy-fixes`. Dépendances : #44 → #45 → #46 → #47 → #48 ; PR corrective ciblant la branche #48 pour isoler le diff. Validation humaine finale : ChatGPT / responsable désigné. Aucune fusion automatique.

### Avant / après

| Périmètre | Avant | Après |
|---|---|---|
| Annexes officielles | Annexes 6, 7 et concours locaux réutilisant la LFI et son hash | URL et empreinte propres aux annexes 6, 7 et 8 ; 179, 89 et 322 pages vérifiées par lecture des PDF |
| CAIDP | Empreinte du fichier vide, statut VERIFIED | Lien primaire retrouvé dans l’index public, réponse HTTP 404 au contrôle ; empreinte supprimée, authenticité/extraction TO_VERIFY |
| RAP 2022 | HTTP 200 et extraction VERIFIED imposés | HTTP 404 constaté ; SHA historique conservé avec provenance dans docs/overnight/DOCUMENTS.json ; extraction TO_VERIFY |
| Conversion documentaire | Date de publication assimilée à une date de contrôle ; AVAILABLE / VERIFIED forcés | Contrôle exact ID / exercice / URL / SHA ; inconnus et ambiguïtés UNKNOWN / TO_VERIFY ; date de contrôle réelle ; extraction liée aux audits indépendants existants et à leur portée |
| Contributions | APPROVED présenté comme constat certifié ou réalisation établie | Approbation de publication et déclaration citoyenne ; aucune certification physique déduite |
| Identité | Noms libres publics ; suppression de certaines identités au dépôt | Identité publique anonyme sans consentement explicite au pseudonyme ; nom/contact privés conservés pour instruction autorisée |
| Cache et médias | Fusion public/privé alimentant les pages publiques | Projections séparées ; liste explicite des champs publics ; signatures privées jamais réutilisées publiquement |

### Contrôle des sources, sans mutation distante

GET HTTPS en lecture seule, réponse binaire vérifiée comme PDF, SHA-256 calculé sur les octets complets. Les cinq PDF DGBF acquis sont identiques aux empreintes ci-dessous. Contrôle des pages : LFI 583, annexe 4 1229, annexe 6 179, annexe 7 89, annexe 8 322. Aucune extraction financière nouvelle n’est certifiée par ce téléchargement. Seuls les contrôles indépendants déjà traçables LFI / DPPD-PAP conservent leur statut d’extraction, limité à leur périmètre documentaire.

| Fichier | HTTP le 12/10/2026 | Octets reçus | SHA-256 du PDF acquis |
|---|---:|---:|---|
| LFI | 200 | 13706025 | f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76 |
| ANNEXE4 | 200 | 21007442 | 0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10 |
| ANNEXE6 | 200 | 11145331 | 3186dc17e1ba51ba1b69b3eed8ee3e40083a8eb0ddd56861dfdd0aa4b8c9bb2e |
| ANNEXE7 | 200 | 10849930 | 567810702fb7ed7cb83945a0af18ef23ee52bf617a305bac36243c08de4a1842 |
| ANNEXE8 | 200 | 13841186 | b3c2d9b90d847fdefb20d100c606cba0b6430e00f94306da6377ce56014128fc |
| RAP | 404 | 108203 | Aucune empreinte calculée : réponse non PDF |
| CAIDP | 404 | 28985 | Aucune empreinte calculée : réponse non PDF |

- LFI : [URL contrôlée](https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf), 2026-10-12T10:30:17.907Z.
- ANNEXE4 : [URL contrôlée](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf), 2026-10-12T10:30:16.049Z.
- ANNEXE6 : [URL contrôlée](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-6-Budgets-des-EPN-2026.pdf), 2026-10-12T10:30:12.596Z.
- ANNEXE7 : [URL contrôlée](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-7-Dotations-des-Institutions-2026.pdf), 2026-10-12T10:30:07.808Z.
- ANNEXE8 : [URL contrôlée](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-8-Concours-financiers-aux-collectivites-territoriales-et-aux-districts-autonomes-2026.pdf), 2026-10-12T10:30:15.462Z.
- RAP : [URL contrôlée](https://www.dgbf.ci/wp-content/uploads/2024/04/Rapport-Annuel-de-Performance-2022.pdf), 2026-10-12T10:30:05.987Z.
- CAIDP : [URL contrôlée](https://caidp.ci/uploads/86dc0b7227c41f5053334147b7ec76a6.pdf), 2026-10-12T10:30:05.067Z.

Le RAP conserve uniquement l’empreinte historique `b62b716caf5efe9ce8fa6f5edfa853e530f2fb183ff4530689950553ba346156`, enregistrée lors d’une acquisition antérieure. Aucun hash n’est attribué aux pages d’erreur HTTP 404.

### Confidentialité et limites

- La vue SQL existante `public_citizen_proofs` masque nom réel, téléphone, identifiant utilisateur, code de suivi et notes de modération. Les politiques du dépôt ont été exécutées localement avec PGlite : anonymes refusés sur la table privée, autres citoyens isolés, propriétaires et modérateurs autorisés. Aucune inspection ou écriture de la base distante ; le déploiement effectif de ces règles reste à confirmer par le responsable avant mise en production.
- Les getters publics ne reprennent aucun nom/contact/champ privé ni coordonnées GPS dédiées du dossier privé. Le filtre propriétaire est explicite pour les non-modérateurs. L’historique privé et les preuves restent accessibles dans le circuit autorisé.
- Aucun consentement de pseudonyme public n’existe dans le schéma actuel : anonymat public systématique. Le nom et le contact ne sont plus enregistrés dans les nouveaux brouillons localStorage ; ils restent dans le formulaire puis dans le dépôt privé.
- Le commentaire, le repère du chantier et les médias sont des contenus destinés à la publication après modération. Leur rédaction/anonymisation humaine reste nécessaire ; les tests ne certifient pas l’absence de données personnelles dans du texte libre ou une image. L’ajout GPS est volontaire, arrondi par le mécanisme existant et explicitement présenté comme localisation publique du chantier. Aucun changement SQL ou Storage.
- La disponibilité des liens externes peut changer ; les états affichés sont datés. La certification CAIDP et l’extraction RAP / annexes 6, 7, 8 demeurent bloquées dans ce catalogue.
- Les avertissements Vite de taille des bundles préexistants restent hors périmètre. Dépendances, Tailwind, PR #33, migrations et montants financiers inchangés.

### Validation

Base PR #48 : 55 fichiers, 694/694 tests réussis localement. Les quatre premiers tests adversariaux du catalogue échouaient avant correction. Résultats finaux et CI à reporter après exécution. Les commandes locales utilisent `--configLoader native` et un préchargement local de `__dirname` pour contourner l’accès esbuild interdit à un dossier parent Windows ; aucune configuration du dépôt n’est modifiée. GitHub Actions utilisera les scripts standard sous Node 22.

Critères : suite complète, TypeScript, builds public/revue ; liens exacts et HTTP daté ; aucun certificat tiré de APPROVED ; anonymat public et identité privée préservée ; rendu navigateur à 390/640/768/1024/1440 px. Les essais de dépôt utilisent exclusivement un stockage simulé local, aucune écriture Supabase.

NEXT_EXECUTABLE_TASK : revoir la PR corrective et sa CI ; confirmer les politiques distantes en lecture seule avant une éventuelle mise en production autorisée. Ne pas fusionner #48 seule en conservant ses anciens bloqueurs.
