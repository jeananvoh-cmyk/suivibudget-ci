import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Flame,
  Pickaxe,
  Briefcase,
  Landmark,
  ExternalLink,
  Info,
  CheckCircle2,
  FolderGit2,
  Sparkles,
} from 'lucide-react';
import { Institution, BudgetProject } from '../../types';
import {
  MinistryBudget,
  BudgetProgram,
  BudgetAction,
} from '../../types/ministryBudget';
import {
  getMinistryBudget,
  isPilotMinistry,
  MMPE_MINISTRY_BUDGET_2026,
} from '../../data/ministryPilotReferential';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { ProvenanceLink } from '../common/ProvenanceLink';

interface MinistryBudgetProgramViewProps {
  institution: Institution;
  relatedProjects?: BudgetProject[];
  onSelectProject?: (project: BudgetProject) => void;
}

export const MinistryBudgetProgramView: React.FC<MinistryBudgetProgramViewProps> = ({
  institution,
  relatedProjects = [],
  onSelectProject,
}) => {
  const isPilot = isPilotMinistry(institution.id);
  const pilotBudget: MinistryBudget | null = isPilot ? MMPE_MINISTRY_BUDGET_2026 : null;

  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(
    isPilot ? 'prog-mmpe-02' : null // Programme Énergie ouvert par défaut (le plus emblématique)
  );

  const getProgramIcon = (code: string) => {
    switch (code) {
      case 'P1':
        return Briefcase;
      case 'P2':
        return Zap;
      case 'P3':
        return Flame;
      case 'P4':
        return Pickaxe;
      case 'CAS':
      default:
        return Landmark;
    }
  };

  const getProgramColor = (code: string) => {
    switch (code) {
      case 'P1':
        return {
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          text: 'text-indigo-900',
          bar: 'bg-indigo-500',
          iconBg: 'bg-indigo-100 text-indigo-700',
        };
      case 'P2':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-900',
          bar: 'bg-amber-500',
          iconBg: 'bg-amber-100 text-amber-700',
        };
      case 'P3':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-900',
          bar: 'bg-rose-500',
          iconBg: 'bg-rose-100 text-rose-700',
        };
      case 'P4':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-900',
          bar: 'bg-emerald-500',
          iconBg: 'bg-emerald-100 text-emerald-700',
        };
      case 'CAS':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-900',
          bar: 'bg-brand-blue',
          iconBg: 'bg-blue-100 text-brand-blue',
        };
    }
  };

  // =========================================================================
  // CAS 1 : MINISTÈRE NON PILOTÉ (Transition vers le mode budget-programmes)
  // =========================================================================
  if (!isPilot || !pilotBudget) {
    const totalBudget = institution.total_budget_fcfa;

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Budget de l'État • Exercice 2026
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Loi de Finances Initiale
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">
              Dotation Budgétaire Ministérielle
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
              {formatFCFA(totalBudget)}
            </div>
            {totalBudget != null && (
              <div className="text-xs text-slate-600 font-medium mt-1">
                {formatAmountInWords(totalBudget)}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-sky-50/70 rounded-2xl border border-sky-200 text-xs text-sky-950 space-y-2 leading-relaxed">
          <div className="font-bold flex items-center gap-1.5 text-sky-900">
            <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span>Nomenclature Budgétaire de l'État (Budget-Programmes)</span>
          </div>
          <p>
            La gestion financière des ministères de la République de Côte d'Ivoire s'opère selon la nomenclature en 
            <strong> budget-programmes</strong> (Programmes, Actions, Activités et Crédits).
          </p>
          <p className="text-[11px] text-sky-800">
            La modélisation détaillée multi-niveaux est en cours de déploiement progressif, initiée sur le 
            <strong> Ministère des Mines, du Pétrole et de l'Énergie</strong> comme ministère pilote de référence.
          </p>
        </div>

        {relatedProjects.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4 text-brand-blue" />
                <span>Projets d'Investissements Publics Inscrits ({relatedProjects.length})</span>
              </h4>
            </div>
            <div className="space-y-2">
              {relatedProjects.slice(0, 5).map(proj => (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject?.(proj)}
                  className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{proj.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{formatFCFA(proj.budget_amount_fcfa)}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 flex-shrink-0">
                    {proj.current_status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // CAS 2 : MINISTÈRE PILOTE (MINES, PÉTROLE ET ÉNERGIE — LOT 2 COMPLET)
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. EN-TÊTE BUDGÉTAIRE OFFICIEL */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-brand-blue text-white rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[11px] font-bold text-emerald-300 border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nomenclature Officielle Budget-Programmes • DGBF</span>
          </div>
          <span className="text-xs font-semibold text-slate-300">
            Exercice Budgétaire 2026
          </span>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Crédits Budgétaires Ouverts (Loi de Finances 2026)
          </div>
          <div className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-white mt-1">
            {formatFCFA(pilotBudget.total_budget_fcfa)}
          </div>
          <div className="text-xs sm:text-sm text-slate-200 font-medium mt-1 leading-snug">
            {formatAmountInWords(pilotBudget.total_budget_fcfa)}
          </div>
        </div>

        {/* PROVENANCE OFFICIELLE VÉRIFIABLE */}
        <ProvenanceLink
          source={pilotBudget.source}
          sourceUrl={pilotBudget.source_url}
          documentReference={pilotBudget.document_reference}
          pageReference={pilotBudget.page_reference}
          evidenceType={pilotBudget.evidence_type}
          fiscalYear={pilotBudget.fiscal_year}
          className="bg-white/10 border-white/15 text-white"
        />
      </div>

      {/* 2. RÉPARTITION DES PROGRAMMES BUDGÉTAIRES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-blue" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Programmes Budgétaires de l'Action Publique ({pilotBudget.programs.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Cliquez sur un programme pour explorer ses actions et projets
          </span>
        </div>

        {/* JAUGE DE VENTILATION MULTI-PROGRAMMES */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 p-0.5 gap-0.5">
            {pilotBudget.programs.map(prog => {
              const color = getProgramColor(prog.code);
              return (
                <div
                  key={prog.id}
                  style={{ width: `${Math.max(prog.percentage_of_ministry ?? 1, 1.5)}%` }}
                  className={`h-full rounded-full ${color.bar} transition-all duration-300`}
                  title={`${prog.name} : ${prog.percentage_of_ministry}%`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[11px]">
            {pilotBudget.programs.map(prog => {
              const color = getProgramColor(prog.code);
              return (
                <div
                  key={prog.id}
                  onClick={() => setExpandedProgramId(expandedProgramId === prog.id ? null : prog.id)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    expandedProgramId === prog.id
                      ? `${color.bg} ${color.border} shadow-2xs`
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${color.bar} flex-shrink-0`} />
                    <span className="font-bold text-slate-900 truncate">{prog.code}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{prog.name}</div>
                  <div className="font-black text-slate-900 mt-1 font-mono text-[10px]">
                    {prog.percentage_of_ministry}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACCORDÉON DES PROGRAMMES & ACTIONS */}
        <div className="space-y-3 pt-1">
          {pilotBudget.programs.map(prog => {
            const isExpanded = expandedProgramId === prog.id;
            const color = getProgramColor(prog.code);
            const Icon = getProgramIcon(prog.code);

            return (
              <div
                key={prog.id}
                className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                  isExpanded ? `${color.border} ring-1 ring-brand-blue/20` : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* En-tête de programme */}
                <div
                  onClick={() => setExpandedProgramId(isExpanded ? null : prog.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${color.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {prog.code}
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                          {prog.name}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {prog.description}
                      </p>
                      {prog.responsible_title && (
                        <div className="text-[11px] text-slate-600 font-medium mt-1">
                          <strong className="text-slate-700">Responsable opérationnel :</strong> {prog.responsible_title}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div>
                      <div className="text-sm sm:text-base font-black text-slate-900 font-mono">
                        {formatFCFA(prog.amount_fcfa)}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500">
                        {prog.percentage_of_ministry}% du budget
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Détail déroulant des Actions */}
                {isExpanded && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-slate-100 space-y-3 bg-slate-50/40">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1">
                      <span>Actions Opérationnelles rattachées ({prog.actions.length})</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Nomenclature DGBF • Programmation budgétaire
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {prog.actions.map(action => (
                        <div
                          key={action.id}
                          className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {action.code}
                                </span>
                                <span className="text-xs font-bold text-slate-900 leading-snug">
                                  {action.name}
                                </span>
                              </div>
                              {action.description && (
                                <p className="text-[11px] text-slate-500 mt-1 pl-0.5">
                                  {action.description}
                                </p>
                              )}
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-black font-mono text-slate-900">
                                {formatFCFA(action.amount_fcfa)}
                              </span>
                            </div>
                          </div>

                          {/* PROJETS D'INVESTISSEMENTS PUBLICS RATTACHÉS (AUCUN DOUBLE COMPTAGE) */}
                          {action.linked_projects && action.linked_projects.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold text-brand-blue">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                                  <span>{action.linked_projects.length} projet(s) d'investissements publics financés</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-normal italic">
                                  Financés au sein de ces crédits (aucun double comptage)
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {action.linked_projects.map(proj => (
                                  <div
                                    key={proj.id}
                                    className="p-2.5 bg-blue-50/40 rounded-lg border border-blue-100 hover:border-brand-blue/40 transition-colors text-xs space-y-1"
                                  >
                                    <div className="font-bold text-slate-900 text-[11px] leading-snug line-clamp-2">
                                      {proj.title}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-black font-mono text-brand-blue">
                                        {formatFCFA(proj.budget_amount_fcfa)}
                                      </span>
                                      <span className="text-slate-500">
                                        {proj.region_name || 'National'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
