# LOT 9 — Projets et infrastructures documentés

```text
LOT=9
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=Fiches de projets et marchés DGMP non acquis
DOCUMENTS_USED=Exigences de sources primaires et catalogue LOT8 ; aucun nouveau projet officiel extrait
FILES_CHANGED=src/review/domain/projects.ts ; src/review/__tests__/projects.test.ts ; docs/overnight/LOT9_REPORT.md
TEST_TOTAL=381
TEST_PASS=381
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Risque de double comptage, rattachement inter-institution/exercice et déduction financière du physique
ANOMALIES_REMAINING=Données de projets/marchés et rapprochements réels à contrôler ; déploiement exclu
REMOTE_SUPABASE_WRITES=0
```

Contrats de cible documentée, lien budget-projet et observation physique distincte. Les liens doivent citer des pièces publiques vérifiées ; les identités, sections et exercices concordent. Les versions en doublon sont bloquées. Le module ne fournit aucun agrégat additionnant budget et projets.

Cinq nouveaux tests de refus et de séparation financier/physique ; suite 381/381 et build PASS. Une ligne budgétaire ne peut pas devenir un projet en changeant seulement le rendu. Aucun nouveau marché, montant ou code officiel créé.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
