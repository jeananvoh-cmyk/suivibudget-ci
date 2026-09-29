// =========================================================================
// COMPOSANT : MODAL D'AJOUT & MISE À JOUR INDIVIDUELLE D'UN COMPTE ADMINISTRATIF
// SuiviBudget Côte d'Ivoire - Dépôt Sécurisé, Versioning & Audit
// =========================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { Institution, PublicDocument, OfficialDocumentSource } from '../../types';
import { calculateFileSha256 } from '../../utils/caFileMatcher';
import { DocumentStorageService } from '../../services/documentStorageService';
import { dataStore } from '../../services/dataStore';

interface SingleCAUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCollectivite?: Institution;
  collectivites: Institution[];
  selectedYear: number;
  existingDocument?: PublicDocument;
  onSuccess: (doc: PublicDocument) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const SOURCES: { value: OfficialDocumentSource; label: string }[] = [
  { value: 'DGDDL', label: 'DGDDL (Direction Générale de la Décentralisation)' },
  { value: 'COLLECTIVITE', label: 'Collectivité Territoriale (Mairie / Conseil Régional)' },
  { value: 'SYGIDAN_CTI', label: 'SYGIDAN / Trésor Public (CTI)' },
  { value: 'CAIDP', label: 'CAIDP (Commission d\'Accès à l\'Information)' },
  { value: 'COUR_DES_COMPTES', label: 'Cour des Comptes de Côte d\'Ivoire' },
  { value: 'AUTRE_SOURCE_OFFICIELLE', label: 'Autre Source Officielle' },
];

