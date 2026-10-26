// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — TEST PILOTE D'INGESTION DOCUMENTAIRE COCODY 2024
// Simulation en mémoire PGlite (WASM) — REMOTE_SUPABASE_WRITES = 0
// =========================================================================

import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { parseImportInput } from '../../services/dataImportService';
import { 
  runDocumentDryRun, 
  buildProposedValuesTemplate, 
  buildStandardImportEnvelope,
  toPipelineImportRow,
  hydrateAdministrativeAccountFromRow
} from '../budgetDocumentDryRun';
import type { Institution, PublicDocument } from '../../types';
import type { DocumentIngestionMetadata, ProposedFinancialValue } from '../../types/budgetCycle';

let db: PGlite;
const adminUid = '00000000-0000-0000-0000-000000000001';

const COCODY_INSTITUTION: Institution = {
  id: 'inst-com-cocody',
  name: 'Mairie de Cocody',
  type: 'MAIRIE',
  region: 'Abidjan',
  district: 'District Autonome d\'Abidjan',
  budget_functioning_fcfa: null,
  budget_investment_fcfa: null,
  total_budget_fcfa: null,
};

// Lot canonique conforme pour le Compte Administratif 2024 de Cocody
const COCODY_CA_2024_ROW = {
  kind: 'CA' as const,
  institution_id: 'inst-com-cocody',
  institution_type: 'COMMUNE' as const,
  fiscal_year: 2024,
  source: {
    name: "Mairie de la Commune de Cocody - Compte Administratif de l'Exercice 2024",
    reference: 'CA-2024-COCODY / Approbation Préfectorale n° 002/PA/D.CAB du 22/07/2025',
    date: '2025-07-22',
    date_kind: 'PUBLISHED' as const,
  },
  data: {
    operating_planned: 18_441_235_000,
    operating_realized: 15_409_122_753,
    operating_revenue_realized: 17_646_256_543,
    investment_planned: 3_900_630_000,
    investment_realized: 1_366_100_690,
    investment_revenue_realized: 1_366_100_690,
    total_planned: 22_341_865_000,
    total_realized: 16_775_223_443,
    total_revenue_collected: 19_012_357_233,
    surplus_or_deficit: 2_237_133_790,
    source_page: 40,
    approval_date: '2025-07-22',
    prefecture_visa_date: '2025-07-22',
    verification_status: 'OFFICIAL_DOCUMENT',
    notes: 'Compte administratif 2024 approuvé par arrêté préfectoral n° 002/PA/D.CAB le 22/07/2025. Excédent de fonctionnement 2 237 133 790 FCFA. Report à nouveau antérieur 944 FCFA. Résultat cumulé 2 237 134 734 FCFA. Tableau patrimonial page 43: Immobilier 810 959 095, Incorporel 20 000 000, Mobilier 535 141 595.'
  },
  precision: {
    operating_planned: 'EXACT',
    operating_realized: 'EXACT',
    operating_revenue_realized: 'EXACT',
    investment_planned: 'EXACT',
    investment_realized: 'EXACT',
    investment_revenue_realized: 'EXACT',
    total_planned: 'EXACT',
    total_realized: 'EXACT',
    total_revenue_collected: 'EXACT',
    surplus_or_deficit: 'EXACT'
  }
};

async function plan(rows: unknown[], commit = false, hash: string | null = null): Promise<any> {
  return (await db.query<{ result: any }>(
    'select public.import_data_batch($1::jsonb,$2,$3) result',
    [JSON.stringify(rows), commit, hash]
  )).rows[0].result;
}

async function stage(rows: unknown[]) {
  const preview = await plan(rows);
  return plan(rows, true, preview.plan_hash);
}

async function review(ids: string[], action: string, confirmed = true) {
  return (await db.query<{ result: any }>(
    'select public.review_data_import($1::text[],$2,$3,$4) result',
    [ids, action, 'Relecture pilote Cocody 2024 conforme aux scans pages 40 et 43', confirmed]
  )).rows[0].result;
}

