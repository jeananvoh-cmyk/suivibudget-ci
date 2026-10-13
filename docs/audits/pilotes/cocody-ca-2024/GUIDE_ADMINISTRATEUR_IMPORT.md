# Guide Administrateur — Ingestion et Validation des Documents Budgétaires

**Projet :** SuiviBudget Côte d'Ivoire  
**Public cible :** Administrateurs territoriaux, Data Managers, Modérateurs civiques (Non-développeurs)  
**Version :** 1.0 (Octobre 2026)  
**Objet :** Guide opératoire pas-à-pas pour l'importation, la vérification et la publication des Budgets Primitifs (BP) et Comptes Administratifs (CA).

---

## 1. Introduction et Principes Clés

La plateforme SuiviBudget Côte d'Ivoire repose sur un principe d'intégrité absolue : **aucune donnée financière ne peut être publiée sans un document officiel vérifiable à l'appui**, et **aucune donnée non vérifiée par un œil humain ne doit être exposée aux citoyens**.

En tant qu'administrateur ou gestionnaire de données, vous disposez d'outils dédiés dans l'espace d'administration pour intégrer les documents budgétaires officiels qu'ils se présentent sous la forme de fichiers numériques (PDF avec texte, tableurs Excel) ou de scans papier volumineux (scans de photocopies divisés en plusieurs fascicules).

### Le Circuit Obligatoire en 5 Étapes
1. **Dépôt :** Téléversement du document et saisie des métadonnées officielles.
2. **Contrôle & Saisie :** Rapprochement visuel des chiffres avec la page de synthèse officielle.
3. **Simulation (Dry-Run) :** Vérification arithmétique automatique sans risque pour la base.
4. **Staging (`TO_VERIFY`) :** Enregistrement sous scellé non public pour relecture.
5. **Publication (`PUBLISHED`) :** Mise à disposition publique après validation humaine explicite.

---

## 2. Accès à l'Espace d'Administration

1. Rendez-vous sur https://suivibudget.vercel.app/ (ou votre instance locale).
2. Cliquez sur le lien **Administration** ou rendez-vous sur `/admin`.
3. Connectez-vous avec vos identifiants d'administrateur ou de gestionnaire de données (`DATA_MANAGER`).
4. Accédez à l'onglet **Gestion des Documents** ou **Budgets Locaux**.

---

## 3. Dépôt d'un Document Budgétaire

### Cas A : Document Unique (PDF avec texte, CSV, XLSX)
1. Cliquez sur le bouton **Déposer un Document Budgétaire** (ou *Importer un Compte Administratif*).
2. Sélectionnez l'**Institution** dans la liste déroulante (ex. : `Commune de Cocody`).
3. Choisissez le **Type de Document** :
   - `BP` : Budget Primitif (Prévisions initiales votées)
   - `CA` : Compte Administratif (Exécution réelle constatée)
   - `BS` / `BM` : Budget Supplémentaire / Modificatif
4. Indiquez l'**Exercice budgétaire** (ex. : `2024`).
5. Glissez-déposez le fichier numérique. Le système calcule automatiquement l'empreinte cryptographique SHA-256 du fichier.

---

### Cas B : Document Scanné Volumineux en Plusieurs Fascicules (Exemple Cocody 2024)
Certains documents officiels issus de photocopieurs haute résolution dépassent la taille maximale autorisée ou ont été numérisés en plusieurs parties.

1. Dans la fenêtre de dépôt, cochez l'option **Document scanné en plusieurs parties (multi-fascicules)**.
2. Cochez également la case **Scan image / Pas de couche de texte exploitable** si le document est une série d'images scannées sans OCR préalable.
3. Indiquez le **Nombre total de pages physiques** (ex. : `44`).
4. Dans la section **Détail des fascicules** :
   - Cliquez sur **+ Ajouter un fascicule**.
   - Fascicule 1 : Entrez le nom (`Cocody_CA_2024_pages_01-22.pdf`), la plage de pages (`1 à 22`), et téléversez le premier fichier.
   - Fascicule 2 : Entrez le nom (`Cocody_CA_2024_pages_23-44.pdf`), la plage de pages (`23 à 44`), et téléversez le second fichier.
5. Indiquez l'**Empreinte globale SHA-256** certifiée du document d'origine si disponible (ex. : `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`).

---

## 4. Rapprochement et Saisie des Chiffres Clés

