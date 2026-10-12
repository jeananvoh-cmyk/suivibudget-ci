# Contrôle documentaire des 14 fiches d'institutions — LFI 2026 et Annexe 7

**Date : 12 octobre 2026 — Exercice : 2026 — Nature : vérification documentaire de l'exposition publique (pas une validation de comptes exécutés).**

## Sources primaires effectivement lues

1. **Loi de finances 2026**, PDF DGBF, 583 pages : [original LFI](https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf), tableau « Budget 2026 (Récapitulatif par section, dotation et programme) », **pages PDF 45–46**. SHA-256 contrôlé : `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76`.
2. **Annexe 7 — Dotations des institutions 2026**, PDF de 89 pages : [original Annexe 7](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-7-Dotations-des-Institutions-2026.pdf), **pages PDF 9–13** : « Récapitulatif des dotations des Institutions », codes de destination et de paragraphe économique (2716, 6416, 6417, etc.). Empreinte déclarée de l'original acquis : `567810702fb7ed7cb83945a0af18ef23ee52bf617a305bac36243c08de4a1842`.

**Règle de contrôle :** un montant de section LFI, un programme interne LFI, et une dotation directe par destination et paragraphe Annexe 7 ont des assiettes distinctes. On ne peut pas obtenir une ventilation `fonctionnement + investissement` d'un montant LFI en additionnant arbitrairement les dotations de l'Annexe 7. Un zéro ou un 100 % d'investissement/fonctionnement n'est pas documenté par simple égalité arithmétique des champs applicatifs.

## Réconciliation des totaux LFI des fiches (FCFA)

| Identifiant | Institution | Code LFI | Montant LFI 2026 affiché | Nature et page du PDF LFI | Conclusion contrôle du total |
|---|---|---|---:|---|---|
| inst-presidence | Présidence de la République | Section 103 | 193 633 705 615 | p.45, crédits de section | Total retrouvé |
| inst-assnat | Assemblée nationale | Section 101 | 38 578 972 451 | p.45, crédits de section | Total retrouvé |
| inst-senat | Sénat | Section 102 | 14 665 806 742 | p.45, crédits de section | Total retrouvé |
| inst-conseil-const | Conseil constitutionnel | Section 106 | 3 860 437 235 | p.45, crédits de section | Total retrouvé |
| inst-cour-supreme | Cour suprême | — | Non renseigné | Pas de section autonome retenue dans ce référentiel | Aucun zéro fictif |
| inst-cour-comptes | Cour des comptes | Section 115 | 8 851 161 351 | p.46, crédits de section | Total retrouvé |
| inst-conseil-etat | Conseil d'État | Section 118 | 5 164 531 081 | p.46, crédits de section | Total retrouvé |
| inst-cour-cassation | Cour de cassation | Section 114 | 7 931 309 608 | p.46, crédits de section | Total retrouvé |
| inst-mediateur | Médiateur de la République | Section 109 | 8 285 468 221 | p.45, crédits de section | Total retrouvé |
| inst-ige | Inspection générale d'État | Section 103 / **programme 13003** | 9 872 577 575 | p.45, crédits du programme interne | Inclus dans section 103, non additif |
| inst-chancellerie | Grande chancellerie | Section 107 | 3 743 870 172 | p.45, crédits de section | Total retrouvé |
| inst-cesec | CESEC | Section 105 | 8 069 692 846 | p.45, crédits de section | Total retrouvé |
| inst-cnrct | Chambre nationale des rois et chefs traditionnels | Section 111 | 5 794 171 874 | p.46, crédits de section | Total retrouvé |
| inst-habg | Haute autorité pour la bonne gouvernance | Section 103 / **programme 13004** | 5 552 174 916 | p.45, crédits du programme interne | Inclus dans section 103, non additif |

**Attention au double comptage :** IGE 13003 et HABG 13004 sont déjà inclus dans la section 103. La somme brute des 13 fiches documentées additionnerait abusivement ces deux programmes à la Présidence.

