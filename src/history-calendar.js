function trackChanges(next) {
  const now = new Date().toISOString();
  for (const type of [...entryTypes, 'favorites']) {
    const after = new Map(next[type].map((i) => [i.id, i]));
    for (const before of data[type]) {
      const item = after.get(before.id);
      if (item && JSON.stringify(item) === JSON.stringify(before)) continue;
      next.history.push({
        id: uid(),
        type,
        eventId: before.id,
        at: now,
        before: clone(before),
        after: item ? clone(item) : null,
      });
      if (!item && !next.trash.some((t) => t.type === type && t.item.id === before.id))
        next.trash.push({ id: uid(), type, item: clone(before), deletedAt: now });
    }
    next.trash = next.trash.filter((t) => t.type !== type || !after.has(t.item.id));
  }
  const counts = new Map();
  next.history = next.history
    .slice()
    .reverse()
    .filter((h) => {
      const key = h.type + ':' + h.eventId,
        count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      return count <= 20;
    })
    .slice(0, 1000)
    .reverse();
}
function entryDescription(type, item) {
  if (type === 'sugar') return `${sugarText(item.value)} ${unit()}`;
  if (type === 'food' || type === 'favorites')
    return `${item.name || 'Блюдо'} · ${fmt(item.weight)} г · ${fmt((item.weight * item.carbsPer100) / 100)} г углеводов`;
  if (type === 'insulin')
    return `${fmt(item.dose)} ${item.unit === 'legacy-xe' ? 'ХЕ · уточните единицы' : 'ЕД'} · ${item.name || 'Препарат не указан'}`;
  return item.title || 'Заметка';
}
function snapshotHTML(type, item) {
  return item
    ? `<strong>${esc(entryDescription(type, item))}</strong><p>${type === 'favorites' ? 'Шаблон блюда' : esc(dateLabel(stamp(item, type)))}</p><p class="multiline">${esc(item.note || '')}</p>${item.ingredients?.length ? `<p>${item.ingredients.map((i) => esc(i.name) + ' ' + fmt(i.weight) + ' г').join(' · ')}</p>` : ''}`
    : '<p>Запись удалена</p>';
}
function openHistory(type, id) {
  historyTarget = { type, id };
  const items = data.history
    .filter((h) => h.type === type && h.eventId === id)
    .slice()
    .reverse();
  $('historyContent').innerHTML = items.length
    ? items
        .map(
          (h) =>
            `<article class="history-row"><p class="eyebrow">${esc(new Date(h.at).toLocaleString('ru-RU'))}</p><div class="two-cols"><div><h3>До изменения</h3>${snapshotHTML(type, h.before)}</div><div><h3>После изменения</h3>${snapshotHTML(type, h.after)}</div></div><button type="button" class="secondary" data-restore-version="${h.id}">Восстановить прежнее значение</button></article>`,
        )
        .join('')
    : '<p class="empty-state">Эта запись ещё не изменялась.</p>';
  openModal('historyModal');
}
async function restoreVersion(id) {
  const h = data.history.find((h) => h.id === id);
  if (!h) return;
  const next = clone(data),
    index = next[h.type].findIndex((i) => i.id === h.eventId);
  if (index >= 0) next[h.type][index] = clone(h.before);
  else next[h.type].push(clone(h.before));
  await persist(next);
  closeModal();
  render();
  notice('Прежняя версия восстановлена.');
}
function renderTrash() {
  $('trashList').innerHTML = data.trash.length
    ? data.trash
        .slice()
        .reverse()
        .map(
          (t) =>
            `<article class="history-row"><strong>${esc(entryDescription(t.type, t.item))}</strong><p class="hint">Удалено ${esc(new Date(t.deletedAt).toLocaleString('ru-RU'))}</p><div class="button-row"><button type="button" class="secondary" data-restore-trash="${t.id}">Восстановить</button><button type="button" class="text-btn" data-purge-trash="${t.id}">Удалить навсегда</button></div></article>`,
        )
        .join('')
    : '<p class="empty-state">Корзина пуста.</p>';
}
async function restoreTrash(id) {
  const t = data.trash.find((t) => t.id === id);
  if (!t) return;
  const next = clone(data);
  if (next[t.type].some((i) => i.id === t.item.id)) throw new Error('Запись уже существует.');
  next[t.type].push(clone(t.item));
  next.trash = next.trash.filter((i) => i.id !== id);
  await persist(next);
  render();
  notice('Запись восстановлена из корзины.');
}
function setDiaryView(view) {
  diaryView = view;
  for (const key of ['list', 'calendar', 'collections', 'trash'])
    $('diary' + key[0].toUpperCase() + key.slice(1) + 'Panel').classList.toggle('hidden', key !== view);
  document
    .querySelectorAll('[data-diary-view]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.diaryView === view)));
  renderExplore();
}
function renderCalendar() {
  const month = $('calendarMonth').value || localDate().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const [year, m] = month.split('-').map(Number),
    first = new Date(year, m - 1, 1),
    offset = (first.getDay() + 6) % 7,
    days = new Date(year, m, 0).getDate();
  let html = '<span></span>'.repeat(offset);
  const grouped = new Map();
  for (const e of allEntries()) {
    const date = e.datetime?.slice(0, 10);
    if (date?.startsWith(month)) {
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(e);
    }
  }
  for (let day = 1; day <= days; day++) {
    const date = month + '-' + pad(day),
      entries = grouped.get(date) || [],
      note = data.calendarNotes.find((n) => n.date === date),
      types = entryTypes.filter((t) => entries.some((e) => e.type === t));
    html += `<button type="button" class="calendar-day ${date === localDate() ? 'is-today' : ''}" data-calendar-day="${date}" aria-label="${shortDate(date)}, записей ${entries.length}${note ? ', ' + esc(note.title) : ''}"><strong>${day}</strong><span class="calendar-marks">${types.map((t) => ({ sugar: '●', food: '■', insulin: '▲', wellbeing: '✎' })[t]).join(' ')}</span><small>${entries.length || '—'}${note ? ' · ★' : ''}</small></button>`;
  }
  $('calendarGrid').innerHTML = html;
}
function renderCollections() {
  $('collectionList').innerHTML = data.collections.length
    ? data.collections
        .map(
          (c) =>
            `<article class="history-row"><h3>${esc(c.name)}</h3><p class="multiline">${esc(c.note)}</p><p class="hint">${c.refs.filter((r) => data[r.type].some((i) => i.id === r.id)).length} доступных записей из ${c.refs.length}</p><div class="button-row"><button class="secondary" type="button" data-open-collection="${c.id}">Открыть</button><button class="secondary" type="button" data-report-collection="${c.id}">Отчёт</button><button class="text-btn" type="button" data-delete-collection="${c.id}">Удалить подборку</button></div></article>`,
        )
        .join('')
    : '<p class="empty-state">Соберите связанные записи и добавьте свой комментарий.</p>';
}
const refKey = (r) => r.type + ':' + r.id;
function collectionChoices() {
  const query = $('collectionSearch').value.toLocaleLowerCase('ru'),
    entries = allEntries().filter((e) =>
      [entryDescription(e.type, e.item), e.item.note, e.datetime, shortDate(e.datetime?.slice(0, 10))]
        .join(' ')
        .toLocaleLowerCase('ru')
        .includes(query),
    );
  $('collectionChoices').innerHTML =
    entries
      .slice(0, 300)
      .map(
        (e) =>
          `<label class="check-label"><input type="checkbox" data-collection-ref="${refKey({ type: e.type, id: e.item.id })}" ${collectionSelected.has(refKey({ type: e.type, id: e.item.id })) ? 'checked' : ''} /><span><strong>${esc(entryDescription(e.type, e.item))}</strong><br><small>${esc(dateLabel(e.datetime))} · ${typeNames[e.type]}</small></span></label>`,
      )
      .join('') || '<p>Записи не найдены.</p>';
  $('collectionSelectedCount').textContent =
    `Выбрано: ${collectionSelected.size}. ${entries.length > 300 ? 'Показаны первые 300 результатов; уточните поиск.' : ''}`;
}
function openCollection(id = null) {
  const c = data.collections.find((c) => c.id === id);
  collectionEdit = id;
  collectionSelected = new Set((c?.refs || []).map(refKey));
  $('collectionName').value = c?.name || '';
  $('collectionNote').value = c?.note || '';
  $('collectionSearch').value = '';
  $('collectionReportBtn').classList.toggle('hidden', !c);
  collectionChoices();
  openModal('collectionModal');
}
function inReportCollection(e) {
  const c = data.collections.find((c) => c.id === currentReportCollection);
  return !currentReportCollection || !!c?.refs.some((r) => r.type === e.type && r.id === e.item.id);
}
function dishHistory(id, source) {
  const dish = (source === 'favorites' ? data.favorites : data.food).find((i) => i.id === id);
  if (!dish) return;
  const recipeId = source === 'favorites' ? dish.id : dish.recipeId,
    name = dish.name.toLocaleLowerCase('ru');
  const events = data.food
    .filter((i) =>
      recipeId
        ? i.recipeId === recipeId || (!i.recipeId && i.name.toLocaleLowerCase('ru') === name)
        : i.name.toLocaleLowerCase('ru') === name,
    )
    .slice()
    .sort((a, b) => String(b.datetime).localeCompare(String(a.datetime)));
  const versions = data.history
    .filter(
      (h) =>
        h.type === 'favorites' && (h.eventId === recipeId || h.before.name?.toLocaleLowerCase('ru') === name),
    )
    .slice()
    .reverse();
  $('dishHistoryTitle').textContent = dish.name;
  $('dishHistoryContent').innerHTML =
    `<h3>Текущий вариант</h3>${snapshotHTML(source === 'favorites' ? 'favorites' : 'food', dish)}<h3>Варианты рецепта</h3>${versions.map((h) => `<article class="history-row">${snapshotHTML('favorites', h.before)}<button class="secondary" type="button" data-repeat-version="${h.id}">Использовать этот вариант</button></article>`).join('') || '<p class="hint">Сохранённых изменений рецепта пока нет.</p>'}<h3>Когда готовили</h3>${
      events
        .slice(0, 100)
        .map(
          (i) =>
            `<article class="history-row">${snapshotHTML('food', i)}${photoButtons(i)}<button type="button" class="secondary" data-repeat="${i.id}">Повторить эту порцию</button></article>`,
        )
        .join('') || '<p class="hint">Приёмов пищи с этим блюдом пока нет.</p>'
    }<p class="hint">Показано до 100 последних записей. Старые записи без связи с шаблоном подобраны по названию.</p>`;
  openModal('dishHistoryModal');
}
