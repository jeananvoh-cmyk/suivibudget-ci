import { describe, it, expect } from 'vitest';
import { getProjectsForInstitution, normalizeCommuneName, normalizeRegionName, normalizeMinistryName } from '../institutionProjects';
import { BudgetProject, Institution } from '../../types';
import { RAW_BUDGET_PROJECTS } from '../../data/budgetData';
import { ALL_COMMUNES_DATA, ALL_REGIONS_DATA, ALL_MINISTRIES_DATA } from '../../data/institutionsData';

describe('institutionProjects - Anti-Contamination Verification', () => {
  const allProjects = RAW_BUDGET_PROJECTS;

  it('correctly normalizes entity names', () => {
    expect(normalizeCommuneName('Mairie de Adjamé')).toBe('ADJAME');
    expect(normalizeCommuneName('Mairie d\'Anyama')).toBe('ANYAMA');
    expect(normalizeCommuneName('Commune de Bouaké')).toBe('BOUAKE');
    expect(normalizeRegionName('Conseil Régional de San Pedro')).toBe('SAN PEDRO');
    expect(normalizeRegionName('Conseil Régional du Gbêkê')).toBe('GBEKE');
    expect(normalizeMinistryName('Ministère de la Santé, de l\'Hygiène Publique et de la Couverture Maladie Universelle')).toBe('SANTE DE L HYGIENE PUBLIQUE ET DE LA COUVERTURE MALADIE UNIVERSELLE');
  });

  it('guarantees Mairie de Adjamé has 0 projects and no contamination from Anyama or San Pedro', () => {
    const adjame = ALL_COMMUNES_DATA.find(c => c.name.toLowerCase().includes('adjamé'));
    expect(adjame).toBeDefined();

    const projects = getProjectsForInstitution(adjame!, allProjects);
    expect(projects.length).toBe(0);

    // Explicitly verify Anyama school and San Pedro road are NOT present
    expect(projects.some(p => p.id === 'proj-com-719')).toBe(false);
    expect(projects.some(p => p.id === 'proj-reg-1265')).toBe(false);
  });

  it('guarantees Mairie d\'Anyama has its own projects including proj-com-719', () => {
    const anyama = ALL_COMMUNES_DATA.find(c => c.name.toLowerCase().includes('anyama'));
    expect(anyama).toBeDefined();

    const projects = getProjectsForInstitution(anyama!, allProjects);
    expect(projects.length).toBeGreaterThan(0);
    expect(projects.some(p => p.id === 'proj-com-719')).toBe(true);

    // Verify all projects belong strictly to Anyama
    projects.forEach(p => {
      expect(normalizeCommuneName(p.commune_name)).toBe('ANYAMA');
      expect(p.id.startsWith('proj-reg-')).toBe(false);
      expect(p.scope_level).not.toBe('NATIONAL');
    });
  });

  it('guarantees Conseil Régional de San Pedro has its own regional projects including proj-reg-1265 with 0 municipal leaks', () => {
    const sanPedroReg = ALL_REGIONS_DATA.find(r => r.name.toLowerCase().includes('san pedro') && r.type === 'REGION');
    expect(sanPedroReg).toBeDefined();

    const projects = getProjectsForInstitution(sanPedroReg!, allProjects);
    expect(projects.length).toBe(33);
    expect(projects.some(p => p.id === 'proj-reg-1265')).toBe(true);

    // Verify all projects are strictly regional and none are municipal
    projects.forEach(p => {
      expect(p.id.startsWith('proj-reg-')).toBe(true);
      expect(p.id.startsWith('proj-com-')).toBe(false);
      expect(p.id.startsWith('proj-bouake-')).toBe(false);
    });
  });

  it('guarantees Mairie de Bouaké includes both its strategic and CSV municipal projects without regional leaks', () => {
    const bouake = ALL_COMMUNES_DATA.find(c => c.id === 'inst-com-bouake');
    expect(bouake).toBeDefined();

    const projects = getProjectsForInstitution(bouake!, allProjects);
    expect(projects.length).toBe(48); // 42 CSV + 6 strategic
    expect(projects.some(p => p.id === 'proj-bouake-maby-marche')).toBe(true);

    projects.forEach(p => {
      expect(p.id.startsWith('proj-reg-')).toBe(false);
      expect(p.scope_level).not.toBe('NATIONAL');
    });
  });

  it('verifies that all 201 communes have ZERO cross-contamination across the country', () => {
    let contaminatedCount = 0;

    ALL_COMMUNES_DATA.forEach(c => {
      const pList = getProjectsForInstitution(c, allProjects);
      const targetNorm = normalizeCommuneName(c.name);

      const hasRegional = pList.some(p => p.id.startsWith('proj-reg-'));
      const hasNational = pList.some(p => p.scope_level === 'NATIONAL');
      const hasForeignCommune = pList.some(p => normalizeCommuneName(p.commune_name) !== targetNorm);

      if (hasRegional || hasNational || hasForeignCommune) {
        contaminatedCount++;
      }
    });

    expect(contaminatedCount).toBe(0);
  });

  it('verifies that all 31 regions have ZERO municipal projects leaking into regional sheets', () => {
    let contaminatedCount = 0;

    ALL_REGIONS_DATA.filter(r => r.type === 'REGION').forEach(r => {
      const pList = getProjectsForInstitution(r, allProjects);

      const hasMunicipal = pList.some(p => p.id.startsWith('proj-com-') || p.id.startsWith('proj-bouake-'));
      const hasNational = pList.some(p => p.scope_level === 'NATIONAL');

      if (hasMunicipal || hasNational) {
        contaminatedCount++;
      }
    });

    expect(contaminatedCount).toBe(0);
  });

  it('verifies ministries match only national projects and never municipal or regional projects', () => {
    ALL_MINISTRIES_DATA.forEach(m => {
      const pList = getProjectsForInstitution(m, allProjects);

      const hasMunicipal = pList.some(p => p.id.startsWith('proj-com-') || p.id.startsWith('proj-bouake-'));
      const hasRegional = pList.some(p => p.id.startsWith('proj-reg-'));

      expect(hasMunicipal).toBe(false);
      expect(hasRegional).toBe(false);
    });
  });
});
