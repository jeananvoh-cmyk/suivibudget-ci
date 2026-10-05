import React from 'react';
import { Layers } from 'lucide-react';
import { BudgetProgram } from '../../types/ministryBudget';

interface ProgramDistributionProps {
  programs: BudgetProgram[];
  activeProgramId: string | null;
  onSelectProgram: (programId: string) => void;
}

const PROGRAM_BAR_COLORS = [
  'bg-indigo-500',  // 21106
  'bg-rose-500',    // 22036
  'bg-amber-500',   // 22037
  'bg-emerald-500', // 22107
  'bg-sky-500',     // 23230
  'bg-blue-600',    // 23231
  'bg-teal-500',    // 23232
  'bg-orange-500',  // 23233
  'bg-cyan-500',    // 23234
  'bg-violet-500',  // 23251
];

export const ProgramDistribution: React.FC<ProgramDistributionProps> = ({
  programs,
  activeProgramId,
  onSelectProgram,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-blue" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Ventilation des 10 Programmes Budgétaires DGBF
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Cliquez sur un segment pour afficher le programme
        </span>
      </div>

      {/* Jauge proportionnelle */}
      <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-slate-100 p-0.5 gap-0.5">
        {programs.map((prog, idx) => {
          const color = PROGRAM_BAR_COLORS[idx % PROGRAM_BAR_COLORS.length];
          const isSelected = activeProgramId === prog.id;
          return (
            <button
              key={prog.id}
              type="button"
              onClick={() => onSelectProgram(prog.id)}
              style={{ width: `${Math.max(prog.percentage_of_ministry ?? 1, 1.2)}%` }}
              className={`h-full rounded-full ${color} transition-all cursor-pointer ${
                isSelected ? 'ring-2 ring-slate-900 ring-offset-1 scale-y-110' : 'opacity-90 hover:opacity-100'
              }`}
              title={`Programme ${prog.official_code || prog.code} — ${prog.name} : ${prog.percentage_of_ministry}%`}
            />
          );
        })}
      </div>

      {/* Raccourcis rapides avec code DGBF */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
        {programs.map((prog, idx) => {
          const isSelected = activeProgramId === prog.id;
          return (
            <button
              key={prog.id}
              type="button"
              onClick={() => onSelectProgram(prog.id)}
              className={`px-2 py-1 rounded-lg font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{prog.official_code || prog.code}</span>
              <span className="ml-1 opacity-70">({prog.percentage_of_ministry}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
