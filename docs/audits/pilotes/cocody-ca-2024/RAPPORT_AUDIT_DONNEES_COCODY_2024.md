# Rapport d'Audit des Données Financières Réelles : Cocody 2024
## Réconciliation Documentaire, Contrôles Arithmétiques & Écart de Report Antérieur

**Institution :** Commune de Cocody (`inst-com-cocody`)  
**Type d'entité :** Collectivité Territoriale — Commune (`COMMUNE` / `MAIRIE`)  
**Exercice budgétaire :** 2024  
**Nature de l'acte :** Compte Administratif (CA) d'exécution financière  
**Document source :** Fascicule officiel de 44 pages en 2 parties, numérisation scan HP, visé et approuvé par la Préfecture d'Abidjan le 22 juillet 2025 (Arrêté n° 002/PA/D.CAB)  
**Empreinte cryptographique combinée :** `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`

---

## 1. Synthèse Générale des Données Officielles

Le Compte Administratif 2024 de la Commune de Cocody retrace l'exécution définitive des recettes recouvrées et des dépenses ordonnancées pour l'exercice clos au 31 décembre 2024.

Le document physique fait apparaître deux tableaux pivots d'arbitrage financier :
1. **Tableau Récapitulatif du Compte Administratif** (Page PDF 40, correspondant à la page imprimée 41/45 du fascicule officiel).
2. **Tableau de Composition du Patrimoine & Investissements** (Page PDF 43, correspondant à la page imprimée 44/45).

---

## 2. Tableau Récapitulatif Officiel (Page PDF 40 / Imprimée 41/45)

| Section Budgétaire | Prévisions Définitives (FCFA) | Recettes Recouvrées (FCFA) | Dépenses Ordonnancées (FCFA) | Solde de Section (FCFA) |
|---|---:|---:|---:|---:|
| **Fonctionnement** | 18 441 235 000 | 17 646 256 543 | 15 409 122 753 | +2 237 133 790 *(Excédent)* |
| **Investissement** | 3 900 630 000 | 1 366 100 690 | 1 366 100 690 | 0 *(Équilibre strict)* |
| **TOTAL GÉNÉRAL** | **22 341 865 000** | **19 012 357 233** | **16 775 223 443** | **+2 237 133 790** *(Excédent)* |

### Indicateurs de Clôture et de Trésorerie Déclarés
- **Excédent net de l'exercice courant (2024) :** `2 237 133 790` FCFA.
- **Résultat antérieur reporté (Report à nouveau) :** `944` FCFA.
- **Résultat cumulé de clôture (Excédentaire) :** `2 237 134 734` FCFA.

---

## 3. Tableau Patrimonial et Détail des Investissements (Page PDF 43 / Imprimée 44/45)

| Catégorie Patrimoniale | Prévisions (FCFA) | Réalisations (FCFA) | Taux de Réalisation |
|---|---:|---:|:---:|
| **Immobilier** (Terrains, voiries, bâtiments municipaux) | 3 231 678 000 | 810 959 095 | 25,10 % |
| **Incorporel** (Études, logiciels, droits) | 20 000 000 | 20 000 000 | 100,00 % |
| **Mobilier** (Véhicules, matériel technique, mobilier de bureau) | 648 952 000 | 535 141 595 | 82,46 % |
| **TOTAL PATRIMOINE / INVESTISSEMENTS** | **3 900 630 000** | **1 366 100 690** | **35,02 %** |

---

## 4. Rapprochement et Contrôles Arithmétiques Exhaustifs

### 4.1. Contrôles de Cohérence Interne du Tableau Récapitulatif
1. **Somme des prévisions :**  
   $$18\,441\,235\,000 + 3\,900\,630\,000 = 22\,341\,865\,000 \text{ FCFA} \quad \mathbf{[PASS]}$$
2. **Somme des recettes recouvrées :**  
   $$17\,646\,256\,543 + 1\,366\,100\,690 = 19\,012\,357\,233 \text{ FCFA} \quad \mathbf{[PASS]}$$
3. **Somme des dépenses ordonnancées :**  
   $$15\,409\,122\,753 + 1\,366\,100\,690 = 16\,775\,223\,443 \text{ FCFA} \quad \mathbf{[PASS]}$$
4. **Calcul de l'excédent de l'exercice :**  
   $$\text{Recettes totales} - \text{Dépenses totales} = 19\,012\,357\,233 - 16\,775\,223\,443 = 2\,237\,133\,790 \text{ FCFA} \quad \mathbf{[PASS]}$$
