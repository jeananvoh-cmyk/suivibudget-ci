import React from 'react';

type Scope = 'MINISTERE' | 'INSTITUTION' | 'COMMUNE' | 'CONSEIL_REGIONAL';

const SCOPE_INFO: Record<Scope, { total: number; documented: number; label: string }> = {
  MINISTERE: { total: 35, documented: 35, label: 'sections LFI liées aux portefeuilles' },
  INSTITUTION: { total: 14, documented: 13, label: 'lignes institutionnelles LFI' },
  COMMUNE: { total: 201, documented: 30, label: 'budgets primitifs locaux cités' },
  CONSEIL_REGIONAL: { total: 31, documented: 16, label: 'budgets primitifs régionaux cités' },
};

/**
 * Open-data downloads do not assert a uniform certification scope:
 * - ministry amounts: initial LFI sections, NOT the January 2026 portfolio allocations;
 * - institution amounts: 11 different sections + 2 included internal Presidency programs;
 * - local BP: reported amounts from secondary publications, pending primary deliberations.
 */
export const BudgetDataDownloads: React.FC<{ scope: Scope }> = ({ scope }) => {
  const info = SCOPE_INFO[scope];
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-2" aria-label="Télécharger les données budgétaires 2026">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-sm font-black text-slate-900">Données budgétaires 2026 — consultation et export</h2>
          <p className="text-xs text-slate-700">
            {info.documented} / {info.total} fiches avec montant de référence ({info.label}).
            Les montants manquants ne sont jamais remplacés par zéro.
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Crédits de sections de la Loi de finances et budgets primitifs locaux sont des natures
            distinctes. Les données locales issues de publications de presse sont identifiées comme
            telles et restent à confirmer par les délibérations originales. Les programmes internes
            et les sections communes ne doivent pas être comptés deux fois.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/data/budgets-entites-2026.csv" download="budgets-entites-2026.csv"
            className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">
            Exporter les 281 fiches (CSV)
          </a>
          {scope === 'MINISTERE' && (
            <a href="/data/programmes-ministeriels-2026.csv" download="programmes-ministeriels-2026.csv"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100">
              Exporter 161 programmes (CSV)
            </a>
          )}
        </div>
      </div>
    </aside>
  );
};
