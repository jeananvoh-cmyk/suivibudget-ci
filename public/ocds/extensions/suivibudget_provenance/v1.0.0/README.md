# Extension OCDS 1.1 — SuiviBudget CI (`suivibudget_provenance` v1.0.0)

URL canonique : `https://suivibudget.vercel.app/ocds/extensions/suivibudget_provenance/v1.0.0/extension.json`

## Objet

Cette extension complète le schéma OCDS v1.1 (`release-schema.json`) pour rendre explicites :

1. **La traçabilité documentaire et la provenance** (`Document.x_provenance`, `Document.pageStart`, `Budget.x_dataProvenance`, `Transaction.x_sourceReference`) ;
2. **La qualification des montants sans invention ni zéro artificiel** (`Budget.x_amountPrecision`, `Budget.fiscalYear`) ;
3. **Le Passeport de Redevabilité civique** (`Release.x_suivibudget`), qui sépare rigoureusement la prévision budgétaire, la passation de marché DGMP, l'exécution financière issue du Compte Administratif et la constatation physique terrain.

## Champs ajoutés

| Cible OCDS | Champ | Type | Valeurs / Contraintes |
| :--- | :--- | :--- | :--- |
| `Release` | `x_suivibudget` | `object` (obligatoire) | 9 champs obligatoires dont `budgetAmountStatus` (`AVAILABLE \| UNKNOWN`), `procurementStatus`, `financialExecutionStatus`, `physicalRealizationStatus` |
| `Planning.budget` | `fiscalYear` | `integer \| null` | `2000..2100` ou `null` |
| `Planning.budget` | `x_amountPrecision` | `string` | `EXACT \| APPROXIMATE \| LOWER_BOUND \| UPPER_BOUND \| DECLARED_ADMIN \| UNKNOWN` |
| `Planning.budget` | `x_dataProvenance` | `string` | `OFFICIAL_SOURCE \| DECLARED_ADMIN \| UNVERIFIED_INPUT \| UNKNOWN` |
| `Document` | `pageStart` | `integer \| null` | `>= 1` ou `null` |
| `Document` | `x_provenance` | `string` | `OFFICIAL_SOURCE \| DECLARED_ADMIN \| UNVERIFIED_INPUT \| UNKNOWN` |
| `Implementation.transactions[]` | `x_sourceReference` | `string \| null` | Référence textuelle source quand aucune URI directe n'est publiée |
