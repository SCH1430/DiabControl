/* Content and design regression checks, isolated offline profiles and synthetic records. */
const assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  path = require('node:path');
const { pathToFileURL } = require('node:url');
const { browserType: chromium, launchOptions, output, reveal } = require('./support.cjs');
const root = path.resolve(__dirname, '..'),
  out = output,
  url = pathToFileURL(path.join(root, 'index.html')).href;
let browser,
  page,
  checks = 0;
const errors = [],
  requests = [],
  password = 'content-test-password';
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log('PASS ' + label);
};
async function settle() {
  await page.waitForFunction(() => !document.body.hasAttribute('aria-busy'));
}
async function click(s) {
  await reveal(page, s);
  await page.locator(s).click();
  await settle();
}
async function fill(id, value) {
  await reveal(page, '#' + id);
  await page.locator('#' + id).fill(String(value));
}
async function close() {
  await page.keyboard.press('Escape');
}
async function nav(n) {
  await click('#nav' + n);
}
async function settings(n) {
  await click('#profileBtn');
  await click(`[data-settings="${n}"]`);
}
async function login(pass = password) {
  await fill('loginUsername', 'Дизайн');
  await fill('loginPassword', pass);
  await click('#loginBtn');
}
async function savedDraft(type) {
  await page.waitForFunction(
    (t) => document.getElementById(t + 'DraftStatus').textContent.includes('зашифрован'),
    type,
  );
}
async function addSugar(value, previous = false) {
  await nav('Today');
  await click('#quickSugar');
  await fill('sugarValueInput', value);
  await page.locator('#sugarDetails summary').click();
  if (previous) {
    const day = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() - 8);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await fill('sugarDateInput', day);
  } else {
    await page.locator('#sugarTag').selectOption('before');
    await fill('sugarNote', 'Контекст последнего измерения');
  }
  await click('#addSugarBtn');
}
(async () => {
  await fs.mkdir(out, { recursive: true });
  browser = await chromium.launch(launchOptions);
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    timezoneId: 'Europe/Moscow',
    acceptDownloads: true,
  });
  await ctx.setOffline(true);
  page = await ctx.newPage();
  await page.clock.install();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await page.goto(url);
  await click('#switchToRegister');
  await fill('regUsername', 'Дизайн');
  await fill('regPassword', password);
  await fill('regPasswordConfirm', password);
  await click('#registerBtn');
  await click('#setupSkip');
  check(
    (await page.locator('#todayTimeline').innerText()).includes('Начните с измерения'),
    'Empty state explains first action',
  );
  await click('#quickSugar');
  await fill('sugarValueInput', 5.8);
  await savedDraft('sugar');
  await close();
  check(
    (await page.locator('#draftNudge').innerText()).includes('Глюкоза'),
    'Unsaved entry has visible resume shortcut',
  );
  const raw = await page.evaluate(() => localStorage.getItem('diab_vaults_v2'));
  check(raw.includes('drafts') && !raw.includes('sugarValueInput'), 'Draft content is encrypted at rest');
  await click('#logoutBtn');
  await login();
  await click('#quickSugar');
  await click('[data-resume-draft="sugar"]');
  check((await page.locator('#sugarValueInput').inputValue()) === '5.8', 'Draft survives logout and login');
  await click('#addSugarBtn');
  check(
    (await page.locator('#statusText').innerText()).includes('5.8') &&
      (await page.locator('#editToastBtn').isVisible()),
    'Save confirmation names the value and offers edit',
  );
  await click('#editToastBtn');
  await fill('sugarValueInput', 5.9);
  await click('#addSugarBtn');
  check(
    (await page.locator('#lastSugarValue').innerText()).includes('5.9'),
    'Confirmation edit changes the actual record',
  );
  check(await page.locator('#draftNudge').isHidden(), 'Saved draft removed');
  await addSugar(7, true);
  await addSugar(6.1);
  check(
    (await page.locator('#lastSugarContext').innerText()).includes('До еды') &&
      (await page.locator('#lastSugarContext').innerText()).includes('Контекст'),
    'Last measurement displays its context',
  );
  await click('#quickSugar');
  await page.locator('#sugarDetails summary').click();
  check(
    (await page.locator('#sugarRecentTags [data-quick-tag="before"]').count()) === 1,
    'Frequently used tags available',
  );
  await close();
  await click('#pageToday [data-add="wellbeing"]');
  await page.locator('#wellbeingKind').selectOption('activity');
  await fill('wellbeingTitle', 'Прогулка в парке');
  await fill('wellbeingNote', 'Спокойный темп');
  await click('#addWellbeingBtn');
  await nav('Diary');
  await fill('diarySearch', 'парке');
  check(
    (await page.locator('#diaryTimeline .timeline-row').count()) === 1 &&
      (await page.locator('#diaryTimeline').innerText()).includes('Прогулка'),
    'Diary finds text-only activity',
  );
  await fill('diarySearch', 'Спокойный');
  check((await page.locator('#diaryTimeline .timeline-row').count()) === 1, 'Diary searches notes');
  await fill('diarySearch', '');
  await page.locator('#diaryPeriod').selectOption('all');
  check((await page.locator('#diaryTimeline .timeline-day').count()) === 2, 'Diary groups different days');
  const noteRow = page.locator('#diaryTimeline [data-record-type="wellbeing"]').first();
  await noteRow.locator('.entry-menu summary').click();
  await noteRow.locator('[data-edit]').click();
  await fill('wellbeingTitle', 'Прогулка в саду');
  await click('#addWellbeingBtn');
  check(
    (await page.locator('#diaryTimeline').innerText()).includes('Прогулка в саду'),
    'Text-only entries can be edited',
  );
  await nav('Food');
  await fill('foodSearch', 'Домашняя каша');
  await click('[data-create-food]');
  check(
    (await page.locator('#foodName').inputValue()) === 'Домашняя каша',
    'Empty search creates a named template',
  );
  await fill('foodWeight', 150);
  await page.locator('#recipeMode').evaluate((e) => (e.closest('details').open = true));
  await page.locator('#recipeMode').check();
  let ingredients = page.locator('.ingredient-row');
  await ingredients.nth(0).locator('[data-ingredient="name"]').fill('Крупа');
  await ingredients.nth(0).locator('[data-ingredient="weight"]').fill('100');
  await ingredients.nth(0).locator('[data-ingredient="carbsPer100"]').fill('60');
  await ingredients.nth(0).locator('[data-ingredient="source"]').selectOption('label');
  await click('#addIngredientBtn');
  await ingredients.nth(1).locator('[data-ingredient="name"]').fill('Вода');
  await ingredients.nth(1).locator('[data-ingredient="weight"]').fill('200');
  await ingredients.nth(1).locator('[data-ingredient="carbsPer100"]').fill('0');
  await fill('recipeYield', 300);
  await fill('foodPortions', '100; 150; 200');
  check(
    (await page.locator('#foodLiveResult').innerText()).includes('30 г углеводов'),
    'Recipe computes portion from ingredients and finished weight',
  );
  await click('#saveFavoriteBtn');
  await click('[data-food-tab="favorites"]');
  check(
    (await page.locator('#foodLibrary').innerText()).includes('2 ингредиентов') &&
      (await page.locator('#foodLibrary').innerText()).includes('150 г'),
    'Template retains recipe and portions',
  );
  await click('#foodLibrary [data-use-food]');
  await click('[data-portion="200"]');
  check(
    (await page.locator('#foodLiveResult').innerText()).includes('40 г углеводов'),
    'Saved portion recalculates composed meal',
  );
  await page.locator('#foodDetails summary').click();
  await fill('foodNote', 'Секретная заметка про еду');
  await click('#addFoodBtn');
  await nav('Today');
  await click('#quickInsulin');
  await fill('insulinDose', 1);
  await fill('insulinName', 'Учебный препарат');
  await click('#addInsulinBtn');
  await click('#quickInsulin');
  check(
    (await page.locator('#insulinSuggestions option[value="Учебный препарат"]').count()) === 1,
    'Previously used insulin names suggested',
  );
  await close();
  await nav('Stats');
  check(
    (await page.locator('#sugarChart [data-event]').count()) === 2,
    'Chart shows food and insulin event markers',
  );
  await page.locator('#sugarChart [data-event]').first().press('Enter');
  check(
    (await page.locator('#chartSelection').innerText()).includes('Домашняя каша') &&
      (await page.locator('#sugarChart .selected-point').count()) === 1,
    'Chart event is keyboard selectable with visible selection',
  );
  await page.locator('#sugarChart [data-point]').first().click();
  check(
    (await page.locator('#sugarChart [data-point][aria-pressed="true"]').count()) === 1,
    'Selected measurement exposes pressed state',
  );
  await click('#previousPeriodBtn');
  check(
    (await page.locator('#periodComparison').innerText()).includes('1 измерение') &&
      (await page.locator('#periodComparison').innerText()).includes('Разница средних'),
    'Period comparison includes counts and measured difference',
  );
  await click('#pageStats [data-report]');
  await page.locator('.report-options summary').click();
  await fill('reportQuestions', 'Что обсудить на следующем приёме?');
  await fill('reportTopics', 'Записи после прогулок');
  await click('#saveReportNotesBtn');
  check(
    (await page.locator('#reportPreview').innerText()).includes('Что обсудить на следующем приёме?'),
    'Report includes saved visit questions',
  );
  const foodNote = page
    .locator('#reportNoteChoices label')
    .filter({ hasText: 'Секретная заметка про еду' })
    .locator('input');
  await foodNote.uncheck();
  check(
    !(await page.locator('#reportPreview').innerText()).includes('Секретная заметка про еду') &&
      (await page.locator('#reportPreview').innerText()).includes('Контекст последнего измерения'),
    'Report includes only selected notes',
  );
  const cd = page.waitForEvent('download');
  await click('#csvReportBtn');
  const cp = path.join(out, 'content-report.csv');
  await (await cd).saveAs(cp);
  const csv = await fs.readFile(cp, 'utf8');
  check(
    !csv.includes('Секретная заметка') && csv.includes('Прогулка в саду') && csv.includes('Спокойный темп'),
    'CSV honors note selection and includes text entries',
  );
  await page.pdf({
    path: path.join(out, 'content-report.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await close();
  await settings('appearance');
  await page.locator('#themeChoice').selectOption('dark');
  await page.locator('#largeTextChoice').check();
  await page.locator('#contrastChoice').check();
  check((await page.locator('html').getAttribute('data-theme')) === 'dark', 'Theme previews immediately');
  await page.locator('#showSummary').uncheck();
  await click('#saveAppearanceBtn');
  await close();
  await nav('Today');
  check(
    (await page.locator('#homeSummary').isHidden()) && (await page.locator('#quickSugar').isVisible()),
    'Home composition hides optional summary and keeps input actions',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator('#statusMessage').isVisible()) await click('#dismissStatus');
  await page.screenshot({ path: path.join(out, 'content-mobile-dark-large.png'), fullPage: true });
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Dark large-text home fits mobile',
  );
  await click('#quickSugar');
  await page.screenshot({ path: path.join(out, 'content-form-dark.png'), fullPage: true });
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Large-text form fits mobile',
  );
  await close();
  await nav('Stats');
  await click('#pageStats [data-report]');
  check(
    (await page.locator('#reportPreview').innerText()).includes('Что обсудить на следующем приёме?'),
    'Visit questions persist across report sessions',
  );
  await page.emulateMedia({ media: 'print' });
  check(
    (await page
      .locator('#reportChart svg text')
      .first()
      .evaluate((e) => getComputedStyle(e).fill)) === 'rgb(34, 34, 34)',
    'Dark theme prints chart labels in readable black',
  );
  check(
    (await page
      .locator('#reportChart svg')
      .evaluate((e) => e.getBoundingClientRect().height / e.getBoundingClientRect().width)) < 0.5,
    'Printed report chart keeps its aspect ratio on mobile',
  );
  await page.pdf({
    path: path.join(out, 'content-dark-report.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: 'screen' });
  await close();
  await settings('appearance');
  await page.locator('#themeChoice').selectOption('light');
  await close();
  check(
    (await page.locator('html').getAttribute('data-theme')) === 'dark',
    'Closing preview restores saved theme',
  );
  await page.reload();
  await login();
  check(
    (await page.locator('html').getAttribute('data-theme')) === 'dark' &&
      (await page.locator('html').evaluate((e) => e.classList.contains('large-text'))),
    'Theme, contrast and text size persist after reload',
  );
  await settings('appearance');
  await page.locator('#largeTextChoice').uncheck();
  await page.locator('#contrastChoice').uncheck();
  await page.locator('#themeChoice').selectOption('light');
  await page.locator('#showSummary').check();
  await click('#saveAppearanceBtn');
  await close();
  await nav('Food');
  await click('[data-food-tab="favorites"]');
  await click('#foodLibrary [data-use-food]');
  await fill('foodName', 'Черновик рецепта');
  await savedDraft('food');
  await close();
  await settings('data');
  await fill('currentPassword', password);
  await fill('newPassword', 'new-content-password');
  await fill('confirmPassword', 'new-content-password');
  await click('#changePasswordBtn');
  await close();
  await settings('data');
  await click('#lockDiaryBtn');
  await login('new-content-password');
  await nav('Food');
  await click('#pageFood [data-add="food"]');
  await click('[data-resume-draft="food"]');
  check(
    (await page.locator('#foodName').inputValue()) === 'Черновик рецепта' &&
      (await page.locator('.ingredient-row').count()) === 2,
    'Recipe draft survives password change with ingredients',
  );
  await close();
  await settings('data');
  await page.locator('#lockMinutes').selectOption('1');
  await click('#saveAccessBtn');
  await close();
  await nav('Today');
  await click('#quickSugar');
  await fill('sugarValueInput', 8.2);
  await savedDraft('sugar');
  await page.clock.fastForward(80000);
  check(await page.locator('#appMain').isHidden(), 'Autolock closes an unfinished form');
  await login('new-content-password');
  await click('#quickSugar');
  await click('[data-resume-draft="sugar"]');
  check(
    (await page.locator('#sugarValueInput').inputValue()) === '8.2',
    'Encrypted draft survives automatic locking',
  );
  await close();
  await settings('data');
  const dl = page.waitForEvent('download');
  await click('#exportBtn');
  const bp = path.join(out, 'content-backup.json');
  await (await dl).saveAs(bp);
  await click('#importBtn');
  await page.locator('#restoreFile').setInputFiles(bp);
  await fill('restoreName', 'Восстановлено');
  await fill('restorePassword', 'new-content-password');
  await click('#previewRestoreBtn');
  check(
    (await page.locator('#restorePreview').innerText()).includes('Самочувствие: 1'),
    'Backup preview includes new record type',
  );
  await click('#restoreSubmitBtn');
  await click('#quickSugar');
  await click('[data-resume-draft="sugar"]');
  check((await page.locator('#sugarValueInput').inputValue()) === '8.2', 'Backup restores encrypted drafts');
  await close();
  await settings('data');
  await page.evaluate(() => {
    window.oldSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
  });
  const qd = page.waitForEvent('download');
  await click('#exportBtn');
  check(!!(await qd), 'Backup still downloads when storage is full');
  await page.evaluate(() => (Storage.prototype.setItem = window.oldSet));
  await close();
  await nav('Food');
  await click('[data-food-tab="favorites"]');
  await click('#foodLibrary [data-use-food]');
  await page.locator('#recipeMode').evaluate((e) => (e.closest('details').open = true));
  await fill('recipeYield', 1);
  await click('#addFoodBtn');
  check(
    (await page.locator('#foodModal').isVisible()) &&
      (await page.locator('#foodForm').innerText()).includes('допустимо'),
    'Impossible recipe composition cannot be saved',
  );
  await close();
  await nav('Diary');
  await fill('diarySearch', 'Секретная заметка');
  check(
    (await page.locator('#diaryTimeline .timeline-row').count()) === 1,
    'Report exclusions never remove original notes',
  );
  await fill('diarySearch', '');
  await page.screenshot({ path: path.join(out, 'content-mobile-diary.png'), fullPage: true });
  await settings('help');
  check(
    (await page.locator('#settingsHelp details').count()) === 5,
    'Help explains records, transfer, backup verification, reports and recipes',
  );
  await close();
  const labels = await page
    .locator('input,select,textarea')
    .evaluateAll((ns) =>
      ns.filter((e) => !e.labels?.length && !e.getAttribute('aria-label')).map((e) => e.id),
    );
  check(labels.length === 0, 'New controls have accessible labels');
  check(errors.length === 0, 'No runtime errors: ' + errors.join(';'));
  check(requests.length === 0, 'All features work offline');
  await fs.writeFile(
    path.join(out, 'content-results.json'),
    JSON.stringify({ checks, status: 'passed' }, null, 2),
  );
  console.log(`${checks} content checks passed.`);
  await ctx.close();
})()
  .catch(async (e) => {
    console.error(e);
    await page?.screenshot({ path: path.join(out, 'content-failure.png'), fullPage: true }).catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => browser?.close());
