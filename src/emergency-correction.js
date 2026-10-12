// Personal-plan arithmetic only. No dose is inferred from a diary or a food ratio.
const EmergencyCorrection = (() => {
  const ranges = {
    correctionTarget: [4, 10],
    correctionFactor: [0.01, 100],
    correctionStep: [0.01, 10],
    correctionMax: [0.01, 100],
  };
  function planIssue(profile) {
    if (!profile || profile.correctionConfirmed !== true)
      return 'Сначала сохраните подтверждённый персональный план коррекции в настройках.';
    if (typeof profile.shortInsulinName !== 'string' || !profile.shortInsulinName.trim())
      return 'Укажите назначенный болюсный инсулин в основных настройках профиля.';
    for (const [key, [min, max]] of Object.entries(ranges))
      if (typeof profile[key] !== 'number' || !Number.isFinite(profile[key]) || profile[key] < min || profile[key] > max)
        return 'Заполните все четыре параметра коррекции значениями из плана врача.';
    if (profile.correctionMax < profile.correctionStep)
      return 'Максимум коррекции не может быть меньше шага дозы.';
    if (Math.abs(profile.correctionStep * 100 - Math.round(profile.correctionStep * 100)) > 0.000001)
      return 'Шаг дозы укажите с точностью до сотой ЕД.';
    return null;
  }
  function evaluate(profile, mmol, answers = {}, eligibility = {}, now = Date.now()) {
    const blocked = (reason) => ({ ok: false, reason });
    if (eligibility.conscious !== true || eligibility.canSwallow !== true ||
        eligibility.noRedFlags === false || eligibility.noKetoneConcern === false)
      return blocked('При нарушении сознания, глотания или тревожных признаках расчёт недоступен. Следуйте алгоритму экстренной помощи.');
    if (typeof mmol !== 'number' || !Number.isFinite(mmol) || mmol <= 10 || mmol > 60)
      return blocked('Нужно новое числовое измерение выше 10 ммоль/л. По надписи HI дозу не рассчитывают.');
    const issue = planIssue(profile);
    if (issue) return blocked(issue);
    if (answers.adultNotPregnant !== true || answers.ownPlanApplies !== true)
      return blocked('Расчёт доступен только взрослому вне беременности, который уже применяет этот инсулин по своему действующему плану.');
    if (answers.noRedFlags !== true || answers.noKetoneConcern !== true)
      return blocked('Сначала подтвердите отсутствие тревожных симптомов и проверку кетонов. При неизвестных или повышенных кетонах численная доза недоступна.');
    if (!['pump', 'advisor'].includes(answers.activeSource) || answers.activeSourceConfirmed !== true)
      return blocked('Нужен текущий активный инсулин с помпы или назначенного болюсного советчика, учитывающего все последние введения.');
    const rawActive = answers.activeInsulin;
    if ((typeof rawActive !== 'string' && typeof rawActive !== 'number') ||
        String(rawActive).trim() === '' || !/^\d+(?:[.,]\d+)?$/.test(String(rawActive).trim()))
      return blocked('Введите известный активный инсулин в ЕД. Пустое поле не означает ноль.');
    const active = Number(String(rawActive).trim().replace(',', '.'));
    if (!Number.isFinite(active) || active < 0 || active > 1000)
      return blocked('Проверьте значение активного инсулина и единицы: нужны ЕД.');
    const lastDose = answers.lastDoseAt;
    if (typeof lastDose !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(lastDose) ||
        !Number.isFinite(Date.parse(lastDose)) || Date.parse(lastDose) > now || answers.recentDosePlan !== true)
      return blocked('Укажите время последнего болюса и подтвердите, что интервал до новой коррекции соответствует вашему плану.');
    const unrounded = Math.max(0, (mmol - profile.correctionTarget) / profile.correctionFactor - active);
    // Check the unrounded value: never hide an above-limit result by flooring it.
    if (!Number.isFinite(unrounded) || unrounded > profile.correctionMax)
      return blocked('Расчёт превышает максимум из вашего плана. Доза не показана: свяжитесь с диабетологической командой.');
    // Scale to hundredths so e.g. 0.3 / 0.1 does not accidentally lose one step.
    // The small integer tolerance only repairs binary floating-point representation.
    const cents = Math.floor(unrounded * 100 + Number.EPSILON * Math.max(1, unrounded * 100) * 4);
    const stepCents = Math.round(profile.correctionStep * 100);
    const dose = Math.floor(cents / stepCents) * stepCents / 100;
    return { ok: true, dose, unrounded, activeInsulin: active, step: profile.correctionStep };
  }
  return { planIssue, evaluate };
})();
if (typeof module !== 'undefined') module.exports = EmergencyCorrection;

