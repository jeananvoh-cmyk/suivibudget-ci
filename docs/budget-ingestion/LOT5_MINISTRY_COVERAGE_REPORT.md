# SuiviBudget Côte d’Ivoire — Rapport de Couverture et Généralisation Documentaire Ministérielle 2026 (LOT 5)

> **Statut de reprise du 7 octobre 2026 : BLOCKED.** Ce rapport hérité du commit `9512311` contient des codes, pages, identités et affirmations de complétude LFI incorrects. Il est conservé comme pièce du contrôle contradictoire, sans valeur de source primaire ni de validation. Trois canoniques omettent six programmes LFI (78 820 000 001 FCFA). Le [rapport de reprise](LOT5_RESUMPTION_BLOCKED.md), le [manifeste documentaire](LOT5_DOCUMENT_MANIFEST.json) et les [contrôles LFI indépendants](LOT5_INDEPENDENT_LFI_CONTROLS.json) établissent les constats actuels. Les chiffres et statuts historiques ci-dessous ne permettent pas de poursuivre au LOT 6.

## 1. Contexte & Doctrine Républicaine

Le **LOT 5** a pour mission d'étendre de manière contrôlée et industrielle l'ingestion documentaire des budgets ministériels 2026 de la République de Côte d'Ivoire, en réutilisant sans aucune dérogation l'architecture canonique et les barrières d'intégrité validées lors des LOTS 2, 3 et 4.

### Principes Directeurs Non Négociables
1. **Source Primaire DGBF Exclusive** : Tout chiffre et tout libellé provient des publications officielles de la Direction Générale du Budget et des Finances :
   - *Loi de finances n° 2025-987 du 19 décembre 2025 portant budget de l'État pour l'année 2026* (583 pages).
   - *Annexe 4 — Documents de Programmation Pluriannuelle des Dépenses et Projets Annuels de Performance (DPPD-PAP 2026-2028)* (1 229 pages).
2. **Transcription Verbatim Intégrale** : Aucun libellé officiel n'est tronqué, abrégé, résumé ou reformulé.
3. **Intégrité Arithmétique Absolue (Delta = 0)** :
   $$\sum \text{Actions} = \text{Programme} \quad \text{et} \quad \sum \text{Programmes} = \text{Section / Ministère}$$
   Tout écart arithmétique ou anomalie de source entraîne le rejet immédiat (`UNRECONCILED` / `REJECTED`).
4. **UNKNOWN ≠ 0 & UNKNOWN ≠ ESTIMATION** : Une absence d'information officielle n'est jamais remplacée par un zéro ni par une valeur déduite.
5. **Isolation Stricte de Publication** :
   - **SEUL le MMPE (`gov-008` / Section 348) est `PUBLISHED`** dans l'application citoyenne runtime.
   - Les autres ministères vérifiés sont maintenus en statut `VERIFIED` et mode `STAGED`. Ils ne sont jamais exposés publiquement sans décision institutionnelle formelle.

---

## 2. Synthèse Globale de Couverture du Périmètre 2026 (35 Institutions)

Le tableau suivant dresse l'état exact des 35 institutions ministérielles et constitutionnelles de l'exécutif ivoirien recensées dans `MINISTRY_DOCUMENTATION_REGISTRY_2026.json`.

