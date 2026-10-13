# Mapping des Données Documentaires : Cocody 2024
## Correspondance Source Physique $\longleftrightarrow$ Schéma Cible SuiviBudget

**Document source :** Fascicule du Compte Administratif 2024 — Commune de Cocody  
**Empreinte SHA-256 :** `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`  
**Schéma cible :** Contrat de ligne `private.validate_import_row` (Migration `20261001091748_controlled_data_import.sql` & `20261001144423_import_console_qualified_amounts.sql`)

---

## 1. Principes Directeurs du Mapping

1. **Aucun champ superflu :** L'enveloppe ne comporte que les 7 champs de premier niveau autorisés : `kind`, `institution_id`, `institution_type`, `fiscal_year`, `source`, `data`, `precision`.
2. **Identification institutionnelle exacte :** `institution_id = 'inst-com-cocody'`, vérifié dans la table `public.institutions` avec `type = 'MAIRIE'` $\longrightarrow$ `institution_type = 'COMMUNE'`.
3. **Qualification systématique des montants :** Chaque champ monétaire présent dans `data` possède son statut explicite dans `precision` (`EXACT`, `APPROXIMATE`, `LOWER_BOUND`, `UNKNOWN`).
4. **Intégrité arithmétique :** Les entiers FCFA sont strictement positifs ou nuls (à l'exception des soldes nets qui peuvent être négatifs).
5. **Traçabilité de la date :** `date_kind = 'PUBLISHED'` pour la date d'approbation préfectorale attestée (22 juillet 2025).

---

## 2. Tableau de Correspondance Détaillé

### 2.1. Métadonnées d'En-tête et Identité de l'Acte

| Champ Schéma Cible | Type | Source Documentaire (Pages 40 & 43) | Valeur Retenue | Justification / Règle |
|---|---|---|---|---|
| `kind` | `string` | Nature de l'acte : Compte Administratif | `"CA"` | Fixé par le cycle budgétaire |
| `institution_id` | `string` | Commune de Cocody | `"inst-com-cocody"` | Clé primaire du référentiel territorial |
| `institution_type` | `string` | Mairie / Commune | `"COMMUNE"` | Mappé depuis `MAIRIE` en base |
| `fiscal_year` | `integer` | Exercice 2024 | `2024` | Exercice budgétaire clos |
| `source.name` | `string` | En-tête du document | `"Mairie de la Commune de Cocody - Compte Administratif 2024"` | Libellé officiel attesté |
| `source.reference` | `string` | Mention de tutelle page 40 | `"CA-2024-COCODY / Approbation n° 002/PA/D.CAB du 22/07/2025"` | Référence juridique opposable |
| `source.date` | `string (ISO)` | Date de signature du Préfet | `"2025-07-22"` | Date de l'arrêté d'approbation |
| `source.date_kind` | `string` | Date de l'acte officiel | `"PUBLISHED"` | Date attestée de la source |

---

### 2.2. Indicateurs Financiers (`data` et `precision`)

| Libellé Physique (Source) | Page PDF / Imprimée | Champ Métier Cible (`data`) | Montant Retenu (FCFA) | Qualification (`precision`) |
|---|:---:|---|---:|:---:|
| **Prévisions Fonctionnement** | 40 (41/45) | `operating_planned` | 18 441 235 000 | `EXACT` |
| **Dépenses Fonctionnement Ordonnancées** | 40 (41/45) | `operating_realized` | 15 409 122 753 | `EXACT` |
| **Recettes Fonctionnement Recouvrées** | 40 (41/45) | `operating_revenue_realized` | 17 646 256 543 | `EXACT` |
| **Prévisions Investissement** | 40 (41/45) | `investment_planned` | 3 900 630 000 | `EXACT` |
| **Dépenses Investissement Ordonnancées** | 40 (41/45) | `investment_realized` | 1 366 100 690 | `EXACT` |
| **Recettes Investissement Recouvrées** | 40 (41/45) | `investment_revenue_realized` | 1 366 100 690 | `EXACT` |
| **Total Général des Prévisions** | 40 (41/45) | `total_planned` | 22 341 865 000 | `EXACT` |
| **Total Général des Dépenses Ordonnancées** | 40 (41/45) | `total_realized` | 16 775 223 443 | `EXACT` |
| **Total Général des Recettes Recouvrées** | 40 (41/45) | `total_revenue_collected` | 19 012 357 233 | `EXACT` |
| **Excédent de Clôture de l'Exercice** | 40 (41/45) | `surplus_or_deficit` | 2 237 133 790 | `EXACT` |

---

### 2.3. Métadonnées Documentaires et Juridiques Complémentaires (`data`)

| Champ Métier Cible (`data`) | Type | Source Documentaire | Valeur Retenue |
|---|---|---|---|
| `source_page` | `integer` | Page récapitulative du tableau d'arbitrage | `40` |
| `verification_status` | `string` | Nature de la source physique | `"OFFICIAL_DOCUMENT"` |
| `approval_date` | `string` | Date du visa préfectoral | `"2025-07-22"` |
| `prefecture_visa_date` | `string` | Date du visa préfectoral | `"2025-07-22"` |
| `notes` | `string` | Observations méthodologiques | `"Compte administratif 2024 approuvé par arrêté préfectoral n° 002/PA/D.CAB du 22/07/2025. Excédent exercice 2 237 133 790 FCFA. Report à nouveau antérieur 944 FCFA. Résultat cumulé 2 237 134 734 FCFA. Tableau patrimonial page 43: Immobilier 810 959 095, Incorporel 20 000 000, Mobilier 535 141 595."` |

---

## 3. Enveloppe JSON Canonique Prête à l'Importation

Ce payload JSON constitue l'enveloppe officielle certifiée à coller ou charger dans la **Console d'Import Contrôlé** de SuiviBudget :

```json
[
  {
    "kind": "CA",
    "institution_id": "inst-com-cocody",
    "institution_type": "COMMUNE",
    "fiscal_year": 2024,
    "source": {
      "name": "Mairie de la Commune de Cocody - Compte Administratif de l'Exercice 2024",
      "reference": "CA-2024-COCODY / Approbation Préfectorale n° 002/PA/D.CAB du 22/07/2025",
      "date": "2025-07-22",
      "date_kind": "PUBLISHED"
    },
    "data": {
      "operating_planned": 18441235000,
      "operating_realized": 15409122753,
      "operating_revenue_realized": 17646256543,
      "investment_planned": 3900630000,
      "investment_realized": 1366100690,
      "investment_revenue_realized": 1366100690,
      "total_planned": 22341865000,
      "total_realized": 16775223443,
      "total_revenue_collected": 19012357233,
      "surplus_or_deficit": 2237133790,
      "source_page": 40,
      "approval_date": "2025-07-22",
      "prefecture_visa_date": "2025-07-22",
      "verification_status": "OFFICIAL_DOCUMENT",
      "notes": "Compte administratif 2024 approuvé par arrêté préfectoral n° 002/PA/D.CAB le 22/07/2025. Excédent de fonctionnement 2 237 133 790 FCFA. Report à nouveau antérieur 944 FCFA. Résultat cumulé 2 237 134 734 FCFA. Tableau patrimonial page 43: Immobilier 810 959 095, Incorporel 20 000 000, Mobilier 535 141 595."
    },
    "precision": {
      "operating_planned": "EXACT",
      "operating_realized": "EXACT",
      "operating_revenue_realized": "EXACT",
      "investment_planned": "EXACT",
      "investment_realized": "EXACT",
      "investment_revenue_realized": "EXACT",
      "total_planned": "EXACT",
      "total_realized": "EXACT",
      "total_revenue_collected": "EXACT",
      "surplus_or_deficit": "EXACT"
    }
  }
]
```

---

## 4. Règles de Rejet et Garde-fous Activés

1. **Rejet de toute valeur indéterminée modifiée en zéro :** Si un champ n'est pas renseigné, il doit valoir `null` avec une précision `'UNKNOWN'`. Tout montant zéro doit correspondre à une constatation comptable explicite.
2. **Immutabilité de la clé déterministe :** L'identifiant généré est déterministe :
   $$\text{ID} = \text{import-} + \text{SHA256}([\text{"CA"}, \text{"inst-com-cocody"}, \text{"2024"}]) = \text{import-94c3...}$$
   Toute tentative ultérieure d'importer des montants divergents sera interceptée en **conflit bloquant**.
3. **Exclusion des réalisations physiques automatiques :** La présence de $1\,366\,100\,690$ FCFA de dépenses d'investissement ordonnancées ne crée aucune opération de terrain certifiée sans constat citoyen distinct.
