# AGENT HANDOFF — SuiviBudget Côte d’Ivoire

## METADATA
- **LAST_UPDATED**: 2026-09-30T03:12:00Z
- **LAST_AGENT**: Codex
- **CURRENT_BRANCH**: `security-ca-final-20260929`
- **HANDOFF_BASE_SHA**: `b2b3b1f`
- **PR**: #3 ("Final: security hardening + verified CA foundation")
- **SUPABASE_PROJECT**: `cdesuvcozcetdtvibgqs` (eu-west-1, PostgreSQL 17.6)
- **CURRENT_MILESTONE**: P0/P1 Security Hardening, Document Versioning, CA Workflow & Project Accountability Passport

---

## EXECUTION SUMMARY & STATUS

### État de production vérifié le 30 septembre — prioritaire sur l'historique ci-dessous

Complément : commit b2b3b1f poussé, CI verify et Vercel Preview Comments SUCCESS. Transactions distantes CITIZEN/MODERATOR/DATA_MANAGER/ADMIN réussies : visibilité CA selon rôle, insertion liée à auth.uid(), relecture propriétaire, refus usurpation, modération limitée ADMIN/MODERATOR. Après rollback : zéro compte test, zéro document, zéro preuve, trois CA. HTTP réel avec clé publique : corps vide → 400 sur les deux fonctions ; verify_jwt conservé. Prochaine action précise : tests Storage/Edge sur fichiers temporaires réels, signatures et expiration, puis nettoyage et vérification des comptages. FOUNDATION_READY reste FALSE. Les agents délégués ont atteint leur quota ; leurs travaux non livrés ne sont pas comptés comme validations.

- **FOUNDATION_READY = FALSE** : matrice distante complète des cinq rôles, PostgREST, Storage et Edge encore à terminer. Aucune expansion DGMP/APEC et aucun merge PR #3.
- **MIGRATIONS_REMOTE** : metadata `20260930030522`, publication `20260930030614`, grants `20260930030702`, projection publique `20260930031058` appliquées individuellement puis contrôlées. Les trois premiers correspondent aux fichiers locaux `20260929121408`, `20260929121225`, `20260929141800`; le complément correspond à `20260930030840`. L'outil distant attribue l'horodatage d'application : ne pas rejouer les fichiers uniquement parce que les préfixes diffèrent.
- **REMOTE_SCHEMA_STATE** : 12 colonnes metadata ajoutées ; FK text→documents et uuid→profiles compatibles ; published_at nullable ; vue publique et trigger INSERT/UPDATE présents.
- **RLS_STATE / GRANTS_STATE** : tests distants en transactions annulées réussis pour l'absence d'accès anon aux CA VERIFIED et enfants, accès ADMIN aux trois CA, refus publication directe puis cycle TO_VERIFY→VERIFIED→PUBLISHED avec acteur/date serveur. Aucun TRUNCATE/TRIGGER/REFERENCES restant pour anon/authenticated dans public.
- **CITIZEN_PROOFS_STATE** : fixture distante APPROVED/PENDING/REJECTED annulée ; anon lit uniquement APPROVED via projection sans identité privée/téléphone/notes/tracking ; insertion anonyme PENDING permise. Comptages après rollback : 3 CA, 0 documents, 0 preuves.
- **Projection publique** : vue security_invoker + security_barrier sur fonction privée SQL stable SECURITY DEFINER sans paramètres, search_path vide, projection fixe et filtre APPROVED. Aucun SELECT anon sur table privée. Le privilège élevé est volontairement limité à cette projection ; security_barrier seul n'est pas une RLS. Documentation examinée : https://supabase.com/docs/guides/database/postgres/row-level-security.
- **SECURITY_ADVISORS** : erreur security_definer_view apparue après la migration historique, corrigée par le complément ; seul WARN Leaked Password Protection Disabled subsiste.
- **PERFORMANCE_ADVISORS** : inspection après trois migrations : 42 index inutilisés INFO conservés ; consolidation des policies reportée jusqu'à matrice complète, sans suppression mécanique.
- **PASSPORT_STATE** : 10 tests existants passent ; casts as any sur origine du besoin supprimés au profit de champs optionnels typés ; valeur d'initiative conservée sans inventer une consultation.
- **TESTS_EXECUTED / TEST_RESULTS** : npm test -- --run : 116/116, 10 fichiers, après complément SQL. **BUILD_STATUS** : PASS, 1722 modules, avertissement taille des bundles existant. **CI_STATUS** : à recontrôler au nouveau commit après push.
- **STORAGE_STATE / EDGE_FUNCTIONS_STATE** : validations HTTP complètes encore requises ; aucune fonction redéployée pendant ce bloc, verify_jwt inchangé.
- **NEXT_EXECUTABLE_TASK** : compléter les tests distants CITIZEN/MODERATOR/DATA_MANAGER, puis tester les deux fonctions Edge et Storage avec fixtures temporaires supprimées, sans modifier les CA pilotes.
- **NEXT_3_TASKS** : matrice RLS distante ; tests Storage/Edge et corrections ; push et CI puis décision FOUNDATION_READY.
- **MANUAL_ACTION_REQUIRED** : activer Leaked Password Protection dans Supabase Authentication → paramètres de sécurité des mots de passe, projet cdesuvcozcetdtvibgqs. Non activé par l'agent ; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Convention SHA : HANDOFF_BASE_SHA désigne le dernier commit fonctionnel couvert ; le commit documentaire peut être postérieur. Ne pas chercher à inscrire son propre hash futur.

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
   - All 10 test suites passing (**116/116 tests green**, contrôle Codex du 30 septembre).
   - Local database integration tests (`publicationDatabase.test.ts`) executed on PGlite validating unverified CA isolation, child operations RLS, citizen proof anti-usurpation, and privacy projections.
