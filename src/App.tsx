import { useState, useEffect, lazy, Suspense } from 'react';
import { ActiveTab, BudgetProject } from './types';
import { dataStore } from './services/dataStore';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LoadingScreen } from './components/LoadingScreen';
import { updateDocumentSeo } from './utils/seoHelpers';
import { CheckCircle2, Lock, LogOut } from 'lucide-react';

import { ProjectDetailModal } from './components/ProjectDetailModal';
import { OfficialDocRequestModal } from './components/OfficialDocRequestModal';
import { Footer } from './components/Footer';

// Lazy-loaded Pages for code splitting & ultra-fast initial bundle
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const InstitutionsPage = lazy(() => import('./pages/InstitutionsPage').then(m => ({ default: m.InstitutionsPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ObservatoryPage = lazy(() => import('./pages/ObservatoryPage').then(m => ({ default: m.ObservatoryPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));

// Lazy-loaded Secondary Modals
const SendProofModal = lazy(() => import('./components/SendProofModal').then(m => ({ default: m.SendProofModal })));
const ShareModal = lazy(() => import('./components/ShareModal').then(m => ({ default: m.ShareModal })));
const SpotlightSearchModal = lazy(() => import('./components/SpotlightSearchModal').then(m => ({ default: m.SpotlightSearchModal })));
const PrivateSentinelModal = lazy(() => import('./components/PrivateSentinelModal').then(m => ({ default: m.PrivateSentinelModal })));

export function App() {
  const getInitialTab = (): ActiveTab => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as ActiveTab;
    const viewParam = params.get('view');
    const projectParam = params.get('project');
    if (projectParam) return 'projects';
    if (viewParam && ['mairies', 'communes', 'regions', 'districts', 'ministeres', 'grandes-institutions', 'institutions', 'regulateurs', 'autorites', 'aai'].includes(viewParam)) {
      return 'institutions';
    }
    if (['home', 'projects', 'institutions', 'observatory', 'admin'].includes(tabParam)) {
      return tabParam;
    }
    return 'home';
  };

  const getInitialAnnuaireView = (): 'INDEX' | 'MINISTRIES' | 'INSTITUTIONS' | 'REGULATORS' | 'MUNICIPAL' | 'REGIONAL' => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'ministeres' || viewParam === 'gouvernement') return 'MINISTRIES';
    if (viewParam === 'grandes-institutions' || viewParam === 'institutions') return 'INSTITUTIONS';
    if (viewParam === 'regulateurs' || viewParam === 'autorites' || viewParam === 'aai') return 'REGULATORS';
    if (viewParam === 'mairies' || viewParam === 'communes') return 'MUNICIPAL';
    if (viewParam === 'regions' || viewParam === 'districts') return 'REGIONAL';
    return 'INDEX';
  };

  const getInitialSelectedProject = (): BudgetProject | null => {
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get('project');
    if (projectParam) {
      return dataStore.getProjectById(projectParam) || null;
    }
    return null;
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [annuaireView, setAnnuaireView] = useState<'INDEX' | 'MINISTRIES' | 'INSTITUTIONS' | 'REGULATORS' | 'MUNICIPAL' | 'REGIONAL'>(getInitialAnnuaireView);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<BudgetProject | null>(getInitialSelectedProject);
  const [isSendProofOpen, setIsSendProofOpen] = useState(false);
  const [targetProofProject, setTargetProofProject] = useState<BudgetProject | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDocRequestOpen, setIsDocRequestOpen] = useState(false);
  const [targetDocRequestProject, setTargetDocRequestProject] = useState<BudgetProject | null>(null);
  const [isPrivateSentinelOpen, setIsPrivateSentinelOpen] = useState(false);
  const [targetShareProject, setTargetShareProject] = useState<BudgetProject | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const institutions = dataStore.getInstitutions();
  const allProjects = dataStore.getProjects();
  const auth = dataStore.getAuth();

  // Sync tab with URL and update dynamic SEO
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());

    // Update SEO dynamically
    const tabTitles: Record<ActiveTab, string> = {
      home: "Accueil - Chiffres Clés du Budget 2026",
      projects: "Suivi des Projets d'Investissement Public",
      institutions: "Budgets & Annuaire des Responsables",
      observatory: "Observatoire Citoyen & Remontées Terrain",
      admin: "Espace Administration & Modération",
    };
    updateDocumentSeo({ title: tabTitles[tab] });
  };

  const handleSelectProject = (project: BudgetProject | null) => {
    setSelectedProject(project);
    const url = new URL(window.location.href);
    if (project) {
      url.searchParams.set('tab', 'projects');
      url.searchParams.set('project', project.id);
      updateDocumentSeo({
        title: project.title,
        description: `Projet citoyen : ${project.title} (${project.commune_name || project.region_name}) - Suivi des investissements publics en Côte d'Ivoire.`,
      });
    } else {
      url.searchParams.delete('project');
      updateDocumentSeo({ title: "Suivi des Projets d'Investissement Public" });
    }
    window.history.pushState({}, '', url.toString());
  };

  // Keyboard shortcut for discrete Admin access (Ctrl+Shift+A or Alt+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) || (e.altKey && (e.key === 'A' || e.key === 'a'))) {
        e.preventDefault();
        handleTabChange(activeTab === 'admin' ? 'home' : 'admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
      setAnnuaireView(getInitialAnnuaireView());
      setSelectedProject(getInitialSelectedProject());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Force re-render on dataStore changes
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOpenSendProof = (project?: BudgetProject) => {
    setTargetProofProject(project || selectedProject || null);
    setIsSendProofOpen(true);
  };

  const handleOpenShare = (project: BudgetProject) => {
    setTargetShareProject(project);
    setIsShareOpen(true);
  };

  const handleOpenDocRequest = (project: BudgetProject) => {
    setTargetDocRequestProject(project);
    setIsDocRequestOpen(true);
  };

  const handleNavigateToProjectsWithFilter = (query: string) => {
    setSearchQuery(query);
    handleTabChange('projects');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToAnnuaireSection = (section: any) => {
    setAnnuaireView(section);
    handleTabChange('institutions');
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'institutions');
    if (section === 'MINISTRIES') url.searchParams.set('view', 'ministeres');
    else if (section === 'INSTITUTIONS') url.searchParams.set('view', 'institutions');
    else if (section === 'REGULATORS') url.searchParams.set('view', 'regulateurs');
    else if (section === 'MUNICIPAL') url.searchParams.set('view', 'mairies');
    else if (section === 'REGIONAL') url.searchParams.set('view', 'regions');
    else url.searchParams.delete('view');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    dataStore.logout();
    showToast('Déconnexion réussie.');
    handleTabChange('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-terracotta-100 selection:text-terracotta-800">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top duration-300 max-w-sm">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold leading-snug">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Floating Admin Active Session Bar (only when browsing public tabs) */}
      {auth.isAuthenticated && activeTab !== 'admin' && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Admin ({auth.fullName})</span>
          </div>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => handleTabChange('admin')}
            className="hover:text-brand-orange font-semibold transition-colors cursor-pointer"
          >
            Accéder au Dashboard →
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={handleLogout}
            className="text-rose-400 hover:text-rose-300 transition-colors p-1 cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header (Clean & uncluttered top navigation) */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenSendProof={() => handleOpenSendProof()}
        onOpenSpotlight={() => setIsSpotlightOpen(true)}
        onNavigateToAnnuaireSection={handleNavigateToAnnuaireSection}
        onOpenPrivateSentinel={() => setIsPrivateSentinelOpen(true)}
      />

      {/* 2. Main Tab Content with Suspense Code Splitting */}
      <main className="flex-1">
        <Suspense fallback={<LoadingScreen message="Chargement des données citoyennes..." />}>
          {activeTab === 'home' && (
            <HomePage
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectProject={(p) => handleSelectProject(p)}
              onOpenSendProof={(p) => handleOpenSendProof(p)}
              onOpenShare={(p) => handleOpenShare(p)}
              onNavigateTab={(tab) => {
                handleTabChange(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeTab === 'institutions' && (
            <InstitutionsPage
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onNavigateToProjects={handleNavigateToProjectsWithFilter}
              initialView={annuaireView}
              key={annuaireView}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsPage
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectProject={(p) => handleSelectProject(p)}
              onOpenSendProof={(p) => handleOpenSendProof(p)}
              onOpenShare={(p) => handleOpenShare(p)}
            />
          )}

          {activeTab === 'observatory' && (
            <ObservatoryPage
              onOpenSendProof={(p) => handleOpenSendProof(p)}
              onSelectProjectById={(projId) => {
                const p = dataStore.getProjectById(projId);
                if (p) handleSelectProject(p);
              }}
            />
          )}

          {/* ADMIN TAB: PROTECTED BY LOGIN & PASSWORD */}
          {activeTab === 'admin' && (
            auth.isAuthenticated ? (
              <AdminDashboardPage
                onOpenShare={(p) => handleOpenShare(p)}
              />
            ) : (
              <AdminLoginPage
                onLoginSuccess={() => handleTabChange('admin')}
              />
            )
          )}
        </Suspense>
      </main>

      {/* 3. Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenSendProof={() => handleOpenSendProof()}
      />

      {/* 4. Asynchronous Modals */}
      <Suspense fallback={null}>
        {isPrivateSentinelOpen && (
          <PrivateSentinelModal
            isOpen={isPrivateSentinelOpen}
            onClose={() => setIsPrivateSentinelOpen(false)}
            onOpenSendProof={() => {
              setIsPrivateSentinelOpen(false);
              setIsSendProofOpen(true);
            }}
          />
        )}

        {isSpotlightOpen && (
          <SpotlightSearchModal
            isOpen={isSpotlightOpen}
            onClose={() => setIsSpotlightOpen(false)}
            institutions={institutions}
            projects={allProjects}
            onSelectInstitution={(instName, type) => {
              if (type === 'MAIRIE' || type === 'REGION') {
                setSearchQuery(instName.replace('Mairie de ', '').replace('Mairie d\'', '').replace('Mairie du ', ''));
                handleTabChange('institutions');
              } else {
                handleTabChange('institutions');
              }
            }}
            onSelectProject={(projId) => {
              const p = dataStore.getProjectById(projId);
              if (p) {
                handleSelectProject(p);
                handleTabChange('projects');
              }
            }}
            onSelectOfficial={(official) => {
              setSearchQuery(official.department_ministry.replace('Ministère d\'État, ', '').replace('Ministère de ', '').replace('Ministère des ', ''));
              handleTabChange('institutions');
            }}
          />
        )}

        {selectedProject && (
          <ProjectDetailModal
            project={selectedProject}
            onClose={() => handleSelectProject(null)}
            onOpenSendProof={(p) => handleOpenSendProof(p)}
            onOpenShare={(p) => handleOpenShare(p)}
            onOpenDocRequest={(p) => handleOpenDocRequest(p)}
          />
        )}

        {isDocRequestOpen && (
          <OfficialDocRequestModal
            isOpen={isDocRequestOpen}
            onClose={() => {
              setIsDocRequestOpen(false);
              setTargetDocRequestProject(null);
            }}
            project={targetDocRequestProject}
          />
        )}

        {isSendProofOpen && (
          <SendProofModal
            isOpen={isSendProofOpen}
            onClose={() => {
              setIsSendProofOpen(false);
              setTargetProofProject(null);
            }}
            targetProject={targetProofProject}
            onSuccessToast={showToast}
          />
        )}

        {isShareOpen && (
          <ShareModal
            project={targetShareProject}
            isOpen={isShareOpen}
            onClose={() => {
              setIsShareOpen(false);
              setTargetShareProject(null);
            }}
          />
        )}
      </Suspense>

      {/* 5. Citizen Engagement Footer & Open Data Resources */}
      <Footer 
        activeTab={activeTab} 
        onNavigateTab={handleTabChange} 
        onOpenDocModal={() => setIsDocRequestOpen(true)} 
      />

    </div>
  );
}

export default App;
