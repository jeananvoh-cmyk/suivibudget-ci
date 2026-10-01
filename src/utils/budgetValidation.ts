// =========================================================================
// MOTEUR DE CONTRÔLE DE COHÉRENCE ET VALIDATION DES BUDGETS LOCAUX
// Conforme à la section 25 du cahier des charges SuiviBudget CI
// =========================================================================

import { LocalBudget, BudgetCoherenceIssue } from '../types/localBudget';
import { amountPrecision } from './formatters';

/**
 * Valide un budget individuel selon les règles de rigueur SuiviBudget
 */
export function validateBudgetRecord(budget: Partial<LocalBudget>): BudgetCoherenceIssue[] {
  const issues: BudgetCoherenceIssue[] = [];

  // 1. Contrôle Institution absente
  if (!budget.institution_id || !budget.institution_name) {
    issues.push({
      code: 'ERR_INSTITUTION_MISSING',
      severity: 'ERROR',
      message: 'Institution territoriale obligatoire non renseignée.',
      budget_id: budget.id,
      institution_id: budget.institution_id,
      fiscal_year: budget.fiscal_year,
    });
  }

  // 2. Contrôle Exercice budgétaire absent ou invalide
  if (!budget.fiscal_year || budget.fiscal_year < 2000 || budget.fiscal_year > 2100) {
    issues.push({
      code: 'ERR_FISCAL_YEAR_INVALID',
      severity: 'ERROR',
      message: `Exercice budgétaire manquant ou invalide (${budget.fiscal_year}).`,
      budget_id: budget.id,
      institution_id: budget.institution_id,
      fiscal_year: budget.fiscal_year,
    });
  }

  // 3. Contrôle Total négatif
  if (budget.total_amount != null && budget.total_amount < 0) {
    issues.push({
      code: 'ERR_TOTAL_NEGATIVE',
      severity: 'ERROR',
      message: `Montant total négatif interdit : ${budget.total_amount} FCFA.`,
      budget_id: budget.id,
      institution_id: budget.institution_id,
      fiscal_year: budget.fiscal_year,
    });
  }

  // 4. Contrôle Source absente
  const hasSources = (budget.sources && budget.sources.length > 0) || Boolean(budget.primary_source_label);
  if (!hasSources) {
    issues.push({
      code: 'WARN_SOURCE_MISSING',
      severity: 'REVIEW',
      message: 'Aucune source documentaire ou médiatique rattachée à cette donnée budgétaire.',
      budget_id: budget.id,
      institution_id: budget.institution_id,
      fiscal_year: budget.fiscal_year,
    });
  }

  // 5. Contrôle Ventilation : Fonctionnement + Investissement != Total
  if (
    ['total_amount','operating_amount','investment_amount'].every(field => amountPrecision(budget, field) === 'EXACT') &&
    budget.total_amount != null &&
    budget.operating_amount != null &&
    budget.investment_amount != null
  ) {
    const sum = (budget.operating_amount || 0) + (budget.investment_amount || 0);
    // On tolère un écart uniquement si l'un des deux montants est 0 (ex: ventilation non ventilée dans la source)
    if (budget.operating_amount > 0 && budget.investment_amount > 0 && Math.abs(sum - budget.total_amount) > 1000) {
      const diff = sum - budget.total_amount;
      issues.push({
        code: 'WARN_SUM_MISMATCH',
        severity: 'REVIEW',
        message: `La somme Fonctionnement (${budget.operating_amount.toLocaleString()} FCFA) + Investissement (${budget.investment_amount.toLocaleString()} FCFA) ne correspond pas au total déclaré (${budget.total_amount.toLocaleString()} FCFA). Écart : ${diff.toLocaleString()} FCFA.`,
        budget_id: budget.id,
        institution_id: budget.institution_id,
        fiscal_year: budget.fiscal_year,
        details: { sum, total: budget.total_amount, diff },
      });
    }
  }

  // 6. Contrôle Pourcentage > 100 %
  if (budget.operating_percentage != null && budget.operating_percentage > 100) {
    issues.push({
      code: 'WARN_OP_PCT_OVER_100',
      severity: 'REVIEW',
      message: `Pourcentage de fonctionnement anormal supérieur à 100% (${budget.operating_percentage}%).`,
      budget_id: budget.id,
      fiscal_year: budget.fiscal_year,
    });
  }
  if (budget.investment_percentage != null && budget.investment_percentage > 100) {
    issues.push({
      code: 'WARN_INV_PCT_OVER_100',
      severity: 'REVIEW',
      message: `Pourcentage d'investissement anormal supérieur à 100% (${budget.investment_percentage}%).`,
      budget_id: budget.id,
      fiscal_year: budget.fiscal_year,
    });
  }

  // 7. Contrôle Montant exact provenant d'une source "plus de X"
  if (budget.amount_precision === 'EXACT') {
    const sessionText = `${budget.session_notes || ''} ${budget.notes || ''} ${budget.primary_source_label || ''}`.toLowerCase();
    if (sessionText.includes('plus de') || sessionText.includes('près de') || sessionText.includes('environ')) {
      issues.push({
        code: 'WARN_PRECISION_MISMATCH',
        severity: 'REVIEW',
        message: 'Montant marqué comme EXACT alors que la source indique une approximation ("plus de", "environ" ou "près de"). La précision devrait être LOWER_BOUND ou APPROXIMATE.',
        budget_id: budget.id,
        fiscal_year: budget.fiscal_year,
      });
    }
  }

  // 8. Contrôle Incompatibilité Cycle : CA vs BP
  if (budget.budget_type === 'COMPTE_ADMINISTRATIF' && budget.fiscal_year && budget.fiscal_year >= 2026) {
    issues.push({
      code: 'ERR_CA_FUTURE_YEAR',
      severity: 'ERROR',
      message: `Impossible d'enregistrer un Compte Administratif pour l'exercice en cours ou futur (${budget.fiscal_year}). Le CA retrace uniquement des exercices clôturés.`,
      budget_id: budget.id,
      fiscal_year: budget.fiscal_year,
    });
  }

  if (budget.budget_type === 'PRIMITIF_ADOPTE' && budget.notes?.toLowerCase().includes('compte administratif')) {
    issues.push({
      code: 'ERR_BP_CA_CONFUSION',
      severity: 'ERROR',
      message: 'Confusion détectée : ce document semble être un Compte Administratif et ne doit pas être qualifié de Budget Primitif.',
      budget_id: budget.id,
      fiscal_year: budget.fiscal_year,
    });
  }

  // 9. Contrôle Incompatibilité Source / Statut de vérification (AIP_VERIFIED vs Source de presse générale)
  if (budget.verification_status === 'AIP_VERIFIED') {
    const sourceTexts: string[] = [];
    if (budget.primary_source_label) sourceTexts.push(budget.primary_source_label);
    if (budget.primary_source_url) sourceTexts.push(budget.primary_source_url);
    if (budget.sources) {
      for (const s of budget.sources) {
        if (s.source?.publisher) sourceTexts.push(s.source.publisher);
        if (s.source?.title) sourceTexts.push(s.source.title);
        if (s.source?.url) sourceTexts.push(s.source.url);
      }
    }
    const combined = sourceTexts.join(' ').toLowerCase();
    if (combined.length > 0) {
      const mentionsAip = combined.includes('aip') || combined.includes('agence ivoirienne de presse');
      const mentionsPress = combined.includes('abidjan.net') || combined.includes('nouveau réveil') ||
                            combined.includes('nouveau reveil') || combined.includes('fraternité matin') ||
                            combined.includes('fratmat') || combined.includes('koaci') ||
                            combined.includes('soir info') || combined.includes('l\'inter');
      if (!mentionsAip && mentionsPress) {
        issues.push({
          code: 'ERR_SOURCE_VERIFICATION_MISMATCH',
          severity: 'ERROR',
          message: 'Contradiction de provenance : Le statut AIP_VERIFIED ne peut pas être attribué à une source de presse générale. Utiliser SECONDARY_TO_CORROBORATE.',
          budget_id: budget.id,
          institution_id: budget.institution_id,
          fiscal_year: budget.fiscal_year,
        });
      }
    }
  }

  return issues;
}

