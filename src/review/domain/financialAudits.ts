import type { CAFinancialMeasure } from '../../types/administrativeAccount';
import type { FinancialObservation } from './evidence';
import type { SourceDocument } from './documents';

/**
 * Enregistrement formel d'un contrôle d'audit financier indépendant.
 *
 * Règle républicaine d'intégrité :
 * Un document officiel vérifié ne signifie pas que tous les montants
 * contenus dans ce document sont vérifiés.
 *
 * Une observation financière ne peut devenir publiable que si elle
 * correspond à un enregistrement d'audit financier formellement vérifié,
 * sur son périmètre exact (exercice, institution, section, scope, mesure,
 * base, montant exact, devise, document, empreinte SHA-256, page).
 */
export interface FinancialAuditRecord {
  /** Identifiant unique du contrôle financier */
  controlId: string;
  /** Identifiant exact du document primaire contrôlé */
  documentId: string;
  /** Empreinte SHA-256 vérifiée du document */
  documentSha256: string;
  /** Exercice budgétaire concerné */
  fiscalYear: number;
  /** Statut du contrôle d'audit indépendant */
  controlStatus: 'VERIFIED' | 'TO_VERIFY' | 'SOURCE_CONFLICT';
  /** Référence traçable vers le rapport ou test d'audit vérifiable */
  reportRef: string;

  /** Identifiant institutionnel (ex: 'gov-003', 'inst-com-bingerville') */
  institutionId: string;
  /** Section ministérielle contrôlée (ex: '237', '334'), ou null pour les collectivités */
  sectionCode: string | null;
  /** Périmètre précis contrôlé (ex: 'SECTION_TOTAL', 'PROGRAM_21042', 'ACTION_2104201', 'MUNICIPAL_TOTAL') */
  scope: string;
  /** Nature financière de la mesure auditée */
  measure: CAFinancialMeasure;
  /** Base budgétaire auditée */
  basis: 'INITIAL_BUDGET' | 'FINAL_CREDITS' | 'EXECUTION';
  /** Devise auditée (strictement 'XOF') */
  currency: 'XOF';
  /** Montant exact contrôlé en FCFA */
  auditedAmount: number;

  /** Page PDF contrôlée dans l'original officiel, si applicable */
  page?: number | null;
  /** Intitulé de tableau ou référence dans le document (ex: 'Tableau 7') */
  tableRef?: string | null;
  /** Code programme à 5 chiffres si applicable (ex: '21042', '23223') */
  programCode?: string | null;
  /** Code action à 7 chiffres si applicable (ex: '2322301') */
  actionCode?: string | null;
}

export interface FinancialAuditMatchResult {
  matched: boolean;
  matchingRecord: FinancialAuditRecord | null;
  reasons: string[];
}

/**
 * Confronte une observation financière candidate à la liste des contrôles d'audit enregistrés.
 *
 * Règles d'invariants et d'étanchéité :
 * 1. L'empreinte SHA-256 du document cité doit correspondre exactement à l'audit.
 * 2. L'exercice budgétaire doit correspondre exactement.
 * 3. L'institution et la section (si applicable) doivent correspondre exactement.
 * 4. La granularité de périmètre (scope) doit correspondre :
 *    - Un audit de SECTION_TOTAL ne valide JAMAIS un programme ou une action.
 *    - Un audit de PROGRAM ne valide JAMAIS une action détaillée.
 * 5. La nature du montant (measure), la base budgétaire et la devise doivent correspondre.
 * 6. Le montant exact (y compris le vrai zéro : amount === 0) doit correspondre.
 * 7. Si une page est spécifiée dans l'audit et l'observation, elle doit concorder.
 * 8. Le statut du contrôle doit être strictement 'VERIFIED'.
 *    Un statut 'SOURCE_CONFLICT' ou 'TO_VERIFY' provoque un rejet immédiat.
 */
