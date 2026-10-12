function captureDraft(type) {
  const fields = {};
  for (const el of $(type + 'Form').querySelectorAll('input[id],select[id],textarea[id]'))
    if (el.type !== 'file' && !el.id.startsWith('ocr'))
      fields[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  return {
    version: 1,
    type,
    fields,
    photoIds: [...pendingPhotos[type]],
    recipeId: type === 'food' ? pendingRecipeId : null,
    editing: editing[type],
    templateEdit: type === 'food' ? templateEdit : null,
    ingredients: type === 'food' ? ingredientValues(false) : [],
    savedAt: new Date().toISOString(),
    unit: data.profile.unit,
  };
}
async function decodeDraft(record, key, type) {
  validateRecord(record);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: from64(record.iv) },
    key,
    from64(record.ciphertext),
  );
  const d = JSON.parse(new TextDecoder().decode(plain));
  if (
    d.version !== 1 ||
    d.type !== type ||
    !d.fields ||
    typeof d.fields !== 'object' ||
    Array.isArray(d.fields) ||
    !['mmol', 'mgdl'].includes(d.unit) ||
    Object.values(d.fields).some(
      (v) => !['string', 'boolean'].includes(typeof v) || (typeof v === 'string' && v.length > 4000),
    ) ||
    (d.editing !== null && typeof d.editing !== 'string') ||
    !Array.isArray(d.ingredients) ||
    d.ingredients.length > 30
  )
    throw new Error('Не удалось прочитать черновик.');
  return d;
}
function scheduleDraft(type) {
  pendingDrafts.set(type, { owner: session, snapshot: captureDraft(type) });
  $(type + 'DraftStatus').textContent = 'Сохраняем черновик…';
  clearTimeout(draftTimer);
  draftTimer = setTimeout(flushDrafts, 250);
}
function flushDrafts() {
  clearTimeout(draftTimer);
  draftTimer = null;
  for (const [type, pending] of [...pendingDrafts]) queueDraft(type, false, pending.snapshot, pending.owner);
  return draftQueue;
}
function queueDraft(type, remove = false, providedSnapshot, providedOwner = session) {
  pendingDrafts.delete(type);
  if (!providedOwner) return draftQueue;
  const owner = providedOwner,
    snapshot = remove ? null : providedSnapshot || captureDraft(type);
  draftWrites++;
  if (!remove) {
    $(type + 'DraftStatus').textContent = 'Сохраняем черновик…';
  }
  draftQueue = draftQueue
    .then(async () => {
      const record = snapshot ? await encrypt(snapshot, owner.key, owner.salt, 1) : null;
      await storeTransaction(() => {
        const db = readVaults(),
          account = db.accounts[owner.name];
        if (!account || account.salt !== owner.salt || account.ciphertext !== owner.record.ciphertext)
          throw new Error('Доступ или дневник изменился. Черновик не сохранён.');
        const drafts = { ...(account.drafts || {}) };
        if (record) drafts[type] = record;
        else delete drafts[type];
        account.drafts = drafts;
        writeStore(STORE, db);
        if (session === owner) {
          session.record.drafts = drafts;
          renderDraftNudge();
        }
      });
      if (session === owner && !remove) {
        $(type + 'DraftStatus').classList.remove('draft-error');
        $(type + 'DraftStatus').textContent = 'Черновик зашифрован и сохранён. В дневник ещё не добавлен.';
      }
    })
    .catch((e) => {
      if (session === owner) {
        $(type + 'DraftStatus').textContent = 'Черновик не сохранён: ' + e.message;
        $(type + 'DraftStatus').classList.add('draft-error');
      }
    })
    .finally(() => {
      draftWrites--;
    });
  return draftQueue;
}
function offerDraft(type) {
  const record = session?.record.drafts?.[type];
  if (!record) return;
  $(type + 'Draft').innerHTML =
    '<p>Есть незавершённая запись. Можно продолжить её или заполнить новую.</p><div class="button-row"><button type="button" class="secondary" data-resume-draft="' +
    type +
    '">Продолжить черновик</button><button type="button" class="text-btn" data-discard-draft="' +
    type +
    '">Удалить черновик</button></div>';
  $(type + 'Draft').classList.remove('hidden');
}
async function resumeDraft(type) {
  await flushDrafts();
  const record = session?.record.drafts?.[type];
  if (!record) return;
  const d = await decodeDraft(record, session.key, type);
  if (d.editing && !data[type].some((i) => i.id === d.editing))
    throw new Error('Исходная запись удалена. Удалите этот черновик и создайте новую запись.');
  for (const el of $(type + 'Form').querySelectorAll('input[id],select[id],textarea[id]'))
    if (own(d.fields, el.id)) {
      if (el.type === 'checkbox') el.checked = d.fields[el.id] === true;
      else el.value = d.fields[el.id];
    }
  pendingPhotos[type] = (d.photoIds || []).filter((id) => own(data.media, id));
  if (type === 'food') pendingRecipeId = d.recipeId || null;
  renderPhotoEditor(type);
  editing[type] = d.editing;
  if (type === 'sugar' && d.unit !== data.profile.unit && $('sugarValueInput').value !== '')
    $('sugarValueInput').value = Number(
      (Number($('sugarValueInput').value) * (data.profile.unit === 'mgdl' ? 18 : 1 / 18)).toFixed(6),
    );
  if (type === 'food') {
    templateEdit = d.templateEdit;
    if (templateEdit && templateEdit !== 'new' && !data.favorites.some((i) => i.id === templateEdit))
      throw new Error('Шаблон удалён. Создайте новое блюдо.');
    $('ingredientRows').innerHTML = '';
    d.ingredients.forEach((i) => addIngredient(i));
    toggleRecipe(false);
    renderPortions();
    liveFood();
    $('addFoodBtn').classList.toggle('hidden', !!templateEdit);
    $('foodDetails').classList.toggle('hidden', !!templateEdit);
    $('saveFavoriteBtn').textContent = templateEdit ? 'Сохранить шаблон' : '☆ Сохранить в избранное';
  }
  $(type + 'Details').open = true;
  updateTimeHint(type);
  $(type + 'Draft').classList.add('hidden');
  $(type + 'ModalTitle').textContent = d.editing
    ? 'Изменить запись'
    : d.templateEdit
      ? 'Черновик шаблона'
      : 'Продолжить запись';
  $(type + 'DraftStatus').textContent = 'Черновик восстановлен. Проверьте дату и время перед сохранением.';
}
async function rekeyDrafts(key, salt) {
  await flushDrafts();
  const result = {};
  const drafts = readVaults().accounts[session.name]?.drafts || {};
  for (const type of entryTypes)
    if (drafts[type])
      result[type] = await encrypt(await decodeDraft(drafts[type], session.key, type), key, salt, 1);
  return result;
}
