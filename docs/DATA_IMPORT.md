# Import contrôlé BP / CA / opérations / DGMP

Le pipeline est un outil opérateur en ligne de commande, connecté uniquement à `cdesuvcozcetdtvibgqs`. Il ne lance aucune collecte automatique. Les tables métier et leur lecture publique existante sont conservées. Le chargement des BP publiés depuis Supabase alimente maintenant aussi l’historique budgétaire de la fiche collectivité.

## Utilisation

Fournir `SUPABASE_ANON_KEY` (ou `VITE_SUPABASE_ANON_KEY`) et `SUIVIBUDGET_ACCESS_TOKEN` via l’environnement. Le jeton doit provenir d’une session Auth ADMIN/DATA_MANAGER active. Ne jamais utiliser une clé service_role, committer un jeton ou le passer en argument. Le serveur vérifie le profil protégé à chaque appel.

```text
npm run import:data -- dry-run lot.json plan.json
npm run import:data -- import lot.json plan.json
npm run import:data -- list
npm run import:data -- verify import-<identifiant retourné> "Source et contrôles effectués"
npm run import:data -- publish import-<identifiant retourné> "Décision explicite de publication"
npm run import:data -- reject import-<identifiant retourné> "Motif documenté"
```

Relire le plan avant `import`, puis chaque contenu avant `verify` et `publish`. Le plan est créé sans écrasement de fichier ; choisir un nouveau nom pour une nouvelle simulation. Le SHA-256 du fichier et le plan serveur empêchent d’utiliser un aperçu périmé. Le dry-run n’écrit aucune ligne en base. Les rapports JSON affichent chaque numéro de ligne, l’identifiant déterministe et les compteurs `ready / imported / ignored / conflicts / errors`. Code de sortie 2 : lot partiellement traité avec erreurs/conflits ; ne pas supposer un rollback global. Code 1 : échec global. Les décisions retournent un résultat par identifiant ; leurs échecs n’annulent pas les décisions réussies.

JSON : tableau de lignes. JSONL : une ligne JSON par ligne physique ; une ligne invalide reste une erreur à sa position, les suivantes restent traitables. Maximum 100 lignes / 1 Mo. Les rapports peuvent contenir des références internes : les conserver dans un espace opérateur privé. `list` montre les 100 imports les plus récents ; la table RLS et son historique sont consultables avec la même session staff pour les recherches plus anciennes.

## Contrat d’une ligne

Champs de premier niveau, sans champs supplémentaires :

| Champ | Contenu |
| --- | --- |
| `kind` | `BP`, `CA`, `OPERATION`, `DGMP` |
| `institution_id` | Identifiant exact du référentiel, sans matching de nom |
| `institution_type` | `COMMUNE` ou `REGIONAL_COUNCIL`, vérifié contre MAIRIE/REGION en base |
| `fiscal_year` | Exercice explicite 2000–2100 |
| `source` | `name`, `reference`, `date` ISO, `date_kind`, `url` HTTP(S) facultative |
| `data` | Champs métier autorisés ci-dessous |
| `precision` | Un statut par champ monétaire fourni : `EXACT`, `APPROXIMATE`, `LOWER_BOUND`, `UNKNOWN` |

`date_kind` distingue `PUBLISHED` (date attestée de la source), `ACCESSED` (consultation documentée) et `RECORDED` (date de l’enregistrement source existant). Ne pas transformer une date de saisie en date officielle. Une référence documentaire paginée remplace une URL absente ; aucune URL n’est fabriquée.

Les montants sont des entiers FCFA sûrs (valeur absolue ≤ 9 007 199 254 740 991). `UNKNOWN` impose `null`. Zéro n’est accepté que comme valeur explicitement fournie et qualifiée. Les différences et soldes explicitement sourcés peuvent être négatifs ; les dépenses/crédits ne le peuvent pas. Les champs absents restent absents/null ; aucun montant calculé ou renseignement physique n’est créé à l’import.

