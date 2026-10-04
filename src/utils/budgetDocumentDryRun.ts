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
 * Normalise le type de document pour l'identification et le calcul d'empreinte déterministe
 * Établit l'équivalence canonique entre vocabulaires (ex: BUDGET_PRIMITIF <-> PRIMITIF_ADOPTE)
 * tout en préservant strictement les distinctions entre actes distincts (BM1 vs BM2, BS, virements...).
 */
export function normalizeDocumentIdentityType(rawType: string): string {
  const t = (rawType || '').trim().toUpperCase();
  if (t === 'BUDGET_PRIMITIF' || t === 'PRIMITIF_ADOPTE') {
    return 'PRIMITIF_ADOPTE';
  }
  if (t === 'PRIMITIF_APRES_TUTELLE') return 'PRIMITIF_APRES_TUTELLE';
  if (t === 'AUTORISATION_EXECUTION') return 'AUTORISATION_EXECUTION';
  if (t === 'BUDGET_SUPPLEMENTAIRE') return 'BUDGET_SUPPLEMENTAIRE';
  if (t === 'MODIFICATIF_1') return 'MODIFICATIF_1';
  if (t === 'MODIFICATIF_2') return 'MODIFICATIF_2';
  if (t === 'BUDGET_MODIFICATIF' || t === 'AUTRE_MODIFICATIF') return 'BUDGET_MODIFICATIF';
  if (t === 'DECISION_MODIFICATIVE') return 'DECISION_MODIFICATIVE';
  if (t === 'VIREMENT_CREDITS') return 'VIREMENT_CREDITS';
  if (t === 'COMPTE_ADMINISTRATIF') return 'COMPTE_ADMINISTRATIF';
  return t;
}

/**
 * Vérifie si le statut d'une valeur financière proposée est éligible à l'importation
 * Statuts autorisés : VALIDATED, CORRECTED, MARKED_UNKNOWN (si montant null)
 * Statut PENDING : bloque l'importation
 * Statut REJECTED : exclu du lot
 */
export function isImportableValueStatus(status: ProposedFinancialValue['status']): boolean {
  return status === 'VALIDATED' || status === 'CORRECTED' || status === 'MARKED_UNKNOWN';
}

/**
 * Vérifie si une valeur financière proposée est intrinsèquement importable dans l'enveloppe
 * Règle d'or : statut importable ET (si MARKED_UNKNOWN, montant strictement null)
 */
export function isImportableValue(value: ProposedFinancialValue): boolean {
  if (!isImportableValueStatus(value.status)) return false;
  if (value.status === 'MARKED_UNKNOWN' && value.amount !== null) return false;
  return true;
}

/**
 * Calcule un fingerprint documentaire déterministe pour identifier un acte unique (Item 7)
 * Permet de distinguer formellement :
 * - deux BM de la même année pour la même commune (références ou dates distinctes)
 * - un doublon exact d'un même document importé deux fois
 * - des actes identiques sur des communes ou années différentes
 */
