import React, { useState, useMemo } from 'react';
import { Institution, PrimitiveBudgetInfo } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA } from '../utils/formatters';
import { normalizeKey } from '../data/officialWebDirectory';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ExternalLink, 
  Sparkles,
  Search,
  Check,
  Building2
} from 'lucide-react';

interface PrimitiveBudgetImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  allInstitutions: Institution[];
  onImportSuccess: (count: number) => void;
}

interface ParsedBudgetRow {
  rawLine: string;
  queryName: string;
  matchedInstitution: Institution | null;
  totalVoted: number;
  investmentVoted: number | null;
  functioningVoted: number | null;
  votedDate: string;
  source: string;
  sourceUrl: string;
  notes: string;
  error?: string;
}

export const PrimitiveBudgetImporterModal: React.FC<PrimitiveBudgetImporterModalProps> = ({
  isOpen,
  onClose,
  allInstitutions,
  onImportSuccess,
}) => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');

  // Filter to Territorial entities only (Mairies and Conseils Régionaux)
  const localInstitutions = useMemo(() => {
    return allInstitutions.filter(i => i.type === 'MAIRIE' || i.type === 'REGION');
  }, [allInstitutions]);

  // Map for fast lookup by normalized name and ID
  const institutionLookup = useMemo(() => {
    const map = new Map<string, Institution>();
    for (const inst of localInstitutions) {
      // By exact ID
      map.set(inst.id.toLowerCase(), inst);
      // By normalized name
      const normName = normalizeKey(inst.name);
      if (normName) map.set(normName, inst);
      // By department / chef-lieu if present
      if (inst.departement) {
        const normDep = normalizeKey(inst.departement);
        if (normDep && !map.has(normDep)) map.set(normDep, inst);
      }
    }
    return map;
  }, [localInstitutions]);

  const findInstitution = (query: string): Institution | null => {
    if (!query) return null;
    const clean = query.trim().toLowerCase();
    
    // Direct ID match
    if (institutionLookup.has(clean)) {
      return institutionLookup.get(clean)!;
    }

    // Normalized key match
    const norm = normalizeKey(query);
    if (norm && institutionLookup.has(norm)) {
      return institutionLookup.get(norm)!;
    }

    // Fuzzy search: startsWith or includes
    for (const inst of localInstitutions) {
      const nInst = normalizeKey(inst.name);
      if (nInst === norm || (norm.length >= 4 && (nInst.includes(norm) || norm.includes(nInst)))) {
        return inst;
      }
    }

    return null;
  };

  // Parse CSV text into preview rows
  const parsedRows = useMemo<ParsedBudgetRow[]>(() => {
    if (!csvText.trim()) return [];

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const results: ParsedBudgetRow[] = [];

    // Check if first line is a header
    let startIndex = 0;
    if (lines.length > 0) {
      const firstLower = lines[0].toLowerCase();
      if (firstLower.includes('commune') || firstLower.includes('region') || firstLower.includes('budget') || firstLower.includes('total') || firstLower.includes('nom')) {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Detect separator: ';' or ',' or '\t'
      const separator = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
      
      // Simple CSV split handling quotes
      const regex = new RegExp(`(?:^|${separator})(?:"([^"]*(?:""[^"]*)*)"|([^"${separator}]*))`, 'g');
      const tokens: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        let value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
        tokens.push((value || '').trim());
      }

      if (tokens.length < 2) continue;

      const queryName = tokens[0] || '';
      const totalStr = tokens[1] || '0';
      const invStr = tokens[2] || '';
      const funcStr = tokens[3] || '';
      const votedDate = tokens[4] || new Date().toLocaleDateString('fr-FR');
      const source = tokens[5] || 'Conseil Municipal / Délibération officielle';
      const sourceUrl = tokens[6] || '';
      const notes = tokens[7] || '';

      // Clean numbers
      const cleanNum = (str: string | undefined): number | null => {
        if (!str) return null;
        const cleaned = str.replace(/[^\d]/g, '');
        return cleaned ? parseInt(cleaned, 10) : null;
      };

      const totalVoted = cleanNum(totalStr) ?? 0;
      let investmentVoted: number | null = cleanNum(invStr);
      let functioningVoted: number | null = cleanNum(funcStr);

      // Auto-balance ONLY if exact math deduction is possible (e.g., total and 1 part known)
      if (totalVoted > 0) {
        if (investmentVoted !== null && investmentVoted > 0 && (functioningVoted === null || functioningVoted === 0)) {
          functioningVoted = Math.max(0, totalVoted - investmentVoted);
        } else if (functioningVoted !== null && functioningVoted > 0 && (investmentVoted === null || investmentVoted === 0)) {
          investmentVoted = Math.max(0, totalVoted - functioningVoted);
        }
      }

      const matchedInstitution = findInstitution(queryName);
      let error: string | undefined;
      if (!matchedInstitution) {
        error = `Collectivité non identifiée dans l'annuaire ("${queryName}")`;
      } else if (totalVoted <= 0) {
        error = `Montant de budget total invalide ou égal à 0`;
      }

      results.push({
        rawLine: line,
        queryName,
        matchedInstitution,
        totalVoted,
        investmentVoted,
        functioningVoted,
        votedDate,
        source,
        sourceUrl: sourceUrl.startsWith('http') || !sourceUrl ? sourceUrl : `https://${sourceUrl}`,
        notes,
        error
      });
    }

    return results;
  }, [csvText, institutionLookup, localInstitutions]);

  const matchedCount = parsedRows.filter(r => r.matchedInstitution && !r.error).length;
  const errorCount = parsedRows.filter(r => r.error).length;

  const filteredRows = useMemo(() => {
    if (filterMode === 'MATCHED') return parsedRows.filter(r => !r.error);
    if (filterMode === 'UNMATCHED') return parsedRows.filter(r => r.error);
    return parsedRows;
  }, [parsedRows, filterMode]);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Download Sample CSV
  const handleDownloadTemplate = () => {
    const header = 'Commune_ou_Region;Total_Vote_FCFA;Investissement_FCFA;Fonctionnement_FCFA;Date_Vote;Source;Lien_Confirmation_URL;Notes\n';
    const sampleRows = [
      'Mairie de Tiassalé;1760000000;1073600000;686400000;07/11/2025;Conseil Municipal de Tiassalé & AIP;https://aip.ci;Adopté à l\'unanimité (54 projets)',
      'Mairie de Bingerville;4046222000;2168370370;1877851630;31/10/2025;AIP & Conseil Municipal;https://aip.ci/139369/cote-divoire-aip-le-conseil-municipal-de-bingerville-adopte-un-budget-primitif-de-plus-de-quatre-milliards-de-fcfa-pour-lannee-2026/;Priorité voiries et sécurité',
      'Mairie de Tafiré;825150000;571150000;254000000;14/02/2026;Conseil Municipal de Tafiré & AIP;https://aip.ci;36 opérations d\'équipement',
      'Conseil Régional du Gbêkê;4500000000;2800000000;1700000000;15/12/2025;Conseil Régional du Gbêkê;https://conseilregionalgbeke.com;Session budgétaire 2026',
      'Mairie de Touba;1410000000;1110000000;300000000;23/01/2026;AIP & Conseil Municipal;https://aip.ci/162817/cote-divoire-aip-le-conseil-municipal-de-touba-adopte-un-budget-primitif-de-141-milliard-fcfa-pour-2026/;78% pour les investissements structurants'
    ].join('\n');

    const blob = new Blob([header + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_import_budgets_primitifs_ci.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Apply Bulk Import
  const handleApplyImport = () => {
    const validRows = parsedRows.filter(r => r.matchedInstitution && !r.error);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    const updatedInstitutions: Institution[] = [];

    for (const row of validRows) {
      const inst = row.matchedInstitution!;
      const primitive: PrimitiveBudgetInfo = {
        total_voted_fcfa: row.totalVoted,
        investment_voted_fcfa: row.investmentVoted,
        functioning_voted_fcfa: row.functioningVoted,
        voted_date: row.votedDate,
        source: row.source,
        source_url: row.sourceUrl || undefined,
        session_notes: row.notes || undefined,
      };

      updatedInstitutions.push({
        ...inst,
        primitive_budget: primitive,
      });
    }

    dataStore.updateMultipleInstitutions(updatedInstitutions);
    setIsProcessing(false);
    onImportSuccess(updatedInstitutions.length);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-linear-to-r from-navy-900 to-navy-800 text-white flex items-center justify-between border-b border-navy-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 text-brand-orange flex items-center justify-center border border-brand-orange/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Importation Massive des Budgets Primitifs</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  Mairies & Régions
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Alimentez les budgets votés par les conseils locaux, les ratios investissements et les liens de confirmation publics.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* Quick Guidance & Template Button */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-slate-800">
                Format supporté : Fichier CSV ou Copier-Coller direct avec point-virgule (<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">;</code>)
              </p>
              <p className="text-slate-500 text-[11px]">
                Colonnes : <span className="font-mono text-slate-700">Commune; Total_Vote; Investissement; Fonctionnement; Date_Vote; Source; Lien_Confirmation; Notes</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-brand-blue border border-brand-blue/30 rounded-xl font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le Modèle CSV</span>
            </button>
          </div>

          {/* File Picker or Paste Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Direct File Selector */}
            <div className="border-2 border-dashed border-slate-200 hover:border-brand-blue rounded-2xl p-4 bg-slate-50/50 text-center flex flex-col justify-center transition-colors">
              <input
                type="file"
                id="primitive-csv-file"
                accept=".csv, .txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <label 
                htmlFor="primitive-csv-file"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    {fileName ? `Fichier : ${fileName}` : 'Sélectionner un fichier CSV'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Glissez-déposez ou cliquez pour parcourir
                  </span>
                </div>
              </label>
            </div>

            {/* Paste Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Ou collez vos lignes de données ici :
                </label>
                {csvText && (
                  <button
                    type="button"
                    onClick={() => { setCsvText(''); setFileName(''); }}
                    className="text-[11px] text-rose-600 hover:underline font-bold"
                  >
                    Effacer
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Mairie de Tiassalé;1760000000;1073600000;686400000;07/11/2025;Conseil Municipal & AIP;https://aip.ci;54 projets"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono select-all focus:bg-white focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
          </div>

          {/* Parsing Results & Live Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              
              {/* Summary Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-700">
                    Total lignes détectées : <strong>{parsedRows.length}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{matchedCount} collectivités prêtes</span>
                  </span>
                  {errorCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-black flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{errorCount} non résolues</span>
                    </span>
                  )}
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterMode === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Toutes ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('MATCHED')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterMode === 'MATCHED' ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Prêtes ({matchedCount})
                  </button>
                  {errorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('UNMATCHED')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        filterMode === 'UNMATCHED' ? 'bg-rose-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Erreurs ({errorCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 uppercase font-black text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Statut</th>
                      <th className="p-2.5">Collectivité Cible</th>
                      <th className="p-2.5 text-right">Budget Total</th>
                      <th className="p-2.5 text-right">Investissement</th>
                      <th className="p-2.5 text-right">Fonctionnement</th>
                      <th className="p-2.5">Date & Source</th>
                      <th className="p-2.5">Preuve / Lien</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} className={row.error ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                        <td className="p-2.5">
                          {row.error ? (
                            <span className="p-1 rounded bg-rose-100 text-rose-700 text-[10px] font-black" title={row.error}>
                              ⚠ Erreur
                            </span>
                          ) : (
                            <span className="p-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              ✓ Prêt
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {row.matchedInstitution ? (
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                                {row.matchedInstitution.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {row.matchedInstitution.region}
                              </span>
                            </div>
                          ) : (
                            <div className="text-rose-700 font-bold">
                              "{row.queryName}"
                              <span className="text-[10px] block font-normal text-rose-500">Non trouvée</span>
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatFCFA(row.totalVoted)}
                        </td>
                        <td className="p-2.5 text-right text-emerald-700 font-bold whitespace-nowrap">
                          {formatFCFA(row.investmentVoted)}
                          {row.totalVoted > 0 && row.investmentVoted !== null && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({Math.round((row.investmentVoted / row.totalVoted) * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right text-slate-600 font-medium whitespace-nowrap">
                          {formatFCFA(row.functioningVoted)}
                          {row.totalVoted > 0 && row.functioningVoted !== null && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({Math.round((row.functioningVoted / row.totalVoted) * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 text-[11px]">
                          <span className="font-bold block text-slate-800 truncate max-w-[140px]" title={row.source}>
                            {row.source}
                          </span>
                          <span className="text-[10px] text-slate-400">{row.votedDate}</span>
                        </td>
                        <td className="p-2.5">
                          {row.sourceUrl ? (
                            <a
                              href={row.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-blue hover:underline flex items-center gap-1 text-[11px] font-bold"
                              title={row.sourceUrl}
                            >
                              <span>Lien</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Aucun</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer"
          >
            Fermer
          </button>

          <button
            type="button"
            disabled={matchedCount === 0 || isProcessing}
            onClick={handleApplyImport}
            className="px-6 py-2.5 bg-brand-blue hover:bg-navy-900 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>
              {isProcessing ? 'Application en cours...' : `Valider et Déployer ${matchedCount} Budgets Primitifs`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
