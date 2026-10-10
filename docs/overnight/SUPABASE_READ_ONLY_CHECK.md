# Vérification Supabase en lecture seule — 7 octobre 2026

Projet ciblé par `VITE_SUPABASE_URL` : projet autorisé `cdesuvcozcetdtvibgqs`. Les observations de l'environnement indiquent les variables URL et anon `ready`; aucune valeur n'a été affichée.

Le script [verify-supabase-readonly.mjs](../../scripts/verify-supabase-readonly.mjs) initialise `@supabase/supabase-js` avec persistance, rafraîchissement de token et détection de session désactivés. Son transport `guardedFetch` refuse de façon synchrone toute méthode autre que `GET` et `HEAD` avant toute émission réseau. Les seules requêtes prévues sélectionnent au plus un `id` depuis `institutions`, `public_documents` et `local_budgets` publié.

### Périmètre et limites explicites du contrôle

1. **Périmètre d'application** : Le script contrôle uniquement et strictement ses propres requêtes via son wrapper de transport `guardedFetch`.
2. **Pas d'audit universel** : Il ne constitue pas un audit universel de tous les accès applicatifs ou externes à Supabase.
3. **Privilèges** : Aucun accès privilégié n'est utilisé (`service_role` strictement banni et absent ; clé anonyme `anon` uniquement).
4. **Zéro écriture distante** : Aucune écriture distante n'a été réalisée (`REMOTE_SUPABASE_WRITES = 0`). Aucun `INSERT`, `UPDATE`, `DELETE`, RPC, Storage, Auth, migration ou seed. Aucun contenu de table n'a été altéré, lu ou affiché.

Résultat courant : **BLOCKED**. Les trois lectures ont échoué sans statut HTTP exploitable dans le client. Le contrôle REST GET indépendant vers `/rest/v1/` a répondu `401` avec le message générique `Invalid API key`. La variable est prête au niveau de l'environnement, mais l'autorisation distante réelle n'est donc pas établie.

```text
CLIENT_INITIALIZED=TRUE
CREDENTIAL=ANON
ALLOWED_HTTP_METHODS=GET,HEAD
LIMIT_PER_TABLE=1
READ_VALIDATION=BLOCKED_INVALID_API_KEY
REMOTE_SUPABASE_WRITES=0
UNIVERSAL_AUDIT=FALSE
OWN_REQUESTS_ONLY=TRUE
SERVICE_ROLE_USED=FALSE
```

