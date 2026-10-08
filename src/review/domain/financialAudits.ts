import type { CAFinancialMeasure } from '../../types/administrativeAccount';
import type { FinancialObservation } from './evidence';
import type { SourceDocument } from './documents';
import lot5Controls from '../../../docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json';

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
 * Normalisation et équivalence des identifiants documentaires officiels LFI et DPPD.
 * Permet de reconnaître les alias légitimes (ex: suffixe -ANNEXE-4) adossés au même SHA-256.
 */
export function areDocumentIdsEquivalent(id1: string, id2: string): boolean {
  if (id1 === id2) return true;
  const normalize = (id: string) => id.replace(/-ANNEXE-4$/i, '').trim();
  return normalize(id1) === normalize(id2);
}

/**
 * Vérification stricte de la cohérence interne des codes budgétaires :
 * - Une action doit appartenir au programme indiqué (les 5 premiers chiffres de l'action doivent être le code programme).
 * - Le scope textuel et les codes structurés ne doivent présenter aucune contradiction.
 * - Un scope de section total ne peut pas comporter de code programme ou action.
 */
export function validateCodeCoherence(record: {
  scope: string;
  sectionCode?: string | null;
  programCode?: string | null;
  actionCode?: string | null;
}): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 1. Une action doit appartenir au programme indiqué
  if (record.actionCode && record.programCode) {
    if (!record.actionCode.startsWith(record.programCode)) {
      reasons.push('ACTION_PROGRAM_MISMATCH');
    }
  }

  // 2. Si scope est PROGRAM_<prog> :
  if (record.scope.startsWith('PROGRAM_')) {
    const scopeProg = record.scope.slice('PROGRAM_'.length);
    if (record.programCode && record.programCode !== scopeProg) {
      reasons.push('SCOPE_PROGRAM_CODE_MISMATCH');
    }
    if (record.actionCode) {
      reasons.push('SCOPE_CODE_MISMATCH');
    }
  }

  // 3. Si scope est ACTION_<act> :
  if (record.scope.startsWith('ACTION_')) {
    const scopeAct = record.scope.slice('ACTION_'.length);
    if (record.actionCode && record.actionCode !== scopeAct) {
      reasons.push('SCOPE_ACTION_CODE_MISMATCH');
    }
    if (record.programCode && !scopeAct.startsWith(record.programCode)) {
      reasons.push('ACTION_PROGRAM_MISMATCH');
    }
  }

  // 4. Si scope est SECTION_TOTAL :
  if (record.scope === 'SECTION_TOTAL') {
    if (record.programCode || record.actionCode) {
      reasons.push('SCOPE_CODE_MISMATCH');
    }
  }

  return { valid: reasons.length === 0, reasons };
}

/**
 * Confronte une observation financière candidate à la liste des contrôles d'audit enregistrés.
 *
 * Règles d'invariants et d'étanchéité :
 * 1. Cohérence stricte des codes (scope, programCode, actionCode, sectionCode).
 * 2. L'empreinte SHA-256 du document cité doit correspondre exactement à l'audit.
 * 3. L'exercice budgétaire doit correspondre exactement.
 * 4. L'institution et la section (si applicable) doivent correspondre exactement.
 * 5. La granularité de périmètre (scope) doit correspondre :
 *    - Un audit de SECTION_TOTAL ne valide JAMAIS un programme ou une action.
 *    - Un audit de PROGRAM ne valide JAMAIS une action détaillée.
 * 6. La nature du montant (measure), la base budgétaire et la devise doivent correspondre.
 * 7. Aucune contradiction sur le périmètre : si un audit est en SOURCE_CONFLICT ou TO_VERIFY,
 *    ou si deux audits pour le même montant divergent, rejet déterministe immédiat.
 * 8. Le montant exact (y compris le vrai zéro : amount === 0) doit correspondre.
 * 9. PAGE OBLIGATOIRE : Si un audit spécifie une page, l'observation DOIT fournir cette page
 *    et celle-ci doit concorder exactement. Une page manquante ne contourne JAMAIS la vérification.
 * 10. TABLEAU OBLIGATOIRE : Si l'audit spécifie un tableRef sans page, l'observation DOIT le fournir.
 * 11. Aucun .find() arbitraire : tous les candidats applicables sont analysés pour garantir l'unanimité.
 */
