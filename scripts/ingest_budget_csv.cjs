// Explicit output only; never replaces the production catalogue implicitly.
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--input') || !args.includes('--output')) {
  console.error('Usage: npm run ingest:budget -- --input input.csv --output reviewed.json [--year 2026]');
  process.exit(1);
}
const compiled = ts.transpileModule(fs.readFileSync('src/utils/csv.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject });
const rows = exportsObject.parseCsv(fs.readFileSync(option('--input'),'utf8'));
const headers = rows.shift()?.map(s => s.trim()) || [];
const required = ['title','commune_name','region_name','budget_amount_fcfa','fiscal_year','source'];
if (required.some(name => !headers.includes(name)) || new Set(headers).size !== headers.length) throw new Error('Missing or duplicate canonical CSV headers: ' + required.join(';'));
const ids = new Set();
const projects = rows.map((row,index) => {
  if (row.length !== headers.length) throw new Error(`Invalid column count at row ${index + 2}`);
  const item = Object.fromEntries(headers.map((key,i) => [key,row[i].trim()]));
  const amount = Number(item.budget_amount_fcfa.replace(/[\s\u202f\u00a0]/g,'').replace(',','.'));
  const year = Number(item.fiscal_year);
  if (!item.budget_amount_fcfa.trim() || !Number.isSafeInteger(amount) || amount < 0 || !Number.isInteger(year) || year < 2000 || year > 2200 || !item.title || !item.source) throw new Error(`Invalid budget at row ${index + 2}`);
  if (args.includes('--year') && year !== Number(option('--year'))) throw new Error('Unexpected fiscal year');
  const id = item.id || 'import-' + crypto.createHash('sha256').update([year,item.commune_name,item.region_name,item.title,item.source].join('\u0000')).digest('hex').slice(0,24);
  if (ids.has(id)) throw new Error(`Duplicate ID at row ${index + 2}: ${id}`);
  ids.add(id);
  return { ...item, id, budget_amount_fcfa: amount, fiscal_year: year, current_status: 'UNKNOWN', progress_percentage: 0,
    nature_expense: 'Investissements', scope_level: item.scope_level === 'NATIONAL' ? 'NATIONAL' : 'LOCAL', budget_stage: 'VOTED' };
});
fs.writeFileSync(option('--output'), JSON.stringify(projects,null,2)+'\n', { flag: 'wx' });
console.log(JSON.stringify({ rows: projects.length, total_fcfa: projects.reduce((sum,p) => sum+p.budget_amount_fcfa,0), output: option('--output') }));
