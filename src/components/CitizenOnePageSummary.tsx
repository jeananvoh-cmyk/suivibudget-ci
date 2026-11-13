import React from 'react';
import { Printer, X, ShieldCheck, Building2, Phone, Mail, FileCheck2, MapPin, AlertCircle } from 'lucide-react';
import { BudgetProject, Institution, PublicDocument } from '../types';
import { AdministrativeAccount } from '../types/administrativeAccount';
import { formatAmountInWords, formatFCFA, formatQualifiedFCFA } from '../utils/formatters';
import { resolveInstitutionBudgetPresentation, InstitutionBudgetPresentation } from '../utils/institutionBudgetHelper';
import { calculateExecutionRate } from '../utils/budgetCalculations';
import { getCleanPath, AnnuaireSection } from '../utils/navigation';
import { QrCodeSvg } from './common/QrCodeSvg';

export interface CaidpDeadlineSummarySnapshot {
  latestDeadline?: {
    badgeLabel: string;
    citizenGuidance: string;
  } | null;
}

export interface SectorSummaryRow {
  category: string;
  projectsCount: number;
  knownAmountFcfa: number | null;
  allAmountsKnown: boolean;
}

export interface Sha256SourceItem {
  title: string;
  sha256: string;
  pageReference?: string | null;
}

export interface CitizenSummaryData {
  institutionId: string;
  institutionName: string;
  budgetPresentation: InstitutionBudgetPresentation;
  latestCA: AdministrativeAccount | undefined;
  caInvestmentRateFormatted: string | null;
  sectorBreakdown: SectorSummaryRow[];
  topProjects: BudgetProject[];
  sha256Sources: Sha256SourceItem[];
  canonicalUrl: string;
}

function resolveInstitutionAnnuaireSection(type: Institution['type']): AnnuaireSection {
  switch (type) {
    case 'MINISTERE':
      return 'MINISTRIES';
    case 'MAIRIE':
      return 'MUNICIPAL';
    case 'REGION':
    case 'DISTRICT':
      return 'REGIONAL';
    case 'AUTORITE_REGULATION':
      return 'REGULATORS';
    case 'INSTITUTION':
    default:
      return 'INSTITUTIONS';
  }
}

/**
 * Computes strictly verified 1-page Citizen Budget Summary inputs without inventing missing figures.
 */
