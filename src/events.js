bindForm('loginForm', async () => {
  const name = username($('loginUsername').value),
    password = $('loginPassword').value,
    db = readVaults();
  if (own(db.accounts, name)) {
    const record = db.accounts[name],
      result = await decrypt(record, password);
    enter({ name, key: result.key, salt: record.salt, revision: record.revision, record }, result.content);
    try {
      cleanupLegacy(name);
    } catch (e) {
      notice(e.message, true);
    }
    return;
  }
  const old = readStore(LEGACY, {});
  if (!own(old, name) || typeof old[name]?.password !== 'string' || old[name].password !== password)
    throw new Error('Неверное имя профиля или пароль.');
  const migrated = migrate(old[name].data || {}),
    newSession = await createAccount(name, password, migrated);
  enter(newSession, migrated);
  try {
    cleanupLegacy(name);
    notice('Профиль перенесён. Проверьте коэффициенты и единицы старых записей.');
  } catch (e) {
    notice(e.message, true);
  }
});
bindForm('registerForm', async () => {
  const name = username($('regUsername').value),
    password = $('regPassword').value;
  if (password.length < 10) throw new Error('Пароль должен содержать не менее 10 символов.');
  if (password !== $('regPasswordConfirm').value) {
    fieldError($('regPasswordConfirm'), 'Пароли не совпадают.');
    return;
  }
  if (own(readVaults().accounts, name) || own(readStore(LEGACY, {}), name))
    throw new Error('Такое имя профиля уже существует.');
  const content = emptyData();
  content.profile.diabType = $('regDiabType').value;
  enter(await createAccount(name, password, content), content);
});
bindForm('sugarForm', async () => {
  const val = number(
      $('sugarValueInput').value,
      'Глюкоза',
      data.profile.unit === 'mgdl' ? 1.8 : 0.1,
      data.profile.unit === 'mgdl' ? 1080 : 60,
    ),
    datetime = validTime(`${$('sugarDateInput').value}T${$('sugarTimeInput').value}`);
  await saveEntry('sugar', {
    value: data.profile.unit === 'mgdl' ? val / 18 : val,
    date: datetime.slice(0, 10),
    time: datetime.slice(11),
    ...contextFields('sugar'),
  });
});
bindForm('foodForm', async () => {
  if (templateEdit) return;
  const item = favoriteFromForm(),
    original = data.food.find((i) => i.id === editing.food);
  if (!item.name) {
    fieldError($('foodName'), 'Укажите название.');
    return;
  }
  await saveEntry('food', {
    ...item,
    carbs: (item.weight * item.carbsPer100) / 100,
    datetime: validTime($('foodTime').value),
    carbsPerXEAtEntry: original ? original.carbsPerXEAtEntry : data.profile.carbsPerXE,
    ...contextFields('food'),
  });
});
bindForm('insulinForm', async () => {
  await saveEntry('insulin', {
    dose: number($('insulinDose').value, 'Доза', 0, 10000),
    datetime: validTime($('insulinTime').value),
    unit: 'units',
    name: $('insulinName').value.trim(),
    kind: $('insulinKind').value,
    ...contextFields('insulin'),
  });
});
bindForm('calcForm', () => {
  clearCalculation();
  const weight = number($('calcWeight').value, 'Вес', 0.1, 100000),
    carbsPer100 = number($('calcCarbsPer100').value, 'Углеводы', 0, 100),
    total = (weight * carbsPer100) / 100,
    p = data.profile;
  let result = `<strong class="result-value">${fmt(total)} г углеводов</strong>`;
  if (p.carbsPerXE !== null) {
    const xe = total / p.carbsPerXE;
    result += `<p>${fmt(xe)} ХЕ</p><details><summary>Подробнее о расчёте</summary><p>${fmt(weight)} г × ${fmt(carbsPer100)} / 100 = ${fmt(total)} г углеводов. ${fmt(total)} / ${fmt(p.carbsPerXE)} = ${fmt(xe)} ХЕ.</p>${p.doseConfirmed ? `<p>Арифметический расчёт по пищевому коэффициенту: <strong>${fmt(xe * p.insulinPerXE)} ЕД</strong>. Это не рекомендация ввести дозу. Расчёт не учитывает текущую глюкозу и активный инсулин. Следуйте персональному плану.</p>` : ''}</details>`;
  }
  $('calcXEResult').innerHTML = result;
  $('calcXEResult').classList.remove('hidden');
  $('calcToFoodBtn').classList.remove('hidden');
  calcSnapshot = { weight, carbsPer100 };
});
bindForm('profileForm', async () => {
  const next = clone(data),
    p = next.profile,
    oldUnit = p.unit,
    pending = $('sugarValueInput').value;
  p.diabType = $('profileDiabType').value;
  p.pump = $('profilePump').value;
  p.unit = $('profileUnit').value;
  for (const key of [
    'pumpModel',
    'shortInsulinName',
    'longInsulinName',
    'address',
    'doctor',
    'notes',
    'measureInstruction',
    'highSugarInstruction',
    'lowSugarInstruction',
    'lowSugarUnconsciousInstruction',
    'highSugarUnconsciousInstruction',
    'pumpOffInstruction',
  ])
    p[key] = $('profile' + key[0].toUpperCase() + key.slice(1)).value.trim();
  p.targetLow = number($('targetLowInput').value, 'Нижняя граница', 1, 40);
  p.targetHigh = number($('targetHighInput').value, 'Верхняя граница', 1, 40);
  if (p.targetLow >= p.targetHigh) {
    fieldError($('targetHighInput'), 'Верхняя граница должна быть больше нижней.');
    return;
  }
  p.carbsPerXE = number($('profileCarbsPerXE').value, 'Углеводы в ХЕ', 1, 100, true);
  p.insulinPerXE = number($('profileInsulinPerXE').value, 'Коэффициент', 0, 1000, true);
  p.doseConfirmed = $('profileDoseConfirmed').checked;
  if (p.doseConfirmed && (p.carbsPerXE === null || p.insulinPerXE === null)) {
    fieldError(
      $(p.carbsPerXE === null ? 'profileCarbsPerXE' : 'profileInsulinPerXE'),
      'Для подтверждения заполните оба коэффициента.',
    );
    return;
  }
  for (const [key, label, min, max] of [
    ['correctionTarget', 'Цель коррекции', 4, 10],
    ['correctionFactor', 'Коэффициент коррекции', 0.01, 100],
    ['correctionStep', 'Шаг дозы', 0.01, 10],
    ['correctionMax', 'Максимум коррекции', 0.01, 100],
  ])
    p[key] = number($('profile' + key[0].toUpperCase() + key.slice(1)).value, label, min, max, true);
  p.correctionConfirmed = $('profileCorrectionConfirmed').checked;
  if (p.correctionConfirmed) {
    const issue = EmergencyCorrection.planIssue(p);
    if (issue) {
      fieldError($('profileCorrectionConfirmed'), issue);
      return;
    }
  }
  p.phones = $('profilePhones')
    .value.split('\n')
    .map((t) => t.trim())
    .filter(Boolean);
  if (p.phones.some((t) => !/^\+?[\d\s()\-]{3,40}$/.test(t))) {
    fieldError($('profilePhones'), 'Допустимы цифры, пробелы, +, скобки и дефис.');
    return;
  }
  await persist(next);
  if (oldUnit !== p.unit && pending !== '' && Number.isFinite(Number(pending)))
    $('sugarValueInput').value = String(
      Number((Number(pending) * (p.unit === 'mgdl' ? 18 : 1 / 18)).toFixed(6)),
    );
  clearCalculation();
  closeModal();
  render();
  notice('Настройки сохранены.');
});
bindForm('accessForm', async () => {
  const next = clone(data);
  next.preferences.lockMinutes = Number($('lockMinutes').value);
  await persist(next);
  lastActivity = Date.now();
  render();
  notice('Автоблокировка настроена.');
});
bindForm('passwordForm', async () => {
  const password = $('newPassword').value;
  if (password.length < 10) throw new Error('Пароль должен содержать не менее 10 символов.');
  if (password !== $('confirmPassword').value) {
    fieldError($('confirmPassword'), 'Пароли не совпадают.');
    return;
  }
  await decrypt(session.record, $('currentPassword').value);
  const salt = bytesTo64(crypto.getRandomValues(new Uint8Array(16))),
    key = await derive(password, from64(salt)),
    next = clone(data);
  next.preferences.changesSinceExport++;
  const record = await encrypt(next, key, salt, session.revision + 1);
  record.drafts = await rekeyDrafts(key, salt);
  await storeTransaction(() => {
    const db = readVaults();
    if (db.accounts[session.name]?.ciphertext !== session.record.ciphertext)
      throw new Error('Дневник изменён в другой вкладке. Войдите снова.');
    db.accounts[session.name] = record;
    writeStore(STORE, db);
  });
  session = { ...session, key, salt, record, revision: record.revision };
  data = next;
  $('passwordForm').reset();
  render();
  notice('Пароль изменён. Сохраните новую копию; старые открываются прежним паролем.');
});
bindForm('restoreForm', async () => {
  restoreReady = null;
  $('restorePreview').innerHTML = '';
  $('restoreSubmitBtn').classList.add('hidden');
  const name = username($('restoreName').value),
    file = $('restoreFile').files[0];
  if (!file || file.size > 150000000) throw new Error('Выберите JSON-копию до 150 МБ.');
  if (own(readVaults().accounts, name) || own(readStore(LEGACY, {}), name))
    throw new Error('Укажите новое имя профиля.');
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    throw new Error('Не удалось прочитать JSON.');
  }
  if (backup.format !== 'DiabControl-encrypted-backup' || backup.version !== 2)
    throw new Error('Нужна зашифрованная копия DiabControl версии 2.');
  const result = await decrypt(backup.record, $('restorePassword').value);
  await verifyBackupPhotos(result.content, backup.photos || {});
  for (const type of entryTypes)
    if (backup.record.drafts?.[type]) await decodeDraft(backup.record.drafts[type], result.key, type);
  restoreReady = {
    name,
    key: result.key,
    salt: backup.record.salt,
    content: result.content,
    photos: backup.photos || {},
    drafts: backup.record.drafts || {},
  };
  const d = result.content,
    dates = [
      ...d.sugar.map((i) => stamp(i, 'sugar')),
      ...d.food.map((i) => i.datetime),
      ...d.insulin.map((i) => i.datetime),
      ...d.wellbeing.map((i) => i.datetime),
    ]
      .filter(Boolean)
      .sort();
  $('restorePreview').innerHTML =
    `<div class="notice"><h3>Копия готова к восстановлению</h3><p>Новый профиль: <strong>${esc(name)}</strong></p><p>${dates.length ? `Период записей: ${shortDate(dates[0].slice(0, 10))} — ${shortDate(dates.at(-1).slice(0, 10))}` : 'Записей с датой нет.'}</p><div class="preview-counts"><span>Глюкоза: ${d.sugar.length}</span><span>Еда: ${d.food.length}</span><span>Инсулин: ${d.insulin.length}</span><span>Шаблоны: ${d.favorites.length}</span><span>Самочувствие: ${d.wellbeing.length}</span><span>Фотографии: ${Object.keys(d.media).length}</span><span>Подборки: ${d.collections.length}</span></div>${d.recovery?.missingPhotos?.length ? `<p class="notice">Аварийная копия: ${d.recovery.missingPhotos.length} фотографий не включено. Записи сохранены; недоступные вложения перечислены в зашифрованной копии.</p>` : ''}<p>Существующие профили сохранятся.</p></div>`;
  $('restorePreview').classList.remove('hidden');
  $('restoreSubmitBtn').classList.remove('hidden');
});
$('restoreSubmitBtn').onclick = () =>
  run(async () => {
    if (!restoreReady) throw new Error('Сначала проверьте копию.');
    const r = restoreReady,
      record = await encrypt(r.content, r.key, r.salt, 1);
    record.drafts = r.drafts;
    await mediaTransaction(
      () =>
        storeTransaction(async () => {
          const db = readVaults();
          if (own(db.accounts, r.name) || own(readStore(LEGACY, {}), r.name))
            throw new Error('Имя уже занято. Выберите другое.');
          const written = [];
          try {
            await installBackupPhotos(r.name, r.content, r.photos, written);
            Object.defineProperty(db.accounts, r.name, {
              value: record,
              enumerable: true,
              writable: true,
              configurable: true,
            });
            writeStore(STORE, db);
          } catch (error) {
            const cleanup = await Promise.allSettled(written.map((key) => mediaOperation('delete', key)));
            if (cleanup.some((result) => result.status === 'rejected'))
              error.message += ' Не удалось убрать часть временных файлов фотографий.';
            throw error;
          }
        }),
      r.name,
    );
    enter({ name: r.name, key: r.key, salt: r.salt, revision: 1, record }, r.content);
    notice('Копия восстановлена в отдельный профиль.');
  }, 'restoreForm');
