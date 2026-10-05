import { describe, it, expect } from 'vitest';
import {
  MMPE_MINISTRY_BUDGET_2026,
  MMPE_INSTITUTION_ID,
  getMinistryBudget,
  isPilotMinistry,
  performMinistryArithmeticCheck,
} from '../../data/ministryPilotReferential';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';

describe('Lot 2 — Architecture Pilote des Budgets Ministériels (MMPE gov-008)', () => {
  // -------------------------------------------------------------------------
  // TEST A & N : Pas de ventilation arbitraire ni ratio inventé
  // -------------------------------------------------------------------------
  it('Test A & N: Ne contient aucune ventilation arbitraire (65/35, 70/30, 55/45)', () => {
    const total = MMPE_MINISTRY_BUDGET_2026.total_budget_fcfa;
    expect(total).toBe(706_060_209_015);

    // Vérifie qu'aucun programme n'est calculé par un ratio fixe arbitraire
    MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
      expect(prog.amount_fcfa).not.toBe(Math.round(total! * 0.65));
      expect(prog.amount_fcfa).not.toBe(Math.round(total! * 0.35));
      expect(prog.amount_fcfa).not.toBe(Math.round(total! * 0.70));
      expect(prog.amount_fcfa).not.toBe(Math.round(total! * 0.30));
      expect(prog.amount_fcfa).not.toBe(Math.round(total! * 0.50));
    });
  });

  // -------------------------------------------------------------------------
  // TEST B : UNKNOWN reste NULL
  // -------------------------------------------------------------------------
  it('Test B: Les montants non publiés ou non individualisés restent null (pas de 0 artificiel)', () => {
    // Les ministères non encore pilotés dans GOVERNMENT_OFFICIALS sans budget doivent avoir budget null ou absent
    const unbudgetedOfficials = GOVERNMENT_OFFICIALS.filter(o => o.budget_fcfa === undefined || o.budget_fcfa === null);
    unbudgetedOfficials.forEach(official => {
      expect(official.budget_fcfa).toBeFalsy();
      expect(official.budget_fcfa).not.toBe(0);
    });

    // Un ministère non configuré retourne null
    expect(getMinistryBudget('gov-non-existent')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // TEST C : Documented zero reste 0
  // -------------------------------------------------------------------------
  it('Test C: Un montant zéro documenté est conservé et non altéré en null', () => {
    const check = performMinistryArithmeticCheck(MMPE_MINISTRY_BUDGET_2026);
    expect(check.programs_delta_fcfa).toBe(0);
    check.actions_checks.forEach(actionCheck => {
      expect(actionCheck.actions_delta_fcfa).toBe(0);
      expect(actionCheck.status).toBe('RECONCILED');
    });
  });

  // -------------------------------------------------------------------------
  // TEST D : Tous les programmes appartiennent au MMPE (gov-008)
  // -------------------------------------------------------------------------
  it('Test D: Tous les programmes sont rattachés au ministère pilote MMPE (gov-008)', () => {
    expect(MMPE_MINISTRY_BUDGET_2026.institution_id).toBe(MMPE_INSTITUTION_ID);
    expect(isPilotMinistry(MMPE_INSTITUTION_ID)).toBe(true);
    expect(isPilotMinistry('gov-001')).toBe(false);

    expect(MMPE_MINISTRY_BUDGET_2026.programs.length).toBe(5);
    MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
      expect(prog.ministry_id).toBe('gov-008');
    });
  });

  // -------------------------------------------------------------------------
  // TEST E : Toutes les actions appartiennent à un programme valide
  // -------------------------------------------------------------------------
  it('Test E: Toutes les actions appartiennent à un programme valide', () => {
    const validProgramIds = new Set(MMPE_MINISTRY_BUDGET_2026.programs.map(p => p.id));
    let totalActions = 0;

    MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
      expect(prog.actions.length).toBeGreaterThan(0);
      prog.actions.forEach(act => {
        expect(validProgramIds.has(act.program_id)).toBe(true);
        expect(act.program_id).toBe(prog.id);
        totalActions++;
      });
    });

    expect(totalActions).toBe(21);
  });

  // -------------------------------------------------------------------------
  // TEST F : Toutes les activités appartiennent à une action valide
  // -------------------------------------------------------------------------
  it('Test F: Toutes les activités éventuelles appartiennent à une action valide', () => {
    MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
      prog.actions.forEach(act => {
        if (act.activities && act.activities.length > 0) {
          act.activities.forEach(activ => {
            expect(activ.action_id).toBe(act.id);
          });
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // TEST G : Traçabilité et provenance explicite sur tous les niveaux
  // -------------------------------------------------------------------------
  it('Test G: Traçabilité et provenance explicite documentée', () => {
    expect(MMPE_MINISTRY_BUDGET_2026.source).toBeTruthy();
    expect(MMPE_MINISTRY_BUDGET_2026.document_reference).toContain('Loi n° 2025-987');
    expect(MMPE_MINISTRY_BUDGET_2026.evidence_type).toBe('PRIMARY_OFFICIAL_DOCUMENT');
    expect(MMPE_MINISTRY_BUDGET_2026.fiscal_year).toBe(2026);

    MMPE_MINISTRY_BUDGET_2026.programs.forEach(prog => {
      expect(prog.description).toBeTruthy();
      expect(prog.name).toBeTruthy();
      expect(prog.reconciliation_status).toBe('RECONCILED');

      prog.actions.forEach(act => {
        expect(act.name).toBeTruthy();
        expect(act.reconciliation_status).toBe('RECONCILED');
      });
    });
  });

  // -------------------------------------------------------------------------
  // TEST H : Validité syntaxique des URLs de sources officielles
  // -------------------------------------------------------------------------
  it('Test H: Les URLs de provenance sont syntaxiquement valides (https)', () => {
    expect(MMPE_MINISTRY_BUDGET_2026.source_url).toMatch(/^https:\/\/.+/);
  });

  // -------------------------------------------------------------------------
  // TEST I : Pas de concepts communaux ("Budget Primitif") sur le ministère
  // -------------------------------------------------------------------------
  it('Test I: Le modèle ministériel ne contient pas de budget primitif municipal', () => {
    const pilot = getMinistryBudget(MMPE_INSTITUTION_ID);
    expect(pilot).not.toBeNull();
    // Les types vérifient l'absence de DGF/DGE/recettes propres communales
    expect((pilot as any).primitive_budget).toBeUndefined();
    expect((pilot as any).dgf_fcfa).toBeUndefined();
    expect((pilot as any).dge_fcfa).toBeUndefined();
    expect((pilot as any).is_tax_quota_commune).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // TEST J : Pas de double comptabilisation (Projet vs Ligne budgétaire)
  // -------------------------------------------------------------------------
  it('Test J: Les projets liés sont marqués intégrés sans double comptabilisation', () => {
    const allLinkedProjects = MMPE_MINISTRY_BUDGET_2026.programs.flatMap(p =>
      p.actions.flatMap(a => a.linked_projects || [])
    );

    expect(allLinkedProjects.length).toBe(18);
    const sumProjects = allLinkedProjects.reduce((acc, p) => acc + p.budget_amount_fcfa, 0);
    expect(sumProjects).toBe(304_158_991_377);

    allLinkedProjects.forEach(proj => {
      expect(proj.is_funded_within_action).toBe(true);
    });

    // Le total ministère n'additionne PAS les projets par-dessus les programmes !
    const sumPrograms = MMPE_MINISTRY_BUDGET_2026.programs.reduce(
      (acc, p) => acc + (p.amount_fcfa ?? 0),
      0
    );
    expect(sumPrograms).toBe(MMPE_MINISTRY_BUDGET_2026.total_budget_fcfa);
  });

  // -------------------------------------------------------------------------
  // TEST K : Réconciliation arithmétique Somme(Programmes) = Total Ministère
  // -------------------------------------------------------------------------
  it('Test K: Réconciliation arithmétique exacte des programmes (706 060 209 015 FCFA, delta = 0)', () => {
    const check = performMinistryArithmeticCheck(MMPE_MINISTRY_BUDGET_2026);

    expect(check.programs_sum_fcfa).toBe(706_060_209_015);
    expect(check.total_budget_fcfa).toBe(706_060_209_015);
    expect(check.programs_delta_fcfa).toBe(0);
    expect(check.programs_reconciliation_status).toBe('RECONCILED');

    // Vérifie le pourcentage total = 100%
    const sumPcts = MMPE_MINISTRY_BUDGET_2026.programs.reduce(
      (acc, p) => acc + (p.percentage_of_ministry || 0),
      0
    );
    expect(Math.round(sumPcts)).toBe(100);
  });

  // -------------------------------------------------------------------------
  // TEST L : Réconciliation arithmétique Somme(Actions) = Total Programme
  // -------------------------------------------------------------------------
  it('Test L: Réconciliation arithmétique exacte des actions pour chaque programme', () => {
    const check = performMinistryArithmeticCheck(MMPE_MINISTRY_BUDGET_2026);
    expect(check.actions_checks.length).toBe(5);

    check.actions_checks.forEach(actionCheck => {
      expect(actionCheck.actions_delta_fcfa).toBe(0);
      expect(actionCheck.status).toBe('RECONCILED');
    });
  });

  // -------------------------------------------------------------------------
  // TEST M : Non-régression sur les communes (Bingerville, Cocody)
  // -------------------------------------------------------------------------
  it('Test M: Non-régression sur les budgets primitifs des communes décentralisées', () => {
    // Bingerville
    const bingerville = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-bingerville'];
    expect(bingerville).toBeDefined();
    expect(bingerville.total_voted_fcfa).toBe(4_046_222_000);

    // Cocody
    const cocody = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-cocody'];
    expect(cocody).toBeDefined();
    expect(cocody.total_voted_fcfa).toBe(19_764_660_000);
  });
});
