export const OCR_STATUSES = ['NOT_APPLICABLE', 'NOT_IMPLEMENTED', 'OCR_PENDING', 'PROCESSED', 'MANUAL_TRANSCRIPTION', 'FAILED'] as const;
export type DocumentOcrStatus = typeof OCR_STATUSES[number];
export const MULTIPART_ALGORITHM = 'SHA256_PARTS_MANIFEST_V1' as const;

export function normalizeOcrStatus(value: unknown, scanned?: boolean | null, textLayer?: boolean | null): DocumentOcrStatus | null {
  if (value == null || value === '') return null;
  if (value === 'NONE') return scanned === false && textLayer === true ? 'NOT_APPLICABLE' : null;
  if (value === 'PENDING') return 'OCR_PENDING';
  if (!OCR_STATUSES.includes(value as DocumentOcrStatus)) throw new Error('Statut OCR inconnu.');
  if (value === 'NOT_APPLICABLE' && (scanned === true || textLayer === false)) throw new Error('OCR non applicable incompatible avec le document.');
  return value as DocumentOcrStatus;
}

export interface ManifestPart {
  id?: string;
  part_number: number;
  storage_path?: string;
  checksum_sha256?: string;
  file_size_bytes?: number;
  page_start?: number | null;
  page_end?: number | null;
}

export function serializeMultipartManifest(parts: readonly ManifestPart[]): string {
  if (parts.length < 2 || parts.length > 100) throw new Error('Deux à cent fascicules requis.');
  let end = 0;
  const ids = new Set<string>(), paths = new Set<string>(), hashes = new Set<string>();
  const rows = parts.map((part, index) => {
    if (part.part_number !== index + 1 || !part.id || !/^[a-zA-Z0-9-]+$/.test(part.id) ||
      !part.storage_path || !/^[a-zA-Z0-9_./-]+$/.test(part.storage_path) || /(^|\/)\.\.(\/|$)/.test(part.storage_path) ||
      !part.checksum_sha256 || !/^[a-f0-9]{64}$/.test(part.checksum_sha256) ||
      !Number.isSafeInteger(part.file_size_bytes) || part.file_size_bytes! < 1 ||
      !Number.isSafeInteger(part.page_start) || !Number.isSafeInteger(part.page_end) ||
      part.page_start !== end + 1 || part.page_end! < part.page_start ||
      ids.has(part.id) || paths.has(part.storage_path) || hashes.has(part.checksum_sha256)) {
      throw new Error('Ordre, originaux distincts et plages de pages contiguës requis.');
    }
    ids.add(part.id); paths.add(part.storage_path); hashes.add(part.checksum_sha256); end = part.page_end!;
    return `${part.part_number}|${part.id}|${part.storage_path}|${part.file_size_bytes}|${part.checksum_sha256}|${part.page_start}|${part.page_end}\n`;
  });
  return `SUIVIBUDGET_PARTS_V1\n${rows.join('')}`;
}

export async function calculateManifestSha256(parts: readonly ManifestPart[]): Promise<string> {
  const bytes = new TextEncoder().encode(serializeMultipartManifest(parts));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
