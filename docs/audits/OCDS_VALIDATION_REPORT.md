# Rapport de Validation Indépendante OCDS v1.1 — PR #69 (`feat/ocds-open-data`)

**Date :** 2026-11-16  
**Branche :** `feat/ocds-open-data` (PR #69)  
**Commit de base contrôlé :** `d2928f0eb27981931f0cf06e3a34d9ecce67b25f`  
**Validateur indépendant :** `ajv` (`ajv-draft-04` + `ajv-formats`) compilant le schéma officiel OCDS 1.1 (`standard.open-contracting.org/1.1/en/release-package-schema.json` et `release-schema.json`) fusionné par JSON Merge Patch (RFC 7396) avec notre extension versionnée `suivibudget_provenance` v1.0.0, avec **`additionalProperties: false` imposé récursivement sur chaque objet**.

---

## 1. Extension OCDS v1.1 versionnée (`suivibudget_provenance` v1.0.0)

Emplacement dans le dépôt : `public/ocds/extensions/suivibudget_provenance/v1.0.0/` (copié à l'identique dans `dist/ocds/extensions/suivibudget_provenance/v1.0.0/` lors de `npm run build`).

| Fichier | Rôle | Taille (octets) | SHA-256 |
| :--- | :--- | :---: | :--- |
| `extension.json` | Métadonnées officielles de l'extension (`compatibility: ["1.1"]`, `version: "1.0.0"`) | `1415` | `4c7cb8c79ad7a27b20de13e79ef64dfcddcfb3599d7ab0b52b3cb553e0acdbf2` |
| `release-schema.json` | JSON Schema Draft-04 étendant `Release`, `Budget`, `Document`, `Transaction` | `5845` | `bc67575a9998dd544b40c427fbe483523e7e600c183c6e121904e8aa55b2a7a9` |
| `README.md` | Documentation publique de l'extension | `1816` | `2e4897c8f0b3449f6ca8866f3a3bf9a03c5a0c7c5c0706e560dd834a224ce62e` |

- **Déclaration officielle dans chaque paquet (`OcdsReleasePackage.extensions`) :**  
  `https://suivibudget.vercel.app/ocds/extensions/suivibudget_provenance/v1.0.0/extension.json`
- **Accessibilité de l'URL :** Avant fusion et déploiement de la PR #69 en Production, `https://suivibudget.vercel.app/ocds/...` retombe sur le routeur SPA HTML (`text/html`, HTTP 200). Dès fusion/déploiement (ou sur Preview Vercel lorsque le quota est disponible), Vite/Vercel sert directement les fichiers statiques JSON de `public/ocds/extensions/suivibudget_provenance/v1.0.0/` (`dist/` vérifié localement).

---

## 2. Inventaire complet des champs personnalisés ou étendus

| Emplacement | Champ | Type / Enum | Usage & garde-fou métier |
| :--- | :--- | :--- | :--- |
| `OcdsReleasePackage` | `extensions` | `string[]` (URI) | Déclare officiellement l'extension `suivibudget_provenance` v1.0.0 |
| `Release` | `x_suivibudget` | `object` (9 champs requis) | Sépare besoin/budget/DGMP/exécution CA (`NOT_FOUND_PUBLICLY` si absent)/réalisation physique (`UNKNOWN` par défaut) |
| `Planning.budget` | `fiscalYear` | `integer \| null` (`2000..2100`) | Hors cœur OCDS 1.1 ; explicitement documenté dans l'extension |
| `Planning.budget` | `x_amountPrecision` | `EXACT \| APPROXIMATE \| LOWER_BOUND \| UPPER_BOUND \| DECLARED_ADMIN \| UNKNOWN` | Jamais inféré à `EXACT` sans métadonnée de source |
| `Planning.budget` | `x_dataProvenance` | `OFFICIAL_SOURCE \| DECLARED_ADMIN \| UNVERIFIED_INPUT \| UNKNOWN` | Distingue les données déclarées de la source officielle vérifiée |
| `Document` | `pageStart` | `integer \| null` (`>= 1`) | Numéro de page PDF exact ; documenté dans l'extension |
| `Document` | `x_provenance` | `OFFICIAL_SOURCE \| DECLARED_ADMIN \| UNVERIFIED_INPUT \| UNKNOWN` | Ne qualifie jamais un avis DGMP `TO_VERIFY` en `OFFICIAL_SOURCE` |
| `Transaction` | `x_sourceReference` | `string \| null` | Libellé textuel du CA quand aucune URI HTTP(S) directe n'existe pour `Transaction.source` |

---

## 3. Anomalies OCDS 1.1 détectées par le validateur indépendant et corrigées dans `ocdsMapper.ts`

La première exécution contre les schémas officiels OCDS 1.1 a permis d'identifier et corriger :
1. **Absence du champ `extensions` dans `OcdsReleasePackage`** → ajouté (`[SUIVIBUDGET_OCDS_EXTENSION_URL]`).
2. **Champs hors cœur OCDS 1.1 non déclarés** (`Budget.fiscalYear`, `Document.pageStart`, `Budget.x_amountPrecision`, `Budget.x_dataProvenance`, `Document.x_provenance`, `Release.x_suivibudget`) → intégralement typés et documentés dans `release-schema.json`.
3. **Format `date-time` RFC 3339 obligatoire sur `Award.date` et `Contract.dateSigned`** : une date SQL `2024-05-15` échouait la validation `date-time` → ajout de `normalizeOcdsDateTime()` (`2024-05-15T00:00:00Z`, rejet des dates invalides).
4. **Format `uri` obligatoire sur `Transaction.source`, `Document.url`, `Budget.uri`** : un libellé texte (`Compte Administratif` ou `Avis papier`) échouait la validation `uri` → ajout de `normalizeValidHttpUri()` et déplacement du libellé textuel vers `Transaction.x_sourceReference`.
5. **Qualification excessive sur `awardDocs[].x_provenance`** : précédemment figé à `'OFFICIAL_SOURCE'` même pour une ligne non vérifiée → désormais dérivé de `matchedProc.verification_status` via `resolveProcurementDocProvenance()`.

---

## 4. Résultats des contrôles

- `npx vitest run src/utils/__tests__/ocdsValidation.test.ts src/utils/__tests__/ocdsMapper.test.tsx` : **2 fichiers PASS, 9/9 tests PASS** (inclut un échantillon réel de `RAW_BUDGET_PROJECTS` État + Cocody + Tiassalé + Stratégiques + `ADMINISTRATIVE_ACCOUNTS_DATA`, et 5 paquets invalides rejetés).
- `npm test` : **68 fichiers PASS, 926/926 tests PASS**.
- `npm run build` : **PASS** (`tsc && vite build`, `1769` modules, `extension.json` & `release-schema.json` présents dans `dist/ocds/extensions/suivibudget_provenance/v1.0.0/`).
- `npm run build:review` : **PASS**.
