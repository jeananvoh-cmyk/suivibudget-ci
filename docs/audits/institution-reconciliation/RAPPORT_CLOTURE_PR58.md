# Clôture du verrou de certification — PR #58

## 13 octobre 2026 — Verrou de certification documentaire PR #58

- HEAD avant correction : `8e1b6e052292a30af40ebe690502081d709210ef`. Branche : `codex/budget-presentation-final` ; master : `ab159d4e3de829e11d1e146c8d9b0f9dbfb72bfe`.
- Revue traitée : https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58#issuecomment-6140460629.
- Avant : URL arbitraire, SHA-256 syntaxiquement valide, page et montants équilibrés suffisaient pour `VERIFIED_AMOUNT`. Après : document contrôlé ET ligne auditée indépendante obligatoires, avec concordance d'entité, exercice, assiette, nature, page et montants exacts.
- `isValidPrimarySha256` reconnaît uniquement les empreintes déjà contrôlées du catalogue. Cette reconnaissance ne certifie aucune ligne financière à elle seule.
- Preuves BP déclarées non auditées : `TO_VERIFY`. Publications secondaires : `SECONDARY_SOURCE`, même avec précision `EXACT`. Aucun BP primaire audité n'est actuellement autorisé ; aucune fixture fictive n'est promue en preuve primaire.
- Cas positif réel : LFI 2026, PDF p. 207, action 78016001400, Attécoubé, 300 000 000 FCFA de crédits votés pour le fonctionnement des services (transfert). Référence existante : `docs/audits/local-2026/LFI_2026_PROGRAMME_2204040_2380_ACTIONS.csv`, ligne 256. Ce montant n'est ni un BP, ni une DGF, ni une dépense exécutée. Le test réutilise la ligne déjà auditée ; aucune donnée de collectivité n'est modifiée ou importée.
- Les deux résolveurs choisissent le même BP pour le même exercice ; les montants historiques ne remplacent pas un BP absent. Les BP secondaires partiels restent rapportés, sans inventer une ventilation. Les districts suivent aussi l'assiette BP.
- Préservés : HABG/IGE inclus dans la section 103 ; CESEC LFI / Annexe 7 non additifs ; Cour Suprême sans section autonome ; sections ministérielles partagées ; historique Bingerville/Tiassalé ; BP Doropo/Iffou inconnus ; subventions des régulateurs distinctes du budget global. Métadonnées des cinq PDF DGBF contrôlés inchangées. Aucun nouvel audit PDF général.
- Validation locale : 58 fichiers, 767 tests dont 27 dans `budgetBreakdownIntegrityGate.test.ts` ; TypeScript, build public et build review vérifiés avant publication. Le contrôle GitHub du nouveau HEAD sera consigné dans la mise à jour de clôture.
- `REMOTE_SUPABASE_WRITES = 0` ; migrations = 0 ; `PR_MERGED = false` ; `PRODUCTION_DEPLOYED = false`. Dépendances, Tailwind, routes et accessibilité des modales inchangés.
- Limite documentaire conservée : absence de pièces BP primaires auditables ; seule leur certification reste bloquée. Les sources secondaires restent consultables.
- NEXT_EXECUTABLE_TASK : contrôler la CI du nouveau HEAD, puis soumettre la PR #58 à la validation humaine sans fusion ni déploiement.

### Contre-exemple désormais rejeté

Le test antérieur déclarait un BP fictif de 4 000 000 000 FCFA (1 600 000 000 + 2 400 000 000), avec l'URL `https://collectivites.gouv.ci/docs/delib-2026-01.pdf`, la page 12 et l'empreinte fictive `a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0`. Il attendait abusivement `VERIFIED_AMOUNT`. Il exige maintenant `TO_VERIFY` dans les deux résolveurs et dans l'export ; le total et sa précision restent distincts de la confiance documentaire. Même l'empreinte authentique de la LFI ne permet pas de certifier ce BP, ni une ventilation inventée ou une autre entité.

