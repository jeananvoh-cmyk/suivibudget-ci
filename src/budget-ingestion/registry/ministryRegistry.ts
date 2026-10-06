// Registre central des 35 ministères et institutions gouvernementales (LOT 3 & LOT 4)
// Nomenclature Budget-Programmes DGBF 2026
// Invariants :
// - MMPE est 'VERIFIED' / 'PUBLISHED' (Ministère pilote LOT 2)
// - Les 4 pilotes LOT 4 (MJDH, MEER, MINEDDTE, MINEF) sont 'VERIFIED' / 'STAGED' avec référentiel canonique validé
// - Les 30 autres institutions sont 'PENDING_DOCUMENTATION' / 'DRAFT'
// Aucun import automatique ni fausse publication sans référentiel documentaire canonique validé.

import { MinistryRegistryEntry } from '../types';
import { GOVERNMENT_DATA } from '../../data/governmentData';

export const MMPE_INSTITUTION_ID = 'gov-008';
export const MMPE_DGBF_CODE = '348';

/**
 * Mapping officiel des codes de section budgétaire DGBF pour l'ensemble des 35 membres du gouvernement (LFI 2026).
 */
export const OFFICIAL_DGBF_CODES: Record<string, string> = {
  'gov-001': '108', // Primature
  'gov-002': '226', // Défense
  'gov-003': '237', // Fonction Publique
  'gov-004': '321', // Affaires Étrangères
  'gov-005': '325', // Justice et Droits de l'Homme
  'gov-006': '323', // Intérieur et Sécurité
  'gov-007': '322', // Finances et Budget
  'gov-008': '348', // Mines, Pétrole et Énergie
  'gov-009': '229', // Agriculture et Développement Rural
  'gov-010': '340', // Transports
  'gov-011': '366', // Hydraulique, Assainissement et Salubrité
  'gov-012': '357', // Promotion de la Jeunesse
  'gov-013': '335', // Santé, Hygiène Publique et CMU
  'gov-014': '358', // Construction, Logement et Urbanisme
  'gov-015': '351', // Ressources Animales et Halieutiques
  'gov-016': '376', // Portefeuille de l'État
  'gov-017': '336', // Communication
  'gov-018': '345', // Eaux et Forêts
  'gov-019': '347', // Commerce et Industrie
  'gov-020': '350', // Tourisme et Loisirs
  'gov-021': '328', // Économie, Plan et Développement
  'gov-022': '333', // Enseignement Supérieur
  'gov-023': '362', // Emploi et Protection Sociale
  'gov-024': '331', // Éducation Nationale
  'gov-025': '330', // Équipement et Entretien Routier
  'gov-026': '369', // Cohésion Nationale, Solidarité
  'gov-027': '356', // Transition Numérique
  'gov-028': '352', // Femme, Famille et Enfant
  'gov-029': '346', // Culture et Francophonie
  'gov-030': '444', // Sports et Cadre de Vie
  'gov-031': '343', // Environnement et Transition Écologique
  'gov-032': '440', // Affaires Maritimes (Ministère Délégué autonome — LFI 2026 section 440)
  'gov-033': '439', // Intégration Africaine (Ministère Délégué autonome — LFI 2026 section 439 / DPPD-PAP p. 1085)
  'gov-034': '334', // Enseignement Technique (Ministère Délégué autonome — LFI 2026 section 334)
  'gov-035': '229', // Productions Vivrières (Ministre Délégué rattaché budgétairement à la section 229 unifiée Agriculture — seul doublon officiel LFI)
};

/**
 * Référentiels canoniques documentés pour les ministères pilotes (LOT 2 & LOT 4).
 */
