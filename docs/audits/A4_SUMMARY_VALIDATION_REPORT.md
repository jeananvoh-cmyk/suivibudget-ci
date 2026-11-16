# Rapport de Validation Réelle PDF A4 — PR #73 (`feat/citizen-a4-summary-sheet`)

**Date :** 2026-11-16  
**Branche :** `feat/citizen-a4-summary-sheet` (PR #73)  
**Commit de base contrôlé :** `e6440e29ff455c47b4293c8c10b27aff421d8c5e`  
**Moteur de rendu réel :** Chromium headless (`playwright-core` + `chrome-win64/chrome.exe`) + `pdfjs-dist`  
**Script reproductible :** `npm run verify:a4-pdf` ([scripts/verify-a4-summary-pdf.mjs](file:///c:/Users/Couple%20ANVOH/Projects/suivibudget-ci/scripts/verify-a4-summary-pdf.mjs))

---

## 1. Anomalies détectées lors du premier rendu Chromium réel & correctifs appliqués

1. **Multi-pages blanches (3 pages au lieu d'1) sous `@media print` :**
   - *Cause :* `body * { visibility: hidden }` masquait visuellement `MunicipalitiesPage` et `<InstitutionDetailModal />` tout en conservant leur hauteur dans le flux DOM, générant 2 pages A4 blanches (`textLen: 0`) après la page 1.
   - *Correctif (`src/components/CitizenOnePageSummary.tsx` + `src/index.css`) :* Rendu via `createPortal(..., document.body)` (avec repli SSR sûr pour `renderToStaticMarkup`), conteneur `.citizen-print-portal` et règle `@media print` `body:has(#citizen-one-page-summary) > *:not(:has(#citizen-one-page-summary)) { display: none !important; }` avec `@page { size: A4 portrait; margin: 10mm 12mm; }`. Résultat : **`1` seule page A4 exacte (`numPages === 1`)** sur les 3 scénarios.
2. **Règle explicite de gestion de dépassement et suppression de troncatures silencieuses (`truncate`) :**
   - Suppression de `truncate` sur les noms de secteurs et titres SHA-256 (`break-words`).
   - Mention explicite lorsque la liste dépasse le quota compact A4 : `"3 Projets Majeurs sur N Référencés"`, `"+ X autre(s) secteur(s) complet(s) consultable(s) via le QR code"`, `"+ X autre(s) empreinte(s) SHA-256 publiée(s) en ligne"`.
   - Détecteur `exceedsSingleA4Page` (`data-a4-overflow="true"` si `scrollHeight > 1046px`) affichant une bannière explicite sans jamais couper ni masquer une information financière.
3. **Lisibilité N&B / monochrome & SHA-256 sur une seule ligne :**
   - Contraste impression renforcé (`print:text-black`, `print:border-slate-400` / `print:border-slate-900`) et police `text-[8.25px]` sur les empreintes SHA-256 afin que les 64 caractères hexadécimaux restent sur une seule ligne non brisée.
4. **Cohérence SVG avec la PR #72 :** Ajout de `xmlns="http://www.w3.org/2000/svg"` dans `src/components/common/QrCodeSvg.tsx`.

---

## 2. Résultats exacts des 3 scénarios PDF A4 & multi-viewports

| Scénario | Pages PDF | Dimensions | Texte extrait (`pdfjs-dist`) | Desktop (`1440×900`) | Mobile (`375×812`) | Monochrome Print | Artefacts conservés |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Live App Cocody** (`/institutions/mairies`) | **1** | `210.2 × 297.3 mm` (`595.92 × 842.88 pt`) | `1453` car. (intact) | `overflowX: false` (`794×613px`) | `overflowX: false` (`351×1025px`) | **PASS** (`492px`, `clipped: 0`) | `a4-cocody-live.pdf`, `*-desktop.png`, `*-mobile.png`, `*-monochrome-print.png` |
| **Faible volume (Sans données)** | **1** | `210.2 × 297.3 mm` | `1406` car. (`NOT_FOUND_PUBLICLY`, `Non documenté publiquement`) | `overflowX: false` (`794×574px`) | `overflowX: false` (`351×984px`) | **PASS** (`456px`, `clipped: 0`) | `a4-low-data.pdf`, captures PNG |
| **Volume maximal raisonnable** (8 projets, 7 secteurs, CA + BP + 5 SHA-256 + CAIDP 30j) | **1** | `210.2 × 297.3 mm` | `2598` car. (FCFA + 64-hex SHA-256 sur 1 ligne intacts) | `overflowX: false` (`794×787px`) | `overflowX: false` (`351×1427px`) | **PASS** (`678px`, `clipped: 0`, `a4Overflow: false`) | `a4-max-volume.pdf`, captures PNG |
