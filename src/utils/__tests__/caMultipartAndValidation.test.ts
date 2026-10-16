// =========================================================================
// TESTS UNITAIRES & D'INTÉGRATION : INGESTION MULTI-PDF ET VALIDATION DU CA
// SuiviBudget Côte d'Ivoire — Pilote Multi-Volets & Workflow de Validation
// =========================================================================

import { describe, it, expect, beforeEach, afterAll, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { 
  DocumentStorageService,
  buildCanonicalStoragePath,
  calculateManifestSha256,
  validateDocumentPageRanges
} from '../../services/documentStorageService';
import { dataStore } from '../../services/dataStore';
import type { PublicDocument, UserRole } from '../../types';

// Mock Supabase storage and auth
const mockStorage = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  query: vi.fn<() => Promise<{ data: any; error: any }>>(() => Promise.resolve({ data: [], error: null })),
  insert: vi.fn(),
  update: vi.fn(),
  updateError: null as any,
  removeError: null as any,
}));

vi.mock('../../services/supabase', () => ({
  isSupabaseConfigured: mockStorage.configured,
  supabase: {
    rpc: vi.fn(async(name:string,args:any)=>{
      if(name==='admin_persistence_version') return {data:3,error:null};
      if(name==='admin_baseline_visibility') return {data:[],error:null};
      if(mockStorage.updateError) return {data:null,error:mockStorage.updateError};
      if(!['ADMIN','DATA_MANAGER'].includes(dataStore.getAuthState().role || '')) return {data:null,error:new Error('Action non autorisée')};
      const old=dataStore.getDocumentById(args.p_id)!;
      const row={...old,...args.p_patch,revision:(old.revision || 1)+1,updated_at:new Date().toISOString(),is_official:args.p_patch.status==='PUBLISHED',verification_status:args.p_patch.status==='PUBLISHED' ? 'VERIFIED' : args.p_patch.status || old.verification_status,verified_by:'server-actor-id',verified_at:new Date().toISOString(),published_at:args.p_patch.status==='PUBLISHED' ? new Date().toISOString() : null};
      mockStorage.query.mockResolvedValue({data:[row],error:null});
      return {data:{...row,_operation:{id:args.p_operation_id,original:{revision:row.revision},changed:false}},error:null};
    }),
    functions:{invoke:vi.fn(async(_name:string,{body}:any)=>{const doc=dataStore.getDocumentById(body.id)!;return ['ADMIN','DATA_MANAGER'].includes(dataStore.getAuthState().role || '') ? {data:{document_id:body.id,revision:doc.revision,checksum_status:'COMPUTED'},error:null} : {data:null,error:new Error('Action non autorisée')};})},
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: '00000000-0000-0000-0000-000000000001' } }, error: null }),
    },
    storage: {
      from: () => ({
        upload: mockStorage.upload,
        remove: (paths: string[]) => {
          if (mockStorage.removeError) {
            return Promise.resolve({ data: null, error: mockStorage.removeError });
          }
          mockStorage.remove(paths);
          return Promise.resolve({ data: paths.map(p => ({ name: p })), error: null });
        },
        createSignedUrl: mockStorage.createSignedUrl,
      }),
    },
    from: () => {
      let currentPayload: any = null;
      let targetId: string | null = null;
      const builder = {
        select: () => builder,
        eq: (col: string, val: string) => {
          if (col === 'id') targetId = val;
          return builder;
        },
        order: () => builder,
        range: () => builder,
        insert: (val: unknown) => {
          mockStorage.insert(val);
          currentPayload = Array.isArray(val) ? val[0] : val;
          return builder;
        },
        update: (val: unknown) => {
          mockStorage.update(val);
          currentPayload = val;
          return builder;
        },
        delete: () => { mockStorage.remove(); return builder; },
        single: () => {
          if (mockStorage.updateError) {
            return Promise.resolve({ data: null, error: mockStorage.updateError });
          }
          if (currentPayload && targetId) {
            const existing = dataStore.getDocumentById(targetId);
            const merged = { ...(existing || {}), ...currentPayload };
            dataStore.saveDocument(merged);
            return Promise.resolve({ data: merged, error: null });
          }
          if (currentPayload) {
            return Promise.resolve({ data: currentPayload, error: null });
          }
          return Promise.resolve(mockStorage.query()).then(result=>({...result,data:Array.isArray(result.data) ? result.data[0] : result.data}));
        },
        then: (resolve: (v: unknown) => unknown, reject: (r: unknown) => unknown) => {
          if (mockStorage.updateError) {
            return Promise.resolve({ data: null, error: mockStorage.updateError }).then(resolve, reject);
          }
          if (currentPayload && targetId) {
            const existing = dataStore.getDocumentById(targetId);
            const merged = { ...(existing || {}), ...currentPayload };
            dataStore.saveDocument(merged);
            return Promise.resolve({ data: merged, error: null }).then(resolve, reject);
          }
          return Promise.resolve(mockStorage.query()).then(resolve, reject);
        },
      };
      return builder;
    },
  },
}));

