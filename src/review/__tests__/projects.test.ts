import { describe, it, expect } from 'vitest';
import { projectDossier, type DocumentedTarget, type ProjectBudgetLink } from '../domain/projects';
import type { SourceDocument } from '../domain/documents';
const evidence = { documentId: 'test-only', fiscalYear: 2026, page: 1, reference: null, verification: 'VERIFIED' as const };
const doc: SourceDocument = { id: 'test-only', title: 'Test', publisher: 'Test', officialUrl: 'https://example.org/test.pdf',
  fiscalYear: 2026, accessedAt: '2026-10-07', httpStatus: 200, sha256: 'a'.repeat(64), pageCount: 1,
  verification: 'VERIFIED', visibility: 'PUBLIC', previousVersionId: null };
const project: DocumentedTarget = { id: 'test-project', kind: 'PROJECT', institutionId: 'test-only', sectionCode: null, fiscalYear: 2026, evidence };
const link: ProjectBudgetLink = { projectId: project.id, budgetId: 'test-budget', institutionId: project.institutionId,
  fiscalYear: 2026, evidence, budget: { institutionId: project.institutionId, sectionCode: null, fiscalYear: 2026,
    scope: 'test-scope', periodEnd: '2026-12-31', currency: 'XOF', measure: 'PLANNED', basis: 'INITIAL_BUDGET',
    amount: 100, precision: 'EXACT', evidence } };
describe('LOT 9 — documented project relationships', () => {
  it('keeps physical completion unknown despite a documented budget', () => {
    const result = projectDossier(project, [link], [doc]);
    expect(result.physical.status).toBe('UNKNOWN');
    expect(result.linkedBudgets[0].amount).toBe(100);
    expect(result).not.toHaveProperty('total');
  });
  it('blocks duplicates and cross-institution links', () => {
    expect(projectDossier(project, [link, link], [doc]).status).toBe('BLOCKED');
    expect(projectDossier(project, [{ ...link, institutionId: 'other' }], [doc]).status).toBe('BLOCKED');
  });
  it('never creates a project from a budget line', () => {
    expect(projectDossier({ ...project, kind: 'BUDGET' }, [], [doc]).status).toBe('BLOCKED');
  });
  it('requires a source for a physical observation', () => {
    expect(projectDossier(project, [], [doc], { status: 'DOCUMENTED', description: 'test-only', evidence: null }).physical.description).toBeNull();
  });
  it('does not retain the resolved LOT 5 block and still rejects missing primary documents', () => {
    expect(projectDossier({ ...project, sectionCode: '336' }, [], [doc]).status).toBe('AVAILABLE');
    expect(projectDossier(project, [link], []).status).toBe('BLOCKED');
  });
});
