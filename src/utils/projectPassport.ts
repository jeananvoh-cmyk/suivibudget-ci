// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — PROJECT ACCOUNTABILITY PASSPORT
// Traçabilité intégrale : BESOIN → BUDGET → MARCHÉ → CA → PREUVE → REDDITION
// Principes non-négociables :
// - P1: Compréhension citoyenne
// - P2: Provenance explicite par défaut
// - P7: Financier != Physique (une dépense ne prouve pas une réalisation)
// - P9: Absence de donnée != donnée d'absence (NOT_FOUND_PUBLICLY)
// - P11: Neutralité politique absolue (pas de classement ni de note de gouvernance)
// =========================================================================

import { BudgetProject, CitizenProof } from '../types';
import { AdministrativeAccount, CAInvestmentOperation, ProcurementMatch } from '../types/administrativeAccount';
import { ADMINISTRATIVE_ACCOUNTS_DATA } from '../data/administrativeAccountsData';
import { matchesSmartSearch, normalizeSearchText, extractWords } from './searchHelpers';
import type { AmountPrecision } from '../types/localBudget';
import { formatFCFA, formatRecordAmount, amountPrecision, isExactAmount } from './formatters';

export type PassportStageStatus =
  | 'VERIFIED_OFFICIAL'     // Documenté avec source officielle vérifiable
  | 'PROBABLE_MATCH'        // Rapprochement probable en attente de visa formel
  | 'CITIZEN_DOCUMENTED'    // Documenté par observations citoyennes validées
  | 'PENDING_DOCUMENTATION' // En attente de document ou constat
  | 'ANOMALY_DETECTED'      // Écart factuel identifié nécessitant explication
  | 'NOT_FOUND_PUBLICLY'    // Non retrouvé dans les sources publiques actuelles
  | 'SOURCE_CONFLICT';      // Divergence identifiée entre sources documentaires

export type PassportProvenanceClass =
  | 'OFFICIAL_PRIMARY_SOURCE'
  | 'OFFICIAL_SECONDARY_SOURCE'
  | 'AUTOMATED_EXTRACTION'
  | 'DECLARED_ADMIN'
  | 'CITIZEN_OBSERVATION'
  | 'SUIVIBUDGET_CALCULATION'
  | 'INSTITUTION_RESPONSE'
  | 'UNKNOWN';

export type DataProvenance =
  | 'OFFICIAL_SOURCE'            // Source primaire officielle vérifiée (alias rétrocompatible de OFFICIAL_PRIMARY_SOURCE)
  | 'OFFICIAL_PRIMARY_SOURCE'    // Pièce budgétaire ou administrative primaire vérifiée (Loi de Finances, CA, DGMP)
  | 'OFFICIAL_SECONDARY_SOURCE'  // Source secondaire (dépêche AIP, portail municipal déclaratif, presse)
  | 'AUTOMATED_EXTRACTION'       // Extraction automatisée d'un catalogue sans certification individuelle de la pièce
  | 'DECLARED_ADMIN'             // Déclaration ou saisie administrative non certifiée
  | 'SUIVIBUDGET_CALCULATION'    // Rapprochement ou calcul algorithmique SuiviBudget
  | 'CITIZEN_OBSERVATION'        // Constat de terrain ou preuve citoyenne
  | 'INSTITUTION_RESPONSE'       // Réponse institutionnelle ou droit de réponse
  | 'UNVERIFIED_INPUT'           // Donnée déclarative ou non corroborée
  | 'UNKNOWN';                   // Provenance documentaire absente ou non qualifiée

const SECONDARY_SOURCE_PATTERNS = [
  /\baip\b/i,
  /aip\.ci/i,
  /agence ivoirienne de presse/i,
  /mairiedebouake\.ci/i,
  /portail municipal/i,
  /site web municipal/i,
  /local_portal/i,
  /abidjan\.net/i,
  /koaci/i,
  /fratmat/i,
  /linfodrome/i,
  /\bpresse\b/i,
  /\bmédia\b/i,
  /\bmedia\b/i,
  /communiqué de presse/i,
  /communique de presse/i,
  /compte[- ]rendu de session/i,
  /source secondaire/i,
  /secondary/i,
];

const GENERIC_PLACEHOLDER_SOURCES = new Set([
  'source',
  'source officielle',
  'document officiel',
  'document',
  'officiel',
  'inconnu',
  'non renseigné',
  'non renseigne',
  'non relié',
  'non relie',
  'n/a',
  'na',
  'aucune',
  'à vérifier',
  'a verifier',
]);

export function isSecondarySourceReference(source?: string | null, sourceUrl?: string | null): boolean {
  const combined = `${source || ''} ${sourceUrl || ''}`.trim();
  if (!combined) return false;
  return SECONDARY_SOURCE_PATTERNS.some(pattern => pattern.test(combined));
}

/**
 * Allowlist fermée des domaines institutionnels primaires ivoiriens utilisés
 * par les parcours financiers. Un simple HTTPS ou un libellé "officiel" ne
 * transforme pas un domaine tiers en source primaire.
 */
export function isOfficialPrimarySourceUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return host === 'dgbf.ci'
      || host.endsWith('.dgbf.ci')
      || host === 'marchespublics.ci'
      || host.endsWith('.marchespublics.ci')
      || host === 'courdescomptes.ci'
      || host.endsWith('.courdescomptes.ci')
      || host.endsWith('.gouv.ci');
  } catch {
    return false;
  }
}

export function isGenericSourcePlaceholder(source?: string | null): boolean {
  if (!source || !source.trim()) return true;
  const normalized = source.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length < 5 || GENERIC_PLACEHOLDER_SOURCES.has(normalized)) return true;
  // Règle 8 : Une référence réduite à un numéro de page ou à la mention générique d'un fichier PDF ne constitue pas un document source identifiable
  if (/^(document|fichier|scan|extrait|pièce|piece)?\s*(officiel|pdf)?\s*(p\.?|page|pages|pp\.?|feuillet)?\s*\d*(\s*[-/]\s*\d+)?$/i.test(normalized)) {
    return true;
  }
  return false;
}

export interface StageCertificationSpecification {
  stageId: PassportStage['id'];
  stageLabel: string;
  requiredEvidence: string[];
  admissibleSources: string[];
  authenticityCriteria: string[];
  projectMatchCriteria: string[];
  certificationCondition: string;
  insufficientEvidenceStatus: PassportStageStatus;
  unavailableInfoStatus: PassportStageStatus;
}

/**
 * Spécification indépendante des critères de certification des 6 étapes du Passeport de Redevabilité.
 * Règle cardinale : Aucune étape n'hérite du statut officiel (VERIFIED_OFFICIAL) d'une autre étape.
 */
