import React from 'react';
import { ActiveTab } from '../types';
import { dataStore } from '../services/dataStore';

interface HeaderProps {
  onOpenPrivateSentinel?: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenSendProof?: () => void;
  onOpenSpotlight?: () => void;
  onNavigateToAnnuaireSection?: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNavigateToAnnuaireSection,
  onOpenPrivateSentinel,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">
          
          {/* SUIVI BUDGET CI BRANDING & LOGO */}
          <div 
            className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
            onClick={() => setActiveTab('home')}
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <svg className="w-8 h-8 text-brand-blue" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18C8 10 14 6 22 6C18 12 18 18 20 26C14 24 10 22 6 18Z" fill="#0066CC" />
                  <path d="M12 24C15 17 20 14 26 14C23 18 23 22 24 28C19 26 16 25 12 24Z" fill="#F58220" opacity="0.9" />
                </svg>
                <div className="flex items-baseline">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-brand-blue font-sans">
                    Suivi
                  </span>
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-sans ml-0.5">
                    Budget
                  </span>
                  <div className="flex items-center text-brand-orange ml-1 font-black text-xl">
                    <span>&gt;</span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 tracking-wider pl-9 -mt-1 uppercase">
                Côte d'Ivoire
              </span>
            </div>
          </div>

          {/* MAIN NAVIGATION TABS */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('home')}
              className={`py-2 transition-all relative ${
                activeTab === 'home'
                  ? 'text-brand-blue font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-blue'
                  : 'text-slate-700 hover:text-brand-blue'
              }`}
            >
              Accueil
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`py-2 transition-all relative ${
                activeTab === 'projects'
                  ? 'text-brand-blue font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-blue'
                  : 'text-slate-700 hover:text-brand-blue'
              }`}
            >
              Suivi des Projets
            </button>

            {/* Budgets (Annuaire & Dotations) */}
            <div className="relative group py-2">
              <button
                onClick={() => {
                  setActiveTab('institutions');
                  if (onNavigateToAnnuaireSection) onNavigateToAnnuaireSection('INDEX');
                }}
                className={`transition-all relative flex items-center gap-1.5 ${
                  activeTab === 'institutions'
                    ? 'text-brand-blue font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-blue'
                    : 'text-slate-700 hover:text-brand-blue'
                }`}
              >
                <span>Budgets</span>
                <span className="text-[10px] text-slate-400 group-hover:text-brand-blue transition-transform group-hover:rotate-180">▾</span>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute left-0 top-full pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-2 w-72 space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('institutions');
                      if (onNavigateToAnnuaireSection) onNavigateToAnnuaireSection('INDEX');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-blue transition-colors flex items-center justify-between"
                  >
                    <span>Vue d'ensemble des Structures</span>
                    <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Toutes</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      setActiveTab('institutions');
                      if (onNavigateToAnnuaireSection) onNavigateToAnnuaireSection('MINISTRIES');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-brand-blue transition-colors flex items-center justify-between"
                  >
                    <span>Ministères (Pouvoir Exécutif)</span>
                    <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">35</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('institutions');
                      if (onNavigateToAnnuaireSection) onNavigateToAnnuaireSection('INSTITUTIONS');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors flex items-center justify-between"
                  >
                    <span>Institutions de la République</span>
                    <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">13</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('institutions');
                      if (onNavigateToAnnuaireSection) onNavigateToAnnuaireSection('REGULATORS');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors flex items-center justify-between"
                  >
                    <span>Autorités & Organes de Régulation</span>
                    <span className="text-[10px] font-black text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded">7</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('institutions');
                      if (onNavigateToAnnuaireSection) onNavigateToAnnuaireSection('MUNICIPAL');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center justify-between"
                  >
                    <span>Mairies & Communes</span>
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">201</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('institutions');
                      if (onNavigateToAnnuaireSection) onNavigateToAnnuaireSection('REGIONAL');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-colors flex items-center justify-between"
                  >
                    <span>Conseils Régionaux & Districts</span>
                    <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">33</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('observatory')}
              className={`py-2 transition-all relative flex items-center gap-1.5 ${
                activeTab === 'observatory'
                  ? 'text-brand-blue font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-blue'
                  : 'text-slate-700 hover:text-brand-blue'
              }`}
            >
              <span>Observatoire Citoyen</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`py-2 transition-all relative ${
                activeTab === 'documents'
                  ? 'text-brand-blue font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-blue'
                  : 'text-slate-700 hover:text-brand-blue'
              }`}
            >
              <span>Documents & Lois</span>
            </button>
          </nav>

          {/* RIGHT ACTION: OFFICIAL FACEBOOK COMMUNITY */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <a
              href="https://www.facebook.com/profile.php?id=61593791261798"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 hover:bg-[#1877F2] text-[#1877F2] hover:text-white transition-all text-xs font-bold border border-blue-200/80 shadow-2xs group"
              title="Rejoignez notre communauté sur Facebook"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="hidden sm:inline">Page Facebook</span>
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
