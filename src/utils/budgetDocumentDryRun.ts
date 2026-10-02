// =========================================================================
// MOTEUR DE DRY-RUN & CONTRÔLE PRÉALABLE DES DOCUMENTS BUDGÉTAIRES
// SuiviBudget Côte d'Ivoire — Prévention des doublons, conflits et fausses données
// =========================================================================

import type { Institution } from '../types';
import type { LocalBudget } from '../types/localBudget';
import type { AdministrativeAccount } from '../types/administrativeAccount';
import type {
  DocumentIngestionMetadata,
  ProposedFinancialValue,
  DocumentDryRunResult,
  BudgetDocumentCategory
} from '../types/budgetCycle';

/**
 * Génère le squelette des valeurs financières proposées selon la catégorie de document
 * CONTRAT PROPRE : Aucune simulation de fausse IA. Structure les champs nécessaires pour la validation humaine.
 */
export function buildProposedValuesTemplate(
  category: BudgetDocumentCategory,
  initialValues: Partial<Record<string, number | null>> = {}
): ProposedFinancialValue[] {
  switch (category) {
    case 'BUDGET_PRIMITIF':
      return [
        {
          id: 'val-total',
          field: 'total_amount',
          label: 'Montant Total Voté',
          section: 'GLOBAL',
          nature: 'PREVISION',
          amount: initialValues.total_amount ?? null,
          precision: initialValues.total_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.total_amount != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-operating',
          field: 'operating_amount',
          label: 'Dépenses de Fonctionnement',
          section: 'FONCTIONNEMENT',
          nature: 'PREVISION',
          amount: initialValues.operating_amount ?? null,
          precision: initialValues.operating_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.operating_amount != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-investment',
          field: 'investment_amount',
          label: 'Dépenses d\'Investissement',
          section: 'INVESTISSEMENT',
          nature: 'PREVISION',
          amount: initialValues.investment_amount ?? null,
          precision: initialValues.investment_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.investment_amount != null ? 'VALIDATED' : 'PENDING'
        }
      ];

    case 'BUDGET_SUPPLEMENTAIRE':
    case 'BUDGET_MODIFICATIF':
    case 'DECISION_MODIFICATIVE':
    case 'VIREMENT_CREDITS':
      return [
        {
          id: 'val-mod-total',
          field: 'total_amount',
          label: 'Variation Nette Totale (Delta)',
          section: 'GLOBAL',
          nature: 'MODIFICATION',
          amount: initialValues.total_amount ?? null,
          precision: initialValues.total_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.total_amount != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-mod-operating',
          field: 'operating_amount',
          label: 'Variation Fonctionnement (Delta)',
          section: 'FONCTIONNEMENT',
          nature: 'MODIFICATION',
          amount: initialValues.operating_amount ?? null,
          precision: initialValues.operating_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.operating_amount != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-mod-investment',
          field: 'investment_amount',
          label: 'Variation Investissement (Delta)',
          section: 'INVESTISSEMENT',
          nature: 'MODIFICATION',
          amount: initialValues.investment_amount ?? null,
          precision: initialValues.investment_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.investment_amount != null ? 'VALIDATED' : 'PENDING'
        }
      ];

    case 'COMPTE_ADMINISTRATIF':
      return [
        {
          id: 'val-ca-total-planned',
          field: 'total_planned',
          label: 'Total Prévu (Primitif)',
          section: 'GLOBAL',
          nature: 'PREVISION',
          amount: initialValues.total_planned ?? null,
          precision: initialValues.total_planned != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.total_planned != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-ca-total-realized',
          field: 'total_realized',
          label: 'Total Réalisé (Ordonnancé)',
          section: 'GLOBAL',
          nature: 'EXECUTION',
          amount: initialValues.total_realized ?? null,
          precision: initialValues.total_realized != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.total_realized != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-ca-operating-planned',
          field: 'operating_planned',
          label: 'Fonctionnement Prévu',
          section: 'FONCTIONNEMENT',
          nature: 'PREVISION',
          amount: initialValues.operating_planned ?? null,
          precision: initialValues.operating_planned != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.operating_planned != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-ca-operating-realized',
          field: 'operating_realized',
          label: 'Fonctionnement Réalisé',
          section: 'FONCTIONNEMENT',
          nature: 'EXECUTION',
          amount: initialValues.operating_realized ?? null,
          precision: initialValues.operating_realized != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.operating_realized != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-ca-investment-planned',
          field: 'investment_planned',
          label: 'Investissement Prévu',
          section: 'INVESTISSEMENT',
          nature: 'PREVISION',
          amount: initialValues.investment_planned ?? null,
          precision: initialValues.investment_planned != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.investment_planned != null ? 'VALIDATED' : 'PENDING'
        },
        {
          id: 'val-ca-investment-realized',
          field: 'investment_realized',
          label: 'Investissement Réalisé',
          section: 'INVESTISSEMENT',
          nature: 'EXECUTION',
          amount: initialValues.investment_realized ?? null,
          precision: initialValues.investment_realized != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: initialValues.investment_realized != null ? 'VALIDATED' : 'PENDING'
        }
      ];

    default:
      return [
        {
          id: 'val-custom-amount',
          field: 'amount',
          label: 'Montant Principal de l\'Acte',
          section: 'GLOBAL',
          nature: 'PREVISION',
          amount: initialValues.total_amount ?? null,
          precision: initialValues.total_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'HIGH',
          status: 'PENDING'
        }
      ];
  }
}

