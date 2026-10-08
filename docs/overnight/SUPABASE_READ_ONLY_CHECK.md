# Vérification Supabase en lecture seule — 7 octobre 2026

Projet ciblé par `VITE_SUPABASE_URL` : projet autorisé `cdesuvcozcetdtvibgqs`. Les observations de l'environnement indiquent les variables URL et anon `ready`; aucune valeur n'a été affichée.

Le script [verify-supabase-readonly.mjs](../../scripts/verify-supabase-readonly.mjs) initialise `@supabase/supabase-js` avec persistance, rafraîchissement de token et détection de session désactivés. Son transport refuse toute méthode autre que `GET` et `HEAD`. Les seules requêtes prévues sélectionnent au plus un `id` depuis `institutions`, `public_documents` et `local_budgets` publié.

Résultat courant : **BLOCKED**. Les trois lectures ont échoué sans statut HTTP exploitable dans le client. Le contrôle REST GET indépendant vers `/rest/v1/` a répondu `401` avec le message générique `Invalid API key`. La variable est prête au niveau de l'environnement, mais l'autorisation distante réelle n'est donc pas établie.

Aucune tentative `INSERT`, `UPDATE`, `DELETE`, RPC, Storage, Auth, migration ou seed. Aucun `service_role`. Aucun contenu de table lu ou affiché.

```text
CLIENT_INITIALIZED=TRUE
CREDENTIAL=ANON
ALLOWED_HTTP_METHODS=GET,HEAD
LIMIT_PER_TABLE=1
READ_VALIDATION=BLOCKED_INVALID_API_KEY
REMOTE_SUPABASE_WRITES=0
```
