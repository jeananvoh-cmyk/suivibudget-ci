# LOT 15 — Stabilisation et remise pour revue indépendante

```text
LOT=15
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=LOT5 incomplet ; sources métier et raccordements des LOTS6–12 non disponibles ; refonte historique et audit accessibilité complet non réalisés
DOCUMENTS_USED=LFI2026 ; DPPD-PAP2026-2028 ; RAP2022 (métadonnées seulement) ; inventaires DOCUMENTS.json et LOT5_DOCUMENT_MANIFEST.json
FILES_CHANGED=src/review/domain/{evidence,documents,execution,collectivities,history,snapshot}.ts ; src/review/ui/{DocumentLibrary,ReviewWorkspace}.tsx ; src/review/__tests__/{collectivities,stabilization}.test.ts ; docs/overnight/{LOT15_REPORT,FINAL_REPORT}.md ; docs/{AGENT_HANDOFF,CODEX_CHECKPOINT}.md
TEST_TOTAL=412
TEST_PASS=412
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Dates impossibles acceptées ; référence pouvant masquer une page invalide ; métadonnées supplémentaires exportables ; provenance BP insuffisamment contrôlée ; statut NOT_COMPARABLE perdu ; contrat d'indicateur de performance à préciser
ANOMALIES_REMAINING=Six programmes LOT5 non résolus ; aucune série métier nouvelle validée ; avertissement de taille du bundle historique ; audit WCAG complet non réalisé
REMOTE_SUPABASE_WRITES=0
```

Les anomalies techniques listées sont corrigées. Les dates sont contrôlées au calendrier ; les sources exigent une citation résoluble et les exports utilisent une liste explicite de champs publics. Les versions documentaires d'exercices différents sont incompatibles. Les indicateurs de performance ont leur propre unité et leur propre provenance ; un écart ne constitue pas une conclusion de succès. Les dossiers des collectivités exigent la preuve documentaire du BP et ne sélectionnent que des CA publiés.

`buildReviewSnapshot` compose le périmètre, les observations et les documents sans accès réseau. Il conserve null, UNKNOWN, NOT_COMPARABLE et BLOCKED, filtre les institutions étrangères au périmètre et ne décide aucune publication. L'interface consomme ce contrat avec des observations vides : aucun montant réel n'a été ajouté.

Validation finale : 412/412 tests dans 30 fichiers, build production et build de revue séparé PASS. Chromium : 56 contrôles de débordement sur 7 vues et 8 largeurs (360–1920), aucune erreur JavaScript et aucune tentative de requête externe. Trois ministères bloqués, recherche documentaire, export JSON local, lien d'évitement au clavier et cibles de 44 px vérifiés. Le serveur local avait expiré au premier essai ; relancé sur la même adresse de boucle locale, le scénario complet a réussi. Captures et résultat détaillé : `/tmp/suivibudget-review-artifacts/`.

Les chemins de données protégés, canoniques, contrôles indépendants et migrations sont identiques au commit `9730ab8`. Le build de production n'inclut pas `review.html`. Les nouveaux modules n'initialisent aucun service distant. Cette validation porte sur le périmètre technique local ; elle ne certifie ni les données absentes ni les pages historiques.

Reproduction : commandes et limites dans [LOT14_REPORT.md](LOT14_REPORT.md). Synthèse de livraison : [FINAL_REPORT.md](FINAL_REPORT.md).
