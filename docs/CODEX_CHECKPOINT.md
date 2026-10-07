# Checkpoint — 29 septembre 2026 (Relais Antigravity après Codex)

## 7 octobre 2026 — reprise LOT 5, arrêt BLOCKED

Branche `overnight/lots-5-15` créée depuis le commit LOT 5 existant `9512311618ed0d5af39ea47f98fd7d2485e9607f` de la PR #28, descendant de la baseline `8145c0423482438cc4cc2fc89af68cb399b06ebc`. Aucun merge, aucune réimplémentation concurrente ni modification de la branche de l'autre agent.

Les deux PDF officiels DGBF ont été téléchargés (HTTP 200), hachés et conservés dans `/tmp/suivibudget-lot5-documents/`. La LFI, pages PDF 49–50 et 54, établit six programmes omis dans les candidats MICOM, MSCV et METFPA, soit 78 820 000 001 FCFA. Les totaux attendus des tests existants reproduisent les sous-totaux incomplets. Le rapport hérité contient aussi des codes, pages et identités incompatibles avec les sources et les registres.

20 fichiers / 350 tests PASS ; `npm run build` PASS (avertissement de taille des bundles). La réussite technique ne résout pas le blocage financier. Sources, contrôles LFI indépendants et rapport détaillé dans `docs/budget-ingestion/LOT5_DOCUMENT_MANIFEST.json`, `LOT5_INDEPENDENT_LFI_CONTROLS.json` et `LOT5_RESUMPTION_BLOCKED.md`.

LOT 5 = BLOCKED ; LOTS 6 à 15 non commencés conformément à la condition d'arrêt. Données protégées et canoniques hérités conservés. REMOTE_SUPABASE_WRITES=0, MASTER_MODIFIED=FALSE, MERGE_PERFORMED=FALSE. Aucun contrôle humain intermédiaire demandé ; aucune validation finale du LOT 5 annoncée.

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

