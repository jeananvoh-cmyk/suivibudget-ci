// =========================================================================
// TESTS UNITAIRES : GESTION DES COMPTES ADMINISTRATIFS (CA 232)
// SuiviBudget Côte d'Ivoire - Architecture Multi-Exercices, Checksum & Ingestion
// =========================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  calculateFileSha256, 
  extractFiscalYearFromFileName, 
  cleanInstitutionName, 
  matchFileToCollectivite 
} from '../caFileMatcher';
import { DocumentStorageService } from '../../services/documentStorageService';
import { dataStore } from '../../services/dataStore';
import { Institution, PublicDocument } from '../../types';

const storageMock = vi.hoisted(() => ({ configured: vi.fn(() => false), upload: vi.fn(), query: vi.fn(), insert: vi.fn(), update: vi.fn() }));
vi.mock('../../services/supabase', () => ({
  isSupabaseConfigured: storageMock.configured,
    supabase: {
    storage: { from: () => ({ upload: storageMock.upload }) },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        insert: (value: unknown) => { storageMock.insert(value); return builder; },
        update: (value: unknown) => { storageMock.update(value); return builder; },
        order: () => storageMock.query(),
        single: () => storageMock.query(),
      };
      return builder;
    },
  },
}));

describe('Stockage documentaire privé', () => {
  const options = { institutionId: 'inst-com-test', fiscalYear: 2025, documentType: 'COMPTE_ADMINISTRATIF' as const };
  beforeEach(() => {
    storageMock.configured.mockReturnValue(true);
    storageMock.upload.mockReset();
  });
  it('refuse un faux succès hors ligne', async () => {
    storageMock.configured.mockReturnValue(false);
    const result = await DocumentStorageService.uploadDocument(new Blob(['%PDF-test'], { type: 'application/pdf' }), 'test.pdf', options);
    expect(result.success).toBe(false);
    expect(result.fileUrl).toBe('');
    expect(storageMock.upload).not.toHaveBeenCalled();
  });
  it('refuse un contenu non PDF même avec le bon MIME', async () => {
    const result = await DocumentStorageService.uploadDocument(new Blob(['invalid'], { type: 'application/pdf' }), 'test.pdf', options);
    expect(result.success).toBe(false);
    expect(storageMock.upload).not.toHaveBeenCalled();
  });
  it('propage un refus Storage sans créer une URL fictive', async () => {
    storageMock.upload.mockResolvedValue({ data: null, error: { message: 'Denied' } });
    const result = await DocumentStorageService.uploadDocument(new Blob(['%PDF-test'], { type: 'application/pdf' }), 'test.pdf', options);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Denied');
    expect(result.fileUrl).toBe('');
  });
  it('conserve le checksum et interdit de remplacer une source', async () => {
    storageMock.upload.mockResolvedValue({ data: { path: 'test.pdf' }, error: null });
    const result = await DocumentStorageService.uploadDocument(new Blob(['%PDF-test'], { type: 'application/pdf' }), 'test.pdf', options);
    expect(result.success).toBe(true);
    expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.fileUrl).toBe('');
    expect(storageMock.upload).toHaveBeenCalledWith(expect.any(String), expect.any(Blob), expect.objectContaining({ upsert: false }));
  });
});

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

