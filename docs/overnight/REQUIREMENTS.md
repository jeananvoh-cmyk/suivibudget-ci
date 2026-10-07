# LOTS 6 à 15 — périmètre technique autorisé le 7 octobre 2026

La nouvelle autorisation permet de continuer malgré le LOT 5 BLOCKED. Aucun déploiement, aucune fusion, aucune écriture distante. La branche de travail est `overnight/lots-5-15`. Tous les composants sont préparés pour revue locale, sans raccordement automatique aux services distants ni changement des données protégées.

| Lot | Exigence relue / livrable technique | Documents nécessaires aux données réelles | Limite documentaire |
|---|---|---|---|
| 6 | Exécution et performance : mesures distinctes, crédits définitifs, dates et périmètres compatibles | LFI, LFR, RAP, lois de règlement pour chaque exercice retenu | LFI/DPPD 2026 disponibles ; aucune exécution 2026 certifiée ; pas de taux déduit du PAP |
| 7 | Dossiers des collectivités : versions, BP distinct du CA, districts séparés | BP/actes modificatifs/CA officiels de chaque collectivité | Aucun nouveau document local primaire acquis ; les imports hérités ne valent pas source primaire |
| 8 | Catalogue Documents & Sources : empreintes, versions, citations, visibilité | Chaque document primaire cité | Deux PDF DGBF disponibles ; une référence seule ne devient pas VERIFIED |
| 9 | Projets et infrastructures : liens explicites, aucune addition budget+projet | Documents de projets, registres DGMP et actes d'attribution | Aucun nouveau projet ou marché certifié |
| 10 | Suivi citoyen : état et historique liés à une entité documentée | Sources des budgets/projets et contributions publiques modérées | Pas de contribution fabriquée ni copie d'une donnée privée |
| 11 | Réponse institutionnelle et audit : distinction des provenances | Réponses officielles publiées, rapports des organes de contrôle | Aucune réponse ou conclusion d'audit fabriquée |
| 12 | Historique, comparaisons et exports : même périmètre, null conservé | Sources primaires de chacun des exercices comparés | Pas de série historique certifiée, aucune croissance fabriquée |
| 13 | Audit UX et composants du design system | WCAG 2.2 W3C, exigences locales AGENTS.md | Accès W3C refusé par proxy ; conformité WCAG non certifiée |
| 14 | Interface de revue des parcours Comprendre / Explorer / Vérifier | Documents du catalogue et résultats des LOTS 6–12 | Refonte candidate locale, données indisponibles signalées |
| 15 | Stabilisation et contrôles de livraison | Preuves de tests, build, audit navigateur, inventaires précédents | Préparation au contrôle indépendant ; aucune validation production |

## Règles de réalisation

Les fonctions de `src/review/domain/` sont pures. Elles consomment des entrées explicites sans importer `dataStore`, les services Supabase ou les jeux canoniques incomplets. Les contrats réutilisent les types de précision, de mesures financières et d'institutions existants. Le blocage des sections 334/336/444 et institutions gov-034/gov-017/gov-030 pour 2026 est explicite et prioritaire sur les anciens statuts VERIFIED.

Une trace de source exige un document et une page ou section, l'exercice et une vérification documentaire. Ce contrat suppose une vérification amont fiable ; ce n'est pas une autorisation de publication. Les exports et vues publiques exigent aussi des documents explicitement publics. Aucun rôle ou statut fourni par un client ne remplace Auth/RLS.

Chaque lot fait l'objet d'un rapport distinct. `PARTIAL` signifie que le périmètre technique indiqué est livré, avec des données, raccordements ou validations non réalisés clairement recensés. `READY_FOR_INDEPENDENT_REVIEW` final qualifie le travail soumis à revue, jamais les trois budgets bloqués ni un déploiement de production.

Les données numériques des tests sont des cas arithmétiques synthétiques identifiés `test-only`, exclusivement dans les tests. Elles ne sont ni des chiffres officiels, ni des substituts de données, ni des entrées de l'interface.
