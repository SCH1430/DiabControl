/* New exploration features: synthetic records, isolated offline contexts only. */
const assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  { pathToFileURL } = require('node:url');
const { browserType: chromium, launchOptions, output, reveal } = require('./support.cjs');
const root = path.resolve(__dirname, '..'),
  out = output,
  url = pathToFileURL(path.join(root, 'index.html')).href;
let browser,
  page,
  checks = 0;
const errors = [],
  requests = [],
  password = 'explore-test-password';
function check(ok, message) {
  assert.ok(ok, message);
  checks++;
  console.log('PASS ' + message);
}
async function settle(p = page) {
  await p.waitForFunction(() => !document.body.hasAttribute('aria-busy'), {}, { timeout: 120000 });
}
async function click(s, p = page) {
  await reveal(p, s);
  await p.locator(s).click();
  await settle(p);
}
async function fill(id, v, p = page) {
  await reveal(p, '#' + id);
  await p.locator('#' + id).fill(String(v));
}
async function close(p = page) {
  await p.keyboard.press('Escape');
}
async function nav(n, p = page) {
  await click('#nav' + n, p);
}
async function settings(n, p = page) {
  await click('#profileBtn', p);
  await click(`[data-settings="${n}"]`, p);
}
async function sugar(v, date, time) {
  await nav('Today');
  await click('#quickSugar');
  await fill('sugarValueInput', v);
  await page.locator('#sugarDetails summary').click();
  await fill('sugarDateInput', date);
  await fill('sugarTimeInput', time);
  await click('#addSugarBtn');
}
async function showAll() {
  await nav('Diary');
  await click('[data-diary-view="list"]');
  await page.locator('#diaryPeriod').selectOption('all');
  await fill('diarySearch', '');
}
async function importCSV(text, name) {
  await settings('data');
  await click('#csvImportBtn');
  await page
    .locator('#csvImportFile')
    .setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text) });
  await page.locator('#csvMappingForm').waitFor({ state: 'visible' });
  await settle();
  await click('#csvMappingForm button[type="submit"]');
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
  page.on('pageerror', (e) => errors.push(e.message));
  context.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  page.on('dialog', (d) => d.accept());
  await page.goto(url);
  await click('#switchToRegister');
  await fill('regUsername', 'Исследование');
  await fill('regPassword', password);
  await fill('regPasswordConfirm', password);
  await click('#registerBtn');
  await click('#setupSkip');
  await sugar(5.4, '2026-09-20', '08:00');
  await sugar(7.1, '2026-09-20', '13:00');
  await sugar(6.2, '2026-09-21', '08:00');
  await click('#quickTextBtn');
  await fill('quickTextInput', '21.09.2026 в 14:30 глюкоза 6,3, после еды');
  await click('#quickTextForm button');
  check(
    (await page.locator('#quickTextPreview').innerText()).includes('6.3'),
    'Natural text has preview with explicit value',
  );
  await click('#quickTextApply');
  check(
    (await page.locator('#sugarValueInput').inputValue()) === '6.3' &&
      (await page.locator('#sugarDateInput').inputValue()) === '2026-09-21',
    'Natural text fills date and value without saving',
  );
  await click('#addSugarBtn');
  for (const [text, modal, field, value] of [
    ['Введён инсулин 2 ЕД', 'insulinModal', 'insulinDose', '2'],
    ['Еда яблоко, 150 г, углеводы 12 г на 100 г', 'foodModal', 'foodWeight', '150'],
  ]) {
    await nav('Today');
    await click('#quickTextBtn');
    await fill('quickTextInput', text);
    await click('#quickTextForm button');
    await click('#quickTextApply');
    check(
      (await page.locator('#' + modal).isVisible()) &&
        (await page.locator('#' + field).inputValue()) === value,
      'Quick text reviews ' + modal,
    );
    await close();
  }
  await nav('Stats');
  await fill('statsFrom', '2026-09-20');
  await fill('statsTo', '2026-09-21');
  await page.locator('#statsTo').dispatchEvent('change');
  await click('[data-chart-view="3d"]');
  check(
    (await page.locator('#chart3d .space-point').count()) === 4,
    '3D uses exactly the four stored measurements',
  );
  const x = await page.locator('#chart3d .space-ring').getAttribute('cx');
  await page.locator('#chart3dYaw').fill('-60');
  await page.locator('#chart3dYaw').dispatchEvent('input');
  check(
    (await page.locator('#chart3d .space-ring').getAttribute('cx')) !== x,
    '3D rotation updates actual projection',
  );
  await page.locator('#chart3dPoint').selectOption({ index: 0 });
  check(
    (await page.locator('#chart3dSelection').innerText()).includes('5.4'),
    '3D keyboard selection shows precise value',
  );
  check(await page.locator('#chart2dLegend').isHidden(), '3D hides the unrelated 2D legend');
  if (await page.locator('#statusMessage').isVisible()) await click('#dismissStatus');
  await page.screenshot({ path: path.join(out, 'explore-3d-desktop.png'), fullPage: true });
  await fill('dayCompareA', '2026-09-20');
  await fill('dayCompareB', '2026-09-21');
  await page.locator('#dayCompareB').dispatchEvent('change');
  check(
    (await page.locator('#dayCompareChart [data-compare-point]').count()) === 4,
    'Day comparison has both days on shared axes',
  );
  await fill('dayCompareNote', 'Наблюдение о двух днях');
  await click('#dayCompareForm button[type="submit"]');
  await click('#dayCompareToReport');
  check(
    (await page.locator('#statusText').innerText()).includes('темам приёма'),
    'Comparison note can be added to visit topics',
  );
  await showAll();
  let row = page.locator('#diaryTimeline [data-record-type="sugar"]').first();
  await row.locator('.entry-menu summary').click();
  await row.locator('[data-edit]').click();
  await fill('sugarValueInput', 6.9);
  await click('#addSugarBtn');
  row = page.locator('#diaryTimeline [data-record-type="sugar"]').first();
  await row.locator('.entry-menu summary').click();
  await row.locator('[data-history]').click();
  check(
    (await page.locator('#historyContent').innerText()).includes('6.3') &&
      (await page.locator('#historyContent').innerText()).includes('6.9'),
    'History retains before and after values',
  );
  await click('[data-restore-version]');
  check(
    (await page.locator('#diaryTimeline').innerText()).includes('6.3'),
    'Previous record version restores',
  );
  row = page.locator('#diaryTimeline [data-record-type="sugar"]').first();
  await row.locator('.entry-menu summary').click();
  await row.locator('[data-delete]').click();
  await click('#confirmDeleteBtn');
  await click('[data-diary-view="trash"]');
  check((await page.locator('#trashList [data-restore-trash]').count()) === 1, 'Deletion persists in trash');
  await page.reload();
  await fill('loginUsername', 'Исследование');
  await fill('loginPassword', password);
  await click('#loginBtn');
  await nav('Diary');
  await click('[data-diary-view="trash"]');
  check(
    (await page.locator('#trashList [data-restore-trash]').count()) === 1,
    'Trash survives reload and reauthentication',
  );
  await click('[data-restore-trash]');
  check((await page.locator('#trashList').innerText()).includes('пуста'), 'Trash restores original record');
  await click('[data-diary-view="calendar"]');
  await fill('calendarMonth', '2026-09');
  await page.locator('#calendarMonth').dispatchEvent('change');
  check(
    (await page.locator('[data-calendar-day="2026-09-20"]').getAttribute('aria-label')).includes('записей 2'),
    'Calendar counts actual records',
  );
  await fill('calendarNoteDate', '2026-09-20');
  await fill('calendarNoteTitle', 'Поездка');
  await click('#calendarNoteForm button');
  check(
    (await page.locator('[data-calendar-day="2026-09-20"]').getAttribute('aria-label')).includes('Поездка'),
    'Calendar preserves day annotation',
  );
  await click('[data-calendar-day="2026-09-20"]');
  check(
    (await page.locator('#diaryTimeline .timeline-row').count()) === 2,
    'Calendar opens exact day in diary',
  );
  const labelData = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1400;
    c.height = 600;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'black';
    ctx.font = '64px Arial';
    ctx.fillText('Пищевая ценность на 100 г', 65, 110);
    ctx.fillText('Белки 3,2 г', 65, 230);
    ctx.fillText('Жиры 2,5 г', 65, 340);
    ctx.fillText('Углеводы 12,5 г', 65, 460);
    return c.toDataURL('image/png').split(',')[1];
  });
  await fs.writeFile(path.join(out, 'synthetic-label.png'), Buffer.from(labelData, 'base64'));
  await nav('Food');
  await click('#pageFood [data-add="food"]');
  await fill('foodName', 'Йогурт тестовый');
  await fill('foodWeight', 200);
  await page.locator('#foodPhotoInput').evaluate((e) => (e.closest('details').open = true));
  await page
    .locator('#foodPhotoInput')
    .setInputFiles({ name: 'Этикетка.png', mimeType: 'image/png', buffer: Buffer.from(labelData, 'base64') });
  await page.waitForFunction(() => document.querySelectorAll('#foodPhotos img').length === 1);
  await settle();
  await page.locator('#foodPhotos img').evaluate((e) => e.decode());
  check((await page.locator('#foodPhotos img').count()) === 1, 'Photo is encrypted and attached');
  const stored = await page.evaluate(() => localStorage.getItem('diab_vaults_v2'));
  check(
    !stored.includes('Этикетка') && !stored.includes('data:image'),
    'Profile storage exposes neither photo nor filename',
  );
  await click('#foodPhotos [data-open-photo]');
  check(
    await page.locator('#fullPhoto').evaluate((e) => e.complete && e.naturalWidth > 0),
    'Photo opens at larger size',
  );
  await close();
  check(
    (await page.locator('#foodModal').isVisible()) &&
      (await page.locator('#foodName').inputValue()) === 'Йогурт тестовый',
    'Closing photo returns to unchanged form',
  );
  await page.locator('#ocrStartBtn').evaluate((e) => (e.closest('details').open = true));
  await click('#ocrStartBtn');
  check(
    (await page.locator('#ocrText').inputValue()).toLowerCase().includes('углеводы'),
    'Offline OCR recognizes Cyrillic nutrition label',
  );
  check(
    Number(await page.locator('#ocrCarbs').inputValue()) === 12.5,
    'OCR suggests carbohydrate value for review',
  );
  check(
    (await page.locator('#foodCarbsPer100').inputValue()) === '',
    'OCR never silently changes food values',
  );
  await click('#ocrApplyBtn');
  check(
    (await page.locator('#foodCarbsPer100').inputValue()) === '12.5' &&
      (await page.locator('#foodLiveResult').innerText()).includes('25 г'),
    'Confirmed OCR value computes portion',
  );
  await click('#saveFavoriteBtn');
  await click('#addFoodBtn');
  await click('[data-food-tab="favorites"]');
  await click('#foodLibrary .entry-menu summary');
  await click('#foodLibrary [data-edit-favorite]');
  await fill('foodWeight', 150);
  await click('#saveFavoriteBtn');
  await click('#foodLibrary [data-dish-history]');
  check(
    (await page.locator('#dishHistoryContent').innerText()).includes('200 г') &&
      (await page.locator('[data-repeat-version]').count()) === 1,
    'Dish history retains previous recipe and usage',
  );
  await click('[data-repeat-version]');
  check(
    (await page.locator('#foodWeight').inputValue()) === '200' &&
      (await page.locator('#foodPhotos img').count()) === 1,
    'Historical recipe repeats with photo and original portion',
  );
  await close();
  await nav('Diary');
  await click('[data-diary-view="collections"]');
  await click('#newCollectionBtn');
  await fill('collectionName', 'Два события для врача');
  await fill('collectionNote', 'Проверить вместе на приёме');
  await page.locator('#collectionChoices input').nth(0).check();
  await page.locator('#collectionChoices input').nth(1).check();
  await click('#collectionForm button[type="submit"]');
  check(
    (await page.locator('#collectionList').innerText()).includes('2 доступных'),
    'Collection saves explicit event references',
  );
  await click('[data-report-collection]');
  check(
    (await page.locator('#reportPreview tbody tr').count()) === 2 &&
      (await page.locator('#reportPreview').innerText()).includes('Два события для врача'),
    'Collection report includes only selected events and comment',
  );
  await page.locator('.report-options summary').click();
  await page.locator('#reportIncludePhotos').check();
  await page
    .locator('#reportPreview img')
    .first()
    .evaluate((e) => e.decode());
  check(
    (await page.locator('#reportPreview img').count()) === 1,
    'Report includes photo only when requested',
  );
  await page.evaluate(() => {
    window.print = () => {
      window.photosReadyAtPrint = [...document.querySelectorAll('#reportPreview img')].every(
        (i) => i.complete && i.naturalWidth > 0,
      );
    };
  });
  await click('#printReportBtn');
  check(await page.evaluate(() => window.photosReadyAtPrint), 'Print waits for report photos to decode');
  await page.pdf({
    path: path.join(out, 'explore-photo-report.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await close();
  const csv =
    'Дата и время;Тип;Значение;Единицы;Продукт или препарат;Вес, г;Углеводы, г;Контекст;Заметка\n2026-09-19T10:00;Глюкоза;108;мг/дл;;;;;Из CSV\n2026-09-19T10:00;Глюкоза;108;мг/дл;;;;;Из CSV\n2026-09-19T11:00;Глюкоза;плохое;ммоль/л;;;;;Ошибка\n';
  await importCSV(csv, 'import-test.csv');
  check(
    (await page.locator('#csvImportPreview').innerText()).includes('К импорту: 1') &&
      (await page.locator('#csvImportPreview').innerText()).includes('повторов пропущено: 1'),
    'CSV preview detects duplicate and invalid rows',
  );
  await click('#csvConfirmImport');
  check(await page.locator('#csvImportModal').isVisible(), 'Invalid rows require explicit skip confirmation');
  await page.locator('#csvSkipInvalid').check();
  await click('#csvConfirmImport');
  await showAll();
  await fill('diarySearch', 'Из CSV');
  check(
    (await page.locator('#diaryTimeline .timeline-row').count()) === 1 &&
      (await page.locator('#diaryTimeline').innerText()).includes('6.0'),
    'CSV imports converted units once',
  );
  await settings('data');
  await click('[data-undo-import]');
  check(
    (await page.locator('#importHistory').innerText()).includes('отменён'),
    'Entire unchanged import can be rolled back',
  );
  await close();
  await importCSV(
    'Дата и время;Тип;Значение;Единицы;Заметка\n2026-09-18T10:00;Глюкоза;5.5;ммоль/л;Изменённый импорт\n',
    'changed-import.csv',
  );
  await click('#csvConfirmImport');
  await showAll();
  await fill('diarySearch', 'Изменённый импорт');
  await page.locator('#diaryTimeline .entry-menu summary').click();
  await page.locator('#diaryTimeline [data-edit]').click();
  await fill('sugarValueInput', 5.8);
  await click('#addSugarBtn');
  await settings('data');
  await click('[data-undo-import]');
  check(
    (await page.locator('#statusText').innerText()).includes('изменены или удалены') &&
      (await page.locator('[data-undo-import]').count()) === 1,
    'Batch rollback refuses to erase edited imports',
  );
  await close();
  await settings('data');
  const download = page.waitForEvent('download');
  await click('#exportBtn');
  const backupPath = path.join(out, 'explore-backup.json');
  await (await download).saveAs(backupPath);
  const backup = JSON.parse(await fs.readFile(backupPath, 'utf8'));
  check(
    Object.keys(backup.photos).length === 1 && !JSON.stringify(backup).includes('Йогурт'),
    'Backup includes only encrypted photo data',
  );
  await close();
  const isolated = await browser.newContext({ timezoneId: 'Europe/Moscow', acceptDownloads: true });
  await isolated.setOffline(true);
  const restore = await isolated.newPage();
  restore.on('pageerror', (e) => errors.push(e.message));
  await restore.goto(url);
  await click('#restoreStartBtn', restore);
  const broken = structuredClone(backup),
    photoId = Object.keys(broken.photos)[0];
  broken.photos[photoId] = (broken.photos[photoId][0] === 'A' ? 'B' : 'A') + broken.photos[photoId].slice(1);
  await restore
    .locator('#restoreFile')
    .setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(broken)),
    });
  await fill('restoreName', 'Проверка повреждения', restore);
  await fill('restorePassword', password, restore);
  await click('#previewRestoreBtn', restore);
  check(
    (await restore.locator('#statusText').innerText()).includes('Повреждена фотография'),
    'Restore rejects tampered photo ciphertext',
  );
  await restore.locator('#restoreFile').setInputFiles(backupPath);
  await fill('restoreName', 'Копия с фото', restore);
  await fill('restorePassword', password, restore);
  await click('#previewRestoreBtn', restore);
  check(
    (await restore.locator('#restorePreview').innerText()).includes('Фотографии: 1'),
    'Cross-browser backup verifies photo ciphertext',
  );
  await click('#restoreSubmitBtn', restore);
  await nav('Food', restore);
  await click('[data-food-tab="favorites"]', restore);
  await click('#foodLibrary [data-use-food]', restore);
  await restore.locator('#foodPhotoInput').evaluate((e) => (e.closest('details').open = true));
  await restore.waitForFunction(() => {
    const img = document.querySelector('#foodPhotos img');
    return img?.complete && img.naturalWidth > 0;
  });
  check(
    await restore.locator('#foodPhotos img').evaluate((e) => e.naturalWidth > 0),
    'Restored photo decrypts in a fresh browser context',
  );
  await close(restore);
  await settings('data', restore);
  await fill('currentPassword', password, restore);
  await fill('newPassword', 'updated-explore-password', restore);
  await fill('confirmPassword', 'updated-explore-password', restore);
  await click('#changePasswordBtn', restore);
  await close(restore);
  await nav('Food', restore);
  await click('#foodLibrary [data-use-food]', restore);
  await restore.locator('#foodPhotoInput').evaluate((e) => (e.closest('details').open = true));
  await restore.waitForFunction(() => {
    const img = document.querySelector('#foodPhotos img');
    return img?.complete && img.naturalWidth > 0;
  });
  check(
    await restore.locator('#foodPhotos img').evaluate((e) => e.naturalWidth > 0),
    'Photo remains available after account password change',
  );
  await isolated.close();
  await nav('Stats');
  await fill('statsFrom', '2026-09-20');
  await fill('statsTo', '2026-09-21');
  await page.locator('#statsTo').dispatchEvent('change');
  await click('[data-chart-view="3d"]');
  await fill('dayCompareA', '2026-09-20');
  await fill('dayCompareB', '2026-09-21');
  await page.locator('#dayCompareB').dispatchEvent('change');
  if (await page.locator('#statusMessage').isVisible()) await click('#dismissStatus');
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    '3D and day comparison fit mobile',
  );
  await page.screenshot({ path: path.join(out, 'explore-mobile-3d.png'), fullPage: true });
  await nav('Diary');
  await click('[data-diary-view="calendar"]');
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Calendar fits mobile',
  );
  await page.screenshot({ path: path.join(out, 'explore-mobile-calendar.png'), fullPage: true });
  const unlabeled = await page
    .locator('input,select,textarea')
    .evaluateAll((ns) =>
      ns.filter((e) => !e.labels?.length && !e.getAttribute('aria-label')).map((e) => e.id),
    );
  check(unlabeled.length === 0, 'All new form controls have labels');
  check(requests.length === 0, 'Photos, charts and OCR make no external network requests');
  check(errors.length === 0, 'No runtime errors: ' + errors.join(';'));
  await fs.writeFile(
    path.join(out, 'explore-results.json'),
    JSON.stringify({ checks, status: 'passed' }, null, 2),
  );
  console.log(`${checks} exploration checks passed.`);
  await context.close();
})()
  .catch(async (e) => {
    console.error(e);
    await page?.screenshot({ path: path.join(out, 'explore-failure.png'), fullPage: true }).catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => browser?.close());
