import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  Flame,
  Pickaxe,
  Briefcase,
  Landmark,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { BudgetProgram, MinistryLinkedProject } from '../../types/ministryBudget';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { ProvenanceLink } from '../common/ProvenanceLink';
import { BudgetActionList } from './BudgetActionList';

interface BudgetProgramCardProps {
  program: BudgetProgram;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectProject?: (project: MinistryLinkedProject) => void;
}

const getProgramIcon = (code: string) => {
  switch (code) {
    case '21106':
      return Briefcase;
    case '22036':
      return Flame;
    case '22037':
      return Zap;
    case '22107':
      return Pickaxe;
    case '23230':
      return Zap;
    case '23231':
    case '23233':
    case '23234':
      return Flame;
    case '23232':
      return Pickaxe;
    case '23251':
      return Building2;
    default:
      return Landmark;
  }
};

const getProgramTheme = (code: string) => {
  switch (code) {
    case '21106':
      return {
        bg: 'bg-indigo-50/60',
        border: 'border-indigo-200',
        badgeBg: 'bg-indigo-100 text-indigo-800',
        iconBg: 'bg-indigo-100 text-indigo-700',
      };
    case '22036':
      return {
        bg: 'bg-rose-50/60',
        border: 'border-rose-200',
        badgeBg: 'bg-rose-100 text-rose-800',
        iconBg: 'bg-rose-100 text-rose-700',
      };
    case '22037':
      return {
        bg: 'bg-amber-50/60',
        border: 'border-amber-200',
        badgeBg: 'bg-amber-100 text-amber-800',
        iconBg: 'bg-amber-100 text-amber-700',
      };
    case '22107':
      return { bg: 'bg-emerald-50/60', border: 'border-emerald-200', badgeBg: 'bg-emerald-100 text-emerald-800', iconBg: 'bg-emerald-100 text-emerald-700' };
    case '23230':
    case '23251':
      return { bg: 'bg-sky-50/60', border: 'border-sky-200', badgeBg: 'bg-sky-100 text-sky-800', iconBg: 'bg-sky-100 text-sky-700' };
    case '23231':
    case '23233':
    case '23234':
      return { bg: 'bg-orange-50/60', border: 'border-orange-200', badgeBg: 'bg-orange-100 text-orange-800', iconBg: 'bg-orange-100 text-orange-700' };
    default:
      return { bg: 'bg-blue-50/60', border: 'border-blue-200', badgeBg: 'bg-blue-100 text-blue-800', iconBg: 'bg-blue-100 text-brand-blue' };
  }
};

export const BudgetProgramCard: React.FC<BudgetProgramCardProps> = ({
  program,
  isExpanded,
  onToggle,
  onSelectProject,
}) => {
  const Icon = getProgramIcon(program.official_code || program.code);
  const theme = getProgramTheme(program.official_code || program.code);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all ${
        isExpanded ? `${theme.border} shadow-sm ring-1 ring-slate-200` : 'border-slate-200 shadow-2xs hover:border-slate-300'
      }`}
    >
      <div
        onClick={onToggle}
        className="p-4 sm:p-5 cursor-pointer flex items-start sm:items-center justify-between gap-3.5 select-none"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div className={`p-2.5 rounded-xl ${theme.iconBg} flex-shrink-0 mt-0.5 sm:mt-0`}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                Programme {program.official_code || program.code}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${theme.badgeBg}`}>
                {program.percentage_of_ministry}% du ministère
              </span>
              {program.page_reference && (
                <ProvenanceLink
                  source="Source officielle DGBF"
                  sourceUrl={program.source_url}
                  pageReference={program.page_reference}
                  citation
                />
              )}
            </div>

            <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {program.name}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-sm sm:text-base font-black font-mono text-slate-900">
              {formatFCFA(program.amount_fcfa)}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {formatAmountInWords(program.amount_fcfa)}
            </div>
          </div>

          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Montant visible sur mobile uniquement */}
      <div className="px-4 pb-3 sm:hidden border-t border-slate-100 pt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">Crédit voté :</span>
        <span className="text-xs font-black font-mono text-slate-900">
          {formatFCFA(program.amount_fcfa)}
        </span>
      </div>

      {/* Contenu déroulé : description et actions */}
      {isExpanded && (
        <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
          {program.description && (
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              {program.description}
            </p>
          )}

          {program.responsible_title && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Responsable officiel : <strong className="text-slate-700">{program.responsible_title}</strong></span>
            </div>
          )}

          <BudgetActionList
            actions={program.actions}
            onSelectProject={onSelectProject}
          />
        </div>
      )}
    </div>
  );
};
