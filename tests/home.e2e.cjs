/* Home redesign: real encrypted saves, draft safety, CSV round trips and mobile layout. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { browserType, launchOptions, output } = require('./support.cjs');
const { click, fill, register, login, settings, sugar, password, upload } = require('./ui.cjs');
const vault = require('../src/crypto.js');
const name = 'Спокойный дневник';
let browser, page, checks = 0;
const errors = [];
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log('PASS ' + message);
}
async function content() {
  const record = await page.evaluate((n) => JSON.parse(localStorage.getItem('diab_vaults_v2')).accounts[n], name);
  return (await vault.decrypt(record, password)).content;
}
async function close() { await page.keyboard.press('Escape'); }
async function preset(key, note) {
  await click(page, `[data-wellbeing-preset="${key}"]`);
  await fill(page, 'wellbeingNote', note);
  await click(page, '#addWellbeingBtn');
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Moscow', reducedMotion: 'reduce', acceptDownloads: true });
  await context.setOffline(true);
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
  await register(page, name);
  check((await page.locator('#homeWeekSummary').innerText()).includes('0 из 7'), 'Empty week never invents data');
  check(await page.locator('#homeGlucoseRange').textContent() === '', 'Empty profile does not show a fabricated glucose marker');
  check(await page.locator('#homeCreateDish').isVisible(), 'Empty favorites offer a real creation action');
  await preset('sleep', 'Спал восемь часов');
  const first = await content();
  check(first.wellbeing.length === 1 && first.wellbeing[0].context === 'sleep', 'Sleep shortcut saves a real encrypted record with its context');
  check((await page.locator('#homeWeekSummary').innerText()).includes('1 из 7'), 'Week counts unique days with records');
  check((await page.locator('#homeWeekSummary').innerText()).includes('7 дней без измерений'), 'Wellbeing records do not count as glucose measurements');
  await click(page, '[data-wellbeing-preset="stress"]');
  await fill(page, 'wellbeingNote', 'Сохранить незаконченный текст');
  await close();
  await click(page, '[data-wellbeing-preset="walk"]');
  check(await page.locator('#wellbeingDraft').isVisible(), 'Shortcut offers existing draft without replacing it');
  await click(page, '[data-resume-draft="wellbeing"]');
  check(await page.locator('#wellbeingContext').inputValue() === 'stress', 'Encrypted draft restores context');
  check(await page.locator('#wellbeingNote').inputValue() === 'Сохранить незаконченный текст', 'Encrypted draft retains prior text');
  await click(page, '#addWellbeingBtn');
  await preset('walk', 'После прогулки чувствую себя бодрее.');
  check((await content()).wellbeing.at(-1).kind === 'activity', 'Walk is recorded as activity');
  await click(page, '#homeWellbeingPreview [data-home-topic]');
  const topics = (await content()).reportNotes.topics;
  await click(page, '#homeWellbeingPreview [data-home-topic]');
  check((await content()).reportNotes.topics === topics, 'Adding the same observation to report does not duplicate it');
  await click(page, '#homeQuestionsBtn');
  await fill(page, 'reportQuestions', 'Какие наблюдения лучше записывать?');
  await click(page, '#saveReportNotesBtn');
  check((await page.locator('#reportPreview').innerText()).includes('Самочувствие · Сон'), 'Report includes the new context');
  const downloadPromise = page.waitForEvent('download');
  await click(page, '#csvReportBtn');
  const download = await downloadPromise;
  const csv = await fs.readFile(await download.path(), 'utf8');
  check(csv.includes('Активность · Прогулка') && csv.includes('Самочувствие · Сон'), 'CSV preserves wellbeing context');
  await close();
  check((await page.locator('#homeVisitPreview').innerText()).includes('Какие наблюдения'), 'Saved report questions appear on Today');
  await settings(page, 'data');
  await click(page, '#csvImportBtn');
  await page.locator('#csvImportFile').setInputFiles({ name: 'observations.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.waitForSelector('#csvMappingForm:not(.hidden)');
  await click(page, '#csvMappingForm button[type="submit"]');
  check((await page.locator('#csvImportPreview').innerText()).includes('Точных повторов пропущено: 3'), 'CSV round trip recognizes context-bearing duplicates');
  await close();
  await click(page, '#navToday');
  const today = await page.locator('#homeWeekDays [aria-current="date"]').getAttribute('data-home-day');
  await click(page, '#homeWeekDays [aria-current="date"]');
  check(await page.locator('#pageDiary').isVisible() && await page.locator('#diaryDate').inputValue() === today, 'Week day opens the matching diary date');
  await sugar(page);
  check((await page.locator('#homeGlucoseRange [role="img"]').getAttribute('aria-label')).includes('6.2'), 'Glucose scale describes the actual saved measurement');
  const scale = await page.locator('#homeGlucoseRange').evaluate(host => ({
    marker: parseFloat(host.querySelector('.glucose-scale-marker').style.left),
    start: parseFloat(host.querySelector('.glucose-scale-target').style.left),
    state: host.dataset.state,
  }));
  check(Math.abs(scale.marker - 6.2 / 12 * 100) < 0.01 && scale.marker > scale.start && scale.state === 'range', 'Glucose marker and target share a labelled linear scale');
  check((await page.locator('#homeWeekSummary').innerText()).includes('6 дней без измерений'), 'Week distinguishes measurement coverage from other entries');
  await click(page, '#homeWeekStats');
  check(await page.locator('#pageStats').isVisible(), 'Week opens its matching chart range');
  await click(page, '#chartRecords > summary');
  await click(page, '#chartRecordList button');
  check(await page.locator('#chartRecordList button').getAttribute('aria-pressed') === 'true', 'Chart and record list share a selected state');
  await click(page, '#navToday');
  await click(page, '#homeCreateDish');
  await fill(page, 'foodName', 'Овсянка');
  await fill(page, 'foodWeight', '150');
  await fill(page, 'foodCarbsPer100', '12');
  await page.locator('#foodPortions').evaluate((element) => { element.closest('details').open = true; });
  await fill(page, 'foodPortions', '100; 200');
  await upload(page, 'food');
  await click(page, '#saveFavoriteBtn');
  await page.waitForFunction(() => document.querySelector('#homeDishList img')?.naturalWidth > 0);
  check(await page.locator('#homeDishList [data-home-dish]').count() === 3, 'Home offers favorite portions and decrypted photo');
  await click(page, '#homeDishList [data-weight="200"]');
  check(await page.locator('#foodWeight').inputValue() === '200', 'Favorite portion prefills the requested weight');
  check((await page.locator('#foodLiveResult').innerText()).includes('24 г'), 'Favorite shortcut recalculates carbs for the selected portion');
  await click(page, '#addFoodBtn');
  check((await content()).food[0].photoIds.length === 1, 'Favorite shortcut retains photo references');
  await settings(page, 'appearance');
  await page.locator('#motionChoice').uncheck();
  await page.locator('#showDishes').uncheck();
  await click(page, '#saveAppearanceBtn');
  await close();
  check(await page.locator('#homeDishes').isHidden(), 'Optional home cards can be hidden');
  await click(page, '#logoutBtn');
  check(await page.locator('#homeWellbeingPreview').textContent() === '' && await page.locator('#homeVisitPreview').textContent() === '' && await page.locator('#homeDishList').textContent() === '' && await page.locator('#homeGlucoseRange').textContent() === '', 'Lock clears all new private home content including the glucose scale');
  await login(page, name);
  check(await page.locator('html').evaluate((el) => el.classList.contains('reduce-motion')), 'Motion preference persists across login');
  check(await page.locator('#homeDishes').isHidden(), 'Home visibility persists across login');
  const raw = await page.evaluate(() => localStorage.getItem('diab_vaults_v2'));
  check(!raw.includes('Спал восемь часов') && !raw.includes('Какие наблюдения'), 'New content is never stored as plaintext');
  await settings(page, 'appearance');
  await page.locator('#showDishes').check();
  await page.locator('#motionChoice').check();
  await click(page, '#saveAppearanceBtn');
  await close();
  await click(page, '#quickSugar');
  check(await page.evaluate(() => document.getAnimations().length) === 0, 'System reduced motion suppresses scripted and CSS animations');
  await close();
  await page.screenshot({ path: path.join(output, 'calm-home-desktop.png'), fullPage: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await settings(page, 'appearance');
    await page.locator('#themeChoice').selectOption('dark');
    await page.locator('#largeTextChoice').check();
    await page.locator('#contrastChoice').check();
    await click(page, '#saveAppearanceBtn');
    await close();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Home fits ${width}px with dark theme, large text and high contrast`);
    if (width === 390) await page.screenshot({ path: path.join(output, 'calm-home-mobile-dark.png'), fullPage: true });
  }
  check(errors.length === 0, 'No runtime errors: ' + errors.join('; '));
  console.log(`\n${checks} home redesign checks passed.`);
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
