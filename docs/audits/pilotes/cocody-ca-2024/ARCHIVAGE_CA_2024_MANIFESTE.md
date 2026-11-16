# Compte administratif — Commune de Cocody — Exercice 2024

## Statut d'archivage

**Le PDF original n'est pas stocké dans ce dépôt à ce stade.** Ce fichier est un manifeste de traçabilité pour identifier et contrôler le document reçu. Il ne remplace pas l'original.

## Identification du fichier reçu

| Champ | Valeur |
|---|---|
| Nom du fichier reçu | `COMMUNE DE COCODY (1).pdf` |
| Nom affiché sur le portail officiel | `COMMUNE DE COCODY.pdf` |
| Taille du fichier reçu | 14 072 943 octets (environ 13,43 Mio) |
| Nombre de pages PDF | 44 |
| Format | PDF 1.7 |
| Protection | Aucune protection détectée |
| Couche texte | Document numérisé, sans couche texte exploitable détectée |
| SHA-256 du fichier reçu | `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf` |
| Métadonnées PDF | Créateur/Producteur : HP Scan / HP Scan Extended Application |
| Date de création PDF indiquée | 11 août 2025 à 17:29:21 UTC |

## Provenance déclarée / piste de vérification

Le portail SYGIDAN-CTI de consultation des actes des collectivités affichait une entrée intitulée **COMMUNE DE COCODY.pdf**, taille affichée **13 743 Ko**, reçue le **13 août 2025**.

Portail : https://www.cloud.influo.ci/p_consultation_arrete_commune.php

**Réserve importante :** l'identité binaire entre le fichier reçu dans ChatGPT et le fichier téléchargeable depuis le portail n'a pas été vérifiée. Le nom, la taille affichée et la date du portail constituent des indices de provenance, pas une preuve cryptographique d'origine. Le SHA-256 ci-dessus identifie uniquement le fichier reçu ici.

## Contrôle visuel des données financières et intégration distante — 16 novembre 2026

Le PDF reçu a été rouvert et les pages sources ont été contrôlées visuellement :
- **Page PDF 40, numérotation imprimée 41/45** : tableau des résultats du compte administratif.
- **Page PDF 43, numérotation imprimée 44/45** : tableau de composition du patrimoine et total général.
- Les numéros PDF (index 0 ou index 1 selon les outils) ne doivent pas être confondus avec la pagination imprimée du document. Dans la base, `source_page=40` correspond à la page PDF 40 en indexation 0 ; les références descriptives conservent aussi la page imprimée.

### Chiffres réconciliés avec la page récapitulative

| Indicateur | Montant (FCFA) |
|---|---:|
| Prévisions de fonctionnement | 18 441 235 000 |
| Recettes de fonctionnement recouvrées | 17 646 256 543 |
| Dépenses de fonctionnement ordonnancées | 15 409 122 753 |
| Prévisions d'investissement | 3 900 630 000 |
| Recettes d'investissement recouvrées | 1 366 100 690 |
| Dépenses d'investissement ordonnancées | 1 366 100 690 |
| Total des recettes recouvrées | 19 012 357 233 |
| Total des dépenses ordonnancées | 16 775 223 443 |
| Excédent de l'exercice courant | 2 237 133 790 |
| Résultat cumulé excédentaire | 2 237 134 734 |

Le résultat cumulé excède le résultat courant de **944 FCFA**, correspondant au report antérieur indiqué dans le tableau source. Les sommes fonctionnement + investissement concordent avec les totaux des recettes et dépenses.

### Concordance du patrimoine

Les montants par catégorie lus sur la page PDF 43 (imprimée 44/45) concordent avec le total général :
- Immobilier : 3 231 678 000 prévus ; 810 959 095 réalisés.
- Incorporel : 20 000 000 prévus ; 20 000 000 réalisés.
- Mobilier : 648 952 000 prévus ; 535 141 595 réalisés.
- Total général : 3 900 630 000 prévus ; 1 366 100 690 réalisés.

