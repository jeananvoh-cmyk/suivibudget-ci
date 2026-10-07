import { useState } from 'react';
import type { ReviewValue } from '../domain/evidence';
import { buildReviewSnapshot } from '../domain/snapshot';
import { reviewDocuments } from '../catalog';
import { AmountFact, EmptyState, StatusBadge } from './Primitives';
import { DocumentLibrary } from './DocumentLibrary';

const views = ['Budgets', 'Collectivités', 'Projets', 'Contributions', 'Réponses', 'Historique', 'Sources'] as const;
type View = typeof views[number];
const scopes = [
  { id: '', section: null, label: 'Choisir une institution' },
  { id: 'gov-017', section: '336', label: 'Ministère de la Communication' },
  { id: 'gov-030', section: '444', label: 'Ministère Délégué auprès du Premier Ministre, Ministre des Sports et du Cadre de Vie, chargé des Sports et du Cadre de Vie' },
  { id: 'gov-034', section: '334', label: "Ministère de l’Enseignement Technique, de la Formation Professionnelle et de l’Apprentissage" },
  { id: 'inst-com-bingerville', section: null, label: 'Commune de Bingerville' },
  { id: 'inst-com-cocody', section: null, label: 'Commune de Cocody' },
  { id: 'inst-com-tiassale', section: null, label: 'Commune de Tiassalé' },
] as const;

const emptyCopy: Record<Exclude<View, 'Budgets' | 'Sources'>, { title: string; text: string; needs: string[] }> = {
  Collectivités: { title: 'Les actes budgétaires restent distincts', text: 'Aucun dossier de collectivité n’est chargé dans cet espace. Les budgets primitifs, leurs modifications et les comptes administratifs doivent être rapprochés par exercice.', needs: ['Budget primitif et version retenue', 'Actes modificatifs et crédits définitifs', 'Compte administratif et mesures d’exécution'] },
  Projets: { title: 'Un projet se suit avec des preuves', text: 'Aucun projet documenté n’est chargé ici. Une inscription budgétaire et une dépense ne suffisent pas à établir une réalisation sur le terrain.', needs: ['Fiche de projet et rattachement budgétaire', 'Références de marché public', 'Preuves de réalisation physique'] },
  Contributions: { title: 'Une contribution, une trace de suivi', text: 'Aucune contribution publique modérée n’est chargée ici. Son historique et son rattachement doivent être documentés, sans exposer les données personnelles.', needs: ['Contribution publique relue', 'Budget ou projet documenté', 'Historique des suites données'] },
  Réponses: { title: 'Distinguer la réponse et le contrôle', text: 'Aucune réponse institutionnelle ni pièce de contrôle n’est chargée ici. Une réponse reste attribuée à son auteur institutionnel ; elle ne vaut pas validation indépendante.', needs: ['Réponse institutionnelle publiée', 'Pièce justificative et date', 'Rapport de contrôle distinct, s’il est disponible'] },
  Historique: { title: 'Comparer ce qui est comparable', text: 'Aucune série vérifiée n’est chargée ici. Un changement de périmètre, de mesure ou de précision empêche une comparaison automatique.', needs: ['Documents des deux exercices', 'Périmètres et mesures équivalents', 'Valeurs exactes ; inconnues conservées sans estimation'] },
};

export function ReviewWorkspace() {
  const [view, setView] = useState<View>('Budgets');
  const [year, setYear] = useState(2026);
  const [institutionId, setInstitutionId] = useState('');
  const scope = scopes.find(s => s.id === institutionId) ?? scopes[0];
  const snapshot = buildReviewSnapshot({ institutionId: scope.id, sectionCode: scope.section, fiscalYear: year }, [], reviewDocuments);
  const blocked = snapshot.dependenciesBlocked.length > 0;
  const result: ReviewValue = { value: null, status: snapshot.status, reasons: snapshot.dependenciesBlocked };
  return <div className="review-app">
    <a className="review-skip" href="#review-content">Aller au contenu</a>
    <header className="review-header"><a href="#review-content" className="review-logo">SuiviBudget <span>Côte d’Ivoire</span></a>
      <span className="review-mode">Espace de revue · lecture seule</span></header>
    <div className="review-layout">
      <aside className="review-sidebar"><p className="review-eyebrow">Comprendre les finances publiques</p>
        <nav aria-label="Parcours de revue">{views.map(name => <button key={name} aria-current={view === name ? 'page' : undefined}
          onClick={() => setView(name)}>{name}</button>)}</nav>
        <p className="review-sidebar-note">Une donnée claire.<br />Une source vérifiable.<br />Une inconnue visible.</p>
      </aside>
      <main id="review-content" tabIndex={-1} className="review-main">
        <div className="review-intro"><p className="review-eyebrow">Comprendre · Explorer · Vérifier</p>
          <h1>Du budget à la preuve.</h1><p className="review-lead">Lire un montant, comprendre son périmètre, retrouver le document qui l’atteste.</p></div>
        <div className="review-controls">
          <label className="review-field" htmlFor="review-year">Exercice<select id="review-year" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2026, 2025, 2024, 2022].map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label className="review-field" htmlFor="review-institution">Institution<select id="review-institution" value={institutionId} onChange={e => setInstitutionId(e.target.value)}>
            {scopes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        </div>
        <div className="review-notice" role="status"><StatusBadge status={result.status} />
          <p>{blocked ? 'Le budget de ce ministère pour 2026 reste incomplet. Les montants, taux et comparaisons qui en dépendent ne sont pas disponibles.'
            : 'Aucun montant vérifié n’est chargé pour ce périmètre dans cet espace. Les dossiers existants sont conservés ; aucune valeur de remplacement n’est utilisée.'}</p></div>
        {view === 'Sources' ? <DocumentLibrary documents={reviewDocuments} year={year} /> : view === 'Budgets' ? <>
          <div className="review-section-heading"><div><p className="review-eyebrow">Comprendre · {year}</p><h2>Trois questions, trois preuves</h2></div></div>
          <div className="review-grid"><AmountFact label="Quel budget autorisé ?" result={result} explanation="Un montant voté, un exercice et des crédits identifiés dans un document officiel." />
            <AmountFact label="Quelle dépense payée ?" result={result} explanation="Une mesure d’exécution documentée. Le budget prévu ne renseigne pas le paiement." />
            <article className="review-card"><h3>Quelle réalisation physique ?</h3><p className="review-amount">Non documentée</p><StatusBadge status="UNKNOWN" />
              <p className="review-muted">Des pièces de terrain distinctes des données financières sont nécessaires.</p></article></div>
          <section className="review-next"><div><p className="review-eyebrow">Vérifier</p><h2>Revenir au document d’origine</h2>
            <p>La loi de finances, le DPPD-PAP et le RAP ne décrivent pas la même mesure ni nécessairement le même exercice.</p></div>
            <button className="review-button review-button--primary" onClick={() => setView('Sources')}>Explorer les sources</button></section>
        </> : <section><p className="review-eyebrow">Explorer · {view}</p><h2>{emptyCopy[view].title}</h2>
          <EmptyState title="Pièces vérifiées à réunir"><p>{emptyCopy[view].text}</p><ul>{emptyCopy[view].needs.map(n => <li key={n}>{n}</li>)}</ul>
            <button className="review-button" onClick={() => setView('Sources')}>Consulter les sources disponibles</button></EmptyState></section>}
        <footer className="review-footer">Espace local de contrôle indépendant. Aucun import, envoi ou publication depuis cette interface.</footer>
      </main>
    </div>
  </div>;
}
