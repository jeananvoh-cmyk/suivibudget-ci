# Remédiation de la persistance du dashboard administrateur

État historique du contrat 1. La [correction finale de sécurité](ADMIN_DASHBOARD_SECURITY_REMEDIATION.md) décrit le contrat 2, les contrôles renforcés et les limites de recette actuelles ; elle prime pour toute proposition de déploiement.

Date : 13 octobre 2026. Branche : `codex/admin-dashboard-persistence-hardening`.

Base réelle de master : `a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d`.
HEAD technique validé : `66f1f0accee9fcbc5d237413980d4d939d74a5fc`. Contrat serveur : `57575c1e4f9f9beec1546da0fd736922194f26fb`.
Le SHA de livraison se relève avec `git rev-parse HEAD` ; les SHAs exacts des commits sont également fournis dans le manifeste de livraison. Cette ligne ne prétend pas connaître le SHA du commit qui la contient.

**Décision : livraison GitHub différée.** La PR [#62](https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/62), HEAD `7af1c5b89f75ae32fb7de8b63ccb2d035d38a61d`, est ouverte. L’utilisateur a demandé d’attendre sa fusion ou sa fermeture. Aucun push, PR concurrente, déploiement, fusion ou migration distante n’est effectué par cette mission.

## 1. Architecture initiale

`dataStore.ts` mélangeait référentiels embarqués, copies `localStorage`, synchronisations partielles et opérations documentaires Supabase. Des modifications institutionnelles, projets, publications, paramètres et contacts CAIDP pouvaient ne modifier que le navigateur. Les overrides de la file de travail et son journal étaient locaux. Les promesses non attendues permettaient des confirmations prématurées ; certains médias étaient des données temporaires ou des URL de navigateur.

L’inventaire distant a été effectué exclusivement en lecture : 31 tables publiques avec RLS, 72 politiques, 15 fonctions et 4 triggers avant correction. Les données financières publiées et leurs pipelines d’import qualifié existaient déjà et sont conservés.

## 2. Anomalies confirmées

- Sauvegarde locale présentée comme persistante et restauration JSON présentée trop largement.
- Modifications financières possibles depuis une fiche générale ; année et avancement implicites à la création.
- Acteurs, dates ou contrôles CAIDP construits côté client, sans décision humaine attestée.
- File collaborative non persistante, acteurs textuels et clôture indépendante du statut de l’objet.
- Absence de révision optimiste, de reprise après réponse perdue et de journal serveur transversal.
- Brouillons susceptibles d’être mélangés aux listes publiques ; fiche embarquée susceptible de réapparaître après archivage serveur.
- Photos et pièces jointes sans mécanisme de consultation privée rattaché à un enregistrement accessible.

Le catalogue documentaire officiel et les barrières financières de master ne sont pas remplacés par cette correction.

## 3. Architecture corrigée

Le contrat commun est : validation à la frontière → utilisateur Auth → rôle protégé et RLS → RPC transactionnelle → journal serveur → confirmation → relecture de la ligne → rafraîchissement.

`admin_mutate` refuse tables ou champs non autorisés, vérifie la révision sous verrou, utilise un identifiant d’opération et refuse son réemploi avec un autre contenu. `admin_mutate_batch` valide un lot atomique de 1 à 100 objets. La reprise conserve l’identifiant de création et d’opération après une perte de réponse ou de relecture. Le service vérifie également l’identité de la ligne confirmée. Les formulaires transmettent la révision qu’ils ont ouverte.

Les tables sont relues par pages de 500 lignes. Les caches ne décident pas des droits ; les anciens overrides locaux ne sont plus appliqués aux modules concernés. Les listes publiques masquent les brouillons ; le contrat de visibilité empêche la résurrection d’une fiche intégrée retirée du serveur. L’écran ne confirme une écriture qu’après sa confirmation et sa relecture.

Le contrat versionné bloque explicitement les sauvegardes si la migration n’est pas installée. **Le frontend doit rester non déployé jusqu’à la validation du contrat serveur et de la fonction Edge.**

## 4. Parcours effectivement vérifiés

| Module | Comportement corrigé | Preuve locale |
|---|---|---|
| Institutions | Création DRAFT, modification du profil, territoire, photo privée, publication explicite, archivage ; montants historiques protégés | RPC/RLS et navigateur création–relecture–archivage ; médias testés séparément |
| Projets | Exercice explicite, montant facultatif `null`, avancement déclaré, source primaire, contrôle humain du montant puis publication séparée | Navigateur création ; RPC/RLS contrôle–publication–retrait de source |
| Lignes budgétaires | Éditeur distinct, libellé original, source/page, révision, CSV additif, contrôle humain, publication et archivage | Navigateur, deuxième session, réseau, conflit ; enveloppe parent conservée |
| Publications | DRAFT → IN_REVIEW → PUBLISHED, dépublication, archivage, image et PDF privés | Navigateur et RLS ; contrôle du résolveur Edge par tests |
| Annuaire CAIDP | Création TO_VERIFY, édition, provenance, revue humaine, CSV canonique, lot atomique, publication/archivage | Navigateur création ; service et SQL pour doublons, revue et permissions |
| File de travail | Opérateurs UUID actifs et compatibles, priorité, état, assignation en lot, historique serveur, clôture liée à la source | Navigateur prise en charge/refus de clôture ; SQL décisions et réouverture |
| Documents et CA | Fichier privé, existence Storage requise avant vérification, SHA réel à l’envoi, identité/version immuables, vérification humaine et publication distinctes, archivage sans suppression | Navigateur TO_VERIFY → VERIFIED → PUBLISHED ; SQL versions ; tests Storage |
| Paramètres | Configuration serveur réservée à ADMIN, liste de champs publics autorisés | RPC/RLS ; aucune remise à zéro globale |

Une approbation de contribution citoyenne demeure une décision de modération. Elle ne certifie ni réalisation physique ni achèvement. Les projets administratifs restent `DECLARED_ADMIN` / `UNVERIFIED_INPUT` dans le passeport, y compris à 100 % déclaré. Un budget prévu n’est pas une dépense exécutée.

Le retrait d’un document primaire remet les projets déclarés et lignes publiées qui en dépendent en DRAFT/TO_VERIFY. Une source qui ne justifie plus sa décision rouvre sa tâche en ON_HOLD ; l’ancienne clôture reste dans le journal. Ces changements ne modifient aucun montant.

## 5. Parcours bloqués ou volontairement limités

- Aucun parcours d’écriture n’est validé en production : migration et Edge non déployées, comptes staff réels non utilisés.
- La consultation signée du **vrai** PDF Cocody n’a pas été exécutée avec une session staff de production. Les tests de signature ne remplacent pas cette recette.
- Les événements de demande CAIDP indiquent une utilisation de l’outil, pas la réception ni l’envoi effectif d’un courrier. Leurs tâches restent indicatives, sans assignation/clôture certifiée dans cette file.
- Newsletter, télémétrie des demandes CAIDP, compteurs de téléchargements et confirmations citoyennes anciennes restent des mécanismes auxiliaires locaux ou partiellement synchronisés. Ils ne sont pas un journal administratif serveur. Cette mission ne simule pas leur complète persistance.
- Un élément embarqué n’ayant pas de ligne serveur doit être repris en brouillon avant une revue ou un archivage serveur. Aucun document officiel n’est supprimé pour contourner cette condition.
- `budget_lines.linked_project_id` référence la table historique `projects`, et non `budget_projects`. Le nouvel éditeur ne fabrique pas une relation entre ces modèles.

## 6. Modèle de données et migration

Migration préparée : `supabase/migrations/20261013165625_admin_dashboard_persistence_hardening.sql`.

Ajouts : révisions, publication/archivage, métadonnées limitées aux profils non financiers, contrôles de provenance et contrôleurs serveur, relations documentaires, `admin_tasks`, `admin_audit_events`, RPCs de mutation/lot/visibilité/opérateurs/version, bucket privé `admin_media`.

Les montants de projet et de ligne peuvent être `NULL` pour représenter l’inconnu. **La levée de NOT NULL est une modification de contrainte à relire explicitement.** La migration ne remplit pas ces valeurs avec zéro. L’état éditorial est dérivé de l’ancien booléen pour les articles déjà présents. Les nouvelles créations restent des brouillons.

La migration est transactionnelle et appliquée deux fois par fixture pour tester l’idempotence. Les migrations historiques sont lues comme définitions pour construire une base fictive ; aucune migration historique n’a été rejouée sur la production.

## 7. Permissions, confidentialité et audit

| Rôle protégé | Écritures autorisées par ce contrat |
|---|---|
| ADMIN | Tous les modules concernés ; paramètres globaux |
| DATA_MANAGER | Institutions, projets, lignes, annuaire, documents et tâches correspondantes |
| MODERATOR | Publications, modération citoyenne et tâches de modération |
| Citoyen / anon | Aucun CRUD administratif ; lecture des objets publiés selon RLS |

Le rôle vient de `profiles.role` et de `is_active`, jamais d’un rôle déclaré dans `user_metadata`. Les règles documentaires et la projection publique pseudonymisée des contributions existantes sont conservées. Aucun contact citoyen privé n’est ajouté aux vues publiques.

Le journal serveur est en lecture staff uniquement ; les clients ne peuvent ni insérer, ni modifier, ni supprimer un événement. Acteur, rôle, horloge, objet, raison, provenance, avant/après et résultat confirmé sont enregistrés en transaction. Coordonnées, identité citoyenne, localisation détaillée et textes privés sont retirés des snapshots d’audit. L’identité privée nécessaire à l’instruction reste dans la table métier protégée. Les identités et dates de modération sont imposées côté serveur.

Les transactions refusées sont annulées et **ne créent pas** un faux événement CONFIRMED. Leur diagnostic nécessite les erreurs d’interface et les logs d’exécution Supabase ; la collecte d’un journal durable des tentatives refusées n’est pas livrée ici.

La fonction `admin-media-url` vérifie la lecture de l’enregistrement avec les droits du demandeur avant toute signature. Elle n’accepte pas de chemin arbitraire, signe uniquement la référence de cet objet, renvoie `Cache-Control: no-store` et une expiration de 300 secondes. Sa clé de service reste dans l’environnement Edge, jamais dans le navigateur. Une URL déjà signée peut rester valide jusqu’à son expiration après dépublication.

## 8. Fichiers modifiés

- Serveur : migration ci-dessus et `supabase/functions/admin-media-url/index.ts`.
- Services : `adminPersistenceService.ts`, `dataStore.ts`, `adminTaskService.ts`, `documentStorageService.ts`.
- UI : dashboard, DocumentManager, CaidpRiManager, AdminWorkQueue, DataImportConsole, recherche/admin CA, importeur primitif, cartes/détail de projets, fiches institutionnelles et listes publiques consommatrices.
- Types : modèles de projet, institution, publication, document, annuaire et workflow.
- Qualité : fixture PostgreSQL commune, suites admin database/service/media, adaptations financières/CA/pilote/passeport, script navigateur.
- Documentation : ce rapport, RUNBOOK, AGENT_HANDOFF et CODEX_CHECKPOINT.

L’inventaire exact et le diff se produisent sans approximation avec `git diff --name-only a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d HEAD` et `git diff --shortstat a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d HEAD`. Les résultats figés sont fournis dans le manifeste joint à la livraison. Aucun changement de dépendances, Tailwind, catalogue officiel ou référentiel de montants n’est inclus.

Inventaire figé (43 fichiers) :

```text
docs/AGENT_HANDOFF.md
docs/CODEX_CHECKPOINT.md
docs/audits/admin/ADMIN_DASHBOARD_PERSISTENCE_REMEDIATION.md
docs/maintenance/RUNBOOK.md
scripts/verify-admin-persistence-browser.cjs
src/components/BudgetReportsView.tsx
src/components/CaidpRiManager.tsx
src/components/DocumentManager.tsx
src/components/InstitutionDetailModal.tsx
src/components/PrimitiveBudgetImporterModal.tsx
src/components/ProjectCard.tsx
src/components/ProjectDetailModal.tsx
src/components/admin/AdminGlobalSearchModal.tsx
src/components/admin/AdminWorkQueue.tsx
src/components/admin/AdministrativeAccountsAdminManager.tsx
src/components/admin/DataImportConsole.tsx
src/data/caidpRiData.ts
src/pages/AdminDashboardPage.tsx
src/pages/HomePage.tsx
src/pages/ProjectsPage.tsx
src/pages/institutions/MinistriesPage.tsx
src/pages/institutions/MunicipalitiesPage.tsx
src/pages/institutions/NationalInstitutionsPage.tsx
src/pages/institutions/RegionalCouncilsPage.tsx
src/pages/institutions/RegulatoryAuthoritiesPage.tsx
src/services/adminPersistenceService.ts
src/services/adminTaskService.ts
src/services/dataStore.ts
src/services/documentStorageService.ts
src/types/adminWorkflow.ts
src/types/index.ts
src/types/publicDocument.ts
src/utils/__tests__/adminMediaSecurity.test.ts
src/utils/__tests__/adminPersistenceDatabase.test.ts
src/utils/__tests__/adminPersistenceFixtures.ts
src/utils/__tests__/adminPersistenceService.test.ts
src/utils/__tests__/caManagement.test.ts
src/utils/__tests__/financialIntegrity.test.ts
src/utils/__tests__/projectPassport.test.ts
src/utils/__tests__/realPilotChain.test.ts
src/utils/projectPassport.ts
supabase/functions/admin-media-url/index.ts
supabase/migrations/20261013165625_admin_dashboard_persistence_hardening.sql
```

Diff figé : 3319 lignes ajoutées / 2270 supprimées.

## 9. Validation

Référence avant correction : **782/782 tests**, 60 fichiers.

Résultats : **811/811 tests, 63 fichiers**, dont 16 tests PostgreSQL, 8 tests du service et 4 tests médias ; TypeScript, build public et build review réussis. **13/13 parcours navigateur**, zéro erreur JavaScript/API inattendue et zéro egress transféré. Les logs et pièces sont conservés dans la livraison. Chaque assertion navigateur PASS a été exécutée ; une inspection de code n’a pas été comptée comme E2E.

Commandes exécutées : `npm ci --ignore-scripts --cache ../npm-cache --offline`, `npm test -- --configLoader native --maxWorkers=2`, `npx tsc --noEmit`, `npm run build -- --configLoader native`, `npm run build:review -- --configLoader native --outDir ../budget-review-build`.

Sur cet hôte Windows/Node 24, `NODE_OPTIONS=--require ../native-config.cjs` fournit `__dirname` au chargement natif de configuration. Ce shim est extérieur au dépôt et ne modifie pas les dépendances ni le workflow Linux/Node 22. Les avertissements de taille des chunks de référentiels préexistants restent présents.

Les tests intégrés utilisent **PostgreSQL/PGlite réel avec RLS, triggers et RPC réels**, des données fictives et un transport Supabase/Auth simulé. Les sessions sont entrelacées ; cela vérifie les révisions, sans prétendre simuler toute contention multiconnexion PostgreSQL. La restauration de la sauvegarde PGlite teste la conservation des données, permissions et historique sur une seconde instance. Elle n’est ni un exercice `pg_restore` de production ni une sauvegarde des blobs Storage.

La recette Playwright couvre 13 parcours et les largeurs 360, 640, 768, 1024 et 1440. Toutes les requêtes externes sont interceptées ou bloquées ; **zéro requête d’écriture transférée à une instance distante**. Auth GoTrue, JWT réels, PostgREST déployé et Edge hébergée restent à tester sur un Supabase de recette autorisé.

## 10. Contrôle final de production, en lecture seule

Le document `doc-dff4865a-c6a8-418e-8895-626258e409d0` reste `TO_VERIFY` / `TO_VERIFY`, version 1, SHA-256 `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`.

Comptages inchangés : institutions 4, projets serveur 0, articles 0, annuaire serveur 0, documents 1, budgets locaux 3, CA 3, lignes CA 24, lignes budgétaires serveur 0. Ce contrôle ne constitue pas une preuve cryptographique de l’absence de toute modification tierce ; il confirme les invariants observés et la mission n’a exécuté aucune écriture distante.

**Migrations production : 0. Écritures Supabase production : 0. Fusion : aucune. Déploiement : aucun.**

## 11. Conditions et risques de déploiement

Attendre la fusion/fermeture de #62. Relever le nouveau master réel, intégrer ses changements et refaire la recette, notamment les métadonnées documentaires qu’elle introduit ; ne pas écraser son ingestion pilotée. Créer ensuite une seule PR corrective cohérente et faire passer la CI sur son SHA exact.

Avant production : validation de la migration et des permissions, sauvegarde DB **et** Storage contrôlée, environnement Supabase isolé avec Auth et Edge réelles, tests avec comptes ADMIN/DATA_MANAGER/MODERATOR/citoyen, consultation réelle privée de Cocody sans certification, plan de restauration validé et autorisation explicite.

Ordre prévu, non exécuté : tester la migration et l’Edge dans l’environnement autorisé → vérifier contrat version 1/RLS/signatures → autoriser migration/Edge production → contrôler lecture seule des invariants → autoriser frontend correspondant. Le nouveau frontend n’est pas publié isolément avec un backend ancien.

Risques à relire : remplacement des anciennes politiques sur six tables administratives, portée des champs publics, levée de NOT NULL, comportement des anciennes lignes publiées, révocation des sources, cohérence des métadonnées de #62, délais de signature et comportement Auth réel. Les tests ne justifient aucune certification de montants ni de réalisations physiques de production.

## 12. Sauvegarde et retour arrière

Le JSON du dashboard contient seulement une copie de cache, explicitement `LOCAL_CACHE_ONLY`, sans base PostgreSQL complète ni fichiers Storage. La restauration globale et le reset ne sont pas exécutables dans l’UI.

La procédure opérateur DB/Storage et restauration isolée est décrite dans `docs/maintenance/RUNBOOK.md`. La sauvegarde SQL et les blobs doivent être rapprochés par bucket, chemin, version, taille et SHA.

En incident : bloquer les mutations admin, conserver les nouveaux événements et fichiers, restaurer d’abord sur une instance isolée. Conserver les colonnes et tables additives pendant un retour frontend ; ne pas supprimer l’historique. Ne pas rétablir NOT NULL tant qu’une seule valeur inconnue existe. Un retour des politiques se prépare à partir de la capture préalable, après revue et validation ; aucun rollback destructif automatique n’est fourni.

## 13. Interventions humaines nécessaires

1. Faire aboutir #62 par le responsable de validation ; cette mission ne la fusionne pas.
2. Relire la migration, la fonction Edge, les règles de publication et le traitement des anciens référentiels.
3. Autoriser et fournir un environnement Supabase de recette pour les vérifications GoTrue/Storage/Edge réelles.
4. Valider la sauvegarde/restauration DB et Storage et autoriser séparément toute migration et tout déploiement de production.
5. Contrôler les documents réels et leurs extractions avant toute certification. Cocody n’est pas validé par ces tests.

## 14. Appréciation

La persistance, les refus, les décisions et l’audit des modules réparés sont démontrés localement sur PostgreSQL isolé et dans le navigateur. **Le dashboard de production ne peut pas encore être déclaré fiable et complet** : le contrat n’y est pas installé, les intégrations Auth/Edge réelles ne sont pas recettées et des statistiques auxiliaires restent locales. Prêt pour fusion : **NON**, en attente de #62 et de la revue/CI. Prêt pour déploiement production : **NON**, en attente des validations séparées ci-dessus.

## Tableau de livraison

| Indicateur | Résultat |
|---|---|
| HEAD initial | `a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d` |
| HEAD final | Fourni dans le manifeste ; commit documentaire final |
| Modules corrigés | Institutions, projets, lignes, publications, CAIDP, documents/CA, file, paramètres |
| Actions réparées | Création, édition, lots/CSV, revue, publication/dépublication, archivage, médias, reprise et conflits |
| Opérations persistantes vérifiées | RPC/RLS PostgreSQL isolées ; relecture, 2 sessions, audit et restauration |
| Actions encore locales | Copie de cache, téléchargements, confirmations, télémétrie/newsletter auxiliaires |
| Anomalies critiques restantes | Contrat non installé en production ; Auth/Edge réelles et compatibilité #62 à recetter |
| Tests réussis / total | 811/811 ; 63 fichiers |
| Tests E2E réussis / total | 13/13 ; Auth/transport simulés, SQL/RLS réels |
| Tests RLS | 16 tests de contrat PostgreSQL, rôles et confidentialité ; service 8, médias 4 |
| TypeScript | PASS |
| Build production | PASS ; avertissements de taille de référentiels |
| Build review | PASS |
| Preview Vercel | Aucune, déploiement non autorisé |
| Fichiers modifiés | 43 ; inventaire ci-dessus |
| Lignes ajoutées / supprimées | 3319 lignes ajoutées / 2270 supprimées |
| Migrations préparées | 1, idempotence et restauration locales testées ; 1 fonction Edge |
| Migrations exécutées en production | 0 |
| Écritures Supabase production | 0 |
| CI distante | Non exécutée ; branche non publiée |
| PR GitHub | Différée jusqu’à fusion/fermeture de #62, selon la consigne humaine |
| Prêt pour fusion | NON |
| Prêt pour déploiement production | NON |
