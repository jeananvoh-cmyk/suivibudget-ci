# Audit Contrats Backend, Migrations et Sécurité — PR #63 (`CHECKPOINT_01`)

## Reprise Codex du 16 octobre — état de validation

Ce fichier préexistait non committé. Les inventaires distants ci-dessous sont des observations héritées, pas une nouvelle recette production. La reprise a détecté puis supprimé le backfill qui transformait un SHA déclaré en SHA calculé sans lecture des octets. La migration laisse les documents historiques `DECLARED` ; `admin-media-url` peut relire leurs originaux et attester leur identité immuable avec la RPC réservée au serveur. Aucun acteur humain n'est attribué automatiquement par une migration.

Compteur : migration additive `20261016090000_document_delivery_counter.sql`, RPC `record_document_delivery` réservée à `service_role`, incrément atomique de `public_documents.downloads_count`. Le chemin `public-document-url`, action `download`, ne compte qu'après lecture et comparaison SHA-256 de l'original et avant remise de la réponse binaire. Il ne certifie pas la réception complète par le client. Consultation signée, lien externe, refus, octets absents/altérés et annulation déjà détectée : aucun incrément. Rejeu du même UUID dédupliqué pendant 24 h ; plafond de 20 délivrances/minute par empreinte serveur de l'adresse relayée par la passerelle. Cette limite suppose que la passerelle maîtrise `x-forwarded-for` ; ce n'est pas une mesure d'utilisateurs uniques. Aucun IP brut n'est conservé.

La colonne ne peut pas être modifiée directement par les visiteurs ; les permissions par colonne préservent les mutations administratives existantes. Les trois triggers admin ne dérogent que pour une modification du compteur seul de +1 sous le rôle serveur. Les reçus privés tracent l'événement séparément de la validation humaine des données.

Validation locale : 50 tests SQL/RLS et Edge ciblés réussis, TypeScript réussi. PostgreSQL PGlite réel ; transport Supabase et Storage simulés. Les requêtes concurrentes du test sont soumises en parallèle à une instance PGlite, pas à plusieurs sessions PostgreSQL distantes. Docker absent du PATH ; aucune recette GoTrue/Storage/Edge déployée n'est revendiquée. Suite globale et build à consigner dans le checkpoint du commit.

Ordre futur, uniquement après autorisation : convergence du schéma admin, multipart, compteur ; Edge ; frontend. Le frontend affiche « Comptage indisponible » si la RPC de version de métrique manque. Aucun de ces déploiements n'a été exécuté.

