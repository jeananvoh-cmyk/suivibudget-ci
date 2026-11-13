# SuiviBudget Côte d’Ivoire — Plan d’Implémentation Progressif (Alignement Existant ↔ Roadmap Internationale)

**Référence cible :** [ROADMAP_CIVIC_TECH_STANDARDS.md](ROADMAP_CIVIC_TECH_STANDARDS.md)  
**Branche de travail :** `fix/reconcile-public-indicators` (puis lots atomiques dédiés si souhaité)  
**Garde-fou absolu :** Zéro régression sur les données publiées (Cocody CA 2024, Tiassalé CA 2024, Bingerville, LFI 2026), `REMOTE_SUPABASE_WRITES = 0` jusqu'à validation explicite du propriétaire.

---

## 1. Cartographie Réelle : Ce qui existe déjà vs Ce qui manque

Avant d'écrire une ligne de code, l'audit direct du dépôt montre que **plusieurs briques structurantes sont déjà développées** mais incomplètement reliées ou dépourvues des formats standards internationaux :

| Pilier Roadmap | Déjà implémenté dans le code | Écarts réels à combler |
|---|---|---|
| **Jalon 0 — Socle & Intégrité** | `computePublicIndicators` (`src/utils/publicIndicators.ts`), séparation État (`1 611,1 Mds`) / Collectivités (`195,1 Mds`), pagination vérifiée 44 p. Cocody, RLS schéma `private` + migration `20261026213000_security_definer_hardening.sql`, `compressAndSanitizeImage` (`src/utils/security.ts`). | Fusion PR #65 + PR #68 sur `master`, application distante Supabase contrôlée par le propriétaire. |
| **Jalon 1 — Commande Publique & OCDS** | `ProcurementMatch` (`src/types/administrativeAccount.ts`), `findMatchingDgmpProcurement` & étape 3 `PROCUREMENT_DGMP` dans `src/utils/projectPassport.ts`, rapprochement CA dans `caGeneralizationAndRubrics`. | Absence de schéma **OCDS v1.1** (`ocid`, `tender`, `awards`, `contracts`, `parties`), absence d'export `.ocds.json`, absence de vue comparative synthétique 3 colonnes (*Voté BP ↔ Adjugé DGMP ↔ Ordonnancé CA*) et champs `procurement_method` / `bomp_reference`. |
| **Jalon 2 — Civic Monitoring & Passeport** | `ProjectAccountabilityPassport.tsx` (6 étapes + provenance + `ApecParticipation`), `SendProofModal.tsx` (wizard 3 étapes, `tracking_code`, brouillon, compression image 1280px/0.85), `ProjectDetailModal.tsx` (onglet `'passport'`). | Pas de deep-link direct `?project=<id>&view=passport`, pas de bloc QR/lien chantier pérenne sur le Passeport, plafond strict `< 300 Ko` pour zones 2G/3G non appliqué dans `compressAndSanitizeImage`, `ProjectCard.tsx` peut afficher un taux déclaratif sans alerte d'absence de constat terrain. |
| **Jalon 3 — CAIDP 30 Jours & Droit de Réponse** | `OfficialDocRequestModal.tsx`, `CaidpRiManager.tsx`, `CaidpAnalyticsManager.tsx`, `dataStore.logCaidpRequest()`, `InstitutionResponse` dans `administrativeAccount.ts` & `projectPassport.ts`. | Pas de calcul automatique de l'**échéance légale de 30 jours** (`created_at + 30j`) ni de statut public (`EN_ATTENTE`, `DELAI_EXPIRE_SAISINE_CAIDP`, `DOC_OBTENU`), ni de portail d'authentification institutionnelle pour droit de réponse. |
| **Jalon 4 — Inclusion Hors-Ligne & Open Data** | Exports CSV dans `Footer.tsx` & `BudgetDataDownloads.tsx`, `window.print()` dans `ProjectDetailModal.tsx`. | Absence de fiche **« Budget Citoyen A4 en 1 Page »** optimisée pour affichage mairie/APEC/village, absence d'export Open Data OCDS global dans le Footer / DocumentsPage. |

---

## 2. Découpage en 4 Lots Progressifs (Zéro Réécriture Arbitraire)

