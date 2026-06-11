// Local-first vault store. Every Object is a plain markdown file with YAML
// frontmatter inside the vault directory — fully portable, no database.
//
//   vault/
//     objects/<id>.md      one file per Object (frontmatter: meta, body: content)
//     assets/              images and attachments
//     versions/<id>.json   simple version history per Object
//     trash/               deleted objects (never destroyed silently)
//     types.json           Object Type definitions
//     collections.json     saved views
//
// VaultStore is a thin facade: each domain (objects, links, tags, …) lives in
// its own module in this folder and operates on the store instance.
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const { todayStr } = require('./util');
const { BUILTIN_TYPES } = require('./builtin-types');
const types = require('./types');
const objects = require('./objects');
const versions = require('./versions');
const links = require('./links');
const { search } = require('./search');
const tags = require('./tags');
const collections = require('./collections');
const daily = require('./daily');
const { importAsset } = require('./assets');

class VaultStore {
  constructor(vaultDir) {
    this.dir = vaultDir;
    this.objects = new Map(); // id -> { meta, content }
    this.types = [];
    this.collections = [];
    this.links = new Map(); // id -> Set(target ids)
  }

  // ---------- lifecycle ----------
  init() {
    for (const d of ['objects', 'assets', 'versions', 'trash'])
      fs.mkdirSync(path.join(this.dir, d), { recursive: true });

    this.types = this.readJson('types.json') || [];
    // Seed / heal builtin types without clobbering user edits to them.
    for (const bt of BUILTIN_TYPES)
      if (!this.types.some((t) => t.id === bt.id)) this.types.push(structuredClone(bt));
    this.writeJson('types.json', this.types);

    // user-chosen tag colors (lowercased tag -> hex); unset tags get a hash color
    this.tagColorMap = this.readJson('tags.json') || {};

    this.collections = this.readJson('collections.json') || [];

    const objDir = path.join(this.dir, 'objects');
    for (const f of fs.readdirSync(objDir)) {
      if (!f.endsWith('.md')) continue;
      try {
        const { data, content } = matter(fs.readFileSync(path.join(objDir, f), 'utf8'));
        if (!data.id) continue;
        this.objects.set(data.id, { meta: this.normalizeMeta(data), content });
      } catch {
        /* skip unreadable files rather than failing the whole vault */
      }
    }
    for (const id of this.objects.keys()) links.reindexLinks(this, id);
  }

  normalizeMeta(data) {
    return {
      id: data.id,
      type: data.type || 'note',
      title: data.title || 'Untitled',
      pinned: !!data.pinned,
      created: data.created || new Date().toISOString(),
      updated: data.updated || new Date().toISOString(),
      props: data.props || {},
      tags: Array.isArray(data.tags) ? data.tags : [],
      // Default properties every object carries (Capacities-style).
      description: data.description || '',
      aliases: Array.isArray(data.aliases) ? data.aliases : [],
      icon: data.icon || null,
      // Capacities-style: an object can live in many collections of its type.
      collections: Array.isArray(data.collections) ? data.collections : [],
    };
  }

  readJson(name) {
    try { return JSON.parse(fs.readFileSync(path.join(this.dir, name), 'utf8')); }
    catch { return null; }
  }
  writeJson(name, value) {
    fs.writeFileSync(path.join(this.dir, name), JSON.stringify(value, null, 2));
  }
  objPath(id) { return path.join(this.dir, 'objects', `${id}.md`); }

  persist(id) {
    const o = this.objects.get(id);
    fs.writeFileSync(this.objPath(id), matter.stringify(o.content, { ...o.meta }));
  }

  // ---------- types ----------
  listTypes() { return this.types; }
  saveType(type) { return types.saveType(this, type); }
  deleteType(id) { return types.deleteType(this, id); }
  typeUsage(id) { return types.typeUsage(this, id); }
  deleteTypeCascade(id) { return types.deleteTypeCascade(this, id); }

  // ---------- objects ----------
  list(opts) { return objects.list(this, opts); }
  get(id) { return objects.get(this, id); }
  create(data) { return objects.create(this, data); }
  update(id, patch) { return objects.update(this, id, patch); }
  remove(id) { return objects.remove(this, id); }

  // ---------- versions ----------
  versions(id) { return versions.versions(this, id); }
  getVersion(id, ts) { return versions.getVersion(this, id, ts); }
  restoreVersion(id, ts) { return versions.restoreVersion(this, id, ts); }

  // ---------- links / graph ----------
  backlinks(id) { return links.backlinks(this, id); }
  graph() { return links.graph(this); }

  // ---------- search ----------
  search(q, opts) { return search(this, q, opts); }

  // ---------- tags ----------
  allTags() { return tags.allTags(this); }
  getTagColors() { return this.tagColorMap; }
  setTagColor(name, color) { return tags.setTagColor(this, name, color); }
  objectsByTag(tag) { return tags.objectsByTag(this, tag); }

  // ---------- daily notes / capture ----------
  ensureDaily(dateStr) { return daily.ensureDaily(this, dateStr); }
  appendToDaily(text) { return daily.appendToDaily(this, text); }

  // ---------- collections ----------
  listCollections() { return this.collections; }
  saveCollection(col) { return collections.saveCollection(this, col); }
  deleteCollection(id) { return collections.deleteCollection(this, id); }

  // ---------- assets ----------
  importAsset(srcPath) { return importAsset(this, srcPath); }
}

module.exports = { VaultStore, BUILTIN_TYPES, todayStr };
