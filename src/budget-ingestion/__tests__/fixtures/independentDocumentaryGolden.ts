// INDEPENDENT DOCUMENTARY GOLDEN FIXTURE — PILOT MINISTRIES 2026
// Source Primaire : DGBF DPPD-PAP 2026-2028 (Annexe 4) & Loi de Finances n° 2025-987 (LFI 2026)
// CE FICHIER EST UN CONTRÔLE INDÉPENDANT :
// Il est codé en dur à partir des documents officiels primaires et NE DOIT JAMAIS
// dériver ses valeurs attendues dynamiquement des fichiers JSON canoniques testés.
//
// Invariants vérifiés :
// - Libellés verbatim stricts (aucune paraphrase, aucun raccourci, aucune normalisation moderne)
// - Codes programmes (5 chiffres) et codes actions (7 chiffres)
// - Montants 2026 en FCFA (Crédits de Paiement LFI 2026 et DPPD-PAP Tableau 7)
// - Hiérarchie stricte des rattachements action -> programme

export interface IndependentGoldenAction {
  action_code: string;
  official_name: string;
  amount_2026_fcfa: number;
}

export interface IndependentGoldenProgram {
  program_code: string;
  official_name: string;
  amount_2026_fcfa: number;
  actions: IndependentGoldenAction[];
}

export interface IndependentGoldenMinistry {
  institution_code: string;
  institution_id: string;
  institution_name: string;
  total_budget_2026_fcfa: number;
  programs: IndependentGoldenProgram[];
}

