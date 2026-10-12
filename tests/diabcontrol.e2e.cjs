/* End-to-end tests use disposable browser profiles and synthetic data only. */
const assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  path = require('node:path');
const { pathToFileURL } = require('node:url');
const { browserType: chromium, launchOptions, output, reveal } = require('./support.cjs');
const root = path.resolve(__dirname, '..'),
  url = pathToFileURL(path.join(root, 'index.html')).href,
  out = output;
let browser,
  page,
  checks = 0;
const errors = [],
  requests = [];
const password = 'test-password-2026',
  newPassword = 'updated-password-2026';
function check(ok, message) {
  assert.ok(ok, message);
  checks++;
  console.log('PASS ' + message);
}
async function settle(p = page) {
  await p.waitForFunction(() => !document.body.hasAttribute('aria-busy'));
}
async function click(selector, p = page) {
  await reveal(p, selector);
  await p.locator(selector).click();
  await settle(p);
}
async function fill(id, value, p = page) {
  await reveal(p, '#' + id);
  await p.locator('#' + id).fill(String(value));
}
async function close(p = page) {
  await p.keyboard.press('Escape');
}
async function nav(name, p = page) {
  await click('#nav' + name, p);
}
async function settings(tab = 'basic', p = page) {
  await click('#profileBtn', p);
  await click(`[data-settings="${tab}"]`, p);
}
async function login(name, pass = password, p = page) {
  await fill('loginUsername', name, p);
  await fill('loginPassword', pass, p);
  await click('#loginBtn', p);
}
async function register(name, p = page) {
  await click('#switchToRegister', p);
  await fill('regUsername', name, p);
  await fill('regPassword', password, p);
  await fill('regPasswordConfirm', password, p);
  await p.locator('#regDiabType').selectOption('2');
  await click('#registerBtn', p);
}
async function sugar(value, p = page) {
  await nav('Today', p);
  await click('#quickSugar', p);
  await fill('sugarValueInput', value, p);
  await click('#addSugarBtn', p);
}
async function calc(p = page) {
  await nav('Food', p);
  await fill('calcWeight', 100, p);
  await fill('calcCarbsPer100', 12, p);
  await click('#calcXEBtn', p);
  return p.locator('#calcXEResult').textContent();
}
async function restore(file, name, pass = password, p = page) {
  await p.locator('#restoreFile').setInputFiles(file);
  await fill('restoreName', name, p);
  await fill('restorePassword', pass, p);
  await click('#previewRestoreBtn', p);
}
async function entryMenu(type, p = page) {
  const row = p.locator(`#diaryTimeline [data-record-type="${type}"]`).first();
  await row.locator('.entry-menu summary').click();
  return row;
}
(async () => {
  await fs.mkdir(out, { recursive: true });
  browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    timezoneId: 'Europe/Moscow',
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await context.setOffline(true);
  page = await context.newPage();
  await page.clock.install();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await page.goto(url);
  await click('#publicEmergencyBtn');
  await click('#emergencyUnknownBtn');
  check(
    (await page.locator('#emergencyUnconsciousResult').innerText()).includes('дыхание'),
    'Emergency accessible before login',
  );
  await close();
  await register('Мария');
  check(await page.locator('#onboardingModal').isVisible(), 'New profile opens setup wizard');
  await click('#setupNext');
  await fill('setupCarbs', 12);
  await click('#setupNext');
  await fill('setupPhone', '+7 999 123-45-67');
  await click('#setupNext');
  check(
    (await page.locator('#onboardingModal').isHidden()) &&
      (await page.locator('#diabTypeBadge').innerText()) === 'Тип 2',
    'Wizard saves and opens Today',
  );
  check(
    (await page.locator('#pageToday').isVisible()) && (await page.locator('#foodModal').isHidden()),
    'Home contains quick actions instead of long forms',
  );
  check(!(await calc()).includes('ЕД'), 'No automatic insulin coefficient');
  await settings('calc');
  await fill('profileInsulinPerXE', 0);
  await page.locator('#profileDoseConfirmed').check();
  await click('#saveProfileBtn');
  check((await calc()).includes('0 ЕД'), 'Zero coefficient retained');
  await settings('calc');
  await fill('profileInsulinPerXE', 2);
  await click('#saveProfileBtn');
  check((await calc()).includes('2 ЕД'), 'Confirmed personal arithmetic');
  await click('#calcToFoodBtn');
  check(
    (await page.locator('#foodWeight').inputValue()) === '100' &&
      (await page.locator('#foodCarbsPer100').inputValue()) === '12',
    'Calculator transfers inputs to food',
  );
  await fill('foodName', 'Овсяная каша');
  await click('#saveFavoriteBtn');
  await page.locator('#foodDetails summary').click();
  await fill('foodNote', 'После прогулки');
  await page.locator('#foodTag').selectOption('activity');
  await click('#addFoodBtn');
  check(await page.locator('#foodModal').isHidden(), 'Food saves from short form');
  await click('[data-food-tab="favorites"]');
  check((await page.locator('#foodLibrary').innerText()).includes('Овсяная каша'), 'Favorite meal saved');
  await click('#foodLibrary [data-use-food]');
  check((await page.locator('#foodName').inputValue()) === 'Овсяная каша', 'Favorite pre-fills name');
  await fill('foodWeight', 200);
  check(
    (await page.locator('#foodLiveResult').innerText()).includes('24 г углеводов'),
    'Portion recalculates carbs live',
  );
  await click('#addFoodBtn');
  await fill('foodSearch', 'несуществующее');
  check(
    (await page.locator('#foodLibrary').innerText()).includes('Ничего не найдено'),
    'Meal search filters results',
  );
  await fill('foodSearch', '');
  await page.locator('#foodLibrary .entry-menu summary').click();
  await click('#foodLibrary [data-edit-favorite]');
  await fill('foodWeight', 150);
  await click('#saveFavoriteBtn');
  check((await page.locator('#foodLibrary').innerText()).includes('150 г'), 'Favorite template editable');
  await sugar(6.2);
  await sugar(7.1);
  check((await page.locator('#lastSugarValue').innerText()).includes('7.1'), 'Last measurement displayed');
  await click('#quickInsulin');
  await fill('insulinDose', 2);
  await fill('insulinName', 'Тестовый препарат');
  await click('#addInsulinBtn');
  await nav('Diary');
  check(
    (await page.locator('#diaryTimeline [data-record-type="sugar"]').count()) === 2 &&
      (await page.locator('#diaryTimeline [data-record-type="food"]').count()) === 2 &&
      (await page.locator('#diaryTimeline [data-record-type="insulin"]').count()) === 1,
    'Unified timeline includes three record types',
  );
  check(
    (await page.locator('#diaryTimeline').textContent()).includes('После прогулки'),
    'Notes preserved in timeline details',
  );
  let row = await entryMenu('sugar');
  await row.locator('[data-edit]').click();
  await fill('sugarValueInput', 6.5);
  await click('#addSugarBtn');
  check((await page.locator('#diaryTimeline').innerText()).includes('6.5'), 'Edit persists measurement');
  row = await entryMenu('insulin');
  await row.locator('[data-delete]').click();
  await click('#confirmDeleteBtn');
  check(
    (await page.locator('#diaryTimeline [data-record-type="insulin"]').count()) === 0,
    'Confirmed deletion',
  );
  await click('#undoBtn');
  check(
    (await page.locator('#diaryTimeline [data-record-type="insulin"]').count()) === 1,
    'Undo restores deleted record',
  );
  await page.locator('#diaryType').selectOption('food');
  check((await page.locator('#diaryTimeline .timeline-row').count()) === 2, 'Timeline type filter');
  await page.locator('#diaryType').selectOption('all');
  await page.locator('#diaryPeriod').selectOption('date');
  await fill('diaryDate', '2000-01-01');
  await page.locator('#diaryDate').dispatchEvent('change');
  check((await page.locator('#diaryTimeline .timeline-row').count()) === 0, 'Timeline date filter');
  await page.locator('#diaryPeriod').selectOption('today');
  await nav('Stats');
  check(
    (await page.locator('#periodStats').innerText()).includes('2'),
    'Period statistics count measurements',
  );
  await click('#sugarUnitMgdl');
  check(
    (await page.locator('#sugarChart [data-point]').first().getAttribute('aria-label')).includes('мг/дл'),
    'Graph points convert to mg/dl',
  );
  await page.locator('#sugarChart [data-point]').first().press('Enter');
  check((await page.locator('#chartSelection').innerText()).includes('мг/дл'), 'Graph keyboard selection');
  await click('#expandChartBtn');
  check((await page.locator('#expandedChart svg').count()) === 1, 'Chart expands');
  await page.locator('#expandedChart [data-point]').first().click();
  check(
    (await page.locator('#expandedSelection').innerText()).includes('мг/дл'),
    'Expanded chart interactive',
  );
  await close();
  await click('#sugarUnitMmol');
  await fill('statsFrom', '2000-01-01');
  await fill('statsTo', '2000-01-02');
  await page.locator('#statsTo').dispatchEvent('change');
  check(
    (await page.locator('#sugarChart > svg').count()) === 0 &&
      await page.locator('#sugarChart .empty-state').isVisible() &&
      (await page.locator('#periodStats').innerText()).includes('0'),
    'Graph and summary share selected period',
  );
  await click('[data-chart-period="7"]');
  await page.locator('#pageStats [data-report]').click();
  check(
    (await page.locator('#reportPreview tbody tr').count()) === 5,
    'Report includes all selected records',
  );
  check(
    (await page.locator('#reportPreview').innerText()).includes('После прогулки'),
    'Report includes notes',
  );
  await page.evaluate(() => {
    window.print = () => {
      window.printInvoked = true;
    };
  });
  await click('#printReportBtn');
  check(await page.evaluate(() => window.printInvoked), 'PDF button opens browser print workflow');
  const csvDownload = page.waitForEvent('download');
  await click('#csvReportBtn');
  const csvFile = path.join(out, 'report.csv');
  await (await csvDownload).saveAs(csvFile);
  const csv = await fs.readFile(csvFile, 'utf8');
  check(
    csv.includes('Овсяная каша') && csv.includes('После прогулки') && csv.includes('ЕД'),
    'CSV includes data and units',
  );
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: path.join(out, 'report-print.png'), fullPage: true });
  await page.pdf({
    path: path.join(out, 'report.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: 'screen' });
  check((await fs.stat(path.join(out, 'report.pdf'))).size > 10000, 'Printable report renders to PDF');
  await close();
  await nav('Today');
  if (await page.locator('#statusMessage').isVisible()) await click('#dismissStatus');
  await page.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Mobile Today has no horizontal overflow',
  );
  await page.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });
  await nav('Food');
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Mobile food layout fits',
  );
  await page.screenshot({ path: path.join(out, 'mobile-food.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await nav('Today');
  await click('#quickSugar');
  await fill('sugarValueInput', -1);
  await click('#addSugarBtn');
  check(
    (await page.locator('#sugarValueInput').getAttribute('aria-invalid')) === 'true',
    'Inline validation marks invalid field',
  );
  await fill('sugarValueInput', 6);
  await page.locator('#sugarValueInput').press('Enter');
  await settle();
  check(await page.locator('#sugarModal').isHidden(), 'Enter saves entry without login interference');
  await click('#quickSugar');
  await page.locator('#sugarDetails summary').click();
  await fill('sugarDateInput', '2000-01-01');
  await click('[data-now="sugar"]');
  check(
    (await page.locator('#sugarDateInput').inputValue()) !== '2000-01-01',
    'Now button refreshes date and time',
  );
  await close();
  await settings('calc');
  await fill('targetLowInput', 9);
  await fill('targetHighInput', 4);
  await click('#saveProfileBtn');
  check(
    (await page.locator('#targetHighInput').getAttribute('aria-invalid')) === 'true',
    'Inverted thresholds rejected inline',
  );
  await close();
  await settings('contacts');
  await fill('profileAddress', 'Тестовый адрес');
  await fill('profileNotes', 'Тестовая аллергия');
  await fill('profileLowSugarUnconsciousInstruction', 'Личная заметка');
  await click('#saveProfileBtn');
  await click('#emergencyBtn');
  await click('#emergencyConsciousBtn');
  await fill('emergencySugarValue', 3);
  await click('#emergencyEvaluateBtn');
  await click('#emergencyUnconsciousLowBtn');
  await click('[data-aid-breathing="normal"]');
  await page.locator('#aidProfileDetails > summary').click();
  await page.locator('#emergencyUnconsciousResult > details').last().locator('summary').click();
  const emergency = await page.locator('#emergencyModal').innerText();
  check(
    emergency.includes('Тестовый адрес') &&
      emergency.includes('Личная заметка') &&
      emergency.includes('Не давайте пищу'),
    'Emergency keeps profile and core guidance',
  );
  await close();
  await settings('data');
  const downloading = page.waitForEvent('download');
  await click('#exportBtn');
  const backupPath = path.join(out, 'test-backup.json');
  await (await downloading).saveAs(backupPath);
  check(
    (await page.locator('#backupInfo').innerText()).includes('Изменений после выгрузки: 0'),
    'Backup metadata records export and resets count',
  );
  const stored = await page.evaluate(() => localStorage.getItem('diab_vaults_v2'));
  check(
    !stored.includes('Тестовый адрес') && !stored.includes(password) && stored.includes('ciphertext'),
    'Diary and credentials encrypted at rest',
  );
  await click('#importBtn');
  await restore(backupPath, 'Копия', 'wrong');
  check(await page.locator('#restoreSubmitBtn').isHidden(), 'Wrong password cannot preview or import');
  await restore(backupPath, 'Копия');
  check(
    (await page.locator('#restorePreview').innerText()).includes('Шаблоны: 1') &&
      (await page.locator('#restoreSubmitBtn').isVisible()),
    'Restore preview shows records and templates',
  );
  check(
    (await page.evaluate(
      () => Object.keys(JSON.parse(localStorage.getItem('diab_vaults_v2')).accounts).length,
    )) === 1,
    'Preview does not modify storage',
  );
  await click('#restoreSubmitBtn');
  check((await page.locator('#userNameDisplay').innerText()) === 'Копия', 'Restore creates separate profile');
  await settings('data');
  await fill('currentPassword', 'wrong');
  await fill('newPassword', newPassword);
  await fill('confirmPassword', newPassword);
  await click('#changePasswordBtn');
  check(
    (await page.locator('#passwordForm').innerText()).includes('Неверный пароль'),
    'Password change verifies current password',
  );
  await fill('currentPassword', password);
  await click('#changePasswordBtn');
  check(
    (await page.locator('#statusText').innerText()).includes('Пароль изменён'),
    'Password change re-encrypts data',
  );
  await close();
  await click('#logoutBtn');
  await login('Копия', password);
  check(await page.locator('#appMain').isHidden(), 'Old password no longer opens live profile');
  await login('Копия', newPassword);
  check(await page.locator('#pageToday').isVisible(), 'New password opens preserved data');
  const before = await page.evaluate(() => localStorage.getItem('diab_vaults_v2'));
  await page.evaluate(() => {
    window.savedSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException('Quota', 'QuotaExceededError');
    };
  });
  await sugar(8);
  check(
    (await page.locator('#sugarModal').isVisible()) &&
      (await page.locator('#sugarForm').innerText()).includes('Не удалось сохранить'),
    'Failed write preserves input and shows error',
  );
  check(
    before === (await page.evaluate(() => localStorage.getItem('diab_vaults_v2'))),
    'Failed write leaves persisted data intact',
  );
  await page.evaluate(() => (Storage.prototype.setItem = window.savedSet));
  await close();
  await settings('data');
  await page.locator('#lockMinutes').selectOption('1');
  await click('#saveAccessBtn');
  await close();
  await page.clock.fastForward(80000);
  check(await page.locator('#appMain').isHidden(), 'Configured inactivity timer locks diary');
  check(
    (await page.locator('#todayTimeline').innerText()) === '' &&
      (await page.locator('#profileAddress').inputValue()) === '',
    'Autolock clears decrypted UI',
  );
  await login('Копия', newPassword);
  await click('#logoutBtn');
  await register('Новый профиль');
  await click('#setupSkip');
  check(!(await calc()).includes('ЕД'), 'New account does not inherit ratios');
  await click('#logoutBtn');
  await login('Мария');
  await page.reload();
  await login('Мария');
  check((await calc()).includes('2 ЕД'), 'Coefficients persist across reload');
  await click('[data-food-tab="favorites"]');
  check(
    (await page.locator('#foodLibrary').innerText()).includes('150 г'),
    'Favorites persist across reload',
  );
  const other = await context.newPage();
  await other.goto(url);
  await login('Мария', password, other);
  await sugar(9);
  await sugar(8, other);
  check(
    (await other.locator('#statusText').innerText()).includes('другой вкладке'),
    'Stale tab cannot overwrite data',
  );
  await other.close();
  const migration = await context.newPage();
  await migration.goto(url);
  await click('#restoreStartBtn', migration);
  await restore(path.join(__dirname, 'fixtures/v2-backup.json'), 'Версия 2', password, migration);
  await click('#restoreSubmitBtn', migration);
  check(
    (await migration.locator('#appMain').isVisible()) &&
      (await migration.locator('#onboardingModal').isHidden()),
    'Previous encrypted v2 backup migrates with no loss',
  );
  await click('#logoutBtn', migration);
  await migration.evaluate(() =>
    localStorage.setItem(
      'diab_users',
      JSON.stringify({
        Legacy: {
          password: 'old-pass',
          data: {
            profile: { diabType: '2', phones: [], carbsPerXE: 12, insulinPerXE: 0 },
            sugar: [{ value: 5, date: '2026-01-01', time: '10:00' }],
            food: [{ name: 'Старая еда', weight: 100, carbs: 12, carbsPer100: 12, type: 'короткие' }],
            insulin: [{ dose: 3, datetime: '2026-01-01T10:00' }],
          },
        },
      }),
    ),
  );
  await migration.reload();
  await login('Legacy', 'old-pass', migration);
  await nav('Diary', migration);
  await migration.locator('#diaryPeriod').selectOption('all');
  check(
    (await migration.locator('#diaryTimeline').innerText()).includes('ХЕ · уточните единицы'),
    'Legacy insulin units remain explicit',
  );
  check(
    (await migration.locator('#diaryTimeline').innerText()).includes('Старая еда'),
    'Undated legacy food retained',
  );
  check(
    (await migration.evaluate(() => localStorage.getItem('diab_users'))) === null,
    'Plaintext removed only after migration',
  );
  const labels = await page
    .locator('input,select,textarea')
    .evaluateAll((nodes) =>
      nodes.filter((e) => !e.labels?.length && !e.getAttribute('aria-label')).map((e) => e.id),
    );
  check(labels.length === 0, 'All inputs have accessible labels');
  check(requests.length === 0, 'No external resource requests');
  check(errors.length === 0, 'No browser runtime errors: ' + errors.join('; '));
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ checks, status: 'passed' }, null, 2));
  console.log(`\n${checks} checks passed.`);
  await context.close();
})()
  .catch(async (e) => {
    console.error(e);
    if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
  });
