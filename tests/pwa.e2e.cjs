const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { browserType, launchOptions, output } = require('./support.cjs');
const { register, sugar, login, click } = require('./ui.cjs');
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
(async () => {
  await fs.mkdir(output, { recursive: true });
  server = await startServer();
  browser = await browserType.launch(launchOptions);
  const context = await browser.newContext();
  page = await context.newPage();
  const errors = [],
    writes = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.method() !== 'GET') writes.push(request.url());
  });
  await page.goto(server.url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  check(
    manifest.display === 'standalone' && manifest.icons.some((icon) => icon.sizes === '512x512'),
    'Installable manifest includes standalone mode and application icons',
  );
  check(
    (await page.request.get(server.url + '/src/app.js')).status() === 404,
    'Local server exposes only the app assets',
  );
  check(
    (await page.request.get(server.url + '/tests/fixtures/v2-backup.json')).status() === 404,
    'Local server never serves test data or arbitrary workspace files',
  );
  await register(page);
  await sugar(page, '6.4');
  await click(page, '#navDiary');
  const cached = await page.evaluate(async () => {
    const cache = await caches.open(
      (await caches.keys()).find((name) => name.startsWith('diabcontrol-app-')),
    );
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  check(
    cached.length === 5 && cached.includes('/') && !cached.some((path) => /backup|profile|diary/.test(path)),
    'Offline cache contains public assets only',
  );
  await server.stop();
  server = null;
  await context.setOffline(true);
  await page.reload();
  await login(page);
  check(
    (await page.locator('#pageDiary').isVisible()) &&
      (await page.locator('#diaryTimeline .timeline-row').count()) === 1,
    'Installed shell reloads offline after the local server stops, with the encrypted diary intact',
  );
  await sugar(page, '6.8');
  await page.reload();
  await login(page);
  await click(page, '#navDiary');
  check(
    (await page.locator('#diaryTimeline .timeline-row').count()) === 2,
    'New records can be saved and reopened completely offline',
  );
  check(writes.length === 0, 'Diary writes never go to a server');
  check(errors.length === 0, 'Installable shell has no runtime errors');
  await fs.writeFile(path.join(output, 'pwa-results.json'), JSON.stringify({ checks, errors }, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    await server?.stop();
  });
