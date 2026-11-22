import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LFI_LOCAL_GRANTS_2026 } from '../../data/lfiLocalGrants2026';
import { ALL_COMMUNES_DATA, ALL_REGIONS_DATA } from '../../data/institutionsData';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';
import {
  LFI_2026_DOCUMENT,
  ANNEXE_8_LOCAL_TRANSFERS_2026_DOCUMENT,
  resolveInstitutionBudgetPresentation,
  exportInstitutionBudget,
} from '../institutionBudgetHelper';
import { BudgetReferenceHeader } from '../../components/institutions/MinistryBudgetHeader';
import { LeaderPortrait } from '../../components/LeaderPortrait';
import { formatInstitutionDisplayName } from '../formatters';

describe('Dotations de l’État (LFI 2026) & visibilité BP en ligne des collectivités', () => {
  it('couvre exactement les 234 entités (225 sourcées LFI/Annexe 4/Annexe 8 + 9 sans ligne nominative 2204040)', () => {
    const entries = Object.values(LFI_LOCAL_GRANTS_2026);
    expect(entries).toHaveLength(234);

    const verified = entries.filter((e) => e.status === 'VERIFIED_LFI');
    const noLine = entries.filter((e) => e.status === 'NO_NOMINATIVE_LFI_LINE');
    expect(verified).toHaveLength(225);
    expect(noLine).toHaveLength(9);

    for (const item of verified) {
      expect(item.total_cp_fcfa, item.institution_id).not.toBeNull();
      expect(item.total_cp_fcfa, item.institution_id).toBe(
        item.operating_cp_fcfa +
          item.salaries_cp_fcfa +
          item.canteens_cp_fcfa +
          item.investment_cp_fcfa +
          item.annexe4_supplement_fcfa +
          item.annexe8_supplement_fcfa,
      );
      expect(item.lfi_pdf_page, item.institution_id).toBeGreaterThanOrEqual(199);
      expect(item.lfi_pdf_page, item.institution_id).toBeLessThanOrEqual(207);
      expect(item.lfi_action_code?.trim().length, item.institution_id).toBeGreaterThan(0);
    }
  });

  it('reste arithmétiquement exacte face à la matrice officielle 234 collectivités', () => {
    const csv = readFileSync(
      join(process.cwd(), 'docs/audits/local-2026/MATRICE_234_APRES_CONTRE_VERIFICATION_ANNEXE4.csv'),
      'utf8',
    ).trim();
    const lines = csv.split(/\r?\n/);
    expect(lines.length - 1).toBe(234);

    for (const entry of [...ALL_COMMUNES_DATA, ...ALL_REGIONS_DATA]) {
      const lfi = LFI_LOCAL_GRANTS_2026[entry.id];
      expect(lfi, entry.id).toBeDefined();
      const view = resolveInstitutionBudgetPresentation(entry);
      expect(view.lfi_grant, entry.id).toBeDefined();
      if (entry.id === 'inst-com-attecoube') {
        expect(view.lfi_grant?.status).toBe('VERIFIED_LFI');
        expect(view.lfi_grant?.total_cp_fcfa).toBe(500_000_000);
        expect(view.lfi_grant?.operating_cp_fcfa).toBe(300_000_000);
        expect(view.lfi_grant?.investment_cp_fcfa).toBe(200_000_000);
      } else if (lfi.status === 'VERIFIED_LFI') {
        expect(view.lfi_grant?.total_cp_fcfa, entry.id).toBe(entry.total_budget_fcfa);
        expect(view.lfi_grant?.source.sha256).toBe(LFI_2026_DOCUMENT.sha256);
      } else {
        expect(view.lfi_grant?.status, entry.id).toBe('NO_NOMINATIVE_LFI_LINE');
        expect(view.lfi_grant?.total_cp_fcfa, entry.id).toBeNull();
      }
      // Règle P1-A : une dotation LFI ne remplace jamais le BP propre
      if (!OFFICIAL_PRIMITIVE_BUDGETS[entry.id]) {
        expect(view.reference.amount_fcfa, entry.id).toBeNull();
      }
    }
  });

  it('affiche sur les cartes compactes et fiches : BP vérifiable, absence de source en ligne, et dotation LFI sourcée', () => {
    // 1. Commune avec BP annoncé en ligne + dotation LFI (Abengourou)
    const abengourou = ALL_COMMUNES_DATA.find((c) => c.id === 'inst-com-abengourou')!;
    const compactAbengourou = renderToStaticMarkup(createElement(BudgetReferenceHeader, { institution: abengourou, compact: true }));
    expect(compactAbengourou).toContain('3 781 160 000');
    expect(compactAbengourou).toContain('Source en ligne vérifiable');
    expect(compactAbengourou).toContain(OFFICIAL_PRIMITIVE_BUDGETS['inst-com-abengourou'].source_url);
    expect(compactAbengourou).toContain('Dotation de l’État (Loi de finances 2026)');
    expect(compactAbengourou).not.toContain('Dotation de l’État (LFI 2026)');
    expect(compactAbengourou).toContain('842 432 822');
    expect(compactAbengourou).toContain(`${LFI_2026_DOCUMENT.url}#page=206`);

    // 2. Commune sans aucune source en ligne pour le BP + dotation LFI sourcée (Doropo)
    const doropo = ALL_COMMUNES_DATA.find((c) => c.id === 'inst-com-doropo')!;
    const compactDoropo = renderToStaticMarkup(createElement(BudgetReferenceHeader, { institution: doropo, compact: true }));
    expect(compactDoropo).toContain('Non documenté');
    expect(compactDoropo).toContain('Aucune source en ligne disponible pour ce budget prévisionnel');
    expect(compactDoropo).not.toContain('Non documenté (aucune source en ligne)');
    expect(compactDoropo).toContain('En attendant le budget voté');
    expect(compactDoropo).toContain('Les aides de l’État ne remplacent pas le budget voté par la collectivité.');
    expect(compactDoropo).toContain('644 104 527');

    const fullDoropo = renderToStaticMarkup(createElement(BudgetReferenceHeader, { institution: doropo, compact: false }));
    expect(fullDoropo).not.toContain('Montant historique enregistré — nature et source à confirmer');
    expect(fullDoropo).toContain(LFI_2026_DOCUMENT.sha256);

    // Export CSV pour Doropo expose bien la dotation LFI sourcée
    const csvDoropo = exportInstitutionBudget(doropo, 'CSV');
    expect(csvDoropo).toContain('VERIFIED_AMOUNT');
    expect(csvDoropo).toContain(LFI_2026_DOCUMENT.url);

    // 3. Commune Annexe 8 (Tafiré) affiche aussi le lien Annexe 8 DGBF
    const tafire = ALL_COMMUNES_DATA.find((c) => c.id === 'inst-com-tafire')!;
    const fullTafire = renderToStaticMarkup(createElement(BudgetReferenceHeader, { institution: tafire, compact: false }));
    expect(fullTafire).toContain('561 980 194');
    expect(fullTafire).toContain(`${ANNEXE_8_LOCAL_TRANSFERS_2026_DOCUMENT.url}#page=206`);

    // 4. Commune d'Abidjan sans ligne nominative LFI 2204040 mais avec BP secondaire (Cocody)
    const cocody = ALL_COMMUNES_DATA.find((c) => c.id === 'inst-com-cocody')!;
    const compactCocody = renderToStaticMarkup(createElement(BudgetReferenceHeader, { institution: cocody, compact: true }));
    expect(compactCocody).toContain('Source en ligne vérifiable');
    expect(compactCocody).toContain('aucune ligne nominative identifiée dans le bloc des concours aux collectivités');
    expect(compactCocody).toContain(`${LFI_2026_DOCUMENT.url}#page=207`);

    // 5. Conseil Régional sans BP en ligne + dotation LFI sourcée (Iffou)
    const iffou = ALL_REGIONS_DATA.find((r) => r.id === 'inst-reg-conseil-regional-de-l-iffou')!;
    const compactIffou = renderToStaticMarkup(createElement(BudgetReferenceHeader, { institution: iffou, compact: true }));
    expect(compactIffou).toContain('Aucune source en ligne disponible pour ce budget prévisionnel');
    expect(compactIffou).toContain('2 515 468 416');

    // 6. Portrait sans nom d'élu affiche Collectivité et jamais de fausses initiales de mairie
    const fallbackPortrait = renderToStaticMarkup(createElement(LeaderPortrait, { name: '', title: 'Maire' }));
    expect(fallbackPortrait).toContain('Collectivité');
    expect(fallbackPortrait).not.toContain('Élu local');

    // 7. Élision française & libellé complet sur BP rapporté (Agboville)
    expect(formatInstitutionDisplayName('Mairie de Agboville')).toBe('Mairie d’Agboville');
    expect(formatInstitutionDisplayName('Mairie de Yamoussoukro')).toBe('Mairie de Yamoussoukro');
    expect(formatInstitutionDisplayName('Mairie de Hire')).toBe('Mairie de Hire');
    const agboville = ALL_COMMUNES_DATA.find((c) => c.id === 'inst-com-agboville')!;
    const compactAgboville = renderToStaticMarkup(createElement(BudgetReferenceHeader, { institution: agboville, compact: true }));
    expect(compactAgboville).toContain('AIP — Budget primitif 2026 (Mairie d’Agboville)');
    expect(compactAgboville).toContain('Dotation de l’État (Loi de finances 2026)');
    expect(compactAgboville).toContain('Ne pas additionner ci-dessus');
    expect(compactAgboville).toContain('Prévision annoncée en ligne : la part entre impôts locaux et aide de l’État reste à confirmer');
    expect(compactAgboville).not.toContain('BP/BS/BM');
  });

  it('n’attribue jamais une fausse dotation LFI si un montant arbitraire est injecté', () => {
    const view = resolveInstitutionBudgetPresentation({
      id: 'inst-com-doropo',
      type: 'MAIRIE',
      total_budget_fcfa: 123456,
    });
    expect(view.lfi_grant).toBeUndefined();
    expect(view.supplements[0].verification).toBe('TO_VERIFY');
  });
});
