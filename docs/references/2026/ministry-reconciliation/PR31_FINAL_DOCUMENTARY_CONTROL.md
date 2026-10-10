# PR #31 — Rapport de clôture du contrôle documentaire 2026

> **Mise à jour du 10 octobre 2026 — postérieure au rapport ci-dessous :** six montants du répertoire applicatif `src/data/governmentData.ts` ont été alignés sur leurs référentiels canoniques CP 2026 (gov-005, gov-018, gov-025, gov-031, gov-032, gov-034). Le rapport initial ci-dessous conserve l'historique des 15 écarts *avant correction*. Neuf écarts numériques demeurent : gov-001, gov-006, gov-009, gov-011, gov-012, gov-013, gov-014, gov-022, gov-029. Les correspondances administratives de périmètre et les situations composites ne sont pas certifiées automatiquement. Aucune fusion ni modification Supabase.


**Contrôle complémentaire du 10 octobre 2026 :** `gov-035` ne présente plus de dotation autonome sur sa fiche publique : le montant identique à l'Agriculture (gov-009) a été supprimé de `governmentData.ts` pour éviter une double attribution. L'ancienne valeur demeure exclusivement dans le CSV d'audit sous le statut `HISTORICAL_VALUE_ONLY`. Absence de montant individualisé = inconnu, jamais zéro. Les neuf écarts encore ouverts ne doivent pas être qualifiés de réconciliés sur la seule base des crédits de section candidate.

## Décision de clôture de sûreté de publication — 10 octobre 2026

Le contrôle de provenance dans le dépôt n'a pas établi une justification indépendante des neuf valeurs historiques divergentes du répertoire (gov-001, gov-006, gov-009, gov-011, gov-012, gov-013, gov-014, gov-022, gov-029). Elles sont **conservées dans le CSV d'audit**, mais ne sont plus attribuées à ces portefeuilles dans `src/data/governmentData.ts`. Il en va de même pour la dotation dupliquée du portefeuille délégué `gov-035`.

La fiche affiche **montant à confirmer**, accompagné pour les neuf sections candidates du **montant CP de la section**, clairement séparé de la dotation propre au portefeuille. Aucun de ces neuf CP n'est une certification de l'attribution administrative exacte. Il ne faut pas sommer les montants de la section et de la fiche.

Cela clôt la **suppression des attributions non justifiées dans le répertoire statique**, pas la réconciliation intégrale des 35 portefeuilles. Dix portefeuilles n'ont plus de budget indépendant affiché et l'origine historique des neuf valeurs reste inconnue. Pour lever ces réserves, il faut une pièce établissant la chaîne `portefeuille → section(s) → programmes → CP`, ainsi que le traitement des crédits communs et des ministres délégués.

**Périmètre de la décision :** fichiers GitHub de la branche PR #31 uniquement ; aucune écriture Supabase, aucune fusion ni déploiement demandé. Une donnée provenant d'une autre source de l'application doit faire l'objet d'un contrôle distinct.

## Contrôle des attributions administratives post-LFI — décret du 4 mars 2026

**Source nouvelle et officielle :** annexe au décret n° **2026-84 du 4 mars 2026** portant attributions des membres du Gouvernement, publiée par `gouv.ci` : https://www.gouv.ci/uploads/publications/177580607447.pdf.

**35/35 portefeuilles** sont reliés à une page de leur tutelle ou de leurs structures rattachées dans `DECREE_2026_84_ADMINISTRATIVE_MAPPING_35.json` et dans `MINISTRY_DOCUMENTATION_REGISTRY_2026.json` ; l'interface expose la provenance. Trois rapprochements particulièrement instructifs :

- **gov-009/gov-035 — Agriculture / Productions vivrières (PDF p.4)** : Aderiz est placé sous la tutelle du ministre délégué, sans preuve de dotation budgétaire autonome au sein de la section LFI 229.
- **gov-010/gov-032 — Transports / Affaires maritimes (PDF p.5)** : l'ARSTM figure sous le ministre délégué chargé des Affaires maritimes, sans autorisation d'additionner les sections LFI 340 et 440.
- **gov-024/gov-034 — Éducation / Enseignement technique (PDF p.9)** : l'IPNETP et les centres de formation professionnelle figurent sous le ministre délégué, sans preuve d'un nouvel arrêté budgétaire transférant les CP entre sections 331/334.

**Conclusion sur les attributions :** les personnes publiques, organismes et autorités de tutelle peuvent maintenant être distingués par référence à une pièce administrative officielle de mars 2026. **Conclusion budgétaire :** le décret et son annexe n'établissent ni transfert de CP, ni collectif budgétaire, ni crédits exécutés. Le niveau `budget_portfolio_attribution` est donc explicitement *non établi* dans les 35 décisions de certification. Les 12 références canoniques restent contrôlées au niveau section-programmes-actions, 21 autres au niveau sommes d'actions et 2 dossiers comportent une exception.

Le répertoire de la **DGBF des lois de finances rectificatives**, consulté lors du contrôle, ne présentait pas de collectif 2026 : https://www.dgbf.ci/loi-de-finances-rectificative/ . **Cette consultation ne prouve pas l'inexistence d'un acte budgétaire non publié sur ce portail.** La demande ciblée dans `PR31_DGBF_DOCUMENTARY_CLARIFICATION_REQUEST_DRAFT.md` réclame seulement les éventuelles pièces de répartition ou de transfert réellement nécessaires à une certification par portefeuille.

**Décision :** certification des *attributions administratives* documentée ; **certification intégrale des CP par portefeuille non acquise**. Aucun montant supplémentaire imputé ou certifié par déduction du décret.

