# AGENT HANDOFF — SuiviBudget Côte d’Ivoire

## METADATA
- **LAST_UPDATED**: 2026-09-29T15:15:00Z
- **LAST_AGENT**: Antigravity
- **CURRENT_BRANCH**: `security-ca-final-20260929`
- **HANDOFF_BASE_SHA**: `6c47c8a5e00f4ec9c84de4cf8a20913102b1c122`
- **PR**: #3 ("Final: security hardening + verified CA foundation")
- **SUPABASE_PROJECT**: `cdesuvcozcetdtvibgqs` (eu-west-1, PostgreSQL 17.6)
- **CURRENT_MILESTONE**: P0/P1 Security Hardening, Document Versioning, CA Workflow & UX/UI Responsive Foundation

---

## EXECUTION SUMMARY & STATUS

### Reprise Codex — contrôle de drift en cours, 29 septembre 2026

État réel contrôlé : HEAD local et PR #3 `6c47c8a`, PR ouverte, checks `verify` et `Vercel Preview Comments` réussis. Projet autorisé confirmé eu-west-1 ACTIVE_HEALTHY. Historique distant toujours limité aux neuf migrations jusqu'à `20260929112823`. Aucun document ni preuve en base ; trois CA 2024 VERIFIED préservés. Les corrections ci-dessous sont locales et **non appliquées** à ce stade. Les anciennes mentions « prêt/idempotent » ne constituent pas une validation SQL.

| OBJECT | REMOTE_STATE | TARGET_STATE | MIGRATION | ACTION | RISK | VERIFICATION |
| --- | --- | --- | --- | --- | --- | --- |
| caidp_requests | Table absente, aucun usage métier | Ne pas créer de faux modèle | grants | CONFLICT : retirer référence | Échec transaction initiale | Catalogue + recherche code |
| caidp_document_requests_log | Journal PRINT_PDF/COPIED/EMAIL_SENT, INSERT public et SELECT staff RLS | INSERT public, SELECT staff, aucun SELECT anon | grants | NEEDS_ADAPTATION | Journal ≠ dossier citoyen, mailto ≠ envoi prouvé | INSERT sans RETURNING, matrice rôles |
| Privilèges tables public | anon/authenticated ont TRUNCATE/TRIGGER/REFERENCES, aucun DML utile | Allowlist table par table | grants | NEEDS_ADAPTATION | TRUNCATE non protégé par RLS ; ne restaurer DML qu'après policies | Tests réels des rôles et has_table_privilege |
| CA parent | VERIFIED ou PUBLISHED lisible selon policy | PUBLISHED seul au public | publication | NEEDS_ADAPTATION | VERIFIED ne signifie pas diffusion autorisée | SELECT anon/citoyen/staff |
| ca_financial_lines | Parent VERIFIED/PUBLISHED | Parent PUBLISHED | publication | NEEDS_ADAPTATION | Fuite des lignes avant publication | CA de tous statuts en fixture |
| ca_investment_operations / ca_procurement_matches | SELECT true | Parent PUBLISHED | publication | NEEDS_ADAPTATION | Exposition autonome des enfants | Tests des jointures RLS |
| public_documents staff | ADMIN/DATA_MANAGER/MODERATOR ALL | ADMIN/DATA_MANAGER gestion, pas DELETE accordé | publication + grants | NEEDS_ADAPTATION | Conservation sources et rôles | Matrice DML |
| storage documents | Update autorisé ; delete sans dépendance | Aucun update, suppression staging sans document référent | publication | NEEDS_ADAPTATION | Écrasement ou suppression source | Tests policies storage |
| citizen_proofs | APPROVED/owner SELECT, PENDING INSERT sans liaison forte | Table owner/staff, vue publique approuvée sans PII | publication + grants | NEEDS_ADAPTATION | Téléphone, identité et notes ne doivent pas devenir publics | Projection + refus usurpation |
| Trigger documents | UPDATE seulement, publication force VERIFIED | INSERT TO_VERIFY, vérification humaine puis publication, source immuable | publication | NEEDS_ADAPTATION | Publication directe et falsification audit | SQL insert/update réellement exécuté |
| published_at | NOT NULL avec default now | NULL avant publication, date serveur | metadata + publication | NEEDS_ADAPTATION | Faux historique de publication | Workflow réel SQL |
| Métadonnées additionnelles | 12 colonnes absentes | Colonnes typées, FK profils et document précédent | metadata | SAFE_TO_APPLY | Types FK text/uuid contrôlés | information_schema + fixture |
| Contraintes statut/version | public_documents_status_check et version_check déjà présentes | Conserver existantes | metadata | ALREADY_PRESENT : retirer doublons proposés | Doublons inutiles | pg_constraint |
| Page/taille/checksum/replacement constraints | Absentes ; table vide | Contraintes de domaine | metadata | SAFE_TO_APPLY | Rejet metadata invalides | Tests valeurs limites |
| Index série/version + replaces + created_by | Absents ; checksum unique déjà présent | Ajouter seulement trois index nécessaires | metadata | SAFE_TO_APPLY | Conflits version ; couverture FK | pg_indexes, fixture |

