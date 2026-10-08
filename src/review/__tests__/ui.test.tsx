import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AmountFact, EvidenceDetails, StatusBadge } from '../ui/Primitives';
describe('LOT 13 — documentary UI primitives', () => {
  it('never displays a blocked amount even when a candidate supplied one', () => {
    const html = renderToStaticMarkup(<AmountFact label="Test only" result={{ value: 100, status: 'BLOCKED', reasons: [] }} explanation="Test" />);
    expect(html).toContain('Non disponible');
    expect(html).not.toContain('100 FCFA');
  });
  it('distinguishes an evidenced zero from unavailable information', () => {
    expect(renderToStaticMarkup(<AmountFact label="Test" result={{ value: 0, status: 'AVAILABLE', reasons: [] }} explanation="Test" />)).toContain('0 FCFA');
    expect(renderToStaticMarkup(<AmountFact label="Test" result={{ value: null, status: 'UNKNOWN', reasons: [] }} explanation="Test" />)).not.toContain('0 FCFA');
  });
  it('communicates status through text, not color alone', () => {
    expect(renderToStaticMarkup(<StatusBadge status="NOT_COMPARABLE" />)).toContain('Périmètres non comparables');
  });
  it('does not render a fabricated source link', () => {
    const html = renderToStaticMarkup(<EvidenceDetails evidence={null} documents={[]} />);
    expect(html).not.toContain('href=');
    expect(html).toContain('non disponible');
  });
});
