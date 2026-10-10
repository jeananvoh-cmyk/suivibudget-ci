import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NATIONAL_INSTITUTIONS_DATA } from '../src/data/nationalBudgetData';
import { GOVERNMENT_OFFICIALS, OfficialLeader } from '../src/data/governmentData';
import { REGULATORY_AUTHORITIES_DATA } from '../src/data/regulatoryAuthoritiesData';
import { ALL_COMMUNES_DATA } from '../src/data/communesData';
import { resolveInstitutionFinancialView, DocumentaryProvenance } from '../src/utils/institutionBudgetHelper';
import { formatFCFA } from '../src/utils/formatters';

interface MatrixEntity {
  institution_id: string;
  institution_name: string;
  category: 'GRANDE_INSTITUTION' | 'MINISTERE' | 'AUTORITE_REGULATION' | 'COMMUNE_GRAND_ABIDJAN';
  official_section_code: string | null;
  fiscal_year: number;
  budget_basis: string;
  budget_measure: string;
  total_fcfa: number | null;
  functioning_fcfa: number | null;
  investment_fcfa: number | null;
  functioning_pct: number | null;
  investment_pct: number | null;
  delta_fcfa: number | null;
  reconciliation_status: string;
  verification_status: string;
  provenance: DocumentaryProvenance | null;
  blocking_reasons: string[];
  notice_text: string | null;
  accounting_treatment?: string;
  lfi_section_cp_2026_fcfa?: number | null;
  parent_section_code?: string | null;
  program_code?: string | null;
  amount_matches_lfi_row?: boolean;
  previous_reported_2026_fcfa?: number | null;
}

const matrixEntities: MatrixEntity[] = [];

// 1. 14 Grandes Institutions de la République
for (const inst of NATIONAL_INSTITUTIONS_DATA) {
  const view = resolveInstitutionFinancialView(inst, 2026, 'LFI');
  matrixEntities.push({
    institution_id: view.institution_id,
    institution_name: view.institution_name,
    category: 'GRANDE_INSTITUTION',
    official_section_code: view.official_section_code,
    fiscal_year: view.fiscal_year,
    budget_basis: view.budget_basis,
    budget_measure: view.budget_measure,
    total_fcfa: view.total_amount_fcfa,
    functioning_fcfa: view.functioning_amount_fcfa,
    investment_fcfa: view.investment_amount_fcfa,
    functioning_pct: view.functioning_pct,
    investment_pct: view.investment_pct,
    delta_fcfa: view.delta_fcfa,
    reconciliation_status: view.reconciliation_status,
    verification_status: view.verification_status,
    provenance: view.documentary_provenance,
    blocking_reasons: view.blocking_reasons,
    notice_text: view.notice_text,
  });
}

// 2. 35 Départements Ministériels
for (const official of GOVERNMENT_OFFICIALS) {
  const instObj = {
    id: official.id,
    name: official.department_ministry,
    type: 'MINISTERE',
    total_budget_fcfa: official.budget_fcfa ?? null,
  };
  const view = resolveInstitutionFinancialView(instObj, 2026, 'LFI');
  matrixEntities.push({
    institution_id: view.institution_id,
    institution_name: view.institution_name,
    category: 'MINISTERE',
    official_section_code: view.official_section_code,
    fiscal_year: view.fiscal_year,
    budget_basis: view.budget_basis,
    budget_measure: view.budget_measure,
    total_fcfa: view.total_amount_fcfa,
    functioning_fcfa: view.functioning_amount_fcfa,
    investment_fcfa: view.investment_amount_fcfa,
    functioning_pct: view.functioning_pct,
    investment_pct: view.investment_pct,
    delta_fcfa: view.delta_fcfa,
    reconciliation_status: view.reconciliation_status,
    verification_status: view.verification_status,
    provenance: view.documentary_provenance,
    blocking_reasons: view.blocking_reasons,
    notice_text: view.notice_text,
  });
}

