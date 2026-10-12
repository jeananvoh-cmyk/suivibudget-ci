import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectCard } from '../../components/ProjectCard';
import { ProjectDetailModal } from '../../components/ProjectDetailModal';
import { dataStore } from '../../services/dataStore';
import { 
  evaluateProjectIntegrity, 
  assertNotBudgetLineAsProject, 
  checkDuplicateProcurementLinks 
} from '../../review/domain/projects';
import type { SourceDocument } from '../../review/domain/documents';
import { findMatchingDgmpProcurement } from '../../utils/projectPassport';
import type { BudgetProject, CitizenProof } from '../../types';

describe('BLOC B — INTÉGRITÉ DES PROJETS ET MARCHÉS PUBLICS (LOT 9)', () => {
  it('une contribution APPROVED ne certifie jamais la réalisation physique dans les vues publiques', () => {
    const project: BudgetProject = { id: 'project-1', title: 'École test', commune_name: 'Abobo', region_name: 'Abidjan', category: 'Éducation', nature_expense: 'Investissements', budget_amount_fcfa: 1000, fiscal_year: 2026, current_status: 'IN_PROGRESS', progress_percentage: 0, created_at: '2026-10-12' };
    const proof: CitizenProof = { id: 'proof-1', project_id: project.id, citizen_name: 'Identité privée', citizen_status_claim: 'COMPLETED', verification_status: 'APPROVED', comment: 'Déclaration citoyenne', image_url: 'photo.jpg', confirmations_count: 0, created_at: '2026-10-12' };
    const getter = vi.spyOn(dataStore, 'getProofsForProject').mockReturnValue([proof]);
    try {
      const card = renderToStaticMarkup(<ProjectCard project={project} onSelect={() => {}} />);
      expect(card).toContain('contribution(s) citoyenne(s) publiée(s)');
      expect(card).not.toContain('constat(s) certifié(s)');
      const modal = renderToStaticMarkup(<ProjectDetailModal project={project} onClose={() => {}} onOpenSendProof={() => {}} onOpenShare={() => {}} onOpenDocRequest={() => {}} />);
      expect(modal).toContain('Réalisation physique non certifiée');
      expect(modal).toContain('Achèvement déclaré par un citoyen');
      expect(modal).not.toMatch(/Constaté sur le terrain|Terminé sur le terrain|Identité privée/);
      expect(proof.verification_status).toBe('APPROVED');
    } finally {
      getter.mockRestore();
    }
  });
  const verifiedDoc: SourceDocument = {
    id: 'lfi-2026-annexe-investissements',
    title: 'Loi de Finances 2026 — Annexe Investissements',
    publisher: 'Ministère du Budget',
    officialUrl: 'https://budget.gouv.ci/lfi-2026.pdf',
    fiscalYear: 2026,
    accessedAt: '2026-10-12',
    httpStatus: 200,
    sha256: 'c'.repeat(64),
    pageCount: 300,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
  };

  it('interdit formellement la création d’un projet depuis une simple ligne budgétaire (Principe P7 & Lot 9)', () => {
    expect(assertNotBudgetLineAsProject('BUDGET')).toBe(false);
    expect(assertNotBudgetLineAsProject('PROJECT')).toBe(true);

    const result = evaluateProjectIntegrity({
      projectId: 'proj-illegal-from-line',
      kind: 'BUDGET',
      institutionId: 'commune-abobo',
      fiscalYear: 2026,
      documents: [verifiedDoc],
    });

    // Un projet dérivé d'une ligne sans engagement ou marché est bloqué
    expect(result.status).toBe('BLOCKED');
  });

  it('détecte et interdit tout double comptage entre marchés d’une même opération', () => {
    const validLinks = [
      { budgetId: 'marche-lot-1' },
      { budgetId: 'marche-lot-2' },
    ];
    expect(checkDuplicateProcurementLinks(validLinks)).toBe(true);

    const duplicateLinks = [
      { budgetId: 'marche-lot-1' },
      { budgetId: 'marche-lot-1' },
    ];
    expect(checkDuplicateProcurementLinks(duplicateLinks)).toBe(false);

    const result = evaluateProjectIntegrity({
      projectId: 'proj-dup-test',
      kind: 'PROJECT',
      institutionId: 'commune-cocody',
      fiscalYear: 2026,
      budgetLinks: [
        {
          projectId: 'proj-dup-test',
          budgetId: 'dup-1',
          institutionId: 'commune-cocody',
          fiscalYear: 2026,
          evidence: {
            documentId: verifiedDoc.id,
            fiscalYear: 2026,
            page: 42,
            reference: 'DGMP-2026-001',
            verification: 'VERIFIED',
          },
          budget: {
            institutionId: 'commune-cocody',
            sectionCode: null,
            fiscalYear: 2026,
            scope: 'LOCAL',
            periodEnd: '2026-12-31',
            currency: 'XOF',
            measure: 'PLANNED',
            basis: 'INITIAL_BUDGET',
            amount: 50000000,
            precision: 'EXACT',
            evidence: {
              documentId: verifiedDoc.id,
              fiscalYear: 2026,
              page: 42,
              reference: 'DGMP-2026-001',
              verification: 'VERIFIED',
            },
          },
        },
        {
          projectId: 'proj-dup-test',
          budgetId: 'dup-1', // Doublon intentionnel
          institutionId: 'commune-cocody',
          fiscalYear: 2026,
          evidence: {
            documentId: verifiedDoc.id,
            fiscalYear: 2026,
            page: 42,
            reference: 'DGMP-2026-001',
            verification: 'VERIFIED',
          },
          budget: {
            institutionId: 'commune-cocody',
            sectionCode: null,
            fiscalYear: 2026,
            scope: 'LOCAL',
            periodEnd: '2026-12-31',
            currency: 'XOF',
            measure: 'PLANNED',
            basis: 'INITIAL_BUDGET',
            amount: 50000000,
            precision: 'EXACT',
            evidence: {
              documentId: verifiedDoc.id,
              fiscalYear: 2026,
              page: 42,
              reference: 'DGMP-2026-001',
              verification: 'VERIFIED',
            },
          },
        },
      ],
      documents: [verifiedDoc],
    });

    expect(result.status).toBe('BLOCKED');
  });

  it('maintient l’état physique à UNKNOWN en l’absence de constat terrain certifié, même avec un budget 100% alloué', () => {
    const result = evaluateProjectIntegrity({
      projectId: 'proj-physical-check',
      institutionId: 'region-marahoue',
      fiscalYear: 2026,
      evidenceRef: {
        documentId: verifiedDoc.id,
        fiscalYear: 2026,
        page: 15,
        reference: null,
        verification: 'VERIFIED',
      },
      documents: [verifiedDoc],
      physicalObservation: null, // Aucun constat physique certifié
    });

    expect(result.status).toBe('AVAILABLE');
    expect(result.physical.status).toBe('UNKNOWN');
    expect(result.physical.citation).toBeNull();
  });

  it('associe un constat physique réel uniquement lorsqu’une citation documentaire conforme existe', () => {
    const result = evaluateProjectIntegrity({
      projectId: 'proj-physical-verified',
      institutionId: 'region-marahoue',
      fiscalYear: 2026,
      evidenceRef: {
        documentId: verifiedDoc.id,
        fiscalYear: 2026,
        page: 15,
        reference: null,
        verification: 'VERIFIED',
      },
      documents: [verifiedDoc],
      physicalObservation: {
        status: 'DOCUMENTED',
        description: 'Chantier inspecté par les riverains : gros œuvre achevé',
        evidence: {
          documentId: verifiedDoc.id,
          fiscalYear: 2026,
          page: 15,
          reference: 'RAPPORT-TERRAIN-15',
          verification: 'VERIFIED',
        },
      },
    });

    expect(result.status).toBe('AVAILABLE');
    expect(result.physical.status).toBe('DOCUMENTED');
    expect(result.physical.description).toBe('Chantier inspecté par les riverains : gros œuvre achevé');
    expect(result.physical.citation).toBeDefined();
  });

  it('rapproche les projets avec les marchés DGMP sans inventer d’attribution en cas de donnée manquante', () => {
    const mockProjectWithoutProcurement: BudgetProject = {
      id: 'proj-test-no-proc',
      title: 'Construction d\'un marché de proximité',
      commune_name: 'San-Pédro',
      region_name: 'San-Pédro',
      category: 'Commerce',
      nature_expense: 'Investissements',
      budget_amount_fcfa: 120000000,
      fiscal_year: 2026,
      current_status: 'IN_PROGRESS',
      progress_percentage: 25,
      created_at: '2026-01-01',
    };

    const procurement = findMatchingDgmpProcurement(mockProjectWithoutProcurement);
    // En l'absence de correspondance certifiée, procurement doit être undefined
    expect(procurement).toBeUndefined();
  });
});
