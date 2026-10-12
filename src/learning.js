// A deliberately isolated exercise. No profile, diary, draft, timer or persistence calls.
const learningExamples = Object.freeze({
  mmol: Object.freeze({ value: 5.8, display: '5,8', unit: 'ммоль/л' }),
  mgdl: Object.freeze({ value: 104, display: '104', unit: 'мг/дл' }),
});
let learningExampleKind = 'mmol';
let learningEventsBound = false;

function learningShowPane(pane, focusId) {
  const root = $('learningModal');
  root.querySelectorAll('.learning-pane').forEach((element) => element.classList.toggle('hidden', element.id !== pane));
  root.querySelector('.learning-shell').dataset.stage = pane === 'learningWelcome' ? 'welcome' : 'practice';
  const index = pane === 'learningComplete' ? 2 : pane === 'learningReading' ? 1 : 0;
  root.querySelectorAll('.learning-progress li').forEach((item, i) => {
    item.classList.toggle('is-complete', i < index);
    if (i === index) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  root.querySelector('.learning-shell').scrollTop = 0;
  if (focusId) $(focusId)?.focus({ preventScroll: true });
}

function learningClearAnswer() {
  $('learningReadingValue').value = '';
  $('learningReadingUnit').value = '';
  $('learningReadingValue').removeAttribute('aria-invalid');
  $('learningReadingUnit').removeAttribute('aria-invalid');
  $('learningReadingValue').setAttribute('aria-describedby', 'learningReadingHint');
  $('learningReadingUnit').removeAttribute('aria-describedby');
  $('learningReadingError').textContent = '';
  $('learningReadingError').classList.add('hidden');
  $('learningMatchedReading').textContent = '';
  delete $('learningReading').dataset.copyFocus;
}

function learningSetExample(kind = 'mmol') {
  learningExampleKind = Object.prototype.hasOwnProperty.call(learningExamples, kind) ? kind : 'mmol';
  const example = learningExamples[learningExampleKind];
  $('learningExampleValue').textContent = example.display;
  $('learningExampleUnit').textContent = example.unit;
  $('learningExampleScreen').setAttribute('aria-label', `Учебный пример: ${example.display} ${example.unit}`);
  $('learningModal').querySelectorAll('[data-learning-example]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.learningExample === learningExampleKind)));
  learningClearAnswer();
}

function learningOpenGuide() {
  const host = $('learningGuideHost');
  if (!host.firstElementChild) {
    host.innerHTML = emergencyGuideMarkup('measure', { training: true, readingTarget: 'learningReadingValue' });
    bindEmergencyGuides(host);
  }
  learningShowPane('learningInstructions', 'learningGuideTitle');
}

function learningOpenReading() {
  if (typeof emergencyGuideStopSpeech === 'function') emergencyGuideStopSpeech();
  learningShowPane('learningReading', 'learningReadingValue');
}

function learningRenderWelcomeArt() {
  const host = $('learningWelcomeIllustration');
  if (host && !host.firstElementChild) {
    host.innerHTML = emergencyGuideScene('result', 'Учебный пример: 5,8 ммоль/л');
    host.querySelector('svg')?.setAttribute('aria-hidden', 'true');
  }
  const device = $('learningExampleDevice');
  if (device && !device.firstElementChild) {
    device.innerHTML = `<svg viewBox="0 0 200 330" focusable="false">${aidArtSurface(aidStrip(100, 96, 0, true) + aidMeter(21, 92, 'blank'))}</svg>`;
  }
}

function resetLearningMode() {
  if (!$('learningModal')) return;
  if (typeof emergencyGuideStopSpeech === 'function') emergencyGuideStopSpeech();
  $('learningGuideHost').innerHTML = '';
  learningRenderWelcomeArt();
  learningSetExample('mmol');
  learningShowPane('learningWelcome');
}

function openLearningMode() {
  if (busy) return;
  const returnToProfileButton = activeModal?.id === 'profileModal';
  resetLearningMode();
  openModal('learningModal');
  // Opening training closes Settings, so its hidden launch button cannot receive focus later.
  if (returnToProfileButton) previousFocus = $('profileBtn');
  $('learningWelcomeTitle').focus({ preventScroll: true });
}

function learningCheckAnswer(event) {
  event.preventDefault();
  const example = learningExamples[learningExampleKind];
  const raw = $('learningReadingValue').value.trim();
  const normalized = raw.replace(',', '.');
  const valueMatches = /^\d+(?:[.,]\d+)?$/.test(raw) && Number(normalized) === example.value;
  const unitMatches = $('learningReadingUnit').value === learningExampleKind;
  $('learningReadingValue').setAttribute('aria-describedby', 'learningReadingHint');
  $('learningReadingUnit').removeAttribute('aria-describedby');
  $('learningReadingValue').setAttribute('aria-invalid', String(!valueMatches));
  $('learningReadingUnit').setAttribute('aria-invalid', String(!unitMatches));
  if (!valueMatches || !unitMatches) {
    const field = !valueMatches ? $('learningReadingValue') : $('learningReadingUnit');
    $('learningReadingError').textContent = !valueMatches
      ? `На экране ${example.display}. Перепишите это число.`
      : `Выберите единицу с экрана: ${example.unit}.`;
    $('learningReadingError').classList.remove('hidden');
    field.setAttribute('aria-describedby', 'learningReadingHint learningReadingError');
    field.focus();
    return;
  }
  $('learningReadingError').textContent = '';
  $('learningReadingError').classList.add('hidden');
  $('learningMatchedReading').textContent = `${example.display} ${example.unit}`;
  learningShowPane('learningComplete', 'learningCompleteTitle');
}

function bindLearningEvents() {
  if (learningEventsBound || !$('learningModal')) return;
  learningEventsBound = true;
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-learning]')) openLearningMode();
  });
  $('learningBegin').addEventListener('click', learningOpenGuide);
  $('learningBackToGuide').addEventListener('click', learningOpenGuide);
  $('learningSkipGuide').addEventListener('click', learningOpenReading);
  $('learningGoToReading').addEventListener('click', learningOpenReading);
  $('learningReadingForm').addEventListener('submit', learningCheckAnswer);
  $('learningGuideHost').addEventListener('aid-guide-reading', (event) => {
    if (event.detail?.training && event.detail?.readingTarget === 'learningReadingValue') learningOpenReading();
  });
  $('learningModal').querySelectorAll('[data-learning-example]').forEach((button) => {
    button.addEventListener('click', () => learningSetExample(button.dataset.learningExample));
  });
  $('learningTryOther').addEventListener('click', () => {
    learningSetExample(learningExampleKind === 'mmol' ? 'mgdl' : 'mmol');
    learningOpenReading();
  });
  $('learningRestart').addEventListener('click', () => {
    resetLearningMode();
    $('learningWelcomeTitle').focus({ preventScroll: true });
  });
  for (const id of ['learningReadingValue', 'learningReadingUnit']) {
    $(id).addEventListener('focus', () => {
      $('learningReading').dataset.copyFocus = id === 'learningReadingValue' ? 'number' : 'unit';
    });
    $(id).addEventListener('blur', () => {
      delete $('learningReading').dataset.copyFocus;
    });
    $(id).addEventListener('input', () => {
      $('learningReadingError').classList.add('hidden');
      $(id).removeAttribute('aria-invalid');
      $(id).removeAttribute('aria-describedby');
    });
  }
}
