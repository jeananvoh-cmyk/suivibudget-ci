import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

const output = new URL('../public/data/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(new URL('budgets/', output), { recursive: true });
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[’']/g, ' ').replace(/[^A-Z0-9]+/g, ' ').trim();
async function asset(folder, value) {
  const text = JSON.stringify(value);
  const hash = createHash('sha256').update(text).digest('hex').slice(0, 20);
  const name = `${folder}${hash}.json`;
  await writeFile(new URL(name, output), text);
  return `/data/${name}`;
}
const rawBudgets = JSON.parse(await readFile(new URL('../src/data/budgetLines2026.json', import.meta.url), 'utf8'));
// Read only the checked-in constant initializer. Do not execute legacy synthetic fallback logic.
const source = await readFile(new URL('../src/data/budgetLinesData.ts', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('budgetLinesData.ts', source, ts.ScriptTarget.Latest, true);
let expression;
for (const statement of parsed.statements) if (ts.isVariableStatement(statement)) {
  for (const declaration of statement.declarationList.declarations) if (declaration.name.getText(parsed) === 'OFFICIAL_ENTITY_BUDGET_LINES') expression = declaration.initializer.getText(parsed);
}
if (!expression) throw new Error('Missing budget catalogue');
const compiled = ts.transpileModule(`globalThis.result = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const budgets = vm.runInNewContext(compiled + '\nresult', { budgetLines2026: rawBudgets }, { timeout: 10000 });
const entities = {}, ambiguous = new Set();
for (const [name, lines] of Object.entries(budgets)) {
  if (!Array.isArray(lines) || lines.some(line => typeof line.libelle !== 'string' || !Number.isFinite(line.montant_fcfa) || line.montant_fcfa < 0)) throw new Error(`Invalid budget lines: ${name}`);
  const url = await asset('budgets/', lines);
  const key = normalize(name);
  if (entities[key] && entities[key] !== url) ambiguous.add(key);
  else entities[key] = url;
}
for (const key of ambiguous) delete entities[key]; // Ambiguous names must not select an unrelated budget.
await writeFile(new URL('budgets/manifest.json', output), JSON.stringify({ entities, ambiguous: [...ambiguous] }));
const local = JSON.parse(await readFile(new URL('../src/data/officialProjectsFromCsv.json', import.meta.url), 'utf8'));
const national = JSON.parse(await readFile(new URL('../src/data/officialNationalProjects2026.json', import.meta.url), 'utf8'));
const projects = [...local.map(p => ({ ...p, scope_level: 'LOCAL' })), ...national.map(p => ({ ...p, scope_level: 'NATIONAL' }))];
const ids = new Set();
for (const p of projects) {
  if (!p.id || ids.has(p.id) || !p.title || !Number.isFinite(p.budget_amount_fcfa) || p.budget_amount_fcfa < 0) throw new Error(`Invalid or duplicate project: ${p.id}`);
  ids.add(p.id);
  p.current_status = 'UNKNOWN'; p.budget_stage = 'VOTED'; p.progress_percentage = 0;
}
const projectsUrl = await asset('projects-', projects);
await writeFile(new URL('projects-manifest.json', output), JSON.stringify({ url: projectsUrl, count: projects.length }));
console.log(`Data prepared: ${projects.length} projects; ${Object.keys(entities).length} exact budget keys; ${ambiguous.size} ambiguous keys omitted.`);
