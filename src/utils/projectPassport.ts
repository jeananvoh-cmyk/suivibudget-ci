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

export type DataProvenance = 
  | 'OFFICIAL_SOURCE'          // Document officiel vérifié (Loi, CA, DGMP)
  | 'SUIVIBUDGET_CALCULATION'  // Rapprochement ou calcul algorithmique SuiviBudget
  | 'CITIZEN_OBSERVATION'      // Constat de terrain ou preuve citoyenne
  | 'INSTITUTION_RESPONSE'     // Réponse institutionnelle ou droit de réponse
  | 'UNVERIFIED_INPUT';        // Donnée déclarative ou non corroborée

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
  const fact = (label: string, value: string | number | null | undefined, provenance: DataProvenance, source: Pick<PassportFact, 'source_document_id' | 'source_page' | 'source_reference' | 'source_url'> = emptySource): PassportFact => ({ label, value: value ?? null, availability: value == null || value === '' ? 'UNKNOWN' : 'AVAILABLE', provenance, ...source });
  const responseCandidate = account?.institution_response;
  const response = responseCandidate?.response_status === 'PUBLISHED'
    && (!responseCandidate.operation_id || responseCandidate.operation_id === matchedOp?.id)
    && (!responseCandidate.ca_id || responseCandidate.ca_id === account?.id) ? responseCandidate : undefined;
  const facts: Record<PassportField, PassportFact> = {
    institution_id: fact('Institution', project.institution_id, 'OFFICIAL_SOURCE', projectSource),
    institution_type: fact('Type d’institution', account?.institution_type || project.institution_type, 'OFFICIAL_SOURCE', account ? caSource : projectSource),
    fiscal_year: fact('Exercice', project.fiscal_year || null, 'OFFICIAL_SOURCE', projectSource),
    object_label: fact('Quoi ?', project.title, 'OFFICIAL_SOURCE', projectSource),
    localisation: fact('Où ?', project.locality_village_neighborhood || matchedOp?.location, 'OFFICIAL_SOURCE', project.locality_village_neighborhood ? projectSource : caSource),
    budget_amount: fact('Budget prévu (FCFA)', project.budget_amount_fcfa, 'OFFICIAL_SOURCE', projectSource),
    procurement_amount: fact('Marché attribué (FCFA)', matchedProc?.award_amount, 'OFFICIAL_SOURCE', marketSource),
    executed_amount: fact('Exécution indiquée au CA (FCFA)', matchedOp?.executed_amount, 'OFFICIAL_SOURCE', caSource),
    contract_reference: fact('Référence du marché / appel d’offres', matchedProc?.contract_number || matchedProc?.tender_number, 'OFFICIAL_SOURCE', marketSource),
    supplier: fact('Attributaire', matchedProc?.contractor, 'OFFICIAL_SOURCE', marketSource),
    source_document_id: fact('Document source relié', caSource.source_document_id, 'OFFICIAL_SOURCE', caSource),
    source_page: fact('Page source', caSource.source_page, 'OFFICIAL_SOURCE', caSource),
    source_reference: fact('Libellé exact de la source', caSource.source_reference || project.source, 'OFFICIAL_SOURCE', account ? caSource : projectSource),
    financial_status: fact('Situation financière', matchedOp && isExactAmount(matchedOp, 'executed_amount') ? (matchedOp.executed_amount === 0 ? 'CA_REPORTED_ZERO' : 'CA_REPORTED_EXECUTION') : null, 'SUIVIBUDGET_CALCULATION', caSource),
    physical_status: fact('Réalisation physique', approvedProofs.length ? 'CITIZEN_OBSERVATION' : project.official_progress_source ? 'OFFICIAL_DECLARATION' : null, approvedProofs.length ? 'CITIZEN_OBSERVATION' : project.official_progress_source ? 'OFFICIAL_SOURCE' : 'UNVERIFIED_INPUT', approvedProofs.length ? { ...emptySource, source_reference: `Constat citoyen ${approvedProofs[0].id}` } : project.official_progress_source ? { ...emptySource, source_reference: project.official_progress_source } : emptySource),
    citizen_evidence_status: fact('Preuves terrain', approvedProofs.length ? 'APPROVED' : 'NOT_FOUND_PUBLICLY', 'CITIZEN_OBSERVATION'),
    institution_response_status: fact('Réponse institutionnelle', response ? 'PUBLISHED' : 'NOT_FOUND_PUBLICLY', 'INSTITUTION_RESPONSE', response ? { ...emptySource, source_reference: response.supporting_document_name || response.response_text, source_url: response.supporting_document_url || null } : emptySource),
    matching_confidence: fact('Confiance du rapprochement', matchResult.confidence, 'SUIVIBUDGET_CALCULATION'),
    matching_method: fact('Méthode de rapprochement', matchResult.matchingMethod, 'SUIVIBUDGET_CALCULATION'),
    verification_status: fact('Vérification documentaire', account?.verification_status || 'NOT_FOUND_PUBLICLY', 'OFFICIAL_SOURCE', caSource),
  };
  for (const value of Object.values(facts)) if (value.value === 'NOT_FOUND_PUBLICLY') value.availability = 'NOT_FOUND_PUBLICLY';

  const stages: PassportStage[] = [];

  // -------------------------------------------------------------------------
  // ÉTAPE 1 : BESOIN & PROGRAMMATION
  // RÈGLE CARDINALE (Section 7) : L'INSCRIPTION BUDGÉTAIRE NE PROUVE PAS LE BESOIN CITOYEN INITIAL
  // -------------------------------------------------------------------------
  const hasProgram = Boolean(project.program_name || project.details);
  const citizenNeedOrigin = project.citizen_need_origin?.trim() || project.initiative_source?.trim();
  const citizenNeedRecorded = Boolean(citizenNeedOrigin);

  stages.push({
    id: 'NEED_PROGRAMMING',
    stepNumber: 1,
    label: 'Besoin & Programmation',
    shortDescription: 'Traçabilité du besoin citoyen d\'origine et inscription au programme d\'investissement',
    status: hasProgram ? 'VERIFIED_OFFICIAL' : 'NOT_FOUND_PUBLICLY',
    statusLabel: hasProgram ? 'Programmation Budgétaire Officielle' : 'Donnée non retrouvée publiquement',
    dataPoints: [
      {
        label: 'Programmation budgétaire',
        value: project.program_name || project.details || 'Ligne d\'investissement inscrite au budget',
        provenance: 'OFFICIAL_SOURCE',
        sourceDetails: project.source || 'Document budgétaire source non relié',
      },
      {
        label: 'Expression du besoin citoyen',
        value: citizenNeedRecorded 
          ? citizenNeedOrigin!
          : 'Non documenté publiquement dans l\'extrait budgétaire',
        provenance: citizenNeedRecorded ? 'CITIZEN_OBSERVATION' : 'SUIVIBUDGET_CALCULATION',
        availability: citizenNeedRecorded ? 'AVAILABLE' : 'NOT_FOUND_PUBLICLY',
        sourceDetails: citizenNeedRecorded
          ? 'Processus participatif / APEC'
          : 'L\'inscription budgétaire ne permet pas à elle seule de retracer la consultation citoyenne d\'origine (Principe 4).',
      },
      {
        label: 'Niveau d\'action',
        value: project.scope_level === 'NATIONAL' ? 'Projet d\'envergure nationale' : 'Projet local / communal',
        provenance: 'OFFICIAL_SOURCE',
      },
      {
        label: 'Secteur public',
        value: project.category || 'Général',
        provenance: 'OFFICIAL_SOURCE',
      },
    ],
  });

  // -------------------------------------------------------------------------
  // ÉTAPE 2 : BUDGET VOTÉ
  // -------------------------------------------------------------------------
  stages.push({
    id: 'BUDGET_VOTED',
    stepNumber: 2,
    label: 'Budget Voté (BP)',
    shortDescription: 'Crédits votés par l\'autorité délibérante (Loi de Finances ou Conseil Municipal)',
    status: project.budget_amount_fcfa > 0 ? 'VERIFIED_OFFICIAL' : 'PENDING_DOCUMENTATION',
    statusLabel: project.budget_amount_fcfa > 0 ? 'Voté au Budget' : 'Montant non renseigné',
    dataPoints: [
      {
        label: 'Exercice fiscal',
        value: String(project.fiscal_year || 2026),
        provenance: 'OFFICIAL_SOURCE',
      },
      {
        label: 'Montant inscrit',
        value: project.budget_amount_fcfa > 0 ? formatFCFA(project.budget_amount_fcfa) : 'Non renseigné',
        provenance: 'OFFICIAL_SOURCE',
        sourceDetails: project.source || 'Document budgétaire source non relié',
      },
      {
        label: 'Nature de la dépense',
        value: project.nature_expense || 'Investissements',
        provenance: 'OFFICIAL_SOURCE',
      },
      {
        label: 'Maîtrise d\'Ouvrage',
        value: project.master_builder || project.commune_name || project.region_name || 'Collectivité / Ministère',
        provenance: 'OFFICIAL_SOURCE',
      },
    ],
  });

  // -------------------------------------------------------------------------
  // ÉTAPE 3 : COMMANDE PUBLIQUE & MARCHÉ (DGMP)
  // RÈGLE : LA SIMPLE PRÉSENCE D'UN TITULAIRE DANS BUDGETPROJECT NE PROUVE PAS UN MARCHÉ DGMP
  // -------------------------------------------------------------------------
  if (matchedProc) {
    const isProbable = matchResult.confidence === 'PROBABLE';
    stages.push({
      id: 'PROCUREMENT_DGMP',
      stepNumber: 3,
      label: 'Commande Publique & Attribution (DGMP)',
      shortDescription: 'Attribution du marché public rapprochée des avis officiels de la DGMP',
      status: isProbable ? 'PROBABLE_MATCH' : 'VERIFIED_OFFICIAL',
      statusLabel: isProbable ? 'Marché Officiel Probable' : 'Marché Officiel Attribué',
      alertMessage: matchResult.temporalJustification,
      dataPoints: [
        {
          label: 'N° Appel d\'Offres',
          value: matchedProc.tender_number || 'Non renseigné',
          provenance: 'OFFICIAL_SOURCE',
          sourceDetails: matchedProc.source,
          sourceUrl: matchedProc.source_url,
        },
        {
          label: 'Objet officiel du marché',
          value: matchedProc.procurement_object,
          provenance: 'OFFICIAL_SOURCE',
        },
        {
          label: 'Entreprise adjudicataire',
          value: matchedProc.contractor,
          provenance: 'OFFICIAL_SOURCE',
        },
        {
          label: 'Montant adjugé',
          value: formatRecordAmount(matchedProc, 'award_amount'),
          provenance: 'OFFICIAL_SOURCE',
        },
        {
          label: 'Date d\'attribution',
          value: matchedProc.award_date || '2024',
          provenance: 'OFFICIAL_SOURCE',
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
          sourceDetails: 'Mention administrative déclarative non corroborée par un avis d\'attribution DGMP vérifié.',
        },
        {
          label: 'Avis d\'attribution DGMP',
          value: 'En attente de rapprochement avec le répertoire officiel des marchés',
          provenance: 'SUIVIBUDGET_CALCULATION',
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
          availability: 'NOT_FOUND_PUBLICLY',
          sourceDetails: 'Avis DGMP consultés : l\'absence de résultat ne prouve pas l\'absence d\'appel d\'offres (Principe 9).',
        },
      ],
    });
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 4 : EXÉCUTION BUDGÉTAIRE (COMPTE ADMINISTRATIF)
  // RÈGLE : STRICTEMENT NEUTRE, AUCUNE INTERPRÉTATION CAUSALE ("REPORT PROBABLE" INTERDIT)
  // -------------------------------------------------------------------------
  if (matchedOp) {
    const isZeroExecuted = isExactAmount(matchedOp, 'executed_amount') && matchedOp.executed_amount === 0;
    const isUncertainExecuted = !isExactAmount(matchedOp, 'executed_amount');
    const isProbable = matchResult.confidence === 'PROBABLE';

    // Formulation factuelle et neutre obligatoire (Section 5.3)
    const alertMessage = isZeroExecuted 
      ? 'Le Compte Administratif consulté indique 0 FCFA exécuté/ordonnancé pour cette opération sur l’exercice observé. La cause de cet écart n’est pas établie par les sources actuellement reliées.' 
      : matchResult.temporalJustification;

    stages.push({
      id: 'BUDGET_EXECUTION_CA',
      stepNumber: 4,
      label: 'Exécution Budgétaire (Compte Administratif)',
      shortDescription: 'Crédits mandatés et ordonnancés inscrits au Compte Administratif audité',
      status: isUncertainExecuted ? 'PENDING_DOCUMENTATION' : isZeroExecuted ? 'ANOMALY_DETECTED' : (isProbable ? 'PROBABLE_MATCH' : 'VERIFIED_OFFICIAL'),
      statusLabel: isUncertainExecuted ? 'Montant d’exécution qualifié ou à confirmer' : isZeroExecuted ? 'Exécution financière à 0 FCFA' : (isProbable ? 'Opération CA Probable' : 'Mandaté au Compte Administratif'),
      alertMessage,
      dataPoints: [
        {
          label: 'Exercice CA',
          value: String(matchedOp.fiscal_year),
          provenance: 'OFFICIAL_SOURCE',
        },
        {
          label: 'Ligne opération',
          value: matchedOp.operation_reference || 'Ligne d\'investissement',
          provenance: 'OFFICIAL_SOURCE',
        },
        {
          label: 'Crédits prévus au CA',
          value: formatRecordAmount(matchedOp, 'planned_amount'),
          provenance: 'OFFICIAL_SOURCE',
        },
        {
          label: 'Montant effectivement ordonnancé',
          value: formatRecordAmount(matchedOp, 'executed_amount'),
          provenance: 'OFFICIAL_SOURCE',
          sourceDetails: `Page ${matchedOp.source_page || 'CA'} du Compte Administratif officiel`,
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
          availability: 'NOT_FOUND_PUBLICLY',
          sourceDetails: 'La publication officielle du CA relève de la collectivité locale.',
        },
      ],
    });
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 5 : RÉALISATION PHYSIQUE & PREUVES TERRAIN
  // RÈGLE CARDINALE : UNE DÉPENSE FINANCIÈRE NE PROUVE PAS UNE RÉALISATION PHYSIQUE (Principe 7)
  // OBSERVATION CITOYENNE != VÉRITÉ ADMINISTRATIVE
  // -------------------------------------------------------------------------
  const hasOfficialRate = Boolean(project.official_progress_source) && project.progress_percentage > 0;
  const hasFieldProofs = approvedProofs.length > 0;

  let physicalStatus: PassportStageStatus = 'PENDING_DOCUMENTATION';
  let physicalLabel = 'En attente de constat terrain';

  if (hasFieldProofs) {
    physicalStatus = 'CITIZEN_DOCUMENTED';
    physicalLabel = `${approvedProofs.length} observation(s) citoyenne(s) validée(s)`;
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
        provenance: 'INSTITUTION_RESPONSE',
        sourceDetails: project.official_progress_source || project.master_builder || 'Déclaration administrative non corroborée par constat indépendant (Principe 7).',
      },
      {
        label: 'Constats citoyens vérifiés',
        value: hasFieldProofs ? `${approvedProofs.length} constat(s) photo/vidéo approuvé(s)` : '0 constat pour l\'instant',
        provenance: 'CITIZEN_OBSERVATION',
      },
      {
        label: 'Dernier statut terrain observé',
        value: hasFieldProofs 
          ? (approvedProofs[0].citizen_status_claim === 'COMPLETED' ? 'Terminé sur le terrain' : approvedProofs[0].citizen_status_claim === 'IN_PROGRESS' ? 'En cours d\'exécution' : 'Non démarré')
          : 'Non documenté sur place',
        provenance: 'CITIZEN_OBSERVATION',
      },
    ],
  });

  // -------------------------------------------------------------------------
  // ÉTAPE 6 : REDDITION DE COMPTES & AUDIT
  // -------------------------------------------------------------------------
  const isAuditVerified = matchedOp !== undefined;
  stages.push({
    id: 'AUDIT_ACCOUNTABILITY',
    stepNumber: 6,
    label: 'Reddition de Comptes & Droit de Réponse',
    shortDescription: 'Audit citoyen contradictoire, traçabilité documentaire et droit de réponse institutionnel',
    status: isAuditVerified ? 'VERIFIED_OFFICIAL' : 'PENDING_DOCUMENTATION',
    statusLabel: isAuditVerified ? 'Données Rapprochées & Vérifiées' : 'Cycle Ouvert',
    dataPoints: [
      {
        label: 'Contrôle contradictoire',
        value: isAuditVerified ? 'Rapproché avec CA officiel et/ou DGMP' : 'En attente de documents complémentaires',
        provenance: 'SUIVIBUDGET_CALCULATION',
      },
      {
        label: 'Droit d\'accès à l\'information (CAIDP)',
        value: 'Modèle de requête légale disponible sur la plateforme',
        provenance: 'SUIVIBUDGET_CALCULATION',
      },
      {
        label: 'Droit de réponse institutionnel',
        value: 'Ouvert à la collectivité et aux services techniques',
        provenance: 'INSTITUTION_RESPONSE',
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
