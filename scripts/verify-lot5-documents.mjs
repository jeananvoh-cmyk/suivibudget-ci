import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const documentDirectory = process.env.LOT5_DOCUMENT_DIR || '/tmp/suivibudget-lot5-documents';
const lfiPath = path.join(documentDirectory, 'Loi-de-Finances-2026.pdf');
const dppdPath = path.join(documentDirectory, 'Annexe-4-DPPD-PAP-2026-2028.pdf');
const extractedPages = new Map([
  [lfiPath, readFileSync(path.join(documentDirectory, 'lfi-layout.txt'), 'utf8').split('\f')],
  [dppdPath, readFileSync(path.join(documentDirectory, 'dppd-layout.txt'), 'utf8').split('\f')],
]);

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function pageText(filePath, page) {
  const text = extractedPages.get(filePath)?.[page - 1];
  assert.ok(text, `Page PDF ${page} absente de l'extraction ${filePath}`);
  return text;
}

function groupedAmount(amount, separator) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function assertOfficialLine(text, code, label, amount) {
  const line = text.split(/\r?\n/).find(candidate => candidate.includes(code) && candidate.includes(label));
  assert.ok(line, `Ligne officielle absente : ${code} ${label}`);
  assert.ok(line.includes(groupedAmount(amount, ' ')) || line.includes(groupedAmount(amount, '.')),
    `Montant officiel absent sur la ligne ${code}`);
}

assert.equal(sha256(lfiPath), 'f06035b6af6f15f1777b3e843198df2763f72fe9b15a04de1a16c4553a507d76');
assert.equal(sha256(dppdPath), '0f8c7a91b577129ff71677793ed7d6580ab3affb65e7fa3ba112c0ffed0ffe10');

const sections = [
  {
    section: '334', institutionId: 'gov-034', total: 182301855312, lfiPages: [49],
    canonical: 'docs/references/2026/ministry-technical-vocational-education/METFPA_CANONICAL_BUDGET_2026.json',
    programs: [
      { code: '23220', label: 'Fonds de Développement de la Formation Professionnelle', amount: 46000000000, lfiPage: 49, dppdPage: 563,
        actions: [
          { code: '2322001', label: 'Gestion des ressources humaines, financières et matérielles', amount: 17178600000, page: 563 },
          { code: '2322002', label: "Accompagnement des entreprises dans l'élaboration et le financement des projets et des plans de formation de leurs travailleurs", amount: 28821400000, page: 563 },
        ] },
    ],
  },
  {
    section: '336', institutionId: 'gov-017', total: 39806735298, lfiPages: [49, 50],
    canonical: 'docs/references/2026/ministry-communication/MICOM_CANONICAL_BUDGET_2026.json',
    programs: [
      { code: '23223', label: 'Appui au financement de la Radiodiffusion Télévision Ivoirienne (RTI)', amount: 16465000001, lfiPage: 50, dppdPage: 651,
        actions: [{ code: '2322301', label: 'Gestion de la Redevance RTI', amount: 16465000001, page: 651 }] },
      { code: '23224', label: 'Appui au financement de la Société Ivoirienne de Télédiffusion (IDT)', amount: 2035000000, lfiPage: 50, dppdPage: 653,
        actions: [{ code: '2322401', label: 'Gestion des Centres de diffusion des programmes Télés et Radios nationales (Chaines TNT et Radios publiques)', amount: 2035000000, page: 653 }] },
      { code: '23225', label: 'Appui au financement du secteur des médias', amount: 1700000000, lfiPage: 50, dppdPage: 654,
        actions: [{ code: '2322501', label: 'Gestion de la taxe sur la publicité', amount: 1700000000, page: 654 }] },
    ],
  },
  {
    section: '444', institutionId: 'gov-030', total: 70427777385, lfiPages: [54],
    canonical: 'docs/references/2026/ministry-sports/MSCV_CANONICAL_BUDGET_2026.json',
    programs: [
      { code: '23241', label: 'Appui au développement durable du sport', amount: 10900000000, lfiPage: 54, dppdPage: 1134,
        actions: [
          { code: '2324101', label: 'Développement des activités fédérales', amount: 7430000000, page: 1134 },
          { code: '2324102', label: 'Promotion sociale et sanitaire du secteur sport', amount: 200000000, page: 1134 },
          { code: '2324103', label: "Construction, réhabilitation et équipement d'infrastructure socio-sportive", amount: 3270000000, page: 1134 },
        ] },
      { code: '23249', label: "Appui à l'entretien et à la sécurisation des infrastructures", amount: 1720000000, lfiPage: 54, dppdPage: 1135,
        actions: [{ code: '2324901', label: 'Entretien, maintenance et sécurisation des infrastructures', amount: 1720000000, page: 1135 }] },
    ],
  },
];

for (const section of sections) {
  const lfiText = section.lfiPages.map(page => pageText(lfiPath, page)).join('\n');
  assert.ok(lfiText.includes(groupedAmount(section.total, '.')), `Total LFI absent pour la section ${section.section}`);
  const canonical = JSON.parse(readFileSync(section.canonical, 'utf8'));
  assert.equal(canonical.institution_code, section.section);
  assert.equal(canonical.totals.total_ministry_2026_fcfa, section.total);
  const programCodes = canonical.programs.map(program => program.program_code);
  const actionCodes = canonical.programs.flatMap(program => program.actions.map(action => action.action_code));
  assert.equal(new Set(programCodes).size, programCodes.length, `Programme dupliqué en section ${section.section}`);
  assert.equal(new Set(actionCodes).size, actionCodes.length, `Action dupliquée en section ${section.section}`);
  assert.equal(canonical.programs.reduce((sum, program) => sum + program.program_amount_2026_fcfa, 0), section.total);
  assert.equal(canonical.programs.reduce((sum, program) => sum
    + program.actions.reduce((actionSum, action) => actionSum + action.amount_2026_fcfa, 0), 0), section.total);

  for (const program of section.programs) {
    assertOfficialLine(pageText(lfiPath, program.lfiPage), program.code, program.label, program.amount);
    assertOfficialLine(pageText(dppdPath, program.dppdPage), program.code, program.label, program.amount);
    for (const action of program.actions) {
      assertOfficialLine(pageText(dppdPath, action.page), action.code, action.label, action.amount);
    }
  }
}

console.log(JSON.stringify({
  status: 'PASS',
  sources: 2,
  sections: sections.length,
  programs: sections.reduce((sum, section) => sum + section.programs.length, 0),
  actions: sections.reduce((sum, section) => sum + section.programs.reduce((actionSum, program) => actionSum + program.actions.length, 0), 0),
  duplicateProgramCodes: 0,
  duplicateActionCodes: 0,
  sectionTotalsMatched: sections.length,
}));
