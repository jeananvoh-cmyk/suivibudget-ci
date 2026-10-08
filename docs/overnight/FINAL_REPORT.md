# État indépendant des LOTS 5 à 15 — 8 octobre 2026

La branche contient une correction documentaire complète du LOT 5 et les architectures en lecture seule des LOTS 6 à 15. Les dernières réserves de l'audit indépendant sont levées :
- Séparation explicite et stricte des statuts documentaires : disponibilité réseau/locale (`availability`), authenticité et provenance républicaine (`provenance`), vérification d'audit de l'extraction financière (`extractionStatus`), et résolution de citation exacte (`resolveCitation`).
- Règle inviolable : Un document disponible (HTTP 200, PDF présent) n'entraîne JAMAIS automatiquement la vérification d'un montant extrait.
- Distinction claire et documentée entre les fixtures de tests unitaires (stubs synthétiques isolés pour tester les invariants) et les documents primaires officiels réels (LFI 2026 et DPPD-PAP Annexe 4 2026–2028).
- Transport Supabase en lecture seule hermétique (`guardedFetch`) interdisant toute méthode autre que GET/HEAD de façon synchrone avant toute émission réseau. Son périmètre est clarifié (sonde ciblée sur ses propres requêtes, aucun accès privilégié, 0 écriture).

| Lot | Statut indépendant | Preuve acquise | Blocage restant |
|---:|---|---|---|
| 5 | VALIDATED | LFI et DPPD-PAP, 25 programmes, 66 actions, contrôles PDF et arithmétiques | Aucun pour le périmètre documentaire LOT5 ; publication toujours séparée |
| 6 | PARTIAL | Contrats d'exécution/performance et tests | Exécution 2026, LFR/loi de règlement/RAP correspondant |
| 7 | PARTIAL | Sélection de version, ID obligatoire, BP/CA séparés | Originaux BP, modificatifs et CA des collectivités |
| 8 | PARTIAL | Catalogue public à liste blanche, deux PDF 2026 accessibles, statuts orthogonaux vérifiés | Sources futures ; URL du RAP 2022 actuellement en 404 |
| 9 | PARTIAL | Liens projet-budget sans agrégation | Fiches de projets et pièces DGMP officielles |
| 10 | PARTIAL | Projection publique, dates ISO calendaires, confidentialité | Contributions publiques modérées réelles |
| 11 | PARTIAL | Réponses et audits séparés par provenance | Réponses et rapports de contrôle officiels |
| 12 | PARTIAL | NOT_COMPARABLE préservé, exports null | Sources multi-exercices et preuve d'équivalence |
| 13 | PARTIAL | Composants accessibles et audit technique | Référence WCAG inaccessible, audit global et technologies d'assistance |
| 14 | PARTIAL | Candidat local, workspace isolé de revue | Refonte de toutes les pages historiques et données réelles |
| 15 | READY_FOR_INDEPENDENT_REVIEW | 488 tests (100% PASS), production build et review build PASS, garde-fous transport, extraction stricte et rendu visuel vérifiés | Sources métier LOTS 6-12 non encore publiées par l'État |

## Sources officielles vs Fixtures de test

1. **Documents primaires officiels réels** :
   - LFI 2026 : Loi n° 2025-987 du 19 décembre 2025, 583 pages, SHA-256 `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76`, HTTP 200, extraction contrôlée sur les sections et programmes.
   - Annexe 4 DPPD-PAP 2026-2028 : 1 229 pages, SHA-256 `0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10`, HTTP 200, extraction contrôlée sur les programmes et actions.
   - Portail RAP DGBF : HTTP 200. Le PDF RAP 2022 précédemment acquis garde son empreinte officielle, mais son URL répond désormais 404 ; il n'est pas exposé comme citation publique accessible.
2. **Fixtures de test unitaire** :
   - Les objets de tests unitaires (ex: `test-only`, `doc` synthétique dans `documents.test.ts`, stubs `Request` dans `supabaseReadOnlyGuard.test.ts`) sont strictement confinés aux suites de tests automatisées dans `src/review/__tests__/`.
   - Ils ne constituent pas des sources officielles, n'altèrent aucun registre et ne sont jamais injectés dans les catalogues runtime ni dans `src/data/`.

## Contrôles exécutés

- Suite complète : 33 fichiers, 488 tests réussis, zéro échec (100% PASS).
- Build production (`npm run build`) : PASS. L'avertissement historique de taille de bundle reste présent.
- Build de revue séparé (`npm run build:review`) : PASS.
- Contrôle de transport Supabase (`guardedFetch`) : PASS (POST, PATCH, PUT, DELETE synchronement rejetés avant tout appel réseau ; sonde `npm run verify:supabase:read-only` PASS, 0 écriture distante).
- Navigateur Chromium : PASS (audit de rendu effectué via Chrome DevTools MCP sur `http://127.0.0.1:5174/review.html` : 0 erreur console critique, affichage exact des originaux DGBF, liens TLS et SHA-256 conformes, indisponibilité documentée sans chiffre fictif).
- Données protégées et migrations : inchangées ; aucun fichier de migration ajouté ou modifié.

## Supabase en lecture seule

- Le script `scripts/verify-supabase-readonly.mjs` initialise `@supabase/supabase-js` avec transport restreint à `GET`/`HEAD`.
- Le script contrôle uniquement ses propres requêtes et ne constitue pas un audit universel de tous les accès Supabase applicatifs ou externes.
- Aucun accès privilégié (`service_role` strictement absent ; clé `anon` uniquement).
- Aucune écriture distante réalisée : `REMOTE_SUPABASE_WRITES = 0`.
- Aucun `INSERT`, `UPDATE`, `DELETE`, RPC, Storage, Auth, migration ou seed.

```text
MASTER_MODIFIED=FALSE
MERGE_PERFORMED=FALSE
REMOTE_SUPABASE_WRITES=0
FINAL_STATUS=READY_FOR_INDEPENDENT_REVIEW
```

