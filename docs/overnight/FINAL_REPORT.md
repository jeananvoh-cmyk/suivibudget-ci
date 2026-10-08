# État indépendant des LOTS 5 à 15 — 8 octobre 2026

La branche `antigravity/reconcile-lots6-15-post-lot5` contient la correction documentaire complète du LOT 5, les architectures en lecture seule des LOTS 6 à 15, et la sécurisation financière granulaire par matching d'audit formel.

## Résolution définitive des réserves d'audit indépendant
1. **Séparation stricte des statuts documentaires et d'extraction** :
   - Disponibilité réseau/locale (`availability`).
   - Authenticité et provenance républicaine (`provenance`).
   - Vérification d'audit de l'extraction financière (`extractionStatus`).
   - Résolution de citation exacte (`resolveCitation`).
   - Règle fondamentale : Un document disponible (HTTP 200, PDF présent) n'entraîne JAMAIS automatiquement la vérification d'un montant extrait.
2. **Contrôle financier granulaire étanche (`matchFinancialAudit`)** :
   - Règle d'or : *Un document officiel vérifié ne signifie pas que tous les montants contenus dans ce document sont vérifiés.*
   - Une observation financière candidate n'est publiable que si elle concorde exactement avec un enregistrement d'audit formellement vérifié (`FinancialAuditRecord`) sur toutes ses dimensions : exercice budgétaire, institution, section ministérielle, granularité de périmètre (scope), mesure financière, base budgétaire, devise (XOF), montant exact (y compris 0 FCFA documenté), identifiant documentaire, hash SHA-256 et page PDF.
   - Étanchéité hiérarchique absolue : un contrôle d'agrégat (`SECTION_TOTAL`, `PROGRAM_`) ne valide JAMAIS une ligne détaillée (`PROGRAM_`, `ACTION_`) sans audit explicite (`AGGREGATE_CANNOT_VALIDATE_PROGRAM`, `AGGREGATE_CANNOT_VALIDATE_ACTION`).
   - Refus catégorique des contrôles portant le statut `SOURCE_CONFLICT` ou `TO_VERIFY`.
3. **Architecture et portée du chemin de publication** :
   - `PUBLICATION_PATH_CONNECTED: REVIEW_DOMAIN_ONLY`.
   - La fonction `canPublishOfficialObservation` appartient strictement au domaine de revue (`src/review/domain/`) et n'est pas branchée aux composants runtime de production de la plateforme (`src/pages`, `src/components`).
4. **Transport Supabase en lecture seule hermétique** :
   - Transport `guardedFetch` interdisant toute méthode non-GET/HEAD de façon synchrone avant le réseau, avec fallback sécurisé `.env`, clé `anon`, aucun accès privilégié et 0 écriture distante (`REMOTE_SUPABASE_WRITES = 0`).

| Lot | Statut indépendant | Preuve acquise | Blocage restant |
|---:|---|---|---|
| 5 | VALIDATED | LFI et DPPD-PAP, 25 programmes, 66 actions, contrôles PDF et arithmétiques, audits formels | Aucun pour le périmètre documentaire LOT5 ; publication toujours séparée |
| 6 | PARTIAL | Contrats d'exécution/performance et tests | Exécution 2026, LFR/loi de règlement/RAP correspondant |
| 7 | PARTIAL | Sélection de version, ID obligatoire, BP/CA séparés | Originaux BP, modificatifs et CA des collectivités |
| 8 | PARTIAL | Catalogue public à liste blanche, deux PDF 2026 accessibles, statuts orthogonaux vérifiés, matching financier granulaire | Sources futures ; URL du RAP 2022 actuellement en 404 |
| 9 | PARTIAL | Liens projet-budget sans agrégation | Fiches de projets et pièces DGMP officielles |
| 10 | PARTIAL | Projection publique, dates ISO calendaires, confidentialité | Contributions publiques modérées réelles |
| 11 | PARTIAL | Réponses et audits séparés par provenance | Réponses et rapports de contrôle officiels |
| 12 | PARTIAL | NOT_COMPARABLE préservé, exports null | Sources multi-exercices et preuve d'équivalence |
| 13 | PARTIAL | Composants accessibles et audit technique | Référence WCAG inaccessible, audit global et technologies d'assistance |
| 14 | PARTIAL | Candidat local, workspace isolé de revue | Refonte de toutes les pages historiques et données réelles |
| 15 | READY_FOR_INDEPENDENT_REVIEW | 529 tests (100% PASS), production build et review build PASS, garde-fous transport, audit financier granulaire étanche, suite adversariale 41 cas, et rendu visuel vérifié | Sources métier LOTS 6-12 non encore publiées par l'État |