bindForm('onboardingForm', async () => {
  if (setupStep < 2) {
    setupStep++;
    showSetup();
    return;
  }
  const next = clone(data),
    phone = $('setupPhone').value.trim();
  next.profile.unit = $('setupUnit').value;
  next.profile.carbsPerXE = number($('setupCarbs').value, 'Углеводы в ХЕ', 1, 100, true);
  if (phone && !/^\+?[\d\s()\-]{3,40}$/.test(phone)) {
    fieldError($('setupPhone'), 'Проверьте номер телефона.');
    return;
  }
  if (phone && !next.profile.phones.includes(phone)) next.profile.phones.push(phone);
  next.preferences.onboardingDone = true;
  await persist(next);
  closeModal();
  render();
  notice('Дневник готов. Добавьте первую запись.');
});
$('setupBack').onclick = () => {
  setupStep = Math.max(0, setupStep - 1);
  showSetup();
};
$('setupSkip').onclick = () =>
  run(async () => {
    const next = clone(data);
    next.preferences.onboardingDone = true;
    await persist(next, false);
    closeModal();
    render();
  });
bindForm('reportForm', makeReport);
$('printReportBtn').onclick = () =>
  run(async () => {
    await makeReport();
    window.print();
  }, 'reportForm');
$('csvReportBtn').onclick = () => {
  try {
    exportCSV();
  } catch (e) {
    formError('reportForm', e.message);
  }
};
$('switchToRegister').onclick = () => {
  $('authHeading').textContent = 'Создать дневник';
  $('authLead').textContent = 'Выберите имя профиля и надёжный пароль.';
  $('loginForm').classList.add('hidden');
  $('registerForm').classList.remove('hidden');
  $('regUsername').focus();
};
$('switchToLogin').onclick = () => {
  $('authHeading').textContent = 'Ваш дневник';
  $('authLead').textContent = 'Введите имя профиля и пароль.';
  $('registerForm').classList.add('hidden');
  $('loginForm').classList.remove('hidden');
  $('loginUsername').focus();
};
$('logoutBtn').onclick = () => lock();
$('lockDiaryBtn').onclick = () => lock();
$('profileBtn').onclick = () => {
  fillProfile();
  settingsTab('basic');
  openModal('profileModal');
};
$('exportBtn').onclick = () => run(backup);
for (const id of ['importBtn', 'restoreStartBtn', 'checkBackupBtn'])
  $(id).onclick = () => {
    $('restoreForm').reset();
    clearErrors($('restoreForm'));
    restoreReady = null;
    $('restorePreview').innerHTML = '';
    $('restoreSubmitBtn').classList.add('hidden');
    openModal('restoreModal');
  };