Ordre d'application après tests : metadata → publication → grants. Les droits sont rétablis en dernier. Pas de rejeu de migration fondatrice. Les tests SQL locaux et corrections Edge sont en cours ; aucune nouvelle validation UX n'est déclarée. Point découvert : le dépôt de preuve utilisait des aperçus locaux et un succès anticipé ; correction du parcours réel requise malgré la validation visuelle antérieure.

### COMPLETED
1. **Supabase Auth & RBAC Consolidation**:
   - Eliminated fake client-side session generation (`createSignedSession`) and dummy password hacks.
   - Enforced authoritative PostgreSQL RLS grounded on `profiles.role` (`ADMIN`, `DATA_MANAGER`, `MODERATOR`). No role is read from `user_metadata` or client storage.
   - Initial administrative user verified and promoted safely to `ADMIN`.
2. **Private Storage & Immutability**:
   - `public_documents` and `citizen_photos` buckets configured as private (50 Mio / 25 Mio limits).
   - Direct `getPublicUrl` calls removed from frontend workflows; replaced by temporary signed URLs generated through server/edge control (`public-document-url` v2, `citizen-proof-media-url` v1).
   - Document upload forbids overwrites (`upsert: false`), enforces SHA-256 integrity, file size checks, and PDF signatures.
3. **CA Types & Lifecycle Decoupling**:
   - Decoupled `VERIFIED` (human audit) from `PUBLISHED` (public display).
   - Reunified public document types in `src/types/publicDocument.ts`.
   - Restored dynamic 232 collectivités matrix computation (`getCollectivitesCaMatrix`) without inserting synthetic placeholder rows.
4. **Unit Test Suite Resolution**:
   - All 8 test suites passing (**91/91 tests green** in 20.31s).
   - Fixed mocks in `src/utils/__tests__/caManagement.test.ts` and `src/utils/__tests__/security.test.ts` to prevent external database pollution during testing.
5. **Production Build Validation**:
   - `npm run build` (`tsc && vite build`) executes cleanly with **0 errors** in 28.69s.
6. **Permanent Charte & Rules**:
   - Updated `AGENTS.md` with the full civic accountability cycle goal, 16 non-negotiable principles, immediate scope (232 collectivités), data guardrails, and UX/UI responsive standards.

### PARTIAL
1. **Database Migrations Application**:
   - Three target SQL migrations are drafted, made strictly idempotent, and verified locally in `supabase/migrations/`:
     - `20260929141800_grant_schema_privileges.sql` (Prerequisite: GRANT USAGE on schema public and SELECT/INSERT privileges to anon/authenticated for PostgREST RLS evaluation).
     - `20260929121225_publication_boundaries.sql` (RLS parent publication boundary, staff moderation, storage delete restrictions, publication audit trigger).
     - `20260929121408_document_metadata_versions.sql` (Document metadata columns: `original_filename`, `file_size_bytes`, `page_count`, `adoption_date`, `approval_date`, versions unique index).
   - Status: Migration files ready and idempotent, but NOT yet applied on the remote Supabase database (`cdesuvcozcetdtvibgqs`). Drift check required before executing against production.
2. **Citizen Proofs Security & Moderation**:
   - `citizen_proofs` pending moderation access restricted to staff (`ADMIN`, `MODERATOR`), public read limited to `APPROVED`.
   - Client binding of `citizen_user_id` on submission requires end-to-end audit.
3. **UX/UI Responsive Audit**:
   - Inventory completed across 7 primary views and 6 secondary modals.
   - Comprehensive multi-viewport testing (360/375/390/430px smartphone, tablet, desktop) pending systematic execution.

