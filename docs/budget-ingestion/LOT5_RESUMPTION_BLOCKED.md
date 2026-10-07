# Reprise LOT 5 — arrêt documentaire et financier du 7 octobre 2026

```text
LOT=5
STATUS=BLOCKED
BRANCH=overnight/lots-5-15
BASE_SHA=8145c0423482438cc4cc2fc89af68cb399b06ebc
COMMIT_SHA=9512311618ed0d5af39ea47f98fd7d2485e9607f
PR_EXISTING=https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/28
DOCUMENTS_REQUIRED=2 (LFI 2026 et Annexe 4 DPPD-PAP 2026-2028, sections des 7 ministères)
DOCUMENTS_AVAILABLE=2 (HTTP 200, PDF locaux, SHA-256 enregistrés)
DOCUMENTS_BLOCKED=0 pour l'accès ; complétude documentaire des six programmes omis non établie
FILES_CHANGED=6 fichiers documentaires de reprise ; 21 fichiers hérités du commit LOT 5
SOURCE_FIDELITY=FAIL (rapport de couverture incompatible avec les sources ; audit intégral des libellés non achevé)
FINANCIAL_INTEGRITY=FAIL (3 totaux de section LFI incomplets, 6 programmes omis, 78820000001 FCFA)
DOCUMENTARY_PROVENANCE=PARTIAL (sources primaires acquises ; chaîne complète non validée)
ARCHITECTURE=BLOCKED (réconciliation interne seule insuffisante pour la complétude LFI)
SECURITY=NO_NEW_RUNTIME_CHANGE ; aucun audit sécurité exhaustif réalisé
NON_REGRESSION=350 tests PASS ; fichiers des données protégées inchangés depuis la baseline
TEST_FILES=20
TEST_TOTAL=350
TEST_PASS=350
TEST_FAIL=0
BUILD=PASS (tsc et Vite ; avertissement de taille des bundles)
REMOTE_SUPABASE_WRITES=0
ANOMALIES_FOUND=6 groupes décrits ci-dessous
ANOMALIES_FIXED=0 anomalies métier ; statut de reprise et preuves documentés
ANOMALIES_REMAINING=6
LOTS_6_TO_15=NOT_STARTED (arrêt au LOT 5)
FINAL_STATUS=BLOCKED
MASTER_MODIFIED=FALSE
MERGE_PERFORMED=FALSE
```

`COMMIT_SHA` identifie l'implémentation auditée et préservée, pas le commit de ce rapport. Retrouver le commit documentaire avec `git log -1 --format=%H -- docs/budget-ingestion/LOT5_RESUMPTION_BLOCKED.md`.

## Motif de l'arrêt

Le mandat interdit de continuer sur une anomalie financière non résolue et interdit de faire passer une lacune documentaire pour `RECONCILED`. Le LOT 5 existant affirme des totaux **LFI** alors qu'il ne couvre, pour trois sections, que les programmes repris dans le candidat DPPD-PAP. L'absence des six autres programmes est démontrée ci-dessous. Leur réintégration avec leurs actions, pages, libellés et contrôles indépendants reste à réaliser ; aucun total n'est ajusté silencieusement et aucune action n'est déduite par différence.

Il ne s'agit pas d'une contradiction démontrée entre les deux publications officielles : leurs périmètres doivent être rapprochés explicitement. C'est l'affirmation de complétude et de réconciliation LFI du candidat qui échoue. Le LOT 5 n'est ni terminé ni VALIDATED. Les LOTS 6 à 15 et les checkpoints A/B ne sont pas exécutés.

## A1 à A3 — trois totaux LFI incomplets

Valeurs de contrôle lues dans le PDF officiel, colonne « Crédit de Paiement 2026 », tableau « Budget 2026 (Récapitulatif Par Section, Dotation et Programme) ».

| Anomalie / section | Total du candidat (FCFA) | Total LFI (FCFA) | LFI moins candidat (FCFA) | Programmes absents | Pages PDF LFI |
|---|---:|---:|---:|---|---|
| A1 — MICOM / 336 | 19 606 735 297 | 39 806 735 298 | 20 200 000 001 | 23223, 23224, 23225 | 49–50 |
| A2 — MSCV / 444 | 57 807 777 385 | 70 427 777 385 | 12 620 000 000 | 23241, 23249 | 54 |
| A3 — METFPA / 334 | 136 301 855 312 | 182 301 855 312 | 46 000 000 000 | 23220 | 49 |

Les trois canoniques, leurs registres de sources et les golden controls reprennent les sous-totaux incomplets. La somme des sept candidats est 369 118 605 715 FCFA ; celle des sept sections LFI est 447 938 605 716 FCFA. L'écart de contrôle est **78 820 000 001 FCFA**. Ces sommes sont des calculs d'audit, sans publication dans l'application.

Les montants des six programmes manquants sont transcrits indépendamment dans `LOT5_INDEPENDENT_LFI_CONTROLS.json`. Les quatre autres totaux de section concordent avec la LFI (237, 362, 439, 440) ; cette concordance ne vaut pas validation complète de leurs libellés ou de toute leur provenance.

## A4 — les tests verts ne contrôlent pas la complétude LFI

