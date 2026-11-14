import { BudgetProject } from '../types';

/**
 * Taxonomie explicite à 9 catégories demandée pour l'audit des lignes brutes
 * du catalogue budgétaire (Section 3 — fiabilisation documentaire).
 */
export type BudgetCatalogCategory =
  | 'PROJECT_PHYSICAL'
  | 'EQUIPMENT_ACQUISITION'
  | 'STUDY_TECHNICAL_ASSISTANCE'
  | 'FUNCTIONING'
  | 'TRANSFER_SUBSIDY'
  | 'PERSONNEL'
  | 'ADMINISTRATIVE_EXPENSE'
  | 'OTHER'
  | 'UNDETERMINED';

/**
 * Sous-ensemble documentaire d'origine de la ligne dans le catalogue.
 * Empêche toute fusion silencieuse entre LFI central, transferts Programme 2204040,
 * sous-opérations locales LFI, portails municipaux externes et pluriannuel antérieur.
 */
export type CatalogProvenancePool =
  | 'STATE_LFI_2026'
  | 'LOCAL_LFI_2026_PROG_2204040_OVERLAP'
  | 'LOCAL_CSV_2026'
  | 'LOCAL_PORTAL_BOUAKE_2026'
  | 'STATE_MULTIYEAR_PRE_2026'
  | 'OTHER';

export interface CatalogLineClassification {
  category: BudgetCatalogCategory;
  reason: string;
  provenancePool: CatalogProvenancePool;
  classificationMethod: 'AUTOMATED_KEYWORD_AND_SCOPE_RULES';
  verificationStatus: 'AUTOMATED_CLASSIFICATION';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  provenanceLabel: string;
  isPhysicalProject: boolean;
  isNonPhysicalExpense: boolean;
  isCrossCatalogOverlap: boolean;
  isExactDuplicate: boolean;
  duplicateOfId: string | null;
}

export interface CatalogPoolBreakdown {
  pool: CatalogProvenancePool;
  label: string;
  rawRows: number;
  physicalCount: number;
  physicalAmountFcfa: number;
  equipmentCount: number;
  equipmentAmountFcfa: number;
  nonPhysicalCount: number;
  nonPhysicalAmountFcfa: number;
  undeterminedCount: number;
  undeterminedAmountFcfa: number;
  exactDuplicatesCount: number;
  exactDuplicatesAmountFcfa: number;
  crossOverlapCount: number;
  crossOverlapAmountFcfa: number;
}

export interface CatalogReconciliationSummary {
  totalRawLines: number;
  totalRawAmountFcfa: number;
  physicalProjectsCount: number;
  physicalProjectsAmountFcfa: number;
  equipmentAcquisitionsCount: number;
  equipmentAcquisitionsAmountFcfa: number;
  nonPhysicalExpensesCount: number;
  nonPhysicalExpensesAmountFcfa: number;
  undeterminedLinesCount: number;
  undeterminedLinesAmountFcfa: number;
  exactDuplicatesCount: number;
  exactDuplicatesAmountFcfa: number;
  crossCatalogOverlapCount: number;
  crossCatalogOverlapAmountFcfa: number;
  categoryCounts: Record<BudgetCatalogCategory, { count: number; amountFcfa: number }>;
  byProvenancePool: Record<CatalogProvenancePool, CatalogPoolBreakdown>;
  physicalClassificationLabel: string;
  isCertified: false;
}

