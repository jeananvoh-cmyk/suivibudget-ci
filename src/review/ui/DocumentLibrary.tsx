import { useState } from 'react';
import type { SourceDocument } from '../domain/documents';
import { EvidenceDetails, EmptyState } from './Primitives';

export function DocumentLibrary({ documents, year }: { documents: readonly SourceDocument[]; year: number }) {
  const [query, setQuery] = useState('');
  const filtered = documents.filter(d => d.fiscalYear === year && d.visibility === 'PUBLIC' && d.verification === 'VERIFIED'
    && `${d.title} ${d.publisher}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr').trim()));
  function downloadCatalog() {
    const blob = new Blob([JSON.stringify({ schema_version: 1, fiscal_year: year, documents: filtered }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `sources-${year}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section aria-labelledby="sources-title">
    <div className="review-section-heading"><div><p className="review-eyebrow">Vérifier</p><h2 id="sources-title">Les documents, à la source</h2></div>
      <button className="review-button" onClick={downloadCatalog} disabled={!filtered.length}>Exporter le catalogue (JSON)</button></div>
    <label className="review-field" htmlFor="source-search">Rechercher dans les titres et éditeurs
      <input id="source-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Loi de finances, performance…" /></label>
    <p aria-live="polite" className="review-muted">{filtered.length} document{filtered.length !== 1 ? 's' : ''} dans ce catalogue pour {year}.</p>
    {filtered.length ? <div className="review-source-list">{filtered.map(doc => <article className="review-card" key={doc.id}>
      <p className="review-eyebrow">{doc.fiscalYear} · {doc.pageCount} pages PDF</p><h3>{doc.title}</h3>
      <p className="review-muted">{doc.publisher}</p>
      <EvidenceDetails evidence={{ documentId: doc.id, page: 1, reference: null, fiscalYear: year, verification: 'VERIFIED' }} documents={documents} />
    </article>)}</div> : <EmptyState title="Aucun document correspondant dans ce catalogue">
      <p>Essayez un autre titre ou un autre exercice. Ce résultat ne signifie pas que le document n’existe pas.</p>
    </EmptyState>}
  </section>;
}