## Confrontation à l'Annexe 7, et anomalie de périmètre

- L'Annexe 7, page PDF **10**, présente notamment les destinations **121590201 « Inspection Générale d'État (IGE) »**, dotation 2026 de **8 329 477 575 FCFA**, et **121591501 « Haute Autorité pour la Bonne Gouvernance »**, dotation 2026 de **4 164 103 471 FCFA**. Ces valeurs **ne sont pas** les mêmes assiettes que les **programmes LFI 13003/13004**. D'autres destinations (CONAFIP/IGE, CONAFIP/HABG, réhabilitation, lutte contre la corruption, etc.) figurent séparément dans l'Annexe 7 ; leur rapprochement requiert une table d'attribution officielle. Ne pas combler les écarts automatiquement.
- Les pages **9–13** comportent des paragraphes économiques **2716 (transferts en capital)**, **6416 (transferts aux institutions)**, **6417 (transferts aux institutions – dépenses de personnel)**. La présence de paragraphes de capital rend **particulièrement dangereuse** l'affirmation générique « 0 % investissement » dans plusieurs fiches ; elle ne suffit toutefois pas à reconstituer un montant d'investissement LFI à périmètre identique.
- Les anciennes lignes applicatives HABG **1 425 000 000 + 2 327 500 000 + 997 500 000 = 4 750 000 000 FCFA** étaient sans référence primaire explicite. Écart avec programme 13004 : **802 174 916 FCFA**, **non interprétable comme « crédits manquants »**. Le détail analogue IGE a été neutralisé par la PR #55.

## Résultat des 14 contrôles de ventilation

Le fichier `src/data/nationalBudgetData.ts` présentait **12 fiches à montant total positif avec ventilation fonctionnement/investissement numérique** (dont neuf investissements à zéro), et deux fiches HABG/IGE déjà neutralisées après l'alerte précédente ; la Cour suprême n'affiche aucun montant. **Aucune référence justificative de ventilation de même assiette n'accompagne ces champs dans le référentiel de ces fiches.**

**Décision conservatoire documentée :** conserver intégralement les **13 montants positifs retrouvés dans la LFI**, conserver la Cour suprême inconnue, et neutraliser dans les **14 fiches** les champs de répartition `budget_functioning_fcfa` / `budget_investment_fcfa` (valeur `null`, jamais `0`). Le moteur `calculateSafePercentages` affiche alors **« ventilation non disponible »** plutôt que **100 % / 0 %** sans fondement. Cela ne constitue PAS l'affirmation selon laquelle il n'existe aucune dotation d'investissement : la ventilation est simplement **non certifiée pour la même assiette LFI**.

La réintroduction d'une ventilation est permise si, et seulement si, les deux composantes sont reliées à un tableau officiel détaillé, cohérent sur **l'année, l'institution, la section/le programme ou la destination, la base budgétaire et la nature des crédits**, avec numéros de lignes et pages. Le rapprochement entre deux assiettes exige une correspondance documentaire officielle.

## Limites et vérifications supplémentaires

- Cet audit a lu les récapitulatifs LFI et Annexe 7 et rapproché les **14 fiches** du référentiel national. Il **ne certifie pas exhaustivement toutes les lignes de `src/data/budgetLines2026.json`** (catalogue transversal volumineux). Les anciennes ventilations spécifiques HABG/IGE ont été supprimées via PR #55.
- Ne pas confondre conservation d'un montant LFI et certification de toutes les dépenses par nature. Une Annexe 7 économique peut autoriser une autre restitution, explicitement étiquetée « dotation directe Annexe 7 » sans l'agréger au programme LFI.
- Avant validation de production : tests automatisés, contrôle visuel des 14 fiches, vérification des autres voies d'affichage de lignes financières, et confrontation de chaque détail au PDF source.
- **Écritures Supabase distantes : 0.** Aucun fichier PDF officiel ni donnée de production modifié.
