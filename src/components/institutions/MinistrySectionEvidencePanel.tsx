import React from 'react';
import sectionEvidence from '../../../docs/references/2026/ministry-reconciliation/SECTION_PROGRAM_CROSSCHECK_22_2026.json';
import actionEvidence from '../../../docs/references/2026/ministry-reconciliation/ANNEX4_ACTION_SUM_CROSSCHECK_2026.json';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';

const ANNEX4_URL = 'https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-4-DPPD-PAP-2026-2028.pdf';
const LFI_URL = 'https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf';

interface Props {
  institutionId: string;
}

/**
 * Documentary section evidence only. It must never be summed into a
 * ministry's own credits or represented as execution expenditure.
 */
export const MinistrySectionEvidencePanel: React.FC<Props> = ({ institutionId }) => {
  const section = sectionEvidence.sections.find(s => s.portfolio_ids.includes(institutionId));
  if (!section) return null;

  const sectionShared = section.portfolio_ids.length > 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3" aria-label="Preuves budgétaires officielles de section">
      <div className="space-y-1">
        <h4 className="text-sm font-black text-slate-900">Crédits officiels de la section {section.section_code} — LFI 2026</h4>
        <p className="text-xs text-slate-600">
          Crédits de paiement (CP) votés pour la section budgétaire, et non dotation autonome
          certifiée du portefeuille gouvernemental actuel.
          {sectionShared ? ' Cette section est partagée entre plusieurs fiches : ne jamais la comptabiliser plusieurs fois.' : ''}
        </p>
        <p className="font-bold text-lg text-slate-900">{formatFCFA(section.section_cp_2026_fcfa)}</p>
        <p className="text-xs text-slate-600">{formatAmountInWords(section.section_cp_2026_fcfa)}</p>
        <a href={`${LFI_URL}#page=${section.lfi_2026_pdf_page}`} target="_blank" rel="noopener noreferrer"
          className="text-xs underline text-brand-blue">
          Source : Loi de finances 2026, page PDF {section.lfi_2026_pdf_page}
        </a>
      </div>
      <div className="space-y-2 border-t border-slate-200 pt-3">
        <h5 className="text-xs font-black uppercase text-slate-700">Programmes de la section ({section.programs.length})</h5>
        {section.programs.map(program => {
          const actions = actionEvidence.programs.find(a =>
            a.section_code === section.section_code && a.program_code === program.official_code,
          );
          return (
            <div key={program.official_code} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <span className="text-xs font-bold text-slate-800">Programme DGBF {program.official_code}</span>
                <span className="text-xs font-bold text-slate-900">{formatFCFA(program.cp_2026_fcfa)}</span>
              </div>
              <p className="text-[11px] text-slate-600">{formatAmountInWords(program.cp_2026_fcfa)}</p>
              <div className="flex flex-wrap justify-between gap-2 text-[11px]">
                <span className="text-slate-600">
                  {actions?.actions_count
                    ? `${actions.actions_count} action(s) réconciliée(s) — total CP exact`
                    : 'Détail des actions non établi'}
                </span>
                <a href={`${ANNEX4_URL}#page=${program.annex4_pdf_page}`} target="_blank"
                  rel="noopener noreferrer" className="underline text-brand-blue">
                  Annexe 4 — PDF p. {program.annex4_pdf_page}
                </a>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-600" role="note">
        Vérification documentaire des sommes et sources, sans preuve d'exécution ni attribution
        administrative définitive du budget au portefeuille. Les crédits de la section et ceux
        de ses programmes décrivent le même budget : ne pas les additionner.
      </p>
    </section>
  );
};
