import { describe, it, expect } from 'vitest';
import type { FinancialObservation } from '../domain/evidence';
import {
  canPublishOfficialObservation,
  matchFinancialAudit,
  OFFICIAL_FINANCIAL_AUDITS,
  type SourceDocument,
  type FinancialAuditRecord,
} from '../domain/documents';
import { openDataRows, openDataJson, openDataCsv, compareHistory, aggregateObservations } from '../domain/history';
import { buildReviewSnapshot } from '../domain/snapshot';
import { reviewDocuments } from '../catalog';
import lot5Controls from '../../../docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json';

describe('Audit P1/P2 — Suite de 21 Scénarios Adversariaux d’Intégrité Financière et d’Export', () => {
  const validLfiDoc = reviewDocuments.find(d => d.id === 'DGBF-LFI-2026')!;
  const validDppdDoc = reviewDocuments.find(d => d.id === 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4' || d.id === 'DGBF-DPPD-PAP-2026-2028')!;

  const testDocs: readonly SourceDocument[] = [validLfiDoc, validDppdDoc];

  // Base officielle valide : Section 237 MFPMA (45 121 940 916 FCFA)
  const officialSection237Obs: FinancialObservation = {
    institutionId: 'gov-003',
    sectionCode: '237',
    fiscalYear: 2026,
    scope: 'SECTION_TOTAL',
    periodEnd: '2026-12-31',
    currency: 'XOF',
    measure: 'PLANNED',
    basis: 'INITIAL_BUDGET',
    amount: 45121940916,
    precision: 'EXACT',
    evidence: {
      documentId: 'DGBF-LFI-2026',
      page: 47,
      reference: 'LFI 2026 Tableau 7 Section 237 page 47',
      fiscalYear: 2026,
      verification: 'VERIFIED',
    },
  };

  // 1. Mutation +1 FCFA sur un montant officiel
  it('1. rejects official observation mutated by +1 FCFA (Section 237 MFPMA)', () => {
    const mutatedPlusOne: FinancialObservation = {
      ...officialSection237Obs,
      amount: 45121940916 + 1,
    };
    const result = canPublishOfficialObservation(mutatedPlusOne, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('AMOUNT_MISMATCH');
  });

  // 2. Mutation -1 FCFA sur un montant officiel
  it('2. rejects official observation mutated by -1 FCFA (Section 237 MFPMA)', () => {
    const mutatedMinusOne: FinancialObservation = {
      ...officialSection237Obs,
      amount: 45121940916 - 1,
    };
    const result = canPublishOfficialObservation(mutatedMinusOne, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('AMOUNT_MISMATCH');
  });

  // 3. Montant officiel exact accepté
  it('3. accepts exact official observation matching official referential and audit', () => {
    const result = canPublishOfficialObservation(officialSection237Obs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('AVAILABLE');
    expect(result.value).toBe(45121940916);
    expect(result.reasons).toEqual([]);
  });

  // 4. Document manquant
  it('4. rejects observation when documentary evidence or document is missing', () => {
    const missingEvidenceObs: FinancialObservation = {
      ...officialSection237Obs,
      evidence: null,
    };
    const resNoEvidence = canPublishOfficialObservation(missingEvidenceObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(resNoEvidence.status).toBe('UNKNOWN');
    expect(resNoEvidence.value).toBeNull();

    const missingDocObs: FinancialObservation = {
      ...officialSection237Obs,
      evidence: {
        ...officialSection237Obs.evidence!,
        documentId: 'DOCUMENT-INEXISTANT-2026',
      },
    };
    const resNoDoc = canPublishOfficialObservation(missingDocObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(resNoDoc.status).toBe('UNKNOWN');
    expect(resNoDoc.value).toBeNull();
  });

  // 5. Ligne budgétaire erronée (scope mismatch)
  it('5. rejects observation when budget scope does not match audit record', () => {
    const wrongScopeObs: FinancialObservation = {
      ...officialSection237Obs,
      scope: 'PROGRAM_21042',
      programCode: '21042',
    };
    const result = canPublishOfficialObservation(wrongScopeObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('AGGREGATE_CANNOT_VALIDATE_PROGRAM');
  });

  // 6. Hash SHA-256 erroné / altéré
  it('6. rejects observation when source document SHA-256 is tampered or mismatched', () => {
    const tamperedDoc: SourceDocument = {
      ...validLfiDoc,
      sha256: 'f'.repeat(64),
    };
    const result = canPublishOfficialObservation(officialSection237Obs, [tamperedDoc], OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('DOCUMENT_SHA_MISMATCH');
  });

  // 7. Page documentaire erronée
  it('7. rejects observation when source page does not match audit record page', () => {
    const wrongPageObs: FinancialObservation = {
      ...officialSection237Obs,
      evidence: {
        ...officialSection237Obs.evidence!,
        page: 99,
      },
    };
    const result = canPublishOfficialObservation(wrongPageObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('PAGE_MISMATCH');
  });

  // 8. Institution erronée
  it('8. rejects observation when institutionId does not match audit record', () => {
    const wrongInstObs: FinancialObservation = {
      ...officialSection237Obs,
      institutionId: 'gov-999',
    };
    const result = canPublishOfficialObservation(wrongInstObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('INSTITUTION_MISMATCH');
  });

  // 9. Section ministérielle erronée
  it('9. rejects observation when sectionCode does not match audit record', () => {
    const wrongSectionObs: FinancialObservation = {
      ...officialSection237Obs,
      sectionCode: '999',
    };
    const result = canPublishOfficialObservation(wrongSectionObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('UNAUDITED_SECTION');
  });

  // 10. Programme erroné
  it('10. rejects observation when programCode does not match audit record', () => {
    const wrongProgramObs: FinancialObservation = {
      institutionId: 'gov-034',
      sectionCode: '334',
      fiscalYear: 2026,
      scope: 'PROGRAM_99999',
      programCode: '99999',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'PLANNED',
      basis: 'INITIAL_BUDGET',
      amount: 1000000,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Tableau 7',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };
    const result = canPublishOfficialObservation(wrongProgramObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('UNAUDITED_PROGRAM');
  });

  // 11. Action erronée
  it('11. rejects observation when actionCode does not match audit record', () => {
    const wrongActionObs: FinancialObservation = {
      institutionId: 'gov-034',
      sectionCode: '334',
      fiscalYear: 2026,
      scope: 'ACTION_2322099',
      programCode: '23220',
      actionCode: '2322099',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'PLANNED',
      basis: 'INITIAL_BUDGET',
      amount: 1000000,
      precision: 'EXACT',
      evidence: {
        documentId: validDppdDoc.id,
        page: 55,
        reference: 'Tableau 7',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };
    const result = canPublishOfficialObservation(wrongActionObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('UNAUDITED_ACTION');
  });

  // 12. Exercice budgétaire erroné (2025 vs 2026)
  it('12. rejects observation with fiscal year mismatch (2025 vs 2026)', () => {
    const wrongYearObs: FinancialObservation = {
      ...officialSection237Obs,
      fiscalYear: 2025,
      periodEnd: '2025-12-31',
      evidence: {
        ...officialSection237Obs.evidence!,
        fiscalYear: 2025,
      },
    };
    const result = canPublishOfficialObservation(wrongYearObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');

    const match = matchFinancialAudit(wrongYearObs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('FISCAL_YEAR_MISMATCH');
  });

  // 13. Devise erronée
  it('13. rejects observation with currency other than XOF', () => {
    const wrongCurrencyObs = {
      ...officialSection237Obs,
      currency: 'EUR' as any,
    };
    const result = canPublishOfficialObservation(wrongCurrencyObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('NOT_COMPARABLE');
    expect(result.value).toBeNull();
  });

  // 14. Mesure erronée (ORDERED vs PLANNED)
  it('14. rejects observation with executed measure (ORDERED) for budget authorization (PLANNED)', () => {
    const wrongMeasureObs: FinancialObservation = {
      ...officialSection237Obs,
      measure: 'ORDERED',
    };
    const result = canPublishOfficialObservation(wrongMeasureObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('MEASURE_MISMATCH');
  });

  // 15. Montant inconnu distinct de zéro (unknown != 0)
  it('15. rejects null amount and distinguishes it strictly from zero', () => {
    const nullAmountObs: FinancialObservation = {
      ...officialSection237Obs,
      amount: null,
    };
    const result = canPublishOfficialObservation(nullAmountObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('EXACT_AMOUNT_REQUIRED');

    // Documented zero is only accepted if explicitly audited
    const unAuditedZeroObs: FinancialObservation = {
      ...officialSection237Obs,
      amount: 0,
    };
    const zeroResult = canPublishOfficialObservation(unAuditedZeroObs, testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(zeroResult.status).toBe('UNKNOWN');
    expect(zeroResult.value).toBeNull();
    expect(zeroResult.reasons).toContain('AMOUNT_MISMATCH');
  });

  // 16. Audits contradictoires
  it('16. rejects publication deterministically when audit records are contradictory or in SOURCE_CONFLICT', () => {
    const conflictAudit: FinancialAuditRecord = {
      controlId: 'AUDIT-CONFLICT-237',
      documentId: 'DGBF-LFI-2026',
      documentSha256: validLfiDoc.sha256!,
      fiscalYear: 2026,
      controlStatus: 'SOURCE_CONFLICT',
      reportRef: 'test',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'PLANNED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 45121940916,
      page: 47,
    };
    const conflictResult = canPublishOfficialObservation(officialSection237Obs, testDocs, [conflictAudit]);
    expect(conflictResult.status).toBe('UNKNOWN');
    expect(conflictResult.value).toBeNull();
    expect(conflictResult.reasons).toContain('AUDIT_SOURCE_CONFLICT');

    // Montants contradictoires dans deux audits applicables au même scope
    const auditA: FinancialAuditRecord = { ...conflictAudit, controlStatus: 'VERIFIED', auditedAmount: 45121940916 };
    const auditB: FinancialAuditRecord = { ...conflictAudit, controlStatus: 'VERIFIED', auditedAmount: 45121940920 };
    const contradictoryResult = canPublishOfficialObservation(officialSection237Obs, testDocs, [auditA, auditB]);
    expect(contradictoryResult.status).toBe('UNKNOWN');
    expect(contradictoryResult.value).toBeNull();
    expect(contradictoryResult.reasons).toContain('CONTRADICTORY_AUDIT_AMOUNTS');
  });

  // 17. Export CSV protégé
  it('17. protects openDataCsv export by strictly replacing mutated (+1 FCFA) amount with null and UNKNOWN status', () => {
    const mutatedObs: FinancialObservation = {
      ...officialSection237Obs,
      amount: 45121940916 + 1,
    };
    const csv = openDataCsv([mutatedObs], testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(csv).toContain(',null,"UNKNOWN",');
    expect(csv).not.toContain('45121940917');
    expect(csv).not.toContain('45121940916');

    // En revanche, le montant exact officiel est bien exporté
    const validCsv = openDataCsv([officialSection237Obs], testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(validCsv).toContain(',"45121940916","AVAILABLE",');
  });

  // 18. Export JSON protégé
  it('18. protects openDataJson export by strictly replacing mutated (+1 FCFA) amount with null and UNKNOWN status', () => {
    const mutatedObs: FinancialObservation = {
      ...officialSection237Obs,
      amount: 45121940916 + 1,
    };
    const jsonStr = openDataJson([mutatedObs], testDocs, OFFICIAL_FINANCIAL_AUDITS);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.records[0].amount).toBeNull();
    expect(parsed.records[0].status).toBe('UNKNOWN');

    // Montant officiel exact est exporté en AVAILABLE
    const validJsonStr = openDataJson([officialSection237Obs], testDocs, OFFICIAL_FINANCIAL_AUDITS);
    const validParsed = JSON.parse(validJsonStr);
    expect(validParsed.records[0].amount).toBe(45121940916);
    expect(validParsed.records[0].status).toBe('AVAILABLE');
  });

  // 19. Snapshot de revue protégé
  it('19. protects buildReviewSnapshot by marking snapshot as UNKNOWN and zeroing amount for mutated observation', () => {
    const mutatedObs: FinancialObservation = {
      ...officialSection237Obs,
      amount: 45121940916 + 1,
    };
    const scope = { institutionId: 'gov-003', sectionCode: '237', fiscalYear: 2026 };
    const snapshot = buildReviewSnapshot(scope, [mutatedObs], testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(snapshot.status).toBe('UNKNOWN');
    expect(snapshot.records[0].amount).toBeNull();
    expect(snapshot.records[0].status).toBe('UNKNOWN');

    // Snapshot avec montant exact officiel
    const validSnapshot = buildReviewSnapshot(scope, [officialSection237Obs], testDocs, OFFICIAL_FINANCIAL_AUDITS);
    expect(validSnapshot.status).toBe('AVAILABLE');
    expect(validSnapshot.records[0].amount).toBe(45121940916);
    expect(validSnapshot.records[0].status).toBe('AVAILABLE');
  });

  // 20. Comparaison d'historique protégée
  it('20. protects compareHistory by returning null delta and UNKNOWN status if either observation is mutated', () => {
    const obs2025: FinancialObservation = {
      ...officialSection237Obs,
      fiscalYear: 2025,
      periodEnd: '2025-12-31',
      amount: 40000000000,
      evidence: { ...officialSection237Obs.evidence!, fiscalYear: 2025, documentId: 'DGBF-LFI-2025' },
    };
    const doc2025: SourceDocument = {
      ...validLfiDoc,
      id: 'DGBF-LFI-2025',
      fiscalYear: 2025,
    };
    const audit2025: FinancialAuditRecord = {
      controlId: 'AUDIT-LFI-2025-SEC-237',
      documentId: 'DGBF-LFI-2025',
      documentSha256: validLfiDoc.sha256!,
      fiscalYear: 2025,
      controlStatus: 'VERIFIED',
      reportRef: 'test',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'PLANNED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 40000000000,
      page: 47,
    };
    const audits = [...OFFICIAL_FINANCIAL_AUDITS, audit2025];
    const docs = [...testDocs, doc2025];
    const equivalenceRef = {
      documentId: 'DGBF-LFI-2026',
      page: 47,
      reference: 'Equivalence',
      fiscalYear: 2026,
      verification: 'VERIFIED' as const,
    };

    // Observation 2026 mutée (+1 FCFA)
    const mutated2026: FinancialObservation = {
      ...officialSection237Obs,
      amount: 45121940916 + 1,
    };
    const comparison = compareHistory(obs2025, mutated2026, equivalenceRef, docs, audits);
    expect(comparison.status).toBe('UNKNOWN');
    expect(comparison.value).toBeNull();
    expect(comparison.nominalDelta).toBeNull();

    // Comparaison valide avec montants officiels exacts
    const validComparison = compareHistory(obs2025, officialSection237Obs, equivalenceRef, docs, audits);
    expect(validComparison.status).toBe('AVAILABLE');
    expect(validComparison.nominalDelta).toBe(45121940916 - 40000000000);
    expect(validComparison.value).toBeCloseTo((5121940916 / 40000000000) * 100);
  });

  // 21. Agrégat contenant un montant rejeté
  it('21. protects aggregateObservations by rejecting entire aggregate (null / UNKNOWN) if any element is mutated', () => {
    const progAudit = OFFICIAL_FINANCIAL_AUDITS.find(a => a.sectionCode === '334' && a.scope === 'PROGRAM_23220')!;
    const progObs: FinancialObservation = {
      institutionId: progAudit.institutionId,
      sectionCode: progAudit.sectionCode,
      fiscalYear: 2026,
      scope: progAudit.scope,
      programCode: progAudit.programCode,
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'PLANNED',
      basis: 'INITIAL_BUDGET',
      amount: progAudit.auditedAmount,
      precision: 'EXACT',
      evidence: {
        documentId: progAudit.documentId,
        page: progAudit.page ?? null,
        reference: 'Tableau 7',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const mutatedProgObs: FinancialObservation = {
      ...progObs,
      amount: progAudit.auditedAmount + 1, // Muté !
    };

    // Agrégat avec [élément valide, élément muté]
    const aggregateWithMutation = aggregateObservations(
      [officialSection237Obs, mutatedProgObs],
      testDocs,
      OFFICIAL_FINANCIAL_AUDITS,
    );
    expect(aggregateWithMutation.status).toBe('UNKNOWN');
    expect(aggregateWithMutation.value).toBeNull();
    expect(aggregateWithMutation.reasons).toContain('AGGREGATE_CONTAINS_UNVERIFIED_AMOUNT');
    expect(aggregateWithMutation.reasons).toContain('AMOUNT_MISMATCH');

    // Agrégat avec uniquement des éléments valides
    const validAggregate = aggregateObservations(
      [officialSection237Obs, progObs],
      testDocs,
      OFFICIAL_FINANCIAL_AUDITS,
    );
    expect(validAggregate.status).toBe('AVAILABLE');
    expect(validAggregate.value).toBe(officialSection237Obs.amount! + progObs.amount!);
    expect(validAggregate.reasons).toEqual([]);
  });
});
