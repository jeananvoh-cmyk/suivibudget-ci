# Audit des montants publics et clôture technique de PR #29

Contrôle du 9 octobre 2026, UTC. Branche de livraison : `codex/public-amounts-audit`, créée depuis master `707b3b688f23bd33dc0f3504e13b79c65908dd50`. Aucun changement de montant métier, aucune fusion, aucune migration, aucun réimport et aucune écriture Supabase. Les constats ci-dessous ne constituent pas une certification générale des données.

## 1. Verdict PR #29 : NO-GO documentaire

[PR #29](https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/29) reste ouverte, `MERGEABLE`, branche `antigravity/reconcile-lots6-15-post-lot5`, base master. HEAD contrôlé : `d479c1f9596538aac9caa82193ec766b4f4591e4`. Sept commits ; diff intégral de 60 fichiers, +5 705 / −17. [Manifeste du diff et reproduction](pr29-review.json).

La [CI Quality](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/37861518482) et Vercel sont SUCCESS sur ce HEAD. Les 547 tests et les builds production/review déjà validés sur ce HEAD ne sont pas rejoués intégralement pour cet audit. La CI ne démontre pas l'étanchéité de toutes les sorties financières.

L'examen porte sur les sept commits, les domaines de revue, leurs tests, l'interface isolée, les scripts, la configuration et les changements partagés d'accessibilité. Dépendances et lockfile inchangés ; deux commandes ajoutées à package.json. Aucune modification dans `src/data`, `src/budget-ingestion`, `docs/imports`, `docs/references/2026` ou `supabase`. Les deux manifestes LOT5 ajoutés sous `docs/budget-ingestion` sont bien inclus dans l'examen. L'entrée review est séparée de l'application de production.

| Priorité | Constat démontré | Emplacement au HEAD contrôlé | Critère de correction |
|---|---|---|---|
| P1, bloquant | L'export n'appelle pas le contrôle financier strict. Une référence officielle valide suffit à exposer un montant altéré comme AVAILABLE. | `src/review/domain/history.ts:25`, composition `snapshot.ts:11` | Une mutation de 1 FCFA doit produire null/UNKNOWN dans CSV, JSON, snapshot et toute composition financière concernée. |
| P1, bloquant | Les audits d'autorisations CP 2026 sont enregistrés comme ORDERED et refusent PLANNED. La LFI et le Tableau 7 ne prouvent pas un ordonnancement. | `src/review/domain/financialAudits.ts:462`, `:595`, `:618`, `:641` | Identifier correctement la mesure budgétaire et tester explicitement le refus de confusion avec l'exécution. |
| P2, validation navigateur | `assert` est utilisé sans import ni déclaration. Le script échouera à sa première assertion une fois le navigateur démarré. | `scripts/verify-review-browser.cjs:28` | Importer l'assertion puis exécuter réellement le script ; ce constat n'est pas une régression financière en production. |

Reproduction exécutée sur les sources du SHA figé, sans checkout ni modification de la PR : section MFPMA 237, exercice 2026, page PDF 47, montant original 45 121 940 916 FCFA. Mutation locale de test à **45 121 940 917** : `canPublishOfficialObservation` renvoie null/UNKNOWN/AMOUNT_MISMATCH, mais `openDataRows` et `buildReviewSnapshot` conservent **45 121 940 917 / AVAILABLE**. Le snapshot conserve `publicationDecision: NOT_REQUESTED`. Il s'agit d'un défaut du contrat du domaine de revue ; aucune fuite de cette mutation dans la production actuelle n'est alléguée. L'interface review actuelle reçoit une liste d'observations vide.

## 2. Inventaire livré et couverture

L'inventaire suit les données réellement chargées depuis master, la sélection des lignes de fiches, le filtre réel de projets de dataStore et la priorité des BP publiés distants. Il couvre les institutions, lignes budgétaires, programmes/actions MMPE, BP/BM, CA/opérations/DGMP publics, projets, textes financiers littéraux, exports et agrégats. Les valeurs répétées d'une même observation sur plusieurs écrans sont regroupées dans `surfaces`. Les équivalences entre observations différentes ne sont jamais déduites de la seule égalité des montants.

| Mesure | Résultat |
|---|---:|
| Institutions du référentiel étendu inspecté | 290 |
| Projets bruts / retenus par le filtre runtime | 7 169 / 4 708 |
| Observations inventoriées, tous niveaux d'exposition | 24 953 |
| Candidats publics, hors fallback remplacé et détail embarqué non rendu | 24 787 |
| Candidats publics numériques / inconnus null | 24 692 / 95 |
| Montants confirmés exactement, valeur et attribution | 58 |
| Couverture des montants numériques | **58 / 24 692 = 0,2349 %** |
| Couverture incluant les observations null | **58 / 24 787 = 0,2340 %** |
| Agrégats et sous-totaux séparés | 565 |
| Identifiants d'observation dupliqués | 0 |

Les 58 vérifications exactes comprennent 14 totaux ministériels, 11 dotations d'institutions nationales, 31 programmes/actions MMPE et 2 attributions DGMP. Les totaux et leurs détails ne s'additionnent pas entre eux. La couverture mesure un nombre d'observations, pas une proportion de fonds publics ni une fiabilité de 99 % ou 100 %.

| Statut des candidats publics | Nombre | Lecture |
|---|---:|---|
| VERIFIED_EXACT | 58 | Original officiel précis, valeur et attribution contrôlées. |
| MISMATCH | 14 | Écart avec la référence LFI initiale 2026 identifiée. |
| WRONG_ATTRIBUTION | 0 | Aucun cas affirmé sans preuve suffisante. |
| SOURCE_MISSING | 24 438 | Source officielle précise non rattachée à l'observation inspectée ; ce n'est pas la preuve de son inexistence. |
| DOCUMENTARY_LOCATION_MISSING | 105 | URL connue, localisation documentaire non vérifiable dans l'enregistrement. |
| NOT_COMPARABLE | 7 | Périmètres institutionnels fusionnés/réorganisés sans équivalence démontrée. |
| NOT_YET_CHECKED | 165 | Contrôle documentaire non achevé, valeur inconnue ou précision non exacte. |

Fichiers utilisables pour reprendre ligne par ligne :

- [inventory.jsonl](inventory.jsonl) : ID, institution, exercice, nature, valeur FCFA, précision, source technique, URL, page, statut, contrôle indépendant et écrans. Les détails de preuve sont dans `check` lorsqu'une source a été trouvée indépendamment du record.
- [summary.json](summary.json) : dénominateurs, statuts et lectures HTTP.
- [aggregates.json](aggregates.json) : formules, valeurs, composants ; catégories et entités des rapports, totaux nationaux/locaux et lignes par institution.
- [surfaces.json](surfaces.json) : emplacements de formatage/calcul dans les pages, composants et services. Catalogue statique, pas attestation de chaque combinaison de filtres.
- [documentary-checks.json](documentary-checks.json), [document-manifest.json](document-manifest.json), [lfi-summary-transcription.json](lfi-summary-transcription.json) : preuves indépendantes et identité des PDF.
- [source-availability.json](source-availability.json) : chacune des 53 URL tentées, date, statut, empreinte si téléchargée ou erreur précise.
- [remote-public-snapshot.json](remote-public-snapshot.json), [browser-observations.json](browser-observations.json) : captures publiques nettoyées des champs privés.

Limites explicites : profil navigateur neuf, sans surcharges localStorage propres à d'autres utilisateurs ; pas d'accès aux données privées ; pas de preuve indépendante du SHA actuellement déployé derrière le domaine de production. Les contrôles documentaires ne sont pas exhaustifs : les observations non réconciliées restent identifiées individuellement. Les combinaisons arbitraires recherche/filtres sont décrites par leurs formules, sans matérialiser tous les sous-ensembles. Pour les données legacy sans précision déclarée, EXACT décrit le nombre présenté par le code, pas sa vérification. Le contexte d'affichage 2026 de lignes legacy sans année ne constitue pas une preuve documentaire de leur exercice. Les valeurs littérales en milliards sont normalisées en FCFA comme valeurs arrondies, sans inventer les décimales absentes.

## 3. Réconciliation des originaux

Les fichiers originaux DGBF ont été téléchargés en HTTP 200, vérifiés comme PDF et extraits ; pages LFI 48 et 49 également inspectées visuellement. Pagination citée : index PDF humain, commençant à 1.

- [LFI 2026](https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf), 583 pages, 13 706 025 octets, SHA-256 `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76` ; récapitulatif CP 2026, pages 45–54.
- [DPPD-PAP 2026–2028, Annexe 4](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf), 1 229 pages PDF, 21 007 442 octets, SHA-256 `0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10` ; section MMPE 348, tableaux 7, colonne 2026, pages PDF 799–832.
- [DGMP, résultats AAO 2024](https://www.marchespublics.ci/uploads/ResultatsAvisAttribution/Resultats_avis_attribution_2024.pdf), 171 pages, 4 079 716 octets, SHA-256 `45cd98b1cf9fd914fed5a6b58f14f30a48f99cc461dc5db27dea997b23e5f5ca` ; page 33, ordres 854–857.

### 14 écarts documentaires ministériels

Source technique : `src/data/institutionsData.ts` et données gouvernementales alimentant l'annuaire ; IDs complets `institution:gov-NNN:total_budget_fcfa`. Comparaison avec la LFI initiale 2026, sans présumer l'existence ni l'absence d'un budget modificatif non fourni. Aucun montant de production n'est corrigé par cet audit.

| Institution | Public FCFA | LFI CP 2026 FCFA | Page PDF |
|---|---:|---:|---:|
| gov-001 — Primature | 73 426 766 299 | 71 326 766 299 | 45 |
| gov-005 — Justice | 135 902 157 171 | 129 151 307 791 | 48 |
| gov-006 — Intérieur | 947 962 959 206 | 945 963 329 452 | 48 |
| gov-009 — Agriculture | 337 932 332 542 | 333 878 089 526 | 47 |
| gov-011 — Hydraulique | 504 985 369 765 | 502 893 150 963 | 53 |
| gov-012 — Jeunesse | 88 949 349 037 | 81 484 195 624 | 52 |
| gov-013 — Santé | 817 868 452 462 | 808 992 158 914 | 49 |
| gov-018 — Eaux et Forêts | 106 197 582 643 | 103 197 582 643 | 50 |
| gov-022 — Enseignement supérieur | 344 706 305 890 | 338 779 408 246 | 49 |
| gov-025 — Infrastructures/Équipement | 734 443 144 925 | 734 442 904 943 | 49 |
| gov-029 — Culture | 39 771 854 976 | 37 598 620 420 | 50 |
| gov-031 — Environnement | 37 734 566 044 | 36 680 067 253 | 50 |
| gov-032 — Affaires maritimes | 13 192 865 872 | 13 746 365 872 | 54 |
| gov-034 — Enseignement technique | 182 297 493 094 | 182 301 855 312 | 49 |

Les sept IDs `gov-007`, `gov-010`, `gov-014`, `gov-021`, `gov-023`, `gov-024`, `gov-035` restent NOT_COMPARABLE : les intitulés et périmètres publics réorganisés ne sont pas assimilés automatiquement à une section de la LFI. Ils ne sont pas inclus dans les 14 écarts.

### Quatre incohérences arithmétiques locales

Les composantes présentes ne réconcilient pas le total stocké. Il s'agit d'un constat interne, pas d'une déclaration d'erreur du document original. Les sources AIP concernées ont expiré lors de la tentative réseau ; aucune ventilation n'est réparée par différence. [Détail par ID](arithmetic-anomalies.json).

| Budget 2026 | Total stocké | Fonctionnement + investissement | Écart somme − total |
|---|---:|---:|---:|
| M’Bahiakro | 1 165 711 000 | 1 110 648 000 | −55 063 000 |
| Vavoua | 1 689 000 000 | 1 689 100 000 | +100 000 |
| Béré | 5 428 716 000 | 5 428 714 000 | −2 000 |
| Moronou | 7 571 020 000 | 7 571 021 000 | +1 000 |

Les lignes UNKNOWN_COMPONENT du même fichier indiquent une somme invérifiable, pas une erreur de montant ni un zéro.

### Agrégats, CA et DGMP

- **Totaux contradictoires** : les 4 708 projets retenus par le runtime totalisent 1 910 857 033 365 FCFA (national : 1 715 797 864 106 ; local : 195 059 169 259). L'accueil/annuaire/SEO annoncent 3 461 milliards ; l'observatoire, 3 453,8 milliards. Les populations annoncées varient aussi entre 7 162, 4 701 et 4 708. Ces nombres ne doivent pas être présentés comme un agrégat réconcilié du même périmètre.
- **Macro et infobulle** : l'annuaire annonce 17 350,2 milliards et l'infobulle du lien LFI 2026 du Footer annonce 15 339,2 milliards. Les textes et ressources 8 728,5 / 7 081,5 / 1 540,2 milliards sont inventoriés, sans certification exacte de valeurs affichées arrondies. Même une somme arithmétique correcte ne démontre pas la nature ou le périmètre documentaire.
- **CA Tiassalé 2024** : le parent public n'a ni URL, ni document ID, ni page originale. Les huit lignes financières mentionnent « Synthèse du fichier comparé » sans localisation primaire ; les opérations renvoient à la page 36 sans document parent accessible identifié. Aucun montant CA, y compris `surplus_or_deficit: 0` et l'exécuté nul d'une opération, n'est certifié par cet audit. Les statuts déclarés en base sont conservés séparément du verdict documentaire.
- **DGMP confirmé** : 12 413 014 FCFA, ordre 854 / AO AOO24062805823, EPP François Kadjo ; 23 725 064 FCFA, ordre 857 / AO AOO24062605747, Gardienkro. Institution Tiassalé, exercice 2024 et objet relus. La confirmation concerne le montant attribué, pas l'exécution CA ou la livraison physique.
- **DGMP à clarifier** : le rapprochement `proc-tias-2024-06` affiche 27 730 380 FCFA, montant effectivement présent à l'ordre 855. L'ordre 856 comporte le même AO AOO24062605757, même objet et lot 1, autre attributaire/date et montant 0. Le snapshot public n'a pas de numéro de contrat ni de page. Ne pas déduire qu'une ligne annule l'autre, ni certifier le matching STRONG sans justificatif distinguant ces événements. Statut documentaire de l'enregistrement laissé non vérifié.
- **Preuve physique** : les mots-clés du filtre de projets et les crédits budgétaires ne prouvent pas un chantier réalisé ; aucune dépense, attribution ou ligne du présent inventaire n'est une preuve de réalisation physique.

### Disponibilité des sources

Sur les 53 URL tentées, 22 ont répondu HTTP 200 et 31 ont expiré au délai réseau (12 secondes lors du contrôle). Un timeout ne prouve pas une disparition du document ; un HTTP 200 ne valide pas son contenu. La liste exacte et les empreintes sont dans `source-availability.json`. Les articles de presse accessibles peuvent servir de sources secondaires mais ne sont pas promus à une délibération budgétaire officielle. Les originaux BP/BM des collectivités et le CA Tiassalé non identifiés restent à obtenir ; ne pas contourner les protections Storage pour y accéder.

## 4. Tests et contrôles exécutables

`scripts/audit-public-amounts.test.mjs` contient 12 contrôles : montant modifié de 1 FCFA, ajout/suppression d'observation, mauvaises attributions ID/institution/exercice, source et localisation nécessaires, budget ≠ exécution, zéro documenté ≠ inconnu, doublon, total incohérent, absence de preuve physique, refus des mutations HTTP/autre projet, stabilité du snapshot financier réel. Les fixtures synthétiques négatives sont confinées aux tests ; aucun enregistrement métier n'est créé.

Le test de baseline compare les montants et métadonnées financières du code à l'inventaire figé. Une évolution de données nécessite une nouvelle revue documentaire et une mise à jour explicite de la baseline ; ce test ne prouve pas les milliers de valeurs legacy non vérifiées. Le replay est hors ligne, sans clé ni appel Supabase. La CI existante `npm test` découvre automatiquement le fichier. Aucun garde-fou global bloquant l'application n'est ajouté au runtime.

Commandes de reprise :

```sh
npx vitest run scripts/audit-public-amounts.test.mjs
npm test
npx tsc --noEmit
npm run build
node scripts/audit-public-amounts.mjs
node scripts/audit-public-amounts.mjs --pr29
node scripts/audit-public-amounts.mjs --pdf-dir <dossier-des-deux-PDF-DGBF>
```

`--pr29` nécessite le SHA contrôlé dans les objets Git locaux ; il reproduit le défaut en mémoire et écrit uniquement les pièces d'audit. `--pdf-dir` exige les empreintes originales et préserve les contrôles DGMP relus séparément. Les PDF ne sont pas embarqués dans Git. `--capture` renouvelle volontairement le snapshot public avec la clé anon locale : GET uniquement, projet fixé, aucun service_role ; ne pas l'utiliser pour remplacer silencieusement une baseline déjà revue.

Validation locale de la branche : **370 tests / 21 fichiers PASS**, dont **12 tests d'audit**. TypeScript et build : voir le checkpoint final ci-dessous. La CI de PR #29 reste distincte de la CI de la nouvelle PR d'audit ; les résultats historiques ne sont pas reportés comme tests de la branche d'audit.

Lectures réelles anon : local_budgets 3, administrative_accounts 1, ca_financial_lines 8, opérations 3, DGMP 3, institutions 4 (champs financiers null), projects 0. Deux relations protégées (`budget_lines`, `budget_revenue_sources`) répondent 401/42501 ; aucun privilège contourné. Capture distante nettoyée, aucune clé, aucun rôle de profil ou contact privé dans les pièces. Il s'agit d'un contrôle ciblé de la frontière publique, pas d'un nouvel audit RLS complet. Écritures distantes et migrations appliquées : **0**.

Navigateur Chromium réel, profil neuf, requêtes autres que GET/HEAD bloquées : accueil, ministères, mairies, projets, observatoire, cinq HTTP 200, aucune erreur JavaScript collectée. Les montants observés sont conservés dans `browser-observations.json`. Aucune interface modifiée ; aucune nouvelle déclaration UX/UI VALIDATED ou validation responsive générale.

## 5. Plan de correction sans duplication

| Lot | Priorité / propriétaire fonctionnel | Périmètre et sortie vérifiable |
|---|---|---|
| A | P1 — domaine review de #29 | Relier les exports/compositions à la décision financière stricte ; corriger PLANNED/ORDERED ; tests négatifs aux frontières puis relancer le navigateur après correction de `assert`. Ne pas mêler de corrections de données publiques à cette PR. |
| B | P1 — affichage ministériel | Traiter les 14 IDs MISMATCH à partir des sources identifiées ; conserver les 7 périmètres non comparables séparés. Réutiliser le registre documentaire existant ; ne pas publier automatiquement les ministères VERIFIED/STAGED. |
| C | P1 — agrégats publics | Unifier les populations, années, bases et formules de l'accueil, annuaire, observatoire, rapports et SEO. Corriger les littéraux contradictoires seulement avec une définition sourcée ; jamais sommer budgets et coûts de projets déjà inclus. |
| D | P1 documentaire — CA/DGMP | Obtenir le CA Tiassalé et résoudre l'événement double AO/lot ; rattacher chaque montant à sa page. Deux attributions sont exactes dans le présent audit, mais cela n'autorise ni une réécriture CA ni une inférence physique. |
| E | P2 — budgets locaux | Obtenir les originaux pour les quatre différences arithmétiques et traiter les précisions ; aucun calcul de ventilation manquante, aucun réimport de Bingerville. |
| F | P2 — couverture restante | Traiter les observations restantes de l'inventaire par source et périmètre, en commençant par les pages les plus consultées. Rapprocher les lignes legacy des programmes/actions identifiés ; exclure les cas ambigus et conserver l'historique. |

Les lots A à F sont un plan de correction, pas des changements effectués dans cette branche. Les manques documentaires sont des prérequis à la certification des observations concernées, sans bloquer artificiellement toute l'application.

## 6. Checkpoint de livraison

Le commit de cette branche, la nouvelle PR d'audit et son HEAD constituent le checkpoint GitHub ; ne fusionner ni cette PR ni #29 dans le cadre de cette mission. Les fichiers métier, sources canoniques, schéma et migrations sont intacts. `docs/AGENT_HANDOFF.md` et `docs/CODEX_CHECKPOINT.md` portent la reprise opérationnelle ; l'identité du commit est celle de la PR pour éviter une boucle de commits contenant leur propre hash.

État final local : 370 tests / 21 fichiers PASS ; TypeScript `--noEmit` PASS ; build production PASS, 1 737 modules. Seul avertissement : taille des bundles de données, préexistante. Aucun changement de code runtime, dépendance ou lockfile. Le contrôle final de la CI est associé au HEAD poussé de la nouvelle PR, distinct de #29.
