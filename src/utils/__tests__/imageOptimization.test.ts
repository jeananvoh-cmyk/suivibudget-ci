import { describe, it, expect } from 'vitest';
import { DEFAULT_PROOF_IMAGE_MAX_BYTES, estimateDataUrlBytes, assertDataUrlWithinBudget } from '../security';

describe('Low-bandwidth 2G/3G field photo optimization', () => {
  it('enforces 300 KB low-bandwidth target and accurately estimates base64 payload bytes', () => {
    expect(DEFAULT_PROOF_IMAGE_MAX_BYTES).toBe(300 * 1024);
    const threeBytes = Buffer.from('ABC').toString('base64');
    const threeByteUrl = `data:image/jpeg;base64,${threeBytes}`;
    expect(estimateDataUrlBytes(threeByteUrl)).toBe(3);
    expect(assertDataUrlWithinBudget(threeByteUrl, 3)).toBe(threeByteUrl);
    const twoBytes = Buffer.from('AB').toString('base64');
    expect(estimateDataUrlBytes(`data:image/webp;base64,${twoBytes}`)).toBe(2);
    const overBudget = `data:image/jpeg;base64,${Buffer.alloc(4).toString('base64')}`;
    expect(() => assertDataUrlWithinBudget(overBudget, 3)).toThrow(/limite est de/);
    expect(() => assertDataUrlWithinBudget(threeByteUrl, 0)).toThrow(/positif/);
  });
});
