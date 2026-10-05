import {
  MinistryBudget,
  BudgetProgram,
  BudgetAction,
  BudgetActivity,
  MinistryLinkedProject,
} from '../types/ministryBudget';

// ============================================================================
// RÉFÉRENTIEL DU MINISTÈRE PILOTE (LOT 2)
// MINISTÈRE DES MINES, DU PÉTROLE ET DE L'ÉNERGIE (MMPE) — EXERCICE 2026
// Source Primaire : Loi de Finances n° 2025-987 du 19 décembre 2025 (DGBF)
// Source Sectorielle : DPPD-PAP 2026-2028 / Présentation parlementaire CAEF
// Invariant Républicain : UNKNOWN != 0, ZÉRO fictif interdit, aucun double comptage.
// ============================================================================

export const MMPE_INSTITUTION_ID = 'gov-008';

// Projets d'investissements publics majeurs rattachés (18 projets nationaux)
// RÈGLE : Ces projets sont financés au sein des crédits d'investissement des actions correspondantes.
// Ils ne s'y additionnent JAMAIS (zéro double comptage).
const MMPE_LINKED_PROJECTS: MinistryLinkedProject[] = [
  // P1 : Administration Générale
  {
    id: 'nat-proj-2026-2597',
    code: 'PROJ-MMPE-SI-2026',
    title: "Mise en oeuvre du nouveau Schéma Directeur du Système d'Information du Ministère des Mines, du Pétrole et de l'Énergie",
    budget_amount_fcfa: 300_000_000,
    program_id: 'prog-mmpe-01',
    action_id: 'act-mmpe-01-01',
    current_status: 'VOTE',
    region_name: 'National / Abidjan',
    is_funded_within_action: true,
  },
  // P2 : Énergie — Action P2-A2 (Infrastructures de production, transport et distribution)
  {
    id: 'nat-proj-2026-2598',
    code: 'PROJ-MMPE-SOLAR-BOUNDIALI-2',
    title: 'Projet de construction de la centrale solaire de Boundiali Phase 2',
    budget_amount_fcfa: 18_694_774_500,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-02',
    current_status: 'VOTE',
    region_name: 'Bagoué (Boundiali)',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2599',
    code: 'PROJ-MMPE-DORSALE-PK24-BINGERVILLE',
    title: 'Projet Dorsale Abidjan 400 KV Liaison PK 24 - Bingerville',
    budget_amount_fcfa: 34_990_845_661,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-02',
    current_status: 'VOTE',
    region_name: 'Abidjan / Lagunes',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2600',
    code: 'PROJ-MMPE-BEST-BATTERIES',
    title: "Projet régional d'accès à l'électricité et de technologie de stockage d'énergie par batteries (BEST)",
    budget_amount_fcfa: 4_184_006_796,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-02',
    current_status: 'VOTE',
    region_name: 'National / Multi-Régions',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2601',
    code: 'PROJ-MMPE-NUM-ELEC',
    title: "Projet National de Numérisation et d'Accès à l'Électricité en Côte d'Ivoire",
    budget_amount_fcfa: 60_000_000_000,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-02',
    current_status: 'VOTE',
    region_name: 'National',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2602',
    code: 'PROJ-MMPE-CORRIDOR-NORD',
    title: 'Projet Corridor Nord (Liaisons haute tension & interconnexions)',
    budget_amount_fcfa: 46_000_000_000,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-02',
    current_status: 'VOTE',
    region_name: 'Nord / Poro / Tchologo',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2603',
    code: 'PROJ-MMPE-PIDE-EST',
    title: "Programme Intégré de Développement de l'Est (PIDE - Électrification)",
    budget_amount_fcfa: 12_048_492_960,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-02',
    current_status: 'VOTE',
    region_name: 'Indénié-Djuablin / Gontougo',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2604',
    code: 'PROJ-MMPE-REMP-CI-GHANA',
    title: 'Projet Renforcement Interconnexion CI-GHANA (REMP) 330 KV Liaison Bingerville - Dunkwa II',
    budget_amount_fcfa: 35_328_107_430,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-02',
    current_status: 'VOTE',
    region_name: 'Sud-Comoé / Ghana',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2605',
    code: 'PROJ-MMPE-DORSALE-ANYAMA-FERKE',
    title: 'Projet Dorsale 400 KV EST Liaison Anyama-Ferké et Extension des postes sources',
    budget_amount_fcfa: 60_558_899_899,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-02',
    current_status: 'VOTE',
    region_name: 'Anyama / Ferkessédougou',
    is_funded_within_action: true,
  },
  // P2 : Énergie — Action P2-A3 (Technologies modernes & énergies renouvelables)
  {
    id: 'nat-proj-2026-2606',
    code: 'PROJ-MMPE-FONAME',
    title: "Fonds National de Maîtrise de l'Énergie (FONAME)",
    budget_amount_fcfa: 150_000_000,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-03',
    current_status: 'VOTE',
    region_name: 'National',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2607',
    code: 'PROJ-MMPE-PARIS',
    title: "Promotion de l'accès, des Réseaux Intelligents et de l'Énergie Solaire (PARIS)",
    budget_amount_fcfa: 8_582_400_000,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-03',
    current_status: 'VOTE',
    region_name: 'National / Réseaux Intelligents',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2608',
    code: 'PROJ-MMPE-VABICUI',
    title: 'Projet Valorisation de Biomasse Énergie et Cuisson propre en Côte d’Ivoire (VABICUI)',
    budget_amount_fcfa: 1_145_957_224,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-03',
    current_status: 'VOTE',
    region_name: 'National / Énergie Rurale',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2609',
    code: 'PROJ-MMPE-ENR-ACCOMPAGNEMENT',
    title: 'Projet Mesure d’Accompagnement au programme Énergie Renouvelable et Efficacité énergétique',
    budget_amount_fcfa: 2_040_956_240,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-03',
    current_status: 'VOTE',
    region_name: 'National',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2610',
    code: 'PROJ-MMPE-PME-MAITRISE',
    title: 'Programme de Maîtrise de l’Énergie et Efficacité Énergétique',
    budget_amount_fcfa: 10_182_486_445,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-03',
    current_status: 'VOTE',
    region_name: 'National',
    is_funded_within_action: true,
  },
  // P2 : Énergie — Action P2-A4 (Accessibilité financière & Électrification pour tous)
  {
    id: 'nat-proj-2026-2611',
    code: 'PROJ-MMPE-PEPT',
    title: 'Programme d’Électrification Pour Tous (PEPT — Raccordements sociaux à 1 000 FCFA)',
    budget_amount_fcfa: 6_000_000_000,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-04',
    current_status: 'VOTE',
    region_name: 'National (Ménages vulnérables)',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2612',
    code: 'PROJ-MMPE-PRONEX',
    title: 'Programme National d’Extension de Réseaux Électriques (PRONEX)',
    budget_amount_fcfa: 3_500_000_000,
    program_id: 'prog-mmpe-02',
    action_id: 'act-mmpe-02-04',
    current_status: 'VOTE',
    region_name: 'National',
    is_funded_within_action: true,
  },
  // P4 : Mines et Géologie — Action P4-A2 (Informations géologiques & minières)
  {
    id: 'nat-proj-2026-2613',
    code: 'PROJ-MMPE-LAB-MINES-CONST',
    title: 'Construction du Laboratoire National d’Analyse Géologique de Côte d’Ivoire',
    budget_amount_fcfa: 300_000_000,
    program_id: 'prog-mmpe-04',
    action_id: 'act-mmpe-04-02',
    current_status: 'VOTE',
    region_name: 'Abidjan',
    is_funded_within_action: true,
  },
  {
    id: 'nat-proj-2026-2614',
    code: 'PROJ-MMPE-LAB-MINES-EQUIP',
    title: 'Équipement du Laboratoire National d’Analyse Géologique de Côte d’Ivoire',
    budget_amount_fcfa: 152_064_222,
    program_id: 'prog-mmpe-04',
    action_id: 'act-mmpe-04-02',
    current_status: 'VOTE',
    region_name: 'Abidjan',
    is_funded_within_action: true,
  },
];