- **Dépôt** : `jeananvoh-cmyk/suivibudget-ci`
- **Branche** : `codex/admin-final-integration` (ciblant `master`)
- **Projet Supabase autorisé** : `cdesuvcozcetdtvibgqs` (`eu-west-1`) — **Contrôlé strictement en lecture seule** (aucune écriture, aucune migration distante exécutée)
- **Référence audit GitHub** : [`pull/63#issuecomment-6205969274`](https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/63#issuecomment-6205969274)

---

## 1. Comparaison des migrations locales (GitHub) et distantes (`cdesuvcozcetdtvibgqs`)

| Fichier local (`supabase/migrations/`) | Statut sur `cdesuvcozcetdtvibgqs` | Explication et écarts identifiés |
|---|---|---|
| `20260929000000_document_architecture_and_data_model.sql` | **APPLIQUÉE** | Tables `public_documents`, `local_budgets`, `budget_lines`, `citizen_proofs`, `caidp_requests`, `profiles`, fonctions RLS initiales. |
| `20260929010000_harden_rls_and_storage.sql` | **APPLIQUÉE** | Durcissement RLS et buckets privés `public_documents`, `citizen_photos`. |
| `20260929020000_fix_advisor_warnings.sql` | **APPLIQUÉE** | Corrections `search_path` et index. |
| `20260929030000_p0_security_hardening.sql` | **APPLIQUÉE** | Vue `public_citizen_proofs`, séparation `VERIFIED` / `PUBLISHED`. |
| `20260929040000_p0_close_remaining_Write_holes.sql` | **APPLIQUÉE** | Fermeture des écritures directes non qualifiées. |
| `20261001091748_create_import_data_batch_rpc.sql` | **APPLIQUÉE** | RPC `public.import_data_batch` (présente en production). |
| `20261001144423_harden_financial_publication_pipeline.sql` | **APPLIQUÉE** | Tables `data_import_rows`, `data_import_events`, RPC `public.review_data_import` (présentes en production). |
| `20261013000000_administrative_accounts_and_citizen_Needs.sql` | **APPLIQUÉE** | Tables `administrative_accounts`, `ca_investment_operations`, `ca_procurement_matches`, `citizen_territorial_needs`. |
| `20261013165625_admin_dashboard_persistence_hardening.sql` | **NON APPLIQUÉE DISTANTE** | Ajoutée sur `master` par le commit `f9ebadbe` (fusionné après le déploiement de la PR #62). Contient `admin_tasks`, `admin_audit_events`, `admin_operation_receipts`, `private.admin_document_file_checks`, et les RPC `admin_persistence_version`, `admin_mutate`, `admin_mutate_batch`, `admin_confirm_document_integrity`, `admin_baseline_visibility`, `admin_staff_directory`. |
| `20261013200000_multipart_ca_documents.sql` | **APPLIQUÉE SOUS VERSION `20261014155231` (v1 PR #62)** | La version initiale issue de la PR #62 (`db96ed7`) a été appliquée sur `cdesuvcozcetdtvibgqs` sous le timestamp `20261014155231`. Le commit `f9ebadbe` sur `master` a ensuite assoupli `NOT NULL`/`DEFAULT` sur `is_multipart`, `parts_count`, `is_scanned`, `has_text_layer`, `ocr_status` et ajouté `'FAILED'` à `chk_pubdocs_ocr_status` + `manifest_sha256`. |

### Convergence idempotente garantie dans `20261013165625_admin_dashboard_persistence_hardening.sql`

Pour éviter tout blocage lors de l'application future de `20261013165625_admin_dashboard_persistence_hardening.sql` sur `cdesuvcozcetdtvibgqs` (où `20261014155231` est déjà appliquée et où le document `doc-dff4865a-c6a8-418e-8895-626258e409d0` de Cocody est déjà `PUBLISHED`/`VERIFIED` avec `is_multipart = false` et `parts_count = null`) :

1. **Convergence DDL multipart/OCR intégrée** : `20261013165625_admin_dashboard_persistence_hardening.sql` supprime de façon idempotente les contraintes `NOT NULL` et `DEFAULT` héritées de `20261014155231` sur `is_multipart`, `parts_count`, `is_scanned`, `has_text_layer`, `ocr_status` et met à jour `chk_pubdocs_ocr_status` (incluant `'FAILED'`).
2. **Aucune certification automatique des documents historiques** : la présence d'un objet Storage et d'une empreinte déclarée ne prouve pas leur correspondance. Les reçus de contrôle restent absents jusqu'à relecture des octets par `admin-media-url` ; le statut demeure `DECLARED` pendant la convergence. Les tests préservent les statuts documentaires historiques et exigent une attestation serveur avant leur modification administrative.
3. **Normalisation `parts_count` (`null` ↔ `1`) pour les documents mono-fichier (`is_multipart = false`)** : dans `private.admin_validate_document_integrity()`, la transition de `old.parts_count = null` vers `new.parts_count = 1` sur un document mono-fichier (`is_multipart = false`) est reconnue comme équivalente et ne déclenche pas à tort `'Create a new version for documentary identity'`.
4. **Exécution sans JWT (`auth.uid() is null`)** : les triggers `admin_validate`, `admin_audit` et `admin_document_integrity` sont désactivés avant les `UPDATE` internes de la migration puis recréés, garantissant l'exécution via `supabase db push` ou SQL Editor sans nécessiter de session JWT opérateur.

---

## 2. État réel vérifié en lecture seule sur `cdesuvcozcetdtvibgqs`

### 2.1 Tables et colonnes (`REST OpenAPI` & lectures publiques `anon`)

| Table | État sur `cdesuvcozcetdtvibgqs` | Contenu / Colonnes constatées |
|---|---|---|
| `public.public_documents` | **PRÉSENTE** | 1 ligne publiée : `doc-dff4865a-c6a8-418e-8895-626258e409d0` (`Commune de Cocody`, `COMPTE_ADMINISTRATIF`, `fiscal_year: 2024`, `status: 'PUBLISHED'`, `verification_status: 'VERIFIED'`, `page_count: 45`, `file_size_bytes: 14072943`, `checksum_sha256: '941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'`, `is_multipart: false`, `parts_count: null`, `document_parts: []`, `is_scanned: false`, `has_text_layer: true`, `ocr_status: 'NOT_APPLICABLE'`). Colonnes en attente de migration `20261013165625` : `revision`, `checksum_status`, `checksum_algorithm`, `manifest_sha256`. |
| `public.administrative_accounts` | **PRÉSENTE** | 1 ligne publiée : `ca-tiassale-2024` (`inst-com-tiassale`, `fiscal_year: 2024`, `status: 'PUBLISHED'`, `verification_status: 'VERIFIED'`). **Aucune ligne pour Cocody 2024** (les données financières structurées de Cocody 2024 ne sont pas encore publiées en production). |
| `public.ca_investment_operations` | **PRÉSENTE** | 3 lignes publiées rattachées à `ca-tiassale-2024`. |
| `public.ca_procurement_matches` | **PRÉSENTE** | 3 lignes publiées rattachées à `ca-tiassale-2024`. |
| `public.local_budgets` | **PRÉSENTE** | 3 lignes publiées (`inst-com-bingerville` 2026, `inst-com-cocody` 2026, `inst-com-tiassale` 2024). |
| `public.institutions` | **PRÉSENTE** | 4 lignes (`inst-com-cocody`, `inst-com-bingerville`, `inst-com-tiassale`, `inst-min-sante`). Colonnes en attente de `20261013165625` : `revision`, `archived_at`, `publication_status`, `profile_metadata`. |
| `public.admin_tasks` | **ABSENTE (en attente de `20261013165625`)** | Sera créée par `20261013165625_admin_dashboard_persistence_hardening.sql`. |
| `public.admin_audit_events` | **ABSENTE (en attente de `20261013165625`)** | Sera créée par `20261013165625_admin_dashboard_persistence_hardening.sql`. |
| `public.admin_operation_receipts` | **ABSENTE (en attente de `20261013165625`)** | Sera créée par `20261013165625_admin_dashboard_persistence_hardening.sql`. |
| `private.admin_document_file_checks` | **ABSENTE (en attente de `20261013165625`)** | Sera créée et pré-remplie par `20261013165625_admin_dashboard_persistence_hardening.sql`. |

### 2.2 RPC PostgreSQL

| RPC | Statut sur `cdesuvcozcetdtvibgqs` | Rôle et appelants |
|---|---|---|
| `public.import_data_batch` | **DÉPLOYÉE** | Import transactionnel de lots de données (`ADMIN`, `DATA_MANAGER`). |
| `public.review_data_import` | **DÉPLOYÉE** | Qualification et publication financière contrôlée (`ADMIN`, `DATA_MANAGER`). |
| `public.admin_persistence_version` | **EN ATTENTE DE MIGRATION (`PGRST202`)** | Vérifie la disponibilité du contrat de persistance admin v3 (`src/services/adminPersistenceService.ts`). Tant qu'elle n'est pas déployée, `checkAdminPersistenceContract()` lève une erreur explicite (`Migration de persistance admin manquante ou obsolète sur Supabase`) et bloque toute fausse confirmation d'écriture. |
| `public.admin_mutate` | **EN ATTENTE DE MIGRATION (`PGRST202`)** | Mutation unitaire transactionnelle avec contrôle de révision, journal d'audit et reçu d'idempotence (`src/services/adminPersistenceService.ts`). |
| `public.admin_mutate_batch` | **EN ATTENTE DE MIGRATION (`PGRST202`)** | Mutation par lot atomique (`1..100` éléments) avec rollback intégral en cas d'échec. |
| `public.admin_confirm_document_integrity` | **EN ATTENTE DE MIGRATION (`PGRST202`)** | Atteste côté serveur (`service_role` uniquement via Edge Function `admin-media-url`) que les octets réels dans Storage correspondent au SHA-256 et à la taille déclarés. |
| `public.admin_baseline_visibility` | **EN ATTENTE DE MIGRATION (`PGRST202`)** | Masque côté public les enregistrements du référentiel statique qui ont été archivés ou dépubliés en base. |
| `public.admin_staff_directory` | **EN ATTENTE DE MIGRATION (`PGRST202`)** | Annuaire interne des opérateurs actifs (`ADMIN`, `DATA_MANAGER`, `MODERATOR`). |

### 2.3 Edge Functions Supabase

| Edge Function | Statut sur `cdesuvcozcetdtvibgqs` | Usage et contrat de sécurité |
|---|---|---|
| `public-document-url` | **DÉPLOYÉE (`HTTP 200` OPTIONS)** | Génère une URL signée temporaire (60s) pour les documents `PUBLISHED` (public) ou `UPLOADED`/`TO_VERIFY`/`VERIFIED` (uniquement pour un opérateur authentifié `ADMIN`, `DATA_MANAGER` ou `MODERATOR` via `profiles.role`). Supporte `part_number` pour les documents multifascicules. |
| `citizen-proof-media-url` | **DÉPLOYÉE (`HTTP 200` OPTIONS)** | Génère une URL signée temporaire pour les preuves citoyennes `APPROVED` (public) ou en modération (`ADMIN`, `MODERATOR`). |
| `admin-media-url` | **EN ATTENTE DE DÉPLOIEMENT (`HTTP 404` OPTIONS)** | Présente dans `supabase/functions/admin-media-url/index.ts`. Gère la lecture signée des médias `admin_media` et l'action `action: 'verify_document_integrity'` qui relit les octets dans `public_documents`, recalcule le SHA-256 + manifeste `SHA256_PARTS_MANIFEST_V1` et appelle `public.admin_confirm_document_integrity`. |

---

## 3. Matrice RBAC et RLS par rôle (`profiles.role`)

Aucun rôle ne dépend de `user_metadata` ni d'un paramètre client : toutes les politiques RLS et fonctions `SECURITY DEFINER` / `SECURITY INVOKER` interrogent `public.profiles` (`where id = auth.uid() and is_active = true`).

| Domaine / Opération | `ADMIN` | `DATA_MANAGER` | `MODERATOR` | `CITIZEN` (authentifié) | `anon` (visiteur public) |
|---|---|---|---|---|---|
| Lecture des documents `PUBLISHED` (`public_documents`) | Oui | Oui | Oui | Oui | Oui |
| Lecture des documents non publiés (`UPLOADED`, `TO_VERIFY`, `VERIFIED`, `ARCHIVED`) | Oui | Oui | Oui (lecture RLS staff) | **Non** | **Non** |
| Téléversement / mutation documentaire (`public_documents`) | Oui | Oui | **Non** (refusé par `admin_domain_allowed` & RLS Storage `documents_staff_domain`) | **Non** | **Non** |
| Vérification d'intégrité binaire (`admin-media-url` → `admin_confirm_document_integrity`) | Oui | Oui | **Non** | **Non** | **Non** |
| Saisie / vérification / publication de CA (`administrative_accounts`, `ca_investment_operations`, `ca_procurement_matches`) | Oui | Oui | **Non** (écriture réservée `ADMIN` / `DATA_MANAGER`) | **Non** (lecture seule des lignes `PUBLISHED`) | **Non** (lecture seule des lignes `PUBLISHED`) |
| Mutation `institutions`, `budget_projects`, `budget_lines`, `caidp_directory` | Oui | Oui | **Non** | **Non** | **Non** |
| Modération des preuves citoyennes (`citizen_proofs`) | Oui | **Non** | Oui | Insertion de ses propres preuves ; lecture via `public_citizen_proofs` (`APPROVED`) | Lecture via `public_citizen_proofs` (`APPROVED`) |
| Rédaction / publication d'articles (`news_articles`) | Oui | **Non** | Oui | Lecture des articles `PUBLISHED` | Lecture des articles `PUBLISHED` |
| Tâches admin (`admin_tasks`) | Toutes | `DOCUMENT_VERIFICATION`, `CAIDP_CONTACT_COMPLETION` | `PROOF_MODERATION` | **Non** | **Non** |
| Paramètres globaux (`site_settings`) | Oui | Lecture seule | Lecture seule | Lecture seule | Lecture seule |
| Journal d'audit (`admin_audit_events`) | Lecture tous domaines (`INSERT`/`UPDATE`/`DELETE` directs interdits) | Lecture périmètre données/documents | Lecture périmètre modération/articles | **Non** | **Non** |

---

## 4. Séquence de déploiement ordonnée et procédure de rollback

> [!IMPORTANT]
> Conformément aux règles de la mission, **aucune de ces étapes distantes n'est exécutée automatiquement**. Ce runbook définit l'ordre strict à suivre lors de la mise en production autorisée.

### 4.1 Ordre strict de déploiement

1. **Étape 1 — Sauvegarde logique préalable (Pre-flight Snapshot)** :
   - Exporter l'état actuel des tables critiques (`public_documents`, `administrative_accounts`, `ca_investment_operations`, `ca_procurement_matches`, `local_budgets`, `institutions`, `profiles`) avant toute DDL.
2. **Étape 2 — Migrations SQL Supabase (`cdesuvcozcetdtvibgqs`)** :
   - Appliquer dans l'ordre :
     1. `supabase/migrations/20261013165625_admin_dashboard_persistence_hardening.sql`
     2. `supabase/migrations/20261013200000_multipart_ca_documents.sql`
   - Vérifier immédiatement en SQL :
     - `SELECT public.admin_persistence_version();` → doit retourner `3`.
     - Contrôler les statuts existants et `revision` sans assimiler `PUBLISHED` à une empreinte calculée : `checksum_status` reste `DECLARED` sans attestation des octets.
3. **Étape 3 — Déploiement des Edge Functions Supabase** :
   - Déployer `admin-media-url` :
     ```bash
     npx supabase functions deploy admin-media-url --project-ref cdesuvcozcetdtvibgqs
     ```
   - Mettre à jour `public-document-url` (support `part_id` multifascicules et remise binaire contrôlée) :
     ```bash
     npx supabase functions deploy public-document-url --project-ref cdesuvcozcetdtvibgqs
     ```
   - Vérifier que `OPTIONS https://cdesuvcozcetdtvibgqs.supabase.co/functions/v1/admin-media-url` et `public-document-url` répondent `HTTP 200`.
4. **Étape 4 — Déploiement Frontend (Vercel)** :
   - Seulement après validation des étapes 2 et 3, fusionner la PR #63 vers `master` pour déclencher le déploiement Vercel.

### 4.2 Procédure de rollback testable

- **Rollback Frontend (immédiat, sans perte de données)** :
  - Redéployer le build Vercel précédent ou annuler le commit de merge sur `master`. Les tables `public_documents` et `administrative_accounts` conservent toutes leurs colonnes historiques intactes.
- **Rollback Edge Functions** :
  - Redéployer la révision précédente de `public-document-url` depuis `master~1`. La fonction `admin-media-url` est isolée et n'impacte aucune route publique si le frontend est revenu à la version précédente.
- **Rollback Base de données (si nécessaire)** :
  - Les nouvelles tables (`admin_tasks`, `admin_audit_events`, `admin_operation_receipts`, `private.admin_document_file_checks`) et colonnes (`revision`, `checksum_status`, `checksum_algorithm`, `manifest_sha256`, `archived_at`, `publication_status`) sont purement additives et ne suppriment ni ne modifient aucun montant ou document existant.
  - Ne pas supprimer les triggers de sécurité pour contourner un incident. Suspendre les mutations concernées, préserver les originaux et reçus, puis appliquer un correctif revu ou restaurer la sauvegarde dans un environnement isolé. Le retour arrière de l'Edge retire l'accès au nouveau compteur ; les permissions et contrôles SQL restent actifs.
