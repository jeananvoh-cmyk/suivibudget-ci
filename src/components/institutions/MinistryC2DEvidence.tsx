import React from 'react';
import c2d from '../../../docs/references/2026/ministry-reconciliation/PR31_C2D_2026_DISCREPANCY_PROVENANCE.json';
import registry from '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json';
import { formatAmountInWords, formatFCFA } from '../../utils/formatters';

const LFI = 'https://www.dgbf.ci/wp-content/uploads/2025/12/Loi-de-Finances-2026.pdf';

type Props = { institutionId: string };

/** An official C2D financing category, not additional credits to add to a published total. */
export const MinistryC2DEvidence: React.FC<Props> = ({ institutionId }) => {
  const portfolio = registry.institutions.find(i => i.institution_id === institutionId);
  const section = c2d.sections.find(i => i.section_code === portfolio?.dgbf_code);
  if (!section) return null;

  const legacy = c2d.historical_discrepancy_audit.find(i => i.portfolio_id === institutionId);
  const shared = institutionId === 'gov-035';

  return (
    <section aria-label="Financements C2D officiels 2026" className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
      <h4 className="font-black text-sm text-slate-900">Projets financés sur C2D — section {section.section_code}</h4>
      {shared ? (
        <p className="text-xs text-amber-800">La section 229 est partagée avec le portefeuille Agriculture.
          Aucun financement C2D autonome du ministre délégué n'est établi : il ne faut pas compter ce montant une seconde fois.</p>
      ) : (
        <>
          <div className="font-black text-lg text-slate-900">{formatFCFA(section.c2d_cp_2026_fcfa)}</div>
          <p className="text-xs text-slate-600">{formatAmountInWords(section.c2d_cp_2026_fcfa)}</p>
          <p className="text-xs text-slate-600">
            CP 2026 de la catégorie C2D figurant dans un tableau distinct de la LFI.
            Ce chiffre n'est ni une dépense exécutée, ni une dotation autonome supplémentaire
            attribuable sans preuve au portefeuille gouvernemental.
          </p>
        </>
      )}
      <a className="text-xs underline text-brand-blue" href={`${LFI}#page=${section.lfi_pdf_page}`}
        target="_blank" rel="noopener noreferrer">LFI 2026 — tableau C2D, page PDF {section.lfi_pdf_page}</a>
      {legacy?.classification === 'EXACTLY_EXPLAINED_BY_C2D' && (
        <p className="text-xs text-slate-700" role="note">
          Explication de l'ancien écart : son montant correspond exactement au CP des projets C2D
          de cette section. Cette égalité explique la différence numérique, sans certifier
          l'ancienne valeur comme budget propre du ministère.
        </p>
      )}
      {legacy?.classification === 'C2D_CLOSE_WITH_RESIDUAL_UNEXPLAINED' && (
        <p className="text-xs text-amber-800" role="note">
          Une partie de l'ancien écart correspond au C2D. Différence résiduelle historique :
          {' '}{formatFCFA(Math.abs(legacy.discrepancy_minus_c2d_fcfa!))}
          {' '}({legacy.discrepancy_minus_c2d_fcfa! < 0 ? 'ancienne valeur inférieure au rapprochement CP + C2D' : 'ancienne valeur supérieure au rapprochement CP + C2D'}).
          Ce reliquat reste non justifié et ne doit pas être publié comme crédit certifié.
        </p>
      )}
      <p className="text-xs text-slate-500">Le total national C2D de la LFI 2026 est de 74,4 milliards FCFA,
        répartis sur 14 sections. Ces crédits ne doivent pas être additionnés à un autre total
        qui les inclurait déjà.</p>
    </section>
  );
};