5. **Production Build Validation**:
   - `npm run build` (`tsc && vite build`) executes cleanly with **0 errors** in ~25.8s.
6. **Permanent Charte & Rules**:
   - Updated `AGENTS.md` with the full civic accountability cycle goal, 16 non-negotiable principles, immediate scope (232 collectivités), data guardrails, and UX/UI responsive standards.
7. **UX/UI Responsive Audit & Accessibility (100% VALIDATED)**:
   - Comprehensive multi-viewport testing (375px mobile, 768px tablet, 1440px desktop) executed across all 13 platform surfaces.
   - Zero horizontal overflow across all views (`documentScrollWidth === 375px` on mobile).
   - Interactive buttons and touch targets refined to meet or exceed WCAG AA guidelines (>= 44x44px).
   - Full validation achieved for `AdminDashboardPage` (tabs CAIDP, CA 232, Documents, Modération, Work Queue) and administrative CA modals (`SingleCAUploadModal`, `BatchCAImportModal`, `ExamineCADocumentModal`).
8. **Project Accountability Passport (Passeport de Redevabilité du Projet)**:
   - Full 6-stage civic lifecycle implemented: `NEED_PROGRAMMING` → `BUDGET_VOTED` → `PROCUREMENT_DGMP` → `BUDGET_EXECUTION_CA` → `PHYSICAL_REALIZATION` → `AUDIT_ACCOUNTABILITY`.
   - Core utility `src/utils/projectPassport.ts` with evidence-aware rapprochement (`findMatchingCaOperationResult`) against verified pilot operations in `src/data/administrativeAccountsData.ts`.
   - Multi-criteria temporal matching preventing inter-fiscal year hallucinations (e.g. 2026 project vs 2024 CA flagged `WEAK` / `conflictingFields: ['fiscal_year']` unless multi-year trace exists).
   - Strict political neutrality (Principle 11): 0 FCFA execution phrasing strictly factual (*"Le Compte Administratif consulté indique 0 FCFA exécuté/ordonnancé pour cette opération sur l’exercice observé. La cause de cet écart n’est pas établie par les sources actuellement reliées."*), with zero speculative allegations ("report probable", "fraude", "retard" eliminated).
   - Clean typed Provenance (`DataProvenance`: `OFFICIAL_SOURCE`, `SUIVIBUDGET_CALCULATION`, `CITIZEN_OBSERVATION`, `INSTITUTION_RESPONSE`, `UNVERIFIED_INPUT`) and Availability (`AVAILABLE`, `NOT_FOUND_PUBLICLY`, `PENDING_COLLECTION`, `SOURCE_CONFLICT`) without `'as any'` casts.
   - Initial citizen need distinguished from budget programming (Stage 1).
   - Global score renamed to "Complétude Documentaire" (`documentationCompletenessPct`) to measure factual documentation presence without subjective governance grading.
   - Visual responsive component `src/components/ProjectAccountabilityPassport.tsx` with expandable stage cards, status badges, alert callouts, and explicit provenance tags (Principle 2).
   - Integrated into `src/components/ProjectDetailModal.tsx` as a 3rd tab with status pill ("Lié DGMP/CA" or "6 étapes") and direct civic actions (CAIDP document request, citizen field proof submission).
   - Multi-viewport visual validation (Playwright at 375px mobile and 1440px desktop) confirmed zero horizontal overflow and flawless interaction.

