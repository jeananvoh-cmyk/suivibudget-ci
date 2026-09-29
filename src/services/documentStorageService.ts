// =========================================================================
// SERVICE : STOCKAGE DES DOCUMENTS PUBLICS & COMPTES ADMINISTRATIFS
// SuiviBudget Côte d'Ivoire - Intégration Supabase Storage & Chemins Standardisés
// =========================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { calculateFileSha256 } from '../utils/caFileMatcher';
import { OfficialDocumentType } from '../types';

export interface DocumentUploadOptions {
  institutionId: string;
  institutionType?: 'MAIRIE' | 'REGION' | 'DISTRICT' | 'MINISTERE' | 'AUTORITE_REGULATION';
  fiscalYear: number;
  documentType: OfficialDocumentType;
  version?: number;
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

export class DocumentStorageService {
  private static BUCKET_NAME = 'public_documents';

  /**
   * Construit le chemin de stockage canonique :
   * Ex: comptes-administratifs/communes/inst-com-cocody/2025/compte-administratif-2025-v1.pdf
   */
  public static buildCanonicalStoragePath(options: DocumentUploadOptions, originalFilename: string): string {
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
    const standardFilename = `${cleanDocSlug}-${fiscalYear}-v${version}.${extension}`;

    return `${docTypeFolder}/${entityFolder}/${institutionId}/${fiscalYear}/${standardFilename}`;
  }

  /**
   * Téléverse un fichier documentaire vers Supabase Storage (ou repli local offline)
   */
  public static async uploadDocument(
    file: File | Blob,
    originalFilename: string,
    options: DocumentUploadOptions
  ): Promise<DocumentUploadResult> {
    const storagePath = this.buildCanonicalStoragePath(options, originalFilename);
    const mimeType = file.type || 'application/pdf';
    const fileSizeBytes = file.size;

    // Calcul de la taille lisible
    const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    const fileSizeFormatted = parseFloat(sizeMb) >= 1 ? `${sizeMb} Mo` : `${Math.round(fileSizeBytes / 1024)} Ko`;

    // Calcul du hash SHA-256
    let checksumSha256 = '';
    try {
      checksumSha256 = await calculateFileSha256(file);
    } catch (e) {
      console.warn("Impossible de calculer le checksum SHA-256", e);
    }

    // 1. Téléversement vers Supabase Storage si configuré
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: mimeType,
          });

        if (error) {
          console.error("Erreur téléversement Supabase Storage :", error);
        } else if (data) {
          const { data: publicUrlData } = supabase.storage
            .from(this.BUCKET_NAME)
            .getPublicUrl(storagePath);

          return {
            success: true,
            fileUrl: publicUrlData.publicUrl,
            storageBucket: this.BUCKET_NAME,
            storagePath,
            checksumSha256,
            fileSizeBytes,
            fileSizeFormatted,
            originalFileName: originalFilename,
            mimeType,
          };
        }
      } catch (err: any) {
        console.warn("Exception lors du téléversement Supabase Storage :", err);
      }
    }

    // 2. Mode local / hors ligne / réplicat client
    let localUrl = '';
    if (file instanceof File) {
      try {
        localUrl = URL.createObjectURL(file);
      } catch {
        localUrl = '';
      }
    }

    // Si pas d'ObjectURL, on utilise un chemin d'archive public symbolique
    if (!localUrl) {
      localUrl = `https://documents.suivibudget.ci/${storagePath}`;
    }

    return {
      success: true,
      fileUrl: localUrl,
      storageBucket: this.BUCKET_NAME,
      storagePath,
      checksumSha256,
      fileSizeBytes,
      fileSizeFormatted,
      originalFileName: originalFilename,
      mimeType,
    };
  }
}
