# SuiviBudget Côte d’Ivoire

Plateforme Civic Tech indépendante de transparence budgétaire, de reddition des comptes et de suivi des chantiers publics en Côte d’Ivoire (LFI 2026, comptes administratifs, marchés publics et participation citoyenne).

- **Production :** [https://suivibudget.vercel.app/](https://suivibudget.vercel.app/)
- **Dépôt GitHub :** [jeananvoh-cmyk/suivibudget-ci](https://github.com/jeananvoh-cmyk/suivibudget-ci)
- **Branche principale :** `master`
- **Projet Supabase autorisé :** `cdesuvcozcetdtvibgqs` (eu-west-1, lecture seule publique)

---

## 1. Objectif & Périmètre

SuiviBudget CI permet aux citoyens, chercheurs, journalistes et organisations de la société civile de comprendre comment les ressources publiques sont allouées, programmées et exécutées sur le territoire ivoirien, du vote de la loi de finances jusqu’aux réalisations physiques sur le terrain.

### Périmètre institutionnel immédiat
- **201 Communes** et **31 Conseils Régionaux** (232 collectivités territoriales).
- **2 Districts Autonomes** (Abidjan et Yamoussoukro).
- **35 Ministères** (pouvoir exécutif, crédits LFI 2026, programmes LOLF).
- **13 Institutions de la République** (Présidence section 103, Primature, Assemblée Nationale, Sénat, Conseil Constitutionnel, CESEC, Cour des Comptes, etc.).
- **7 Autorités et Organes de Régulation** (ANRMP, ARTCI, etc.).

### Principes cardinaux
1. **Provenance documentaire obligatoire :** Aucun chiffre n’est affiché sans mentionner sa source officielle (LFI, Annexe 7, Journal Officiel, délibération, compte administratif).
2. **Absence de donnée ≠ 0 (`UNKNOWN ≠ 0`) :** L'absence temporaire d'un document ou d'une délibération est affichée comme *« Non documenté »* ou *« Publication secondaire — à confirmer »*, jamais comme zéro franc.
3. **Prévision vs Exécution :** Le Budget Primitif (`BP`), Supplémentaire (`BS`) ou Modificatif (`BM`) relève de la prévision. Seul le Compte Administratif (`CA`) atteste de l'exécution financière.
4. **Financier ≠ Physique :** Un mandat de paiement ne vaut pas preuve de réalisation physique sur le terrain (nécessité de preuves citoyennes et audits de terrain).
5. **Neutralité absolue :** Aucun classement partisan, aucun jugement d'intention ; présentation factuelle et sourcée.

---

## 2. Prérequis

- **Node.js :** Version 18.18.0 ou supérieure (recommandé Node.js 20 LTS).
- **Gestionnaire de paquets :** `npm` 9.0.0 ou supérieur.
- **Système d'exploitation :** Linux, macOS, ou Windows (PowerShell / WSL).

---

## 3. Installation & Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/jeananvoh-cmyk/suivibudget-ci.git
cd suivibudget-ci

# 2. Installer les dépendances
npm install

# 3. Copier les variables d'environnement (optionnel en mode local hors ligne)
cp .env.example .env

# 4. Lancer le serveur de développement Vite
npm run dev
```

L'application est accessible par défaut sur `http://localhost:5173/`.

---

## 4. Variables d’Environnement

Créez un fichier `.env` à la racine si vous souhaitez connecter l'instance locale au backend Supabase :

```env
# URL de l'instance Supabase (Projet autorisé cdesuvcozcetdtvibgqs)
VITE_SUPABASE_URL=https://cdesuvcozcetdtvibgqs.supabase.co

# Clé publique anonyme (anon key) - Ne JAMAIS utiliser la clé service_role côté client
VITE_SUPABASE_ANON_KEY=votre_cle_anon_publique
```

> [!CAUTION]
> **Règle de sécurité absolue :** La clé `service_role` ne doit **JAMAIS** être renseignée dans le `.env` ni présente dans le code source client. Un garde-fou automatique bloque le build et l'exécution si une clé de rôle administratif est détectée dans les variables Vite.

---

## 5. Scripts Disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur local de développement Vite avec HMR (`http://localhost:5173/`). |
| `npm run build` | Vérifie les types (`tsc`) puis compile le bundle de production dans le dossier `dist/`. |
| `npm run preview` | Prévisualise localement le build de production généré (`http://localhost:4173/`). |
| `npm test` | Exécute l'ensemble de la suite de tests automatisés avec Vitest (59 suites, 778 tests). |
| `npm run build:review` | Compile la configuration dédiée pour la revue documentaire et financière. |
| `npm run verify:supabase:read-only` | Vérifie que les requêtes vers Supabase restent strictement en lecture seule (`REMOTE_SUPABASE_WRITES = 0`). |

---

## 6. Architecture en Résumé

Le projet est conçu sous forme d'une SPA modulaire haute performance :

```
src/
├── components/          # Composants UI réutilisables (modales, cartes, navigation, formulaires)
│   ├── InstitutionDetailModal.tsx   # Fiche détaillée avec focus trap hermétique et sous-onglets
│   ├── OfficialDocRequestModal.tsx  # Générateur de demandes d'accès à l'information (CAIDP)
│   ├── ProjectDetailModal.tsx       # Fiche de chantier avec passeport de traçabilité
│   └── Header.tsx, Footer.tsx, BottomNav.tsx
├── data/                # Référentiels budgétaires et territoriaux officiels statiques
│   ├── nationalBudgetData.ts        # Crédits LFI 2026, ministères et grandes institutions
│   ├── officialDataFromCsv.ts       # Données vérifiées des 201 communes et 31 régions
│   ├── regulatoryAuthoritiesData.ts # Organes et autorités de régulation (ANRMP, ARTCI, etc.)
│   └── officialPublicDocumentsCatalog.ts # Catalogue des documents sources officiels (PDF, JO)
├── pages/               # Vues principales de l'application
│   ├── HomePage.tsx                 # Page d'accueil citoyenne
│   ├── InstitutionsPage.tsx         # Annuaire républicain unifié (navigation par onglets/sections)
│   ├── ProjectsPage.tsx             # Explorateur de projets et marchés publics
│   ├── DocumentsPage.tsx            # Bibliothèque documentaire officielle
│   ├── ObservatoryPage.tsx          # Observatoire budgétaire et visualisations
│   └── AdminLoginPage.tsx           # Authentification sécurisée de l'administration
├── services/            # Couche d'accès aux données et connecteurs
│   ├── dataStore.ts                 # Store réactif local combinant cache statique et flux Supabase
│   └── supabase.ts                  # Client Supabase sécurisé (garde-fous anti-fuite de clés)
├── types/               # Définitions TypeScript strictes (Institution, BudgetProject, etc.)
└── utils/               # Logique métier, intégrité financière et sécurité
    ├── institutionBudgetHelper.ts   # Moteur de calcul, barrière AUDITED_FINANCIAL_CLAIMS et exports
    ├── security.ts                  # Sanitisation XSS, protection injection CSV/Excel (=, +, -, @)
    └── navigation.ts                # Gestionnaire d'URLs propres et canoniques
```

---

## 7. Documentation Technique Complète

Pour approfondir le fonctionnement et assurer la maintenance autonome du projet, consultez les guides détaillés :

- [Guide de prise en main en 1 jour](docs/maintenance/START_HERE.md) — Démarrage express, réponses aux 10 questions clés.
- [Vue d’ensemble de l’Architecture](docs/architecture/OVERVIEW.md) — Schéma fonctionnel, flux de données et responsabilités.
- [Modèle de Données & Supabase](docs/architecture/DATA_MODEL.md) — Schéma des tables, politiques RLS et pièces jointes.
- [Règles Budgétaires & Intégrité](docs/architecture/BUDGET_RULES.md) — LFI, BP, CA, périmètres et invariants financiers.
- [Runbook d’Exploitation & Dépannage](docs/maintenance/RUNBOOK.md) — Diagnostic de bugs, incidents fréquents et résolutions.
- [Guide de Déploiement & Rollback](docs/maintenance/DEPLOYMENT.md) — CI GitHub Actions, Vercel et vérification de SHA.
- [Guide des Évolutions & PR](docs/maintenance/CHANGE_GUIDE.md) — Ajouter une entité, modifier un chiffre ou ajouter un test.
- [Rapport de Recette Finale](docs/audits/final/FINAL_PRODUCTION_AND_MAINTENANCE_REPORT.md) — Statut officiel et conformité production.

---

## 8. Licence & Déontologie

Ce projet est un commun numérique citoyen développé sous licence ouverte. L'utilisation des données officielles respecte le cadre légal ivoirien de l'accès aux documents administratifs (Loi n°2013-867 relative à l'accès à l'information d'intérêt public).
