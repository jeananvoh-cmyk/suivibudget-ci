# Correctifs pré-GO — 15 novembre 2026

## Portée et garde-fous

Branche corrective : `fix/pre-go-complete-20261115`, créée depuis le HEAD `320ae4c81396b6d25973848d8e6f0811965ff808` de la PR #77.

Aucune migration, écriture de données métier, modification de configuration Auth, fusion ou mise en production n'a été effectuée sur Supabase/Vercel Production. Les migrations décrites ci-dessous sont des propositions versionnées, à valider en CI et en revue avant application.

## Correctifs préparés dans cette branche

1. `src/services/pwnedPassword.ts` : contrôle HIBP Pwned Passwords via SHA-1 calculé dans le navigateur ; seul le préfixe de cinq caractères est transmis (k-anonymity), réponse protégée par Add-Padding, cache désactivé, aucune persistance du mot de passe ou du hash complet ; échec fermé si le service est indisponible.
2. `src/services/authSecurity.ts` : contrôle ajouté avant le changement du mot de passe administrateur.
3. `src/components/ApecParticipation.tsx` : contrôle ajouté avant la création d'un compte citoyen ; la connexion existante n'est pas bloquée par une vérification de nouveau mot de passe.
4. `20261116150000_move_staff_rpcs_to_private.sql` : déplace les huit implémentations `SECURITY DEFINER` signalées du schéma API `public` vers le schéma non exposé `private`. Les noms RPC publics sont conservés avec des wrappers `SECURITY INVOKER`. Les implémentations privées conservent leurs contrôles de rôle ; les droits EXECUTE sont explicitement limités à `authenticated`.
5. La même migration retire la politique publique `admin_entity_public` de `site_settings`, qui exposait toutes les colonnes, y compris `contact_email` et `settings_metadata`. La lecture staff reste portée par `admin_entity_staff`.
6. L'optimisation RLS `auth.uid()` → `(SELECT auth.uid())` sur `admin_receipt_read` est isolée dans la PR #76 (migration `20261116140000_optimize_admin_receipt_read_rls.sql`) pour éviter une migration en doublon. Les dix index FK signalés par Advisors sont différés : le triage read-only #76 a observé des tables de 0 à 1 ligne et n'a pas établi de bénéfice mesurable justifiant leur coût de maintenance. Aucun index FK additionnel n'est créé dans cette branche.
7. Tests ciblés ajoutés pour le contrôle HIBP et les wrappers RPC ; le test RLS ciblé est porté par la PR #76.

## Limite incontournable — protection des mots de passe compromis

La protection native Supabase Auth contre les mots de passe compromis est disponible uniquement sur Pro et supérieur selon la documentation officielle : https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Le contrôle HIBP gratuit ajouté ici est une défense en profondeur pour les deux parcours applicatifs effectivement recensés (création citoyenne APEC et changement du mot de passe administrateur). Il n'est **pas équivalent** à la protection native serveur : un appel direct à l'endpoint Supabase Auth qui contournerait l'interface pourrait éviter ce contrôle applicatif. Il ne contrôle pas rétroactivement les mots de passe existants.

L'API Pwned Passwords est gratuite et utilise le préfixe SHA-1 de cinq caractères avec comparaison locale : https://haveibeenpwned.com/api/v3#Pwned-Passwords. Aucun mot de passe ni hash complet n'est envoyé à HIBP.

**Décision :** ne pas prétendre que l'alerte `auth_leaked_password_protection` est fermée. Sans activation native côté Supabase (payante selon l'offre documentée), cette limite reste un risque résiduel explicite et un critère d'acceptation à arbitrer avant GO.

## Revue financière Cocody 2024 — données Production lues en lecture seule

