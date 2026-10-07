# LOT 8 — Documents et sources transversaux

```text
LOT=8
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=Originaux des collectivités/projets/réponses non acquis ; URL du RAP 2022 désormais en erreur 404
DOCUMENTS_USED=LFI 2026 et Annexe 4 accessibles ; RAP 2022 conservé depuis une acquisition officielle antérieure, non exposé après recontrôle 404
FILES_CHANGED=src/review/domain/documents.ts ; src/review/__tests__/documents.test.ts ; docs/overnight/LOT8_REPORT.md
TEST_TOTAL=376
TEST_PASS=376
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Doublons d'identité, cycles de version et URLs signées/avec identifiants doivent être refusés
ANOMALIES_REMAINING=Inventaire documentaire des données futures ; rétablissement éventuel de l'URL officielle RAP
REMOTE_SUPABASE_WRITES=0
```

Catalogue pur et résolution d'une citation vers un document explicitement public, vérifié, de même exercice, avec empreinte et page valide. Refus des références privées, inconnues, signées ou non HTTPS. Aucun upload ni changement des mécanismes Storage existants.

Checkpoint A : le périmètre technique indépendant peut continuer sous l'autorisation spéciale. Le périmètre données LOT5 reste BLOCKED. Les 8 nouveaux cas passent ; suite complète 376/376 et build PASS. La validation du catalogue n'affirme pas qu'un document fiscalement incomplet est réconcilié.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
