import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ADMINISTRATIVE_ACCOUNTS_DATA, refreshPublishedAdministrativeAccounts } from '../../data/administrativeAccountsData';
import { CA_PILOT_FIXTURES } from './caPilotFixtures';

const remoteCA = vi.hoisted(() => ({ configured: vi.fn(() => false), eq: vi.fn() }));
vi.mock('../../services/supabase', () => ({
  isSupabaseConfigured: remoteCA.configured,
  supabase: { from: () => ({ select: () => ({ eq: remoteCA.eq }) }) },
}));

beforeEach(() => {
  remoteCA.configured.mockReturnValue(false);
  ADMINISTRATIVE_ACCOUNTS_DATA.splice(0, Infinity, ...structuredClone(CA_PILOT_FIXTURES));
});

describe('CA publics — source distante uniquement', () => {
  it('ne conserve aucune donnée pilote hors connexion', async () => {
    await refreshPublishedAdministrativeAccounts();
    expect(ADMINISTRATIVE_ACCOUNTS_DATA).toEqual([]);
  });

  it('restreint la requête à PUBLISHED et retire les anciennes données si la lecture échoue', async () => {
    remoteCA.configured.mockReturnValue(true);
    remoteCA.eq.mockResolvedValueOnce({ data: [], error: null });
    await refreshPublishedAdministrativeAccounts();
    expect(remoteCA.eq).toHaveBeenCalledWith('status', 'PUBLISHED');
    expect(ADMINISTRATIVE_ACCOUNTS_DATA).toEqual([]);
    ADMINISTRATIVE_ACCOUNTS_DATA.push(...CA_PILOT_FIXTURES);
    remoteCA.eq.mockResolvedValueOnce({ data: null, error: new Error('Réseau indisponible') });
    await expect(refreshPublishedAdministrativeAccounts()).rejects.toThrow('Réseau indisponible');
    expect(ADMINISTRATIVE_ACCOUNTS_DATA).toEqual([]);
  });
});
import { 
  calculateExecutionRate, 
  getExecutionRateBadgeColor, 
  getExecutionStatusLabel 
} from '../budgetCalculations';
import { 
  getLatestAvailableCA, 
  hasCA, 
  getAdministrativeAccountsForInstitution,
  getAvailableCAYears 
} from '../../data/administrativeAccountsData';
import { 
  getGlossaryTerm, 
  searchGlossary, 
  BUDGET_GLOSSARY 
} from '../../data/budgetGlossary';
import { validateLocalBudget } from '../budgetValidation';
import { LocalBudget } from '../../types/localBudget';