export const STAGE_CERTIFICATION_SPECIFICATIONS: Record<PassportStage['id'], StageCertificationSpecification> = {
  NEED_PROGRAMMING: {
    stageId: 'NEED_PROGRAMMING',
    stageLabel: 'Besoin & Programmation',
    requiredEvidence: [
      'Expression documentée du besoin citoyen ou territorial initial (citizen_need_origin / initiative_source)',
      'Inscription explicite au programme d’investissement (program_name / details)',
      'Pièce primaire de consultation citoyenne ou délibération de programmation triennale avec page précise (> 0)',
    ],
    admissibleSources: [
      'Procès-verbal officiel de consultation citoyenne / APEC signé',
      'Délibération municipale ou régionale du Programme Triennal documentant l’origine citoyenne du besoin',
    ],
    authenticityCriteria: [
      'Document primaire identifiable (citizen_need_source_document_id ou citizen_need_source_url HTTPS)',
      'Absence de source secondaire de presse ou de saisie déclarative administrateur (DECLARED_ADMIN)',
      'Statut de vérification humaine du besoin : citizen_need_verification_status === "VERIFIED"',
    ],
    projectMatchCriteria: [
      'Même collectivité ou institution responsable',
      'Même exercice fiscal et même objet d’investissement',
    ],
    certificationCondition: 'checkVerifiedNeedEvidence(project) === true (n’hérite jamais de BUDGET_VOTED)',
    insufficientEvidenceStatus: 'PENDING_DOCUMENTATION',
    unavailableInfoStatus: 'NOT_FOUND_PUBLICLY',
  },
  BUDGET_VOTED: {
    stageId: 'BUDGET_VOTED',
    stageLabel: 'Budget Voté (BP)',
    requiredEvidence: [
      'Montant budgétaire fini (>= 0 FCFA) avec précision exacte (EXACT)',
      'Document budgétaire primaire identifiable (Loi de Finances / Annexe officielle ou Budget Primitif délibéré)',
      'Numéro de page précis (> 0) et correspondance pièce ↔ montant vérifiée humainement',
    ],
    admissibleSources: [
      'Loi de Finances (DGBF / Journal Officiel) et ses annexes officielles',
      'Délibération officielle du Budget Primitif ou Modificatif de la collectivité',
    ],
    authenticityCriteria: [
      'hasIdentifiableOfficialDocument(project) === true',
      'classifyProjectProvenance(project) === "OFFICIAL_PRIMARY_SOURCE"',
      'financial_verification_status === "VERIFIED" et source_page > 0',
    ],
    projectMatchCriteria: [
      'Correspondance vérifiée entre l’intitulé, l’institution, l’exercice et le montant inscrit à la page citée',
      'Absence de conflit de montant prévu avec le Compte Administratif',
    ],
    certificationCondition: 'checkVerifiedBudgetEvidence(project) === true (n’hérite jamais du CA ni de la DGMP)',
    insufficientEvidenceStatus: 'PENDING_DOCUMENTATION',
    unavailableInfoStatus: 'NOT_FOUND_PUBLICLY',
  },
  PROCUREMENT_DGMP: {
    stageId: 'PROCUREMENT_DGMP',
    stageLabel: 'Commande Publique & Attribution (DGMP)',
    requiredEvidence: [
      'Numéro d’appel d’offres ou de contrat DGMP explicite',
      'Identité de l’entreprise attributaire et montant exact adjugé',
      'Référence et URL HTTPS du Bulletin Officiel des Marchés Publics (BOMP / DGMP)',
    ],
    admissibleSources: [
      'Bulletin Officiel des Marchés Publics (BOMP) / Répertoire des avis d’attribution DGMP',
    ],
    authenticityCriteria: [
      'Source primaire DGMP non générique et non secondaire avec URL HTTPS vérifiable',
      'verification_status dans ["Vérifié DGMP", "VERIFIED", "OFFICIAL_DOCUMENT"]',
    ],
    projectMatchCriteria: [
      'Liaison explicite par identifiant ou concordance exacte d’intitulé, d’institution et d’exercice sans conflit (jamais par simple similarité algorithmique de mots-clés)',
    ],
    certificationCondition: 'checkVerifiedProcurementEvidence(matchedProc, matchResult, project) === true',
    insufficientEvidenceStatus: 'PROBABLE_MATCH',
    unavailableInfoStatus: 'NOT_FOUND_PUBLICLY',
  },
  BUDGET_EXECUTION_CA: {
    stageId: 'BUDGET_EXECUTION_CA',
    stageLabel: 'Exécution Budgétaire (Compte Administratif)',
    requiredEvidence: [
      'Compte Administratif officiel voté/publié (OFFICIAL_DOCUMENT ou OFFICIAL_INSTITUTION)',
      'Ligne d’opération d’investissement avec numéro de page précis (> 0) et montant ordonnancé exact (> 0 FCFA)',
    ],
    admissibleSources: [
      'Compte Administratif officiel délibéré et visé de la collectivité territoriale',
      'Loi de Règlement ou rapport officiel primaire d’exécution budgétaire',
    ],
    authenticityCriteria: [
      'account.status dans ["VERIFIED", "PUBLISHED"] et account.verification_status dans ["OFFICIAL_DOCUMENT", "OFFICIAL_INSTITUTION"]',
      'Document source primaire identifiable (non secondaire, non générique) et source_page > 0',
    ],
    projectMatchCriteria: [
      'Liaison explicite par identifiant ou concordance exacte d’intitulé, d’institution, d’exercice et de montant prévu sans conflit',
    ],
    certificationCondition: 'checkVerifiedExecutionEvidence(matchedOp, account, matchResult, project) === true',
    insufficientEvidenceStatus: 'PROBABLE_MATCH',
    unavailableInfoStatus: 'NOT_FOUND_PUBLICLY',
  },
  PHYSICAL_REALIZATION: {
    stageId: 'PHYSICAL_REALIZATION',
    stageLabel: 'Réalisation Physique & Terrain',
    requiredEvidence: [
      'Procès-verbal officiel contradictoire de réception technique sur site (distinct d’un taux déclaratif, d’une dépense financière, d’une réponse institutionnelle ou d’une observation citoyenne)',
    ],
    admissibleSources: [
      'Observations citoyennes approuvées en modération -> statut CITIZEN_DOCUMENTED uniquement (jamais VERIFIED_OFFICIAL)',
      'Déclaration administrative d’avancement -> statut PENDING_DOCUMENTATION uniquement (jamais VERIFIED_OFFICIAL)',
    ],
    authenticityCriteria: [
      'Principe 7 : Une dépense financière, une déclaration administrative ou une réponse institutionnelle ne certifie jamais la réalisation physique',
      'Règle 6 : Une observation citoyenne documente le terrain (CITIZEN_DOCUMENTED) sans valoir certification administrative officielle',
    ],
    projectMatchCriteria: [
      'Rattachement direct au projet et à sa localisation physique',
    ],
    certificationCondition: 'checkVerifiedPhysicalEvidence(project, approvedProofs) === true (toujours false sans PV d’ingénierie indépendant)',
    insufficientEvidenceStatus: 'PENDING_DOCUMENTATION',
    unavailableInfoStatus: 'NOT_FOUND_PUBLICLY',
  },
  AUDIT_ACCOUNTABILITY: {
    stageId: 'AUDIT_ACCOUNTABILITY',
    stageLabel: 'Reddition de Comptes & Droit de Réponse',
    requiredEvidence: [
      'Rapport d’audit officiel externe et indépendant (Cour des Comptes, Inspection Générale d’État, ASACI) couvrant l’opération avec référence, URL/ID et page précise (> 0)',
    ],
    admissibleSources: [
      'Arrêt ou rapport public de la Cour des Comptes de Côte d’Ivoire',
      'Rapport d’audit officiel publié par l’Inspection Générale d’État (IGE) ou corps de contrôle habilité',
    ],
    authenticityCriteria: [
      'audit_verification_status === "VERIFIED", audit_report_reference non générique, URL ou document ID primaire et audit_source_page > 0',
      'Une réponse institutionnelle (INSTITUTION_RESPONSE) ou l’exécution au CA (Étape 4) ne certifie jamais l’audit (Étape 6)',
    ],
    projectMatchCriteria: [
      'Référence directe à l’opération, à l’institution et à l’exercice contrôlé',
    ],
    certificationCondition: 'checkVerifiedAuditEvidence(project) === true (n’hérite jamais de BUDGET_EXECUTION_CA ni de PROCUREMENT_DGMP)',
    insufficientEvidenceStatus: 'PENDING_DOCUMENTATION',
    unavailableInfoStatus: 'NOT_FOUND_PUBLICLY',
  },
};

/**
 * Règle F : Un document officiel doit être identifiable et vérifiable :
 * - organisme émetteur identifiable ;
 * - document source nommé et non générique ;
 * - URL ou référence documentaire vérifiable ;
 * - exercice budgétaire valide ;
 * - absence de qualification secondaire, déclarative ou d'extraction brute non certifiée.
 */
export function hasIdentifiableOfficialDocument(project: BudgetProject): boolean {
  if (!project) return false;
  if (
    project.data_provenance === 'DECLARED_ADMIN' ||
    project.data_provenance === 'OFFICIAL_SECONDARY_SOURCE' ||
    project.data_provenance === 'AUTOMATED_EXTRACTION' ||
    project.data_provenance === 'CITIZEN_OBSERVATION' ||
    project.data_provenance === 'SUIVIBUDGET_CALCULATION' ||
    project.data_provenance === 'INSTITUTION_RESPONSE' ||
    project.data_provenance === 'UNKNOWN'
  ) {
    return false;
  }
  if (isSecondarySourceReference(project.source, project.source_url)) {
    return false;
  }
  const hasIssuingBody = Boolean(
    project.institution_id?.trim() ||
    project.commune_name?.trim() ||
    project.ministry_name?.trim() ||
    project.master_builder?.trim()
  );
  const hasValidFiscalYear =
    typeof project.fiscal_year === 'number' &&
    Number.isFinite(project.fiscal_year) &&
    project.fiscal_year >= 2000;
  const hasNamedSourceDocument =
    !isGenericSourcePlaceholder(project.source) &&
    Boolean(project.source_document_id?.trim());
  const hasVerifiableReferenceOrUrl = isOfficialPrimarySourceUrl(project.source_url);

  return hasIssuingBody && hasValidFiscalYear && hasNamedSourceDocument && hasVerifiableReferenceOrUrl;
}

/**
 * Classification explicite de la provenance d'un projet selon les 7 catégories réglementaires :
 * - OFFICIAL_PRIMARY_SOURCE
 * - OFFICIAL_SECONDARY_SOURCE
 * - AUTOMATED_EXTRACTION
 * - DECLARED_ADMIN
 * - CITIZEN_OBSERVATION
 * - SUIVIBUDGET_CALCULATION
 * - UNKNOWN (+ INSTITUTION_RESPONSE le cas échéant)
 */
export function classifyProjectProvenance(project: BudgetProject): PassportProvenanceClass {
  if (!project) return 'UNKNOWN';
  if (project.data_provenance === 'CITIZEN_OBSERVATION') return 'CITIZEN_OBSERVATION';
  if (project.data_provenance === 'SUIVIBUDGET_CALCULATION') return 'SUIVIBUDGET_CALCULATION';
  if (project.data_provenance === 'INSTITUTION_RESPONSE') return 'INSTITUTION_RESPONSE';
  if (project.data_provenance === 'DECLARED_ADMIN') return 'DECLARED_ADMIN';
  if (
    project.data_provenance === 'OFFICIAL_SECONDARY_SOURCE' ||
    isSecondarySourceReference(project.source, project.source_url)
  ) {
    return 'OFFICIAL_SECONDARY_SOURCE';
  }
  if (project.data_provenance === 'AUTOMATED_EXTRACTION') {
    return 'AUTOMATED_EXTRACTION';
  }
  if (project.data_provenance === 'UNKNOWN') {
    return 'UNKNOWN';
  }

  const hasAnySourceTrace = Boolean(
    project.source?.trim() ||
    project.source_document_id?.trim() ||
    project.source_url?.trim() ||
    (typeof project.source_page === 'number' && project.source_page > 0)
  );
  if (!hasAnySourceTrace) {
    return 'UNKNOWN';
  }

  // Règles B, D, F : Une ligne disposant d'une trace documentaire ou d'une page mais dont la correspondance
  // avec le montant n'a pas été vérifiée humainement (financial_verification_status !== 'VERIFIED')
  // ou dont le document n'est pas intégralement identifiable reste une AUTOMATED_EXTRACTION ou UNKNOWN.
  if (!hasIdentifiableOfficialDocument(project)) {
    return isGenericSourcePlaceholder(project.source) && !project.source_document_id?.trim()
      ? 'UNKNOWN'
      : 'AUTOMATED_EXTRACTION';
  }

  if (project.financial_verification_status !== 'VERIFIED') {
    return 'AUTOMATED_EXTRACTION';
  }

  return 'OFFICIAL_PRIMARY_SOURCE';
}

export function resolveProjectDataProvenance(project: BudgetProject): DataProvenance {
  const provenanceClass = classifyProjectProvenance(project);
  switch (provenanceClass) {
    case 'OFFICIAL_PRIMARY_SOURCE':
      return 'OFFICIAL_SOURCE';
    case 'OFFICIAL_SECONDARY_SOURCE':
      return 'OFFICIAL_SECONDARY_SOURCE';
    case 'AUTOMATED_EXTRACTION':
      return 'AUTOMATED_EXTRACTION';
    case 'DECLARED_ADMIN':
      return 'UNVERIFIED_INPUT';
    case 'CITIZEN_OBSERVATION':
      return 'CITIZEN_OBSERVATION';
    case 'SUIVIBUDGET_CALCULATION':
      return 'SUIVIBUDGET_CALCULATION';
    case 'INSTITUTION_RESPONSE':
      return 'INSTITUTION_RESPONSE';
    case 'UNKNOWN':
    default:
      return 'UNKNOWN';
  }
}

