// Photo bytes are separately encrypted in IndexedDB; their random keys live inside the encrypted profile.
let photoDatabase = null;
function mediaDB() {
  if (!photoDatabase)
    photoDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open('DiabControl-photos-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('photos');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        photoDatabase = null;
        reject(new Error('Хранилище фотографий недоступно.'));
      };
    });
  return photoDatabase;
}
async function mediaOperation(mode, key, value) {
  const db = await mediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode === 'readonly' || mode === 'keys' ? 'readonly' : 'readwrite'),
      store = tx.objectStore('photos');
    const request =
      mode === 'keys'
        ? store.getAllKeys()
        : mode === 'delete'
          ? store.delete(key)
          : mode === 'readonly'
            ? store.get(key)
            : store.put(value, key);
    let result;
    request.onsuccess = () => (result = request.result);
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(new Error('Не удалось сохранить или прочитать фотографию.'));
  });
}
async function archiveDrafts() {
  await flushDrafts();
  const account = readVaults().accounts[session.name];
  if (account?.ciphertext !== session.record.ciphertext)
    throw new Error('Дневник изменён в другой вкладке. Войдите снова.');
  const result = {};
  for (const [type, record] of Object.entries(account.drafts || {}))
    result[type] = await decodeDraft(record, session.key, type);
  return result;
}
async function mediaTransaction(action, name = session?.name) {
  const owner = session;
  if (!name) throw new Error('Откройте дневник.');
  const perform = () => {
    if (session !== owner) throw new Error('Профиль закрыт.');
    return action();
  };
  if (navigator.locks?.request) return navigator.locks.request(`${STORE}:media:${name}`, perform);
  return perform();
}
async function cleanUnusedPhotos() {
  return mediaTransaction(pruneUnusedPhotos);
}
async function pruneUnusedPhotos() {
  const drafts = await archiveDrafts(),
    live = MediaReferences.collect(
      data,
      drafts,
      { photoIds: Object.values(pendingPhotos).flat() },
      lastDeletion?.item,
    );
  const next = clone(data),
    removed = Object.keys(next.media).filter((id) => !live.has(id));
  removed.forEach((id) => delete next.media[id]);
  // Commit metadata first: a failure must never delete a still-referenced file.
  if (removed.length) await persist(next);
  const keys = await mediaOperation('keys'),
    known = new Set(Object.keys(data.media));
  let files = 0;
  for (const key of keys) {
    let pair;
    try {
      pair = JSON.parse(key);
    } catch {
      continue;
    }
    if (
      Array.isArray(pair) &&
      pair[0] === session.name &&
      !known.has(pair[1]) &&
      (navigator.locks?.request || removed.includes(pair[1]))
    ) {
      await mediaOperation('delete', key);
      files++;
    }
  }
  clearPhotoURLs();
  renderImportHistory();
  return { removed: removed.length, files };
}
const mediaKey = (name, id) => JSON.stringify([name, id]);
async function photoBlob(id, owner = session, metadata = data.media) {
  const meta = metadata[id];
  if (!owner || !meta) throw new Error('Фотография не найдена.');
  const bytes = await mediaOperation('readonly', mediaKey(owner.name, id));
  if (!bytes) throw new Error('Фото отсутствует в этом браузере. Восстановите полную копию.');
  const key = await crypto.subtle.importKey('raw', from64(meta.key), 'AES-GCM', false, ['decrypt']);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: from64(meta.iv) }, key, bytes);
  } catch {
    throw new Error('Фотография повреждена.');
  }
  return new Blob([plain], { type: meta.mime });
}
async function photoURL(id) {
  const owner = session,
    epoch = photoEpoch,
    cacheKey = mediaKey(owner.name, id);
  if (!photoURLs.has(cacheKey))
    photoURLs.set(
      cacheKey,
      photoBlob(id).then((blob) => {
        if (session !== owner || photoEpoch !== epoch) throw new Error('Профиль закрыт.');
        return URL.createObjectURL(blob);
      }),
    );
  return photoURLs.get(cacheKey);
}
function hydratePhotos() {
  const jobs = [];
  for (const img of document.querySelectorAll('img[data-photo-id]'))
    if (!img.hasAttribute('src'))
      jobs.push(
        photoURL(img.dataset.photoId)
          .then(async (url) => {
            if (session && img.isConnected) {
              img.src = url;
              await img.decode().catch(() => {});
            }
          })
          .catch(() => {
            img.alt = 'Фото недоступно';
          }),
      );
  return Promise.all(jobs);
}
function clearPhotoURLs() {
  photoEpoch++;
  for (const promise of photoURLs.values()) promise.then((url) => URL.revokeObjectURL(url)).catch(() => {});
  photoURLs.clear();
  $('fullPhoto').removeAttribute('src');
  for (const img of document.querySelectorAll('img[data-photo-id]')) img.removeAttribute('src');
}
function photoButtons(item) {
  return (item.photoIds || []).length
    ? `<div class="photo-links">${item.photoIds.map((id, n) => `<button class="text-btn" type="button" data-open-photo="${id}">Фото ${n + 1}</button>`).join('')}</div>`
    : '';
}
function renderPhotoEditor(type) {
  const ids = pendingPhotos[type];
  $(type + 'PhotoCount').textContent = ids.length ? String(ids.length) : '';
  $(type + 'Photos').innerHTML = ids
    .map(
      (id) =>
        `<div class="photo-tile"><button type="button" class="photo-preview" data-open-photo="${id}" aria-label="Открыть фотографию"><img data-photo-id="${id}" alt="Фото из записи" /></button><button type="button" class="text-btn" data-remove-photo="${id}" data-photo-type="${type}">Убрать</button></div>`,
    )
    .join('');
  if (type === 'food')
    $('ocrPhoto').innerHTML = ids
      .map(
        (id, n) => `<option value="${id}">Фото ${n + 1}: ${esc(data.media[id]?.name || 'этикетка')}</option>`,
      )
      .join('');
  hydratePhotos();
}
async function uploadPhoto(type, file) {
  return mediaTransaction(() => storeUploadedPhoto(type, file));
}
async function storeUploadedPhoto(type, file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15000000)
    throw new Error('Выберите JPEG, PNG или WebP до 15 МБ.');
  if (pendingPhotos[type].length >= 4)
    throw new Error('В одной записи можно сохранить до четырёх фотографий.');
  if (Object.keys(data.media).length >= 200) await pruneUnusedPhotos();
  if (Object.keys(data.media).length >= 200)
    throw new Error(
      'Все 200 фотографий ещё используются. Удалите ненужные записи и их историю, затем очистите архив в настройках.',
    );
  const bitmap = await createImageBitmap(file),
    ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
    canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.86,
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Не удалось обработать фотографию.');
  while (blob.size > 450000 && quality > 0.35) {
    quality -= 0.12;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  }
  if (!blob || blob.size > 900000) throw new Error('Слишком подробное изображение. Выберите меньший снимок.');
  const keyBytes = crypto.getRandomValues(new Uint8Array(32)),
    iv = crypto.getRandomValues(new Uint8Array(12)),
    key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']),
    cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await blob.arrayBuffer()),
    id = uid(),
    next = clone(data);
  const fileKey = mediaKey(session.name, id);
  await mediaOperation('readwrite', fileKey, cipher);
  next.media[id] = {
    name: file.name.slice(0, 200),
    mime: 'image/jpeg',
    key: bytesTo64(keyBytes),
    iv: bytesTo64(iv),
    size: blob.size,
    createdAt: new Date().toISOString(),
  };
  try {
    await persist(next);
  } catch (error) {
    try {
      await mediaOperation('delete', fileKey);
    } catch {
      error.message += ' Остался неиспользуемый файл; его можно убрать очисткой архива.';
    }
    throw error;
  }
  pendingPhotos[type].push(id);
  renderPhotoEditor(type);
  await queueDraft(type);
  notice('Фото зашифровано и прикреплено к черновику.');
}
async function showPhoto(id) {
  const url = await photoURL(id);
  photoReturn = activeModal?.id || null;
  openModal('photoModal');
  $('fullPhoto').src = url;
}
function finishPhotoModal(closed, restore) {
  if (closed === 'photoModal') {
    const back = photoReturn;
    photoReturn = null;
    if (restore && back && session) openModal(back);
  }
}
async function inspectPhotoArchive() {
  const photos = {},
    missing = [];
  for (const [id, meta] of Object.entries(data.media)) {
    try {
      const bytes = await mediaOperation('readonly', mediaKey(session.name, id));
      if (!bytes) throw new Error('Файл отсутствует');
      const key = await crypto.subtle.importKey('raw', from64(meta.key), 'AES-GCM', false, ['decrypt']);
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: from64(meta.iv) }, key, bytes);
      photos[id] = bytesTo64(new Uint8Array(bytes));
    } catch (error) {
      missing.push({
        id,
        name: meta.name,
        reason: error.message === 'Файл отсутствует' ? 'Файл отсутствует' : 'Файл недоступен или повреждён',
      });
    }
  }
  return { photos, missing };
}
async function backupPhotos() {
  const archive = await inspectPhotoArchive();
  if (archive.missing.length)
    throw new Error(
      'Не удалось включить фото в полную копию. Откройте «Данные и доступ» → «Аварийная копия»: записи и доступные фотографии можно сохранить отдельно.',
    );
  return archive.photos;
}
let recoveryArchive = null;
async function prepareRecoveryBackup() {
  recoveryArchive = null;
  const drafts = await archiveDrafts(),
    archive = await inspectPhotoArchive(),
    missing = new Set(archive.missing.map((item) => item.id));
  const content = MediaReferences.remove(clone(data), missing);
  missing.forEach((id) => delete content.media[id]);
  content.recovery = { createdAt: new Date().toISOString(), missingPhotos: archive.missing };
  validateData(content);
  const record = await encrypt(content, session.key, session.salt, session.revision);
  record.drafts = {};
  for (const [type, draft] of Object.entries(drafts))
    record.drafts[type] = await encrypt(MediaReferences.remove(draft, missing), session.key, session.salt, 1);
  recoveryArchive = {
    format: 'DiabControl-encrypted-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    record,
    photos: archive.photos,
  };
  $('recoverySummary').textContent =
    `Записей: ${entryTypes.reduce((sum, type) => sum + content[type].length, 0)}. Доступных фотографий: ${Object.keys(archive.photos).length}. Недоступных: ${archive.missing.length}.`;
  $('recoveryMissing').innerHTML = archive.missing
    .map((item) => `<li>${esc(item.name)} — ${esc(item.reason)}</li>`)
    .join('');
  openModal('recoveryModal');
}
function downloadRecoveryBackup() {
  if (!recoveryArchive) return;
  download(
    `DiabControl-recovery-${localDate()}.json`,
    JSON.stringify(recoveryArchive, null, 2),
    'application/json',
  );
  closeModal();
  recoveryArchive = null;
  notice('Аварийная копия передана браузеру. Исходный дневник сохранён без изменений.');
}
async function verifyBackupPhotos(content, photos = {}) {
  if (!photos || typeof photos !== 'object' || Array.isArray(photos))
    throw new Error('Некорректный архив фотографий.');
  for (const [id, m] of Object.entries(content.media)) {
    if (typeof photos[id] !== 'string' || photos[id].length > 1300000)
      throw new Error('В копии отсутствует фотография.');
    const key = await crypto.subtle.importKey('raw', from64(m.key), 'AES-GCM', false, ['decrypt']);
    try {
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: from64(m.iv) }, key, from64(photos[id]));
    } catch {
      throw new Error('Повреждена фотография в копии.');
    }
  }
}
async function installBackupPhotos(name, content, photos, written) {
  for (const id of Object.keys(content.media)) {
    const key = mediaKey(name, id);
    await mediaOperation('readwrite', key, from64(photos[id]).buffer);
    written.push(key);
  }
}
async function recognizeLabel() {
  const id = $('ocrPhoto').value;
  if (!id) throw new Error('Сначала добавьте фотографию этикетки.');
  $('ocrStatus').textContent = 'Загружаем локальный движок…';
  const owner = session;
  let timer,
    expired = false;
  const work = async () => {
    if (!ocrWorker) {
      const assets = JSON.parse($('ocrResources').textContent);
      ocrWorkerURL = URL.createObjectURL(new Blob([assets.worker], { type: 'application/javascript' }));
      const worker = await Tesseract.createWorker(
        Object.entries(assets.langs).map(([code, encoded]) => ({ code, data: from64(encoded) })),
        1,
        {
          workerPath: ocrWorkerURL,
          workerBlobURL: false,
          cacheMethod: 'none',
          errorHandler: () => {},
          logger: (m) => {
            if (!expired && session === owner)
              $('ocrStatus').textContent =
                m.status === 'recognizing text'
                  ? `Распознавание: ${Math.round((m.progress || 0) * 100)}%`
                  : 'Подготовка распознавания…';
          },
        },
      );
      if (expired || session !== owner) {
        await worker.terminate();
        return;
      }
      ocrWorker = worker;
    }
    const { data: result } = await ocrWorker.recognize(await photoBlob(id));
    if (expired || session !== owner) return;
    $('ocrText').value = result.text.slice(0, 12000);
    const m = result.text.match(/(?:углевод[ыаов]*|carbohydrates?|carbs)[^\d\n]{0,30}(\d+(?:[.,]\d+)?)/i);
    $('ocrCarbs').value = m && Number(m[1].replace(',', '.')) <= 100 ? m[1].replace(',', '.') : '';
    $('ocrStatus').textContent = m
      ? 'Найдено возможное значение. Сверьте его с колонкой «на 100 г» и подтвердите.'
      : 'Текст распознан. Укажите углеводы из колонки «на 100 г» и подтвердите.';
  };
  try {
    await Promise.race([
      work(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(
            new Error(
              'Распознавание заняло слишком много времени. Попробуйте фото с более крупным текстом или введите значение вручную.',
            ),
          );
        }, 60000);
      }),
    ]);
  } catch (error) {
    expired = true;
    if (ocrWorker) {
      ocrWorker.terminate().catch(() => {});
      ocrWorker = null;
    }
    if (ocrWorkerURL) {
      URL.revokeObjectURL(ocrWorkerURL);
      ocrWorkerURL = null;
    }
    if (session === owner)
      $('ocrStatus').textContent = 'Не удалось распознать этикетку. Значения можно ввести вручную.';
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
const csvFields = [
  ['datetime', 'Дата и время'],
  ['time', 'Время отдельно'],
  ['type', 'Тип'],
  ['value', 'Значение'],
  ['unit', 'Единицы'],
  ['name', 'Продукт или препарат'],
  ['weight', 'Вес, г'],
  ['carbs', 'Углеводы, г'],
  ['carbsPer100', 'Углеводы на 100 г'],
  ['xe', 'ХЕ'],
  ['tag', 'Контекст'],
  ['note', 'Заметка'],
];
