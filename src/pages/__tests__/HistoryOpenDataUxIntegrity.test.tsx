import { describe, it, expect } from 'vitest';
import { 
  compareHistory, 
  openDataCsv, 
  openDataJson,
  auditedObservationsFromCatalog
} from '../../review/domain/history';
import type { FinancialObservation } from '../../review/domain/evidence';
import type { SourceDocument } from '../../review/domain/documents';
import { exportLocalBudgetsToCsv } from '../../data/localBudgetsReferential';
import type { LocalBudget } from '../../types/localBudget';

describe('BLOC D — HISTORIQUE, COMPARAISONS, OPEN DATA ET SÉCURITÉ CSV (LOTS 12, 13 & 14)', () => {
  const doc2025: SourceDocument = {
    id: 'lfi-2025',
    title: 'Loi de Finances 2025',
    publisher: 'Ministère du Budget',
    officialUrl: 'https://budget.gouv.ci/lfi-2025.pdf',
    fiscalYear: 2025,
    accessedAt: '2026-10-12',
    httpStatus: 200,
    sha256: 'd'.repeat(64),
    pageCount: 250,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
  };

  const doc2026: SourceDocument = {
    id: 'lfi-2026',
    title: 'Loi de Finances 2026',
    publisher: 'Ministère du Budget',
    officialUrl: 'https://budget.gouv.ci/lfi-2026.pdf',
    fiscalYear: 2026,
    accessedAt: '2026-10-12',
    httpStatus: 200,
    sha256: 'e'.repeat(64),
    pageCount: 300,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
  };

  const equivalenceDoc: SourceDocument = {
    id: 'rapport-cadrage-pluriannuel',
    title: 'Cadrage Pluriannuel DPPD',
    publisher: 'Direction Générale du Budget',
    officialUrl: 'https://budget.gouv.ci/dppd.pdf',
    fiscalYear: 2026,
    accessedAt: '2026-10-12',
    httpStatus: 200,
    sha256: 'f'.repeat(64),
    pageCount: 80,
    verification: 'VERIFIED',
    visibility: 'PUBLIC',
    previousVersionId: null,
  };

  const obs2025: FinancialObservation = {
    institutionId: 'inst-tiassale',
    sectionCode: null,
    fiscalYear: 2025,
    scope: 'MUNICIPAL_TOTAL',
    periodEnd: '2025-12-31',
    currency: 'XOF',
    measure: 'PLANNED',
    basis: 'INITIAL_BUDGET',
    amount: 100000000,
    precision: 'EXACT',
    evidence: {
      documentId: doc2025.id,
      fiscalYear: 2025,
      page: 10,
      reference: 'BP-2025',
      verification: 'VERIFIED',
    },
  };

  const obs2026: FinancialObservation = {
    institutionId: 'inst-tiassale',
    sectionCode: null,
    fiscalYear: 2026,
    scope: 'MUNICIPAL_TOTAL',
    periodEnd: '2026-12-31',
    currency: 'XOF',
    measure: 'PLANNED',
    basis: 'INITIAL_BUDGET',
    amount: 120000000,
    precision: 'EXACT',
    evidence: {
      documentId: doc2026.id,
      fiscalYear: 2026,
      page: 12,
      reference: 'BP-2026',
      verification: 'VERIFIED',
    },
  };

  it('exige une équivalence de périmètre documentée pour comparer deux exercices budgétaires (Principe 1 & Lot 12)', () => {
    // Sans document d'équivalence : rejet strict
    const noEquivalence = compareHistory(obs2025, obs2026, null, [doc2025, doc2026]);
    expect(noEquivalence.status).toBe('NOT_COMPARABLE');
    expect(noEquivalence.nominalDelta).toBeNull();

    // Avec document d'équivalence formel : comparaison nominale autorisée
    const validEquivalence = compareHistory(
      obs2025, 
      obs2026, 
      {
        documentId: equivalenceDoc.id,
        fiscalYear: 2026,
        page: 5,
        reference: 'TABLEAU-EQUIVALENCE',
        verification: 'VERIFIED',
      }, 
      [doc2025, doc2026, equivalenceDoc]
    );

    expect(validEquivalence.status).toBe('AVAILABLE');
    expect(validEquivalence.nominalDelta).toBe(20000000);
    expect(validEquivalence.value).toBe(20); // +20 %
    expect(validEquivalence.reasons).toContain('NOMINAL_COMPARISON_NO_INFLATION_ADJUSTMENT');
  });

  it('protège systématiquement les exports Open Data CSV contre les attaques par injection de formules (Lot 13)', () => {
    const maliciousObservation: FinancialObservation = {
      institutionId: '=cmd|’ /C calc’!A0', // Tentative d'injection Excel
      sectionCode: null,
      fiscalYear: 2026,
      scope: '+@SUM(1+1)',
      periodEnd: '2026-12-31',
      currency: 'XOF',
      measure: 'PLANNED',
      basis: 'INITIAL_BUDGET',
      amount: 50000,
      precision: 'EXACT',
      evidence: {
        documentId: doc2026.id,
        fiscalYear: 2026,
        page: 1,
        reference: null,
        verification: 'VERIFIED',
      },
    };

    const csvOutput = openDataCsv([maliciousObservation], [doc2026]);
    // Vérification que les caractères =, +, @ en tête de cellule sont préfixés par une apostrophe
    expect(csvOutput).toContain('"\'=cmd|’ /C calc’!A0"');
    expect(csvOutput).toContain('"\'+@SUM(1+1)"');
  });

  it('protège également les exports de budgets locaux communaux contre les injections de formules CSV', () => {
    const maliciousBudget: LocalBudget = {
      id: '=1+1',
      institution_id: 'commune-test',
      institution_name: '+DGI Formula',
      institution_type: 'COMMUNE',
      fiscal_year: 2026,
      budget_type: 'PRIMITIF_ADOPTE',
      version_number: 1,
      is_current_version: true,
      total_amount: 1000,
      operating_amount: 500,
      investment_amount: 500,
      operating_percentage: 50,
      investment_percentage: 50,
      amount_precision: 'EXACT',
      adoption_date: '2026-01-01',
      primary_source_label: '@SUM(A1:B1)',
      status: 'VERIFIED',
      verification_status: 'OFFICIAL_DOCUMENT',
      confidence_level: 'HIGH',
      sources: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    const csvOutput = exportLocalBudgetsToCsv([maliciousBudget]);
    expect(csvOutput).toContain('"\'=1+1"');
    expect(csvOutput).toContain('"\'+DGI Formula"');
    expect(csvOutput).toContain('"\'@SUM(A1:B1)"');
  });

  it('génère un export Open Data JSON conforme avec version de schéma et métadonnées complètes', () => {
    const jsonOutput = openDataJson([obs2026], [doc2026]);
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.schema_version).toBe(1);
    expect(parsed.unknown_encoding).toBe('null');
    expect(Array.isArray(parsed.records)).toBe(true);
    expect(parsed.records[0]).toHaveProperty('institution_id', 'inst-tiassale');
    expect(parsed.records[0]).toHaveProperty('source_sha256', doc2026.sha256);
  });

  it('fournit la liste complète des observations certifiées du catalogue officiel via auditedObservationsFromCatalog', () => {
    const observations = auditedObservationsFromCatalog();
    expect(observations.length).toBeGreaterThan(0);
    for (const obs of observations) {
      expect(obs.currency).toBe('XOF');
      expect(obs.amount).toBeGreaterThanOrEqual(0);
      expect(obs.evidence?.verification).toBe('VERIFIED');
    }
  });
});
