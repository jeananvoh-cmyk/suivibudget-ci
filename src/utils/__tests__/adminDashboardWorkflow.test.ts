import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminTaskService } from '../../services/adminTaskService';
import { dataStore } from '../../services/dataStore';
import type { PublicDocument } from '../../types';

describe('Actions du tableau de bord administrateur — intégrité et navigation', () => {
  beforeEach(() => {
    vi.spyOn(dataStore, 'getPendingProofs').mockReturnValue([]);
    vi.spyOn(dataStore, 'getCaidpDirectory').mockReturnValue([]);
    vi.spyOn(dataStore, 'getCaidpRequestStats').mockReturnValue({
      totalRequests: 0, emailSentCount: 0, printPdfCount: 0, copiedCount: 0,
      withRiCount: 0, withoutRiCount: 0, byEntityType: {}, topDocuments: [], recentEvents: []
    });
    vi.spyOn(dataStore, 'getProjects').mockReturnValue([]);
  });
  afterEach(() => vi.restoreAllMocks());

  const makeDocument = (overrides: Partial<PublicDocument>): PublicDocument => ({
    id: 'document-test', title: 'CA 2024 Cocody', category: 'COMPTE_ADMINISTRATIF',
    document_type: 'COMPTE_ADMINISTRATIF', institution_name: 'Mairie de Cocody',
    institution_id: 'inst-com-cocody', year: 2024, fiscal_year: 2024, description: '',
    file_url: '', file_name: 'COMMUNE DE COCODY.pdf', file_format: 'PDF',
    published_at: null, downloads_count: 0, is_official: false,
    storage_path: 'comptes-administratifs/communes/inst-com-cocody/2024/compte-administratif-2024-v1.pdf',
    status: 'TO_VERIFY', verification_status: 'TO_VERIFY',
    ...overrides,
  });

  it('conduit une tâche CA vers le bon module, organisme et exercice, sans exiger une URL publique', () => {
    vi.spyOn(dataStore, 'getDocuments').mockReturnValue([makeDocument({})]);
    expect(adminTaskService.getActionKpis().unverifiedDocsCount).toBe(1);
    const tasks = adminTaskService.getWorkQueueTasks().filter(t => t.type === 'DOCUMENT_VERIFICATION');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      target_tab: 'comptes_administratifs',
      target_filter: { year: '2024', search: 'Mairie de Cocody' }
    });
  });

  it('ne compte pas comme non vérifié un document déjà publié avec PDF privé', () => {
    vi.spyOn(dataStore, 'getDocuments').mockReturnValue([
      makeDocument({ status: 'PUBLISHED', verification_status: 'VERIFIED', is_official: true }),
    ]);
    expect(adminTaskService.getActionKpis().unverifiedDocsCount).toBe(0);
    expect(adminTaskService.getWorkQueueTasks().some(t => t.type === 'DOCUMENT_VERIFICATION')).toBe(false);
  });

  it('dirige une publication documentaire ordinaire vers le gestionnaire de documents', () => {
    vi.spyOn(dataStore, 'getDocuments').mockReturnValue([
      makeDocument({ id: 'other-doc', category: 'RAPPORT_AUDIT', document_type: 'RAPPORT_AUDIT', title: 'Audit annuel', status: 'UPLOADED' }),
    ]);
    const task = adminTaskService.getWorkQueueTasks().find(t => t.source_id === 'other-doc');
    expect(task).toMatchObject({
      target_tab: 'documents_manager',
      target_filter: { filter: 'unverified', search: 'Audit annuel' }
    });
  });

  it('ne réintroduit pas de journaux d’activité fictifs comme preuves de traitement', () => {
    expect(adminTaskService.getActivityLogs().every(log => !log.id.startsWith('log-init-'))).toBe(true);
  });
});
