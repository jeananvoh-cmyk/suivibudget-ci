import React, { useState } from 'react';
import { AuthSecurityService } from '../services/authSecurity';
import { dataStore } from '../services/dataStore';

export const AdminLoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await AuthSecurityService.verifyCredentials(email, password);
      if (!result.success) { setError(result.error || 'Connexion refusée.'); return; }
      await dataStore.refreshAuth();
      onLoginSuccess();
    } catch { setError('Connexion impossible. Réessayez.'); }
    finally { setBusy(false); setPassword(''); }
  };
  return <div className="min-h-[70vh] flex items-center justify-center p-6">
    <form onSubmit={submit} className="w-full max-w-md p-8 bg-white rounded-3xl border border-slate-200 space-y-5">
      <h1 className="text-2xl font-bold">Espace de gestion</h1>
      <p className="text-sm text-slate-600">Connectez-vous avec le compte qui vous a été attribué.</p>
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <label className="block">Adresse email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="block w-full border rounded-xl p-3 mt-1" /></label>
      <label className="block">Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full border rounded-xl p-3 mt-1" /></label>
      <button disabled={busy} className="w-full rounded-xl bg-slate-900 text-white p-3 disabled:opacity-50">{busy ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  </div>;
};
