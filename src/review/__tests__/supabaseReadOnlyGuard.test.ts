import { describe, expect, it, vi } from 'vitest';
import { createGuardedFetch, guardedFetch } from '../../../scripts/verify-supabase-readonly.mjs';

describe('Supabase Read-Only Guard (verify-supabase-readonly.mjs)', () => {
  it('synchronously blocks POST requests before any network emission', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    expect(() => guardedFetch('https://example.supabase.co/rest/v1/institutions', { method: 'POST', body: '{}' }))
      .toThrowError('NON_READ_METHOD_BLOCKED:POST');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('synchronously blocks PATCH requests before any network emission', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    expect(() => guardedFetch('https://example.supabase.co/rest/v1/institutions', { method: 'PATCH', body: '{}' }))
      .toThrowError('NON_READ_METHOD_BLOCKED:PATCH');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('synchronously blocks DELETE requests before any network emission', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    expect(() => guardedFetch('https://example.supabase.co/rest/v1/institutions', { method: 'DELETE' }))
      .toThrowError('NON_READ_METHOD_BLOCKED:DELETE');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('synchronously blocks PUT requests before any network emission', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    expect(() => guardedFetch('https://example.supabase.co/rest/v1/institutions', { method: 'PUT', body: '{}' }))
      .toThrowError('NON_READ_METHOD_BLOCKED:PUT');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks lowercase mutation methods (case-insensitivity)', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    expect(() => guardedFetch('https://example.supabase.co/rest/v1/institutions', { method: 'post' }))
      .toThrowError('NON_READ_METHOD_BLOCKED:POST');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('extracts method from Request input when init.method is undefined', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const postRequest = new Request('https://example.supabase.co/rest/v1/institutions', { method: 'POST' });
    expect(() => guardedFetch(postRequest)).toThrowError('NON_READ_METHOD_BLOCKED:POST');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows GET requests through to fetch', async () => {
    const mockResponse = new Response('{"ok": true}', { status: 200 });
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    globalThis.fetch = fetchSpy;

    const res = await guardedFetch('https://example.supabase.co/rest/v1/institutions', { method: 'GET' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res).toBe(mockResponse);
  });

  it('allows HEAD requests through to fetch', async () => {
    const mockResponse = new Response(null, { status: 200 });
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    globalThis.fetch = fetchSpy;

    const res = await guardedFetch('https://example.supabase.co/rest/v1/institutions', { method: 'HEAD' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res).toBe(mockResponse);
  });

  it('custom allowed methods can be created with createGuardedFetch', () => {
    const getOnlyFetch = createGuardedFetch(['GET']);
    expect(() => getOnlyFetch('https://example.supabase.co', { method: 'HEAD' }))
      .toThrowError('NON_READ_METHOD_BLOCKED:HEAD');
  });
});
