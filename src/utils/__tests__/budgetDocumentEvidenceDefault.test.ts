import { describe, expect, it } from 'vitest';
import type { Institution } from '../../types';
import type { DocumentIngestionMetadata, ProposedFinancialValue } from '../../types/budgetCycle';
import { buildStandardImportEnvelope, runDocumentDryRun, toPipelineImportRow } from '../budgetDocumentDryRun';

const institution = {
  id: 'inst-test',
  name: 'Mairie de test',
  type: 'MAIRIE',
} as Institution;

const value: ProposedFinancialValue = {
  id: 'amount-1',
  field: 'total_amount',
  label: 'Montant total',
  section: 'GLOBAL',
  nature: 'PREVISION',
  amount: 1_000_000,
  precision: 'EXACT',
  confidence: 'MEDIUM',
  status: 'VALIDATED',
};

function metadata(document_type: DocumentIngestionMetadata['document_type'], evidence_level?: DocumentIngestionMetadata['evidence_level'], source_document_id?: string, source_page?: number): DocumentIngestionMetadata {
  return {
    institution_id: institution.id,
    fiscal_year: 2026,
    document_type,
    source_name: 'Document de test',
    source_reference: 'Référence de test',
    source_date: '2026-01-01',
    source_date_kind: 'RECORDED',
    ...(source_document_id ? { source_document_id } : {}),
    ...(source_page ? { source_page } : {}),
    ...(evidence_level ? { evidence_level } : {}),
  };
}

describe('Budget document import evidence defaults', () => {
  it('keeps an unclassified BP document pending extraction instead of promoting it to official', () => {
    const envelope = buildStandardImportEnvelope(metadata('BUDGET_PRIMITIF'), [value], institution);
    expect(envelope.data.verification_status).toBe('DOCUMENT_TO_EXTRACT');
  });

  it('keeps an unclassified CA document pending extraction instead of promoting it to official', () => {
    const envelope = buildStandardImportEnvelope(metadata('COMPTE_ADMINISTRATIF'), [value], institution);
    expect(envelope.data.verification_status).toBe('DOCUMENT_TO_EXTRACT');
  });

  it.each(['AIP_REPORTED', 'AIP_VERIFIED'] as const)(
    'downgrades legacy secondary evidence %s to corroboration required for BP and CA',
    evidence => {
      const bp = buildStandardImportEnvelope(metadata('BUDGET_PRIMITIF', evidence), [value], institution);
      const ca = buildStandardImportEnvelope(metadata('COMPTE_ADMINISTRATIF', evidence), [value], institution);
      expect(bp.data.verification_status).toBe('SECONDARY_TO_CORROBORATE');
      expect(ca.data.verification_status).toBe('SECONDARY_TO_CORROBORATE');
    }
  );

  it('blocks primary evidence when its URL is not institutionally allowlisted or its exact page is missing', () => {
    const context = { knownInstitutions: [institution], existingBudgets: [], existingAccounts: [] };
    const thirdParty = runDocumentDryRun({
      ...metadata('BUDGET_PRIMITIF', 'OFFICIAL_DOCUMENT', 'doc-test-verified'),
      source_url: 'https://example.com/fake-official-budget.pdf',
      source_page: 1,
    }, [value], context);
    expect(thirdParty.can_import).toBe(false);
    expect(thirdParty.errors.join(' ')).toContain('domaine institutionnel');

    const missingPage = runDocumentDryRun({
      ...metadata('BUDGET_PRIMITIF', 'OFFICIAL_DOCUMENT', 'doc-test-verified'),
      source_url: 'https://dgbf.gouv.ci/budget-2026.pdf',
    }, [value], context);
    expect(missingPage.can_import).toBe(false);
    expect(missingPage.errors.join(' ')).toContain('page exacte');
  });

  it('requires a catalogue document id and carries it into the SQL import envelope', () => {
    const noId = runDocumentDryRun({
      ...metadata('BUDGET_PRIMITIF', 'OFFICIAL_DOCUMENT'),
      source_url: 'https://dgbf.gouv.ci/budget-2026.pdf',
      source_page: 1,
    }, [value], { knownInstitutions: [institution], existingBudgets: [], existingAccounts: [] });
    expect(noId.can_import).toBe(false);
    expect(noId.errors.join(' ')).toContain('identifiant du document');

    const withId = buildStandardImportEnvelope(
      metadata('BUDGET_PRIMITIF', 'OFFICIAL_DOCUMENT', 'doc-test-verified', 12),
      [value],
      institution
    );
    expect(withId.data.source_document_id).toBe('doc-test-verified');
    expect(toPipelineImportRow(withId).data.source_document_id).toBe('doc-test-verified');
    expect(toPipelineImportRow(withId).data.source_page).toBe(12);
  });

  it('preserves an explicitly selected primary official document status', () => {
    const envelope = buildStandardImportEnvelope(metadata('BUDGET_PRIMITIF', 'OFFICIAL_DOCUMENT'), [value], institution);
    expect(envelope.data.verification_status).toBe('OFFICIAL_DOCUMENT');
  });
});
