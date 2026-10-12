import type { ApecPublicNeed, CitizenProof } from '../../types';
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

export function publicCitizenIdentity(): string {
  return 'Sentinelle citoyenne';
}

export function publicCitizenProof(proof: CitizenProof): CitizenProof | null {
  if (proof.verification_status !== 'APPROVED') return null;
  return {
    id: proof.id,
    project_id: proof.project_id,
    project_title: proof.project_title,
    commune_name: proof.commune_name,
    region_name: proof.region_name,
    citizen_name: publicCitizenIdentity(),
    user_name: publicCitizenIdentity(),
    image_url: proof.image_url,
    photo_url: proof.photo_url,
    secondary_image_url: proof.secondary_image_url,
    video_url: proof.video_url,
    media_type: proof.media_type,
    citizen_status_claim: proof.citizen_status_claim,
    comment: proof.comment,
    locality_details: proof.locality_details,
    verification_status: proof.verification_status,
    confirmations_count: proof.confirmations_count,
    is_demo: proof.is_demo,
    created_at: proof.created_at,
    signboard_status: proof.signboard_status,
  };
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
