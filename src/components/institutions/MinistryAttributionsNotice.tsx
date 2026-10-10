import React from 'react';
import administrativeEvidence from '../../../docs/references/2026/ministry-reconciliation/DECREE_2026_84_ADMINISTRATIVE_MAPPING_35.json';

interface Props {
  institutionId: string;
}

export const MinistryAttributionsNotice: React.FC<Props> = ({ institutionId }) => {
  const record = administrativeEvidence.entries.find(item => item.id === institutionId);
  if (!record) return null;

  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1" aria-label="Rattachement administratif officiel">
      <p className="font-semibold text-slate-900">Rattachement administratif documenté</p>
      <p>Les structures sous tutelle ou rattachées au portefeuille figurent dans l'annexe officielle
        au décret n° 2026-84 du 4 mars 2026.</p>
      <a className="underline text-brand-blue"
        href={`${administrativeEvidence.annex_official_pdf}#page=${record.pdf_page}`}
        target="_blank" rel="noopener noreferrer">
        Annexe officielle — page PDF {record.pdf_page}
      </a>
      <p className="text-slate-600">
        Ce texte identifie des attributions administratives, mais ne constitue pas un acte de
        transfert ou de répartition des crédits de paiement 2026.
      </p>
    </aside>
  );
};
