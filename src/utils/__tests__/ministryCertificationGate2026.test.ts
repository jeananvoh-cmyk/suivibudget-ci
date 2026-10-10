import { describe, expect, it } from 'vitest';
import registry from '../../../docs/references/2026/MINISTRY_DOCUMENTATION_REGISTRY_2026.json';
import legalEvidence from '../../../docs/references/2026/ministry-reconciliation/DECREE_2026_84_ADMINISTRATIVE_MAPPING_35.json';

describe('strict 2026 ministerial documentary certification gate', () => {
  const controls = registry.institutions.map(item => ({
    id: item.institution_id,
    control: item.certification_control_2026,
  }));

  it('covers 35 independent portfolio identities without claiming unproven fiscal allocations', () => {
    expect(controls).toHaveLength(35);
    expect(new Set(controls.map(x => x.id)).size).toBe(35);
    expect(legalEvidence.entries).toHaveLength(35);
    for (const { id, control } of controls) {
      expect(control, id).toBeDefined();
      expect(control?.legal_tutelle_evidence).toBe('DECREE_2026_84_ANNEX_VERIFIED');
      expect(control?.budget_portfolio_attribution)
        .toBe('NOT_ESTABLISHED_FROM_AVAILABLE_LFI_AND_DECREE');
      expect(control?.certified_public_budget).toBe(false);
      expect(control?.is_portfolio_appropriation_verified).toBe(false);
      expect(control?.outstanding_proofs)
        .toContain('OFFICIAL_2026_CP_PORTFOLIO_ALLOCATION_OR_POST_LFI_CREDIT_TRANSFER');
    }
  });

  it('distinguishes 12 canonical budgets from 23 additional section/action CP reconciliations', () => {
    const counts = controls.reduce((acc, { control }) => {
      const key = control!.numeric_verification_level;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(counts).toEqual({
      CANONICAL_PROGRAMMES_ACTIONS_BALANCED: 12,
      SECTION_PROGRAMMES_ACTIONS_BALANCED: 23,
    });
    expect(controls.filter(x => x.control?.numeric_verification_level
      === 'SECTION_PROGRAMMES_BALANCED_ACTION_EXCEPTION')).toHaveLength(0);
    expect(controls.filter(x => x.control?.annex4_action_gap_supplemented_by_lfi)
      .map(x => x.id)).toEqual(['gov-001', 'gov-028']);
  });

  it('does not count a shared or delegated section as an independently certified credit', () => {
    for (const id of ['gov-007', 'gov-009', 'gov-010', 'gov-023',
      'gov-024', 'gov-032', 'gov-034', 'gov-035']) {
      const entry = controls.find(x => x.id === id);
      expect(entry?.control?.outstanding_proofs)
        .toContain('COMPOSITE_OR_SHARED_SCOPE_INDEPENDENT_CP_PROOF');
      expect(entry?.control?.certified_public_budget).toBe(false);
    }
  });
});
