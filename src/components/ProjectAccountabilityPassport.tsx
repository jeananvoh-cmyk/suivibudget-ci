import React, { useState } from 'react';
import { BudgetProject, CitizenProof } from '../types';
import { 
  generateProjectPassport, 
  PassportStage, 
  PassportStageStatus, 
  ProjectAccountabilityPassportData 
} from '../utils/projectPassport';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  ExternalLink, 
  Camera, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Building2, 
  Scale, 
  HelpCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ProjectAccountabilityPassportProps {
  project: BudgetProject;
  proofs?: CitizenProof[];
  onOpenSendProof?: (project: BudgetProject) => void;
  onOpenDocRequest?: (project: BudgetProject) => void;
}

export const ProjectAccountabilityPassport: React.FC<ProjectAccountabilityPassportProps> = ({
  project,
  proofs = [],
  onOpenSendProof,
  onOpenDocRequest,
}) => {
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);

  const passport: ProjectAccountabilityPassportData = React.useMemo(() => {
    return generateProjectPassport(project, proofs);
  }, [project, proofs]);

  const toggleExpand = (stageId: string) => {
    setExpandedStageId(prev => (prev === stageId ? null : stageId));
  };

  const getStatusBadge = (status: PassportStageStatus, label: string) => {
    switch (status) {
      case 'VERIFIED_OFFICIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{label}</span>
          </span>
        );
      case 'PROBABLE_MATCH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
            <span>{label}</span>
          </span>
        );
      case 'CITIZEN_DOCUMENTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-900 border border-sky-300">
            <Camera className="w-3.5 h-3.5 text-sky-700" />
            <span>{label}</span>
          </span>
        );
      case 'ANOMALY_DETECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            <span>{label}</span>
          </span>
        );
      case 'SOURCE_CONFLICT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
            <span>{label}</span>
          </span>
        );
      case 'NOT_FOUND_PUBLICLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>{label}</span>
          </span>
        );
      case 'PENDING_DOCUMENTATION':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{label}</span>
          </span>
        );
    }
  };

  const getProvenanceBadge = (provenance: string) => {
    switch (provenance) {
      case 'OFFICIAL_SOURCE':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            Source Officielle
          </span>
        );
      case 'SUIVIBUDGET_CALCULATION':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
            Calcul SuiviBudget
          </span>
        );
      case 'CITIZEN_OBSERVATION':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
            Observation Citoyenne
          </span>
        );
      case 'INSTITUTION_RESPONSE':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
            Réponse Institutionnelle
          </span>
        );
      case 'UNVERIFIED_INPUT':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            Donnée Déclarative
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            Donnée Publique
          </span>
        );
    }
  };

  return (
    <section 
      aria-label="Passeport de Redevabilité du Projet"
      className="space-y-6"
    >
      {/* ------------------------------------------------------------------ */}
      {/* PASSPORT HERO BANNER & SCORE                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Passeport de Redevabilité</span>
              </span>
              <span className="text-xs font-bold text-slate-400">
                Cycle Civique Intégral
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Traçabilité Documentaire & Terrain
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Ce passeport documente les 6 maillons civiques (besoin, budget, marché, compte administratif, terrain, reddition). Il ne constitue en aucun cas une note politique.
            </p>
          </div>

          {/* Traceability Score Gauge */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 flex-shrink-0">
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Complétude Documentaire
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 leading-none mt-0.5">
                {passport.documentationCompletenessPct}%
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {passport.documentationCompletenessPct >= 70 ? 'Documentation Élevée' : passport.documentationCompletenessPct >= 40 ? 'Documentation Partielle' : 'En Cours de Collecte'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-emerald-400/30 border-t-emerald-400 flex items-center justify-center font-black text-xs text-white">
              {passport.documentationCompletenessPct}%
            </div>
          </div>
        </div>

        {/* Rapid Status Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl">
            <span className={`w-2.5 h-2.5 rounded-full ${passport.hasMatchedDgmpTender ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className="text-slate-300">Marché DGMP :</span>
            <span className="font-bold text-white">
              {passport.hasMatchedDgmpTender ? 'Rapproché' : 'Non retrouvé'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl">
            <span className={`w-2.5 h-2.5 rounded-full ${passport.hasMatchedCaOperation ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className="text-slate-300">Compte Admin (CA) :</span>
            <span className="font-bold text-white">
              {passport.hasMatchedCaOperation ? 'Inscrit' : 'En attente'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl">
            <span className={`w-2.5 h-2.5 rounded-full ${passport.hasCitizenFieldProofs ? 'bg-sky-400' : 'bg-slate-500'}`} />
            <span className="text-slate-300">Contrôle Terrain :</span>
            <span className="font-bold text-white">
              {passport.hasCitizenFieldProofs ? 'Documenté' : 'Aucun constat'}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 6 STAGES OF THE CIVIC CYCLE                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3" role="list">
        {passport.stages.map((stage) => {
          const isExpanded = expandedStageId === stage.id;
          
          return (
            <article 
              key={stage.id}
              role="listitem"
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                stage.status === 'ANOMALY_DETECTED'
                  ? 'border-amber-300 bg-amber-50/40'
                  : stage.status === 'SOURCE_CONFLICT'
                  ? 'border-rose-300 bg-rose-50/40'
                  : stage.status === 'PROBABLE_MATCH'
                  ? 'border-indigo-200 bg-indigo-50/20 hover:border-indigo-300'
                  : stage.status === 'VERIFIED_OFFICIAL'
                  ? 'border-emerald-200 bg-white hover:border-emerald-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Header / Clickable summary */}
              <button
                type="button"
                onClick={() => toggleExpand(stage.id)}
                className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-2xl"
                aria-expanded={isExpanded}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Step Number Circle */}
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${
                    stage.status === 'VERIFIED_OFFICIAL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : stage.status === 'PROBABLE_MATCH'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : stage.status === 'CITIZEN_DOCUMENTED'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : stage.status === 'ANOMALY_DETECTED'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : stage.status === 'SOURCE_CONFLICT'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {stage.stepNumber}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
                        {stage.label}
                      </h4>
                      {getStatusBadge(stage.status, stage.statusLabel)}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                      {stage.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-center">
                  <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                    {isExpanded ? 'Réduire' : 'Détails'}
                  </span>
                  <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {/* Alert Callout if Anomaly Detected */}
              {stage.alertMessage && (
                <div className="mx-4 sm:mx-5 mb-4 p-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-black">Point d'attention citoyen :</span>
                    <p>{stage.alertMessage}</p>
                  </div>
                </div>
              )}

              {/* Collapsible Content: Data Points & Provenance */}
              {isExpanded && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                    {stage.dataPoints.map((dp, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {dp.label}
                          </span>
                          {getProvenanceBadge(dp.provenance)}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-slate-900 break-words">
                          {dp.value}
                        </div>
                        {dp.sourceDetails && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-200/60 mt-1">
                            <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="italic">{dp.sourceDetails}</span>
                          </div>
                        )}
                        {dp.sourceUrl && (
                          <a 
                            href={dp.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 mt-1 hover:underline"
                          >
                            <span>Consulter la source officielle</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Stage-specific actionable civic buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 italic">
                      Principe 2 : Provenance traçable &bull; Principe 7 : Dépense financière &ne; Réalisation physique
                    </span>

                    <div className="flex items-center gap-2">
                      {stage.id === 'PHYSICAL_REALIZATION' && onOpenSendProof && (
                        <button
                          type="button"
                          onClick={() => onOpenSendProof(project)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Ajouter un constat terrain</span>
                        </button>
                      )}

                      {(stage.id === 'PROCUREMENT_DGMP' || stage.id === 'BUDGET_EXECUTION_CA') && 
                       stage.status === 'NOT_FOUND_PUBLICLY' && onOpenDocRequest && (
                        <button
                          type="button"
                          onClick={() => onOpenDocRequest(project)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Demander l'accès (CAIDP)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CIVIC DISCLAIMER & METHODOLOGY NOTE                                */}
      {/* ------------------------------------------------------------------ */}
      <footer className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
        <div className="font-bold text-slate-800 flex items-center gap-1.5">
          <Scale className="w-4 h-4 text-emerald-600" />
          <span>Charte de Déontologie & Rapprochement SuiviBudget</span>
        </div>
        <p className="leading-relaxed">
          Le Passeport de Redevabilité rapproche les documents officiels publiés (Lois de Finances, avis DGMP, Comptes Administratifs) et les observations de riverains vérifiées.
          <strong className="text-slate-800 ml-1">
            Une dépense budgétaire inscrite ne constitue jamais la preuve de son achèvement physique sur le terrain.
          </strong>
        </p>
      </footer>
    </section>
  );
};
