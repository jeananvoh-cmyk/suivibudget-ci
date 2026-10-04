import { describe, it, expect } from 'vitest';
import { 
  buildProposedValuesTemplate, 
  runDocumentDryRun, 
  buildStandardImportEnvelope,
  computeDocumentFingerprint,
  normalizeDocumentIdentityType,
  isImportableValueStatus,
  isImportableValue
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
    source_page: 12,
    amount_semantics: 'DELTA'
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
      source_date_kind: 'PUBLISHED',
      amount_semantics: 'DELTA'
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
      source_date_kind: 'PUBLISHED',
      amount_semantics: 'DELTA'
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
      source_date_kind: 'PUBLISHED',
      amount_semantics: 'DELTA'
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
      source_date_kind: 'PUBLISHED',
      amount_semantics: 'DELTA'
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
      source_name: 'Autre Document Cocody',
      source_reference: 'DELIB-2026-NOUVELLE',
      source_date: '2026-03-01',
      source_date_kind: 'PUBLISHED'
    };

    const res = runDocumentDryRun(conflictMeta, [], {
      knownInstitutions: mockInstitutions,
      existingBudgets: mockExistingBudgets,
      existingAccounts: mockExistingAccounts
    });

    expect(res.conflicts.length).toBeGreaterThan(0);
    expect(res.can_import).toBe(false);
    expect(res.conflicts.some(c => c.includes('Budget Primitif PUBLIÉ existe déjà'))).toBe(true);
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

  // TESTS SUPPLÉMENTAIRES : GATE FINAL QUALITÉ PR #14

  describe('Validation humaine obligatoire et statuts autorisés', () => {
    it('Statut PENDING bloque formellement l\'importation (can_import = false)', () => {
      const proposed: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'PENDING' }
      ];

      const res = runDocumentDryRun(validMetadata, proposed, {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });

      expect(res.is_valid).toBe(false);
      expect(res.can_import).toBe(false);
      expect(res.errors.some(e => e.includes('Validation humaine requise'))).toBe(true);
    });

    it('Statuts VALIDATED, CORRECTED et MARKED_UNKNOWN (montant null) autorisent l\'importation', () => {
      const proposed: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' },
        { id: '2', field: 'operating_amount', label: 'Fonctionnement', section: 'FONCTIONNEMENT', nature: 'MODIFICATION', amount: 30_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'CORRECTED', original_amount: 25_000_000, correction_reason: 'Rectification erreur dactylographique' },
        { id: '3', field: 'investment_amount', label: 'Investissement', section: 'INVESTISSEMENT', nature: 'MODIFICATION', amount: 20_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' },
        { id: '4', field: 'other_amount', label: 'Autre', section: 'AUTRE', nature: 'MODIFICATION', amount: null, precision: 'UNKNOWN', confidence: 'LOW', status: 'MARKED_UNKNOWN' }
      ];

      const res = runDocumentDryRun(validMetadata, proposed, {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });

      expect(res.is_valid).toBe(true);
      expect(res.can_import).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('Statut MARKED_UNKNOWN avec montant non null bloque l\'importation (règle NULL != 0)', () => {
      const proposed: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'MARKED_UNKNOWN' }
      ];

      const res = runDocumentDryRun(validMetadata, proposed, {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });

      expect(res.is_valid).toBe(false);
      expect(res.can_import).toBe(false);
      expect(res.errors.some(e => e.includes('Règle d\'or violée'))).toBe(true);
    });

    it('Statut REJECTED est exclu de l\'enveloppe d\'importation et ne bloque pas les valeurs validées', () => {
      const proposed: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' },
        { id: '2', field: 'operating_amount', label: 'Fonctionnement', section: 'FONCTIONNEMENT', nature: 'MODIFICATION', amount: 999_999, precision: 'EXACT', confidence: 'LOW', status: 'REJECTED' }
      ];

      const res = runDocumentDryRun(validMetadata, proposed, {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });

      expect(res.is_valid).toBe(true);
      expect(res.can_import).toBe(true);
      expect(res.warnings.some(w => w.includes('rejetée(s)'))).toBe(true);

      const envelope = buildStandardImportEnvelope(validMetadata, proposed, mockInstitutions[0]);
      expect(envelope.data.total_amount).toBe(50_000_000);
      expect(envelope.data.operating_amount).toBeUndefined();
    });

    it('Si toutes les valeurs sont REJECTED, l\'importation est bloquée', () => {
      const proposed: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'LOW', status: 'REJECTED' }
      ];

      const res = runDocumentDryRun(validMetadata, proposed, {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });

      expect(res.is_valid).toBe(false);
      expect(res.can_import).toBe(false);
      expect(res.errors.some(e => e.includes('Aucune valeur retenue'))).toBe(true);
    });

    it('Helper isImportableValueStatus : valide uniquement VALIDATED, CORRECTED, MARKED_UNKNOWN', () => {
      expect(isImportableValueStatus('VALIDATED')).toBe(true);
      expect(isImportableValueStatus('CORRECTED')).toBe(true);
      expect(isImportableValueStatus('MARKED_UNKNOWN')).toBe(true);
      expect(isImportableValueStatus('PENDING')).toBe(false);
      expect(isImportableValueStatus('REJECTED')).toBe(false);
    });
  });

  describe('Sémantique financière stricte pour les actes modificatifs', () => {
    it('Acte modificatif avec sémantique UNKNOWN ou absente est bloqué (can_import = false)', () => {
      const metaUnknown: DocumentIngestionMetadata = {
        ...validMetadata,
        amount_semantics: 'UNKNOWN'
      };

      const resUnknown = runDocumentDryRun(metaUnknown, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });

      expect(resUnknown.is_valid).toBe(false);
      expect(resUnknown.can_import).toBe(false);
      expect(resUnknown.errors.some(e => e.includes('sémantique des montants'))).toBe(true);

      const metaUndefined: DocumentIngestionMetadata = {
        ...validMetadata,
        amount_semantics: undefined
      };

      const resUndefined = runDocumentDryRun(metaUndefined, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });

      expect(resUndefined.is_valid).toBe(false);
      expect(resUndefined.can_import).toBe(false);
      expect(resUndefined.errors.some(e => e.includes('sémantique des montants'))).toBe(true);
    });

    it('Acte modificatif avec sémantique DELTA ou REVISED_TOTAL est autorisé', () => {
      const metaDelta: DocumentIngestionMetadata = {
        ...validMetadata,
        amount_semantics: 'DELTA'
      };
      const resDelta = runDocumentDryRun(metaDelta, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });
      expect(resDelta.is_valid).toBe(true);
      expect(resDelta.can_import).toBe(true);

      const metaRevised: DocumentIngestionMetadata = {
        ...validMetadata,
        amount_semantics: 'REVISED_TOTAL'
      };
      const resRevised = runDocumentDryRun(metaRevised, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });
      expect(resRevised.is_valid).toBe(true);
      expect(resRevised.can_import).toBe(true);
    });
  });

  describe('Gestion du numéro de version : officiel préservé, inconnu non inventé', () => {
    it('Préserve la version officielle si spécifiée', () => {
      const metaWithVersion: DocumentIngestionMetadata = {
        ...validMetadata,
        version_number: 3
      };
      const validVal: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' }
      ];
      const envelope = buildStandardImportEnvelope(metaWithVersion, validVal, mockInstitutions[0]);
      expect(envelope.data.version_number).toBe(3);
    });

    it('Ne génère aucun numéro de version arbitraire (1 ou existant+1) si la version officielle est inconnue', () => {
      const metaWithoutVersion: DocumentIngestionMetadata = {
        ...validMetadata,
        version_number: undefined
      };
      const validVal: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' }
      ];
      const envelope = buildStandardImportEnvelope(metaWithoutVersion, validVal, mockInstitutions[0]);
      expect(envelope.data.version_number).toBeUndefined();
    });
  });

  describe('Normalisation canonique des types et calcul du fingerprint déterministe', () => {
    it('normalizeDocumentIdentityType établit l\'équivalence canonique BUDGET_PRIMITIF <-> PRIMITIF_ADOPTE', () => {
      expect(normalizeDocumentIdentityType('BUDGET_PRIMITIF')).toBe('PRIMITIF_ADOPTE');
      expect(normalizeDocumentIdentityType('PRIMITIF_ADOPTE')).toBe('PRIMITIF_ADOPTE');
      expect(normalizeDocumentIdentityType('budget_primitif')).toBe('PRIMITIF_ADOPTE');
      expect(normalizeDocumentIdentityType('primitif_adopte')).toBe('PRIMITIF_ADOPTE');
    });

    it('normalizeDocumentIdentityType préserve formellement les types distincts', () => {
      expect(normalizeDocumentIdentityType('PRIMITIF_APRES_TUTELLE')).toBe('PRIMITIF_APRES_TUTELLE');
      expect(normalizeDocumentIdentityType('AUTORISATION_EXECUTION')).toBe('AUTORISATION_EXECUTION');
      expect(normalizeDocumentIdentityType('BUDGET_SUPPLEMENTAIRE')).toBe('BUDGET_SUPPLEMENTAIRE');
      expect(normalizeDocumentIdentityType('MODIFICATIF_1')).toBe('MODIFICATIF_1');
      expect(normalizeDocumentIdentityType('MODIFICATIF_2')).toBe('MODIFICATIF_2');
      expect(normalizeDocumentIdentityType('BUDGET_MODIFICATIF')).toBe('BUDGET_MODIFICATIF');
      expect(normalizeDocumentIdentityType('AUTRE_MODIFICATIF')).toBe('BUDGET_MODIFICATIF');
      expect(normalizeDocumentIdentityType('DECISION_MODIFICATIVE')).toBe('DECISION_MODIFICATIVE');
      expect(normalizeDocumentIdentityType('VIREMENT_CREDITS')).toBe('VIREMENT_CREDITS');
      expect(normalizeDocumentIdentityType('COMPTE_ADMINISTRATIF')).toBe('COMPTE_ADMINISTRATIF');
    });

    it('Cross-vocabulaire : BUDGET_PRIMITIF ingéré vs PRIMITIF_ADOPTE en base déclenche la détection de doublon', () => {
      // Cocody a déjà un budget en base avec budget_type: 'PRIMITIF_ADOPTE', ref 'AIP-2026-COCODY', date '2026-02-25'
      const consoleIngestedMeta: DocumentIngestionMetadata = {
        institution_id: 'inst-com-cocody',
        fiscal_year: 2026,
        document_type: 'BUDGET_PRIMITIF', // Vocabulaire console
        source_name: 'AIP Cocody',
        source_reference: 'AIP-2026-COCODY',
        source_date: '2026-02-25',
        source_date_kind: 'PUBLISHED'
      };

      const res = runDocumentDryRun(consoleIngestedMeta, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: mockExistingBudgets,
        existingAccounts: mockExistingAccounts
      });

      expect(res.checks.duplicate_detected).toBe(true);
      expect(res.is_valid).toBe(false);
      expect(res.can_import).toBe(false);
      expect(res.errors.some(e => e.includes('Document en doublon'))).toBe(true);
    });

    it('Actes distincts : BM1 vs BM2, BS vs BM et virements restent strictement distincts', () => {
      const fpBM1 = computeDocumentFingerprint({
        institution_id: 'inst-com-tiassale',
        fiscal_year: 2024,
        document_type: 'MODIFICATIF_1',
        source_reference: 'DELIB-01',
        source_date: '2024-06-01'
      });

      const fpBM2 = computeDocumentFingerprint({
        institution_id: 'inst-com-tiassale',
        fiscal_year: 2024,
        document_type: 'MODIFICATIF_2',
        source_reference: 'DELIB-01',
        source_date: '2024-06-01'
      });

      const fpBS = computeDocumentFingerprint({
        institution_id: 'inst-com-tiassale',
        fiscal_year: 2024,
        document_type: 'BUDGET_SUPPLEMENTAIRE',
        source_reference: 'DELIB-01',
        source_date: '2024-06-01'
      });

      const fpVir1 = computeDocumentFingerprint({
        institution_id: 'inst-com-tiassale',
        fiscal_year: 2024,
        document_type: 'VIREMENT_CREDITS',
        source_reference: 'VIR-01',
        source_date: '2024-06-01'
      });

      const fpVir2 = computeDocumentFingerprint({
        institution_id: 'inst-com-tiassale',
        fiscal_year: 2024,
        document_type: 'VIREMENT_CREDITS',
        source_reference: 'VIR-02',
        source_date: '2024-06-01'
      });

      expect(fpBM1).not.toBe(fpBM2);
      expect(fpBM1).not.toBe(fpBS);
      expect(fpVir1).not.toBe(fpVir2);
    });
  });

  describe('Frontière d’importation et validation humaine obligatoire (Tests A-G)', () => {
    const validMeta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-tiassale',
      fiscal_year: 2024,
      document_type: 'BUDGET_MODIFICATIF',
      source_name: 'Délibération Conseil',
      source_reference: 'DELIB-2024-01',
      source_date: '2024-06-15',
      source_date_kind: 'PUBLISHED',
      amount_semantics: 'DELTA'
    };

    it('Test A : Une valeur PENDING ne peut JAMAIS être sérialisée dans une enveloppe (rejet explicite)', () => {
      const values: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'PENDING' }
      ];
      expect(() => buildStandardImportEnvelope(validMeta, values, mockInstitutions[0]))
        .toThrow(/Validation humaine obligatoire.*PENDING/);
    });

    it('Test B : Les valeurs REJECTED restent formellement exclues de l’enveloppe d’importation', () => {
      const values: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total Voté', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' },
        { id: '2', field: 'operating_amount', label: 'Fonctionnement Rejeté', section: 'FONCTIONNEMENT', nature: 'MODIFICATION', amount: 20_000_000, precision: 'EXACT', confidence: 'LOW', status: 'REJECTED' }
      ];
      const envelope = buildStandardImportEnvelope(validMeta, values, mockInstitutions[0]);
      expect(envelope.data.total_amount).toBe(50_000_000);
      expect(envelope.data.operating_amount).toBeUndefined();
      expect(envelope.precision.operating_amount).toBeUndefined();
    });

    it('Test C : Une valeur VALIDATED est acceptée et sérialisée', () => {
      const values: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 45_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' }
      ];
      const envelope = buildStandardImportEnvelope(validMeta, values, mockInstitutions[0]);
      expect(envelope.data.total_amount).toBe(45_000_000);
      expect(envelope.precision.total_amount).toBe('EXACT');
    });

    it('Test D : Une valeur CORRECTED est acceptée avec le montant rectifié', () => {
      const values: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total Rectifié', section: 'GLOBAL', nature: 'MODIFICATION', amount: 60_000_000, original_amount: 50_000_000, correction_reason: 'Rectification procès-verbal', precision: 'EXACT', confidence: 'HIGH', status: 'CORRECTED' }
      ];
      const envelope = buildStandardImportEnvelope(validMeta, values, mockInstitutions[0]);
      expect(envelope.data.total_amount).toBe(60_000_000);
    });

    it('Test E : MARKED_UNKNOWN avec amount null est accepté en conservant strictement la valeur null', () => {
      const values: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' },
        { id: '2', field: 'investment_amount', label: 'Investissement Non Précisé', section: 'INVESTISSEMENT', nature: 'MODIFICATION', amount: null, precision: 'UNKNOWN', confidence: 'LOW', status: 'MARKED_UNKNOWN' }
      ];
      const envelope = buildStandardImportEnvelope(validMeta, values, mockInstitutions[0]);
      expect(envelope.data.total_amount).toBe(50_000_000);
      expect(envelope.data.investment_amount).toBeNull();
      expect(envelope.precision.investment_amount).toBe('UNKNOWN');
    });

    it('Test F : MARKED_UNKNOWN avec montant non null est rejeté (violation règle d\'or)', () => {
      const values: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total Incohérent', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'UNKNOWN', confidence: 'LOW', status: 'MARKED_UNKNOWN' }
      ];
      expect(() => buildStandardImportEnvelope(validMeta, values, mockInstitutions[0]))
        .toThrow(/Règle d'or violée.*MARKED_UNKNOWN.*non nulle/);
    });

    it('Test G : Une enveloppe ne peut JAMAIS être construite avec uniquement des valeurs non importables', () => {
      // Cas 1 : aucune valeur
      expect(() => buildStandardImportEnvelope(validMeta, [], mockInstitutions[0]))
        .toThrow(/Impossible de construire une enveloppe d'importation sans aucune valeur financière importable/);

      // Cas 2 : uniquement REJECTED
      const onlyRejected: ProposedFinancialValue[] = [
        { id: '1', field: 'total_amount', label: 'Total Rejeté', section: 'GLOBAL', nature: 'MODIFICATION', amount: 50_000_000, precision: 'EXACT', confidence: 'LOW', status: 'REJECTED' }
      ];
      expect(() => buildStandardImportEnvelope(validMeta, onlyRejected, mockInstitutions[0]))
        .toThrow(/Impossible de construire une enveloppe d'importation sans aucune valeur financière importable/);
    });

    it('Helper isImportableValue qualifie rigoureusement chaque valeur', () => {
      expect(isImportableValue({ id: '1', field: 'x', label: 'x', section: 'GLOBAL', nature: 'PREVISION', amount: 100, precision: 'EXACT', confidence: 'HIGH', status: 'VALIDATED' })).toBe(true);
      expect(isImportableValue({ id: '2', field: 'x', label: 'x', section: 'GLOBAL', nature: 'PREVISION', amount: 100, precision: 'EXACT', confidence: 'HIGH', status: 'CORRECTED' })).toBe(true);
      expect(isImportableValue({ id: '3', field: 'x', label: 'x', section: 'GLOBAL', nature: 'PREVISION', amount: null, precision: 'UNKNOWN', confidence: 'LOW', status: 'MARKED_UNKNOWN' })).toBe(true);
      expect(isImportableValue({ id: '4', field: 'x', label: 'x', section: 'GLOBAL', nature: 'PREVISION', amount: 100, precision: 'UNKNOWN', confidence: 'LOW', status: 'MARKED_UNKNOWN' })).toBe(false);
      expect(isImportableValue({ id: '5', field: 'x', label: 'x', section: 'GLOBAL', nature: 'PREVISION', amount: 100, precision: 'EXACT', confidence: 'MEDIUM', status: 'PENDING' })).toBe(false);
      expect(isImportableValue({ id: '6', field: 'x', label: 'x', section: 'GLOBAL', nature: 'PREVISION', amount: 100, precision: 'EXACT', confidence: 'LOW', status: 'REJECTED' })).toBe(false);
    });
  });

  describe('Détection conservative de conflit avec BP publié — 4 cas de versions (sans fallback artificiel)', () => {
    const baseExistingBudget: LocalBudget = {
      id: 'lbud-bp-published',
      institution_id: 'inst-com-tiassale',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie de Tiassalé',
      fiscal_year: 2025,
      budget_type: 'PRIMITIF_ADOPTE',
      status: 'PUBLISHED',
      is_current_version: true,
      total_amount: 1_000_000_000,
      operating_amount: 500_000_000,
      investment_amount: 500_000_000,
      amount_precision: 'EXACT',
      operating_percentage: 50,
      investment_percentage: 50,
      verification_status: 'OFFICIAL_DOCUMENT',
      confidence_level: 'HIGH',
      sources: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    const bpMeta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-tiassale',
      fiscal_year: 2025,
      document_type: 'BUDGET_PRIMITIF',
      source_name: 'Délibération Conseil',
      source_reference: 'DELIB-BP-2025-NEW',
      source_date: '2025-01-15',
      source_date_kind: 'PUBLISHED'
    };

    it('Cas 1A : Version existante connue (1) + nouvelle version connue inférieure ou égale (1) -> Conflit bloquant', () => {
      const existingWithVer = [{ ...baseExistingBudget, version_number: 1 }];
      const meta = { ...bpMeta, version_number: 1 };
      const res = runDocumentDryRun(meta, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: existingWithVer,
        existingAccounts: []
      });
      expect(res.checks.conflicts_with_published).toBe(true);
      expect(res.can_import).toBe(false);
      expect(res.conflicts[0]).toContain('version 1');
      expect(res.conflicts[0]).toContain('numéro strictement supérieur');
    });

    it('Cas 1B : Version existante connue (1) + nouvelle version connue strictement supérieure (2) -> Autorisé (pas de conflit)', () => {
      const existingWithVer = [{ ...baseExistingBudget, version_number: 1 }];
      const meta = { ...bpMeta, version_number: 2 };
      const res = runDocumentDryRun(meta, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: existingWithVer,
        existingAccounts: []
      });
      expect(res.checks.conflicts_with_published).toBe(false);
      expect(res.can_import).toBe(true);
      expect(res.conflicts.length).toBe(0);
    });

    it('Cas 2 : Version existante connue (1) + nouvelle version inconnue (undefined) -> Conflit bloquant', () => {
      const existingWithVer = [{ ...baseExistingBudget, version_number: 1 }];
      const meta = { ...bpMeta, version_number: undefined };
      const res = runDocumentDryRun(meta, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: existingWithVer,
        existingAccounts: []
      });
      expect(res.checks.conflicts_with_published).toBe(true);
      expect(res.can_import).toBe(false);
      expect(res.conflicts[0]).toContain('ne précise aucun numéro de version officiel');
    });

    it('Cas 3 : Version existante inconnue (undefined) + nouvelle version connue (2) -> Conflit bloquant (arbitrage requis)', () => {
      const existingWithoutVer = [{ ...baseExistingBudget, version_number: undefined }];
      const meta = { ...bpMeta, version_number: 2 };
      const res = runDocumentDryRun(meta, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: existingWithoutVer,
        existingAccounts: []
      });
      expect(res.checks.conflicts_with_published).toBe(true);
      expect(res.can_import).toBe(false);
      expect(res.conflicts[0]).toContain('sans numéro de version attesté');
      expect(res.conflicts[0]).toContain('Une revue humaine est requise');
    });

    it('Cas 4 : Versions existante (undefined) et nouvelle (undefined) inconnues -> Conflit bloquant', () => {
      const existingWithoutVer = [{ ...baseExistingBudget, version_number: undefined }];
      const meta = { ...bpMeta, version_number: undefined };
      const res = runDocumentDryRun(meta, [], {
        knownInstitutions: mockInstitutions,
        existingBudgets: existingWithoutVer,
        existingAccounts: []
      });
      expect(res.checks.conflicts_with_published).toBe(true);
      expect(res.can_import).toBe(false);
      expect(res.conflicts[0]).toContain('Deux documents non versionnés ne peuvent coexister');
    });
  });
  it('Enveloppe : une dépêche AIP ne devient jamais un document officiel primaire', () => {
    const meta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-tiassale',
      institution_name: 'Mairie de Tiassalé',
      fiscal_year: 2024,
      document_type: 'BUDGET_PRIMITIF',
      source_name: 'Agence Ivoirienne de Presse',
      source_reference: 'AIP-TIASSALE-2024-03-13',
      source_date: '2024-03-13',
      source_date_kind: 'PUBLISHED',
      evidence_level: 'AIP_VERIFIED',
      adoption_date: '2024-03-12'
    };
    const proposed: ProposedFinancialValue[] = [
      { id: '1', field: 'total_amount', label: 'Total', section: 'GLOBAL', nature: 'PREVISION', amount: 820_150_000, precision: 'APPROXIMATE', confidence: 'HIGH', status: 'VALIDATED' },
      { id: '2', field: 'operating_amount', label: 'Fonctionnement', section: 'FONCTIONNEMENT', nature: 'PREVISION', amount: null, precision: 'UNKNOWN', confidence: 'LOW', status: 'MARKED_UNKNOWN' },
      { id: '3', field: 'investment_amount', label: 'Investissement', section: 'INVESTISSEMENT', nature: 'PREVISION', amount: null, precision: 'UNKNOWN', confidence: 'LOW', status: 'MARKED_UNKNOWN' }
    ];
    const envelope = buildStandardImportEnvelope(meta, proposed, mockInstitutions[0]);
    expect(envelope.data.verification_status).toBe('AIP_VERIFIED');
    expect(envelope.data.total_amount).toBe(820_150_000);
    expect(envelope.data.adoption_date).toBe('2024-03-12');
    expect(envelope.data.operating_amount).toBeNull();
    expect(envelope.data.investment_amount).toBeNull();
  });

});
