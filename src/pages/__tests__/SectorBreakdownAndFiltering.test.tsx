import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomePage } from '../HomePage';
import { ProjectsPage } from '../ProjectsPage';
import { dataStore } from '../../services/dataStore';
import type { BudgetProject } from '../../types';

describe('VÉRIFICATION DU REPARTITION SECTORIELLE ET DU FILTRAGE DE NAVIGATION', () => {
  it('HomePage affiche des pourcentages réalistes et un libellé honnête (des investissements)', () => {
    const markup = renderToStaticMarkup(
      <HomePage
        searchQuery=""
        setSearchQuery={() => {}}
        onSelectProject={() => {}}
        onOpenSendProof={() => {}}
        onOpenShare={() => {}}
        onNavigateTab={() => {}}
        onNavigateToProjectsWithCategory={() => {}}
      />
    );

    // Vérifie le libellé citoyen exact
    expect(markup).toContain('des investissements');
    expect(markup).not.toContain('% du budget');

    // Vérifie que les secteurs majeurs et mineurs sont présents
    expect(markup).toContain('Infrastructures &amp; Voirie');
    expect(markup).toContain('Santé &amp; Hygiène');
    expect(markup).toContain('Éducation &amp; Formation');
  });

  it('ProjectsPage filtre correctement les projets selon la catégorie sélectionnée', () => {
    const mockProjects: BudgetProject[] = [
      {
        id: 'proj-sante-1',
        title: 'Construction dispensaire rural',
        commune_name: 'Divo',
        region_name: 'Lôh-Djiboua',
        category: 'Santé',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 50000000,
        fiscal_year: 2026,
        current_status: 'IN_PROGRESS',
        progress_percentage: 20,
        created_at: '2026-01-01',
      },
      {
        id: 'proj-infra-1',
        title: 'Bitumage voirie communale',
        commune_name: 'Bouaké',
        region_name: 'Gbêkê',
        category: 'Infrastructures & Voirie',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 120000000,
        fiscal_year: 2026,
        current_status: 'IN_PROGRESS',
        progress_percentage: 45,
        created_at: '2026-01-01',
      },
      {
        id: 'proj-nat-infra-2',
        title: 'Réhabilitation axe routier national',
        commune_name: 'Korhogo',
        region_name: 'Poro',
        category: 'INFRASTRUCTURE',
        scope_level: 'NATIONAL',
        nature_expense: 'Investissements',
        budget_amount_fcfa: 5000000000,
        fiscal_year: 2026,
        current_status: 'IN_PROGRESS',
        progress_percentage: 60,
        created_at: '2026-01-01',
      },
    ];

    const spy = vi.spyOn(dataStore, 'getProjects').mockReturnValue(mockProjects);

    try {
      // 1. Filtrage sur la Santé
      const santeMarkup = renderToStaticMarkup(
        <ProjectsPage
          searchQuery=""
          setSearchQuery={() => {}}
          onSelectProject={() => {}}
          onOpenSendProof={() => {}}
          onOpenShare={() => {}}
          selectedCategory="Santé"
        />
      );
      expect(santeMarkup).toContain('Construction dispensaire rural');
      expect(santeMarkup).not.toContain('Bitumage voirie communale');
      expect(santeMarkup).not.toContain('Réhabilitation axe routier national');

      // 2. Filtrage sur les Infrastructures (doit matcher à la fois local et national INFRASTRUCTURE)
      const infraMarkup = renderToStaticMarkup(
        <ProjectsPage
          searchQuery=""
          setSearchQuery={() => {}}
          onSelectProject={() => {}}
          onOpenSendProof={() => {}}
          onOpenShare={() => {}}
          selectedCategory="Infrastructures & Voirie"
        />
      );
      expect(infraMarkup).toContain('Bitumage voirie communale');
      expect(infraMarkup).toContain('Réhabilitation axe routier national');
      expect(infraMarkup).not.toContain('Construction dispensaire rural');
    } finally {
      spy.mockRestore();
    }
  });
});
