const test = require('node:test');
const assert = require('node:assert/strict');
const references = require('../src/media-references.js');
const vault = require('../src/crypto.js');

test('photo cleanup preserves references in records, recipes, history, trash and drafts', () => {
  const profile = {
    sugar: [{ photoIds: ['shared'] }],
    favorites: [{ photoIds: ['recipe', 'shared'] }],
    history: [{ before: { photoIds: ['old'] }, after: { photoIds: ['new'] } }],
    trash: [{ item: { photoIds: ['deleted'] } }],
    media: { unlinked: { name: 'unused.jpg' } },
  };
  assert.deepEqual(
    [...references.collect(profile, { food: { photoIds: ['draft'] } })].sort(),
    ['shared', 'recipe', 'old', 'new', 'deleted', 'draft'].sort(),
  );
});

test('recovery removes only missing photo references and preserves the full record structure', () => {
  const original = {
    sugar: [{ id: 'missing', value: 6.2, note: 'keep', photoIds: ['good', 'missing'] }],
    history: [{ before: { photoIds: ['missing'] } }],
    drafts: { food: { photoIds: ['good', 'missing'] } },
  };
  const recovered = references.remove(structuredClone(original), new Set(['missing']));
  assert.deepEqual(recovered.sugar[0], { id: 'missing', value: 6.2, note: 'keep', photoIds: ['good'] });
  assert.deepEqual(recovered.history[0].before.photoIds, []);
  assert.deepEqual(recovered.drafts.food.photoIds, ['good']);
  assert.equal(original.sugar[0].photoIds.length, 2);
});

test('encrypted profiles round-trip and reject tampering and a wrong password', async () => {
  const password = 'synthetic-crypto-test',
    salt = vault.bytesTo64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await vault.derive(password, vault.from64(salt));
  const content = { version: 2, privateNote: 'Synthetic data' };
  const record = await vault.encrypt(content, key, salt, 1);
  assert.deepEqual((await vault.decrypt(record, password)).content, content);
  assert.ok(!JSON.stringify(record).includes(content.privateNote));
  await assert.rejects(vault.decrypt(record, 'wrong-password'));
  const damaged = {
    ...record,
    ciphertext: (record.ciphertext[0] === 'A' ? 'B' : 'A') + record.ciphertext.slice(1),
  };
  await assert.rejects(vault.decrypt(damaged, password));
  const second = await vault.encrypt(content, key, salt, 2);
  assert.notEqual(record.iv, second.iv);
  assert.notEqual(record.ciphertext, second.ciphertext);
});

test('unreadable storage is never silently overwritten', () => {
  let writes = 0;
  global.localStorage = { getItem: () => '{broken', setItem: () => writes++ };
  const storage = require('../src/storage.js');
  assert.throws(() => storage.readVaults(), /повреждено/);
  assert.equal(writes, 0);
  global.localStorage = {
    getItem: () => {
      throw new Error('denied');
    },
  };
  assert.throws(() => storage.readVaults(), /запретил/);
  delete global.localStorage;
});
