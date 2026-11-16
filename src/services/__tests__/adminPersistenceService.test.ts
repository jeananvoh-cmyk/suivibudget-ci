import { describe, expect, it } from 'vitest';
import { pickAdminFields, projectMetadataFields } from '../adminPersistenceService';

describe('project Passport metadata persistence', () => {
  it('persists all citizen-need and audit evidence fields in project_metadata', () => {
    const evidence = {
      citizen_need_verification_status: 'VERIFIED',
      citizen_need_source_document_id: 'doc-need',
      citizen_need_source_url: 'https://gouv.ci/need.pdf',
      citizen_need_source_page: 12,
      audit_report_reference: 'Rapport de la Cour des comptes',
      audit_source_document_id: 'doc-audit',
      audit_source_url: 'https://courdescomptes.ci/audit.pdf',
      audit_source_page: 34,
      audit_verification_status: 'VERIFIED',
    };

    expect(pickAdminFields(evidence, projectMetadataFields)).toEqual(evidence);
  });
});
