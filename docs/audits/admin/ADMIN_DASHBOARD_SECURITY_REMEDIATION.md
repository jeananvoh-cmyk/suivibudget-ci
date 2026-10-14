# Correction finale de sécurité et de persistance admin

Date : 13 octobre 2026. Branche isolée : `codex/admin-dashboard-persistence-hardening`.

## Références et décision de livraison

- HEAD initial de cette mission : `396ff29ed6cde2ecd4549e1049d6a3a3ec1bbf29`.
- Base cumulative du patch : `a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d`.
- HEAD technique final testé : `4c4a962f07e0d469e0fc9787ec371954eda1e9ab`.
- Le SHA final incluant ce rapport, les commits, le SHA-256 et la taille du patch sont consignés après commit dans `delivery-manifest.json`, livré à côté du patch. La copie livrée de ce rapport porte également ce SHA final ; aucun SHA autoréférent n'est inventé dans Git.
- Commits antérieurs conservés : `57575c1e4f9f9beec1546da0fd736922194f26fb`, `66f1f0accee9fcbc5d237413980d4d939d74a5fc`, `396ff29ed6cde2ecd4549e1049d6a3a3ec1bbf29`.

**Revue indépendante locale : OUI. Fusion : NON. Production : NON.** Les cinq correctifs sont implémentés et testés localement. L'intégration complète de #62 et la recette Auth/Storage hébergée restent BLOCKED. Aucun push ni nouvelle PR n'est effectué tant que #62 est ouverte, conformément à la décision humaine.

Le rapport de persistance précédent reste un état historique du contrat 1 et de ses 811 tests. Le présent rapport décrit le contrat 2 et prime pour la recette et toute proposition de déploiement.

## État externe observé, en lecture seule

