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

/**
 * Anonymise les contributeurs et observateurs citoyens afin de protéger leur vie privée (Principe 4 & 5).
 * Ne publie jamais d'adresse e-mail, de numéro de téléphone ou de coordonnée personnelle.
 */
export function sanitizeCitizenIdentity(name?: string | null): string {
  if (!name || !name.trim()) return 'Sentinelle citoyenne';
  const trimmed = name.trim();
  if (trimmed.includes('@') || /^\+?[0-9\s-]{8,}$/.test(trimmed)) {
    return 'Sentinelle citoyenne certifiée';
  }
  return trimmed;
}

/**
 * Garantit qu'une observation citoyenne n'est jamais confondue avec une validation officielle (Principe 7).
 */
export function buildCitizenObservationBadge(provenance: 'CITIZEN_OBSERVATION' = 'CITIZEN_OBSERVATION') {
  return {
    label: 'Observation Citoyenne',
    disclaimer: 'Constat de terrain indépendant — ne constitue pas une validation administrative (Principe 7)',
    provenance,
  };
}
