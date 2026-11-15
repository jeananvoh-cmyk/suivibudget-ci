# Réconciliation de l’historique des migrations Supabase

Date du contrôle : 15 novembre 2026  
Projet contrôlé en lecture seule : `cdesuvcozcetdtvibgqs`  
Branche Git contrôlée : `fix/reconcile-public-indicators`

## Source de vérité consultée

L’historique réel a été lu dans `supabase_migrations.schema_migrations`. La table contient les colonnes `version`, `name`, `statements`, `created_by`, `idempotency_key` et `rollback`. Les 26 enregistrements présents possèdent chacun une instruction SQL conservée dans `statements[1]`.

Les fichiers canoniques de `supabase/migrations/` sont restaurés à partir de ces instructions SQL enregistrées, et non réécrits à partir de souvenirs ou de noms de fichiers. Cela rétablit les 26 versions exactes suivies par la base.

## Historique Production restauré dans Git

| Version | Nom enregistré dans Supabase |
|---|---|
| 20260929111429 | secure_staff_rbac_20260929 |
| 20260929111435 | protect_profiles_20260929 |
| 20260929111443 | ca_document_workflow_20260929 |
| 20260929111449 | private_storage_workflow_20260929 |
| 20260929111509 | security_cleanup_indexes_20260929 |
| 20260929111944 | private_rbac_helper_20260929 |
| 20260929111958 | private_storage_remove_public_read_20260929 |
| 20260929112029 | ca_v3_financial_provenance_20260929 |
| 20260929112823 | remove_duplicate_ca_index_20260929 |
| 20260930030522 | document_metadata_versions |
| 20260930030614 | publication_boundaries |
| 20260930030702 | grant_schema_privileges |
| 20260930031058 | public_proof_projection_boundary |
| 20260930144753 | foundation_http_access |
| 20260930153938 | least_privilege_passport_boundary |
| 20261001040746 | apec_participation_cycle |
| 20261001044508 | apec_moderated_publication |
| 20261001093613 | controlled_data_import |
| 20261001150911 | import_console_qualified_amounts |
| 20261002090824 | grant_anon_published_local_budgets |
| 20261005121837 | drop_default_zero_institutions_budget |
| 20261014155231 | multipart_ca_documents_20261013 |
| 20261026183930 | admin_dashboard_persistence_hardening_pr63 |
| 20261026184038 | multipart_ca_convergence_pr63 |
| 20261026184048 | document_delivery_counter_pr63 |
| 20261113011327 | security_definer_hardening_20261026213000 |

## Fichiers préexistants conservés hors du chemin actif

Les anciens fichiers de migration du dépôt dont le timestamp ou le contenu ne correspondait pas exactement à l’historique Production sont conservés dans `supabase/migrations_archive/`. Ils ne sont pas exécutés par le mécanisme normal de découverte des migrations.

Les trois fichiers de bootstrap suivants restent dans `supabase/migrations/` :

- `20260902000000_init_rls.sql`
- `20260928000000_administrative_accounts.sql`
- `20260928010000_local_budgets_referential.sql`

Le 15 novembre 2026, leurs trois versions ont été inscrites dans `supabase_migrations.schema_migrations` comme versions appliquées, après comparaison des objets attendus avec le schéma Production. Cette opération a modifié uniquement l'historique de suivi : aucun SQL de ces fichiers n'a été rejoué. Les tables et politiques correspondantes existaient déjà sous des formes parfois évoluées. Cette inscription ne signifie donc pas que le contenu textuel exact des trois fichiers a été exécuté tel quel.

## Migration de fiabilisation en attente

`20261115070000_enforce_primary_document_provenance.sql` est une nouvelle migration proposée dans la PR #68. Elle n’est pas présente dans l’historique Production et n’a pas été appliquée. Elle doit rester en attente jusqu’à revue et test sur une base non-production.

## Limites et prochaines vérifications

- La restauration des 26 fichiers canoniques ne modifie pas la base Production et ne prouve pas à elle seule que le bootstrap local reproduit le schéma initial de Production.
- Le contrôle CLI `supabase migration list --remote` reste à exécuter dès que Supabase CLI sera disponible. L'historique distant a toutefois été relu via le connecteur Supabase après l'opération : 29 versions enregistrées, dont les trois versions bootstrap.
- Le projet ne possède actuellement aucune branche Supabase de développement. La création d’une Preview Branch peut engendrer des frais (Compute, stockage, egress). La tentative de création a été arrêtée par le mécanisme de confirmation de coût ; aucune branche n’a été créée.
- Supabase CLI v3 cible le local par défaut : tout contrôle hébergé doit préciser `--remote`. Toute commande modifiant un projet hébergé doit rester explicitement approuvée.
- Le CLI Supabase n'étant pas disponible dans l'environnement, l'inscription des trois versions a été réalisée par un INSERT ciblé et idempotent sur `supabase_migrations.schema_migrations` (colonnes `version`, `name` uniquement), après vérification qu'elles étaient absentes. L'opération a été relue immédiatement : 29 versions au total, 3/3 versions bootstrap présentes et `20261115070000` absente. Aucun `db push`, `apply_migration`, changement de schéma ou de données métier, fusion Git ou déploiement Production n'a été effectué.

### Comparaison des objets bootstrap avec le schéma Production

