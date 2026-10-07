import type { AmountPrecision } from '../../types/localBudget';
import type { CAFinancialMeasure } from '../../types/administrativeAccount';

/** Review-only contracts. Verification is supplied by the trusted documentary workflow, never inferred. */
export interface EvidenceRef {
  documentId: string;
  page: number | null;
  reference: string | null;
  fiscalYear: number;
  verification: 'VERIFIED' | 'TO_VERIFY' | 'SOURCE_CONFLICT';
}

export interface FinancialObservation {
  institutionId: string;
  sectionCode: string | null;
  fiscalYear: number;
  scope: string;
  periodEnd: string;
  currency: 'XOF';
  measure: CAFinancialMeasure;
  basis: 'INITIAL_BUDGET' | 'FINAL_CREDITS' | 'EXECUTION';
  amount: number | null;
  precision: AmountPrecision;
  evidence: EvidenceRef | null;
}

export type ReviewStatus = 'AVAILABLE' | 'UNKNOWN' | 'BLOCKED' | 'NOT_COMPARABLE';
export interface ReviewValue {
  value: number | null;
  status: ReviewStatus;
  reasons: string[];
}

/** Explicit unresolved dependencies, not inferred from the inaccurate LOT 5 VERIFIED flags. */
export function lot5Blocked(institutionId: string, sectionCode: string | null, year: number): boolean {
  return year === 2026 && (['gov-017', 'gov-030', 'gov-034'].includes(institutionId)
    || ['336', '444', '334'].includes(sectionCode ?? ''));
}

export function hasEvidence(evidence: EvidenceRef | null, year: number): boolean {
  return !!evidence && evidence.verification === 'VERIFIED' && evidence.fiscalYear === year
    && !!evidence.documentId.trim()
    && ((Number.isInteger(evidence.page) && (evidence.page ?? 0) > 0) || !!evidence.reference?.trim());
}

export function assessObservation(observation: FinancialObservation): ReviewValue {
  if (lot5Blocked(observation.institutionId, observation.sectionCode, observation.fiscalYear)) {
    return { value: null, status: 'BLOCKED', reasons: ['LOT5_INCOMPLETE_LFI'] };
  }
  if (!observation.institutionId.trim() || !observation.scope.trim()
    || !Number.isInteger(observation.fiscalYear)
    || !/^\d{4}-\d{2}-\d{2}$/.test(observation.periodEnd)
    || !Number.isFinite(Date.parse(observation.periodEnd))
    || Number(observation.periodEnd.slice(0, 4)) !== observation.fiscalYear) {
    return { value: null, status: 'NOT_COMPARABLE', reasons: ['INVALID_SCOPE_OR_PERIOD'] };
  }
  if (!hasEvidence(observation.evidence, observation.fiscalYear)) {
    return { value: null, status: 'UNKNOWN', reasons: ['DOCUMENTARY_EVIDENCE_REQUIRED'] };
  }
  if (observation.amount === null || observation.precision !== 'EXACT') {
    return { value: null, status: 'UNKNOWN', reasons: ['EXACT_AMOUNT_REQUIRED'] };
  }
  if (!Number.isSafeInteger(observation.amount) || observation.amount < 0) {
    return { value: null, status: 'BLOCKED', reasons: ['INVALID_AMOUNT'] };
  }
  return { value: observation.amount, status: 'AVAILABLE', reasons: [] };
}