async function isolated(run: () => Promise<void>) {
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [adminUid]);
    await db.exec('set local role authenticated');
    await run();
  } finally {
    await db.exec('rollback');
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.profiles(id uuid primary key,role text,is_active boolean);
    insert into public.profiles values ('${adminUid}','ADMIN',true);
    create function private.has_staff_role(roles text[]) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role=any(roles) and is_active)$$;
    create function public.uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;
    create table public.institutions(id text primary key,name text,type text);
    create table public.projects(id text primary key);
    grant usage on schema public,private,auth to authenticated,anon;
  `);

  await db.query("insert into public.institutions values ($1,$2,'MAIRIE')", [
    COCODY_INSTITUTION.id,
    COCODY_INSTITUTION.name
  ]);

  for (const [file, names] of [
    ['20260928_local_budgets_referential.sql', ['local_budgets']],
    ['20260928_administrative_accounts.sql', ['administrative_accounts', 'ca_investment_operations', 'ca_procurement_matches']],
  ] as const) {
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
    for (const name of names) {
      await db.exec(sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${name} \\([\\s\\S]*?\\n\\);`))![0]);
    }
  }

  const migration1 = readFileSync('supabase/migrations/20261001091748_controlled_data_import.sql', 'utf8');
  await db.exec(migration1);
  const migration2 = readFileSync('supabase/migrations/20261001144423_import_console_qualified_amounts.sql', 'utf8');
  await db.exec(migration2);
}, 60000);

afterAll(async () => {
  await db?.close();
});