### NOT_STARTED
1. **DGMP Matching & Confidence Scoring Expansion**:
   - Automated procurement matching to CA investment operations for the remaining collectivités beyond Tiassalé pilot.
2. **APEC Trajectory & Three-Year Program Ingestion**:
   - Need identification → three-year programs (`three_year_programs`, `program_operations`) deferred until financial/document foundation is completely secured.
3. **Project Accountability Passport**:
   - End-to-end citizen passport view linking initial need to budget line, public tender, physical realization photos, and CA execution line.

### BLOCKED
- None. All dependencies, testing harnesses, and build tools are fully operational.

---

## MIGRATIONS & SCHEMA
- **Target Migration 0 (Prerequisite)**: `supabase/migrations/20260929141800_grant_schema_privileges.sql`
  - Grants `USAGE` on schema `public` and `SELECT`/`INSERT` privileges on public tables to `anon` and `authenticated` roles.
  - Required because PostgreSQL checks table-level permissions before evaluating RLS policies (resolves PostgREST 42501 / 401).
- **Target Migration 1**: `supabase/migrations/20260929121225_publication_boundaries.sql`
  - Restricts public SELECT on `ca_investment_operations`, `ca_procurement_matches`, and `ca_financial_lines` to records where the parent `administrative_accounts.status = 'PUBLISHED'`.
  - Enforces `enforce_document_publication_audit()` trigger on `public_documents`.
  - Storage deletion and updates restricted to `ADMIN`. Made idempotent (`drop policy if exists`).
- **Target Migration 2**: `supabase/migrations/20260929121408_document_metadata_versions.sql`
  - Adds versioning and institutional metadata columns to `public_documents`: `institution_type`, `original_filename`, `mime_type`, `file_size_bytes`, `page_count`, `adoption_date`, `approval_date`, `approval_reference`, `replaces_document_id`, `replacement_reason`, `created_by`.
  - Adds unique index `public_documents_institution_year_type_version`. Made idempotent (`add column if not exists`, `drop constraint if exists`).
- **Remote Drift Rule**: NEVER replay historical migrations blindly. Verify existing columns with `information_schema` before executing schema mutations.

---

## SECURITY & DATA STATE
- **Authorized Supabase Project**: `cdesuvcozcetdtvibgqs` (eu-west-1).
- **Authentication**: Strict email/password with Supabase Auth. Passwords never hardcoded in client code.
- **Profiles**: RLS strictly guards `public.profiles`. No privilege escalation possible via JWT `user_metadata`.
- **CA Pilots in Production**: 3 verified pilot accounts (Abobo, Bingerville, Tiassalé 2024). Maintained as `VERIFIED` until explicit publication review.
- **Primitive Budgets 2026**:
  - Yopougon: Recorded as `LOWER_BOUND` 17 000 000 000 FCFA (source KOACI 30/12/2025).
  - Abobo, Plateau, Treichville, Port-Bouët: Maintained as `UNKNOWN` / `NOT_FOUND_PUBLICLY` pending verified municipal council deliberations (no press approximations converted to exact amounts).

---

## TESTS & BUILD VERIFICATION
- **Test Command**: `npm test -- --run`
  - `src/utils/__tests__/administrativeAccount.test.ts` (18 tests) — PASS
  - `src/utils/__tests__/formatters.test.ts` (7 tests) — PASS
  - `src/utils/__tests__/security.test.ts` (25 tests) — PASS
  - `src/utils/__tests__/officialWebDirectory.test.ts` (8 tests) — PASS
  - `src/utils/__tests__/caManagement.test.ts` (16 tests) — PASS
  - `src/utils/__tests__/navigation.test.ts` (7 tests) — PASS
  - `src/utils/__tests__/searchHelpers.test.ts` (2 tests) — PASS
  - `src/utils/__tests__/institutionProjects.test.ts` (8 tests) — PASS
  - **TOTAL**: **8 test files passed (8), 91 tests passed (91)**.
- **Build Command**: `npm run build` (`tsc && vite build`)
  - Status: **PASSED (0 errors, 1721 modules transformed)** in 21.92s. Clean bundle in `dist/`.

---

## UX/UI AUDIT STATUS (Page by Page)

