# LOT 14 — Refonte candidate et corrections d'accessibilité

```text
LOT=14
STATUS=PARTIAL
DEPENDENCIES_BLOCKED=Données réelles non chargées ; LOT5 incomplet ; migration globale des pages historiques non réalisée
DOCUMENTS_USED=Catalogue des 3 PDF officiels acquis ; UX_AUDIT.md (constats techniques, pas source métier)
FILES_CHANGED=review.html ; vite.review.config.ts ; src/review/catalog.ts, main.tsx, ui/* ; src/review/__tests__/workspace.test.tsx ; index.html ; src/index.css ; Header.tsx ; BottomNav.tsx ; scripts/verify-review-browser.cjs ; rapport LOT14
TEST_TOTAL=404
TEST_PASS=404
TEST_FAIL=0
BUILD=PASS
ANOMALIES_FOUND=Zoom, navigation mobile et accès clavier au menu Budgets corrigés ; aucune anomalie de débordement sur le candidat
ANOMALIES_REMAINING=Audit de toutes les pages historiques, lecteurs d'écran réels et certification WCAG ; données fonctionnelles non chargées
REMOTE_SUPABASE_WRITES=0
```

Interface locale de revue indépendante : Budgets, Collectivités, Projets, Contributions, Réponses, Historique et Sources. États vides explicites ; aucun montant de substitution. Filtrage des sources par exercice et recherche, citation, export local des métadonnées ; le RAP 2022 n'est jamais présenté comme exécution 2026. Les nouveaux parcours ne sont pas reliés aux services distants.

Corrections transversales dans le code existant : zoom autorisé, navigation mobile nommée et aria-current, cibles tactiles de 44 px, focus visible et préférence de mouvement réduit, ouverture clavier du menu Budgets. Refonte complète de chaque page historique encore à réaliser : ce lot est PARTIAL.

404/404 tests PASS ; build production PASS et build de revue séparé PASS (environ 161 kB JS, 52 kB gzip). Chromium : 56 vérifications (7 vues × 8 largeurs), zéro débordement, zéro erreur JS, zéro tentative de requête externe. Blocage des trois ministères, recherche, export JSON, lien d'évitement clavier et cibles 44 px vérifiés. Captures 375 et 1440 px inspectées : /tmp/suivibudget-review-artifacts/. Ces essais concernent le candidat, pas toutes les pages historiques.

Reproduction locale : `node node_modules/vite/bin/vite.js --config vite.review.config.ts`, puis ouvrir http://127.0.0.1:5174/review.html. Le build habituel n'inclut pas review.html. Pour les contrôles navigateur, fournir un module Playwright disponible via REVIEW_PLAYWRIGHT_MODULE et éventuellement REVIEW_CHROMIUM_PATH, puis lancer `node scripts/verify-review-browser.cjs`. Aucun serveur public déployé.

Inventaire documentaire : [DOCUMENTS.json](DOCUMENTS.json) et [manifeste DGBF](../budget-ingestion/LOT5_DOCUMENT_MANIFEST.json). Exigences : [REQUIREMENTS.md](REQUIREMENTS.md). Statut technique soumis à revue ; aucune donnée nouvelle publiée.
