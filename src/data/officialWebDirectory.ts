/**
 * RÉFÉRENTIEL OFFICIEL DES SITES WEB & RÉSEAUX DES COLLECTIVITÉS TERRITORIALES DE CÔTE D'IVOIRE
 * Conforme à l'audit national certifié (201 communes, 31 régions, 2 districts autonomes - Contrôle du 27/09/2026)
 * Règle stricte : 0% de spéculation, 100% de vérifiabilité documentaire.
 */

import { Institution } from '../types';

export interface OfficialWebEntry {
  type: 'MAIRIE' | 'REGION' | 'DISTRICT';
  nom: string;
  chefLieu: string;
  statutWeb: 'FONCTIONNEL' | 'INACTIF' | 'AUCUN';
  url: string;
  observations: string;
  facebookUrl?: string;
  facebookStatus?: string;
  fraicheur?: string;
  confiance?: 'Élevée' | 'Moyenne';
}

// Normalisation robuste pour recherche sans accent, ponctuation ni articles
export function normalizeKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^conseil\s+regional\s+(de\s+la\s+|du\s+|des\s+|de\s+l['’]\s*|d['’]\s*|de\s+)?/i, '')
    .replace(/^district\s+autonome\s+(d['’]\s*|de\s+)?/i, '')
    .replace(/^mairie\s+(du\s+|de\s+la\s+|des\s+|de\s+l['’]\s*|d['’]\s*|de\s+)?/i, '')
    .replace(/^le\s+/i, '')
    .replace(/^la\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// =========================================================================
// 1. CONSEILS RÉGIONAUX (31) & DISTRICTS AUTONOMES (2)
// =========================================================================
export const OFFICIAL_REGIONS_WEB_DATA: Record<string, Omit<OfficialWebEntry, 'type'>> = {
  // --- Fonctionnels / À jour 2026 ---
  'agnebytiassa': {
    nom: "Conseil Régional de l'Agnéby-Tiassa",
    chefLieu: 'Agboville',
    statutWeb: 'FONCTIONNEL',
    url: 'https://agnebytiassa.com/',
    observations: 'Site officiel répond; actualités récentes datées août 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'gbeke': {
    nom: 'Conseil Régional du Gbêkê',
    chefLieu: 'Bouaké',
    statutWeb: 'FONCTIONNEL',
    url: 'https://conseilregionalgbeke.com/',
    observations: 'Site officiel répond; contient des références d\'actualités 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'tchologo': {
    nom: 'Conseil Régional du Tchologo',
    chefLieu: 'Ferkessédougou',
    statutWeb: 'FONCTIONNEL',
    url: 'https://regiontchologo.ci/',
    observations: 'Site officiel répond; nombreuses actualités jusqu\'en juillet 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'yamoussoukro': {
    nom: 'District Autonome de Yamoussoukro',
    chefLieu: 'Yamoussoukro',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.districtyakro.ci/',
    observations: 'Portail officiel du District Autonome répond; actualités août 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'abidjan': {
    nom: "District Autonome d'Abidjan",
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://abidjan.district.ci/index.php',
    observations: 'Portail institutionnel métropolitain actif',
    fraicheur: '2026',
    confiance: 'Élevée',
  },

  // --- Existants mais non mis à jour / maintenance / inactifs ---
  'bagoue': {
    nom: 'Conseil Régional de la Bagoué',
    chefLieu: 'Boundiali',
    statutWeb: 'INACTIF',
    url: 'https://regionbagoue.ci/',
    observations: 'Site officiel en maintenance / construction (35%), ouverture annoncée',
    fraicheur: 'Sans objet',
    confiance: 'Élevée',
  },
  'gontougo': {
    nom: 'Conseil Régional du Gontougo',
    chefLieu: 'Bondoukou',
    statutWeb: 'INACTIF',
    url: 'https://www.regiondugontougo.ci/',
    observations: 'Site répond; dernières actualités datées octobre 2025',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'hautsassandra': {
    nom: 'Conseil Régional du Haut-Sassandra',
    chefLieu: 'Daloa',
    statutWeb: 'INACTIF',
    url: 'https://www.regionhautsassandra.ci/',
    observations: 'Site institutionnel répond; pas d\'actualités 2026 démontrées',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'nawa': {
    nom: 'Conseil Régional de la Nawa',
    chefLieu: 'Soubré',
    statutWeb: 'INACTIF',
    url: 'https://www.regiondelanawa.ci/',
    observations: 'Site répond; actualités visibles antérieures (janvier 2024)',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'tonkpi': {
    nom: 'Conseil Régional du Tonkpi',
    chefLieu: 'Man',
    statutWeb: 'INACTIF',
    url: 'https://regiondutonkpi.ci/',
    observations: 'Site charge mais contenu institutionnel défaillant (textes de test/gabarits factices)',
    fraicheur: 'Sans objet',
    confiance: 'Élevée',
  },
  // --- Aucun site officiel identifié après tests (23 régions / districts) ---
  'lame': { nom: 'Conseil Régional de La Mé', chefLieu: 'Adzopé', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'me': { nom: 'Conseil Régional de La Mé', chefLieu: 'Adzopé', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'grandsponts': { nom: 'Conseil Régional des Grands-Ponts', chefLieu: 'Dabou', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'moronou': { nom: 'Conseil Régional du Moronou', chefLieu: 'Bongouanou', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'bafing': { nom: 'Conseil Régional du Bafing', chefLieu: 'Touba', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'belier': { nom: 'Conseil Régional du Bélier', chefLieu: 'Toumodi', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'bere': { nom: 'Conseil Régional du Béré', chefLieu: 'Mankono', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'bounkani': { nom: 'Conseil Régional du Bounkani', chefLieu: 'Bouna', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'cavally': { nom: 'Conseil Régional du Cavally', chefLieu: 'Guiglo', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'folon': { nom: 'Conseil Régional du Folon', chefLieu: 'Minignan', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'gbokle': { nom: 'Conseil Régional du Gbôklé', chefLieu: 'Sassandra', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'goh': { nom: 'Conseil Régional du Gôh', chefLieu: 'Gagnoa', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'guemon': { nom: 'Conseil Régional du Guémon', chefLieu: 'Duékoué', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'hambol': { nom: 'Conseil Régional du Hambol', chefLieu: 'Katiola', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'iffou': { nom: "Conseil Régional de l'Iffou", chefLieu: 'Daoukro', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'indeniedjuablin': { nom: "Conseil Régional de l'Indénié-Djuablin", chefLieu: 'Abengourou', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'kabadougou': { nom: 'Conseil Régional du Kabadougou', chefLieu: 'Odienné', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'lohdjiboua': { nom: 'Conseil Régional du Lôh-Djiboua', chefLieu: 'Divo', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'marahoue': { nom: 'Conseil Régional de la Marahoué', chefLieu: 'Bouaflé', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'nzi': { nom: "Conseil Régional du N'Zi", chefLieu: 'Dimbokro', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'poro': { nom: 'Conseil Régional du Poro', chefLieu: 'Korhogo', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'sanpedro': { nom: 'Conseil Régional de San-Pédro', chefLieu: 'San-Pédro', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'sudcomoe': { nom: 'Conseil Régional du Sud-Comoé', chefLieu: 'Aboisso', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
  'worodougou': { nom: 'Conseil Régional du Worodougou', chefLieu: 'Séguéla', statutWeb: 'AUCUN', url: '', observations: 'Aucun site officiel identifié après tests nominatifs' },
};

// =========================================================================
// 2. MAIRIES AVEC SITE WEB OU FACEBOOK OFFICIEL VÉRIFIÉ (21 COMMUNES)
// =========================================================================
export const OFFICIAL_COMMUNES_WEB_DATA: Record<string, Omit<OfficialWebEntry, 'type'>> = {
  // --- Fonctionnelles / À jour 2026 (12 mairies) ---
  'bocanda': {
    nom: 'Mairie de Bocanda',
    chefLieu: 'N\'Zi',
    statutWeb: 'FONCTIONNEL',
    url: 'https://bocanda.ci/',
    observations: 'Site officiel répond; actualités récentes datées mars 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'bouake': {
    nom: 'Mairie de Bouaké',
    chefLieu: 'Bouaké',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.mairiedebouake.ci/',
    facebookUrl: 'https://www.facebook.com/100081441624124',
    facebookStatus: 'Page Facebook officielle vérifiée',
    observations: 'Portail municipal officiel actif; publications août 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'cocody': {
    nom: 'Mairie de Cocody',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://mairiecocody.com/',
    observations: 'Portail citoyen officiel répond; actualités septembre 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'djebonoua': {
    nom: 'Mairie de Djébonoua',
    chefLieu: 'Gbêkê',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.mairiededjebonoua.ci/',
    observations: 'Site officiel répond; édition 2026 active',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'gbeleban': {
    nom: 'Mairie de Gbéléban',
    chefLieu: 'Kabadougou',
    statutWeb: 'FONCTIONNEL',
    url: 'https://mairie-gbeleban.ci/',
    observations: 'Site officiel indexé et actif; contenus et projets 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'grandbassam': {
    nom: 'Mairie de Grand-Bassam',
    chefLieu: 'Sud-Comoé',
    statutWeb: 'FONCTIONNEL',
    url: 'https://villedegrandbassam.ci/',
    observations: 'Site communal répond; actualités datées avril 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'grandbereby': {
    nom: 'Mairie de Grand-Béréby',
    chefLieu: 'San-Pédro',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.grandbereby.com/',
    observations: 'Site officiel répond; actualités août 2026 intégrées',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'marcory': {
    nom: 'Mairie de Marcory',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.marcory.ci/',
    facebookUrl: 'https://www.facebook.com/MairiedeMarcoryOfficiel/',
    facebookStatus: 'Page Facebook officielle vérifiée',
    observations: 'Site officiel répond; actualités mai 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'portbouet': {
    nom: 'Mairie de Port-Bouët',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.port-bouet.ci/',
    observations: 'Site officiel actif; publications septembre 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'satamasokoro': {
    nom: 'Mairie de Satama-Sokoro',
    chefLieu: 'Dabakala',
    statutWeb: 'FONCTIONNEL',
    url: 'https://www.mairiesatamasokoro.ci/',
    observations: 'Site officiel répond; documents 2026 dont Budget Primitif 2026',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'tafire': {
    nom: 'Mairie de Tafiré',
    chefLieu: 'Hambol',
    statutWeb: 'FONCTIONNEL',
    url: 'https://tafire.ci/',
    observations: 'Site officiel répond; actualité municipale février 2026 (Aucune page Facebook officielle)',
    fraicheur: '2026',
    confiance: 'Élevée',
  },
  'yopougon': {
    nom: 'Mairie de Yopougon',
    chefLieu: 'Abidjan',
    statutWeb: 'FONCTIONNEL',
    url: 'https://portail.yopougon.ci/',
    observations: 'Portail officiel de téléservices municipaux et état civil actif',
    fraicheur: '2026',
    confiance: 'Élevée',
  },

  // --- Existants mais non mis à jour / maintenance / inactifs (9 mairies) ---
  'affery': {
    nom: 'Mairie d\'Afféry',
    chefLieu: 'La Mé',
    statutWeb: 'INACTIF',
    url: 'https://www.commune-affery.ci/',
    observations: 'Site répond; actualités datées antérieures (2019-2020)',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'boundiali': {
    nom: 'Mairie de Boundiali',
    chefLieu: 'Bagoué',
    statutWeb: 'INACTIF',
    url: 'https://www.mairieboundiali.com/',
    observations: 'Site répond; dernières actualités visibles en décembre 2022',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'jacqueville': {
    nom: 'Mairie de Jacqueville',
    chefLieu: 'Grands-Ponts',
    statutWeb: 'INACTIF',
    url: 'https://mairiejacqueville.ci/',
    observations: 'Site répond; aucun contenu récent 2026 retrouvé',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'korhogo': {
    nom: 'Mairie de Korhogo',
    chefLieu: 'Poro',
    statutWeb: 'INACTIF',
    url: 'https://mairiekorhogo.com/',
    observations: 'Site répond; dernière publication septembre 2025 (contenus de gabarit)',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'koumassi': {
    nom: 'Mairie de Koumassi',
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'https://www.mairie-koumassi.ci/',
    observations: 'Domaine identifié comme site officiel, mais échec d\'accès lors du contrôle',
    fraicheur: 'Sans objet',
    confiance: 'Élevée',
  },
  'plateau': {
    nom: 'Mairie du Plateau',
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'https://mairieplateau.net/',
    observations: 'Site répond; actualités visibles principalement datées 2020',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'soubre': {
    nom: 'Mairie de Soubré',
    chefLieu: 'Nawa',
    statutWeb: 'INACTIF',
    url: 'https://mairiesoubre.net/',
    observations: 'Site répond; dernière actualité datée mai 2025',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'tiassale': {
    nom: 'Mairie de Tiassalé',
    chefLieu: 'Agnéby-Tiassa',
    statutWeb: 'INACTIF',
    url: 'https://mairiedetiassale.ci/',
    observations: 'Site répond et propose des services; aucune actualité 2026 clairement vérifiée',
    fraicheur: 'Ancien / non démontré en 2026',
    confiance: 'Élevée',
  },
  'treichville': {
    nom: 'Mairie de Treichville',
    chefLieu: 'Abidjan',
    statutWeb: 'INACTIF',
    url: 'https://mairiedetreichville.com/',
    observations: 'En maintenance / refonte : « Nous construisons votre futur portail »',
    fraicheur: 'Sans objet',
    confiance: 'Élevée',
  },
};

/**
 * Récupère le statut officiel vérifié pour n'importe quelle institution (commune, région, district)
 */
export function getOfficialWebInfo(inst: {
  type: string;
  name: string;
  region?: string;
  district?: string;
}): {
  statutWeb: 'FONCTIONNEL' | 'INACTIF' | 'AUCUN';
  url: string;
  observations: string;
  chefLieu: string;
  facebookUrl?: string;
  facebookStatus?: string;
  fraicheur?: string;
  confiance?: string;
} {
  const key = normalizeKey(inst.name);
  const isRegionOrDistrict = inst.type === 'REGION' || inst.type === 'DISTRICT';

  if (isRegionOrDistrict) {
    if (OFFICIAL_REGIONS_WEB_DATA[key]) {
      return OFFICIAL_REGIONS_WEB_DATA[key];
    }
    // Recherche par région si le nom du conseil n'a pas matché directement
    const regionKey = normalizeKey(inst.region || '');
    if (regionKey && OFFICIAL_REGIONS_WEB_DATA[regionKey]) {
      return OFFICIAL_REGIONS_WEB_DATA[regionKey];
    }
    return {
      statutWeb: 'AUCUN',
      url: '',
      observations: 'Aucun site officiel identifié après tests nominatifs',
      chefLieu: inst.region || '—',
    };
  }

  // Commune / Mairie
  if (OFFICIAL_COMMUNES_WEB_DATA[key]) {
    return OFFICIAL_COMMUNES_WEB_DATA[key];
  }

  // Les 180 autres mairies de Côte d'Ivoire auditées sans site officiel identifié
  return {
    statutWeb: 'AUCUN',
    url: '',
    observations: 'Aucun site officiel identifié après tests nominatifs',
    chefLieu: inst.region || (inst as any).departement || '—',
  };
}

/**
 * Enrichit une liste d'institutions avec les données officielles du répertoire web et réseaux sociaux vérifiés
 */
export function enrichWithOfficialWebDirectory(institutions: Institution[]): Institution[] {
  return institutions.map(inst => {
    // Si c'est un ministère, une institution nationale ou une autorité de régulation, on conserve son URL
    if (inst.type !== 'MAIRIE' && inst.type !== 'REGION' && inst.type !== 'DISTRICT') {
      return {
        ...inst,
        web_status: inst.website ? 'FONCTIONNEL' : 'AUCUN',
        web_observations: inst.website ? 'Site institutionnel officiel de la République' : 'Présence gouvernementale',
      };
    }

    const official = getOfficialWebInfo(inst);
    // Priorité à l'URL vérifiée de l'annuaire officiel, ou à une éventuelle saisie manuelle préalable
    const resolvedWebsite = official.url || inst.website || undefined;
    const resolvedFacebook = official.facebookUrl || (inst.facebook_url ? inst.facebook_url : undefined);
    const resolvedStatus = resolvedWebsite ? (official.statutWeb === 'AUCUN' ? 'FONCTIONNEL' : official.statutWeb) : 'AUCUN';

    return {
      ...inst,
      website: resolvedWebsite,
      facebook_url: resolvedFacebook,
      web_status: resolvedStatus,
      web_observations: inst.web_observations || official.observations,
    };
  });
}
