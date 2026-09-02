import { describe, it, expect } from 'vitest';
import { getCleanPath, parseRoute } from '../navigation';

describe('Clean Path Routing Engine (BudgIT-Style Clean URLs)', () => {
  describe('getCleanPath', () => {
    it('generates clean path for home without query params', () => {
      expect(getCleanPath('home')).toBe('/');
    });

    it('generates clean path for projects list and single project', () => {
      expect(getCleanPath('projects')).toBe('/projets');
      expect(getCleanPath('projects', 'INDEX', 'proj-123')).toBe('/projets?project=proj-123');
    });

    it('generates clean path for all institutions sections', () => {
      expect(getCleanPath('institutions', 'INDEX')).toBe('/institutions');
      expect(getCleanPath('institutions', 'MINISTRIES')).toBe('/institutions/ministeres');
      expect(getCleanPath('institutions', 'INSTITUTIONS')).toBe('/institutions/grandes-institutions');
      expect(getCleanPath('institutions', 'REGULATORS')).toBe('/institutions/regulateurs');
      expect(getCleanPath('institutions', 'MUNICIPAL')).toBe('/institutions/mairies');
      expect(getCleanPath('institutions', 'REGIONAL')).toBe('/institutions/regions');
    });

    it('generates clean path for observatory and admin', () => {
      expect(getCleanPath('observatory')).toBe('/observatoire');
      expect(getCleanPath('admin')).toBe('/admin');
    });
  });

  describe('parseRoute', () => {
    it('correctly parses clean modern paths', () => {
      expect(parseRoute('/', '')).toEqual({
        tab: 'home',
        section: 'INDEX',
        projectId: null,
        needsCanonicalRedirect: false,
      });

      expect(parseRoute('/projets', '')).toEqual({
        tab: 'projects',
        section: 'INDEX',
        projectId: null,
        needsCanonicalRedirect: false,
      });

      expect(parseRoute('/projets', '?project=proj-456')).toEqual({
        tab: 'projects',
        section: 'INDEX',
        projectId: 'proj-456',
        needsCanonicalRedirect: false,
      });

      expect(parseRoute('/institutions', '')).toEqual({
        tab: 'institutions',
        section: 'INDEX',
        projectId: null,
        needsCanonicalRedirect: false,
      });

      expect(parseRoute('/institutions/ministeres', '')).toEqual({
        tab: 'institutions',
        section: 'MINISTRIES',
        projectId: null,
        needsCanonicalRedirect: false,
      });

      expect(parseRoute('/institutions/mairies', '')).toEqual({
        tab: 'institutions',
        section: 'MUNICIPAL',
        projectId: null,
        needsCanonicalRedirect: false,
      });

      expect(parseRoute('/observatoire', '')).toEqual({
        tab: 'observatory',
        section: 'INDEX',
        projectId: null,
        needsCanonicalRedirect: false,
      });

      expect(parseRoute('/admin', '')).toEqual({
        tab: 'admin',
        section: 'INDEX',
        projectId: null,
        needsCanonicalRedirect: false,
      });
    });

    it('parses legacy ?tab= query params and flags them for canonical rewrite', () => {
      const legacyHome = parseRoute('/', '?tab=home');
      expect(legacyHome.tab).toBe('home');
      expect(legacyHome.needsCanonicalRedirect).toBe(true);

      const legacyInstitutions = parseRoute('/', '?tab=institutions&view=ministeres');
      expect(legacyInstitutions.tab).toBe('institutions');
      expect(legacyInstitutions.section).toBe('MINISTRIES');
      expect(legacyInstitutions.needsCanonicalRedirect).toBe(true);

      const legacyProjects = parseRoute('/', '?tab=projects&project=proj-999');
      expect(legacyProjects.tab).toBe('projects');
      expect(legacyProjects.projectId).toBe('proj-999');
      expect(legacyProjects.needsCanonicalRedirect).toBe(true);
    });

    it('handles alias paths and redirects them to canonical', () => {
      expect(parseRoute('/projects', '').tab).toBe('projects');
      expect(parseRoute('/projects', '').needsCanonicalRedirect).toBe(true);

      expect(parseRoute('/observatory', '').tab).toBe('observatory');
      expect(parseRoute('/observatory', '').needsCanonicalRedirect).toBe(true);
    });
  });
});
