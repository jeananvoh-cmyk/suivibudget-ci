export type QrErrorCorrectionLevel = 'M' | 'L';

export interface QrMatrix {
  version: number;
  size: number;
  errorCorrection: QrErrorCorrectionLevel;
  maskPattern: number;
  modules: boolean[][];
}

interface VersionSpec {
  version: number;
  ecLevel: QrErrorCorrectionLevel;
  maxBytes: number;
  totalDataCodewords: number;
  ecPerBlock: number;
  group1Blocks: number;
  group1Data: number;
  group2Blocks: number;
  group2Data: number;
  alignmentCenters: number[];
}

// ISO/IEC 18004 Table 9 & Table E.1 (Versions 1-10 Level M + V10 Level L fallback for long URLs)
const VERSION_SPECS: readonly VersionSpec[] = [
  { version: 1, ecLevel: 'M', maxBytes: 14, totalDataCodewords: 16, ecPerBlock: 10, group1Blocks: 1, group1Data: 16, group2Blocks: 0, group2Data: 0, alignmentCenters: [] },
  { version: 2, ecLevel: 'M', maxBytes: 26, totalDataCodewords: 28, ecPerBlock: 16, group1Blocks: 1, group1Data: 28, group2Blocks: 0, group2Data: 0, alignmentCenters: [6, 18] },
  { version: 3, ecLevel: 'M', maxBytes: 42, totalDataCodewords: 44, ecPerBlock: 26, group1Blocks: 1, group1Data: 44, group2Blocks: 0, group2Data: 0, alignmentCenters: [6, 22] },
  { version: 4, ecLevel: 'M', maxBytes: 62, totalDataCodewords: 64, ecPerBlock: 18, group1Blocks: 2, group1Data: 32, group2Blocks: 0, group2Data: 0, alignmentCenters: [6, 26] },
  { version: 5, ecLevel: 'M', maxBytes: 84, totalDataCodewords: 86, ecPerBlock: 24, group1Blocks: 2, group1Data: 43, group2Blocks: 0, group2Data: 0, alignmentCenters: [6, 30] },
  { version: 6, ecLevel: 'M', maxBytes: 106, totalDataCodewords: 108, ecPerBlock: 16, group1Blocks: 4, group1Data: 27, group2Blocks: 0, group2Data: 0, alignmentCenters: [6, 34] },
  { version: 7, ecLevel: 'M', maxBytes: 122, totalDataCodewords: 124, ecPerBlock: 18, group1Blocks: 4, group1Data: 31, group2Blocks: 0, group2Data: 0, alignmentCenters: [6, 22, 38] },
  { version: 8, ecLevel: 'M', maxBytes: 152, totalDataCodewords: 154, ecPerBlock: 22, group1Blocks: 2, group1Data: 38, group2Blocks: 2, group2Data: 39, alignmentCenters: [6, 24, 42] },
  { version: 9, ecLevel: 'M', maxBytes: 180, totalDataCodewords: 182, ecPerBlock: 22, group1Blocks: 3, group1Data: 36, group2Blocks: 2, group2Data: 37, alignmentCenters: [6, 26, 46] },
  { version: 10, ecLevel: 'M', maxBytes: 213, totalDataCodewords: 216, ecPerBlock: 26, group1Blocks: 4, group1Data: 43, group2Blocks: 1, group2Data: 44, alignmentCenters: [6, 28, 50] },
  { version: 10, ecLevel: 'L', maxBytes: 271, totalDataCodewords: 274, ecPerBlock: 18, group1Blocks: 2, group1Data: 68, group2Blocks: 2, group2Data: 69, alignmentCenters: [6, 28, 50] },
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

export function buildReedSolomonGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

export function computeReedSolomonEcc(data: Uint8Array, ecCount: number): Uint8Array {
  const generator = buildReedSolomonGenerator(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const lead = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecCount - 1] = 0;
    if (lead !== 0) {
      for (let j = 0; j < ecCount; j++) {
        res[j] ^= gfMul(generator[j + 1], lead);
      }
    }
  }
  return res;
}

