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

// The app itself depends on these types (link fallback + daily notes).
const PROTECTED_TYPES = ['note', 'daily'];

/** What a cascade delete would remove: the type's objects and collections. */
function typeUsage(store, id) {
  const objects = [];
  for (const o of store.objects.values())
    if (o.meta.type === id) objects.push({ id: o.meta.id, title: o.meta.title });
  const collections = store.collections
    .filter((c) => c.typeId === id)
    .map((c) => ({ id: c.id, name: c.name }));
  return { objects, collections, deletable: !PROTECTED_TYPES.includes(id) };
}

/** Delete a type together with all of its objects (to trash) and collections. */
function deleteTypeCascade(store, id) {
  if (PROTECTED_TYPES.includes(id)) return null;
  const t = store.types.find((x) => x.id === id);
  if (!t) return null;
  const { objects, collections } = typeUsage(store, id);
  for (const o of objects) store.remove(o.id); // moves the files to trash/
  for (const c of collections)
    store.collections = store.collections.filter((x) => x.id !== c.id);
  store.writeJson('collections.json', store.collections);
  store.types = store.types.filter((x) => x.id !== id);
  store.writeJson('types.json', store.types);
  return { objects: objects.length, collections: collections.length };
}

module.exports = { saveType, deleteType, typeUsage, deleteTypeCascade };
