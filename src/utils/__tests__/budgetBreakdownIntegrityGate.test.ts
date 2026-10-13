import { describe, expect, it, vi } from 'vitest';
import {
  resolveInstitutionFinancialView,
  assessInstitutionBudget,
  resolveInstitutionBudgetPresentation,
} from '../institutionBudgetHelper';
import { OFFICIAL_PRIMITIVE_BUDGETS } from '../../data/officialPrimitiveBudgets';
import { NATIONAL_INSTITUTIONS_DATA } from '../../data/nationalBudgetData';
import { ALL_COMMUNES_DATA, ALL_REGIONS_DATA } from '../../data/officialDataFromCsv';
import { REGULATORY_AUTHORITIES_DATA } from '../../data/regulatoryAuthoritiesData';
import { getModalFocusableElements, handleModalKeyDown, manageModalFocusLifecycle } from '../../components/InstitutionDetailModal';
import { Institution } from '../../types';

const VALID_PRIMARY_SHA256 = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0';
const EMPTY_FILE_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('Point A & Corrections PR #58 — Intégrité des ventilations, provenance et modales', () => {
  // P1 #1 (a) : BP exact mais seulement rapporté (source secondaire) -> conserve les ratios mais SECONDARY_SOURCE, jamais VERIFIED_AMOUNT
  it('P1 #1 (a) : qualifie un budget primitif exact rapporté (Bingerville) en SECONDARY_SOURCE sans jamais le certifier VERIFIED_AMOUNT', () => {
    const bingervillePrim = OFFICIAL_PRIMITIVE_BUDGETS['inst-com-bingerville'];
    expect(bingervillePrim).toBeDefined();
    expect(bingervillePrim.precision).toBe('EXACT');
    expect(bingervillePrim.source_url).toBeTruthy();

    const bingervilleInst: Partial<Institution> = {
      id: 'inst-com-bingerville',
      name: 'Mairie de Bingerville',
      type: 'MAIRIE',
      total_budget_fcfa: bingervillePrim.total_voted_fcfa,
      budget_functioning_fcfa: bingervillePrim.functioning_voted_fcfa,
      budget_investment_fcfa: bingervillePrim.investment_voted_fcfa,
    };

    const view = resolveInstitutionFinancialView(bingervilleInst, 2026, 'PRIMITIVE');
    expect(view.has_breakdown).toBe(true);
    expect(view.functioning_pct).toBe(46);
    expect(view.investment_pct).toBe(54);
    expect(view.functioning_pct! + view.investment_pct!).toBe(100);
    expect(view.functioning_amount_fcfa).toBe(1877888000);
    expect(view.investment_amount_fcfa).toBe(2168334000);
    expect(view.verification_status).toBe('SECONDARY_SOURCE');
    expect(view.verification_status).not.toBe('VERIFIED_AMOUNT');
    expect(view.badge_text).toBe('Montant rapporté — à confirmer');
    expect(view.documentary_provenance?.pdf_page).toBeNull();

    const assessment = assessInstitutionBudget(bingervilleInst);
    expect(assessment.hasBreakdown).toBe(true);
    expect(assessment.functioningPct).toBe(46);
    expect(assessment.investmentPct).toBe(54);
    expect(assessment.verificationStatus).toBe('SECONDARY_SOURCE');
  });

  // P1 #1 (b) : BP avec preuve documentaire primaire valide -> VERIFIED_AMOUNT
  it('P1 #1 (b) : certifie VERIFIED_AMOUNT un budget primitif accompagné d’une preuve primaire complète (page PDF + SHA-256)', () => {
    const primaryProvenPrimitiveInst: Partial<Institution> = {
      id: 'inst-com-primary-test',
      name: 'Mairie avec Délibération Officielle PDF',
      type: 'MAIRIE',
      total_budget_fcfa: 4_000_000_000,
      budget_functioning_fcfa: 1_600_000_000,
      budget_investment_fcfa: 2_400_000_000,
      primitive_budget: {
        total_voted_fcfa: 4_000_000_000,
        functioning_voted_fcfa: 1_600_000_000,
        investment_voted_fcfa: 2_400_000_000,
        voted_date: '2026-01-15',
        source: 'Délibération n°2026-01 du Conseil Municipal',
        document_reference: 'DELIB-CM-2026-01',
        source_url: 'https://collectivites.gouv.ci/docs/delib-2026-01.pdf',
        precision: 'EXACT',
        verification_status: 'OFFICIAL_DOCUMENT',
        pdf_page: 12,
        sha256: VALID_PRIMARY_SHA256,
      },
    };

    const view = resolveInstitutionFinancialView(primaryProvenPrimitiveInst, 2026, 'PRIMITIVE');
    expect(view.has_breakdown).toBe(true);
    expect(view.functioning_pct).toBe(40);
    expect(view.investment_pct).toBe(60);
    expect(view.verification_status).toBe('VERIFIED_AMOUNT');
    expect(view.documentary_provenance?.pdf_page).toBe(12);
    expect(view.documentary_provenance?.sha256).toBe(VALID_PRIMARY_SHA256);

    const presentation = resolveInstitutionBudgetPresentation(primaryProvenPrimitiveInst);
    expect(presentation.reference.verification).toBe('VERIFIED_AMOUNT');
    expect(presentation.reference.source?.pdf_page).toBe(12);
    expect(presentation.reference.source?.sha256).toBe(VALID_PRIMARY_SHA256);
    expect(presentation.functioning_pct).toBe(40);
    expect(presentation.investment_pct).toBe(60);
  });

  // P1 #1 (c) : BP avec ventilation déséquilibrée -> UNRECONCILED, ratios neutralisés
  it('P1 #1 (c) : rejette toute certification et neutralise les ratios pour un budget primitif à ventilation déséquilibrée', () => {
    const unbalancedPrimitiveInst: Partial<Institution> = {
      id: 'inst-com-unbalanced-bp',
      name: 'Mairie BP Déséquilibré',
      type: 'MAIRIE',
      total_budget_fcfa: 4_046_222_000,
      budget_functioning_fcfa: 1_800_000_000,
      budget_investment_fcfa: 2_100_000_000, // Somme = 3,9 Mrds != 4,046222 Mrds
      primitive_budget: {
        total_voted_fcfa: 4_046_222_000,
        functioning_voted_fcfa: 1_800_000_000,
        investment_voted_fcfa: 2_100_000_000,
        voted_date: '2026-01-10',
        source: 'Source secondaire incohérente',
        source_url: 'https://www.aip.ci/bp-incoherent/',
        precision: 'EXACT',
      },
    };

    const view = resolveInstitutionFinancialView(unbalancedPrimitiveInst, 2026, 'PRIMITIVE');
    expect(view.has_breakdown).toBe(false);
    expect(view.functioning_pct).toBeNull();
    expect(view.investment_pct).toBeNull();
    expect(view.reconciliation_status).toBe('UNRECONCILED');
    expect(view.verification_status).toBe('UNRECONCILED');
    expect(view.delta_fcfa).toBe(146_222_000);

    const presentation = resolveInstitutionBudgetPresentation(unbalancedPrimitiveInst);
    expect(presentation.functioning_fcfa).toBeNull();
    expect(presentation.investment_fcfa).toBeNull();
    expect(presentation.functioning_pct).toBeNull();
    expect(presentation.investment_pct).toBeNull();
  });

  // P1 #2 (a) : Preuve documentaire structurée complète (BreakdownDocumentaryEvidence) -> certifiée
  it('P1 #2 (a) : certifie la ventilation uniquement avec un objet BreakdownDocumentaryEvidence complet et concordant', () => {
    const provenEntity: Partial<Institution> = {
      id: 'inst-test-proven',
      name: 'Entité Test Prouvée',
      type: 'MAIRIE',
      total_budget_fcfa: 10_000_000,
      budget_functioning_fcfa: 7_000_000,
      budget_investment_fcfa: 3_000_000,
      breakdown_evidence: {
        institution_id: 'inst-test-proven',
        fiscal_year: 2026,
        budget_basis: 'PRIMITIVE',
        document_title: 'Délibération officielle du Budget Primitif 2026',
        document_reference: 'DELIB-2026-004',
        source_url: 'https://dgbf.ci/docs/delib-2026-004.pdf',
        pdf_page: 8,
        sha256: VALID_PRIMARY_SHA256,
        total_fcfa: 10_000_000,
        functioning_fcfa: 7_000_000,
        investment_fcfa: 3_000_000,
      },
    };

    const view = resolveInstitutionFinancialView(provenEntity, 2026, 'PRIMITIVE');
    expect(view.has_breakdown).toBe(true);
    expect(view.functioning_pct).toBe(70);
    expect(view.investment_pct).toBe(30);
    expect(view.verification_status).toBe('VERIFIED_AMOUNT');
    expect(view.documentary_provenance?.pdf_page).toBe(8);
    expect(view.documentary_provenance?.sha256).toBe(VALID_PRIMARY_SHA256);
  });

  // P1 #2 (b) : Test adversarial obligatoire -> has_verified_breakdown: true sans document officiel est rejeté
  it('P1 #2 (b) [Adversarial] : refuse toute certification à une entité avec has_verified_breakdown: true mais sans preuve documentaire primaire valide', () => {
    const forgedEntity = {
      id: 'inst-forged-flag',
      name: 'Entité avec booléen non sourcé',
      type: 'MAIRIE' as const,
      total_budget_fcfa: 10_000_000,
      budget_functioning_fcfa: 7_000_000,
      budget_investment_fcfa: 3_000_000,
      has_verified_breakdown: true,
    };

    const view = resolveInstitutionFinancialView(forgedEntity, 2026, 'PRIMITIVE');
    expect(view.has_breakdown).toBe(false);
    expect(view.functioning_pct).toBeNull();
    expect(view.investment_pct).toBeNull();
    expect(view.verification_status).toBe('NOT_DOCUMENTED');
    expect(view.verification_status).not.toBe('VERIFIED_AMOUNT');

    // Même rejet si breakdown_evidence a un hash de fichier vide, une page <= 0 ou un mauvais exercice
    for (const invalidPatch of [
      { sha256: EMPTY_FILE_SHA256 },
      { sha256: 'invalid-hash' },
      { pdf_page: 0 },
      { fiscal_year: 2025 },
      { institution_id: 'other-id' },
      { budget_basis: 'LFI' as const },
      { functioning_fcfa: 6_000_000, investment_fcfa: 4_000_000 },
    ]) {
      const invalidView = resolveInstitutionFinancialView(
        {
          ...forgedEntity,
          breakdown_evidence: {
            institution_id: 'inst-forged-flag',
            fiscal_year: 2026,
            budget_basis: 'PRIMITIVE',
            document_title: 'Doc',
            document_reference: 'Ref',
            source_url: 'https://dgbf.ci/doc.pdf',
            pdf_page: 4,
            sha256: VALID_PRIMARY_SHA256,
            total_fcfa: 10_000_000,
            functioning_fcfa: 7_000_000,
            investment_fcfa: 3_000_000,
            ...invalidPatch,
          },
        },
        2026,
        'PRIMITIVE'
      );
      expect(invalidView.has_breakdown).toBe(false);
      expect(invalidView.functioning_pct).toBeNull();
      expect(invalidView.verification_status).not.toBe('VERIFIED_AMOUNT');
    }
  });

  // Cas 2 : Ventilation non prouvée -> afficher « Non documentée » et neutraliser les pourcentages
  it('Cas 2 : affiche Non documentée pour les institutions nationales LFI 2026 sans tableau officiel de répartition', () => {
    for (const inst of NATIONAL_INSTITUTIONS_DATA) {
      if (inst.total_budget_fcfa != null) {
        const view = resolveInstitutionFinancialView(inst, 2026, 'LFI');
        expect(view.has_breakdown).toBe(false);
        expect(view.functioning_pct).toBeNull();
        expect(view.investment_pct).toBeNull();
        expect(view.notice_text).toContain('Ventilation fonctionnement/investissement non documentée');
      }
    }
  });

  // Cas 3 : Une somme arithmétiquement équilibrée ne constitue pas une preuve officielle
  it('Cas 3 : une somme arithmétiquement équilibrée (60 + 40 === 100) sans source probante est rejetée (non certifiée)', () => {
    const unverifiedBalancedEntity: Partial<Institution> = {
      id: 'inst-unverified-pseudo-balanced',
      name: 'Structure sans source',
      type: 'AUTORITE_REGULATION',
      total_budget_fcfa: 100_000_000,
      budget_functioning_fcfa: 60_000_000,
      budget_investment_fcfa: 40_000_000,
    };

    const view = resolveInstitutionFinancialView(unverifiedBalancedEntity, 2026, 'LFI');
    expect(view.has_breakdown).toBe(false);
    expect(view.functioning_pct).toBeNull();
    expect(view.investment_pct).toBeNull();
    expect(view.reconciliation_status).toBe('NO_BREAKDOWN');
    expect(view.blocking_reasons).toContain('Ventilation fonctionnement/investissement non documentée sur cette assiette officielle.');

    const assessment = assessInstitutionBudget(unverifiedBalancedEntity);
    expect(assessment.hasBreakdown).toBe(false);
    expect(assessment.functioningPct).toBeNull();
    expect(assessment.investmentPct).toBeNull();
  });

  // Cas 4 : Un montant inconnu ne devient jamais 0 FCFA
  it('Cas 4 : un montant inconnu ne devient jamais 0 FCFA (Cour Suprême & entités non publiées)', () => {
    const courSupreme = NATIONAL_INSTITUTIONS_DATA.find(i => i.id === 'inst-cour-supreme')!;
    expect(courSupreme).toBeDefined();

    const view = resolveInstitutionFinancialView(courSupreme, 2026, 'LFI');
    expect(view.total_amount_fcfa).toBeNull();
    expect(view.total_formatted).not.toContain('0 FCFA');
    expect(view.total_formatted).toBe('Non individualisé (LFI 2026)');

    const unknownEntity: Partial<Institution> = {
      id: 'inst-unknown-test',
      name: 'Collectivité sans document',
      type: 'MAIRIE',
      total_budget_fcfa: null,
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
    };

    const unknownView = resolveInstitutionFinancialView(unknownEntity, 2026, 'PRIMITIVE');
    expect(unknownView.total_amount_fcfa).toBeNull();
    expect(unknownView.total_formatted).not.toContain('0 FCFA');
    expect(unknownView.total_formatted).toBe('Non documenté publiquement');

    const taxQuotaEntity: Partial<Institution> = {
      id: 'inst-com-cocody',
      name: 'Mairie de Cocody',
      type: 'MAIRIE',
      is_tax_quota_commune: true,
      total_budget_fcfa: null,
    };
    const taxQuotaView = resolveInstitutionFinancialView(taxQuotaEntity, 2026, 'PRIMITIVE');
    expect(taxQuotaView.total_amount_fcfa).toBeNull();
    expect(taxQuotaView.total_formatted).not.toContain('0 FCFA');
    expect(taxQuotaView.total_formatted).toBe('Budget municipal propre');
  });

  // P2 #3 : Ne pas transformer un montant historique en concours de l'État sans source explicite
  it('P2 #3 : qualifie tout montant historique non sourcé avec le libellé neutre sur Bingerville, Tiassalé, Doropo, Agnéby-Tiassa et Iffou, sans substitution avec le BP', () => {
    const bingerville = ALL_COMMUNES_DATA.find(c => c.id === 'inst-com-bingerville')!;
    const tiassale = ALL_COMMUNES_DATA.find(c => c.id === 'inst-com-tiassale')!;
    const doropo = ALL_COMMUNES_DATA.find(c => c.id === 'inst-com-doropo')!;
    const agnebyTiassa = ALL_REGIONS_DATA.find(r => r.id === 'inst-reg-conseil-regional-de-l-agneby-tiassa')!;
    const iffou = ALL_REGIONS_DATA.find(r => r.id === 'inst-reg-conseil-regional-de-l-iffou')!;

    expect(bingerville).toBeDefined();
    expect(tiassale).toBeDefined();
    expect(doropo).toBeDefined();
    expect(agnebyTiassa).toBeDefined();
    expect(iffou).toBeDefined();

    // Entités avec BP rapporté (Bingerville, Agnéby-Tiassa) : reference = BP (SECONDARY_SOURCE), supplement = montant historique à confirmer
    for (const [entity, expectedBp] of [
      [bingerville, 4_046_222_000],
      [agnebyTiassa, 6_194_348_000],
    ] as const) {
      const pres = resolveInstitutionBudgetPresentation(entity);
      expect(pres.reference.amount_fcfa).toBe(expectedBp);
      expect(pres.reference.verification).toBe('SECONDARY_SOURCE');
      expect(pres.supplements).toHaveLength(1);
      expect(pres.supplements[0].amount_fcfa).toBe(entity.total_budget_fcfa);
      expect(pres.supplements[0].label).toBe('Montant historique enregistré — nature et source à confirmer');
      expect(pres.supplements[0].verification).toBe('TO_VERIFY');
      expect(pres.supplements[0].source).toBeNull();
    }

    // Entités sans BP dans OFFICIAL_PRIMITIVE_BUDGETS (Tiassalé, Doropo, Iffou) : reference = null (jamais remplacé par le montant historique), supplement = montant historique neutre
    for (const entity of [tiassale, doropo, iffou]) {
      const pres = resolveInstitutionBudgetPresentation(entity);
      expect(pres.reference.amount_fcfa).toBeNull();
      expect(pres.reference.verification).toBe('UNKNOWN');
      expect(pres.supplements).toHaveLength(1);
      expect(pres.supplements[0].amount_fcfa).toBe(entity.total_budget_fcfa);
      expect(pres.supplements[0].label).toBe('Montant historique enregistré — nature et source à confirmer');
      expect(pres.supplements[0].verification).toBe('TO_VERIFY');
      expect(pres.supplements[0].source).toBeNull();
    }

    // Si une source explicite de concours de l'État (Annexe 8 / DGF / DGE) est fournie, elle est qualifiée en Concours de l'État mais reste dans supplements
    const doropoWithExplicitGrant: Partial<Institution> = {
      ...doropo,
      state_grant_evidence: {
        institution_id: 'inst-com-doropo',
        fiscal_year: 2026,
        amount_fcfa: doropo.total_budget_fcfa!,
        grant_type: 'ANNEXE_8',
        source: {
          document_title: 'Annexe 8 — Concours financiers aux collectivités territoriales 2026',
          document_reference: 'Programme 2204040 • Page 203',
          source_url: 'https://www.dgbf.ci/wp-content/uploads/2025/12/Annexe-8-Concours-financiers-aux-collectivites-territoriales-et-aux-districts-autonomes-2026.pdf',
          pdf_page: 203,
          sha256: 'b3c2d9b90d847fdefb20d100c606cba0b6430e00f94306da6377ce56014128fc',
        },
      },
    };
    const doropoGrantPres = resolveInstitutionBudgetPresentation(doropoWithExplicitGrant);
    expect(doropoGrantPres.reference.amount_fcfa).toBeNull(); // Le concours de l'État ne remplace JAMAIS le BP manquant
    expect(doropoGrantPres.supplements[0].label).toContain('Concours de l’État (ANNEXE_8)');
    expect(doropoGrantPres.supplements[0].verification).toBe('VERIFIED_AMOUNT');
  });

  // P2 #4 : Régulateurs et périmètre officiel (7 autorités)
  it('P2 #4 : respecte le périmètre officiel des 7 régulateurs (ARCOP, HACA, CAIDP, CNDH, AIRP, ARTCI, ANARE-CI)', () => {
    const byId = Object.fromEntries(REGULATORY_AUTHORITIES_DATA.map(r => [r.id, r]));

    // Aucun régulateur ne transforme une subvention ou un tableau ASS en dotation globale principale
    for (const id of ['aai-arcop', 'aai-haca', 'aai-caidp', 'aai-cndh', 'aai-airp', 'aai-artci', 'aai-anare']) {
      expect(byId[id]).toBeDefined();
      const pres = resolveInstitutionBudgetPresentation(byId[id]);
      expect(pres.reference.amount_fcfa).toBeNull();
    }

    // ARCOP (32040003) : 200M + 11 087 646 212 = 11 287 646 212 en suppléments hors dotation principale
    const arcop = resolveInstitutionBudgetPresentation(byId['aai-arcop']);
    expect(arcop.supplements.map(s => s.amount_fcfa)).toEqual([200_000_000, 11_087_646_212, 11_287_646_212]);

    // HACA (32040004) : 1 454 056 138 + 1 471 878 928 = 2 925 935 066
    const haca = resolveInstitutionBudgetPresentation(byId['aai-haca']);
    expect(haca.supplements.map(s => s.amount_fcfa)).toEqual([1_454_056_138, 1_471_878_928, 2_925_935_066]);

    // CNDH (32040005) : 1 927 737 123 + 6 000 000 = 1 933 737 123
    const cndh = resolveInstitutionBudgetPresentation(byId['aai-cndh']);
    expect(cndh.supplements.map(s => s.amount_fcfa)).toEqual([1_927_737_123, 6_000_000, 1_933_737_123]);

    // CAIDP (32040018) : 938 179 346 (ASS) et 419 179 346 (ligne LFI personnel)
    const caidp = resolveInstitutionBudgetPresentation(byId['aai-caidp']);
    expect(caidp.supplements.map(s => s.amount_fcfa)).toEqual([938_179_346, 419_179_346]);

    // AIRP : uniquement subvention équilibre personnel 996 632 520 FCFA (code 78074000605) en supplément, budget global inconnu
    const airp = resolveInstitutionBudgetPresentation(byId['aai-airp']);
    expect(airp.reference.amount_fcfa).toBeNull();
    expect(airp.supplements.map(s => s.amount_fcfa)).toEqual([996_632_520]);
    expect(airp.supplements[0].label).toContain('78074000605');

    // ARTCI et ANARE-CI : aucun montant global ni supplément sans source primaire
    expect(resolveInstitutionBudgetPresentation(byId['aai-artci']).supplements).toEqual([]);
    expect(resolveInstitutionBudgetPresentation(byId['aai-anare']).supplements).toEqual([]);
  });

  // P2 #5 : Accessibilité clavier complète de InstitutionDetailModal (focus initial, piège Tab/Shift+Tab, restitution du focus, Escape, sous-modale)
  it('P2 #5 : gère le placement du focus initial, le piège de focus (Tab / Shift+Tab), la restitution au déclencheur, la fermeture Escape et la suspension en présence d’une sous-modale', () => {
    const focusedLog: string[] = [];
    const makeBtn = (id: string, disabled = false) => ({
      id,
      hidden: false,
      hasAttribute: (attr: string) => (attr === 'disabled' ? disabled : false),
      getAttribute: () => null,
      focus: () => focusedLog.push(id),
    }) as unknown as HTMLElement;

    const triggerBtn = makeBtn('trigger-card-btn');
    const closeBtn = makeBtn('close-btn');
    const tabBtn = makeBtn('tab-btn');
    const disabledBtn = makeBtn('disabled-btn', true);
    const exportBtn = makeBtn('export-btn');

    const dialogEl = {
      querySelectorAll: () => [closeBtn, tabBtn, disabledBtn, exportBtn],
      contains: (el: unknown) => el === closeBtn || el === tabBtn || el === exportBtn,
      focus: () => focusedLog.push('dialog'),
    } as unknown as HTMLElement;

    // Simuler document.activeElement sur le déclencheur avant ouverture
    const originalDoc = globalThis.document;
    Object.defineProperty(globalThis, 'document', {
      value: { activeElement: triggerBtn },
      configurable: true,
      writable: true,
    });

    try {
      // 0. Ouverture : capture le déclencheur et place le focus initial sur le bouton de fermeture
      const restoreFocusOnClose = manageModalFocusLifecycle(dialogEl, closeBtn);
      expect(focusedLog.at(-1)).toBe('close-btn');

      const focusables = getModalFocusableElements(dialogEl);
      expect(focusables).toEqual([closeBtn, tabBtn, exportBtn]);

      // 1. Tab sur le dernier élément boucle vers le premier (closeBtn)
      const tabOnLast = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() };
      handleModalKeyDown(tabOnLast, dialogEl, false, vi.fn(), exportBtn as unknown as Element);
      expect(tabOnLast.preventDefault).toHaveBeenCalledTimes(1);
      expect(focusedLog.at(-1)).toBe('close-btn');

      // 2. Shift+Tab sur le premier élément boucle vers le dernier (exportBtn)
      const shiftTabOnFirst = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() };
      handleModalKeyDown(shiftTabOnFirst, dialogEl, false, vi.fn(), closeBtn as unknown as Element);
      expect(shiftTabOnFirst.preventDefault).toHaveBeenCalledTimes(1);
      expect(focusedLog.at(-1)).toBe('export-btn');

      // 3. Tab au milieu ne bloque pas la navigation native
      const tabInMiddle = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() };
      handleModalKeyDown(tabInMiddle, dialogEl, false, vi.fn(), tabBtn as unknown as Element);
      expect(tabInMiddle.preventDefault).not.toHaveBeenCalled();

      // 4. Escape ferme la modale principale quand aucune sous-modale n'est ouverte
      const onClose = vi.fn();
      const escEvent = { key: 'Escape', shiftKey: false, preventDefault: vi.fn() };
      handleModalKeyDown(escEvent, dialogEl, false, onClose, closeBtn as unknown as Element);
      expect(escEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);

      // 5. Escape ou Tab est ignoré par la modale parente si la sous-modale CAIDP (docModalOpen = true) est ouverte
      const onCloseWithSubmodal = vi.fn();
      const escWhileSubmodal = { key: 'Escape', shiftKey: false, preventDefault: vi.fn() };
      handleModalKeyDown(escWhileSubmodal, dialogEl, true, onCloseWithSubmodal, closeBtn as unknown as Element);
      expect(escWhileSubmodal.preventDefault).not.toHaveBeenCalled();
      expect(onCloseWithSubmodal).not.toHaveBeenCalled();

      // 6. Fermeture : restitue le focus à l'élément déclencheur d'origine (trigger-card-btn)
      restoreFocusOnClose();
      expect(focusedLog.at(-1)).toBe('trigger-card-btn');
    } finally {
      Object.defineProperty(globalThis, 'document', {
        value: originalDoc,
        configurable: true,
        writable: true,
      });
    }
  });
});

