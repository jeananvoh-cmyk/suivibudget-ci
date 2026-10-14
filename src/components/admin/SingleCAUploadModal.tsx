// =========================================================================
// COMPOSANT : MODAL D'AJOUT & MISE À JOUR INDIVIDUELLE D'UN COMPTE ADMINISTRATIF
// SuiviBudget Côte d'Ivoire - Dépôt Sécurisé Multi-Fascicules, Versioning & Audit
// =========================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Institution, PublicDocument, OfficialDocumentSource, DocumentPartInfo, DocumentOcrStatus } from '../../types';
import { calculateFileSha256 } from '../../utils/caFileMatcher';
import { 
  DocumentStorageService, 
  calculateManifestSha256, 
  validateDocumentPageRanges 
} from '../../services/documentStorageService';
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

interface PartItemState {
  part_number: number;
  file: File | null;
  file_name: string;
  file_size: string;
  file_size_bytes: number;
  checksum_sha256: string;
  page_start: number | undefined;
  page_end: number | undefined;
  page_range: string;
  storage_path?: string;
  isCalculating: boolean;
}

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
  
  // Mode document unique
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>(existingDocument?.file_url || '');
  const [fileName, setFileName] = useState<string>(existingDocument?.file_name || '');
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string>(existingDocument?.file_size || '');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(existingDocument?.file_size_bytes || 0);
  const [checksumSha256, setChecksumSha256] = useState<string>(existingDocument?.checksum_sha256 || '');
  const [isCalculatingHash, setIsCalculatingHash] = useState<boolean>(false);

  // Métadonnées officielles
  const [sourceName, setSourceName] = useState<OfficialDocumentSource>(
    (existingDocument?.source_name as OfficialDocumentSource) || 'DGDDL'
  );
  const [sourceUrl, setSourceUrl] = useState<string>(existingDocument?.source_url || '');
  const [adoptionDate, setAdoptionDate] = useState<string>(existingDocument?.adoption_date || '');
  const [approvalDate, setApprovalDate] = useState<string>(existingDocument?.approval_date || '');
  const [approvalReference, setApprovalReference] = useState<string>(existingDocument?.approval_reference || '');
  const [isAsNewVersion, setIsAsNewVersion] = useState<boolean>(false);
  const [replacementReason, setReplacementReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Multi-parties & numérisation
  const [isMultipart, setIsMultipart] = useState<boolean>(Boolean(existingDocument?.is_multipart));
  const [isScannedPdf, setIsScannedPdf] = useState<boolean | null>(existingDocument?.is_scanned ?? null);
  const [manifestSha256, setManifestSha256] = useState<string>('');

  // Liste interactive des volets / parties
  const [parts, setParts] = useState<PartItemState[]>([
    {
      part_number: 1,
      file: null,
      file_name: '',
      file_size: '',
      file_size_bytes: 0,
      checksum_sha256: '',
      page_start: undefined,
      page_end: undefined,
      page_range: '',
      isCalculating: false,
    },
    {
      part_number: 2,
      file: null,
      file_name: '',
      file_size: '',
      file_size_bytes: 0,
      checksum_sha256: '',
      page_start: undefined,
      page_end: undefined,
      page_range: '',
      isCalculating: false,
    },
  ]);

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
      setSourceName((existingDocument.source_name as OfficialDocumentSource) || 'DGDDL');
      setSourceUrl(existingDocument.source_url || '');
      setAdoptionDate(existingDocument.adoption_date || '');
      setApprovalDate(existingDocument.approval_date || '');
      setApprovalReference(existingDocument.approval_reference || '');
      setIsMultipart(Boolean(existingDocument.is_multipart));
      setIsScannedPdf(existingDocument.is_scanned ?? null);

      if (existingDocument.is_multipart && existingDocument.document_parts && existingDocument.document_parts.length > 0) {
        setParts(
          existingDocument.document_parts.map((p, idx) => ({
            part_number: p.part_number || idx + 1,
            file: null,
            file_name: p.file_name || '',
            file_size: p.file_size || '',
            file_size_bytes: p.file_size_bytes || 0,
            checksum_sha256: p.checksum_sha256 || '',
            page_start: p.page_start ?? undefined,
            page_end: p.page_end ?? undefined,
            page_range: p.page_range || '',
            storage_path: p.storage_path,
            isCalculating: false,
          }))
        );
      }
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
      setIsMultipart(false);
      setIsScannedPdf(null);
      setManifestSha256('');
      setParts([
        {
          part_number: 1,
          file: null,
          file_name: '',
          file_size: '',
          file_size_bytes: 0,
          checksum_sha256: '',
          page_start: undefined,
          page_end: undefined,
          page_range: '',
          isCalculating: false,
        },
        {
          part_number: 2,
          file: null,
          file_name: '',
          file_size: '',
          file_size_bytes: 0,
          checksum_sha256: '',
          page_start: undefined,
          page_end: undefined,
          page_range: '',
          isCalculating: false,
        },
      ]);
    }
  }, [isOpen, targetCollectivite, existingDocument, selectedYear]);

  // Recalcul automatique du SHA-256 du manifeste multi-parties
  useEffect(() => {
    if (!isMultipart) {
      setManifestSha256('');
      return;
    }
    const preview=parts.map(p=>({part_number:p.part_number,id:`part-${p.part_number}-${p.checksum_sha256}`,checksum_sha256:p.checksum_sha256,file_size_bytes:p.file_size_bytes,page_start:p.page_start,page_end:p.page_end,
      storage_path:p.storage_path || DocumentStorageService.buildCanonicalStoragePath({institutionId,institutionType:targetCollectivite?.type==='REGION'?'REGION':'MAIRIE',fiscalYear,documentType:'COMPTE_ADMINISTRATIF',version:isAsNewVersion?(existingDocument?.version || 1)+1:existingDocument?.version || 1},p.file_name).replace(/\.[^.]+$/,`-part-${p.part_number}-${p.checksum_sha256}.pdf`)}));
    let active=true;
    void calculateManifestSha256(preview).then(hash=>{if(active)setManifestSha256(hash);}).catch(()=>{if(active)setManifestSha256('');});
    return ()=>{active=false;};
  }, [isMultipart, parts, institutionId, fiscalYear, isAsNewVersion, existingDocument]);

  // Validation des plages de pages en temps réel
  const pageRangeValidation = useMemo(() => {
    if (!isMultipart) return { isValid: true, error: undefined, errors: [] as string[], totalPages: undefined };
    return validateDocumentPageRanges(
      parts.map(p => ({
        part_number: p.part_number,
        page_start: p.page_start,
        page_end: p.page_end,
        page_range: p.page_range,
      }))
    );
  }, [isMultipart, parts]);

  const currentInstitution = collectivites.find(c => c.id === institutionId);
  const alreadyExistingDoc = institutionId && fiscalYear 
    ? dataStore.getCAForInstitution(institutionId, fiscalYear) 
    : undefined;

  // Gestion du fichier pour le mode document unique
  const handleSingleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsCalculatingHash(true);
    try {
      const hash = await calculateFileSha256(file);
      setChecksumSha256(hash);

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

  // Gestion de la sélection de fichier pour un fascicule spécifique
  const handlePartFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      onShowToast(`Le fascicule ${parts[index].part_number} doit être un fichier PDF valide.`, 'error');
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const formatted = parseFloat(sizeMb) >= 1 ? `${sizeMb} Mo` : `${Math.round(file.size / 1024)} Ko`;

    setParts(prev => prev.map((p, idx) => idx === index ? {
      ...p,
      file,
      file_name: file.name,
      file_size: formatted,
      file_size_bytes: file.size,
      isCalculating: true,
    } : p));

    try {
      const hash = await calculateFileSha256(file);
      setParts(prev => prev.map((p, idx) => idx === index ? {
        ...p,
        checksum_sha256: hash,
        isCalculating: false,
      } : p));
    } catch (err) {
      console.warn(`Calcul SHA-256 impossible pour la partie ${index + 1}`, err);
      setParts(prev => prev.map((p, idx) => idx === index ? { ...p, isCalculating: false } : p));
    }
  };

  // Ajout / Suppression / Réordonnancement de fascicules
  const handleAddPart = () => {
    setParts(prev => {
      const nextNum = prev.length + 1;
      return [
        ...prev,
        {
          part_number: nextNum,
          file: null,
          file_name: '',
          file_size: '',
          file_size_bytes: 0,
          checksum_sha256: '',
          page_start: undefined,
          page_end: undefined,
          page_range: '',
          isCalculating: false,
        },
      ];
    });
  };

  const handleRemovePart = (index: number) => {
    if (parts.length <= 2) {
      onShowToast('Un document multi-parties doit comporter au moins 2 fascicules.', 'error');
      return;
    }
    setParts(prev => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((p, idx) => ({ ...p, part_number: idx + 1 }));
    });
  };

  const handleMovePart = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= parts.length) return;
    setParts(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated.map((p, idx) => ({ ...p, part_number: idx + 1 }));
    });
  };

  const handlePageChange = (index: number, field: 'start' | 'end', value: number | undefined) => {
    setParts(prev => prev.map((p, idx) => {
      if (idx !== index) return p;
      const newStart = field === 'start' ? value : p.page_start;
      const newEnd = field === 'end' ? value : p.page_end;
      return {
        ...p,
        page_start: newStart,
        page_end: newEnd,
        page_range: `Pages ${newStart} à ${newEnd}`,
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!institutionId) {
      onShowToast('Veuillez sélectionner une collectivité.', 'error');
      return;
    }

    if (isMultipart) {
      if (!pageRangeValidation.isValid) {
        onShowToast(pageRangeValidation.error || 'Plages de pages invalides.', 'error');
        return;
      }
      if(existingDocument && !isAsNewVersion && parts.some(p=>p.file)) {onShowToast('Créez une nouvelle version pour remplacer les originaux.','error');return;}
      const missingFiles = parts.some(p => (isAsNewVersion ? !p.file : !p.file && !p.storage_path));
      if (missingFiles) {
        onShowToast('Veuillez sélectionner un fichier PDF pour chaque volet.', 'error');
        return;
      }
    } else {
      if (!selectedFile && !existingDocument?.storage_path) {
        onShowToast('Veuillez téléverser un fichier PDF officiel.', 'error');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let finalFileUrl = fileUrl;
      let finalStorageBucket = existingDocument?.storage_bucket || 'public_documents';
      let finalStoragePath = existingDocument?.storage_path;
      let finalSizeStr = fileSizeFormatted;
      let finalSizeBytes = fileSizeBytes;
      let finalSha256 = checksumSha256;
      let finalParts: DocumentPartInfo[] | undefined = undefined;
      let finalTotalPages = isMultipart ? pageRangeValidation.totalPages : existingDocument?.page_count;

      const uploadOptions = {
        institutionId,
        institutionType: (currentInstitution?.type === 'REGION' ? 'REGION' : 'MAIRIE') as 'REGION' | 'MAIRIE',
        fiscalYear,
        documentType: 'COMPTE_ADMINISTRATIF' as const,
        version: isAsNewVersion ? ((alreadyExistingDoc?.version || 1) + 1) : (existingDocument?.version || 1),
      };

      if (isMultipart) {
        // Mode multi-parties : téléversement réel de chaque fascicule
        const filesToUpload = parts.filter(p => Boolean(p.file));
        
        if (filesToUpload.length > 0) {
          const multiRes = await DocumentStorageService.uploadMultiPartDocument(
            parts.map(p => ({
              partNumber: p.part_number,
              file: p.file || new Blob([], { type: 'application/pdf' }), // ou existant
              fileName: p.file_name,
              pageStart: p.page_start,
              pageEnd: p.page_end,
              pageRange: p.page_range,
            })),
            uploadOptions
          );

          if (!multiRes.success) {
            throw new Error(multiRes.error || 'Échec du téléversement multi-parties.');
          }

          finalStoragePath = multiRes.primaryStoragePath;
          finalSha256 = multiRes.manifestChecksumSha256;
          finalSizeStr = multiRes.totalFileSizeFormatted;
          finalSizeBytes = multiRes.totalFileSizeBytes;
          finalParts = multiRes.documentParts;
          finalTotalPages = multiRes.totalPageCount;
        } else {
          // Métadonnées sans nouveau fichier (modification)
          finalParts = existingDocument?.document_parts;
          finalSha256 = existingDocument?.manifest_sha256 || checksumSha256;
        }
      } else if (selectedFile) {
        // Mode document unique
        const uploadRes = await DocumentStorageService.uploadDocument(
          selectedFile,
          selectedFile.name,
          uploadOptions
        );

        if (!uploadRes.success) throw new Error(uploadRes.error || 'Téléversement non confirmé.');
        finalFileUrl = uploadRes.fileUrl;
        finalStorageBucket = uploadRes.storageBucket;
        finalStoragePath = uploadRes.storagePath;
        finalSizeStr = uploadRes.fileSizeFormatted;
        finalSizeBytes = uploadRes.fileSizeBytes;
        finalSha256 = uploadRes.checksumSha256;
      }

      // Statut OCR rigoureux : pas de fausse extraction automatique annoncée
      const finalOcrStatus: DocumentOcrStatus | null = existingDocument?.ocr_status ?? (isScannedPdf===true ? 'NOT_IMPLEMENTED' : null);

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
        file_name: isMultipart ? `compte-administratif-${fiscalYear}-multipart.pdf` : (fileName || `compte-administratif-${fiscalYear}.pdf`),
        file_size: finalSizeStr || undefined,
        file_size_bytes: finalSizeBytes,
        storage_bucket: finalStorageBucket,
        storage_path: isMultipart ? null : finalStoragePath,
        checksum_sha256: isMultipart ? null : finalSha256,
        manifest_sha256: isMultipart ? finalSha256 : null,
        source_name: sourceName,
        source_url: sourceUrl || undefined,
        adoption_date: adoptionDate || undefined,
        approval_date: approvalDate || undefined,
        approval_reference: approvalReference || undefined,
        page_count: finalTotalPages,
        is_multipart: isMultipart,
        parts_count: isMultipart ? finalParts?.length : 1,
        document_parts: finalParts,
        is_scanned: isScannedPdf,
        has_text_layer: existingDocument?.has_text_layer ?? null,
        ocr_status: finalOcrStatus,
      }, isAsNewVersion);

      onSuccess(savedDoc);
      onShowToast(
        isAsNewVersion 
          ? `Nouvelle version v${savedDoc.version} enregistrée avec succès.` 
          : `Compte Administratif ${fiscalYear} enregistré avec succès (${isMultipart ? `${parts.length} volets` : 'document unique'}).`, 
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
                Enregistrez le document officiel certifié avec son empreinte numérique réelle et ses références de tutelle.
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
          {alreadyExistingDoc && (
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

          {/* Options de Numérisation & Multi-Parties */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-blue" />
              <span>Format & Structure Numérique</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isScannedPdf===true}
                  onChange={e => setIsScannedPdf(e.target.checked)}
                  className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <span>Document scanné (photocopie sans texte natif)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isMultipart}
                  onChange={e => setIsMultipart(e.target.checked)}
                  className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <span>Document scindé en plusieurs fascicules (multi-PDF)</span>
              </label>
            </div>
          </div>

          {/* Section Téléversement : Simple ou Multi-Parties */}
          {!isMultipart ? (
            /* Mode Document Unique */
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Document PDF Officiel Unique *
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
                  onChange={handleSingleFileChange}
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

              {isCalculatingHash && (
                <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span>Calcul cryptographique de l'empreinte SHA-256 en cours...</span>
                </div>
              )}
              {checksumSha256 && !isCalculatingHash && (
                <div className="text-[11px] text-slate-500 mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono flex items-center justify-between">
                  <span className="truncate max-w-md">SHA-256: {checksumSha256}</span>
                  <span className="text-[10px] text-emerald-600 font-bold px-1.5 py-0.5 bg-emerald-50 rounded">Calculé localement</span>
                </div>
              )}
              {duplicateWarning && (
                <div className="p-3 mt-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{duplicateWarning}</span>
                </div>
              )}
            </div>
          ) : (
            /* Mode Multi-Parties / Fascicules */
            <div className="space-y-3 p-4 rounded-2xl border border-blue-200 bg-blue-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-brand-blue tracking-wider">
                    Fascicules du Document ({parts.length} parties)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Sélectionnez chaque fichier PDF dans l'ordre de consultation. Les empreintes et le manifeste sont calculés automatiquement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPart}
                  className="px-3 py-1.5 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une partie</span>
                </button>
              </div>

              {/* Erreur de validation des plages */}
              {!pageRangeValidation.isValid && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{pageRangeValidation.error}</span>
                </div>
              )}

              {/* Liste des parties */}
              <div className="space-y-3 pt-1">
                {parts.map((part, index) => (
                  <div key={index} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brand-blue text-white text-xs font-black flex items-center justify-center">
                          {part.part_number}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          Partie {part.part_number} {part.file_name ? `• ${part.file_name}` : ''}
                        </span>
                        {part.file_size && (
                          <span className="text-[10px] font-mono text-slate-500">({part.file_size})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMovePart(index, 'UP')}
                          disabled={index === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          aria-label={`Monter le fascicule ${part.part_number}`} title="Déplacer vers le haut"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePart(index, 'DOWN')}
                          disabled={index === parts.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          aria-label={`Descendre le fascicule ${part.part_number}`} title="Déplacer vers le bas"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(index)}
                          disabled={parts.length <= 2}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                          aria-label={`Supprimer le fascicule ${part.part_number}`} title="Supprimer cette partie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sélection du fichier de cette partie */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Fichier PDF de la Partie {part.part_number} *
                        </label>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          aria-label={`Fichier PDF du fascicule ${part.part_number}`} onChange={e => handlePartFileChange(index, e)}
                          className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-brand-blue hover:file:bg-blue-100"
                        />
                      </div>

                      {/* Plages de pages */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Page Début
                          </label>
                          <input
                            type="number"
                            min={1}
                            aria-label={`Première page du fascicule ${part.part_number}`} value={part.page_start ?? ''}
                            onChange={e => handlePageChange(index, 'start', e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Page Fin
                          </label>
                          <input
                            type="number"
                            min={part.page_start}
                            aria-label={`Dernière page du fascicule ${part.part_number}`} value={part.page_end ?? ''}
                            onChange={e => handlePageChange(index, 'end', e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Hash du fascicule */}
                    {part.isCalculating && (
                      <div className="text-[10px] text-amber-600 flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>Calcul de l'empreinte du fichier...</span>
                      </div>
                    )}
                    {part.checksum_sha256 && !part.isCalculating && (
                      <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono text-slate-500 flex items-center justify-between">
                        <span className="truncate">SHA-256: {part.checksum_sha256}</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">Calculé</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Empreinte du Manifeste Multi-Parties */}
              {manifestSha256 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Empreinte logique du manifeste ({parts.length} fascicules, {pageRangeValidation.totalPages} pages)</span>
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Déterministe</span>
                  </div>
                  <div className="font-mono text-[11px] text-emerald-700 break-all">
                    {manifestSha256}
                  </div>
                </div>
              )}
            </div>
          )}

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
                Date d'Adoption par le Conseil
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

          {isAsNewVersion && (
            <label className="block text-sm font-semibold text-slate-700">
              Motif du remplacement *
              <input 
                required 
                value={replacementReason} 
                onChange={e => setReplacementReason(e.target.value)} 
                placeholder="Ex: Remplacement par le scan officiel complet certifié"
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-xs focus-visible:outline-brand-blue" 
              />
            </label>
          )}

          <p className="p-3.5 rounded-2xl bg-amber-50 text-amber-900 text-xs border border-amber-200">
            Le document sera enregistré avec le statut <strong>« À vérifier »</strong>. La vérification humaine et la publication s’effectuent ensuite depuis l’écran d’examen du document.
          </p>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCalculatingHash || (isMultipart && !pageRangeValidation.isValid)}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-blue text-white text-xs font-black hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Téléversement & Enregistrement...' : 'Enregistrer le Compte Administratif'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
