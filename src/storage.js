// Browser storage adapter; never silently replaces unreadable data.
const VaultStorage = (() => {
  const STORE = 'diab_vaults_v2';
  function readStore(key, fallback) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch {
      throw new Error('Браузер запретил доступ к хранилищу. Разрешите локальное хранение данных.');
    }
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('Хранилище повреждено. Оно не перезаписано. Восстановите дневник из резервной копии.');
    }
  }
  function readVaults() {
    const db = readStore(STORE, { version: 2, accounts: {} });
    if (db?.version !== 2 || !db.accounts || typeof db.accounts !== 'object' || Array.isArray(db.accounts))
      throw new Error('Неизвестный формат хранилища. Оно не перезаписано.');
    return db;
  }
  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      throw new Error(
        'Не удалось сохранить: хранилище недоступно или заполнено. Изменение не применено. Сохраните резервную копию.',
      );
    }
  }
  function removeStore(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      throw new Error('Не удалось удалить старые незашифрованные данные.');
    }
  }
  return { readStore, readVaults, writeStore, removeStore };
})();
if (typeof module !== 'undefined') module.exports = VaultStorage;
