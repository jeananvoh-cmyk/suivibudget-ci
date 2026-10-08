import { describe, expect, it } from 'vitest';
import {
  catalogProblems,
  resolveCitation,
  safeOfficialUrl,
  canPublishOfficialObservation,
  publicDocumentMetadata,
  verifyDocumentaryAudit,
  type SourceDocument,
} from '../domain/documents';
import { reviewDocuments, OFFICIAL_DOCUMENTARY_AUDITS } from '../catalog';
import type { FinancialObservation } from '../domain/evidence';

const doc: SourceDocument = {
  id: 'test-only',
  title: 'Test only',
  publisher: 'Test only',
  officialUrl: 'https://example.org/test.pdf',
  fiscalYear: 2026,
  accessedAt: '2026-10-07',
  httpStatus: 200,
  sha256: 'a'.repeat(64),
  pageCount: 2,
  verification: 'VERIFIED',
  visibility: 'PUBLIC',
  previousVersionId: null,
  availability: 'AVAILABLE',
  provenance: 'OFFICIAL_SOURCE',
  extractionStatus: 'VERIFIED',
};

const ref = { documentId: doc.id, page: 1, reference: null, fiscalYear: 2026, verification: 'VERIFIED' as const };

const observation: FinancialObservation = {
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
  evidence: ref,
};

