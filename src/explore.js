// Exploration features share the authenticated profile and the existing write transaction.
let diaryView = 'list',
  chartView = '2d',
  quickCandidate = null,
  csvSource = null,
  csvPreview = null;
let collectionEdit = null,
  collectionSelected = new Set(),
  currentReportCollection = null,
  historyTarget = null;
let photoReturn = null,
  photoEpoch = 0,
  ocrWorker = null,
  ocrWorkerURL = null;
const pendingPhotos = { sugar: [], food: [], insulin: [], wellbeing: [] },
  photoURLs = new Map();
let pendingRecipeId = null,
  threeDPoints = [],
  threeDSelected = null,
  threeDDrag = null;
const isId = (id) => typeof id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(id);
function normalizeExplore(d) {
  if (d.recovery !== undefined) {
    const recovery = d.recovery;
    if (
      !recovery ||
      typeof recovery.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(recovery.createdAt)) ||
      !Array.isArray(recovery.missingPhotos) ||
      recovery.missingPhotos.length > 200 ||
      recovery.missingPhotos.some(
        (photo) =>
          !photo ||
          !isId(photo.id) ||
          typeof photo.name !== 'string' ||
          photo.name.length > 200 ||
          typeof photo.reason !== 'string' ||
          photo.reason.length > 200,
      )
    ) {
      throw new Error('Некорректное описание аварийной копии.');
    }
  }
  for (const key of ['history', 'trash', 'collections', 'calendarNotes', 'imports', 'dayComparisons'])
    d[key] ??= [];
  d.media ??= {};
  if (!d.media || typeof d.media !== 'object' || Array.isArray(d.media) || Object.keys(d.media).length > 200)
    throw new Error('Некорректный архив фотографий.');
  for (const [id, m] of Object.entries(d.media))
    if (
      !isId(id) ||
      !m ||
      typeof m.name !== 'string' ||
      m.name.length > 200 ||
      m.mime !== 'image/jpeg' ||
      typeof m.key !== 'string' ||
      typeof m.iv !== 'string' ||
      from64(m.key).length !== 32 ||
      from64(m.iv).length !== 12
    )
      throw new Error('Некорректная фотография в профиле.');
  for (const key of ['history', 'trash', 'collections', 'calendarNotes', 'imports', 'dayComparisons'])
    if (!Array.isArray(d[key]) || d[key].length > 2000) throw new Error('Слишком много элементов: ' + key);
  for (const h of d.history)
    if (
      !h ||
      !isId(h.id) ||
      !['sugar', 'food', 'insulin', 'wellbeing', 'favorites'].includes(h.type) ||
      !isId(h.eventId) ||
      typeof h.at !== 'string' ||
      !h.before ||
      h.before.id !== h.eventId ||
      (h.after !== null && h.after?.id !== h.eventId)
    )
      throw new Error('Некорректная история изменений.');
  for (const t of d.trash)
    if (
      !t ||
      !isId(t.id) ||
      !['sugar', 'food', 'insulin', 'wellbeing', 'favorites'].includes(t.type) ||
      !t.item ||
      !isId(t.item.id) ||
      typeof t.deletedAt !== 'string'
    )
      throw new Error('Некорректная корзина.');
  for (const c of d.collections)
    if (
      !c ||
      !isId(c.id) ||
      typeof c.name !== 'string' ||
      !c.name.trim() ||
      c.name.length > 160 ||
      typeof c.note !== 'string' ||
      c.note.length > 1500 ||
      !Array.isArray(c.refs) ||
      c.refs.length > 1000 ||
      c.refs.some((r) => !entryTypes.includes(r.type) || !isId(r.id))
    )
      throw new Error('Некорректная подборка.');
  for (const n of d.calendarNotes)
    if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(n.date) || typeof n.title !== 'string' || n.title.length > 120)
      throw new Error('Некорректная пометка календаря.');
  for (const n of d.dayComparisons)
    if (
      !n ||
      !/^\d{4}-\d{2}-\d{2}$/.test(n.a) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(n.b) ||
      typeof n.note !== 'string' ||
      n.note.length > 1000
    )
      throw new Error('Некорректное сравнение дней.');
  for (const b of d.imports)
    if (
      !b ||
      !isId(b.id) ||
      typeof b.name !== 'string' ||
      !Array.isArray(b.entries) ||
      b.entries.length > 1000 ||
      b.entries.some((e) => !entryTypes.includes(e.type) || !isId(e.id) || typeof e.fingerprint !== 'string')
    )
      throw new Error('Некорректный пакет импорта.');
}
function validatePhotoRefs(item, d) {
  item.photoIds ??= [];
  if (
    !Array.isArray(item.photoIds) ||
    item.photoIds.length > 4 ||
    item.photoIds.some((id) => !isId(id) || !own(d.media, id))
  )
    throw new Error('В записи отсутствует фотография.');
  if (item.recipeId !== undefined && item.recipeId !== null && !isId(item.recipeId))
    throw new Error('Некорректная ссылка на рецепт.');
}
/* MODULE:history-calendar */
/* MODULE:quick-entry */
/* MODULE:media */
/* MODULE:csv-import */
/* MODULE:exploration-charts */
function renderExplore() {
  if (!session) return;
  if (diaryView === 'calendar') renderCalendar();
  if (diaryView === 'collections') renderCollections();
  if (diaryView === 'trash') renderTrash();
  renderImportHistory();
  if (currentPage === 'stats') {
    render3D();
    renderDayCompare();
  }
  hydratePhotos();
}
function resetExplore() {
  recoveryArchive = null;
  diaryView = 'list';
  chartView = '2d';
  quickCandidate = null;
  csvSource = null;
  csvPreview = null;
  collectionEdit = null;
  collectionSelected.clear();
  currentReportCollection = null;
  historyTarget = null;
  pendingRecipeId = null;
  threeDSelected = null;
  photoReturn = null;
  clearPhotoURLs();
  for (const type of entryTypes) {
    pendingPhotos[type] = [];
    renderPhotoEditor(type);
  }
  for (const id of [
    'quickTextForm',
    'calendarNoteForm',
    'collectionForm',
    'csvMappingForm',
    'dayCompareForm',
  ])
    $(id).reset();
  for (const id of [
    'calendarGrid',
    'collectionList',
    'collectionChoices',
    'trashList',
    'historyContent',
    'dishHistoryContent',
    'csvImportPreview',
    'csvMapping',
    'quickTextPreview',
    'dayCompareChart',
    'dayCompareInfo',
    'dayCompareSelection',
    'chart3d',
    'chart3dInfo',
    'chart3dSelection',
    'chart3dPoint',
    'importHistory',
    'mediaStorageInfo',
    'reportCollectionBanner',
  ])
    $(id).textContent = '';
  $('quickTextApply').classList.add('hidden');
  $('quickTextPreview').classList.add('hidden');
  $('csvMappingForm').classList.add('hidden');
  $('csvConfirmImport').classList.add('hidden');
  $('csvImportFile').value = '';
  $('ocrText').value = '';
  $('ocrCarbs').value = '';
  $('ocrStatus').textContent = '';
  $('calendarMonth').value = localDate().slice(0, 7);
  $('calendarNoteDate').value = localDate();
  $('dayCompareA').value = localDate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  $('dayCompareB').value = localDate(yesterday);
  for (const key of ['list', 'calendar', 'collections', 'trash'])
    $('diary' + key[0].toUpperCase() + key.slice(1) + 'Panel').classList.toggle('hidden', key !== 'list');
  document
    .querySelectorAll('[data-diary-view]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.diaryView === 'list')));
  $('chart3dPanel').classList.add('hidden');
  $('sugarChart').classList.remove('hidden');
  $('chartSelection').classList.remove('hidden');
  $('expandChartBtn').classList.remove('hidden');
  $('chart2dLegend').classList.remove('hidden');
  document
    .querySelectorAll('[data-chart-view]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.chartView === '2d')));
  if (ocrWorker) {
    ocrWorker.terminate().catch(() => {});
    ocrWorker = null;
  }
  if (ocrWorkerURL) {
    URL.revokeObjectURL(ocrWorkerURL);
    ocrWorkerURL = null;
  }
}
function bindExplore() {
  $('cleanMediaBtn').onclick = () =>
    run(async () => {
      const result = await cleanUnusedPhotos();
      notice(`Архив очищен. Освобождено фотографий: ${result.removed}; удалено файлов: ${result.files}.`);
    });
  $('recoveryExportBtn').onclick = () => run(prepareRecoveryBackup);
  $('downloadRecoveryBtn').onclick = downloadRecoveryBackup;
  $('reportIncludePhotos').onchange = () => {
    makeReport();
    hydratePhotos();
  };
  $('quickTextBtn').onclick = () => {
    $('quickTextForm').reset();
    quickCandidate = null;
    $('quickTextPreview').classList.add('hidden');
    $('quickTextApply').classList.add('hidden');
    openModal('quickTextModal');
  };
  bindForm('quickTextForm', () => {
    quickCandidate = parseQuickText($('quickTextInput').value);
    $('quickTextPreview').innerHTML = snapshotHTML(quickCandidate.type, quickCandidate.item);
    $('quickTextPreview').classList.remove('hidden');
    $('quickTextApply').classList.remove('hidden');
  });
  $('quickTextApply').onclick = applyQuick;
  $('quickTextInput').oninput = () => {
    quickCandidate = null;
    $('quickTextApply').classList.add('hidden');
  };
  $('calendarMonth').onchange = renderCalendar;
  $('calendarNoteDate').onchange = () => {
    $('calendarNoteTitle').value =
      data.calendarNotes.find((n) => n.date === $('calendarNoteDate').value)?.title || '';
  };
  bindForm('calendarNoteForm', async () => {
    const date = $('calendarNoteDate').value,
      title = $('calendarNoteTitle').value.trim();
    validTime(date + 'T00:00', 'Дата', true);
    const next = clone(data);
    next.calendarNotes = next.calendarNotes.filter((n) => n.date !== date);
    if (title) next.calendarNotes.push({ date, title });
    await persist(next);
    renderCalendar();
    notice('Пометка дня сохранена.');
  });
  $('newCollectionBtn').onclick = () => openCollection();
  $('collectionSearch').oninput = collectionChoices;
  $('collectionChoices').onchange = (e) => {
    const key = e.target.dataset.collectionRef;
    if (!key) return;
    if (e.target.checked) collectionSelected.add(key);
    else collectionSelected.delete(key);
    $('collectionSelectedCount').textContent = 'Выбрано: ' + collectionSelected.size;
  };
  bindForm('collectionForm', async () => {
    if (!collectionSelected.size) throw new Error('Выберите хотя бы одну запись.');
    const next = clone(data),
      item = {
        id: collectionEdit || uid(),
        name: $('collectionName').value.trim(),
        note: $('collectionNote').value.trim(),
        refs: [...collectionSelected].map((k) => {
          const [type, id] = k.split(':');
          return { type, id };
        }),
      },
      i = next.collections.findIndex((c) => c.id === item.id);
    if (i < 0) next.collections.push(item);
    else next.collections[i] = item;
    await persist(next);
    closeModal();
    setDiaryView('collections');
    navigate('diary');
    notice('Подборка сохранена.');
  });
  $('collectionReportBtn').onclick = () => {
    if (collectionEdit) reportOpen(collectionEdit);
  };
  for (const type of entryTypes)
    $(type + 'PhotoInput').onchange = () =>
      run(async () => {
        await uploadPhoto(type, $(type + 'PhotoInput').files[0]);
        $(type + 'PhotoInput').value = '';
      });
  $('ocrStartBtn').onclick = () => run(recognizeLabel);
  $('ocrApplyBtn').onclick = () =>
    run(() => {
      if ($('recipeMode').checked)
        throw new Error('Для рецепта укажите распознанное значение у соответствующего ингредиента.');
      const value = number($('ocrCarbs').value, 'Углеводы на 100 г', 0, 100);
      $('foodCarbsPer100').value = value;
      $('foodSource').value = 'label';
      liveFood();
      queueDraft('food');
      notice('Подтверждённые углеводы перенесены в форму.');
    });
  $('csvImportBtn').onclick = () => {
    csvSource = null;
    csvPreview = null;
    $('csvImportFile').value = '';
    $('csvMappingForm').classList.add('hidden');
    $('csvImportPreview').textContent = '';
    $('csvConfirmImport').classList.add('hidden');
    $('csvSkipInvalidLabel').classList.add('hidden');
    openModal('csvImportModal');
  };
  $('csvImportFile').onchange = () => run(() => loadCSV($('csvImportFile').files[0]));
  bindForm('csvMappingForm', previewCSV);
  $('csvMappingForm').onchange = () => {
    csvPreview = null;
    $('csvConfirmImport').classList.add('hidden');
  };
  $('csvConfirmImport').onclick = () => run(confirmCSV);
  $('chart3dYaw').oninput = render3D;
  $('chart3dPoint').onchange = () => {
    threeDSelected = $('chart3dPoint').value;
    render3D();
  };
  $('chart3d').onpointerdown = (e) => {
    if (e.button !== 0) return;
    threeDDrag = { x: e.clientX, yaw: Number($('chart3dYaw').value), moved: false };
    $('chart3d').setPointerCapture(e.pointerId);
  };
  $('chart3d').onpointermove = (e) => {
    if (!threeDDrag) return;
    const dx = e.clientX - threeDDrag.x;
    if (Math.abs(dx) > 5) threeDDrag.moved = true;
    if (threeDDrag.moved) {
      $('chart3dYaw').value = Math.max(-70, Math.min(-10, threeDDrag.yaw + dx * 0.2));
      render3D();
    }
  };
  $('chart3d').onpointerup = (e) => {
    if (!threeDDrag) return;
    if (!threeDDrag.moved) {
      const rect = $('chart3d').getBoundingClientRect();
      let best = null,
        distance = 30;
      for (const p of threeDPoints) {
        const d = Math.hypot(e.clientX - rect.left - p.x, e.clientY - rect.top - p.y);
        if (d < distance) {
          best = p;
          distance = d;
        }
      }
      if (best) {
        threeDSelected = best.item.id;
        render3D();
      }
    }
    threeDDrag = null;
  };
  $('chart3d').onpointercancel = () => (threeDDrag = null);
  for (const id of ['dayCompareA', 'dayCompareB']) $(id).onchange = () => renderDayCompare(true);
  bindForm('dayCompareForm', async () => {
    const a = $('dayCompareA').value,
      b = $('dayCompareB').value;
    validTime(a + 'T00:00', 'Первый день', true);
    validTime(b + 'T00:00', 'Второй день', true);
    const next = clone(data);
    next.dayComparisons = next.dayComparisons.filter((n) => n.a !== a || n.b !== b);
    next.dayComparisons.push({ a, b, note: $('dayCompareNote').value.trim() });
    await persist(next);
    notice('Наблюдение сохранено.');
  });
  $('dayCompareToReport').onclick = () =>
    run(async () => {
      const text = $('dayCompareNote').value.trim();
      if (!text) throw new Error('Напишите своё наблюдение.');
      const next = clone(data),
        line = `${shortDate($('dayCompareA').value)} / ${shortDate($('dayCompareB').value)}: ${text}`;
      next.reportNotes.topics = [next.reportNotes.topics, line].filter(Boolean).join('\n');
      if (next.reportNotes.topics.length > 1500)
        throw new Error('В темах приёма недостаточно места. Сократите текст.');
      await persist(next);
      notice('Наблюдение добавлено к темам приёма.');
    });
  document.addEventListener('click', (e) => {
    if (!session || busy) return;
    const el = e.target.closest('button,[data-compare-point],[data-compare-event]');
    if (!el) return;
    if (el.dataset.diaryView) setDiaryView(el.dataset.diaryView);
    if (el.dataset.chartView) chartMode(el.dataset.chartView);
    if (el.dataset.calendarDay) {
      $('diaryPeriod').value = 'date';
      $('diaryDate').value = el.dataset.calendarDay;
      $('calendarNoteDate').value = el.dataset.calendarDay;
      $('calendarNoteTitle').value =
        data.calendarNotes.find((n) => n.date === el.dataset.calendarDay)?.title || '';
      setDiaryView('list');
      renderDiary();
    }
    if (el.dataset.history) openHistory(el.dataset.history, el.dataset.id);
    if (el.dataset.restoreVersion) run(() => restoreVersion(el.dataset.restoreVersion));
    if (el.dataset.restoreTrash) run(() => restoreTrash(el.dataset.restoreTrash));
    if (el.dataset.purgeTrash && confirm('Удалить запись из корзины и её историю навсегда?'))
      run(async () => {
        const t = data.trash.find((t) => t.id === el.dataset.purgeTrash);
        if (!t) return;
        const next = clone(data);
        next.trash = next.trash.filter((i) => i.id !== t.id);
        next.history = next.history.filter((h) => h.type !== t.type || h.eventId !== t.item.id);
        await persist(next);
        if (lastDeletion?.item.id === t.item.id) lastDeletion = null;
        await cleanUnusedPhotos();
        renderTrash();
      });
    if (el.dataset.openCollection) openCollection(el.dataset.openCollection);
    if (el.dataset.reportCollection) reportOpen(el.dataset.reportCollection);
    if (el.dataset.deleteCollection && confirm('Удалить подборку? Сами записи останутся в дневнике.'))
      run(async () => {
        const next = clone(data);
        next.collections = next.collections.filter((c) => c.id !== el.dataset.deleteCollection);
        await persist(next);
        renderCollections();
      });
    if (el.dataset.dishHistory) dishHistory(el.dataset.dishHistory, el.dataset.source);
    if (el.dataset.repeatVersion) {
      const h = data.history.find((h) => h.id === el.dataset.repeatVersion);
      if (h) openEntry('food', h.before, false);
    }
    if (el.dataset.openPhoto) run(() => showPhoto(el.dataset.openPhoto));
    if (el.dataset.removePhoto) {
      const type = el.dataset.photoType;
      pendingPhotos[type] = pendingPhotos[type].filter((id) => id !== el.dataset.removePhoto);
      renderPhotoEditor(type);
      queueDraft(type);
    }
    if (
      el.dataset.undoImport &&
      confirm('Отменить весь импорт? Его неизменённые записи будут перемещены в корзину.')
    )
      run(() => undoImport(el.dataset.undoImport));
    const id = el.dataset.comparePoint || el.dataset.compareEvent;
    if (id) {
      const record = allEntries().find((e) => e.item.id === id);
      if (record)
        $('dayCompareSelection').textContent =
          dateLabel(record.datetime) + ' · ' + entryDescription(record.type, record.item);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (
      (e.key === 'Enter' || e.key === ' ') &&
      e.target.matches('[data-compare-point],[data-compare-event]')
    ) {
      e.preventDefault();
      e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (session && currentPage === 'stats') {
        render3D();
        renderDayCompare();
      }
    });
  });
}
