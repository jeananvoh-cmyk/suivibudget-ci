# Rapport des Divergences Documentaires — MMPE Budget 2026

> Ce rapport compare l'extraction documentaire canonique indépendante issue de l'Annexe 4 DPPD-PAP 2026-2028 (DGBF)
> avec le fichier applicatif actuel `src/data/ministryBudgets/2026/mmpe.json`.

## Synthèse des écarts
- **Divergences CRITIQUES (montants erronés ou entités non documentées)** : 16
- **Divergences MAJEURES (libellés non conformes ou codes / rattachements erronés)** : 48
- **Divergences MINEURES (références de pages ou ajustements textuels mineurs)** : 48
- **Total divergences** : 112

---

## Tableau détaillé des divergences

| ENTITY_TYPE | CODE | FIELD | CURRENT_VALUE | DOCUMENT_VALUE | SOURCE_PAGE | SEVERITY |
|---|---|---|---|---|---|---|
| PROGRAM | `21106` | `page_reference` | DPPD-PAP 2026-2028, p. 810 | PDF p. 813 / Document p. 811 | PDF p. 813 / Document p. 811 | **MINOR** |
| PROGRAM | `22036` | `page_reference` | DPPD-PAP 2026-2028, p. 815 | PDF p. 817 / Document p. 815 | PDF p. 817 / Document p. 815 | **MINOR** |
| PROGRAM | `22037` | `page_reference` | DPPD-PAP 2026-2028, p. 817 | PDF pp. 820-821 / Document pp. 818-819 | PDF pp. 820-821 / Document pp. 818-819 | **MINOR** |
| PROGRAM | `22107` | `page_reference` | DPPD-PAP 2026-2028, p. 821 | PDF pp. 824-825 / Document pp. 822-823 | PDF pp. 824-825 / Document pp. 822-823 | **MINOR** |
| PROGRAM | `23230` | `page_reference` | DPPD-PAP 2026-2028, p. 824 | PDF p. 826 / Document p. 824 | PDF p. 826 / Document p. 824 | **MINOR** |
| PROGRAM | `23231` | `page_reference` | DPPD-PAP 2026-2028, p. 824 | PDF p. 827 / Document p. 825 | PDF p. 827 / Document p. 825 | **MINOR** |
| PROGRAM | `23232` | `page_reference` | DPPD-PAP 2026-2028, p. 826 | PDF p. 829 / Document p. 827 | PDF p. 829 / Document p. 827 | **MINOR** |
| PROGRAM | `23233` | `page_reference` | DPPD-PAP 2026-2028, p. 827 | PDF p. 830 / Document p. 828 | PDF p. 830 / Document p. 828 | **MINOR** |
| PROGRAM | `23234` | `page_reference` | DPPD-PAP 2026-2028, p. 828 | PDF p. 831 / Document p. 829 | PDF p. 831 / Document p. 829 | **MINOR** |
| PROGRAM | `23251` | `page_reference` | DPPD-PAP 2026-2028, p. 830 | PDF p. 832 / Document p. 830 | PDF p. 832 / Document p. 830 | **MINOR** |
| ACTION | `2110601` | `amount_2026_fcfa` | 5,450,635,152 FCFA | 2,315,615,656 FCFA | PDF p. 813 / Document p. 811 | **CRITICAL** |
| ACTION | `2110601` | `official_name` | Direction et coordination | Coordination et animation du ministère | PDF p. 813 / Document p. 811 | **MAJOR** |
| ACTION | `2110601` | `page_reference` | DPPD-PAP 2026-2028, p. 810 | PDF p. 813 / Document p. 811 | PDF p. 813 / Document p. 811 | **MINOR** |
| ACTION | `2110602` | `amount_2026_fcfa` | 880,412,900 FCFA | 86,760,000 FCFA | PDF p. 815 / Document p. 813 | **CRITICAL** |
| ACTION | `2110602` | `official_name` | Gestion des ressources humaines | Planification, programmation et suivi-évaluation des activités du ministère | PDF p. 815 / Document p. 813 | **MAJOR** |
| ACTION | `2110602` | `page_reference` | DPPD-PAP 2026-2028, p. 811 | PDF p. 815 / Document p. 813 | PDF p. 815 / Document p. 813 | **MINOR** |
| ACTION | `2110603` | `amount_2026_fcfa` | 1,730,544,074 FCFA | 6,266,806,470 FCFA | PDF p. 815 / Document p. 813 | **CRITICAL** |
| ACTION | `2110603` | `official_name` | Affaires financières et patrimoine | Gestion des ressources humaines, matérielles et financières | PDF p. 815 / Document p. 813 | **MAJOR** |
| ACTION | `2110603` | `page_reference` | DPPD-PAP 2026-2028, p. 812 | PDF p. 815 / Document p. 813 | PDF p. 815 / Document p. 813 | **MINOR** |
| ACTION | `2110604` | `amount_2026_fcfa` | 640,280,000 FCFA | 32,690,000 FCFA | PDF p. 815 / Document p. 813 | **CRITICAL** |
| ACTION | `2110604` | `official_name` | Systèmes d'information et statistiques | Information et communication | PDF p. 815 / Document p. 813 | **MAJOR** |
| ACTION | `2110604` | `page_reference` | DPPD-PAP 2026-2028, p. 813 | PDF p. 815 / Document p. 813 | PDF p. 815 / Document p. 813 | **MINOR** |
| ACTION | `2203601` | `amount_2026_fcfa` | 45,200,000 FCFA | 82,754,336 FCFA | PDF p. 817 / Document p. 815 | **CRITICAL** |
| ACTION | `2203601` | `official_name` | Promotion et développement de l'exploration-production pétrolière et gazière | Renforcement du cadre institutionnel, légal et réglementaire du secteur des hydrocarbures | PDF p. 817 / Document p. 815 | **MAJOR** |
| ACTION | `2203601` | `page_reference` | DPPD-PAP 2026-2028, p. 815 | PDF p. 817 / Document p. 815 | PDF p. 817 / Document p. 815 | **MINOR** |
| ACTION | `2203602` | `amount_2026_fcfa` | 42,854,336 FCFA | 17,800,000 FCFA | PDF p. 817 / Document p. 815 | **CRITICAL** |
| ACTION | `2203602` | `official_name` | Suivi et régulation du raffinage, stockage et distribution des produits pétroliers | Sécurisation de l'approvisionnement des marchés locaux et sous régionaux en produits pétroliers | PDF p. 817 / Document p. 815 | **MAJOR** |
| ACTION | `2203602` | `page_reference` | DPPD-PAP 2026-2028, p. 816 | PDF p. 817 / Document p. 815 | PDF p. 817 / Document p. 815 | **MINOR** |
| ACTION | `2203603` | `amount_2026_fcfa` | 28,000,000 FCFA | 15,500,000 FCFA | PDF p. 817 / Document p. 815 | **CRITICAL** |
| ACTION | `2203603` | `official_name` | Sécurité des approvisionnements et contrôle qualité | Promotion des investissements nationaux et étrangers dans le secteur pétrolier et gazier | PDF p. 817 / Document p. 815 | **MAJOR** |
| ACTION | `2203603` | `page_reference` | DPPD-PAP 2026-2028, p. 816 | PDF p. 817 / Document p. 815 | PDF p. 817 / Document p. 815 | **MINOR** |
| ACTION | `2203701` | `amount_2026_fcfa` | 4,120,480,340 FCFA | 16,875,242,446 FCFA | PDF p. 820 / Document p. 818 | **CRITICAL** |
| ACTION | `2203701` | `official_name` | Pilotage et régulation du sous-secteur électricité | Renforcement du cadre institutionnel, légal et réglementaire du secteur de l'énergie | PDF p. 820 / Document p. 818 | **MAJOR** |
| ACTION | `2203701` | `page_reference` | DPPD-PAP 2026-2028, p. 817 | PDF p. 820 / Document p. 818 | PDF p. 820 / Document p. 818 | **MINOR** |
| ACTION | `2203702` | `amount_2026_fcfa` | 285,450,710,261 FCFA | 272,285,127,246 FCFA | PDF pp. 820-821 / Document pp. 818-819 | **CRITICAL** |
| ACTION | `2203702` | `official_name` | Développement des infrastructures de production, transport et distribution électrique | Renforcement des infrastructures de production, du transport et de distribution de l'énergie électrique | PDF pp. 820-821 / Document pp. 818-819 | **MAJOR** |
| ACTION | `2203702` | `page_reference` | DPPD-PAP 2026-2028, pp. 818-820 | PDF pp. 820-821 / Document pp. 818-819 | PDF pp. 820-821 / Document pp. 818-819 | **MINOR** |
| ACTION | `2203703` | `amount_2026_fcfa` | 22,840,929,000 FCFA | 22,204,949,909 FCFA | PDF p. 821 / Document p. 819 | **CRITICAL** |
| ACTION | `2203703` | `official_name` | Électrification rurale et accès universel à l'électricité | Vulgarisation des technologies modernes d'exploitation des sources d'énergie | PDF p. 821 / Document p. 819 | **MAJOR** |
| ACTION | `2203703` | `page_reference` | DPPD-PAP 2026-2028, p. 821 | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| ACTION | `2203704` | `amount_2026_fcfa` | 8,502,500,000 FCFA | 9,549,300,000 FCFA | PDF p. 821 / Document p. 819 | **CRITICAL** |
| ACTION | `2203704` | `official_name` | Maîtrise de l'énergie et énergies renouvelables | Amélioration de l'accessibilité financière aux services énergétiques | PDF p. 821 / Document p. 819 | **MAJOR** |
| ACTION | `2203704` | `page_reference` | DPPD-PAP 2026-2028, p. 821 | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| ACTION | `2210701` | `amount_2026_fcfa` | 350,421,335 FCFA | 64,551,589 FCFA | PDF p. 824 / Document p. 822 | **CRITICAL** |
| ACTION | `2210701` | `official_name` | Développement de la cartographie géologique et des infrastructures minières | Contrôle et suivi de l'application de la législation minière | PDF p. 824 / Document p. 822 | **MAJOR** |
| ACTION | `2210701` | `page_reference` | DPPD-PAP 2026-2028, p. 822 | PDF p. 824 / Document p. 822 | PDF p. 824 / Document p. 822 | **MINOR** |
| ACTION | `2210702` | `amount_2026_fcfa` | 210,500,000 FCFA | 492,511,295 FCFA | PDF p. 824 / Document p. 822 | **CRITICAL** |
| ACTION | `2210702` | `official_name` | Régulation, contrôle et assainissement de l'activité minière | Gestion des informations géologiques et minières | PDF p. 824 / Document p. 822 | **MAJOR** |
| ACTION | `2210702` | `page_reference` | DPPD-PAP 2026-2028, p. 822 | PDF p. 824 / Document p. 822 | PDF p. 824 / Document p. 822 | **MINOR** |
| ACTION | `2210703` | `amount_2026_fcfa` | 120,400,000 FCFA | 13,428,480 FCFA | PDF p. 824 / Document p. 822 | **CRITICAL** |
| ACTION | `2210703` | `official_name` | Promotion de la petite mine et encadrement de l'artisanat minier | Assainissement de l'exploitation minière | PDF p. 824 / Document p. 822 | **MAJOR** |
| ACTION | `2210703` | `page_reference` | DPPD-PAP 2026-2028, p. 823 | PDF p. 824 / Document p. 822 | PDF p. 824 / Document p. 822 | **MINOR** |
| ACTION | `2210705` | `PRESENCE` | ABSENT | Renforcement du cadre institutionnel, légal et réglementaire du secteur des mines et géologie (212,829,971 FCFA) | PDF p. 825 / Document p. 823 | **CRITICAL** |
| ACTION | `2323001` | `official_name` | Électrification et appui financier au secteur de l'électricité | Electrification | PDF p. 826 / Document p. 824 | **MAJOR** |
| ACTION | `2323001` | `page_reference` | DPPD-PAP 2026-2028, p. 824 | PDF p. 826 / Document p. 824 | PDF p. 826 / Document p. 824 | **MINOR** |
| ACTION | `2323101` | `official_name` | Appui financier et restructuration de la Société Ivoirienne de Raffinage (SIR) | Collecter mensuellement la TSU SIR auprès de chaque marketeur | PDF p. 827 / Document p. 825 | **MAJOR** |
| ACTION | `2323101` | `page_reference` | DPPD-PAP 2026-2028, p. 824 | PDF p. 827 / Document p. 825 | PDF p. 827 / Document p. 825 | **MINOR** |
| ACTION | `2323201` | `official_name` | Appui au développement et à la valorisation du potentiel minier | Gestion des taxes ad valorem | PDF p. 829 / Document p. 827 | **MAJOR** |
| ACTION | `2323201` | `page_reference` | DPPD-PAP 2026-2028, p. 826 | PDF p. 829 / Document p. 827 | PDF p. 829 / Document p. 827 | **MINOR** |
| ACTION | `2323301` | `official_name` | Péréquation des prix des produits pétroliers à la SIR | Règlement des subventions de gaz butane ordonnancées au titre des ventes mensuelles | PDF p. 830 / Document p. 828 | **MAJOR** |
| ACTION | `2323301` | `page_reference` | DPPD-PAP 2026-2028, p. 827 | PDF p. 830 / Document p. 828 | PDF p. 830 / Document p. 828 | **MINOR** |
| ACTION | `2323401` | `official_name` | Péréquation des frais de transport des hydrocarbures à la SEGH | Règlement mensuel des transports dus aux distribution (Marketeurs) | PDF p. 831 / Document p. 829 | **MAJOR** |
| ACTION | `2323401` | `page_reference` | DPPD-PAP 2026-2028, p. 828 | PDF p. 831 / Document p. 829 | PDF p. 831 / Document p. 829 | **MINOR** |
| ACTION | `2325101` | `official_name` | Appui aux programmes qualité réseau et électrification rurale (CI-ENERGIES) | Renforcement de l'accès à l'électricité | PDF p. 832 / Document p. 830 | **MAJOR** |
| ACTION | `2325101` | `page_reference` | DPPD-PAP 2026-2028, p. 830 | PDF p. 832 / Document p. 830 | PDF p. 832 / Document p. 830 | **MINOR** |
| ACTION | `2210704` | `PRESENCE` | Surveillance de l'impact environnemental et sociétal des exploitations (102,000,000 FCFA) | NON DOCUMENTÉ (ABSENT DE L'ANNEXE 4 DPPD-PAP 2026-2028) | DPPD-PAP 2026-2028, p. 823 | **CRITICAL** |
| PROJECT | `78043200113` | `official_code` | PROJ-MMPE-2597 | 78043200113 | PDF p. 815 / Document p. 813 | **MAJOR** |
| PROJECT | `78043200113` | `action_code` | 2110604 | 2110601 | PDF p. 815 / Document p. 813 | **MAJOR** |
| PROJECT | `78043200113` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 815 / Document p. 813 | PDF p. 815 / Document p. 813 | **MINOR** |
| PROJECT | `90043500023` | `official_code` | PROJ-MMPE-2605 | 90043500023 | PDF p. 820 / Document p. 818 | **MAJOR** |
| PROJECT | `90043500023` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 820 / Document p. 818 | PDF p. 820 / Document p. 818 | **MINOR** |
| PROJECT | `90043500021` | `official_code` | PROJ-MMPE-2603 | 90043500021 | PDF pp. 820-821 / Document pp. 818-819 | **MAJOR** |
| PROJECT | `90043500021` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF pp. 820-821 / Document pp. 818-819 | PDF pp. 820-821 / Document pp. 818-819 | **MINOR** |
| PROJECT | `90043500017` | `official_code` | PROJ-MMPE-2602 | 90043500017 | PDF pp. 820-821 / Document pp. 818-819 | **MAJOR** |
| PROJECT | `90043500017` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF pp. 820-821 / Document pp. 818-819 | PDF pp. 820-821 / Document pp. 818-819 | **MINOR** |
| PROJECT | `90043500010` | `official_code` | PROJ-MMPE-2601 | 90043500010 | PDF pp. 820-821 / Document pp. 818-819 | **MAJOR** |
| PROJECT | `90043500010` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF pp. 820-821 / Document pp. 818-819 | PDF pp. 820-821 / Document pp. 818-819 | **MINOR** |
| PROJECT | `78043500065` | `official_code` | PROJ-MMPE-2599 | 78043500065 | PDF pp. 820-821 / Document pp. 818-819 | **MAJOR** |
| PROJECT | `78043500065` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF pp. 820-821 / Document pp. 818-819 | PDF pp. 820-821 / Document pp. 818-819 | **MINOR** |
| PROJECT | `90043500022` | `official_code` | PROJ-MMPE-2604 | 90043500022 | PDF p. 820 / Document p. 818 | **MAJOR** |
| PROJECT | `90043500022` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 820 / Document p. 818 | PDF p. 820 / Document p. 818 | **MINOR** |
| PROJECT | `90043500007` | `official_code` | PROJ-MMPE-2600 | 90043500007 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043500007` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `26043500002` | `official_code` | PROJ-MMPE-2598 | 26043500002 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `26043500002` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `90043200012` | `official_code` | PROJ-MMPE-2610 | 90043200012 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043200012` | `action_code` | 2203704 | 2203703 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043200012` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `90043200011` | `official_code` | PROJ-MMPE-2609 | 90043200011 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043200011` | `action_code` | 2203704 | 2203703 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043200011` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `90043200010` | `official_code` | PROJ-MMPE-2608 | 90043200010 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043200010` | `action_code` | 2203704 | 2203703 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043200010` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `78043500057` | `official_code` | PROJ-MMPE-2606 | 78043500057 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `78043500057` | `action_code` | 2203704 | 2203703 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `78043500057` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `78043500062` | `official_code` | PROJ-MMPE-2607 | 78043500062 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `78043500062` | `action_code` | 2203704 | 2203703 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `78043500062` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `90043500001` | `official_code` | PROJ-MMPE-2612 | 90043500001 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043500001` | `action_code` | 2203703 | 2203704 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `90043500001` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `78043500047` | `official_code` | PROJ-MMPE-2611 | 78043500047 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `78043500047` | `action_code` | 2203703 | 2203704 | PDF p. 821 / Document p. 819 | **MAJOR** |
| PROJECT | `78043500047` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 821 / Document p. 819 | PDF p. 821 / Document p. 819 | **MINOR** |
| PROJECT | `90043500009` | `official_code` | PROJ-MMPE-2614 | 90043500009 | PDF p. 824 / Document p. 822 | **MAJOR** |
| PROJECT | `90043500009` | `action_code` | 2210701 | 2210702 | PDF p. 824 / Document p. 822 | **MAJOR** |
| PROJECT | `90043500009` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 824 / Document p. 822 | PDF p. 824 / Document p. 822 | **MINOR** |
| PROJECT | `78044100097` | `official_code` | PROJ-MMPE-2597 | 78044100097 | PDF p. 824 / Document p. 822 | **MAJOR** |
| PROJECT | `78044100097` | `action_code` | 2110604 | 2210702 | PDF p. 824 / Document p. 822 | **MAJOR** |
| PROJECT | `78044100097` | `page_reference` | DPPD-PAP 2026-2028 / Section Investissements | PDF p. 824 / Document p. 822 | PDF p. 824 / Document p. 822 | **MINOR** |

