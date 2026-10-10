import { describe, it, expect } from 'vitest';
import { assessObservation, lot5Blocked, isCalendarDate, type FinancialObservation } from '../domain/evidence';
import { executionRate, performanceGap, type PerformanceIndicator } from '../domain/execution';
import { resolveCitation, catalogProblems, safeOfficialUrl, type SourceDocument } from '../domain/documents';
import { collectivityDossier, type BudgetVersion } from '../domain/collectivities';
import { projectDossier, type DocumentedTarget, type ProjectBudgetLink } from '../domain/projects';
import { citizenTrack, type PublicTrackingEvent } from '../domain/citizen';
import { institutionalRecord, type InstitutionalStatement } from '../domain/responses';
import { compareHistory, openDataCsv, openDataJson } from '../domain/history';
import { buildReviewSnapshot } from '../domain/snapshot';
import type { ApecPublicNeed } from '../../types';

const validEvidence = (docId: string, page = 1, year = 2026) => ({
  documentId: docId,
  page,
  reference: null,
  fiscalYear: year,
  verification: 'VERIFIED' as const,
});

const mockDoc = (id: string, year = 2026, pageCount = 10): SourceDocument => ({
  id,
  title: `Document ${id}`,
  publisher: 'DGBF',
  officialUrl: `https://example.org/${id}.pdf`,
  fiscalYear: year,
  accessedAt: '2026-10-08',
  httpStatus: 200,
  sha256: 'c'.repeat(64),
  pageCount,
  verification: 'VERIFIED',
  visibility: 'PUBLIC',
  previousVersionId: null,
});

