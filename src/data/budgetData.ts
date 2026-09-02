import { BudgetProject } from '../types';
import officialNationalProjects2026 from './officialNationalProjects2026.json';
import { OFFICIAL_CSV_PROJECTS } from './officialProjectsFromCsv';

export const NATIONAL_BUDGET_PROJECTS: BudgetProject[] = (officialNationalProjects2026 as unknown as BudgetProject[]).map(p => ({
  ...p,
  scope_level: 'NATIONAL' as const,
}));

export const LOCAL_BUDGET_PROJECTS: BudgetProject[] = OFFICIAL_CSV_PROJECTS.map(p => ({
  ...p,
  scope_level: 'LOCAL' as const,
}));

export const RAW_BUDGET_PROJECTS: BudgetProject[] = [
  ...LOCAL_BUDGET_PROJECTS,
  ...NATIONAL_BUDGET_PROJECTS,
];
