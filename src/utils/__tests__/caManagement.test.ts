// =========================================================================
// TESTS UNITAIRES : GESTION DES COMPTES ADMINISTRATIFS (CA 232)
// SuiviBudget Côte d'Ivoire - Architecture Multi-Exercices, Checksum & Ingestion
// =========================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  calculateFileSha256, 
  extractFiscalYearFromFileName, 
  cleanInstitutionName, 
  matchFileToCollectivite 
} from '../caFileMatcher';
import { DocumentStorageService } from '../../services/documentStorageService';
import { dataStore } from '../../services/dataStore';
import { Institution, PublicDocument } from '../../types';

describe('Comptes Administratifs — Matching, Checksum & Stockage Canonique', () => {

  it('calcule correctement le hash cryptographique SHA-256 d\'un ArrayBuffer ou Blob', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('Compte Administratif Officiel Cocody 2025');
    const hash = await calculateFileSha256(data.buffer);

    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64); // 256 bits = 64 caractères hexadécimaux
  });

  it('extrait fidèlement l\'exercice fiscal à partir des noms de fichiers variés', () => {
    expect(extractFiscalYearFromFileName('CA_2025_Cocody.pdf', 2025)).toBe(2025);
    expect(extractFiscalYearFromFileName('Compte_Administratif_Exercice_2024_Bouake.pdf', 2025)).toBe(2024);
    expect(extractFiscalYearFromFileName('CA-2026-v2-final.pdf', 2025)).toBe(2026);
    expect(extractFiscalYearFromFileName('compte_administratif_sans_annee.pdf', 2025)).toBe(2025);
  });

  it('nettoie les préfixes et résout les acronymes ivoiriens courants', () => {
    expect(cleanInstitutionName('Mairie de Cocody')).toBe('cocody');
    expect(cleanInstitutionName('Conseil Régional du Gbêkê')).toBe('gbeke');
    expect(cleanInstitutionName('Mairie de San-Pédro')).toBe('san pedro');
  });

  it('propose un appariement automatique avec niveau de confiance STRONG pour un nom explicite', async () => {
    const mockCollectivites: Institution[] = [
      { id: 'inst-com-cocody', name: 'Mairie de Cocody', type: 'MAIRIE', region: 'Abidjan', district: 'Abidjan', budget_functioning_fcfa: 0, budget_investment_fcfa: 0, total_budget_fcfa: 0 },
      { id: 'inst-com-bouake', name: 'Mairie de Bouaké', type: 'MAIRIE', region: 'Gbêkê', district: 'Vallée du Bandama', budget_functioning_fcfa: 0, budget_investment_fcfa: 0, total_budget_fcfa: 0 },
      { id: 'inst-reg-gbeke', name: 'Conseil Régional du Gbêkê', type: 'REGION', region: 'Gbêkê', district: 'Vallée du Bandama', budget_functioning_fcfa: 0, budget_investment_fcfa: 0, total_budget_fcfa: 0 },
    ];

    const fakeFile = new File(['dummy content'], 'Compte_Administratif_2025_Cocody.pdf', { type: 'application/pdf' });
    const proposal = await matchFileToCollectivite(fakeFile, mockCollectivites, [], 2025);

    expect(proposal.matchedInstitutionId).toBe('inst-com-cocody');
    expect(proposal.matchedInstitutionName).toBe('Mairie de Cocody');
    expect(proposal.confidence).toBe('STRONG');
    expect(proposal.detectedYear).toBe(2025);
  });

  it('construit un chemin de stockage canonique standardisé', () => {
    const pathCommune = DocumentStorageService.buildCanonicalStoragePath({
      institutionId: 'inst-com-cocody',
      institutionType: 'MAIRIE',
      fiscalYear: 2025,
      documentType: 'COMPTE_ADMINISTRATIF',
      version: 1,
    }, 'scan_original.pdf');

    expect(pathCommune).toBe('comptes-administratifs/communes/inst-com-cocody/2025/compte-administratif-2025-v1.pdf');

    const pathRegion = DocumentStorageService.buildCanonicalStoragePath({
      institutionId: 'inst-reg-gbeke',
      institutionType: 'REGION',
      fiscalYear: 2025,
      documentType: 'COMPTE_ADMINISTRATIF',
      version: 2,
    }, 'document.pdf');

    expect(pathRegion).toBe('comptes-administratifs/conseils-regionaux/inst-reg-gbeke/2025/compte-administratif-2025-v2.pdf');
  });

});

