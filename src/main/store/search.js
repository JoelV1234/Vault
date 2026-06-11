// Ranked full-vault search: title prefix > title/tag substring > content.
const { toListItem, snippetAround } = require('./util');

function search(store, q, { typeId } = {}) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const results = [];
  for (const o of store.objects.values()) {
    if (typeId && o.meta.type !== typeId) continue;
    const title = o.meta.title.toLowerCase();
    let score = 0;
    if (title.startsWith(query)) score = 3;
    else if (title.includes(query)) score = 2;
    else if ((o.meta.tags || []).some((t) => t.toLowerCase().includes(query))) score = 2;
    else if (o.content.toLowerCase().includes(query)) score = 1;
    if (!score) continue;
    results.push({
      ...toListItem(o),
      score,
      snippet: score === 1 ? snippetAround(o.content, query) : '',
    });
  }
  results.sort((a, b) => b.score - a.score || (a.updated < b.updated ? 1 : -1));
  return results.slice(0, 60);
}

module.exports = { search };
