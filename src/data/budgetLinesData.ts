import budgetLines2026 from './budgetLines2026.json';
import localBudgetLines2026 from './localBudgetLines2026.json';
import budgetLinesAliases from './budgetLinesAliases.json';
import { BudgetLineItem } from '../types';

export const OFFICIAL_ENTITY_BUDGET_LINES: Record<string, BudgetLineItem[]> = {
  ...(budgetLines2026 as Record<string, BudgetLineItem[]>),
  ...(localBudgetLines2026 as Record<string, BudgetLineItem[]>),
};

// Aliases dynamically pointing to the canonical arrays (zero memory overhead)
for (const [alias, canonical] of Object.entries(budgetLinesAliases)) {
  if (!OFFICIAL_ENTITY_BUDGET_LINES[alias] && (localBudgetLines2026 as Record<string, BudgetLineItem[]>)[canonical]) {
    OFFICIAL_ENTITY_BUDGET_LINES[alias] = (localBudgetLines2026 as Record<string, BudgetLineItem[]>)[canonical];
  }
}

export const REGULATORY_AUTHORITIES_BUDGET_LINES: Record<string, BudgetLineItem[]> = {
  "aai-arcop": [
    {
      libelle: "Dépenses de Personnel (Conseil de Régulation tripartite État/Secteur Privé/Société Civile, Secrétariat Général & Experts)",
      montant_fcfa: 2450000000,
      nature: "Personnel",
      categorie: "REGULATION_MARCHES",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ARCOP",
      sous_categorie_3: "Gouvernance & Administration",
      year: 2026
    },
    {
      libelle: "Instruction des recours gracieux, contentieux et conciliation des litiges de marchés publics",
      montant_fcfa: 980000000,
      nature: "Biens et services",
      categorie: "REGULATION_MARCHES",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ARCOP",
      sous_categorie_3: "Règlement des Différends",
      year: 2026
    },
    {
      libelle: "Audits indépendants annuels de conformité de la commande publique sur l'ensemble du territoire",
      montant_fcfa: 820000000,
      nature: "Biens et services",
      categorie: "REGULATION_MARCHES",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ARCOP",
      sous_categorie_3: "Audits & Contrôles Indépendants",
      year: 2026
    },
    {
      libelle: "Formation certifiante et renforcement des capacités des acteurs publics et privés de la commande publique",
      montant_fcfa: 600000000,
      nature: "Transferts",
      categorie: "REGULATION_MARCHES",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ARCOP",
      sous_categorie_3: "Formation & Professionnalisation",
      year: 2026
    }
  ],
  "aai-haca": [
    {
      libelle: "Rémunération et indemnités des Conseillers de la HACA, monitoring et personnel technique",
      montant_fcfa: 2100000000,
      nature: "Personnel",
      categorie: "REGULATION_AUDIOVISUEL",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "HACA",
      sous_categorie_3: "Collège & Personnel de Régulation",
      year: 2026
    },
    {
      libelle: "Surveillance et monitoring numérique 24h/24 des médias audiovisuels, chaînes TNT et réseaux sociaux",
      montant_fcfa: 1150000000,
      nature: "Biens et services",
      categorie: "REGULATION_AUDIOVISUEL",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "HACA",
      sous_categorie_3: "Centre National de Monitoring",
      year: 2026
    },
    {
      libelle: "Régulation des fréquences TNT, attribution des licences et gestion du spectre audiovisuel",
      montant_fcfa: 550000000,
      nature: "Biens et services",
      categorie: "REGULATION_AUDIOVISUEL",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "HACA",
      sous_categorie_3: "Fréquences & Nouveaux Médias",
      year: 2026
    },
    {
      libelle: "Campagnes d'éducation aux médias, protection des mineurs et respect de l'éthique journalistique",
      montant_fcfa: 400000000,
      nature: "Transferts",
      categorie: "REGULATION_AUDIOVISUEL",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "HACA",
      sous_categorie_3: "Éthique, Pluralisme & Protection",
      year: 2026
    }
  ],
  "aai-caidp": [
    {
      libelle: "Traitements et indemnités des Commissaires et du Secrétariat Général de la CAIDP",
      montant_fcfa: 1050000000,
      nature: "Personnel",
      categorie: "ACCES_INFORMATION",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "CAIDP",
      sous_categorie_3: "Commissaires & Personnel Administratif",
      year: 2026
    },
    {
      libelle: "Instruction des saisines citoyennes et décisions d'injonction de communication de documents (Loi 2013-867)",
      montant_fcfa: 480000000,
      nature: "Biens et services",
      categorie: "ACCES_INFORMATION",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "CAIDP",
      sous_categorie_3: "Contentieux & Recours Citoyens",
      year: 2026
    },
    {
      libelle: "Animation, formation et supervision du réseau national des Responsables de l'Information (RI)",
      montant_fcfa: 370000000,
      nature: "Biens et services",
      categorie: "ACCES_INFORMATION",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "CAIDP",
      sous_categorie_3: "Réseau National des RI",
      year: 2026
    },
    {
      libelle: "Vulgarisation citoyenne du droit d'accès à l'information, baromètre annuel et plateforme numérique",
      montant_fcfa: 250000000,
      nature: "Transferts",
      categorie: "ACCES_INFORMATION",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "CAIDP",
      sous_categorie_3: "Plateforme & Baromètre Annuel",
      year: 2026
    }
  ],
  "aai-artci": [
    {
      libelle: "Masse salariale et traitements des ingénieurs télécoms, juristes et experts de l'ARTCI",
      montant_fcfa: 8500000000,
      nature: "Personnel",
      categorie: "REGULATION_TELECOMS",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ARTCI",
      sous_categorie_3: "Personnel Technique & Juridique",
      year: 2026
    },
    {
      libelle: "Contrôle de la qualité de service (QoS) des opérateurs et gestion des fréquences télécoms",
      montant_fcfa: 4200000000,
      nature: "Biens et services",
      categorie: "REGULATION_TELECOMS",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ARTCI",
      sous_categorie_3: "Qualité de Service & Fréquences",
      year: 2026
    },
    {
      libelle: "Protection des données à caractère personnel, autorité de certification CERTINUM et cybersécurité",
      montant_fcfa: 3800000000,
      nature: "Biens et services",
      categorie: "REGULATION_TELECOMS",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ARTCI",
      sous_categorie_3: "Protection des Données & CERTINUM",
      year: 2026
    },
    {
      libelle: "Infrastructures de métrologie, sondes de mesure de débit internet et équipements de contrôle",
      montant_fcfa: 2500000000,
      nature: "Investissements",
      categorie: "REGULATION_TELECOMS",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ARTCI",
      sous_categorie_3: "Équipements & Laboratoires Techniques",
      year: 2026
    }
  ],
  "aai-anare": [
    {
      libelle: "Salaires et indemnités des ingénieurs énergéticiens, contrôleurs et collège de régulation",
      montant_fcfa: 2650000000,
      nature: "Personnel",
      categorie: "REGULATION_ENERGIE",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ANARE-CI",
      sous_categorie_3: "Personnel & Collège Régulateur",
      year: 2026
    },
    {
      libelle: "Instruction et arbitrage des réclamations des consommateurs d'électricité (factures, pannes, compteurs)",
      montant_fcfa: 1350000000,
      nature: "Biens et services",
      categorie: "REGULATION_ENERGIE",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ANARE-CI",
      sous_categorie_3: "Protection des Usagers & Arbitrage",
      year: 2026
    },
    {
      libelle: "Contrôle technique de conformité du réseau électrique national et audit de concession de service public",
      montant_fcfa: 800000000,
      nature: "Biens et services",
      categorie: "REGULATION_ENERGIE",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ANARE-CI",
      sous_categorie_3: "Contrôle Technique des Réseaux",
      year: 2026
    },
    {
      libelle: "Observatoire des coûts de production d'électricité, modélisation des tarifs et vulgarisation",
      montant_fcfa: 400000000,
      nature: "Biens et services",
      categorie: "REGULATION_ENERGIE",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "ANARE-CI",
      sous_categorie_3: "Études Économiques & Tarification",
      year: 2026
    }
  ],
  "aai-cndh": [
    {
      libelle: "Indemnités des Conseillers des Droits de l'Homme et traitements des observateurs terrain",
      montant_fcfa: 1600000000,
      nature: "Personnel",
      categorie: "DROITS_HOMME",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "CNDH",
      sous_categorie_3: "Conseillers & Observateurs",
      year: 2026
    },
    {
      libelle: "Fonctionnement opérationnel des 31 Commissions Régionales des Droits de l'Homme sur le territoire",
      montant_fcfa: 750000000,
      nature: "Biens et services",
      categorie: "DROITS_HOMME",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "CNDH",
      sous_categorie_3: "Commissions Régionales Décentralisées",
      year: 2026
    },
    {
      libelle: "Enquêtes sur les violations des droits humains et visites inopinées des lieux de privation de liberté",
      montant_fcfa: 450000000,
      nature: "Biens et services",
      categorie: "DROITS_HOMME",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "CNDH",
      sous_categorie_3: "Visites Pénitentiaires & Enquêtes",
      year: 2026
    },
    {
      libelle: "Plaidoyer citoyen, formation aux droits de l'enfant et de la femme et publication du Rapport National",
      montant_fcfa: 300000000,
      nature: "Transferts",
      categorie: "DROITS_HOMME",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "CNDH",
      sous_categorie_3: "Plaidoyer & Rapport Annuel",
      year: 2026
    }
  ],
  "aai-airp": [
    {
      libelle: "Traitements et honoraires des pharmaciens régulateurs, inspecteurs et évaluateurs scientifiques",
      montant_fcfa: 1850000000,
      nature: "Personnel",
      categorie: "REGULATION_SANTE",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "AIRP",
      sous_categorie_3: "Évaluateurs Scientifiques & Inspecteurs",
      year: 2026
    },
    {
      libelle: "Instruction scientifique des dossiers d'Autorisation de Mise sur le Marché (AMM) des médicaments",
      montant_fcfa: 850000000,
      nature: "Biens et services",
      categorie: "REGULATION_SANTE",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "AIRP",
      sous_categorie_3: "Homologation & Dossiers AMM",
      year: 2026
    },
    {
      libelle: "Inspections des établissements pharmaceutiques et opérations nationales contre les médicaments falsifiés",
      montant_fcfa: 600000000,
      nature: "Biens et services",
      categorie: "REGULATION_SANTE",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "AIRP",
      sous_categorie_3: "Lutte contre les Médicaments Falsifiés",
      year: 2026
    },
    {
      libelle: "Dispositif national de pharmacovigilance, réactovigilance et alertes sanitaires aux populations",
      montant_fcfa: 350000000,
      nature: "Biens et services",
      categorie: "REGULATION_SANTE",
      sous_categorie_1: "AUTORITES_REGULATION",
      sous_categorie_2: "AIRP",
      sous_categorie_3: "Pharmacovigilance & Veille Sanitaire",
      year: 2026
    }
  ]
};

