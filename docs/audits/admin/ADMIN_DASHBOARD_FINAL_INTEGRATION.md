# État de clôture opérationnelle — 26 octobre 2026

La PR #63 cible maintenant master f9ebadbe et inclut les six rubriques existantes. Checkpoints A 7203647 et B d46918c : compteur durci, PDF.js avec worker local, vrais fascicules Cocody 22+22 pages et SHA contrôlés, pagination manuelle/inconnue conservée. CI du checkpoint B : [Quality 40377524106](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/40377524106).

907/907 tests (66 fichiers), 16/16 parcours navigateur, TypeScript et deux builds PASS. PostgreSQL/RLS PGlite réels, Auth/REST/Storage simulés. Six rubriques et généralisation commune/conseil régional couvertes par intégration ; ces résultats ne certifient pas une recette backend complète. Pas de production modifiée. Prêt pour fusion NON ; prêt pour production NON : GoTrue/PostgREST/Storage/Edge ensemble, concurrence multisession, restauration réelle et garantie de l'adresse relayée restent à recetter. Docker Desktop absent ; aucun autre projet Supabase autorisé.

Cocody : montants rapprochés visuellement de la page PDF 40 et patrimoine 41–43 ; aucune ligne CA 2024 en production. Document publié distinct, page_count NULL ; fichier distant de SHA 941c399b… distinct des deux fascicules locaux. Aucune substitution ni certification implicite. Tiassalé : CA publié, trois opérations et trois rapprochements confirmés en lecture seule. Aucune ingestion générale ni réimport Bingerville ; données financières nationales inchangées.

Le [runbook actualisé](../PR63_BACKEND_MIGRATIONS_SECURITY_AUDIT.md) remplace la séquence historique ci-dessous : admin/convergence multipart déjà déployée sous 20261014155231, multipart locale, compteur 20261016090000 ; Edge puis frontend après sauvegarde/restauration et recette. L'historique suivant reste daté et ne décrit pas le HEAD courant.

## Reproduction locale

- npm ci ; npx tsc --noEmit ; npm test -- --maxWorkers 2 ; npm run build ; npm run build:review.
- Sous Windows si esbuild ne peut parcourir les ACL parentes : node --import 'data:text/javascript,globalThis.__dirname=process.cwd()' node_modules/vitest/vitest.mjs run --configLoader native --maxWorkers 2 ; même préchargement avec node_modules/vite/bin/vite.js build --configLoader native. Aucun contournement des permissions métier.
- Pour le navigateur isolé : construire avec VITE_SUPABASE_URL=https://isolated-admin.supabase.co et VITE_SUPABASE_ANON_KEY=isolated-public dans un répertoire séparé ; définir ADMIN_BROWSER_BUILD vers ce build, ADMIN_BROWSER_OUTPUT vers les traces, PLAYWRIGHT_MODULE_PATH/PLAYWRIGHT_EXECUTABLE_PATH si nécessaires ; node scripts/verify-admin-persistence-browser.cjs. Le script bloque les sorties réseau externes et emploie une base PGlite isolée.
- Les deux PDF Cocody sont des sources locales facultatives pour la CI : le test est SKIPPED si elles manquent, mais elles étaient présentes et contrôlées lors de cette reprise. Les vrais PDF générés compressé/chiffré et les tables xref restent testés partout. Hashs exacts, pages et montants dans les checkpoints et le runbook.

# Intégration finale du dashboard administrateur — 14 octobre 2026

Le contrat serveur 3 réconcilie la persistance sécurisée de Codex et l’ingestion documentaire de la PR #62. La PR corrective est [#63](https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/63), sur `codex/admin-final-integration`, ciblant `feat/admin-financial-document-ingestion-pilot`. Elle ne doit pas être fusionnée ou déployée automatiquement.