export const SingleCAUploadModal: React.FC<SingleCAUploadModalProps> = ({
  isOpen,
  onClose,
  targetCollectivite,
  collectivites,
  selectedYear,
  existingDocument,
  onSuccess,
  onShowToast,
}) => {
  const [institutionId, setInstitutionId] = useState<string>(targetCollectivite?.id || '');
  const [fiscalYear, setFiscalYear] = useState<number>(existingDocument?.year || existingDocument?.fiscal_year || selectedYear || 2025);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>(existingDocument?.file_url || '');
  const [fileName, setFileName] = useState<string>(existingDocument?.file_name || '');
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string>(existingDocument?.file_size || '');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(existingDocument?.file_size_bytes || 0);
  const [checksumSha256, setChecksumSha256] = useState<string>(existingDocument?.checksum_sha256 || '');
  
  // Official Metadata
  const [sourceName, setSourceName] = useState<string>(existingDocument?.source_name || 'DGDDL');
  const [sourceUrl, setSourceUrl] = useState<string>(existingDocument?.source_url || '');
  const [adoptionDate, setAdoptionDate] = useState<string>(existingDocument?.adoption_date || '');
  const [approvalDate, setApprovalDate] = useState<string>(existingDocument?.approval_date || '');
  const [approvalReference, setApprovalReference] = useState<string>(existingDocument?.approval_reference || '');
  const [isAsNewVersion, setIsAsNewVersion] = useState<boolean>(false);
  const [replacementReason, setReplacementReason] = useState('');
  const [isCalculatingHash, setIsCalculatingHash] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (targetCollectivite) {
      setInstitutionId(targetCollectivite.id);
    }
    if (existingDocument) {
      setFiscalYear(existingDocument.year || existingDocument.fiscal_year || selectedYear);
      setFileUrl(existingDocument.file_url || '');
      setFileName(existingDocument.file_name || '');
      setFileSizeFormatted(existingDocument.file_size || '');
      setFileSizeBytes(existingDocument.file_size_bytes || 0);
      setChecksumSha256(existingDocument.checksum_sha256 || '');
      setSourceName(existingDocument.source_name || 'DGDDL');
      setSourceUrl(existingDocument.source_url || '');
      setAdoptionDate(existingDocument.adoption_date || '');
      setApprovalDate(existingDocument.approval_date || '');
      setApprovalReference(existingDocument.approval_reference || '');
    } else {
      setFiscalYear(selectedYear);
      setSelectedFile(null);
      setFileUrl('');
      setFileName('');
      setFileSizeFormatted('');
      setFileSizeBytes(0);
      setChecksumSha256('');
      setSourceName('DGDDL');
      setSourceUrl('');
      setAdoptionDate('');
      setApprovalDate('');
      setApprovalReference('');
      setIsAsNewVersion(false);
      setDuplicateWarning(null);
    }
  }, [isOpen, targetCollectivite, existingDocument, selectedYear]);

  // Vérifier si un document existe déjà pour cette institution et cette année
  const currentInstitution = collectivites.find(c => c.id === institutionId);
  const alreadyExistingDoc = institutionId && fiscalYear 
    ? dataStore.getCAForInstitution(institutionId, fiscalYear) 
    : undefined;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      onShowToast('Seuls les fichiers PDF sont acceptés pour les Comptes Administratifs.', 'error');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setFileSizeBytes(file.size);

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const formatted = parseFloat(sizeMb) >= 1 ? `${sizeMb} Mo` : `${Math.round(file.size / 1024)} Ko`;
    setFileSizeFormatted(formatted);

    // Calcul SHA-256
    setIsCalculatingHash(true);
    try {
      const hash = await calculateFileSha256(file);
      setChecksumSha256(hash);

      // Vérifier les doublons
      const duplicate = dataStore.findDocumentByChecksum(hash);
      if (duplicate && duplicate.id !== existingDocument?.id) {
        setDuplicateWarning(`Ce fichier a la même empreinte SHA-256 que "${duplicate.title}" (${duplicate.institution_name}).`);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.warn("Calcul du hash impossible", err);
    } finally {
      setIsCalculatingHash(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!institutionId) {
      onShowToast('Veuillez sélectionner une collectivité.', 'error');
      return;
    }

    if (!selectedFile && !existingDocument?.storage_path) {
      onShowToast('Veuillez téléverser un fichier PDF officiel.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalFileUrl = fileUrl;
      let finalStorageBucket = existingDocument?.storage_bucket;
      let finalStoragePath = existingDocument?.storage_path;
      let finalSizeStr = fileSizeFormatted;
      let finalSizeBytes = fileSizeBytes;
      let finalSha256 = checksumSha256;

      // Si un nouveau fichier est sélectionné, téléversement
      if (selectedFile) {
        const uploadRes = await DocumentStorageService.uploadDocument(
          selectedFile,
          selectedFile.name,
          {
            institutionId,
            institutionType: currentInstitution?.type === 'REGION' ? 'REGION' : 'MAIRIE',
            fiscalYear,
            documentType: 'COMPTE_ADMINISTRATIF',
            version: isAsNewVersion ? ((alreadyExistingDoc?.version || 1) + 1) : (existingDocument?.version || 1),
          }
        );

        if (!uploadRes.success) throw new Error(uploadRes.error || 'Téléversement non confirmé.');
        finalFileUrl = uploadRes.fileUrl;
        finalStorageBucket = uploadRes.storageBucket;
        finalStoragePath = uploadRes.storagePath;
        finalSizeStr = uploadRes.fileSizeFormatted;
        finalSizeBytes = uploadRes.fileSizeBytes;
        finalSha256 = uploadRes.checksumSha256;
      }

      const savedDoc = await dataStore.saveCADocument({
        replacement_reason: replacementReason,
        id: existingDocument?.id,
        institution_id: institutionId,
        institution_name: currentInstitution?.name || 'Collectivité',
        institution_type: currentInstitution?.type === 'REGION' ? 'REGION' : 'MAIRIE',
        year: fiscalYear,
        fiscal_year: fiscalYear,
        title: `Compte Administratif ${fiscalYear} - ${currentInstitution?.name}`,
        file_url: finalFileUrl,
        file_name: fileName || `compte-administratif-${fiscalYear}.pdf`,
        file_size: finalSizeStr || undefined,
        file_size_bytes: finalSizeBytes,
        storage_bucket: finalStorageBucket,
        storage_path: finalStoragePath,
        checksum_sha256: finalSha256,
        source_name: sourceName,
        source_url: sourceUrl || undefined,
        adoption_date: adoptionDate || undefined,
        approval_date: approvalDate || undefined,
        approval_reference: approvalReference || undefined,
      }, isAsNewVersion);

      onSuccess(savedDoc);
      onShowToast(
        isAsNewVersion 
          ? `Nouvelle version v${savedDoc.version} enregistrée avec succès.` 
          : `Compte Administratif ${fiscalYear} enregistré avec succès.`, 
        'success'
      );
      onClose();
    } catch (err: any) {
      console.error("Erreur enregistrement CA:", err);
      onShowToast(`Erreur lors de l'enregistrement : ${err.message || 'Erreur inconnue'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
              <h3 className="text-lg font-black text-slate-900">
                {existingDocument ? 'Modifier le Compte Administratif' : 'Déposer un Compte Administratif (CA)'}
              </h3>
              <p className="text-xs text-slate-500">
                Enregistrez le document officiel certifié avec son empreinte numérique et ses références de tutelle.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Collectivité & Exercice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Collectivité Territoriale *
              </label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="">-- Sélectionner une collectivité (232) --</option>
                <optgroup label="Communes (201)">
                  {collectivites.filter(c => c.type === 'MAIRIE').map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.region})</option>
                  ))}
                </optgroup>
                <optgroup label="Conseils Régionaux (31)">
                  {collectivites.filter(c => c.type === 'REGION').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Exercice Fiscal *
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025 (En cours)</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          {/* Existing Document / Version Warning */}
          {alreadyExistingDoc && alreadyExistingDoc.id !== existingDocument?.id && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Un Compte Administratif existe déjà pour cet exercice !</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Le document <strong>v{alreadyExistingDoc.version || 1}</strong> est actuellement enregistré ({alreadyExistingDoc.file_name}).
              </p>
              <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isAsNewVersion}
                  onChange={(e) => setIsAsNewVersion(e.target.checked)}
                  className="rounded text-brand-blue focus:ring-brand-blue w-4 h-4"
                />
                <span>Enregistrer comme nouvelle version v{(alreadyExistingDoc.version || 1) + 1} (l'ancienne sera archivée)</span>
              </label>
            </div>
          )}

          {/* Fichier PDF & Dropzone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Document PDF Officiel *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-brand-blue bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-brand-blue transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              {fileName ? (
                <div>
                  <div className="text-xs font-bold text-slate-900">{fileName}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Taille : {fileSizeFormatted}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-bold text-slate-700">Cliquez pour téléverser le PDF officiel</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Format PDF uniquement (max 50 Mo)</div>
                </div>
              )}
            </div>

            {/* Checksum SHA-256 Feedback */}
            {isCalculatingHash && (
              <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span>Calcul cryptographique de l'empreinte SHA-256 en cours...</span>
              </div>
            )}
            {checksumSha256 && !isCalculatingHash && (
              <div className="text-[11px] text-slate-500 mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono flex items-center justify-between">
                <span className="truncate max-w-md">SHA-256: {checksumSha256}</span>
                <span className="text-[10px] text-emerald-600 font-bold px-1.5 py-0.5 bg-emerald-50 rounded">Vérifié</span>
              </div>
            )}
            {duplicateWarning && (
              <div className="p-3 mt-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}
          </div>

          {/* Source & Approbation de Tutelle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Source Officielle du Document
              </label>
              <select
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value as OfficialDocumentSource)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                {SOURCES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lien de la Source (URL publique / arrêté)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://dgddl.interieur.gouv.ci/..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date d'Adoption par le Conseil (Optionnel)
              </label>
              <input
                type="date"
                value={adoptionDate}
                onChange={(e) => setAdoptionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date d'Approbation Tutelle (DGDDL / Préfet)
              </label>
              <input
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Référence de l'Arrêté d'Approbation
            </label>
            <input
              type="text"
              value={approvalReference}
              onChange={(e) => setApprovalReference(e.target.value)}
              placeholder="Ex: Arrêté n° 024/MIS/DGDDL du 14 mars 2025"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {isAsNewVersion && <label className="block text-sm font-semibold text-slate-700">
            Motif du remplacement
            <input required value={replacementReason} onChange={e => setReplacementReason(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 focus-visible:outline-brand-blue" />
          </label>}
          <p className="p-4 rounded-2xl bg-amber-50 text-amber-900 text-sm">
            Le document sera enregistré à vérifier. La vérification et la publication s’effectuent ensuite depuis l’examen du document.
          </p>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCalculatingHash}
              className="px-5 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-black hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer le Compte Administratif'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
