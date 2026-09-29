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

## Blocage volontaire de sécurité

Aucun compte n'est promu automatiquement ADMIN. Le premier rôle staff doit être attribué à une identité Supabase Auth explicitement confirmée par le propriétaire du projet.

## Configuration Supabase à faire dans le Dashboard

Activer Auth > Password Security > leaked password protection. Ce réglage de plateforme n'est pas exposé par le connecteur utilisé pour cette intervention.

## Règle de publication CA

Un document est téléversé en `TO_VERIFY`. Il doit être vérifié puis publié. Les données structurées et le PDF restent séparés. Un montant financier ne prouve jamais à lui seul l'achèvement physique d'un projet.
