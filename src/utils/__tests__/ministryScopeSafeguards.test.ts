import { describe, expect, it } from 'vitest';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { SCOPE_EXCEPTIONS } from '../../data/ministryScopeExceptions';

describe('2026 ministerial portfolio documentary safeguards', () => {
  const officials = new Map(GOVERNMENT_OFFICIALS.map(o => [o.id, o]));

  it('documents exactly the four composite portfolios and the delegated portfolio without an autonomous section', () => {
    expect(Object.keys(SCOPE_EXCEPTIONS).sort()).toEqual([
      'gov-007', 'gov-010', 'gov-023', 'gov-024', 'gov-035',
    ]);
    for (const [id, notice] of Object.entries(SCOPE_EXCEPTIONS)) {
      expect(officials.has(id)).toBe(true);
      expect(notice.length).toBeGreaterThan(70);
    }
  });

  it('preserves and flags the duplicated agriculture value rather than adding it twice', () => {
    const agriculture = officials.get('gov-009');
    const delegate = officials.get('gov-035');
    expect(agriculture).toBeDefined();
    expect(delegate).toBeDefined();
    expect(delegate?.budget_fcfa).toBe(agriculture?.budget_fcfa);
    expect(SCOPE_EXCEPTIONS['gov-035']).toContain('ne doit pas être compté deux fois');
  });

  it('does not silently sum candidate sections for transport or employment', () => {
    expect(officials.get('gov-010')?.budget_fcfa).toBe(307_769_615_082);
    expect(officials.get('gov-023')?.budget_fcfa).toBe(91_411_414_044);
    expect(SCOPE_EXCEPTIONS['gov-010']).toContain('440');
    expect(SCOPE_EXCEPTIONS['gov-023']).toContain('334');
  });
});
