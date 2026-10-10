/**
 * Documented scope exceptions from the LFI 2026 reconciliation register.
 * These are explanations, not inferred budget allocations or additional credits.
 */
export const SCOPE_EXCEPTIONS: Record<string, string> = {
  'gov-007': 'Portefeuille composite : les sections candidates 322 et 328 ne peuvent pas être additionnées automatiquement. La section 322 comporte des rubriques de dotations et de programmes distinctes.',
  'gov-010': 'Portefeuille composite : le montant enregistré correspond numériquement à la section 340 (Transports), sans justifier une inclusion de la section 440 (Affaires maritimes).',
  'gov-023': 'Portefeuille composite : le montant enregistré correspond numériquement à la section 362 (Emploi et Protection sociale) ; la section 334 (Enseignement technique) ne peut pas y être ajoutée sans justification.',
  'gov-024': 'Portefeuille composite : la répartition entre les sections candidates 331 et 334 reste à documenter. Ne pas additionner ces sections sans preuve d’affectation.',
  'gov-035': 'Ministère délégué sans section autonome identifiée dans le récapitulatif LFI 2026. Le montant enregistré est identique à celui de la fiche Agriculture (gov-009) et ne doit pas être compté deux fois.',
};

