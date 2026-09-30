// =========================================================================
// SUIVIBUDGET CÔTE D'IVOIRE — PROJECT ACCOUNTABILITY PASSPORT
// Traçabilité intégrale : BESOIN → BUDGET → MARCHÉ → CA → PREUVE → REDDITION
// Principes non-négociables : Provenance, Financier != Physique, Pas de faux
// =========================================================================

import { BudgetProject, CitizenProof } from '../types';
import { CAInvestmentOperation, ProcurementMatch } from '../types/administrativeAccount';
import { ADMINISTRATIVE_ACCOUNTS_DATA } from '../data/administrativeAccountsData';
import { matchesSmartSearch, normalizeSearchText, extractWords } from './searchHelpers';
import { formatFCFA } from './formatters';

export type PassportStageStatus = 
  | 'VERIFIED_OFFICIAL'     // Documenté avec source officielle vérifiable
  | 'CITIZEN_DOCUMENTED'    // Documenté par observations citoyennes validées
  | 'PENDING_DOCUMENTATION' // En attente de document ou constat
  | 'ANOMALY_DETECTED'      // Écart ou anomalie identifiée (ex: payé mais 0 physique)
  | 'NOT_FOUND_PUBLICLY';   // Non retrouvé dans les sources publiques actuelles

export interface PassportStage {
  id: 'NEED_PROGRAMMING' | 'BUDGET_VOTED' | 'PROCUREMENT_DGMP' | 'BUDGET_EXECUTION_CA' | 'PHYSICAL_REALIZATION' | 'AUDIT_ACCOUNTABILITY';
  stepNumber: number;
  label: string;
  shortDescription: string;
  status: PassportStageStatus;
  statusLabel: string;
  dataPoints: {
    label: string;
    value: string;
    provenance: 'OFFICIAL_SOURCE' | 'SUIVIBUDGET_CALCULATION' | 'CITIZEN_OBSERVATION' | 'INSTITUTION_RESPONSE';
    sourceDetails?: string;
    sourceUrl?: string;
  }[];
  alertMessage?: string;
}

export interface ProjectAccountabilityPassportData {
  projectId: string;
  projectTitle: string;
  institutionName: string;
  fiscalYear: number;
  stages: PassportStage[];
  overallAccountabilityScorePct: number;
  hasMatchedCaOperation: boolean;
  hasMatchedDgmpTender: boolean;
  hasCitizenFieldProofs: boolean;
  matchedOperation?: CAInvestmentOperation;
  matchedProcurement?: ProcurementMatch;
}

/**
 * Recherche une opération d'investissement CA correspondant à un projet
 */
export function findMatchingCaOperation(project: BudgetProject): CAInvestmentOperation | undefined {
  if (!project) return undefined;

  const projectCommuneNorm = normalizeSearchText(project.commune_name || '');
  const projectTitleNorm = normalizeSearchText(project.title || '');

  for (const ca of ADMINISTRATIVE_ACCOUNTS_DATA) {
    const caInstNorm = normalizeSearchText(ca.institution_name);
    const matchesCommune = projectCommuneNorm && (
      caInstNorm.includes(projectCommuneNorm) || projectCommuneNorm.includes(caInstNorm)
    );

    if (matchesCommune || ca.institution_id === project.institution_id) {
      for (const op of ca.operations || []) {
        if (op.linked_project_id === project.id) return op;

        const opTitleNorm = normalizeSearchText(op.title);
        // Smart matching on meaningful keywords
        if (matchesSmartSearch([op.title], project.title) || 
            matchesSmartSearch([project.title], op.title) || 
            projectTitleNorm.includes(opTitleNorm) || 
            opTitleNorm.includes(projectTitleNorm)) {
          return op;
        }

        // Distinctive keyword overlap heuristic within same commune
        const stopwords = new Set(['construction', 'rehabilitation', 'amenagement', 'batiment', 'salles', 'classe', 'projet', 'travaux', 'commune']);
        const opWords = extractWords(op.title).filter(w => w.length >= 4 && !stopwords.has(w));
        const projWords = extractWords(project.title).filter(w => w.length >= 4 && !stopwords.has(w));
        const commonWords = opWords.filter(w => projWords.includes(w));
        if (commonWords.length >= 2) {
          return op;
        }

        // Sector + location heuristic for Tiassalé pilot
        if (project.locality_village_neighborhood && op.title.toLowerCase().includes(project.locality_village_neighborhood.toLowerCase())) {
          return op;
        }
      }
    }
  }

  return undefined;
}

/**
 * Recherche le marché DGMP correspondant via l'opération CA rapprochée
 */
export function findMatchingDgmpProcurement(project: BudgetProject): ProcurementMatch | undefined {
  const matchedOp = findMatchingCaOperation(project);
  return matchedOp?.procurement_match;
}

/**
 * Construit le Passeport de Redevabilité complet pour un projet
 */