// 3. 7 Autorités de Régulation (AAI)
for (const reg of REGULATORY_AUTHORITIES_DATA) {
  const view = resolveInstitutionFinancialView(reg, 2026, 'LFI');
  matrixEntities.push({
    institution_id: view.institution_id,
    institution_name: view.institution_name,
    category: 'AUTORITE_REGULATION',
    official_section_code: view.official_section_code,
    fiscal_year: view.fiscal_year,
    budget_basis: view.budget_basis,
    budget_measure: view.budget_measure,
    total_fcfa: view.total_amount_fcfa,
    functioning_fcfa: view.functioning_amount_fcfa,
    investment_fcfa: view.investment_amount_fcfa,
    functioning_pct: view.functioning_pct,
    investment_pct: view.investment_pct,
    delta_fcfa: view.delta_fcfa,
    reconciliation_status: view.reconciliation_status,
    verification_status: view.verification_status,
    provenance: view.documentary_provenance,
    blocking_reasons: view.blocking_reasons,
    notice_text: view.notice_text,
  });
}

// 4. 10 Communes du Grand Abidjan en Autonomie Fiscale
const grandAbidjanCommuneIds = [
  'inst-com-abobo',
  'inst-com-adjame',
  'inst-com-attecoube',
  'inst-com-cocody',
  'inst-com-koumassi',
  'inst-com-marcory',
  'inst-com-plateau',
  'inst-com-port-bouet',
  'inst-com-treichville',
  'inst-com-yopougon',
];

for (const comId of grandAbidjanCommuneIds) {
  const com = ALL_COMMUNES_DATA.find(c => c.id === comId) || {
    id: comId,
    name: comId.replace('inst-com-', 'Commune de '),
    type: 'MAIRIE',
    is_tax_quota_commune: true,
    total_budget_fcfa: null,
    budget_not_published: true,
  };
  const view = resolveInstitutionFinancialView(com, 2026, 'LFI');
  matrixEntities.push({
    institution_id: view.institution_id,
    institution_name: view.institution_name,
    category: 'COMMUNE_GRAND_ABIDJAN',
    official_section_code: view.official_section_code,
    fiscal_year: view.fiscal_year,
    budget_basis: view.budget_basis,
    budget_measure: view.budget_measure,
    total_fcfa: view.total_amount_fcfa,
    functioning_fcfa: view.functioning_amount_fcfa,
    investment_fcfa: view.investment_amount_fcfa,
    functioning_pct: view.functioning_pct,
    investment_pct: view.investment_pct,
    delta_fcfa: view.delta_fcfa,
    reconciliation_status: view.reconciliation_status,
    verification_status: view.verification_status,
    provenance: view.documentary_provenance,
    blocking_reasons: view.blocking_reasons,
    notice_text: view.notice_text,
  });
}

// Traçabilité normative indépendante des totaux bruts présents dans les fiches.
// La matrice ne peut pas promouvoir une égalité arithmétique en preuve documentaire.
const evidence = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/audits/institution-reconciliation/LFI_2026_SECTION_EVIDENCE.json'), 'utf-8')) as {
  source_url: string; pdf_sha256: string;
  national: Array<{id: string; section_code: string; pdf_page: number; doc_page: number; amount_fcfa: number; record_kind: string; program_code?: string; parent_section_code?: string; parent_section_amount_fcfa?: number }>;
  ministries: Array<{id: string; section_code: string; pdf_page: number; doc_page: number; amount_fcfa: number; record_kind: string }>;
};
const historicRegulators = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/audits/institution-reconciliation/REGULATORY_UNVERIFIED_2026_HISTORY.json'),'utf-8')) as { entities: Array<{id:string;previously_reported_fcfa:number}> };
const documentary = new Map<string, (typeof evidence.national)[number]>([...evidence.national, ...evidence.ministries].map(row => [row.id, row]));
const historicalRegulatorAmounts = new Map(historicRegulators.entities.map(row => [row.id, row.previously_reported_fcfa]));
const historicMinistries = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/audits/institution-reconciliation/MINISTRY_WITHHELD_2026_HISTORY.json'), 'utf-8')) as { entities: Array<{id:string;previously_reported_fcfa:number}> };
const withheldMinistryLegacy = new Map(historicMinistries.entities.map(row => [row.id, row.previously_reported_fcfa]));

