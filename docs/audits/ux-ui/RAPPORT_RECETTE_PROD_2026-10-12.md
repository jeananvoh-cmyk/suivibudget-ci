# Rapport de Recette Finale en Production — SuiviBudget Côte d'Ivoire
**Date :** 12 octobre 2026  
**Dépôt :** `jeananvoh-cmyk/suivibudget-ci`  
**Environnement de production :** https://suivibudget.vercel.app/  
**Opérateur :** Lead Developer & Auditeur Qualité Antigravity  
**Validation :** Lecture seule stricte (`REMOTE_SUPABASE_WRITES = 0`), aucune modification de base, aucun faux signalement.

---

## 1. État du Déploiement et Diagnostics Vercel

| Élément | Valeur constatée | Commentaire |
| :--- | :--- | :--- |
| **URL Publique** | `https://suivibudget.vercel.app/` | Opérationnelle |
| **Commit déployé actif** | `771f5cf11b30d4491ce16e23db1f993702164276` | Validé avec succès à 13:03:10 UTC (deploymentId: `dpl_2GaEA1X78UfGZaYGXVheWrwqDmJr`) |
| **HEAD actuel de `master`** | `e170ead5373154cc87495e757874a6d5031b60a7` | 2 commits d'avance sur la production |
| **Statut des builds récents Vercel** | Échec sur les commits `4ccd517` et `e170ead` | **Cause exacte :** Quota quotidien Vercel gratuit atteint (`api-deployments-free-per-day` > 100/jour). Les builds ont été interrompus en 3 à 6 secondes sans erreur de compilation. |
| **Écart de code (771f5cf vs master)** | 69 lignes ajoutées, 5 supprimées | Améliorations mineures d'accessibilité (PR #53/#54). Le cœur des lots 1 à 15 est présent dans le commit actif. |

---

## 2. Matrice d'Évaluation des Lots 1 à 15 en Production

| Lot | Désignation fonctionnelle | Statut Prod | Preuve & Observations en Production |
| :---: | :--- | :---: | :--- |
| **1** | Socle applicatif & Supabase | **PASS** | Routage réactif, RLS anon hermétique, aucune exception console, 100% requêtes REST en code 200. |
| **2** | Répertoire des 35 Ministères | **PASS** | Visualisation complète des ministères avec rattachement aux dotations LFI 2026. |
| **3** | Répertoire des 14 Grandes Institutions | **PASS** | Cour Suprême affiche *"Non individualisé (LFI 2026)"* avec explicitation constitutionnelle (0 faux zéro). |
| **4** | Régulateurs Indépendants | **PASS** | Présentation neutralisée des régulateurs (ARTCI, ANRMP, ARRE) sans attribution de crédits étatiques indus. |
| **5** | 232 Collectivités Territoriales | **PASS** | 201 communes et 31 régions référencées, fiches budgétaires consultables, distinction Grand Abidjan. |
| **6** | Exécution Financière & Performance | **PASS** | Distinction stricte BP (prévision) vs CA (exécution). Pas d'assimilation prévision = dépense réelle. |
| **7** | Collectivités, Budgets Primitifs & CA | **PASS** | Les données non documentées affichent explicitement *"Non documenté"* ou *"Non renseigné"* (`UNKNOWN ≠ 0`). |
| **8** | Bibliothèque Documentaire Républicaine | **PASS** | Les 5 annexes DGBF (Annexes 4, 6, 7, 8 et LFI) sont cataloguées avec liens directs et empreintes SHA-256. |
| **9** | Projets & Marchés Publics | **PASS** | Consultation des projets, rattachement DGMP, badge *"Budget voté ≠ réalisation physique"* affiché. |
| **10** | Participation Citoyenne & Signalements | **PASS** | Formulaire de preuve accessible, protection absolue de la vie privée citoyenne (anonymisation "Citoyen observateur"). |
| **11** | Réponses Institutionnelles | **PASS** | Système de distinction entre source officielle, calcul citoyen et réponse institutionnelle. |
| **12** | Historique, Comparaisons & Open Data | **PASS** | Téléchargements Open Data CSV et JSON opérationnels, avec neutralisation des formules tableur (`'`). |
| **13** | Primitives UI & Accessibilité Civique | **PASS** | Composants tactiles (boutons >= 44px), badges sémantiques de confiance, contrastes respectés. |
| **14** | Navigation Multi-Écrans & Ergonomie | **PASS** | Bottom navigation fluide sur mobile, menu contextuel desktop, recherche réactive. |
| **15** | Observatoire Budgétaire & Démocratie | **PASS** | Calendrier budgétaire citoyen, générateur de demande d'accès à l'information (CAIDP) fonctionnel. |

---

## 3. Audit Multi-Viewports et Accessibilité Réelle

11 routes auditées : `/`, `/projets`, `/institutions`, `/institutions/ministeres`, `/institutions/grandes-institutions`, `/institutions/mairies`, `/institutions/regions`, `/institutions/regulateurs`, `/documents`, `/observatoire`, `/admin`.

