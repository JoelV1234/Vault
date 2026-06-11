// Link index, backlinks (incl. unlinked mentions), and the global graph.
const { toListItem, snippetAround } = require('./util');

const LINK_RE = /vault:\/\/([a-zA-Z0-9-]{8,})/g;

function reindexLinks(store, id) {
  const o = store.objects.get(id);
  const targets = new Set();
  for (const m of o.content.matchAll(LINK_RE)) if (m[1] !== id) targets.add(m[1]);
  const type = store.types.find((t) => t.id === o.meta.type);
  for (const p of type?.props || []) {
    if (p.kind !== 'relation') continue;
    const v = o.meta.props[p.id];
    for (const rid of Array.isArray(v) ? v : v ? [v] : []) if (rid !== id) targets.add(rid);
  }
  store.links.set(id, targets);
}

function backlinks(store, id) {
  const me = store.objects.get(id);
  if (!me) return { linked: [], unlinked: [] };
  const linked = [];
  const unlinked = [];
  const title = me.meta.title.toLowerCase();
  for (const [oid, targets] of store.links) {
    if (oid === id) continue;
    const other = store.objects.get(oid);
    if (!other) continue;
    if (targets.has(id)) {
      linked.push({ ...toListItem(other), snippet: snippetAround(other.content, `vault://${id}`) });
    } else if (title.length >= 3 && other.content.toLowerCase().includes(title)) {
      unlinked.push({ ...toListItem(other), snippet: snippetAround(other.content, me.meta.title) });
    }
  }
  return { linked, unlinked: unlinked.slice(0, 20) };
}

function graph(store) {
  const nodes = [];
  const edges = [];
  for (const o of store.objects.values())
    nodes.push({ id: o.meta.id, title: o.meta.title, type: o.meta.type });
  for (const [src, targets] of store.links)
    for (const dst of targets)
      if (store.objects.has(dst)) edges.push({ source: src, target: dst });
  return { nodes, edges };
}

module.exports = { reindexLinks, backlinks, graph };
