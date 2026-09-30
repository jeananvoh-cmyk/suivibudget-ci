// =========================================================================
// COMPOSANT : MODAL D'IMPORTATION PAR LOT DE COMPTES ADMINISTRATIFS (PDF)
// SuiviBudget Côte d'Ivoire - Matching Fuzzy, Checksum SHA-256 & Multi-Upload
// =========================================================================

import React, { useState, useRef, useCallback } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Trash2, 
  ArrowRight,
  ShieldCheck,
  Check,
  RefreshCw
} from 'lucide-react';
import { Institution, BatchCaMatchProposal, OfficialDocumentSource, PublicDocument } from '../../types';
import { matchFileToCollectivite } from '../../utils/caFileMatcher';
import { DocumentStorageService } from '../../services/documentStorageService';
import { dataStore } from '../../services/dataStore';

interface BatchCAImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: number;
  collectivites: Institution[];
  existingDocuments: PublicDocument[];
  onSuccess: (count: number) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const SOURCES: { value: OfficialDocumentSource; label: string }[] = [
  { value: 'DGDDL', label: 'DGDDL (Direction Générale de la Décentralisation)' },
  { value: 'COLLECTIVITE', label: 'Collectivité Territoriale (Mairie / Région)' },
  { value: 'SYGIDAN_CTI', label: 'SYGIDAN / Trésor Public (CTI)' },
  { value: 'CAIDP', label: 'CAIDP (Droit d\'Accès à l\'Information)' },
  { value: 'COUR_DES_COMPTES', label: 'Cour des Comptes' },
  { value: 'AUTRE_SOURCE_OFFICIELLE', label: 'Autre Source Officielle' },
];

