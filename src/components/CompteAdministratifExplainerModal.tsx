import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  CheckCircle2, 
  Scale, 
  FileText, 
  TrendingUp, 
  Layers, 
  AlertTriangle, 
  Search, 
  ShieldCheck, 
  BookOpen, 
  ExternalLink 
} from 'lucide-react';
import { BUDGET_GLOSSARY, GlossaryItem, searchGlossary } from '../data/budgetGlossary';

interface CompteAdministratifExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchQuery?: string;
}

export const CompteAdministratifExplainerModal: React.FC<CompteAdministratifExplainerModalProps> = ({
  isOpen,
  onClose,
  initialSearchQuery = '',
}) => {
  const [glossaryQuery, setGlossaryQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'EXECUTION' | 'BUDGET' | 'PROCUREMENT' | 'ACCOUNTING' | 'CITIZEN'>('ALL');

  if (!isOpen) return null;

  const filteredGlossary = searchGlossary(glossaryQuery).filter(item => 
    selectedCategory === 'ALL' || item.category === selectedCategory
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-brand-blue-dark to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-0.5">
                <BookOpen className="w-3 h-3" />
                <span>Guide Républicain & Pédagogique</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Comprendre le Compte Administratif (CA)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm">
          
          {/* Section 1 : Qu'est-ce qu'un Compte Administratif ? */}
          <div className="bg-blue-50/60 rounded-2xl p-4 sm:p-5 border border-blue-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-blue flex-shrink-0" />
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                1. Qu'est-ce qu'un Compte Administratif ?
              </h3>
            </div>
            <p className="leading-relaxed text-slate-700">
              Le <strong>Compte Administratif (CA)</strong> est le <strong>bilan financier officiel définitif</strong> de l'exercice budgétaire écoulé (du 1er janvier au 31 décembre).
            </p>
            <p className="leading-relaxed text-slate-700">
              Il est dressé par l'ordonnateur territorial (le <strong>Maire</strong> pour une commune ou le <strong>Président</strong> pour un conseil régional) et retrace fidèlement :
            </p>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-700">
              <li>L'ensemble des <strong>recettes effectivement recouvrées</strong> (impôts locaux reversés par la DGI, taxes municipales, subventions étatiques).</li>
              <li>L'ensemble des <strong>dépenses réellement engagées et mandatées</strong> (salaires, charges de fonctionnement, factures d'équipements et travaux).</li>
              <li>Le <strong>résultat financier de clôture</strong> (excédent ou déficit reporté sur l'exercice suivant).</li>
            </ul>
            <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs text-brand-blue-dark font-medium flex items-start gap-2">
              <Scale className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-blue" />
              <span>
                <strong>Contrôle légal :</strong> Le Compte Administratif est voté par le Conseil municipal ou régional au plus tard le 31 mars de l'année n+1, puis soumis au contrôle de légalité du Préfet (tutelle administrative) et au compte de gestion du Trésor Public.
              </span>
            </div>
          </div>

          {/* Section 2 : Tableau Comparatif BP vs CA */}
          <div className="space-y-3">
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              2. Budget Primitif (BP) vs Compte Administratif (CA) : La Différence Clé
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Critère</th>
                    <th className="p-3 bg-blue-50/50 text-brand-blue">Budget Primitif (BP)</th>
                    <th className="p-3 bg-emerald-50/50 text-emerald-800">Compte Administratif (CA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Nature</td>
                    <td className="p-3 bg-blue-50/20 text-slate-700">Prévision & Autorisation</td>
                    <td className="p-3 bg-emerald-50/20 text-slate-700">Constatation Réelle & Clôture</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Moment du vote</td>
                    <td className="p-3 bg-blue-50/20 text-slate-700">Avant ou au début de l'année</td>
                    <td className="p-3 bg-emerald-50/20 text-slate-700">Après la clôture de l'année (avant fin mars)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Que représente le montant ?</td>
                    <td className="p-3 bg-blue-50/20 text-slate-700">Plafond maximum de dépense autorisé</td>
                    <td className="p-3 bg-emerald-50/20 text-slate-700">Montant réellement dépensé et mandaté</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-900">Portée citoyenne</td>
                    <td className="p-3 bg-blue-50/20 text-slate-700">« Ce que les élus ont promis et voté »</td>
                    <td className="p-3 bg-emerald-50/20 text-slate-700">« Ce qui a été effectivement réalisé sur le terrain »</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3 : Comment est calculé le Taux d'Exécution ? */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-orange" />
              3. Comment est calculé le Taux d'Exécution ?
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Le taux d'exécution mesure le degré de concrétisation budgétaire. Sur SuiviBudget CI, il est <strong>calculé mathématiquement en temps réel</strong> selon la formule officielle :
            </p>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center font-mono font-bold text-xs sm:text-sm text-slate-900 shadow-2xs">
              Taux d'exécution (%) = ( Dépenses Réalisées / Crédits Prévus Votés ) × 100
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Exécution Élevée</span>
                <span className="text-sm font-black text-emerald-700">≥ 80 %</span>
                <p className="text-[11px] text-slate-600 mt-1">Programme d'investissements largement exécuté.</p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Exécution Modérée</span>
                <span className="text-sm font-black text-amber-700">50 % à 79 %</span>
                <p className="text-[11px] text-slate-600 mt-1">Chantiers partiellement reportés ou étalés.</p>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Faible Exécution</span>
                <span className="text-sm font-black text-rose-700">&lt; 50 %</span>
                <p className="text-[11px] text-slate-600 mt-1">Retards de trésorerie, passation ou blocages fonciers.</p>
              </div>
            </div>
          </div>

          {/* Section 4 : Le Rapprochement avec les Marchés Publics (DGMP) */}
          <div className="bg-amber-50/50 rounded-2xl p-4 sm:p-5 border border-amber-200/80 space-y-3">
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              4. Le Rapprochement avec la DGMP (Direction Générale des Marchés Publics)
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Pour chaque opération d'investissement inscrite au Compte Administratif, SuiviBudget effectue un rapprochement avec les avis et attributions du portail officiel des marchés publics de Côte d'Ivoire :
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
                  Correspondance Forte
                </span>
                <p className="text-slate-700">
                  L'avis d'appel d'offres (AOO), le numéro de marché DGMP, l'entreprise titulaire et le montant attribué ont été retrouvés et recoupés avec certitude.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                  Correspondance Partielle
                </span>
                <p className="text-slate-700">
                  Projet recoupé avec un marché connu, mais dont le libellé exact ou la décomposition par lot ou exercice financier présente une nuance technique.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300 flex-shrink-0">
                  Non Retrouvé sur DGMP
                </span>
                <div className="space-y-1">
                  <p className="text-slate-700">
                    <strong>Règle républicaine d'équité :</strong> « Non retrouvé » ne signifie <strong>pas</strong> que le marché n'existe pas.
                  </p>
                  <p className="text-[11px] text-slate-500 italic">
                    Les travaux réalisés en régie directe communale, par bons de commande sous les seuils légaux d'appel d'offres DGMP ou par entente directe autorisée ne font pas obligatoirement l'objet d'un avis d'attribution au Bulletin Officiel.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5 : Glossaire Intégré avec Recherche */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-blue" />
                5. Glossaire Citoyen des Finances Locales ({filteredGlossary.length} définitions)
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un terme (ex: ordonnateur, mandatement, DGF, régie...)"
                  value={glossaryQuery}
                  onChange={(e) => setGlossaryQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-[11px]">
                {(['ALL', 'EXECUTION', 'BUDGET', 'PROCUREMENT', 'ACCOUNTING', 'CITIZEN'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'Tous' :
                     cat === 'EXECUTION' ? 'Exécution' :
                     cat === 'BUDGET' ? 'Budget' :
                     cat === 'PROCUREMENT' ? 'Marchés' :
                     cat === 'ACCOUNTING' ? 'Comptabilité' : 'Citoyen'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredGlossary.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{item.term}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-normal leading-snug">{item.short_definition}</p>
                  <p className="text-[11px] text-brand-blue font-medium leading-snug">{item.citizen_explanation}</p>
                  {item.warning && (
                    <div className="flex items-start gap-1 text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 mt-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
                      <span>{item.warning}</span>
                    </div>
                  )}
                </div>
              ))}
              {filteredGlossary.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400 italic">
                  Aucun terme correspondant à « {glossaryQuery} ».
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            Conforme aux normes de comptabilité publique et au Code Général des Collectivités Territoriales de Côte d'Ivoire.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};
