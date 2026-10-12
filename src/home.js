// Everyday shortcuts reuse encrypted entries, drafts, photographs and report notes.
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
function motionEnabled() {
  return !motionPreference.matches && !document.documentElement.classList.contains('reduce-motion');
}
motionPreference.addEventListener('change', () => {
  if (!motionEnabled()) document.getAnimations().forEach((animation) => animation.cancel());
});
const entranceAnimations = new WeakMap();
function stopEntrance(element) {
  if (!element) return;
  const animation = entranceAnimations.get(element);
  if (animation) {
    entranceAnimations.delete(element);
    animation.cancel();
  }
}
function animateEntrance(element, modal = false) {
  if (!element) return;
  stopEntrance(element);
  if (!motionEnabled()) return;
  // Keep the route's controls in a stable hit-testing layer through inert/focus
  // changes. Only its non-interactive title fades; modals never shift their fields.
  const target = modal ? element : element.querySelector('h1');
  if (!target || typeof target.animate !== 'function') return;
  const animation = target.animate(
    [{ opacity: 0.55 }, { opacity: 1 }],
    { duration: modal ? 220 : 160, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
  entranceAnimations.set(element, animation);
  animation.finished.then(() => {
    if (entranceAnimations.get(element) === animation) stopEntrance(element);
  }, () => {
    if (entranceAnimations.get(element) === animation) entranceAnimations.delete(element);
  });
}
function highlightSavedEntry(id) {
  document.querySelectorAll('[data-record]').forEach((row) => {
    if (row.dataset.record !== id) return;
    row.classList.add('just-saved');
    setTimeout(() => row.classList.remove('just-saved'), 1000);
  });
}
function recordContext(type, item) {
  return [tagNames[item.tag], type === 'wellbeing' ? wellbeingContexts[item.context] : ''].filter(Boolean).join(' · ');
}
function countLabel(count, forms) {
  const form = new Intl.PluralRules('ru').select(count);
  return `${count} ${forms[form === 'one' ? 0 : form === 'few' ? 1 : 2]}`;
}
function renderHomeContent() {
  if (!session) return;
  const now = localDate(),
    [from] = rangeDays(7),
    entries = allEntries().filter((entry) => inRange(entry.datetime, from, now)),
    daily = new Map();
  for (const entry of entries) {
    const date = entry.datetime.slice(0, 10);
    if (!daily.has(date)) daily.set(date, { total: 0, sugar: 0 });
    daily.get(date).total++;
    if (entry.type === 'sugar') daily.get(date).sugar++;
  }
  $('homeWeekPeriod').textContent = `${shortDate(from)} — ${shortDate(now)}`;
  $('homeWeekDays').innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(from + 'T12:00');
    date.setDate(date.getDate() + index);
    const key = localDate(date), count = daily.get(key)?.total || 0;
    return `<button type="button" class="week-day ${count ? 'has-entries' : ''}" data-home-day="${key}" ${key === now ? 'aria-current="date"' : ''} aria-label="${esc(shortDate(key))}: ${countLabel(count, ['запись', 'записи', 'записей'])}"><span>${esc(new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date))}</span><strong>${date.getDate()}</strong><span class="week-dot" aria-hidden="true"></span></button>`;
  }).join('');
  const measurementDays = [...daily.values()].filter((day) => day.sugar > 0).length;
  $('homeWeekSummary').innerHTML = `<div><strong>${entries.length}</strong><span>записей за 7 дней</span></div><div><strong>${daily.size} из 7</strong><span>дней с записями</span></div><p>${measurementCount(entries.filter((entry) => entry.type === 'sugar').length)} · ${countLabel(7 - measurementDays, ['день', 'дня', 'дней'])} без измерений</p>`;
  const recent = entries.find((entry) => entry.type === 'wellbeing' && entry.datetime.slice(0, 10) === now);
  $('homeWellbeingPreview').innerHTML = recent
    ? `<span class="hint">${esc(localTime(new Date(recent.datetime)))} · ${esc(wellbeingContexts[recent.item.context] || 'Наблюдение')}</span><h3>${esc(recent.item.title)}</h3>${recent.item.note ? `<p class="home-note-text">${esc(recent.item.note)}</p>` : ''}<div class="button-row"><button type="button" class="text-btn" data-edit="wellbeing" data-id="${recent.item.id}">Открыть запись</button><button type="button" class="text-btn" data-home-topic="${recent.item.id}">К темам приёма</button></div>`
    : '<p class="hint">Пока нет наблюдений за сегодня.</p>';
  renderHomeDishes();
  renderVisitPreview();
  hydratePhotos();
}
function renderHomeDishes() {
  const favorites = data.favorites.slice().reverse().slice(0, 3);
  if (!favorites.length) {
    $('homeDishList').innerHTML = '<div class="home-empty"><p>Сохраните блюдо, чтобы быстро повторить порцию.</p><button type="button" class="secondary" id="homeCreateDish">＋ Первое блюдо</button></div>';
    return;
  }
  $('homeDishList').innerHTML = favorites.map((item) => {
    const portions = [...new Set([item.weight, ...(item.portions || [])])].slice(0, 3),
      photo = item.photoIds?.[0];
    return `<article class="home-dish"><div class="home-dish-top">${photo ? `<button type="button" class="home-dish-photo" data-open-photo="${photo}" aria-label="Открыть фото блюда ${esc(item.name)}"><img data-photo-id="${photo}" alt="${esc(item.name)}" /></button>` : `<span class="home-dish-symbol" aria-hidden="true">${uiIcon('food')}</span>`}<div><h3>${esc(item.name)}</h3><p class="hint">${fmt(item.carbsPer100)} г углеводов / 100 г · ${sourceNames[item.source]}</p></div></div><div class="home-dish-portions" role="group" aria-label="Добавить порцию блюда ${esc(item.name)}">${portions.map((weight) => `<button type="button" class="secondary" data-home-dish="${item.id}" data-weight="${weight}" aria-label="Добавить ${esc(item.name)}, ${fmt(weight)} г">＋ ${fmt(weight)} г</button>`).join('')}</div></article>`;
  }).join('');
}
function renderVisitPreview() {
  if (!session) return;
  const notes = data.reportNotes;
  $('homeVisitPreview').innerHTML = notes.questions || notes.topics
    ? `${notes.questions ? `<h3>Мои вопросы</h3><p class="home-note-text">${esc(notes.questions)}</p>` : ''}${notes.topics ? `<h3>Что хочу обсудить</h3><p class="home-note-text">${esc(notes.topics)}</p>` : ''}`
    : '<p class="hint">Добавьте вопросы врачу в отчёт.</p>';
  const p = data.preferences;
  $('homeBackupStatus').textContent = `${p.lastExportAt ? 'Последняя выгрузка: ' + new Date(p.lastExportAt).toLocaleDateString('ru-RU') : 'Резервная копия ещё не выгружалась'}. Изменений: ${p.changesSinceExport}.`;
}
async function openWellbeingPreset(context) {
  if (!own(wellbeingContexts, context)) return;
  await flushDrafts();
  if (!session) return;
  const hasDraft = !!session.record.drafts?.wellbeing;
  openEntry('wellbeing');
  if (hasDraft) {
    notice('Есть незавершённая запись. Продолжите её или удалите черновик перед новой отметкой.');
    return;
  }
  $('wellbeingContext').value = context;
  $('wellbeingKind').value = ['walk', 'exercise'].includes(context) ? 'activity' : 'wellbeing';
  $('wellbeingTitle').value = wellbeingContexts[context];
  $('wellbeingNote').focus();
  await queueDraft('wellbeing');
}
async function addObservationToReport(id) {
  const item = data.wellbeing.find((entry) => entry.id === id);
  if (!item) return;
  const text = `${dateLabel(item.datetime)} · ${item.title}${item.note ? '\n' + item.note : ''}`;
  if (data.reportNotes.topics.includes(text)) {
    notice('Это наблюдение уже есть в темах приёма.');
    return;
  }
  const topics = [data.reportNotes.topics, text].filter(Boolean).join('\n\n');
  if (topics.length > 1500) throw new Error('В темах приёма мало места. Откройте «Мои вопросы» и сократите текст.');
  const next = clone(data);
  next.reportNotes.topics = topics;
  await persist(next);
  render();
  notice('Наблюдение добавлено к темам приёма.');
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || !session || busy) return;
  if (button.dataset.wellbeingPreset) run(() => openWellbeingPreset(button.dataset.wellbeingPreset));
  if (button.dataset.homeTopic) run(() => addObservationToReport(button.dataset.homeTopic));
  if (button.dataset.homeDay) {
    $('diaryPeriod').value = 'date';
    $('diaryDate').value = button.dataset.homeDay;
    $('diaryType').value = 'all';
    $('diarySearch').value = '';
    diaryLimit = 50;
    setDiaryView('list');
    navigate('diary');
  }
  if (button.dataset.homeDish) run(async () => {
    await flushDrafts();
    if (!session) return;
    const item = data.favorites.find((entry) => entry.id === button.dataset.homeDish);
    if (!item) return;
    if (session.record.drafts?.food) {
      openEntry('food');
      notice('Есть незавершённая запись еды. Продолжите её или удалите черновик.');
      return;
    }
    openEntry('food', item, false);
    $('foodWeight').value = number(button.dataset.weight, 'Порция', 0.1, 100000);
    liveFood();
    await queueDraft('food');
  });
  if (button.id === 'homeCreateDish') editFavorite();
});
$('homeQuestionsBtn').onclick = () => {
  if (!session || busy) return;
  reportOpen();
  $('reportQuestions').closest('details').open = true;
  $('reportQuestions').focus();
};
$('homeReportBtn').onclick = () => { if (session && !busy) reportOpen(); };
$('homeWeekStats').onclick = () => {
  if (!session || busy) return;
  [$('statsFrom').value, $('statsTo').value] = rangeDays(7);
  document.querySelectorAll('[data-chart-period]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.chartPeriod === '7')));
  navigate('stats');
};
