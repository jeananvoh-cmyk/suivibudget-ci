import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { PNG } from 'pngjs';
import {
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  BarcodeFormat,
  RGBLuminanceSource,
} from '@zxing/library';
import { buildQrSvgString, generateQrMatrix } from '../qrCode';
import { QrCodeSvg } from '../../components/common/QrCodeSvg';

const require = createRequire(import.meta.url);
const jsQR = require('jsqr') as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
) => { data: string; binaryData: number[] } | null;

let wasmInitialized = false;
const ARTIFACTS_DIR = join(process.cwd(), 'docs', 'audits', 'qr-validation');

async function ensureResvgWasm(): Promise<void> {
  if (wasmInitialized) return;
  const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
  await initWasm(readFileSync(wasmPath));
  wasmInitialized = true;
}

function renderSvgToPngRgba(
  svg: string,
  widthPx?: number
): { pngBuffer: Buffer; width: number; height: number; rgba: Uint8ClampedArray } {
  const resvg = new Resvg(
    svg,
    widthPx
      ? { fitTo: { mode: 'width', value: widthPx } }
      : { fitTo: { mode: 'original' } }
  );
  const rendered = resvg.render();
  const pngBuffer = Buffer.from(rendered.asPng());
  const parsed = PNG.sync.read(pngBuffer);
  return {
    pngBuffer,
    width: parsed.width,
    height: parsed.height,
    rgba: new Uint8ClampedArray(parsed.data),
  };
}

function decodePngBufferWithJsQr(pngBuffer: Buffer): { text: string; bytes: Uint8Array; width: number; height: number } {
  const parsed = PNG.sync.read(pngBuffer);
  const rgba = new Uint8ClampedArray(parsed.data);
  const decoded = jsQR(rgba, parsed.width, parsed.height, { inversionAttempts: 'dontInvert' });
  if (!decoded) {
    throw new Error(`jsQR failed to decode ${parsed.width}x${parsed.height} QR PNG`);
  }
  const bytes = Uint8Array.from(decoded.binaryData);
  return {
    text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    bytes,
    width: parsed.width,
    height: parsed.height,
  };
}

function decodePngBufferWithZxing(pngBuffer: Buffer): string {
  const parsed = PNG.sync.read(pngBuffer);
  const rgba = new Uint8ClampedArray(parsed.data);
  const luminances = new Uint8ClampedArray(parsed.width * parsed.height);
  for (let i = 0; i < parsed.width * parsed.height; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    luminances[i] = ((r + g * 2 + b) >> 2) & 0xff;
  }
  const source = new RGBLuminanceSource(luminances, parsed.width, parsed.height);
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
  hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
  hints.set(DecodeHintType.TRY_HARDER, true);
  try {
    return reader.decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText();
  } catch {
    return reader.decode(new BinaryBitmap(new GlobalHistogramBinarizer(source)), hints).getText();
  }
}

export interface QrMatrixVector {
  id: string;
  description: string;
  payload: string;
  expectedVersion: number;
  expectedEc: 'M' | 'L';
  renderPx: number;
}