Les mutations de la preuve réelle d'Attécoubé (document, empreinte, montant, entité, exercice, assiette, nature, qualification DGF, page, identifiant d'audit ou source absente) sont toutes rejetées. Le faux concours Annexe 8 de Doropo, auparavant test positif sans ligne auditée, retrouve le libellé neutre « Montant historique enregistré — nature et source à confirmer ».

### Historique antérieur à cette correction

Le rapport ci-dessous décrit les travaux précédents. Ses règles fondées sur la seule présence d'un objet structuré, d'une page et d'une empreinte sont remplacées par le verrou document + ligne auditée décrit ci-dessus ; ses résultats de tests restent ceux de l'ancien HEAD.

# RAPPORT D'AUDIT ET DE CLÔTURE TECHNIQUE — PR #58

**Dépôt :** `jeananvoh-cmyk/suivibudget-ci`  
**Branche :** `codex/budget-presentation-final`  
**PR GitHub :** https://github.com/jeananvoh-cmyk/suivibudget-ci/pull/58  
**Base master :** `ab159d4e3de829e11d1e146c8d9b0f9dbfb72bfe`  
**Commit initial Codex :** `b276a4700ca546e33b4229681330c1373e781452`  
**Commit de correction et durcissement Antigravity :** `7d6a2204c34a06ea95d249f31525a81ca5bc88e1`  
**Date :** 12 octobre 2026  
**Auditeur :** Antigravity (Lead Developer Full-Stack & Auditeur Qualité Civic Tech)

---

## 1. Mandat & Contexte de la Reprise

Suite à l'atteinte du quota de Codex, Antigravity a pris le relais intégral pour :
1. Récupérer l'état local exact du travail de Codex dans le worktree local :
   `C:\Users\Couple ANVOH\Documents\Codex\2026-10-11\mission-codex-priorit-1-d-p\work\budget-presentation-final`.
2. Sauvegarder les modifications non commitées de Codex :
   - Accessibilité clavier de `src/components/InstitutionDetailModal.tsx` (listener touche `Escape`, fermeture au clic sur le backdrop, attributs `role="dialog"`, `aria-modal="true"`, `aria-label`).
3. Auditer l'intégrité financière et documentaire selon les exigences strictes de ChatGPT (Points A à F).
4. Corriger toute anomalie, notamment la règle critique d'intégrité budgétaire :
   - *Une égalité arithmétique (somme = 100%) ne constitue jamais à elle seule une preuve officielle de ventilation fonctionnement/investissement.*
5. Réaliser la recette visuelle en conditions réelles sur navigateur multi-viewports (390px, 768px, 1440px) sur les 10 entités institutionnelles cibles.
6. Ne réaliser aucune écriture distante Supabase (`REMOTE_SUPABASE_WRITES = 0`), aucune migration, aucun déploiement de production, et laisser la PR ouverte pour validation par ChatGPT (`MERGED = false`).

---

## 2. Synthèse des Contrôles et Corrections par Axe

### A — Intégrité des ventilations budgétaires & Provenance documentaire (Observations P1 #1 et P1 #2)
- **Constat de la revue ChatGPT** :
  1. **P1 #1 (Certification abusive des budgets primitifs)** : La logique précédente pouvait attribuer `VERIFIED_AMOUNT` dès lors que `precision === 'EXACT'`, qu'une `source_url` était renseignée et que `fonctionnement + investissement = total`, alors que `src/data/officialPrimitiveBudgets.ts` contient des publications secondaires (presse, articles).
  2. **P1 #2 (Raccourci booléen `has_verified_breakdown`)** : Un simple booléen déclaratif permettait de débloquer une ventilation sans preuve documentaire primaire vérifiable.