export function computeDocumentFingerprint(params: {
  institution_id: string;
  fiscal_year: number;
  document_type: string;
  source_reference: string;
  source_date?: string;
}): string {
  const normInst = (params.institution_id || '').trim().toLowerCase();
  const year = params.fiscal_year;
  const normType = normalizeDocumentIdentityType(params.document_type);
  const normRef = (params.source_reference || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const normDate = (params.source_date || '').trim();
  return `${normInst}::${year}::${normType}::${normRef}::${normDate}`;
}

/**
 * Génère le squelette des valeurs financières proposées selon la catégorie de document
 * CONTRAT PROPRE : Aucune simulation de fausse IA. Structure les champs nécessaires pour la validation humaine.
 * Respect des règles d'or (Items 10 & 11) :
 * - Statut initial STRICTEMENT 'PENDING' (aucune auto-validation d'un montant saisi)
 * - Confiance non automatiquement HIGH par défaut (MEDIUM ou LOW selon la source)
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
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-operating',
          field: 'operating_amount',
          label: 'Dépenses de Fonctionnement',
          section: 'FONCTIONNEMENT',
          nature: 'PREVISION',
          amount: initialValues.operating_amount ?? null,
          precision: initialValues.operating_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-investment',
          field: 'investment_amount',
          label: 'Dépenses d\'Investissement',
          section: 'INVESTISSEMENT',
          nature: 'PREVISION',
          amount: initialValues.investment_amount ?? null,
          precision: initialValues.investment_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
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
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-mod-operating',
          field: 'operating_amount',
          label: 'Variation Fonctionnement (Delta)',
          section: 'FONCTIONNEMENT',
          nature: 'MODIFICATION',
          amount: initialValues.operating_amount ?? null,
          precision: initialValues.operating_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-mod-investment',
          field: 'investment_amount',
          label: 'Variation Investissement (Delta)',
          section: 'INVESTISSEMENT',
          nature: 'MODIFICATION',
          amount: initialValues.investment_amount ?? null,
          precision: initialValues.investment_amount != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
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
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-ca-total-realized',
          field: 'total_realized',
          label: 'Total Réalisé (Ordonnancé)',
          section: 'GLOBAL',
          nature: 'EXECUTION',
          amount: initialValues.total_realized ?? null,
          precision: initialValues.total_realized != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-ca-operating-planned',
          field: 'operating_planned',
          label: 'Fonctionnement Prévu',
          section: 'FONCTIONNEMENT',
          nature: 'PREVISION',
          amount: initialValues.operating_planned ?? null,
          precision: initialValues.operating_planned != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-ca-operating-realized',
          field: 'operating_realized',
          label: 'Fonctionnement Réalisé',
          section: 'FONCTIONNEMENT',
          nature: 'EXECUTION',
          amount: initialValues.operating_realized ?? null,
          precision: initialValues.operating_realized != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-ca-investment-planned',
          field: 'investment_planned',
          label: 'Investissement Prévu',
          section: 'INVESTISSEMENT',
          nature: 'PREVISION',
          amount: initialValues.investment_planned ?? null,
          precision: initialValues.investment_planned != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
        },
        {
          id: 'val-ca-investment-realized',
          field: 'investment_realized',
          label: 'Investissement Réalisé',
          section: 'INVESTISSEMENT',
          nature: 'EXECUTION',
          amount: initialValues.investment_realized ?? null,
          precision: initialValues.investment_realized != null ? 'EXACT' : 'UNKNOWN',
          confidence: 'MEDIUM',
          status: 'PENDING'
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
          confidence: 'LOW',
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

  // 3. Contrôle des métadonnées de source (Provenance obligatoire - Item 9)
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

  // Contrôle de la page source (Item 9)
  if (metadata.source_page !== undefined && metadata.source_page <= 0) {
    errors.push('Page source invalide : Le numéro de page doit être un entier strictement positif.');
  }

  // 4. Détection déterministe des doublons par fingerprint documentaire (Items 7 & 8)
  const targetFingerprint = computeDocumentFingerprint({
    institution_id: metadata.institution_id,
    fiscal_year: metadata.fiscal_year,
    document_type: metadata.document_type,
    source_reference: metadata.source_reference,
    source_date: metadata.source_date
  });

  let duplicateDetected = false;
  let conflictsWithPublished = false;

  // Contrôle des doublons exacts dans les budgets existants
  for (const b of context.existingBudgets) {
    const bRef = b.import_provenance?.source?.reference || b.document_name || '';
    const bDate = b.publication_date || b.adoption_date || b.import_provenance?.source?.date || '';
    const bFingerprint = computeDocumentFingerprint({
      institution_id: b.institution_id,
      fiscal_year: b.fiscal_year,
      document_type: b.budget_type,
      source_reference: bRef,
      source_date: bDate
    });

    if (bFingerprint === targetFingerprint) {
      duplicateDetected = true;
      errors.push(`Document en doublon : Cet acte identique existe déjà pour cette collectivité (ID existant: ${b.id}).`);
      conflicts.push(`Doublon exact détecté sur la référence "${metadata.source_reference}" et la date "${metadata.source_date}".`);
      break;
    }
  }

  // Contrôles spécifiques aux budgets primitifs (BP)
  if (metadata.document_type === 'BUDGET_PRIMITIF') {
    const existingPublishedBP = context.existingBudgets.find(
      b => b.institution_id === metadata.institution_id && 
           b.fiscal_year === metadata.fiscal_year && 
           b.status === 'PUBLISHED' &&
           b.budget_type === 'PRIMITIF_ADOPTE'
    );
    if (existingPublishedBP) {
      const existingVer = existingPublishedBP.version_number;
      const newVer = metadata.version_number;

      if (existingVer !== undefined && newVer !== undefined) {
        // Cas 1 : versions existante et nouvelle connues
        if (newVer <= existingVer) {
          conflictsWithPublished = true;
          conflicts.push(
            `Un Budget Primitif PUBLIÉ existe déjà en version ${existingVer} pour ${institution?.name || metadata.institution_id} en ${metadata.fiscal_year} (${existingPublishedBP.total_amount?.toLocaleString('fr-FR')} FCFA). La nouvelle version proposée (${newVer}) doit avoir un numéro strictement supérieur.`
          );
        }
      } else if (existingVer !== undefined && newVer === undefined) {
        // Cas 2 : version existante connue, nouvelle version inconnue
        conflictsWithPublished = true;
        conflicts.push(
          `Un Budget Primitif PUBLIÉ existe déjà en version ${existingVer} pour ${institution?.name || metadata.institution_id} en ${metadata.fiscal_year} (${existingPublishedBP.total_amount?.toLocaleString('fr-FR')} FCFA). Le nouveau document ne précise aucun numéro de version officiel permettant d'établir une révision postérieure.`
        );
      } else if (existingVer === undefined && newVer !== undefined) {
        // Cas 3 : version existante inconnue, nouvelle version connue
        conflictsWithPublished = true;
        conflicts.push(
          `Un Budget Primitif PUBLIÉ existe déjà sans numéro de version attesté pour ${institution?.name || metadata.institution_id} en ${metadata.fiscal_year} (${existingPublishedBP.total_amount?.toLocaleString('fr-FR')} FCFA). Une revue humaine est requise pour attester la postériorité de la nouvelle version ${newVer}.`
        );
      } else {
        // Cas 4 : versions existante et nouvelle inconnues
        conflictsWithPublished = true;
        conflicts.push(
          `Un Budget Primitif PUBLIÉ existe déjà pour ${institution?.name || metadata.institution_id} en ${metadata.fiscal_year} (${existingPublishedBP.total_amount?.toLocaleString('fr-FR')} FCFA) sans numéro de version officiel. Deux documents non versionnés ne peuvent coexister sans arbitrage humain.`
        );
      }
    }
  } else if (metadata.document_type === 'COMPTE_ADMINISTRATIF') {
    // Contrôles spécifiques au Compte Administratif (CA)
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
        warnings.push(`Un Compte Administratif au statut ${existingCA.status} existe déjà pour cet exercice. Une revue humaine est requise avant mise à jour.`);
      }
    }
  }

  // Contrôle de la sémantique pour les actes modificatifs (Item 12)
  if (['BUDGET_MODIFICATIF', 'BUDGET_SUPPLEMENTAIRE', 'DECISION_MODIFICATIVE', 'VIREMENT_CREDITS'].includes(metadata.document_type)) {
    if (!metadata.amount_semantics || metadata.amount_semantics === 'UNKNOWN') {
      errors.push('La sémantique des montants (cumulatif ou différentiel) doit être précisée pour les actes modificatifs.');
    }
  }

  // 5. Contrôle du statut de validation humaine et cohérence des valeurs (Item 10 & 13)
  const pendingValues = values.filter(v => v.status === 'PENDING');
  if (pendingValues.length > 0) {
    errors.push(`Validation humaine requise : Certaines valeurs doivent encore être validées avant l’import (${pendingValues.length} valeur(s) en attente au statut PENDING).`);
  }

  for (const v of values) {
    if (v.status === 'MARKED_UNKNOWN' && v.amount !== null) {
      errors.push(`Règle d'or violée : Le champ "${v.label}" est marqué inconnu (MARKED_UNKNOWN) mais contient une valeur non nulle (${v.amount}). Une valeur indéterminée doit avoir un montant null.`);
    }
  }

  let unknownValuesCount = 0;
  let zeroValuesCount = 0;
  let arithmeticValid = true;

  const validValues = values.filter(v => v.status !== 'REJECTED' && v.status !== 'PENDING');
  if (values.length > 0 && validValues.length === 0 && pendingValues.length === 0) {
    errors.push('Aucune valeur retenue : Toutes les valeurs proposées ont été rejetées.');
  }

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

  // Rejet de montants négatifs invalides pour les budgets primitifs
  if (metadata.document_type === 'BUDGET_PRIMITIF') {
    for (const v of validValues) {
      if (v.amount !== null && v.amount < 0) {
        errors.push(`Montant négatif invalide : Le budget primitif ne peut pas comporter de crédits initiaux négatifs (${v.label}: ${v.amount}).`);
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
  if (canImport) {
    summaryMessage = `Document conforme aux contrôles de cohérence. Prêt pour import (${validValues.length} valeurs retenues).`;
  } else {
    summaryMessage = `Document non importable : ${errors.length} erreur(s), ${conflicts.length} conflit(s) bloquant(s).`;
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
      zero_values_count: zeroValuesCount,
      fingerprint: targetFingerprint
    },
    summary_message: summaryMessage
  };
}

/**
 * Construit une enveloppe d'import standardisée (pour insertion dans data_import_rows)
 * Respect des règles d'or (Items 4, 5, 6, 9) :
 * - Type réel préservé (BS reste BS, BM reste BM, Virement reste Virement)
 * - Numéro de version dynamique non codé en dur à 1
 * - Propagation de la page source pour tous les actes
 */
export function buildStandardImportEnvelope(
  metadata: DocumentIngestionMetadata,
  values: ProposedFinancialValue[],
  institution: Institution
): {
  kind: 'BP' | 'CA';
  institution_id: string;
  institution_type: 'COMMUNE' | 'REGIONAL_COUNCIL';
  fiscal_year: number;
  source: {
    name: string;
    reference: string;
    date: string;
    date_kind: 'PUBLISHED' | 'ACCESSED' | 'RECORDED';
    url?: string;
    page?: number;
  };
  data: Record<string, unknown>;
  precision: Record<string, string>;
} {
  // 1. Contrôle strict de la frontière d'import : validation humaine obligatoire
  const pendingValues = values.filter(v => v.status === 'PENDING');
  if (pendingValues.length > 0) {
    throw new Error(
      `Validation humaine obligatoire : Impossible de construire une enveloppe d'importation avec ${pendingValues.length} valeur(s) en attente (PENDING).`
    );
  }

  for (const v of values) {
    if (v.status === 'MARKED_UNKNOWN' && v.amount !== null) {
      throw new Error(
        `Règle d'or violée : Le champ "${v.label}" est marqué MARKED_UNKNOWN mais contient une valeur non nulle (${v.amount}). Une valeur indéterminée doit être null.`
      );
    }
    if (v.status !== 'REJECTED' && !isImportableValueStatus(v.status)) {
      throw new Error(
        `Statut non importable : Le champ "${v.label}" possède un statut non éligible (${v.status}).`
      );
    }
  }

  const acceptedValues = values.filter(v => v.status !== 'REJECTED');
  if (acceptedValues.length === 0) {
    throw new Error(
      "Impossible de construire une enveloppe d'importation sans aucune valeur financière importable."
    );
  }

  const institutionType = institution.type === 'MAIRIE' ? 'COMMUNE' : 'REGIONAL_COUNCIL';

  const dataObj: Record<string, unknown> = {};
  const precisionObj: Record<string, string> = {};

  for (const v of acceptedValues) {
    dataObj[v.field] = v.amount;
    precisionObj[v.field] = v.precision;
    if (v.source_page && !dataObj.source_page) {
      dataObj.source_page = v.source_page;
    }
  }

  // Propagation systématique de la page source pour tous les types d'actes (Item 9)
  if (metadata.source_page) {
    dataObj.source_page = metadata.source_page;
  }

  const sourceObj: { 
    name: string; 
    reference: string; 
    date: string; 
    date_kind: 'PUBLISHED' | 'ACCESSED' | 'RECORDED'; 
    url?: string;
    page?: number;
  } = {
    name: metadata.source_name,
    reference: metadata.source_reference,
    date: metadata.source_date,
    date_kind: metadata.source_date_kind
  };
  if (metadata.source_url) {
    sourceObj.url = metadata.source_url;
  }
  if (metadata.source_page) {
    sourceObj.page = metadata.source_page;
  }

  let kind: 'BP' | 'CA' = 'BP';
  if (metadata.document_type === 'COMPTE_ADMINISTRATIF') {
    kind = 'CA';
  } else {
    // PRÉSERVER LE TYPE RÉEL DE L'ACTE (Items 4 & 5)
    let budgetType: string = 'PRIMITIF_ADOPTE';
    if (metadata.document_type === 'BUDGET_PRIMITIF') {
      budgetType = 'PRIMITIF_ADOPTE';
    } else if (metadata.document_type === 'BUDGET_SUPPLEMENTAIRE') {
      budgetType = 'BUDGET_SUPPLEMENTAIRE';
    } else if (metadata.document_type === 'DECISION_MODIFICATIVE') {
      budgetType = 'DECISION_MODIFICATIVE';
    } else if (metadata.document_type === 'VIREMENT_CREDITS') {
      budgetType = 'VIREMENT_CREDITS';
    } else if (metadata.document_type === 'BUDGET_MODIFICATIF') {
      if (metadata.version_number === 1) budgetType = 'MODIFICATIF_1';
      else if (metadata.version_number === 2) budgetType = 'MODIFICATIF_2';
      else budgetType = 'AUTRE_MODIFICATIF';
    } else {
      budgetType = 'AUTRE_MODIFICATIF';
    }

    dataObj.budget_type = budgetType;

    // Numéro de version officiel : préserver si documenté, ne jamais inventer de numéro arbitraire
    if (metadata.version_number !== undefined) {
      dataObj.version_number = metadata.version_number;
    }

    // Sémantique financière du montant (Item 12)
    if (metadata.amount_semantics) {
      dataObj.amount_semantics = metadata.amount_semantics;
    }

    dataObj.verification_status = 'OFFICIAL_DOCUMENT';
    // Confiance par défaut qualifiée (Item 10)
    dataObj.confidence_level = metadata.source_date_kind === 'PUBLISHED' ? 'MEDIUM' : 'LOW';
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
