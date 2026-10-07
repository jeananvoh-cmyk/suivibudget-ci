import { assessObservation, type FinancialObservation, type ReviewValue } from './evidence';

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
  label: string;
  unit: string;
  target: FinancialObservation | null;
  observed: FinancialObservation | null;
}

/** No default target, estimate or inference from a financial execution rate. */
export function performanceAvailability(indicator: PerformanceIndicator): 'UNKNOWN' | 'REQUIRES_INDICATOR_REVIEW' {
  return indicator.target && indicator.observed ? 'REQUIRES_INDICATOR_REVIEW' : 'UNKNOWN';
}
