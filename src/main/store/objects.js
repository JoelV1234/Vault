// Object CRUD: list/get/create/update and move-to-trash.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { toListItem } = require('./util');
const { maybeSnapshot } = require('./versions');
const { reindexLinks } = require('./links');

function list(store, { typeId } = {}) {
  const out = [];
  for (const o of store.objects.values())
    if (!typeId || o.meta.type === typeId) out.push(toListItem(o));
  out.sort((a, b) => (a.updated < b.updated ? 1 : -1));
  return out;
}

function get(store, id) {
  const o = store.objects.get(id);
  return o ? { ...o.meta, content: o.content } : null;
}

function create(store, { typeId = 'note', title = 'Untitled', content = '', props = {}, pinned = false, tags = [], collections = [], description = '', aliases = [], icon = null } = {}) {
  const now = new Date().toISOString();
  const meta = { id: crypto.randomUUID(), type: typeId, title, pinned, created: now, updated: now, props, tags, collections, description, aliases, icon };
  store.objects.set(meta.id, { meta, content });
  store.persist(meta.id);
  reindexLinks(store, meta.id);
  return get(store, meta.id);
}

function update(store, id, patch) {
  const o = store.objects.get(id);
  if (!o) return null;
  maybeSnapshot(store, o, patch);
  if (patch.title !== undefined) o.meta.title = patch.title;
  if (patch.pinned !== undefined) o.meta.pinned = !!patch.pinned;
  if (patch.type !== undefined) {
    o.meta.type = patch.type;
    // Collection membership only makes sense within the object's own type.
    o.meta.collections = (o.meta.collections || []).filter(
      (cid) => store.collections.find((c) => c.id === cid)?.typeId === patch.type
    );
  }
  if (patch.tags !== undefined) o.meta.tags = patch.tags;
  if (patch.description !== undefined) o.meta.description = patch.description;
  if (patch.aliases !== undefined) o.meta.aliases = patch.aliases;
  if (patch.icon !== undefined) o.meta.icon = patch.icon;
  if (patch.collections !== undefined) o.meta.collections = patch.collections;
  if (patch.props !== undefined) o.meta.props = { ...o.meta.props, ...patch.props };
  if (patch.content !== undefined) o.content = patch.content;
  o.meta.updated = new Date().toISOString();
  store.persist(id);
  reindexLinks(store, id);
  return get(store, id);
}

function remove(store, id) {
  const o = store.objects.get(id);
  if (!o) return false;
  const from = store.objPath(id);
  if (fs.existsSync(from))
    fs.renameSync(from, path.join(store.dir, 'trash', `${id}.md`));
  store.objects.delete(id);
  store.links.delete(id);
  return true;
}

module.exports = { list, get, create, update, remove };
