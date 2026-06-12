// Tags overview (all tags as colored tiles with counts) and the per-tag page
// (every object carrying the tag, with a search scoped to that set).
import { el, debounce, fmtDate, tagColor, setTagOverrides, toast } from '../../shared/ui.js';
import { icon, COLOR_CHOICES } from '../../shared/icons.js';
import { typeOf, navigate } from '../../shared/state.js';

export async function renderTagsOverview(content, _route, { setTopbar }) {
  setTopbar('Tags');

  const tags = await window.vault.tags.all();
  const grid = el('div', { class: 'tag-grid' },
    tags.length
      ? tags.map((t) => el('button', {
        class: 'tag-tile lift', style: `--chip:${tagColor(t.name)}`,
        onclick: () => navigate({ name: 'tag', tag: t.name }),
      },
        el('span', { class: 'truncate' }, t.name),
        el('span', { class: 'tag-tile-count' }, `(${t.count})`)))
      : [el('div', { class: 'empty-state' }, icon('tag', 26),
        el('p', { class: 'muted' }, 'No tags yet — add them under an object title, or type #tag in any note.'))]);

  content.replaceChildren(el('div', { class: 'home-page' },
    el('div', { class: 'tag-page-head' },
      el('span', { class: 'type-chip type-chip-lg', style: '--chip:#f59e0b' }, icon('tag', 16)),
      el('h1', { class: 'home-greeting tag-h1' }, 'Tags'),
      el('span', { class: 'count-badge' }, String(tags.length))),
    grid));

  return () => {};
}

export async function renderTagPage(content, route, { setTopbar }) {
  const tag = route.tag;
  setTopbar(`Tag — #${tag}`);

  const color = tagColor(tag);
  const all = await window.vault.tags.objects(tag);
  const taggedIds = new Set(all.map((o) => o.id));

  const input = el('input', {
    class: 'capture-input search-big', placeholder: `Search within #${tag}…`,
    'aria-label': `Search within tag ${tag}`,
  });
  const results = el('div', { class: 'obj-list search-results' });

  // ----- per-tag color picker (persisted; falls back to automatic hash color) -----
  const applyColor = async (hex) => {
    setTagOverrides(await window.vault.tags.setColor(tag, hex));
    toast(hex ? 'Tag color updated' : 'Tag color reset to automatic');
    navigate({ ...route }, { push: false });
  };
  const colorRow = el('div', { class: 'tag-color-row' },
    el('span', { class: 'muted small' }, 'Color'),
    ...COLOR_CHOICES.map((c) => el('button', {
      class: `color-swatch ${c.toLowerCase() === color.toLowerCase() ? 'on' : ''}`,
      style: `--chip:${c}`, 'aria-label': `Set color ${c}`,
      onclick: () => applyColor(c),
    })),
    el('button', { class: 'btn btn-small', onclick: () => applyColor(null) }, 'Auto'));

  content.replaceChildren(el('div', { class: 'search-page' },
    el('div', { class: 'tag-page-head' },
      el('button', { class: 'back-btn', 'aria-label': 'Back', onclick: () => navigate({ name: 'tags' }) },
        icon('chevron-left', 18)),
      el('span', { class: 'tag-chip tag-chip-lg', style: `--chip:${color}` }, `#${tag}`),
      el('span', { class: 'count-badge' }, String(all.length))),
    colorRow,
    input, results));

  const row = (o, snippet) => {
    const t = typeOf(o.type);
    return el('button', { class: 'obj-row lift search-hit', onclick: () => navigate({ name: 'object', id: o.id }) },
      el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 13)),
      el('div', { class: 'backlink-text' },
        el('div', { class: 'obj-row-title truncate' }, o.title),
        snippet ? el('div', { class: 'backlink-snippet muted' }, snippet) : null),
      el('span', { class: 'muted small' }, fmtDate(o.updated)));
  };

  const run = debounce(async () => {
    const q = input.value.trim();
    if (!q) {
      results.replaceChildren(...(all.length
        ? all.map((o) => row(o))
        : [el('p', { class: 'muted small' }, 'Nothing carries this tag yet.')]));
      return;
    }
    // full-text search, narrowed to objects carrying this tag
    const hits = (await window.vault.search(q, {})).filter((h) => taggedIds.has(h.id));
    results.replaceChildren(...(hits.length
      ? hits.map((h) => row(h, h.snippet))
      : [el('p', { class: 'muted small' }, `No matches for "${q}" within #${tag}.`)]));
  }, 140);

  input.addEventListener('input', run);
  run.flush();
  input.focus();

  return () => {};
}
