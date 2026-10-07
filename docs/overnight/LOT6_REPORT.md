# LOT 6 — Exécution budgétaire et performance

```text
LOT=6
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=Exécution 2026 et loi de règlement correspondante non documentées
DOCUMENTS_USED=LFI 2026 ; DPPD-PAP 2026-2028 ; RAP 2022 (titre/exercice seulement)
FILES_CHANGED=src/review/domain/evidence.ts, execution.ts ; src/review/__tests__/execution.test.ts ; docs/overnight/* ; docs/AGENT_HANDOFF.md
TEST_TOTAL=362
TEST_PASS=362
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Le taux legacy accepte un dénominateur nul ; contourné dans le nouveau module, sans altérer les pilotes
ANOMALIES_REMAINING=Valeurs réelles d'exécution et indicateurs de performance non extraits ; raccordement production absent
REMOTE_SUPABASE_WRITES=0
```

Contrats explicites de mesure, précision, source, institution, section, exercice, période et périmètre. Refus des sommes inconnues, montants non exacts ou négatifs, périodes incompatibles et divisions par zéro. Les anciens blocages LOT5 ont été retirés après réconciliation indépendante. Un taux supérieur à 100 % reste visible sans conclusion physique. Aucune donnée d'exécution n'est fabriquée.

Tests : 12 nouveaux cas, dont zéro documenté, null, NaN, infinité, mesures et périmètres incompatibles. Suite complète : 362/362 ; build de production PASS. L'avertissement hérité de taille des bundles demeure.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
