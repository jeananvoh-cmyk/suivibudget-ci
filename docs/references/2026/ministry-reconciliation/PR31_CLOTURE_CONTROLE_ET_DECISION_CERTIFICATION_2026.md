# PR #31 — Décision finale de clôture documentaire des finances ministérielles 2026

**Contrôle indépendant :** 10 octobre 2026 — sur les trois PDF officiels conservés par le porteur du projet.  
**Statut de la PR :** ouverture maintenue, aucune fusion demandée.  
**Portée de la décision :** certifier uniquement les faits objectivement démontrables, sans créer un droit à certification des 35 portefeuilles gouvernementaux actuels.

## Décision 1 — Crédits de paiement initiaux votés : JUSTIFIÉS

La Loi de finances 2026 contient, dans sa **partie normative**, la liste des crédits votés :
- **Article 14, page PDF 12 :** dotations, dont la section **108 Primature**, **71 326 766 299 FCFA**.
- **Article 15, pages PDF 14–20 :** répartition des CP entre ministères et programmes, pour **33 autres sections distinctes** rattachées aux fiches actuelles.
- **34 sections uniques** pour les **35 fiches** du Gouvernement représentées dans SuiviBudget : **gov-009** et **gov-035** désignent la même section **229** (Agriculture) ; ce sont **une seule section votée**, non deux budgets autonomes.

**Contrôle local sur le PDF original et non sur la seule base des JSON :** pour chacune des 34 sections distinctes, la ligne du montant exact a été retrouvée **une fois et une seule** à la page attribuée dans la partie normative ; **34/34 montants concordants**. Empreinte SHA-256 du PDF : `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76`. Référentiel versionné : `LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json`.

**Conclusion certifiable :** « Le montant de CP initialement voté pour la section budgétaire LFI 2026 est documenté ». Il ne faut pas le convertir automatiquement en « budget autonome du ministère du Gouvernement de janvier 2026 ».

## Décision 2 — Rapprochement numérique des programmes et actions : JUSTIFIÉ SUR LE PÉRIMÈTRE EXTRAIT

- **12** référentiels canoniques existants, avec rapprochements programmes/actions déjà vérifiés dans les tests du dépôt.
- Pour les **22 autres sections uniques / 23 fiches**, **112 programmes** et leurs totaux 2026. **108 programmes / 340 actions** vérifiés dans l'Annexe 4 ; **4 programmes / 5 actions** sont complétés dans la LFI PDF p.83–84, 502–503.
- **112/112 programmes** de ce lot sont réconciliés au niveau des sommes d'actions. Le Tableau 7 de l'Annexe 4 comporte toujours une lacune éditoriale sous le code **22121**, mais la LFI documente précisément ses **deux actions**, totalisant **8 052 936 059 FCFA**.

**Conclusion certifiable :** intégrité numérique du périmètre **section → programme → action** pour les jeux de données et montants contrôlés. Cela ne certifie ni les activités/projets sous-jacents, ni les dépenses réalisées, ni l'attribution post-remaniement.

## Décision 3 — Projets C2D et provenance des différences historiques : CONTRÔLE ACHEVÉ AVEC RÉSERVES

Le tableau distinct **« Détail des Projets Financés sur C2D »** (LFI p.565–569) contient **14 sections** et **74 400 000 000 FCFA** de CP 2026. Contrôle indépendant direct : chaque ligne de section possède une cellule CP non ambiguë, les **14 valeurs sont extraites du PDF original** et leur somme est exactement **74 400 000 000 FCFA**.

Sur les **15 anciennes valeurs applicatives divergentes**, **9** différences sont numériquement expliquées au franc près par le volet C2D, **3** sont proches avec un reliquat et **3** ne correspondent à aucune ligne C2D. Deux des différences négatives sans C2D ont une activité de même montant absolu dans la LFI, sans démontrer leur origine historique.