for (const id of ['emergencyBtn', 'publicEmergencyBtn', 'authQuickEmergency']) $(id).onclick = emergencyOpen;
for (const id of ['profileShortInsulinName', 'profileCorrectionTarget', 'profileCorrectionFactor', 'profileCorrectionStep', 'profileCorrectionMax'])
  $(id).addEventListener('input', () => { $('profileCorrectionConfirmed').checked = false; });
bindEmergencyEvents();
bindLearningEvents();
bindStartGuideEvents();
bindEntryLauncherEvents();
$('sugarUnitMmol').onclick = () => run(() => changeUnit('mmol'));
$('sugarUnitMgdl').onclick = () => run(() => changeUnit('mgdl'));
$('calcToFoodBtn').onclick = () => {
  if (!calcSnapshot) return;
  const item = calcSnapshot;
  openEntry('food');
  $('foodWeight').value = item.weight;
  $('foodCarbsPer100').value = item.carbsPer100;
  liveFood();
  $('foodName').focus();
};
$('newFavoriteBtn').onclick = () => editFavorite();
$('saveFavoriteBtn').onclick = () =>
  run(async () => {
    const item = favoriteFromForm();
    await saveFavorite(item, templateEdit && templateEdit !== 'new' ? templateEdit : null);
    if (templateEdit) {
      await queueDraft('food', true);
      closeModal();
    }
  }, 'foodForm');
