// Official Government Data sourced directly from Portail Officiel du Gouvernement (https://www.gouv.ci/gouvernement)
// et enrichi avec le répertoire officiel en direct de la CAIDP (https://www.caidp.ci/client/responsableInformation)
// 100% données réelles et vérifiées - Gouvernement de la République de Côte d'Ivoire (Décret du 23 janvier 2026)

export interface OfficialLeader {
  id: string;
  name: string;
  role_title: string;
  department_ministry: string;
  category: 'PREMIER_MINISTRE' | 'VICE_PREMIER_MINISTRE' | 'MINISTRE_ETAT' | 'MINISTRE' | 'MINISTRE_DELEGUE' | 'SECRETAIRE_ETAT';
  gender: 'M' | 'F';
  photo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  facebook_url?: string;
  address?: string;
  mission_summary?: string;
  leader_bio?: string;
  leader_education?: string[];
  leader_experience?: string[];
  organigramme_summary?: string[];
  organigramme_details?: { title: string; items: string[] }[];
  info_officer_name?: string;
  info_officer_email?: string;
  info_officer_phone?: string;
  info_officer_title?: string;
  green_line_number?: string;
  budget_fcfa?: number;
}

export const GOVERNMENT_DATA: OfficialLeader[] = [
  {
    "id": "gov-001",
    "name": "M. ROBERT BEUGRE MAMBE",
    "role_title": "Premier Ministre, Chef du Gouvernement",
    "department_ministry": "PRIMATURE",
    "category": "PREMIER_MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/decret-17691899116.png",
    "website_url": "https://primature.gouv.ci",
    "facebook_url": "https://www.facebook.com/PrimatureCI",
    "budget_fcfa": 73426766299,
    "address": "Abidjan Plateau, Boulevard de la République, Cité Administrative",
    "info_officer_name": "M. EHOUAN Enoh Désiré",
    "info_officer_title": "Chef du Service des Archives et de la Documentation (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "green_line_number": "101",
    "leader_bio": "M. Robert Beugré Mambé est un haut fonctionnaire d'État et ingénieur des travaux publics chevronné. Titulaire d'un diplôme d'Ingénieur des Travaux Publics de l'École Nationale Supérieure des Travaux Publics (ENSTP) de Yamoussoukro et du Centre des Hautes Études de la Construction (CHEC) de Paris, il a consacré plus de quatre décennies au service du développement de la Côte d'Ivoire. Ancien Directeur des Grands Travaux, puis Président de la Commission Électorale Indépendante (CEI) de 2005 à 2010, il a ensuite exercé les fonctions de Ministre-Gouverneur du District Autonome d'Abidjan (2011-2023), où il a conduit les grands chantiers de modernisation de la métropole abidjanaise (4e et 5e ponts, échangeurs, réhabilitation urbaine, Jeux de la Francophonie 2017). Nommé Premier Ministre par S.E.M. Alassane Ouattara en octobre 2023 et reconduit en janvier 2026, il coordonne avec rigueur l'action gouvernementale, le Plan National de Développement (PND) et les grands investissements publics stratégiques au bénéfice direct des populations.",
    "leader_education": [
      "Diplôme d'Ingénieur des Travaux Publics - ENSTP Yamoussoukro",
      "Spécialisation en Béton Précontraint et Ouvrages d'Art - CHEC Paris",
      "Certificat de Hautes Études en Gestion de Projets Publics"
    ],
    "leader_experience": [
      "Premier Ministre, Chef du Gouvernement (2023 - Présent)",
      "Ministre-Gouverneur du District Autonome d'Abidjan (2011 - 2023)",
      "Président de la Commission Électorale Indépendante - CEI (2005 - 2010)",
      "Directeur des Grands Travaux et Infrastructures (DCGTx / BNETD)"
    ],
    "mission_summary": "Coordination de l'ensemble de l'action gouvernementale, arbitrage interministériel des politiques publiques, pilotage et mise en œuvre du Plan National de Développement (PND), suivi régulier de l'exécution des investissements publics majeurs et conduite du dialogue social et politique républicain.",
    "organigramme_summary": [
      "Cabinet du Premier Ministre (Directeur de Cabinet, Chefs de Cabinet, Conseillers Spéciaux)",
      "Secrétariat Général du Gouvernement (SGG)",
      "Bureau National d'Études Techniques et de Développement (BNETD)",
      "Centre d'Information et de Communication Gouvernementale (CICG)",
      "Comité National de Pilotage des Partenariats Public-Privé (CNP-PPP)",
      "Secrétariat Exécutif du Conseil National de Sécurité (CNS)"
    ],
    "organigramme_details": [
      {
        "title": "Cabinet & Coordination Centrale",
        "items": [
          "Directeur de Cabinet et Directeurs Adjoints",
          "Chef de Cabinet et Conseillers Spéciaux",
          "Pôles Sectoriels d'Arbitrage et d'Évaluation des Politiques Publiques"
        ]
      },
      {
        "title": "Grandes Agences & Services Rattachés",
        "items": [
          "BNETD (Bureau National d'Études Techniques et de Développement)",
          "CICG (Centre d'Information et de Communication Gouvernementale)",
          "CNP-PPP (Comité National de Pilotage des PPP)",
          "Secrétariat Général du Gouvernement (SGG)"
        ]
      }
    ]
  },
  {
    "id": "gov-002",
    "name": "M. TENE BIRAHIMA OUATTARA",
    "role_title": "Vice-Premier Ministre, Ministre de la Défense",
    "department_ministry": "MINISTÈRE DE LA DÉFENSE",
    "category": "VICE_PREMIER_MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919154243.png",
    "website_url": "https://defense.gouv.ci/",
    "facebook_url": "https://www.facebook.com/defense.ci",
    "budget_fcfa": 481041827995,
    "address": "Abidjan Plateau, Boulevard Carde, Cité Administrative",
    "info_officer_name": "M. TAHI EZAN Emmanuel",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Téné Birahima Ouattara est un économiste et gestionnaire de haut niveau. Après des études supérieures en économie et gestion, il a exercé d'importantes responsabilités dans le secteur bancaire et au sein de l'appareil d'État. Ancien Ministre des Affaires Présidentielles, il dirige le Ministère d'État, Ministère de la Défense depuis 2021, avec le rang de Vice-Premier Ministre. Il a orchestré avec succès la modernisation des Forces Armées de Côte d'Ivoire (FACI), la réorganisation de la chaîne de commandement, l'amélioration des conditions de vie des soldats, la création de l'Académie Internationale de Lutte Contre le Terrorisme (AILCT) de Jacqueville et la sanctuarisation de la frontière nord ivoirienne.",
    "leader_education": [
      "Diplôme d'Études Supérieures en Sciences Économiques et Gestion",
      "Formations Spécialisées en Stratégie de Défense et Sécurité Nationale"
    ],
    "leader_experience": [
      "Vice-Premier Ministre, Ministre d'État, Ministre de la Défense (2026 - Présent)",
      "Ministre d'État, Ministre de la Défense (2021 - 2026)",
      "Ministre des Affaires Présidentielles (2012 - 2021)",
      "Président du Conseil Régional du Tchologo"
    ],
    "mission_summary": "Défense de l'intégrité du territoire national, protection des populations et des institutions, modernisation des capacités opérationnelles des Forces Armées (Armée de Terre, de l'Air, Marine Nationale, Gendarmerie), coopération militaire régionale et internationale, lutte contre le terrorisme et la criminalité transfrontalière.",
    "organigramme_summary": [
      "État-Major Général des Armées (EMGA)",
      "Commandement Supérieur de la Gendarmerie Nationale",
      "Direction Générale des Affaires Stratégiques et de la Coopération Militaire",
      "Direction du Matériel et des Équipements des Armées",
      "Académie Internationale de Lutte Contre le Terrorisme (AILCT)",
      "Service de Santé des Armées et Hôpital Militaire d'Abidjan (HMA)"
    ],
    "organigramme_details": [
      {
        "title": "Commandement des Forces",
        "items": [
          "État-Major Général des Armées (Terre, Air, Mer)",
          "Commandement Supérieur de la Gendarmerie Nationale",
          "Unités Spéciales d'Intervention et de Sécurisation des Frontières"
        ]
      },
      {
        "title": "Directions Stratégiques & Écoles de Défense",
        "items": [
          "Académie Internationale de Lutte Contre le Terrorisme (AILCT)",
          "École des Forces Armées (EFA)",
          "Direction du Matériel et de la Logistique Militaire"
        ]
      }
    ]
  },
  {
    "id": "gov-003",
    "name": "Mme ANNE DESIREE OULOTO-LAMIZANA",
    "role_title": "Ministre d'État, Ministre de la Fonction Publique et de la Modernisation de l'Administration",
    "department_ministry": "MINISTÈRE D'ÉTAT, MINISTÈRE DE LA FONCTION PUBLIQUE",
    "category": "MINISTRE_ETAT",
    "gender": "F",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919224319.jpg",
    "website_url": "https://www.fonctionpublique.gouv.ci/",
    "facebook_url": "https://www.facebook.com/Fonctionpublique.ci",
    "budget_fcfa": 45121940916,
    "address": "Abidjan Plateau, Cité Administrative, Tour C, 2e étage",
    "info_officer_name": "M. KONE Zanga",
    "info_officer_title": "Directeur des Affaires Juridiques et du Contentieux (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "Mme Anne Désirée Ouloto est une figure éminente de l'administration ivoirienne et une juriste de formation. Titulaire d'une Maîtrise en Droit Public de l'Université Félix Houphouët-Boigny d'Abidjan, elle a occupé plusieurs portefeuilles ministériels majeurs (Salubrité Urbaine, Solidarité et Cohésion Sociale, Assainissement). À la tête du Ministère de la Fonction Publique, elle a mené des réformes historiques : dématérialisation intégrale des concours administratifs (zéro fraude), instauration du nouveau Statut Général de la Fonction Publique, mise en place du système SIGFAE pour la gestion en temps réel des carrières des 300 000 agents publics et renforcement du dialogue social avec les centrales syndicales.",
    "leader_education": [
      "Maîtrise en Droit Public - Université Félix Houphouët-Boigny Abidjan",
      "Spécialisation en Gestion des Ressources Humaines et Management Public"
    ],
    "leader_experience": [
      "Ministre d'État, Ministre de la Fonction Publique (2021 - Présent)",
      "Présidente du Conseil Régional du Cavally (2018 - Présent)",
      "Ministre de l'Assainissement et de la Salubrité (2018 - 2021)",
      "Ministre de la Solidarité, de la Cohésion Sociale et de l'Indemnisation des Victimes (2016 - 2018)"
    ],
    "mission_summary": "Gestion prévisionnelle des effectifs de l'État, organisation équitable et transparente des concours d'entrée à la fonction publique, modernisation et transformation digitale des services publics, suivi de la carrière et des rémunérations des fonctionnaires, et amélioration continue de la relation usager-administration.",
    "organigramme_summary": [
      "Direction Générale de la Fonction Publique (DGFP)",
      "Direction Générale de la Transformation et Modernisation de l'Administration (DGMTA)",
      "Direction des Concours (DC)",
      "Direction de la Gestion des Carrières et du SIGFAE",
      "École Nationale d'Administration (ENA - Établissement sous tutelle)",
      "Directions Régionales de la Fonction Publique sur l'ensemble du territoire"
    ],
    "organigramme_details": [
      {
        "title": "Administration Centrale & Concours",
        "items": [
          "Direction Générale de la Fonction Publique",
          "Direction des Concours et de la Sécurisation des Épreuves",
          "Direction du Recrutement et de la Gestion Prévisionnelle"
        ]
      },
      {
        "title": "Modernisation & Formation",
        "items": [
          "Direction Générale de la Transformation Administrative",
          "École Nationale d'Administration (ENA)",
          "Centre de Relation Usagers et d'Écoute Citoyenne"
        ]
      }
    ]
  },
  {
    "id": "gov-004",
    "name": "Mme NIALE KABA",
    "role_title": "Ministre d'État, Ministre des Affaires Étrangères et de la Coopération Internationale",
    "department_ministry": "MINISTÈRE D'ÉTAT, MINISTÈRE DES AFFAIRES ÉTRANGÈRES",
    "category": "MINISTRE_ETAT",
    "gender": "F",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919311122.jpg",
    "website_url": "https://diplomatie.gouv.ci/",
    "facebook_url": "https://www.facebook.com/diplomatie.ci",
    "budget_fcfa": 146728395147,
    "address": "Abidjan Plateau, Rue du Commerce, Immeuble diplomatie",
    "info_officer_name": "",
    "info_officer_title": "Direction des Affaires Juridiques et Consulaires (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "Mme Nialé Kaba est une économiste et statisticienne émérite reconnue sur le plan international. Diplômée de la prestigieuse École Nationale Supérieure de Statistique et d'Économie Appliquée (ENSEA) d'Abidjan, elle est également titulaire d'un Diplôme d'Études Approfondies (DEA) en Économie Internationale et Économie du Développement de l'Université Panthéon-Sorbonne et du Centre Européen de Formation des Statisticiens Économistes des Pays en Voie de Développement (CESD) de Paris. Ancienne Ministre déléguée à l'Économie et aux Finances (2012-2016), puis Ministre du Plan et du Développement (2016-2026) où elle a conçu et coordonné avec brio les Plans Nationaux de Développement (PND), elle est nommée Ministre d'État, Ministre des Affaires Étrangères pour porter la diplomatie économique et l'influence globale de la Côte d'Ivoire.",
    "leader_education": [
      "Diplôme d'Ingénieur Statisticien Économiste - ENSEA Abidjan",
      "Diplôme d'Études Supérieures - CESD Paris",
      "DEA en Économie Internationale et du Développement - Université Paris 1 Panthéon-Sorbonne"
    ],
    "leader_experience": [
      "Ministre d'État, Ministre des Affaires Étrangères (2026 - Présent)",
      "Ministre du Plan et du Développement (2016 - 2026)",
      "Ministre auprès du Premier Ministre, chargée de l'Économie et des Finances (2012 - 2016)",
      "Directrice Générale de l'Artisanat et Cadre Dirigeante au BNETD"
    ],
    "mission_summary": "Définition et mise en œuvre de la politique extérieure et diplomatique de la Côte d'Ivoire, renforcement de la coopération bilatérale et multilatérale (ONU, Union Africaine, CEDEAO), promotion de la diplomatie économique et attraction des investissements internationaux, protection et assistance des Ivoiriens vivant à l'étranger.",
    "organigramme_summary": [
      "Secrétariat Général des Affaires Étrangères",
      "Direction Générale des Relations Bilatérales",
      "Direction Générale de la Coopération Multilatérale",
      "Direction Générale du Protocole d'État",
      "Direction Générale des Affaires Juridiques et Consulaires",
      "Réseau mondial des Ambassades et Consulats Généraux de Côte d'Ivoire"
    ],
    "organigramme_details": [
      {
        "title": "Administration Diplomatique Centrale",
        "items": [
          "Secrétariat Général du Ministère",
          "Direction Générale des Relations Bilatérales (Afrique, Europe, Amérique, Asie)",
          "Direction Générale de la Coopération Multilatérale et des Organisations Internationales"
        ]
      },
      {
        "title": "Réseau Diplomatique et Consulaire",
        "items": [
          "Ambassades et Missions Permanentes (ONU New York, Genève, UNESCO Paris, UA Addis-Abeba)",
          "Consulats Généraux et Services Consulaires d'Appui à la Diaspora"
        ]
      }
    ]
  },
  {
    "id": "gov-005",
    "name": "M. JEAN SANSAN KAMBILE",
    "role_title": "Garde des Sceaux, Ministre de la Justice et des Droits de l'Homme",
    "department_ministry": "MINISTÈRE DE LA JUSTICE ET DES DROITS DE L'HOMME",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919336196.jpg",
    "website_url": "https://justice.gouv.ci/",
    "facebook_url": "https://www.facebook.com/justice.ci",
    "budget_fcfa": 135902157171,
    "address": "Abidjan Plateau, Cité Administrative, Tour B",
    "info_officer_name": "M. MEITE Lassana",
    "info_officer_title": "Directeur des Affaires Civiles et Pénales (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Jean Sansan Kambilé est un magistrat hors hiérarchie de grande réputation. Diplômé de l'École Nationale d'Administration (ENA, section Magistrature) et de l'Université Félix Houphouët-Boigny, il a occupé les fonctions de Secrétaire Général du Gouvernement (2010-2016) avant d'être nommé Garde des Sceaux, Ministre de la Justice et des Droits de l'Homme. Il mène avec détermination la refonte du système judiciaire ivoirien : digitalisation des actes (casier judiciaire en ligne, e-justice), création des tribunaux de commerce et du pôle pénal économique et financier, construction de nouvelles cours d'appel et d'établissements pénitentiaires aux normes internationales respectant les droits fondamentaux.",
    "leader_education": [
      "Diplôme de Magistrat - École Nationale d'Administration (ENA)",
      "Maîtrise en Droit Privé - Université Félix Houphouët-Boigny Abidjan"
    ],
    "leader_experience": [
      "Garde des Sceaux, Ministre de la Justice et des Droits de l'Homme (2016 - Présent)",
      "Secrétaire Général du Gouvernement (2010 - 2016)",
      "Magistrat, Juge d'Instruction et Président de Juridiction"
    ],
    "mission_summary": "Garantir une justice indépendante, équitable, accessible et transparente pour tous les justiciables, moderniser les infrastructures judiciaires et pénitentiaires, promouvoir et protéger les droits humains, et adapter le corpus juridique aux exigences du développement économique contemporain.",
    "organigramme_summary": [
      "Direction Générale des Affaires Civiles et des Sceaux",
      "Direction Générale des Affaires Pénales et des Grâces",
      "Direction de l'Administration Pénitentiaire et de la Réinsertion",
      "Direction des Droits de l'Homme et de la Protection Judiciaire",
      "Institut National de Formation Judiciaire (INFJ)",
      "Cours d'Appel, Tribunaux de Première Instance et Sections Détachées"
    ],
    "organigramme_details": [
      {
        "title": "Directions Opérationnelles Judiciaires",
        "items": [
          "Direction des Affaires Civiles et Commerciales",
          "Direction des Affaires Pénales et des Grâces",
          "Pôle Pénal Économique et Financier"
        ]
      },
      {
        "title": "Administration Pénitentiaire & Formation",
        "items": [
          "Direction de l'Administration Pénitentiaire et de la Réinsertion",
          "Institut National de Formation Judiciaire (INFJ - Magistrats et Greffiers)"
        ]
      }
    ]
  },
  {
    "id": "gov-006",
    "name": "Gal. VAGONDO DIOMANDE",
    "role_title": "Ministre de l'Intérieur et de la Sécurité",
    "department_ministry": "MINISTÈRE DE L'INTÉRIEUR ET DE LA SÉCURITÉ",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919359735.jpg",
    "website_url": "https://interieur.gouv.ci/",
    "facebook_url": "https://www.facebook.com/interieur.ci",
    "budget_fcfa": 947962959206,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "Commissaire KOUASSI Jean-Luc",
    "info_officer_title": "Direction de la Communication (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "green_line_number": "100 / 111",
    "leader_bio": "Le Général de Corps d'Armée Vagondo Diomandé est un officier général émérite et un grand serviteur de l'État. Diplômé de l'École Militaire Préparatoire Technique (EMPT) de Bingerville, de l'École des Forces Armées (EFA) de Bouaké et de l'École Supérieure de Guerre de Paris, il a occupé les hautes fonctions de Chef d'État-Major Particulier du Président de la République et Commandant du Groupement de Sécurité du Président de la République (GSPR). Ministre de l'Intérieur et de la Sécurité depuis 2019, il a modernisé la Police Nationale (vidéosurveillance urbaine, police de proximité, nouveaux commissariats), numérisé l'état civil national avec l'ONECI et renforcé l'administration territoriale pour assurer la paix et la tranquillité publique.",
    "leader_education": [
      "Brevet d'Études Militaires Supérieures - École Supérieure de Guerre Paris",
      "Diplôme d'Officier d'Infanterie - École des Forces Armées (EFA) Bouaké",
      "Baccalauréat Scientifique - EMPT Bingerville"
    ],
    "leader_experience": [
      "Ministre de l'Intérieur et de la Sécurité (2019 - Présent)",
      "Chef d'État-Major Particulier du Président de la République (2013 - 2019)",
      "Commandant du Groupement de Sécurité du Président de la République - GSPR (2011 - 2013)"
    ],
    "mission_summary": "Garantir l'ordre public, la sécurité intérieure des personnes et des biens, assurer l'administration territoriale à travers les Préfets et Sous-Préfets, encadrer la décentralisation des collectivités locales, moderniser l'état civil et piloter la protection civile et le secours aux populations.",
    "organigramme_summary": [
      "Direction Générale de la Police Nationale (DGPN)",
      "Direction Générale de l'Administration du Territoire (DGAT - Préfets & Sous-Préfets)",
      "Direction Générale de la Décentralisation et du Développement Local (DGDDL)",
      "Office National de l'État Civil et de l'Identification (ONECI)",
      "Office National de la Protection Civile (ONPC - Sapeurs-Pompiers Civils)",
      "Direction de la Surveillance du Territoire (DST)"
    ],
    "organigramme_details": [
      {
        "title": "Sécurité Publique & Police Nationale",
        "items": [
          "Direction Générale de la Police Nationale (DGPN)",
          "Préfectures de Police d'Abidjan et de l'Intérieur",
          "Direction de la Police Judiciaire et Police Scientifique",
          "Centre de Vidéoprotection Urbaine (Projet Ville Sûre)"
        ]
      },
      {
        "title": "Administration Territoriale & État Civil",
        "items": [
          "Direction Générale de l'Administration du Territoire (DGAT)",
          "Office National de l'État Civil et de l'Identification (ONECI)",
          "Office National de la Protection Civile (ONPC)"
        ]
      }
    ]
  },
  {
    "id": "gov-007",
    "name": "M. ADAMA COULIBALY",
    "role_title": "Ministre de l'Économie, des Finances et du Budget",
    "department_ministry": "MINISTÈRE DE L'ÉCONOMIE, DES FINANCES ET DU BUDGET",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919380556.jpg",
    "website_url": "https://finances.gouv.ci/",
    "facebook_url": "https://www.facebook.com/finances.ci",
    "budget_fcfa": 2038854932647,
    "address": "Abidjan Plateau, Avenue Marchand, Immeuble SCIAM",
    "info_officer_name": "Mme OUATTARA Assita",
    "info_officer_title": "Chargée de Communication (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Adama Coulibaly est un économiste et haut commis de l'État d'une très vaste expérience. Titulaire d'un Doctorat d'État en Sciences Économiques de l'Université de Paris II Panthéon-Assas, il a débuté une brillante carrière internationale comme Économiste Principal au Programme des Nations Unies pour le Développement (PNUD), avant de rejoindre l'administration ivoirienne en tant que Directeur de Cabinet du Ministre de l'Économie et des Finances. Nommé Ministre de l'Économie et des Finances en 2019, son portefeuille est élargi au Budget en 2023. Il est l'architecte de la consolidation budgétaire, de la gestion exemplaire de la dette souveraine (notations internationales BB/Ba3), de la digitalisation fiscale et douanière et de la mobilisation record des ressources pour financer les grands projets d'infrastructures de la Côte d'Ivoire.",
    "leader_education": [
      "Doctorat d'État en Sciences Économiques - Université Panthéon-Assas Paris 2",
      "Diplôme d'Études Approfondies (DEA) en Macroéconomie et Finances Internationales"
    ],
    "leader_experience": [
      "Ministre de l'Économie, des Finances et du Budget (2023 - Présent)",
      "Ministre de l'Économie et des Finances (2019 - 2023)",
      "Directeur de Cabinet du Ministère de l'Économie et des Finances (2014 - 2019)",
      "Économiste Principal et Conseiller Économique au PNUD"
    ],
    "mission_summary": "Préparation et exécution des Lois de Finances de l'État, pilotage de la politique macroéconomique et financière, optimisation de la collecte des recettes fiscales et douanières, gestion rigoureuse de la dette publique et de la trésorerie de l'État, régulation du secteur bancaire et des assurances, et préservation de la souveraineté financière nationale.",
    "organigramme_summary": [
      "Direction Générale du Budget et des Finances (DGBF)",
      "Direction Générale des Impôts (DGI)",
      "Direction Générale des Douanes (DGD)",
      "Direction Générale du Trésor et de la Comptabilité Publique (DGTCP)",
      "Direction Générale de l'Économie (DGE)",
      "Agence Judiciaire de l'État (AJE)"
    ],
    "organigramme_details": [
      {
        "title": "Régies Financières & Recettes de l'État",
        "items": [
          "Direction Générale des Impôts (DGI - Dématérialisation e-impôts)",
          "Direction Générale des Douanes (DGD - Guichet Unique Sydonia)",
          "Direction Générale du Trésor et de la Comptabilité Publique (DGTCP - TrésorPay)"
        ]
      },
      {
        "title": "Programmation Budgétaire & Économie",
        "items": [
          "Direction Générale du Budget et des Finances (DGBF - Système SIGBUD)",
          "Direction Générale de l'Économie et de la Prévision Macroéconomique"
        ]
      }
    ]
  },
  {
    "id": "gov-008",
    "name": "M. MAMADOU SANGAFOWA COULIBALY",
    "role_title": "Ministre des Mines, du Pétrole et de l'Énergie",
    "department_ministry": "MINISTÈRE DES MINES, DU PÉTROLE ET DE L'ÉNERGIE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919397827.jpg",
    "website_url": "https://energie.gouv.ci/",
    "facebook_url": "https://www.facebook.com/energie.ci",
    "budget_fcfa": 706060209015,
    "address": "Abidjan Plateau, Rue Thomasset, Immeuble Postel 2001",
    "info_officer_name": "M. TOURE Mamadou",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Mamadou Sangafowa-Coulibaly est un cadre dirigeant et leader politique ivoirien. Diplômé en sciences économiques et gestion, il a été Ministre de l'Agriculture pendant près d'une décennie (2010-2020) où il a conduit la réforme structurelle des filières agricoles. Nommé à la tête du Ministère des Mines, du Pétrole et de l'Énergie en 2022, il pilote le boom énergétique et minier de la Côte d'Ivoire : développement des gisements pétroliers géants 'Baleine' (zéro émission nette) et 'Calao', accélération du Programme National d'Électrification Rurale (PRONER) atteignant un taux de couverture historique, développement des énergies solaires (centrales de Boundiali, Korhogo) et valorisation des minerais stratégiques (or, nickel, manganèse, coltan).",
    "leader_education": [
      "Maîtrise en Sciences Économiques et Gestion d'Entreprises",
      "Formations Spécialisées en Économie de l'Énergie et des Ressources Extractives"
    ],
    "leader_experience": [
      "Ministre des Mines, du Pétrole et de l'Énergie (2022 - Présent)",
      "Ministre de l'Agriculture et du Développement Rural (2010 - 2020)",
      "Député de la Nation à l'Assemblée Nationale"
    ],
    "mission_summary": "Développement et valorisation des gisements pétroliers, gaziers et miniers, transition énergétique vers les sources renouvelables (solaire, biomasse, hydroélectricité), électrification intégrale de toutes les localités ivoiriennes, et garantie de la sécurité d'approvisionnement en produits pétroliers et électricité à coûts compétitifs.",
    "organigramme_summary": [
      "Direction Générale des Hydrocarbures (DGH)",
      "Direction Générale de l'Énergie (DGE)",
      "Direction Générale des Mines et de la Géologie (DGMG)",
      "PETROCI Holding (Société Nationale d'Opérations Pétrolières)",
      "CI-ENERGIES (Société des Énergies de Côte d'Ivoire)",
      "SODEMI (Société de Développement Minier de Côte d'Ivoire)"
    ],
    "organigramme_details": [
      {
        "title": "Hydrocarbures & Ressources Minières",
        "items": [
          "Direction Générale des Hydrocarbures (Suivi gisements Baleine & Calao)",
          "Direction Générale des Mines et de la Géologie (Cadastre Minier)",
          "PETROCI Holding et SODEMI"
        ]
      },
      {
        "title": "Énergie & Électrification Rurale",
        "items": [
          "Direction Générale de l'Énergie",
          "CI-ENERGIES (Programme National d'Électrification Rurale PRONER)",
          "Compagnie Ivoirienne d'Électricité (CIE - Opérateur délégué)"
        ]
      }
    ]
  },
  {
    "id": "gov-009",
    "name": "M. BRUNO NABAGNE KONE",
    "role_title": "Ministre de l'Agriculture, du Développement Rural et des Productions Vivrières",
    "department_ministry": "MINISTÈRE DE L'AGRICULTURE, DU DÉVELOPPEMENT RURAL ET DES PRODUCTIONS VIVRIÈRES",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919423849.jpg",
    "website_url": "https://agriculture.gouv.ci/",
    "facebook_url": "https://www.facebook.com/agriculture.ci",
    "budget_fcfa": 337932332542,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. KOFFI Kouassi",
    "info_officer_title": "Directeur de la Documentation (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Bruno Nabagné Koné est un économiste et gestionnaire de haut rang diplômé de l'École Supérieure de Commerce d'Abidjan (ESCA) et du Centre d'Études Financières, Économiques et Bancaires (CEFEB) de Paris. Ancien Directeur Général Adjoint de France Télécom / Orange Côte d'Ivoire, il a occupé successivement les postes de Ministre des TIC et Porte-Parole du Gouvernement (2011-2018), puis Ministre de la Construction, du Logement et de l'Urbanisme (2018-2023). À la tête du grand Ministère de l'Agriculture, du Développement Rural et des Productions Vivrières, il met son expertise managériale au service de la souveraineté alimentaire de la Côte d'Ivoire, de la transformation locale intégrale du cacao et de l'anacarde, et de l'amélioration substantielle des revenus des agriculteurs ivoiriens.",
    "leader_education": [
      "Diplôme d'Études Supérieures de Commerce - ESCA Abidjan",
      "Diplôme du CEFEB Paris (Gestion Financière et Bancaire)"
    ],
    "leader_experience": [
      "Ministre de l'Agriculture, du Développement Rural et des Productions Vivrières (2026 - Présent)",
      "Ministre de la Construction, du Logement et de l'Urbanisme (2018 - 2026)",
      "Ministre de la Poste et des Technologies de l'Information, Porte-Parole du Gouvernement (2011 - 2018)",
      "Directeur Général Adjoint - Orange Côte d'Ivoire"
    ],
    "mission_summary": "Assurer la souveraineté alimentaire nationale par l'essor des cultures vivrières (riz, maïs, manioc, maraîchers), moderniser et mécaniser l'agriculture familiale, encadrer les filières de rente (cacao, café, anacarde, hévéa, palmier à huile), développer les infrastructures hydro-agricoles et désenclaver les bassins de production rurale.",
    "organigramme_summary": [
      "Direction Générale du Développement Rural",
      "Direction Générale des Productions Vivrières et de la Sécurité Alimentaire",
      "Direction Générale des Productions Agricoles",
      "Conseil du Café-Cacao (Organe de régulation sous tutelle)",
      "Conseil du Coton et de l'Anacarde (Organe de régulation sous tutelle)",
      "Agence Nationale d'Appui au Développement Rural (ANADER)"
    ],
    "organigramme_details": [
      {
        "title": "Développement Rural & Vivrier",
        "items": [
          "Direction Générale des Productions Vivrières (Programme National Riziculture)",
          "Agence Nationale d'Appui au Développement Rural (ANADER)",
          "Direction de la Mécanisation et des Aménagements Hydro-Agricoles"
        ]
      },
      {
        "title": "Filières d'Exportation & Agro-Industrie",
        "items": [
          "Conseil du Café-Cacao (Suivi des revenus des producteurs)",
          "Conseil du Coton et de l'Anacarde",
          "Fonds Interprofessionnel pour la Recherche et le Conseil Agricoles (FIRCA)"
        ]
      }
    ]
  },
  {
    "id": "gov-010",
    "name": "M. AMADOU KONE",
    "role_title": "Ministre des Transports et des Affaires Maritimes",
    "department_ministry": "MINISTÈRE DES TRANSPORTS ET DES AFFAIRES MARITIMES",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919446971.jpg",
    "website_url": "https://transports.gouv.ci/",
    "facebook_url": "https://www.facebook.com/transports.gouv.ci",
    "budget_fcfa": 307769615082,
    "address": "Abidjan Plateau, Rue Thomasset, Immeuble Postel 2001",
    "info_officer_name": "M. SAMAKE Ibrahim",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Amadou Koné est un ingénieur géographe et aménagiste du territoire diplômé de l'Université Félix Houphouët-Boigny et du Centre de Télédétection Appliquée. Ancien Ministre de l'Intégration Africaine et Administrateur à la Banque Africaine de Développement (BAD), il dirige le Ministère des Transports depuis 2017. Il est le bâtisseur de la révolution de la mobilité en Côte d'Ivoire : déploiement du Métro d'Abidjan (Ligne 1), système de vidéo-verbalisation et permis à points, renouvellement du parc automobile des transporteurs (taxis, minicars, camions), modernisation de la SOTRA étendue à l'intérieur du pays (Bouaké, Yamoussoukro, Korhogo, San-Pédro), et modernisation des aéroports et ports autonomes.",
    "leader_education": [
      "Diplôme d'Ingénieur Géographe et Aménagiste du Territoire",
      "Certificat Supérieur en Économie des Transports et Financement des Infrastructures"
    ],
    "leader_experience": [
      "Ministre des Transports et des Affaires Maritimes (2017 - Présent)",
      "Maire de la Commune de Bouaké (2023 - Présent)",
      "Administrateur pour la Côte d'Ivoire à la Banque Africaine de Développement - BAD (2011 - 2017)",
      "Ministre de l'Intégration Africaine (2007 - 2010)"
    ],
    "mission_summary": "Modernisation des infrastructures et systèmes de transport multimodal (terrestre, ferroviaire, aérien, maritime et lagunaire), renforcement de la sécurité routière par la digitalisation, régulation du secteur des transports, et pilotage des grands projets de mobilité urbaine (Métro, BRT, extension SOTRA).",
    "organigramme_summary": [
      "Direction Générale des Transports Terrestres et de la Circulation (DGTTC)",
      "Direction Générale des Affaires Maritimes et Portuaires (DGAMP)",
      "Société des Transports Abidjanais (SOTRA)",
      "Autorité Nationale de l'Aviation Civile (ANAC)",
      "Ports Autonomes d'Abidjan (PAA) et de San-Pédro (PASP)",
      "Office de Sécurité Routière (OSER)"
    ],
    "organigramme_details": [
      {
        "title": "Mobilité Urbaine & Sécurité Routière",
        "items": [
          "Direction Générale des Transports Terrestres",
          "Société des Transports Abidjanais (SOTRA)",
          "Office de Sécurité Routière (OSER - Système de Permis à Points)"
        ]
      },
      {
        "title": "Aérien, Maritime & Ports",
        "items": [
          "Ports Autonomes d'Abidjan et de San-Pédro",
          "Autorité Nationale de l'Aviation Civile (ANAC)",
          "Direction Générale des Affaires Maritimes"
        ]
      }
    ]
  },
  {
    "id": "gov-011",
    "name": "M. AMÉDÉ KOFFI KOUAKOU",
    "role_title": "Ministre de l'Hydraulique, de l'Assainissement et de la Salubrité",
    "department_ministry": "MINISTÈRE DE L'HYDRAULIQUE, DE L'ASSAINISSEMENT ET DE LA SALUBRITÉ",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919467844.jpg",
    "website_url": "https://assainissement.gouv.ci/",
    "facebook_url": "https://www.facebook.com/assainissement.ci",
    "budget_fcfa": 504985369765,
    "address": "Abidjan Plateau, Cité Administrative, Tour D",
    "info_officer_name": "M. BAMBA Lanciné",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Amedé Koffi Kouakou est un ingénieur d'élite et docteur en génie civil. Diplômé de l'École Nationale Supérieure des Travaux Publics (ENSTP) de Yamoussoukro et Docteur de la prestigieuse École Nationale des Ponts et Chaussées (ENPC) de Paris, il a été Directeur Général du Laboratoire du Bâtiment et des Travaux Publics (LBTP) pendant plus d'une décennie. Ancien Ministre des Infrastructures Économiques et de l'Équipement Routier où il a supervisé la construction de milliers de kilomètres d'autoroutes et de routes bitumées, il dirige le grand Ministère de l'Hydraulique, de l'Assainissement et de la Salubrité. Il y conduit le programme présidentiel 'Eau pour Tous' (forages, châteaux d'eau, stations de traitement d'eau potable), la construction des grands canaux de drainage pour protéger les populations des inondations et la modernisation de la salubrité urbaine.",
    "leader_education": [
      "Doctorat en Génie Civil et Matériaux - École Nationale des Ponts et Chaussées (ENPC) Paris",
      "Diplôme d'Ingénieur des Travaux Publics - ENSTP Yamoussoukro"
    ],
    "leader_experience": [
      "Ministre de l'Hydraulique, de l'Assainissement et de la Salubrité (2026 - Présent)",
      "Ministre de l'Équipement et de l'Entretien Routier (2017 - 2026)",
      "Président du Conseil Régional du Lôh-Djiboua (2018 - Présent)",
      "Directeur Général du Laboratoire du Bâtiment et des Travaux Publics - LBTP (2004 - 2017)"
    ],
    "mission_summary": "Garantir l'accès universel à l'eau potable salubre sur tout le territoire national, concevoir et entretenir les réseaux d'assainissement et de drainage des eaux pluviales pour prévenir les inondations, organiser la collecte, le traitement et la valorisation des déchets solides ménagers et promouvoir la salubrité publique.",
    "organigramme_summary": [
      "Direction Générale de l'Hydraulique Humaine (DGHH)",
      "Direction Générale de l'Assainissement et du Drainage (DGAD)",
      "Direction Générale de la Salubrité et de l'Économie Circulaire",
      "Office National de l'Eau Potable (ONEP - Maîtrise d'ouvrage publique)",
      "Société de Distribution d'Eau de la Côte d'Ivoire (SODECI - Exploitant)",
      "Agence Nationale de Gestion des Déchets (ANAGED)"
    ],
    "organigramme_details": [
      {
        "title": "Eau Potable & Hydraulique",
        "items": [
          "Office National de l'Eau Potable (ONEP - Programme Eau pour Tous)",
          "Direction Générale de l'Hydraulique Humaine",
          "SODECI (Société concessionnaire du service d'eau)"
        ]
      },
      {
        "title": "Assainissement, Drainage & Salubrité",
        "items": [
          "Direction Générale de l'Assainissement et du Drainage (Ouvrages anti-inondations)",
          "Agence Nationale de Gestion des Déchets (ANAGED - Centres d'enfouissement technique)",
          "Brigade de Salubrité et Police de l'Environnement Urbain"
        ]
      }
    ]
  },
  {
    "id": "gov-012",
    "name": "M. MAMADOU TOURE",
    "role_title": "Ministre de la Promotion de la Jeunesse, de l'Insertion Professionnelle et du Service Civique, Porte-Parole Adjoint du Gouvernement",
    "department_ministry": "MINISTÈRE DE LA PROMOTION DE LA JEUNESSE, DE L'INSERTION PROFESSIONNELLE ET DU SERVICE CIVIQUE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919485095.jpg",
    "website_url": "https://jeunesse.gouv.ci/",
    "facebook_url": "https://www.facebook.com/jeunesse.ci",
    "budget_fcfa": 88949349037,
    "address": "Abidjan Plateau, Avenue Jean Paul II, Immeuble CNPS",
    "info_officer_name": "M. KOUASSI Serge",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Mamadou Touré est un leader politique dynamique engagé pour la jeunesse et l'entrepreneuriat. Titulaire d'un Master en Diplomatie et Relations Internationales du Centre d'Études Diplomatiques et Stratégiques (CEDS) de Paris et d'un Executive MBA de HEC Paris, il a été Conseiller Spécial du Président de la République chargé de la Jeunesse et des Sports. À la tête du Ministère depuis 2018, il a déployé avec un impact massif le Programme Jeunesse du Gouvernement (PJ-GOUV) : insertion professionnelle de plus de 1,5 million de jeunes, stages d'apprentissage, financements de projets d'entrepreneuriat via l'Agence Emploi Jeunes, et formation aux valeurs civiques et citoyennes dans les centres de service civique de Bimbresso, Guingréni et Bouaké.",
    "leader_education": [
      "Executive MBA - HEC Paris",
      "Master en Diplomatie et Relations Internationales - CEDS Paris",
      "Maîtrise en Droit des Affaires"
    ],
    "leader_experience": [
      "Ministre de la Promotion de la Jeunesse et du Service Civique, Porte-parole adjoint du Gouvernement (2018 - Présent)",
      "Président du Conseil Régional du Haut-Sassandra (2023 - Présent)",
      "Secrétaire d'État chargé de l'Enseignement Technique et de la Formation Professionnelle (2017 - 2018)",
      "Conseiller Spécial à la Présidence de la République (2011 - 2017)"
    ],
    "mission_summary": "Accompagnement, formation et insertion professionnelle de la jeunesse ivoirienne, financement des micro-entreprises et initiatives de jeunes, promotion du volontariat et du civisme républicain, et coordination des programmes multisectoriels en faveur de l'emploi des jeunes.",
    "organigramme_summary": [
      "Agence Emploi Jeunes (AEJ - Guichet unique de l'emploi)",
      "Office du Service Civique National (OSCN)",
      "Direction Générale de la Jeunesse",
      "Direction Générale de l'Insertion Professionnelle",
      "Direction du Volontariat et de l'Engagement Citoyen"
    ],
    "organigramme_details": [
      {
        "title": "Insertion Professionnelle & Emploi",
        "items": [
          "Agence Emploi Jeunes (AEJ - Financements et Stages)",
          "Direction de l'Appui à l'Auto-Emploi et aux Startups Jeunes",
          "Guichets Régionaux Emploi Jeunes"
        ]
      },
      {
        "title": "Civisme & Engagement Citoyen",
        "items": [
          "Office du Service Civique National (OSCN - Centres de Service Civique)",
          "Direction du Volontariat et des Bénévoles pour le Développement"
        ]
      }
    ]
  },
  {
    "id": "gov-013",
    "name": "M. PIERRE DIMBA",
    "role_title": "Ministre de la Santé, de l'Hygiène Publique et de la Couverture Maladie Universelle",
    "department_ministry": "MINISTÈRE DE LA SANTÉ, DE L'HYGIÈNE PUBLIQUE ET DE LA COUVERTURE MALADIE UNIVERSELLE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919496715.jpg",
    "website_url": "https://sante.gouv.ci/",
    "facebook_url": "https://www.facebook.com/sante.ci",
    "budget_fcfa": 817868452462,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "Dr KOFFI Charles",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Pierre N'Gou Dimba est un ingénieur des travaux publics et gestionnaire de grands projets d'État diplômé de l'ENSTP de Yamoussoukro. Ancien Directeur Général d'AGEROUTE où il a géré des programmes d'infrastructures de plusieurs milliers de milliards FCFA, il est nommé Ministre de la Santé en 2021. Il conduit la métamorphose du système sanitaire ivoirien : construction et réhabilitation massive d'hôpitaux (CHR d'Aboisso, San-Pédro, Man, Korhogo, Odienné, CHU de Yopougon réhabilité, CHU d'Abobo), ouverture de plus de 1 000 Établissements Sanitaires de Premier Contact (ESPC) en milieu rural, déploiement généralisé de la Couverture Maladie Universelle (CMU) avec plus de 15 millions d'assurés, et refonte de la Nouvelle Pharmacie de la Santé Publique pour éliminer les ruptures de médicaments.",
    "leader_education": [
      "Diplôme d'Ingénieur des Travaux Publics - ENSTP Yamoussoukro",
      "Formations Spécialisées en Gestion Hospitalière et Économie de la Santé"
    ],
    "leader_experience": [
      "Ministre de la Santé, de l'Hygiène Publique et de la Couverture Maladie Universelle (2021 - Présent)",
      "Président du Conseil Régional de l'Agnéby-Tiassa (2018 - Présent)",
      "Directeur Général de l'Agence de Gestion des Routes - AGEROUTE (2017 - 2021)",
      "Coordonnateur de Projets d'Infrastructures Financés par la Banque Mondiale"
    ],
    "mission_summary": "Assurer la protection sanitaire de l'ensemble de la population, garantir l'accès universel aux soins de qualité à coûts abordables via la Couverture Maladie Universelle (CMU), moderniser les plateaux techniques hospitaliers (CHU, CHR, HG, ESPC), sécuriser la disponibilité des médicaments essentiels et veiller à la sécurité épidémiologique nationale.",
    "organigramme_summary": [
      "Direction Générale de la Santé Publique (DGSP)",
      "Caisse Nationale d'Assurance Maladie (CNAM - CMU)",
      "Nouvelle Pharmacie de la Santé Publique (Nouvelle PSP-CI)",
      "Institut National de l'Hygiène Publique (INHP)",
      "SAMU de Côte d'Ivoire (Secours Médical d'Urgence)",
      "Réseau National des CHU (Treichville, Cocody, Yopougon, Bouaké, Angré, Abobo) et CHR"
    ],
    "organigramme_details": [
      {
        "title": "Soins Médicaux & Assurance Maladie",
        "items": [
          "Caisse Nationale d'Assurance Maladie (CNAM - Couverture Maladie Universelle)",
          "Direction Générale de la Santé Publique (Soins hospitaliers et de proximité)",
          "SAMU et Médecine d'Urgence"
        ]
      },
      {
        "title": "Médicaments & Hygiène Publique",
        "items": [
          "Nouvelle Pharmacie de la Santé Publique (Nouvelle PSP)",
          "Institut National de l'Hygiène Publique (INHP - Vaccination et Épidémiologie)",
          "Institut Pasteur de Côte d'Ivoire (IPCI)"
        ]
      }
    ]
  },
  {
    "id": "gov-014",
    "name": "M. MOUSSA SANOGO",
    "role_title": "Ministre de l'Urbanisme, du Logement et du Cadre de Vie",
    "department_ministry": "MINISTÈRE DE L'URBANISME, DU LOGEMENT ET DU CADRE DE VIE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919514664.jpg",
    "website_url": "https://construction.gouv.ci/",
    "facebook_url": "https://www.facebook.com/construction.ci",
    "budget_fcfa": 131771209724,
    "address": "Abidjan Plateau, Immeuble CCIA",
    "info_officer_name": "Mme YAO Christine",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Moussa Sanogo est un économiste et statisticien financier de haut niveau. Diplômé de l'ENSEA d'Abidjan et de l'Université Panthéon-Sorbonne de Paris, il a occupé les fonctions de Directeur de la Prévision Économique, puis de Secrétaire d'État, puis Ministre du Budget et du Portefeuille de l'État (2019-2023) où il a conduit la bascule réussie vers le budget-programme. À la tête du Ministère de l'Urbanisme, du Logement et du Cadre de Vie, il accélère la production de logements décents à prix abordables, la sécurisation du foncier urbain (digitalisation du titre foncier et de l'ACD), l'éradication des constructions anarchiques et l'embellissement des cadres de vie urbains.",
    "leader_education": [
      "Ingénieur Statisticien Économiste - ENSEA Abidjan",
      "Diplôme d'Études Supérieures Spécialisées en Finance - Université Paris 1 Panthéon-Sorbonne"
    ],
    "leader_experience": [
      "Ministre de l'Urbanisme, du Logement et du Cadre de Vie (2026 - Présent)",
      "Ministre du Budget et du Portefeuille de l'État (2019 - 2023)",
      "Secrétaire d'État auprès du Premier Ministre, chargé du Budget (2017 - 2019)",
      "Directeur Général Adjoint du Budget"
    ],
    "mission_summary": "Planification urbaine et schéma directeur des agglomérations, promotion du logement social et économique, sécurisation foncière urbaine et délivrance dématérialisée des Arrêtés de Concession Définitive (ACD), contrôle de la conformité des constructions (Permis de Construire) et amélioration du cadre de vie.",
    "organigramme_summary": [
      "Direction Générale du Logement et du Cadre de Vie",
      "Direction Générale de l'Urbanisme et du Foncier",
      "Guichet Unique du Foncier et de l'Habitat",
      "Agence Nationale de l'Habitat (ANAH)",
      "Guichet Unique du Permis de Construire (GUPC)"
    ],
    "organigramme_details": [
      {
        "title": "Logement & Habitat",
        "items": [
          "Agence Nationale de l'Habitat (ANAH - Logements sociaux et économiques)",
          "Direction Générale du Logement",
          "Guichet Unique du Permis de Construire"
        ]
      },
      {
        "title": "Urbanisme & Foncier Urbain",
        "items": [
          "Direction Générale de l'Urbanisme et du Foncier (Délivrance de l'ACD)",
          "Système Intégré de Gestion du Foncier Urbain (SIGFU)",
          "Brigade de Contrôle des Constructions et de l'Urbanisme"
        ]
      }
    ]
  },
  {
    "id": "gov-015",
    "name": "M. SIDI TIEMOKO TOURE",
    "role_title": "Ministre des Ressources Animales et Halieutiques",
    "department_ministry": "MINISTÈRE DES RESSOURCES ANIMALES ET HALIEUTIQUES",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919528934.jpg",
    "website_url": "https://ressourcesanimales.gouv.ci/",
    "facebook_url": "https://www.facebook.com/ressourcesanimales.ci",
    "budget_fcfa": 26700912028,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. Salifou OUEDRAOGO",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Sidi Tiémoko Touré est un cadre supérieur et homme politique ivoirien. Diplômé de l'Institut National Supérieur de l'Enseignement Technique (INSET) de Yamoussoukro, titulaire d'un Master en Gestion et Marketing et auditeur du Centre de Perfectionnement aux Affaires (CPA/HEC Paris), il a été Directeur de Cabinet du Président de la République, puis Ministre de la Promotion de la Jeunesse, et Ministre de la Communication et Porte-Parole du Gouvernement. Nommé Ministre des Ressources Animales et Halieutiques en 2021, il conduit la politique nationale de souveraineté en protéines animales (Plan Stratégique PONADEP) pour réduire la dépendance aux importations de poissons, volailles et viandes bovines.",
    "leader_education": [
      "Diplôme Supérieur de Gestion - INSET Yamoussoukro",
      "Master en Marketing et Management - CPA / HEC Paris"
    ],
    "leader_experience": [
      "Ministre des Ressources Animales et Halieutiques (2021 - Présent)",
      "Ministre de la Communication et des Médias, Porte-parole du Gouvernement (2018 - 2021)",
      "Ministre de la Promotion de la Jeunesse et de l'Emploi des Jeunes (2015 - 2018)",
      "Chef de Cabinet à la Présidence de la République (2011 - 2015)"
    ],
    "mission_summary": "Accroître la production nationale de viandes, de volailles et d'œufs, développer l'aquaculture et la pisciculture commerciale, préserver et réguler les ressources halieutiques marines et lagunaires, et veiller à la santé animale et à la sécurité sanitaire des aliments.",
    "organigramme_summary": [
      "Direction Générale des Productions et Industries Animales",
      "Direction Générale de la Pêche et de l'Aquaculture",
      "Direction des Services Vétérinaires",
      "Direction de la Nutrition Animale et des Pâturages",
      "Centres Régionaux de Promotion de l'Élevage et de la Pisciculture"
    ],
    "organigramme_details": [
      {
        "title": "Élevage & Productions Animales",
        "items": [
          "Direction des Productions Animales (Bovins, Ovins, Porcins, Volailles)",
          "Direction des Services Vétérinaires (Contrôle sanitaire et abattoirs)",
          "Laboratoire National d'Appui au Développement Agricole (LANADA)"
        ]
      },
      {
        "title": "Pêche & Aquaculture",
        "items": [
          "Direction Générale de la Pêche et de l'Aquaculture",
          "Centres Aquacoles Régionaux et Débarcadères Modernes"
        ]
      }
    ]
  },
  {
    "id": "gov-016",
    "name": "Mme MARIATOU KONE",
    "role_title": "Ministre du Portefeuille de l'État et des Entreprises Publiques",
    "department_ministry": "MINISTÈRE DU PORTEFEUILLE DE L'ÉTAT ET DES ENTREPRISES PUBLIQUES",
    "category": "MINISTRE",
    "gender": "F",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919546578.jpg",
    "website_url": "https://patrimoine.gouv.ci/",
    "facebook_url": "https://www.facebook.com/patrimoine.ci",
    "budget_fcfa": 49213125398,
    "address": "Abidjan Plateau, Cité Administrative, Tour D",
    "info_officer_name": "M. KOUADIO Yao",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "Le Professeur Mariatou Koné est une universitaire de premier plan et femme d'État ivoirienne. Première femme ivoirienne Professeure Titulaire d'Anthropologie à l'Université Félix Houphouët-Boigny d'Abidjan, elle a dirigé l'Institut d'Ethnosociologie. Reconnue pour sa rigueur et son intégrité, elle a été Ministre de la Solidarité, de la Cohésion Sociale et de l'Indemnisation des Victimes (2016-2021), puis Ministre de l'Éducation Nationale et de l'Alphabétisation (2021-2026) où elle a conduit les historiques États Généraux de l'Éducation Nationale (EGENA). Nommée à la tête du Ministère du Portefeuille de l'État et des Entreprises Publiques, elle supervise la gouvernance, la performance financière et la rentabilité économique des sociétés d'État et participations publiques.",
    "leader_education": [
      "Doctorat d'État en Anthropologie Sociale - Université Félix Houphouët-Boigny Abidjan",
      "Diplôme d'Études Approfondies (DEA) en Sciences Sociales - EHESS Paris"
    ],
    "leader_experience": [
      "Ministre du Portefeuille de l'État et des Entreprises Publiques (2026 - Présent)",
      "Ministre de l'Éducation Nationale et de l'Alphabétisation (2021 - 2026)",
      "Ministre de la Solidarité, de la Cohésion Sociale et de la Lutte contre la Pauvreté (2016 - 2021)",
      "Directrice Coordinatrice du Programme National de Cohésion Sociale - PNCS (2012 - 2016)"
    ],
    "mission_summary": "Superviser la gestion et la performance des entreprises publiques et des sociétés d'État, veiller à l'application des règles de bonne gouvernance d'entreprise et d'audit, valoriser les participations financières de l'État et garantir la rentabilité des investissements publics.",
    "organigramme_summary": [
      "Direction Générale du Portefeuille de l'État (DGPE)",
      "Direction de l'Audit et du Contrôle de Gestion des Sociétés Publiques",
      "Direction de la Stratégie, des Restructurations et des Participations",
      "Comité de Suivi de la Performance des Conseils d'Administration"
    ],
    "organigramme_details": [
      {
        "title": "Gouvernance & Surveillance des Entreprises Publiques",
        "items": [
          "Direction Générale du Portefeuille de l'État (DGPE)",
          "Direction de l'Audit et des Systèmes d'Information Financiers",
          "Pôle de Surveillance des Conseils d'Administration et Sociétés d'État"
        ]
      },
      {
        "title": "Valorisation du Patrimoine Public",
        "items": [
          "Direction des Participations et des Investissements Stratégiques de l'État",
          "Direction de la Restructuration et de la Modernisation des Entreprises Publiques"
        ]
      }
    ]
  },
  {
    "id": "gov-017",
    "name": "M. AMADOU COULIBALY",
    "role_title": "Ministre de la Communication, Porte-Parole du Gouvernement",
    "department_ministry": "MINISTÈRE DE LA COMMUNICATION",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919568897.jpg",
    "website_url": "https://communication.gouv.ci/",
    "facebook_url": "https://www.facebook.com/communication.gouv.ci",
    "budget_fcfa": 39806735298,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. TRAORE Bakary",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Amadou Coulibaly est un communicant et cadre d'État expérimenté. Titulaire d'une Maîtrise d'Histoire et diplômé en communication et relations publiques, il a été Directeur des Services de Renseignement Extérieur de la Présidence de la République. Ministre de la Communication et Porte-Parole du Gouvernement depuis 2021, il pilote avec succès la stratégie d'information publique, la modernisation des médias d'État (RTI, AIP), l'appui à la presse privée et la mise en œuvre effective de la loi d'accès à l'information publique (CAIDP).",
    "leader_education": [
      "Maîtrise en Histoire et Relations Internationales - Université d'Abidjan",
      "Diplôme Supérieur en Communication Stratégique et Médias"
    ],
    "leader_experience": [
      "Ministre de la Communication, Porte-Parole du Gouvernement (2021 - Présent)",
      "Député de la Nation à l'Assemblée Nationale (Circonscription de Korhogo)",
      "Directeur des Services de Renseignement Extérieur à la Présidence (2015 - 2021)",
      "Conseiller en Communication à la Présidence de la République"
    ],
    "mission_summary": "Conception et diffusion de la communication gouvernementale, régulation et soutien des médias publics et privés, promotion de la liberté de la presse, modernisation de la Radiodiffusion Télévision Ivoirienne (RTI) et de l'Agence Ivoirienne de Presse (AIP), et garantie de l'accès du citoyen aux informations publiques.",
    "organigramme_summary": [
      "Direction Générale de la Communication",
      "Commission d'Accès à l'Information d'Intérêt Public (CAIDP - Tutelle)",
      "Haute Autorité de la Communication Audiovisuelle (HACA)",
      "Radiodiffusion Télévision Ivoirienne (RTI)",
      "Agence Ivoirienne de Presse (AIP)",
      "Fonds de Soutien et de Développement de la Presse (FSDP)"
    ],
    "organigramme_details": [
      {
        "title": "Communication & Médias Publics",
        "items": [
          "Direction Générale de la Communication",
          "RTI (Radiodiffusion Télévision Ivoirienne)",
          "AIP (Agence Ivoirienne de Presse)"
        ]
      },
      {
        "title": "Transparence & Régulation",
        "items": [
          "CAIDP (Commission d'Accès à l'Information d'Intérêt Public)",
          "HACA (Haute Autorité de la Communication Audiovisuelle)",
          "Fonds de Soutien et de Développement de la Presse (FSDP)"
        ]
      }
    ]
  },
  {
    "id": "gov-018",
    "name": "M. JACQUES ASSAHORÉ KONAN",
    "role_title": "Ministre des Eaux et Forêts",
    "department_ministry": "MINISTÈRE DES EAUX ET FORÊTS",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919584643.jpg",
    "website_url": "https://eauxetforets.gouv.ci/",
    "facebook_url": "https://www.facebook.com/eauxetforets.ci",
    "budget_fcfa": 106197582643,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "Colonel YAO Kouadio",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Jacques Assahoré Konan est un haut fonctionnaire des finances publiques diplômé de l'École Nationale d'Administration (ENA, section Trésor) et titulaire d'un DESS en Finances Publiques. Directeur Général du Trésor et de la Comptabilité Publique de 2016 à 2023, il a mené avec éclat la digitalisation du Trésor (TrésorMoney/TrésorPay, certification ISO 9001). Nommé Ministre des Eaux et Forêts en 2023, il met ses compétences managériales au service de la restauration du couvert forestier ivoirien (Plan '1 Jour, 1 Million d'Arbres' et objectif 20% de couvert forestier national), de la lutte contre l'orpaillage clandestin et de la préservation des parcs et réserves nationaux.",
    "leader_education": [
      "Diplôme Supérieur de l'ENA (Section Trésor)",
      "DESS en Finances Publiques et Gestion Économique"
    ],
    "leader_experience": [
      "Ministre des Eaux et Forêts (2023 - Présent)",
      "Président du Conseil Régional du Gbêkê (2023 - Présent)",
      "Directeur Général du Trésor et de la Comptabilité Publique (2016 - 2023)",
      "Député de la Nation à l'Assemblée Nationale"
    ],
    "mission_summary": "Restauration, protection et gestion durable du domaine forestier national, surveillance et valorisation de la faune sauvage, préservation des ressources en eau et des zones humides, lutte contre la déforestation et le sciage illégal, et gestion des parcs et réserves naturels.",
    "organigramme_summary": [
      "Direction Générale des Forêts et de la Faune",
      "Direction Générale des Ressources en Eau",
      "Société de Développement des Forêts (SODEFOR)",
      "Office Ivoirien des Parcs et Réserves (OIPR)",
      "Direction de la Police Forestière et de la Répression des Fraudes"
    ],
    "organigramme_details": [
      {
        "title": "Protection Forestière & Faune",
        "items": [
          "Direction Générale des Forêts et de la Faune",
          "SODEFOR (Société de Développement des Forêts)",
          "OIPR (Office Ivoirien des Parcs et Réserves - Parcs de Taï, Comoé, etc.)"
        ]
      },
      {
        "title": "Police Forestière & Ressources en Eau",
        "items": [
          "Direction de la Police Forestière (Lutte anti-déforestation)",
          "Direction Générale des Ressources en Eau"
        ]
      }
    ]
  },
  {
    "id": "gov-019",
    "name": "M. IBRAHIM KALIL KONATÉ",
    "role_title": "Ministre du Commerce, de l'Industrie et de l'Artisanat",
    "department_ministry": "MINISTÈRE DU COMMERCE, DE L'INDUSTRIE ET DE L'ARTISANAT",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920630424.jpg",
    "website_url": "https://commerce.gouv.ci/",
    "facebook_url": "https://www.facebook.com/commerce.ci",
    "budget_fcfa": 96866871722,
    "address": "Abidjan Plateau, Rue Thomasset, Immeuble Postel 2001",
    "info_officer_name": "Mme KONATE Bintou",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Ibrahim Kalil Konaté est un cadre dirigeant et gestionnaire d'entreprises. Titulaire d'un diplôme d'études supérieures en sciences de gestion et management, il a été Président du Conseil Régional du Hambol avant d'être nommé au Gouvernement. À la tête du Ministère du Commerce, de l'Industrie et de l'Artisanat, il pilote avec fermeté la lutte contre la vie chère (plafonnement des prix des denrées de première nécessité, surveillance des marchés), l'aménagement des grandes zones industrielles (Akoupé-Zeudji, PK 24, zones économiques spéciales de l'intérieur) et la professionnalisation du secteur artisanal ivoirien.",
    "leader_education": [
      "Diplôme Supérieur en Gestion d'Entreprises et Commerce International",
      "Certificat de Management Stratégique et Négociation Commerciale"
    ],
    "leader_experience": [
      "Ministre du Commerce, de l'Industrie et de l'Artisanat (2026 - Présent)",
      "Ministre de la Transition Numérique et de la Digitalisation (2023 - 2026)",
      "Président du Conseil Régional du Hambol (2018 - Présent)",
      "Directeur Général et Chef d'Entreprise"
    ],
    "mission_summary": "Régulation du marché intérieur, lutte active contre la vie chère et contrôle strict des prix des produits de première nécessité, promotion des exportations, industrialisation accélérée et transformation locale des matières premières, et encadrement du secteur artisanal.",
    "organigramme_summary": [
      "Direction Générale du Commerce Intérieur",
      "Direction Générale du Commerce Extérieur",
      "Direction Générale de l'Industrie",
      "Direction Générale de l'Artisanat",
      "Conseil National de Lutte contre la Vie Chère (CNLVC)",
      "Agence pour le Développement Industriel (AGEDI)"
    ],
    "organigramme_details": [
      {
        "title": "Commerce & Régulation des Prix",
        "items": [
          "Direction Générale du Commerce Intérieur (Brigade de contrôle des prix)",
          "Conseil National de Lutte contre la Vie Chère (CNLVC)",
          "Direction du Commerce Extérieur et de la Promotion des Exportations"
        ]
      },
      {
        "title": "Industrie & Artisanat",
        "items": [
          "Direction Générale de l'Industrie (Zones industrielles PK24, San-Pédro)",
          "Chambre Nationale de Métiers de Côte d'Ivoire (CNMCI)"
        ]
      }
    ]
  },
  {
    "id": "gov-020",
    "name": "M. SIANDOU FOFANA",
    "role_title": "Ministre du Tourisme et des Loisirs",
    "department_ministry": "MINISTÈRE DU TOURISME ET DES LOISIRS",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/17691961796.jpg",
    "website_url": "https://tourisme.gouv.ci/",
    "facebook_url": "https://www.facebook.com/tourisme.ci",
    "budget_fcfa": 19207286052,
    "address": "Abidjan Plateau, Rue Thomasset, Immeuble Postel 2001",
    "info_officer_name": "M. KOUASSI Norbert",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Siandou Fofana est un financier et économiste diplômé de l'Institut des Hautes Études Commerciales (IHEC). Ancien Directeur Général du Fonds d'Entretien Routier (FER), il est à la tête du Ministère du Tourisme depuis 2017. Concepteur visionnaire de la stratégie nationale 'Sublime Côte d'Ivoire' (3 200 milliards FCFA d'investissements publics et privés), il a positionné la Côte d'Ivoire dans le Top 5 des destinations touristiques et d'affaires en Afrique (succès de la CAN 2023, tourisme balnéaire à Assinie et Grand-Bassam, écotourisme dans l'Ouest et à Man).",
    "leader_education": [
      "Diplôme d'Études Supérieures en Finance et Gestion - IHEC",
      "Formations Spécialisées en Économie Touristique et Grands Investissements"
    ],
    "leader_experience": [
      "Ministre du Tourisme et des Loisirs (2017 - Présent)",
      "Président du Conseil Exécutif de l'Organisation Mondiale du Tourisme - OMT (2021 - 2023)",
      "Directeur Général du Fonds d'Entretien Routier - FER (2009 - 2017)"
    ],
    "mission_summary": "Développement et promotion de l'industrie touristique et hôtelière ivoirienne, mise en œuvre de la stratégie 'Sublime Côte d'Ivoire', valorisation du patrimoine touristique et culturel, régulation des établissements d'hébergement et de loisirs et valorisation de la destination.",
    "organigramme_summary": [
      "Direction Générale du Tourisme et de l'Hôtellerie",
      "Direction Générale des Loisirs",
      "Côte d'Ivoire Tourisme (Office National du Tourisme)",
      "Guichet Unique du Tourisme et de l'Investissement Touristique",
      "Directions Régionales du Tourisme"
    ],
    "organigramme_details": [
      {
        "title": "Promotion & Stratégie Touristique",
        "items": [
          "Côte d'Ivoire Tourisme (Promotion internationale de la destination)",
          "Direction Générale du Tourisme et des Investissements 'Sublime CI'"
        ]
      },
      {
        "title": "Régulation & Loisirs",
        "items": [
          "Direction de la Réglementation et du Contrôle Hôtelier",
          "Direction Générale des Loisirs et des Parcs d'Attraction"
        ]
      }
    ]
  },
  {
    "id": "gov-021",
    "name": "M. SOULEYMANE DIARRASSOUBA",
    "role_title": "Ministre du Plan et du Développement",
    "department_ministry": "MINISTÈRE DU PLAN ET DU DÉVELOPPEMENT",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919671644.jpg",
    "website_url": "https://plan.gouv.ci/",
    "facebook_url": "https://www.facebook.com/plan.ci",
    "budget_fcfa": 44194260102,
    "address": "Abidjan Plateau, Rue Thomasset, Immeuble Postel 2001",
    "info_officer_name": "M. KONE Souleymane",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Souleymane Diarrassouba est un éminent banquier et dirigeant d'institutions financières panafricaines. Diplômé de l'Institut National Supérieur de l'Enseignement Technique (INSET) de Yamoussoukro, titulaire d'un DESS en Banque et Finance et diplômé de l'INSEAD et de Harvard Business School, il a été Directeur Général du Groupe Atlantic Business International (Banque Atlantique) et Président de l'Association Professionnelle des Banques et Établissements Financiers de Côte d'Ivoire (APBEF-CI). Après avoir conduit avec brio le Ministère du Commerce et de l'Industrie (2017-2026), il est nommé à la tête du Ministère du Plan et du Développement pour piloter la prospective économique, l'évaluation d'impact des politiques publiques et la mise en œuvre du nouveau PND 2026-2030.",
    "leader_education": [
      "Diplôme Supérieur de Gestion - INSET Yamoussoukro",
      "DESS en Banque et Finances Internationales",
      "Executive Education - Harvard Business School & INSEAD"
    ],
    "leader_experience": [
      "Ministre du Plan et du Développement (2026 - Présent)",
      "Ministre du Commerce et de l'Industrie (2017 - 2026)",
      "Président de l'Association Professionnelle des Banques et Établissements Financiers - APBEF-CI (2011 - 2017)",
      "Directeur Général du Groupe Atlantic Business International (ABI)"
    ],
    "mission_summary": "Planification stratégique du développement socio-économique national, formulation et suivi-évaluation du Plan National de Développement (PND), production et analyse des statistiques officielles nationales, coordination des études démographiques et prospective économique.",
    "organigramme_summary": [
      "Direction Générale du Plan",
      "Institut National de la Statistique (INS - Recensement et enquêtes nationales)",
      "Office National de la Population (ONP)",
      "Direction Générale de la Prospective et de la Stratégie",
      "Direction de la Programmation et de l'Évaluation des Projets Publics"
    ],
    "organigramme_details": [
      {
        "title": "Planification & Prospective",
        "items": [
          "Direction Générale du Plan (Coordination PND 2026-2030)",
          "Direction Générale de la Prospective et des Études Stratégiques"
        ]
      },
      {
        "title": "Statistiques & Démographie",
        "items": [
          "Institut National de la Statistique (INS)",
          "Office National de la Population (ONP)"
        ]
      }
    ]
  },
  {
    "id": "gov-022",
    "name": "M. ADAMA DIAWARA",
    "role_title": "Ministre de l'Enseignement Supérieur et de la Recherche Scientifique",
    "department_ministry": "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919691144.png",
    "website_url": "https://enseignementsup.gouv.ci/",
    "facebook_url": "https://www.facebook.com/enseignementsup.ci",
    "budget_fcfa": 344706305890,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "Prof. KRA Yao",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "Le Professeur Adama Diawara est un éminent universitaire et chercheur en physique. Professeur Titulaire de Physique de l'Atmosphère à l'Université Félix Houphouët-Boigny d'Abidjan, il est l'auteur de dizaines de publications scientifiques internationales de référence et a été Conseiller à la Présidence de la République chargé de l'Éducation et de la Recherche. Ministre de l'Enseignement Supérieur depuis 2020, il pilote la décentralisation universitaire historique de la Côte d'Ivoire (ouverture des Universités de San-Pédro, Man, Bondoukou, Daloa, Korhogo), l'alignement des diplômes LMD sur les besoins concrets des entreprises, et l'amélioration des bourses et logements universitaires (CROU).",
    "leader_education": [
      "Doctorat d'État en Physique de l'Atmosphère - Université de Cocody Abidjan",
      "Diplôme d'Études Approfondies (DEA) en Énergétique et Transferts Thermiques"
    ],
    "leader_experience": [
      "Ministre de l'Enseignement Supérieur et de la Recherche Scientifique (2020 - Présent)",
      "Conseiller Spécial du Président de la République chargé de l'Éducation (2011 - 2020)",
      "Professeur Titulaire des Universités (CAMES)"
    ],
    "mission_summary": "Développement et modernisation de l'enseignement supérieur public et privé, promotion de la recherche scientifique et des innovations technologiques, orientation et employabilité des étudiants, gestion des œuvres universitaires (CROU : restauration, hébergement, bourses).",
    "organigramme_summary": [
      "Direction Générale de l'Enseignement Supérieur (DGES)",
      "Direction Générale de la Recherche et de l'Innovation (DGRI)",
      "Centres Régionaux des Œuvres Universitaires (CROU Abidjan 1 & 2, Bouaké, Daloa, Korhogo, San-Pédro)",
      "Réseau des Universités Publiques (UFHB, Nangui Abrogoua, Alassane Ouattara, Jean Lorougnon Guédé, Péléforo Gon Coulibaly, Man, San-Pédro, Bondoukou)",
      "Institut National Polytechnique Félix Houphouët-Boigny (INP-HB)"
    ],
    "organigramme_details": [
      {
        "title": "Universités & Grandes Écoles",
        "items": [
          "Direction Générale de l'Enseignement Supérieur",
          "Universités Publiques et Privées",
          "INP-HB de Yamoussoukro"
        ]
      },
      {
        "title": "Recherche & Vie Étudiante",
        "items": [
          "Direction Générale de la Recherche et de l'Innovation",
          "Centres Régionaux des Œuvres Universitaires (CROU - Logements et Restauration)",
          "Direction des Bourses et des Aides Universitaires"
        ]
      }
    ]
  },
  {
    "id": "gov-023",
    "name": "M. ADAMA KAMARA",
    "role_title": "Ministre de l'Emploi, de la Protection Sociale et de la Formation Professionnelle",
    "department_ministry": "MINISTÈRE DE L'EMPLOI, DE LA PROTECTION SOCIALE ET DE LA FORMATION PROFESSIONNELLE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919714398.jpg",
    "website_url": "https://emploi.gouv.ci/",
    "facebook_url": "https://www.facebook.com/emploi.ci",
    "budget_fcfa": 91411414044,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. YEO Klotioloma",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Adama Kamara est un avocat d'affaires de renom international et homme politique. Titulaire d'une Maîtrise en Droit Privé et inscrit aux Barreaux de Paris et de Côte d'Ivoire, il a conseillé de grands groupes multinationaux et des institutions financières majeures. Nommé Ministre de l'Emploi et de la Protection Sociale en 2021, il a révolutionné la sécurité sociale en Côte d'Ivoire en créant la 'Ronde de la CMU et du RSTI' (Régime Social des Travailleurs Indépendants), permettant aux commerçants, agriculteurs, artisans et transporteurs de bénéficier pour la première fois d'une pension de retraite et d'une assurance maladie universelle.",
    "leader_education": [
      "Maîtrise en Droit Privé et Droit des Affaires - Université Félix Houphouët-Boigny",
      "Certificat d'Aptitude à la Profession d'Avocat (CAPA) - Barreau de Paris"
    ],
    "leader_experience": [
      "Ministre de l'Emploi, de la Protection Sociale et de la Formation Professionnelle (2021 - Présent)",
      "Député de la Nation à l'Assemblée Nationale (Circonscription de Bressoukro/Kani)",
      "Avocat Associé et Conseiller Juridique auprès de Cabinets Internationaux"
    ],
    "mission_summary": "Régulation des relations de travail et promotion du travail décent, extension des mécanismes de protection sociale (CNPS, CGRAE, CMU, RSTI) aux travailleurs du secteur formel et informel, inspection du travail et prévention des conflits sociaux, et valorisation de la formation professionnelle.",
    "organigramme_summary": [
      "Direction Générale du Travail",
      "Direction Générale de la Protection Sociale",
      "Caisse Nationale de Prévoyance Sociale (CNPS - Salariés et Indépendants)",
      "Caisse Générale de Retraite des Agents de l'État (CGRAE)",
      "Inspection Générale du Travail"
    ],
    "organigramme_details": [
      {
        "title": "Protection Sociale & Retraites",
        "items": [
          "Caisse Nationale de Prévoyance Sociale (CNPS - RSTI et Pension Salariés)",
          "Caisse Générale de Retraite des Agents de l'État (CGRAE)",
          "Direction Générale de la Protection Sociale"
        ]
      },
      {
        "title": "Travail & Relations Sociales",
        "items": [
          "Direction Générale du Travail et de l'Inspection du Travail",
          "Direction de la Santé et Sécurité au Travail"
        ]
      }
    ]
  },
  {
    "id": "gov-024",
    "name": "M. N’GUESSAN KOFFI",
    "role_title": "Ministre de l'Éducation Nationale, de l'Alphabétisation et de l'Enseignement Technique",
    "department_ministry": "MINISTÈRE DE L'ÉDUCATION NATIONALE, DE L'ALPHABÉTISATION ET DE L'ENSEIGNEMENT TECHNIQUE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/17691978842.jpg",
    "website_url": "https://education.gouv.ci/",
    "facebook_url": "https://www.facebook.com/education.ci",
    "budget_fcfa": 1571000767175,
    "address": "Abidjan Plateau, Cité Administrative, Tour B",
    "info_officer_name": "M. TANO Kouamé",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. N'Guessan Koffi est un ingénieur électronicien et grand bâtisseur du système éducatif. Diplômé de l'Institut National Polytechnique de Toulouse (INPT), il a dirigé pendant plus d'une décennie l'Institut National Polytechnique Félix Houphouët-Boigny (INP-HB) de Yamoussoukro qu'il a hissé au rang de pôle d'excellence en Afrique subsaharienne. Ministre de l'Enseignement Technique (2021-2026), puis nommé à la tête du grand Ministère de l'Éducation Nationale et de l'Alphabétisation, il conduit le déploiement de l'École Obligatoire, la construction de milliers de classes primaires et collèges de proximité, l'alphabétisation de masse et le renforcement des compétences fondamentales (lecture, écriture, calcul, sciences).",
    "leader_education": [
      "Diplôme d'Ingénieur en Électronique et Automatisme - INP Toulouse",
      "Diplôme de Hautes Études Technologiques et Pédagogiques"
    ],
    "leader_experience": [
      "Ministre de l'Éducation Nationale, de l'Alphabétisation et de l'Enseignement Technique (2026 - Présent)",
      "Ministre de l'Enseignement Technique, de la Formation Professionnelle et de l'Apprentissage (2021 - 2026)",
      "Directeur Général de l'INP-HB de Yamoussoukro (2011 - 2021)"
    ],
    "mission_summary": "Pilotage du système éducatif national préscolaire, primaire et secondaire général et technique, mise en œuvre de la scolarisation obligatoire jusqu'à 16 ans, recrutement et formation continue des enseignants, organisation des examens à grand tirage (CEPE, BEPC, BAC), et programmes d'alphabétisation.",
    "organigramme_summary": [
      "Direction des Examens et Concours (DECO)",
      "Direction de la Pédagogie et du Développement des Programmes (DPDP)",
      "Direction des Écoles, Lycées et Collèges (DELC)",
      "Direction de l'Alphabétisation et de l'Éducation Non Formelle",
      "Directions Régionales de l'Éducation Nationale et de l'Alphabétisation (DRENA)"
    ],
    "organigramme_details": [
      {
        "title": "Pédagogie & Examens Nationaux",
        "items": [
          "Direction des Examens et Concours (DECO - Sécurisation des diplômes)",
          "Direction de la Pédagogie et des Curricula Scolaires",
          "Direction de l'Encadrement des Établissements Privés"
        ]
      },
      {
        "title": "Infrastructures & Réseau Territorial",
        "items": [
          "DRENA (Directions Régionales dans les 31 Régions et 2 Districts)",
          "Direction des Projets et de la Construction des Écoles"
        ]
      }
    ]
  },
  {
    "id": "gov-025",
    "name": "M. YACOUBA HIEN SIE",
    "role_title": "Ministre des Infrastructures et de l'Entretien Routier",
    "department_ministry": "MINISTÈRE DES INFRASTRUCTURES ET DE L'ENTRETIEN ROUTIER",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920507465.jpg",
    "website_url": "https://equipement.gouv.ci/",
    "facebook_url": "https://www.facebook.com/equipement.ci",
    "budget_fcfa": 734443144925,
    "address": "Abidjan Plateau, Cité Administrative, Tour D",
    "info_officer_name": "M. KOUAME Jean",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Yacouba Hien Sié est un ingénieur des travaux publics et grand bâtisseur d'infrastructures diplômé de l'ENSTP de Yamoussoukro. Directeur Général emblématique du Port Autonome d'Abidjan (PAA) pendant plus de 13 ans (2011-2024), il a conduit la modernisation historique du port (élargissement du canal de Vridi, second terminal à conteneurs TC2, nouveau terminal céréalier). Nommé Ministre des Infrastructures et de l'Entretien Routier, il supervise le réseau routier national de plus de 82 000 km, le réseau autoroutier interurbain (Autoroute du Nord vers Bouaké-Ouangolodougou, côtière Abidjan-San Pédro réhabilitée), la construction des grands ponts et le désenclavement des zones rurales agricoles.",
    "leader_education": [
      "Diplôme d'Ingénieur des Travaux Publics - ENSTP Yamoussoukro",
      "Diplôme Spécialisé en Gestion Portuaire et Grands Travaux Maritimes"
    ],
    "leader_experience": [
      "Ministre des Infrastructures et de l'Entretien Routier (2026 - Présent)",
      "Directeur Général du Port Autonome d'Abidjan - PAA (2011 - 2024)",
      "Député-Maire de la Commune d'Adiaké",
      "Directeur des Travaux et Infrastructures Portuaires"
    ],
    "mission_summary": "Conception, construction et modernisation des routes, autoroutes, ponts et ouvrages d'art stratégiques de Côte d'Ivoire, réhabilitation et entretien permanent du réseau routier national et des pistes rurales pour fluidifier l'économie et le transport des personnes.",
    "organigramme_summary": [
      "Direction Générale des Infrastructures Routières (DGIR)",
      "Agence de Gestion des Routes (AGEROUTE - Maîtrise d'ouvrage déléguée)",
      "Fonds d'Entretien Routier (FER - Financement des travaux)",
      "Laboratoire du Bâtiment et des Travaux Publics (LBTP - Contrôle qualité)",
      "Directions Régionales des Infrastructures Routières"
    ],
    "organigramme_details": [
      {
        "title": "Maîtrise d'Ouvrage & Entretien des Routes",
        "items": [
          "Agence de Gestion des Routes (AGEROUTE - Grands chantiers routiers)",
          "Fonds d'Entretien Routier (FER)",
          "Direction des Ouvrages d'Art et des Grands Ponts"
        ]
      },
      {
        "title": "Contrôle Technique & Pistes Rurales",
        "items": [
          "Laboratoire du Bâtiment et des Travaux Publics (LBTP)",
          "Direction du Désenclavement et des Pistes Rurales"
        ]
      }
    ]
  },
  {
    "id": "gov-026",
    "name": "Mme LOGBOH MYSS BELMONDE DOGO",
    "role_title": "Ministre de la Cohésion Nationale, de la Solidarité et de la Lutte contre la Pauvreté",
    "department_ministry": "MINISTÈRE DE LA COHÉSION NATIONALE, DE LA SOLIDARITÉ ET DE LA LUTTE CONTRE LA PAUVRETÉ",
    "category": "MINISTRE",
    "gender": "F",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/17691986087.jpg",
    "website_url": "https://solidarite.gouv.ci/",
    "facebook_url": "https://www.facebook.com/solidarite.ci",
    "budget_fcfa": 57361750199,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "Mme KONE Fatoumata",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "Mme Logboh Myss Belmonde Dogo est une gestionnaire d'entreprises et femme d'État reconnue pour sa proximité avec les populations vulnérables. Titulaire d'un diplôme supérieur en gestion et audit d'entreprises, elle a été Vice-Présidente de l'Assemblée Nationale et Secrétaire d'État. À la tête du Ministère de la Solidarité, elle pilote le programme phare des Filets Sociaux Productifs (transferts monétaires directs aux familles défavorisées), l'assistance humanitaire rapide lors des sinistres climatiques ou incendies, et la consolidation de la cohésion sociale entre toutes les communautés.",
    "leader_education": [
      "Diplôme Supérieur en Sciences de Gestion et Audit d'Entreprises",
      "Formations Spécialisées en Action Humanitaire et Développement Communautaire"
    ],
    "leader_experience": [
      "Ministre de la Cohésion Nationale, de la Solidarité et de la Lutte contre la Pauvreté (2021 - Présent)",
      "Députée de la Nation à l'Assemblée Nationale (Circonscription de Guibéroua)",
      "Secrétaire d'État auprès du Ministre de la Femme, chargée de l'Autonomisation (2019 - 2021)",
      "Vice-Présidente de l'Assemblée Nationale (2016 - 2019)"
    ],
    "mission_summary": "Assistance sociale et secours d'urgence aux populations vulnérables ou sinistrées, déploiement des transferts monétaires du Programme des Filets Sociaux, promotion du vivre-ensemble, de la réconciliation et du dialogue intercommunautaire pacifique.",
    "organigramme_summary": [
      "Direction Générale de la Solidarité et de l'Action Humanitaire",
      "Direction Générale de la Cohésion Nationale",
      "Programme National des Filets Sociaux Productifs",
      "Observatoire National de la Solidarité et de la Cohésion Sociale (ONCS)",
      "Directions Régionales de la Solidarité"
    ],
    "organigramme_details": [
      {
        "title": "Solidarité & Filets Sociaux",
        "items": [
          "Programme National des Filets Sociaux Productifs (Transferts monétaires directs)",
          "Fonds National de Solidarité et d'Urgence Humanitaire",
          "Direction de la Lutte Contre la Pauvreté"
        ]
      },
      {
        "title": "Cohésion Sociale & Paix",
        "items": [
          "Observatoire National de la Solidarité et de la Cohésion Sociale (ONCS)",
          "Direction de la Prévention et de la Gestion des Conflits Communautaires"
        ]
      }
    ]
  },
  {
    "id": "gov-027",
    "name": "M. DJIBRIL OUATTARA",
    "role_title": "Ministre de la Transition Numérique et de l'Innovation Technologique",
    "department_ministry": "MINISTÈRE DE LA TRANSITION NUMÉRIQUE ET DE L'INNOVATION TECHNOLOGIQUE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920274423.jpg",
    "website_url": "https://numerique.gouv.ci/",
    "facebook_url": "https://www.facebook.com/numerique.ci",
    "budget_fcfa": 83275503595,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "Mme KONATE Bintou épouse DJETOU",
    "info_officer_title": "Directrice des Affaires Juridiques et de la Coopération Internationale (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Djibril Ouattara est un haut dirigeant des technologies de l'information et des télécommunications. Diplômé de l'École Nationale Supérieure d'Ingénieurs de Caen (ENSICAEN) en France et titulaire d'un MBA du Massachusetts Institute of Technology (MIT Sloan School of Management, USA), il a dirigé avec un succès éclatant plusieurs opérateurs majeurs de télécoms (Directeur Général de MTN Côte d'Ivoire, MTN Congo, et Canal+). Nommé Ministre de la Transition Numérique et de l'Innovation Technologique, il accélère la digitalisation intégrale des services publics de l'État, le déploiement du réseau national de fibre optique très haut débit, la cybersécurité et l'émergence des startups tech ivoiriennes.",
    "leader_education": [
      "Master of Business Administration (MBA) - MIT Sloan School of Management (USA)",
      "Diplôme d'Ingénieur en Télécommunications et Informatique - ENSICAEN France"
    ],
    "leader_experience": [
      "Ministre de la Transition Numérique et de l'Innovation Technologique (2026 - Présent)",
      "Directeur Général de MTN Côte d'Ivoire (2019 - 2024)",
      "Directeur Général de MTN Congo et de Canal+ International en Afrique",
      "Ingénieur Conseil Télécoms et Réseaux à l'International"
    ],
    "mission_summary": "Déploiement des infrastructures numériques et du très haut débit (fibre optique, 5G, data centers nationaux), transformation digitale des administrations publiques pour faciliter la vie des citoyens, renforcement de la cybersécurité nationale et soutien à l'écosystème d'innovation tech.",
    "organigramme_summary": [
      "Direction Générale de la Transformation Numérique et de la Digitalisation",
      "Direction Générale de l'Innovation et des Startups",
      "Agence Nationale du Service Universel des Télécommunications (ANSUT)",
      "Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI)",
      "Société Nationale de Développement Informatique (SNDI)"
    ],
    "organigramme_details": [
      {
        "title": "Infrastructures Numériques & Régulation",
        "items": [
          "ANSUT (Agence Nationale du Service Universel des Télécommunications)",
          "ARTCI (Autorité de Régulation des Télécoms et Données Personnelles)",
          "CI-CERT (Autorité Nationale de Cybersécurité)"
        ]
      },
      {
        "title": "Digitalisation des Services Publics & Tech",
        "items": [
          "SNDI (Société Nationale de Développement Informatique)",
          "Direction de la Promotion des Startups et de l'Intelligence Artificielle"
        ]
      }
    ]
  },
  {
    "id": "gov-028",
    "name": "Mme NASSENEBA TOURE",
    "role_title": "Ministre de la Femme, de la Famille et de l'Enfant",
    "department_ministry": "MINISTÈRE DE LA FEMME, DE LA FAMILLE ET DE L'ENFANT",
    "category": "MINISTRE",
    "gender": "F",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919981181.jpg",
    "website_url": "https://famille.gouv.ci/",
    "facebook_url": "https://www.facebook.com/famille.ci",
    "budget_fcfa": 31263058865,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "Dr COULIBALY Kpinna Tiekoura",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "green_line_number": "1308",
    "leader_bio": "Mme Nassénéba Touré est une ingénieure et dirigeante politique ivoirienne. Diplômée en ingénierie de transport et télécommunications aux États-Unis et en Côte d'Ivoire, elle a été Maire emblématique de la Commune d'Odienné pendant plus de dix ans. Ministre de la Femme, de la Famille et de l'Enfant depuis 2021, elle mène des actions décisives pour l'autonomisation économique des femmes (soutien au Fonds FAFCI de la Première Dame), la lutte sans merci contre les Violences Basées sur le Genre (VBG, numéro vert 1308), et la protection des droits des enfants dans les orphelinats et centres de petite enfance (CPPE).",
    "leader_education": [
      "Diplôme d'Ingénieur en Technologies et Télécommunications",
      "Certificat en Leadership Féminin et Politiques Publiques Inclusives"
    ],
    "leader_experience": [
      "Ministre de la Femme, de la Famille et de l'Enfant (2021 - Présent)",
      "Maire de la Commune d'Odienné (2013 - Présent)",
      "Directrice Générale de Côte d'Ivoire Tourisme",
      "Cadre Dirigeante dans le secteur des Télécommunications"
    ],
    "mission_summary": "Promotion des droits des femmes et de l'égalité des chances, appui à l'autonomisation économique et au leadership féminin, protection intégrale des enfants et de la petite enfance (CPPE, orphelinats d'État, adoption), et lutte contre les violences faites aux femmes et aux mineurs.",
    "organigramme_summary": [
      "Direction Générale de la Femme et du Genre",
      "Direction Générale de la Protection de l'Enfant",
      "Direction de la Famille et de l'Assistance Sociale",
      "Observatoire National de l'Équité et du Genre (ONEG)",
      "Centres de Protection de la Petite Enfance (CPPE) et Orphelinats Nationaux"
    ],
    "organigramme_details": [
      {
        "title": "Femme & Autonomisation",
        "items": [
          "Direction Générale de la Femme et du Genre (Programmes FAFCI et Leadership)",
          "Observatoire National de l'Équité et du Genre (ONEG)",
          "Plateforme Nationale de Lutte contre les Violences Basées sur le Genre (VBG 1308)"
        ]
      },
      {
        "title": "Protection de l'Enfance & Famille",
        "items": [
          "Direction Générale de la Protection de l'Enfant",
          "Orphelinats Nationaux (Bingerville, Grand-Bassam)",
          "Centres de Protection de la Petite Enfance (CPPE) sur tout le territoire"
        ]
      }
    ]
  },
  {
    "id": "gov-029",
    "name": "Mme FRANÇOISE REMARCK",
    "role_title": "Ministre de la Culture et de la Francophonie",
    "department_ministry": "MINISTÈRE DE LA CULTURE ET DE LA FRANCOPHONIE",
    "category": "MINISTRE",
    "gender": "F",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176919998326.jpg",
    "website_url": "https://culture.gouv.ci/",
    "facebook_url": "https://www.facebook.com/culture.ci",
    "budget_fcfa": 39771854976,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. Landry PONOU",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "Mme Françoise Remarck est une dirigeante d'entreprises et figure reconnue des industries créatives. Diplômée de l'École Nationale Supérieure d'Architecture de Paris-La Villette et titulaire d'un Executive MBA de HEC Paris, elle a été Présidente-Directrice Générale de Canal+ Côte d'Ivoire, Présidente du Conseil d'Administration de la RTI et Vice-Présidente de la Confédération Générale des Entreprises de Côte d'Ivoire (CGECI). Ministre de la Culture et de la Francophonie depuis 2022, elle structure les Industries Culturelles et Créatives (ICC) comme moteur d'emplois, valorise les sites classés au patrimoine mondial de l'UNESCO (Grand-Bassam, mosquées du Nord) et promeut le rayonnement des artistes et du Marché des Arts du Spectacle d'Abidjan (MASA).",
    "leader_education": [
      "Diplôme d'Architecte - École Nationale Supérieure d'Architecture de Paris-La Villette",
      "Executive MBA - HEC Paris"
    ],
    "leader_experience": [
      "Ministre de la Culture et de la Francophonie (2022 - Présent)",
      "Présidente du Conseil d'Administration de la RTI (Radiodiffusion Télévision Ivoirienne)",
      "Présidente-Directrice Générale de Canal+ Horizon Côte d'Ivoire",
      "Vice-Présidente du Patronat Ivoirien (CGECI)"
    ],
    "mission_summary": "Préservation, protection et valorisation du riche patrimoine culturel, matériel et immatériel ivoirien, soutien à la création artistique et aux industries culturelles créatives (cinéma, musique, arts vivants, mode), protection des droits d'auteur (BURIDA) et renforcement des liens de la Francophonie.",
    "organigramme_summary": [
      "Direction Générale de la Culture",
      "Direction des Arts Plastiques, Visuels et Vivants",
      "Bureau Ivoirien du Droit d'Auteur (BURIDA)",
      "Palais de la Culture Bernard Binlin-Dadié d'Abidjan",
      "Marché des Arts du Spectacle d'Abidjan (MASA)",
      "Office National du Cinéma de Côte d'Ivoire (ONAC-CI)"
    ],
    "organigramme_details": [
      {
        "title": "Industries Créatives & Droits d'Auteur",
        "items": [
          "Bureau Ivoirien du Droit d'Auteur (BURIDA)",
          "Office National du Cinéma (ONAC-CI)",
          "Palais de la Culture d'Abidjan et MASA"
        ]
      },
      {
        "title": "Patrimoine & Francophonie",
        "items": [
          "Direction du Patrimoine Culturel et des Sites UNESCO",
          "Direction de la Francophonie et de la Coopération Culturelle"
        ]
      }
    ]
  },
  {
    "id": "gov-030",
    "name": "M. ADJÉ SILAS METCH",
    "role_title": "Ministre des Sports",
    "department_ministry": "MINISTÈRE DES SPORTS",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920032624.jpg",
    "website_url": "https://sports.gouv.ci/",
    "facebook_url": "https://www.facebook.com/sports.ci",
    "budget_fcfa": 70427777385,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. KOUADIO Yves",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Adjé Silas Metch est un juriste et diplomate chevronné. Titulaire d'une Maîtrise en Droit et diplômé de l'Institut des Hautes Études Internationales, il a servi la diplomatie ivoirienne comme Ambassadeur Extraordinaire et Plénipotentiaire de Côte d'Ivoire en République Démocratique du Congo (RDC). Nommé Ministre des Sports en octobre 2023, il a coordonné avec un succès retentissant l'organisation de la Coupe d'Afrique des Nations (CAN 2023 'la plus belle CAN de l'histoire') et supervise désormais la valorisation et la rentabilisation de l'héritage d'infrastructures sportives de classe mondiale (stades olympiques d'Ebimpé, Bouaké, Korhogo, San-Pédro, Yamoussoukro, Félix Houphouët-Boigny, et les agoras sportives de proximité).",
    "leader_education": [
      "Maîtrise en Droit Privé - Université Félix Houphouët-Boigny",
      "Diplôme Supérieur en Diplomatie et Relations Internationales"
    ],
    "leader_experience": [
      "Ministre des Sports (2023 - Présent)",
      "Ambassadeur Extraordinaire et Plénipotentiaire de Côte d'Ivoire en RDC (2020 - 2023)",
      "Conseiller Diplomatique et Juridique dans les Institutions de la République"
    ],
    "mission_summary": "Développement de la pratique sportive de masse et pour la santé, formation et encadrement des athlètes d'élite et équipes nationales, gestion, entretien et valorisation de l'héritage des grands stades et complexes sportifs de la CAN 2023, et promotion de l'économie sportive.",
    "organigramme_summary": [
      "Direction Générale des Sports",
      "Office National des Sports (ONS - Gestion des stades olympiques et infrastructures)",
      "Institut National de la Jeunesse et des Sports (INJS)",
      "Direction des Fédérations et du Sport de Haut Niveau",
      "Directions Régionales des Sports"
    ],
    "organigramme_details": [
      {
        "title": "Infrastructures Sportives & Héritage CAN",
        "items": [
          "Office National des Sports (ONS - Stades d'Ebimpé, Félicia, Bouaké, Korhogo, San-Pédro, Yamoussoukro)",
          "Programme Agora Sportive (Terrains de sport de proximité dans les communes)"
        ]
      },
      {
        "title": "Formation & Sport de Haut Niveau",
        "items": [
          "Institut National de la Jeunesse et des Sports (INJS)",
          "Direction Générale des Sports et Soutien aux Fédérations"
        ]
      }
    ]
  },
  {
    "id": "gov-031",
    "name": "M. ABOU BAMBA",
    "role_title": "Ministre de l'Environnement et de la Transition Écologique",
    "department_ministry": "MINISTÈRE DE L'ENVIRONNEMENT ET DE LA TRANSITION ÉCOLOGIQUE",
    "category": "MINISTRE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920299166.jpg",
    "website_url": "https://environnement.gouv.ci/",
    "facebook_url": "https://www.facebook.com/environnement.ci",
    "budget_fcfa": 37734566044,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. DOH Celestin",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Abou Bamba est un haut fonctionnaire international et spécialiste mondial de l'environnement et du développement durable. Titulaire d'un Diplôme d'Ingénieur Agronome et d'un Master en Gestion des Écosystèmes de l'Université de Reading (Royaume-Uni), il a exercé pendant plus de vingt ans aux Nations Unies en tant que Secrétaire Exécutif de la Convention d'Abidjan (Programme des Nations Unies pour l'Environnement - PNUE) et coordonnateur de grands programmes de la Banque Africaine de Développement (BAD). Nommé Ministre de l'Environnement et de la Transition Écologique, il conduit les grands projets de résilience climatique, la protection du littoral contre l'érosion côtière (WACA), l'économie circulaire et la réduction de l'empreinte carbone de la Côte d'Ivoire.",
    "leader_education": [
      "Master en Gestion des Écosystèmes et Écologie - University of Reading (UK)",
      "Diplôme d'Ingénieur Agronome et Environnementaliste"
    ],
    "leader_experience": [
      "Ministre de l'Environnement et de la Transition Écologique (2026 - Présent)",
      "Coordonnateur et Secrétaire Exécutif de la Convention d'Abidjan - PNUE Nations Unies (2010 - 2023)",
      "Expert Principal Environnement et Climat à la Banque Africaine de Développement (BAD)"
    ],
    "mission_summary": "Protection des écosystèmes terrestres, lagunaires et marins, lutte contre l'érosion côtière et le dérèglement climatique, contrôle des pollutions et nuisances industrielles, promotion de l'économie circulaire et des technologies vertes, et conduite des évaluations environnementales stratégiques.",
    "organigramme_summary": [
      "Direction Générale de l'Environnement",
      "Direction Générale du Développement Durable et de la Transition Écologique",
      "Agence Nationale De l'Environnement (ANDE - Études d'impact environnemental)",
      "Centre Ivoirien Anti-Pollution (CIAPOL)",
      "Programme National Climat et Érosion Côtière"
    ],
    "organigramme_details": [
      {
        "title": "Évaluation Environnementale & Climat",
        "items": [
          "Agence Nationale De l'Environnement (ANDE - Études d'Impact Environnemental et Social)",
          "Direction Générale de la Transition Écologique et du Climat",
          "Programme de Résilience Côtière (WACA)"
        ]
      },
      {
        "title": "Lutte contre la Pollution & Contrôle",
        "items": [
          "Centre Ivoirien Anti-Pollution (CIAPOL - Surveillance des eaux et de l'air)",
          "Direction de l'Économie Circulaire et du Recyclage"
        ]
      }
    ]
  },
  {
    "id": "gov-032",
    "name": "M. CÉLESTIN SÉREY DOH",
    "role_title": "Ministre Délégué auprès du Ministre des Transports et des Affaires Maritimes, chargé des Affaires Maritimes",
    "department_ministry": "MINISTÈRE DÉLÉGUÉ CHARGÉ DES AFFAIRES MARITIMES",
    "category": "MINISTRE_DELEGUE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920078677.jpg",
    "website_url": "https://affairesmaritimes.gouv.ci/",
    "facebook_url": "https://www.facebook.com/affairesmaritimes.ci",
    "budget_fcfa": 13192865872,
    "address": "Abidjan Plateau, Rue Thomasset, Immeuble Postel 2001",
    "info_officer_name": "M. KOUASSI Ange",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Célestin Sérey Doh est un administrateur des services financiers et cadre supérieur de l'État. Diplômé de l'ENA et titulaire d'un DESS en gestion financière publique, il a été Secrétaire d'État aux Affaires Maritimes et Président du Conseil Régional du Guémon. Il conduit la montée en puissance de la police maritime, la surveillance des 550 km de côtes et lagunes ivoiriennes, la lutte contre la piraterie maritime et le développement durable de l'économie bleue.",
    "leader_education": [
      "Diplôme Supérieur des Services Financiers - ENA Abidjan",
      "DESS en Gestion Financière et Marchés Publics"
    ],
    "leader_experience": [
      "Ministre Délégué chargé des Affaires Maritimes (2026 - Présent)",
      "Président du Conseil Régional du Guémon (2018 - Présent)",
      "Secrétaire d'État chargé des Affaires Maritimes (2021 - 2023)",
      "Administrateur des Services Financiers de l'État"
    ],
    "mission_summary": "Sécurité et sûreté maritimes dans les eaux territoriales et la Zone Économique Exclusive (ZEE), surveillance des lagunes et voies d'eau intérieures, contrôle technique des navires et embarcations, et promotion de l'économie maritime.",
    "organigramme_summary": [
      "Direction Générale des Affaires Maritimes et Portuaires (DGAMP)",
      "Arrondissements Maritimes d'Abidjan, San-Pédro, Sassandra et Tabou",
      "Direction de la Police Maritime et Fluviale",
      "Direction des Gens de Mer et de la Navigation"
    ],
    "organigramme_details": [
      {
        "title": "Surveillance Maritime & Sécurité",
        "items": [
          "Direction Générale des Affaires Maritimes et Portuaires (DGAMP)",
          "Base Navale des Affaires Maritimes et Vedettes d'Intervention Rapide"
        ]
      },
      {
        "title": "Services Côtiers & Gens de Mer",
        "items": [
          "Arrondissements Maritimes Côtiers (Abidjan, San-Pédro, Sassandra, Tabou)",
          "Direction des Gens de Mer et de la Formation Maritime"
        ]
      }
    ]
  },
  {
    "id": "gov-033",
    "name": "M. ADAMA DOSSO",
    "role_title": "Ministre Délégué auprès du Ministre d'État, Ministre des Affaires Étrangères et de la Coopération Internationale, chargé de l'Intégration Africaine et des Ivoiriens de l'Extérieur",
    "department_ministry": "MINISTÈRE DÉLÉGUÉ CHARGÉ DE L'INTÉGRATION AFRICAINE",
    "category": "MINISTRE_DELEGUE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920195685.jpg",
    "website_url": "https://diplomatie.gouv.ci/",
    "facebook_url": "https://www.facebook.com/diplomatie.ci",
    "budget_fcfa": 5122516889,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. CISSE Yacouba",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Adama Dosso est un diplomate de carrière de premier plan. Titulaire d'une Maîtrise en Droit International et diplômé de l'ENA (section Diplomatie), il a représenté la Côte d'Ivoire en tant qu'Ambassadeur Extraordinaire et Plénipotentiaire en République Populaire de Chine et auprès de plusieurs institutions internationales. Ministre Délégué auprès du Ministre d'État des Affaires Étrangères, il pilote l'intégration régionale au sein de la CEDEAO et de l'Union Africaine (ZLECAf) et la mobilisation active des compétences et investissements de la diaspora ivoirienne.",
    "leader_education": [
      "Diplôme de Diplomate - ENA Abidjan",
      "Maîtrise en Droit International et Sciences Politiques"
    ],
    "leader_experience": [
      "Ministre Délégué chargé de l'Intégration Africaine et des Ivoiriens de l'Extérieur (2026 - Présent)",
      "Ambassadeur Extraordinaire et Plénipotentiaire de Côte d'Ivoire en Chine (2014 - 2023)",
      "Directeur des Organisations Internationales au Ministère des Affaires Étrangères"
    ],
    "mission_summary": "Renforcement des accords d'intégration régionale et sous-régionale (CEDEAO, UEMOA, Union Africaine, ZLECAf), protection, accompagnement et valorisation des Ivoiriens résidant à l'étranger et incitation à leurs investissements dans le développement économique national.",
    "organigramme_summary": [
      "Direction Générale de l'Intégration Africaine",
      "Direction Générale des Ivoiriens de l'Extérieur",
      "Direction de la Promotion des Investissements de la Diaspora",
      "Direction de l'Assistance et de la Protection Consulaire"
    ],
    "organigramme_details": [
      {
        "title": "Intégration Régionale & ZLECAf",
        "items": [
          "Direction Générale de l'Intégration Africaine (CEDEAO, UEMOA, ZLECAf)",
          "Comité National de Suivi de la Zone de Libre-Échange Continentale"
        ]
      },
      {
        "title": "Diaspora Ivoirienne & Investissements",
        "items": [
          "Direction Générale des Ivoiriens de l'Extérieur",
          "Guichet Unique de la Diaspora Ivoirienne"
        ]
      }
    ]
  },
  {
    "id": "gov-034",
    "name": "M. JEAN-LOUIS MOULOT",
    "role_title": "Ministre Délégué auprès du Ministre de l'Éducation Nationale, de l'Alphabétisation et de l'Enseignement Technique, chargé de l'Enseignement Technique",
    "department_ministry": "MINISTÈRE DÉLÉGUÉ CHARGÉ DE L'ENSEIGNEMENT TECHNIQUE",
    "category": "MINISTRE_DELEGUE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920232654.png",
    "website_url": "https://formationprofessionnelle.gouv.ci/",
    "facebook_url": "https://www.facebook.com/formationprofessionnelle.ci",
    "budget_fcfa": 182297493094,
    "address": "Abidjan Plateau, Cité Administrative, Tour B",
    "info_officer_name": "M. TANO Kouamé",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Jean-Louis Moulot est un économiste, aménagiste du territoire et haut commis de l'État. Titulaire d'un DESS en Urbanisme et Aménagement du Territoire et diplômé de l'Université de Montréal (Canada), il a été Directeur de Cabinet Adjoint du Président de la République, puis Directeur Général de la Société pour le Développement Minier de la Côte d'Ivoire (SODEMI) et Maire de la ville historique de Grand-Bassam. Nommé Ministre Délégué chargé de l'Enseignement Technique et de l'Apprentissage, il pilote le déploiement du programme 'L'Académie des Talents' : création de lycées professionnels ultra-modernes dans les régions (Ebimpé, Yamoussoukro, Korhogo, San-Pédro), développement de l'apprentissage par alternance école-entreprise et adéquation parfaite des formations techniques avec les métiers d'avenir.",
    "leader_education": [
      "DESS en Urbanisme et Aménagement Régional - Université de Montréal (Canada)",
      "Maîtrise en Sciences Économiques et Gestion"
    ],
    "leader_experience": [
      "Ministre Délégué chargé de l'Enseignement Technique et de l'Apprentissage (2026 - Présent)",
      "Maire de la Ville Historique de Grand-Bassam (2018 - Présent)",
      "Directeur Général de la SODEMI (2019 - 2026)",
      "Directeur de Cabinet Adjoint à la Présidence de la République (2014 - 2019)"
    ],
    "mission_summary": "Modernisation et extension du réseau des lycées techniques et centres de formation professionnelle, développement des filières d'apprentissage en alternance avec le secteur privé (Académie des Talents), et certification professionnelle des compétences techniques des jeunes.",
    "organigramme_summary": [
      "Direction Générale de la Formation Initiale et Technique",
      "Direction Générale de l'Apprentissage et de la Formation Continue",
      "Direction des Examens, Concours et Certifications Professionnelles (DEXCP)",
      "Réseau National des Lycées Techniques et Centres de Formation Professionnelle (CFP)"
    ],
    "organigramme_details": [
      {
        "title": "Lycées Techniques & Académie des Talents",
        "items": [
          "Direction Générale de la Formation Initiale",
          "Lycées Professionnels Régionaux (Métiers de l'Industrie, du BTP, de l'Agroalimentaire)",
          "Direction des Certifications et Diplômes Professionnels"
        ]
      },
      {
        "title": "Apprentissage & Partenariats Entreprises",
        "items": [
          "Direction de l'Apprentissage et de l'Insertion",
          "Comité National de Concertation École-Entreprise"
        ]
      }
    ]
  },
  {
    "id": "gov-035",
    "name": "M. BERNARD KINI COMOÉ",
    "role_title": "Ministre Délégué auprès du Ministre de l'Agriculture, du Développement Rural et des Productions Vivrières, chargé des Productions Vivrières",
    "department_ministry": "MINISTÈRE DÉLÉGUÉ CHARGÉ DES PRODUCTIONS VIVRIÈRES",
    "category": "MINISTRE_DELEGUE",
    "gender": "M",
    "photo_url": "https://www.gouv.ci/uploads/gouvernement/176920254960.jpg",
    "website_url": "https://agriculture.gouv.ci/",
    "facebook_url": "https://www.facebook.com/agriculture.ci",
    "budget_fcfa": 337932332542,
    "address": "Abidjan Plateau, Cité Administrative, Tour C",
    "info_officer_name": "M. KOFFI Kouassi",
    "info_officer_title": "Responsable de l'Information (RI CAIDP)",
    "info_officer_email": "",
    "info_officer_phone": "",
    "leader_bio": "M. Bernard Kini Comoé est un ingénieur agronome expert en filières vivrières et développement agricole communautaire. Diplômé de l'Institut National Supérieur de l'Enseignement Technique (INSET) et fort de plus de vingt-cinq ans de pratique de terrain aux côtés des coopératives agricoles féminines et des producteurs de manioc, de riz, d'igname et de maraîchers, il a été coordonnateur de grands projets vivriers financés par les bailleurs internationaux. Nommé Ministre Délégué chargé des Productions Vivrières, il met en œuvre la politique d'approvisionnement massif et continu des marchés urbains en produits vivriers locaux à des prix accessibles pour chaque foyer ivoirien.",
    "leader_education": [
      "Diplôme d'Ingénieur Agronome - INSET Yamoussoukro",
      "Certificat Supérieur en Aménagements Hydro-Agricoles et Sécurité Alimentaire"
    ],
    "leader_experience": [
      "Ministre Délégué chargé des Productions Vivrières (2026 - Présent)",
      "Coordonnateur National des Projets d'Appui au Secteur Vivrier",
      "Directeur des Aménagements Vivriers et de la Commercialisation Agricole"
    ],
    "mission_summary": "Intensification de la production de cultures vivrières de base (manioc, maïs, riz, igname, banane plantain, légumes), aménagement des bas-fonds irrigués, organisation de la collecte et de la chaîne du froid, et approvisionnement régulier des marchés de consommation urbains pour stabiliser le coût de la vie.",
    "organigramme_summary": [
      "Direction des Cultures Vivrières et Maraîchères",
      "Direction des Aménagements Hydro-Agricoles Vivriers",
      "Office d'Aide à la Commercialisation des Produits Vivriers (OCPV)",
      "Direction de la Conservation, Transformation et Logistique Vivrière"
    ],
    "organigramme_details": [
      {
        "title": "Production Vivrière & Bas-Fonds",
        "items": [
          "Direction des Cultures Vivrières et Maraîchères",
          "Direction des Aménagements Hydro-Agricoles",
          "Centres Régionaux de Production de Semences Améliorées"
        ]
      },
      {
        "title": "Commercialisation & Marchés de Collecte",
        "items": [
          "Office d'Aide à la Commercialisation des Produits Vivriers (OCPV)",
          "Direction de la Logistique et des Marchés de Gros"
        ]
      }
    ]
  }
];

export const GOVERNMENT_OFFICIALS = GOVERNMENT_DATA;
