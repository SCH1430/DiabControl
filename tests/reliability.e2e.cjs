const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { browserType, launchOptions, output } = require('./support.cjs');
const { password, click, fill, register, settings, upload, photoKeys } = require('./ui.cjs');
const vault = require('../src/crypto.js');
let browser,
  page,
  checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log('PASS ' + message);
}
async function close() {
  await page.keyboard.press('Escape');
}
async function clean() {
  await settings(page);
  await click(page, '#cleanMediaBtn');
  await close();
}
async function openSugar(value = '6.2') {
  await click(page, '#navToday');
  await click(page, '#quickSugar');
  if (value !== null) await fill(page, 'sugarValueInput', value);
}
async function metadata() {
  const record = await page.evaluate(
    () => Object.values(JSON.parse(localStorage.getItem('diab_vaults_v2')).accounts)[0],
  );
  return (await vault.decrypt(record, password)).content;
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await context.setOffline(true);
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
  await register(page);

  await openSugar();
  await upload(page);
  await close();
  await clean();
  check(
    (await photoKeys(page)).length === 1,
    'Cleanup retains a photo referenced only by an encrypted draft',
  );
  await openSugar(null);
  await click(page, '[data-resume-draft="sugar"]');
  await click(page, '#sugarPhotos [data-remove-photo]');
  await close();
  await clean();
  check(
    (await photoKeys(page)).length === 0 && Object.keys((await metadata()).media).length === 0,
    'Removing an unused photo frees both metadata capacity and file storage',
  );

  await openSugar();
  await upload(page);
  await click(page, '#addSugarBtn');
  await click(page, '#navDiary');
  await click(page, '#diaryTimeline .entry-menu summary');
  await click(page, '#diaryTimeline [data-edit]');
  await click(page, '#sugarPhotos [data-remove-photo]');
  await click(page, '#addSugarBtn');
  await clean();
  check((await photoKeys(page)).length === 1, 'Cleanup preserves a photo retained by edit history');
  await click(page, '#diaryTimeline .entry-menu summary');
  await click(page, '#diaryTimeline [data-delete]');
  await click(page, '#confirmDeleteBtn');
  await clean();
  check((await photoKeys(page)).length === 1, 'Trash and its history keep recoverable photos');
  await click(page, '[data-diary-view="trash"]');
  page.once('dialog', (dialog) => dialog.accept());
  await click(page, '[data-purge-trash]');
  check(
    (await photoKeys(page)).length === 0,
    'Final deletion clears orphaned photos after committing record removal',
  );

  await openSugar();
  await page.waitForFunction(
    () => !document.querySelector('#sugarDraftStatus').textContent.includes('Сохраняем'),
  );
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'diab_vaults_v2') throw new DOMException('full', 'QuotaExceededError');
      return window.originalSetItem.call(this, key, value);
    };
  });
  await upload(page);
  check(
    (await photoKeys(page)).length === 0,
    'Photo upload rolls back IndexedDB if profile metadata cannot be saved',
  );
  check(
    Object.keys((await metadata()).media).length === 0,
    'Failed upload does not change the saved profile',
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  await close();

  await openSugar();
  await upload(page, 'sugar', 'available.png');
  await upload(page, 'sugar', 'missing.png');
  await upload(page, 'sugar', 'corrupt.png');
  await click(page, '#addSugarBtn');
  const content = await metadata(),
    ids = Object.keys(content.media);
  check(ids.length === 3, 'Recovery fixture contains three separately encrypted photos');
  await page.evaluate(
    async ({ ids }) => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('DiabControl-photos-v1', 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('photos', 'readwrite'),
            store = tx.objectStore('photos');
          store.delete(JSON.stringify(['Тестовый профиль', ids[1]]));
          store.put(new Uint8Array([0, 1, 2]).buffer, JSON.stringify(['Тестовый профиль', ids[2]]));
          store.put(new Uint8Array([9]).buffer, JSON.stringify(['Другой профиль', 'orphan']));
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    },
    { ids },
  );
  await clean();
  check(
    (await photoKeys(page)).some((key) => JSON.parse(key)[0] === 'Другой профиль'),
    'Cleanup never touches another profile’s archive',
  );
  await settings(page);
  await click(page, '#exportBtn');
  check(
    (await page.locator('#statusText').innerText()).includes('Аварийная копия'),
    'Incomplete full backup points to recovery without pretending success',
  );
  const before = await page.evaluate(() => localStorage.getItem('diab_vaults_v2'));
  await click(page, '#recoveryExportBtn');
  check(
    (await page.locator('#recoveryMissing li').count()) === 2,
    'Recovery preview lists missing and corrupted photos',
  );
  const downloading = page.waitForEvent('download');
  await click(page, '#downloadRecoveryBtn');
  const backupPath = path.join(output, 'recovery.json');
  await (await downloading).saveAs(backupPath);
  const backup = JSON.parse(await fs.readFile(backupPath, 'utf8'));
  const recovered = (await vault.decrypt(backup.record, password)).content;
  check(
    recovered.sugar.length === content.sugar.length && Object.keys(recovered.media).length === 1,
    'Recovery preserves all records and the healthy photo',
  );
  check(
    recovered.sugar.at(-1).photoIds.length === 1 && recovered.recovery.missingPhotos.length === 2,
    'Recovery removes dangling references and encrypts its omission manifest',
  );
  check(
    (await page.evaluate(() => localStorage.getItem('diab_vaults_v2'))) === before,
    'Recovery export leaves the original encrypted diary unchanged',
  );
  const other = await browser.newContext({ acceptDownloads: true });
  await other.setOffline(true);
  const restored = await other.newPage();
  await restored.goto(page.url());
  await click(restored, '#restoreStartBtn');
  await restored.locator('#restoreFile').setInputFiles(backupPath);
  await fill(restored, 'restoreName', 'Восстановленный');
  await fill(restored, 'restorePassword', password);
  await click(restored, '#previewRestoreBtn');
  check(
    (await restored.locator('#restorePreview').innerText()).includes('Аварийная копия'),
    'Restoration identifies the partial photo archive before confirmation',
  );
  await restored.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'diab_vaults_v2') throw new DOMException('full', 'QuotaExceededError');
      return window.originalSetItem.call(this, key, value);
    };
  });
  await click(restored, '#restoreSubmitBtn');
  check((await photoKeys(restored)).length === 0, 'Failed restoration rolls back all staged photo files');
  await restored.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  await click(restored, '#restoreSubmitBtn');
  await click(restored, '#navDiary');
  check(
    (await restored.locator('#diaryTimeline [data-record-type="sugar"]').count()) === recovered.sugar.length,
    'Recovery backup restores successfully in a fresh browser profile',
  );
  await other.close();
  check(errors.length === 0, 'No unexpected JavaScript errors in reliability checks');
  await fs.writeFile(
    path.join(output, 'reliability-results.json'),
    JSON.stringify({ checks, errors }, null, 2),
  );
})()
  .catch(async (error) => {
    console.error(error);
    await page
      ?.screenshot({ path: path.join(output, 'reliability-failure.png'), fullPage: true })
      .catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => browser?.close());