- **Corrections apportées (`src/types/index.ts`, `src/utils/institutionBudgetHelper.ts`)** :
  - Ajout du statut explicite `SECONDARY_SOURCE` à `InstitutionBudgetVerificationStatus`.
  - Séparation stricte entre :
    - **Précision numérique** (`EXACT`, `ROUNDED_MILLIONS`, etc.)
    - **Provenance documentaire** (`SECONDARY_SOURCE` vs `VERIFIED_AMOUNT`)
    - **Preuve primaire de ventilation** (`BreakdownDocumentaryEvidence` vérifiée par `isValidBreakdownDocumentaryEvidence`)
  - Suppression totale du raccourci booléen `has_verified_breakdown`. Une ventilation sur une assiette non-BP ou une certification primaire exige désormais une structure `BreakdownDocumentaryEvidence` valide comprenant : `institution_id`, `fiscal_year`, `basis`, `document_title`, `document_ref`, `source_url`, `pdf_page > 0`, `sha256` hexadécimal de 64 caractères, et égalité exacte `functioning_fcfa + investment_fcfa === total_fcfa`.
  - Un budget primitif rapporté par une source secondaire avec une ventilation équilibrée (ex: Bingerville, Agnéby-Tiassa) conserve l'affichage de ses montants et pourcentages mais demeure qualifié `SECONDARY_SOURCE` (*« Montant rapporté — à confirmer »*), jamais `VERIFIED_AMOUNT`.
- **Vérification par tests** :
  Suite `src/utils/__tests__/budgetBreakdownIntegrityGate.test.ts` enrichie à **11 tests** (100% PASS).