describe('1. Moteur Dynamique des Calculs d\'Exécution Budgétaire', () => {
  it('calcule exactement 99,95% pour 9 995 000 FCFA réalisés sur 10 000 000 FCFA prévus', () => {
    const result = calculateExecutionRate(9995000, 10000000);
    expect(result.rate).toBe(99.95);
    expect(result.formatted).toBe('99,95 %');
    expect(result.status).toBe('NORMAL');
    expect(result.isOverBudget).toBe(false);
  });

  it('calcule dynamiquement 80% si le montant réalisé est modifié à 8 000 000 FCFA', () => {
    const result = calculateExecutionRate(8000000, 10000000);
    expect(result.rate).toBe(80);
    expect(result.formatted).toBe('80 %');
    expect(result.status).toBe('NORMAL');
    expect(result.isOverBudget).toBe(false);
  });

  it('protège rigoureusement contre la division par zéro lorsque le montant prévu est 0', () => {
    const zeroResult = calculateExecutionRate(0, 0);
    expect(zeroResult.rate).toBe(0);
    expect(zeroResult.status).toBe('ZERO_PLANNED');
    expect(Number.isFinite(zeroResult.rate)).toBe(true);
    expect(Number.isNaN(zeroResult.rate)).toBe(false);

    const nonBudgeted = calculateExecutionRate(5000000, 0);
    expect(nonBudgeted.status).toBe('OVER_EXECUTED');
    expect(nonBudgeted.isOverBudget).toBe(true);
    expect(nonBudgeted.formatted).toBe('Non budgétisé');
  });

  it('gère correctement une réalisation nulle (0 FCFA dépensé)', () => {
    const result = calculateExecutionRate(0, 50000000);
    expect(result.rate).toBe(0);
    expect(result.formatted).toBe('0,00 %');
    expect(result.status).toBe('ZERO_EXECUTED');
    expect(result.isOverBudget).toBe(false);
  });

  it('déclenche le statut OVER_EXECUTED si les dépenses réalisées dépassent les crédits votés', () => {
    const result = calculateExecutionRate(12000000, 10000000);
    expect(result.rate).toBe(120);
    expect(result.isOverBudget).toBe(true);
    expect(result.status).toBe('OVER_EXECUTED');
    expect(result.statusLabel).toContain('À vérifier : Réalisé supérieur');
  });

  it('fournit des badges et libellés adaptés aux seuils républicains', () => {
    expect(getExecutionStatusLabel('NORMAL')).toBe('Exécution conforme');
    expect(getExecutionStatusLabel('OVER_EXECUTED')).toContain('À vérifier');
    expect(getExecutionRateBadgeColor('NORMAL', 85)).toContain('emerald');
    expect(getExecutionRateBadgeColor('NORMAL', 60)).toContain('blue');
    expect(getExecutionRateBadgeColor('NORMAL', 30)).toContain('amber');
    expect(getExecutionRateBadgeColor('OVER_EXECUTED', 120)).toContain('purple');
  });
});

describe('2. Résolution Intelligente & Smart Fallback des Comptes Administratifs', () => {
  it('résout Tiassalé vers son dernier compte administratif disponible (Exercice 2024)', () => {
    const ca = getLatestAvailableCA('inst-com-tiassale');
    expect(ca).toBeDefined();
    expect(ca?.fiscal_year).toBe(2024);
    expect(ca?.institution_name).toBe('Mairie de Tiassalé');
    expect(ca?.total_planned).toBe(1007841000);
    expect(ca?.total_realized).toBe(1059255758);
    expect(ca?.arithmetic_difference).toBe(157080800);
    expect(ca?.reconciliation_status).toBe('SOURCE_ANOMALY');
  });

  it('retrouve également Tiassalé par son nom normalisé', () => {
    const ca = getLatestAvailableCA('Tiassalé');
    expect(ca).toBeDefined();
    expect(ca?.fiscal_year).toBe(2024);
  });

  it('confirme que Tiassalé possède hasCA === true et liste les années disponibles', () => {
    expect(hasCA('inst-com-tiassale')).toBe(true);
    const years = getAvailableCAYears('inst-com-tiassale');
    expect(years).toContain(2024);
  });

  it('retourne undefined pour une collectivité sans compte administratif publié', () => {
    expect(hasCA('inst-com-inconnue-xyz')).toBe(false);
    expect(getLatestAvailableCA('inst-com-inconnue-xyz')).toBeUndefined();
    expect(getAdministrativeAccountsForInstitution('inst-com-inconnue-xyz')).toEqual([]);
  });

  it('ne conserve que les rapprochements DGMP réellement documentés dans le pilote Tiassalé', () => {
    const ca = getLatestAvailableCA('inst-com-tiassale');
    expect(ca?.operations.length).toBe(3);
    const marche = ca?.operations.find(o => o.title.includes('vingt (20) magasins'));
    expect(marche?.procurement_match?.tender_number).toBe('AOO24062605757');
    const gardienkro = ca?.operations.find(o => o.title.includes('Gardienkro'));
    expect(gardienkro?.executed_amount).toBe(0);
    expect(gardienkro?.procurement_match?.award_amount).toBe(23725064);
  });


});

