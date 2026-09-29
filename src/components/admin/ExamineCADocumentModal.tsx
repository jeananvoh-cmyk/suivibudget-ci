// =========================================================================
// COMPOSANT : MODAL D'EXAMEN & WORKFLOW DE VALIDATION D'UN CA
// SuiviBudget Côte d'Ivoire - Découplage Validation/Publication & Audit
// =========================================================================

import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  Globe, 
  Archive, 
  ExternalLink, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Building2, 
  Calendar,
  Layers,
  Edit
} from 'lucide-react';
import { PublicDocument, DocumentLifecycleStatus } from '../../types';
import { dataStore } from '../../services/dataStore';
import { supabase } from '../../services/supabase';
import { isSafeUrl } from '../../utils/security';

interface ExamineCADocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: PublicDocument;
  onOpenEdit: (doc: PublicDocument) => void;
  onStatusChange: (docId: string, newStatus: DocumentLifecycleStatus) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExamineCADocumentModal: React.FC<ExamineCADocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  onOpenEdit,
  onStatusChange,
  onShowToast,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Verification Checklist State
  const [checks, setChecks] = useState({
    formatValid: false,
    deliberationAttached: false,
    tutelleApproved: Boolean(document?.approval_reference || document?.approval_date),
    balancesCoherent: false,
  });

  if (!isOpen || !document) return null;

  const handleCopyHash = () => {
    if (!document.checksum_sha256) return;
    navigator.clipboard.writeText(document.checksum_sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
    onShowToast('Empreinte SHA-256 copiée dans le presse-papier.');
  };

  const handleUpdateStatus = async (newStatus: DocumentLifecycleStatus) => {
    setIsProcessing(true);
    try {
      if (newStatus === 'VERIFIED' && !checks.formatValid) throw new Error('Confirmez la vérification du document source.');
      const ok = await dataStore.updateDocumentLifecycleStatus(document.id, newStatus);
      if (ok) {
        onStatusChange(document.id, newStatus);
        if (newStatus === 'VERIFIED') {
          onShowToast('Document validé et marqué "VÉRIFIÉ". Il n\'est pas encore visible publiquement.');
        } else if (newStatus === 'PUBLISHED') {
          onShowToast('Document PUBLIÉ avec succès ! Il est maintenant accessible aux citoyens.', 'success');
        } else if (newStatus === 'TO_VERIFY') {
          onShowToast('Document renvoyé en examen ("À VÉRIFIER").');
        } else if (newStatus === 'ARCHIVED') {
          onShowToast('Document archivé.');
        }
        onClose();
      }
    } catch (e: any) {
      onShowToast(`Erreur : ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentStatus = document.status || 'TO_VERIFY';
  const previousVersions = dataStore.getDocumentVersions(document).filter(d => (d.version || 1) < (document.version || 1));
  const openSource = async (source: PublicDocument) => {
    try {
      let url = source.file_url;
      if (source.storage_path) {
        const { data, error } = await supabase.storage.from('public_documents').createSignedUrl(source.storage_path, 300);
        if (error || !data) throw new Error('Lien temporaire indisponible.');
        url = data.signedUrl;
      }
      if (!isSafeUrl(url)) throw new Error('Lien documentaire invalide.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'Document inaccessible.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-brand-blue/10 text-brand-blue">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">
                  Examen du Compte Administratif
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-brand-blue">
                  Exercice {document.fiscal_year || document.year} • v{document.version || 1}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {document.institution_name} ({document.institution_type === 'REGION' ? 'Conseil Régional' : 'Commune'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-600">Statut actuel :</div>
              {currentStatus === 'TO_VERIFY' && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  À VÉRIFIER (En attente d'audit)
                </span>
              )}
              {currentStatus === 'VERIFIED' && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-brand-blue flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                  VÉRIFIÉ (Conforme • Non publié)
                </span>
              )}
              {currentStatus === 'PUBLISHED' && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  PUBLIÉ (En ligne pour les citoyens)
                </span>
              )}
              {currentStatus === 'ARCHIVED' && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-purple-600" />
                  ARCHIVÉ (Ancienne version)
                </span>
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenEdit(document);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>Modifier</span>
            </button>
          </div>

          {/* Document File & Actions */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fichier PDF</div>
                <div className="font-mono text-sm font-black text-slate-900 mt-0.5 break-all">
                  {document.file_name}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>Taille : <strong>{document.file_size || 'Non renseignée'}</strong></span>
                  <span>•</span>
                  <span>Source : <strong>{document.source_name || 'Non spécifiée'}</strong></span>
                </div>
              </div>

              <button type="button"
                onClick={() => void openSource(document)}
                className="px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Ouvrir le PDF</span>
              </button>
            </div>

            {/* Checksum SHA-256 */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold">Empreinte numérique (SHA-256) :</span>
                <button
                  onClick={handleCopyHash}
                  className="text-brand-blue hover:underline flex items-center gap-1 text-[11px] font-semibold"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
                {document.checksum_sha256 || 'Aucun checksum calculé (document antérieur)'}
              </div>
            </div>

            {/* Canonical Storage Path */}
            {document.storage_path && (
              <div className="text-[11px] text-slate-500 font-mono">
                <span className="font-semibold text-slate-600">Chemin canonique :</span> {document.storage_path}
              </div>
            )}
          </div>

          {/* Mentions Légales & Approbation de Tutelle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block font-semibold">Référence d'approbation tutelle :</span>
              <strong className="text-slate-900 mt-1 block">
                {document.approval_reference || 'Non renseignée'}
              </strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block font-semibold">Date d'approbation (DGDDL / Préfet) :</span>
              <strong className="text-slate-900 mt-1 block">
                {document.approval_date || 'Non renseignée'}
              </strong>
            </div>

            {document.verified_by && (
              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 text-brand-blue">
                <span className="block font-semibold">Vérifié par :</span>
                <div className="font-bold mt-0.5">
                  {document.verified_by} le {document.verified_at ? new Date(document.verified_at).toLocaleDateString('fr-FR') : ''}
                </div>
              </div>
            )}
          </div>

          {/* Grille de Vérification & Conformité */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
            <div className="text-xs font-black text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-blue" />
              <span>Grille de vérification & audit de conformité</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.formatValid}
                  onChange={(e) => setChecks(prev => ({ ...prev, formatValid: e.target.checked }))}
                  className="rounded text-brand-blue focus:ring-brand-blue w-4 h-4"
                />
                <span>Document PDF lisible, officiel et complet (sans pages manquantes).</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.deliberationAttached}
                  onChange={(e) => setChecks(prev => ({ ...prev, deliberationAttached: e.target.checked }))}
                  className="rounded text-brand-blue focus:ring-brand-blue w-4 h-4"
                />
                <span>Délibération du Conseil municipal ou régional d'adoption présente.</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.tutelleApproved}
                  onChange={(e) => setChecks(prev => ({ ...prev, tutelleApproved: e.target.checked }))}
                  className="rounded text-brand-blue focus:ring-brand-blue w-4 h-4"
                />
                <span>Arrêté d'approbation légale de l'autorité de tutelle (DGDDL ou Préfecture).</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.balancesCoherent}
                  onChange={(e) => setChecks(prev => ({ ...prev, balancesCoherent: e.target.checked }))}
                  className="rounded text-brand-blue focus:ring-brand-blue w-4 h-4"
                />
                <span>Totaux des mandats et titres émis concordants avec le budget voté.</span>
              </label>
            </div>
          </div>

          {/* Historique des Versions */}
          {previousVersions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Versions précédentes ({previousVersions.length})</span>
              </div>
              <div className="space-y-1.5">
                {previousVersions.map((ver, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">Version {ver.version}</span>
                      <span className="text-slate-400 text-[11px] ml-2 font-mono">{ver.file_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        {ver.status === 'ARCHIVED' ? 'Archivée' : ver.status === 'PUBLISHED' ? 'Publiée' : 'Non publiée'}
                      </span>
                      <button type="button"
                        onClick={() => void openSource(ver)}
                        className="text-brand-blue hover:underline text-[11px] font-bold"
                      >
                        Voir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Decoupled Workflow) */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentStatus === 'PUBLISHED' ? (
              <button
                type="button"
                onClick={() => handleUpdateStatus('TO_VERIFY')}
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                Dépublier (Renvoyer en examen)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpdateStatus('ARCHIVED')}
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors"
              >
                Archiver
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {currentStatus === 'TO_VERIFY' && (
              <button
                type="button"
                onClick={() => handleUpdateStatus('VERIFIED')}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl border border-brand-blue text-brand-blue hover:bg-blue-50 text-xs font-black transition-colors"
              >
                Valider (Marquer VÉRIFIÉ)
              </button>
            )}

            {currentStatus !== 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => handleUpdateStatus('PUBLISHED')}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black transition-colors shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publier sur la plateforme</span>
              </button>
            )}

            {currentStatus === 'PUBLISHED' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
