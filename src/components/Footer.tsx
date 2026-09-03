import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Download, 
  Lock, 
  ExternalLink, 
  Layers, 
  Landmark, 
  ArrowRight, 
  Mail,
  AlertTriangle,
  HeartHandshake
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { ActiveTab } from '../types';
import { sanitizeCsvCell } from '../utils/security';

interface FooterProps {
  activeTab: ActiveTab;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenDocModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  activeTab,
  onNavigateTab,
  onOpenDocModal,
}) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [commune, setCommune] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const contactEmail = 'contact.suivi@gmail.com';

  const institutions = dataStore.getInstitutions();
  const communesList = institutions
    .filter(i => i.type === 'MAIRIE')
    .map(i => i.name.replace(/^Mairie (de |d'|du )/i, '').trim())
    .sort((a, b) => a.localeCompare(b, 'fr'));

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage("Veuillez renseigner une adresse email valide.");
      return;
    }

    const res = dataStore.subscribeNewsletter(firstName, email, commune);
    if (res.success) {
      setSubscribed(true);
      setFirstName('');
      setEmail('');
      setCommune('');
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleExportCsv = (type: 'COMMUNES' | 'REGIONS' | 'CAIDP') => {
    let filename = '';
    let csvContent = '';

    if (type === 'COMMUNES') {
      filename = `SuiviBudget_CI_201_Communes_${new Date().getFullYear()}.csv`;
      const mairies = institutions.filter(i => i.type === 'MAIRIE');
      csvContent = "ID;Commune;Region;District;Maire;Budget_Total_FCFA;Budget_Fonctionnement_FCFA;Budget_Investissement_FCFA;Contact_Email;Contact_Tel;RI_Nom;RI_Email\n" +
        mairies.map(m => [
          sanitizeCsvCell(m.id),
          sanitizeCsvCell(m.name),
          sanitizeCsvCell(m.region),
          sanitizeCsvCell(m.district || ''),
          sanitizeCsvCell(m.leader_name || ''),
          m.total_budget_fcfa || 0,
          m.budget_functioning_fcfa || 0,
          m.budget_investment_fcfa || 0,
          sanitizeCsvCell(m.contact_email || ''),
          sanitizeCsvCell(m.contact_phone || ''),
          sanitizeCsvCell(m.info_officer_name || ''),
          sanitizeCsvCell(m.info_officer_email || '')
        ].join(';')).join('\n');
    } else if (type === 'REGIONS') {
      filename = `SuiviBudget_CI_31_Regions_2_Districts_${new Date().getFullYear()}.csv`;
      const regions = institutions.filter(i => i.type === 'REGION' || i.type === 'DISTRICT');
      csvContent = "ID;Entite;Type;Chef_Lieu;President;Budget_Total_FCFA;Contact_Email;Contact_Tel;RI_Nom\n" +
        regions.map(r => [
          sanitizeCsvCell(r.id),
          sanitizeCsvCell(r.name),
          sanitizeCsvCell(r.type),
          sanitizeCsvCell(r.departement || ''),
          sanitizeCsvCell(r.leader_name || ''),
          r.total_budget_fcfa || 0,
          sanitizeCsvCell(r.contact_email || ''),
          sanitizeCsvCell(r.contact_phone || ''),
          sanitizeCsvCell(r.info_officer_name || '')
        ].join(';')).join('\n');
    } else {
      filename = `SuiviBudget_CI_Repertoire_CAIDP_RI_${new Date().getFullYear()}.csv`;
      const caidp = dataStore.getCaidpDirectory();
      csvContent = "ID;Organisme;Categorie;Region;RI_Nom;RI_Fonction;Email;Telephone\n" +
        caidp.map(c => [
          sanitizeCsvCell(c.id),
          sanitizeCsvCell(c.company_name),
          sanitizeCsvCell(c.category),
          sanitizeCsvCell(c.region || ''),
          sanitizeCsvCell(c.ri_name || 'Non désigné'),
          sanitizeCsvCell(c.ri_function || ''),
          sanitizeCsvCell(c.email || ''),
          sanitizeCsvCell(c.phone || '')
        ].join(';')).join('\n');
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <footer className="bg-slate-100 text-slate-700 border-t border-slate-200 text-xs overflow-hidden selection:bg-brand-orange selection:text-white">
      
      {/* ========================================================================= */}
      {/* 1. COMPACT CITIZEN ACTION & NEWSLETTER BAR */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-50/80 via-sky-50/60 to-amber-50/50 border-b border-slate-200/80 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left : Value Prop & Action Buttons */}
          <div className="lg:col-span-6 space-y-2.5">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Suivez les budgets & chantiers publics en Côte d'Ivoire
            </h2>

            <p className="text-slate-600 text-xs leading-relaxed max-w-xl">
              Alertes citoyennes, chantiers de votre commune et guides d'accès aux documents publics (Loi CAIDP).
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-all cursor-pointer shadow-2xs"
              >
                <Mail className="w-3.5 h-3.5 text-slate-600" />
                <span>Contact : {contactEmail}</span>
              </a>
            </div>
          </div>

          {/* Right : Compact Subscription Box */}
          <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            {subscribed ? (
              <div className="flex items-center gap-3 py-1 text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-xs">
                  <strong>Inscription confirmée !</strong> Vous recevrez nos alertes et synthèses budgétaires.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Recevoir les alertes par email</span>
                  <span className="text-[10px] text-slate-500">Commune & décryptages</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Votre prénom"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <select
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-brand-blue focus:bg-white"
                    >
                      <option value="">Commune (optionnel)</option>
                      {communesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4 flex gap-1">
                    <input
                      type="email"
                      required
                      placeholder="Email *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:bg-white"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="S'abonner aux alertes"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-rose-600 text-[11px] font-semibold">{errorMessage}</p>
                )}
              </form>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT RESOURCES GRID (2x2 on Mobile, 4 Cols on Desktop) */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto py-7 px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Column 1 : Mission & Identity */}
        <div className="col-span-2 sm:col-span-1 space-y-2">
          <span className="font-extrabold text-slate-900 text-xs block">SuiviBudget Côte d'Ivoire</span>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Observatoire citoyen pour la transparence budgétaire et le suivi des investissements publics (LFI 2026).
          </p>
          
          <div className="pt-1 text-[11px] space-y-1">
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent("[Signalement Erreur] Donnée à rectifier")}`}
              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Signaler une erreur</span>
            </a>
            <br />
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent("[Contribution] Proposition d'aide / Partenariat")}`}
              className="inline-flex items-center gap-1 text-brand-blue hover:text-blue-900 font-semibold cursor-pointer"
            >
              <HeartHandshake className="w-3 h-3 text-brand-blue" />
              <span>Proposer une contribution</span>
            </a>
            {/* Official Community Channels (The ONLY consolidated place) */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Rejoindre la communauté :
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="https://whatsapp.com/channel/0029VaSuiviBudgetCIRepublic" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all text-xs font-bold shadow-2xs cursor-pointer group"
                  title="Rejoindre notre canal WhatsApp officiel"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#25D366" d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.95.56 3.77 1.53 5.31L2.2 21.8a.5.5 0 0 0 .61.61l4.57-1.34a9.96 9.96 0 0 0 4.62 1.14c5.52 0 10-4.48 10-10.004C22.004 6.48 17.524 2 12.004 2z"/>
                    <path fill="#FFFFFF" d="M17.47 14.38c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78 1-.95 1.2-.18.2-.35.23-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.68-2.09-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.63-.92-2.23-.25-.6-.5-.51-.68-.52h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35z"/>
                  </svg>
                  <span>WhatsApp</span>
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61593791261798"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all text-xs font-bold shadow-2xs cursor-pointer group"
                  title="Rejoindre notre page Facebook officielle"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    <path fill="#FFFFFF" d="M16.671 15.457l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.542V4.91s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.227H7.078v3.47h3.076V23.93c.613.096 1.24.143 1.875.143s1.262-.047 1.875-.143v-8.473h2.767z"/>
                  </svg>
                  <span>Facebook</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2 : Open Data & Datasets */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-brand-orange" />
            <span>Open Data (CSV)</span>
          </h4>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <button
                onClick={() => handleExportCsv('COMMUNES')}
                className="hover:text-brand-orange transition-colors flex items-center gap-1 text-left text-slate-600 cursor-pointer"
              >
                <Download className="w-3 h-3 text-slate-400" />
                <span>201 Communes & Maires</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => handleExportCsv('REGIONS')}
                className="hover:text-brand-orange transition-colors flex items-center gap-1 text-left text-slate-600 cursor-pointer"
              >
                <Download className="w-3 h-3 text-slate-400" />
                <span>31 Régions & 2 Districts</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => handleExportCsv('CAIDP')}
                className="hover:text-brand-orange transition-colors flex items-center gap-1 text-left text-slate-600 cursor-pointer"
              >
                <Download className="w-3 h-3 text-slate-400" />
                <span>Répertoire Officiel CAIDP</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3 : Citizen Tools & Rights */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3 h-3 text-brand-blue" />
            <span>Outils Citoyens</span>
          </h4>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <button
                onClick={() => {
                  onNavigateTab('institutions');
                  if (onOpenDocModal) onOpenDocModal();
                }}
                className="hover:text-brand-blue transition-colors flex items-center gap-1 text-slate-600 cursor-pointer text-left"
              >
                <FileText className="w-3 h-3 text-brand-blue" />
                <span>Demande de Documents (CAIDP)</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigateTab('observatory')}
                className="hover:text-emerald-700 transition-colors flex items-center gap-1 text-slate-600 cursor-pointer text-left"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Observatoire & Constats</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigateTab('institutions')}
                className="hover:text-brand-orange transition-colors flex items-center gap-1 text-slate-600 cursor-pointer text-left"
              >
                <Landmark className="w-3 h-3 text-brand-orange" />
                <span>Budgets des 201 Mairies</span>
              </button>
            </li>
            <li>
              <a
                href="https://caidp.ci"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-700 transition-colors flex items-center gap-1 text-slate-600"
              >
                <ExternalLink className="w-3 h-3 text-slate-400" />
                <span>Portail CAIDP (caidp.ci)</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4 : Republican Legal Framework */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
            <span>Cadre Légal</span>
          </h4>
          <ul className="space-y-1 text-[11px] text-slate-600">
            <li>• Loi de Finances 2026 (15 339,2 Mrds)</li>
            <li>• Loi n°2013-867 Accès à l'Information</li>
            <li>• Code des Collectivités (Loi n°2012-1128)</li>
            <li>• Cour des Comptes de Côte d'Ivoire</li>
          </ul>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. COMPACT BOTTOM BAR (Mobile Bottom Nav Safe) */}
      {/* ========================================================================= */}
      <div className="border-t border-slate-200 bg-slate-200/60 py-3.5 px-4 sm:px-6 lg:px-8 pb-20 sm:pb-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px]">
          
          <div className="flex items-center gap-2 text-slate-600 text-center sm:text-left flex-wrap justify-center sm:justify-start">
            <span className="font-semibold text-slate-800">© {new Date().getFullYear()} SuiviBudget CI</span>
            <span className="text-slate-400">•</span>
            <span>Données ouvertes et réutilisables</span>
            <span className="text-slate-400">•</span>
            <a 
              href="https://creativecommons.org/licenses/by/4.0/deed.fr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 underline"
            >
              CC-BY 4.0
            </a>
          </div>

          <button
            onClick={() => onNavigateTab(activeTab === 'admin' ? 'home' : 'admin')}
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 font-mono text-[10px] cursor-pointer"
            title="Accès administration sécurisé (Raccourci: Ctrl+Shift+A)"
          >
            <Lock className="w-3 h-3 text-slate-500" />
            <span>{activeTab === 'admin' ? '← Retour au Site' : 'Administration'}</span>
          </button>

        </div>
      </div>

    </footer>
  );
};
