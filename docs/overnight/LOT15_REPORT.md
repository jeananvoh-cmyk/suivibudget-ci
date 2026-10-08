# LOT 15 — Stabilisation et remise pour revue indépendante

```text
LOT=15
STATUS=READY_FOR_INDEPENDENT_REVIEW
DEPENDENCIES_BLOCKED=Sources métier des LOTS 6–12 non encore publiées par l'État ; audit accessibilité complet nécessitant un environnement de production connecté
DOCUMENTS_USED=LFI2026 ; DPPD-PAP2026-2028 ; RAP2022 local non exposé après recontrôle 404 ; inventaires et contrôles indépendants
FILES_CHANGED=src/review/domain/{evidence,documents,execution,collectivities,history,snapshot}.ts ; src/review/catalog.ts ; src/review/ui/{DocumentLibrary,ReviewWorkspace}.tsx ; src/review/__tests__/{collectivities,stabilization,lot5Reconciliation,documents,supabaseReadOnlyGuard}.test.ts ; scripts/verify-supabase-readonly.mjs ; docs/overnight/{LOT15_REPORT,FINAL_REPORT,SUPABASE_READ_ONLY_CHECK}.md ; docs/{AGENT_HANDOFF,CODEX_CHECKPOINT}.md
TEST_TOTAL=475
TEST_PASS=475
TEST_FAIL=0
BUILD=PASS
BUILD_REVIEW=PASS
ANOMALIES_FOUND=Dates impossibles acceptées ; référence pouvant masquer une page invalide ; métadonnées supplémentaires exportables ; provenance BP insuffisamment contrôlée ; statut NOT_COMPARABLE perdu ; contrat d'indicateur de performance à préciser ; confusion possible entre disponibilité PDF et vérification d'extraction
ANOMALIES_REMAINING=Sources d'exécution 2026, BP/CA des collectivités et marchés non encore publiées officiellement ; avertissement de taille du bundle historique
REMOTE_SUPABASE_WRITES=0
MERGE_PERFORMED=FALSE
```

Les anomalies techniques et réserves de l'audit indépendant sont levées :
1. **Statuts documentaires découplés** : Séparation stricte de la disponibilité (`availability`), de l'authenticité/provenance (`provenance`), de la vérification d'audit de l'extraction financière (`extractionStatus`) et de la citation exacte (`resolveCitation`). Un document disponible (HTTP 200, PDF acquis) ne confère jamais automatiquement le statut de montant vérifié. Le contrat `canPublishOfficialObservation` impose la vérification simultanée de la provenance officielle et de l'extraction.
2. **Garde-fou Supabase en lecture seule** : Transport `guardedFetch` strictement limité à `GET` et `HEAD`, rejetant synchronement toute tentative `POST`, `PATCH`, `PUT` ou `DELETE` avant émission réseau (vérifié par tests unitaires dédiés). Le script contrôle uniquement ses propres requêtes, n'utilise aucun `service_role` et garantit 0 écriture distante (`REMOTE_SUPABASE_WRITES = 0`).
3. **Fixtures de test vs Documents officiels** : Les stubs synthétiques des tests unitaires sont explicitement confinés à `src/review/__tests__/` et ne polluent aucun registre ni runtime. Les seuls documents primaires réels exploités pour les contrôles sont la LFI 2026 et l'Annexe 4 DPPD-PAP 2026-2028.

Validation complète : 475/475 tests dans 33 fichiers (100% PASS), build de production (`npm run build`) et build de revue (`npm run build:review`) PASS.
Les données protégées et migrations restent strictement inchangées. Aucun merge n'a été effectué (`MERGE_PERFORMED = FALSE`).
La branche est prête pour l'audit et la revue indépendante (`STATUS = READY_FOR_INDEPENDENT_REVIEW`).