**Quatre montants résiduels non expliqués :** `gov-006` −370 246 FCFA ; `gov-011` +481 394 FCFA ; `gov-013` +283 456 FCFA ; `gov-025` +239 982 FCFA. Le balayage **des 1 901 pages physiques** des trois PDF sources, en recherchant des entiers séparés par espace, point, espace insécable, espace insécable étroit et espace fine (U+2009), n'a trouvé aucune ligne autonome égale à ces montants. **Une recherche négative n'autorise ni la conclusion « montants faux » ni une certification de leur origine**. La fiche `gov-025` publie le CP légalement voté, différent de l'ancienne valeur auditée.

Sources SHA-256 :
- LFI 2026, **583 pages** : `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76`
- Annexe 4 DPPD-PAP, **1 229 pages** : `0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10`
- Annexe 7 Dotations, **89 pages** : `567810702fb7ed7cb83945a0af18ef23ee52bf617a305bac36243c08de4a1842`

## Décision 4 — Attribution des CP aux 35 portefeuilles après remaniement : SANS RÉSERVE IMPOSSIBLE À ÉTABLIR

L'annexe au décret n° **2026-84 du 4 mars 2026** (https://www.gouv.ci/uploads/publications/177580607447.pdf) établit les **attributions administratives** des 35 portefeuilles. Elle **n'est pas un arrêté de répartition des crédits** ni un acte de transfert budgétaire. La Loi de finances initiale votée en décembre 2025 ne décrit pas à elle seule toutes les éventuelles conséquences financières du Gouvernement installé ensuite.

Aucun acte officiel de transfert/répartition postérieur, suffisamment précis pour attribuer **une enveloppe autonome aux 35 portefeuilles actuels**, n'a été trouvé ou vérifié parmi les pièces disponibles. En particulier, aucun **deuxième CP autonome** ne peut être affecté à `gov-035` sur la seule base de la section 229 commune.

**Décision de certification :**
- `CP_INITIAL_VOTE_PAR_SECTION` : **JUSTIFIÉ / SOURCÉ** — 34 sections uniques ;
- `ARITHMETIQUE_SECTIONS_PROGRAMMES_ACTIONS` : **RÉCONCILIÉE sur le périmètre testé** ;
- `PROVENANCE_HISTORIQUE_C2D` : **9 égalités exactes + 2 rapprochements d'activités non probants quant à l'origine ; 4 reliquats isolés** ;
- `DOTATION_AUTONOME_35_PORTEFEUILLES_POST_REMANIEMENT` : **NON CERTIFIABLE SANS PIÈCE COMPLÉMENTAIRE** ;
- `EXECUTION_BUDGETAIRE_2026` : **HORS PÉRIMÈTRE DES PDF UTILISÉS**.

Il est **interdit de modifier automatiquement** le champ `certified_public_budget` des 35 dossiers en `true`. Les éventuels montants indisponibles restent inconnus, jamais fixés à zéro.

## Pièce externe nécessaire et déjà préparée

Une demande officielle **non envoyée** est conservée dans `PR31_DGBF_DOCUMENTARY_CLARIFICATION_REQUEST_DRAFT.md`. Elle réclame uniquement :
1. les éventuels actes de transfert, ventilation ou rattachement de CP entre les portefeuilles du Gouvernement 2026, ou confirmation de l'absence de changement d'imputation ;
2. la documentation permettant de tracer les **quatre** anciens reliquats applicatifs, sans présumer de la responsabilité de l'administration ;
3. facultativement, la correction éditoriale du Tableau 7 Annexe 4 du programme 22121, **déjà réconcilié financièrement par la LFI**.

**Ce chantier de vérification avec les sources disponibles est clos.** La certification sans réserve des 35 dotations autonomes demeure **formellement refusée par le protocole de preuve** jusqu'à réception et examen d'actes officiels appropriés. Une CI verte prouve l'intégrité des tests et du build, **pas** la portée administrative des pièces manquantes.

**Garde-fous :** aucune fusion PR #31, aucune mutation Supabase, aucune migration, aucun déploiement manuel.