`lot5Generalization.test.ts` et `independentDocumentaryGolden.ts` attendent les mêmes trois sous-totaux et les mêmes listes incomplètes que les canoniques. Le test d'ingestion attend même `canPublish=true`. Les 350 tests passent donc malgré les six programmes absents de la référence attendue. Le contrôle interne somme(actions) = somme(programmes) ne compare pas le périmètre à la liste complète de la LFI.

Le caractère indépendant de la méthode de production historique des fixtures n'est pas établi par cette reprise. Le constat démontré est que leur contenu ne détecte pas l'omission. Les nouveaux contrôles LFI proviennent du document officiel, jamais du candidat.

## A5 — rapport de couverture contradictoire

La section 3 du rapport hérité indique, pour MAIED, les programmes `21102`, `22030`, `22031` et les pages 1162–1172. Le PDF officiel, section 439, donne `21234`, `22145`, `22146`, aux pages PDF 1097, 1099–1100 et 1102. Le candidat et son registre reprennent ces derniers codes. Le rapport ne peut donc servir de source.

Le tableau des 35 institutions confond également des identités : `gov-001` y est appelé Présidence / 101, alors que le registre applicatif et documentaire l'identifie comme Primature / 108. `gov-009` / 229 y est présenté comme Économie/Finances/Budget, alors que le registre le rattache à l'Agriculture. L'ensemble du tableau et ses montants non sourcés restent à reprendre. Le renvoi du reste de la généralisation au « LOT 6 » contredit aussi le mandat courant qui réserve le LOT 6 à l'exécution et à la performance.

## A6 — intitulé du tableau source incorrect

Les canoniques indiquent « Tableau 7 : Déclinaison des crédits par action ». La page officielle MAIED 1097 porte « Tableau 7 : Budget détaillé du programme ». Un intitulé officiel ne doit pas être paraphrasé. Le contrôle intégral des références et libellés des sept canoniques reste ouvert.

## Documents locaux et reproductibilité

- Inventaire : `LOT5_DOCUMENT_MANIFEST.json` (URL, éditeur, exercice, date d'accès, HTTP, SHA-256, chemins locaux, références PDF et documentaires).
- PDF et textes extraits : `/tmp/suivibudget-lot5-documents/` ; PDFs non committés.
- La page PDF 49 a aussi été rendue et inspectée visuellement (`lfi-page-49.png`) ; les totaux des sections 334 et 336 et le programme 23220 y sont lisibles.
- Les lignes DPPD des 19 programmes et 57 actions existants contiennent leur code et leur montant sur les pages citées. Ce contrôle partiel ne certifie pas la fidélité de chaque libellé ni la complétude financière.

Reproduction des trois constats financiers :

```sh
sha256sum /tmp/suivibudget-lot5-documents/*.pdf
pdftotext -f 49 -l 50 -layout /tmp/suivibudget-lot5-documents/Loi-de-Finances-2026.pdf -
pdftotext -f 54 -l 54 -layout /tmp/suivibudget-lot5-documents/Loi-de-Finances-2026.pdf -
npm test
npm run build
```

## Préservation et limites

La branche de reprise descend directement du commit `9512311` de la PR #28, lui-même descendant de la baseline `8145c04`. Aucun cherry-pick, merge ni remplacement du travail de l'autre agent. La PR #28 et sa branche d'origine ne sont pas modifiées par cette reprise.

Ce commit de clôture ne touche qu'aux documents d'audit et de continuité. Les canoniques et fixtures hérités sont conservés pour le contrôle contradictoire : leurs statuts `RECONCILED` / `VERIFIED` / `READY_FOR_PUBLICATION` ne constituent pas une validation du LOT 5. Aucun nouveau ministère n'est publié ; le MMPE reste le seul ministère publié selon les tests existants.

Le diff baseline → reprise n'altère ni `src/data/`, ni `docs/imports/`, ni les canoniques et registres MMPE/LOT 4, ni `supabase/`. Bingerville, Cocody, Tiassalé, MMPE et les pilotes LOT 4 sont préservés. Aucun appel Supabase distant, aucune ingestion, migration, modification Auth/RLS/Storage/Edge Functions ni usage de service_role pendant cette reprise.

Les erreurs de lancement initiales (`--runInBand`, non supporté par Vitest, et `spawnSync pdftotext EPERM`) ont été contournées par les commandes natives prises en charge. Le résultat final effectif est 20 fichiers / 350 tests PASS et build PASS. Elles ne sont pas comptées comme des tests métier échoués.

## Reprise nécessaire après traitement du blocage

1. Documenter les six programmes LFI omis et leurs actions depuis les sources primaires ; conserver `null` pour toute information encore inconnue.
2. Rapprocher explicitement les périmètres LFI et DPPD-PAP, puis corriger canoniques, statuts et contrôles indépendants sans double comptage.
3. Refaire le rapport de couverture, les références et les tests de complétude LFI ; obtenir les contrôles requis avant de déclarer le lot IMPLEMENTED. La validation indépendante reste ultérieure.

Aucune validation humaine intermédiaire n'a été demandée. L'arrêt provient de la condition BLOCKED du mandat utilisateur.
