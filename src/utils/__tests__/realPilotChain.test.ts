import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';
import { parseImportInput } from '../../services/dataImportService';
import { formatQualifiedFCFA, amountPrecision } from '../formatters';
import { generateProjectPassport, findMatchingCaOperationResult } from '../projectPassport';
import { validateBudgetRecord, validateImportProvenanceConsistency } from '../budgetValidation';
import { dataStore } from '../../services/dataStore';
import type { BudgetProject } from '../../types';

let db: PGlite;
const adminId = '00000000-0000-0000-0000-000000000001';

async function executeAsAdmin<T>(callback: () => Promise<T>): Promise<T> {
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [adminId]);
    await db.exec('set local role authenticated');
    return await callback();
  } finally {
    await db.exec('rollback');
  }
}

async function runPlan(rows: unknown[], commit = false, hash: string | null = null): Promise<any> {
  return (await db.query<{ result: any }>(
    'select public.import_data_batch($1::jsonb, $2, $3) result',
    [JSON.stringify(rows), commit, hash]
  )).rows[0].result;
}

async function runStage(rows: unknown[]) {
  const preview = await runPlan(rows);
  return runPlan(rows, true, preview.plan_hash);
}

async function runReview(ids: string[], action: string, confirmed = true, reason = 'Revue pilote documentée avec sources vérifiées') {
  return (await db.query<{ result: any }>(
    'select public.review_data_import($1::text[], $2, $3, $4) result',
    [ids, action, reason, confirmed]
  )).rows[0].result;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema private;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.profiles(id uuid primary key, role text, is_active boolean);
    insert into public.profiles values ('${adminId}', 'ADMIN', true), ('00000000-0000-0000-0000-000000000002', 'DATA_MANAGER', true);
    create function private.has_staff_role(roles text[]) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role=any(roles) and is_active)$$;
    create function public.uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;
    create table public.institutions(id text primary key, name text, type text);
    create table public.projects(id text primary key);
    grant usage on schema public, private, auth to authenticated, anon;
  `);

  for (const pilot of CA_PILOT_FIXTURES) {
    await db.query("insert into public.institutions values ($1, $2, 'MAIRIE')", [pilot.institution_id, pilot.institution_name]);
  }
  await db.exec("insert into public.institutions values ('inst-com-cocody', 'Mairie de Cocody', 'MAIRIE')");

  for (const [file, names] of [
    ['20260928_local_budgets_referential.sql', ['local_budgets']],
    ['20260928_administrative_accounts.sql', ['administrative_accounts', 'ca_investment_operations', 'ca_procurement_matches']],
  ] as const) {
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
    for (const name of names) {
      await db.exec(sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${name} \\([\\s\\S]*?\\n\\);`))![0]);
    }
  }

  const migration = readFileSync('supabase/migrations/20261001091748_controlled_data_import.sql', 'utf8');
  await db.exec(migration);
  await db.exec(readFileSync('supabase/migrations/20261001144423_import_console_qualified_amounts.sql', 'utf8'));
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe('Premier lot réel de bout en bout (Pilote)', () => {
  it('1. Valide le format JSON des fichiers de lots préparés', () => {
    const bingervilleText = readFileSync('docs/imports/bingerville-bp-2026.json', 'utf8');
    const bingervilleRows = parseImportInput(bingervilleText, false) as any[];
    expect(bingervilleRows).toHaveLength(1);
    expect(bingervilleRows[0].institution_id).toBe('inst-com-bingerville');
    expect(bingervilleRows[0].fiscal_year).toBe(2026);
    expect(bingervilleRows[0].data.total_amount).toBe(4046222000);

    const cocodyText = readFileSync('docs/imports/cocody-bp-2026.json', 'utf8');
    const cocodyRows = parseImportInput(cocodyText, false) as any[];
    expect(cocodyRows).toHaveLength(1);
    expect(cocodyRows[0].institution_id).toBe('inst-com-cocody');
    expect(cocodyRows[0].data.operating_amount).toBeNull();
    expect(cocodyRows[0].precision.operating_amount).toBe('UNKNOWN');
    expect(cocodyRows[0].data.verification_status).toBe('SECONDARY_TO_CORROBORATE');
    expect(cocodyRows[0].data.confidence_level).toBe('MEDIUM');

    // Contrôle anti-contradiction de provenance :
    // Une source de presse (Abidjan.net) ne peut JAMAIS être déclarée AIP_VERIFIED
    const cocodyConsistency = validateImportProvenanceConsistency(cocodyRows[0]);
    expect(cocodyConsistency.valid).toBe(true);

    const contradictoryRow = {
      source: { name: 'Abidjan.net / Le Nouveau Réveil', reference: 'Article du 25 février 2026' },
      data: { verification_status: 'AIP_VERIFIED' },
    };
    const invalidConsistency = validateImportProvenanceConsistency(contradictoryRow);
    expect(invalidConsistency.valid).toBe(false);
    expect(invalidConsistency.error).toMatch(/Incohérence de provenance.*AIP_VERIFIED.*SECONDARY_TO_CORROBORATE/i);

    const issues = validateBudgetRecord({
      id: 'test-contradictory-press',
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      fiscal_year: 2026,
      verification_status: 'AIP_VERIFIED',
      primary_source_label: 'Abidjan.net / Le Nouveau Réveil',
    });
    expect(issues.some(i => i.code === 'ERR_SOURCE_VERIFICATION_MISMATCH')).toBe(true);

    const tiassaleText = readFileSync('docs/imports/tiassale-ca-2024.json', 'utf8');
    const tiassaleRows = parseImportInput(tiassaleText, false) as any[];
    expect(tiassaleRows).toHaveLength(1);
    expect(tiassaleRows[0].institution_id).toBe('inst-com-tiassale');
    expect(tiassaleRows[0].fiscal_year).toBe(2024);
  });

  it('2. Exécute la chaîne complète Bingerville BP 2026 : DRY-RUN → IMPORT PRIVÉ → VERIFY → PUBLISH → RESTITUTION', async () => {
    await executeAsAdmin(async () => {
      const rows = parseImportInput(readFileSync('docs/imports/bingerville-bp-2026.json', 'utf8'), false);

      // Étape A : DRY-RUN
      const dryRun = await runPlan(rows, false);
      expect(dryRun.dry_run).toBe(true);
      expect(dryRun.counts.ready).toBe(1);
      expect(dryRun.counts.errors).toBe(0);
      expect(dryRun.counts.conflicts).toBe(0);
      expect(dryRun.rows[0].status).toBe('READY');
      const importId = dryRun.rows[0].id;
      expect(importId).toMatch(/^import-[a-f0-9]{64}$/);

      // Vérifie que le dry-run n'a RIEN écrit en base
      const stagingBefore = (await db.query('select count(*) as count from public.data_import_rows')).rows[0] as { count: string };
      expect(Number(stagingBefore.count)).toBe(0);

      // Étape B : IMPORT PRIVÉ (Staging TO_VERIFY)
      const importResult = await runPlan(rows, true, dryRun.plan_hash);
      expect(importResult.dry_run).toBe(false);
      expect(importResult.counts.imported).toBe(1);
      expect(importResult.rows[0].status).toBe('IMPORTED');

      const stagedRow = (await db.query<any>('select * from public.data_import_rows where id = $1', [importId])).rows[0];
      expect(stagedRow.status).toBe('TO_VERIFY');
      expect(stagedRow.payload.institution_id).toBe('inst-com-bingerville');

      // Étape C : REVUE & VÉRIFICATION
      const verifyResult = await runReview([importId], 'VERIFY', true, 'Relecture des délibérations AIP du 28/01/2026');
      expect(verifyResult.rows[0].status).toBe('VERIFIED');

      // Étape D : CONTRÔLE DE SÉCURITÉ - Publication non confirmée expressément refusée
      await db.exec('SAVEPOINT unconfirmed_publish_test');
      try {
        await expect(runReview([importId], 'PUBLISH', false, 'Tentative sans confirmation')).rejects.toThrow('confirmation');
      } finally {
        await db.exec('ROLLBACK TO SAVEPOINT unconfirmed_publish_test');
      }

      // Étape E : PUBLICATION EXPLICITE
      const publishResult = await runReview([importId], 'PUBLISH', true, 'Publication confirmée suite à visa tutelle DGDDL');
      expect(publishResult.rows[0].status).toBe('PUBLISHED');

      // Étape F : CONTRÔLE RESTITUTION EN BASE DANS local_budgets
      await db.exec('reset role');
      const published = (await db.query<any>('select * from public.local_budgets where institution_id = $1 and fiscal_year = 2026', ['inst-com-bingerville'])).rows[0];
      expect(published).toBeDefined();
      expect(published.status).toBe('PUBLISHED');
      expect(published.total_amount).toBe(4046222000);
      expect(published.operating_amount).toBe(1877888000);
      expect(published.investment_amount).toBe(2168334000);
      expect(published.amount_precision).toBe('EXACT');
      expect(published.import_provenance.source.name).toBe('AIP — Budget primitif 2026 de Bingerville');
      expect(published.import_provenance.precision.total_amount).toBe('EXACT');

      // Contrôle de restitution UI formatée
      expect(formatQualifiedFCFA(published.total_amount, 'EXACT')).toMatch(/4[\s\u202f]046[\s\u202f]222[\s\u202f]000 FCFA/);
      expect(formatQualifiedFCFA(published.operating_amount, 'EXACT')).toMatch(/1[\s\u202f]877[\s\u202f]888[\s\u202f]000 FCFA/);
      expect(formatQualifiedFCFA(published.investment_amount, 'EXACT')).toMatch(/2[\s\u202f]168[\s\u202f]334[\s\u202f]000 FCFA/);

      // Contrôle de restitution citoyenne via dataStore
      dataStore.enrichInstitutionsWithBudgets();
      const bingervilleInst = dataStore.getInstitutions().find(i => i.id === 'inst-com-bingerville');
      expect(bingervilleInst).toBeDefined();
      expect(bingervilleInst?.primitive_budget?.total_voted_fcfa).toBe(4046222000);
      expect(bingervilleInst?.primitive_budget?.functioning_voted_fcfa).toBe(1877888000);
      expect(bingervilleInst?.primitive_budget?.investment_voted_fcfa).toBe(2168334000);
      expect(bingervilleInst?.primitive_budget?.precision).toBe('EXACT');
      expect(bingervilleInst?.primitive_budget?.source).toBe('AIP — Budget primitif 2026 de Bingerville');
    });
  });

  it('3. Exécute la chaîne Cocody BP 2026 : préserve UNKNOWN (null) et refuse 0 FCFA inventé', async () => {
    await executeAsAdmin(async () => {
      const rows = parseImportInput(readFileSync('docs/imports/cocody-bp-2026.json', 'utf8'), false);

      const dryRun = await runPlan(rows, false);
      expect(dryRun.counts.ready).toBe(1);
      const id = dryRun.rows[0].id;

      await runPlan(rows, true, dryRun.plan_hash);
      await runReview([id], 'VERIFY', true, 'Vérification article Abidjan.net');
      await runReview([id], 'PUBLISH', true, 'Publication autorisée avec montant global exact et ventilation UNKNOWN');

      await db.exec('reset role');
      const published = (await db.query<any>('select * from public.local_budgets where institution_id = $1 and fiscal_year = 2026', ['inst-com-cocody'])).rows[0];
      expect(published.total_amount).toBe(19764660000);
      expect(published.operating_amount).toBeNull();
      expect(published.investment_amount).toBeNull();
      expect(published.verification_status).toBe('SECONDARY_TO_CORROBORATE');
      expect(published.confidence_level).toBe('MEDIUM');
      expect(published.import_provenance.precision.operating_amount).toBe('UNKNOWN');
      expect(published.import_provenance.precision.investment_amount).toBe('UNKNOWN');

      // Contrôle de restitution citoyenne : UNKNOWN affiche "Montant à confirmer", jamais 0 FCFA
      expect(formatQualifiedFCFA(published.operating_amount, 'UNKNOWN')).toBe('Montant à confirmer');
      expect(formatQualifiedFCFA(published.investment_amount, 'UNKNOWN')).toBe('Montant à confirmer');
      expect(formatQualifiedFCFA(published.total_amount, 'EXACT')).toMatch(/19[\s\u202f]764[\s\u202f]660[\s\u202f]000 FCFA/);

      // Contrôle de restitution citoyenne via dataStore pour un budget partiel publié
      dataStore.saveLocalBudget(published);
      dataStore.enrichInstitutionsWithBudgets();
      const cocodyInst = dataStore.getInstitutions().find(i => i.id === 'inst-com-cocody');
      expect(cocodyInst).toBeDefined();
      expect(cocodyInst?.primitive_budget?.total_voted_fcfa).toBe(19764660000);
      expect(cocodyInst?.primitive_budget?.functioning_voted_fcfa).toBeNull();
      expect(cocodyInst?.primitive_budget?.investment_voted_fcfa).toBeNull();
      expect(cocodyInst?.primitive_budget?.precision).toBe('EXACT');
      expect(cocodyInst?.primitive_budget?.source).toBe('Abidjan.net / Le Nouveau Réveil');
    });
  });

  it('4. Exécute la chaîne complète Tiassalé : CA → OPÉRATION → MARCHÉ DGMP (STRONG) → PASSPORT CITOYEN', async () => {
    await executeAsAdmin(async () => {
      const pilot = CA_PILOT_FIXTURES.find(c => c.institution_id === 'inst-com-tiassale')!;
      const opFixture = pilot.operations[0];
      const tenderFixture = opFixture.procurement_match!;

      // 4.A : Ingestion et publication du CA Tiassalé 2024
      const caRows = parseImportInput(readFileSync('docs/imports/tiassale-ca-2024.json', 'utf8'), false);
      const caPlan = await runPlan(caRows, false);
      expect(caPlan.counts.ready).toBe(1);
      const caId = caPlan.rows[0].id;

      await runPlan(caRows, true, caPlan.plan_hash);
      await runReview([caId], 'VERIFY', true, 'Source officielle CA Tiassalé 2024 relue');
      await runReview([caId], 'PUBLISH', true, 'Publication CA 2024 confirmée');

      // 4.B : Ingestion et publication de l\'opération Priorité n°6
      const opRow = {
        kind: 'OPERATION',
        institution_id: 'inst-com-tiassale',
        institution_type: 'COMMUNE',
        fiscal_year: 2024,
        source: {
          name: 'COMMUNE DE TIASSALE — Compte administratif 2024',
          reference: 'Compte administratif 2024, page 36',
          date: '2024-12-31',
          date_kind: 'RECORDED',
        },
        data: {
          ca_id: caId,
          operation_reference: opFixture.operation_reference,
          title: opFixture.title,
          sector: opFixture.sector,
          planned_amount: opFixture.planned_amount,
          executed_amount: opFixture.executed_amount,
          source_page: opFixture.source_page,
        },
        precision: {
          planned_amount: 'EXACT',
          executed_amount: 'EXACT',
        },
      };

      const opPlan = await runPlan([opRow], false);
      expect(opPlan.counts.ready).toBe(1);
      const opId = opPlan.rows[0].id;

      await runPlan([opRow], true, opPlan.plan_hash);
      await runReview([opId], 'VERIFY', true, 'Vérification page 36 Priorité n°6');
      await runReview([opId], 'PUBLISH', true, 'Publication opération 20 magasins marché');

      // 4.C : Ingestion et publication du marché DGMP STRONG
      const dgmpRow = {
        kind: 'DGMP',
        institution_id: 'inst-com-tiassale',
        institution_type: 'COMMUNE',
        fiscal_year: 2024,
        source: {
          name: tenderFixture.source,
          reference: tenderFixture.tender_number,
          date: tenderFixture.award_date,
          date_kind: 'PUBLISHED',
          url: tenderFixture.source_url,
        },
        data: {
          operation_id: opId,
          tender_number: tenderFixture.tender_number,
          procurement_object: tenderFixture.procurement_object,
          contractor: tenderFixture.contractor,
          award_amount: tenderFixture.award_amount,
          award_date: tenderFixture.award_date,
          match_level: tenderFixture.match_level,
          match_evidence: `Priorité n°6, page 36 — ${tenderFixture.tender_number}`,
          notes: tenderFixture.notes,
        },
        precision: {
          award_amount: 'EXACT',
        },
      };

      const dgmpPlan = await runPlan([dgmpRow], false);
      expect(dgmpPlan.counts.ready).toBe(1);
      const marketId = dgmpPlan.rows[0].id;

      await runPlan([dgmpRow], true, dgmpPlan.plan_hash);
      await runReview([marketId], 'VERIFY', true, 'Rapprochement STRONG vérifié DGMP');
      await runReview([marketId], 'PUBLISH', true, 'Publication marché DGMP validée');

      // 4.D : Vérification de l\'intégrité des tables cibles
      await db.exec('reset role');
      const caPublished = (await db.query<any>('select * from public.administrative_accounts where id = $1', [caId])).rows[0];
      const opPublished = (await db.query<any>('select * from public.ca_investment_operations where id = $1', [opId])).rows[0];
      const marketPublished = (await db.query<any>('select * from public.ca_procurement_matches where id = $1', [marketId])).rows[0];

      expect(caPublished.total_planned).toBe(1007841000);
      expect(caPublished.total_realized).toBe(1059255758);
      expect(opPublished.planned_amount).toBe(28000000);
      expect(opPublished.executed_amount).toBe(27850646);
      expect(marketPublished.award_amount).toBe(27730380);
      expect(marketPublished.contractor).toBe('SOCIETE DEM');
      expect(marketPublished.match_level).toBe('STRONG');

      // 4.E : Restitution dans le Passport citoyen
      const mockProject: BudgetProject = {
        id: 'proj-tias-marche-20',
        title: 'Construction de vingt (20) magasins au marché de Tiassalé',
        institution_id: 'inst-com-tiassale',
        commune_name: 'Mairie de Tiassalé',
        region_name: 'Agnéby-Tiassa',
        fiscal_year: 2024,
        budget_amount_fcfa: 28000000,
        current_status: 'IN_PROGRESS',
        progress_percentage: 50,
        category: 'Commerce & Marchés',
        nature_expense: 'Investissements',
        locality_village_neighborhood: 'Marché de Tiassalé',
        created_at: '2024-01-01T00:00:00Z',
      };

      const accountsWithChildren = [
        {
          ...caPublished,
          operations: [
            {
              ...opPublished,
              procurement_match: marketPublished,
            },
          ],
        },
      ];

      const matchResult = findMatchingCaOperationResult(mockProject, accountsWithChildren);
      expect(matchResult.operation).toBeDefined();
      expect(matchResult.operation?.id).toBe(opId);
      expect(matchResult.operation?.procurement_match?.contractor).toBe('SOCIETE DEM');

      const passport = generateProjectPassport(mockProject, [], accountsWithChildren);
      expect(passport.hasMatchedCaOperation).toBe(true);
      expect(passport.hasMatchedDgmpTender).toBe(true);
      expect(passport.matchedProcurement?.contractor).toBe('SOCIETE DEM');
      expect(passport.matchedProcurement?.award_amount).toBe(27730380);
      expect(passport.facts.supplier.value).toBe('SOCIETE DEM');
      expect(passport.facts.procurement_amount.value).toBe(27730380);
      expect(passport.facts.executed_amount.value).toBe(27850646);
      expect(passport.matchedOperation?.executed_amount).toBe(27850646);
      const executionRate = (Number(passport.matchedOperation?.executed_amount) / Number(passport.matchedOperation?.planned_amount)) * 100;
      expect(executionRate).toBeCloseTo(99.46, 1);
    });
  });

  it('5. Détecte et bloque légitimement tout conflit sans écraser les données canoniques existantes', async () => {
    await executeAsAdmin(async () => {
      // Si une collectivité possède déjà un enregistrement canonique (ex: Bingerville BP 2026 publié ci-dessus)
      const rows = parseImportInput(readFileSync('docs/imports/bingerville-bp-2026.json', 'utf8'), false) as any[];
      const stageFirst = await runStage(rows);
      expect(stageFirst.counts.imported).toBe(1);
      const id = stageFirst.rows[0].id;
      await runReview([id], 'VERIFY');
      await runReview([id], 'PUBLISH');

      // Tentative de ré-import avec un montant différent -> CONFLICT
      const modifiedRows = structuredClone(rows);
      modifiedRows[0].data.total_amount = 5000000000;

      const conflictPlan = await runPlan(modifiedRows, false);
      expect(conflictPlan.counts.conflicts).toBe(1);
      expect(conflictPlan.rows[0].status).toBe('CONFLICT');
      expect(conflictPlan.rows[0].message).toContain('no overwrite');
    });
  });
});
