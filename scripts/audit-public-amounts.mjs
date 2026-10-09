import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/audits/public-amounts');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const load = (name, fallback) => fs.existsSync(path.join(output, name)) ? JSON.parse(fs.readFileSync(path.join(output, name), 'utf8')) : fallback;
const save = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n');

async function reviewPr29() {
  const revision = 'd479c1f9596538aac9caa82193ec766b4f4591e4';
  const base = '707b3b688f23bd33dc0f3504e13b79c65908dd50';
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const files = new Set(git('ls-tree', '-r', '--name-only', revision).split('\n'));
  const result = await build({ stdin: { contents: `
    import { canPublishOfficialObservation } from './src/review/domain/documents';
    import { OFFICIAL_FINANCIAL_AUDITS } from './src/review/domain/financialAudits';
    import { openDataRows } from './src/review/domain/history';
    import { buildReviewSnapshot } from './src/review/domain/snapshot';
    const a = OFFICIAL_FINANCIAL_AUDITS.find(a => a.institutionId === 'gov-003' && a.scope === 'SECTION_TOTAL');
    const doc = { id:a.documentId, title:'LFI 2026', publisher:'DGBF', officialUrl:'https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf', fiscalYear:2026, accessedAt:'2026-10-09', httpStatus:200, sha256:a.documentSha256, pageCount:583, verification:'VERIFIED', visibility:'PUBLIC', previousVersionId:null, availability:'AVAILABLE', provenance:'OFFICIAL_SOURCE', extractionStatus:'VERIFIED' };
    const o = { institutionId:a.institutionId, sectionCode:a.sectionCode, fiscalYear:2026, scope:a.scope, periodEnd:'2026-12-31', currency:'XOF', measure:a.measure, basis:a.basis, amount:a.auditedAmount+1, precision:'EXACT', evidence:{documentId:a.documentId,page:a.page,reference:'Récapitulatif CP 2026',fiscalYear:2026,verification:'VERIFIED'} };
    export const proof = { original:a.auditedAmount, mutation:o.amount, strict:canPublishOfficialObservation(o,[doc]), exported:openDataRows([o],[doc]), snapshot:buildReviewSnapshot({institutionId:a.institutionId,sectionCode:a.sectionCode,fiscalYear:2026},[o],[doc]) };
  `, sourcefile: 'pr29-entry.ts', loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false,
  plugins: [{ name: 'read-pinned-git-tree', setup(builder) {
    builder.onResolve({ filter: /^\./ }, args => {
      const name = path.posix.normalize(path.posix.join(args.namespace === 'pr29' ? path.posix.dirname(args.importer) : '', args.path));
      const file = ['', '.ts', '.tsx', '.json'].map(ext => name + ext).find(f => files.has(f));
      if (!file) throw new Error(`MISSING_PINNED_SOURCE:${name}`);
      return { path: file, namespace: 'pr29' };
    });
    builder.onLoad({ filter: /.*/, namespace: 'pr29' }, args => ({ contents: git('show', `${revision}:${args.path}`), loader: args.path.endsWith('.json') ? 'json' : 'ts' }));
  } }] });
  const module = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
  const proof = module.exports.proof;
  if (proof.strict.value !== null || !proof.strict.reasons.includes('AMOUNT_MISMATCH') || proof.exported[0].amount !== proof.mutation || proof.snapshot.status !== 'AVAILABLE') throw new Error('PR29_FINDING_NOT_REPRODUCED');
  const diff = git('diff', '--numstat', `${base}...${revision}`).split('\n').map(line => {
    const [added, removed, file] = line.split('\t');
    return { file, added: Number(added), removed: Number(removed) };
  });
  save('pr29-review.json', { head: revision, base, reproduced_at: new Date().toISOString(), verdict: 'NO_GO', files: diff, added: diff.reduce((n, f) => n + f.added, 0), removed: diff.reduce((n, f) => n + f.removed, 0), protected_paths_changed: diff.filter(f => /^(src\/data\/|src\/budget-ingestion\/|docs\/imports\/|docs\/references\/2026\/|supabase\/|package-lock.json)/.test(f.file)), proof });
}

async function reconcilePdf(pdfDirectory) {
  const { PDFParse } = await import('pdf-parse');
  const documents = [
    { file: 'Loi-de-Finances-2026.pdf', sha256: 'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76', pages: Array.from({ length: 10 }, (_, i) => 45 + i) },
    { file: 'Annexe-4-DPPD-PAP-2026-2028.pdf', sha256: '0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10', pages: Array.from({ length: 34 }, (_, i) => 799 + i) },
  ];
  for (const document of documents) {
    const bytes = fs.readFileSync(path.join(pdfDirectory, document.file));
    if (hash(bytes) !== document.sha256) throw new Error(`SOURCE_HASH_CHANGED:${document.file}`);
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    document.text = (await parser.getText({ partial: document.pages })).pages;
    await parser.destroy();
    document.source_url = `https://www.dgbf.ci/wp-content/uploads/2025/12/${document.file}`;
  }
  const lfi = [];
  for (const page of documents[0].text) {
    const lines = page.text.split('\n');
    const labels = lines.filter(l => /^\d{1,5} [^\d]/.test(l) || l === 'Total Général');
    const values = lines.filter(l => /^\d[\d.]*\s+\d[\d.]*$/.test(l));
    if (labels.length !== values.length) throw new Error(`LFI_COLUMN_ALIGNMENT_UNCONFIRMED:${page.num}`);
    labels.forEach((label, i) => lfi.push({ code: label.split(' ')[0], label, value_fcfa: Number(values[i].split(/\s+/).at(-1).replaceAll('.', '')), page: page.num }));
  }
  const { observations } = await inventory({ writeArtifacts: false });
  const checks = load('documentary-checks.json', []).filter(c => !documents.some(d => d.source_url === c.source_url));
  const add = (o, row, document, note, nature = o.nature) => checks.push({ id: o.id, institution: o.institution, year: 2026, nature, value_fcfa: row.value_fcfa, source_url: document.source_url, sha256: document.sha256, location: `PDF p. ${row.page} / ${document === documents[0] ? 'Récapitulatif par section, dotation et programme / CP 2026' : 'Tableau 7 / colonne 2026'}`, documentary_label: row.label, checked: true, official: true, checked_at: '2026-10-09', method: note });
  const sections = ['108','226','237','321','325','323','322','348','229','340','366','357','335','358','351','376','336','345','347','350','328','333','362','331','330','369','356','352','346','444','343','440','439','334','229'];
  const uncertainScope = new Set([7, 10, 14, 21, 23, 24, 35]);
  sections.forEach((section, i) => {
    const o = observations.find(o => o.id === `institution:gov-${String(i + 1).padStart(3, '0')}:total_budget_fcfa`);
    const rows = lfi.filter(r => r.code === section);
    const row = rows.at(-1);
    if (o && row) add(o, row, documents[0], uncertainScope.has(i + 1) ? 'Périmètre public réorganisé ou fusionné : aucune équivalence juridique démontrée avec la section LFI. Ne pas comparer les montants.' : 'Correspondance institution-section relue ; lecture de la colonne CP 2026 de la ligne de section.', uncertainScope.has(i + 1) ? 'UNRESOLVED_LFI_SCOPE_EQUIVALENCE' : o.nature);
  });
  const institutions = { 'inst-presidence': '103', 'inst-assnat': '101', 'inst-senat': '102', 'inst-conseil-const': '106', 'inst-cour-comptes': '115', 'inst-conseil-etat': '118', 'inst-cour-cassation': '114', 'inst-mediateur': '109', 'inst-chancellerie': '107', 'inst-cesec': '105', 'inst-cnrct': '111' };
  for (const [id, code] of Object.entries(institutions)) {
    const o = observations.find(o => o.id === `institution:${id}:total_budget_fcfa`);
    add(o, lfi.find(r => r.code === code), documents[0], 'Institution et dotation identifiées dans le récapitulatif LFI ; ne pas additionner aux programmes de cette dotation.');
  }
  for (const o of observations.filter(o => /^mmpe:.*:amount_fcfa$/.test(o.id) && !o.id.includes(':source:'))) {
    const code = o.record_id.replace(/^(prog|act)-/, '');
    const pages = String(o.location).match(/PDF pp?\. (\d+)(?:-(\d+))?/);
    if (!pages) continue;
    const matches = [];
    for (const p of documents[1].text.filter(p => p.num >= Number(pages[1]) && p.num <= Number(pages[2] || pages[1]))) {
      for (const line of p.text.split('\n')) {
        if (!line.startsWith(code + ' ')) continue;
        const columns = line.split(/\t/).map(x => x.trim());
        if (columns.length < 4 || !/^\d[\d ]*$/.test(columns[1])) continue;
        matches.push({ page: p.num, label: columns[0], value_fcfa: Number(columns[1].replaceAll(' ', '')) });
      }
    }
    if (matches.length && new Set(matches.map(m => m.value_fcfa)).size === 1) add(o, matches[0], documents[1], 'Section MMPE 348, code programme/action exact, page annoncée et première colonne 2026 contrôlés dans le PDF ; répétitions de titre dédupliquées.');
  }
  save('documentary-checks.json', checks);
  save('document-manifest.json', [...load('document-manifest.json', []).filter(c => !documents.some(d => d.source_url === c.source_url)), ...documents.map(({ text, ...d }) => ({ ...d, http_status_at_acquisition: 200, acquired_at: '2026-10-09', byte_length: fs.statSync(path.join(pdfDirectory, d.file)).size }))]);
  save('lfi-summary-transcription.json', lfi);
}

export function classifyObservation(observation, evidence) {
  if (observation.value_fcfa == null || observation.precision !== 'EXACT') return 'NOT_YET_CHECKED';
  if (evidence?.checked) {
    if (!evidence.official || !evidence.source_url || !evidence.sha256) return 'SOURCE_MISSING';
    if (!evidence.location) return 'DOCUMENTARY_LOCATION_MISSING';
    if (evidence.id !== observation.id || evidence.institution !== observation.institution || evidence.year !== observation.year) return 'WRONG_ATTRIBUTION';
    if (evidence.nature !== observation.nature) return 'NOT_COMPARABLE';
    return observation.value_fcfa === evidence.value_fcfa ? 'VERIFIED_EXACT' : 'MISMATCH';
  }
  if (!observation.source_url) return 'SOURCE_MISSING';
  if (!observation.location) return 'DOCUMENTARY_LOCATION_MISSING';
  return 'NOT_YET_CHECKED';
}

export function checkAggregate(parts, total) {
  const issues = [];
  if (new Set(parts.map(p => p.id)).size !== parts.length) issues.push('DUPLICATE_OBSERVATION');
  if (parts.some(p => p.institution !== total.institution || p.year !== total.year || p.nature !== total.nature)) issues.push('INCOMPATIBLE_SCOPE');
  const unknown = parts.some(p => p.value_fcfa == null || p.precision !== 'EXACT');
  if (unknown) issues.push('UNKNOWN_COMPONENT');
  const sum = issues.length ? null : parts.reduce((n, p) => n + p.value_fcfa, 0);
  if (sum !== null && total.value_fcfa !== null && total.precision === 'EXACT' && sum !== total.value_fcfa) issues.push('TOTAL_MISMATCH');
  return { sum, issues };
}

export function checkBaseline(observations, baseline) {
  const before = new Map(baseline.map(o => [o.id, o]));
  const now = new Set(observations.map(o => o.id));
  return [...observations.filter(o => {
    const b = before.get(o.id);
    return !b || ['value_fcfa', 'institution', 'institution_name', 'label', 'technical_source', 'year', 'nature', 'precision', 'source_url', 'location'].some(k => o[k] !== b[k]);
  }).map(o => o.id), ...baseline.filter(o => !now.has(o.id)).map(o => o.id)];
}

export function checkPublicUse(observation, projection) {
  const issues = [];
  if ((observation.value_fcfa == null || observation.precision === 'UNKNOWN') && projection.value_fcfa === 0) issues.push('UNKNOWN_RENDERED_AS_ZERO');
  if (projection.physical_status === 'COMPLETED' && !projection.physical_evidence) issues.push('BUDGET_IS_NOT_PHYSICAL_PROOF');
  if (observation.nature !== 'EXECUTION' && projection.nature === 'EXECUTION') issues.push('BUDGET_IS_NOT_EXECUTION');
  return issues;
}

export async function publicGet(url, key, options = {}) {
  if (options.method && options.method !== 'GET') throw new Error('READ_ONLY');
  const target = new URL(url);
  if (target.origin !== 'https://cdesuvcozcetdtvibgqs.supabase.co' || !target.pathname.startsWith('/rest/v1/')) throw new Error('PROJECT_NOT_ALLOWED');
  if (key.startsWith('eyJ') && JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role !== 'anon') throw new Error('ANON_ONLY');
  return fetch(url, { method: 'GET', headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
}

const monetary = /(?:fcfa$|^budgetFCFA$|^amount$|^award_amount$|^planned_amount$|^executed_amount$|^(?:total|operating|investment)_(?:amount|planned|realized|revenue_(?:planned|emitted|collected|realized)|expenditure_(?:planned|engaged))$|^surplus_or_deficit$|^total_revenue_collected$|^total_expenditure_engaged$|^arithmetic_difference$)/;
const publicFields = new Set(['id', 'institution_id', 'institution_type', 'institution_name', 'fiscal_year', 'budget_type', 'status', 'verification_status', 'amount_precision', 'amount_precisions', 'is_current_version', 'version_number', 'source_url', 'source_page', 'source_reference', 'source_document', 'source_document_id', 'document_url', 'document_name', 'measure_type', 'flow_type', 'section', 'exact_heading', 'account_code', 'ca_id', 'operation_id', 'operation_reference', 'title', 'match_level', 'contract_number', 'procurement_object', 'source', 'adoption_date', 'approval_date', 'updated_at']);

async function captureRemote() {
  const env = Object.fromEntries(read('.env').split(/\r?\n/).flatMap(line => {
    const m = line.match(/^(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)=(.*)$/);
    return m ? [[m[1], m[2].replace(/^['"]|['"]$/g, '')]] : [];
  }));
  const tables = {};
  const requests = [];
  const schemaResponse = await publicGet(`${env.VITE_SUPABASE_URL}/rest/v1/`, env.VITE_SUPABASE_ANON_KEY);
  const schema = schemaResponse.ok ? await schemaResponse.json() : {};
  const discovered = Object.entries(schema.definitions ?? {}).filter(([, definition]) => Object.keys(definition.properties ?? {}).some(k => monetary.test(k))).map(([name]) => name);
  const financialTables = [...new Set(['local_budgets', 'administrative_accounts', 'ca_financial_lines', 'ca_investment_operations', 'ca_procurement_matches', 'institutions', 'projects', 'budget_lines', 'budget_revenue_sources', ...discovered])];
  for (const table of financialTables) {
    tables[table] = [];
    for (let offset = 0; ; offset += 500) {
      const response = await publicGet(`${env.VITE_SUPABASE_URL}/rest/v1/${table}?select=*&order=id&limit=500&offset=${offset}`, env.VITE_SUPABASE_ANON_KEY);
      const data = await response.json();
      requests.push({ table, offset, status: response.status, rows: Array.isArray(data) ? data.length : null, error: response.ok ? null : data.code });
      if (!response.ok) break;
      for (const row of data) {
        const safe = Object.fromEntries(Object.entries(row).filter(([k]) => publicFields.has(k) || monetary.test(k)));
        if (row.import_provenance) {
          safe.import_source = row.import_provenance.source;
          safe.import_precision = row.import_provenance.precision;
        }
        tables[table].push(safe);
      }
      if (data.length < 500) break;
    }
  }
  save('remote-public-snapshot.json', { captured_at: new Date().toISOString(), project: 'cdesuvcozcetdtvibgqs', credential: 'anon', methods: ['GET'], remote_writes: 0, openapi_status: schemaResponse.status, discovered_financial_tables: discovered, requests, tables });
}

async function runtimeData() {
  const source = read('src/services/dataStore.ts');
  const ast = ts.createSourceFile('dataStore.ts', source, ts.ScriptTarget.Latest, true);
  const filter = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'isTangiblePhysicalProject').getText(ast);
  const entry = `
    import { INSTITUTIONS_DATA } from './src/data/institutionsData';
    import { RAW_BUDGET_PROJECTS } from './src/data/budgetData';
    import { OFFICIAL_PRIMITIVE_BUDGETS } from './src/data/officialPrimitiveBudgets';
    import { LOCAL_BUDGETS_REFERENTIAL } from './src/data/localBudgetsReferential';
    import { getBudgetLinesForEntity, REGULATORY_AUTHORITIES_BUDGET_LINES, NATIONAL_INSTITUTIONS_EXTRA_LINES } from './src/data/budgetLinesData';
    import nationalLines from './src/data/budgetLines2026.json';
    import localLines from './src/data/localBudgetLines2026.json';
    import { MMPE_MINISTRY_BUDGET_2026 } from './src/data/ministryPilotReferential';
    import { STRATEGIC_PROJECTS_LIST } from './src/data/strategicProjectsData';
    import { getProjectsForInstitution } from './src/utils/institutionProjects';
    ${filter}
    const origins=new Map();
    for(const [file,groups] of [['src/data/budgetLines2026.json',nationalLines],['src/data/localBudgetLines2026.json',localLines],['src/data/budgetLinesData.ts#REGULATORY_AUTHORITIES_BUDGET_LINES',REGULATORY_AUTHORITIES_BUDGET_LINES],['src/data/budgetLinesData.ts#NATIONAL_INSTITUTIONS_EXTRA_LINES',NATIONAL_INSTITUTIONS_EXTRA_LINES]]) for(const [group,lines] of Object.entries(groups)) lines.forEach((line,index)=>origins.set(line,file+'#'+group+'/'+index));
    export const data = {institutions:INSTITUTIONS_DATA,projects:RAW_BUDGET_PROJECTS.filter(isTangiblePhysicalProject),rawProjects:RAW_BUDGET_PROJECTS,primitive:OFFICIAL_PRIMITIVE_BUDGETS,local:LOCAL_BUDGETS_REFERENTIAL,mmpe:MMPE_MINISTRY_BUDGET_2026,strategic:STRATEGIC_PROJECTS_LIST,getLines:getBudgetLinesForEntity,getProjects:getProjectsForInstitution,origins};`;
  const result = await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
  return module.exports.data;
}

function surfaces() {
  const result = [];
  for (const base of ['src/pages', 'src/components', 'src/utils', 'src/services']) {
    const files = fs.readdirSync(path.join(root, base), { recursive: true }).filter(f => /\.tsx?$/.test(f) && !/__tests__|admin[\\/]|Admin|Manager|Importer/.test(f));
    for (const file of files) {
      const relative = `${base}/${file.replaceAll('\\', '/')}`;
      read(relative).split(/\r?\n/).forEach((line, index) => {
        if (/format(?:QualifiedFCFA|RecordAmount|FCFA|CompactFCFA|AmountInWords)\(|\b(?:reduce|budgetFCFA)\b|\d[\d ,.]*(?:Milliards|Mds|millions|milliards)\s*FCFA/.test(line)) result.push({ file: relative, line: index + 1, expression: line.trim() });
      });
    }
  }
  return result;
}

export async function inventory({ writeArtifacts = true } = {}) {
  if (writeArtifacts) fs.mkdirSync(output, { recursive: true });
  const data = await runtimeData();
  const remote = load('remote-public-snapshot.json', { tables: {}, requests: [] });
  const evidence = new Map(load('documentary-checks.json', []).map(e => [e.id, e]));
  const observations = [];
  const aggregates = [];
  const anomalies = [];
  const add = (id, value, context) => {
    const row = { id, record_id: context.record_id ?? id, institution: context.institution ?? null, institution_name: context.institution_name ?? null,
      year: context.year ?? null, nature: context.nature ?? 'UNSPECIFIED', value_fcfa: value ?? null, precision: context.precision ?? (value == null ? 'UNKNOWN' : 'EXACT'),
      technical_source: context.technical_source, source_url: context.source_url ?? null, source_label: context.source_label ?? null, location: context.location ?? null,
      source_date: context.source_date ?? null, declared_verification: context.declared_verification ?? null, exposure: context.exposure ?? 'PUBLIC_CANDIDATE', surfaces: context.surfaces ?? [], label: context.label ?? null };
    const check = evidence.get(id);
    row.status = classifyObservation(row, check);
    if (check) row.check = check;
    observations.push(row);
    return row;
  };
  const fields = (record, prefix, context) => {
    const rows = [];
    for (const [key, value] of Object.entries(record)) if (monetary.test(key) && (typeof value === 'number' || value === null)) rows.push(add(`${prefix}:${key}`, value, { ...context, record_id: record.id ?? prefix, label: key, source_date: record.import_source?.date ?? record.publication_date ?? record.adoption_date ?? record.approval_date ?? null, nature: context.nature === 'CA_MIXED_FIELDS' ? `CA:${key}` : context.nature, precision: record.import_precision?.[key] ?? record.import_provenance?.precision?.[key] ?? record.amount_precisions?.[key] ?? record.amount_precision ?? record.precision ?? context.precision }));
    return rows;
  };
  const literals = [
    ['state-total', 'src/pages/institutions/AnnuaireIndexPage.tsx', /17 350,2 Milliards FCFA/, 'Budget global de l’État', 'STATE_TOTAL', 'NATIONAL', 1e9],
    ['state-revenue', 'src/pages/institutions/AnnuaireIndexPage.tsx', /8 728,5 Mds FCFA/, 'Recettes budgétaires', 'PLANNED_REVENUE', 'NATIONAL', 1e9],
    ['state-treasury', 'src/pages/institutions/AnnuaireIndexPage.tsx', /7 081,5 Mds FCFA/, 'Ressources de trésorerie', 'PLANNED_TREASURY', 'NATIONAL', 1e9],
    ['state-special-accounts', 'src/pages/institutions/AnnuaireIndexPage.tsx', /1 540,2 Mds FCFA/, 'Comptes spéciaux du Trésor', 'PLANNED_SPECIAL_ACCOUNTS', 'NATIONAL', 1e9],
    ['investment-headline', 'src/pages/HomePage.tsx', /3 461 Mds FCFA/, 'Investissements publics annoncés', 'INVESTMENT_HEADLINE', 'NATIONAL_AND_LOCAL', 1e9],
    ['investment-observatory', 'src/pages/ObservatoryPage.tsx', /3 453,8 Milliards FCFA/, 'Investissements annoncés observatoire', 'INVESTMENT_HEADLINE', 'NATIONAL_AND_LOCAL', 1e9],
    ['state-footer', 'src/components/Footer.tsx', /15 339,2 Milliards FCFA/, 'Infobulle LFI 2026', 'STATE_TOTAL', 'NATIONAL', 1e9],
    ['attecoube-emergency', 'src/components/InstitutionDetailModal.tsx', /200 000 000 FCFA/, 'Six chantiers d’urgence Attécoubé', 'PROJECT_ALLOCATION', 'inst-com-attecoube', 1],
  ];
  for (const [id, file, pattern, label, nature, institution, unit] of literals) {
    const source = read(file);
    const match = source.match(pattern);
    if (!match) throw new Error(`LITERAL_CHANGED_REVIEW_REQUIRED:${id}`);
    const amount = Number(match[0].match(/^[\d ,]+/)[0].replaceAll(' ', '').replace(',', '.')) * unit;
    const row = add(`literal:${id}`, amount, { institution, year: 2026, nature, label, precision: unit === 1 ? 'EXACT' : 'APPROXIMATE', technical_source: `${file}:${source.slice(0, match.index).split('\n').length}`, surfaces: [file], source_label: 'Texte UI ; unité convertie en FCFA, aucun original attaché à ce montant' });
    if (id === 'investment-headline') row.surfaces.push('src/pages/institutions/AnnuaireIndexPage.tsx', 'index.html / description / OpenGraph / Twitter / JSON-LD');
    if (id === 'attecoube-emergency') row.surfaces.push('src/pages/institutions/MunicipalitiesPage.tsx');
  }
  const local = [...data.local.filter(b => !(remote.tables.local_budgets ?? []).some(r => r.institution_id === b.institution_id && r.fiscal_year === b.fiscal_year && r.budget_type === b.budget_type && r.version_number === b.version_number)), ...(remote.tables.local_budgets ?? [])];
  for (const inst of data.institutions) {
    const context = { institution: inst.id, institution_name: inst.name, year: 2026, nature: inst.type === 'MINISTERE' ? 'INITIAL_BUDGET' : 'STATE_APPROPRIATION', technical_source: 'src/data/institutionsData.ts', surfaces: ['annuaire', 'fiche institution'], declared_verification: null };
    fields(inst, `institution:${inst.id}`, context);
    const lines = data.getLines(inst.name, inst.type, inst.leader_title || inst.leader_name, inst.id);
    const ledger = lines.map((line, i) => add(`line:${inst.id}:${i}`, line.montant_fcfa, { ...context, record_id: `${inst.id}/line/${i}`, nature: 'INITIAL_BUDGET_LINE', technical_source: data.origins.get(line) ?? 'src/data/budgetLinesData.ts#getBudgetLinesForEntity', year: line.year ?? 2026, label: line.libelle, surfaces: ['fiche institution / lignes budgétaires', 'total filtré des lignes'], source_url: line.source_url, location: line.source_page ?? line.page_reference }));
    if (ledger.length) aggregates.push({ id: `sum-lines:${inst.id}`, value_fcfa: ledger.reduce((n, o) => n + (o.value_fcfa || 0), 0), component_ids: ledger.map(o => o.id), formula: 'sum(montant_fcfa || 0)', institution: inst.id, year: 2026, documentary_status: 'NOT_YET_CHECKED' });
    const budgets = local.filter(b => b.institution_id === inst.id).sort((a, b) => b.fiscal_year - a.fiscal_year || (b.version_number ?? 0) - (a.version_number ?? 0));
    const current = budgets.find(b => b.fiscal_year === 2026 && b.is_current_version) || budgets.find(b => b.fiscal_year === 2026);
    const primitive = data.primitive[inst.id] || inst.primitive_budget;
    if (primitive) fields(primitive, `primitive:${inst.id}`, { ...context, nature: 'LOCAL_BUDGET', technical_source: 'src/data/officialPrimitiveBudgets.ts', source_label: primitive.source, source_url: primitive.source_url, exposure: current?.total_amount != null ? 'SUPERSEDED_FALLBACK' : 'PUBLIC_CANDIDATE', surfaces: ['fiche collectivité / budget primitif'] });
  }
  for (const b of local) {
    const rows = fields(b, `local:${b.id}`, { institution: b.institution_id, institution_name: b.institution_name, year: b.fiscal_year, nature: b.budget_type, technical_source: remote.tables.local_budgets?.some(r => r.id === b.id) ? 'supabase.local_budgets' : 'src/data/localBudgetsReferential.ts', source_url: b.primary_source_url || b.import_source?.url || b.document_url, source_label: b.primary_source_label || b.import_source?.name || b.document_name, location: b.import_source?.page || b.import_source?.reference, declared_verification: `${b.status}/${b.verification_status}`, surfaces: ['fiche collectivité', 'historique BP/BM', 'exports CSV/JSON'] });
    const total = rows.find(r => r.label === 'total_amount');
    const parts = rows.filter(r => ['operating_amount', 'investment_amount'].includes(r.label));
    if (total && parts.length === 2) {
      const check = checkAggregate(parts, total);
      if (check.issues.length) anomalies.push({ id: `arithmetic:${b.id}`, record_id: b.id, ...check });
    }
  }
  for (const project of data.projects) fields(project, `project:${project.id}`, { institution: project.institution_id || project.ministry_name || project.institution_name || project.commune_name, institution_name: project.ministry_name || project.institution_name || project.commune_name, year: project.fiscal_year, nature: 'PROJECT_ALLOCATION', technical_source: 'src/data/budgetData.ts#RAW_BUDGET_PROJECTS.filter(isTangiblePhysicalProject)', source_url: project.source_url, source_label: project.source, location: project.source_page || project.page_reference, surfaces: ['accueil', 'projets', 'fiche projet', 'fiche institution / projets', 'rapports / agrégats', 'partage'], declared_verification: project.current_status });
  for (const p of data.strategic) fields(p, `strategic:${p.id}`, { institution: p.supervisingEntity, year: null, nature: 'MULTIYEAR_PROJECT_COST', technical_source: 'src/data/strategicProjectsData.ts', source_url: p.investigativeTestimony?.sourceUrl, source_label: p.fundingSource, surfaces: ['observatoire / grands projets'], declared_verification: p.status });
  const ministry = data.mmpe;
  const ministryContext = { institution: ministry.institution_id, institution_name: ministry.institution_name, year: ministry.fiscal_year, nature: 'INITIAL_BUDGET', technical_source: 'src/data/ministryBudgets/2026/mmpe.json', source_url: ministry.source_url, location: ministry.page_reference, surfaces: ['MMPE / budget / programmes et actions'], declared_verification: ministry.reconciliation_status };
  const ministryTotal = observations.find(o => o.id === `institution:${ministry.institution_id}:total_budget_fcfa`);
  if (ministryTotal?.value_fcfa === ministry.total_budget_fcfa) {
    ministryTotal.surfaces.push('MMPE / total canonique');
    ministryTotal.also_stored_at = 'src/data/ministryBudgets/2026/mmpe.json#total_budget_fcfa';
  } else fields(ministry, `mmpe:${ministry.id}`, ministryContext);
  for (const program of ministry.programs) {
    fields(program, `mmpe:${program.id}`, { ...ministryContext, source_url: program.source_url, location: program.page_reference });
    for (const action of program.actions) {
      fields(action, `mmpe:${action.id}`, { ...ministryContext, source_url: action.source_url, location: action.page_reference });
      for (const project of action.linked_projects ?? []) {
        fields(project, `mmpe:${project.id}`, { ...ministryContext, source_url: project.source_url, location: project.page_reference, nature: 'PROJECT_ALLOCATION' });
        for (const [i, line] of (project.source_lines ?? []).entries()) fields(line, `mmpe:${project.id}:source:${i}`, { ...ministryContext, source_url: project.source_url, location: line.page_reference, nature: 'PROJECT_FINANCING_LINE', exposure: 'BUNDLED_SOURCE_DETAIL' });
      }
    }
  }
  for (const [table, records] of Object.entries(remote.tables)) {
    if (table === 'local_budgets') continue;
    for (const record of records) {
      const parent = (remote.tables.administrative_accounts ?? []).find(a => a.id === record.ca_id);
      const operation = (remote.tables.ca_investment_operations ?? []).find(a => a.id === record.operation_id);
      const isCA = ['administrative_accounts', 'ca_financial_lines', 'ca_investment_operations', 'ca_procurement_matches'].includes(table);
      fields(record, `${table}:${record.id}`, { institution: record.institution_id || operation?.institution_id || parent?.institution_id || (table === 'institutions' ? record.id : null), year: record.fiscal_year || operation?.fiscal_year || parent?.fiscal_year, nature: record.measure_type || (table === 'ca_procurement_matches' ? 'CONTRACT_AWARD' : isCA ? 'CA_MIXED_FIELDS' : 'API_UNSPECIFIED'), technical_source: `supabase.${table}`, source_url: record.import_source?.url || record.source_url || parent?.source_url, location: record.source_page || record.source_reference || record.import_source?.page || record.import_source?.reference, source_label: record.source_document || record.source, declared_verification: record.verification_status || record.status || record.match_level, surfaces: [...(isCA ? ['fiche collectivité / CA', 'opérations / DGMP', 'Passport'] : []), `REST public / ${table}`] });
    }
  }
  const seenIds = new Set();
  const duplicateIds = observations.filter(o => {
    const duplicate = seenIds.has(o.id);
    seenIds.add(o.id);
    return duplicate;
  }).map(o => o.id);
  const projectRows = observations.filter(o => o.id.startsWith('project:'));
  aggregates.push({ id: 'projects:all', value_fcfa: projectRows.reduce((n, o) => n + o.value_fcfa, 0), component_ids: projectRows.map(o => o.id), formula: 'sum(dataStore.getProjects().budget_amount_fcfa)', surfaces: ['statistiques', 'projets', 'rapports'], documentary_status: 'NOT_COMPARABLE', reason: 'Source population includes different institutional scopes and project costs; not a national budget.' });
  for (const [key, select] of [['national', p => p.scope_level === 'NATIONAL'], ['local', p => p.scope_level === 'LOCAL']]) {
    const ids = new Set(data.projects.filter(select).map(p => `project:${p.id}:budget_amount_fcfa`));
    const parts = projectRows.filter(o => ids.has(o.id));
    aggregates.push({ id: `projects:${key}`, value_fcfa: parts.reduce((n, o) => n + o.value_fcfa, 0), component_ids: parts.map(o => o.id), formula: 'sum(filtered budget_amount_fcfa)', documentary_status: 'NOT_YET_CHECKED' });
  }
  for (const dimension of ['category', 'report_entity']) {
    const groups = new Map();
    for (const p of data.projects) {
      const key = dimension === 'category' ? p.category || 'Autres' : p.ministry_name || p.institution_name || p.commune_name || p.region_name || 'Collectivité';
      groups.set(key, [...(groups.get(key) ?? []), `project:${p.id}:budget_amount_fcfa`]);
    }
    for (const [key, ids] of groups) {
      const selected = new Set(ids);
      aggregates.push({ id: `projects:${dimension}:${key}`, value_fcfa: projectRows.filter(o => selected.has(o.id)).reduce((n, o) => n + o.value_fcfa, 0), component_ids: ids, formula: `sum(projects grouped by ${dimension})`, surfaces: ['graphiques accueil', 'rapport global / ventilation et huit premières entités'], documentary_status: 'NOT_YET_CHECKED' });
    }
  }
  const active = observations.filter(o => o.exposure === 'PUBLIC_CANDIDATE');
  const numeric = active.filter(o => o.value_fcfa !== null);
  const statuses = Object.fromEntries([...new Set(active.map(o => o.status))].map(status => [status, active.filter(o => o.status === status).length]));
  const verified = numeric.filter(o => o.status === 'VERIFIED_EXACT').length;
  const summary = { generated_at: new Date().toISOString(), audited_master: '707b3b688f23bd33dc0f3504e13b79c65908dd50', pr29_head: 'd479c1f9596538aac9caa82193ec766b4f4591e4', head_at_generation: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), institutions: data.institutions.length, raw_projects: data.rawProjects.length, runtime_projects: data.projects.length, observations: observations.length, public_candidates: active.length, numeric_public_candidates: numeric.length, unknown_public_candidates: active.length - numeric.length, verified_exact: verified, verification_coverage: numeric.length ? verified / numeric.length : null, statuses, duplicate_ids: duplicateIds, aggregates: aggregates.length, remote_requests: remote.requests, remote_writes: 0, limitations: ['Fresh browser profile only: user-specific localStorage overlays cannot be inventoried globally.', 'Financial candidates and source-line details are not additive; do not sum this inventory.', 'Parameterized search/filter aggregates are recorded as formulas; not every possible subset is materialized.', 'SOURCE_MISSING means no precise source in the inspected record, not proof that no official document exists.', 'Coverage counts candidate observations, not a percentage of the national budget or a guarantee of reliability.'] };
  if (writeArtifacts) {
    fs.writeFileSync(path.join(output, 'inventory.jsonl'), observations.map(o => JSON.stringify(o)).join('\n') + '\n');
    save('summary.json', summary);
    save('aggregates.json', aggregates);
    save('arithmetic-anomalies.json', anomalies);
    save('surfaces.json', surfaces());
  }
  return { observations, summary };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(output, { recursive: true });
  if (process.argv.includes('--capture')) await captureRemote();
  if (process.argv.includes('--pr29')) await reviewPr29();
  if (process.argv.includes('--pdf-dir')) await reconcilePdf(process.argv[process.argv.indexOf('--pdf-dir') + 1]);
  const { summary } = await inventory();
  console.log(JSON.stringify(summary));
}
