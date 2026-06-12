// Saved Collections (per-type groupings of objects).
const crypto = require('crypto');

function saveCollection(store, col) {
  if (!col.id) {
    col.id = crypto.randomUUID();
    col.created = new Date().toISOString();
  }
  const i = store.collections.findIndex((c) => c.id === col.id);
  if (i >= 0) store.collections[i] = col;
  else store.collections.push(col);
  store.writeJson('collections.json', store.collections);
  return col;
}

function deleteCollection(store, id) {
  store.collections = store.collections.filter((c) => c.id !== id);
  store.writeJson('collections.json', store.collections);
}

module.exports = { saveCollection, deleteCollection };
