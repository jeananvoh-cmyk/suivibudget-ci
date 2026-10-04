import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { dataStore } from '../../services/dataStore';
import { ADMINISTRATIVE_ACCOUNTS_DATA } from '../../data/administrativeAccountsData';
import { listImports, parseImportInput, reviewImport, runImport, type ImportReport, type ImportRow } from '../../services/dataImportService';
import { formatQualifiedFCFA, formatFCFA } from '../../utils/formatters';
import { isSafeUrl } from '../../utils/security';
import type { Institution } from '../../types';
import type { 
  DocumentIngestionMetadata, 
  ProposedFinancialValue, 
  BudgetDocumentCategory, 
  DocumentDryRunResult 
} from '../../types/budgetCycle';
import { 
  buildProposedValuesTemplate, 
  runDocumentDryRun, 
  buildStandardImportEnvelope 
} from '../../utils/budgetDocumentDryRun';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  XCircle, 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  Upload, 
  Edit3
} from 'lucide-react';

export function DataImportConsole({ role }: { role: string }) {
  const [sessionEnded, setSessionEnded] = useState(false);
  const allowed = !sessionEnded && (role === 'ADMIN' || role === 'DATA_MANAGER');

  // Mode de saisie : GUIDED (Assistant Documentaire) vs JSON (Lot Brut)
  const [importMode, setImportMode] = useState<'GUIDED' | 'JSON'>('GUIDED');

  // JSON Raw lot state
  const [text, setText] = useState('');
  const [jsonl, setJsonl] = useState(false);
  const [preview, setPreview] = useState<{ rows: unknown[]; report: ImportReport } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filter, setFilter] = useState('TO_VERIFY');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ImportRow | null>(null);
  const [history, setHistory] = useState<{ id: number; action: string; reason: string; created_at: string }[]>([]);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);

  // Guided Assistant state
  const institutions = useMemo(() => dataStore.getInstitutions(), []);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('inst-com-tiassale');
  const [institutionFilter, setInstitutionFilter] = useState<string>('');
  const [fiscalYear, setFiscalYear] = useState<number>(2024);
  const [documentType, setDocumentType] = useState<BudgetDocumentCategory>('BUDGET_MODIFICATIF');
  const [sourceName, setSourceName] = useState<string>('');
  const [sourceReference, setSourceReference] = useState<string>('');
  const [sourceDate, setSourceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adoptionDate, setAdoptionDate] = useState<string>('');
  const [sourceDateKind, setSourceDateKind] = useState<'PUBLISHED' | 'ACCESSED' | 'RECORDED'>('RECORDED');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [sourcePage, setSourcePage] = useState<number | undefined>(undefined);
  const [evidenceLevel, setEvidenceLevel] = useState<'OFFICIAL_DOCUMENT' | 'OFFICIAL_INSTITUTION' | 'AIP_VERIFIED' | 'SECONDARY_TO_CORROBORATE'>('OFFICIAL_DOCUMENT');
  const [amountSemantics, setAmountSemantics] = useState<'DELTA' | 'REVISED_TOTAL' | 'UNKNOWN'>('DELTA');
  const [notes, setNotes] = useState<string>('');

  // Proposed structured values
  const [proposedValues, setProposedValues] = useState<ProposedFinancialValue[]>(() => 
    buildProposedValuesTemplate('BUDGET_MODIFICATIF')
  );

  // Dry run result
  const [dryRunResult, setDryRunResult] = useState<DocumentDryRunResult | null>(null);

  // Regenerate proposed template when document type changes
  useEffect(() => {
    setProposedValues(buildProposedValuesTemplate(documentType));
    setDryRunResult(null);
  }, [documentType]);

  const button = 'min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue disabled:opacity-50 cursor-pointer';
  const input = 'w-full min-h-[44px] rounded-lg border border-slate-300 bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue';

  useEffect(() => {
    let active = true;
    setRows([]); setSelected(null); setHistory([]);
    if (allowed) listImports(filter, page).then(result => { if (active) setRows(result); }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [allowed, filter, page, revision]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { setSessionEnded(true); setRows([]); setSelected(null); setHistory([]); setText(''); setReport(null); setPreview(null); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    setHistory([]); setReason(''); setConfirmed(false);
    if (allowed && selected) void supabase.from('data_import_events').select('id,action,reason,created_at').eq('row_id', selected.id).order('created_at').order('id').then(({ data, error }) => {
      if (active) { if (error) setMessage(error.message); else setHistory(data || []); }
    });
    return () => { active = false; };
  }, [allowed, selected]);

  const execute = async (run: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await run(); } catch (error) { setMessage(error instanceof Error ? error.message : (error as { message?: string }).message || 'Action non confirmée.'); }
    finally { setBusy(false); }
  };

  const selectedInstitution = useMemo(
    () => institutions.find(i => i.id === selectedInstitutionId),
    [institutions, selectedInstitutionId]
  );

  const filteredInstitutions = useMemo(() => {
    if (!institutionFilter.trim()) return institutions;
    const q = institutionFilter.toLowerCase();
    return institutions.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }, [institutions, institutionFilter]);

  // Actions sur les valeurs proposées (Validation Humaine)
  const handleUpdateValueStatus = (id: string, status: ProposedFinancialValue['status']) => {
    setProposedValues(prev => prev.map(v => {
      if (v.id !== id) return v;
      if (status === 'MARKED_UNKNOWN') {
        return { ...v, status, amount: null, precision: 'UNKNOWN' };
      }
      return { ...v, status };
    }));
    setDryRunResult(null);
  };

  const handleUpdateValueAmount = (id: string, newAmount: number | null, precision: ProposedFinancialValue['precision'] = 'EXACT') => {
    setProposedValues(prev => prev.map(v => {
      if (v.id !== id) return v;
      return { 
        ...v, 
        amount: newAmount, 
        precision: newAmount === null ? 'UNKNOWN' : precision,
        status: 'CORRECTED',
        original_amount: v.original_amount ?? v.amount 
      };
    }));
    setDryRunResult(null);
  };

  // Exécution du Dry-Run local pour le document guidé
  const handleRunGuidedDryRun = () => {
    const meta: DocumentIngestionMetadata = {
      institution_id: selectedInstitutionId,
      institution_name: selectedInstitution?.name,
      fiscal_year: fiscalYear,
      document_type: documentType,
      source_name: sourceName,
      source_reference: sourceReference,
      source_date: sourceDate,
      source_date_kind: sourceDateKind,
      source_url: sourceUrl || undefined,
      source_page: sourcePage,
      evidence_level: evidenceLevel,
      adoption_date: adoptionDate || undefined,
      amount_semantics: amountSemantics,
      notes: notes || undefined
    };

    const res = runDocumentDryRun(meta, proposedValues, {
      knownInstitutions: institutions,
      existingBudgets: dataStore.getLocalBudgets(),
      existingAccounts: ADMINISTRATIVE_ACCOUNTS_DATA
    });

    setDryRunResult(res);
  };

  // Transformation en lot et injection dans le pipeline d'import
  const handleInjectIntoPipeline = async () => {
    if (!selectedInstitution) {
      setMessage('Collectivité invalide');
      return;
    }

    const meta: DocumentIngestionMetadata = {
      institution_id: selectedInstitutionId,
      institution_name: selectedInstitution.name,
      fiscal_year: fiscalYear,
      document_type: documentType,
      source_name: sourceName,
      source_reference: sourceReference,
      source_date: sourceDate,
      source_date_kind: sourceDateKind,
      source_url: sourceUrl || undefined,
      source_page: sourcePage,
      evidence_level: evidenceLevel,
      adoption_date: adoptionDate || undefined,
      amount_semantics: amountSemantics,
      notes: notes || undefined
    };

    // Revalider systématiquement l'état courant : un ancien dry-run ne doit jamais
    // autoriser une enveloppe après modification des métadonnées ou des montants.
    const currentDryRun = runDocumentDryRun(meta, proposedValues, {
      knownInstitutions: institutions,
      existingBudgets: dataStore.getLocalBudgets(),
      existingAccounts: ADMINISTRATIVE_ACCOUNTS_DATA
    });
    setDryRunResult(currentDryRun);

    if (!currentDryRun.can_import) {
      setMessage('Passage au pipeline bloqué : relisez les erreurs du dry-run courant.');
      return;
    }

    const envelope = buildStandardImportEnvelope(meta, proposedValues, selectedInstitution);
    const jsonString = JSON.stringify([envelope], null, 2);

    setText(jsonString);
    setJsonl(false);
    setImportMode('JSON');

    // Déclencher automatiquement la simulation
    await execute(async () => {
      setPreview(null);
      const parsed = parseImportInput(jsonString, false);
      const result = await runImport(parsed);
      setReport(result);
      setPreview({ rows: parsed, report: result });
      setMessage('Document structuré revalidé, converti en lot et simulé avec succès dans le pipeline.');
    });
  };

  if (!allowed) return <p role="status">Accès réservé aux gestionnaires de données.</p>;

  return (
    <section className="space-y-6 text-sm text-slate-800" aria-label="Console données">
      <header>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6 text-brand-blue" />
          <span>Console Documentaire & Import Budgétaire</span>
        </h2>
        <p className="mt-1 text-slate-600">
          Cycle complet : Ingestion documentaire → Extraction structurée → Validation humaine → Dry-run préalable → Import contrôlé → Vérification → Publication explicite.
        </p>
      </header>

      <p role="status" aria-live="polite" className="break-words font-medium text-brand-blue">
        {busy ? 'Traitement en cours…' : message}
      </p>

      {/* SÉLECTEUR DE MODE D'INGESTION */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          className={`px-4 py-2.5 font-bold border-b-2 text-sm transition-colors cursor-pointer ${
            importMode === 'GUIDED'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setImportMode('GUIDED')}
        >
          Assistant Documentaire Guidé (Recommandé)
        </button>
        <button
          className={`px-4 py-2.5 font-bold border-b-2 text-sm transition-colors cursor-pointer ${
            importMode === 'JSON'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setImportMode('JSON')}
        >
          Import par Lot JSON / JSONL
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODE 1 : ASSISTANT DOCUMENTAIRE GUIDÉ */}
      {/* ========================================================= */}
      {importMode === 'GUIDED' && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-blue" />
              <span>Étape 1 & 2 — Saisie Documentaire & Extraction Structurée</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tous les actes officiels du cycle (Budget Primitif, Budget Supplémentaire, Budget Modificatif, Délibération, Décision de tutelle, Compte Administratif) sont traités de manière générique et traçable.
            </p>
          </div>

          {/* Formulaire Métadonnées Document */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Collectivité */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Collectivité Territoriale
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Filtrer collectivité (ex: Tiassalé, Cocody, Agnéby)..."
                  className={`${input} py-1.5 text-xs`}
                  value={institutionFilter}
                  onChange={e => setInstitutionFilter(e.target.value)}
                />
                <select
                  aria-label="Collectivité Territoriale"
                  className={input}
                  value={selectedInstitutionId}
                  onChange={e => {
                    setSelectedInstitutionId(e.target.value);
                    setDryRunResult(null);
                  }}
                >
                  {filteredInstitutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.type === 'MAIRIE' ? 'Commune' : inst.type === 'REGION' ? 'Région' : 'District'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exercice */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Exercice Budgétaire
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                className={input}
                value={fiscalYear}
                onChange={e => {
                  setFiscalYear(parseInt(e.target.value, 10) || 2024);
                  setDryRunResult(null);
                }}
              />
            </div>

            {/* Type de document */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Catégorie de l'Acte Budgétaire
              </label>
              <select
                aria-label="Catégorie de l'Acte"
                className={input}
                value={documentType}
                onChange={e => setDocumentType(e.target.value as BudgetDocumentCategory)}
              >
                <option value="BUDGET_PRIMITIF">Budget Primitif (BP)</option>
                <option value="BUDGET_SUPPLEMENTAIRE">Budget Supplémentaire (BS)</option>
                <option value="BUDGET_MODIFICATIF">Budget Modificatif (BM)</option>
                <option value="DECISION_MODIFICATIVE">Décision Modificative</option>
                <option value="VIREMENT_CREDITS">Virement de Crédits</option>
                <option value="COMPTE_ADMINISTRATIF">Compte Administratif (CA)</option>
                <option value="DELIBERATION_BUDGETAIRE">Délibération Budgétaire</option>
                <option value="AUTRE_DOCUMENT_OFFICIEL">Autre document officiel</option>
              </select>
            </div>

            {/* Sémantique financière pour actes modificatifs */}
            {['BUDGET_SUPPLEMENTAIRE', 'BUDGET_MODIFICATIF', 'DECISION_MODIFICATIVE', 'VIREMENT_CREDITS'].includes(documentType) && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Sémantique Financière des Montants *
                </label>
                <select
                  aria-label="Sémantique Financière"
                  className={input}
                  value={amountSemantics}
                  onChange={e => {
                    setAmountSemantics(e.target.value as 'DELTA' | 'REVISED_TOTAL' | 'UNKNOWN');
                    setDryRunResult(null);
                  }}
                >
                  <option value="DELTA">Variation Nette (+/- Crédits budgétaires)</option>
                  <option value="REVISED_TOTAL">Nouveau Total Révisé Autorisé</option>
                  <option value="UNKNOWN">Indéterminé (Revue humaine requise)</option>
                </select>
              </div>
            )}

            {/* Date de l'acte */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Date de l'Acte (AAAA-MM-JJ)
              </label>
              <input
                type="date"
                className={input}
                value={sourceDate}
                onChange={e => {
                  setSourceDate(e.target.value);
                  setDryRunResult(null);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Niveau de preuve documentaire
              </label>
              <select
                aria-label="Niveau de preuve documentaire"
                className={input}
                value={evidenceLevel}
                onChange={e => {
                  setEvidenceLevel(e.target.value as typeof evidenceLevel);
                  setDryRunResult(null);
                }}
              >
                <option value="OFFICIAL_DOCUMENT">Document officiel primaire</option>
                <option value="OFFICIAL_INSTITUTION">Institution publique officielle</option>
                <option value="AIP_VERIFIED">Dépêche AIP vérifiée</option>
                <option value="SECONDARY_TO_CORROBORATE">Source secondaire à corroborer</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Date d'adoption / vote de l'acte
              </label>
              <input
                type="date"
                className={input}
                value={adoptionDate}
                onChange={e => {
                  setAdoptionDate(e.target.value);
                  setDryRunResult(null);
                }}
              />
            </div>

            {/* Nom de la source */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Intitulé Officiel du Document Source *
              </label>
              <input
                type="text"
                placeholder="Ex: COMMUNE DE TIASSALE — Décision Modificative n°1 2024"
                className={input}
                value={sourceName}
                onChange={e => {
                  setSourceName(e.target.value);
                  setDryRunResult(null);
                }}
              />
            </div>

            {/* Référence officielle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Référence / Numéro d'Acte *
              </label>
              <input
                type="text"
                placeholder="Ex: Délibération n°2024-04 / Arrêté Tutelle"
                className={input}
                value={sourceReference}
                onChange={e => {
                  setSourceReference(e.target.value);
                  setDryRunResult(null);
                }}
              />
            </div>

            {/* URL source & Page */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Lien URL Source (Optionnel)
              </label>
              <input
                type="url"
                placeholder="https://..."
                className={input}
                value={sourceUrl}
                onChange={e => {
                  setSourceUrl(e.target.value);
                  setDryRunResult(null);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Page Source dans le Document
              </label>
              <input
                type="number"
                min={1}
                placeholder="Ex: 36"
                className={input}
                value={sourcePage ?? ''}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  setSourcePage(Number.isNaN(val) ? undefined : val);
                  setDryRunResult(null);
                }}
              />
            </div>

            {/* Notes & Justifications */}
            <div className="space-y-1.5 md:col-span-3">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Notes d'Analyse / Justification Administrative
              </label>
              <textarea
                rows={2}
                placeholder="Précisions de contexte, motif de virement ou observation de tutelle..."
                className={input}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* TABLEAU DE VALIDATION HUMAINE DES VALEURS PROPOSÉES */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Étape 2 & 3 — Écran de Validation Humaine & Montants</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Règle d'or : aucune valeur indéterminée n'est transformée en zéro. Un montant inconnu reste NULL.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600">
                    <th className="p-3">Libellé / Indicateur</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Nature</th>
                    <th className="p-3">Montant (FCFA)</th>
                    <th className="p-3">Précision</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Actions Humaines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proposedValues.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-semibold text-slate-900">
                        {v.label}
                        <span className="block text-[10px] font-mono text-slate-400">{v.field}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {v.section}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-brand-blue">
                          {v.nature}
                        </span>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          placeholder="NULL (Inconnu)"
                          className="w-36 p-1.5 text-xs font-mono border rounded border-slate-300"
                          value={v.amount ?? ''}
                          onChange={e => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                            handleUpdateValueAmount(v.id, Number.isNaN(val) ? null : val, v.precision);
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <select
                          className="p-1 text-xs border rounded border-slate-300"
                          value={v.precision}
                          onChange={e => handleUpdateValueAmount(v.id, v.amount, e.target.value as any)}
                        >
                          <option value="EXACT">EXACT</option>
                          <option value="APPROXIMATE">APPROXIMATE</option>
                          <option value="LOWER_BOUND">LOWER_BOUND</option>
                          <option value="UNKNOWN">UNKNOWN</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          v.status === 'VALIDATED' ? 'bg-emerald-100 text-emerald-800' :
                          v.status === 'CORRECTED' ? 'bg-blue-100 text-brand-blue' :
                          v.status === 'MARKED_UNKNOWN' ? 'bg-amber-100 text-amber-900' :
                          v.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          className="px-2 py-1 text-[11px] rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold cursor-pointer"
                          onClick={() => handleUpdateValueStatus(v.id, 'VALIDATED')}
                          title="Valider cette valeur"
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-[11px] rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-bold cursor-pointer"
                          onClick={() => handleUpdateValueStatus(v.id, 'MARKED_UNKNOWN')}
                          title="Marquer comme montant inconnu (NULL)"
                        >
                          Inconnu (NULL)
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-[11px] rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold cursor-pointer"
                          onClick={() => handleUpdateValueStatus(v.id, 'REJECTED')}
                          title="Rejeter et exclure"
                        >
                          Rejeter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ACTIONS & SIMULATION DRY-RUN */}
          <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-200 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={button}
                disabled={busy || !sourceName.trim()}
                onClick={handleRunGuidedDryRun}
              >
                1. Simuler Dry-Run de Conformité
              </button>

              <button
                type="button"
                className={`${button} bg-slate-900 text-white`}
                disabled={busy || !dryRunResult?.can_import}
                onClick={handleInjectIntoPipeline}
              >
                2. Préparer le lot pour le Pipeline d'Import →
              </button>
            </div>

            {selectedInstitution && (
              <span className="text-xs text-slate-500 font-medium">
                Cible : <strong>{selectedInstitution.name}</strong> • Exercice {fiscalYear}
              </span>
            )}
          </div>

          {/* RÉSULTAT DU DRY-RUN */}
          {dryRunResult && (
            <div className={`p-4 rounded-xl border ${
              dryRunResult.is_valid ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
            } space-y-2.5`}>
              <div className="flex items-center gap-2">
                {dryRunResult.is_valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                )}
                <h5 className="font-bold text-slate-900 text-sm">
                  {dryRunResult.summary_message}
                </h5>
              </div>

              {dryRunResult.errors.length > 0 && (
                <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
                  {dryRunResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}

              {dryRunResult.conflicts.length > 0 && (
                <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
                  {dryRunResult.conflicts.map((conf, i) => (
                    <li key={i}><strong>Conflit :</strong> {conf}</li>
                  ))}
                </ul>
              )}

              {dryRunResult.warnings.length > 0 && (
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  {dryRunResult.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2 : IMPORT PAR LOT JSON / JSONL BRUT (EXPERT) */}
      {/* ========================================================= */}
      {importMode === 'JSON' && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
          <h3 className="text-lg font-bold">Import par lot JSON / JSONL privé</h3>
          <label className="block">
            Fichier JSON ou JSONL (100 lignes, 1 Mo maximum)
            <input
              className={input}
              type="file"
              accept=".json,.jsonl"
              disabled={busy}
              onChange={event => {
                const file = event.target.files?.[0];
                if (!file) return;
                setPreview(null);
                setReport(null);
                void execute(async () => {
                  if (file.size > 1_000_000) throw new Error('Lot limité à 1 Mo.');
                  setText(await file.text());
                  setJsonl(file.name.endsWith('.jsonl'));
                });
              }}
            />
          </label>
          <label className="block">
            Contenu du lot
            <textarea
              aria-label="Contenu du lot"
              rows={7}
              className={`${input} font-mono text-xs`}
              value={text}
              disabled={busy}
              onChange={event => {
                setText(event.target.value);
                setPreview(null);
                setReport(null);
              }}
            />
          </label>
          <label className="flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              checked={jsonl}
              disabled={busy}
              onChange={event => {
                setJsonl(event.target.checked);
                setPreview(null);
                setReport(null);
              }}
            />
            Une ligne JSON par ligne (JSONL)
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              disabled={busy || !text.trim()}
              onClick={() => void execute(async () => {
                setPreview(null);
                const parsed = parseImportInput(text, jsonl);
                const result = await runImport(parsed);
                setReport(result);
                setPreview({ rows: parsed, report: result });
              })}
            >
              Simuler sans écrire (Dry-Run distant)
            </button>
            <button
              className={`${button} bg-slate-900 text-white`}
              disabled={busy || !preview?.report.counts.ready}
              onClick={() => void execute(async () => {
                if (!preview) return;
                const plan = preview;
                setPreview(null);
                const result = await runImport(plan.rows, plan.report.plan_hash);
                setReport(result);
                setRevision(value => value + 1);
                setMessage('Import terminé. Les lignes restent privées jusqu’à publication explicite.');
              })}
            >
              Importer les lignes prêtes
            </button>
          </div>
          <details>
            <summary className="min-h-[44px] cursor-pointer py-3 font-semibold">Format et règles du lot</summary>
            <p className="text-xs text-slate-600">
              Chaque ligne contient kind (BP/CA/OPERATION/DGMP), institution_id, institution_type, fiscal_year, source (name, reference, date, date_kind, url facultative), data et precision par montant. UNKNOWN exige null. Aucun conflit n’est écrasé. Les données existantes ne sont pas remplacées.
            </p>
          </details>
          {report && (
            <div aria-label="Rapport du lot" className="space-y-3">
              <p className="font-semibold">
                {report.dry_run ? 'Simulation' : 'Import'} — Prêtes : {report.counts.ready} · Importées : {report.counts.imported} · Ignorées : {report.counts.ignored} · Conflits : {report.counts.conflicts} · Erreurs : {report.counts.errors}
              </p>
              {report.rows.map(row => (
                <details key={row.line} className="rounded-lg border border-slate-200 p-3 [overflow-wrap:anywhere]">
                  <summary className="min-h-[44px] cursor-pointer">Ligne {row.line} — {row.status}</summary>
                  <p>{row.message || row.id}</p>
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(preview?.rows[row.line - 1], null, 2)}</pre>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* IMPORTS & DÉCISIONS (REVUE & PUBLICATION CONTRÔLÉE) */}
      {/* ========================================================= */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <h3 className="text-lg font-bold">Imports et décisions de publication</h3>
        <label className="block max-w-sm">
          Filtrer par statut
          <select
            aria-label="Statut"
            className={input}
            value={filter}
            disabled={busy}
            onChange={event => {
              setFilter(event.target.value);
              setPage(0);
            }}
          >
            {['TO_VERIFY', 'VERIFIED', 'PUBLISHED', 'REJECTED', 'ALL'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {!rows.length && <p className="text-slate-500">Aucun import dans cette sélection.</p>}
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map(row => (
            <button
              key={row.id}
              className={`${button} text-left [overflow-wrap:anywhere]`}
              disabled={busy}
              onClick={() => setSelected(row)}
            >
              <strong>{row.payload.kind} · {row.payload.institution_id} · {row.payload.fiscal_year}</strong>
              <span className="block">{row.status} — {row.payload.source.name}</span>
              <span className="block text-xs text-slate-400 font-mono">{row.id}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className={button} disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>
            Précédent
          </button>
          <span>Page {page + 1}</span>
          <button className={button} disabled={busy || rows.length < 25} onClick={() => setPage(value => value + 1)}>
            Suivant
          </button>
        </div>

        {selected && (
          <article className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4 [overflow-wrap:anywhere]" aria-label="Détail import">
            <h4 className="font-bold">{selected.payload.kind} — {selected.status}</h4>
            <p className="font-mono text-xs text-slate-500">{selected.id}</p>
            <p>{selected.payload.institution_id} · {selected.payload.institution_type} · Exercice {selected.payload.fiscal_year}</p>
            <p>
              Source : {selected.payload.source.name}<br />
              Référence : {selected.payload.source.reference}<br />
              Date : {selected.payload.source.date} ({selected.payload.source.date_kind})
            </p>
            {selected.payload.source.url && isSafeUrl(selected.payload.source.url) && (
              <a className="underline text-brand-blue" href={selected.payload.source.url} target="_blank" rel="noopener noreferrer">
                Consulter la source officielle
              </a>
            )}
            <dl className="space-y-2">
              {Object.entries(selected.payload.data).map(([field, value]) => (
                <div key={field} className="flex justify-between border-b border-blue-100 py-1">
                  <dt className="font-semibold text-slate-700">{field}</dt>
                  <dd>
                    {selected.payload.precision[field]
                      ? formatQualifiedFCFA(typeof value === 'number' ? value : null, selected.payload.precision[field])
                      : String(value ?? 'Non renseigné')}
                  </dd>
                </div>
              ))}
            </dl>
            {['TO_VERIFY', 'VERIFIED'].includes(selected.status) && (
              <>
                <label className="block">
                  Motif et référence de relecture
                  <textarea
                    aria-label="Motif et référence de relecture"
                    className={input}
                    value={reason}
                    disabled={busy}
                    onChange={event => setReason(event.target.value)}
                  />
                </label>
                {selected.status === 'VERIFIED' && (
                  <label className="flex min-h-[44px] items-start gap-3">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={busy}
                      onChange={event => setConfirmed(event.target.checked)}
                    />
                    J’ai relu les sources et les précisions ; je confirme la diffusion publique de cette ligne.
                  </label>
                )}
                <div className="flex flex-wrap gap-3">
                  {(selected.status === 'TO_VERIFY' ? ['VERIFY', 'REJECT'] as const : ['PUBLISH', 'REJECT'] as const).map(action => (
                    <button
                      key={action}
                      className={button}
                      disabled={busy || reason.trim().length < 5 || (action === 'PUBLISH' && !confirmed)}
                      onClick={() => void execute(async () => {
                        await reviewImport(selected.id, action, reason, confirmed);
                        setRevision(value => value + 1);
                        setMessage(action === 'PUBLISH' ? 'Publication confirmée.' : 'Décision enregistrée.');
                      })}
                    >
                      {action === 'VERIFY' ? 'Vérifier' : action === 'PUBLISH' ? 'Publier explicitement' : 'Rejeter'}
                    </button>
                  ))}
                </div>
              </>
            )}
            <h5 className="font-semibold">Historique privé</h5>
            {history.map(event => (
              <p key={event.id} className="text-xs text-slate-600">
                {event.created_at} · {event.action} — {event.reason}
              </p>
            ))}
          </article>
        )}
      </div>
    </section>
  );
}
