// Full-text search with Object Type filtering.
import { el, debounce, fmtDate } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, typeOf, navigate } from '../../shared/state.js';

export async function renderSearch(content, route, { setTopbar }) {
  setTopbar('Search');
  document.getElementById('sidepanel').hidden = true;

  let activeType = null;
  const input = el('input', {
    class: 'capture-input search-big', placeholder: 'Search your vault…',
    'aria-label': 'Search', value: route.q || '',
  });
  const results = el('div', { class: 'obj-list search-results' });

  const chips = el('div', { class: 'chip-row' },
    ...ctx.types.map((t) => el('button', {
      class: 'chip', style: `--chip:${t.color}`, 'aria-pressed': 'false',
      onclick: (e) => {
        const on = activeType === t.id;
        activeType = on ? null : t.id;
        chips.querySelectorAll('.chip-on').forEach((c) => { c.classList.remove('chip-on'); c.setAttribute('aria-pressed', 'false'); });
        if (!on) { e.currentTarget.classList.add('chip-on'); e.currentTarget.setAttribute('aria-pressed', 'true'); }
        run();
      },
    }, t.name)));

  content.replaceChildren(el('div', { class: 'search-page' },
    el('h1', { class: 'home-greeting' }, 'Search'),
    input, chips, results));
  input.focus();

  const run = debounce(async () => {
    const q = input.value.trim();
    if (!q) {
      results.replaceChildren(el('p', { class: 'muted small' }, 'Type to search titles and content.'));
      return;
    }
    const found = await window.vault.search(q, { typeId: activeType });
    results.replaceChildren(...(found.length ? found.map(row) : [el('p', { class: 'muted small' }, 'No matches.')]));
  }, 140);

  input.addEventListener('input', run);
  run.flush();

  function row(o) {
    const t = typeOf(o.type);
    return el('button', { class: 'obj-row lift search-hit', onclick: () => navigate({ name: 'object', id: o.id }) },
      el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 13)),
      el('div', { class: 'backlink-text' },
        el('div', { class: 'obj-row-title truncate' }, o.title),
        o.snippet ? el('div', { class: 'backlink-snippet muted' }, o.snippet) : null),
      el('span', { class: 'muted small' }, fmtDate(o.updated)));
  }

  return () => {};
}
