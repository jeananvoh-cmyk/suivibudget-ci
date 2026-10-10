# PR #31 — Matrice de preuves budgétaires 2026 pour les 35 portefeuilles

## Contrôle juridique des crédits initialement votés et clôture du balayage des quatre résidus

Les **articles 14 et 15 de la LFI 2026** fournissent la **base légale du CP voté pour les 34 sections distinctes** correspondant aux 35 fiches : art. 14 p.12 pour la **Primature (section 108)** ; art. 15 p.14–20 pour les autres ministères. Le ministre délégué `gov-035` partage la section 229 avec l'Agriculture : **34 enveloppes de section, pas 35 budgets autonomes**. Vérification unitaire du total de chaque section dans le PDF original, sans utiliser les données applicatives comme seul justificatif. Registre : `LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json`, source officielle hashée par SHA-256.

Cela établit une **certification documentaire des crédits initiaux votés par section**, sans jamais démontrer que le cabinet remanié en janvier 2026 possède exactement ces mêmes dotations autonomes, ni qu'un transfert ultérieur existe. La **certification sans réserve des 35 portefeuilles actuels** demeure bloquée par cette correspondance juridique.

Les quatre reliquats historiques `gov-006, gov-011, gov-013, gov-025` ont été recalculés au FCFA près contre CP votés et volet C2D. La recherche d'une valeur numérique autonome identique aux reliquats dans les **1 901 pages des trois PDF** (LFI : 583, Annexe 4 : 1 229, Annexe 7 : 89) ne trouve pas de valeur directement identique. Le **contrôle négatif de texte n'est pas une preuve d'erreur du document public** ; il ne démontre pas non plus la provenance des valeurs inscrites auparavant dans l'application. Preuve structurée et historique : `PR31_FOUR_UNEXPLAINED_LEGACY_RESIDUALS_2026.json`.


## Complément de certification numérique du 10 octobre 2026

La LFI 2026 présente aussi un **tableau distinct des financements C2D (PDF p.565–569)** : **14 sections, 74 400 000 000 FCFA**. Le registre `PR31_C2D_2026_DISCREPANCY_PROVENANCE.json` réconcilie les **15 anciennes différences** avec ce volet de financement : **9 différences exactes**, **3 proches avec résidus de −370 246 / +481 394 / +283 456 FCFA**, **3 sans ligne C2D correspondante**. La coïncidence numérique n'est pas une attribution juridique d'un CP additionnel et ne justifie aucune double comptabilisation.

Les quatre programmes initialement sans actions de l'Annexe 4 sont complétés par le **détail LFI officiel** : trois actions de la Primature (LFI pages PDF 83–84), deux actions du programme 22121 (PDF p.502–503). Les **112 programmes / 112 sont maintenant numériquement réconciliés au niveau action** : 108 programmes / 340 actions via Annexe 4 et 4 programmes / 5 actions via LFI. Deux limites demeurent indépendantes : le Tableau 7 de l'Annexe 4 reste incomplet pour le programme 22121, et les transferts/réaffectations budgétaires postérieurs à la LFI ne sont pas documentés de façon suffisante pour certifier les 35 **dotations autonomes par portefeuille**.


**Date :** 10 octobre 2026. **Statut global : certification intégrale non acquise.**
Cette matrice documente les preuves disponibles au niveau des **sections et des programmes**, sans confondre l'appartenance à une section LFI avec l'allocation budgétaire d'un portefeuille gouvernemental postérieur.

## Résultat documentaire réel