5. **Vérification du résultat cumulé avec report antérieur :**  
   $$2\,237\,133\,790 \text{ (exercice courant)} + 944 \text{ (report antérieur)} = 2\,237\,134\,734 \text{ FCFA} \quad \mathbf{[PASS]}$$

### 4.2. Rapprochement Récapitulatif (Page 40) $\longleftrightarrow$ Patrimoine (Page 43)
- **Prévisions d'investissement page 40 :** $3\,900\,630\,000$ FCFA.  
  **Total prévu tableau patrimonial page 43 :** $3\,231\,678\,000 + 20\,000\,000 + 648\,952\,000 = 3\,900\,630\,000$ FCFA.  
  $\longrightarrow$ **Concordance parfaite au franc près [PASS].**

- **Dépenses d'investissement ordonnancées page 40 :** $1\,366\,100\,690$ FCFA.  
  **Total réalisé tableau patrimonial page 43 :** $810\,959\,095 + 20\,000\,000 + 535\,141\,595 = 1\,366\,100\,690$ FCFA.  
  $\longrightarrow$ **Concordance parfaite au franc près [PASS].**

---

## 5. Analyse de l'Écart de 944 FCFA (Report à Nouveau Antérieur)

### Nature Juridique et Comptable
Dans la comptabilité publique des collectivités territoriales en Côte d'Ivoire (régie par le décret portant régime financier des communes et les instructions du Trésor Public), le résultat d'un exercice se décompose en :
1. **Le résultat propre de l'exercice $N$ :** différence entre les recettes de gestion recouvrées et les dépenses de gestion ordonnancées. Pour Cocody 2024 : $+2\,237\,133\,790$ FCFA.
2. **Le résultat cumulé des exercices antérieurs (Report à nouveau) :** solde non affecté des comptes administratifs des exercices précédents transmis par le receveur municipal (CTI / SYGIDAN). Pour Cocody, ce montant s'établit exactement à $+944$ FCFA.
3. **Le résultat cumulé définitif :** somme arithmétique exacte des deux grandeurs, soit $2\,237\,134\,734$ FCFA.

### Traitement sur SuiviBudget Côte d'Ivoire
- **Règle d'or appliquée :** Ne jamais imputer cet écart à une erreur de saisie ni forcer artificiellement un solde.
- Le champ `surplus_or_deficit` enregistre l'excédent propre de l'exercice courant ($2\,237\,133\,790$ FCFA).
- Le report à nouveau ($944$ FCFA) et le résultat cumulé ($2\,237\,134\,734$ FCFA) sont consignés de manière explicite dans les notes méthodologiques et le journal d'audit de la provenance documentaire (`import_provenance.notes`).

---

## 6. Confrontation avec le Fichier CSV Fourni

Le fichier CSV d'extraction intermédiaire (`media_1791899694031_0b918bc2.csv`) a été confronté ligne par ligne aux pages sources physiques :

| Ligne CSV | Section / Indicateur | Montant CSV (FCFA) | Montant Source Physique | Concordance |
|:---:|---|---:|---:|:---:|
| L2 | Fonctionnement — Prévisions | 18 441 235 000 | 18 441 235 000 (p. 40) | **CONFORME** |
| L3 | Fonctionnement — Recettes | 17 646 256 543 | 17 646 256 543 (p. 40) | **CONFORME** |
| L4 | Fonctionnement — Dépenses | 15 409 122 753 | 15 409 122 753 (p. 40) | **CONFORME** |
| L5 | Investissement — Prévisions | 3 900 630 000 | 3 900 630 000 (p. 40) | **CONFORME** |
| L6 | Investissement — Recettes | 1 366 100 690 | 1 366 100 690 (p. 40) | **CONFORME** |
| L7 | Investissement — Dépenses | 1 366 100 690 | 1 366 100 690 (p. 40) | **CONFORME** |
| L8 | Total — Recettes | 19 012 357 233 | 19 012 357 233 (p. 40) | **CONFORME** |
| L9 | Total — Dépenses | 16 775 223 443 | 16 775 223 443 (p. 40) | **CONFORME** |
| L10 | Résultat — Excédent courant | 2 237 133 790 | 2 237 133 790 (p. 40) | **CONFORME** |
| L11 | Résultat — Résultat cumulé | 2 237 134 734 | 2 237 134 734 (p. 40) | **CONFORME** |
| L12 | Patrimoine Immobilier — Prévu | 3 231 678 000 | 3 231 678 000 (p. 43) | **CONFORME** |
| L13 | Patrimoine Immobilier — Réalisé | 810 959 095 | 810 959 095 (p. 43) | **CONFORME** |
| L14 | Patrimoine Incorporel — Prévu | 20 000 000 | 20 000 000 (p. 43) | **CONFORME** |
| L15 | Patrimoine Incorporel — Réalisé | 20 000 000 | 20 000 000 (p. 43) | **CONFORME** |
| L16 | Patrimoine Mobilier — Prévu | 648 952 000 | 648 952 000 (p. 43) | **CONFORME** |
| L17 | Patrimoine Mobilier — Réalisé | 535 141 595 | 535 141 595 (p. 43) | **CONFORME** |

