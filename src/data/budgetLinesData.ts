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

/**
 * No 2026 per-line appropriations for regulators have been independently documented.
 * Annex 6 global ASS budget figures do not justify invented personnel/activity breakdowns.
 * Reintroduce lines only with per-line official provenance, year and explicit measure.
 */
export const REGULATORY_AUTHORITIES_BUDGET_LINES: Record<string, BudgetLineItem[]> = {
  "aai-arcop": [],
  "aai-haca": [],
  "aai-caidp": [],
  "aai-artci": [],
  "aai-anare": [],
  "aai-cndh": [],
  "aai-airp": [],
};

// Municipal figures must be proven by the municipality's own budget, not by the State grant.
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

/** No detailed 2026 budget lines are published for HABG or IGE without per-line official provenance. */
export const NATIONAL_INSTITUTIONS_EXTRA_LINES: Record<string, BudgetLineItem[]> = {
  'inst-habg': [],
  'inst-ige': [],
};

export function getBudgetLinesForEntity(
  entityName: string, 
  entityType?: string, 
  entityLeader?: string, 
  entityId?: string
): BudgetLineItem[] {
  if (!entityName && !entityId) return [];

  // Global regulator budgets (when proven) are not substitutes for per-line evidence.
  const regulatorIds = new Set(['aai-arcop', 'aai-haca', 'aai-caidp', 'aai-artci', 'aai-anare', 'aai-cndh', 'aai-airp']);
  if (entityId && regulatorIds.has(entityId)) return [];
  const query = (entityName || '').toUpperCase();
  if (entityType === 'AUTORITE_REGULATION' || ['ARCOP', 'HACA', 'CAIDP', 'ARTCI', 'ANARE', 'CNDH', 'AIRP'].some(acronym => query.includes(acronym))) return [];

  // HABG/IGE have official programme amounts but no independently sourced detailed lines.
  // Block alias/fallback matching from reintroducing legacy illustrative allocations.
  if (entityId === 'inst-habg' || entityId === 'inst-ige' ||
      (entityType === 'GRANDE_INSTITUTION' && /\b(HABG|HAUTE AUTORITÉ POUR LA BONNE GOUVERNANCE|HAUTE AUTORITE POUR LA BONNE GOUVERNANCE|IGE|INSPECTION GÉNÉRALE D['’]ÉTAT|INSPECTION GENERALE D['’]ETAT)\b/i.test(entityName))) return [];

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
    if (q.includes('SUPREME')) return [];
  }

  // 4. Communes of Abidjan
  if (entityType === 'MAIRIE' || q.includes('MAIRIE')) {
    if (q.includes('YOPOUGON')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-yopougon'] || [];
    if (q.includes('ABOBO')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-abobo'] || [];
    if (q.includes('COCODY')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-cocody'] || [];
    if (q.includes('KOUMASSI')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-koumassi'] || [];
    if (q.includes('ADJAME')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-adjame'] || [];
    if (q.includes('PORT-BOUET') || q.includes('PORT BOUET')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-port-bouet'] || [];
    if (q.includes('MARCORY')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-marcory'] || [];
    if (q.includes('TREICHVILLE')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-treichville'] || [];
    if (q.includes('PLATEAU')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-plateau'] || [];
    if (q.includes('ATTECOUBE')) return ABIDJAN_COMMUNES_BUDGET_LINES['inst-com-attecoube'] || [];
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
    .replace(/^DISTRICT AUTONOME DU\s+/i, '')
    .replace(/^DISTRICT AUTONOME DE LA\s+/i, '')
    .replace(/^DISTRICT AUTONOME DES\s+/i, '')
    .replace(/^DISTRICT AUTONOME DE\s+/i, '')
    .replace(/^DISTRICT AUTONOME D['’]\s*/i, '')
    .replace(/^DISTRICT DU\s+/i, '')
    .replace(/^DISTRICT DE\s+/i, '')
    .replace(/^DISTRICT D['’]\s*/i, '')
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
