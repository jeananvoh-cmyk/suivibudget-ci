# LOT 12 — Historique, comparaisons et Open Data

```text
LOT=12
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=Séries historiques et preuve d'équivalence des périmètres non acquises ; LOT5
DOCUMENTS_USED=LFI/PAP 2026, RAP 2022 (exercices distincts, aucune concordance implicite)
FILES_CHANGED=src/review/domain/history.ts ; src/review/__tests__/history.test.ts ; docs/overnight/LOT12_REPORT.md
TEST_TOTAL=397
TEST_PASS=397
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Périmètres non comparables, base zéro, export de valeurs bloquées et injection de formules CSV
ANOMALIES_REMAINING=Jeux de données publics multi-exercices ; correspondances institutionnelles documentées ; LOT5
REMOTE_SUPABASE_WRITES=0
```

Comparaison nominale seulement, exigeant même institution, section, périmètre, mesure, base, devise et fin de période, ainsi qu'une preuve d'équivalence. Base zéro : différence absolue possible, pourcentage null. Aucune correction d'inflation implicite. Exports JSON/CSV à schéma fixe, null explicite, sources citées et formules CSV neutralisées.

Six nouveaux tests ; 397/397 et build PASS. Checkpoint B : continuation technique autorisée ; aucun agrégat officiel ou résultat dépendant du LOT5 n'est validé. Les exports sont des fonctions locales, sans endpoint ni téléchargement automatique.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