## Diagnostic de cause racine (Questions 1 à 7)

- **Q1 (Document vs Extraction vs Observation)** : Un document est un PDF source authentifié. Une extraction est l'ensemble de données textuelles/tabulaires extraites du document. Une observation officielle est une assertion financière précise dont toutes les dimensions concordent avec un contrôle d'audit vérifié.
- **Q2 (Données réelles LOT 5)** : Les montants vérifiés sont adossés à `LOT5_INDEPENDENT_LFI_CONTROLS.json` et `independentDocumentaryGolden.ts` (LFI 2026 Tableau récapitulatif pp. 45–54 et DPPD-PAP Annexe 4 Tableau 7).
- **Q3 (Granularité d'audit)** : Les contrôles existent à plusieurs niveaux étanches (totaux de section, programmes, actions). Un audit de niveau supérieur ne valide pas les lignes sous-jacentes.
- **Q4 & Q5 (Démonstration de périmètre)** : Auparavant, `canPublishOfficialObservation` ne vérifiait que `extractionStatus` au niveau document. Le matching multidimensionnel (`matchFinancialAudit`) comble cette faille.
- **Q6 (Connectivité du chemin de publication)** : `PUBLICATION_PATH_CONNECTED: REVIEW_DOMAIN_ONLY`.
- **Q7 (Prévention du contournement)** : Les assertions sont vérifiées contre un registre cryptographiquement validé (SHA-256) ; aucune métadonnée déclarative non adossée à un audit vérifié ne peut forcer la publication.

## Corrections ciblées finales (PR #29)
1. **Élimination de `.find()` & traitement des audits contradictoires** : Analyse de tous les audits applicables, rejet déterministe de divergences de montants (`CONTRADICTORY_AUDIT_AMOUNTS`), de pages (`CONTRADICTORY_AUDIT_PAGES`), d'enregistrements multiples (`CONTRADICTORY_AUDIT_RECORDS`) ou de statuts (`SOURCE_CONFLICT`, `TO_VERIFY`).
2. **Page documentaire obligatoire** : Présence de page obligatoire si audit paginé (`PAGE_REQUIRED` si absente, `PAGE_MISMATCH` si discordante). Contrôle par référence explicite de tableau (`tableRef`) si audit non paginé.
3. **Cohérence structurelle des codes & formats obligatoires** : Rattachement obligatoire de l'action à son programme (`actionCode.startsWith(programCode)`), formats stricts (5 chiffres pour programmes, 7 pour actions), cohérence entre code et scope textuel, exclusion de code d'action pour un total de section.
4. **Correspondance exacte avec le référentiel LOT5** : `verifyAuditRecordAgainstReferential` intégré dans `matchFinancialAudit` avec détection des revendications LOT5 via `isLot5ReferentialClaim`. Validation de la ligne exacte (section, programme, action, montant exact, devise XOF, doc ID, hash SHA-256, page PDF). Rejet strict des audits fabriqués ou discordants.
5. **Suite de tests adversariaux portée à 41 tests** : `src/review/__tests__/financialEvidenceHardening.test.ts` enrichi des 16 scénarios de conformité stricts Phase 4 (S1 à S16).

## Contrôles exécutés

- Suite complète : 34 fichiers, 529 tests réussis, zéro échec (100% PASS).
- Suite adversariale dédiée (`src/review/__tests__/financialEvidenceHardening.test.ts`) : 41 tests couvrant l'ensemble des scénarios prescrits.
- Types TypeScript : `tsc --noEmit` PASS (0 erreur).
- Build production (`npm run build`) : PASS.
- Build de revue séparé (`npm run build:review`) : PASS.
- Contrôle de transport Supabase (`guardedFetch`) : PASS (`npm run verify:supabase:read-only`, `remoteSupabaseWrites: 0`).
- Navigateur Chromium : PASS (audit sur `http://127.0.0.1:5174/review.html` : 0 erreur console critique, rendu fidèle des indisponibilités et preuves).
- Données protégées et migrations : strictement inchangées.

```text
MASTER_MODIFIED=FALSE
MERGE_PERFORMED=FALSE
REMOTE_SUPABASE_WRITES=0
PUBLICATION_PATH_CONNECTED=REVIEW_DOMAIN_ONLY
FINAL_STATUS=READY_FOR_INDEPENDENT_REVIEW
```
