const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { browserType, launchOptions, output } = require('./support.cjs');
const { click, fill, register, login, settings, sugar, password, upload } = require('./ui.cjs');
const { startServer } = require('./server.cjs');
let browser,
  page,
  server,
  checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log('PASS ' + message);
}
async function contrast(selector) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      const luminance = (value) => {
        const channels = value
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const a = luminance(style.color),
        b = luminance(style.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  server = await startServer();
  browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
    reducedMotion: 'reduce',
  });
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(server.url);
  await register(page);
  await sugar(page);
  await sugar(page, '6.3');
  if (await page.locator('#statusMessage').isVisible()) await click(page, '#dismissStatus');
  check(
    await page.locator('#homeEvents').evaluate((element) => element.getBoundingClientRect().top < 650),
    'Today shows recent events within the first mobile screen',
  );
  await settings(page, 'appearance');
  await page.locator('#themeChoice').selectOption('dark');
  await click(page, '#saveAppearanceBtn');
  check(
    (await contrast('[data-settings="appearance"]')) >= 4.5,
    'Selected settings tab has readable dark-theme contrast',
  );
  await page.keyboard.press('Escape');
  await click(page, '#navDiary');
  check(
    (await contrast('[data-diary-view="list"]')) >= 4.5,
    'Selected diary tab has readable dark-theme contrast',
  );
  check(
    !(await page.locator('#diaryFilters').evaluate((element) => element.open)),
    'Extra filters are collapsed on mobile',
  );
  check(
    await page
      .locator('#diaryTimeline .timeline-row')
      .first()
      .evaluate((element) => element.getBoundingClientRect().top < 550),
    'First diary record is visible without a long mobile toolbar',
  );
  check(
    await page.locator('#diaryTimeline .record-chevron').first().isVisible(),
    'Entries visibly indicate their expandable details',
  );
  await page.screenshot({ path: path.join(output, 'updated-mobile-dark.png'), fullPage: true });
  await click(page, '#navFood');
  await click(page, '#navStats');
  await page.goBack();
  check(
    (await page.locator('#pageFood').isVisible()) && new URL(page.url()).hash === '#food',
    'Browser Back restores the previous section',
  );
  await page.goForward();
  check(await page.locator('#pageStats').isVisible(), 'Browser Forward restores statistics');
  check(
    await page.locator('#pageStats h1').evaluate((element) => element === document.activeElement),
    'Navigation moves keyboard focus to the screen heading',
  );
  check((await contrast('#sugarUnitMmol')) >= 4.5, 'Active glucose unit has readable dark-theme contrast');
  check(
    !(await page.locator('#statsDays').evaluate((element) => element.open)) &&
      !(await page.locator('#statsComparisons').evaluate((element) => element.open)),
    'Comparison tools start collapsed',
  );
  await click(page, '#chartRecords > summary');
  const ids = await page
    .locator('#chartRecordList [data-chart-record]')
    .evaluateAll((nodes) => nodes.map((node) => node.dataset.chartRecord));
  check(
    ids.length === 2 && new Set(ids).size === 2,
    'Dense measurements remain individually selectable from a list',
  );
  await click(page, '#chartRecordList [data-chart-record]:first-child');
  check(
    (await page.locator('#chartSelection').innerText()).includes('6.3'),
    'Record list selects the exact measurement',
  );
  await page.reload();
  await login(page);
  check(await page.locator('#pageStats').isVisible(), 'Reload and login preserve the selected section');
  await click(page, '#navToday');
  await click(page, '#quickSugar');
  await fill(page, 'sugarValueInput', '5.9');
  await page.keyboard.press('Escape');
  await click(page, '#profileBtn');
  await click(page, '[data-settings="data"]');
  await click(page, '#lockDiaryBtn');
  await login(page);
  await click(page, '#navToday');
  await click(page, '#quickSugar');
  await click(page, '[data-resume-draft="sugar"]');
  check(
    (await page.locator('#sugarValueInput').inputValue()) === '5.9',
    'Closing a form flushes the debounced encrypted draft before lock',
  );
  await upload(page);
  await click(page, '#addSugarBtn');
  await settings(page, 'appearance');
  await page.locator('#largeTextChoice').check();
  await page.locator('#contrastChoice').check();
  await click(page, '#saveAppearanceBtn');
  await page.keyboard.press('Escape');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of ['Today', 'Diary', 'Food', 'Stats']) {
      await click(page, '#nav' + section);
      check(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${section} fits ${width}px with large text and high contrast`,
      );
    }
  }
  await settings(page);
  const downloading = page.waitForEvent('download');
  await click(page, '#exportBtn');
  const backupPath = path.join(output, 'browser-backup.json');
  await (await downloading).saveAs(backupPath);
  await click(page, '#importBtn');
  await page.locator('#restoreFile').setInputFiles(backupPath);
  await fill(page, 'restoreName', 'Копия');
  await fill(page, 'restorePassword', password);
  await click(page, '#previewRestoreBtn');
  await click(page, '#restoreSubmitBtn');
  await click(page, '#navDiary');
  check(
    (await page.locator('#diaryTimeline .timeline-row').count()) === 3,
    'Encrypted import preserves records in this browser',
  );
  const row = page.locator('#diaryTimeline .timeline-row').first();
  await row.locator('.record-details > summary').click();
  await row.locator('[data-open-photo]').click();
  await page.waitForFunction(() => document.querySelector('#fullPhoto').naturalWidth > 0);
  check(
    await page.locator('#fullPhoto').isVisible(),
    'Imported photograph decrypts and opens in this browser',
  );
  check(errors.length === 0, 'No runtime errors in browser and responsive checks');
  await fs.writeFile(
    path.join(output, 'browser-results.json'),
    JSON.stringify({ browser: process.env.TEST_BROWSER || 'chromium', checks, errors }, null, 2),
  );
})()
  .catch(async (error) => {
    console.error(error);
    await page
      ?.screenshot({ path: path.join(output, 'browser-failure.png'), fullPage: true })
      .catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    await server?.stop();
  });