- Compte administratif : `ca-cocody-2024`, statut `PUBLISHED`, vérification `VERIFIED`, réconciliation arithmétique `RECONCILED`, champ DB historique `arithmetic_difference = 0` FCFA (valeur calculée réelle Recettes − Dépenses = `+2 237 133 790` FCFA, corrigée côté affichage).
- Document catalogue : 44 pages physiques ; SHA-256 `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`, statut du checksum `COMPUTED`, pas `VERIFIED`.
- 57 opérations : prévision agrégée 3 900 630 000 FCFA ; exécution agrégée 1 366 100 690 FCFA ; pages source renseignées 41 à 43.
- 28 rapprochements DGMP : 9 `STRONG`, 19 `PARTIAL`. Leur somme contractuelle ne doit pas être assimilée au montant exécuté du CA.
- Une opération de bitumage de 2 950 mètres linéaires affiche 289 464 570 FCFA exécutés pour 250 000 000 FCFA prévus, soit 39 464 570 FCFA au-dessus du montant prévu. Ce dépassement n'est pas automatiquement une erreur ; il nécessite une pièce justificative / explication. Aucun montant n'a été modifié.
- Les 57 lignes n'attestent pas une réalisation physique certifiée.

Le hash actuel est seulement calculé sur le fichier stocké. L'original binaire n'a pas été comparé indépendamment au document officiel pendant cette passe. La page imprimée 24/45 manquante signalée dans l'historique doit rester visible comme lacune documentaire.

## Validations encore attendues

- CI complète sur le HEAD final de cette branche : tests ajoutés, TypeScript, build production et build review.
- Replay PGlite complet de toutes les migrations, dans leur ordre chronologique, sur le fixture Production.
- Contrôle des signatures et privilèges réels des wrappers après replay.
- Revue indépendante des migrations et du code par un autre mainteneur.
- Recette hébergée Supabase indépendante impossible actuellement sans plan payant ; PGlite ne la remplace pas.
- Preview Vercel du SHA exact : le quota Hobby avait empêché la Preview du HEAD #77 précédent ; aucune Preview de cette branche n'est revendiquée.
- Comparaison binaire du PDF Cocody avec un original officiel accessible et justification du dépassement d'opération.
- Arbitrage explicite du risque résiduel HIBP natif, non activable sur l'offre actuelle.

## Verdict

**NO-GO maintenu.** Ces commits préparent des corrections ; ils ne prouvent pas leur application sur Production. Ne pas fusionner, migrer ni déployer tant que les validations ci-dessus ne sont pas terminées et que le risque Auth résiduel n'est pas explicitement accepté ou éliminé.


## Complément de sécurité et résultat CI — 15 novembre 2026

- La migration `20261116150000_move_staff_rpcs_to_private.sql` retire aussi les politiques de lecture publique sans filtre des tables historiques `public.projects` et `public.sources`. Le contrôle SQL Production en lecture seule a confirmé 0 ligne dans chacune ; aucune lecture directe de ces tables n'a été trouvée dans le client courant. Les politiques de gestion staff restent présentes.
- Les cinq tables examinées (`projects`, `sources`, `site_settings`, `budget_sources`, `budget_revenue_sources`) étaient vides en Production au contrôle. Les deux dernières sont protégées par la migration #77 via le statut du parent ; les trois premières sont traitées par les migrations de cette branche.
- **CI #514 PASS** sur `0bea7d68b5d43b07a143cf74147083493728b980` : 75/75 fichiers de tests, 989/989 tests, `npm run build` PASS (11,14 s), `npm run build:review` PASS (1,12 s). Aucun échec de test, TypeScript ou build.
- Ce résultat CI prouve la cohérence du code et des fixtures PGlite ; il ne prouve pas l'application des migrations dans le projet Supabase hébergé.
- Vercel a publié un statut Preview Ready dans le fil de la PR #78. L'accès API Vercel de cette session n'a pas permis de confirmer indépendamment le SHA exact du déploiement ; cette Preview n'est donc pas utilisée comme preuve de release.
- Les alertes Supabase Production restent inchangées tant que les migrations ne sont pas appliquées. Aucun changement Production n'a été effectué.

**Verdict inchangé : NO-GO.** Les barrières Auth serveur, la revue indépendante, la recette Supabase hébergée et les preuves documentaires Cocody restent ouvertes.
