import React from 'react';
import ReactDOM from 'react-dom/client';
import { dataStore } from './services/dataStore';
import { LoadingScreen } from './components/LoadingScreen';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<LoadingScreen message="Chargement du catalogue citoyen…" />);
Promise.all([dataStore.ready, import('./App')]).then(([, { default: App }]) => {
  root.render(<React.StrictMode><App /></React.StrictMode>);
}).catch(() => {
  root.render(<main className="p-8 max-w-lg mx-auto"><h1 className="text-xl font-bold">Catalogue indisponible</h1><p role="alert">Le chargement n’a pas abouti. Vérifiez votre connexion.</p><button className="underline mt-4" onClick={() => window.location.reload()}>Réessayer</button></main>);
});