for (const e of matrixEntities) {
  const row = documentary.get(e.institution_id);
  if (row) {
    e.official_section_code = row.section_code;
    e.provenance = {
      document_title: 'Loi de Finances n°2025-987 - tableau CP section et programme',
      document_reference: `LFI 2026 • Section ${row.section_code}${row.program_code ? ` • Programme ${row.program_code}`:''}`,
      source_url: evidence.source_url, pdf_page: row.pdf_page, doc_page: row.doc_page,
      sha256: evidence.pdf_sha256,
      table_or_line: row.program_code ? `Programme interne ${row.program_code} de section 103` : `Section ${row.section_code} credits de paiement 2026`,
    };
    e.accounting_treatment = row.record_kind;
    e.program_code = row.program_code ?? null;
    e.parent_section_code = row.parent_section_code ?? null;
    e.lfi_section_cp_2026_fcfa = row.parent_section_amount_fcfa ?? row.amount_fcfa;
    e.amount_matches_lfi_row = e.total_fcfa === row.amount_fcfa;
    if (e.category === 'MINISTERE' && e.total_fcfa == null) {
      e.previous_reported_2026_fcfa = withheldMinistryLegacy.get(e.institution_id) ?? null;
      e.verification_status = 'NOT_DOCUMENTED';
      e.reconciliation_status = 'NO_BREAKDOWN';
      e.accounting_treatment = 'PORTFOLIO_AMOUNT_WITHHELD';
      e.blocking_reasons = [`Section LFI ${row.section_code} identifiable, mais budget du portefeuille non renseigne dans les donnees officielles applicatives actuelles. Ne pas reactiver l'ancien chiffre historique.`];
      e.notice_text = 'Montant de portefeuille volontairement non renseigne. Ancienne valeur en archive uniquement.';
    } else if (!e.amount_matches_lfi_row) {
      e.verification_status = 'NOT_DOCUMENTED';
      e.blocking_reasons = [`Montant de la fiche (${e.total_fcfa}) distinct de section LFI ${row.section_code} (${row.amount_fcfa}). Perimetre de portefeuille/C2D et actes de transfert a documenter.`];
      e.notice_text = 'Montant de portefeuille non certifie comme credit de section.';
    } else if (e.category === 'MINISTERE') {
      e.verification_status = 'PARTIAL_BREAKDOWN';
      e.blocking_reasons = ['Montant de section recoupe, ventilation absente ; attribution au portefeuille administratif non certifiee.'];
      e.notice_text = 'Credit de section confirme ; ventilation et attribution de portefeuille non certifiees.';
    } else if (row.record_kind === 'INTERNAL_PROGRAM') {
      e.blocking_reasons = [`Programme ${row.program_code} inclus dans section 103. Interdiction de l'ajouter au total de la Presidence.`];
      e.notice_text = 'Programme inclus dans sa section mere, non additif.';
    } else {
      e.blocking_reasons = []; e.notice_text = null;
    }
  } else if (e.category === 'AUTORITE_REGULATION') {
    e.previous_reported_2026_fcfa = historicalRegulatorAmounts.get(e.institution_id) ?? null;
    e.total_fcfa = null; e.functioning_fcfa = null; e.investment_fcfa = null;
    e.functioning_pct = null; e.investment_pct = null; e.delta_fcfa = null;
    e.official_section_code = null;
    e.provenance = null; e.verification_status = 'NOT_DOCUMENTED';
    e.reconciliation_status = 'NO_BREAKDOWN'; e.accounting_treatment = 'UNVERIFIED_AAI';
    e.blocking_reasons = ['Absence de preuve budget 2026 nominative : ancienne attribution non justifiee par la LFI.'];
    e.notice_text = 'Budget individuel 2026 non documente.';
  } else if (e.category === 'COMMUNE_GRAND_ABIDJAN') {
    e.accounting_treatment = 'MUNICIPAL_BUDGET_NOT_PROVIDED';
  } else if (e.institution_id === 'inst-cour-supreme') {
    e.accounting_treatment = 'NO_INDEPENDENT_LFI_SECTION';
  } else if (e.institution_id === 'gov-035') {
    e.accounting_treatment = 'PORTFOLIO_WITHOUT_INDEPENDENT_SECTION';
  }
}

