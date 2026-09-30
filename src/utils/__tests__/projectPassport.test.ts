import { describe, it, expect } from 'vitest';
import { generateProjectPassport, findMatchingCaOperation } from '../projectPassport';
import { BudgetProject, CitizenProof } from '../../types';

describe('Project Accountability Passport (Passeport de Redevabilité)', () => {
  const mockTiassaleProject: BudgetProject = {
    id: 'proj-tiassale-marche-20',
    title: 'Construction de vingt (20) magasins au marché de Tiassalé',
    commune_name: 'Mairie de Tiassalé',
    region_name: 'Agnéby-Tiassa',
    category: 'Commerce & Marchés',
    nature_expense: 'Investissements',
    budget_amount_fcfa: 28000000,
    fiscal_year: 2024,
    current_status: 'IN_PROGRESS',
    progress_percentage: 85,
    created_at: '2024-01-01',
    scope_level: 'LOCAL',
    institution_id: 'inst-com-tiassale',
  };

  const mockGardienkroProject: BudgetProject = {
    id: 'proj-tiassale-gardienkro',
    title: 'Construction d’un bâtiment de trois salles de classe, bureau et latrines pour une nouvelle école primaire à Gardienkro',
    commune_name: 'Mairie de Tiassalé',
    region_name: 'Agnéby-Tiassa',
    category: 'Éducation',
    nature_expense: 'Investissements',
    budget_amount_fcfa: 29000000,
    fiscal_year: 2024,
    current_status: 'NOT_STARTED',
    progress_percentage: 0,
    created_at: '2024-01-01',
    scope_level: 'LOCAL',
    institution_id: 'inst-com-tiassale',
  };

  const mockGenericProject: BudgetProject = {
    id: 'proj-abidjan-route-test',
    title: 'Réhabilitation de voies secondaires à Cocody Angré',
    commune_name: 'Mairie de Cocody',
    region_name: 'Abidjan',
    category: 'Voirie',
    nature_expense: 'Investissements',
    budget_amount_fcfa: 50000000,
    fiscal_year: 2026,
    current_status: 'NOT_STARTED',
    progress_percentage: 0,
    created_at: '2026-01-01',
    scope_level: 'LOCAL',
  };

  const mockApprovedProof: CitizenProof = {
    id: 'proof-1',
    project_id: 'proj-tiassale-marche-20',
    image_url: 'https://example.com/proof1.jpg',
    citizen_status_claim: 'IN_PROGRESS',
    comment: 'Gros oeuvre achevé, toiture en cours de pose',
    verification_status: 'APPROVED',
    confirmations_count: 5,
    created_at: '2026-03-01',
  };

  it('génère un passeport structuré avec exactement les 6 étapes du cycle civique', () => {
    const passport = generateProjectPassport(mockGenericProject);
    expect(passport.stages).toHaveLength(6);
    expect(passport.stages.map(s => s.id)).toEqual([
      'NEED_PROGRAMMING',
      'BUDGET_VOTED',
      'PROCUREMENT_DGMP',
      'BUDGET_EXECUTION_CA',
      'PHYSICAL_REALIZATION',
      'AUDIT_ACCOUNTABILITY',
    ]);
  });

  it('rapproche avec succès une opération réelle du CA 2024 de Tiassalé et son marché DGMP', () => {
    const matched = findMatchingCaOperation(mockTiassaleProject);
    expect(matched).toBeDefined();
    expect(matched?.id).toBe('op-tias-2024-06');
    expect(matched?.procurement_match?.tender_number).toBe('AOO24062605757');
    expect(matched?.procurement_match?.contractor).toBe('SOCIETE DEM');
    expect(matched?.executed_amount).toBe(27850646);

    const passport = generateProjectPassport(mockTiassaleProject, [mockApprovedProof]);
    expect(passport.hasMatchedCaOperation).toBe(true);
    expect(passport.hasMatchedDgmpTender).toBe(true);
    expect(passport.hasCitizenFieldProofs).toBe(true);

    const procurementStage = passport.stages.find(s => s.id === 'PROCUREMENT_DGMP');
    expect(procurementStage?.status).toBe('VERIFIED_OFFICIAL');
    expect(procurementStage?.dataPoints.some(d => d.value.includes('AOO24062605757'))).toBe(true);

    const caStage = passport.stages.find(s => s.id === 'BUDGET_EXECUTION_CA');
    expect(caStage?.status).toBe('VERIFIED_OFFICIAL');
    expect(caStage?.dataPoints.some(d => d.value.includes('27 850 646'))).toBe(true);
  });

  it('détecte l\'anomalie pour l\'école de Gardienkro (marché attribué mais CA exécuté à 0 FCFA)', () => {
    const passport = generateProjectPassport(mockGardienkroProject);
    expect(passport.hasMatchedCaOperation).toBe(true);
    expect(passport.hasMatchedDgmpTender).toBe(true);

    const caStage = passport.stages.find(s => s.id === 'BUDGET_EXECUTION_CA');
    expect(caStage?.status).toBe('ANOMALY_DETECTED');
    expect(caStage?.alertMessage).toContain('0 FCFA ordonnancé');
  });

  it('respecte le principe 9 (NOT_FOUND_PUBLICLY) lorsqu\'aucun marché ou CA n\'est encore rapproché', () => {
    const passport = generateProjectPassport(mockGenericProject);
    expect(passport.hasMatchedCaOperation).toBe(false);
    expect(passport.hasMatchedDgmpTender).toBe(false);

    const procurementStage = passport.stages.find(s => s.id === 'PROCUREMENT_DGMP');
    expect(procurementStage?.status).toBe('NOT_FOUND_PUBLICLY');

    const caStage = passport.stages.find(s => s.id === 'BUDGET_EXECUTION_CA');
    expect(caStage?.status).toBe('NOT_FOUND_PUBLICLY');
  });

  it('respecte le principe 7 (Financier != Physique) et enrichit avec les observations citoyennes', () => {
    const passportWithProof = generateProjectPassport(mockTiassaleProject, [mockApprovedProof]);
    const physicalStage = passportWithProof.stages.find(s => s.id === 'PHYSICAL_REALIZATION');
    
    expect(physicalStage?.status).toBe('CITIZEN_DOCUMENTED');
    expect(physicalStage?.statusLabel).toContain('1 observation(s)');
    expect(physicalStage?.alertMessage).toContain('Une dépense mandatée au budget ne constitue jamais une preuve d\'achèvement');
  });

  it('chaque point de donnée comporte une provenance explicite (Principe 2)', () => {
    const passport = generateProjectPassport(mockTiassaleProject, [mockApprovedProof]);
    for (const stage of passport.stages) {
      for (const dp of stage.dataPoints) {
        expect(['OFFICIAL_SOURCE', 'SUIVIBUDGET_CALCULATION', 'CITIZEN_OBSERVATION', 'INSTITUTION_RESPONSE', 'NOT_FOUND_PUBLICLY']).toContain(dp.provenance);
      }
    }
  });
});