/**
 * Étape 1 (NEED_PROGRAMMING) : Vérifie de manière strictement indépendante si l'expression du besoin
 * citoyen initial ET sa programmation sont certifiées par un acte officiel primaire (PV de consultation
 * ou délibération du programme triennal).
 * RÈGLE CARDINALE : La vérification du budget voté (Étape 2) ne prouve JAMAIS l'existence du besoin citoyen initial.
 */
export function checkVerifiedNeedEvidence(project: BudgetProject): boolean {
  if (!project || project.publication_status === 'DRAFT') return false;
  if (project.data_provenance === 'DECLARED_ADMIN') return false;
  const needOrigin = (project.citizen_need_origin || project.initiative_source || '').trim();
  const hasProgram = Boolean(project.program_name?.trim() || project.details?.trim());
  if (!needOrigin || !hasProgram) return false;
  if (isGenericSourcePlaceholder(needOrigin)) return false;
  if (isSecondarySourceReference(needOrigin, project.citizen_need_source_url || project.source_url)) return false;
  if (/déclar|declar|saisi par|administrateur/i.test(needOrigin)) return false;
  if (project.citizen_need_verification_status !== 'VERIFIED') return false;
  if (!project.citizen_need_source_document_id?.trim()) return false;
  if (!isOfficialPrimarySourceUrl(project.citizen_need_source_url)) return false;
  if (
    typeof project.citizen_need_source_page !== 'number' ||
    !Number.isInteger(project.citizen_need_source_page) ||
    project.citizen_need_source_page <= 0
  ) {
    return false;
  }
  return true;
}

/**
 * Règles A, B, C, D, E, F, G :
 * Vérifie si le budget voté du projet (Étape 2) est certifié par une pièce officielle primaire identifiable.
 * - N'hérite JAMAIS du Compte Administratif (Étape 4) ni d'un rapprochement automatique (Règle E).
 * - Une référence de page seule ne suffit JAMAIS (Règle D).
 * - Exige un document officiel primaire identifiable, une page précise (> 0), un montant fini exact et
 *   une correspondance vérifiée (`financial_verification_status === 'VERIFIED'`).
 */
export function checkVerifiedBudgetEvidence(project: BudgetProject): boolean {
  if (!project || project.publication_status === 'DRAFT') return false;
  if (classifyProjectProvenance(project) !== 'OFFICIAL_PRIMARY_SOURCE') return false;
  if (!hasIdentifiableOfficialDocument(project)) return false;
  if (project.financial_verification_status !== 'VERIFIED') return false;
  if (typeof project.source_page !== 'number' || !Number.isInteger(project.source_page) || project.source_page <= 0) {
    return false;
  }
  if (project.budget_amount_fcfa == null || !Number.isFinite(project.budget_amount_fcfa) || project.budget_amount_fcfa < 0) {
    return false;
  }
  if (!isExactAmount(project as BudgetProject & { amount_precision?: AmountPrecision }, 'budget_amount_fcfa')) {
    return false;
  }
  return true;
}

/**
 * Vérifie si l'attribution du marché public (Étape 3) est certifiée par une pièce officielle DGMP.
 * Un rapprochement automatique STRONG par simple similarité de mots-clés ne suffit pas à lui seul :
 * exige soit une liaison explicite par identifiant, soit une concordance exacte d'intitulé, d'institution
 * et d'exercice sans conflit, accompagnée d'un avis DGMP primaire vérifié avec URL HTTPS.
 */
export function checkVerifiedProcurementEvidence(
  matchedProc: ProcurementMatch | undefined,
  matchResult: CaOperationMatchResult,
  project?: BudgetProject
): boolean {
  if (!matchedProc) return false;
  if (matchResult.confidence !== 'STRONG') return false;
  if (matchResult.conflictingFields && matchResult.conflictingFields.length > 0) return false;
  if (project) {
    if (project.publication_status === 'DRAFT' || project.data_provenance === 'DECLARED_ADMIN') return false;
    const isExplicitLink = Boolean(matchResult.operation?.linked_project_id && matchResult.operation.linked_project_id === project.id);
    const isExactNormalizedTitle =
      Boolean(matchResult.operation?.title && project.title) &&
      normalizeSearchText(matchResult.operation!.title) === normalizeSearchText(project.title);
    if (!isExplicitLink && !isExactNormalizedTitle) return false;
  }
  if (!matchedProc.tender_number?.trim() && !matchedProc.contract_number?.trim()) return false;
  if (!matchedProc.contractor?.trim()) return false;
  if (!isExactAmount(matchedProc, 'award_amount')) return false;
  if (!matchedProc.source?.trim() || isGenericSourcePlaceholder(matchedProc.source)) return false;
  if (isSecondarySourceReference(matchedProc.source, matchedProc.source_url)) return false;
  // La certification DGMP exige une pièce primaire traçable : identifiant documentaire,
  // page exacte et URL HTTPS hébergée sur un domaine institutionnel autorisé.
  if (!matchedProc.source_document_id?.trim()) return false;
  if (typeof matchedProc.source_page !== 'number' || !Number.isInteger(matchedProc.source_page) || matchedProc.source_page <= 0) return false;
  if (!isOfficialPrimarySourceUrl(matchedProc.source_url)) return false;
  const verif = matchedProc.verification_status?.trim();
  if (verif !== 'Vérifié DGMP' && verif !== 'VERIFIED' && verif !== 'OFFICIAL_DOCUMENT') return false;
  return true;
}

/**
 * Vérifie si l'exécution financière au Compte Administratif (Étape 4) est certifiée par une pièce primaire.
 * - Un rapprochement algorithmique par mots-clés ne certifie jamais à lui seul une opération : exige
 *   une liaison explicite ou une concordance exacte d'intitulé sans conflit, un CA officiel vérifié,
 *   un document source identifiable, une page précise (> 0) et un montant exact.
 * - Une réponse institutionnelle ne certifie jamais l'exécution financière.
 */
export function checkVerifiedExecutionEvidence(
  matchedOp: CAInvestmentOperation | undefined,
  account: AdministrativeAccount | undefined,
  matchResult: CaOperationMatchResult,
  project?: BudgetProject
): boolean {
  if (!matchedOp || !account) return false;
  if (matchResult.confidence !== 'STRONG') return false;
  if (matchResult.conflictingFields && matchResult.conflictingFields.length > 0) return false;
  if (project) {
    if (project.publication_status === 'DRAFT' || project.data_provenance === 'DECLARED_ADMIN') return false;
    const isExplicitLink = Boolean(matchedOp.linked_project_id && matchedOp.linked_project_id === project.id);
    const isExactNormalizedTitle =
      Boolean(matchedOp.title && project.title) &&
      normalizeSearchText(matchedOp.title) === normalizeSearchText(project.title);
    if (!isExplicitLink && !isExactNormalizedTitle) return false;
  }
  if (account.status !== 'VERIFIED' && account.status !== 'PUBLISHED') return false;
  if (account.verification_status !== 'OFFICIAL_DOCUMENT' && account.verification_status !== 'OFFICIAL_INSTITUTION') return false;
  // Un statut VERIFIED et un titre de document saisi ne suffisent pas :
  // l'identité documentaire et l'URL institutionnelle primaire doivent être présentes.
  if (isGenericSourcePlaceholder(account.source_document)) return false;
  if (!account.source_document_id?.trim()) return false;
  if (!isOfficialPrimarySourceUrl(account.source_url)) return false;
  const page = matchedOp.source_page ?? account.source_page;
  if (typeof page !== 'number' || !Number.isInteger(page) || page <= 0) return false;
  if (!isExactAmount(matchedOp, 'executed_amount')) return false;
  return true;
}

/**
 * Étape 5 (PHYSICAL_REALIZATION) : Vérifie si la réalisation physique est certifiée par un acte officiel
 * indépendant d'audit technique ou de réception contradictoire.
 * RÈGLES 5, 6, 7 & PRINCIPE 7 :
 * - Une dépense financière (Étape 4) ne prouve jamais la réalisation physique.
 * - Une déclaration administrative d'avancement (official_progress_source) ne certifie jamais la réalisation.
 * - Une réponse institutionnelle ne certifie jamais la réalisation physique.
 * - Une observation citoyenne approuvée donne CITIZEN_DOCUMENTED, jamais VERIFIED_OFFICIAL.
 */
export function checkVerifiedPhysicalEvidence(_project: BudgetProject, _approvedProofs: CitizenProof[] = []): boolean {
  return false;
}

/**
 * Étape 6 (AUDIT_ACCOUNTABILITY) : Vérifie si le contrôle / audit de l'opération est certifié par un
 * rapport d'audit officiel externe indépendant (Cour des Comptes, Inspection Générale d'État, ASACI).
 * RÈGLE CARDINALE : N'hérite JAMAIS de l'exécution au CA (Étape 4), ni du marché DGMP (Étape 3),
 * ni d'une réponse institutionnelle (INSTITUTION_RESPONSE).
 */
export function checkVerifiedAuditEvidence(project: BudgetProject): boolean {
  if (!project || project.publication_status === 'DRAFT') return false;
  if (project.data_provenance === 'DECLARED_ADMIN') return false;
  if (project.audit_verification_status !== 'VERIFIED') return false;
  const auditRef = project.audit_report_reference?.trim();
  if (!auditRef || isGenericSourcePlaceholder(auditRef)) return false;
  if (isSecondarySourceReference(auditRef, project.audit_source_url)) return false;
  if (!project.audit_source_document_id?.trim()) return false;
  if (!isOfficialPrimarySourceUrl(project.audit_source_url)) return false;
  if (
    typeof project.audit_source_page !== 'number' ||
    !Number.isInteger(project.audit_source_page) ||
    project.audit_source_page <= 0
  ) {
    return false;
  }
  return true;
}

export type DataAvailability =
  | 'AVAILABLE'
  | 'NOT_FOUND_PUBLICLY'
  | 'PENDING_COLLECTION'
  | 'SOURCE_CONFLICT';

export type MatchingConfidence = 'STRONG' | 'PROBABLE' | 'WEAK' | 'NONE' | 'TO_VERIFY';

