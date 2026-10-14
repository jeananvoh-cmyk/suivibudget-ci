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
3. Dans la section **Détail des fascicules** :
   - Le formulaire présente initialement deux volets. Vous pouvez en ajouter ou en retirer avec les boutons dédiés.
   - **Volet 1** : Cliquez sur *Parcourir* et sélectionnez le premier fichier PDF (`Cocody_CA_2024_pages_01-22.pdf`). Saisissez la plage de pages : `1` à `22`.
   - **Volet 2** : Cliquez sur *Parcourir* et sélectionnez le second fichier PDF (`Cocody_CA_2024_pages_23-44.pdf`). Saisissez la plage de pages : `23` à `44`.
4. **Calcul automatique et transparent des empreintes SHA-256** :
   - Dès la sélection de chaque fichier sur votre ordinateur, votre navigateur calcule instantanément son empreinte SHA-256 réelle en lisant ses octets.
   - Le système calcule automatiquement l'empreinte globale du manifeste (ex. `ace0243d9ed0cae9e6ee24c420f554751893eecff79f4202007d1c48f5d19928` pour Cocody 2024). **Aucune saisie manuelle de code cryptographique n'est requise.**
5. **Contrôle automatique de continuité des pages** :
   - Le formulaire vérifie en direct l'absence de chevauchement ou de saut de pages entre volets (le volet 2 doit débuter à la page qui suit la fin du volet 1).
6. **Sécurité et atomicité du téléversement** :
   - Les fichiers sont téléversés séquentiellement dans le bucket privé sécurisé. En cas de coupure de réseau ou d'erreur sur un volet ultérieur, un mécanisme de rollback automatique supprime immédiatement les fichiers partiels déjà envoyés.

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

1. Dans la liste des documents à vérifier, cliquez sur **Examiner** en face de la ligne correspondante.
2. L'écran d'examen affiche :
   - La liste des fascicules du document avec, pour chaque volet, un bouton direct **« Consulter le PDF (Volet X) »**. Ce bouton génère une URL signée temporaire sécurisée pour ouvrir directement le volet concerné sans exposer le bucket privé.
   - L'empreinte SHA-256 du manifeste avec le badge *« Multi-parties (X volets) »*.
   - Le tableau comparatif des chiffres saisis et des équilibres vérifiés.
   - Les alertes de contrôle et les visas légaux.
3. **Validation intermédiaire (`VERIFIED`)** :
   - Un réviseur (rôle `MODERATOR`, `DATA_MANAGER` ou `ADMIN`) examine les justificatifs et clique sur **Marquer comme Vérifié (`VERIFIED`)**.
   - Le statut passe immédiatement à `VERIFIED`. L'affichage de la liste des 232 collectivités s'actualise instantanément.
4. **Publication officielle (`PUBLISHED`)** :
   - **Règle stricte :** Le bouton de publication est désactivé tant que le document n'a pas été préalablement marqué comme vérifié.
   - **Privilèges requis (RBAC) :** Seuls les utilisateurs avec le rôle `ADMIN` ou `DATA_MANAGER` peuvent procéder à la publication. Les modérateurs civiques (`MODERATOR`) ne disposent pas du droit de publication unilatérale.
   - L'administrateur clique sur **Publier officiellement (`PUBLISHED`)**.
5. Les données alimentent immédiatement les fiches territoriales, les graphiques d'exécution et les indicateurs civiques accessibles aux citoyens.

---

## 8. Résolution des Problèmes Fréquents (FAQ)

### Q1 : Le document contient un écart entre le résultat courant et le résultat cumulé (ex. 944 FCFA à Cocody) ?
- **Réponse :** Ne modifiez pas artificiellement les dépenses ou les recettes pour forcer l'égalité. L'excédent de l'exercice doit strictement être égal à $\text{Recettes} - \text{Dépenses}$. L'écart de 944 FCFA correspond au *Report à nouveau* d'exercices précédents. Renseignez l'excédent réel de l'exercice et documentez le report dans le champ *Notes méthodologiques*.

### Q2 : Pourquoi le bouton "Publier" est-il grisé ?
- **Réponse :** Le document est toujours au statut `TO_VERIFY`. Il doit obligatoirement être examiné et validé par un utilisateur ayant le rôle de réviseur (`VERIFIED`) avant que l'action de publication ne devienne active.

### Q3 : Puis-je téléverser un fichier Excel pour compléter le détail des lignes de dépense ?
- **Réponse :** Oui, le module d'import accepte un fichier Excel ou CSV complémentaire pour renseigner le détail chapitre par chapitre, à condition que la somme de ces lignes concorde avec le total ordonnancé validé dans le Compte Administratif.
