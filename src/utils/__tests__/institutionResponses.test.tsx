import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, it, expect } from 'vitest';
import {
  validateInstitutionResponseDraft,
  transitionResponseStatus,
} from '../../services/institutionResponseService';
import { AdministrativeAccountView } from '../../components/AdministrativeAccountView';
import { ADMINISTRATIVE_ACCOUNTS_DATA } from '../../data/administrativeAccountsData';
import { AdministrativeAccount } from '../../types/administrativeAccount';
import { Institution } from '../../types';

describe('InstitutionResponse moderated workflow & Principle 8 display', () => {
  const pushedAccountIds: string[] = [];

  afterEach(() => {
    while (pushedAccountIds.length > 0) {
      const id = pushedAccountIds.pop();
      const idx = ADMINISTRATIVE_ACCOUNTS_DATA.findIndex((ca) => ca.id === id);
      if (idx !== -1) {
        ADMINISTRATIVE_ACCOUNTS_DATA.splice(idx, 1);
      }
    }
  });

  it('validates draft fields and rejects unsafe document URLs or malformed dates', () => {
    const invalid = validateInstitutionResponseDraft({
      ca_id: '',
      response_text: 'Trop court',
      response_date: '13/11/2026',
      author_name: 'A',
      author_title: '',
      supporting_document_url: 'javascript:alert(1)',
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThanOrEqual(5);

    const valid = validateInstitutionResponseDraft({
      ca_id: 'ca-test-mod-2024',
      response_text:
        'La collectivité précise que le marché cité fait l’objet d’un avenant technique publié au BOMP.',
      response_date: '2026-11-13',
      author_name: 'Kouassi Yao',
      author_title: 'Secrétaire Général',
      supporting_document_url: 'https://commune-exemple.ci/avis-avenant.pdf',
    });

    expect(valid.valid).toBe(true);
    expect(valid.errors).toHaveLength(0);
  });

  it('enforces moderated transitions PENDING -> VALIDATED -> PUBLISHED and rejects non-staff or direct bypass', () => {
    const citizenAttempt = transitionResponseStatus('PENDING', 'VALIDATED', 'CITIZEN');
    expect(citizenAttempt.allowed).toBe(false);
    expect(citizenAttempt.nextStatus).toBe('PENDING');

    const unauthAttempt = transitionResponseStatus('VALIDATED', 'PUBLISHED', null);
    expect(unauthAttempt.allowed).toBe(false);

    const directBypass = transitionResponseStatus('PENDING', 'PUBLISHED', 'ADMIN');
    expect(directBypass.allowed).toBe(false);
    expect(directBypass.nextStatus).toBe('PENDING');
    expect(directBypass.reason).toContain('validation préalable');

    const validateOk = transitionResponseStatus('PENDING', 'VALIDATED', 'MODERATOR');
    expect(validateOk.allowed).toBe(true);
    expect(validateOk.nextStatus).toBe('VALIDATED');

    const publishOk = transitionResponseStatus('VALIDATED', 'PUBLISHED', 'ADMIN');
    expect(publishOk.allowed).toBe(true);
    expect(publishOk.nextStatus).toBe('PUBLISHED');

    const rollbackOk = transitionResponseStatus('PUBLISHED', 'PENDING', 'DATA_MANAGER');
    expect(rollbackOk.allowed).toBe(true);
    expect(rollbackOk.nextStatus).toBe('PENDING');
  });

  it('renders only PUBLISHED institutional responses with Principle 8 disclaimer in AdministrativeAccountView', () => {
    const testInstId = 'inst-test-p4-moderation';
    const testCaId = 'ca-test-p4-moderation-2024';

    const testInstitution: Institution = {
      id: testInstId,
      name: 'Commune Test Modération',
      type: 'MAIRIE',
      region: 'Lagunes',
      district: 'Lagunes',
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
      total_budget_fcfa: null,
    };

    const testAccount: AdministrativeAccount = {
      id: testCaId,
      institution_id: testInstId,
      institution_type: 'COMMUNE',
      institution_name: 'Commune Test Modération',
      fiscal_year: 2024,
      status: 'PUBLISHED',
      operating_planned: null,
      operating_realized: null,
      investment_planned: 100_000_000,
      investment_realized: 50_000_000,
      total_planned: null,
      total_realized: null,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z',
      source_document: 'CA Test 2024',
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: [],
      institution_responses: [
        {
          id: 'resp-published-1',
          ca_id: testCaId,
          response_text: 'Réponse officielle publiée après modération.',
          response_date: '2026-10-15',
          author_name: 'Koné Adama',
          author_title: 'Directeur Technique',
          response_status: 'PUBLISHED',
          supporting_document_url: 'https://exemple.ci/justificatif.pdf',
          supporting_document_name: 'Note technique signée',
        },
        {
          id: 'resp-pending-2',
          ca_id: testCaId,
          response_text: 'Brouillon interne PENDING qui ne doit jamais fuiter.',
          response_date: '2026-10-16',
          author_name: 'Brouillon Caché',
          author_title: 'Collaborateur',
          response_status: 'PENDING',
        },
      ],
    };

    ADMINISTRATIVE_ACCOUNTS_DATA.push(testAccount);
    pushedAccountIds.push(testCaId);

    const html = renderToStaticMarkup(
      <AdministrativeAccountView
        institution={testInstitution}
        onOpenDocRequest={() => {}}
      />
    );

    expect(html).toContain('Réponse officielle publiée après modération.');
    expect(html).toContain('Réponse Institutionnelle (Droit de réponse)');
    expect(html).toContain('ne constitue pas une vérification citoyenne indépendante');
    expect(html).toContain('Note technique signée');
    expect(html).not.toContain('Brouillon interne PENDING qui ne doit jamais fuiter.');
    expect(html).not.toContain('Vérifié Officiel');
  });
});
