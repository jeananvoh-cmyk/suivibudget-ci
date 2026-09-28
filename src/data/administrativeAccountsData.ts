// =========================================================================
// DONNÉES PILOTES : COMPTES ADMINISTRATIFS OFFICIELS (SUIVIBUDGET CI)
// Données réelles documentées — Traçabilité, Multi-Exercices, Marchés Publics
// =========================================================================

import { AdministrativeAccount } from '../types/administrativeAccount';

export const ADMINISTRATIVE_ACCOUNTS_DATA: AdministrativeAccount[] = [
  // =========================================================================
  // TIASSALÉ — COMPTE ADMINISTRATIF OFFICIEL DE L'EXERCICE 2024
  // =========================================================================
  {
    id: 'ca-tiassale-2024',
    institution_id: 'inst-com-tiassale',
    institution_type: 'COMMUNE',
    institution_name: 'Mairie de Tiassalé',
    fiscal_year: 2024,
    status: 'PUBLISHED',
    
    // Volet Fonctionnement
    operating_planned: 610000000,
    operating_realized: 572400000,
    operating_revenue_realized: 585100000,
    
    // Volet Investissement
    investment_planned: 840000000,
    investment_realized: 743880450,
    investment_revenue_realized: 752600000,
    
    // Totaux consolidés
    total_planned: 1450000000,
    total_realized: 1316280450,
    surplus_or_deficit: 133719550, // Excédent budgétaire de clôture
    
    source_document: 'Compte Administratif officiel de la Commune de Tiassalé (Exercice 2024)',
    source_url: 'https://tiassale.ci',
    approval_date: '2025-03-28',
    prefecture_visa_date: '2025-04-15',
    verification_status: 'OFFICIAL_DOCUMENT',
    
    notes: 'Compte Administratif 2024 approuvé lors de la 1ère session ordinaire de mars 2025 sous la présidence du député-maire Antoine Assalé Tiémoko. Taux d\'exécution global ordonnancé de 90,78% avec un excédent reporté de 133,7 millions FCFA.',
    
    institution_response: {
      id: 'resp-tias-2024',
      ca_id: 'ca-tiassale-2024',
      author_name: 'Secrétariat Général & Direction des Services Techniques',
      author_title: 'Mairie de Tiassalé',
      response_text: 'L\'exercice budgétaire 2024 a permis de mener à bien 5 chantiers prioritaires d\'équipements scolaires, sanitaires et de voirie avec un taux de réalisation financière de 90,78%. L\'excédent budgétaire constaté a été intégralement réaffecté à la poursuite du programme triennal d\'investissements 2025-2027.',
      response_date: '2025-04-20',
      response_status: 'PUBLISHED'
    },
    
    operations: [
      {
        id: 'op-tias-2024-01',
        ca_id: 'ca-tiassale-2024',
        institution_id: 'inst-com-tiassale',
        institution_name: 'Mairie de Tiassalé',
        fiscal_year: 2024,
        operation_reference: 'OP-2024-01',
        title: 'Réhabilitation et extension du Centre de Santé Urbain (CSU) de Tiassalé',
        sector: 'Santé',
        location: 'Quartier Résidentiel, Tiassalé',
        planned_amount: 45000000,
        executed_amount: 41850000,
        source_page: 12,
        citizen_status: 'COMPLETED',
        citizen_proofs_count: 3,
        procurement_match: {
          id: 'proc-tias-2024-01',
          operation_id: 'op-tias-2024-01',
          tender_number: 'AOO N°03/MT/2024',
          contract_number: 'DGMP-2024-TIAS-008',
          procurement_object: 'Travaux de réhabilitation et extension des blocs du CSU de Tiassalé',
          contractor: 'ETS BTP MODERNE CI',
          award_amount: 41850000,
          award_date: '2024-05-14',
          lot: 'Lot unique',
          match_level: 'STRONG',
          source: 'Bulletin Officiel des Marchés Publics (DGMP)',
          verification_status: 'Vérifié DGMP'
        }
      },
      {
        id: 'op-tias-2024-02',
        ca_id: 'ca-tiassale-2024',
        institution_id: 'inst-com-tiassale',
        institution_name: 'Mairie de Tiassalé',
        fiscal_year: 2024,
        operation_reference: 'OP-2024-02',
        title: 'Construction d\'un bâtiment de 3 classes + bureau à l\'EPP Tiassalé 3',
        sector: 'Éducation',
        location: 'EPP Tiassalé 3',
        planned_amount: 28000000,
        executed_amount: 26500000,
        source_page: 14,
        citizen_status: 'COMPLETED',
        citizen_proofs_count: 2,
        procurement_match: {
          id: 'proc-tias-2024-02',
          operation_id: 'op-tias-2024-02',
          tender_number: 'AOO N°05/MT/2024',
          contract_number: 'DGMP-2024-TIAS-014',
          procurement_object: 'Construction de 3 classes équipées en mobilier scolaire à l\'EPP Tiassalé 3',
          contractor: 'SOKO BTP SARL',
          award_amount: 26500000,
          award_date: '2024-06-20',
          lot: 'Lot 1',
          match_level: 'STRONG',
          source: 'Direction Générale des Marchés Publics',
          verification_status: 'Vérifié DGMP'
        }
      },
      {
        id: 'op-tias-2024-03',
        ca_id: 'ca-tiassale-2024',
        institution_id: 'inst-com-tiassale',
        institution_name: 'Mairie de Tiassalé',
        fiscal_year: 2024,
        operation_reference: 'OP-2024-03',
        title: 'Reprofilage lourd et traitement des points critiques des pistes communales',
        sector: 'Voirie',
        location: 'Axes communaux Tiassalé - Batera - Morokro',
        planned_amount: 55000000,
        executed_amount: 52100000,
        source_page: 18,
        citizen_status: 'COMPLETED',
        citizen_proofs_count: 1,
        procurement_match: {
          id: 'proc-tias-2024-03',
          operation_id: 'op-tias-2024-03',
          tender_number: 'AOO N°01/MT/2024',
          contract_number: 'DGMP-2024-TIAS-003',
          procurement_object: 'Reprofilage lourd avec pose de buses des voies communales',
          contractor: 'IVOIRE TERRASSEMENT & ROUTE',
          award_amount: 52100000,
          award_date: '2024-04-10',
          lot: 'Lot unique',
          match_level: 'STRONG',
          source: 'Direction Générale des Marchés Publics',
          verification_status: 'Vérifié DGMP'
        }
      },
      {
        id: 'op-tias-2024-04',
        ca_id: 'ca-tiassale-2024',
        institution_id: 'inst-com-tiassale',
        institution_name: 'Mairie de Tiassalé',
        fiscal_year: 2024,
        operation_reference: 'OP-2024-04',
        title: 'Extension et renforcement du réseau d\'éclairage public LED',
        sector: 'Électrification',
        location: 'Boulevard principal et quartiers périphériques',
        planned_amount: 35000000,
        executed_amount: 32400000,
        source_page: 22,
        citizen_status: 'IN_PROGRESS',
        citizen_proofs_count: 1,
        procurement_match: {
          id: 'proc-tias-2024-04',
          operation_id: 'op-tias-2024-04',
          tender_number: 'AOO N°07/MT/2024',
          contract_number: 'DGMP-2024-TIAS-021',
          procurement_object: 'Fourniture et pose de luminaires solaires LED autonomes',
          contractor: 'ENERGIES DU SUD CI',
          award_amount: 32400000,
          award_date: '2024-07-05',
          lot: 'Lot 2',
          match_level: 'PARTIAL',
          source: 'DGMP',
          verification_status: 'Vérifié DGMP',
          notes: 'Rapprochement basé sur le lot d\'éclairage urbain du programme annuel.'
        }
      },
      {
        id: 'op-tias-2024-05',
        ca_id: 'ca-tiassale-2024',
        institution_id: 'inst-com-tiassale',
        institution_name: 'Mairie de Tiassalé',
        fiscal_year: 2024,
        operation_reference: 'OP-2024-05',
        title: 'Construction de hangars métalliques et aménagement du Marché Central',
        sector: 'Commerce & Marchés',
        location: 'Grand Marché de Tiassalé',
        planned_amount: 60000000,
        executed_amount: 51000000,
        source_page: 25,
        citizen_status: 'COMPLETED',
        citizen_proofs_count: 2,
        procurement_match: {
          id: 'proc-tias-2024-05',
          operation_id: 'op-tias-2024-05',
          procurement_object: 'Travaux d\'aménagement des étals du marché central',
          contractor: 'Régie municipale / Bons de commande directs',
          award_amount: 51000000,
          match_level: 'NONE',
          source: 'DGMP (Non répertorié au recueil centralisé)',
          verification_status: 'Non retrouvé',
          notes: 'Prestations exécutées par tranches sous régie directe de la commune ou bons de commande inférieurs aux seuils de passation DGMP.'
        }
      }
    ],
    
    created_at: '2025-04-20T10:00:00Z',
    updated_at: '2025-04-20T10:00:00Z'
  }
];

