import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import legalCP from '../../../docs/references/2026/ministry-reconciliation/LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json';
import officialSections from '../../../docs/audits/institution-reconciliation/LFI_2026_SECTION_EVIDENCE.json';
import { ALL_COMMUNES_DATA, ALL_REGIONS_DATA } from '../../data/officialDataFromCsv';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';

function parseRow(line: string): string[] {
  const result: string[] = [];
  let quoted = false;
  let field = '';
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"' && quoted && line[i + 1] === '"') {
      field += '"';
      i += 1;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === ';' && !quoted) {
      result.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  result.push(field);
  expect(quoted).toBe(false);
  return result;
}

function loadCsv(name: string): Record<string, string>[] {
  const raw = readFileSync(join(process.cwd(), 'public', 'data', name), 'utf8')
    .replace(/^\uFEFF/, '').trim();
  const lines = raw.split(/\r?\n/);
  const keys = parseRow(lines[0]);
  return lines.slice(1).map(line => {
    const fields = parseRow(line);
    expect(fields).toHaveLength(keys.length);
    return Object.fromEntries(keys.map((key, index) => [key, fields[index]]));
  });
}

describe('citizen-facing 2026 budget open-data exported from documented values', () => {
  const entries = loadCsv('budgets-entites-2026.csv');
  const programmes = loadCsv('programmes-ministeriels-2026.csv');

  it('has exactly one row for every ministry, national institution, commune and regional council', () => {
    expect(entries).toHaveLength(281);
    for (const [type, n] of [['MINISTERE', 35], ['INSTITUTION', 14],
      ['COMMUNE', 201], ['CONSEIL_REGIONAL', 31]] as const) {
      expect(entries.filter(x => x.type_entite === type)).toHaveLength(n);
    }
    expect(new Set(entries.map(x => x.identifiant)).size).toBe(281);
    expect(entries.filter(x => x.montant_fcfa !== '')).toHaveLength(94);
    expect(entries.filter(x => x.montant_fcfa === '')).toHaveLength(187);
    expect(entries.every(x => x.exercice === '2026')).toBe(true);
  });

  it('reproduces LFI section CP exactly but excludes shared and internal programmes from additive totals', () => {
    for (const source of legalCP.rows) {
      const record = entries.find(x => x.identifiant === source.portfolio_id);
      expect(record).toBeDefined();
      expect(record?.code_section).toBe(source.section_code);
      expect(Number(record?.montant_fcfa)).toBe(source.voted_section_cp_2026_fcfa);
      expect(record?.source_url).toBe(legalCP.source_pdf_url);
      expect(record?.addition_autorisee).toBe(
        source.portfolio_id === 'gov-035' ? 'NON_DOUBLON' : 'OUI_SECTION_UNIQUE',
      );
      expect(record?.statut).toBe('SECTION_VERIFIEE_PORTFEUILLE_NON_CERTIFIE');
    }
    for (const source of officialSections.national) {
      const record = entries.find(x => x.identifiant === source.id);
      expect(record).toBeDefined();
      expect(Number(record?.montant_fcfa)).toBe(source.amount_fcfa);
      expect(record?.addition_autorisee).toBe(
        source.record_kind === 'INTERNAL_PROGRAM' ? 'NON_INCLUS_DANS_SECTION_PARENT' : 'OUI_SECTION_UNIQUE',
      );
    }
    expect(entries.find(x => x.identifiant === 'inst-cour-supreme')?.montant_fcfa).toBe('');
  });

  it('reports the 46 local BP amounts from their named sources, never derived state/local income', () => {
    const eligibleIds = new Set([...ALL_COMMUNES_DATA, ...ALL_REGIONS_DATA.filter(x => x.type === 'REGION')]
      .map(x => x.id));
    expect(Object.keys(OFFICIAL_PRIMITIVE_BUDGETS)).toHaveLength(46);
    for (const [id, source] of Object.entries(OFFICIAL_PRIMITIVE_BUDGETS)) {
      expect(eligibleIds.has(id), id).toBe(true);
      const record = entries.find(x => x.identifiant === id);
      expect(record, id).toBeDefined();
      expect(Number(record?.montant_fcfa)).toBe(source.total_voted_fcfa);
      expect(record?.source_url).toBe(source.source_url);
      expect(record?.source_type).toBe('PUBLICATION_SECONDAIRE');
    }
    expect(entries.filter(x => x.statut === 'BUDGET_PRIMITIF_NON_DOCUMENTE')).toHaveLength(186);
  });

  it('does not revive the 31 disproven regional grants breakdowns', () => {
    const councils = ALL_REGIONS_DATA.filter(x => x.type === 'REGION');
    expect(councils).toHaveLength(31);
    for (const council of councils) {
      expect(council.budget_functioning_fcfa, council.id).toBeNull();
      expect(council.budget_investment_fcfa, council.id).toBeNull();
    }
  });

  it('exports 161 programmes for 34 unique sections, each balancing the voted section CP', () => {
    expect(programmes).toHaveLength(161);
    const sections = new Set(programmes.map(x => x.section));
    expect(sections.size).toBe(34);
    for (const section of sections) {
      const rows = programmes.filter(x => x.section === section);
      const cp = legalCP.rows.find(x => x.section_code === section)?.voted_section_cp_2026_fcfa;
      expect(rows.reduce((sum, x) => sum + Number(x.cp_2026_fcfa), 0), section).toBe(cp);
      for (const row of rows) {
        expect(row.url_lfi).toBe(legalCP.source_pdf_url);
        expect(row.intitule.trim().length).toBeGreaterThan(2);
        expect(Number.isSafeInteger(Number(row.cp_2026_fcfa))).toBe(true);
      }
    }
  });
});
