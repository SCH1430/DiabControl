const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { browserType, launchOptions, output } = require('./support.cjs');
const { click, fill, register, settings } = require('./ui.cjs');
const { startServer } = require('./server.cjs');
let browser, page, server, checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log('PASS ' + message);
}
async function launch(type) {
  await click(page, '#entryLauncherBtn');
  await click(page, `[data-launch-entry="${type}"]`);
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  server = await startServer();
  browser = await browserType.launch(launchOptions);
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(server.url);
  check(!(await page.locator('#entryLauncherBtn').isVisible()), 'Entry launcher is unavailable before login');
  await register(page, 'Проверка быстрой записи');
  for (const section of ['Today', 'Diary', 'Food', 'Stats']) {
    await click(page, '#nav' + section);
    check(await page.locator('#entryLauncherBtn').isVisible(), `Entry launcher is available from ${section}`);
  }
  for (const type of ['sugar', 'food', 'insulin', 'wellbeing']) {
    await launch(type);
    check(await page.locator(`#${type}Modal`).isVisible(), `Launcher opens the existing ${type} form`);
    check(new URL(page.url()).hash === '#stats', `${type} entry preserves the originating statistics section`);
    await page.keyboard.press('Escape');
    check(await page.locator('#entryLauncherBtn').evaluate((el) => document.activeElement === el), `${type} form returns keyboard focus to the launcher`);
  }
  await click(page, '#entryLauncherBtn');
  await page.locator('[data-launch-entry="wellbeing"]').focus();
  await page.keyboard.press('Tab');
  check(await page.locator('#entryLauncherModal [data-close]').evaluate((el) => document.activeElement === el), 'Keyboard focus stays within the picker');
  await page.keyboard.press('Escape');
  check(await page.locator('#entryLauncherBtn').evaluate((el) => document.activeElement === el), 'Escape from picker restores focus');

  await launch('sugar');
  await fill(page, 'sugarValueInput', '6.7');
  await page.keyboard.press('Escape');
  await launch('sugar');
  check(await page.locator('[data-resume-draft="sugar"]').isVisible(), 'Fast reopening offers the encrypted draft instead of losing it');
  await click(page, '[data-resume-draft="sugar"]');
  check((await page.locator('#sugarValueInput').inputValue()) === '6.7', 'Draft restores its exact value');
  await click(page, '#addSugarBtn');
  check(new URL(page.url()).hash === '#stats' && await page.locator('#pageStats').isVisible(), 'Saving an entry keeps statistics open');
  if (await page.locator('#statusMessage').isVisible()) await click(page, '#dismissStatus');
  await click(page, '#navDiary');
  check((await page.locator('#diaryTimeline .timeline-row').count()) === 1, 'The new entry is saved once');
  await page.locator('#diaryTimeline .entry-menu > summary').first().click();
  await click(page, '#diaryTimeline [data-edit="sugar"]');
  await fill(page, 'sugarValueInput', '6.8');
  await page.keyboard.press('Escape');
  await launch('sugar');
  await click(page, '[data-resume-draft="sugar"]');
  check((await page.locator('#sugarModalTitle').innerText()) === 'Изменить запись', 'Resuming an editing draft preserves its original record identity');
  await click(page, '#addSugarBtn');
  check((await page.locator('#diaryTimeline .timeline-row').count()) === 1, 'Saving a resumed edit does not create a duplicate record');

  await settings(page, 'appearance');
  await page.locator('#themeChoice').selectOption('dark');
  await page.locator('#largeTextChoice').check();
  await page.locator('#contrastChoice').check();
  await click(page, '#saveAppearanceBtn');
  await page.keyboard.press('Escape');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await click(page, '#navStats');
    const launcher = await page.locator('#entryLauncherBtn').boundingBox();
    check(launcher.x >= 0 && launcher.x + launcher.width <= width, `Launcher fits ${width}px with large text`);
    if (width <= 850) {
      const nav = await page.locator('.main-nav').boundingBox();
      check(launcher.y + launcher.height <= nav.y, `Launcher does not cover mobile navigation at ${width}px`);
    }
    await page.locator('#sugarChart [data-point]').first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.locator('#sugarChart [data-point]').first().click();
    check((await page.locator('#sugarChart [data-point]').first().getAttribute('aria-pressed')) === 'true', `Graph measurement remains reachable at ${width}px`);
    if (width <= 850) {
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const footer = await page.locator('#appMain .pages > footer').boundingBox();
      const button = await page.locator('#entryLauncherBtn').boundingBox();
      check(footer.y + footer.height <= button.y, `Last content can be scrolled above the launcher at ${width}px`);
    }
    await click(page, '#entryLauncherBtn');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Picker fits ${width}px with large text and high contrast`);
    await page.screenshot({ path: path.join(output, `entry-launcher-${width}.png`), fullPage: false });
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 320, height: 480 });
  await launch('sugar');
  check(!(await page.locator('#entryLauncherBtn').isVisible()), 'Floating launcher is hidden while the entry sheet owns the screen');
  const content = await page.locator('#sugarModal .modal-content').boundingBox();
  check(content.y >= 0 && content.y + content.height <= 481, 'Entry sheet fits the reduced visual viewport');
  await fill(page, 'sugarValueInput', '7.1');
  await page.locator('#addSugarBtn').scrollIntoViewIfNeeded();
  check(await page.locator('#addSugarBtn').evaluate((el) => { const box = el.getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight; }), 'Save action can be reached in a short mobile viewport');
  await page.keyboard.press('Escape');
  await settings(page, 'data');
  await click(page, '#lockDiaryBtn');
  check(!(await page.locator('#entryLauncherBtn').isVisible()), 'Lock hides the launcher');
  await page.locator('#entryLauncherBtn').evaluate((el) => el.click());
  check(!(await page.locator('#entryLauncherModal').isVisible()), 'Locked session rejects a programmatic launcher action');
  check(errors.length === 0, 'No runtime errors in quick entry workflow');
  await fs.writeFile(path.join(output, 'entry-launcher-results.json'), JSON.stringify({ checks, errors }, null, 2));
})().catch(async (error) => {
  console.error(error);
  await page?.screenshot({ path: path.join(output, 'entry-launcher-failure.png'), fullPage: true }).catch(() => {});
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
  await server?.stop();
});
