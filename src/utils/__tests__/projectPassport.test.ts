import { describe, it, expect } from 'vitest';
import { 
  generateProjectPassport, 
  findMatchingCaOperation, 
  findMatchingCaOperationResult 
} from '../projectPassport';
import { BudgetProject, CitizenProof } from '../../types';

describe('Project Accountability Passport (Passeport de Redevabilité)', () => {
  const mockTiassaleProject2024: BudgetProject = {
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

  const mockTiassaleProjectIncompatibleYear: BudgetProject = {
    id: 'proj-tiassale-marche-2026-incompatible',
    title: 'Construction de vingt (20) magasins au marché de Tiassalé',
    commune_name: 'Mairie de Tiassalé',
    region_name: 'Agnéby-Tiassa',
    category: 'Commerce & Marchés',
    nature_expense: 'Investissements',
    budget_amount_fcfa: 28000000,
    fiscal_year: 2026, // Année 2026 vs CA 2024 sans mention de report
    current_status: 'NOT_STARTED',
    progress_percentage: 0,
    created_at: '2026-01-01',
    scope_level: 'LOCAL',
    institution_id: 'inst-com-tiassale',
  };

  const mockPluriannualProject: BudgetProject = {
    id: 'proj-tiassale-gardienkro-report',
    title: 'Construction d’un bâtiment de trois salles de classe à Gardienkro (Phase 2)',
    commune_name: 'Mairie de Tiassalé',
    region_name: 'Agnéby-Tiassa',
    category: 'Éducation',
    nature_expense: 'Investissements',
    budget_amount_fcfa: 29000000,
    fiscal_year: 2025,
    current_status: 'IN_PROGRESS',
    progress_percentage: 15,
    created_at: '2025-01-01',
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

  const mockProjectWithUnverifiedContractor: BudgetProject = {
    ...mockGenericProject,
    id: 'proj-contractor-test',
    contractor_name: 'ENTREPRISE IVOIRIENNE DE TRAVAUX (EIT)',
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

  it('rapproche avec succès une opération réelle du CA 2024 de Tiassalé et son marché DGMP (STRONG match)', () => {
    const matchResult = findMatchingCaOperationResult(mockTiassaleProject2024);
    expect(matchResult.confidence).toBe('STRONG');
    expect(matchResult.operation?.id).toBe('op-tias-2024-06');
    expect(matchResult.operation?.procurement_match?.tender_number).toBe('AOO24062605757');
    expect(matchResult.operation?.procurement_match?.contractor).toBe('SOCIETE DEM');
    expect(matchResult.operation?.executed_amount).toBe(27850646);

    const passport = generateProjectPassport(mockTiassaleProject2024, [mockApprovedProof]);
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

  it('Section 10.A : interdit un rapprochement STRONG sur même commune et titre si les années sont incompatibles', () => {
    // Projet 2026 vs CA 2024 sans justificatif pluriannuel certifié
    const matchResult = findMatchingCaOperationResult(mockTiassaleProjectIncompatibleYear);
    expect(matchResult.confidence).not.toBe('STRONG');
    expect(matchResult.confidence).toBe('WEAK');
    expect(matchResult.conflictingFields).toContain('fiscal_year');
    expect(matchResult.temporalJustification).toContain('Écart');

    // Dans le passeport, le lien affirmatif officiel n'est pas établi
    const passport = generateProjectPassport(mockTiassaleProjectIncompatibleYear);
    expect(passport.hasMatchedCaOperation).toBe(false);
    expect(passport.hasMatchedDgmpTender).toBe(false);

    const caStage = passport.stages.find(s => s.id === 'BUDGET_EXECUTION_CA');
    expect(caStage?.status).toBe('NOT_FOUND_PUBLICLY');
  });

  it('Section 10.B : autorise un rapprochement PROBABLE pour un projet pluriannuel documenté', () => {
    // Gardienkro comporte une opération de REPORT au CA 2024, et le projet mentionne la phase pluriannuelle
    const matchResult = findMatchingCaOperationResult(mockPluriannualProject);
    expect(['STRONG', 'PROBABLE']).toContain(matchResult.confidence);
    expect(matchResult.matchedFields).toContain('pluriannual_trace');
    expect(matchResult.temporalJustification).toBeDefined();

    const passport = generateProjectPassport(mockPluriannualProject);
    expect(passport.hasMatchedCaOperation).toBe(true);
    const caStage = passport.stages.find(s => s.id === 'BUDGET_EXECUTION_CA');
    expect(['PROBABLE_MATCH', 'ANOMALY_DETECTED']).toContain(caStage?.status);
  });

  it('Section 10.C : Gardienkro - constate 0 FCFA ordonnancé SANS interprétation causale ("report probable" exclu)', () => {
    const passport = generateProjectPassport(mockGardienkroProject);
    expect(passport.hasMatchedCaOperation).toBe(true);
    expect(passport.hasMatchedDgmpTender).toBe(true);

    const caStage = passport.stages.find(s => s.id === 'BUDGET_EXECUTION_CA');
    expect(caStage?.status).toBe('ANOMALY_DETECTED');
    expect(caStage?.alertMessage).toBe(
      'Le Compte Administratif consulté indique 0 FCFA exécuté/ordonnancé pour cette opération sur l’exercice observé. La cause de cet écart n’est pas établie par les sources actuellement reliées.'
    );
    // Vérification stricte : aucun mot interprétatif non prouvé
    expect(caStage?.alertMessage).not.toContain('report probable');
    expect(caStage?.alertMessage).not.toContain('retard');
    expect(caStage?.alertMessage).not.toContain('fraude');
  });

  it('Section 10.D : respecte le principe 9 (NOT_FOUND_PUBLICLY) lorsqu\'aucun marché ou CA n\'est rapproché', () => {
    const passport = generateProjectPassport(mockGenericProject);
    expect(passport.hasMatchedCaOperation).toBe(false);
    expect(passport.hasMatchedDgmpTender).toBe(false);

    const procurementStage = passport.stages.find(s => s.id === 'PROCUREMENT_DGMP');
    expect(procurementStage?.status).toBe('NOT_FOUND_PUBLICLY');
    expect(procurementStage?.statusLabel).toBe('Donnée non retrouvée publiquement');
    expect(procurementStage?.dataPoints[0].availability).toBe('NOT_FOUND_PUBLICLY');
    expect(procurementStage?.dataPoints[0].sourceDetails).toContain('Principe 9');
    expect(procurementStage?.dataPoints[0].value).not.toContain('inexistant');

    const caStage = passport.stages.find(s => s.id === 'BUDGET_EXECUTION_CA');
    expect(caStage?.status).toBe('NOT_FOUND_PUBLICLY');
    expect(caStage?.dataPoints[0].availability).toBe('NOT_FOUND_PUBLICLY');
  });

  it('Section 10.E : une preuve citoyenne approuvée est strictement CITIZEN_OBSERVATION (jamais OFFICIAL_SOURCE)', () => {
    const passport = generateProjectPassport(mockTiassaleProject2024, [mockApprovedProof]);
    const physicalStage = passport.stages.find(s => s.id === 'PHYSICAL_REALIZATION');
    
    expect(physicalStage?.status).toBe('CITIZEN_DOCUMENTED');
    const citizenProofDp = physicalStage?.dataPoints.find(dp => dp.label.includes('Constats'));
    expect(citizenProofDp?.provenance).toBe('CITIZEN_OBSERVATION');
    expect(citizenProofDp?.provenance).not.toBe('OFFICIAL_SOURCE');
  });

  it('Section 10.F : contractor_name présent sans avis officiel DGMP ne devient pas VERIFIED_OFFICIAL', () => {
    const passport = generateProjectPassport(mockProjectWithUnverifiedContractor);
    const procurementStage = passport.stages.find(s => s.id === 'PROCUREMENT_DGMP');

    expect(procurementStage?.status).not.toBe('VERIFIED_OFFICIAL');
    expect(procurementStage?.status).toBe('PENDING_DOCUMENTATION');
    const contractorDp = procurementStage?.dataPoints.find(dp => dp.label === 'Entreprise déclarée');
    expect(contractorDp?.provenance).toBe('UNVERIFIED_INPUT');
    expect(contractorDp?.sourceDetails).toContain('non corroborée par un avis');
  });

  it('Section 10.G : sépare strictement le besoin citoyen de la programmation budgétaire (Besoin ≠ Programmation)', () => {
    const passport = generateProjectPassport(mockGenericProject);
    const needProgStage = passport.stages.find(s => s.id === 'NEED_PROGRAMMING');

    expect(needProgStage).toBeDefined();
    // Programmation officielle dans la LFI
    const progDp = needProgStage?.dataPoints.find(dp => dp.label === 'Programmation budgétaire');
    expect(progDp?.provenance).toBe('OFFICIAL_SOURCE');

    // Mais besoin citoyen initial non documenté dans l'extrait
    const needDp = needProgStage?.dataPoints.find(dp => dp.label === 'Expression du besoin citoyen');
    expect(needDp?.availability).toBe('NOT_FOUND_PUBLICLY');
    expect(needDp?.sourceDetails).toContain('Principe 4');
  });

  it('Section 10.H : calcule l\'indice de complétude documentaire sans connotation de note politique', () => {
    const passport = generateProjectPassport(mockTiassaleProject2024, [mockApprovedProof]);
    expect(passport.documentationCompletenessPct).toBeGreaterThanOrEqual(0);
    expect(passport.documentationCompletenessPct).toBeLessThanOrEqual(100);
    expect(passport.overallAccountabilityScorePct).toBe(passport.documentationCompletenessPct);
  });
});
