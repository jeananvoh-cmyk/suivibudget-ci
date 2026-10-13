# Diagnostic Technique de l'Existant d'Importation Budgétaire et Documentaire
## SuiviBudget Côte d'Ivoire — Pilote Réel Cocody 2024

**Date de réalisation :** 13 octobre 2026  
**Auteur :** Antigravity (Auditeur Logiciel & Données Financières Publiques)  
**Branche Git :** `feat/admin-financial-document-ingestion-pilot`  
**Environnement :** Test en mémoire isolé (PGlite WASM) & React/TypeScript • `REMOTE_SUPABASE_WRITES = 0`

---

## 1. Objectif du Diagnostic

Évaluer l'outillage existant de la plateforme SuiviBudget Côte d'Ivoire face aux exigences d'un circuit complet d'ingestion administrative décentralisée :
$$\text{DÉPÔT} \longrightarrow \text{IDENTIFICATION} \longrightarrow \text{EXTRACTION} \longrightarrow \text{RAPPROCHEMENT} \longrightarrow \text{CONTRÔLE HUMAIN} \longrightarrow \text{SIMULATION} \longrightarrow \text{IMPORT} \longrightarrow \text{VÉRIFICATION} \longrightarrow \text{PUBLICATION}$$

Ce diagnostic prend comme cas concret d'évaluation le **Compte Administratif (CA) 2024 de la Commune de Cocody** :
- Fascicule scanné de 44 pages horizontales réparties en 2 tomes PDF (`Cocody_CA_2024_pages_01-22.pdf` et `Cocody_CA_2024_pages_23-44.pdf`).
- Absence de couche texte numérique (scan image 300 DPI d'imprimante HP).
- Présence de visas manuscrits et cachets officiels (Maire de Cocody, Préfecture d'Abidjan, Contrôle financier).

---

## 2. Matrice d'Évaluation des Composants et Services

| Fonctionnalité | Composant / Service Source | Statut | Observations & Limites Détectées |
|---|---|:---:|---|
| **Console d'Import Contrôlé (RPC/Lot)** | `src/components/admin/DataImportConsole.tsx` | **FONCTIONNEL** | Console double mode (Assistant Guidé et JSON/JSONL brut). Exécute la simulation préalable sans écriture (`import_data_batch` avec `p_commit=false`), exige un plan valide, impose la vérification puis la publication séparée avec case à cocher de confirmation. |
| **Service d'Appels RPC Import** | `src/services/dataImportService.ts` | **FONCTIONNEL** | Interface typée sur les fonctions PostgreSQL `import_data_batch`, `listImports`, `reviewImport`. Respecte le profil protégé STAFF (`ADMIN`, `DATA_MANAGER`). |
| **Contrôle Préalable & Dry-Run Métier** | `src/utils/budgetDocumentDryRun.ts` | **FONCTIONNEL (AMÉLIORÉ)** | Calcule le fingerprint documentaire unique pour bloquer les doublons exacts. Initialise les montants au statut `PENDING` (aucune auto-validation). Enrichi pour intégrer les recettes et le solde de clôture du CA et contrôler l'arithmétique des comptes administratifs. |
| **Gestionnaire 232 Comptes Administratifs** | `src/components/admin/AdministrativeAccountsAdminManager.tsx` | **FONCTIONNEL** | Matrice de couverture 232 collectivités (201 communes + 31 régions). Filtres par exercice (2024–2027), statut (`MISSING`, `TO_VERIFY`, `VERIFIED`, `PUBLISHED`, `ARCHIVED`), région et type. |
| **Dépôt Individuel d'un CA** | `src/components/admin/SingleCAUploadModal.tsx` | **FONCTIONNEL (AMÉLIORÉ)** | Permet de téléverser le PDF officiel, calcule le SHA-256 en direct, alerte en cas de doublon. **Amélioration apportée :** support natif des documents multi-parties (fascicules scindés) et qualification des scans sans couche texte. |
| **Import en Masse de Fichiers CA** | `src/components/admin/BatchCAImportModal.tsx` | **PARTIEL** | Téléversement multi-fichiers avec reconnaissance automatique des noms de fichiers (`caFileMatcher.ts`). Limité aux fichiers individuels autonomes ; ne gère pas nativement la fusion de tomes scindés sans étiquetage explicite. |
| **Examen et Circuit de Validation d'un CA** | `src/components/admin/ExamineCADocumentModal.tsx` | **FONCTIONNEL (AMÉLIORÉ)** | Découple strictement la validation (`VERIFIED`) de la diffusion publique (`PUBLISHED`). Grille d'audit documentaire (format, délibération, tutelle, soldes). **Amélioration apportée :** affichage détaillé des tomes et de l'alerte scan raster. |
| **Importateur Budgets Primitifs** | `src/components/admin/PrimitiveBudgetImporterModal.tsx` | **PARTIEL** | Spécifique aux budgets primitifs (BP) votés en conseil. Non adapté aux comptes administratifs (CA) qui exigent la balance des recettes et des dépenses ordonnancées. |
| **Gestionnaire Central des Documents** | `src/components/admin/DocumentManager.tsx` | **FONCTIONNEL** | Gestion transversale de la GED publique (lois de finances, rapports d'audit, délibérations, arrêtés). Respecte l'immutabilité et les buckets privés. |
| **Stockage Fichiers et Chemins Canoniques** | `src/services/documentStorageService.ts` | **FONCTIONNEL** | Génère les chemins canoniques (`comptes-administratifs/communes/inst-com-cocody/2024/...`). Valide l'en-tête `%PDF-` et applique `upsert: false`. Requiert une session Supabase active pour le stockage distant. |
| **Couche Données Locale & Sync** | `src/services/dataStore.ts` | **FONCTIONNEL (AMÉLIORÉ)** | Gère la réactivité locale, l'historique des versions (`replaces_document_id`, `version`), la transition des statuts de cycle. Enrichi pour propager les métadonnées de fascicules multi-parties et d'état OCR. |
| **Documentation d'Importation** | `docs/DATA_IMPORT.md` | **FONCTIONNEL** | Spécifie le contrat de ligne (kind, institution_id, fiscal_year, source, data, precision) et les commandes CLI. Doit être complétée par le guide pas à pas administrateur. |

---

## 3. Analyse des Lacunes Initiales et Correctifs Apportés

### 3.1. Gestion des Documents Multi-Parties (Scans Scindés)
* **Constat initial :** L'outil d'enregistrement n'acceptait qu'un fichier unique et un hash SHA-256 unique. Or, en Côte d'Ivoire, les scans administratifs de volumétrie supérieure à 20-30 pages sont fréquemment scindés par les copieurs d'administration en plusieurs tomes (ex: `pages_01-22.pdf` et `pages_23-44.pdf` pour Cocody).
* **Correctif apporté :** Extension de `PublicDocument` et de `SingleCAUploadModal` avec `is_multipart`, `parts_count`, `document_parts` (numéro de volet, plage de pages, nom du fichier, SHA-256 de chaque volet), et préservation de l'empreinte combinée globale (`941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`).

### 3.2. Traitement des Scans Sans Couche Texte (Raster Image)
* **Constat initial :** Les fichiers scannés sans OCR embarqué ne peuvent faire l'objet d'une extraction plein texte automatisée fiable sans risque d'hallucination ou d'omission.
* **Correctif apporté :** Intégration d'un statut explicite `ocr_status = 'MANUAL_TRANSCRIPTION'`, associé au flag `is_scanned = true` et `has_text_layer = false`. L'administrateur conserve le contrôle des totaux extraits manuellement, validés et confrontés aux pages sources attestées (pages 40 et 43).

### 3.3. Contrôles Arithmétiques pour Comptes Administratifs
* **Constat initial :** Le moteur de dry-run ne vérifiait que l'arithmétique des Budgets Primitifs (`total_amount = operating_amount + investment_amount`). Pour les Comptes Administratifs, aucune règle de balance des recettes et dépenses n'était activée.
* **Correctif apporté :** Implémentation dans `runDocumentDryRun` des 4 contrôles arithmétiques du CA :
  1. $\text{Total Prévu} = \text{Fonctionnement Prévu} + \text{Investissement Prévu}$
  2. $\text{Total Dépenses Ordonnancées} = \text{Fonctionnement Ordonnancé} + \text{Investissement Ordonnancé}$
  3. $\text{Total Recettes Recouvrées} = \text{Fonctionnement Recouvré} + \text{Investissement Recouvré}$
  4. $\text{Excédent de Clôture} = \text{Total Recettes Recouvrées} - \text{Total Dépenses Ordonnancées}$

### 3.4. Métadonnées d'Enveloppe pour les CA
* **Constat initial :** Lors de la construction de l'enveloppe standardisée (`buildStandardImportEnvelope`), le champ obligatoire `verification_status` n'était injecté que pour les budgets primitifs (`kind = 'BP'`), risquant de provoquer un blocage serveur lors de la transition vers `PUBLISHED`.
* **Correctif apporté :** Injection systématique de `verification_status`, `approval_date`, `prefecture_visa_date` et `notes` dans la charge utile des Comptes Administratifs (`kind = 'CA'`).
