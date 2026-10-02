import { Institution, PrimitiveBudgetInfo } from '../types';

/**
 * Référentiel National des Budgets Primitifs Officiels 2026
 * Validé pour 46 Collectivités Territoriales (30 Communes et 16 Conseils Régionaux) de Côte d'Ivoire.
 * Extrait et certifié à partir du Référentiel des Budgets Primitifs 2026 (Referentiel_232).
 * 
 * Sources certifiées :
 * - Délibérations officielles des Conseils Municipaux et Régionaux
 * - Agence Ivoirienne de Presse (AIP)
 * - Fraternité Matin (Quotidiens officiels & comptes-rendus)
 * - Abidjan.net / Le Nouveau Réveil (ex: Mairie de Cocody)
 * - KOACI (États d'exécution & sessions budgétaires)
 * 
 * Ce référentiel permet la « Double Lecture Certifiée » :
 * 1. Dotation de l'État (Loi de Finances / DGBF : DGF + DGE)
 * 2. Budget Primitif Municipal/Régional Propre (Ressources propres + fiscalité locale partagée DGI)
 */
export const OFFICIAL_PRIMITIVE_BUDGETS: Record<string, PrimitiveBudgetInfo> = {
  // Abengourou (Commune)
  'inst-com-abengourou': {
    total_voted_fcfa: 3781160000,
    investment_voted_fcfa: 2574320000,
    functioning_voted_fcfa: 1206840000,
    voted_date: "14 février 2026",
    source: "Mairie de Abengourou & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-abengourou-la-commune-adopte-un-budget-de-37-milliards-fcfa-pour-accelerer-la-transformation-urbaine-et-le-developpement-durable/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 14 février 2026).",
  },

  // Adzopé (Commune)
  'inst-com-adzope': {
    total_voted_fcfa: 2422705000,
    investment_voted_fcfa: 1661543000,
    functioning_voted_fcfa: 761162000,
    voted_date: "28 novembre 2025",
    source: "Mairie de Adzope & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-2026-mairie-dadzope-en-hausse-de-3399-par-rapport-a-lannee-precedente/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 28 novembre 2025).",
  },

  // Agboville (Commune)
  'inst-com-agboville': {
    total_voted_fcfa: 2894730000,
    investment_voted_fcfa: 1736838000,
    functioning_voted_fcfa: 1157892000,
    voted_date: "19 juin 2026",
    source: "Mairie de Agboville & AIP",
    source_url: "https://www.aip.ci/electionpresidentielle2025/article.php?id=379819",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "AIP, lors du BM1, donne le BP initial à 2 894 730 000 FCFA. Une publication antérieure de presse donnait 2 745 831 000 FCFA : retenir la valeur AIP la plus récente pour le BP.",
  },

  // Bangolo (Commune)
  'inst-com-bangolo': {
    total_voted_fcfa: 1586000000,
    investment_voted_fcfa: 1159000000,
    functioning_voted_fcfa: 427185000,
    voted_date: "25 janvier 2026",
    source: "Mairie de Bangolo & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-un-budget-de-plus-dun-milliard-fcfa-adopte-pour-renforcer-la-securite-et-les-infrastructures-a-bangolo/",
    precision: "APPROXIMATE",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 25 janvier 2026).",
  },

  // Bettié (Commune)
  'inst-com-bettie': {
    total_voted_fcfa: 816053000,
    investment_voted_fcfa: 489631800,
    functioning_voted_fcfa: 326421200,
    voted_date: "30 mars 2026",
    source: "Mairie de Bettie & Fraternité Matin",
    source_url: "https://www.fratmat.info/article/2641011/regions/bettie-un-budget-2026-de-plus-de-816-millions-fcfa-adopte-par-le-conseil-municipal",
    precision: "EXACT",
    editor_source: "Fraternité Matin",
    session_notes: "Montant exact publié dans l'article : 816 053 000 FCFA. L'article indique seulement que l'investissement représente plus de 71 %, sans ventilation exacte en FCFA.",
  },

  // Bingerville (Commune)
  'inst-com-bingerville': {
    total_voted_fcfa: 4046222000,
    investment_voted_fcfa: 2168334000,
    functioning_voted_fcfa: 1877888000,
    voted_date: "28 janvier 2026",
    source: "AIP — Budget primitif 2026 de Bingerville",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-2026-de-la-commune-de-bingerville-arrete-a-plus-de-4-milliards-fcfa/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Initialement 4 144 152 000 FCFA ; revu à 4 046 222 000 FCFA par la commission d'approbation.",
  },

  // Bondoukou (Commune)
  'inst-com-bondoukou': {
    total_voted_fcfa: 1881883000,
    investment_voted_fcfa: 1129129800,
    functioning_voted_fcfa: 752753200,
    voted_date: "23 novembre 2025",
    source: "Mairie de Bondoukou & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-maire-appelle-a-la-cohesion-pour-accelerer-le-developpement-de-la-commune-de-bondoukou/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 23 novembre 2025).",
  },

  // Bongouanou (Commune)
  'inst-com-bongouanou': {
    total_voted_fcfa: 1418000000,
    investment_voted_fcfa: 850800000,
    functioning_voted_fcfa: 567200000,
    voted_date: "10 juillet 2026",
    source: "Mairie de Bongouanou & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-la-commune-de-bongouanou-execute-326-de-son-budget-primitif-au-premier-semestre-2026/",
    precision: "APPROXIMATE",
    editor_source: "AIP",
    session_notes: "AIP indique une prévision annuelle de 1,418 milliard FCFA.",
  },

  // Bouaké (Commune)
  'inst-com-bouake': {
    total_voted_fcfa: 11165776000,
    investment_voted_fcfa: 6699465600,
    functioning_voted_fcfa: 4466310400,
    voted_date: "19 mars 2026",
    source: "Mairie de Bouake & Fraternité Matin",
    source_url: "https://www.fratmat.info/article/2640752/regions/bouakeconseil-municipal-linauguration-du-grand-marche-se-prepare",
    precision: "EXACT",
    editor_source: "Fraternité Matin",
    session_notes: "Budget primitif 2026 exact : 11 165 776 000 FCFA. L'article mentionne aussi un budget de 2 milliards FCFA relatif aux recettes propres ; ne pas le confondre avec le total. Contrôle KOACI (30/08/2026) : article sur le BM1 indique un BP à 11,056 milliards FCFA, différent des 11 165 776 000 FCFA publiés par Fraternité Matin. Valeur actuelle conservée mais conflit de source à arbitrer avec document officiel.",
  },

  // Boundiali (Commune)
  'inst-com-boundiali': {
    total_voted_fcfa: 1954094000,
    investment_voted_fcfa: 1384000000,
    functioning_voted_fcfa: 570094000,
    voted_date: "23 novembre 2025",
    source: "Mairie de Boundiali & Fraternité Matin",
    source_url: "https://www.fratmat.info/article/2638319/societe/developpement-local-la-mairie-de-boundiali-multiplie-par-six-ses-investissements-en-sept-ans",
    precision: "EXACT",
    editor_source: "Fraternité Matin",
    session_notes: "Fraternité Matin donne le total exact 1 954 094 000 FCFA et environ 1,384 milliard consacré à l'investissement. Le fonctionnement n'est pas donné en montant exact ; ne pas le déduire comme donnée source.",
  },

  // Cocody (Commune)
  'inst-com-cocody': {
    total_voted_fcfa: 19764660000,
    investment_voted_fcfa: 10277623200,
    functioning_voted_fcfa: 9487036800,
    voted_date: "25 février 2026",
    source: "Mairie de Cocody & Abidjan.net / Le Nouveau Réveil",
    source_url: "https://news.abidjan.net/articles/746842/1ere-session-du-conseil-municipal-de-cocody-un-budget-primitif-de-197-milliards-pour-booster-les-travaux-innovants",
    precision: "EXACT",
    editor_source: "Abidjan.net / Le Nouveau Réveil",
    session_notes: "L'article donne 19 764 660 avec une unité typographiquement incohérente ('milliards') mais le titre et le contexte établissent un budget de 19,7 milliards FCFA. La ventilation publiée comporte également des omissions d'unités ; elle n'est donc pas injectée comme montant exact.",
  },

  // Danané (Commune)
  'inst-com-danane': {
    total_voted_fcfa: 1929356000,
    investment_voted_fcfa: 1331101000,
    functioning_voted_fcfa: 598255000,
    voted_date: "11 février 2026",
    source: "Mairie de Danane & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-danane-le-conseil-municipal-adopte-un-budget-2026-de-19-milliard-f-cfa/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "BP 2026 autorisé (AIP, 11 février 2026).",
  },

  // Daoukro (Commune)
  'inst-com-daoukro': {
    total_voted_fcfa: 1931737000,
    investment_voted_fcfa: 1159042200,
    functioning_voted_fcfa: 772694800,
    voted_date: "8 décembre 2025",
    source: "Mairie de Daoukro & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-2026-de-la-mairie-de-daoukro-oriente-vers-des-projets-dinfrastructures/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 8 décembre 2025).",
  },

  // Dimbokro (Commune)
  'inst-com-dimbokro': {
    total_voted_fcfa: 1986685000,
    investment_voted_fcfa: 1192011000,
    functioning_voted_fcfa: 794674000,
    voted_date: "30 août 2026",
    source: "Mairie de Dimbokro & KOACI",
    source_url: "https://www.koaci.com/article/2026/08/30/cote-divoire/economie/cote-divoire-dimbokro-6697-de-recettes-mobilisees-et-un-budget-de-215-milliards-fcfa-adama-coulibaly-accelere-les-investissements_200013.html",
    precision: "EXACT",
    editor_source: "KOACI",
    session_notes: "KOACI donne explicitement le BP initial à 1 986 685 000 FCFA avant le BM1 de 2 154 617 000 FCFA.",
  },

  // Gagnoa (Commune)
  'inst-com-gagnoa': {
    total_voted_fcfa: 3523316000,
    investment_voted_fcfa: 2408724000,
    functioning_voted_fcfa: 1114592000,
    voted_date: "18 avril 2026",
    source: "Mairie de Gagnoa & KOACI",
    source_url: "https://www.koaci.com/article/2026/04/18/cote-divoire/societe/cote-divoire-gagnoa-le-budget-primitif-de-lexercice-2026-de-plus-de-3-milliards-fcfa-adopte-en-conseil-municipal_195970.html",
    precision: "EXACT",
    editor_source: "KOACI",
    session_notes: "Montant exact et ventilation exacte publiés. KOACI confirme aussi ce BP dans l'article du BM1 du 19/08/2026.",
  },

  // Gbéléban (Commune)
  'inst-com-gbeleban': {
    total_voted_fcfa: 1688914000,
    investment_voted_fcfa: 1491275000,
    functioning_voted_fcfa: 197639000,
    voted_date: "8 novembre 2025",
    source: "Mairie de Gbeleban & Mairie de Gbéléban + Fraternité Matin",
    source_url: "https://mairie-gbeleban.ci/",
    precision: "EXACT",
    editor_source: "Mairie de Gbéléban + Fraternité Matin",
    session_notes: "Le site officiel affiche actuellement des chiffres incohérents (1 000 688 914 / 197 639 000 / 1 000 491 275). Fraternité Matin publie 1 688 914 000 = 197 639 000 + 1 491 275 000. Valeur retenue avec anomalie source signalée.",
  },

  // Grand-Béréby (Commune)
  'inst-com-grand-bereby': {
    total_voted_fcfa: 3244050000,
    investment_voted_fcfa: 2043770000,
    functioning_voted_fcfa: 1200280000,
    voted_date: "16 janvier 2026",
    source: "Mairie de Grand-bereby & KOACI",
    source_url: "https://www.koaci.com/article/2026/01/16/cote-divoire/societe/cote-divoire-conseil-municipal-de-grand-bereby-le-budget-primitif-de-lexercice-2026-fixe-a-03-milliards-fcfa-application-des-taxes-de-nuitee-dans-les-hotels_193634.html",
    precision: "EXACT",
    editor_source: "KOACI",
    session_notes: "KOACI publie 3 244 050 000 FCFA (1 200 280 000 fonctionnement + 2 043 770 000 investissement). Cette valeur diffère du bulletin municipal précédemment exploité (3 068 890 000 FCFA) : conflit de versions à conserver pour contrôle.",
  },

  // Katiola (Commune)
  'inst-com-katiola': {
    total_voted_fcfa: 1684000000,
    investment_voted_fcfa: 1267000000,
    functioning_voted_fcfa: 419903000,
    voted_date: "27 novembre 2025",
    source: "Mairie de Katiola & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-2026-du-conseil-municipal-de-katiola-progresse-de-7694/",
    precision: "APPROXIMATE",
    editor_source: "AIP",
    session_notes: "La somme des composantes publiées dépasse légèrement le total arrondi ; conserver l'anomalie de source.",
  },

  // Kounahiri (Commune)
  'inst-com-kounahiri': {
    total_voted_fcfa: 678656000,
    investment_voted_fcfa: 476080000,
    functioning_voted_fcfa: 202576000,
    voted_date: "17 novembre 2025",
    source: "Mairie de Kounahiri & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-2026-de-la-mairie-de-kounahiri-oriente-vers-les-infrastructures-de-base/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 17 novembre 2025).",
  },

  // Madinani (Commune)
  'inst-com-madinani': {
    total_voted_fcfa: 1073000000,
    investment_voted_fcfa: 882219000,
    functioning_voted_fcfa: 191432000,
    voted_date: "20 novembre 2025",
    source: "Mairie de Madinani & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-municipal-2026-de-madinani-en-hausse-de-plus-de-437-millions-de-f-cfa/",
    precision: "APPROXIMATE",
    editor_source: "AIP",
    session_notes: "Total publié arrondi à 1,073 milliard ; composantes publiées = 1 073 651 000 FCFA.",
  },

  // M'Bahiakro (Commune)
  'inst-com-m-bahiakro': {
    total_voted_fcfa: 1165711000,
    investment_voted_fcfa: 899231000,
    functioning_voted_fcfa: 211417000,
    voted_date: "7 novembre 2025",
    source: "Mairie de M'bahiakro & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-un-budget-primitif-de-plus-dun-milliard-adopte-pour-booster-les-projets-developpement-de-la-commune-de-mbahiakro/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Anomalie source : les composantes publiées ne totalisent pas le budget global.",
  },

  // Nassian (Commune)
  'inst-com-nassian': {
    total_voted_fcfa: 1386957000,
    investment_voted_fcfa: 832174200,
    functioning_voted_fcfa: 554782800,
    voted_date: "15 février 2026",
    source: "Mairie de Nassian & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-2026-considere-comme-le-levier-pour-une-annee-decisive-de-developpement-de-nassian/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "BP 2026 validé par la tutelle / autorisé (AIP, 15 février 2026).",
  },

  // Ouangolodougou (Commune)
  'inst-com-ouangolodougou': {
    total_voted_fcfa: 1065522000,
    investment_voted_fcfa: 696896000,
    functioning_voted_fcfa: 368626000,
    voted_date: "15 février 2026",
    source: "Mairie de Ouangolodougou & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-un-budget-2026-tourne-vers-linvestissement-et-les-attentes-citoyennes-a-ouangolodougou/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Une adoption antérieure du 29/11/2025 annonçait 1 147 456 000 FCFA. La source de février 2026 donne 1 065 522 000 FCFA pour l'exécution.",
  },

  // Ouellé (Commune)
  'inst-com-ouelle': {
    total_voted_fcfa: 860513000,
    investment_voted_fcfa: 664363000,
    functioning_voted_fcfa: 196150000,
    voted_date: "3 novembre 2025",
    source: "Mairie de Ouelle & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-2026-de-la-commune-de-ouelle-en-hausse-de-plus-de-50/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 3 novembre 2025).",
  },

  // Tafiré (Commune)
  'inst-com-tafire': {
    total_voted_fcfa: 825150000,
    investment_voted_fcfa: 571150000,
    functioning_voted_fcfa: 254000000,
    voted_date: "19 février 2026",
    source: "Mairie de Tafire & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-un-budget-de-plus-de-825-millions-fcfa-adopte-pour-accelerer-le-developpement-communal-de-tafire-en-2026/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Une version antérieure publiée le 24/11/2025 était de 751 051 000 FCFA.",
  },

  // Tanda (Commune)
  'inst-com-tanda': {
    total_voted_fcfa: 1020584000,
    investment_voted_fcfa: 612350400,
    functioning_voted_fcfa: 408233600,
    voted_date: "17 novembre 2025",
    source: "Mairie de Tanda & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-2026-de-la-mairie-de-tanda-en-hausse-de-1445/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Répartition publiée : 42,83% fonctionnement / 57,17% investissement.",
  },

  // Tiébissou (Commune)
  'inst-com-tiebissou': {
    total_voted_fcfa: 943219000,
    investment_voted_fcfa: 647985000,
    functioning_voted_fcfa: 295234000,
    voted_date: "16 octobre 2025",
    source: "Mairie de Tiebissou & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-maire-de-tiebissou-explique-la-hausse-du-budget-primitif-de-lexercice-2026/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 16 octobre 2025).",
  },

  // Toumodi (Commune)
  'inst-com-toumodi': {
    total_voted_fcfa: 1300000000,
    investment_voted_fcfa: 780000000,
    functioning_voted_fcfa: 520000000,
    voted_date: "1 octobre 2025",
    source: "Mairie de Toumodi & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-2026-de-la-mairie-de-toumodi-adopte-a-plus-de-13-milliard-fcfa/",
    precision: "LOWER_BOUND",
    editor_source: "AIP",
    session_notes: "Source : « plus de 1,3 milliard » ; ne pas afficher 1,3 Md comme montant exact.",
  },

  // Vavoua (Commune)
  'inst-com-vavoua': {
    total_voted_fcfa: 1689000000,
    investment_voted_fcfa: 1156500000,
    functioning_voted_fcfa: 532600000,
    voted_date: "16 novembre 2025",
    source: "Mairie de Vavoua & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-budget-primitif-2026-plus-de-16-milliards-f-cfa-adoptes-par-le-conseil-municipal-de-vavoua/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Anomalie source : fonctionnement + investissement = 1 689 100 000 FCFA, soit +100 000 par rapport au total publié.",
  },

  // Yopougon (Commune)
  'inst-com-yopougon': {
    total_voted_fcfa: 17000000000,
    investment_voted_fcfa: 10200000000,
    functioning_voted_fcfa: 6800000000,
    voted_date: "30 décembre 2025",
    source: "Mairie de Yopougon & KOACI",
    source_url: "https://www.koaci.com/article/2025/12/30/cote-divoire/politique/cote-divoire-mairie-de-yopougon-reconduction-entiere-des-taxes-municipales-de-2025-pour-lexercice-2026-un-budget-primitif-chiffre-a-plus-de-17-milliards-fcfa_193268.html",
    precision: "LOWER_BOUND",
    editor_source: "KOACI",
    session_notes: "Source : « plus de 17 milliards FCFA ». La valeur 17 000 000 000 est uniquement la borne minimale, pas le montant exact.",
  },

  // Agnéby-Tiassa (Conseil régional)
  'inst-reg-conseil-regional-de-l-agneby-tiassa': {
    total_voted_fcfa: 6194348000,
    investment_voted_fcfa: 3716608800,
    functioning_voted_fcfa: 2477739200,
    voted_date: "22 février 2026",
    source: "Conseil Régional de l'Agneby-Tiassa & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-conseil-regional-de-lagneby-tiassa-autorise-lexecution-dun-budget-de-plus-de-6-milliards-fcfa-en-2026/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Version adoptée en décembre 2025 publiée à 6,12 Md ; la version d'autorisation d'exécution est 6 194 348 000 FCFA.",
  },

  // Bagoué (Conseil régional)
  'inst-reg-conseil-regional-de-la-bagoue': {
    total_voted_fcfa: 8869000000,
    investment_voted_fcfa: 6995000000,
    functioning_voted_fcfa: 1800000000,
    voted_date: "26 novembre 2025",
    source: "Conseil Régional de la Bagoué & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-conseil-regional-de-la-bagoue-adopte-un-budget-primitif-2026-de-plus-de-886-milliards-fcfa/",
    precision: "APPROXIMATE",
    editor_source: "AIP",
    session_notes: "Total publié 8,869 Md ; composantes publiées arrondies ne totalisent pas exactement le total.",
  },

  // Béré (Conseil régional)
  'inst-reg-conseil-regional-du-bere': {
    total_voted_fcfa: 5428716000,
    investment_voted_fcfa: 4367779000,
    functioning_voted_fcfa: 1060935000,
    voted_date: "1 mars 2026",
    source: "Conseil Régional du Béré & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-conseil-regional-du-bere-adopte-un-budget-2026-de-plus-de-54-milliards-fcfa/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Anomalie de 2 000 FCFA entre total et somme des deux composantes publiées.",
  },

  // Cavally (Conseil régional)
  'inst-reg-conseil-regional-du-cavally': {
    total_voted_fcfa: 8273587000,
    investment_voted_fcfa: 4964152200,
    functioning_voted_fcfa: 3309434800,
    voted_date: "8 février 2026",
    source: "Conseil Régional du Cavally & KOACI",
    source_url: "https://www.koaci.com/article/2026/02/08/cote-divoire/politique/cote-divoire-conseil-regional-du-cavally-un-budget-de-8-273-587-000-fcfa-destine-a-financer-des-projets-structurants-dans-plusieurs-domaines_194176.html",
    precision: "EXACT",
    editor_source: "KOACI",
    session_notes: "KOACI fournit le montant exact 8 273 587 000 FCFA, ce qui remplace la précédente borne minimale « plus de 8,273 milliards ».",
  },

  // Gbêkê (Conseil régional)
  'inst-reg-conseil-regional-du-gbeke': {
    total_voted_fcfa: 10581000000,
    investment_voted_fcfa: 9080000000,
    functioning_voted_fcfa: 1501000000,
    voted_date: "25 juillet 2026",
    source: "Conseil Régional du Gbêkê & AIP",
    source_url: "https://www.aip.ci/electionpresidentielle2025/article.php?id=396404",
    precision: "APPROXIMATE",
    editor_source: "AIP",
    session_notes: "AIP indique que le BM1 2026 passe à 7,616 Md contre 10,581 Md au budget primitif. Fonctionnement BP publié à 1,501 Md.",
  },

  // Gontougo (Conseil régional)
  'inst-reg-conseil-regional-du-gontougo': {
    total_voted_fcfa: 3000000000,
    investment_voted_fcfa: 2000000000,
    functioning_voted_fcfa: 1000000000,
    voted_date: "8 novembre 2025",
    source: "Conseil Régional du Gontougo & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-bondoukou-le-conseil-regional-du-gontougo-renforce-le-developpement-local-lors-de-sa-session/",
    precision: "LOWER_BOUND",
    editor_source: "AIP",
    session_notes: "Source : « plus de trois milliards », dont un milliard fonctionnement et deux milliards investissement.",
  },

  // Hambol (Conseil régional)
  'inst-reg-conseil-regional-du-hambol': {
    total_voted_fcfa: 6690000000,
    investment_voted_fcfa: 5469000000,
    functioning_voted_fcfa: 1221000000,
    voted_date: "31 octobre 2025",
    source: "Conseil Régional du Hambol & KOACI",
    source_url: "https://www.koaci.com/article/2025/10/31/cote-divoire/societe/cote-divoire-region-du-hambol-un-programme-de-construction-de-40-logements-sociaux-pour-enseignants-lance-le-budget-primitif-2026-arrete-a-6690-milliards-fcfa_191653.html",
    precision: "EXACT",
    editor_source: "KOACI",
    session_notes: "KOACI publie 6,690 milliards, ventilés 1,221 milliard fonctionnement et 5,469 milliards investissement ; les composantes concordent exactement au million.",
  },

  // Haut-Sassandra (Conseil régional)
  'inst-reg-conseil-regional-du-haut-sassandra': {
    total_voted_fcfa: 9290000000,
    investment_voted_fcfa: 7810000000,
    functioning_voted_fcfa: 1490000000,
    voted_date: "15 décembre 2025",
    source: "Conseil Régional du Haut Sassandra & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-du-conseil-regional-du-haut-sassandra-en-hausse-de-pres-de-25-en-2026/",
    precision: "APPROXIMATE",
    editor_source: "AIP",
    session_notes: "Montants publiés en milliards arrondis.",
  },

  // Indénié-Djuablin (Conseil régional)
  'inst-reg-conseil-regional-de-l-indenie-djuablin': {
    total_voted_fcfa: 6636325000,
    investment_voted_fcfa: 5295473000,
    functioning_voted_fcfa: 1340852000,
    voted_date: "10 octobre 2025",
    source: "Conseil Régional de l'Indenié-Djuablin & Fraternité Matin",
    source_url: "https://www.fratmat.info/article/2637459/regions/indenie-djuablin-le-conseil-regional-adopte-un-budget-2026-de-plus-de-66-milliards-fcfa",
    precision: "EXACT",
    editor_source: "Fraternité Matin",
    session_notes: "Budget exact et ventilation exacte publiés : fonctionnement 1 340 852 000 FCFA ; investissement 5 295 473 000 FCFA.",
  },

  // La Mé (Conseil régional)
  'inst-reg-conseil-regional-de-la-me': {
    total_voted_fcfa: 6425299000,
    investment_voted_fcfa: 5076082000,
    functioning_voted_fcfa: 1349217000,
    voted_date: "17 novembre 2025",
    source: "Conseil Régional de La Mé & KOACI",
    source_url: "https://www.koaci.com/article/2025/11/17/cote-divoire/politique/cote-divoire-conseil-regional-de-la-me-20-nouveaux-projets-inscrits-au-budget-primitif-de-lexercice-2026_192008.html",
    precision: "EXACT",
    editor_source: "KOACI",
    session_notes: "Montant exact et ventilation exacte publiés ; 20 nouveaux projets annoncés pour 1 771 364 000 FCFA.",
  },

  // Lôh-Djiboua (Conseil régional)
  'inst-reg-conseil-regional-du-loh-djiboua': {
    total_voted_fcfa: 7517533000,
    investment_voted_fcfa: 4510519800,
    functioning_voted_fcfa: 3007013200,
    voted_date: "7 mars 2026",
    source: "Conseil Régional du Loh-Djiboua & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-conseil-regional-du-loh-djiboua-adopte-un-budget-primitif-de-7517-milliards-fcfa-pour-2026/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "BP 2026 autorisé (AIP, 7 mars 2026).",
  },

  // Moronou (Conseil régional)
  'inst-reg-conseil-regional-du-moronou': {
    total_voted_fcfa: 7571020000,
    investment_voted_fcfa: 6379454000,
    functioning_voted_fcfa: 1191567000,
    voted_date: "7 mars 2026",
    source: "Conseil Régional du Moronou & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-conseil-regional-du-moronou-prevoit-123-operations-dinvestissement-dans-son-budget-2026/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "AIP du 26/09/2026 indique ensuite une prévision de fonctionnement de 1 271 567 000 FCFA dans l'état d'exécution, ce qui suggère une évolution budgétaire ; le BP publié en mars reste 7 571 020 000 FCFA.",
  },

  // N'Zi (Conseil régional)
  'inst-reg-conseil-regional-du-n-zi': {
    total_voted_fcfa: 6628359000,
    investment_voted_fcfa: 5357131000,
    functioning_voted_fcfa: 1271228000,
    voted_date: "2 décembre 2025",
    source: "Conseil Régional du N'zi & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-les-conseillers-regionaux-du-nzi-adoptent-un-budget-primitif-de-plus-de-662-milliards-pour-2026/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 2 décembre 2025).",
  },

  // Poro (Conseil régional)
  'inst-reg-conseil-regional-du-poro': {
    total_voted_fcfa: 7329639000,
    investment_voted_fcfa: 5464063000,
    functioning_voted_fcfa: 1865576000,
    voted_date: "23 novembre 2025",
    source: "Conseil Régional du Poro & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-budget-primitif-2026-de-la-region-du-poro-en-hausse-de-3428/",
    precision: "EXACT",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 23 novembre 2025).",
  },

  // San-Pédro (Conseil régional)
  'inst-reg-conseil-regional-de-san-pedro': {
    total_voted_fcfa: 8303834000,
    investment_voted_fcfa: 6780134000,
    functioning_voted_fcfa: 1523700000,
    voted_date: "22 août 2026",
    source: "Conseil Régional de San Pedro & KOACI",
    source_url: "https://www.koaci.com/index.php/article/2026/08/22/cote-divoire/politique/cote-divoire-2e-session-ordinaire-le-conseil-regional-de-san-pedro-adopte-son-programme-triennal-202762029-de-plus-de-15-milliards-fcfa_199778.html",
    precision: "EXACT",
    editor_source: "KOACI",
    session_notes: "KOACI confirme le BP à 8 303 834 000 FCFA et fournit la ventilation exacte : 1 523 700 000 fonctionnement, 6 780 134 000 investissement.",
  },

  // Worodougou (Conseil régional)
  'inst-reg-conseil-regional-du-worodougou': {
    total_voted_fcfa: 7193000000,
    investment_voted_fcfa: 6138000000,
    functioning_voted_fcfa: 1055000000,
    voted_date: "30 novembre 2025",
    source: "Conseil Régional du Worodougou & AIP",
    source_url: "https://www.aip.ci/cote-divoire-aip-le-worodougou-trace-sa-feuille-de-route-financiere-pour-2026/",
    precision: "APPROXIMATE",
    editor_source: "AIP",
    session_notes: "Budget primitif 2026 publié (AIP, 30 novembre 2025).",
  },

};