---

## Observations et Analyse Documentaire

### 1. Programmes 21106, 22036, 22037 et 22107 : Ventilations d'actions
Dans l'implémentation actuelle de `mmpe.json` :
- Les montants totaux des 10 programmes correspondent parfaitement à la Loi de Finances et au DPPD-PAP (somme = 706 060 209 015 FCFA, delta = 0).
- En revanche, au niveau des **actions**, les montants avaient fait l'objet d'une redistribution artificielle pour forcer l'égalité arithmétique :
  - Action 2110601 était à 5 450 635 152 FCFA alors que le DPPD-PAP (Tableau 7 p. 813 / doc p. 811) spécifie **2 315 615 656 FCFA**.
  - Action 2110602 était à 880 412 900 FCFA alors que le document spécifie **86 760 000 FCFA**.
  - Action 2110603 était à 1 730 544 074 FCFA alors que le document spécifie **6 266 806 470 FCFA**.
  - Action 2110604 était à 640 280 000 FCFA alors que le document spécifie **32 690 000 FCFA**.
  - Action 2203701 était à 4 120 480 340 FCFA alors que le document spécifie **16 875 242 446 FCFA**.
  - Action 2203702 était à 285 450 710 261 FCFA alors que le document spécifie **272 285 127 246 FCFA**.
  - Action 2203703 était à 22 840 929 000 FCFA alors que le document spécifie **22 204 949 909 FCFA**.
  - Action 2203704 était à 8 502 500 000 FCFA alors que le document spécifie **9 549 300 000 FCFA**.