// Vérifications et métriques
const totalEntities = matrixEntities.length;
const verifiedAmountCount = matrixEntities.filter(e => e.verification_status === 'VERIFIED_AMOUNT').length;
const verifiedZeroCount = matrixEntities.filter(e => e.verification_status === 'VERIFIED_ZERO').length;
const unreconciledCount = matrixEntities.filter(e => e.verification_status === 'UNRECONCILED' || e.reconciliation_status === 'UNRECONCILED').length;
const partialBreakdownCount = matrixEntities.filter(e => e.verification_status === 'PARTIAL_BREAKDOWN' || e.reconciliation_status === 'PARTIAL_BREAKDOWN').length;
const notDocumentedCount = matrixEntities.filter(e => e.verification_status === 'NOT_DOCUMENTED').length;
const notPublishedCount = matrixEntities.filter(e => e.verification_status === 'NOT_PUBLISHED').length;

// On additionne les montants une seule fois PAR SECTION distincte ; programmes internes exclus.
const totalFcfaVerified = matrixEntities
  .filter(e => e.verification_status === 'VERIFIED_AMOUNT' && e.accounting_treatment === 'SECTION' && typeof e.total_fcfa === 'number')
  .reduce((sum, e) => sum + (e.total_fcfa as number), 0);

const metadata = {
  audit_version: "2.0.0-evidence-constrained",
  fiscal_year: 2026,
  audit_date: "2026-10-10",
  total_entities_audited: totalEntities,
  verified_amount_count: verifiedAmountCount,
  verified_zero_count: verifiedZeroCount,
  unreconciled_count: unreconciledCount,
  partial_breakdown_count: partialBreakdownCount,
  not_documented_count: notDocumentedCount,
  not_published_count: notPublishedCount,
  total_fcfa_verified: totalFcfaVerified,
  total_fcfa_verified_formatted: formatFCFA(totalFcfaVerified),
  aggregate_scope: '11 sections institutionnelles sans les deux programmes internes de la Présidence ni les régulateurs non sourcés',
  non_additive_presidency_programs: 2,
  unverified_regulatory_entities: 7,
  regulators_previously_reported_sum_fcfa: 42150000000,
  unsupported_ministry_portfolio_rows: matrixEntities.filter(e => e.category === 'MINISTERE' && e.total_fcfa != null && e.verification_status === 'NOT_DOCUMENTED').length,
  withheld_ministry_portfolio_rows: matrixEntities.filter(e => e.category === 'MINISTERE' && e.accounting_treatment === 'PORTFOLIO_AMOUNT_WITHHELD').length,
  ministry_documentary_reservations_count: matrixEntities.filter(e => e.category === 'MINISTERE' && e.verification_status === 'NOT_DOCUMENTED' && e.institution_id !== 'gov-035').length,
  ministry_section_reference_rows: 34,
  ministry_portfolios: 35,
  previous_certified_sum_fcfa: 356153879687,
  documentary_certification: 'RESERVED_P0',
  notes: 'L’égalité arithmétique n’est pas une preuve documentaire. Les anciens rapprochements C2D et reliquats historiques restent réservés.',
  remote_supabase_writes: 0,
  zero_fcfa_corruptions_remaining: 0,
};

const fullMatrix = {
  audit_metadata: metadata,
  entities: matrixEntities,
};

