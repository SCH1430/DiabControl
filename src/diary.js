function ageLabel(datetime) {
  const mins = Math.floor((Date.now() - new Date(datetime).getTime()) / 60000);
  if (mins < 0) return 'Будущая дата — проверьте запись';
  if (mins < 1) return 'Только что';
  if (mins < 60) return `${mins} мин назад`;
  if (mins < 1440) return `${Math.floor(mins / 60)} ч назад`;
  return dateLabel(datetime);
}
function rowHTML({ type, item, datetime }, compact = false) {
  const detail =
    type === 'sugar'
      ? `${sugarText(item.value)} ${unit()}`
      : type === 'food'
        ? esc(item.name)
        : type === 'wellbeing'
          ? esc(item.title)
          : `${fmt(item.dose)} ${item.unit === 'legacy-xe' ? 'ХЕ · уточните единицы' : 'ЕД'}`;
  const meta =
    type === 'sugar'
      ? item.value < data.profile.targetLow
        ? 'Ниже вашего диапазона'
        : item.value > data.profile.targetHigh
          ? 'Выше вашего диапазона'
          : 'В вашем диапазоне'
      : type === 'food'
        ? `${fmt(item.weight)} г · ${fmt(item.carbs)} г углеводов${item.carbsPerXEAtEntry ? ` · ${fmt(item.carbs / item.carbsPerXEAtEntry)} ХЕ` : ''}`
        : type === 'wellbeing'
              ? wellbeingContexts[item.context] || (item.kind === 'activity'
            ? 'Активность'
                : 'Самочувствие')
          : esc(item.name || 'Препарат не указан');
  const symbol = uiIcon(type);
  return `<article class="timeline-row" data-record="${item.id}" data-record-type="${type}"><time class="timeline-time">${datetime ? datetime.slice(11) : '—'}</time><span class="timeline-mark ${type}" aria-label="${typeNames[type]}">${symbol}</span><details class="record-details"><summary><span class="record-chevron" aria-hidden="true">›</span><div class="record-title">${detail}</div><p class="record-meta">${meta}</p>${item.tag ? `<span class="tag">${tagNames[item.tag]}</span>` : ''}${item.note ? '<span class="tag">Заметка</span>' : ''}${item.photoIds?.length ? `<span class="tag">Фото: ${item.photoIds.length}</span>` : ''}<span class="sr-only"> — раскрыть подробности</span></summary><p class="record-meta">${esc(dateLabel(datetime))} · ${typeNames[type]}</p>${item.note ? `<p class="record-note">${esc(item.note)}</p>` : ''}${photoButtons(item)}</details><details class="entry-menu"><summary aria-label="Действия с записью">⋯</summary><div><button type="button" data-edit="${type}" data-id="${item.id}">Изменить</button>${type === 'food' ? `<button type="button" data-repeat="${item.id}">Повторить</button><button type="button" data-favorite-record="${item.id}">В избранное</button>` : ''}<button type="button" data-history="${type}" data-id="${item.id}">История изменений</button><button type="button" data-delete="${type}" data-id="${item.id}">Удалить</button></div></details></article>`;
}
function timelineHTML(entries, group = true) {
  if (!entries.length)
    return `<div class="empty-state"><span class="empty-state-icon">${uiIcon('sugar')}</span><strong>Здесь появятся ваши записи</strong>Начните с измерения, еды или введённой дозы.<div class="button-row"><button type="button" class="secondary" data-add="sugar">Добавить измерение</button><button type="button" class="text-btn" data-add="wellbeing">Добавить заметку</button></div></div>`;
  let day = null,
    html = '';
  for (const entry of entries) {
    const date = entry.datetime?.slice(0, 10) || '';
    if (group && date !== day) {
      html += `<div class="timeline-day">${date ? shortDate(date) : 'Без даты'}</div>`;
      day = date;
    }
    html += rowHTML(entry);
  }
  return html;
}
function renderToday() {
  const now = localDate();
  $('todayDate').dataset.date = now;
  const entries = allEntries().filter(
    (e) => e.datetime?.slice(0, 10) === now && new Date(e.datetime) <= new Date(),
  );
  $('todayDate').textContent = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const last = data.sugar
    .slice()
    .reverse()
    .filter((i) => new Date(stamp(i, 'sugar')) <= new Date())
    .sort(
      (a, b) =>
        stamp(b, 'sugar').localeCompare(stamp(a, 'sugar')) ||
        String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
    )[0];
  $('lastSugarValue').innerHTML = last ? `${sugarText(last.value)}<small>${unit()}</small>` : '—';
  renderHomeGlucoseRange(last);
  $('lastSugarTime').dataset.datetime = last ? stamp(last, 'sugar') : '';
  $('lastSugarTime').textContent = last
    ? `${ageLabel(stamp(last, 'sugar'))} · ${dateLabel(stamp(last, 'sugar'))}`
    : 'Первое измерение — начало вашей истории';
  $('lastSugarState').textContent = last
    ? last.value < data.profile.targetLow
      ? 'Ниже диапазона'
      : last.value > data.profile.targetHigh
        ? 'Выше диапазона'
        : 'В диапазоне'
    : 'Нет записей';
  $('todayCounts').innerHTML = ['sugar', 'food', 'insulin']
    .map(
      (t) =>
        `<div><strong>${entries.filter((e) => e.type === t).length}</strong><small>${{ sugar: 'измерений', food: 'приёмов пищи', insulin: 'записей инсулина' }[t]}</small></div>`,
    )
    .join('');
  $('todayTimeline').innerHTML = timelineHTML(entries.slice(0, 5), false);
  const pref = data.preferences,
    nudge = pref.changesSinceExport >= 10;
  $('backupNudge').classList.toggle('hidden', !nudge);
  $('backupNudgeText').textContent = `Изменений после последней выгрузки: ${pref.changesSinceExport}.`;
  renderHomeExtras(last);
}
function refreshClock() {
  if ($('todayDate').dataset.date !== localDate()) {
    renderToday();
    return;
  }
  const value = $('lastSugarTime').dataset.datetime;
  if (value) $('lastSugarTime').textContent = `${ageLabel(value)} · ${dateLabel(value)}`;
}
function renderDiary() {
  const period = $('diaryPeriod').value;
  let entries = allEntries();
  if (period === 'today' || period === 'date') {
    const date = period === 'today' ? localDate() : $('diaryDate').value;
    entries = entries.filter((e) => e.datetime?.slice(0, 10) === date);
  }
  if (period === '7' || period === '30') {
    const [from, to] = rangeDays(Number(period));
    entries = entries.filter((e) => inRange(e.datetime, from, to));
  }
  if ($('diaryType').value !== 'all') entries = entries.filter((e) => e.type === $('diaryType').value);
  const query = $('diarySearch').value.trim().toLocaleLowerCase('ru');
  if (query)
    entries = entries.filter((e) =>
      [e.item.name, e.item.title, e.item.note, tagNames[e.item.tag], wellbeingContexts[e.item.context], typeNames[e.type]]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('ru')
        .includes(query),
    );
  $('diaryResultCount').textContent = `Найдено записей: ${entries.length}`;
  $('diaryFilterSummary').textContent =
    'Фильтры · ' +
    $('diaryPeriod').selectedOptions[0].textContent +
    ' · ' +
    $('diaryType').selectedOptions[0].textContent;
  $('diaryDateWrap').classList.toggle('hidden', period !== 'date');
  $('diaryTimeline').innerHTML = entries.length
    ? timelineHTML(entries.slice(0, diaryLimit))
    : query
      ? '<div class="empty-state"><strong>По этому запросу записей нет</strong>Измените текст или период поиска.</div>'
      : timelineHTML([]);
  $('moreDiary').classList.toggle('hidden', entries.length <= diaryLimit);
  $('undoBtn').classList.toggle('hidden', !lastDeletion);
}
function renderLibrary() {
  const query = $('foodSearch').value.trim().toLocaleLowerCase('ru'),
    seen = new Set();
  const items =
    foodTab === 'favorites'
      ? data.favorites
      : data.food
          .slice()
          .reverse()
          .sort((a, b) => String(b.datetime || '').localeCompare(String(a.datetime || '')))
          .filter((i) => {
            const key = i.name.toLowerCase() + '|' + i.carbsPer100;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
  document
    .querySelectorAll('[data-food-tab]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.foodTab === foodTab)));
  const result = items.filter((i) => i.name.toLocaleLowerCase('ru').includes(query));
  $('foodLibrary').innerHTML = result.length
    ? result
        .map(
          (i) =>
            `<article class="food-tile"><div>${i.photoIds?.[0] ? `<img class="food-tile-photo" data-photo-id="${i.photoIds[0]}" alt="${esc(i.name)}" />` : ''}<strong>${esc(i.name)}</strong><p>Порция ${fmt(i.weight)} г · <strong>${fmt((i.weight * i.carbsPer100) / 100)} г углеводов</strong><br><span class="hint">${sourceNames[i.source]}${i.ingredients?.length ? ' · ' + i.ingredients.length + ' ингредиентов' : ''}${i.portions?.length ? ' · порции ' + i.portions.map((w) => fmt(w) + ' г').join(', ') : ''}</span></p></div><div class="button-row"><button type="button" class="text-btn" data-dish-history="${i.id}" data-source="${foodTab}">История блюда</button><button type="button" class="secondary" data-use-food="${i.id}" data-source="${foodTab}">Добавить</button><details class="entry-menu"><summary aria-label="Действия с блюдом">⋯</summary><div>${foodTab === 'favorites' ? `<button type="button" data-edit-favorite="${i.id}">Изменить шаблон</button><button type="button" data-delete="favorites" data-id="${i.id}">Убрать из избранного</button>` : `<button type="button" data-favorite-record="${i.id}">В избранное</button>`}</div></details></div></article>`,
        )
        .join('')
    : `<div class="empty-state"><span class="empty-state-icon">${uiIcon('food')}</span><strong>${query ? 'Ничего не найдено' : foodTab === 'favorites' ? 'Любимые блюда всегда рядом' : 'Пока нет недавних блюд'}</strong>${query ? 'Такого блюда пока нет. Создать шаблон?' : 'Сохраните блюдо, чтобы в следующий раз изменить только порцию.'}<button type="button" class="secondary" data-create-food>Создать шаблон</button></div>`;
  hydratePhotos();
}
