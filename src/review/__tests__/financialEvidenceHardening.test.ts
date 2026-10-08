import { describe, expect, it } from 'vitest';
import {
  canPublishOfficialObservation,
  type SourceDocument,
} from '../domain/documents';
import {
  matchFinancialAudit,
  OFFICIAL_FINANCIAL_AUDITS,
  type FinancialAuditRecord,
} from '../domain/financialAudits';
import type { FinancialObservation } from '../domain/evidence';

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
    // Section 237 is audited at SECTION_TOTAL, but has NO PROGRAM audits in OFFICIAL_FINANCIAL_AUDITS
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
    // Program 23220 is audited in Section 334 in DGBF-LFI-2026, but Action 2322099 is not audited
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
    // 45 121 940 916 FCFA is Section 237 total for gov-003, here attributed to gov-017
    const mismatchedInstitutionObs: FinancialObservation = {
      institutionId: 'gov-017', // Wrong institution!
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
    expect(match.reasons).toContain('UNAUDITED_SECTION'); // Section 237 doesn't exist for gov-017

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
      measure: 'PAID', // Wrong measure: LFI is INITIAL_BUDGET / ORDERED, not PAID
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
      fiscalYear: 2025, // Exercice 2025
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
    // Valid citation pointing to DGBF-LFI-2026 page 10, but no financial audit exists for this scope/amount
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
      controlStatus: 'SOURCE_CONFLICT', // Conflict identified!
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
      scope: 'ACTION_2104201', // Detailed action line!
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'ORDERED',
      basis: 'INITIAL_BUDGET',
      amount: 45121940916, // Even if an actor tries to supply the section amount to the action line
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
