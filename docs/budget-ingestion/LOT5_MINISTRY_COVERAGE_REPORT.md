# SuiviBudget Côte d’Ivoire — Rapport de Couverture et Généralisation Documentaire Ministérielle 2026 (LOT 5)

## 1. Contexte & Doctrine Républicaine

Le **LOT 5** a pour mission d'étendre de manière contrôlée et industrielle l'ingestion documentaire des budgets ministériels 2026 de la République de Côte d'Ivoire, en réutilisant sans aucune dérogation l'architecture canonique et les barrières d'intégrité validées lors des LOTS 2, 3 et 4.

Suite à l'audit bloquant indépendant de la PR #28, le périmètre documentaire a été réaligné sur la **Loi de Finances n° 2025-987 (LFI 2026)** intégrale. Un sous-ensemble DPPD-PAP ne peut pas tenir lieu de total ministériel si des programmes budgétaires officiels de la LFI (notamment les dotations d'appui et fonds) en sont absents. Tous les ministères du Batch 1 intègrent désormais l'intégralité de leurs programmes LFI 2026 avec une réconciliation totale (delta = 0).

### Principes Directeurs Non Négociables
1. **Source Primaire DGBF Exclusive** : Tout chiffre et tout libellé provient des publications officielles de la Direction Générale du Budget et des Finances :
   - *Loi de finances n° 2025-987 du 19 décembre 2025 portant budget de l'État pour l'année 2026* (583 pages, pp. 45–54).
   - *Annexe 4 — Documents de Programmation Pluriannuelle des Dépenses et Projets Annuels de Performance (DPPD-PAP 2026-2028)* (1 229 pages).
2. **Transcription Verbatim Intégrale** : Aucun libellé officiel n'est tronqué, abrégé, résumé ou reformulé.
3. **Intégrité Arithmétique Absolue (Delta = 0)** :
   $$\sum \text{Actions} = \text{Programme} \quad \text{et} \quad \sum \text{Programmes} = \text{Section / Ministère}$$
   Tout écart arithmétique ou anomalie de source entraîne le rejet immédiat (`SOURCE_GAP` / `REJECTED`).
4. **UNKNOWN ≠ 0 & UNKNOWN ≠ ESTIMATION** : Une absence d'information officielle n'est jamais remplacée par un zéro ni par une valeur déduite.
5. **Isolation Stricte de Publication** :
   - **SEUL le MMPE (`gov-008` / Section 348) est `PUBLISHED`** dans l'application citoyenne runtime.
   - Les 11 autres ministères vérifiés sont maintenus en statut `VERIFIED` et mode `STAGED`. Ils ne sont jamais exposés publiquement sans décision institutionnelle formelle.
   - Les 23 autres institutions restent en attente (`PENDING_DOCUMENTATION` / `DRAFT`).

---

## 2. Synthèse Globale de Couverture du Périmètre 2026 (35 Institutions)

Le tableau suivant dresse l'état exact des 35 institutions gouvernementales de l'exécutif ivoirien recensées dans `MINISTRY_DOCUMENTATION_REGISTRY_2026.json`.

