import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  generateProjectPassport,
  classifyProjectProvenance,
  resolveProjectDataProvenance,
  checkVerifiedNeedEvidence,
  checkVerifiedBudgetEvidence,
  checkVerifiedProcurementEvidence,
  checkVerifiedExecutionEvidence,
  checkVerifiedPhysicalEvidence,
  checkVerifiedAuditEvidence,
  STAGE_CERTIFICATION_SPECIFICATIONS,
  findMatchingCaOperationResult,
} from '../projectPassport';
import { ProjectAccountabilityPassport } from '../../components/ProjectAccountabilityPassport';
import { BudgetReportsView, computeBudgetReportStats } from '../../components/BudgetReportsView';
import { CommuneComparatorModal } from '../../components/CommuneComparatorModal';
import { ADMINISTRATIVE_ACCOUNTS_DATA } from '../../data/administrativeAccountsData';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';
import { computeSectorBreakdown, computePublicIndicators } from '../publicIndicators';
import { publicCitizenProof, publicCitizenIdentity } from '../../review/domain/citizen';
import type { BudgetProject, CitizenProof, Institution } from '../../types';
import type { AdministrativeAccount } from '../../types/administrativeAccount';

describe('Tests Adversariaux P0/P1 — Certification du Passeport de Redevabilité & Rapports Financiers', () => {
  beforeEach(() => {
    ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, Infinity, ...structuredClone(CA_PILOT_FIXTURES));
  });

  const baseProject: BudgetProject = {
    id: 'adv-proj-base',
    title: 'Construction d’un centre de santé intégré à Korhogo',
    institution_id: 'inst-com-korhogo',
    commune_name: 'Mairie de Korhogo',
    region_name: 'Poro',
    category: 'SANTE',
    nature_expense: 'Investissements',
    budget_amount_fcfa: 45_000_000,
    fiscal_year: 2026,
    current_status: 'IN_PROGRESS',
    progress_percentage: 50,
    created_at: '2026-01-15',
    scope_level: 'LOCAL',
    program_name: 'Programme Santé Communautaire 2026',
  };

  it('Cas 1 : Une déclaration administrative avec montant renseigné ne devient jamais officielle (valeurs, statuts, badges, provenances)', () => {
    const declaredProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-1',
      data_provenance: 'DECLARED_ADMIN',
      budget_amount_fcfa: 125_000_000,
      source: 'Délibération municipale déclarée',
      source_url: 'https://dgbf.gouv.ci/deliberation-125m.pdf',
      source_page: 14,
      financial_verification_status: 'VERIFIED',
    };

    expect(classifyProjectProvenance(declaredProject)).toBe('DECLARED_ADMIN');
    expect(resolveProjectDataProvenance(declaredProject)).toBe('UNVERIFIED_INPUT');
    expect(checkVerifiedBudgetEvidence(declaredProject)).toBe(false);

    const passport = generateProjectPassport(declaredProject, [], []);
    expect(passport.projectProvenanceClass).toBe('DECLARED_ADMIN');
    expect(passport.hasVerifiedBudgetEvidence).toBe(false);
    expect(passport.facts.budget_amount.value).toBe(125_000_000);
    expect(passport.facts.budget_amount.provenance).toBe('UNVERIFIED_INPUT');
    expect(passport.facts.budget_amount.provenanceClass).toBe('DECLARED_ADMIN');

    const needStage = passport.stages.find(s => s.id === 'NEED_PROGRAMMING')!;
    const budgetStage = passport.stages.find(s => s.id === 'BUDGET_VOTED')!;
    expect(needStage.status).toBe('PENDING_DOCUMENTATION');
    expect(needStage.status).not.toBe('VERIFIED_OFFICIAL');
    expect(budgetStage.status).toBe('PENDING_DOCUMENTATION');
    expect(budgetStage.status).not.toBe('VERIFIED_OFFICIAL');
    expect(budgetStage.statusLabel).toContain('Montant déclaré');

    const html = renderToStaticMarkup(
      <ProjectAccountabilityPassport project={declaredProject} defaultExpandedStageId="BUDGET_VOTED" />
    );
    expect(html).toContain('125');
    expect(html).toContain('Donnée Déclarative');
    expect(html).toContain('Information déclarative non corroborée');
    expect(html).not.toContain('Voté au Budget (source vérifiée)');
    expect(html).not.toContain('Programmation Budgétaire Officielle');
  });

  it('Cas 2 : Une source secondaire avec URL (AIP / portail municipal / presse) ne devient jamais une source primaire ni VERIFIED_OFFICIAL', () => {
    const secondaryAipProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-2-aip',
      data_provenance: 'OFFICIAL_SOURCE', // tentative de contournement par flag OFFICIAL_SOURCE
      budget_amount_fcfa: 80_000_000,
      source: 'Agence Ivoirienne de Presse (AIP) — Session du conseil municipal',
      source_url: 'https://www.aip.ci/2026/02/korhogo-budget-2026/',
      source_page: 1,
      financial_verification_status: 'VERIFIED',
    };

    const secondaryPortalProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-2-portal',
      data_provenance: 'OFFICIAL_PRIMARY_SOURCE',
      budget_amount_fcfa: 60_000_000,
      source: 'Portail Municipal de Bouaké — mairiedebouake.ci',
      source_url: 'https://mairiedebouake.ci/projets-2026',
      source_page: 2,
      financial_verification_status: 'VERIFIED',
    };

    for (const proj of [secondaryAipProject, secondaryPortalProject]) {
      expect(classifyProjectProvenance(proj)).toBe('OFFICIAL_SECONDARY_SOURCE');
      expect(resolveProjectDataProvenance(proj)).toBe('OFFICIAL_SECONDARY_SOURCE');
      expect(checkVerifiedBudgetEvidence(proj)).toBe(false);

      const passport = generateProjectPassport(proj, [], []);
      expect(passport.projectProvenanceClass).toBe('OFFICIAL_SECONDARY_SOURCE');
      expect(passport.hasVerifiedBudgetEvidence).toBe(false);
      expect(passport.facts.budget_amount.provenance).toBe('OFFICIAL_SECONDARY_SOURCE');
      expect(passport.facts.budget_amount.provenanceClass).toBe('OFFICIAL_SECONDARY_SOURCE');

      for (const stage of passport.stages) {
        expect(stage.status).not.toBe('VERIFIED_OFFICIAL');
      }

      const html = renderToStaticMarkup(
        <ProjectAccountabilityPassport project={proj} defaultExpandedStageId="BUDGET_VOTED" />
      );
      expect(html).toContain('Source Secondaire');
      expect(html).toContain('Consulter la source référencée');
      expect(html).not.toContain('Consulter la source officielle');
    }
  });

  it('Cas 3 : Une extraction automatisée avec numéro de page ne devient jamais une preuve officielle', () => {
    const automatedProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-3',
      data_provenance: 'AUTOMATED_EXTRACTION',
      budget_amount_fcfa: 95_000_000,
      source: 'Budget Citoyen 2026 / Annexe 4 LFI 2026',
      source_url: 'https://dgbf.gouv.ci/wp-content/uploads/2026/01/Annexe-4-LFI-2026.pdf',
      source_page: 42,
      financial_verification_status: 'VERIFIED', // même si marqué VERIFIED sur une extraction automatisée
    };

    expect(classifyProjectProvenance(automatedProject)).toBe('AUTOMATED_EXTRACTION');
    expect(resolveProjectDataProvenance(automatedProject)).toBe('AUTOMATED_EXTRACTION');
    expect(checkVerifiedBudgetEvidence(automatedProject)).toBe(false);

    const passport = generateProjectPassport(automatedProject, [], []);
    expect(passport.hasVerifiedBudgetEvidence).toBe(false);
    expect(passport.facts.budget_amount.provenance).toBe('AUTOMATED_EXTRACTION');
    expect(passport.stages.find(s => s.id === 'NEED_PROGRAMMING')?.status).toBe('PENDING_DOCUMENTATION');
    expect(passport.stages.find(s => s.id === 'BUDGET_VOTED')?.status).toBe('PENDING_DOCUMENTATION');

    const html = renderToStaticMarkup(
      <ProjectAccountabilityPassport project={automatedProject} defaultExpandedStageId="BUDGET_VOTED" />
    );
    expect(html).toContain('Extraction Automatisée');
    expect(html).not.toContain('Voté au Budget (source vérifiée)');
  });

  it('Cas 4 : Une source officielle sans document identifiable ne permet aucune certification', () => {
    const noDocTitleProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-4a',
      data_provenance: 'OFFICIAL_SOURCE',
      budget_amount_fcfa: 55_000_000,
      source: 'Source officielle', // placeholder générique non identifiable
      source_url: 'https://dgbf.gouv.ci/doc.pdf',
      source_page: 10,
      financial_verification_status: 'VERIFIED',
    };

    const noUrlOrDocIdProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-4b',
      data_provenance: 'OFFICIAL_PRIMARY_SOURCE',
      budget_amount_fcfa: 55_000_000,
      source: 'Délibération municipale 2026',
      source_url: undefined,
      source_document_id: undefined,
      source_page: 10,
      financial_verification_status: 'VERIFIED',
    };

    for (const proj of [noDocTitleProject, noUrlOrDocIdProject]) {
      expect(checkVerifiedBudgetEvidence(proj)).toBe(false);
      const passport = generateProjectPassport(proj, [], []);
      expect(passport.hasVerifiedBudgetEvidence).toBe(false);
      expect(passport.stages.find(s => s.id === 'NEED_PROGRAMMING')?.status).not.toBe('VERIFIED_OFFICIAL');
      expect(passport.stages.find(s => s.id === 'BUDGET_VOTED')?.status).not.toBe('VERIFIED_OFFICIAL');
    }
  });

  it('Cas 5 : Une page documentaire sans correspondance vérifiée avec le montant ne permet pas de certification', () => {
    const unverifiedCorrespondenceProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-5',
      data_provenance: 'OFFICIAL_PRIMARY_SOURCE',
      budget_amount_fcfa: 72_000_000,
      source: 'Annexe 4 LFI 2026 — Loi de Finances n°2025-988',
      source_url: 'https://dgbf.gouv.ci/wp-content/uploads/2026/01/Annexe-4-LFI-2026.pdf',
      source_page: 88,
      financial_verification_status: 'TO_VERIFY', // correspondance pièce <-> montant non vérifiée
    };

    expect(classifyProjectProvenance(unverifiedCorrespondenceProject)).toBe('AUTOMATED_EXTRACTION');
    expect(checkVerifiedBudgetEvidence(unverifiedCorrespondenceProject)).toBe(false);

    const passport = generateProjectPassport(unverifiedCorrespondenceProject, [], []);
    expect(passport.hasVerifiedBudgetEvidence).toBe(false);
    expect(passport.stages.find(s => s.id === 'NEED_PROGRAMMING')?.status).toBe('PENDING_DOCUMENTATION');
    expect(passport.stages.find(s => s.id === 'BUDGET_VOTED')?.status).toBe('PENDING_DOCUMENTATION');
  });

  it('Cas 6 : Un rapprochement automatique STRONG ne certifie pas à lui seul une opération ni les étapes amont du projet', () => {
    // 6.A : Un projet non vérifié qui matche en STRONG un CA officiel ne doit JAMAIS hériter de VERIFIED_OFFICIAL sur les étapes 1 et 2
    const unverifiedProjectMatchingTiassale: BudgetProject = {
      id: 'proj-tiassale-marche-20-unverified',
      title: 'Construction de vingt (20) magasins au marché de Tiassalé',
      commune_name: 'Mairie de Tiassalé',
      region_name: 'Agnéby-Tiassa',
      category: 'Commerce & Marchés',
      nature_expense: 'Investissements',
      budget_amount_fcfa: 28_000_000,
      fiscal_year: 2024,
      current_status: 'IN_PROGRESS',
      progress_percentage: 85,
      created_at: '2024-01-01',
      scope_level: 'LOCAL',
      institution_id: 'inst-com-tiassale',
      program_name: 'Programme Commerce Local',
    };

    const passportInheritedCheck = generateProjectPassport(unverifiedProjectMatchingTiassale, [], CA_PILOT_FIXTURES);
    expect(passportInheritedCheck.matchResult?.confidence).toBe('STRONG');
    expect(passportInheritedCheck.hasVerifiedBudgetEvidence).toBe(false);
    expect(passportInheritedCheck.stages.find(s => s.id === 'NEED_PROGRAMMING')?.status).toBe('PENDING_DOCUMENTATION');
    expect(passportInheritedCheck.stages.find(s => s.id === 'BUDGET_VOTED')?.status).toBe('PENDING_DOCUMENTATION');

    // 6.B : Un rapprochement automatique STRONG vers une opération CA dont le compte n'est pas certifié (CALCULATED_TO_VERIFY ou sans page)
    // ou dont le marché n'est pas vérifié DGMP ne certifie ni l'étape 3, ni l'étape 4, ni l'étape 6
    const unverifiedAccount: AdministrativeAccount = {
      ...structuredClone(CA_PILOT_FIXTURES.find(ca => ca.id === 'ca-tiassale-2024')!),
      verification_status: 'CALCULATED_TO_VERIFY',
      operations: [
        {
          id: 'op-tias-unverified',
          ca_id: 'ca-tiassale-2024',
          institution_id: 'inst-com-tiassale',
          institution_name: 'Mairie de Tiassalé',
          fiscal_year: 2024,
          title: 'Construction de vingt (20) magasins au marché de Tiassalé',
          sector: 'Commerce & Marchés',
          planned_amount: 28_000_000,
          executed_amount: 27_850_646,
          source_page: undefined,
          procurement_match: {
            id: 'proc-unverified',
            operation_id: 'op-tias-unverified',
            tender_number: 'AOO24062605757',
            procurement_object: 'CONSTRUCTION DE VINGT (20) MAGASINS AU MARCHE DE TIASSALE',
            contractor: 'SOCIETE DEM',
            award_amount: 27_730_380,
            match_level: 'STRONG',
            source: 'Note interne non vérifiée',
            source_url: undefined,
            verification_status: 'À vérifier',
          },
        },
      ],
    };

    const matchRes = findMatchingCaOperationResult(unverifiedProjectMatchingTiassale, [unverifiedAccount]);
    expect(matchRes.confidence).toBe('STRONG');
    expect(checkVerifiedProcurementEvidence(matchRes.operation?.procurement_match, matchRes)).toBe(false);
    expect(checkVerifiedExecutionEvidence(matchRes.operation, unverifiedAccount, matchRes)).toBe(false);

    const passportUnverifiedCa = generateProjectPassport(unverifiedProjectMatchingTiassale, [], [unverifiedAccount]);
    expect(passportUnverifiedCa.hasVerifiedProcurementEvidence).toBe(false);
    expect(passportUnverifiedCa.hasVerifiedExecutionEvidence).toBe(false);
    expect(passportUnverifiedCa.stages.find(s => s.id === 'PROCUREMENT_DGMP')?.status).toBe('PROBABLE_MATCH');
    expect(passportUnverifiedCa.stages.find(s => s.id === 'BUDGET_EXECUTION_CA')?.status).toBe('PROBABLE_MATCH');
    expect(passportUnverifiedCa.stages.find(s => s.id === 'AUDIT_ACCOUNTABILITY')?.status).toBe('PENDING_DOCUMENTATION');
    for (const stage of passportUnverifiedCa.stages) {
      expect(stage.status).not.toBe('VERIFIED_OFFICIAL');
    }
  });

  it('Cas 7 : Un montant null reste inconnu dans les rapports et empêche tout total consolidé abusif', () => {
    const projectsWithNull: BudgetProject[] = [
      { ...baseProject, id: 'p-doc-1', budget_amount_fcfa: 100_000_000, scope_level: 'LOCAL', category: 'SANTE' },
      { ...baseProject, id: 'p-null-1', budget_amount_fcfa: null, scope_level: 'LOCAL', category: 'SANTE' },
      { ...baseProject, id: 'p-null-2', budget_amount_fcfa: null, scope_level: 'NATIONAL', category: 'INFRASTRUCTURE' },
    ];

    const stats = computeBudgetReportStats(projectsWithNull, 'GLOBAL', 2);
    expect(stats.totalProjects).toBe(3);
    expect(stats.documentedProjectsCount).toBe(1);
    expect(stats.unknownAmountProjectsCount).toBe(2);
    expect(stats.zeroAmountProjectsCount).toBe(0);
    expect(stats.documentedTotalAmount).toBe(100_000_000);
    expect(stats.consolidatedTotalAmount).toBeNull(); // Total consolidé interdit car 2 projets ont un montant inconnu
    expect(stats.isPartialSum).toBe(true);
    expect(stats.isCompleteCoverage).toBe(false);
    expect(stats.nationalAmount).toBeNull(); // Aucun projet national documenté -> null (jamais 0 !)

    const reportHtml = renderToStaticMarkup(<BudgetReportsView projectsOverride={projectsWithNull} />);
    expect(reportHtml).toContain('Somme partielle — Total consolidé non disponible');
    expect(reportHtml).toContain('Somme des Montants Renseignés (Partielle)');
    expect(reportHtml).toContain('1 avec montant renseigné • 2 sans montant connu');
    expect(reportHtml).toContain('Montant non documenté (1 inconnu(s))');

    // Vérification transversale dans CommuneComparatorModal : null ne devient pas 0 dans l'écart de dotation
    const instWithBudget: Institution = {
      id: 'inst-1',
      name: 'Mairie de Test A',
      type: 'MAIRIE',
      region: 'Poro',
      district: 'Savanes',
      total_budget_fcfa: 500_000_000,
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
    };
    const instUnknownBudget: Institution = {
      id: 'inst-2',
      name: 'Mairie de Test B',
      type: 'MAIRIE',
      region: 'Poro',
      district: 'Savanes',
      total_budget_fcfa: null,
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
    };
    const comparatorHtml = renderToStaticMarkup(
      <CommuneComparatorModal
        isOpen={true}
        onClose={() => {}}
        institutions={[instWithBudget, instUnknownBudget]}
        projects={[]}
        initialCommuneA={instWithBudget}
        initialCommuneB={instUnknownBudget}
        onNavigateToProjects={() => {}}
      />
    );
    expect(comparatorHtml).toContain('Écart non calculable (au moins un montant non documenté)');
  });

  it('Cas 8 : Un montant zéro documenté reste strictement distinct d’un montant inconnu dans le Passeport et les Rapports', () => {
    const zeroDocProject: BudgetProject = {
      ...baseProject,
      id: 'p-zero-doc',
      budget_amount_fcfa: 0,
      data_provenance: 'OFFICIAL_PRIMARY_SOURCE',
      source: 'Annexe 4 LFI 2026 — Ligne mémoire à 0 FCFA',
      source_url: 'https://dgbf.gouv.ci/wp-content/uploads/2026/01/Annexe-4-LFI-2026.pdf',
      source_page: 51,
      financial_verification_status: 'VERIFIED',
    };
    const unknownDocProject: BudgetProject = {
      ...baseProject,
      id: 'p-unknown-doc',
      budget_amount_fcfa: null,
    };

    const passportZero = generateProjectPassport(zeroDocProject, [], []);
    const passportUnknown = generateProjectPassport(unknownDocProject, [], []);

    expect(passportZero.facts.budget_amount.value).toBe(0);
    expect(passportZero.facts.budget_amount.availability).toBe('AVAILABLE');
    expect(passportZero.stages.find(s => s.id === 'BUDGET_VOTED')?.dataPoints.find(d => d.label === 'Montant inscrit')?.value).toContain(
      '0 FCFA (montant nul documenté)'
    );

    expect(passportUnknown.facts.budget_amount.value).toBeNull();
    expect(passportUnknown.facts.budget_amount.availability).toBe('UNKNOWN');
    expect(passportUnknown.stages.find(s => s.id === 'BUDGET_VOTED')?.dataPoints.find(d => d.label === 'Montant inscrit')?.value).toBe(
      'Non renseigné'
    );

    // Dans les rapports : 1 projet à 0 FCFA documenté donne un total consolidé de 0 FCFA,
    // tandis qu'1 projet à null donne documentedTotalAmount = null et consolidatedTotalAmount = null
    const statsOnlyZero = computeBudgetReportStats([zeroDocProject], 'GLOBAL', 0);
    expect(statsOnlyZero.documentedProjectsCount).toBe(1);
    expect(statsOnlyZero.unknownAmountProjectsCount).toBe(0);
    expect(statsOnlyZero.zeroAmountProjectsCount).toBe(1);
    expect(statsOnlyZero.documentedTotalAmount).toBe(0);
    expect(statsOnlyZero.consolidatedTotalAmount).toBe(0);

    const statsOnlyUnknown = computeBudgetReportStats([unknownDocProject], 'GLOBAL', 0);
    expect(statsOnlyUnknown.documentedProjectsCount).toBe(0);
    expect(statsOnlyUnknown.unknownAmountProjectsCount).toBe(1);
    expect(statsOnlyUnknown.zeroAmountProjectsCount).toBe(0);
    expect(statsOnlyUnknown.documentedTotalAmount).toBeNull();
    expect(statsOnlyUnknown.consolidatedTotalAmount).toBeNull();
  });

  it('Cas 9 : Une réalisation physique déclarée (même à 100 % avec source officielle) ne devient jamais une réalisation certifiée (VERIFIED_OFFICIAL)', () => {
    const declaredPhysicalProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-9',
      data_provenance: 'OFFICIAL_PRIMARY_SOURCE',
      source: 'Annexe 4 LFI 2026 — Loi de Finances n°2025-988',
      source_url: 'https://dgbf.gouv.ci/wp-content/uploads/2026/01/Annexe-4-LFI-2026.pdf',
      source_page: 25,
      financial_verification_status: 'VERIFIED',
      progress_percentage: 100,
      current_status: 'COMPLETED',
      official_progress_source: 'Rapport annuel d’exécution ministériel — déclaré achevé à 100 %',
    };

    const passport = generateProjectPassport(declaredPhysicalProject, [], []);
    const physicalStage = passport.stages.find(s => s.id === 'PHYSICAL_REALIZATION')!;

    expect(physicalStage.status).toBe('PENDING_DOCUMENTATION');
    expect(physicalStage.status).not.toBe('VERIFIED_OFFICIAL');
    expect(physicalStage.status).not.toBe('CITIZEN_DOCUMENTED');
    expect(passport.facts.physical_status.provenance).toBe('INSTITUTION_RESPONSE');
    expect(passport.facts.physical_status.provenance).not.toBe('OFFICIAL_SOURCE');
    expect(physicalStage.dataPoints[0].provenance).toBe('INSTITUTION_RESPONSE');
  });

  it('Cas 10 : Une réponse institutionnelle publiée ne certifie jamais automatiquement l’exécution financière ni la reddition', () => {
    const accountWithResponseButUnverifiedExecution: AdministrativeAccount = {
      ...structuredClone(CA_PILOT_FIXTURES.find(ca => ca.id === 'ca-tiassale-2024')!),
      verification_status: 'CALCULATED_TO_VERIFY',
      institution_response: {
        id: 'resp-tias-2024',
        ca_id: 'ca-tiassale-2024',
        operation_id: 'op-tias-2024-06',
        author_name: 'Direction Financière de la Mairie',
        author_title: 'Directeur Financier',
        response_date: '2026-03-10',
        response_text: 'Les travaux ont été intégralement payés et réceptionnés.',
        supporting_document_name: 'Courrier de réponse municipale n°12/2026',
        supporting_document_url: 'https://example.ci/courrier-12.pdf',
        response_status: 'PUBLISHED',
      },
    };

    const project: BudgetProject = {
      id: 'proj-tiassale-marche-20',
      title: 'Construction de vingt (20) magasins au marché de Tiassalé',
      commune_name: 'Mairie de Tiassalé',
      region_name: 'Agnéby-Tiassa',
      category: 'Commerce & Marchés',
      nature_expense: 'Investissements',
      budget_amount_fcfa: 28_000_000,
      fiscal_year: 2024,
      current_status: 'IN_PROGRESS',
      progress_percentage: 85,
      created_at: '2024-01-01',
      scope_level: 'LOCAL',
      institution_id: 'inst-com-tiassale',
    };

    const passport = generateProjectPassport(project, [], [accountWithResponseButUnverifiedExecution]);
    expect(passport.facts.institution_response_status.value).toBe('PUBLISHED');
    expect(passport.facts.institution_response_status.provenance).toBe('INSTITUTION_RESPONSE');
    expect(passport.hasVerifiedExecutionEvidence).toBe(false);

    const caStage = passport.stages.find(s => s.id === 'BUDGET_EXECUTION_CA')!;
    const auditStage = passport.stages.find(s => s.id === 'AUDIT_ACCOUNTABILITY')!;
    expect(caStage.status).not.toBe('VERIFIED_OFFICIAL');
    expect(caStage.status).toBe('PROBABLE_MATCH');
    expect(auditStage.status).not.toBe('VERIFIED_OFFICIAL');
    expect(auditStage.status).toBe('PENDING_DOCUMENTATION');
  });

  it('Cas 11 (Section 3.1 & 3.5) : Budget officiellement vérifié, mais besoin citoyen non documenté -> BUDGET_VOTED est VERIFIED_OFFICIAL mais NEED_PROGRAMMING reste PENDING_DOCUMENTATION', () => {
    const verifiedBudgetNoNeedProject: BudgetProject = {
      ...baseProject,
      id: 'adv-case-11-budget-only',
      data_provenance: 'OFFICIAL_PRIMARY_SOURCE',
      budget_amount_fcfa: 250_000_000,
      source: 'Loi de Finances n° 2025-987 du 19 décembre 2025 — Annexe 4',
      source_document_id: 'doc-lfi-2026-annexe-4',
      source_url: 'https://dgbf.gouv.ci/wp-content/uploads/2026/01/Annexe-4-LFI-2026.pdf',
      source_page: 88,
      financial_verification_status: 'VERIFIED',
      citizen_need_origin: undefined,
      initiative_source: undefined,
    };

    expect(checkVerifiedBudgetEvidence(verifiedBudgetNoNeedProject)).toBe(true);
    expect(checkVerifiedNeedEvidence(verifiedBudgetNoNeedProject)).toBe(false);

    const passport = generateProjectPassport(verifiedBudgetNoNeedProject, [], []);
    expect(passport.hasVerifiedBudgetEvidence).toBe(true);
    expect(passport.hasVerifiedNeedEvidence).toBe(false);
    expect(passport.hasVerifiedProcurementEvidence).toBe(false);
    expect(passport.hasVerifiedExecutionEvidence).toBe(false);
    expect(passport.hasVerifiedPhysicalEvidence).toBe(false);
    expect(passport.hasVerifiedAuditEvidence).toBe(false);

    const needStage = passport.stages.find(s => s.id === 'NEED_PROGRAMMING')!;
    const budgetStage = passport.stages.find(s => s.id === 'BUDGET_VOTED')!;
    expect(needStage.status).toBe('PENDING_DOCUMENTATION');
    expect(needStage.status).not.toBe('VERIFIED_OFFICIAL');
    expect(needStage.statusLabel).toContain('besoin citoyen initial non documenté');
    expect(budgetStage.status).toBe('VERIFIED_OFFICIAL');

    // Aucune des 5 autres étapes ne reçoit VERIFIED_OFFICIAL
    const verifiedStages = passport.stages.filter(s => s.status === 'VERIFIED_OFFICIAL');
    expect(verifiedStages.map(s => s.id)).toEqual(['BUDGET_VOTED']);
  });

  it('Cas 12 (Section 3.2) : Besoin citoyen déclaré par un administrateur ne produit jamais VERIFIED_OFFICIAL ni CITIZEN_OBSERVATION', () => {
    const adminDeclaredNeedOnVerifiedBudget: BudgetProject = {
      ...baseProject,
      id: 'adv-case-12-admin-need',
      data_provenance: 'OFFICIAL_PRIMARY_SOURCE',
      budget_amount_fcfa: 180_000_000,
      source: 'Loi de Finances n° 2025-987 du 19 décembre 2025 — Annexe 4',
      source_document_id: 'doc-lfi-2026-annexe-4',
      source_url: 'https://dgbf.gouv.ci/wp-content/uploads/2026/01/Annexe-4-LFI-2026.pdf',
      source_page: 92,
      financial_verification_status: 'VERIFIED',
      citizen_need_origin: 'Besoin déclaré et saisi par l’administrateur municipal sans PV',
      citizen_need_verification_status: 'UNVERIFIED',
    };

    expect(checkVerifiedNeedEvidence(adminDeclaredNeedOnVerifiedBudget)).toBe(false);
    const passport = generateProjectPassport(adminDeclaredNeedOnVerifiedBudget, [], []);
    const needStage = passport.stages.find(s => s.id === 'NEED_PROGRAMMING')!;
    expect(needStage.status).toBe('PENDING_DOCUMENTATION');
    expect(needStage.status).not.toBe('VERIFIED_OFFICIAL');

    const needDp = needStage.dataPoints.find(d => d.label === 'Expression du besoin citoyen')!;
    expect(needDp.provenance).toBe('UNVERIFIED_INPUT');
    expect(needDp.provenanceClass).toBe('DECLARED_ADMIN');
    expect(needDp.provenance).not.toBe('CITIZEN_OBSERVATION');
    expect(needDp.provenance).not.toBe('OFFICIAL_SOURCE');
  });

  it('Cas 13 (Section 3.6, 3.7, 3.8, 3.10 & Règle 9) : Correspondance algorithmique par mots-clés, entreprise déclarée, CA vérifié sans audit et observation citoyenne n’entraînent jamais de certification abusive', () => {
    // Vérifie que les 6 spécifications d'étape sont définies indépendamment
    expect(Object.keys(STAGE_CERTIFICATION_SPECIFICATIONS)).toEqual([
      'NEED_PROGRAMMING',
      'BUDGET_VOTED',
      'PROCUREMENT_DGMP',
      'BUDGET_EXECUTION_CA',
      'PHYSICAL_REALIZATION',
      'AUDIT_ACCOUNTABILITY',
    ]);

    // 13.A : Projet rapproché par similarité algorithmique de mots-clés (intitulé non identique et sans linked_project_id)
    const keywordMatchedProject: BudgetProject = {
      id: 'proj-tiassale-algorithmic-keywords',
      title: 'Travaux de construction de vingt magasins modernes au grand marché central de Tiassalé',
      commune_name: 'Mairie de Tiassalé',
      region_name: 'Agnéby-Tiassa',
      category: 'Commerce & Marchés',
      nature_expense: 'Investissements',
      budget_amount_fcfa: 28_000_000,
      fiscal_year: 2024,
      current_status: 'IN_PROGRESS',
      progress_percentage: 85,
      created_at: '2024-01-01',
      scope_level: 'LOCAL',
      institution_id: 'inst-com-tiassale',
    };

    const passportKeyword = generateProjectPassport(keywordMatchedProject, [], CA_PILOT_FIXTURES);
    // Règle 9 : Une correspondance algorithmique par mots-clés ne devient jamais VERIFIED_OFFICIAL
    expect(passportKeyword.hasVerifiedProcurementEvidence).toBe(false);
    expect(passportKeyword.hasVerifiedExecutionEvidence).toBe(false);
    for (const stage of passportKeyword.stages) {
      expect(stage.status).not.toBe('VERIFIED_OFFICIAL');
    }

    // 13.B : Même sur l'opération Tiassalé exactement vérifiée (Étapes 3 et 4 VERIFIED_OFFICIAL),
    // l'Étape 6 (AUDIT_ACCOUNTABILITY) n'hérite JAMAIS automatiquement de VERIFIED_OFFICIAL sans rapport d'audit indépendant
    const exactTiassaleProject: BudgetProject = {
      ...keywordMatchedProject,
      id: 'proj-tiassale-marche-20',
      title: 'Construction de vingt (20) magasins au marché de Tiassalé',
    };
    const passportExactTiassale = generateProjectPassport(
      exactTiassaleProject,
      [
        {
          id: 'proof-approved-1',
          project_id: 'proj-tiassale-marche-20',
          image_url: 'https://example.ci/photo.jpg',
          citizen_status_claim: 'COMPLETED',
          comment: 'Magasins construits',
          verification_status: 'APPROVED',
          confirmations_count: 3,
          created_at: '2026-03-01',
        },
      ],
      CA_PILOT_FIXTURES
    );
    expect(passportExactTiassale.stages.find(s => s.id === 'NEED_PROGRAMMING')?.status).toBe('NOT_FOUND_PUBLICLY');
    expect(passportExactTiassale.stages.find(s => s.id === 'BUDGET_VOTED')?.status).toBe('PENDING_DOCUMENTATION');
    expect(passportExactTiassale.stages.find(s => s.id === 'PROCUREMENT_DGMP')?.status).toBe('VERIFIED_OFFICIAL');
    expect(passportExactTiassale.stages.find(s => s.id === 'BUDGET_EXECUTION_CA')?.status).toBe('VERIFIED_OFFICIAL');
    expect(passportExactTiassale.stages.find(s => s.id === 'PHYSICAL_REALIZATION')?.status).toBe('CITIZEN_DOCUMENTED');
    expect(passportExactTiassale.stages.find(s => s.id === 'AUDIT_ACCOUNTABILITY')?.status).toBe('PENDING_DOCUMENTATION');
    expect(checkVerifiedPhysicalEvidence(exactTiassaleProject)).toBe(false);
    expect(checkVerifiedAuditEvidence(exactTiassaleProject)).toBe(false);
  });

  it('Cas 14 (Section 4) : computeSectorBreakdown et computePublicIndicators distinguent montants documentés, montants à 0 FCFA et montants inconnus (null) sans total consolidé trompeur', () => {
    const sampleProjects: BudgetProject[] = [
      {
        ...baseProject,
        id: 'proj-sec-known-100m',
        title: 'Construction d’un centre de santé urbain',
        category: 'Santé',
        budget_amount_fcfa: 100_000_000,
        fiscal_year: 2026,
      },
      {
        ...baseProject,
        id: 'proj-sec-zero',
        title: 'Réhabilitation dispensaire rural (dotation 0 FCFA)',
        category: 'Santé',
        budget_amount_fcfa: 0,
        fiscal_year: 2026,
      },
      {
        ...baseProject,
        id: 'proj-sec-unknown',
        title: 'Construction maternité municipale (montant non communiqué)',
        category: 'Santé',
        budget_amount_fcfa: null,
        fiscal_year: 2026,
      },
    ];

    const breakdown = computeSectorBreakdown(sampleProjects, { fiscalYear: 2026 });
    expect(breakdown.totalProjects).toBe(3);
    expect(breakdown.documentedAmountProjectsCount).toBe(2);
    expect(breakdown.zeroAmountProjectsCount).toBe(1);
    expect(breakdown.unknownAmountProjectsCount).toBe(1);
    expect(breakdown.isPartialSum).toBe(true);
    expect(breakdown.totalAmountFcfa).toBe(100_000_000);
    expect(breakdown.consolidatedTotalAmountFcfa).toBeNull();
    expect(breakdown.isExhaustiveCoverage).toBe(false);
    expect(breakdown.partialSumNotice).toContain('Somme partielle des montants connus');
    expect(breakdown.partialSumNotice).toContain('jamais comptés comme 0 FCFA');

    const healthSector = breakdown.sectors.find(s => s.id === 'HEALTH')!;
    expect(healthSector.count).toBe(3);
    expect(healthSector.documentedAmountCount).toBe(2);
    expect(healthSector.zeroAmountCount).toBe(1);
    expect(healthSector.unknownAmountCount).toBe(1);
    expect(healthSector.isPartialSum).toBe(true);
    expect(healthSector.amountFcfa).toBe(100_000_000);
    expect(healthSector.consolidatedAmountFcfa).toBeNull();

    const snapshot = computePublicIndicators({
      projects: sampleProjects,
      institutions: [],
      proofs: [],
    });
    expect(snapshot.investments.documentedAmountProjectsCount).toBe(2);
    expect(snapshot.investments.zeroAmountProjectsCount).toBe(1);
    expect(snapshot.investments.unknownAmountProjectsCount).toBe(1);
    expect(snapshot.investments.isPartialSum).toBe(true);
    expect(snapshot.investments.physical2026AmountFcfa).toBe(100_000_000);
    expect(snapshot.investments.consolidatedPhysicalAllAmountFcfa).toBeNull();
    expect(snapshot.investments.consolidatedPhysical2026AmountFcfa).toBeNull();
  });

  it('Cas 15 (Section 7) : Protection des données citoyennes — publicCitizenProof masque systématiquement le nom réel, le WhatsApp/téléphone et bloque les preuves non modérées', () => {
    const rawSubmittedProof: CitizenProof & Record<string, unknown> = {
      id: 'proof-pii-check',
      project_id: 'proj-1',
      project_title: 'Centre de santé',
      commune_name: 'Cocody',
      citizen_name: 'Kouamé Aya Marie',
      user_name: 'Kouamé Aya Marie',
      citizen_whatsapp: '+2250708091011',
      citizen_contact: 'aya.kouame@example.ci',
      moderator_notes: 'Vérifié par appel téléphonique interne',
      tracking_code: 'TRK-SECRET-999',
      image_url: 'https://example.ci/photo.jpg',
      citizen_status_claim: 'IN_PROGRESS',
      comment: 'Les murs sont montés jusqu’au chaînage.',
      verification_status: 'PENDING',
      confirmations_count: 1,
      created_at: '2026-04-10',
    };

    // Tant que la preuve est PENDING ou REJECTED, elle ne peut jamais être exposée publiquement
    expect(publicCitizenProof(rawSubmittedProof as CitizenProof)).toBeNull();
    expect(
      publicCitizenProof({
        ...(rawSubmittedProof as CitizenProof),
        verification_status: 'REJECTED',
      })
    ).toBeNull();

    // Une fois APPROVED, seules les données publiques anonymisées sont projetées
    const approvedProjection = publicCitizenProof({
      ...(rawSubmittedProof as CitizenProof),
      verification_status: 'APPROVED',
    });
    expect(approvedProjection).not.toBeNull();
    expect(approvedProjection!.citizen_name).toBe(publicCitizenIdentity());
    expect(approvedProjection!.user_name).toBe('Sentinelle citoyenne');
    expect(approvedProjection!.citizen_name).not.toContain('Kouamé');
    expect(Object.prototype.hasOwnProperty.call(approvedProjection, 'citizen_whatsapp')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(approvedProjection, 'citizen_contact')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(approvedProjection, 'moderator_notes')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(approvedProjection, 'tracking_code')).toBe(false);
  });
});
