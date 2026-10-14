// =========================================================================
// SERVICE : STOCKAGE DES DOCUMENTS PUBLICS & COMPTES ADMINISTRATIFS
// SuiviBudget Côte d'Ivoire - Intégration Supabase Storage & Chemins Standardisés
// Support Multi-Fascicules, Calcul Déterministe d'Empreinte & Rollback
// =========================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { calculateFileSha256 } from '../utils/caFileMatcher';
import { OfficialDocumentType, DocumentPartInfo } from '../types';
import { calculateManifestSha256 } from '../../supabase/functions/_shared/documentIntegrity';
export { calculateManifestSha256 } from '../../supabase/functions/_shared/documentIntegrity';
import { requireAdminPersistence } from './adminPersistenceService';

export interface DocumentUploadOptions {
  institutionId: string;
  institutionType?: 'MAIRIE' | 'REGION' | 'DISTRICT' | 'MINISTERE' | 'AUTORITE_REGULATION';
  fiscalYear: number;
  documentType: OfficialDocumentType;
  version?: number;
  partNumber?: number;
}

export interface DocumentUploadResult {
  success: boolean;
  fileUrl: string;
  storageBucket: string;
  storagePath: string;
  checksumSha256: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  originalFileName: string;
  mimeType: string;
  error?: string;
}

export interface MultiPartInputItem {
  partNumber?: number;
  part_number?: number;
  file: File | Blob;
  fileName?: string;
  file_name?: string;
  pageStart?: number;
  page_start?: number;
  pageEnd?: number;
  page_end?: number;
  pageRange?: string;
  page_range?: string;
  notes?: string;
}

export interface MultiPartUploadResult {
  success: boolean;
  documentParts: DocumentPartInfo[];
  manifestChecksumSha256: string;
  totalFileSizeBytes: number;
  totalFileSizeFormatted: string;
  primaryStoragePath: string;
  totalPageCount: number;
  uploadedPaths: string[];
  error?: string;
}

/**
 * Calcule l'empreinte déterministe d'un manifeste multi-parties
 * à partir des empreintes ordonnées de chaque volet
 */


/**
 * Valide les plages de pages des fascicules
 */
export function validateDocumentPageRanges(
  parts: Array<{ part_number?: number; partNumber?: number; page_start?: number | null; pageStart?: number; page_end?: number | null; pageEnd?: number; page_range?: string; pageRange?: string }>
): { isValid: boolean; error?: string; errors: string[]; totalPages?: number } {
  const errors: string[] = [];
  if (!parts || parts.length === 0) {
    return { isValid: false, error: 'Au moins un fascicule doit être renseigné.', errors: ['Au moins un fascicule doit être renseigné.'] };
  }

  // Trier par numéro de partie
  const sorted = parts.map((p, idx) => ({
    part_number: p.part_number ?? p.partNumber ?? (idx + 1),
    page_start: p.page_start ?? p.pageStart,
    page_end: p.page_end ?? p.pageEnd,
    page_range: p.page_range ?? p.pageRange,
  }));

  let lastEnd = 0;
  let isValid = true;

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if(p.part_number!==i+1) {errors.push("Ordre des fascicules invalide.");isValid=false;}
    let start = p.page_start;
    let end = p.page_end;

    // Si page_start / page_end ne sont pas fournis, tenter d'extraire de page_range
    if ((start === undefined || end === undefined) && p.page_range) {
      const match = p.page_range.match(/(\d+)\s*(?:à|a|-|to)\s*(\d+)/i);
      if (match) {
        start = parseInt(match[1], 10);
        end = parseInt(match[2], 10);
      }
    }

    if (start == null || end == null || isNaN(start) || isNaN(end)) {
      errors.push(`La plage de pages du fascicule ${p.part_number} est indéterminée.`);
      isValid = false;
      continue;
    }

    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start <= 0 || end <= 0 || (i===0 && start!==1)) {
      errors.push(`Les numéros de pages du fascicule ${p.part_number} doivent être strictement positifs.`);
      isValid = false;
      continue;
    }

    if (start > end) {
      errors.push(`Plage de pages invalide : la page de début (${start}) dépasse la page de fin (${end}) pour le volet ${p.part_number}.`);
      isValid = false;
      continue;
    }

    if (i > 0) {
      if (start <= lastEnd) {
        errors.push(`Chevauchement interdit : le volet ${p.part_number} (pages ${start}-${end}) chevauche le volet précédent (page de fin : ${lastEnd}).`);
        isValid = false;
      } else if (start !== lastEnd + 1) {
        errors.push(`Discontinuité détectée : lacune de numérotation entre volet ${sorted[i - 1].part_number} (fin ${lastEnd}) et volet ${p.part_number} (début ${start}).`);
        isValid = false;
      }
    }

    lastEnd = end;
  }

  return { 
    isValid: isValid && errors.length === 0, 
    error: errors[0],
    errors,
    totalPages: isValid && errors.length === 0 ? lastEnd : undefined 
  };
}