export function generateProjectPassport(
  project: BudgetProject, 
  citizenProofs: CitizenProof[] = []
): ProjectAccountabilityPassportData {
  const matchedOp = findMatchingCaOperation(project);
  const matchedProc = matchedOp?.procurement_match;
  const approvedProofs = citizenProofs.filter(p => p.verification_status === 'APPROVED');

  const stages: PassportStage[] = [];

  // -------------------------------------------------------------------------
  // ÉTAPE 1 : BESOIN & PROGRAMMATION
  // -------------------------------------------------------------------------
  const hasProgram = Boolean(project.program_name || project.details);
  stages.push({
    id: 'NEED_PROGRAMMING',
    stepNumber: 1,
    label: 'Besoin & Programmation',
    shortDescription: 'Inscription au programme d\'investissement et définition du besoin',
    status: hasProgram ? 'VERIFIED_OFFICIAL' : 'NOT_FOUND_PUBLICLY',
    statusLabel: hasProgram ? 'Inscrit au Programme' : 'Donnée non retrouvée publiquement',
    dataPoints: [
      {
        label: 'Programme / Spécification',
        value: project.program_name || project.details || 'Non spécifié dans l\'extrait budgétaire',
        provenance: 'OFFICIAL_SOURCE',
        sourceDetails: project.source || 'Loi de Finances / Document officiel',
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
        sourceDetails: project.source || 'Loi de Finances (DGBF)',
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
  // -------------------------------------------------------------------------
  if (matchedProc) {
    stages.push({
      id: 'PROCUREMENT_DGMP',
      stepNumber: 3,
      label: 'Commande Publique & Attribution (DGMP)',
      shortDescription: 'Attribution du marché public vérifiée sur les publications officielles DGMP',
      status: 'VERIFIED_OFFICIAL',
      statusLabel: 'Marché Officiel Attribué',
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
          value: formatFCFA(matchedProc.award_amount),
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
    stages.push({
      id: 'PROCUREMENT_DGMP',
      stepNumber: 3,
      label: 'Commande Publique & Entreprise',
      shortDescription: 'Entreprise titulaire identifiée, en attente de référence dossier DGMP',
      status: 'VERIFIED_OFFICIAL',
      statusLabel: 'Titulaire Renseigné',
      dataPoints: [
        {
          label: 'Entreprise titulaire',
          value: project.contractor_name,
          provenance: 'OFFICIAL_SOURCE',
        },
        {
          label: 'Référence DGMP',
          value: 'En attente de rapprochement automatique',
          provenance: 'SUIVIBUDGET_CALCULATION',
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
          provenance: 'NOT_FOUND_PUBLICLY' as any,
          sourceDetails: 'Avis DGMP consultés : absence d\'attribution ne prouve pas l\'absence d\'appel d\'offres.',
        },
      ],
    });
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 4 : EXÉCUTION BUDGÉTAIRE (COMPTE ADMINISTRATIF)
  // -------------------------------------------------------------------------
  if (matchedOp) {
    const isZeroExecuted = matchedOp.executed_amount === 0;
    stages.push({
      id: 'BUDGET_EXECUTION_CA',
      stepNumber: 4,
      label: 'Exécution Budgétaire (Compte Administratif)',
      shortDescription: 'Crédits mandatés et ordonnancés inscrits au Compte Administratif audité',
      status: isZeroExecuted ? 'ANOMALY_DETECTED' : 'VERIFIED_OFFICIAL',
      statusLabel: isZeroExecuted ? 'Exécution financière à 0 FCFA' : 'Mandaté au Compte Administratif',
      alertMessage: isZeroExecuted ? 'Attention : le marché a été attribué mais le compte administratif affiche 0 FCFA ordonnancé pour cet exercice (report probable).' : undefined,
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
          value: formatFCFA(matchedOp.planned_amount),
          provenance: 'OFFICIAL_SOURCE',
        },
        {
          label: 'Montant effectivement ordonnancé',
          value: formatFCFA(matchedOp.executed_amount),
          provenance: 'OFFICIAL_SOURCE',
          sourceDetails: `Page ${matchedOp.source_page || 'CA'} du Compte Administratif officiel`,
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
          provenance: 'NOT_FOUND_PUBLICLY' as any,
          sourceDetails: 'La publication officielle du CA relève de la collectivité locale.',
        },
      ],
    });
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 5 : RÉALISATION PHYSIQUE & PREUVES TERRAIN
  // RÈGLE CARDINALE : UNE DÉPENSE FINANCIÈRE NE PROUVE PAS UNE RÉALISATION PHYSIQUE
  // -------------------------------------------------------------------------
  const hasOfficialRate = project.progress_percentage > 0;
  const hasFieldProofs = approvedProofs.length > 0;

  let physicalStatus: PassportStageStatus = 'PENDING_DOCUMENTATION';
  let physicalLabel = 'En attente de constat terrain';

  if (hasFieldProofs) {
    physicalStatus = 'CITIZEN_DOCUMENTED';
    physicalLabel = `${approvedProofs.length} observation(s) citoyenne(s) validée(s)`;
  } else if (hasOfficialRate) {
    physicalStatus = 'VERIFIED_OFFICIAL';
    physicalLabel = `Taux officiel déclaré : ${project.progress_percentage}%`;
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
        label: 'Taux officiel déclaré',
        value: hasOfficialRate ? `${project.progress_percentage}%` : 'Non communiqué par la maîtrise d\'ouvrage',
        provenance: 'OFFICIAL_SOURCE',
        sourceDetails: project.official_progress_source || project.master_builder || 'Déclaration administrative',
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

  // Score de redevabilité global (sur 100)
  const completedStagesCount = stages.filter(s => s.status === 'VERIFIED_OFFICIAL' || s.status === 'CITIZEN_DOCUMENTED').length;
  const overallAccountabilityScorePct = Math.round((completedStagesCount / stages.length) * 100);

  return {
    projectId: project.id,
    projectTitle: project.title,
    institutionName: project.commune_name || project.region_name || project.ministry_name || 'Collectivité',
    fiscalYear: project.fiscal_year || 2026,
    stages,
    overallAccountabilityScorePct,
    hasMatchedCaOperation: Boolean(matchedOp),
    hasMatchedDgmpTender: Boolean(matchedProc),
    hasCitizenFieldProofs: approvedProofs.length > 0,
    matchedOperation: matchedOp,
    matchedProcurement: matchedProc,
  };
}
