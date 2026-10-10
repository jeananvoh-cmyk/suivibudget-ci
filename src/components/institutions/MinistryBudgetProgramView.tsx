import React, { useState } from 'react';
import { Layers, Info, FolderGit2 } from 'lucide-react';
import { Institution, BudgetProject } from '../../types';
import {
  MinistryBudget,
  MinistryLinkedProject,
} from '../../types/ministryBudget';
import {
  isPilotMinistry,
  MMPE_MINISTRY_BUDGET_2026,
} from '../../data/ministryPilotReferential';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { MinistryBudgetHeader } from './MinistryBudgetHeader';
import { ProgramDistribution } from './ProgramDistribution';
import { BudgetProgramCard } from './BudgetProgramCard';
import { SCOPE_EXCEPTIONS } from '../../data/ministryScopeExceptions';
import legalCP from '../../../docs/references/2026/ministry-reconciliation/LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json';
import { MinistrySectionEvidencePanel } from './MinistrySectionEvidencePanel';
import { MinistryAttributionsNotice } from './MinistryAttributionsNotice';
import { MinistryLegalCPNotice } from './MinistryLegalCPNotice';
import { MinistryC2DEvidence } from './MinistryC2DEvidence';

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
    pilotBudget?.programs.find(program => program.official_code === '22037')?.id ?? null
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
    const votedSection = legalCP.rows.find(r => r.portfolio_id === institution.id);

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <MinistryAttributionsNotice institutionId={institution.id} />
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Loi de finances initiale • 2026
            </span>
            <span className="text-xs font-semibold text-slate-500">Crédits de paiement (CP) votés</span>
          </div>
          {votedSection ? (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">
                Section budgétaire {votedSection.section_code} — crédits officiellement votés
              </h3>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight break-words">
                {formatFCFA(votedSection.voted_section_cp_2026_fcfa)}
              </p>
              <p className="text-xs text-slate-600">{formatAmountInWords(votedSection.voted_section_cp_2026_fcfa)}</p>
              <a
                href={`${legalCP.source_pdf_url}#page=${votedSection.official_lfi_pdf_page}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs underline text-brand-blue"
              >
                LFI 2026 — article {votedSection.legal_article}, page PDF {votedSection.official_lfi_pdf_page}
              </a>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3" role="note">
                {votedSection.section_shared_with_other_portfolio
                  ? 'Section commune à plusieurs portefeuilles : montant affiché à titre de référence, jamais additionné plusieurs fois.'
                  : 'Crédit légal de la section de la LFI initiale, non une preuve de répartition autonome au portefeuille remanié en janvier 2026.'}
                {' '}La ventilation fonctionnement/investissement n'est pas déduite sans source distincte.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Aucune section budgétaire 2026 identifiable dans les pièces disponibles.</p>
          )}
        </div>

        {SCOPE_EXCEPTIONS[institution.id] && (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-3" role="note">
            <strong>Attention au périmètre :</strong> {SCOPE_EXCEPTIONS[institution.id]}
          </p>
        )}

        <MinistrySectionEvidencePanel institutionId={institution.id} />
        <MinistryC2DEvidence institutionId={institution.id} />

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
      <MinistryAttributionsNotice institutionId={institution.id} />
        <MinistryLegalCPNotice institutionId={institution.id} />
      <MinistryC2DEvidence institutionId={institution.id} />
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
