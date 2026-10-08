# État indépendant des LOTS 5 à 15 — 7 octobre 2026

La branche contient une correction documentaire complète du LOT 5 et les architectures en lecture seule des LOTS 6 à 15. Elle n'est pas déclarée MERGEABLE : la validation Supabase anon en lecture seule échoue avec `Invalid API key`, et les sources métier requises par plusieurs lots restent absentes.

| Lot | Statut indépendant | Preuve acquise | Blocage restant |
|---:|---|---|---|
| 5 | VALIDATED | LFI et DPPD-PAP, 25 programmes, 66 actions, contrôles PDF et arithmétiques | Aucun pour le périmètre documentaire LOT5 ; publication toujours séparée |
| 6 | PARTIAL | Contrats d'exécution/performance et tests | Exécution 2026, LFR/loi de règlement/RAP correspondant |
| 7 | PARTIAL | Sélection de version, ID obligatoire, BP/CA séparés | Originaux BP, modificatifs et CA des collectivités |
| 8 | PARTIAL | Catalogue public à liste blanche, deux PDF 2026 accessibles | Sources futures ; URL du RAP 2022 actuellement en 404 |
| 9 | PARTIAL | Liens projet-budget sans agrégation | Fiches de projets et pièces DGMP officielles |
| 10 | PARTIAL | Projection publique, dates ISO calendaires, confidentialité | Contributions publiques modérées réelles |
| 11 | PARTIAL | Réponses et audits séparés par provenance | Réponses et rapports de contrôle officiels |
| 12 | PARTIAL | NOT_COMPARABLE préservé, exports null | Sources multi-exercices et preuve d'équivalence |
| 13 | PARTIAL | Composants accessibles et audit technique | Référence WCAG inaccessible, audit global et technologies d'assistance |
| 14 | PARTIAL | Candidat local, 56 contrôles navigateur | Refonte de toutes les pages historiques et données réelles |
| 15 | PARTIAL | 457 tests et deux builds PASS, contrôles documentaires/browser PASS | Authentification anon Supabase invalide pour les lectures distantes |

## Sources officielles

- LFI 2026, 583 pages, SHA-256 `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76`, HTTP 200.
- Annexe 4 DPPD-PAP 2026-2028, 1 229 pages PDF, SHA-256 `0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10`, HTTP 200.
- Portail RAP DGBF, HTTP 200. Le PDF RAP 2022 précédemment acquis garde son empreinte officielle, mais son URL répond désormais 404 ; il n'est plus exporté comme citation publique accessible.

Les originaux BP/CA, projets/marchés, contributions et réponses institutionnelles n'ont pas été identifiés parmi les sources officielles disponibles dans ce périmètre. Les enregistrements correspondants restent à zéro et leur état métier reste UNKNOWN. Le RAP 2022 et les pièces 2026 ne sont pas combinés dans une série : leurs exercices et mesures ne sont pas comparables sans preuve supplémentaire.

## Contrôles exécutés

- Suite complète : 32 fichiers, 457 tests réussis, zéro échec.
- Build production : PASS ; build de revue séparé : PASS. L'avertissement historique de taille de bundle reste présent.
- Contrôle PDF indépendant : PASS pour les deux empreintes, six programmes, neuf actions, trois totaux de section et l'absence de doublons.
- Chromium : 56 combinaisons sur 7 vues et 8 largeurs, zéro débordement, zéro erreur JavaScript et zéro requête externe ; états UNKNOWN sans zéro, recherche, export local, clavier et cibles tactiles vérifiés.
- Données protégées et migrations : inchangées ; aucun fichier de migration ajouté ou modifié.

## Supabase en lecture seule

`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont observées `ready` sans affichage de leur valeur. Le client Supabase a été initialisé avec session persistante et rafraîchissement désactivés. Son transport refuse toute méthode autre que GET/HEAD. Trois `SELECT id LIMIT 1` ont été tentés sur `institutions`, `public_documents` et `local_budgets` publié ; tous ont échoué. Un GET REST indépendant a confirmé `401 Invalid API key`.

Aucun INSERT, UPDATE, DELETE, RPC, Storage, Auth, migration, seed ou service_role. La vérification de lecture reste BLOCKED jusqu'à mise à disposition d'une clé anon valide pour le projet autorisé.

```text
MASTER_MODIFIED=FALSE
MERGE_PERFORMED=FALSE
REMOTE_SUPABASE_WRITES=0
FINAL_STATUS=BLOCKED_SUPABASE_READ_ONLY_AUTH
```