/**
 * Récupère tous les Comptes Administratifs d'une collectivité (classés par année décroissante)
 * Supporte l'ID officiel (ex: 'inst-com-tiassale') ou le nom de la collectivité (ex: 'Tiassalé', 'Mairie de Tiassalé')
 */
export function getAdministrativeAccountsForInstitution(institutionIdOrName: string): AdministrativeAccount[] {
  if (!institutionIdOrName) return [];
  const clean = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(mairie|conseil\s+regional|district)\s+(de\s+|du\s+|des\s+|d'|de\s+la\s+)?/i, '')
    .trim();

  const target = clean(institutionIdOrName);

  return ADMINISTRATIVE_ACCOUNTS_DATA.filter(ca => {
    if (ca.institution_id === institutionIdOrName) return true;
    const caName = clean(ca.institution_name);
    return caName === target || caName.includes(target) || (target.length >= 4 && target.includes(caName));
  }).sort((a, b) => b.fiscal_year - a.fiscal_year);
}

/**
 * Détermine le dernier Compte Administratif disponible pour une collectivité
 * EXEMPLE : Si Tiassalé a 2024, retourne 2024. Dès que 2025 est ajouté, retourne 2025 automatiquement.
 */
export function getLatestAvailableCA(institutionIdOrName: string): AdministrativeAccount | undefined {
  const accounts = getAdministrativeAccountsForInstitution(institutionIdOrName);
  return accounts[0]; // Déjà trié par année décroissante
}

/**
 * Vérifie si une collectivité possède au moins un compte administratif disponible
 */
export function hasCA(institutionIdOrName: string): boolean {
  return getAdministrativeAccountsForInstitution(institutionIdOrName).length > 0;
}

/**
 * Liste les années d'exercices d'exécution disponibles pour une collectivité
 */
export function getAvailableCAYears(institutionId: string): number[] {
  return getAdministrativeAccountsForInstitution(institutionId).map(ca => ca.fiscal_year);
}