// PROGRAMMES DU MINISTÈRE PILOTE
const MMPE_PROGRAMS: BudgetProgram[] = [
  // --------------------------------------------------------------------------
  // PROGRAMME 1 : ADMINISTRATION GÉNÉRALE
  // --------------------------------------------------------------------------
  {
    id: 'prog-mmpe-01',
    ministry_id: MMPE_INSTITUTION_ID,
    code: 'P1',
    name: 'Administration Générale',
    description:
      'Coordination stratégique du ministère, planification, suivi-évaluation des politiques sectorielles, gestion des ressources humaines, matérielles et financières, système d’information et communication.',
    amount_fcfa: 8_701_872_126,
    percentage_of_ministry: 1.23,
    responsible_title: 'Directeur de Cabinet / Secrétariat Général',
    reconciliation_status: 'RECONCILED',
    actions: [
      {
        id: 'act-mmpe-01-01',
        program_id: 'prog-mmpe-01',
        code: 'P1-A1',
        name: 'Coordination et animation du ministère',
        description: 'Pilotage de l’action ministérielle en services centraux et déconcentrés régionaux.',
        amount_fcfa: 2_315_615_656,
        reconciliation_status: 'RECONCILED',
        linked_projects: MMPE_LINKED_PROJECTS.filter(p => p.action_id === 'act-mmpe-01-01'),
      },
      {
        id: 'act-mmpe-01-02',
        program_id: 'prog-mmpe-01',
        code: 'P1-A2',
        name: 'Planification, programmation et suivi-évaluation des activités du ministère',
        description: 'Élaboration du DPPD-PAP, tableaux de bord de performance et contrôle de gestion.',
        amount_fcfa: 86_760_000,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-01-03',
        program_id: 'prog-mmpe-01',
        code: 'P1-A3',
        name: 'Gestion des ressources humaines, matérielles et financières',
        description: 'Traitements, gestion du patrimoine mobilier/immobilier et ordonnancement comptable.',
        amount_fcfa: 6_266_806_470,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-01-04',
        program_id: 'prog-mmpe-01',
        code: 'P1-A4',
        name: 'Information et communication',
        description: 'Diffusion institutionnelle, relations citoyennes et transparence publique.',
        amount_fcfa: 32_690_000,
        reconciliation_status: 'RECONCILED',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PROGRAMME 2 : ÉNERGIE
  // --------------------------------------------------------------------------
  {
    id: 'prog-mmpe-02',
    ministry_id: MMPE_INSTITUTION_ID,
    code: 'P2',
    name: 'Énergie',
    description:
      'Développement de la production, du transport et de la distribution d’électricité, électrification rurale intégrale (PRONER), raccordements sociaux (PEPT), transition vers le solaire et la biomasse.',
    amount_fcfa: 320_914_619_601,
    percentage_of_ministry: 45.45,
    responsible_title: 'Directeur Général de l’Énergie',
    reconciliation_status: 'RECONCILED',
    actions: [
      {
        id: 'act-mmpe-02-01',
        program_id: 'prog-mmpe-02',
        code: 'P2-A1',
        name: 'Renforcement du cadre institutionnel, légal et réglementaire du secteur de l’énergie',
        description: 'Régulation du marché électrique, conventions de concession et normes tarifaires.',
        amount_fcfa: 16_875_242_446,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-02-02',
        program_id: 'prog-mmpe-02',
        code: 'P2-A2',
        name: 'Renforcement des infrastructures de production, du transport et de distribution de l’énergie électrique',
        description: 'Centrales thermiques et solaires, lignes d’interconnexion 400kV et postes sources régionaux.',
        amount_fcfa: 272_285_127_246,
        reconciliation_status: 'RECONCILED',
        linked_projects: MMPE_LINKED_PROJECTS.filter(p => p.action_id === 'act-mmpe-02-02'),
      },
      {
        id: 'act-mmpe-02-03',
        program_id: 'prog-mmpe-02',
        code: 'P2-A3',
        name: 'Vulgarisation des technologies modernes d’exploitation des sources d’énergie',
        description: 'Énergies renouvelables (solaire, biomasse, micro-hydro), efficacité énergétique et réseaux intelligents.',
        amount_fcfa: 22_204_949_909,
        reconciliation_status: 'RECONCILED',
        linked_projects: MMPE_LINKED_PROJECTS.filter(p => p.action_id === 'act-mmpe-02-03'),
      },
      {
        id: 'act-mmpe-02-04',
        program_id: 'prog-mmpe-02',
        code: 'P2-A4',
        name: 'Amélioration de l’accessibilité financière aux services énergétiques',
        description: 'Programme Électricité Pour Tous (PEPT), baisse de la barrière au raccordement et vulgarisation des réseaux.',
        amount_fcfa: 9_549_300_000,
        reconciliation_status: 'RECONCILED',
        linked_projects: MMPE_LINKED_PROJECTS.filter(p => p.action_id === 'act-mmpe-02-04'),
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PROGRAMME 3 : HYDROCARBURES
  // --------------------------------------------------------------------------
  {
    id: 'prog-mmpe-03',
    ministry_id: MMPE_INSTITUTION_ID,
    code: 'P3',
    name: 'Hydrocarbures',
    description:
      'Gouvernance et régulation de l’exploration et exploitation pétrolière et gazière (gisements Baleine et Calao), initiative « Gas to Power », sécurisation des approvisionnements en carburants et gaz butane.',
    amount_fcfa: 116_054_336,
    percentage_of_ministry: 0.02,
    responsible_title: 'Directeur Général des Hydrocarbures',
    reconciliation_status: 'RECONCILED',
    actions: [
      {
        id: 'act-mmpe-03-01',
        program_id: 'prog-mmpe-03',
        code: 'P3-A1',
        name: 'Renforcement du cadre institutionnel, légal et réglementaire du secteur des hydrocarbures',
        description: 'Contrats de partage de production (CPP), code pétrolier et audits des concessions.',
        amount_fcfa: 82_754_336,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-03-02',
        program_id: 'prog-mmpe-03',
        code: 'P3-A2',
        name: 'Sécurisation de l’approvisionnement des marchés locaux et sous régionaux en produits pétroliers',
        description: 'Surveillance des stocks de sécurité, continuité d’approvisionnement et contrôle qualité des carburants.',
        amount_fcfa: 17_800_000,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-03-03',
        program_id: 'prog-mmpe-03',
        code: 'P3-A3',
        name: 'Promotion des investissements nationaux et étrangers dans le secteur pétrolier et gazier',
        description: 'Promotion des blocs offshore et onshore dans les conférences internationales de l’énergie.',
        amount_fcfa: 15_500_000,
        reconciliation_status: 'RECONCILED',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PROGRAMME 4 : MINES ET GÉOLOGIE
  // --------------------------------------------------------------------------
  {
    id: 'prog-mmpe-04',
    ministry_id: MMPE_INSTITUTION_ID,
    code: 'P4',
    name: 'Mines et Géologie',
    description:
      'Valorisation du potentiel minier (or, coltan, nickel, manganèse), modernisation du cadastre minier, répression de l’orpaillage clandestin et développement de l’infrastructure géologique nationale.',
    amount_fcfa: 783_321_335,
    percentage_of_ministry: 0.11,
    responsible_title: 'Directeur Général des Mines et de la Géologie',
    reconciliation_status: 'RECONCILED',
    actions: [
      {
        id: 'act-mmpe-04-01',
        program_id: 'prog-mmpe-04',
        code: 'P4-A1',
        name: 'Contrôle et suivi de l’application de la législation minière',
        description: 'Inspections sur site, traçabilité des minerais et conformité environnementale et sociale.',
        amount_fcfa: 64_551_589,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-04-02',
        program_id: 'prog-mmpe-04',
        code: 'P4-A2',
        name: 'Gestion des informations géologiques et minières',
        description: 'Cartographie géologique, numérisation du cadastre minier et création du Laboratoire National d’Analyse Géologique.',
        amount_fcfa: 492_511_295,
        reconciliation_status: 'RECONCILED',
        linked_projects: MMPE_LINKED_PROJECTS.filter(p => p.action_id === 'act-mmpe-04-02'),
      },
      {
        id: 'act-mmpe-04-03',
        program_id: 'prog-mmpe-04',
        code: 'P4-A3',
        name: 'Assainissement de l’exploitation minière',
        description: 'Lutte contre l’orpaillage illégal et encadrement des exploitations artisanales autorisées.',
        amount_fcfa: 13_428_480,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-04-04',
        program_id: 'prog-mmpe-04',
        code: 'P4-A4',
        name: 'Renforcement du cadre institutionnel, légal et réglementaire du secteur des mines et géologie',
        description: 'Actualisation du Code Minier et textes d’application relatifs au contenu local.',
        amount_fcfa: 212_829_971,
        reconciliation_status: 'RECONCILED',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PROGRAMME 5 : COMPTES SPÉCIAUX DU TRÉSOR & FONDS DE SOUTIEN
  // --------------------------------------------------------------------------
  {
    id: 'prog-mmpe-05',
    ministry_id: MMPE_INSTITUTION_ID,
    code: 'CAS',
    name: 'Comptes Spéciaux du Trésor & Fonds de Soutien',
    description:
      'Comptes d’affectation spéciale, péréquation des prix du carburant et du gaz butane, et concours sectoriels d’urgence aux sociétés publiques d’énergie et de raffinage (SIR, CI-ENERGIES).',
    amount_fcfa: 375_544_341_617,
    percentage_of_ministry: 53.19,
    responsible_title: 'Direction Générale du Trésor et de la Comptabilité Publique / MMPE',
    reconciliation_status: 'RECONCILED',
    actions: [
      {
        id: 'act-mmpe-05-01',
        program_id: 'prog-mmpe-05',
        code: 'CAS-A1',
        name: 'Appui au financement du secteur de l’électricité — Électrification',
        description: 'Fonds d’urgence pour l’accélération des chantiers d’extension de réseaux.',
        amount_fcfa: 70_368_000_000,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-05-02',
        program_id: 'prog-mmpe-05',
        code: 'CAS-A2',
        name: 'Appui au financement de la Société Ivoirienne de Raffinage (SIR)',
        description: 'Recouvrement et affectation mensuelle de la Taxe Spéciale Unique (TSU SIR).',
        amount_fcfa: 57_906_341_617,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-05-03',
        program_id: 'prog-mmpe-05',
        code: 'CAS-A3',
        name: 'Appui au financement du secteur minier — Gestion des taxes ad valorem',
        description: 'Affectation des redevances minières pour la recherche et l’aménagement géologique.',
        amount_fcfa: 28_500_000_000,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-05-04',
        program_id: 'prog-mmpe-05',
        code: 'CAS-A4',
        name: 'Péréquation produit à la SIR — Subventions gaz butane',
        description: 'Règlement des subventions pour maintenir le gaz butane à prix abordable pour les ménages.',
        amount_fcfa: 105_000_000_000,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-05-05',
        program_id: 'prog-mmpe-05',
        code: 'CAS-A5',
        name: 'Péréquation transport hydrocarbures (SEGH)',
        description: 'Règlement des différentiels de transport aux marketeurs pour uniformiser le prix à la pompe sur tout le territoire.',
        amount_fcfa: 70_000_000_000,
        reconciliation_status: 'RECONCILED',
      },
      {
        id: 'act-mmpe-05-06',
        program_id: 'prog-mmpe-05',
        code: 'CAS-A6',
        name: 'Appui au financement à Côte d’Ivoire ÉNERGIE',
        description: 'Concours de l’État pour le renforcement des capacités de distribution électrique.',
        amount_fcfa: 43_770_000_000,
        reconciliation_status: 'RECONCILED',
      },
    ],
  },
];

// OBJET BUDGET MINISTÉRIEL COMPLET PILOTE
export const MMPE_MINISTRY_BUDGET_2026: MinistryBudget = {
  id: 'mbud-mmpe-2026',
  institution_id: MMPE_INSTITUTION_ID,
  institution_name: 'Ministère des Mines, du Pétrole et de l’Énergie',
  minister_name: 'M. MAMADOU SANGAFOWA COULIBALY',
  fiscal_year: 2026,
  total_budget_fcfa: 706_060_209_015,
  amount_precision: 'EXACT',
  reconciliation_status: 'RECONCILED',
  programs: MMPE_PROGRAMS,
  source: 'Loi de Finances n° 2025-987 du 19 décembre 2025 portant budget de l’État pour l’année 2026',
  source_url: 'https://www.dgbf.ci/loi-de-finances-initiale-2026/',
  evidence_type: 'PRIMARY_OFFICIAL_DOCUMENT',
  document_reference: 'Loi n° 2025-987 • DGBF SIGOBE',
  page_reference: 'Section MMPE / Annexe des dépenses par programme',
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-10-05T12:00:00Z',
};

// RÉPERTOIRE OFFICIEL DES MINISTÈRES PILOTÉS (EXTENSIBLE POUR LOTS SUIVANTS)
export const OFFICIAL_MINISTRY_BUDGETS: Record<string, MinistryBudget> = {
  [MMPE_INSTITUTION_ID]: MMPE_MINISTRY_BUDGET_2026,
};

// Helpers d'accès et réconciliation
export function getMinistryBudget(institutionId: string, fiscalYear: number = 2026): MinistryBudget | null {
  const budget = OFFICIAL_MINISTRY_BUDGETS[institutionId];
  if (!budget || budget.fiscal_year !== fiscalYear) return null;
  return budget;
}

export function isPilotMinistry(institutionId: string): boolean {
  return institutionId === MMPE_INSTITUTION_ID;
}

export interface MinistryArithmeticCheck {
  total_budget_fcfa: number | null;
  programs_sum_fcfa: number;
  programs_delta_fcfa: number;
  programs_reconciliation_status: 'RECONCILED' | 'SOURCE_GAP';
  actions_checks: {
    program_id: string;
    program_name: string;
    program_amount_fcfa: number | null;
    actions_sum_fcfa: number;
    actions_delta_fcfa: number;
    status: 'RECONCILED' | 'SOURCE_GAP';
  }[];
  total_projects_count: number;
  total_projects_sum_fcfa: number;
}

export function performMinistryArithmeticCheck(budget: MinistryBudget): MinistryArithmeticCheck {
  let programsSum = 0;
  const actionsChecks: MinistryArithmeticCheck['actions_checks'] = [];
  let totalProjectsCount = 0;
  let totalProjectsSum = 0;

  for (const prog of budget.programs) {
    if (prog.amount_fcfa != null) {
      programsSum += prog.amount_fcfa;
    }

    let actionsSum = 0;
    for (const act of prog.actions) {
      if (act.amount_fcfa != null) {
        actionsSum += act.amount_fcfa;
      }
      if (act.linked_projects) {
        totalProjectsCount += act.linked_projects.length;
        for (const proj of act.linked_projects) {
          totalProjectsSum += proj.budget_amount_fcfa;
        }
      }
    }

    const progAmount = prog.amount_fcfa ?? 0;
    const actionsDelta = actionsSum - progAmount;
    actionsChecks.push({
      program_id: prog.id,
      program_name: prog.name,
      program_amount_fcfa: prog.amount_fcfa,
      actions_sum_fcfa: actionsSum,
      actions_delta_fcfa: actionsDelta,
      status: actionsDelta === 0 ? 'RECONCILED' : 'SOURCE_GAP',
    });
  }

  const expectedTotal = budget.total_budget_fcfa ?? 0;
  const programsDelta = programsSum - expectedTotal;

  return {
    total_budget_fcfa: budget.total_budget_fcfa,
    programs_sum_fcfa: programsSum,
    programs_delta_fcfa: programsDelta,
    programs_reconciliation_status: programsDelta === 0 ? 'RECONCILED' : 'SOURCE_GAP',
    actions_checks: actionsChecks,
    total_projects_count: totalProjectsCount,
    total_projects_sum_fcfa: totalProjectsSum,
  };
}
