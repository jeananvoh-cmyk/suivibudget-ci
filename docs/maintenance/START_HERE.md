# Guide de Prise en Main en 1 Jour (START_HERE)

Bienvenue sur le projet **SuiviBudget Côte d’Ivoire** ! Ce document est spécialement rédigé pour vous permettre d'être **pleinement autonome et opérationnel en moins d'une journée**, sans avoir besoin d'historique de discussion ni d'agents conversationnels.

---

## Les 10 Réponses Clés pour Travailler Immédiatement

### 1. Comment installer le projet ?

Assurez-vous d'avoir **Node.js 18+** (ou 20 LTS) et **npm 9+** installés sur votre machine :

```bash
# Vérifier vos versions
node -v
npm -v

# Cloner le dépôt et installer les dépendances
git clone https://github.com/jeananvoh-cmyk/suivibudget-ci.git
cd suivibudget-ci
npm install
```

---

### 2. Comment démarrer une version locale ?

Lancez le serveur de développement Vite :
```bash
npm run dev
```
Ouvrez votre navigateur sur **`http://localhost:5173/`**. Le rechargement à chaud (HMR) est actif : chaque modification de fichier s'affiche instantanément.

Pour tester le build de production réel localement :
```bash
npm run build
npm run preview
```
L'application compilée s'exécute sur `http://localhost:4173/`.

---

### 3. Où se trouvent les différentes fonctionnalités ?

| Fonctionnalité | Chemin du Fichier Principal | Description |
|---|---|---|
| **Page d'accueil citoyenne** | `src/pages/HomePage.tsx` | Indicateurs clés nationaux, barre de recherche et accès rapide. |
| **Annuaire républicain (Institutions)** | `src/pages/InstitutionsPage.tsx` | Gestionnaire d'onglets pour Ministères, Collectivités, Régulateurs. |
| **Mairies (201 communes)** | `src/pages/institutions/MunicipalitiesPage.tsx` | Cartes des communes, filtres par région/district, boutons Fiche. |
| **Conseils Régionaux (31 régions)** | `src/pages/institutions/RegionalCouncilsPage.tsx` | Cartes des régions, présidents et budgets locaux. |
| **Ministères (35 départements)** | `src/pages/institutions/MinistriesPage.tsx` | Crédits LFI 2026, ventilation LOLF et programmes ministériels. |
| **Grandes Institutions (13 organes)** | `src/pages/institutions/NationalInstitutionsPage.tsx` | Présidence, Primature, Assemblée, CESEC, IGE, HABG, etc. |
| **Autorités de Régulation (7 AAI)** | `src/pages/institutions/RegulatoryAuthoritiesPage.tsx` | ANRMP, ARTCI et organes indépendants. |
| **Fiche détaillée d'une institution** | `src/components/InstitutionDetailModal.tsx` | Modale complète avec focus trap accessible et sous-onglets budgétaires. |
| **Demande officielle CAIDP** | `src/components/OfficialDocRequestModal.tsx` | Modale de formulaire de demande conforme à la Loi n°2013-867. |
| **Projets & Marchés publics** | `src/pages/ProjectsPage.tsx` | Consultation des chantiers avec filtres et attributaires DGMP. |
| **Fiche détaillée d'un chantier** | `src/components/ProjectDetailModal.tsx` | Passeport de traçabilité, localisation et état d'avancement. |
| **Bibliothèque documentaire** | `src/pages/DocumentsPage.tsx` | Consultation et téléchargement des actes officiels et LFI. |
| **Observatoire citoyen** | `src/pages/ObservatoryPage.tsx` | Graphiques d'analyse macro-budgétaire et comparatifs. |
| **Espace Administration** | `src/pages/AdminLoginPage.tsx` | Écran de connexion sécurisé pour les modérateurs et administrateurs. |

---

### 4. Où modifier un montant affiché incorrectement ?

Tous les calculs, vérifications et affichages budgétaires passent par un point central unique :
👉 **`src/utils/institutionBudgetHelper.ts`**

- **Pour une commune ou une région :**
  - Données sources dans `src/data/officialDataFromCsv.ts` (ou `src/data/localBudgetsReferential.ts`).
  - La fonction `resolveInstitutionBudgetPresentation(institution)` calcule les montants bruts, le statut de vérification (`VERIFIED`, `TO_VERIFY`, `NOT_FOUND_PUBLICLY`) et les libellés affichés.
