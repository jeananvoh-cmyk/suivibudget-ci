# Guide des Évolutions & Contributions (CHANGE_GUIDE)

Ce guide détaille pas à pas comment apporter une modification au code, ajouter une donnée officielle ou étendre une fonctionnalité de SuiviBudget Côte d’Ivoire sans créer de régression financière ni violer la charte éthique.

---

## 1. Règles d’Or pour Toute Contribution

1. **Aucune régression sur `UNKNOWN ≠ 0` :** Si une donnée est manquante, ne mettez jamais `0` ni `""` là où un statut explicite est requis.
2. **Provenance obligatoire :** Tout montant doit pouvoir remonter à un document légal officiel identifié (référence, page, URL, SHA-256).
3. **Tests obligatoires avant PR :** Toute modification de logique métier doit s'accompagner d'un test unitaire dans `src/utils/__tests__/` ou `src/components/__tests__/`.
4. **`REMOTE_SUPABASE_WRITES = 0` :** Ne jamais tenter d'insérer des données de test sur l'instance Supabase de production.

---

## 2. Cas Pratique 1 : Modifier ou Mettre à Jour une Fiche Budgétaire

### Scénario : Vous disposez de la délibération originale du Budget Primitif 2026 d'une commune.

1. **Vérifier le fichier PDF source :**
   - Calculez l'empreinte SHA-256 du document officiel :
     ```bash
     # Sous Windows PowerShell :
     Get-FileHash -Algorithm SHA256 chemin\vers\deliberation.pdf
     # Sous Linux / macOS :
     sha256sum chemin/vers/deliberation.pdf
     ```
2. **Ajouter le document au catalogue :**
   - Ouvrez [src/data/officialPublicDocumentsCatalog.ts](../../src/data/officialPublicDocumentsCatalog.ts).
   - Ajoutez l'entrée du document avec son titre officiel, sa page, son URL pérenne et son SHA-256.
3. **Mettre à jour la barrière d'intégrité budgétaire :**
   - Ouvrez [src/utils/institutionBudgetHelper.ts](../../src/utils/institutionBudgetHelper.ts).
   - Si le document est un transfert d'État ou une dotation LFI certifiée, ajoutez une entrée dans `AUDITED_FINANCIAL_CLAIMS`.
   - Renseignez précisément :
     ```typescript
     {
       document_reference: "Délibération Conseil Municipal N° ...",
       action_code: "BP_2026",
       amount_fcfa: 1500000000,
       sha256: "votre_hash_sha256_officiel",
       institution_id: "inst-com-nomcommune"
     }
     ```
4. **Vérifier par un test :**
   - Exécutez : `npx vitest run src/utils/__tests__/budgetBreakdownIntegrityGate.test.ts`.

---

## 3. Cas Pratique 2 : Ajouter une Nouvelle Entité ou Institution

1. **Définir la structure de l'entité :**
   - Si c'est une autorité administrative ou un régulateur, modifiez [src/data/regulatoryAuthoritiesData.ts](../../src/data/regulatoryAuthoritiesData.ts).
   - Si c'est une institution de la République ou un ministère, modifiez [src/data/nationalBudgetData.ts](../../src/data/nationalBudgetData.ts).
2. **Champs obligatoires à renseigner :**
   ```typescript
   {
     id: "reg-nom-court",
     name: "Nom Républicain Complet",
     type: "AUTORITE_REGULATION",
     base_legale: "Loi N°...",
     mission: "Description synthétique de la mission d'intérêt public",
     budget_2026: {
       total_fcfa: null, // Si non encore audité ou publié séparément
       verification_status: "NOT_FOUND_PUBLICLY",
       source: "En attente de publication officielle"
     }
   }
   ```
3. **Contrôler la vue dans l'annuaire :**
   - Lancez `npm run dev` et vérifiez l'affichage sous `/institutions/regulateurs`.

---

## 4. Cas Pratique 3 : Écrire un Test Automatisé

### Exemple : Tester un comportement d'accessibilité ou de calcul

1. Créez un fichier dans `src/utils/__tests__/monNouveauTest.test.ts` :
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { formatFcfaAmount } from '../formatters';

   describe('MonNouveauTest', () => {
     it('respecte l invariant UNKNOWN != 0', () => {
       const result = formatFcfaAmount(null);
       expect(result).not.toBe('0 FCFA');
       expect(result).toBe('Non documenté');
     });
   });
   ```
2. Lancez le test :
   ```bash
   npx vitest run src/utils/__tests__/monNouveauTest.test.ts
   ```

---

## 5. Préparation et Soumission d’une Pull Request (PR)

### Workflow Standard Recommandé

```bash
# 1. Partir du dernier master à jour
git checkout master
git pull origin master

# 2. Créer une branche thématique dédiée
git checkout -b fix/nom-descriptif-du-correctif
# ou
git checkout -b feat/nom-de-la-fonctionnalite

# 3. Effectuer vos modifications avec des commits atomiques
git add src/chemin/fichier.ts
git commit -m "fix(a11y): corriger le focus trap sur mobile dans la modale"

# 4. Exécuter l'ensemble des validations locales obligatoires
npm test
npm run build

# 5. Pousser la branche sur GitHub
git push -u origin fix/nom-descriptif-du-correctif

# 6. Ouvrir la PR via GitHub CLI ou l'interface web
gh pr create --title "fix(a11y): sécuriser le focus trap mobile" --body "Description des modifications apportées..."
```

---

## 6. Les 5 Erreurs les Plus Fréquentes à Éviter

| Erreur Courante | Risque pour le Projet | Solution / Règle |
|---|---|---|
| **Sommer la HABG ou l'IGE avec la Présidence** | Double comptage (leurs crédits sont déjà dans la Section 103). | Les présenter comme inclus dans la Section 103 sans addition. |
| **Considérer une délibération AIP comme certifiée** | Confondre une source de presse secondaire avec la délibération originale scannée. | Utiliser `verification: 'TO_VERIFY'` et garder les pourcentages à `null`. |
| **Utiliser `innerHTML` sans sanitisation** | Vulnérabilité XSS (Cross-Site Scripting). | Utiliser les composants React natifs et `sanitizeInput()` de `security.ts`. |
| **Exporter du CSV sans neutraliser les formules** | Attaque par injection CSV/Excel (`=CMD()`, `@SUM`). | Passer chaque cellule dans `sanitizeCsvCell()` qui préfixe les formules avec `'`. |
| **Casser le focus trap en ajoutant des éléments `display: none`** | Piégeage de focus défectueux sur smartphone. | S'assurer que les nouveaux boutons ou liens masqués sur mobile sont filtrés par `isElementEffectivelyVisible()`. |
