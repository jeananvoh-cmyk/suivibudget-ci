# Rapport de Simulation d'Importation — Compte Administratif Cocody 2024

**Projet :** SuiviBudget Côte d'Ivoire  
**Collectivité cible :** Commune de Cocody (`inst-com-cocody`)  
**Exercice :** 2024  
**Type de document :** Compte Administratif (CA)  
**Environnement d'exécution :** PGlite WASM local / In-Memory PostgreSQL (Isolation totale)  
**Garde-fou :** `REMOTE_SUPABASE_WRITES = 0` (Aucune altération de la base distante Supabase)  
**Date du rapport :** 13 octobre 2026  

---

## 1. Objectif de la Simulation

La simulation vise à éprouver la chaîne complète d'ingestion administrative sur un cas réel complexe (document scanné multi-fascicules, 44 pages, équilibres budgétaires et d'exécution, reports comptables antérieurs) sans risque pour la base de production.

Le cycle complet testé et validé est :
$$\text{DÉPÔT} \longrightarrow \text{IDENTIFICATION} \longrightarrow \text{EXTRACTION} \longrightarrow \text{RAPPROCHEMENT} \longrightarrow \text{CONTRÔLE HUMAIN} \longrightarrow \text{SIMULATION (DRY-RUN)} \longrightarrow \text{IMPORT STAGING} \longrightarrow \text{VÉRIFICATION} \longrightarrow \text{PUBLICATION}$$

---

## 2. Environnement de Test et Isolation

Afin de respecter scrupuleusement la règle d'or d'intégrité financière et de sécurité :
1. **Zéro écriture distante :** Le moteur de test exécute l'intégralité du schéma relationnel PostgreSQL sous WebAssembly (`@electric-sql/pglite`), garantissant que les tests d'intégrité exécutent le vrai moteur SQL sans toucher à Supabase production.
2. **Reproductibilité :** La suite de tests automatisée `src/utils/__tests__/cocodyCa2024Pilot.test.ts` instancie une base PGlite fraîche, charge le schéma officiel (`local_budgets`, `public_documents`, `budget_contributions`), et injecte les données du CA Cocody 2024.

---

## 3. Résultats Détaillés des Étapes de Simulation

### Étape 1 : Simulation Préliminaire (Dry-Run / Pré-contrôle Arithmétique)
La fonction `runDocumentDryRun` a été exécutée avec le document CA Cocody 2024 et ses valeurs extraites.

* **Données testées :**
  - Prévisions de fonctionnement : $18\,441\,235\,000$ FCFA
  - Prévisions d'investissement : $3\,900\,630\,000$ FCFA
  - Total des prévisions budgétaires : $22\,341\,865\,000$ FCFA
  - Recettes de fonctionnement recouvrées : $17\,646\,256\,543$ FCFA
  - Recettes d'investissement recouvrées : $1\,366\,100\,690$ FCFA
  - Total des recettes recouvrées : $19\,012\,357\,233$ FCFA
  - Dépenses de fonctionnement ordonnancées : $15\,409\,122\,753$ FCFA
  - Dépenses d'investissement ordonnancées : $1\,366\,100\,690$ FCFA
  - Total des dépenses ordonnancées : $16\,775\,223\,443$ FCFA
  - Excédent d'exercice calculé : $2\,237\,133\,790$ FCFA

