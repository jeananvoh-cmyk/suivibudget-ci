# Rapport nominatif — Institutions — dotations 2026

**Source première** : [Annexe 7 DGBF — Dotations des institutions 2026](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-7-Dotations-des-Institutions-2026.pdf), 89 pages, récapitulatif **pages physiques 9–13**, 5 pages numérotées 1/5 à 5/5. Comparaison : [LFI 2026](https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf), tableau des sections pages physiques 45–54 et `docs/audits/institution-reconciliation/matrix.json` déjà publié dans le dépôt.

## Rapprochement des 14 postes institutionnels figurant dans l'Annexe 7

| Institution nommée par l'Annexe 7 | Code chapitre Annexe 7 | Dotation 2026 gérée directement (FCFA) | CP de section LFI du référentiel existant (FCFA) | Page physique Annexe 7 |
|---|---|---:|---:|---:|
| Assemblée nationale | 1111 | 38 322 939 714 | 38 578 972 451 | 9 |
| Sénat | 1112 | 14 515 653 094 | 14 665 806 742 | 9 |
| Présidence de la République (dotations directes de l'annexe) | 1211 | 19 024 752 491 | 193 633 705 615 | 10 |
| Grande Chancellerie | 1231 | 3 507 262 564 | 3 743 870 172 | 10 |
| Conseil constitutionnel | 1321 | 3 812 435 664 | 3 860 437 235 | 11 |
| Cour de cassation | 1323 | 4 572 242 642 | 7 931 309 608 | 11 |
| Conseil d'État | 1325 | 3 225 548 443 | 5 164 531 081 | 11 |
| Parquet général près la Cour de cassation et le Conseil d'État | 1326 | 1 710 458 646 | — | 12 |
| Cour des comptes | 1327 | 5 309 062 743 | 8 851 161 351 | 12 |
| Parquet général près la Cour des comptes | 1328 | 1 760 547 068 | — | 12 |
| Conseil supérieur de la magistrature | 1330 | 2 700 105 050 | — | 12 |
| Conseil économique, social, environnemental et culturel | 1421 | 7 962 130 354 | 8 069 692 846 | 13 |
| Médiateur de la République | 1431 | 8 211 539 880 | 8 285 468 221 | 13 |
| Chambre nationale des rois et chefs traditionnels | 5221 | 5 632 596 195 | 5 794 171 874 | 13 |

**Contrôle de somme exact** : 14 lignes distinctes = **120 267 274 548 FCFA**, identique au total général affiché **120 267 274 548 FCFA** dans le récapitulatif de l'Annexe 7 page physique 13. **Ne pas additionner ces dotations avec leurs sections LFI** : le champ « dotation gérée directement » n'est pas nécessairement égal au CP voté pour toute la section, laquelle peut inclure des dépenses ou structures hors périmètre de la gestion directe.

## Position des 14 fiches de « grandes institutions » actuelles

1. Assemblée nationale, Sénat, Présidence, Grande Chancellerie, Conseil constitutionnel, Cour de cassation, Conseil d'État, Cour des comptes, CESEC, Médiateur, CNRCT : **11 institutions avec code de section LFI et référence de dotation directe distincte dans l'Annexe 7**. Les montants de section déjà affichés et les montants de dotation directe ne doivent pas s'écraser mutuellement.
2. Inspection générale d'État (IGE), Haute autorité pour la bonne gouvernance (HABG) : **programmes/fiches internes de la section 103** dans le référentiel existant, montants de programme **9 872 577 575** et **5 552 174 916 FCFA**, déjà inclus dans la section de rattachement. L'Annexe 7 liste des lignes IGE et HABG, mais leur dotation directe ne doit pas être confondue avec le total du programme de la LFI. Il faut un contrôle de niveau comptable pour les exposer séparément.
3. Cour suprême (ancienne fiche) : **aucune dotation autonome établie**. Cour de cassation, Conseil d'État, Cour des comptes disposent d'individualisations. **Inconnu ≠ 0**.
4. Les trois autres lignes Annexe 7 : parquets près les cours et Conseil supérieur de la magistrature. Elles ont des dotations nominatives dont l'application n'a pas nécessairement des fiches institutionnelles autonomes. **Ne pas les affecter à d'autres institutions** et ne pas créer un double comptage.

## Écarts de périmètre à ne pas qualifier d'inventions

Les différences entre montants de CP par section et dotations directes ne sont pas en elles-mêmes des erreurs de l'application. Exemple : Cour de cassation **7 931 309 608 FCFA** en section LFI contre **4 572 242 642 FCFA** en Annexe 7 ; Cour des comptes **8 851 161 351 FCFA** contre **5 309 062 743 FCFA**. Une réconciliation par poste de dépense expliquerait les écarts ; **aucune correction de section n'est justifiée par le seul total de l'Annexe 7**.

## Périmètre et pages examinées

- L'Annexe 7 entière comporte **89 pages** ; les **5 pages du récapitulatif** ont été lues pour le contrôle des 14 dotations. Les **pages 14 à 89** contiennent les détails des dotations et **ne sont pas encore toutes vérifiées ligne par ligne dans cette présente étape**. Cela interdit de conclure à une réconciliation exhaustive des lignes fines.
- Le contrôle préalable institutionnel `docs/audits/institution-reconciliation/REPORT.md` contient les sections LFI, ses réserves et les 7 autorités de régulation hors certification.
- Les 35 ministères constituent **un périmètre distinct** et ne sont pas inclus ici ; les collectivités et districts ont également leur audit séparé.

## Décisions

**Aucune mutation des montants applicatifs, aucune écriture Supabase, pas de déploiement, pas de fusion automatique de cette branche.** Ce rapport distingue les montants institutionnels **retrouvés dans l'Annexe 7** et les CP de **sections** déjà documentés, avant de poursuivre la vérification de détail des 89 pages.
