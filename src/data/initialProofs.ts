import { CitizenProof } from '../types';

// Preuves citoyennes pilotes de démonstration (Exemples illustratifs)
// Clairement identifiées avec is_demo: true.
// Dès les premières soumissions citoyennes réelles enregistrées sur la plateforme,
// ces exemples démonstratifs sont automatiquement remplacés par les vrais constats du terrain.
export const INITIAL_CITIZEN_PROOFS: CitizenProof[] = [
  {
    id: "demo-proof-1",
    project_id: "proj-com-1482",
    project_title: "Reprofilage lourd (10 000ml) : Quartiers Petit-Paris, Haoussabougou, Sinistre",
    commune_name: "KORHOGO",
    region_name: "Poro",
    citizen_name: "Sentinelle Citoyenne #08",
    user_name: "Sentinelle Citoyenne #08 (Poro)",
    image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
    photo_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
    media_type: "IMAGE",
    citizen_status_claim: "IN_PROGRESS",
    comment: "Travaux de terrassement et de nivellement actifs sur l'axe principal de Haoussabougou. Les engins de chantier sont à l'œuvre et la circulation est déviée.",
    locality_details: "Quartier Haoussabougou, Axe Carrefour Marché",
    geo_latitude: 9.458,
    geo_longitude: -5.629,
    verification_status: "APPROVED",
    moderator_notes: "Exemple de démonstration pour illustrer le suivi d'un chantier en cours.",
    confirmations_count: 14,
    is_demo: true,
    created_at: "2026-02-15T10:30:00Z"
  },
  {
    id: "demo-proof-2",
    project_id: "proj-com-2249",
    project_title: "Construction d'une clôture de 450 ml à l'EPP N'Dakro 2",
    commune_name: "BOUAKE",
    region_name: "Gbêkê",
    citizen_name: "Observateur Citoyen",
    user_name: "Observateur Citoyen (Gbêkê)",
    image_url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80",
    photo_url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80",
    media_type: "IMAGE",
    citizen_status_claim: "COMPLETED",
    comment: "La clôture de l'école primaire est totalement achevée, crépie et peinte. Le portail d'entrée est installé et sécurise désormais l'accès des élèves.",
    locality_details: "Bouaké, Quartier N'Dakro",
    geo_latitude: 7.690,
    geo_longitude: -5.030,
    verification_status: "APPROVED",
    moderator_notes: "Exemple de démonstration pour illustrer un ouvrage achevé et opérationnel.",
    confirmations_count: 28,
    is_demo: true,
    created_at: "2026-02-20T14:15:00Z"
  },
  {
    id: "demo-proof-3",
    project_id: "proj-com-2239",
    project_title: "Mise en place d'une plate-forme numérique de services en ligne de la mairie de Bouaké",
    commune_name: "BOUAKE",
    region_name: "Gbêkê",
    citizen_name: "Comité de Veille",
    user_name: "Comité Citoyen de Veille (Bouaké)",
    image_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    photo_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    media_type: "IMAGE",
    citizen_status_claim: "NOT_STARTED",
    comment: "Passage au guichet de la mairie ce matin : le projet de portail numérique n'a pas encore été déployé auprès des agents d'état civil.",
    locality_details: "Hôtel de Ville de Bouaké",
    geo_latitude: 7.688,
    geo_longitude: -5.029,
    verification_status: "APPROVED",
    moderator_notes: "Exemple de démonstration pour illustrer un projet dont le démarrage est en attente.",
    confirmations_count: 6,
    is_demo: true,
    created_at: "2026-02-24T09:00:00Z"
  }
];

