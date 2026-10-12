(() => {
  'use strict';
  /* MODULE:media-references */
  /* MODULE:crypto */
  /* MODULE:storage */
  const { bytesTo64, from64, derive, encrypt } = VaultCrypto;
  const { readStore, readVaults, writeStore, removeStore } = VaultStorage;
  async function decrypt(record, password) {
    validateRecord(record);
    const result = await VaultCrypto.decrypt(record, password);
    return { ...result, content: validateData(result.content) };
  }
  const STORE = 'diab_vaults_v2',
    LEGACY = 'diab_users',
    ITERATIONS = 600000;
  const $ = (id) => document.getElementById(id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const uid = () => crypto.randomUUID();
  const pad = (n) => String(n).padStart(2, '0');
  const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const localTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const localDateTime = () => `${localDate()}T${localTime()}`;
  const fmt = (n) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n);
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const defaults = () => ({
    diabType: '1',
    pump: 'none',
    pumpModel: '',
    shortInsulinName: '',
    longInsulinName: '',
    phones: [],
    address: '',
    doctor: '',
    notes: '',
    targetLow: 4,
    targetHigh: 7,
    carbsPerXE: null,
    insulinPerXE: null,
    doseConfirmed: false,
    correctionTarget: null,
    correctionFactor: null,
    correctionStep: null,
    correctionMax: null,
    correctionConfirmed: false,
    unit: 'mmol',
    measureInstruction: '',
    highSugarInstruction: '',
    lowSugarInstruction: '',
    lowSugarUnconsciousInstruction: '',
    highSugarUnconsciousInstruction: '',
    pumpOffInstruction: '',
  });
  const preferences = () => ({
    lockMinutes: 15,
    onboardingDone: false,
    lastExportAt: null,
    changesSinceExport: 0,
    theme: 'light',
    largeText: false,
    highContrast: false,
    motion: true,
    home: { measurement: true, summary: true, events: true, wellbeing: true, dishes: true, week: true, visit: true },
  });
  const emptyData = () => ({
    version: 2,
    profile: defaults(),
    sugar: [],
    food: [],
    insulin: [],
    wellbeing: [],
    favorites: [],
    reportNotes: { questions: '', topics: '' },
    preferences: preferences(),
  });
  let data = emptyData(),
    session = null,
    busy = false,
    activeModal = null,
    previousFocus = null,
    pendingDelete = null;
  const editing = { sugar: null, food: null, insulin: null, wellbeing: null };
  let currentPage = 'today',
    foodTab = 'recent',
    diaryLimit = 50,
    templateEdit = null,
    lastDeletion = null,
    restoreReady = null,
    calcSnapshot = null,
    reportSnapshot = null,
    setupStep = 0,
    lastActivity = Date.now();
  const tagNames = {
    before: 'До еды',
    after: 'После еды',
    activity: 'Активность',
    wellbeing: 'Самочувствие',
    other: 'Другое',
  };
  const typeNames = {
    sugar: 'Глюкоза',
    food: 'Питание',
    insulin: 'Инсулин',
    wellbeing: 'Самочувствие и активность',
  };
  const wellbeingContexts = {
    sleep: 'Сон',
    stress: 'Стресс',
    walk: 'Прогулка',
    exercise: 'Тренировка',
    energy: 'Самочувствие',
    observation: 'Моё наблюдение',
  };
  const homeSections = ['measurement', 'summary', 'events', 'wellbeing', 'dishes', 'week', 'visit'];
  let toastTimer;
  function notice(message, error = false) {
    clearTimeout(toastTimer);
    $('statusText').textContent = message;
    $('editToastBtn').classList.add('hidden');
    $('undoToastBtn').classList.toggle('hidden', !lastDeletion || error);
    $('statusMessage').className = `status-message ${error ? 'error' : 'success'}`;
    $('statusMessage').setAttribute('role', error ? 'alert' : 'status');
    if (!error && !lastDeletion)
      toastTimer = setTimeout(() => $('statusMessage').classList.add('hidden'), 6000);
  }
  async function run(action, formId) {
    if (busy) return;
    if (session && expired()) {
      lock(true);
      return;
    }
    busy = true;
    document.body.setAttribute('aria-busy', 'true');
    const buttons = [...document.querySelectorAll('button')].filter(
      (b) =>
        !b.disabled &&
        !b.closest('#emergencyModal') &&
        !['emergencyBtn', 'publicEmergencyBtn', 'authQuickEmergency'].includes(b.id),
    );
    buttons.forEach((b) => (b.disabled = true));
    try {
      await action();
    } catch (e) {
      if (formId) formError(formId, e.message);
      notice(e.message || 'Не удалось выполнить действие.', true);
    } finally {
      busy = false;
      buttons.forEach((b) => (b.disabled = false));
      document.body.removeAttribute('aria-busy');
      if (session && expired()) lock(true);
    }
  }
  function revealField(input) {
    for (let p = input.parentElement; p; p = p.parentElement) {
      if (p.tagName === 'DETAILS') p.open = true;
    }
    const section = input.closest('.settings-section');
    if (section) settingsTab(section.id.replace('settings', '').toLowerCase());
  }
  function formError(id, message) {
    let box = $(id).querySelector('.form-error');
    if (!box) {
      box = document.createElement('p');
      box.className = 'form-error';
      box.setAttribute('role', 'alert');
      $(id).prepend(box);
    }
    box.textContent = message;
  }
  function clearErrors(form) {
    form.querySelectorAll('.field-error,.form-error').forEach((e) => e.remove());
    form.querySelectorAll('[aria-invalid]').forEach((e) => {
      e.removeAttribute('aria-invalid');
      e.removeAttribute('aria-describedby');
    });
  }
  function fieldError(input, message) {
    revealField(input);
    input.setAttribute('aria-invalid', 'true');
    let error = document.getElementById(input.id + 'Error');
    if (!error) {
      error = document.createElement('p');
      error.id = input.id + 'Error';
      error.className = 'field-error';
      input.after(error);
    }
    error.textContent = message;
    input.setAttribute('aria-describedby', error.id);
    input.focus();
  }
  function checkForm(id) {
    const form = $(id);
    clearErrors(form);
    for (const input of form.querySelectorAll('input,select,textarea')) {
      if (input.disabled) continue;
      if (!input.checkValidity()) {
        fieldError(
          input,
          input.validity.valueMissing
            ? 'Заполните это поле.'
            : input.validity.rangeUnderflow || input.validity.rangeOverflow
              ? 'Значение вне допустимого диапазона.'
              : input.validity.tooShort
                ? 'Пароль должен содержать не менее 10 символов.'
                : 'Проверьте значение.',
        );
        return false;
      }
    }
    return true;
  }
  function bindForm(id, action) {
    $(id).addEventListener('submit', (e) => {
      e.preventDefault();
      if (!busy && checkForm(id)) run(action, id);
    });
  }
  /* MODULE:validation */
  /* MODULE:profile-store */
  const unit = () => (data.profile.unit === 'mgdl' ? 'мг/дл' : 'ммоль/л');
  const converted = (n) => (data.profile.unit === 'mgdl' ? n * 18 : n);
  const sugarText = (n) => converted(n).toFixed(data.profile.unit === 'mgdl' ? 0 : 1);
  const dateLabel = (value) =>
    value
      ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)} ${value.slice(11, 16)}`
      : 'Без даты · старая запись';
  const shortDate = (value) => (value ? value.split('-').reverse().join('.') : '—');
  function allEntries() {
    return entryTypes
      .flatMap((type) =>
        data[type]
          .slice()
          .reverse()
          .map((item) => ({ type, item, datetime: stamp(item, type) })),
      )
      .sort(
        (a, b) =>
          String(b.datetime || '').localeCompare(String(a.datetime || '')) ||
          String(b.item.createdAt || '').localeCompare(String(a.item.createdAt || '')),
      );
  }
  function inRange(datetime, from, to) {
    return (
      !!datetime &&
      datetime.slice(0, 10) >= from &&
      datetime.slice(0, 10) <= to &&
      new Date(datetime) <= new Date()
    );
  }
  function rangeDays(days) {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    return [localDate(start), localDate()];
  }
  function validRange(from, to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to)
      throw new Error('Начало периода должно быть не позже конца.');
    validTime(from + 'T00:00', 'Начало периода', true);
    validTime(to + 'T00:00', 'Конец периода', true);
    return [from, to];
  }
  function statsItems() {
    try {
      const [from, to] = validRange($('statsFrom').value, $('statsTo').value);
      return data.sugar
        .filter((i) => inRange(stamp(i, 'sugar'), from, to))
        .sort((a, b) => stamp(a, 'sugar').localeCompare(stamp(b, 'sugar')));
    } catch {
      return [];
    }
  }
  function expired() {
    return (
      session &&
      data.preferences.lockMinutes > 0 &&
      Date.now() - lastActivity >= data.preferences.lockMinutes * 60000
    );
  }
  function activity() {
    if (session && expired()) {
      if (!busy) lock(true);
      return;
    }
    lastActivity = Date.now();
  }
  function setNow(type) {
    if (type === 'sugar') {
      $('sugarDateInput').max = localDate();
      $('sugarDateInput').value = localDate();
      $('sugarTimeInput').value = localTime();
    } else $(type + 'Time').value = localDateTime();
    updateTimeHint(type);
  }
  function updateTimeHint(type) {
    $(type + 'TimeHint').textContent = dateLabel(
      type === 'sugar' ? `${$('sugarDateInput').value}T${$('sugarTimeInput').value}` : $(type + 'Time').value,
    );
  }
  function clearCalculation() {
    $('calcXEResult').innerHTML = '';
    $('calcXEResult').classList.add('hidden');
    $('calcToFoodBtn').classList.add('hidden');
    calcSnapshot = null;
  }
  function resetEntry(type) {
    pendingPhotos[type] = [];
    renderPhotoEditor(type);
    if (type === 'food') pendingRecipeId = null;
    editing[type] = null;
    $(type + 'Draft').classList.add('hidden');
    $(type + 'DraftStatus').textContent = '';
    $(type + 'DraftStatus').classList.remove('draft-error');
    $(type + 'Form').reset();
    clearErrors($(type + 'Form'));
    $(type + 'Details').open = false;
    $(type + 'Details').classList.remove('hidden');
    setNow(type);
    if (type === 'food') {
      $('ingredientRows').innerHTML = '';
      $('portionChoices').innerHTML = '';
      $('foodSource').disabled = false;
      $('foodSource').value = 'manual';
      $('foodCarbsPer100').readOnly = false;
      toggleRecipe(false);
      templateEdit = null;
      $('saveFavoriteBtn').textContent = '☆ Сохранить в избранное';
      $('addFoodBtn').classList.remove('hidden');
      $('foodLiveResult').textContent = 'Введите вес и углеводы.';
    }
    if (type === 'insulin') $('legacyInsulinHint').classList.add('hidden');
  }
  function clearForms() {
    entryTypes.forEach(resetEntry);
    ['calcForm', 'profileForm', 'passwordForm', 'restoreForm'].forEach((id) => {
      $(id).reset();
      clearErrors($(id));
    });
    clearCalculation();
    lastDeletion = null;
    restoreReady = null;
    reportSnapshot = null;
    $('restorePreview').innerHTML = '';
    $('restorePreview').classList.add('hidden');
    $('restoreSubmitBtn').classList.add('hidden');
    $('foodSearch').value = '';
    $('diarySearch').value = '';
    $('reportQuestions').value = '';
    $('reportTopics').value = '';
    $('appearanceForm').reset();
    reportExcludedNotes.clear();
    lastSavedEntry = null;
    foodTab = 'recent';
    diaryLimit = 50;
    currentPage = 'today';
    $('diaryPeriod').value = 'today';
    $('diaryType').value = 'all';
    $('diaryDate').value = localDate();
    [$('statsFrom').value, $('statsTo').value] = rangeDays(7);
    setPreviousPeriod();
    resetExplore();
  }
  /* MODULE:navigation */
  function enter(newSession, content) {
    closeModal(false);
    session = newSession;
    data = validateData(content);
    applyAppearance();
    lastActivity = Date.now();
    clearForms();
    $('authContainer').classList.add('hidden');
    $('appMain').classList.remove('hidden');
    $('loginForm').reset();
    $('registerForm').reset();
    $('statusMessage').classList.add('hidden');
    navigate(routePage(), { historyMode: 'replace' });
    if (!data.preferences.onboardingDone) startSetup();
  }
  function lock(automatic = false) {
    flushDrafts();
    const wasEmergency = activeModal?.id === 'emergencyModal';
    closeModal(false);
    session = null;
    data = emptyData();
    clearForms();
    applyAppearance();
    for (const id of [
      'todayTimeline',
      'diaryTimeline',
      'foodLibrary',
      'sugarChart',
      'expandedChart',
      'periodStats',
      'reportPreview',
      'restorePreview',
      'emergencyPhones',
      'emergencyNotes',
      'emergencyAddress',
      'emergencyDoctor',
      'emergencyIdentity',
      'measureInstruction',
      'emergencyRecentInsulin',
      'emergencyResult',
      'emergencyUnconsciousResult',
      'aidThresholdNote',
      'calcSettings',
      'userNameDisplay',
      'diabTypeBadge',
      'lastSugarValue',
      'lastSugarTime',
      'todayCounts',
      'backupInfo',
      'backupNudgeText',
      'chartSelection',
      'expandedSelection',
      'saveStatus',
      'confirmText',
      'lastSugarContext',
      'draftNudge',
      'diaryResultCount',
      'insulinSuggestions',
      'periodComparison',
      'reportNoteChoices',
      'reportNotesStatus',
      'sugarRecentTags',
      'foodRecentTags',
      'insulinRecentTags',
      'chartRecordList',
      'expandedRecordList',
      'homeWellbeingPreview',
      'homeDishList',
      'homeWeekDays',
      'homeWeekSummary',
      'homeWeekPeriod',
      'homeVisitPreview',
      'homeBackupStatus',
      'homeGlucoseRange',
    ])
      $(id).textContent = '';
    $('onboardingForm').reset();
    delete $('lastSugarTime').dataset.datetime;
    delete $('homeGlucoseRange').dataset.state;
    $('emergencySugarValue').value = '';
    $('appMain').classList.add('hidden');
    $('authContainer').classList.remove('hidden');
    $('registerForm').classList.add('hidden');
    $('loginForm').classList.remove('hidden');
    $('statusMessage').classList.add('hidden');
    $('loginPassword').value = '';
    $('authHeading').textContent = 'Ваш дневник';
    $('authLead').textContent = 'Введите имя профиля и пароль.';
    $('loginPassword').focus();
    if (automatic) notice('Дневник закрыт после бездействия. Введите пароль для продолжения.');
    resetEmergencyState(wasEmergency);
    if (wasEmergency) emergencyOpen();
  }
  function openModal(id) {
    if (activeModal) closeModal(false);
    $('statusMessage').classList.add('hidden');
    previousFocus = document.activeElement;
    document.querySelectorAll('.pages > .page').forEach(stopEntrance);
    activeModal = $(id);
    activeModal.classList.remove('hidden');
    activeModal.appendChild($('statusMessage'));
    document.querySelector('main').inert = true;
    document.body.style.overflow = 'hidden';
    activeModal.querySelector('.modal-content').scrollTop = 0;
    activeModal.querySelector('button:not(:disabled),input:not(:disabled),a')?.focus({ preventScroll: true });
    if (id !== 'emergencyModal') animateEntrance(activeModal.querySelector('.modal-content'), true);
  }
  function closeModal(restoreFocus = true) {
    if (!activeModal) return;
    emergencyGuideStopSpeech();
    flushDrafts();
    const closedId = activeModal.id;
    if (closedId === 'startGuideModal') resetStartGuide();
    if (closedId === 'learningModal') resetLearningMode();
    if (closedId === 'emergencyModal') resetEmergencyCorrection();
    if (activeModal.id === 'profileModal' && session) applyAppearance();
    document.body.appendChild($('statusMessage'));
    stopEntrance(activeModal.querySelector('.modal-content'));
    activeModal.classList.add('hidden');
    activeModal = null;
    document.querySelector('main').inert = false;
    document.body.style.overflow = '';
    pendingDelete = null;
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus();
    finishPhotoModal(closedId, restoreFocus);
  }
  function openEntry(type, item = null, allowDraft = true) {
    resetEntry(type);
    if (type === 'food' && item) {
      pendingRecipeId = item.recipeId || (data.favorites.some((f) => f.id === item.id) ? item.id : null);
      pendingPhotos.food = [...(item.photoIds || [])];
      renderPhotoEditor('food');
    }
    $(type + 'ModalTitle').textContent = {
      sugar: 'Измерение глюкозы',
      food: 'Приём пищи',
      insulin: 'Введение инсулина',
      wellbeing: 'Самочувствие и активность',
    }[type];
    if (type === 'insulin') $('insulinName').value = data.profile.shortInsulinName;
    openModal(type + 'Modal');
    $(
      type === 'sugar'
        ? 'sugarValueInput'
        : type === 'food'
          ? 'foodName'
          : type === 'wellbeing'
            ? 'wellbeingTitle'
            : 'insulinDose',
    ).focus();
    if (item) {
      $('foodName').value = item.name;
      $('foodWeight').value = item.weight;
      $('foodCarbsPer100').value = item.carbsPer100;
      $('foodType').value = item.type;
      fillFoodExtras(item);
      liveFood();
      $('foodWeight').focus();
      $('foodWeight').select();
    }
    renderSuggestions(type);
    if (allowDraft && !item) offerDraft(type);
  }
  function editEntry(type, id) {
    const item = data[type].find((i) => i.id === id);
    if (!item) return;
    openEntry(type, null, false);
    pendingPhotos[type] = [...(item.photoIds || [])];
    renderPhotoEditor(type);
    if (type === 'food') pendingRecipeId = item.recipeId || null;
    editing[type] = id;
    $(type + 'ModalTitle').textContent = 'Изменить запись';
    if (type === 'sugar') {
      $('sugarValueInput').value = converted(item.value);
      $('sugarDateInput').value = item.date;
      $('sugarTimeInput').value = item.time;
    }
    if (type === 'food') {
      $('foodName').value = item.name;
      $('foodWeight').value = item.weight;
      $('foodCarbsPer100').value = item.carbsPer100;
      $('foodTime').value = item.datetime || '';
      $('foodType').value = item.type;
      fillFoodExtras(item);
      liveFood();
    }
    if (type === 'insulin') {
      $('insulinDose').value = item.unit === 'legacy-xe' ? '' : item.dose;
      $('insulinTime').value = item.datetime || '';
      $('insulinName').value = item.name;
      $('insulinKind').value = item.kind;
      $('legacyInsulinHint').classList.toggle('hidden', item.unit !== 'legacy-xe');
    }
    if (type === 'wellbeing') {
      $('wellbeingTitle').value = item.title;
      $('wellbeingKind').value = item.kind;
      $('wellbeingTime').value = item.datetime;
      $('wellbeingContext').value = item.context || '';
    }
    $(type + 'Note').value = item.note;
    if (type !== 'wellbeing') $(type + 'Tag').value = item.tag;
    $(type + 'Details').open = true;
    updateTimeHint(type);
  }
  function contextFields(type) {
    return { note: $(type + 'Note').value.trim(), tag: $(type + 'Tag').value };
  }
  async function saveEntry(type, item) {
    item = { ...item, photoIds: [...pendingPhotos[type]] };
    if (type === 'food') item.recipeId = pendingRecipeId;
    const next = clone(data),
      id = editing[type] || uid();
    if (editing[type]) {
      const index = next[type].findIndex((i) => i.id === id);
      if (index < 0) throw new Error('Запись больше не существует.');
      next[type][index] = { ...item, id, createdAt: next[type][index].createdAt || new Date().toISOString() };
    } else next[type].push({ ...item, id, createdAt: new Date().toISOString() });
    await persist(next);
    await queueDraft(type, true);
    closeModal();
    resetEntry(type);
    render();
    const description =
      type === 'food'
        ? `Записан приём пищи: ${item.name}, ${fmt(item.weight)} г`
        : type === 'sugar'
          ? `Сохранено измерение: ${sugarText(item.value)} ${unit()}`
          : type === 'insulin'
            ? `Записан инсулин: ${fmt(item.dose)} ЕД${item.name ? ' · ' + item.name : ''}`
            : `Сохранена заметка: ${item.title}`;
    notice(description);
    lastSavedEntry = { type, id };
    highlightSavedEntry(id);
    $('editToastBtn').classList.remove('hidden');
  }
  /* MODULE:interface */
  /* MODULE:diary */
  /* MODULE:charts */
  function render() {
    if (!session) return;
    $('userNameDisplay').textContent = session.name;
    $('diabTypeBadge').textContent = `Тип ${data.profile.diabType}`;
    $('sugarInputUnit').textContent = unit();
    $('sugarValueUnit').textContent = unit();
    $('sugarValueInput').min = data.profile.unit === 'mgdl' ? '1.8' : '0.1';
    $('sugarValueInput').max = data.profile.unit === 'mgdl' ? '1080' : '60';
    for (const [id, v] of [
      ['sugarUnitMmol', 'mmol'],
      ['sugarUnitMgdl', 'mgdl'],
    ]) {
      $(id).classList.toggle('active', data.profile.unit === v);
      $(id).setAttribute('aria-pressed', String(data.profile.unit === v));
    }
    const p = data.profile;
    $('calcSettings').textContent = p.carbsPerXE
      ? `1 ХЕ = ${fmt(p.carbsPerXE)} г. ${p.doseConfirmed ? `Коэффициент ${fmt(p.insulinPerXE)} ЕД/ХЕ.` : 'Расчёт инсулина выключен.'}`
      : 'ХЕ можно настроить в разделе «Расчёты».';
    renderToday();
    renderDiary();
    renderLibrary();
    if (currentPage === 'stats') renderStats();
    renderBackupInfo();
    renderExplore();
  }
  function liveFood() {
    if ($('recipeMode').checked) recalculateRecipe();
    const w = Number($('foodWeight').value),
      c = Number($('foodCarbsPer100').value);
    if (
      !$('foodWeight').value ||
      !$('foodCarbsPer100').value ||
      !Number.isFinite(w) ||
      !Number.isFinite(c) ||
      w <= 0 ||
      w > 100000 ||
      c < 0 ||
      c > 100
    ) {
      $('foodLiveResult').textContent = 'Введите корректный вес и углеводы.';
      return;
    }
    const total = (w * c) / 100;
    $('foodLiveResult').innerHTML =
      `<strong>${fmt(total)} г углеводов</strong>${data.profile.carbsPerXE ? ` · ${fmt(total / data.profile.carbsPerXE)} ХЕ` : ''}`;
  }
  function favoriteFromForm() {
    if ($('recipeMode').checked) recalculateRecipe(true);
    return {
      photoIds: [...pendingPhotos.food],
      recipeId: pendingRecipeId,
      name: $('foodName').value.trim(),
      weight: number($('foodWeight').value, 'Вес', 0.1, 100000),
      carbsPer100: number($('foodCarbsPer100').value, 'Углеводы', 0, 100),
      type: $('foodType').value,
      source: $('foodSource').value,
      portions: readPortions(),
      ingredients: $('recipeMode').checked ? ingredientValues() : [],
      recipeYield: $('recipeMode').checked
        ? number($('recipeYield').value, 'Вес готового блюда', 0.1, 100000)
        : null,
    };
  }
  async function saveFavorite(item, id = null) {
    if (!item.name) throw new Error('Укажите название блюда.');
    const next = clone(data),
      existing = id
        ? next.favorites.findIndex((i) => i.id === id)
        : next.favorites.findIndex(
            (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.carbsPer100 === item.carbsPer100,
          );
    const entry = {
      photoIds: [...(item.photoIds || [])],
      name: item.name,
      weight: item.weight,
      carbsPer100: item.carbsPer100,
      type: item.type,
      source: item.source || 'unknown',
      portions: item.portions || [],
      ingredients: item.ingredients || [],
      recipeYield: item.recipeYield ?? null,
      id: existing >= 0 ? next.favorites[existing].id : uid(),
    };
    if (existing >= 0) next.favorites[existing] = entry;
    else next.favorites.push(entry);
    await persist(next);
    render();
    notice('Блюдо сохранено в избранном.');
  }
  function editFavorite(id = null) {
    const item = data.favorites.find((i) => i.id === id);
    openEntry('food', item);
    templateEdit = id || 'new';
    $('foodModalTitle').textContent = item ? 'Изменить шаблон' : 'Новое избранное блюдо';
    $('foodDetails').classList.add('hidden');
    $('addFoodBtn').classList.add('hidden');
    $('saveFavoriteBtn').textContent = 'Сохранить шаблон';
  }
  function settingsTab(tab) {
    document
      .querySelectorAll('[data-settings]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.settings === tab)));
    document
      .querySelectorAll('.settings-section')
      .forEach((s) =>
        s.classList.toggle('hidden', s.id !== 'settings' + tab[0].toUpperCase() + tab.slice(1)),
      );
    $('profileSaveArea').classList.toggle('hidden', ['data', 'appearance', 'help'].includes(tab));
  }
  function fillProfile() {
    fillAppearance();
    for (const key of [
      'diabType',
      'pump',
      'pumpModel',
      'shortInsulinName',
      'longInsulinName',
      'address',
      'doctor',
      'notes',
      'carbsPerXE',
      'insulinPerXE',
      'correctionTarget',
      'correctionFactor',
      'correctionStep',
      'correctionMax',
      'unit',
      'measureInstruction',
      'highSugarInstruction',
      'lowSugarInstruction',
      'lowSugarUnconsciousInstruction',
      'highSugarUnconsciousInstruction',
      'pumpOffInstruction',
    ])
      $('profile' + key[0].toUpperCase() + key.slice(1)).value = data.profile[key] ?? '';
    $('targetLowInput').value = data.profile.targetLow;
    $('targetHighInput').value = data.profile.targetHigh;
    $('profileDoseConfirmed').checked = data.profile.doseConfirmed;
    $('profileCorrectionConfirmed').checked = data.profile.correctionConfirmed;
    $('profilePhones').value = data.profile.phones.join('\n');
    $('lockMinutes').value = String(data.preferences.lockMinutes);
    clearErrors($('profileForm'));
    $('passwordForm').reset();
    renderBackupInfo();
    renderImportHistory();
  }
  function renderBackupInfo() {
    const p = data.preferences;
    $('backupInfo').textContent =
      `${p.lastExportAt ? 'Последняя выгрузка: ' + new Date(p.lastExportAt).toLocaleString('ru-RU') : 'Копия ещё не выгружалась'}. Изменений после выгрузки: ${p.changesSinceExport}. Скачивание завершает браузер.`;
  }
  async function changeUnit(value) {
    if (data.profile.unit === value) return;
    const pending = $('sugarValueInput').value,
      next = clone(data);
    next.profile.unit = value;
    await persist(next);
    if (pending !== '' && Number.isFinite(Number(pending)))
      $('sugarValueInput').value = String(
        Number((Number(pending) * (value === 'mgdl' ? 18 : 1 / 18)).toFixed(6)),
      );
    render();
    clearCalculation();
  }
  /* MODULE:backup */
  async function undoDelete() {
    if (!lastDeletion || lastDeletion.name !== session?.name) return;
    const { type, item, index } = lastDeletion,
      next = clone(data);
    if (next[type].some((i) => i.id === item.id)) throw new Error('Запись уже существует.');
    next[type].splice(Math.min(index, next[type].length), 0, item);
    await persist(next);
    lastDeletion = null;
    render();
    notice('Запись восстановлена.');
  }
  function startSetup() {
    setupStep = 0;
    $('setupUnit').value = data.profile.unit;
    $('setupCarbs').value = data.profile.carbsPerXE ?? '';
    $('setupPhone').value = data.profile.phones[0] || '';
    showSetup();
    openModal('onboardingModal');
  }
  function showSetup() {
    document
      .querySelectorAll('[data-step]')
      .forEach((s) => s.classList.toggle('hidden', Number(s.dataset.step) !== setupStep));
    $('onboardingProgress').textContent = `Шаг ${setupStep + 1} из 3`;
    $('setupBack').classList.toggle('hidden', setupStep === 0);
    $('setupNext').textContent = setupStep === 2 ? 'Готово' : 'Далее';
  }
  /* MODULE:emergency-guides */
  /* MODULE:emergency-correction */
  /* MODULE:emergency */
  /* MODULE:learning */
  /* MODULE:start-guide */
  /* MODULE:entry-launcher */
  /* MODULE:reports */
  // Optional content is normalized when older version-2 profiles are opened.
  const entryTypes = ['sugar', 'food', 'insulin', 'wellbeing'];
  const sourceNames = {
    manual: 'Введено вручную',
    label: 'С упаковки',
    recipe: 'По ингредиентам',
    unknown: 'Источник не указан',
  };
  let draftQueue = Promise.resolve(),
    lastSavedEntry = null,
    reportExcludedNotes = new Set();
  const pendingDrafts = new Map();
  let draftTimer = null,
    draftWrites = 0;
  /* MODULE:appearance */
  /* MODULE:home */
  /* MODULE:drafts */
  /* MODULE:recipes */
  /* MODULE:explore */
  /* MODULE:events */
})();
