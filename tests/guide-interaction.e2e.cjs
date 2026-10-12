/* Offline guide interactions: precise lens, preparation, local speech and learning isolation. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const embedMedicalArt = require('../scripts/art-assets.cjs');
const { browserType, launchOptions, output } = require('./support.cjs');
const root = path.resolve(__dirname, '..');
let browser, checks = 0;
const check = (condition, name) => { assert.ok(condition, name); checks++; console.log('PASS ' + name); };
(async () => {
  await fs.mkdir(output, {recursive:true});
  const [script, styles] = await Promise.all([
    fs.readFile(path.join(root,'src/emergency-guides.js'),'utf8'),
    Promise.all(['styles','design-system','emergency','emergency-guides'].map(name => fs.readFile(path.join(root,`src/${name}.css`),'utf8'))).then(parts=>parts.join('\n')),
  ]);
  browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({viewport:{width:1180,height:1000}});
  await context.setOffline(true);
  const page = await context.newPage(), errors=[], requests=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('request', r=>{if (/^https?:/.test(r.url())) requests.push(r.url());});
  await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main style="max-width:1050px;margin:auto"><div id="fixture"></div><input id="emergencySugarValue" aria-label="Реальное значение"><input id="learningReadingValue" aria-label="Учебное значение"></main></body></html>');
  await page.addStyleTag({content:styles});
  await page.addScriptTag({content:embedMedicalArt(script)});
  await page.evaluate(()=>{
    window.voiceCalls = [];
    window.availableVoices = [
      {name:'Remote Russian',lang:'ru-RU',localService:false},
      {name:'Local English',lang:'en-GB',localService:true},
      {name:'Local Russian',lang:'ru-RU',localService:true},
    ];
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:class {constructor(text){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>window.availableVoices,speak:u=>window.voiceCalls.push({action:'speak',voice:u.voice,text:u.text}),cancel:()=>window.voiceCalls.push({action:'cancel'}),pause:()=>window.voiceCalls.push({action:'pause'}),resume:()=>window.voiceCalls.push({action:'resume'})}});
    document.querySelector('#fixture').innerHTML = emergencyGuideMarkup('measure');
    bindEmergencyGuides(document.querySelector('#fixture'));
  });
  const guide = page.locator('[data-aid-guide]');
  const action = name => guide.locator(`[data-aid-guide-action="${name}"]`);
  check(await guide.locator('.aid-guide-supply').count()===4 && await guide.locator('.aid-guide-preparation').getAttribute('open')!==null,'Preparation shows illustrated measurement supplies');
  check((await page.evaluate(()=>window.voiceCalls)).length===0,'Instructions never auto-play speech');
  await action('prepared').click();
  check(await guide.locator('.aid-guide-preparation').getAttribute('open')===null && await guide.getAttribute('data-aid-guide-step')==='0','Preparation closes without skipping the first medical step');
  await action('next').click();
  check(await guide.locator('.aid-guide-explanation').getAttribute('open')===null && (await guide.locator('.aid-guide-note').innerText()).includes('срок годности'),'Full explanation starts collapsed while the safety note remains visible');
  check(await guide.locator('.aid-guide-picture-top,.aid-guide-eyebrow,.aid-guide-total').count()===0,'The guide removes repeated step labels and decorative metadata');
  await guide.locator('.aid-guide-explanation > summary').focus(); await page.keyboard.press('Enter');
  check(await guide.locator('.aid-guide-explanation').getAttribute('open')!==null && (await guide.locator('.aid-guide-explanation > p').innerText()).includes('закрытой упаковки'),'Keyboard users can reveal the unchanged complete instruction');
  await page.keyboard.press('Enter');
  await action('replay').click();
  await action('motion').click();
  const motionBefore=await guide.evaluate(e=>({art:e.querySelector('.aid-insert-strip').getAnimations()[0].currentTime,timeline:e.querySelector('.aid-guide-time-track > span').getAnimations()[0].currentTime}));
  await page.waitForTimeout(120);
  const motionAfter=await guide.evaluate(e=>({art:e.querySelector('.aid-insert-strip').getAnimations()[0].currentTime,timeline:e.querySelector('.aid-guide-time-track > span').getAnimations()[0].currentTime}));
  check(Math.abs(motionBefore.art-motionAfter.art)<20 && Math.abs(motionBefore.timeline-motionAfter.timeline)<20 && (await guide.locator('.aid-guide-motion-status').innerText())==='На паузе','Pause freezes the same illustration and timeline without promising motion');
  await action('motion').click();
  await guide.evaluate(e=>e.querySelectorAll('.aid-guide-illustration *,.aid-guide-time-track > span').forEach(node=>node.getAnimations().forEach(animation=>animation.finish())));
  await page.waitForFunction(()=>document.querySelector('.aid-guide-picture').dataset.aidMotionStatus==='finished');
  check(await action('motion').isHidden() && (await guide.locator('.aid-guide-motion-status').innerText())==='Итог движения' && await guide.getAttribute('data-aid-guide-step')==='1','Finite completion shows the final state and never advances the medical step');
  const sourceGeometry = await guide.locator('.aid-guide-illustration').innerHTML();
  await guide.locator('[data-aid-spot="1"] text').click();
  check(await guide.locator('.aid-guide-illustration').innerHTML()===sourceGeometry,'Detail lens preserves every path from the original scene');
  check(await guide.locator('.aid-guide-illustration').getAttribute('viewBox')!=='0 0 640 430' && await action('overview').isVisible(),'Detail lens enlarges exact scene coordinates and has an obvious return');
  check(await guide.locator('.aid-insert-strip').evaluate(e=>getComputedStyle(e).animationName==='none' && new DOMMatrix(getComputedStyle(e).transform).m42===0),'Lens freezes the correct final frame without replaying a medical action');
  check((await guide.locator('.aid-guide-detail-caption').innerText()).includes('разъём'),'Selected detail explains the part’s purpose');
  await page.screenshot({path:path.join(output,'guide-detail-desktop.png')});
  await action('overview').click();
  check(await guide.locator('.aid-guide-illustration').getAttribute('viewBox')==='0 0 640 430','Overview restores the whole illustration');
  check(await guide.locator('.aid-insert-strip').evaluate(e=>getComputedStyle(e).animationName==='none'),'Leaving a detail does not silently repeat the demonstrated action');
  await action('replay').click();
  check(await guide.locator('.aid-insert-strip').evaluate(e=>getComputedStyle(e).animationName!=='none'),'Only explicit replay restarts movement after a detail');
  await action('speak').click();
  let calls = await page.evaluate(()=>window.voiceCalls);
  check(calls.at(-1).action==='speak' && calls.at(-1).voice.name==='Local Russian','Speech explicitly selects a local Russian voice, never the remote/default voice');
  check(calls.at(-1).text.includes('Вставьте тест-полоску') && calls.at(-1).text.includes('закрытой упаковки'),'Speech reads the complete instruction even when Details is closed');
  await action('speech-pause').click();
  check((await page.evaluate(()=>window.voiceCalls)).at(-1).action==='pause' && await action('speech-pause').getAttribute('aria-pressed')==='true','Speech has a separately labelled pause');
  await action('speech-pause').click();
  check((await page.evaluate(()=>window.voiceCalls)).at(-1).action==='resume','Speech resumes on explicit request');
  await action('speak').click();
  calls = await page.evaluate(()=>window.voiceCalls);
  check(calls.at(-2).action==='cancel' && calls.at(-1).action==='speak','Replay cancels the previous utterance before speaking again');
  await action('next').click();
  check((await page.evaluate(()=>window.voiceCalls)).at(-1).action==='cancel' && await action('speech-stop').isHidden(),'Changing step stops speech and resets its controls');
  await action('speak').click(); await action('speech-stop').click();
  check((await page.evaluate(()=>window.voiceCalls)).at(-1).action==='cancel','Explicit stop cancels speech');
  await page.evaluate(()=>{window.availableVoices=[{name:'Remote Russian',lang:'ru-RU',localService:false}];window.voiceCalls=[];});
  await action('speak').click();
  check(!(await page.evaluate(()=>window.voiceCalls)).some(c=>c.action==='speak') && (await guide.locator('.aid-guide-speech-status').innerText()).includes('голос пока недоступен'),'Unavailable local voice gives an honest fallback without remote synthesis');
  await page.evaluate(()=>{window.availableVoices=[{name:'Local Russian',lang:'ru-RU',localService:true}];});
  await action('speak').click();
  await page.evaluate(()=>document.querySelector('#fixture').hidden=true);
  await page.waitForFunction(()=>window.voiceCalls.at(-1).action==='cancel');
  check(true,'Hiding a guide cancels speech even without a modal hook');
  await page.evaluate(()=>document.querySelector('#fixture').hidden=false);
  await action('speak').click();
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  check((await page.evaluate(()=>window.voiceCalls)).at(-1).action==='cancel','Leaving the page cancels speech');
  await action('speak').click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  check((await page.evaluate(()=>window.voiceCalls)).at(-1).action==='cancel','Switching away from the visible page cancels speech');
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
  await action('speak').click();
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML=emergencyGuideMarkup('measure',{training:true,readingTarget:'learningReadingValue'});window.learningEvent=null;document.querySelector('#fixture').addEventListener('aid-guide-reading',event=>window.learningEvent=event.detail);});
  await page.waitForFunction(()=>window.voiceCalls.at(-1).action==='cancel');
  check(true,'Replacing the guide cancels speech from its old DOM');
  await guide.locator('[data-aid-guide-target="4"]').click();
  check(!(await guide.locator('.aid-guide-note').innerText()).includes('LO') && (await guide.locator('.aid-guide-note').innerText()).includes('учебный'),'Training result instructions refer to the demo instead of real emergency controls');
  await guide.locator('[data-aid-guide-target="5"]').click(); await action('reading').click();
  check(await page.locator('#learningReadingValue').evaluate(e=>e===document.activeElement) && await page.evaluate(()=>window.learningEvent.training===true && window.learningEvent.targetId==='learningReadingValue'),'Completion dispatches the training event and focuses only the requested reading target');
  for (const width of [320,390]) {
    await page.setViewportSize({width,height:844});
    for (const large of [false,true]) {
      await page.evaluate(large=>document.documentElement.classList.toggle('large-text',large),large);
      const layout=await guide.evaluate(e=>{const title=e.querySelector('.aid-guide-step-heading').getBoundingClientRect(),picture=e.querySelector('.aid-guide-picture').getBoundingClientRect(),copy=e.querySelector('.aid-guide-copy').getBoundingClientRect();return title.bottom<=picture.top+1 && picture.bottom<=copy.top+1 && e.querySelectorAll('h4').length===1 && e.scrollWidth<=e.clientWidth+1;});
      check(layout,`Mobile ${width}px${large?' large text':''}: heading, illustration, then explanation, without duplicated title or overflow`);
    }
  }
  await page.setViewportSize({width:320,height:844});
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.documentElement.classList.add('large-text','high-contrast');});
  await guide.locator('[data-aid-guide-target="0"]').click();
  check(await guide.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Preparation fits 320px with large text and high contrast');
  await action('prepared').click();
  await guide.locator('[data-aid-detail="2"]').click();
  await action('speak').click();
  check(await guide.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Detail and speech controls fit a narrow accessible layout');
  await page.screenshot({path:path.join(output,'guide-detail-mobile-accessible.png'),fullPage:true});
  await guide.locator('[data-aid-guide-target="4"]').click();
  check(await action('motion').isHidden() && await action('replay').isHidden() && (await guide.locator('.aid-guide-motion-status').innerText())==='Схема','A static reading diagram never claims that a demonstration is playing');
  await guide.locator('[data-aid-guide-target="0"]').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('.aid-guide-picture').dataset.aidMotionStatus==='reduced');
  check(await action('replay').isDisabled() && await action('motion').isDisabled(),'Changing the system motion preference immediately disables playback');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>document.querySelector('.aid-guide-picture').dataset.aidMotionStatus==='finished');
  check(await guide.locator('.aid-wash-water').evaluate(e=>getComputedStyle(e).animationName==='none') && await action('replay').isEnabled(),'Re-enabling motion leaves the final frame until explicit replay');
  await page.emulateMedia({reducedMotion:'reduce'});
  await action('next').click(); await guide.locator('[data-aid-detail="1"]').click();
  check(await guide.locator('.aid-insert-strip').evaluate(e=>getComputedStyle(e).animationName==='none'),'Detail remains usable with reduced motion');
  await page.evaluate(()=>{const main=document.querySelector('main');const overlay=document.createElement('div');overlay.id='emergencyModal';overlay.className='modal-overlay';main.replaceWith(overlay);const shell=document.createElement('div');shell.className='modal-content aid-shell';overlay.append(shell);shell.append(main);document.querySelector('.aid-guide-stage').scrollIntoView({block:'start'});});
  check(await action('next').evaluate(button=>{const b=button.getBoundingClientRect(),s=document.querySelector('.aid-shell').getBoundingClientRect();return b.top>=s.top && b.bottom<=s.bottom+1;}),'Step controls stay visible in an internally scrolling mobile modal');
  await page.screenshot({path:path.join(output,'guide-sticky-mobile.png')});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>document.documentElement.classList.remove('reduce-motion'));
  const completeness = await page.evaluate(()=>{
    const host=document.createElement('div'); document.body.append(host);
    let scenes=0, valid=true;
    for(const [kind, guide] of Object.entries(emergencyGuideContent)) for(let i=0;i<guide.steps.length;i++) {
      host.innerHTML=`<section class="aid-guide">${emergencyGuideInner(kind,i)}</section>`;
      const [title,instruction,note,scene]=guide.steps[i];
      valid &&=host.querySelector('.aid-guide-explanation > p').textContent===instruction && host.querySelector('.aid-guide-note').textContent==='Важно'+note && !host.querySelector('.aid-guide-note').closest('details');
      const durations=[...host.querySelectorAll('.aid-guide-illustration *')].flatMap(node=>node.getAnimations().map(animation=>animation.effect.getTiming()));
      valid &&=durations.every(timing=>timing.iterations===1 && timing.fill==='both' && timing.duration<=emergencyGuideMotion[scene]?.[0]*1000);
      scenes++;
    }
    host.remove(); return {scenes,valid};
  });
  check(completeness.scenes===21 && completeness.valid,'All 21 scenes retain their complete instruction and visible warnings; finite motion cannot outlast its progress');
  check(!errors.length,`No browser errors: ${errors.join('; ')}`);
  check(!requests.length,'Supplies, zoom and speech controls request no network resources');
  console.log(`${checks} guide interaction checks passed. Screenshots: ${output}`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser) await browser.close();});
