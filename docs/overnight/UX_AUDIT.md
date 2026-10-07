# Audit UX préparatoire — LOT 13

Statut : PARTIAL. Analyse du code existant et préparation d'un système de composants. Aucune page historique déclarée VALIDATED. La référence primaire W3C WCAG 2.2 est identifiée mais son accès est refusé par le proxy (inventaire DOCUMENTS.json) ; aucune certification de conformité n'est annoncée.

| Constat vérifiable | Conséquence | Traitement prévu au LOT 14 |
|---|---|---|
| `index.html` impose `maximum-scale=1.0, user-scalable=no` | Zoom mobile empêché | Retirer les limitations du viewport |
| `BottomNav.tsx` utilise un div pour la navigation et n'annonce pas l'onglet actif | Repérage moins clair au lecteur d'écran | Landmark nav et aria-current ; cible tactile minimale 44 px |
| Menu Budgets de `Header.tsx` visible uniquement via group-hover | Exploration clavier insuffisante | Visibilité également via focus-within |
| Statuts documentaires et montants peuvent être confondus dans une refonte | Risque UNKNOWN → zéro ou donnée bloquée affichée | Composants AmountFact / StatusBadge avec textes explicites |
| Sources volumineuses et contexte technique | Lecture mobile difficile | Résumé puis disclosure de la page, URL et empreinte |

## Système proposé

Palette dérivée de la marque existante (#0a2540, #004c99) ; textes secondaires #475569 sur blanc ; avertissement textuel #78350f sur #fffbeb. Pas d'indication par couleur seule. Typographie système sans dépendance réseau, chiffres tabulaires, tailles fluides, cartes qui peuvent se replier, liens soulignés, focus visible, éléments natifs details/summary et cibles de 44 px. Aucun score politique ou graphique fictif.

Les trois niveaux sont Comprendre (valeur et statut), Explorer (périmètre et contexte), Vérifier (document primaire et page). Les classes sont isolées sous `.review-app` pour préserver la mise en page existante.

## Vérification à réaliser sur l'interface candidate

Largeurs 360, 375, 390, 430, 768, 1280, 1440 et 1920 px ; navigation clavier, focus, absence de débordement, changement d'exercice et de section, état UNKNOWN sans montant pour les trois ministères réconciliés, recherche documentaire, liens de source, retour à un état vide. L'audit de chaque page historique et les essais avec technologies d'assistance réelles restent à effectuer avant validation globale.