| Indicateur | Résultat |
|---|---|
| HEAD de master | `a1ec60ecde6d42c4063b3ba4f854eb0dc43a898d` |
| HEAD source PR #62 | `db96ed782e17b097a9ef398b682fb066509e791c` — OPEN, inchangé au dernier contrôle |
| HEAD code final Codex publié | `ec134cf4951095d8b60f58274020f0f066517b59` ; les commits suivants documentent la livraison |
| Arbre exact du code testé/publié | `5390eb7e4b104db72f3f6882d692f61f725a452e` |
| Contrat OCR unifié | PASS — six statuts canoniques et NULL explicite |
| Migration compatible | PASS sur schéma actuel exporté ; deux applications successives de la séquence |
| SHA-256 multifascicules | PASS — client/Edge partagent le module, SQL comparé sur les mêmes entrées |
| Publications financières sécurisées | PASS — IN_REVIEW obligatoire et garde-fous documentaires conservés |
| Montants inconnus préservés | PASS — NULL distinct de zéro, erreurs rejetées, somme connue et total complet distincts |
| RLS validée | PASS en PostgreSQL/PGlite, accès par rôle et accès directs aux tables ; transport PostgREST réel BLOCKED |
| Edge et Storage validés | PASS pour le handler et les octets/signatures via transports simulés ; service distant réel BLOCKED |
| Tests totaux réussis | 868/868, 65 fichiers ; dont PostgreSQL/RLS 34, médias/Edge 13, services 13 |
| Tests navigateur | 16/16 ; Chromium réel, Auth/REST/Storage simulés, SQL/RLS exécutés |
| Tests réels réussis | Moteur PostgreSQL/PGlite et Chromium ; aucun test d’écriture Supabase distant |
| Tests bloqués | Auth/JWT réellement émis, PostgREST, Storage et Edge hébergés ensemble : Docker absent |
| TypeScript | PASS — `tsc --noEmit` et `tsc` du build |
| Build production | PASS ; avertissement préexistant sur la taille des chunks de données |
| Build review | PASS |
| GitHub Actions | PASS — [Quality / 38589329556](https://github.com/jeananvoh-cmyk/suivibudget-ci/actions/runs/38589329556), commit code ec134cf4951095d8b60f58274020f0f066517b59 |
| PR créée | [#63](https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/63), dépendante de #62 |
| PR fusionnable | OUI sur sa base empilée — capacité GitHub distincte de l’autorisation de fusion |
| Données de production modifiées | NON |
| Déploiement effectué par Codex | NON |
| Prêt pour fusion | NON — revue indépendante, cible master et compatibilité du backend à valider |
| Prêt pour production | NON — recette complète, sauvegardes et approbation du déploiement requises |

## Réconciliation et traçabilité

Sources intégrées : Codex `671bafcf0b787a9de88cd7e39a2324b5a6697613` et PR62 `db96ed782e17b097a9ef398b682fb066509e791c`. Merge local `a49bd75375fa2367ad7a3118b9647a30656da8f6`, puis stabilisation du consentement navigateur `7489614d5f2e9a83e22392515c8365d636c0dadb`. Aucun amend, force-push ni modification du worktree Antigravity.

Les identifiants Git/gh locaux ont été refusés. Le connecteur GitHub a publié un commit ayant pour parent le HEAD de #62 avec les mêmes blobs : l’arbre retourné par GitHub est exactement `5390eb7e4b104db72f3f6882d692f61f725a452e`, identique au HEAD local testé. Les deux SHAs de commit diffèrent par l’historique de publication, pas par le contenu. Le rapport et les checkpoints sont livrés dans un commit documentaire séparé ; le SHA de livraison exact et sa CI figurent dans la PR et le manifeste de sortie.

La simulation financière de #62 et ses tests Cocody sont conservés. Le diff des fichiers de données budgétaires, du référentiel de budgets locaux, des budgets ministériels et du catalogue officiel est vide par rapport à #62. Dans `src/data/caidpRiData.ts`, seules trois propriétés de type de persistance sont ajoutées. Aucune ligne de production, PDF réel Cocody, donnée financière, réimportation Bingerville ou dépendance Tailwind n’a été modifiée.

## Contrat documentaire

`NOT_APPLICABLE`, `NOT_IMPLEMENTED`, `OCR_PENDING`, `PROCESSED`, `MANUAL_TRANSCRIPTION`, `FAILED`, ou NULL. `PENDING` devient `OCR_PENDING`. `NONE` ne devient `NOT_APPLICABLE` que si `is_scanned=false` et `has_text_layer=true` ; sinon NULL. Une transcription ou un calcul de hash ne vaut ni contrôle humain ni extraction certifiée.

Les colonnes historiques `is_multipart`, `parts_count`, `is_scanned`, `has_text_layer` et `ocr_status` restent inconnues lorsqu’aucune observation ne les renseigne. L’interface ne préremplit plus des pages 1–22/23–44 ni une couche texte. Les nouveaux fascicules ont un ordre contigu, des identités et chemins distincts, des tailles et checksums réels, et des plages de pages explicitement saisies. Les anciens documents incomplets peuvent rester à vérifier ; leur certification est bloquée.

`checksum_sha256` conserve son sens historique : checksum physique. Les nouveaux documents multifascicules utilisent `manifest_sha256`, sans substituer le premier PDF au document logique. Une ancienne empreinte globale conservée dans le champ historique n’est pas réinterprétée ni certifiée automatiquement ; un original/manifeste corrigé exige une nouvelle version.

Le module `supabase/functions/_shared/documentIntegrity.ts` est utilisé par le client et la fonction Edge. L’équivalent PostgreSQL `private.admin_manifest_sha256` est vérifié par des tests comparatifs. Version `SHA256_PARTS_MANIFEST_V1`, UTF-8, ASCII pour les identifiants et chemins, LF final à chaque ligne :

```text
SUIVIBUDGET_PARTS_V1\n
part_number|id|storage_path|file_size_bytes|checksum_sha256|page_start|page_end\n
```

Les valeurs sont des entiers sûrs, l’ordre est celui du tableau, les pages commencent à 1 et sont contiguës. Les doublons d’identité, de chemin ou de hash, les trous et métadonnées manquantes sont rejetés. Le hash porte sur cette sérialisation, puis est encodé en hexadécimal minuscule. Les noms d’affichage, notes et statuts mutables n’entrent pas dans le hash.

L’Edge télécharge chaque original et contrôle ses octets, sa taille et sa signature PDF, puis confirme une attestation serveur liée à la révision. PostgreSQL refuse une certification basée seulement sur une empreinte fournie. Le contrôle humain de chaque fascicule et des pages reste distinct ; VERIFIED précède PUBLISHED. Les originaux ne sont jamais écrasés. Une compensation de téléversement n’est pas présentée comme une transaction atomique du service Storage distant.

## Revue et imports

Les usages éditoriaux existants proposent déjà IN_REVIEW pour toutes les catégories de publications du portail ; le serveur impose désormais cette étape aux articles, fiches institutionnelles, projets et lignes budgétaires. Les contenus d’articles publiés nécessitent un retour en brouillon avant modification. Les projets/lignes exigent aussi leur vérification financière et une source documentaire publiée correspondante. Le serveur impose l’acteur, la révision, une justification et l’audit ; le client relit la confirmation. Les tests tentent aussi les UPDATE directs.

Exception explicite : les coordonnées de l’annuaire CAIDP ne sont pas une publication financière ; leur passage à PUBLISHED exige VERIFIED, une provenance et une revue humaine des contacts, sans imposer en plus une étape éditoriale IN_REVIEW. Ce parcours est testé.

CSV : une cellule vide devient NULL, `0` reste zéro, les montants invalides ou hors précision sont rejetés. Le lot financier est atomique ; un montant invalide produit une synthèse avec zéro ligne intégrée, le nombre de lignes rejetées, d’inconnus et la somme connue partielle. Après succès, la synthèse distingue lignes intégrées et déjà présentes, montants inconnus, somme connue, total complet seulement si tout est connu. Elle demeure affichée. Aucun total officiel n’est recalculé.

## Preuves et limites

- `adminPersistenceDatabase.test.ts` : 34 tests, RLS par domaine, données sensibles exclues du journal, mutations directes refusées, rôles et comptes désactivés, révisions, reprises/idempotence, transactions et OCR/manifeste/publication.
- `adminPersistenceFixtures.ts` et `fixtures/adminProductionSchema*.json` : métadonnées uniquement, capturées en lecture seule sur le projet autorisé le 14 octobre. Tables, colonnes, enums, contraintes, fonctions applicatives, politiques, vues, grants et triggers publics sont reconstruits ; le schéma Auth/Storage fourni est le sous-ensemble nécessaire. Cette fixture ne remplace pas les services Auth/Storage réels.
- `adminMediaSecurity.test.ts` : 13 cas, octets faux/altérés, téléchargements indisponibles, attestations, signatures limitées, contrôle d’accès, originaux protégés et documents multifascicules.
- `adminPersistenceService.test.ts` : 13 cas, confirmations, pertes de réponse, conflits, CSV et montants inconnus. Les 14 tests d’ingestion/validation #62 sont adaptés au contrat serveur ; le pilote financier Cocody demeure couvert.
- `scripts/verify-admin-persistence-browser.cjs` : 16 parcours isolés, deux sessions concurrentes, reprise, documents, fascicules, institutions, projets, publications, CAIDP, file de travail, accueil public et écrans 360/640/768/1024/1440 px sans débordement. Le consentement essentiel est préétabli dans la fixture pour éviter l’interception aléatoire des clics par sa bannière. Auth/REST/Storage sont simulés ; aucun appel externe n’est transmis.
- TypeScript et deux builds réussis. Audit visuel du dashboard mobile effectué ; l’ensemble des pages publiques bénéficie des tests et du build, mais pas d’une nouvelle revue visuelle exhaustive page par page.
- Recherche ciblée dans le diff : aucune nouvelle clé privée, token GitHub/PAT, secret Supabase ou clé AWS détectée. Il ne s’agit pas d’une preuve exhaustive d’absence de secret.

`supabase start` a été tenté avec le CLI installé 2.78.1. Échec : moteur Docker Desktop absent (`//./pipe/docker_engine`). Aucun autre projet Supabase n’a été utilisé. Les migrations du 13 octobre n’apparaissent pas dans l’historique de production consulté en lecture seule. Aucune écriture distante n’a été effectuée.

## Déploiement à faire uniquement après validation

1. Revue indépendante de #63 ; confirmer les HEAD de master/#62, puis reciblage et nouvelle CI lorsque #62 est intégrée ou fermée. Ne pas déployer le frontend actuel contre le contrat serveur 2 ou absent : `admin_persistence_version()` doit retourner 3.
2. Sur une recette isolée autorisée, restaurer le schéma réel avec données fictives ; valider Auth/JWT, PostgREST, Storage, Edge, RLS et signatures de bout en bout. Vérifier une sauvegarde restaurable PostgreSQL et un inventaire/sauvegarde Storage avant toute opération production.
3. Après approbation spécifique, appliquer dans l’ordre `20261013165625_admin_dashboard_persistence_hardening.sql`, puis `20261013200000_multipart_ca_documents.sql`. Ne pas réexécuter les migrations historiques. Si l’un de ces fichiers a déjà été installé dans un autre environnement, comparer sa version et préparer une migration corrective additive avant de poursuivre.
4. Déployer ensuite `admin-media-url` avec son module `_shared`, puis `public-document-url`. Vérifier bucket `admin_media` privé, refus de lecture directe, TTL de 60 secondes, authentification et attestations sur des objets de recette.
5. Après recette réussie et validation humaine, déployer le frontend du même contrat ; vérifier en lecture seule les références et totaux officiels. Aucun import Bingerville ou remplacement Cocody automatique.
6. En cas d’échec, arrêter la bascule et bloquer les écritures administratives ; ne pas réintroduire le fallback local ou relâcher RLS. Revenir au frontend compatible connu, conserver les originaux, et restaurer uniquement après validation des sauvegardes. Les migrations sont transactionnelles mais PostgreSQL et Storage ne forment pas une transaction distribuée.

Décision : code intégré livré pour revue dans #63 ; fusion et production non autorisées à ce stade.
