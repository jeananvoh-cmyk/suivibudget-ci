import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { classifyObservation, checkAggregate, checkBaseline, checkPublicUse, publicGet, inventory } from './audit-public-amounts.mjs';

const observation = { id: 'TEST:total', institution: 'TEST', year: 2026, nature: 'INITIAL_BUDGET', value_fcfa: 100, precision: 'EXACT', source_url: 'https://official.test/budget.pdf', location: 'PDF p. 1', status: 'NOT_YET_CHECKED' };
const evidence = { ...observation, official: true, sha256: 'a'.repeat(64), checked: true };

describe('Independent public amount audit — synthetic fixtures only', () => {
  it('requires value, attribution and a checked official location together', () => {
    expect(classifyObservation(observation, evidence)).toBe('VERIFIED_EXACT');
    expect(classifyObservation(observation, { ...evidence, checked: false })).toBe('NOT_YET_CHECKED');
    expect(classifyObservation(observation, { ...evidence, official: false })).toBe('SOURCE_MISSING');
    expect(classifyObservation(observation, { ...evidence, location: null })).toBe('DOCUMENTARY_LOCATION_MISSING');
  });
  it('detects a one-franc mutation', () => {
    expect(classifyObservation({ ...observation, value_fcfa: 101 }, evidence)).toBe('MISMATCH');
    expect(checkBaseline([{ ...observation, value_fcfa: 101 }], [observation])).toEqual(['TEST:total']);
  });
  it('detects added and removed financial observations', () => {
    expect(checkBaseline([], [observation])).toEqual([observation.id]);
    expect(checkBaseline([observation], [])).toEqual([observation.id]);
  });
  it.each(['id', 'institution', 'year'])('rejects incorrect %s attribution', key => {
    expect(classifyObservation({ ...observation, [key]: 'OTHER' }, evidence)).toBe('WRONG_ATTRIBUTION');
  });
  it('never compares appropriations and execution', () => {
    expect(classifyObservation({ ...observation, nature: 'EXECUTION' }, evidence)).toBe('NOT_COMPARABLE');
    expect(checkAggregate([{ ...observation, nature: 'EXECUTION' }], observation).issues).toContain('INCOMPATIBLE_SCOPE');
  });
  it('keeps unknown separate from a documented zero', () => {
    expect(classifyObservation({ ...observation, value_fcfa: null }, evidence)).toBe('NOT_YET_CHECKED');
    expect(classifyObservation({ ...observation, precision: 'UNKNOWN', value_fcfa: 0 }, { ...evidence, value_fcfa: 0 })).toBe('NOT_YET_CHECKED');
    expect(classifyObservation({ ...observation, value_fcfa: 0 }, { ...evidence, value_fcfa: 0 })).toBe('VERIFIED_EXACT');
    expect(checkAggregate([{ ...observation, value_fcfa: null }], observation).sum).toBeNull();
  });
  it('reports duplicate observations and incoherent totals without summing twice', () => {
    expect(checkAggregate([observation, observation], observation).issues).toContain('DUPLICATE_OBSERVATION');
    expect(checkAggregate([{ ...observation, id: 'TEST:part', value_fcfa: 99 }], observation).issues).toContain('TOTAL_MISMATCH');
  });
  it('does not infer physical completion from a financial observation', () => {
    expect(checkPublicUse(observation, { physical_status: 'COMPLETED' })).toContain('BUDGET_IS_NOT_PHYSICAL_PROOF');
    expect(checkPublicUse(observation, { nature: 'EXECUTION' })).toContain('BUDGET_IS_NOT_EXECUTION');
    expect(checkPublicUse({ ...observation, value_fcfa: null }, { value_fcfa: 0 })).toContain('UNKNOWN_RENDERED_AS_ZERO');
  });
  it('blocks remote mutations and other Supabase projects before any network call', async () => {
    await expect(publicGet('https://cdesuvcozcetdtvibgqs.supabase.co/rest/v1/local_budgets', 'anon', { method: 'POST' })).rejects.toThrow('READ_ONLY');
    await expect(publicGet('https://other.supabase.co/rest/v1/local_budgets', 'anon')).rejects.toThrow('PROJECT_NOT_ALLOWED');
  });
});

it('keeps the audited public financial snapshot stable until a documented baseline review', async () => {
  const baseline = fs.readFileSync(new URL('../docs/audits/public-amounts/inventory.jsonl', import.meta.url), 'utf8').trim().split('\n').map(JSON.parse);
  const { observations, summary } = await inventory({ writeArtifacts: false });
  expect(checkBaseline(observations, baseline)).toEqual([]);
  expect(summary.duplicate_ids).toEqual([]);
  for (const prior of baseline.filter(o => o.status === 'VERIFIED_EXACT')) {
    expect(observations.find(o => o.id === prior.id)?.status).toBe('VERIFIED_EXACT');
  }
}, 30000);