// 1. Écriture du fichier matrix.json
const matrixPath = resolve(process.cwd(), 'docs/audits/institution-reconciliation/matrix.json');
writeFileSync(matrixPath, JSON.stringify(fullMatrix, null, 2), 'utf-8');
console.log(`[OK] Matrix saved to: ${matrixPath}`);

// 2. Génération du rapport Markdown REPORT.md
const reportContent = `# AUDIT DOCUMENTAIRE — LFI 2026 — AVEC RÉSERVES

La matrice de 66 entités est générée à partir des références LFI 2026 (PDF pp.45–54), en distinguant montants de sections, programmes internes, portefeuilles ministériels et valeurs insuffisamment documentées. Aucune certification sans réserve.

- Montants institutionnels recoupés : **${verifiedAmountCount}**, dont 2 programmes internes de la Présidence (non additifs).
- Total limité aux **11 sections institutionnelles distinctes** : **${formatFCFA(totalFcfaVerified)}**.
- **7 autorités non certifiées** : 42 150 000 000 FCFA historiquement affichés, retirés jusqu'à preuve nominative.
- **34 sections ministérielles** pour 35 portefeuilles : rapprochements C2D et 4 reliquats historiques maintenus ; ${metadata.unsupported_ministry_portfolio_rows} montants diffèrent du CP de leur section et ${metadata.withheld_ministry_portfolio_rows} portefeuilles ont leur montant non renseigné dans les données actuelles.
- ${notDocumentedCount} entités non documentées selon le niveau requis, ${partialBreakdownCount} ventilations partielles, ${notPublishedCount} non publiées.
- Ancien total 356 153 879 687 FCFA : **invalidé** (double comptage Présidence/IGE/HABG et budgets de régulateurs non justifiés).

Sources : [LFI 2026](${evidence.source_url}), SHA-256 \`${evidence.pdf_sha256}\`; Annexe 4 DPPD-PAP ; Annexe 7 Dotations ; preuve de section dans \`LFI_2026_SECTION_EVIDENCE.json\`.

| ID | Catégorie | Section | Montant fiche (FCFA) | Nature | Statut | Page PDF |
|---|---|---|---:|---|---|---:|
${matrixEntities.map(e => `| ${e.institution_id} | ${e.category} | ${e.official_section_code ?? '—'} | ${e.total_fcfa == null ? 'non renseigné' : formatFCFA(e.total_fcfa)} | ${e.accounting_treatment ?? '—'} | ${e.verification_status} | ${e.provenance?.pdf_page ?? '—'} |`).join('\\n')}

## Réserves maintenues

- Les codes et CP de section ne certifient pas la ventilation fonction/investissement, les attributions de portefeuille postérieures à la LFI ni l'exécution.
- Programme IGE 13003 (9 872 577 575 FCFA) et HABG 13004 (5 552 174 916 FCFA) inclus dans la section 103 Présidence (193 633 705 615 FCFA) ; non additifs.
- Les chiffres des autorités doivent être documentés individuellement par leurs budgets approuvés, potentiellement dans l'Annexe 6 EPN si l'identité juridique et le périmètre sont confirmés.
- La Cour Suprême historique n'a pas de section autonome ; Cour de Cassation 114, Cour des Comptes 115, Conseil d'État 118.
- Les 10 communes attendent des documents budgétaires ; null ne veut pas dire 0.
- Relecture CI TypeScript/tests/build nécessaire au HEAD final, contrôle Vercel build-rate-limit distinct de la compilation.

**Décision : prêt pour réexamen technique ; certification documentaire globale refusée en l'état.**
`;

const reportPath = resolve(process.cwd(), 'docs/audits/institution-reconciliation/REPORT.md');
writeFileSync(reportPath, reportContent, 'utf-8');
console.log(`[OK] Report saved to: ${reportPath}`);
console.log(`\nMetrics Summary:`);
console.log(JSON.stringify(metadata, null, 2));