**Observation technique :** Le fichier CSV est rigoureusement exact sur les montants mais constitue un fichier tabulaire de contrôle intermédiaire. Il ne respecte pas l'enveloppe JSON attendue par les RPC Supabase (`kind`, `precision`, `source`, `data`). Sa conversion vers le schéma cible est modélisée dans le document `MAPPING_DONNEES_COCODY_2024.md`.

---

## 7. Comparaison avec les Données Existantes dans SuiviBudget

1. **Existence d'un CA antérieur ou concurrent :**
   - Aucune donnée de Compte Administratif pour Cocody pour l'exercice 2024 n'est actuellement publiée sur la plateforme (`dataStore.getCAForInstitution('inst-com-cocody', 2024)` renvoie `undefined`).
   - L'importation de cette ligne ne risque d'écraser aucun historique existant.

2. **Présence d'un Budget Primitif 2026 :**
   - Le référentiel `localBudgetsReferential.ts` contient la délibération du Budget Primitif 2026 de Cocody (`lbud-cocody-2026`, 19 725 000 000 FCFA), assortie d'une réserve de source documentée (`operating_amount: null`, `investment_amount: null`, `UNKNOWN`).
   - Le Compte Administratif 2024 est un acte distinct, sur un exercice antérieur clos, qui coexiste sans interférence avec les prévisions 2026.

---

## 8. Taux d'Exécution et Indicateurs Civiques

| Indicateur | Formule | Ratio Calculé | Lecture Civique pour le Citoyen |
|---|---|:---:|---|
| **Taux d'Exécution Global (Dépenses)** | $\frac{16\,775\,223\,443}{22\,341\,865\,000}$ | **75,08 %** | 3/4 des crédits prévus ont été effectivement ordonnancés. |
| **Taux de Recouvrement Global (Recettes)** | $\frac{19\,012\,357\,233}{22\,341\,865\,000}$ | **85,10 %** | Bonne mobilisation des recettes propres et dotations. |
| **Exécution Fonctionnement (Dépenses)** | $\frac{15\,409\,122\,753}{18\,441\,235\,000}$ | **83,56 %** | Dépenses de fonctionnement bien maîtrisées par rapport aux prévisions. |
| **Recouvrement Fonctionnement** | $\frac{17\,646\,256\,543}{18\,441\,235\,000}$ | **95,69 %** | Très fort recouvrement des recettes de fonctionnement. |
| **Exécution Investissement (Dépenses)** | $\frac{1\,366\,100\,690}{3\,900\,630\,000}$ | **35,02 %** | **Point de vigilance :** Seul un tiers des investissements prévus a été ordonnancé sur l'exercice. |
| **Recouvrement Investissement** | $\frac{1\,366\,100\,690}{3\,900\,630\,000}$ | **35,02 %** | Égalité exacte entre recettes recouvrées et dépenses ordonnancées d'investissement. |

---

## 9. Recommandations d'Intégrité Financière

1. **Principe 7 de la Charte (Financial $\neq$ Physical) :**  
   Les montants d'investissement ordonnancés ($1\,366\,100\,690$ FCFA) attestent d'engagements et mandats comptables émis par la collectivité. Ils ne prouvent en aucun cas l'achèvement physique réel des chantiers sans constats terrain vérifiés sur l'Observatoire Citoyen.
2. **Statut de Publication :**  
   Le document doit être maintenu au statut **NON PUBLIÉ / EN ATTENTE DE VALIDATION HUMAINE** jusqu'à relecture contradictoire des pièces par l'administrateur dans l'interface de gestion.