/**
 * Exécute un dry-run strict avant tout import ou enregistrement documentaire
 */
export function runDocumentDryRun(
  metadata: DocumentIngestionMetadata,
  values: ProposedFinancialValue[],
  context: {
    knownInstitutions: Institution[];
    existingBudgets: LocalBudget[];
    existingAccounts: AdministrativeAccount[];
  }
): DocumentDryRunResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conflicts: string[] = [];

  // 1. Contrôle de l'institution
  const institution = context.knownInstitutions.find(i => i.id === metadata.institution_id);
  const institutionExists = !!institution;
  if (!institutionExists) {
    errors.push(`Collectivité inconnue : ID "${metadata.institution_id}" introuvable dans le référentiel des collectivités.`);
  }

  // 2. Contrôle de l'exercice fiscal
  const fiscalYearCoherent = Number.isInteger(metadata.fiscal_year) && 
    metadata.fiscal_year >= 2000 && 
    metadata.fiscal_year <= 2100;
  if (!fiscalYearCoherent) {
    errors.push(`Exercice incohérent : "${metadata.fiscal_year}". L'année budgétaire doit être comprise entre 2000 et 2100.`);
  }

  // 3. Contrôle des métadonnées de source (Provenance obligatoire)
  const sourceNameValid = !!metadata.source_name && metadata.source_name.trim().length >= 3;
  const sourceRefValid = !!metadata.source_reference && metadata.source_reference.trim().length >= 2;
  const sourceDateValid = !!metadata.source_date && /^\d{4}-\d{2}-\d{2}$/.test(metadata.source_date);
  const sourceMetadataComplete = sourceNameValid && sourceRefValid && sourceDateValid;

  if (!sourceNameValid) {
    errors.push('Source obligatoire : Le nom du document ou de l\'émetteur officiel doit contenir au moins 3 caractères.');
  }
  if (!sourceRefValid) {
    errors.push('Référence obligatoire : La référence officielle de l\'acte (n° délibération, visa, décret) est requise.');
  }
  if (!sourceDateValid) {
    errors.push('Date obligatoire : La date de l\'acte ou de consultation doit respecter le format AAAA-MM-JJ.');
  }

  // 4. Contrôle des doublons et conflits avec versions publiées
  let duplicateDetected = false;
  let conflictsWithPublished = false;

  if (metadata.document_type === 'BUDGET_PRIMITIF') {
    const existingPublishedBP = context.existingBudgets.find(
      b => b.institution_id === metadata.institution_id && 
           b.fiscal_year === metadata.fiscal_year && 
           b.status === 'PUBLISHED' &&
           b.budget_type === 'PRIMITIF_ADOPTE'
    );
    if (existingPublishedBP) {
      conflictsWithPublished = true;
      conflicts.push(`Un Budget Primitif PUBLIÉ existe déjà pour ${institution?.name || metadata.institution_id} en ${metadata.fiscal_year} (${existingPublishedBP.total_amount?.toLocaleString('fr-FR')} FCFA). Une nouvelle version doit incrémenter le numéro de version.`);
    }
  } else if (metadata.document_type === 'COMPTE_ADMINISTRATIF') {
    const existingCA = context.existingAccounts.find(
      a => a.institution_id === metadata.institution_id && 
           a.fiscal_year === metadata.fiscal_year
    );
    if (existingCA) {
      duplicateDetected = true;
      if (existingCA.status === 'PUBLISHED') {
        conflictsWithPublished = true;
        conflicts.push(`Un Compte Administratif PUBLIÉ existe déjà pour ${institution?.name || metadata.institution_id} en ${metadata.fiscal_year}. Écrasement interdit.`);
      } else {
        warnings.push(`Un Compte Administratif au statut ${existingCA.status} existe déjà pour cet exercice.`);
      }
    }
  }

  // 5. Contrôle des valeurs et cohérence arithmétique
  let unknownValuesCount = 0;
  let zeroValuesCount = 0;
  let arithmeticValid = true;

  const validValues = values.filter(v => v.status !== 'REJECTED');

  for (const val of validValues) {
    if (val.amount === null || val.precision === 'UNKNOWN') {
      unknownValuesCount++;
      // Vérifier la règle d'or : NULL != 0
      if (val.precision === 'UNKNOWN' && val.amount !== null) {
        errors.push(`Règle d'or violée : Le champ "${val.label}" est marqué UNKNOWN mais contient une valeur non nulle (${val.amount}). Une valeur indéterminée doit être null.`);
      }
    } else if (val.amount === 0) {
      zeroValuesCount++;
    }
  }

  // Vérification arithmétique globale pour les budgets primitifs
  if (['BUDGET_PRIMITIF', 'BUDGET_MODIFICATIF', 'BUDGET_SUPPLEMENTAIRE'].includes(metadata.document_type)) {
    const totalVal = validValues.find(v => v.field === 'total_amount');
    const opVal = validValues.find(v => v.field === 'operating_amount');
    const invVal = validValues.find(v => v.field === 'investment_amount');

    if (totalVal && opVal && invVal && 
        totalVal.amount !== null && opVal.amount !== null && invVal.amount !== null &&
        totalVal.precision === 'EXACT' && opVal.precision === 'EXACT' && invVal.precision === 'EXACT') {
      const sum = opVal.amount + invVal.amount;
      if (sum !== totalVal.amount) {
        arithmeticValid = false;
        errors.push(`Incompatibilité arithmétique : Fonctionnement (${opVal.amount.toLocaleString('fr-FR')}) + Investissement (${invVal.amount.toLocaleString('fr-FR')}) = ${sum.toLocaleString('fr-FR')} FCFA, mais Total = ${totalVal.amount.toLocaleString('fr-FR')} FCFA (écart de ${Math.abs(sum - totalVal.amount).toLocaleString('fr-FR')} FCFA).`);
      }
    }
  }

  // Si des valeurs ont été rejetées
  const rejectedCount = values.filter(v => v.status === 'REJECTED').length;
  if (rejectedCount > 0) {
    warnings.push(`${rejectedCount} valeur(s) marquée(s) comme rejetée(s) et exclue(s) du lot.`);
  }

  const isValid = errors.length === 0 && conflicts.length === 0;
  const canImport = isValid;

  let summaryMessage = '';
  if (!isValid) {
    summaryMessage = `Simulation échouée : ${errors.length} erreur(s) bloquante(s), ${conflicts.length} conflit(s).`;
  } else if (warnings.length > 0) {
    summaryMessage = `Simulation réussie avec ${warnings.length} avertissement(s). Prêt pour import contrôlé.`;
  } else {
    summaryMessage = 'Simulation réussie à 100 %. Tous les contrôles de conformité et de provenance sont satisfaits.';
  }

  return {
    is_valid: isValid,
    can_import: canImport,
    errors,
    warnings,
    conflicts,
    checks: {
      institution_exists: institutionExists,
      fiscal_year_coherent: fiscalYearCoherent,
      source_metadata_complete: sourceMetadataComplete,
      duplicate_detected: duplicateDetected,
      arithmetic_valid: arithmeticValid,
      conflicts_with_published: conflictsWithPublished,
      unknown_values_count: unknownValuesCount,
      zero_values_count: zeroValuesCount
    },
    summary_message: summaryMessage
  };
}

