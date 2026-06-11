// Tags: explicit meta tags + inline #tags, counts, and user-chosen colors.
const { toListItem } = require('./util');

// inline tags: "#tag_name" anywhere in content (not headings — those have a space)
const TAG_RE = /(^|[\s(>])#([\p{L}\p{N}_-]{1,40})/gu;

/** Lowercased set of an object's tags: explicit meta tags + inline #tags. */
function effectiveTags(o) {
  const tags = new Map(); // lower -> display casing (first seen wins)
  for (const t of o.meta.tags || []) if (!tags.has(t.toLowerCase())) tags.set(t.toLowerCase(), t);
  for (const m of o.content.matchAll(TAG_RE))
    if (!tags.has(m[2].toLowerCase())) tags.set(m[2].toLowerCase(), m[2]);
  return tags;
}

function allTags(store) {
  const counts = new Map(); // lower -> { name, count, color }
  for (const o of store.objects.values()) {
    for (const [lower, display] of effectiveTags(o)) {
      const entry = counts.get(lower) || { name: display, count: 0, color: store.tagColorMap[lower] || null };
      entry.count++;
      counts.set(lower, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function setTagColor(store, name, color) {
  const lower = String(name).toLowerCase();
  if (color) store.tagColorMap[lower] = color;
  else delete store.tagColorMap[lower]; // reset to automatic
  store.writeJson('tags.json', store.tagColorMap);
  return store.tagColorMap;
}

function objectsByTag(store, tag) {
  const lower = tag.toLowerCase();
  const out = [];
  for (const o of store.objects.values())
    if (effectiveTags(o).has(lower)) out.push(toListItem(o));
  out.sort((a, b) => (a.updated < b.updated ? 1 : -1));
  return out;
}

module.exports = { allTags, setTagColor, objectsByTag };
