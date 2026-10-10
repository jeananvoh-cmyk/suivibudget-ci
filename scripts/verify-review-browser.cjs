const assert = require('node:assert/strict');
const { chromium } = require(process.env.REVIEW_PLAYWRIGHT_MODULE || 'playwright-core');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const output = process.env.REVIEW_ARTIFACTS_DIR || path.join(os.tmpdir(), 'suivibudget-review-artifacts');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.REVIEW_CHROMIUM_PATH || (process.platform === 'win32' ? undefined : '/usr/bin/chromium'), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const remoteAttempts = [], errors = [], checks = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://127.0.0.1:5174') return route.continue();
      remoteAttempts.push({ method: route.request().method(), origin: url.origin });
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const views = ['Budgets','Collectivités','Projets','Contributions','Réponses','Historique','Sources'];
    for (const width of [360,375,390,430,768,1280,1440,1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('http://127.0.0.1:5174/review.html');
      await page.getByRole('heading', { name: 'Du budget à la preuve.' }).waitFor();
      for (const view of views) {
        await page.getByRole('navigation', { name: 'Parcours de revue' }).getByRole('button', { name: view, exact: true }).click();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        assert.equal(overflow, false, `Overflow ${width}/${view}`);
        checks.push({ width, view, overflow: false });
      }
      if ([375,1440].includes(width)) {
        await page.screenshot({ path: `${output}/sources-${width}.png`, fullPage: true });
        await page.getByRole('navigation').getByRole('button', { name: 'Budgets', exact: true }).click();
        await page.screenshot({ path: `${output}/budgets-${width}.png`, fullPage: true });
      }
    }
    for (const id of ['gov-017','gov-030','gov-034']) {
      await page.locator('#review-institution').selectOption(id);
      assert.match(await page.getByRole('status').innerText(), /Aucun montant vérifié/);
      assert.equal(await page.getByText('0 FCFA', { exact: true }).count(), 0);
    }
    await page.locator('#review-institution').selectOption('inst-com-tiassale');
    assert.match(await page.getByRole('status').innerText(), /Aucun montant vérifié/);
    await page.getByRole('navigation').getByRole('button', { name: 'Sources', exact: true }).click();
    await page.locator('#source-search').fill('zz_no_match');
    assert.equal(await page.getByRole('heading', { name: 'Aucun document correspondant dans ce catalogue' }).count(), 1);
    await page.locator('#source-search').fill('');
    await page.locator('#review-year').selectOption('2022');
    assert.equal(await page.getByRole('heading', { name: 'Aucun document correspondant dans ce catalogue' }).count(), 1);
    await page.locator('#review-year').selectOption('2026');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter le catalogue (JSON)' }).click();
    const download = await downloadPromise;
    await download.saveAs(`${output}/sources-2022.json`);
    const exported = JSON.parse(fs.readFileSync(`${output}/sources-2022.json`, 'utf8'));
    assert.equal(exported.documents.length, 2);
    assert.equal(exported.documents.every(document => document.fiscalYear === 2026), true);
    assert.equal(JSON.stringify(exported).includes('/tmp/'), false);
    await page.goto('http://127.0.0.1:5174/review.html');
    await page.getByRole('heading', { name: 'Du budget à la preuve.' }).waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Aller au contenu');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'review-content');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const minTargets = await page.locator('button, select, summary, input').evaluateAll(elements => elements.every(el => el.getBoundingClientRect().height >= 44));
    assert.equal(minTargets, true);
    assert.deepEqual(errors, []);
    assert.deepEqual(remoteAttempts, []);
    const result = { viewportChecks: checks.length, viewports: 8, views: 7, checks, errors, remoteAttempts,
      resolvedMinistryUnknownChecks: 3, sourceSearch: 'PASS', localExport: 'PASS', keyboardSkipLink: 'PASS', minTarget44px: 'PASS',
      limits: 'Candidate workspace only; not a full WCAG or legacy-page audit.' };
    fs.writeFileSync(`${output}/browser-report.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ ...result, checks: undefined }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
