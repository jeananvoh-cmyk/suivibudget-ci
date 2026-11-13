import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import type { CaidpRequestEvent } from '../../services/dataStore';
import type { BudgetProject } from '../../types';
import {
  CAIDP_LEGAL_DEADLINE_DAYS,
  evaluateCaidpRequestDeadline,
  summarizeInstitutionCaidpDeadlines,
} from '../caidpDeadlines';
import { ProjectCard } from '../../components/ProjectCard';

describe('Lot P2 — CAIDP 30-Day Legal Countdown & Financial != Physical Card Guard', () => {
  const baseRequest: CaidpRequestEvent = {
    id: 'caidp-req-1',
    created_at: '2026-10-01T10:00:00Z',
    action_type: 'EMAIL_SENT',
    entity_type: 'MAIRIE',
    entity_name: 'Mairie de Dabou',
    has_ri: true,
    document_titles: ['Compte Administratif 2024'],
    document_categories: ['EXECUTION'],
    commune: 'Dabou',
  };

  it('tracks the 30-day CAIDP deadline accurately across all legal states', () => {
    expect(CAIDP_LEGAL_DEADLINE_DAYS).toBe(30);

    const active = evaluateCaidpRequestDeadline(baseRequest, {
      now: new Date('2026-10-11T15:00:00Z'),
    });
    expect(active.state).toBe('WITHIN_LEGAL_DELAY');
    expect(active.elapsedDays).toBe(10);
    expect(active.daysRemaining).toBe(20);
    expect(active.daysOverdue).toBe(0);
    expect(active.badgeLabel).toContain('20j restants');

    const dueToday = evaluateCaidpRequestDeadline(baseRequest, {
      now: new Date('2026-10-31T09:00:00Z'),
    });
    expect(dueToday.state).toBe('DUE_TODAY');
    expect(dueToday.daysRemaining).toBe(0);
    expect(dueToday.daysOverdue).toBe(0);

    const expired = evaluateCaidpRequestDeadline(baseRequest, {
      now: new Date('2026-11-12T12:00:00Z'),
    });
    expect(expired.state).toBe('LEGAL_DELAY_EXPIRED');
    expect(expired.daysOverdue).toBe(12);
    expect(expired.badgeLabel).toBe('Délai expiré (+12j)');
    expect(expired.citizenGuidance).toContain('caidp.ci');

    const published = evaluateCaidpRequestDeadline(baseRequest, {
      now: new Date('2026-11-12T12:00:00Z'),
      hasPublishedDocument: true,
    });
    expect(published.state).toBe('DOCUMENT_PUBLISHED');
    expect(published.daysOverdue).toBe(0);
  });

  it('summarizes CAIDP request deadlines per institution without mixing other collectivities', () => {
    const requests: CaidpRequestEvent[] = [
      baseRequest,
      {
        ...baseRequest,
        id: 'caidp-req-2',
        created_at: '2026-11-05T08:00:00Z',
        entity_name: 'Mairie de Dabou',
      },
      {
        ...baseRequest,
        id: 'caidp-req-other',
        entity_name: 'Mairie de Agboville',
        commune: 'Agboville',
      },
    ];

    const summary = summarizeInstitutionCaidpDeadlines(requests, 'Mairie de Dabou', {
      now: new Date('2026-11-10T12:00:00Z'),
    });
    expect(summary.totalRequests).toBe(2);
    expect(summary.overdueCount).toBe(1);
    expect(summary.activeWithinDelayCount).toBe(1);
    expect(summary.latestDeadline?.requestId).toBe('caidp-req-2');
    expect(summary.latestDeadline?.state).toBe('WITHIN_LEGAL_DELAY');
  });

  it('distinguishes declarative administrative progress from verified field realization on ProjectCard', () => {
    const declaredProject: BudgetProject = {
      id: 'proj-progress-unverified',
      title: 'Réhabilitation marché municipal test',
      commune_name: 'Dabou',
      region_name: 'Grands-Ponts',
      category: 'Commerce',
      nature_expense: 'Investissements',
      budget_amount_fcfa: 50_000_000,
      fiscal_year: 2026,
      current_status: 'IN_PROGRESS',
      progress_percentage: 85,
      created_at: '2026-01-15T00:00:00Z',
      scope_level: 'LOCAL',
    };

    const html = renderToStaticMarkup(
      <ProjectCard project={declaredProject} onSelect={() => {}} />
    );
    expect(html).toContain('Avancement déclaré (à vérifier)');
    expect(html).toContain('Non vérifié sur le terrain');
    expect(html).not.toContain('Taux officiel déclaré');
  });
});
