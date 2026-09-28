// =========================================================================
// GLOSSAIRE CITOYEN DES FINANCES LOCALES & COMPTES ADMINISTRATIFS
// SuiviBudget Côte d'Ivoire - Vulgarisation accessible au grand public
// =========================================================================

export interface GlossaryItem {
  id: string;
  term: string;
  category: 'BUDGET' | 'EXECUTION' | 'PROCUREMENT' | 'CITIZEN' | 'ACCOUNTING';
  short_definition: string;
  citizen_explanation: string;
  warning?: string;
  aliases?: string[];
}

export const BUDGET_GLOSSARY: GlossaryItem[] = [
  {
    id: 'compte-administratif',
    term: 'Compte administratif',
    category: 'EXECUTION',
    short_definition: 'Bilan financier officiel clôturé de l\'année écoulée dressé par le Maire ou le Président de Région.',
    citizen_explanation: 'C\'est la reddition des comptes de la collectivité : il retrace exactement l\'argent qui est effectivement rentré dans les caisses (recettes) et ce qui a réellement été dépensé (dépenses), par opposition aux simples prévisions du budget.',
    warning: 'Le compte administratif n\'est pas un budget primitif : il retrace ce qui a été fait, non ce qui est prévu.',
    aliases: ['CA', 'compte financier', 'reddition des comptes', 'exécution budgétaire']
  },
  {
    id: 'budget-primitif',
    term: 'Budget primitif',
    category: 'BUDGET',
    short_definition: 'Document de prévision et d\'autorisation des recettes et des dépenses pour l\'année à venir.',
    citizen_explanation: 'C\'est le plan prévisionnel voté par les conseillers municipaux ou régionaux avant le début de l\'exercice pour autoriser le maire ou le président à percevoir des taxes et engager des travaux.',
    warning: 'Un montant inscrit au budget primitif est une prévision d\'autorisation, pas une certitude de réalisation.',
    aliases: ['BP', 'budget initial', 'budget prévisionnel']
  },
  {
    id: 'budget-modificatif',
    term: 'Budget modificatif',
    category: 'BUDGET',
    short_definition: 'Délibération qui ajuste les prévisions du budget primitif en cours d\'exercice.',
    citizen_explanation: 'En cours d\'année, si la mairie perçoit plus ou moins d\'impôts que prévu, ou si une urgence apparaît (inondation, travaux imprévus), le Conseil vote une modification pour réajuster les enveloppes.',
    aliases: ['BM', 'décision modificative', 'DM', 'budget rectificatif']
  },
  {
    id: 'exercice-budgetaire',
    term: 'Exercice budgétaire',
    category: 'BUDGET',
    short_definition: 'Période annuelle (du 1er janvier au 31 décembre) sur laquelle s\'appliquent le budget et son exécution.',
    citizen_explanation: 'En Côte d\'Ivoire, l\'exercice budgétaire correspond exactement à l\'année civile.',
    aliases: ['exercice', 'année budgétaire']
  },
  {
    id: 'prevision',
    term: 'Prévision',
    category: 'BUDGET',
    short_definition: 'Estimation des recettes et plafonnement des dépenses autorisées pour l\'année.',
    citizen_explanation: 'Montant théorique que la collectivité pense pouvoir collecter ou dépenser.',
    aliases: ['montant prévu', 'crédit ouvert', 'dotation inscrite']
  },
  {
    id: 'recette',
    term: 'Recette',
    category: 'ACCOUNTING',
    short_definition: 'Ensemble des ressources financières qui entrent dans les caisses de la collectivité.',
    citizen_explanation: 'L\'argent dont dispose la mairie pour fonctionner : impôts locaux reversés par la DGI (foncier, patentes), taxes directes de marché, état civil, et subventions versées par l\'État.',
    aliases: ['ressource', 'recouvrement']
  },
  {
    id: 'depense',
    term: 'Dépense',
    category: 'ACCOUNTING',
    short_definition: 'Ensemble des sommes d\'argent payées par la collectivité pour assurer ses missions.',
    citizen_explanation: 'Tout ce que la collectivité paie : salaires des agents municipaux, électricité des bureaux, construction d\'écoles, voirie, etc.',
    aliases: ['paiement', 'charge']
  },
  {
    id: 'fonctionnement',
    term: 'Fonctionnement',
    category: 'ACCOUNTING',
    short_definition: 'Dépenses et recettes nécessaires à la gestion courante quotidienne des services.',
    citizen_explanation: 'Les dépenses qui se consomment rapidement : salaires, carburant, papier, entretien des bâtiments communaux, indemnités des élus.',
    aliases: ['charges courantes', 'gestion courante']
  },
  {
    id: 'investissement',
    term: 'Investissement',
    category: 'ACCOUNTING',
    short_definition: 'Dépenses qui créent ou augmentent la valeur durable du patrimoine de la collectivité.',
    citizen_explanation: 'Tout ce qui enrichit durablement la ville ou la région : construction d\'écoles, maternités, caniveaux, bitumage, châteaux d\'eau, achat de camions poubelles.',
    aliases: ['équipement', 'immobilisation', 'travaux d\'infrastructures']
  },
  {
    id: 'emission',
    term: 'Émission',
    category: 'ACCOUNTING',
    short_definition: 'Acte administratif par lequel la mairie constate et réclame officiellement une recette qui lui est due.',
    citizen_explanation: 'L\'ordre officiel donné de faire payer un contribuable ou un commerçant avant que l\'argent ne soit effectivement encaissé.',
    aliases: ['titre de recette émis', 'constatation']
  },
  {
    id: 'recouvrement',
    term: 'Recouvrement',
    category: 'ACCOUNTING',
    short_definition: 'Encaissement effectif de l\'argent entre les mains du comptable public (Trésor Public).',
    citizen_explanation: 'Le moment où l\'argent arrive réellement sur le compte de la collectivité.',
    aliases: ['recette recouvrée', 'encaissement']
  },
  {
    id: 'reste-a-recouvrer',
    term: 'Reste à recouvrer',
    category: 'ACCOUNTING',
    short_definition: 'Différence entre les recettes constatées/émises et l\'argent effectivement encaissé.',
    citizen_explanation: 'L\'argent que des contribuables ou l\'État doivent à la mairie mais qui n\'a pas encore été payé à la fin de l\'année.',
    aliases: ['impayés', 'restes à encaisser']
  },
  {
    id: 'credit-budgetaire',
    term: 'Crédit budgétaire',
    category: 'BUDGET',
    short_definition: 'Enveloppe maximale de dépense allouée par le Conseil pour un poste précis.',
    citizen_explanation: 'Le plafond qu\'un maire ne peut pas dépasser sans revoter une modification budgétaire.',
    aliases: ['crédit ouvert', 'enveloppe']
  },
  {
    id: 'engagement',
    term: 'Engagement',
    category: 'ACCOUNTING',
    short_definition: 'Acte juridique par lequel la collectivité crée une obligation financière envers un tiers.',
    citizen_explanation: 'La signature d\'un bon de commande ou d\'un contrat : la mairie s\'engage à payer un entrepreneur dès que les travaux seront faits.',
    aliases: ['dépense engagée']
  },
  {
    id: 'liquidation',
    term: 'Liquidation',
    category: 'ACCOUNTING',
    short_definition: 'Vérification de la réalité du service rendu et calcul de la somme exacte due.',
    citizen_explanation: 'La mairie vérifie les factures et atteste : « Les 3 salles de classe sont bien construites, la somme exacte à payer est 25 millions FCFA ».',
    aliases: ['constatation du service fait']
  },
  {
    id: 'ordonnancement',
    term: 'Ordonnancement',
    category: 'ACCOUNTING',
    short_definition: 'Ordre formel donné par le Maire au Trésor Public de payer le créancier.',
    citizen_explanation: 'Le maire signe le mandat de paiement ordonnant au Trésorier de verser l\'argent à l\'entrepreneur.',
    aliases: ['mandatement', 'ordonnance de paiement']
  },
  {
    id: 'mandatement',
    term: 'Mandatement',
    category: 'ACCOUNTING',
    short_definition: 'Émission formelle du mandat de paiement transmis au comptable du Trésor.',
    citizen_explanation: 'Synonyme d\'ordonnancement dans la comptabilité publique ivoirienne.',
    aliases: ['mandat']
  },
  {
    id: 'reste-a-payer',
    term: 'Reste à payer',
    category: 'ACCOUNTING',
    short_definition: 'Dépenses engagées et ordonnancées qui n\'ont pas encore été décaissées par le Trésor au 31 décembre.',
    citizen_explanation: 'Factures de travaux certifiées par le maire mais dont le paiement n\'a pas encore été exécuté par le Trésor à la date de clôture.',
    aliases: ['dépenses à payer']
  },
  {
    id: 'report',
    term: 'Report',
    category: 'ACCOUNTING',
    short_definition: 'Report sur l\'année suivante des crédits non consommés ou de l\'excédent de clôture.',
    citizen_explanation: 'L\'argent ou les travaux prévus d\'une année qui sont reconduits sur l\'exercice suivant.',
    aliases: ['report à nouveau', 'restes à réaliser']
  },
  {
    id: 'dette',
    term: 'Dette',
    category: 'ACCOUNTING',
    short_definition: 'Ensemble des emprunts financiers et des dettes fournisseurs de la collectivité.',
    citizen_explanation: 'Ce que la collectivité doit à la banque ou à ses prestataires.',
    aliases: ['dette communale', 'passif']
  },
  {
    id: 'excedent',
    term: 'Excédent',
    category: 'ACCOUNTING',
    short_definition: 'Résultat positif de l\'exercice lorsque les recettes encaissées dépassent les dépenses réalisées.',
    citizen_explanation: 'Il reste de l\'argent en caisse à la fin de l\'année. Cet argent est obligatoirement reporté sur le budget suivant.',
    aliases: ['boni', 'solde positif']
  },
  {
    id: 'deficit',
    term: 'Déficit',
    category: 'ACCOUNTING',
    short_definition: 'Résultat négatif lorsque les dépenses dépassent les recettes perçues.',
    citizen_explanation: 'La collectivité a dépensé plus qu\'elle n\'a perçu sur l\'année. La tutelle peut exiger un plan de résorption.',
    aliases: ['mali', 'solde négatif']
  },
  {
    id: 'taux-execution-financiere',
    term: 'Taux d\'exécution financière',
    category: 'EXECUTION',
    short_definition: 'Pourcentage calculé : Montant réalisé divisé par Montant prévu.',
    citizen_explanation: 'Indique dans quelle mesure l\'enveloppe budgétaire prévue a été effectivement dépensée ou recouvrée.',
    warning: 'Un taux de 100 % ne garantit pas à lui seul la qualité ou l\'achèvement physique d\'un chantier : il mesure uniquement les flux financiers ordonnancés.',
    aliases: ['taux d\'exécution', 'taux de réalisation']
  },
  {
    id: 'execution-physique',
    term: 'Exécution physique',
    category: 'CITIZEN',
    short_definition: 'Constat concret de l\'avancement des travaux sur le terrain (bâtiment érigé, toit posé, route circulable).',
    citizen_explanation: 'Ce que le citoyen voit de ses propres yeux dans son quartier ou son village.',
    warning: 'L\'exécution financière (comptable) peut être en avance ou en retard sur l\'exécution physique (terrain).',
    aliases: ['état terrain', 'avancement physique']
  },
  {
    id: 'programme-triennal',
    term: 'Programme triennal',
    category: 'BUDGET',
    short_definition: 'Plan pluriannuel d\'investissements glissant sur 3 années.',
    citizen_explanation: 'La feuille de route des grands chantiers programmés sur 3 ans par la mairie ou la région.',
    warning: 'Le montant total du programme triennal regroupe 3 années et ne doit pas être confondu avec le budget annuel.',
    aliases: ['PTI', 'plan triennal']
  },
  {
    id: 'dgmp',
    term: 'DGMP',
    category: 'PROCUREMENT',
    short_definition: 'Direction Générale des Marchés Publics de Côte d\'Ivoire.',
    citizen_explanation: 'L\'autorité nationale chargée du contrôle, de la régularité et de la publication des marchés publics de l\'État et des collectivités.',
    aliases: ['Marchés Publics', 'Autorité des Marchés']
  },
  {
    id: 'ppm',
    term: 'PPM',
    category: 'PROCUREMENT',
    short_definition: 'Plan Prévisionnel de Passation des Marchés.',
    citizen_explanation: 'La liste annuelle des marchés que la mairie s\'engage à lancer dans l\'année par appel d\'offres.',
    aliases: ['plan de passation des marchés']
  },
  {
    id: 'aoo',
    term: 'AOO',
    category: 'PROCUREMENT',
    short_definition: 'Appel d\'Offres Ouvert.',
    citizen_explanation: 'Procédure publique de mise en concurrence où toute entreprise qualifiée peut postuler pour exécuter le marché.',
    aliases: ['AO', 'appel d\'offres', 'appel-offres-ouvert']
  },
  {
    id: 'attribution',
    term: 'Attribution',
    category: 'PROCUREMENT',
    short_definition: 'Désignation officielle de l\'entreprise lauréate du marché public par la commission compétente.',
    citizen_explanation: 'La décision qui confie le chantier à une entreprise précise pour un prix déterminé.',
    aliases: ['adjudication']
  },
  {
    id: 'attributaire',
    term: 'Attributaire',
    category: 'PROCUREMENT',
    short_definition: 'Entreprise qui a remporté le marché public après examen des offres.',
    citizen_explanation: 'L\'entreprise chargée de réaliser les travaux ou de livrer les équipements.',
    aliases: ['adjudicataire', 'titulaire du marché']
  },
  {
    id: 'correspondance-forte',
    term: 'Correspondance forte',
    category: 'PROCUREMENT',
    short_definition: 'Rapprochement certifié entre une ligne du compte administratif et un marché public officiel DGMP.',
    citizen_explanation: 'Le titre du projet, le montant budgétaire et la localisation correspondent parfaitement à un marché enregistré à la DGMP.',
    aliases: ['STRONG', 'marché identifié']
  },
  {
    id: 'correspondance-partielle',
    term: 'Correspondance partielle',
    category: 'PROCUREMENT',
    short_definition: 'Rapprochement probable mais présentant des écarts de libellé ou de tranche.',
    citizen_explanation: 'Le chantier ressemble à un marché DGMP connu, mais certains détails diffèrent ou les tranches sont étalées sur plusieurs années.',
    aliases: ['PARTIAL', 'marché partiel']
  },
  {
    id: 'observation-citoyenne',
    term: 'Observation citoyenne',
    category: 'CITIZEN',
    short_definition: 'Constat photographique et descriptif géolocalisé transmis par un habitant ou une sentinelle.',
    citizen_explanation: 'Une photo du chantier prise par un citoyen montrant si l\'école est finie, en cours ou abandonnée.',
    warning: 'Une observation citoyenne documente un état de fait visible sans se substituer à une expertise d\'audit technique.',
    aliases: ['preuve citoyenne', 'constat terrain']
  },
  {
    id: 'droit-de-reponse',
    term: 'Droit de réponse',
    category: 'CITIZEN',
    short_definition: 'Espace officiel offert à la collectivité pour apporter des précisions sur un chantier ou un chiffre.',
    citizen_explanation: 'La mairie peut publier son explication officielle (intempéries, retard d\'approvisionnement, avenant) en toute transparence.',
    aliases: ['réponse institutionnelle', 'précision mairie']
  },
  {
    id: 'signal-a-verifier',
    term: 'Signal à vérifier',
    category: 'CITIZEN',
    short_definition: 'Alerte technique lorsque les données sources présentent une anomalie mathématique ou documentaire.',
    citizen_explanation: 'Par exemple si une dépense réalisée dépasse la prévision ou si les colonnes ne s\'additionnent pas exactement.',
    warning: 'Un signal à vérifier signale un besoin de recoupement et ne constitue jamais une accusation automatique d\'irrégularité.',
    aliases: ['à vérifier', 'anomalie de source']
  },
  {
    id: 'ordonnateur',
    term: 'Ordonnateur',
    category: 'ACCOUNTING',
    short_definition: 'Autorité exécutive habilitée à décider et engager les dépenses (le Maire ou le Président de Région).',
    citizen_explanation: 'C\'est l\'élu qui donne l\'ordre officiel de dépenser l\'argent de la collectivité pour réaliser les projets votés.',
    warning: 'L\'ordonnateur décide de la dépense mais ne tient pas la caisse physique (séparation stricte de l\'ordonnateur et du comptable).',
    aliases: ['maire ordonnateur', 'président ordonnateur', 'décideur']
  },
  {
    id: 'comptable-public',
    term: 'Comptable public',
    category: 'ACCOUNTING',
    short_definition: 'Agent du Trésor Public chargé exclusivement du maniement des deniers publics et des paiements.',
    citizen_explanation: 'Le trésorier qui contrôle la conformité des factures et effectue les paiements effectifs aux entreprises.',
    aliases: ['trésorier municipal', 'payeur']
  },
  {
    id: 'tresor-public',
    term: 'Trésor Public',
    category: 'ACCOUNTING',
    short_definition: 'Direction Générale du Trésor et de la Comptabilité Publique (DGTCP).',
    citizen_explanation: 'La banque publique de l\'État qui centralise et sécurise les finances de toutes les mairies et régions.',
    aliases: ['DGTCP', 'le trésor']
  },
  {
    id: 'regie-directe',
    term: 'Régie directe',
    category: 'PROCUREMENT',
    short_definition: 'Modalité d\'exécution de travaux ou services par les propres agents et moyens de la collectivité.',
    citizen_explanation: 'Lorsque la mairie utilise ses propres cantonniers, camions ou ouvriers plutôt que de sous-traiter à une entreprise privée.',
    warning: 'Les travaux en régie directe ne figurent pas sur le portail de la DGMP car ils ne font pas l\'objet d\'un marché tiers.',
    aliases: ['régie municipale', 'travaux en régie']
  },
  {
    id: 'visa-de-tutelle',
    term: 'Visa de tutelle',
    category: 'BUDGET',
    short_definition: 'Acte d\'approbation formel délivré par le Préfet ou la DGDDL conférant le caractère exécutoire au budget.',
    citizen_explanation: 'Le tampon officiel de l\'État qui vérifie que le budget voté est légal et en équilibre réel avant que la mairie ne puisse dépenser.',
    aliases: ['approbation préfectorale', 'contrôle de légalité']
  },
  {
    id: 'dette-locale',
    term: 'Dette locale',
    category: 'ACCOUNTING',
    short_definition: 'Ensemble des emprunts contractés par la collectivité pour financer des investissements durables.',
    citizen_explanation: 'Les crédits bancaires remboursables sur plusieurs années pour bâtir de gros équipements.',
    warning: 'Les emprunts sont strictement réservés aux investissements structurants et ne peuvent jamais financer des salaires.',
    aliases: ['emprunt municipal', 'endettement']
  },
  {
    id: 'fonds-de-roulement',
    term: 'Fonds de roulement',
    category: 'ACCOUNTING',
    short_definition: 'Réserve financière permanente permettant de faire face aux décalages de trésorerie.',
    citizen_explanation: 'Le matelas de sécurité financière sur le compte de la mairie pour continuer à payer les factures en attendant la rentrée des impôts.',
    aliases: ['roulement', 'réserve de trésorerie']
  },
  {
    id: 'aip',
    term: 'AIP',
    category: 'CITIZEN',
    short_definition: 'Agence Ivoirienne de Presse, source publique nationale d\'information.',
    citizen_explanation: 'L\'agence de presse officielle qui documente les sessions des conseils municipaux et les délibérations budgétaires en présence du corps préfectoral.',
    aliases: ['Agence Ivoirienne de Presse', 'dépêche AIP']
  }
];

/**
 * Recherche d'un terme dans le glossaire par son mot-clé ou alias
 */
export function getGlossaryTerm(termOrAlias: string): GlossaryItem | undefined {
  if (!termOrAlias) return undefined;
  const normalized = termOrAlias.trim().toLowerCase();

  return BUDGET_GLOSSARY.find(item => 
    item.term.toLowerCase() === normalized ||
    item.id.toLowerCase() === normalized ||
    (item.aliases && item.aliases.some(a => a.toLowerCase() === normalized))
  );
}

/**
 * Recherche floue dans les définitions du glossaire
 */
export function searchGlossary(query: string): GlossaryItem[] {
  if (!query || !query.trim()) return BUDGET_GLOSSARY;
  const q = query.trim().toLowerCase();

  return BUDGET_GLOSSARY.filter(item =>
    item.term.toLowerCase().includes(q) ||
    item.short_definition.toLowerCase().includes(q) ||
    item.citizen_explanation.toLowerCase().includes(q) ||
    (item.aliases && item.aliases.some(a => a.toLowerCase().includes(q)))
  );
}
