/* Visual acceptance gallery. Uses disposable, offline browser storage only.
 * Run with the same PLAYWRIGHT_PATH / BROWSER_EXECUTABLE as scripts/test.cjs.
 * Add --motion-samples to also export the initial and midpoint frames.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const embedMedicalArt = require('./art-assets.cjs');
const { browserType, launchOptions, output } = require('../tests/support.cjs');
const root = path.resolve(__dirname, '..');
const sampleMotion = process.argv.includes('--motion-samples');
let browser;

async function readOptional(relative) {
  try { return await fs.readFile(path.join(root, relative), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const [styles, scripts] = await Promise.all([
    Promise.all(['styles', 'design-system', 'emergency', 'medical-art', 'emergency-guides']
      .map(name => readOptional(`src/${name}.css`))).then(parts => parts.join('\n')),
    Promise.all(['medical-art', 'emergency-guides']
      .map(name => readOptional(`src/${name}.js`))),
  ]);
  if (!scripts.at(-1)) throw new Error('src/emergency-guides.js is missing');
  browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  await context.setOffline(true);
  const page = await context.newPage();
  const errors = [], externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="gallery"></main></body></html>');
  await page.addStyleTag({ content: styles });
  await page.addStyleTag({ content: `
    html,body { margin:0; padding:0; background:#f5f4ef; color:#243d48; font-family:Arial,sans-serif; }
    body { display:block; min-width:0; }
    #gallery { width:1440px; max-width:none; box-sizing:border-box; margin:0; padding:20px; }
    .art-preview-heading { margin:0 0 16px; font-size:22px; line-height:1.3; }
    .art-preview-subtitle { margin:0 0 18px; color:#566972; font-size:13px; }
    .art-preview-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
    .art-preview-card.aid-guide { display:block; margin:0; padding:0; border:1px solid #d8dfde; border-radius:16px; background:#fffefb; box-shadow:none; overflow:hidden; min-width:0; }
    .art-preview-title { margin:0; padding:15px 16px 10px; min-height:78px; box-sizing:border-box; font-size:17px; line-height:1.3; }
    .art-preview-title small { display:block; color:#667e85; font-size:11px; letter-spacing:.06em; margin-bottom:5px; font-weight:normal; }
    .art-preview-card .aid-guide-illustration { width:100%; height:auto; max-width:none; max-height:none; margin:0; display:block; aspect-ratio:640/430; background:#fafaf5; }
    .art-preview-caption { display:flex; flex-wrap:wrap; gap:5px 15px; margin:0; padding:10px 16px 16px; min-height:50px; color:#3c5963; font-size:12px; line-height:1.4; }
    .art-preview-caption span { display:block; }
    * { box-sizing:border-box; }
  ` });
  for (const script of scripts) if (script) await page.addScriptTag({ content: embedMedicalArt(script) });
  const inventory = await page.evaluate(() => Object.entries(emergencyGuideContent).map(([key, guide]) => ({
    key, title: guide.title, scenes: guide.steps.map(step => step[3]),
  })));
  const sceneCount = inventory.reduce((count, guide) => count + guide.scenes.length, 0);
  const paths = [];
  const audits = [];

  async function render(group, phase = 'final') {
    await page.evaluate(({ group, phase }) => {
      const escape = text => String(text).replace(/[&<>\"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[character]));
      const guides = group ? [[group, emergencyGuideContent[group]]] : Object.entries(emergencyGuideContent);
      document.querySelector('#gallery').innerHTML = `<h1 class="art-preview-heading">${group ? escape(emergencyGuideContent[group].title) : 'Медицинские иллюстрации · все инструкции'}</h1><p class="art-preview-subtitle">${phase === 'final' ? 'Финальный кадр' : phase === 'initial' ? 'Начальный кадр' : 'Середина движения'} · иллюстрации для визуальной проверки</p><div class="art-preview-grid">${guides.flatMap(([key, guide]) => guide.steps.map((step, index) => `<article class="art-preview-card aid-guide" data-preview-scene="${step[3]}"><h2 class="art-preview-title"><small>${escape(key)} · ${index + 1}/${guide.steps.length} · ${step[3]}</small>${escape(step[0])}</h2>${emergencyGuideScene(step[3], step[0])}<p class="art-preview-caption">${(emergencyGuideScenes[step[3]] || []).map((text, point) => `<span>${point + 1}. ${escape(text)}</span>`).join('')}</p></article>`)).join('')}</div>`;
      window.previewInfiniteAnimations = [];
      for (const animation of document.getAnimations()) {
        const timing = animation.effect.getComputedTiming();
        if (!Number.isFinite(timing.endTime)) {
          window.previewInfiniteAnimations.push(animation.animationName || 'unnamed');
          animation.pause();
          animation.currentTime = 0;
        } else if (phase === 'final') animation.finish();
        else {
          animation.pause();
          animation.currentTime = phase === 'initial' ? 0 : timing.endTime / 2;
        }
      }
    }, { group, phase });
    await page.evaluate(async () => {
      await Promise.all([...document.querySelectorAll('svg image')].map(async node => {
        const image = new Image(); image.src = node.getAttribute('href'); await image.decode();
      }));
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const audit = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]'), element => element.id);
      const duplicates = Array.from(new Set(ids.filter((id, index) => ids.indexOf(id) !== index)));
      const unresolved = [];
      for (const element of document.querySelectorAll('svg,svg *')) {
        const scene = element.closest('[data-preview-scene]')?.dataset.previewScene || 'shared';
        const values = ['fill','stroke','filter','clip-path','mask','marker-start','marker-mid','marker-end','style']
          .map(attribute => element.getAttribute(attribute) || '');
        const computed = getComputedStyle(element);
        values.push(computed.fill, computed.stroke, computed.filter, computed.clipPath, computed.maskImage,
          computed.markerStart, computed.markerMid, computed.markerEnd);
        for (const value of values) for (const match of value.matchAll(/url\(\s*["']?([^\)"']+)["']?\s*\)/g)) {
          const fragment = match[1].split('#')[1];
          if (fragment && !document.getElementById(decodeURIComponent(fragment)))
            unresolved.push(`${scene}: ${element.tagName} -> #${fragment}`);
        }
        const href = element.getAttribute('href') || element.getAttribute('xlink:href');
        if (href?.startsWith('#') && !document.getElementById(href.slice(1))) unresolved.push(`${scene}: href ${href}`);
      }
      return { scenes:document.querySelectorAll('[data-preview-scene]').length, duplicateIds:duplicates,
        unresolvedReferences:Array.from(new Set(unresolved)), infiniteAnimations:window.previewInfiniteAnimations };
    });
    audits.push({ group:group || 'overview', phase, ...audit });
    const file = path.join(output, `medical-art-${group || 'overview'}${phase === 'final' ? '' : `-${phase}`}.png`);
    await page.locator('#gallery').screenshot({ path:file, animations:'allow' });
    paths.push(file);
  }

  await render(null);
  for (const guide of inventory) await render(guide.key);
  if (sampleMotion) for (const phase of ['initial','midpoint']) await render(null, phase);
  const report = { sceneCount, inventory, audits, errors, externalRequests, images:paths };
  const reportPath = path.join(output, 'medical-art-audit.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ sceneCount, images:paths, report:reportPath, issues:audits.filter(a =>
    a.duplicateIds.length || a.unresolvedReferences.length || a.infiniteAnimations.length), errors, externalRequests }, null, 2));
  if (errors.length || externalRequests.length || audits.some(a => a.duplicateIds.length || a.unresolvedReferences.length || a.infiniteAnimations.length)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