let emergencyCorrectionState = null,
  emergencyCorrectionExpiry = null,
  emergencyCorrectionAbort = null;

function resetEmergencyCorrection() {
  emergencyCorrectionState = null;
  clearTimeout(emergencyCorrectionExpiry);
  emergencyCorrectionExpiry = null;
  emergencyCorrectionAbort?.abort();
  emergencyCorrectionAbort = null;
  const container = typeof document === 'undefined' ? null : document.getElementById('emergencyCorrection');
  if (container) container.replaceChildren();
}

function renderEmergencyCorrection(mmol, eligibility = {}) {
  resetEmergencyCorrection();
  const profile = session ? data.profile : null;
  emergencyCorrectionState = { mmol, eligibility: { ...eligibility }, profile, createdAt: Date.now() };
  if (eligibility.conscious !== true || eligibility.canSwallow !== true ||
      eligibility.noRedFlags === false || eligibility.noKetoneConcern === false ||
      !Number.isFinite(mmol) || mmol <= 10 || mmol > 60) return '';
  const issue = EmergencyCorrection.planIssue(profile);
  const start = '<section id="emergencyCorrection" class="emergency-correction"><p class="eyebrow">Только по личному плану врача</p><h3>Проверить расчёт коррекции</h3>';
  if (issue) return start + `<p>${esc(issue)}</p><p class="hint">Не используйте чужой инсулин или чужие коэффициенты. Без персонального плана приложение не показывает дозу.</p>${session ? '<button type="button" id="emergencyCorrectionSettings" class="secondary">Настроить мой план</button>' : '<p class="hint">Персональный план хранится в закрытом профиле.</p>'}</section>`;
  return start + `<p>Для <strong>${esc(profile.shortInsulinName)}</strong>. Значение глюкозы: <strong>${fmt(mmol)} ммоль/л</strong>.</p>
    <p class="hint">Это арифметическая проверка вашего плана. Если вы впервые помогаете другому человеку, дозу определяет он по своему плану или медицинский специалист.</p>
    <div class="correction-checks">
      <label class="check-label"><input type="checkbox" id="correctionAdult" />Мне 18 лет или больше, беременности нет.</label>
      <label class="check-label"><input type="checkbox" id="correctionOwnPlan" />Это мой инсулин и мой план; я уже умею им пользоваться. Параметры подходят для текущего времени и ситуации.</label>
      <label class="check-label"><input type="checkbox" id="correctionNoRedFlags" />Нет рвоты, боли в животе, глубокого или частого дыхания, выраженной сонливости или спутанности.</label>
      <label class="check-label"><input type="checkbox" id="correctionNoKetones" />Кетоны проверены сейчас: в крови менее 0,6 ммоль/л или тест мочи отрицательный. При неизвестном результате расчёт не использую.</label>
    </div>
    <label for="correctionActiveSource">Откуда известно количество активного инсулина?</label>
    <select id="correctionActiveSource"><option value="">Выберите источник</option><option value="pump">Из текущих данных моей помпы</option><option value="advisor">Из назначенного болюсного советчика</option></select>
    <label for="correctionActiveInsulin">Активный болюсный инсулин сейчас, ЕД</label>
    <input id="correctionActiveInsulin" type="text" inputmode="decimal" autocomplete="off" aria-describedby="correctionActiveHint" />
    <p id="correctionActiveHint" class="hint">Это оставшийся действующий инсулин, а не последняя введённая доза. Неизвестное значение нельзя заменить нулём. Дневник его не рассчитывает.</p>
    <label class="check-label"><input type="checkbox" id="correctionSourceConfirmed" />Источник учитывает все последние введения, в том числе отдельной ручкой. Значение проверено сейчас.</label>
    <label for="correctionLastDose">Когда был последний болюс?</label>
    <input id="correctionLastDose" type="datetime-local" max="${localDateTime()}" />
    <label class="check-label"><input type="checkbox" id="correctionRecentPlan" />По моему плану с последнего болюса прошло достаточно времени; дополнительная коррекция сейчас разрешена.</label>
    <button type="button" id="emergencyCorrectionCalculate">Рассчитать по моему плану</button>
    <div id="emergencyCorrectionResult" class="correction-result hidden" role="status" aria-live="polite"></div>
    <details class="correction-formula"><summary>Какие параметры используются</summary><p>Цель: ${fmt(profile.correctionTarget)} ммоль/л · снижение от 1 ЕД: ${fmt(profile.correctionFactor)} ммоль/л · шаг: ${fmt(profile.correctionStep)} ЕД · максимум: ${fmt(profile.correctionMax)} ЕД.</p><p>(Глюкоза − цель) ÷ коэффициент − активный инсулин. Отрицательный результат заменяется нулём, затем доза округляется вниз до шага устройства. При превышении максимума расчёт блокируется.</p><p>Новая доза на еду и базальная доза здесь не рассчитываются. Активный болюсный инсулин должен учитывать все предыдущие пищевые и коррекционные дозы.</p></details>
    </section>`;
}