- **35/35 portefeuilles cartographiés**, 34 sections distinctes considérées (une section 229 partagée par gov-009 et gov-035).
- **12** référentiels canoniques avec sommes des programmes et des actions réconciliées (contrôles antérieurs).
- **22** sections jusqu'alors sans référentiel canonique : total LFI CP et **112** lignes de programmes vérifiés numériquement dans le PDF LFI 2026 et l'Annexe 4 2026-2028, par relevé indépendant (delta = 0 pour les 22).
- **1** identifiant de programme de l'Annexe 4 non retrouvé littéralement : section 352, code 22121 ; le montant 2026 et l'intitulé du programme sont présents à la page PDF 906.
- **340 actions distinctes extraites du Tableau 7 de l'Annexe 4**, permettant de réconcilier exactement **108 des 112 programmes** (somme des actions = CP programme). **20 des 22 sections** disposent d'une réconciliation complète programmes/actions ; la section 108 correspond à une structure de dotations particulières sans actions identifiées et la section 352 contient le programme 22121 non détaillé sous son code dans le Tableau 7.
- Les **21 portefeuilles couverts par ces 20 sections** incluent les deux fiches partageant la section 229 : le nombre de portefeuilles ne doit pas être confondu avec le nombre de budgets indépendants.
- **9 anciennes valeurs divergentes** mises à l'écart de l'affichage du répertoire public ; conservées en historique dans `pr31_ministry_reconciliation_register.csv`.
- **Aucun montant autonome attribué** au ministère délégué `gov-035`.
- Ces résultats **ne constituent pas une certification sans réserve des 35 portefeuilles**, ni une information sur les crédits exécutés.

## Matrice par portefeuille