export const BatchCAImportModal: React.FC<BatchCAImportModalProps> = ({
  isOpen,
  onClose,
  selectedYear,
  collectivites,
  existingDocuments,
  onSuccess,
  onShowToast,
}) => {
  const [proposals, setProposals] = useState<BatchCaMatchProposal[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: '',
  });
  const [defaultSource, setDefaultSource] = useState<OfficialDocumentSource>('DGDDL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Traitement d'une liste de fichiers sélectionnés ou glissés
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      onShowToast('Veuillez sélectionner des fichiers au format PDF.', 'error');
      return;
    }

    setIsProcessingFiles(true);
    const newProposals: BatchCaMatchProposal[] = [];

    for (const file of pdfFiles) {
      try {
        const prop = await matchFileToCollectivite(
          file, 
          collectivites, 
          existingDocuments, 
          selectedYear
        );
        prop.sourceName = defaultSource;
        newProposals.push(prop);
      } catch (err) {
        console.error("Erreur lors de l'analyse du fichier:", file.name, err);
      }
    }

    setProposals(prev => [...prev, ...newProposals]);
    setIsProcessingFiles(false);
    onShowToast(`${newProposals.length} document(s) analysé(s) avec détection automatique.`);
  }, [collectivites, existingDocuments, selectedYear, defaultSource, onShowToast]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  const handleCollectiviteChange = (proposalId: string, instId: string) => {
    const inst = collectivites.find(c => c.id === instId);
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p;
      return {
        ...p,
        matchedInstitutionId: inst?.id,
        matchedInstitutionName: inst?.name,
        matchedInstitutionType: inst?.type === 'REGION' ? 'REGION' : 'MAIRIE',
        confidence: 'STRONG',
        confidenceScore: 100,
      };
    }));
  };

  const handleSourceChange = (proposalId: string, source: OfficialDocumentSource) => {
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p;
      return { ...p, sourceName: source };
    }));
  };

  const handleYearChange = (proposalId: string, year: number) => {
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p;
      return { ...p, detectedYear: year };
    }));
  };

  // Lancement de l'ingestion groupée
  const handleStartImport = async () => {
    const validProposals = proposals.filter(p => p.matchedInstitutionId && !p.isDuplicate);
    if (validProposals.length === 0) {
      onShowToast('Aucun document assigné à une collectivité valide.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validProposals.length, currentName: '' });

    let successCount = 0;

    for (let i = 0; i < validProposals.length; i++) {
      const prop = validProposals[i];
      setUploadProgress({ current: i + 1, total: validProposals.length, currentName: prop.fileName });

      try {
        const uploadRes = await DocumentStorageService.uploadDocument(
          prop.file,
          prop.fileName,
          {
            institutionId: prop.matchedInstitutionId!,
            institutionType: prop.matchedInstitutionType,
            fiscalYear: prop.detectedYear,
            documentType: 'COMPTE_ADMINISTRATIF',
            version: prop.isNewVersion ? (dataStore.getCAForInstitution(prop.matchedInstitutionId!, prop.detectedYear)?.version || 1) + 1 : 1,
          }
        );

        if (!uploadRes.success) throw new Error(uploadRes.error || 'Téléversement non confirmé.');
        await dataStore.saveCADocument({
          title: `Compte Administratif ${prop.detectedYear} - ${prop.matchedInstitutionName}`,
          category: 'COMPTE_ADMINISTRATIF',
          document_type: 'COMPTE_ADMINISTRATIF',
          institution_id: prop.matchedInstitutionId,
          institution_name: prop.matchedInstitutionName,
          institution_type: prop.matchedInstitutionType,
          year: prop.detectedYear,
          fiscal_year: prop.detectedYear,
          file_url: uploadRes.fileUrl,
          file_name: prop.fileName,
          file_size: uploadRes.fileSizeFormatted,
          file_size_bytes: uploadRes.fileSizeBytes,
          file_format: 'PDF',
          storage_bucket: uploadRes.storageBucket,
          storage_path: uploadRes.storagePath,
          checksum_sha256: uploadRes.checksumSha256 || prop.checksum_sha256,
          source_name: prop.sourceName,
          status: 'TO_VERIFY',
          verification_status: 'TO_VERIFY',
          replacement_reason: prop.isNewVersion ? 'Nouvelle version confirmée lors de l’import par lot.' : undefined,
        }, prop.isNewVersion);

        successCount++;
      } catch (err) {
        console.error("Erreur téléversement:", prop.fileName, err);
      }
    }

    setIsUploading(false);
    onSuccess(successCount);
    onShowToast(`${successCount} Compte(s) Administratif(s) importé(s) avec succès. En attente de vérification.`, 'success');
    setProposals([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-brand-blue/10 text-brand-blue">
              <UploadCloud className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Importation par Lot de Comptes Administratifs (PDF)
              </h3>
              <p className="text-xs text-slate-500">
                Déposez plusieurs fichiers simultanément. L'IA apparie les collectivités, calcule l'empreinte SHA-256 et prépare l'examen.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            aria-label="Fermer la modal"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-brand-blue/60 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-8 text-center transition-all cursor-pointer group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 group-hover:text-brand-blue group-hover:scale-110 transition-all">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              Glissez et déposez ici vos fichiers PDF de Comptes Administratifs
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ou <span className="text-brand-blue underline font-semibold">parcourez vos dossiers</span> pour sélectionner plusieurs documents
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              Formats acceptés : PDF officiel exclusivement • Détection automatique par nom (ex : <code>CA_Cocody_2025.pdf</code>)
            </div>
          </div>

          {/* Configuration par lot */}
          {proposals.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <span>Source officielle pour le lot :</span>
                <select
                  value={defaultSource}
                  onChange={(e) => {
                    const src = e.target.value as OfficialDocumentSource;
                    setDefaultSource(src);
                    setProposals(prev => prev.map(p => ({ ...p, sourceName: src })));
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {proposals.length} fichier(s) prêt(s) • Exercice cible :
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-brand-blue font-black text-xs">
                  {selectedYear}
                </span>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessingFiles && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" />
              <span>Analyse des fichiers en cours, calcul des empreintes SHA-256 et matching des 232 collectivités...</span>
            </div>
          )}

          {/* Proposals Table */}
          {proposals.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/80 sticky top-0 z-10 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Fichier & Taille</th>
                      <th className="py-2.5 px-3">Exercice</th>
                      <th className="py-2.5 px-3">Collectivité Appariée</th>
                      <th className="py-2.5 px-3 text-center">Confiance</th>
                      <th className="py-2.5 px-3">Source & Statut</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proposals.map(prop => (
                      <tr key={prop.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="font-bold text-slate-900 truncate" title={prop.fileName}>
                            {prop.fileName}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                            <span>{prop.fileSize}</span>
                            {prop.checksum_sha256 && (
                              <span className="truncate max-w-[120px]" title={prop.checksum_sha256}>
                                • #{prop.checksum_sha256.substring(0, 8)}...
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={prop.detectedYear}
                            onChange={(e) => handleYearChange(prop.id, parseInt(e.target.value, 10) || selectedYear)}
                            className="w-16 px-1.5 py-1 text-xs border border-slate-200 rounded-lg text-center font-bold"
                          />
                        </td>

                        <td className="py-2.5 px-3 min-w-[200px]">
                          <select
                            value={prop.matchedInstitutionId || ''}
                            onChange={(e) => handleCollectiviteChange(prop.id, e.target.value)}
                            className={`w-full px-2 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${
                              !prop.matchedInstitutionId 
                                ? 'border-rose-300 bg-rose-50 text-rose-800' 
                                : 'border-slate-200 bg-white text-slate-900'
                            }`}
                          >
                            <option value="">-- Sélectionner une collectivité --</option>
                            <optgroup label="Communes (201)">
                              {collectivites.filter(c => c.type === 'MAIRIE').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Conseils Régionaux (31)">
                              {collectivites.filter(c => c.type === 'REGION').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </optgroup>
                          </select>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {prop.confidence === 'STRONG' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Forte ({prop.confidenceScore}%)
                            </span>
                          )}
                          {prop.confidence === 'UNCERTAIN' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              À confirmer
                            </span>
                          )}
                          {prop.confidence === 'NONE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-rose-600" />
                              Non reconnue
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          {prop.isDuplicate ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 block truncate" title={prop.duplicateReason}>
                              {prop.isNewVersion ? 'Nouvelle version v2+' : 'Déjà présent'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-brand-blue">
                              Nouveau CA
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleRemoveProposal(prop.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Retirer de la sélection"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ingestion Progress */}
          {isUploading && (
            <div className="space-y-2 p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-blue" />
                  Importation en cours : {uploadProgress.current} / {uploadProgress.total}
                </span>
                <span className="text-brand-blue font-mono font-bold">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-blue-200/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-blue transition-all duration-300 rounded-full"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 truncate font-mono">
                Document en cours : {uploadProgress.currentName}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {proposals.length > 0 ? (
              <span>
                <strong>{proposals.filter(p => p.matchedInstitutionId).length}</strong> document(s) prêts à être ingérés.
              </span>
            ) : (
              <span>Aucun document sélectionné pour le moment.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleStartImport}
              disabled={isUploading || proposals.filter(p => p.matchedInstitutionId).length === 0}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-blue text-white text-xs font-black hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Importer {proposals.filter(p => p.matchedInstitutionId).length} CA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