| ID | Code DGBF | Ministère / Institution | Statut Validation | Dotation LFI 2026 (FCFA) | Progs / Actions | Statut Publication |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gov-001` | 108 | Primature | PENDING_DOCUMENTATION | En attente Lot 6 | PAP non ventilé | DRAFT |
| `gov-002` | 226 | Ministère d'État, Ministère de la Défense | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-003` | 237 | Fonction Publique et Modernisation de l'Administration | **VERIFIED** | 45 121 940 916 | 3 progs / 7 actions | **STAGED** |
| `gov-004` | 321 | Affaires Étrangères, Intégration Africaine et Ivoiriens de l'Extérieur | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-005` | 325 | Justice et Droits de l'Homme | **VERIFIED** | 129 151 307 791 | 4 progs / 14 actions | **STAGED** |
| `gov-006` | 323 | Intérieur et Sécurité | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-007` | 322 | Finances et Budget | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-008` | 348 | Mines, Pétrole et Énergie | **VERIFIED** | 706 060 209 015 | 10 progs / 21 actions | **PUBLISHED** |
| `gov-009` | 229 | Agriculture et Développement Rural | PENDING_DOCUMENTATION | Section unifiée | En attente Lot 6 | DRAFT |
| `gov-010` | 340 | Transports | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-011` | 366 | Hydraulique, Assainissement et Salubrité | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-012` | 357 | Promotion de la Jeunesse, Insertion Professionnelle et Service Civique | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-013` | 335 | Santé, Hygiène Publique et Couverture Maladie Universelle | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-014` | 358 | Construction, Logement et Urbanisme | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-015` | 351 | Ressources Animales et Halieutiques | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-016` | 376 | Portefeuille de l'État | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-017` | 336 | Communication | **VERIFIED** | 39 806 735 298 | 5 progs / 9 actions | **STAGED** |
| `gov-018` | 345 | Eaux et Forêts | **VERIFIED** | 103 197 582 643 | 5 progs / 18 actions | **STAGED** |
| `gov-019` | 347 | Commerce et Industrie | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-020` | 350 | Tourisme et Loisirs | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-021` | 328 | Économie, Plan et Développement | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-022` | 333 | Enseignement Supérieur et Recherche Scientifique | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-023` | 362 | Emploi et Protection Sociale | **VERIFIED** | 91 411 414 044 | 4 progs / 15 actions | **STAGED** |
| `gov-024` | 331 | Éducation Nationale et Alphabétisation | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-025` | 330 | Équipement et Entretien Routier | **VERIFIED** | 734 442 904 943 | 3 progs / 11 actions | **STAGED** |
| `gov-026` | 369 | Cohésion Nationale, Solidarité et Lutte contre la Pauvreté | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-027` | 356 | Transition Numérique et Digitalisation | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-028` | 352 | Femme, Famille et Enfant | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-029` | 346 | Culture et Francophonie | PENDING_DOCUMENTATION | En attente Lot 6 | En attente Lot 6 | DRAFT |
| `gov-030` | 444 | Sports et Cadre de Vie | **VERIFIED** | 70 427 777 385 | 4 progs / 11 actions | **STAGED** |
| `gov-031` | 343 | Environnement, Développement Durable et Transition Écologique | **VERIFIED** | 36 680 067 253 | 2 progs / 9 actions | **STAGED** |
| `gov-032` | 440 | Affaires Maritimes | **VERIFIED** | 13 746 365 872 | 2 progs / 7 actions | **STAGED** |
| `gov-033` | 439 | Intégration Africaine et Ivoiriens de l'Extérieur | **VERIFIED** | 5 122 516 889 | 3 progs / 7 actions | **STAGED** |
| `gov-034` | 334 | Enseignement Technique, Formation Professionnelle et Apprentissage | **VERIFIED** | 182 301 855 312 | 4 progs / 10 actions | **STAGED** |
| `gov-035` | 229 | Productions Vivrières (Section partagée avec gov-009) | PENDING_DOCUMENTATION | Section unifiée | En attente Lot 6 | DRAFT |

---

## 3. Détails du Batch 1 de Généralisation (7 Ministères Réconciliés LFI 2026)

Le **Batch 1** intègre le périmètre intégral de 7 ministères conformément à la LFI 2026 et au DPPD-PAP 2026–2028 :

### 1. MAIED (`gov-033` / Section DGBF 439) — Ministère Délégué chargé de l'Intégration Africaine et des Ivoiriens de l'Extérieur
- **Total LFI 2026** : **5 122 516 889 FCFA**
- **Programmes & Actions** : 3 programmes DGBF, 7 actions officielles.
- **Sources documentaires** :
  - Section DPPD-PAP : PDF pages 1087–1102 (Document pages 1085–1100 sur 1227)
  - Tableau récapitulatif LFI 2026 : PDF page 53 (Document page 51 sur 583)
