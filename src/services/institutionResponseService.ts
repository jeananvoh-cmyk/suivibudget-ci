import { supabase, isSupabaseConfigured } from './supabase';
import { InstitutionResponse } from '../types/administrativeAccount';
import { isSafeUrl } from '../utils/security';

export type InstitutionResponseStatus = InstitutionResponse['response_status'];

export interface InstitutionResponseDraft {
  ca_id: string;
  operation_id?: string | null;
  response_text: string;
  response_date?: string;
  author_name: string;
  author_title: string;
  supporting_document_url?: string | null;
  supporting_document_name?: string | null;
}

export interface DraftValidationResult {
  valid: boolean;
  errors: string[];
}

const ALLOWED_STAFF_ROLES = new Set(['ADMIN', 'MODERATOR', 'DATA_MANAGER']);

/**
 * Valide la forme d'une réponse institutionnelle avant enregistrement en file modérée (`PENDING`).
 */
export function validateInstitutionResponseDraft(
  draft: InstitutionResponseDraft
): DraftValidationResult {
  const errors: string[] = [];

  if (!draft.ca_id || !draft.ca_id.trim()) {
    errors.push('Le Compte Administratif cible est obligatoire.');
  }
  if (!draft.author_name || draft.author_name.trim().length < 2) {
    errors.push("Le nom du signataire institutionnel est requis.");
  }
  if (!draft.author_title || draft.author_title.trim().length < 2) {
    errors.push("La fonction officielle du signataire est requise.");
  }
  if (!draft.response_text || draft.response_text.trim().length < 15) {
    errors.push('Le texte du droit de réponse doit contenir au moins 15 caractères.');
  }
  if (draft.response_date && !/^\d{4}-\d{2}-\d{2}$/.test(draft.response_date.trim())) {
    errors.push('La date de réponse doit respecter le format AAAA-MM-JJ.');
  }
  const docUrl = draft.supporting_document_url?.trim();
  if (docUrl && !isSafeUrl(docUrl)) {
    errors.push("L'URL du document justificatif doit commencer par https:// ou http://.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Contrôle strictement la transition d'état du Droit de Réponse Institutionnel.
 * Empêche toute publication directe sans passage par la file modérée (`PENDING` -> `VALIDATED` -> `PUBLISHED`).
 */
export function transitionResponseStatus(
  currentStatus: InstitutionResponseStatus,
  nextStatus: InstitutionResponseStatus,
  staffRole: string | null | undefined
): { allowed: boolean; nextStatus: InstitutionResponseStatus; reason?: string } {
  if (!staffRole || !ALLOWED_STAFF_ROLES.has(staffRole.toUpperCase())) {
    return {
      allowed: false,
      nextStatus: currentStatus,
      reason: 'Rôle habilité requis (ADMIN, MODERATOR ou DATA_MANAGER).',
    };
  }

  if (currentStatus === nextStatus) {
    return { allowed: true, nextStatus };
  }

  const allowedTransitions: Record<InstitutionResponseStatus, InstitutionResponseStatus[]> = {
    PENDING: ['VALIDATED'],
    VALIDATED: ['PUBLISHED', 'PENDING'],
    PUBLISHED: ['PENDING'],
  };

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    return {
      allowed: false,
      nextStatus: currentStatus,
      reason: `Transition interdite (${currentStatus} -> ${nextStatus}) : validation préalable requise.`,
    };
  }

  return { allowed: true, nextStatus };
}

/**
 * Charge l'ensemble des réponses institutionnelles (staff authentifié uniquement via RLS).
 */
export async function fetchAllInstitutionResponses(): Promise<InstitutionResponse[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('ca_institution_responses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as InstitutionResponse[];
}

/**
 * Enregistre un droit de réponse reçu en statut initial strictement modéré (`PENDING`).
 */
export async function submitInstitutionResponse(
  draft: InstitutionResponseDraft
): Promise<InstitutionResponse> {
  const validation = validateInstitutionResponseDraft(draft);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }
  if (!isSupabaseConfigured()) {
    throw new Error('Connexion Supabase requise pour enregistrer un droit de réponse.');
  }

  const responseDate =
    draft.response_date?.trim() || new Date().toISOString().slice(0, 10);

  const payload = {
    ca_id: draft.ca_id.trim(),
    operation_id: draft.operation_id?.trim() || null,
    response_text: draft.response_text.trim(),
    response_date: responseDate,
    author_name: draft.author_name.trim(),
    author_title: draft.author_title.trim(),
    supporting_document_url: draft.supporting_document_url?.trim() || null,
    supporting_document_name: draft.supporting_document_name?.trim() || null,
    response_status: 'PENDING' as const,
  };

  const { data, error } = await supabase
    .from('ca_institution_responses')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as InstitutionResponse;
}

/**
 * Fait évoluer le statut d'un droit de réponse après contrôle staff (`PENDING` -> `VALIDATED` -> `PUBLISHED`).
 */
export async function moderateInstitutionResponse(
  responseId: string,
  currentStatus: InstitutionResponseStatus,
  nextStatus: InstitutionResponseStatus,
  staffRole: string | null | undefined
): Promise<InstitutionResponse> {
  const transition = transitionResponseStatus(currentStatus, nextStatus, staffRole);
  if (!transition.allowed) {
    throw new Error(transition.reason || 'Transition non autorisée.');
  }
  if (!isSupabaseConfigured()) {
    throw new Error('Connexion Supabase requise pour modérer un droit de réponse.');
  }

  const { data, error } = await supabase
    .from('ca_institution_responses')
    .update({ response_status: transition.nextStatus })
    .eq('id', responseId)
    .select('*')
    .single();
  if (error) throw error;
  return data as InstitutionResponse;
}