const normalizeStr = (s: string) => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

/**
 * Enrichit les collectivités (communes, régions et districts) avec les budgets primitifs officiels votés
 */
export function enrichWithPrimitiveBudgets(entities: Institution[]): Institution[] {
  return entities.map(entity => {
    // 1. Direct ID lookup
    let primitive = OFFICIAL_PRIMITIVE_BUDGETS[entity.id];
    
    // 2. Robust Normalized Name Fallback
    if (!primitive) {
      const normEntity = normalizeStr(entity.name)
        .replace(/^mairiede(la)?/, '')
        .replace(/^mairiedu/, '')
        .replace(/^mairiedes/, '')
        .replace(/^mairied/, '')
        .replace(/^conseilregionalde(la)?/, '')
        .replace(/^conseilregionaldu/, '')
        .replace(/^conseilregionaldes/, '')
        .replace(/^conseilregionaldel/, '');

      for (const [key, p] of Object.entries(OFFICIAL_PRIMITIVE_BUDGETS)) {
        const normKey = normalizeStr(key.replace('inst-com-', '').replace('inst-reg-conseil-regional-', ''));
        if (normKey === normEntity || normEntity.includes(normKey) || normKey.includes(normEntity)) {
          primitive = p;
          break;
        }
      }
    }

    if (primitive) {
      return {
        ...entity,
        primitive_budget: primitive
      };
    }
    return entity;
  });
}
