import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Send, 
  FileCheck2, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Calendar, 
  Info, 
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Building,
  Briefcase,
  AlertTriangle,
  User,
  Building2,
  Landmark,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Check,
  CheckSquare,
  Square,
  Award,
  ArrowRight,
  Eye,
  Filter,
  Layers,
  FileCheck,
  Scale
} from 'lucide-react';
import { Institution, BudgetProject } from '../types';
import { formatFCFA, formatDateFR } from '../utils/formatters';
import { dataStore } from '../services/dataStore';
import { findCaidpRI } from '../data/caidpRiData';

interface OfficialDocRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution?: Institution | null;
  project?: BudgetProject | null;
}

type UserLegalStatus = 'CITOYEN' | 'JOURNALISTE' | 'CHERCHEUR' | 'OSC';

export type CaidpPillarCategory = 
  | 'ALL'
  | 'PRIORITY'
  | 'FINANCES'
  | 'PROCUREMENT'
  | 'PLANIFICATION'
  | 'BILAN_AUDIT'
  | 'DELIBERATIONS'
  | 'PRESTATIONS_IDENTITE'
  | 'POLITIQUES_EIES';

interface LegalDocItem {
  id: string;
  category: 'FINANCES' | 'PROCUREMENT' | 'PLANIFICATION' | 'BILAN_AUDIT' | 'DELIBERATIONS' | 'PRESTATIONS_IDENTITE' | 'POLITIQUES_EIES';
  categoryLabel: string;
  title: string;
  description: string;
  legalBasis: string;
  isPriorityForCivic: boolean;
  applicableTypes: ('MAIRIE' | 'REGION' | 'MINISTERE' | 'INSTITUTION' | 'AUTORITE_REGULATION' | 'PROJECT')[];
}

/**
 * Catalogue Officiel des Documents Publics (Loi n°2013-867 / CAIDP)
 */