export const INDEPENDENT_DOCUMENTARY_GOLDEN_2026: Record<string, IndependentGoldenMinistry> = {
  'MJDH': {
    institution_code: '325',
    institution_id: 'gov-005',
    institution_name: "Ministère de la Justice et des Droits de l'Homme",
    total_budget_2026_fcfa: 129151307791,
    programs: [
      {
        program_code: '21044',
        official_name: "Administration Générale",
        amount_2026_fcfa: 94913084375,
        actions: [
          {
            action_code: '2104401',
            official_name: "Coordination et animation du ministère",
            amount_2026_fcfa: 3129168169,
          },
          {
            action_code: '2104402',
            official_name: "Gestion des ressources humaines, matérielles et financières",
            amount_2026_fcfa: 90953875528,
          },
          {
            action_code: '2104403',
            official_name: "Planification, programmation et suivi-évaluation",
            amount_2026_fcfa: 644674775,
          },
          {
            action_code: '2104404',
            official_name: "Documentation, gestion des systèmes d'informations et de communication",
            amount_2026_fcfa: 185365903,
          },
        ],
      },
      {
        program_code: '22045',
        official_name: "Juridictions",
        amount_2026_fcfa: 11202593764,
        actions: [
          {
            action_code: '2204501',
            official_name: "Renforcement de l'accès au système judiciaire",
            amount_2026_fcfa: 4799645429,
          },
          {
            action_code: '2204502',
            official_name: "Optimisation de la bonne application de la législation en matière civile et pénale",
            amount_2026_fcfa: 1702214133,
          },
          {
            action_code: '2204503',
            official_name: "Gestion de la formation et de la documentation",
            amount_2026_fcfa: 4428820652,
          },
          {
            action_code: '2204504',
            official_name: "Renforcement de la prise en charge des mineurs en contact avec le système judiciaire",
            amount_2026_fcfa: 271913550,
          },
        ],
      },
      {
        program_code: '22046',
        official_name: "Etablissements pénitentiaires, centres d'observation et de rééducation des mineurs",
        amount_2026_fcfa: 20882892824,
        actions: [
          {
            action_code: '2204601',
            official_name: "Optimisation des conditions de détention",
            amount_2026_fcfa: 16580539172,
          },
          {
            action_code: '2204602',
            official_name: "Amélioration de l'alimentation et de la santé des détenus et des mineurs",
            amount_2026_fcfa: 2440340486,
          },
          {
            action_code: '2204603',
            official_name: "Renforcement du volet apprentissage des détenus et des mineurs",
            amount_2026_fcfa: 288022784,
          },
          {
            action_code: '2204604',
            official_name: "Coordination et suivi de l'exécution des décisions privatives de liberté et amélioration des conditions et du cadre de vie des gardes pénitentiaires et des détenus",
            amount_2026_fcfa: 1573990382,
          },
        ],
      },
      {
        program_code: '22143',
        official_name: "Droits de l'Homme",
        amount_2026_fcfa: 2152736828,
        actions: [
          {
            action_code: '2214301',
            official_name: "Promotion des droits de l'homme",
            amount_2026_fcfa: 772575987,
          },
          {
            action_code: '2214302',
            official_name: "Suivi et protection des droits de l'homme",
            amount_2026_fcfa: 1380160841,
          },
        ],
      },
    ],
  },
  'MEER': {
    institution_code: '330',
    institution_id: 'gov-025',
    institution_name: "Ministère de l'Equipement et de l'Entretien Routier",
    total_budget_2026_fcfa: 734442904943,
    programs: [
      {
        program_code: '21058',
        official_name: "Administration Générale",
        amount_2026_fcfa: 7964881215,
        actions: [
          {
            action_code: '2105801',
            official_name: "Coordination et animation du ministère",
            amount_2026_fcfa: 1372300000,
          },
          {
            action_code: '2105802',
            official_name: "Gestion des ressources financières, matérielles et humaines",
            amount_2026_fcfa: 5937996731,
          },
          {
            action_code: '2105803',
            official_name: "Planification, programmation et suivi-évaluation",
            amount_2026_fcfa: 545245730,
          },
          {
            action_code: '2105804',
            official_name: "Gestion du domaine public de l'Etat",
            amount_2026_fcfa: 26000000,
          },
          {
            action_code: '2105805',
            official_name: "Information et communication",
            amount_2026_fcfa: 83338754,
          },
        ],
      },
      {
        program_code: '22059',
        official_name: "Infrastructures routières et ouvrages d'arts",
        amount_2026_fcfa: 446634263710,
        actions: [
          {
            action_code: '2205901',
            official_name: "Coordination de la mise en œuvre du programme des infrastructures routières et ouvrages d'art",
            amount_2026_fcfa: 2053360830,
          },
          {
            action_code: '2205902',
            official_name: "Construction de nouvelles routes",
            amount_2026_fcfa: 325550231702,
          },
          {
            action_code: '2205903',
            official_name: "Réhabilitation et entretien des infrastructures routières et ouvrages d'art",
            amount_2026_fcfa: 73157239083,
          },
          {
            action_code: '2205904',
            official_name: "Construction des ouvrages d'arts",
            amount_2026_fcfa: 45873432095,
          },
        ],
      },
      {
        program_code: '23219',
        official_name: "Fonds d'Entretien Routier (FER)",
        amount_2026_fcfa: 279843760018,
        actions: [
          {
            action_code: '2321901',
            official_name: "Mobilisation des Ressources Financières du FER",
            amount_2026_fcfa: 64904000000,
          },
          {
            action_code: '2321902',
            official_name: "Financement des Travaux d'entretien du réseau Routier National",
            amount_2026_fcfa: 214939760018,
          },
        ],
      },
    ],
  },
  'MINEDDTE': {
    institution_code: '343',
    institution_id: 'gov-031',
    institution_name: "Ministère de l'Environnement, du Développement Durable et de la Transition Ecologique",
    total_budget_2026_fcfa: 36680067253,
    programs: [
      {
        program_code: '21079',
        official_name: "Administration Générale",
        amount_2026_fcfa: 7918536211,
        actions: [
          {
            action_code: '2107901',
            official_name: "Coordination et animation des activités du ministère",
            amount_2026_fcfa: 1770907974,
          },
          {
            action_code: '2107902',
            official_name: "Gestion des ressources humaines, matérielles et financières",
            amount_2026_fcfa: 5922146067,
          },
          {
            action_code: '2107903',
            official_name: "Gestion des systèmes d'information, de la communication et de la documentation",
            amount_2026_fcfa: 124733000,
          },
          {
            action_code: '2107905',
            official_name: "Planification, programmation, suivi évaluation et statistiques",
            amount_2026_fcfa: 100749170,
          },
        ],
      },
      {
        program_code: '22080',
        official_name: "Environnement et développement durable",
        amount_2026_fcfa: 28761531042,
        actions: [
          {
            action_code: '2208001',
            official_name: "Renforcement de la lutte contre la pollution des matrice environnementale",
            amount_2026_fcfa: 15760649501,
          },
          {
            action_code: '2208002',
            official_name: "Promotion du Développement Durable",
            amount_2026_fcfa: 172532000,
          },
          {
            action_code: '2208003',
            official_name: "Gestion durable des Aires Protégées et de la Biodiversité",
            amount_2026_fcfa: 10433927522,
          },
          {
            action_code: '2208004',
            official_name: "Évaluation environnementale des politiques, plans et programmes sectoriels des projets et organisations",
            amount_2026_fcfa: 296422019,
          },
          {
            action_code: '2208005',
            official_name: "Renforcement de la lutte contre le changement climatique et la résilience des populations",
            amount_2026_fcfa: 2098000000,
          },
        ],
      },
    ],
  },
  'MINEF': {
    institution_code: '345',
    institution_id: 'gov-018',
    institution_name: "Ministère des Eaux et Forêts",
    total_budget_2026_fcfa: 103197582643,
    programs: [
      {
        program_code: '21088',
        official_name: "Administration Générale",
        amount_2026_fcfa: 37824714687,
        actions: [
          {
            action_code: '2108801',
            official_name: "Coordination et animation",
            amount_2026_fcfa: 25361221622,
          },
          {
            action_code: '2108802',
            official_name: "Planification et suivi-évaluation",
            amount_2026_fcfa: 10000000,
          },
          {
            action_code: '2108803',
            official_name: "Gestion des ressources humaines, financières et matérielles",
            amount_2026_fcfa: 11629843065,
          },
          {
            action_code: '2108804',
            official_name: "Information et communication",
            amount_2026_fcfa: 85000000,
          },
          {
            action_code: '2108805',
            official_name: "Protection, contrôle et surveillance des ressources forestières, fauniques et ressources en eau.",
            amount_2026_fcfa: 738650000,
          },
        ],
      },
      {
        program_code: '22089',
        official_name: "Gestion durable des ressources forestières",
        amount_2026_fcfa: 58463516601,
        actions: [
          {
            action_code: '2208901',
            official_name: "Gestion différentielle des forêts du domaine permanent de l'Etat",
            amount_2026_fcfa: 56888366601,
          },
          {
            action_code: '2208902',
            official_name: "Développement du reboisement et reconstitution des forêts du domaine rural",
            amount_2026_fcfa: 727400000,
          },
          {
            action_code: '2208903',
            official_name: "Protection, contrôle et surveillance des forêts et des activités forestières.",
            amount_2026_fcfa: 659750000,
          },
          {
            action_code: '2208904',
            official_name: "Renforcement du cadre d'exploitation rationnelle, de transformation et de commercialisation des produits forestiers",
            amount_2026_fcfa: 152000000,
          },
          {
            action_code: '2208905',
            official_name: "Mise en oeuvre des activités du programme gestion durable des ressources forestières",
            amount_2026_fcfa: 36000000,
          },
        ],
      },
      {
        program_code: '22090',
        official_name: "Gestion durable des ressources fauniques",
        amount_2026_fcfa: 917332688,
        actions: [
          {
            action_code: '2209001',
            official_name: "Renforcement du dispositif de protection des ressources fauniques",
            amount_2026_fcfa: 116672500,
          },
          {
            action_code: '2209002',
            official_name: "Aménagement du zoo, prévention et éradication des zoonoses",
            amount_2026_fcfa: 768410188,
          },
          {
            action_code: '2209003',
            official_name: "Mise en œuvre des activités du programme gestion durable des ressources fauniques",
            amount_2026_fcfa: 32250000,
          },
        ],
      },
      {
        program_code: '22091',
        official_name: "Gestion intégrée des ressources en eau",
        amount_2026_fcfa: 5092018667,
        actions: [
          {
            action_code: '2209101',
            official_name: "Instruction de dossiers de demande d'autorisation de prélèvement d'eau",
            amount_2026_fcfa: 519237737,
          },
          {
            action_code: '2209102',
            official_name: "Élaboration d'une carte de dégradation des états de surface",
            amount_2026_fcfa: 4572780930,
          },
        ],
      },
      {
        program_code: '23228',
        official_name: "Fonds Forestier National",
        amount_2026_fcfa: 900000000,
        actions: [
          {
            action_code: '2322801',
            official_name: "Coordination et gestion des activités du Fonds",
            amount_2026_fcfa: 299250000,
          },
          {
            action_code: '2322802',
            official_name: "Développement de l'activité forestière",
            amount_2026_fcfa: 472500000,
          },
          {
            action_code: '2322803',
            official_name: "Renforcement des capacités opérationnelles des structures du MINEF",
            amount_2026_fcfa: 128250000,
          },
        ],
      },
    ],
  },
  'MAIED': {
    institution_code: '439',
    institution_id: 'gov-033',
    institution_name: "MINISTERE DELEGUE AUPRES DU MINISTRE DES AFFAIRES ETRANGERES, DE L'INTEGRATION AFRICAINE ET DES IVOIRIENS DE L'EXTERIEUR, CHARGE DE L'INTEGRATION AFRICAINE ET DES IVOIRIENS DE L'EXTERIEUR",
    total_budget_2026_fcfa: 5122516889,
    programs: [
      {
        program_code: '21234',
        official_name: "Administration Générale",
        amount_2026_fcfa: 3743491132,
        actions: [
          {
            action_code: '2123401',
            official_name: "Coordination et animation du ministère",
            amount_2026_fcfa: 808104258,
          },
          {
            action_code: '2123402',
            official_name: "Gestion des ressources humaines financières et matérielles",
            amount_2026_fcfa: 2935386874,
          },
        ],
      },
      {
        program_code: '22145',
        official_name: "Intégration Africaine",
        amount_2026_fcfa: 1153795757,
        actions: [
          {
            action_code: '2214501',
            official_name: "Coordination des politiques d'intégration africaine",
            amount_2026_fcfa: 276800000,
          },
          {
            action_code: '2214503',
            official_name: "Promotion des projets/programmes économiques et humains d'intégration africaine",
            amount_2026_fcfa: 876995757,
          },
        ],
      },
      {
        program_code: '22146',
        official_name: "Ivoiriens de l'extérieur",
        amount_2026_fcfa: 225230000,
        actions: [
          {
            action_code: '2214601',
            official_name: "Renforcement de la lutte contre la migration irrégulière",
            amount_2026_fcfa: 83500000,
          },
          {
            action_code: '2214602',
            official_name: "Contribution de la diaspora au développement économique",
            amount_2026_fcfa: 45500000,
          },
          {
            action_code: '2214605',
            official_name: "Assistance aux ivoiriens de la diaspora",
            amount_2026_fcfa: 96230000,
          },
        ],
      },
    ],
  },
  'MAM': {
    institution_code: '440',
    institution_id: 'gov-032',
    institution_name: "MINISTERE DELEGUE AUPRES DU MINISTRE DES TRANSPORTS, CHARGE DES AFFAIRES MARITIMES",
    total_budget_2026_fcfa: 13746365872,
    programs: [
      {
        program_code: '21237',
        official_name: "Administration générale",
        amount_2026_fcfa: 8311959782,
        actions: [
          {
            action_code: '2123701',
            official_name: "Coordination et animation du ministère",
            amount_2026_fcfa: 363148630,
          },
          {
            action_code: '2123702',
            official_name: "Gestion des ressources humaines, financières et matérielles",
            amount_2026_fcfa: 7729826014,
          },
          {
            action_code: '2123703',
            official_name: "Planification, programmation et suivi évaluation",
            amount_2026_fcfa: 157150000,
          },
          {
            action_code: '2123704',
            official_name: "Information et Communication",
            amount_2026_fcfa: 61835138,
          },
        ],
      },
      {
        program_code: '22115',
        official_name: "Transport maritime et fluvio-lagunaire",
        amount_2026_fcfa: 5434406090,
        actions: [
          {
            action_code: '2211501',
            official_name: "Coordination et suivi des activités de transport, de sécurité, de sûreté et de formation maritimes",
            amount_2026_fcfa: 1652866596,
          },
          {
            action_code: '2211502',
            official_name: "Construction d'infrastructures et acquisition d'équipements techniques de sécurité et de sûreté maritime",
            amount_2026_fcfa: 2961180530,
          },
          {
            action_code: '2211503',
            official_name: "Renforcement des capacités didactiques et opérationnelles des structures de formation maritime",
            amount_2026_fcfa: 820358964,
          },
        ],
      },
    ],
  },
  'MFPMA': {
    institution_code: '237',
    institution_id: 'gov-003',
    institution_name: "MINISTERE D'ETAT, MINISTERE DE LA FONCTION PUBLIQUE ET DE LA MODERNISATION DE L'ADMINISTRATION",
    total_budget_2026_fcfa: 45121940916,
    programs: [
      {
        program_code: '21042',
        official_name: "Administration Générale",
        amount_2026_fcfa: 28450607800,
        actions: [
          {
            action_code: '2104201',
            official_name: "Coordination et animation du ministère",
            amount_2026_fcfa: 1040870000,
          },
          {
            action_code: '2104202',
            official_name: "Gestion des ressources (humaines, financières et matérielles)",
            amount_2026_fcfa: 27215737800,
          },
          {
            action_code: '2104206',
            official_name: "Gestion de la communication, planification, programmation et suivi-évaluation",
            amount_2026_fcfa: 194000000,
          },
        ],
      },
      {
        program_code: '22043',
        official_name: "Fonction Publique",
        amount_2026_fcfa: 14396485400,
        actions: [
          {
            action_code: '2204301',
            official_name: "Amélioration du système de recrutement et de gestion de la carrière des fonctionnaires et agents de l'Etat",
            amount_2026_fcfa: 7468283463,
          },
          {
            action_code: '2204303',
            official_name: "Formation et perfectionnement des cadres de l'administration publique et agents de l'Etat",
            amount_2026_fcfa: 6928201937,
          },
        ],
      },
      {
        program_code: '22066',
        official_name: "Modernisation de l'Administration",
        amount_2026_fcfa: 2274847716,
        actions: [
          {
            action_code: '2206601',
            official_name: "Conception et promotion des outils de Modernisation de l'Administration",
            amount_2026_fcfa: 797776350,
          },
          {
            action_code: '2206609',
            official_name: "Renforcement de la politique de modernisation de l'Administration",
            amount_2026_fcfa: 1477071366,
          },
        ],
      },
    ],
  },
  'MEPS': {
    institution_code: '362',
    institution_id: 'gov-023',
    institution_name: "MINISTERE DE L'EMPLOI ET DE LA PROTECTION SOCIALE",
    total_budget_2026_fcfa: 91411414044,
    programs: [
      {
        program_code: '21150',
        official_name: "Administration Générale",
        amount_2026_fcfa: 35849618984,
        actions: [
          {
            action_code: '2115001',
            official_name: "Coordination et animation",
            amount_2026_fcfa: 5173570216,
          },
          {
            action_code: '2115002',
            official_name: "Planification, programmation et suivi - évaluation",
            amount_2026_fcfa: 6801811930,
          },
          {
            action_code: '2115003',
            official_name: "Gestion des ressources humaines matérielles et financières",
            amount_2026_fcfa: 23824247963,
          },
          {
            action_code: '2115004',
            official_name: "Gestion des systèmes d'information et de communication",
            amount_2026_fcfa: 49988875,
          },
        ],
      },
      {
        program_code: '22151',
        official_name: "Emploi",
        amount_2026_fcfa: 2451846262,
        actions: [
          {
            action_code: '2215101',
            official_name: "Conception et suivi de la Politique d'Emploi",
            amount_2026_fcfa: 1801036262,
          },
          {
            action_code: '2215102',
            official_name: "Elaboration et suivi-évaluation des projets et programmes d'emploi",
            amount_2026_fcfa: 52000000,
          },
          {
            action_code: '2215103',
            official_name: "Insertion socio-économique et professionnelle des couches vulnérables",
            amount_2026_fcfa: 598810000,
          },
        ],
      },
      {
        program_code: '22152',
        official_name: "Travail",
        amount_2026_fcfa: 6374402905,
        actions: [
          {
            action_code: '2215201',
            official_name: "Conception et suivi de la politique générale du Travail",
            amount_2026_fcfa: 504524900,
          },
          {
            action_code: '2215202',
            official_name: "Elaboration et suivi de la réglementation du travail",
            amount_2026_fcfa: 133500000,
          },
          {
            action_code: '2215203',
            official_name: "Dialogue social",
            amount_2026_fcfa: 19100000,
          },
          {
            action_code: '2215204',
            official_name: "Lutte contre le travail des enfants",
            amount_2026_fcfa: 5717278005,
          },
        ],
      },
      {
        program_code: '22153',
        official_name: "Protection sociale",
        amount_2026_fcfa: 46735545893,
        actions: [
          {
            action_code: '2215302',
            official_name: "Formation des étudiants de l'INSFS et des travailleurs sociaux",
            amount_2026_fcfa: 41893273616,
          },
          {
            action_code: '2215303',
            official_name: "Formation des travailleurs sociaux",
            amount_2026_fcfa: 1764221356,
          },
          {
            action_code: '2215304',
            official_name: "Conception et suivi de la politique générale de protection sociale",
            amount_2026_fcfa: 221580000,
          },
          {
            action_code: '2215305',
            official_name: "Protection des groupes vulnérables",
            amount_2026_fcfa: 2856470921,
          },
        ],
      },
    ],
  },
  'MSCV': {
    institution_code: '444',
    institution_id: 'gov-030',
    institution_name: "MINISTERE DELEGUE AUPRES DU PREMIER MINISTRE, MINISTRE DES SPORTS ET DU CADRE DE VIE, CHARGE DES SPORTS ET DU CADRE DE VIE",
    total_budget_2026_fcfa: 70427777385,
    programs: [
      {
        program_code: '21081',
        official_name: "Administration Générale",
        amount_2026_fcfa: 17906782766,
        actions: [
          {
            action_code: '2108101',
            official_name: "Coordination de la politique du sport",
            amount_2026_fcfa: 6094819416,
          },
          {
            action_code: '2108102',
            official_name: "Amélioration du système de planification, de suivi-évaluation et des statistiques",
            amount_2026_fcfa: 19000000,
          },
          {
            action_code: '2108103',
            official_name: "Amélioration du cadre de gestion des ressources humaines",
            amount_2026_fcfa: 62706205,
          },
          {
            action_code: '2108104',
            official_name: "Amélioration de la gestion des finances et du patrimoine",
            amount_2026_fcfa: 11730257145,
          },
        ],
      },
      {
        program_code: '22082',
        official_name: "Sport",
        amount_2026_fcfa: 39900994619,
        actions: [
          {
            action_code: '2208201',
            official_name: "Construction, réhabilitation et renforcement du parc des infrastructures sportives",
            amount_2026_fcfa: 21949210665,
          },
          {
            action_code: '2208202',
            official_name: "Promotion des sports scolaires, universitaires, de masse et du sport pour tous",
            amount_2026_fcfa: 2742140620,
          },
          {
            action_code: '2208203',
            official_name: "Encadrement de la vie fédérale et promotion des sports de haut niveau",
            amount_2026_fcfa: 15209643334,
          },
        ],
      },
      {
        program_code: '23241',
        official_name: "Appui au développement durable du sport",
        amount_2026_fcfa: 10900000000,
        actions: [
          {
            action_code: '2324101',
            official_name: "Développement des activités fédérales",
            amount_2026_fcfa: 7430000000,
          },
          {
            action_code: '2324102',
            official_name: "Promotion sociale et sanitaire du secteur sport",
            amount_2026_fcfa: 200000000,
          },
          {
            action_code: '2324103',
            official_name: "Construction, réhabilitation et équipement d'infrastructure socio-sportive",
            amount_2026_fcfa: 3270000000,
          },
        ],
      },
      {
        program_code: '23249',
        official_name: "Appui à l'entretien et à la sécurisation des infrastructures",
        amount_2026_fcfa: 1720000000,
        actions: [
          {
            action_code: '2324901',
            official_name: "Entretien, maintenance et sécurisation des infrastructures",
            amount_2026_fcfa: 1720000000,
          },
        ],
      },
    ],
  },
  'MICOM': {
    institution_code: '336',
    institution_id: 'gov-017',
    institution_name: "MINISTERE DE LA COMMUNICATION",
    total_budget_2026_fcfa: 39806735298,
    programs: [
      {
        program_code: '21077',
        official_name: "Administration Générale",
        amount_2026_fcfa: 7354634682,
        actions: [
          {
            action_code: '2107701',
            official_name: "Coordination et Animation",
            amount_2026_fcfa: 4295854165,
          },
          {
            action_code: '2107702',
            official_name: "Gestion des ressources humaines, financières et matérielles",
            amount_2026_fcfa: 2758780517,
          },
          {
            action_code: '2107703',
            official_name: "Gestion du système d'information et communication",
            amount_2026_fcfa: 300000000,
          },
        ],
      },
      {
        program_code: '22078',
        official_name: "Communication et médias",
        amount_2026_fcfa: 12252100615,
        actions: [
          {
            action_code: '2207801',
            official_name: "Développement de la presse, de l'audiovisuel et de la communication publicitaire",
            amount_2026_fcfa: 5299291340,
          },
          {
            action_code: '2207802',
            official_name: "Formation et accès aux métiers de la presse et de l'audiovisuelle",
            amount_2026_fcfa: 2448795262,
          },
          {
            action_code: '2207803',
            official_name: "Régulation du secteur de la communication et des médias",
            amount_2026_fcfa: 4504014013,
          },
        ],
      },
      {
        program_code: '23223',
        official_name: "Appui au financement de la Radiodiffusion Télévision Ivoirienne (RTI)",
        amount_2026_fcfa: 16465000001,
        actions: [
          {
            action_code: '2322301',
            official_name: "Gestion de la Redevance RTI",
            amount_2026_fcfa: 16465000001,
          },
        ],
      },
      {
        program_code: '23224',
        official_name: "Appui au financement de la Société Ivoirienne de Télédiffusion (IDT)",
        amount_2026_fcfa: 2035000000,
        actions: [
          {
            action_code: '2322401',
            official_name: "Gestion des Centres de diffusion des programmes Télés et Radios nationales (Chaines TNT et Radios publiques)",
            amount_2026_fcfa: 2035000000,
          },
        ],
      },
      {
        program_code: '23225',
        official_name: "Appui au financement du secteur des médias",
        amount_2026_fcfa: 1700000000,
        actions: [
          {
            action_code: '2322501',
            official_name: "Gestion de la taxe sur la publicité",
            amount_2026_fcfa: 1700000000,
          },
        ],
      },
    ],
  },
  'METFPA': {
    institution_code: '334',
    institution_id: 'gov-034',
    institution_name: "MINISTERE DE L'ENSEIGNEMENT TECHNIQUE, DE LA FORMATION PROFESSIONNELLE ET DE L'APPRENTISSAGE",
    total_budget_2026_fcfa: 182301855312,
    programs: [
      {
        program_code: '21210',
        official_name: "Administration Générale",
        amount_2026_fcfa: 14408855796,
        actions: [
          {
            action_code: '2121001',
            official_name: "Coordination et animation",
            amount_2026_fcfa: 12104810898,
          },
          {
            action_code: '2121002',
            official_name: "Gestion des ressources humaines financières et matérielles",
            amount_2026_fcfa: 2192007247,
          },
          {
            action_code: '2121003',
            official_name: "Information et communication",
            amount_2026_fcfa: 71446453,
          },
          {
            action_code: '2121004',
            official_name: "Planification, programmation et suivie -évaluation",
            amount_2026_fcfa: 40591198,
          },
        ],
      },
      {
        program_code: '22063',
        official_name: "Formation professionnelle et apprentissage",
        amount_2026_fcfa: 111002347046,
        actions: [
          {
            action_code: '2206301',
            official_name: "Modernisation de la formation professionnelle initiale et continue",
            amount_2026_fcfa: 76997712480,
          },
          {
            action_code: '2206302',
            official_name: "Construction, réhabilitation et équipement des structures de formation professionnelle",
            amount_2026_fcfa: 29526339261,
          },
          {
            action_code: '2206303',
            official_name: "Développement de la formation professionnelle qualifiante et de l'apprentissage",
            amount_2026_fcfa: 4478295305,
          },
        ],
      },
      {
        program_code: '22219',
        official_name: "Enseignement secondaire technique",
        amount_2026_fcfa: 10890652470,
        actions: [
          {
            action_code: '2221901',
            official_name: "Gestion des établissements du secondaire technique",
            amount_2026_fcfa: 10890652470,
          },
        ],
      },
      {
        program_code: '23220',
        official_name: "Fonds de Développement de la Formation Professionnelle",
        amount_2026_fcfa: 46000000000,
        actions: [
          {
            action_code: '2322001',
            official_name: "Gestion des ressources humaines, financières et matérielles",
            amount_2026_fcfa: 17178600000,
          },
          {
            action_code: '2322002',
            official_name: "Accompagnement des entreprises dans l'élaboration et le financement des projets et des plans de formation de leurs travailleurs",
            amount_2026_fcfa: 28821400000,
          },
        ],
      },
    ],
  },
};

