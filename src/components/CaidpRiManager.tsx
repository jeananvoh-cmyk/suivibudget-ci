import React, { useState, useMemo, useEffect } from 'react';
import { CaidpEntity, EntityPublicCategory, CaidpEntityHistoryItem } from '../data/caidpRiData';
import { dataStore } from '../services/dataStore';
import { adminTaskService } from '../services/adminTaskService';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Mail,
  Phone,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  ExternalLink,
  Layers,
  ShieldCheck,
  CheckSquare,
  Square,
  ArrowRight,
  Clock,
  User,
  History,
  Sparkles,
  Check
} from 'lucide-react';

interface CaidpRiManagerProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialFilter?: CompletionFilter;
}

type CompletionFilter =
  | 'ALL'
  | 'INCOMPLETE'
  | 'WITH_EMAIL'
  | 'ONLY_EMAIL'
  | 'WITHOUT_EMAIL'
  | 'WITH_PHONE'
  | 'WITHOUT_PHONE'
  | 'WITHOUT_RI'
  | 'COMPLETE'
  | 'UNVERIFIED';

export const CaidpRiManager: React.FC<CaidpRiManagerProps> = ({ onShowToast, initialFilter = 'ALL' }) => {
  const auth = dataStore.getAuth();

  // Directory state from dataStore
  const [directory, setDirectory] = useState<CaidpEntity[]>(() => dataStore.getCaidpDirectory());

  // Subscribe to dataStore changes
  useEffect(() => {
    return dataStore.subscribe(() => {
      setDirectory(dataStore.getCaidpDirectory());
    });
  }, []);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | EntityPublicCategory>('ALL');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>(initialFilter);

  useEffect(() => {
    if (initialFilter) {
      setCompletionFilter(initialFilter);
    }
  }, [initialFilter]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer Edit / Create state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CaidpEntity | null>(null);
  const [drawerForm, setDrawerForm] = useState<Omit<CaidpEntity, 'id'>>({
    company_name: '',
    category: 'MINISTERE',
    region: 'Abidjan',
    commune: '',
    ri_name: '',
    ri_function: '',
    email: "Pas d'email",
    phone: "Pas de numéro",
    source: "Ajouté par l'Admin",
    source_url: '',
    verification_status: 'TO_VERIFY',
    verified_by: '',
    assigned_to: '',
    notes: '',
  });

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');

  // Bulk Assign Modal state
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState('');

  // Statistics calculation
  const stats = useMemo(() => {
    const total = directory.length;
    const withEmail = directory.filter(e => e.email && e.email !== "Pas d'email" && e.email.includes('@')).length;
    const withoutEmail = total - withEmail;
    const withPhone = directory.filter(e => e.phone && e.phone !== "Pas de numéro" && e.phone.length > 5).length;
    const withoutPhone = total - withPhone;
    const onlyEmail = directory.filter(e => {
      const hasEmail = e.email && e.email !== "Pas d'email" && e.email.includes('@');
      const hasPhone = e.phone && e.phone !== "Pas de numéro" && e.phone.length > 5;
      return hasEmail && !hasPhone;
    }).length;
    const onlyPhone = directory.filter(e => {
      const hasEmail = e.email && e.email !== "Pas d'email" && e.email.includes('@');
      const hasPhone = e.phone && e.phone !== "Pas de numéro" && e.phone.length > 5;
      return !hasEmail && hasPhone;
    }).length;
    const designatedRi = directory.filter(e => e.ri_name && e.ri_name !== 'Non désigné' && e.ri_name.trim().length > 0).length;
    const withoutRi = total - designatedRi;
    const verified = directory.filter(e => e.verification_status === 'VERIFIED').length;
    const incomplete = directory.filter(e => {
      const hasEmail = e.email && e.email !== "Pas d'email" && e.email.includes('@');
      const hasPhone = e.phone && e.phone !== "Pas de numéro" && e.phone.length > 5;
      const hasRi = e.ri_name && e.ri_name !== 'Non désigné' && e.ri_name.trim().length > 0;
      return !hasEmail || !hasPhone || !hasRi;
    }).length;
    const complete = total - incomplete;

    const emailCoveragePercent = total > 0 ? Math.round((withEmail / total) * 100) : 0;
    const phoneCoveragePercent = total > 0 ? Math.round((withPhone / total) * 100) : 0;
    const riCoveragePercent = total > 0 ? Math.round((designatedRi / total) * 100) : 0;

    return {
      total,
      withEmail,
      withoutEmail,
      withPhone,
      withoutPhone,
      onlyEmail,
      onlyPhone,
      designatedRi,
      withoutRi,
      verified,
      incomplete,
      complete,
      emailCoveragePercent,
      phoneCoveragePercent,
      riCoveragePercent,
    };
  }, [directory]);

  // Filtered directory
  const filteredDirectory = useMemo(() => {
    return directory.filter(item => {
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

      // Completion filter
      const hasEmail = item.email && item.email !== "Pas d'email" && item.email.includes('@');
      const hasPhone = item.phone && item.phone !== "Pas de numéro" && item.phone.length > 5;
      const hasRi = item.ri_name && item.ri_name !== 'Non désigné' && item.ri_name.trim().length > 0;
      const isVerified = item.verification_status === 'VERIFIED';

      if (completionFilter === 'INCOMPLETE' && hasEmail && hasPhone && hasRi) return false;
      if (completionFilter === 'WITH_EMAIL' && !hasEmail) return false;
      if (completionFilter === 'ONLY_EMAIL' && (!hasEmail || hasPhone)) return false;
      if (completionFilter === 'WITHOUT_EMAIL' && hasEmail) return false;
      if (completionFilter === 'WITH_PHONE' && !hasPhone) return false;
      if (completionFilter === 'WITHOUT_PHONE' && hasPhone) return false;
      if (completionFilter === 'WITHOUT_RI' && hasRi) return false;
      if (completionFilter === 'COMPLETE' && (!hasEmail || !hasPhone || !hasRi)) return false;
      if (completionFilter === 'UNVERIFIED' && isVerified) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.company_name.toLowerCase().includes(q);
        const matchRi = item.ri_name.toLowerCase().includes(q);
        const matchFunc = item.ri_function.toLowerCase().includes(q);
        const matchEmail = (item.email || '').toLowerCase().includes(q);
        const matchRegion = (item.region || '').toLowerCase().includes(q);
        const matchCommune = (item.commune || '').toLowerCase().includes(q);
        const matchAssignee = (item.assigned_to || '').toLowerCase().includes(q);
        return matchName || matchRi || matchFunc || matchEmail || matchRegion || matchCommune || matchAssignee;
      }

      return true;
    });
  }, [directory, categoryFilter, completionFilter, searchQuery]);

  // Paginated items
  const totalPages = Math.ceil(filteredDirectory.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDirectory.slice(start, start + pageSize);
  }, [filteredDirectory, currentPage, pageSize]);

  // Multi-selection helpers
  const isAllPageSelected = useMemo(() => {
    if (paginatedItems.length === 0) return false;
    return paginatedItems.every(item => selectedIds.has(item.id));
  }, [paginatedItems, selectedIds]);

  const handleToggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      paginatedItems.forEach(item => next.delete(item.id));
    } else {
      paginatedItems.forEach(item => next.add(item.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Open Drawer Handlers
  const handleOpenEdit = (item: CaidpEntity) => {
    setEditingItem(item);
    setDrawerForm({
      company_name: item.company_name,
      category: item.category,
      region: item.region || 'Abidjan',
      commune: item.commune || '',
      ri_name: item.ri_name,
      ri_function: item.ri_function,
      email: item.email || "Pas d'email",
      phone: item.phone || "Pas de numéro",
      source: item.source || "Mis à jour par l'Admin",
      source_url: item.source_url || '',
      verification_status: item.verification_status || 'TO_VERIFY',
      verified_by: item.verified_by || auth.fullName || 'Admin',
      assigned_to: item.assigned_to || '',
      notes: item.notes || '',
    });
    setIsDrawerOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setDrawerForm({
      company_name: '',
      category: 'MINISTERE',
      region: 'Abidjan',
      commune: '',
      ri_name: '',
      ri_function: "Service d'Accès aux Documents Publics (Loi n°2013-867)",
      email: "Pas d'email",
      phone: "Pas de numéro",
      source: "Créé par l'Admin",
      source_url: '',
      verification_status: 'TO_VERIFY',
      verified_by: auth.fullName || 'Admin',
      assigned_to: '',
      notes: '',
    });
    setIsDrawerOpen(true);
  };

  // Save current entity logic
  const saveCurrentEntity = (form: Omit<CaidpEntity, 'id'>, itemToSave: CaidpEntity | null): boolean => {
    if (!form.company_name.trim()) {
      onShowToast("Veuillez saisir le nom de l'organisme public.", 'error');
      return false;
    }

    const now = new Date().toISOString();
    const author = auth.fullName || 'Admin';

    if (itemToSave) {
      const historyItem: CaidpEntityHistoryItem = {
        id: 'hist-' + Date.now(),
        action: 'UPDATE_COORDINATES',
        author,
        date: now,
        details: `Mise à jour: Email "${form.email}", Tél "${form.phone}", RI "${form.ri_name}"`,
      };

      const existingHistory = itemToSave.history || [];
      const updatedHistory = [historyItem, ...existingHistory].slice(0, 10);

      dataStore.updateCaidpEntity(itemToSave.id, {
        ...form,
        verification_date: now,
        history: updatedHistory,
      });

      adminTaskService.logActivity({
        action_type: 'ENTITY_COMPLETED',
        description: `Coordonnées RI mises à jour : ${form.company_name}`,
        author,
        author_role: auth.role,
        target_id: itemToSave.id,
        target_type: 'CAIDP_ENTITY',
        metadata: { email: form.email, phone: form.phone, ri_name: form.ri_name }
      });

      onShowToast(`"${form.company_name}" enregistré avec succès !`, 'success');
      return true;
    } else {
      const newEntity: CaidpEntity = {
        id: 'caidp-entity-' + Date.now(),
        ...form,
        verification_date: now,
        history: [{
          id: 'hist-' + Date.now(),
          action: 'CREATE',
          author,
          date: now,
          details: `Création de l'organisme dans le répertoire CAIDP`,
        }],
      };

      dataStore.addCaidpEntity(newEntity);

      adminTaskService.logActivity({
        action_type: 'ENTITY_COMPLETED',
        description: `Nouvel organisme CAIDP ajouté : ${form.company_name}`,
        author,
        author_role: auth.role,
        target_id: newEntity.id,
        target_type: 'CAIDP_ENTITY',
      });

      onShowToast(`Nouvel organisme "${form.company_name}" ajouté avec succès !`, 'success');
      return true;
    }
  };

  const handleSaveOnly = (e: React.FormEvent) => {
    e.preventDefault();
    const success = saveCurrentEntity(drawerForm, editingItem);
    if (success) {
      setIsDrawerOpen(false);
      setEditingItem(null);
    }
  };

  // "Enregistrer et suivant" : Save and immediately switch to next incomplete entity!
  const handleSaveAndNext = (e: React.FormEvent) => {
    e.preventDefault();
    const currentId = editingItem?.id;
    const success = saveCurrentEntity(drawerForm, editingItem);
    if (!success) return;

    // Search for next incomplete entity in the filtered list
    const currentIndex = currentId ? filteredDirectory.findIndex(e => e.id === currentId) : -1;
    const remainingList = currentIndex >= 0
      ? [...filteredDirectory.slice(currentIndex + 1), ...filteredDirectory.slice(0, currentIndex)]
      : filteredDirectory;

    const nextIncomplete = remainingList.find(item => {
      const hasEmail = item.email && item.email !== "Pas d'email" && item.email.includes('@');
      const hasPhone = item.phone && item.phone !== "Pas de numéro" && item.phone.length > 5;
      const hasRi = item.ri_name && item.ri_name !== 'Non désigné' && item.ri_name.trim().length > 0;
      return !hasEmail || !hasPhone || !hasRi;
    });

    if (nextIncomplete) {
      handleOpenEdit(nextIncomplete);
      onShowToast(`Passé à l'organisme suivant : ${nextIncomplete.company_name}`, 'info');
    } else {
      setIsDrawerOpen(false);
      setEditingItem(null);
      onShowToast('Félicitations ! Tous les organismes de cette sélection sont complets.', 'success');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${name}" du répertoire CAIDP ?`)) {
      dataStore.deleteCaidpEntity(id);
      adminTaskService.logActivity({
        action_type: 'TASK_RESOLVED',
        description: `Suppression de l'organisme CAIDP : ${name}`,
        author: auth.fullName || 'Admin',
        author_role: auth.role,
        target_id: id,
        target_type: 'CAIDP_ENTITY',
      });
      onShowToast(`"${name}" a été supprimé du répertoire.`, 'info');
    }
  };

  // Bulk Operations
  const handleBulkMarkVerified = () => {
    if (selectedIds.size === 0) return;
    const now = new Date().toISOString();
    const author = auth.fullName || 'Admin';

    selectedIds.forEach(id => {
      dataStore.updateCaidpEntity(id, {
        verification_status: 'VERIFIED',
        verification_date: now,
        verified_by: author,
      });
    });

    adminTaskService.logActivity({
      action_type: 'BULK_ACTION',
      description: `${selectedIds.size} organismes marqués comme vérifiés`,
      author,
      author_role: auth.role,
      metadata: { count: selectedIds.size, ids: Array.from(selectedIds) }
    });

    onShowToast(`${selectedIds.size} organismes marqués comme vérifiés avec succès !`, 'success');
    setSelectedIds(new Set());
  };

  const handleBulkAssign = () => {
    if (selectedIds.size === 0 || !bulkAssignee.trim()) return;
    const author = auth.fullName || 'Admin';

    selectedIds.forEach(id => {
      dataStore.updateCaidpEntity(id, {
        assigned_to: bulkAssignee.trim(),
      });
    });

    adminTaskService.logActivity({
      action_type: 'BULK_ACTION',
      description: `${selectedIds.size} organismes assignés à ${bulkAssignee.trim()}`,
      author,
      author_role: auth.role,
      metadata: { count: selectedIds.size, assignee: bulkAssignee.trim() }
    });

    onShowToast(`${selectedIds.size} organismes assignés à "${bulkAssignee.trim()}" !`, 'success');
    setIsBulkAssignModalOpen(false);
    setBulkAssignee('');
    setSelectedIds(new Set());
  };

  const handleExportSelectedCSV = () => {
    const listToExport = selectedIds.size > 0
      ? directory.filter(e => selectedIds.has(e.id))
      : filteredDirectory;

    const headers = ['ID', 'Organisme', 'Categorie', 'Region', 'Commune', 'Nom_RI', 'Fonction_RI', 'Email_RI', 'Telephone_RI', 'Statut_Verification', 'Assigné_A', 'Source'];
    const rows = listToExport.map(e => [
      `"${e.id}"`,
      `"${(e.company_name || '').replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.region || ''}"`,
      `"${e.commune || ''}"`,
      `"${(e.ri_name || '').replace(/"/g, '""')}"`,
      `"${(e.ri_function || '').replace(/"/g, '""')}"`,
      `"${e.email || ''}"`,
      `"${e.phone || ''}"`,
      `"${e.verification_status || 'TO_VERIFY'}"`,
      `"${e.assigned_to || ''}"`,
      `"${(e.source || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Repertoire_CAIDP_Selection_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(`Exportation de ${listToExport.length} organismes terminée !`, 'success');
  };

  const handleExportAllCSV = () => {
    const csvContent = dataStore.exportCaidpDirectoryToCSV();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Repertoire_RI_CAIDP_SuiviBudget_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Exportation du répertoire complet réussie !', 'success');
  };

  const handleImportCSV = () => {
    if (!importCsvText.trim()) {
      onShowToast('Veuillez coller le contenu CSV à importer.', 'error');
      return;
    }
    const result = dataStore.importCaidpDirectoryFromCSV(importCsvText);
    adminTaskService.logActivity({
      action_type: 'BULK_ACTION',
      description: `Import CSV CAIDP : ${result.successCount} organismes mis à jour`,
      author: auth.fullName || 'Admin',
      author_role: auth.role,
      metadata: { count: result.successCount }
    });
    onShowToast(`Importation terminée : ${result.successCount} organismes mis à jour ou ajoutés !`, 'success');
    setIsImportModalOpen(false);
    setImportCsvText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportCsvText(content);
        onShowToast(`Fichier "${file.name}" prêt pour importation.`, 'info');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const getCategoryBadge = (cat: EntityPublicCategory) => {
    switch (cat) {
      case 'MINISTERE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">Ministère</span>;
      case 'INSTITUTION':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">Institution</span>;
      case 'SOCIETE_ETAT':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">Société d'État</span>;
      case 'MAIRIE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">Mairie</span>;
      case 'REGION':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">Conseil Régional</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700">Organisme</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 font-bold border border-amber-200/60 shadow-2xs">
              <Building2 className="w-6 h-6 text-amber-600" />
            </span>
            <div>
              <h3 className="text-xl font-extrabold text-navy-900 flex items-center gap-2">
                Répertoire CAIDP & Responsables de l'Information (RI)
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-brand-blue border border-blue-200">
                  {directory.length} organismes
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Conformité Loi n°2013-867 : Espace opérationnel de complétion des emails, téléphones et désignations des RI.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportAllCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            title="Exporter l'annuaire au format CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            title="Importer des contacts en masse depuis un CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Importer Contacts</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Organisme</span>
          </button>
        </div>
      </div>

      {/* OPERATIONAL COMPLETION PROGRESS BAR (Objectif Transparence) */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-emerald-50/30 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Niveau de Complétude du Répertoire National CAIDP
            </h4>
          </div>
          <div className="text-xs font-bold text-slate-600">
            <span className="text-emerald-700 font-black">{stats.complete} complets</span>
            <span className="mx-1.5 text-slate-300">•</span>
            <span className="text-amber-700 font-black">{stats.incomplete} à compléter</span>
            <span className="mx-1.5 text-slate-300">•</span>
            <span className="text-brand-blue font-black">{stats.verified} vérifiés</span>
          </div>
        </div>

        {/* 3 Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Email Progress */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Emails Directs</span>
              </span>
              <button
                onClick={() => { setCompletionFilter('WITH_EMAIL'); setCurrentPage(1); }}
                className="font-black text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer"
                title="Cliquer pour afficher les 29 organismes disposant d'un email"
              >
                {stats.withEmail} / {stats.total} ({stats.emailCoveragePercent}%)
              </button>
            </div>
            <div 
              className="w-full bg-slate-100 rounded-full h-2 overflow-hidden cursor-pointer"
              onClick={() => { setCompletionFilter('WITH_EMAIL'); setCurrentPage(1); }}
              title="Cliquer pour afficher les 29 organismes disposant d'un email"
            >
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500 hover:bg-emerald-600"
                style={{ width: `${stats.emailCoveragePercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span>{stats.withoutEmail} sans email</span>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => { setCompletionFilter('ONLY_EMAIL'); setCurrentPage(1); }}
                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                  title="Afficher les 11 organismes avec email mais sans numéro de téléphone"
                >
                  {stats.onlyEmail} email seul
                </button>
              </div>
              <button
                onClick={() => { setCompletionFilter('WITHOUT_EMAIL'); setCurrentPage(1); }}
                className="text-brand-blue font-bold hover:underline cursor-pointer"
              >
                Compléter →
              </button>
            </div>
          </div>

          {/* Phone Progress */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-blue" />
                <span>Téléphones</span>
              </span>
              <button
                onClick={() => { setCompletionFilter('WITH_PHONE'); setCurrentPage(1); }}
                className="font-black text-slate-900 hover:text-brand-blue hover:underline cursor-pointer"
                title="Cliquer pour afficher les 20 organismes disposant d'un numéro de téléphone"
              >
                {stats.withPhone} / {stats.total} ({stats.phoneCoveragePercent}%)
              </button>
            </div>
            <div 
              className="w-full bg-slate-100 rounded-full h-2 overflow-hidden cursor-pointer"
              onClick={() => { setCompletionFilter('WITH_PHONE'); setCurrentPage(1); }}
              title="Cliquer pour afficher les 20 organismes disposant d'un numéro de téléphone"
            >
              <div
                className="bg-brand-blue h-2 rounded-full transition-all duration-500 hover:bg-brand-blue/90"
                style={{ width: `${stats.phoneCoveragePercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>{stats.withoutPhone} sans numéro</span>
              <button
                onClick={() => { setCompletionFilter('WITHOUT_PHONE'); setCurrentPage(1); }}
                className="text-brand-blue font-bold hover:underline cursor-pointer"
              >
                Compléter →
              </button>
            </div>
          </div>

          {/* Designated RI Progress */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>RI Désignés</span>
              </span>
              <span className="font-black text-slate-900">
                {stats.designatedRi} / {stats.total} ({stats.riCoveragePercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.riCoveragePercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>{stats.withoutRi} non désignés</span>
              <button
                onClick={() => { setCompletionFilter('WITHOUT_RI'); setCurrentPage(1); }}
                className="text-brand-blue font-bold hover:underline cursor-pointer"
              >
                Désigner →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="space-y-3 pt-1">
        {/* Search Bar & Quick Completion Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Rechercher par organisme, nom du RI, fonction, email, commune, région, responsable assigné..."
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Completion Status Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => { setCompletionFilter('ALL'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                completionFilter === 'ALL'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({directory.length})
            </button>
            <button
              onClick={() => { setCompletionFilter('INCOMPLETE'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                completionFilter === 'INCOMPLETE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>À compléter ({stats.incomplete})</span>
            </button>
            <button
              onClick={() => { setCompletionFilter('WITH_EMAIL'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                completionFilter === 'WITH_EMAIL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="Afficher tous les organismes avec un email officiel opérationnel"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Avec email ({stats.withEmail})</span>
            </button>
            <button
              onClick={() => { setCompletionFilter('ONLY_EMAIL'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                completionFilter === 'ONLY_EMAIL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
              }`}
              title="Afficher les organismes disposant uniquement d'un email (sans téléphone direct)"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Uniquement email ({stats.onlyEmail})</span>
            </button>
            <button
              onClick={() => { setCompletionFilter('WITHOUT_EMAIL'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                completionFilter === 'WITHOUT_EMAIL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Sans email ({stats.withoutEmail})</span>
            </button>
            <button
              onClick={() => { setCompletionFilter('WITHOUT_PHONE'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                completionFilter === 'WITHOUT_PHONE'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Sans tél ({stats.withoutPhone})</span>
            </button>
            <button
              onClick={() => { setCompletionFilter('COMPLETE'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                completionFilter === 'COMPLETE'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complets ({stats.complete})</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap border-t border-slate-100 pt-3">
          <button
            onClick={() => { setCategoryFilter('ALL'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes Catégories ({directory.length})
          </button>
          <button
            onClick={() => { setCategoryFilter('MINISTERE'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'MINISTERE'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
            Ministères ({directory.filter(d => d.category === 'MINISTERE').length})
          </button>
          <button
            onClick={() => { setCategoryFilter('INSTITUTION'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'INSTITUTION'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Institutions ({directory.filter(d => d.category === 'INSTITUTION').length})
          </button>
          <button
            onClick={() => { setCategoryFilter('SOCIETE_ETAT'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'SOCIETE_ETAT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Sociétés d'État ({directory.filter(d => d.category === 'SOCIETE_ETAT').length})
          </button>
          <button
            onClick={() => { setCategoryFilter('MAIRIE'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'MAIRIE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Mairies ({directory.filter(d => d.category === 'MAIRIE').length})
          </button>
          <button
            onClick={() => { setCategoryFilter('REGION'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'REGION'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Conseils Régionaux ({directory.filter(d => d.category === 'REGION').length})
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <button
                  onClick={handleToggleSelectAllPage}
                  className="text-slate-500 hover:text-slate-900 cursor-pointer"
                  title={isAllPageSelected ? 'Désélectionner la page' : 'Sélectionner la page'}
                >
                  {isAllPageSelected ? <CheckSquare className="w-4 h-4 text-brand-blue" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="py-3 px-4">Organisme Public & Localité</th>
              <th className="py-3 px-4">Responsable de l'Information (RI)</th>
              <th className="py-3 px-4">Fonction / Titre</th>
              <th className="py-3 px-4">Email Officiel RI</th>
              <th className="py-3 px-4">Téléphone</th>
              <th className="py-3 px-4">Vérification</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="space-y-1">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-600">Aucun organisme ne correspond aux critères.</p>
                    <p className="text-[11px] text-slate-400">Modifiez vos filtres ou la recherche pour afficher d'autres données.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const hasRealEmail = item.email && item.email !== "Pas d'email" && item.email.includes('@');
                const hasRealPhone = item.phone && item.phone !== "Pas de numéro" && item.phone.length > 5;
                const hasDesignatedRi = item.ri_name && item.ri_name !== 'Non désigné' && item.ri_name.trim().length > 0;
                const isSelected = selectedIds.has(item.id);
                const isVerified = item.verification_status === 'VERIFIED';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleToggleSelectRow(item.id)}
                        className="text-slate-400 hover:text-slate-800 cursor-pointer"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-brand-blue" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Organisme */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[260px]">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="mb-1">{getCategoryBadge(item.category)}</div>
                          <div className="font-extrabold text-slate-900 text-xs leading-snug">
                            {item.company_name}
                          </div>
                          {(item.region || item.commune) && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span>{[item.commune, item.region].filter(Boolean).join(' • ')}</span>
                            </div>
                          )}
                          {item.assigned_to && (
                            <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
                              <User className="w-2.5 h-2.5" />
                              <span>Assigné : {item.assigned_to}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* RI Name */}
                    <td className="py-3.5 px-4">
                      {hasDesignatedRi ? (
                        <div className="font-bold text-slate-900">{item.ri_name}</div>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-amber-700 hover:text-brand-blue hover:underline text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Cliquez pour désigner le RI"
                        >
                          <span className="text-amber-500">•</span>
                          <span>À désigner</span>
                        </button>
                      )}
                      {item.source && (
                        <span className="text-[9px] text-slate-400 block mt-0.5 truncate max-w-[160px]" title={item.source}>
                          {item.source}
                        </span>
                      )}
                    </td>

                    {/* Function */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-[200px]">
                      <div className="text-[11px] leading-snug text-slate-600 truncate" title={item.ri_function}>
                        {item.ri_function || "Service d'accès aux documents publics"}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4">
                      {hasRealEmail ? (
                        <a
                          href={`mailto:${item.email}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg hover:bg-emerald-100 hover:underline border border-emerald-200 transition-colors"
                        >
                          <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[150px]">{item.email}</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                          title="Cliquer pour renseigner l'email officiel"
                        >
                          <Plus className="w-3 h-3 text-amber-600" />
                          <span>Ajouter email</span>
                        </button>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4">
                      {hasRealPhone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                          <Phone className="w-3 h-3 text-brand-blue shrink-0" />
                          <span>{item.phone}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-slate-400 hover:text-slate-700 text-[10px] font-semibold hover:underline cursor-pointer"
                          title="Ajouter un numéro"
                        >
                          + Ajouter tél
                        </button>
                      )}
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-4">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Vérifié</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>À valider</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="Ouvrir le panneau d'édition rapide"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Éditer</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.company_name)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Supprimer cette entrée"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
          <div>
            Affichage de <strong>{(currentPage - 1) * pageSize + 1}</strong> à <strong>{Math.min(currentPage * pageSize, filteredDirectory.length)}</strong> sur <strong>{filteredDirectory.length}</strong> organismes
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold cursor-pointer"
            >
              « Début
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold cursor-pointer"
            >
              ‹ Précédent
            </button>

            <span className="px-3 font-bold text-slate-900">
              Page {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold cursor-pointer"
            >
              Suivant ›
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold cursor-pointer"
            >
              Fin »
            </button>
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-navy-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 animate-slideUp">
          <div className="text-xs font-bold flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-brand-blue text-white font-black text-[11px]">
              {selectedIds.size}
            </span>
            <span>sélectionné(s)</span>
          </div>

          <div className="h-4 w-px bg-slate-700"></div>

          <button
            onClick={handleBulkMarkVerified}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Marquer Vérifiés</span>
          </button>

          <button
            onClick={() => setIsBulkAssignModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Assigner</span>
          </button>

          <button
            onClick={handleExportSelectedCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={handleClearSelection}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer ml-1"
            title="Désélectionner tout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* QUICK-EDIT LATERAL DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-brand-blue font-bold">
                  <Building2 className="w-5 h-5 text-brand-blue" />
                </span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                    {editingItem ? 'Édition Rapide Organisme & RI' : '+ Nouvel Organisme Public'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Complétez les coordonnées officielles pour la publication en temps réel.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsDrawerOpen(false); setEditingItem(null); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <form id="drawerForm" onSubmit={handleSaveOnly} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nom de l'Organisme Public *
                </label>
                <input
                  type="text"
                  required
                  value={drawerForm.company_name}
                  onChange={(e) => setDrawerForm({ ...drawerForm, company_name: e.target.value })}
                  placeholder="ex: Direction Générale des Marchés Publics (DGMP), Mairie de Korhogo..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={drawerForm.category}
                    onChange={(e) => setDrawerForm({ ...drawerForm, category: e.target.value as EntityPublicCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-medium"
                  >
                    <option value="MINISTERE">Ministère</option>
                    <option value="INSTITUTION">Grande Institution</option>
                    <option value="SOCIETE_ETAT">Société d'État / Agence</option>
                    <option value="MAIRIE">Mairie / Commune</option>
                    <option value="REGION">Conseil Régional</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Région / District</label>
                  <input
                    type="text"
                    value={drawerForm.region}
                    onChange={(e) => setDrawerForm({ ...drawerForm, region: e.target.value })}
                    placeholder="ex: Abidjan, Poro, Gbêkê..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Commune / Ville (Optionnel)</label>
                <input
                  type="text"
                  value={drawerForm.commune || ''}
                  onChange={(e) => setDrawerForm({ ...drawerForm, commune: e.target.value })}
                  placeholder="ex: Cocody, Bouaké, San Pedro..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Responsable de l'Information (RI)
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nom et Prénom du RI désigné
                </label>
                <input
                  type="text"
                  value={drawerForm.ri_name}
                  onChange={(e) => setDrawerForm({ ...drawerForm, ri_name: e.target.value })}
                  placeholder="ex: M. BROU Yao Paul ou 'Non désigné'..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fonction / Titre du Responsable
                </label>
                <input
                  type="text"
                  value={drawerForm.ri_function}
                  onChange={(e) => setDrawerForm({ ...drawerForm, ri_function: e.target.value })}
                  placeholder="ex: Directeur de la Communication, Secrétaire Général Adjoint..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Email Officiel du RI</label>
                    <button
                      type="button"
                      onClick={() => setDrawerForm({ ...drawerForm, email: "Pas d'email" })}
                      className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                    >
                      "Pas d'email"
                    </button>
                  </div>
                  <input
                    type="text"
                    value={drawerForm.email}
                    onChange={(e) => setDrawerForm({ ...drawerForm, email: e.target.value })}
                    placeholder="ex: ri@organisme.ci"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Téléphone / Standard</label>
                    <button
                      type="button"
                      onClick={() => setDrawerForm({ ...drawerForm, phone: "Pas de numéro" })}
                      className="text-[10px] text-slate-500 font-bold hover:underline cursor-pointer"
                    >
                      "Pas de numéro"
                    </button>
                  </div>
                  <input
                    type="text"
                    value={drawerForm.phone}
                    onChange={(e) => setDrawerForm({ ...drawerForm, phone: e.target.value })}
                    placeholder="ex: +225 27 20 21 00 24"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Gouvernance & Traçabilité
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statut Vérification</label>
                  <select
                    value={drawerForm.verification_status || 'TO_VERIFY'}
                    onChange={(e) => setDrawerForm({ ...drawerForm, verification_status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="VERIFIED">Vérifié (Conforme)</option>
                    <option value="TO_VERIFY">À vérifier</option>
                    <option value="OUTDATED">Obsolète</option>
                    <option value="UNKNOWN">Incertain</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigné à</label>
                  <input
                    type="text"
                    value={drawerForm.assigned_to || ''}
                    onChange={(e) => setDrawerForm({ ...drawerForm, assigned_to: e.target.value })}
                    placeholder="ex: Modérateur Sarah..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Source / Référence Officielle</label>
                <input
                  type="text"
                  value={drawerForm.source || ''}
                  onChange={(e) => setDrawerForm({ ...drawerForm, source: e.target.value })}
                  placeholder="ex: Registre CAIDP 2025, Décret de nomination, Contact officiel..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lien Source (URL délibération / arrêté)</label>
                <input
                  type="url"
                  value={drawerForm.source_url || ''}
                  onChange={(e) => setDrawerForm({ ...drawerForm, source_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes Internes d'Audit</label>
                <textarea
                  rows={2}
                  value={drawerForm.notes || ''}
                  onChange={(e) => setDrawerForm({ ...drawerForm, notes: e.target.value })}
                  placeholder="Remarques, confirmations téléphoniques, dates de relance..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* History Preview */}
              {editingItem?.history && editingItem.history.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                    <History className="w-3.5 h-3.5" />
                    <span>Historique des modifications ({editingItem.history.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {editingItem.history.map(h => (
                      <div key={h.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] space-y-0.5">
                        <div className="flex justify-between text-slate-500">
                          <span className="font-bold text-slate-700">{h.author}</span>
                          <span>{new Date(h.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p className="text-slate-600">{h.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => { setIsDrawerOpen(false); setEditingItem(null); }}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all cursor-pointer"
              >
                Fermer
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  form="drawerForm"
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Enregistre cet organisme et ouvre immédiatement le prochain organisme incomplet"
                >
                  <span>Enregistrer et suivant</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK ASSIGN MODAL */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-sm">
                Assigner {selectedIds.size} organismes
              </h4>
              <button
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block font-bold text-slate-700">Nom du modérateur responsable</label>
              <input
                type="text"
                value={bulkAssignee}
                onChange={(e) => setBulkAssignee(e.target.value)}
                placeholder="ex: Sarah Koffi, Modérateur 1..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleBulkAssign}
                className="px-4 py-2 bg-navy-900 text-white rounded-xl font-bold cursor-pointer"
              >
                Confirmer l'assignation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600 font-bold text-base"></span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    Importer des Contacts RI en Masse (CSV)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Mettez à jour rapidement les adresses emails et téléphones obtenus auprès de la CAIDP.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Charger un fichier CSV ou Excel (.csv)
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Ou coller directement les lignes CSV
                </label>
                <textarea
                  rows={6}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="Organisme;Categorie;Region;Commune;Nom_RI;Fonction_RI;Email_RI;Telephone_RI&#10;Mairie de Korhogo;MAIRIE;Poro;Korhogo;M. Soro Amadou;Secrétaire Général;soro@mairie-korhogo.ci;+225 27 36 86 00 00"
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] space-y-1">
                <div className="font-bold">Format des colonnes supporté :</div>
                <div>ID ; Organisme ; Catégorie ; Région ; Commune ; Nom_RI ; Fonction_RI ; Email_RI ; Téléphone_RI</div>
                <div className="text-[10px] text-blue-700">Les organismes existants seront automatiquement mis à jour avec les nouveaux emails et téléphones.</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleImportCSV}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Lancer l'Importation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};