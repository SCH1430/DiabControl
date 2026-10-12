function number(value, label, min, max, optional = false) {
  if (String(value).trim() === '') {
    if (optional) return null;
    throw new Error(`Заполните поле «${label}».`);
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new Error(`«${label}»: допустимо от ${min} до ${max}.`);
  return n;
}
function validTime(value, label = 'Дата и время', allowFuture = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error(`${label}: укажите дату и время.`);
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    `${localDate(date)}T${localTime(date)}` !== value ||
    Number(value.slice(0, 4)) < 1900
  )
    throw new Error(`${label}: некорректная дата.`);
  if (!allowFuture && date.getTime() > Date.now())
    throw new Error(`${label}: нельзя записывать будущее время.`);
  return value;
}
const stamp = (item, type) => (type === 'sugar' ? `${item.date}T${item.time}` : item.datetime);
function validateRecord(r, allowDrafts = true) {
  if (
    !r ||
    r.algorithm !== 'AES-GCM' ||
    r.kdf !== 'PBKDF2-SHA256' ||
    r.iterations !== ITERATIONS ||
    !Number.isSafeInteger(r.revision) ||
    r.revision < 1 ||
    typeof r.salt !== 'string' ||
    typeof r.iv !== 'string' ||
    typeof r.ciphertext !== 'string' ||
    r.ciphertext.length > 14000000
  )
    throw new Error('Неподдерживаемый формат зашифрованной копии.');
  try {
    if (from64(r.salt).length !== 16 || from64(r.iv).length !== 12 || from64(r.ciphertext).length < 16)
      throw 0;
  } catch {
    throw new Error('Повреждена зашифрованная копия.');
  }
  if (r.drafts !== undefined) {
    if (
      !allowDrafts ||
      !r.drafts ||
      typeof r.drafts !== 'object' ||
      Array.isArray(r.drafts) ||
      Object.keys(r.drafts).some((k) => !entryTypes.includes(k))
    )
      throw new Error('Некорректные черновики в копии.');
    for (const record of Object.values(r.drafts)) {
      validateRecord(record, false);
      if (record.ciphertext.length > 100000) throw new Error('Слишком большой черновик.');
    }
  }
  return r;
}
function validateData(d) {
  if (!d || d.version !== 2 || !d.profile) throw new Error('Неподдерживаемая версия дневника.');
  if (d.favorites === undefined) d.favorites = [];
  if (d.preferences === undefined) d.preferences = { ...preferences(), onboardingDone: true };
  normalizeExtras(d);
  normalizeExplore(d);
  const pref = d.preferences;
  if (
    !pref ||
    ![0, 1, 5, 15, 30].includes(pref.lockMinutes) ||
    typeof pref.onboardingDone !== 'boolean' ||
    !Number.isSafeInteger(pref.changesSinceExport) ||
    pref.changesSinceExport < 0 ||
    (pref.lastExportAt !== null &&
      (typeof pref.lastExportAt !== 'string' || !Number.isFinite(Date.parse(pref.lastExportAt))))
  )
    throw new Error('Некорректные настройки доступа.');
  if (!Array.isArray(d.favorites) || d.favorites.length > 10000) throw new Error('Некорректные шаблоны.');
  const p = d.profile;
  // Existing encrypted v2 profiles predate the optional correction plan.
  for (const key of ['correctionTarget', 'correctionFactor', 'correctionStep', 'correctionMax'])
    if (p[key] === undefined) p[key] = null;
  if (p.correctionConfirmed === undefined) p.correctionConfirmed = false;
  if (
    !['1', '2'].includes(p.diabType) ||
    !['mmol', 'mgdl'].includes(p.unit) ||
    !['none', 'medtronic', 'omnipod', 'tslim', 'other'].includes(p.pump)
  )
    throw new Error('Некорректные настройки профиля.');
  for (const [key, val] of Object.entries(defaults())) {
    if (typeof val === 'string' && (typeof p[key] !== 'string' || p[key].length > 4000))
      throw new Error('Некорректный текст в профиле.');
  }
  for (const key of ['targetLow', 'targetHigh']) {
    if (typeof p[key] !== 'number') throw new Error('Некорректный диапазон.');
    number(p[key], key, 1, 40);
  }
  if (p.targetLow >= p.targetHigh) throw new Error('Нижняя граница должна быть меньше верхней.');
  for (const [key, min, max] of [
    ['carbsPerXE', 1, 100],
    ['insulinPerXE', 0, 1000],
    ['correctionTarget', 4, 10],
    ['correctionFactor', 0.01, 100],
    ['correctionStep', 0.01, 10],
    ['correctionMax', 0.01, 100],
  ]) {
    if (p[key] !== null) {
      if (typeof p[key] !== 'number') throw new Error('Некорректный коэффициент.');
      number(p[key], key, min, max);
    }
  }
  if (
    typeof p.doseConfirmed !== 'boolean' ||
    (p.doseConfirmed && (p.carbsPerXE === null || p.insulinPerXE === null))
  )
    throw new Error('Не заполнены подтверждённые коэффициенты.');
  if (typeof p.correctionConfirmed !== 'boolean')
    throw new Error('Некорректное подтверждение плана коррекции.');
  if (p.correctionConfirmed) {
    const issue = EmergencyCorrection.planIssue(p);
    if (issue) throw new Error(issue);
  }
  if (
    !Array.isArray(p.phones) ||
    p.phones.length > 20 ||
    p.phones.some((t) => typeof t !== 'string' || t.length > 80)
  )
    throw new Error('Некорректные контакты.');
  const ids = new Set();
  for (const f of d.favorites) {
    if (
      !f ||
      typeof f.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(f.id) ||
      ids.has(f.id) ||
      typeof f.name !== 'string' ||
      !f.name.trim() ||
      f.name.length > 400 ||
      !['fast', 'slow', 'unknown'].includes(f.type) ||
      typeof f.weight !== 'number' ||
      typeof f.carbsPer100 !== 'number'
    )
      throw new Error('Некорректное избранное блюдо.');
    validatePhotoRefs(f, d);
    validateFoodExtras(f);
    number(f.weight, 'Порция', 0.1, 100000);
    number(f.carbsPer100, 'Углеводы', 0, 100);
    ids.add(f.id);
  }
  for (const type of entryTypes) {
    if (!Array.isArray(d[type]) || d[type].length > 100000) throw new Error('Некорректный журнал.');
    for (const item of d[type]) {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || ids.has(item.id))
        throw new Error('Некорректный идентификатор записи.');
      ids.add(item.id);
      validatePhotoRefs(item, d);
      if (
        item.createdAt !== undefined &&
        (typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)))
      )
        throw new Error('Некорректное время создания записи.');
      if (item.note === undefined) item.note = '';
      if (item.tag === undefined) item.tag = '';
      if (
        typeof item.note !== 'string' ||
        item.note.length > 1000 ||
        !(item.tag === '' || own(tagNames, item.tag))
      )
        throw new Error('Некорректная заметка записи.');
      if (type === 'sugar') {
        if (typeof item.value !== 'number') throw new Error('Некорректная глюкоза.');
        number(item.value, 'Глюкоза', 0.1, 60);
        validTime(stamp(item, type), 'Измерение', true);
      } else {
        if (item.datetime !== null) validTime(item.datetime, 'Запись', true);
        if (type === 'wellbeing') {
          item.context ??= '';
          if (
            !(item.context === '' || own(wellbeingContexts, item.context)) ||
            !['wellbeing', 'activity'].includes(item.kind) ||
            typeof item.title !== 'string' ||
            !item.title.trim() ||
            item.title.length > 200 ||
            item.datetime === null
          )
            throw new Error('Некорректная запись самочувствия.');
        } else if (type === 'food') {
          validateFoodExtras(item);
          if (
            typeof item.name !== 'string' ||
            item.name.length > 400 ||
            !['fast', 'slow', 'unknown'].includes(item.type)
          )
            throw new Error('Некорректная запись питания.');
          for (const [k, min, max] of [
            ['weight', 0, 100000],
            ['carbs', 0, 100000],
            ['carbsPer100', 0, 100],
          ]) {
            if (typeof item[k] !== 'number') throw new Error('Некорректное питание.');
            number(item[k], k, min, max);
          }
          if (item.carbsPerXEAtEntry !== null) {
            if (typeof item.carbsPerXEAtEntry !== 'number') throw new Error('Некорректная ХЕ.');
            number(item.carbsPerXEAtEntry, 'ХЕ', 1, 100);
          }
        } else {
          if (
            typeof item.dose !== 'number' ||
            !['units', 'legacy-xe'].includes(item.unit) ||
            !['bolus', 'basal', 'unknown'].includes(item.kind) ||
            typeof item.name !== 'string' ||
            item.name.length > 200
          )
            throw new Error('Некорректная запись инсулина.');
          number(item.dose, 'Доза', 0, 10000);
        }
      }
    }
  }
  // Apply the same record validation to restorable snapshots, with no nested history.
  const archived = [
    ...d.history.flatMap((h) => [[h.type, h.before], ...(h.after ? [[h.type, h.after]] : [])]),
    ...d.trash.map((t) => [t.type, t.item]),
  ];
  if (archived.length) {
    const shell = {
      ...d,
      history: [],
      trash: [],
      collections: [],
      calendarNotes: [],
      imports: [],
      dayComparisons: [],
    };
    for (const [type, item] of archived) {
      const candidate = { ...shell, favorites: [], sugar: [], food: [], insulin: [], wellbeing: [] };
      candidate[type] = [item];
      validateData(candidate);
    }
  }
  return d;
}
function migrate(old) {
  const d = emptyData(),
    p = old.profile || {};
  d.profile = { ...defaults(), ...p, doseConfirmed: false, correctionConfirmed: false };
  d.profile.unit = ['mmol', 'mgdl'].includes(p.unit) ? p.unit : 'mmol';
  d.profile.carbsPerXE =
    Number.isFinite(p.carbsPerXE) && p.carbsPerXE >= 1 && p.carbsPerXE <= 100 ? p.carbsPerXE : null;
  d.profile.insulinPerXE =
    Number.isFinite(p.insulinPerXE) && p.insulinPerXE >= 0 && p.insulinPerXE <= 1000 ? p.insulinPerXE : null;
  if (!(p.targetLow >= 1 && p.targetHigh <= 40 && p.targetLow < p.targetHigh)) {
    d.profile.targetLow = 4;
    d.profile.targetHigh = 7;
  }
  d.legacySettings = clone(p);
  d.preferences.onboardingDone = true;
  d.sugar = (old.sugar || []).map((s) => ({ ...s, id: uid(), time: s.time || '00:00' }));
  d.food = (old.food || []).map((f) => ({
    ...f,
    id: uid(),
    datetime: f.datetime || null,
    weight: Number(f.weight) || 0,
    carbsPer100: Number.isFinite(f.carbsPer100) ? f.carbsPer100 : f.weight ? (f.carbs / f.weight) * 100 : 0,
    type: f.type === 'короткие' ? 'fast' : f.type === 'длинные' ? 'slow' : 'unknown',
    carbsPerXEAtEntry: d.profile.carbsPerXE,
  }));
  d.insulin = (old.insulin || []).map((i) => ({
    ...i,
    id: uid(),
    datetime: i.datetime || null,
    unit: 'legacy-xe',
    kind: 'unknown',
    name: '',
  }));
  return validateData(d);
}

