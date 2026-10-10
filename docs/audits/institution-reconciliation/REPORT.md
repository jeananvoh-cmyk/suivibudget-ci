# AUDIT DOCUMENTAIRE — SuiviBudget Côte d'Ivoire — LFI 2026

**Statut : AVEC RÉSERVES — aucune certification globale sans réserve.**

Date : 10 octobre 2026. Source : LFI n°2025-987, tableau crédits de paiement par sections (PDF pp.45–54). LFI SHA-256 : `f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76`.
Sources complémentaires : [LFI 2026](https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf); [Annexe 4](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf); [Annexe 7](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-7-Dotations-des-Institutions-2026.pdf).

## Périmètre et correction du faux total

- **66 entités** : 14 grandes institutions, 35 portefeuilles ministériels, 7 autorités de régulation et 10 communes.
- **13 correspondances numériques institutionnelles documentées** dont **2 programmes internes de la Présidence non additifs**.
- **11 sections institutionnelles DISTINCTES**, total limité à ce périmètre : **298 579 127 196 FCFA**. Ce montant ne représente ni l'ensemble du budget de l'État ni un total cumulant ministères/AAI/communes.
- **7 budgets de régulateurs retirés de la catégorie vérifiée** ; anciens chiffres totalisant **42 150 000 000 FCFA**, sans pièces probantes individuelles suffisantes dans la matrice précédente. Montants = `null`, et surtout pas 0.
- **2 montants de portefeuilles ministériels distincts de leur section LFI et 9 montants volontairement non renseignés**, donc non certifiés comme budget de section ; **34 sections LFI pour 35 portefeuilles administratifs**. Ne pas redistribuer automatiquement les crédits.
- Ancien cumul prétendument certifié **356 153 879 687 FCFA** : **retiré**. Ce total mélangeait programmes imbriqués et régulateurs non justifiés.
- Statuts des 66 : `{"VERIFIED_AMOUNT":13,"NOT_DOCUMENTED":20,"PARTIAL_BREAKDOWN":23,"NOT_PUBLISHED":10}`. Les écarts arithmétiques ne remplacent jamais une preuve documentaire.

## Risques budgétaires majeurs

1. **Présidence : section 103**. Le programme IGE **13003**, **9 872 577 575 FCFA**, et le programme HABG **13004**, **5 552 174 916 FCFA**, font partie de **193 633 705 615 FCFA** (total de la section 103). Les trois chiffres sont documentairement identifiables mais **leur somme serait un double comptage**. Les deux programmes restent dans les fiches informatives, avec statut non additif.
2. **Trois juridictions** : Cour de Cassation section **114**, Cour des Comptes **115**, Conseil d'État **118**, PDF **p.46**. Pas de crédit autonome à attribuer à l'ancienne Cour Suprême.
3. **Ministères** : total CP d'une section ≠ allocation du portefeuille 2026 par décret. Les travaux antérieurs sur 34 sections, programmes et actions, C2D et quatre reliquats historiques sont **préservés** dans `docs/references/2026/ministry-reconciliation/` ; la présente correction ne les recalcule pas arbitrairement.
4. **Autorités** : rechercher spécifiquement lois/décrets budgétaires, budgets approuvés d'EPN et rapports de gestion individuels. L'Annexe 6 des budgets d'EPN constitue une piste mais ne permet pas de rétablir automatiquement les sept anciens chiffres.
5. **Commune** : `null` signifie budget primitif non transmis, non absence de dépenses.

## Matrice contrôlée des 66 entités

**Légende** : `SECTION` = chiffre de section potentiellement additif entre sections distinctes ; `INTERNAL_PROGRAM` = inclus dans sa section ; `SECTION_REFERENCE_NOT_PORTFOLIO` = code et crédit de section LFI, sans certification d'affectation au portefeuille ; `UNVERIFIED_AAI` = aucune preuve chiffrée individuelle acceptée.

