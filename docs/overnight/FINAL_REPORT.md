# Remise des LOTS 6 à 15 — 7 octobre 2026

Les dix périmètres techniques sont livrés dans des commits isolés sur `overnight/lots-5-15`, prêts pour revue indépendante. Tous les lots restent PARTIAL : ils ne constituent pas une validation métier complète ou une autorisation de publication. Les dix commits de cette continuation sont locaux, sans push, merge ni déploiement.

| Lot | Commit | Statut | Tests PASS / total | Build production | Rapport |
|---|---|---|---|---|---|
| 6 | e11092c | PARTIAL | 362 / 362 | PASS | [Exécution et performance](LOT6_REPORT.md) |
| 7 | 1364ae6 | PARTIAL | 368 / 368 | PASS | [Collectivités et versions](LOT7_REPORT.md) |
| 8 | 4ec39b7 | PARTIAL | 376 / 376 | PASS | [Documents et citations](LOT8_REPORT.md) |
| 9 | bdcd125 | PARTIAL | 381 / 381 | PASS | [Projets et liens documentés](LOT9_REPORT.md) |
| 10 | 646bdc3 | PARTIAL | 386 / 386 | PASS | [Suivi citoyen](LOT10_REPORT.md) |
| 11 | 5b54ccc | PARTIAL | 391 / 391 | PASS | [Réponses et audit](LOT11_REPORT.md) |
| 12 | c82df5f | PARTIAL | 397 / 397 | PASS | [Historique et exports](LOT12_REPORT.md) |
| 13 | d160757 | PARTIAL | 401 / 401 | PASS | [Audit UX et composants](LOT13_REPORT.md) |
| 14 | 16b28b8 | PARTIAL | 404 / 404 | PASS | [Interface de revue](LOT14_REPORT.md) |
| 15 | Commit contenant ce rapport | PARTIAL | 412 / 412 | PASS | [Stabilisation](LOT15_REPORT.md) |

Les totaux sont cumulatifs à chaque commit, pas des nombres de tests supplémentaires. Le commit LOT15 se retrouve par `git log --oneline -- docs/overnight/LOT15_REPORT.md`.

## Livrable et preuves

Les fonctions pures de `src/review/domain/` séparent exécution financière, performance, projets, contributions et réponses institutionnelles. Les inconnues restent null ; les comparaisons exigent un périmètre compatible et une provenance explicite. Aucun chiffre ministériel de remplacement n'a été créé. Les seuls nombres synthétiques sont des cas arithmétiques étiquetés test-only dans les tests.

L'interface locale `review.html` propose sept vues et le catalogue de trois PDF officiels acquis. Aucune observation budgétaire, contribution ou réponse nouvelle n'y est chargée. Elle est construite séparément du site de production. Le code historique bénéficie de corrections ciblées pour le zoom, le focus et la navigation clavier ; sa refonte complète reste à faire.

Validation finale : 30 fichiers / 412 tests PASS, zéro échec ; deux builds PASS. Le build historique conserve un avertissement de taille des bundles. Le navigateur vérifie 56 combinaisons vue/largeur sans débordement, zéro erreur JavaScript et zéro tentative réseau externe, plus les états bloqués, la recherche, l'export local et le clavier. Les captures 375/1440 px ont été inspectées. Cette couverture concerne le candidat, sans certification WCAG ni audit exhaustif des pages historiques.

Les PDF officiels et leurs empreintes figurent dans [DOCUMENTS.json](DOCUMENTS.json) et le [manifeste LOT5](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Le RAP acquis concerne 2022 ; aucune exécution 2026 n'en est déduite. L'accès à WCAG 2.2 a été refusé par la politique réseau ; cette source reste indisponible. Les documents officiels BP/CA/projets/marchés/réponses nécessaires aux nouvelles données restent à acquérir et contrôler.

## Blocages conservés et intégrité

LOT5 reste BLOCKED : six programmes manquants pour MICOM/336, MSCV/444 et METFPA/334. Le [rapport indépendant](../budget-ingestion/LOT5_RESUMPTION_BLOCKED.md) et les [contrôles LFI](../budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json) restent inchangés. Les anciens statuts VERIFIED/RECONCILED dans les canoniques hérités ne résolvent pas ces omissions. Les nouveaux contrats appliquent explicitement le blocage, même avec un montant candidat ou sans observation.

`git diff --exit-code 9730ab8 -- src/data docs/imports docs/references/2026 src/budget-ingestion supabase` réussit. Bingerville, Cocody, Tiassalé, MMPE et les pilotes LOT4 sont préservés, sans réimport. Aucun fichier de migration ajouté ou modifié. La référence locale `origin/master` reste `8145c0423482438cc4cc2fc89af68cb399b06ebc` ; aucune commande de modification de master, merge, push ou déploiement n'a été exécutée pendant cette continuation.

La revue suivante doit contrôler ces contrats et leurs limites, puis traiter séparément les sources manquantes et les raccordements autorisés. Aucun raccordement Supabase, contrôle RLS en production ou chargement métier ne fait partie de la validation présente. Le statut ci-dessous signifie « prêt pour revue », jamais « prêt à publier ».

```text
LOT5_STATUS=BLOCKED
LOTS6_15_STATUS=PARTIAL
MASTER_MODIFIED=FALSE
MERGE_PERFORMED=FALSE
REMOTE_SUPABASE_WRITES=0
FINAL_STATUS=READY_FOR_INDEPENDENT_REVIEW
```
