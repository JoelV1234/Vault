// Automatic version history: throttled snapshots on content/title changes.
const fs = require('fs');
const path = require('path');

const VERSION_CAP = 50;
const VERSION_MIN_GAP_MS = 3 * 60 * 1000;

const versionPath = (store, id) => path.join(store.dir, 'versions', `${id}.json`);

function maybeSnapshot(store, o, patch) {
  const contentChanging = patch.content !== undefined && patch.content !== o.content;
  const titleChanging = patch.title !== undefined && patch.title !== o.meta.title;
  if (!contentChanging && !titleChanging) return;
  let versions = [];
  try { versions = JSON.parse(fs.readFileSync(versionPath(store, o.meta.id), 'utf8')); } catch {}
  const last = versions[versions.length - 1];
  if (last && !titleChanging && Date.now() - new Date(last.ts).getTime() < VERSION_MIN_GAP_MS) return;
  versions.push({ ts: new Date().toISOString(), title: o.meta.title, content: o.content, props: o.meta.props });
  if (versions.length > VERSION_CAP) versions = versions.slice(-VERSION_CAP);
  fs.writeFileSync(versionPath(store, o.meta.id), JSON.stringify(versions));
}

function versions(store, id) {
  try {
    return JSON.parse(fs.readFileSync(versionPath(store, id), 'utf8'))
      .map(({ ts, title }) => ({ ts, title }))
      .reverse();
  } catch { return []; }
}

function getVersion(store, id, ts) {
  try {
    return JSON.parse(fs.readFileSync(versionPath(store, id), 'utf8')).find((v) => v.ts === ts) || null;
  } catch { return null; }
}

function restoreVersion(store, id, ts) {
  const v = getVersion(store, id, ts);
  if (!v) return null;
  return store.update(id, { title: v.title, content: v.content, props: v.props });
}

module.exports = { maybeSnapshot, versions, getVersion, restoreVersion };