/**
 * Vérifie la cohérence entre la source déclarée et le statut de vérification d'un lot d'importation
 */
export function validateImportProvenanceConsistency(row: any): { valid: boolean; error?: string } {
  if (!row || !row.source || !row.data) return { valid: true };
  const sourceName = `${row.source.name || ''} ${row.source.reference || ''} ${row.source.url || ''}`.toLowerCase();
  const verificationStatus = row.data.verification_status;

  if (verificationStatus === 'AIP_VERIFIED') {
    const isAIP = sourceName.includes('aip') || sourceName.includes('agence ivoirienne de presse');
    if (!isAIP) {
      return {
        valid: false,
        error: `Incohérence de provenance : la source "${row.source.name}" n'est pas une dépêche AIP et ne peut pas porter le statut AIP_VERIFIED. Utiliser SECONDARY_TO_CORROBORATE pour une source de presse.`,
      };
    }
  }
  if (verificationStatus === 'OFFICIAL_DOCUMENT') {
    const isOfficial = sourceName.includes('compte administratif') || sourceName.includes('délibération') ||
                       sourceName.includes('deliberation') || sourceName.includes('procès-verbal') ||
                       sourceName.includes('proces-verbal') || sourceName.includes('arrêté') ||
                       sourceName.includes('arrete') || sourceName.includes('budget primitif') ||
                       sourceName.includes('registre');
    if (!isOfficial && (sourceName.includes('abidjan.net') || sourceName.includes('koaci'))) {
      return {
        valid: false,
        error: `Incohérence de provenance : un article de presse ne peut pas porter le statut OFFICIAL_DOCUMENT sans document officiel rattaché.`,
      };
    }
  }
  return { valid: true };
}

/**
 * Valide l'ensemble du référentiel des budgets locaux pour détecter les conflits d'unicité
 */
export function validateAllLocalBudgets(budgets: LocalBudget[]): BudgetCoherenceIssue[] {
  const allIssues: BudgetCoherenceIssue[] = [];

  // Vérifier chaque budget individuellement
  budgets.forEach(b => {
    allIssues.push(...validateBudgetRecord(b));
  });

  // Contrôle : pas deux budgets "is_current_version = true" pour la même institution + exercice
  const currentMap = new Map<string, LocalBudget>();

  budgets.forEach(b => {
    if (b.is_current_version) {
      const key = `${b.institution_id}-${b.fiscal_year}`;
      if (currentMap.has(key)) {
        const existing = currentMap.get(key)!;
        allIssues.push({
          code: 'ERR_MULTIPLE_CURRENT_VERSIONS',
          severity: 'ERROR',
          message: `Conflit d'intégrité : L'institution ${b.institution_name} possède deux budgets marqués comme "Version Courante Active" pour l'exercice ${b.fiscal_year} (${existing.id} et ${b.id}).`,
          budget_id: b.id,
          institution_id: b.institution_id,
          fiscal_year: b.fiscal_year,
        });
      } else {
        currentMap.set(key, b);
      }
    }
  });

  return allIssues;
}

/**
 * Alias de validation d'un budget local
 */
export const validateLocalBudget = validateBudgetRecord;

