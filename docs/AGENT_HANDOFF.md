# AGENT HANDOFF — SuiviBudget Côte d’Ivoire

## METADATA
- LAST_UPDATED : 2026-10-01
- LAST_AGENT : Antigravity
- CURRENT_BRANCH : `antigravity/first-real-data-pilot`
- HANDOFF_BASE_SHA : `cef3441aa6fb37e5a72d5e5ed57409532309666b` (master après fusion #9)
- CURRENT_HEAD : retrouver le HEAD de cette branche dans Git ; validations locales terminées, suite de tests PASS.
- PR : PR #9 fusionnée. Nouvelle PR `antigravity/first-real-data-pilot` (#10) ouverte vers master ; ne pas fusionner.
- SUPABASE_PROJECT : `cdesuvcozcetdtvibgqs`, eu-west-1
- CURRENT_MILESTONE : premier lot réel de bout en bout (BP, CA, DGMP) validé sur le pipeline de données réelles
- FOUNDATION_READY : TRUE, validé sur 3b502b1 après CI SUCCESS. Aucun P0/P1 connu ouvert dans la fondation.

## COMPLETED
### Premier lot réel de bout en bout — 1er octobre, après #9
- Master basé sur `cef3441aa6fb37e5a72d5e5ed57409532309666b` (PR #9 fusionnée). Aucun travail antérieur Codex réaudité ou écrasé.
- Branche `antigravity/first-real-data-pilot` créée et synchronisée sur GitHub (`4c44cb2` initial, PR #10).
- **Distinction explicite de la chaîne pilote** :
  - **A. Chaîne d'intégration locale avec données réelles sourcées** : **VALIDÉE** (fichiers `docs/imports/`, PGlite avec migrations réelles, tests 5/5).
  - **B. Recette réelle Supabase** : **VALIDÉE SUR LOT PILOTE BINGERVILLE BP 2026** (dry-run sans écriture validé `READY` avec `plan_hash` déterministe `cf991b9bfb8c75fedf864fcf46ece9ca6e6f5b96fc092f2e7bb555943853b66f`, import staging `TO_VERIFY` contrôlé : 1 ligne staging `TO_VERIFY`, 0 ligne `PUBLISHED` dans `local_budgets`, 0 altération des données préexistantes ; arrêt strict avant `VERIFY` et `PUBLISH`).
  - **C. Publication réelle visible côté citoyen** : **ARRÊT STRICT / EN ATTENTE DE REVUE HUMAINE** (conformité stricte avec le workflow découplé : la transition `TO_VERIFY` → `VERIFIED` → `PUBLISHED` est une décision humaine séparée en console opérateur habilitée).
- Trois fichiers de lots réels documentés et vérifiés créés dans `docs/imports/` :
  1. `docs/imports/bingerville-bp-2026.json` : BP 2026 Bingerville (Total: 4 046 222 000 FCFA EXACT, Fonctionnement: 1 877 888 000 FCFA EXACT, Investissement: 2 168 334 000 FCFA EXACT). Source AIP 2026-01-28 (`AIP_VERIFIED`, `HIGH`). Non conflictuel (0 ligne dans local_budgets).
  2. `docs/imports/cocody-bp-2026.json` : BP 2026 Cocody (Total: 19 764 660 000 FCFA EXACT, Fonctionnement: null UNKNOWN, Investissement: null UNKNOWN). Source Abidjan.net / Le Nouveau Réveil 2026-02-25. Statut rigoureusement classifié en `SECONDARY_TO_CORROBORATE` et `MEDIUM` (source de presse corroborée, jamais transformée en source AIP ou officielle). Démontre la règle fondamentale `UNKNOWN != 0` (restitution citoyenne "Montant à confirmer", zéro exact distinct).
  3. `docs/imports/tiassale-ca-2024.json` : CA 2024 Tiassalé (Total Prévu: 1 007 841 000 FCFA, Total Réalisé: 1 059 255 758 FCFA, tous EXACT). Source CA 2024 page 36.
- Règle de cohérence source / vérification ajoutée dans `src/utils/budgetValidation.ts` (`validateImportProvenanceConsistency` et `validateBudgetRecord`) empêchant toute contradiction entre source de presse et statut officiel/AIP.
- Suite complète d'intégration de bout en bout implémentée dans `src/utils/__tests__/realPilotChain.test.ts` (5 tests réels sous PGlite exécutant le schéma SQL et les migrations réelles du projet) :
  - Validation structurelle, de provenance et anti-contradiction des fichiers JSON.
  - Chaîne complète Bingerville BP 2026 : dry-run (plan_hash et SHA-256 déterministe sans écriture) → staging (TO_VERIFY) → revue humaine (VERIFIED) → rejet de publication sans confirmation explicite (`p_publish_confirmed = false`) → acceptation avec confirmation explicite (`p_publish_confirmed = true`) → publication dans `local_budgets` avec formatage FCFA exact.
  - Chaîne complète Cocody BP 2026 : respect strict des montants nuls (UNKNOWN) non transformés en 0 et statut `SECONDARY_TO_CORROBORATE`.
  - Chaîne complète Tiassalé 2024 : CA 2024 publié → Opération n°6 (Marché 20 magasins) reliée au CA parent → Rapprochement DGMP (AOO24062605757, Société DEM, match STRONG) relié à l'opération → Restitution Project Accountability Passport (taux financier 99.46%, séparation financier != physique).
  - Détection canonique de conflit : le pipeline refuse tout écrasement silencieux d'un enregistrement canonique préexistant avec `CONFLICT: Existing canonical record; no overwrite`.
- Validation technique locale : 179/179 tests PASS sur 12 suites de test, `npm run build` PASS (1726 modules transformés, zéro erreur TypeScript).
- Base Supabase distante `cdesuvcozcetdtvibgqs` préservée intacte : aucune migration réappliquée, aucune ingestion massive non autorisée, aucun compte de test créé en production.

### Console données et précisions — 1er octobre, après #8
- #8 contrôlée brièvement puis fusionnée au SHA attendu ; master synchronisé sans perte à 8e934d1. Post-merge ciblé : 16 tests pipeline PASS.
- Console ADMIN/DATA_MANAGER : JSON/JSONL, simulation obligatoire, rapport ligne par ligne, pagination, source/provenance et historique privés. VERIFY / REJECT / PUBLISH séparés ; confirmation explicite contrôlée aussi en SQL. Aucun service_role client, RLS inchangée.
- BP / CA / opérations / DGMP et Passport : EXACT, Environ, Plus de, Montant à confirmer ; UNKNOWN reste null, zéro exact distinct. Pas de taux/écart calculé sur montants incertains, aucune réalisation physique inférée.
- Migration locale `20261001144423_import_console_qualified_amounts.sql` APPLIED une seule fois sous version distante `20261001150911`. Montants nullables sans suppression de données, provenance par champ conservée. Ne rejouer aucune version APPLIED, notamment 20261001093613 et 20261001044508.
- Validation finale : 174 tests / 11 fichiers, TypeScript + build PASS (1726 modules), six HTTP/RLS PASS. RLS active, RPC refusée à anon/service_role et profil contrôlé pour authenticated. Base préservée : staging/journal/BP=0, CA/opérations/DGMP=3 chacun. Aucun import réel.
- UX/UI VALIDATED sur console, CA/opérations/DGMP, historique BP et Passport : huit largeurs 360/375/390/430/768/1280/1440/1920, aucune erreur JS ni débordement ; captures mobile/desktop inspectées. Parcours privés avec API interceptée localement, refus MODERATOR et confirmation de publication vérifiés.
- Advisors inchangés : six RPC SECURITY DEFINER intentionnelles protégées par profiles/search_path/grants ([règle 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)) ; [protection Auth des mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) toujours désactivée. Bundles de données volumineux préexistants.
- Limite restante : correction des versions immuables/conflictuelles via futur workflow dédié, aucun écrasement silencieux. Les limites CLI/montants incertains du bloc historique ci-dessous sont levées.

### Pipeline données réelles — 1er octobre, après #7
- #7 e5454ca contrôlée très brièvement (mergeable, CI/Vercel SUCCESS), fusionnée avec SHA attendu ; master synchronisé sans perte à 26711d5. Contrôle post-merge ciblé : 27 tests PostgreSQL PASS. Aucun réaudit historique.
- Outil opérateur `npm run import:data` : fichiers JSON/JSONL, dry-run sans écriture, plan lié au SHA-256 du fichier et à l’état serveur, import plafonné à 100 lignes/1 Mo, liste/relecture/publication/rejet. Instructions et contrat : [DATA_IMPORT.md](DATA_IMPORT.md). Aucune collecte automatique.
- Staging privé immutable et journal RLS ; origine/URL ou référence/date qualifiée/exercice/institution/type obligatoires. Montants entiers explicitement qualifiés EXACT/APPROXIMATE/LOWER_BOUND/UNKNOWN, UNKNOWN=null. Aucune conversion de valeur manquante en zéro. Date RECORDED distinguée de la publication/consultation.
- Identités déterministes, doublons identiques ignorés, divergences et données canoniques existantes signalées sans écrasement. Lots et décisions traités ligne par ligne ; isolation des erreurs. Imports concurrents sérialisés par verrou transactionnel, aperçu périmé refusé.
- TO_VERIFY → VERIFIED → PUBLISHED par deux décisions humaines séparées. Promotion vers local_budgets / administrative_accounts / ca_investment_operations / ca_procurement_matches ; les sources et précisions accompagnent les lignes dans import_provenance. Compatibilité institution/exercice et parents publiés contrôlée. Aucun DGMP ambigu publié ; STRONG et preuve de rapprochement explicitement relue requis.
- Lecture des BP PUBLISHED depuis Supabase reliée à l’historique existant, sans modification manuelle du code pour ajouter des budgets. Lecture CA/opérations/DGMP déjà dynamique préservée. Aucun changement de disposition UI ; validations UX historiques conservées, aucune nouvelle revendication d’audit visuel global.
- 166 tests / 11 fichiers PASS, dont 16 nouveaux tests pipeline PostgreSQL/intégration et 27 tests RLS existants ; TypeScript + build PASS (1724 modules). Parseur CLI JSON/JSONL contrôlé. Six contrôles HTTP/RLS réels PASS, RLS active, droits directs/service_role refusés, tables d’import/journal vides. Base inchangée : 0 BP, 3 CA, 3 opérations, 3 marchés.
- Petites fixtures exclusivement locales : Abobo, Bingerville, Tiassalé et Cocody déjà présents dans le dépôt. La ventilation Cocody incertaine reste UNKNOWN ; aucune donnée ni compte de test créé en production, aucune ingestion réelle ou massive.
- Limites explicites : outil opérateur CLI, pas de nouvelle console graphique ; corrections de versions immuables/conflictuelles à traiter dans un futur workflow dédié. CA/opérations/DGMP aux montants non exacts restent privés tant que leurs écrans ne restituent pas cette qualification ; BP à précision connue homogène publiable. Champs obligatoires manquants bloquent la publication. Aucun contournement des tables existantes.
- Migration locale 20261001091748 APPLIED une seule fois sous version distante 20261001093613. Ne jamais la rejouer. Les deux RPC métier utilisent une élévation limitée, profils protégés contrôlés avant accès, search_path vide et liste fermée de tables pour la promotion SQL paramétrée.

### APEC produit citoyen — 1er octobre, après fusion #6
- Master synchronisé sans perte de travail ; contrôle unique après fusion : 145 tests et TypeScript/build PASS. Aucun réaudit ni rejeu de migration APPLIED.
- Onglet Participation APEC sur les fiches MAIRIE/REGION, indépendant des projets, avec filtre d’exercice. Accès Passport conservé avec le même composant. Besoin, dépôt, contributions, suivi et décisions privées préservés.
- Projection additive apec_public_needs : dix champs publics seulement, aucun auteur/contact privé. Vérification préalable du besoin et publication explicite ADMIN/DATA_MANAGER ; formulaire de résumé distinct, champs vierges et confirmation obligatoire de relecture anonymisante. Aucun texte original recopié automatiquement. L’identification de données personnelles dans le texte libre reste une responsabilité humaine.
- RLS publique limitée à PUBLISHED, retrait explicite et versions des résumés conservées dans l’historique privé immuable. Aucune mutation directe accordée aux clients ni à service_role. Provenance toujours CITIZEN_OBSERVATION ; participation non représentative, besoin distinct de la programmation budgétaire.
- 150 tests / 10 fichiers PASS, dont 27 PostgreSQL : refus de publication citoyenne/non vérifiée/sans relecture, projection exacte sans identité/contact des originaux, retrait, historique et rejet des liens d’un autre exercice. TypeScript + build PASS, 1724 modules.
- Quatre contrôles HTTP réels ciblés PASS : lecture publique, refus DELETE et RPC publication/retrait anonymes. Mode : node scripts/verify-foundation-http.mjs apec-public. RLS/grants distants contrôlés ; zéro ligne publique, besoins privés vides, trois CA préservés. Aucun compte ni donnée de test créé en production.
- UX/UI VALIDATED : communes et régions sans projet sur 360/375/390/430/768/1280/1440/1920, zéro débordement/erreur JS, captures 375/1440 inspectées. Onglets mobiles en grille. Passport, connexion/dépôt et publication/retrait testés par API interceptée localement ; état public vide lu sur Supabase réel.
- Migration locale 20261001043805 appliquée une seule fois sous version distante 20261001044508. Ne jamais la rejouer. BP, CA, DGMP, Passport, preuves et sources privées existants préservés ; aucune ingestion massive.

Les sections de consolidation suivantes décrivent les validations historiques, sans remplacer ce bloc courant.

### Consolidation et APEC Phase 2C — 1er octobre
- Chaîne Git linéaire #3 → #4 → #5 et CI exactes vérifiées sans refaire les audits. Fusions : `1ebd9ab` (#3), `abc884a` (#4), `4aed61d` (#5). Arbre final identique au HEAD validé de #5. Quality / verify SUCCESS sur master consolidé : run 36786596459.
- Quatre tables additives : apec_cycles, apec_needs, apec_contributions, apec_events. Aucun changement des tables BP/CA/Passport/DGMP/preuves. Aucune ancienne migration rejouée et aucune ingestion.
- Besoin → vérification → priorité documentée → projet canonique budget_projects / budget local PUBLISHED de même institution et exercice → contributions → suivi/réponse. Un rang n’est ni un vote représentatif ni une décision de financement. La source citoyenne reste CITIZEN_OBSERVATION même après vérification.
- Source, date, auteur serveur, vérification et rattachement conservés ; événements immuables et ordonnés, identifiants de dépôt et état des rattachements dans l’historique. Refus des transitions invalides, usurpations, auto-validation, liens vers autre institution/exercice et budgets non publiés.
- RLS : cycles lisibles ; besoins privés auteur / ADMIN / DATA_MANAGER ; contributions privées auteur / gestionnaires ; événements visibles à l’auteur du besoin et aux gestionnaires. Aucune lecture privée anonyme, aucun droit service_role, aucun UPDATE/DELETE direct des besoins/contributions/événements. Modérateur sans pouvoir APEC de gestion.
- Panneau APEC dans le Passport : cycles documentés, dépôt, suivi, sources et décisions. Connexion/inscription citoyenne par Supabase Auth et déconnexion, sans utiliser l’accès back-office qui refuse les citoyens. Les formulaires n’accordent jamais un rôle.
- 145 tests / 10 fichiers PASS, dont 22 tests PostgreSQL et 9 nouveaux tests APEC écrits avant l’implémentation. TypeScript + build PASS (1724 modules), git diff --check PASS sur ce bloc.
- CI exacte de `51bf265` : [Quality / verify SUCCESS](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/36815164988/job/110218535405), Vercel Preview Comments SUCCESS. Le descendant documentaire sera poussé et contrôlé, sans nouveau commit pour réinscrire son hash.
- 10/10 contrôles HTTP réels APEC PASS : cycles lisibles, tables privées et RPC interdites à ANON, DELETE refusé sur les quatre tables. Mode reproductible : node scripts/verify-foundation-http.mjs apec.
- UX/UI ApecParticipation VALIDATED sur 360/375/390/430/768/1280/1440/1920 : zéro débordement, captures 375/1440 inspectées ; parcours staff et connexion/dépôt citoyen vérifiés avec réponses réseau interceptées localement. État public vide vérifié contre Supabase réel. Aucun compte ou objet de test créé en production.
- Contrôle distant final : RLS active sur quatre tables, zéro ligne APEC, un compte Auth et trois CA préservés. Migration locale 20260930223840 appliquée une seule fois sous version distante 20261001040746.
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
| 20261001043805_apec_moderated_publication.sql | 20261001044508 | APPLIED |
| 20261001091748_controlled_data_import.sql | 20261001093613 | APPLIED |

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
- SECURITY_ADVISORS : WARN Leaked Password Protection Disabled inchangé ; six WARN [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) intentionnels (quatre RPC APEC, deux RPC import). Autorisation profiles ADMIN/DATA_MANAGER avant accès, search_path vide, mutations staging directes interdites et refus testés. Promotion import paramétrée avec liste fermée de quatre tables. Aucun autre signal sécurité.
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
1. Contrôler la CI du HEAD de `antigravity/first-real-data-pilot` après push ; laisser sa PR ouverte vers master sans fusionner.
2. Préparer le déploiement/revue humaine en console de production avec session opérateur habilitée pour les deux lots BP prêts (Bingerville et Cocody), sans écraser ni fabriquer de données.
3. Implémenter le workflow dédié de révision/résolution des enregistrements canoniques conflictuels pour le CA 2024 Tiassalé avant ré-import. Protection des mots de passe compromis à activer manuellement sur le seul projet autorisé.
