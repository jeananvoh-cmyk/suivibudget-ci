# Revue ciblée des alertes Supabase — 15 novembre 2026

Projet observé en lecture seule : `cdesuvcozcetdtvibgqs` (PostgreSQL 17.6.1).  
Branche Git d'analyse : `fix/pre-go-supabase-advisors`.  
Aucune modification de schéma, de données, d'index, de politique ou de réglage Auth en Production.

## 1. Alerte RLS initplan — reçus administratifs

La politique Production `public.admin_operation_receipts.admin_receipt_read` a été relue dans `pg_policies` :

```sql
(actor_id = auth.uid())
AND private.admin_domain_allowed(entity_type, result_data)
```

La fonction `private.admin_domain_allowed(text,jsonb)` est SQL STABLE, SECURITY INVOKER et fixe `search_path = ''`. Elle conserve les contrôles de rôle internes. La correction proposée ne change que l'évaluation de l'identité :

```sql
actor_id = (SELECT auth.uid())
AND private.admin_domain_allowed(entity_type, result_data)
```

Migration isolée : `20261115090000_optimize_admin_receipt_read_rls.sql`.  
Test PGlite ajouté : vérifie la lecture du reçu propre à l'acteur, le rejet des reçus d'un autre acteur et le maintien du filtre métier.  
Statut : code poussé dans la PR #76 ; validation CI et replay sur une Preview Branch Supabase réelle encore nécessaires. Aucune application Production.

Référence Supabase : https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

## 2. Dix clés étrangères sans index couvrant

L'advisor signale 10 FK : une dans `private.admin_document_file_checks`, neuf dans des tables publiques. Les tables inspectées ont une taille totale comprise entre 24 et 48 kB ; les comptages directs au moment du contrôle donnent :

| Table | Lignes |
|---|---:|
| private.admin_document_file_checks | 1 |
| public.admin_tasks | 0 |
| public.apec_events | 0 |
| public.apec_needs | 0 |
| public.budget_lines | 0 |
| public.budget_projects | 0 |

Les autres FK signalées concernent les colonnes source documentaire / vérificateur déjà mentionnées dans le rapport advisor. Les statistiques d'estimation `reltuples` sont à -1 sur les tables contrôlées (pas d'estimation exploitable). À ce volume, créer 10 index immédiatement ajouterait du coût d'écriture et de maintenance sans bénéfice mesurable établi.

**Décision :** ne pas créer d'index en Production ni dans une migration aveugle. Revoir après import réel / croissance des tables, avec plans `EXPLAIN (ANALYZE, BUFFERS)` et mesure des requêtes de suppression/mise à jour des lignes parentes. Référence : https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## 3. Vingt-six index signalés inutilisés

L'advisor indique `idx_scan = 0` ou absence d'usage observé depuis la remise à zéro / fenêtre de statistiques disponible pour 26 index. Ce signal ne prouve pas qu'ils sont inutiles : les parcours rares, la faible activité et le redémarrage des statistiques peuvent expliquer l'absence de scan.

**Décision :** aucun index supprimé. Avant toute suppression, relever `pg_stat_user_indexes`, vérifier les contraintes uniques/PK et les index de FK, mesurer les requêtes réelles et comparer les plans. Référence : https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## 4. Dix-huit groupes de politiques permissives multiples

Les 18 groupes ne constituent pas 18 vulnérabilités équivalentes. La lecture des définitions `pg_policies` montre trois familles :

- **Lecture publique conditionnelle + accès staff** : comptes administratifs, lignes et projets budgétaires, lignes financières CA, réponses institutionnelles, opérations CA, rapprochements DGMP, répertoire CAIDP, institutions, budgets locaux, actualités et documents. Les conditions publiques filtrent sur `PUBLISHED`, `publication_status`, `archived_at` ou l'état du CA parent ; les politiques staff s'appuient sur `private.has_staff_role(...)`. La combinaison est intentionnelle, mais reste à couvrir par des tests anon/authenticated/staff.
- **Lecture propre du citoyen + lecture de modération** : `citizen_proofs`. Les deux politiques SELECT sont distinctes et cumulatives ; elles expriment les deux audiences prévues.
- **Cinq politiques de lecture publique sans filtre (`USING (true)`)** : `budget_revenue_sources`, `budget_sources`, `projects`, `site_settings`, `sources`. Les comptages Production observés sont actuellement zéro ligne dans chacune de ces tables. Il n'y a donc pas de ligne existante exposée dans ces cinq tables à la date du contrôle. En revanche, les politiques sont larges pour de futures insertions : notamment les sources de recettes et de rattachement budgétaire ne vérifient pas l'état publié du budget parent, et `site_settings` contient des colonnes de configuration/contact et `settings_metadata`.

**Décision :** ne pas fusionner ou supprimer globalement les politiques : cela pourrait casser la lecture publique ou les parcours staff. Les cinq politiques `USING (true)` doivent faire l'objet d'une décision fonctionnelle ciblée avant qu'on y insère des données : limiter les enfants au parent publié ; confirmer que `projects` et `sources` sont intégralement publics ; pour `site_settings`, envisager une projection publique limitée aux champs destinés aux visiteurs plutôt qu'une lecture directe de toute la table. Ajouter des tests de non-fuite pour les brouillons et les métadonnées internes. Référence : https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

## Décision de revue

- Aucune alerte ne justifie une suppression massive d'index ou de politiques.
- L'optimisation `auth.uid()` est une correction ciblée à valider en environnement non-Production.
- Les cinq lectures publiques `USING (true)` sont le principal point de revue fonctionnelle résiduel des alertes de politiques, même si les cinq tables sont actuellement vides.
- Les index FK manquants sont de priorité basse au volume observé ; les 26 index inutilisés ne doivent pas être supprimés sur le seul signal advisor.
- Le rapport ne constitue pas une approbation de la PR #68 ni un GO de production.
