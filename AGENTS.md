# SuiviBudget Côte d’Ivoire — Charte & Règles Agents

Plateforme Civic Tech React 18, TypeScript, Vite, Tailwind CSS et Supabase. Préserver l’existant ; aucune réécriture arbitraire.

## 1. Goal Permanent
Construire l'infrastructure civique de référence permettant aux citoyens ivoiriens de comprendre comment les besoins de leur territoire deviennent des programmes, des budgets, des marchés et des réalisations ; d'en suivre l'exécution à partir de sources vérifiables ; de contribuer au processus public ; de documenter factuellement le terrain ; d'accéder aux informations publiques et d'obtenir la trace des réponses institutionnelles.
Cycle cible : BESOIN → PARTICIPATION → DÉCISION → PROGRAMMATION → BUDGET → COMMANDE PUBLIQUE → EXÉCUTION FINANCIÈRE → RÉALISATION PHYSIQUE → PREUVE → REDDITION → RÉPONSE INSTITUTIONNELLE → ÉVALUATION.

### Extension UX/UI & Responsive (Inclus dans la Definition of Done)
- Expérience de niveau professionnel, moderne, accessible (viser WCAG AA) et performante sur smartphone (360, 375, 390, 430 px), tablette et desktop (1280, 1440, 1920 px).
- Priorité à la compréhension citoyenne en moins de 10 secondes, y compris en connexion limitée.
- Progressive disclosure : Niveau 1 (Comprendre en <10s : combien, pourquoi, qui, état), Niveau 2 (Explorer : secteurs, marchés, historique), Niveau 3 (Vérifier : document officiel, page, source, open data).
- Tableaux responsive : cartes/lignes expansibles sur smartphone, jamais de tableau miniature illisible.
- Graphiques utiles : unité FCFA, année, légende claire, source officielle explicite, non purement décoratifs.
- Validation visuelle réelle obligatoire (navigateur/Playwright/inspection multi-viewports) avant de déclarer une page UX/UI VALIDATED.

## 2. Périmètre Immédiat
- 201 communes + 31 conseils régionaux = 232 collectivités territoriales.
- Les 2 districts autonomes (Abidjan, Yamoussoukro) restent séparés hors de ce compteur.
- Focus produit : `COMMUNE` et `REGIONAL_COUNCIL`. Architecture extensible générique (`institution_id`, `institution_type`) pour accueillir les ministères ultérieurement sans surcharger l'UX actuelle.

## 3. Les 16 Principes Non Négociables
1. **Understanding before data dump** : Transformer les données en compréhension citoyenne claire ; ne pas être une simple liseuse de PDF.
2. **Provenance by default** : Toute donnée clé remonte à sa source (document, page, libellé). Séparer `OFFICIAL_SOURCE`, `SUIVIBUDGET_CALCULATION`, `CITIZEN_OBSERVATION`, `INSTITUTION_RESPONSE`.
3. **Complete accountability cycle** : Couvrir le cycle complet du besoin initial jusqu'à la reddition de comptes et l'évaluation.
4. **No participation black hole** : Toute contribution citoyenne possède un ID, un statut, un historique et un devenir observable.
5. **Participation is not representativeness** : Ne jamais présenter les utilisateurs comme représentatifs de l'ensemble de la population.
6. **Digital + field** : Conjuguer web, associations locales, APEC, quartiers, villages, médias et institutions.
7. **Financial != Physical** : Une dépense financière (`financial_status`) ne prouve jamais une réalisation physique (`physical_status`).
8. **Right of reply** : Garantir le droit de réponse institutionnel sans le confondre avec une validation citoyenne indépendante.
9. **Absence of data != data of absence** : Utiliser `NOT_FOUND_PUBLICLY` ; ne jamais déduire l'inexistence d'un document ou d'une dotation de son absence temporaire sur la plateforme.
10. **Project Accountability Passport** : Relier besoin, budget, marché, attributaire, exécution, preuve terrain, CA et documents sources.
11. **Political neutrality** : Neutralité absolue. Aucun classement partisan (« meilleur maire », « pire commune ») ; présenter des faits sourcés.
12. **Budget calendar drives participation** : Aligner la participation citoyenne sur le calendrier budgétaire réel pour un impact concret.
13. **Information must enable action** : L'information doit permettre de comprendre, voir la source, suivre, contribuer, documenter ou interpeller (CAIDP).
14. **Close the feedback loop** : Mesurer le traitement effectif des contributions, pas seulement le volume d'envois.
15. **Impact > traffic** : Priorité aux documents obtenus, marchés rapprochés, preuves vérifiées et boucles d'action citoyennes fermées.
16. **Extensible architecture, focused product** : Architecture ouverte aux évolutions institutionnelles, produit centré sur les 232 collectivités territoriales.

## 4. Sécurité, RLS, Storage et Données
- **Seul projet Supabase autorisé** : `cdesuvcozcetdtvibgqs` (eu-west-1). Ne jamais toucher à aucun autre projet Supabase ni déployer sur Vercel Civic Signal.
- **Authentification & RLS autoritaire** : Supabase Auth + profils protégés (`profiles.role` : `ADMIN`, `DATA_MANAGER`, `MODERATOR`). Aucun rôle ne dépend de `user_metadata` ni du client. RLS PostgreSQL est la source de vérité absolue.
- **Stockage privé** : Buckets `public_documents` et `citizen_photos` privés. Accès via Edge Functions (`public-document-url`, `citizen-proof-media-url`) avec signature temporaire. Seuls les documents `PUBLISHED` et preuves citoyennes `APPROVED` sont consultables publiquement.
- **Immutabilité des sources** : Téléversement sans écrasement (`upsert: false`), SHA-256 obligatoire, versions conservées (`previous_versions`).
- **Garde-fous Données** : Aucun faux CA, aucune donnée inventée. `BP` (prévision) != `CA` (exécution). Distinguer les mesures : PLANNED, EMITTED, COLLECTED, ENGAGED, ORDERED, PAID, REALIZED, BALANCE.
- **Workflow découplé** : `VERIFIED` (vérification humaine) != `PUBLISHED` (diffusion publique). L'OCR ou l'IA produit du `TO_VERIFY`, jamais une publication automatique.

## 5. Mémoire Multi-Agents & Conventions d'Ingénierie
- **Source de vérité** : L'état réel du code GitHub, de la base Supabase autorisée et des tests gagne toujours sur la documentation écrite.
- **Continuité fluide Codex ↔ Antigravity** : 
  - `AGENTS.md` : Règles fondamentales et durables (ce document).
  - `docs/AGENT_HANDOFF.md` : Checkpoint opérationnel obligatoire après chaque bloc (statuts stricts, migrations, tests, UX/UI audit status page par page, `NEXT_EXECUTABLE_TASK` explicite).
  - `docs/CODEX_CHECKPOINT.md` : Historique technique chronologique.
- **Qualité & Git** : Tests unitaires et `npm run build` obligatoires avant commit. Commits atomiques nouveaux, jamais de force-push sur master.