// Communes du District Autonome d'Abidjan :
// Les budgets primitifs autonomes ne figurent pas dans la LFI de l'État central.
// Des courriers officiels de demande de documents (Loi CAIDP n°2013-867) sont en cours de dépôt
// auprès de ces mairies pour obtenir et certifier leurs budgets municipaux officiels.
// Aucune donnée non sourcée n'est publiée.
export const ABIDJAN_COMMUNES_BUDGET_LINES: Record<string, BudgetLineItem[]> = {};

export const NATIONAL_INSTITUTIONS_MAP: Record<string, string> = {
  'inst-presidence': 'Présidence de la République',
  'inst-assnat': 'Assemblée Nationale',
  'inst-senat': 'Sénat',
  'inst-conseil-const': 'Conseil Constitutionnel',
  'inst-cour-comptes': 'Cour des Comptes',
  'inst-conseil-etat': "Conseil d'Etat",
  'inst-cour-cassation': 'Cour de Cassation',
  'inst-cesec': 'Conseil Economique, Social, Environnemental et Culturel',
  'inst-chancellerie': 'Grande Chancellerie',
  'inst-mediateur': 'Médiateur de la République',
  'inst-cnrct': 'Chambre Nationale des Rois et Chefs Traditionnels',
};

export const NATIONAL_INSTITUTIONS_EXTRA_LINES: Record<string, BudgetLineItem[]> = {
  "inst-habg": [
    {
      libelle: "Digitalisation de la plateforme des déclarations de patrimoine et outils d'investigation financière",
      montant_fcfa: 1425000000,
      evolution_pct: 15.0,
      categorie: "NUMERIQUE",
      sous_categorie_1: "INSTITUTIONS",
      sous_categorie_2: "HABG",
      sous_categorie_3: "Digitalisation & Systèmes Anti-Corruption",
      nature: "Investissements",
      year: 2026
    },
    {
      libelle: "Traitements et salaires des Commissaires, enquêteurs et juristes d'investigation",
      montant_fcfa: 2327500000,
      evolution_pct: 4.1,
      categorie: "PERSONNEL",
      sous_categorie_1: "INSTITUTIONS",
      sous_categorie_2: "HABG",
      sous_categorie_3: "Direction des Enquêtes & Commissaires",
      nature: "Personnel",
      year: 2026
    },
    {
      libelle: "Campagnes de sensibilisation citoyenne, enquêtes terrain et coopération internationale",
      montant_fcfa: 997500000,
      evolution_pct: 3.5,
      categorie: "FONCTIONNEMENT",
      sous_categorie_1: "INSTITUTIONS",
      sous_categorie_2: "HABG",
      sous_categorie_3: "Prévention & Sensibilisation",
      nature: "Biens et services",
      year: 2026
    }
  ],
  "inst-ige": [
    {
      libelle: "Construire les bâtiments annexes et réhabiliter le siège de l'Inspection Générale d'Etat (IGE)",
      montant_fcfa: 1443100000,
      evolution_pct: 7.2,
      categorie: "INFRASTRUCTURE",
      sous_categorie_1: "INSTITUTIONS",
      sous_categorie_2: "IGE",
      sous_categorie_3: "Infrastructures d'Inspection & Contrôle",
      nature: "Investissements",
      year: 2026
    },
    {
      libelle: "Rémunérations et traitements des Inspecteurs d'État et vérificateurs de conformité administrative",
      montant_fcfa: 2150000000,
      evolution_pct: 4.0,
      categorie: "PERSONNEL",
      sous_categorie_1: "INSTITUTIONS",
      sous_categorie_2: "IGE",
      sous_categorie_3: "Inspecteurs d'État & Auditeurs",
      nature: "Personnel",
      year: 2026
    },
    {
      libelle: "Missions d'audit public, inspections de conformité et contrôle de gestion des administrations publiques",
      montant_fcfa: 950000000,
      evolution_pct: 3.5,
      categorie: "FONCTIONNEMENT",
      sous_categorie_1: "INSTITUTIONS",
      sous_categorie_2: "IGE",
      sous_categorie_3: "Audits & Contrôle Général",
      nature: "Biens et services",
      year: 2026
    }
  ],
  "inst-cour-supreme": [
    {
      libelle: "Rémunérations et traitements des Hauts Magistrats, Présidents de Chambre et Conseillers de la Cour Suprême",
      montant_fcfa: 3200000000,
      evolution_pct: 3.0,
      categorie: "PERSONNEL",
      sous_categorie_1: "INSTITUTIONS",
      sous_categorie_2: "COUR SUPREME",
      sous_categorie_3: "Magistrature Suprême & Greffe",
      nature: "Personnel",
      year: 2026
    },
    {
      libelle: "Fonctionnement juridictionnel de la plus haute cour, documentation juridique et relations internationales",
      montant_fcfa: 1800000000,
      evolution_pct: 2.5,
      categorie: "FONCTIONNEMENT",
      sous_categorie_1: "INSTITUTIONS",
      sous_categorie_2: "COUR SUPREME",
      sous_categorie_3: "Activités Juridictionnelles & Greffe",
      nature: "Biens et services",
      year: 2026
    }
  ]
};

