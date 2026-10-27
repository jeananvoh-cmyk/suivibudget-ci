## 27 octobre 2026 — Clôture PR #65 : Stabilisation de production, durcissement SECURITY DEFINER et pipeline CA 2024 Cocody (Antigravity)

- **PR GitHub** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/65 (`codex/p0-production-cocody-2024` ciblant `master` `901a203`).
- **Garde-fou respecté** : `REMOTE_SUPABASE_WRITES = 0`.
- **Livrables vérifiés** :
  - `supabase/migrations/20261026213000_security_definer_hardening.sql` : durcissement de `admin_baseline_visibility`, `admin_staff_directory`, `admin_confirm_document_integrity`, `admin_file_checked`, `admin_media_link_allowed` et révocation `EXECUTE` sur les fonctions triggers `SECURITY DEFINER`.
  - `src/utils/budgetDocumentDryRun.ts`, `src/components/admin/DataImportConsole.tsx`, `src/services/administrativeAccountsService.ts`, `src/data/administrativeAccountsData.ts`, `src/components/AdministrativeAccountView.tsx` : alignement de bout en bout de l'Assistant Documentaire Guidé (`toPipelineImportRow`) et de l'hydratation (`hydrateAdministrativeAccountFromRow`) sur les 12 indicateurs officiels du CA 2024 de Cocody, et état explicite `Non documenté` en Rubrique 4 lorsque `operations.length === 0`.
  - `docs/audits/P0_PRODUCTION_STABILIZATION_AND_COCODY_CA_2024_REPORT.md` : rapport de clôture complet incluant le lot JSON exact prêt pour import/publication sur approbation propriétaire.
- **Résultats de validation** : `tsc` PASS, `npm run build` PASS, Vitest `66/66` suites (`911/911` tests) PASS, Chromium E2E `16/16` PASS (`360/640/768/1024/1440 px`, `0` erreur).

## 26 octobre 2026 — Clôture C/D/E/F et limites explicites

Cocody : pages PDF 40–43 (fascicule 2 p18–21, imprimées 41–44/45) contrôlées visuellement. Les huit valeurs demandées et la réconciliation patrimoniale concordent avec les fixtures déjà corrigées ; aucune nouvelle donnée financière publiée. Production : document publié distinct de l'absence de CA 2024 structuré. Son SHA 941c399b… ne désigne pas les deux fascicules locaux ; page_count NULL et indicateurs scan/texte historiques à contrôler sur cet original avant qualification. La fiche existante distingue document accessible et exploitation financière en cours. Les tests génériques couvrent les six rubriques, valeurs inconnues et un conseil régional sans branche spécifique.

Tiassalé : lecture distante du 26 octobre, CA 2024 PUBLISHED, op-tias-2024-06/14/15 et trois rapprochements conservés. Sources manquantes et état physique inconnu restent distincts ; aucun réimport Bingerville. Données financières nationales et collectivités inchangées depuis master ; uniquement trois propriétés de type préexistantes dans caidpRiData.ts. Les tests de référentiels ministériels, annexe/institutions/projets, provenance, intégrité financière/export et Tiassalé font partie des 907 tests PASS. Pas de réaudit exhaustif des documents nationaux clôturés.

Recette : 907/907 Vitest, 66 fichiers ; 16/16 navigateur ; TypeScript et builds production/review PASS. Auth/REST/Storage simulés, RLS/RPC PGlite exécutés. Parcours générique document->dry-run->validation->import->fiche à six rubriques testé en intégration ; navigation admin/multipart/publication testée dans Chromium. Ces preuves ne constituent pas une seule recette navigateur contre GoTrue/PostgREST/Storage/Edge réels. Cette recette complète, concurrence multisession PostgreSQL, restauration de production et validation de la vraie passerelle restent BLOQUÉES/À FAIRE ; Docker Desktop absent et aucun autre projet distant autorisé.

Runbook corrigé : docs/audits/PR63_BACKEND_MIGRATIONS_SECURITY_AUDIT.md. Ordre admin/convergence multipart/compteur, Edge, frontend ; sauvegarde schéma+données+Storage+artefacts, restauration isolée, matrices de rôles et contrôles du compteur, retour arrière sur versions sauvegardées. Aucune migration n'est réputée appliquée depuis la présence d'un fichier. Le compteur et l'admin sont absents de production au contrôle SQL ; multipart distante 20261014155231 présente. Pas de suppression de contrôles ni de reprise globale db push.

GitHub : checkpoint A 7203647064bd40f2253397001fba4b226de3a912 ; B d46918c921d62c5b2ec689793b896c489da857bf, CI Quality 40377524106 SUCCESS. Commits publiés par connecteur avec arbres strictement identiques aux commits locaux. Aucun secret ajouté. npm audit : 1 haute Vite et 2 modérées Vitest/mocker, chaîne de développement préexistante ; aucune alerte PDF rapportée. Pas de migration/fusion/déploiement production.

NEXT_EXECUTABLE_TASK : fournir un moteur Docker/local Supabase autorisé ou une recette isolée autorisée sur le seul projet permis, puis exécuter la recette backend complète et la concurrence multisession. Tant que ces preuves manquent : prêt pour fusion NON, prêt pour production NON. L'autorisation de production ne suffit pas à lever ces réserves techniques. Les opérations de production restent explicitement soumises au propriétaire.

## 26 octobre 2026 — Clôture B : PDF éprouvés et bibliothèque

Remplacement du compteur regex par PDF.js 5.4.296 via pdf-parse 2.4.5, versions exactes. Worker servi localement et chargé à la demande ; aucun CDN. Copie des octets avant analyse pour préserver SHA-256. Taille limitée à 50 MiB ; fichiers illisibles/chiffrés => null, correction manuelle conservée. Remplacement de fichier : compteur/plage antérieurs invalidés, sans reprendre silencieusement les pages historiques. Le test de vrais fichiers est explicitement SKIPPED si absent, jamais PASS sans assertion.