Pour un Compte Administratif, ouvrez la page récapitulative officielle (dans le document Cocody 2024, il s'agit de la **page PDF 40**, feuillet imprimé **41/45**).

Renseignez avec exactitude les montants en Francs CFA (ne mettez ni virgules ni lettres, uniquement les chiffres) :

| Rubrique du formulaire | Source dans le document | Exemple Cocody 2024 |
|:---|:---|:---:|
| **Prévisions Fonctionnement** | Tableau de récapitulation, colonne Prévisions | `18441235000` |
| **Prévisions Investissement** | Tableau de récapitulation, colonne Prévisions | `3900630000` |
| **Total Prévisions** | Ligne Total, colonne Prévisions | `22341865000` |
| **Recettes Fonctionnement** | Colonne Recettes Recouvrées | `17646256543` |
| **Recettes Investissement** | Colonne Recettes Recouvrées | `1366100690` |
| **Total Recettes Recouvrées** | Ligne Total, colonne Recettes Recouvrées | `19012357233` |
| **Dépenses Fonctionnement** | Colonne Dépenses Ordonnancées | `15409122753` |
| **Dépenses Investissement** | Colonne Dépenses Ordonnancées | `1366100690` |
| **Total Dépenses Ordonnancées** | Ligne Total, colonne Dépenses Ordonnancées | `16775223443` |
| **Excédent de clôture calculé** | Solde net Recettes - Dépenses | `2237133790` |

> [!IMPORTANT]
> **Que faire si un montant est absent ou illisible ?**  
> Laissez le champ vide. Ne saisissez **JAMAIS** un zéro par défaut (`0`), car cela tromperait les citoyens en suggérant qu'aucune dépense n'a eu lieu. Une valeur vide est traitée comme `DONNÉE NON RENSEIGNÉE / EN ATTENTE`.

---

## 5. Exécution de la Simulation (Dry-Run)

Avant tout enregistrement en base :
1. Cliquez sur le bouton vert **Simuler l'import (Dry-Run)**.
2. Le système effectue 4 vérifications mathématiques automatiques :
   - Total Prévisions = Fonctionnement prévu + Investissement prévu.
   - Total Recettes = Recettes fonctionnement + Recettes investissement.
   - Total Dépenses = Dépenses fonctionnement + Dépenses investissement.
   - Excédent calculé = Total Recettes − Total Dépenses.
3. **Résultat du simulateur :**
   - **Vert (Succès) :** Tous les totaux concordent au franc près. Vous pouvez poursuivre.
   - **Rouge (Erreur) :** Un écart a été détecté. Une alerte explicite vous indique la ligne et l'écart en FCFA. Corrigez la frappe avant de continuer.

---

## 6. Enregistrement en Staging (`TO_VERIFY`)

1. Une fois la simulation au vert, renseignez les dates institutionnelles :
   - **Date d'adoption municipale :** Date de vote par le Conseil (ex. : `28/02/2025`).
   - **Date du visa préfectoral :** Date du cachet de la tutelle préfectorale (ex. : `28/03/2025`).
   - **Notes méthodologiques :** Ex. : *"Écart de 944 FCFA reporté d'exercices antérieurs entre excédent courant (2 237 133 790 FCFA) et résultat cumulé (2 237 134 734 FCFA)"*.
2. Cliquez sur **Enregistrer pour vérification**.
3. Le document est stocké avec le statut `TO_VERIFY` et n'apparaît **pas encore** dans l'espace public des citoyens.

---

## 7. Examen, Validation (`VERIFIED`) et Publication (`PUBLISHED`)

1. Dans la liste des documents à vérifier, ouvrez le document.
2. L'écran d'examen affiche :
   - La visionneuse du document scanné et la liste de ses fascicules.
   - Le tableau comparatif des chiffres saisis et des calculs vérifiés.
   - Les alertes de contrôle et les visas légaux.
3. Un réviseur indépendant (Modérateur ou Data Manager) clique sur **Marquer comme Vérifié (`VERIFIED`)**.
4. Enfin, pour ouvrir l'accès aux citoyens, cliquez sur **Publier officiellement (`PUBLISHED`)**.
5. Les données alimentent immédiatement les fiches territoriales, les graphiques d'exécution et les indicateurs civiques.

---

## 8. Résolution des Problèmes Fréquents (FAQ)

### Q1 : Le document contient un écart entre le résultat courant et le résultat cumulé (ex. 944 FCFA à Cocody) ?
- **Réponse :** Ne modifiez pas artificiellement les dépenses ou les recettes pour forcer l'égalité. L'excédent de l'exercice doit strictement être égal à $\text{Recettes} - \text{Dépenses}$. L'écart de 944 FCFA correspond au *Report à nouveau* d'exercices précédents. Renseignez l'excédent réel de l'exercice et documentez le report dans le champ *Notes méthodologiques*.

### Q2 : Pourquoi le bouton "Publier" est-il grisé ?
- **Réponse :** Le document est toujours au statut `TO_VERIFY`. Il doit obligatoirement être examiné et validé par un utilisateur ayant le rôle de réviseur (`VERIFIED`) avant que l'action de publication ne devienne active.

### Q3 : Puis-je téléverser un fichier Excel pour compléter le détail des lignes de dépense ?
- **Réponse :** Oui, le module d'import accepte un fichier Excel ou CSV complémentaire pour renseigner le détail chapitre par chapitre, à condition que la somme de ces lignes concorde avec le total ordonnancé validé dans le Compte Administratif.
