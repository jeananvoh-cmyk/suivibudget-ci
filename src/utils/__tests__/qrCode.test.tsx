import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  buildQrSvgString,
  computeFormatBits,
  generateQrMatrix,
  isMaskConditionTrue,
} from '../qrCode';
import { ProjectAccountabilityPassport } from '../../components/ProjectAccountabilityPassport';
import { BudgetProject } from '../../types';

function readFormatFromMatrix(modules: boolean[][]): { copy1: number; copy2: number } {
  const size = modules.length;
  let copy1 = 0;
  // Strip 1: bit 0 at (8,0)..(8,5), bit 6 at (8,7), bit 7 at (8,8), bit 8 at (7,8), bits 9..14 at (5..0, 8)
  for (let i = 0; i <= 5; i++) {
    if (modules[8][i]) copy1 |= 1 << i;
  }
  if (modules[8][7]) copy1 |= 1 << 6;
  if (modules[8][8]) copy1 |= 1 << 7;
  if (modules[7][8]) copy1 |= 1 << 8;
  for (let i = 9; i < 15; i++) {
    if (modules[14 - i][8]) copy1 |= 1 << i;
  }

  let copy2 = 0;
  for (let i = 0; i < 8; i++) {
    if (modules[8][size - 1 - i]) copy2 |= 1 << i;
  }
  for (let i = 8; i < 15; i++) {
    if (modules[size - 15 + i][8]) copy2 |= 1 << i;
  }
  return { copy1, copy2 };
}

function decodeBytePayloadFromMatrix(text: string): string {
  const qr = generateQrMatrix(text);
  const size = qr.size;
  const isFunc = Array.from({ length: size }, () => Array(size).fill(false));

  const markRect = (r0: number, c0: number, h: number, w: number) => {
    for (let r = r0; r < r0 + h; r++) {
      for (let c = c0; c < c0 + w; c++) {
        if (r >= 0 && r < size && c >= 0 && c < size) isFunc[r][c] = true;
      }
    }
  };
  markRect(0, 0, 9, 9);
  markRect(0, size - 8, 9, 8);
  markRect(size - 8, 0, 8, 9);
  for (let i = 8; i < size - 8; i++) {
    isFunc[6][i] = true;
    isFunc[i][6] = true;
  }
  if (qr.version >= 2) {
    const step = qr.version === 2 ? 12 : qr.version <= 6 ? 12 + 4 * (qr.version - 2) : 16;
    const centers = qr.version <= 6 ? [6, 6 + step] : [6, Math.floor((6 + size - 7) / 2), size - 7];
    for (const cr of centers) {
      for (const cc of centers) {
        if ((cr <= 8 && cc <= 8) || (cr <= 8 && cc >= size - 9) || (cr >= size - 9 && cc <= 8)) continue;
        markRect(cr - 2, cc - 2, 5, 5);
      }
    }
  }
  if (qr.version >= 7) {
    markRect(0, size - 11, 6, 3);
    markRect(size - 11, 0, 3, 6);
  }

  const bits: number[] = [];
  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol--;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let off = 0; off < 2; off++) {
        const c = rightCol - off;
        if (!isFunc[r][c]) {
          const val = qr.modules[r][c];
          bits.push((isMaskConditionTrue(qr.maskPattern, r, c) ? !val : val) ? 1 : 0);
        }
      }
    }
    upward = !upward;
  }

  // Only inspect single-block versions (V1-V3) directly without block de-interleaving
  const readInt = (start: number, len: number) => {
    let v = 0;
    for (let i = 0; i < len; i++) v = (v << 1) | bits[start + i];
    return v;
  };
  const mode = readInt(0, 4);
  expect(mode).toBe(0b0100);
  const len = readInt(4, 8);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = readInt(12 + i * 8, 8);
  }
  return new TextDecoder().decode(out);
}

describe('QR Code Generator & Lot P3 Citizen Views', () => {
  it('generates valid ISO/IEC 18004 finder, timing, dark module and matching BCH format strips', () => {
    const payload = 'https://suivibudget.vercel.app/projets?project=cocody-ca2024-op01&view=passport';
    const qr = generateQrMatrix(payload);

    // 7x7 finder corners dark & center dark
    expect(qr.modules[0][0]).toBe(true);
    expect(qr.modules[3][3]).toBe(true);
    expect(qr.modules[0][qr.size - 1]).toBe(true);
    expect(qr.modules[qr.size - 1][0]).toBe(true);
    // Separator around top-left finder
    expect(qr.modules[7][0]).toBe(false);
    expect(qr.modules[0][7]).toBe(false);
    // Always-dark module
    expect(qr.modules[qr.size - 8][8]).toBe(true);
    // Timing lines alternate
    expect(qr.modules[6][8]).toBe(true);
    expect(qr.modules[6][9]).toBe(false);
    expect(qr.modules[8][6]).toBe(true);
    expect(qr.modules[9][6]).toBe(false);

    // Both format info strips match expected BCH format word
    const expectedFmt = computeFormatBits(qr.errorCorrection, qr.maskPattern);
    const { copy1, copy2 } = readFormatFromMatrix(qr.modules);
    expect(copy1).toBe(expectedFmt);
    expect(copy2).toBe(expectedFmt);
  });

  it('round-trips UTF-8 URL payload bits cleanly from masked matrix modules', () => {
    const shortUrl = 'https://suivibudget.ci/projets?project=p1';
    expect(decodeBytePayloadFromMatrix(shortUrl)).toBe(shortUrl);
  });

  it('renders deterministic SVG with 4-module quiet zone', () => {
    const svg = buildQrSvgString('https://suivibudget.vercel.app/institutions/mairies', 120);
    const qr = generateQrMatrix('https://suivibudget.vercel.app/institutions/mairies');
    expect(svg).toContain(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`);
    expect(svg).toContain('width="120" height="120"');
    expect(svg).toContain('shape-rendering="crispEdges"');
  });

  it('embeds QR Code Chantier & SVG export button on ProjectAccountabilityPassport', () => {
    const project: BudgetProject = {
      id: 'proj-qr-test',
      institution_id: 'inst-com-cocody',
      institution_name: 'Mairie de Cocody',
      title: 'Construction de 3 salles de classe',
      category: 'Éducation',
      nature_expense: 'Investissements',
      region_name: 'District Autonome d’Abidjan',
      commune_name: 'Cocody',
      budget_amount_fcfa: 45_000_000,
      fiscal_year: 2026,
      current_status: 'IN_PROGRESS',
      progress_percentage: 20,
      created_at: '2026-01-10T00:00:00Z',
    };

    const html = renderToStaticMarkup(<ProjectAccountabilityPassport project={project} proofs={[]} />);
    expect(html).toContain('QR Code Chantier');
    expect(html).toContain('Exporter QR Chantier (SVG)');
    expect(html).toContain('role="img"');
  });
});
