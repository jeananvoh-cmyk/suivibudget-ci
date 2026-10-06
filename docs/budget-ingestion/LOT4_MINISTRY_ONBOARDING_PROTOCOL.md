# Protocole d'Onboarding Budgétaire Ministériel — SuiviBudget Côte d'Ivoire

> **Version** : 1.0.0 (LOT 4 — Industrialisation documentaire)  
> **Statut** : Standard Opérationnel Obligatoire  
> **Cadre Juridique et Méthodologique** : Loi Organique relative aux Lois de Finances (LOLF n° 2014-337), Nomenclature Budget-Programmes DGBF, Directive UEMOA n° 06/2009.

---

## 1. Vision et Objectifs du Protocole

Ce protocole définit la méthode rigoureuse, reproductible et vérifiable permettant d'intégrer progressivement les budgets des **35 institutions ministérielles** de la République de Côte d'Ivoire dans la plateforme citoyenne **SuiviBudget**.

Il garantit que chaque donnée publiée dans l'espace public républicain est :
1. **Directement adossée à une source officielle primaire vérifiable** (Loi de Finances, Annexe 4 DPPD-PAP de la DGBF).
2. **Arithmétiquement réconciliée** ($\Delta = 0$ entre total ministériel, programmes et actions).
3. **Préservée de toute interprétation partisane ou extrapolation arbitraire**.

---

## 2. Le Cycle Immuable d'Ingestion Citoyenne

Tout ministère ou institution intégrant la plateforme doit obligatoirement traverser les 7 étapes séquentielles suivantes :

```
DOCUMENT OFFICIEL PRIMAIRE (DGBF / LFI)
               │
               ▼
   EXTRACTION DOCUMENTAIRE CONTRÔLÉE
               │
               ▼
 RÉFÉRENTIEL CANONIQUE MACHINE-READABLE (JSON)
               │
               ▼
 VALIDATION SYNTAXIQUE & STRUCTURELLE (0 'any')
               │
               ▼
  RÉCONCILIATION ARITHMÉTIQUE MULTI-NIVEAUX
               │
               ▼
   PORTAIL DE PUBLICATION (PUBLICATION GATE)
               │
       ┌───────┴───────┐
       ▼               ▼
   [GO]            [NO-GO]
NORMALISATION    BLOCAGE STRICT
 APPLICATION     (Écart / Inconnu)
```

---

## 3. Méthodologie d'Extraction et de Double Vérification

### Étape 1 : Identification de la Source Primaire
- Identifier la section budgétaire du ministère dans l'**Annexe 4 DPPD-PAP** (ex: `SECTION 325` pour la Justice, `SECTION 330` pour l'Équipement Routier).
- Noter les numéros de page exacts du document officiel (`doc_page`) et les numéros de page correspondants du fichier PDF (`pdf_page` = `doc_page + 2`).
- Recouper le montant total ministériel avec le tableau récapitulatif de la **Loi de Finances Initiale (LFI)** votée par le Parlement.

