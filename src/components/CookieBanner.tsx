import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, Check, ExternalLink, Info } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if consent has already been given or refused
    const consent = localStorage.getItem('suivibudget_cookie_consent');
    if (!consent) {
      // Small 800ms delay for smooth entrance
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('suivibudget_cookie_consent', 'ALL');
    setIsOpen(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem('suivibudget_cookie_consent', 'ESSENTIAL');
    setIsOpen(false);
  };

  if (!isOpen && !showModal) return null;

  return (
    <>
      {/* Floating Bottom Cookie Banner (Safe from mobile BottomNav) */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white/95 backdrop-blur-md text-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_12px_36px_rgba(15,23,42,0.12)] border border-slate-200/90 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center flex-shrink-0 border border-blue-100/80">
                  <Cookie className="w-4 h-4 text-brand-orange" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black tracking-tight text-slate-900">
                    Transparence & Vie Privée
                  </h4>
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Conforme Loi n° 2013-450 (ARTCI)
                  </span>
                </div>
              </div>
              <button
                onClick={handleAcceptEssential}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fermer (Essentiels uniquement)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-medium">
              SuiviBudget CI est une initiative citoyenne d'intérêt public. Nous n'utilisons <strong>aucun traceur publicitaire intrusif</strong>. Seuls des témoins techniques de session et de mesure d'audience anonymes sont employés.
            </p>

            <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={handleAcceptAll}
                className="w-full sm:flex-1 py-2 px-3.5 bg-brand-blue hover:bg-brand-blue-dark active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Accepter & Continuer
              </button>

              <button
                onClick={handleAcceptEssential}
                className="w-full sm:w-auto py-2 px-3.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
              >
                Essentiels seuls
              </button>

              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-slate-500 hover:text-brand-blue underline sm:no-underline sm:hover:underline py-1 px-1.5 cursor-pointer flex-shrink-0 font-semibold transition-colors"
              >
                Détails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Privacy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 my-8 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  Politique de Cookies & Données Personnelles
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
                <span className="font-bold text-brand-blue block text-xs">
                  Notre Engagement Citoyen : 100% Non Commercial
                </span>
                <p className="text-[11px] text-slate-600">
                  SuiviBudget CI n'a aucun modèle commercial basé sur la publicité. Vos données ne sont jamais vendues, louées ni partagées avec des tiers publicitaires.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Catégories de Cookies Utilisés :
                </h4>
                
                <div className="border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">1. Cookies Techniques & Session (Indispensables)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Actif</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Mémorisation de vos préférences de tri, de votre commune favorite et persistance sécurisée de votre navigation.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">2. Mesure d'Audience Anonyme</span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Optionnel</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Statistiques agrégées et anonymisées pour mesurer l'intérêt citoyen par région et améliorer l'application.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">3. Traceurs Publicitaires Tiers</span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Aucun (0%)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Nous n'utilisons aucun traceur Google Ads, Meta Pixel ou régie publicitaire.
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 pt-1">
                Conformément à la Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel sous l'égide de l'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI).
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => {
                  handleAcceptAll();
                  setShowModal(false);
                }}
                className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-bold transition-all"
              >
                Compris & Accepter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
