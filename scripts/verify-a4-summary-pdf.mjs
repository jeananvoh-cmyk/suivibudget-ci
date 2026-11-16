import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const ARTIFACTS_DIR = join(process.cwd(), 'docs', 'audits', 'a4-summary-validation');
const PORT = 4179;

function findChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH && existsSync(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  const candidates = [
    'C:\\Users\\Couple ANVOH\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error('No headless Chromium/Chrome/Edge executable found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.');
}

async function analyzePdf(pdfBuffer) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();
    pages.push({
      pageNumber: i,
      widthPt: Number(viewport.width.toFixed(2)),
      heightPt: Number(viewport.height.toFixed(2)),
      widthMm: Number(((viewport.width * 25.4) / 72).toFixed(1)),
      heightMm: Number(((viewport.height * 25.4) / 72).toFixed(1)),
      textLength: text.length,
      text,
    });
  }
  return { numPages: doc.numPages, pages };
}

function getCompiledCssTag() {
  const assetsDir = join(process.cwd(), 'dist', 'assets');
  const cssFile = readdirSync(assetsDir).find((f) => f.endsWith('.css'));
  if (!cssFile) throw new Error('Compiled CSS missing in dist/assets. Run npm run build first.');
  return readFileSync(join(assetsDir, cssFile), 'utf8');
}

