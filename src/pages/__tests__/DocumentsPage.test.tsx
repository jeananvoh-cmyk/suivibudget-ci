import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentsPage, getBudgetNatureLabel } from '../DocumentsPage';
import { dataStore } from '../../services/dataStore';
import { 
  getOfficialPublicDocuments, 
  getReviewSourceDocuments, 
  findOfficialDocumentByChecksum 
} from '../../data/officialPublicDocumentsCatalog';
import type { PublicDocument } from '../../types';
import { isDocumentSha256, resolveCitation, verifyDocumentaryAudit } from '../../review/domain/documents';

describe('BLOC A — Intégration Documentaire & Budgétaire Publique (Lots 6, 7, 8, 15)', () => {

  describe('1. Catalogue Officiel et Provenance Républicaine', () => {
    it('ne substitue jamais la LFI aux annexes 6, 7 et 8', () => {
      const docs = getOfficialPublicDocuments();
      for (const [id, file, pages] of [
        ['DGBF-ANNEXE-6-2026', 'Annexe-6-Budgets-des-EPN-2026.pdf', 179],
        ['DGBF-ANNEXE-7-2026', 'Annexe-7-Dotations-des-Institutions-2026.pdf', 89],
        ['DGBF-TRANSFERTS-LOCAL-2026', 'Annexe-8-Concours-financiers-aux-collectivites-territoriales-et-aux-districts-autonomes-2026.pdf', 322],
      ] as const) {
        const doc = docs.find(d => d.id === id)!;
        expect(doc.file_url).toBe(`https://www.dgbf.ci/wp-content/uploads/2025/12/${file}`);
        expect(doc.file_name).toBe(file);
        expect(doc.page_count).toBe(pages);
        expect(doc.checksum_sha256).not.toBe(docs[0].checksum_sha256);
      }
    });

    it('conserve les échecs HTTP et bloque les extractions sans contrôle indépendant', () => {
      const docs = getReviewSourceDocuments();
      const caidp = docs.find(d => d.id === 'CAIDP-LOI-2013-867')!;
      expect(caidp).toMatchObject({ sha256: null, httpStatus: 404, verification: 'TO_VERIFY', extractionStatus: 'TO_VERIFY' });
      expect(caidp.availability).not.toBe('AVAILABLE');
      const rap = docs.find(d => d.id === 'DGBF-RAP-2022')!;
      expect(rap).toMatchObject({ httpStatus: 404, extractionStatus: 'TO_VERIFY', availability: 'AVAILABLE_FROM_PRIOR_OFFICIAL_ACQUISITION' });
      for (const id of ['DGBF-ANNEXE-6-2026', 'DGBF-TRANSFERTS-LOCAL-2026']) {
        expect(docs.find(d => d.id === id)).toMatchObject({ availability: 'AVAILABLE', httpStatus: 200, extractionStatus: 'TO_VERIFY' });
      }
    });

    it('ne transforme pas une publication, un hash ou une URL déclarés en preuve', () => {
      const original = getOfficialPublicDocuments()[0];
      for (const patch of [
        { id: 'uncontrolled' }, { file_url: 'https://evil.example/fake.pdf' },
        { year: 2025 }, { title: 'Une autre annexe' }, { checksum_sha256: 'a'.repeat(64) },
        { file_url: 'https://www.dgbf.ci.evil.example/fake.pdf' }, { file_url: 'javascript:alert(1)' },
        { file_url: 'https://secret@www.dgbf.ci/fake.pdf' },
        { checksum_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
      ]) {
        const [doc] = getReviewSourceDocuments([{ ...original, ...patch, status: 'PUBLISHED', verification_status: 'VERIFIED' }]);
        expect(doc).toMatchObject({ verification: 'TO_VERIFY', extractionStatus: 'TO_VERIFY', httpStatus: null, sha256: null, availability: 'UNKNOWN' });
      }
    });

    it('rejette les doublons ambigus et ne partage pas de métadonnées mutables', () => {
      const docs = getOfficialPublicDocuments();
      const duplicate = { ...docs[0], id: 'other-document' };
      expect(findOfficialDocumentByChecksum(docs[0].checksum_sha256!, [docs[0], duplicate])).toBeUndefined();
      expect(getReviewSourceDocuments([docs[0], duplicate]).every(d => d.verification !== 'VERIFIED')).toBe(true);
      expect(getReviewSourceDocuments([docs[0], docs[0]]).every(d => d.verification !== 'VERIFIED')).toBe(true);
      expect(findOfficialDocumentByChecksum('z'.repeat(64))).toBeUndefined();
      docs[0].file_url = 'https://evil.example/mutated.pdf';
      expect(getOfficialPublicDocuments()[0].file_url).not.toContain('evil.example');
    });

    it('refuse le SHA-256 du fichier vide même si un audit le déclare vérifié', () => {
      const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const doc = { ...getReviewSourceDocuments()[0], sha256: emptyHash };
      expect(isDocumentSha256(emptyHash)).toBe(false);
      expect(verifyDocumentaryAudit(doc, [{ controlId: 'forged', documentId: doc.id, documentSha256: emptyHash, fiscalYear: 2026, controlStatus: 'VERIFIED', controlScope: 'Forged scope', reportRef: 'fake.md' }]).verified).toBe(false);
      expect(resolveCitation({ documentId: doc.id, page: 1, reference: null, fiscalYear: 2026, verification: 'VERIFIED' }, [doc])).toBeNull();
    });
    it('charge les originaux acquis avec leur empreinte calculée', () => {
      const docs = getOfficialPublicDocuments();
      expect(docs.length).toBeGreaterThanOrEqual(7);

      const lfi = docs.find(d => d.id === 'DGBF-LFI-2026');
      expect(lfi).toBeDefined();
      expect(lfi?.checksum_sha256).toBe('f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76');
      expect(lfi?.is_official).toBe(true);
      expect(lfi?.page_count).toBe(583);
      expect(lfi?.file_url).toContain('https://www.dgbf.ci/');

      const dppd = docs.find(d => d.id === 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4');
      expect(dppd).toBeDefined();
      expect(dppd?.checksum_sha256).toBe('0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10');
      expect(dppd?.page_count).toBe(1229);

      const rap = docs.find(d => d.id === 'DGBF-RAP-2022');
      expect(rap).toBeDefined();
      expect(rap?.year).toBe(2022);
      expect(rap?.category).toBe('RAPPORT_AUDIT');
    });

    it('résout un document officiel par son empreinte cryptographique SHA-256 exacte', () => {
      const match = findOfficialDocumentByChecksum('f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76');
      expect(match).toBeDefined();
      expect(match?.id).toBe('DGBF-LFI-2026');

      // Doit être insensible à la casse
      const matchUpper = findOfficialDocumentByChecksum('F06035B6AF6F15F1777B3E843198DF2763F72FE9B15A04DE1A16C4553A507D76');
      expect(matchUpper).toBeDefined();
      expect(matchUpper?.id).toBe('DGBF-LFI-2026');

      // Empreinte invalide ou inconnue
      expect(findOfficialDocumentByChecksum('0000000000000000000000000000000000000000000000000000000000000000')).toBeUndefined();
      expect(findOfficialDocumentByChecksum('court')).toBeUndefined();
    });

    it('expose des SourceDocument valides pour le domaine de revue et les contrôles', () => {
      const sourceDocs = getReviewSourceDocuments();
      expect(sourceDocs.length).toBeGreaterThanOrEqual(7);

      for (const doc of sourceDocs) {
        expect(doc.id).toBeTruthy();
        if (doc.sha256) expect(doc.sha256).toMatch(/^[a-f0-9]{64}$/i);
        expect(doc.officialUrl).toMatch(/^https:\/\//);
        expect(doc.verification).toBe(doc.httpStatus === 200 ? 'VERIFIED' : 'TO_VERIFY');
        expect(doc.provenance).toBe('OFFICIAL_SOURCE');
      }
    });

    it('dataStore.getDocuments() renvoie la bibliothèque républicaine dès son initialisation', () => {
      const docs = dataStore.getDocuments();
      expect(docs.length).toBeGreaterThanOrEqual(7);
      expect(docs.some(d => d.id === 'DGBF-LFI-2026')).toBe(true);
    });
  });

  describe('2. Distinction Sémantique des Natures Budgétaires', () => {
    it('distingue fidèlement les natures budgétaires selon la LOLF et les actes officiels', () => {
      const lfiDoc: PublicDocument = {
        id: 'DGBF-LFI-2026',
        title: 'Loi de finances 2026',
        category: 'BUDGET_OFFICIEL',
        institution_name: 'DGBF',
        year: 2026,
        description: 'LFI',
        file_url: 'https://example.org/lfi.pdf',
        file_name: 'lfi.pdf',
        file_format: 'PDF',
        published_at: '2026-01-01',
        downloads_count: 0,
        is_official: true,
      };

      const dppdDoc: PublicDocument = {
        ...lfiDoc,
        id: 'DGBF-DPPD-PAP-2026-2028-ANNEXE-4',
        title: 'DPPD-PAP 2026-2028',
      };

      const transfersDoc: PublicDocument = {
        ...lfiDoc,
        id: 'DGBF-TRANSFERTS-LOCAL-2026',
        title: 'Transferts aux communes',
      };

      const aaiDoc: PublicDocument = {
        ...lfiDoc,
        id: 'DGBF-ANNEXE-6-2026',
        title: 'Régulateurs',
      };

      const institutionsDoc: PublicDocument = {
        ...lfiDoc,
        id: 'DGBF-ANNEXE-7-2026',
        title: 'Grandes Institutions',
      };

      const rapDoc: PublicDocument = {
        ...lfiDoc,
        id: 'DGBF-RAP-2022',
        title: 'RAP 2022',
        category: 'RAPPORT_AUDIT',
      };

      const caDoc: PublicDocument = {
        ...lfiDoc,
        id: 'CA-2024-TIASSALE',
        title: 'Compte Administratif Tiassalé 2024',
        category: 'COMPTE_ADMINISTRATIF',
      };

      const caidpDoc: PublicDocument = {
        ...lfiDoc,
        id: 'CAIDP-LOI-2013-867',
        title: 'Loi CAIDP 2013-867',
        category: 'LOI_CAIDP',
      };

      expect(getBudgetNatureLabel(lfiDoc)).toBe('Budget Primitif (LFI)');
      expect(getBudgetNatureLabel(dppdDoc)).toBe('Programmation Pluriannuelle (DPPD-PAP)');
      expect(getBudgetNatureLabel(transfersDoc)).toBe('Concours Collectivités et Districts');
      expect(getBudgetNatureLabel(aaiDoc)).toBe('Budgets EPN et structures assimilées');
      expect(getBudgetNatureLabel(institutionsDoc)).toBe('Dotations Directes Institutions');
      expect(getBudgetNatureLabel(rapDoc)).toBe('Rapport Annuel de Performance (RAP)');
      expect(getBudgetNatureLabel(caDoc)).toBe("Compte Administratif d'Exécution");
      expect(getBudgetNatureLabel(caidpDoc)).toBe("Texte Fondateur d'Accès Public");
    });
  });

  describe('3. Rendu du Composant DocumentsPage', () => {
    it('rend la page avec son en-tête républicain, les métriques et les cartes officielles', () => {
      const html = renderToStaticMarkup(<DocumentsPage />);
      expect(html).toContain('Bibliothèque Publique &amp; Documents Administratifs');
      expect(html).toContain('Transparence &amp; Accès aux Documents (CAIDP)');
      expect(html).toContain('Loi de finances n° 2025-987');
      expect(html).toContain('Annexe 4 : Documents de Programmation Pluriannuelle');
      expect(html).toContain('Open Data (JSON)');
      expect(html).toContain('Open Data (CSV)');
      expect(html).toContain('Sources (JSON)');
    });

    it('affiche les badges de source républicaine et les empreintes SHA-256 abrégées', () => {
      const html = renderToStaticMarkup(<DocumentsPage />);
      expect(html).toContain('Source Républicaine');
      expect(html).toContain('Extraction partiellement contrôlée');
      expect(html).toContain('Extraction à vérifier');
      expect(html).toContain('Authenticité à vérifier');
      expect(html).toContain('Lien indisponible (HTTP 404)');
      expect(html).toContain('SHA-256 : f06035b6af...3a507d76');
      expect(html).toContain('SHA-256 : 0f8c7a91b5...ed0ffe10');
    });

    it('expose le droit d’accès légal CAIDP et le rappel républicain du Principe 9', () => {
      const html = renderToStaticMarkup(<DocumentsPage />);
      expect(html).toContain('Exercez votre droit légal d&#x27;accès à l&#x27;information (Loi n° 2013-867)');
    });
  });
});