GitHub : [PR #62](https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/62) OPEN, non fusionnée ; branche `feat/admin-financial-document-ingestion-pilot`, HEAD `7af1c5b89f75ae32fb7de8b63ccb2d035d38a61d`, dernière mise à jour observée `2026-10-13T16:32:14Z`. Master relu : `a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d`. Aucun commit Antigravity n'a été intégré, remplacé ou modifié.

Supabase autorisé : `cdesuvcozcetdtvibgqs`, requêtes SELECT uniquement. Les six colonnes documentaires étaient absentes au contrôle. Cocody 2024 : `doc-dff4865a-c6a8-418e-8895-626258e409d0`, `TO_VERIFY`, vérification `TO_VERIFY`, version 1, SHA-256 `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`, inchangé. Le fichier réel n'a pas été téléchargé, signé, attesté ou remplacé par cette mission.

Inventaire conservé : institutions 4, projets 0, articles 0, annuaire CAIDP 0, documents 1, budgets locaux 3, comptes administratifs 3, lignes CA 24, lignes BP détaillées 0. Les buckets existants public_documents et citizen_photos restent privés. La migration préparée et les deux Edge Functions modifiées ne sont pas installées en production.

## Reproductions indépendantes et corrections

### P0-01 — Journal d'audit

Cause : la lecture utilisait un groupe staff commun et les snapshots conservaient des références médias inutiles. Deux tests adversariaux appliqués au contrat initial ont échoué : accès du modérateur à un événement financier et présence d'une référence `storage://admin_media/...` dans le snapshot. Preuves exécutables : `security-before-p0.log` (2 FAIL) puis `security-after-p0.log` (3 PASS ciblés), et suite SQL finale.

Correction : `admin_audit_read` appelle `private.admin_domain_allowed` pour les domaines métier et tâches associées. `private.admin_redact` conserve une liste explicite de scalaires utiles à la traçabilité ; URL, chemins Storage, coordonnées, texte libre et objets imbriqués sont exclus. Le motif est expurgé des URL, courriels et numéros ressemblant à des téléphones. La provenance du journal ne contient que l'identifiant de source. Les détails complets restent dans la ressource privée accessible selon ses propres droits.

Acteur, rôle protégé et horodatage restent attribués par le serveur. Les clients ne peuvent insérer, modifier ni supprimer le journal. `admin_mutate` reste SECURITY INVOKER. Les helpers privilégiés ont un search_path vide, un propriétaire postgres dans la fixture et des EXECUTE limités ; les fonctions trigger sont inaccessibles aux clients. Les faux rôles JWT, appels directs et tentatives de falsification sont refusés par les tests SQL.

### P0-02 — Métadonnées de #62

Cause : le modèle frontend de #62 transporte six champs inexistants sur la production observée ; le contrat initial ne les persistait pas. Le test `stocke les six métadonnées PR62...` reprend la forme JSON observée dans la PR, sans appliquer ses commits ni qualifier ses empreintes manuelles.

La migration locale existante est enrichie, additive et réexécutable : `is_multipart boolean NOT NULL DEFAULT false`, `parts_count integer NOT NULL DEFAULT 1`, `document_parts jsonb NOT NULL DEFAULT '[]'`, `is_scanned boolean` et `has_text_layer boolean` nullables, `ocr_status text NOT NULL DEFAULT 'NONE'`. Les inconnus ne deviennent pas faux ou vrai par supposition. Types TypeScript, allowlists RPC, lectures et sauvegardes sont adaptés. Un trigger impose bornes, cohérence et valeurs OCR permises ; contradiction scan/couche texte refusée.

Les anciens monofichiers gardent leur identité et leur historique. Les nouveaux fichiers, leur collectivité, exercice, version, chemins, checksums, tailles et identités de parties ne sont pas remplaçables silencieusement. Un changement documentaire pertinent remet la qualification en attente ; remplacer les originaux exige une nouvelle version. `TO_VERIFY → VERIFIED → PUBLISHED` reste un contrôle humain puis une publication explicite distincte.

### P1-01 — Storage et médias privés

Cause : la politique permissive `admin_media_read` permettait de contourner l'autorisation métier de la fonction de signature par une lecture directe. Les tests attaquent les policies SQL même après ajout volontaire de policies permissives et de GRANT UPDATE/DELETE.

Correction : suppression de cette politique ; policy restrictive de lecture pour admin_media, sans exception staff directe. Accès uniquement à travers `admin-media-url`, qui relit la ressource sous RLS, résout le champ stocké et refuse chemin/clé substitués, archives et fichier absent/altéré. Les profils institutionnels relèvent d'ADMIN/DATA_MANAGER, les publications d'ADMIN/MODERATOR. Les fichiers financiers et citoyens ont aussi des restrictions de domaine au niveau Storage.

Upload privé dans le répertoire UUID de l'opérateur actif, sans écrasement. Le rattachement doit appartenir à cet opérateur, exister réellement et ne pas être partagé avec une autre ressource. Remplacement UPDATE interdit pour les originaux ; DELETE admin_media interdit ; DELETE public_documents uniquement pour les originaux non référencés, avec helper qui voit toutes les références de parties et attestations. Les versions et preuves restent conservées.

Signatures de 60 secondes, réponse sans cache. Archivage/dépublication empêchent les nouvelles signatures hors droits. Une URL précédemment émise peut rester valable jusqu'à son expiration ; aucune révocation instantanée n'est annoncée. L'expiration est contrôlée par le service Storage réel et reste à recetter sur environnement autorisé.

### P1-02 — Reçus et reprise

Cause : l'ancien replay pouvait retourner l'état courant modifié comme confirmation du premier commit. Les tests SQL/service reproduisent commit, modification concurrente, replay, archivage et retrait du rôle ; les E2E reproduisent la réponse perdue puis le rechargement du navigateur.

Correction : `admin_operation_receipts`, clé primaire globale operation_id, auteur/ressource/contenu exact/révision attendue liés définitivement. Le reçu et le journal sont créés dans la transaction de mutation ; aucun droit d'écriture client sur les reçus. Leur lecture est limitée à l'auteur encore habilité. Le contenu privé éventuellement nécessaire à la comparaison reste privé ; il n'est pas transféré au journal administratif ni conservé dans sessionStorage.

Le serveur retourne `_operation.original` (identité, révision, date du commit), `current_revision`, `replayed` et `changed`. La réutilisation par un autre auteur ou pour un autre contenu échoue ; les droits sont réévalués au replay. Le client refuse un replay changed ou une relecture d'une autre identité/révision ; la saisie reste ouverte. SessionStorage ne conserve que UUID et empreinte du contenu, par compte/ressource, pour reprendre après reload. L'empreinte n'est pas une clé d'autorisation.

Verrou transactionnel par operation_id, révision optimiste et lots atomiques conservés. Un lot comprenant un replay changé annule aussi ses nouvelles écritures, reçus et audits. Double clic, commit perdu, retry identique/modifié, deux formulaires et rollback intégral passent les tests. Les sessions PGlite sont séquentielles : il ne s'agit pas d'une preuve de contention entre deux connexions PostgreSQL hébergées simultanées.

### P1-03 — Octets et multifascicules

Cause : une empreinte manuelle valide syntaxiquement ne prouve ni la présence ni l'intégrité du fichier. Les tests utilisent de vrais File/Blob, des téléchargements simulés et le handler Edge réel transpillé ; les métadonnées seules ne suffisent plus à vérifier un original.

Le client calcule SHA-256 sur chaque fichier réellement téléversé ; l'Edge télécharge chaque original privé, contrôle existence, taille et checksum, et le header PDF pour les PDF/CA. CSV/Excel gardent leur contrôle des octets distinct de toute extraction financière. Le RPC privilégié `admin_confirm_document_integrity`, EXECUTE uniquement service_role, lie l'attestation à l'opérateur protégé actif, au document et à sa révision. Le client ne peut écrire checksum_status ni fabriquer une attestation.

`DECLARED` signifie une empreinte non attestée, même si elle a été calculée par le navigateur. `COMPUTED` est dérivé de l'attestation des octets Storage. Une attestation de fichier ne rend pas le document humainement VERIFIED. Toute publication reste une décision séparée. L'identité/version/hash des vrais documents Cocody n'est pas utilisée comme fixture ni modifiée.

Chaque partie conserve ordre, identité, nom original, chemin, taille, SHA et plages de pages. Le serveur refuse comptes incohérents, ordre inversé, doublons d'identité/chemin/hash, traversées de chemin, trous et chevauchements. Les pages peuvent rester inconnues en attente de contrôle ; ni 22/44 ni un total par défaut ne sont inventés. La vérification exige toutes les plages cohérentes, démarrant à 1, et le total déclaré cohérent s'il existe ; la correspondance réelle des pages est une responsabilité du contrôleur humain.

Manifeste déterministe UTF-8, algorithme `SHA256_PARTS_MANIFEST_V1` : préfixe `SUIVIBUDGET_PARTS_V1\n`, puis chaque partie dans l'ordre `order|id|storage_path|size|sha256|page_start|page_end\n`. Les données sont normalisées et contraintes avant le calcul côté serveur et client. Ce SHA est celui du manifeste, jamais présenté comme le SHA d'un PDF fusionné inexistant. Chaque PDF original reste téléchargeable individuellement après publication et contrôle de ses octets.

## Matrice de sécurité du contrat préparé

Les autorisations ci-dessous sont testées localement et ne prétendent pas décrire une migration déjà installée. « Médias financiers » comprend originaux public_documents et profils institutionnels ; « publications » concerne news_articles/admin_media.

| Rôle | Journal financier | Journal modération | Médias financiers | Médias publications | Écriture autorisée |
|---|---|---|---|---|---|
| ADMIN actif | Oui | Oui | Oui, resource/RLS + Edge pour admin_media | Oui, resource/RLS + Edge | Tous domaines, statuts/versions contrôlés |
| DATA_MANAGER actif | Oui | Non | Oui dans son domaine | Non pour brouillons ; publié via ressource publique seulement | Institutions, projets, BP, documents, CAIDP et tâches documentaires/contact |
| MODERATOR actif | Non | Oui | Non pour privé ; document publié via Edge publique | Oui dans son domaine | Publications, modération et tâches de preuves |
| Citoyen authentifié | Non | Non | Publié seulement, signature Edge | Publié seulement, signature Edge | Ses contributions selon règles existantes ; aucune mutation admin |
| Anonyme | Non | Non | Publié seulement, signature Edge | Publié seulement, signature Edge | Aucune mutation admin |
| Personnel désactivé | Non | Non | Aucun privé ; public selon règles publiques | Aucun privé ; public selon règles publiques | Aucune mutation admin |

Implémentation : `private.admin_domain_allowed`, `admin_audit_read`, policies des ressources/tâches, `admin_media_no_direct_read`, `documents_staff_domain`, `citizen_media_staff_domain`, `immutable_admin_originals`, `protected_admin_originals`, trigger de rattachement ; les Edge signent uniquement une référence issue de la ressource autorisée.

Correspondance tests : `adminPersistenceDatabase.test.ts` (journaux cloisonnés, modération privée, faux JWT, rôle retiré, publications, paramètres, droits de fonctions) ; `adminMediaSecurity.test.ts` (ADMIN/DM/MOD/citoyen/anonyme/inactif, accès direct, rattachement, substitution, archive, originaux, publication) ; E2E « REST simulé : journaux cloisonnés... ». Les paramètres restent ADMIN uniquement. Aucun test REST simulé n'est présenté comme une recette PostgREST hébergée.

## Contrôle transversal et limites

- Retrait de source : retrait des publications dépendantes, réouverture des tâches ; historique et originaux conservés. Publication directe et clôture injustifiée refusées, SQL et navigateur.
- BP/prévision, CA/exécution et réalisé distincts. Inconnu reste null, zéro explicite reste zéro. Aucun référentiel de montants ou catalogue officiel modifié pendant cette correction de sécurité.
- Contribution APPROVED ne certifie pas une réalisation physique. Acteur de modération serveur, identité/contact privé hors projection publique et journal ; les tests existants et renforcés passent. L'identité nécessaire à l'instruction privée reste conservée.
- Aucune dépendance, Tailwind/PostCSS/Vite, donnée financière réelle, migration distante ou déploiement modifié. Une migration locale déjà préparée est enrichie ; elle ne doit pas être appliquée automatiquement.
- Le service_role et le propriétaire PostgreSQL restent des autorités privilégiées ; la sécurité ne prétend pas résister à un administrateur serveur compromis. Le client n'obtient jamais ces secrets. Une métadonnée de taille/header n'est pas une analyse antivirus ni une preuve d'authenticité de l'autorité émettrice.
- L'Edge actuellement testée est son code réel, exécuté localement avec Auth/transport/Storage simulés et SQL/RLS réel. GoTrue, PostgREST et signature/expiry Storage hébergés : BLOCKED, aucun environnement de recette autorisé disponible. Aucune certification de production n'est annoncée.

## Validation et preuves livrées

| Vérification | Résultat | Preuve |
|---|---|---|
| Installation verrouillée offline | PASS, 184 paquets, 0 vulnérabilité signalée | security-npm-ci.log |
| Tous tests | 832/832, 63 suites | security-all-tests-final.log |
| PostgreSQL/RLS, migration appliquée deux fois + restauration isolée | 24/24 | adminPersistenceDatabase.test.ts |
| Services, reprises et révisions | 12/12 | adminPersistenceService.test.ts |
| Médias/originaux/handlers Edge | 13/13 | adminMediaSecurity.test.ts ; security-media-types-final.log |
| TypeScript | PASS | security-typescript-final.log, commande terminée code 0 |
| Build public | PASS, 31,45 s ; avertissement chunks volumineux existant | security-build-final.log |
| Build review | PASS, 5,45 s | security-review-build-final.log |
| Navigateur Playwright | 16/16 ; erreurs console/API inattendues 0 ; egress transféré 0 | browser/results.json et captures |
| Auth GoTrue / Storage / PostgREST hébergés | BLOCKED | Aucun environnement autorisé de recette |
| CI GitHub | NON EXÉCUTÉE | Branche non poussée, aucune PR corrective créée |
| Contrat six champs #62 | PASS local | Test JSON observé, types, migration, services et UI |
| Intégration complète de #62 | BLOCKED | #62 OPEN, attente humaine impérative |

Commandes Windows réelles : `npm ci --ignore-scripts --cache ../npm-cache --offline`, `npm test -- --configLoader native --maxWorkers=2`, `node node_modules/typescript/bin/tsc --noEmit`, `npm run build -- --configLoader native`, `npm run build:review -- --configLoader native --outDir ../security-review-build`, `node scripts/verify-admin-persistence-browser.cjs`. Shim externe `NODE_OPTIONS=--require ../native-config.cjs` pour le loader natif Node 24 sous Windows ; aucun changement de config ou dépendance du dépôt. La CI Linux distante n'a pas été exécutée.

Le navigateur utilise une build isolée, une clé publique fictive et un endpoint simulé, sans secrets ni egress transféré. Scénarios : deux sessions, réponse perdue/reload, conflits/formulaire conservé, documents ordinaires et multifascicules, contrôle/publication séparés, profils, articles, projets, annuaire, tâches, inconnu/null, brouillons absents du public. Breakpoints 360/640/768/1024/1440 px ; inspection visuelle des captures 360 et 1440 effectuée. Cette inspection ne certifie pas tous les écrans ou une conformité WCAG complète.

La suite complète a passé avant une annotation TypeScript du résultat COUNT dans un test ; ce test médias a ensuite été réexécuté (13/13) et TypeScript/builds ont passé sur la version finale. Aucun changement fonctionnel après ces validations.

## Périmètre et conflits d'intégration

Statistiques sécurité depuis le HEAD initial : 23 fichiers, +1159/-103 lignes.
Statistiques cumulatives depuis master de référence : 48 fichiers, +4396/-2291 lignes.
La liste exacte des fichiers et numstat est livrée dans `scope.json` ; le worktree final doit être propre, hors artefacts ignorés de build. Les seuls nouveaux fichiers de cette dernière correction sont le rapport demandé ; les tests et composants existants sont enrichis.

- `docs/AGENT_HANDOFF.md`
- `docs/CODEX_CHECKPOINT.md`
- `docs/audits/admin/ADMIN_DASHBOARD_PERSISTENCE_REMEDIATION.md`
- `docs/audits/admin/ADMIN_DASHBOARD_SECURITY_REMEDIATION.md`
- `docs/maintenance/RUNBOOK.md`
- `scripts/verify-admin-persistence-browser.cjs`
- `src/components/BudgetReportsView.tsx`
- `src/components/CaidpRiManager.tsx`
- `src/components/DocumentManager.tsx`
- `src/components/InstitutionDetailModal.tsx`
- `src/components/PrimitiveBudgetImporterModal.tsx`
- `src/components/ProjectCard.tsx`
- `src/components/ProjectDetailModal.tsx`
- `src/components/admin/AdminGlobalSearchModal.tsx`
- `src/components/admin/AdminWorkQueue.tsx`
- `src/components/admin/AdministrativeAccountsAdminManager.tsx`
- `src/components/admin/DataImportConsole.tsx`
- `src/components/admin/ExamineCADocumentModal.tsx`
- `src/components/admin/SingleCAUploadModal.tsx`
- `src/data/caidpRiData.ts`
- `src/pages/AdminDashboardPage.tsx`
- `src/pages/DocumentsPage.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/ProjectsPage.tsx`
- `src/pages/institutions/MinistriesPage.tsx`
- `src/pages/institutions/MunicipalitiesPage.tsx`
- `src/pages/institutions/NationalInstitutionsPage.tsx`
- `src/pages/institutions/RegionalCouncilsPage.tsx`
- `src/pages/institutions/RegulatoryAuthoritiesPage.tsx`
- `src/services/adminPersistenceService.ts`
- `src/services/adminTaskService.ts`
- `src/services/dataStore.ts`
- `src/services/documentStorageService.ts`
- `src/types/adminWorkflow.ts`
- `src/types/index.ts`
- `src/types/publicDocument.ts`
- `src/utils/__tests__/adminMediaSecurity.test.ts`
- `src/utils/__tests__/adminPersistenceDatabase.test.ts`
- `src/utils/__tests__/adminPersistenceFixtures.ts`
- `src/utils/__tests__/adminPersistenceService.test.ts`
- `src/utils/__tests__/caManagement.test.ts`
- `src/utils/__tests__/financialIntegrity.test.ts`
- `src/utils/__tests__/projectPassport.test.ts`
- `src/utils/__tests__/realPilotChain.test.ts`
- `src/utils/projectPassport.ts`
- `supabase/functions/admin-media-url/index.ts`
- `supabase/functions/public-document-url/index.ts`
- `supabase/migrations/20261013165625_admin_dashboard_persistence_hardening.sql`

Chevauchements observés avec #62 : `src/services/dataStore.ts`, `src/types/publicDocument.ts`, `src/components/admin/SingleCAUploadModal.tsx`, `src/components/admin/ExamineCADocumentModal.tsx`, `docs/AGENT_HANDOFF.md`, `docs/CODEX_CHECKPOINT.md`. Résolution attendue après stabilisation : préserver le dry-run financier, la documentation pilote et les tests Cocody d'Antigravity ; conserver les six métadonnées ; combiner ses champs avec les contrôles serveur, origines réellement téléversées, UNKNOWN et qualification séparée. Remplacer les saisies de SHA manuelles et pages automatiques par ce contrat de fichiers contrôlés, sans écraser les ajouts financiers. Ses fichiers budgetDocumentDryRun et cocodyCa2024Pilot ne sont pas réécrits dans ce worktree.

Le patch livré est un diff Git binary complet de la base a1ec60e à la livraison finale, pas un extrait des seuls derniers correctifs. Son SHA-256 et sa taille doivent être vérifiés avant revue/application ; son applicabilité inverse est vérifiée contre le HEAD livré. Le bundle Git complémentaire conserve les commits exacts. Rien n'est appliqué sur master dans cette mission.

## Conditions de déploiement et retour arrière

1. Attendre fusion/fermeture de #62, relire ses éventuelles suites, puis réconcilier sur le master réel dans un worktree Codex isolé. Refaire toutes les validations et faire relire la PR unique par ChatGPT/responsable humain. Aucune PR concurrente actuelle.
2. Obtenir validation du contrat 2, de la migration additive, des ACL/RLS/owners et des deux Edge Functions. Une recette autorisée doit vérifier JWT réels, utilisateurs protégés/désactivés, PostgREST direct, uploads privés, rôle service_only, signatures/expiration, retrait et restauration des blobs. Sans cette recette : fusion/production NON.
3. Préparer une sauvegarde cohérente DB + fichiers privés, inventaire/hash, et restauration contrôlée selon le RUNBOOK. Vérifier que l'historique et les vrais documents conservent identité/SHA/statuts. Ne pas utiliser le CA réel Cocody comme donnée d'essai.
4. Après autorisation distincte, suspendre les mutations si nécessaire, appliquer la migration idempotente, vérifier le contrat `admin_persistence_version() = 2`, déployer les deux Edge compatibles puis le frontend correspondant. Ne jamais déployer uniquement le frontend ou un contrat 1 avec ce client.
5. Recetter les refus aussi bien que les succès avant réouverture des écritures et diffusion publique. Toute vérification/publication documentaire réelle reste une instruction humaine explicite ; l'installation du contrat ne certifie aucun CA.

Retour arrière : bloquer les mutations/signatures affectées, conserver une sauvegarde et l'audit des opérations déjà confirmées. Revenir à une paire frontend/Edge approuvée compatible avec le schéma ; ne pas remettre les anciennes policies de lecture large ou le replay ambigu. Conserver les colonnes additives, reçus, attestations, historiques, fichiers et UNKNOWN/null ; aucune suppression de données ni restauration automatique d'un NOT NULL financier. Toute restauration DB/Storage doit être autorisée, contrôlée sur un environnement isolé et préserver les opérations confirmées. Ne pas promouvoir un ancien frontend qui annonce des sauvegardes locales comme succès serveur.

Écritures Supabase production : **0**. Migrations production : **0**. Push/PR nouvelle/fusion/déploiement : **NON**. Prêt pour revue indépendante : **OUI** ; prêt pour fusion : **NON**.