$('undoBtn').onclick = () => run(undoDelete);
$('undoToastBtn').onclick = () => run(undoDelete);
$('confirmDeleteBtn').onclick = () =>
  run(async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete,
      next = clone(data),
      index = next[type].findIndex((i) => i.id === id);
    if (index < 0) throw new Error('Запись уже удалена.');
    const item = next[type][index];
    next[type].splice(index, 1);
    await persist(next);
    lastDeletion = { name: session.name, type, item, index };
    closeModal();
    render();
    notice('Удалено. Можно вернуть последнюю удалённую запись.');
  });
$('expandChartBtn').onclick = () => {
  openModal('chartModal');
  renderChart('expandedChart');
};
$('dismissStatus').onclick = () => $('statusMessage').classList.add('hidden');
for (const id of ['diaryPeriod', 'diaryDate', 'diaryType'])
  $(id).addEventListener('change', () => {
    diaryLimit = 50;
    renderDiary();
  });
$('moreDiary').onclick = () => {
  diaryLimit += 50;
  renderDiary();
};
$('foodSearch').addEventListener('input', renderLibrary);
for (const id of ['calcWeight', 'calcCarbsPer100']) $(id).addEventListener('input', clearCalculation);
for (const id of ['foodWeight', 'foodCarbsPer100']) $(id).addEventListener('input', liveFood);
for (const id of ['sugarDateInput', 'sugarTimeInput', 'foodTime', 'insulinTime', 'wellbeingTime'])
  $(id).addEventListener('input', () =>
    updateTimeHint(
      id.startsWith('sugar')
        ? 'sugar'
        : id.startsWith('food')
          ? 'food'
          : id.startsWith('wellbeing')
            ? 'wellbeing'
            : 'insulin',
    ),
  );
