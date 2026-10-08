# LOT 15 — Stabilisation et remise pour revue indépendante

```text
LOT=15
STATUS=READY_FOR_INDEPENDENT_REVIEW
DEPENDENCIES_BLOCKED=Sources métier des LOTS 6–12 non encore publiées par l'État ; audit accessibilité complet nécessitant un environnement de production connecté
DOCUMENTS_USED=LFI2026 ; DPPD-PAP2026-2028 ; RAP2022 local non exposé après recontrôle 404 ; inventaires et contrôles indépendants
FILES_CHANGED=src/review/domain/{evidence,documents,financialAudits,execution,collectivities,history,snapshot}.ts ; src/review/catalog.ts ; src/review/ui/{DocumentLibrary,ReviewWorkspace}.tsx ; src/review/__tests__/{collectivities,stabilization,lot5Reconciliation,documents,financialEvidenceHardening,supabaseReadOnlyGuard}.test.ts ; scripts/verify-supabase-readonly.mjs ; docs/overnight/{LOT15_REPORT,FINAL_REPORT,SUPABASE_READ_ONLY_CHECK}.md ; docs/{AGENT_HANDOFF,CODEX_CHECKPOINT}.md
TEST_TOTAL=513
TEST_PASS=513
TEST_FAIL=0
BUILD=PASS
BUILD_REVIEW=PASS
ANOMALIES_FOUND=Dates impossibles acceptées ; référence pouvant masquer une page invalide ; métadonnées supplémentaires exportables ; provenance BP insuffisamment contrôlée ; statut NOT_COMPARABLE perdu ; contrat d'indicateur de performance à préciser ; confusion possible entre disponibilité PDF et vérification d'extraction ; champs documentaires facultatifs pouvant contourner le contrôle financier ; contrôle d'audit basé uniquement sur une chaîne déclarative sans registre traçable ; absence de matching financier granulaire sur les dimensions exactes (exercice, section, scope, mesure, base, devise, montant) ; sélection arbitraire par find() au lieu d'une analyse exhaustive de tous les audits applicables ; page optionnelle pouvant contourner l'audit ; manque de vérification de cohérence entre code d'action et code de programme.
ANOMALIES_REMAINING=Sources d'exécution 2026, BP/CA des collectivités et marchés non encore publiées officiellement ; avertissement de taille du bundle historique
REMOTE_SUPABASE_WRITES=0
MERGE_PERFORMED=FALSE
PUBLICATION_PATH_CONNECTED=REVIEW_DOMAIN_ONLY
```

Les anomalies techniques et réserves de l'audit indépendant sont définitivement levées :
1. **Statuts documentaires découplés & chemin de publication financier strict (Réserve A & B)** : Séparation formelle de la disponibilité (`availability`), de l'authenticité/provenance (`provenance`), de la vérification d'audit de l'extraction financière (`extractionStatus`) et de la citation exacte (`resolveCitation`). Un document disponible (HTTP 200, PDF acquis) ne confère jamais automatiquement le statut de montant vérifié. Le contrat `canPublishOfficialObservation` impose la vérification simultanée de la provenance officielle (`OFFICIAL_SOURCE`), de l'extraction vérifiée (`VERIFIED`), de la disponibilité (`AVAILABLE`) et de la vérification documentaire (`VERIFIED`). Le montant exact zéro documenté (`amount === 0, precision: 'EXACT'`) est fidèlement préservé.
2. **Contrôle financier granulaire étanche (`matchFinancialAudit`) & élimination de `.find()`** :
   - Introduction du module `src/review/domain/financialAudits.ts` et du contrat `FinancialAuditRecord`.
   - Matching multidimensionnel strict : exercice budgétaire, institution, section ministérielle, granularité de périmètre (scope), mesure financière, base budgétaire, devise (`XOF`), montant exact en FCFA, document ID, empreinte SHA-256 et page PDF.
   - Analyse exhaustive de tous les audits applicables et rejet déterministe de toute divergence de montant (`CONTRADICTORY_AUDIT_AMOUNTS`), de page (`CONTRADICTORY_AUDIT_PAGES`), d'enregistrements multiples (`CONTRADICTORY_AUDIT_RECORDS`) ou de statuts (`SOURCE_CONFLICT`, `TO_VERIFY`).
   - Page documentaire obligatoire (`PAGE_REQUIRED` si audit paginé et observation sans page, `PAGE_MISMATCH` si discordante). Contrôle par tableau (`tableRef`) si audit non paginé.
   - Cohérence structurelle des codes (`actionCode.startsWith(programCode)` sinon `ACTION_PROGRAM_MISMATCH`, interdiction de code d'action pour total de section).
   - Intégrité bidirectionnelle du registre financier transformé de façon typée depuis `LOT5_INDEPENDENT_LFI_CONTROLS.json`.
   - Étanchéité hiérarchique absolue : un contrôle d'agrégat (`SECTION_TOTAL`, `PROGRAM_`) ne valide JAMAIS une ligne détaillée (`PROGRAM_`, `ACTION_`) sans audit explicite (`AGGREGATE_CANNOT_VALIDATE_PROGRAM`, `AGGREGATE_CANNOT_VALIDATE_ACTION`).
3. **Suite adversariale étendue (25 tests)** : Intégrée dans `src/review/__tests__/financialEvidenceHardening.test.ts`, couvrant l'ensemble des 10 scénarios d'attaque et d'intégrité imposés.
4. **Garde-fou Supabase en lecture seule** : Transport `guardedFetch` strictement limité à `GET` et `HEAD`, rejetant synchronement toute tentative `POST`, `PATCH`, `PUT` ou `DELETE` avant émission réseau (vérifié par tests unitaires dédiés). Le script contrôle uniquement ses propres requêtes, intègre un repli sécurisé sur `.env`, n'utilise aucun `service_role` et garantit 0 écriture distante (`REMOTE_SUPABASE_WRITES = 0`).
5. **Vérification de rendu Chromium** : `CHROMIUM_CHECK = PASS` via Chrome DevTools / Playwright MCP sur `http://127.0.0.1:5174/review.html` : 0 erreur console critique, affichage exact des originaux DGBF (LFI 2026, Annexe 4 DPPD-PAP 2026-2028), des liens TLS officiels et des empreintes SHA-256, statut "Information indisponible" affiché pour les données non vérifiées.

Validation complète : 513/513 tests dans 34 fichiers (100% PASS), types TypeScript PASS (`tsc --noEmit`), build de production (`npm run build`) et build de revue (`npm run build:review`) PASS.
Les données protégées et migrations restent strictement inchangées. Aucun merge n'a été effectué (`MERGE_PERFORMED = FALSE`).
La branche est prête pour l'audit et la revue indépendante (`STATUS = READY_FOR_INDEPENDENT_REVIEW`).