async function checkScenarioLayoutAndPdf(page, label, outPrefix, expectedSnippets) {
  // Desktop 1440x900
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ media: 'screen' });
  await page.waitForTimeout(150);
  const desktopMetrics = await page.evaluate(() => {
    const el = document.getElementById('citizen-one-page-summary');
    const r = el.getBoundingClientRect();
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: el.scrollWidth > el.clientWidth + 2 || document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  await page.screenshot({ path: join(ARTIFACTS_DIR, `${outPrefix}-desktop.png`), fullPage: false });

  // Mobile 375x812
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(150);
  const mobileMetrics = await page.evaluate(() => {
    const el = document.getElementById('citizen-one-page-summary');
    const r = el.getBoundingClientRect();
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: el.scrollWidth > el.clientWidth + 2 || document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  await page.screenshot({ path: join(ARTIFACTS_DIR, `${outPrefix}-mobile.png`), fullPage: false });

  // Monochrome / Black & White print preview screenshot
  await page.setViewportSize({ width: 1024, height: 1200 });
  await page.emulateMedia({ media: 'print' });
  const grayscaleHandle = await page.addStyleTag({ content: '@media print { html { filter: grayscale(100%); } }' });
  await page.waitForTimeout(150);

  const printMetrics = await page.evaluate(() => {
    const el = document.getElementById('citizen-one-page-summary');
    const r = el.getBoundingClientRect();
    const clippedTextNodes = [];
    for (const child of el.querySelectorAll('h1, h2, p, li, span, footer')) {
      const style = window.getComputedStyle(child);
      if ((style.overflowX === 'hidden' || style.textOverflow === 'ellipsis') && child.scrollWidth > child.clientWidth + 2) {
        clippedTextNodes.push(child.textContent?.slice(0, 60));
      }
    }
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: el.scrollWidth > el.clientWidth + 2,
      a4OverflowAttr: el.getAttribute('data-a4-overflow'),
      clippedTextNodes,
    };
  });

  await page.screenshot({ path: join(ARTIFACTS_DIR, `${outPrefix}-monochrome-print.png`), fullPage: true });
  // Remove CSS filter before page.pdf() so Chromium emits selectable vector text glyphs rather than a raster bitmap.
  await grayscaleHandle.evaluate((node) => node.remove());
  await page.waitForTimeout(100);
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  const pdfPath = join(ARTIFACTS_DIR, `${outPrefix}.pdf`);
  writeFileSync(pdfPath, pdfBuffer);

  const pdfAnalysis = await analyzePdf(pdfBuffer);
  if (pdfAnalysis.numPages !== 1) {
    throw new Error(`${label}: expected exactly 1 A4 PDF page, got ${pdfAnalysis.numPages}`);
  }
  const page1 = pdfAnalysis.pages[0];
  if (Math.abs(page1.widthMm - 210) > 1.5 || Math.abs(page1.heightMm - 297) > 1.5) {
    throw new Error(`${label}: expected A4 (210x297 mm), got ${page1.widthMm}x${page1.heightMm} mm`);
  }
  if (desktopMetrics.overflowX || mobileMetrics.overflowX || printMetrics.overflowX) {
    throw new Error(`${label}: horizontal overflow detected (${JSON.stringify({ desktopMetrics, mobileMetrics, printMetrics })})`);
  }
  if (printMetrics.clippedTextNodes.length > 0) {
    throw new Error(`${label}: clipped/truncated text detected: ${printMetrics.clippedTextNodes.join('; ')}`);
  }

  for (const snippet of expectedSnippets) {
    const normalizedPdf = page1.text.replace(/\s+/g, ' ').toLowerCase();
    const compactPdf = page1.text.replace(/\s+/g, '').toLowerCase();
    const target = snippet.toLowerCase();
    if (!normalizedPdf.includes(target) && !compactPdf.includes(target.replace(/\s+/g, ''))) {
      throw new Error(`${label}: expected snippet "${snippet}" missing from extracted A4 PDF text! Extracted: ${normalizedPdf.slice(0, 300)}`);
    }
  }

  return {
    scenario: label,
    pdfFile: `${outPrefix}.pdf`,
    numPages: pdfAnalysis.numPages,
    dimensionsMm: `${page1.widthMm} x ${page1.heightMm}`,
    dimensionsPt: `${page1.widthPt} x ${page1.heightPt}`,
    desktopMetrics,
    mobileMetrics,
    printMetrics,
    extractedTextLength: page1.textLength,
    verifiedSnippets: expectedSnippets,
  };
}

async function main() {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const compiledCss = getCompiledCssTag();
  const exe = findChromiumExecutable();

  // Start preview server for Scenario A (Live App) and Vite SSR for rendering exact component Scenarios B & C
  const previewSrv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  const viteSsr = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const browser = await chromium.launch({ executablePath: exe, headless: true });

  const results = [];
  try {
    await new Promise((r) => setTimeout(r, 2000));

    // --- SCENARIO A: Live App Flow (/institutions/mairies -> Cocody -> Fiche A4) ---
    const pageA = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageA.goto(`http://localhost:${PORT}/institutions/mairies`, { waitUntil: 'networkidle', timeout: 30000 });
    const search = pageA.locator('main input[type="text"], main input[type="search"]').first();
    await search.fill('Cocody');
    await pageA.waitForTimeout(400);
    await pageA.locator('button[title="Voir la fiche détaillée de la commune"]').first().click();
    await pageA.waitForSelector('text=Fiche Citoyenne 1 Page (A4)', { timeout: 10000 });
    await pageA.getByRole('button', { name: /Fiche Citoyenne 1 Page \(A4\)/i }).click();
    await pageA.waitForSelector('#citizen-one-page-summary', { timeout: 10000 });
    results.push(
      await checkScenarioLayoutAndPdf(pageA, 'Live App Cocody', 'a4-cocody-live', [
        'Budget Citoyen',
        '1 Page (A4)',
        'Cocody',
        'Délai légal : 30 jours',
        'Charte SuiviBudget CI',
      ])
    );
    await pageA.close();

    // Load exact React component module for Scenarios B & C
    const { CitizenOnePageSummary } = await viteSsr.ssrLoadModule('/src/components/CitizenOnePageSummary.tsx');

    // --- SCENARIO B: Low-Data Undocumented Case ---
    const lowInstitution = {
      id: 'inst-com-a4-low',
      name: 'Mairie de San-Pédro Test (Données partielles)',
      type: 'MAIRIE',
      region: 'San-Pédro',
      district: 'Bas-Sassandra',
      leader_title: 'Maire',
      budget_functioning_fcfa: null,
      budget_investment_fcfa: null,
      total_budget_fcfa: null,
    };
    const lowHtml = renderToStaticMarkup(
      React.createElement(CitizenOnePageSummary, {
        institution: lowInstitution,
        relatedProjects: [],
        riInfo: { functionTitle: "Responsable de l'Information (CAIDP)" },
        onClose: () => {},
      })
    );
    const pageB = await browser.newPage();
    await pageB.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${compiledCss}</style></head><body>${lowHtml}</body></html>`, { waitUntil: 'load' });
    results.push(
      await checkScenarioLayoutAndPdf(pageB, 'Faible volume (Sans données)', 'a4-low-data', [
        'Mairie de San-Pédro Test',
        'Non documenté publiquement',
        'NOT_FOUND_PUBLICLY',
        'Aucune empreinte SHA-256',
      ])
    );
    await pageB.close();

    // --- SCENARIO C: Max Reasonable Volume (Long names, BP+CA, 7 sectors, 8 projects, 5 SHA-256 hashes, CAIDP alert) ---
    const maxSha = [
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    ];
    const maxInstitution = {
      id: 'inst-com-cocody',
      name: 'Commune de Cocody — Administration Territoriale Pilote du Grand Abidjan',
      type: 'MAIRIE',
      region: "District Autonome d'Abidjan",
      district: "District Autonome d'Abidjan",
      leader_name: 'Jean-Marc Yacé',
      leader_title: 'Maire de la Commune de Cocody',
      mandature: '2023-2028',
      total_budget_fcfa: 19_700_000_000,
      budget_functioning_fcfa: 11_800_000_000,
      budget_investment_fcfa: 7_900_000_000,
      primitive_budget: {
        total_fcfa: 19_700_000_000,
        functioning_fcfa: 11_800_000_000,
        investment_fcfa: 7_900_000_000,
        source: 'Budget Primitif 2026 Délibéré & Visé',
        sha256: maxSha[0],
        pdf_page: 4,
      },
      breakdown_evidence: {
        document_title: 'Annexe Ventilation Fonctionnement / Investissement 2026',
        sha256: maxSha[1],
        pdf_page: 12,
      },
      state_grant_evidence: {
        source: {
          document_title: 'Arrêté DGE / Transferts État Collectivités 2026',
          sha256: maxSha[2],
          pdf_page: 7,
        },
      },
    };
    const maxCA = {
      id: 'ca-cocody-2024',
      institution_id: 'inst-com-cocody',
      institution_type: 'COMMUNE',
      institution_name: 'Commune de Cocody',
      fiscal_year: 2024,
      status: 'PUBLISHED',
      operating_planned: 10_000_000_000,
      operating_realized: 9_150_000_000,
      investment_planned: 3_900_630_000,
      investment_realized: 1_366_100_690,
      total_planned: 13_900_630_000,
      total_realized: 10_516_100_690,
      source_document: 'Compte Administratif 2024 Visé Préfecture',
      source_document_sha256: maxSha[3],
      source_page: 40,
      verification_status: 'OFFICIAL_DOCUMENT',
      operations: new Array(18).fill({ id: 'op' }),
      created_at: '2025-06-01T00:00:00Z',
      updated_at: '2025-06-01T00:00:00Z',
    };
    const maxDocs = [
      {
        id: 'doc-5',
        title: 'Bulletin DGMP Marchés Publics Cocody 2024-2026',
        status: 'PUBLISHED',
        verification_status: 'VERIFIED',
        checksum_status: 'COMPUTED',
        checksum_sha256: maxSha[4],
        institution_id: 'inst-com-cocody',
        page_count: 88,
      },
    ];
    const maxProjects = [
      'Voirie & Assainissement',
      'Éducation Primaire',
      'Santé Communautaire',
      'Éclairage Public Solaire',
      'Hydraulique & Drainage',
      'Équipements Marchands',
      'Culture & Jeunesse',
      'Voirie & Assainissement',
    ].map((cat, idx) => ({
      id: `proj-max-${idx + 1}`,
      institution_id: 'inst-com-cocody',
      commune_name: 'Cocody — Riviera / Angré',
      region_name: 'Abidjan',
      category: cat,
      nature_expense: 'Investissements',
      title: `Opération prioritaire ${idx + 1} : aménagement structurant et équipement de proximité (${cat})`,
      budget_amount_fcfa: 450_000_000 - idx * 25_000_000,
      fiscal_year: 2026,
      current_status: 'IN_PROGRESS',
      progress_percentage: 35,
      created_at: '2026-01-15T00:00:00Z',
    }));

    const maxHtml = renderToStaticMarkup(
      React.createElement(CitizenOnePageSummary, {
        institution: maxInstitution,
        relatedProjects: maxProjects,
        latestCA: maxCA,
        documents: maxDocs,
        riInfo: {
          name: 'Kouamé Konan Frédéric',
          functionTitle: "Secrétaire Général • Responsable de l'Information",
          email: 'transparence.caidp@mairie-cocody.ci',
          phone: '+225 27 22 44 00 00',
        },
        caidpDeadlineSummary: {
          latestDeadline: {
            badgeLabel: 'Délai 30j respecté',
            citizenGuidance: '2 documents publiés dans le délai légal de 30 jours',
          },
        },
        onClose: () => {},
      })
    );
    const pageC = await browser.newPage();
    await pageC.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${compiledCss}</style></head><body>${maxHtml}</body></html>`, { waitUntil: 'load' });
    results.push(
      await checkScenarioLayoutAndPdf(pageC, 'Volume maximal raisonnable', 'a4-max-volume', [
        'Commune de Cocody',
        '3 900 630 000 FCFA',
        '1 366 100 690 FCFA',
        '3 Projets Majeurs sur 8 Référencés',
        '+ 2 autre(s) secteur(s)',
        '+ 1 autre(s) empreinte(s) SHA-256',
        maxSha[0],
        maxSha[3],
        'Délai 30j respecté',
      ])
    );
    await pageC.close();

    writeFileSync(
      join(ARTIFACTS_DIR, 'a4-verification-results.json'),
      JSON.stringify({ generatedAt: '2026-11-16', chromiumExecutable: exe, scenarios: results }, null, 2) + '\n',
      'utf8'
    );
    console.log(JSON.stringify({ status: 'PASS', scenarios: results.map((r) => ({ scenario: r.scenario, numPages: r.numPages, dimensionsMm: r.dimensionsMm, overflowX: r.printMetrics.overflowX, heightPrint: r.printMetrics.height })) }, null, 2));
  } finally {
    await browser.close();
    await viteSsr.close();
    previewSrv.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