export function computeFormatBits(ecLevel: QrErrorCorrectionLevel, maskPattern: number): number {
  // ISO/IEC 18004 Table 12: L -> 01, M -> 00
  const ecBits = ecLevel === 'L' ? 0b01 : 0b00;
  const data = (ecBits << 3) | (maskPattern & 0b111);
  let rem = data << 10;
  const gen = 0b10100110111;
  for (let bit = 14; bit >= 10; bit--) {
    if ((rem >> bit) & 1) {
      rem ^= gen << (bit - 10);
    }
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

function computeVersionBits(version: number): number {
  let rem = version << 12;
  const gen = 0x1f25;
  for (let bit = 17; bit >= 12; bit--) {
    if ((rem >> bit) & 1) {
      rem ^= gen << (bit - 12);
    }
  }
  return (version << 12) | rem;
}

function pushBits(bits: number[], value: number, width: number): void {
  for (let i = width - 1; i >= 0; i--) {
    bits.push((value >> i) & 1);
  }
}

function encodeDataCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const bits: number[] = [];
  const ccWidth = spec.version >= 10 ? 16 : 8;

  // Byte mode indicator (0100) + character count + raw UTF-8 bytes
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, ccWidth);
  for (const byte of bytes) {
    pushBits(bits, byte, 8);
  }

  const maxBits = spec.totalDataCodewords * 8;
  const terminator = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < terminator; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = new Uint8Array(spec.totalDataCodewords);
  let byteIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let b = 0; b < 8; b++) {
      val = (val << 1) | bits[i + b];
    }
    codewords[byteIdx++] = val;
  }

  const pads = [0xec, 0x11];
  let padIdx = 0;
  while (byteIdx < spec.totalDataCodewords) {
    codewords[byteIdx++] = pads[padIdx % 2];
    padIdx++;
  }
  return codewords;
}

function interleaveBlocks(dataCodewords: Uint8Array, spec: VersionSpec): number[] {
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < spec.group1Blocks; i++) {
    const slice = dataCodewords.slice(offset, offset + spec.group1Data);
    offset += spec.group1Data;
    dataBlocks.push(slice);
    ecBlocks.push(computeReedSolomonEcc(slice, spec.ecPerBlock));
  }
  for (let i = 0; i < spec.group2Blocks; i++) {
    const slice = dataCodewords.slice(offset, offset + spec.group2Data);
    offset += spec.group2Data;
    dataBlocks.push(slice);
    ecBlocks.push(computeReedSolomonEcc(slice, spec.ecPerBlock));
  }

  const interleavedBytes: number[] = [];
  const maxDataLen = Math.max(spec.group1Data, spec.group2Data);
  for (let col = 0; col < maxDataLen; col++) {
    for (const block of dataBlocks) {
      if (col < block.length) interleavedBytes.push(block[col]);
    }
  }
  for (let col = 0; col < spec.ecPerBlock; col++) {
    for (const ec of ecBlocks) {
      interleavedBytes.push(ec[col]);
    }
  }

  const bits: number[] = [];
  for (const byte of interleavedBytes) {
    pushBits(bits, byte, 8);
  }
  return bits;
}

function createEmptyGrid(size: number): { modules: boolean[][]; isFunction: boolean[][] } {
  return {
    modules: Array.from({ length: size }, () => Array(size).fill(false)),
    isFunction: Array.from({ length: size }, () => Array(size).fill(false)),
  };
}

function setFunctionModule(
  modules: boolean[][],
  isFunction: boolean[][],
  row: number,
  col: number,
  dark: boolean
): void {
  modules[row][col] = dark;
  isFunction[row][col] = true;
}

function drawFinderPattern(modules: boolean[][], isFunction: boolean[][], topRow: number, leftCol: number, size: number): void {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = topRow + dr;
      const c = leftCol + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
      const dark = inOuter && (dist === 3 || dist <= 1);
      setFunctionModule(modules, isFunction, r, c, dark);
    }
  }
}

function drawAlignmentPattern(modules: boolean[][], isFunction: boolean[][], centerR: number, centerC: number): void {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (isFunction[centerR + dr][centerC + dc]) return;
    }
  }
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const dist = Math.max(Math.abs(dr), Math.abs(dc));
      setFunctionModule(modules, isFunction, centerR + dr, centerC + dc, dist === 2 || dist === 0);
    }
  }
}

function drawFormatInfo(
  modules: boolean[][],
  isFunction: boolean[][],
  size: number,
  ecLevel: QrErrorCorrectionLevel,
  maskPattern: number
): void {
  const bits = computeFormatBits(ecLevel, maskPattern);
  const getBit = (idx: number) => Boolean((bits >> idx) & 1);

  // Strip 1 (around top-left finder: bit 0 at (8,0) -> bit 14 at (0,8))
  for (let i = 0; i <= 5; i++) {
    setFunctionModule(modules, isFunction, 8, i, getBit(i));
  }
  setFunctionModule(modules, isFunction, 8, 7, getBit(6));
  setFunctionModule(modules, isFunction, 8, 8, getBit(7));
  setFunctionModule(modules, isFunction, 7, 8, getBit(8));
  for (let i = 9; i < 15; i++) {
    setFunctionModule(modules, isFunction, 14 - i, 8, getBit(i));
  }

  // Strip 2 (top-right horizontal + bottom-left vertical)
  for (let i = 0; i < 8; i++) {
    setFunctionModule(modules, isFunction, 8, size - 1 - i, getBit(i));
  }
  for (let i = 8; i < 15; i++) {
    setFunctionModule(modules, isFunction, size - 15 + i, 8, getBit(i));
  }
}

function drawVersionInfo(modules: boolean[][], isFunction: boolean[][], size: number, version: number): void {
  if (version < 7) return;
  const bits = computeVersionBits(version);
  for (let i = 0; i < 18; i++) {
    const dark = Boolean((bits >> i) & 1);
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunctionModule(modules, isFunction, a, b, dark);
    setFunctionModule(modules, isFunction, b, a, dark);
  }
}