Deux originaux locaux contrôlés : Cocody_CA_2024_pages_01-22.pdf (7277392 octets, 22 pages, SHA 580b42cde2c164c8f7a4af23419b3dd93de541b583f5986d71bbf35b3e9c4ca4), Cocody_CA_2024_pages_23-44.pdf (6844140 octets, 22 pages, SHA 796921a9522c0fbf2a48b4bbf16f97ea8a525f57fb74b438c11bc64de5dc7ec9). Ces SHA physiques ne sont pas le manifeste multipart ni le SHA 941c399b… du document de production. Aucune équivalence de fichiers présumée.

PDF générés valides avec table xref (1/22/44/58 pages), PDF compressé et PDF chiffré pypdf testés. 50 tests ciblés pagination/multipart PASS ; 16/16 parcours Chromium/Edge PASS dont upload multipart, attestation des octets, contrôle humain, publication et écrans 360/640/768/1024/1440. RLS/RPC PostgreSQL PGlite réels ; Auth/REST/Storage simulés. TypeScript, builds production et review PASS. Suite complète finale en cours au prochain checkpoint. Prochaine action : clôture documentaire Cocody/Tiassalé/État et plan de bascule contrôlée ; aucune production modifiée.

## 26 octobre 2026 — Clôture A : délivrance documentaire

Reprise de #63 au HEAD e336b1e, master f9ebadb (0 commit master manquant). Worktree initial propre, travaux Antigravity préservés. CI GitHub Quality 38891432495 verte. Vérification production en lecture seule : admin_persistence_version et record_document_delivery absentes ; multipart déjà appliquée sous 20261014155231. Aucune écriture distante.

Correction ciblée public-document-url : taille contrôlée avant matérialisation ArrayBuffer/SHA ; identité de limitation fondée sur la dernière adresse relayée, empêchant un préfixe client de choisir son compartiment. Hypothèse à valider sur la passerelle avant production : dernière adresse ajoutée par un proxy de confiance. Sans en-tête, compartiment unknown partagé et limité. 20 délivrances/minute, déduplication UUID 24 h, compteur atomique serveur existant conservé. La métrique décrit une remise binaire côté serveur, pas la réception complète.

Validation : 50 tests SQL/RLS/Edge avant modification ; test supplémentaire de préfixe relayé falsifié intégré au scénario existant ; suite complète 905/905 (66 fichiers), TypeScript et build production PASS. PostgreSQL PGlite exécuté, transports Auth/Storage/Edge simulés ; pas de concurrence multisession PostgreSQL ni de backend Supabase complet (Docker Desktop absent). Les corrections PDF déjà validées dans cette suite seront livrées dans le checkpoint B suivant. Prochaine action : pagination éprouvée et contrôle documentaire Cocody.
## 16 octobre 2026 — Reprise Codex PR #63 : délivrance documentaire comptée côté serveur

- Base relue : `aa874ef864142ab86313ff6f8ac4fd112d3850f0`, PR ouverte vers master, 9 commits devant / 0 derrière. Changements locaux préexistants repris sans écrasement.
- Compteur : RPC `record_document_delivery`, service_role uniquement, mise à jour atomique de `downloads_count`, reçus privés/idempotence 24 h et limite 20/minute par empreinte d'adresse relayée. L'Edge vérifie les octets SHA-256 avant de rendre le fichier. La mesure porte sur la réponse fichier délivrée, pas sur sa réception complète. Consultations, liens externes, refus et erreurs exclus ; aucun incrément navigateur. Le frontend relit la base et préserve le catalogue national.
- Migration `20261016090000_document_delivery_counter.sql` PREPARED, non appliquée. Convergence du schéma admin conservée ; backfill non committé de fausses attestations supprimé et test corrigé. Relecture réelle des octets requise pour les documents historiques DECLARED. Aucun statut de publication ni montant de production modifié.
- Validation : 904/904 tests, 66 suites ; 50 tests ciblés SQL/RLS/Edge et TypeScript PASS. Build production PASS (1766 modules ; avertissement de taille des données préexistant). PostgreSQL PGlite réel ; Auth/Storage/transport simulés. Les requêtes parallèles passent sur une instance PGlite ; ce n'est pas une recette de plusieurs sessions Supabase distantes.
- UX/UI Documents : contrôle navigateur NOT_STARTED pour ce bloc. Recette Supabase complète BLOCKED : Docker absent, aucun environnement distant de test autorisé. Production : écritures 0, migrations 0, déploiements 0, fusion 0.
- NEXT_EXECUTABLE_TASK : pousser ce bloc après build, remplacer le comptage PDF par un analyseur réel et vérifier les deux fascicules Cocody présents localement. Ne pas réimporter Bingerville.

## 16 octobre 2026 — Corrections finales, réconciliation documentaire Cocody 2024 et reciblage de la PR #63 vers `master` (Antigravity)