export function buildCitizenSummaryData(params: {
  institution: Institution;
  relatedProjects: BudgetProject[];
  latestCA?: AdministrativeAccount;
  documents?: PublicDocument[];
  origin?: string;
}): CitizenSummaryData {
  const { institution, relatedProjects, latestCA, documents = [], origin = 'https://suivibudget.vercel.app' } = params;
  const budgetPresentation = resolveInstitutionBudgetPresentation(institution);

  const caInvestmentRateFormatted = latestCA
    ? calculateExecutionRate(latestCA.investment_realized, latestCA.investment_planned).formatted
    : null;

  // 1. Sector aggregation from published projects attached to this institution
  const sectorMap = new Map<string, { count: number; sum: number; allKnown: boolean }>();
  for (const project of relatedProjects) {
    const category = (project.category || 'Autres').trim() || 'Autres';
    const current = sectorMap.get(category) ?? { count: 0, sum: 0, allKnown: true };
    current.count += 1;
    if (typeof project.budget_amount_fcfa === 'number' && Number.isFinite(project.budget_amount_fcfa)) {
      current.sum += project.budget_amount_fcfa;
    } else {
      current.allKnown = false;
    }
    sectorMap.set(category, current);
  }

  const sectorBreakdown: SectorSummaryRow[] = Array.from(sectorMap.entries())
    .map(([category, stats]) => ({
      category,
      projectsCount: stats.count,
      knownAmountFcfa: stats.allKnown && stats.count > 0 ? stats.sum : null,
      allAmountsKnown: stats.allKnown,
    }))
    .sort((a, b) => (b.knownAmountFcfa ?? -1) - (a.knownAmountFcfa ?? -1) || b.projectsCount - a.projectsCount)
    .slice(0, 5);

  // 2. Top 3 major projects by documented allocation
  const topProjects = [...relatedProjects]
    .sort((a, b) => (b.budget_amount_fcfa ?? -1) - (a.budget_amount_fcfa ?? -1))
    .slice(0, 3);

  // 3. Deduplicated authentic SHA-256 document fingerprints
  const shaMap = new Map<string, Sha256SourceItem>();
  const registerSha = (title: string | null | undefined, sha: string | null | undefined, pageRef?: string | null) => {
    if (!sha || typeof sha !== 'string' || !sha.trim()) return;
    const normalizedSha = sha.trim().toLowerCase();
    if (!shaMap.has(normalizedSha)) {
      shaMap.set(normalizedSha, {
        title: (title || 'Document officiel').trim(),
        sha256: normalizedSha,
        pageReference: pageRef ?? null,
      });
    }
  };

  if (budgetPresentation.reference.source) {
    registerSha(
      budgetPresentation.reference.source.document_title,
      budgetPresentation.reference.source.sha256,
      budgetPresentation.reference.source.pdf_page ? `p. ${budgetPresentation.reference.source.pdf_page}` : null
    );
  }
  for (const sup of budgetPresentation.supplements) {
    if (sup.source) {
      registerSha(
        sup.source.document_title,
        sup.source.sha256,
        sup.source.pdf_page ? `p. ${sup.source.pdf_page}` : null
      );
    }
  }
  registerSha(
    institution.primitive_budget?.source,
    institution.primitive_budget?.sha256,
    institution.primitive_budget?.pdf_page ? `p. ${institution.primitive_budget.pdf_page}` : null
  );
  registerSha(
    institution.breakdown_evidence?.document_title,
    institution.breakdown_evidence?.sha256,
    institution.breakdown_evidence?.pdf_page ? `p. ${institution.breakdown_evidence.pdf_page}` : null
  );
  registerSha(
    institution.state_grant_evidence?.source?.document_title,
    institution.state_grant_evidence?.source?.sha256,
    institution.state_grant_evidence?.source?.pdf_page ? `p. ${institution.state_grant_evidence.source.pdf_page}` : null
  );
  if (latestCA) {
    registerSha(
      latestCA.source_document,
      latestCA.source_document_sha256,
      latestCA.source_page ? `p. ${latestCA.source_page}` : null
    );
  }
  for (const doc of documents) {
    if (doc.status === 'PUBLISHED' && doc.institution_id === institution.id) {
      registerSha(doc.title, doc.checksum_sha256, doc.page_count ? `${doc.page_count} p.` : null);
    }
  }

  const section = resolveInstitutionAnnuaireSection(institution.type);
  const canonicalPath = getCleanPath('institutions', section);

  return {
    institutionId: institution.id,
    institutionName: institution.name,
    budgetPresentation,
    latestCA,
    caInvestmentRateFormatted,
    sectorBreakdown,
    topProjects,
    sha256Sources: Array.from(shaMap.values()).slice(0, 4),
    canonicalUrl: `${origin.replace(/\/$/, '')}${canonicalPath}`,
  };
}

interface CitizenOnePageSummaryProps {
  institution: Institution;
  relatedProjects: BudgetProject[];
  latestCA?: AdministrativeAccount;
  documents?: PublicDocument[];
  riInfo: {
    name?: string;
    functionTitle: string;
    email?: string;
    phone?: string;
  };
  caidpDeadlineSummary?: CaidpDeadlineSummarySnapshot;
  onClose: () => void;
}