export const QR_INDEPENDENT_VECTORS: QrMatrixVector[] = [
  {
    id: 'v1-m-short',
    description: 'V1-M minimal payload (12 octets, 1 bloc RS)',
    payload: 'https://ci.g',
    expectedVersion: 1,
    expectedEc: 'M',
    renderPx: 145,
  },
  {
    id: 'v2-m-boundary',
    description: 'V2-M borne max 26 octets (1 bloc RS)',
    payload: 'https://suivibudget.ci/p01',
    expectedVersion: 2,
    expectedEc: 'M',
    renderPx: 165,
  },
  {
    id: 'v3-m-max-boundary',
    description: 'V3-M borne exacte 42 octets (1 bloc RS)',
    payload: 'https://suivibudget.ci/projets/cocody-001',
    expectedVersion: 3,
    expectedEc: 'M',
    renderPx: 185,
  },
  {
    id: 'v4-m-multiblock',
    description: 'V4-M multi-blocs RS (2x32, 62 octets max)',
    payload: 'https://suivibudget.vercel.app/projets?project=cocody-2024-06',
    expectedVersion: 4,
    expectedEc: 'M',
    renderPx: 205,
  },
  {
    id: 'v5-m-passport-url',
    description: 'V5-M multi-blocs RS (2x43, 84 octets max)',
    payload: 'https://suivibudget.vercel.app/projets?project=proj-tiassale-ecole-01&view=passport',
    expectedVersion: 5,
    expectedEc: 'M',
    renderPx: 225,
  },
  {
    id: 'v6-m-multiblock',
    description: 'V6-M multi-blocs RS (4x27, 106 octets max)',
    payload: 'https://suivibudget.vercel.app/projets?project=proj-com-cocody-voirie-2026-lot-01&view=passport&fy=2026',
    expectedVersion: 6,
    expectedEc: 'M',
    renderPx: 245,
  },
  {
    id: 'v7-m-version-info',
    description: 'V7-M version info + multi-blocs RS (4x31, 122 octets max)',
    payload: 'https://suivibudget.vercel.app/projets?project=inst-reg-agneby-tiassa-route-nationale-2026-a1&view=passport&step=3',
    expectedVersion: 7,
    expectedEc: 'M',
    renderPx: 265,
  },
  {
    id: 'v8-m-unequal-groups',
    description: 'V8-M groupes asymétriques RS (2x38 + 2x39, 152 octets max)',
    payload: 'https://suivibudget.vercel.app/projets?project=inst-com-abobo-equipement-sanitaire-maternite-2026&view=passport&source=dgbf-lfi-2026&page=142',
    expectedVersion: 8,
    expectedEc: 'M',
    renderPx: 360,
  },
  {
    id: 'v9-m-utf8-accents',
    description: 'V9-M multi-blocs asymétriques (3x36 + 2x37) avec UTF-8 accentué',
    payload: "https://suivibudget.vercel.app/projets?commune=Tiassalé&secteur=Éducation&note=Côte_d_Ivoire_République_Suivi_Budgétaire_2026_Vérifié_DGMP_CA_1234567890",
    expectedVersion: 9,
    expectedEc: 'M',
    renderPx: 305,
  },
  {
    id: 'v10-m-max-boundary',
    description: 'V10-M borne max exacte 213 octets (4x43 + 1x44, compteur 16 bits)',
    payload: 'P'.repeat(213),
    expectedVersion: 10,
    expectedEc: 'M',
    renderPx: 325,
  },
  {
    id: 'v10-l-max-capacity',
    description: 'V10-L capacité maximale exacte 271 octets (2x68 + 2x69, EC Level L)',
    payload: 'https://suivibudget.vercel.app/projets?p=' + 'X'.repeat(271 - 42),
    expectedVersion: 10,
    expectedEc: 'L',
    renderPx: 390,
  },
];

