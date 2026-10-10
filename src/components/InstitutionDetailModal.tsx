import React, { useState, useEffect } from 'react';
import { Institution, BudgetProject, BudgetLineItem } from '../types';
import { formatQualifiedFCFA, formatFCFA, formatAmountInWords, getProjectTier, getProjectTierBadge, ProjectTier } from '../utils/formatters';
import { assessInstitutionBudget, calculateSafePercentages, resolveInstitutionFinancialView } from '../utils/institutionBudgetHelper';
import { getProjectsForInstitution } from '../utils/institutionProjects';
import { 
  X, 
  Globe, 
  ExternalLink, 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  TrendingUp, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  Share2, 
  Layers, 
  AlertCircle,
  Search,
  Filter,
  GraduationCap,
  Briefcase,
  Award,
  FolderOpen,
  Info,
  Scale,
  History
} from 'lucide-react';
import { OfficialDocRequestModal } from './OfficialDocRequestModal';
import { findCaidpRI } from '../data/caidpRiData';
import { dataStore } from '../services/dataStore';
import { isSafeUrl } from '../utils/security';
import { AdministrativeAccountView } from './AdministrativeAccountView';
import { LocalBudgetHistoryView } from './LocalBudgetHistoryView';
import { getLatestAvailableCA, hasCA } from '../data/administrativeAccountsData';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../data/officialPrimitiveBudgets';
import { ApecParticipation } from './ApecParticipation';
import { MinistryBudgetProgramView } from './institutions/MinistryBudgetProgramView';
import { isPilotMinistry } from '../data/ministryPilotReferential';

interface InstitutionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution: Institution | null;
  allProjects: BudgetProject[];
  onNavigateToProjects: (query: string) => void;
  initialTab?: 'PROJECTS' | 'FINANCES' | 'LEADER_MISSIONS' | 'APEC';
  initialFinanceSubTab?: 'BUDGET_2026' | 'EXECUTION' | 'HISTORY';
}

