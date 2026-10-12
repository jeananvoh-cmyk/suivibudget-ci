# Audit UX/UI consolidé — SuiviBudget Côte d'Ivoire — 12 octobre 2026

**Périmètre réellement examiné :** code `master` post-lots 1–15, pages Accueil, Projets, Institutions, Documents, Connexion administration, composants Header, BottomNav, ProjectCard, ProjectDetailModal et rapports `docs/overnight/UX_AUDIT.md`, `LOT13_REPORT.md`, `LOT14_REPORT.md`, `LOT15_REPORT.md`.

**Méthode :** inspection indépendante du JSX et des composants via GitHub, confrontation aux rapports historiques et vérification CI des PR correctives. **Limite majeure :** la consultation automatisée du site public n'a pas pu être effectuée ; absence de campagne navigateur multi-écrans, lecteurs d'écran, outils de contraste et parcours utilisateurs sur cette version de production. Ce rapport NE constitue ni une certification WCAG 2.2 AA ni une recette de production.

## Constatations vérifiées

| ID | Priorité | Parcours | Observation dans le code | Traitement |
|---|---|---|---|---|
| UX-01 | P1 | En-tête | Logo implémenté comme une `div` cliquable, non contrôlable naturellement au clavier. | PR #52 : bouton natif, libellé accessible, focus visible ; CI verte, fusionnée. |
| UX-02 | P1 | Documents | Recherche et filtre par année dépourvus de noms accessibles explicites ; bouton de réinitialisation intitulé uniquement par `title`. | PR #52 : `aria-label` descriptifs ; CI verte, fusionnée. |
| UX-03 | P1 | Accueil | Les grandes cartes de projets et les cartes latérales sont des `div` cliquables, sans activation clavier. | PR #53 : ajout activation Entrée/Espace et noms accessibles ; CI à vérifier. |
| UX-04 | P1 | Projets | Recherche et filtres région/tri sans libellé associé ; bouton Effacer sans nom accessible ; état ouvert/fermé du panneau mobile non exposé. | PR #53 : noms accessibles et `aria-expanded`/`aria-controls`. |
| UX-05 | P1 | Connexion admin | Les `label` visuels des deux champs principaux n'ont pas `htmlFor` ; associations non garanties. | PR #53 : noms accessibles et autocomplete username/current-password ; autres étapes à auditer au navigateur. |
| UX-06 | P1 | Modal projet | Conteneur dialog sans sémantique dialog/aria-modal au départ. | PR #53 : ajout `role=dialog`, `aria-modal`, `aria-label`. Focus initial, maintien et restitution du focus restent à tester et sécuriser. |
| UX-07 | P2 | Annuaire institutions | Sélection de sous-catégorie non annoncée comme active aux lecteurs d'écran. | PR #53 : `aria-current=page`. |
| UX-08 | P1 | Tableau projets | `tr onClick` n'est pas activable naturellement au clavier ; boutons d'action existent dans les cellules, mais navigation complète à tester. | Non corrigé automatiquement : prévoir un lien/bouton natif dans la cellule intitulé, sans double gestion de clics. |
| UX-09 | P2 | Navigation mobile | Boutons `w-14 py-1` et polices `text-[10px]` : tailles tactiles/réelles susceptibles d'être insuffisantes ; indicateur actif `aria-current` présent. | Mesures CSS calculées et test tactile requis en navigateur. |
| UX-10 | P2 | Ensemble | Nombreuses polices `text-[10px]`, `text-[11px]`, `text-xs`; hiérarchie de lecture et contraste à examiner. | Mesures WCAG et test zoom à 200 %/400 % requis ; pas de score sans test. |
| UX-11 | P1 | Parcours modaux | Absence de garantie de focus trap, fermeture Échap et retour du focus sur déclencheur dans le modal projet inspecté. | Test clavier et correction structurée (dialog natif ou gestion de focus) requis avant certification. |
| UX-12 | P1 | Production | Rapports historiques : 56 vérifications sur 7 vues × 8 largeurs uniquement sur `review.html`, pas sur toutes les pages de l'application publique. | Recette navigateur réelle de production obligatoire ; aucun taux de conformité ne peut être certifié ici. |

## Améliorations déjà présentes dans master avant cet audit

- `index.html` : viewport autorisant le zoom.
- `BottomNav.tsx` : nav nommée et `aria-current` selon l'onglet.
- `Header.tsx` : barre de navigation nommée, menu Budgets avec prise en charge clavier selon lot 14.
- Pages de revue : styles focus, cibles tactiles, états UNKNOWN non transformés en zéro, sources et preuves distinguées.
- PR #48/#49 : accès public documentaire et garde-fous de confidentialité et d'intégrité, qui restent à éprouver dans le navigateur réel.

## Critères de recette à exécuter hors audit statique

1. Largeurs 360, 375, 390, 430, 768, 1280, 1440, 1920 ; zoom 200 % et 400 % ; sans débordement gênant.
2. Navigation complète au clavier : logo, menus, recherche, filtres, cartes, tableaux, modales, retour de focus, Échap.
3. Contraste réel des textes, focus visible, tailles tactiles, réduction du mouvement, libellés et erreurs de formulaire ; lecteur d'écran NVDA/VoiceOver.
4. Parcours citoyen : rechercher budget, comparer années, ouvrir document officiel, exporter, rechercher projet, lire son statut, consulter contribution publiée et ouvrir modal.
5. Parcours administrateur avec compte de test autorisé et données non sensibles uniquement ; ne pas modifier Supabase pour un test.
6. Collecter captures, URL, viewport, navigateur, résultat PASS/FAIL, défauts P0/P1/P2 ; ne jamais présenter un contrôle statique comme une preuve de conformité réelle.

## État

**Audit statique consolidé achevé ; recette navigateur et certification UX/UI globale NON réalisées.** Aucun montant financier, règle d'accès ou donnée Supabase modifié par les PR UX #52/#53. Ne pas déclarer les lots 13–14 certifiés en production avant la recette.
