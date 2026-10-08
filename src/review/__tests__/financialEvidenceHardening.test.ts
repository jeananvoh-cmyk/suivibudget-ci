import { describe, expect, it } from 'vitest';
import {
  canPublishOfficialObservation,
  type SourceDocument,
} from '../domain/documents';
import {
  areDocumentIdsEquivalent,
  isReferentialAuditedAmount,
  matchFinancialAudit,
  OFFICIAL_FINANCIAL_AUDITS,
  validateCodeCoherence,
  verifyAuditRecordAgainstReferential,
  type FinancialAuditRecord,
} from '../domain/financialAudits';
import type { FinancialObservation } from '../domain/evidence';
import lot5Controls from '../../../docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json';

describe('Adversarial Financial Evidence Hardening & Scope Constraints', () => {
  const SHA_LFI_2026 = 'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76';
  const SHA_DPPD_2026 = '0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10';

  const validLfiDoc: SourceDocument = {
    id: 'DGBF-LFI-2026',
    title: 'Loi de Finances Initiale 2026',
    publisher: 'DGBF Côte d’Ivoire',
    officialUrl: 'https://budget.gouv.ci/lfi-2026.pdf',
    fiscalYear: 2026,
    accessedAt: '2026-03-01',
    httpStatus: 200,
    sha256: SHA_LFI_2026,
    pageCount: 100,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
    availability: 'AVAILABLE',
    provenance: 'OFFICIAL_SOURCE',
    extractionStatus: 'VERIFIED',
    controlScope: 'FULL_MINISTERIAL_BUDGET',
    auditRecordId: 'AUDIT-LFI-2026',
    auditReportRef: 'docs/references/2026/SOURCE_REGISTER.md#dgbf-lfi-2026',
  };

  const validDppdDoc: SourceDocument = {
    id: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    title: 'DPPD-PAP 2026-2028 Annexe 4',
    publisher: 'DGBF Côte d’Ivoire',
    officialUrl: 'https://budget.gouv.ci/dppd-pap-2026-2028.pdf',
    fiscalYear: 2026,
    accessedAt: '2026-03-01',
    httpStatus: 200,
    sha256: SHA_DPPD_2026,
    pageCount: 1200,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
    availability: 'AVAILABLE',
    provenance: 'OFFICIAL_SOURCE',
    extractionStatus: 'VERIFIED',
    controlScope: 'FULL_MINISTERIAL_BUDGET',
    auditRecordId: 'AUDIT-DPPD-2026',
    auditReportRef: 'docs/references/2026/SOURCE_REGISTER.md#dgbf-dppd-pap-2026-2028-annexe-4',
  };

  const reviewDocuments: readonly SourceDocument[] = [validLfiDoc, validDppdDoc];

  // 1. Une section non auditée est rejetée
  it('1. rejects an observation for an unaudited ministerial section even with valid LFI document', () => {
    const unauditedSectionObservation: FinancialObservation = {
      institutionId: 'gov-999',
      sectionCode: '999',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 1000000000,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Section 999 non auditée',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(unauditedSectionObservation, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('INSTITUTION_MISMATCH');

    const result = canPublishOfficialObservation(
      unauditedSectionObservation,
      reviewDocuments,
      OFFICIAL_FINANCIAL_AUDITS,
    );
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
  });

  // 2. Une section auditée ne valide pas tous ses programmes
  it('2. rejects an unaudited program inside an audited section (aggregate cannot validate program)', () => {
    const unauditedProgramObs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'PROGRAM_21042',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 15000000000,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'LFI 2026 page 47 Programme 21042 non audité',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(unauditedProgramObs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('AGGREGATE_CANNOT_VALIDATE_PROGRAM');
    expect(match.reasons).toContain('UNAUDITED_PROGRAM');

    const result = canPublishOfficialObservation(unauditedProgramObs, reviewDocuments, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('AGGREGATE_CANNOT_VALIDATE_PROGRAM');
  });

  // 3. Un programme audité ne valide pas toutes ses actions
  it('3. rejects an unaudited action inside an audited program (program aggregate cannot validate action)', () => {
    const unauditedActionObs: FinancialObservation = {
      institutionId: 'gov-034',
      sectionCode: '334',
      fiscalYear: 2026,
      scope: 'ACTION_2322099',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 500000000,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 49,
        reference: 'LFI 2026 page 49 Programme 23220',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(unauditedActionObs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('AGGREGATE_CANNOT_VALIDATE_ACTION');
    expect(match.reasons).toContain('UNAUDITED_ACTION');

    const result = canPublishOfficialObservation(unauditedActionObs, reviewDocuments, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('AGGREGATE_CANNOT_VALIDATE_ACTION');
  });

  // 4. Un montant identique dans une autre institution est rejeté
  it('4. rejects an observation with identical amount assigned to a different institution', () => {
    const mismatchedInstitutionObs: FinancialObservation = {
      institutionId: 'gov-017',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'LFI 2026 page 47',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(mismatchedInstitutionObs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('UNAUDITED_SECTION');

    const result = canPublishOfficialObservation(mismatchedInstitutionObs, reviewDocuments, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
  });

  // 5. Un montant correct avec une mesure différente est rejeté
  it('5. rejects an observation with correct amount but mismatched measure (PAID instead of ORDERED)', () => {
    const wrongMeasureObs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'PAID',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'LFI 2026 page 47',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(wrongMeasureObs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('MEASURE_MISMATCH');

    const result = canPublishOfficialObservation(wrongMeasureObs, reviewDocuments, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('MEASURE_MISMATCH');
  });

  // 6. Une observation d'un autre exercice est rejetée
  it('6. rejects an observation belonging to another fiscal year (2025 vs 2026)', () => {
    const wrongYearObs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2025,
      scope: 'SECTION_TOTAL',
      periodEnd: '2025-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'LFI 2026 page 47',
        fiscalYear: 2025,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(wrongYearObs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('FISCAL_YEAR_MISMATCH');

    const result = canPublishOfficialObservation(wrongYearObs, reviewDocuments, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
  });

  // 7. Un SHA-256 discordant est rejeté
  it('7. rejects an observation when the document SHA-256 is tampered or mismatched', () => {
    const tamperedDoc: SourceDocument = {
      ...validLfiDoc,
      sha256: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    };

    const validObs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'LFI 2026 page 47',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(validObs, OFFICIAL_FINANCIAL_AUDITS, tamperedDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('DOCUMENT_SHA_MISMATCH');

    const result = canPublishOfficialObservation(validObs, [tamperedDoc], OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('DOCUMENT_SHA_MISMATCH');
  });

  // 8. Une citation valide sans contrôle financier ne permet pas la publication
  it('8. rejects publication when a valid citation exists but no financial audit record covers the observation', () => {
    const uncitedScopeObs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'ARBITRARY_EXPENSE_LINE',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 999999,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Ligne arbitraire',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const result = canPublishOfficialObservation(uncitedScopeObs, reviewDocuments, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    expect(result.reasons).toContain('SCOPE_MISMATCH');
  });

  // 9. Une observation sans montant est rejetée
  it('9. rejects an observation without amount (amount is null)', () => {
    const nullAmountObs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: null,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Section sans montant',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const result = canPublishOfficialObservation(nullAmountObs, reviewDocuments, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('EXACT_AMOUNT_REQUIRED');
  });

  // 10. Un vrai zéro vérifié est accepté
  it('10. accepts a genuine documented zero (0 FCFA) when audited and verified across all dimensions', () => {
    const zeroAudit: FinancialAuditRecord = {
      controlId: 'AUDIT-ZERO-TEST',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/references/2026/SOURCE_REGISTER.md#zero-audit',
      institutionId: 'gov-030',
      sectionCode: '444',
      scope: 'PROGRAM_23249_SUBSIDY_LINE',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 0,
      page: 54,
    };

    const zeroObs: FinancialObservation = {
      institutionId: 'gov-030',
      sectionCode: '444',
      fiscalYear: 2026,
      scope: 'PROGRAM_23249_SUBSIDY_LINE',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 0,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 54,
        reference: 'Subvention nulle documentée 0 FCFA',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(zeroObs, [zeroAudit], validLfiDoc);
    expect(match.matched).toBe(true);
    expect(match.matchingRecord).toBe(zeroAudit);

    const result = canPublishOfficialObservation(zeroObs, reviewDocuments, [zeroAudit]);
    expect(result.status).toBe('AVAILABLE');
    expect(result.value).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  // 11. Un contrôle contradictoire provoque un rejet
  it('11. rejects an observation when the audit record has SOURCE_CONFLICT status', () => {
    const conflictAudit: FinancialAuditRecord = {
      controlId: 'AUDIT-CONFLICT-TEST',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'SOURCE_CONFLICT',
      reportRef: 'docs/references/2026/SOURCE_REGISTER.md#conflict',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 45121940916,
      page: 47,
    };

    const obs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'LFI 2026 page 47',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(obs, [conflictAudit], validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('AUDIT_SOURCE_CONFLICT');

    const result = canPublishOfficialObservation(obs, reviewDocuments, [conflictAudit]);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('AUDIT_SOURCE_CONFLICT');
  });

  // 12. Une preuve d'agrégat ne valide pas une ligne détaillée
  it('12. rejects using a SECTION_TOTAL audit record to validate a detailed ACTION observation', () => {
    const sectionAuditOnly: FinancialAuditRecord = {
      controlId: 'AUDIT-SECTION-ONLY',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/references/2026/SOURCE_REGISTER.md#sec-237',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 45121940916,
      page: 47,
    };

    const actionObs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'ACTION_2104201',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Tentative de validation action par agrégat de section',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(actionObs, [sectionAuditOnly], validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('AGGREGATE_CANNOT_VALIDATE_ACTION');
    expect(match.reasons).toContain('UNAUDITED_ACTION');

    const result = canPublishOfficialObservation(actionObs, reviewDocuments, [sectionAuditOnly]);
    expect(result.status).toBe('UNKNOWN');
    expect(result.value).toBeNull();
    expect(result.reasons).toContain('AGGREGATE_CANNOT_VALIDATE_ACTION');
  });

  // Integration test with real official audits
  it('successfully publishes a real ministerial section total when all dimensions match official audit records', () => {
    const validMinistryObs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Tableau 7 Section 237 MFPMA',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const result = canPublishOfficialObservation(validMinistryObs, reviewDocuments, OFFICIAL_FINANCIAL_AUDITS);
    expect(result.status).toBe('AVAILABLE');
    expect(result.value).toBe(45121940916);
    expect(result.reasons).toHaveLength(0);
  });
});

describe('Corrections ciblées PR #29 — Audits contradictoires, page obligatoire, cohérence des codes et registre', () => {
  const SHA_LFI_2026 = 'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76';
  const SHA_DPPD_2026 = '0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10';

  const validLfiDoc: SourceDocument = {
    id: 'DGBF-LFI-2026',
    title: 'Loi de Finances Initiale 2026',
    publisher: 'DGBF Côte d’Ivoire',
    officialUrl: 'https://budget.gouv.ci/lfi-2026.pdf',
    fiscalYear: 2026,
    accessedAt: '2026-03-01',
    httpStatus: 200,
    sha256: SHA_LFI_2026,
    pageCount: 100,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
    availability: 'AVAILABLE',
    provenance: 'OFFICIAL_SOURCE',
    extractionStatus: 'VERIFIED',
    controlScope: 'FULL_MINISTERIAL_BUDGET',
    auditRecordId: 'AUDIT-LFI-2026',
    auditReportRef: 'docs/references/2026/SOURCE_REGISTER.md#dgbf-lfi-2026',
  };

  const validDppdDoc: SourceDocument = {
    id: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
    title: 'DPPD-PAP 2026-2028 Annexe 4',
    publisher: 'DGBF Côte d’Ivoire',
    officialUrl: 'https://budget.gouv.ci/dppd-pap-2026-2028.pdf',
    fiscalYear: 2026,
    accessedAt: '2026-03-01',
    httpStatus: 200,
    sha256: SHA_DPPD_2026,
    pageCount: 1200,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
    availability: 'AVAILABLE',
    provenance: 'OFFICIAL_SOURCE',
    extractionStatus: 'VERIFIED',
    controlScope: 'FULL_MINISTERIAL_BUDGET',
    auditRecordId: 'AUDIT-DPPD-2026',
    auditReportRef: 'docs/references/2026/SOURCE_REGISTER.md#dgbf-dppd-pap-2026-2028-annexe-4',
  };

  // 1. Deux audits contradictoires du même montant
  it('1. rejects when two contradictory audits exist for the same amount (conflicting pages)', () => {
    const auditA: FinancialAuditRecord = {
      controlId: 'AUDIT-A',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 45121940916,
      page: 47,
    };
    const auditB: FinancialAuditRecord = {
      ...auditA,
      controlId: 'AUDIT-B',
      page: 50, // Contradiction sur la page documentaire du même montant !
    };

    const obs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Tableau 7 p. 47',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(obs, [auditA, auditB], validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('CONTRADICTORY_AUDIT_PAGES');
    expect(match.reasons).toContain('CONTRADICTORY_AUDIT_RECORDS');
  });

  // 2. Audit vérifié et audit SOURCE_CONFLICT sur le même périmètre
  it('2. rejects when a VERIFIED audit and a SOURCE_CONFLICT audit coexist on the same scope', () => {
    const auditVerified: FinancialAuditRecord = {
      controlId: 'AUDIT-VERIFIED',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 45121940916,
      page: 47,
    };
    const auditConflict: FinancialAuditRecord = {
      ...auditVerified,
      controlId: 'AUDIT-CONFLICT',
      controlStatus: 'SOURCE_CONFLICT', // Conflit de source signalé sur le même périmètre !
    };

    const obs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Tableau 7',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(obs, [auditVerified, auditConflict], validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('AUDIT_SOURCE_CONFLICT');
  });

  // 3. Page absente alors que l'audit précise une page
  it('3. rejects when page is absent in observation while audit specifies an exact page (no bypass)', () => {
    const auditWithPage: FinancialAuditRecord = {
      controlId: 'AUDIT-PAGE-REQUIRED',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 45121940916,
      page: 47, // L'audit est limité à la page 47 !
    };

    const obsMissingPage: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: null, // Page absente / non renseignée !
        reference: 'Tableau 7 p. 47',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(obsMissingPage, [auditWithPage], validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('PAGE_REQUIRED');
  });

  // 4. Page différente
  it('4. rejects when observation provides a different page than the audited page', () => {
    const auditWithPage: FinancialAuditRecord = {
      controlId: 'AUDIT-PAGE-47',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 45121940916,
      page: 47,
    };

    const obsWrongPage: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 50, // Page différente de l'audit (50 au lieu de 47) !
        reference: 'Tableau 7',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(obsWrongPage, [auditWithPage], validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('PAGE_MISMATCH');
  });

  // 5. scope correct mais programCode incohérent
  it('5. rejects when scope is PROGRAM_23220 but structured programCode is mismatched', () => {
    const obsMismatchedProgCode: FinancialObservation = {
      institutionId: 'gov-034',
      sectionCode: '334',
      fiscalYear: 2026,
      scope: 'PROGRAM_23220',
      programCode: '21042', // Code programme contradictoire avec le scope 23220 !
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 46000000000,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 49,
        reference: 'Tableau 7',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const coherence = validateCodeCoherence(obsMismatchedProgCode);
    expect(coherence.valid).toBe(false);
    expect(coherence.reasons).toContain('SCOPE_PROGRAM_CODE_MISMATCH');

    const match = matchFinancialAudit(obsMismatchedProgCode, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('SCOPE_PROGRAM_CODE_MISMATCH');
  });

  // 6. scope correct mais actionCode incohérent
  it('6. rejects when scope is ACTION_2322001 but structured actionCode is mismatched', () => {
    const obsMismatchedActCode: FinancialObservation = {
      institutionId: 'gov-034',
      sectionCode: '334',
      fiscalYear: 2026,
      scope: 'ACTION_2322001',
      actionCode: '2322002', // Code action contradictoire avec le scope 2322001 !
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 17178600000,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
        page: 563,
        reference: 'Tableau 7',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const coherence = validateCodeCoherence(obsMismatchedActCode);
    expect(coherence.valid).toBe(false);
    expect(coherence.reasons).toContain('SCOPE_ACTION_CODE_MISMATCH');

    const match = matchFinancialAudit(obsMismatchedActCode, OFFICIAL_FINANCIAL_AUDITS, validDppdDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('SCOPE_ACTION_CODE_MISMATCH');
  });

  // 7. Action rattachée à un mauvais programme
  it('7. rejects when an action is attached to a wrong program (action prefix mismatch)', () => {
    const obsActionWrongProgram: FinancialObservation = {
      institutionId: 'gov-034',
      sectionCode: '334',
      fiscalYear: 2026,
      scope: 'ACTION_2322001',
      programCode: '23241', // L'action 2322001 n'appartient PAS au programme 23241 !
      actionCode: '2322001',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 17178600000,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
        page: 563,
        reference: 'Tableau 7',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const coherence = validateCodeCoherence(obsActionWrongProgram);
    expect(coherence.valid).toBe(false);
    expect(coherence.reasons).toContain('ACTION_PROGRAM_MISMATCH');

    const match = matchFinancialAudit(obsActionWrongProgram, OFFICIAL_FINANCIAL_AUDITS, validDppdDoc);
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('ACTION_PROGRAM_MISMATCH');
  });

  // 8. Montant présent dans le code mais absent du référentiel documentaire
  it('8. rejects an audit record or observation with amount absent from the documentary referential', () => {
    // 999 999 999 FCFA n'existe nulle part dans le référentiel LOT5_INDEPENDENT_LFI_CONTROLS.json
    expect(isReferentialAuditedAmount(999999999)).toBe(false);

    const syntheticUnreferentialAudit: FinancialAuditRecord = {
      controlId: 'AUDIT-UNREFERENCED',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 999999999, // Montant absent du référentiel officiel !
      page: 47,
    };

    const refValidation = verifyAuditRecordAgainstReferential(syntheticUnreferentialAudit);
    expect(refValidation.valid).toBe(false);
    expect(refValidation.reasons).toContain('AMOUNT_NOT_IN_DOCUMENTARY_REFERENTIAL');
  });

  // 9. Zéro officiel exact toujours accepté
  it('9. always accepts a genuine documented zero (0 FCFA) audited across all dimensions including page', () => {
    const zeroAudit: FinancialAuditRecord = {
      controlId: 'AUDIT-ZERO-OFFICIAL',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/references/2026/SOURCE_REGISTER.md#zero-official',
      institutionId: 'gov-030',
      sectionCode: '444',
      scope: 'PROGRAM_23249_SUBSIDY_LINE',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 0,
      page: 54,
    };

    const zeroObservation: FinancialObservation = {
      institutionId: 'gov-030',
      sectionCode: '444',
      fiscalYear: 2026,
      scope: 'PROGRAM_23249_SUBSIDY_LINE',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 0,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 54,
        reference: 'Subvention nulle légale 0 FCFA',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(zeroObservation, [zeroAudit], validLfiDoc);
    expect(match.matched).toBe(true);
    expect(match.matchingRecord).toBe(zeroAudit);

    const publishResult = canPublishOfficialObservation(zeroObservation, [validLfiDoc], [zeroAudit]);
    expect(publishResult.status).toBe('AVAILABLE');
    expect(publishResult.value).toBe(0);
    expect(publishResult.reasons).toHaveLength(0);
  });

  // 10. Observation réellement vérifiée toujours acceptée
  it('10. always accepts a genuinely verified observation matching the official documentary referential', () => {
    const verifiedSection237Obs: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: 47,
        reference: 'Tableau 7 Section 237 MFPMA',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(verifiedSection237Obs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
    expect(match.matched).toBe(true);
    expect(match.matchingRecord).not.toBeNull();
    expect(match.matchingRecord?.auditedAmount).toBe(45121940916);

    const publishResult = canPublishOfficialObservation(verifiedSection237Obs, [validLfiDoc], OFFICIAL_FINANCIAL_AUDITS);
    expect(publishResult.status).toBe('AVAILABLE');
    expect(publishResult.value).toBe(45121940916);
    expect(publishResult.reasons).toHaveLength(0);
  });

  // Test de correspondance explicite sur tableRef sans page
  it('correctly matches when audit specifies a tableRef without page requirement', () => {
    const auditWithTableRefOnly: FinancialAuditRecord = {
      controlId: 'AUDIT-TABLEREF-ONLY',
      documentId: 'DGBF-LFI-2026',
      documentSha256: SHA_LFI_2026,
      fiscalYear: 2026,
      controlStatus: 'VERIFIED',
      reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
      institutionId: 'gov-003',
      sectionCode: '237',
      scope: 'SECTION_TOTAL',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      currency: 'XOF',
      auditedAmount: 45121940916,
      page: null, // Pas de page fixe exigée
      tableRef: 'Tableau 7',
    };

    const obsWithMatchingTable: FinancialObservation = {
      institutionId: 'gov-003',
      sectionCode: '237',
      fiscalYear: 2026,
      scope: 'SECTION_TOTAL',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916,
      precision: 'EXACT',
      evidence: {
        documentId: 'DGBF-LFI-2026',
        page: null,
        reference: 'Tableau 7 : Synthèse budgétaire',
        fiscalYear: 2026,
        verification: 'VERIFIED',
      },
    };

    const match = matchFinancialAudit(obsWithMatchingTable, [auditWithTableRefOnly], validLfiDoc);
    expect(match.matched).toBe(true);

    const obsWithWrongTable: FinancialObservation = {
      ...obsWithMatchingTable,
      evidence: {
        ...obsWithMatchingTable.evidence!,
        reference: 'Annexe A non correspondante',
      },
    };
    const mismatchResult = matchFinancialAudit(obsWithWrongTable, [auditWithTableRefOnly], validLfiDoc);
    expect(mismatchResult.matched).toBe(false);
    expect(mismatchResult.reasons).toContain('TABLE_REF_MISMATCH');
  });

  // Test d'intégrité exhaustive et d'équivalence d'identifiants documentaires LFI et DPPD
  it('verifies exhaustive integrity between OFFICIAL_FINANCIAL_AUDITS and LOT5_INDEPENDENT_LFI_CONTROLS.json', () => {
    // 1. Tous les enregistrements d'audit officiels doivent être validés par le référentiel
    for (const audit of OFFICIAL_FINANCIAL_AUDITS) {
      const validation = verifyAuditRecordAgainstReferential(audit);
      expect(validation.valid).toBe(true);
      expect(validation.reasons).toHaveLength(0);
    }

    // 2. Équivalence des identifiants documentaires LFI et DPPD
    expect(areDocumentIdsEquivalent('DGBF-LFI-2026', 'DGBF-LFI-2026')).toBe(true);
    expect(areDocumentIdsEquivalent('DGBF-DPPD-PAP-2026-2028', 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4')).toBe(true);
    expect(areDocumentIdsEquivalent('DGBF-DPPD-PAP-2026-2028-ANNEXE-4', 'DGBF-DPPD-PAP-2026-2028')).toBe(true);

    // 3. Tous les totaux de section du référentiel sont présents dans OFFICIAL_FINANCIAL_AUDITS
    for (const sc of lot5Controls.section_controls) {
      const match = OFFICIAL_FINANCIAL_AUDITS.find(a => a.sectionCode === sc.section && a.scope === 'SECTION_TOTAL');
      expect(match).toBeDefined();
      expect(match?.auditedAmount).toBe(sc.section_total_fcfa);
    }
  });
});