describe('LOT 5 — Reconciled Documentary Engine & Invariant Verification', () => {
  const doc = mockDoc('doc-2026');

  describe('1. Suppression du blocage LOT5 codé en dur', () => {
    it.each([
      ['gov-017', '336'],
      ['gov-030', '444'],
      ['gov-034', '334'],
    ])('ne bloque plus arbitrairement %s (section %s) du seul fait de LOT5', (instId, section) => {
      expect(lot5Blocked(instId, section, 2026)).toBe(false);
      expect(lot5Blocked(instId, null, 2026)).toBe(false);
    });

    it.each([
      ['gov-017', '336'],
      ['gov-030', '444'],
      ['gov-034', '334'],
    ])('maintient %s en UNKNOWN en l’absence de preuve (pas AVAILABLE automatique)', (instId, section) => {
      const obs: FinancialObservation = {
        institutionId: instId,
        sectionCode: section,
        fiscalYear: 2026,
        scope: 'MINISTERIAL',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'PLANNED',
        basis: 'INITIAL_BUDGET',
        amount: 100_000_000,
        precision: 'EXACT',
        evidence: null,
      };
      const result = assessObservation(obs);
      expect(result.status).toBe('UNKNOWN');
      expect(result.value).toBeNull();
      expect(result.reasons).toContain('DOCUMENTARY_EVIDENCE_REQUIRED');
    });

    it.each([
      ['gov-017', '336', 39_806_735_298],
      ['gov-030', '444', 70_427_777_385],
      ['gov-034', '334', 182_301_855_312],
    ])('évalue %s comme AVAILABLE lorsque la preuve officielle vérifiée est fournie', (instId, section, amount) => {
      const obs: FinancialObservation = {
        institutionId: instId,
        sectionCode: section,
        fiscalYear: 2026,
        scope: 'MINISTERIAL',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'PLANNED',
        basis: 'INITIAL_BUDGET',
        amount,
        precision: 'EXACT',
        evidence: validEvidence(doc.id, 5),
      };
      const result = assessObservation(obs);
      expect(result.status).toBe('AVAILABLE');
      expect(result.value).toBe(amount);
      expect(result.reasons).toEqual([]);
    });
  });

  describe('2. Invariant UNKNOWN != 0 et préservation du vrai zéro documenté', () => {
    it('ne transforme jamais null, undefined ou NaN en zéro', () => {
      const baseObs: FinancialObservation = {
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        scope: 'LOCAL',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'PLANNED',
        basis: 'INITIAL_BUDGET',
        amount: null,
        precision: 'EXACT',
        evidence: validEvidence(doc.id),
      };
      expect(assessObservation(baseObs).value).toBeNull();
      expect(assessObservation({ ...baseObs, amount: undefined as unknown as null }).value).toBeNull();
      expect(assessObservation({ ...baseObs, amount: NaN }).value).toBeNull();
    });

    it('préserve un vrai zéro documenté', () => {
      const zeroObs: FinancialObservation = {
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        scope: 'LOCAL',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'PLANNED',
        basis: 'INITIAL_BUDGET',
        amount: 0,
        precision: 'EXACT',
        evidence: validEvidence(doc.id),
      };
      const evaluated = assessObservation(zeroObs);
      expect(evaluated.status).toBe('AVAILABLE');
      expect(evaluated.value).toBe(0);
    });
  });

  describe('3. Zéro dénominateur et sécurité arithmétique', () => {
    it('renvoie null et non 0% ou infini en cas de dénominateur nul', () => {
      const plannedZero: FinancialObservation = {
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        scope: 'LOCAL',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'PLANNED',
        basis: 'FINAL_CREDITS',
        amount: 0,
        precision: 'EXACT',
        evidence: validEvidence(doc.id),
      };
      const executed: FinancialObservation = {
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        scope: 'LOCAL',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'PAID',
        basis: 'EXECUTION',
        amount: 50,
        precision: 'EXACT',
        evidence: validEvidence(doc.id),
      };
      expect(executionRate(plannedZero, executed).value).toBeNull();
    });
  });

  describe('4. Périmètres incompatibles et NOT_COMPARABLE', () => {
    it('déclare NOT_COMPARABLE lorsque les périmètres temporels ou institutionnels divergent', () => {
      const obsA: FinancialObservation = {
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        scope: 'SCOPE_A',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'PLANNED',
        basis: 'FINAL_CREDITS',
        amount: 100,
        precision: 'EXACT',
        evidence: validEvidence(doc.id),
      };
      const obsB: FinancialObservation = {
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        scope: 'SCOPE_B',
        periodEnd: '2026-12-31',
        currency: 'XOF',
        measure: 'PAID',
        basis: 'EXECUTION',
        amount: 50,
        precision: 'EXACT',
        evidence: validEvidence(doc.id),
      };
      const rate = executionRate(obsA, obsB);
      expect(rate.status).toBe('NOT_COMPARABLE');
      expect(rate.value).toBeNull();
      expect(rate.reasons).toContain('SCOPE_OR_MEASURE_MISMATCH');
    });

    it('rejette les dates de calendrier impossibles', () => {
      expect(isCalendarDate('2026-02-30')).toBe(false);
      expect(isCalendarDate('2026-13-01')).toBe(false);
      expect(isCalendarDate('2026-00-10')).toBe(false);
      expect(isCalendarDate('2026-04-31')).toBe(false);
      expect(isCalendarDate('2026-12-31')).toBe(true);
    });
  });

  describe('5. Validité des citations et documents privés', () => {
    it('résout correctement une citation valide', () => {
      const citation = resolveCitation(validEvidence(doc.id, 4), [doc]);
      expect(citation?.url).toBe('https://example.org/doc-2026.pdf#page=4');
    });

    it('refuse une citation pointant vers une page hors limites', () => {
      expect(resolveCitation(validEvidence(doc.id, 999), [doc])).toBeNull();
      expect(resolveCitation(validEvidence(doc.id, 0), [doc])).toBeNull();
      expect(resolveCitation(validEvidence(doc.id, -1), [doc])).toBeNull();
    });

    it('ne publie jamais d’URL pour un document privé ou non vérifié', () => {
      const privateDoc = { ...doc, visibility: 'PRIVATE' as const };
      const unverifiedDoc = { ...doc, verification: 'TO_VERIFY' as const };
      expect(resolveCitation(validEvidence(doc.id, 1), [privateDoc])).toBeNull();
      expect(resolveCitation(validEvidence(doc.id, 1), [unverifiedDoc])).toBeNull();
    });

    it.each([
      'javascript:evil()',
      'data:text/html,test',
      'ftp://example.org',
      'http://insecure.org',
      'https://user:pass@example.org',
    ])('rejette les URL non sûres : %s', unsafeUrl => {
      expect(safeOfficialUrl(unsafeUrl)).toBeNull();
    });
  });

  describe('6. Détection de doublons et cycles documentaires', () => {
    it('détecte les doublons d’identifiants de documents', () => {
      const problems = catalogProblems([doc, doc]);
      expect(problems).toContain('DUPLICATE_OR_EMPTY_DOCUMENT_ID');
    });

    it('détecte un cycle de versions documentaires', () => {
      const cyclicDoc = { ...doc, previousVersionId: doc.id };
      const problems = catalogProblems([cyclicDoc]);
      expect(problems).toContain('VERSION_CYCLE');
    });
  });

  describe('7. Protection contre l’injection CSV / Tableurs', () => {
    it('neutralise les caractères préfixes de formules dans openDataCsv', () => {
      const obsWithFormulas: FinancialObservation[] = [
        {
          institutionId: 'inst-1',
          sectionCode: null,
          fiscalYear: 2026,
          scope: '=SUM(A1:A10)',
          periodEnd: '2026-12-31',
          measure: 'PLANNED',
          basis: 'INITIAL_BUDGET',
          currency: 'XOF',
          amount: 100,
          precision: 'EXACT',
          evidence: validEvidence(doc.id),
        },
        {
          institutionId: 'inst-2',
          sectionCode: null,
          fiscalYear: 2026,
          scope: '@CMD',
          periodEnd: '2026-12-31',
          measure: 'PLANNED',
          basis: 'INITIAL_BUDGET',
          currency: 'XOF',
          amount: 200,
          precision: 'EXACT',
          evidence: validEvidence(doc.id),
        },
      ];
      const csv = openDataCsv(obsWithFormulas, [doc]);
      expect(csv).toContain('"\'=SUM(A1:A10)"');
      expect(csv).toContain('"\'@CMD"');
      expect(csv).not.toMatch(/^=SUM/m);
      expect(csv).not.toMatch(/^@CMD/m);
    });
  });

  describe('8. Projets sans preuve et séparation Ligne Budgétaire != Projet', () => {
    it('refuse la création d’un projet depuis une simple ligne budgétaire', () => {
      const targetFromBudget: DocumentedTarget = {
        id: 'fake-proj',
        kind: 'BUDGET',
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        evidence: validEvidence(doc.id),
      };
      const result = projectDossier(targetFromBudget, [], [doc]);
      expect(result.status).toBe('BLOCKED');
      expect(result.linkedBudgets).toEqual([]);
    });

    it('maintient l’état physique à UNKNOWN en l’absence de constat vérifié', () => {
      const realTarget: DocumentedTarget = {
        id: 'real-proj',
        kind: 'PROJECT',
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        evidence: validEvidence(doc.id),
      };
      const result = projectDossier(realTarget, [], [doc]);
      expect(result.physical.status).toBe('UNKNOWN');
      expect(result.physical.description).toBeNull();
    });
  });

  describe('9. Réponses institutionnelles vs Audit indépendant', () => {
    it('sépare formellement la réponse institutionnelle du contrôle officiel', () => {
      const target: DocumentedTarget = {
        id: 'proj-1',
        kind: 'PROJECT',
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        evidence: validEvidence(doc.id),
      };
      const institutionReply: InstitutionalStatement = {
        id: 'reply-1',
        targetId: target.id,
        institutionId: target.institutionId,
        fiscalYear: 2026,
        kind: 'INSTITUTION_RESPONSE',
        publicText: 'Travaux terminés selon la mairie',
        publicationStatus: 'PUBLISHED',
        privacyReviewed: true,
        evidence: validEvidence(doc.id),
      };
      const officialAudit: InstitutionalStatement = {
        id: 'audit-1',
        targetId: target.id,
        institutionId: target.institutionId,
        fiscalYear: 2026,
        kind: 'OFFICIAL_AUDIT',
        publicText: 'Rapport officiel IGF constatant 60% d’exécution',
        publicationStatus: 'PUBLISHED',
        privacyReviewed: true,
        evidence: validEvidence(doc.id),
      };

      const record = institutionalRecord(target, [institutionReply, officialAudit], [doc]);
      expect(record.responses).toHaveLength(1);
      expect(record.responses[0].provenance).toBe('INSTITUTION_RESPONSE');
      expect(record.audits).toHaveLength(1);
      expect(record.audits[0].provenance).toBe('OFFICIAL_SOURCE');
      expect(record.independentVerification).toBe('UNKNOWN');
    });
  });

  describe('10. Suivi citoyen et protection de la vie privée', () => {
    it('maintient la distinction entre observation citoyenne et représentativité globale', () => {
      const need: ApecPublicNeed = {
        need_id: 'need-001',
        institution_id: 'inst-test',
        fiscal_year: 2026,
        title: 'Réhabilitation dispensaire',
        summary: 'Demande citoyenne locale',
        source_reference: 'Comité de quartier',
        source_date: '2026-03-01',
        provenance: 'CITIZEN_OBSERVATION',
        status: 'PUBLISHED',
        reviewed_at: '2026-03-02',
      };
      const tracking = citizenTrack(need, null, [], []);
      expect(tracking).not.toBeNull();
      expect(tracking?.provenance).toBe('CITIZEN_OBSERVATION');
      expect(tracking?.representativeness).toBeNull();
      expect(tracking?.resolution).toBe('UNKNOWN');
    });

    it('rejette les dates invalides pour les besoins citoyens', () => {
      const needBadDate: ApecPublicNeed = {
        need_id: 'need-002',
        institution_id: 'inst-test',
        fiscal_year: 2026,
        title: 'Test',
        summary: 'Test',
        source_reference: 'Ref',
        source_date: '2026-02-30', // impossible date
        provenance: 'CITIZEN_OBSERVATION',
        status: 'PUBLISHED',
        reviewed_at: '2026-03-01',
      };
      expect(citizenTrack(needBadDate, null, [], [])).toBeNull();
    });
  });

  describe('11. Comparaisons interannuelles et preuve d’équivalence', () => {
    it('impose une preuve d’équivalence pour la comparabilité interannuelle', () => {
      const doc2025 = mockDoc('doc-2025', 2025);
      const obs2025: FinancialObservation = {
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2025,
        scope: 'SAME_SCOPE',
        periodEnd: '2025-12-31',
        measure: 'PLANNED',
        basis: 'INITIAL_BUDGET',
        currency: 'XOF',
        amount: 100,
        precision: 'EXACT',
        evidence: validEvidence(doc2025.id, 1, 2025),
      };
      const obs2026: FinancialObservation = {
        institutionId: 'inst-test',
        sectionCode: null,
        fiscalYear: 2026,
        scope: 'SAME_SCOPE',
        periodEnd: '2026-12-31',
        measure: 'PLANNED',
        basis: 'INITIAL_BUDGET',
        currency: 'XOF',
        amount: 120,
        precision: 'EXACT',
        evidence: validEvidence(doc.id, 1, 2026),
      };

      // Sans preuve d'équivalence : NOT_COMPARABLE
      const noProof = compareHistory(obs2025, obs2026, null, [doc2025, doc]);
      expect(noProof.status).toBe('NOT_COMPARABLE');
      expect(noProof.reasons).toContain('DOCUMENTED_SCOPE_EQUIVALENCE_REQUIRED');

      // Avec preuve d'équivalence : calcul nominal et taux
      const withProof = compareHistory(obs2025, obs2026, validEvidence(doc.id, 1, 2026), [doc2025, doc]);
      expect(withProof.status).toBe('AVAILABLE');
      expect(withProof.nominalDelta).toBe(20);
      expect(withProof.value).toBe(20);
    });
  });
});