export interface CaOperationMatchResult {
  operation?: CAInvestmentOperation;
  confidence: MatchingConfidence;
  matchingReason: string;
  matchedFields: string[];
  conflictingFields: string[];
  temporalJustification?: string;
  missingFields?: string[];
  matchingMethod?: 'EXPLICIT_REFERENCE' | 'INSTITUTION_YEAR_OBJECT' | 'NONE';
}

export interface PassportFact {
  amount_precision?: AmountPrecision;
  label: string;
  value: string | number | null;
  availability: 'AVAILABLE' | 'UNKNOWN' | 'NOT_FOUND_PUBLICLY';
  provenance: DataProvenance;
  provenanceClass?: PassportProvenanceClass;
  source_document_id: string | null;
  source_page: number | null;
  source_reference: string | null;
  source_url: string | null;
}

export type PassportField = 'institution_id' | 'institution_type' | 'fiscal_year' | 'object_label' | 'localisation'
  | 'budget_amount' | 'procurement_amount' | 'executed_amount' | 'contract_reference' | 'supplier'
  | 'source_document_id' | 'source_page' | 'source_reference' | 'financial_status' | 'physical_status'
  | 'citizen_evidence_status' | 'institution_response_status' | 'matching_confidence' | 'matching_method' | 'verification_status';

export interface PassportDataPoint {
  label: string;
  value: string;
  provenance: DataProvenance;
  provenanceClass?: PassportProvenanceClass;
  availability?: DataAvailability;
  sourceDetails?: string;
  sourceUrl?: string;
}

export interface PassportStage {
  id: 'NEED_PROGRAMMING' | 'BUDGET_VOTED' | 'PROCUREMENT_DGMP' | 'BUDGET_EXECUTION_CA' | 'PHYSICAL_REALIZATION' | 'AUDIT_ACCOUNTABILITY';
  stepNumber: number;
  label: string;
  shortDescription: string;
  status: PassportStageStatus;
  statusLabel: string;
  dataPoints: PassportDataPoint[];
  alertMessage?: string;
}

export interface ProjectAccountabilityPassportData {
  facts: Record<PassportField, PassportFact>;
  projectId: string;
  projectTitle: string;
  institutionName: string;
  fiscalYear: number | null;
  projectProvenanceClass: PassportProvenanceClass;
  hasVerifiedNeedEvidence: boolean;
  hasVerifiedBudgetEvidence: boolean;
  hasVerifiedProcurementEvidence: boolean;
  hasVerifiedExecutionEvidence: boolean;
  hasVerifiedPhysicalEvidence: boolean;
  hasVerifiedAuditEvidence: boolean;
  stages: PassportStage[];
  /** Indice de complétude documentaire (0 à 100 %). Ne constitue en aucun cas une note politique ou de gouvernance. */
  documentationCompletenessPct: number;
  /** @deprecated Utiliser documentationCompletenessPct pour clarté sémantique */
  overallAccountabilityScorePct: number;
  hasMatchedCaOperation: boolean;
  hasMatchedDgmpTender: boolean;
  hasCitizenFieldProofs: boolean;
  matchedOperation?: CAInvestmentOperation;
  matchedProcurement?: ProcurementMatch;
  matchResult?: CaOperationMatchResult;
}

/**
 * Recherche et évalue le rapprochement d'une opération d'investissement CA avec un projet budgétaire.
 * Applique une stratégie multi-critères stricte :
 * - Institution/Commune
 * - Exercice fiscal et compatibilité temporelle
 * - Mots-clés distinctifs
 * - Identifiants explicites
 * - Justificatifs pluriannuels documentés
 */
function findCandidate(project: BudgetProject, accounts: AdministrativeAccount[]): CaOperationMatchResult {
  if (!project) {
    return { confidence: 'NONE', matchingReason: 'Projet non défini', matchedFields: [], conflictingFields: [] };
  }

  const projectCommuneNorm = normalizeSearchText(project.commune_name || '');
  const projectTitleNorm = normalizeSearchText(project.title || '');
  const projectYear = Number(project.fiscal_year);
  const confidenceRank: Record<MatchingConfidence, number> = { NONE: 0, WEAK: 1, TO_VERIFY: 2, PROBABLE: 3, STRONG: 4 };
  type RankedCandidate = CaOperationMatchResult & { score: number; stableKey: string };
  const candidates: RankedCandidate[] = [];

  const stopwords = new Set([
    'construction', 'rehabilitation', 'amenagement', 'batiment', 'salles', 'classe',
    'projet', 'travaux', 'commune', 'extension', 'nouveau', 'nouvelle', 'equipement', 'ecole', 'primaire', 'publique'
  ]);

  for (const ca of accounts) {
    const caInstNorm = normalizeSearchText(ca.institution_name);
    const matchesCommune = Boolean(projectCommuneNorm && (caInstNorm.includes(projectCommuneNorm) || projectCommuneNorm.includes(caInstNorm)));
    const matchesInstId = Boolean(project.institution_id && ca.institution_id === project.institution_id);
    if (!matchesCommune && !matchesInstId) continue;

    for (const op of ca.operations || []) {
      const opYear = Number(op.fiscal_year) || ca.fiscal_year;
      const yearDiff = Number.isFinite(projectYear) && projectYear > 0 ? Math.abs(projectYear - opYear) : Number.POSITIVE_INFINITY;
      const isMultiYearDoc = Boolean(
        op.operation_reference?.toUpperCase().includes('REPORT') ||
        op.title.toLowerCase().includes('report') ||
        op.notes?.toLowerCase().includes('pluriannuel')
      );
      const institutionConflict = Boolean(project.institution_id && op.institution_id && project.institution_id !== op.institution_id);

      if (op.linked_project_id === project.id) {
        const confidence: MatchingConfidence = institutionConflict ? 'TO_VERIFY' : yearDiff === 0 || isMultiYearDoc ? 'STRONG' : 'TO_VERIFY';
        const conflictingFields = [
          ...(institutionConflict ? ['institution_id'] : []),
          ...(yearDiff !== 0 && !isMultiYearDoc ? ['fiscal_year'] : []),
        ];
        candidates.push({
          operation: op,
          confidence,
          matchingReason: institutionConflict
            ? 'Identifiant de projet concordant mais identifiant institutionnel contradictoire'
            : yearDiff === 0
              ? 'Liaison directe par identifiant officiel de projet et exercice fiscal concordant'
              : isMultiYearDoc
                ? 'Liaison directe par identifiant officiel avec justificatif de report/pluriannualité documenté'
                : `Identifiant identique mais exercices fiscaux distants (${projectYear} vs ${opYear}) sans justificatif pluriannuel certifié`,
          matchedFields: ['linked_project_id', ...(yearDiff === 0 ? ['fiscal_year'] : []), 'institution'],
          conflictingFields,
          temporalJustification: yearDiff !== 0
            ? (isMultiYearDoc
              ? `Exercice projet (${projectYear}) distinct de l'exercice CA (${opYear}), justifié par mention de report/pluriannualité.`
              : `Écart de ${Number.isFinite(yearDiff) ? yearDiff : 'N/A'} an(s) entre projet et CA : requiert vérification documentaire administrative.`)
            : undefined,
          score: 1000 + (yearDiff === 0 ? 100 : 0) + (matchesInstId ? 40 : 0),
          stableKey: `${ca.id}:${op.id}`,
        });
        continue;
      }

      const opTitleNorm = normalizeSearchText(op.title);
      const isExactTitle = opTitleNorm === projectTitleNorm || (opTitleNorm.length > 15 && projectTitleNorm.includes(opTitleNorm));
      const isSmartSearchMatch = matchesSmartSearch([op.title], project.title) || matchesSmartSearch([project.title], op.title);
      const opWords = extractWords(op.title).filter(w => w.length >= 4 && !stopwords.has(w));
      const projWords = extractWords(project.title).filter(w => w.length >= 4 && !stopwords.has(w));
      const commonDistinctiveWords = [...new Set(opWords.filter(w => projWords.includes(w)))];
      const hasStrongKeywords = commonDistinctiveWords.length >= 2;
      const localityNorm = normalizeSearchText(project.locality_village_neighborhood || '');
      const opLocationNorm = normalizeSearchText(op.location || '');
      const hasLocalityMatch = Boolean(localityNorm && (
        opLocationNorm === localityNorm ||
        opTitleNorm.includes(localityNorm) ||
        localityNorm.includes(opLocationNorm) && opLocationNorm.length > 0
      ));
      const localityConflict = Boolean(localityNorm && opLocationNorm && localityNorm !== opLocationNorm);
      const isTextuallyCorrelated = isExactTitle || isSmartSearchMatch || hasStrongKeywords || (hasLocalityMatch && commonDistinctiveWords.length >= 1);
      if (!isTextuallyCorrelated) continue;

      let confidence: MatchingConfidence;
      const conflictingFields: string[] = [];
      if (institutionConflict) conflictingFields.push('institution_id');
      if (localityConflict) conflictingFields.push('localisation');
      if (yearDiff !== 0 && !isMultiYearDoc) conflictingFields.push('fiscal_year');

      if (institutionConflict || localityConflict || !Number.isFinite(yearDiff)) {
        confidence = 'TO_VERIFY';
      } else if (yearDiff === 0) {
        confidence = isExactTitle || commonDistinctiveWords.length >= 3 ? 'STRONG' : 'PROBABLE';
      } else if (isMultiYearDoc) {
        confidence = 'PROBABLE';
      } else {
        confidence = yearDiff === 1 ? 'TO_VERIFY' : 'WEAK';
      }

      const score =
        (isExactTitle ? 300 : 0) +
        (isSmartSearchMatch ? 120 : 0) +
        Math.min(commonDistinctiveWords.length, 5) * 35 +
        (hasLocalityMatch ? 90 : 0) +
        (matchesInstId ? 60 : matchesCommune ? 25 : 0) +
        (yearDiff === 0 ? 100 : isMultiYearDoc ? 30 : 0) -
        (localityConflict ? 180 : 0) -
        (institutionConflict ? 300 : 0) -
        (yearDiff !== 0 && !isMultiYearDoc ? Math.min(Number.isFinite(yearDiff) ? yearDiff : 3, 3) * 80 : 0);

      candidates.push({
        operation: op,
        confidence,
        matchingReason: yearDiff === 0
          ? (confidence === 'STRONG'
            ? `Concordance institutionnelle, textuelle forte et exercice fiscal identique (${opYear})`
            : `Même institution et exercice fiscal (${opYear}) avec mots-clés concordants`)
          : isMultiYearDoc
            ? `Concordance institutionnelle et textuelle avec justification de report/pluriannualité documentée (${projectYear} vs CA ${opYear})`
            : `Similitude textuelle mais exercices incompatibles (${projectYear} vs CA ${opYear}) sans preuve de pluriannualité`,
        matchedFields: [
          'institution',
          ...(yearDiff === 0 ? ['fiscal_year'] : []),
          'title_distinctive_words',
          ...(hasLocalityMatch ? ['localisation'] : []),
          ...(isMultiYearDoc ? ['pluriannual_trace'] : []),
        ],
        conflictingFields,
        temporalJustification: yearDiff !== 0
          ? (isMultiYearDoc
            ? `Décalage temporel (${projectYear} vs CA ${opYear}) documenté par mention de report/pluriannualité au compte administratif officiel.`
            : `Écart de ${Number.isFinite(yearDiff) ? yearDiff : 'N/A'} exercice(s) : une ressemblance d'intitulé ne prouve pas l'identité de l'opération (Principe 2).`)
          : undefined,
        score,
        stableKey: `${ca.id}:${op.id}`,
      });
    }
  }

  if (!candidates.length) {
    return {
      confidence: 'NONE',
      matchingReason: 'Aucun compte administratif correspondant retrouvé dans les données auditées',
      matchedFields: [],
      conflictingFields: [],
    };
  }

  candidates.sort((a, b) =>
    confidenceRank[b.confidence] - confidenceRank[a.confidence] ||
    b.score - a.score ||
    a.stableKey.localeCompare(b.stableKey)
  );

  const best = candidates[0];
  const runnerUp = candidates[1];
  const sameEvidence = runnerUp &&
    confidenceRank[runnerUp.confidence] === confidenceRank[best.confidence] &&
    runnerUp.score === best.score &&
    runnerUp.operation?.id !== best.operation?.id;

  if (sameEvidence) {
    return {
      operation: best.operation,
      confidence: 'TO_VERIFY',
      matchingReason: `Ambiguïté : plusieurs opérations présentent un niveau de concordance équivalent (${best.operation?.id}, ${runnerUp.operation?.id}). Aucune correspondance certaine n'est affirmée.`,
      matchedFields: [...new Set(best.matchedFields.filter(field => runnerUp.matchedFields.includes(field)))],
      conflictingFields: [...new Set([...best.conflictingFields, ...runnerUp.conflictingFields, 'ambiguous_candidates'])],
      temporalJustification: best.temporalJustification,
    };
  }

  const { score: _score, stableKey: _stableKey, ...result } = best;
  return result;
}

