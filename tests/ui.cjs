const { reveal } = require('./support.cjs');
const password = 'synthetic-test-password';
async function settle(page) {
  await page.waitForFunction(() => !document.body.hasAttribute('aria-busy'));
}
async function click(page, selector) {
  await reveal(page, selector);
  await page.locator(selector).click();
  await settle(page);
}
async function fill(page, id, value) {
  await reveal(page, '#' + id);
  await page.locator('#' + id).fill(String(value));
}
async function register(page, name = 'Тестовый профиль') {
  await click(page, '#switchToRegister');
  await fill(page, 'regUsername', name);
  await fill(page, 'regPassword', password);
  await fill(page, 'regPasswordConfirm', password);
  await click(page, '#registerBtn');
  await click(page, '#setupSkip');
}
async function login(page, name = 'Тестовый профиль') {
  await fill(page, 'loginUsername', name);
  await fill(page, 'loginPassword', password);
  await click(page, '#loginBtn');
}
async function settings(page, tab = 'data') {
  await click(page, '#profileBtn');
  await click(page, `[data-settings="${tab}"]`);
}
async function sugar(page, value = '6.2') {
  await click(page, '#navToday');
  await click(page, '#quickSugar');
  await fill(page, 'sugarValueInput', value);
  await click(page, '#addSugarBtn');
}
async function upload(page, type = 'sugar', name = 'test.png') {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 40;
    const context = canvas.getContext('2d');
    context.fillStyle = '#236478';
    context.fillRect(0, 0, 40, 40);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator(`#${type}PhotoInput`).evaluate((element) => {
    element.closest('details').open = true;
  });
  await page
    .locator(`#${type}PhotoInput`)
    .setInputFiles({ name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  await settle(page);
}
async function photoKeys(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('DiabControl-photos-v1', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('photos');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            transaction = db.transaction('photos'),
            read = transaction.objectStore('photos').getAllKeys();
          read.onsuccess = () => resolve(read.result);
          transaction.oncomplete = () => db.close();
        };
      }),
  );
}
module.exports = { password, settle, click, fill, register, login, settings, sugar, upload, photoKeys };
