import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AjvDraft04 from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { BudgetProject, CitizenProof } from '../../types';
import { AdministrativeAccount } from '../../types/administrativeAccount';
import {
  createFilteredOcdsReleasePackage,
  createOcdsReleasePackage,
  SUIVIBUDGET_OCDS_EXTENSION_URL,
} from '../ocdsMapper';
import { RAW_BUDGET_PROJECTS } from '../../data/budgetData';
import { ADMINISTRATIVE_ACCOUNTS_DATA } from '../../data/administrativeAccountsData';

type JsonRecord = Record<string, unknown>;

function applyJsonMergePatch(target: unknown, patch: unknown): unknown {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return patch;
  }
  const base: JsonRecord =
    target && typeof target === 'object' && !Array.isArray(target)
      ? { ...(target as JsonRecord) }
      : {};
  for (const [key, value] of Object.entries(patch as JsonRecord)) {
    if (value === null) {
      delete base[key];
    } else {
      base[key] = applyJsonMergePatch(base[key], value);
    }
  }
  return base;
}

function disallowUndocumentedProperties(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) disallowUndocumentedProperties(item);
    return;
  }
  const obj = node as JsonRecord;
  if (obj.properties && typeof obj.properties === 'object' && obj.additionalProperties === undefined) {
    obj.additionalProperties = false;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key !== 'properties' || typeof value === 'object') {
      disallowUndocumentedProperties(value);
    }
  }
}

function createIndependentOcdsValidator() {
  const pkgSchema = JSON.parse(
    readFileSync(join(process.cwd(), 'src/utils/__tests__/fixtures/ocds/release-package-schema.json'), 'utf8')
  ) as JsonRecord;
  const coreReleaseSchema = JSON.parse(
    readFileSync(join(process.cwd(), 'src/utils/__tests__/fixtures/ocds/release-schema.json'), 'utf8')
  ) as JsonRecord;
  const extensionSchema = JSON.parse(
    readFileSync(
      join(process.cwd(), 'public/ocds/extensions/suivibudget_provenance/v1.0.0/release-schema.json'),
      'utf8'
    )
  ) as JsonRecord;
  const extensionMeta = JSON.parse(
    readFileSync(
      join(process.cwd(), 'public/ocds/extensions/suivibudget_provenance/v1.0.0/extension.json'),
      'utf8'
    )
  ) as JsonRecord;

  const mergedReleaseSchema = applyJsonMergePatch(coreReleaseSchema, extensionSchema) as JsonRecord;
  disallowUndocumentedProperties(pkgSchema);
  disallowUndocumentedProperties(mergedReleaseSchema);

  const ajv = new AjvDraft04({ allErrors: true, strict: false });
  addFormats(ajv);
  // OCDS 1.1 release-package-schema references release-schema.json via $ref "release-schema.json".
  ajv.addSchema(mergedReleaseSchema, 'release-schema.json');
  if (typeof coreReleaseSchema.id === 'string') {
    ajv.addSchema(mergedReleaseSchema, coreReleaseSchema.id);
  }
  const validate = ajv.compile(pkgSchema);

  return { validate, extensionMeta, extensionSchema };
}

