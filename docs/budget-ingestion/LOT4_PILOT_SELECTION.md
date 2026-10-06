# LOT 4 — Sélection et Justification du Lot Pilote Ministériel Complémentaire
## SuiviBudget Côte d’Ivoire — Infrastructure Civique & Données Officielles

---

## 1. Contexte & Enjeux

Dans le cadre du **LOT 2** et du **LOT 3**, le premier pilote d'architecture et de réconciliation a été mené avec succès sur le **Ministère des Mines, du Pétrole et de l'Énergie (MMPE)** (`gov-008`, Section DGBF `348`) :
- 10 programmes budgétaires officiels
- 21 actions budgétaires
- 18 projets d'investissements rattachés
- Budget arrêté LFI 2026 : **706 060 209 015 FCFA**
- Équilibre arithmétique rigoureux : $\Delta = 0\text{ FCFA}$ (statut `RECONCILED`)
- Portail de publication : `canPublish = true`

L'objectif du **LOT 4** n'est pas d'ingérer aveuglément ou précipitamment les 34 autres ministères de l'État, mais de **démontrer la généricité réelle du moteur d'ingestion LOT 3** sur un échantillon représentatif de ministères présentant des profils budgétaires, institutionnels et documentaires contrastés.

---

## 2. Critères de Sélection Documentaire & Méthodologique

Pour tester la robustesse et l'universalité du pipeline sans complaisance (ne pas choisir uniquement les cas "faciles"), la sélection s'articule autour de 4 axes structurants :

