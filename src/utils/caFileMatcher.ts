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
 * Extraction automatique du nombre de pages d'un fichier PDF (ArrayBuffer ou Uint8Array)
 * Analyse les dictionnaires /Pages et objets /Page sans dépendance externe lourde.
 */
export function extractPdfPageCountFromBuffer(buffer: ArrayBuffer | Uint8Array): number | null {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 8) return null;

    const headSlice = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
    if (!headSlice.includes('%PDF-')) return null;

    const text = new TextDecoder('latin1').decode(bytes);

    // Map each indirect object number to its latest non-stream dictionary content (respecting PDF incremental updates)
    const objectMap = new Map<number, string>();
    let hasCompressedObjStm = false;
    let hasEncryption = false;

    const objRegex = /(?:^|[\r\n\s])(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/g;
    let match: RegExpExecArray | null;
    while ((match = objRegex.exec(text)) !== null) {
      const objNum = parseInt(match[1], 10);
      if (isNaN(objNum) || objNum <= 0) continue;
      const rawBody = match[3];
      const streamIdx = rawBody.search(/stream[\r\n]/);
      const dictPart = streamIdx >= 0 ? rawBody.slice(0, streamIdx) : rawBody;
      objectMap.set(objNum, dictPart);

      if (/\/Type\s*\/ObjStm\b/.test(dictPart)) {
        hasCompressedObjStm = true;
      }
      if (/\/Encrypt\b/.test(dictPart)) {
        hasEncryption = true;
      }
    }

    if (/\/Encrypt\s+\d+\s+\d+\s+R/.test(text)) {
      hasEncryption = true;
    }

    const extractCountFromPagesDict = (dict: string): number | null => {
      if (!/\/Type\s*\/Pages\b/.test(dict)) return null;
      const countMatch = dict.match(/\/Count\s+(\d+)\b/);
      if (!countMatch) return null;
      const count = parseInt(countMatch[1], 10);
      return !isNaN(count) && count > 0 ? count : null;
    };

    // 1. Follow /Type /Catalog -> /Pages N G R -> root /Type /Pages /Count
    let catalogPagesObjNum: number | null = null;
    for (const [, dict] of objectMap.entries()) {
      if (/\/Type\s*\/Catalog\b/.test(dict)) {
        const pagesRef = dict.match(/\/Pages\s+(\d+)\s+\d+\s+R\b/);
        if (pagesRef) {
          catalogPagesObjNum = parseInt(pagesRef[1], 10);
        }
      }
    }

    // Also check trailer /Root if needed
    if (catalogPagesObjNum === null) {
      const rootMatches = [...text.matchAll(/\/Root\s+(\d+)\s+\d+\s+R\b/g)];
      if (rootMatches.length > 0) {
        const rootObjNum = parseInt(rootMatches[rootMatches.length - 1][1], 10);
        const rootDict = objectMap.get(rootObjNum);
        if (rootDict) {
          const pagesRef = rootDict.match(/\/Pages\s+(\d+)\s+\d+\s+R\b/);
          if (pagesRef) {
            catalogPagesObjNum = parseInt(pagesRef[1], 10);
          }
        }
      }
    }

    if (catalogPagesObjNum !== null) {
      const rootPagesDict = objectMap.get(catalogPagesObjNum);
      if (rootPagesDict) {
        const rootCount = extractCountFromPagesDict(rootPagesDict);
        if (rootCount !== null) {
          return rootCount;
        }
      }
    }

    // 2. Look for root /Type /Pages dictionary (without /Parent) in indirect objects
    const rootPagesCounts: number[] = [];
    const allPagesCounts: number[] = [];
    for (const [, dict] of objectMap.entries()) {
      const c = extractCountFromPagesDict(dict);
      if (c !== null) {
        allPagesCounts.push(c);
        if (!/\/Parent\s+\d+\s+\d+\s+R\b/.test(dict)) {
          rootPagesCounts.push(c);
        }
      }
    }

    if (rootPagesCounts.length > 0) {
      return rootPagesCounts[rootPagesCounts.length - 1];
    }

    if (!hasCompressedObjStm && !hasEncryption && allPagesCounts.length > 0) {
      return Math.max(...allPagesCounts);
    }

    // 3. Fallback: count unique indirect /Type /Page objects (only if PDF is not using compressed object streams or encryption)
    if (hasCompressedObjStm || hasEncryption) {
      return null;
    }

    let leafPageCount = 0;
    for (const [, dict] of objectMap.entries()) {
      if (/\/Type\s*\/Page(?!\s*s)\b/.test(dict)) {
        leafPageCount++;
      }
    }
    if (leafPageCount > 0) {
      return leafPageCount;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Calcule le nombre de pages d'un fichier PDF (File, Blob ou ArrayBuffer)
 */
export async function extractPdfPageCount(file: File | Blob | ArrayBuffer): Promise<number | null> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  return extractPdfPageCountFromBuffer(buffer);
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
