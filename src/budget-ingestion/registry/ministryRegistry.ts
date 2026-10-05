// Registre central des 35 ministères et institutions gouvernementales (LOT 3)
// Nomenclature Budget-Programmes DGBF 2026
// Invariants : Seul MMPE est 'VERIFIED' / 'PUBLISHED'. Les 34 autres sont 'PENDING_DOCUMENTATION' / 'DRAFT'.
// Aucun import automatique ni fausse publication sans référentiel documentaire canonique validé.

import { MinistryRegistryEntry } from '../types';
import { GOVERNMENT_DATA } from '../../data/governmentData';

export const MMPE_INSTITUTION_ID = 'gov-008';
export const MMPE_DGBF_CODE = '348';

/**
 * Registre central des budgets ministériels pour l'année budgétaire 2026.
 * Indexé par institution_id (clé primaire unique).
 */
export const MINISTRY_REGISTRY: Record<string, MinistryRegistryEntry> = buildRegistry();

function buildRegistry(): Record<string, MinistryRegistryEntry> {
  const registry: Record<string, MinistryRegistryEntry> = {};

  for (const official of GOVERNMENT_DATA) {
    if (official.id === MMPE_INSTITUTION_ID) {
      // MMPE : Ministère Pilote validé et publié (LOT 2)
      registry[official.id] = {
        ministry_code: MMPE_DGBF_CODE,
        ministry_name: "Ministère des Mines, du Pétrole et de l'Énergie",
        institution_id: official.id,
        fiscal_year: 2026,
        canonical_reference_path: 'docs/references/2026/ministry-mines-petroleum-energy/MMPE_CANONICAL_BUDGET_2026.json',
        application_data_path: 'src/data/ministryBudgets/2026/mmpe.json',
        validation_status: 'VERIFIED',
        publication_status: 'PUBLISHED',
      };
    } else {
      // Les 34 autres institutions gouvernementales : En attente d'extraction documentaire contrôlée
      registry[official.id] = {
        ministry_code: official.id, // Code temporaire d'institution avant attribution du code DGBF
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
 * Retourne la liste des ministères en attente de documentation.
 */
export function getPendingMinistries(): MinistryRegistryEntry[] {
  return Object.values(MINISTRY_REGISTRY).filter(m => m.publication_status !== 'PUBLISHED');
}