export function findMatchingCaOperationResult(project: BudgetProject, accounts = ADMINISTRATIVE_ACCOUNTS_DATA): CaOperationMatchResult {
  const result = findCandidate(project, accounts);
  const operation = result.operation;
  const missingFields: string[] = [];
  if (!project.institution_id) missingFields.push('institution_id');
  if (!project.fiscal_year) missingFields.push('fiscal_year');
  if (!project.locality_village_neighborhood || !operation?.location) missingFields.push('localisation');
  if (!operation?.procurement_match?.contract_number) missingFields.push('contract_number');
  const account = accounts.find(ca => ca.id === operation?.ca_id);
  if (!account?.source_document_id) missingFields.push('source_document_id');
  if (!operation?.source_page && !account?.source_page) missingFields.push('source_page');
  if (operation && project.institution_id && project.institution_id !== operation.institution_id) result.conflictingFields.push('institution_id');
  if (operation && project.locality_village_neighborhood && operation.location
    && normalizeSearchText(project.locality_village_neighborhood) !== normalizeSearchText(operation.location)) result.conflictingFields.push('localisation');
  if (operation && isExactAmount(operation, 'planned_amount') && project.budget_amount_fcfa !== operation.planned_amount) result.conflictingFields.push('budget_amount_vs_ca_planned');
  if (result.conflictingFields.includes('institution_id') || result.conflictingFields.includes('localisation') || !project.fiscal_year) {
    if (operation) result.confidence = 'TO_VERIFY';
    result.matchingReason += ' ; identité, localisation ou exercice à vérifier avant toute liaison affirmative';
  }
  return { ...result, missingFields, matchingMethod: operation ? (operation.linked_project_id === project.id ? 'EXPLICIT_REFERENCE' : 'INSTITUTION_YEAR_OBJECT') : 'NONE' };
}

/**
 * Recherche une opération d'investissement CA correspondant à un projet.
 * Ne renvoie l'opération QUE si le rapprochement est qualifié en STRONG ou PROBABLE.
 * Les rapprochements WEAK ou TO_VERIFY ne sont jamais exposés comme certitude administrative.
 */
export function findMatchingCaOperation(project: BudgetProject): CAInvestmentOperation | undefined {
  const result = findMatchingCaOperationResult(project);
  if (result.confidence === 'STRONG' || result.confidence === 'PROBABLE') {
    return result.operation;
  }
  return undefined;
}

/**
 * Recherche le marché DGMP correspondant via l'opération CA rapprochée
 */
export function findMatchingDgmpProcurement(project: BudgetProject): ProcurementMatch | undefined {
  const matchResult = findMatchingCaOperationResult(project);
  if (matchResult.confidence === 'STRONG' || matchResult.confidence === 'PROBABLE') {
    return matchResult.operation?.procurement_match;
  }
  return undefined;
}

/**
 * Construit le Passeport de Redevabilité complet pour un projet
 */
