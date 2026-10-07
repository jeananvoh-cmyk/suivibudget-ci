import { describe, expect, it } from 'vitest';
import type { ApecPublicNeed } from '../../types';
import { citizenTrack, type PublicTrackingEvent } from '../domain/citizen';
const need: ApecPublicNeed = { need_id: 'test-only', institution_id: 'test-institution', fiscal_year: 2026,
  title: 'Test only', summary: 'Public test summary', source_reference: 'test source', source_date: '2026-01-01',
  provenance: 'CITIZEN_OBSERVATION', status: 'PUBLISHED', reviewed_at: '2026-01-02' };
const event: PublicTrackingEvent = { id: 'test-event', needId: need.need_id, sequence: 1, occurredAt: '2026-01-03',
  kind: 'SUBMITTED', publicSummary: 'Test only', publicationStatus: 'PUBLISHED', privacyReviewed: true };
describe('LOT 10 — citizen tracking projections', () => {
  it('keeps participation distinct from representativeness and resolution', () => {
    expect(citizenTrack(need, null, [], [])).toMatchObject({ provenance: 'CITIZEN_OBSERVATION', representativeness: null, resolution: 'UNKNOWN', targetId: null });
  });
  it('omits private payload properties and unpublished events', () => {
    const result = citizenTrack({ ...need, email: 'private-test' } as ApecPublicNeed, null,
      [{ ...event, privacyReviewed: false }, { ...event, id: 'withdrawn', publicationStatus: 'WITHDRAWN' }], []);
    expect(JSON.stringify(result)).not.toContain('private-test');
    expect(result?.events).toEqual([]);
  });
  it('orders explicit sequences without mutating input', () => {
    const events = Object.freeze([{ ...event, id: 'second', sequence: 2 }, event]);
    expect(citizenTrack(need, null, events, [])?.events.map(e => e.sequence)).toEqual([1, 2]);
    expect(events[0].sequence).toBe(2);
  });
  it('blocks conflicting sequences instead of inventing a history', () => {
    expect(citizenTrack(need, null, [event, { ...event, id: 'collision' }], [])?.timelineStatus).toBe('BLOCKED');
  });
  it('keeps an incomplete ministry link blocked', () => {
    expect(citizenTrack({ ...need, institution_id: 'gov-017' }, { id: 'test-target', kind: 'BUDGET', institutionId: 'gov-017',
      sectionCode: '336', fiscalYear: 2026, evidence: null }, [], [])?.linkStatus).toBe('BLOCKED');
  });
});
