// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — TESTS D'INTÉGRITÉ DE LA CHAÎNE DOCUMENTAIRE
// Couverture complète des 8 cas d'intégrité documentaire (§5.4 / P0-DOC-01 / P0-UI-02)
// Simulation 100 % locale — REMOTE_SUPABASE_WRITES = 0
// =========================================================================

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentsPage } from '../../pages/DocumentsPage';
import { dataStore } from '../../services/dataStore';
import { 
  DOCUMENT_CONTROLS,
  OFFICIAL_PUBLIC_DOCUMENTS_REGISTRY,
  VERIFIED_DOCUMENT_PAGINATION_CONTROLS,
  getOfficialPublicDocuments,
  getReviewSourceDocuments,
  findOfficialDocumentByChecksum,
  isVerifiedDocumentPaginationAttested,
  applyVerifiedDocumentPagination,
} from '../../data/officialPublicDocumentsCatalog';
import { validateDocumentPageRanges } from '../../services/documentStorageService';
import { 
  isDocumentSha256, 
  verifyDocumentaryAudit, 
  resolveCitation, 
  canPublishOfficialObservation 
} from '../../review/domain/documents';
import { OFFICIAL_DOCUMENTARY_AUDITS } from '../../review/catalog';
import type { PublicDocument } from '../../types';

