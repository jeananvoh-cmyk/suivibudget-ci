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
    if (typeof window === 'undefined') return `https://suivibudget-ci.vercel.app/projets?project=${project.id}`;
    const url = new URL(window.location.origin);
    url.pathname = '/projets';
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
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#25D366" d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.95.56 3.77 1.53 5.31L2.2 21.8a.5.5 0 0 0 .61.61l4.57-1.34a9.96 9.96 0 0 0 4.62 1.14c5.52 0 10-4.48 10-10.004C22.004 6.48 17.524 2 12.004 2z"/>
                  <path fill="#FFFFFF" d="M17.47 14.38c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78 1-.95 1.2-.18.2-.35.23-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.68-2.09-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.63-.92-2.23-.25-.6-.5-.51-.68-.52h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35z"/>
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

          <div className="pt-2 text-center">
            <a
              href="https://www.facebook.com/profile.php?id=61593791261798"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#1877F2] hover:underline inline-flex items-center gap-1.5"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>Rejoindre notre page officielle Facebook</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
