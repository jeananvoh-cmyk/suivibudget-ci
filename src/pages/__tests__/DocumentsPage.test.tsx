import { describe, it, expect, beforeEach } from 'vitest';
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

describe('BLOC A — Intégration Documentaire & Budgétaire Publique (Lots 6, 7, 8, 15)', () => {

  describe('1. Catalogue Officiel et Provenance Républicaine', () => {
    it('charge par défaut les documents officiels républicains avec SHA-256 certifié', () => {
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
        expect(doc.sha256).toMatch(/^[a-f0-9]{64}$/i);
        expect(doc.officialUrl).toMatch(/^https:\/\//);
        expect(doc.verification).toBe('VERIFIED');
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
      expect(getBudgetNatureLabel(transfersDoc)).toBe('Concours Collectivités (234 CT)');
      expect(getBudgetNatureLabel(aaiDoc)).toBe('Subventions AAI (Régulateurs)');
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
      expect(html).toContain('Extraction Contrôlée');
      expect(html).toContain('SHA-256 : f06035b6af...3a507d76');
      expect(html).toContain('SHA-256 : 0f8c7a91b5...ed0ffe10');
    });

    it('expose le droit d’accès légal CAIDP et le rappel républicain du Principe 9', () => {
      const html = renderToStaticMarkup(<DocumentsPage />);
      expect(html).toContain('Exercez votre droit légal d&#x27;accès à l&#x27;information (Loi n° 2013-867)');
    });
  });
});