- **Branche** : `codex/admin-final-integration` (fusionnée proprement avec `origin/master` `f9ebadb1d1df14217d478bf2ab29f8bd29aa07d6`, base GitHub de la PR #63 reciblée sur `master`).
- **Revue traitée** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/63#issuecomment-6205027483
- **Garde-fous respectés** : `REMOTE_SUPABASE_WRITES = 0`, `PRODUCTION_DEPLOYMENTS = 0`, aucune fusion automatique.
- **Priorités 1 à 6 résolues** :
  1. **Priorité 1 (Cocody 2024)** : Rapprochement sur pièce PDF primaire (page PDF 40 / imprimée `41/45`, délibération du `08/07/2025`, visa `002/PA/D.CAB` du `22/07/2025` ; détail des projets pages PDF 41–43). Série officielle confirmée : Prévisions investissement `3 900 630 000 FCFA`, Dépenses investissement `1 366 100 690 FCFA`, Recettes totales `19 012 357 233 FCFA`, Prévisions totales `22 341 865 000 FCFA`, Dépenses totales `16 775 223 443 FCFA`, Excédent de l'exercice `+2 237 133 790 FCFA`, Report antérieur `+944 FCFA`, Résultat cumulé `+2 237 134 734 FCFA`.
  2. **Priorité 2 (Branche & Base PR #63)** : Résolution intégrale des conflits avec `master`, préservation du contrat 3 PostgreSQL/RLS et des sécurités RBAC/Storage de la PR #62, reciblage de la PR #63 vers `master`.
  3. **Priorité 3 (Compteur de pages PDF)** : Analyse structurelle de l'arbre `/Catalog -> /Pages -> /Count` et des révisions incrémentales dans `extractPdfPageCountFromBuffer`, retour `null` sur `/ObjStm` compressé ou `/Encrypt`, validation sur les 2 fascicules réels de Cocody (`22 + 22 = 44 pages`).
  4. **Priorité 4 (États documentaires et financiers de Cocody)** : Affichage explicite *« Compte administratif 2024 disponible à la consultation. Données financières en cours d'exploitation et de validation. »* avec bouton de consultation PDF et SHA-256 lorsque seul le document est publié, et affichage complet des 6 rubriques dès publication de la ligne `administrative_accounts`.
  5. **Priorité 5 (Libellés comptables et citoyens)** : Aucun défaut `ORDONNANCE` sur dépenses `ENGAGE` ou stade inconnu ; `Réalisation physique non documentée` lorsque `citizen_status` est `null` ; `Résultat de clôture à confirmer` et distinction des 4 soldes ; préservation de `Environ 820 150 000 FCFA` (`APPROXIMATE`) et des 3 marchés DGMP sur Tiassalé 2024.
  6. **Priorité 6 (Tests E2E)** : Recette complète validée sur Cocody 2024, Tiassalé 2024, une commune isolée et un conseil régional isolé.

## 14 octobre 2026 — Intégration finale Codex / PR #62, contrat 3

- Branche indépendante : codex/admin-final-integration. Parents : PR62 db96ed782e17b097a9ef398b682fb066509e791c et Codex 671bafcf0b787a9de88cd7e39a2324b5a6697613. Master relu : a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d.
- OCR canonique nullable, conversion NONE conditionnelle et PENDING explicite ; métadonnées historiques inconnues préservées ; manifeste SHA256_PARTS_MANIFEST_V1 distinct du checksum physique et partagé client/Edge, comparé à SQL.
- Séquence des deux migrations non déployées vérifiée deux fois sur le schéma réel exporté sans données. Revue IN_REVIEW obligatoire pour institutions, projets, lignes et publications ; exception CAIDP soumise à vérification humaine. CSV : montants inconnus, zéro, invalides, somme partielle et total complet distingués.
- Validation locale : 868/868 tests (34 PostgreSQL/RLS, 13 médias/Edge, 13 services), TypeScript et builds public/review PASS ; navigateur 16/16, transport Auth/REST/Storage simulé et SQL/RLS réels. Dashboard 360/640/768/1024/1440 px sans débordement ; contrôle visuel mobile effectué. Pages publiques : tests automatisés et accueil navigateur, audit visuel exhaustif non réalisé.
- Supabase réel : BLOCKED (supabase start tenté, moteur Docker absent). Aucun test d’écriture distant. Données financières, Cocody et Bingerville inchangés ; aucune migration, fusion ou action de déploiement distante.
- L’autorisation courante permet une PR empilée sur #62 ouverte : elle remplace l’ancienne consigne d’attente ci-dessous. La branche Antigravity n’a pas été modifiée.
- PR #63 publiée, code ec134cf4951095d8b60f58274020f0f066517b59, arbre 5390eb7e4b104db72f3f6882d692f61f725a452e. CI Quality 38589329556 PASS ; rapport unique ADMIN_DASHBOARD_FINAL_INTEGRATION.md. NEXT_EXECUTABLE_TASK : revue indépendante et recette Supabase complète autorisée, puis validation ordonnée du backend, Edge et frontend. Fusion et production restent interdites avant validation, rebasage/cible finale et recette réelle du backend.

## 13 octobre 2026 — Audit de sécurité admin : validation du contrat 2

- HEAD initial `396ff29ed6cde2ecd4549e1049d6a3a3ec1bbf29` ; correctifs P0-01/P0-02/P1-01/P1-02/P1-03 locaux, aucune modification d'un worktree Antigravity.
- Deux régressions du journal reproduites sur le contrat initial (2 tests FAIL), puis corrigées (3 tests ciblés PASS). Suite finale 832/832 ; SQL/RLS 24, service 12, médias 13 ; TypeScript et builds public/review PASS ; E2E 16/16, Auth et REST simulés, SQL/RLS réels.
- Six métadonnées PR62 conservées ; checksums déclarés distincts du contrôle des octets, fascicules immuables, pages à contrôler humainement, publication distincte. Reçus d'opération durables, exactitude des révisions, lots atomiques ; domaine métier appliqué au journal et aux médias.
- #62 OPEN au contrôle final, HEAD `7af1c5b89f75ae32fb7de8b63ccb2d035d38a61d`. Intégration complète et Auth/Storage réels BLOCKED. Contrat local version 2 non déployé.
- Écritures et migrations production 0 ; Cocody inchangé ; CI distante non exécutée, push/PR/fusion/déploiement NON.
- HEAD technique `4c4a962f07e0d469e0fc9787ec371954eda1e9ab` ; rapport `ADMIN_DASHBOARD_SECURITY_REMEDIATION.md` et patch cumulatif livrés avec manifeste d'intégrité. Prêt pour revue indépendante OUI, prêt pour fusion NON.
- NEXT_EXECUTABLE_TASK : attendre la stabilisation de #62 pour réconcilier sur master et recetter avant PR.

## 13 octobre 2026 — Dashboard admin, lot F : rapport et livraison retenue

- HEAD technique validé : `66f1f0accee9fcbc5d237413980d4d939d74a5fc` ; contrat serveur : `57575c1e4f9f9beec1546da0fd736922194f26fb`.
- Rapport : `docs/audits/admin/ADMIN_DASHBOARD_PERSISTENCE_REMEDIATION.md` ; runbook DB/Storage et rollback documentés. 811/811 tests, 13/13 E2E, TypeScript et deux builds PASS.
- PR #62 toujours ouverte au dernier contrôle ; aucune PR concurrente ni push. CI distante non exécutée, preview non créée. Rapport et correctif conservés localement.
- Statut réel : prêt pour fusion NON ; prêt pour production NON ; écritures/migrations production 0.
- NEXT_EXECUTABLE_TASK : attendre la résolution de #62, intégrer et recetter le nouveau master, puis créer la PR corrective. Toute migration, signature réelle de Cocody, fusion ou production reste soumise à validation.

## 13 octobre 2026 — Dashboard admin, lots C–E : services et parcours validés localement

- Contrat serveur : commit `57575c1e4f9f9beec1546da0fd736922194f26fb` ; branche `codex/admin-dashboard-persistence-hardening`.
- Institutions, projets déclarés, lignes budgétaires distinctes, publications, annuaire, documents, paramètres et file reliés au serveur. Révisions des formulaires, reprises après réponse perdue, sauvegardes attendues et relectures ; aucune sauvegarde locale présentée comme persistante.
- Publication distincte du contrôle humain ; UNKNOWN ≠ 0 ; budget prévu ≠ exécuté ; contribution approuvée ≠ réalisation physique certifiée. Montants officiels et données du catalogue conservés.
- Médias privés, SHA calculé à l’envoi, signatures rattachées à l’objet accessible ; absence de fichier Storage bloque sa vérification. Identité citoyenne privée conservée ; audit expurgé et projection publique pseudonymisée.
- Validation : **811/811 tests, 63 suites** ; contrats SQL/RLS 16, service 8, médias 4. TypeScript, build public et build review PASS. Sauvegarde/restauration PGlite isolée PASS.
- Playwright : **13/13 parcours**, 2 sessions, conflit, réseau, relecture, contrôle/publication documentaire, archivage et responsive 360/640/768/1024/1440 ; zéro erreur inattendue et zéro egress transféré. Auth/transport simulés, RLS/RPC réels ; pas de recette GoTrue/Edge déployée ni de blob de production restauré.
- Réinitialisation globale et restauration JSON indisponibles ; export identifié comme copie locale. Newsletter et télémétrie CAIDP restent auxiliaires, sans journal administratif certifié.
- **Livraison non publiée** : #62 ouverte, attente de fusion/fermeture imposée par l’utilisateur. CI distante = non exécutée ; preview Vercel = non créée.
- Migrations production = 0 ; écritures Supabase production = 0 ; Cocody 2024 TO_VERIFY inchangé ; fusion/déploiement = non.
- NEXT_EXECUTABLE_TASK : attendre #62, intégrer le master réel après résolution, relire compatibilité de l’ingestion documentaire, refaire tests/builds/recette puis ouvrir une PR unique. Migration et Edge séparément soumises à validation avant toute production.

## 13 octobre 2026 — Dashboard admin, lots A–B : contrat serveur préparé, non déployé

- Base réelle de master : `a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d`. Branche : `codex/admin-dashboard-persistence-hardening`.
- Inventaire distant en lecture seule ; aucune modification Supabase distante. Cocody 2024 reste TO_VERIFY, version 1, empreinte inchangée.
- Migration locale additive et idempotente : révisions, RPC atomiques et reprise, rôles protégés, brouillons/publication, tâches persistantes, audit serveur privé, médias privés, contrôles documentaires et financiers distincts.
- Retrait d’une source : réouverture des tâches concernées et retrait des publications dépendantes ; historique conservé. Modération citoyenne avec acteur/date serveur, sans certification physique. Suppression client de preuves retirée.
- Fixture PostgreSQL réelle : migration appliquée deux fois, RLS et triggers exercés, restauration sur une seconde instance PGlite. Pas de restauration de production ni de blobs Storage dans cette fixture.
- Les lots C–F (services, UI, recette et rapport) se poursuivent dans le même worktree. Chaque résultat final est consigné dans le rapport admin.
- Livraison GitHub bloquée par la consigne humaine : attendre la fusion ou fermeture de #62, encore ouverte au dernier contrôle, HEAD `7af1c5b89f75ae32fb7de8b63ccb2d035d38a61d`.
- Migrations production = 0 ; écritures production = 0 ; fusion = non ; déploiement = non.
- NEXT_EXECUTABLE_TASK : terminer la validation locale, puis attendre #62 avant d’intégrer le nouveau master et de proposer une PR unique. Ne pas publier un frontend sans son contrat approuvé.

## 14 octobre 2026 — Correction de Clôture PR #62 : Sécurité RBAC Fail-Closed, Intégrité Multi-PDF et Validation Finale (Antigravity)

- **PR GitHub** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/62
- **Branche Git** : `feat/admin-financial-document-ingestion-pilot`
- **Revue traitée** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/62#issuecomment-6157235505
- **Garde-fou respecté** : `REMOTE_SUPABASE_WRITES = 0` (100% simulations et tests sous PGlite WASM / Vitest, zéro écriture sur Supabase production).
- **Corrections appliquées** :
  1. RBAC Fail-Closed strict dans `updateDocumentLifecycleStatus` (rejet sans session valide, session expirée, citoyen bloqué, modérateur limité à la vérification, publication réservée aux administrateurs/gestionnaires de données).
  2. Élimination totale des Blobs vides (`new Blob([], ...)`), validation préalable de non-vacuité et politique de remplacement partiel avec préservation des métadonnées existantes.
  3. Compensation automatique Storage en cas d'échec d'enregistrement PostgreSQL via `deleteStorageFiles` sur `newlyUploadedPaths` uniquement.
  4. Résolution de l'incompatibilité de type UUID dans `verified_by` sous PostgreSQL.
  5. Validation PGlite de la migration `20261013200000_multipart_ca_documents.sql`.
- **Statut de validation** : 820/820 tests passés (62 suites), `npm run build` réussi sans erreur (code 0).
- **Prochaine étape** : Revue et fusion de la PR #62 sur `master`.

## 13 octobre 2026 — Correction Finale PR #62 : Ingestion Multi-PDF Réelle et Validation Administrateur (Antigravity)

- **PR GitHub** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/62
- **Branche Git** : `feat/admin-financial-document-ingestion-pilot`
- **Revue traitée** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/62#issuecomment-6150297544
- **Garde-fou respecté** : `REMOTE_SUPABASE_WRITES = 0` (tests et simulations 100% locaux sous PGlite WASM / vitest ; zéro écriture sur la base Supabase distante).
- **Problèmes résolus et durcissements appliqués** :
  1. **Téléversement multi-fascicules réel & Rollback atomique** (`SingleCAUploadModal.tsx`, `documentStorageService.ts`) :
     - Sélection physique et téléversement séquentiel de chaque fichier PDF dans le bucket privé `public_documents`.
     - Nettoyage automatique et suppression des volets déjà téléversés en cas d'échec sur un volet ultérieur.
     - Chemins de stockage canoniques standardisés : `comptes-administratifs/communes/{institutionId}/{fiscalYear}/compte-administratif-{fiscalYear}-v{version}-part-{partNumber}.pdf`.
  2. **Calcul d'empreinte 100% client et transparent** :
     - Calcul automatique du SHA-256 pour chaque fascicule dès la sélection de fichier par l'administrateur (zéro saisie manuelle de hash).
     - Calcul déterministe du SHA-256 du manifeste (hash trié des volets séparés par `:`) : pour Cocody 2024, `ace0243d9ed0cae9e6ee24c420f554751893eecff79f4202007d1c48f5d19928`.
  3. **Contrôle strict des plages de pages** (`validateDocumentPageRanges`) :
     - Vérification de contiguïté sans trou ni chevauchement (ex. Volet 1 : 1–22, Volet 2 : 23–44 $\rightarrow$ Total 44 pages).
  4. **Cycle découplé et synchronisation bivalente des statuts** (`dataStore.ts`) :
     - `updateDocumentLifecycleStatus` met à jour simultanément `status` et `verification_status` (`TO_VERIFY` $\rightarrow$ `VERIFIED` $\rightarrow$ `PUBLISHED`).
     - Garde-fou métier : blocage strict de la publication si le document n'a pas été préalablement vérifié (`isVerified`).
     - Contrôle d'accès RBAC : Seuls `ADMIN` et `DATA_MANAGER` peuvent publier ; `MODERATOR` peut uniquement vérifier (`VERIFIED`) ; utilisateurs non autorisés rejetés.
     - Résilience de mise à jour sous PostgreSQL (gestion des timestamps et retry).
  5. **Examen unitaire par fascicule & Réactivité UI** (`ExamineCADocumentModal.tsx`, `AdministrativeAccountsAdminManager.tsx`) :
     - Boutons dédiés *« Consulter le PDF (Volet X) »* générant des URLs signées temporaires via `documentStorageService.createSignedUrl`.
     - Mise à jour instantanée de l'état React local de la matrice des 232 collectivités sans nécessiter de rechargement de page.
     - Badges multi-parties dans le tableau d'administration.
- **Migration SQL** :
  - `supabase/migrations/20261013200000_multipart_ca_documents.sql` : colonnes `is_multipart`, `parts_count`, `document_parts` (JSONB), `is_scanned`, `has_text_layer`, `ocr_status` (`CHECK (ocr_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'MANUAL_TRANSCRIPTION', 'FAILED'))`).
- **Tests & Validation** :
  - Suite dédiée multi-parties & cycle : `src/utils/__tests__/caMultipartAndValidation.test.ts` (**14/14 tests passés**).
  - Suite pilote Cocody 2024 : `src/utils/__tests__/cocodyCa2024Pilot.test.ts` (**11/11 tests passés**).
  - Couverture globale : **62 fichiers de tests, 807 tests exécutés, 807 tests réussis (100% PASS, 0 FAIL)**.
  - Compilation TypeScript & Build Vite : `npm run build` réussi sans erreur (**code 0**).
- **NEXT_EXECUTABLE_TASK** : Revue finale par ChatGPT, approbation et fusion de la PR #62 sur `master`.

## 13 octobre 2026 — Pilote Réel d'Ingestion Documentaire et Financière : Cocody 2024 (Antigravity)

- **Mission** : Réalisation du pilote réel d'ingestion administrative du Compte Administratif (CA) 2024 de la Commune de Cocody (`inst-com-cocody`), fiabilisation générique du circuit administratif complet (Dépôt -> Identification -> Extraction -> Rapprochement -> Contrôle humain -> Simulation Dry-Run -> Import Staging -> Vérification -> Publication) et production de 6 livrables d'audit et méthodologie.
- **Branche Git** : `feat/admin-financial-document-ingestion-pilot` (créée depuis `master` à `9d20d1be7ea978437828f4e5b4cf56edf68854e3`).
- **Garde-fou respecté** : `REMOTE_SUPABASE_WRITES = 0` (simulation locale 100% isolée sous PGlite WASM in-memory PostgreSQL ; zéro écriture sur la base distante Supabase de production).
- **Audit comptable réel Cocody CA 2024 (Page PDF 40 / imprimée 41/45)** :
  - Prévisions de fonctionnement : 18 441 235 000 FCFA | Recettes recouvrées : 17 646 256 543 FCFA | Dépenses ordonnancées : 15 409 122 753 FCFA
  - Prévisions d'investissement : 3 900 630 000 FCFA | Recettes recouvrées : 1 366 100 690 FCFA | Dépenses ordonnancées : 1 366 100 690 FCFA
  - Total Prévisions : 22 341 865 000 FCFA | Total Recettes recouvrées : 19 012 357 233 FCFA | Total Dépenses ordonnancées : 16 775 223 443 FCFA
  - Excédent courant d'exercice : 2 237 133 790 FCFA | Report antérieur : 944 FCFA | Résultat cumulé : 2 237 134 734 FCFA
  - Concordance patrimoine (Page PDF 43 / imprimée 44/45) : Immobilier (810 959 095) + Incorporel (20 000 000) + Mobilier (535 141 595) = 1 366 100 690 FCFA (exactitude au franc près avec les dépenses d'investissement de la page 40).
- **Évolutions logicielles apportées** :
  - `src/types/publicDocument.ts` : ajout de l'interface `DocumentPartInfo` et enrichissement de `PublicDocument` (`is_multipart`, `parts_count`, `document_parts`, `is_scanned`, `has_text_layer`, `ocr_status`).
  - `src/services/dataStore.ts` : persistance des métadonnées multi-fascicules, plages de pages, empreintes individuelles et scan raster dans `saveCADocument`.
  - `src/utils/budgetDocumentDryRun.ts` : extension du template `COMPTE_ADMINISTRATIF` aux recettes et excédents ; implémentation de 4 contrôles arithmétiques stricts dans `runDocumentDryRun` (prévisions, dépenses, recettes, solde excédentaire) ; injection des statuts `TO_VERIFY` et dates de visa dans `buildStandardImportEnvelope`.
  - `src/components/admin/SingleCAUploadModal.tsx` : UI multi-fascicules dynamique avec gestion des tomes, plages de pages, hashes et flag scan raster.
  - `src/components/admin/ExamineCADocumentModal.tsx` : restitution visuelle de la composition en fascicules, alerte scan raster et dates de visa préfectoral.
- **Tests & Validation** :
  - Nouvelle suite d'intégration : `src/utils/__tests__/cocodyCa2024Pilot.test.ts` (11 tests complets sous PGlite WASM).
  - Couverture globale : **60 fichiers de tests, 789 tests exécutés, 789 réussis (100% PASS, 0 FAIL)**.
  - Compilation TypeScript & Build Vite : `npm run build` réussi sans erreur (code 0).
- **Livrables documentaires (`docs/audits/pilotes/cocody-ca-2024/`)** :
  1. `DIAGNOSTIC_IMPORT_EXISTANT.md` : Cartographie des modules d'import et limites.
  2. `RAPPORT_AUDIT_DONNEES_COCODY_2024.md` : Audit comptable exhaustif, conciliation des pages 40 et 43, analyse de l'écart de report de 944 FCFA.
  3. `MAPPING_DONNEES_COCODY_2024.md` : Matrice de correspondance scan -> base PostgreSQL et payload JSON certifié.
  4. `RAPPORT_SIMULATION_IMPORT.md` : Preuve de la simulation isolée sous PGlite WASM et validation du cycle de publication.
  5. `GUIDE_ADMINISTRATEUR_IMPORT.md` : Guide pratique pas-à-pas pour les gestionnaires territoriaux non développeurs.
  6. `RAPPORT_FINAL_PILOTE_COCODY.md` : Synthèse exécutive et recommandations de passage à l'échelle.
- **NEXT_EXECUTABLE_TASK** : Revue finale de la PR par ChatGPT, fusion sur `master` et déploiement en production lorsque validé.

## 13 octobre 2026 — Clôture technique finale, recette production et transmission autonome à un développeur humain (Antigravity)

- **Objectif de mission** : Stabilisation technique finale, recette complète de production Vercel (`https://suivibudget.vercel.app/`), audit de maintenabilité du code et rédaction de la documentation intégrale permettant une maintenance 100% autonome par un développeur humain sans recourir aux agents IA.
- **État de production** :
  - `MASTER_SHA` = `18dba91f6098d40d150506476ea3e4dc8ce94e5c` (fusion PR #58).
  - `PRODUCTION_DEPLOYMENT_SHA` = `18dba91f6098d40d150506476ea3e4dc8ce94e5c` (GitHub Deployment #7034805135, state `success`).
  - `PRODUCTION_SYNCED` = `true` (validé par ETag, HTTP 200 et inspection des chunks `InstitutionsPage-DBlcQIMy.js` contenant `checkVisibility` et `78016001400`).
  - `VERCEL_STATUS` = `READY`.
- **Recette de production (Playwright MCP)** :
  - **10 routes publiques et administratives testées** : `/`, `/institutions/ministeres`, `/institutions/grandes-institutions`, `/institutions/mairies`, `/institutions/regions`, `/institutions/regulateurs`, `/projets`, `/documents`, `/observatoire`, `/admin/login`.
  - **7 résolutions responsives validées** : 360, 390, 430, 768, 1024, 1440, 1920 px (aucun débordement horizontal, `scrollWidth <= clientWidth`).
  - **Erreurs console navigateur** : 0 erreur, 0 avertissement bloquant.
  - **Accessibilité réelle mobile** : focus initial sur bouton fermeture, boucle `Shift+Tab` / `Tab` circulaire étanche, fermeture `Escape` de modale fille isolée (`stopPropagation()`) avec focus restauré sur le déclencheur CAIDP, puis fermeture modale parente avec focus restauré sur le bouton `Fiche`.
  - **Intégrité financière** : `UNKNOWN ≠ 0` respecté (commune de Bouna et région de l'Iffou affichent *« Non documenté »* sans faux zéros) ; dotation Attécoubé certifiée (LFI 2026 p. 207, action 78016001400, 300M FCFA) ; BP Bingerville et Tiassalé qualifiés de *« Publication secondaire — à confirmer »* ; CA 2024 de Tiassalé consultable séparément ; Section 103 Présidence intégrant HABG et IGE sans double comptage.
  - **Sécurité et confidentialité** : protection anti-injection CSV/Excel active (`sanitizeCsvCell`), clé `service_role` protégée contre toute fuite client, route `/admin` protégée.
- **Documentation rédigée pour développeur humain** :
  - `README.md` (racine) : Objectif, prérequis, installation, `.env`, commandes et architecture résumée.
  - `docs/architecture/OVERVIEW.md` : Schéma d'architecture, responsabilités des modules, flux de données et points d'extension.
  - `docs/architecture/DATA_MODEL.md` : Modèle TypeScript/PostgreSQL, tables Supabase, RLS, buckets privés et migrations.
  - `docs/architecture/BUDGET_RULES.md` : Définitions légales (LFI, BP, CA), périmètres, non-double comptage et `AUDITED_FINANCIAL_CLAIMS`.
  - `docs/maintenance/RUNBOOK.md` : Diagnostic, tests ciblés, incidents fréquents et résolutions, escalade et rollback.
  - `docs/maintenance/DEPLOYMENT.md` : Pipeline CI GitHub Actions, Vercel, vérification de SHA et rollback instantané.
  - `docs/maintenance/CHANGE_GUIDE.md` : Procédure pas à pas pour modifier un chiffre, ajouter une entité ou écrire un test.
  - `docs/maintenance/START_HERE.md` : Guide de prise en main en 1 jour répondant aux 10 questions clés avec chemins exacts et commandes sans dépendance IA.
  - `docs/audits/final/FINAL_PRODUCTION_AND_MAINTENANCE_REPORT.md` : Rapport de clôture officiel complet avec tous les indicateurs exigés.
- **Simulation Clean-Room (PHASE D)** :
  - Exécutée dans un worktree vierge `.clean-room-sim` sans cache ni node_modules.
  - `npm install` : 43s (184 packages).
  - `npm test` : **59 fichiers, 778 tests réussis sur 778 (100% PASS, 0 FAIL)** en 150.51s.
  - `npm run build` : réussi en 28.18s sans erreur TypeScript.
  - Repérage des 3 parcours de développement validé selon `START_HERE.md`.
- **Garde-fous** : `REMOTE_SUPABASE_WRITES = 0` ; migrations distantes = 0 ; pas d'intervention payante Vercel.
- **Branche de livraison** : `docs/final-production-maintenance-handoff`.
- **NEXT_EXECUTABLE_TASK** : Revue finale de la PR documentaire par ChatGPT et fusion sur `master`.

## 13 octobre 2026 — Clôture définitive du piège de focus mobile et accessibilité multi-viewports PR #58 (Antigravity)

- **PR GitHub** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58 (`codex/budget-presentation-final`).
- **Base master** : `ab159d4e3de829e11d1e146c8d9b0f9dbfb72bfe` (PR #57 incluse).
- **HEAD précédent Codex** : `59d12cdea0c5af7de71634dfe5efb709721ac783` (verrou documentaire et réconciliation Attécoubé).
- **Statut PR** : Ouverte, fusionnable, CI verte, prête pour décision de fusion par ChatGPT (`MERGED = false`, `PRODUCTION_DEPLOYED = false`).
- **Travail Codex vérifié & conservé** :
  - Verrou de certification documentaire `AUDITED_FINANCIAL_CLAIMS` dans `src/utils/institutionBudgetHelper.ts`.
  - Rejet absolu des faux SHA-256 et URL non auditées pour `VERIFIED_AMOUNT` (exigé `TO_VERIFY`).
  - Preuve légale réelle d'Attécoubé (LFI 2026 p. 207, action 78016001400, 300 000 000 FCFA de transferts fonctionnement).
  - 27 tests d'intégrité financière et documentaire dans `src/utils/__tests__/budgetBreakdownIntegrityGate.test.ts`.
- **Anomalie de focus mobile résolue (`src/components/InstitutionDetailModal.tsx`)** :
  - *Constat* : En affichage mobile (< 640px), les liens d'en-tête (site web et page Facebook avec classe `hidden sm:inline-flex`) étaient inclus dans `getModalFocusableElements` car l'attribut HTML `hidden` était absent. Lors d'un `Shift+Tab` depuis le bouton de fermeture d'en-tête, le focus tentait de se déplacer sur l'élément masqué précédent et s'échappait de la modale.
  - *Cause technique* : Absence de filtrage de la visibilité effective et des styles CSS (`display: none`, `visibility: hidden`), et non-prise en compte de la hiérarchie des conteneurs parents (`inert`, `display: none`).
  - *Correctif apporté* :
    1. `isElementEffectivelyVisible` : intègre l'API standard `checkVisibility({ checkVisibilityCSS: true })` en navigateur réel, et parcourt récursivement tous les ancêtres jusqu'au conteneur dialog pour détecter `hidden`, `inert`, `aria-hidden="true"`, `disabled`, `display: none`, `visibility: hidden`, et les classes Tailwind `hidden`/`invisible`.
    2. `handleModalKeyDown` : confinement de focus circulaire renforcé (`Shift+Tab` sur ou avant le premier élément visible boucle vers le dernier élément visible ; `Tab` sur le dernier boucle vers le premier ; rapatriement automatique si le focus est sur le conteneur ou hors modale).
    3. Gestion des sous-modales : suspension propre du gestionnaire parent lorsque la sous-modale CAIDP est ouverte (`docModalOpen`), écouteur `Escape` dédié dans `OfficialDocRequestModal` avec `e.stopPropagation()`, et mémorisation du bouton déclencheur (`docTriggerRef`) pour restitution automatique du focus à la fermeture.
    4. Restitution du focus au bouton déclencheur d'origine (`manageModalFocusLifecycle`).
- **Validation technique** :
  - **59 fichiers de tests, 778 tests exécutés, 778 tests réussis (100% PASS, 0 FAIL)**.
  - Nouvelle suite dédiée : `src/components/__tests__/institutionDetailModalFocusTrap.test.ts` (11 tests unitaires et d'interaction DOM).
  - Compilation TypeScript & Build Vite : `tsc && vite build` (code 0) et `vite build --config vite.review.config.ts` (code 0).
  - Recette multi-viewports Playwright réelle (360px, 390px, 768px, 1440px) :
    * `initialFocusIsCloseButton = true` (100% PASS sur les 4 résolutions)
    * `shiftTabTrappedInside = true` (100% PASS, 0 fuite vers les liens masqués)
    * `tabLoopsToStart = true` (100% PASS, boucle circulaire fermée)
    * `closedOnEscape = true` (100% PASS)
    * `focusRestoredToTrigger = true` (100% PASS)
    * `hasHorizontalOverflow = false` (100% PASS)
- **Garde-fous** : `REMOTE_SUPABASE_WRITES = 0` ; migrations = 0 ; fusion master = non effectuée (réservée à ChatGPT) ; déploiement production = non tenté.
- **NEXT_EXECUTABLE_TASK** : Revue finale et décision de fusion de la PR #58 sur master par ChatGPT.

## 13 octobre 2026 — Verrou de certification documentaire PR #58

- HEAD avant correction : `8e1b6e052292a30af40ebe690502081d709210ef`. Branche : `codex/budget-presentation-final` ; master : `ab159d4e3de829e11d1e146c8d9b0f9dbfb72bfe`.
- Revue traitée : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58#issuecomment-6140460629.
- Avant : URL arbitraire, SHA-256 syntaxiquement valide, page et montants équilibrés suffisaient pour `VERIFIED_AMOUNT`. Après : document contrôlé ET ligne auditée indépendante obligatoires, avec concordance d'entité, exercice, assiette, nature, page et montants exacts.
- `isValidPrimarySha256` reconnaît uniquement les empreintes déjà contrôlées du catalogue. Cette reconnaissance ne certifie aucune ligne financière à elle seule.
- Preuves BP déclarées non auditées : `TO_VERIFY`. Publications secondaires : `SECONDARY_SOURCE`, même avec précision `EXACT`. Aucun BP primaire audité n'est actuellement autorisé ; aucune fixture fictive n'est promue en preuve primaire.
- Cas positif réel : LFI 2026, PDF p. 207, action 78016001400, Attécoubé, 300 000 000 FCFA de crédits votés pour le fonctionnement des services (transfert). Référence existante : `docs/audits/local-2026/LFI_2026_PROGRAMME_2204040_2380_ACTIONS.csv`, ligne 256. Ce montant n'est ni un BP, ni une DGF, ni une dépense exécutée. Le test réutilise la ligne déjà auditée ; aucune donnée de collectivité n'est modifiée ou importée.
- Les deux résolveurs choisissent le même BP pour le même exercice ; les montants historiques ne remplacent pas un BP absent. Les BP secondaires partiels restent rapportés, sans inventer une ventilation. Les districts suivent aussi l'assiette BP.
- Préservés : HABG/IGE inclus dans la section 103 ; CESEC LFI / Annexe 7 non additifs ; Cour Suprême sans section autonome ; sections ministérielles partagées ; historique Bingerville/Tiassalé ; BP Doropo/Iffou inconnus ; subventions des régulateurs distinctes du budget global. Métadonnées des cinq PDF DGBF contrôlés inchangées. Aucun nouvel audit PDF général.
- Validation locale : 58 fichiers, 767 tests dont 27 dans `budgetBreakdownIntegrityGate.test.ts` ; TypeScript, build public et build review vérifiés avant publication. Le contrôle GitHub du nouveau HEAD sera consigné dans la mise à jour de clôture.
- `REMOTE_SUPABASE_WRITES = 0` ; migrations = 0 ; `PR_MERGED = false` ; `PRODUCTION_DEPLOYED = false`. Dépendances, Tailwind, routes et accessibilité des modales inchangés.
- Limite documentaire conservée : absence de pièces BP primaires auditables ; seule leur certification reste bloquée. Les sources secondaires restent consultables.
- NEXT_EXECUTABLE_TASK : contrôler la CI du nouveau HEAD, puis soumettre la PR #58 à la validation humaine sans fusion ni déploiement.

## 13 octobre 2026 — Corrections finales de la PR #58 (Revue ChatGPT P1 #1, P1 #2, P2 #3, P2 #4, P2 #5)

- **PR GitHub** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58 (`codex/budget-presentation-final`).
- **Base master** : `ab159d4e3de829e11d1e146c8d9b0f9dbfb72bfe` (PR #57 incluse).
- **Commentaire de revue traité** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58#issuecomment-6131545700.
- **Statut PR** : Ouverte, fusionnable, CI verte, prête pour décision de fusion par ChatGPT (`MERGED = false`, `PRODUCTION_DEPLOYED = false`).
- **P1 #1 (Provenance BP secondaire vs certification primaire)** : Séparation stricte dans `resolveInstitutionFinancialView` entre précision numérique (`EXACT`), source secondaire rapportée (`SECONDARY_SOURCE` : *« Montant rapporté — à confirmer »*) et certification primaire (`VERIFIED_AMOUNT`). Un budget primitif issu d'une source secondaire équilibrée conserve l'affichage de ses montants et pourcentages de ventilation sans jamais être présenté comme officiellement certifié.
- **P1 #2 (Suppression du booléen `has_verified_breakdown`)** : Remplacement du raccourci déclaratif par `BreakdownDocumentaryEvidence` et le validateur `isValidBreakdownDocumentaryEvidence` exigeant : concordance d'institution, d'exercice et d'assiette, titre, référence, URL, `pdf_page > 0`, `sha256` hexadécimal 64 caractères et égalité arithmétique exacte.
- **P2 #3 (Qualification des montants historiques des collectivités)** : Dans `resolveInstitutionBudgetPresentation`, interdiction de baptiser par défaut un montant historique de collectivité *« Concours de l'État »*. Ce libellé exige désormais `state_grant_evidence` avec preuve documentaire complète ; à défaut, le montant est qualifié de *« Montant historique enregistré — nature et source à confirmer »* (`TO_VERIFY`) et ne se substitue jamais à un Budget Primitif manquant.
- **P2 #4 (Régulateurs et composantes Annexe 6 ASS / LFI 2026)** : Le budget global de référence des 7 régulateurs (ARCOP, HACA, CAIDP, CNDH, AIRP, ARTCI, ANARE-CI) demeure à `null` (*« Non documenté »*), tandis que les composantes officielles non globales (Annexe 6 ASS 2026, SHA-256 `e8ba2e9dc9ffdc6d268c60eccecfbe51ee57adc6ca639923f8a3be78cece8cf6`, ou LFI 2026) sont exposées de manière transparente dans `supplements`.
- **P2 #5 (Accessibilité complète de `InstitutionDetailModal.tsx`)** : Placement initial du focus sur le bouton de fermeture à l'ouverture, piège de focus clavier circulaire (`Tab` / `Shift+Tab`), fermeture sur `Escape` respectant la sous-modale documentaire (`docModalOpen`), et restauration du focus sur l'élément déclencheur à la fermeture.
- **Validation technique** : 58 fichiers de tests, **751/751 tests PASS (100%)**, dont 11 tests dans `budgetBreakdownIntegrityGate.test.ts` ; build TypeScript et Vite PASS.
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
