// Moteur d'ingestion budgétaire ministérielle (LOT 3)
// Point d'entrée principal et orchestrateur
// SuiviBudget Côte d'Ivoire - Architecture Budget-Programmes DGBF

import {
  CanonicalMinistryExtraction,
  ValidationResult,
  IngestionReconciliationReport,
  PublicationGateDecision,
  ControlReport,
} from './types';
import { MinistryBudget } from '../types/ministryBudget';
import { validateGenericMinistryBudget } from './validators/genericMinistryValidator';
import { reconcileMinistryBudget } from './reconcilers/ministryReconciler';
import { canPublishMinistryBudget } from './gates/publicationGate';
import { generateControlReport } from './reports/controlReportGenerator';
import { normalizeToApplicationModel } from './normalizers/canonicalNormalizer';

export * from './types';
export * from './validators/genericMinistryValidator';
export * from './reconcilers/ministryReconciler';
export * from './gates/publicationGate';
export * from './reports/controlReportGenerator';
export * from './normalizers/canonicalNormalizer';
export * from './registry/ministryRegistry';

export interface PipelineExecutionResult {
  success: boolean;
  canPublish: boolean;
  validation: ValidationResult;
  reconciliation?: IngestionReconciliationReport;
  gateDecision?: PublicationGateDecision;
  controlReport?: ControlReport;
  normalizedModel?: MinistryBudget;
  blockers: string[];
  warnings: string[];
}

/**
 * Exécute l'ensemble du pipeline d'ingestion budgétaire ministérielle :
 * 1. Validation syntaxique, structurelle et d'intégrité (0 any, strict typing)
 * 2. Réconciliation arithmétique multi-niveaux (Ministère, Programmes, Actions, Projets)
 * 3. Décision du portail de publication (publication gate stricte)
 * 4. Génération du rapport de contrôle d'audit machine-readable
 * 5. Normalisation vers le modèle applicatif MinistryBudget (si publiable)
 */
export function runMinistryIngestionPipeline(
  rawInput: unknown,
  options?: {
    institutionIdOverride?: string;
  }
): PipelineExecutionResult {
  // Étape 1 : Validation
  const validation = validateGenericMinistryBudget(rawInput);

  if (!validation.isValid) {
    return {
      success: false,
      canPublish: false,
      validation,
      blockers: validation.errors.map(e => `[${e.rule}] ${e.message}`),
      warnings: validation.warnings.map(w => `[${w.rule}] ${w.message}`),
    };
  }

  const extraction = rawInput as CanonicalMinistryExtraction;

  // Étape 2 : Réconciliation arithmétique
  const reconciliation = reconcileMinistryBudget(extraction);

  // Étape 3 : Portail de publication
  const gateDecision = canPublishMinistryBudget(validation, reconciliation);

  // Étape 4 : Rapport de contrôle d'audit
  const controlReport = generateControlReport(extraction, reconciliation, validation, gateDecision);

  // Étape 5 : Normalisation vers le modèle applicatif runtime
  let normalizedModel: MinistryBudget | undefined;
  if (gateDecision.canPublish) {
    normalizedModel = normalizeToApplicationModel(extraction, options?.institutionIdOverride);
  }

  return {
    success: true,
    canPublish: gateDecision.canPublish,
    validation,
    reconciliation,
    gateDecision,
    controlReport,
    normalizedModel,
    blockers: gateDecision.blockerReasons,
    warnings: gateDecision.warningReasons,
  };
}
