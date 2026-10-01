// =========================================================================
// MOTEUR DE CALCULS DES TAUX D'EXÉCUTION BUDGÉTAIRE
// Formules dynamiques avec gardes-fous civiques et tolérance zéro aux divisions par zéro
// =========================================================================

import { ExecutionRateResult } from '../types/administrativeAccount';
import type { AmountPrecision } from '../types/localBudget';

/**
 * Calcule dynamiquement le taux d'exécution financière
 * Formule : (Montant Réalisé / Montant Prévu) * 100
 * 
 * Gardes-fous :
 * - Si planned_amount === 0 : pas de division par zéro (statut ZERO_PLANNED)
 * - Si realized_amount === 0 : taux à 0%
 * - Si realized_amount > planned_amount : alerte civique "À vérifier / Réalisé supérieur au prévu",
 *   sans jamais formuler d'accusation.
 */
export function calculateExecutionRate(realizedAmount: number | null | undefined, plannedAmount: number | null | undefined, realizedPrecision: AmountPrecision = 'EXACT', plannedPrecision: AmountPrecision = 'EXACT'): ExecutionRateResult {
  if (realizedAmount == null || plannedAmount == null || !Number.isFinite(realizedAmount) || !Number.isFinite(plannedAmount) || realizedPrecision !== 'EXACT' || plannedPrecision !== 'EXACT') {
    return { rate: null, formatted: 'Non calculable', status: 'UNKNOWN', isOverBudget: false, statusLabel: 'Montants à confirmer ou qualifiés : taux non calculé', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
  // Protection contre les valeurs négatives ou non définies
  const realized = Math.max(0, realizedAmount || 0);
  const planned = Math.max(0, plannedAmount || 0);

  // Cas 1 : Prévision nulle
  if (planned === 0) {
    if (realized > 0) {
      return {
        rate: 100,
        formatted: 'Non budgétisé',
        status: 'OVER_EXECUTED',
        isOverBudget: true,
        statusLabel: 'Dépense réalisée sans prévision initiale identifiée',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
      };
    }
    return {
      rate: 0,
      formatted: '0 %',
      status: 'ZERO_PLANNED',
      isOverBudget: false,
      statusLabel: 'Crédit nul',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

  // Cas 2 : Réalisation nulle
  if (realized === 0) {
    return {
      rate: 0,
      formatted: '0,00 %',
      status: 'ZERO_EXECUTED',
      isOverBudget: false,
      statusLabel: 'Aucune dépense ordonnancée',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
    };
  }

  // Calcul dynamique exact avec arrondi au centième
  const rawRatio = (realized / planned) * 100;
  // Arrondi à 2 décimales pour l'affichage propre
  const roundedRate = Math.round(rawRatio * 100) / 100;

  // Formatage en virgule française
  const formatted = roundedRate.toLocaleString('fr-FR', {
    minimumFractionDigits: roundedRate % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }) + ' %';

  // Cas 3 : Dépense supérieure au montant prévu
  if (realized > planned) {
    return {
      rate: roundedRate,
      formatted,
      status: 'OVER_EXECUTED',
      isOverBudget: true,
      statusLabel: 'À vérifier : Réalisé supérieur au montant prévu',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300'
    };
  }

  // Cas 4 : Exécution normale
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (roundedRate < 50) {
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
  }

  return {
    rate: roundedRate,
    formatted,
    status: 'NORMAL',
    isOverBudget: false,
    statusLabel: `${formatted} exécuté financièrement`,
    badgeClass
  };
}

/**
 * Retourne la classe CSS de badge selon le statut et le taux
 */
export function getExecutionRateBadgeColor(status: ExecutionRateResult['status'], rate: number | null): string {
  if (status === 'UNKNOWN' || rate == null) return 'bg-slate-100 text-slate-700 border-slate-300';
  if (status === 'OVER_EXECUTED') return 'bg-purple-100 text-purple-900 border-purple-300';
  if (status === 'ZERO_PLANNED' || status === 'ZERO_EXECUTED') return 'bg-slate-100 text-slate-700 border-slate-300';
  if (rate >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (rate >= 50) return 'bg-blue-100 text-brand-blue border-blue-300';
  return 'bg-amber-100 text-amber-800 border-amber-300';
}

/**
 * Libellé textuel pour le statut civique d'exécution
 */
export function getExecutionStatusLabel(status: ExecutionRateResult['status']): string {
  switch (status) {
    case 'UNKNOWN': return 'Montants à confirmer ou qualifiés : taux non calculé';
    case 'OVER_EXECUTED': return 'À vérifier : Réalisé supérieur au montant prévu';
    case 'ZERO_PLANNED': return 'Non budgétisé';
    case 'ZERO_EXECUTED': return 'Aucune dépense exécutée';
    case 'NORMAL':
    default:
      return 'Exécution conforme';
  }
}

