import { describe, it, expect } from 'vitest';
import { 
  buildProposedValuesTemplate, 
  runDocumentDryRun, 
  buildStandardImportEnvelope,
  computeDocumentFingerprint
} from '../budgetDocumentDryRun';
import type { DocumentIngestionMetadata, ProposedFinancialValue } from '../../types/budgetCycle';
import type { Institution } from '../../types';
import type { LocalBudget } from '../../types/localBudget';
import type { AdministrativeAccount } from '../../types/administrativeAccount';

describe('Budget Document Workflow — Dry-Run & Assistant Documentaire (Items 7, 8, 9, 14)', () => {

  const mockInstitutions: Institution[] = [
    {
      id: 'inst-com-tiassale',
      name: 'Mairie de Tiassalé',
      type: 'MAIRIE',
      region: 'Agnéby-Tiassa',
      district: 'Lagunes',
      budget_functioning_fcfa: 0,
      budget_investment_fcfa: 0,
      total_budget_fcfa: 0
    },
    {
      id: 'inst-com-cocody',
      name: 'Mairie de Cocody',
      type: 'MAIRIE',
      region: 'Abidjan',
      district: 'District Autonome d\'Abidjan',
      budget_functioning_fcfa: 0,
      budget_investment_fcfa: 0,
      total_budget_fcfa: 19_764_660_000
    }
  ];

  const mockExistingBudgets: LocalBudget[] = [
    {
      id: 'lbud-cocody-2026',
      institution_id: 'inst-com-cocody',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie de Cocody',
      fiscal_year: 2026,
      budget_type: 'PRIMITIF_ADOPTE',
      status: 'PUBLISHED',
      is_current_version: true,
      version_number: 1,
      total_amount: 19_764_660_000,
      operating_amount: null,
      investment_amount: null,
      amount_precision: 'EXACT',
      operating_percentage: null,
      investment_percentage: null,
      verification_status: 'SECONDARY_TO_CORROBORATE',
      confidence_level: 'MEDIUM',
      sources: [],
      document_name: 'Budget Primitif Cocody 2026',
      import_provenance: {
        precision: { total_amount: 'EXACT' },
        source: {
          name: 'AIP Cocody',
          reference: 'AIP-2026-COCODY',
          date: '2026-02-25',
          date_kind: 'PUBLISHED'
        }
      },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'lbud-tiassale-vir1',
      institution_id: 'inst-com-tiassale',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie de Tiassalé',
      fiscal_year: 2024,
      budget_type: 'VIREMENT_CREDITS',
      status: 'VERIFIED',
      is_current_version: false,
      version_number: 2,
      total_amount: 0,
      operating_amount: -10_000_000,
      investment_amount: 10_000_000,
      amount_precision: 'EXACT',
      operating_percentage: null,
      investment_percentage: null,
      verification_status: 'OFFICIAL_DOCUMENT',
      confidence_level: 'MEDIUM',
      sources: [],
      document_name: 'Virement de Crédits Trimestre 1',
      import_provenance: {
        precision: { total_amount: 'EXACT' },
        source: {
          name: 'Arrêté Municipal Tiassalé',
          reference: 'VIR-2024-01',
          date: '2024-03-31',
          date_kind: 'PUBLISHED'
        }
      },
      created_at: '2024-03-31T00:00:00Z',
      updated_at: '2024-03-31T00:00:00Z'
    }
  ];

  const mockExistingAccounts: AdministrativeAccount[] = [
    {
      id: 'ca-tiassale-2024',
      institution_id: 'inst-com-tiassale',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie de Tiassalé',
      fiscal_year: 2024,
      status: 'VERIFIED',
      reconciliation_status: 'SOURCE_ANOMALY',
      operating_planned: 618_000_000,
      operating_realized: 726_260_304,
      investment_planned: 389_841_000,
      investment_realized: 332_995_454,
      total_planned: 1_007_841_000,
      total_realized: 1_059_255_758,
      source_document: 'Compte administratif 2024',
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: [],
      created_at: '2024-12-31T00:00:00Z',
      updated_at: '2024-12-31T00:00:00Z'
    }
  ];

  const validMetadata: DocumentIngestionMetadata = {
    institution_id: 'inst-com-tiassale',
    institution_name: 'Mairie de Tiassalé',
    fiscal_year: 2024,
    document_type: 'BUDGET_MODIFICATIF',
    source_name: 'Délibération Conseil Municipal n°2024-05',
    source_reference: 'DELIB-2024-05',
    source_date: '2024-06-25',
    source_date_kind: 'PUBLISHED',
    source_page: 12
  };

  // TEST 14
  it('Test 14 : Valeur saisie mais non validée -> Statut PENDING, pas automatiquement HIGH/VALIDATED', () => {
    const bpTemplate = buildProposedValuesTemplate('BUDGET_PRIMITIF', { total_amount: 500_000_000 });
    
    // Le fait qu'un montant soit renseigné NE DOIT PAS le marquer VALIDATED automatiquement
    expect(bpTemplate[0].status).toBe('PENDING');
    // La confiance NE DOIT PAS être auto-HIGH
    expect(bpTemplate[0].confidence).not.toBe('HIGH');
  });

  // TEST 9
  it('Test 9 : Même document exact -> Doublon bloqué par empreinte documentaire', () => {
    // Acte ayant exactement la même collectivité, année, type, référence et date que lbud-tiassale-vir1
    const duplicateMeta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-tiassale',
      fiscal_year: 2024,
      document_type: 'VIREMENT_CREDITS',
      source_name: 'Arrêté Municipal Tiassalé',
      source_reference: 'VIR-2024-01',
      source_date: '2024-03-31',
      source_date_kind: 'PUBLISHED'
    };

    const res = runDocumentDryRun(duplicateMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.is_valid).toBe(false);
    expect(res.can_import).toBe(false);
    expect(res.checks.duplicate_detected).toBe(true);
    expect(res.errors.some(e => e.includes('Document en doublon'))).toBe(true);
  });

  // TEST 8
  it('Test 8 : Deux virements avec références différentes -> Autorisés / Pas doublons', () => {
    // Virement 2 de la même année pour la même commune avec une référence différente
    const secondVirementMeta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-tiassale',
      fiscal_year: 2024,
      document_type: 'VIREMENT_CREDITS',
      source_name: 'Arrêté Municipal Tiassalé n°2',
      source_reference: 'VIR-2024-02', // Référence différente
      source_date: '2024-09-30',
      source_date_kind: 'PUBLISHED'
    };

    const res = runDocumentDryRun(secondVirementMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.checks.duplicate_detected).toBe(false);
    expect(res.is_valid).toBe(true);
    expect(res.can_import).toBe(true);
  });

  it('Contrôle : Même référence mais autre commune -> Autorisée', () => {
    const otherCommuneMeta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-cocody', // Autre commune
      fiscal_year: 2024,
      document_type: 'VIREMENT_CREDITS',
      source_name: 'Arrêté Municipal Cocody',
      source_reference: 'VIR-2024-01', // Même libellé de référence
      source_date: '2024-03-31',
      source_date_kind: 'PUBLISHED'
    };

    const res = runDocumentDryRun(otherCommuneMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.checks.duplicate_detected).toBe(false);
    expect(res.is_valid).toBe(true);
  });

  it('Contrôle : Même référence et commune mais autre année -> Autorisée', () => {
    const otherYearMeta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-tiassale',
      fiscal_year: 2025, // Autre année
      document_type: 'VIREMENT_CREDITS',
      source_name: 'Arrêté Municipal Tiassalé',
      source_reference: 'VIR-2024-01',
      source_date: '2025-03-31',
      source_date_kind: 'PUBLISHED'
    };

    const res = runDocumentDryRun(otherYearMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.checks.duplicate_detected).toBe(false);
    expect(res.is_valid).toBe(true);
  });

  it('Dry-run : Traçabilité obligatoire (nom, référence, date de source requis)', () => {
    const invalidMeta: DocumentIngestionMetadata = {
      ...validMetadata,
      source_name: '',
      source_reference: '',
      source_date: 'date-invalide'
    };

    const res = runDocumentDryRun(invalidMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.is_valid).toBe(false);
    expect(res.errors.some(e => e.includes('Source obligatoire'))).toBe(true);
    expect(res.errors.some(e => e.includes('Référence obligatoire'))).toBe(true);
    expect(res.errors.some(e => e.includes('Date obligatoire'))).toBe(true);
  });

  it('Dry-run : Détection de conflit avec un BP déjà publié', () => {
    const conflictMeta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-cocody',
      fiscal_year: 2026,
      document_type: 'BUDGET_PRIMITIF',
      source_name: 'Dépêche AIP',
      source_reference: 'AIP-2026-COCODY',
      source_date: '2026-02-25',
      source_date_kind: 'PUBLISHED'
    };

    const res = runDocumentDryRun(conflictMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.conflicts.length).toBeGreaterThan(0);
    expect(res.can_import).toBe(false);
    expect(res.conflicts[0]).toContain('Budget Primitif PUBLIÉ existe déjà');
  });

  it('Dry-run : Règle d\'or NULL != 0 respectée (UNKNOWN avec montant non nul est rejeté)', () => {
    const proposed: ProposedFinancialValue[] = [
      { id: '1', field: 'operating_amount', label: 'Fonctionnement', section: 'FONCTIONNEMENT', nature: 'PREVISION', amount: 500_000_000, precision: 'UNKNOWN', confidence: 'MEDIUM', status: 'VALIDATED' }
    ];

    const res = runDocumentDryRun(validMetadata, proposed, {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.is_valid).toBe(false);
    expect(res.errors.some(e => e.includes('Règle d\'or violée'))).toBe(true);
  });

  it('Conversion en enveloppe standard pour data_import_rows et conservation du type réel (BS reste BS)', () => {
    const bsMeta: DocumentIngestionMetadata = {
      ...validMetadata,
      document_type: 'BUDGET_SUPPLEMENTAIRE',
      source_page: 24,
      version_number: 2
    };

    const proposed: ProposedFinancialValue[] = [
      { id: '1', field: 'total_amount', label: 'Total Delta', section: 'GLOBAL', nature: 'MODIFICATION', amount: 80_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' }
    ];

    const envelope = buildStandardImportEnvelope(bsMeta, proposed, mockInstitutions[0]);

    expect(envelope.kind).toBe('BP');
    expect(envelope.fiscal_year).toBe(2024);
    // RÈGLE : BUDGET_SUPPLEMENTAIRE reste BUDGET_SUPPLEMENTAIRE (pas écrasé en MODIFICATIF_1)
    expect(envelope.data.budget_type).toBe('BUDGET_SUPPLEMENTAIRE');
    // Numéro de version dynamique préservé
    expect(envelope.data.version_number).toBe(2);
    // Page source propagée
    expect(envelope.data.source_page).toBe(24);
    expect(envelope.source.page).toBe(24);
  });
});