function normalizeForClassification(value: string | undefined | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveProvenancePool(project: BudgetProject): CatalogProvenancePool {
  const programNorm = normalizeForClassification(project.program_name);
  const sourceNorm = normalizeForClassification(project.source);
  const scope = project.scope_level === 'LOCAL' ? 'LOCAL' : 'NATIONAL';

  if (
    scope === 'NATIONAL' &&
    programNorm === 'suivi des activites des collectivites territoriales'
  ) {
    return 'LOCAL_LFI_2026_PROG_2204040_OVERLAP';
  }

  if (sourceNorm.includes('mairiedebouake.ci')) {
    return 'LOCAL_PORTAL_BOUAKE_2026';
  }

  if (project.fiscal_year && project.fiscal_year < 2026 && scope === 'NATIONAL') {
    return 'STATE_MULTIYEAR_PRE_2026';
  }

  if (scope === 'LOCAL') {
    return 'LOCAL_CSV_2026';
  }

  if (scope === 'NATIONAL') {
    return 'STATE_LFI_2026';
  }

  return 'OTHER';
}

const POOL_LABELS: Record<CatalogProvenancePool, string> = {
  STATE_LFI_2026: 'État central (LFI 2026 hors Programme 2204040)',
  LOCAL_LFI_2026_PROG_2204040_OVERLAP:
    'Doublon LFI Programme 2204040 (transferts collectivités ventilés dans le catalogue local)',
  LOCAL_CSV_2026: 'Collectivités territoriales (extraction CSV LFI 2026)',
  LOCAL_PORTAL_BOUAKE_2026: 'Portail municipal externe Bouaké (mairiedebouake.ci, hors LFI)',
  STATE_MULTIYEAR_PRE_2026: 'Grand marché pluriannuel antérieur à 2026 (ex. 2021)',
  OTHER: 'Autre source documentaire',
};

const NON_PHYSICAL_CATEGORIES: ReadonlySet<BudgetCatalogCategory> = new Set([
  'STUDY_TECHNICAL_ASSISTANCE',
  'FUNCTIONING',
  'TRANSFER_SUBSIDY',
  'PERSONNEL',
  'ADMINISTRATIVE_EXPENSE',
  'OTHER',
]);

/**
 * Classifie déterministement une ligne brute sans raccourci par préfixe d'identifiant
 * (`proj-bouake-`, `proj-infra-`) et sans assimiler un mot-clé isolé (« travaux », « équipement »)
 * à un chantier physique certifié.
 */
function classifyBudgetCatalogLineCore(
  project: BudgetProject
): Omit<
  CatalogLineClassification,
  'classificationMethod' | 'verificationStatus' | 'confidence' | 'provenanceLabel'
> {
  const title = normalizeForClassification(project.title);
  const provenancePool = resolveProvenancePool(project);

  // 1. Chevauchement inter-catalogues : lignes agrégées LFI Programme 2204040
  if (provenancePool === 'LOCAL_LFI_2026_PROG_2204040_OVERLAP') {
    return {
      category: 'TRANSFER_SUBSIDY',
      reason:
        'Transfert État -> Collectivités (LFI Programme 2204040) déjà ventilé dans le catalogue local CSV',
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: true,
      isCrossCatalogOverlap: true,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 2. Charges ou dotations de personnel
  if (
    /\b(salaire|salarial|traitement salarial|indemnite du personnel|prime|emolument|gratification|vacation|remuneration|frais de personnel|charges de personnel|charges sociales|assurance du personnel|cotisation sociale|habillement, de couchage|hcca)\b/.test(
      title
    )
  ) {
    return {
      category: 'PERSONNEL',
      reason: 'Charge de personnel, indemnité ou cotisation sociale',
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: true,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 3. Transferts, subventions, indemnisations, PAR, expropriations, filets sociaux
  if (
    /\b(transfert|subvention|indemnisation|dedommagement|expropriation|purge des droits|purge de droits|plan d'action de reinstallation|reinstallation|par\b|filets sociaux|soutien aux indigents|bourse|fonds d'appui|fonds de soutien|fonds national|dotation globale|apporter un appui aux projets|couverture.*gavi|contribution financi)\b/.test(
      title
    ) ||
    /^faire le transfert\b/.test(title)
  ) {
    return {
      category: 'TRANSFER_SUBSIDY',
      reason: 'Transfert financier, subvention, indemnisation ou réinstallation (non physique)',
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: true,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 4. Études, recherche, inventaires, cartographie, schémas directeurs
  const hasExplicitCoreWork =
    /\b(construire|construction|contruction|rehabiliter|rehabilitation|bitumage|bitumer|forage|chateau d'eau|reprofilage|electrification|eclairage public|canalisation|adduction|logements sociaux)\b/.test(
      title
    );

  if (
    /\b(etude|etudes|recherche et le developpement|prospection|inventaire|cartographie|cadastre|schema directeur|plan directeur|plan strategique|psdl|audit organisationnel|elaboration d'un plan|elaboration du plan|fonds d'etudes|faisabilite)\b/.test(
      title
    ) &&
    !hasExplicitCoreWork
  ) {
    return {
      category: 'STUDY_TECHNICAL_ASSISTANCE',
      reason: 'Étude, recherche, inventaire, schéma directeur ou assistance technique',
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: true,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 5. Fonctionnement, carburant, entretien courant, missions, séminaires, coordination
  if (
    /\b(fonctionnement|carburant|ravitailler|consommable|frais de mission|voyage|billet|hebergement|maintenance et l'entretien|entretien courant|suivre l'execution|coordonner|pilotage|sensibilisation|atelier|seminaire|celebration|campagne|formation continue|formation des|inspection et audit|renforcement des capacites|assurer la gestion|assurer le fonctionnement)\b/.test(
      title
    ) &&
    !hasExplicitCoreWork &&
    !/\b(route|pont\b|voirie|autoroute)\b/.test(title)
  ) {
    return {
      category: 'FUNCTIONING',
      reason: 'Dépense de fonctionnement, maintenance courante, formation ou coordination',
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: true,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 6. Dépenses administratives, numériques, financières ou acquisitions foncières sans travaux
  if (
    /\b(digitalisation|plate-forme numerique|plateforme numerique|e-parlement|systeme d'information|identifiant unique|frais financiers|remboursement de dette|interets de la dette|contentieux|imprimerie|securisation fonciere)\b/.test(
      title
    ) ||
    (/\b(acquisition du siege|acquisition d'un terrain|acquisition de parcelle|lotissement)\b/.test(
      title
    ) &&
      !/\b(construction|rehabilitation|viabilisation|amenagement)\b/.test(title))
  ) {
    return {
      category: 'ADMINISTRATIVE_EXPENSE',
      reason: 'Dépense administrative, numérique, financière ou foncière sans chantier physique',
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: true,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 7. Acquisitions pures de matériel, véhicules, mobilier ou équipements (sans travaux associés)
  const isLeadingEquipmentPurchase =
    /^(acquerir|acquisition|achat|fourniture|dotation en|equipement|equiper)\b/.test(title) &&
    !/\b(et construction|et de construction|construction et|rehabiliter|rehabilitation|forage|chateau d'eau|bitumage|voirie|pont\b)\b/.test(
      title
    );

  if (isLeadingEquipmentPurchase) {
    return {
      category: 'EQUIPMENT_ACQUISITION',
      reason: "Acquisition ou dotation de matériel, véhicules, mobilier ou équipements sans génie civil",
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: false,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 8. Garde-fou contre les intitulés de programmes multi-composantes ambigus
  if (
    /^(programme|projet d'appui|appui|plan municipal|mettre en oeuvre|renforcer la lutte|promouvoir|amelioration|developpement des chaines|competitivite|nutrition)\b/.test(
      title
    ) &&
    !/\b(construire|construction|contruction|rehabiliter|rehabilitation|bitumage|autoroute|train urbain|brt\b|dorsale|centrale solaire|forage|chateau d'eau|logements sociaux|salles de classe|ecoles|hopital|chu\b|route|pont\b|voirie|assainissement|electrification|colleges et lycees)\b/.test(
      title
    )
  ) {
    return {
      category: 'UNDETERMINED',
      reason: 'Programme ou plan multi-composantes générique sans chantier physique isolable',
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: false,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 9. Projets et opérations physiques répertoriés (classification automatisée)
  const hasConcretePhysicalScope =
    /\b(construire|construction|contruction|rehabiliter|rehabilitation|reprofilage|bitumage|bitumer|ouverture de .*voies|ouverture de .*piste|amenagement|amenager|viabilisation|pavage|canalisation|adduction|forage|chateau d'eau|electrification|eclairage public|extension du reseau electrique|pose de ralentisseurs|pose de .*poteaux|installation de .*feux|installation de .*poteaux|cloture|latrine|dalot|pont\b|autoroute|voirie|assainissement|drainage|centrale solaire|ligne .*kv|dorsale .*kv|salles de classe|ecole primaire|ecole maternelle|college|lycee|universite|centre de sante|maternite|dispensaire|hopital|chu\b|chr\b|marche\b|abattoir|logements sociaux|retenue d'eau|barrage|magasin de stockage|stade|abris-bus|train urbain|brt\b|complexe sportif)\b/.test(
      title
    );

  if (hasConcretePhysicalScope) {
    return {
      category: 'PROJECT_PHYSICAL',
      reason: 'Opération ou infrastructure physique identifiée par classification automatisée',
      provenancePool,
      isPhysicalProject: true,
      isNonPhysicalExpense: false,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 10. Équipements mentionnés ailleurs dans le titre sans travaux
  if (
    /\b(equipement|equiper|materiel|vehicule|mobilier|table-banc|tables-bancs|groupe electrogene|scanner|camera|ambulance|tricycle|chargeuse|baches)\b/.test(
      title
    )
  ) {
    return {
      category: 'EQUIPMENT_ACQUISITION',
      reason: "Acquisition ou dotation d'équipement/matériel identifiée dans l'intitulé",
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: false,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 11. Autres opérations identifiées (salubrité, reboisement, environnement)
  if (/\b(planting|reboisement|foret|arbre|environn|gestion des dechets|salubrite)\b/.test(title)) {
    return {
      category: 'OTHER',
      reason: 'Autre opération (environnement, planting, salubrité ou reboisement)',
      provenancePool,
      isPhysicalProject: false,
      isNonPhysicalExpense: true,
      isCrossCatalogOverlap: false,
      isExactDuplicate: false,
      duplicateOfId: null,
    };
  }

  // 12. Ligne non déterminée par défaut (ne jamais forcer en projet physique)
  return {
    category: 'UNDETERMINED',
    reason: "Intitulé insuffisant pour certifier la nature physique de la ligne",
    provenancePool,
    isPhysicalProject: false,
    isNonPhysicalExpense: false,
    isCrossCatalogOverlap: false,
    isExactDuplicate: false,
    duplicateOfId: null,
  };
}

export function classifyBudgetCatalogLine(project: BudgetProject): CatalogLineClassification {
  const base = classifyBudgetCatalogLineCore(project);
  const confidence: CatalogLineClassification['confidence'] =
    base.category === 'UNDETERMINED'
      ? 'LOW'
      : base.isCrossCatalogOverlap ||
          base.category === 'PERSONNEL' ||
          base.category === 'TRANSFER_SUBSIDY'
        ? 'HIGH'
        : 'MEDIUM';
  return {
    ...base,
    classificationMethod: 'AUTOMATED_KEYWORD_AND_SCOPE_RULES',
    verificationStatus: 'AUTOMATED_CLASSIFICATION',
    confidence,
    provenanceLabel: POOL_LABELS[base.provenancePool],
  };
}

/**
 * Classifie et déduplique un ensemble complet de lignes brutes (ex: 7 169 lignes)
 * tout en conservant le décompte exact des doublons intra-catalogue et inter-catalogues.
 */
export function classifyAndDeduplicateCatalog(
  projects: readonly BudgetProject[]
): Array<{ project: BudgetProject; classification: CatalogLineClassification }> {
  const seenExactKeys = new Map<string, string>();
  const results: Array<{ project: BudgetProject; classification: CatalogLineClassification }> = [];

  for (const project of projects) {
    const base = classifyBudgetCatalogLine(project);
    const dedupKey = `${base.provenancePool}|${project.fiscal_year ?? ''}|${normalizeForClassification(
      project.commune_name || project.institution_name
    )}|${normalizeForClassification(project.title)}|${project.budget_amount_fcfa ?? 'NULL'}`;

    const existingId = seenExactKeys.get(dedupKey);
    if (existingId && existingId !== project.id) {
      results.push({
        project,
        classification: {
          ...base,
          isExactDuplicate: true,
          duplicateOfId: existingId,
        },
      });
    } else {
      seenExactKeys.set(dedupKey, project.id);
      results.push({ project, classification: base });
    }
  }

  return results;
}

function createEmptyPoolBreakdown(pool: CatalogProvenancePool): CatalogPoolBreakdown {
  return {
    pool,
    label: POOL_LABELS[pool],
    rawRows: 0,
    physicalCount: 0,
    physicalAmountFcfa: 0,
    equipmentCount: 0,
    equipmentAmountFcfa: 0,
    nonPhysicalCount: 0,
    nonPhysicalAmountFcfa: 0,
    undeterminedCount: 0,
    undeterminedAmountFcfa: 0,
    exactDuplicatesCount: 0,
    exactDuplicatesAmountFcfa: 0,
    crossOverlapCount: 0,
    crossOverlapAmountFcfa: 0,
  };
}

/**
 * Produit la table de réconciliation complète du catalogue brut (Section 3).
 * Garantit que les montants des doublons et des chevauchements LFI 2204040 ne
 * sont pas comptés en double dans les totaux physiques.
 */
export function reconcileBudgetCatalog(
  projects: readonly BudgetProject[]
): CatalogReconciliationSummary {
  const classified = classifyAndDeduplicateCatalog(projects);

  const categoryCounts: Record<BudgetCatalogCategory, { count: number; amountFcfa: number }> = {
    PROJECT_PHYSICAL: { count: 0, amountFcfa: 0 },
    EQUIPMENT_ACQUISITION: { count: 0, amountFcfa: 0 },
    STUDY_TECHNICAL_ASSISTANCE: { count: 0, amountFcfa: 0 },
    FUNCTIONING: { count: 0, amountFcfa: 0 },
    TRANSFER_SUBSIDY: { count: 0, amountFcfa: 0 },
    PERSONNEL: { count: 0, amountFcfa: 0 },
    ADMINISTRATIVE_EXPENSE: { count: 0, amountFcfa: 0 },
    OTHER: { count: 0, amountFcfa: 0 },
    UNDETERMINED: { count: 0, amountFcfa: 0 },
  };

  const byProvenancePool: Record<CatalogProvenancePool, CatalogPoolBreakdown> = {
    STATE_LFI_2026: createEmptyPoolBreakdown('STATE_LFI_2026'),
    LOCAL_LFI_2026_PROG_2204040_OVERLAP: createEmptyPoolBreakdown('LOCAL_LFI_2026_PROG_2204040_OVERLAP'),
    LOCAL_CSV_2026: createEmptyPoolBreakdown('LOCAL_CSV_2026'),
    LOCAL_PORTAL_BOUAKE_2026: createEmptyPoolBreakdown('LOCAL_PORTAL_BOUAKE_2026'),
    STATE_MULTIYEAR_PRE_2026: createEmptyPoolBreakdown('STATE_MULTIYEAR_PRE_2026'),
    OTHER: createEmptyPoolBreakdown('OTHER'),
  };

  let totalRawAmountFcfa = 0;
  let physicalProjectsCount = 0;
  let physicalProjectsAmountFcfa = 0;
  let equipmentAcquisitionsCount = 0;
  let equipmentAcquisitionsAmountFcfa = 0;
  let nonPhysicalExpensesCount = 0;
  let nonPhysicalExpensesAmountFcfa = 0;
  let undeterminedLinesCount = 0;
  let undeterminedLinesAmountFcfa = 0;
  let exactDuplicatesCount = 0;
  let exactDuplicatesAmountFcfa = 0;
  let crossCatalogOverlapCount = 0;
  let crossCatalogOverlapAmountFcfa = 0;

  for (const { project, classification } of classified) {
    const amount = typeof project.budget_amount_fcfa === 'number' && Number.isFinite(project.budget_amount_fcfa)
      ? project.budget_amount_fcfa
      : 0;
    const pool = byProvenancePool[classification.provenancePool];

    totalRawAmountFcfa += amount;
    pool.rawRows += 1;

    categoryCounts[classification.category].count += 1;
    categoryCounts[classification.category].amountFcfa += amount;

    if (classification.isExactDuplicate) {
      exactDuplicatesCount += 1;
      exactDuplicatesAmountFcfa += amount;
      pool.exactDuplicatesCount += 1;
      pool.exactDuplicatesAmountFcfa += amount;
      continue;
    }

    if (classification.isCrossCatalogOverlap) {
      crossCatalogOverlapCount += 1;
      crossCatalogOverlapAmountFcfa += amount;
      pool.crossOverlapCount += 1;
      pool.crossOverlapAmountFcfa += amount;
    }

    if (classification.category === 'PROJECT_PHYSICAL') {
      physicalProjectsCount += 1;
      physicalProjectsAmountFcfa += amount;
      pool.physicalCount += 1;
      pool.physicalAmountFcfa += amount;
    } else if (classification.category === 'EQUIPMENT_ACQUISITION') {
      equipmentAcquisitionsCount += 1;
      equipmentAcquisitionsAmountFcfa += amount;
      pool.equipmentCount += 1;
      pool.equipmentAmountFcfa += amount;
    } else if (NON_PHYSICAL_CATEGORIES.has(classification.category)) {
      nonPhysicalExpensesCount += 1;
      nonPhysicalExpensesAmountFcfa += amount;
      pool.nonPhysicalCount += 1;
      pool.nonPhysicalAmountFcfa += amount;
    } else {
      undeterminedLinesCount += 1;
      undeterminedLinesAmountFcfa += amount;
      pool.undeterminedCount += 1;
      pool.undeterminedAmountFcfa += amount;
    }
  }

  return {
    totalRawLines: projects.length,
    totalRawAmountFcfa,
    physicalProjectsCount,
    physicalProjectsAmountFcfa,
    equipmentAcquisitionsCount,
    equipmentAcquisitionsAmountFcfa,
    nonPhysicalExpensesCount,
    nonPhysicalExpensesAmountFcfa,
    undeterminedLinesCount,
    undeterminedLinesAmountFcfa,
    exactDuplicatesCount,
    exactDuplicatesAmountFcfa,
    crossCatalogOverlapCount,
    crossCatalogOverlapAmountFcfa,
    categoryCounts,
    byProvenancePool,
    physicalClassificationLabel:
      'Projets et opérations physiques répertoriés selon une classification automatisée',
    isCertified: false,
  };
}
