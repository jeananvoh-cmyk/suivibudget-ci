# PR #31 — Traçage de quatre écarts jusqu'aux référentiels canoniques

Date de contrôle : 2026-10-10. Lecture des fichiers déjà présents sur la branche PR #31. **Aucun montant modifié.**

Ce contrôle complète le registre des 35 portefeuilles. Il établit la différence entre un total de section **documenté et arithmétiquement réconcilié** dans le référentiel canonique et le montant **encore présenté par le répertoire applicatif**. Une réconciliation interne du référentiel ne démontre pas, à elle seule, pourquoi le répertoire porte un autre montant.

| Fiche | Section | Montant répertoire (FCFA) | Total section canonique CP (FCFA) | Écart répertoire − canonique (FCFA) | Preuve canonique |
|---|---|---:|---:|---:|---|
| gov-005 Justice | 325 | 135 902 157 171 | 129 151 307 791 | +6 750 849 380 | `ministry-justice-human-rights/MJDH_CANONICAL_BUDGET_2026.json` |
| gov-025 Équipement et entretien routier | 330 | 734 443 144 925 | 734 442 904 943 | +239 982 | `ministry-equipment-road-maintenance/MEER_CANONICAL_BUDGET_2026.json` |
| gov-031 Environnement | 343 | 37 734 566 044 | 36 680 067 253 | +1 054 498 791 | `ministry-environment-ecological-transition/MINEDDTE_CANONICAL_BUDGET_2026.json` |
| gov-018 Eaux et forêts | 345 | 106 197 582 643 | 103 197 582 643 | +3 000 000 000 | `ministry-water-forests/MINEF_CANONICAL_BUDGET_2026.json` |

Tous les fichiers canoniques cités se trouvent sous `docs/references/2026/` et contiennent `totals.total_ministry_2026_fcfa`, `programs_sum_2026_fcfa`, `actions_sum_2026_fcfa`, ainsi que les deux deltas égaux à zéro. Les valeurs du répertoire et la classification proviennent de `docs/references/2026/ministry-reconciliation/pr31_ministry_reconciliation_register.csv`.

## Localisation de la preuve officielle DPPD-PAP (Annexe 4)
- **Justice** : PDF pp. 367–390, document pp. 365–388.
- **Équipement et entretien routier** : PDF pp. 421–444, document pp. 419–442.
- **Environnement** : PDF pp. 679–698, document pp. 677–696.
- **Eaux et forêts** : PDF pp. 699–728, document pp. 697–726.

## Décision

**Quatre écarts sur quinze disposent maintenant d'un renvoi nominatif explicite vers un fichier canonique détaillé déjà réconcilié** : ce sont des **écarts inter-registres confirmés**, pas quatre corrections budgétaires certifiées.

- Ne pas remplacer automatiquement `budget_fcfa` dans `src/data/governmentData.ts` : sa provenance et son périmètre historiques restent à tracer.
- Distinguer dans l'interface le montant du répertoire et les CP votés de la section lorsque l'identité budgétaire est confirmée.
- Ne pas additionner les deux chiffres et ne pas qualifier le différentiel de dépense irrégulière ou d'exécution.
- Vérifier la provenance de chaque ancien montant pour décider s'il représente un autre périmètre, une valeur antérieure ou une erreur de transcription.
- Garder les onze autres écarts du registre initial ouverts ; aucune conclusion supplémentaire sans source.

Les fichiers canoniques sont des extractions structurées précédemment conservées dans GitHub. Ce contrôle compare les deux jeux de données présents dans le dépôt, **sans prétendre avoir relu à nouveau chaque page du PDF d'origine lors de cette intervention**.
