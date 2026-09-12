import type { BudgetLineItem } from '../types';
export function normalizeEntityKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[’']/g, ' ').replace(/[^A-Z0-9]+/g, ' ').trim();
}
export function resolveBudgetAsset(entities: Record<string, string>, candidates: string[]) {
  for (const candidate of candidates.filter(Boolean)) {
    const key = normalizeEntityKey(candidate);
    const clean = key.replace(/^(MAIRIE|CONSEIL REGIONAL) (DE LA |DU |DES |DE |D )/, '');
    for (const lookup of [key, clean]) {
      const url = entities[lookup];
      if (url && /^\/data\/budgets\/[0-9a-f]+\.json$/.test(url)) return url;
    }
  }
  return null;
}
let index: Promise<{ entities: Record<string, string> }> | undefined;
export async function loadBudgetLines(id: string, name: string, title = ''): Promise<BudgetLineItem[]> {
  index ||= fetch('/data/budgets/manifest.json').then(async response => {
    if (!response.ok) throw new Error('Index budgétaire indisponible.');
    return response.json();
  }).catch(error => { index = undefined; throw error; });
  const manifest = await index;
  const url = resolveBudgetAsset(manifest.entities, [id, name, title]);
  if (!url) return []; // No synthetic figures or fuzzy cross-institution matches.
  const response = await fetch(url);
  if (!response.ok) throw new Error('Lignes budgétaires indisponibles.');
  const lines = await response.json();
  if (!Array.isArray(lines)) throw new Error('Données budgétaires invalides.');
  return lines;
}
