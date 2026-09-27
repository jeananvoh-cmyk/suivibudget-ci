import { Institution, PrimitiveBudgetInfo } from '../types';

/**
 * Base de données des Budgets Primitifs Officiels votés par les Conseils Municipaux
 * et rendus publics par les canaux officiels de l'État de Côte d'Ivoire (AIP, délibérations, arrêtés).
 * 
 * Cette base permet la « Double Lecture Certifiée » :
 * 1. Concours & Subventions de l'État (Loi de Finances / DGBF)
 * 2. Ressources Propres & Fiscalité Locale Partagée (Délibération municipale & DGI)
 */
export const OFFICIAL_PRIMITIVE_BUDGETS: Record<string, PrimitiveBudgetInfo> = {
  // Mairie de Tiassalé
  'inst-com-tiassale': {
    total_voted_fcfa: 1760000000,
    investment_voted_fcfa: 1073600000, // 61%
    functioning_voted_fcfa: 686400000,  // 39%
    voted_date: '07 novembre 2025',
    source: 'Agence Ivoirienne de Presse (AIP) & Conseil Municipal de Tiassalé',
    source_url: 'https://aip.ci/141097/cote-divoire-aip-le-conseil-municipal-de-tiassale-adopte-son-budget-primitif-2026-a-lunanimite/',
    projects_count: 54,
    session_notes: 'Adopté à l\'unanimité lors de la 4ème session ordinaire sous la présidence du député-maire Antoine Assalé Tiémoko. 54 opérations programmées avec 61% des ressources allouées à l\'investissement socio-économique.'
  },

  // Mairie de Tafiré
  'inst-com-tafire': {
    total_voted_fcfa: 825150000,
    investment_voted_fcfa: 571150000, // 69,2%
    functioning_voted_fcfa: 254000000,  // 30,8%
    voted_date: '14 février 2026',
    source: 'Agence Ivoirienne de Presse (AIP) & Conseil Municipal de Tafiré',
    source_url: 'https://aip.ci/168487/cote-divoire-aip-tafire-un-budget-primitif-2026-de-plus-de-825-millions-fcfa-adopte/',
    projects_count: 36,
    session_notes: 'Adopté lors de la 1ère session ordinaire sous la présidence du maire Coulibaly Sounkalo (dit Charles Sanga) en présence du sous-préfet Marcel Brou N\'Dépo. Près de 70% alloué aux investissements (36 projets).'
  },

  // Mairie de Bingerville
  'inst-com-bingerville': {
    total_voted_fcfa: 4046222000,
    investment_voted_fcfa: 2168370370, // 53,59%
    functioning_voted_fcfa: 1877851630,  // 46,41%
    voted_date: '31 octobre 2025',
    source: 'Agence Ivoirienne de Presse (AIP) & Conseil Municipal de Bingerville',
    source_url: 'https://aip.ci/139369/cote-divoire-aip-le-conseil-municipal-de-bingerville-adopte-un-budget-primitif-de-plus-de-quatre-milliards-de-fcfa-pour-lannee-2026/',
    session_notes: 'Adopté lors de la 4ème session ordinaire sous la présidence du maire Issouf Doumbia, en présence du préfet de région. Priorité aux voiries, assainissement et sécurité.'
  },

  // Mairie de Touba
  'inst-com-touba': {
    total_voted_fcfa: 1410000000,
    investment_voted_fcfa: 1110000000, // 78,7%
    functioning_voted_fcfa: 300000000,   // 21,3%
    voted_date: '23 janvier 2026',
    source: 'Agence Ivoirienne de Presse (AIP) & Conseil Municipal de Touba',
    source_url: 'https://aip.ci/162817/cote-divoire-aip-le-conseil-municipal-de-touba-adopte-un-budget-primitif-de-141-milliard-fcfa-pour-2026/',
    session_notes: 'Adopté sous la présidence du maire Moussa Sanogo. 78% alloué aux investissements structurants.'
  },

  // Mairie de M'Bahiakro
  'inst-com-m-bahiakro': {
    total_voted_fcfa: 1165711000,
    investment_voted_fcfa: 699426600, // 60%
    functioning_voted_fcfa: 466284400,  // 40%
    voted_date: '20 janvier 2026',
    source: 'Agence Ivoirienne de Presse (AIP) & Conseil Municipal de M\'Bahiakro',
    source_url: 'https://aip.ci/161838/cote-divoire-aip-le-budget-primitif-2026-de-la-mairie-de-mbahiakro-en-hausse-de-plus-de-379-millions-fcfa/',
    session_notes: 'Budget en hausse de 48% par rapport à 2025, adopté sous la présidence du maire Diamala Kouassi Raphaël.'
  }
};

/**
 * Enrichit les communes avec les budgets primitifs officiels votés
 */
export function enrichWithPrimitiveBudgets(communes: Institution[]): Institution[] {
  return communes.map(commune => {
    const primitive = OFFICIAL_PRIMITIVE_BUDGETS[commune.id];
    if (primitive) {
      return {
        ...commune,
        primitive_budget: primitive
      };
    }
    return commune;
  });
}
