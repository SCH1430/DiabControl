function parseQuickText(text) {
  let clean = text.trim();
  if (/(?:не\s+введ|планирую|нужно\s+ввести)/i.test(clean))
    throw new Error('Для записи инсулина укажите уже введённую дозу.');
  if (!clean) throw new Error('Напишите, что нужно записать.');
  let date = localDate(),
    time = localTime();
  const dm = clean.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  if (dm) {
    date = `${dm[3]}-${dm[2]}-${dm[1]}`;
    clean = clean.replace(dm[0], '');
  }
  const tm = clean.match(/\b(\d{1,2}):(\d{2})\b/);
  if (tm) {
    time = pad(Number(tm[1])) + ':' + tm[2];
    clean = clean.replace(tm[0], '');
  }
  const datetime = validTime(date + 'T' + time),
    tag = /после\s+(?:еды|обеда|завтрака|ужина)/i.test(clean)
      ? 'after'
      : /до\s+еды/i.test(clean)
        ? 'before'
        : '';
  let m = clean.match(/(?:глюкоза|сахар)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  if (m) {
    const v = Number(m[1].replace(',', '.')),
      units = /мг\s*\/\s*дл|mg\s*\/\s*dl/i.test(clean)
        ? 'mgdl'
        : /ммоль|mmol/i.test(clean)
          ? 'mmol'
          : data.profile.unit;
    number(v, 'Глюкоза', units === 'mgdl' ? 1.8 : 0.1, units === 'mgdl' ? 1080 : 60);
    return { type: 'sugar', item: { value: units === 'mgdl' ? v / 18 : v, date, time, note: text, tag } };
  }
  m = clean.match(/(?:введ[её]н\s+)?инсулин\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:ед|units)(?=\s|[,;]|$)/i);
  if (m)
    return {
      type: 'insulin',
      item: {
        dose: number(m[1].replace(',', '.'), 'Доза', 0, 10000),
        unit: 'units',
        kind: 'unknown',
        name: clean
          .slice(m.index + m[0].length)
          .replace(/^[\s,;]+/, '')
          .slice(0, 120),
        datetime,
        note: text,
        tag,
      },
    };
  m = clean.match(
    /еда\s*[:=]?\s*(.+?),\s*(\d+(?:[.,]\d+)?)\s*г\s*[,;]\s*углеводы\s*(\d+(?:[.,]\d+)?)\s*г?\s*на\s*100\s*г/i,
  );
  if (m) {
    const weight = number(m[2].replace(',', '.'), 'Вес', 0.1, 100000),
      carbsPer100 = number(m[3].replace(',', '.'), 'Углеводы', 0, 100);
    return {
      type: 'food',
      item: {
        name: m[1].trim(),
        weight,
        carbsPer100,
        carbs: (weight * carbsPer100) / 100,
        type: 'unknown',
        source: 'manual',
        portions: [],
        ingredients: [],
        recipeYield: null,
        carbsPerXEAtEntry: data.profile.carbsPerXE,
        datetime,
        note: text,
        tag,
      },
    };
  }
  m = clean.match(/(активность|самочувствие)\s*[:=]?\s*(.+)/i);
  if (m)
    return {
      type: 'wellbeing',
      item: {
        title: m[2].trim().slice(0, 200),
        kind: m[1].toLowerCase() === 'активность' ? 'activity' : 'wellbeing',
        datetime,
        note: text,
        tag: '',
      },
    };
  throw new Error('Не удалось однозначно разобрать запись. Используйте один из примеров под полем.');
}
function applyQuick() {
  if (!quickCandidate) return;
  const { type, item } = quickCandidate;
  openEntry(type, type === 'food' ? item : null, false);
  if (type === 'sugar') {
    $('sugarValueInput').value = converted(item.value);
    $('sugarDateInput').value = item.date;
    $('sugarTimeInput').value = item.time;
  } else $(type + 'Time').value = item.datetime;
  if (type === 'insulin') {
    $('insulinDose').value = item.dose;
    $('insulinName').value = item.name;
    $('insulinKind').value = item.kind;
  }
  if (type === 'wellbeing') {
    $('wellbeingTitle').value = item.title;
    $('wellbeingKind').value = item.kind;
  }
  $(type + 'Note').value = item.note;
  if (type !== 'wellbeing') $(type + 'Tag').value = item.tag;
  $(type + 'Details').open = true;
  updateTimeHint(type);
  queueDraft(type);
}
