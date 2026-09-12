# Audit technique et civic tech — septembre 2026

Périmètre : revue du dépôt, corrections applicatives, tests locaux. Ce rapport remplace le précédent document, dont les affirmations « A+ », « 100 % sécurisé » et « RLS déployée » n'étaient pas démontrées. Il ne certifie ni l'infrastructure en production ni la véracité de chaque montant budgétaire.

## Points forts

- Couverture territoriale et catalogue budgétaire conséquents, recherche et fiches détaillées.
- Parcours citoyen utile : constats terrain, modération et préparation de demandes d'accès à l'information.
- Base TypeScript, validation des liens et protection des exports CSV déjà présentes.
- Traitement des photos par réencodage et premiers en-têtes de sécurité existants.

## Faiblesses corrigées dans cette branche

| Constat | Correction |
| --- | --- |
| Identités et sessions administrateur simulées dans le navigateur | Supabase Auth vérifie l'identité ; seuls les rôles serveur `app_metadata` sont acceptés. Aucun compte de secours local. |
| Rôles modifiables via profils ou métadonnées utilisateur | Nouvelles politiques PostgreSQL fondées sur le rôle courant dans `auth.users`, avec contrôle de suspension ; anciens droits client révoqués après le contrôle de migration. |
| Modifications locales présentées comme enregistrées | Écritures serveur attendues, erreurs explicites et contrôle de révision contre l'écrasement concurrent. Imports validés et transactionnels. |
| Signalements et vidéos sans preuve de persistance | Téléversement privé réel, accusé serveur, requêtes idempotentes, statut initial imposé en base, validation des propriétaires et quota par compte. |
| Données de démonstration et compteurs donnant une impression d'impact réel | Statistiques fondées sur les constats approuvés hors démonstration ; préparation de courriel clairement distinguée de l'envoi ; compteurs de téléchargement fictifs supprimés. |
| Répartitions budgétaires de secours inventées | Aucun montant généré lorsqu'une institution n'a pas de correspondance exacte. Chargement à la demande des lignes existantes. |
| Statut de réalisation supposé à partir du budget | Statut « non renseigné », distinction du budget voté, champs de provenance et réponse de l'institution. |
| Absence de contrôle automatisé reproductible | Tests unitaires et PostgreSQL/PGlite, build TypeScript/Vite et workflow GitHub Actions. |

## Vérifications et limites

Les 53 tests locaux et le build TypeScript/Vite passent. Le contrôle de types de la fonction Edge passe également dans GitHub Actions. La suite couvre les refus d'élévation de privilèges, la révocation d'un rôle malgré un ancien JWT, l'isolation des médias en attente, la modération, les confirmations dédupliquées, la confidentialité des abonnements, le retour arrière transactionnel, les imports et les erreurs de persistance. Un test vérifie que la migration refuse une installation contenant des données historiques sans les modifier.

Le build local produit 7 162 projets. Le manifeste des lignes comporte 1 326 clés exactes ; 9 clés ambiguës sont volontairement écartées. Ce contrôle porte sur la structure des données, pas sur leur correspondance aux documents officiels. Les publications référencées ne deviennent pas « officielles » ou « vérifiées » automatiquement.

La vérification navigateur automatisée n'a pas pu aboutir : démarrage du pilote impossible puis téléchargement de Chromium en échec. Les migrations n'ont pas été appliquées à une base distante et la fonction Edge n'a pas été déployée. Une recette réelle reste obligatoire avant fusion et production, selon [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Améliorations restant à valider sur l'exploitation réelle

- Relier chaque montant à un document source, une page et une version ; faire relire les imports et les statuts par un responsable éditorial.
- Recetter clavier, lecteur d'écran, mobile et réseau lent. Mesurer les performances réelles ; le catalogue complet est encore téléchargé au démarrage.
- Configurer les limites Auth, la protection contre les robots et la surveillance. Le quota de cinq signalements par heure est par compte ; une nouvelle identité anonyme peut le contourner.
- Définir durée de conservation, suppression des médias orphelins, consentement, traitement des contestations et procédure de retrait. Les vidéos ne bénéficient pas d'un nettoyage de métadonnées côté serveur ni d'une analyse antivirus.
- Vérifier sauvegardes/restauration, journaux d'accès et alertes. Un lien signé déjà émis peut rester utilisable jusqu'à cinq minutes après un retrait.
- Formaliser une politique de contribution, une licence pour les données et un processus de correction contradictoire avec les institutions.