### Lot P1 — Alignement OCDS v1.1 & Deep-Link Passeport *(✅ Implémenté — PR #68)*
- **Livrables code :**
  1. `src/types/ocds.ts` : Interfaces standardisées OCDS v1.1 (`OcdsReleasePackage`, `OcdsRelease`, `OcdsTender`, `OcdsAward`, `OcdsContract`, `OcdsParty`).
  2. `src/types/administrativeAccount.ts` & `src/types/index.ts` : Ajout optionnel rétrocompatible `procurement_method?`, `bomp_reference?`, `ocid?`.
  3. `src/utils/ocdsMapper.ts` : Export pur d'un `ProjectAccountabilityPassportData` vers OCDS v1.1 sans jamais inventer de montant ni transformer `null` en `0`.
  4. `src/utils/navigation.ts` + `src/App.tsx` + `src/components/ProjectDetailModal.tsx` : Support du lien direct `/projets?project=<id>&view=passport` (`parseProjectViewTab`, `getProjectPassportPath`).
  5. `src/components/ProjectAccountabilityPassport.tsx` : Bloc de comparaison financière 3 colonnes (*Budget voté BP ↔ Marché adjugé DGMP ↔ Ordonnancé CA*) + bouton d'export JSON OCDS + copie du lien Passeport.
  6. `src/utils/__tests__/ocdsMapper.test.tsx` + `src/utils/__tests__/navigation.test.ts`.

### Lot P2 — Horloge Légale CAIDP 30 Jours & Traçabilité Citoyenne *(✅ Implémenté — PR #68)*
- **Livrables code :**
  1. `src/utils/caidpDeadlines.ts` : Calcul pur du délai légal Loi n° 2013-867 (`30` jours calendaires), statuts `WITHIN_LEGAL_DELAY` / `DUE_TODAY` / `LEGAL_DELAY_EXPIRED` / `DOCUMENT_PUBLISHED`.
  2. Intégration dans `CaidpAnalyticsManager.tsx` et `InstitutionDetailModal.tsx` (affichage de l'horloge sur les collectivités ayant fait l'objet d'une requête CAIDP).
  3. Compression adaptative `< 300 Ko` dans `compressAndSanitizeImage` (`src/utils/security.ts`) pour les preuves photo en zone 2G/3G + rappel explicite `Financier != Physique` dans `ProjectCard.tsx`.
  4. `src/utils/__tests__/caidpDeadlines.test.tsx` + `src/utils/__tests__/security.test.ts`.

### Lot P3 — QR Code Chantier & Fiche Imprimable « Budget Citoyen 1 Page (A4) » *(✅ Implémenté — PR #68)*
- **Livrables code :**
  1. Générateur SVG déterministe ISO/IEC 18004 de QR Code (`src/utils/qrCode.ts`, `src/components/common/QrCodeSvg.tsx`) pointant vers `/projets?project=<id>&view=passport` + export `.svg` dans `ProjectAccountabilityPassport.tsx`.
  2. Composant d'impression dédiée `CitizenOnePageSummary.tsx` (A4 portrait via `@media print` dans `src/index.css` : Qui ? Combien ? Secteurs 2026, 3 projets majeurs, contact RI CAIDP, SHA-256 des sources, QR Code) accessible depuis `InstitutionDetailModal.tsx`.
  3. `src/utils/__tests__/qrCode.test.tsx`.

### Lot P4 — Open Data Package Global & Droit de Réponse Institutionnel *(✅ Implémenté — PR #68)*
- **Livrables code :**
  1. Export global `.ocds.json` par collectivité/exercice (`createFilteredOcdsReleasePackage` dans `src/utils/ocdsMapper.ts`, boutons d'export dans `src/components/Footer.tsx` et `src/pages/DocumentsPage.tsx`, en complément du CSV existant).
  2. Workflow modéré de soumission/validation de `InstitutionResponse` (`src/services/institutionResponseService.ts`, `src/components/admin/InstitutionResponseManager.tsx`, `src/pages/AdminDashboardPage.tsx`, hydratation Supabase dans `src/data/administrativeAccountsData.ts` et `src/services/administrativeAccountsService.ts`, affichage public filtré `PUBLISHED` conforme au Principe 8 dans `src/components/AdministrativeAccountView.tsx`, tests dans `src/utils/__tests__/institutionResponses.test.tsx`).

---

## 3. Critères d'Acceptation à Chaque Lot
- `npx tsc --noEmit` : 0 erreur.
- `npx vitest run` : 100 % des suites passent (y compris non-régression Cocody CA 2024, Tiassalé, `publicIndicators`, `projectPassport`, `navigation`).
- `npm run build` et `npm run build:review` : succès sans erreur.
- Aucune donnée manquante transformée en `0` ; aucune écriture distante Supabase non autorisée.