describe('QR Code Independent Dual-Decoder Validation (jsQR + @zxing/library)', () => {
  beforeAll(async () => {
    await ensureResvgWasm();
  });

  it('rasterizes SVGs and decodes every supported version V1..V10-M and V10-L via both jsQR and ZXing', () => {
    const writeArtifacts = process.env.WRITE_QR_ARTIFACTS === '1';
    if (writeArtifacts) {
      mkdirSync(ARTIFACTS_DIR, { recursive: true });
    }

    const reportRows: Array<Record<string, unknown>> = [];

    for (const vec of QR_INDEPENDENT_VECTORS) {
      const byteLength = new TextEncoder().encode(vec.payload).length;
      const matrix = generateQrMatrix(vec.payload);
      expect(matrix.version, `${vec.id} version`).toBe(vec.expectedVersion);
      expect(matrix.errorCorrection, `${vec.id} EC level`).toBe(vec.expectedEc);

      const svg = buildQrSvgString(vec.payload, vec.renderPx);
      const { pngBuffer, width, height } = renderSvgToPngRgba(svg);
      expect(width).toBe(vec.renderPx);
      expect(height).toBe(vec.renderPx);

      const jsQrDecoded = decodePngBufferWithJsQr(pngBuffer);
      expect(jsQrDecoded.text, `jsQR exact match for ${vec.id}`).toBe(vec.payload);

      let zxingDecoded: string;
      try {
        zxingDecoded = decodePngBufferWithZxing(pngBuffer);
      } catch (err) {
        throw new Error(`ZXing failed on ${vec.id} (${width}x${height}, moduleGrid=${matrix.size}): ${String(err)}`);
      }
      expect(zxingDecoded, `ZXing exact match for ${vec.id}`).toBe(vec.payload);

      if (writeArtifacts) {
        writeFileSync(join(ARTIFACTS_DIR, `${vec.id}.svg`), svg, 'utf8');
        writeFileSync(join(ARTIFACTS_DIR, `${vec.id}.png`), pngBuffer);
      }

      reportRows.push({
        id: vec.id,
        description: vec.description,
        version: matrix.version,
        errorCorrection: matrix.errorCorrection,
        maskPattern: matrix.maskPattern,
        moduleGrid: matrix.size,
        byteLength,
        renderPx: vec.renderPx,
        jsQrMatch: jsQrDecoded.text === vec.payload,
        zxingMatch: zxingDecoded === vec.payload,
      });
    }

    if (writeArtifacts) {
      writeFileSync(
        join(ARTIFACTS_DIR, 'decoding-results.json'),
        JSON.stringify(
          {
            generatedAt: '2026-11-16',
            decoders: ['jsqr@1.4.0', '@zxing/library'],
            rasterizer: '@resvg/resvg-wasm',
            results: reportRows,
          },
          null,
          2
        ) + '\n',
        'utf8'
      );
    }
  });

  it('decodes small print/screen SVG dimensions (76px A4 thumbnail, 96px UI, 128px card, 354px A4 30mm@300DPI)', () => {
    const canonicalUrl = 'https://suivibudget.vercel.app/annuaire/communes?institution=inst-com-cocody';
    const sizes = [76, 96, 128, 354];

    for (const sizePx of sizes) {
      const svg = buildQrSvgString(canonicalUrl, sizePx);
      const rasterPx = sizePx < 150 ? sizePx * 2 : sizePx;
      const { pngBuffer } = renderSvgToPngRgba(svg, rasterPx);

      expect(decodePngBufferWithJsQr(pngBuffer).text).toBe(canonicalUrl);
      expect(decodePngBufferWithZxing(pngBuffer)).toBe(canonicalUrl);
    }

    const reactSvg = renderToStaticMarkup(
      React.createElement(QrCodeSvg, { value: canonicalUrl, size: 76 })
    );
    expect(reactSvg).toContain('xmlns="http://www.w3.org/2000/svg"');
    const { pngBuffer } = renderSvgToPngRgba(reactSvg, 228);
    expect(decodePngBufferWithJsQr(pngBuffer).text).toBe(canonicalUrl);
    expect(decodePngBufferWithZxing(pngBuffer)).toBe(canonicalUrl);
  });

  it('verifies conserved SVG/PNG test artifacts in docs/audits/qr-validation decode identically', () => {
    for (const vec of QR_INDEPENDENT_VECTORS) {
      const pngPath = join(ARTIFACTS_DIR, `${vec.id}.png`);
      const svgPath = join(ARTIFACTS_DIR, `${vec.id}.svg`);
      if (existsSync(pngPath) && existsSync(svgPath)) {
        const pngBuffer = readFileSync(pngPath);
        expect(decodePngBufferWithJsQr(pngBuffer).text).toBe(vec.payload);
        expect(decodePngBufferWithZxing(pngBuffer)).toBe(vec.payload);
      }
    }
  });

  it('rejects payloads exceeding V10-L 271-byte UTF-8 capacity cleanly', () => {
    const oversized = 'A'.repeat(272);
    expect(() => generateQrMatrix(oversized)).toThrow('271 max supported bytes');

    const multiByteOver = 'É'.repeat(136);
    expect(() => generateQrMatrix(multiByteOver)).toThrow('271 max supported bytes');
  });
});
