function makeReport() {
  const [from, to] = validRange($('reportFrom').value, $('reportTo').value),
    entries = allEntries()
      .filter((e) => inRange(e.datetime, from, to) && inReportCollection(e))
      .reverse()
      .map((e) => ({
        ...e,
        item: { ...e.item, note: reportExcludedNotes.has(e.item.id) ? '' : e.item.note },
      })),
    measurements = entries.filter((e) => e.type === 'sugar').map((e) => e.item);
  reportSnapshot = { from, to, entries: clone(entries), unit: unit() };
  reportNoteChoices();
  const rows = entries
    .map(({ type, item, datetime }) => {
      const value =
        type === 'sugar'
          ? `${sugarText(item.value)} ${unit()}`
          : type === 'food'
            ? `${fmt(item.weight)} г; ${fmt(item.carbs)} г углеводов${item.carbsPerXEAtEntry ? `; ${fmt(item.carbs / item.carbsPerXEAtEntry)} ХЕ` : ''}`
            : type === 'wellbeing'
              ? item.kind === 'activity'
                ? 'Активность'
                : 'Самочувствие'
              : `${fmt(item.dose)} ${item.unit === 'legacy-xe' ? 'ХЕ (единицы не уточнены)' : 'ЕД'}`;
      return `<tr><td>${esc(dateLabel(datetime))}</td><td>${typeNames[type]}</td><td>${esc(value)}</td><td>${esc(type === 'food' ? item.name : type === 'insulin' ? item.name : type === 'wellbeing' ? item.title : '')}${recordContext(type, item) ? `<br>${esc(recordContext(type, item))}` : ''}${item.note ? `<br>${esc(item.note).replace(/\n/g, '<br>')}` : ''}${$('reportIncludePhotos').checked ? `<div class="report-photos">${(item.photoIds || []).map((id) => `<img data-photo-id="${id}" alt="Фото из записи" />`).join('')}</div>` : ''}</td></tr>`;
    })
    .join('');
  const undated = allEntries().filter((e) => !e.datetime).length;
  $('reportPreview').innerHTML =
    `<article class="report-sheet"><section class="report-overview"><p class="eyebrow">DiabControl · дневник</p>${currentReportCollection ? `<h3>${esc(data.collections.find((c) => c.id === currentReportCollection)?.name || 'Подборка')}</h3><p class="multiline">${esc(data.collections.find((c) => c.id === currentReportCollection)?.note || '')}</p>` : ''}<h2>Отчёт за ${shortDate(from)} — ${shortDate(to)}</h2><p>${esc(session.name)} · тип ${data.profile.diabType} · глюкоза ${unit()}</p><p class="hint">Сформирован ${esc(new Date().toLocaleString('ru-RU'))}. Записей: ${entries.length}. Целевой диапазон: ${sugarText(data.profile.targetLow)}–${sugarText(data.profile.targetHigh)} ${unit()}.</p><div class="stats-grid">${statsHTML(measurements)}</div><div id="reportChart" class="local-chart"></div><p class="hint">□ Приём пищи · △ Запись инсулина</p><p class="hint">Показаны отдельные измерения. Это не данные непрерывного мониторинга. ${undated ? `Записи без даты (${undated}) в отчёт не включены.` : ''}</p>${$('reportQuestions').value.trim() ? `<h3>Вопросы к приёму</h3><p class="multiline">${esc($('reportQuestions').value.trim())}</p>` : ''}${$('reportTopics').value.trim() ? `<h3>Что хочу обсудить</h3><p class="multiline">${esc($('reportTopics').value.trim())}</p>` : ''}</section><section class="report-chronology"><h3>Хронология</h3><div class="table-scroll"><table><thead><tr><th>Дата и время</th><th>Событие</th><th>Значение</th><th>Название и заметки</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Нет записей за выбранный период.</td></tr>'}</tbody></table></div><p class="hint">Записи введённого инсулина отражают введённые пользователем данные. Активный инсулин и рекомендуемые дозы не рассчитываются.</p></section></article>`;
  renderChart('reportChart', measurements, false);
  return hydratePhotos();
}
function reportOpen(collectionId = null) {
  $('reportIncludePhotos').checked = false;
  currentReportCollection = collectionId;
  reportExcludedNotes.clear();
  $('reportQuestions').value = data.reportNotes.questions;
  $('reportTopics').value = data.reportNotes.topics;
  $('reportNotesStatus').textContent = '';
  [$('reportFrom').value, $('reportTo').value] =
    currentPage === 'stats' ? [$('statsFrom').value, $('statsTo').value] : rangeDays(7);
  if (collectionId) {
    const c = data.collections.find((c) => c.id === collectionId),
      dates = allEntries()
        .filter(inReportCollection)
        .map((e) => e.datetime?.slice(0, 10))
        .filter(Boolean)
        .sort();
    if (dates.length) {
      $('reportFrom').value = dates[0];
      $('reportTo').value = dates.at(-1);
    }
    $('reportCollectionBanner').textContent = c ? c.name + ' · ' + c.note : '';
  }
  $('reportCollectionBanner').classList.toggle('hidden', !collectionId);
  openModal('reportModal');
  makeReport();
}
function csvCell(value) {
  let s = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function exportCSV() {
  makeReport();
  const rows = [
    [
      'Дата и время',
      'Тип',
      'Значение',
      'Единицы',
      'Продукт или препарат',
      'Вес, г',
      'Углеводы, г',
      'ХЕ',
      'Контекст',
      'Заметка',
    ],
  ];
  for (const { type, item, datetime } of reportSnapshot.entries) {
    rows.push([
      datetime,
      typeNames[type],
      type === 'sugar' ? sugarText(item.value) : type === 'insulin' ? item.dose : '',
      type === 'sugar'
        ? unit()
        : type === 'insulin'
          ? item.unit === 'legacy-xe'
            ? 'ХЕ — единицы не уточнены'
            : 'ЕД'
          : '',
      item.name || item.title || '',
      type === 'food' ? item.weight : '',
      type === 'food' ? item.carbs : '',
      type === 'food' && item.carbsPerXEAtEntry ? fmt(item.carbs / item.carbsPerXEAtEntry) : '',
      recordContext(type, item),
      item.note,
    ]);
  }
  download(
    `DiabControl-${reportSnapshot.from}-${reportSnapshot.to}.csv`,
    '\uFEFF' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n'),
    'text/csv;charset=utf-8',
  );
  notice('CSV передан браузеру для скачивания.');
}

function reportNoteChoices() {
  const from = $('reportFrom').value,
    to = $('reportTo').value,
    entries = allEntries().filter(
      (e) => inRange(e.datetime, from, to) && inReportCollection(e) && e.item.note,
    );
  $('reportNoteChoices').innerHTML = entries.length
    ? entries
        .map(
          (e) =>
            `<label class="check-label note-choice"><input type="checkbox" data-report-note="${e.item.id}" ${reportExcludedNotes.has(e.item.id) ? '' : 'checked'} /><span><strong>${esc(dateLabel(e.datetime))} · ${typeNames[e.type]}</strong><br>${esc(e.item.note)}</span></label>`,
        )
        .join('')
    : '<p class="hint">В выбранном периоде нет заметок.</p>';
}
