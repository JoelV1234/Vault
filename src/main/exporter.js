// Full-vault exports: Markdown (readable filenames), JSON (complete dump),
// CSV (one file per Object Type). PDF export of the current object lives in
// main.js since it needs the BrowserWindow.
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const safeName = (s) =>
  (s || 'Untitled').replace(/[\/\\:*?"<>|]/g, '-').slice(0, 120).trim() || 'Untitled';

function exportMarkdown(store, destDir) {
  const dir = path.join(destDir, 'vault-export-md');
  fs.mkdirSync(dir, { recursive: true });
  const used = new Set();
  let count = 0;
  for (const item of store.list()) {
    const o = store.get(item.id);
    let name = safeName(o.title);
    if (used.has(name.toLowerCase())) name = `${name} (${o.id.slice(0, 8)})`;
    used.add(name.toLowerCase());
    fs.writeFileSync(
      path.join(dir, `${name}.md`),
      matter.stringify(o.content, { id: o.id, type: o.type, title: o.title, created: o.created, updated: o.updated, props: o.props })
    );
    count++;
  }
  // Assets travel with the notes.
  const assets = path.join(store.dir, 'assets');
  if (fs.existsSync(assets)) fs.cpSync(assets, path.join(dir, 'assets'), { recursive: true });
  return { dir, count };
}

function exportJson(store, destDir) {
  const file = path.join(destDir, 'vault-export.json');
  const objects = store.list().map((i) => store.get(i.id));
  fs.writeFileSync(file, JSON.stringify({
    exportedAt: new Date().toISOString(),
    types: store.listTypes(),
    collections: store.listCollections(),
    objects,
  }, null, 2));
  return { file, count: objects.length };
}

const csvCell = (v) => {
  if (v === undefined || v === null) return '';
  const s = Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function exportCsv(store, destDir) {
  const dir = path.join(destDir, 'vault-export-csv');
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const type of store.listTypes()) {
    const objects = store.list({ typeId: type.id });
    if (!objects.length) continue;
    const propCols = (type.props || []).map((p) => p.id);
    const header = ['id', 'title', 'created', 'updated', ...propCols];
    const rows = objects.map((o) =>
      [o.id, o.title, o.created, o.updated, ...propCols.map((p) => o.props[p])].map(csvCell).join(',')
    );
    fs.writeFileSync(path.join(dir, `${safeName(type.name)}.csv`), [header.join(','), ...rows].join('\n'));
    count += objects.length;
  }
  return { dir, count };
}

module.exports = { exportMarkdown, exportJson, exportCsv };
