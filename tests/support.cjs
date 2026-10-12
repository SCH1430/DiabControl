const path = require('node:path');
const os = require('node:os');
const playwright = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const name = process.env.TEST_BROWSER || 'chromium';
if (!['chromium', 'webkit', 'firefox'].includes(name)) throw new Error('Unknown TEST_BROWSER');
// General regression profiles have already skipped the welcome guide.
// start-guide.e2e explicitly opts into a genuinely fresh first launch.
const browserType = {
  async launch(options) {
    const browser = await playwright[name].launch(options);
    if (process.env.TEST_FIRST_START !== '1') {
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...args) => {
        const context = await newContext(...args);
        await context.addInitScript(() => {
          try {
            if (!localStorage.getItem('diabcontrol_start_guide_v1'))
              localStorage.setItem('diabcontrol_start_guide_v1', 'skipped');
          } catch { /* Storage-failure cases remain explicit in their own tests. */ }
        });
        return context;
      };
    }
    return browser;
  },
};
const launchOptions = { headless: true, timeout: 30000 };
if (name === 'chromium' && process.env.BROWSER_EXECUTABLE)
  launchOptions.executablePath = process.env.BROWSER_EXECUTABLE;
const output = path.join(process.env.TEST_OUTPUT || path.join(os.tmpdir(), 'diabcontrol-tests'), name);
async function reveal(page, selector) {
  const ids = await page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const ids = [];
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !parent.open && parent.id) ids.unshift(parent.id);
      }
      return ids;
    });
  for (const id of ids) await page.locator(`#${id} > summary`).click();
}
module.exports = { browserType, launchOptions, output, reveal, playwright };