// INDEPENDENT LFI 2026 BENCHMARK REFERENCES
// Ce contrôle indépendant définit pour chaque ministère les grandeurs issues directement
// de la Loi de Finances 2026 (Tableau récapitulatif par section, dotation et programme, pp. 45-54)
export interface IndependentLfiReference {
  institution_code: string;
  institution_id: string;
  lfi_total_fcfa: number;
  program_count: number;
  program_codes: string[];
  program_amounts_fcfa: Record<string, number>;
}

export const INDEPENDENT_LFI_REFERENCES_2026: Record<string, IndependentLfiReference> = {
  // LOT 4 PILOTS
  'MJDH': {
    institution_code: '325',
    institution_id: 'gov-005',
    lfi_total_fcfa: 129151307791,
    program_count: 4,
    program_codes: ['21044', '22045', '22046', '22143'],
    program_amounts_fcfa: {
      '21044': 94913084375,
      '22045': 18880628287,
      '22046': 14812595129,
      '22143': 545000000,
    },
  },
  'MEER': {
    institution_code: '330',
    institution_id: 'gov-025',
    lfi_total_fcfa: 734442904943,
    program_count: 3,
    program_codes: ['21058', '22059', '23219'],
    program_amounts_fcfa: {
      '21058': 7964881215,
      '22059': 446634263710,
      '23219': 279843760018,
    },
  },
  'MINEDDTE': {
    institution_code: '343',
    institution_id: 'gov-031',
    lfi_total_fcfa: 36680067253,
    program_count: 2,
    program_codes: ['21079', '22080'],
    program_amounts_fcfa: {
      '21079': 7918536211,
      '22080': 28761531042,
    },
  },
  'MINEF': {
    institution_code: '345',
    institution_id: 'gov-018',
    lfi_total_fcfa: 103197582643,
    program_count: 5,
    program_codes: ['21088', '22089', '22090', '22091', '23228'],
    program_amounts_fcfa: {
      '21088': 37824714687,
      '22089': 58463516601,
      '22090': 917332688,
      '22091': 5092018667,
      '23228': 900000000,
    },
  },
  // LOT 5 BATCH 1 MINISTRIES
  'MAIED': {
    institution_code: '439',
    institution_id: 'gov-033',
    lfi_total_fcfa: 5122516889,
    program_count: 3,
    program_codes: ['21234', '22145', '22146'],
    program_amounts_fcfa: {
      '21234': 3743491132,
      '22145': 1153795757,
      '22146': 225230000,
    },
  },
  'MAM': {
    institution_code: '440',
    institution_id: 'gov-032',
    lfi_total_fcfa: 13746365872,
    program_count: 2,
    program_codes: ['21237', '22115'],
    program_amounts_fcfa: {
      '21237': 8311959782,
      '22115': 5434406090,
    },
  },
  'MFPMA': {
    institution_code: '237',
    institution_id: 'gov-003',
    lfi_total_fcfa: 45121940916,
    program_count: 3,
    program_codes: ['21042', '22043', '22066'],
    program_amounts_fcfa: {
      '21042': 28450607800,
      '22043': 14396485400,
      '22066': 2274847716,
    },
  },
  'MEPS': {
    institution_code: '362',
    institution_id: 'gov-023',
    lfi_total_fcfa: 91411414044,
    program_count: 4,
    program_codes: ['21150', '22151', '22152', '22153'],
    program_amounts_fcfa: {
      '21150': 35849618984,
      '22151': 2451846262,
      '22152': 6374402905,
      '22153': 46735545893,
    },
  },
  'MSCV': {
    institution_code: '444',
    institution_id: 'gov-030',
    lfi_total_fcfa: 70427777385,
    program_count: 4,
    program_codes: ['21081', '22082', '23241', '23249'],
    program_amounts_fcfa: {
      '21081': 17906782766,
      '22082': 39900994619,
      '23241': 10900000000,
      '23249': 1720000000,
    },
  },
  'MICOM': {
    institution_code: '336',
    institution_id: 'gov-017',
    lfi_total_fcfa: 39806735298,
    program_count: 5,
    program_codes: ['21077', '22078', '23223', '23224', '23225'],
    program_amounts_fcfa: {
      '21077': 7354634682,
      '22078': 12252100615,
      '23223': 16465000001,
      '23224': 2035000000,
      '23225': 1700000000,
    },
  },
  'METFPA': {
    institution_code: '334',
    institution_id: 'gov-034',
    lfi_total_fcfa: 182301855312,
    program_count: 4,
    program_codes: ['21210', '22063', '22219', '23220'],
    program_amounts_fcfa: {
      '21210': 14408855796,
      '22063': 111002347046,
      '22219': 10890652470,
      '23220': 46000000000,
    },
  },
};
