import type { ApecPublicNeed } from '../../types';
import { assessTarget, type DocumentedTarget } from './projects';
import type { SourceDocument } from './documents';
import { isCalendarDate } from './evidence';

/** A projection provided by a trusted moderator, not a raw ApecEvent or private contribution. */
export interface PublicTrackingEvent {
  id: string;
  needId: string;
  sequence: number;
  occurredAt: string;
  kind: 'SUBMITTED' | 'REVIEWED' | 'LINKED' | 'FOLLOW_UP';
  publicSummary: string;
  publicationStatus: 'PUBLISHED' | 'WITHDRAWN' | 'DRAFT';
  privacyReviewed: boolean;
}

export function citizenTrack(need: ApecPublicNeed, target: DocumentedTarget | null,
  events: readonly PublicTrackingEvent[], documents: readonly SourceDocument[]) {
  if (need.status !== 'PUBLISHED' || need.provenance !== 'CITIZEN_OBSERVATION' || !need.need_id.trim()
    || !isCalendarDate(need.source_date) || !isCalendarDate(need.reviewed_at)) return null;
  const published = events.filter(e => e.needId === need.need_id && e.publicationStatus === 'PUBLISHED' && e.privacyReviewed);
  const conflict = new Set(published.map(e => e.id)).size !== published.length
    || new Set(published.map(e => e.sequence)).size !== published.length
    || published.some(e => !e.id.trim() || !Number.isSafeInteger(e.sequence) || e.sequence < 1
      || !isCalendarDate(e.occurredAt) || !e.publicSummary.trim());
  const targetMatches = target?.institutionId === need.institution_id && target.fiscalYear === need.fiscal_year;
  const linkStatus = target && targetMatches ? assessTarget(target, documents) : target ? 'BLOCKED' : 'UNKNOWN';
  return {
    needId: need.need_id,
    title: need.title,
    summary: need.summary,
    provenance: 'CITIZEN_OBSERVATION' as const,
    linkStatus,
    targetId: linkStatus === 'AVAILABLE' ? target!.id : null,
    timelineStatus: conflict ? 'BLOCKED' : published.length ? 'AVAILABLE' : 'UNKNOWN',
    events: conflict ? [] : [...published].sort((a, b) => a.sequence - b.sequence).map(e => ({
      id: e.id, sequence: e.sequence, occurredAt: e.occurredAt, kind: e.kind, summary: e.publicSummary,
    })),
    // Participation is not representativeness, and a FOLLOW_UP is not evidence of resolution.
    representativeness: null,
    resolution: 'UNKNOWN' as const,
  };
}