## Contrôle indépendant additionnel — sections, programmes et actions (10 octobre 2026)

Les **PDF originaux fournis par le porteur du projet** ont été relus et leurs empreintes SHA-256 enregistrées :
- LFI 2026 : récapitulatif officiel sections/programmes, pages physiques PDF 45–54.
- Annexe 4 DPPD-PAP 2026–2028 : pages physiques PDF 27–1178 selon les sections.

Un **nouveau registre source-contrôlé** couvre les **22 sections distinctes des 23 portefeuilles précédemment sans référentiel canonique** : 112 programmes ; somme des CP programme = CP de section pour 22/22 ; les 112 montants de programme sont retrouvés numériquement dans l'Annexe 4. **340 actions distinctes** ont été identifiées dans les Tableaux 7 ; **108/112 programmes** ont une somme des actions 2026 exactement égale à leur CP programme.

Quatre exceptions explicites : **section 108** (dotations 13010, 13011, 13013, sans tableau détaillé d'actions correspondant) et **section 352 / programme 22121**, dont le total 2026 est confirmé par le Tableau 6 de l'Annexe 4 (page PDF 906) mais le Tableau 7 (pages PDF 907–909) reproduit le programme 22120 au lieu de fournir le détail sous le code 22121. Voir `PR31_SOURCE_GAP_SECTION_352_PROGRAM_22121.md`.

**Restent non certifiées :** l'attribution juridique et administrative des crédits votés en décembre 2025 aux portefeuilles du Gouvernement nommé en janvier 2026, les périmètres partagés, la ventilation des quatre exceptions et toute donnée d'exécution. Le décret n°2026-08 du 23 janvier 2026 portant nomination des membres du Gouvernement est publié par la Présidence : https://www.presidence.ci/communiques-presidence/communique-de-la-presidence-de-la-republique-8/ . Le décret de nomination n'est pas une preuve de transfert ou de répartition de crédits budgétaires.

**Preuves GitHub :** `SECTION_PROGRAM_CROSSCHECK_22_2026.json`, `ANNEX4_ACTION_SUM_CROSSCHECK_2026.json`, `PR31_CERTIFICATION_EVIDENCE_MATRIX_35.md` et `scripts/verify_ministry_section_pdfs.py`. Aucun montant inconnu n'a été inventé. La publication de montants par portefeuille non attribuables reste bloquée.

## Complément de source déterminant — Financements C2D et quatre actions (10 octobre 2026)

La LFI 2026 n'a pas seulement le récapitulatif des crédits par section (PDF p.45–54). Elle contient aussi le **« Détail des Projets Financés sur C2D » (PDF p.565–569)**, avec **14 sections et un total national de 74 400 000 000 FCFA**. Ce montant est confirmé par le Rapport de présentation officiel du budget 2026 (projets C2D compris dans les investissements financés sur ressources intérieures).

La comparaison de ce tableau avec les **15 valeurs historiques divergentes** initialement enregistrées dans `governmentData.ts` et conservées dans l'audit révèle :
- **9 écarts exactement égaux au C2D de leur section** : gov-001, gov-005, gov-009, gov-012, gov-014, gov-018, gov-022, gov-029, gov-031. Ces neuf anciennes différences ont donc une **explication documentaire numérique démontrée** (et ne doivent plus être qualifiées de montants inventés ou arbitraires).
- **3 écarts partiellement expliqués par C2D** : gov-006 (**−370 246 FCFA** résiduels par rapport à CP section + C2D), gov-011 (**+481 394 FCFA**), gov-013 (**+283 456 FCFA**). Ces trois résidus **restent non justifiés**.
- **3 écarts non explicables par le tableau C2D** : gov-025 (**+239 982 FCFA**), gov-032 (**−553 500 000 FCFA**), gov-034 (**−4 362 218 FCFA**).
- Sur ce total de 15 écarts historiques, **neuf ont une provenance numérique exacte** ; **six demeurent arithmétiquement non expliqués** par le C2D. Les décisions antérieures de remplacer certaines anciennes valeurs par les seuls CP de section étaient des précautions de publication, pas une preuve que le financement C2D était erroné. Les sommes CP de section + C2D ne deviennent pas pour autant automatiquement les dotations autonomes des portefeuilles gouvernementaux.

**Sources / reproductibilité :** `PR31_C2D_2026_DISCREPANCY_PROVENANCE.json`, `scripts/verify_ministry_c2d_2026.py`, SHA-256 exact du PDF LFI.

**Autres lacunes d'actions résolues :** le **détail budgétaire de la LFI elle-même** (p.83–84 et 502–503) donne les cinq actions manquantes aux quatre programmes qui n'étaient pas détaillés sous leur code dans l'Annexe 4 : `1301001` (24 053 045 398), `1301101` (2 155 227 371), `1301301` (45 118 493 530), `2212101` (5 304 391 059) et `2212102` (2 748 545 000 FCFA). Leurs quatre sommes programme correspondent exactement à la LFI. **112/112 programmes disposent maintenant de sommes d'actions justifiées par source officielle** (108 programmes/340 actions dans l'Annexe 4 ; 4 programmes/5 actions supplémentaires dans le détail LFI). L'absence de ces actions dans le Tableau 7 de l'Annexe 4 reste un problème de cohérence éditoriale du tirage, non une lacune financière empêchant ce rapprochement.

**Certification financière sans réserve par portefeuille : toujours NON ACQUISE.** Les documents présents permettent la certification numérique de la présentation des sections et programmes mais ne prouvent pas tous les actes de transfert/répartition de CP entre portefeuilles de janvier 2026. Ce dernier sujet ne doit pas être éludé par l'égalité arithmétique ou le décret d'attributions.

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
