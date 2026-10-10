# PR #31 — Rapport de clôture du contrôle documentaire 2026

> **Mise à jour du 10 octobre 2026 — postérieure au rapport ci-dessous :** six montants du répertoire applicatif `src/data/governmentData.ts` ont été alignés sur leurs référentiels canoniques CP 2026 (gov-005, gov-018, gov-025, gov-031, gov-032, gov-034). Le rapport initial ci-dessous conserve l'historique des 15 écarts *avant correction*. Neuf écarts numériques demeurent : gov-001, gov-006, gov-009, gov-011, gov-012, gov-013, gov-014, gov-022, gov-029. Les correspondances administratives de périmètre et les situations composites ne sont pas certifiées automatiquement. Aucune fusion ni modification Supabase.


**Contrôle complémentaire du 10 octobre 2026 :** `gov-035` ne présente plus de dotation autonome sur sa fiche publique : le montant identique à l'Agriculture (gov-009) a été supprimé de `governmentData.ts` pour éviter une double attribution. L'ancienne valeur demeure exclusivement dans le CSV d'audit sous le statut `HISTORICAL_VALUE_ONLY`. Absence de montant individualisé = inconnu, jamais zéro. Les neuf écarts encore ouverts ne doivent pas être qualifiés de réconciliés sur la seule base des crédits de section candidate.

## Décision de clôture de sûreté de publication — 10 octobre 2026

Le contrôle de provenance dans le dépôt n'a pas établi une justification indépendante des neuf valeurs historiques divergentes du répertoire (gov-001, gov-006, gov-009, gov-011, gov-012, gov-013, gov-014, gov-022, gov-029). Elles sont **conservées dans le CSV d'audit**, mais ne sont plus attribuées à ces portefeuilles dans `src/data/governmentData.ts`. Il en va de même pour la dotation dupliquée du portefeuille délégué `gov-035`.

La fiche affiche **montant à confirmer**, accompagné pour les neuf sections candidates du **montant CP de la section**, clairement séparé de la dotation propre au portefeuille. Aucun de ces neuf CP n'est une certification de l'attribution administrative exacte. Il ne faut pas sommer les montants de la section et de la fiche.

Cela clôt la **suppression des attributions non justifiées dans le répertoire statique**, pas la réconciliation intégrale des 35 portefeuilles. Dix portefeuilles n'ont plus de budget indépendant affiché et l'origine historique des neuf valeurs reste inconnue. Pour lever ces réserves, il faut une pièce établissant la chaîne `portefeuille → section(s) → programmes → CP`, ainsi que le traitement des crédits communs et des ministres délégués.

**Périmètre de la décision :** fichiers GitHub de la branche PR #31 uniquement ; aucune écriture Supabase, aucune fusion ni déploiement demandé. Une donnée provenant d'une autre source de l'application doit faire l'objet d'un contrôle distinct.

**Périmètre :** rapprochement du registre applicatif des 35 portefeuilles gouvernementaux et des sections candidates de la Loi de finances initiale 2026. Ce rapport ne constitue **pas** une certification des 35 fiches. Il constitue la clôture du contrôle technique et de la qualification des écarts, avec les points non résolus explicitement conservés.

## Sources et méthode

- LFI 2026, tableaux de crédits **AE et CP**, sections et programmes (pages PDF 45–54), exploitée dans les lots documentaires antérieurs.
- Annexe 4 DPPD-PAP 2026–2028, contre-vérification des totaux CP pour les sections de programmes.
- Annexe 7, **dotations directement gérées par les institutions**, non assimilables mécaniquement aux crédits totaux de section.
- Registre audité : `pr31_ministry_reconciliation_register.csv`, repris du lot 6 et rapproché sans divergence aux 35 `budget_fcfa` de `src/data/governmentData.ts` au commit `625513001e473a02a744c6dcb842f8ef90bb96d3`.
- Les preuves des lots antérieurs portent sur le snapshot GitHub `master` `707b3b688f23bd33dc0f3504e13b79c65908dd50`. Les libellés et montants du registre ont été contrôlés par rapport au code de la PR lors de son import ; cela ne représente pas un audit de l'exécution de l'application en production.

## Résultat contrôlé sur 35 fiches

| État documentaire | Nombre | Décision |
|---|---:|---|
| Égalité numérique de section candidate | 15 | **Ne pas qualifier automatiquement de certifié** ; preuve d'identité du portefeuille et provenance requise |
| Écart numérique de section candidate | 15 | **Ne pas modifier le montant** avant détermination de son périmètre |
| Portefeuille composite | 4 | **Ne pas sommer les sections** ; afficher un avertissement explicite |
| Sans section autonome identifiée | 1 | **Ne pas réutiliser la dotation d'un autre portefeuille** |

Une concordance exacte **n'est pas** une preuve de correspondance administrative ; une différence **n'est pas** nécessairement une anomalie de gestion. Les chiffres ci-dessous comparent des quantités de périmètre non encore certifié.

## Liste exhaustive des 15 différences (FCFA)