export function generateProjectPassport(
  project: BudgetProject,
  citizenProofs: CitizenProof[] = [],
  accounts: AdministrativeAccount[] = ADMINISTRATIVE_ACCOUNTS_DATA
): ProjectAccountabilityPassportData {
  const matchResult = findMatchingCaOperationResult(project, accounts);
  const isAffirmativeMatch = matchResult.confidence === 'STRONG' || matchResult.confidence === 'PROBABLE';
  const matchedOp = isAffirmativeMatch ? matchResult.operation : undefined;
  const matchedProc = matchedOp?.procurement_match;
  const approvedProofs = citizenProofs.filter(p => p.project_id === project.id && p.verification_status === 'APPROVED' && !p.is_demo).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const account = accounts.find(ca => ca.id === matchedOp?.ca_id);
  const caSource = { source_document_id: account?.source_document_id || null, source_page: matchedOp?.source_page ?? account?.source_page ?? null, source_reference: matchedOp?.source_reference || account?.source_document || null, source_url: account?.source_url || null };
  const projectSource = { source_document_id: project.source_document_id || null, source_page: project.source_page ?? null, source_reference: project.source || null, source_url: project.source_url || null };
  const marketSource = { source_document_id: null, source_page: null, source_reference: matchedProc?.source || null, source_url: matchedProc?.source_url || null };
  const emptySource = { source_document_id: null, source_page: null, source_reference: null, source_url: null };
  const provenanceToClass = (prov: DataProvenance, fallbackClass?: PassportProvenanceClass): PassportProvenanceClass => {
    if (fallbackClass) return fallbackClass;
    switch (prov) {
      case 'OFFICIAL_SOURCE':
      case 'OFFICIAL_PRIMARY_SOURCE':
        return 'OFFICIAL_PRIMARY_SOURCE';
      case 'OFFICIAL_SECONDARY_SOURCE':
        return 'OFFICIAL_SECONDARY_SOURCE';
      case 'AUTOMATED_EXTRACTION':
        return 'AUTOMATED_EXTRACTION';
      case 'DECLARED_ADMIN':
      case 'UNVERIFIED_INPUT':
        return 'DECLARED_ADMIN';
      case 'CITIZEN_OBSERVATION':
        return 'CITIZEN_OBSERVATION';
      case 'SUIVIBUDGET_CALCULATION':
        return 'SUIVIBUDGET_CALCULATION';
      case 'INSTITUTION_RESPONSE':
        return 'INSTITUTION_RESPONSE';
      case 'UNKNOWN':
      default:
        return 'UNKNOWN';
    }
  };
  const fact = (
    label: string,
    value: string | number | null | undefined,
    provenance: DataProvenance,
    source: Pick<PassportFact, 'source_document_id' | 'source_page' | 'source_reference' | 'source_url'> = emptySource,
    explicitClass?: PassportProvenanceClass
  ): PassportFact => ({
    label,
    value: value ?? null,
    availability: value == null || value === '' ? 'UNKNOWN' : 'AVAILABLE',
    provenance,
    provenanceClass: provenanceToClass(provenance, explicitClass),
    ...source,
  });

  const responseCandidate = account?.institution_response;
  const response = responseCandidate?.response_status === 'PUBLISHED'
    && (!responseCandidate.operation_id || responseCandidate.operation_id === matchedOp?.id)
    && (!responseCandidate.ca_id || responseCandidate.ca_id === account?.id) ? responseCandidate : undefined;

  const projectProvenanceClass = classifyProjectProvenance(project);
  const projectProvenance = resolveProjectDataProvenance(project);
  const hasVerifiedNeedEvidence = checkVerifiedNeedEvidence(project);
  const hasVerifiedBudgetEvidence =
    checkVerifiedBudgetEvidence(project) &&
    !matchResult.conflictingFields.includes('budget_amount_vs_ca_planned');
  const hasVerifiedProcurementEvidence = checkVerifiedProcurementEvidence(matchedProc, matchResult, project);
  const hasVerifiedExecutionEvidence = checkVerifiedExecutionEvidence(matchedOp, account, matchResult, project);
  const hasVerifiedPhysicalEvidence = checkVerifiedPhysicalEvidence(project, approvedProofs);
  const hasVerifiedAuditEvidence = checkVerifiedAuditEvidence(project);

  const caDataProvenance: DataProvenance = !account
    ? 'UNKNOWN'
    : isSecondarySourceReference(account.source_document, account.source_url)
      ? 'OFFICIAL_SECONDARY_SOURCE'
      : (account.verification_status === 'OFFICIAL_DOCUMENT' || account.verification_status === 'OFFICIAL_INSTITUTION') &&
        (account.status === 'VERIFIED' || account.status === 'PUBLISHED') &&
        (!isGenericSourcePlaceholder(account.source_document) || Boolean(account.source_document_id?.trim()))
        ? 'OFFICIAL_SOURCE'
        : 'AUTOMATED_EXTRACTION';

  const marketDataProvenance: DataProvenance = !matchedProc
    ? 'UNKNOWN'
    : isSecondarySourceReference(matchedProc.source, matchedProc.source_url)
      ? 'OFFICIAL_SECONDARY_SOURCE'
      : hasVerifiedProcurementEvidence
        ? 'OFFICIAL_SOURCE'
        : 'AUTOMATED_EXTRACTION';

  const physicalProvenance: DataProvenance = approvedProofs.length
    ? 'CITIZEN_OBSERVATION'
    : project.official_progress_source
      ? (project.data_provenance === 'DECLARED_ADMIN' ? 'UNVERIFIED_INPUT' : 'INSTITUTION_RESPONSE')
      : 'UNVERIFIED_INPUT';
  const physicalProvenanceClass: PassportProvenanceClass = approvedProofs.length
    ? 'CITIZEN_OBSERVATION'
    : project.official_progress_source
      ? (project.data_provenance === 'DECLARED_ADMIN' ? 'DECLARED_ADMIN' : 'INSTITUTION_RESPONSE')
      : 'UNKNOWN';

  const facts: Record<PassportField, PassportFact> = {
    institution_id: fact('Institution', project.institution_id, projectProvenance, projectSource, projectProvenanceClass),
    institution_type: fact('Type d’institution', account?.institution_type || project.institution_type, account ? caDataProvenance : projectProvenance, account ? caSource : projectSource, account ? undefined : projectProvenanceClass),
    fiscal_year: fact('Exercice', project.fiscal_year || null, projectProvenance, projectSource, projectProvenanceClass),
    object_label: fact('Quoi ?', project.title, projectProvenance, projectSource, projectProvenanceClass),
    localisation: fact('Où ?', project.locality_village_neighborhood || matchedOp?.location, project.locality_village_neighborhood ? projectProvenance : (matchedOp?.location ? caDataProvenance : projectProvenance), project.locality_village_neighborhood ? projectSource : caSource, project.locality_village_neighborhood ? projectProvenanceClass : undefined),
    budget_amount: fact('Budget prévu (FCFA)', project.budget_amount_fcfa, projectProvenance, projectSource, projectProvenanceClass),
    procurement_amount: fact('Marché attribué (FCFA)', matchedProc?.award_amount, marketDataProvenance, marketSource),
    executed_amount: fact('Exécution indiquée au CA (FCFA)', matchedOp?.executed_amount, caDataProvenance, caSource),
    contract_reference: fact('Référence du marché / appel d’offres', matchedProc?.contract_number || matchedProc?.tender_number, marketDataProvenance, marketSource),
    supplier: fact('Attributaire', matchedProc?.contractor, marketDataProvenance, marketSource),
    source_document_id: fact('Document source relié', caSource.source_document_id, caDataProvenance, caSource),
    source_page: fact('Page source', caSource.source_page, caDataProvenance, caSource),
    source_reference: fact('Libellé exact de la source', caSource.source_reference || project.source, account ? caDataProvenance : projectProvenance, account ? caSource : projectSource, account ? undefined : projectProvenanceClass),
    financial_status: fact('Situation financière', matchedOp && isExactAmount(matchedOp, 'executed_amount') ? (matchedOp.executed_amount === 0 ? 'CA_REPORTED_ZERO' : 'CA_REPORTED_EXECUTION') : null, 'SUIVIBUDGET_CALCULATION', caSource, 'SUIVIBUDGET_CALCULATION'),
    physical_status: fact('Réalisation physique', approvedProofs.length ? 'CITIZEN_OBSERVATION' : project.official_progress_source ? 'OFFICIAL_DECLARATION' : null, physicalProvenance, approvedProofs.length ? { ...emptySource, source_reference: `Constat citoyen ${approvedProofs[0].id}` } : project.official_progress_source ? { ...emptySource, source_reference: project.official_progress_source } : emptySource, physicalProvenanceClass),
    citizen_evidence_status: fact('Preuves terrain', approvedProofs.length ? 'APPROVED' : 'NOT_FOUND_PUBLICLY', 'CITIZEN_OBSERVATION', emptySource, 'CITIZEN_OBSERVATION'),
    institution_response_status: fact('Réponse institutionnelle', response ? 'PUBLISHED' : 'NOT_FOUND_PUBLICLY', 'INSTITUTION_RESPONSE', response ? { ...emptySource, source_reference: response.supporting_document_name || response.response_text, source_url: response.supporting_document_url || null } : emptySource, 'INSTITUTION_RESPONSE'),
    matching_confidence: fact('Confiance du rapprochement', matchResult.confidence, 'SUIVIBUDGET_CALCULATION', emptySource, 'SUIVIBUDGET_CALCULATION'),
    matching_method: fact('Méthode de rapprochement', matchResult.matchingMethod, 'SUIVIBUDGET_CALCULATION', emptySource, 'SUIVIBUDGET_CALCULATION'),
    verification_status: fact('Vérification documentaire', account?.verification_status || 'NOT_FOUND_PUBLICLY', caDataProvenance, caSource),
  };
  for (const value of Object.values(facts)) if (value.value === 'NOT_FOUND_PUBLICLY') value.availability = 'NOT_FOUND_PUBLICLY';

  const stages: PassportStage[] = [];

  // -------------------------------------------------------------------------
  // ÉTAPE 1 : BESOIN & PROGRAMMATION
  // RÈGLE CARDINALE (Section 3 & 7) : L'INSCRIPTION BUDGÉTAIRE NE PROUVE JAMAIS LE BESOIN CITOYEN INITIAL.
  // Aucune étape n'hérite du statut officiel d'une autre étape (hasVerifiedBudgetEvidence et account exclus).
  // -------------------------------------------------------------------------
  const hasProgram = Boolean(project.program_name || project.details);
  const citizenNeedOrigin = project.citizen_need_origin?.trim() || project.initiative_source?.trim();
  const citizenNeedRecorded = Boolean(citizenNeedOrigin);
  const isDeclaredAdminNeed =
    project.data_provenance === 'DECLARED_ADMIN' ||
    project.citizen_need_verification_status === 'UNVERIFIED' ||
    (citizenNeedRecorded && /déclar|declar|saisi par|administrateur/i.test(citizenNeedOrigin!));
  const isSecondaryNeedSource =
    citizenNeedRecorded &&
    isSecondarySourceReference(citizenNeedOrigin, project.citizen_need_source_url || project.source_url);

  const needOriginProvenance: DataProvenance = !citizenNeedRecorded
    ? 'SUIVIBUDGET_CALCULATION'
    : hasVerifiedNeedEvidence
      ? 'OFFICIAL_SOURCE'
      : isDeclaredAdminNeed
        ? 'UNVERIFIED_INPUT'
        : isSecondaryNeedSource
          ? 'OFFICIAL_SECONDARY_SOURCE'
          : 'CITIZEN_OBSERVATION';

  const needOriginProvenanceClass: PassportProvenanceClass = !citizenNeedRecorded
    ? 'SUIVIBUDGET_CALCULATION'
    : hasVerifiedNeedEvidence
      ? 'OFFICIAL_PRIMARY_SOURCE'
      : isDeclaredAdminNeed
        ? 'DECLARED_ADMIN'
        : isSecondaryNeedSource
          ? 'OFFICIAL_SECONDARY_SOURCE'
          : 'CITIZEN_OBSERVATION';

  const needStageStatus: PassportStageStatus =
    !hasProgram && !citizenNeedRecorded
      ? 'NOT_FOUND_PUBLICLY'
      : hasVerifiedNeedEvidence
        ? 'VERIFIED_OFFICIAL'
        : 'PENDING_DOCUMENTATION';

  const needStatusLabel =
    !hasProgram && !citizenNeedRecorded
      ? 'Donnée non retrouvée publiquement'
      : hasVerifiedNeedEvidence
        ? 'Besoin & Programmation Certifiés (PV officiel)'
        : isDeclaredAdminNeed
          ? 'Besoin ou programmation déclaré (PV officiel requis)'
          : hasVerifiedBudgetEvidence && !citizenNeedRecorded
            ? 'Programmation inscrite au budget — besoin citoyen initial non documenté'
            : projectProvenanceClass === 'OFFICIAL_SECONDARY_SOURCE' || isSecondaryNeedSource
              ? 'Programmation rapportée par source secondaire (à corroborer)'
              : 'Programmation cataloguée (origine du besoin à documenter)';

  stages.push({
    id: 'NEED_PROGRAMMING',
    stepNumber: 1,
    label: 'Besoin & Programmation',
    shortDescription: 'Traçabilité du besoin citoyen d\'origine et inscription au programme d\'investissement',
    status: needStageStatus,
    statusLabel: needStatusLabel,
    dataPoints: [
      {
        label: 'Programmation budgétaire',
        value: project.program_name || project.details || 'Ligne d\'investissement inscrite au budget',
        provenance: projectProvenance,
        provenanceClass: projectProvenanceClass,
        sourceDetails: project.source || 'Document budgétaire source non relié',
        sourceUrl: project.source_url,
      },
      {
        label: 'Expression du besoin citoyen',
        value: citizenNeedRecorded
          ? citizenNeedOrigin!
          : 'Non documenté publiquement dans l\'extrait budgétaire',
        provenance: needOriginProvenance,
        provenanceClass: needOriginProvenanceClass,
        availability: citizenNeedRecorded ? 'AVAILABLE' : 'NOT_FOUND_PUBLICLY',
        sourceDetails: !citizenNeedRecorded
          ? 'L\'inscription budgétaire ne permet pas à elle seule de retracer la consultation citoyenne d\'origine (Principe 4).'
          : hasVerifiedNeedEvidence
            ? `PV / Acte officiel vérifié (page ${project.citizen_need_source_page})`
            : isDeclaredAdminNeed
              ? 'Déclaration administrative non corroborée par un procès-verbal de consultation citoyenne indépendant.'
              : 'Processus participatif / APEC (en attente de PV officiel primaire)',
        sourceUrl: project.citizen_need_source_url,
      },
      {
        label: 'Niveau d\'action',
        value: project.scope_level === 'NATIONAL' ? 'Projet d\'envergure nationale' : 'Projet local / communal',
        provenance: projectProvenance,
        provenanceClass: projectProvenanceClass,
      },
      {
        label: 'Secteur public',
        value: project.category || 'Général',
        provenance: projectProvenance,
        provenanceClass: projectProvenanceClass,
      },
    ],
  });

  // -------------------------------------------------------------------------
  // ÉTAPE 2 : BUDGET VOTÉ
  // Distinction stricte entre montant inconnu (null) et montant zéro documenté (0).
  // -------------------------------------------------------------------------
  const hasDocumentedAmount =
    project.publication_status !== 'DRAFT' &&
    project.budget_amount_fcfa != null &&
    Number.isFinite(project.budget_amount_fcfa) &&
    project.budget_amount_fcfa >= 0;
  const isZeroDocumentedAmount = hasDocumentedAmount && project.budget_amount_fcfa === 0;
  const hasPositiveVotedAmount = hasDocumentedAmount && project.budget_amount_fcfa! > 0;

  const budgetVotedStatus: PassportStageStatus =
    hasVerifiedBudgetEvidence && hasDocumentedAmount
      ? 'VERIFIED_OFFICIAL'
      : 'PENDING_DOCUMENTATION';

  const budgetVotedStatusLabel =
    projectProvenanceClass === 'DECLARED_ADMIN'
      ? 'Montant déclaré, vérification distincte requise'
      : projectProvenanceClass === 'OFFICIAL_SECONDARY_SOURCE'
        ? 'Montant issu de source secondaire (délibération primaire requise)'
        : !hasDocumentedAmount
          ? 'Montant non renseigné'
          : isZeroDocumentedAmount
            ? (hasVerifiedBudgetEvidence ? 'Montant nul documenté (0 FCFA — source vérifiée)' : 'Montant nul documenté (0 FCFA — pièce à vérifier)')
            : hasVerifiedBudgetEvidence
              ? 'Voté au Budget (source vérifiée)'
              : 'Ligne cataloguée — page/pièce officielle à vérifier';

  stages.push({
    id: 'BUDGET_VOTED',
    stepNumber: 2,
    label: 'Budget Voté (BP)',
    shortDescription: 'Crédits votés par l\'autorité délibérante (Loi de Finances ou Conseil Municipal)',
    status: budgetVotedStatus,
    statusLabel: budgetVotedStatusLabel,
    dataPoints: [
      {
        label: 'Exercice fiscal',
        value: project.fiscal_year ? String(project.fiscal_year) : 'Non renseigné',
        provenance: projectProvenance,
        provenanceClass: projectProvenanceClass,
      },
      {
        label: 'Montant inscrit',
        value: isZeroDocumentedAmount
          ? '0 FCFA (montant nul documenté)'
          : hasPositiveVotedAmount
            ? formatFCFA(project.budget_amount_fcfa!)
            : 'Non renseigné',
        provenance: projectProvenance,
        provenanceClass: projectProvenanceClass,
        availability: hasDocumentedAmount ? 'AVAILABLE' : 'NOT_FOUND_PUBLICLY',
        sourceDetails: project.source || 'Document budgétaire source non relié',
        sourceUrl: project.source_url,
      },
      {
        label: 'Nature de la dépense',
        value: project.nature_expense || 'Investissements',
        provenance: projectProvenance,
        provenanceClass: projectProvenanceClass,
      },
      {
        label: 'Maîtrise d\'Ouvrage',
        value: project.master_builder || project.commune_name || project.region_name || 'Collectivité / Ministère',
        provenance: projectProvenance,
        provenanceClass: projectProvenanceClass,
      },
    ],
  });

  // -------------------------------------------------------------------------
  // ÉTAPE 3 : COMMANDE PUBLIQUE & MARCHÉ (DGMP)
  // RÈGLE : LA SIMPLE PRÉSENCE D'UN TITULAIRE OU UN RAPPROCHEMENT AUTOMATIQUE NE PROUVE PAS UN MARCHÉ DGMP CERTIFIÉ
  // -------------------------------------------------------------------------
  if (matchedProc) {
    const procurementStatus: PassportStageStatus = hasVerifiedProcurementEvidence
      ? 'VERIFIED_OFFICIAL'
      : 'PROBABLE_MATCH';
    const procurementStatusLabel = hasVerifiedProcurementEvidence
      ? 'Marché Officiel Attribué'
      : matchResult.confidence === 'PROBABLE'
        ? 'Marché Officiel Probable'
        : 'Marché rapproché (avis DGMP primaire à certifier)';
    stages.push({
      id: 'PROCUREMENT_DGMP',
      stepNumber: 3,
      label: 'Commande Publique & Attribution (DGMP)',
      shortDescription: 'Attribution du marché public rapprochée des avis officiels de la DGMP',
      status: procurementStatus,
      statusLabel: procurementStatusLabel,
      alertMessage: matchResult.temporalJustification,
      dataPoints: [
        {
          label: 'N° Appel d\'Offres',
          value: matchedProc.tender_number || 'Non renseigné',
          provenance: marketDataProvenance,
          sourceDetails: matchedProc.source,
          sourceUrl: matchedProc.source_url,
        },
        {
          label: 'Objet officiel du marché',
          value: matchedProc.procurement_object,
          provenance: marketDataProvenance,
        },
        {
          label: 'Entreprise adjudicataire',
          value: matchedProc.contractor,
          provenance: marketDataProvenance,
        },
        {
          label: 'Montant adjugé',
          value: formatRecordAmount(matchedProc, 'award_amount'),
          provenance: marketDataProvenance,
        },
        {
          label: 'Date d\'attribution',
          value: matchedProc.award_date || '2024',
          provenance: marketDataProvenance,
        },
      ],
    });
  } else if (project.contractor_name && !project.contractor_name.toLowerCase().includes('appel d\'offres')) {
    // Présence d'un nom de titulaire non corroboré par avis DGMP
    stages.push({
      id: 'PROCUREMENT_DGMP',
      stepNumber: 3,
      label: 'Commande Publique & Entreprise',
      shortDescription: 'Titulaire mentionné dans la fiche projet, en attente de référence officielle DGMP',
      status: 'PENDING_DOCUMENTATION',
      statusLabel: 'Titulaire Déclaré (non audité DGMP)',
      dataPoints: [
        {
          label: 'Entreprise déclarée',
          value: project.contractor_name,
          provenance: 'UNVERIFIED_INPUT',
          provenanceClass: 'DECLARED_ADMIN',
          sourceDetails: 'Mention administrative déclarative non corroborée par un avis d\'attribution DGMP vérifié.',
        },
        {
          label: 'Avis d\'attribution DGMP',
          value: 'En attente de rapprochement avec le répertoire officiel des marchés',
          provenance: 'SUIVIBUDGET_CALCULATION',
          provenanceClass: 'SUIVIBUDGET_CALCULATION',
          availability: 'PENDING_COLLECTION',
        },
      ],
    });
  } else {
    stages.push({
      id: 'PROCUREMENT_DGMP',
      stepNumber: 3,
      label: 'Commande Publique & Marché (DGMP)',
      shortDescription: 'Recherche de l\'avis d\'attribution dans le répertoire de la Direction Générale des Marchés Publics',
      status: 'NOT_FOUND_PUBLICLY',
      statusLabel: 'Donnée non retrouvée publiquement',
      dataPoints: [
        {
          label: 'Statut du marché',
          value: 'Aucun avis d\'attribution rapproché pour le moment',
          provenance: 'SUIVIBUDGET_CALCULATION',
          provenanceClass: 'SUIVIBUDGET_CALCULATION',
          availability: 'NOT_FOUND_PUBLICLY',
          sourceDetails: 'Avis DGMP consultés : l\'absence de résultat ne prouve pas l\'absence d\'appel d\'offres (Principe 9).',
        },
      ],
    });
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 4 : EXÉCUTION BUDGÉTAIRE (COMPTE ADMINISTRATIF)
  // RÈGLE : STRICTEMENT NEUTRE, AUCUNE INTERPRÉTATION CAUSALE ("REPORT PROBABLE" INTERDIT)
  // Un rapprochement automatique STRONG ou une réponse institutionnelle ne certifie jamais à lui seul l'exécution.
  // -------------------------------------------------------------------------
  if (matchedOp) {
    const isZeroExecuted = isExactAmount(matchedOp, 'executed_amount') && matchedOp.executed_amount === 0;
    const isUncertainExecuted = !isExactAmount(matchedOp, 'executed_amount');

    // Formulation factuelle et neutre obligatoire (Section 5.3)
    const alertMessage = isZeroExecuted
      ? 'Le Compte Administratif consulté indique 0 FCFA exécuté/ordonnancé pour cette opération sur l’exercice observé. La cause de cet écart n’est pas établie par les sources actuellement reliées.'
      : matchResult.temporalJustification;

    // Un montant nul ne constitue une anomalie financière que si le CA, la pièce
    // source et le rapprochement de l'opération sont tous officiellement vérifiés.
    // Un zéro issu d'un rapprochement non certifié reste une donnée à corroborer.
    const isVerifiedZeroExecuted = isZeroExecuted && hasVerifiedExecutionEvidence;

    const executionStageStatus: PassportStageStatus = isUncertainExecuted
      ? 'PENDING_DOCUMENTATION'
      : isVerifiedZeroExecuted
        ? 'ANOMALY_DETECTED'
        : hasVerifiedExecutionEvidence
          ? 'VERIFIED_OFFICIAL'
          : 'PROBABLE_MATCH';

    const executionStageStatusLabel = isUncertainExecuted
      ? 'Montant d’exécution qualifié ou à confirmer'
      : isVerifiedZeroExecuted
        ? 'Exécution financière à 0 FCFA (CA et rapprochement vérifiés)'
        : isZeroExecuted
          ? 'Montant nul rapproché — certification documentaire en attente'
          : hasVerifiedExecutionEvidence
            ? 'Mandaté au Compte Administratif'
            : matchResult.confidence === 'PROBABLE'
              ? 'Opération CA Probable'
              : 'Rapprochement CA automatique (pièce primaire à certifier)';

    stages.push({
      id: 'BUDGET_EXECUTION_CA',
      stepNumber: 4,
      label: 'Exécution Budgétaire (Compte Administratif)',
      shortDescription: 'Crédits mandatés et ordonnancés inscrits au Compte Administratif audité',
      status: executionStageStatus,
      statusLabel: executionStageStatusLabel,
      alertMessage,
      dataPoints: [
        {
          label: 'Exercice CA',
          value: String(matchedOp.fiscal_year),
          provenance: caDataProvenance,
        },
        {
          label: 'Ligne opération',
          value: matchedOp.operation_reference || 'Ligne d\'investissement',
          provenance: caDataProvenance,
        },
        {
          label: 'Crédits prévus au CA',
          value: formatRecordAmount(matchedOp, 'planned_amount'),
          provenance: caDataProvenance,
        },
        {
          label: 'Montant effectivement ordonnancé',
          value: formatRecordAmount(matchedOp, 'executed_amount'),
          provenance: caDataProvenance,
          sourceDetails: matchedOp.source_page
            ? `Page ${matchedOp.source_page} du Compte Administratif`
            : 'Page du Compte Administratif à préciser',
        },
      ],
    });
  } else if (matchResult.confidence === 'TO_VERIFY') {
    // Écart temporel ou ambiguïté exigeant un contrôle humain
    stages.push({
      id: 'BUDGET_EXECUTION_CA',
      stepNumber: 4,
      label: 'Exécution Budgétaire (Compte Administratif)',
      shortDescription: 'Rapprochement potentiel avec une opération sous réserve de contrôle temporel',
      status: 'PENDING_DOCUMENTATION',
      statusLabel: 'Rapprochement à vérifier (écart temporel)',
      alertMessage: matchResult.temporalJustification || 'Un écart d\'exercice a été détecté entre la fiche projet et le compte administratif.',
      dataPoints: [
        {
          label: 'Statut du contrôle',
          value: 'Opération candidate identifiée mais non affirmée (écart d\'exercice)',
          provenance: 'SUIVIBUDGET_CALCULATION',
          provenanceClass: 'SUIVIBUDGET_CALCULATION',
          availability: 'PENDING_COLLECTION',
          sourceDetails: matchResult.matchingReason,
        },
      ],
    });
  } else {
    stages.push({
      id: 'BUDGET_EXECUTION_CA',
      stepNumber: 4,
      label: 'Exécution Budgétaire (Compte Administratif)',
      shortDescription: 'Reddition de compte officielle de la collectivité pour cet exercice',
      status: 'NOT_FOUND_PUBLICLY',
      statusLabel: 'CA en attente de collecte / publication',
      dataPoints: [
        {
          label: 'Compte Administratif',
          value: 'En attente de réception ou de publication du document certifié',
          provenance: 'SUIVIBUDGET_CALCULATION',
          provenanceClass: 'SUIVIBUDGET_CALCULATION',
          availability: 'NOT_FOUND_PUBLICLY',
          sourceDetails: 'La publication officielle du CA relève de la collectivité locale.',
        },
      ],
    });
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 5 : RÉALISATION PHYSIQUE & PREUVES TERRAIN
  // RÈGLE CARDINALE : UNE DÉPENSE FINANCIÈRE NE PROUVE PAS UNE RÉALISATION PHYSIQUE (Principe 7)
  // UNE RÉALISATION PHYSIQUE DÉCLARÉE NE DEVIENT JAMAIS UNE RÉALISATION CERTIFIÉE (VERIFIED_OFFICIAL)
  // -------------------------------------------------------------------------
  const hasOfficialRate = Boolean(project.official_progress_source) && project.progress_percentage > 0;
  const hasFieldProofs = approvedProofs.length > 0;

  let physicalStatus: PassportStageStatus = 'PENDING_DOCUMENTATION';
  let physicalLabel = 'En attente de constat terrain';

  if (hasFieldProofs) {
    physicalStatus = 'CITIZEN_DOCUMENTED';
    physicalLabel = `${approvedProofs.length} observation(s) citoyenne(s) publiée(s)`;
  } else if (hasOfficialRate) {
    // Un taux officiel déclaré reste une déclaration administrative en attente de constat citoyen
    physicalStatus = 'PENDING_DOCUMENTATION';
    physicalLabel = `Taux administratif déclaré : ${project.progress_percentage}%`;
  }

  stages.push({
    id: 'PHYSICAL_REALIZATION',
    stepNumber: 5,
    label: 'Réalisation Physique & Terrain',
    shortDescription: 'Double regard citoyen : déclaration administrative vs constat factuel sur le terrain',
    status: physicalStatus,
    statusLabel: physicalLabel,
    alertMessage: 'Règle civique : Une dépense mandatée au budget ne constitue jamais une preuve d\'achèvement des travaux sur le terrain.',
    dataPoints: [
      {
        label: 'Taux administratif déclaré',
        value: hasOfficialRate ? `${project.progress_percentage}%` : 'Non communiqué par la maîtrise d\'ouvrage',
        provenance: project.data_provenance === 'DECLARED_ADMIN' ? 'UNVERIFIED_INPUT' : 'INSTITUTION_RESPONSE',
        provenanceClass: project.data_provenance === 'DECLARED_ADMIN' ? 'DECLARED_ADMIN' : 'INSTITUTION_RESPONSE',
        sourceDetails: project.official_progress_source || project.master_builder || 'Déclaration administrative non corroborée par constat indépendant (Principe 7).',
      },
      {
        label: 'Contributions citoyennes publiées',
        value: hasFieldProofs ? `${approvedProofs.length} constat(s) photo/vidéo approuvé(s)` : '0 constat pour l\'instant',
        provenance: 'CITIZEN_OBSERVATION',
        provenanceClass: 'CITIZEN_OBSERVATION',
      },
      {
        label: 'Dernier statut terrain observé',
        value: hasFieldProofs
          ? (approvedProofs[0].citizen_status_claim === 'COMPLETED' ? 'Achèvement déclaré par un citoyen' : approvedProofs[0].citizen_status_claim === 'IN_PROGRESS' ? 'Travaux déclarés en cours' : 'Non démarré selon le citoyen')
          : 'Non documenté sur place',
        provenance: 'CITIZEN_OBSERVATION',
        provenanceClass: 'CITIZEN_OBSERVATION',
      },
    ],
  });

  // -------------------------------------------------------------------------
  // ÉTAPE 6 : REDDITION DE COMPTES & AUDIT
  // RÈGLE CARDINALE : N'hérite JAMAIS du statut officiel d'une autre étape (ni CA, ni DGMP, ni Budget).
  // Une réponse institutionnelle ou un rapprochement CA ne certifie jamais l'audit externe indépendant.
  // -------------------------------------------------------------------------
  const auditStatus: PassportStageStatus = hasVerifiedAuditEvidence
    ? 'VERIFIED_OFFICIAL'
    : 'PENDING_DOCUMENTATION';
  const auditStatusLabel = hasVerifiedAuditEvidence
    ? 'Audit Officiel Vérifié'
    : response
      ? 'Droit de réponse publié (sans certification d’audit)'
      : hasVerifiedExecutionEvidence
        ? 'Données CA rapprochées — en attente d’audit indépendant'
        : 'Cycle Ouvert';

  stages.push({
    id: 'AUDIT_ACCOUNTABILITY',
    stepNumber: 6,
    label: 'Reddition de Comptes & Droit de Réponse',
    shortDescription: 'Audit citoyen contradictoire, traçabilité documentaire et droit de réponse institutionnel',
    status: auditStatus,
    statusLabel: auditStatusLabel,
    dataPoints: [
      {
        label: 'Contrôle contradictoire & Audit',
        value: hasVerifiedAuditEvidence
          ? `${project.audit_report_reference} (page ${project.audit_source_page})`
          : hasVerifiedExecutionEvidence
            ? 'Rapproché au CA officiel — aucun rapport d’audit externe indépendant rattaché'
            : 'En attente de documents complémentaires et d’audit indépendant',
        provenance: hasVerifiedAuditEvidence ? 'OFFICIAL_SOURCE' : 'SUIVIBUDGET_CALCULATION',
        provenanceClass: hasVerifiedAuditEvidence ? 'OFFICIAL_PRIMARY_SOURCE' : 'SUIVIBUDGET_CALCULATION',
        sourceUrl: project.audit_source_url,
      },
      {
        label: 'Droit d\'accès à l\'information (CAIDP)',
        value: 'Modèle de requête légale disponible sur la plateforme',
        provenance: 'SUIVIBUDGET_CALCULATION',
        provenanceClass: 'SUIVIBUDGET_CALCULATION',
      },
      {
        label: 'Droit de réponse institutionnel',
        value: response
          ? `Réponse publiée (${response.supporting_document_name || 'droit de réponse institutionnel'}) — ne vaut pas certification financière ou physique`
          : 'Ouvert à la collectivité et aux services techniques',
        provenance: 'INSTITUTION_RESPONSE',
        provenanceClass: 'INSTITUTION_RESPONSE',
      },
    ],
  });

  // -------------------------------------------------------------------------
  // INDICE DE COMPLÉTUDE DOCUMENTAIRE (Section 9)
  // Mesure exclusivement la complétude documentaire sur les 6 maillons civiques.
  // Ne constitue JAMAIS une note politique ou de gouvernance locale.
  // -------------------------------------------------------------------------
  const documentedStagesCount = stages.filter(s =>
    s.status === 'VERIFIED_OFFICIAL' || s.status === 'PROBABLE_MATCH' || s.status === 'CITIZEN_DOCUMENTED'
  ).length;
  const documentationCompletenessPct = Math.round((documentedStagesCount / stages.length) * 100);

  facts.procurement_amount.amount_precision = matchedProc ? amountPrecision(matchedProc, 'award_amount') : 'UNKNOWN';
  facts.executed_amount.amount_precision = matchedOp ? amountPrecision(matchedOp, 'executed_amount') : 'UNKNOWN';
  return {
    facts,
    projectId: project.id,
    projectTitle: project.title,
    institutionName: project.commune_name || project.region_name || project.ministry_name || 'Collectivité',
    fiscalYear: project.fiscal_year || null,
    projectProvenanceClass,
    hasVerifiedNeedEvidence,
    hasVerifiedBudgetEvidence,
    hasVerifiedProcurementEvidence,
    hasVerifiedExecutionEvidence,
    hasVerifiedPhysicalEvidence,
    hasVerifiedAuditEvidence,
    stages,
    documentationCompletenessPct,
    overallAccountabilityScorePct: documentationCompletenessPct,
    hasMatchedCaOperation: Boolean(matchedOp),
    hasMatchedDgmpTender: Boolean(matchedProc),
    hasCitizenFieldProofs: approvedProofs.length > 0,
    matchedOperation: matchedOp,
    matchedProcurement: matchedProc,
    matchResult,
  };
}
