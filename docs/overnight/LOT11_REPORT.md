# LOT 11 — Contrôle institutionnel et droit de réponse

```text
LOT=11
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=Réponses et rapports institutionnels primaires non chargés ; LOT5
DOCUMENTS_USED=Contrats de sources LOT8 ; exigences de pièces de contrôle ; aucune réponse officielle ajoutée
FILES_CHANGED=src/review/domain/responses.ts ; src/review/__tests__/responses.test.ts ; docs/overnight/LOT11_REPORT.md
TEST_TOTAL=391
TEST_PASS=391
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Risque de confondre droit de réponse, audit officiel et validation indépendante
ANOMALIES_REMAINING=Acquisition des pièces et branchement à une projection publique autorisée
REMOTE_SUPABASE_WRITES=0
```

Projection distincte des réponses institutionnelles et des rapports d'audit, avec liens de source vérifiés, identité institutionnelle et exercice compatibles. Les déclarations privées, retirées ou sans pièce sont exclues. La validation indépendante reste UNKNOWN, y compris lorsqu'une réponse est documentée.

Cinq nouveaux tests ; suite 391/391 et build PASS. Absence de réponse ne signifie ni refus ni inaction. Aucun message n'est envoyé aux institutions et aucune réponse n'est générée ou enregistrée.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
