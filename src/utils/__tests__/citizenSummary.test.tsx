import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildCitizenSummaryData, CitizenOnePageSummary } from '../../components/CitizenOnePageSummary';
import { BudgetProject, Institution, PublicDocument } from '../../types';
import { AdministrativeAccount } from '../../types/administrativeAccount';

describe('Citizen One-Page A4 Summary Sheet', () => {
  it('builds CitizenOnePageSummary without fabricating missing amounts and preserves SHA-256 provenance', () => {
    const undocumentedInstitution: Institution = {
      id: 'inst-com-undocumented-test',
      name: 'Mairie Test Sans Budget',
      type: 'MAIRIE',
      region: 'Région Test',
      district: 'District Test',
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
      total_budget_fcfa: null,
    };

    const projects: BudgetProject[] = [
      {
        id: 'p1',
        institution_id: 'inst-com-undocumented-test',
        title: 'Réhabilitation voirie Angré',
        category: 'Infrastructures',
        nature_expense: 'Investissements',
        region_name: 'Abidjan',
        commune_name: 'Cocody',
        budget_amount_fcfa: 120_000_000,
        fiscal_year: 2026,
        current_status: 'IN_PROGRESS',
        progress_percentage: 40,
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'p2',
        institution_id: 'inst-com-undocumented-test',
        title: 'Équipement centre de santé',
        category: 'Santé',
        nature_expense: 'Investissements',
        region_name: 'Abidjan',
        commune_name: 'Cocody',
        budget_amount_fcfa: null,
        fiscal_year: 2026,
        current_status: 'NOT_STARTED',
        progress_percentage: 0,
        created_at: '2026-02-01T00:00:00Z',
      },
    ];

    const latestCA: AdministrativeAccount = {
      id: 'ca-cocody-2024',
      institution_id: 'inst-com-undocumented-test',
      institution_type: 'COMMUNE',
      institution_name: 'Mairie Test Sans Budget',
      fiscal_year: 2024,
      status: 'PUBLISHED',
      operating_planned: null,
      operating_realized: null,
      investment_planned: 3_900_630_000,
      investment_realized: 1_366_100_690,
      total_planned: null,
      total_realized: null,
      source_document: 'Compte Administratif Cocody 2024',
      source_document_sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: [],
      created_at: '2025-06-01T00:00:00Z',
      updated_at: '2025-06-01T00:00:00Z',
    };

    const data = buildCitizenSummaryData({
      institution: undocumentedInstitution,
      relatedProjects: projects,
      latestCA,
    });

    expect(data.budgetPresentation.reference.amount_fcfa).toBeNull();
    const santeSector = data.sectorBreakdown.find((s) => s.category === 'Santé');
    expect(santeSector?.knownAmountFcfa).toBeNull();
    expect(data.sha256Sources).toHaveLength(1);
    expect(data.sha256Sources[0].sha256).toBe(
      'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    );

    const html = renderToStaticMarkup(
      <CitizenOnePageSummary
        institution={undocumentedInstitution}
        relatedProjects={projects}
        latestCA={latestCA}
        riInfo={{ name: 'Konan Yao', functionTitle: 'RI CAIDP', email: 'ri@cocody.ci' }}
        onClose={() => {}}
      />
    );
    expect(html).toContain('id="citizen-one-page-summary"');
    expect(html).toContain('Budget Citoyen • 1 Page (A4)');
    expect(html).toContain('Mairie Test Sans Budget');
    expect(html).toContain('3 900 630 000 FCFA');
    expect(html).toContain('1 366 100 690 FCFA');
    expect(html).toContain('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    expect(html).toContain('Non documenté publiquement');
  });

  it('discloses truncated counts explicitly when sectors > 5, projects > 3, or SHA-256 > 4', () => {
    const inst: Institution = {
      id: 'inst-com-overflow',
      name: 'Commune Test Volume Étendu',
      type: 'MAIRIE',
      region: 'Région Test',
      district: 'District Test',
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
      total_budget_fcfa: null,
    };
    const manyProjects: BudgetProject[] = [
      'Voirie',
      'Éducation',
      'Santé',
      'Hydraulique',
      'Énergie',
      'Sport',
      'Culture',
    ].map((cat, idx) => ({
      id: `p-over-${idx}`,
      institution_id: 'inst-com-overflow',
      title: `Projet ${idx + 1} (${cat})`,
      category: cat,
      nature_expense: 'Investissements',
      region_name: 'Région Test',
      commune_name: 'Commune Test',
      budget_amount_fcfa: 10_000_000 * (idx + 1),
      fiscal_year: 2026,
      current_status: 'IN_PROGRESS',
      progress_percentage: 25,
      created_at: '2026-01-10T00:00:00Z',
    }));
    const manyDocs: PublicDocument[] = ['1', '2', '3', '4', '5'].map((n) => ({
      id: `doc-over-${n}`,
      title: `Document Primaire ${n}`,
      description: 'Document budgétaire primaire de test',
      category: 'BUDGET_OFFICIEL',
      institution_id: 'inst-com-overflow',
      institution_name: 'Commune Test',
      year: 2026,
      file_url: `https://dgbf.ci/doc-${n}.pdf`,
      file_name: `doc-${n}.pdf`,
      file_format: 'PDF',
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      checksum_status: 'COMPUTED',
      checksum_sha256: n.repeat(64),
      downloads_count: 0,
      is_official: true,
      tags: [],
      published_at: '2026-01-10T00:00:00Z',
      created_at: '2026-01-10T00:00:00Z',
    }));

    const data = buildCitizenSummaryData({
      institution: inst,
      relatedProjects: manyProjects,
      documents: manyDocs,
    });

    expect(data.sectorBreakdown).toHaveLength(5);
    expect(data.totalSectorsCount).toBe(7);
    expect(data.topProjects).toHaveLength(3);
    expect(data.totalProjectsCount).toBe(7);
    expect(data.sha256Sources).toHaveLength(4);
    expect(data.totalSha256Count).toBe(5);

    const html = renderToStaticMarkup(
      <CitizenOnePageSummary
        institution={inst}
        relatedProjects={manyProjects}
        documents={manyDocs}
        riInfo={{ functionTitle: 'RI CAIDP' }}
        onClose={() => {}}
      />
    );
    expect(html).toContain('3 Projets Majeurs sur 7 Référencés');
    expect(html).toContain('+ 2 autre(s) secteur(s)');
    expect(html).toContain('+ 1 autre(s) empreinte(s) SHA-256');
  });

  it('verifies generated real Chromium A4 PDF artifacts are single-page A4 with intact amounts & SHA-256', async () => {
    const dir = join(process.cwd(), 'docs', 'audits', 'a4-summary-validation');
    const checks = [
      { file: 'a4-cocody-live.pdf', mustContain: ['Budget Citoyen', 'Cocody', 'Charte SuiviBudget CI'] },
      { file: 'a4-low-data.pdf', mustContain: ['Non documenté publiquement', 'NOT_FOUND_PUBLICLY'] },
      {
        file: 'a4-max-volume.pdf',
        mustContain: [
          '3 900 630 000 FCFA',
          '1 366 100 690 FCFA',
          '3 Projets Majeurs sur 8 Référencés',
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        ],
      },
    ];

    for (const item of checks) {
      const pdfBytes = readFileSync(join(dir, item.file));
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes), verbosity: 0 }).promise;
      expect(doc.numPages, `${item.file} page count`).toBe(1);
      const page = await doc.getPage(1);
      const vp = page.getViewport({ scale: 1 });
      const widthMm = (vp.width * 25.4) / 72;
      const heightMm = (vp.height * 25.4) / 72;
      expect(Math.abs(widthMm - 210)).toBeLessThan(1.5);
      expect(Math.abs(heightMm - 297)).toBeLessThan(1.5);

      const content = await page.getTextContent();
      const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ').replace(/\s+/g, ' ').toLowerCase();
      for (const expected of item.mustContain) {
        expect(text, `${item.file} missing "${expected}"`).toContain(expected.toLowerCase());
      }
    }
  });
});
