import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { reviewDocuments } from '../catalog';

interface LotControl {
  lot: number;
  available_source_ids: string[];
  loaded_records: number;
  data_status: 'UNKNOWN' | 'PARTIAL' | 'NOT_COMPARABLE';
}

const controlPath = path.resolve(__dirname, '../../../docs/overnight/LOT7_12_DOCUMENTARY_CONTROLS.json');
const controls = JSON.parse(fs.readFileSync(controlPath, 'utf8')) as {
  official_documents_available: Array<{ document_id: string; current_http_status: number }>;
  lot_controls: LotControl[];
  remote_supabase_writes: number;
};

describe('LOTS 7 à 12 — contrôles documentaires indépendants', () => {
  it('couvre chaque lot sans transformer une absence de source en donnée', () => {
    expect(controls.lot_controls.map(control => control.lot)).toEqual([7, 8, 9, 10, 11, 12]);
    for (const control of controls.lot_controls.filter(control => control.available_source_ids.length === 0)) {
      expect(control.loaded_records).toBe(0);
      expect(control.data_status).toBe('UNKNOWN');
    }
  });

  it('conserve la comparaison historique sans preuve comme NOT_COMPARABLE', () => {
    expect(controls.lot_controls.find(control => control.lot === 12)).toMatchObject({
      loaded_records: 0,
      data_status: 'NOT_COMPARABLE',
    });
  });

  it('n’expose dans le catalogue que les PDF dont le contrôle HTTP courant vaut 200', () => {
    const currentDocuments = new Set(controls.official_documents_available
      .filter(document => document.current_http_status === 200).map(document => document.document_id));
    expect(reviewDocuments.map(document => document.id).sort()).toEqual([...currentDocuments].sort());
    expect(reviewDocuments.some(document => document.id === 'DGBF-RAP-2022')).toBe(false);
  });

  it('conserve le compteur d’écritures Supabase à zéro', () => {
    expect(controls.remote_supabase_writes).toBe(0);
  });
});