const ModalLeaderAvatar: React.FC<{
  photoUrl?: string;
  name: string;
  isPresidence?: boolean;
}> = ({ photoUrl, name, isPresidence }) => {
  const [hasError, setHasError] = useState(false);

  const effectivePhotoUrl = isPresidence && (!photoUrl || photoUrl.includes('contacts/177210730046'))
    ? '/images/presidence_alassane_ouattara.png'
    : photoUrl;

  const initials = name
    .replace(/^(M\.|Mme|Dr|S\.E\.M\.|Nanan)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || 'CI';

  if (!effectivePhotoUrl || hasError) {
    if (isPresidence) {
      return (
        <div className="relative group flex-shrink-0">
          <img
            src="https://www.gouv.ci/uploads/institutions/175277585572.png"
            alt={name}
            className="w-16 h-16 sm:w-20 sm:h-20 ring-2 ring-amber-400 border-2 border-amber-300 rounded-2xl object-cover object-top shadow-md bg-white"
          />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-xs" title="Chef de l'État">
            <ShieldCheck className="w-3 h-3" />
          </div>
        </div>
      );
    }
    return (
      <div className="relative group flex-shrink-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 border-2 border-white ring-2 ring-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shadow-md">
          {initials}
        </div>
        <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs" title="En fonction officielle">
          <ShieldCheck className="w-3 h-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative group flex-shrink-0">
      <div className={`relative overflow-hidden rounded-2xl shadow-md bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 ${isPresidence ? 'w-16 h-16 sm:w-20 sm:h-20 ring-2 ring-amber-400 border-2 border-amber-300' : 'w-14 h-14 sm:w-16 sm:h-16 border-2 border-white ring-2 ring-slate-100'}`}>
        {/* Bokeh arrière-plan flouté pour harmoniser les fonds de paysage ou de foule */}
        <img
          src={effectivePhotoUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center filter blur-md scale-125 opacity-35 pointer-events-none"
        />
        {/* Filtre studio doux */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 opacity-75"
          style={{
            background: 'radial-gradient(circle at 50% 35%, transparent 40%, rgba(15, 23, 42, 0.45) 75%, rgba(15, 23, 42, 0.75) 100%)'
          }}
        />
        {/* Photo principale cadrée */}
        <img
          src={effectivePhotoUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="relative z-0 w-full h-full object-cover object-[50%_15%] filter contrast-[1.03] brightness-[0.98]"
        />
      </div>
      <div className={`absolute -bottom-1 -right-1 z-20 ${isPresidence ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'} p-0.5 rounded-full shadow-xs`} title="En fonction officielle">
        <ShieldCheck className="w-3 h-3" />
      </div>
    </div>
  );
};

export const InstitutionDetailModal: React.FC<InstitutionDetailModalProps> = ({
  isOpen,
  onClose,
  institution,
  allProjects,
  onNavigateToProjects,
  initialTab,
  initialFinanceSubTab,
}) => {
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'FINANCES' | 'LEADER_MISSIONS' | 'APEC'>(initialTab || 'PROJECTS');
  const [apecYear,setApecYear] = useState(String(new Date().getFullYear()));
  const [financeSubTab, setFinanceSubTab] = useState<'BUDGET_2026' | 'EXECUTION' | 'HISTORY'>(initialFinanceSubTab || 'BUDGET_2026');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedProjectForDoc, setSelectedProjectForDoc] = useState<BudgetProject | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync tab states when opening or props change
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialFinanceSubTab) setFinanceSubTab(initialFinanceSubTab);
    }
  }, [isOpen, initialTab, initialFinanceSubTab]);

  // Filters for Budget Lines
  const [lineSearch, setLineSearch] = useState('');
  const [selectedNature, setSelectedNature] = useState('ALL');

  // Filters for Citizen Projects
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProjectCategory, setSelectedProjectCategory] = useState('ALL');
  const [selectedTier, setSelectedTier] = useState<'ALL' | 'MUNICIPAL' | 'STATE' | 'REGIONAL'>('ALL');

  // Dynamic async budget lines loader (Lazy bundle splitting to save initial download)
  const [entityBudgetLines, setEntityBudgetLines] = useState<BudgetLineItem[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [loadedEntityId, setLoadedEntityId] = useState<string | null>(null);

  // Reset lines when modal is closed or institution changes
  useEffect(() => {
    if (!isOpen || !institution) {
      setEntityBudgetLines([]);
      setLoadedEntityId(null);
    }
  }, [isOpen, institution?.id]);

  // Load budget lines strictly on-demand when FINANCES tab is active
  useEffect(() => {
    if (!isOpen || !institution || activeTab !== 'FINANCES') {
      return;
    }
    // Avoid re-fetching if already loaded for this institution
    if (loadedEntityId === institution.id) {
      return;
    }

    let isMounted = true;
    setIsLoadingLines(true);
    import('../data/budgetLinesData')
      .then(({ getBudgetLinesForEntity }) => {
        if (isMounted) {
          const lines = getBudgetLinesForEntity(
            institution.name, 
            institution.type, 
            institution.leader_title || institution.leader_name,
            institution.id
          );
          setEntityBudgetLines(Array.isArray(lines) ? lines : []);
          setLoadedEntityId(institution.id);
          setIsLoadingLines(false);
        }
      })
      .catch((err) => {
        console.warn("Erreur chargement dynamique des lignes budgétaires:", err);
        if (isMounted) setIsLoadingLines(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, institution?.id, institution?.name, institution?.type, institution?.leader_title, institution?.leader_name, loadedEntityId]);

  if (!isOpen || !institution) return null;

  // Extract unique natures
  const safeBudgetLines = Array.isArray(entityBudgetLines) ? entityBudgetLines : [];
  const uniqueNatures = Array.from(new Set(
    safeBudgetLines.map(l => l.nature).filter(Boolean)
  )) as string[];

  // Filter lines
  const filteredLines = safeBudgetLines.filter(l => {
    const matchesSearch = !lineSearch.trim() || 
      l.libelle.toLowerCase().includes(lineSearch.toLowerCase().trim()) ||
      (l.sous_categorie_3 && l.sous_categorie_3.toLowerCase().includes(lineSearch.toLowerCase().trim()));

    const matchesNature = selectedNature === 'ALL' || l.nature === selectedNature;

    return matchesSearch && matchesNature;
  });

  const totalLinesAmount = safeBudgetLines.reduce((sum, l) => sum + (l.montant_fcfa || 0), 0);

  // Résolveur Financier Commun Unique (P1-B : intégrité carte/fiche)
  const financialView = resolveInstitutionFinancialView(
    institution, 
    2026, 
    institution.type === 'MAIRIE' || institution.type === 'REGION' ? 'PRIMITIVE' : 'LFI'
  );
  const assessment = assessInstitutionBudget(institution);

  const functioningBudget = financialView.functioning_amount_fcfa;
  const investmentBudget = financialView.investment_amount_fcfa;
  const totalBudget = financialView.total_amount_fcfa;
  const hasInstBreakdown = financialView.has_breakdown;
  const functioningPct = financialView.functioning_pct ?? 0;
  const investmentPct = financialView.investment_pct ?? 0;

  // Resolve CAIDP Information Officer accurately from registry
  const caidpMatch = dataStore.findCaidpEntity(institution.name) || findCaidpRI(institution.name);
  const riName = (caidpMatch?.ri_name && caidpMatch.ri_name !== 'Non désigné') 
    ? caidpMatch.ri_name 
    : (institution.info_officer_name || '');
  const riFunction = caidpMatch?.ri_function || institution.info_officer_title || "Service d'Accès aux Documents Publics (Loi n°2013-867)";
  const riEmail = (caidpMatch?.email && caidpMatch.email !== "Pas d'email" && caidpMatch.email !== "") 
    ? caidpMatch.email 
    : (institution.info_officer_email && institution.info_officer_email !== "Pas d'email" ? institution.info_officer_email : "");
  const riPhone = (caidpMatch?.phone && caidpMatch.phone !== "Pas de numéro" && caidpMatch.phone !== "") 
    ? caidpMatch.phone 
    : (institution.info_officer_phone && institution.info_officer_phone !== "Pas de numéro" ? institution.info_officer_phone : "");

  // Clean entity name for project matching
  const cleanName = institution.name
    .replace(/^Mairie de\s+/i, '')
    .replace(/^Conseil Régional du\s+/i, '')
    .replace(/^Conseil Régional de la\s+/i, '')
    .replace(/^Conseil Régional de l['’]/i, '')
    .replace(/^Conseil Régional des\s+/i, '')
    .replace(/^Conseil Régional d['’]/i, '')
    .replace(/^Ministère d'État,\s*/i, '')
    .replace(/^Ministère de l['’]/i, '')
    .replace(/^Ministère de la\s+/i, '')
    .replace(/^Ministère des\s+/i, '')
    .replace(/^Ministère du\s+/i, '')
    .replace(/^Ministère Délégué chargé de l['’]/i, '')
    .replace(/^Ministère Délégué chargé de la\s+/i, '')
    .replace(/^Ministère Délégué chargé des\s+/i, '')
    .replace(/^Ministère Délégué chargé du\s+/i, '')
    .trim();

  // Strict, canonical anti-contamination matching for all institutions (Mairies, Conseils Régionaux, Ministères)
  const relatedProjects = getProjectsForInstitution(institution, allProjects);

  // Project tier counters for contextual local segmentation
  const municipalProjectsCount = relatedProjects.filter(p => getProjectTier(p) === 'MUNICIPAL').length;
  const stateProjectsCount = relatedProjects.filter(p => getProjectTier(p) === 'STATE').length;
  const regionalProjectsCount = relatedProjects.filter(p => getProjectTier(p) === 'REGIONAL').length;

  // Filter citizen projects within the tab
  const filteredCitizenProjects = relatedProjects.filter(p => {
    const matchesSearch = !projectSearch.trim() ||
      p.title.toLowerCase().includes(projectSearch.toLowerCase().trim()) ||
      p.commune_name.toLowerCase().includes(projectSearch.toLowerCase().trim()) ||
      p.region_name.toLowerCase().includes(projectSearch.toLowerCase().trim());

    const matchesCat = selectedProjectCategory === 'ALL' || p.category === selectedProjectCategory;
    const matchesTier = selectedTier === 'ALL' || getProjectTier(p) === selectedTier;
    return matchesSearch && matchesCat && matchesTier;
  });

  const totalProjectsBudget = relatedProjects.reduce((sum, p) => sum + (p.budget_amount_fcfa || 0), 0);

  const isDistrictAutonome = (institution.district && institution.district.toLowerCase().includes('autonome')) ||
    (institution.region && (institution.region.toLowerCase().includes('abidjan') || institution.region.toLowerCase().includes('yamoussoukro')));

  const territorialLabel = isDistrictAutonome
    ? (institution.region?.toLowerCase().includes('yamoussoukro') || institution.district?.toLowerCase().includes('yamoussoukro')
        ? "District Autonome de Yamoussoukro"
        : "District Autonome d'Abidjan")
    : (institution.region ? `Région ${institution.region}` : null);

  const isPeripheralAbidjan = ['inst-com-anyama', 'inst-com-bingerville', 'inst-com-songon'].includes(institution.id) ||
    ['anyama', 'bingerville', 'songon'].some(name => institution.name.toLowerCase().includes(name));

  const isAttecoube = institution.id === 'inst-com-attecoube' || institution.name.toLowerCase().includes('attécoubé');

  const handleShareProject = (proj: BudgetProject) => {
    const text = `Chantier citoyen : ${proj.title} - Budget : ${formatFCFA(proj.budget_amount_fcfa)} (${formatAmountInWords(proj.budget_amount_fcfa)}) - ${proj.commune_name || 'Côte d\'Ivoire'}. Suivi transparent sur SuiviBudget CI : https://suivibudget.ci/`;
    if (navigator.share) {
      navigator.share({ title: proj.title, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleRequestProjectDoc = (proj: BudgetProject) => {
    setSelectedProjectForDoc(proj);
    setDocModalOpen(true);
  };

  // Helper to clean redundant project location text
  const getCleanProjectLocation = (proj: BudgetProject) => {
    if (proj.commune_name && proj.commune_name.length > 0 && !proj.commune_name.toLowerCase().includes('ministère') && !proj.commune_name.toLowerCase().includes('primature') && proj.commune_name.length < 35) {
      return `${proj.commune_name}${proj.region_name ? ', ' + proj.region_name : ''}`;
    }
    if (proj.region_name && !proj.region_name.toLowerCase().includes('ministère') && !proj.region_name.toLowerCase().includes('primature') && proj.region_name.length < 35) {
      return proj.region_name;
    }
    return 'Territoire National / Multi-Régions';
  };

  // Helper to clean redundant contractor / service text
  const shouldDisplayService = (serviceName?: string) => {
    if (!serviceName) return false;
    const s = serviceName.toLowerCase();
    const inst = institution.name.toLowerCase();
    if (s.length > 60 || s.includes(cleanName.toLowerCase()) || inst.includes(s)) {
      return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ========================================================= */}
        {/* 1. EN-TÊTE ÉPURÉ & RESPONSIVE (AUCUN DOUBLON) */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 pb-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 relative flex-shrink-0">
          <div className="flex items-start justify-between gap-3">

            <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
              {/* Leader / Minister Photo (Format harmonieux avec gestion fallback) */}
              <ModalLeaderAvatar
                photoUrl={institution.leader_photo_url}
                name={institution.leader_name || institution.name}
                isPresidence={institution.id === 'inst-presidence'}
              />

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border shadow-2xs ${
                    institution.type === 'MINISTERE' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                    institution.type === 'MAIRIE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    institution.type === 'REGION' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 
                    institution.type === 'DISTRICT' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                    institution.type === 'AUTORITE_REGULATION' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    'bg-blue-50 text-brand-blue border-blue-200'
                  }`}>
                    {institution.type === 'MINISTERE' ? 'Gouvernement de Côte d\'Ivoire' : 
                     institution.type === 'MAIRIE' ? 'Collectivité Municipale' : 
                     institution.type === 'REGION' ? 'Conseil Régional' : 
                     institution.type === 'DISTRICT' ? 'District Autonome' :
                     institution.type === 'AUTORITE_REGULATION' ? 'Autorité de Régulation' :
                     'Institution de la République'}
                  </span>

                  {territorialLabel && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
                      {territorialLabel}
                    </span>
                  )}

                  {isPeripheralAbidjan && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Grand Abidjan • Commune Périphérique (DGE)
                    </span>
                  )}

                  {isAttecoube && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                      Grand Abidjan • 6 Chantiers Prioritaires (200 M)
                    </span>
                  )}

                  {institution.green_line_number && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 whitespace-nowrap">
                      <Phone className="w-2.5 h-2.5 flex-shrink-0" /> N° Vert : {institution.green_line_number}
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-xl font-black text-slate-900 leading-snug line-clamp-2" title={institution.name}>
                  {institution.name}
                </h2>

                {institution.leader_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
                    <span className="font-bold text-slate-900">{institution.leader_name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-medium truncate">{institution.leader_title || 'Premier Responsable'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Close Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {institution.website && isSafeUrl(institution.website) && (
                <a 
                  href={institution.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-brand-blue hover:border-brand-blue/40 border border-slate-200 shadow-2xs transition-all"
                  title={`Site officiel : ${institution.website}`}
                >
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>Site Web</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}

              {institution.facebook_url && isSafeUrl(institution.facebook_url) && (
                <a 
                  href={institution.facebook_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-[#1877F2] hover:border-blue-200 border border-slate-200 shadow-2xs transition-all"
                  title={`Page Facebook officielle : ${institution.facebook_url}`}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    <path fill="#FFFFFF" d="M16.671 15.457l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.542V4.91s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.227H7.078v3.47h3.076V23.93c.613.096 1.24.143 1.875.143s1.262-.047 1.875-.143v-8.473h2.767z"/>
                  </svg>
                  <span>Facebook</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors shadow-xs border border-slate-200 cursor-pointer"
                title="Fermer la fiche"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Liens Web/Facebook sur Mobile */}
          {(institution.website || institution.facebook_url) && (
            <div className="flex sm:hidden items-center gap-2 pt-2.5 mt-2 border-t border-slate-200/60">
              {institution.website && isSafeUrl(institution.website) && (
                <a 
                  href={institution.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs active:scale-95 transition-all"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>Site Web</span>
                </a>
              )}
              {institution.facebook_url && isSafeUrl(institution.facebook_url) && (
                <a 
                  href={institution.facebook_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-[#1877F2] border border-blue-200 shadow-2xs active:scale-95 transition-all"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    <path fill="#FFFFFF" d="M16.671 15.457l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.542V4.91s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.227H7.078v3.47h3.076V23.93c.613.096 1.24.143 1.875.143s1.262-.047 1.875-.143v-8.473h2.767z"/>
                  </svg>
                  <span>Facebook</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. BARRE DE NAVIGATION EN 3 ONGLETS MAJEURS (SANS CLUTTER) */}
        {/* ========================================================= */}
        <div className="px-4 sm:px-6 bg-white border-b border-slate-200 grid grid-cols-2 sm:flex sm:items-center gap-2 sm:overflow-x-auto scrollbar-none flex-shrink-0">
          {[
            { 
              id: 'PROJECTS', 
              label: 'Chantiers & Projets',
              badge: relatedProjects.length > 0 ? `${relatedProjects.length}` : undefined
            },
            { 
              id: 'FINANCES', 
              label: institution.type === 'MINISTERE' ? 'Budget 2026 (Budget-Programmes)' : 'Budget & Finances',
              badge: institution.type === 'MINISTERE'
                ? (isPilotMinistry(institution.id) ? '10 Programmes' : 'Exercice 2026')
                : (isLoadingLines ? 'Chargement...' : (entityBudgetLines.length > 0 ? `${entityBudgetLines.length} lignes` : 'Exercice 2026'))
            },
            { 
              id: 'LEADER_MISSIONS', 
              label: institution.type === 'MINISTERE' ? 'Le Ministre & Missions' :
                     institution.type === 'REGION' ? 'Présidence & Organisation' :
                     institution.type === 'MAIRIE' ? 'Le Maire & Organisation' : 'Direction & Missions',
              badge: undefined
            },
            ...(['MAIRIE','REGION'].includes(institution.type) ? [{id:'APEC',label:'Participation APEC',badge:undefined}] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`min-h-[44px] py-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-normal sm:whitespace-nowrap flex flex-wrap sm:flex-nowrap items-center gap-2 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
                activeTab === tab.id
                  ? 'border-brand-blue text-brand-blue bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* 3. CONTENU DES 3 ONGLETS HARMONISÉS */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/70">
          {activeTab==='APEC' && ['MAIRIE','REGION'].includes(institution.type) && <div className="space-y-4">
            <label className="block text-sm font-semibold">Exercice de participation
              <input type="number" min={2000} max={2100} value={apecYear} onChange={e=>setApecYear(e.target.value)} className="ml-3 min-h-[44px] w-28 rounded-lg border border-slate-300 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"/>
            </label>
            {Number.isInteger(Number(apecYear)) && Number(apecYear)>=2000 && Number(apecYear)<=2100
              ? <ApecParticipation key={`${institution.id}:${apecYear}`} institutionId={institution.id} fiscalYear={Number(apecYear)}/>
              : <p role="status">Choisissez un exercice entre 2000 et 2100.</p>}
          </div>}

          {/* ========================================================= */}
          {/* TAB 1 : CHANTIERS & PROJETS CONCRETS */}
          {/* ========================================================= */}
          {activeTab === 'PROJECTS' && (
            <div className="space-y-4">

              {/* Synthèse Chantiers Référencés */}
              <div className="bg-gradient-to-r from-blue-900 via-brand-blue to-sky-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-brand-orange text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <Building2 className="w-3 h-3" />
                    <span>Observatoire Citoyen</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Chantiers & Investissements Concrets
                  </h3>
                  <p className="text-xs text-blue-100">
                    Projets d'investissements publics pilotés par <strong>{institution.name}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 flex-shrink-0">
                  <div className="text-center pr-3 border-r border-white/20">
                    <span className="text-[10px] font-bold uppercase text-blue-200 block">Chantiers</span>
                    <span className="text-xl font-black text-white">{relatedProjects.length}</span>
                  </div>
                  <div className="text-left pl-1">
                    <span className="text-[10px] font-bold uppercase text-blue-200 block">Enveloppe Votée</span>
                    <span className="text-sm sm:text-base font-black text-amber-300">
                      {formatFCFA(totalProjectsBudget > 0 ? totalProjectsBudget : institution.budget_investment_fcfa)}
                    </span>
                    <span className="text-[10px] font-medium text-blue-100 block">
                      ({formatAmountInWords(totalProjectsBudget > 0 ? totalProjectsBudget : institution.budget_investment_fcfa)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Bannières contextuelles d'investissements Grand Abidjan */}
              {isPeripheralAbidjan && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3.5 text-xs text-sky-950 shadow-2xs">
                  <div className="p-2.5 bg-sky-100 rounded-xl text-brand-blue flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sky-950 uppercase text-[10px] tracking-wider">
                        Grand Abidjan • Concours Direct de l'État (Dotation Globale d'Équipement - DGE)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-200/70 text-sky-900 border border-sky-300">
                        LFI 2026
                      </span>
                    </div>
                    <p className="text-sky-800 leading-relaxed font-medium">
                      En tant que commune périphérique du District Autonome d'Abidjan, <strong>{institution.name}</strong> bénéficie d'une <strong>Dotation Globale d'Équipement (DGE) de {formatFCFA(institution.budget_investment_fcfa)}</strong> ({formatAmountInWords(institution.budget_investment_fcfa)}) inscrite au Budget de l'État. Ces <strong>{relatedProjects.length} chantiers physiques</strong> sont individualisés pour le bitumage, le reprofilage de voies, les dispensaires et les infrastructures scolaires de proximité.
                    </p>
                  </div>
                </div>
              )}

              {isAttecoube && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-xs text-amber-950 shadow-2xs">
                  <div className="p-2.5 bg-amber-100 rounded-xl text-amber-900 flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-950 uppercase text-[10px] tracking-wider">
                        Grand Abidjan • Opérations Prioritaires de Développement Local (Ministères Techniques)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                        200 000 000 FCFA
                      </span>
                    </div>
                    <p className="text-amber-800 leading-relaxed font-medium">
                      En complément de l'autonomie fiscale municipale (recettes DGI), l'État finance directement à Attécoubé <strong>6 chantiers d'urgence</strong> d'infrastructures scolaires (1 400 tables-bancs, construction de classes Fairmont et Danho) et sanitaires pour un montant total de <strong>200 000 000 FCFA</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Filtres de Recherche */}
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer par mot-clé, commune, région..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedProjectCategory}
                    onChange={(e) => setSelectedProjectCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Toutes les catégories</option>
                    <option value="EDUCATION">Éducation & Formation</option>
                    <option value="SANTE">Santé & Hôpitaux</option>
                    <option value="EAU">Eau & Hydraulique</option>
                    <option value="INFRASTRUCTURE">Infrastructures & Bâtiments</option>
                    <option value="ENERGIE">Énergie & Électricité</option>
                    <option value="AGRICULTURE">Agriculture</option>
                    <option value="SPORT">Sport & Loisirs</option>
                    <option value="SOCIAL">Social</option>
                  </select>
                </div>
              </div>

              {/* Filtres par Niveau Territorial (Commune / Mairie vs État Central vs Conseil Régional) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setSelectedTier('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedTier === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Tous les chantiers</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${selectedTier === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {relatedProjects.length}
                  </span>
                </button>

                {municipalProjectsCount > 0 && (
                  <button
                    onClick={() => setSelectedTier('MUNICIPAL')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedTier === 'MUNICIPAL'
                        ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-500/50'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <span>Grands Projets Municipaux</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${selectedTier === 'MUNICIPAL' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                      {municipalProjectsCount}
                    </span>
                  </button>
                )}

                {stateProjectsCount > 0 && (
                  <button
                    onClick={() => setSelectedTier('STATE')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedTier === 'STATE'
                        ? 'bg-sky-800 text-white shadow-xs ring-2 ring-sky-500/50'
                        : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                    }`}
                  >
                    <span>Investissements État Central</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${selectedTier === 'STATE' ? 'bg-white/20 text-white' : 'bg-sky-200 text-sky-900'}`}>
                      {stateProjectsCount}
                    </span>
                  </button>
                )}

                {regionalProjectsCount > 0 && (
                  <button
                    onClick={() => setSelectedTier('REGIONAL')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedTier === 'REGIONAL'
                        ? 'bg-purple-800 text-white shadow-xs ring-2 ring-purple-500/50'
                        : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    <span>Conseil Régional</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${selectedTier === 'REGIONAL' ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'}`}>
                      {regionalProjectsCount}
                    </span>
                  </button>
                )}
              </div>

              {/* Liste des Cartes de Projets Épurées */}
              {filteredCitizenProjects.length > 0 ? (
                <div className="space-y-3">
                  {filteredCitizenProjects.map((proj) => {
                    const pTier = getProjectTier(proj);
                    const pTierBadge = getProjectTierBadge(pTier);

                    return (
                      <div 
                        key={proj.id} 
                        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-brand-blue/50 hover:shadow-xs transition-all space-y-3 group"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Photo miniature si disponible */}
                          {proj.image_url && (
                            <div className="w-full sm:w-44 h-28 sm:h-auto rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative">
                              <img 
                                src={proj.image_url} 
                                alt={proj.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy" 
                              />
                              {proj.progress_percentage > 0 && (
                                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-black text-emerald-300 border border-white/20">
                                  {proj.progress_percentage}%
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex-1 flex flex-col justify-between gap-2">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Badge de Niveau Territorial */}
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${pTierBadge.badgeClass}`}>
                                  {pTierBadge.icon} {pTierBadge.label}
                                </span>

                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-brand-blue/10 text-brand-blue">
                                  {proj.category}
                                </span>

                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                  Exercice 2026
                                </span>

                                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-brand-orange" />
                                  <span>{getCleanProjectLocation(proj)}</span>
                                </span>
                              </div>

                              <h4 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors leading-snug">
                                {proj.title}
                              </h4>

                              {/* Maître d'ouvrage / Bailleur / Service */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                {proj.master_builder && (
                                  <span>Maître d'ouvrage : <strong className="text-slate-800 font-bold">{proj.master_builder}</strong></span>
                                )}
                                {proj.partner_or_donor && (
                                  <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                                    Bailleur : {proj.partner_or_donor}
                                  </span>
                                )}
                                {shouldDisplayService(proj.service_name) && (
                                  <span>Service : <span className="font-semibold text-slate-700">{proj.service_name}</span></span>
                                )}
                              </div>
                            </div>

                            {/* Dotation & Taux Officiel */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Dotation Allouée</span>
                                <span className="text-base sm:text-lg font-black text-brand-blue">
                                  {formatFCFA(proj.budget_amount_fcfa)}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 ml-1.5">
                                  ({formatAmountInWords(proj.budget_amount_fcfa)})
                                </span>
                              </div>

                              {proj.progress_percentage > 0 && (
                                <div className="text-left sm:text-right bg-emerald-50/70 p-2 sm:p-0 rounded-lg sm:bg-transparent">
                                  <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 justify-start sm:justify-end">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Taux officiel déclaré : <strong>{proj.progress_percentage}%</strong></span>
                                  </span>
                                  {proj.official_progress_source && (
                                    <span className="text-[9px] text-slate-400 block">
                                      {proj.official_progress_source}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions Chantier */}
                        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[11px] font-medium text-slate-600">
                              Statut : <strong className="text-emerald-700 font-bold">{proj.current_status === 'IN_PROGRESS' ? 'En cours d\'exécution' : proj.current_status === 'COMPLETED' ? 'Livré aux populations' : 'Inscrit au Budget 2026'}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRequestProjectDoc(proj)}
                              className="px-2.5 py-1 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                              title="Demander les documents contractuels de ce chantier"
                            >
                              <FileText className="w-3 h-3 text-brand-orange" />
                              <span>Demande CAIDP</span>
                            </button>

                            <button
                              onClick={() => handleShareProject(proj)}
                              className="px-2.5 py-1 rounded-lg font-bold bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/20 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                              title="Partager ce chantier aux citoyens"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Partager</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : relatedProjects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <h5 className="text-base font-black text-slate-800">
                    {institution.type === 'MAIRIE'
                      ? "Aucun chantier d'investissement direct de l'État recensé"
                      : institution.type === 'REGION'
                      ? "Aucun projet d'investissement régional recensé"
                      : "Aucun projet d'investissement direct recensé"}
                  </h5>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    {institution.type === 'MAIRIE' && institution.is_tax_quota_commune
                      ? "Cette collectivité municipale fonctionne sous le régime fiscal autonome. Ses investissements de proximité sont financés directement par son Budget Primitif Communal autonome (recettes fiscales locales) et ne font pas l'objet de dotations d'investissements directs dans le tableau central de l'État."
                      : institution.type === 'MAIRIE'
                      ? "Les investissements de cette commune sont gérés dans le cadre de son budget municipal décentralisé ou via les programmes sectoriels des ministères."
                      : "Aucun projet d'investissement public spécifique n'est individualisé pour cette entité dans la Loi de Finances 2026."}
                  </p>
                </div>
              ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
                  <div className="flex justify-center"><Search className="w-7 h-7 text-slate-300" /></div>
                  <h5 className="text-sm font-black text-slate-800">Aucun projet ne correspond à ce filtre</h5>
                  <p className="text-xs text-slate-500">
                    Consultez l'ensemble des {relatedProjects.length} chantiers en réinitialisant les critères.
                  </p>
                  <button
                    onClick={() => {
                      setProjectSearch('');
                      setSelectedProjectCategory('ALL');
                      setSelectedTier('ALL');
                    }}
                    className="px-3.5 py-1.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}

              {relatedProjects.length > 0 && (
                <div className="text-center pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToProjects(cleanName);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <span>Explorer ces {relatedProjects.length} projets dans l'annuaire national</span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-orange" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2 : BUDGET & FINANCES DE L'ÉTAT (SYNTHÈSE + LIGNES) */}
          {/* ========================================================= */}
          {activeTab === 'FINANCES' && (
            <div className="space-y-5">
              {institution.type === 'MINISTERE' ? (
                <MinistryBudgetProgramView
                  institution={institution}
                  relatedProjects={relatedProjects}
                  onSelectProject={(_proj) => {
                    setActiveTab('PROJECTS');
                  }}
                />
              ) : (
                (() => {
                  const latestCA = getLatestAvailableCA(institution.id) || getLatestAvailableCA(institution.name);

                return (
                  <>
                    {/* Sous-navigation Citoyenne dans l'onglet Budget & Finances */}
                    <div className="flex items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
                      <button
                        onClick={() => setFinanceSubTab('BUDGET_2026')}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          financeSubTab === 'BUDGET_2026'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Budget 2026 (Primitif)</span>
                      </button>

                      <button
                        onClick={() => setFinanceSubTab('EXECUTION')}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          financeSubTab === 'EXECUTION'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${latestCA ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Exécution {latestCA ? latestCA.fiscal_year : '2024'}</span>
                        {latestCA ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            CA Certifié
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600">
                            En attente
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setFinanceSubTab('HISTORY')}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          financeSubTab === 'HISTORY'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        <History className="w-3.5 h-3.5 text-brand-orange" />
                        <span>Historique & Traçabilité</span>
                      </button>
                    </div>

                    {/* VUE SOUS-ONGLET 1 : BUDGET 2026 (Existant préservé) */}
                    {financeSubTab === 'BUDGET_2026' && (
                      <div className="space-y-5">

              {/* Synthèse Graphique & Ventilation ou Alerte Transparence CAIDP */}
              {(institution.primitive_budget || OFFICIAL_PRIMITIVE_BUDGETS[institution.id]) ? (
                (() => {
                  const prim = (institution.primitive_budget || OFFICIAL_PRIMITIVE_BUDGETS[institution.id])!;
                  const isRegion = institution.type === 'REGION';
                  const isDistrict = institution.type === 'DISTRICT';
                  const primTotal = prim.total_voted_fcfa;
                  const exactPrimitive = !prim.precision || prim.precision === 'EXACT';
                  const hasBreakdown = prim.investment_voted_fcfa != null && prim.functioning_voted_fcfa != null;
                  const primInvPct = (hasBreakdown && primTotal > 0) ? Math.round((prim.investment_voted_fcfa! / primTotal) * 100) : null;
                  const primFonctPct = primInvPct !== null ? 100 - primInvPct : null;

                  return (
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-6">
                      {/* En-tête officiel du vote */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                              {isDistrict ? 'Budget Primitif Officiel Voté en Conseil du District' : isRegion ? 'Budget Primitif Officiel Voté en Conseil Régional' : 'Budget Primitif Officiel Voté en Conseil Municipal'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              Exercice 2026
                            </span>
                            {prim.precision === 'EXACT' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Montant Délibéré Exact
                              </span>
                            )}
                            {prim.precision === 'APPROXIMATE' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                                ≈ Montant Arrondi Publié
                              </span>
                            )}
                            {prim.precision === 'LOWER_BOUND' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                Borne Minimale : Plus de
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Montant du budget primitif rapporté
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">

                              {formatQualifiedFCFA(primTotal, prim.precision)} <span className="block text-xs font-semibold text-brand-blue break-words">({formatAmountInWords(primTotal)} FCFA)</span>
                            </h3>
                            <p className="text-xs text-brand-blue font-bold tracking-tight">

                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-200 text-xs text-slate-600 space-y-1">
                          <div>
                            <span className="text-slate-400 font-medium">Session de vote : </span>
                            <strong className="text-slate-800">{prim.voted_date}</strong>
                          </div>
                          <div className="flex sm:justify-end items-center gap-1 text-[11px] text-slate-500">
                            <span>Source : {prim.source || 'Source à confirmer'}</span>
                            {prim.source_url && (
                              <a
                                href={prim.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-blue hover:underline inline-flex items-center gap-0.5 ml-1 font-bold"
                                title="Consulter la communication officielle"
                              >
                                Consulter la publication source <ExternalLink className="w-3 h-3 inline" />
                              </a>
                            )}
                          </div>
                          {prim.session_notes && (
                            <p className="text-[11px] text-slate-500 italic max-w-xs sm:ml-auto">
                              « {prim.session_notes} »
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Origine des recettes : aucune part déduite par différence sans source analytique */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1.5" role="note">
                        <h4 className="font-black text-slate-900">Origine des recettes : détail non établi</h4>
                        <p>Le budget primitif total ne permet pas de déduire la répartition exacte
                          entre subventions de l'État, impôts reversés et autres ressources propres.
                          Ces postes seront chiffrés seulement à partir du tableau officiel des recettes
                          de cette collectivité. Aucune soustraction entre budgets de périmètres
                          différents n'est utilisée.</p>
                      </div>

                      {/* ORIENTATION DES DÉPENSES DU CONSEIL */}
                      <div className="p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            {isDistrict ? "Répartition des Dépenses Votées par le District" : isRegion ? "Répartition des Dépenses Votées par la Région" : "Répartition des Dépenses Votées par la Commune"}
                          </span>
                          {prim.projects_count && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {prim.projects_count} opérations programmées
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Dépenses d'Investissement Votées</span>
                            <span className="text-lg font-black text-slate-900 block">
                              {formatQualifiedFCFA(prim.investment_voted_fcfa, prim.investment_voted_fcfa == null ? 'UNKNOWN' : prim.precision)} {prim.investment_voted_fcfa != null && <span className="text-xs font-semibold text-brand-blue break-words">({formatAmountInWords(prim.investment_voted_fcfa)} FCFA)</span>}{' '}
                              <span className="text-xs text-emerald-700 font-bold block sm:inline">

                              </span>
                            </span>
                            <span className="text-xs font-bold text-emerald-700 block">{exactPrimitive && primInvPct !== null ? `(${primInvPct}% du budget total)` : 'Part non calculée'}</span>
                            <span className="text-[10px] font-medium text-slate-500 block">
                              {isDistrict
                                ? "Grands travaux métropolitains, voirie, assainissement, salubrité, équipements scolaires et sanitaires"
                                : isRegion 
                                ? "Lycées, collèges de proximité, centres de santé régionaux (CHR), pistes rurales, électrification" 
                                : "Infrastructures socio-économiques, écoles, santé, voirie, éclairage"}
                            </span>
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Dépenses de Fonctionnement Votées</span>
                            <span className="text-lg font-black text-slate-900 block">
                              {formatQualifiedFCFA(prim.functioning_voted_fcfa, prim.functioning_voted_fcfa == null ? 'UNKNOWN' : prim.precision)} {prim.functioning_voted_fcfa != null && <span className="text-xs font-semibold text-brand-blue break-words">({formatAmountInWords(prim.functioning_voted_fcfa)} FCFA)</span>}{' '}
                              <span className="text-xs text-slate-600 font-bold block sm:inline">

                              </span>
                            </span>
                            <span className="text-xs font-bold text-slate-600 block">{exactPrimitive && primFonctPct !== null ? `(${primFonctPct}% du budget total)` : 'Part non calculée'}</span>
                            <span className="text-[10px] font-medium text-slate-500 block">
                              {isDistrict
                                ? "Personnel administratif du District, sessions du Conseil du District, carburant, charges courantes"
                                : isRegion 
                                ? "Personnel administratif régional, sessions plénières du Conseil, carburant, charges courantes" 
                                : "Salaires des agents municipaux, carburant, charges administratives"}
                            </span>
                          </div>
                        </div>

                        {/* Jauge Bicolore Dépenses : Vert Investissement vs Gris Ardoise Fonctionnement (si ventilation connue) */}
                        {hasBreakdown ? (
                          <div hidden={!exactPrimitive} className="space-y-1.5 pt-1">
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                              <div className="bg-emerald-500 h-full" style={{ width: `${primInvPct}%` }} title={`Investissement: ${primInvPct}%`}></div>
                              <div className="bg-slate-400 h-full" style={{ width: `${primFonctPct}%` }} title={`Fonctionnement: ${primFonctPct}%`}></div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] font-bold gap-1">
                              <span className="text-emerald-700">■ Investissements Votés : {primInvPct}% ({formatQualifiedFCFA(prim.investment_voted_fcfa, prim.precision)}{prim.investment_voted_fcfa != null ? ` — ${formatAmountInWords(prim.investment_voted_fcfa)} FCFA` : ''})</span>
                              <span className="text-slate-600">■ Fonctionnement & Salaires : {primFonctPct}% ({formatQualifiedFCFA(prim.functioning_voted_fcfa, prim.precision)}{prim.functioning_voted_fcfa != null ? ` — ${formatAmountInWords(prim.functioning_voted_fcfa)} FCFA` : ''})</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span>
                              La délibération officielle votée ne détaille pas la ventilation exacte entre investissement et fonctionnement dans la source vérifiée. Les montants distincts restent à corroborer via l'acte budgétaire intégral.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (financialView.total_amount_fcfa == null || financialView.verification_status === 'NOT_PUBLISHED' || financialView.verification_status === 'NOT_DOCUMENTED' || financialView.is_tax_quota_commune || financialView.is_cour_supreme) ? (
                (() => {
                  const isCourSupreme = assessment.isCourSupreme;
                  const isGrandAbidjan = institution.type === 'MAIRIE' && (
                    institution.district?.toLowerCase().includes('abidjan') ||
                    institution.region?.toLowerCase().includes('abidjan') ||
                    ['abobo', 'adjamé', 'attécoubé', 'koumassi', 'marcory', 'plateau', 'port-bouët', 'treichville', 'anyama', 'songon'].some(name => institution.name.toLowerCase().includes(name))
                  );

                  if (isCourSupreme) {
                    return (
                      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-slate-300 shadow-2xs space-y-4">
                        <div className="flex items-start gap-3.5">
                          <div className="p-3 rounded-2xl flex-shrink-0 bg-slate-100 text-slate-800">
                            <Scale className="w-6 h-6" />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                                Institution Constitutionnelle & Juridiction Suprême
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
                                Loi de Finances 2026
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900">
                              Dotation Budgétaire Non Individualisée — Répartition Constitutionnelle
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Conformément à la Constitution ivoirienne de 2016 (Titre VII), les compétences juridictionnelles historiques de la Cour Suprême sont exercées par trois juridictions suprêmes autonomes, chacune dotée de sa propre section budgétaire dans la Loi de Finances 2026 : la <strong>Cour de Cassation</strong> (Section 114 — 7 931 309 608 FCFA), le <strong>Conseil d'État</strong> (Section 118 — 5 164 531 081 FCFA) et la <strong>Cour des Comptes</strong> (Section 115 — 8 851 161 351 FCFA). Aucune dotation distincte n'est individualisée pour la Cour Suprême dans le budget général de l'État.
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-wider text-[11px]">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>Traçabilité & Vérifiabilité Citoyenne SuiviBudget CI</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed font-medium">
                            Conformément à notre charte de vérifiabilité (Règle 2 : <em>Provenance by default</em> et Règle 9 : <em>Absence de donnée ≠ donnée d'absence</em>), aucun montant fictif ou estimé n'est attribué à la Cour Suprême. Les crédits alloués au sommet du pouvoir judiciaire sont vérifiables sur les fiches officielles de la Cour de Cassation, du Conseil d'État et de la Cour des Comptes.
                          </p>
                        </div>

                        <div className="pt-1 flex flex-wrap gap-2.5">
                          <button
                            onClick={() => setDocModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-300" />
                            <span>Consulter / Demander les pièces officielles (Loi CAIDP)</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (institution.type !== 'MAIRIE') {
                    return (
                      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-amber-300 shadow-2xs space-y-4">
                        <div className="flex items-start gap-3.5">
                          <div className="p-3 rounded-2xl flex-shrink-0 bg-amber-100 text-amber-900">
                            <Scale className="w-6 h-6" />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                                Dotation en attente de publication
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900">
                              Transmission Officielle du Budget 2026 en attente
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Les crédits budgétaires alloués à cette institution sont en cours de consolidation à partir des annexes de la Loi de Finances et des documents budgétaires officiels.
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-wider text-[11px]">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>Engagement de Rigueur & Crédibilité Citoyenne Suivi Budget CI</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed font-medium">
                            Conformément à notre charte de vérifiabilité, aucun chiffre estimé ou non certifié n'est publié sur cette plateforme. Des démarches sont en cours pour obtenir les documents officiels validés.
                          </p>
                        </div>

                        <div className="pt-1 flex flex-wrap gap-2.5">
                          <button
                            onClick={() => setDocModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-300" />
                            <span>Faire / Suivre la demande de document officiel (Loi CAIDP)</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className={`bg-white rounded-2xl p-5 sm:p-6 border-2 shadow-2xs space-y-4 ${isGrandAbidjan ? 'border-brand-blue/40 bg-gradient-to-br from-white via-sky-50/20 to-white' : 'border-amber-300'}`}>
                      <div className="flex items-start gap-3.5">
                        <div className={`p-3 rounded-2xl flex-shrink-0 ${isGrandAbidjan ? 'bg-brand-blue/10 text-brand-blue' : 'bg-amber-100 text-amber-900'}`}>
                          <Scale className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isGrandAbidjan ? 'bg-blue-100 text-brand-blue border border-blue-200' : 'bg-amber-200 text-amber-950 border border-amber-300'}`}>
                              {isGrandAbidjan ? 'Mairie du Grand Abidjan • Double Lecture Prête' : 'Budget Primitif Municipal Autonome'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              Délibération 2026 en cours de centralisation
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900">
                            {isGrandAbidjan 
                              ? `Fiche Calibrée pour Réception du Budget Primitif 2026 — ${institution.name}` 
                              : 'Transmission Officielle du Budget 2026 en attente'}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {isAttecoube
                              ? "En tant que commune urbaine du Grand Abidjan, Attécoubé s'autofinance par ses quotes-parts d'impôts locaux DGI. Elle bénéficie en outre de 200 000 000 FCFA d'opérations prioritaires de développement local financées par l'État pour 6 chantiers d'écoles et de santé détaillés dans l'onglet Chantiers."
                              : isGrandAbidjan 
                              ? `En tant que commune du District Autonome d'Abidjan à fort potentiel fiscal, ${institution.name} dispose d'une assiette locale majeure (patentes industrielles et commerciales, taxes foncières reversées par la DGI). Cette fiche est déjà adaptée pour intégrer immédiatement le budget primitif délibéré par le Conseil Municipal afin d'afficher la double lecture certifiée (recettes locales vs dotations d'État).`
                              : `Cette collectivité municipale fonctionne sous le régime de l'autonomie financière et fiscale : son budget est voté par son Conseil Municipal sur la base de ses recettes propres (quote-part d'impôts locaux DGI, foncier, patentes, taxes municipales).`
                            }
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-wider text-[11px]">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Engagement de Rigueur & Crédibilité Citoyenne Suivi Budget CI</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          Conformément à notre charte de vérifiabilité, <strong>aucun chiffre estimé ou non certifié n'est publié sur cette plateforme</strong>. Des courriers officiels de demande d'accès aux documents administratifs (Loi n°2013-867 relative à la CAIDP) sont en cours de dépôt auprès des services municipaux pour obtenir l'extrait certifié de la délibération du Budget Primitif 2026 approuvé par la tutelle (DGDD / Ministère de l'Intérieur).
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Dès réception du document certifié officiel visé par le Trésor Public, la comparaison complète (Investissement vs Fonctionnement et Recettes Propres vs Dotations d'État) sera activée en temps réel.
                        </p>
                      </div>

                      <div className="pt-1 flex flex-wrap gap-2.5">
                        <button
                          onClick={() => setDocModalOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-300" />
                          <span>Faire / Suivre la demande de document officiel (Loi CAIDP)</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {institution.type === 'DISTRICT'
                          ? "Montant budgétaire du District (source à vérifier)"
                          : institution.type === 'REGION'
                          ? "Montant budgétaire régional (source à vérifier)"
                          : "Montant budgétaire enregistré (source à vérifier)"}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                        {financialView.total_formatted}
                      </h3>
                      <p className="text-xs text-brand-blue font-bold">
                        {financialView.total_words}
                      </p>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      Exercice de référence : <span className="font-bold text-slate-800">2026 — source et catégorie de crédit à vérifier</span>
                    </div>
                  </div>

                  {hasInstBreakdown ? (
                    <>
                      {/* Blocs Fonctionnement vs Investissement */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block">Dépenses de Fonctionnement (DGF)</span>
                          <span className="text-lg font-black text-slate-900 block break-words">{financialView.functioning_formatted}</span>
                          <span className="text-xs font-bold text-sky-800 block">({functioningPct}% de la dotation)</span>
                          <span className="text-[10px] font-semibold text-sky-900 block">({formatAmountInWords(institution.budget_functioning_fcfa)})</span>
                        </div>

                        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Dépenses d'Investissement Public (DGE)</span>
                          <span className="text-lg font-black text-slate-900 block break-words">{financialView.investment_formatted}</span>
                          <span className="text-xs font-bold text-emerald-800 block">({investmentPct}% de la dotation)</span>
                          <span className="text-[10px] font-semibold text-emerald-900 block">({formatAmountInWords(institution.budget_investment_fcfa)})</span>
                          {investmentBudget === 0 && (
                            <span className="text-[10px] text-slate-500 block pt-0.5 italic">
                              Crédits d'investissement portés par les ministères sectoriels
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Jauge Bicolore */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        {functioningPct > 0 && (
                          <div className="bg-sky-600 h-full transition-all duration-500" style={{ width: `${functioningPct}%` }} title={`Fonctionnement: ${functioningPct}%`}></div>
                        )}
                        {investmentPct > 0 && (
                          <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${investmentPct}%` }} title={`Investissement: ${investmentPct}%`}></div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span>
                        Ventilation détaillée entre dépenses de fonctionnement et dépenses d'investissement non disponible dans les données actuellement publiées.
                      </span>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>
                        {isPeripheralAbidjan && hasInstBreakdown && investmentPct > 0
                          ? `Ce montant correspond aux concours directs de l'État (DGF + DGE). Avec ${investmentPct}% alloués à l'équipement, ces crédits financent directement les ${relatedProjects.length} chantiers physiques de proximité de ${institution.name}.`
                          : "Ce montant correspond aux concours directs de l'État (DGF + DGE). Le budget primitif consolidé intégrant les impôts locaux propres est en cours de centralisation."}
                      </span>
                    </div>
                    <button
                      onClick={() => setDocModalOpen(true)}
                      className="text-brand-blue font-bold hover:underline whitespace-nowrap text-left sm:text-right"
                    >
                      Demande CAIDP →
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SYNTHÈSE D'ORIENTATION : INVESTISSEMENT PUBLIC (LFI 2026) */}
              {/* ========================================================================= */}
              {relatedProjects.length > 0 ? (
                <div className="bg-white border-l-4 border-l-emerald-500 border-y border-r border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                          Dépenses d'Investissement Public : {relatedProjects.length} Projets & Chantiers Inscrits
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {institution.budget_investment_fcfa != null && institution.budget_investment_fcfa > 0 ? (
                          <>
                            Tranche financée par la <strong className="text-slate-900">Dotation Globale d'Équipement (DGE) de l'État</strong> à hauteur de <strong className="text-slate-900">{formatFCFA(institution.budget_investment_fcfa)}</strong> ({formatAmountInWords(institution.budget_investment_fcfa)}). Les {relatedProjects.length} chantiers physiques correspondants sont détaillés dans l'onglet dédié.
                          </>
                        ) : (
                          <>
                            Opérations d'investissements publics inscrits au Budget National pour un volume cumulé de <strong className="text-slate-900">{formatFCFA(totalProjectsBudget)}</strong> ({formatAmountInWords(totalProjectsBudget)}) finançant <strong className="text-slate-900">{relatedProjects.length} chantiers et équipements</strong> pour le territoire de <strong className="text-slate-900">{institution.name}</strong>.
                          </>
                        )}
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('PROJECTS')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap flex-shrink-0 group"
                    >
                      <span>Consulter les {relatedProjects.length} chantiers</span>
                      <ArrowRight className="w-3.5 h-3.5 text-brand-orange group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              ) : (institution.budget_investment_fcfa != null && institution.budget_investment_fcfa > 0) ? (
                <div className="bg-white border-l-4 border-l-emerald-500 border-y border-r border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Dépenses d'Investissement Public Votées : {formatFCFA(institution.budget_investment_fcfa)} ({formatAmountInWords(institution.budget_investment_fcfa)} FCFA)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Cette enveloppe de <strong className="text-slate-900">{formatAmountInWords(institution.budget_investment_fcfa)}</strong>{investmentPct > 0 ? ` (${investmentPct}% du budget total)` : ''} est inscrite à la Loi de Finances 2026 pour les investissements matériels, logistiques, numériques et d'aménagement de <strong className="text-slate-900">{institution.name}</strong>.
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => setDocModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer group"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Demander le détail des marchés publics d'investissement (Loi CAIDP)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Investissements Immobiliers & Bâtiments Centralisés par l'État
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {institution.type === 'MAIRIE' ? (
                      <>
                        Conformément aux règles de la comptabilité publique ivoirienne, <strong>{institution.name}</strong> ne porte pas de ligne de crédit d'investissement direct en propre dans les concours décentralisés de l'État (100% de sa dotation est affectée au fonctionnement, à l'administration et aux services de proximité). Les opérations d'infrastructures métropolitaines majeures sont directement pilotées par les ministères sectoriels ou sur ressources propres.
                      </>
                    ) : (
                      <>
                        Les opérations d'investissement public de cette institution sont directement centralisées au niveau des programmes ministériels d'équipement ou financées sur budgets sectoriels d'investissement de l'État.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Lignes Budgétaires Détaillées */}
              {isLoadingLines ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-7 h-7 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-slate-700">Chargement des lignes budgétaires officielles (LFI 2026)...</p>
                  <p className="text-[11px] text-slate-400">Décompression asynchrone des programmes et dotations...</p>
                </div>
              ) : entityBudgetLines.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200">
                    <div className="relative flex-1 w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Rechercher une ligne (personnel, matériel, bourses...)"
                        value={lineSearch}
                        onChange={(e) => setLineSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <select
                        value={selectedNature}
                        onChange={(e) => setSelectedNature(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="ALL">Toutes les natures ({safeBudgetLines.length})</option>
                        {uniqueNatures.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Tableau des Dépenses */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="p-3 pl-4">Intitulé du Programme & Dépense</th>
                            <th className="p-3">Nature</th>
                            <th className="p-3 pr-4 text-right">Montant (FCFA)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {filteredLines.map((line) => (
                            <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 pl-4">
                                <div className="font-bold text-slate-900 text-xs">{line.libelle}</div>
                                <div className="text-[10px] text-slate-400">{line.sous_categorie_3 || line.sous_categorie_2 || 'LFI-2026'}</div>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap inline-flex items-center tracking-wide border ${
                                  line.nature?.toLowerCase().includes('personnel') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  line.nature?.toLowerCase().includes('investissement') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  'bg-blue-50 text-brand-blue border-blue-200'
                                }`}>
                                  {line.nature || 'Fonctionnement'}
                                </span>
                              </td>
                              <td className="p-3 pr-4 text-right font-black text-slate-900 break-words">
                                <div className="text-xs break-words">{formatFCFA(line.montant_fcfa)}</div>
                                <div className="text-[10px] font-semibold text-slate-500 tracking-tight">
                                  {formatAmountInWords(line.montant_fcfa)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {filteredLines.length > 0 && (
                          <tfoot className="bg-slate-50/90 border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={2} className="p-3 pl-4 font-black text-slate-900 text-xs uppercase">
                                Total Lignes Budgétaires ({filteredLines.length})
                              </td>
                              <td className="p-3 pr-4 text-right font-black text-slate-900 break-words">
                                <div className="text-sm text-slate-900">
                                  {formatFCFA(filteredLines.reduce((acc, l) => acc + (l.montant_fcfa || 0), 0))}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 tracking-tight">
                                  {formatAmountInWords(filteredLines.reduce((acc, l) => acc + (l.montant_fcfa || 0), 0))}
                                </div>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Ventilation budgétaire 2026 — provenance à vérifier
                    </h5>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {hasInstBreakdown ? (
                        <>
                          Les montants enregistrés pour <strong>{institution.name}</strong> s'élèvent à <strong>{formatFCFA(institution.budget_functioning_fcfa)}</strong> ({formatAmountInWords(institution.budget_functioning_fcfa)} — {functioningPct}%) en fonctionnement et <strong>{formatFCFA(institution.budget_investment_fcfa)}</strong> ({formatAmountInWords(institution.budget_investment_fcfa)} — {investmentPct}%) en investissements publics.
                        </>
                      ) : (
                        <>
                          La ventilation entre dépenses de fonctionnement et investissements pour <strong>{institution.name}</strong> n'est pas encore documentée dans les données disponibles.
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setDocModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    <span>Demander les pièces justificatives budgétaires (Loi CAIDP)</span>
                  </button>
                </div>
              )}

                      </div>
                    )}

                    {/* VUE SOUS-ONGLET 2 : EXÉCUTION & COMPTE ADMINISTRATIF */}
                    {financeSubTab === 'EXECUTION' && (
                      <AdministrativeAccountView
                        institution={institution}
                        onOpenDocRequest={() => {
                          setSelectedProjectForDoc(null);
                          setDocModalOpen(true);
                        }}
                      />
                    )}

                    {/* VUE SOUS-ONGLET 3 : HISTORIQUE & TRAÇABILITÉ MULTI-EXERCICES */}
                    {financeSubTab === 'HISTORY' && (
                      <LocalBudgetHistoryView
                        institution={institution}
                        onOpenDocRequest={() => {
                          setSelectedProjectForDoc(null);
                          setDocModalOpen(true);
                        }}
                      />
                    )}
                  </>
                );
              })()
            )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3 : LE MINISTRE & MISSIONS OFFICIELLES */}
          {/* ========================================================= */}
          {activeTab === 'LEADER_MISSIONS' && (
            <div className="space-y-4">

              {/* Biographie & Vision */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-brand-blue flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Biographie & Profil Républicain
                  </h4>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal text-justify">
                  {institution.leader_bio || `${institution.leader_name || 'Le Premier Responsable'} assure la direction, la représentation légale et la coordination générale des politiques publiques pour le compte de ${institution.name} conformément aux décrets de la République de Côte d'Ivoire.`}
                </p>
              </div>

              {/* Formations & Parcours (si renseignés) */}
              {((institution.leader_education && institution.leader_education.length > 0) || (institution.leader_experience && institution.leader_experience.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {institution.leader_education && institution.leader_education.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-brand-blue" />
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                          Diplômes & Formation
                        </h5>
                      </div>
                      <ul className="space-y-1.5">
                        {institution.leader_education.map((edu, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 flex-shrink-0"></span>
                            <span>{edu}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {institution.leader_experience && institution.leader_experience.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-brand-orange" />
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                          Hautes Fonctions & Expérience
                        </h5>
                      </div>
                      <ul className="space-y-1.5">
                        {institution.leader_experience.map((exp, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange mt-1.5 flex-shrink-0"></span>
                            <span>{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Missions et Compétences Institutionnelles */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Attributions & Missions Régaliennes
                  </h4>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-medium">
                  {institution.mission_summary || `Conception, mise en œuvre et suivi-évaluation des politiques sectorielles de l'État ivoirien pour le département : ${institution.name}.`}
                </p>
              </div>

              {/* Organigramme & Directions Clés */}
              {institution.organigramme_details && institution.organigramme_details.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-blue" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Organigramme & Structures Opérationnelles
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {institution.organigramme_details.map((section, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-brand-orange" />
                          <span>{section.title}</span>
                        </h5>

                        <ul className="space-y-1.5">
                          {section.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : institution.organigramme_summary && institution.organigramme_summary.length > 0 ? (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-blue" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Directions & Pôles Rattachés
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {institution.organigramme_summary.map((dir, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-brand-blue/10 text-brand-blue flex items-center justify-center font-black text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{dir}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Responsable de l'Information (CAIDP) */}
              <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-orange" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      Accès aux Documents Publics (Loi n°2013-867)
                    </h4>
                  </div>
                  <a 
                    href="https://caidp.ci/institutrecherche" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] text-brand-orange hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Registre CAIDP</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Conformément à la Loi n°2013-867, chaque citoyen dispose du droit légal de solliciter les rapports budgétaires, contrats et documents administratifs de cette structure.
                </p>

                <div className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 text-xs space-y-1.5">
                  {riName ? (
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Responsable de l'Information (RI) :</span>
                      <div className="font-bold text-white text-sm">{riName}</div>
                      {riFunction && <div className="text-slate-300 text-xs mt-0.5">{riFunction}</div>}
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Service Référent :</span>
                      <div className="font-bold text-white text-sm">{riFunction}</div>
                    </div>
                  )}

                  {riEmail ? (
                    <div className="text-slate-300 pt-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{riEmail}</span>
                    </div>
                  ) : null}

                  {riPhone ? (
                    <div className="text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{riPhone}</span>
                    </div>
                  ) : null}

                  {!riEmail && !riPhone && (
                    <div className="pt-1 text-[11px] text-slate-400">
                      Contacts directs non publiés sur le registre public CAIDP. Saisine par courrier écrit ou via{' '}
                      <a href="https://caidp.ci" target="_blank" rel="noopener noreferrer" className="text-brand-orange font-bold hover:underline">caidp.ci</a>.
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedProjectForDoc(null);
                      setDocModalOpen(true);
                    }}
                    className="w-full mt-2 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Demande de Documents Publics (Loi CAIDP)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* 4. PIED DE PAGE AVEC ACTIONS CITOYENNES */}
        {/* ========================================================= */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
          <button
            onClick={() => {
              setSelectedProjectForDoc(null);
              setDocModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-brand-orange" />
            <span>Demande de Documents Publics (Loi CAIDP)</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer la fiche
          </button>
        </div>

      </div>

      {/* SOUS-MODAL DEMANDE CAIDP */}
      <OfficialDocRequestModal
        isOpen={docModalOpen}
        onClose={() => {
          setDocModalOpen(false);
          setSelectedProjectForDoc(null);
        }}
        institution={institution}
        project={selectedProjectForDoc}
      />
    </div>
  );
};
