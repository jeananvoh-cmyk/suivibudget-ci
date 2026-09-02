import React from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';

interface AnnuaireIndexPageProps {
  onNavigateToSection: (section: 'MINISTRIES' | 'INSTITUTIONS' | 'REGULATORS' | 'MUNICIPAL' | 'REGIONAL') => void;
  mairiesCount: number;
  regionsCount: number;
  ministersCount: number;
  institutionsCount: number;
  regulatorsCount?: number;
}

export const AnnuaireIndexPage: React.FC<AnnuaireIndexPageProps> = ({
  onNavigateToSection,
  mairiesCount,
  regionsCount,
  ministersCount,
  institutionsCount,
  regulatorsCount = 7,
}) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. MACRO BUDGET NATIONAL 2026 BANNER (CLEAN LIGHT DESIGN)                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        
        <div className="space-y-6">
          
          {/* Header Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 mb-2">
                <span>Loi de Finances 2026 • République de Côte d'Ivoire</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                Budget Général de l'État : <span className="text-slate-900">17 350,2 Milliards FCFA</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Montant global voté en équilibre de ressources et de dépenses (en hausse de <strong>+13,1 %</strong> par rapport à 2025).
              </p>
            </div>

            {/* Clickable Official Source Link */}
            <a
              href="https://finances.gouv.ci"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-2xl transition-all flex-shrink-0"
              title="Consulter les documents budgétaires officiels sur le portail du Ministère des Finances"
            >
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Source Officielle</span>
                <span className="text-xs font-bold text-slate-800 group-hover:text-brand-blue transition-colors flex items-center gap-1">
                  finances.gouv.ci
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-blue" />
                </span>
              </div>
            </a>
          </div>

          {/* 3 Macro Pillars of State Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Pillar 1: Recettes Budgétaires */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Recettes Budgétaires</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-800">50,3 %</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  8 728,5 Mds FCFA
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Impôts, droits de douanes, fiscalité intérieure, recettes pétrolières et minières.
                </p>
              </div>
            </div>

            {/* Pillar 2: Ressources de Trésorerie */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Ressources de Trésorerie</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-800">40,8 %</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  7 081,5 Mds FCFA
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Émissions de titres publics, emprunts obligataires, financements et appuis des partenaires.
                </p>
              </div>
            </div>

            {/* Pillar 3: Comptes Spéciaux du Trésor */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Comptes Spéciaux du Trésor</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-800">8,9 %</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  1 540,2 Mds FCFA
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Fonds de développement, caisses de retraite et comptes d'affectation spéciale.
                </p>
              </div>
            </div>

          </div>

          {/* Citizen Focus Bridge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-700 font-medium leading-relaxed">
              Sur ce budget global, <strong>3 461,00 Milliards FCFA</strong> sont alloués aux <strong>Investissements Publics & Chantiers</strong> (7 162 projets suivis par les citoyens sur cette plateforme).
            </span>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. NAVIGATION VERS LES 5 PÔLES INSTITUTIONNELS                             */}
      {/* ========================================================================= */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          
          {/* Card 1 : Ministères */}
          <div
            onClick={() => onNavigateToSection('MINISTRIES')}
            className="group relative bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs hover:shadow-xl hover:border-slate-400 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                Pouvoir Exécutif
              </span>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Ministères
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Primature, ministères d'État et ministères sectoriels de l'action publique.
              </p>
            </div>

            <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">{ministersCount} ministères</span>
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 2 : Institutions */}
          <div
            onClick={() => onNavigateToSection('INSTITUTIONS')}
            className="group relative bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs hover:shadow-xl hover:border-slate-400 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                Constitutionnel
              </span>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Institutions
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Présidence, Assemblée, Sénat, Cour des Comptes, Conseil Constitutionnel, HABG.
              </p>
            </div>

            <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">{institutionsCount} institutions</span>
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 3 : Autorités & Régulateurs (AAI) */}
          <div
            onClick={() => onNavigateToSection('REGULATORS')}
            className="group relative bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs hover:shadow-xl hover:border-slate-400 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                Régulation & AAI
              </span>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Autorités & Régulateurs
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Organismes autonomes de régulation sectorielle, de transparence et de contrôle.
              </p>
            </div>

            <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">{regulatorsCount} régulateurs</span>
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 4 : Mairies */}
          <div
            onClick={() => onNavigateToSection('MUNICIPAL')}
            className="group relative bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs hover:shadow-xl hover:border-slate-400 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                Collectivités
              </span>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Mairies
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Les 201 communes : dotations d'État, budgets et projets communaux.
              </p>
            </div>

            <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">{mairiesCount} communes</span>
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 5 : Conseils Régionaux & Districts */}
          <div
            onClick={() => onNavigateToSection('REGIONAL')}
            className="group relative bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs hover:shadow-xl hover:border-slate-400 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-2.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                Territoires
              </span>
              <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                Conseils Régionaux
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Les 31 régions et 2 districts autonomes de la République.
              </p>
            </div>

            <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">{regionsCount} collectivités</span>
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

