// Trash: deleted objects live as files in trash/ until restored or destroyed.
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { reindexLinks } = require('./links');

const trashDir = (store) => path.join(store.dir, 'trash');

function listTrash(store) {
  const out = [];
  for (const f of fs.readdirSync(trashDir(store))) {
    if (!f.endsWith('.md')) continue;
    const full = path.join(trashDir(store), f);
    try {
      const { data } = matter(fs.readFileSync(full, 'utf8'));
      if (!data.id) continue;
      out.push({
        id: data.id,
        title: data.title || 'Untitled',
        type: data.type || 'note',
        deletedAt: fs.statSync(full).mtime.toISOString(),
      });
    } catch { /* skip unreadable files */ }
  }
  out.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
  return out;
}

function restoreTrash(store, id) {
  const from = path.join(trashDir(store), `${id}.md`);
  if (!fs.existsSync(from)) return null;
  const { data, content } = matter(fs.readFileSync(from, 'utf8'));
  const meta = store.normalizeMeta(data);
  // If the type vanished meanwhile, fall back to a plain note.
  if (!store.types.some((t) => t.id === meta.type)) meta.type = 'note';
  fs.renameSync(from, store.objPath(id));
  store.objects.set(id, { meta, content });
  reindexLinks(store, id);
  return store.get(id);
}

function destroyTrash(store, id) {
  const f = path.join(trashDir(store), `${id}.md`);
  if (!fs.existsSync(f)) return false;
  fs.unlinkSync(f);
  return true;
}

function emptyTrash(store) {
  let n = 0;
  for (const f of fs.readdirSync(trashDir(store)))
    if (f.endsWith('.md')) { fs.unlinkSync(path.join(trashDir(store), f)); n++; }
  return n;
}

module.exports = { listTrash, restoreTrash, destroyTrash, emptyTrash };