for (const id of ['statsFrom', 'statsTo'])
  $(id).addEventListener('change', () => {
    document.querySelectorAll('[data-chart-period]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    renderStats();
  });
$('restoreForm').addEventListener('input', () => {
  restoreReady = null;
  $('restorePreview').innerHTML = '';
  $('restoreSubmitBtn').classList.add('hidden');
});
$('restoreFile').addEventListener('change', () => {
  restoreReady = null;
  $('restorePreview').innerHTML = '';
  $('restoreSubmitBtn').classList.add('hidden');
});
document.addEventListener('input', (e) => {
  if ($('statusMessage').classList.contains('error')) $('statusMessage').classList.add('hidden');
  if (e.target.id) {
    document.getElementById(e.target.id + 'Error')?.remove();
    e.target.removeAttribute('aria-invalid');
    e.target.removeAttribute('aria-describedby');
  }
});
document.addEventListener('click', (e) => {
  const event = e.target.closest('[data-event]');
  if (event) {
    selectEvent(event);
    return;
  }
  const point = e.target.closest('[data-point]');
  if (point) {
    selectPoint(point);
    return;
  }
  const el = e.target.closest('button,[data-nav]');
  if (!el) return;
  if (el.hasAttribute('data-close')) {
    if (!busy) closeModal();
    return;
  }
  if (busy || !session) return;
  if (el.dataset.nav) {
    e.preventDefault();
    navigate(el.dataset.nav);
  }
  if (el.dataset.add) openEntry(el.dataset.add);
  if (el.dataset.now) {
    setNow(el.dataset.now);
    queueDraft(el.dataset.now);
  }
  if (el.dataset.edit) editEntry(el.dataset.edit, el.dataset.id);
  if (el.dataset.delete) {
    const type = el.dataset.delete,
      id = el.dataset.id,
      item = data[type].find((i) => i.id === id);
    if (!item) return;
    openModal('confirmModal');
    pendingDelete = { type, id };
    $('confirmText').textContent =
      type === 'favorites'
        ? `Убрать «${item.name}» из избранного?`
        : `Удалить запись от ${dateLabel(stamp(item, type))}? После удаления её можно вернуть.`;
  }
  if (el.dataset.foodTab) {
    foodTab = el.dataset.foodTab;
    renderLibrary();
  }
  if (el.dataset.repeat) {
    const item = data.food.find((i) => i.id === el.dataset.repeat);
    if (item) openEntry('food', item);
  }
  if (el.dataset.useFood) {
    const item = (el.dataset.source === 'favorites' ? data.favorites : data.food).find(
      (i) => i.id === el.dataset.useFood,
    );
    if (item) openEntry('food', item);
  }
  if (el.dataset.editFavorite) editFavorite(el.dataset.editFavorite);
  if (el.dataset.favoriteRecord) {
    const item = data.food.find((i) => i.id === el.dataset.favoriteRecord);
    if (item) run(() => saveFavorite(item));
  }
  if (el.dataset.settings) settingsTab(el.dataset.settings);
  if (el.dataset.chartPeriod) {
    [$('statsFrom').value, $('statsTo').value] = rangeDays(
      el.dataset.chartPeriod === 'today' ? 1 : Number(el.dataset.chartPeriod),
    );
    document
      .querySelectorAll('[data-chart-period]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    renderStats();
  }
  if (el.hasAttribute('data-report')) reportOpen();
  if (el.hasAttribute('data-backup')) run(backup);
});
document.addEventListener('keydown', (e) => {
  const event = e.target.closest?.('[data-event]');
  if (event && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    selectEvent(event);
    return;
  }
  const point = e.target.closest?.('[data-point]');
  if (point && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    selectPoint(point);
    return;
  }
  if (!activeModal) return;
  if (e.key === 'Escape' && !busy) {
    e.preventDefault();
    closeModal();
  }
  if (e.key === 'Tab') {
    const nodes = [
      ...activeModal.querySelectorAll(
        'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]',
      ),
    ].filter((n) => n.getClientRects().length);
    const first = nodes[0],
      last = nodes.at(-1);
    if (!first) {
      e.preventDefault();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
for (const ev of ['pointerdown', 'keydown', 'input', 'wheel'])
  document.addEventListener(ev, activity, { capture: true, passive: true });
window.addEventListener('beforeunload', (event) => {
  if (pendingDrafts.size || draftWrites) {
    flushDrafts();
    event.preventDefault();
    event.returnValue = '';
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushDrafts();
  if (!document.hidden && session) {
    if (expired() && !busy) lock(true);
    else refreshClock();
  }
});
setInterval(() => {
  if (session) {
    if (expired()) {
      if (!busy) lock(true);
    } else if (!document.hidden) refreshClock();
  }
}, 15000);
window.addEventListener('storage', (e) => {
  if (e.key !== STORE || !session) return;
  try {
    if (readVaults().accounts[session.name]?.ciphertext !== session.record.ciphertext)
      notice('Дневник изменён в другой вкладке. Закройте его и войдите снова перед изменением.', true);
  } catch (error) {
    notice(error.message, true);
  }
});
let frame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    if (session) {
      if (currentPage === 'stats') renderStats();
      if (activeModal?.id === 'chartModal') renderChart('expandedChart');
    }
  });
});
bindForm('wellbeingForm', () =>
  saveEntry('wellbeing', {
    title: $('wellbeingTitle').value.trim(),
    kind: $('wellbeingKind').value,
    context: $('wellbeingContext').value,
    note: $('wellbeingNote').value.trim(),
    tag: $('wellbeingKind').value,
    datetime: validTime($('wellbeingTime').value),
  }),
);
bindForm('appearanceForm', async () => {
  const next = clone(data);
  next.preferences = appearanceFromForm();
  await persist(next);
  applyAppearance();
  render();
  notice('Оформление сохранено.');
});
for (const id of ['themeChoice', 'largeTextChoice', 'contrastChoice', 'motionChoice'])
  $(id).addEventListener('change', () => applyAppearance(appearanceFromForm()));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyAppearance());
$('editToastBtn').onclick = () => {
  if (lastSavedEntry) editEntry(lastSavedEntry.type, lastSavedEntry.id);
};
$('diarySearch').addEventListener('input', () => {
  diaryLimit = 50;
  renderDiary();
});
$('addIngredientBtn').onclick = () => {
  addIngredient();
  queueDraft('food');
};
$('recipeMode').addEventListener('change', () => {
  toggleRecipe();
  liveFood();
  queueDraft('food');
});
$('recipeYield').addEventListener('input', liveFood);
$('ingredientRows').addEventListener('input', liveFood);
$('foodPortions').addEventListener('input', renderPortions);
for (const id of ['compareFrom', 'compareTo']) $(id).addEventListener('change', renderComparison);
$('previousPeriodBtn').onclick = setPreviousPeriod;
$('saveReportNotesBtn').onclick = () =>
  run(async () => {
    const next = clone(data);
    next.reportNotes = {
      questions: $('reportQuestions').value.trim(),
      topics: $('reportTopics').value.trim(),
    };
    await persist(next);
    $('reportNotesStatus').textContent = 'Вопросы сохранены в дневнике.';
    renderVisitPreview();
    makeReport();
  });
for (const id of ['reportQuestions', 'reportTopics'])
  $(id).addEventListener('input', () => {
    $('reportNotesStatus').textContent = 'Есть несохранённые изменения. В предпросмотр они уже включены.';
    try {
      makeReport();
    } catch {}
  });
for (const id of ['reportFrom', 'reportTo'])
  $(id).addEventListener('change', () => {
    try {
      makeReport();
    } catch (e) {
      formError('reportForm', e.message);
    }
  });
$('selectAllNotes').onclick = () => {
  reportExcludedNotes.clear();
  makeReport();
};
$('selectNoNotes').onclick = () => {
  reportExcludedNotes = new Set(
    allEntries()
      .filter((e) => inRange(e.datetime, $('reportFrom').value, $('reportTo').value))
      .map((e) => e.item.id),
  );
  makeReport();
};
$('reportNoteChoices').addEventListener('change', (e) => {
  const id = e.target.dataset.reportNote;
  if (id) {
    if (e.target.checked) reportExcludedNotes.delete(id);
    else reportExcludedNotes.add(id);
    makeReport();
  }
});
for (const type of entryTypes) {
  $(type + 'Form').addEventListener('input', () => {
    if (session && activeModal?.id === type + 'Modal') scheduleDraft(type);
  });
  $(type + 'Form').addEventListener('change', (e) => {
    if (e.target.matches('select,input[type=checkbox]') && session && activeModal?.id === type + 'Modal')
      scheduleDraft(type);
  });
}
document.addEventListener('click', (e) => {
  if (busy || !session) return;
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.resumeDraft) run(() => resumeDraft(el.dataset.resumeDraft));
  if (el.dataset.discardDraft)
    run(async () => {
      const type = el.dataset.discardDraft;
      await queueDraft(type, true);
      $(type + 'Draft').classList.add('hidden');
      $(type + 'DraftStatus').textContent = 'Черновик удалён.';
    });
  if (el.dataset.quickTag) {
    $(el.dataset.tagType + 'Tag').value = el.dataset.quickTag;
    queueDraft(el.dataset.tagType);
  }
  if (el.hasAttribute('data-remove-ingredient')) {
    el.closest('.ingredient-row').remove();
    liveFood();
    queueDraft('food');
  }
  if (el.dataset.portion) {
    $('foodWeight').value = el.dataset.portion;
    liveFood();
    queueDraft('food');
  }
  if (el.hasAttribute('data-create-food')) {
    const query = $('foodSearch').value.trim();
    editFavorite();
    $('foodName').value = query;
  }
});
// Keep the action area in the visual viewport when a mobile keyboard opens.
function syncVisualViewport() {
  const v = window.visualViewport;
  document.documentElement.style.setProperty('--visual-height', v ? v.height + 'px' : '100dvh');
  document.documentElement.style.setProperty('--visual-top', v ? v.offsetTop + 'px' : '0px');
}
window.visualViewport?.addEventListener('resize', syncVisualViewport);
window.visualViewport?.addEventListener('scroll', syncVisualViewport);
syncVisualViewport();
document.querySelectorAll('input[type="date"]').forEach((input) => {
  input.max = localDate();
  input.addEventListener('focus', () => (input.max = localDate()));
});
document.querySelectorAll('form').forEach((f) => (f.noValidate = true));
try {
  removeStore('diab_session');
  $('legacyNotice').classList.toggle('hidden', Object.keys(readStore(LEGACY, {})).length === 0);
  readVaults();
} catch (e) {
  notice(e.message, true);
}

function chartEntries() {
  return allEntries().filter(
    (entry) =>
      inRange(entry.datetime, $('statsFrom').value, $('statsTo').value) &&
      ['sugar', 'food', 'insulin'].includes(entry.type),
  );
}
function renderChartRecords(target) {
  const output = $(target === 'expandedChart' ? 'expandedRecordList' : 'chartRecordList');
  if (!output) return;
  const entries = chartEntries();
  output.innerHTML = entries.length
    ? entries
        .slice(0, 200)
        .map(
          (entry) =>
            `<button type="button" class="secondary" aria-pressed="false" data-chart-record="${entry.item.id}" data-chart-target="${target}"><span>${esc(dateLabel(entry.datetime))} · ${typeNames[entry.type]}</span><strong>${esc(entryDescription(entry.type, entry.item))}</strong></button>`,
        )
        .join('')
    : '<p class="hint">За выбранный период записей нет.</p>';
  if (entries.length > 200)
    output.insertAdjacentHTML(
      'beforeend',
      '<p class="hint">Показаны последние 200 событий. Выберите более короткий период для остальных записей.</p>',
    );
}
function bindChartPointer(target) {
  $(target).onclick = (event) => {
    if (event.detail === 0) return;
    const svg = $(target).querySelector('svg');
    if (!svg) return;
    let nearest = null,
      distance = 32;
    for (const node of svg.querySelectorAll('[data-point],[data-event]')) {
      const circle = node.querySelector('.selection-ring'),
        matrix = svg.getScreenCTM();
      if (!circle || !matrix) continue;
      const point = new DOMPoint(
        Number(circle.getAttribute('cx')),
        Number(circle.getAttribute('cy')),
      ).matrixTransform(matrix);
      const delta = Math.hypot(event.clientX - point.x, event.clientY - point.y);
      if (delta < distance) {
        nearest = node;
        distance = delta;
      }
    }
    if (nearest) {
      event.stopPropagation();
      if (nearest.dataset.point) selectPoint(nearest);
      else selectEvent(nearest);
    }
  };
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-chart-record]');
  if (!button || !session) return;
  const node = $(button.dataset.chartTarget).querySelector(
    `[data-point="${button.dataset.chartRecord}"],[data-event="${button.dataset.chartRecord}"]`,
  );
  if (node) {
    if (node.dataset.point) selectPoint(node);
    else selectEvent(node);
  }
});
const compactDiary = matchMedia('(max-width:600px)');
$('diaryFilters').open = !compactDiary.matches;
compactDiary.addEventListener('change', (event) => {
  $('diaryFilters').open = !event.matches;
});
$('statsDays').addEventListener('toggle', () => {
  if ($('statsDays').open && session) renderDayCompare();
});
$('statsComparisons').addEventListener('toggle', () => {
  if ($('statsComparisons').open && session) renderComparison();
});

bindExplore();
clearForms();
maybeShowStartGuide();
/* MODULE:pwa */
