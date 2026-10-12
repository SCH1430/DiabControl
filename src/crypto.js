// AES-GCM / PBKDF2 adapter. Validation of the diary schema belongs to validation.js.
const VaultCrypto = (() => {
  const ITERATIONS = 600000;
  const bytesTo64 = (bytes) => {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };
  const from64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function derive(password, salt) {
    if (!globalThis.crypto?.subtle)
      throw new Error(
        'Шифрование недоступно. Откройте файл в современном браузере локально или через HTTPS.',
      );
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }
  async function encrypt(content, key, salt, revision) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(content)),
    );
    return {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: ITERATIONS,
      salt,
      iv: bytesTo64(iv),
      ciphertext: bytesTo64(new Uint8Array(ciphertext)),
      revision,
      updatedAt: new Date().toISOString(),
    };
  }
  async function decrypt(record, password) {
    const key = await derive(password, from64(record.salt));
    let plain;
    try {
      plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: from64(record.iv) },
        key,
        from64(record.ciphertext),
      );
    } catch {
      throw new Error('Неверный пароль или повреждённая копия.');
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plain));
    } catch {
      throw new Error('Некорректные данные внутри копии.');
    }
    return { key, content: parsed };
  }
  return { bytesTo64, from64, derive, encrypt, decrypt };
})();
if (typeof module !== 'undefined') module.exports = VaultCrypto;
