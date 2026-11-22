import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSupabase = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  rpc: vi.fn(),
  from: vi.fn(),
  functionsInvoke: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../supabase', () => ({
  isSupabaseConfigured: mockSupabase.configured,
  supabase: {
    rpc: mockSupabase.rpc,
    from: mockSupabase.from,
    functions: { invoke: mockSupabase.functionsInvoke },
    auth: {
      getUser: mockSupabase.getUser,
      getSession: mockSupabase.getSession,
      signOut: mockSupabase.signOut,
    },
  },
}));

import { dataStore } from '../dataStore';

describe('dataStore refreshAdminEntities baseline visibility guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.configured.mockReturnValue(true);
    mockSupabase.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSupabase.signOut.mockResolvedValue({ error: null });
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
    mockSupabase.functionsInvoke.mockResolvedValue({ data: null, error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      const builder = {
        select: () => builder,
        order: () => builder,
        eq: () => builder,
        range: () => Promise.resolve({
          data: table === 'institutions'
            ? [
                { id: 'inst-public-remote', name: 'Commune Publique Distante', type: 'MAIRIE', region: 'Lagunes', district: 'Lagunes', revision: 1, publication_status: 'PUBLISHED', profile_metadata: {} },
                { id: 'inst-com-abobo', name: "Mairie d'Abobo", type: 'MAIRIE', region: 'Abidjan', district: "District Autonome d'Abidjan", leader_name: null, leader_title: null, leader_photo_url: null, political_party: null, website: null, revision: 1, publication_status: 'PUBLISHED', profile_metadata: {} },
              ]
            : [],
          error: null,
        }),
      };
      return builder;
    });

    dataStore.setAuthState({
      isAuthenticated: false,
      email: '',
      fullName: '',
      role: 'CITIZEN',
      expiresAt: 0,
    });
  });

  it('does not call admin_baseline_visibility when unauthenticated and still merges public published rows', async () => {
    await dataStore.refreshAdminEntities();

    const baselineRpcCalls = mockSupabase.rpc.mock.calls.filter(([name]) => name === 'admin_baseline_visibility');
    expect(baselineRpcCalls).toHaveLength(0);
    expect(dataStore.getInstitutions().some(i => i.id === 'inst-public-remote')).toBe(true);
    const abobo = dataStore.getInstitutions().find(i => i.id === 'inst-com-abobo');
    expect(abobo?.leader_name).toBe('KAMISSOKO KANDIA');
    expect(abobo?.leader_photo_url).toBeTruthy();
    expect(abobo?.political_party).toBe('RHDP');
    const agboville = dataStore.getInstitutions().find(i => i.id === 'inst-com-agboville');
    expect(agboville?.primitive_budget?.source_title).toBe('Ivoirexpress — Budget primitif 2026 (Mairie d’Agboville), 22 juin 2026');
    expect(agboville?.primitive_budget?.corroborating_sources?.[0]?.url).toBe('https://www.aip.ci/electionpresidentielle2025/article.php?id=379819');
  });

  it('does not call admin_baseline_visibility for authenticated CITIZEN users', async () => {
    dataStore.setAuthState({
      isAuthenticated: true,
      email: 'citoyen@example.test',
      fullName: 'Citoyen Test',
      role: 'CITIZEN',
    });

    await dataStore.refreshAdminEntities();

    const baselineRpcCalls = mockSupabase.rpc.mock.calls.filter(([name]) => name === 'admin_baseline_visibility');
    expect(baselineRpcCalls).toHaveLength(0);
  });

  it('calls admin_baseline_visibility for authenticated staff users', async () => {
    dataStore.setAuthState({
      isAuthenticated: true,
      email: 'admin@example.test',
      fullName: 'Admin Test',
      role: 'ADMIN',
    });

    await dataStore.refreshAdminEntities();

    const baselineRpcCalls = mockSupabase.rpc.mock.calls.filter(([name]) => name === 'admin_baseline_visibility');
    expect(baselineRpcCalls).toHaveLength(4);
  });
});