| Fiche | Portefeuille | Section LFI | CP section / référence FCFA | Niveau prouvé | Réserve pour certification |
|---|---|---:|---:|---|---|
| gov-001 | PRIMATURE | 108 | 71 326 766 299 | Section et programmes vérifiés (Annexe 4) | Section 108 : services rattachés et cabinet ; allocation à préciser |
| gov-002 | MINISTÈRE DE LA DÉFENSE | 226 | 481 041 827 995 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-003 | MINISTÈRE D'ÉTAT, MINISTÈRE DE LA FONCTION PUBLIQUE | 237 | 45 121 940 916 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-004 | MINISTÈRE D'ÉTAT, MINISTÈRE DES AFFAIRES ÉTRANGÈRES | 321 | 146 728 395 147 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-005 | MINISTÈRE DE LA JUSTICE ET DES DROITS DE L'HOMME | 325 | 129 151 307 791 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-006 | MINISTÈRE DE L'INTÉRIEUR ET DE LA SÉCURITÉ | 323 | 945 963 329 452 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-007 | MINISTÈRE DE L'ÉCONOMIE, DES FINANCES ET DU BUDGET | 322 | 671 323 963 425 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Section 322 programmes ≠ rubrique dotations 322 ; portefeuille composite |
| gov-008 | MINISTÈRE DES MINES, DU PÉTROLE ET DE L'ÉNERGIE | 348 | 706 060 209 015 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-009 | MINISTÈRE DE L'AGRICULTURE, DU DÉVELOPPEMENT RURAL ET DES PRODUCTIONS VIVRIÈRES | 229 | 333 878 089 526 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Section 229 partagée avec gov-035 |
| gov-010 | MINISTÈRE DES TRANSPORTS ET DES AFFAIRES MARITIMES | 340 | 307 769 615 082 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | 340 ne comprend pas automatiquement 440 |
| gov-011 | MINISTÈRE DE L'HYDRAULIQUE, DE L'ASSAINISSEMENT ET DE LA SALUBRITÉ | 366 | 502 893 150 963 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-012 | MINISTÈRE DE LA PROMOTION DE LA JEUNESSE, DE L'INSERTION PROFESSIONNELLE ET DU SERVICE CIVIQUE | 357 | 81 484 195 624 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-013 | MINISTÈRE DE LA SANTÉ, DE L'HYGIÈNE PUBLIQUE ET DE LA COUVERTURE MALADIE UNIVERSELLE | 335 | 808 992 158 914 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-014 | MINISTÈRE DE L'URBANISME, DU LOGEMENT ET DU CADRE DE VIE | 358 | 123 247 714 398 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-015 | MINISTÈRE DES RESSOURCES ANIMALES ET HALIEUTIQUES | 351 | 26 700 912 028 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-016 | MINISTÈRE DU PORTEFEUILLE DE L'ÉTAT ET DES ENTREPRISES PUBLIQUES | 376 | 49 213 125 398 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-017 | MINISTÈRE DE LA COMMUNICATION | 336 | 39 806 735 298 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-018 | MINISTÈRE DES EAUX ET FORÊTS | 345 | 103 197 582 643 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-019 | MINISTÈRE DU COMMERCE, DE L'INDUSTRIE ET DE L'ARTISANAT | 347 | 96 866 871 722 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-020 | MINISTÈRE DU TOURISME ET DES LOISIRS | 350 | 19 207 286 052 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-021 | MINISTÈRE DU PLAN ET DU DÉVELOPPEMENT | 328 | 44 194 260 102 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-022 | MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE | 333 | 338 779 408 246 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-023 | MINISTÈRE DE L'EMPLOI, DE LA PROTECTION SOCIALE ET DE LA FORMATION PROFESSIONNELLE | 362 | 91 411 414 044 | Actions réconciliées (référentiel canonique) | 362 ne comprend pas automatiquement 334 |
| gov-024 | MINISTÈRE DE L'ÉDUCATION NATIONALE, DE L'ALPHABÉTISATION ET DE L'ENSEIGNEMENT TECHNIQUE | 331 | 1 563 721 366 602 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | 331 ne comprend pas automatiquement 334 |
| gov-025 | MINISTÈRE DES INFRASTRUCTURES ET DE L'ENTRETIEN ROUTIER | 330 | 734 442 904 943 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-026 | MINISTÈRE DE LA COHÉSION NATIONALE, DE LA SOLIDARITÉ ET DE LA LUTTE CONTRE LA PAUVRETÉ | 369 | 57 361 750 199 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-027 | MINISTÈRE DE LA TRANSITION NUMÉRIQUE ET DE L'INNOVATION TECHNOLOGIQUE | 356 | 83 275 503 595 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-028 | MINISTÈRE DE LA FEMME, DE LA FAMILLE ET DE L'ENFANT | 352 | 31 263 058 865 | Programmes vérifiés ; 3/4 sommes d’actions réconciliées | Code programme 22121 non retrouvé littéralement dans l’Annexe 4 |
| gov-029 | MINISTÈRE DE LA CULTURE ET DE LA FRANCOPHONIE | 346 | 37 598 620 420 | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Actions, exécution et périmètre du portefeuille à certifier |
| gov-030 | MINISTÈRE DES SPORTS | 444 | 70 427 777 385 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-031 | MINISTÈRE DE L'ENVIRONNEMENT ET DE LA TRANSITION ÉCOLOGIQUE | 343 | 36 680 067 253 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-032 | MINISTÈRE DÉLÉGUÉ CHARGÉ DES AFFAIRES MARITIMES | 440 | 13 746 365 872 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-033 | MINISTÈRE DÉLÉGUÉ CHARGÉ DE L'INTÉGRATION AFRICAINE | 439 | 5 122 516 889 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-034 | MINISTÈRE DÉLÉGUÉ CHARGÉ DE L'ENSEIGNEMENT TECHNIQUE | 334 | 182 301 855 312 | Actions réconciliées (référentiel canonique) | Correspondance portefeuille/section à certifier indépendamment |
| gov-035 | MINISTÈRE DÉLÉGUÉ CHARGÉ DES PRODUCTIONS VIVRIÈRES | 229 | Non individualisable (section partagée) | Sections, programmes et sommes d’actions vérifiés (Annexe 4) | Section 229 partagée : aucune dotation autonome établie |

## Actualisation des attributions du Gouvernement après la LFI