- **Pour une dotation État certifiée (ex: Attécoubé) :**
  - Cherchez le registre `AUDITED_FINANCIAL_CLAIMS` dans `src/utils/institutionBudgetHelper.ts`.
  - C'est ce tableau qui autorise la certification `VERIFIED` en exigeant le montant exact, l'action LOLF et le hash SHA-256 du document officiel.
- **Pour un ministère ou une institution républicaine :**
  - Les montants LFI 2026 sont définis dans `src/data/nationalBudgetData.ts`.

---

### 5. Comment vérifier sa source officielle ?

1. Consultez le catalogue des documents : **`src/data/officialPublicDocumentsCatalog.ts`**.
2. Chaque document comporte son URL officielle (DGBF, Journal Officiel, etc.), sa page exacte et son empreinte cryptographique SHA-256.
3. Pour vérifier l'empreinte d'un fichier PDF officiel :
   ```bash
   # Windows PowerShell
   Get-FileHash -Algorithm SHA256 chemin\vers\document.pdf
   # Linux / macOS
   sha256sum chemin/vers/document.pdf
   ```

---

### 6. Comment accéder aux tests pertinents ?

La suite utilise **Vitest**.

```bash
# Lancer tous les tests (59 fichiers, 778 tests)
npm test

# Lancer un test en mode écoute (re-exécute au changement de code)
npx vitest src/utils/__tests__/budgetBreakdownIntegrityGate.test.ts

# Lancer le test d'accessibilité de la modale
npx vitest run src/components/__tests__/institutionDetailModalFocusTrap.test.ts

# Lancer les tests d'intégrité financière
npx vitest run src/utils/__tests__/financialIntegrity.test.ts
```

---

### 7. Comment comprendre les données Supabase ?

Le projet Supabase de référence est **`cdesuvcozcetdtvibgqs`** (eu-west-1).
- Le schéma relationnel et les tables sont documentés dans [docs/architecture/DATA_MODEL.md](docs/architecture/DATA_MODEL.md).
- Les migrations SQL se trouvent dans `supabase/migrations/`.
- **En mode anonyme (`anon`) :** Le client web ne peut lire que les documents `PUBLISHED` et les preuves `APPROVED`. Toutes les écritures d'administration requièrent une session authentifiée protégée par RLS.
- **Mode lecture seule de sécurité :** Vous pouvez lancer `npm run verify:supabase:read-only` pour auditer qu'aucune écriture intempestive n'est émise.

---

### 8. Comment corriger un bug sans impacter la production ?

1. Créez une branche Git locale isolée :
   ```bash
   git checkout -b fix/nom-de-mon-correctif
   ```
2. Apportez votre modification dans `src/`.
3. Lancez les tests ciblés puis l'ensemble de la suite :
   ```bash
   npm test
   ```
4. Vérifiez la compilation TypeScript et le build Vite :
   ```bash
   npm run build
   ```
5. Si tous les tests sont verts et que le build réussit sans erreur TypeScript, votre correctif est prêt.

---

### 9. Comment préparer une Pull Request (PR) ?

```bash
# 1. Vérifier le statut des fichiers modifiés
git status

# 2. Créer un commit clair et atomique
git add src/chemin/fichier.tsx
git commit -m "fix(a11y): ajuster le focus trap sur petit écran"

# 3. Pousser la branche sur GitHub
git push -u origin fix/nom-de-mon-correctif

# 4. Ouvrir la PR sur GitHub
gh pr create --title "fix(a11y): ajuster le focus trap sur petit écran" --body "Explication du correctif..."
```
Le pipeline GitHub Actions `verify` se déclenche automatiquement pour exécuter les tests et le build.

---

### 10. Comment déployer et revenir en arrière (Rollback) ?

- **Déploiement normal :**
  - Lorsque la PR est approuvée et fusionnée sur `master`, Vercel déclenche automatiquement le build et la publication en production sur `https://suivibudget.vercel.app/`.
  - Vous pouvez suivre le statut du déploiement via :
    ```bash
    gh api "repos/jeananvoh-cmyk/suivibudget-ci/deployments?environment=Production&per_page=1"
    ```
- **Rollback instantané (en cas d'urgence) :**
  1. Allez sur `https://vercel.com/jeananvoh-8596s-projects/suivibudget-ci/deployments`.
  2. Trouvez le déploiement précédent valide.
  3. Cliquez sur `...` > **Promote to Production**.
  4. La production est rétablie immédiatement sans re-compiler.
