import type { BudgetProject } from '../types';
export let RAW_BUDGET_PROJECTS: BudgetProject[] = [];
let loading: Promise<void> | undefined;
export async function loadBudgetProjects(): Promise<void> {
  if (!loading) loading = (async () => {
    const manifestResponse = await fetch('/data/projects-manifest.json');
    if (!manifestResponse.ok) throw new Error('Catalogue indisponible. Réessayez.');
    const manifest = await manifestResponse.json();
    if (typeof manifest.url !== 'string' || !/^\/data\/projects-[0-9a-f]+\.json$/.test(manifest.url)) throw new Error('Index du catalogue invalide.');
    const response = await fetch(manifest.url);
    if (!response.ok) throw new Error('Chargement du catalogue impossible.');
    const projects = await response.json();
    if (!Array.isArray(projects) || projects.length !== manifest.count) throw new Error('Catalogue incomplet.');
    RAW_BUDGET_PROJECTS = projects;
  })().catch(error => { loading = undefined; throw error; });
  await loading;
}
