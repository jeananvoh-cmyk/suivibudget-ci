import { describe, it, expect } from 'vitest';
import {
  normalizeCategoryToken,
  normalizeSectorCategory,
  computeSectorBreakdown,
  PUBLIC_SECTOR_DEFINITIONS,
  LFI_2026_OFFICIAL_MACRO,
} from '../publicIndicators';
import { dataStore } from '../../services/dataStore';
import { RAW_BUDGET_PROJECTS } from '../../data/budgetData';
import officialNationalProjects2026 from '../../data/officialNationalProjects2026.json';
import { OFFICIAL_CSV_PROJECTS } from '../../data/officialProjectsFromCsv';
import { GOVERNMENT_OFFICIALS } from '../../data/governmentData';
import { NATIONAL_INSTITUTIONS_SECTIONS, MINISTRIES_SECTIONS } from '../institutionBudgetHelper';
import type { BudgetProject } from '../../types';

describe('Milestone 4 — Sector Normalization, Fiscal Year Separation & Aggregates Integrity', () => {
  describe('1. normalizeCategoryToken & Diacritics/Case Insensitivity', () => {
    it('normalizes accents, uppercase, punctuation and whitespace deterministically', () => {
      expect(normalizeCategoryToken('Éducation')).toBe('education');
      expect(normalizeCategoryToken('EDUCATION')).toBe('education');
      expect(normalizeCategoryToken('Santé')).toBe('sante');
      expect(normalizeCategoryToken('SANTE')).toBe('sante');
      expect(normalizeCategoryToken('Administration & Économie')).toBe('administration economie');
      expect(normalizeCategoryToken('Infrastructures & Voirie')).toBe('infrastructures voirie');
      expect(normalizeCategoryToken('Énergie & Éclairage')).toBe('energie eclairage');
      expect(normalizeCategoryToken(null)).toBe('');
      expect(normalizeCategoryToken(undefined)).toBe('');
    });

    it('maps both ASCII uppercase national categories and accented local categories to the same sector ID', () => {
      expect(normalizeSectorCategory('EDUCATION')).toBe('EDUCATION');
      expect(normalizeSectorCategory('Éducation')).toBe('EDUCATION');
      expect(normalizeSectorCategory('SANTE')).toBe('HEALTH');
      expect(normalizeSectorCategory('Santé')).toBe('HEALTH');
      expect(normalizeSectorCategory('INFRASTRUCTURE')).toBe('INFRASTRUCTURE');
      expect(normalizeSectorCategory('Infrastructures & Voirie')).toBe('INFRASTRUCTURE');
      expect(normalizeSectorCategory('EAU_POTABLE')).toBe('WATER');
      expect(normalizeSectorCategory('Eau potable')).toBe('WATER');
      expect(normalizeSectorCategory('COMMERCE')).toBe('ECONOMY_AGRI');
      expect(normalizeSectorCategory('Commerce & Économie')).toBe('ECONOMY_AGRI');
      expect(normalizeSectorCategory('LOGEMENT')).toBe('HOUSING');
      expect(normalizeSectorCategory('Logement & Urbanisme')).toBe('HOUSING');
      expect(normalizeSectorCategory('ADMINISTRATION')).toBe('ADMINISTRATION');
      expect(normalizeSectorCategory('Administration & Services')).toBe('ADMINISTRATION');
      expect(normalizeSectorCategory('SECURITE')).toBe('OTHER');
      expect(normalizeSectorCategory('JEUNESSE_CULTURE')).toBe('OTHER');
    });

    it('includes all national projects in computeSectorBreakdown and demonstrates accent-insensitivity', () => {
      const allProjects = dataStore.getProjects();
      const breakdown2026 = computeSectorBreakdown(allProjects, { fiscalYear: 2026 });

      const eduSector = breakdown2026.sectors.find(s => s.id === 'EDUCATION')!;
      const healthSector = breakdown2026.sectors.find(s => s.id === 'HEALTH')!;

      // National projects in Education and Health must not be 0 (prior to fix, un-normalized includes('éducation') gave 0)
      expect(eduSector.stateCount).toBe(32);
      expect(eduSector.stateAmountFcfa).toBe(98_529_100_050);
      expect(eduSector.localCount).toBe(1025);
      expect(eduSector.count).toBe(1057);

      expect(healthSector.stateCount).toBe(8);
      expect(healthSector.stateAmountFcfa).toBe(19_831_286_464);
      expect(healthSector.localCount).toBe(356);
      expect(healthSector.count).toBe(364);

      // Demonstrate that the historical accent-sensitive filter missed all national projects:
      const brokenEduMatches = allProjects.filter(p => p.category.toLowerCase().includes('éducation'));
      const brokenEduStateMatches = brokenEduMatches.filter(p => p.scope_level === 'NATIONAL' || p.project_tier === 'STATE');
      expect(brokenEduStateMatches).toHaveLength(0); // 0 national projects found with un-normalized search!

      const brokenHealthMatches = allProjects.filter(p => p.category.toLowerCase().includes('santé'));
      const brokenHealthStateMatches = brokenHealthMatches.filter(p => p.scope_level === 'NATIONAL' || p.project_tier === 'STATE');
      expect(brokenHealthStateMatches).toHaveLength(0); // 0 national projects found with un-normalized search!

      // With normalizeSectorCategory, all national projects with ASCII categories are captured:
      const fixedEduStateMatches = allProjects.filter(p =>
        (p.scope_level === 'NATIONAL' || p.project_tier === 'STATE') &&
        normalizeSectorCategory(p.category) === 'EDUCATION'
      );
      expect(fixedEduStateMatches).toHaveLength(32);

      const fixedHealthStateMatches = allProjects.filter(p =>
        (p.scope_level === 'NATIONAL' || p.project_tier === 'STATE') &&
        normalizeSectorCategory(p.category) === 'HEALTH'
      );
      expect(fixedHealthStateMatches).toHaveLength(8);
    });

    it('strictly does not clamp small or zero sector percentages to Math.max(2, ...)', () => {
      // Create a test pool with an tiny sector
      const tinyProject: BudgetProject = {
        id: 'test-tiny-1',
        title: 'Forage test',
        commune_name: 'Testville',
        region_name: 'TestRegion',
        category: 'Eau potable',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 10_000,
        fiscal_year: 2026,
        current_status: 'IN_PROGRESS',
        progress_percentage: 10,
        created_at: '2026-01-01',
        scope_level: 'LOCAL',
      };
      const largeProject: BudgetProject = {
        id: 'test-large-1',
        title: 'Autoroute test',
        commune_name: 'Testville',
        region_name: 'TestRegion',
        category: 'INFRASTRUCTURE',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 100_000_000_000,
        fiscal_year: 2026,
        current_status: 'IN_PROGRESS',
        progress_percentage: 50,
        created_at: '2026-01-01',
        scope_level: 'NATIONAL',
      };

      const result = computeSectorBreakdown([tinyProject, largeProject], { fiscalYear: 2026 });
      const waterSector = result.sectors.find(s => s.id === 'WATER')!;
      const infraSector = result.sectors.find(s => s.id === 'INFRASTRUCTURE')!;
      const healthSector = result.sectors.find(s => s.id === 'HEALTH')!;

      // Tiny sector percentage must NOT be clamped to 2%
      expect(waterSector.pct).toBe(0); // 10,000 / 100,000,010,000 * 100 ~ 0.00001% rounded to 1 decimal = 0%
      expect(waterSector.exactPct).toBeLessThan(0.01);
      expect(waterSector.pct).not.toBe(2);

      // Unrepresented sector must be 0%, not 2%
      expect(healthSector.amountFcfa).toBe(0);
      expect(healthSector.pct).toBe(0);

      // Large sector must be 100%
      expect(infraSector.pct).toBe(100);
    });

    it('accounts for 100% of the allocated 2026 tangible envelope across the 8 sectors', () => {
      const allProjects = dataStore.getProjects();
      const breakdown2026 = computeSectorBreakdown(allProjects, { fiscalYear: 2026 });

      expect(breakdown2026.sectors).toHaveLength(8);
      const sumSectorsAmount = breakdown2026.sectors.reduce((sum, s) => sum + s.amountFcfa, 0);
      expect(sumSectorsAmount).toBe(breakdown2026.totalAmountFcfa);
      expect(breakdown2026.totalAmountFcfa).toBe(1_227_869_184_570);
      expect(breakdown2026.totalProjects).toBe(3278);
      expect(breakdown2026.unmappedCategoryProjectsCount).toBe(0);
      expect(breakdown2026.isExhaustiveCoverage).toBe(true);
    });
  });

  describe('2. Fiscal Year Separation & Isolation of Séguéla-Touba 2021', () => {
    it('isolates proj-infra-seguela-touba-104mrd from fiscal_year 2026 totals', () => {
      const allProjects = dataStore.getProjects();
      const seguelaProject = allProjects.find(p => p.id === 'proj-infra-seguela-touba-104mrd');

      expect(seguelaProject).toBeDefined();
      expect(seguelaProject?.fiscal_year).toBe(2021);
      expect(seguelaProject?.budget_amount_fcfa).toBe(104_700_000_000);
      expect(seguelaProject?.data_provenance).toBe('STATE_MULTIYEAR_PRE_2026');
      expect(seguelaProject?.financial_verification_status).toBe('TO_VERIFY');

      // 2026 strict pool
      const projects2026 = allProjects.filter(p => (p.fiscal_year ?? 2026) === 2026);
      expect(projects2026).toHaveLength(3278);
      expect(projects2026.some(p => p.id === 'proj-infra-seguela-touba-104mrd')).toBe(false);

      const total2026 = projects2026.reduce((sum, p) => sum + (p.budget_amount_fcfa ?? 0), 0);
      expect(total2026).toBe(1_227_869_184_570);

      // All years pool (includes 2021)
      expect(allProjects).toHaveLength(3279);
      const totalAll = allProjects.reduce((sum, p) => sum + (p.budget_amount_fcfa ?? 0), 0);
      expect(totalAll).toBe(1_332_569_184_570);
      expect(totalAll - total2026).toBe(104_700_000_000);
    });
  });

  describe('3. Bouaké Municipal Portal Projects Qualification', () => {
    it('qualifies all 6 proj-bouake-* projects as LOCAL_PORTAL_BOUAKE and TO_VERIFY', () => {
      const bouakeProjects = RAW_BUDGET_PROJECTS.filter(p => p.id.startsWith('proj-bouake-'));
      expect(bouakeProjects).toHaveLength(6);

      for (const p of bouakeProjects) {
        expect(p.financial_verification_status).toBe('TO_VERIFY');
        expect(p.data_provenance).toBe('LOCAL_PORTAL_BOUAKE');
        expect(p.source).toContain('source secondaire municipale');
        expect(p.source_document_id).toBeUndefined();
      }
    });
  });

  describe('4. Territorial Integrity & Autonomous Districts', () => {
    it('enforces 232 collectivités territoriales (201 communes + 31 régions) and 2 autonomous districts', () => {
      const institutions = dataStore.getInstitutions();
      const communes = institutions.filter(i => i.type === 'MAIRIE');
      const regions = institutions.filter(i => i.type === 'REGION');
      const districts = institutions.filter(i => i.type === 'DISTRICT');

      expect(communes).toHaveLength(201);
      expect(regions).toHaveLength(31);
      expect(communes.length + regions.length).toBe(232);
      expect(districts).toHaveLength(2);

      const districtIds = districts.map(d => d.id).sort();
      expect(districtIds).toEqual([
        'inst-reg-district-autonome-d-abidjan',
        'inst-reg-district-autonome-de-yamoussoukro',
      ]);
    });
  });

  describe('5. Deduplication of Ministries & Autonomous Institutions', () => {
    it('treats Section 229 (333,88 Mds) as a shared section between gov-009 and gov-035 without double counting', () => {
      // gov-035 must have SHARED_SECTION status and not be separately allocated in MINISTRIES_SECTIONS
      expect(MINISTRIES_SECTIONS['gov-035']).toBeUndefined();
      expect(MINISTRIES_SECTIONS['gov-009']).toBeDefined();
      expect(MINISTRIES_SECTIONS['gov-009'].section_code).toBe('229');
      expect(MINISTRIES_SECTIONS['gov-009'].lfi_amount_fcfa).toBe(333_878_089_526);
    });

    it('treats Section 103 (193,63 Mds) as containing IGE and HABG internal programs without additive counting', () => {
      expect(NATIONAL_INSTITUTIONS_SECTIONS['inst-ige']).toMatchObject({
        section_code: '103',
        program_code: '13003',
        lfi_amount_fcfa: 9_872_577_575,
      });
      expect(NATIONAL_INSTITUTIONS_SECTIONS['inst-habg']).toMatchObject({
        section_code: '103',
        program_code: '13004',
        lfi_amount_fcfa: 5_552_174_916,
      });

      // Both programs are sub-programs of Section 103 Présidence (193 633 705 615 FCFA)
      const presidenceSection = NATIONAL_INSTITUTIONS_SECTIONS['inst-presidence'];
      expect(presidenceSection.lfi_amount_fcfa).toBe(193_633_705_615);
      expect(presidenceSection.section_code).toBe('103');
    });

    it('documents the distinction between Section 322 (8 699,98 Mds) and ministerial programmes for gov-007', () => {
      expect(MINISTRIES_SECTIONS['gov-007']).toMatchObject({
        section_code: '322',
        lfi_amount_fcfa: 8_699_982_915_992,
      });
    });
  });
});
