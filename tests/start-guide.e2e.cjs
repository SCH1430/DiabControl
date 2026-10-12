/* The introduction is an optional, finite visual path and never blocks urgent help. */
process.env.TEST_FIRST_START = '1';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { browserType, launchOptions, output } = require('./support.cjs');
const { click, register } = require('./ui.cjs');
const key = 'diabcontrol_start_guide_v1';
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
let browser, checks = 0;
const check = (condition, name) => { assert.ok(condition, name); checks++; console.log('PASS ' + name); };
const flag = page => page.evaluate(key => localStorage.getItem(key), key);
const intro = page => page.locator('#startGuideModal');
const next = page => click(page, '#startGuideNext');
const open = page => page.locator('[data-open-start-guide]:visible').first().click();
async function storedData(page) {
  return page.evaluate(key => ({
    local: Object.fromEntries(Object.keys(localStorage).filter(k => k !== key).sort().map(k => [k, localStorage.getItem(k)])),
    session: Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)])),
  }), key);
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1360, height: 960 }, reducedMotion: 'reduce' });
  await context.setOffline(true);
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(url);
  check(await page.locator('#startGuideArt img, .auth-illustration').evaluateAll(async images => {
    await Promise.all(images.map(image => image.decode()));
    return images.length === 2 && images.every(image => image.naturalWidth > 600 && image.src.startsWith('data:image/png;base64,'));
  }), 'Both medical art illustrations decode offline from the portable bundle');
  check(await intro(page).isVisible() && await flag(page) === null, 'First launch shows the guide without marking it complete');
  check(await page.locator('#appMain').isHidden() && await page.locator('#startGuideTitle').evaluate(e => e === document.activeElement), 'Guide precedes sign-in and focuses its heading');
  check(await page.locator('#startGuideEmergency').evaluate(e => e.tagName === 'BUTTON' && !e.hasAttribute('href')), 'Urgent shortcut opens help rather than dialing automatically');
  const initial = await storedData(page);
  await page.screenshot({ path: path.join(output, 'start-guide-desktop.png') });
  await next(page);
  check(await page.locator('#startGuideCount').innerText() === '2 из 3' && await page.locator('#startGuideTitle').evaluate(e => e === document.activeElement), 'Next advances only by user action and focuses the new heading');
  check((await page.locator('#startGuideArt').textContent()).includes('5,8') && (await page.locator('#startGuideArt').textContent()).includes('ммоль/л'), 'Number and unit both appear in the transfer illustration');
  await click(page, '#startGuideBack');
  check(await page.locator('#startGuideCount').innerText() === '1 из 3' && await page.locator('#startGuideBack').isDisabled(), 'Back returns to the first step with a clear boundary');
  for (const step of [0, 1, 2]) {
    if (step > 0) { await open(page); for (let i = 0; i < step; i++) await next(page); }
    await click(page, '#startGuideEmergency');
    check(await intro(page).isHidden() && await page.locator('#emergencyModal').isVisible() && await flag(page) === null, `Urgent help bypasses step ${step + 1} without recording completion`);
    await page.keyboard.press('Escape');
    check(await page.evaluate(() => document.activeElement.getClientRects().length > 0 && !document.activeElement.closest('.hidden')), `Urgent exit from step ${step + 1} returns keyboard focus to a visible control`);
  }
  assert.deepEqual(await storedData(page), initial); checks++; console.log('PASS Guide and urgent shortcuts leave profile and session stores unchanged');
  await open(page); await next(page); await next(page); await next(page);
  check(await intro(page).isHidden() && await page.locator('#learningWelcome').isVisible() && await flag(page) === 'completed', 'Final action opens isolated practice and remembers completion');
  await page.keyboard.press('Escape');
  check(await page.locator('#authStartGuideBtn').evaluate(e => e === document.activeElement), 'Closing practice returns focus to the original guide launcher');
  await page.reload();
  check(await intro(page).isHidden(), 'Completed introduction does not appear automatically after reload');
  await open(page); await page.keyboard.press('Escape');
  check(await intro(page).isHidden() && await flag(page) === 'skipped', 'Escape safely skips the optional introduction');
  await page.reload();
  check(await intro(page).isHidden(), 'Skipped introduction stays dismissed after reload');
  await open(page); await click(page, '#startGuideDiary');
  check(await intro(page).isHidden() && await page.locator('#authContainer').isVisible(), 'Diary action reaches the login screen without requiring the guide');
  await register(page, 'Знакомство с интерфейсом');
  const signedIn = await storedData(page);
  await open(page); await next(page); await next(page); await click(page, '#startGuideDiary');
  assert.deepEqual(await storedData(page), signedIn); checks++; console.log('PASS Replaying the guide leaves encrypted diary and session stores unchanged');
  check(await page.locator('#todayStartGuideBtn').evaluate(e => e === document.activeElement), 'Diary exit restores the visible signed-in launcher');
  await click(page, '#profileBtn'); await click(page, '[data-settings="help"]');
  await click(page, '#settingsHelp [data-open-start-guide]');
  await page.keyboard.press('Escape');
  check(await page.locator('#profileModal').isHidden() && await page.locator('#profileBtn').evaluate(e => e === document.activeElement), 'Guide opened from Settings restores focus to the visible Settings button');
  await open(page);
  await page.setViewportSize({ width: 320, height: 780 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; document.documentElement.classList.add('large-text', 'high-contrast'); });
  for (let step = 0; step < 3; step++) {
    check(await intro(page).evaluate(e => e.scrollWidth <= e.clientWidth) && await page.locator('.start-guide-shell').evaluate(e => e.scrollWidth <= e.clientWidth), `Step ${step + 1} fits 320px with large text, dark theme and high contrast`);
    check(await page.locator('#startGuideEmergency').isVisible() && await page.locator('#startGuideDiary').isVisible(), `Step ${step + 1} keeps help and skip available on small screens`);
    await page.screenshot({ path: path.join(output, `start-guide-mobile-dark-large-${step + 1}.png`) });
    if (step < 2) await next(page);
  }
  check(await page.locator('#startGuideArt .sg-enter').evaluateAll(elements => elements.every(e => getComputedStyle(e).animationName === 'none' && Number(getComputedStyle(e).opacity) === 1)), 'Reduced-motion preference shows every diagram layer without animation');
  await page.locator('#startGuideModal [data-close]').focus(); await page.keyboard.press('Shift+Tab');
  check(await page.evaluate(() => Boolean(document.activeElement.closest('#startGuideModal'))), 'Keyboard navigation remains in the introduction dialog');
  await page.keyboard.press('Escape');
  check(errors.length === 0 && requests.length === 0, 'Introduction works offline without page errors or network requests');

  const motionContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await motionContext.setOffline(true);
  const motionPage = await motionContext.newPage();
  await motionPage.goto(url);
  await click(motionPage, '#startGuideReplay');
  const timings = await motionPage.locator('#startGuideArt').evaluate(e => e.getAnimations({ subtree: true }).map(a => a.effect.getComputedTiming()));
  check(timings.length > 0 && timings.every(t => t.iterations === 1 && t.endTime <= 3000), 'Scene animation is finite and finishes in less than three seconds');
  await motionPage.waitForTimeout(2100);
  check(await motionPage.locator('#startGuideCount').innerText() === '1 из 3' && await motionPage.locator('#startGuideArt').evaluate(e => e.getAnimations({ subtree: true }).every(a => a.playState === 'finished')), 'Finished scene remains still and never advances the guide');
  await motionPage.screenshot({ path: path.join(output, 'start-guide-mobile.png') });
  await motionPage.evaluate(() => document.documentElement.classList.add('reduce-motion'));
  await motionPage.waitForFunction(() => document.getElementById('startGuideReplay').disabled);
  check(await motionPage.locator('#startGuideReplay').innerText() === 'Статичная схема', 'Reduced motion replaces replay with an honest static-scene label');
  check(await motionPage.locator('#startGuideArt .sg-enter').evaluateAll(elements => elements.every(e => getComputedStyle(e).animationName === 'none' && Number(getComputedStyle(e).opacity) === 1)), 'App reduced-motion setting also preserves a complete static scene');
  await motionContext.close();

  const blockedContext = await browser.newContext({ reducedMotion: 'reduce' });
  await blockedContext.setOffline(true);
  await blockedContext.addInitScript(() => {
    const originalGet = Storage.prototype.getItem, originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key === 'diabcontrol_start_guide_v1') throw new DOMException('Unavailable', 'SecurityError'); return originalGet.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key === 'diabcontrol_start_guide_v1') throw new DOMException('Unavailable', 'SecurityError'); return originalSet.call(this, key, value); };
  });
  const blockedPage = await blockedContext.newPage(), blockedErrors = [];
  blockedPage.on('pageerror', error => blockedErrors.push(error.message));
  await blockedPage.goto(url); await click(blockedPage, '#startGuideDiary');
  check(await intro(blockedPage).isHidden() && blockedErrors.length === 0, 'Unavailable preference storage never blocks skipping the guide');
  await blockedContext.close();
  console.log(`${checks} start-guide checks passed.`);
  await browser.close();
})().catch(async error => { console.error(error); if (browser) await browser.close(); process.exit(1); });
