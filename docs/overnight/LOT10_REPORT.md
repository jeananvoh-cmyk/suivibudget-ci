# LOT 10 — Suivi citoyen lié aux budgets et projets

```text
LOT=10
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=Contributions publiques modérées réelles non chargées ; cibles LOT5 bloquées
DOCUMENTS_USED=Contrat ApecPublicNeed existant ; exigences de modération et références des cibles ; aucune contribution créée
FILES_CHANGED=src/review/domain/citizen.ts ; src/review/__tests__/citizen.test.ts ; docs/overnight/LOT10_REPORT.md
TEST_TOTAL=386
TEST_PASS=386
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Risque de fuite des événements privés et d'inférence de résolution depuis un simple suivi
ANOMALIES_REMAINING=Raccordement à une projection publique autorisée ; validation des contributions réelles
REMOTE_SUPABASE_WRITES=0
```

Projection pure à partir du type public APEC existant. Liste blanche de champs, événements publiés et relus pour la confidentialité, détection des conflits de séquence, tri sans mutation. Une cible non sourcée ou relevant du LOT5 reste UNKNOWN/BLOCKED. La provenance reste CITIZEN_OBSERVATION et la représentativité est null.

Cinq tests nouveaux ; 386/386 et build PASS. Aucun formulaire d'envoi, aucun RPC, aucune écriture ou nouvelle contribution distante. Le module suppose que le futur chargeur utilise les contrôles serveur existants : ses indicateurs de modération ne sont pas une autorisation client.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
