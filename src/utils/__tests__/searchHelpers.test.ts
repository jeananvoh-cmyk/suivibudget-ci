import { describe, it, expect } from 'vitest';
import { matchesSmartSearch, normalizeSearchText } from '../searchHelpers';

describe('Search Helpers Unit Tests', () => {
  it('normalizes accents and casing', () => {
    expect(normalizeSearchText('Éléphant')).toBe('elephant');
    expect(normalizeSearchText("M'Batto")).toBe('m batto');
  });

  it('prevents false positive sub-word matches (Agou vs Bagoué)', () => {
    const targetFields = ['Conseil Régional de la Bagoué', 'Boundiali'];
    // Searching for 'Agou' should NOT match 'Bagoué'
    expect(matchesSmartSearch(targetFields, 'Agou')).toBe(false);
    // Searching for 'Bagoue' should match
    expect(matchesSmartSearch(targetFields, 'Bagoué')).toBe(true);
    expect(matchesSmartSearch(targetFields, 'Boundiali')).toBe(true);
  });
});
