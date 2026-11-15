# 03 — Statut Réel des Comptes Administratifs Cocody 2024 et Tiassalé 2024

**Date de contrôle :** 15 novembre 2026  
**Branche de remédiation :** `antigravity/p0-financial-compliance-remediation`  
**Commits associés :** `5795ac0d041b387b1c23ad0be446962c4170cd4a`, `56cf3fbab5caf9fb6adadabb5e374a5fbd6427b2`  
**Projet Supabase contrôlé en lecture seule (`GET` uniquement) :** `cdesuvcozcetdtvibgqs` (`remoteSupabaseWrites: 0`)

---

## 1. Tableau obligatoire de statut réel en production (`cdesuvcozcetdtvibgqs`)

| Entité | Importé | Document primaire | Vérifié | Publié | Visible au public |
|---|---|---|---|---|---|
| **Cocody 2024** (`ca-cocody-2024` / `inst-com-cocody`) | **OUI** (`1` ligne `administrative_accounts` + `57` lignes `ca_investment_operations` + `28` lignes `ca_procurement_matches`) | **OUI** (`doc-dff4865a-c6a8-418e-8895-626258e409d0`, `14 072 943` octets, `44` pages physiques / `45` imprimées, `source_page = 40`, SHA-256 `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`) | **OUI** (`verification_status = "VERIFIED"`, `reconciliation_status = "RECONCILED"`) | **OUI** (`status = "PUBLISHED"`, `published_at = "2026-11-13T13:47:29.157086+00:00"`) | **OUI** (accessible en lecture anonyme sur `administrative_accounts`, `public_documents`, `ca_investment_operations` et `ca_procurement_matches`) |
| **Tiassalé 2024** (`ca-tiassale-2024` / `inst-com-tiassale`) | **OUI** (`1` ligne `administrative_accounts` + `3` lignes `ca_investment_operations` + `3` lignes `ca_procurement_matches`) | **NON** (`source_document_id = null`, `source_page = null`, aucun PDF primaire rattaché dans `public_documents`) | **NON** (`reconciliation_status = "SOURCE_ANOMALY"` ; en base distante le champ brut porte à tort `verification_status = "OFFICIAL_DOCUMENT"`, déclassé côté code et manifeste en `TO_VERIFY`) | **OUI en base distante** (`status = "PUBLISHED"` dans `cdesuvcozcetdtvibgqs`), **mais affiché avec bannière d'alerte `Anomalie arithmétique de la source` et badge `En attente de pièce officielle (PDF)`** | **OUI avec avertissement citoyen explicite** (jamais présenté comme document officiel vérifié ni comme résultat de clôture certifié) |

---

## 2. Détail du Compte Administratif Cocody 2024 (`ca-cocody-2024`)

### 2.1 Concordance des montants entre base de production, pièce primaire (PDF p. 40 / imprimée 41/45) et code

| Indicateur financier (`ca-cocody-2024`) | Montant en base `cdesuvcozcetdtvibgqs` (FCFA) | Pièce primaire (`doc-dff4865a...`, PDF p. 40) | Statut de concordance |
|---|---:|---:|---|
| Fonctionnement — Prévisions (`operating_planned`) | `18 441 235 000` | `18 441 235 000` | Exact |
| Fonctionnement — Recettes recouvrées (`operating_revenue_collected`) | `17 646 256 543` | `17 646 256 543` | Exact |
| Fonctionnement — Dépenses ordonnancées (`operating_realized`) | `15 409 122 753` | `15 409 122 753` | Exact |
| Investissement — Prévisions (`investment_planned`) | `3 900 630 000` | `3 900 630 000` | Exact (et égal à la somme des `57` opérations pp. 41–43) |
| Investissement — Recettes recouvrées (`investment_revenue_collected`) | `1 366 100 690` | `1 366 100 690` | Exact |
| Investissement — Dépenses ordonnancées (`investment_realized`) | `1 366 100 690` | `1 366 100 690` | Exact (et égal à la somme exécutée des `57` opérations pp. 41–43, dont `29` opérations `> 0`) |
| Total — Prévisions (`total_planned`) | `22 341 865 000` | `22 341 865 000` | Exact (`18 441 235 000 + 3 900 630 000`) |
| Total — Recettes recouvrées (`total_revenue_collected`) | `19 012 357 233` | `19 012 357 233` | Exact (`17 646 256 543 + 1 366 100 690`) |
| Total — Dépenses exécutées (`total_realized`) | `16 775 223 443` | `16 775 223 443` | Exact (`15 409 122 753 + 1 366 100 690`) |
| Excédent de clôture (`surplus_or_deficit`) | `2 237 133 790` | `2 237 133 790` | Exact (`19 012 357 233 − 16 775 223 443`) |
| Différence arithmétique stockée (`arithmetic_difference`) | `0` (en base distante) | `+2 237 133 790` (`Recettes − Dépenses`) | **Corrigé dynamiquement dans `AdministrativeAccountView.tsx`** |

