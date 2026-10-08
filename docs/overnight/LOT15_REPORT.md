# LOT 15 — Stabilisation et remise pour revue indépendante

```text
LOT=15
STATUS=READY_FOR_INDEPENDENT_REVIEW
DEPENDENCIES_BLOCKED=Sources métier des LOTS 6–12 non encore publiées par l'État ; audit accessibilité complet nécessitant un environnement de production connecté
DOCUMENTS_USED=LFI2026 ; DPPD-PAP2026-2028 ; RAP2022 local non exposé après recontrôle 404 ; inventaires et contrôles indépendants
FILES_CHANGED=src/review/domain/{evidence,documents,execution,collectivities,history,snapshot}.ts ; src/review/catalog.ts ; src/review/ui/{DocumentLibrary,ReviewWorkspace}.tsx ; src/review/__tests__/{collectivities,stabilization,lot5Reconciliation,documents,supabaseReadOnlyGuard}.test.ts ; scripts/verify-supabase-readonly.mjs ; docs/overnight/{LOT15_REPORT,FINAL_REPORT,SUPABASE_READ_ONLY_CHECK}.md ; docs/{AGENT_HANDOFF,CODEX_CHECKPOINT}.md
TEST_TOTAL=488
TEST_PASS=488
TEST_FAIL=0
BUILD=PASS
BUILD_REVIEW=PASS
ANOMALIES_FOUND=Dates impossibles acceptées ; référence pouvant masquer une page invalide ; métadonnées supplémentaires exportables ; provenance BP insuffisamment contrôlée ; statut NOT_COMPARABLE perdu ; contrat d'indicateur de performance à préciser ; confusion possible entre disponibilité PDF et vérification d'extraction ; champs documentaires facultatifs pouvant contourner le contrôle financier ; contrôle d'audit basé uniquement sur une chaîne déclarative sans registre traçable
ANOMALIES_REMAINING=Sources d'exécution 2026, BP/CA des collectivités et marchés non encore publiées officiellement ; avertissement de taille du bundle historique
REMOTE_SUPABASE_WRITES=0
MERGE_PERFORMED=FALSE
```

Les anomalies techniques et réserves de l'audit indépendant sont levées :
1. **Statuts documentaires découplés & chemin de publication financier (Réserve A)** : Séparation stricte de la disponibilité (`availability`), de l'authenticité/provenance (`provenance`), de la vérification d'audit de l'extraction financière (`extractionStatus`) et de la citation exacte (`resolveCitation`). Un document disponible (HTTP 200, PDF acquis) ne confère jamais automatiquement le statut de montant vérifié. Le contrat `canPublishOfficialObservation` impose la vérification simultanée de la provenance officielle (`OFFICIAL_SOURCE`), de l'extraction vérifiée (`VERIFIED`), de la disponibilité (`AVAILABLE`) et de la vérification documentaire (`VERIFIED`). Le montant exact zéro documenté (`amount === 0, precision: 'EXACT'`) est fidèlement préservé.
2. **Registre de contrôle documentaire traçable (Réserve B)** : Introduction du contrat `DocumentaryAuditRecord` et de la fonction `verifyDocumentaryAudit()` dans `src/review/domain/documents.ts`. Une simple chaîne déclarative `CONTROL_SCOPE` ne peut plus promouvoir une extraction au statut `VERIFIED`. Le registre `OFFICIAL_DOCUMENTARY_AUDITS` dans `src/review/catalog.ts` lie explicitement les documents LOT5 (LFI 2026 et DPPD-PAP Annexe 4) aux résultats d'audit indépendants traçables (`LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls`).
3. **Suite de non-régression et cas limites** : 30 tests dans `src/review/__tests__/documents.test.ts` couvrant l'ensemble des 14 scénarios requis par l'audit (absence de provenance, provenance secondaire, extraction non vérifiée, absence d'audit traçable, discordance SHA, discordance d'année, discordance de documentId, citation résolue sans publication, montant exact sans preuve, document privé, montant null, montant zéro documenté, et intégrité LOT5).
4. **Garde-fou Supabase en lecture seule** : Transport `guardedFetch` strictement limité à `GET` et `HEAD`, rejetant synchronement toute tentative `POST`, `PATCH`, `PUT` ou `DELETE` avant émission réseau (vérifié par tests unitaires dédiés). Le script contrôle uniquement ses propres requêtes, intègre un repli sécurisé sur `.env`, n'utilise aucun `service_role` et garantit 0 écriture distante (`REMOTE_SUPABASE_WRITES = 0`).
5. **Vérification de rendu Chromium** : `CHROMIUM_CHECK = PASS` via Chrome DevTools MCP sur `http://127.0.0.1:5174/review.html` : 0 erreur console critique, affichage exact des originaux DGBF (LFI 2026, Annexe 4 DPPD-PAP 2026-2028), des liens TLS officiels et des empreintes SHA-256, statut "Information indisponible" affiché pour les données non vérifiées.

Validation complète : 488/488 tests dans 33 fichiers (100% PASS), build de production (`npm run build`) et build de revue (`npm run build:review`) PASS.
Les données protégées et migrations restent strictement inchangées. Aucun merge n'a été effectué (`MERGE_PERFORMED = FALSE`).
La branche est prête pour l'audit et la revue indépendante (`STATUS = READY_FOR_INDEPENDENT_REVIEW`).