export const CitizenOnePageSummary: React.FC<CitizenOnePageSummaryProps> = ({
  institution,
  relatedProjects,
  latestCA,
  documents = [],
  riInfo,
  caidpDeadlineSummary,
  onClose,
}) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://suivibudget.vercel.app';

  const summary = React.useMemo(
    () =>
      buildCitizenSummaryData({
        institution,
        relatedProjects,
        latestCA,
        documents,
        origin,
      }),
    [institution, relatedProjects, latestCA, documents, origin]
  );

  const generatedDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const referenceAmountText =
    summary.budgetPresentation.reference.amount_fcfa == null
      ? 'Non documenté publiquement (absence de donnée ≠ inexistence)'
      : formatQualifiedFCFA(
          summary.budgetPresentation.reference.amount_fcfa,
          summary.budgetPresentation.reference.precision
        );

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/85 backdrop-blur-xs p-3 sm:p-6 flex flex-col items-center print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label={`Budget Citoyen 1 Page A4 — ${institution.name}`}
      onClick={onClose}
    >
      {/* Print Controls Toolbar (Hidden on Paper) */}
      <div
        className="no-print w-full max-w-[210mm] mb-3 bg-white rounded-2xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Aperçu d'Impression A4 — Budget Citoyen en 1 Page
          </p>
          <p className="text-[11px] text-slate-600">
            Format optimisé pour affichage mairie, foyer des jeunes, APEC ou diffusion locale.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-blue hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / PDF (A4)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Fermer</span>
          </button>
        </div>
      </div>

      {/* Printable A4 Sheet */}
      <article
        id="citizen-one-page-summary"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[210mm] bg-white text-slate-900 rounded-2xl border border-slate-300 shadow-2xl p-6 sm:p-8 space-y-4 font-sans print:rounded-none print:border-none print:shadow-none print:p-0 print:space-y-3 print:text-[9.5pt]"
      >
        {/* 1. HEADER: QUI ? + QR CODE */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                Budget Citoyen • 1 Page (A4)
              </span>
              <span className="text-[11px] font-bold text-slate-600">
                SuiviBudget Côte d'Ivoire • Édité le {generatedDate}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {institution.name}
            </h1>
            <p className="text-xs text-slate-700">
              <strong>Qui décide & gère ?</strong>{' '}
              {institution.leader_name
                ? `${institution.leader_name} (${institution.leader_title || 'Premier Responsable'})`
                : institution.leader_title || 'Responsable institutionnel'}
              {institution.region ? ` • Région : ${institution.region}` : ''}
              {institution.mandature ? ` • Mandature ${institution.mandature}` : ''}
            </p>
          </div>

          <div className="flex flex-col items-center text-center flex-shrink-0 border border-slate-200 rounded-xl p-2 bg-slate-50 print:bg-white">
            <QrCodeSvg
              value={summary.canonicalUrl}
              size={76}
              label={`QR Code vers ${institution.name} sur SuiviBudget CI`}
            />
            <span className="text-[9px] font-bold text-slate-600 mt-1 max-w-[84px] leading-tight">
              Scanner pour les sources en ligne
            </span>
          </div>
        </header>

        {/* 2. COMBIEN ? BUDGET 2026 & EXECUTION CA */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 print:bg-white p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-brand-blue">
              <Building2 className="w-3.5 h-3.5" />
              <span>Combien ? Budget de référence 2026</span>
            </div>
            <p className="text-xs font-semibold text-slate-600">
              {summary.budgetPresentation.reference.label}
            </p>
            <p className="text-lg font-black text-slate-900 leading-tight">{referenceAmountText}</p>
            {summary.budgetPresentation.reference.amount_fcfa != null && (
              <p className="text-[11px] text-slate-600">
                {formatAmountInWords(summary.budgetPresentation.reference.amount_fcfa)}
              </p>
            )}
            {(summary.budgetPresentation.functioning_fcfa != null ||
              summary.budgetPresentation.investment_fcfa != null) && (
              <div className="text-[11px] text-slate-700 pt-1 border-t border-slate-200 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>
                  Fonctionnement :{' '}
                  <strong>{formatFCFA(summary.budgetPresentation.functioning_fcfa)}</strong>
                  {summary.budgetPresentation.functioning_pct != null
                    ? ` (${summary.budgetPresentation.functioning_pct} %)`
                    : ''}
                </span>
                <span>
                  Investissement :{' '}
                  <strong>{formatFCFA(summary.budgetPresentation.investment_fcfa)}</strong>
                  {summary.budgetPresentation.investment_pct != null
                    ? ` (${summary.budgetPresentation.investment_pct} %)`
                    : ''}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 print:bg-white p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dernier Compte Administratif (Exécution)</span>
            </div>
            {summary.latestCA ? (
              <>
                <p className="text-xs font-bold text-slate-800">
                  Exercice {summary.latestCA.fiscal_year} • Statut : {summary.latestCA.status}
                </p>
                <div className="text-[11px] text-slate-700 space-y-0.5">
                  <p>
                    Investissements prévus :{' '}
                    <strong>{formatFCFA(summary.latestCA.investment_planned)}</strong>
                  </p>
                  <p>
                    Investissements exécutés :{' '}
                    <strong>{formatFCFA(summary.latestCA.investment_realized)}</strong>
                    {summary.caInvestmentRateFormatted ? ` (${summary.caInvestmentRateFormatted})` : ''}
                  </p>
                  <p>
                    Opérations recensées : <strong>{summary.latestCA.operations.length}</strong>
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-600 leading-snug">
                Aucun Compte Administratif publié sur la plateforme pour cette entité (statut{' '}
                <code>NOT_FOUND_PUBLICLY</code>). L'absence de document en ligne ne prouve pas son
                inexistence.
              </p>
            )}
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
              Rappel : Budget Primitif (prévision) ≠ Compte Administratif (exécution financière) ≠
              réalisation physique.
            </p>
          </div>
        </section>

        {/* 3. SECTEURS 2026 & 3 PROJETS MAJEURS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1">
              Secteurs 2026 (Projets rattachés : {relatedProjects.length})
            </h2>
            {summary.sectorBreakdown.length > 0 ? (
              <ul className="space-y-1 text-[11px]">
                {summary.sectorBreakdown.map((row) => (
                  <li key={row.category} className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 truncate">
                      {row.category} ({row.projectsCount})
                    </span>
                    <span className="font-mono font-bold text-slate-900 flex-shrink-0">
                      {row.knownAmountFcfa != null
                        ? formatFCFA(row.knownAmountFcfa)
                        : 'Montant partiel / NC'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-600">
                Ventilation sectorielle non individualisée dans les données publiées pour cette entité.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1">
              3 Projets Majeurs Référencés
            </h2>
            {summary.topProjects.length > 0 ? (
              <ol className="space-y-1.5 text-[11px] list-decimal list-inside">
                {summary.topProjects.map((project) => (
                  <li key={project.id} className="text-slate-800 leading-snug">
                    <span className="font-bold text-slate-900">{project.title}</span>
                    <div className="pl-4 text-[10.5px] text-slate-600 flex flex-wrap items-center gap-x-2">
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {project.commune_name || project.region_name || 'Localité NC'}
                      </span>
                      <span>•</span>
                      <strong className="text-slate-900">
                        {project.budget_amount_fcfa != null
                          ? formatFCFA(project.budget_amount_fcfa)
                          : 'Montant non documenté'}
                      </strong>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[11px] text-slate-600">
                Aucun chantier individuel référencé à ce stade. Utilisez la demande CAIDP ci-dessous
                pour obtenir le programme d'investissements.
              </p>
            )}
          </div>
        </section>

        {/* 4. CONTACT RI CAIDP & EMPREINTES SHA-256 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Contact Responsable Info (CAIDP — Loi n°2013-867)
              </h2>
              <span className="text-[10px] font-bold text-amber-800">Délai légal : 30 jours</span>
            </div>
            <p className="text-xs font-bold text-slate-900">
              {riInfo.name || riInfo.functionTitle}
            </p>
            {riInfo.name && <p className="text-[11px] text-slate-600">{riInfo.functionTitle}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-700 pt-0.5">
              {riInfo.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {riInfo.email}
                </span>
              )}
              {riInfo.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {riInfo.phone}
                </span>
              )}
              {!riInfo.email && !riInfo.phone && (
                <span>Saisine directe via caidp.ci ou courrier déposé à l'institution.</span>
              )}
            </div>
            {caidpDeadlineSummary?.latestDeadline && (
              <p className="text-[10.5px] font-semibold text-slate-700 pt-1 border-t border-slate-100">
                Suivi citoyen : {caidpDeadlineSummary.latestDeadline.badgeLabel} —{' '}
                {caidpDeadlineSummary.latestDeadline.citizenGuidance}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Empreintes SHA-256 des Sources Publiées
              </h2>
            </div>
            {summary.sha256Sources.length > 0 ? (
              <ul className="space-y-1 text-[10px]">
                {summary.sha256Sources.map((src) => (
                  <li key={src.sha256} className="space-y-0.5">
                    <div className="font-bold text-slate-800 truncate">
                      {src.title}
                      {src.pageReference ? ` (${src.pageReference})` : ''}
                    </div>
                    <div className="font-mono text-slate-600 break-all">{src.sha256}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>
                  Aucune empreinte SHA-256 de document primaire publiée pour cette entité à ce stade.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 5. CHARTE CIVIQUE FOOTER */}
        <footer className="pt-2 border-t border-slate-200 text-[10px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Charte SuiviBudget CI :</strong> Neutralité politique absolue • Source officielle
            obligatoire • Dépense financière ≠ réalisation physique.
          </span>
          <span className="font-mono text-slate-500">{summary.canonicalUrl}</span>
        </footer>
      </article>
    </div>
  );
};