- Les **18/18 tables** déclarées dans les trois migrations bootstrap sont présentes.
- Les objets du fichier local historique du 29 septembre sont aussi présents : `ca_financial_lines`, `private.has_staff_role(text[])` et `public.enforce_document_publication_audit()`. La migration Production canonique `20260929112029_ca_v3_financial_provenance_20260929.sql` porte ces objets.
- Les index des modules Comptes Administratifs et budgets locaux sont présents. Les anciens index citoyens `idx_proofs_project_id` et `idx_proofs_status` ont des équivalents actuels `idx_citizen_proofs_project` et `idx_citizen_proofs_verification`. L'index `idx_institutions_name` déclaré par le bootstrap est absent et aucun remplacement n'a été identifié. Le contrôle du 15 novembre 2026 a relevé seulement 4 institutions (4 noms distincts) ; cet index B-tree sur `name` est une optimisation facultative, pas une exigence fonctionnelle ou d'intégrité à ce volume. Il n'a pas été créé en Production. À réévaluer si le volume ou les plans de requêtes le justifient.
- Plusieurs politiques RLS bootstrap ont été remplacées par les politiques actuelles plus restrictives : lecture newsletter (`Only admins can view subscribers`), administration des institutions/budget lines (`admin_entity_staff`), et modération des preuves citoyennes (politiques séparées INSERT/UPDATE/DELETE et lecture propre).
- Ces écarts sont cohérents avec les migrations de durcissement postérieures, mais ils empêchent d'affirmer que le schéma actuel est le résultat exact et inchangé de ces trois fichiers. Ils doivent être pris en compte avant toute réparation de l'historique.

## Configuration CLI locale

Le dépôt ne contenait pas de `supabase/config.toml`. Un fichier minimal est désormais ajouté avec `project_id = "suivibudget-ci"` et `db.major_version = 17`, conforme au moteur PostgreSQL 17.6.1.166 observé sur le projet. Il ne contient aucun secret. `supabase/.temp/` et `supabase/.branches/` sont ignorés par Git.

Après installation de Supabase CLI v3 et authentification, l'opérateur devra exécuter `supabase link --project-ref cdesuvcozcetdtvibgqs`, puis `supabase migration list --remote`. En CLI v3, `migration list`, `migration fetch` et `migration repair` ciblent le local par défaut ; `--remote` est obligatoire pour la cible hébergée. La commande `supabase migration fetch --remote` peut ensuite être utilisée comme vérification indépendante des 26 fichiers restaurés.

## Validation automatisée du correctif

Sur le commit `fb745e3668217621ecfdad000a7481f8c0b3f2c4`, le workflow GitHub Quality #480 a réussi :

- 72/72 fichiers de tests réussis ;
- 981/981 tests réussis ;
- le test `localBudgetRlsMigration.test.ts` exécute réellement la migration sur un fixture PGlite isolé construit à partir du schéma de production ;
- le test vérifie le déclassement des statuts locaux, recettes, CA et rapprochements DGMP sans modifier les montants ;
- le test vérifie que les certifications de projets sans document primaire/page exacte sont rejetées ;
- `npm run build` : PASS (1 770 modules) ;
- `npm run build:review` : PASS (39 modules) ;
- les 30 migrations actives ont des timestamps de 14 chiffres uniques ; un test CI vérifie l'absence de doublons ;
- Vercel Preview : PASS.

Ce test PGlite est un replay local isolé, pas une Preview Branch Supabase hébergée. Il valide la syntaxe PostgreSQL et le comportement sur le schéma-fixture, mais ne remplace pas un dry-run hébergé avec les extensions et services Supabase réels.

## Vérification et réconciliation du socle préhistorique

Les 18 tables déclarées par les trois fichiers bootstrap (7 + 5 + 6) existent actuellement dans le schéma Production. Les objets clés du fichier local historique `20260929_security_ca_document_foundation.sql` existent également : `ca_financial_lines`, `private.has_staff_role(text[])` et `public.enforce_document_publication_audit()`. Les migrations Production canoniques `20260929112029_ca_v3_financial_provenance_20260929.sql` et les migrations documentaires antérieures portent les changements correspondants.

Les trois versions bootstrap ont été enregistrées comme appliquées le 15 novembre 2026, après constat de la présence du socle et de son évolution ultérieure. Il subsiste des différences historiques : notamment l'index facultatif `idx_institutions_name` absent et des politiques RLS remplacées par des versions plus récentes. Le statut « applied » réconcilie le suivi des migrations et évite que ces scripts de fondation soient rejoués comme des changements incrémentaux ; il ne constitue pas une preuve d'exécution littérale des fichiers actuels.

## État après réconciliation de l'historique

- 26 migrations Production canoniques récupérées depuis leur SQL réellement enregistré.
- 3 versions bootstrap ajoutées à l'historique distant par opération history-only vérifiée.
- 29 versions présentes dans l'historique Supabase après contrôle.
- 1 migration de fiabilisation proposée (`20261115070000_enforce_primary_document_provenance.sql`), toujours non appliquée en Production.
- Aucun changement de schéma ni de données métier en Production ; seule la table de suivi des migrations a reçu les trois enregistrements documentés ci-dessus.
- Aucun merge Git ni déploiement Production.
