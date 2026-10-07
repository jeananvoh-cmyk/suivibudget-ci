# LOT 7 — Collectivités et versions budgétaires

```text
LOT=7
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=Originaux BP/CA nouveaux non acquis ; crédits définitifs et exécution non rapprochés
DOCUMENTS_USED=Inventaire des pièces requises ; aucun import hérité élevé au rang de source primaire
FILES_CHANGED=src/review/domain/collectivities.ts ; src/review/__tests__/collectivities.test.ts ; docs/overnight/LOT7_REPORT.md
TEST_TOTAL=368
TEST_PASS=368
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Versions concurrentes, doublons et sources secondaires doivent empêcher un total de référence
ANOMALIES_REMAINING=Collecte des originaux ; rapprochement CA/crédits définitifs ; raccordement aux données publiées
REMOTE_SUPABASE_WRITES=0
```

Adaptateur en lecture seule sur les types LocalBudget et AdministrativeAccount existants. Une version courante publiée et documentaire est sélectionnable ; un conflit reste BLOCKED. Aucun cumul entre versions, aucun budget approximatif rendu exact. Les districts autonomes restent hors du compteur des collectivités. Les CA sont recensés séparément sans déduire un paiement du total_realized.

Six tests nouveaux couvrent absence, doublons, permutation des versions, zéro, précision, exercice et périmètre. Aucun fichier de données, import ou pilote modifié. Le moteur existant est réutilisé uniquement pour identifier les types de budget initial.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