### PARTIAL
1. **Database Migrations Application**:
   - Three target SQL migrations are audited, made strictly idempotent, and verified locally on PGlite in `supabase/migrations/`:
     - `20260929141800_grant_schema_privileges.sql` (Prerequisite: schema usage and table grants for PostgREST RLS evaluation).
     - `20260929121225_publication_boundaries.sql` (RLS parent publication boundary, staff moderation, storage delete restrictions, publication audit trigger).
     - `20260929121408_document_metadata_versions.sql` (Document metadata columns: `original_filename`, `file_size_bytes`, `page_count`, `adoption_date`, `approval_date`, versions unique index).
   - Status: Migration files ready and idempotent; remote application pending explicit execution against Supabase `cdesuvcozcetdtvibgqs`.
2. **Citizen Proofs Security & Moderation**:
   - `citizen_proofs` pending moderation access restricted to staff (`ADMIN`, `MODERATOR`), public read limited to `APPROVED` via `public_citizen_proofs` secure view.
   - Client binding of `citizen_user_id` on submission verified and protected against user usurpation.

### NOT_STARTED
1. **DGMP Matching & Confidence Scoring Expansion**:
   - Automated procurement matching to CA investment operations for the remaining collectivités beyond Tiassalé pilot.
2. **APEC Trajectory & Three-Year Program Ingestion**:
   - Need identification → three-year programs (`three_year_programs`, `program_operations`) deferred until financial/document foundation is completely secured.

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
  - `src/utils/__tests__/caManagement.test.ts` (21 tests) — PASS
  - `src/utils/__tests__/administrativeAccount.test.ts` (18 tests) — PASS
  - `src/utils/__tests__/projectPassport.test.ts` (10 tests) — PASS
  - `src/utils/__tests__/formatters.test.ts` (7 tests) — PASS
  - `src/utils/__tests__/institutionProjects.test.ts` (8 tests) — PASS
  - `src/utils/__tests__/publicationDatabase.test.ts` (10 tests) — PASS
  - `src/utils/__tests__/security.test.ts` (25 tests) — PASS
  - `src/utils/__tests__/officialWebDirectory.test.ts` (8 tests) — PASS
  - `src/utils/__tests__/navigation.test.ts` (7 tests) — PASS
  - `src/utils/__tests__/searchHelpers.test.ts` (2 tests) — PASS
  - **TOTAL**: **10 test files passed (10/10), 116 tests passed (116/116)**.
