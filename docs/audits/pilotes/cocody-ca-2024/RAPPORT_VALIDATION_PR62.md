# SuiviBudget Côte d'Ivoire — Rapport de Validation et Clôture PR #62
## Durcissement Sécurité RBAC, Intégrité Multi-Volets & Fiabilisation du Workflow Administratif

- **Date :** 14 octobre 2026
- **Branche :** `feat/admin-financial-document-ingestion-pilot`
- **PR GitHub :** https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/62
- **Revue indépendante traitée :** https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/62#issuecomment-6157235505
- **Garde-fou absolu :** `REMOTE_SUPABASE_WRITES = 0` (100% de simulations et tests isolés sous PGlite WASM et Vitest, zéro mutation sur la base Supabase distante de production `cdesuvcozcetdtvibgqs`).

---

### 1. Synthèse Exécutive des Corrections Appliquées

| Priorité | Problème identifié | Correction appliquée | Preuve & Test |
| :--- | :--- | :--- | :--- |
| **P1. RBAC Fail-Closed** | `if (auth.isAuthenticated)` laissait passer les requêtes sans session valide. | Blocage strict préalable (`!auth \|\| !auth.isAuthenticated` et `expiresAt <= Date.now()`). Rejet des rôles `CITIZEN`. `MODERATOR` limité à la vérification. Publication réservée à `ADMIN` et `DATA_MANAGER`. | 5 tests unitaires dédiés dans `caMultipartAndValidation.test.ts`. |
| **P2. Élimination des Blobs vides** | Risque d'écrasement ou d'incohérence via dummy Blob (`new Blob([], ...)`). | Suppression totale de dummy Blob. Validation préalable bloquant tout fichier de taille 0 octet. Politique de remplacement partiel explicite : préservation certifiée des métadonnées et chemins des volets inchangés. | 3 tests dédiés (rejet fichier vide, rejet sans référence, upload mixte partiel). |
| **P3. Compensation Transactionnelle** | Fichiers orphelins dans Supabase Storage si l'insertion ou mise à jour PostgreSQL échoue. | Enregistrement de `newlyUploadedPaths`. En cas d'échec PostgreSQL, appel automatique à `deleteStorageFiles` sur les seuls nouveaux fichiers. Remontée d'alerte critique si la compensation échoue. Les fichiers historiques ne sont jamais touchés. | 3 tests de compensation Storage et résilience aux pannes réseau. |
| **P4. Fix Validation CA Cocody 2024** | Erreur de syntaxe UUID PostgreSQL lors de l'assignation de `verified_by = 'Administrateur'` (colonne de type `uuid references profiles(id)`). | Validation stricte du format UUID (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`). Transmission de l'UUID de session authentifiée (`userId`), ou `null`/`undefined` pour laisser le trigger PostgreSQL assigner `auth.uid()`. | Test de validation et publication complète avec UUID conforme. |
| **P5. Rétrocompatibilité & Schéma SQL** | Vérification de la compatibilité des documents à fascicule unique et multi-fascicules, contraintes de statut OCR. | Migration `20261013200000_multipart_ca_documents.sql` validée sous PGlite. Gestion des codes d'erreur PostgreSQL (`42501` RLS, `42703` migration manquante). | 3 tests PGlite exécutant la migration SQL réelle. |

---

### 2. Détail Technique des Composants Modifiés

#### 2.1. `src/services/dataStore.ts`
- **Fail-Closed RBAC** : Refonte de `updateDocumentLifecycleStatus(id, status)` :
  - Rejette immédiatement avec message clair si l'utilisateur n'est pas connecté ou si sa session a expiré.
  - Bloque toute publication (`PUBLISHED`) si le document n'a pas été préalablement vérifié (`isVerified`).
  - Restreint les modérateurs (`MODERATOR`) à l'action de vérification (`VERIFIED`), interdisant la publication ou l'archivage.
- **Support UUID strict** :
  - Détection regex du format UUID sur `auth.userId` et `document.verified_by`.
  - Élimination des chaînes textuelles (telles que `'Super Administrateur'`) évitant toute erreur `invalid input syntax for type uuid` dans PostgreSQL.
- **Résilience SQL & Diagnostic clair** :
  - Capture des erreurs PostgreSQL `42501` (refus RLS) et `42703` (colonne manquante nécessitant la migration additive) avec instructions d'intervention pour l'administrateur système.

#### 2.2. `src/services/documentStorageService.ts`
- **Sécurisation Multi-Parties** :
  - Extension de `MultiPartInputItem` pour supporter l'édition partielle sans fichier (champs optionnels `file`, `storagePath`, `checksumSha256`, `fileSizeBytes`, `fileSizeFormatted`).
  - Validation préalable de non-vacuité (`file.size === 0` rejeté).
  - Téléversement ciblé : seuls les volets avec un nouveau fichier `file` physique sont transférés dans le stockage Supabase.
  - Suivi des fichiers créés via `newlyUploadedPaths` pour permettre une compensation chirurgicale en cas d'échec aval.
- **Méthode de Nettoyage Compensatoire** :
  - `deleteStorageFiles(paths)` retourne un statut typé `{ success: boolean; error?: string; deletedCount: number }`.

#### 2.3. `src/components/admin/SingleCAUploadModal.tsx`
- **Protection Anti-Double Soumission** : Verrouillage immédiat `if (isSubmitting) return;`.
- **Élimination Définitive des Blobs Vides** : Suppression complète de toute instanciation `new Blob([], ...)`.
- **Compensation Automatique** : Si l'appel `dataStore.saveCADocument` ou la mise à jour PostgreSQL échoue après le téléversement des fichiers dans le stockage, les chemins nouvellement téléversés (`newlyUploadedPaths`) sont automatiquement supprimés du bucket `public_documents` pour éviter les fichiers orphelins, sans jamais affecter les fichiers historiques existants.

#### 2.4. `src/utils/__tests__/caMultipartAndValidation.test.ts`
- 27 tests automatisés complets couvrant :
  - Validation des plages de pages (continuité, détection des chevauchements et inversions).
  - Empreinte logique déterministe du manifeste SHA-256 (conforme pour Cocody 2024).
  - Chemins de stockage canoniques standardisés.
  - Upload multi-volets séquentiel et rollback atomique en cas de coupure réseau.
  - Rejet des fichiers vides de 0 octet et des volets mal formés.
  - Remplacement partiel sécurisé avec recalcul déterministe du manifeste.
  - Nettoyage compensatoire Storage et reporting d'anomalies.
  - Cycle découplé Examine $\rightarrow$ Verify $\rightarrow$ Publish avec UUID valide.
  - Contrôle d'accès RBAC Fail-Closed (non-authentifié, session expirée, citoyen, modérateur, responsable données, administrateur).
  - Propagation des erreurs RLS PostgreSQL `42501`.
  - Exécution SQL réelle de la migration `20261013200000_multipart_ca_documents.sql` sous PGlite (WASM).

---

### 3. Métriques de Qualité et Validation Finale

- **Vitest - caMultipartAndValidation.test.ts :** 27/27 tests réussis (100% PASS).
- **Vitest - caManagement.test.ts :** 26/26 tests réussis (100% PASS).
- **Vitest - Suite Complète du Référentiel :** **62 fichiers de test, 820 tests réussis, 0 échec (100% PASS)**.
- **Compilation TypeScript & Vite Build (`npm run build`) :** Succès total (code de sortie 0, bundle production généré).
- **REMOTE_SUPABASE_WRITES :** 0 (respect absolu de la charte).
