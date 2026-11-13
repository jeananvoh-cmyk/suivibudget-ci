import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildCitizenSummaryData, CitizenOnePageSummary } from '../../components/CitizenOnePageSummary';
import { BudgetProject, Institution } from '../../types';
import { AdministrativeAccount } from '../../types/administrativeAccount';

describe('Citizen One-Page A4 Summary Sheet', () => {
  it('builds CitizenOnePageSummary without fabricating missing amounts and preserves SHA-256 provenance', () => {
    const undocumentedInstitution: Institution = {
      id: 'inst-com-undocumented-test',
      name: 'Mairie Test Sans Budget',
      type: 'MAIRIE',
      region: 'Région Test',
      district: 'District Test',
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
      total_budget_fcfa: null,
    };

    const projects: BudgetProject[] = [
      {
        id: 'p1',
        institution_id: 'inst-com-undocumented-test',
        title: 'Réhabilitation voirie Angré',
        category: 'Infrastructures',
        nature_expense: 'Investissements',
        region_name: 'Abidjan',
        commune_name: 'Cocody',
        budget_amount_fcfa: 120_000_000,
        fiscal_year: 2026,
        current_status: 'IN_PROGRESS',
        progress_percentage: 40,
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'p2',
        institution_id: 'inst-com-undocumented-test',
        title: 'Équipement centre de santé',
        category: 'Santé',
        nature_expense: 'Investissements',
        region_name: 'Abidjan',
        commune_name: 'Cocody',
        budget_amount_fcfa: null,
        fiscal_year: 2026,
        current_status: 'NOT_STARTED',
        progress_percentage: 0,
        created_at: '2026-02-01T00:00:00Z',
      },
    ];

    const latestCA: AdministrativeAccount = {
      id: 'ca-cocody-2024',
      institution_id: 'inst-com-undocumented-test',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie Test Sans Budget',
      fiscal_year: 2024,
      status: 'PUBLISHED',
      operating_planned: null,
      operating_realized: null,
      investment_planned: 3_900_630_000,
      investment_realized: 1_366_100_690,
      total_planned: null,
      total_realized: null,
      source_document: 'Compte Administratif Cocody 2024',
      source_document_sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: [],
      created_at: '2025-06-01T00:00:00Z',
      updated_at: '2025-06-01T00:00:00Z',
    };

    const data = buildCitizenSummaryData({
      institution: undocumentedInstitution,
      relatedProjects: projects,
      latestCA,
    });

    expect(data.budgetPresentation.reference.amount_fcfa).toBeNull();
    const santeSector = data.sectorBreakdown.find((s) => s.category === 'Santé');
    expect(santeSector?.knownAmountFcfa).toBeNull();
    expect(data.sha256Sources).toHaveLength(1);
    expect(data.sha256Sources[0].sha256).toBe(
      'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    );

    const html = renderToStaticMarkup(
      <CitizenOnePageSummary
        institution={undocumentedInstitution}
        relatedProjects={projects}
        latestCA={latestCA}
        riInfo={{ name: 'Konan Yao', functionTitle: 'RI CAIDP', email: 'ri@cocody.ci' }}
        onClose={() => {}}
      />
    );
    expect(html).toContain('id="citizen-one-page-summary"');
    expect(html).toContain('Budget Citoyen • 1 Page (A4)');
    expect(html).toContain('Mairie Test Sans Budget');
    expect(html).toContain('3 900 630 000 FCFA');
    expect(html).toContain('1 366 100 690 FCFA');
    expect(html).toContain('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    expect(html).toContain('Non documenté publiquement');
  });
});
