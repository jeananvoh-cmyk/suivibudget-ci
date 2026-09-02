import React, { useState, useEffect } from 'react';
import { AuthSecurityService, ModeratorUser } from '../services/authSecurity';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Mail, 
  User, 
  X,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

export const ModeratorManager: React.FC = () => {
  const [moderators, setModerators] = useState<ModeratorUser[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
  const [selectedMod, setSelectedMod] = useState<ModeratorUser | null>(null);

  // Form State for creating a moderator
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MODERATOR' | 'DATA_MANAGER'>('MODERATOR');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [canModerateProofs, setCanModerateProofs] = useState(true);
  const [canManageProjects, setCanManageProjects] = useState(true);
  const [canManageInstitutions, setCanManageInstitutions] = useState(false);

  // Password reset state
  const [newPass, setNewPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadModerators = () => {
    setModerators(AuthSecurityService.getModerators());
  };

  useEffect(() => {
    loadModerators();
  }, []);

  const handleCreateModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await AuthSecurityService.createModerator(
      fullName,
      email,
      role,
      password,
      {
        can_moderate_proofs: canModerateProofs,
        can_manage_projects: canManageProjects,
        can_manage_institutions: canManageInstitutions,
      }
    );

    if (res.success) {
      showToast("Compte modérateur créé avec succès !");
      setIsAddModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      loadModerators();
    } else {
      showToast(res.message || "Erreur lors de la création", "error");
    }
  };

  const handleToggleStatus = (id: string) => {
    AuthSecurityService.toggleModeratorStatus(id);
    loadModerators();
    showToast("Statut du compte mis à jour.");
  };

  const handleDelete = (mod: ModeratorUser) => {
    if (window.confirm(`Confirmez-vous la suppression du compte modérateur de ${mod.full_name} (${mod.email}) ?`)) {
      AuthSecurityService.deleteModerator(mod.id);
      loadModerators();
      showToast("Compte modérateur supprimé.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMod) return;

    const res = await AuthSecurityService.updateModeratorPassword(selectedMod.id, newPass);
    if (res.success) {
      showToast(`Mot de passe mis à jour pour ${selectedMod.full_name}.`);
      setIsChangePassModalOpen(false);
      setNewPass('');
      setSelectedMod(null);
    } else {
      showToast(res.error || "Erreur", "error");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-md animate-in fade-in duration-200 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header & Create Button */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-blue" />
            <span>Gestion des Comptes Modérateurs & Sentinelles</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Déléguez la modération des preuves citoyennes et la mise à jour des projets sans partager vos identifiants d'administrateur principal.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Créer un Compte Modérateur</span>
        </button>
      </div>

      {/* List of Moderator Accounts */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {moderators.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Aucun compte modérateur actif</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Vous pouvez créer des accès sécurisés pour les membres de votre équipe afin qu'ils valident les photos citoyennes et mettent à jour le catalogue.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Créer le premier modérateur</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Utilisateur / Nom</th>
                  <th className="py-3.5 px-4">Email / Identifiant</th>
                  <th className="py-3.5 px-4">Rôle</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Date de Création</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {moderators.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center font-bold">
                          {m.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span>{m.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{m.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        m.role === 'DATA_MANAGER' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {m.role === 'DATA_MANAGER' ? 'Gestionnaire Données' : 'Modérateur Preuves'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(m.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="Cliquer pour changer le statut"
                      >
                        {m.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(m.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMod(m);
                            setIsChangePassModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                          title="Modifier le mot de passe"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Supprimer ce compte"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CREATE MODERATOR */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-blue" />
                <span>Nouveau Compte Modérateur</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateModerator} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Kouamé Jean-Eudes"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-brand-blue focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Adresse Email / Identifiant</label>
                <input
                  type="email"
                  required
                  placeholder="moderateur@domaine.ci"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-brand-blue focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rôle et Niveau d'Habilitation</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-brand-blue focus:bg-white"
                >
                  <option value="MODERATOR">Modérateur de Terrain (Validation des photos & constats)</option>
                  <option value="DATA_MANAGER">Gestionnaire de Données (Mise à jour budgets & projets)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mot de passe temporaire initial</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Au moins 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-brand-blue focus:bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block text-[11px]">Permissions accordées :</span>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canModerateProofs}
                    onChange={(e) => setCanModerateProofs(e.target.checked)}
                    className="rounded text-brand-blue"
                  />
                  <span>Approuver et modérer les preuves citoyennes</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageProjects}
                    onChange={(e) => setCanManageProjects(e.target.checked)}
                    className="rounded text-brand-blue"
                  />
                  <span>Éditer et actualiser les projets d'investissement</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Enregistrer le Modérateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {isChangePassModalOpen && selectedMod && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-brand-orange" />
                <span>Nouveau Mot de Passe</span>
              </h3>
              <button onClick={() => setIsChangePassModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <p className="text-slate-600">
                Définissez un nouveau mot de passe pour <strong>{selectedMod.full_name}</strong>.
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    placeholder="Au moins 6 caractères"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-brand-blue focus:bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePassModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl font-bold shadow-xs"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