describe('OCDS v1.1 Independent Schema & Extension Validation', () => {
  const { validate, extensionMeta, extensionSchema } = createIndependentOcdsValidator();

  const certifiedProject: BudgetProject = {
    id: 'proj-ocds-valid-01',
    institution_id: 'inst-com-tiassale',
    institution_name: 'Mairie de Tiassalé',
    commune_name: 'Tiassalé',
    region_name: 'Agnéby-Tiassa',
    category: 'Éducation',
    nature_expense: 'Investissements',
    title: 'Construction de 3 salles de classe EPP Tiassalé',
    budget_amount_fcfa: 45_000_000,
    fiscal_year: 2024,
    current_status: 'IN_PROGRESS',
    progress_percentage: 0,
    created_at: '2024-02-10T00:00:00Z',
    scope_level: 'LOCAL',
    data_provenance: 'OFFICIAL_SOURCE',
    source: 'Budget Primitif 2024 Tiassalé',
    source_url: 'https://dgbf.ci/budgets/tiassale-2024.pdf',
    source_page: 14,
    source_document_id: 'doc-bp-tiassale-2024',
  };

  const sampleAccountWithDgmp: AdministrativeAccount = {
    id: 'ca-tiassale-2024',
    institution_id: 'inst-com-tiassale',
    institution_type: 'COMMUNE',
    institution_name: 'Mairie de Tiassalé',
    fiscal_year: 2024,
    status: 'PUBLISHED',
    operating_planned: null,
    operating_realized: null,
    investment_planned: 350_000_000,
    investment_realized: 120_000_000,
    total_planned: null,
    total_realized: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    source_document: 'CA 2024 Tiassalé',
    source_document_id: 'doc-ca-tias-2024',
    source_url: 'https://dgbf.ci/ca/tiassale-2024.pdf',
    verification_status: 'OFFICIAL_DOCUMENT',
    operations: [
      {
        id: 'op-tias-ecole',
        ca_id: 'ca-tiassale-2024',
        institution_id: 'inst-com-tiassale',
        fiscal_year: 2024,
        operation_reference: 'OP-901',
        title: 'Construction de 3 salles de classe EPP Tiassalé',
        sector: 'Éducation',
        planned_amount: 45_000_000,
        executed_amount: 32_500_000,
        source_page: 14,
        linked_project_id: 'proj-ocds-valid-01',
        procurement_match: {
          id: 'proc-dgmp-tias-901',
          tender_number: 'AO-2024-TIAS-01',
          contract_number: 'M-2024-TIAS-09',
          procurement_object: 'Construction de 3 salles de classe EPP Tiassalé',
          contractor: 'BTP AGNÉBY SARL',
          award_amount: 43_800_000,
          award_date: '2024-05-15',
          procurement_method: 'PROCÉDURE_LOCALE_INCONNUE',
          bomp_reference: 'BOMP N° 1742',
          match_level: 'STRONG',
          source: 'DGMP Bulletin Officiel n°1742',
          source_url: 'https://sigomap.gouv.ci/avis/1742',
          verification_status: 'OFFICIAL_DOCUMENT',
        },
      },
    ],
  };

  it('ships valid versioned extension metadata and JSON schema', () => {
    expect(extensionMeta.version).toBe('1.0.0');
    expect(extensionMeta.compatibility).toEqual(['1.1']);
    expect(extensionMeta.schemas).toEqual(['release-schema.json']);
    expect(extensionSchema.properties).toHaveProperty('x_suivibudget');
    expect((extensionSchema.definitions as JsonRecord).Budget).toBeDefined();
    expect((extensionSchema.definitions as JsonRecord).Document).toBeDefined();
    expect((extensionSchema.definitions as JsonRecord).Transaction).toBeDefined();
  });

  it('validates serialized valid OCDS packages with zero undocumented fields using Ajv Draft-04 + official OCDS 1.1 schema', () => {
    const proof: CitizenProof = {
      id: 'proof-ocds-01',
      project_id: 'proj-ocds-valid-01',
      image_url: 'https://example.org/photo.jpg',
      citizen_status_claim: 'IN_PROGRESS',
      comment: 'Travaux observés',
      verification_status: 'APPROVED',
      confirmations_count: 2,
      created_at: '2024-09-01T12:00:00Z',
    };

    const unverifiedProject: BudgetProject = {
      id: 'proj-ocds-unverified-02',
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      commune_name: 'Cocody',
      region_name: 'Abidjan',
      category: 'Voirie',
      nature_expense: 'Investissements',
      title: 'Réhabilitation voirie non certifiée',
      budget_amount_fcfa: null,
      fiscal_year: 2026,
      current_status: 'NOT_STARTED',
      progress_percentage: 0,
      created_at: '2026-01-10T00:00:00Z',
      scope_level: 'LOCAL',
      data_provenance: 'DECLARED_ADMIN',
      procurement_method: 'UNKNOWN',
      source: 'Note interne',
      source_url: 'Avis papier non URL',
    };

    const pkg = JSON.parse(
      JSON.stringify(
        createOcdsReleasePackage([certifiedProject, unverifiedProject], [proof], [sampleAccountWithDgmp])
      )
    );

    const isValid = validate(pkg);
    if (!isValid) {
      console.error('OCDS VALIDATION ERRORS:', JSON.stringify(validate.errors, null, 2));
    }
    expect(isValid).toBe(true);
    expect(pkg.extensions).toEqual([SUIVIBUDGET_OCDS_EXTENSION_URL]);
    expect(pkg.releases[0].tender.procurementMethod).toBeUndefined();
    expect(pkg.releases[0].awards?.[0].date).toBe('2024-05-15T00:00:00Z');
    expect(pkg.releases[1].planning.budget.x_dataProvenance).toBe('DECLARED_ADMIN');
    expect(pkg.releases[1].planning.budget.x_amountPrecision).toBe('DECLARED_ADMIN');
    expect(pkg.releases[1].planning.documents[0].x_provenance).toBe('DECLARED_ADMIN');
    expect(pkg.releases[1].planning.documents[0].url).toBeUndefined();
    expect(pkg.releases[1].planning.budget.amount).toBeUndefined();
    expect(pkg.releases[1].tender.procurementMethod).toBeUndefined();
  });

  it('validates real repository RAW_BUDGET_PROJECTS sample (national + local + strategic) against official OCDS 1.1 + SuiviBudget extension without errors', () => {
    const cocodyProjects = RAW_BUDGET_PROJECTS.filter((p) => p.institution_id === 'inst-com-cocody').slice(0, 60);
    const tiassaleProjects = RAW_BUDGET_PROJECTS.filter((p) => p.institution_id === 'inst-com-tiassale').slice(0, 30);
    const sample = [
      ...RAW_BUDGET_PROJECTS.slice(0, 60),
      ...cocodyProjects,
      ...tiassaleProjects,
      ...RAW_BUDGET_PROJECTS.slice(-60),
    ];
    const pkg = JSON.parse(
      JSON.stringify(createFilteredOcdsReleasePackage(sample, [], {}, ADMINISTRATIVE_ACCOUNTS_DATA))
    );
    const isValid = validate(pkg);
    if (!isValid) {
      console.error('REAL SAMPLE OCDS ERRORS:', JSON.stringify(validate.errors?.slice(0, 5), null, 2));
    }
    expect(isValid).toBe(true);
    expect(pkg.releases).toHaveLength(sample.length);
  });

  it('rejects invalid OCDS packages (undocumented fields, invalid currency, invalid date-time, missing required package fields)', () => {
    const validPkg = JSON.parse(
      JSON.stringify(createOcdsReleasePackage([certifiedProject], [], [sampleAccountWithDgmp]))
    );

    // 1. Undocumented custom property on release
    const undocumentedFieldPkg = structuredClone(validPkg);
    undocumentedFieldPkg.releases[0].x_invented_undocumented = true;
    expect(validate(undocumentedFieldPkg)).toBe(false);

    // 2. Invalid non-ISO date-time on award
    const invalidDatePkg = structuredClone(validPkg);
    invalidDatePkg.releases[0].awards[0].date = '2024-05-15';
    expect(validate(invalidDatePkg)).toBe(false);

    // 3. Invalid non-URI string on Document.url
    const invalidUriPkg = structuredClone(validPkg);
    invalidUriPkg.releases[0].planning.documents[0].url = 'not-a-valid-uri';
    expect(validate(invalidUriPkg)).toBe(false);

    // 4. Invalid financialExecutionStatus enum
    const invalidEnumPkg = structuredClone(validPkg);
    invalidEnumPkg.releases[0].x_suivibudget.financialExecutionStatus = 'INVENTED_STATUS';
    expect(validate(invalidEnumPkg)).toBe(false);

    // 5. Missing required top-level publisher
    const missingPublisherPkg = structuredClone(validPkg);
    delete missingPublisherPkg.publisher;
    expect(validate(missingPublisherPkg)).toBe(false);
  });
});
