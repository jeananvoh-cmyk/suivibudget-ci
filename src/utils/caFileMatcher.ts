// =========================================================================
// UTILITAIRE : MATCHING AUTOMATIQUE & CHECKSUM SHA-256 DES COMPTES ADMINISTRATIFS
// SuiviBudget Côte d'Ivoire - Ingestion en masse & Traitement des 232 Collectivités
// =========================================================================

import { Institution, BatchCaMatchProposal, PublicDocument } from '../types';

/**
 * Calcul du hash SHA-256 cryptographique d'un fichier (Web Crypto API)
 */
export async function calculateFileSha256(file: File | Blob | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (file instanceof ArrayBuffer) {
    buffer = file;
  } else {
    buffer = await file.arrayBuffer();
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalisation d'une chaîne pour comparaison insensible aux accents et caractères spéciaux
 */
export function normalizeSearchString(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Nettoyage des préfixes institutionnels fréquents
 */
export function cleanInstitutionName(name: string): string {
  let clean = normalizeSearchString(name);
  clean = clean.replace(/^(mairie|commune|municipalite|conseil regional|region|district autonome|district)\s*(de|du|d|des|de la)?\s*/i, '');
  return clean.trim();
}

/**
 * Dictionnaire d'acronymes et abréviations courantes dans les nomenclatures ivoiriennes
 */
const COMMON_ALIASES: Record<string, string> = {
  'bke': 'bouake',
  'sp': 'san pedro',
  'yop': 'yopougon',
  'abj': 'abidjan',
  'yam': 'yamoussoukro',
  'treich': 'treichville',
  'koum': 'koumassi',
  'marcor': 'marcory',
  'att': 'attecoube',
  'dalo': 'daloa',
  'korh': 'korhogo',
  'man': 'man',
  'gagnoa': 'gagnoa',
  'abeng': 'abengourou',
  'bassam': 'grand bassam',
  'gbassam': 'grand bassam',
  'lahou': 'grand lahou',
  'glahou': 'grand lahou',
  'agnib': 'agnibilekrou',
  'ferke': 'ferkessedougou',
  'tiass': 'tiassale',
  'bouna': 'bouna',
  'odien': 'odienne',
  'me': 'la me',
  'indenie': 'indenie djuablin',
  'gbokle': 'gbokle',
  'nawa': 'nawa',
  'loh': 'loh djiboua',
  'marahoue': 'marahoue',
  'haut': 'haut sassandra',
};

/**
 * Extraction de l'exercice fiscal depuis le nom du fichier (Ex: 2025, 2024...)
 */
export function extractFiscalYearFromFileName(fileName: string, defaultYear = 2025): number {
  const match = fileName.match(/(?:^|[^0-9])(20[2-3][0-9])(?:[^0-9]|$)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return defaultYear;
}

/**
 * Calcul du score de similarité (Jaccard + Inclusion) entre 0 et 100
 */
export function computeMatchScore(cleanFileName: string, targetName: string): number {
  const cleanTarget = cleanInstitutionName(targetName);
  if (!cleanTarget) return 0;

  // 1. Correspondance exacte ou inclusion directe
  if (cleanFileName.includes(cleanTarget)) {
    return 95;
  }

  // 2. Vérification des alias abrégés
  const tokens = cleanFileName.split(' ');
  for (const token of tokens) {
    if (COMMON_ALIASES[token] && cleanTarget.includes(COMMON_ALIASES[token])) {
      return 85;
    }
  }

  // 3. Score par mots-clés (Jaccard)
  const targetWords = cleanTarget.split(' ').filter(w => w.length >= 3);
  if (targetWords.length === 0) return 0;

  let matchedWords = 0;
  for (const word of targetWords) {
    if (cleanFileName.includes(word)) {
      matchedWords++;
    }
  }

  const ratio = matchedWords / targetWords.length;
  if (ratio === 1) return 90;
  if (ratio >= 0.6) return 70;
  if (ratio > 0) return 40;

  return 0;
}

/**
 * Propose la meilleure collectivité pour un fichier donné
 */
export function matchFileToCollectivite(
  file: File,
  collectivites: Institution[],
  existingDocs: PublicDocument[] = [],
  defaultYear = 2025
): Promise<BatchCaMatchProposal> {
  return new Promise(async (resolve) => {
    const fileName = file.name;
    const cleanName = normalizeSearchString(fileName);
    const detectedYear = extractFiscalYearFromFileName(fileName, defaultYear);
    
    // Calcul de la taille formatée
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const formattedSize = parseFloat(sizeMb) >= 1 ? `${sizeMb} Mo` : `${Math.round(file.size / 1024)} Ko`;

    // Calcul SHA-256
    let checksum = '';
    try {
      checksum = await calculateFileSha256(file);
    } catch {
      checksum = '';
    }

    // Recherche de la meilleure correspondance parmi les 232 collectivités
    let bestMatch: Institution | undefined = undefined;
    let highestScore = 0;

    for (const col of collectivites) {
      const score = computeMatchScore(cleanName, col.name);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = col;
      }
    }

    // Détermination du niveau de confiance
    let confidence: 'STRONG' | 'UNCERTAIN' | 'NONE' = 'NONE';
    if (highestScore >= 80) confidence = 'STRONG';
    else if (highestScore >= 40) confidence = 'UNCERTAIN';

    // Détection des doublons
    let isDuplicate = false;
    let duplicateReason: string | undefined = undefined;
    let existingDocId: string | undefined = undefined;
    let isNewVersion = false;

    // 1. Vérification par Checksum exact
    if (checksum) {
      const docWithSameHash = existingDocs.find(d => d.checksum_sha256 === checksum);
      if (docWithSameHash) {
        isDuplicate = true;
        duplicateReason = `Ce document est rigoureusement identique à "${docWithSameHash.title}" (même empreinte SHA-256).`;
        existingDocId = docWithSameHash.id;
      }
    }

    // 2. Vérification par collectivité + exercice
    if (!isDuplicate && bestMatch) {
      const existingForCol = existingDocs.find(d => 
        (d.institution_id === bestMatch!.id || normalizeSearchString(d.institution_name) === normalizeSearchString(bestMatch!.name)) &&
        (d.year === detectedYear || d.fiscal_year === detectedYear) &&
        (d.document_type === 'COMPTE_ADMINISTRATIF' || d.category === 'COMPTE_ADMINISTRATIF')
      );

      if (existingForCol) {
        isDuplicate = true;
        isNewVersion = true;
        duplicateReason = `Un Compte Administratif ${detectedYear} existe déjà pour ${bestMatch.name} (Version ${existingForCol.version || 1}). Sera enregistré comme nouvelle version.`;
        existingDocId = existingForCol.id;
      }
    }

    resolve({
      id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      file,
      fileName,
      fileSize: formattedSize,
      fileSizeBytes: file.size,
      detectedYear,
      matchedInstitutionId: bestMatch?.id,
      matchedInstitutionName: bestMatch?.name,
      matchedInstitutionType: (bestMatch?.type === 'REGION' ? 'REGION' : 'MAIRIE'),
      confidence,
      confidenceScore: highestScore,
      checksum_sha256: checksum,
      isDuplicate,
      duplicateReason,
      existingDocId,
      isNewVersion,
      sourceName: 'DGDDL',
    });
  });
}
