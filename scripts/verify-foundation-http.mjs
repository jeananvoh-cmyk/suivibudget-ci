import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const target = 'https://cdesuvcozcetdtvibgqs.supabase.co';
const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
  const position = line.indexOf('=');
  return [line.slice(0, position), line.slice(position + 1).trim().replace(/^['"]|['"]$/g, '')];
}));
if (env.VITE_SUPABASE_URL !== target) throw new Error('Unexpected Supabase project');
const key = env.VITE_SUPABASE_ANON_KEY;
const clients = {};
const results = [];
let prefix;
const emit = value => process.stdout.write(JSON.stringify(value) + '\n');
const check = (name, pass, detail = undefined) => {
  results.push({ name, pass: Boolean(pass), ...(detail ? { detail } : {}) });
  emit(results.at(-1));
};
const makeClient = token => createClient(target, key, { auth: { persistSession: false, autoRefreshToken: false }, ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}) });
const pdf = Buffer.from('%PDF-1.4\n% Temporary non-business security fixture\n%%EOF\n');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const tokens = {};

async function edge(role, name, body, method = 'POST') {
  const response = await fetch(`${target}/functions/v1/${name}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${tokens[role] || key}`, 'Content-Type': 'application/json', Origin: 'https://suivibudget.ci' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
  const content = await response.text();
  let data;
  try { data = JSON.parse(content); } catch { data = {}; }
  return { status: response.status, headers: response.headers, data };
}

async function run(input) {
  prefix = input.prefix;
  if (!/^foundation-test-[a-f0-9-]+$/.test(prefix)) throw new Error('Invalid fixture prefix');
  clients.ANON = makeClient();
  for (const fixture of input.users) {
    const client = makeClient();
    const { data, error } = await client.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
    check(`login:${fixture.role}`, !error, error?.message);
    if (error) throw new Error('Fixture login failed');
    clients[fixture.role] = client;
    tokens[fixture.role] = data.session.access_token;
  }
  const roles = Object.keys(clients);
  const admin = clients.ADMIN;
  for (const role of roles) {
    const path = `${prefix}/${role}.pdf`;
    const { error } = await clients[role].storage.from('public_documents').upload(path, pdf, { contentType: 'application/pdf', upsert: false });
    const allowed = ['ADMIN', 'DATA_MANAGER'].includes(role);
    check(`document-upload:${role}`, allowed ? !error : Boolean(error), error?.message);
    if (!error) {
      const duplicate = await clients[role].storage.from('public_documents').upload(path, pdf, { contentType: 'application/pdf', upsert: false });
      check(`duplicate-upload:${role}`, Boolean(duplicate.error));
      const overwrite = await clients[role].storage.from('public_documents').update(path, pdf, { contentType: 'application/pdf' });
      check(`overwrite:${role}`, Boolean(overwrite.error));
    }
  }
  const publishedPath = `${prefix}/ADMIN.pdf`;
  const direct = await fetch(`${target}/storage/v1/object/public/public_documents/${publishedPath}`);
  check('direct-public-document-denied', !direct.ok);
  const stagedDelete = await clients.DATA_MANAGER.storage.from('public_documents').remove([`${prefix}/DATA_MANAGER.pdf`]);
  check('delete-unreferenced-staging', !stagedDelete.error && stagedDelete.data?.length === 1);
  const docId = `${prefix}-document`;
  const insert = await admin.from('public_documents').insert({ id: docId, title: 'TEMPORARY FOUNDATION TEST', category: 'GUIDE_CITOYEN', institution_name: 'TEMPORARY TEST', file_url: '', file_name: 'test.pdf', storage_path: publishedPath, checksum_sha256: createHash('sha256').update(pdf).digest('hex'), is_official: false, status: 'TO_VERIFY', verification_status: 'TO_VERIFY' }).select().single();
  check('document-insert', !insert.error, insert.error?.message);
  if (insert.error) throw new Error('Cannot test document lifecycle');
  check('document-created-by', insert.data.created_by === input.users.find(user => user.role === 'ADMIN').id);
  const forbiddenDelete = await admin.storage.from('public_documents').remove([publishedPath]);
  check('delete-referenced-source-denied', Boolean(forbiddenDelete.error) || forbiddenDelete.data?.length === 0);
  const directPublish = await admin.from('public_documents').update({ status: 'PUBLISHED' }).eq('id', docId);
  check('direct-publish-denied', Boolean(directPublish.error));
  let signedDocument;
  for (const status of ['TO_VERIFY', 'VERIFIED', 'PUBLISHED']) {
    if (status !== 'TO_VERIFY') {
      const changed = await admin.from('public_documents').update({ status }).eq('id', docId).select().single();
      check(`document-transition:${status}`, !changed.error, changed.error?.message);
      if (status === 'PUBLISHED') check('publication-audit', Boolean(changed.data?.published_at && changed.data?.verified_at && changed.data?.verified_by));
    }
    for (const role of roles) {
      const visible = await clients[role].from('public_documents').select('id').eq('id', docId);
      check(`document-select:${status}:${role}`, !visible.error && visible.data.length === (status === 'PUBLISHED' || ['ADMIN', 'DATA_MANAGER'].includes(role) ? 1 : 0));
      const result = await edge(role, 'public-document-url', { document_id: docId });
      check(`document-edge:${status}:${role}`, result.status === (status === 'PUBLISHED' ? 200 : 404), `HTTP ${result.status}`);
      if (result.status === 200) {
        check(`document-expiry-contract:${role}`, result.data.expires_in === 300);
        signedDocument = result.data.url;
      }
    }
  }
  if (signedDocument) check('signed-document-readable', (await fetch(signedDocument)).ok);
  for (const role of roles) {
    for (const table of ['administrative_accounts', 'ca_financial_lines', 'ca_investment_operations', 'ca_procurement_matches']) {
      const response = await clients[role].from(table).select('id');
      check(`postgrest-ca:${role}:${table}`, !response.error && (['ADMIN', 'DATA_MANAGER'].includes(role) || response.data.length === 0));
    }
  }
  const imagePath = `${prefix}/citizen.png`;
  const uploaded = await clients.CITIZEN.storage.from('citizen_photos').upload(imagePath, png, { contentType: 'image/png', upsert: false });
  check('citizen-photo-upload', !uploaded.error, uploaded.error?.message);
  const anonymousUpload = await clients.ANON.storage.from('citizen_photos').upload(`${prefix}/anonymous.png`, png, { contentType: 'image/png', upsert: false });
  check('anonymous-photo-upload', !anonymousUpload.error, anonymousUpload.error?.message);
  const invalidMedia = await clients.CITIZEN.storage.from('citizen_photos').upload(`${prefix}/invalid.png`, Buffer.from('<script>test</script>'), { contentType: 'text/html', upsert: false });
  check('invalid-photo-mime-denied', Boolean(invalidMedia.error));
  const oversized = await clients.CITIZEN.storage.from('citizen_photos').upload(`${prefix}/oversized.png`, Buffer.alloc(26214401), { contentType: 'image/png', upsert: false });
  check('oversized-photo-denied', Boolean(oversized.error));
  check('direct-public-photo-denied', !(await fetch(`${target}/storage/v1/object/public/citizen_photos/${imagePath}`)).ok);
  const proofId = `${prefix}-proof`;
  const citizenId = input.users.find(user => user.role === 'CITIZEN').id;
  const proof = await clients.CITIZEN.from('citizen_proofs').insert({ id: proofId, project_id: `${prefix}-project`, image_url: imagePath, comment: 'TEMPORARY FOUNDATION TEST', verification_status: 'PENDING', citizen_user_id: citizenId, citizen_name: 'PRIVATE TEST NAME', citizen_whatsapp: 'PRIVATE TEST CONTACT' });
  check('citizen-proof-insert', !proof.error, proof.error?.message);
  for (const role of roles) {
    const privateRow = await clients[role].from('citizen_proofs').select('id,citizen_whatsapp').eq('id', proofId);
    check(`private-proof-select:${role}`, role === 'ANON' ? Boolean(privateRow.error) : !privateRow.error && privateRow.data.length === (['ADMIN', 'MODERATOR', 'CITIZEN'].includes(role) ? 1 : 0));
    if (!['ADMIN', 'MODERATOR'].includes(role)) {
      const denied = await clients[role].from('citizen_proofs').update({ verification_status: 'APPROVED' }).eq('id', proofId).select('id');
      check(`private-proof-moderation-denied:${role}`, Boolean(denied.error) || denied.data?.length === 0);
    }
    const logged = await clients[role].from('caidp_document_requests_log').insert({ id: `${prefix}-log-${role}`, action_type: 'COPIED', entity_type: 'COMMUNE', entity_name: 'TEMPORARY TEST' });
    check(`caidp-insert:${role}`, !logged.error);
    const log = await clients[role].from('caidp_document_requests_log').select('id').eq('id', `${prefix}-log-${role}`);
    check(`caidp-select:${role}`, role === 'ANON' ? Boolean(log.error) : !log.error && log.data.length === (['ADMIN', 'DATA_MANAGER'].includes(role) ? 1 : 0));
    const logUpdate = await clients[role].from('caidp_document_requests_log').update({ entity_name: 'CHANGED' }).eq('id', `${prefix}-log-${role}`);
    check(`caidp-update-denied:${role}`, Boolean(logUpdate.error));
    const logDelete = await clients[role].from('caidp_document_requests_log').delete().eq('id', `${prefix}-log-${role}`);
    check(`caidp-delete-denied:${role}`, Boolean(logDelete.error));
  }
  const spoof = await clients.CITIZEN.from('citizen_proofs').insert({ id: `${prefix}-spoof`, project_id: `${prefix}-project`, image_url: imagePath, comment: 'TEMPORARY TEST', citizen_user_id: input.users.find(user => user.role === 'OTHER_CITIZEN').id, verification_status: 'PENDING' });
  check('proof-owner-spoof-denied', Boolean(spoof.error));
  let signedProof;
  for (const status of ['PENDING', 'APPROVED', 'REJECTED']) {
    if (status !== 'PENDING') {
      const changed = await clients.MODERATOR.from('citizen_proofs').update({ verification_status: status }).eq('id', proofId).select();
      check(`proof-transition:${status}`, !changed.error && changed.data?.length === 1, changed.error?.message);
    }
    if (status === 'APPROVED') {
      const absentMedia = await edge('ANON', 'citizen-proof-media-url', { proof_id: proofId, media: 'video' });
      check('missing-proof-media', absentMedia.status === 404 && !absentMedia.data.url);
      await clients.MODERATOR.from('citizen_proofs').update({ secondary_image_url: imagePath }).eq('id', proofId);
      const secondary = await edge('ANON', 'citizen-proof-media-url', { proof_id: proofId, media: 'secondary_image' });
      check('secondary-proof-media', secondary.status === 200 && (await fetch(secondary.data.url)).ok);
    }
    for (const role of roles) {
      const result = await edge(role, 'citizen-proof-media-url', { proof_id: proofId });
      check(`proof-edge:${status}:${role}`, result.status === (status === 'APPROVED' ? 200 : 404), `HTTP ${result.status}`);
      if (result.status === 200) {
        signedProof = result.data.url;
        check(`proof-expiry-contract:${role}`, result.data.expires_in === 300);
      }
      const view = await clients[role].from('public_citizen_proofs').select('*').eq('id', proofId);
      check(`proof-projection:${status}:${role}`, !view.error && view.data.length === (status === 'APPROVED' ? 1 : 0));
      if (view.data?.[0]) check(`proof-privacy:${role}`, !('citizen_whatsapp' in view.data[0]) && !('citizen_user_id' in view.data[0]) && view.data[0].citizen_name !== 'PRIVATE TEST NAME');
    }
  }
  if (signedProof) check('signed-proof-readable-within-ttl', (await fetch(signedProof)).ok);
  for (const name of ['public-document-url', 'citizen-proof-media-url']) {
    const options = await edge('ANON', name, {}, 'OPTIONS');
    check(`cors:${name}`, options.status === 200 && Boolean(options.headers.get('access-control-allow-origin')));
    const invalid = await edge('ANON', name, {});
    check(`invalid-input:${name}`, invalid.status === 400);
    const invalidId = await edge('ANON', name, { document_id: 123, proof_id: 123 });
    check(`invalid-id-type:${name}`, invalidId.status === 400 && !invalidId.data.url);
    check(`method:${name}`, (await edge('ANON', name, {}, 'GET')).status === 405);
    const missing = await edge('ANON', name, { document_id: `${prefix}-absent`, proof_id: `${prefix}-absent` });
    check(`absent:${name}`, missing.status === 404);
  }
  emit({ event: 'expiry_pending', waitSeconds: 310, failures: results.filter(result => !result.pass), prefix });
  await new Promise(resolve => setTimeout(resolve, 310000));
  if (signedDocument) check('document-url-expired', !(await fetch(signedDocument)).ok);
  if (signedProof) check('proof-url-expired', !(await fetch(signedProof)).ok);
  emit({ event: 'run_complete', total: results.length, failures: results.filter(result => !result.pass), prefix });
}

async function cleanup() {
  for (const bucket of ['public_documents', 'citizen_photos']) {
    const listed = await clients.ADMIN.storage.from(bucket).list(prefix);
    const names = listed.data?.map(item => `${prefix}/${item.name}`) || [];
    if (names.length) {
      const removed = await clients.ADMIN.storage.from(bucket).remove(names);
      check(`cleanup:${bucket}`, !removed.error && removed.data?.length === names.length, removed.error?.message);
    }
    const remaining = await clients.ADMIN.storage.from(bucket).list(prefix);
    check(`cleanup-empty:${bucket}`, !remaining.error && remaining.data?.length === 0);
  }
  for (const client of Object.values(clients)) await client.auth.signOut();
  emit({ event: 'cleanup_complete' });
  process.exit(0);
}

if (process.argv[2] === 'apec-public') {
  const client = makeClient();
  const rows = await client.from('apec_public_needs').select('*').limit(10);
  check('apec-public-projection-readable', !rows.error && rows.data.every(row => row.status === 'PUBLISHED' && !('user_id' in row) && !('actor_id' in row)));
  const deletion = await client.from('apec_public_needs').delete().eq('need_id','00000000-0000-0000-0000-000000000000');
  check('apec-public-anon-delete-denied', deletion.error?.code === '42501');
  const publication = await client.rpc('publish_apec_need',{p_need_id:'00000000-0000-0000-0000-000000000000',p_title:'Non-writing probe',p_summary:'Non-writing probe',p_source_reference:'Probe',p_source_date:'2026-10-01',p_privacy_reviewed:true});
  check('apec-public-anon-publish-denied', publication.error?.code === '42501');
  const withdrawal = await client.rpc('withdraw_apec_need',{p_need_id:'00000000-0000-0000-0000-000000000000',p_reason:'Non-writing probe'});
  check('apec-public-anon-withdraw-denied', withdrawal.error?.code === '42501');
  process.exit(results.some(result => !result.pass) ? 1 : 0);
}
if (process.argv[2] === 'apec') {
  const client = makeClient();
  const cycles = await client.from('apec_cycles').select('id').limit(1);
  check('apec-public-cycles-readable', !cycles.error);
  for (const table of ['apec_needs','apec_contributions','apec_events']) {
    const response = await client.from(table).select('id').limit(1);
    check(`apec-private-read-denied:${table}`, response.error?.code === '42501');
  }
  for (const table of ['apec_cycles','apec_needs','apec_contributions','apec_events']) {
    const response = await client.from(table).delete().eq('id','00000000-0000-0000-0000-000000000000');
    check(`apec-anon-delete-denied:${table}`, response.error?.code === '42501');
  }
  const targets = await client.rpc('apec_link_targets', { p_institution_id:'absent-probe',p_fiscal_year:2026 });
  check('apec-targets-anon-denied', targets.error?.code === '42501');
  const decision = await client.rpc('record_apec_decision', { p_need_id:'00000000-0000-0000-0000-000000000000',p_action:'VERIFY',p_body:'Non-writing probe',p_source_reference:'Probe',p_source_date:'2026-09-30' });
  check('apec-decision-anon-denied', decision.error?.code === '42501');
  process.exit(results.some(result => !result.pass) ? 1 : 0);
}
if (process.argv[2] === 'public') {
  const client = makeClient();
  for (const table of ['public_documents','citizen_proofs','administrative_accounts','ca_investment_operations','ca_procurement_matches','ca_financial_lines','profiles','local_budgets','institutions','public_citizen_proofs']) {
    const response = await client.from(table).select('id').limit(1);
    const privateTable = ['citizen_proofs','profiles','local_budgets'].includes(table);
    check(`anon-read:${table}`, privateTable ? Boolean(response.error) : !response.error && (table === 'institutions' || response.data.length === 0));
    const mutation = await client.from(table).delete().eq('id', 'absent-privilege-probe');
    check(`anon-delete-denied:${table}`, Boolean(mutation.error));
  }
  const rpc = await client.schema('private').rpc('published_citizen_proofs');
  check('private-rpc-not-exposed', Boolean(rpc.error));
  for (const name of ['public-document-url','citizen-proof-media-url']) {
    const response = await edge('ANON', name, { document_id: 'absent-privilege-probe', proof_id: 'absent-privilege-probe' });
    check(`edge-private-not-found:${name}`, response.status === 404 && !response.data.url);
  }
  process.exit(results.some(result => !result.pass) ? 1 : 0);
}
if (process.argv[2]) {
  const command = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (!/^foundation-test-[a-f0-9-]+$/.test(command.prefix)) throw new Error('Invalid fixture prefix');
  if (process.argv[3] === 'ca') {
    const client = makeClient();
    const selection = '*, operations:ca_investment_operations(*, matches:ca_procurement_matches(*))';
    const published = await client.from('administrative_accounts').select(selection).eq('status', 'PUBLISHED');
    check('public-ca-nested-query', !published.error && published.data?.length === 0, published.error?.message);
    const admin = command.users.find(user => user.role === 'ADMIN');
    const login = await client.auth.signInWithPassword({ email: admin.email, password: admin.password });
    if (login.error) throw login.error;
    const pilots = await client.from('administrative_accounts').select(selection);
    check('staff-ca-nested-query', !pilots.error && pilots.data?.length === 3 && pilots.data.flatMap(row => row.operations).length === 3 && pilots.data.flatMap(row => row.operations.flatMap(operation => operation.matches)).length === 3, pilots.error?.message);
    await client.auth.signOut();
    process.exit(results.some(result => !result.pass) ? 1 : 0);
  } else if (process.argv[3] === 'cleanup') {
    prefix = command.prefix;
    clients.ADMIN = makeClient();
    const admin = command.users.find(user => user.role === 'ADMIN');
    const { error } = await clients.ADMIN.auth.signInWithPassword({ email: admin.email, password: admin.password });
    if (error) throw error;
    await cleanup();
  } else {
    await run(command);
    process.exit(results.some(result => !result.pass) ? 1 : 0);
  }
}

const lines = createInterface({ input: process.stdin });
for await (const line of lines) {
  try {
    const command = JSON.parse(line);
    if (command.action === 'run') await run(command);
    else if (command.action === 'cleanup') await cleanup();
  } catch (error) {
    emit({ event: 'error', message: error.message, prefix });
  }
}
