// A short introduction. Its only persisted value is the versioned completion flag.
const startGuideStorageKey = 'diabcontrol_start_guide_v1';
let startGuideStep = 0;
let startGuideEventsBound = false;
let startGuideAutoAttempted = false;
let startGuideWasOpen = false;
let startGuideExitReason = null;
let startGuideReturnFocus = null;
// Device previews share the actual instruction artwork. Only annotations fade in.
function startGuideProcedureArt(scene, label) {
  return `<div class="sg-procedure-preview sg-enter">${emergencyGuideScene(scene, label)}</div>`;
}
const startGuideScenes = [
  {
    title: 'Проверьте состояние',
    lead: 'Без сознания или трудно дышит — звоните 112.',
    art: () => `<div class="sg-human-art sg-enter"><img src="__MEDICAL_ART_RESPONSE__" alt="" width="1536" height="1024" decoding="async"/></div><div class="sg-reading-pair sg-enter sg-stage-two"><span>Обратитесь к человеку</span><i aria-hidden="true">→</i><span>Оцените дыхание</span></div>`,
  },
  {
    title: 'Число + единица',
    lead: 'Измерьте сахар по картинкам. Перенесите показание с прибора.',
    art: () => `${startGuideProcedureArt('result', 'Учебный пример: 5,8 ммоль/л')}<div class="sg-reading-pair sg-enter sg-stage-two"><span><b>1</b> Число</span><span><b>2</b> Единица</span></div>`,
  },
  {
    title: 'Один шаг за раз',
    lead: 'Получите порядок действий по результату. Смотрите, повторяйте, действуйте.',
    art: () => `<div class="sg-example-step sg-enter"><span>ПРИМЕР ШАГА</span><strong>Поднесите каплю к краю полоски</strong></div>${startGuideProcedureArt('sample', 'Капля крови касается края тест-полоски')}<div class="sg-reading-pair sg-enter sg-stage-two"><span>Смотрите</span><i aria-hidden="true">→</i><span>Повторяйте</span><i aria-hidden="true">→</i><span>Далее</span></div>`,
  },
];
function startGuideArtMarkup(scene) {
  return typeof scene.art === 'function' ? scene.art() : scene.art;
}

function startGuideRemember(status) {
  if (!['completed', 'skipped'].includes(status)) return;
  try { localStorage.setItem(startGuideStorageKey, status); } catch (_) { /* The guide remains usable without storage. */ }
}
function startGuideVisibleFocus(element) {
  return Boolean(element?.isConnected && element.getClientRects().length && !element.closest('.hidden,[inert]'));
}
function startGuideFallbackFocus() {
  const candidates = session
    ? [$('profileBtn'), $('navToday')]
    : [...document.querySelectorAll('#authContainer [data-open-start-guide]'), $('loginUsername'), $('publicEmergencyBtn')];
  return candidates.find(startGuideVisibleFocus) || null;
}
function startGuideSyncMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
  $('startGuideReplay').disabled = reduced;
  $('startGuideReplayLabel').textContent = reduced ? 'Статичная схема' : 'Повторить';
  $('startGuideReplay').setAttribute('aria-label', reduced ? 'Статичная схема: движение отключено в настройках' : 'Повторить анимацию');
}
function startGuideRender(focus = true) {
  const scene = startGuideScenes[startGuideStep];
  $('startGuideTitle').textContent = scene.title;
  $('startGuideLead').textContent = scene.lead;
  $('startGuideArt').innerHTML = startGuideArtMarkup(scene);
  $('startGuideArt').dataset.scene = String(startGuideStep);
  startGuideSyncMotion();
  $('startGuideCount').textContent = `${startGuideStep + 1} из ${startGuideScenes.length}`;
  $('startGuideModal').querySelectorAll('.start-guide-progress li').forEach((item, index) => {
    item.classList.toggle('is-complete', index < startGuideStep);
    if (index === startGuideStep) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  $('startGuideBack').disabled = startGuideStep === 0;
  $('startGuideNext').innerHTML = startGuideStep === startGuideScenes.length - 1
    ? 'Попробовать на примере <span aria-hidden="true">→</span>'
    : 'Далее <span aria-hidden="true">→</span>';
  $('startGuideModal').querySelector('.start-guide-shell').scrollTop = 0;
  if (focus) $('startGuideTitle').focus({ preventScroll: true });
}
function resetStartGuide() {
  if (startGuideWasOpen) startGuideRemember(startGuideExitReason || 'skipped');
  startGuideWasOpen = false;
  startGuideExitReason = null;
  $('startGuideArt').innerHTML = '';
  startGuideStep = 0;
}
function openStartGuide() {
  if (busy || !$('startGuideModal') || activeModal?.id === 'startGuideModal') return;
  const fromSettings = activeModal?.id === 'profileModal';
  const focusedElement = document.activeElement;
  startGuideReturnFocus = fromSettings ? $('profileBtn') : startGuideVisibleFocus(focusedElement) && focusedElement !== document.body ? focusedElement : null;
  startGuideStep = 0;
  startGuideExitReason = null;
  startGuideRender(false);
  openModal('startGuideModal');
  startGuideWasOpen = true;
  // The original launcher is no longer inert after this modal closes.
  previousFocus = startGuideReturnFocus || (session ? $('profileBtn') : $('loginUsername'));
  $('startGuideTitle').focus({ preventScroll: true });
}
function maybeShowStartGuide() {
  if (startGuideAutoAttempted || session || activeModal || busy) return;
  try { if (['completed', 'skipped'].includes(localStorage.getItem(startGuideStorageKey))) return; } catch (_) { /* Show once per page load if storage is unavailable. */ }
  startGuideAutoAttempted = true;
  openStartGuide();
}
function startGuideLeave(destination) {
  const returnFocus = startGuideReturnFocus;
  startGuideExitReason = destination === 'emergency' ? 'urgent' : startGuideStep === startGuideScenes.length - 1 ? 'completed' : 'skipped';
  if (destination === 'learning') openLearningMode();
  else if (destination === 'emergency') emergencyOpen();
  else closeModal();
  if (activeModal) {
    // openModal replaces previousFocus with the now-hidden intro control; repair that target.
    previousFocus = returnFocus?.isConnected && !returnFocus.closest('#startGuideModal,#profileModal')
      ? returnFocus : (session ? $('profileBtn') : $('loginUsername'));
  } else if (!startGuideVisibleFocus(document.activeElement)) {
    (startGuideVisibleFocus(returnFocus) ? returnFocus : startGuideFallbackFocus())?.focus({ preventScroll: true });
  }
}
function bindStartGuideEvents() {
  if (startGuideEventsBound || !$('startGuideModal')) return;
  startGuideEventsBound = true;
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', startGuideSyncMotion);
  new MutationObserver(startGuideSyncMotion).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-open-start-guide]')) openStartGuide();
  });
  $('startGuideEmergency').addEventListener('click', () => startGuideLeave('emergency'));
  $('startGuideDiary').addEventListener('click', () => startGuideLeave('diary'));
  $('startGuideBack').addEventListener('click', () => {
    if (startGuideStep > 0) { startGuideStep--; startGuideRender(); }
  });
  $('startGuideNext').addEventListener('click', () => {
    if (startGuideStep < startGuideScenes.length - 1) { startGuideStep++; startGuideRender(); }
    else startGuideLeave('learning');
  });
  $('startGuideReplay').addEventListener('click', () => { $('startGuideArt').innerHTML = startGuideArtMarkup(startGuideScenes[startGuideStep]); });
}