export function isMaskConditionTrue(maskPattern: number, row: number, col: number): boolean {
  switch (maskPattern) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function scorePenalty(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  // N1: 5+ consecutive same-color modules in row or column
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // N2: 2x2 same-color blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = modules[r][c];
      if (
        modules[r][c + 1] === color &&
        modules[r + 1][c] === color &&
        modules[r + 1][c + 1] === color
      ) {
        penalty += 3;
      }
    }
  }

  // N3: 1:1:3:1:1 finder-like patterns in rows or columns
  const patternA = [true, false, true, true, true, false, true, false, false, false, false];
  const patternB = [false, false, false, false, true, false, true, true, true, false, true];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      let matchA = true;
      let matchB = true;
      for (let k = 0; k < 11; k++) {
        if (modules[r][c + k] !== patternA[k]) matchA = false;
        if (modules[r][c + k] !== patternB[k]) matchB = false;
      }
      if (matchA) penalty += 40;
      if (matchB) penalty += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      let matchA = true;
      let matchB = true;
      for (let k = 0; k < 11; k++) {
        if (modules[r + k][c] !== patternA[k]) matchA = false;
        if (modules[r + k][c] !== patternB[k]) matchB = false;
      }
      if (matchA) penalty += 40;
      if (matchB) penalty += 40;
    }
  }

  // N4: dark module ratio deviation from 50%
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) darkCount++;
    }
  }
  const pct = (darkCount * 100) / (size * size);
  const k = Math.floor(Math.abs(pct - 50) / 5);
  penalty += k * 10;

  return penalty;
}

/**
 * Generates a deterministic ISO/IEC 18004 QR code matrix (Byte mode UTF-8).
 */
export function generateQrMatrix(text: string): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  const spec = VERSION_SPECS.find((candidate) => bytes.length <= candidate.maxBytes);
  if (!spec) {
    throw new Error(`QR payload too long (${bytes.length} bytes > 271 max supported bytes)`);
  }

  const size = 17 + 4 * spec.version;
  const { modules: baseModules, isFunction } = createEmptyGrid(size);

  // 1. Finder patterns + 1-module separators
  drawFinderPattern(baseModules, isFunction, 0, 0, size);
  drawFinderPattern(baseModules, isFunction, 0, size - 7, size);
  drawFinderPattern(baseModules, isFunction, size - 7, 0, size);

  // 2. Alignment patterns (before timing patterns; skips finder overlap)
  for (const r of spec.alignmentCenters) {
    for (const c of spec.alignmentCenters) {
      drawAlignmentPattern(baseModules, isFunction, r, c);
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    if (!isFunction[6][i]) setFunctionModule(baseModules, isFunction, 6, i, dark);
    if (!isFunction[i][6]) setFunctionModule(baseModules, isFunction, i, 6, dark);
  }

  // 4. Always-dark module & version / format reservation
  setFunctionModule(baseModules, isFunction, size - 8, 8, true);
  drawFormatInfo(baseModules, isFunction, size, spec.ecLevel, 0);
  drawVersionInfo(baseModules, isFunction, size, spec.version);

  // 5. Encode data + ECC and place in zig-zag order
  const dataCodewords = encodeDataCodewords(bytes, spec);
  const allBits = interleaveBlocks(dataCodewords, spec);

  let bitIndex = 0;
  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol--;
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const col = rightCol - offset;
        if (!isFunction[row][col]) {
          baseModules[row][col] = bitIndex < allBits.length ? Boolean(allBits[bitIndex]) : false;
          bitIndex++;
        }
      }
    }
    upward = !upward;
  }

  // 6. Choose mask pattern 0..7 with lowest ISO penalty score
  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  let bestModules = baseModules;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = baseModules.map((row, r) =>
      row.map((val, c) => (isFunction[r][c] ? val : isMaskConditionTrue(mask, r, c) ? !val : val))
    );
    const dummyFunc = isFunction.map((r) => [...r]);
    drawFormatInfo(candidate, dummyFunc, size, spec.ecLevel, mask);
    const penalty = scorePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestModules = candidate;
    }
  }

  return {
    version: spec.version,
    size,
    errorCorrection: spec.ecLevel,
    maskPattern: bestMask,
    modules: bestModules,
  };
}

/**
 * Serializes a QR matrix to an SVG string with a 4-module white quiet zone.
 */
export function buildQrSvgString(text: string, pixelSize = 128, quietZone = 4): string {
  const qr = generateQrMatrix(text);
  const totalSize = qr.size + quietZone * 2;
  const pathParts: string[] = [];

  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) {
        pathParts.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges"><rect width="${totalSize}" height="${totalSize}" fill="#ffffff"/><path d="${pathParts.join('')}" fill="#0f172a"/></svg>`;
}
