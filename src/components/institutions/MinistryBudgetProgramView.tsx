import React, { useState } from 'react';
import { Layers, Info, FolderGit2 } from 'lucide-react';
import { Institution, BudgetProject } from '../../types';
import {
  MinistryBudget,
  MinistryLinkedProject,
} from '../../types/ministryBudget';
import {
  getMinistryBudget,
  isPilotMinistry,
  MMPE_MINISTRY_BUDGET_2026,
} from '../../data/ministryPilotReferential';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { MinistryBudgetHeader } from './MinistryBudgetHeader';
import { ProgramDistribution } from './ProgramDistribution';
import { BudgetProgramCard } from './BudgetProgramCard';

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

  // Par défaut, le Programme Énergie (22037) est ouvert (le plus important en volume)
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(
    isPilot ? 'prog-22037' : null
  );

  const toggleProgram = (programId: string) => {
    setExpandedProgramId(prev => (prev === programId ? null : programId));
  };

  // Convertit un projet rattaché pour l'interface de navigation si cliqué
  const handleSelectLinkedProject = (linkedProj: MinistryLinkedProject) => {
    const matched = relatedProjects.find(p => p.id === linkedProj.id);
    if (matched && onSelectProject) {
      onSelectProject(matched);
    }
  };

  // =========================================================================
  // CAS 1 : MINISTÈRE EN TRANSITION (NON ENCORE MODÉLISÉ EN 10 PROGRAMMES)
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
            La gestion financière des départements ministériels s'exécute selon la nomenclature officielle DGBF en 
            <strong> budget-programmes</strong> (Programmes, Actions, Activités et Crédits).
          </p>
          <p className="text-[11px] text-sky-800">
            La modélisation détaillée multi-niveaux est en cours de déploiement progressif, initiée sur le 
            <strong> Ministère des Mines, du Pétrole et de l'Énergie</strong> (10 programmes officiels).
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
  // CAS 2 : MINISTÈRE PILOTE (10 PROGRAMMES OFFICIELS DGBF)
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. En-tête budgétaire officiel */}
      <MinistryBudgetHeader budget={pilotBudget} />

      {/* 2. Jauge proportionnelle des 10 programmes */}
      <ProgramDistribution
        programs={pilotBudget.programs}
        activeProgramId={expandedProgramId}
        onSelectProgram={(id) => setExpandedProgramId(id)}
      />

      {/* 3. Liste des 10 programmes budgétaires officiels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-blue" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              10 Programmes Budgétaires de l'Action Publique
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Cliquez sur un programme pour explorer ses actions et crédits
          </span>
        </div>

        <div className="space-y-3">
          {pilotBudget.programs.map((prog) => (
            <BudgetProgramCard
              key={prog.id}
              program={prog}
              isExpanded={expandedProgramId === prog.id}
              onToggle={() => toggleProgram(prog.id)}
              onSelectProject={handleSelectLinkedProject}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
