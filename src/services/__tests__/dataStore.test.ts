import { beforeEach, describe, it, expect, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  project: { id: 'p1', title: 'Construction école', commune_name: 'Test', region_name: 'Test', category: 'EDUCATION', nature_expense: 'Investissements', budget_amount_fcfa: 100, fiscal_year: 2026, current_status: 'UNKNOWN', progress_percentage: 0 },
  rpc: vi.fn(), save: vi.fn(), batch: vi.fn(),
}));
vi.mock('../supabase', () => ({ isSupabaseConfigured: () => false, supabase: { rpc: fixture.rpc } }));
vi.mock('../backend', () => ({ saveContent: fixture.save, saveContentBatch: fixture.batch,
  requireBackend: vi.fn(), requireStaff: vi.fn(), ensureCitizenSession: async () => 'owner', readContent: vi.fn(), readProofs: vi.fn() }));
vi.mock('../../data/budgetData', () => ({ RAW_BUDGET_PROJECTS: [fixture.project], loadBudgetProjects: async () => {} }));
vi.mock('../../data/institutionsData', () => ({ INSTITUTIONS_DATA: [{ id: 'i1', type: 'MAIRIE' }] }));
vi.mock('../../data/initialArticles', () => ({ INITIAL_ARTICLES: [] }));
vi.mock('../../data/caidpRiData', () => ({ CAIDP_MASTER_DIRECTORY: [] }));
import { DataStore } from '../dataStore';
let store: DataStore;
beforeEach(async () => { vi.clearAllMocks(); store = new DataStore(); await store.ready; });
describe('Confirmed persistence and honest reporting', () => {
  it('keeps the existing project unchanged if a server write fails', async () => {
    fixture.save.mockRejectedValueOnce(new Error('Server refused'));
    await expect(store.updateProject('p1', { title: 'Changed' })).rejects.toThrow();
    expect(store.getProjectById('p1')?.title).toBe('Construction école');
  });
  it('only updates the shared view after acknowledgement', async () => {
    let resolve!: () => void;
    fixture.save.mockReturnValueOnce(new Promise<void>(r => { resolve = r; }));
    const pending = store.updateProject('p1', { title: 'Changed' });
    expect(store.getProjectById('p1')?.title).toBe('Construction école');
    resolve(); await pending;
    expect(store.getProjectById('p1')?.title).toBe('Changed');
  });
  it('rejects a failed submission rather than storing a pretend receipt', async () => {
    fixture.rpc.mockResolvedValueOnce({ data: null, error: new Error('Offline') });
    await expect(store.submitProof({ request_id: 'receipt', evidence_path: 'owner/receipt.jpg', project_id: 'p1', media_type: 'IMAGE', comment: 'Constat suffisamment long', citizen_status_claim: 'IN_PROGRESS' })).rejects.toThrow('Réception non confirmée');
    expect(store.getApprovedProofs()).toEqual([]);
  });
  it('rejects media from another citizen before making a request', async () => {
    await expect(store.submitProof({ request_id: 'receipt', evidence_path: 'another/receipt.jpg', project_id: 'p1', media_type: 'IMAGE', comment: 'Constat suffisamment long', citizen_status_claim: 'IN_PROGRESS' })).rejects.toThrow();
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it('does not count demonstrations and reports zero honestly', () => {
    (store as any).proofs = [{ verification_status: 'APPROVED', is_demo: true }];
    expect(store.getImpactStats().verifiedProofsCount).toBe(0);
    expect(store.getImpactStats().proofsVerificationRate).toBe(0);
    expect(store.getApprovedProofs()).toHaveLength(0);
  });
  it('rejects invalid CSV before any write', async () => {
    await expect(store.importFromCSV('title;commune_name;region_name;budget_amount_fcfa;fiscal_year;source\nÉcole;Test;Test;-1;2026;Document')).rejects.toThrow();
    expect(fixture.batch).not.toHaveBeenCalled();
  });
  it('updates a same-ID yearly import without tombstoning the same row first', async () => {
    fixture.batch.mockResolvedValueOnce(undefined);
    await store.importFromCSV('id;title;commune_name;region_name;budget_amount_fcfa;fiscal_year;source\np1;École corrigée;Test;Test;200;2026;Document', { mode:'REPLACE_YEAR' });
    const batch = fixture.batch.mock.calls[0][0];
    expect(batch).toHaveLength(1);
    expect(batch[0].deleted).toBeUndefined();
    expect(store.getProjectById('p1')?.budget_amount_fcfa).toBe(200);
  });
});
