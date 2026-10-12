/* Medical artwork integrity and physical geometry, using the real rendered paths. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const embedMedicalArt = require('../scripts/art-assets.cjs');
const { browserType, launchOptions } = require('./support.cjs');
const root = path.resolve(__dirname, '..');
let browser, checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; console.log('PASS ' + label); };
(async () => {
  const [script, styles, manifest] = await Promise.all([
    fs.readFile(path.join(root, 'src/emergency-guides.js'), 'utf8'),
    Promise.all(['styles', 'design-system', 'emergency', 'emergency-guides'].map(name => fs.readFile(path.join(root, `src/${name}.css`), 'utf8'))).then(parts => parts.join('\n')),
    fs.readFile(path.join(root, 'assets/medical-art/prompts.json'), 'utf8').then(JSON.parse),
  ]);
  browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({ viewport:{width:1440,height:1000} });
  await context.setOffline(true);
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.setContent('<!doctype html><html lang="ru"><body><main id="art"></main></body></html>');
  await page.addStyleTag({ content:styles + '\n#art{display:grid;grid-template-columns:repeat(3,1fr)}.aid-guide-illustration{width:100%;height:auto}' });
  await page.addScriptTag({ content:embedMedicalArt(script) });
  await page.evaluate(() => {
    document.querySelector('#art').innerHTML = Object.values(emergencyGuideContent).flatMap(guide => guide.steps.map(step => `<section class="aid-guide">${emergencyGuideScene(step[3],step[0])}</section>`)).join('');
    document.getAnimations().forEach(animation => animation.finish());
  });
  check(await page.locator('[data-aid-scene]').count() === 21, 'All 21 medical scenes render together');
  const integrity = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    const missing = [];
    for (const node of document.querySelectorAll('svg *')) {
      const style = getComputedStyle(node);
      for (const value of [style.fill,style.stroke,style.filter,style.clipPath]) for (const match of value.matchAll(/url\(["']?[^#]*#([^\)"']+)/g)) if (!document.getElementById(match[1])) missing.push(match[1]);
    }
    return { unique:new Set(ids).size === ids.length, missing };
  });
  check(integrity.unique && !integrity.missing.length, 'Simultaneous scenes have unique paint definitions and no broken SVG references');
  const assets = await Promise.all(manifest.assets.map(async asset => 'data:image/png;base64,' + (await fs.readFile(path.join(root,'assets/medical-art',asset.file))).toString('base64')));
  check(await page.evaluate(async assets => {
    const loaded = await Promise.all(assets.map(async src => { const image = new Image(); image.src = src; await image.decode(); return image.naturalWidth > 600 && image.naturalHeight > 600; }));
    const layers = [...document.querySelectorAll('svg image')].map(node => node.getAttribute('href'));
    await Promise.all(layers.map(async src => { const image = new Image(); image.src = src; await image.decode(); }));
    return loaded.every(Boolean) && layers.every(src => src.startsWith('data:image/png;base64,'));
  }, assets), 'Every generated asset and every anatomical SVG image layer decodes offline');
  async function needleGeometry(scene) {
    return page.locator(`[data-aid-scene="${scene}"]`).evaluate(svg => {
      const needle = svg.querySelector('[data-art-part="pen-needle"]');
      const hub = svg.querySelector('[data-art-part="pen-needle-hub"]');
      const body = svg.querySelector('[data-art-part="pen-body"]');
      const skin = svg.querySelector('[data-art-part="skin-surface"]');
      const fat = svg.querySelector('[data-art-part="subcutaneous-layer"]');
      const point = (node, p) => new DOMPoint(p.x,p.y).matrixTransform(node.getScreenCTM());
      const tip = point(needle,needle.getPointAtLength(needle.getTotalLength()));
      let surface, distance=Infinity;
      for(let i=0;i<=300;i++) { const p=point(skin,skin.getPointAtLength(skin.getTotalLength()*i/300)); if(Math.abs(p.x-tip.x)<distance) {distance=Math.abs(p.x-tip.x);surface=p.y;} }
      return { hubBottom:hub.getBoundingClientRect().bottom, bodyBottom:body.getBoundingClientRect().bottom, surface, tip:tip.y, fatTop:fat.getBoundingClientRect().top, fatBottom:fat.getBoundingClientRect().bottom };
    });
  }
  for (const scene of ['skin','hold']) {
    const g = await needleGeometry(scene);
    check(g.hubBottom <= g.surface + .5 && g.bodyBottom < g.surface && g.tip > g.fatTop && g.tip < g.fatBottom,
      `${scene}: only the needle crosses skin, and its tip ends inside subcutaneous tissue`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const scene of ['skin','hold']) {
    const g = await needleGeometry(scene);
    check(g.hubBottom <= g.surface + .5 && g.tip > g.fatTop && g.tip < g.fatBottom,
      `${scene}: reduced motion preserves the correct final injection geometry`);
  }
  check(!errors.length && !requests.length, 'Medical art produces no browser errors or external requests');
  console.log(`${checks} medical artwork checks passed.`);
})().catch(error => {console.error(error);process.exitCode=1;}).finally(async () => {await browser?.close();});