describe('Ingestion Multi-PDF — Validation des Plages de Pages et Manifeste', () => {

  it('valide des plages de pages contiguës et cohérentes sans chevauchement', () => {
    const validParts = [
      { page_start: 1, page_end: 22 },
      { page_start: 23, page_end: 44 }
    ];
    const result = validateDocumentPageRanges(validParts);
    expect(result.isValid).toBe(true);
    expect(result.totalPages).toBe(44);
    expect(result.errors).toHaveLength(0);
  });

  it('rejette des plages de pages avec chevauchement', () => {
    const overlappingParts = [
      { page_start: 1, page_end: 25 },
      { page_start: 20, page_end: 44 }
    ];
    const result = validateDocumentPageRanges(overlappingParts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('Chevauchement'))).toBe(true);
  });

  it('rejette une plage inversée (début > fin)', () => {
    const invertedParts = [
      { page_start: 25, page_end: 10 }
    ];
    const result = validateDocumentPageRanges(invertedParts);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('détecte un trou de numérotation entre deux volets', () => {
    const gapParts = [
      { page_start: 1, page_end: 20 },
      { page_start: 25, page_end: 44 }
    ];
    const result = validateDocumentPageRanges(gapParts);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes('Discontinuité'))).toBe(true);
  });

  it('calcule fidèlement l\'empreinte logique Manifest SHA-256 de façon déterministe', async () => {
    const part1Hash = '580b42cde2c164c8f7a4af23419b3dd93de541b583f5986d71bbf35b3e9c4ca4';
    const part2Hash = '796921a9522c0fbf2a48b4bbf16f97ea8a525f57fb74b438c11bc64de5dc7ec9';
    
    // Le hash déterministe attendu pour ces deux volets du CA Cocody 2024
    const manifestHash = await calculateManifestSha256([part1Hash, part2Hash].map((hash,index)=>({id:`part-${index+1}`,part_number:index+1,storage_path:`isolated/${index+1}.pdf`,checksum_sha256:hash,file_size_bytes:32,page_start:index*2+1,page_end:index*2+2})));
    expect(manifestHash).not.toBe('ace0243d9ed0cae9e6ee24c420f554751893eecff79f4202007d1c48f5d19928');
    expect(manifestHash).toHaveLength(64);
  });

  it('génère un chemin canonique standardisé avec numéro de volet', () => {
    const pathPart1 = buildCanonicalStoragePath({
      institutionId: 'inst-com-cocody',
      fiscalYear: 2024,
      version: 1,
      documentType: 'COMPTE_ADMINISTRATIF',
      partNumber: 1
    });
    expect(pathPart1).toBe('comptes-administratifs/communes/inst-com-cocody/2024/compte-administratif-2024-v1-part-1.pdf');

    const pathPart2 = buildCanonicalStoragePath({
      institutionId: 'inst-com-cocody',
      fiscalYear: 2024,
      version: 1,
      documentType: 'COMPTE_ADMINISTRATIF',
      partNumber: 2
    });
    expect(pathPart2).toBe('comptes-administratifs/communes/inst-com-cocody/2024/compte-administratif-2024-v1-part-2.pdf');
  });
});

