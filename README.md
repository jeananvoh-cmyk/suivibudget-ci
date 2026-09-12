# SuiviBudget Côte d'Ivoire

Application React / TypeScript / Vite de consultation des budgets et de remontée de constats citoyens.

```sh
npm ci --ignore-scripts
npm run dev
npm test
npm run build
```

`predev` et `prebuild` valident les catalogues et génèrent les fichiers de données dans `public/data` (non versionnés). Les lignes budgétaires sont chargées à la demande par institution ; les rapprochements ambigus sont exclus. Le catalogue de projets reste chargé au démarrage.

Sans configuration Supabase, le catalogue reste consultable. Les opérations partagées sont indisponibles et affichent une erreur ; aucune connexion administrateur locale ni confirmation d'envoi fictive n'est proposée.

- [Constats de l'audit et limites vérifiées](SECURITY_REPORT.md)
- [Migration, configuration et recette avant production](docs/DEPLOYMENT.md)

Les fichiers `supabase/schema.sql` et `supabase_schema.sql` sont des archives historiques, pas des scripts de déploiement. Utiliser les migrations avec la procédure ci-dessus.