const ALL_LEGAL_DOCUMENTS: LegalDocItem[] = [
  // =========================================================================
  // FINANCES & DÉPENSES PUBLIQUES
  // =========================================================================
  {
    id: 'budget_organisme_et_fonds',
    category: 'FINANCES',
    categoryLabel: 'Finances & Budget',
    title: 'Budget Primitif (BP) de l\'organisme & Fonds gérés',
    description: 'Budget annuel voté / alloué, dotations de fonctionnement et d\'investissement, fonds spéciaux et annexes.',
    legalBasis: 'Art. 2 & 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },
  {
    id: 'etat_execution_budget_compte_admin',
    category: 'FINANCES',
    categoryLabel: 'Finances & Budget',
    title: 'État d\'exécution du Budget & Compte Administratif (CA)',
    description: 'Rapports semestriels et annuels d\'exécution des dépenses et recettes, consommation des crédits et bilans clos.',
    legalBasis: 'Art. 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },
  {
    id: 'plan_passation_marches_ppm',
    category: 'PROCUREMENT',
    categoryLabel: 'Marchés Publics',
    title: 'Plan de Passation des Marchés (PPM) & Marchés Programmés',
    description: 'Calendrier prévisionnel annuel des marchés publics à lancer, montants alloués et modes de passation retenus.',
    legalBasis: 'Code des Marchés Publics',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION', 'PROJECT'],
  },
  {
    id: 'marches_publics_passes_attributions',
    category: 'PROCUREMENT',
    categoryLabel: 'Marchés Publics',
    title: 'Marchés Publics Passés & Procès-Verbaux d\'Attribution',
    description: 'Registre des avis d\'attribution, identité des entreprises attributaires, montants contractuels adjugés et PV d\'ouverture.',
    legalBasis: 'Art. 4 & 12 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION', 'PROJECT'],
  },
  {
    id: 'etat_execution_marches_reception',
    category: 'PROCUREMENT',
    categoryLabel: 'Marchés Publics',
    title: 'État d\'Exécution des Marchés & PV de Réception des Travaux',
    description: 'État d\'avancement physique et financier des chantiers, PV de réception provisoire/définitive et décomptes.',
    legalBasis: 'Art. 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION', 'PROJECT'],
  },
  {
    id: 'bilans_financiers_et_analyses',
    category: 'FINANCES',
    categoryLabel: 'Finances & Budget',
    title: 'Bilans Financiers, Rapports d\'Analyses & Comptes de Gestion',
    description: 'États financiers certifiés, rapports de gestion comptable et états comparatifs des réalisations.',
    legalBasis: 'Art. 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },
  {
    id: 'subventions_dons_conventions_bailleurs',
    category: 'FINANCES',
    categoryLabel: 'Finances & Budget',
    title: 'Subventions, Dons, Legs & Conventions de Financement',
    description: 'Accords financiers avec les partenaires techniques et financiers (PTF), appuis extérieurs et coopération.',
    legalBasis: 'Art. 2 • Loi n°2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },
  {
    id: 'taxes_locales_odp_recouvrement',
    category: 'FINANCES',
    categoryLabel: 'Fiscalité Locale',
    title: 'Recouvrement des Taxes Locales & Droits d\'Occupation du Domaine Public (ODP)',
    description: 'Tarification des taxes municipales/régionales, droits de place sur les marchés et recettes fiscales recouvrées.',
    legalBasis: 'Art. 2 & 4 • Loi n°2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MAIRIE', 'REGION'],
  },

  // =========================================================================
  // PLANIFICATION & INVESTISSEMENTS
  // =========================================================================
  {
    id: 'programme_triennal_pti_ptd',
    category: 'PLANIFICATION',
    categoryLabel: 'Planification',
    title: 'Programme Triennal d\'Investissement (PTI / PTD) & Projets',
    description: 'Cartographie pluriannuelle des chantiers (Écoles, CHR/Dispensaires, Voiries, Hydraulique), coûts et localisations.',
    legalBasis: 'Art. 2 & 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION'],
  },
  {
    id: 'plan_travail_annuel_budgetise_ptab',
    category: 'PLANIFICATION',
    categoryLabel: 'Planification',
    title: 'Plan de Travail Annuel Budgétisé (PTAB) & Plan d\'Actions',
    description: 'Matrice opérationnelle des activités programmées, indicateurs de mise en œuvre et allocation budgétaire.',
    legalBasis: 'Art. 2 & 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE', 'REGION', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },

  // =========================================================================
  // BILAN, AUDITS & DÉLIBÉRATIONS
  // =========================================================================
  {
    id: 'rapports_annuels_activite_rap',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Bilan & Activités',
    title: 'Rapports Annuels d\'Activité & Rapports de Performance (RAP)',
    description: 'Bilan d\'exécution des politiques publiques, atteinte des objectifs de développement et rapports sectoriels.',
    legalBasis: 'Art. 2 & 7 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },
  {
    id: 'proces_verbaux_deliberations_conseils',
    category: 'DELIBERATIONS',
    categoryLabel: 'Délibérations',
    title: 'Procès-Verbaux des Sessions & Délibérations du Conseil',
    description: 'Comptes-rendus intégraux des sessions plénières du Conseil Municipal / Régional et décisions exécutoires.',
    legalBasis: 'Art. 2 & 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE', 'REGION'],
  },
  {
    id: 'rapports_audits_cour_des_comptes',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Audits & Contrôle',
    title: 'Rapports d\'Audits (Cour des Comptes, Inspections Générales)',
    description: 'Conclusions des missions d\'audit financier, d\'évaluation de gestion publique et recommandations officielles.',
    legalBasis: 'Art. 2 & 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION', 'REGION', 'MAIRIE'],
  },
  {
    id: 'arretes_decisions_reglementaires',
    category: 'DELIBERATIONS',
    categoryLabel: 'Actes Juridiques',
    title: 'Arrêtés, Décisions Règlementaires & Circulaires d\'Application',
    description: 'Actes administratifs unilatéraux, règlements de police administrative, arrêtés de voirie et circulaires.',
    legalBasis: 'Art. 2 • Loi n°2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },
  {
    id: 'statistiques_chiffres_etudes_sectorielles',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Données & Études',
    title: 'Données Statistiques Officielles & Rapports d\'Études Sectorielles',
    description: 'Bases de données chiffrées d\'intérêt public, recensements d\'équipements publics et rapports d\'impact.',
    legalBasis: 'Art. 2 • Loi n°2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MINISTERE', 'REGION', 'MAIRIE', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },

  // =========================================================================
  // POLITIQUES PUBLIQUES & ENVIRONNEMENT (EIES)
  // =========================================================================
  {
    id: 'etude_impact_environnemental_eies',
    category: 'POLITIQUES_EIES',
    categoryLabel: 'Environnement & EIES',
    title: 'Étude d\'Impact Environnemental et Social (EIES) & Plans de Gestion',
    description: 'Rapport d\'évaluation des impacts écologiques, plan de gestion environnementale et sociale (PGES) validé par l\'ANDE.',
    legalBasis: 'Code de l\'Environnement • Loi 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE', 'PROJECT', 'REGION', 'MAIRIE'],
  },
  {
    id: 'documents_cadres_politiques_sociales',
    category: 'POLITIQUES_EIES',
    categoryLabel: 'Politiques Publiques',
    title: 'Documents Cadres de Politiques Sociales, Économiques & Sanitaires',
    description: 'Stratégies sectorielles nationales et régionales de développement, schémas directeurs et plans d\'action.',
    legalBasis: 'Art. 2 • Loi n°2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MINISTERE', 'REGION', 'INSTITUTION'],
  },

  // =========================================================================
  // GOUVERNANCE, PRESTATIONS & SERVICES
  // =========================================================================
  {
    id: 'organigramme_nominatif_responsables',
    category: 'PRESTATIONS_IDENTITE',
    categoryLabel: 'Gouvernance',
    title: 'Organigramme Officiel Nominatif & Textes Juridiques de Création',
    description: 'Structure administrative avec identification nominative des directeurs, décrets ou arrêtés organiques de création.',
    legalBasis: 'Art. 2 • Loi n°2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MAIRIE', 'REGION', 'MINISTERE', 'INSTITUTION', 'AUTORITE_REGULATION'],
  },
  {
    id: 'guides_procedures_prestations_usagers',
    category: 'PRESTATIONS_IDENTITE',
    categoryLabel: 'Services Usagers',
    title: 'Guides des Démarches & Manuels de Procédures pour Usagers',
    description: 'Modalités d\'accès aux services publics (démarches d\'état civil, autorisations, permis), coûts et formulaires types.',
    legalBasis: 'Art. 2 • Loi n°2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MAIRIE', 'MINISTERE', 'AUTORITE_REGULATION', 'REGION'],
  },
  {
    id: 'decisions_regulation_sanctions_licences',
    category: 'DELIBERATIONS',
    categoryLabel: 'Régulation & Décisions',
    title: 'Décisions de Régulation, Sanctions Administratives & Agréments',
    description: 'Avis de conformité, licences d\'exploitation, décisions tarifaires, sanctions et mises en demeure notifiées.',
    legalBasis: 'Art. 2 & 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['AUTORITE_REGULATION'],
  },
  {
    id: 'rapport_redevances_regulation_sectorielle',
    category: 'FINANCES',
    categoryLabel: 'Redevances & Régulation',
    title: 'Rapport Annuel de Régulation & Perception des Redevances',
    description: 'Bilan de perception des redevances et taxes sectorielles, audits de qualité de service et conformité.',
    legalBasis: 'Art. 2 & 4 • Loi n°2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['AUTORITE_REGULATION'],
  },

  // =========================================================================
  // PROJET / CHANTIER CIBLÉ
  // =========================================================================
  {
    id: 'dao_cahier_prescriptions_techniques',
    category: 'PROCUREMENT',
    categoryLabel: 'Projet Ciblé',
    title: 'Dossier d\'Appel d\'Offres (DAO) & Spécifications Techniques du Chantier',
    description: 'Cahier des clauses techniques particulières (CCTP), bordereau des prix et devis quantitatif estimatif de l\'ouvrage.',
    legalBasis: 'Code des Marchés Publics • Art. 4 & 12',
    isPriorityForCivic: true,
    applicableTypes: ['PROJECT'],
  },
  {
    id: 'pv_reception_decompte_financier_projet',
    category: 'PROCUREMENT',
    categoryLabel: 'Projet Ciblé',
    title: 'PV de Réception des Travaux & Décompte Général Définitif des Paiements',
    description: 'Procès-verbal de réception provisoire/définitive de l\'ouvrage et état récapitulatif des sommes décaissées.',
    legalBasis: 'Code des Marchés Publics • Art. 4',
    isPriorityForCivic: true,
    applicableTypes: ['PROJECT'],
  }
];