L'annexe officielle au **décret n° 2026-84 du 4 mars 2026** permet d'identifier la tutelle et les structures rattachées aux **35/35 portefeuilles actuels**. La matrice explicite des identifiants et numéros de pages est enregistrée dans `DECREE_2026_84_ADMINISTRATIVE_MAPPING_35.json` (source primaire : https://www.gouv.ci/uploads/publications/177580607447.pdf). La source est liée dans les 35 enregistrements du registre ministériel et dans les fiches.

Les cas à périmètre partagé sont mieux documentés administrativement :
- **Agriculture / Productions vivrières** : à la page PDF 4, le ministère délégué a notamment **Aderiz** comme structure rattachée, tandis que les structures agricoles générales sont listées sous le ministère principal. Ce partage de tutelle ne crée **aucune dotation autonome démontrée** dans la section 229.
- **Transports / Affaires maritimes** : page PDF 5, la délégation maritime est distincte et inclut **l'ARSTM** ; ne pas additionner automatiquement sections 340 et 440.
- **Éducation nationale / Enseignement technique** : page PDF 9, le ministre délégué est distinct et exerce la tutelle notamment sur **l'IPNETP** et les centres de formation professionnelle ; cela ne prouve aucun transfert de crédits entre les sections 331 et 334.
- **Finances/Budget / Plan** : l'annexe distingue leurs organismes de tutelle (pages PDF 3 et 7), mais pas les transferts comptables entre sections 322 et 328.

**Niveau de preuve acquis : tutelles et rattachements administratifs.** **Niveau de preuve non acquis : mouvements de crédits, enveloppes budgétaires individualisées après remaniement, exécution.** Ce document ne doit pas faire passer une compétence ministérielle pour un CP supplémentaire.

## Sources, fiabilité et méthode

- LFI 2026, récapitulatif par section et programme : **pages PDF 45–54**, crédits **CP 2026** distincts des AE (pour les lignes extraites, les valeurs AE et CP sont égales, sans les confondre conceptuellement).
- Annexe 4 DPPD-PAP 2026-2028, pages spécifiques stockées dans `SECTION_PROGRAM_CROSSCHECK_22_2026.json`. Les **112 valeurs numériques** sont présentes à la page citée de l'Annexe 4, et la somme des programmes LFI = CP section.
- Empreintes SHA-256 des **deux fichiers PDF utilisés**, incluses dans le JSON.
- Outil reproductible en lecture seule : `scripts/verify_ministry_section_pdfs.py`, à exécuter avec les deux PDF originaux. L'intégrité des PDF est vérifiée avant toute extraction ; le script reconstruit également les 340 actions et confirme les 108 sommes par programme.
- Source historique de l'application `governmentData.ts`, valeurs divergentes archivées dans le CSV de la PR.
- L'Annexe 7 décrit des dotations directement gérées par des **institutions** et ne doit pas remplacer mécaniquement le CP de section ministérielle.

## Critères documentaires restant non satisfaits

1. **Réconciliation automatique des actions déjà réalisée** pour 108 programmes / 340 actions. Reste : preuve du tableau d'actions absent pour les dotations de la section 108 (si applicable), détail du programme 22121 de la section 352, et revue qualitative des codes et intitulés d'activités/projets avant certification sans réserve.
2. Preuve des **correspondances administratives après remaniement** : certains intitulés de fiches gouvernementales 2026 ne correspondent pas parfaitement aux intitulés des sections votées en LFI. Une concordance numérique reste distincte de cette preuve.
3. Cas de sections **partagées ou composites** : `gov-007`, `gov-009/035`, `gov-010/032`, `gov-023/034`, `gov-024/034`, et particularités de `gov-001`.
4. Code de programme `22121` en section `352` : l'Annexe 4 justifie le montant et le titre mais ne fournit pas le code sous forme textuelle retrouvé lors du contrôle.
5. **Exécution** : aucune donnée d'exécution budgétaire ne doit être déduite de ces crédits votés.

**Décision :** accepter après CI verte les vérifications numériques de *sections, programmes et 108 rapprochements d'actions* sans confondre cette validation technique avec une certification administrative. Conserver le statut `DRAFT` des 23 dossiers non canoniques. Une certification intégrale ou publication automatique serait prématurée sans lever les réserves ci-dessus.

**Contraintes de cette intervention :** aucune fusion, aucune mutation Supabase, aucun déploiement intentionnel.
