# Règles Budgétaires & Principes d’Intégrité Financière

Ce document définit les règles métier, les définitions comptables publiques et les invariants stricts encadrant le traitement des finances publiques au sein de SuiviBudget Côte d’Ivoire.

---

## 1. Vocabulaire et Typologie des Documents Budgétaires

Dans le droit budgétaire et la comptabilité publique ivoirienne (LOLF, décret portant régime financier des collectivités territoriales), il est obligatoire de distinguer rigoureusement les prévisions de l'exécution :

### A. La Loi de Finances Initiale (LFI) & Annexes
- **LFI :** Acte législatif par lequel le Parlement vote les autorisations d'engagement et les crédits de paiement de l'État pour une année civile.
- **Annexe 7 :** Document de répartition des concours de l'État et transferts aux collectivités territoriales et établissements publics.
- **Annexe 10 :** Répartition des effectifs et dépenses de personnel.

### B. Le Cycle Budgétaire des Collectivités Locales
- **Budget Primitif (`BP`) :** Prévision annuelle votée par le Conseil Municipal ou Régional avant le début de l'exercice. Il constitue un plafond prévisionnel d'autorisations et n'atteste en aucun cas de l'encaissement effectif des recettes ni de la dépense des fonds.
- **Budget Supplémentaire (`BS`) :** Ajustement budgétaire intégrant les résultats reportés de l'exercice précédent après le vote du compte administratif.
- **Budget Modificatif (`BM`) :** Réajustements de crédits de chapitre à chapitre en cours d'année.
- **Compte Administratif (`CA`) :** **Document de reddition de comptes définitif** établi par l'ordonnateur en fin d'exercice. Il retrace l'exécution réelle des recettes encaissées et des dépenses mandatées.

---

## 2. Invariants Fondamentaux Non Négociables

### Invariant 1 : Règle `UNKNOWN ≠ 0` (L'Absence de Donnée n'est pas Zéro)
- Si une délibération ou un budget primitif n'est pas encore obtenu par la plateforme, le montant affiché doit être `null` / `Non documenté` ou `Non publié`.
- **Interdiction formelle** de remplacer une donnée inconnue par `0 FCFA` ou de déduire l'inexistence d'un budget de son absence temporaire sur la plateforme (Règle 9 de la Charte).

### Invariant 2 : Non-Interprétation des Ventilations Non Certifiées
- Lorsqu'un budget primitif est rapporté par une source secondaire fiable (AIP, presse officielle) mais que la délibération originale complète n'a pas encore été auditée (`verification === 'TO_VERIFY'`) :
  - Les montants bruts totaux, de fonctionnement et d'investissement équilibrés peuvent être présentés.
  - **Les pourcentages de ventilation (`pct_functioning`, `pct_investment`) doivent rester strictement `null`**.
  - Tout graphique camembert ou barre proportionnelle est neutralisé pour empêcher la présentation d'une ventilation non certifiée.

### Invariant 3 : Étanchéité entre Réalisation Financière et Réalisation Physique
- Un mandat de paiement exécuté dans le compte administratif (`financial_status = 'PAID'`) ne garantit pas la livraison matérielle de l'ouvrage sur le terrain (`physical_status`).
- Seules les observations vérifiées (`citizen_proofs` approuvées, audits de terrain) permettent de qualifier la réalité physique d'un chantier.

---

## 3. Périmètres Institutionnels et Règles d'Additivité

### A. Présidence de la République & Organes Rattachés (Section 103)
- La **Section 103** de la LFI 2026 regroupe les crédits de la Présidence de la République.
- **Haute Autorité pour la Bonne Gouvernance (HABG) :** Programme `13004`. Ses crédits sont déjà compris dans l'enveloppe de la Section 103.
- **Inspection Générale d'État (IGE) :** Programme `13003`. Ses crédits sont également inclus dans la Section 103.
- **Règle d'additivité :** Les montants de la HABG et de l'IGE ne doivent **JAMAIS** être sommés au total de la Présidence sous peine de double comptage. Les fiches de ces organes indiquent explicitement leur inclusion dans la Section 103.

### B. Conseil Économique, Social, Environnemental et Culturel (CESEC)
- Le budget du CESEC fait l'objet d'une inscription en LFI et de concours détaillés en Annexe 7.
- Ces montants représentent des bases documentaires distinctes et sont présentés séparément sans agrégation arbitraire.

### C. Cour Suprême
- La Cour Suprême bénéficie d'une autonomie institutionnelle, mais ses crédits ne font pas l'objet d'une section ministérielle individualisée isolée. Son montant n'est pas artificiellement déduit hors des inscriptions officielles vérifiées.

### D. Autorités et Organes de Régulation Indépendants (AAI / ANRMP / ARTCI)
- Les autorités administratives indépendantes disposent de mécanismes de financement spécifiques (redevances, quotes-parts de régulation, dotations).
- **Règle absolue :** Il n'existe aucun « budget consolidé global fictif » des autorités de régulation. Chaque autorité présente exclusivement ses composantes officielles distinctes et vérifiables.
- Aucun élargissement général aux Établissements Publics Nationaux (EPN) ou sociétés d'État n'est autorisé.

---

## 4. Certification Documentaire & Registre `AUDITED_FINANCIAL_CLAIMS`

Dans [institutionBudgetHelper.ts](../../src/utils/institutionBudgetHelper.ts), toute prétention à la certification (`VERIFIED`) doit correspondre à une entrée exacte dans le registre `AUDITED_FINANCIAL_CLAIMS`.

### Critères de validation d'une entrée auditée :
1. **`document_reference` :** Référence juridique et textuelle exacte (ex: *« LFI 2026, Volume 2, p. 207 »*).
2. **`action_code` :** Code de l'action LOLF vérifié (ex: *`78016001400`* pour le transfert d'investissement à la commune d'Attécoubé).
3. **`amount_fcfa` :** Montant en FCFA rigoureusement exact (ex: `300 000 000` FCFA).
4. **`sha256` :** Empreinte SHA-256 authentique du fichier PDF officiel source.
5. **Rejet automatique :** Les délibérations locales non auditées ou les URLs fictives (`example.com`, faux hashes) sont automatiquement déclassées en `UNAUDITED_DELIBERATION` ou `TO_VERIFY`.

---

## 5. Exemples Représentatifs Contrôlés

| Entité | Statut Budgétaire | Montant Public | Provenance & Qualification |
|---|---|---|---|
| **Mairie d'Attécoubé** | Concours État vérifié | `300 000 000 FCFA` | LFI 2026 p. 207, action 78016001400, dotation certifiée dans `AUDITED_FINANCIAL_CLAIMS`. |
| **Mairie de Bingerville** | BP rapporté | `4 046 222 000 FCFA` | AIP (décembre 2025), publication secondaire — à confirmer par la délibération originale. |
| **Mairie de Tiassalé** | BP rapporté + CA 2024 | `1 760 000 000 FCFA` | AIP (décembre 2025), publication secondaire à confirmer. CA 2024 consultable séparément. |
| **Mairie de Bouna** | BP non documenté | `Non documenté` | Absence de délibération publiée. Respect strict de `UNKNOWN ≠ 0`. |
| **Région Agneby-Tiassa** | BP rapporté | `6 194 348 000 FCFA` | AIP, publication secondaire à confirmer. |
| **Région de l'Iffou** | BP non documenté | `Non documenté` | Absence de délibération publiée. |