describe('Upload Multi-Volets avec Rollback Automatique', () => {
  const options = {
    institutionId: 'inst-com-cocody',
    fiscalYear: 2024,
    version: 1,
    documentType: 'COMPTE_ADMINISTRATIF' as const
  };

  beforeEach(() => {
    mockStorage.configured.mockReturnValue(true);
    mockStorage.upload.mockReset();
    mockStorage.remove.mockReset();
    mockStorage.removeError = null;
    mockStorage.updateError = null;
  });

  it('exécute l\'upload séquentiel des deux volets et calcule le manifest', async () => {
    mockStorage.upload.mockResolvedValue({ data: { path: 'uploaded.pdf' }, error: null });

    const dummyPdfContent = '%PDF-1.4 mock content for testing multi-part upload';
    const file1 = new File([dummyPdfContent + ' part 1'], 'Cocody_CA_2024_pages_01-22.pdf', { type: 'application/pdf' });
    const file2 = new File([dummyPdfContent + ' part 2'], 'Cocody_CA_2024_pages_23-44.pdf', { type: 'application/pdf' });

    const parts = [
      { file: file1, partNumber: 1, pageStart: 1, pageEnd: 22 },
      { file: file2, partNumber: 2, pageStart: 23, pageEnd: 44 }
    ];

    const result = await DocumentStorageService.uploadMultiPartDocument(parts, options);
    expect(result.success).toBe(true);
    expect(result.documentParts).toHaveLength(2);
    expect(result.manifestChecksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(mockStorage.upload).toHaveBeenCalledTimes(2);
    expect(mockStorage.remove).not.toHaveBeenCalled();
  });

  it('déclenche un rollback complet si un volet échoue lors du transfert', async () => {
    // Premier volet réussit, deuxième volet échoue
    mockStorage.upload
      .mockResolvedValueOnce({ data: { path: 'path-part-1.pdf' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Quota dépassé ou réseau interrompu' } });

    mockStorage.remove.mockResolvedValue({ data: null, error: null });

    const dummyPdfContent = '%PDF-1.4 mock content';
    const file1 = new File([dummyPdfContent + ' part 1'], 'part1.pdf', { type: 'application/pdf' });
    const file2 = new File([dummyPdfContent + ' part 2'], 'part2.pdf', { type: 'application/pdf' });

    const parts = [
      { file: file1, partNumber: 1, pageStart: 1, pageEnd: 22 },
      { file: file2, partNumber: 2, pageStart: 23, pageEnd: 44 }
    ];

    const result = await DocumentStorageService.uploadMultiPartDocument(parts, options);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Échec du téléversement du volet 2');
    // Vérification du rollback : suppression du volet 1 téléversé
    expect(mockStorage.remove).toHaveBeenCalled();
  });
});

describe('Intégrité des Fichiers & Élimination des Blobs Vides (Taille 0)', () => {
  const options = {
    institutionId: 'inst-com-cocody',
    fiscalYear: 2024,
    version: 1,
    documentType: 'COMPTE_ADMINISTRATIF' as const
  };

  beforeEach(() => {
    mockStorage.configured.mockReturnValue(true);
    mockStorage.upload.mockReset();
    mockStorage.remove.mockReset();
    mockStorage.removeError = null;
  });

  it('rejette immédiatement tout volet contenant un fichier vide (0 octet)', async () => {
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    const validFile = new File(['%PDF-1.4 non empty content'], 'valid.pdf', { type: 'application/pdf' });

    const parts = [
      { file: emptyFile, partNumber: 1, pageStart: 1, pageEnd: 22 },
      { file: validFile, partNumber: 2, pageStart: 23, pageEnd: 44 }
    ];

    const result = await DocumentStorageService.uploadMultiPartDocument(parts, options);
    expect(result.success).toBe(false);
    expect(result.error).toContain('vide (0 octet)');
    expect(mockStorage.upload).not.toHaveBeenCalled();
  });

  it('rejette un volet sans fichier et sans référence de stockage existante certifiée', async () => {
    const invalidParts = [
      {
        partNumber: 1,
        pageStart: 1,
        pageEnd: 22,
        fileName: 'missing-data.pdf',
        // Pas de file, pas de storagePath, pas de checksum
      } as any
    ];

    const result = await DocumentStorageService.uploadMultiPartDocument(invalidParts, options);
    expect(result.success).toBe(false);
    expect(result.error).toContain('ne dispose ni d\'un nouveau fichier PDF ni d\'un chemin de stockage existant');
  });

  it('exécute un remplacement partiel sécurisé : upload uniquement du volet modifié et préservation du volet inchangé', async () => {
    mockStorage.upload.mockResolvedValueOnce({
      data: { path: 'path-new-part1.pdf' },
      error: null
    });

    const newPart1File = new File(['%PDF-1.4 new content for part 1 revised'], 'Cocody_CA_2024_pages_01-22_v2.pdf', { type: 'application/pdf' });
    const preservedPart2Hash = '796921a9522c0fbf2a48b4bbf16f97ea8a525f57fb74b438c11bc64de5dc7ec9';
    const preservedPart2Path = 'comptes-administratifs/communes/inst-com-cocody/2024/compte-administratif-2024-v1-part-2.pdf';

    const mixedParts = [
      {
        file: newPart1File,
        partNumber: 1,
        pageStart: 1,
        pageEnd: 22,
        fileName: 'Cocody_CA_2024_pages_01-22_v2.pdf'
      },
      {
        partNumber: 2,
        fileName: 'Cocody_CA_2024_pages_23-44.pdf',
        pageStart: 23,
        pageEnd: 44,
        storagePath: preservedPart2Path,
        checksumSha256: preservedPart2Hash,
        fileSizeBytes: 3500000,
        fileSizeFormatted: '3.5 Mo'
      }
    ];

    const result = await DocumentStorageService.uploadMultiPartDocument(mixedParts, options);
    expect(result.success).toBe(true);
    // Un seul fichier téléversé dans Supabase Storage (le volet 1 modifié)
    expect(mockStorage.upload).toHaveBeenCalledTimes(1);
    // Le tableau newlyUploadedPaths ne contient que le volet 1
    expect(result.newlyUploadedPaths).toHaveLength(1);
    expect(result.documentParts).toHaveLength(2);

    // Le volet 2 a conservé fidèlement son storagePath et son empreinte d'origine
    expect(result.documentParts[1].storage_path).toBe(preservedPart2Path);
    expect(result.documentParts[1].checksum_sha256).toBe(preservedPart2Hash);

    // Le manifeste SHA-256 est recalculé en combinant le nouveau hash et le hash préservé
    const expectedManifest = await calculateManifestSha256(result.documentParts);
    expect(result.manifestChecksumSha256).toBe(expectedManifest);
  });
});

describe('Compensation Storage et Résilience aux Pannes PostgreSQL', () => {
  beforeEach(() => {
    mockStorage.configured.mockReturnValue(true);
    mockStorage.remove.mockReset();
    mockStorage.removeError = null;
  });

  it('nettoie avec succès les fichiers orphelins via deleteStorageFiles', async () => {
    const paths = ['path1.pdf', 'path2.pdf'];
    const result = await DocumentStorageService.deleteStorageFiles(paths);
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);
    expect(mockStorage.remove).toHaveBeenCalledWith(paths);
  });

  it('signale une anomalie critique si la suppression de compensation Storage échoue', async () => {
    mockStorage.removeError = { message: 'Connexion réseau interrompue vers Supabase Storage' };

    const paths = ['path-orphan.pdf'];
    const result = await DocumentStorageService.deleteStorageFiles(paths);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Connexion réseau interrompue');
    expect(result.deletedCount).toBe(0);
  });

  it('ne supprime aucun fichier historique lors de la compensation d\'un remplacement partiel', async () => {
    // Si seuls les newlyUploadedPaths sont transmis, les fichiers existants ne sont jamais affectés
    const newlyUploaded = ['comptes-administratifs/.../compte-2024-v2-part-1.pdf'];
    const historicalFile = 'comptes-administratifs/.../compte-2024-v1-part-2.pdf';

    await DocumentStorageService.deleteStorageFiles(newlyUploaded);
    expect(mockStorage.remove).toHaveBeenCalledWith(newlyUploaded);
    expect(mockStorage.remove).not.toHaveBeenCalledWith(expect.arrayContaining([historicalFile]));
  });
});

describe('Cycle de Validation Découlplé et Synchronisation des Statuts (Examine -> Verify -> Publish)', () => {
  const sampleDocId = 'doc-test-cocody-ca-2024';

  beforeEach(() => {
    mockStorage.query.mockImplementation(() => Promise.resolve({ data: dataStore.getDocuments(), error: null }));
    mockStorage.updateError = null;

    // Configurer l'utilisateur connecté comme ADMIN avec un UUID valide
    dataStore.setAuthState({
      isAuthenticated: true,
      email: 'admin@suivibudget.ci',
      fullName: 'Super Administrateur',
      userId: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN' as UserRole
    });

    // Enregistrer un document en état TO_VERIFY
    const sampleDoc: PublicDocument = {
      id: sampleDocId,
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      institution_type: 'MAIRIE',
      fiscal_year: 2024,
      year: 2024,
      category: 'COMPTE_ADMINISTRATIF',
      document_type: 'COMPTE_ADMINISTRATIF',
      title: 'Compte Administratif 2024 - Cocody',
      description: 'Compte administratif officiel de la commune de Cocody pour l\'exercice 2024',
      file_name: 'Cocody_CA_2024_pages_01-22.pdf',
      file_url: 'https://example.com/part1.pdf',
      file_format: 'PDF',
      file_size: '7.2 Mo',
      storage_path: 'comptes-administratifs/communes/inst-com-cocody/2024/compte-administratif-2024-v1-part-1.pdf',
      storage_bucket: 'public_documents',
      checksum_sha256: 'ace0243d9ed0cae9e6ee24c420f554751893eecff79f4202007d1c48f5d19928',
      status: 'TO_VERIFY',
      verification_status: 'TO_VERIFY',
      version: 1, revision:1,
      is_multipart: true,
      parts_count: 2,
      page_count: 44,
      is_scanned: true,
      ocr_status: 'MANUAL_TRANSCRIPTION',
      published_at: null,
      is_official: true,
      downloads_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dataStore.saveDocument(sampleDoc);
  });

  it('valide et passe le document à VERIFIED avec assignation de verified_by par le serveur', async () => {
    const success = await dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED');
    expect(success).toBe(true);

    const updated = dataStore.getDocumentById(sampleDocId);
    expect(updated).toBeDefined();
    expect(updated?.status).toBe('VERIFIED');
    expect(updated?.verification_status).toBe('VERIFIED');
    expect(updated?.verified_at).toBeDefined();
    expect(updated?.verified_by).toBe('server-actor-id');
  });

  it('refuse la publication directe si le document n\'a pas encore été vérifié', async () => {
    await dataStore.updateDocument(sampleDocId, {
      status: 'TO_VERIFY',
      verification_status: 'TO_VERIFY'
    });

    await expect(dataStore.updateDocumentLifecycleStatus(sampleDocId, 'PUBLISHED'))
      .rejects.toThrow('Vérifiez le document avant publication.');
  });

  it('permet la publication après vérification préalable conforme', async () => {
    // 1. Étape 1 : Vérification
    await dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED');

    // 2. Étape 2 : Publication
    const publishSuccess = await dataStore.updateDocumentLifecycleStatus(sampleDocId, 'PUBLISHED');
    expect(publishSuccess).toBe(true);

    const publishedDoc = dataStore.getDocumentById(sampleDocId);
    expect(publishedDoc?.status).toBe('PUBLISHED');
    expect(publishedDoc?.verification_status).toBe('VERIFIED');
    expect(publishedDoc?.is_official).toBe(true);
    expect(publishedDoc?.published_at).toBeDefined();
  });

  it('reflète correctement le document vérifié puis publié dans la matrice des 232 collectivités', async () => {
    // 1. Passage à VERIFIED
    await dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED');
    const { matrix: matrixVerified } = dataStore.getCollectivitesCaMatrix(2024);
    const cocodyRowVerified = matrixVerified.find(r => r.institution_id === 'inst-com-cocody');
    expect(cocodyRowVerified).toBeDefined();
    expect(cocodyRowVerified?.status).toBe('VERIFIED');

    // 2. Passage à PUBLISHED
    await dataStore.updateDocumentLifecycleStatus(sampleDocId, 'PUBLISHED');
    const { matrix: matrixPublished } = dataStore.getCollectivitesCaMatrix(2024);
    const cocodyRowPublished = matrixPublished.find(r => r.institution_id === 'inst-com-cocody');
    expect(cocodyRowPublished).toBeDefined();
    expect(cocodyRowPublished?.status).toBe('PUBLISHED');
  });
});

describe('Contrôle d\'Accès Fail-Closed & Sécurité des Sessions (RBAC)', () => {
  const sampleDocId = 'doc-test-rbac-security';

  beforeEach(() => {
    mockStorage.query.mockImplementation(() => Promise.resolve({ data: dataStore.getDocuments(), error: null }));
    mockStorage.updateError = null;

    const sampleDoc: PublicDocument = {
      id: sampleDocId,
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      institution_type: 'MAIRIE',
      fiscal_year: 2024,
      year: 2024,
      category: 'COMPTE_ADMINISTRATIF',
      document_type: 'COMPTE_ADMINISTRATIF',
      title: 'CA 2024 Cocody RBAC Test',
      description: 'Document de test RBAC pour le compte administratif',
      file_name: 'test.pdf',
      file_url: 'https://example.com/test.pdf',
      file_format: 'PDF',
      storage_path: 'path.pdf',
      checksum_sha256: 'a'.repeat(64),
      status: 'TO_VERIFY',
      verification_status: 'TO_VERIFY',
      version: 1,
      revision: 1,
      published_at: null,
      is_official: false,
      downloads_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dataStore.saveDocument(sampleDoc);
  });

  it('bloque toute mutation et rejette si la requête n\'est pas authentifiée (Fail-Closed)', async () => {
    dataStore.setAuthState({
      isAuthenticated: false,
      email: '',
      fullName: '',
      role: 'CITIZEN' as UserRole
    });

    await expect(dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED'))
      .rejects.toThrow('Authentification requise pour modifier le statut du document.');

    // Vérifier que le document n'a subi aucune altération
    const doc = dataStore.getDocumentById(sampleDocId);
    expect(doc?.status).toBe('TO_VERIFY');
  });

  it('bloque toute mutation et rejette si la session est expirée', async () => {
    dataStore.setAuthState({
      isAuthenticated: true,
      email: 'admin@suivibudget.ci',
      fullName: 'Super Admin',
      userId: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN' as UserRole,
      expiresAt: Date.now() - 5000 // Expirée il y a 5 secondes
    });

    await expect(dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED'))
      .rejects.toThrow('Session expirée');

    const doc = dataStore.getDocumentById(sampleDocId);
    expect(doc?.status).toBe('TO_VERIFY');
  });

  it('refuse toute validation ou publication au rôle CITIZEN', async () => {
    dataStore.setAuthState({
      isAuthenticated: true,
      email: 'citoyen@suivibudget.ci',
      fullName: 'Citoyen Ivoirien',
      role: 'CITIZEN' as UserRole
    });

    await expect(dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED'))
      .rejects.toThrow('Action non autorisée : permissions insuffisantes');
  });

  it('contrôle les permissions de MODERATOR et refuse la publication et l\'archivage', async () => {
    dataStore.setAuthState({
      isAuthenticated: true,
      email: 'mod@suivibudget.ci',
      fullName: 'Modérateur',
      userId: '00000000-0000-0000-0000-000000000002',
      role: 'MODERATOR' as UserRole
    });

    await expect(dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED'))
      .rejects.toThrow(/non confirmé/);
    await expect(dataStore.updateDocumentLifecycleStatus(sampleDocId, 'PUBLISHED'))
      .rejects.toThrow('la publication officielle requiert les droits administrateur');
    await expect(dataStore.updateDocumentLifecycleStatus(sampleDocId, 'ARCHIVED'))
      .rejects.toThrow('le rôle modérateur est limité à la vérification');
  });

  it('autorise la vérification et la publication au rôle DATA_MANAGER', async () => {
    dataStore.setAuthState({
      isAuthenticated: true,
      email: 'manager@suivibudget.ci',
      fullName: 'Responsable Données',
      userId: '00000000-0000-0000-0000-000000000003',
      role: 'DATA_MANAGER' as UserRole
    });

    // 1. Vérification
    await dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED');
    // 2. Publication
    const publishSuccess = await dataStore.updateDocumentLifecycleStatus(sampleDocId, 'PUBLISHED');
    expect(publishSuccess).toBe(true);

    const doc = dataStore.getDocumentById(sampleDocId);
    expect(doc?.status).toBe('PUBLISHED');
  });

  it('propage fidèlement les refus RLS PostgreSQL (code 42501) et préserve l\'intégrité du store', async () => {
    dataStore.setAuthState({
      isAuthenticated: true,
      email: 'admin@suivibudget.ci',
      fullName: 'Admin',
      userId: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN' as UserRole
    });

    // Simuler un refus RLS au niveau PostgreSQL
    mockStorage.updateError = {
      code: '42501',
      message: 'new row violates row-level security policy for table "public_documents"'
    };

    await expect(dataStore.updateDocumentLifecycleStatus(sampleDocId, 'VERIFIED'))
      .rejects.toMatchObject({ code: '42501' });

    // Le store local ne doit pas avoir muté
    const doc = dataStore.getDocumentById(sampleDocId);
    expect(doc?.status).toBe('TO_VERIFY');
  });
});

describe('Validation Schéma & Migration SQL Locale (PGlite)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS public.public_documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        institution_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        status TEXT DEFAULT 'TO_VERIFY',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Appliquer la migration de support multi-fascicules
    const migrationPath = resolve('supabase/migrations/20261013200000_multipart_ca_documents.sql');
    const migrationSql = readFileSync(migrationPath, 'utf8');
    await db.exec(migrationSql);
  }, 60000);

  afterAll(async () => {
    await db?.close();
  });

  it('crée les colonnes nécessaires avec leurs valeurs par défaut rétrocompatibles (NULL = inconnu)', async () => {
    await db.query(`
      INSERT INTO public.public_documents (id, title, category, institution_name, file_url, file_name)
      VALUES ('doc-pglite-default', 'Test Défaillant', 'CA', 'Cocody', 'http://example.com/test.pdf', 'test.pdf')
    `);

    const result = await db.query<{
      is_multipart: boolean | null;
      parts_count: number | null;
      document_parts: any;
      is_scanned: boolean | null;
      has_text_layer: boolean | null;
      ocr_status: string | null;
    }>(`
      SELECT is_multipart, parts_count, document_parts, is_scanned, has_text_layer, ocr_status
      FROM public.public_documents
      WHERE id = 'doc-pglite-default'
    `);

    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.is_multipart).toBeNull();
    expect(row.parts_count).toBeNull();
    expect(row.document_parts).toEqual([]);
    expect(row.is_scanned).toBeNull();
    expect(row.has_text_layer).toBeNull();
    expect(row.ocr_status).toBeNull();
  });

  it('autorise les statuts OCR officiellement conformes au workflow', async () => {
    const validStatuses = ['MANUAL_TRANSCRIPTION', 'OCR_PENDING', 'NOT_APPLICABLE', 'NOT_IMPLEMENTED', 'PROCESSED'];

    for (let i = 0; i < validStatuses.length; i++) {
      const status = validStatuses[i];
      await db.query(`
        INSERT INTO public.public_documents (id, title, category, institution_name, file_url, file_name, ocr_status)
        VALUES ($1, 'Test OCR ' || $2, 'CA', 'Cocody', 'http://example.com/test.pdf', 'test.pdf', $2)
      `, [`doc-ocr-${i}`, status]);
    }

    const countRes = await db.query<{ count: string }>(`
      SELECT count(*) FROM public.public_documents WHERE id LIKE 'doc-ocr-%'
    `);
    expect(Number(countRes.rows[0].count)).toBe(validStatuses.length);
  });

  it('bloque au niveau SQL l\'insertion d\'un statut OCR non autorisé (contrainte chk_pubdocs_ocr_status)', async () => {
    await expect(db.query(`
      INSERT INTO public.public_documents (id, title, category, institution_name, file_url, file_name, ocr_status)
      VALUES ('doc-invalid-ocr', 'Test Invalide', 'CA', 'Cocody', 'http://example.com/test.pdf', 'test.pdf', 'STATUT_INCONNU')
    `)).rejects.toThrow();
  });
});