### 2.2 Correction du bug d'affichage `+0 FCFA` (`src/components/AdministrativeAccountView.tsx`)

- **Cause du bloqueur P0 :** En base de production, la colonne `arithmetic_difference` de `ca-cocody-2024` a été enregistrée à `0` (confusion lors de l'import entre « écart d'erreur de saisie » et « différence arithmétique Recettes − Dépenses »). L'ancienne version de `AdministrativeAccountView.tsx` lisait `currentCA.arithmetic_difference` en priorité, affichant `+0 FCFA` sous le libellé *« Différence arithmétique (Recettes − Dépenses) »* juste à côté de *« Excédent : +2 237 133 790 FCFA »*.
- **Correction appliquée (`5795ac0`) :** `AdministrativeAccountView.tsx` calcule désormais en priorité `calculatedArithmeticDiff = totalRevenueResolved - currentCA.total_realized` lorsque les recettes totales et dépenses totales sont connues (`19 012 357 233 − 16 775 223 443 = +2 237 133 790 FCFA`), et n'utilise `currentCA.arithmetic_difference` qu'en repli si les totaux ne permettent pas le calcul direct.

---

## 3. Détail du Compte Administratif Tiassalé 2024 (`ca-tiassale-2024`)

### 3.1 Anomalies constatées en base de production et dans le manifeste d'import

Dans `cdesuvcozcetdtvibgqs` (`administrative_accounts`, ligne `ca-tiassale-2024`) :
- `total_planned = 1 007 841 000 FCFA` (`operating_planned = 900 341 000` + `investment_planned = 107 500 000`) ;
- `total_revenue_collected = 1 216 336 558 FCFA` (`operating_revenue_collected = 1 113 423 505` + `investment_revenue_collected = 102 913 053`) ;
- `total_realized = 1 059 255 758 FCFA` (`operating_realized = 995 755 758` + `investment_realized = 63 500 000`) ;
- La différence arithmétique `Recettes − Dépenses` vaut **`+157 080 800 FCFA`** (`1 216 336 558 − 1 059 255 758`), tandis que la source secondaire déclarait un excédent global nul (`surplus_or_deficit = 0`) ;
- Aucun document PDF primaire n'est rattaché (`source_document_id = null`, `source_page = null`), mais la ligne portait `verification_status = "OFFICIAL_DOCUMENT"`.

### 3.2 Remédiation appliquée dans le code et le manifeste (`5795ac0`, `56cf3fb`)

1. **Manifeste `docs/imports/tiassale-ca-2024.json` :**
   - `verification_status` corrigé de `"OFFICIAL_DOCUMENT"` à `"TO_VERIFY"` (avec `reconciliation_status: "SOURCE_ANOMALY"` conservé).
2. **Garde-fou d'affichage `AdministrativeAccountView.tsx` :**
   - Un compte administratif ne peut afficher le badge vert `Compte Administratif Officiel` (`isPrimaryDocumentVerified`) **que si** un document primaire réel est rattaché (`source_document_id` non vide) **et** qu'il ne présente pas d'anomalie de source (`reconciliation_status !== 'SOURCE_ANOMALY'`).
   - En l'absence de `source_document_id` ou en présence de `SOURCE_ANOMALY` (cas de Tiassalé 2024, même si la base distante renvoie `verification_status = "OFFICIAL_DOCUMENT"`), l'interface affiche :
     - En cas de `SOURCE_ANOMALY` : badge ambre **`Anomalie arithmétique de la source`** ;
     - En l'absence de PDF primaire : badge ambre **`En attente de pièce officielle (PDF)`** ;
     - Sous le résultat de clôture : **`Résultat de clôture à confirmer`** (jamais `Excédent : +0 FCFA`) ;
     - Dans l'encadré d'alerte : calcul dynamique paramétrique de l'écart (`formatFCFA(Math.abs(arithmeticDiffResolved))`, soit `157 080 800 FCFA` pour Tiassalé 2024) valable pour l'ensemble des 232 collectivités.