| ID | Section LFI | Catégorie | Niveau comptable | Montant F CFA dans la fiche | Statut | Page PDF LFI |
|---|---|---|---|---:|---|---:|
| inst-presidence | 103 | GRANDE_INSTITUTION | SECTION | 193 633 705 615 | VERIFIED_AMOUNT | 45 |
| inst-assnat | 101 | GRANDE_INSTITUTION | SECTION | 38 578 972 451 | VERIFIED_AMOUNT | 45 |
| inst-senat | 102 | GRANDE_INSTITUTION | SECTION | 14 665 806 742 | VERIFIED_AMOUNT | 45 |
| inst-conseil-const | 106 | GRANDE_INSTITUTION | SECTION | 3 860 437 235 | VERIFIED_AMOUNT | 45 |
| inst-cour-supreme | — | GRANDE_INSTITUTION | NO_INDEPENDENT_LFI_SECTION | non renseigné | NOT_DOCUMENTED | 45-54 |
| inst-cour-comptes | 115 | GRANDE_INSTITUTION | SECTION | 8 851 161 351 | VERIFIED_AMOUNT | 46 |
| inst-conseil-etat | 118 | GRANDE_INSTITUTION | SECTION | 5 164 531 081 | VERIFIED_AMOUNT | 46 |
| inst-cour-cassation | 114 | GRANDE_INSTITUTION | SECTION | 7 931 309 608 | VERIFIED_AMOUNT | 46 |
| inst-mediateur | 109 | GRANDE_INSTITUTION | SECTION | 8 285 468 221 | VERIFIED_AMOUNT | 45 |
| inst-ige | 103 | GRANDE_INSTITUTION | INTERNAL_PROGRAM | 9 872 577 575 | VERIFIED_AMOUNT | 45 |
| inst-chancellerie | 107 | GRANDE_INSTITUTION | SECTION | 3 743 870 172 | VERIFIED_AMOUNT | 45 |
| inst-cesec | 105 | GRANDE_INSTITUTION | SECTION | 8 069 692 846 | VERIFIED_AMOUNT | 45 |
| inst-cnrct | 111 | GRANDE_INSTITUTION | SECTION | 5 794 171 874 | VERIFIED_AMOUNT | 46 |
| inst-habg | 103 | GRANDE_INSTITUTION | INTERNAL_PROGRAM | 5 552 174 916 | VERIFIED_AMOUNT | 45 |
| gov-001 | 108 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 45 |
| gov-002 | 226 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 481 041 827 995 | PARTIAL_BREAKDOWN | 46 |
| gov-003 | 237 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 45 121 940 916 | PARTIAL_BREAKDOWN | 47 |
| gov-004 | 321 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 146 728 395 147 | PARTIAL_BREAKDOWN | 47 |
| gov-005 | 325 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 129 151 307 791 | PARTIAL_BREAKDOWN | 48 |
| gov-006 | 323 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 48 |
| gov-007 | 322 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 2 038 854 932 647 | NOT_DOCUMENTED | 46 |
| gov-008 | 348 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 706 060 209 015 | PARTIAL_BREAKDOWN | 51 |
| gov-009 | 229 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 47 |
| gov-010 | 340 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 307 769 615 082 | PARTIAL_BREAKDOWN | 50 |
| gov-011 | 366 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 53 |
| gov-012 | 357 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 52 |
| gov-013 | 335 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 49 |
| gov-014 | 358 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 52 |
| gov-015 | 351 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 26 700 912 028 | PARTIAL_BREAKDOWN | 52 |
| gov-016 | 376 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 49 213 125 398 | PARTIAL_BREAKDOWN | 53 |
| gov-017 | 336 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 39 806 735 298 | PARTIAL_BREAKDOWN | 49 |
| gov-018 | 345 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 103 197 582 643 | PARTIAL_BREAKDOWN | 50 |
| gov-019 | 347 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 96 866 871 722 | PARTIAL_BREAKDOWN | 51 |
| gov-020 | 350 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 19 207 286 052 | PARTIAL_BREAKDOWN | 51 |
| gov-021 | 328 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 44 194 260 102 | PARTIAL_BREAKDOWN | 48 |
| gov-022 | 333 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 49 |
| gov-023 | 362 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 91 411 414 044 | PARTIAL_BREAKDOWN | 53 |
| gov-024 | 331 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 1 571 000 767 175 | NOT_DOCUMENTED | 49 |
| gov-025 | 330 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 734 442 904 943 | PARTIAL_BREAKDOWN | 49 |
| gov-026 | 369 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 57 361 750 199 | PARTIAL_BREAKDOWN | 53 |
| gov-027 | 356 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 83 275 503 595 | PARTIAL_BREAKDOWN | 52 |
| gov-028 | 352 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 31 263 058 865 | PARTIAL_BREAKDOWN | 52 |
| gov-029 | 346 | MINISTERE | PORTFOLIO_AMOUNT_WITHHELD | non renseigné | NOT_DOCUMENTED | 50 |
| gov-030 | 444 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 70 427 777 385 | PARTIAL_BREAKDOWN | 54 |
| gov-031 | 343 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 36 680 067 253 | PARTIAL_BREAKDOWN | 50 |
| gov-032 | 440 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 13 746 365 872 | PARTIAL_BREAKDOWN | 54 |
| gov-033 | 439 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 5 122 516 889 | PARTIAL_BREAKDOWN | 53 |
| gov-034 | 334 | MINISTERE | SECTION_REFERENCE_NOT_PORTFOLIO | 182 301 855 312 | PARTIAL_BREAKDOWN | 49 |
| gov-035 | — | MINISTERE | PORTFOLIO_WITHOUT_INDEPENDENT_SECTION | non renseigné | NOT_DOCUMENTED | — |
| aai-haca | — | AUTORITE_REGULATION | UNVERIFIED_AAI | non renseigné | NOT_DOCUMENTED | — |
| aai-caidp | — | AUTORITE_REGULATION | UNVERIFIED_AAI | non renseigné | NOT_DOCUMENTED | — |
| aai-arcop | — | AUTORITE_REGULATION | UNVERIFIED_AAI | non renseigné | NOT_DOCUMENTED | — |
| aai-artci | — | AUTORITE_REGULATION | UNVERIFIED_AAI | non renseigné | NOT_DOCUMENTED | — |
| aai-anare | — | AUTORITE_REGULATION | UNVERIFIED_AAI | non renseigné | NOT_DOCUMENTED | — |
| aai-cndh | — | AUTORITE_REGULATION | UNVERIFIED_AAI | non renseigné | NOT_DOCUMENTED | — |
| aai-airp | — | AUTORITE_REGULATION | UNVERIFIED_AAI | non renseigné | NOT_DOCUMENTED | — |
| inst-com-abobo | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-adjame | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-attecoube | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-cocody | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-koumassi | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-marcory | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-plateau | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-port-bouet | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-treichville | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |
| inst-com-yopougon | — | COMMUNE_GRAND_ABIDJAN | MUNICIPAL_BUDGET_NOT_PROVIDED | non renseigné | NOT_PUBLISHED | — |

## Réserves et critères de décision de fusion

- **Bloquant** : s'assurer que la réconciliation est répercutée dans les écrans et exports consommateurs. Les anciens montants éventuellement conservés dans un store externe ne peuvent pas rétablir une certification.
- **Bloquant** : contrôler CI TypeScript + tests + build **sur le HEAD final**, et pages des annexes pour les niveaux de programmes/ventilation.
- **Restant** : preuve officielle nominative de budget 2026 pour chaque AAI ; documents d'approbation des budgets communaux ; traçabilité administrative des attributions ministérielles et des quatre reliquats.
- **Distinction** : `RECONCILED` = égalité mathématique de ventilation ; `VERIFIED_AMOUNT` = montant recoupé à la ligne documentaire. Une égalité `fonctionnement + investissement = total` ne fournit jamais à elle seule la preuve de l'origine du montant.
- **Livraison** : GitHub seulement. Aucune migration, aucun changement Supabase, aucune fusion et aucun déploiement manuel.

**Conclusion** : audit enrichi, réserves maintenues. La décision de fusion dépend de la conformité de la CI et de l'acceptation explicite des réserves documentaires ; aucune formule de « certification sans réserve » ne peut être retenue.
