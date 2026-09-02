import React, { useState } from 'react';
import { BudgetProject } from '../types';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Facebook, 
  Twitter, 
  Linkedin,
  ExternalLink
} from 'lucide-react';
import { 
  generateWhatsAppMessage, 
  generateFacebookPost, 
  generateTwitterPost, 
  generateLinkedInPost 
} from '../utils/socialTemplates';

interface ShareModalProps {
  project: BudgetProject | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !project) return null;

  const [copied, setCopied] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'whatsapp' | 'facebook' | 'twitter' | 'linkedin'>('whatsapp');

  const getActiveText = () => {
    switch (selectedFormat) {
      case 'whatsapp':
        return generateWhatsAppMessage(project);
      case 'facebook':
        return generateFacebookPost(project);
      case 'twitter':
        return generateTwitterPost(project);
      case 'linkedin':
        return generateLinkedInPost(project);
    }
  };

  const currentText = getActiveText();

  const getProjectDirectUrl = () => {
    if (typeof window === 'undefined') return `https://civicdata.ci/?tab=projects&project=${project.id}`;
    const url = new URL(window.location.origin);
    url.searchParams.set('tab', 'projects');
    url.searchParams.set('project', project.id);
    return url.toString();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText + "\n\n🔗 Consulter ce projet : " + getProjectDirectUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppMessage(project) + "\n\n🔗 Lien officiel : " + getProjectDirectUrl());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleDirectTwitter = () => {
    const text = encodeURIComponent(generateTwitterPost(project) + "\n" + getProjectDirectUrl());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleDirectFacebook = () => {
    const url = encodeURIComponent(getProjectDirectUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      
      <div 
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-navy-900 to-navy-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-terracotta-500/20 border border-terracotta-500/30 flex items-center justify-center text-terracotta-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Partager ce projet citoyen
              </h3>
              <p className="text-xs text-slate-400">
                Alertez vos proches et vos réseaux sur l'argent public
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Quick Direct Social Buttons */}
          <div>
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Partage direct en 1 clic
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleDirectWhatsApp}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleDirectFacebook}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Facebook className="w-4 h-4" />
                <span>Facebook</span>
              </button>

              <button
                onClick={handleDirectTwitter}
                className="py-2.5 px-3 bg-slate-900 hover:bg-black active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Twitter className="w-4 h-4" />
                <span>X (Twitter)</span>
              </button>
            </div>
          </div>

          {/* Social Platform Tab Selectors */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Message pré-rédigé personnalisé
              </span>
              <span className="text-[11px] text-terracotta-600 font-semibold">Prêt à copier</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedFormat('whatsapp')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  selectedFormat === 'whatsapp' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('facebook')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  selectedFormat === 'facebook' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Facebook
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('twitter')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  selectedFormat === 'twitter' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                X / Twitter
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('linkedin')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  selectedFormat === 'linkedin' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                LinkedIn
              </button>
            </div>

            {/* Generated Text Box */}
            <div className="mt-2.5 relative">
              <textarea
                readOnly
                rows={6}
                value={currentText}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none select-all"
              />
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-navy-900 hover:bg-navy-800 text-white shadow-md'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Texte copié dans le presse-papier !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-terracotta-400" />
                <span>Copier le texte du message</span>
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};