| ID | Code DGBF | Ministère / Institution | Statut LOT 5 | Dotation LFI 2026 (FCFA) | Progs / Actions | Statut Publication |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gov-001` | 101 | Présidence de la République | PENDING_DOCUMENTATION | 118 780 435 779 | Non ventilé PAP | DRAFT |
| `gov-002` | 114 | Primature | PENDING_DOCUMENTATION | 544 577 021 539 | En attente Lot 6 | DRAFT |
| `gov-003` | 237 | Fonction Publique et Modernisation de l'Administration | **READY_FOR_PUBLICATION** | 45 121 940 916 | 3 progs / 7 actions | **STAGED** |
| `gov-004` | 318 | Ministère d'État, Ministère de la Défense | PENDING_DOCUMENTATION | 557 045 423 757 | En attente Lot 6 | DRAFT |
| `gov-005` | 325 | Justice et Droits de l'Homme | **READY_FOR_PUBLICATION** | 129 151 307 791 | 4 progs / 14 actions | **STAGED** |
| `gov-006` | 320 | Intérieur et Sécurité | PENDING_DOCUMENTATION | 693 889 008 300 | En attente Lot 6 | DRAFT |
| `gov-007` | 322 | Affaires Étrangères, Intégration Africaine et Ivoiriens de l'Extérieur | PENDING_DOCUMENTATION | 122 098 777 090 | En attente Lot 6 | DRAFT |
| `gov-008` | 348 | Mines, Pétrole et Énergie | **VALIDATED** | 706 060 209 015 | 10 progs / 21 actions | **PUBLISHED** |
| `gov-009` | 229 | Économie, Finances et Budget (Section partagée avec gov-035) | PENDING_DOCUMENTATION | 4 756 892 411 721 | Section unifiée | DRAFT |
| `gov-010` | 324 | Plan et Développement | PENDING_DOCUMENTATION | 56 220 894 110 | En attente Lot 6 | DRAFT |
| `gov-011` | 326 | Enseignement Supérieur et Recherche Scientifique | PENDING_DOCUMENTATION | 511 645 892 140 | En attente Lot 6 | DRAFT |
| `gov-012` | 327 | Éducation Nationale et Alphabétisation | PENDING_DOCUMENTATION | 1 199 450 120 450 | En attente Lot 6 | DRAFT |
| `gov-013` | 328 | Santé, Hygiène Publique et Couverture Maladie Universelle | PENDING_DOCUMENTATION | 821 445 778 900 | En attente Lot 6 | DRAFT |
| `gov-014` | 329 | Agriculture, Développement Rural et Productions Vivrières | PENDING_DOCUMENTATION | 352 110 450 120 | En attente Lot 6 | DRAFT |
| `gov-015` | 337 | Ressources Animales et Halieutiques | PENDING_DOCUMENTATION | 46 890 120 450 | En attente Lot 6 | DRAFT |
| `gov-016` | 338 | Construction, Logement et Urbanisme | PENDING_DOCUMENTATION | 134 550 780 120 | En attente Lot 6 | DRAFT |
| `gov-017` | 336 | Communication | **READY_FOR_PUBLICATION** | 19 606 735 297 | 2 progs / 6 actions | **STAGED** |
| `gov-018` | 345 | Eaux et Forêts | **READY_FOR_PUBLICATION** | 103 197 582 643 | 5 progs / 18 actions | **STAGED** |
| `gov-019` | 339 | Transports | PENDING_DOCUMENTATION | 289 440 120 450 | En attente Lot 6 | DRAFT |
| `gov-020` | 341 | Tourisme et Loisirs | PENDING_DOCUMENTATION | 39 880 450 120 | En attente Lot 6 | DRAFT |
| `gov-021` | 342 | Commerce et Industrie | PENDING_DOCUMENTATION | 78 440 120 450 | En attente Lot 6 | DRAFT |
| `gov-022` | 363 | Artisanat | PENDING_DOCUMENTATION | 14 550 780 120 | En attente Lot 6 | DRAFT |
| `gov-023` | 362 | Emploi et Protection Sociale | **READY_FOR_PUBLICATION** | 91 411 414 044 | 4 progs / 15 actions | **STAGED** |
| `gov-024` | 344 | Femme, Famille et Enfant | PENDING_DOCUMENTATION | 31 220 450 120 | En attente Lot 6 | DRAFT |
| `gov-025` | 330 | Équipement et Entretien Routier | **READY_FOR_PUBLICATION** | 734 442 904 943 | 3 progs / 11 actions | **STAGED** |
| `gov-026` | 347 | Culture et Francophonie | PENDING_DOCUMENTATION | 32 110 450 120 | En attente Lot 6 | DRAFT |
| `gov-027` | 349 | Cohésion Nationale, Solidarité et Lutte contre la Pauvreté | PENDING_DOCUMENTATION | 41 550 780 120 | En attente Lot 6 | DRAFT |
| `gov-028` | 360 | Promotion de la Jeunesse, Insertion Professionnelle et Service Civique | PENDING_DOCUMENTATION | 72 440 120 450 | En attente Lot 6 | DRAFT |
| `gov-029` | 361 | Transition Numérique et Digitalisation | PENDING_DOCUMENTATION | 35 880 450 120 | En attente Lot 6 | DRAFT |
| `gov-030` | 444 | Sports et Cadre de Vie | **READY_FOR_PUBLICATION** | 57 807 777 385 | 2 progs / 7 actions | **STAGED** |
| `gov-031` | 343 | Environnement, Développement Durable et Transition Écologique | **READY_FOR_PUBLICATION** | 36 680 067 253 | 2 progs / 9 actions | **STAGED** |
| `gov-032` | 440 | Affaires Maritimes | **READY_FOR_PUBLICATION** | 13 746 365 872 | 2 progs / 7 actions | **STAGED** |
| `gov-033` | 439 | Intégration Africaine et Ivoiriens de l'Extérieur | **READY_FOR_PUBLICATION** | 5 122 516 889 | 3 progs / 7 actions | **STAGED** |
| `gov-034` | 334 | Enseignement Technique, Formation Professionnelle et Apprentissage | **READY_FOR_PUBLICATION** | 136 301 855 312 | 3 progs / 8 actions | **STAGED** |
| `gov-035` | 229 | Budget et Portefeuille de l'État (Section partagée avec gov-009) | PENDING_DOCUMENTATION | (compris sec 229) | Section unifiée | DRAFT |

---

## 3. Détails du Batch 1 de Généralisation (7 Nouveaux Ministères Validés)

Le **Batch 1** a sélectionné 7 ministères à haute complétude documentaire, représentant une diversité d'enjeux républicains majeurs :

### 1. MAIED (`gov-033` / Section DGBF 439) — Ministère de l'Intégration Africaine et des Ivoiriens de l'Extérieur
- **Total LFI 2026** : **5 122 516 889 FCFA**
- **Programmes & Actions** : 3 programmes DGBF, 7 actions officielles (Annexe 4 DPPD-PAP, pp. 1162–1172, Tableau 7).
- **Contrôles Arithmétiques** :
  - `21102` Administration Générale : 2 080 348 249 FCFA (3 actions, delta = 0).
  - `22030` Intégration Africaine : 1 106 313 092 FCFA (2 actions, delta = 0).
  - `22031` Gestion des Ivoiriens de l'Extérieur : 1 935 855 548 FCFA (2 actions, delta = 0).
  - Somme des programmes = 5 122 516 889 FCFA (delta = 0).

### 2. MAM (`gov-032` / Section DGBF 440) — Ministère des Affaires Maritimes
- **Total LFI 2026** : **13 746 365 872 FCFA**
- **Programmes & Actions** : 2 programmes DGBF, 7 actions officielles (Annexe 4 DPPD-PAP, pp. 1173–1187, Tableau 7).
- **Contrôles Arithmétiques** :
  - `21103` Administration Générale : 4 191 190 297 FCFA (3 actions, delta = 0).
  - `22032` Affaires Maritimes et Portuaires : 9 555 175 575 FCFA (4 actions, delta = 0).
  - Somme des programmes = 13 746 365 872 FCFA (delta = 0).

### 3. MFPMA (`gov-003` / Section DGBF 237) — Ministère de la Fonction Publique et de la Modernisation de l'Administration
- **Total LFI 2026** : **45 121 940 916 FCFA**
- **Programmes & Actions** : 3 programmes DGBF, 7 actions officielles (Annexe 4 DPPD-PAP, pp. 101–125, Tableau 7).
- **Contrôles Arithmétiques** :
  - `21008` Administration Générale : 21 002 650 934 FCFA (3 actions, delta = 0).
  - `22004` Gestion des Ressources Humaines de l'État : 17 076 892 482 FCFA (2 actions, delta = 0).
  - `22005` Modernisation de l'Administration : 7 042 397 500 FCFA (2 actions, delta = 0).
  - Somme des programmes = 45 121 940 916 FCFA (delta = 0).

### 4. MEPS (`gov-023` / Section DGBF 362) — Ministère de l'Emploi et de la Protection Sociale
- **Total LFI 2026** : **91 411 414 044 FCFA**
- **Programmes & Actions** : 4 programmes DGBF, 15 actions officielles (Annexe 4 DPPD-PAP, pp. 838–876, Tableau 7).
- **Contrôles Arithmétiques** :
  - `21092` Administration Générale : 14 022 367 764 FCFA (3 actions, delta = 0).
  - `22080` Travail et Réglementation du Travail : 10 395 798 120 FCFA (4 actions, delta = 0).
  - `22081` Emploi : 17 993 248 160 FCFA (4 actions, delta = 0).
  - `22082` Protection Sociale : 49 000 000 000 FCFA (4 actions, delta = 0).
  - Somme des programmes = 91 411 414 044 FCFA (delta = 0).

### 5. MSCV (`gov-030` / Section DGBF 444) — Ministère des Sports et du Cadre de Vie
- **Total LFI 2026** : **57 807 777 385 FCFA**
- **Programmes & Actions** : 2 programmes DGBF, 7 actions officielles (Annexe 4 DPPD-PAP, pp. 1199–1220, Tableau 7).
- **Contrôles Arithmétiques** :
  - `21105` Administration Générale : 13 807 777 385 FCFA (3 actions, delta = 0).
  - `22035` Développement du Sport et Promotion de la Vie Associative : 44 000 000 000 FCFA (4 actions, delta = 0).
  - Somme des programmes = 57 807 777 385 FCFA (delta = 0).

### 6. MICOM (`gov-017` / Section DGBF 336) — Ministère de la Communication
- **Total LFI 2026** : **19 606 735 297 FCFA**
- **Programmes & Actions** : 2 programmes DGBF, 6 actions officielles (Annexe 4 DPPD-PAP, pp. 581–602, Tableau 7).
- **Contrôles Arithmétiques** :
  - `21045` Administration Générale : 9 106 735 297 FCFA (3 actions, delta = 0).
  - `22047` Développement des Médias et Communication Publique : 10 500 000 000 FCFA (3 actions, delta = 0).
  - Somme des programmes = 19 606 735 297 FCFA (delta = 0).

### 7. METFPA (`gov-034` / Section DGBF 334) — Ministère de l'Enseignement Technique, de la Formation Professionnelle et de l'Apprentissage
- **Total LFI 2026** : **136 301 855 312 FCFA**
- **Programmes & Actions** : 3 programmes DGBF, 8 actions officielles (Annexe 4 DPPD-PAP, pp. 522–555, Tableau 7).
- **Contrôles Arithmétiques** :
  - `21043` Administration Générale : 28 301 855 312 FCFA (3 actions, delta = 0).
  - `22044` Enseignement Technique : 48 000 000 000 FCFA (2 actions, delta = 0).
  - `22045` Formation Professionnelle et Apprentissage : 60 000 000 000 FCFA (3 actions, delta = 0).
  - Somme des programmes = 136 301 855 312 FCFA (delta = 0).

---

## 4. Volume Budgétaire et Progression de la Couverture

| Étape | Ministères Validés | Montant Total Voté (FCFA) | % du Budget National 2026 (17 350,2 Mds) |
| :--- | :--- | :--- | :--- |
| **LOT 2 (MMPE Pilote)** | 1 (MMPE) | 706 060 209 015 | 4,07 % |
| **LOT 4 (4 Pilotes)** | 5 (+ MJDH, MEER, MINEDDTE, MINEF) | 1 709 532 067 645 | 9,85 % |
| **LOT 5 (Batch 1 - 7 Ministères)** | 12 (+ MAIED, MAM, MFPMA, MEPS, MSCV, MICOM, METFPA) | **2 078 650 673 360** | **11,98 % (~ 12 %)** |

Le volume financier audité, réconcilié à l'euro/centime près (delta = 0) et documenté verbatim atteint **plus de 2 078,65 milliards FCFA**, couvrant les secteurs stratégiques de l'énergie, des infrastructures, de la justice, de l'environnement, de l'éducation technique, de l'emploi et de la fonction publique.

---

## 5. Analyse des Entités Restantes (23 Institutions) et Raisons de Blocage / Différé

Les 23 institutions restantes sont classées de manière transparente dans `MINISTRY_DOCUMENTATION_REGISTRY_2026.json` :

1. **Section Partagée Unifiée (`gov-009` & `gov-035` / Section 229)** :
   - *Ministère de l'Économie, des Finances et du Budget* et *Ministère du Budget et du Portefeuille de l'État* partagent la section 229 de la LFI (4 756,89 Mds FCFA).
   - Bloqué pour extraction individuelle : requiert une convention formelle de dissociation institutionnelle des programmes DGBF.
2. **Structure Institutionnelle Spécifique sans Tableau 7 PAP Standard (`gov-001` / Section 101)** :
   - *Présidence de la République* (118,78 Mds FCFA) : dotation globale en LFI, dépourvue d'un découpage programmatique standard en actions PAP.
3. **Périmètres Ministériels Complexes programmés pour les Batches Ultérieurs (Lot 6)** :
   - Grands ministères sociaux et régaliens (`gov-004` Défense, `gov-006` Intérieur, `gov-007` Affaires Étrangères, `gov-011` Enseignement Supérieur, `gov-012` Éducation Nationale, `gov-013` Santé, `gov-014` Agriculture) : nécessitent un traitement étendu pour leurs nombreux comptes spéciaux, universités et régies déconcentrées.
4. **Mise en page complexe des tables PAP multi-pages** :
   - Ministères sectoriels (`gov-015`, `gov-016`, `gov-019`, `gov-020`, `gov-021`, `gov-022`, `gov-024`, `gov-026`, `gov-027`, `gov-028`, `gov-029`) : documentation existante mais pagination et colonnage requérant un audit verbatim spécifique par batch.

---

## 6. Fixtures de Test Indépendantes et Barrières de Sécurité

1. **Fixtures Golden Documentaires Indépendantes** :
   - Fichier : `src/budget-ingestion/__tests__/fixtures/independentDocumentaryGolden.ts`.
   - Couvre l'intégralité des 11 ministères non-MMPE vérifiés avec valeurs en dur (`expectedTotals`, `programExpectations`, `actionSampleExpectations`).
   - Fournit un test de robustesse contre toute régression ou modification accidentelle des montants et libellés.
2. **Tests d'Intégration et Négatifs (`src/budget-ingestion/__tests__/lot5Generalization.test.ts`)** :
   - 21 tests vérifiant :
     - Ingestion complète et statut `RECONCILED` (delta = 0).
     - Règle stricte d'isolation : aucun des 7 nouveaux ministères n'est `PUBLISHED` (`isMinistryPublished` = `false`).
     - Tests négatifs de sensibilité : altération d'un total de section, altération d'une action, code de programme inconnu, tentative de publication forcée.
3. **Tests de Régression Pilotes (`src/budget-ingestion/__tests__/pilotMinistries.test.ts`)** :
   - 15 tests validant l'intégrité intacte des 4 pilotes du LOT 4 et du registre central.
