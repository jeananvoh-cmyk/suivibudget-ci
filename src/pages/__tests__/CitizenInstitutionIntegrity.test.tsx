import { describe, it, expect } from 'vitest';
import { 
  citizenTrack, 
  publicCitizenProof,
  buildCitizenObservationBadge,
  type PublicTrackingEvent 
} from '../../review/domain/citizen';
import { 
  institutionalRecord, 
  buildInstitutionalResponseBadge, 
  type InstitutionalStatement 
} from '../../review/domain/responses';
import type { ApecPublicNeed, CitizenProof } from '../../types';
import type { SourceDocument } from '../../review/domain/documents';
import type { DocumentedTarget } from '../../review/domain/projects';

describe('BLOC C — SUIVI CITOYEN ET RÉPONSES INSTITUTIONNELLES (LOTS 10 & 11)', () => {
  const verifiedDoc: SourceDocument = {
    id: 'rapport-caidp-2026',
    title: 'Rapport CAIDP et Journal Officiel 2026',
    publisher: 'Secrétariat Général du Gouvernement',
    officialUrl: 'https://caidp.ci/rapport-2026.pdf',
    fiscalYear: 2026,
    accessedAt: '2026-10-12',
    httpStatus: 200,
    sha256: 'c'.repeat(64),
    pageCount: 120,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
  };

  const sampleNeed: ApecPublicNeed = {
    need_id: 'need-san-pedro-eau',
    institution_id: 'commune-san-pedro',
    fiscal_year: 2026,
    title: 'Extension adduction en eau potable quartier Bardot',
    summary: 'Demande citoyenne d’adduction d’eau potable pour 400 familles.',
    source_reference: 'Délibération consultative citoyenne n° 14',
    source_date: '2026-02-15',
    provenance: 'CITIZEN_OBSERVATION',
    status: 'PUBLISHED',
    reviewed_at: '2026-02-18',
  };

  const trackingEvent: PublicTrackingEvent = {
    id: 'evt-001',
    needId: sampleNeed.need_id,
    sequence: 1,
    occurredAt: '2026-02-20',
    kind: 'SUBMITTED',
    publicSummary: 'Besoin consigné et vérifié par les sentinelles locales',
    publicationStatus: 'PUBLISHED',
    privacyReviewed: true,
  };

  it.each(['Kouassi Jean', 'kouassi.jean@gmail.com', '+225 07 01 02 03 04', 'Appeler au 0102030405', 'Sentinelle San-Pédro', ''])('rend anonyme une identité sans consentement public : %s', name => {
    const privateProof: CitizenProof = {
      id: 'proof-1', project_id: 'project-1', image_url: 'photo.jpg', created_at: '2026-10-12',
      citizen_status_claim: 'COMPLETED', comment: 'Observation publique', confirmations_count: 0,
      verification_status: 'APPROVED', citizen_name: name, user_name: name, citizen_whatsapp: '+2250102030405',
      moderator_notes: 'Instruction privée', tracking_code: 'private-tracking', geo_latitude: 5.123, geo_longitude: -4.123,
    };
    const publicProof = publicCitizenProof(privateProof)!;
    expect(publicProof.citizen_name).toBe('Sentinelle citoyenne');
    expect(publicProof.user_name).toBe('Sentinelle citoyenne');
    for (const key of ['citizen_whatsapp', 'tracking_code', 'moderator_notes', 'geo_latitude', 'geo_longitude']) {
      expect(publicProof).not.toHaveProperty(key);
    }
    expect(privateProof.citizen_name).toBe(name);
    expect(privateProof.citizen_whatsapp).toBe('+2250102030405');
    expect(publicProof).toMatchObject({ id: 'proof-1', comment: 'Observation publique', created_at: '2026-10-12', citizen_status_claim: 'COMPLETED' });
    expect(JSON.stringify(publicProof)).not.toContain('certifiée');
    expect(publicCitizenProof({ ...privateProof, verification_status: 'PENDING' })).toBeNull();
    expect(publicCitizenProof({ ...privateProof, verification_status: 'REJECTED' })).toBeNull();
  });

  it('qualifie explicitement la provenance citoyenne sans prétendre à une validation officielle (Principe 7)', () => {
    const badge = buildCitizenObservationBadge();
    expect(badge.provenance).toBe('CITIZEN_OBSERVATION');
    expect(badge.disclaimer).toContain('ne constitue pas une validation administrative');
  });

  it('garantit la neutralité : la participation n’est pas de la représentativité et un suivi n’est pas une résolution (Principe 5 & Lot 10)', () => {
    const projection = citizenTrack(sampleNeed, null, [trackingEvent], [verifiedDoc]);
    expect(projection).not.toBeNull();
    expect(projection?.provenance).toBe('CITIZEN_OBSERVATION');
    expect(projection?.representativeness).toBeNull();
    expect(projection?.resolution).toBe('UNKNOWN');
    expect(projection?.events).toHaveLength(1);
    expect(projection?.events[0].summary).toBe('Besoin consigné et vérifié par les sentinelles locales');
  });

  it('exclut rigoureusement tout événement non relu ou dont la publication est retirée', () => {
    const unreviewedEvent: PublicTrackingEvent = {
      ...trackingEvent,
      id: 'evt-unreviewed',
      privacyReviewed: false,
    };
    const withdrawnEvent: PublicTrackingEvent = {
      ...trackingEvent,
      id: 'evt-withdrawn',
      publicationStatus: 'WITHDRAWN',
    };

    const projection = citizenTrack(sampleNeed, null, [unreviewedEvent, withdrawnEvent], [verifiedDoc]);
    expect(projection?.events).toHaveLength(0);
  });

  it('intègre les réponses institutionnelles sans écraser les constats et sans validation automatique (Principe 8 & Lot 11)', () => {
    const target: DocumentedTarget = {
      id: 'target-projet-bardot',
      kind: 'PROJECT',
      institutionId: 'commune-san-pedro',
      sectionCode: null,
      fiscalYear: 2026,
      evidence: {
        documentId: verifiedDoc.id,
        fiscalYear: 2026,
        page: 12,
        reference: null,
        verification: 'VERIFIED',
      },
    };

    const instStatement: InstitutionalStatement = {
      id: 'stmt-001',
      targetId: target.id,
      institutionId: target.institutionId,
      fiscalYear: 2026,
      kind: 'INSTITUTION_RESPONSE',
      publicText: 'La mairie confirme le démarrage des études techniques pour l’extension.',
      publicationStatus: 'PUBLISHED',
      privacyReviewed: true,
      evidence: {
        documentId: verifiedDoc.id,
        fiscalYear: 2026,
        page: 14,
        reference: 'COURRIER-MAIRIE-2026-88',
        verification: 'VERIFIED',
      },
    };

    const record = institutionalRecord(target, [instStatement], [verifiedDoc]);
    expect(record.status).toBe('AVAILABLE');
    expect(record.responses).toHaveLength(1);
    expect(record.responses[0].provenance).toBe('INSTITUTION_RESPONSE');
    // Le droit de réponse institutionnel n'est jamais assimilé à une validation citoyenne indépendante
    expect(record.independentVerification).toBe('UNKNOWN');

    const badge = buildInstitutionalResponseBadge('INSTITUTION_RESPONSE');
    expect(badge.label).toContain('Droit de réponse');
    expect(badge.disclaimer).toContain('ne constitue pas une vérification citoyenne indépendante');
  });
});
