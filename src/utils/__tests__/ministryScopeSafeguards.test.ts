import { describe, expect, it } from 'vitest';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { SCOPE_EXCEPTIONS, MINISTRY_DOCUMENTARY_DISCREPANCIES } from '../../data/ministryScopeExceptions';

describe('2026 ministerial portfolio documentary safeguards', () => {
  const officials = new Map(GOVERNMENT_OFFICIALS.map(o => [o.id, o]));


  it('covers each of the 35 distinct 2026 portfolio identifiers without manufacturing a missing budget', () => {
    const ids = GOVERNMENT_OFFICIALS.map(o => o.id).filter(id => /^gov-\d{3}$/.test(id));
    expect(ids).toHaveLength(35);
    expect(new Set(ids).size).toBe(35);
    expect([...ids].sort()).toEqual(
      Array.from({ length: 35 }, (_, index) => `gov-${String(index + 1).padStart(3, '0')}`),
    );
    for (const official of GOVERNMENT_OFFICIALS.filter(o => ids.includes(o.id))) {
      // Unknown is not zero; this test validates shape, not documentary certification.
      if (official.budget_fcfa == null) continue;
      expect(Number.isSafeInteger(official.budget_fcfa)).toBe(true);
      expect(official.budget_fcfa).toBeGreaterThanOrEqual(0);
    }
  });

  it('documents exactly the four composite portfolios and the delegated portfolio without an autonomous section', () => {
    expect(Object.keys(SCOPE_EXCEPTIONS).sort()).toEqual([
      'gov-007', 'gov-010', 'gov-023', 'gov-024', 'gov-035',
    ]);
    for (const [id, notice] of Object.entries(SCOPE_EXCEPTIONS)) {
      expect(officials.has(id)).toBe(true);
      expect(notice.length).toBeGreaterThan(70);
    }
  });

  it('flags precisely the 15 unresolved numeric section differences for every ministry detail', () => {
    expect(Object.keys(MINISTRY_DOCUMENTARY_DISCREPANCIES).sort()).toEqual(["gov-001","gov-005","gov-006","gov-009","gov-011","gov-012","gov-013","gov-014","gov-018","gov-022","gov-025","gov-029","gov-031","gov-032","gov-034"]);
    for (const [id, section] of Object.entries(MINISTRY_DOCUMENTARY_DISCREPANCIES)) {
      expect(officials.has(id)).toBe(true);
      expect(section).toMatch(/^\d{3}$/);
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
