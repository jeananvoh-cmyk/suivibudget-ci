import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync } from 'node:fs';
import { 
  extractPdfPageCountFromBuffer, 
  calculateFileSha256,
  cleanInstitutionName
} from '../caFileMatcher';
import { 
  buildProposedValuesTemplate, 
  runDocumentDryRun, 
  buildStandardImportEnvelope 
} from '../budgetDocumentDryRun';
import { AdministrativeAccountView, getOperationPhysicalStatusLabel } from '../../components/AdministrativeAccountView';
import { ADMINISTRATIVE_ACCOUNTS_DATA } from '../../data/administrativeAccountsData';
import { dataStore } from '../../services/dataStore';
import type { Institution, AdministrativeAccount, PublicDocument } from '../../types';
import type { LocalBudget } from '../../types/localBudget';

describe('PR #63 — Généralisation des Comptes Administratifs et Fiches Citoyennes', () => {
  beforeEach(() => {
    ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length);
  });

  // =========================================================================
  // PRIORITÉ 3 : Compteur de pages PDF fiable, Empreinte SHA-256 et Métadonnées
  // =========================================================================
  describe('1. Compteur de pages PDF fiable et Intégrité documentaire (Priorité 3)', () => {
    it('détecte le nombre de pages à partir de la racine /Catalog -> /Pages /Count', () => {
      const fakePdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 58 >>\nendobj\n%%EOF`;
      const buffer = new TextEncoder().encode(fakePdfContent).buffer;
      const count = extractPdfPageCountFromBuffer(buffer);
      expect(count).toBe(58);
    });

    it('ignore les compteurs non liés aux pages (/Outlines /Count) et suit l’arbre /Pages', () => {
      const pdfWithOutlines = [
        '%PDF-1.4',
        '1 0 obj << /Type /Catalog /Pages 2 0 R /Outlines 3 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [4 0 R 5 0 R] /Count 22 >> endobj',
        '3 0 obj << /Type /Outlines /Count 999 >> endobj',
        '4 0 obj << /Type /Page /Parent 2 0 R >> endobj',
        '5 0 obj << /Type /Page /Parent 2 0 R >> endobj',
        'trailer << /Root 1 0 R >>',
        '%%EOF'
      ].join('\n');
      const buffer = new TextEncoder().encode(pdfWithOutlines).buffer;
      expect(extractPdfPageCountFromBuffer(buffer)).toBe(22);
    });

    it('prend en compte les mises à jour incrémentales PDF (dernière révision de l’objet /Pages)', () => {
      const incrementalPdf = [
        '%PDF-1.4',
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 10 >> endobj',
        '%%EOF',
        '2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 44 >> endobj',
        'trailer << /Root 1 0 R >>',
        '%%EOF'
      ].join('\n');
      const buffer = new TextEncoder().encode(incrementalPdf).buffer;
      expect(extractPdfPageCountFromBuffer(buffer)).toBe(44);
    });

    it('détecte le nombre de pages en comptant les objets /Type /Page individuels hors flux binaires', () => {
      const fakePdfContent = `%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n2 0 obj << /Type /Page >> endobj\n3 0 obj << /Type /Page >> endobj\n%%EOF`;
      const buffer = new TextEncoder().encode(fakePdfContent).buffer;
      const count = extractPdfPageCountFromBuffer(buffer);
      expect(count).toBe(3);
    });

    it('retourne null (sans inventer de nombre) lorsque les objets sont compressés dans un /ObjStm ou chiffrés', () => {
      const compressedObjStmPdf = `%PDF-1.5\n1 0 obj << /Type /ObjStm /N 15 /First 100 /Length 50 >>\nstream\ncompressed_binary_data\nendstream\nendobj\n%%EOF`;
      const buffer = new TextEncoder().encode(compressedObjStmPdf).buffer;
      expect(extractPdfPageCountFromBuffer(buffer)).toBeNull();

      const encryptedPdf = `%PDF-1.5\n1 0 obj << /Filter /Standard >> endobj\ntrailer << /Encrypt 1 0 R >>\n%%EOF`;
      const encBuffer = new TextEncoder().encode(encryptedPdf).buffer;
      expect(extractPdfPageCountFromBuffer(encBuffer)).toBeNull();
    });

    it('renvoie null pour un fichier qui n’est pas un PDF valide', () => {
      const fakeBuffer = new TextEncoder().encode('Ceci est un fichier texte ordinaire').buffer;
      expect(extractPdfPageCountFromBuffer(fakeBuffer)).toBeNull();
    });

    it('vérifie les 2 fascicules PDF réels du CA 2024 de Cocody (22 + 22 = 44 pages) et leurs empreintes SHA-256', async () => {
      const candidateDirs = [
        'C:/Users/Couple ANVOH/Downloads',
        'C:/Users/Couple ANVOH/.gemini/antigravity/brain/de35e4de-3e97-4c4c-91f5-35aea9916df1/.user_uploaded'
      ];
      const part1Candidates = [
        `${candidateDirs[0]}/Cocody_CA_2024_pages_01-22.pdf`,
        `${candidateDirs[1]}/media_1791900257386_035a91a7.pdf`
      ];
      const part2Candidates = [
        `${candidateDirs[0]}/Cocody_CA_2024_pages_23-44.pdf`,
        `${candidateDirs[1]}/media_1791900270114_49eb7e9c.pdf`
      ];

      const part1Path = part1Candidates.find(p => existsSync(p));
      const part2Path = part2Candidates.find(p => existsSync(p));

      if (part1Path && part2Path) {
        const buf1 = readFileSync(part1Path);
        const buf2 = readFileSync(part2Path);
        const ab1 = buf1.buffer.slice(buf1.byteOffset, buf1.byteOffset + buf1.byteLength);
        const ab2 = buf2.buffer.slice(buf2.byteOffset, buf2.byteOffset + buf2.byteLength);

        const pages1 = extractPdfPageCountFromBuffer(ab1);
        const pages2 = extractPdfPageCountFromBuffer(ab2);
        expect(pages1).toBe(22);
        expect(pages2).toBe(22);
        expect((pages1 || 0) + (pages2 || 0)).toBe(44);

        const sha1 = await calculateFileSha256(ab1);
        const sha2 = await calculateFileSha256(ab2);
        expect(sha1).toBe('580b42cde2c164c8f7a4af23419b3dd93de541b583f5986d71bbf35b3e9c4ca4');
        expect(sha2).toBe('796921a9522c0fbf2a48b4bbf16f97ea8a525f57fb74b438c11bc64de5dc7ec9');
      }
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
  // PRIORITÉ 1 & ÉTAPE 3 : Réconciliation Cocody 2024 (PDF Page 40 / Imprimée 41/45)
  // =========================================================================
  describe('2. Réconciliation des montants officiels du CA 2024 de Cocody (Priorité 1)', () => {
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
    });

    it('valide par dry-run les montants exacts réconciliés du PDF officiel de Cocody 2024 (page PDF 40 / imprimée 41/45)', () => {
      // Montants exacts relevés sur le TABLEAU DES RESULTATS DU COMPTE ADMINISTRATIF
      // (Fascicule 2 p.18 = page PDF 40 = page imprimée 41/45, arrêté le 08/07/2025, approuvé le 22/07/2025 sous le n° 002/PA/D.CAB)
      const cocodyValues = buildProposedValuesTemplate('COMPTE_ADMINISTRATIF', {
        operating_planned: 18_441_235_000,
        operating_realized: 15_409_122_753,
        operating_revenue_realized: 17_646_256_543,
        investment_planned: 3_900_630_000,
        investment_realized: 1_366_100_690,
        investment_revenue_realized: 1_366_100_690,
        total_revenue_collected: 19_012_357_233,
        total_planned: 22_341_865_000,
        total_realized: 16_775_223_443,
        surplus_or_deficit: 2_237_133_790
      });

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
        source_name: 'Mairie de Cocody — Direction des Services Financiers',
        source_reference: '002/PA/D.CAB',
        source_date: '2025-07-22',
        source_date_kind: 'RECORDED' as const,
        source_url: 'storage://public_documents/ca/2024/commune-de-cocody/COMMUNE_DE_COCODY.pdf',
        source_page: 40,
        evidence_level: 'OFFICIAL_DOCUMENT' as const,
        amount_semantics: 'REVISED_TOTAL' as const,
        notes: 'Tableau des résultats du Compte Administratif 2024 (page PDF 40 / imprimée 41/45). Report exercice précédent : +944 FCFA ; Résultat cumulé : +2 237 134 734 FCFA.'
      };

      const dryRun = runDocumentDryRun(metadata, validatedValues, dryRunContext);
      expect(dryRun.is_valid).toBe(true);
      expect(dryRun.errors.length).toBe(0);

      const envelope = buildStandardImportEnvelope(metadata, validatedValues, dryRunContext.knownInstitutions[0]);
      expect(envelope).toBeDefined();
      expect(envelope.kind).toBe('CA');
      expect(envelope.data.accounting_stage).toBe('ORDONNANCE');
      expect(envelope.data.operating_planned).toBe(18_441_235_000);
      expect(envelope.data.operating_realized).toBe(15_409_122_753);
      expect(envelope.data.investment_planned).toBe(3_900_630_000);
      expect(envelope.data.investment_realized).toBe(1_366_100_690);
      expect(envelope.data.total_revenue_collected).toBe(19_012_357_233);
      expect(envelope.data.total_planned).toBe(22_341_865_000);
      expect(envelope.data.total_realized).toBe(16_775_223_443);
      expect(envelope.data.surplus_or_deficit).toBe(2_237_133_790);
    });
  });

  // =========================================================================
  // PRIORITÉ 4 : Les 3 états documentaires et financiers de Cocody 2024
  // =========================================================================
  describe('3. États documentaires et financiers de la fiche Cocody 2024 (Priorité 4)', () => {
    const cocodyInstitution: Institution = {
      id: 'commune-cocody',
      name: 'Commune de Cocody',
      type: 'MAIRIE',
      region: 'Abidjan',
      district: 'District Autonome d\'Abidjan',
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
      total_budget_fcfa: null
    };

    const reconciledCocodyCA: AdministrativeAccount = {
      id: 'ca-cocody-2024',
      institution_id: 'commune-cocody',
      institution_name: 'Commune de Cocody',
      institution_type: 'COMMUNE',
      fiscal_year: 2024,
      status: 'PUBLISHED',
      total_planned: 22_341_865_000,
      total_realized: 16_775_223_443,
      total_revenue_collected: 19_012_357_233,
      operating_planned: 18_441_235_000,
      operating_realized: 15_409_122_753,
      operating_revenue_realized: 17_646_256_543,
      investment_planned: 3_900_630_000,
      investment_realized: 1_366_100_690,
      investment_revenue_realized: 1_366_100_690,
      surplus_or_deficit: 2_237_133_790,
      previous_result_reported: 944,
      cumulative_result: 2_237_134_734,
      accounting_stage: 'ORDONNANCE',
      source_document: 'COMMUNE DE COCODY.pdf',
      source_document_sha256: '941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf',
      source_url: '',
      source_page: 40,
      approval_date: '2025-07-08',
      prefecture_visa_date: '2025-07-22',
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: [
        {
          id: 'op-cocody-6100',
          ca_id: 'ca-cocody-2024',
          institution_id: 'commune-cocody',
          fiscal_year: 2024,
          operation_reference: '6100/20/01',
          title: 'Élaboration du plan stratégique de développement de la commune',
          sector: 'Administration & Planification',
          location: 'Cocody',
          planned_amount: 20_000_000,
          executed_amount: 20_000_000,
          source_page: 41,
          citizen_proofs_count: 0,
          citizen_status: null as any
        },
        {
          id: 'op-cocody-6203',
          ca_id: 'ca-cocody-2024',
          institution_id: 'commune-cocody',
          fiscal_year: 2024,
          operation_reference: '6203/2204/01',
          title: 'Ouverture et bitumage des voies de la commune',
          sector: 'Voirie & Infrastructures',
          location: 'Cocody',
          planned_amount: 550_000_000,
          executed_amount: 234_996_717,
          source_page: 42,
          citizen_proofs_count: 0,
          citizen_status: null as any
        },
        {
          id: 'op-cocody-6301',
          ca_id: 'ca-cocody-2024',
          institution_id: 'commune-cocody',
          fiscal_year: 2024,
          operation_reference: '6301/2210/07',
          title: 'Réhabilitation des écoles primaires et maternelles de la commune',
          sector: 'Éducation',
          location: 'Cocody',
          planned_amount: 140_000_000,
          executed_amount: 139_989_294,
          source_page: 42,
          citizen_proofs_count: 0,
          citizen_status: null as any
        },
        {
          id: 'op-cocody-6400',
          ca_id: 'ca-cocody-2024',
          institution_id: 'commune-cocody',
          fiscal_year: 2024,
          operation_reference: '6400/2211/01',
          title: 'Réhabilitation du centre de santé d’Anono',
          sector: 'Santé',
          location: 'Anono',
          planned_amount: 40_000_000,
          executed_amount: 39_998_511,
          source_page: 43,
          citizen_proofs_count: 0,
          citizen_status: null as any
        }
      ],
      created_at: '2025-07-22',
      updated_at: '2025-07-22'
    };

    it('État 1 : affiche le message d’enregistrement lorsque le PDF est déposé en statut TO_VERIFY sans ligne active dans administrative_accounts', () => {
      const originalGetDocs = dataStore.getDocuments.bind(dataStore);
      const pendingDoc: PublicDocument = {
        id: 'doc-cocody-to-verify',
        title: 'Compte Administratif 2024 — Commune de Cocody',
        category: 'COMPTE_ADMINISTRATIF',
        institution_id: 'commune-cocody',
        institution_name: 'Commune de Cocody',
        year: 2024,
        description: '',
        file_url: '',
        file_name: 'COMMUNE DE COCODY.pdf',
        file_size: '13.4 MB',
        file_format: 'PDF',
        published_at: null,
        downloads_count: 0,
        is_official: true,
        created_at: '2026-04-12',
        status: 'TO_VERIFY',
        verification_status: 'TO_VERIFY',
        checksum_sha256: '941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'
      };
      dataStore.getDocuments = () => [pendingDoc];

      try {
        const html = renderToStaticMarkup(
          <AdministrativeAccountView institution={cocodyInstitution} onOpenDocRequest={() => {}} />
        );
        expect(html).toContain('Compte administratif 2024 enregistré — vérification documentaire et financière en cours avant publication.');
        expect(html).toContain('941c399bf290cee4');
      } finally {
        dataStore.getDocuments = originalGetDocs;
      }
    });

    it('État 2 (état actuel de production de Cocody) : affiche le message explicite et le bouton de consultation PDF lorsque le document est PUBLISHED mais que les données chiffrées sont en cours de validation', () => {
      const originalGetDocs = dataStore.getDocuments.bind(dataStore);
      const publishedCocodyDoc: PublicDocument = {
        id: 'doc-dff4865a-c6a8-418e-8895-626258e409d0',
        title: 'Compte Administratif 2024 — Commune de Cocody',
        category: 'COMPTE_ADMINISTRATIF',
        institution_id: 'commune-cocody',
        institution_name: 'Commune de Cocody',
        year: 2024,
        description: '',
        file_url: '',
        storage_path: 'ca/2024/commune-de-cocody/1776037272191_COMMUNE_DE_COCODY.pdf',
        file_name: 'COMMUNE DE COCODY.pdf',
        file_size: '13.4 MB',
        file_format: 'PDF',
        published_at: '2026-04-12',
        downloads_count: 0,
        is_official: true,
        created_at: '2026-04-12',
        status: 'PUBLISHED',
        verification_status: 'VERIFIED',
        checksum_sha256: '941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf'
      };
      dataStore.getDocuments = () => [publishedCocodyDoc];

      try {
        const html = renderToStaticMarkup(
          <AdministrativeAccountView institution={cocodyInstitution} onOpenDocRequest={() => {}} />
        );
        expect(html).toContain(
          "Compte administratif 2024 disponible à la consultation. Données financières en cours d&#x27;exploitation et de validation."
        );
        expect(html).toContain('Consulter le document');
        expect(html).toContain('941c399bf290cee4');
        expect(html).not.toContain('Compte Administratif non disponible dans le référentiel public');
      } finally {
        dataStore.getDocuments = originalGetDocs;
      }
    });

    it('État 3 : affiche intégralement les 6 rubriques citoyennes de Cocody 2024 avec les montants réconciliés dès que la ligne administrative_accounts est publiée', () => {
      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length, reconciledCocodyCA);

      const html = renderToStaticMarkup(
        <AdministrativeAccountView institution={cocodyInstitution} onOpenDocRequest={() => {}} />
      );

      // Rubrique 1 : Les moyens financiers
      expect(html).toContain('Rubrique 1 : Les moyens financiers');
      expect(html).toContain('Prévisions Définitives');
      expect(html).toContain('22 341 865 000 FCFA');

      // Rubrique 2 : Les recettes et les dépenses
      expect(html).toContain('Rubrique 2 : Les recettes et les dépenses');
      expect(html).toContain('Stade comptable : ORDONNANCE');
      expect(html).toContain('19 012 357 233 FCFA'); // Recettes totales recouvrées
      expect(html).toContain('16 775 223 443 FCFA'); // Dépenses totales ordonnancées
      expect(html).toContain('Différence arithmétique (Recettes − Dépenses)');
      expect(html).toContain('Excédent : +2 237 133 790 FCFA');
      expect(html).toContain('+944 FCFA'); // Report exercice précédent (page PDF 40)
      expect(html).toContain('+2 237 134 734 FCFA'); // Résultat cumulé final

      // Rubrique 3 : Fonctionnement et investissement
      expect(html).toContain('Rubrique 3 : Fonctionnement et investissement');
      expect(html).toContain('18 441 235 000 FCFA'); // Fonctionnement prévu
      expect(html).toContain('15 409 122 753 FCFA'); // Fonctionnement réalisé
      expect(html).toContain('3 900 630 000 FCFA'); // Investissement prévu
      expect(html).toContain('1 366 100 690 FCFA'); // Investissement réalisé

      // Rubrique 4 : Opérations et investissements identifiés (pages PDF 41-43)
      expect(html).toContain('Rubrique 4 : Opérations et investissements identifiés');
      expect(html).toContain('6100/20/01');
      expect(html).toContain('6203/2204/01');
      expect(html).toContain('Ouverture et bitumage des voies de la commune');
      expect(html).toContain('234 996 717 FCFA');
      expect(html).toContain('Réalisation physique non documentée');
      expect(html).not.toContain('>Programmé<');

      // Rubrique 5 : Suivi citoyen sur le terrain
      expect(html).toContain('Rubrique 5 : Suivi citoyen sur le terrain');
      expect(html).toContain('Principe républicain : Réalisé financier ≠ Réalisation physique');

      // Rubrique 6 : Sources et vérification
      expect(html).toContain('Rubrique 6 : Sources et vérification');
      expect(html).toContain('COMMUNE DE COCODY.pdf');
      expect(html).toContain('Page 40');
      expect(html).toContain('941c399bf290cee4');
    });
  });

  // =========================================================================
  // PRIORITÉ 5 : Libellés comptables et citoyens (Tiassalé & Bingerville)
  // =========================================================================
  describe('4. Rigueur des libellés comptables et non-régression Tiassalé & Bingerville (Priorité 5)', () => {
    it('5.1 Stade comptable : n’affiche jamais ORDONNANCE par défaut lorsque le stade est ENGAGE (cas Bingerville) ou inconnu', () => {
      const bingervilleInst: Institution = {
        id: 'commune-bingerville',
        name: 'Commune de Bingerville',
        type: 'MAIRIE',
        region: 'Abidjan',
        district: 'District Autonome d\'Abidjan',
        budget_functioning_fcfa: null,
        budget_investment_fcfa: null,
        total_budget_fcfa: null
      };

      const bingervilleCA: AdministrativeAccount = {
        id: 'ca-bingerville-2024',
        institution_id: 'commune-bingerville',
        institution_name: 'Mairie de Bingerville',
        institution_type: 'COMMUNE',
        fiscal_year: 2024,
        status: 'PUBLISHED',
        total_planned: 4_871_268_000,
        total_realized: 3_622_408_466,
        total_revenue_collected: 4_555_265_065,
        operating_planned: 3_756_186_000,
        operating_realized: 2_897_446_393,
        operating_revenue_realized: 4_124_488_065,
        investment_planned: 1_115_082_000,
        investment_realized: 724_962_073,
        investment_revenue_realized: 430_777_000,
        surplus_or_deficit: 932_856_599,
        total_expenditure_engaged: 3_622_408_466,
        // accounting_stage non forcé à ORDONNANCE
        source_document: 'Bingerville — Compte Administratif 2024',
        verification_status: 'OFFICIAL_DOCUMENT',
        operations: [],
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length, bingervilleCA);
      const html = renderToStaticMarkup(
        <AdministrativeAccountView institution={bingervilleInst} onOpenDocRequest={() => {}} />
      );

      expect(html).toContain('Stade comptable : Dépenses engagées');
      expect(html).not.toContain('Stade comptable : ORDONNANCE');

      // Cas où aucun stade n'est connu
      const unknownStageCA: AdministrativeAccount = {
        ...bingervilleCA,
        id: 'ca-unknown-stage',
        total_expenditure_engaged: null,
        accounting_stage: undefined
      };
      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length, unknownStageCA);
      const htmlUnknown = renderToStaticMarkup(
        <AdministrativeAccountView institution={bingervilleInst} onOpenDocRequest={() => {}} />
      );
      expect(htmlUnknown).toContain('Stade comptable : Stade comptable à confirmer sur pièce');
      expect(htmlUnknown).not.toContain('Stade comptable : ORDONNANCE');
    });

    it('5.2, 5.3 & 5.4 Non-régression complète Tiassalé 2024 : réserve sur solde de clôture, statut physique non documenté, ratio 117,52 %, BP approximatif AIP et 3 marchés DGMP', () => {
      expect(getOperationPhysicalStatusLabel(null as any)).toBe('Réalisation physique non documentée');
      expect(getOperationPhysicalStatusLabel(undefined)).toBe('Réalisation physique non documentée');

      const tiassaleInst: Institution = {
        id: 'commune-tiassale',
        name: 'Commune de Tiassalé',
        type: 'MAIRIE',
        region: 'Agneby-Tiassa',
        district: 'Lagunes',
        budget_functioning_fcfa: null,
        budget_investment_fcfa: null,
        total_budget_fcfa: null
      };

      const tiassaleCA: AdministrativeAccount = {
        id: 'ca-tiassale-2024',
        institution_id: 'commune-tiassale',
        institution_name: 'Mairie de Tiassalé',
        institution_type: 'COMMUNE',
        fiscal_year: 2024,
        status: 'PUBLISHED',
        total_planned: 904_961_000,
        total_realized: 591_785_644,
        total_revenue_collected: 748_866_444,
        operating_planned: 760_136_000,
        operating_realized: 421_585_350,
        operating_revenue_realized: 653_199_444,
        investment_planned: 144_825_000,
        investment_realized: 170_200_294,
        investment_revenue_realized: 95_667_000,
        surplus_or_deficit: 0,
        arithmetic_difference: 157_080_800,
        reconciliation_status: 'SOURCE_ANOMALY',
        reconciliation_notes: 'Observation arithmétique sur la pièce source : ratio d’exécution d’investissement de 117,52 % (170 200 294 FCFA exécutés pour 144 825 000 FCFA prévus) et écart entre la différence Recettes − Dépenses (+157 080 800 FCFA) et le solde de clôture affiché.',
        source_document: 'Mairie de Tiassalé — Compte administratif / synthèse d’exécution 2024',
        verification_status: 'OFFICIAL_DOCUMENT',
        operations: [
          {
            id: 'op-tiassale-1',
            ca_id: 'ca-tiassale-2024',
            institution_id: 'commune-tiassale',
            fiscal_year: 2024,
            operation_reference: 'INV-2024-SANTE-01',
            title: 'Construction d’un centre de santé intégré à Taboitien',
            sector: 'Santé',
            location: 'Taboitien',
            planned_amount: 55_000_000,
            executed_amount: 55_000_000,
            citizen_status: null as any,
            procurement_match: {
              id: 'dgmp-tiassale-1',
              tender_number: 'T 954/2023',
              contractor: 'ENTREPRISE KOUAME & FRERES',
              award_amount: 54_850_000,
              match_level: 'STRONG',
              source: 'Bulletin Officiel des Marchés Publics (DGMP)',
              source_url: 'https://www.marchespublics.ci/bomp/t-954-2023',
              procurement_object: 'Construction centre de santé Taboitien',
              verification_status: 'VERIFIED'
            }
          },
          {
            id: 'op-tiassale-2',
            ca_id: 'ca-tiassale-2024',
            institution_id: 'commune-tiassale',
            fiscal_year: 2024,
            operation_reference: 'INV-2024-EDUC-02',
            title: 'Réhabilitation de 6 salles de classe à l’EPP Tiassalékro',
            sector: 'Éducation',
            location: 'Tiassalékro',
            planned_amount: 45_000_000,
            executed_amount: 68_200_294,
            citizen_status: null as any,
            procurement_match: {
              id: 'dgmp-tiassale-2',
              tender_number: 'T 112/2024',
              contractor: 'SOCOBA BTP',
              award_amount: 44_900_000,
              match_level: 'STRONG',
              source: 'Bulletin Officiel des Marchés Publics (DGMP)',
              source_url: 'https://www.marchespublics.ci/bomp/t-112-2024',
              procurement_object: 'Réhabilitation EPP Tiassalékro',
              verification_status: 'VERIFIED'
            }
          },
          {
            id: 'op-tiassale-3',
            ca_id: 'ca-tiassale-2024',
            institution_id: 'commune-tiassale',
            fiscal_year: 2024,
            operation_reference: 'INV-2024-EQUIP-03',
            title: 'Acquisition de matériel roulant et tricycles de salubrité',
            sector: 'Salubrité & Équipement',
            location: 'Tiassalé',
            planned_amount: 44_825_000,
            executed_amount: 47_000_000,
            citizen_status: null as any,
            procurement_match: {
              id: 'dgmp-tiassale-3',
              tender_number: 'F 88/2024',
              contractor: 'CFAO MOTORS CI',
              award_amount: 44_500_000,
              match_level: 'PARTIAL',
              source: 'Bulletin Officiel des Marchés Publics (DGMP)',
              source_url: 'https://www.marchespublics.ci/bomp/f-88-2024',
              procurement_object: 'Fourniture matériel roulant',
              verification_status: 'VERIFIED'
            }
          }
        ],
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      const originalGetLocalBudgets = dataStore.getLocalBudgets.bind(dataStore);
      const tiassaleApproximateBP: LocalBudget = {
        id: 'bp-tiassale-2024',
        institution_id: 'commune-tiassale',
        institution_name: 'Commune de Tiassalé',
        institution_type: 'COMMUNE',
        fiscal_year: 2024,
        budget_type: 'PRIMITIF_ADOPTE',
        status: 'PUBLISHED',
        total_amount: 820_150_000,
        operating_amount: null,
        investment_amount: null,
        amount_precision: 'APPROXIMATE',
        document_name: 'Dépêche AIP — Conseil municipal de Tiassalé',
        primary_source_label: 'Dépêche AIP — Conseil municipal de Tiassalé',
        verification_status: 'PARTIAL_INFO'
      } as any;

      dataStore.getLocalBudgets = () => [tiassaleApproximateBP];
      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length, tiassaleCA);

      try {
        const html = renderToStaticMarkup(
          <AdministrativeAccountView institution={tiassaleInst} onOpenDocRequest={() => {}} />
        );

        // 5.1 Stade comptable prudent (jamais ORDONNANCE par défaut)
        expect(html).toContain('Stade comptable : Stade comptable à confirmer sur pièce');
        expect(html).not.toContain('Stade comptable : ORDONNANCE');

        // 5.2 Statut physique non documenté (jamais Programmé)
        expect(html).toContain('Réalisation physique non documentée');
        expect(html).not.toContain('>Programmé<');

        // 5.3 Résultat de clôture sous réserve (jamais Excédent : +0 FCFA)
        expect(html).toContain('Résultat de clôture à confirmer');
        expect(html).not.toContain('Excédent : +0 FCFA');
        expect(html).toContain('+157 080 800 FCFA'); // Différence arithmétique Recettes - Dépenses

        // 5.4 Précision APPROXIMATE du BP via l'AIP + observation arithmétique 117,52 % + 3 marchés DGMP distincts
        expect(html).toContain('Environ 820 150 000 FCFA');
        expect(html).toContain('Dépêche AIP');
        expect(html).toContain('117,52 %');
        expect(html).toContain('T 954/2023');
        expect(html).toContain('T 112/2024');
        expect(html).toContain('F 88/2024');
        expect(html).toContain('Source marché public (DGMP)');
        expect(html).toContain('Pagination non renseignée');
      } finally {
        dataStore.getLocalBudgets = originalGetLocalBudgets;
      }
    });
  });

  // =========================================================================
  // PRIORITÉ 6 : Recette de bout en bout (Commune isolée & Conseil Régional isolé)
  // =========================================================================
  describe('5. Chaîne complète de bout en bout sans code spécifique par ville (Priorité 6)', () => {
    it.each([
      {
        label: 'Commune isolée (Dabou)',
        institution: {
          id: 'inst-com-dabou',
          name: 'Commune de Dabou',
          type: 'MAIRIE' as const,
          region: 'Grands-Ponts',
          district: 'Lagunes',
          budget_functioning_fcfa: null,
          budget_investment_fcfa: null,
          total_budget_fcfa: null
        },
        amounts: {
          operating_planned: 1_200_000_000,
          operating_realized: 1_050_000_000,
          operating_revenue_realized: 1_150_000_000,
          investment_planned: 600_000_000,
          investment_realized: 480_000_000,
          investment_revenue_realized: 500_000_000,
          total_revenue_collected: 1_650_000_000,
          total_planned: 1_800_000_000,
          total_realized: 1_530_000_000,
          surplus_or_deficit: 120_000_000
        },
        expectedFormattedPlanned: '1 800 000 000 FCFA',
        expectedFormattedRealized: '1 530 000 000 FCFA'
      },
      {
        label: 'Conseil Régional isolé (San-Pedro)',
        institution: {
          id: 'inst-reg-san-pedro',
          name: 'Conseil Régional de San-Pedro',
          type: 'REGION' as const,
          region: 'San-Pedro',
          district: 'Bas-Sassandra',
          budget_functioning_fcfa: null,
          budget_investment_fcfa: null,
          total_budget_fcfa: null
        },
        amounts: {
          operating_planned: 4_500_000_000,
          operating_realized: 4_100_000_000,
          operating_revenue_realized: 4_600_000_000,
          investment_planned: 6_200_000_000,
          investment_realized: 5_800_000_000,
          investment_revenue_realized: 6_000_000_000,
          total_revenue_collected: 10_600_000_000,
          total_planned: 10_700_000_000,
          total_realized: 9_900_000_000,
          surplus_or_deficit: 700_000_000
        },
        expectedFormattedPlanned: '10 700 000 000 FCFA',
        expectedFormattedRealized: '9 900 000 000 FCFA'
      }
    ])('exécute toute la chaîne (Dépôt PDF → Métadonnées → Extraction assistée → Contrôle → Validation → Import → Publication → 6 Rubriques) pour $label', async ({ institution, amounts, expectedFormattedPlanned, expectedFormattedRealized }) => {
      // 1. Dépôt du fichier PDF & calcul SHA-256 + pages
      const pdfBytes = new TextEncoder().encode(
        `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 18 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF`
      ).buffer;
      const pageCount = extractPdfPageCountFromBuffer(pdfBytes);
      const sha256 = await calculateFileSha256(pdfBytes);
      expect(pageCount).toBe(18);
      expect(sha256).toMatch(/^[a-f0-9]{64}$/);

      // 2. Saisie des métadonnées documentaires
      const metadata = {
        institution_id: institution.id,
        fiscal_year: 2024,
        category: 'COMPTE_ADMINISTRATIF' as const,
        document_nature: 'COMPTE_ADMINISTRATIF' as const,
        document_type: 'COMPTE_ADMINISTRATIF' as const,
        source_name: institution.name,
        source_reference: `DELIB-CA-2024-${institution.id}`,
        source_date: '2025-05-15',
        source_date_kind: 'RECORDED' as const,
        source_page: 12,
        evidence_level: 'OFFICIAL_DOCUMENT' as const,
        amount_semantics: 'REVISED_TOTAL' as const
      };

      // 3. Extraction assistée (valeurs proposées initialement non validées)
      const proposed = buildProposedValuesTemplate('COMPTE_ADMINISTRATIF', amounts);

      // Tant qu'aucune validation humaine n'est faite, le dry-run refuse l'import
      const unvalidatedDryRun = runDocumentDryRun(metadata, proposed, {
        knownInstitutions: [institution],
        existingBudgets: [],
        existingAccounts: []
      });
      expect(unvalidatedDryRun.is_valid).toBe(false);

      // 4 & 5. Contrôle arithmétique et Validation humaine explicite
      const validated = proposed.map(v => ({
        ...v,
        status: 'VALIDATED' as const,
        validated_by: 'admin-recette-e2e'
      }));
      const dryRun = runDocumentDryRun(metadata, validated, {
        knownInstitutions: [institution],
        existingBudgets: [],
        existingAccounts: []
      });
      expect(dryRun.is_valid).toBe(true);
      expect(dryRun.errors).toHaveLength(0);

      // 6. Import contrôlé & construction de l'enveloppe standard
      const envelope = buildStandardImportEnvelope(metadata, validated, institution);
      expect(envelope.kind).toBe('CA');

      // 7. Publication simulée dans le store isolé
      const publishedCA: AdministrativeAccount = {
        ...(envelope.data as unknown as AdministrativeAccount),
        id: `ca-${institution.id}-2024`,
        institution_id: institution.id,
        institution_name: institution.name,
        institution_type: institution.type === 'MAIRIE' ? 'COMMUNE' : 'REGIONAL_COUNCIL',
        fiscal_year: 2024,
        status: 'PUBLISHED',
        source_document: `CA_2024_${institution.id}.pdf`,
        source_document_sha256: sha256,
        source_page: 12,
        operations: [],
        created_at: '2025-05-15',
        updated_at: '2025-05-15'
      };
      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length, publishedCA);

      // 8. Affichage public des 6 rubriques citoyennes
      const html = renderToStaticMarkup(
        <AdministrativeAccountView institution={institution} onOpenDocRequest={() => {}} />
      );
      expect(html).toContain('Rubrique 1 : Les moyens financiers');
      expect(html).toContain('Rubrique 2 : Les recettes et les dépenses');
      expect(html).toContain('Rubrique 3 : Fonctionnement et investissement');
      expect(html).toContain('Rubrique 4 : Opérations et investissements identifiés');
      expect(html).toContain('Rubrique 5 : Suivi citoyen sur le terrain');
      expect(html).toContain('Rubrique 6 : Sources et vérification');
      expect(html).toContain(expectedFormattedPlanned);
      expect(html).toContain(expectedFormattedRealized);
      expect(html).toContain('Page 12');
      expect(html).toContain(sha256.slice(0, 16));
    });

    it('n’affiche jamais 0 FCFA trompeur lorsque le budget primitif est inconnu', () => {
      const inst: Institution = {
        id: 'inst-com-cocody',
        name: 'Commune de Cocody',
        type: 'MAIRIE',
        region: 'Abidjan',
        district: 'District Autonome d\'Abidjan',
        budget_functioning_fcfa: null,
        budget_investment_fcfa: null,
        total_budget_fcfa: null
      };
      const caWithoutBP: AdministrativeAccount = {
        id: 'ca-no-bp',
        institution_id: 'inst-com-cocody',
        institution_name: 'Commune de Cocody',
        institution_type: 'COMMUNE',
        fiscal_year: 2024,
        status: 'PUBLISHED',
        total_planned: 22_341_865_000,
        total_realized: 16_775_223_443,
        operating_planned: 18_441_235_000,
        operating_realized: 15_409_122_753,
        investment_planned: 3_900_630_000,
        investment_realized: 1_366_100_690,
        initial_budget_total: undefined,
        source_document: 'COMMUNE DE COCODY.pdf',
        verification_status: 'OFFICIAL_DOCUMENT',
        operations: [],
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, ADMINISTRATIVE_ACCOUNTS_DATA.length, caWithoutBP);

      const html = renderToStaticMarkup(
        <AdministrativeAccountView institution={inst} onOpenDocRequest={() => {}} />
      );

      expect(html).toContain('Non documenté au CA');
      expect(html).not.toContain('>0 FCFA<');
      expect(html).not.toContain('>0&nbsp;FCFA<');
    });

    it('affiche l’état d’attente républicain lorsqu’aucun compte administratif ni document n’est disponible', () => {
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
        <AdministrativeAccountView institution={unknownInst} onOpenDocRequest={() => {}} />
      );

      expect(html).toContain('Compte Administratif non disponible');
      expect(html).toContain('Faire une demande de Compte Administratif (Loi CAIDP)');
      expect(html).toContain('Qu&#x27;est-ce qu&#x27;un compte administratif ?');
    });
  });
});