export function matchFinancialAudit(
  observation: FinancialObservation,
  audits: readonly FinancialAuditRecord[],
  doc: SourceDocument,
): FinancialAuditMatchResult {
  if (!observation.evidence) {
    return { matched: false, matchingRecord: null, reasons: ['NO_EVIDENCE_PROVIDED'] };
  }

  // 0. Vérification de la cohérence interne des codes de l'observation
  const obsCoherence = validateCodeCoherence(observation);
  if (!obsCoherence.valid) {
    return { matched: false, matchingRecord: null, reasons: obsCoherence.reasons };
  }

  // 1. Filtrer les audits visant le document exact (avec équivalence d'identifiant documentaire)
  const docAudits = audits.filter(a => areDocumentIdsEquivalent(a.documentId, observation.evidence!.documentId));
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

  // CORRECTION 1 : Détection déterministe des contradictions sur l'ensemble des audits applicables au périmètre
  const scopeAudits = basisMatches;

  // A. Si n'importe quel audit sur ce périmètre est en SOURCE_CONFLICT, rejet immédiat
  if (scopeAudits.some(a => a.controlStatus === 'SOURCE_CONFLICT')) {
    return { matched: false, matchingRecord: null, reasons: ['AUDIT_SOURCE_CONFLICT'] };
  }

  // B. Si n'importe quel audit sur ce périmètre n'est pas VERIFIED, rejet immédiat
  if (scopeAudits.some(a => a.controlStatus !== 'VERIFIED')) {
    return { matched: false, matchingRecord: null, reasons: ['AUDIT_STATUS_NOT_VERIFIED'] };
  }

  // C. Si les audits applicables sur ce périmètre portent des montants contradictoires
  const distinctAmounts = new Set(scopeAudits.map(a => a.auditedAmount));
  if (distinctAmounts.size > 1) {
    return { matched: false, matchingRecord: null, reasons: ['CONTRADICTORY_AUDIT_AMOUNTS', 'CONTRADICTORY_AUDIT_RECORDS'] };
  }

  // 6. Montant exact (y compris 0 exact documenté)
  const amountMatches = scopeAudits.filter(a => a.auditedAmount === observation.amount);
  if (amountMatches.length === 0) {
    return { matched: false, matchingRecord: null, reasons: ['AMOUNT_MISMATCH'] };
  }

  // CORRECTION 1 (suite) : Vérification d'audits contradictoires sur le même montant
  // Si deux audits du même montant ont des statuts différents ou des pages conflictuelles
  const distinctStatuses = new Set(amountMatches.map(a => a.controlStatus));
  if (distinctStatuses.size > 1) {
    return { matched: false, matchingRecord: null, reasons: ['CONTRADICTORY_AUDIT_STATUS', 'CONTRADICTORY_AUDIT_RECORDS'] };
  }
  const distinctPages = new Set(amountMatches.map(a => a.page).filter(p => p !== null && p !== undefined));
  if (distinctPages.size > 1) {
    return { matched: false, matchingRecord: null, reasons: ['CONTRADICTORY_AUDIT_PAGES', 'CONTRADICTORY_AUDIT_RECORDS'] };
  }

  // CORRECTION 2 : Vérification obligatoire et déterministe de la page / tableau documentaire
  const evidence = observation.evidence;
  const matchingCandidates: FinancialAuditRecord[] = [];
  const candidateErrors = new Set<string>();

  for (const a of amountMatches) {
    let matchesCriteria = true;

    // A. Cohérence des codes de l'audit lui-même
    const auditCoherence = validateCodeCoherence(a);
    if (!auditCoherence.valid) {
      matchesCriteria = false;
      for (const r of auditCoherence.reasons) candidateErrors.add(r);
    }

    // B. Codes structurés croisés avec l'observation
    if (observation.programCode && a.programCode && observation.programCode !== a.programCode) {
      candidateErrors.add('SCOPE_PROGRAM_CODE_MISMATCH');
      matchesCriteria = false;
    }
    if (observation.actionCode && a.actionCode && observation.actionCode !== a.actionCode) {
      candidateErrors.add('SCOPE_ACTION_CODE_MISMATCH');
      matchesCriteria = false;
    }

    // C. Page documentaire obligatoire : si l'audit est limité à une page, l'observation DOIT la fournir exactement
    if (a.page !== null && a.page !== undefined) {
      if (evidence.page === null || evidence.page === undefined) {
        candidateErrors.add('PAGE_REQUIRED');
        matchesCriteria = false;
      } else if (evidence.page !== a.page) {
        candidateErrors.add('PAGE_MISMATCH');
        matchesCriteria = false;
      }
    }

    // D. Tableau documentaire obligatoire : si l'audit spécifie un tableRef sans page, l'observation DOIT le fournir
    if (a.tableRef !== null && a.tableRef !== undefined && (a.page === null || a.page === undefined)) {
      if (!evidence.reference?.trim()) {
        candidateErrors.add('TABLE_REF_REQUIRED');
        matchesCriteria = false;
      } else if (!evidence.reference.toLowerCase().includes(a.tableRef.toLowerCase())) {
        candidateErrors.add('TABLE_REF_MISMATCH');
        matchesCriteria = false;
      }
    }

    if (matchesCriteria) {
      matchingCandidates.push(a);
    }
  }

  if (matchingCandidates.length === 0) {
    return { matched: false, matchingRecord: null, reasons: Array.from(candidateErrors) };
  }

  // Ne plus faire de .find() arbitraire : vérifier l'unanimité absolue de tous les candidats
  const candidate = matchingCandidates[0];
  for (const other of matchingCandidates.slice(1)) {
    if (
      other.controlStatus !== candidate.controlStatus ||
      other.auditedAmount !== candidate.auditedAmount ||
      other.page !== candidate.page ||
      other.tableRef !== candidate.tableRef
    ) {
      return { matched: false, matchingRecord: null, reasons: ['CONTRADICTORY_AUDIT_RECORDS'] };
    }
  }

  if (candidate.controlStatus === 'SOURCE_CONFLICT') {
    return { matched: false, matchingRecord: candidate, reasons: ['AUDIT_SOURCE_CONFLICT'] };
  }
  if (candidate.controlStatus !== 'VERIFIED') {
    return { matched: false, matchingRecord: candidate, reasons: ['AUDIT_STATUS_NOT_VERIFIED'] };
  }

  return { matched: true, matchingRecord: candidate, reasons: [] };
}

