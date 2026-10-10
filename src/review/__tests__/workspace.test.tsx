import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReviewWorkspace } from '../ui/ReviewWorkspace';
import { DocumentLibrary } from '../ui/DocumentLibrary';
import { reviewDocuments } from '../catalog';
describe('LOT 14 — local review workspace', () => {
  it('starts without financial or participation replacements', () => {
    const html = renderToStaticMarkup(<ReviewWorkspace />);
    expect(html).toContain('Aucun montant vérifié');
    expect(html).not.toContain('0 FCFA');
    expect(html).not.toContain('19 606 735 297');
    expect(html).toContain('Aller au contenu');
  });
  it('exposes only public original-document metadata', () => {
    expect(reviewDocuments).toHaveLength(2);
    expect(reviewDocuments.every(d => d.visibility === 'PUBLIC' && d.sha256?.length === 64)).toBe(true);
    expect(JSON.stringify(reviewDocuments)).not.toContain('/tmp/');
  });
  it('does not expose the 2022 RAP after its official URL starts returning 404', () => {
    const html = renderToStaticMarkup(<DocumentLibrary documents={reviewDocuments} year={2026} />);
    expect(html).toContain('2 documents');
    expect(html).not.toContain('Rapports annuels de performance');
    expect(renderToStaticMarkup(<DocumentLibrary documents={reviewDocuments} year={2022} />)).toContain('Aucun document correspondant');
    expect(renderToStaticMarkup(<DocumentLibrary documents={reviewDocuments} year={2025} />)).toContain('Aucun document correspondant');
  });
});
