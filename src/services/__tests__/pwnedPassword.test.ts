import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertPasswordNotPwned } from '../pwnedPassword';

const passwordHash = '5BAA6E4C9B93F3F0682250B6CF8331B7EE68FD8';

describe('Pwned Passwords k-anonymity guard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends only the five-character SHA-1 prefix and rejects a compromised password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      `${passwordHash.slice(5)}:3861493\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0`,
      { status: 200 }
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(assertPasswordNotPwned('password')).rejects.toThrow(/fuites connues/);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.pwnedpasswords.com/range/5BAA6');
    expect(options.headers).toEqual({ 'Add-Padding': 'true' });
    expect(JSON.stringify([url, options])).not.toContain('password');
    expect(options.cache).toBe('no-store');
    expect(options.referrerPolicy).toBe('no-referrer');
  });

  it('accepts a password absent from the returned range', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0',
      { status: 200 }
    )));
    await expect(assertPasswordNotPwned('a-new-unique-passphrase-2026')).resolves.toBeUndefined();
  });

  it('fails closed when the remote service is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    await expect(assertPasswordNotPwned('a-new-unique-passphrase-2026')).rejects.toThrow(/Impossible de vérifier/);
  });

  it('fails closed on non-success HTTP responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(assertPasswordNotPwned('a-new-unique-passphrase-2026')).rejects.toThrow(/indisponible/);
  });
});