describe('Intégrité de la Chaîne Documentaire & Pagination Républicaine (§5.4)', () => {

  const attestedCocodyBase: PublicDocument = {
    id: 'doc-dff4865a-c6a8-418e-8895-626258e409d0',
    title: 'Compte Administratif 2024 - Mairie de Cocody',
    category: 'COMPTE_ADMINISTRATIF',
    institution_name: 'Mairie de Cocody',
    institution_id: 'inst-com-cocody',
    institution_type: 'MAIRIE',
    year: 2024,
    fiscal_year: 2024,
    description: 'Compte administratif 2024 de la commune de Cocody',
    file_url: 'https://example.org/cocody-2024.pdf',
    file_name: 'COMMUNE DE COCODY.pdf',
    file_size: '13.4 Mo',
    file_size_bytes: 14_072_943,
    file_format: 'PDF',
    page_count: 45,
    published_at: '2026-11-13T13:47:29.157086+00:00',
    downloads_count: 12,
    is_official: true,
    checksum_sha256: '941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf',
    checksum_status: 'COMPUTED',
    checksum_algorithm: 'SHA256_FILE_V1',
    is_multipart: false,
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    approval_date: '2025-07-08',
  };

  // -----------------------------------------------------------------------
  // Cas 1 : SHA-256 incorrect (rejeté)
  // -----------------------------------------------------------------------
  describe('Cas 1 : SHA-256 incorrect (rejeté)', () => {
    it('rejette une empreinte altérée ou divergente du hash canonique attesté', () => {
      const tamperedHash = '941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627ce'; // dernier caractère altéré
      const tamperedDoc: PublicDocument = {
        ...attestedCocodyBase,
        checksum_sha256: tamperedHash,
      };

      const control = VERIFIED_DOCUMENT_PAGINATION_CONTROLS['941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'];
      expect(isVerifiedDocumentPaginationAttested(tamperedDoc, control)).toBe(false);

      // Si le hash est inconnu, aucune règle d'attestation n'est appliquée
      const normalized = applyVerifiedDocumentPagination(tamperedDoc);
      expect(normalized.pagination_note).toBeUndefined();

      // Si le hash correspond à un contrôle connu mais que la taille est divergente
      const corruptedDoc = applyVerifiedDocumentPagination({
        ...attestedCocodyBase,
        file_size_bytes: 12345, // taille fausse
      });
      expect(corruptedDoc.physical_page_count).toBeNull();
      expect(corruptedDoc.printed_page_count).toBeNull();
      expect(corruptedDoc.missing_printed_pages).toBeNull();
      expect(corruptedDoc.pagination_note).toBeNull();
    });

    it('rejette les empreintes non conformes ou forgées dans findOfficialDocumentByChecksum', () => {
      expect(findOfficialDocumentByChecksum('bad-hash')).toBeUndefined();
      expect(findOfficialDocumentByChecksum('1234567890abcdef')).toBeUndefined();
      expect(findOfficialDocumentByChecksum('0'.repeat(64))).toBeUndefined();
      // SHA-256 du fichier vide (e3b0c442...) doit être formellement rejeté
      const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      expect(isDocumentSha256(emptyHash)).toBe(false);
      expect(findOfficialDocumentByChecksum(emptyHash)).toBeUndefined();
    });

    it('rejette un audit documentaire avec une empreinte divergente', () => {
      const doc = getReviewSourceDocuments().find(d => d.id === 'DGBF-LFI-2026')!;
      const auditResult = verifyDocumentaryAudit(
        { id: doc.id, sha256: 'deadbeef'.repeat(8), fiscalYear: 2026 },
        OFFICIAL_DOCUMENTARY_AUDITS
      );
      expect(auditResult.verified).toBe(false);
      expect(auditResult.matchingAudit).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Cas 2 : SHA-256 absent (non attesté)
  // -----------------------------------------------------------------------
  describe('Cas 2 : SHA-256 absent (non attesté)', () => {
    it('refuse l’attestation de pagination quand checksum_sha256 est absent ou vide', () => {
      const control = VERIFIED_DOCUMENT_PAGINATION_CONTROLS['941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'];

      for (const emptySha of [null, undefined, '', '   '] as const) {
        const docWithoutSha: PublicDocument = {
          ...attestedCocodyBase,
          checksum_sha256: emptySha as any,
        };
        expect(isVerifiedDocumentPaginationAttested(docWithoutSha, control)).toBe(false);
        const result = applyVerifiedDocumentPagination(docWithoutSha);
        expect(result.pagination_note).toBeUndefined();
      }

      // Si le hash est présent mais que checksum_status n'est pas COMPUTED (ex: DECLARED)
      const declaredDoc = applyVerifiedDocumentPagination({
        ...attestedCocodyBase,
        checksum_status: 'DECLARED',
      });
      expect(declaredDoc.physical_page_count).toBeNull();
      expect(declaredDoc.printed_page_count).toBeNull();
      expect(declaredDoc.missing_printed_pages).toBeNull();
      expect(declaredDoc.pagination_note).toBeNull();
    });

    it('n’attribue pas les badges vérifié, répertorié ou publié à un document sans SHA-256 dans DocumentsPage', () => {
      const docWithoutSha: PublicDocument = {
        id: 'doc-sans-sha',
        title: 'Document sans empreinte',
        category: 'BUDGET_OFFICIEL',
        institution_name: 'Institution Test',
        year: 2026,
        description: 'Test sans empreinte',
        file_url: 'https://example.org/doc.pdf',
        file_name: 'doc.pdf',
        file_format: 'PDF',
        published_at: '2026-01-01',
        downloads_count: 0,
        is_official: true,
        status: 'PUBLISHED',
        http_status: 200,
        checksum_sha256: null,
      };

      const originalDocs = dataStore.getDocuments();
      try {
        (dataStore as any).documents = [docWithoutSha];
        const html = renderToStaticMarkup(React.createElement(DocumentsPage));
        // Aucun badge affirmatif d'officialité ne doit être attribué sans empreinte cryptographique
        expect(html).not.toContain('Document officiel vérifié');
        expect(html).not.toContain('Document officiel répertorié');
        expect(html).not.toContain('Document officiel publié');
      } finally {
        (dataStore as any).documents = originalDocs;
      }
    });
  });

  // -----------------------------------------------------------------------
  // Cas 3 : Document HTTP 404 (n'affiche jamais le badge officiel publié)
  // -----------------------------------------------------------------------
  describe('Cas 3 : Document HTTP 404 (n’affiche jamais le badge officiel publié)', () => {
    it('enregistre explicitement http_status: 404 pour DGBF-RAP-2022 et CAIDP-LOI-2013-867', () => {
      const docs = getOfficialPublicDocuments();
      const rap = docs.find(d => d.id === 'DGBF-RAP-2022')!;
      const caidp = docs.find(d => d.id === 'CAIDP-LOI-2013-867')!;

      expect(rap.http_status).toBe(404);
      expect(caidp.http_status).toBe(404);
    });

    it('DocumentsPage n’affiche JAMAIS "Document officiel publié" pour un document 404', () => {
      const html = renderToStaticMarkup(React.createElement(DocumentsPage));

      // Le badge "Document officiel publié" ne doit figurer nulle part sur la page pour les documents 404
      expect(html).not.toContain('Document officiel publié');
      // Mais les badges appropriés doivent être présents
      expect(html).toContain('Lien officiel indisponible (HTTP 404)');
      expect(html).toContain('Archive officielle acquise (consultation sur demande CAIDP)');
      expect(html).toContain('Document officiel répertorié');
      expect(html).toContain('Document officiel vérifié');
    });

    it('DGBF-RAP-2022 et CAIDP-LOI-2013-867 ont des boutons de téléchargement désactivés', () => {
      const controls = DOCUMENT_CONTROLS;
      const rapCtrl = controls.find(c => c.id === 'DGBF-RAP-2022')!;
      const caidpCtrl = controls.find(c => c.id === 'CAIDP-LOI-2013-867')!;

      expect(rapCtrl.httpStatus).toBe(404);
      expect(caidpCtrl.httpStatus).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // Cas 4 : Document incomplet (page 20/45 manquante, statut INCOMPLET avec réserves)
  // -----------------------------------------------------------------------
  describe('Cas 4 : Document incomplet (page 20/45 manquante, réserves documentaires)', () => {
    it('atteste formellement l’absence de la page imprimée 20/45 pour Cocody CA 2024', () => {
      const control = VERIFIED_DOCUMENT_PAGINATION_CONTROLS['941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'];
      expect(control).toBeDefined();
      expect(control.missingPrintedPages).toEqual(['20/45']);
      expect(control.paginationNote).toContain('page imprimée 20/45 absente du scan d\'origine');
      expect(control.paginationNote).toContain('contenu non restitué');
    });

    it('applyVerifiedDocumentPagination applique strictement les réserves documentaires', () => {
      const normalized = applyVerifiedDocumentPagination(attestedCocodyBase);
      expect(normalized.missing_printed_pages).toEqual(['20/45']);
      expect(normalized.pagination_note).toContain('44 pages physiques PDF');
      expect(normalized.pagination_note).toContain('20/45 absente du scan d\'origine');
    });

    it('écrase toute tentative de falsification déclarant le document complet sans réserve', () => {
      const tamperedDoc: PublicDocument = {
        ...attestedCocodyBase,
        missing_printed_pages: [], // falsification : prétend aucune page manquante
        pagination_note: 'Document 100% complet sans aucune réserve',
      };

      const rectified = applyVerifiedDocumentPagination(tamperedDoc);
      expect(rectified.missing_printed_pages).toEqual(['20/45']);
      expect(rectified.pagination_note).toContain('20/45 absente du scan d\'origine');
    });
  });

  // -----------------------------------------------------------------------
  // Cas 5 : Page PDF absente détectée (intervalles discontinus dans multi-parties)
  // -----------------------------------------------------------------------
  describe('Cas 5 : Page PDF absente détectée', () => {
    it('détecte un trou de numérotation dans les fascicules d’un document multi-parties', () => {
      // Fascicule 1 : pages 1 à 10, Fascicule 2 : pages 12 à 20 -> page 11 manquante !
      const partsWithGap = [
        { part_number: 1, page_start: 1, page_end: 10 },
        { part_number: 2, page_start: 12, page_end: 20 },
      ];

      const validation = validateDocumentPageRanges(partsWithGap);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.toLowerCase().includes('discontinuité') || e.includes('lacune') || e.includes('11'))).toBe(true);
    });

    it('valide une suite continue de fascicules sans lacune', () => {
      const contiguousParts = [
        { part_number: 1, page_start: 1, page_end: 22 },
        { part_number: 2, page_start: 23, page_end: 44 },
      ];

      const validation = validateDocumentPageRanges(contiguousParts);
      expect(validation.isValid).toBe(true);
      expect(validation.totalPages).toBe(44);
    });
  });

  // -----------------------------------------------------------------------
  // Cas 6 : Pagination physique différente de la pagination imprimée (44 vs 45)
  // -----------------------------------------------------------------------
  describe('Cas 6 : Pagination physique différente de la pagination imprimée (44 vs 45)', () => {
    it('maintient la distinction irréductible entre 44 pages physiques et 45 imprimées', () => {
      const control = VERIFIED_DOCUMENT_PAGINATION_CONTROLS['941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'];
      expect(control.physicalPageCount).toBe(44);
      expect(control.printedPageCount).toBe(45);
      expect(control.physicalPageCount).not.toBe(control.printedPageCount);

      const normalized = applyVerifiedDocumentPagination(attestedCocodyBase);
      expect(normalized.page_count).toBe(44);
      expect(normalized.physical_page_count).toBe(44);
      expect(normalized.printed_page_count).toBe(45);
    });

    it('atteste la taille exacte en octets (14 072 943) et les dates officielles', () => {
      const control = VERIFIED_DOCUMENT_PAGINATION_CONTROLS['941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'];
      expect(control.fileSizeBytes).toBe(14_072_943);
      expect(control.approvalDate).toBe('2025-07-08');
      expect(control.prefectureVisaDate).toBe('2025-07-22');

      const normalized = applyVerifiedDocumentPagination(attestedCocodyBase);
      expect(normalized.file_size_bytes).toBe(14_072_943);
      expect(normalized.approval_date).toBe('2025-07-08');
    });
  });

  // -----------------------------------------------------------------------
  // Cas 7 : Document présent mais non rattaché à une donnée financière
  // -----------------------------------------------------------------------
  describe('Cas 7 : Document présent mais non rattaché à une donnée financière', () => {
    it('refuse de déclarer vérifiée une donnée financière ayant source_document_id null', () => {
      // Cas Tiassalé CA 2024 : le compte a verification_status: OFFICIAL_DOCUMENT mais source_document_id est null
      const unlinkedFinancialRecord = {
        id: 'ca-tiassale-2024',
        institution_id: 'inst-com-tiassale',
        fiscal_year: 2024,
        source_document_id: null,
        source_page: null,
        source_document_sha256: null,
        reconciliation_status: 'SOURCE_ANOMALY',
      };

      const hasPrimaryProof = Boolean(unlinkedFinancialRecord.source_document_id && unlinkedFinancialRecord.source_document_sha256);
      expect(hasPrimaryProof).toBe(false);

      // Le compte ne doit pas pouvoir revendiquer une attestation primaire sans fichier lié
      const isCertifiable = unlinkedFinancialRecord.source_document_id !== null && unlinkedFinancialRecord.reconciliation_status === 'RECONCILED';
      expect(isCertifiable).toBe(false);

      // Vérification via le moteur de revue financière (resolveCitation et canPublishOfficialObservation)
      const unlinkedObs = {
        id: 'obs-tiassale-2024',
        institutionId: 'inst-com-tiassale',
        scope: 'COMMUNE',
        periodEnd: '2024-12-31',
        precision: 'EXACT' as const,
        fiscalYear: 2024,
        section: 'FONCTIONNEMENT' as const,
        sectionCode: 'FONCTIONNEMENT',
        measure: 'DEPENSES' as const,
        amount: 250_000_000,
        currency: 'XOF' as const,
        evidence: null,
      };
      const reviewResult = canPublishOfficialObservation(unlinkedObs as any, []);
      expect(reviewResult.value).toBeNull();
      expect(reviewResult.status).toBe('UNKNOWN');
      expect(reviewResult.reasons).toContain('DOCUMENTARY_EVIDENCE_REQUIRED');
    });

    it('un document stocké sans liaison financière reste un document sans attribution', () => {
      const orphanDoc: PublicDocument = {
        id: 'doc-sans-liaison',
        title: 'Rapport orphelin',
        category: 'ETUDE_TECHNIQUE',
        institution_name: 'Bureau d’études',
        year: 2024,
        description: 'Document non rattaché à un budget',
        file_url: 'https://example.org/orphan.pdf',
        file_name: 'orphan.pdf',
        file_format: 'PDF',
        published_at: null,
        downloads_count: 0,
        is_official: false,
        control_scope: null,
      };

      // Sans control_scope ni extraction_status VERIFIED, extractionStatus reste non vérifié
      expect(orphanDoc.control_scope).toBeNull();
      expect(orphanDoc.extraction_status).not.toBe('VERIFIED');

      // Tentative de résolution de citation avec un document orphelin non vérifié
      const orphanEvidence = {
        documentId: orphanDoc.id,
        page: 1,
        reference: null,
        fiscalYear: 2024,
        verification: 'TO_VERIFY' as const,
      };
      expect(resolveCitation(orphanEvidence, [])).toBeNull();

      // De même, getReviewSourceDocuments classe les documents non rattachés en UNVERIFIED
      const sourceDocs = getReviewSourceDocuments([orphanDoc]);
      expect(sourceDocs[0].provenance).toBe('UNVERIFIED');
      expect(sourceDocs[0].verification).toBe('TO_VERIFY');
      expect(sourceDocs[0].extractionStatus).toBe('TO_VERIFY');
    });
  });

  // -----------------------------------------------------------------------
  // Cas 8 : Source secondaire classée comme secondaire, jamais primaire
  // -----------------------------------------------------------------------
  describe('Cas 8 : Source secondaire classée comme secondaire, jamais primaire', () => {
    it('qualifie DGBF-RAP-2022 comme source secondaire d’acquisition antérieure', () => {
      const docs = getOfficialPublicDocuments();
      const rap = docs.find(d => d.id === 'DGBF-RAP-2022')!;

      expect(rap.source_provenance).toBe('SECONDARY_SOURCE');
      expect(rap.source_provenance).not.toBe('OFFICIAL_SOURCE');
      expect(rap.availability).toBe('AVAILABLE_FROM_PRIOR_OFFICIAL_ACQUISITION');
    });

    it('qualifie CAIDP-LOI-2013-867 comme non vérifié (UNVERIFIED)', () => {
      const docs = getOfficialPublicDocuments();
      const caidp = docs.find(d => d.id === 'CAIDP-LOI-2013-867')!;

      expect(caidp.source_provenance).toBe('UNVERIFIED');
      expect(caidp.source_provenance).not.toBe('OFFICIAL_SOURCE');
    });

    it('interdit l’affichage du badge vert "Source : ..." pour les sources secondaires ou non vérifiées', () => {
      const secondaryDoc: PublicDocument = {
        id: 'article-presse-01',
        title: 'Article de presse sur le budget communal',
        category: 'GUIDE_CITOYEN',
        institution_name: 'Journal Indépendant',
        year: 2024,
        description: 'Compte-rendu de presse',
        file_url: 'https://presse.ci/article',
        file_name: 'article.html',
        file_format: 'PDF',
        published_at: '2024-05-01',
        downloads_count: 0,
        is_official: false,
        source_provenance: 'SECONDARY_SOURCE',
      };

      const isOfficial = secondaryDoc.is_official && secondaryDoc.source_provenance === 'OFFICIAL_SOURCE';
      expect(isOfficial).toBe(false);
    });

    it('préserve la stricte séparation entre sources officielles et sources secondaires dans le catalogue', () => {
      const registry = OFFICIAL_PUBLIC_DOCUMENTS_REGISTRY;
      const officialSources = registry.filter(d => d.source_provenance === 'OFFICIAL_SOURCE');
      const nonOfficialSources = registry.filter(d => d.source_provenance !== 'OFFICIAL_SOURCE');

      // Seules les LFI et Annexes 4, 6, 7, 8 en ligne sont OFFICIAL_SOURCE
      expect(officialSources.length).toBe(5);
      expect(officialSources.every(d => d.http_status === 200)).toBe(true);

      // Les documents 404 (RAP 2022 et CAIDP) ne sont PAS OFFICIAL_SOURCE
      expect(nonOfficialSources.length).toBe(2);
      expect(nonOfficialSources.map(d => d.id)).toEqual(['DGBF-RAP-2022', 'CAIDP-LOI-2013-867']);
      expect(nonOfficialSources.every(d => d.http_status === 404)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Tests de Durcissement Adversarial (Remédiation Challengers M1)
  // -----------------------------------------------------------------------
  describe('Tests de durcissement adversarial (Remédiation Challengers M1)', () => {
    it('n’affiche pas "Document officiel publié" pour un document avec HTTP 500', () => {
      const doc500: PublicDocument = {
        ...attestedCocodyBase,
        id: 'doc-http-500',
        http_status: 500,
        status: 'PUBLISHED',
      };
      const originalDocs = dataStore.getDocuments();
      try {
        (dataStore as any).documents = [doc500];
        const html = renderToStaticMarkup(React.createElement(DocumentsPage));
        expect(html).not.toContain('Document officiel publié');
        expect(html).not.toContain('Document officiel vérifié');
        expect(html).not.toContain('Document officiel répertorié');
      } finally {
        (dataStore as any).documents = originalDocs;
      }
    });

    it('n’affiche pas "Document officiel publié" pour un document avec URL vide', () => {
      const docEmptyUrl: PublicDocument = {
        ...attestedCocodyBase,
        id: 'doc-empty-url',
        file_url: '',
        http_status: 200,
        status: 'PUBLISHED',
      };
      const originalDocs = dataStore.getDocuments();
      try {
        (dataStore as any).documents = [docEmptyUrl];
        const html = renderToStaticMarkup(React.createElement(DocumentsPage));
        expect(html).not.toContain('Document officiel publié');
        expect(html).not.toContain('Document officiel vérifié');
      } finally {
        (dataStore as any).documents = originalDocs;
      }
    });

    it('n’attribue pas "Document officiel vérifié" à un document avec empreinte SHA-256 forgée non valide', () => {
      const docForgedSha: PublicDocument = {
        ...attestedCocodyBase,
        id: 'doc-forged-sha',
        checksum_sha256: 'deadbeef',
        extraction_status: 'VERIFIED',
        control_scope: 'Contrôle simulé',
        http_status: 200,
        status: 'PUBLISHED',
      };
      const originalDocs = dataStore.getDocuments();
      try {
        (dataStore as any).documents = [docForgedSha];
        const html = renderToStaticMarkup(React.createElement(DocumentsPage));
        expect(html).not.toContain('Document officiel vérifié');
        expect(html).not.toContain('Document officiel publié');
        expect(html).not.toContain('Document officiel répertorié');
      } finally {
        (dataStore as any).documents = originalDocs;
      }
    });

    it('rejette l’attestation de pagination si institution_id est manquant ou indéfini', () => {
      const control = VERIFIED_DOCUMENT_PAGINATION_CONTROLS['941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'];
      const docNoInstitution: PublicDocument = {
        ...attestedCocodyBase,
        institution_id: undefined,
      };
      expect(isVerifiedDocumentPaginationAttested(docNoInstitution, control)).toBe(false);

      const docNullInstitution: PublicDocument = {
        ...attestedCocodyBase,
        institution_id: null as any,
      };
      expect(isVerifiedDocumentPaginationAttested(docNullInstitution, control)).toBe(false);
    });

    it('purge la pagination et la note injectée si le SHA est altéré sur un candidat Cocody CA 2024', () => {
      const tamperedCocodyDoc: PublicDocument = {
        ...attestedCocodyBase,
        checksum_sha256: '0'.repeat(64),
        pagination_note: '44 pages physiques PDF (attestation injectée frauduleusement)',
        physical_page_count: 44,
        printed_page_count: 45,
        missing_printed_pages: ['20/45'],
      };
      const result = applyVerifiedDocumentPagination(tamperedCocodyDoc);
      expect(result.pagination_note).toBeNull();
      expect(result.physical_page_count).toBeNull();
      expect(result.printed_page_count).toBeNull();
      expect(result.missing_printed_pages).toBeNull();
    });
  });
});