/**
 * Convertit un formulaire documentaire validé en enveloppe standard pour `data_import_rows`
 */
export function buildStandardImportEnvelope(
  metadata: DocumentIngestionMetadata,
  values: ProposedFinancialValue[],
  institution: Institution
): {
  kind: 'BP' | 'CA' | 'OPERATION' | 'DGMP';
  institution_id: string;
  institution_type: 'COMMUNE' | 'REGIONAL_COUNCIL';
  fiscal_year: number;
  source: {
    name: string;
    reference: string;
    date: string;
    date_kind: 'PUBLISHED' | 'ACCESSED' | 'RECORDED';
    url?: string;
  };
  data: Record<string, unknown>;
  precision: Record<string, string>;
} {
  const institutionType = institution.type === 'MAIRIE' ? 'COMMUNE' : 'REGIONAL_COUNCIL';

  const dataObj: Record<string, unknown> = {};
  const precisionObj: Record<string, string> = {};

  const acceptedValues = values.filter(v => v.status !== 'REJECTED');

  for (const v of acceptedValues) {
    dataObj[v.field] = v.amount;
    precisionObj[v.field] = v.precision;
  }

  const sourceObj: { name: string; reference: string; date: string; date_kind: 'PUBLISHED' | 'ACCESSED' | 'RECORDED'; url?: string } = {
    name: metadata.source_name,
    reference: metadata.source_reference,
    date: metadata.source_date,
    date_kind: metadata.source_date_kind
  };
  if (metadata.source_url) {
    sourceObj.url = metadata.source_url;
  }

  let kind: 'BP' | 'CA' = 'BP';
  if (metadata.document_type === 'COMPTE_ADMINISTRATIF') {
    kind = 'CA';
    if (metadata.source_page) {
      dataObj.source_page = metadata.source_page;
    }
  } else {
    // Mapper le budget_type pour BP
    let budgetType = 'PRIMITIF_ADOPTE';
    if (metadata.document_type === 'BUDGET_SUPPLEMENTAIRE') budgetType = 'MODIFICATIF_1'; // Compatible migration DB
    else if (metadata.document_type === 'BUDGET_MODIFICATIF') budgetType = 'MODIFICATIF_1';
    else if (metadata.document_type === 'DECISION_MODIFICATIVE') budgetType = 'AUTRE_MODIFICATIF';
    else if (metadata.document_type === 'VIREMENT_CREDITS') budgetType = 'AUTRE_MODIFICATIF';

    dataObj.budget_type = budgetType;
    dataObj.version_number = 1;
    dataObj.verification_status = 'OFFICIAL_DOCUMENT';
    dataObj.confidence_level = 'HIGH';
    if (metadata.notes) dataObj.notes = metadata.notes;
  }

  return {
    kind,
    institution_id: metadata.institution_id,
    institution_type: institutionType,
    fiscal_year: metadata.fiscal_year,
    source: sourceObj,
    data: dataObj,
    precision: precisionObj
  };
}