- **Contrôles Arithmétiques & Pagination Tableau 7** :
  - `21234` Administration Générale : 3 743 491 132 FCFA (2 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1097 / Document page 1095.
  - `22145` Intégration Africaine : 1 153 795 757 FCFA (2 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1099 / Document page 1097.
  - `22146` Ivoiriens de l'extérieur : 225 230 000 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1102 / Document page 1100.
  - Somme des programmes = 5 122 516 889 FCFA (delta = 0).

### 2. MAM (`gov-032` / Section DGBF 440) — Ministère Délégué chargé des Affaires Maritimes
- **Total LFI 2026** : **13 746 365 872 FCFA**
- **Programmes & Actions** : 2 programmes DGBF, 7 actions officielles.
- **Sources documentaires** :
  - Section DPPD-PAP : PDF pages 1103–1116 (Document pages 1101–1114 sur 1227)
  - Tableau récapitulatif LFI 2026 : PDF page 54 (Document page 52 sur 583)
- **Contrôles Arithmétiques & Pagination Tableau 7** :
  - `21237` Administration générale : 8 311 959 782 FCFA (4 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1111 / Document page 1109.
  - `22115` Transport maritime et fluvio-lagunaire : 5 434 406 090 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1114 / Document page 1112.
  - Somme des programmes = 13 746 365 872 FCFA (delta = 0).

### 3. MFPMA (`gov-003` / Section DGBF 237) — Ministère de la Fonction Publique et de la Modernisation de l'Administration
- **Total LFI 2026** : **45 121 940 916 FCFA**
- **Programmes & Actions** : 3 programmes DGBF, 7 actions officielles.
- **Sources documentaires** :
  - Section DPPD-PAP : PDF pages 95–114 (Document pages 93–112 sur 1227)
  - Tableau récapitulatif LFI 2026 : PDF page 47 (Document page 45 sur 583)
- **Contrôles Arithmétiques & Pagination Tableau 7** :
  - `21042` Administration Générale : 28 450 607 800 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 104 / Document page 102.
  - `22043` Fonction Publique : 14 396 485 400 FCFA (2 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 108 / Document page 106.
  - `22066` Modernisation de l'Administration : 2 274 847 716 FCFA (2 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 112 / Document page 110.
  - Somme des programmes = 45 121 940 916 FCFA (delta = 0).

### 4. MEPS (`gov-023` / Section DGBF 362) — Ministère de l'Emploi et de la Protection Sociale
- **Total LFI 2026** : **91 411 414 044 FCFA**
- **Programmes & Actions** : 4 programmes DGBF, 15 actions officielles.
- **Sources documentaires** :
  - Section DPPD-PAP : PDF pages 987–1012 (Document pages 985–1010 sur 1227)
  - Tableau récapitulatif LFI 2026 : PDF page 53 (Document page 51 sur 583)
- **Contrôles Arithmétiques & Pagination Tableau 7** :
  - `21150` Administration Générale : 35 849 618 984 FCFA (4 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1000 / Document page 998.
  - `22151` Emploi : 2 451 846 262 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1003 / Document page 1001.
  - `22152` Travail : 6 374 402 905 FCFA (4 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1005 / Document page 1003.
  - `22153` Protection sociale : 46 735 545 893 FCFA (4 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1009 / Document page 1007.
  - Somme des programmes = 91 411 414 044 FCFA (delta = 0).

### 5. MSCV (`gov-030` / Section DGBF 444) — Ministère Délégué chargé des Sports et du Cadre de Vie
- **Total LFI 2026** : **70 427 777 385 FCFA**
- **Programmes & Actions** : 4 programmes DGBF, 11 actions officielles.
- **Sources documentaires** :
  - Section DPPD-PAP : PDF pages 1117–1137 (Document pages 1115–1135 sur 1227)
  - Tableau récapitulatif LFI 2026 : PDF page 54 (Document page 52 sur 583)
- **Contrôles Arithmétiques & Pagination Tableau 7** :
  - `21081` Administration Générale : 17 906 782 766 FCFA (4 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1125 / Document page 1123.
  - `22082` Sport : 39 900 994 619 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1131 / Document page 1129.
  - `23241` Appui au développement durable du sport : 10 900 000 000 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1134 / Document page 1132.
  - `23249` Appui à l'entretien et à la sécurisation des infrastructures : 1 720 000 000 FCFA (1 action, delta = 0) — DPPD-PAP Tableau 7 : PDF page 1135 / Document page 1133.
  - Somme des programmes = 70 427 777 385 FCFA (delta = 0).

### 6. MICOM (`gov-017` / Section DGBF 336) — Ministère de la Communication
- **Total LFI 2026** : **39 806 735 298 FCFA**
- **Programmes & Actions** : 5 programmes DGBF, 9 actions officielles.
- **Sources documentaires** :
  - Section DPPD-PAP : PDF pages 633–656 (Document pages 631–654 sur 1227)
  - Tableau récapitulatif LFI 2026 : PDF page 49 (Document page 47 sur 583)
- **Contrôles Arithmétiques & Pagination Tableau 7** :
  - `21077` Administration Générale : 7 354 634 682 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 644 / Document page 642.
  - `22078` Communication et médias : 12 252 100 615 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 648 / Document page 646.
  - `23223` Appui au financement de la Radiodiffusion Télévision Ivoirienne (RTI) : 16 465 000 001 FCFA (1 action, delta = 0) — DPPD-PAP Tableau 7 : PDF page 651 / Document page 649.
  - `23224` Appui au financement de la Société Ivoirienne de Télédiffusion (IDT) : 2 035 000 000 FCFA (1 action, delta = 0) — DPPD-PAP Tableau 7 : PDF page 653 / Document page 651.
  - `23225` Appui au financement du secteur des médias : 1 700 000 000 FCFA (1 action, delta = 0) — DPPD-PAP Tableau 7 : PDF page 654 / Document page 652.
  - Somme des programmes = 39 806 735 298 FCFA (delta = 0).

### 7. METFPA (`gov-034` / Section DGBF 334) — Ministère de l'Enseignement Technique, de la Formation Professionnelle et de l'Apprentissage
- **Total LFI 2026** : **182 301 855 312 FCFA**
- **Programmes & Actions** : 4 programmes DGBF, 10 actions officielles.
- **Sources documentaires** :
  - Section DPPD-PAP : PDF pages 539–565 (Document pages 537–563 sur 1227)
  - Tableau récapitulatif LFI 2026 : PDF page 49 (Document page 47 sur 583)
- **Contrôles Arithmétiques & Pagination Tableau 7** :
  - `21210` Administration Générale : 14 408 855 796 FCFA (4 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 548 / Document page 546.
  - `22063` Formation professionnelle et apprentissage : 111 002 347 046 FCFA (3 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 552 / Document page 550.
  - `22219` Enseignement secondaire technique : 10 890 652 470 FCFA (1 action, delta = 0) — DPPD-PAP Tableau 7 : PDF page 561 / Document page 559.
  - `23220` Fonds de Développement de la Formation Professionnelle (FDFP) : 46 000 000 000 FCFA (2 actions, delta = 0) — DPPD-PAP Tableau 7 : PDF page 563 / Document page 561.
  - Somme des programmes = 182 301 855 312 FCFA (delta = 0).

---

## 4. Volume Budgétaire et Progression de la Couverture

| Étape | Ministères Validés | Montant Total Voté (FCFA) | % du Budget National 2026 (17 350,2 Mds) |
| :--- | :--- | :--- | :--- |
| **LOT 2 (MMPE Pilote)** | 1 (MMPE) | 706 060 209 015 | 4,07 % |
| **LOT 4 (4 Pilotes)** | 5 (+ MJDH, MEER, MINEDDTE, MINEF) | 1 709 532 071 645 | 9,85 % |
| **LOT 5 (Batch 1 - 7 Ministères Réconciliés LFI)** | 12 (+ MAIED, MAM, MFPMA, MEPS, MSCV, MICOM, METFPA) | **2 157 470 677 361** | **12,43 %** |

Le volume financier audité, réconcilié à l'euro/centime près (delta = 0) et documenté verbatim atteint désormais **2 157,47 milliards FCFA**, couvrant les secteurs stratégiques de l'énergie, des infrastructures routières, de la justice, de l'environnement, des forêts, des affaires maritimes, de l'intégration africaine, de l'emploi, des sports, de la communication, de la formation professionnelle et de la fonction publique.

---

## 5. Analyse des Entités Restantes (23 Institutions) et Raisons de Blocage / Différé

Les 23 institutions restantes sont classées de manière transparente dans `MINISTRY_DOCUMENTATION_REGISTRY_2026.json` :

1. **Section Partagée Unifiée (`gov-009` & `gov-035` / Section 229)** :
   - *Ministère de l'Agriculture et du Développement Rural* et *Ministère Délégué chargé des Productions Vivrières* partagent la section 229 unifiée de la LFI.
   - Requiert une convention formelle de dissociation institutionnelle des programmes DGBF.
2. **Structure Institutionnelle Spécifique sans Tableau 7 PAP Standard (`gov-001` / Section 108)** :
   - *Primature* : dotation spécifique en LFI, requiert une analyse détaillée des dotations de souveraineté.
3. **Périmètres Ministériels Complexes programmés pour les Batches Ultérieurs (Lot 6)** :
   - Grands ministères sociaux et régaliens (`gov-002` Défense, `gov-006` Intérieur, `gov-004` Affaires Étrangères, `gov-022` Enseignement Supérieur, `gov-024` Éducation Nationale, `gov-013` Santé) : nécessitent un traitement étendu pour leurs nombreux comptes spéciaux, universités et régies déconcentrées.
4. **Ministères sectoriels planifiés pour Lot 6** :
   - `gov-010`, `gov-011`, `gov-012`, `gov-014`, `gov-015`, `gov-016`, `gov-019`, `gov-020`, `gov-021`, `gov-026`, `gov-027`, `gov-028`, `gov-029` : documentation disponible, programmée pour les prochains batches d'intégration.

---

## 6. Fixtures de Test Indépendantes et Barrières de Sécurité

1. **Fixtures Golden Documentaires Indépendantes** :
   - Fichier : `src/budget-ingestion/__tests__/fixtures/independentDocumentaryGolden.ts`.
   - Contient `INDEPENDENT_LFI_REFERENCES_2026` et `INDEPENDENT_DOCUMENTARY_GOLDEN_2026` codés en dur à partir des documents officiels primaires (LFI 2026 pp. 45–54 et DPPD-PAP Annexe 4 Tableau 7).
   - Protège contre toute régression, dérive de total ou falsification de libellé.
2. **Tests d'Intégration et Négatifs (`src/budget-ingestion/__tests__/lot5Generalization.test.ts`)** :
   - 29 tests validant :
     - Ingestion complète et statut `RECONCILED` (delta = 0) pour tous les 7 ministères du Batch 1.
     - Règle stricte d'isolation : seul MMPE (`gov-008`) est `PUBLISHED` ; les 7 ministères sont `STAGED`.
     - Tests négatifs de sensibilité : omission d'un programme LFI, altération d'un total, altération d'une action, tentative de publication directe non autorisée.
3. **Tests de Régression Pilotes (`src/budget-ingestion/__tests__/pilotMinistries.test.ts`)** :
   - 15 tests validant l'intégrité intacte des 4 pilotes du LOT 4 et du registre central.
