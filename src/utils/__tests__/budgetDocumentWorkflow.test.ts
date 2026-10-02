import { describe, it, expect } from 'vitest';
import { 
  buildProposedValuesTemplate, 
  runDocumentDryRun, 
  buildStandardImportEnvelope 
} from '../budgetDocumentDryRun';
import type { DocumentIngestionMetadata, ProposedFinancialValue } from '../../types/budgetCycle';
import type { Institution } from '../../types';
import type { LocalBudget } from '../../types/localBudget';
import type { AdministrativeAccount } from '../../types/administrativeAccount';

describe('Budget Document Workflow — Dry-Run & Assistant Documentaire', () => {

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
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
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

  it('1. Génération de template selon le type d\'acte sans fausse IA', () => {
    const bpTemplate = buildProposedValuesTemplate('BUDGET_PRIMITIF');
    expect(bpTemplate.map(t => t.field)).toEqual(['total_amount', 'operating_amount', 'investment_amount']);

    const caTemplate = buildProposedValuesTemplate('COMPTE_ADMINISTRATIF');
    expect(caTemplate.map(t => t.field)).toEqual([
      'total_planned', 'total_realized', 
      'operating_planned', 'operating_realized', 
      'investment_planned', 'investment_realized'
    ]);
  });

  it('2. Dry-run : Détection d\'institution inexistante', () => {
    const invalidMeta: DocumentIngestionMetadata = {
      ...validMetadata,
      institution_id: 'inst-inconnue-999'
    };

    const res = runDocumentDryRun(invalidMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.is_valid).toBe(false);
    expect(res.can_import).toBe(false);
    expect(res.errors.some(e => e.includes('Collectivité inconnue'))).toBe(true);
  });

  it('3. Dry-run : Détection d\'exercice budgétaire incohérent', () => {
    const invalidMeta: DocumentIngestionMetadata = {
      ...validMetadata,
      fiscal_year: 1995 // Hors de [2000, 2100]
    };

    const res = runDocumentDryRun(invalidMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.is_valid).toBe(false);
    expect(res.errors.some(e => e.includes('Exercice incohérent'))).toBe(true);
  });

  it('4. Dry-run : Traçabilité obligatoire (nom, référence, date de source requis)', () => {
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

  it('5. Dry-run : Détection de conflit avec un BP déjà publié', () => {
    const conflictMeta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-cocody',
      fiscal_year: 2026,
      document_type: 'BUDGET_PRIMITIF',
      source_name: 'Dépêche AIP',
      source_reference: 'AIP-2026',
      source_date: '2026-01-05',
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

  it('6. Dry-run : Détection d\'incohérence arithmétique (Total != Fonctionnement + Investissement)', () => {
    const proposed: ProposedFinancialValue[] = [
      { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'PREVISION', amount: 1_000_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' },
      { id: '2', field: 'operating_amount', label: 'Fonctionnement', section: 'FONCTIONNEMENT', nature: 'PREVISION', amount: 600_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' },
      { id: '3', field: 'investment_amount', label: 'Investissement', section: 'INVESTISSEMENT', nature: 'PREVISION', amount: 300_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' } // Somme = 900M != 1000M
    ];

    const res = runDocumentDryRun(validMetadata, proposed, {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.is_valid).toBe(false);
    expect(res.errors.some(e => e.includes('Incompatibilité arithmétique'))).toBe(true);
  });

  it('7. Dry-run : Règle d\'or NULL != 0 respectée (UNKNOWN avec montant non nul est rejeté)', () => {
    const proposed: ProposedFinancialValue[] = [
      { id: '1', field: 'operating_amount', label: 'Fonctionnement', section: 'FONCTIONNEMENT', nature: 'PREVISION', amount: 500_000_000, precision: 'UNKNOWN', confidence: 'HIGH', status: 'VALIDATED' }
    ];

    const res = runDocumentDryRun(validMetadata, proposed, {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.is_valid).toBe(false);
    expect(res.errors.some(e => e.includes('Règle d\'or violée'))).toBe(true);
  });

  it('8. Dry-run : Zéro réel est accepté et distingué de NULL', () => {
    const proposed: ProposedFinancialValue[] = [
      { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 100_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' },
      { id: '2', field: 'operating_amount', label: 'Fonctionnement', section: 'FONCTIONNEMENT', nature: 'MODIFICATION', amount: 100_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' },
      { id: '3', field: 'investment_amount', label: 'Investissement', section: 'INVESTISSEMENT', nature: 'MODIFICATION', amount: 0, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' } // Zéro réel
    ];

    const res = runDocumentDryRun(validMetadata, proposed, {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.is_valid).toBe(true);
    expect(res.can_import).toBe(true);
    expect(res.checks.zero_values_count).toBe(1);
    expect(res.checks.unknown_values_count).toBe(0);
  });

  it('9. Conversion en enveloppe standard pour le pipeline d\'import (data_import_rows)', () => {
    const proposed: ProposedFinancialValue[] = [
      { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 80_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' },
      { id: '2', field: 'operating_amount', label: 'Fonctionnement', section: 'FONCTIONNEMENT', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' },
      { id: '3', field: 'investment_amount', label: 'Investissement', section: 'INVESTISSEMENT', nature: 'MODIFICATION', amount: 30_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' }
    ];

    const envelope = buildStandardImportEnvelope(validMetadata, proposed, mockInstitutions[0]);

    expect(envelope.kind).toBe('BP');
    expect(envelope.institution_id).toBe('inst-com-tiassale');
    expect(envelope.institution_type).toBe('COMMUNE');
    expect(envelope.fiscal_year).toBe(2024);
    expect(envelope.data.total_amount).toBe(80_000_000);
    expect(envelope.precision.total_amount).toBe('EXACT');
    expect(envelope.source.name).toBe('Délibération Conseil Municipal n°2024-05');
  });

  it('10. Workflow découplé : Import != Publication', () => {
    // Vérification du principe fondamental : un document importé prend le statut TO_VERIFY
    // et ne peut être publié sans transition explicite (VERIFIED -> PUBLISHED).
    expect(validMetadata.document_type).toBe('BUDGET_MODIFICATIF');
    // Le statut d'un nouvel import généré n'est JAMAIS publié d'office
    const envelope = buildStandardImportEnvelope(validMetadata, [], mockInstitutions[0]);
    expect((envelope.data as any).status).toBeUndefined(); // Le statut en table est DRAFT / staging TO_VERIFY
  });
});
