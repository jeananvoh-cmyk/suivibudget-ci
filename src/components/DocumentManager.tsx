import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Download, 
  ExternalLink, 
  Upload, 
  CheckCircle2, 
  Building2, 
  Calendar,
  X,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { PublicDocument, DocumentCategory, DocumentFormat } from '../types';
import { matchesSmartSearch } from '../utils/searchHelpers';

interface DocumentManagerProps {
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'RAPPORT_AUDIT', label: "Rapport d'Audit & Contrôle" },
  { value: 'MARCHE_PUBLIC', label: "Marché Public & Contrat" },
  { value: 'BUDGET_OFFICIEL', label: "Budget & Finances Publiques" },
  { value: 'LOI_CAIDP', label: "Loi & Texte Juridique (CAIDP)" },
  { value: 'ETUDE_TECHNIQUE', label: "Étude Technique & Infrastructure" },
  { value: 'GUIDE_CITOYEN', label: "Guide Pratique Citoyen" },
];

export const DocumentManager: React.FC<DocumentManagerProps> = ({ onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<PublicDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    category: DocumentCategory;
    institution_name: string;
    year: number;
    description: string;
    file_url: string;
    file_name: string;
    file_size: string;
    file_format: DocumentFormat;
    tags: string;
    is_official: boolean;
  }>({
    title: '',
    category: 'RAPPORT_AUDIT',
    institution_name: '',
    year: 2026,
    description: '',
    file_url: '',
    file_name: '',
    file_size: '2.5 Mo',
    file_format: 'PDF',
    tags: '',
    is_official: true,
  });

  const documents = dataStore.getDocuments();

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        return matchesSmartSearch([doc.title, doc.institution_name, doc.description, ...(doc.tags || [])], searchQuery);
      }
      return true;
    });
  }, [documents, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setFormData({
      title: '',
      category: 'RAPPORT_AUDIT',
      institution_name: '',
      year: 2026,
      description: '',
      file_url: '',
      file_name: '',
      file_size: '2.5 Mo',
      file_format: 'PDF',
      tags: '',
      is_official: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (doc: PublicDocument) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      category: doc.category,
      institution_name: doc.institution_name,
      year: doc.year,
      description: doc.description,
      file_url: doc.file_url,
      file_name: doc.file_name,
      file_size: doc.file_size || '2.5 Mo',
      file_format: doc.file_format,
      tags: (doc.tags || []).join(', '),
      is_official: doc.is_official,
    });
    setIsAddModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine format
    const name = file.name;
    let format: DocumentFormat = 'PDF';
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) format = 'EXCEL';
    else if (name.endsWith('.docx') || name.endsWith('.doc')) format = 'WORD';
    else if (name.endsWith('.csv')) format = 'CSV';

    // File size in Mo / Ko
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = parseFloat(sizeMb) >= 1 ? `${sizeMb} Mo` : `${Math.round(file.size / 1024)} Ko`;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const base64Data = loadEvt.target?.result as string;
      setFormData(prev => ({
        ...prev,
        file_url: base64Data,
        file_name: name,
        file_size: sizeStr,
        file_format: format,
        title: prev.title || name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      }));
      onShowToast(`Fichier "${name}" prêt pour enregistrement.`);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.institution_name.trim() || !formData.file_url.trim()) {
      onShowToast('Veuillez renseigner au moins le titre, l\'institution et l\'URL/Fichier.', 'error');
      return;
    }

    const tagList = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (editingDoc) {
      dataStore.updateDocument(editingDoc.id, {
        title: formData.title.trim(),
        category: formData.category,
        institution_name: formData.institution_name.trim(),
        year: formData.year,
        description: formData.description.trim(),
        file_url: formData.file_url.trim(),
        file_name: formData.file_name.trim() || 'document.pdf',
        file_size: formData.file_size.trim(),
        file_format: formData.file_format,
        tags: tagList,
        is_official: formData.is_official,
      });
      onShowToast('Document public mis à jour avec succès.');
    } else {
      dataStore.addDocument({
        title: formData.title.trim(),
        category: formData.category,
        institution_name: formData.institution_name.trim(),
        year: formData.year,
        description: formData.description.trim(),
        file_url: formData.file_url.trim(),
        file_name: formData.file_name.trim() || 'document.pdf',
        file_size: formData.file_size.trim(),
        file_format: formData.file_format,
        tags: tagList,
        is_official: formData.is_official,
      });
      onShowToast('Nouveau document public ajouté à la bibliothèque.');
    }

    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dataStore.deleteDocument(id);
    setDeleteConfirmId(null);
    onShowToast('Document supprimé de la bibliothèque.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <FileCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 font-sans">
              Gestionnaire des Documents Publics (CAIDP)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ajoutez et administrez les rapports officiels, lois, audits et budgets téléchargeables par les citoyens.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-slate-400">Total Documents</div>
            <div className="text-xl font-black text-slate-900">{documents.length}</div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Document</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, institution, mot-clé..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="ALL">Toutes les catégories</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Titre & Résumé</th>
                <th className="py-3.5 px-4">Institution Source</th>
                <th className="py-3.5 px-4">Catégorie</th>
                <th className="py-3.5 px-4 text-center">Année</th>
                <th className="py-3.5 px-4 text-center">Format & Taille</th>
                <th className="py-3.5 px-4 text-center">Téléchargements</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Aucun document ne correspond à vos critères.
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 line-clamp-1">{doc.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{doc.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{doc.institution_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-600">
                      {doc.year}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                        {doc.file_format}
                      </span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">{doc.file_size || '1.5 Mo'}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-brand-orange">
                      {doc.downloads_count || 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-slate-100"
                          title="Télécharger / Voir"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(doc.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Confirmer la suppression</h3>
              <p className="text-xs text-slate-500">
                Ce document sera définitivement retiré de la bibliothèque publique citoyenne.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingDoc ? 'Modifier le Document Public' : 'Ajouter un Document Public (CAIDP)'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Titre Officiel du Document *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Rapport d'Audit Annuel sur la Gestion de la Loi de Finances 2025"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>

              {/* Institution & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Institution Source *</label>
                  <input
                    type="text"
                    required
                    value={formData.institution_name}
                    onChange={(e) => setFormData(p => ({ ...p, institution_name: e.target.value }))}
                    placeholder="Ex: Cour des Comptes, AGEROUTE, DGMP..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie CAIDP *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as DocumentCategory }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year & Format */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Année Fiscale *</label>
                  <input
                    type="number"
                    min={2010}
                    max={2035}
                    value={formData.year}
                    onChange={(e) => setFormData(p => ({ ...p, year: parseInt(e.target.value, 10) || 2026 }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format *</label>
                  <select
                    value={formData.file_format}
                    onChange={(e) => setFormData(p => ({ ...p, file_format: e.target.value as DocumentFormat }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  >
                    <option value="PDF">PDF (Document standard)</option>
                    <option value="EXCEL">Excel / XLSX</option>
                    <option value="WORD">Word / DOCX</option>
                    <option value="CSV">CSV (Données ouvertes)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Taille estimée</label>
                  <input
                    type="text"
                    value={formData.file_size}
                    onChange={(e) => setFormData(p => ({ ...p, file_size: e.target.value }))}
                    placeholder="Ex: 3.5 Mo"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>
              </div>

              {/* File Upload or Direct URL */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="block font-bold text-slate-800">
                  Fichier ou Lien de Téléchargement Direct *
                </label>
                
                {/* Upload Local File */}
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choisir un fichier local</span>
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.docx,.doc,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.file_name && (
                    <span className="text-[11px] font-bold text-emerald-600 truncate max-w-xs">
                      ✓ {formData.file_name}
                    </span>
                  )}
                </div>

                {/* Direct URL input */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Ou saisissez une URL directe (lien web) :</span>
                  <input
                    type="text"
                    required
                    value={formData.file_url}
                    onChange={(e) => setFormData(p => ({ ...p, file_url: e.target.value }))}
                    placeholder="https://caidp.ci/documents/mon_rapport.pdf"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Résumé analytique pour les citoyens</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Décrivez brièvement le contenu du document, les chiffres abordés et les conclusions..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mots-clés / Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(p => ({ ...p, tags: e.target.value }))}
                  placeholder="Audit, Finances, Décentralisation, Routes..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-blue text-white font-bold hover:bg-blue-700 shadow-sm"
                >
                  {editingDoc ? 'Mettre à jour' : 'Enregistrer le Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
