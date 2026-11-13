import React, { useEffect, useState } from 'react';
import { MessageSquare, CheckCircle2, ShieldCheck, ExternalLink, RotateCcw, Send, AlertTriangle } from 'lucide-react';
import { AdministrativeAccount, InstitutionResponse } from '../../types/administrativeAccount';
import { ADMINISTRATIVE_ACCOUNTS_DATA, refreshPublishedAdministrativeAccounts } from '../../data/administrativeAccountsData';
import {
  fetchAllInstitutionResponses,
  moderateInstitutionResponse,
  submitInstitutionResponse,
  InstitutionResponseStatus,
} from '../../services/institutionResponseService';
import { buildInstitutionalResponseBadge } from '../../review/domain/responses';
import { isSafeUrl } from '../../utils/security';

interface InstitutionResponseManagerProps {
  staffRole: string;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const InstitutionResponseManager: React.FC<InstitutionResponseManagerProps> = ({
  staffRole,
  onShowToast,
}) => {
  const [responses, setResponses] = useState<InstitutionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<AdministrativeAccount[]>(() => [...ADMINISTRATIVE_ACCOUNTS_DATA]);

  const [caId, setCaId] = useState(accounts[0]?.id || '');
  const [operationId, setOperationId] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorTitle, setAuthorTitle] = useState('');
  const [responseDate, setResponseDate] = useState(new Date().toISOString().slice(0, 10));
  const [responseText, setResponseText] = useState('');
  const [supportingDocName, setSupportingDocName] = useState('');
  const [supportingDocUrl, setSupportingDocUrl] = useState('');

  const badgeMeta = buildInstitutionalResponseBadge('INSTITUTION_RESPONSE');

  const loadResponses = async () => {
    setLoading(true);
    try {
      const list = await fetchAllInstitutionResponses();
      setResponses(list);
      setAccounts([...ADMINISTRATIVE_ACCOUNTS_DATA]);
    } catch (error) {
      onShowToast(
        error instanceof Error ? error.message : 'Impossible de charger les réponses institutionnelles.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResponses();
  }, []);

  const selectedAccount = accounts.find((a) => a.id === caId);

  const handleSubmitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await submitInstitutionResponse({
        ca_id: caId,
        operation_id: operationId || null,
        author_name: authorName,
        author_title: authorTitle,
        response_date: responseDate,
        response_text: responseText,
        supporting_document_name: supportingDocName || null,
        supporting_document_url: supportingDocUrl || null,
      });
      setAuthorName('');
      setAuthorTitle('');
      setResponseText('');
      setSupportingDocName('');
      setSupportingDocUrl('');
      setOperationId('');
      onShowToast('Droit de réponse enregistré en file modérée (PENDING).', 'success');
      await loadResponses();
    } catch (error) {
      onShowToast(
        error instanceof Error ? error.message : "Échec d'enregistrement du droit de réponse.",
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleModerate = async (resp: InstitutionResponse, nextStatus: InstitutionResponseStatus) => {
    if (saving) return;
    setSaving(true);
    try {
      await moderateInstitutionResponse(resp.id, resp.response_status, nextStatus, staffRole);
      await refreshPublishedAdministrativeAccounts();
      onShowToast(`Statut du droit de réponse mis à jour : ${nextStatus}.`, 'success');
      await loadResponses();
    } catch (error) {
      onShowToast(
        error instanceof Error ? error.message : 'Transition non autorisée ou erreur serveur.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Droit de Réponse Institutionnel (Principe 8)</span>
          </div>
          <h3 className="text-xl font-extrabold text-navy-900">
            Modération des Précisions Officielles ({responses.length})
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">{badgeMeta.disclaimer}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadResponses()}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{loading ? 'Actualisation...' : 'Actualiser'}</span>
        </button>
      </div>

      {/* Submission Form (strictly enters PENDING moderation queue) */}
      <form onSubmit={handleSubmitDraft} className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-black text-slate-900 text-sm">
            Enregistrer un courrier / droit de réponse reçu
          </h4>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Entrée obligatoire en statut PENDING avant validation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Compte Administratif cible *</label>
            <select
              value={caId}
              onChange={(e) => {
                setCaId(e.target.value);
                setOperationId('');
              }}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
            >
              <option value="">-- Sélectionner un CA --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.institution_name} — CA {acc.fiscal_year} ({acc.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Opération spécifique (optionnel)</label>
            <select
              value={operationId}
              onChange={(e) => setOperationId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
              disabled={!selectedAccount}
            >
              <option value="">Réponse globale sur le CA</option>
              {(selectedAccount?.operations || []).map((op) => (
                <option key={op.id} value={op.id}>
                  {op.operation_reference ? `${op.operation_reference} — ` : ''}{op.title.slice(0, 70)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Signataire officiel *</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ex : M. Kouassi Jean-Luc"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Fonction *</label>
            <input
              type="text"
              required
              value={authorTitle}
              onChange={(e) => setAuthorTitle(e.target.value)}
              placeholder="Ex : Secrétaire Général de la Mairie"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Date officielle du courrier *</label>
            <input
              type="date"
              required
              value={responseDate}
              onChange={(e) => setResponseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Pièce justificative (nom &amp; URL https://)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={supportingDocName}
                onChange={(e) => setSupportingDocName(e.target.value)}
                placeholder="Nom document"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
              />
              <input
                type="url"
                value={supportingDocUrl}
                onChange={(e) => setSupportingDocUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Texte intégral de la précision institutionnelle *</label>
          <textarea
            required
            rows={3}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Reproduire factuellement les précisions transmises par l'institution..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !caId}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{saving ? 'Enregistrement...' : 'Enregistrer en file modérée (PENDING)'}</span>
        </button>
      </form>

      {/* Moderation Queue List */}
      {responses.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
          Aucun droit de réponse institutionnel enregistré pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((resp) => (
            <div
              key={resp.id}
              className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      resp.response_status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : resp.response_status === 'VALIDATED'
                          ? 'bg-sky-100 text-sky-900 border-sky-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {resp.response_status}
                  </span>
                  <span className="font-bold text-slate-900">
                    {resp.author_name} ({resp.author_title})
                  </span>
                  <span className="text-slate-500">• {resp.response_date}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">CA : {resp.ca_id}</span>
              </div>

              <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                « {resp.response_text} »
              </p>

              {resp.supporting_document_url && isSafeUrl(resp.supporting_document_url) && (
                <a
                  href={resp.supporting_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{resp.supporting_document_name || 'Document justificatif'}</span>
                </a>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Publié comme réponse institutionnelle, jamais comme validation terrain.</span>
                </span>

                <div className="flex items-center gap-2">
                  {resp.response_status === 'PENDING' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleModerate(resp, 'VALIDATED')}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Valider la forme (VALIDATED)</span>
                    </button>
                  )}
                  {resp.response_status === 'VALIDATED' && (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleModerate(resp, 'PUBLISHED')}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Publier (PUBLISHED)</span>
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleModerate(resp, 'PENDING')}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                      >
                        Remettre PENDING
                      </button>
                    </>
                  )}
                  {resp.response_status === 'PUBLISHED' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleModerate(resp, 'PENDING')}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs cursor-pointer"
                    >
                      Retirer (PENDING)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