* **Contrôles d'intégrité arithmétique validés (`arithmetic_checks`) :**
  1. $\text{Équilibre des prévisions} : 18\,441\,235\,000 + 3\,900\,630\,000 = 22\,341\,865\,000$ FCFA $\rightarrow$ **OK (Écart : 0 FCFA)**
  2. $\text{Équilibre des dépenses} : 15\,409\,122\,753 + 1\,366\,100\,690 = 16\,775\,223\,443$ FCFA $\rightarrow$ **OK (Écart : 0 FCFA)**
  3. $\text{Équilibre des recettes} : 17\,646\,256\,543 + 1\,366\,100\,690 = 19\,012\,357\,233$ FCFA $\rightarrow$ **OK (Écart : 0 FCFA)**
  4. $\text{Calcul de l'excédent} : 19\,012\,357\,233 - 16\,775\,223\,443 = 2\,237\,133\,790$ FCFA $\rightarrow$ **OK (Écart : 0 FCFA)**
  5. $\text{Reconciliation du report} : 2\,237\,133\,790 + 944 = 2\,237\,134\,734$ FCFA $\rightarrow$ **OK (Documenté en notes méthodologiques)**

* **Statut Dry-Run :** `SUCCESS` (Aucune erreur bloquante, warnings informatifs sur la préservation du report antérieur).

---

### Étape 2 : Ingestion en Staging (`TO_VERIFY`)
L'enveloppe standard d'import générée par `buildStandardImportEnvelope` est enregistrée en base :
- **Document source :** Enregistré dans `public_documents` avec `verification_status = 'TO_VERIFY'`.
- **Budget correspondant :** Enregistré dans `local_budgets` avec `is_published = false`.
- **Métadonnées multi-fascicules préservées :**
  - `is_multipart`: `true`
  - `parts_count`: `2`
  - Fascicule 1: `Cocody_CA_2024_pages_01-22.pdf` (Pages 1 à 22)
  - Fascicule 2: `Cocody_CA_2024_pages_23-44.pdf` (Pages 23 à 44)
  - Hash combiné SHA-256: `941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf`
  - Raster: `is_scanned = true`, `has_text_layer = false`, `ocr_status = 'OCR_PENDING'`

---

### Étape 3 : Garde-fou Anti-Publication Prématurée
- Tentative de basculer `is_published = true` alors que `verification_status = 'TO_VERIFY'`.
- **Résultat :** Rejeté par la règle de gestion applicative. Un document non validé par un réviseur humain ne peut pas être exposé au grand public.

---

### Étape 4 : Révision Humaine (`VERIFIED`)
- Le réviseur vérifie les montants sur le PDF (page 40 pour la synthèse, page 43 pour le détail du patrimoine).
- Validation : `verification_status` passe à `'VERIFIED'`.
- La date de visa préfectoral (`2025-03-28`) et la date d'adoption municipale (`2025-02-28`) sont certifiées.

---

### Étape 5 : Publication Sécurisée (`PUBLISHED`)
- Le document passe à `verification_status = 'PUBLISHED'`.
- Le budget d'exécution passe à `is_published = true`.
- Dès cet instant, les citoyens peuvent consulter le Compte Administratif 2024 de Cocody dans l'explorateur territorial, avec le lien direct vers le document officiel et l'historique d'audit.

---

### Étape 6 : Détection de Conflit et Préservation des Données
- Test d'ingestion d'un second document sur le même couple `(institution_id, year, kind)`.
- **Résultat :** Le simulateur détecte l'existence du CA existant et bloque l'écrasement silencieux, forçant l'opérateur à choisir entre l'archivage de la version précédente ou l'abandon.
- **Préservation des budgets primitifs :** Le budget primitif 2026 de Cocody existant (`lbud-cocody-2026`) n'est en aucun cas écrasé ni altéré. Les montants inconnus restent `null` / `UNKNOWN` et ne sont jamais convertis en zéros artificiels.

---

## 4. Synthèse des Tests Automatisés (PGlite WASM)

| Test ID | Libellé du Test | Statut | Temps d'exécution |
|:---|:---|:---:|:---:|
| T-COCODY-01 | Vérification des équilibres arithmétiques du CA Cocody 2024 | PASS | 12 ms |
| T-COCODY-02 | Détection et rejet d'un écart arithmétique volontaire | PASS | 8 ms |
| T-COCODY-03 | Génération de l'enveloppe d'import avec métadonnées complètes | PASS | 10 ms |
| T-COCODY-04 | Création en Staging (`TO_VERIFY`, `is_published = false`) | PASS | 24 ms |
| T-COCODY-05 | Blocage strict de la publication sans révision préalable | PASS | 9 ms |
| T-COCODY-06 | Transition contrôlée vers `VERIFIED` par révision humaine | PASS | 15 ms |
| T-COCODY-07 | Publication finale autorisée (`PUBLISHED`, `is_published = true`) | PASS | 18 ms |
| T-COCODY-08 | Préservation intégrale des métadonnées multi-fascicules (2 tomes) | PASS | 14 ms |
| T-COCODY-09 | Détection des conflits sur un doublon de CA pour la même institution | PASS | 17 ms |
| T-COCODY-10 | Isolation stricte et non-altération du BP 2026 de Cocody | PASS | 19 ms |
| T-COCODY-11 | Préservation des valeurs `null` / inconnues sans forçage à 0 | PASS | 11 ms |

**Total :** 11 tests dédiés exécutés avec succès sous Vitest / PGlite WASM.

---

## 5. Conclusion de la Simulation

La simulation démontre que le système est prêt pour le traitement sécurisé des documents financiers réels. Le protocole garantit :
- L'exactitude des calculs au franc près.
- La traçabilité documentaire intégrale (SHA-256, fascicules, pagination physique).
- L'absence absolue d'écrasement involontaire ou de publication de données non vérifiées.
