# AGENT HANDOFF — SuiviBudget Côte d’Ivoire

## METADATA
- LAST_UPDATED : 2026-10-01
- LAST_AGENT : Codex
- CURRENT_BRANCH : `codex/apec-phase-2c`
- HANDOFF_BASE_SHA : `4aed61d18d4ebf139009dc3d72e5bbebda994380` (master consolidé, CI SUCCESS)
- CURRENT_HEAD : consulter Git pour le commit Phase 2C et son descendant documentaire ; ne pas créer de boucle de commits de métadonnées.
- PR : #3, #4 et #5 fusionnées dans cet ordre sur master avec autorisation explicite de l’utilisateur. Phase 2C sur branche distincte ; PR à ouvrir après commit.
- SUPABASE_PROJECT : `cdesuvcozcetdtvibgqs`, eu-west-1
- CURRENT_MILESTONE : fondation / Passport 2A / DGMP 2B consolidés ; APEC 2C minimal VALIDATED localement, CI de sa PR à vérifier après push
- FOUNDATION_READY : TRUE, validé sur 3b502b1 après CI SUCCESS. Aucun P0/P1 connu ouvert dans la fondation.

## COMPLETED
### Consolidation et APEC Phase 2C — 1er octobre
- Chaîne Git linéaire #3 → #4 → #5 et CI exactes vérifiées sans refaire les audits. Fusions : `1ebd9ab` (#3), `abc884a` (#4), `4aed61d` (#5). Arbre final identique au HEAD validé de #5. Quality / verify SUCCESS sur master consolidé : run 36786596459.
- Quatre tables additives : apec_cycles, apec_needs, apec_contributions, apec_events. Aucun changement des tables BP/CA/Passport/DGMP/preuves. Aucune ancienne migration rejouée et aucune ingestion.
- Besoin → vérification → priorité documentée → projet canonique budget_projects / budget local PUBLISHED de même institution et exercice → contributions → suivi/réponse. Un rang n’est ni un vote représentatif ni une décision de financement. La source citoyenne reste CITIZEN_OBSERVATION même après vérification.
- Source, date, auteur serveur, vérification et rattachement conservés ; événements immuables et ordonnés, identifiants de dépôt et état des rattachements dans l’historique. Refus des transitions invalides, usurpations, auto-validation, liens vers autre institution/exercice et budgets non publiés.
- RLS : cycles lisibles ; besoins privés auteur / ADMIN / DATA_MANAGER ; contributions privées auteur / gestionnaires ; événements visibles à l’auteur du besoin et aux gestionnaires. Aucune lecture privée anonyme, aucun droit service_role, aucun UPDATE/DELETE direct des besoins/contributions/événements. Modérateur sans pouvoir APEC de gestion.
- Panneau APEC dans le Passport : cycles documentés, dépôt, suivi, sources et décisions. Connexion/inscription citoyenne par Supabase Auth et déconnexion, sans utiliser l’accès back-office qui refuse les citoyens. Les formulaires n’accordent jamais un rôle.
- 145 tests / 10 fichiers PASS, dont 22 tests PostgreSQL et 9 nouveaux tests APEC écrits avant l’implémentation. TypeScript + build PASS (1724 modules), git diff --check PASS sur ce bloc.
- 10/10 contrôles HTTP réels APEC PASS : cycles lisibles, tables privées et RPC interdites à ANON, DELETE refusé sur les quatre tables. Mode reproductible : node scripts/verify-foundation-http.mjs apec.
- UX/UI ApecParticipation VALIDATED sur 360/375/390/430/768/1280/1440/1920 : zéro débordement, captures 375/1440 inspectées ; parcours staff et connexion/dépôt citoyen vérifiés avec réponses réseau interceptées localement. État public vide vérifié contre Supabase réel. Aucun compte ou objet de test créé en production.
- Contrôle distant : RLS active sur quatre tables, zéro ligne APEC, trois CA préservés. Migration locale 20260930223840 appliquée une seule fois sous version distante 20261001040746.
- Limite assumée de ce bloc : besoins/contributions privés, sans publication publique automatique ni agrégat de représentativité ; entrée actuelle par le Passport d’un projet. L’inscription peut demander une confirmation e-mail selon la configuration Auth ; aucun e-mail envoyé pendant les tests.
- Advisors : protection des mots de passe compromis toujours désactivée. Deux WARN SECURITY DEFINER pour record_apec_decision et apec_link_targets : élévation intentionnelle, autorisation ADMIN/DATA_MANAGER vérifiée avant lecture/écriture, search_path vide, SQL statique et paramètres bornés par contraintes. Elle évite d’accorder les mutations directes et l’accès intégral aux projets. Refus citoyen/anonyme testé. Voir [règle 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Les blocs suivants sont historiques ; leurs anciennes interdictions de fusion et leurs anciens statuts de PR ne décrivent plus l’état courant ci-dessus.

### Bloc DGMP Phase 2B — 30 septembre, après Phase 2A
- Branche `codex/dgmp-phase-2b-deterministic` créée depuis le HEAD réel de PR #4 `2657acbf63154730835c80d07edb0d94d337c61c`. PR #5 ouverte sur la branche Phase 2A ; aucune fusion.
- `findCandidate` n’arrête plus la recherche au premier candidat plausible : tous les candidats compatibles sont évalués, classés avec un score déterministe puis départagés par une clé stable indépendante de l’ordre d’entrée.
- Une égalité de niveau de confiance et de score entre opérations distinctes est explicitement déclassée en `TO_VERIFY` avec `ambiguous_candidates` ; aucune ambiguïté n’est publiée comme correspondance certaine.
- Les niveaux `STRONG / PROBABLE / WEAK / NONE / TO_VERIFY`, les conflits institution/exercice/localisation, les champs manquants et les justifications temporelles sont conservés.
- Tests ajoutés avant clôture : candidats plausibles intervertis, opérations homonymes équivalentes, bonne collectivité/mauvais exercice, montant proche avec objet/localisation incompatibles, et stabilité des trois rapprochements Tiassalé dans les deux ordres.
- Les trois pilotes CA n’ont pas été modifiés ; aucune ingestion DGMP massive ; aucune migration Supabase ajoutée ou rejouée.
- CI Quality run 36785358174 SUCCESS sur le commit fonctionnel `a7e71b5d91168bb9a63a2e54e17a6618a738f921` : 10 fichiers de tests, 136/136 tests PASS, TypeScript + Vite build PASS, 1722 modules. L’avertissement préexistant sur la taille des bundles demeure.
- Prochain bloc fonctionnel : APEC Phase 2C. Ne pas étendre le rapprochement DGMP à une ingestion massive avant définition d’un pipeline de provenance et de validation.

### Bloc Phase 2A — 30 septembre, après 9457f07
- Vingt champs factuels explicites : institution, exercice, objet, localisation, trois montants distincts, référence marché, attributaire, document/page/libellé source, états financier/physique, preuve, réponse, confiance, méthode et vérification. Valeurs absentes UNKNOWN/NOT_FOUND_PUBLICLY ; aucun exercice par défaut inventé.
- Rapprochement : champs concordants, contradictoires et absents ; conflit d’identifiant institutionnel ou de localisation déclassé TO_VERIFY ; mention « phase » dans le projet insuffisante pour établir une pluriannualité.
- Trois marchés Tiassalé préservés ; Abobo/Bingerville ne produisent pas de liaison d’opération à partir de leurs seules synthèses. Gardienkro conserve 0 FCFA et « cause non établie ». Aucun CA VERIFIED publié implicitement.
- UI Comprendre / Explorer / Vérifier, cartes mobiles, lien source externe et accès au document par Edge lorsque son identifiant existe. Réponse institutionnelle distincte de la validation indépendante ; preuves d’autres projets et démonstrations exclues.
- Deux corrections SQL ciblées : retrait des droits techniques service_role et lecture citoyenne des budgets limitée à PUBLISHED. Matrice complète dans CA_SECURITY_STATUS_20260929.md.
- 131/131 tests, dont 18 Passport et 13 PGlite ; 23/23 contrôles HTTP publics ; 16/16 scénarios navigateur sur 360/375/390/430/768/1280/1440/1920. Aucun débordement ni erreur JS. Inspection visuelle des captures 375 et 1440.
- Build final TypeScript/Vite PASS (1722 modules), git diff --check PASS. Le seul avertissement build reste la taille des bundles de données existants.
- Commits poussés : `1771f67` moindre privilège et `ecfb1f7` Passport. CI du HEAD fonctionnel exact SUCCESS : [Quality / verify](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/36781974758/job/110114182806), Vercel Preview Comments SUCCESS. La CI du descendant documentaire sera contrôlée après push sans autre commit pour réinscrire son hash.
- Le navigateur utilise le composant réel dans un aperçu local scratch avec les sources pilotes de tests, puis un état public vide. Ce contrôle ne prétend pas publier ces sources ni revalider toutes les pages.

### Fondation — validations antérieures conservées
- 197 contrôles HTTP réels réussis avec ANON, ADMIN, DATA_MANAGER, MODERATOR, CITIZEN propriétaire et second CITIZEN ; 2 contrôles supplémentaires des relations CA/opérations/marchés réussis.
- Sources documentaires : upload ADMIN/DATA_MANAGER, refus autres rôles, doublon et overwrite refusés, suppression staging permise, suppression source référencée refusée.
- Cycle TO_VERIFY → VERIFIED → PUBLISHED réel, publication directe refusée, created_by/verified_by/verified_at/published_at serveur contrôlés. Tests SQL existants couvrent immutabilité, checksum et versionnement.
- Documents non publiés et preuves PENDING/REJECTED : aucune URL délivrée, même au staff par le point d’accès public. APPROVED/PUBLISHED : signatures de 300 secondes fonctionnelles puis effectivement expirées.
- Upload citoyen et anonyme réel, MIME interdit et fichier >25 MiB refusés, accès direct public aux deux buckets refusé.
- Matrice PostgREST : visibilité des CA et enfants, documents selon statut/rôle, preuve privée propriétaire/staff, refus usurpation et modération hors ADMIN/MODERATOR, projection publique sans données privées, journal CAIDP INSERT sans lecture publique ni mutation.
- Médias affichés via Edge pour APPROVED ; médias privés signés seulement si la RLS Storage l’autorise. Seconde photo prise en charge, renouvellement toutes les quatre minutes quand la page est visible ; pas de chemin privé utilisé comme URL d’image.
- CA publics chargés par PostgREST avec filtre PUBLISHED et relations réelles. Les trois CA VERIFIED ont été retirés du bundle applicatif et conservés uniquement comme fixtures de tests. Vérification du bundle : aucun identifiant des trois pilotes ni de leurs marchés embarqué.
- Page Documents filtrée PUBLISHED également lors des notifications du cache ; cache documentaire effacé à la déconnexion.
- 121 tests / 10 fichiers PASS ; build TypeScript + Vite PASS (1722 modules).
- Fixtures SQL, Auth, profils, objets Storage, journaux CAIDP et fichier local de mots de passe temporaires supprimés.
- Dépendance de développement xlsx inutilisée supprimée après alerte GitHub ; npm audit : zéro vulnérabilité. Le signal sur master peut rester ouvert tant que PR #3 n’est pas mergée.

## MIGRATIONS_REMOTE / REMOTE_SCHEMA_STATE
| Fichier local | Version distante | État |
| --- | --- | --- |
| 20260929121408_document_metadata_versions.sql | 20260930030522 | APPLIED |
| 20260929121225_publication_boundaries.sql | 20260930030614 | APPLIED |
| 20260929141800_grant_schema_privileges.sql | 20260930030702 | APPLIED |
| 20260930030840_public_proof_projection_boundary.sql | 20260930031058 | APPLIED |
| 20260930033244_foundation_http_access.sql | 20260930144753 | APPLIED |
| 20260930153716_least_privilege_passport_boundary.sql | 20260930153938 | APPLIED |
| 20260930223840_apec_participation_cycle.sql | 20261001040746 | APPLIED |

Les quatre premières migrations n’ont pas été rejouées. Les horodatages distants sont attribués par l’outil ; ne pas rejouer sur la seule différence de préfixe. Schéma metadata, vue publique, triggers, grants et RLS contrôlés.

## RLS_STATE / GRANTS_STATE / POSTGREST_STATE
PASS. Rôles issus de profiles protégés, aucune autorité user_metadata/client. La nouvelle migration accorde seulement SELECT sur public_documents et citizen_proofs à service_role : les fonctions Edge renvoyaient 404 car ces droits SQL manquaient. Aucun droit de mutation documentaire ajouté au service.

Projection publique : vue security_invoker + security_barrier sur fonction privée SQL stable SECURITY DEFINER sans paramètres, search_path vide, projection fixe APPROVED sans identité privée/contact/notes/tracking. Cette élévation limitée est volontaire ; le filtre est dans la fonction, pas seulement dans la vue.

## STORAGE_STATE / EDGE_FUNCTIONS_STATE
- Buckets public_documents et citizen_photos privés. Limites : 50 MiB et 25 MiB.
- Ancienne policy photo rejetait chaque upload car metadata.size n’existe pas encore lors du contrôle INSERT. Taille et MIME imposés par le bucket ; extensions autorisées conservées par RLS.
- public-document-url v3 ACTIVE ; citizen-proof-media-url v2 ACTIVE ; verify_jwt=true conservé.
- Appels publics avec la clé anon dans Authorization fonctionnent sans session citoyenne. Aucun besoin démontré de désactiver verify_jwt.
- OPTIONS, POST, méthode interdite, identifiant invalide/absent, média absent, seconde image, URL réelle et expiration testés.
- Suppression du compteur de téléchargements non fonctionnel dans l’Edge : générer une URL ne prouve pas un téléchargement et l’UPDATE service_role était refusé.
- Une URL déjà émise pendant APPROVED reste valable jusqu’à sa limite de 300 secondes après un retrait. Aucun nouveau lien n’est émis après retrait ; le mécanisme ne promet pas une révocation instantanée.

## PRODUCTION_FIXTURES_AFTER_TESTS
Contrôle SQL final : auth.users=1 ; administrative_accounts=3 ; public_documents=0 ; citizen_proofs=0 ; storage.objects des deux buckets=0 ; profils temporaires=0 ; journaux temporaires=0.
Trois CA pilotes VERIFIED préservés : Abobo, Bingerville, Tiassalé 2024. Aucune donnée métier fabriquée. Aucun changement sur un autre projet Supabase ou Vercel Civic Signal.

## PASSPORT_STATE
PASS pour la fondation : 10 tests de rapprochement, séparation financier/physique, origine citoyenne non inventée, frontière de publication réelle. La requête imbriquée a retrouvé les trois CA, trois opérations et trois marchés sous le compte ADMIN temporaire ; zéro CA publié sous ANON.
Consolidation Phase 2A VALIDATED : vingt champs et trois niveaux de lecture, 18 tests Passport, trois opérations réelles Tiassalé et deux synthèses sans opérations, CI fonctionnelle SUCCESS sur ecfb1f7. Les document_id manquants, localisations non renseignées et numéros de contrat absents restent explicitement inconnus ; l’identifiant d’appel d’offres n’est pas présenté comme numéro de contrat.
DGMP Phase 2B VALIDATED et fusionnée ; aucune ingestion massive. APEC Phase 2C minimal VALIDATED localement, avec suivi privé et historique sourcé ; voir bloc courant ci-dessus pour CI et limites.

## ADVISORS / KNOWN_ANOMALIES
- SECURITY_ADVISORS : seul WARN Leaked Password Protection Disabled ; aucun autre signal sécurité.
- PERFORMANCE_ADVISORS : 31 unused indexes INFO et 16 multiple permissive policies WARN au contrôle final après nettoyage (38 index à 14:58 UTC ; les tests ont exercé certains index). Pas de suppression ni consolidation mécanique, aucun gain mesuré ne justifie ce refactoring pour fermer la fondation.
- Bundle volumineux préexistant (données budgétaires notamment) : avertissement build, pas une erreur.
- KNOWN_FAILURES : aucune dans les validations terminées ; CI 454d62c et 3b502b1 SUCCESS.
- BLOCKED : aucun blocage du travail local. Navigateur intégré indisponible (kernel assets) ; repli Playwright/Edge local utilisé.
- MANUAL_ACTION_REQUIRED : activer [Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) dans Authentication sur le seul projet autorisé. Non activée par l’agent ; ce WARN seul ne bloque pas FOUNDATION_READY.
- Remédiations performance : [index inutilisés](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [policies permissives multiples](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).

## TESTS_EXECUTED / TEST_RESULTS / BUILD_STATUS / CI_STATUS
- `node scripts/verify-foundation-http.mjs <configuration-temporaire>` : 197/197 ; mode `ca` : 2/2 ; mode `cleanup` : deux buckets vides.
- Configuration contient des comptes Auth éphémères ; ne jamais la committer. Nettoyer d’abord les lignes SQL strictement identifiées, ensuite Storage, puis les comptes Auth. Le script ne crée ni ne supprime les comptes.
- Journaux locaux non sensibles : scratch/foundation-http-final.jsonl ; credentials supprimés.
- `npm test -- --run` : 121/121 PASS ; `npm run build` : PASS ; `git diff --check` : PASS.
- CI_STATUS : SUCCESS sur 3b502b1223d304b12f904087430882ea8156f324 : [Quality / verify](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/36736286683/job/109958748296) et Vercel Preview Comments. La clôture documentaire est le seul changement ultérieur ; son contrôle GitHub sera vérifié après push sans autre commit de métadonnées.
- Playwright/Edge : Documents, Observatoire, Institutions sur 375/768/1440 PASS, aucun débordement horizontal ni erreur JavaScript ; état documentaire vide conforme à la base. Captures Documents dans scratch/foundation-documents-*.png.

## UX/UI AUDIT STATUS — historique conservé
Les validations suivantes proviennent du bloc antérieur. Le contrôle de ce bloc porte sur les flux de publication ; il ne prétend pas refaire toutes les pages.
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

## DECISIONS_MADE
- Sur instruction explicite du 30 septembre, #3, #4 et #5 fusionnées sur master. Phase 2C proposée dans une PR distincte, sans fusion automatique.
- L’absence de publication des trois pilotes entraîne un état public sans CA disponible, pas une publication implicite depuis des constantes.
- Aucune liaison besoin/budget/marché n’est créée sans provenance. 0 FCFA ≠ abandon ; dépense ≠ réalisation ; observation citoyenne ≠ source officielle.

## NEXT_EXECUTABLE_TASK / NEXT_3_TASKS
1. Reprendre la PR codex/apec-phase-2c, confirmer son HEAD et sa CI. Ne pas rejouer 20261001040746 ni les migrations antérieures APPLIED. Le bloc minimal est implémenté ; ne pas le recommencer.
2. Extension suivante, hors de ce bloc : accès APEC depuis la fiche collectivité même sans projet existant, puis publication publique séparée avec modération et projection sans identité privée. Conserver le suivi privé et les événements immuables.
3. Préparer ensuite une stratégie d’ingestion DGMP/APEC avec sources réelles, déduplication, reprise sur erreur et validation humaine, sans démarrer d’ingestion massive implicitement. Protection des mots de passe compromis à activer manuellement sur le seul projet autorisé.