export function matchFinancialAudit(
  observation: FinancialObservation,
  audits: readonly FinancialAuditRecord[],
  doc: SourceDocument,
): FinancialAuditMatchResult {
  if (!observation.evidence) {
    return { matched: false, matchingRecord: null, reasons: ['NO_EVIDENCE_PROVIDED'] };
  }

  // 1. Filtrer les audits visant le document exact
  const docAudits = audits.filter(a => a.documentId === observation.evidence!.documentId);
  if (docAudits.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['NO_FINANCIAL_AUDIT_FOR_DOCUMENT'] };
  }

  // 2. Contrôle d'intégrité cryptographique et d'exercice du document
  const hashMatches = docAudits.filter(a => a.documentSha256.toLowerCase() === (doc.sha256 ?? '').toLowerCase());
  if (hashMatches.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['DOCUMENT_SHA_MISMATCH'] };
  }

  const yearMatches = hashMatches.filter(a => a.fiscalYear === observation.fiscalYear);
  if (yearMatches.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['FISCAL_YEAR_MISMATCH'] };
  }

  // 3. Institution et Section
  const instMatches = yearMatches.filter(a => a.institutionId === observation.institutionId);
  if (instMatches.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['INSTITUTION_MISMATCH'] };
  }

  const sectionMatches = instMatches.filter(a => a.sectionCode === observation.sectionCode);
  if (sectionMatches.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['UNAUDITED_SECTION'] };
  }

  // 4. Granularité de périmètre (Règle d'or : agrégat != détail)
  const exactScopeMatches = sectionMatches.filter(a => a.scope === observation.scope);
  if (exactScopeMatches.length === 0) {
    // Vérifier si l'utilisateur tente d'utiliser une preuve d'agrégat pour un détail
    const hasSectionAggregate = sectionMatches.some(a => a.scope === 'SECTION_TOTAL');
    const hasProgramAggregate = sectionMatches.some(a => a.scope.startsWith('PROGRAM_'));

    if (observation.scope.startsWith('PROGRAM_')) {
      if (hasSectionAggregate) {
        return { matched: false, matchingRecord: null, reasons: ['AGGREGATE_CANNOT_VALIDATE_PROGRAM', 'UNAUDITED_PROGRAM'] };
      }
      return { matched: false, matchingRecord: null, reasons: ['SCOPE_MISMATCH', 'UNAUDITED_PROGRAM'] };
    }
    if (observation.scope.startsWith('ACTION_')) {
      if (hasProgramAggregate || hasSectionAggregate) {
        return { matched: false, matchingRecord: null, reasons: ['AGGREGATE_CANNOT_VALIDATE_ACTION', 'UNAUDITED_ACTION'] };
      }
      return { matched: false, matchingRecord: null, reasons: ['SCOPE_MISMATCH', 'UNAUDITED_ACTION'] };
    }
    return { matched: false, matchingRecord: null, reasons: ['SCOPE_MISMATCH'] };
  }

  // 5. Mesure, base et devise
  const measureMatches = exactScopeMatches.filter(a => a.measure === observation.measure);
  if (measureMatches.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['MEASURE_MISMATCH'] };
  }

  const basisMatches = measureMatches.filter(a => a.basis === observation.basis && a.currency === observation.currency);
  if (basisMatches.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['BASIS_OR_CURRENCY_MISMATCH'] };
  }

  // 6. Montant exact (y compris 0 exact)
  const amountMatches = basisMatches.filter(a => a.auditedAmount === observation.amount);
  if (amountMatches.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['AMOUNT_MISMATCH'] };
  }

  // 7. Page (si applicable)
  const evidence = observation.evidence;
  const candidate = amountMatches.find(a => {
    if (a.page !== null && a.page !== undefined && evidence?.page !== null && evidence?.page !== undefined) {
      return a.page === evidence.page;
    }
    return true;
  });

  if (!candidate) {
    return { matched: false, matchingRecord: null, reasons: ['PAGE_MISMATCH'] };
  }

  // 8. Statut d'audit
  if (candidate.controlStatus === 'SOURCE_CONFLICT') {
    return { matched: false, matchingRecord: candidate, reasons: ['AUDIT_SOURCE_CONFLICT'] };
  }
  if (candidate.controlStatus !== 'VERIFIED') {
    return { matched: false, matchingRecord: candidate, reasons: ['AUDIT_STATUS_NOT_VERIFIED'] };
  }

  return { matched: true, matchingRecord: candidate, reasons: [] };
}

const SHA_LFI_2026 = 'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76';
const SHA_DPPD_2026 = '0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10';
const REF_LOT5_CONTROLS = 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls';

/**
 * Registre des contrôles financiers indépendants officiels vérifiés.
 * Source de vérité : docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json
 */
