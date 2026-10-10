import React from 'react';
import legalCP from '../../../docs/references/2026/ministry-reconciliation/LFI_ARTICLES_14_15_LEGAL_VOTED_CP_35.json';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';

const PropsNote = ({ institutionId }: { institutionId: string }) => {
  const record = legalCP.rows.find(item => item.portfolio_id === institutionId);
  if (!record) return null;
  const isShared = record.section_shared_with_other_portfolio && institutionId === 'gov-035';
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-1.5"
      aria-label="Fondement légal des crédits votés en 2026">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
        Base légale des crédits votés — LFI 2026, article {record.legal_article}
      </h4>
      <p className="text-xs text-slate-700">
        {isShared
          ? 'Ce portefeuille délégué partage la section 229 votée au profit de l’Agriculture : aucun deuxième crédit autonome n’est établi.'
          : `CP initial voté pour la section budgétaire ${record.section_code} :`}
      </p>
      {!isShared && (
        <>
          <p className="font-bold text-slate-900">{formatFCFA(record.voted_section_cp_2026_fcfa)}</p>
          <p className="text-[11px] text-slate-600">{formatAmountInWords(record.voted_section_cp_2026_fcfa)}</p>
        </>
      )}
      <a href={`${legalCP.source_pdf_url}#page=${record.official_lfi_pdf_page}`}
        target="_blank" rel="noopener noreferrer" className="underline text-xs text-brand-blue">
        Loi de finances 2026 — article {record.legal_article}, PDF p. {record.official_lfi_pdf_page}
      </a>
      <p className="text-[11px] text-slate-600">
        Le vote légal concerne la section dans le périmètre initial de la LFI.
        Il ne prouve pas automatiquement le transfert ou le partage de ce crédit
        entre les portefeuilles du Gouvernement remanié en janvier 2026.
        Ne pas additionner à un total qui comprend déjà les mêmes crédits.
      </p>
    </section>
  );
};

export const MinistryLegalCPNotice = PropsNote;