/**
 * Vérifie si un montant financier exact fait partie du référentiel officiel LOT 5.
 * Source de vérité : docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json
 */
export function isReferentialAuditedAmount(amount: number, sectionCode?: string | null): boolean {
  for (const sc of lot5Controls.section_controls) {
    if (sectionCode && sc.section !== sectionCode) continue;
    if (sc.section_total_fcfa === amount) return true;
    if ('newly_verified_programs' in sc && Array.isArray(sc.newly_verified_programs)) {
      for (const prog of sc.newly_verified_programs) {
        if (prog.amount_fcfa === amount) return true;
        if ('actions' in prog && Array.isArray(prog.actions)) {
          for (const act of prog.actions) {
            if (act.amount_fcfa === amount) return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Valide un enregistrement d'audit par rapport au référentiel documentaire officiel LOT 5.
 * Rejette toute présence de montant absent du référentiel documentaire.
 */
export function verifyAuditRecordAgainstReferential(record: FinancialAuditRecord): {
  valid: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // 1. Contrôle des sources et empreintes
  const matchingSource = lot5Controls.sources.find(s =>
    areDocumentIdsEquivalent(s.document_id, record.documentId) &&
    s.sha256.toLowerCase() === record.documentSha256.toLowerCase()
  );
  if (!matchingSource) {
    reasons.push('DOCUMENT_OR_SHA_NOT_IN_REFERENTIAL');
  }

  // 2. Contrôle du montant dans le référentiel documentaire
  if (!isReferentialAuditedAmount(record.auditedAmount, record.sectionCode)) {
    reasons.push('AMOUNT_NOT_IN_DOCUMENTARY_REFERENTIAL');
  }

  // 3. Référence de rapport
  if (!record.reportRef || !record.reportRef.includes('LOT5_INDEPENDENT_LFI_CONTROLS.json')) {
    reasons.push('REPORT_REF_NOT_REFERENTIAL');
  }

  return { valid: reasons.length === 0, reasons };
}

/**
 * Transforme le référentiel documentaire LOT 5 en enregistrements d'audit financier typés et validés.
 * Évite la duplication manuelle des montants en code et garantit la fidélité documentaire.
 */
export function transformLot5ControlsToAudits(): FinancialAuditRecord[] {
  const audits: FinancialAuditRecord[] = [];
  const lfiSource = lot5Controls.sources.find(s => s.document_id === 'DGBF-LFI-2026')!;
  const dppdSource = lot5Controls.sources.find(s => areDocumentIdsEquivalent(s.document_id, 'DGBF-DPPD-PAP-2026-2028'))!;

  const sectionInstitutionMap: Record<string, string> = {
    '237': 'gov-003',
    '334': 'gov-034',
    '336': 'gov-017',
    '362': 'gov-023',
    '439': 'gov-033',
    '440': 'gov-032',
    '444': 'gov-030',
  };

  for (const sc of lot5Controls.section_controls) {
    const institutionId = ('institution_id' in sc && sc.institution_id) ? sc.institution_id : sectionInstitutionMap[sc.section];
    if (!institutionId) continue;

    // 1. Audit Section Total (LFI 2026)
    audits.push({
      controlId: `AUDIT-LFI-2026-SEC-${sc.section}`,
      documentId: lfiSource.document_id,
      documentSha256: lfiSource.sha256,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
      institutionId,
      sectionCode: sc.section,
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: sc.section_total_fcfa,
      page: sc.lfi_pdf_pages[0] ?? null,
      tableRef: 'Tableau 7',
    });

    // 2. Programmes et Actions nouvellement vérifiés
    if ('newly_verified_programs' in sc && Array.isArray(sc.newly_verified_programs)) {
      for (const prog of sc.newly_verified_programs) {
        // Audit Programme (LFI 2026)
        audits.push({
          controlId: `AUDIT-LFI-2026-PROG-${prog.code}`,
          documentId: lfiSource.document_id,
          documentSha256: lfiSource.sha256,
          fiscalYear: 2026,
          controlStatus: 'VERIFIED',
          reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
          institutionId,
          sectionCode: sc.section,
          scope: `PROGRAM_${prog.code}`,
          programCode: prog.code,
          measure: 'ORDERED',
          basis: 'INITIAL_BUDGET',
          currency: 'XOF',
          auditedAmount: prog.amount_fcfa,
          page: prog.lfi_pdf_page ?? null,
          tableRef: 'Tableau 7 : Budget détaillé du programme',
        });

        // Audit Actions (DPPD-PAP Tableau 7)
        if ('actions' in prog && Array.isArray(prog.actions)) {
          for (const act of prog.actions) {
            audits.push({
              controlId: `AUDIT-DPPD-2026-ACT-${act.code}`,
              documentId: dppdSource.document_id,
              documentSha256: dppdSource.sha256,
              fiscalYear: 2026,
              controlStatus: 'VERIFIED',
              reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
              institutionId,
              sectionCode: sc.section,
              scope: `ACTION_${act.code}`,
              programCode: prog.code,
              actionCode: act.code,
              measure: 'ORDERED',
              basis: 'INITIAL_BUDGET',
              currency: 'XOF',
              auditedAmount: act.amount_fcfa,
              page: act.dppd_pdf_pages[0] ?? null,
              tableRef: 'Tableau 7 : Budget détaillé du programme',
            });
          }
        }
      }
    }
  }

  return audits;
}

/**
 * Registre officiel des contrôles financiers indépendants vérifiés.
 * Transformé directement depuis docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json.
 */
export const OFFICIAL_FINANCIAL_AUDITS: readonly FinancialAuditRecord[] = transformLot5ControlsToAudits();