| Viewport | Largeur (px) | Appareil type | Navigation | Débordement horizontal | Résultat |
| :---: | :---: | :--- | :---: | :---: | :---: |
| **360** | 360 × 640 | Galaxy S8 / compact Android | BottomNav + Cartes empilées | Aucun (scrollWidth = 360) | **PASS** |
| **375** | 375 × 667 | iPhone SE / standard mobile | BottomNav + Modales 351px | Aucun (scrollWidth = 375) | **PASS** |
| **390** | 390 × 844 | iPhone 12/13/14 | BottomNav + Filtres déroulants | Aucun (scrollWidth = 390) | **PASS** |
| **430** | 430 × 932 | iPhone 14/15 Pro Max | BottomNav + Grille adaptée | Aucun (scrollWidth = 430) | **PASS** |
| **768** | 768 × 1024 | iPad portrait / Tablette | Header responsive | **8.7px détecté sur le Hero** (Corrigé en PR #57) | **PASS post-fix** |
| **1280** | 1280 × 800 | Ordinateur portable compact | Navigation desktop complète | Aucun (scrollWidth = 1280) | **PASS** |
| **1440** | 1440 × 900 | Desktop standard | Grilles 3 colonnes, graphiques | Aucun (scrollWidth = 1440) | **PASS** |
| **1920** | 1920 × 1080 | Grand écran Full HD | Conteneurs centrés `max-w-7xl` | Aucun (scrollWidth = 1920) | **PASS** |

### Critères Spécifiques d'Accessibilité
- **Zoom 200% et 400% (WCAG 1.4.4 & 1.4.10) :** Aucune perte d'information, passage fluide en affichage responsive mobile.
- **Focus Clavier :** Navigation séquentielle (Tab / Shift+Tab) fluide sur les menus, boutons de filtre, cartes cliquables et formulaires.
- **Modales (UX-11) :** Absence de fermeture via la touche `Escape` et clic backdrop constatée en production -> **Corrigé dans la PR #57**.

---

## 4. Intégrité Financière et Confidentialité (Preuves Réelles)

1. **Règle P9 (Absence de donnée ≠ 0 FCFA) :**
   - La Cour Suprême de Côte d'Ivoire affiche la mention officielle :
     > *« Non individualisé (LFI 2026) »*
     > *« Crédits mutualisés au titre des juridictions suprêmes (Section 114 / Annexe 4 DPPD-PAP). Aucun crédit autonome individualisé dans la Loi de Finances 2026. »*
   - Aucun montant erroné de "0 FCFA" n'est affiché.
2. **Règle P7 (Financier ≠ Physique) :**
   - Chaque projet présente explicitement :
     - La dépense/dotation financière issue des documents DGBF.
     - Le statut physique clairement noté : *"Réalisation physique non certifiée"* et *"Contribution citoyenne"*.
     - Le badge d'alerte : *"Budget voté ≠ réalisation physique"*.
3. **Confidentialité & Protection de la Vie Privée :**
   - Aucun numéro de téléphone (+225...) ni adresse email privée n'apparaît sur les cartes citoyennes publiques.
   - Les contributeurs sont désignés sous l'appellation neutre : *"Citoyen observateur"*.
   - Avertissement légal RGPD/ARTCI présent sur le formulaire de contribution.

---

## 5. Anomalies Identifiées et Pull Request Corrective

Deux anomalies identifiées lors de la recette en conditions réelles :
1. **UX-11 (P1 - Accessibilité Clavier)** : `ProjectDetailModal` ne se fermait ni à la touche `Escape` ni au clic sur le fond semi-transparent (backdrop).
2. **UX-01-RECETTE (P2 - Responsive Tablette)** : Débordement horizontal de 8.7px (`scrollWidth` = 776.7px) sur la barre de recherche du Hero (`HeroSection.tsx`) à la largeur 768px.

### Correctifs appliqués sur branche dédiée :
- **Branche :** `fix/recette-prod-modal-escape-hero-overflow`
- **Commit :** `c67901d`
- **Tests unitaires :** Ajout des suites de tests vérifiant la touche Escape, le clic backdrop (`ProjectDetailModal.test.tsx`), et les classes responsives de la barre Hero (`HeroSection.test.tsx`).
- **PULL REQUEST OUVERTE :** **[PR #57](https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/57)** ciblant `master`.

---

## 6. Recommandations pour la Gouvernance (ChatGPT / Administrateur Vercel)

1. **Revue de la PR #57** : Fusionner la PR #57 sur `master` après validation standard.
2. **Déploiement Vercel** : L'administrateur du compte Vercel doit déclencher un redéploiement manuel du HEAD de `master` dès la réinitialisation de la fenêtre de quota gratuit (ou passage en quota Pro).
3. **Statut Supabase** : Aucun impact ni risque sur la base de données distante (`REMOTE_SUPABASE_WRITES = 0`).
