import React from 'react';
import { BudgetProject } from '../types';
import { formatFCFA, formatAmountInWords, getProjectEntityInfo } from '../utils/formatters';
import { getCategoryBadgeClass } from '../data/categories';
import { MapPin, ArrowRight, Camera, Share2 } from 'lucide-react';

interface ProjectCardProps {
  project: BudgetProject;
  onSelect: (project: BudgetProject) => void;
  onSendProof?: (project: BudgetProject) => void;
  onShare?: (project: BudgetProject) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onSendProof,
  onShare,
}) => {
  const entityInfo = getProjectEntityInfo(project.commune_name, project.region_name, project.ministry_name);

  // Clean location display for the bottom line
  const locationText = project.locality_village_neighborhood ||
    (entityInfo.entityType === 'MAIRIE' 
      ? (project.region_name && project.region_name !== 'Abidjan' ? `${project.commune_name} (${project.region_name})` : `Commune de ${project.commune_name}`)
      : (entityInfo.entityType === 'REGION' 
        ? `Région ${project.region_name || project.commune_name}`
        : (entityInfo.entityType === 'MINISTERE' ? (project.region_name ? `Région ${project.region_name}` : 'Envergure Nationale') : project.region_name || 'Côte d\'Ivoire')));

  return (
    <div 
      onClick={() => onSelect(project)}
      className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-brand-blue/50 transition-all duration-300 flex flex-col justify-between overflow-hidden group cursor-pointer"
    >
      
      {/* Top Header: Authority in Charge + Category Sector */}
      <div className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
          {/* Authority Badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border leading-tight ${entityInfo.entityBadgeClass}`}>
            <span>{entityInfo.entityName}</span>
          </span>

          {/* Sector Category Badge */}
          {project.category && (
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getCategoryBadgeClass(project.category)}`}>
              {project.category}
            </span>
          )}
        </div>

        {/* Project Title / Investment Description */}
        <h3 
          className="text-sm sm:text-base font-black text-slate-900 line-clamp-3 sm:line-clamp-4 group-hover:text-brand-blue transition-colors leading-snug min-h-[48px]"
          title={project.title}
        >
          {project.title}
        </h3>

        {/* Location Line */}
        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs mt-3">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{locationText}</span>
        </div>
      </div>

      {/* Middle: Budget & Status */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Budget Alloué</span>
          <div className="text-right">
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {formatFCFA(project.budget_amount_fcfa)}
            </div>
            <div className="text-[11px] font-bold text-brand-blue">
              ({formatAmountInWords(project.budget_amount_fcfa)} FCFA)
            </div>
          </div>
        </div>

        {/* Citizen Status Info */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">Statut de terrain</span>
          <span className="text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>En attente de constat</span>
          </span>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div 
        className="p-3 sm:px-5 sm:py-3.5 bg-white border-t border-slate-100 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onSelect(project)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3.5 bg-slate-900 hover:bg-brand-blue text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
          title="Consulter la fiche complète du projet"
        >
          <span>Voir la fiche</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {onSendProof && (
          <button
            onClick={() => onSendProof(project)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95"
            title="Envoyer une photo de terrain ou preuve citoyenne"
          >
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Photo</span>
          </button>
        )}

        {onShare && (
          <button
            onClick={() => onShare(project)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all active:scale-95 flex-shrink-0"
            title="Partager ce chantier sur WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
};