export const OFFICIAL_FINANCIAL_AUDITS: readonly FinancialAuditRecord[] = [
  // SECTION 237 — MFPMA (gov-003)
  {
    controlId: 'AUDIT-LFI-2026-SEC-237',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-003',
    sectionCode: '237',
    scope: 'SECTION_TOTAL',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 45121940916,
    page: 47,
  },

  // SECTION 334 — METFPA (gov-034)
  {
    controlId: 'AUDIT-LFI-2026-SEC-334',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-034',
    sectionCode: '334',
    scope: 'SECTION_TOTAL',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 182301855312,
    page: 49,
  },
  {
    controlId: 'AUDIT-LFI-2026-PROG-23220',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-034',
    sectionCode: '334',
    scope: 'PROGRAM_23220',
    programCode: '23220',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 46000000000,
    page: 49,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2322001',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-034',
    sectionCode: '334',
    scope: 'ACTION_2322001',
    programCode: '23220',
    actionCode: '2322001',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 17178600000,
    page: 563,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2322002',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-034',
    sectionCode: '334',
    scope: 'ACTION_2322002',
    programCode: '23220',
    actionCode: '2322002',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 28821400000,
    page: 563,
  },

  // SECTION 336 — MICOM (gov-017)
  {
    controlId: 'AUDIT-LFI-2026-SEC-336',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-017',
    sectionCode: '336',
    scope: 'SECTION_TOTAL',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 39806735298,
    page: 49,
  },
  {
    controlId: 'AUDIT-LFI-2026-PROG-23223',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-017',
    sectionCode: '336',
    scope: 'PROGRAM_23223',
    programCode: '23223',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 16465000001,
    page: 50,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2322301',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-017',
    sectionCode: '336',
    scope: 'ACTION_2322301',
    programCode: '23223',
    actionCode: '2322301',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 16465000001,
    page: 651,
  },
  {
    controlId: 'AUDIT-LFI-2026-PROG-23224',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-017',
    sectionCode: '336',
    scope: 'PROGRAM_23224',
    programCode: '23224',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 2035000000,
    page: 50,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2322401',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-017',
    sectionCode: '336',
    scope: 'ACTION_2322401',
    programCode: '23224',
    actionCode: '2322401',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 2035000000,
    page: 653,
  },
  {
    controlId: 'AUDIT-LFI-2026-PROG-23225',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-017',
    sectionCode: '336',
    scope: 'PROGRAM_23225',
    programCode: '23225',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 1700000000,
    page: 50,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2322501',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-017',
    sectionCode: '336',
    scope: 'ACTION_2322501',
    programCode: '23225',
    actionCode: '2322501',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 1700000000,
    page: 654,
  },

  // SECTION 362 — MEPS (gov-023)
  {
    controlId: 'AUDIT-LFI-2026-SEC-362',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-023',
    sectionCode: '362',
    scope: 'SECTION_TOTAL',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 91411414044,
    page: 53,
  },

  // SECTION 439 — MAIED (gov-033)
  {
    controlId: 'AUDIT-LFI-2026-SEC-439',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-033',
    sectionCode: '439',
    scope: 'SECTION_TOTAL',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 5122516889,
    page: 53,
  },

  // SECTION 440 — MAM (gov-032)
  {
    controlId: 'AUDIT-LFI-2026-SEC-440',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-032',
    sectionCode: '440',
    scope: 'SECTION_TOTAL',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 13746365872,
    page: 54,
  },

  // SECTION 444 — MSCV (gov-030)
  {
    controlId: 'AUDIT-LFI-2026-SEC-444',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-030',
    sectionCode: '444',
    scope: 'SECTION_TOTAL',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 70427777385,
    page: 54,
  },
  {
    controlId: 'AUDIT-LFI-2026-PROG-23241',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-030',
    sectionCode: '444',
    scope: 'PROGRAM_23241',
    programCode: '23241',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 10900000000,
    page: 54,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2324101',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-030',
    sectionCode: '444',
    scope: 'ACTION_2324101',
    programCode: '23241',
    actionCode: '2324101',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 7430000000,
    page: 1134,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2324102',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-030',
    sectionCode: '444',
    scope: 'ACTION_2324102',
    programCode: '23241',
    actionCode: '2324102',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 200000000,
    page: 1134,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2324103',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-030',
    sectionCode: '444',
    scope: 'ACTION_2324103',
    programCode: '23241',
    actionCode: '2324103',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 3270000000,
    page: 1134,
  },
  {
    controlId: 'AUDIT-LFI-2026-PROG-23249',
    documentId: 'DGBF-LFI-2026',
    documentSha256: SHA_LFI_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-030',
    sectionCode: '444',
    scope: 'PROGRAM_23249',
    programCode: '23249',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 1720000000,
    page: 54,
  },
  {
    controlId: 'AUDIT-DPPD-2026-ACT-2324901',
    documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    documentSha256: SHA_DPPD_2026,
    fiscalYear: 2026,
    controlStatus: 'VERIFIED',
    reportRef: REF_LOT5_CONTROLS,
    institutionId: 'gov-030',
    sectionCode: '444',
    scope: 'ACTION_2324901',
    programCode: '23249',
    actionCode: '2324901',
    measure: 'ORDERED',
    basis: 'INITIAL_BUDGET',
    currency: 'XOF',
    auditedAmount: 1720000000,
    page: 1135,
  },
];
