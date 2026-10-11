# Réconciliation 2026 — sept autorités de régulation / structures assimilées

Date de recherche : **11 octobre 2026**. Référentiel contrôlé : `docs/audits/institution-reconciliation/matrix.json`, branche `master` avant création de la présente branche. Les sept entités ont `total_fcfa: null` et `verification_status: NOT_DOCUMENTED`. Les anciens montants sans preuve ont déjà été retirés du classement certifié.

## Source officielle déterminante

DGBF, **Annexe 6 — Budgets des Établissements Publics Nationaux (EPN) 2026**, tableau **STRUCTURES ASSIMILÉES (ASS)** : https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-6-Budgets-des-EPN-2026.pdf

Le document distingue rigoureusement :
- **Subventions État 2026** (rubrique qui inclut également les financements extérieurs selon la note de l'annexe) ;
- **Autres ressources 2026** : ressources propres, excédents et subventions d'autres organismes ;
- **Budget total 2026** = somme des deux catégories.

**Ces montants figurent dans une annexe au projet/LFI 2026. Ils établissent une référence de prévision 2026, et non une preuve de fonds effectivement versés ni un compte administratif.**

| ID application | Autorité | Code DGBF | Subventions État 2026 (FCFA) | Autres ressources (FCFA) | Budget total 2026 (FCFA) | Niveau de preuve |
|---|---|---|---:|---:|---:|---|
| aai-arcop | ARCOP | 32040003 | 200 000 000 | 11 087 646 212 | 11 287 646 212 | Annexe 6, état récapitulatif ASS, document officiel |
| aai-haca | HACA | 32040004 | 1 454 056 138 | 1 471 878 928 | 2 925 935 066 | Annexe 6 ASS + fiche HACA détaillée, total des emplois équilibré |
| aai-cndh | CNDH | 32040005 | 1 927 737 123 | 6 000 000 | 1 933 737 123 | Annexe 6, état récapitulatif ASS |
| aai-caidp | CAIDP | 32040018 | 938 179 346 | 0 **attesté** | 938 179 346 | Annexe 6 ASS ; ligne LFI de subvention de personnel 419 179 346 seulement |
| aai-airp | AIRP | — | **996 632 520** (CP pour *subventions équilibre personnel seulement*) | — | **inconnu** | LFI 2026, code activité 78074000605. Ce n'est PAS une dotation globale certifiée |
| aai-artci | ARTCI | — | **non établi** | — | **inconnu** | Budget global 2026 non retrouvé dans les sources de cette recherche |
| aai-anare | ANARE-CI | — | **non établi** | — | **inconnu** | Budget global 2026 non retrouvé dans les sources de cette recherche |

**Contrôles arithmétiques par autorité :**
- ARCOP : 200 000 000 + 11 087 646 212 = 11 287 646 212.
- HACA : 1 454 056 138 + 1 471 878 928 = 2 925 935 066. La ventilation de subvention indiquée dans la fiche détaillée inclut 1 424 056 138 de personnel, 20 500 000 d'équipement, 9 500 000 de biens et services, pour 1 454 056 138. Attention, certaines tables d'activités d'équilibre présentent des natures en nomenclature différente : utiliser les ressources du récapitulatif comme base de cette ventilation.
- CNDH : 1 927 737 123 + 6 000 000 = 1 933 737 123.
- CAIDP : 938 179 346 + 0 = 938 179 346. La ligne LFI de personnel de 419 179 346 est une **composante**, pas une somme additionnelle.

Les quatre budgets globaux documentés totalisent **17 085 497 747 FCFA** (strictement pour ces 4 entités). Total des subventions correspondantes : **4 519 972 607 FCFA**.

## Application : décisions sans invention

1. **Quatre entités (ARCOP, HACA, CNDH, CAIDP) :** une référence de budget prévisionnel 2026 et une part subventionnelle sont officiellement disponibles. Elles peuvent être publiées sous des champs explicitement distincts, une fois leur modèle d'affichage vérifié ; ne pas restaurer leurs anciens chiffres non documentés.
2. **AIRP :** une ligne de subvention 2026 certaine à 996 632 520 FCFA, **sans preuve qu'il s'agit du budget complet ou de l'ensemble des subventions**. Conserver le budget total à `null` ; enregistrer la preuve partielle séparément.
3. **ARTCI et ANARE-CI :** aucune dotation globale 2026 certifiée par la présente recherche. Conserver `null` et signaler la pièce manquante (budget approuvé/rapport institutionnel).
4. La catégorie juridique « autorité de régulation » de l'application ne signifie pas que les sept organismes possèdent la même classification comptable : la DGBF classe quatre d'entre eux parmi les **structures assimilées aux EPN**. Toute intégration doit respecter la nature de la mesure et le financement par ressources propres.
5. **Aucune écriture Supabase ni transformation arbitraire des montants existants.** Aucune preuve de versement/exécution tirée des budgets 2026.

## Sources

- [DGBF, Annexe 6 EPN 2026 — version Loi de finances](https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-6-Budgets-des-EPN-2026.pdf)
- [DGBF, LFI 2026 — subvention CAIDP et AIRP](https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf)
- [ARCOP, publications budgétaires : budget ANRMP 2024 uniquement dans la section « Budget » consultée](https://arcop.ci/documentation/autres/publications/)
- [ARTCI, site officiel](https://artci.ci/)
- [HACA, site officiel](https://www.haca.ci/)
- [CNDH, organisme et statut](https://www.cndh.ci/qui-sommes-nous/)

**Limite de lecture :** le PDF de l'Annexe 6 entière n'a pas pu être téléchargé intégralement dans l'environnement d'exécution : serveur inaccessible au conteneur et rendu web de la pièce volumineuse indisponible. Les données reportées sont les tableaux **indexés sous l'URL primaire DGBF**. Ce contrôle n'établit donc pas que chaque page de l'Annexe 6 est vérifiée ou que tous les budgets alternatifs de 2026 ont été trouvés. Les quatre valeurs récapitulatives restent étayées par le tableau officiel indexé, mais aucun changement applicatif sans second contrôle du PDF brut.
