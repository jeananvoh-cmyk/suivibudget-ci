import React from 'react';
import { ActiveTab } from '../types';
import { Home, Building2, Coins, Camera } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSendProof: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSendProof,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        
        {/* Tab 1: Accueil */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'home'
              ? 'text-brand-blue font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Accueil</span>
        </button>

        {/* Tab 2: Budgets */}
        <button
          onClick={() => setActiveTab('institutions')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'institutions'
              ? 'text-brand-blue font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className={`w-5 h-5 ${activeTab === 'institutions' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Budgets</span>
        </button>

        {/* Action Button: Send proof (Floating Center Button) */}
        <div className="relative -top-3">
          <button
            onClick={onOpenSendProof}
            className="w-12 h-12 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-transform border-2 border-white"
            title="Signaler un chantier"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        {/* Tab 3: Suivi Projets */}
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'projects'
              ? 'text-brand-blue font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Coins className={`w-5 h-5 ${activeTab === 'projects' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Suivi Projets</span>
        </button>

        {/* Tab 4: Observatoire */}
        <button
          onClick={() => setActiveTab('observatory')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
            activeTab === 'observatory'
              ? 'text-brand-blue font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Camera className={`w-5 h-5 ${activeTab === 'observatory' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Terrain</span>
        </button>

      </div>
    </div>
  );
};