| Type | Identité déterministe | Champs principaux |
| --- | --- | --- |
| BP | institution + exercice + budget_type + version_number | `budget_type`, `version_number`, `total_amount`, `operating_amount`, `investment_amount`, `verification_status`, `confidence_level` ; dates adoption/tutelle et notes facultatives |
| CA | institution + exercice | `operating_planned`, `operating_realized`, `investment_planned`, `investment_realized`, `total_planned`, `total_realized`, `verification_status` ; autres mesures financières existantes, page, dates et notes facultatives |
| OPERATION | institution + exercice + ca_id + operation_reference | `ca_id`, `operation_reference`, `title`, `sector`, `planned_amount`, `executed_amount` ; localisation, page et notes facultatives |
| DGMP | institution + exercice + tender_number + lot | `tender_number`, `operation_id`, `procurement_object`, `contractor`, `award_amount`, `match_level`, `match_evidence` ; contrat, lot, date d’attribution et notes facultatives |

Types BP : PRIMITIF_ADOPTE, PRIMITIF_APRES_TUTELLE, AUTORISATION_EXECUTION, MODIFICATIF_1, MODIFICATIF_2, AUTRE_MODIFICATIF. `verification_status` exprime la nature de la source existante, pas l’autorisation de publier. La liste exhaustive des champs admis est dans `private.validate_import_row` de la migration.

## Publication et limites explicites

Import → TO_VERIFY ; décision VERIFY → VERIFIED ; décision PUBLISH séparée → insertion dans les tables existantes. Aucune mutation directe des tables de staging/journal n’est accordée aux clients. Source, date, précision et identifiant d’import accompagnent la ligne métier dans `import_provenance` ; auteurs et motifs opérateurs restent privés dans le journal RLS.

Pour les dépendances, importer/publier d’abord le CA puis reprendre son identifiant dans `ca_id` ; publier l’opération puis reprendre son identifiant dans `operation_id`. Institution et exercice doivent correspondre exactement. Un BP ne devient jamais un CA automatiquement. Un lien DGMP nécessite `STRONG`, une opération publiée compatible et une preuve de rapprochement relue (`match_evidence`). PARTIAL/NONE/TO_VERIFY restent privés. Le pipeline ne calcule aucun rapprochement automatique.

Un BP peut publier une précision connue homogène EXACT/APPROXIMATE/LOWER_BOUND. Une ventilation absente ou des précisions différentes restent en staging. Les écrans CA/opérations/DGMP actuels supposent des montants exacts : leurs montants qualifiés ou UNKNOWN sont conservés en staging, avec refus explicite de publication. Cette limite évite de présenter un montant incertain comme exact. Les champs monétaires obligatoires doivent être sourcés avant publication ; les autres restent NULL, y compris les anciens champs dont le défaut SQL était zéro.

Une identité déjà importée à contenu identique est ignorée ; un contenu différent produit un conflit sans remplacement. Les doublons contradictoires dans le même lot sont refusés indépendamment de l’ordre. Les données canoniques déjà présentes produisent également un conflit, même si leurs anciens identifiants diffèrent. Pas de remplacement automatique ni de correction d’une version immuable : les conflits demandent une décision de révision dédiée, hors de ce pipeline initial. REJECT conserve le contenu et le motif ; il ne libère pas l’identité pour un écrasement.

Les validations humaines ne prouvent ni réalisation physique ni représentativité. Publication et vérification restent distinctes ; BP, CA, APEC, Passport et preuves gardent leurs règles existantes.

## Validation reproductible

`npm test -- src/utils/__tests__/dataImport.test.ts` exerce les pilotes du dépôt : Abobo (CA), Bingerville (BP), Tiassalé (CA/opération/DGMP), Cocody (total BP et ventilation inconnue à cause des réserves de source déjà documentées). Les fixtures restent exclusivement dans PostgreSQL local de test. Les dates d’enregistrement existantes sont étiquetées RECORDED. Aucun import réel ni publication de ces fixtures n’est lancé par le script de test.

`node scripts/verify-foundation-http.mjs data-import` vérifie les refus anonymes sur les deux tables privées et les deux RPC, sans créer de donnée. Les migrations APPLIED ne doivent jamais être rejouées.
