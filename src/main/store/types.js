// Object Type CRUD.
const crypto = require('crypto');

function saveType(store, type) {
  if (!type.id) type.id = crypto.randomUUID();
  const i = store.types.findIndex((t) => t.id === type.id);
  if (i >= 0) store.types[i] = { ...store.types[i], ...type };
  else store.types.push(type);
  store.writeJson('types.json', store.types);
  return type;
}

function deleteType(store, id) {
  const t = store.types.find((x) => x.id === id);
  if (!t || t.builtin) return false;
  store.types = store.types.filter((x) => x.id !== id);
  store.writeJson('types.json', store.types);
  // Objects of a removed type fall back to plain notes.
  for (const o of store.objects.values())
    if (o.meta.type === id) { o.meta.type = 'note'; store.persist(o.meta.id); }
  return true;
}

module.exports = { saveType, deleteType };
