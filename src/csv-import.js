function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0],
    delimiter = [';', ',', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = [];
  let row = [],
    value = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (quoted || value === '') quoted = !quoted;
      else throw new Error('Кавычка внутри неэкранированного поля CSV.');
    } else if (!quoted && c === delimiter) {
      row.push(value);
      value = '';
    } else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(value);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      value = '';
    } else value += c;
  }
  if (quoted) throw new Error('В CSV не закрыты кавычки.');
  row.push(value);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2 || rows.length > 1001) throw new Error('Нужны заголовок и от 1 до 1000 строк.');
  if (rows[0].length > 50 || rows.some((r) => r.length !== rows[0].length))
    throw new Error('Количество столбцов в строках отличается от заголовка.');
  return rows;
}
function guessColumn(key, headers) {
  const patterns = {
    datetime: /^(дата и время|дата|datetime|timestamp|date)$/i,
    time: /^(время|time)$/i,
    type: /^(тип|событие|type)$/i,
    value: /^(значение|value|glucose|глюкоза|dose|доза)$/i,
    unit: /^(единицы|unit|units)$/i,
    name: /^(продукт или препарат|название|name|food|препарат|продукт|title)$/i,
    weight: /^(вес,? г|вес|weight)$/i,
    carbs: /^(углеводы,? г|углеводы|carbs)$/i,
    carbsPer100: /^(углеводы на 100 г|carbsper100)$/i,
    xe: /^(хе|xe)$/i,
    tag: /^(контекст|tag)$/i,
    note: /^(заметка|note|notes)$/i,
  };
  return headers.findIndex((h) => patterns[key].test(h.trim()));
}
async function loadCSV(file) {
  if (!file || file.size > 5000000) throw new Error('Выберите CSV до 5 МБ.');
  const rows = parseCSV(await file.text());
  csvSource = { name: file.name, headers: rows[0], rows: rows.slice(1) };
  csvPreview = null;
  $('csvImportPreview').innerHTML = '';
  $('csvConfirmImport').classList.add('hidden');
  $('csvMapping').innerHTML = csvFields
    .map(
      ([key, label]) =>
        `<div><label for="csvMap-${key}">${label}</label><select id="csvMap-${key}"><option value="">Нет столбца</option>${rows[0].map((h, i) => `<option value="${i}" ${i === guessColumn(key, rows[0]) ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></div>`,
    )
    .join('');
  $('csvMappingForm').classList.remove('hidden');
  $('csvSkipInvalidLabel').classList.add('hidden');
}
function csvDatetime(raw, time) {
  raw = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) raw += 'T' + (time.trim() || '');
  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{2}:\d{2}))?$/);
  if (m) raw = `${m[3]}-${m[2]}-${m[1]}T${m[4] || time.trim()}`;
  return validTime(raw.replace(' ', 'T'));
}
function fingerprint(type, item) {
  return JSON.stringify([
    type,
    stamp(item, type),
    type === 'sugar' ? item.value : type === 'insulin' ? item.dose : null,
    item.unit || '',
    item.name || item.title || '',
    item.weight ?? null,
    item.carbs ?? null,
    item.note || '',
    item.tag || '',
    item.context || '',
  ]);
}
function parseCSVRow(row) {
  const get = (key) => {
      const i = $('csvMap-' + key).value;
      return i === '' ? '' : row[Number(i)].trim();
    },
    n = (key, label, min, max) => number(get(key).replace(',', '.'), label, min, max),
    rawType = get('type').toLowerCase(),
    map = {
      sugar: 'sugar',
      glucose: 'sugar',
      глюкоза: 'sugar',
      сахар: 'sugar',
      food: 'food',
      еда: 'food',
      питание: 'food',
      insulin: 'insulin',
      инсулин: 'insulin',
      wellbeing: 'wellbeing',
      самочувствие: 'wellbeing',
      активность: 'wellbeing',
      'самочувствие и активность': 'wellbeing',
    };
  const type = rawType ? map[rawType] : $('csvDefaultType').value;
  if (!type) throw new Error('Неизвестный тип записи.');
  const datetime = csvDatetime(get('datetime'), get('time')),
    note = get('note'),
    contexts = get('tag').split('·').map((value) => value.trim().toLowerCase()),
    tag =
      Object.entries(tagNames).find(
        ([k, v]) => contexts.includes(k) || contexts.includes(v.toLowerCase()),
      )?.[0] || '';
  if (note.length > 1000) throw new Error('Заметка длиннее 1000 символов.');
  const base = { id: uid(), createdAt: new Date().toISOString(), note, tag, photoIds: [] };
  let item;
  if (type === 'sugar') {
    const units = (get('unit') || $('csvDefaultUnit').value).replace(/\s/g, '').toLowerCase();
    if (!['mmol', 'mmol/l', 'ммоль/л', 'mgdl', 'mg/dl', 'мг/дл'].includes(units))
      throw new Error('Укажите единицы глюкозы.');
    const mg = ['mgdl', 'mg/dl', 'мг/дл'].includes(units);
    item = {
      ...base,
      value: n('value', 'Глюкоза', mg ? 1.8 : 0.1, mg ? 1080 : 60) / (mg ? 18 : 1),
      date: datetime.slice(0, 10),
      time: datetime.slice(11),
    };
  }
  if (type === 'insulin') {
    if (!/^(ед|units|u)$/i.test(get('unit')))
      throw new Error('Для инсулина нужны явные единицы ЕД; ХЕ не пересчитываются.');
    item = {
      ...base,
      dose: n('value', 'Доза', 0, 10000),
      unit: 'units',
      kind: 'unknown',
      name: get('name').slice(0, 120),
      datetime,
    };
  }
  if (type === 'food') {
    const weight = n('weight', 'Вес', 0.1, 100000),
      carbs = get('carbs')
        ? n('carbs', 'Углеводы', 0, 100000)
        : (weight * n('carbsPer100', 'Углеводы на 100 г', 0, 100)) / 100;
    if (carbs > weight) throw new Error('Углеводы превышают вес порции.');
    if (!get('name')) throw new Error('Укажите название блюда.');
    item = {
      ...base,
      name: get('name').slice(0, 200),
      weight,
      carbs,
      carbsPer100: (carbs / weight) * 100,
      type: 'unknown',
      source: 'manual',
      portions: [],
      ingredients: [],
      recipeYield: null,
      carbsPerXEAtEntry: null,
      datetime,
    };
  }
  if (type === 'wellbeing') {
    if (!get('name') && !note) throw new Error('Нужно описание самочувствия или активности.');
    item = {
      ...base,
      title: (get('name') || note).slice(0, 200),
      kind: rawType === 'активность' || tag === 'activity' ? 'activity' : 'wellbeing',
      context: Object.entries(wellbeingContexts).find(([key, label]) => contexts.slice(1).includes(key) || contexts.slice(1).includes(label.toLowerCase()))?.[0] || '',
      datetime,
    };
  }
  return { type, item };
}
function previewCSV() {
  if (!csvSource) throw new Error('Выберите CSV.');
  const seen = new Set(allEntries().map((e) => fingerprint(e.type, e.item))),
    entries = [],
    errors = [];
  let duplicates = 0;
  csvSource.rows.forEach((row, index) => {
    try {
      const e = parseCSVRow(row),
        hash = fingerprint(e.type, e.item);
      if (seen.has(hash)) {
        duplicates++;
        return;
      }
      seen.add(hash);
      entries.push(e);
    } catch (error) {
      errors.push({ row: index + 2, error: error.message });
    }
  });
  csvPreview = { entries, errors, duplicates, name: csvSource.name };
  $('csvImportPreview').innerHTML =
    `<div class="notice"><strong>К импорту: ${entries.length}</strong><p>Точных повторов пропущено: ${duplicates}. Строк с ошибками: ${errors.length}.</p></div>${
      errors.length
        ? `<div class="notice">${errors
            .slice(0, 30)
            .map((e) => `<p>Строка ${e.row}: ${esc(e.error)}</p>`)
            .join('')}${errors.length > 30 ? '<p>Показаны первые 30 ошибок.</p>' : ''}</div>`
        : ''
    }<div class="table-scroll"><table><thead><tr><th>Время</th><th>Тип</th><th>Запись</th></tr></thead><tbody>${entries
      .slice(0, 20)
      .map(
        (e) =>
          `<tr><td>${esc(dateLabel(stamp(e.item, e.type)))}</td><td>${typeNames[e.type]}</td><td>${esc(entryDescription(e.type, e.item))}</td></tr>`,
      )
      .join(
        '',
      )}</tbody></table></div><p class="hint">Показаны первые 20 корректных строк. Импорт можно отменить целиком, пока его записи не изменены.</p>`;
  $('csvSkipInvalidLabel').classList.toggle('hidden', !errors.length);
  $('csvSkipInvalid').checked = false;
  $('csvConfirmImport').classList.toggle('hidden', !entries.length);
}
async function confirmCSV() {
  if (!csvPreview?.entries.length) throw new Error('Сначала проверьте файл.');
  if (csvPreview.errors.length && !$('csvSkipInvalid').checked)
    throw new Error('Исправьте ошибки или явно выберите пропуск ошибочных строк.');
  const batch = {
      id: uid(),
      name: csvPreview.name,
      at: new Date().toISOString(),
      entries: [],
      undoneAt: null,
    },
    next = clone(data);
  for (const e of csvPreview.entries) {
    const item = { ...e.item, importBatchId: batch.id };
    next[e.type].push(item);
    batch.entries.push({
      type: e.type,
      id: item.id,
      fingerprint: fingerprint(e.type, item),
      snapshot: JSON.stringify(item),
    });
  }
  next.imports.push(batch);
  await persist(next);
  csvPreview = null;
  closeModal();
  render();
  notice(`Импортировано записей: ${batch.entries.length}.`);
}
async function undoImport(id) {
  const batch = data.imports.find((b) => b.id === id);
  if (!batch || batch.undoneAt) return;
  for (const e of batch.entries) {
    const current = data[e.type].find((i) => i.id === e.id);
    if (
      !current ||
      (e.snapshot
        ? JSON.stringify(current) !== e.snapshot
        : fingerprint(e.type, current) !== e.fingerprint) ||
      (current.photoIds || []).length
    )
      throw new Error(
        'Записи этого импорта изменены или удалены. Отменяйте их по отдельности, чтобы сохранить изменения.',
      );
  }
  const next = clone(data);
  for (const e of batch.entries) next[e.type] = next[e.type].filter((i) => i.id !== e.id);
  next.imports.find((b) => b.id === id).undoneAt = new Date().toISOString();
  await persist(next);
  render();
  notice('Импорт отменён. Записи доступны в корзине.');
}
function renderImportHistory() {
  $('importHistory').innerHTML = data.imports.length
    ? '<h3>Последние импорты</h3>' +
      data.imports
        .slice(-5)
        .reverse()
        .map(
          (b) =>
            `<p>${esc(b.name)} · ${b.entries.length} записей ${b.undoneAt ? '· отменён' : `<button class="text-btn" type="button" data-undo-import="${b.id}">Отменить импорт</button>`}</p>`,
        )
        .join('')
    : '';
  $('mediaStorageInfo').textContent =
    `Фотографий в профиле: ${Object.keys(data.media).length}. Полная зашифрованная копия включает фотографии.`;
}