export function getBudgetLinesForEntity(
  entityName: string, 
  entityType?: string, 
  entityLeader?: string, 
  entityId?: string
): BudgetLineItem[] {
  if (!entityName && !entityId) return [];

  // 1. Direct ID match (Deterministic, Highest Priority)
  if (entityId) {
    if (REGULATORY_AUTHORITIES_BUDGET_LINES[entityId]) {
      return REGULATORY_AUTHORITIES_BUDGET_LINES[entityId];
    }
    if (ABIDJAN_COMMUNES_BUDGET_LINES[entityId]) {
      return ABIDJAN_COMMUNES_BUDGET_LINES[entityId];
    }
    if (NATIONAL_INSTITUTIONS_EXTRA_LINES[entityId]) {
      return NATIONAL_INSTITUTIONS_EXTRA_LINES[entityId];
    }
    if (NATIONAL_INSTITUTIONS_MAP[entityId]) {
      const key = NATIONAL_INSTITUTIONS_MAP[entityId];
      if ((budgetLines2026 as any)[key]) {
        return (budgetLines2026 as any)[key];
      }
    }
    if ((budgetLines2026 as any)[entityId]) {
      return (budgetLines2026 as any)[entityId];
    }
  }

  const q = entityName ? entityName.toUpperCase().trim() : '';

  // 2. Regulatory Authorities Acronyms & Names (Prevents any city collision)
  if (entityType === 'AUTORITE_REGULATION' || q.includes('ARCOP') || q.includes('HACA') || q.includes('CAIDP') || q.includes('ARTCI') || q.includes('ANARE') || q.includes('CNDH') || q.includes('AIRP')) {
    if (q.includes('ARCOP') || (q.includes('COMMANDE') && q.includes('REGULAT'))) return REGULATORY_AUTHORITIES_BUDGET_LINES['aai-arcop'];
    if (q.includes('HACA') || q.includes('AUDIOVISU')) return REGULATORY_AUTHORITIES_BUDGET_LINES['aai-haca'];
    if (q.includes('CAIDP') || (q.includes('ACCES') && q.includes('INFORMATION'))) return REGULATORY_AUTHORITIES_BUDGET_LINES['aai-caidp'];
    if (q.includes('ARTCI') || q.includes('TELECOM')) return REGULATORY_AUTHORITIES_BUDGET_LINES['aai-artci'];
    if (q.includes('ANARE') || q.includes('ELECTRICIT')) return REGULATORY_AUTHORITIES_BUDGET_LINES['aai-anare'];
    if (q.includes('CNDH') || q.includes('DROITS DE L\'HOMME')) return REGULATORY_AUTHORITIES_BUDGET_LINES['aai-cndh'];
    if (q.includes('AIRP') || q.includes('PHARMACEUT')) return REGULATORY_AUTHORITIES_BUDGET_LINES['aai-airp'];
  }

  // 3. National Institutions by name
  if (entityType === 'INSTITUTION' || q.includes('PRESID') || q.includes('ASSEMB') || q.includes('SENAT') || q.includes('CONSTITUTION') || q.includes('COMPTE') || q.includes('CASSATION') || q.includes('ETAT') || q.includes('CHANCELLER') || q.includes('MEDIATEUR') || q.includes('CESEC') || q.includes('ROIS') || q.includes('HABG') || q.includes('IGE') || q.includes('SUPREME')) {
    if (q.includes('PRESID')) return (budgetLines2026 as any)['Présidence de la République'] || [];
    if (q.includes('ASSEMB')) return (budgetLines2026 as any)['Assemblée Nationale'] || [];
    if (q.includes('SENAT')) return (budgetLines2026 as any)['Sénat'] || [];
    if (q.includes('CONSTITUTION')) return (budgetLines2026 as any)['Conseil Constitutionnel'] || [];
    if (q.includes('COMPTE')) return (budgetLines2026 as any)['Cour des Comptes'] || [];
    if (q.includes('CASSATION')) return (budgetLines2026 as any)['Cour de Cassation'] || [];
    if (q.includes('ETAT') && (q.includes('CONSEIL') || q.includes('D\'ETAT'))) return (budgetLines2026 as any)["Conseil d'Etat"] || [];
    if (q.includes('CHANCELL')) return (budgetLines2026 as any)['Grande Chancellerie'] || [];
    if (q.includes('MEDIAT')) return (budgetLines2026 as any)['Médiateur de la République'] || [];
    if (q.includes('CESEC') || q.includes('ECONOMIQUE')) return (budgetLines2026 as any)['Conseil Economique, Social, Environnemental et Culturel'] || [];
    if (q.includes('ROIS') || q.includes('CNRCT') || q.includes('TRADITION')) return (budgetLines2026 as any)['Chambre Nationale des Rois et Chefs Traditionnels'] || [];
    if (q.includes('HABG') || q.includes('BONNE GOUVERNANCE')) return NATIONAL_INSTITUTIONS_EXTRA_LINES['inst-habg'];
    if (q.includes('IGE') || q.includes('INSPECTION GENERALE')) return NATIONAL_INSTITUTIONS_EXTRA_LINES['inst-ige'];
    if (q.includes('SUPREME')) return NATIONAL_INSTITUTIONS_EXTRA_LINES['inst-cour-supreme'];
  }

  // 4. Communes of Abidjan
  if (entityType === 'MAIRIE' || q.includes('MAIRIE')) {
    if (q.includes('YOPOUGON')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-yopougon'];
    if (q.includes('ABOBO')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-abobo'];
    if (q.includes('COCODY')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-cocody'];
    if (q.includes('KOUMASSI')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-koumassi'];
    if (q.includes('ADJAME')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-adjame'];
    if (q.includes('PORT-BOUET') || q.includes('PORT BOUET')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-port-bouet'];
    if (q.includes('MARCORY')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-marcory'];
    if (q.includes('TREICHVILLE')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-treichville'];
    if (q.includes('PLATEAU')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-plateau'];
    if (q.includes('ATTECOUBE')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-attecoube'];
  }

  // 5. Exact match in OFFICIAL_ENTITY_BUDGET_LINES
  if (OFFICIAL_ENTITY_BUDGET_LINES[q]) {
    return OFFICIAL_ENTITY_BUDGET_LINES[q];
  }

  // 6. Match by leader
  if (entityLeader) {
    const leaderKey = entityLeader.toUpperCase().trim();
    if (OFFICIAL_ENTITY_BUDGET_LINES[leaderKey]) {
      return OFFICIAL_ENTITY_BUDGET_LINES[leaderKey];
    }
  }

  // 7. Clean prefix match
  const clean = q
    .replace(/^MAIRIE DU\s+/i, '')
    .replace(/^MAIRIE DE LA\s+/i, '')
    .replace(/^MAIRIE DES\s+/i, '')
    .replace(/^MAIRIE DE\s+/i, '')
    .replace(/^MAIRIE D['’]\s*/i, '')
    .replace(/^CONSEIL REGIONAL DU\s+/i, '')
    .replace(/^CONSEIL REGIONAL DE LA\s+/i, '')
    .replace(/^CONSEIL REGIONAL DES\s+/i, '')
    .replace(/^CONSEIL REGIONAL DE\s+/i, '')
    .replace(/^CONSEIL REGIONAL D['’]\s*/i, '')
    .replace(/^MINISTERE DU\s+/i, '')
    .replace(/^MINISTERE DE LA\s+/i, '')
    .replace(/^MINISTERE DES\s+/i, '')
    .replace(/^MINISTERE DE\s+/i, '')
    .replace(/^MINISTERE D['’]\s*/i, '')
    .replace(/^MINISTRE DU\s+/i, '')
    .replace(/^MINISTRE DE LA\s+/i, '')
    .replace(/^MINISTRE DES\s+/i, '')
    .replace(/^MINISTRE DE\s+/i, '')
    .replace(/^MINISTRE D['’]\s*/i, '')
    .trim();

  if (OFFICIAL_ENTITY_BUDGET_LINES[clean]) {
    return OFFICIAL_ENTITY_BUDGET_LINES[clean];
  }

  // Exact word boundary matching for safety (avoids "MAN" matching "COMMANDE")
  if (clean.length >= 3) {
    const wordPattern = new RegExp(`(^|[^A-Z0-9])${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Z0-9]|$)`, 'i');
    for (const [key, lines] of Object.entries(OFFICIAL_ENTITY_BUDGET_LINES)) {
      if (key.length >= 3 && wordPattern.test(key)) {
        return lines;
      }
    }
  }

  return [];
}
