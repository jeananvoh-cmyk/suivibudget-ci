import React from 'react';
import sectionEvidence from '../../../docs/references/2026/ministry-reconciliation/SECTION_PROGRAM_CROSSCHECK_22_2026.json';
import actionEvidence from '../../../docs/references/2026/ministry-reconciliation/ANNEX4_ACTION_SUM_CROSSCHECK_2026.json';
import complementaryActions from '../../../docs/references/2026/ministry-reconciliation/LFI_2026_ACTION_COMPLEMENTS_4_PROGRAMMES.json';
import officialProgramNames from '../../data/ministryOfficialProgramLabels2026.json';
import lfiArticle15Programs from '../../data/ministryLfiArticle15Programs2026.json';
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
  const article15 = lfiArticle15Programs.records.find(s => s.portfolio_ids.includes(institutionId));
  if (!section && !article15) return null;

  // Douze sections non détaillées dans l'ancien rapprochement Annexe 4
  // disposent cependant de programmes chiffrés et nommés dans l'article 15.
  // Ils sont publiés avec leur propre périmètre légal, sans simuler de codes DGBF.
  if (!section && article15) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
        aria-label="Programmes officiels de la loi de finances 2026">
        <h4 className="text-sm font-black text-slate-900">
          Programmes budgétaires de la section {article15.section_code} — LFI 2026
        </h4>
        <p className="text-xs text-slate-700">
          Programmes et crédits de paiement votés, extraits de l'article 15 de la loi de finances
          initiale. Ils composent le total de la section ; ne pas les additionner une seconde fois
          ni les assimiler aux crédits propres du portefeuille remanié.
        </p>
        <p className="font-black text-lg text-slate-900">{formatFCFA(article15.section_cp_2026_fcfa)}</p>
        <p className="text-xs text-slate-600">{formatAmountInWords(article15.section_cp_2026_fcfa)}</p>
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {article15.programmes.map(programme => (
            <div key={programme.number}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 p-3 text-xs">
              <div className="font-semibold text-slate-800">
                Programme {programme.number} — {programme.name}
              </div>
              <div className="sm:text-right shrink-0">
                <p className="font-black text-slate-900">{formatFCFA(programme.cp_2026_fcfa)}</p>
                <p className="text-[10px] text-slate-600">{formatAmountInWords(programme.cp_2026_fcfa)}</p>
              </div>
            </div>
          ))}
        </div>
        <a href={`${LFI_URL}#page=${article15.lfi_pdf_page}`} target="_blank" rel="noopener noreferrer"
          className="text-xs underline text-brand-blue">
          Vérifier les {article15.programmes.length} programmes dans la LFI 2026 — PDF p. {article15.lfi_pdf_page}
        </a>
        <p className="text-[11px] text-slate-600" role="note">
          Les numéros « Programme 1 », « Programme 2 », etc. sont ceux de l'article 15,
          pas des codes de programmes DGBF. Ventilation par actions non revendiquée.
        </p>
      </section>
    );
  }

  if (!section) return null;

  const sectionShared = section.portfolio_ids.length > 1;
  const programmeNames: Record<string, string> = officialProgramNames.names;

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
          const supplement = complementaryActions.records.find(r =>
            r.section_code === section.section_code && r.program_code === program.official_code,
          );
          return (
            <div key={program.official_code} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <span className="text-xs font-bold text-slate-800">{programmeNames[program.official_code]} (DGBF {program.official_code})</span>
                <span className="text-xs font-bold text-slate-900">{formatFCFA(program.cp_2026_fcfa)}</span>
              </div>
              <p className="text-[11px] text-slate-600">{formatAmountInWords(program.cp_2026_fcfa)}</p>
              <div className="flex flex-wrap justify-between gap-2 text-[11px]">
                <span className="text-slate-600">
                  {actions?.actions_count
                    ? `${actions.actions_count} action(s) réconciliée(s) — total CP exact`
                    : supplement
                      ? `${supplement.actions.length} action(s) réconciliée(s) depuis la LFI — somme CP exacte`
                      : 'Détail des actions non établi'}
                </span>
                <a href={`${ANNEX4_URL}#page=${program.annex4_pdf_page}`} target="_blank"
                  rel="noopener noreferrer" className="underline text-brand-blue">
                  Annexe 4 — PDF p. {program.annex4_pdf_page}
                </a>
              </div>
              {supplement && (
                <div className="text-[11px] border-t border-slate-200 pt-2 space-y-1">
                  {supplement.actions.map(action => (
                    <div key={action.code} className="flex flex-wrap justify-between gap-2">
                      <span>{action.code} — {action.name}</span>
                      <span className="font-semibold">{formatFCFA(action.cp_fcfa)} ·{' '}
                        <a href={`${LFI_URL}#page=${action.lfi_pdf_page}`} className="underline text-brand-blue"
                          target="_blank" rel="noopener noreferrer">LFI p. {action.lfi_pdf_page}</a>
                      </span>
                    </div>
                  ))}
                  <p className="text-slate-600">L’Annexe 4 ne donne pas le détail de ces actions sous ce code ;
                    la Loi de finances fournit une ventilation financière directement vérifiable.</p>
                </div>
              )}
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