### Vérification en lecture seule de Supabase

Projet Supabase `cdesuvcozcetdtvibgqs`, vérification SQL en lecture seule le 16 novembre 2026 :
- `public_documents` : document `doc-dff4865a-c6a8-418e-8895-626258e409d0`, statut `PUBLISHED`, vérification `VERIFIED`, SHA-256 identique au fichier reçu, 44 pages, 14 072 943 octets.
- `administrative_accounts` : 1 ligne Cocody 2024, statut `PUBLISHED`, `verification_status=VERIFIED`, `reconciliation_status=RECONCILED`, différence arithmétique 0.
- `ca_financial_lines` : 8 lignes, toutes `VERIFIED`, pages sources référencées.
- `ca_investment_operations` : 57 lignes ; somme des prévisions 3 900 630 000 FCFA ; somme des montants réalisés 1 366 100 690 FCFA ; 29 lignes avec montant réalisé positif et 28 à zéro.
- `ca_procurement_matches` : 28 lignes rattachées à 20 opérations ; 9 correspondances fortes et 19 partielles, toutes indiquées comme vérifiées DGMP.

**Aucune écriture distante n'a été effectuée pendant cet audit.** Les données étaient déjà présentes et ont été relues ; aucune réimportation ni insertion n'a été lancée.

### Points de vigilance sur les classeurs de travail

Les classeurs Excel historiques ne sont pas tous synchronisés avec l'état actuel de Supabase. En particulier, une synthèse historique mentionne « 2 correspondances fortes + 2 probables », alors que l'état distant vérifié contient 28 lignes DGMP (9 fortes, 19 partielles) sur 20 opérations. Ne pas republier cette ancienne synthèse de rapprochement sans mise à jour.

Une opération patrimoniale dépasse 100 % du montant prévu : référence PT « 5 », travaux de bitumage de 2 950 mètres linéaires ; prévu 250 000 000 FCFA, réalisé 289 464 570 FCFA, soit 115,79 %. C'est un écart à documenter, pas une preuve d'irrégularité.

Le statut `TRANSCRIPTION_A_VALIDER` du CSV de travail historique ne doit pas être repris comme statut courant des lignes financières Supabase : les huit lignes structurées ont été vérifiées et portent `VERIFIED`. Les classeurs doivent toutefois être révisés avant une nouvelle diffusion afin de refléter les rapprochements DGMP actuels.

## Emplacement prévu de l'original

Lorsque le PDF sera téléversé par un moyen GitHub acceptant les fichiers binaires, le déposer dans ce dossier :

`docs/audits/pilotes/cocody-ca-2024/COMMUNE-DE-COCODY-CA-2024.pdf`

Après téléversement, recalculer le SHA-256 depuis le fichier présent dans le dépôt et comparer à l'empreinte ci-dessus. Si l'empreinte diffère, documenter explicitement la différence au lieu de remplacer silencieusement la valeur.

## Règles d'utilisation pour SuiviBudget

- Ne publier aucun montant extrait sans double contrôle sur le PDF source et sa page.
- Conserver la référence de page pour chaque donnée importée.
- Distinguer les prévisions, les émissions, les paiements et les réalisations physiques selon les libellés réellement présents dans le document.
- Laisser une donnée inconnue non renseignée ; ne pas reconstituer un montant manquant.
- Un rapprochement de marché, même fort, ne prouve pas à lui seul l'exécution physique d'un projet.
- Le présent manifeste ne constitue ni une certification comptable générale du CA 2024, ni une certification de l'authenticité du portail source.

## Limite technique de l'opération

Le connecteur GitHub utilisé pour cette opération sait créer des fichiers texte UTF-8, mais ne permet pas de transférer les octets de ce PDF binaire de 14 Mo. Le manifeste est donc ajouté sur une branche dédiée, sans prétendre que le PDF lui-même est archivé dans GitHub.