| Axe d'Évaluation | Défi Technique / Budgétaire pour le Pipeline | Ministère Retenu |
| :--- | :--- | :--- |
| **1. Souveraineté & Personnel Régalien** | Forte prépondérance de la masse salariale (personnel judiciaire, pénitentiaire) et des juridictions déconcentrées face à des investissements ciblés de modernisation. | **Ministère de la Justice et des Droits de l'Homme (MJDH)** |
| **2. Grands Projets d'Infrastructures Physiques** | Dominante écrasante des investissements publics physiques (autoroutes, ponts, bitumage), montages multi-bailleurs (Trésor / Bailleurs extérieurs) et présence d'un compte spécial/fonds dédié (Fonds d'Entretien Routier - FER). | **Ministère de l'Équipement et de l'Entretien Routier (MEER)** |
| **3. Régulation & Transition Écologique** | Structure compacte à 2 programmes, budgets transversaux d'intervention, politique de lutte contre le réchauffement climatique et résilience. | **Ministère de l'Environnement, du Développement Durable et de la Transition Écologique (MINEDDTE)** |
| **4. Multi-Ressources Naturelles & Fonds Spécial** | Structure multi-sectorielle complexe (forêts, faune, eau), reboisement national et présence d'un Fonds Forestier National individualisé en budget-programme. | **Ministère des Eaux et Forêts (MINEF)** |

---

## 3. Profil Détaillé des Ministères Pilotes Retenus

### Pilote 1 : Ministère de la Justice et des Droits de l'Homme (MJDH)
- **Code DGBF** : `325` | **Identifiant Plateforme** : `gov-005`
- **Ministre** : M. Jean Sansan KAMBILE (Garde des Sceaux)
- **Source Primaire DGBF** : Annexe 4 DPPD-PAP 2026-2028, Section 325, pages documentaires 365 à 388 (PDF pp. 367-390).
- **Dotation Budgétaire LFI 2026** : **129 151 307 791 FCFA**
- **Architecture Budget-Programmes** :
  1. `21044` : Administration Générale (94 913 084 375 FCFA, 4 actions)
  2. `22045` : Juridictions (11 202 593 764 FCFA, 4 actions)
  3. `22046` : Établissements pénitentiaires, centres d'observation et de rééducation des mineurs (20 882 892 824 FCFA, 4 actions)
  4. `22143` : Droits de l'Homme (2 152 736 828 FCFA, 2 actions)
- **Total Programmes** : **129 151 307 791 FCFA** ($\Delta = 0\text{ FCFA}$, `RECONCILED`)
- **Intérêt pour le Pipeline** : Valide la décomposition fine des crédits régalien/judiciaire et la gestion des projets pénitentiaires (Adzopé, Saliakro).

---

### Pilote 2 : Ministère de l'Équipement et de l'Entretien Routier (MEER)
- **Code DGBF** : `330` | **Identifiant Plateforme** : `gov-025`
- **Ministre** : M. Amédé Koffi KOUAKOU
- **Source Primaire DGBF** : Annexe 4 DPPD-PAP 2026-2028, Section 330, pages documentaires 419 à 442 (PDF pp. 421-444).
- **Dotation Budgétaire LFI 2026** : **734 442 904 943 FCFA**
- **Architecture Budget-Programmes** :
  1. `21058` : Administration Générale (7 964 881 215 FCFA, 5 actions)
  2. `22059` : Infrastructures routières et ouvrages d'arts (446 634 263 710 FCFA, 4 actions)
  3. `23219` : Fonds d'Entretien Routier - FER (279 843 760 018 FCFA, 2 actions)
- **Total Programmes** : **734 442 904 943 FCFA** ($\Delta = 0\text{ FCFA}$, `RECONCILED`)
- **Intérêt pour le Pipeline** : Valide le non-double comptage des investissements physiques massifs ($> 446$ Mds FCFA) et l'intégration autonome du FER au sein du budget-programme ministériel.

---

### Pilote 3 : Ministère de l'Environnement, du Développement Durable et de la Transition Écologique (MINEDDTE)
- **Code DGBF** : `343` | **Identifiant Plateforme** : `gov-031`
- **Ministre** : M. Jacques Assahoré KONAN
- **Source Primaire DGBF** : Annexe 4 DPPD-PAP 2026-2028, Section 343, pages documentaires 677 à 696 (PDF pp. 679-698).
- **Dotation Budgétaire LFI 2026** : **36 680 067 253 FCFA**
- **Architecture Budget-Programmes** :
  1. `21079` : Administration Générale (7 918 536 211 FCFA, 4 actions)
  2. `22080` : Environnement et développement durable (28 761 531 042 FCFA, 5 actions)
- **Total Programmes** : **36 680 067 253 FCFA** ($\Delta = 0\text{ FCFA}$, `RECONCILED`)
- **Intérêt pour le Pipeline** : Démontre la résilience du moteur sur une architecture resserrée (2 programmes, 9 actions) dédiée à des missions transversales et internationales.

---

### Pilote 4 : Ministère des Eaux et Forêts (MINEF)
- **Code DGBF** : `345` | **Identifiant Plateforme** : `gov-018`
- **Ministre** : M. Laurent TCHAGBA
- **Source Primaire DGBF** : Annexe 4 DPPD-PAP 2026-2028, Section 345, pages documentaires 697 à 726 (PDF pp. 699-728).
- **Dotation Budgétaire LFI 2026** : **103 197 582 643 FCFA**
- **Architecture Budget-Programmes** :
  1. `21088` : Administration Générale (37 824 714 687 FCFA, 5 actions)
  2. `22089` : Gestion durable des ressources forestières (58 463 516 601 FCFA, 5 actions)
  3. `22090` : Gestion durable des ressources fauniques (917 332 688 FCFA, 3 actions)
  4. `22091` : Gestion intégrée des ressources en eau (5 092 018 667 FCFA, 2 actions)
  5. `23228` : Fonds Forestier National (900 000 000 FCFA, 3 actions)
- **Total Programmes** : **103 197 582 643 FCFA** ($\Delta = 0\text{ FCFA}$, `RECONCILED`)
- **Intérêt pour le Pipeline** : Évalue la gestion de programmes sectoriels spécialisés (zoo, faune, eau) et d'un compte d'affectation spéciale autonome (Fonds Forestier National).

---

## 4. Synthèse du Panel Pilote Consolidé (LOT 2 + LOT 4)

| Sigle | Code DGBF | ID Institution | Programmes | Actions | Budget Voté LFI 2026 (FCFA) | Écart Arithmétique | Statut Validation |
| :--- | :--- | :--- | :---: | :---: | ---: | :---: | :---: |
| **MMPE** | `348` | `gov-008` | 10 | 21 | 706 060 209 015 | 0 FCFA | `RECONCILED` / `PUBLISHED` |
| **MJDH** | `325` | `gov-005` | 4 | 14 | 129 151 307 791 | 0 FCFA | `RECONCILED` / `READY_FOR_PUBLICATION` |
| **MEER** | `330` | `gov-025` | 3 | 11 | 734 442 904 943 | 0 FCFA | `RECONCILED` / `READY_FOR_PUBLICATION` |
| **MINEDDTE** | `343` | `gov-031` | 2 | 9 | 36 680 067 253 | 0 FCFA | `RECONCILED` / `READY_FOR_PUBLICATION` |
| **MINEF** | `345` | `gov-018` | 5 | 18 | 103 197 582 643 | 0 FCFA | `RECONCILED` / `READY_FOR_PUBLICATION` |
| **TOTAL** | — | — | **24** | **73** | **1 709 532 071 645 FCFA** | **0 FCFA** | **5 / 5 RECONCILED** |

Ce panel de 5 ministères couvre **1 709,5 Milliards FCFA** de crédits budgétaires officiels et représente l'ensemble des typologies programmatiques de l'État.