- Dans le Programme 22107 (Mines et géologie) :
  - Une action artificielle `2210704` (Surveillance impact environnemental, 102 000 000 FCFA) avait été inventée.
  - La véritable action `2210705` (Renforcement cadre institutionnel, 212 829 971 FCFA) avait été omise.

### 2. Projets d'Investissements Publics
- Les 18 projets d'investissements publics inscrits sous la Nature 4 (Investissements) totalisent exactement **304 158 991 377 FCFA**.
- Dans `mmpe.json`, les codes de projets étaient artificiellement préfixés `PROJ-MMPE-XXXX` au lieu d'utiliser leurs codes officiels DGBF à 11 chiffres (ex: `78043200113`, `26043500002`, `90043500010`).
- Les projets multi-lignes (ex: Numérisation `90043500010` avec 10 Md Trésor + 50 Md Fin. Extérieur, ou Dorsale Anyama-Ferké `90043500023` avec 3 lignes totalisant 60,55 Md) étaient agrégés sans mention de leurs composantes sources.
- Les références de page étaient indiquées sous la forme générique `DPPD-PAP 2026-2028 / Section Investissements` au lieu des pages précises (`PDF p. 815 / Document p. 813`, `PDF pp. 820-821 / Document pp. 818-819`).

### 3. Statut de réconciliation canonique du document
Dans l'extraction candidate canonique :
- Somme des 10 programmes : **706 060 209 015 FCFA** ($\Delta = 0$ par rapport au total ministériel).
- Somme des 21 actions officielles : **706 060 209 015 FCFA** ($\Delta = 0$).
- Somme des 18 projets d'investissement : **304 158 991 377 FCFA** (strictement intégrés dans les crédits d'investissement des actions mères, aucun double comptage).
- Aucun montant n'a été calculé par différence ni redistribué : chaque montant provient directement du Tableau 7 du document officiel DGBF.