/**
 * Construit le chemin canonique pour un document ou un de ses volets
 */
export function buildCanonicalStoragePath(
  options: DocumentUploadOptions & { originalFilename?: string },
  originalFilename?: string,
  partNumber?: number
): string {
  return DocumentStorageService.buildCanonicalStoragePath(
    options,
    originalFilename || options.originalFilename || 'document.pdf',
    partNumber ?? options.partNumber
  );
}

export class DocumentStorageService {
  public static async uploadAdminMedia(file: File): Promise<string> {
    await requireAdminPersistence();
    if(file.size<1 || file.size>10*1024*1024) throw new Error('Média limité à 10 Mo.');
    const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
    const prefix=new TextDecoder().decode(bytes);
    const extensions: Record<string,string>={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'};
    const extension=extensions[file.type];
    const valid=(file.type==='image/webp' && prefix.startsWith('RIFF') && prefix.slice(8,12)==='WEBP')
      || (file.type==='image/png' && bytes[0]===137 && prefix.slice(1,4)==='PNG')
      || (file.type==='image/jpeg' && bytes[0]===255 && bytes[1]===216 && bytes[2]===255)
      || (file.type==='application/pdf' && prefix.startsWith('%PDF-'));
    if(!extension || !valid) throw new Error('Contenu ou type de média invalide. SVG et fichiers exécutables interdits.');
    const {data,error}=await supabase.auth.getUser();
    if(error || !data.user) throw new Error('Authentication required');
    const checksum=await calculateFileSha256(file);
    const path=`${data.user.id}/${checksum}.${extension}`;
    const upload=await supabase.storage.from('admin_media').upload(path,file,{contentType:file.type,upsert:false});
    if(upload.error) {
      if(!['409','Duplicate'].includes(String(upload.error.statusCode)) && !/already exists/i.test(upload.error.message)) throw upload.error;
      const existing=await supabase.functions.invoke('admin-media-url',{body:{action:'check-upload',path}});
      if(existing.error || existing.data?.checksum_sha256!==checksum) throw new Error('Média existant non contrôlé : téléversement bloqué.');
    }
    return `storage://admin_media/${path}`;
  }

  private static BUCKET_NAME = 'public_documents';

  public static calculateMultipartSha256(parts: DocumentPartInfo[]): Promise<string> { return calculateManifestSha256(parts); }

  public static async uploadMultipartDocuments(inputs: {file:File;page_start:number;page_end:number}[], options: DocumentUploadOptions, pageCount?: number): Promise<{parts:DocumentPartInfo[];checksum:string}> {
    const ranges=validateDocumentPageRanges(inputs);
    if(!ranges.isValid || (pageCount!==undefined && pageCount!==ranges.totalPages)) throw new Error('Nombre total de pages incohérent ou plages invalides.');
    const result=await this.uploadMultiPartDocument(inputs.map((part,index)=>({...part,partNumber:index+1,fileName:part.file.name})),options);
    if(!result.success) throw new Error(result.error);
    return {parts:result.documentParts,checksum:result.manifestChecksumSha256};
  }

  /**
   * Construit le chemin de stockage canonique :
   * Ex: comptes-administratifs/communes/inst-com-cocody/2024/compte-administratif-2024-v1.pdf
   * Ou multi-parties: comptes-administratifs/communes/inst-com-cocody/2024/compte-administratif-2024-v1-part-1.pdf
   */
  public static buildCanonicalStoragePath(
    options: DocumentUploadOptions,
    originalFilename: string,
    partNumber?: number
  ): string {
    const { institutionId, institutionType, fiscalYear, documentType, version = 1 } = options;

    // Type d'entité pour le dossier
    let entityFolder = 'communes';
    if (institutionType === 'REGION') entityFolder = 'conseils-regionaux';
    else if (institutionType === 'DISTRICT') entityFolder = 'districts-autonomes';
    else if (institutionType === 'MINISTERE') entityFolder = 'ministeres';
    else if (institutionType === 'AUTORITE_REGULATION') entityFolder = 'autorites-regulation';

    // Type de document pour le dossier
    let docTypeFolder = 'comptes-administratifs';
    if (documentType === 'BUDGET_PRIMITIF') docTypeFolder = 'budgets-primitifs';
    else if (documentType === 'BUDGET_MODIFICATIF') docTypeFolder = 'budgets-modificatifs';
    else if (documentType === 'DELIBERATION') docTypeFolder = 'deliberations';
    else if (documentType === 'PROGRAMME_TRIENNAL') docTypeFolder = 'programmes-triennaux';
    else if (documentType === 'MARCHE_PUBLIC') docTypeFolder = 'marches-publics';
    else if (documentType === 'RAPPORT_AUDIT') docTypeFolder = 'rapports-audit';

    // Nom de fichier standardisé
    const extension = originalFilename.split('.').pop()?.toLowerCase() || 'pdf';
    const cleanDocSlug = documentType.toLowerCase().replace(/_/g, '-');
    const partSuffix = partNumber !== undefined ? `-part-${partNumber}` : '';
    const standardFilename = `${cleanDocSlug}-${fiscalYear}-v${version}${partSuffix}.${extension}`;

    return `${docTypeFolder}/${entityFolder}/${institutionId}/${fiscalYear}/${standardFilename}`;
  }

  /**
   * Téléverse un fichier documentaire unique vers Supabase Storage
   */
  public static async uploadDocument(
    file: File | Blob,
    originalFilename: string,
    options: DocumentUploadOptions
  ): Promise<DocumentUploadResult> {
    let storagePath = this.buildCanonicalStoragePath(options, originalFilename);
    if(!/^[a-zA-Z0-9_-]+$/.test(options.institutionId) || !Number.isInteger(options.fiscalYear) || options.fiscalYear<1960 || !Number.isInteger(options.version ?? 1) || (options.version ?? 1)<1 ||
      (options.partNumber!==undefined && (!Number.isInteger(options.partNumber) || options.partNumber<1 || options.partNumber>100))) throw new Error('Identité documentaire invalide.');
    const mimeType = file.type || 'application/pdf';
    const fileSizeBytes = file.size;

    // Calcul de la taille lisible
    const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    const fileSizeFormatted = parseFloat(sizeMb) >= 1 ? `${sizeMb} Mo` : `${Math.round(fileSizeBytes / 1024)} Ko`;

    const result: DocumentUploadResult = {
      success: false,
      fileUrl: '',
      storageBucket: this.BUCKET_NAME,
      storagePath,
      checksumSha256: '',
      fileSizeBytes,
      fileSizeFormatted,
      originalFileName: originalFilename,
      mimeType,
    };

    if (!isSupabaseConfigured()) {
      return { ...result, error: 'Stockage documentaire indisponible.' };
    }

    if (fileSizeBytes === 0 || fileSizeBytes > 50 * 1024 * 1024) {
      return { ...result, error: 'Le fichier doit contenir entre 1 octet et 50 Mo.' };
    }

    if (options.documentType === 'COMPTE_ADMINISTRATIF') {
      const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (mimeType !== 'application/pdf' || header !== '%PDF-') {
        return { ...result, error: 'Un compte administratif doit être un fichier PDF valide.' };
      }
    }

    try {
      result.checksumSha256 = await calculateFileSha256(file);
      if(options.partNumber) storagePath=storagePath.replace(/\.[^.]+$/,`-part-${options.partNumber}-${result.checksumSha256}.pdf`);
      result.storagePath=storagePath;
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(storagePath, file, { cacheControl: '300', upsert: false, contentType: mimeType });

      if (error || !data) {
        if(error && (/already exists|Duplicate/i.test(error.message) || String(error.statusCode)==='409')) {
          const checked=await supabase.functions.invoke('admin-media-url',{body:{action:'check-upload',bucket:'public_documents',path:storagePath,checksum_sha256:result.checksumSha256,file_size_bytes:fileSizeBytes}});
          if(!checked.error && checked.data?.checksum_sha256===result.checksumSha256) return {...result,success:true};
        }
        return { ...result, success: false, error: error?.message || 'Téléversement non confirmé.' };
      }

      return { ...result, success: true };
    } catch (error) {
      return { ...result, error: error instanceof Error ? error.message : 'Téléversement impossible.' };
    }
  }

  /**
   * Téléversement atomique d'un document multi-parties (plusieurs fascicules PDF)
   * En cas d'échec sur une partie ultérieure, les fichiers déjà envoyés sont supprimés (rollback).
   */
  public static async uploadMultiPartDocument(
    partsInput: MultiPartInputItem[],
    options: Omit<DocumentUploadOptions, 'partNumber'>
  ): Promise<MultiPartUploadResult> {
    const uploadedPaths: string[] = [];
    const documentParts: DocumentPartInfo[] = [];
    let totalBytes = 0;

    const normalizedParts = partsInput.map((p, idx) => {
      const partNumber = p.partNumber ?? p.part_number ?? (idx + 1);
      const fileName = p.fileName ?? p.file_name ?? (p.file instanceof File ? p.file.name : `part-${partNumber}.pdf`);
      const pageStart = p.pageStart ?? p.page_start;
      const pageEnd = p.pageEnd ?? p.page_end;
      const pageRange = p.pageRange ?? p.page_range ?? (pageStart && pageEnd ? `${pageStart}-${pageEnd}` : `Pages ${pageStart || 1}`);
      return {
        partNumber,
        fileName,
        file: p.file,
        pageStart,
        pageEnd,
        pageRange,
        notes: p.notes,
      };
    });

    // 1. Validation préalable des plages de pages
    const pageCheck = validateDocumentPageRanges(
      normalizedParts.map(p => ({
        part_number: p.partNumber,
        page_start: p.pageStart,
        page_end: p.pageEnd,
        page_range: p.pageRange,
      }))
    );

    if (!pageCheck.isValid || normalizedParts.length<2 || normalizedParts.length>100) {
      return {
        success: false,
        documentParts: [],
        manifestChecksumSha256: '',
        totalFileSizeBytes: 0,
        totalFileSizeFormatted: '0 Ko',
        primaryStoragePath: '',
        totalPageCount: 0,
        uploadedPaths: [],
        error: pageCheck.error || 'Plages de pages invalides.',
      };
    }

    // 2. Traitement séquentiel de chaque partie
    try {
      const hashes=new Set<string>();
      for(const item of normalizedParts) {
        if(item.file.size<1 || item.file.size>50*1024*1024 || item.file.type!=='application/pdf' || new TextDecoder().decode(await item.file.slice(0,5).arrayBuffer())!=='%PDF-') throw new Error('PDF réel requis pour chaque fascicule.');
        const hash=await calculateFileSha256(item.file);if(hashes.has(hash)) throw new Error('Un original est présent deux fois.');hashes.add(hash);
      }
      for (const item of normalizedParts) {
        const uploadRes = await this.uploadDocument(item.file, item.fileName, {
          ...options,
          partNumber: item.partNumber,
        });

        if (!uploadRes.success) {
          throw new Error(`Échec du téléversement du volet ${item.partNumber} (${item.fileName}) : ${uploadRes.error}`);
        }

        uploadedPaths.push(uploadRes.storagePath);
        totalBytes += uploadRes.fileSizeBytes;

        documentParts.push({
          id:`part-${item.partNumber}-${uploadRes.checksumSha256}`,original_filename:item.fileName,status:'TO_VERIFY',checksum_status:'DECLARED',
          part_number: item.partNumber,
          file_name: item.fileName,
          page_range: item.pageRange,
          page_start: item.pageStart,
          page_end: item.pageEnd,
          checksum_sha256: uploadRes.checksumSha256,
          file_size: uploadRes.fileSizeFormatted,
          file_size_bytes: uploadRes.fileSizeBytes,
          storage_path: uploadRes.storagePath,
          notes: item.notes,
        });
      }

      // 3. Calcul déterministe de l'empreinte logique du manifeste
      const manifestChecksum = await calculateManifestSha256(documentParts);

      const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);
      const totalSizeFormatted = parseFloat(sizeMb) >= 1 ? `${sizeMb} Mo` : `${Math.round(totalBytes / 1024)} Ko`;

      return {
        success: true,
        documentParts,
        manifestChecksumSha256: manifestChecksum,
        totalFileSizeBytes: totalBytes,
        totalFileSizeFormatted: totalSizeFormatted,
        primaryStoragePath: '',
        totalPageCount: pageCheck.totalPages || 0,
        uploadedPaths,
      };
    } catch (uploadError: any) {
      // 4. Compensation / Rollback en cas d'échec partiel
      console.warn('Rollback déclenché pour upload multi-parties:', uploadError.message);
      if (uploadedPaths.length > 0) {
        await this.deleteStorageFiles(uploadedPaths);
      }

      return {
        success: false,
        documentParts: [],
        manifestChecksumSha256: '',
        totalFileSizeBytes: 0,
        totalFileSizeFormatted: '0 Ko',
        primaryStoragePath: '',
        totalPageCount: 0,
        uploadedPaths: [],
        error: uploadError.message || 'Échec lors du téléversement multi-parties.',
      };
    }
  }

  /**
   * Crée une URL de téléchargement signée et temporaire pour un document privé
   */
  public static async createSignedUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
    if (!storagePath) throw new Error('Chemin de stockage non spécifié.');
    if (!isSupabaseConfigured()) throw new Error('Service de stockage indisponible.');

    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Impossible de générer le lien de consultation sécurisé.');
    }

    return data.signedUrl;
  }

  /**
   * Supprime des fichiers du stockage privé Supabase (utilisé pour compensation/rollback)
   */
  public static async deleteStorageFiles(storagePaths: string[]): Promise<void> {
    if (!storagePaths || storagePaths.length === 0) return;
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.storage.from(this.BUCKET_NAME).remove(storagePaths);
    } catch (removeError) {
      console.warn('Erreur lors de la suppression de compensation dans le bucket:', removeError);
    }
  }
}
