# 04 — Réconciliation des Agrégats Financiers, Ventilation Sectorielle, Exercices et Périmètre Institutionnel

**Date de contrôle :** 15 novembre 2026  
**Branche de remédiation :** `antigravity/p0-financial-compliance-remediation`  
**Commits associés :** `bce36664e75be5fcddfb0ad1f0da6503d3dc5931`, `e89dd487f2c65b6ededfefece1c069baed411c6f`

---

## 1. Ventilation sectorielle de `HomePage.tsx` (Résolution du bloqueur P0 de `566 270 784 555 FCFA` omis)

### 1.1 Cause de l'anomalie sur `origin/master` (`c9bd106`)

Sur `origin/master`, `HomePage.tsx` filtrait les projets par sous-chaîne sensible aux accents (`p.category.toLowerCase().includes(s.key)`) sur seulement 6 clés (`infrastructure`, `éducation`, `santé`, `eau`, `logement`, `commerce`) et appliquait un plancher artificiel `Math.max(2, Math.round((amount / totalBudget) * 100))` :
- Les catégories codées en majuscules sans accent dans `RAW_BUDGET_PROJECTS` (`EDUCATION` : `174 815 470 890 FCFA`, `SANTE` : `34 552 730 073 FCFA`) étaient exclues de `Éducation` et `Santé` ;
- Les secteurs `ADMINISTRATION` (`270 617 449 159 FCFA`), `AGRICULTURE` (`28 730 178 900 FCFA`), `SECURITE`, `ENERGIE`, `ENVIRONNEMENT`, `CULTURE_SPORT`, `SOCIAL` n'étaient rattachés à aucune barre ;
- Au total, **`566 270 784 555 FCFA`** (`1 357` lignes sur `4 708`, soit **29,6 %** de l'agrégat) disparaissaient silencieusement de la répartition sectorielle.

### 1.2 Remédiation implémentée (`src/utils/publicIndicators.ts` & `src/pages/HomePage.tsx`)

1. **Normalisation canonique insensible à la casse et aux accents (`normalizeSectorCategory` & `computeSectorBreakdown`) :**
   - `normalizeSectorKey` applique `.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()` ;
   - `Éducation`, `EDUCATION`, `Enseignement`, `Formation`, `Alphabétisation` convergent toutes vers le secteur canonique `EDUCATION` ;
   - `Santé`, `SANTE`, `Hygiène`, `Hôpital`, `Médical`, `CMU` convergent toutes vers `HEALTH` ;
   - Tout reliquat non classé dans les 12 secteurs principaux est comptabilisé dans la catégorie explicite `UNALLOCATED` (`Autres / Non ventilé`).
2. **Suppression du plancher artificiel `Math.max(2, ...)` :**
   - Les pourcentages sont calculés exactement par `(amount / referenceTotal) * 100` (arrondis à 1 décimale `Math.round(rawPct * 10) / 10`), sans jamais gonfler artificiellement un secteur minoritaire à `2 %`.
3. **Réconciliation mathématique exacte à 100 % :**
   - Sur le périmètre des opérations classées d'investissement 2026 (`CLASSIFIED_INVESTMENT_OPERATIONS` : **`4 657` opérations** pour **`1 798 733 552 572 FCFA`**), la somme des montants des secteurs affichés par `computeSectorBreakdown(investmentOperations2026)` est **strictement égale à `1 798 733 552 572 FCFA` (écart = `0 FCFA`)**, et la somme des opérations ventilées est **strictement égale à `4 657`**.

---

## 2. Séparation stricte des exercices budgétaires (`2021` vs `2026`) et des provenances

| Identifiant / Lot | Intitulé & Collectivité | Exercice réel | Montant (FCFA) | Traitement sur `antigravity/p0-financial-compliance-remediation` |
|---|---|---:|---:|---|
| `nat-strat-001` | Aménagement et bitumage de la route Séguéla - Touba (Worodougou / Bafing) | **`2021`** (`fiscal_year: 2021`, `is_multi_year_contract: true`, `data_provenance: 'HISTORICAL_MULTIYEAR'`) | `104 700 000 000` | **Exclu de tous les agrégats et compteurs LFI 2026** (`HomePage`, `ProjectsPage` filtre `2026` par défaut, `BudgetReportsView` 2026, `InstitutionDetailModal` 2026). Affiché uniquement sous filtre `PRIOR_MULTIYEAR` / `ALL` avec badge ambre `Marché pluriannuel • Exercice 2021`. |
| `proj-bouake-001` à `proj-bouake-005` | 5 projets municipaux de Bouaké (`mairiedebouake.ci`) | `2026` (`data_provenance: 'LOCAL_PORTAL_BOUAKE'`) | `0` (`budget_amount_fcfa: null` / non chiffré LFI) | **Séparés des crédits LFI 2026** dans `InstitutionDetailModal.tsx` et identifiés comme `PORTAIL_MUNICIPAL_EXTERNE` à l'export CSV. |
| Opérations LFI 2026 (`4 657` lignes d'investissement + `49` lignes de fonctionnement/équipement) | `4 706` lignes `2026` hors portail externe | **`2026`** | `1 798 733 552 572` (investissement classé) + `7 423 480 793` (fonctionnement/équipement hors chantier) = `1 806 157 033 365` | Comptabilisées séparément entre `CLASSIFIED_INVESTMENT_OPERATIONS` (`4 657` lignes) et `OPERATING_OR_EQUIPMENT` (`49` lignes). |

---

## 3. Réconciliation des Ministères (`35` portefeuilles / `34` sections) et Grandes Institutions (`14` fiches / `11` sections autonomes)

### 3.1 Ministères (`LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json` & `src/utils/institutionBudgetHelper.ts`)

1. **35 portefeuilles gouvernementaux rattachés à 34 sections LFI uniques :**
   - La section **`229`** (`333 878 089 526 FCFA`, Article 15, PDF p. 19) est partagée entre `gov-009` (Ministre de l'Agriculture, du Développement Rural et des Productions Vivrières) et `gov-035` (Ministre délégué chargé des Productions Vivrières).
   - `resolveInstitutionBudgetPresentation` marque les deux fiches en `aggregation: 'SHARED_SECTION'`, `public/data/budgets-entites-2026.csv` marque `gov-035` en `NON_DOUBLON`, et `getAdditiveMinistriesVotedCpTotal()` ne compte la section `229` **qu'une seule fois** (`8 980 302 047 415 FCFA` sur les 34 sections uniques, contre `9 314 180 136 941 FCFA` si `gov-035` était additionné par erreur).
2. **Cas de `gov-007` (Ministère de l'Économie, des Finances et du Budget — Section `322`) :**
   - Trois montants de natures différentes coexistaient dans les fichiers de travail :
     - **`671 323 963 425 FCFA`** : Crédits de paiement (CP) votés des programmes ministériels de la section `322` (LFI 2026, Article 15, PDF p. 15) — **montant de référence retenu** dans `resolveInstitutionBudgetPresentation` ;
     - **`8 699 982 915 992 FCFA`** : Total récapitulatif de la section `322` incluant les dotations globales et le service de la dette publique (Tableau récapitulatif LFI 2026, PDF p. 46) ;
     - **`2 038 854 932 647 FCFA`** : Ancien agrégat historique d'annuaire combinant les sections candidates `322` et `328` hors dette (classé en supplément `TO_VERIFY` non certifié).
   - `resolveInstitutionBudgetPresentation` explicite désormais cette distinction directement dans la notice publique de `gov-007`.

### 3.2 Grandes Institutions (`14` fiches) et Autorités de Régulation (`7` fiches)

1. **Section `103` (Présidence de la République) et sous-programmes internes (`inst-ige`, `inst-habg`) :**
   - `inst-presidence` (Section `103`, PDF p. 45) = **`193 633 705 615 FCFA`** ;
   - `inst-ige` (Programme `13003` de la Section `103`, PDF p. 45) = **`9 872 577 575 FCFA`** (`aggregation: 'INCLUDED_IN_PARENT'`) ;
   - `inst-habg` (Programme `13004` de la Section `103`, PDF p. 45) = **`5 552 174 916 FCFA`** (`aggregation: 'INCLUDED_IN_PARENT'`) ;
   - Total brut des 13 lignes non nulles = `314 003 879 687 FCFA` ; **Total additif certifié des 11 sections autonomes (`getAdditiveNationalInstitutionsLfiTotal()`) = `298 579 127 196 FCFA`** (`314 003 879 687 − 9 872 577 575 − 5 552 174 916`).
   - `inst-cour-supreme` (14e fiche) = `null` (`Non individualisé (LFI 2026)` — sections autonomes `114` Cour de Cassation, `118` Conseil d'État et `115` Cour des Comptes).
2. **Autorités de régulation (`7` fiches : ARCOP, HACA, CNDH, CAIDP, AIRP, ARTCI, ANARE-CI) :**
   - `total_budget_fcfa = null` sur les 7 fiches (`reference.amount_fcfa = null`) ;
   - Pour ARCOP (`11 287 646 212 FCFA`), HACA (`2 925 935 066 FCFA`), CNDH (`1 933 737 123 FCFA`), CAIDP (`938 179 346 FCFA` ASS / `419 179 346 FCFA` LFI) et AIRP (`996 632 520 FCFA` activité `78074000605`), les montants partiels ou d'Annexe 6 ASS sont présentés exclusivement en `supplements` (`COMPLEMENT_NON_ADDITIF`), jamais comme budget global certifié.

---

## 4. Périmètre des 232 collectivités territoriales et séparation des 2 Districts Autonomes

- **201 communes (`type === 'MAIRIE'`) + 31 conseils régionaux (`type === 'REGION'`) = 232 collectivités territoriales.**
- Les **2 districts autonomes** (`inst-reg-district-autonome-d-abidjan` et `inst-reg-district-autonome-de-yamoussoukro`, `type === 'DISTRICT'`) sont comptés et affichés séparément (`31 Régions + 2 Districts` dans `InstitutionsPage.tsx`, `AnnuaireIndexPage.tsx`, `RegionalCouncilsPage.tsx` et `Footer.tsx`).
- Sur `inst-reg-district-autonome-d-abidjan` (`src/data/officialDataFromCsv.ts`), le montant d'investissement précédemment codé à `0` sans preuve a été corrigé à `null` (`budget_investment_fcfa: null`, `budget_functioning_fcfa: null`).
