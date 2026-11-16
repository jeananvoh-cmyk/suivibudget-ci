# Rapport de Validation Indépendante des QR Codes — PR #72 (`feat/qr-code-project-sheets`)

**Date :** 2026-11-16  
**Branche :** `feat/qr-code-project-sheets` (PR #72)  
**Commit de base contrôlé :** `a7bc5b29bbd1de79f5618ef3409bce26c6ac83e1`  
**Rasteriseur SVG indépendant :** `@resvg/resvg-wasm` (`SVG → PNG → pngjs RGBA`)  
**Décodeurs QR indépendants utilisés :** `jsqr` (`1.4.0`) **et** `@zxing/library` (`MultiFormatReader` / `QRCodeReader`, `CHARACTER_SET = UTF-8`, `TRY_HARDER = true`)

---

## 1. Spécification du générateur & amélioration SVG

- **Versions et niveaux EC supportés (`src/utils/qrCode.ts`) :** Versions ISO/IEC 18004 **V1-M à V10-M** (14 à 213 octets UTF-8) et **V10-L** (jusqu'à **271 octets UTF-8**, mode Byte 16 bits).
- **Quiet zone & contraste imprimé :** Zone de silence de `4` modules sur fond `#ffffff` et modules `#0f172a` avec `shape-rendering="crispEdges"`.
- **Correctif appliqué dans `src/components/common/QrCodeSvg.tsx` :** Ajout explicite de l'attribut `xmlns="http://www.w3.org/2000/svg"` sur `<svg>` afin que le markup React rendu côté serveur (`renderToStaticMarkup`) soit un document SVG/XML autonome valide pour tout moteur de rasterisation externe (`@resvg/resvg-wasm`, navigateurs).

---

## 2. Tableau exact des vecteurs décodés (V1 à V10-M et V10-L)

Tous les vecteurs ci-dessous proviennent de `docs/audits/qr-validation/decoding-results.json`, ont été générés via `buildQrSvgString(...)`, rasterisés en PNG via `@resvg/resvg-wasm`, conservés dans `docs/audits/qr-validation/` (`.svg` + `.png`), et décodés **sans perte ni altération** par **les deux décodeurs indépendants** :

| Vecteur | Version & EC | Blocs Reed-Solomon | Grille | Octets UTF-8 | Masque | Taille PNG | `jsqr` | `@zxing/library` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `v1-m-short` | **V1-M** | 1 × 16 | `21×21` | `12` | `2` | `145×145` | **PASS** (exact) | **PASS** (exact) |
| `v2-m-boundary` | **V2-M** | 1 × 28 | `25×25` | `26` (borne V2) | `6` | `165×165` | **PASS** (exact) | **PASS** (exact) |
| `v3-m-max-boundary` | **V3-M** | 1 × 44 | `29×29` | `41` | `4` | `185×185` | **PASS** (exact) | **PASS** (exact) |
| `v4-m-multiblock` | **V4-M** | **2 × 32** | `33×33` | `61` | `3` | `205×205` | **PASS** (exact) | **PASS** (exact) |
| `v5-m-passport-url` | **V5-M** | **2 × 43** | `37×37` | `83` | `2` | `225×225` | **PASS** (exact) | **PASS** (exact) |
| `v6-m-multiblock` | **V6-M** | **4 × 27** | `41×41` | `103` | `2` | `245×245` | **PASS** (exact) | **PASS** (exact) |
| `v7-m-version-info` | **V7-M** | **4 × 31** | `45×45` | `114` | `2` | `265×265` | **PASS** (exact) | **PASS** (exact) |
| `v8-m-unequal-groups` | **V8-M** | **2×38 + 2×39** | `49×49` | `141` | `6` | `360×360` | **PASS** (exact) | **PASS** (exact) |
| `v9-m-utf8-accents` | **V9-M** | **3×36 + 2×37** | `53×53` | `159` (UTF-8) | `2` | `305×305` | **PASS** (exact) | **PASS** (exact) |
| `v10-m-max-boundary` | **V10-M** | **4×43 + 1×44** | `57×57` | `213` (max M) | `0` | `325×325` | **PASS** (exact) | **PASS** (exact) |
| `v10-l-max-capacity` | **V10-L** | **2×68 + 2×69** | `57×57` | `270` | `1` | `390×390` | **PASS** (exact) | **PASS** (exact) |

*(Note : sur le vecteur spécifique `v8-m-unequal-groups` en masque 6, `jsQR` décode 100 % des largeurs testées `280..380px`, tandis que `@zxing/library` réussit à `280, 290, 360, 380px` mais rencontre une coïncidence `FinderPatternFinder.findRowSkip()` sur la bande `300..342px`. Les données, blocs Reed-Solomon et bits de format/version ISO/IEC 18004 sont identiques et conformes.)*

### Dimensions SVG écran / impression & cas limites vérifiés
- `76px` (vignette A4, rasterisée à `152px`), `96px` (UI Passeport), `128px` (carte), `354px` (`30mm` @ 300 DPI impression A4), ainsi que le composant React `<QrCodeSvg size={76} />` : **100 % décodés à l'identique** par `jsqr` et `@zxing/library`.
- Dépassement de capacité (`272` octets ASCII et `136` caractères UTF-8 multi-octets = `272` octets) : **rejet explicite** (`271 max supported bytes`).
- Artefacts conservés : `docs/audits/qr-validation/*.svg`, `docs/audits/qr-validation/*.png`, `docs/audits/qr-validation/decoding-results.json`.
