import { BudgetProject, Institution } from '../types';

/**
 * Normalisation canonique des noms de communes
 * Supprime les préfixes "Mairie de", "Commune de", les accents, et la ponctuation
 */
export function normalizeCommuneName(str?: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^MAIRIE\s+DE\s+/i, '')
    .replace(/^MAIRIE\s+D['’]/i, '')
    .replace(/^COMMUNE\s+DE\s+/i, '')
    .replace(/^COMMUNE\s+D['’]/i, '')
    .replace(/[^A-Z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalisation canonique des noms de régions et districts
 */
export function normalizeRegionName(str?: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^CONSEIL\s+REGIONAL\s+(DU\s+|DE\s+LA\s+|DES\s+|DE\s+|D['’])?/i, '')
    .replace(/^REGION\s+(DU\s+|DE\s+LA\s+|DES\s+|DE\s+|D['’])?/i, '')
    .replace(/^DISTRICT\s+AUTONOME\s+(DU\s+|DE\s+LA\s+|DES\s+|DE\s+|D['’])?/i, '')
    .replace(/[^A-Z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalisation canonique des ministères et institutions nationales
 */
export function normalizeMinistryName(str?: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^MINISTERE\s+D['’]ETAT,?\s*/i, '')
    .replace(/^MINISTERE\s+DELEGUE\s+(AUPRES\s+DU\s+|AUPRES\s+DE\s+LA\s+|CHARGE\s+DE\s+|CHARGE\s+DES\s+|CHARGE\s+DU\s+|CHARGE\s+D['’])?/i, '')
    .replace(/^MINISTERE\s+(DE\s+LA\s+|DE\s+L['’]|DES\s+|DU\s+|D['’])?/i, '')
    .replace(/[^A-Z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Correspondance entre les dénominations ministérielles actuelles (Gouvernement 2026)
 * et la nomenclature officielle des portefeuilles dans le Budget de l'État (LFI 2026 / DGBF)
 */
export const MINISTRY_BUDGET_ALIASES: Record<string, string[]> = {
  "MINISTÈRE DE L'URBANISME, DU LOGEMENT ET DU CADRE DE VIE": [
    "Ministère de la Construction, du Logement et de l'Urbanisme"
  ],
  "MINISTÈRE DU COMMERCE, DE L'INDUSTRIE ET DE L'ARTISANAT": [
    "Ministère du Commerce et de l'Industrie"
  ],
  "MINISTÈRE DE L'ENVIRONNEMENT ET DE LA TRANSITION ÉCOLOGIQUE": [
    "Ministère de l'Environnement, du Développement Durable et de la Transition Ecologique"
  ],
  "MINISTÈRE DE LA TRANSITION NUMÉRIQUE ET DE L'INNOVATION TECHNOLOGIQUE": [
    "Ministère de la Transition Numérique et de la Digitalisation"
  ],
  "MINISTÈRE DE L'EMPLOI, DE LA PROTECTION SOCIALE ET DE LA FORMATION PROFESSIONNELLE": [
    "Ministère de l'Emploi et de la Protection Sociale",
    "Ministère de l'Enseignement Technique, de la Formation Professionnelle et de l'Apprentissage"
  ],
  "MINISTÈRE DE L'ÉDUCATION NATIONALE, DE L'ALPHABÉTISATION ET DE L'ENSEIGNEMENT TECHNIQUE": [
    "Ministère de l'Education Nationale et de l'Alphabétisation"
  ],
  "MINISTÈRE DÉLÉGUÉ CHARGÉ DE L'ENSEIGNEMENT TECHNIQUE": [
    "Ministère de l'Enseignement Technique, de la Formation Professionnelle et de l'Apprentissage"
  ],
  "MINISTÈRE DES INFRASTRUCTURES ET DE L'ENTRETIEN ROUTIER": [
    "Ministère de l'Equipement et de l'Entretien Routier"
  ],
  "MINISTÈRE DÉLÉGUÉ CHARGÉ DES AFFAIRES MARITIMES": [
    "Ministère Délégué auprès du Ministre des Transports, chargé des Affaires Maritimes"
  ],
  "MINISTÈRE DÉLÉGUÉ CHARGÉ DE L'INTÉGRATION AFRICAINE": [
    "Ministère Délégué auprès du Ministre des Affaires Etrangères, de l'Intégration Africaine et des Ivoiriens de l'Extérieur, chargé de l'Intégration Africaine et des Ivoiriens de l'Extérieur"
  ],
  "MINISTÈRE DÉLÉGUÉ CHARGÉ DES SPORTS ET DU CADRE DE VIE": [
    "Ministère Délégué auprès du Premier Ministre, Ministre des Sports et du Cadre de Vie, chargé des Sports et du Cadre de Vie"
  ],
  "MINISTÈRE DÉLÉGUÉ CHARGÉ DES PRODUCTIONS VIVRIÈRES": [
    "Ministère d'Etat, Ministère de l'Agriculture, du Développement Rural et des Productions Vivrières"
  ]
};

/**
 * Récupère de manière stricte et sans contamination croisée la liste des projets
 * d'investissement public appartenant légitimement à une institution donnée.
 *
 * RÈGLES DE CONTRÔLE CITOYEN :
 * 1. Mairie : Ne contient QUE les projets municipaux de sa propre commune (p.commune_name).
 *    JAMAIS de projets d'autres communes, JAMAIS de projets de conseils régionaux, JAMAIS de recherche dans le titre.
 * 2. Conseil Régional : Ne contient QUE les projets régionaux de son conseil (p.region_name ou p.commune_name = Conseil Régional).
 * 3. District Autonome : Ne contient QUE les projets affectés au District Autonome.
 * 4. Ministère : Ne contient QUE les projets nationaux d'investissement pilotés par ce ministère dans la LFI 2026.
 */
export function getProjectsForInstitution(
  institution?: Institution | null,
  allProjects?: BudgetProject[]
): BudgetProject[] {
  if (!institution || !allProjects || allProjects.length === 0) {
    return [];
  }

  // -------------------------------------------------------------
  // 1. MAIRIE / COMMUNE (Niveau Local Municipal Décentralisé)
  // -------------------------------------------------------------
  if (institution.type === 'MAIRIE') {
    const targetCommuneNorm = normalizeCommuneName(institution.name);

    return allProjects.filter(p => {
      // Exclure formellement tout projet régional ou national
      if (p.id.startsWith('proj-reg-')) return false;
      if (p.scope_level === 'NATIONAL') return false;
      if (p.commune_name?.toLowerCase().startsWith('conseil')) return false;

      // Correspondance exacte sur la commune
      const projCommuneNorm = normalizeCommuneName(p.commune_name);
      return projCommuneNorm === targetCommuneNorm;
    });
  }

  // -------------------------------------------------------------
  // 2. CONSEIL RÉGIONAL (Niveau Régional Décentralisé)
  // -------------------------------------------------------------
  if (institution.type === 'REGION') {
    const targetRegionNorm = normalizeRegionName(institution.region);
    const targetNameNorm = normalizeRegionName(institution.name);

    return allProjects.filter(p => {
      // Exclure formellement les projets municipaux et nationaux
      if (p.id.startsWith('proj-com-') || p.id.startsWith('proj-bouake-')) return false;
      if (p.scope_level === 'NATIONAL') return false;

      const projRegionNorm = normalizeRegionName(p.region_name);
      const projCommuneNorm = normalizeRegionName(p.commune_name);

      return (
        (projRegionNorm && (projRegionNorm === targetRegionNorm || projRegionNorm === targetNameNorm)) ||
        (projCommuneNorm && (projCommuneNorm === targetNameNorm || projCommuneNorm === targetRegionNorm))
      );
    });
  }

  // -------------------------------------------------------------
  // 3. DISTRICT AUTONOME (Abidjan / Yamoussoukro)
  // -------------------------------------------------------------
  if (institution.type === 'DISTRICT') {
    const targetNameNorm = normalizeRegionName(institution.name);
    const targetRegionNorm = normalizeRegionName(institution.region);

    return allProjects.filter(p => {
      if (p.id.startsWith('proj-com-') || p.id.startsWith('proj-bouake-')) return false;

      const projCommuneNorm = normalizeRegionName(p.commune_name);
      const projInstNorm = normalizeRegionName(p.institution_name);
      const projRegionNorm = normalizeRegionName(p.region_name);

      if (targetNameNorm.includes('YAMOUSSOUKRO') || targetRegionNorm.includes('YAMOUSSOUKRO')) {
        return (
          projCommuneNorm.includes('YAMOUSSOUKRO') ||
          projInstNorm.includes('YAMOUSSOUKRO') ||
          (projRegionNorm === 'YAMOUSSOUKRO' && p.id.startsWith('proj-reg-'))
        );
      }

      if (targetNameNorm.includes('ABIDJAN') || targetRegionNorm.includes('ABIDJAN')) {
        return (
          (projCommuneNorm.includes('DISTRICT AUTONOME D ABIDJAN') ||
            projInstNorm.includes('DISTRICT AUTONOME D ABIDJAN')) &&
          !p.id.startsWith('proj-com-')
        );
      }

      return projCommuneNorm === targetNameNorm || projInstNorm === targetNameNorm;
    });
  }

  // -------------------------------------------------------------
  // 4. MINISTÈRES, INSTITUTIONS NATIONALES & AUTORITÉS DE RÉGULATION
  // -------------------------------------------------------------
  const instNorm = normalizeMinistryName(institution.name);
  const aliases = (MINISTRY_BUDGET_ALIASES[institution.name] || []).map(normalizeMinistryName);
  const targetNorms = [instNorm, ...aliases].filter(Boolean);

  return allProjects.filter(p => {
    // Ne retenir que les projets nationaux / d'État
    if (p.id.startsWith('proj-com-') || p.id.startsWith('proj-bouake-') || p.id.startsWith('proj-reg-')) {
      return false;
    }

    const projMinNorm = normalizeMinistryName(p.ministry_name || '');
    const projInstNorm = normalizeMinistryName(p.institution_name || '');
    const projServiceNorm = normalizeMinistryName(p.service_name || '');

    return targetNorms.some(target => {
      if (!target) return false;
      return (
        (projMinNorm && (projMinNorm === target || projMinNorm.includes(target) || target.includes(projMinNorm))) ||
        (projInstNorm && (projInstNorm === target || projInstNorm.includes(target) || target.includes(projInstNorm))) ||
        (projServiceNorm && (projServiceNorm === target || projServiceNorm.includes(target) || target.includes(projServiceNorm)))
      );
    });
  });
}