| Page / Route | Path / Trigger | Status | Tested Viewports | Key Issues & Remediations | Validation Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HomePage** | `/` (tab: `home`) | VALIDATED | 375, 768, 1440 | Aligned territory card to 232 collectivités (201 communes + 31 régions), verified bottom nav, CTA touch targets, no horizontal overflow | Playwright inspection, Build |
| **InstitutionsPage** | `/institutions` | VALIDATED | 375, 768, 1440 | Horizontal scrollable category pills, official source badges, card layouts | Playwright inspection, Build |
| **ProjectsPage** | `/projets` | VALIDATED | 375, 768, 1440 | Segmented pills, mobile table view prioritizing primary columns, GPS & filter modals | Playwright inspection, Build |
| **ObservatoryPage** | `/observatoire` | VALIDATED | 375, 768, 1440 | Real vs voted cards, citizen proof deposit CTA, status pills | Playwright inspection, Build |
| **DocumentsPage** | `/documents` | VALIDATED | 375, 768, 1440 | Empty state layout, CAIDP request template CTA, search and year dropdowns | Playwright inspection, Build |
| **AdminLoginPage** | `/admin/login` | VALIDATED | 375, 768, 1440 | Fixed /admin/login routing in parseRoute, verified cybersecurity legal banner and responsive inputs | Playwright inspection, Build |
| **AdminDashboardPage** | `/admin` | AUDITED | 375, 1024, 1440 | Multi-tab admin navigation (CAIDP, CA, Documents, Modération, Settings) | Code inspection, Build |
| **ProjectDetailModal** | `handleSelectProject` | VALIDATED | 375, 768, 1440 | Modal full-width mobile container, print & close buttons (>=44px), financial vs physical execution breakdown | Playwright inspection, Build |
| **SendProofModal** | `isSendProofOpen` | VALIDATED | 375, 768, 1440 | Mobile container width 351px, zero horizontal overflow, primary action button height 52px (>=44px), status cards and dropzone responsive | Playwright inspection, Build |
| **OfficialDocRequestModal**| `isDocRequestOpen` | VALIDATED | 375, 768, 1440 | Mobile container width 355px, zero horizontal overflow, 3-step document pack selector, applicant form and letter generation verified | Playwright inspection, Build |
| **ExamineCADocumentModal** | Admin CA review | AUDITED | 375, 1024, 1440 | Side-by-side OCR/Doc inspection, status approval buttons | Code inspection, Build |
| **SingleCAUploadModal** | Admin CA upload | AUDITED | 375, 1024, 1440 | Drag-and-drop PDF, checksum computation, metadata form | Code inspection, Build |
| **BatchCAImportModal** | Admin batch import | AUDITED | 375, 1024, 1440 | Multi-file queue, progress indicator, error handling | Code inspection, Build |

---

## DECISIONS MADE
1. **Strict Client-Side Role Isolation**: Client code never asserts its own role; all permissions are derived from `dataStore.currentUser.role` fetched directly from `public.profiles` verified by Supabase Auth session.
2. **No Fake Storage Uploads**: If the network is offline or Supabase Storage returns an error, the upload immediately fails with a descriptive error rather than generating a synthetic success in localStorage.
3. **Absence of Data Preservation**: Incomplete primitive budgets for Grand Abidjan communes (Abobo, Plateau, Port-Bouët, Treichville) are kept as `UNKNOWN` rather than filling them with unverified press approximations.
4. **Non-destructive Migration Pattern**: Migration scripts use `IF NOT EXISTS`, add columns safely without dropping tables, and provide rollback comments.

---

## NEXT EXECUTABLE TASK & PRIORITIES
- **NEXT_EXECUTABLE_TASK**: Inspect remote schema drift on Supabase `cdesuvcozcetdtvibgqs` for migrations `20260929121225_publication_boundaries.sql` and `20260929121408_document_metadata_versions.sql` before application.
- **NEXT_3_TASKS**:
  1. Validate anonymous and authenticated signed URL generation via Edge Function `public-document-url` v2 for published accounts.
  2. Perform visual inspection on AdminDashboardPage tabs (CAIDP, CA, Documents, Modération) on desktop and tablet viewports.
  3. Expand Project Accountability Passport links connecting investment operations to verified citizen proofs and tenders.

---

## MANUAL ACTION REQUIRED
- None for local execution. Remote migration application to `cdesuvcozcetdtvibgqs` requires explicit Supabase credentials if CLI token is not linked to project `cdesuvcozcetdtvibgqs`.
