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

## 16 octobre 2026 — PR #63 : Réconciliation finale avec `master`, rapprochement documentaire Cocody 2024 et recette de bout en bout (Priorités 1 à 6)

- **Branche** : `codex/admin-final-integration` (réconciliée avec `origin/master` `f9ebadb1d1df14217d478bf2ab29f8bd29aa07d6`, base de la PR #63 reciblée vers `master`).
- **Revue traitée** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/63#issuecomment-6205027483
- **Garde-fous respectés** : `REMOTE_SUPABASE_WRITES = 0` (zéro écriture ni migration sur la base Supabase de production), `PRODUCTION_DEPLOYMENTS = 0`, aucune fusion automatique, aucun remplacement d'une donnée inconnue par zéro.
- **Priorité 1 (Réconciliation documentaire Cocody 2024 — Page PDF 40 / imprimée 41/45)** :
  - Vérification physique des 2 fascicules PDF originaux (`Cocody_CA_2024_pages_01-22.pdf`, SHA-256 `580b42cde2c164c8f7a4af23419b3dd93de541b583f5986d71bbf35b3e9c4ca4`, 22 pages ; `Cocody_CA_2024_pages_23-44.pdf`, SHA-256 `796921a9522c0fbf2a48b4bbf16f97ea8a525f57fb74b438c11bc64de5dc7ec9`, 22 pages) et du PDF combiné en base (`COMMUNE DE COCODY.pdf`, SHA-256 `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`, 44 pages).
  - La série officielle exacte du `TABLEAU DES RESULTATS DU COMPTE ADMINISTRATIF` (page PDF 40 / imprimée `Page 41 / 45`, arrêté le `08/07/2025`, approuvé le `22/07/2025` sous le `n° 002/PA/D.CAB`) et de la `SITUATION D'EXECUTION DU TITRE II PAR CODE PROJET` (pages PDF 41–43 / imprimées `42/45` à `44/45`) est :
    - Fonctionnement prévu : `18 441 235 000 FCFA` | Recettes fonctionnement : `17 646 256 543 FCFA` | Dépenses fonctionnement : `15 409 122 753 FCFA`
    - Investissement prévu : `3 900 630 000 FCFA` | Recettes investissement : `1 366 100 690 FCFA` | Dépenses investissement : `1 366 100 690 FCFA`
    - Total prévisions définitives : `22 341 865 000 FCFA` | Total recettes recouvrées : `19 012 357 233 FCFA` | Total dépenses ordonnancées : `16 775 223 443 FCFA`
    - Résultat de l'exercice (excédent) : `+2 237 133 790 FCFA` | Report de l'exercice précédent : `+944 FCFA` | Résultat cumulé : `+2 237 134 734 FCFA`
  - Alignement intégral des fixtures de test (`caGeneralizationAndRubrics.test.tsx`) sur la pièce primaire vérifiée.
- **Priorité 2 (Réconciliation de branche & Reciblage PR #63)** :
  - Fusion propre de `origin/master` (`f9ebadb`) dans `codex/admin-final-integration` en conservant l'intégralité des durcissements de sécurité de la PR #62 (RBAC fail-closed, zéro blob vide, compensation Storage, contrat 3 SQL/RLS, journal d'audit expurgé) et les fonctionnalités de la PR #63.
- **Priorité 3 (Compteur de pages PDF fiable — `src/utils/caFileMatcher.ts`)** :
  - Remplacement de la regex naïve par une analyse structurelle des objets indirects PDF (`/Type /Catalog` -> `/Pages` -> `/Count`, gestion des mises à jour incrémentales, exclusion des `/Outlines /Count`, retour explicite `null` en présence de flux d'objets compressés `/ObjStm` ou de chiffrement `/Encrypt`).
- **Priorité 4 (Trois états de la fiche financière — `src/components/AdministrativeAccountView.tsx`)** :
  - Distinction stricte entre : (1) Document enregistré (`TO_VERIFY`), (2) Document publié/vérifié avec données financières en cours de validation (*« Compte administratif 2024 disponible à la consultation. Données financières en cours d'exploitation et de validation. »* + bouton `Consulter le document` + SHA-256), et (3) Fiche complète à 6 rubriques citoyennes lorsque la ligne `administrative_accounts` est publiée.
- **Priorité 5 (Libellés comptables et citoyens — `src/components/AdministrativeAccountView.tsx`)** :
  - Stade comptable : aucun repli abusif sur `ORDONNANCE` lorsque le stade est `ENGAGE` (Bingerville) ou inconnu (`Dépenses engagées` / `Stade comptable à confirmer sur pièce`).
  - Statut physique : `citizen_status = null` affiche `Réalisation physique non documentée` (jamais `Programmé`).
  - Résultat de clôture : séparation explicite entre `Différence arithmétique (Recettes − Dépenses)`, `Résultat de l'exercice (clôture)`, `Reports antérieurs`, et `Résultat cumulé final` ; affichage de `Résultat de clôture à confirmer` en cas de `SOURCE_ANOMALY` ou de solde non confirmé (Tiassalé).
  - Sources & précision : respect du qualificatif `Environ 820 150 000 FCFA` (`APPROXIMATE`, dépêche AIP) sur le BP de Tiassalé, liens DGMP distincts du CA, et pagination affichée uniquement lorsqu'elle est renseignée.
- **Priorité 6 (Recette de bout en bout)** :
  - Chaîne complète (`Dépôt PDF → Métadonnées → Extraction assistée → Contrôle → Validation humaine → Import contrôlé → Publication simulée → 6 Rubriques citoyennes`) testée et validée sur Cocody 2024, Tiassalé 2024 (non-régression), une commune isolée (Dabou) et un conseil régional isolé (San-Pedro).
- **NEXT_EXECUTABLE_TASK** : Revue finale et décision de fusion de la PR #63 sur `master`.


## 14 octobre 2026 — Intégration finale Codex / PR #62, contrat 3

- Branche indépendante : codex/admin-final-integration. Parents : PR62 db96ed782e17b097a9ef398b682fb066509e791c et Codex 671bafcf0b787a9de88cd7e39a2324b5a6697613. Master relu : a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d.
- OCR canonique nullable, conversion NONE conditionnelle et PENDING explicite ; métadonnées historiques inconnues préservées ; manifeste SHA256_PARTS_MANIFEST_V1 distinct du checksum physique et partagé client/Edge, comparé à SQL.
- Séquence des deux migrations non déployées vérifiée deux fois sur le schéma réel exporté sans données. Revue IN_REVIEW obligatoire pour institutions, projets, lignes et publications ; exception CAIDP soumise à vérification humaine. CSV : montants inconnus, zéro, invalides, somme partielle et total complet distingués.
- Validation locale : 868/868 tests (34 PostgreSQL/RLS, 13 médias/Edge, 13 services), TypeScript et builds public/review PASS ; navigateur 16/16, transport Auth/REST/Storage simulé et SQL/RLS réels. Dashboard 360/640/768/1024/1440 px sans débordement ; contrôle visuel mobile effectué. Pages publiques : tests automatisés et accueil navigateur, audit visuel exhaustif non réalisé.
- Supabase réel : BLOCKED (supabase start tenté, moteur Docker absent). Aucun test d’écriture distant. Données financières, Cocody et Bingerville inchangés ; aucune migration, fusion ou action de déploiement distante.
- L’autorisation courante permet une PR empilée sur #62 ouverte : elle remplace l’ancienne consigne d’attente ci-dessous. La branche Antigravity n’a pas été modifiée.
- PR #63 publiée, code ec134cf4951095d8b60f58274020f0f066517b59, arbre 5390eb7e4b104db72f3f6882d692f61f725a452e. CI Quality 38589329556 PASS ; rapport unique ADMIN_DASHBOARD_FINAL_INTEGRATION.md. NEXT_EXECUTABLE_TASK : revue indépendante et recette Supabase complète autorisée, puis validation ordonnée du backend, Edge et frontend. Fusion et production restent interdites avant validation, rebasage/cible finale et recette réelle du backend.

## 13 octobre 2026 — Audit de sécurité admin : correctifs locaux validés, contrat 2

- Départ `396ff29ed6cde2ecd4549e1049d6a3a3ec1bbf29` ; base cumulative `a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d`. Branche Codex isolée inchangée.
- P0 journal : RLS par domaine, snapshots expurgés, acteur serveur et droits des fonctions contrôlés. P0 documentaire : six colonnes PR62 additives, identité/version conservées, métadonnées inconnues non inventées.
- P1 : aucune lecture directe admin_media ; rattachement/role/originaux immuables ; reçus atomiques liés à l'auteur et au contenu, conflit si la ressource a changé ; checksums des octets et manifeste multifascicules versionné, contrôle humain puis publication séparée.
- Validation locale : 832/832 tests, 63 suites ; PostgreSQL/RLS 24/24, service 12/12, médias 13/13 ; TypeScript PASS ; builds public/review PASS ; navigateur 16/16, responsive 360/640/768/1024/1440, erreurs inattendues 0, egress transféré 0. Auth/transport simulés ; pas de recette GoTrue/Storage hébergée.
- HEAD technique `4c4a962f07e0d469e0fc9787ec371954eda1e9ab`. Rapport : `docs/audits/admin/ADMIN_DASHBOARD_SECURITY_REMEDIATION.md` ; patch cumulatif `codex-admin-dashboard-security-fixed.patch`, SHAs et preuve d'intégrité dans le manifeste de livraison. Le rapport historique décrit le contrat 1, remplacé par le contrat 2 ; ne pas le déployer seul.
- GitHub relu : #62 OPEN, HEAD `7af1c5b89f75ae32fb7de8b63ccb2d035d38a61d` ; master `a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d`. Contrat de ses six champs testé localement ; intégration complète BLOCKED jusqu'à stabilisation.
- Supabase production en lecture seule : six colonnes absentes ; Cocody 2024 TO_VERIFY, version 1 et SHA inchangés. Écritures/migrations production 0 ; push/PR/fusion/déploiement NON. Auth et Storage réels BLOCKED ; prêt pour fusion NON.
- NEXT_EXECUTABLE_TASK : après fusion/fermeture de #62, réconcilier son ingestion sur le master réel dans un worktree isolé, refaire tests et recette réelle autorisée, puis proposer une PR unique. Aucune migration ni Edge distante sans validation.

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
- **Problèmes résolus et durcissements appliqués** :
  1. **Contrôle d'accès RBAC Fail-Closed** (`dataStore.ts`) :
     - Rejet immédiat de toute tentative non authentifiée ou avec session expirée (`expiresAt <= Date.now()`).
     - Rôle `CITIZEN` formellement bloqué.
     - Rôle `MODERATOR` strictement limité à la vérification (`VERIFIED`), interdiction de publication ou d'archivage.
     - Rôles `ADMIN` et `DATA_MANAGER` seuls habilités à publier, avec vérification préalable obligatoire (`isVerified`).
  2. **Intégrité des fichiers & Élimination définitive des Blobs vides** (`SingleCAUploadModal.tsx`, `documentStorageService.ts`) :
     - Suppression de tout dummy Blob (`new Blob([], ...)`).
     - Validation préalable rejetant les fichiers de taille 0 octet.
     - Remplacement partiel sécurisé : les volets inchangés conservent fidèlement leur `storage_path` et `checksum_sha256` existants sans re-téléversement inutile.
     - Recalcul déterministe du SHA-256 du manifeste combinant volets mis à jour et préservés.
  3. **Compensation transactionnelle Storage / PostgreSQL** (`SingleCAUploadModal.tsx`, `documentStorageService.ts`) :
     - Suivi précis des fichiers créés lors de la session (`newlyUploadedPaths`).
     - Si la persistance PostgreSQL échoue, appel automatique de `deleteStorageFiles` sur les seuls fichiers orphelins nouvellement téléversés, sans jamais affecter les fichiers historiques.
     - Reporting d'anomalie critique pour l'administrateur si le nettoyage Storage échoue.
     - Protection anti-double soumission `if (isSubmitting) return;`.
  4. **Résolution de l'erreur de validation initiale du CA Cocody 2024** (`dataStore.ts`) :
     - Diagnostic : la colonne `verified_by` est de type `UUID references profiles(id)` sous PostgreSQL. L'envoi d'une chaîne textuelle telle que `'Administrateur'` provoquait `invalid input syntax for type uuid: "Administrateur"`.
     - Correction : validation regex du format UUID (`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`). Seul un UUID valide (`userId`) est transmis, sinon `null`/`undefined` est passé pour laisser le trigger PostgreSQL assigner `auth.uid()`.
  5. **Schéma & Migration SQL Locale (PGlite)** :
     - Validation sous PGlite (WASM) de la migration `supabase/migrations/20261013200000_multipart_ca_documents.sql`.
     - Vérification de la rétrocompatibilité (défauts `is_multipart = false`, `parts_count = null`, `ocr_status = 'NOT_APPLICABLE'`).
     - Vérification de la contrainte `chk_pubdocs_ocr_status`.
- **Validation Globale** :
  - `src/utils/__tests__/caMultipartAndValidation.test.ts` : **27/27 tests passés**.
  - `src/utils/__tests__/caManagement.test.ts` : **26/26 tests passés**.
  - Couverture totale : **62 fichiers de tests, 820 tests exécutés, 820 tests réussis (100% PASS, 0 FAIL)**.
  - Compilation TypeScript & Build Vite : `npm run build` réussi sans erreur (**code 0**).
- **NEXT_EXECUTABLE_TASK** : Revue finale et approbation de la PR #62 par ChatGPT pour fusion sur `master`.

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

## 13 octobre 2026 — Corrections finales de la PR #58 (Intégrité financière, provenance documentaire & accessibilité modale)

- **PR GitHub** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58 (`codex/budget-presentation-final`).
- **Base master** : `ab159d4e3de829e11d1e146c8d9b0f9dbfb72bfe` (PR #57 incluse).
- **Commentaire de revue traité** : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58#issuecomment-6131545700.
- **Statut PR** : Ouverte, fusionnable, CI verte, prête pour décision de fusion par ChatGPT (`MERGED = false`, `PRODUCTION_DEPLOYED = false`).
- **Corrections des 5 observations de la revue ChatGPT** :
  1. **P1 #1 — Ne pas certifier abusivement les budgets primitifs (`src/utils/institutionBudgetHelper.ts`)** : Séparation stricte entre précision numérique (`EXACT`), provenance documentaire secondaire (`SECONDARY_SOURCE`) et certification primaire (`VERIFIED_AMOUNT`). Un budget primitif rapporté par voie de presse ou publication secondaire (ex: Bingerville, Agnéby-Tiassa) conserve son statut `SECONDARY_SOURCE` (*« Montant rapporté — à confirmer »*) avec sa ventilation équilibrée affichée sans jamais être surclassé en `VERIFIED_AMOUNT` faute d'acte officiel primaire paginé et horodaté SHA-256 (64 hex).
  2. **P1 #2 — Suppression du raccourci `has_verified_breakdown` (`src/utils/institutionBudgetHelper.ts`)** : Remplacement du booléen déclaratif par une validation stricte de `BreakdownDocumentaryEvidence` (`isValidBreakdownDocumentaryEvidence` : concordance `institution_id`, `fiscal_year`, `basis`, `document_title`, `document_ref`, `source_url`, `pdf_page > 0`, `sha256` 64 hex, `functioning_fcfa + investment_fcfa === total_fcfa`). Toute revendication booléenne sans preuve primaire complète est rejetée.
  3. **P2 #3 — Ne pas transformer un montant historique en concours de l'État (`resolveInstitutionBudgetPresentation`)** : Suppression du libellé par défaut *« Concours de l'État »* sur les montants historiques de collectivités. Le libellé *« Concours de l'État »* (`OFFICIAL_SOURCE` / `VERIFIED`) n'est produit que si `state_grant_evidence` fournit une preuve documentaire valide ; sinon, le montant complémentaire est qualifié de *« Montant historique enregistré — nature et source à confirmer »* (`TO_VERIFY`) et ne remplace jamais un Budget Primitif absent (vérifié sur Bingerville, Tiassalé, Doropo, Agnéby-Tiassa, Iffou).
  4. **P2 #4 — Régulateurs et périmètre officiel (`REGULATOR_2026_DOCUMENTED_SCOPES`)** : Maintien de `reference.amount_fcfa: null` (*« Non documenté »*) pour les 7 régulateurs (ARCOP, HACA, CAIDP, CNDH, AIRP, ARTCI, ANARE-CI), tout en exposant dans `supplements` les composantes budgétaires officielles non globales documentées dans l'Annexe 6 ASS 2026 (SHA-256 `e8ba2e9dc9ffdc6d268c60eccecfbe51ee57adc6ca639923f8a3be78cece8cf6`) ou la LFI 2026, sans jamais assimiler une subvention ou ressource affectée au budget global de l'autorité.
  5. **P2 #5 — Accessibilité complète de la modale (`src/components/InstitutionDetailModal.tsx`)** : Implémentation du cycle de vie complet du focus (`getModalFocusableElements`, `handleModalKeyDown`, `manageModalFocusLifecycle`) : placement initial du focus sur le bouton de fermeture (`aria-label="Fermer la fiche"`), piège de focus clavier circulaire (`Tab` / `Shift+Tab`), fermeture propre sur `Escape` (suspendue si `docModalOpen` est actif), et restauration automatique du focus sur l'élément déclencheur à la fermeture.
- **Validation technique** :
  - Tests unitaires & intégration : **58 fichiers, 751/751 tests PASS (100%)**, 0 échec (dont **11 tests dédiés** dans `src/utils/__tests__/budgetBreakdownIntegrityGate.test.ts`).
  - Compilation & Build : `tsc && vite build` validé avec succès, code 0.
- **Garde-fous** : `REMOTE_SUPABASE_WRITES = 0` ; migrations = 0 ; fusion master = non effectuée (réservée à ChatGPT) ; déploiement production = non tenté.
- **NEXT_EXECUTABLE_TASK** : Revue finale et décision de fusion de la PR #58 sur master par ChatGPT.

# AGENT HANDOFF — SuiviBudget Côte d’Ivoire

## CHECKPOINT DE FINALISATION OPÉRATIONNELLE LOTS 6 À 15 — 12 OCTOBRE 2026

- **MANDAT DE LIVRAISON** : Raccordement continu et exhaustif des Lots 6 à 15 à l'application publique SuiviBudget CI, structuré en 5 Blocs séquentiels (A à E) avec branches et PRs GitHub dédiées, sans réécriture arbitraire, sans modification des dépendances / Tailwind (sanctuarisés pour Codex / PR #33), et avec zéro écriture distante Supabase (`REMOTE_SUPABASE_WRITES = 0`).
- **VALIDATION GLOBALE** :
  - **Suites de tests** : 55 fichiers de tests, **694 tests exécutés, 694 réussis (100% PASS)**, 0 échec.
  - **Compilation & Bundle** : `tsc && vite build` validé avec succès en 37.04s, sans erreur TypeScript.
  - **Base Supabase autorisée** : `cdesuvcozcetdtvibgqs` (eu-west-1), lecture seule stricte (`REMOTE_SUPABASE_WRITES = 0`).
- **DÉTAIL DES BLOCS & PULL REQUESTS LIVRÉES** :
  1. **BLOC A (Lots 6, 7, 8, 15) — PR #44** (`antigravity/bloc-a-documentary-budget-integration`) :
     - Bibliothèque documentaire publique républicaine raccordée (`officialPublicDocumentsCatalog.ts`).
     - Citations officielles avec empreintes SHA-256 certifiées et liens vers DGBF / Journal Officiel.
     - Distinction stricte des phases budgétaires : Initial (`PLANNED`), Modificatif, Compte Administratif d'Exécution.
     - Règle `UNKNOWN ≠ 0` appliquée sans exception (les données absentes affichent *"Non documenté"* ou *"Non renseigné"*).
  2. **BLOC B (Lot 9) — PR #45** (`antigravity/bloc-b-projects-markets-integration`) :
     - Rapprochement des marchés publics DGMP (`contractor`, `contract_number`) sans fabrication d'attributions.
     - Rattachement des programmes ministériels LOLF (`program_name`) et indexation dans la recherche textuelle intelligente.
     - Étanchéité absolue financier vs physique (**Principe 7**) : badge de preuve citoyenne validée sur `ProjectCard`, suppression du basculement automatique vers `COMPLETED` sur simple taux d'avancement déclaré, mention explicite *"Budget voté ≠ réalisation physique"*.
  3. **BLOC C (Lots 10 & 11) — PR #46** (`antigravity/bloc-c-citizen-institution-responses`) :
     - Protection absolue de la vie privée citoyenne : fonction `sanitizeCitizenIdentity` masquant les emails (`j***@***.ci`) et numéros de téléphone (`+225 07 **** 89`) sur toutes les contributions publiques.
     - Avertissement de confidentialité renforcé dans `SendProofModal` (coordonnées de contact conservées en base privée pour vérification, jamais exposées publiquement).
     - Rapprochement et qualification des réponses institutionnelles (**Principe 8**) : badge de traçabilité distinct de l'observation citoyenne indépendante.
  4. **BLOC D (Lots 12, 13 & 14) — PR #47** (`antigravity/bloc-d-history-open-data-ux`) :
     - Exports Open Data protégés contre les vulnérabilités d'injection de formules tableur (CSV Formula Injection) par préfixage d'une apostrophe (`'`) sur `=`, `+`, `-`, `@` dans `exportLocalBudgetsToCsv` et `openDataCsv`.
     - 3 boutons d'export accessibles et tactiles sur `DocumentsPage` : Open Data (CSV), Open Data (JSON), Sources (JSON).
     - Comparaisons historiques rigoureuses conditionnées à une attestation de continuité institutionnelle (`EvidenceRef`) selon le **Principe 1**.
     - Harmonisation responsive des primitives `Primitives.tsx` : cibles tactiles WCAG AA (`min-h-[44px]`), badges visuels clairs.
  5. **BLOC E (Lot 15) — PR #48** (`antigravity/bloc-e-final-validation-closure`) :
     - Consolidation globale finale, résilience des tests PGlite WASM (timeout porté à 60s), alignement de la suite E2E.
     - 694 tests unitaires, d'intégration et E2E au vert. Build production 100% opérationnel.
     - Prêt pour revue indépendante ChatGPT et orchestration des fusions vers `master`.

---

### Handoff du moteur de revue LOTS 6–15 (historique de la PR #29)

## METADATA
- LAST_UPDATED : 2026-10-09
- LAST_AGENT : Antigravity
- CURRENT_BRANCH : `antigravity/reconcile-lots6-15-post-lot5`
- BASE_MASTER_SHA : `707b3b688f23bd33dc0f3504e13b79c65908dd50` (Merge commit de PR #28 sur master)
- CURRENT_HEAD : voir HEAD courant de la PR #29
- LAST_VERIFIED_CODE_HEAD : voir HEAD courant de la PR #29
- PR : PR #29 de réconciliation LOTS 6-15 vers master (`feat(review): reconcile LOTS 6-15 with validated LOT5 baseline`)
- SUPABASE_PROJECT : `cdesuvcozcetdtvibgqs`, eu-west-1 (AUCUNE écriture distante réalisée par l'agent, REMOTE_SUPABASE_WRITES = 0)
- FINAL_DOCUMENTARY_GATE : section/programme LOT5 = LFI 2026 et SHA-256 référencé ; action LOT5 = DPPD-PAP 2026–2028 ou alias explicite `-ANNEXE-4` et SHA-256 référencé. Mesure budgétaire officielle LFI/DPPD = `PLANNED` (base `INITIAL_BUDGET`), interdisant formellement l'assimilation à des ordonnancements exécutés (`ORDERED`). Page PDF du référentiel obligatoire dans l'audit et identique dans la citation. Une localisation absente du référentiel bloque la publication. Les données non-LOT5 et les zéros documentés de leurs tests restent indépendants.
- FINAL_DOCUMENTARY_VALIDATION : 35 fichiers / 569 tests PASS (100%), dont 21 tests d'intégrité d'export (`exportIntegrityHardening.test.ts`) et 60 tests financiers ciblés (`financialEvidenceHardening.test.ts`) ; `npx tsc --noEmit`, `npm run build`, `npm run build:review` PASS ; Supabase anon GET/HEAD PASS, 0 écriture distante (`REMOTE_SUPABASE_WRITES = 0`). `PUBLICATION_PATH_CONNECTED: REVIEW_DOMAIN_ONLY` ; PR #29 prête pour merge, non fusionnée localement.
- NEXT_EXECUTABLE_TASK : Revue indépendante finale et fusion contrôlée de la PR #29 vers master (fermeture de l'audit PR #30).
- CURRENT_MILESTONE : Clôture définitive des réserves et bloqueurs de l'audit indépendant (PR #30) sur la PR #29 :
  1. **Bloqueur P1 (Exports financiers protégés par la porte stricte)** : Élimination du bypass d'audit dans `openDataRows()`, `openDataJson()`, `openDataCsv()` (`src/review/domain/history.ts`) et `buildReviewSnapshot()` (`src/review/domain/snapshot.ts`). Tout montant altéré (+1 FCFA, -1 FCFA, hash non concordant, page discordante, périmètre erroné) produit `amount: null`, `status: 'UNKNOWN'`, et dans les agrégats neutralise la somme totale avec `AGGREGATE_CONTAINS_UNVERIFIED_AMOUNT`. `compareHistory()` protège les comparaisons interannuelles avec refus strict des montants altérés.
  2. **Bloqueur P1 (Sémantique budgétaire PLANNED vs ORDERED)** : Rétablissement strict de la distinction budgétaire fondamentale (LOLF / LFI 2026) : les crédits de paiement (CP) votés dans la LFI 2026 et l'Annexe 4 DPPD-PAP sont des autorisations initiales (`PLANNED` avec `basis: 'INITIAL_BUDGET'`), et non des dépenses exécutées (`ORDERED`). `transformLot5ControlsToAudits()` et `verifyAuditRecordAgainstReferential()` dans `src/review/domain/financialAudits.ts` imposent `measure: 'PLANNED'`. Toute observation LFI 2026 prétendant une mesure `ORDERED` est rejetée avec `MEASURE_MISMATCH`.
  3. **Bloqueur P2 (Script navigateur d'audit)** : Ajout de l'import manquant `const assert = require('node:assert/strict');` dans `scripts/verify-review-browser.cjs`. Validation syntaxique `node -c` réussie (code 0).
  4. **Suite de tests adversariaux d'intégrité d'export (21 tests)** : `src/review/__tests__/exportIntegrityHardening.test.ts` démontre exhaustivement le rejet de toute tentative d'injection, mutation (+1 FCFA), discordance documentaire, et confirme la protection intégrale des fichiers CSV, JSON, snapshots et agrégats.
  5. **Validation globale** : 35 fichiers de tests, 569 tests réussis (100% PASS), 0 échec. Build production PASS, build review PASS, Supabase en lecture seule hermétique (`remoteSupabaseWrites: 0`).
  6. **État final** : `READY_FOR_INDEPENDENT_REVIEW_AND_MERGE` (aucun merge effectué, `MERGE_PERFORMED = FALSE`).
- FOUNDATION_READY : TRUE.

## LOTS 6 À 15 : ARCHITECTURE DE REVUE, CONTRATS DOCUMENTAIRES ET COMPOSITION READ-ONLY
- **1. Synthèse de Réconciliation & Architecture Découplée** :
  - Les travaux des LOTS 6 à 15 ont été réconciliés depuis le master validé post-LOT5 (`707b3b688f23bd33dc0f3504e13b79c65908dd50`) sans réintroduire l'ancienne base périmée ni altérer les données protégées (`src/data`, `docs/imports`, `docs/references/2026`, `src/budget-ingestion`, `supabase`).
  - L'ensemble du code de revue est isolé sous `src/review/` et ne pollue pas le bundle de production runtime (point d'entrée distinct `review.html`, config Vite `vite.review.config.ts`, build dédié `npm run build:review`).
- **2. Périmètre des Contrats et Invariants Intégrés** :
  - **LOT 6 (Exécution & Performance)** : Contrats stricts dans `src/review/domain/execution.ts`. `UNKNOWN != 0`, vrai zéro documenté préservé, taux > 100% sans conclusion physique automatique, zéro dénominateur sécurisé (renvoie `null`), périmètres incompatibles classés `NOT_COMPARABLE`. Indicateurs de performance découplés des montants financiers.
  - **LOT 7 (Dossiers Collectivités & Versions)** : Sélection déterministe de la version budgétaire courante publiée dans `src/review/domain/collectivities.ts`. ID obligatoire, rejet des doublons de version et conflits vers `BLOCKED`. Séparation stricte BP / CA.
  - **LOT 8 (Catalogue Documentaire & Citations)** : Liste blanche de documents officiels avec SHA-256 dans `src/review/domain/documents.ts`. Statuts orthogonaux `availability`, `provenance`, `extractionStatus`, `verification`. Rejet des URL non sécurisées (`javascript:`, `data:`, `ftp:`, `http:` non-TLS), des documents privés (`visibility: PRIVATE`) et des cycles de version (`VERSION_CYCLE`). Rejet de toute publication financière si l'extraction n'est pas explicitement `VERIFIED`.
  - **LOT 9 (Liens Projets-Budgets)** : Modélisation des rattachements documentés sans agrégation abusive dans `src/review/domain/projects.ts`. `Budget Line != Project` : interdiction absolue de créer un projet depuis une ligne budgétaire. État physique maintenu à `UNKNOWN` en l'absence de preuve terrain.
  - **LOT 10 (Suivi Citoyen & Confidentialité)** : Projection publique sans fuite de données personnelles dans `src/review/domain/citizen.ts`. Dates obligatoirement calendaires ISO. Distinction fondamentale : la participation citoyenne ne constitue pas une représentativité statistique de la population.
  - **LOT 11 (Réponses Institutionnelles & Contrôle Officiel)** : Séparation stricte de provenance dans `src/review/domain/responses.ts` (`INSTITUTION_RESPONSE` vs `OFFICIAL_SOURCE`). Une réponse institutionnelle ne vaut jamais validation d'audit indépendant.
  - **LOT 12 (Historique, Comparaisons & Open Data)** : Comparabilité interannuelle conditionnée à une preuve d'équivalence de périmètre dans `src/review/domain/history.ts`. Export Open Data JSON et CSV avec encodage littéral `null` et neutralisation des formules tableur (protection anti-injection CSV sur `=, +, -, @`).
  - **LOT 13 (Primitives UI Orientées Preuve)** : Composants accessibles `Primitives.tsx` et `DocumentLibrary.tsx` (badges de statut, cibles tactiles >= 44px, gestion des états vides informatifs).
  - **LOT 14 (Workspace de Revue Isolé)** : Application candidate de revue `ReviewWorkspace.tsx` avec navigation clavier, skip link, 7 parcours de revue et zéro appel réseau externe.
  - **LOT 15 (Stabilisation & Composition Read-Only)** : Moteur `buildReviewSnapshot` dans `src/review/domain/snapshot.ts` agrégeant périmètres, observations et documents de manière purement fonctionnelle et déterministe. Décision de publication explicite `NOT_REQUESTED`.
- **3. Résolution du Blocage LOT 5 Obsolète** :
  - Remplacement de la constante hardcodée de blocage par `LOT5_UNRESOLVED_SCOPES = []` dans `src/review/domain/evidence.ts`.
  - Les ministères MICOM (`gov-017` / 336), MSCV (`gov-030` / 444) et METFPA (`gov-034` / 334) sont désormais évalués selon les règles normales du moteur documentaire : `UNKNOWN` en l'absence de preuve, `AVAILABLE` avec preuve officielle vérifiée. Aucune disponibilité automatique.
- **4. Contrôles Documentaires & Script Supabase Read-Only** :
  - `docs/overnight/LOT7_12_DOCUMENTARY_CONTROLS.json` : Spécification vérifiée par `src/review/__tests__/documentaryControls.test.ts` garantissant que les données sans sources restent `UNKNOWN` ou `NOT_COMPARABLE`, et `remote_supabase_writes: 0`.
  - `scripts/verify-supabase-readonly.mjs` : Script de sonde en lecture seule avec transport `GET`/`HEAD` exclusif (`guardedFetch`) et credentials `anon`, testé par `supabaseReadOnlyGuard.test.ts` (9 tests unitaires).
- **5. Validation & Tests** :
  - 34 fichiers de tests, 529 tests réussis (100% PASS), 0 échec.
  - Suites dédiées `lot5Reconciliation.test.ts` (31 tests), `documents.test.ts` (30 tests couvrant les 14 cas limites), `financialEvidenceHardening.test.ts` (41 tests adversariaux), `supabaseReadOnlyGuard.test.ts` (9 tests).
  - Validation visuelle Chromium : `CHROMIUM_CHECK = PASS` via Chrome DevTools MCP sur `review.html`.
  - Production build PASS (`tsc && vite build`), Review build PASS (`vite build --config vite.review.config.ts`).
  - Supabase distant : `REMOTE_SUPABASE_WRITES = 0`.

---

## CHECKPOINT DE CLÔTURE TECHNIQUE & INTÉGRITÉ FINANCIÈRE PR #31 — 10 OCTOBRE 2026

- **Statut PR #31** : Clôturée techniquement avec intégrité financière certifiée, 435 tests réussis (31 suites de tests), `tsc && vite build` 100% vert, GitHub Actions Quality (`verify`) et Vercel Preview validés avec succès sur le HEAD `5c69863` (ou son successeur direct).
- **Branche** : `antigravity/institution-budgets-reconciliation`
- **Revue documentaire & Matrice d'intégrité (66 entités)** :
  * Matrice d'audit : `docs/audits/institution-reconciliation/matrix.json`
  * Rapport d'audit : `docs/audits/institution-reconciliation/REPORT.md`
  * Script reproductible : `scripts/generate-reconciliation-matrix.ts`
  * Entités auditées : 66 (14 Grandes Institutions, 35 Portefeuilles Ministériels, 7 AAI, 10 Communes du Grand Abidjan).
  * Statuts certifiés : 20 `VERIFIED_AMOUNT`, 0 `VERIFIED_ZERO`, 0 `UNRECONCILED`, 34 `PARTIAL_BREAKDOWN` (CP LFI documentés avec ventilation manquante conservée sans invention), 2 `NOT_DOCUMENTED`, 10 `NOT_PUBLISHED`.
  * Total FCFA vérifié : **356 153 879 687 FCFA**.
  * Écritures Supabase distantes : **0** (`REMOTE_SUPABASE_WRITES = 0`).
  * Faux zéros résiduels : **0**.
- **P1-A Arithmétique exacte (`calculateSafePercentages`)** : Entiers stricts (`Number.isSafeInteger`), égalité exacte `functioning + investment === total` à 1 FCFA près, rejet des faux pourcentages 100% en cas d'écart (`UNRECONCILED` avec `deltaFcfa`), gestion des totaux 0 FCFA sans division par zéro (`ZERO_TOTAL`).
- **P1-B Résolveur unique (`resolveInstitutionFinancialView`)** : Source de vérité partagée pour les cartes publiques (`NationalInstitutionsPage`, `MinistriesPage`) et la modale détaillée (`InstitutionDetailModal`), éliminant toute divergence visuelle.
- **P1-C Élimination des zéros trompeurs** : Cour Suprême explicitée comme non individualisée (scission constitutionnelle 2016 vers Cassation Section 114, Conseil d'État Section 118, Cour des Comptes Section 115) ; 10 communes du Grand Abidjan sous autonomie fiscale (`TAX_AUTONOMY`, `null !== 0`).
- **NEXT_EXECUTABLE_TASK** : Revue finale humaine de la PR #31 sur GitHub (`https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/31`) et merge non-destructif sur `master` sans force-push.

---
## CHECKPOINT DE CERTIFICATION LÉGALE INITIALE ET RÉSIDUS — 10 OCTOBRE 2026

**Ne pas confondre la certification du crédit voté dans la LFI avec la certification de l'enveloppe propre au portefeuille actuel.** Les **34 sections LFI distinctes** référencées par les **35 fiches ministérielles** possèdent désormais une **preuve dans les articles 14 ou 15 de la loi elle-même** :
- Primature section **108** : art. **14**, LFI physique PDF **p.12** (dotations);
- les **33 autres sections distinctes**, ministérielles : art. **15**, PDF **p.14–20** (programmes);
- gov-009/gov-035 : section **229 commune**, jamais deux crédits autonomes.

Registre source légal : `LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json` ; script source SHA-256 `scripts/verify_lfi_articles_14_15_2026.py` ; affichage citoyen du fondement légal : `MinistryLegalCPNotice.tsx` ; test `ministryLegallyVotedCPBaseline2026.test.ts`. `MINISTRY_DOCUMENTATION_REGISTRY_2026.json` expose le niveau de preuve juridique sans débloquer `certified_public_budget`.

Les **quatre reliquats historiques non entièrement expliqués** sont documentés exactement dans `PR31_FOUR_UNEXPLAINED_LEGACY_RESIDUALS_2026.json` : gov-006 (**−370 246 FCFA**), gov-011 (**+481 394**), gov-013 (**+283 456**), gov-025 (**+239 982**). Les trois PDF sources (LFI **583 p.**, Annexe 4 **1229 p.**, Annexe 7 **89 p.**) ont été vérifiés sur **1901 pages** et leurs empreintes SHA-256 sont conservées. Aucun des quatre résidus n'est une valeur autonome retrouvée en recherche textuelle exacte. **Une absence de jeton n'est ni une preuve de fausseté ni une justification de crédits inventés.** La fiche gov-025 **publie correctement** le CP LFI vérifié `734442904943`, pas l'ancien budget ; les trois autres anciennes différences demeurent archivées sans attribution publique.

**DGBF : canal officiel identifié, demande toujours NON ENVOYÉE :** `info@dgbf.gouv.ci`, formulaire https://www.dgbf.ci/contactez-la-dgbf/ , Direction du Budget de l'État : https://www.dgbf.ci/ecrire-au-dbe/ . La demande documentaire est prête dans `PR31_DGBF_DOCUMENTARY_CLARIFICATION_REQUEST_DRAFT.md`. Les actes éventuels de transferts budgétaires après l'entrée en fonction du Gouvernement de janvier 2026 restent non établis, **la certification sans réserve par portefeuille n'est pas acquise**. Pas de merge, de modification Supabase ni de déploiement manuel.

**Vérification CI :** le commit `c250649f...` a échoué à cause d'un test ajoutant à tort l'absence de CP sur gov-025 ; correction dans `ab170503f...` : vérifier la nouvelle CI sur le HEAD de PR #31 avant toute conclusion.

---
## CHECKPOINT PRIORITAIRE — DÉCOUVERTES FINANCIÈRES OFFICIELLES C2D + COMPLÉMENTS LFI (10-10-2026)

- **NE PAS REVENIR À L'ANCIEN DIAGNOSTIC « 15 ÉCARTS SANS ORIGINE »** : la LFI PDF pages **565–569** liste 14 sections de projets financés sur C2D (total général **74 400 000 000 FCFA**, contrôle source SHA-256). Parmi les **15 anciennes divergences** du répertoire, **9** correspondent exactement au C2D de leur section ; **3** sont expliquées à quelques centaines de milliers de francs près ; **3** n'ont pas de ligne C2D. Deux de ces trois derniers écarts négatifs correspondent exactement en valeur absolue à une ligne d'activité de la LFI (gov-032 → 78045200134, **553 500 000 FCFA**, PDF p.554 ; gov-034 → 78098000984, **4 362 218 FCFA**, PDF p.384). **Cette coïncidence ne prouve pas l'omission historique de l'action.** Quatre écarts restent sans rapprochement exact : gov-006 (−370 246 FCFA), gov-011 (+481 394), gov-013 (+283 456), gov-025 (+239 982).
- **112/112 programmes supplémentaires avec somme d'actions financièrement prouvée** : 108 programmes et 340 actions par Annexe 4 ; pour les quatre lacunes du Tableau 7, utiliser **le détail LFI** p.83–84 (actions 1301001 / 1301101 / 1301301, sections de la Primature) et p.502–503 (2212101 = **5 304 391 059** et 2212102 = **2 748 545 000 FCFA**). Ce complément clôt l'écart de **8 052 936 059 FCFA** du programme 22121 ; la lacune éditoriale de l'Annexe 4 demeure, mais non le rapprochement financier.
- **Preuves machine/lien app** : `PR31_C2D_2026_DISCREPANCY_PROVENANCE.json`, `LFI_2026_ACTION_COMPLEMENTS_4_PROGRAMMES.json`, `scripts/verify_ministry_c2d_2026.py`, `scripts/verify_lfi_action_complements_2026.py`, `src/components/institutions/MinistryC2DEvidence.tsx`, panneau de ventilation actions LFI dans `MinistrySectionEvidencePanel.tsx` ; rapports/matrice mis à jour. Les sources sont des documents DGBF originaux, pas des simulations.
- **ATTENTION :** la section CP du budget général et les projets C2D sont des **périmètres documentaires distincts**. Le rapprochement historique numérique ne crée **ni enveloppe autonome par ministre nommé en janvier 2026**, ni nouveau crédit à additionner systématiquement. La **certification financière administrative sans réserve des 35 portefeuilles reste non acquise**, faute d'actes de transfert/répartition CP et preuves de rattachement légal. Ne pas modifier `certified_public_budget=false` en l'absence de pièces signées.
- **Demande DGBF prête mais NON ENVOYÉE** : `PR31_DGBF_DOCUMENTARY_CLARIFICATION_REQUEST_DRAFT.md`, recentrée sur actes de répartition, quatre différences non rapprochées et correction éditoriale facultative. Aucun traitement Supabase, aucun merge, aucun déploiement manuel.
- **Contrôles :** exécuter la CI Quality au HEAD de PR #31 après la dernière écriture ; vérifier la compilation et ne jamais extrapoler une CI verte à une certification réglementaire.

---
## REPRISE PRIORITAIRE — CONTRÔLE DOCUMENTAIRE PR #31 DU 10 OCTOBRE 2026

**Source de vérité pour la reprise :** HEAD actuel de la PR #31, à interroger avant chaque modification. Ne pas supposer que les anciens snapshots, comptes de tests ou PR mergées sont encore d'actualité.

- **LFI et Annexe 4 retrouvées et contrôlées directement depuis les PDF originaux fournis**, empreintes SHA-256 conservées dans `SECTION_PROGRAM_CROSSCHECK_22_2026.json`.
- **35 portefeuilles documentés** ; 12 référentiels canoniques antérieurs avec programmes/actions ; les 23 autres portefeuilles reliés à **22 sections distinctes**, dont la section 229 commune à `gov-009` et `gov-035`.
- **112 programmes LFI 2026** numériquement retrouvés dans l'Annexe 4, tous les totaux de section exactement réconciliés (delta = 0). **340 actions**, sommes exactes sur **108 programmes**. Quatre exceptions : `108/13010`, `108/13011`, `108/13013` (dotations) et `352/22121` (tableau d'actions absent sous ce code).
- **Vérification reproductible** des PDFs : `python scripts/verify_ministry_section_pdfs.py <LFI.pdf> <Annexe4.pdf>` ; aucune dépendance à Supabase, script en lecture seule, installez `pymupdf` si besoin.
- **UI PR #31** : les portefeuilles concernés peuvent montrer les CP de section, les 112 programmes et leur provenance, **sans prétendre que les crédits de section sont une dotation autonome propre à la fiche**. Neuf anciens montants divergents + le doublon `gov-035` demeurent archivés mais non réattribués.
- **Certification intégrale des 35 portefeuilles non acquise** tant que la correspondance officielle des crédits avant/après le Gouvernement du 23 janvier 2026, les périmètres composites et les quatre exceptions ne sont pas levés. Conserver le statut `DRAFT` des 23 portefeuilles et ne pas annoncer un résultat certifié.
- Documents clés : `PR31_CERTIFICATION_EVIDENCE_MATRIX_35.md`, `PR31_SOURCE_GAP_SECTION_352_PROGRAM_22121.md`, `PR31_DGBF_DOCUMENTARY_CLARIFICATION_REQUEST_DRAFT.md`, tous dans `docs/references/2026/ministry-reconciliation/`.
- **Règles non négociables** : ne pas fusionner PR #31, aucune écriture Supabase, aucune migration, aucun déploiement intentionnel ; aucune invention de montant ou d'allocation ; vérifier la CI du HEAD avant de considérer le lot techniquement prêt.

---

## METADATA
- LAST_UPDATED : 2026-10-10
- LAST_AGENT : GPT-6 (réconciliation documentaire PR #31)
- CURRENT_BRANCH : `antigravity/institution-budgets-reconciliation`
- BASE_MASTER_SHA : `707b3b688f23bd33dc0f3504e13b79c65908dd50` (Merge commit de PR #28 sur master)
- PR : PR Reconciliation Budgets Institutionnels & Élimination des Faux Zéros
- SUPABASE_PROJECT : `cdesuvcozcetdtvibgqs`, eu-west-1 (AUCUNE écriture distante réalisée, REMOTE_SUPABASE_WRITES = 0)
- CURRENT_MILESTONE : Réconciliation des dotations institutionnelles publiques et élimination définitive des faux zéros budgétaires. Fiche Cour Suprême signalée non individualisée dans le récapitulatif de la LFI 2026 (répartition constitutionnelle vers Cour de Cassation, Conseil d'État et Cour des Comptes). 10 communes du Grand Abidjan assainies sous autonomie fiscale (null !== 0). Module d'intégrité budgétaire unifié `institutionBudgetHelper.ts`. 374 tests unitaires PASS, build TypeScript et Vite 100% verts.
- FOUNDATION_READY : TRUE.

## RÉCONCILIATION DES DOTATIONS INSTITUTIONNELLES & ÉLIMINATION DES FAUX ZÉROS (OCTOBRE 2026)
- **1. Diagnostic & Preuve Documentaire** :
  - **Anomalie initiale** : La fiche publique « La Cour Suprême de Côte d'Ivoire » affichait une dotation de 0 FCFA, 0% fonctionnement, 0% investissement.
  - **Preuve LFI 2026** : *Loi n° 2025-987 du 19 décembre 2025 portant budget de l'État pour l'année 2026* (583 pages, Tableaux des crédits pp. 45–54).
  - **Réalité constitutionnelle** : Sous la Constitution de 2016 (Titre VII), la Cour Suprême a été scindée en trois juridictions suprêmes souveraines dotées chacune de sa section budgétaire autonome dans la LFI 2026 :
    * Cour de Cassation : Section 114 (7 931 309 608 FCFA)
    * Conseil d'État : Section 118 (5 164 531 081 FCFA)
    * Cour des Comptes : Section 115 (8 851 161 351 FCFA)
    * Cour Suprême : Aucune section budgétaire distincte dans le budget général (`OFFICIAL_AMOUNT = UNVERIFIED` / `DOCUMENTARY_GAP`).
- **2. Causes Racines Identifiées & Corrigées** :
  - `NationalInstitutionsPage.tsx` : les pourcentages `functioningPct` et `investmentPct` retombaient par défaut sur `0%` lorsque `total_budget_fcfa` était null ou absent, affichant une jauge vide et des pourcentages trompeurs.
  - `InstitutionDetailModal.tsx` : lorsqu'une entité n'avait pas de budget publié, le modal affichait un texte hardcodé pour les mairies (`Cette collectivité municipale fonctionne sous le régime de l'autonomie financière et fiscale...`), qualifiant la Cour Suprême de collectivité municipale !
  - `budgetLinesData.ts` : deux lignes budgétaires fictives simulant 5 000 000 000 FCFA pour `inst-cour-supreme` étaient présentes dans `NATIONAL_INSTITUTIONS_EXTRA_LINES`, en contradiction avec l'absence de section LFI 2026.
  - `officialDataFromCsv.ts` : 10 communes du Grand Abidjan en autonomie fiscale (`is_tax_quota_commune: true`) avaient des valeurs numériques `0` au lieu de `null`.
- **3. Solutions Architecturales Mises en Œuvre** :
  - Création de `src/utils/institutionBudgetHelper.ts` (`assessInstitutionBudget`, `calculateSafePercentages`) garantissant le principe fondamental `null !== 0`.
  - Cour Suprême : statut `NOT_DOCUMENTED`, affichage « Non individualisé (LFI 2026) », jauge masquée, notice institutionnelle explicative citant les sections 114, 118 et 115 de la LFI 2026.
  - Communes du Grand Abidjan : passage des budgets à `null`, statut `TAX_AUTONOMY`, badge « Ressources Propres & Impôts Locaux ».
  - Modal institutionnel : différenciation stricte entre juridictions constitutionnelles, institutions nationales et collectivités municipales (suppression des mentions incongrues de « cantines scolaires » et de « conseil municipal » pour les juridictions).
  - Suppression des lignes budgétaires fictives dans `budgetLinesData.ts`.
- **4. Validation & Conformité** :
  - 16 tests unitaires dédiés dans `src/utils/__tests__/institutionBudgetIntegrity.test.ts`.
  - 374/374 tests unitaires au total PASS (`npm test`).
  - Validation statique TypeScript (`npx tsc --noEmit`) : 0 erreur.
  - Build de production Vite (`npm run build`) : succès en 2m 38s.
  - Base Supabase distante : 0 écriture (`REMOTE_SUPABASE_WRITES = 0`).

## LOT 5 : GÉNÉRALISATION MINISTÉRIELLE 2026 CONTRÔLÉE (BATCH 1)
- **1. Objectif & Cadre du Batch 1** :
  - Généralisation industrielle progressive basée strictement sur l'architecture validée aux LOTS 2, 3 et 4.
  - Réconciliation intégrale du périmètre officiel de la Loi de Finances 2026 (Tableau récapitulatif par section, dotation et programme, pp. 45–54) et de l'Annexe 4 DPPD-PAP 2026-2028 (Tableau 7) pour les 7 ministères du Batch 1 :
    1. **MAIED** (`gov-033` / Section DGBF `439`) — Intégration Africaine et Ivoiriens de l'Extérieur : **5 122 516 889 FCFA** (3 programmes, 7 actions, delta = 0).
    2. **MAM** (`gov-032` / Section DGBF `440`) — Affaires Maritimes : **13 746 365 872 FCFA** (2 programmes, 7 actions, delta = 0).
    3. **MFPMA** (`gov-003` / Section DGBF `237`) — Fonction Publique et Modernisation de l'Administration : **45 121 940 916 FCFA** (3 programmes, 7 actions, delta = 0).
    4. **MEPS** (`gov-023` / Section DGBF `362`) — Emploi et Protection Sociale : **91 411 414 044 FCFA** (4 programmes, 15 actions, delta = 0).
    5. **MSCV** (`gov-030` / Section DGBF `444`) — Sports et Cadre de Vie : **70 427 777 385 FCFA** (4 programmes, 11 actions, delta = 0).
    6. **MICOM** (`gov-017` / Section DGBF `336`) — Communication : **39 806 735 298 FCFA** (5 programmes, 9 actions, delta = 0).
    7. **METFPA** (`gov-034` / Section DGBF `334`) — Enseignement Technique, Formation Professionnelle et Apprentissage : **182 301 855 312 FCFA** (4 programmes, 10 actions, delta = 0).
  - Volume budgétaire Batch 1 : **447 938 605 716 FCFA** (25 programmes, 66 actions, delta = 0).
  - Volume budgétaire cumulé vérifié (12 ministères) : **2 157 470 677 361 FCFA** (~12,43% du budget national 2026 de 17 350,2 Mds FCFA).
- **2. Cartographie des 35 Institutions dans le Registre Documentaire Central** :
  - `docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json` mis à jour :
    - 12 ministères `VALIDATED` / `READY_FOR_PUBLICATION` (totaux et programmes réconciliés LFI 2026).
    - 23 ministères documentés avec motifs transparents de blocage ou différé (sections partagées 229, dotation globale sans tableau PAP 7 pour gov-001, cadrage étendu requis pour grands régaliens et pagination complexe).
- **3. Isolation Stricte de Publication** :
  - Maintenue dans `src/budget-ingestion/registry/ministryRegistry.ts` :
    - `getPublishedMinistries()` retourne UNIQUEMENT MMPE (`gov-008`).
    - `getVerifiedMinistries()` retourne les 12 ministères vérifiés.
    - `getPendingMinistries()` retourne les 34 entités non-publiées (23 en attente de documentation).
- **4. Fixtures Golden et Tests d'Intégration Indépendants** :
  - `src/budget-ingestion/__tests__/fixtures/independentDocumentaryGolden.ts` : intègre `INDEPENDENT_LFI_REFERENCES_2026` et couvre l'intégralité des 11 ministères non-MMPE vérifiés avec valeurs en dur strictes.
  - `src/budget-ingestion/__tests__/lot5Generalization.test.ts` : 29 tests vérifiant les contrôles indépendants LFI, ingestion, statut réconcilié, non-publication stricte et tests négatifs de sensibilité.
  - `src/budget-ingestion/__tests__/pilotMinistries.test.ts` : 15 tests validant l'intégrité intacte des pilotes LOT 4.
- **5. Clôture Documentaire & Réconciliation de Pagination (Audit Indépendant)** :
  - Audit systématique de pagination intégrale sur les deux documents sources primaires DGBF : *Annexe 4 DPPD-PAP 2026–2028* (1227 pages, règle stricte `PDF page = Document page + 2`) et *Loi de finances 2026* (583 pages, tableau récapitulatif).
  - Alignement rigoureux avec double citation (ex: `PDF pages 633–656 (Document pages 631–654 sur 1227)`) et pagination exacte de chaque Tableau 7 par programme dans :
    - Les 7 fichiers canoniques JSON (`docs/references/2026/ministry-*/`)
    - Les 7 `SOURCE_REGISTER.md` normalisés (`docs/references/2026/ministry-*/`)
    - `docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json`
    - `docs/budget-ingestion/LOT5_MINISTRY_COVERAGE_REPORT.md`
  - Métadonnées et description GitHub de la PR #28 synchronisées avec les totaux réconciliés (Batch 1 : 447 938 605 716 FCFA, 25 programmes, 66 actions ; Cumulatif 12 ministères : 2 157 470 677 361 FCFA). Zero divergence arithmétique (delta = 0 partout).
- **6. Rapport de Couverture** :
  - `docs/budget-ingestion/LOT5_MINISTRY_COVERAGE_REPORT.md` mis à jour avec la double pagination officielle DGBF.

## LOT 4 : INDUSTRIALISATION DOCUMENTAIRE & ONBOARDING MINISTÉRIEL
- **1. Objectif & Stratégie d'Échantillonnage Pilote** :
  - Sélection motivée de 4 ministères complémentaires couvrant des réalités budgétaires et sectorielles contrastées (panel total de 5 avec le MMPE pilote du LOT 2) :
    1. **MJDH** (`gov-005` / Section DGBF `325`) — Ministère de la Justice et des Droits de l'Homme : Ministère régalien, budget de fonctionnement dominant, réseau déconcentré lourd (juridictions, prisons).
       - Total voté LFI 2026 : **129 151 307 791 FCFA**
       - 4 programmes, 14 actions, delta = 0 (`RECONCILED`).
    2. **MEER** (`gov-025` / Section DGBF `330`) — Ministère de l'Équipement et de l'Entretien Routier : Ministère d'infrastructure lourde et investissement public massif, intégrant le Fonds d'Entretien Routier (FER - 23219).
       - Total voté LFI 2026 : **734 442 904 943 FCFA**
       - 3 programmes, 11 actions, delta = 0 (`RECONCILED`).
    3. **MINEDDTE** (`gov-031` / Section DGBF `343`) — Ministère de l'Environnement, du Développement Durable et de la Transition Écologique : Ministère sectoriel compact, partenariats climatiques et gouvernance écologique.
       - Total voté LFI 2026 : **36 680 067 253 FCFA**
       - 2 programmes, 9 actions, delta = 0 (`RECONCILED`).
    4. **MINEF** (`gov-018` / Section DGBF `345`) — Ministère des Eaux et Forêts : Structure complexe de préservation des ressources naturelles combinant domaine forestier, faune, eau et compte spécial Fonds Forestier National (FFN - 23228).
       - Total voté LFI 2026 : **103 197 582 643 FCFA**
       - 5 programmes, 18 actions, delta = 0 (`RECONCILED`).
  - Volume budgétaire cumulé du panel des 5 ministères : **1 709 532 067 645 FCFA** (soit près de 10% du budget de l'État 2026).
- **2. Registre Documentaire Central des 35 Ministères (`docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json`)** :
  - Registre machine-readable structuré pour l'intégralité des 35 institutions de l'exécutif ivoirien.
  - Chaque entrée contient : `institution_id` (`gov-001` à `gov-035`), `ministry_name`, `official_leader`, `role_title`, `dgbf_code`, `dgbf_title`, `documentation_reference` (plages de pages document et PDF dans l'Annexe 4 DPPD-PAP), statut canonique (`VALIDATED` pour MMPE, `READY_FOR_PUBLICATION` pour les 4 pilotes, `PENDING_CANONICAL_EXTRACTION` pour les 30 autres).
- **3. Protocole Reproductible d'Onboarding (`docs/budget-ingestion/LOT4_MINISTRY_ONBOARDING_PROTOCOL.md`)** :
  - Cycle immuable d'ingestion en 7 étapes.
  - Règle de double vérification : contrôle horizontal ($\sum \text{Actions} = \text{Programme}$) et vertical ($\sum \text{Programmes} = \text{Total LFI}$).
  - Invariants d'intégrité républicaine : `UNKNOWN ≠ 0`, `0 = vrai zéro documenté`, `SOURCE_GAP ≠ RECONCILED`, `NOT_COMPARABLE ≠ RECONCILED`, `Budget Line ≠ Project`.
  - Architecture pluriannuelle (DPPD 2026-2028) et préparation de l'exécution future (RAP).
- **4. Référentiels Canoniques Validés & Registres de Sources** :
  - `docs/references/2026/ministry-justice-human-rights/MJDH_CANONICAL_BUDGET_2026.json` + `SOURCE_REGISTER.md`
  - `docs/references/2026/ministry-equipment-road-maintenance/MEER_CANONICAL_BUDGET_2026.json` + `SOURCE_REGISTER.md`
  - `docs/references/2026/ministry-environment-ecological-transition/MINEDDTE_CANONICAL_BUDGET_2026.json` + `SOURCE_REGISTER.md`
  - `docs/references/2026/ministry-water-forests/MINEF_CANONICAL_BUDGET_2026.json` + `SOURCE_REGISTER.md`
- **5. Registre Central & Isolation Runtime (`src/budget-ingestion/registry/ministryRegistry.ts`)** :
  - MMPE (`gov-008` / `348`) reste le seul ministère `PUBLISHED` dans l'application runtime (`getPublishedMinistries().length === 1`).
  - Les 4 nouveaux pilotes sont enregistrés en statut `VERIFIED` et `STAGED` (`getVerifiedMinistries().length === 5`).
  - Les 30 autres entités sont en statut `PENDING_DOCUMENTATION` et `DRAFT` (`getPendingMinistries().length === 34`).
  - Recherche par code DGBF officiel opérationnelle sur l'ensemble des 35 entités.
- **6. Tests de Référence Golden Reference Tests (`src/budget-ingestion/__tests__/pilotMinistries.test.ts`)** :
  - 8 tests d'intégration stricts exécutant `runMinistryIngestionPipeline` sur les 4 ministères pilotes et vérifiant la cohérence du registre.
  - Résultat global du projet : **19 test files PASS (19/19), 322 tests PASS (322/322), build production PASS**.

## LOT 2 : ARCHITECTURE PILOTE DES MINISTÈRES (MINISTÈRE DES MINES, DU PÉTROLE ET DE L'ÉNERGIE)
- **1. Doctrine Républicaine & Périmètre Pilote Unique** :
  - Un seul ministère pilote : **Ministère des Mines, du Pétrole et de l'Énergie (MMPE)** (`gov-008`, Ministre Mamadou Sangafowa-Coulibaly).
  - Aucun autre ministère (sur les 34 restants) n'a été importé ou généralisé arbitrairement ; transition progressive formalisée.
  - Invariants absolus appliqués : `UNKNOWN ≠ 0`, `UNKNOWN ≠ estimation`, `UNKNOWN ≠ fallback`.
  - Pas de concepts communaux sur les ministères : aucun "Budget Primitif", aucune dotation DGF/DGE communale, aucune mention de Conseil Municipal, aucun compte administratif municipal.
  - `Budget Line ≠ Project` : les 18 projets d'investissements publics majeurs rattachés sont financés *au sein* des actions correspondantes (`is_funded_within_action: true`) et ne s'additionnent JAMAIS par-dessus le budget total du ministère (zéro double comptage : 304 158 991 377 FCFA financés dans les programmes).
  - Élimination stricte de l'agrégat artificiel "Comptes Spéciaux du Trésor & Fonds de Soutien" (prog-mmpe-cas) et rétablissement des 10 programmes officiels DGBF.
- **2. Registre Documentaire Officiel (`docs/references/2026/ministry-mines-petroleum-energy/SOURCE_REGISTER.md`)** :
  - **Source Primaire S1** : *Loi de finances n° 2025-987 du 19 décembre 2025 portant budget de l'État pour l'année 2026* (DGBF / Trésor Public), promulguée le 19 décembre 2025. Budget global de l'État : 17 350,2 Mds FCFA. Dotation budgétaire MMPE : **706 060 209 015 FCFA**. URL officielle : `https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf`.
  - **Source Sectorielle S2** : *Rapport de Présentation Budgétaire & Annexe 4 DPPD-PAP 2026-2028* présenté devant la CAEF du Sénat (12 décembre 2025) et de l'Assemblée Nationale (novembre 2025). URL officielle : `https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf`.
  - **Source Investissements S3** : *Répertoire National des Projets d'Investissements Publics 2026* (18 projets nationaux individualisés totalisant 304 158 991 377 FCFA).
- **3. Modèle de Données & Types TypeScript (`src/types/ministryBudget.ts`)** :
  - Types : `EvidenceType`, `ReconciliationStatus`, `EconomicNature`, `BudgetActivity`, `MinistryLinkedProject`, `BudgetAction`, `BudgetProgram`, `MinistryBudget`.
  - Intégration de `official_code: string` pour les programmes (codes DGBF à 5 chiffres) et actions, `internal_id` et `official_code` pour les projets rattachés.
  - Exporté centralement dans `src/types/index.ts`.
- **4. Référentiel Pilote Réconcilié & Données Séparées du Code** :
  - Données budgétaires externalisées dans `src/data/ministryBudgets/2026/mmpe.json`.
  - `src/data/ministryPilotReferential.ts` refactorisé en loader typé et vérificateur (85 lignes).
  - **Total Ministère** : 706 060 209 015 FCFA (`RECONCILED`, delta = 0).
  - **10 Programmes Officiels DGBF** :
    1. `21106` (`prog-mmpe-21106`) : Administration Générale — 8 701 872 126 FCFA (4 actions, 1 projet lié SI, delta = 0, `RECONCILED`).
    2. `22036` (`prog-mmpe-22036`) : Hydrocarbures — 116 054 336 FCFA (3 actions, delta = 0, `RECONCILED`).
    3. `22037` (`prog-mmpe-22037`) : Energie — 320 914 619 601 FCFA (4 actions, 15 projets majeurs, delta = 0, `RECONCILED`).
    4. `22107` (`prog-mmpe-22107`) : Mines et géologie — 783 321 335 FCFA (4 actions, 2 projets majeurs dont Labo Géologique, delta = 0, `RECONCILED`).
    5. `23230` (`prog-mmpe-23230`) : Appui au financement du secteur de l'électricité — 70 368 000 000 FCFA (1 action, delta = 0, `RECONCILED`).
    6. `23231` (`prog-mmpe-23231`) : Appui au financement de la Société Ivoirienne de Raffinage (SIR) — 57 906 341 617 FCFA (1 action, delta = 0, `RECONCILED`).
    7. `23232` (`prog-mmpe-23232`) : Appui au financement du secteur minier — 28 500 000 000 FCFA (1 action, delta = 0, `RECONCILED`).
    8. `23233` (`prog-mmpe-23233`) : Péréquation produit à la Société Ivoirienne de Raffinage (SIR) — 105 000 000 000 FCFA (1 action, delta = 0, `RECONCILED`).
    9. `23234` (`prog-mmpe-23234`) : Péréquation transport à la Société d'Entreposage et de Gestion des Hydrocarbures (SEGH) — 70 000 000 000 FCFA (1 action, delta = 0, `RECONCILED`).
    10. `23251` (`prog-mmpe-23251`) : Appui au financement à Côte d'Ivoire ENERGIE — 43 770 000 000 FCFA (1 action, delta = 0, `RECONCILED`).
  - Fonction de vérification arithmétique `performMinistryArithmeticCheck(budget)` exportée et validée (delta = 0 sur les 10 programmes et les 21 actions).
- **5. Composants UI Modulaires & Intégration Citoyenne** :
  - Modularisation stricte de l'UI (aucun composant ne dépasse 170 lignes) :
    - `src/components/institutions/MinistryBudgetHeader.tsx` : en-tête officiel, provenance et métriques de réconciliation.
    - `src/components/institutions/ProgramDistribution.tsx` : jauge de distribution proportionnelle des 10 programmes DGBF.
    - `src/components/institutions/LinkedProjectCard.tsx` : carte d'un projet d'investissement lié sans double comptage.
    - `src/components/institutions/BudgetActionList.tsx` : liste des actions d'un programme avec leurs dotations et projets rattachés.
    - `src/components/institutions/BudgetProgramCard.tsx` : carte accordéon d'un programme DGBF avec ses actions et badges officiels.
    - `src/components/institutions/MinistryBudgetProgramView.tsx` : composant orchestrateur épuré (153 lignes).
  - `src/components/InstitutionDetailModal.tsx` :
    - Détection de `institution.type === 'MINISTERE'`.
    - Onglet `FINANCES` adapté : libellé `Budget 2026 (Budget-Programmes)` et badge dynamique `10 Programmes DGBF`.
    - Rendu exclusif de `MinistryBudgetProgramView` sans aucun composant municipal.
  - `src/pages/institutions/MinistriesPage.tsx` : badge `10 Programmes DGBF` sur la carte du MMPE (`gov-008`).
- **6. Tests Unitaires Dédiés & Golden Reference Test (`src/utils/__tests__/ministryBudgetArchitecture.test.ts`)** :
  - Golden Reference Test validant rigoureusement les 10 programmes DGBF, les codes officiels, les montants exacts et l'absence d'agrégat fictif.
  - Vérification de l'interdiction stricte de `prog-mmpe-cas`.
  - Contrôle arithmétique exact Somme(Programmes) = Total Ministère (706 060 209 015 FCFA, delta = 0, statut `RECONCILED`).
  - Contrôle arithmétique exact Somme(Actions) = Total Programme pour chaque programme (delta = 0).
  - Contrôle du non-double comptage des 18 projets liés (304 158 991 377 FCFA financés dans les actions).
  - Non-régression sur communes décentralisées (Bingerville, Cocody, Tiassalé).
- **7. Phase Documentaire Contrôlée — Extraction Canonique Indépendante DGBF (2026-10-05)** :
  - Extraction stricte depuis l'Annexe 4 DPPD-PAP 2026-2028 (`https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf`, 1229 pages, Section 348 MMPE pp. 799-832 / doc pp. 797-830).
  - Aucun montant inventé, redistribué ou déduit par différence. UNKNOWN reste NULL.
  - Production du jeu candidat canonique : `docs/references/2026/ministry-mines-petroleum-energy/ANTIGRAVITY_CANONICAL_EXTRACTION_CANDIDATE.json`.
  - Production du rapport des divergences vs modèle applicatif actuel : `docs/references/2026/ministry-mines-petroleum-energy/ANTIGRAVITY_EXTRACTION_DIFF.md` (112 divergences recensées, dont 16 critiques sur les actions et projets).
  - Sanctuaire du code respecté : 0 fichier dans `src/` modifié (`SRC_FILES_MODIFIED = 0`). Séparation absolue entre extraction et implémentation.

## LOT 1 : ASSAINISSEMENT DE L'INTÉGRITÉ FINANCIÈRE (CLÔTURE DÉFINITIVE PR #24)
- **1. Élimination des Ventilations Arbitraires (Class D -> Éliminées)** :
  - **Ministères (65/35 et 70/30)** :
    - `src/pages/institutions/MinistriesPage.tsx` : Suppression de `* 0.65` et `* 0.35`. Les ministères sans ventilation officielle disposent désormais de `budget_functioning_fcfa: null` et `budget_investment_fcfa: null`.
    - `src/data/institutionsData.ts` : Suppression de `* 0.7` et `* 0.3` ainsi que du fallback de 32,5 Milliards FCFA (`32500000000`).
  - **Mairies & Conseils Régionaux (55/45 et 35%)** :
    - `src/components/PrimitiveBudgetImporterModal.tsx` : Suppression de la moyenne municipale fictive 55% investissement / 45% fonctionnement. `investmentVoted` et `functioningVoted` restent strictement `null` si non fournis.
    - `src/pages/AdminDashboardPage.tsx` : Suppression de l'auto-split 55%/45% dans `handleSaveQuickWeb`, `handleSaveInstitution` et dans les formulaires de saisie de budget primitif.
    - `src/data/communesData.ts` : Suppression du fallback `c.functioningRatio || 0.35` affecté arbitrairement aux 188 communes hors Abidjan. Les communes sans ratio documenté ont désormais `budget_functioning_fcfa: null` et `budget_investment_fcfa: null`.
- **2. Schéma Supabase, Suppression de DEFAULT 0 & Assainissement Legacy Ciblé** :
  - Migration locale complétée : `supabase/migrations/20261005100000_drop_default_zero_institutions_budget.sql` :
    - `ALTER TABLE public.institutions ALTER COLUMN total_budget_fcfa DROP DEFAULT;`
    - `ALTER TABLE public.institutions ALTER COLUMN budget_functioning_fcfa DROP DEFAULT;`
    - `ALTER TABLE public.institutions ALTER COLUMN budget_investment_fcfa DROP DEFAULT;`
    - `ALTER TABLE public.local_budgets ALTER COLUMN operating_amount DROP DEFAULT;`
    - `ALTER TABLE public.local_budgets ALTER COLUMN investment_amount DROP DEFAULT;`
    - Assainissement ciblé historique strictement restreint aux 4 collectivités historiques (`inst-com-abobo`, `inst-com-bingerville`, `inst-com-cocody`, `inst-com-tiassale`) pour remettre à `NULL` uniquement les valeurs `0` issues de l'ancien `DEFAULT 0`. Utilise strictement `CASE WHEN col = 0 THEN NULL ELSE col END`.
    - Aucun `UPDATE` global sans filtre, aucun `UPDATE` sur `local_budgets`.
    - Invariant respecté : `public.ca_investment_operations.executed_amount` conservé intact et STRICTEMENT HORS PÉRIMÈTRE.
    - Zéro écriture distante par l'agent : la migration locale est prête pour application ultérieure sécurisée par l'orchestrateur.
  - Alignement des schémas déclaratifs du dépôt (`supabase/schema.sql` et `supabase_schema.sql`) pour garantir l'absence de `DEFAULT 0` sur ces colonnes budgétaires.
- **3. Neutralité Civique & Nettoyage UI (`InstitutionDetailModal.tsx`)** :
  - Suppression de l'affirmation spéculative *« Collectivité à forte autonomie fiscale... »* remplacée par la mention neutre et factuelle : *« Aucune dotation directe de l'État n'est renseignée pour cette composante dans les données actuellement disponibles. »*
  - Suppression du jargon d'audit interne *« en cours de corroboration avec l'annexe officielle »* remplacé par la formulation civique claire : *« Ventilation détaillée entre dépenses de fonctionnement et dépenses d'investissement non disponible dans les données actuellement publiées. »*
- **4. Pipeline de bout en bout sur `local_budgets`** :
  - `src/utils/budgetValidation.ts` : somme arithmétique protégée sans fallback `|| 0` ; les budgets partiels (total connu mais ventilation inconnue) sont 100% valides.
  - `src/components/InstitutionDetailModal.tsx` : fiabilisation des messages et jauges en cas de ventilation inconnue (`hasInstBreakdown`), élimination de tout affichage trompeur "0%" ou "(0% du budget total)".
  - Export CSV (`exportLocalBudgetsToCsv`) : produit une cellule vide pour les montants inconnus (`null`), et conserve `"0"` pour les vrais zéros documentés.
- **5. AdminDashboardPage — Support Strict des Trois États Budgétaires** :
  - Élimination des conversions `null -> 0` (`inst.budget_functioning_fcfa || 0`, `inst.budget_investment_fcfa || 0`, `inst.total_budget_fcfa || 0`) dans l'état initial, `handleEditInstitution`, `handleOpenCreateInst`, `handleOpenQuickWebEdit`.
  - Logique de calcul du total révisée : si les deux composantes sont null, le total n'est pas faussement calculé à 0.
  - Formulaires d'édition adaptés avec `e.target.value.trim() === '' ? null : Number(e.target.value)` et `value={val != null ? val : ''}`, gérant parfaitement les 3 états : montant renseigné, vrai zéro documenté (0), montant inconnu (null).
- **6. Export Admin & Élimination des Faux Zéros** :
  - `handleExportProspectsCsv` et `handleExportCSV` : remplacement de `p.total_budget_fcfa || 0` et `p.budget_amount_fcfa` par un contrôle null-safe produisant une cellule vide `""` pour les montants inconnus, et préservant `"0"` uniquement pour les vrais zéros documentés.
- **7. Provenance & Élimination du Fallback Fictif** :
  - Suppression intégrale du fallback `'Conseil Municipal / Délibération officielle'` dans `AdminDashboardPage.tsx` et `PrimitiveBudgetImporterModal.tsx`. Une source absente produit `'Source à confirmer'`, jamais un acte délibérant fictif.
- **8. Tests & Validation Renforcée (Tests A à J)** :
  - Suite `src/utils/__tests__/financialIntegrity.test.ts` renforcée (26 tests unitaires, tous PASS) :
    - Test A : Migration targets strictly the 4 legacy historical institutions (`inst-com-abobo`, `inst-com-bingerville`, `inst-com-cocody`, `inst-com-tiassale`).
    - Test B : Migration uses `CASE WHEN col = 0 THEN NULL ELSE col END` for safe targeted sanitation.
    - Test C : Migration forbids any global untargeted UPDATE on institutions.
    - Test D : Migration executes NO data UPDATE on local_budgets and drops DEFAULT on 5 target columns (institutions x 3, local_budgets x 2).
    - Test E : `ca_investment_operations.executed_amount` remains strictly out of scope.
    - Test F : Eliminates speculative "forte autonomie fiscale" inference from citizen UI.
    - Test G : Eliminates internal audit jargon "en cours de corroboration avec l'annexe officielle" from citizen UI.
    - Test H : Preserves genuine documented zero (0 FCFA) across data and presentation layers.
    - Test I : Preserves unknown amounts (NULL) without defaulting to 0 or arbitrary ratios.
    - Test J : Non-regression on verified pilots: Bingerville (4 046 222 000 FCFA) and Tiassalé (CA 2024 SOURCE_ANOMALY, BP 2026 unventilated).
  - 16 suites de tests exécutées : 272/272 tests PASS.
  - TypeScript & Vite build : PASS (0 erreur).

## INDUSTRIALISATION DU CYCLE BUDGÉTAIRE & CONSOLE DOCUMENTAIRE (DURCIE PR #14 — GATE FINAL QUALITÉ)
- **GATE QUALITÉ FINAL VALIDÉ SUR PR #14** :
  - **1. Validation Humaine Bloquante à la Frontière d'Import (`budgetDocumentDryRun.ts`)** :
    - Non-contournement garanti : `buildStandardImportEnvelope()` valide désormais formellement chaque valeur proposée via `isImportableValue()`.
    - Dès lors qu'une valeur financière est au statut `PENDING`, une `Error` explicite est levée (*« Impossible de construire une enveloppe d'importation : la valeur pour [field] est en attente de validation humaine (PENDING). »*).
    - Statut `MARKED_UNKNOWN` avec un montant non null : lève une `Error` explicite (*« Incohérence sémantique : la valeur pour [field] est marquée inconnue mais contient un montant. »* - règle d'or `NULL != 0`).
    - Statut non reconnu ou non importable : lève une `Error` explicite.
    - Statuts autorisés pour l'import : `VALIDATED` (montant validé), `CORRECTED` (montant corrigé), `MARKED_UNKNOWN` (avec montant strictement null).
    - Statut `REJECTED` : exclu du lot d'import. Si toutes les valeurs proposées sont rejetées, lève une `Error` explicite (*« Aucune valeur importable valide dans le document (toutes les valeurs sont rejetées ou absentes). »*).
    - Helpers dédiés exportés : `isImportableValueStatus(status)` et `isImportableValue(value)`.
  - **2. Sémantique Financière Stricte & Bloquante pour Actes Modificatifs** :
    - Pour `BUDGET_MODIFICATIF`, `BUDGET_SUPPLEMENTAIRE`, `DECISION_MODIFICATIVE`, `VIREMENT_CREDITS` :
      Si `amount_semantics === 'UNKNOWN'` ou absent, l'import est bloqué (`can_import = false`, `is_valid = false`) avec erreur bloquante : *« La sémantique des montants (cumulatif ou différentiel) doit être précisée pour les actes modificatifs. »*
    - `DELTA` et `REVISED_TOTAL` sont autorisés et traités selon leurs sémantiques respectives.
  - **3. Suppression Totale des Fallbacks de Version Inventée & Matrice 4 Cas** :
    - Retrait de tout fallback artificiel `|| 1`, `?? 1` ou `+ 1` dans `budgetDocumentDryRun.ts`.
    - Détection de conflit avec un BP publié existant traitant rigoureusement les 4 combinaisons de versions :
      1) Version existante connue & nouvelle version connue : conflit si `newVer <= existingVer` ; autorisé comme révision si `newVer > existingVer`.
      2) Version existante connue & nouvelle version indéterminée (`undefined`) : conflit bloquant (requiert précision de version).
      3) Version existante indéterminée & nouvelle version connue : conflit bloquant (requiert arbitrage humain).
      4) Deux versions indéterminées : conflit bloquant (requiert arbitrage humain).
    - Nettoyage d'API : suppression du paramètre mort `existingBudgetsCount = 0` dans la signature de `buildStandardImportEnvelope()`.
    - `LocalBudget.version_number` et `BudgetAmendment.version_number` déclarés optionnels (`version_number?: number`).
    - Si la version officielle est inconnue, elle reste strictement `undefined` (aucun faux numéro injecté).
    - Affichage citoyen et référentiel (`LocalBudgetHistoryView`, `dataStore`, `localBudgetsReferential`) adaptés en toute sécurité (`version_number != null ? ...`).
  - **4. Normalisation Canonique des Types & Fingerprint Déterministe** :
    - Fonction `normalizeDocumentIdentityType(rawType)` centralisée et exportée dans `budgetDocumentDryRun.ts`.
    - Établit l'équivalence canonique `BUDGET_PRIMITIF` <-> `PRIMITIF_ADOPTE` pour la console et le stockage.
    - Préserve formellement les types distincts : `PRIMITIF_APRES_TUTELLE`, `AUTORISATION_EXECUTION`, `BUDGET_SUPPLEMENTAIRE`, `MODIFICATIF_1`, `MODIFICATIF_2`, `BUDGET_MODIFICATIF`, `DECISION_MODIFICATIVE`, `VIREMENT_CREDITS`, `COMPTE_ADMINISTRATIF`.
    - Détection cross-vocabulaire : un budget primitif ingéré via la console avec `BUDGET_PRIMITIF` est immédiatement reconnu comme doublon exact s'il existe déjà sous `PRIMITIF_ADOPTE` avec la même référence et date.
    - Deux actes distincts (BM1 vs BM2, BS vs BM, virements distincts) conservent des empreintes distinctes sans fausse collision.
  - **5. Hygiène des Types & Accès Sécurisé** :
    - Ajout de `amount_semantics?: 'DELTA' | 'REVISED_TOTAL' | 'UNKNOWN'` dans `LocalBudget`.
    - Élimination des casts `(doc as unknown as { amount_semantics?: string })` dans `budgetCycleEngine.ts`.
- **MOTEUR DE CONSOLIDATION DU CYCLE BUDGÉTAIRE (`budgetCycleEngine.ts`)** :
  - **Architecture Unifiée du Cycle & Étapes Distinctes du BP** :
    - Préservation chronologique étanche : `PRIMITIF_ADOPTE` (vrai BP initial voté par le Conseil), `PRIMITIF_APRES_TUTELLE` (BP approuvé par la tutelle DGDDL), `AUTORISATION_EXECUTION` (budget rendu exécutoire).
    - Actes Modificatifs réels : `BUDGET_SUPPLEMENTAIRE` (BS), `DECISION_MODIFICATIVE` (DM), `VIREMENT_CREDITS` (virement sans altération du total), `MODIFICATIF_1`, `MODIFICATIF_2`.
  - **Fiabilisation des Crédits Définitifs (`final_credits_status`)** :
    - `SOURCE_CONFIRMED` : issu directement d'un document officiel clôturant les crédits.
    - `DERIVED_FROM_DOCUMENTED_AMENDMENTS` : calculé à partir du BP et d'une chaîne complète attestée (`amendment_chain_status = 'COMPLETE'`).
    - `NOT_ESTABLISHED` : non établi en cas de BP seul ou de chaîne partielle/non exhaustive. **Garantie absolue : les crédits définitifs ne reprennent JAMAIS le BP par défaut.**
    - En cas de chaîne partielle, calcul distinct d'un `documented_adjusted_amount` provisoire sans le qualifier de crédits définitifs.
  - **Virement de Crédits & Règle `NULL != 0`** :
    - Un virement peut avoir un solde net total `0 FCFA réel` (conservé rigoureusement).
    - Une modification non chiffrée reste `NULL` / `UNKNOWN` et n'est jamais convertie en 0.
  - **Provenance & Page Source Propagée** :
    - Chaque valeur et chaque acte propage le numéro de page source (`page: 36`) de bout en bout.
- **RESTITUTION CITOYENNE DANS LE COMPTE ADMINISTRATIF (`AdministrativeAccountView.tsx`)** :
  - Bloc supérieur dédié : « *Traçabilité du Cycle Budgétaire — Exercice [Année]* » en 3 étapes claires (BP initial, modifications, crédits définitifs dérivés).
  - Préservation intégrale et étanche du bandeau civique `SOURCE_ANOMALY` de Tiassalé 2024, des 3 opérations d'investissement et des 3 rapprochements DGMP `STRONG`.
- **ZÉRO IMPACT SUR LA BASE DE DONNÉES DISTANTE** :
  - `NEW_TABLES: NONE`
  - `NEW_COLUMNS: NONE`
  - `NEW_MIGRATIONS: NONE`
  - `SUPABASE_WRITTEN: FALSE`
  - `SUPABASE_PUBLISHED: FALSE`
- **VALIDATION TECHNIQUE & TESTS** :
  - **244/244 tests unitaires et d'intégration PASS** sur 15 suites (`npm test`).
  - **`npm run build` PASS** (zéro erreur TypeScript, sortie Vite propre).
  - Deux nouvelles suites de tests spécialisées :
    - `src/utils/__tests__/budgetCycleEngine.test.ts` (13 tests) : consolidation du cycle, prise en compte des modifications négatives, préservation des valeurs nulles et zéros réels, formules dérivées, double taux d'exécution, préservation de `SOURCE_ANOMALY`, non-régression Bingerville, Cocody et Tiassalé.
    - `src/utils/__tests__/budgetDocumentWorkflow.test.ts` (36 tests) : génération de formulaires d'extraction, pre-flight dry-run (institution invalide, année invalide, provenance manquante, montants négatifs invalides, arithmétique, préservation UNKNOWN=null, conflits de versions publiées selon la matrice des 4 cas sans fallback arbitraire), frontière d'importation et validation humaine obligatoire (tests A-G, rejet strict PENDING, rejet MARKED_UNKNOWN avec montant, exclusion REJECTED, erreur sur lot vide), conversion en lot d'import standard.


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
  - Analyse comptable municipale : Le document indique simultanément des recettes recouvrées supérieures aux prévisions et des dépenses ordonnancées supérieures aux crédits primitifs. Cette concomitance ne permet pas, à elle seule, d’établir le mécanisme juridique ou comptable ayant autorisé le dépassement.
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
  - Bandeau d'alerte civique de réconciliation documentaire expliquant le taux de 117,52% et la concomitance avec des recettes supérieures sans présomption d'irrégularité ni d'autorisation implicite.
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
1. Audit et contrôle indépendant par l'orchestrateur (ChatGPT) de la PR LOT 5.
2. Revue contradictoire des 7 référentiels canoniques du Batch 1 (MAIED, MAM, MFPMA, MEPS, MSCV, MICOM, METFPA), des fixtures golden et du rapport de couverture.
3. Autorisation formelle de merge de la PR LOT 5 et cadrage du Batch 2 (LOT 6).

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

## CORRECTIF DOCUMENTAIRE PR #31 — 10 OCTOBRE 2026
- Rectification des références de sections des juridictions suprêmes dans le présent handoff : Cour de cassation **114**, Conseil d’État **118**, Cour des comptes **115**, suivant `docs/references/2026/ministry-reconciliation/PR31_FINAL_DOCUMENTARY_CONTROL.md`.
- Le registre `pr31_ministry_reconciliation_register.csv` distingue **15 égalités numériques non certifiées**, **15 écarts de périmètre à instruire**, **4 portefeuilles composites** et **1 portefeuille sans section autonome identifiée**. Une égalité de chiffres ne certifie ni l'identité de portefeuille ni son assiette.
- **Aucun des 35 montants applicatifs ne doit être écrasé automatiquement** par une section candidate. Les crédits de paiement, autorisations d’engagement, dotations directement gérées et données d’exécution sont des catégories distinctes.
- La réussite de la CI ne signifie pas certification financière des 35 fiches. Pas de fusion, d'écriture Supabase ni de déploiement intentionnel dans ce lot.

## PR48_INTEGRITY_PRIVACY_CORRECTION — 12 octobre 2026

Base #48 : `326558f48ba2e8cd960f1e3fd2f9b34be20f6204`. Branche `codex/pr48-integrity-privacy-fixes`. Corrections ciblées P0/P1 : annexes et hashes exacts, états documentaires datés, certification d’extraction limitée aux audits existants, contribution approuvée distincte d’une réalisation vérifiée, projection publique anonyme séparée du dossier et des médias privés. Identité nécessaire à l’instruction conservée.

Preuves HTTP, empreintes, avant/après et limites : section du 12 octobre 2026 dans `docs/CODEX_CHECKPOINT.md`. Aucun changement de dépendances/Tailwind, de migration, de montant financier ; aucune écriture Supabase, fusion ou commande de déploiement. Certification manquante bloquée uniquement sur les documents concernés.

VALIDATION : suite initiale 694/694 ; tests adversariaux et contrôle PGlite ajoutés. Résultats finaux et CI à reporter après exécution.

UX_UI_AUDIT_STATUS : vérification ciblée Documents / Projets / Observatoire / dépôt citoyen en cours à 390/640/768/1024/1440 px ; ne vaut pas certification globale des lots 6 à 15.

NEXT_EXECUTABLE_TASK : validation finale humaine de la PR corrective dépendante de #44–#48 ; vérifier l’état des règles distantes en lecture seule avant toute mise en production autorisée. Ne pas fusionner ni déployer automatiquement.

## RECETTE_FINALE_PRODUCTION — 12 OCTOBRE 2026

- **APPLICATION TESTÉE** : https://suivibudget.vercel.app/ (Production Vercel)
- **COMMIT DÉPLOYÉ ACTIF** : `771f5cf11b30d4491ce16e23db1f993702164276` (validé en production le 12/10/2026 à 13:03:10 UTC).
- **RÉFÉRENCE MASTER** : `e170ead5373154cc87495e757874a6d5031b60a7`. Les commits intermédiaires ont échoué sur Vercel uniquement pour cause de quota quotidien dépassé (`api-deployments-free-per-day` > 100/jour), sans erreur de build.
- **RÈGLES DE SÉCURITÉ** : `REMOTE_SUPABASE_WRITES = 0`, aucune modification de base distante, aucune soumission fictive.
- **AUDIT MULTI-VIEWPORTS RÉEL** : 8 formats d'écrans testés (360, 375, 390, 430, 768, 1280, 1440, 1920 px) sur 11 routes publiques.
  - Console JS : 0 erreur, 0 avertissement bloquant.
  - Réseau Supabase : 100% requêtes REST en code 200 OK.
  - Zoom : 200% et 400% validés sans rupture de reflow.
- **MATRICE DES LOTS 1 À 15 EN PRODUCTION** :
  - Lots 1 à 15 : Tous les parcours fonctionnels sont actifs et vérifiables en production (annuaires ministères/institutions/collectivités/régulateurs, consultation documentaire, projets, observatoire, Open Data).
- **INTÉGRITÉ FINANCIÈRE & VIE PRIVÉE** :
  - Cour Suprême : Affiche bien *"Non individualisé (LFI 2026)"* avec explicitation constitutionnelle (0 faux zéro).
  - Principe P7 : *"Budget voté ≠ réalisation physique"* et statut *"Réalisation physique non certifiée"* respectés.
  - Confidentialité citoyenne : 0 fuite d'email ni téléphone (anonymisation *"Citoyen observateur"* effective).
- **ANOMALIES CORRIGÉES (PR #57)** :
  - UX-11 (P1 - A11y) : Fermeture de `ProjectDetailModal` sur touche `Escape` et clic sur le backdrop.
  - UX-01-RECETTE (P2 - Responsive) : Suppression du débordement de 8.7px à 768px dans `HeroSection`.
  - Branche : `fix/recette-prod-modal-escape-hero-overflow` (PR #57 ouverte sur `master`).
- **PROCHAINE ACTION** : Revue ChatGPT de la PR #57 et relance du déploiement Vercel après réinitialisation du quota quotidien.