describe('Pilote Réel d\'Ingestion Documentaire et Financière : Cocody 2024', () => {

  it('Contrôle arithmétique rigoureux des chiffres pivots officiels du CA 2024', () => {
    const { data } = COCODY_CA_2024_ROW;

    // 1. Équilibre prévisionnel (Fonctionnement + Investissement = Total Prévu)
    expect(data.operating_planned + data.investment_planned).toBe(data.total_planned);
    expect(data.total_planned).toBe(22_341_865_000);

    // 2. Équilibre recettes recouvrées (Fonctionnement + Investissement = Total Recettes)
    expect(data.operating_revenue_realized + data.investment_revenue_realized).toBe(data.total_revenue_collected);
    expect(data.total_revenue_collected).toBe(19_012_357_233);

    // 3. Équilibre dépenses ordonnancées (Fonctionnement + Investissement = Total Dépenses)
    expect(data.operating_realized + data.investment_realized).toBe(data.total_realized);
    expect(data.total_realized).toBe(16_775_223_443);

    // 4. Excédent de clôture de l'exercice (Recettes - Dépenses)
    const excedentCalcule = data.total_revenue_collected - data.total_realized;
    expect(excedentCalcule).toBe(data.surplus_or_deficit);
    expect(data.surplus_or_deficit).toBe(2_237_133_790);

    // 5. Résultat cumulé excédentaire (Excédent courant + Résultat antérieur reporté de 944 FCFA)
    const reportAnterieur = 944;
    const resultatCumuleAttendu = 2_237_134_734;
    expect(data.surplus_or_deficit + reportAnterieur).toBe(resultatCumuleAttendu);

    // 6. Tableau patrimonial page 43 (Immobilier + Incorporel + Mobilier = Total Investissement)
    const immobilier = 810_959_095;
    const incorporel = 20_000_000;
    const mobilier = 535_141_595;
    const totalPatrimoineRealise = immobilier + incorporel + mobilier;
    expect(totalPatrimoineRealise).toBe(data.investment_realized);
  });

  it('A. Dry-run sans écriture (import_data_batch p_commit=false) : validation stricte et 0 écriture', () => isolated(async () => {
    const dryRunResult = await plan([COCODY_CA_2024_ROW]);

    expect(dryRunResult.dry_run).toBe(true);
    expect(dryRunResult.counts).toEqual({
      ready: 1,
      imported: 0,
      ignored: 0,
      conflicts: 0,
      errors: 0
    });
    expect(dryRunResult.plan_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(dryRunResult.rows[0].status).toBe('READY');

    // Vérification absolue : aucune ligne écrite en base
    const stagedRows = (await db.query('select * from public.data_import_rows')).rows;
    const events = (await db.query('select * from public.data_import_events')).rows;
    await db.exec('reset role');
    const published = (await db.query('select * from public.administrative_accounts')).rows;

    expect(stagedRows).toHaveLength(0);
    expect(events).toHaveLength(0);
    expect(published).toHaveLength(0);
  }));

  it('B. Ingestion en staging (p_commit=true) : ligne enregistrée en TO_VERIFY, non publiée', () => isolated(async () => {
    const stageResult = await stage([COCODY_CA_2024_ROW]);

    expect(stageResult.dry_run).toBe(false);
    expect(stageResult.counts.imported).toBe(1);
    expect(stageResult.rows[0].status).toBe('IMPORTED');

    const importId = stageResult.rows[0].id;
    expect(importId).toMatch(/^import-[a-f0-9]{64}$/);

    // En staging dans data_import_rows
    const staged = (await db.query<any>('select * from public.data_import_rows where id=$1', [importId])).rows[0];
    expect(staged.status).toBe('TO_VERIFY');
    expect(staged.payload.data.total_planned).toBe(22_341_865_000);
    expect(staged.payload.data.total_realized).toBe(16_775_223_443);

    // Absolument AUCUNE écriture dans administrative_accounts
    await db.exec('reset role');
    const published = (await db.query('select * from public.administrative_accounts')).rows;
    expect(published).toHaveLength(0);
  }));

  it('C. Sécurité du cycle : tentative de publication directe depuis TO_VERIFY rejetée', () => isolated(async () => {
    const stageResult = await stage([COCODY_CA_2024_ROW]);
    const importId = stageResult.rows[0].id;

    // Tentative de publication directe sans vérification préalable
    const pubDirect = await review([importId], 'PUBLISH', true);
    expect(pubDirect.rows[0].status).toBe('ERROR');
    expect(pubDirect.rows[0].message).toContain('Invalid review transition');

    // Le compte reste non publié
    await db.exec('reset role');
    const published = (await db.query('select * from public.administrative_accounts')).rows;
    expect(published).toHaveLength(0);
  }));

  it('D. Vérification humaine (action VERIFY) : transition vers statut VERIFIED', () => isolated(async () => {
    const stageResult = await stage([COCODY_CA_2024_ROW]);
    const importId = stageResult.rows[0].id;

    const verifyResult = await review([importId], 'VERIFY');
    expect(verifyResult.rows[0].status).toBe('VERIFIED');

    const rowAfter = (await db.query<any>('select * from public.data_import_rows where id=$1', [importId])).rows[0];
    expect(rowAfter.status).toBe('VERIFIED');
    expect(rowAfter.verified_by).toBe(adminUid);
    expect(rowAfter.verified_at).not.toBeNull();
  }));

  it('E. Garde-fou citoyen : publication rejetée sans case à cocher de confirmation explicite', () => isolated(async () => {
    const stageResult = await stage([COCODY_CA_2024_ROW]);
    const importId = stageResult.rows[0].id;

    await review([importId], 'VERIFY');

    // Tentative de publication avec confirmed = false
    await expect(review([importId], 'PUBLISH', false)).rejects.toThrow('confirmation');
  }));

  it('F. Publication contrôlée : insertion certifiée dans administrative_accounts avec provenance exacte', () => isolated(async () => {
    const stageResult = await stage([COCODY_CA_2024_ROW]);
    const importId = stageResult.rows[0].id;

    await review([importId], 'VERIFY');
    const pubResult = await review([importId], 'PUBLISH', true);
    expect(pubResult.rows[0].status).toBe('PUBLISHED');

    await db.exec('reset role');
    const publishedRows = (await db.query<any>(
      'select * from public.administrative_accounts where institution_id=$1 and fiscal_year=2024',
      ['inst-com-cocody']
    )).rows;

    expect(publishedRows).toHaveLength(1);
    const pub = publishedRows[0];
    expect(pub.institution_id).toBe('inst-com-cocody');
    expect(pub.fiscal_year).toBe(2024);
    expect(pub.total_planned).toBe(22_341_865_000);
    expect(pub.total_realized).toBe(16_775_223_443);
    expect(pub.operating_planned).toBe(18_441_235_000);
    expect(pub.operating_realized).toBe(15_409_122_753);
    expect(pub.investment_planned).toBe(3_900_630_000);
    expect(pub.investment_realized).toBe(1_366_100_690);
    expect(pub.surplus_or_deficit).toBe(2_237_133_790);
    expect(pub.verification_status).toBe('OFFICIAL_DOCUMENT');
    expect(pub.import_provenance.source.name).toBe(COCODY_CA_2024_ROW.source.name);
    expect(pub.import_provenance.precision.total_realized).toBe('EXACT');
  }));

  it('G. Prévention des doublons et conflits : doublon identique ignoré, modification conflictuelle rejetée', () => isolated(async () => {
    const stageResult = await stage([COCODY_CA_2024_ROW]);
    const importId = stageResult.rows[0].id;
    await review([importId], 'VERIFY');
    await review([importId], 'PUBLISH', true);

    // 1. Deuxième envoi identique : statut IGNORED
    const repeatResult = await plan([COCODY_CA_2024_ROW]);
    expect(repeatResult.counts.ignored).toBe(1);

    // 2. Envoi avec chiffre altéré : conflit bloquant
    const conflictingRow = JSON.parse(JSON.stringify(COCODY_CA_2024_ROW));
    conflictingRow.data.total_realized = 99_999_999_999;
    const conflictResult = await plan([conflictingRow]);
    expect(conflictResult.counts.conflicts).toBe(1);
  }));

  it('H. Assistant Documentaire Guidé : validation des métadonnées, enveloppe et contrôle arithmétique', () => {
    const meta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      fiscal_year: 2024,
      document_type: 'COMPTE_ADMINISTRATIF',
      source_name: 'Mairie de la Commune de Cocody - Compte Administratif 2024',
      source_reference: 'CA-2024-COCODY / Approbation n° 002/PA/D.CAB du 22/07/2025',
      source_date: '2025-07-22',
      source_date_kind: 'PUBLISHED',
      source_page: 40,
      evidence_level: 'OFFICIAL_DOCUMENT',
      notes: 'Pilotage Cocody 2024'
    };

    const proposedValues = buildProposedValuesTemplate('COMPTE_ADMINISTRATIF', {
      total_planned: 22_341_865_000,
      total_realized: 16_775_223_443,
      operating_planned: 18_441_235_000,
      operating_realized: 15_409_122_753,
      investment_planned: 3_900_630_000,
      investment_realized: 1_366_100_690,
      total_revenue_collected: 19_012_357_233,
      operating_revenue_realized: 17_646_256_543,
      investment_revenue_realized: 1_366_100_690,
      surplus_or_deficit: 2_237_133_790
    });

    // 1. Initialement, toutes les valeurs sont PENDING (validation humaine requise)
    expect(proposedValues.every(v => v.status === 'PENDING')).toBe(true);

    const dryRunPending = runDocumentDryRun(meta, proposedValues, {
      knownInstitutions: [COCODY_INSTITUTION],
      existingBudgets: [],
      existingAccounts: []
    });
    expect(dryRunPending.can_import).toBe(false);
    expect(dryRunPending.errors.some(e => e.includes('Validation humaine requise'))).toBe(true);

    // 2. Validation humaine des valeurs
    const validatedValues: ProposedFinancialValue[] = proposedValues.map(v => ({
      ...v,
      status: 'VALIDATED' as const
    }));

    const dryRunValidated = runDocumentDryRun(meta, validatedValues, {
      knownInstitutions: [COCODY_INSTITUTION],
      existingBudgets: [],
      existingAccounts: []
    });
    expect(dryRunValidated.is_valid).toBe(true);
    expect(dryRunValidated.can_import).toBe(true);
    expect(dryRunValidated.checks.arithmetic_valid).toBe(true);

    // 3. Construction de l'enveloppe standardisée
    const envelope = buildStandardImportEnvelope(meta, validatedValues, COCODY_INSTITUTION);
    expect(envelope.kind).toBe('CA');
    expect(envelope.institution_id).toBe('inst-com-cocody');
    expect(envelope.institution_type).toBe('COMMUNE');
    expect(envelope.data.total_planned).toBe(22_341_865_000);
    expect(envelope.data.total_realized).toBe(16_775_223_443);
    expect(envelope.data.verification_status).toBe('OFFICIAL_DOCUMENT');
    expect(envelope.precision.total_realized).toBe('EXACT');
  });

  it('I. Détection des erreurs arithmétiques par le moteur de dry-run sur un CA', () => {
    const meta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      fiscal_year: 2024,
      document_type: 'COMPTE_ADMINISTRATIF',
      source_name: 'Source Test',
      source_reference: 'REF-ERR',
      source_date: '2025-07-22',
      source_date_kind: 'PUBLISHED'
    };

    // Erreur intentionnelle : Total prévu = 20 000 000 000 au lieu de 22 341 865 000
    const errValues: ProposedFinancialValue[] = [
      { id: '1', field: 'total_planned', label: 'Total Prévu', section: 'GLOBAL', nature: 'PREVISION', amount: 20_000_000_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' },
      { id: '2', field: 'operating_planned', label: 'Fonctionnement Prévu', section: 'FONCTIONNEMENT', nature: 'PREVISION', amount: 18_441_235_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' },
      { id: '3', field: 'investment_planned', label: 'Investissement Prévu', section: 'INVESTISSEMENT', nature: 'PREVISION', amount: 3_900_630_000, precision: 'EXACT', confidence: 'MEDIUM', status: 'VALIDATED' }
    ];

    const res = runDocumentDryRun(meta, errValues, {
      knownInstitutions: [COCODY_INSTITUTION],
      existingBudgets: [],
      existingAccounts: []
    });

    expect(res.is_valid).toBe(false);
    expect(res.checks.arithmetic_valid).toBe(false);
    expect(res.errors.some(e => e.includes('Incompatibilité arithmétique prévisions CA'))).toBe(true);
  });

  it('J. Modélisation et traçabilité du document original multi-parties (2 fichiers, 44 pages)', () => {
    // Spécification exacte des 2 parties du scan HP
    const docParts = [
      {
        part_number: 1,
        file_name: 'Cocody_CA_2024_pages_01-22.pdf',
        page_range: 'Pages 1 à 22',
        file_size_bytes: 7_277_392,
        file_size: '6.9 Mo',
        checksum_sha256: '580b42cde2c164c8f7a4af23419b3dd93de541b583f5986d71bbf35b3e9c4ca4'
      },
      {
        part_number: 2,
        file_name: 'Cocody_CA_2024_pages_23-44.pdf',
        page_range: 'Pages 23 à 44',
        file_size_bytes: 6_844_140,
        file_size: '6.5 Mo',
        checksum_sha256: '796921a9522c0fbf2a48b4bbf16f97ea8a525f57fb74b438c11bc64de5dc7ec9'
      }
    ];

    const combinedDoc: Partial<PublicDocument> = {
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      fiscal_year: 2024,
      category: 'COMPTE_ADMINISTRATIF',
      document_type: 'COMPTE_ADMINISTRATIF',
      page_count: 44,
      is_multipart: true,
      parts_count: 2,
      document_parts: docParts,
      is_scanned: true,
      has_text_layer: false,
      ocr_status: 'MANUAL_TRANSCRIPTION',
      checksum_sha256: '941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf',
      file_name: 'COMMUNE_DE_COCODY_CA_2024_COMPLET.pdf',
      status: 'TO_VERIFY',
      verification_status: 'TO_VERIFY'
    };

    expect(combinedDoc.is_multipart).toBe(true);
    expect(combinedDoc.parts_count).toBe(2);
    expect(combinedDoc.page_count).toBe(44);
    expect(combinedDoc.is_scanned).toBe(true);
    expect(combinedDoc.checksum_sha256).toBe('941c399bf290cee446a3c0c5226e0d7b32bb1784834b1d300d1fc6546e9627cf');
    expect(combinedDoc.document_parts?.[0].checksum_sha256).toBe('580b42cde2c164c8f7a4af23419b3dd93de541b583f5986d71bbf35b3e9c4ca4');
    expect(combinedDoc.document_parts?.[1].checksum_sha256).toBe('796921a9522c0fbf2a48b4bbf16f97ea8a525f57fb74b438c11bc64de5dc7ec9');
  });

  it('K. Chaîne complète Assistant Guidé → toPipelineImportRow → SQL import_data_batch → review_data_import → hydratation 12 indicateurs Cocody 2024', () => isolated(async () => {
    const meta: DocumentIngestionMetadata = {
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      fiscal_year: 2024,
      document_type: 'COMPTE_ADMINISTRATIF',
      source_name: "Mairie de la Commune de Cocody - Compte Administratif de l'Exercice 2024",
      source_reference: 'CA-2024-COCODY / Approbation Préfectorale n° 002/PA/D.CAB du 22/07/2025',
      source_date: '2025-07-22',
      source_date_kind: 'PUBLISHED',
      source_page: 40,
      adoption_date: '2025-07-08',
      evidence_level: 'OFFICIAL_DOCUMENT',
      notes: 'Tableau des résultats du Compte Administratif 2024 (page PDF 40 / imprimée 41/45).'
    };
    const proposed = buildProposedValuesTemplate('COMPTE_ADMINISTRATIF', {
      operating_planned: 18_441_235_000,
      operating_revenue_realized: 17_646_256_543,
      operating_realized: 15_409_122_753,
      investment_planned: 3_900_630_000,
      investment_revenue_realized: 1_366_100_690,
      investment_realized: 1_366_100_690,
      total_planned: 22_341_865_000,
      total_revenue_collected: 19_012_357_233,
      total_realized: 16_775_223_443,
      surplus_or_deficit: 2_237_133_790,
      previous_result_reported: 944,
      cumulative_result: 2_237_134_734
    }).map(v => ({ ...v, status: 'VALIDATED' as const }));

    const envelope = buildStandardImportEnvelope(meta, proposed, COCODY_INSTITUTION);
    const pipelineRow = toPipelineImportRow(envelope);

    const stageResult = await stage([pipelineRow]);
    expect(stageResult.counts.imported).toBe(1);
    const importId = stageResult.rows[0].id;

    await review([importId], 'VERIFY');
    const pubResult = await review([importId], 'PUBLISH', true);
    expect(pubResult.rows[0].status).toBe('PUBLISHED');

    await db.exec('reset role');
    const rawDbRow = (await db.query<any>(
      'select * from public.administrative_accounts where institution_id=$1 and fiscal_year=2024',
      ['inst-com-cocody']
    )).rows[0];
    const hydrated = hydrateAdministrativeAccountFromRow({ ...rawDbRow, operations: [] });
    expect(hydrated.accounting_stage).toBe('ORDONNANCE');
    expect(hydrated.previous_result_reported).toBe(944);
    expect(hydrated.cumulative_result).toBe(2_237_134_734);
    expect(hydrated.total_planned).toBe(22_341_865_000);
    expect(hydrated.total_revenue_collected).toBe(19_012_357_233);
    expect(hydrated.total_realized).toBe(16_775_223_443);
    expect(hydrated.surplus_or_deficit).toBe(2_237_133_790);
  }));
});