export const OfficialDocRequestModal: React.FC<OfficialDocRequestModalProps> = ({
  isOpen,
  onClose,
  institution,
  project,
}) => {
  const [activeTab, setActiveTab] = useState<'SELECTION' | 'FORM' | 'PREVIEW'>('SELECTION');
  const [activePillarFilter, setActivePillarFilter] = useState<CaidpPillarCategory>('ALL');
  const [userStatus, setUserStatus] = useState<UserLegalStatus>('CITOYEN');
  const [citizenName, setCitizenName] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenAddress, setCitizenAddress] = useState('');
  const [documentSubject, setDocumentSubject] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Determine target entity info & resolved type
  const targetEntityName = project 
    ? (project.ministry_name || project.institution_name || project.commune_name || project.region_name || 'Autorité Publique')
    : (institution?.name || 'Organisme Public');

  const resolvedEntityType: 'MAIRIE' | 'REGION' | 'MINISTERE' | 'INSTITUTION' | 'AUTORITE_REGULATION' | 'PROJECT' = useMemo(() => {
    if (project) return 'PROJECT';
    if (!institution) return 'MAIRIE';
    
    const rawType = (institution.type || '').toUpperCase();
    const nameLower = (institution.name || '').toLowerCase();
    
    if (rawType === 'PROJECT') return 'PROJECT';
    if (rawType === 'MINISTERE' || rawType === 'GOUVERNEMENT' || nameLower.startsWith('ministère') || nameLower.startsWith('ministere') || nameLower.includes('primature')) {
      return 'MINISTERE';
    }
    if (rawType === 'AUTORITE_REGULATION' || rawType === 'REGULATEUR' || rawType === 'AAI' || nameLower.includes('autorité') || nameLower.includes('regulation') || nameLower.includes('haca') || nameLower.includes('artci') || nameLower.includes('anare') || nameLower.includes('airp') || nameLower.includes('arcop')) {
      return 'AUTORITE_REGULATION';
    }
    if (rawType === 'REGION' || rawType === 'DISTRICT' || rawType === 'CONSEIL_REGIONAL' || nameLower.includes('conseil régional') || nameLower.includes('conseil regional') || nameLower.includes('district autonome')) {
      return 'REGION';
    }
    if (rawType === 'INSTITUTION' || nameLower.includes('présidence') || nameLower.includes('presidence') || nameLower.includes('assemblée') || nameLower.includes('assemblee') || nameLower.includes('sénat') || nameLower.includes('senat') || nameLower.includes('cour des comptes') || nameLower.includes('conseil constitutionnel') || nameLower.includes('habg') || nameLower.includes('médiateur') || nameLower.includes('cesec')) {
      return 'INSTITUTION';
    }
    if (rawType === 'MAIRIE' || rawType === 'COMMUNE' || nameLower.startsWith('mairie')) {
      return 'MAIRIE';
    }
    
    return 'MAIRIE';
  }, [project, institution]);

  // Lookup in reactive DataStore CAIDP Directory API first, fallback to static baseline
  const caidpMatch = dataStore.findCaidpEntity(targetEntityName) || findCaidpRI(targetEntityName);

  // Search institution in store if we only have a project
  const matchedInstitution = institution || (project ? dataStore.getInstitutions().find(inst => 
    inst.name.toLowerCase().includes(targetEntityName.toLowerCase()) ||
    targetEntityName.toLowerCase().includes(inst.name.toLowerCase())
  ) : null);

  const hasNominatedRi = Boolean(
    (caidpMatch?.ri_name && caidpMatch.ri_name !== 'Non désigné' && caidpMatch.ri_name.trim() !== '') ||
    (matchedInstitution?.info_officer_name && matchedInstitution.info_officer_name !== 'Non désigné' && matchedInstitution.info_officer_name !== 'Responsable de l\'Information (RI)')
  );

  const infoOfficerName = hasNominatedRi
    ? (caidpMatch?.ri_name || matchedInstitution?.info_officer_name || 'Responsable de l\'Information')
    : 'Non désigné (Assuré par le Premier Responsable - Art. 10)';

  const infoOfficerFunction = caidpMatch?.ri_function || matchedInstitution?.info_officer_title || 'Service d\'Accès aux Documents Publics (Loi n°2013-867)';
  
  const rawEmail = caidpMatch?.email || matchedInstitution?.info_officer_email;
  const hasDirectEmail = Boolean(rawEmail && rawEmail !== "Pas d'email" && rawEmail.trim() !== "");
  const displayEmail = hasDirectEmail ? rawEmail : "Non publié au registre public";
  const recipientEmail = hasDirectEmail ? rawEmail : 'contact@caidp.ci';

  const rawPhone = caidpMatch?.phone || matchedInstitution?.info_officer_phone;
  const hasDirectPhone = Boolean(rawPhone && rawPhone !== "Pas de numéro" && rawPhone.trim() !== "");
  const displayPhone = hasDirectPhone ? rawPhone : "Non publié au registre public";

  // Filter available documents for this specific entity type
  const availableDocs = useMemo(() => {
    const matched = ALL_LEGAL_DOCUMENTS.filter(doc => doc.applicableTypes.includes(resolvedEntityType));
    if (matched.length === 0) {
      return ALL_LEGAL_DOCUMENTS.filter(doc => !doc.applicableTypes.includes('PROJECT'));
    }
    return matched;
  }, [resolvedEntityType]);

  // Priority docs for this entity type (Civic Monitoring Core)
  const priorityDocs = useMemo(() => {
    return availableDocs.filter(d => d.isPriorityForCivic);
  }, [availableDocs]);

  // Filtered docs based on selected CAIDP pillar tab
  const displayedDocs = useMemo(() => {
    if (activePillarFilter === 'ALL') return availableDocs;
    if (activePillarFilter === 'PRIORITY') return priorityDocs;
    return availableDocs.filter(d => d.category === activePillarFilter);
  }, [availableDocs, priorityDocs, activePillarFilter]);

  // Initialize selection with priority documents on entity change or modal open
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('SELECTION');
    setActivePillarFilter('ALL');
    const defaultPriorityIds = priorityDocs.map(d => d.id);
    setSelectedDocIds(defaultPriorityIds);

    if (project) {
      setDocumentSubject(`Communication des pièces officielles du marché public : ${project.title}`);
    } else if (institution) {
      if (institution.type === 'MAIRIE') {
        setDocumentSubject(`Communication du Budget Primitif, Compte Administratif, PTI & Marchés Publics (${institution.name})`);
      } else if (institution.type === 'REGION' || institution.type === 'DISTRICT') {
        setDocumentSubject(`Communication du Budget Régional, Programme Triennal (PTD) & Marchés Publics (${institution.name})`);
      } else if (institution.type === 'MINISTERE') {
        setDocumentSubject(`Communication des Rapports de Performance (RAP), PPM & Budgets-Programmes (${institution.name})`);
      } else if (institution.type === 'AUTORITE_REGULATION') {
        setDocumentSubject(`Communication des Décisions de Régulation, Bilan des Redevances & Audits (${institution.name})`);
      } else {
        setDocumentSubject(`Accès aux documents budgétaires, rapports d'activité & marchés publics (${institution.name})`);
      }
    } else {
      setDocumentSubject(`Demande officielle de communication de documents administratifs (Loi n°2013-867)`);
    }
  }, [isOpen, project, institution, resolvedEntityType]);

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const referenceNumber = `CAIDP-SB-${Date.now().toString().slice(-6)}`;
  const legalDelayDays = (userStatus === 'JOURNALISTE' || userStatus === 'CHERCHEUR') ? 15 : 30;

  // Toggle single document selection
  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Quick Pack selection handlers
  const handleSelectPriorityPack = () => {
    setSelectedDocIds(priorityDocs.map(d => d.id));
  };

  const handleSelectProcurementPack = () => {
    const procurementIds = availableDocs.filter(d => d.category === 'PROCUREMENT').map(d => d.id);
    setSelectedDocIds(procurementIds.length > 0 ? procurementIds : priorityDocs.map(d => d.id));
  };

  const handleSelectFinancialPack = () => {
    const financialIds = availableDocs.filter(d => d.category === 'FINANCES' || d.category === 'PLANIFICATION').map(d => d.id);
    setSelectedDocIds(financialIds.length > 0 ? financialIds : priorityDocs.map(d => d.id));
  };

  const handleSelectAllDocs = () => {
    setSelectedDocIds(availableDocs.map(d => d.id));
  };

  const handleClearDocs = () => {
    setSelectedDocIds([]);
  };

  // Computed document list for letter
  const formattedDocumentList = useMemo(() => {
    const selectedItems = availableDocs.filter(d => selectedDocIds.includes(d.id));
    
    let text = selectedItems.map((d, index) => `${index + 1}. ${d.title}\n   (${d.description} — Réf: ${d.legalBasis})`).join('\n\n');
    
    if (project) {
      text += `\n\nPrécisions sur le marché public ciblé :\n` +
              `- Intitulé de l'ouvrage : ${project.title}\n` +
              `- Montant alloué au budget : ${formatFCFA(project.budget_amount_fcfa)} (Exercice ${project.fiscal_year || 2026})\n` +
              `- Référence Loi de Finances : ${project.source || 'Loi de Finances 2026'}`;
    }

    if (customNotes.trim()) {
      text += `\n\nCompléments spécifiques du demandeur :\n${customNotes.trim()}`;
    }

    return text || '1. Tous documents administratifs et budgétaires communicables relatifs à l\'exercice des missions d\'intérêt public de l\'organisme.';
  }, [availableDocs, selectedDocIds, project, customNotes]);

  // Dynamic salutation based on entity type and RI availability
  const dynamicSalutation = useMemo(() => {
    if (hasNominatedRi) return `Madame, Monsieur le Responsable de l'Information`;
    if (resolvedEntityType === 'MAIRIE') return `Monsieur le Maire`;
    if (resolvedEntityType === 'REGION') return `Monsieur le Président du Conseil Régional`;
    if (resolvedEntityType === 'MINISTERE') return `Monsieur le Ministre`;
    return `Monsieur le Président / Directeur Général`;
  }, [hasNominatedRi, resolvedEntityType]);

  // Dynamic recipient title for the envelope/header
  const dynamicRecipientTitle = useMemo(() => {
    if (hasNominatedRi) {
      return `À l'attention de ${infoOfficerName}\nResponsable de l'Information (Art. 10 Loi n°2013-867)`;
    }
    if (resolvedEntityType === 'MAIRIE') {
      return `À l'attention de Monsieur le Maire\n(Assumant les fonctions de Responsable de l'Information - Art. 10)`;
    }
    if (resolvedEntityType === 'REGION') {
      return `À l'attention de Monsieur le Président du Conseil Régional\n(Assumant les fonctions de Responsable de l'Information - Art. 10)`;
    }
    if (resolvedEntityType === 'MINISTERE') {
      return `À l'attention de Monsieur le Ministre\n(Et du Responsable de l'Information - Art. 10)`;
    }
    return `À l'attention de la Direction Générale / Présidence\n(Assumant les fonctions de Responsable de l'Information - Art. 10)`;
  }, [hasNominatedRi, infoOfficerName, resolvedEntityType]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const fullText = 
      `DEMANDE D'ACCÈS AUX DOCUMENTS PUBLICS\n` +
      `Application de la Loi n°2013-867 du 23 décembre 2013 (CAIDP)\n` +
      `Réf : ${referenceNumber} — Fait le : ${todayStr}\n\n` +
      `LE DEMANDEUR :\n` +
      `Nom & Prénom : ${citizenName || '[Nom et Prénom]'}\n` +
      `Qualité : ${userStatus === 'CITOYEN' ? 'Citoyen / Usager' : userStatus === 'JOURNALISTE' ? 'Journaliste Professionnel' : userStatus === 'CHERCHEUR' ? 'Chercheur / Universitaire' : 'Organisation de la Société Civile (OSC)'}\n` +
      `Email : ${citizenEmail || '[Email de contact]'}\n` +
      `Téléphone : ${citizenPhone || '[Téléphone]'}\n` +
      `Adresse / Résidence : ${citizenAddress || 'Côte d\'Ivoire'}\n\n` +
      `DESTINATAIRE :\n` +
      `${dynamicRecipientTitle}\n` +
      `Organisme : ${targetEntityName}\n` +
      (hasDirectEmail ? `Email : ${displayEmail}\n` : '') +
      (hasDirectPhone ? `Téléphone : ${displayPhone}\n` : '') +
      `\n` +
      `OBJET : Demande de communication de documents d'intérêt public\n` +
      `Fondement légal : Articles 2, 4, 7, 8, 10 & 12 de la Loi n°2013-867 relative à l'accès à l'information d'intérêt public.\n\n` +
      `${dynamicSalutation},\n\n` +
      `Dans le cadre du suivi citoyen et de la promotion de la transparence de l'action publique garantis par la Loi n°2013-867 du 23 décembre 2013 en République de Côte d'Ivoire, j'ai l'honneur de solliciter respectueusement la communication des documents administratifs suivants :\n\n` +
      `${formattedDocumentList}\n\n` +
      `Je vous saurais gré de bien vouloir me transmettre ces éléments par voie électronique à l'adresse indiquée ci-dessus, ou de m'indiquer les modalités pratiques de leur consultation dans les délais prévus par la réglementation en vigueur (conformément à l'Article 12 de la Loi n°2013-867).\n\n` +
      `Je reste à votre entière disposition pour tout échange facilitant le bon traitement de cette démarche constructive.\n\n` +
      `Dans l'attente de votre réponse, je vous prie d'agréer, ${dynamicSalutation}, l'expression de mes salutations distinguées et respectueuses.\n\n` +
      `Signature du Demandeur :\n` +
      `${citizenName || '[Nom du Demandeur]'}\n\n` +
      `--- \n` +
      `Document généré via la plateforme citoyenne SuiviBudget Côte d'Ivoire (suivibudget.ci) • Réf: ${referenceNumber}`;

    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`[Loi n°2013-867] Demande d'accès aux documents publics - ${targetEntityName} - Réf: ${referenceNumber}`);
    const body = encodeURIComponent(
      `${dynamicSalutation},\n\n` +
      `En application de la Loi n°2013-867 du 23 décembre 2013 relative à l'accès à l'information d'intérêt public en République de Côte d'Ivoire, j'ai l'honneur de solliciter respectueusement la communication des documents administratifs suivants :\n\n` +
      `OBJET : ${documentSubject}\n\n` +
      `DOCUMENTS SOLLICITÉS :\n` +
      `${formattedDocumentList}\n\n` +
      `Je vous saurais gré de bien vouloir me transmettre ces éléments par voie électronique en réponse à cet email ou de m'indiquer les modalités de consultation, dans les délais prévus par la réglementation en vigueur (Article 12 de la Loi n°2013-867).\n\n` +
      `Je reste à votre disposition pour toute précision utile.\n\n` +
      `COORDONNÉES DU DEMANDEUR :\n` +
      `Nom & Prénom : ${citizenName || '[Votre Nom et Prénom]'}\n` +
      `Qualité : ${userStatus === 'CITOYEN' ? 'Citoyen / Usager' : userStatus === 'JOURNALISTE' ? 'Journaliste Professionnel' : userStatus === 'CHERCHEUR' ? 'Chercheur / Universitaire' : 'Société Civile'}\n` +
      `Email : ${citizenEmail || '[Votre Email]'}\n` +
      `Téléphone : ${citizenPhone || '[Votre Téléphone]'}\n` +
      `Résidence : ${citizenAddress || 'Côte d\'Ivoire'}\n\n` +
      `Fait le ${todayStr} • Réf : ${referenceNumber}\n` +
      `Généré via la plateforme citoyenne SuiviBudget Côte d'Ivoire (suivibudget.ci).`
    );
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ========================================================================= */}
        {/* MODAL HEADER : REPUBLIC ACCENTS & TARGET INFORMATION */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center flex-shrink-0 mt-0.5">
              <Landmark className="w-6 h-6 text-brand-orange" />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-orange/20 text-brand-orange border border-brand-orange/30">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-orange" />
                <span>Loi n°2013-867 • Accès aux Documents Publics (CAIDP)</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight font-sans">
                Générateur de Demande Officielle de Documents Publics
              </h2>
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-0.5">
                <span className="bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700 font-semibold text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Organisme : <strong className="text-white">{targetEntityName}</strong></span>
                </span>
                <span className="bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700 font-semibold text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-orange" />
                  <span>RI Officiel (Art. 10) : <strong className="text-brand-orange">{infoOfficerName}</strong></span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
            title="Fermer la fenêtre"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STEP / TAB SWITCHER */}
        {/* ========================================================================= */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-2 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('SELECTION')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SELECTION'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FileCheck2 className={`w-3.5 h-3.5 ${activeTab === 'SELECTION' ? 'text-white' : 'text-brand-blue'}`} />
              <span>1. Catalogue des Documents Légaux</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'SELECTION' ? 'bg-white/20 text-white' : 'bg-brand-blue/10 text-brand-blue'
              }`}>
                {selectedDocIds.length} sélectionné{selectedDocIds.length > 1 ? 's' : ''}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('FORM')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'FORM'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <User className={`w-3.5 h-3.5 ${activeTab === 'FORM' ? 'text-white' : 'text-slate-500'}`} />
              <span>2. Coordonnées & Qualité</span>
            </button>

            <button
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'PREVIEW'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeTab === 'PREVIEW' ? 'text-white' : 'text-emerald-600'}`} />
              <span>3. Aperçu Lettre Officielle</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500 hidden sm:block">
            Délai légal garanti : <span className="text-brand-blue font-extrabold">{legalDelayDays} jours</span> (Loi 2013-867)
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SCROLLABLE MAIN CONTENT AREA */}
        {/* ========================================================================= */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50/70">

          {/* TAB 1: SELECTION OF LEGAL DOCUMENTS (CUSTOMIZED BY ENTITY) */}
          {activeTab === 'SELECTION' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Quick Packs Selector */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-orange" />
                      <span>Modèles & Packs de Documents Recommandés</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sélectionnez en 1 clic le pack adapté à votre démarche ou personnalisez document par document.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={handleSelectPriorityPack}
                      className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-700" />
                      <span>⭐ Pack Essentiel</span>
                    </button>
                    <button
                      onClick={handleSelectFinancialPack}
                      className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-brand-blue border border-blue-200 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-brand-blue" />
                      <span>Pack Finances</span>
                    </button>
                    <button
                      onClick={handleSelectProcurementPack}
                      className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Pack Marchés Publics</span>
                    </button>
                    <button
                      onClick={handleSelectAllDocs}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Tout cocher
                    </button>
                    <button
                      onClick={handleClearDocs}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Effacer
                    </button>
                  </div>
                </div>

                {/* Categories Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                  <span className="text-slate-400 font-black uppercase text-[10px] flex items-center gap-1 mr-1 flex-shrink-0">
                    <Filter className="w-3 h-3" />
                    <span>Catégories :</span>
                  </span>
                  {[
                    { id: 'ALL', label: `Tous (${availableDocs.length})` },
                    { id: 'PRIORITY', label: `⭐ Essentiels (${priorityDocs.length})` },
                    { id: 'FINANCES', label: 'Finances & Budget' },
                    { id: 'PROCUREMENT', label: 'Marchés Publics' },
                    { id: 'PLANIFICATION', label: 'Planification' },
                    { id: 'BILAN_AUDIT', label: 'Bilan & Audits' },
                    { id: 'DELIBERATIONS', label: 'Délibérations' },
                    { id: 'POLITIQUES_EIES', label: 'Politiques & EIES' },
                    { id: 'PRESTATIONS_IDENTITE', label: 'Gouvernance & Services' },
                  ].map((filterItem) => (
                    <button
                      key={filterItem.id}
                      onClick={() => setActivePillarFilter(filterItem.id as CaidpPillarCategory)}
                      className={`px-2.5 py-1 rounded-lg transition-all flex-shrink-0 cursor-pointer ${
                        activePillarFilter === filterItem.id
                          ? 'bg-brand-blue text-white font-black shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {filterItem.label}
                    </button>
                  ))}
                </div>

                {/* Available Documents Checklist Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {displayedDocs.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocSelection(doc.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isSelected
                            ? 'bg-blue-50/70 border-2 border-brand-blue shadow-xs ring-2 ring-brand-blue/10'
                            : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-lg bg-brand-blue text-white flex items-center justify-center font-black shadow-2xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-lg border-2 border-slate-300 bg-slate-50" />
                          )}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {doc.categoryLabel}
                            </span>
                            {doc.isPriorityForCivic && (
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-amber-50 text-amber-900 border border-amber-300'
                              }`}>
                                <Award className="w-3 h-3" />
                                <span>⭐ Essentiel</span>
                              </span>
                            )}
                          </div>

                          <h4 className={`text-xs font-black leading-snug ${isSelected ? 'text-slate-950' : 'text-slate-900'}`}>
                            {doc.title}
                          </h4>

                          <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-slate-700 font-medium' : 'text-slate-600'}`}>
                            {doc.description}
                          </p>

                          <div className={`text-[10px] font-mono font-semibold pt-0.5 ${isSelected ? 'text-brand-blue font-bold' : 'text-slate-400'}`}>
                            Réf : {doc.legalBasis}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Free Text / Custom additions */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Précisions complémentaires ou questions spécifiques (Optionnel) :
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: Préciser un quartier particulier, une année de budget spécifique (2024, 2025, 2026) ou le nom d'une entreprise prestataire..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-brand-blue leading-relaxed font-sans"
                />
              </div>

              {/* Next Step CTA */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveTab('FORM')}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Étape suivante : Coordonnées du Demandeur</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: CITIZEN INFORMATION & LEGAL STATUS */}
          {activeTab === 'FORM' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* User Legal Status Selector */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Votre qualité de demandeur (Définit les délais légaux impartis) :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'CITOYEN', label: 'Citoyen / Usager', delay: '30 jours' },
                    { id: 'JOURNALISTE', label: 'Journaliste', delay: '15 jours' },
                    { id: 'CHERCHEUR', label: 'Chercheur / Universitaire', delay: '15 jours' },
                    { id: 'OSC', label: 'Société Civile / ONG', delay: '30 jours' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setUserStatus(s.id as UserLegalStatus)}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all text-left flex flex-col cursor-pointer ${
                        userStatus === s.id
                          ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{s.label}</span>
                      <span className={`text-[10px] mt-0.5 font-extrabold ${userStatus === s.id ? 'text-amber-300' : 'text-slate-500'}`}>
                        Délai légal : {s.delay}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Citizen Identity & Contact Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Coordonnées pour la réception des documents
                </h3>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nom & Prénom(s) du demandeur *</label>
                  <input
                    type="text"
                    placeholder="Ex: Kouassi Jean-Marc"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-brand-blue font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Email de transmission *</label>
                    <input
                      type="email"
                      placeholder="jean@exemple.ci"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-brand-blue font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Téléphone de contact</label>
                    <input
                      type="tel"
                      placeholder="+225 07 00 00 00"
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-brand-blue font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ville / Commune de résidence</label>
                  <input
                    type="text"
                    placeholder="Ex: Abidjan, Cocody ou Bouaké"
                    value={citizenAddress}
                    onChange={(e) => setCitizenAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-brand-blue font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Intitulé ou Objet de la demande</label>
                  <input
                    type="text"
                    value={documentSubject}
                    onChange={(e) => setDocumentSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-brand-blue font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Navigation CTAs */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setActiveTab('SELECTION')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ← Retour aux Documents
                </button>
                <button
                  onClick={() => setActiveTab('PREVIEW')}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Générer & Consulter la Lettre Officielle</span>
                  <Eye className="w-4 h-4 text-white" />
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: OFFICIAL PRINTABLE REPUBLICAN LETTER PREVIEW */}
          {activeTab === 'PREVIEW' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Official Letter Preview Sheet */}
              <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-300 shadow-md font-serif text-slate-900 space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none">
                
                {/* Header : Reference & Legal Framework */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-4 font-sans">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-brand-blue block">
                      Demande d'accès aux documents publics
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">Application de la Loi n°2013-867 du 23 décembre 2013 (CAIDP)</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-600 font-sans">
                    <span className="font-bold block text-slate-900 font-mono">Réf : {referenceNumber}</span>
                    <span>Fait le {todayStr}</span>
                  </div>
                </div>

                {/* Letter Headers (Sender & Recipient) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 font-sans text-xs pt-1">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-black text-slate-400 uppercase text-[10px] block mb-1">LE DEMANDEUR :</span>
                    <p className="font-black text-slate-900 text-sm">{citizenName || '[Nom et Prénom]'}</p>
                    <p className="text-slate-600 font-semibold text-[11px]">
                      Qualité : {userStatus === 'CITOYEN' ? 'Citoyen / Usager' : userStatus === 'JOURNALISTE' ? 'Journaliste Professionnel' : userStatus === 'CHERCHEUR' ? 'Chercheur / Universitaire' : 'Société Civile'}
                    </p>
                    <p className="text-slate-600">{citizenEmail || '[Email de contact]'}</p>
                    <p className="text-slate-600">{citizenPhone || '[Téléphone]'}</p>
                    <p className="text-slate-600">{citizenAddress || '[Commune de résidence, Côte d\'Ivoire]'}</p>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-1 sm:text-right">
                    <span className="font-black text-brand-blue uppercase text-[10px] block mb-1">DESTINATAIRE :</span>
                    <p className="font-black text-slate-900 text-xs whitespace-pre-line leading-snug">
                      {hasNominatedRi 
                        ? `À l'attention de ${infoOfficerName}\nResponsable de l'Information (Art. 10)`
                        : resolvedEntityType === 'MAIRIE'
                        ? `À l'attention de Monsieur le Maire\n(Assumant les fonctions de RI - Art. 10)`
                        : resolvedEntityType === 'REGION'
                        ? `À l'attention de Monsieur le Président du Conseil Régional\n(Assumant les fonctions de RI - Art. 10)`
                        : resolvedEntityType === 'MINISTERE'
                        ? `À l'attention de Monsieur le Ministre\n(Et du Responsable de l'Information - Art. 10)`
                        : `À l'attention de la Direction Générale / Présidence\n(Assumant les fonctions de RI - Art. 10)`
                      }
                    </p>
                    <p className="font-bold text-slate-800 pt-0.5">{targetEntityName}</p>
                    {infoOfficerFunction && hasNominatedRi && (
                      <p className="text-[11px] text-slate-500">{infoOfficerFunction}</p>
                    )}
                    {hasDirectEmail && <p className="text-slate-600 font-mono text-[11px]">Email : {displayEmail}</p>}
                    {hasDirectPhone && <p className="text-slate-600 font-mono text-[11px]">Tél : {displayPhone}</p>}
                  </div>
                </div>

                {/* Letter Subject */}
                <div className="font-sans text-xs bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                  <span className="font-black text-slate-900">OBJET : </span>
                  <span className="font-bold text-slate-800">{documentSubject}</span>
                  <p className="text-slate-600 text-[11px] mt-0.5 font-medium">Fondement légal : Articles 2, 4, 7, 8, 10 & 12 de la Loi n°2013-867 relative à l'accès à l'information d'intérêt public.</p>
                </div>

                {/* Letter Body */}
                <div className="text-xs leading-relaxed space-y-3.5 pt-1 text-slate-800 font-sans">
                  <p className="font-semibold">{dynamicSalutation},</p>
                  <p>
                    Dans le cadre de la promotion de la transparence administrative et du suivi citoyen garanti par la <strong>Loi n°2013-867 du 23 décembre 2013</strong> relative à l'accès à l'information d'intérêt public en République de Côte d'Ivoire, j'ai l'honneur de solliciter respectueusement la communication des documents administratifs suivants :
                  </p>
                  <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-brand-blue font-sans text-xs text-slate-900 whitespace-pre-line leading-relaxed shadow-2xs">
                    {formattedDocumentList}
                  </div>
                  <p>
                    Je vous saurais gré de bien vouloir me transmettre ces éléments par voie électronique à l'adresse indiquée ci-dessus, ou de m'indiquer les modalités pratiques de leur consultation dans les délais prévus par la réglementation en vigueur (conformément à l'Article 12 de la Loi n°2013-867).
                  </p>
                  <p>
                    Je reste à votre entière disposition pour tout échange complémentaire facilitant le bon traitement de cette démarche constructive.
                  </p>
                  <p>
                    Dans l'attente de votre réponse, je vous prie d'agréer, {dynamicSalutation}, l'expression de mes salutations distinguées et respectueuses.
                  </p>
                </div>

                {/* Signature Area */}
                <div className="flex justify-between items-end pt-8 font-sans border-t border-slate-100">
                  <div className="text-[10px] text-slate-400">
                    <span>Modèle généré avec horodatage numérique • Plateforme Civique SuiviBudget Côte d'Ivoire</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-800 block mb-6">Signature du Demandeur</span>
                    <span className="text-[11px] text-slate-600 font-bold italic">{citizenName || '[Nom du Demandeur]'}</span>
                  </div>
                </div>

              </div>

              {/* CAIDP Official Saisine Link */}
              <div className="bg-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-blue flex-shrink-0" />
                  <span>
                    Portail officiel de la Commission : <strong className="text-slate-900">CAIDP (www.caidp.ci)</strong>
                  </span>
                </div>
                <a
                  href="https://www.caidp.ci/institutrecherche"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Consulter le répertoire officiel CAIDP</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* ACTION BUTTONS STICKY FOOTER */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            {hasDirectEmail ? (
              <div className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Envoi direct : <strong className="text-slate-900">{displayEmail}</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Info className="w-4 h-4 text-brand-orange flex-shrink-0" />
                <span>Email direct non publié au registre public (Dépôt physique ou portail caidp.ci)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCopyText}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              title="Copier le texte complet de la demande"
            >
              {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Copié !' : 'Copier texte'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              title="Imprimer ou exporter en PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>

            {hasDirectEmail ? (
              <button
                onClick={handleSendEmail}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Ouvrir dans ma messagerie</span>
              </button>
            ) : (
              <a
                href="https://caidp.ci/institutrecherche"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Portail officiel CAIDP</span>
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