describe('Comptes administratifs — persistance et publication', () => {
  const institution = dataStore.getInstitutions().find(i => i.type === 'MAIRIE')!;
  const draft = {
    institution_id: institution.id, fiscal_year: 2025, source_name: 'DGDDL',
    storage_path: 'test/ca-v1.pdf', checksum_sha256: 'a'.repeat(64), file_name: 'ca.pdf',
  };
  const row: PublicDocument = {
    ...draft, id: 'test-ca-v1', title: 'CA de test isolé', category: 'COMPTE_ADMINISTRATIF',
    document_type: 'COMPTE_ADMINISTRATIF', institution_name: institution.name,
    year: 2025, description: '', file_url: '', file_format: 'PDF', published_at: '',
    downloads_count: 0, is_official: false, status: 'TO_VERIFY', verification_status: 'TO_VERIFY',
    version: 1, updated_at: '2026-09-29T12:00:00Z',
  };
  beforeEach(async () => {
    storageMock.configured.mockReturnValue(true);
    storageMock.query.mockReset();
    storageMock.insert.mockReset();
    storageMock.update.mockReset();
    storageMock.query.mockResolvedValueOnce({ data: [], error: null });
    await dataStore.refreshDocumentsFromSupabase(true);
  });

  it('calcule 232 collectivités sans créer de documents manquants', () => {
    const { summary, matrix } = dataStore.getCollectivitesCaMatrix(2025);
    expect(summary.totalExpected).toBe(232);
    expect(summary.totalCommunes).toBe(201);
    expect(summary.totalRegions).toBe(31);
    expect(matrix).toHaveLength(232);
    expect(matrix.every(item => item.status === 'MISSING')).toBe(true);
    expect(storageMock.insert).not.toHaveBeenCalled();
  });

  it('attend la confirmation du serveur avant de remplir le cache', async () => {
    storageMock.query.mockResolvedValueOnce({ data: [], error: null });
    let resolveSave!: (value: unknown) => void;
    storageMock.query.mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve; }));
    const saving = dataStore.saveCADocument(draft);
    await vi.waitFor(() => expect(storageMock.insert).toHaveBeenCalledOnce());
    expect(dataStore.getDocuments()).toHaveLength(0);
    resolveSave({ data: row, error: null });
    expect((await saving).status).toBe('TO_VERIFY');
    expect(dataStore.getDocuments()).toHaveLength(1);
  });

  it('ne conserve aucun faux succès après une erreur serveur', async () => {
    storageMock.query.mockResolvedValueOnce({ data: [], error: null });
    storageMock.query.mockResolvedValueOnce({ data: null, error: new Error('RLS denied') });
    await expect(dataStore.saveCADocument(draft)).rejects.toThrow('RLS denied');
    expect(dataStore.getDocuments()).toHaveLength(0);
  });

  it('sépare vérification et publication', async () => {
    storageMock.query.mockResolvedValueOnce({ data: [row], error: null });
    await dataStore.refreshDocumentsFromSupabase(true);
    await expect(dataStore.updateDocumentLifecycleStatus(row.id, 'PUBLISHED')).rejects.toThrow('Vérifiez');
    expect(storageMock.update).not.toHaveBeenCalled();
    const verified = { ...row, status: 'VERIFIED', verification_status: 'VERIFIED', verified_by: 'reviewer-id' };
    storageMock.query.mockResolvedValueOnce({ data: verified, error: null });
    storageMock.query.mockResolvedValueOnce({ data: [verified], error: null });
    await dataStore.updateDocumentLifecycleStatus(row.id, 'VERIFIED');
    expect(dataStore.getDocumentById(row.id)?.status).toBe('VERIFIED');
    const published = { ...verified, status: 'PUBLISHED' };
    storageMock.query.mockResolvedValueOnce({ data: published, error: null });
    storageMock.query.mockResolvedValueOnce({ data: [published], error: null });
    await dataStore.updateDocumentLifecycleStatus(row.id, 'PUBLISHED');
    expect(dataStore.getDocumentById(row.id)?.status).toBe('PUBLISHED');
  });

  it('conserve la source précédente et crée une version à vérifier', async () => {
    const published = { ...row, status: 'PUBLISHED' as const };
    storageMock.query.mockResolvedValueOnce({ data: [published], error: null });
    await dataStore.refreshDocumentsFromSupabase(true);
    storageMock.query.mockResolvedValueOnce({ data: [published], error: null });
    const replacement = { ...row, id: 'test-ca-v2', version: 2, replaces_document_id: row.id };
    storageMock.query.mockResolvedValueOnce({ data: replacement, error: null });
    await dataStore.saveCADocument({ ...draft, storage_path: 'test/ca-v2.pdf', checksum_sha256: 'b'.repeat(64), replacement_reason: 'Scan complet' }, true);
    expect(storageMock.insert).toHaveBeenCalledWith([expect.objectContaining({ version: 2, replaces_document_id: row.id, status: 'TO_VERIFY', replacement_reason: 'Scan complet' })]);
    expect(dataStore.getDocumentById(row.id)?.status).toBe('PUBLISHED');
    expect(dataStore.getDocuments()).toHaveLength(2);
  });

  it('refuse de modifier le cache après un conflit de mise à jour', async () => {
    storageMock.query.mockResolvedValueOnce({ data: [row], error: null });
    await dataStore.refreshDocumentsFromSupabase(true);
    storageMock.query.mockResolvedValueOnce({ data: null, error: new Error('Concurrent edit') });
    await expect(dataStore.updateDocument(row.id, { title: 'Changed' })).rejects.toThrow('Concurrent edit');
    expect(dataStore.getDocumentById(row.id)?.title).toBe(row.title);
  });

  it('refuse une publication lors du dépôt et un enregistrement hors ligne', async () => {
    await expect(dataStore.addDocument({ ...row, status: 'PUBLISHED' })).rejects.toThrow('vérifié');
    storageMock.configured.mockReturnValue(false);
    await expect(dataStore.saveCADocument(draft)).rejects.toThrow('indisponible');
    expect(storageMock.insert).not.toHaveBeenCalled();
  });
});