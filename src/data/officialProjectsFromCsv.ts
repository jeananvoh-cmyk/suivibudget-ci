import { BudgetProject } from '../types';
import rawProjects from './officialProjectsFromCsv.json';

export const OFFICIAL_CSV_PROJECTS: BudgetProject[] = rawProjects as unknown as BudgetProject[];
