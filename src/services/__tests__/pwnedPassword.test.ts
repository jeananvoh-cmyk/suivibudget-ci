import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertPasswordNotPwned, PwnedPasswordError } from '../pwnedPassword';

const passwordHash = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8';

describe('Pwned Passwords k-anonymity guard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends only the five-character SHA-1 prefix and rejects a compromised password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      `${passwordHash.slice(5)}:3861493\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0`,
      { status: 200 }
    ));
    vi.stubGlobal('fetch', fetchMock);

    const result = assertPasswordNotPwned('password');
    await expect(result).rejects.toBeInstanceOf(PwnedPasswordError);
    await expect(result).rejects.toThrow(/fuites connues/);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.pwnedpasswords.com/range/5BAA6');
    expect(options.headers).toEqual({ 'Add-Padding': 'true' });
    expect(options.body).toBeUndefined();
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

  it('allows https://api.pwnedpasswords.com in vercel.json CSP connect-src', () => {
    const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      headers?: Array<{ headers?: Array<{ key: string; value: string }> }>;
    };
    const cspHeader = vercelConfig.headers
      ?.flatMap(rule => rule.headers || [])
      .find(header => header.key === 'Content-Security-Policy');
    expect(cspHeader).toBeDefined();
    const connectSrc = cspHeader!.value
      .split(';')
      .map(directive => directive.trim())
      .find(directive => directive.startsWith('connect-src '));
    expect(connectSrc).toBeDefined();
    expect(connectSrc).toContain('https://api.pwnedpasswords.com');
  });
});