describe('Comptes Administratifs — Matrice 232 & Découplage Validation/Publication', () => {

  it('calcule la matrice de couverture dynamique sur exactement 232 collectivités attendues', () => {
    const { summary, matrix } = dataStore.getCollectivitesCaMatrix(2025);

    expect(summary.totalExpected).toBe(232);
    expect(summary.totalCommunes).toBe(201);
    expect(summary.totalRegions).toBe(31);
    expect(matrix.length).toBe(232);

    // Vérifie que les collectivités sans document sont marquées MISSING sans créer de faux enregistrements en base
    const missingRows = matrix.filter(r => r.status === 'MISSING');
    expect(missingRows.length).toBe(summary.missingCount);
  });

  it('découple strictement la validation de la publication', () => {
    // 1. Sauvegarde d'un document en statut TO_VERIFY
    const doc = dataStore.saveCADocument({
      institution_id: 'inst-com-test-decouple',
      institution_name: 'Mairie Test Découplage',
      institution_type: 'MAIRIE',
      fiscal_year: 2025,
      year: 2025,
      title: 'Compte Administratif 2025 Test',
      file_url: 'https://example.com/test.pdf',
      file_name: 'test.pdf',
      file_size: '1.2 Mo',
      document_status: 'TO_VERIFY',
      is_public: false,
    });

    expect(doc.document_status).toBe('TO_VERIFY');
    expect(doc.is_public).toBe(false);

    // 2. Validation par un agent : passe en VERIFIED
    dataStore.updateDocumentLifecycleStatus(doc.id, 'VERIFIED', 'Modérateur Test');
    const verifiedDoc = dataStore.getDocumentById(doc.id);

    expect(verifiedDoc?.document_status).toBe('VERIFIED');
    expect(verifiedDoc?.verification_status).toBe('VERIFIED');
    expect(verifiedDoc?.verified_by).toBe('Modérateur Test');
    // RÈGLE CARDINALE : is_public reste false après vérification !
    expect(verifiedDoc?.is_public).toBe(false);

    // 3. Publication explicite par l'administrateur
    dataStore.updateDocumentLifecycleStatus(doc.id, 'PUBLISHED');
    const publishedDoc = dataStore.getDocumentById(doc.id);

    expect(publishedDoc?.document_status).toBe('PUBLISHED');
    expect(publishedDoc?.is_public).toBe(true);
    expect(publishedDoc?.published_at).toBeDefined();

    // Nettoyage du document de test
    dataStore.deleteDocument(doc.id);
  });

  it('gère le versioning automatique en archivant l\'ancienne version et en requérant un nouvel examen', () => {
    const testInstId = 'inst-com-test-versioning';
    
    // Version 1 publiée
    const v1 = dataStore.saveCADocument({
      institution_id: testInstId,
      institution_name: 'Mairie Test Versioning',
      fiscal_year: 2025,
      year: 2025,
      file_url: 'https://example.com/v1.pdf',
      file_name: 'v1.pdf',
      document_status: 'PUBLISHED',
      is_public: true,
      version: 1,
    });

    expect(v1.version).toBe(1);

    // Version 2 déposée pour la même collectivité et la même année avec asNewVersion = true
    const v2 = dataStore.saveCADocument({
      institution_id: testInstId,
      fiscal_year: 2025,
      file_url: 'https://example.com/v2.pdf',
      file_name: 'v2.pdf',
      checksum_sha256: 'fakehash123',
    }, true);

    expect(v2.version).toBe(2);
    // La nouvelle version DOIT repasser par l'examen avant publication
    expect(v2.document_status).toBe('TO_VERIFY');
    expect(v2.is_public).toBe(false);
    expect(v2.previous_versions).toBeDefined();
    expect(v2.previous_versions?.length).toBe(1);
    expect(v2.previous_versions?.[0].version).toBe(1);

    // Nettoyage
    dataStore.deleteDocument(v2.id);
  });

});
