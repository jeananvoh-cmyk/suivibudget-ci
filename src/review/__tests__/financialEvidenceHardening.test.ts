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

describe('LOT5 documentary identity and page gate', () => {
  const section = OFFICIAL_FINANCIAL_AUDITS.find(a => a.sectionCode === '334' && a.scope === 'SECTION_TOTAL')!;
  const program = OFFICIAL_FINANCIAL_AUDITS.find(a => a.sectionCode === '334' && a.scope === 'PROGRAM_23220')!;
  const action = OFFICIAL_FINANCIAL_AUDITS.find(a => a.sectionCode === '334' && a.scope === 'ACTION_2322001')!;
  const lfi = lot5Controls.sources.find(s => s.document_id === 'DGBF-LFI-2026')!;
  const dppd = lot5Controls.sources.find(s => s.document_id === 'DGBF-DPPD-PAP-2026-2028')!;
  const docFor = (audit: FinancialAuditRecord): SourceDocument => ({
    id: audit.documentId, title: audit.documentId, publisher: 'DGBF',
    officialUrl: audit.scope.startsWith('ACTION_') ? dppd.official_url : lfi.official_url,
    fiscalYear: 2026, accessedAt: '2026-10-01', httpStatus: 200,
    sha256: audit.documentSha256, pageCount: 1500, verification: 'VERIFIED',
    visibility: 'PUBLIC', previousVersionId: null, availability: 'AVAILABLE',
    provenance: 'OFFICIAL_SOURCE', extractionStatus: 'VERIFIED',
  });
  const obsFor = (audit: FinancialAuditRecord): FinancialObservation => ({
    institutionId: audit.institutionId, sectionCode: audit.sectionCode,
    fiscalYear: audit.fiscalYear, scope: audit.scope,
    programCode: audit.programCode, actionCode: audit.actionCode,
    periodEnd: '2026-12-31', currency: 'XOF', measure: 'ORDERED',
    basis: 'INITIAL_BUDGET', amount: audit.auditedAmount, precision: 'EXACT',
    evidence: { documentId: audit.documentId, page: audit.page ?? null,
      reference: 'Tableau 7', fiscalYear: 2026, verification: 'VERIFIED' },
  });
  const publish = (audit: FinancialAuditRecord, observation = obsFor(audit)) =>
    canPublishOfficialObservation(observation, [docFor(audit)], [audit]);

  it.each([section, program, action])('accepts the exact official line %s', audit => {
    expect(verifyAuditRecordAgainstReferential(audit).valid).toBe(true);
    expect(publish(audit).status).toBe('AVAILABLE');
  });

  it.each([
    [section, dppd], [program, dppd], [action, lfi],
  ])('rejects a correct amount assigned to the wrong source document', (audit, source) => {
    const swapped = { ...audit, documentId: source.document_id, documentSha256: source.sha256 };
    expect(verifyAuditRecordAgainstReferential(swapped).reasons).toContain('DOCUMENT_SCOPE_MISMATCH');
    expect(publish(swapped).status).toBe('UNKNOWN');
  });

  it.each([section, program, action])('rejects bad ID or hash for %s', audit => {
    for (const altered of [
      { ...audit, documentId: 'DGBF-DPPD-PAP-2026-2028-OTHER' },
      { ...audit, documentSha256: 'a'.repeat(64) },
    ]) {
      expect(verifyAuditRecordAgainstReferential(altered).valid).toBe(false);
      expect(publish(altered).status).toBe('UNKNOWN');
    }
  });

  it.each([section, program, action])('requires the referential page for %s', audit => {
    const missing = { ...audit, page: null };
    const wrong = { ...audit, page: 999 };
    expect(verifyAuditRecordAgainstReferential(missing).reasons).toContain('AUDIT_PAGE_REQUIRED');
    expect(verifyAuditRecordAgainstReferential(wrong).reasons).toContain('PAGE_NOT_IN_REFERENTIAL');
    expect(publish(missing).status).toBe('UNKNOWN');
    expect(publish(wrong).status).toBe('UNKNOWN');
  });

  it.each([section, program, action])('requires the same page in the public citation for %s', audit => {
    expect(publish(audit, { ...obsFor(audit), evidence: { ...obsFor(audit).evidence!, page: null } }).status).toBe('UNKNOWN');
    expect(publish(audit, { ...obsFor(audit), evidence: { ...obsFor(audit).evidence!, page: 999 } }).status).toBe('UNKNOWN');
  });

  it('rejects a correct amount on another section, institution or action', () => {
    for (const altered of [
      { ...action, sectionCode: '336' },
      { ...action, institutionId: 'gov-017' },
      { ...action, scope: 'ACTION_2322002', actionCode: '2322002' },
      { ...action, programCode: '23223' },
    ]) expect(publish(altered).status).toBe('UNKNOWN');
  });

  it('rejects SOURCE_CONFLICT and accepts only an explicit DPPD Annex 4 alias', () => {
    expect(publish({ ...action, controlStatus: 'SOURCE_CONFLICT' }).status).toBe('UNKNOWN');
    const alias = { ...action, documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4' };
    expect(verifyAuditRecordAgainstReferential(alias).valid).toBe(true);
    expect(publish(alias).status).toBe('AVAILABLE');
  });

  it('preserves a documented zero only in a synthetic non-LOT5 fixture', () => {
    const synthetic = { ...section, controlId: 'TEST-ZERO', reportRef: 'synthetic-test',
      documentId: 'synthetic-document', documentSha256: 'a'.repeat(64), auditedAmount: 0 };
    expect(publish(synthetic).value).toBe(0);
  });
});

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
      programCode: '21042',
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
      programCode: '23220',
      actionCode: '2322099',
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
      scope: 'PROGRAM_23249',
      programCode: '23249',
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
      scope: 'PROGRAM_23249',
      programCode: '23249',
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
      programCode: '21042',
      actionCode: '2104201',
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
      scope: 'PROGRAM_23249',
      programCode: '23249',
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
      scope: 'PROGRAM_23249',
      programCode: '23249',
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

  it('rejects a LOT5 table reference without the required source page', () => {
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
      page: null,
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
    expect(match.matched).toBe(false);
    expect(match.reasons).toContain('AUDIT_PAGE_REQUIRED');

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

  describe('Phase 4 — 16 Scénarios adversariaux de contrôle strict et intégrité LOT5', () => {
    // 1. Montant correct appartenant à une autre section
    it('S1. rejects an observation with correct amount belonging to another section', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-017',
        sectionCode: '336',
        fiscalYear: 2026,
        scope: 'SECTION_TOTAL',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        amount: 45121940916, // Appartient à 237, pas 336
        precision: 'EXACT',
        evidence: {
          documentId: 'DGBF-LFI-2026',
          page: 49,
          reference: 'Tableau 7 Section 336',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };
      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('AMOUNT_MISMATCH');
    });

    // 2. Montant correct appartenant à un autre programme
    it('S2. rejects an observation with correct amount belonging to another program', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-017',
        sectionCode: '336',
        fiscalYear: 2026,
        scope: 'PROGRAM_23223',
        programCode: '23223',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        amount: 2035000000, // Appartient à 23224, pas 23223
        precision: 'EXACT',
        evidence: {
          documentId: 'DGBF-LFI-2026',
          page: 50,
          reference: 'Tableau 7 Programme 23223',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };
      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('AMOUNT_MISMATCH');
    });

    // 3. Montant correct appartenant à une autre action
    it('S3. rejects an observation with correct amount belonging to another action', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-034',
        sectionCode: '334',
        fiscalYear: 2026,
        scope: 'ACTION_2322001',
        programCode: '23220',
        actionCode: '2322001',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        amount: 28821400000, // Appartient à 2322002, pas 2322001
        precision: 'EXACT',
        evidence: {
          documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
          page: 563,
          reference: 'Tableau 7 Action 2322001',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };
      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validDppdDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('AMOUNT_MISMATCH');
    });

    // 4. Montant de section réutilisé comme montant de programme
    it('S4. rejects an observation reusing section total as program amount', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-034',
        sectionCode: '334',
        fiscalYear: 2026,
        scope: 'PROGRAM_23220',
        programCode: '23220',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        amount: 182301855312, // Montant de la section 334, pas du programme 23220 (46000000000)
        precision: 'EXACT',
        evidence: {
          documentId: 'DGBF-LFI-2026',
          page: 49,
          reference: 'Tableau 7 Programme 23220',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };
      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('AMOUNT_MISMATCH');
    });

    // 5. Audit officiel fabriqué avec un montant existant ailleurs dans LOT5
    it('S5. rejects a fabricated official audit record using an amount existing elsewhere in LOT5', () => {
      const fabricatedAudit: FinancialAuditRecord = {
        controlId: 'AUDIT-LFI-2026-SEC-336-FABRICATED',
        documentId: 'DGBF-LFI-2026',
        documentSha256: SHA_LFI_2026,
        fiscalYear: 2026,
        controlStatus: 'VERIFIED',
        reportRef: 'docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls',
        institutionId: 'gov-017',
        sectionCode: '336',
        scope: 'SECTION_TOTAL',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        currency: 'XOF',
        auditedAmount: 45121940916, // Montant de la section 237, pas 336
        page: 49,
      };

      const refCheck = verifyAuditRecordAgainstReferential(fabricatedAudit);
      expect(refCheck.valid).toBe(false);
      expect(refCheck.reasons).toContain('AMOUNT_NOT_IN_DOCUMENTARY_REFERENTIAL');

      const obs: FinancialObservation = {
        institutionId: 'gov-017',
        sectionCode: '336',
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
          page: 49,
          reference: 'Tableau 7',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };
      const match = matchFinancialAudit(obs, [fabricatedAudit], validLfiDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('AMOUNT_NOT_IN_DOCUMENTARY_REFERENTIAL');
    });

    // 6. Audit officiel sans correspondance exacte dans le référentiel
    it('S6. rejects a fabricated official audit record with no exact match in the referential', () => {
      const fabricatedAudit: FinancialAuditRecord = {
        controlId: 'AUDIT-LFI-2026-UNKNOWN',
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
        auditedAmount: 999999999,
        page: 47,
      };

      const refCheck = verifyAuditRecordAgainstReferential(fabricatedAudit);
      expect(refCheck.valid).toBe(false);
      expect(refCheck.reasons).toContain('AMOUNT_NOT_IN_DOCUMENTARY_REFERENTIAL');

      const obs: FinancialObservation = {
        institutionId: 'gov-003',
        sectionCode: '237',
        fiscalYear: 2026,
        scope: 'SECTION_TOTAL',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        amount: 999999999,
        precision: 'EXACT',
        evidence: {
          documentId: 'DGBF-LFI-2026',
          page: 47,
          reference: 'Tableau 7',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };
      const match = matchFinancialAudit(obs, [fabricatedAudit], validLfiDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('AMOUNT_NOT_IN_DOCUMENTARY_REFERENTIAL');
    });

    // 7. Programme sans programCode
    it('S7. rejects a program observation without programCode', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-034',
        sectionCode: '334',
        fiscalYear: 2026,
        scope: 'PROGRAM_23220',
        programCode: null,
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
      const coherence = validateCodeCoherence(obs);
      expect(coherence.valid).toBe(false);
      expect(coherence.reasons).toContain('PROGRAM_CODE_REQUIRED');

      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('PROGRAM_CODE_REQUIRED');
    });

    // 8. Action sans actionCode
    it('S8. rejects an action observation without actionCode', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-034',
        sectionCode: '334',
        fiscalYear: 2026,
        scope: 'ACTION_2322001',
        programCode: '23220',
        actionCode: null,
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
      const coherence = validateCodeCoherence(obs);
      expect(coherence.valid).toBe(false);
      expect(coherence.reasons).toContain('ACTION_CODE_REQUIRED');

      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validDppdDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('ACTION_CODE_REQUIRED');
    });

    // 9. Action sans programCode
    it('S9. rejects an action observation without programCode', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-034',
        sectionCode: '334',
        fiscalYear: 2026,
        scope: 'ACTION_2322001',
        programCode: null,
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
      const coherence = validateCodeCoherence(obs);
      expect(coherence.valid).toBe(false);
      expect(coherence.reasons).toContain('PROGRAM_CODE_REQUIRED');

      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validDppdDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('PROGRAM_CODE_REQUIRED');
    });

    // 10. Action avec code parent incorrect
    it('S10. rejects an action observation with mismatched parent program code', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-034',
        sectionCode: '334',
        fiscalYear: 2026,
        scope: 'ACTION_2322001',
        programCode: '21042', // Mauvais programme parent
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
      const coherence = validateCodeCoherence(obs);
      expect(coherence.valid).toBe(false);
      expect(coherence.reasons).toContain('ACTION_PROGRAM_MISMATCH');

      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validDppdDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('ACTION_PROGRAM_MISMATCH');
    });

    // 11. Programme avec code de longueur invalide
    it('S11. rejects a program observation with invalid code length (not 5 digits)', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-034',
        sectionCode: '334',
        fiscalYear: 2026,
        scope: 'PROGRAM_2322', // 4 chiffres au lieu de 5
        programCode: '2322',
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
      const coherence = validateCodeCoherence(obs);
      expect(coherence.valid).toBe(false);
      expect(coherence.reasons).toContain('INVALID_PROGRAM_CODE_LENGTH');

      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validLfiDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('INVALID_PROGRAM_CODE_LENGTH');
    });

    // 12. Action avec code de longueur invalide
    it('S12. rejects an action observation with invalid code length (not 7 digits)', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-034',
        sectionCode: '334',
        fiscalYear: 2026,
        scope: 'ACTION_23220010', // 8 chiffres au lieu de 7
        programCode: '23220',
        actionCode: '23220010',
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
      const coherence = validateCodeCoherence(obs);
      expect(coherence.valid).toBe(false);
      expect(coherence.reasons).toContain('INVALID_ACTION_CODE_LENGTH');

      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validDppdDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('INVALID_ACTION_CODE_LENGTH');
    });

    // 13. Observation valide avec tous ses codes et preuves
    it('S13. accepts a valid observation with all mandatory structured codes and documentary evidence', () => {
      const obs: FinancialObservation = {
        institutionId: 'gov-017',
        sectionCode: '336',
        fiscalYear: 2026,
        scope: 'ACTION_2322301',
        programCode: '23223',
        actionCode: '2322301',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        amount: 16465000001,
        precision: 'EXACT',
        evidence: {
          documentId: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
          page: 651,
          reference: 'Tableau 7 : Budget détaillé du programme',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };
      const coherence = validateCodeCoherence(obs);
      expect(coherence.valid).toBe(true);

      const match = matchFinancialAudit(obs, OFFICIAL_FINANCIAL_AUDITS, validDppdDoc);
      expect(match.matched).toBe(true);
      expect(match.matchingRecord?.auditedAmount).toBe(16465000001);

      const publish = canPublishOfficialObservation(obs, [validDppdDoc], OFFICIAL_FINANCIAL_AUDITS);
      expect(publish.status).toBe('AVAILABLE');
      expect(publish.value).toBe(16465000001);
      expect(publish.reasons).toHaveLength(0);
    });

    // 14. Vrai montant zéro officiellement contrôlé
    it('S14. accepts a genuine documented zero amount when audited and verified across all dimensions', () => {
      const zeroAudit: FinancialAuditRecord = {
        controlId: 'AUDIT-SYNTHETIC-ZERO-S14',
        documentId: 'test-only',
        documentSha256: 'a'.repeat(64),
        fiscalYear: 2026,
        controlStatus: 'VERIFIED',
        reportRef: 'test-report',
        institutionId: 'gov-030',
        sectionCode: '444',
        scope: 'PROGRAM_23249',
        programCode: '23249',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        currency: 'XOF',
        auditedAmount: 0,
        page: 54,
      };

      const testDoc: SourceDocument = {
        ...validLfiDoc,
        id: 'test-only',
        sha256: 'a'.repeat(64),
      };

      const zeroObs: FinancialObservation = {
        institutionId: 'gov-030',
        sectionCode: '444',
        fiscalYear: 2026,
        scope: 'PROGRAM_23249',
        programCode: '23249',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        amount: 0,
        precision: 'EXACT',
        evidence: {
          documentId: 'test-only',
          page: 54,
          reference: 'Subvention nulle documentée 0 FCFA',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };

      const match = matchFinancialAudit(zeroObs, [zeroAudit], testDoc);
      expect(match.matched).toBe(true);

      const publish = canPublishOfficialObservation(zeroObs, [testDoc], [zeroAudit]);
      expect(publish.status).toBe('AVAILABLE');
      expect(publish.value).toBe(0);
    });

    // 15. Deux audits contradictoires
    it('S15. rejects when two contradictory audits exist for the same scope', () => {
      const auditA: FinancialAuditRecord = {
        controlId: 'AUDIT-A',
        documentId: 'test-only',
        documentSha256: 'a'.repeat(64),
        fiscalYear: 2026,
        controlStatus: 'VERIFIED',
        reportRef: 'test-report',
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
        auditedAmount: 45121940900, // Montant divergent
      };

      const testDoc: SourceDocument = {
        ...validLfiDoc,
        id: 'test-only',
        sha256: 'a'.repeat(64),
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
          documentId: 'test-only',
          page: 47,
          reference: 'Tableau 7',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };

      const match = matchFinancialAudit(obs, [auditA, auditB], testDoc);
      expect(match.matched).toBe(false);
      expect(match.reasons).toContain('CONTRADICTORY_AUDIT_AMOUNTS');
    });

    // 16. Audit avec page manquante ou différente
    it('S16. rejects when observation has missing page or mismatched page against audited page', () => {
      const audit: FinancialAuditRecord = {
        controlId: 'AUDIT-PAGE-TEST',
        documentId: 'test-only',
        documentSha256: 'a'.repeat(64),
        fiscalYear: 2026,
        controlStatus: 'VERIFIED',
        reportRef: 'test-report',
        institutionId: 'gov-003',
        sectionCode: '237',
        scope: 'SECTION_TOTAL',
        measure: 'ORDERED',
        basis: 'INITIAL_BUDGET',
        currency: 'XOF',
        auditedAmount: 45121940916,
        page: 47,
      };

      const testDoc: SourceDocument = {
        ...validLfiDoc,
        id: 'test-only',
        sha256: 'a'.repeat(64),
      };

      // Page manquante
      const obsNoPage: FinancialObservation = {
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
          documentId: 'test-only',
          page: null,
          reference: 'Tableau 7',
          fiscalYear: 2026,
          verification: 'VERIFIED',
        },
      };
      const matchNoPage = matchFinancialAudit(obsNoPage, [audit], testDoc);
      expect(matchNoPage.matched).toBe(false);
      expect(matchNoPage.reasons).toContain('PAGE_REQUIRED');

      // Page différente
      const obsWrongPage: FinancialObservation = {
        ...obsNoPage,
        evidence: {
          ...obsNoPage.evidence!,
          page: 99,
        },
      };
      const matchWrongPage = matchFinancialAudit(obsWrongPage, [audit], testDoc);
      expect(matchWrongPage.matched).toBe(false);
      expect(matchWrongPage.reasons).toContain('PAGE_MISMATCH');
    });
  });
});
