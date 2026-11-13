import React from 'react';
import { ImpactStats } from '../types';
import { formatCompactFCFA } from '../utils/formatters';

interface StatImpactBannerProps {
  stats: ImpactStats;
}

export const StatImpactBanner: React.FC<StatImpactBannerProps> = ({ stats }) => {
  const verifiedCount = stats.verifiedProofsCount || 0;
  const detailed = stats.detailed;
  const communesCount = detailed?.collectivities.communesReferenced ?? stats.totalCommunes;
  const regionsCount = detailed?.collectivities.regionsReferenced ?? stats.totalRegions;
  const bp2026Count = detailed?.collectivities.collectivitesWithPrimitiveBudget2026;
  const caPublishedCount = detailed?.collectivities.collectivitesWithPublishedCA;

  const physicalAllCount = detailed?.investments.physicalAllCount ?? stats.totalBudgetLines;
  const state2026Count = detailed?.investments.statePhysical2026Count;
  const local2026Count = detailed?.investments.localPhysical2026Count;
  const multiYearCount = detailed?.investments.multiYearPre2026Count ?? 0;

  const physical2026Amount = detailed?.investments.physical2026AmountFcfa ?? stats.totalInvestmentsFcfa;
  const state2026Amount = detailed?.investments.statePhysical2026AmountFcfa;
  const local2026Amount = detailed?.investments.localPhysical2026AmountFcfa;
  const multiYearAmount = detailed?.investments.multiYearPre2026AmountFcfa;

  const proofTarget2026 = detailed?.citizenProofs.target2026 ?? 1000;
  const pendingProofsCount = detailed?.citizenProofs.pendingCount ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Territoires (232 Collectivités Référencées & Couverture Réelle) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Collectivités Référencées</span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {(stats.totalCollectivites ?? communesCount + regionsCount).toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              {communesCount} communes + {regionsCount} conseils régionaux
            </p>
            {bp2026Count !== undefined && caPublishedCount !== undefined && (
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                {bp2026Count} BP 2026 cités • {caPublishedCount} CA 2024 publiés
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Projets Physiques Répertoriés (Distincts des lignes brutes) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Projets Physiques Suivis</span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {physicalAllCount.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              {state2026Count !== undefined && local2026Count !== undefined
                ? `${state2026Count.toLocaleString('fr-FR')} État (2026) + ${local2026Count.toLocaleString('fr-FR')} locaux (2026)${multiYearCount > 0 ? ` + ${multiYearCount} ex. 2021` : ''}`
                : 'Chantiers et équipements répertoriés'}
            </p>
          </div>
        </div>

        {/* Card 3: Investissements Physiques 2026 (Périmètre strict par exercice et niveau) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Investissements Physiques 2026</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {physical2026Amount > 0 ? formatCompactFCFA(physical2026Amount) : 'Montant à confirmer'}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              {state2026Amount !== undefined && local2026Amount !== undefined
                ? `État : ${formatCompactFCFA(state2026Amount)} • Local : ${formatCompactFCFA(local2026Amount)}`
                : 'Périmètre des projets physiques 2026'}
            </p>
            {multiYearCount > 0 && multiYearAmount != null && multiYearAmount > 0 && (
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Hors {multiYearCount} projet pluriannuel 2021 ({formatCompactFCFA(multiYearAmount)})
              </p>
            )}
          </div>
        </div>

        {/* Card 4: Contrôle Citoyen Dynamique (Objectif 2026 : 1 000 constats) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Contrôle Citoyen</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Objectif 2026 : {proofTarget2026.toLocaleString('fr-FR')}
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {verifiedCount > 0
                ? `${verifiedCount.toLocaleString('fr-FR')} Constat${verifiedCount > 1 ? 's' : ''}`
                : `0 / ${proofTarget2026.toLocaleString('fr-FR')}`}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              {verifiedCount > 0
                ? `${verifiedCount.toLocaleString('fr-FR')} observation${verifiedCount > 1 ? 's' : ''} citoyenne${verifiedCount > 1 ? 's' : ''} publiée${verifiedCount > 1 ? 's' : ''}`
                : pendingProofsCount > 0
                  ? `${pendingProofsCount} observation(s) en attente de modération`
                  : 'Collecte citoyenne ouverte — aucun constat publié'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
