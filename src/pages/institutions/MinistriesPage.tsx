import React, { useState } from 'react';
import { ArrowLeft, Search, ChevronDown, ArrowRight, Globe, FileText } from 'lucide-react';
import { GOVERNMENT_OFFICIALS, OfficialLeader } from '../../data/governmentData';
import { BudgetProject, Institution } from '../../types';
import { formatFCFA, formatAmountInWords } from '../../utils/formatters';
import { InstitutionDetailModal } from '../../components/InstitutionDetailModal';
import { OfficialDocRequestModal } from '../../components/OfficialDocRequestModal';

const getInitials = (name: string) => {
  const clean = name.replace(/^(M\.|Mme|Prof\.|Gal\.|Dr)\s+/i, '').trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

const LeaderAvatar: React.FC<{
  photoUrl?: string;
  name: string;
  className?: string;
}> = ({ photoUrl, name, className = "w-20 h-20 sm:w-24 sm:h-24" }) => {
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(name);

  if (!photoUrl || hasError) {
    return (
      <div className={`${className} min-w-[5rem] max-w-[5rem] sm:min-w-[6rem] sm:max-w-[6rem] aspect-square rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-black text-sm sm:text-base flex-shrink-0 shadow-2xs select-none`}>
        {initials}
      </div>
    );
  }

  return (
    <div className={`${className} min-w-[5rem] max-w-[5rem] sm:min-w-[6rem] sm:max-w-[6rem] aspect-square rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs flex-shrink-0 cursor-zoom-in group/photo bg-slate-50 relative`}>
      <img
        src={photoUrl}
        alt={name}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-top transition-transform duration-300 ease-out group-hover/photo:scale-110"
        loading="lazy"
      />
    </div>
  );
};

interface MinistriesPageProps {
  onBack: () => void;
  onNavigateToProjects: (ministryQuery: string) => void;
  allProjects?: BudgetProject[];
}

export const MinistriesPage: React.FC<MinistriesPageProps> = ({
  onBack,
  onNavigateToProjects,
  allProjects = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [selectedInstForDetail, setSelectedInstForDetail] = useState<Institution | null>(null);
  const [selectedInstForDoc, setSelectedInstForDoc] = useState<Institution | null>(null);

  const filteredOfficials = GOVERNMENT_OFFICIALS.filter((official: OfficialLeader) => {
    if (selectedGender !== 'ALL' && official.gender !== selectedGender) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      official.name.toLowerCase().includes(q) ||
      official.role_title.toLowerCase().includes(q) ||
      official.department_ministry.toLowerCase().includes(q)
    );
  });

  const premierMinistre = filteredOfficials.find((o: OfficialLeader) => o.category === 'PREMIER_MINISTRE');
  const vicePremierMinistre = filteredOfficials.find((o: OfficialLeader) => o.category === 'VICE_PREMIER_MINISTRE' || o.id === 'gov-002');
  const ministresEtat = filteredOfficials.filter((o: OfficialLeader) => o.category === 'MINISTRE_ETAT' && o.id !== vicePremierMinistre?.id);
  const ministres = filteredOfficials.filter((o: OfficialLeader) => (o.category === 'MINISTRE' || o.category === 'MINISTRE_DELEGUE' || o.category === 'SECRETAIRE_ETAT') && o.id !== premierMinistre?.id && o.id !== vicePremierMinistre?.id);

  const openOfficialDetail = (official: OfficialLeader) => {
    const instObj: Institution = {
      id: official.id,
      name: official.department_ministry,
      type: 'MINISTERE',
      region: 'Abidjan',
      district: 'Autonome d\'Abidjan',
      departement: 'Plateau',
      address: official.address || 'Cité Administrative, Plateau, Abidjan',
      contact_email: official.contact_email || '',
      contact_phone: official.contact_phone || '',
      website: official.website_url,
      facebook_url: official.facebook_url,
      leader_name: official.name,
      leader_title: official.role_title,
      leader_photo_url: official.photo_url,
      leader_bio: official.leader_bio,
      leader_education: official.leader_education,
      leader_experience: official.leader_experience,
      organigramme_summary: official.organigramme_summary,
      organigramme_details: official.organigramme_details,
      mission_summary: official.mission_summary || `Direction exécutive et mise en œuvre des politiques sectorielles de l'État pour le portefeuille : ${official.department_ministry}.`,
      info_officer_name: official.info_officer_name || '',
      info_officer_email: official.info_officer_email || '',
      info_officer_phone: official.info_officer_phone || '',
      info_officer_title: official.info_officer_title || 'Service d\'Accès aux Documents Publics (Loi n°2013-867)',
      green_line_number: official.green_line_number,
      budget_functioning_fcfa: Math.round((official.budget_fcfa || 0) * 0.65),
      budget_investment_fcfa: Math.round((official.budget_fcfa || 0) * 0.35),
      total_budget_fcfa: official.budget_fcfa || 0,
      budget_not_published: !official.budget_fcfa
    };
    setSelectedInstForDetail(instObj);
  };

  const renderCardFooter = (official: OfficialLeader) => (
    <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2.5">
      <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {official.website_url && (
          <a
            href={official.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-600 flex items-center justify-center transition-colors shadow-2xs flex-shrink-0"
            title={`Site officiel : ${official.website_url}`}
          >
            <Globe className="w-3.5 h-3.5" />
          </a>
        )}
        {official.facebook_url && (
          <a
            href={official.facebook_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 flex items-center justify-center transition-colors shadow-2xs flex-shrink-0"
            title={`Page Facebook : ${official.facebook_url}`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const instObj: Institution = {
              id: official.id,
              name: official.department_ministry,
              type: 'MINISTERE',
              region: 'Abidjan',
              district: 'Autonome d\'Abidjan',
              departement: 'Plateau',
              address: official.address || 'Cité Administrative, Plateau, Abidjan',
              contact_email: official.contact_email || '',
              contact_phone: official.contact_phone || '',
              website: official.website_url,
              facebook_url: official.facebook_url,
              leader_name: official.name,
              leader_title: official.role_title,
              leader_photo_url: official.photo_url,
              info_officer_name: official.info_officer_name || '',
              info_officer_email: official.info_officer_email || '',
              info_officer_phone: official.info_officer_phone || '',
              info_officer_title: official.info_officer_title || 'Service d\'Accès aux Documents Publics (Loi n°2013-867)',
              budget_functioning_fcfa: Math.round((official.budget_fcfa || 0) * 0.65),
              budget_investment_fcfa: Math.round((official.budget_fcfa || 0) * 0.35),
              total_budget_fcfa: official.budget_fcfa || 0,
            };
            setSelectedInstForDoc(instObj);
          }}
          className="px-2.5 py-1.5 bg-blue-50/90 hover:bg-brand-blue hover:text-white text-brand-blue border border-blue-100 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
          title="Générer une demande officielle de documents publics (Loi n°2013-867)"
        >
          <FileText className="w-3 h-3 text-brand-orange" />
          <span className="whitespace-nowrap">Demande CAIDP</span>
        </button>
      </div>

      <div className="flex items-center justify-end sm:justify-start">
        <span className="font-bold text-brand-blue flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
          Fiche & Budget <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-full md:w-5/12 h-44 sm:h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs flex-shrink-0">
          <img 
            src="/images/conseil_des_ministres.png" 
            alt="Conseil des Ministres de Côte d'Ivoire" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="space-y-2 text-center md:text-left flex-1">
          <span className="inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-blue/10 text-brand-blue">
            Pouvoir Exécutif • République de Côte d'Ivoire
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-sans">
            Ministères de la République
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Primature, ministères d'État, ministères sectoriels et délégués : portefeuilles officiels, budgets alloués et chantiers publics de l'action gouvernementale.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-3xl mx-auto bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-1/3">
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value as any)}
            className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white"
          >
            <option value="ALL">Tous les membres</option>
            <option value="F">Femmes ministres</option>
            <option value="M">Hommes ministres</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative w-full sm:w-2/3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom de ministre, ministère, secteur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white font-medium"
          />
        </div>
      </div>

      {/* Section 1 : Chef du Gouvernement & Vice-Primature (Défense) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
            Primature & Vice-Primature
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {premierMinistre && (
            <div 
              onClick={() => openOfficialDetail(premierMinistre)}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex gap-4 items-start">
                  <LeaderAvatar 
                    photoUrl={premierMinistre.photo_url} 
                    name={premierMinistre.name}
                    className="w-24 h-24 sm:w-28 sm:h-28"
                  />
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-blue bg-blue-50 px-2 py-0.5 rounded">
                      Chef du Gouvernement
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                      {premierMinistre.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{premierMinistre.department_ministry}</p>
                    <div className="text-xs font-black text-slate-800 pt-0.5">
                      Budget : <span className="text-brand-blue">{formatFCFA(premierMinistre.budget_fcfa || 0)}</span> <span className="text-slate-500 font-bold">({formatAmountInWords(premierMinistre.budget_fcfa || 0)})</span>
                    </div>
                  </div>
                </div>
              </div>

              {renderCardFooter(premierMinistre)}
            </div>
          )}

          {vicePremierMinistre && (
            <div 
              onClick={() => openOfficialDetail(vicePremierMinistre)}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex gap-4 items-start">
                  <LeaderAvatar 
                    photoUrl={vicePremierMinistre.photo_url} 
                    name={vicePremierMinistre.name}
                    className="w-24 h-24 sm:w-28 sm:h-28"
                  />
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
                      Vice-Premier Ministre
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-brand-blue transition-colors">
                      {vicePremierMinistre.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{vicePremierMinistre.role_title}</p>
                    <div className="text-xs font-black text-slate-800 pt-0.5">
                      Budget : <span className="text-brand-blue">{formatFCFA(vicePremierMinistre.budget_fcfa || 0)}</span> <span className="text-slate-500 font-bold">({formatAmountInWords(vicePremierMinistre.budget_fcfa || 0)})</span>
                    </div>
                  </div>
                </div>
              </div>

              {renderCardFooter(vicePremierMinistre)}
            </div>
          )}
        </div>
      </div>

      {/* Section 2 : Ministres d'État */}
      {ministresEtat.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
              Ministres d'État ({ministresEtat.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ministresEtat.map((official: OfficialLeader) => (
              <div 
                key={official.id}
                onClick={() => openOfficialDetail(official)}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex gap-3.5 sm:gap-4 items-start">
                    <LeaderAvatar 
                      photoUrl={official.photo_url} 
                      name={official.name}
                      className="w-20 h-20 sm:w-24 sm:h-24"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        Ministre d'État
                      </span>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-brand-blue transition-colors line-clamp-1">
                        {official.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">{official.department_ministry}</p>
                      <div className="text-[11px] font-bold text-slate-800 pt-0.5 whitespace-nowrap">
                        Budget : <span className="text-brand-blue">{formatFCFA(official.budget_fcfa || 0)}</span> <span className="text-slate-500 font-semibold text-[10px] whitespace-nowrap">({formatAmountInWords(official.budget_fcfa || 0)})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {renderCardFooter(official)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3 : Tous les Ministères Sectoriels */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
            Ministères Sectoriels ({ministres.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ministres.map((official: OfficialLeader) => (
            <div 
              key={official.id}
              onClick={() => openOfficialDetail(official)}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-brand-blue/40 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex gap-3.5 sm:gap-4 items-start">
                  <LeaderAvatar 
                    photoUrl={official.photo_url} 
                    name={official.name}
                    className="w-20 h-20 sm:w-24 sm:h-24"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded">
                      Ministère
                    </span>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-brand-blue transition-colors line-clamp-1">
                      {official.name}
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-tight">{official.department_ministry}</p>
                    <div className="text-[11px] font-bold text-slate-800 pt-0.5 whitespace-nowrap">
                      Budget : <span className="text-brand-blue">{formatFCFA(official.budget_fcfa || 0)}</span> <span className="text-slate-500 font-semibold text-[10px] whitespace-nowrap">({formatAmountInWords(official.budget_fcfa || 0)})</span>
                    </div>
                  </div>
                </div>
              </div>

              {renderCardFooter(official)}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Demande RI */}
      <OfficialDocRequestModal
        isOpen={!!selectedInstForDoc}
        onClose={() => setSelectedInstForDoc(null)}
        institution={selectedInstForDoc}
      />

      {/* Modal Fiche Détaillée Ministère */}
      <InstitutionDetailModal
        isOpen={!!selectedInstForDetail}
        onClose={() => setSelectedInstForDetail(null)}
        institution={selectedInstForDetail}
        allProjects={allProjects}
        onNavigateToProjects={onNavigateToProjects}
      />

    </div>
  );
};
