import { assessObservation, hasEvidence, isCalendarDate, lot5Blocked, type EvidenceRef, type FinancialObservation, type ReviewValue } from './evidence';
import { resolveCitation, type SourceDocument } from './documents';

/** A financial rate never establishes physical completion or performance. */
export function executionRate(credits: FinancialObservation, execution: FinancialObservation): ReviewValue {
  const inputs = [assessObservation(credits), assessObservation(execution)];
  const invalid = inputs.find(i => i.status === 'BLOCKED') ?? inputs.find(i => i.status !== 'AVAILABLE');
  if (invalid) return invalid;
  if (credits.institutionId !== execution.institutionId || credits.sectionCode !== execution.sectionCode
    || credits.fiscalYear !== execution.fiscalYear || credits.scope !== execution.scope
    || credits.periodEnd !== execution.periodEnd || credits.currency !== execution.currency
    || credits.basis !== 'FINAL_CREDITS' || credits.measure !== 'PLANNED'
    || execution.basis !== 'EXECUTION' || !['ENGAGED', 'ORDERED', 'PAID'].includes(execution.measure)) {
    return { value: null, status: 'NOT_COMPARABLE', reasons: ['SCOPE_OR_MEASURE_MISMATCH'] };
  }
  if (credits.amount === 0) return { value: null, status: 'NOT_COMPARABLE', reasons: ['ZERO_DENOMINATOR'] };
  return { value: (execution.amount! / credits.amount!) * 100, status: 'AVAILABLE', reasons: [] };
}

export interface PerformanceIndicator {
  institutionId: string;
  sectionCode: string | null;
  fiscalYear: number;
  label: string;
  unit: string;
  periodEnd: string;
  target: { value: number | null; evidence: EvidenceRef | null } | null;
  observed: { value: number | null; evidence: EvidenceRef | null } | null;
}

/** Indicator units are not FCFA. A gap does not establish success without a documented interpretation. */
export function performanceGap(indicator: PerformanceIndicator, documents: readonly SourceDocument[]): ReviewValue {
  if (lot5Blocked(indicator.institutionId, indicator.sectionCode, indicator.fiscalYear)) {
    return { value: null, status: 'BLOCKED', reasons: ['LOT5_INCOMPLETE_LFI'] };
  }
  if (!indicator.institutionId.trim() || !indicator.label.trim() || !indicator.unit.trim()
    || !isCalendarDate(indicator.periodEnd) || Number(indicator.periodEnd.slice(0, 4)) !== indicator.fiscalYear) {
    return { value: null, status: 'NOT_COMPARABLE', reasons: ['INDICATOR_SCOPE_REQUIRED'] };
  }
  for (const reading of [indicator.target, indicator.observed]) {
    if (!reading || reading.value === null || !Number.isFinite(reading.value)
      || !hasEvidence(reading.evidence, indicator.fiscalYear) || !resolveCitation(reading.evidence, documents)) {
      return { value: null, status: 'UNKNOWN', reasons: ['DOCUMENTED_INDICATOR_VALUES_REQUIRED'] };
    }
  }
  const gap = indicator.observed!.value! - indicator.target!.value!;
  return Number.isFinite(gap) ? { value: gap, status: 'AVAILABLE', reasons: ['GAP_ONLY_NO_SUCCESS_INFERENCE'] }
    : { value: null, status: 'BLOCKED', reasons: ['INVALID_INDICATOR_VALUE'] };
}