| Fiche | Section candidate | Registre GitHub | CP LFI de section | Différence GitHub − CP | Page PDF LFI |
|---|---:|---:|---:|---:|---:|
| `gov-001` | 108 | 73 426 766 299 | 71 326 766 299 | +2 100 000 000 | 45 |
| `gov-005` | 325 | 135 902 157 171 | 129 151 307 791 | +6 750 849 380 | 48 |
| `gov-006` | 323 | 947 962 959 206 | 945 963 329 452 | +1 999 629 754 | 48 |
| `gov-009` | 229 | 337 932 332 542 | 333 878 089 526 | +4 054 243 016 | 47 |
| `gov-011` | 366 | 504 985 369 765 | 502 893 150 963 | +2 092 218 802 | 53 |
| `gov-012` | 357 | 88 949 349 037 | 81 484 195 624 | +7 465 153 413 | 52 |
| `gov-013` | 335 | 817 868 452 462 | 808 992 158 914 | +8 876 293 548 | 49 |
| `gov-014` | 358 | 131 771 209 724 | 123 247 714 398 | +8 523 495 326 | 52 |
| `gov-018` | 345 | 106 197 582 643 | 103 197 582 643 | +3 000 000 000 | 50 |
| `gov-022` | 333 | 344 706 305 890 | 338 779 408 246 | +5 926 897 644 | 49 |
| `gov-025` | 330 | 734 443 144 925 | 734 442 904 943 | +239 982 | 49 |
| `gov-029` | 346 | 39 771 854 976 | 37 598 620 420 | +2 173 234 556 | 50 |
| `gov-031` | 343 | 37 734 566 044 | 36 680 067 253 | +1 054 498 791 | 50 |
| `gov-032` | 440 | 13 192 865 872 | 13 746 365 872 | -553 500 000 | 54 |
| `gov-034` | 334 | 182 297 493 094 | 182 301 855 312 | -4 362 218 | 49 |

**Décision sur les 15 écarts :** conserver les valeurs existantes avec mention de périmètre non réconcilié ; aucune substitution silencieuse. Pour chaque ligne, une correction chiffrée exige une preuve liant l'identité de la fiche à l'assiette exacte des CP de la section.

## Cas composites et chevauchements

- `gov-007` — MINISTÈRE DE L'ÉCONOMIE, DES FINANCES ET DU BUDGET : sections candidates **322+328**. LFI section 322 appears in PROGRAMMES and DOTATIONS; cannot collapse
- `gov-010` — MINISTÈRE DES TRANSPORTS ET DES AFFAIRES MARITIMES : sections candidates **340+440**. KEEP_CURRENT_VALUE_FOR_SECTION_340_ONLY; separate maritime delegate section 440, avoid aggregation
- `gov-023` — MINISTÈRE DE L'EMPLOI, DE LA PROTECTION SOCIALE ET DE LA FORMATION PROFESSIONNELLE : sections candidates **362+334**. KEEP_CURRENT_VALUE_FOR_SECTION_362_ONLY; section 334 is separate, no implicit allocation
- `gov-024` — MINISTÈRE DE L'ÉDUCATION NATIONALE, DE L'ALPHABÉTISATION ET DE L'ENSEIGNEMENT TECHNIQUE : sections candidates **331+334**. NO_AMOUNT_CHANGE: resolve section-to-portfolio allocation before comparison
- `gov-035` — MINISTÈRE DÉLÉGUÉ CHARGÉ DES PRODUCTIONS VIVRIÈRES : sections candidates **aucune section autonome**. Agriculture gov-009 and delegated gov-035 share exactly 337932332542 FCFA

Pour `gov-009` / `gov-035`, le montant du registre est identique (**337 932 332 542 FCFA**). Cette égalité n'autorise pas à le publier comme deux dotations additionnables.

## Règles financières impératives

1. **CP (crédits de paiement)** : une colonne propre à la LFI ; ne pas substituer automatiquement AE.
2. **AE (autorisations d'engagement)** : indicateur distinct, même lorsque AE et CP coïncident sur une ligne.
3. **Crédit total de section** : ne doit pas être confondu avec les **dotations directement gérées** figurant à l'Annexe 7.
4. **Exécution** : non déductible de l'inscription budgétaire LFI, de l'Annexe 4 ou de l'Annexe 7 ; nécessite une source d'exécution spécifique.
5. **Inconnu ≠ zéro** ; une ventilation fonctionnement/investissement ne peut former un 100 % que lorsque les composantes additionnées égalent exactement le total.

## Vérifications du code appliquées dans la PR #31

- Suppression des fausses lignes Cour suprême et des pourcentages sans composantes réconciliées.
- Références juridictionnelles de la LFI 2026 rectifiées : sections **114** (Cour de cassation), **118** (Conseil d'État), **115** (Cour des comptes).
- Présentation publique des budgets ministériels comme « montant à vérifier », sans certification implicite des portefeuilles hors pilote.
- Messages spécifiques pour `gov-007`, `gov-010`, `gov-023`, `gov-024`, `gov-035` et tests de protection contre le double comptage.
- Absence de modification des 35 montants `governmentData.ts`.

## Verdict et conditions de levée des réserves

**Contrôle technique :** accepter uniquement lorsque la CI du dernier commit est verte.

**Clôture documentaire des comparaisons :** matrice complète, risques qualifiés, 15 écarts non expliqués et 5 cas spéciaux signalés.

**Certification financière des fiches : NON ACQUISE.** Elle nécessitera, ligne par ligne, preuve de correspondance portefeuille–section et du type de crédit ; les sources actuelles ne suffisent pas pour une attribution automatique des 15 écarts. Ne pas annoncer « 35 fiches certifiées », ne pas fusionner à ce seul titre.

**Actions de production interdites dans cette intervention :** merge, migration ou écriture Supabase, déploiement intentionnel.
