import type { CaidpRequestEvent } from '../services/dataStore';

/**
 * Délai légal de communication des documents publics (Loi n° 2013-867 du 23 décembre 2013 - CAIDP).
 */
export const CAIDP_LEGAL_DEADLINE_DAYS = 30;

export type CaidpDeadlineState =
  | 'DOCUMENT_PUBLISHED'
  | 'DATE_UNKNOWN'
  | 'WITHIN_LEGAL_DELAY'
  | 'DUE_TODAY'
  | 'LEGAL_DELAY_EXPIRED';

export interface CaidpDeadlineStatus {
  requestId: string;
  entityName: string;
  requestedAtIso: string;
  dueDateIso: string;
  elapsedDays: number;
  daysRemaining: number;
  daysOverdue: number;
  state: CaidpDeadlineState;
  badgeLabel: string;
  citizenGuidance: string;
}

export interface InstitutionCaidpDeadlineSummary {
  totalRequests: number;
  overdueCount: number;
  activeWithinDelayCount: number;
  latestDeadline: CaidpDeadlineStatus | null;
}

const MS_PER_DAY = 86_400_000;

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function normalizeName(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Évalue le compte à rebours légal de 30 jours pour une demande CAIDP.
 * Une date absente ou invalide reste explicitement inconnue : elle ne doit jamais
 * être remplacée par la date du jour, ce qui créerait une échéance fictive.
 */
export function evaluateCaidpRequestDeadline(
  request: Pick<CaidpRequestEvent, 'id' | 'created_at' | 'entity_name'>,
  options: { now?: Date; hasPublishedDocument?: boolean } = {}
): CaidpDeadlineStatus {
  const now = options.now ?? new Date();
  const parsed = new Date(request.created_at);
  const hasValidRequestDate = Number.isFinite(parsed.getTime());

  if (!hasValidRequestDate && !options.hasPublishedDocument) {
    return {
      requestId: request.id,
      entityName: request.entity_name,
      requestedAtIso: '',
      dueDateIso: '',
      elapsedDays: 0,
      daysRemaining: 0,
      daysOverdue: 0,
      state: 'DATE_UNKNOWN',
      badgeLabel: 'Date de demande à confirmer',
      citizenGuidance: 'La date de réception ou d’envoi de la demande n’est pas exploitable : aucune échéance légale ne peut être calculée de façon fiable.',
    };
  }

  const requestedDate = hasValidRequestDate ? parsed : now;
  const dueDate = new Date(startOfUtcDay(requestedDate) + CAIDP_LEGAL_DEADLINE_DAYS * MS_PER_DAY);
  const elapsedDays = Math.max(
    0,
    Math.floor((startOfUtcDay(now) - startOfUtcDay(requestedDate)) / MS_PER_DAY)
  );
  const diffDays = CAIDP_LEGAL_DEADLINE_DAYS - elapsedDays;

  if (options.hasPublishedDocument) {
    return {
      requestId: request.id,
      entityName: request.entity_name,
      requestedAtIso: hasValidRequestDate ? requestedDate.toISOString() : '',
      dueDateIso: hasValidRequestDate ? dueDate.toISOString() : '',
      elapsedDays,
      daysRemaining: 0,
      daysOverdue: 0,
      state: 'DOCUMENT_PUBLISHED',
      badgeLabel: 'Document publié',
      citizenGuidance: 'Pièce officielle désormais consultable sur la plateforme.',
    };
  }

  if (diffDays > 0) {
    return {
      requestId: request.id,
      entityName: request.entity_name,
      requestedAtIso: requestedDate.toISOString(),
      dueDateIso: dueDate.toISOString(),
      elapsedDays,
      daysRemaining: diffDays,
      daysOverdue: 0,
      state: 'WITHIN_LEGAL_DELAY',
      badgeLabel: `J+${elapsedDays} / 30j (${diffDays}j restant${diffDays > 1 ? 's' : ''})`,
      citizenGuidance: `Délai légal CAIDP en cours : échéance le ${dueDate.toLocaleDateString('fr-FR')}.`,
    };
  }

  if (diffDays === 0) {
    return {
      requestId: request.id,
      entityName: request.entity_name,
      requestedAtIso: requestedDate.toISOString(),
      dueDateIso: dueDate.toISOString(),
      elapsedDays,
      daysRemaining: 0,
      daysOverdue: 0,
      state: 'DUE_TODAY',
      badgeLabel: 'Échéance légale ce jour (30j)',
      citizenGuidance: 'Le délai légal de 30 jours arrive à terme aujourd’hui (Loi n° 2013-867).',
    };
  }

  const daysOverdue = Math.abs(diffDays);
  return {
    requestId: request.id,
    entityName: request.entity_name,
    requestedAtIso: requestedDate.toISOString(),
    dueDateIso: dueDate.toISOString(),
    elapsedDays,
    daysRemaining: 0,
    daysOverdue,
    state: 'LEGAL_DELAY_EXPIRED',
    badgeLabel: `Délai expiré (+${daysOverdue}j)`,
    citizenGuidance: `Délai légal de 30 jours dépassé de ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''} : saisine possible de la CAIDP (caidp.ci).`,
  };
}

/**
 * Agrège l'état des délais CAIDP pour une institution donnée (Mairie, Conseil régional, Ministère...).
 */
export function summarizeInstitutionCaidpDeadlines(
  requests: readonly CaidpRequestEvent[],
  institutionName: string,
  options: {
    now?: Date;
    hasPublishedDocument?: boolean;
    hasPublishedDocumentForRequest?: (request: CaidpRequestEvent) => boolean;
  } = {}
): InstitutionCaidpDeadlineSummary {
  const target = normalizeName(institutionName);
  const matching = requests
    .filter((req) => {
      const entity = normalizeName(req.entity_name);
      const commune = normalizeName(req.commune || '');
      return (
        Boolean(target) &&
        (entity === target || entity.includes(target) || target.includes(entity) || commune === target)
      );
    })
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (matching.length === 0) {
    return {
      totalRequests: 0,
      overdueCount: 0,
      activeWithinDelayCount: 0,
      latestDeadline: null,
    };
  }

  const evaluated = matching.map((req) =>
    evaluateCaidpRequestDeadline(req, {
      now: options.now,
      hasPublishedDocument: options.hasPublishedDocumentForRequest
        ? options.hasPublishedDocumentForRequest(req)
        : options.hasPublishedDocument,
    })
  );
  return {
    totalRequests: evaluated.length,
    overdueCount: evaluated.filter((d) => d.state === 'LEGAL_DELAY_EXPIRED').length,
    activeWithinDelayCount: evaluated.filter(
      (d) => d.state === 'WITHIN_LEGAL_DELAY' || d.state === 'DUE_TODAY'
    ).length,
    latestDeadline: evaluated[0],
  };
}
