function username(value) {
  const n = value.trim();
  if (!n || n.length > 80 || ['__proto__', 'constructor', 'prototype'].includes(n))
    throw new Error('Укажите другое имя профиля (1–80 символов).');
  return n;
}
function cleanupLegacy(name) {
  const old = readStore(LEGACY, {});
  if (own(old, name)) {
    delete old[name];
    if (Object.keys(old).length) writeStore(LEGACY, old);
    else removeStore(LEGACY);
  }
  removeStore('diab_session');
}
async function storeTransaction(action) {
  if (navigator.locks?.request) return navigator.locks.request(STORE, action);
  return action();
}
async function createAccount(name, password, content) {
  validateData(content);
  const salt = bytesTo64(crypto.getRandomValues(new Uint8Array(16))),
    key = await derive(password, from64(salt));
  const record = await encrypt(content, key, salt, 1);
  await storeTransaction(() => {
    const db = readVaults();
    if (own(db.accounts, name)) throw new Error('Профиль с таким именем уже существует.');
    Object.defineProperty(db.accounts, name, {
      value: record,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    writeStore(STORE, db);
  });
  return { name, key, salt, revision: 1, record };
}
async function persist(next, dirty = true) {
  if (!session) throw new Error('Откройте дневник.');
  if (dirty) next.preferences.changesSinceExport++;
  trackChanges(next);
  validateData(next);
  const revision = session.revision + 1,
    record = await encrypt(next, session.key, session.salt, revision);
  await storeTransaction(() => {
    const db = readVaults();
    if (
      db.accounts[session.name]?.revision !== session.revision ||
      db.accounts[session.name]?.ciphertext !== session.record.ciphertext
    )
      throw new Error('Дневник изменён в другой вкладке. Закройте его и войдите снова перед изменением.');
    record.drafts = db.accounts[session.name].drafts || {};
    db.accounts[session.name] = record;
    writeStore(STORE, db);
  });
  session.revision = revision;
  session.record = record;
  data = next;
  $('saveStatus').textContent = `Сохранено в этом браузере · ${localTime()}`;
}