function normalizeExtras(d) {
  d.wellbeing ??= [];
  d.reportNotes ??= { questions: '', topics: '' };
  if (!Array.isArray(d.wellbeing) || d.wellbeing.length > 100000)
    throw new Error('Некорректный журнал самочувствия.');
  if (
    !d.reportNotes ||
    ['questions', 'topics'].some(
      (k) => typeof d.reportNotes[k] !== 'string' || d.reportNotes[k].length > 1500,
    )
  )
    throw new Error('Некорректные вопросы к приёму.');
  const p = d.preferences;
  p.theme ??= 'light';
  p.largeText ??= false;
  p.highContrast ??= false;
  p.motion ??= true;
  p.home ??= { measurement: true, summary: true, events: true };
  for (const key of ['wellbeing', 'dishes', 'week', 'visit']) p.home[key] ??= true;
  if (
    !['light', 'dark', 'system'].includes(p.theme) ||
    typeof p.largeText !== 'boolean' ||
    typeof p.highContrast !== 'boolean' ||
    typeof p.motion !== 'boolean' ||
    !p.home ||
    homeSections.some((k) => typeof p.home[k] !== 'boolean')
  )
    throw new Error('Некорректные настройки оформления.');
}
function validateFoodExtras(item) {
  item.source ??= 'unknown';
  item.portions ??= [];
  item.ingredients ??= [];
  item.recipeYield ??= null;
  if (
    !own(sourceNames, item.source) ||
    !Array.isArray(item.portions) ||
    item.portions.length > 12 ||
    !Array.isArray(item.ingredients) ||
    item.ingredients.length > 30
  )
    throw new Error('Некорректный состав блюда.');
  item.portions.forEach((w) => {
    if (typeof w !== 'number') throw new Error('Некорректная порция.');
    number(w, 'Порция', 0.1, 100000);
  });
  for (const i of item.ingredients) {
    if (
      !i ||
      typeof i.name !== 'string' ||
      !i.name.trim() ||
      i.name.length > 200 ||
      !['manual', 'label'].includes(i.source) ||
      typeof i.weight !== 'number' ||
      typeof i.carbsPer100 !== 'number'
    )
      throw new Error('Некорректный ингредиент.');
    number(i.weight, 'Вес ингредиента', 0.1, 100000);
    number(i.carbsPer100, 'Углеводы ингредиента', 0, 100);
  }
  if (item.ingredients.length) {
    if (item.source !== 'recipe' || typeof item.recipeYield !== 'number')
      throw new Error('Укажите вес готового блюда.');
    number(item.recipeYield, 'Вес готового блюда', 0.1, 100000);
    const c =
      (item.ingredients.reduce((sum, i) => sum + (i.weight * i.carbsPer100) / 100, 0) / item.recipeYield) *
      100;
    if (c > 100 || Math.abs(c - item.carbsPer100) > 0.000001)
      throw new Error('Состав и углеводы блюда не совпадают.');
  } else if (item.source === 'recipe') throw new Error('В блюде нет ингредиентов.');
}