describe('LOT 8 — documentary catalog', () => {
  it('resolves a page against a public verified original', () => {
    expect(resolveCitation(ref, [doc])?.url).toBe('https://example.org/test.pdf#page=1');
  });

  it.each(['javascript:alert(1)', 'http://example.org', 'https://user:password@example.org', 'https://example.org?token=secret'])(
    'rejects unsafe reference %s',
    url => {
      expect(safeOfficialUrl(url)).toBeNull();
    },
  );

  it('does not expose private documents or unverified hashes', () => {
    expect(resolveCitation(ref, [{ ...doc, visibility: 'PRIVATE' }])).toBeNull();
    expect(resolveCitation(ref, [{ ...doc, sha256: null }])).toBeNull();
    expect(resolveCitation(ref, [{ ...doc, verification: 'TO_VERIFY' }])).toBeNull();
  });

  it('rejects wrong years, missing references and pages outside the document', () => {
    expect(resolveCitation({ ...ref, page: 3 }, [doc])).toBeNull();
    expect(resolveCitation({ ...ref, fiscalYear: 2025 }, [doc])).toBeNull();
    expect(resolveCitation({ ...ref, page: null }, [doc])).toBeNull();
  });

  it('rejects duplicate identity and cyclic or orphan versions', () => {
    expect(catalogProblems([doc, doc])).toContain('DUPLICATE_OR_EMPTY_DOCUMENT_ID');
    expect(catalogProblems([{ ...doc, previousVersionId: doc.id }])).toContain('VERSION_CYCLE');
    expect(catalogProblems([{ ...doc, previousVersionId: 'missing' }])).toContain('MISSING_PREVIOUS_VERSION');
  });

  describe('Separation of availability, provenance, and extraction verification', () => {
    it('rejects citation if document is available but documentary verification is TO_VERIFY', () => {
      const availableUnverified: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        verification: 'TO_VERIFY',
      };
      expect(resolveCitation(ref, [availableUnverified])).toBeNull();
    });

    it('rejects citation if document has UNVERIFIED provenance', () => {
      const unverifiedProvenance: SourceDocument = {
        ...doc,
        provenance: 'UNVERIFIED',
      };
      expect(resolveCitation(ref, [unverifiedProvenance])).toBeNull();
    });

    it('rejects citation if document availability is PENDING or NOT_FOUND_PUBLICLY', () => {
      expect(resolveCitation(ref, [{ ...doc, availability: 'PENDING' }])).toBeNull();
      expect(resolveCitation(ref, [{ ...doc, availability: 'NOT_FOUND_PUBLICLY' }])).toBeNull();
      expect(resolveCitation(ref, [{ ...doc, availability: 'BLOCKED_NETWORK_POLICY' }])).toBeNull();
    });

    // 1. Test négatif : SourceDocument sans provenance définie → non publiable.
    it('1. rejects publication when SourceDocument has no provenance defined', () => {
      const noProvenance: SourceDocument = { ...doc };
      delete (noProvenance as Partial<SourceDocument>).provenance;
      const result = canPublishOfficialObservation(observation, [noProvenance]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    // 2. Test négatif : SourceDocument avec provenance secondaire ('SECONDARY_SOURCE') → non publiable en tant que montant officiel.
    it('2. rejects publication when SourceDocument has secondary provenance', () => {
      const secondary: SourceDocument = { ...doc, provenance: 'SECONDARY_SOURCE' };
      const result = canPublishOfficialObservation(observation, [secondary]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    // 3. Test négatif : SourceDocument avec extractionStatus: 'TO_VERIFY' → rejeté par canPublishOfficialObservation().
    it('3. rejects publication when SourceDocument extractionStatus is TO_VERIFY', () => {
      const toVerify: SourceDocument = { ...doc, extractionStatus: 'TO_VERIFY' };
      const result = canPublishOfficialObservation(observation, [toVerify]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    // 4. Test négatif : document ayant un CONTROL_SCOPE informatif mais aucun contrôle traçable enregistré → extractionStatus reste 'TO_VERIFY'.
    it('4. leaves extractionStatus as TO_VERIFY when CONTROL_SCOPE is present but no traceable audit record exists', () => {
      const manifestDoc = {
        DOCUMENT_ID: 'UNAUDITED-DOC-2026',
        SHA256: 'b'.repeat(64),
        FISCAL_YEAR: 2026,
        CONTROL_SCOPE: 'Tableau informatif non audité',
      };
      const auditResult = verifyDocumentaryAudit(
        { id: manifestDoc.DOCUMENT_ID, sha256: manifestDoc.SHA256, fiscalYear: manifestDoc.FISCAL_YEAR },
        OFFICIAL_DOCUMENTARY_AUDITS,
      );
      expect(auditResult.verified).toBe(false);
      expect(auditResult.reasons).toContain('NO_MATCHING_AUDIT_RECORD');
    });

    // 5. Test négatif : contrôle documentaire dont le SHA ne correspond pas au document → rejeté.
    it('5. rejects documentary audit when document SHA-256 does not match audit record', () => {
      const auditResult = verifyDocumentaryAudit(
        { id: 'DGBF-LFI-2026', sha256: '0'.repeat(64), fiscalYear: 2026 },
        OFFICIAL_DOCUMENTARY_AUDITS,
      );
      expect(auditResult.verified).toBe(false);
      expect(auditResult.reasons).toContain('NO_MATCHING_AUDIT_RECORD');
    });

    // 6. Test négatif : contrôle documentaire portant sur une année différente → rejeté.
    it('6. rejects documentary audit when fiscal year does not match audit record', () => {
      const auditResult = verifyDocumentaryAudit(
        { id: 'DGBF-LFI-2026', sha256: 'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76', fiscalYear: 2025 },
        OFFICIAL_DOCUMENTARY_AUDITS,
      );
      expect(auditResult.verified).toBe(false);
      expect(auditResult.reasons).toContain('NO_MATCHING_AUDIT_RECORD');
    });

    // 7. Test négatif : contrôle documentaire portant sur un documentId différent → rejeté.
    it('7. rejects documentary audit when documentId does not match audit record', () => {
      const auditResult = verifyDocumentaryAudit(
        { id: 'OTHER-DOC', sha256: 'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76', fiscalYear: 2026 },
        OFFICIAL_DOCUMENTARY_AUDITS,
      );
      expect(auditResult.verified).toBe(false);
      expect(auditResult.reasons).toContain('NO_MATCHING_AUDIT_RECORD');
    });

    // 8. Test de cohérence : citation documentaire valide résolue par resolveCitation(), mais montant non publiable via canPublishOfficialObservation() si extraction non vérifiée.
    it('8. resolves valid documentary citation via resolveCitation, but refuses publication via canPublishOfficialObservation when extraction is TO_VERIFY', () => {
      const unverifiedExtraction: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        extractionStatus: 'TO_VERIFY',
      };
      const citation = resolveCitation(ref, [unverifiedExtraction]);
      expect(citation).not.toBeNull();
      expect(citation?.url).toBe('https://example.org/test.pdf#page=1');

      const pubResult = canPublishOfficialObservation(observation, [unverifiedExtraction]);
      expect(pubResult.status).toBe('UNKNOWN');
      expect(pubResult.value).toBeNull();
      expect(pubResult.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    // 9. Test de non-régression : montant exact sans preuve financière → rejeté.
    it('9. rejects publication when exact amount lacks documentary evidence', () => {
      const noEvidenceObs: FinancialObservation = {
        ...observation,
        evidence: null,
      };
      const result = canPublishOfficialObservation(noEvidenceObs, [doc]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('DOCUMENTARY_EVIDENCE_REQUIRED');
    });

    // 10. Test de non-régression : document disponible mais extraction non vérifiée → resolveCitation() peut résoudre le lien documentaire si le document est public et disponible, mais canPublishOfficialObservation() refuse la publication du montant.
    it('10. allows resolving citation for available public document, but refuses official publication when extraction is not verified', () => {
      const availableNotExtracted: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        extractionStatus: 'NOT_EXTRACTED',
      };
      expect(resolveCitation(ref, [availableNotExtracted])).not.toBeNull();
      const pub = canPublishOfficialObservation(observation, [availableNotExtracted]);
      expect(pub.status).toBe('UNKNOWN');
      expect(pub.value).toBeNull();
      expect(pub.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    // 11. Test de non-régression : document privé → citation et publication rejetées.
    it('11. rejects both citation and publication when document is private', () => {
      const privateDoc: SourceDocument = { ...doc, visibility: 'PRIVATE' };
      expect(resolveCitation(ref, [privateDoc])).toBeNull();
      const pub = canPublishOfficialObservation(observation, [privateDoc]);
      expect(pub.status).toBe('UNKNOWN');
      expect(pub.value).toBeNull();
      expect(pub.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    // 12. Test de non-régression : montant nul (null) → rejeté.
    it('12. rejects publication when amount is null', () => {
      const nullAmountObs: FinancialObservation = {
        ...observation,
        amount: null,
      };
      const result = canPublishOfficialObservation(nullAmountObs, [doc]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('EXACT_AMOUNT_REQUIRED');
    });

    // 13. Test de non-régression : montant zéro réel documenté (amount: 0, precision: 'EXACT') → préservé et accepté si la source et l'extraction sont vérifiées.
    it('13. preserves and accepts documented exact zero amount (amount: 0, precision: EXACT) when verified', () => {
      const zeroObs: FinancialObservation = {
        ...observation,
        amount: 0,
        precision: 'EXACT',
      };
      const result = canPublishOfficialObservation(zeroObs, [doc]);
      expect(result.status).toBe('AVAILABLE');
      expect(result.value).toBe(0);
      expect(result.reasons).toEqual([]);
    });

    // 14. Test d'intégration catalogue : les documents du LOT5 conservent leur statut vérifié grâce au registre de contrôle traçable.
    it('14. preserves verified status of LOT5 documents via traceable audit register', () => {
      const lfi = reviewDocuments.find(d => d.id === 'DGBF-LFI-2026');
      const dppd = reviewDocuments.find(d => d.id === 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4');

      expect(lfi).toBeDefined();
      expect(lfi?.verification).toBe('VERIFIED');
      expect(lfi?.extractionStatus).toBe('VERIFIED');
      expect(lfi?.provenance).toBe('OFFICIAL_SOURCE');
      expect(lfi?.availability).toBe('AVAILABLE');
      expect(lfi?.auditRecordId).toBe('AUDIT-DGBF-LFI-2026-LOT5');
      expect(lfi?.auditReportRef).toBe('docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls');

      expect(dppd).toBeDefined();
      expect(dppd?.verification).toBe('VERIFIED');
      expect(dppd?.extractionStatus).toBe('VERIFIED');
      expect(dppd?.provenance).toBe('OFFICIAL_SOURCE');
      expect(dppd?.availability).toBe('AVAILABLE');
      expect(dppd?.auditRecordId).toBe('AUDIT-DGBF-DPPD-PAP-2026-LOT5');
      expect(dppd?.auditReportRef).toBe('docs/budget-ingestion/LOT5_INDEPENDENT_LFI_CONTROLS.json#section_controls');
    });

    it('never allows publishing an official amount when the cited document is available but unverified', () => {
      const availableUnverified: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        httpStatus: 200,
        verification: 'TO_VERIFY',
        extractionStatus: 'TO_VERIFY',
      };
      const result = canPublishOfficialObservation(observation, [availableUnverified]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    it('never allows publishing an official amount when extractionStatus is TO_VERIFY even if verification is VERIFIED', () => {
      const unverifiedExtraction: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        httpStatus: 200,
        verification: 'VERIFIED',
        extractionStatus: 'TO_VERIFY',
      };
      const result = canPublishOfficialObservation(observation, [unverifiedExtraction]);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('UNVERIFIED_DOCUMENT_OR_EXTRACTION');
    });

    it('allows publishing an official amount when availability, provenance, verification, and extraction are all verified', () => {
      const fullyVerified: SourceDocument = {
        ...doc,
        availability: 'AVAILABLE',
        httpStatus: 200,
        provenance: 'OFFICIAL_SOURCE',
        verification: 'VERIFIED',
        extractionStatus: 'VERIFIED',
      };
      const result = canPublishOfficialObservation(observation, [fullyVerified]);
      expect(result.status).toBe('AVAILABLE');
      expect(result.value).toBe(45121940916);
      expect(result.reasons).toEqual([]);
    });

    it('preserves existing verified primary documents without arbitrary downgrades', () => {
      const lfi = reviewDocuments.find(d => d.id === 'DGBF-LFI-2026');
      const dppd = reviewDocuments.find(d => d.id === 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4');

      expect(lfi).toBeDefined();
      expect(lfi?.verification).toBe('VERIFIED');
      expect(lfi?.extractionStatus).toBe('VERIFIED');
      expect(lfi?.provenance).toBe('OFFICIAL_SOURCE');
      expect(lfi?.availability).toBe('AVAILABLE');

      expect(dppd).toBeDefined();
      expect(dppd?.verification).toBe('VERIFIED');
      expect(dppd?.extractionStatus).toBe('VERIFIED');
      expect(dppd?.provenance).toBe('OFFICIAL_SOURCE');
      expect(dppd?.availability).toBe('AVAILABLE');
    });

    it('includes orthogonal statuses in publicDocumentMetadata projection', () => {
      const meta = publicDocumentMetadata([doc], 2026);
      expect(meta).toHaveLength(1);
      expect(meta[0].availability).toBe('AVAILABLE');
      expect(meta[0].provenance).toBe('OFFICIAL_SOURCE');
      expect(meta[0].extractionStatus).toBe('VERIFIED');
    });
  });
});
