import React from 'react';
import { ImpactStats } from '../types';
import { 
  Building2, 
  Coins, 
  FileSpreadsheet, 
  ShieldCheck, 
  CheckCircle2,
  Sparkles,
  MapPin
} from 'lucide-react';
import { formatCompactFCFA } from '../utils/formatters';

interface StatImpactBannerProps {
  stats: ImpactStats;
}

export const StatImpactBanner: React.FC<StatImpactBannerProps> = ({ stats }) => {
  const verifiedCount = stats.verifiedProofsCount || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Territoires (234 Collectivités) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-400 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Territoires</span>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              234
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              201 communes + 33 régions et districts
            </p>
          </div>
        </div>

        {/* Card 2: Lignes Budgétaires / Chantiers */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-400 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Lignes Budgétaires</span>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalBudgetLines.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              Dotations & programmes analysés
            </p>
          </div>
        </div>

        {/* Card 3: Montant Investissements */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-400 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Investissements</span>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-2xs">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCompactFCFA(stats.totalInvestmentsFcfa || 175648952140)}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              Montant voté Loi de Finances
            </p>
          </div>
        </div>

        {/* Card 4: Contrôle Citoyen Dynamique */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-400 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Contrôle Citoyen</span>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {verifiedCount > 0 ? `${verifiedCount} Validé${verifiedCount > 1 ? 's' : ''}` : '100% Vérifiable'}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              {verifiedCount > 0 
                ? `${verifiedCount} contribution${verifiedCount > 1 ? 's' : ''} certifiée${verifiedCount > 1 ? 's' : ''} sur le terrain` 
                : 'Auditable avec preuves de terrain'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
