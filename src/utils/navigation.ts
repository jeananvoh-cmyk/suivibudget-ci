import { ActiveTab } from '../types';

export type AnnuaireSection = 'INDEX' | 'MINISTRIES' | 'INSTITUTIONS' | 'REGULATORS' | 'MUNICIPAL' | 'REGIONAL';

export interface RouteState {
  tab: ActiveTab;
  section: AnnuaireSection;
  projectId: string | null;
  needsCanonicalRedirect: boolean;
}

/**
 * Returns a clean, modern, path-based URL for any platform state.
 * E.g.
 * - home -> '/'
 * - projects -> '/projets' or '/projets?project=123'
 * - institutions -> '/institutions'
 * - institutions (MINISTRIES) -> '/institutions/ministeres'
 * - institutions (MUNICIPAL) -> '/institutions/mairies'
 * - observatory -> '/observatoire'
 * - admin -> '/admin'
 */
export function getCleanPath(
  tab: ActiveTab, 
  section: AnnuaireSection = 'INDEX', 
  projectId: string | null = null
): string {
  switch (tab) {
    case 'home':
      return '/';
    case 'projects':
      return projectId ? `/projets?project=${encodeURIComponent(projectId)}` : '/projets';
    case 'institutions':
      switch (section) {
        case 'MINISTRIES':
          return '/institutions/ministeres';
        case 'INSTITUTIONS':
          return '/institutions/grandes-institutions';
        case 'REGULATORS':
          return '/institutions/regulateurs';
        case 'MUNICIPAL':
          return '/institutions/mairies';
        case 'REGIONAL':
          return '/institutions/regions';
        case 'INDEX':
        default:
          return '/institutions';
      }
    case 'observatory':
      return '/observatoire';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}

/**
 * Parses current window.location (pathname + search query) into application state.
 * Handles both modern clean paths (/institutions, /projets) and legacy query params (?tab=institutions).
 */
export function parseRoute(pathname: string, search: string): RouteState {
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, '') || '/';
  const params = new URLSearchParams(search);
  const tabParam = params.get('tab');
  const viewParam = params.get('view');
  const projectParam = params.get('project');

  let tab: ActiveTab = 'home';
  let section: AnnuaireSection = 'INDEX';
  let projectId: string | null = projectParam || null;
  let needsCanonicalRedirect = false;

  // 1. Modern clean path matching
  if (normalizedPath === '/projets' || normalizedPath === '/projects') {
    tab = 'projects';
  } else if (normalizedPath.startsWith('/institutions') || normalizedPath.startsWith('/budgets')) {
    tab = 'institutions';
    if (normalizedPath.includes('/ministeres') || normalizedPath.includes('/gouvernement') || viewParam === 'ministeres') {
      section = 'MINISTRIES';
    } else if (normalizedPath.includes('/grandes-institutions') || viewParam === 'grandes-institutions' || viewParam === 'institutions') {
      section = 'INSTITUTIONS';
    } else if (normalizedPath.includes('/regulateurs') || normalizedPath.includes('/autorites') || viewParam === 'regulateurs') {
      section = 'REGULATORS';
    } else if (normalizedPath.includes('/mairies') || normalizedPath.includes('/communes') || viewParam === 'mairies' || viewParam === 'communes') {
      section = 'MUNICIPAL';
    } else if (normalizedPath.includes('/regions') || normalizedPath.includes('/districts') || viewParam === 'regions' || viewParam === 'districts') {
      section = 'REGIONAL';
    } else {
      section = 'INDEX';
    }
  } else if (normalizedPath === '/observatoire' || normalizedPath === '/observatory') {
    tab = 'observatory';
  } else if (normalizedPath === '/admin') {
    tab = 'admin';
  } else if (normalizedPath === '/' || normalizedPath === '/accueil' || normalizedPath === '/home') {
    tab = 'home';
  }

  // 2. Backward compatibility: if URL used ?tab=, mark for canonical rewrite
  if (tabParam) {
    needsCanonicalRedirect = true;
    if (tabParam === 'projects') tab = 'projects';
    else if (tabParam === 'institutions') {
      tab = 'institutions';
      if (viewParam === 'ministeres') section = 'MINISTRIES';
      else if (viewParam === 'grandes-institutions' || viewParam === 'institutions') section = 'INSTITUTIONS';
      else if (viewParam === 'regulateurs') section = 'REGULATORS';
      else if (viewParam === 'mairies' || viewParam === 'communes') section = 'MUNICIPAL';
      else if (viewParam === 'regions' || viewParam === 'districts') section = 'REGIONAL';
    } else if (tabParam === 'observatory') {
      tab = 'observatory';
    } else if (tabParam === 'admin') {
      tab = 'admin';
    } else if (tabParam === 'home') {
      tab = 'home';
    }
  }

  if (projectParam) {
    tab = 'projects';
    projectId = projectParam;
  }

  // Also if someone entered alias paths like /accueil or /projects (English), redirect to canonical
  if (['/accueil', '/home', '/projects', '/observatory', '/budgets'].includes(normalizedPath)) {
    needsCanonicalRedirect = true;
  }

  return { tab, section, projectId, needsCanonicalRedirect };
}
