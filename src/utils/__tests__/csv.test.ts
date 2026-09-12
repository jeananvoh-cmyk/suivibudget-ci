import { describe, it, expect } from 'vitest';
import { parseCsv } from '../csv';
import { resolveBudgetAsset } from '../../services/budgetLines';
describe('Reproducible budget imports and exact lookup', () => {
  it('parses quoted delimiters, escaped quotes, CRLF and embedded newlines', () => {
    expect(parseCsv('id;title\r\n1;"École; bâtiment ""A""\nPhase 1"\r\n')).toEqual([['id','title'],['1','École; bâtiment "A"\nPhase 1']]);
  });
  it('rejects unterminated quoted values', () => { expect(() => parseCsv('id;title\n1;"broken')).toThrow(); });
  it('does not manufacture a budget or use a substring match for an unknown entity', () => {
    const entities = { 'COUR DES COMPTES': '/data/budgets/abc123.json' };
    expect(resolveBudgetAsset(entities, ['Cour des comptes'])).toBe('/data/budgets/abc123.json');
    expect(resolveBudgetAsset(entities, ['Parquet de la cour des comptes'])).toBeNull();
    expect(resolveBudgetAsset({}, ['Ministère inconnu'])).toBeNull();
  });
});
