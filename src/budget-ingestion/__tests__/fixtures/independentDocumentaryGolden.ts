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
};
