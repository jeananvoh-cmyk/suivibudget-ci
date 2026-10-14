// =========================================================================
// COMPOSANT : MODAL D'EXAMEN & WORKFLOW DE VALIDATION D'UN CA
// SuiviBudget Côte d'Ivoire - Découplage Validation/Publication & Audit
// =========================================================================

import React, { useEffect, useState } from 'react';
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
import { PublicDocument, DocumentLifecycleStatus, DocumentPartInfo } from '../../types';
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
  const [openingPartIndex, setOpeningPartIndex] = useState<number | null>(null);

  // Authentication & RBAC status
  const auth = dataStore.getAuthState();
  const isStaff = auth.role === 'ADMIN' || auth.role === 'DATA_MANAGER';
  const canPublish = auth.role === 'ADMIN' || auth.role === 'DATA_MANAGER';

  // Verification Checklist State
  const [checks, setChecks] = useState({
    formatValid: false,
    deliberationAttached: false,
    tutelleApproved: Boolean(document?.approval_reference || document?.approval_date),
    balancesCoherent: false,
    pageRanges: false,
  });

  // Réinitialiser les cases lors de chaque examen : ne jamais réutiliser
  // involontairement les contrôles confirmés pour un document précédent.
  useEffect(() => {
    if (!isOpen || !document) return;
    setChecks({
      formatValid: false,
      deliberationAttached: false,
      tutelleApproved: Boolean(document.approval_reference || document.approval_date),
      balancesCoherent: false, pageRanges: false,
    });
  }, [isOpen, document?.id, document?.approval_reference, document?.approval_date]);

  if (!isOpen || !document) return null;

  const handleCopyHash = () => {
    if (!document.manifest_sha256 && !document.checksum_sha256) return;
    navigator.clipboard.writeText(document.manifest_sha256 || document.checksum_sha256 || '');
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
    onShowToast('Empreinte copiée dans le presse-papier.');
  };

  const handleUpdateStatus = async (newStatus: DocumentLifecycleStatus) => {
    setIsProcessing(true);
    try {
      if (newStatus === 'VERIFIED' && (!checks.formatValid || (document.is_multipart && !checks.pageRanges))) {
        throw new Error('Confirmez la vérification du document source dans la grille de contrôle.');
      }
      if (!isStaff) {
        throw new Error('Action non autorisée : permissions insuffisantes (administrateur ou modérateur requis).');
      }
      if (newStatus === 'PUBLISHED' && !canPublish) {
        throw new Error('Action non autorisée : la publication officielle requiert les droits administrateur ou gestionnaire de données.');
      }

      const ok = await dataStore.updateDocumentLifecycleStatus(document.id, newStatus);
      if (ok) {
        onStatusChange(document.id, newStatus);
        if (newStatus === 'VERIFIED') {
          onShowToast('Document validé et marqué "VÉRIFIÉ". Prêt pour la publication officielle.', 'success');
        } else if (newStatus === 'PUBLISHED') {
          onShowToast('Document PUBLIÉ avec succès ! Il est maintenant accessible aux citoyens.', 'success');
        } else if (newStatus === 'TO_VERIFY') {
          onShowToast('Document renvoyé en examen ("À VÉRIFIER").', 'info');
        } else if (newStatus === 'ARCHIVED') {
          onShowToast('Document archivé.', 'info');
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
      const targetStoragePath = source.storage_path || (source.document_parts && source.document_parts[0]?.storage_path);
      const targetFileUrl = source.file_url || (source.document_parts && source.document_parts[0]?.file_url);
      let url = targetFileUrl;
      if (targetStoragePath) {
        const { data, error } = await supabase.storage
          .from(source.storage_bucket || 'public_documents')
          .createSignedUrl(targetStoragePath, 300);
        if (error || !data?.signedUrl) throw new Error('Lien temporaire indisponible.');
        url = data.signedUrl;
      }
      if (!url || !isSafeUrl(url)) throw new Error('Lien documentaire invalide.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'Document inaccessible.', 'error');
    }
  };

  const openPart = async (part: DocumentPartInfo, index: number) => {
    setOpeningPartIndex(index);
    try {
      let url = part.file_url;
      if (part.storage_path) {
        const { data, error } = await supabase.storage
          .from(document.storage_bucket || 'public_documents')
          .createSignedUrl(part.storage_path, 300);
        if (error || !data?.signedUrl) throw new Error(`Lien temporaire indisponible pour le volet ${part.part_number}.`);
        url = data.signedUrl;
      }
      if (!url || !isSafeUrl(url)) throw new Error('Lien documentaire invalide.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'Volet inaccessible.', 'error');
    } finally {
      setOpeningPartIndex(null);
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
            aria-label="Fermer la modal"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fichier PDF Principal</div>
                <div className="font-mono text-sm font-black text-slate-900 mt-0.5 break-all">
                  {document.file_name}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                  <span>Taille : <strong>{document.file_size || 'Non renseignée'}</strong></span>
                  <span>•</span>
                  <span>Source : <strong>{document.source_name || 'Non spécifiée'}</strong></span>
                  {document.page_count && (
                    <>
                      <span>•</span>
                      <span>Pages : <strong>{document.page_count}</strong></span>
                    </>
                  )}
                  {document.is_scanned && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Scan raster (sans couche texte)
                    </span>
                  )}
                  {document.is_multipart && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-brand-blue">
                      Document multi-volets ({document.parts_count || document.document_parts?.length || 2} parties)
                    </span>
                  )}
                </div>
              </div>

              <button type="button"
                onClick={() => void openSource(document)}
                className="px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{document.is_multipart ? 'Ouvrir (Volet 1)' : 'Ouvrir le PDF'}</span>
              </button>
            </div>

            {/* Volets multi-parties si existants */}
            {document.is_multipart && document.document_parts && document.document_parts.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Fascicules & volets du document ({document.document_parts.length}) :</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Chaque volet dispose de son empreinte et de son lien vérifiable
                  </span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {document.document_parts.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-brand-blue/10 text-brand-blue">
                              Volet {p.part_number}
                            </span>
                            <span className="text-slate-800 font-semibold">{p.page_range}</span>
                          </span>
                          {p.file_size_bytes ? (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {(p.file_size_bytes / 1024 / 1024).toFixed(2)} Mo
                            </span>
                          ) : p.file_size ? (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.file_size}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 truncate mt-1" title={p.file_name}>
                          {p.file_name}
                        </div>
                        {p.checksum_sha256 && (
                          <div className="text-[10px] font-mono text-slate-400 truncate mt-1" title={p.checksum_sha256}>
                            SHA: {p.checksum_sha256.substring(0, 16)}...{p.checksum_sha256.substring(p.checksum_sha256.length - 8)}
                          </div>
                        )}
                        {p.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">{p.notes}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void openPart(p, idx)}
                        disabled={openingPartIndex === idx}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-brand-blue hover:bg-blue-50 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{openingPartIndex === idx ? 'Chargement...' : `Consulter le PDF (Volet ${p.part_number})`}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checksum SHA-256 */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  {document.is_multipart ? (
                    <>
                      <span>Empreinte logique d'intégrité (Manifest SHA-256) :</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-brand-blue">
                        MULTI-VOLETS
                      </span>
                    </>
                  ) : (
                    <span>Empreinte numérique (SHA-256) :</span>
                  )}
                </span>
                <button
                  onClick={handleCopyHash}
                  className="text-brand-blue hover:underline flex items-center gap-1 text-[11px] font-semibold"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
                {document.manifest_sha256 || document.checksum_sha256 || 'Empreinte inconnue'}
              </div>
              {document.is_multipart && (
                <p className="text-[10px] text-slate-400 mt-1">
                  SHA256_PARTS_MANIFEST_V1 : ordre, identité, chemin, taille, checksum et pages de chaque fascicule. Contrôle des octets : {document.checksum_status === 'COMPUTED' ? 'confirmé par le serveur' : 'à effectuer'}.
                </p>
              )}
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
              {document.is_multipart && <label className="flex items-center gap-2.5 text-xs text-slate-700"><input type="checkbox" checked={checks.pageRanges} onChange={e=>setChecks(prev=>({...prev,pageRanges:e.target.checked}))} /><span>J’ai contrôlé chaque fascicule et la continuité des pages sur les originaux.</span></label>}
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

          {currentStatus === 'TO_VERIFY' && !checks.formatValid && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2" role="status">
              Pour activer « Valider », ouvrez le PDF et confirmez qu'il est officiel, lisible et complet.
              La publication restera indisponible jusqu'à la vérification.
            </p>
          )}

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
                disabled={isProcessing || !canPublish}
                className="px-3.5 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl border border-amber-300 text-amber-800 bg-amber-50 text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                Dépublier (Renvoyer en examen)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpdateStatus('ARCHIVED')}
                disabled={isProcessing || !isStaff}
                className="px-3.5 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors disabled:opacity-50"
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
                disabled={isProcessing || !checks.formatValid || (document.is_multipart && !checks.pageRanges) || !isStaff}
                title={!checks.formatValid ? 'Confirmez le contrôle du PDF dans la grille de vérification.' : !isStaff ? 'Rôle administrateur requis.' : undefined}
                className="px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl border border-brand-blue text-brand-blue hover:bg-blue-50 text-xs font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Valider (Marquer VÉRIFIÉ)
              </button>
            )}

            {currentStatus === 'VERIFIED' && (
              <button
                type="button"
                onClick={() => handleUpdateStatus('PUBLISHED')}
                disabled={isProcessing || !canPublish}
                title={!canPublish ? 'Rôle administrateur requis pour publier.' : undefined}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-black transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publier sur la plateforme</span>
              </button>
            )}

            {currentStatus === 'PUBLISHED' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
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
