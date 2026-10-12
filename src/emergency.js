// Transient first-aid flow. Readings here are never written to the diary.
let emergencyCondition = null, emergencyReading = null, emergencyBreathing = null;
let emergencyTimerEnd = null;
let emergencyRedFlags = false;
const EmergencyTriage = {
  parse(raw, selectedUnit = 'mmol') {
    const text = String(raw).trim().replace(',', '.');
    if (text.toUpperCase() === 'LO') return { kind: 'low', extreme: true, display: 'LO', mmol: null };
    if (text.toUpperCase() === 'HI') return { kind: 'high', extreme: true, display: 'HI', mmol: null };
    if (!/^\d+(\.\d+)?$/.test(text)) throw new Error('Введите число с экрана прибора, например 5,8, или выберите LO / HI.');
    const value = Number(text), mmol = selectedUnit === 'mgdl' ? value / 18 : value;
    if (!Number.isFinite(mmol) || mmol < 0.1 || mmol > 60) throw new Error('Проверьте число и единицу на приборе: допустимо 0,1–60 ммоль/л или 1,8–1080 мг/дл. Для LO / HI используйте отдельные кнопки.');
    return { kind: mmol < 4 ? 'low' : mmol > 10 ? 'high' : 'range', extreme: mmol < 3, mmol, value, selectedUnit };
  },
};
function aidStep(number, title, body) {
  return `<li><span class="aid-step-number">${number}</span><div><h4>${title}</h4>${body}</div></li>`;
}
function personal(text) {
  return text ? `<details class="aid-details"><summary>Дополнение из личного плана</summary><p class="multiline">${esc(text)}</p><p class="hint">Личная заметка. При тяжёлом состоянии сначала вызовите помощь.</p></details>` : '';
}
function aidFocus(id) { $(id).focus({ preventScroll: true }); $(id).scrollIntoView({ block: 'start', behavior: 'instant' }); }
function aidProgress(step) {
  const phase = step === 1 ? 'triage' : step === 2 ? 'measure' : emergencyCondition === 'conscious' ? 'result' : 'critical';
  document.querySelector('.aid-shell').dataset.aidPhase = phase;
  document.querySelector('.aid-triage').classList.toggle('hidden', step !== 1);
  $('aidMeasurement').classList.toggle('hidden', phase !== 'measure');
  $('aidChangeState').classList.toggle('hidden', step === 1);
  $('aidResultTools').classList.toggle('hidden', phase !== 'result');
  if (phase !== 'critical') $('emergencyUnconsciousResult').classList.add('hidden');
  [...document.querySelectorAll('.aid-progress li')].forEach((li, i) => {
    if (i + 1 === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.classList.toggle('is-complete', i + 1 < step);
  });
}
function aidReviewState() {
  emergencyGuideStopSpeech();
  emergencyCondition = null; emergencyBreathing = null;
  resetEmergencyCorrection();
  $('emergencyResult').classList.add('hidden');
  document.querySelectorAll('.aid-state').forEach(button => button.setAttribute('aria-pressed', 'false'));
  aidProgress(1);
  $('aidStateTitle').setAttribute('tabindex', '-1'); aidFocus('aidStateTitle');
}
function aidEnterNewReading() {
  if (emergencyCondition !== 'conscious') { aidReviewState(); return; }
  emergencyGuideStopSpeech();
  $('emergencySugarValue').value = '';
  aidInvalidateReading();
  $('emergencySugarValue').focus({ preventScroll: true });
  $('emergencySugarValue').scrollIntoView({ block: 'center', behavior: 'instant' });
}
// The conscious person's numbered actions use this manually controlled viewer.
// Emergency warnings and the breathing decision remain immediately visible.
function aidSequenceShow(sequence, index, focus = false) {
  const steps = [...sequence.children].filter(item => item.matches('li'));
  index = Math.max(0, Math.min(steps.length - 1, index));
  sequence.dataset.aidSequenceIndex = String(index);
  steps.forEach((item, i) => item.classList.toggle('hidden', i !== index));
  const navigation = sequence.previousElementSibling;
  navigation.querySelectorAll('[data-aid-sequence-step]').forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === index));
  });
  const controls = sequence.nextElementSibling;
  controls.querySelector('[data-aid-sequence-move="-1"]').disabled = index === 0;
  controls.querySelector('[data-aid-sequence-move="1"]').disabled = index === steps.length - 1;
  controls.querySelector('output').textContent = `Действие ${index + 1} из ${steps.length}`;
  if (focus) {
    const title = steps[index].querySelector('h4');
    title.tabIndex = -1; title.focus({ preventScroll: true });
    sequence.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}
