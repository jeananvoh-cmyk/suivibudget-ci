import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

type StaffProfile = { id: string; full_name: string; email: string; role: string; is_active: boolean };

export function ModeratorManager() {
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<StaffProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.from('profiles').select('id,full_name,email,role,is_active')
      .in('role', ['ADMIN', 'MODERATOR', 'DATA_MANAGER']).order('full_name')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError('Impossible de charger les comptes de l’équipe.');
        else setProfiles(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const confirmStatus = async () => {
    if (!pending) return;
    setSaving(true);
    setError('');
    try {
      const { data, error } = await supabase.from('profiles')
        .update({ is_active: !pending.is_active }).eq('id', pending.id)
        .eq('is_active', pending.is_active).select('id,full_name,email,role,is_active').single();
      if (error || !data) throw new Error('Modification refusée ou compte modifié par un autre administrateur.');
      setProfiles(current => current.map(profile => profile.id === data.id ? data : profile));
      setMessage('Statut du compte enregistré.');
      setPending(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Modification impossible.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <h2 className="text-lg font-bold text-slate-900">Comptes de l’équipe</h2>
    <p className="text-sm text-slate-600">Les rôles définissent les accès aux documents, aux données et à la modération.</p>
    {loading && <p role="status">Chargement des comptes…</p>}
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {message && <p role="status" className="text-emerald-700">{message}</p>}
    {!loading && !error && profiles.length === 0 && <p>Aucun compte d’équipe accessible.</p>}
    <ul className="divide-y divide-slate-200">
      {profiles.map(profile => <li key={profile.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div><p className="font-semibold">{profile.full_name || profile.email}</p>
          <p className="text-sm text-slate-600">{profile.role} · {profile.is_active ? 'Actif' : 'Suspendu'}</p></div>
        {profile.role !== 'ADMIN' && <button type="button" onClick={() => setPending(profile)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus-visible:outline-brand-blue">
          {profile.is_active ? 'Suspendre' : 'Réactiver'}
        </button>}
      </li>)}
    </ul>
    {pending && <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p>{pending.is_active ? 'Suspendre' : 'Réactiver'} l’accès de {pending.full_name || pending.email} ?</p>
      <div className="flex gap-3">
        <button type="button" disabled={saving} onClick={() => void confirmStatus()} className="rounded-lg bg-slate-900 px-4 py-2 text-white focus-visible:outline-brand-blue disabled:opacity-50">{saving ? 'Enregistrement…' : 'Confirmer'}</button>
        <button type="button" disabled={saving} onClick={() => setPending(null)} className="rounded-lg border border-slate-300 px-4 py-2 focus-visible:outline-brand-blue">Annuler</button>
      </div>
    </div>}
    <p className="text-sm text-slate-600">L’invitation de nouveaux comptes et la récupération des mots de passe sont gérées dans Supabase Auth par l’administrateur.</p>
  </section>;
}
