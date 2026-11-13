import { describe, it, expect } from 'vitest';
import { DEFAULT_PROOF_IMAGE_MAX_BYTES, estimateDataUrlBytes } from '../security';

describe('Low-bandwidth 2G/3G field photo optimization', () => {
  it('enforces 300 KB low-bandwidth target constant and accurately estimates base64 payload bytes', () => {
    expect(DEFAULT_PROOF_IMAGE_MAX_BYTES).toBe(300 * 1024);
    const threeBytes = Buffer.from('ABC').toString('base64');
    expect(estimateDataUrlBytes(`data:image/jpeg;base64,${threeBytes}`)).toBe(3);
    const twoBytes = Buffer.from('AB').toString('base64');
    expect(estimateDataUrlBytes(`data:image/webp;base64,${twoBytes}`)).toBe(2);
  });
});
