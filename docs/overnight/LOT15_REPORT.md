# LOT 15 — Stabilisation et remise pour revue indépendante

```text
LOT=15
STATUS=BLOCKED
DEPENDENCIES_BLOCKED=Authentification anon Supabase invalide pour la vérification en lecture seule ; sources métier des LOTS6–12 non disponibles ; audit accessibilité complet non réalisé
DOCUMENTS_USED=LFI2026 ; DPPD-PAP2026-2028 ; RAP2022 local non exposé après recontrôle 404 ; inventaires et contrôles indépendants
FILES_CHANGED=src/review/domain/{evidence,documents,execution,collectivities,history,snapshot}.ts ; src/review/ui/{DocumentLibrary,ReviewWorkspace}.tsx ; src/review/__tests__/{collectivities,stabilization,lot5Reconciliation}.test.ts ; docs/overnight/{LOT15_REPORT,FINAL_REPORT}.md ; docs/{AGENT_HANDOFF,CODEX_CHECKPOINT}.md
TEST_TOTAL=457
TEST_PASS=457
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Dates impossibles acceptées ; référence pouvant masquer une page invalide ; métadonnées supplémentaires exportables ; provenance BP insuffisamment contrôlée ; statut NOT_COMPARABLE perdu ; contrat d'indicateur de performance à préciser
ANOMALIES_REMAINING=Vérification Supabase lecture seule bloquée par Invalid API key ; aucune série métier nouvelle validée ; avertissement de taille du bundle historique ; audit WCAG complet non réalisé
REMOTE_SUPABASE_WRITES=0
```

Les anomalies techniques listées sont corrigées. Les dates sont contrôlées au calendrier ; les sources exigent une citation résoluble et les exports utilisent une liste explicite de champs publics. Les versions documentaires d'exercices différents sont incompatibles. Les indicateurs de performance ont leur propre unité et leur propre provenance ; un écart ne constitue pas une conclusion de succès. Les dossiers des collectivités exigent la preuve documentaire du BP et ne sélectionnent que des CA publiés.

`buildReviewSnapshot` compose le périmètre, les observations et les documents sans accès réseau. Il conserve null, UNKNOWN, NOT_COMPARABLE et BLOCKED, filtre les institutions étrangères au périmètre et ne décide aucune publication. L'interface consomme ce contrat avec des observations vides : aucun montant réel n'a été ajouté.

Validation locale : 457/457 tests dans 32 fichiers, build production et build de revue séparé PASS. Chromium : 56 contrôles de débordement sur 7 vues et 8 largeurs (360–1920), aucune erreur JavaScript et aucune tentative de requête externe. Les trois ministères réconciliés restent UNKNOWN dans l'interface faute de données chargées ; recherche documentaire, export JSON local, lien d'évitement clavier et cibles de 44 px vérifiés. Captures et résultat détaillé : `/tmp/suivibudget-review-artifacts/`.

Les données protégées et migrations restent inchangées. Les trois canoniques LOT5 et leurs contrôles indépendants sont corrigés. Le build de production n'inclut pas `review.html`. La vérification Supabase utilise un client séparé borné à GET/HEAD ; elle reste BLOCKED par la clé anon distante invalide. Cette validation locale ne certifie ni les données absentes ni les pages historiques.

Reproduction : commandes et limites dans [LOT14_REPORT.md](LOT14_REPORT.md). Synthèse de livraison : [FINAL_REPORT.md](FINAL_REPORT.md).