function aidBindSequences() {
  $('emergencyResult').querySelectorAll('.aid-section > .aid-actions').forEach(sequence => {
    const steps = [...sequence.children];
    if (steps.length < 2) return;
    sequence.classList.add('aid-sequence');
    sequence.insertAdjacentHTML('beforebegin', `<div class="aid-sequence-tabs" role="group" aria-label="Выбрать действие">${steps.map((item, index) => `<button type="button" data-aid-sequence-step="${index}" aria-label="Действие ${index + 1}: ${esc(item.querySelector('h4').textContent)}"><b>${index + 1}</b><span>${esc(item.querySelector('h4').textContent)}</span></button>`).join('')}</div>`);
    sequence.insertAdjacentHTML('afterend', '<div class="aid-sequence-controls"><button type="button" class="secondary" data-aid-sequence-move="-1">← Назад</button><output aria-live="polite"></output><button type="button" data-aid-sequence-move="1">Далее →</button></div>');
    aidSequenceShow(sequence, 0);
  });
}
function resetEmergencyState(preserveTimer = false) {
  emergencyCondition = null; emergencyReading = null; emergencyBreathing = null;
  if (!preserveTimer) emergencyTimerEnd = null;
  resetEmergencyCorrection();
  updateAidTimer();
}
function emergencyOpen() {
  const p = session ? data.profile : defaults();
  emergencyCondition = null; emergencyReading = null; emergencyBreathing = null;
  emergencyRedFlags = false;
  resetEmergencyCorrection();
  $('emergencyIdentity').textContent = session ? `${session.name} · диабет, тип ${p.diabType}` : 'Дневник закрыт. Личные сведения доступны после входа.';
  $('emergencyPhones').innerHTML = p.phones.map(t => `<a href="tel:${esc(t.replace(/[^+\d]/g, ''))}">${esc(t)}</a>`).join('') || '<p>Контакты не указаны</p>';
  $('emergencyAddress').textContent = `Адрес: ${p.address || 'не указан'}`;
  $('emergencyDoctor').textContent = `Врач: ${p.doctor || 'не указан'}`;
  $('emergencyNotes').textContent = `Важные сведения: ${p.notes || 'не указаны'}`;
  $('measureInstruction').textContent = p.measureInstruction ? `Личная инструкция: ${p.measureInstruction}` : '';
  $('emergencyRecentInsulin').innerHTML = session ? data.insulin.slice().sort((a,b) => String(b.datetime || '').localeCompare(String(a.datetime || ''))).slice(0,5).map(i => `<p>${esc(dateLabel(i.datetime))} · ${fmt(i.dose)} ${i.unit === 'legacy-xe' ? 'ХЕ (единицы не уточнены)' : 'ЕД'} · ${esc(i.name || 'Препарат не указан')}</p>`).join('') || '<p>Записей нет</p>' : '<p>Дневник закрыт</p>';
  $('emergencyUnit').value = p.unit;
  $('emergencySugarValue').value = '';
  $('aidReadingError').classList.add('hidden');
  $('emergencyResult').innerHTML = '';
  $('emergencyResult').classList.add('hidden');
  $('emergencyUnconsciousResult').innerHTML = '';
  $('aidMeasurement').classList.add('hidden');
  $('aidMeasureGuide').innerHTML = emergencyGuideMarkup('measure');
  bindEmergencyGuides($('aidMeasureGuide'));
  $('aidThresholdNote').textContent = 'Выше 10 ммоль/л (180 мг/дл) — высокий для этого справочного алгоритма. Индивидуальные цели могут отличаться.' + (session ? ` Ваша цель в дневнике: ${fmt(p.targetLow)}–${fmt(p.targetHigh)} ммоль/л.` : '');
  document.querySelectorAll('.aid-state').forEach(b => b.setAttribute('aria-pressed', 'false'));
  for (const [id, icon] of [['emergencyConsciousBtn', 'conscious'], ['emergencyUnknownBtn', 'unconscious'], ['emergencyCannotSwallowBtn', 'unsafe']])
    $(id).querySelector('.aid-state-icon').innerHTML = uiIcon(icon);
  aidProgress(1); updateAidTimer();
  openModal('emergencyModal');
}
function aidChooseState(state) {
  emergencyGuideStopSpeech();
  emergencyCondition = state; emergencyBreathing = null; resetEmergencyCorrection();
  const selected = { conscious: 'emergencyConsciousBtn', unconscious: 'emergencyUnknownBtn', unsafe: 'emergencyCannotSwallowBtn' }[state];
  document.querySelectorAll('.aid-state').forEach(b => b.setAttribute('aria-pressed', String(b.id === selected)));
  $('emergencyUnconsciousResult').innerHTML = '';
  $('emergencyResult').innerHTML = ''; $('emergencyResult').classList.add('hidden');
  $('aidMeasurement').classList.toggle('hidden', state !== 'conscious');
  if (state === 'conscious') {
    // Reassess with a fresh measurement when returning from a critical state.
    $('emergencySugarValue').value = ''; aidInvalidateReading();
    $('aidMeasureTitle').setAttribute('tabindex', '-1'); aidFocus('aidMeasureTitle');
  } else {
    emergencyTimerEnd = null; updateAidTimer(); aidProgress(3); renderCriticalAid();
  }
}
function renderCriticalAid() {
  resetEmergencyCorrection();
  const kind = emergencyReading?.kind || 'unknown', p = session ? data.profile : defaults();
  const title = kind === 'low' ? 'Низкий сахар · нужна экстренная помощь' : kind === 'high' ? 'Высокий сахар · нужна экстренная помощь' : 'Не отвечает или не может глотать';
  let html = `<div class="aid-critical"><p class="aid-eyebrow">ДЕЙСТВУЙТЕ СЕЙЧАС</p><h3>${title}</h3><ol class="aid-actions">`;
  html += aidStep(1, 'Позвоните 112 или 103', '<p>Включите громкую связь. Назовите адрес, скажите о диабете и состоянии человека. Следуйте указаниям диспетчера.</p>');
  html += aidStep(2, 'Проверьте нормальное дыхание', '<p>Если человек не отвечает, осторожно запрокиньте голову и приподнимите подбородок. Не дольше 10 секунд смотрите на движения груди, слушайте и ощущайте дыхание. Редкие судорожные вздохи — не нормальное дыхание.</p>');
  html += `</ol><div class="aid-breathing"><button type="button" data-aid-breathing="normal" class="secondary" aria-pressed="${emergencyBreathing === 'normal'}">Дышит нормально</button><button type="button" data-aid-breathing="abnormal" class="aid-danger-button" aria-pressed="${emergencyBreathing === 'abnormal'}">Нет нормального дыхания / не уверен</button></div><div id="aidBreathingResult" tabindex="-1">`;
  if (emergencyBreathing === 'abnormal') html += `<div class="aid-cpr"><h4>Начинайте СЛР с диспетчером</h4><p>Уложите на спину на твёрдую поверхность. Взрослому нажимайте на центр грудной клетки с частотой 100–120 в минуту, на глубину 5–6 см, давая груди расправляться. Если обучены — 30 нажатий и 2 вдоха; иначе непрерывные нажатия.</p><p>Попросите принести автоматический дефибриллятор, если он рядом, и следуйте его командам. Для ребёнка выполняйте инструкции диспетчера. Не прерывайте СЛР ради замера или укола.</p></div>`;
  if (emergencyBreathing === 'normal') {
    html += `<ol class="aid-actions" start="3">${aidStep(3, 'Защитите дыхательные пути', '<p>Если без сознания — уложите на бок. Контролируйте дыхание до приезда помощи. При судорогах уберите опасные предметы, защитите голову; не удерживайте человека и ничего не вставляйте в рот. После судорог, если дышит нормально, поверните на бок.</p>')}${aidStep(4, 'Ничего через рот. Не вводите инсулин.', '<p>Не давайте пищу, напитки или лекарства через рот. Не кладите сахар, мёд или гель за щёку.</p>')}</ol>`;
    if (kind === 'low' || kind === 'unknown') html += `<div class="aid-glucagon-callout"><h4>${kind === 'low' ? 'При тяжёлой гипогликемии — глюкагон' : 'Если подозреваете тяжёлую гипогликемию'}</h4><p>Используйте доступный глюкагон, если знаете, как применить именно этот препарат; сверяйтесь с его инструкцией и диспетчером. Не ждите результата укола, чтобы вызвать помощь.</p><details class="aid-details" id="aidGlucagonDetails"><summary>Показать, как подготовить GlucaGen HypoKit</summary><p>Только набор с порошком и растворителем. У готовой ручки или назального глюкагона другие действия.</p>${emergencyGuideMarkup('glucagon')}</details><p>После пробуждения — быстрые углеводы, только когда человек полностью пришёл в себя и снова безопасно глотает. Сообщите бригаде время введения препарата.</p></div>`;
    if (kind === 'high') html += '<p class="aid-no-insulin"><strong>Даже при высоком сахаре не вводите инсулин человеку без сознания.</strong> Нужна неотложная медицинская помощь. Глюкагон высокий сахар не лечит.</p>';
    html += `<details class="aid-details"><summary>Как уложить на бок</summary>${emergencyGuideMarkup('recovery')}</details>`;
  }
  html += '</div><p class="aid-critical-rule"><strong>Пока уточняете дыхание: ничего через рот и никакого инсулина.</strong> Не оставляйте человека одного.</p></div>';
  if (emergencyBreathing !== 'abnormal') html += `<details class="aid-details" id="aidCriticalReadingDetails"><summary>Сахар уже измерен — указать результат</summary><p>Это уточняет алгоритм, но не заменяет вызов помощи и проверку дыхания.</p><form id="aidCriticalReadingForm" novalidate><label for="aidCriticalValue">Показание прибора, включая LO или HI</label><div class="aid-reading"><input id="aidCriticalValue" type="text" inputmode="decimal" maxlength="12" autocomplete="off"/><select id="aidCriticalUnit" aria-label="Единица измерения"><option value="mmol">ммоль/л</option><option value="mgdl">мг/дл</option></select></div><button type="submit">Уточнить действия</button><p id="aidCriticalError" role="alert"></p></form></details>`;
  html += personal(kind === 'low' ? p.lowSugarUnconsciousInstruction : kind === 'high' ? p.highSugarUnconsciousInstruction : '');
  $('emergencyUnconsciousResult').innerHTML = html;
  $('emergencyUnconsciousResult').classList.remove('hidden');
  bindEmergencyGuides($('emergencyUnconsciousResult'));
  if ($('aidCriticalReadingForm')) {
    $('aidCriticalUnit').value = $('emergencyUnit').value;
    $('aidCriticalReadingForm').onsubmit = e => { e.preventDefault(); try { emergencyReading = EmergencyTriage.parse($('aidCriticalValue').value, $('aidCriticalUnit').value); renderCriticalAid(); } catch(error) { $('aidCriticalError').textContent = error.message; } };
  }
  aidFocus('emergencyUnconsciousResult');
}
function aidInvalidateReading() {
  emergencyReading = null; resetEmergencyCorrection(); $('emergencyResult').innerHTML = ''; $('emergencyResult').classList.add('hidden');
  $('aidReadingError').classList.add('hidden'); $('emergencySugarValue').removeAttribute('aria-invalid');
  if (emergencyCondition === 'conscious') aidProgress(2);
}
function aidEvaluate(raw = $('emergencySugarValue').value) {
  if (emergencyCondition !== 'conscious') return;
  try {
    emergencyReading = raw === 'suspected' ? { kind: 'low', mmol: null, suspected: true } : EmergencyTriage.parse(raw, $('emergencyUnit').value);
    $('aidReadingError').classList.add('hidden'); $('emergencySugarValue').removeAttribute('aria-invalid');
    emergencyTimerEnd = null; updateAidTimer(); renderAidResult();
  } catch (error) {
    aidInvalidateReading(); $('aidReadingError').textContent = error.message; $('aidReadingError').classList.remove('hidden');
    $('emergencySugarValue').setAttribute('aria-invalid', 'true'); $('emergencySugarValue').focus();
  }
}
function renderAidResult() {
  resetEmergencyCorrection();
  const r = emergencyReading, p = session ? data.profile : defaults();
  const low = r.kind === 'low', high = r.kind === 'high';
  const title = r.suspected ? 'Подозрение на низкий сахар' : low ? (r.extreme ? 'Очень низкий сахар' : 'Низкий сахар') : high ? (r.extreme ? 'Сахар выше диапазона прибора' : 'Высокий сахар') : 'Сахар не снижен';
  let html = `<div class="aid-result-header ${low ? 'is-low' : high ? 'is-high' : 'is-range'}"><div><p class="aid-eyebrow">ШАГ 3 · ЧТО ДЕЛАТЬ СЕЙЧАС</p><h3>${title}</h3><p>${r.suspected ? 'Значение неизвестно · ориентируемся на симптомы' : r.display ? 'За пределами измерения · точное число неизвестно' : low ? 'Ниже 4 ммоль/л · действуйте сразу' : high ? 'Выше 10 ммоль/л · проверьте состояние и кетоны' : '4–10 ммоль/л · состояние человека важнее числа'}</p></div><div class="aid-result-number">${r.suspected ? '?' : r.display || fmt(r.value)}<small>${r.value ? (r.selectedUnit === 'mgdl' ? 'мг/дл' : 'ммоль/л') : ''}</small></div></div>`;
  html += `<div class="aid-deterioration"><strong>Без сознания, судороги или не может глотать?</strong><p>Сразу 112. Ничего через рот и никакого инсулина.</p><p class="aid-critical-preview">Проверьте дыхание: нет нормального — СЛР с диспетчером; дышит нормально — положите на бок.${low ? ' При тяжёлой гипогликемии используйте имеющийся глюкагон по инструкции.' : ''}</p><button type="button" id="${low ? 'emergencyUnconsciousLowBtn' : 'emergencyUnconsciousHighBtn'}" data-aid-critical class="aid-danger-button">Открыть экстренный алгоритм →</button></div>`;
  if (low) {
    html += `<div class="aid-section"><h3>Если бодрствует и безопасно глотает</h3>${r.extreme ? '<p class="aid-important">Значение очень низкое. Начинайте помощь сразу, оставайтесь рядом. При ухудшении или отсутствии эффекта — 112.</p>' : ''}<ol class="aid-actions">`;
    html += aidStep(1, 'Дайте 15 г быстрых углеводов взрослому', '<p>Например, таблетки глюкозы — количество по упаковке, или 150 мл сока, если на этикетке 10 г углеводов на 100 мл. Детям — количество из индивидуального плана.</p><div class="aid-carb-examples"><span><b>15 г</b>глюкозы по этикетке</span><span class="aid-or">или</span><span><b>150 мл</b>сока с 10 г / 100 мл</span></div><p class="hint">Шоколад действует медленнее; напитки «без сахара» не подходят.</p>');
    html += aidStep(2, 'Через 15 минут измерьте снова', '<p>Если всё ещё ниже 4 ммоль/л — снова быстрые углеводы и контроль через 15 минут. При ухудшении, отсутствии улучшения или невозможности глотать — 112.</p><button id="aidStartTimer" type="button" class="aid-primary">Углеводы приняты · начать 15 минут</button>');
    html += aidStep(3, 'После улучшения — еда и наблюдение', '<p>Когда сахар поднялся до 4 ммоль/л или выше и самочувствие улучшилось, съешьте обычную еду или перекус с углеводами длительного действия. После тяжёлой или повторной гипогликемии свяжитесь с лечащей командой.</p>');
    html += '</ol></div>' + personal(p.lowSugarInstruction);
  } else if (high) {
    html += `<div class="aid-section"><h3>Если человек в сознании</h3><div class="aid-important"><strong>Рвота, боль в животе, необычное дыхание, сонливость или спутанность?</strong><p>Звоните 112/103. Не ждите нового измерения или действия инсулина.</p><button type="button" data-aid-redflags class="aid-danger-button">Есть опасные симптомы</button></div><ol class="aid-actions">`;
    html += aidStep(1, 'Проверьте кетоны и самочувствие', `<p>${r.extreme ? 'При HI точное число неизвестно: срочно обратитесь за медицинской помощью; при симптомах выше — 112. Не рассчитывайте дозу по надписи HI.' : r.mmol >= 13.9 ? 'Сахар от 13,9 ммоль/л: проверьте кетоны, если есть прибор или полоски.' : 'При болезни или симптомах кетоацидоза проверьте кетоны, даже если сахар повышен умеренно.'} Следуйте своему плану на случай болезни.</p><details class="aid-details"><summary>Как понимать кетоны</summary><p>Кетоны в крови 0,6–1,5 ммоль/л: повторный контроль через 2 часа; если плохо — срочно свяжитесь с врачом. 1,6–3: срочно обратитесь к лечащей команде. Выше 3 или кетоны мочи выше 2+ — 112/103. При любом положительном тесте мочи следуйте плану на случай болезни и свяжитесь с лечащей командой. Если кетоны неизвестны и есть опасные симптомы — тоже 112.</p></details>`);
    html += aidStep(2, 'Вода, покой и личный план', '<p>Если безопасно глотает, можно пить воду небольшими порциями. Не используйте физическую нагрузку для снижения сахара. Не вводите дополнительный инсулин наугад и не повторяйте дозу раньше срока из личного плана.</p>');
    html += aidStep(3, 'Уточните назначенную коррекцию', '<p>Новичку без индивидуального плана дозу должен подсказать медицинский специалист. Если сахар не снижается несмотря на назначенное лечение, срочно свяжитесь с лечащей командой.</p>');
    html += '</ol></div>' + personal(p.highSugarInstruction);
    if (emergencyRedFlags) html += '<div class="aid-important"><strong>Вы отметили опасные симптомы — позвоните 112/103.</strong><p>Расчёт дозы недоступен в этом эпизоде помощи.</p></div>';
    if (!r.extreme && !emergencyRedFlags) html += `<div id="aidCorrectionHost">${renderEmergencyCorrection(r.mmol, { conscious: true, canSwallow: true })}</div>`;
    if (!emergencyRedFlags && !r.extreme) html += `<details id="aidInsulinGuide" class="aid-details"><summary>Как пользоваться назначенной шприц-ручкой</summary><p>Техника введения уже назначенной дозы. Эта инструкция сама по себе не определяет препарат и количество единиц.</p>${emergencyGuideMarkup('insulin')}</details>`;
  } else {
    html += `<div class="aid-section"><h3>Оцените самочувствие</h3><p>Это значение не исключает опасного состояния. При выраженной сонливости, спутанности, рвоте, боли в животе или необычном дыхании — 112/103.</p>${session && r.mmol > p.targetHigh ? `<p class="aid-important">Значение выше вашей личной верхней цели ${fmt(p.targetHigh)} ммоль/л. Следуйте согласованному плану; это не повод самостоятельно выбирать дозу.</p>` : ''}<p>Если показание не соответствует самочувствию, вымойте и высушите руки, измерьте ещё раз новой полоской. При сохраняющихся симптомах обратитесь за медицинской помощью.</p><button type="button" data-aid-redflags class="aid-danger-button">Есть опасные симптомы</button></div>`;
  }
  if (p.pump !== 'none') html += personal(p.pumpOffInstruction);
  $('emergencyResult').innerHTML = html; $('emergencyResult').classList.remove('hidden');
  if (high && !r.extreme) bindEmergencyCorrection();
  aidBindSequences();
  bindEmergencyGuides($('emergencyResult')); aidProgress(3); aidFocus('emergencyResult');
}
function updateAidTimer() {
  const active = emergencyTimerEnd !== null;
  $('aidTimer').classList.toggle('hidden', !active);
  if (!active) return;
  const seconds = Math.max(0, Math.ceil((emergencyTimerEnd - Date.now()) / 1000));
  $('aidTimerValue').textContent = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  $('aidTimer').classList.toggle('is-due', seconds === 0);
  $('aidTimerHint').textContent = seconds ? 'После быстрых углеводов · при ухудшении не ждите таймер' : '15 минут прошли. Измерьте сахар сейчас.';
  if (!seconds && $('aidTimerAnnouncement').textContent !== 'Пора повторно измерить сахар.') $('aidTimerAnnouncement').textContent = 'Пора повторно измерить сахар.';
}
function bindEmergencyEvents() {
  $('aidChangeState').onclick = aidReviewState;
  $('aidNewReading').onclick = aidEnterNewReading;
  $('aidSkipGuide').onclick = () => $('emergencySugarValue').focus();
  $('emergencyConsciousBtn').onclick = () => aidChooseState('conscious');
  $('emergencyUnknownBtn').onclick = () => aidChooseState('unconscious');
  $('emergencyCannotSwallowBtn').onclick = () => aidChooseState('unsafe');
  $('emergencyReadingForm').onsubmit = e => { e.preventDefault(); aidEvaluate(); };
  $('emergencySugarValue').oninput = aidInvalidateReading;
  $('emergencyUnit').onchange = () => { $('emergencySugarValue').value = ''; $('emergencySugarValue').placeholder = $('emergencyUnit').value === 'mgdl' ? 'Например, 105' : 'Например, 5,8'; aidInvalidateReading(); };
  $('aidLoBtn').onclick = () => { $('emergencySugarValue').value = 'LO'; aidEvaluate('LO'); };
  $('aidHiBtn').onclick = () => { $('emergencySugarValue').value = 'HI'; aidEvaluate('HI'); };
  $('aidSuspectedLowBtn').onclick = () => aidEvaluate('suspected');
  $('aidTimerMeasure').onclick = () => {
    if (emergencyCondition !== 'conscious') {
      $('aidStateTitle').setAttribute('tabindex', '-1'); aidFocus('aidStateTitle');
      $('aidTimerAnnouncement').textContent = 'Сначала выберите текущее состояние человека: в сознании или нужна экстренная помощь.';
      return;
    }
    aidEnterNewReading();
  };
  $('emergencyModal').addEventListener('click', e => {
    const target = e.target.closest('button'); if (!target) return;
    if (target.hasAttribute('data-aid-sequence-step')) {
      aidSequenceShow(target.closest('.aid-sequence-tabs').nextElementSibling, Number(target.dataset.aidSequenceStep), true);
    }
    if (target.hasAttribute('data-aid-sequence-move')) {
      const sequence = target.closest('.aid-sequence-controls').previousElementSibling;
      aidSequenceShow(sequence, Number(sequence.dataset.aidSequenceIndex) + Number(target.dataset.aidSequenceMove), true);
    }
    if (target.hasAttribute('data-aid-critical')) aidChooseState('unconscious');
    if (target.dataset.aidBreathing) { emergencyBreathing = target.dataset.aidBreathing; renderCriticalAid(); aidFocus('aidBreathingResult'); }
    if (target.id === 'aidStartTimer') { emergencyTimerEnd = Date.now() + 15 * 60 * 1000; $('aidTimerAnnouncement').textContent = ''; updateAidTimer(); $('aidTimer').scrollIntoView({ block: 'nearest' }); target.textContent = 'Углеводы приняты · таймер запущен'; target.disabled = true; }
    if (target.hasAttribute('data-aid-redflags')) {
      emergencyRedFlags = true;
      resetEmergencyCorrection(); $('aidCorrectionHost')?.remove(); $('aidInsulinGuide')?.remove();
      target.parentElement.innerHTML = '<strong>Позвоните 112/103 сейчас</strong><p>Сообщите симптомы и показание сахара. Оставайтесь рядом. При потере сознания выберите экстренный алгоритм выше. Не откладывайте помощь ради расчёта дозы.</p><a href="tel:112" class="aid-call">Позвонить 112 ↗</a>';
    }
  });
  setInterval(updateAidTimer, 1000);
}