- **Build Command**: `npm run build` (`tsc && vite build`)
  - Status: **PASSED (0 errors, 1722 modules transformed)**. Clean production bundle in `dist/`.

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
| **AdminDashboardPage** | `/admin` | VALIDATED | 375, 768, 1024, 1440 | Multi-tab admin navigation (CAIDP, CA 232, Documents, Modération, Work Queue) verified across viewports, zero horizontal overflow (scrollWidth = 375px), full responsive layout | Playwright inspection, Build |
| **ProjectDetailModal** | `handleSelectProject` | VALIDATED | 375, 768, 1440 | Modal full-width mobile container, print & close buttons (>=44px), financial vs physical execution breakdown | Playwright inspection, Build |
| **SendProofModal** | `isSendProofOpen` | VALIDATED | 375, 768, 1440 | Mobile container width 351px, zero horizontal overflow, primary action button height 52px (>=44px), status cards and dropzone responsive | Playwright inspection, Build |
| **OfficialDocRequestModal**| `isDocRequestOpen` | VALIDATED | 375, 768, 1440 | Mobile container width 355px, zero horizontal overflow, 3-step document pack selector, applicant form and letter generation verified | Playwright inspection, Build |
| **ExamineCADocumentModal** | Admin CA review | VALIDATED | 375, 768, 1440 | Modal width 343px mobile / 672px desktop, zero horizontal overflow, verification checklist, action buttons refined to min-h-[44px] >= 44px, decoupled TO_VERIFY/VERIFIED/PUBLISHED workflow | Playwright inspection, Build |
| **SingleCAUploadModal** | Admin CA upload | VALIDATED | 375, 768, 1440 | Modal width 343px mobile / 672px desktop, zero horizontal overflow, 8 responsive inputs, buttons refined to min-h-[44px] >= 44px, checksum computation | Playwright inspection, Build |
| **BatchCAImportModal** | Admin batch import | VALIDATED | 375, 768, 1440 | Modal width 343px mobile / 1024px desktop, zero horizontal overflow, drag-and-drop zone, proposal items, buttons refined to min-h-[44px] >= 44px, error handling | Playwright inspection, Build |

---

## DECISIONS MADE
1. **Strict Client-Side Role Isolation**: Client code never asserts its own role; all permissions are derived from `dataStore.currentUser.role` fetched directly from `public.profiles` verified by Supabase Auth session.
2. **No Fake Storage Uploads**: If the network is offline or Supabase Storage returns an error, the upload immediately fails with a descriptive error rather than generating a synthetic success in localStorage.
3. **Absence of Data Preservation**: Incomplete primitive budgets for Grand Abidjan communes (Abobo, Plateau, Port-Bouët, Treichville) are kept as `UNKNOWN` rather than filling them with unverified press approximations.
4. **Non-destructive Migration Pattern**: Migration scripts use `IF NOT EXISTS`, add columns safely without dropping tables, and provide rollback comments.

---

## NEXT EXECUTABLE TASK & PRIORITIES
- **NEXT_EXECUTABLE_TASK**: Apply the 3 audited, idempotent migrations (`metadata` → `publication` → `grants`) to remote Supabase project `cdesuvcozcetdtvibgqs` (eu-west-1).
- **NEXT_3_TASKS**:
  1. Validate anonymous and authenticated signed URL generation via Edge Function `public-document-url` v2 for published accounts on remote Supabase.
  2. Expand DGMP Matching & Confidence Scoring for collectivités beyond Tiassalé pilot.
  3. Ingest three-year programs (`three_year_programs`, `program_operations`) connecting citizen needs to pluriannual investment plans.

---

## MANUAL ACTION REQUIRED
- None for local execution. Remote migration application to `cdesuvcozcetdtvibgqs` requires explicit Supabase credentials if CLI token is not linked to project `cdesuvcozcetdtvibgqs`.
