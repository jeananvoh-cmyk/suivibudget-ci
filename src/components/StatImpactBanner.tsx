import React from 'react';
import { ImpactStats } from '../types';
import { formatCompactFCFA } from '../utils/formatters';
import { LFI_2026_OFFICIAL_MACRO } from '../utils/publicIndicators';

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
  const localCsv2026Count = detailed?.investments.localCsvPhysical2026Count;
  const bouakeCount = detailed?.investments.localPortalBouakePhysical2026Count ?? 0;
  const multiYearCount = detailed?.investments.multiYearPre2026Count ?? 0;

  const state2026Amount = detailed?.investments.statePhysical2026AmountFcfa;
  const localCsv2026Amount = detailed?.investments.localCsvPhysical2026AmountFcfa;
  const bouakeAmount = detailed?.investments.localPortalBouakePhysical2026AmountFcfa;
  const multiYearAmount = detailed?.investments.multiYearPre2026AmountFcfa;
  const hasCompleteState2026Amounts = (detailed?.investments.statePhysical2026Count ?? 0) > 0 && detailed?.investments.unknownAmountState2026ProjectsCount === 0;
  const hasCompleteLocalCsv2026Amounts = (detailed?.investments.localCsvPhysical2026Count ?? 0) > 0 && detailed?.investments.unknownAmountLocalCsv2026ProjectsCount === 0;
  const hasCompleteBouake2026Amounts = (detailed?.investments.localPortalBouakePhysical2026Count ?? 0) > 0 && detailed?.investments.unknownAmountLocalPortalBouake2026ProjectsCount === 0;
  const hasCompletePre2026Amounts = detailed?.investments.unknownAmountPre2026ProjectsCount === 0;

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
                {bp2026Count} ont annoncé leur budget 2026 en ligne, {caPublishedCount} ont publié leurs dépenses réelles 2024
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Projets Physiques Répertoriés (Classification automatisée non certifiée) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Projets publics suivis</span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {physicalAllCount.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              Écoles, santé, eau, routes… classés par secteur (classification automatisée)
            </p>
            {state2026Count !== undefined && localCsv2026Count !== undefined && (
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                {(state2026Count + localCsv2026Count).toLocaleString('fr-FR')} de la Loi de finances 2026 ({state2026Count.toLocaleString('fr-FR')} État, {localCsv2026Count.toLocaleString('fr-FR')} communes et régions){bouakeCount > 0 ? `, ${bouakeCount} à Bouaké` : ''}{multiYearCount > 0 ? ` et ${multiYearCount} lancé en 2021` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Investissements LFI 2026 & Périmètre Extrait */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Investissements de l’État 2026</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {LFI_2026_OFFICIAL_MACRO.investmentsMilliardsLabel}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-snug">
              Votés dans la Loi de finances 2026 (Loi n° 2025-987)
            </p>
            {state2026Amount !== undefined && localCsv2026Amount !== undefined && (
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Projets suivis ici : {hasCompleteState2026Amounts ? `${formatCompactFCFA(state2026Amount ?? 0)} (État)` : `État non consolidé (${detailed?.investments.unknownAmountState2026ProjectsCount ?? 0} montant(s) inconnu(s))`} et {hasCompleteLocalCsv2026Amounts ? `${formatCompactFCFA(localCsv2026Amount ?? 0)} (communes et régions)` : `communes et régions non consolidé (${detailed?.investments.unknownAmountLocalCsv2026ProjectsCount ?? 0} montant(s) inconnu(s))`}.
                {(bouakeCount > 0 || (multiYearCount > 0 && hasCompletePre2026Amounts && multiYearAmount != null && multiYearAmount > 0)) && ' Non comptés :'}
                {bouakeCount > 0 && (hasCompleteBouake2026Amounts && bouakeAmount != null ? ` Bouaké (${formatCompactFCFA(bouakeAmount)})` : ` Bouaké (non consolidé : ${detailed?.investments.unknownAmountLocalPortalBouake2026ProjectsCount ?? 0} montant(s) inconnu(s))`)}
                {hasCompletePre2026Amounts && multiYearCount > 0 && multiYearAmount != null && multiYearAmount > 0 && `${bouakeCount > 0 ? ' et' : ''} marché de 2021 (${formatCompactFCFA(multiYearAmount)})`}
                {!hasCompletePre2026Amounts && multiYearCount > 0 && `, montants antérieurs non consolidés : ${detailed?.investments.unknownAmountPre2026ProjectsCount ?? 0} opération(s) sans montant connu`}
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
                ? `${verifiedCount.toLocaleString('fr-FR')} observation${verifiedCount > 1 ? 's' : ''} citoyenne${verifiedCount > 1 ? 's' : ''} modérée${verifiedCount > 1 ? 's' : ''} et publiée${verifiedCount > 1 ? 's' : ''}`
                : pendingProofsCount > 0
                  ? `${pendingProofsCount} observation(s) en attente de modération`
                  : 'Collecte citoyenne ouverte — aucun constat publié'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              {verifiedCount} modéré{verifiedCount > 1 ? 's' : ''} (APPROVED), 0 vérification indépendante certifiée, {pendingProofsCount} en attente
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
