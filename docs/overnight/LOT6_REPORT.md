# LOT 6 — Exécution budgétaire et performance

```text
LOT=6
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=LOT5 sections 334/336/444 ; exécution 2026 non documentée
DOCUMENTS_USED=LFI 2026 ; DPPD-PAP 2026-2028 ; RAP 2022 (titre/exercice seulement)
FILES_CHANGED=src/review/domain/evidence.ts, execution.ts ; src/review/__tests__/execution.test.ts ; docs/overnight/* ; docs/AGENT_HANDOFF.md
TEST_TOTAL=362
TEST_PASS=362
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Le taux legacy accepte un dénominateur nul ; contourné dans le nouveau module, sans altérer les pilotes
ANOMALIES_REMAINING=LOT5 ; valeurs réelles d'exécution et indicateurs de performance non extraits ; raccordement production absent
REMOTE_SUPABASE_WRITES=0
```

Contrats explicites de mesure, précision, source, institution, section, exercice, période et périmètre. Refus des totaux des trois ministères bloqués, des sommes inconnues, montants non exacts ou négatifs, périodes incompatibles et divisions par zéro. Un taux supérieur à 100 % reste visible sans conclusion physique. Aucune donnée d'exécution n'est fabriquée. Le contrat des indicateurs ne les confond pas avec un taux financier : leur contenu exige encore une revue documentaire.

Tests : 12 nouveaux cas, dont zéro documenté, null, NaN, infinité, mesures et périmètres incompatibles. Suite complète : 362/362 ; build de production PASS. L'avertissement hérité de taille des bundles demeure.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