describe('3. Glossaire Citoyen des Finances Locales & Vulgarisation', () => {
  it('contient au moins 40 termes de vulgarisation citoyenne', () => {
    expect(BUDGET_GLOSSARY.length).toBeGreaterThanOrEqual(40);
  });

  it('recherche avec succès le terme "compte-administratif" avec sa mise en garde républicaine', () => {
    const term = getGlossaryTerm('compte-administratif');
    expect(term).toBeDefined();
    expect(term?.term).toBe('Compte administratif');
    expect(term?.category).toBe('EXECUTION');
    expect(term?.warning).toContain('Le compte administratif n\'est pas un budget primitif');
  });

  it('résout par les alias officiels (CA, BP, DGMP, AOO)', () => {
    const caAlias = getGlossaryTerm('CA');
    expect(caAlias?.id).toBe('compte-administratif');

    const bpAlias = getGlossaryTerm('BP');
    expect(bpAlias?.id).toBe('budget-primitif');

    const dgmpAlias = getGlossaryTerm('DGMP');
    expect(dgmpAlias?.id).toBe('dgmp');

    const aooAlias = getGlossaryTerm('AOO');
    expect(aooAlias?.id).toBe('aoo');
  });

  it('permet la recherche floue dans les explications citoyennes', () => {
    const results = searchGlossary('ordonnateur');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.term.toLowerCase().includes('ordonnateur'))).toBe(true);
  });
});

describe('4. Moteur de Cohérence Budgétaire & Cas Bingerville Multi-Versions', () => {
  it('valide un budget primitif cohérent sans lever d\'erreur bloquante', () => {
    const validBudget: LocalBudget = {
      id: 'test-budget-1',
      institution_id: 'inst-test',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie Test',
      fiscal_year: 2026,
      budget_type: 'PRIMITIF_ADOPTE',
      status: 'VERIFIED',
      is_current_version: true,
      version_number: 1,
      total_amount: 1000000000,
      operating_amount: 600000000,
      investment_amount: 400000000,
      operating_percentage: 60,
      investment_percentage: 40,
      amount_precision: 'EXACT',
      adoption_date: '2025-12-20',
      verification_status: 'AIP_VERIFIED',
      confidence_level: 'HIGH',
      sources: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    };

    const issues = validateLocalBudget(validBudget);
    const errors = issues.filter(i => i.severity === 'ERROR');
    expect(errors.length).toBe(0);
  });

  it('détecte une incohérence de somme (Fonctionnement + Investissement !== Total)', () => {
    const invalidBudget: LocalBudget = {
      id: 'test-budget-bad-sum',
      institution_id: 'inst-test',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie Test',
      fiscal_year: 2026,
      budget_type: 'PRIMITIF_ADOPTE',
      status: 'DRAFT',
      is_current_version: true,
      version_number: 1,
      total_amount: 1000000000,
      operating_amount: 700000000,
      investment_amount: 500000000, // 700M + 500M = 1.2Mrd !== 1.0Mrd
      operating_percentage: 70,
      investment_percentage: 50,
      amount_precision: 'EXACT',
      verification_status: 'SECONDARY_TO_CORROBORATE',
      confidence_level: 'LOW',
      sources: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    };

    const issues = validateLocalBudget(invalidBudget);
    const sumError = issues.find(i => i.code === 'WARN_SUM_MISMATCH');
    expect(sumError).toBeDefined();
    expect(sumError?.severity).toBe('REVIEW');
  });

  it('interdit un montant budgétaire négatif', () => {
    const negativeBudget: LocalBudget = {
      id: 'test-budget-neg',
      institution_id: 'inst-test',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie Test',
      fiscal_year: 2026,
      budget_type: 'PRIMITIF_ADOPTE',
      status: 'DRAFT',
      is_current_version: true,
      version_number: 1,
      total_amount: -5000000,
      operating_amount: 0,
      investment_amount: 0,
      operating_percentage: 0,
      investment_percentage: 0,
      amount_precision: 'EXACT',
      verification_status: 'SECONDARY_TO_CORROBORATE',
      confidence_level: 'LOW',
      sources: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    };

    const issues = validateLocalBudget(negativeBudget);
    expect(issues.some(i => i.code === 'ERR_TOTAL_NEGATIVE')).toBe(true);
  });
});