function bindEmergencyCorrection() {
  const state = emergencyCorrectionState,
    container = $('emergencyCorrection');
  if (!state || !container) return;
  emergencyCorrectionAbort?.abort();
  emergencyCorrectionAbort = new AbortController();
  const options = { signal: emergencyCorrectionAbort.signal };
  $('emergencyCorrectionSettings')?.addEventListener('click', () => {
    resetEmergencyCorrection();
    fillProfile();
    settingsTab('calc');
    openModal('profileModal');
  }, options);
  const result = $('emergencyCorrectionResult');
  if (!result) return;
  const clearResult = () => {
    result.replaceChildren();
    result.classList.add('hidden');
  };
  container.addEventListener('input', clearResult, options);
  container.addEventListener('change', clearResult, options);
  const showMessage = (message) => {
    result.textContent = message;
    result.classList.remove('hidden');
  };
  clearTimeout(emergencyCorrectionExpiry);
  emergencyCorrectionExpiry = setTimeout(() => {
    if (emergencyCorrectionState === state) {
      showMessage('Данные могли измениться. Начните заново со свежего измерения и проверьте активный инсулин.');
    }
  }, Math.max(0, 5 * 60 * 1000 - (Date.now() - state.createdAt)));
  $('emergencyCorrectionCalculate').addEventListener('click', () => {
    if (emergencyCorrectionState !== state) return;
    if (Date.now() - state.createdAt >= 5 * 60 * 1000 || data.profile !== state.profile) {
      showMessage('Данные изменились или устарели. Начните заново со свежего измерения.');
      return;
    }
    const answer = EmergencyCorrection.evaluate(state.profile, state.mmol, {
      adultNotPregnant: $('correctionAdult').checked,
      ownPlanApplies: $('correctionOwnPlan').checked,
      noRedFlags: $('correctionNoRedFlags').checked,
      noKetoneConcern: $('correctionNoKetones').checked,
      activeSource: $('correctionActiveSource').value,
      activeInsulin: $('correctionActiveInsulin').value,
      activeSourceConfirmed: $('correctionSourceConfirmed').checked,
      lastDoseAt: $('correctionLastDose').value,
      recentDosePlan: $('correctionRecentPlan').checked,
    }, state.eligibility);
    if (!answer.ok) return showMessage(answer.reason);
    result.innerHTML = `<p class="eyebrow">Результат расчёта по вашему плану</p><strong class="result-value">${fmt(answer.dose)} ЕД</strong><p>${answer.dose === 0 ? 'Дополнительная коррекция по этим данным не требуется. Если самочувствие ухудшается или глюкоза остаётся высокой, свяжитесь с медицинской командой.' : `Для ${esc(state.profile.shortInsulinName)}. Округлено вниз до шага ${fmt(answer.step)} ЕД; учтено ${fmt(answer.activeInsulin)} ЕД активного инсулина. Перед введением сверьте результат с назначенным планом.`}</p><p class="hint">Не повторяйте коррекцию раньше срока из своего плана. Запись о введении автоматически не создаётся.</p>`;
    result.classList.remove('hidden');
  }, options);
}
