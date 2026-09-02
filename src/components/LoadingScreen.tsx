import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Chargement des données publiques..." 
}) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
      <div className="relative mb-4">
        {/* Animated Brand Pulse Spinner */}
        <div className="w-12 h-12 rounded-full border-3 border-slate-200 border-t-brand-blue animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-brand-orange animate-ping"></div>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-600 tracking-wide uppercase">{message}</p>
      <p className="text-[11px] text-slate-400 mt-1">Plateforme Citoyenne Suivi Budget CI</p>
    </div>
  );
};