export const PILOT_CANONICAL_REFERENCES: Record<string, {
  canonicalPath: string;
  applicationPath?: string;
  publicationStatus: 'PUBLISHED' | 'STAGED';
}> = {
  'gov-008': {
    canonicalPath: 'docs/references/2026/ministry-mines-petroleum-energy/MMPE_CANONICAL_BUDGET_2026.json',
    applicationPath: 'src/data/ministryBudgets/2026/mmpe.json',
    publicationStatus: 'PUBLISHED',
  },
  'gov-005': {
    canonicalPath: 'docs/references/2026/ministry-justice-human-rights/MJDH_CANONICAL_BUDGET_2026.json',
    publicationStatus: 'STAGED',
  },
  'gov-025': {
    canonicalPath: 'docs/references/2026/ministry-equipment-road-maintenance/MEER_CANONICAL_BUDGET_2026.json',
    publicationStatus: 'STAGED',
  },
  'gov-031': {
    canonicalPath: 'docs/references/2026/ministry-environment-ecological-transition/MINEDDTE_CANONICAL_BUDGET_2026.json',
    publicationStatus: 'STAGED',
  },
  'gov-018': {
    canonicalPath: 'docs/references/2026/ministry-water-forests/MINEF_CANONICAL_BUDGET_2026.json',
    publicationStatus: 'STAGED',
  },
};

/**
 * Registre central des budgets ministériels pour l'année budgétaire 2026.
 * Indexé par institution_id (clé primaire unique).
 */
export const MINISTRY_REGISTRY: Record<string, MinistryRegistryEntry> = buildRegistry();

function buildRegistry(): Record<string, MinistryRegistryEntry> {
  const registry: Record<string, MinistryRegistryEntry> = {};

  for (const official of GOVERNMENT_DATA) {
    const dgbfCode = OFFICIAL_DGBF_CODES[official.id] || official.id;
    const pilotConfig = PILOT_CANONICAL_REFERENCES[official.id];

    if (pilotConfig) {
      registry[official.id] = {
        ministry_code: dgbfCode,
        ministry_name: official.department_ministry,
        institution_id: official.id,
        fiscal_year: 2026,
        canonical_reference_path: pilotConfig.canonicalPath,
        application_data_path: pilotConfig.applicationPath || '',
        validation_status: 'VERIFIED',
        publication_status: pilotConfig.publicationStatus,
      };
    } else {
      registry[official.id] = {
        ministry_code: dgbfCode,
        ministry_name: official.department_ministry,
        institution_id: official.id,
        fiscal_year: 2026,
        canonical_reference_path: '',
        application_data_path: '',
        validation_status: 'PENDING_DOCUMENTATION',
        publication_status: 'DRAFT',
      };
    }
  }

  return registry;
}

/**
 * Récupère l'entrée de registre pour un ministère donné par institution_id ou ministry_code.
 */
export function getMinistryRegistryEntry(identifier: string): MinistryRegistryEntry | undefined {
  if (!identifier) return undefined;
  if (MINISTRY_REGISTRY[identifier]) {
    return MINISTRY_REGISTRY[identifier];
  }
  return Object.values(MINISTRY_REGISTRY).find(
    entry => entry.ministry_code === identifier || entry.institution_id === identifier
  );
}

/**
 * Retourne la liste complète des ministères enregistrés (35 institutions).
 */
export function listRegisteredMinistries(): MinistryRegistryEntry[] {
  return Object.values(MINISTRY_REGISTRY);
}

/**
 * Indique si un ministère est actuellement publié sur la plateforme.
 */
export function isMinistryPublished(identifier: string): boolean {
  const entry = getMinistryRegistryEntry(identifier);
  return entry ? entry.publication_status === 'PUBLISHED' : false;
}

/**
 * Retourne la liste des ministères actuellement publiés.
 */
export function getPublishedMinistries(): MinistryRegistryEntry[] {
  return Object.values(MINISTRY_REGISTRY).filter(m => m.publication_status === 'PUBLISHED');
}

/**
 * Retourne la liste des ministères vérifiés (référentiel canonique validé).
 */
export function getVerifiedMinistries(): MinistryRegistryEntry[] {
  return Object.values(MINISTRY_REGISTRY).filter(m => m.validation_status === 'VERIFIED');
}

/**
 * Retourne la liste des ministères en attente de publication ou de documentation.
 */
export function getPendingMinistries(): MinistryRegistryEntry[] {
  return Object.values(MINISTRY_REGISTRY).filter(m => m.publication_status !== 'PUBLISHED');
}
