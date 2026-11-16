import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { BudgetProject, CitizenProof } from '../../types';
import { AdministrativeAccount } from '../../types/administrativeAccount';
import { generateProjectPassport } from '../projectPassport';
import {
  buildProjectOcid,
  mapProjectPassportToOcdsRelease,
  createOcdsReleasePackage,
  createFilteredOcdsReleasePackage,
} from '../ocdsMapper';
import { ProjectAccountabilityPassport } from '../../components/ProjectAccountabilityPassport';
import { Footer } from '../../components/Footer';
import { DocumentsPage } from '../../pages/DocumentsPage';

describe('OCDS v1.1 Mapper & Follow The Money Passport Alignment', () => {
  const sampleProject: BudgetProject = {
    id: 'proj-tiassale-ecole-01',
    institution_id: 'inst-com-tiassale',
    institution_name: 'Mairie de Tiassalé',
    commune_name: 'Tiassalé',
    region_name: 'Agnéby-Tiassa',
    category: 'Éducation',
    nature_expense: 'Investissements',
    title: 'Construction de 3 salles de classe EPP Tiassalé',
    budget_amount_fcfa: 45_000_000,
    fiscal_year: 2024,
    current_status: 'IN_PROGRESS',
    progress_percentage: 0,
    created_at: '2024-02-10T00:00:00Z',
    scope_level: 'LOCAL',
    source: 'Budget Primitif 2024 Tiassalé',
  };

  const sampleAccountWithDgmp: AdministrativeAccount = {
    id: 'ca-tiassale-2024',
    institution_id: 'inst-com-tiassale',
    institution_type: 'COMMUNE',
    institution_name: 'Mairie de Tiassalé',
    fiscal_year: 2024,
    status: 'PUBLISHED',
    operating_planned: null,
    operating_realized: null,
    investment_planned: 350_000_000,
    investment_realized: 120_000_000,
    total_planned: null,
    total_realized: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    source_document: 'CA 2024 Tiassalé',
    source_document_id: 'doc-ca-tias-2024',
    verification_status: 'OFFICIAL_DOCUMENT',
    operations: [
      {
        id: 'op-tias-ecole',
        ca_id: 'ca-tiassale-2024',
        institution_id: 'inst-com-tiassale',
        fiscal_year: 2024,
        operation_reference: 'OP-901',
        title: 'Construction de 3 salles de classe EPP Tiassalé',
        sector: 'Éducation',
        planned_amount: 45_000_000,
        executed_amount: 32_500_000,
        source_page: 14,
        linked_project_id: 'proj-tiassale-ecole-01',
        procurement_match: {
          id: 'proc-dgmp-tias-901',
          tender_number: 'AO-2024-TIAS-01',
          contract_number: 'M-2024-TIAS-09',
          procurement_object: 'Construction de 3 salles de classe EPP Tiassalé',
          contractor: 'BTP AGNÉBY SARL',
          award_amount: 43_800_000,
          award_date: '2024-05-15',
          procurement_method: 'OPEN_TENDER',
          bomp_reference: 'BOMP N° 1742',
          match_level: 'STRONG',
          source: 'DGMP Bulletin Officiel n°1742',
          source_url: 'https://sigomap.gouv.ci/avis/1742',
          verification_status: 'OFFICIAL_DOCUMENT',
        },
      },
    ],
  };

  it('maps a project with matched DGMP tender & CA operation into a compliant OCDS v1.1 release', () => {
    const approvedProof: CitizenProof = {
      id: 'proof-1',
      project_id: 'proj-tiassale-ecole-01',
      image_url: 'https://example.org/photo.jpg',
      citizen_status_claim: 'IN_PROGRESS',
      comment: 'Élévation des murs en cours',
      verification_status: 'APPROVED',
      confirmations_count: 3,
      created_at: '2024-09-01T12:00:00Z',
    };

    const passport = generateProjectPassport(sampleProject, [approvedProof], [sampleAccountWithDgmp]);
    const release = mapProjectPassportToOcdsRelease(sampleProject, passport);

    expect(release.ocid).toBe('ocds-ci-suivibudget-proj-tiassale-ecole-01');
    expect(release.language).toBe('fr');
    expect(release.tag).toEqual(expect.arrayContaining(['planning', 'tender', 'award', 'contract', 'implementation']));
    expect(release.planning.budget?.amount).toEqual({ amount: 45_000_000, currency: 'XOF' });
    expect(release.tender.status).toBe('complete');
    expect(release.tender.procurementMethod).toBe('open');
    expect(release.awards).toHaveLength(1);
    expect(release.awards?.[0].value).toEqual({ amount: 43_800_000, currency: 'XOF' });
    expect(release.awards?.[0].suppliers[0].name).toBe('BTP AGNÉBY SARL');
    expect(release.contracts?.[0].implementation?.transactions[0].value).toEqual({
      amount: 32_500_000,
      currency: 'XOF',
    });
    expect(release.x_suivibudget.procurementStatus).toBe('MATCHED_DGMP');
    expect(release.x_suivibudget.financialExecutionStatus).toBe('CA_REPORTED_EXECUTION');
    expect(release.x_suivibudget.physicalRealizationStatus).toBe('CITIZEN_OBSERVATION');
    expect(release.x_suivibudget.approvedCitizenProofsCount).toBe(1);
  });

  it('never fabricates awards, contracts, or zero amounts when budget is null and DGMP/CA are absent', () => {
    const blindProject: BudgetProject = {
      ...sampleProject,
      id: 'proj-sans-montant',
      budget_amount_fcfa: null,
      contractor_name: 'Entreprise déclarée uniquement',
      source: undefined,
    };

    const passport = generateProjectPassport(blindProject, [], []);
    const release = mapProjectPassportToOcdsRelease(blindProject, passport);

    expect(buildProjectOcid(blindProject)).toBe('ocds-ci-suivibudget-proj-sans-montant');
    expect(release.planning.budget?.amount).toBeUndefined();
    expect(release.tender.value).toBeUndefined();
    expect(release.tender.status).toBe('planned');
    expect(release.awards).toBeUndefined();
    expect(release.contracts).toBeUndefined();
    expect(release.x_suivibudget.budgetAmountStatus).toBe('UNKNOWN');
    expect(release.x_suivibudget.procurementStatus).toBe('DECLARED_UNVERIFIED');
    expect(release.x_suivibudget.financialExecutionStatus).toBe('NOT_FOUND_PUBLICLY');
    expect(release.x_suivibudget.physicalRealizationStatus).toBe('UNKNOWN');
  });

  it('builds a valid OCDS v1.1 release package and renders Follow The Money comparison in ProjectAccountabilityPassport', () => {
    const pkg = createOcdsReleasePackage([sampleProject], [], [sampleAccountWithDgmp]);
    expect(pkg.version).toBe('1.1');
    expect(pkg.publisher.name).toBe("SuiviBudget Côte d'Ivoire");
    expect(pkg.releases).toHaveLength(1);

    const html = renderToStaticMarkup(
      <ProjectAccountabilityPassport project={sampleProject} proofs={[]} />
    );
    expect(html).toContain('Chaîne financière comparée (OCDS v1.1)');
    expect(html).toContain('ocds-ci-suivibudget-proj-tiassale-ecole-01');
    expect(html).toContain('Exporter OCDS v1.1 (JSON)');
    expect(html).toContain('Copier le lien Passeport');
  });

  it('filters global OCDS v1.1 package by institutionId and fiscalYear with scoped package URI', () => {
    const otherProject: BudgetProject = {
      ...sampleProject,
      id: 'proj-cocody-route-02',
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      commune_name: 'Cocody',
      fiscal_year: 2025,
      title: 'Réhabilitation voirie Cocody',
    };

    const byInstitution = createFilteredOcdsReleasePackage(
      [sampleProject, otherProject],
      [],
      { institutionId: 'inst-com-cocody' }
    );
    expect(byInstitution.releases).toHaveLength(1);
    expect(byInstitution.releases[0].ocid).toBe('ocds-ci-suivibudget-proj-cocody-route-02');
    expect(byInstitution.uri).toContain('ocds-releases-inst-com-cocody.json');

    const byYear = createFilteredOcdsReleasePackage(
      [sampleProject, otherProject],
      [],
      { fiscalYear: 2024 },
      [sampleAccountWithDgmp]
    );
    expect(byYear.releases).toHaveLength(1);
    expect(byYear.releases[0].ocid).toBe('ocds-ci-suivibudget-proj-tiassale-ecole-01');
    expect(byYear.uri).toContain('ocds-releases-2024.json');

    const emptyCombined = createFilteredOcdsReleasePackage(
      [sampleProject, otherProject],
      [],
      { institutionId: 'inst-com-tiassale', fiscalYear: 2025 }
    );
    expect(emptyCombined.releases).toHaveLength(0);
    expect(emptyCombined.uri).toContain('ocds-releases-inst-com-tiassale-2025.json');
  });

  it('renders global OCDS v1.1 (.ocds.json) export buttons in Footer and DocumentsPage', () => {
    const footerHtml = renderToStaticMarkup(
      <Footer activeTab="home" onNavigateTab={() => {}} />
    );
    expect(footerHtml).toContain('Open Data (CSV &amp; OCDS)');
    expect(footerHtml).toContain('Paquet Global OCDS v1.1 (.ocds.json)');

    const docsHtml = renderToStaticMarkup(<DocumentsPage />);
    expect(docsHtml).toContain('OCDS v1.1 (.ocds.json)');
  });
});