### Étape 2 : Extraction Déterministe des Tableaux
- Extraire le **Tableau 7** (« Budget détaillé du programme ») pour chaque programme de la section.
- Extraire les codes officiels DGBF à 5 chiffres pour les **Programmes** (`21xxx` pour administration générale, `22xxx` pour programmes métiers, `23xxx` pour comptes d'affectation spéciale).
- Extraire les codes officiels DGBF à 7 chiffres pour les **Actions** (`21xxxx1`, etc.).
- Extraire les montants de l'exercice voté (ex: Tranche 2026).

### Étape 3 : Contrôle de Double Vérification
- **Contrôle horizontal** : La somme des actions de chaque programme doit être rigoureusement égale au montant officiel du programme ($\sum \text{Actions} = \text{Programme}$).
- **Contrôle vertical** : La somme de l'ensemble des programmes doit être rigoureusement égale au total ministériel arrêté par la Loi de Finances ($\sum \text{Programmes} = \text{Total Ministère}$).
- Tout écart non nul ($\Delta \neq 0$) entraîne le blocage immédiat (`SOURCE_GAP`).

---

## 4. Les Invariants Absolus d'Intégrité Républicaine

Pour préserver l'éthique civique et la confiance publique, ces cinq invariants techniques et déontologiques sont **strictement non négociables** :

### 1. `UNKNOWN ≠ 0` (L'inconnu n'est jamais un zéro)
- Si une donnée financière ou un montant n'apparaît pas dans la source documentaire, il **doit rester `null`**.
- Il est formellement interdit de remplacer une valeur absente par `0`, par une moyenne ou par une estimation.
- Tout calcul dépendant d'une valeur `null` produit un statut `NOT_COMPARABLE`.

### 2. `0 = Vrai zéro documenté`
- Le nombre `0` n'est inscrit que lorsqu'un tableau officiel indique explicitement une dotation nulle pour l'exercice concerné (ex: projet d'investissement sans crédit ordonnancé sur l'année N, doté sur N+1).

### 3. `SOURCE_GAP ≠ RECONCILED`
- Un écart entre deux sources officielles ou entre la somme des actions et le programme ne doit **jamais** être dissimulé ou compensé.
- Il doit être constaté, documenté dans le rapport de contrôle, et bloquer la publication automatique.

### 4. `NOT_COMPARABLE ≠ RECONCILED`
- Une comparaison impossible (absence de décomposition, document incomplet) ne vaut pas réconciliation.
- L'impossibilité de calculer un écart numérique ne valide pas la publication.

### 5. `Budget Line ≠ Project` (Une ligne budgétaire n'est pas un projet)
- Une imputation budgétaire opérationnelle (activité à 11 chiffres) n'est pas nécessairement un projet d'investissement public.
- Les projets individualisés (PIP) doivent comporter `is_funded_within_action = true` pour interdire tout double comptage sur les crédits de l'action ou du ministère.

---

## 5. Architecture Pluriannuelle (DPPD 2026-2028)

Les documents DPPD-PAP présentent une trajectoire triennale glissante :
- **Année N (ex: 2026)** : Montant voté / autorisé (ferme).
- **Années N+1 et N+2 (ex: 2027 et 2028)** : Projections pluriannuelles indicatives.

### Règles de Traitement Pluriannuel :
1. Le référentiel canonique principal porte sur l'exercice budgétaire actif (2026).
2. Les tranches prévisionnelles 2027 et 2028 sont stockées dans les structures étendues (`multi_year_projections`), sans jamais être confondues avec les autorisations d'engagement de l'année en cours.
3. Aucune addition inter-annuelle : le budget annuel d'un ministère ne cumule jamais plusieurs exercices.

---

## 6. Préparation de l'Exécution Budgétaire & RAP (Rapports Annuels de Performance)

L'infrastructure SuiviBudget est conçue pour accueillir les données d'exécution au fur et à mesure de leur disponibilité légale :

### Distinction Définitive : Prévision vs Exécution
- **BP / LFI** = Prévision initiale votée par le Parlement.
- **LFR** = Loi de Finances Rectificative (réajustements en cours d'exercice).
- **RAP** = Rapport Annuel de Performance (constat d'exécution produit par chaque ministère en N+1).
- **Loi de Règlement** = Clôture définitive des comptes par la Cour des Comptes et le Parlement.

### Règle d'Or Technique :
Les champs d'exécution (`financial_execution`, `paid_amount`, `execution_rate`) :
- Restent `null` tant que le document officiel d'exécution (RAP / Loi de Règlement) n'a pas fait l'objet d'un processus d'ingestion vérifié.
- Ne sont jamais déduits d'une simple observation de terrain.
- Ne sont jamais extrapolés à partir des engagements initiaux.

---

## 7. Neutralité Civique et Présentation Républicaine

Conformément à la Charte Civique SuiviBudget :
1. **Absence de classement partisan** : Aucun classement de type « meilleur ministre » ou « ministère le moins transparent ».
2. **Langage factuel et sourcé** : Présenter uniquement les chiffres promulgués, les intitulés officiels et les références de pages.
3. **Droit à l'information (CAIDP)** : Chaque fiche institutionnelle intègre les coordonnées du Responsable de l'Information (RI) désigné auprès de la Commission d'Accès à l'Information d'Intérêt Public (CAIDP).
4. **Droit de réponse institutionnel** : Tout représentant ministériel peut apporter des éclaircissements documentés, lesquels sont horodatés et séparés des données primaires légales.
