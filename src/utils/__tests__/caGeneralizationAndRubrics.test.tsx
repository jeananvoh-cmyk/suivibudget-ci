import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  extractPdfPageCountFromBuffer, 
  calculateFileSha256,
  cleanInstitutionName,
  normalizeSearchString 
} from '../caFileMatcher';
import { 
  buildProposedValuesTemplate, 
  runDocumentDryRun, 
  buildStandardImportEnvelope 
} from '../budgetDocumentDryRun';
import { AdministrativeAccountView } from '../../components/AdministrativeAccountView';
import { ADMINISTRATIVE_ACCOUNTS_DATA } from '../../data/administrativeAccountsData';
import type { Institution, AdministrativeAccount, PublicDocument } from '../../types';

describe('PR #63 — Généralisation des Comptes Administratifs et Fiches Citoyennes', () => {

  // =========================================================================
  // ÉTAPE 1 & 2 : Pagination automatique, Empreinte SHA-256 et Métadonnées
  // =========================================================================
  describe('1. Pagination automatique du PDF et Intégrité documentaire', () => {
    it('détecte le nombre de pages à partir d’un buffer PDF avec /Count', () => {
      const fakePdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 58 >>\nendobj\n%%EOF`;
      const buffer = new TextEncoder().encode(fakePdfContent).buffer;
      const count = extractPdfPageCountFromBuffer(buffer);
      expect(count).toBe(58);
    });

    it('détecte le nombre de pages en comptant les objets /Type /Page individuels', () => {
      const fakePdfContent = `%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n2 0 obj << /Type /Page >> endobj\n3 0 obj << /Type /Page >> endobj\n%%EOF`;
      const buffer = new TextEncoder().encode(fakePdfContent).buffer;
      const count = extractPdfPageCountFromBuffer(buffer);
      expect(count).toBe(3);
    });

    it('renvoie null pour un fichier qui n’est pas un PDF valide', () => {
      const fakeBuffer = new TextEncoder().encode('Ceci est un fichier texte ordinaire').buffer;
      expect(extractPdfPageCountFromBuffer(fakeBuffer)).toBeNull();
    });

    it('calcule l’empreinte cryptographique SHA-256 d’un buffer avec Web Crypto API', async () => {
      const content = 'SuiviBudget Côte d\'Ivoire — Intégrité Républicaine';
      const buffer = new TextEncoder().encode(content).buffer;
      const hash = await calculateFileSha256(buffer);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('normalise les noms d’institutions pour le rapprochement sans biais lexical', () => {
      expect(cleanInstitutionName('Mairie de Cocody')).toBe('cocody');
      expect(cleanInstitutionName('Commune de Tiassalé')).toBe('tiassale');
      expect(cleanInstitutionName('Conseil Régional du N\'Zi')).toBe('n zi');
      expect(cleanInstitutionName('Conseil Régional de San-Pedro')).toBe('san pedro');
    });
  });

  // =========================================================================
  // ÉTAPE 3 : Extraction financière contrôlée et Cas Pilote Cocody 2024
  // =========================================================================
  describe('2. Extraction financière assistée et Cas Pilote Cocody 2024', () => {
    it('génère le squelette des valeurs proposées pour un Compte Administratif avec unité FCFA et stade ORDONNANCE', () => {
      const template = buildProposedValuesTemplate('COMPTE_ADMINISTRATIF');
      expect(template.length).toBeGreaterThanOrEqual(8);
      
      const totalPlanned = template.find(v => v.field === 'total_planned');
      expect(totalPlanned).toBeDefined();
      expect(totalPlanned?.unit).toBe('FCFA');
      expect(totalPlanned?.nature).toBe('PREVISION');

      const totalRealized = template.find(v => v.field === 'total_realized');
      expect(totalRealized).toBeDefined();
      expect(totalRealized?.accounting_stage).toBe('ORDONNANCE');
      expect(totalRealized?.nature).toBe('EXECUTION');

      const opPlanned = template.find(v => v.field === 'operating_planned');
      const opRealized = template.find(v => v.field === 'operating_realized');
      const invPlanned = template.find(v => v.field === 'investment_planned');
      const invRealized = template.find(v => v.field === 'investment_realized');

      expect(opPlanned).toBeDefined();
      expect(opRealized).toBeDefined();
      expect(invPlanned).toBeDefined();
      expect(invRealized).toBeDefined();
    });

    it('exécute une simulation dry-run pour les chiffres pilotes de Cocody 2024 (pages 40 et 43)', () => {
      // Données de référence extraites du CA 2024 de Cocody
      const cocodyValues = buildProposedValuesTemplate('COMPTE_ADMINISTRATIF', {
        operating_planned: 18441235000,
        operating_realized: 15409122753,
        operating_revenue_realized: 17646256543,
        investment_planned: 3903048000,
        investment_realized: 1371427348,
        investment_revenue_realized: 1371427348,
        total_revenue_collected: 19017683891,
        total_planned: 22344283000,
        total_realized: 16780550101,
        surplus_or_deficit: 2237133790
      });

      // Valider manuellement les valeurs pour simuler l'action de l'agent habilité
      const validatedValues = cocodyValues.map(v => ({
        ...v,
        status: 'VALIDATED' as const,
        validated_by: 'admin-auditor-civic'
      }));

      const dryRunContext = {
        knownInstitutions: [
          { id: 'inst-com-cocody', name: 'Commune de Cocody', type: 'MAIRIE' } as any,
          { id: 'inst-reg-san-pedro', name: 'Conseil Régional de San-Pedro', type: 'REGION' } as any
        ],
        existingBudgets: [],
        existingAccounts: []
      };

      const metadata = {
        institution_id: 'inst-com-cocody',
        fiscal_year: 2024,
        category: 'COMPTE_ADMINISTRATIF' as const,
        document_nature: 'COMPTE_ADMINISTRATIF' as const,
        document_type: 'COMPTE_ADMINISTRATIF' as const,
        source_name: 'Mairie de Cocody — Direction Financière',
        source_reference: 'CA-2024-COCODY-VOTE',
        source_date: '2025-03-15',
        source_date_kind: 'RECORDED' as const,
        source_url: 'https://suivibudget.ci/docs/ca-cocody-2024.pdf',
        source_page: 40,
        evidence_level: 'OFFICIAL_DOCUMENT' as const,
        amount_semantics: 'REVISED_TOTAL' as const,
        notes: 'Chiffres arrêtés au compte administratif 2024 de Cocody'
      };

      const dryRun = runDocumentDryRun(metadata, validatedValues, dryRunContext);
      expect(dryRun.is_valid).toBe(true);
      expect(dryRun.errors.length).toBe(0);

      const envelope = buildStandardImportEnvelope(metadata, validatedValues, dryRunContext.knownInstitutions[0]);
      expect(envelope).toBeDefined();
      expect(envelope.kind).toBe('CA');
      expect(envelope.data.accounting_stage).toBe('ORDONNANCE');
      expect(envelope.data.operating_planned).toBe(18441235000);
      expect(envelope.data.operating_realized).toBe(15409122753);
      expect(envelope.data.investment_planned).toBe(3903048000);
      expect(envelope.data.investment_realized).toBe(1371427348);
      expect(envelope.data.total_planned).toBe(22344283000);
      expect(envelope.data.total_realized).toBe(16780550101);
    });

    it('généralise le traitement à un Conseil Régional sans branche conditionnelle en dur', () => {
      const regionValues = buildProposedValuesTemplate('COMPTE_ADMINISTRATIF', {
        operating_planned: 4500000000,
        operating_realized: 4100000000,
        operating_revenue_realized: 4600000000,
        investment_planned: 6200000000,
        investment_realized: 5800000000,
        investment_revenue_realized: 6000000000,
        total_revenue_collected: 10600000000,
        total_planned: 10700000000,
        total_realized: 9900000000,
        surplus_or_deficit: 700000000
      });

      const validated = regionValues.map(v => ({ ...v, status: 'VALIDATED' as const }));
      const metadata = {
        institution_id: 'inst-reg-san-pedro',
        fiscal_year: 2024,
        category: 'COMPTE_ADMINISTRATIF' as const,
        document_nature: 'COMPTE_ADMINISTRATIF' as const,
        document_type: 'COMPTE_ADMINISTRATIF' as const,
        source_name: 'Conseil Régional de San-Pedro',
        source_reference: 'DELIB-2025-04',
        source_date: '2025-04-10',
        source_date_kind: 'RECORDED' as const,
        evidence_level: 'OFFICIAL_DOCUMENT' as const,
        amount_semantics: 'REVISED_TOTAL' as const
      };

      const dryRunContext = {
        knownInstitutions: [
          { id: 'inst-com-cocody', name: 'Commune de Cocody', type: 'MAIRIE' } as any,
          { id: 'inst-reg-san-pedro', name: 'Conseil Régional de San-Pedro', type: 'REGION' } as any
        ],
        existingBudgets: [],
        existingAccounts: []
      };

      const dryRun = runDocumentDryRun(metadata, validated, dryRunContext);
      expect(dryRun.is_valid).toBe(true);
      expect(dryRun.errors.length).toBe(0);

      const envelope = buildStandardImportEnvelope(metadata, validated, dryRunContext.knownInstitutions[1]);
      expect(envelope.kind).toBe('CA');
      expect(envelope.data.total_planned).toBe(10700000000);
      expect(envelope.data.total_realized).toBe(9900000000);
    });
  });

  // =========================================================================
  // ÉTAPE 4 : Les 6 Rubriques Citoyennes sur la Fiche Institutionnelle
  // =========================================================================
  describe('3. Rendu structuré des 6 Rubriques Citoyennes', () => {
    const mockInstitution: Institution = {
      id: 'inst-com-cocody',
      name: 'Commune de Cocody',
      type: 'MAIRIE',
      region: 'Abidjan',
      district: 'District Autonome d\'Abidjan',
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
      total_budget_fcfa: null
    };

    const mockCA: AdministrativeAccount = {
      id: 'ca-cocody-2024',
      institution_id: 'inst-com-cocody',
      institution_name: 'Commune de Cocody',
      institution_type: 'COMMUNE',
      fiscal_year: 2024,
      status: 'PUBLISHED',
      total_planned: 22344283000,
      total_realized: 16780550101,
      operating_planned: 18441235000,
      operating_realized: 15409122753,
      operating_revenue_realized: 17646256543,
      investment_planned: 3903048000,
      investment_realized: 1371427348,
      investment_revenue_realized: 1371427348,
      surplus_or_deficit: 2237133790,
      previous_result_reported: 450000000,
      cumulative_result: 2687133790,
      accounting_stage: 'ORDONNANCE',
      source_document: 'Compte Administratif Cocody 2024',
      source_document_sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      source_url: 'https://suivibudget.ci/docs/ca-cocody-2024.pdf',
      source_page: 40,
      approval_date: '2025-03-20',
      prefecture_visa_date: '2025-04-05',
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: [
        {
          id: 'op-1',
          ca_id: 'ca-cocody-2024',
          institution_id: 'inst-com-cocody',
          fiscal_year: 2024,
          operation_reference: 'OP-2024-ECOLE-01',
          title: 'Construction groupe scolaire Angré 8ème tranche',
          sector: 'Éducation',
          location: 'Angré',
          planned_amount: 250000000,
          executed_amount: 245000000,
          source_page: 43,
          procurement_match: {
            id: 'm-1',
            tender_number: 'T-2024-089',
            contractor: 'BÂTIMENT CI SARL',
            award_amount: 245000000,
            match_level: 'STRONG',
            source: 'Portail DGMP',
            procurement_object: 'Travaux scolaires',
            verification_status: 'VERIFIED'
          },
          citizen_proofs_count: 3,
          citizen_status: 'COMPLETED'
        }
      ],
      created_at: '2025-04-10',
      updated_at: '2025-04-10'
    };

    it('affiche les six rubriques numérotées distinctes avec leur contenu respectif', () => {
      // Inoculer l'enregistrement dans la source de données pour le rendu
      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length, mockCA);

      const html = renderToStaticMarkup(
        <AdministrativeAccountView
          institution={mockInstitution}
          onOpenDocRequest={() => {}}
        />
      );

      // Rubrique 1 : Les moyens financiers
      expect(html).toContain('Rubrique 1 : Les moyens financiers');
      expect(html).toContain('Prévisions Définitives');
      expect(html).toContain('22 344 283 000 FCFA'); // Montant prévisions définitives

      // Rubrique 2 : Les recettes et les dépenses
      expect(html).toContain('Rubrique 2 : Les recettes et les dépenses');
      expect(html).toContain('Stade comptable : ORDONNANCE');
      expect(html).toContain('Recettes Recouvrées');
      expect(html).toContain('Dépenses Exécutées');
      expect(html).toContain('16 780 550 101 FCFA'); // Dépenses totales exécutées
      expect(html).toContain('Excédent : +');
      expect(html).toContain('Reports antérieurs');
      expect(html).toContain('Résultat cumulé final');

      // Rubrique 3 : Fonctionnement et investissement
      expect(html).toContain('Rubrique 3 : Fonctionnement et investissement');
      expect(html).toContain('Section Fonctionnement');
      expect(html).toContain('Section Investissement');
      expect(html).toContain('Salaires des agents municipaux');
      expect(html).toContain('Équipements durables');
      expect(html).toContain('18 441 235 000 FCFA'); // Fonctionnement prévu
      expect(html).toContain('15 409 122 753 FCFA'); // Fonctionnement réalisé
      expect(html).toContain('3 903 048 000 FCFA'); // Investissement prévu
      expect(html).toContain('1 371 427 348 FCFA'); // Investissement réalisé

      // Rubrique 4 : Opérations et investissements identifiés
      expect(html).toContain('Rubrique 4 : Opérations et investissements identifiés');
      expect(html).toContain('Construction groupe scolaire Angré 8ème tranche');
      expect(html).toContain('OP-2024-ECOLE-01');
      expect(html).toContain('BÂTIMENT CI SARL');
      expect(html).toContain('Page 43 du CA');

      // Rubrique 5 : Suivi citoyen sur le terrain
      expect(html).toContain('Rubrique 5 : Suivi citoyen sur le terrain');
      expect(html).toContain('Principe républicain : Réalisé financier ≠ Réalisation physique');
      expect(html).toContain('Transmettre une observation ou une photo');

      // Rubrique 6 : Sources et vérification
      expect(html).toContain('Rubrique 6 : Sources et vérification');
      expect(html).toContain('Compte Administratif Cocody 2024');
      expect(html).toContain('Loi CAIDP n° 2013-867');
      expect(html).toContain('Demande CAIDP');
      expect(html).toContain('SHA-256 :');
      expect(html).toContain('Copier le hash');
    });

    it('n’affiche jamais 0 FCFA trompeur lorsque le budget primitif est inconnu', () => {
      const caWithoutBP: AdministrativeAccount = {
        ...mockCA,
        id: 'ca-no-bp',
        initial_budget_total: undefined
      };

      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length, caWithoutBP);

      const html = renderToStaticMarkup(
        <AdministrativeAccountView
          institution={mockInstitution}
          onOpenDocRequest={() => {}}
        />
      );

      // Doit afficher "Non documenté au CA", JAMAIS "0 FCFA" dans la case Budget Primitif
      expect(html).toContain('Non documenté au CA');
      expect(html).not.toContain('>0 FCFA<');
      expect(html).not.toContain('>0&nbsp;FCFA<');
    });

    it('affiche l’état d’attente républicain lorsqu’aucun compte administratif n’est disponible', () => {
      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length); // Aucun CA

      const unknownInst: Institution = {
        id: 'inst-com-inconnue',
        name: 'Commune Rurale Inconnue',
        type: 'MAIRIE',
        region: 'Hambol',
        district: 'Vallée du Bandama',
        budget_functioning_fcfa: null,
        budget_investment_fcfa: null,
        total_budget_fcfa: null
      };

      const html = renderToStaticMarkup(
        <AdministrativeAccountView
          institution={unknownInst}
          onOpenDocRequest={() => {}}
        />
      );

      expect(html).toContain('Compte Administratif non disponible');
      expect(html).toContain('Faire une demande de Compte Administratif (Loi CAIDP)');
      expect(html).toContain('Qu&#x27;est-ce qu&#x27;un compte administratif ?');
    });
  });
});