### B — Ministères (Pouvoir Exécutif)
- **Structure vérifiée** :
  - 35 portefeuilles ministériels rattachés à 34 sections de la Loi de Finances 2026.
  - Section partagée 229 : partagée entre `gov-009` (Ministère de l'Agriculture, du Développement Rural et des Productions Vivrières) et `gov-035` (Ministère Délégué chargé des Productions Vivrières).
  - La règle *"Section partagée : compter une seule fois"* est respectée à la fois dans les cartes et dans les fiches modales. Le budget de la section 229 (333 878 089 526 FCFA) n'est jamais additionné deux fois.
  - Programmes et actions LOLF (Annexe 4) préservés sans prétendre à un transfert de crédits non documenté.

### C — Grandes Institutions Nationales
- **Présidence de la République (`inst-presidence`)** :
  Section 103, 193 633 705 615 FCFA.
- **HABG (`inst-habg`)** :
  5 552 174 916 FCFA, programme 13004 inclus dans la section 103 (Présidence, PDF p. 45). Non additionné au total de la section 103.
- **IGE (`inst-ige`)** :
  9 872 577 575 FCFA, programme 13003 inclus dans la section 103 (Présidence, PDF p. 45). Non additionné au total de la section 103.
- **CESEC (`inst-cesec`)** :
  Section 105, 8 069 692 846 FCFA (LFI votée, PDF p. 45). Dotation directe Annexe 7 de 7 962 130 354 FCFA conservée en supplément non additif. Écart arithmétique de 107 562 492 FCFA noté (égal à la ligne « Abonnements ») avec mention explicite : aucune irrégularité induite, cause administrative non établie.
- **Cour Suprême (`inst-cour-supreme`)** :
  Aucun montant autonome dans la LFI (institutions judiciaires scindées en sections 114 Cassation, 118 Conseil d'État, 115 Cour des comptes). Affiche *"Non documenté"*, JAMAIS 0 FCFA.

### D — Collectivités Territoriales & Qualification des Montants Historiques (Observation P2 #3)
- **Constat de la revue ChatGPT** :
  Dans `resolveInstitutionBudgetPresentation`, tout montant résiduel de `institution.total_budget_fcfa` était qualifié par défaut de *« Concours de l'État »* avec provenance `OFFICIAL_SOURCE` / `VERIFIED`, alors que son origine documentaire (DGE, DGF, quote-part ou donnée historique) n'était pas systématiquement prouvée.
- **Correction apportée (`src/utils/institutionBudgetHelper.ts`)** :
  - Le libellé *« Concours de l'État »* (`OFFICIAL_SOURCE` / `VERIFIED`) est désormais strictement réservé aux cas disposant d'une preuve documentaire explicite `state_grant_evidence` (`document_title`, `document_ref`, `source_url`, `pdf_page > 0`, `sha256` 64 hex).
  - En l'absence de `state_grant_evidence`, le montant complémentaire est libellé de façon neutre : *« Montant historique enregistré — nature et source à confirmer »* (`verification_status: 'TO_VERIFY'`, `source_type: 'OFFICIAL_SOURCE'`), avec mention explicative interdisant de le confondre avec le Budget Primitif ou un concours certifié de l'État.
  - Pour les collectivités sans BP 2026 dans `OFFICIAL_PRIMITIVE_BUDGETS` (ex: Tiassalé, Doropo, Iffou), `reference.amount_fcfa` reste à `null` (*« Non documenté »*) et le montant historique ne remplace jamais le Budget Primitif.

### E — Autorités & Régulateurs et Périmètre Officiel Annexe 6 ASS / LFI 2026 (Observation P2 #4)
- **Constat de la revue ChatGPT** :
  Les régulateurs doivent conserver `reference.amount_fcfa: null` en l'absence de budget global officiel de l'entité, tout en restituant fidèlement ce que les documents officiels du dépôt (Annexe 6 ASS 2026, LFI 2026) établissent réellement sur leurs ressources affectées ou subventions partielles, sans élargir la page aux EPN généraux.
- **Correction apportée (`src/utils/institutionBudgetHelper.ts`)** :
  - Maintien strict des 7 régulateurs du périmètre (ARCOP, HACA, CAIDP, CNDH, AIRP, ARTCI, ANARE-CI) avec `reference.amount_fcfa: null` (*« Non documenté »*).
  - Ajout de `REGULATOR_2026_DOCUMENTED_SCOPES` exposant dans `supplements` la traçabilité documentaire exacte (Annexe 6 EPN/ASS 2026 — SHA-256 `e8ba2e9dc9ffdc6d268c60eccecfbe51ee57adc6ca639923f8a3be78cece8cf6` — et LFI 2026) pour chaque régulateur, avec avertissement explicite qu'une subvention ou taxe affectée ne constitue pas le budget global de l'autorité.

### F — Accessibilité Complète de la Modale Institutionnelle (Observation P2 #5)
- **Constat de la revue ChatGPT** :
  `src/components/InstitutionDetailModal.tsx` gérait la fermeture sur `Escape` et les attributs ARIA de base, mais ne gérait pas le placement initial du focus, le piège de focus clavier (`Tab` / `Shift+Tab`), ni la restauration du focus à l'élément déclencheur à la fermeture.
- **Correction apportée (`src/components/InstitutionDetailModal.tsx`)** :
  - Ajout de `getModalFocusableElements`, `handleModalKeyDown` et `manageModalFocusLifecycle`.
  - À l'ouverture : sauvegarde de `document.activeElement` et placement automatique du focus sur le bouton de fermeture (`closeButtonRef`, `aria-label="Fermer la fiche"`), ou à défaut sur le premier élément focusable / conteneur `dialogRef` (`tabIndex={-1}`).
  - Pendant l'ouverture : piège de focus circulaire (`Tab` sur le dernier élément ramène au premier ; `Shift+Tab` sur le premier ramène au dernier) et fermeture sur `Escape` (suspendue lorsque la sous-modale `docModalOpen` est active).
  - À la fermeture : restauration automatique du focus sur le bouton déclencheur d'origine.

---

## 3. Recette Visuelle Navigateur Multi-Viewports (Playwright MCP)

La recette a été exécutée en local sur le serveur de prévisualisation Vite (`http://localhost:4173/`) aux trois viewports exigés :
- **Mobile** : 390 × 844 px
- **Tablette** : 768 × 1024 px
- **Desktop** : 1440 × 900 px

### Résultats des 10 entités prioritaires :

| # | Entité testée | Page / URL | Résultat 390px | Résultat 768px | Résultat 1440px | Statut Intégrité & Accessibilité |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | Ministère Section Partagée (`gov-035` / `gov-009`) | `/institutions/ministeres` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | Section 229, 333,88 Mrds FCFA, "Section partagée : compter une seule fois". Modale accessible, focus trap & Escape PASS. |
| 2 | HABG (`inst-habg`) | `/institutions/grandes-institutions` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | Prog 13004, 5,55 Mrds FCFA, mention inclus dans Section 103, non additif. |
| 3 | IGE (`inst-ige`) | `/institutions/grandes-institutions` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | Prog 13003, 9,87 Mrds FCFA, mention inclus dans Section 103, non additif. |
| 4 | CESEC (`inst-cesec`) | `/institutions/grandes-institutions` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | Section 105, 8,07 Mrds FCFA, écart 107,56 M FCFA consigné sans allégation d'irrégularité. |
| 5 | Cour Suprême (`inst-cour-supreme`) | `/institutions/grandes-institutions` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | "Non documenté", distinction sections 114/118/115, jamais 0 FCFA. |
| 6 | Commune avec BP (Bingerville) | `/institutions/mairies` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | BP 4,05 Mrds FCFA (`SECONDARY_SOURCE`), montant historique 1,02 Mrd FCFA qualifié neutre (`TO_VERIFY`). |
| 7 | Commune sans BP (Tiassalé / Doropo) | `/institutions/mairies` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | BP "Non documenté" (`null`), montant historique en supplément à confirmer, jamais 0 FCFA. |
| 8 | Conseil Régional (Agnéby-Tiassa / Iffou) | `/institutions/regions` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | Agnéby-Tiassa BP 6,19 Mrds FCFA (`SECONDARY_SOURCE`) ; Iffou "Non documenté", jamais 0 FCFA. |
| 9 | Régulateur dotation partielle (ARCOP) | `/institutions/regulateurs` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | Budget global "Non documenté", supplément Annexe 6 ASS documenté sans assimilation au budget global. |
| 10 | Régulateur sans budget établi (ARTCI / ANARE-CI) | `/institutions/regulateurs` | PASS (0 overflow) | PASS (0 overflow) | PASS (0 overflow) | Budget global "Non documenté", supplément périmètre Annexe 6 ASS documenté, jamais 0 FCFA. |

### Vérification de l'Accessibilité et Erreurs Navigateur :
- **Erreurs console** : 0 erreur, 0 avertissement.
- **Débordement horizontal** : `hasHorizontalOverflow = false` sur les 3 résolutions (`scrollWidth === clientWidth`).
- **Navigation au clavier & Modales** :
  - Attributs ARIA : `role="dialog"`, `aria-modal="true"`, `aria-label="Fiche budgétaire — ..."` validés.
  - Placement initial du focus sur le bouton `Fermer la fiche` validé.
  - Piège de focus (`Tab` / `Shift+Tab`) et restauration du focus au déclencheur validés.
  - Touche `Escape` : fermeture instantanée de la modale validée.

---

## 4. Bilan des Tests Automatisés & Build

- **Vitest** : **58 fichiers de tests, 751 tests exécutés, 751 réussis (100% PASS)**, 0 échec.
  - Inclus suite enrichie : `src/utils/__tests__/budgetBreakdownIntegrityGate.test.ts` (**11 tests** couvrant P1 #1, P1 #2, P2 #3, P2 #4, P2 #5).
- **TypeScript & Vite** : `tsc && vite build` validé avec succès, code de retour 0.
- **Git** : Branche `codex/budget-presentation-final` à jour avec GitHub (`origin`).

---

## 5. Recommandation pour ChatGPT

Les 5 observations de la revue indépendante (P1 #1, P1 #2, P2 #3, P2 #4, P2 #5) sont intégralement corrigées, testées et vérifiées. La PR #58 est prête pour la décision de fusion finale par ChatGPT sur `master`.
