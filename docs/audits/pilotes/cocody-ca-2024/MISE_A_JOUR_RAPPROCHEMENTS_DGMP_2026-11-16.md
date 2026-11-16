# Mise à jour du rapprochement DGMP — Cocody CA 2024

Date de contrôle : 16 novembre 2026.

## Périmètre confirmé dans Supabase

Lecture SQL en lecture seule sur le projet `cdesuvcozcetdtvibgqs`, jointure entre `ca_procurement_matches` et `ca_investment_operations`, filtrée sur l'institution Cocody et l'exercice 2024 :

- 28 enregistrements de rapprochement ;
- 20 opérations d'investissement distinctes concernées ;
- 9 enregistrements `STRONG` ;
- 19 enregistrements `PARTIAL` ;
- 28 enregistrements marqués `Vérifié DGMP`.

Ces nombres concernent exclusivement Cocody. Trois autres rapprochements visibles dans la même table concernent Tiassalé et ne sont pas inclus dans les 28.

## Classeur citoyen actualisé

Un classeur Excel a été généré en reprenant les 28 enregistrements détaillés issus de la base, tout en conservant les 57 opérations d'investissement et les autres feuilles du classeur citoyen. Contrôles de sortie : 28 lignes détaillées hors en-tête, 9 `STRONG`, 19 `PARTIAL`, 57 opérations conservées.

Le fichier est conservé dans la Bibliothèque ChatGPT de l'utilisateur :

`/SuiviBudget Côte d’Ivoire/Pilotes/Cocody 2024/SuiviBudget_Cocody_CA2024_edition_citoyenne_corrigee_2026-11-16.xlsx`

Le classeur corrigé est conservé dans la bibliothèque de travail et n'est pas inclus dans cette PR documentaire. Son ajout éventuel au dépôt fera l'objet d'une opération distincte de téléversement binaire.

## Réserves de lecture

- `STRONG` et `PARTIAL` sont des niveaux de rapprochement documentaire, pas des certificats de paiement ni d'exécution physique.
- Les attributions 2025 doivent rester distinguées de l'exécution comptable du CA 2024.
- Une ligne agrégée « plusieurs attributaires / plusieurs lots » n'est pas ventilée artificiellement par titulaire si la source ne fournit pas cette ventilation dans le rapprochement enregistré.
- La valeur `source_page` de `ca_investment_operations` est reprise comme champ de base. Sa correspondance exacte avec la page PDF et la pagination imprimée doit être revérifiée sur le scan original avant de la présenter comme un numéro de page PDF certifié.
- L'opération de bitumage de 2 950 mètres linéaires présente 289 464 570 FCFA réalisés pour 250 000 000 FCFA prévus (115,79 %). Cet écart appelle une explication documentaire ; il ne démontre pas à lui seul une irrégularité.

Aucune écriture Supabase, fusion GitHub ou mise en production n'a été effectuée pour cette mise à jour.
