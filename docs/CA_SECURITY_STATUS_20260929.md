# SuiviBudget — état sécurité & socle CA (29 septembre 2026)

## Production Supabase

Projet vérifié : `cdesuvcozcetdtvibgqs`.

Appliqué :
- autorisation staff fondée sur `profiles.role` protégé côté base, plus sur `user_metadata`;
- profils non publics et blocage de l'auto-élévation de privilèges;
- buckets `public_documents` et `citizen_photos` privés;
- documents : staging, vérification, publication, archivage, checksum SHA-256 et version;
- URL signée 5 minutes pour un document publié;
- URL signée 5 minutes pour un média citoyen approuvé;
- modèle CA V3 avec provenance et lignes financières;
- référentiel fonctionnel 201 communes + 31 conseils régionaux;
- pilotes CA 2024 réels : Abobo, Bingerville, Tiassalé. Aucun CA 2025 fictif.

## Identité administrative

Le propriétaire a confirmé que l’unique compte Auth est son compte administrateur. Aucun autre compte ne doit être promu automatiquement.

## Contrôle du 30 septembre 2026 — Phase 2A

Migration locale `20260930153716_least_privilege_passport_boundary.sql`, appliquée sur le seul projet autorisé sous la version distante `20260930153938`.

Deux défauts corrigés : privilèges techniques hérités de service_role sur les dix relations ci-dessous ; lecture des budgets VERIFIED par un citoyen authentifié. La lecture citoyenne est désormais limitée à PUBLISHED. Les SELECT service_role nécessaires aux deux Edge Functions sont conservés.

Privilèges SQL effectifs (S=SELECT, I=INSERT, U=UPDATE, D=DELETE). Les droits authenticated restent soumis à la RLS ; ils ne donnent pas ces capacités à tous les citoyens.

| Relation | anon | authenticated | service_role |
| --- | --- | --- | --- |
| public_documents | S | SIU | S |
| citizen_proofs | I | SIUD | S |
| administrative_accounts | S | SIUD | aucun |
| ca_investment_operations | S | SIUD | aucun |
| ca_procurement_matches | S | SIUD | aucun |
| ca_financial_lines | S | SIUD | aucun |
| profiles | aucun | SIU | aucun |
| local_budgets | aucun | SIU | aucun |
| institutions | S | SIU | aucun |
| public_citizen_proofs | S | S | aucun |

- Aucun TRUNCATE, REFERENCES ou TRIGGER pour anon, authenticated ou service_role sur ces relations.
- CA, enfants et budgets : gestion ADMIN/DATA_MANAGER. Documents : ADMIN/DATA_MANAGER, publication contrôlée côté serveur. Preuves : modération ADMIN/MODERATOR, suppression ADMIN ; le citoyen ne peut pas approuver sa preuve.
- L’INSERT anonyme de preuve PENDING est volontaire et contraint. Il ne permet ni lecture privée, ni modification, ni approbation.
- Profils : lecture personnelle ou staff ; aucune auto-promotion ni modification du rôle par les métadonnées Auth. Institutions : gestion ADMIN/DATA_MANAGER. Projection publique : APPROVED uniquement, sans identité privée.
- Vérifications réelles : transactions SQL annulées pour les quatre rôles applicatifs ; 23 contrôles HTTP publics/PostgREST/RPC/Edge réussis ; aucun DELETE anonyme autorisé sur les dix relations.
- Contrôle final : 1 utilisateur, 3 CA VERIFIED, 0 document, 0 preuve, 0 objet dans les deux buckets privés. Aucun pilote publié ou remplacé.
- Advisors : seul avertissement sécurité Leaked Password Protection Disabled ; 31 index inutilisés INFO et 16 policies permissives multiples WARN. Pas de refactoring de policies sans mesure et tests spécifiques.

## Configuration Supabase à faire dans le Dashboard

Activer Auth > Password Security > leaked password protection. Ce réglage de plateforme n'est pas exposé par le connecteur utilisé pour cette intervention.

## Règle de publication CA

Un document est téléversé en `TO_VERIFY`. Il doit être vérifié puis publié. Les données structurées et le PDF restent séparés. Un montant financier ne prouve jamais à lui seul l'achèvement physique d'un projet.
