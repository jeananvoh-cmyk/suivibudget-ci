# Déploiement et recette de la correction

## État de livraison

Cette branche modifie le contrat entre le frontend et Supabase. Ne pas la fusionner dans une branche automatiquement déployée par Vercel avant d'avoir préparé et recetté le backend correspondant. Aucun projet Supabase distant n'a été identifié avec certitude comme étant celui de cette application ; aucune migration distante n'a été exécutée.

Le catalogue versionné reste disponible hors backend. Les nouveaux envois et modifications nécessitent les objets `civic_*`. Les sauvegardes globales du navigateur ne constituent plus une restauration serveur : les anciennes commandes de restauration/remise à zéro sont désactivées avec une erreur explicite.

## 1. Inventorier et sauvegarder

1. Identifier le projet réellement référencé par `VITE_SUPABASE_URL` dans Vercel, sans exposer de clé privée. Relever les migrations déjà appliquées.
2. Sauvegarder la base, les utilisateurs Auth et les objets Storage selon la procédure d'exploitation. Tester la restauration sur un projet isolé.
3. Inventorier les lignes des anciennes tables (`profiles`, projets, institutions, preuves, articles, documents, paramètres, annuaire, abonnements et événements) ainsi que le bucket `citizen_photos`.

La migration `20260911184041_civic_security_reliability.sql` est transactionnelle et **s'arrête avant toute modification si ces tables ou ce bucket contiennent des données**. Ce garde-fou évite qu'un changement de modèle rende silencieusement les données existantes invisibles. Ne pas retirer ce contrôle ni vider les tables de production pour le contourner.

Pour une installation existante, préparer une migration spécifique revue à partir de son schéma réel : conserver les originaux dans une archive protégée, convertir les données publiques vers `civic_content` avec les mêmes identifiants, affecter les propriétaires Auth réels des preuves, copier et vérifier les médias privés, préserver dates et décisions, transférer les abonnements et comparer les décomptes. Ne pas inventer de propriétaires ou republier automatiquement d'anciennes preuves. Cette conversion dépend de données auxquelles cette intervention n'a pas eu accès.

Les scripts `supabase/schema.sql` et `supabase_schema.sql` restent uniquement pour référence historique. Ne pas les exécuter seuls ; ils contiennent d'anciennes politiques remplacées par la nouvelle migration. Ne pas modifier une migration déjà appliquée.

## 2. Préparer un environnement de recette

- Utiliser un projet isolé vide pour la première recette du nouveau contrat. Examiner le SQL des migrations avant application ; utiliser le mécanisme habituel Supabase de migrations, en commençant par une simulation (`supabase db push --dry-run`) sur le projet identifié.
- Configurer le frontend avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` publics. Une clé `service_role` ou `sb_secret_…` ne doit jamais figurer dans une variable `VITE_*`, un commit ou un bundle.
- Activer les connexions anonymes Supabase Auth pour les dépôts citoyens. Configurer des limites Auth adaptées. La protection CAPTCHA exige également son intégration au formulaire ; elle n'est pas incluse dans cette branche et doit être testée avant activation obligatoire.
- Créer le premier administrateur par un canal serveur de confiance, avec `app_metadata.role = ADMIN`. Les rôles dans `user_metadata` et `profiles` ne donnent aucun droit. Les comptes anonymes sont exclus des rôles d'équipe.
- Déployer la fonction Edge `staff-admin` dans le même projet. Elle utilise les variables serveur Supabase et une variable `ALLOWED_ORIGINS` contenant uniquement les origines exactes autorisées, séparées par des virgules. Ajouter explicitement l'origine de recette et celle de production ; aucune origine générique n'est autorisée.
- La fonction vérifie elle-même le jeton et le rôle administrateur avec Auth. Vérifier également la configuration de validation JWT de la passerelle Edge pour le type de clés du projet. Ne pas exposer la clé serveur au frontend.
- Le bucket `civic-evidence` est privé, limité à 25 Mo par fichier et aux types JPEG/MP4/WebM/QuickTime. Les nouvelles photos sont réencodées en JPEG. Une validation MIME n'est pas une analyse antivirus.

## 3. Vérifier avant fusion

```sh
npm ci --ignore-scripts
npm test
npm run build
```

Le workflow `.github/workflows/ci.yml` exécute ces contrôles sans secret de production. Rendre ce contrôle obligatoire dans les règles de branche selon les accès de l'équipe.

Recette sur le backend isolé, avec comptes administrateur, modérateur, gestionnaire de données et citoyen :

1. Vérifier lecture du catalogue, recherche, ouverture de fiche, absence de faux détail sur une institution sans lignes et navigation mobile/clavier.
2. Refuser une connexion administrateur avec un citoyen ou un rôle falsifié côté navigateur. Retirer un rôle serveur et vérifier qu'un ancien jeton ne permet plus une écriture.
3. Créer et modifier une fiche, la relire dans un autre navigateur. Provoquer un conflit entre deux éditions : le second enregistrement doit être refusé.
4. Déposer une photo et une vidéo, puis les lire dans le compte de modération. Avant approbation, un autre citoyen ne doit voir ni la preuve ni le fichier. Après approbation, la preuve devient publique ; après rejet, elle disparaît. Un ancien lien signé expire au plus tard après cinq minutes.
5. Couper le réseau pendant un envoi et une modification : aucun succès fictif. Réessayer un même signalement : un seul accusé et une seule ligne. Le brouillon textuel reste disponible ; les pièces jointes doivent être resélectionnées après fermeture.
6. Vérifier que le gestionnaire de données ne peut ni modérer ni changer les paramètres globaux. Vérifier création, suspension et retrait de droits d'un modérateur via la fonction Edge. Le retrait des droits ne supprime pas l'utilisateur Auth ni les archives.
7. Vérifier la confidentialité des abonnements, le rejet d'un import invalide sans écriture partielle et l'ouverture d'un courriel CAIDP présentée comme une préparation. Les statistiques CAIDP sont limitées à la session du navigateur, pas des mesures nationales d'envoi.
8. Vérifier console, logs Auth/Edge et erreurs réseau ; enregistrer les résultats et les versions testées dans la PR.

## 4. Passage en production et retour arrière

Planifier la bascule frontend/backend ensemble, après validation de la conversion des données historiques. Conserver la version précédente et les sauvegardes vérifiées. Si la nouvelle version échoue, bloquer les écritures et diagnostiquer ; restaurer le frontend seul ne rétablit pas l'ancien contrat de données. Ne pas rouvrir les anciennes politiques permissives comme solution de retour arrière.

Les fichiers générés dans `public/data` sont reconstruits par `npm run build`. L'import CSV en ligne de commande écrit uniquement vers un nouveau chemin explicite :

```sh
npm run ingest:budget -- --input budget.csv --output budget-reviewed.json --year 2026
```

Colonnes obligatoires : `title;commune_name;region_name;budget_amount_fcfa;fiscal_year;source`. Examiner le résultat et les sources avant de remplacer un catalogue versionné. Les montants doivent être des entiers FCFA non négatifs ; le statut de réalisation importé est non renseigné.
