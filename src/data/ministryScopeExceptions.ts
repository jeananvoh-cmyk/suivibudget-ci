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


/** Sections with an unresolved numeric difference between the 2026 directory
 * and the CP total in the LFI reconciliation register. No implied correction. */
export const MINISTRY_DOCUMENTARY_DISCREPANCIES: Readonly<Record<string, string>> = Object.freeze({
  'gov-001': '108',
  'gov-006': '323',
  'gov-009': '229',
  'gov-011': '366',
  'gov-012': '357',
  'gov-013': '335',
  'gov-014': '358',
  'gov-022': '333',
  'gov-029': '346',
});

/** Candidate section CP amounts transcribed from the 2026 LFI reconciliation
 * register, not certified as the amount allocated to the current portfolio. */
export const MINISTRY_CANDIDATE_CP_2026: Readonly<Record<string, number>> = Object.freeze({
  'gov-001': 71326766299,
  'gov-006': 945963329452,
  'gov-009': 333878089526,
  'gov-011': 502893150963,
  'gov-012': 81484195624,
  'gov-013': 808992158914,
  'gov-014': 123247714398,
  'gov-022': 338779408246,
  'gov-029': 37598620420,
});

/** Legacy directory totals withheld until independent section attribution is evidenced. */
export const WITHHELD_MINISTRY_PORTFOLIO_IDS: ReadonlySet<string> = new Set([
  ...Object.keys(MINISTRY_DOCUMENTARY_DISCREPANCIES),
  'gov-035',
]);
