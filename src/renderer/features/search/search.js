// Powerful vault search: full-text query, type chips, a Capacities-style
// filter builder over object properties, and sortable results.
import { el, debounce, fmtDate, dropdown } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, typeOf, navigate } from '../../shared/state.js';
import { buildFilterPanel } from '../browse/filter-panel.js';
import { matchesFilters } from '../browse/filtering.js';

const SORT_LABEL = {
  relevance: 'Relevance',
  updated: 'Last updated',
  created: 'Created at',
  title: 'Title',
};

export async function renderSearch(content, route, { setTopbar }) {
  setTopbar('Search');

  let activeType = route.typeId || null;
  let candidates = [];

  // Context object shared with the filter panel (same shape browse uses).
  // renderBody re-runs the (debounced) fetch so adding a filter with an empty
  // query still pulls in candidates to filter.
  const b = {
    fields: [],
    state: { filters: [], sort: { key: 'relevance', dir: 'desc' } },
    fieldValue: (o, f) => (f.meta ? o[f.id] : (o.props || {})[f.id]),
    renderBody: () => run(),
    rebuildFilterPanel: null,
  };

  const computeFields = () => {
    const t = activeType ? typeOf(activeType) : null;
    b.fields = [
      { id: 'title', name: 'Title', kind: 'text', meta: true },
      { id: 'tags', name: 'Tags', kind: 'tags', meta: true },
      { id: 'created', name: 'Created at', kind: 'date', meta: true },
      { id: 'updated', name: 'Last updated', kind: 'date', meta: true },
      ...((t?.props) || []),
    ];
    // drop filters that reference fields of a type no longer selected
    b.state.filters = b.state.filters.filter((f) => b.fields.some((x) => x.id === f.field));
  };
  computeFields();

  // ----- query input -----
  const input = el('input', {
    class: 'capture-input search-big', placeholder: 'Search your vault…',
    'aria-label': 'Search', value: route.q || '',
  });
  const inputWrap = el('div', { class: 'search-input-wrap' }, icon('search', 18), input);

  // ----- type chips -----
  const chips = el('div', { class: 'chip-row search-type-row' },
    ...ctx.types.filter((t) => t.id !== 'daily').map((t) => el('button', {
      class: `chip ${activeType === t.id ? 'chip-on' : ''}`,
      style: `--chip:${t.color}`, 'aria-pressed': String(activeType === t.id),
      onclick: (e) => {
        const on = activeType === t.id;
        activeType = on ? null : t.id;
        chips.querySelectorAll('.chip-on').forEach((c) => { c.classList.remove('chip-on'); c.setAttribute('aria-pressed', 'false'); });
        if (!on) { e.currentTarget.classList.add('chip-on'); e.currentTarget.setAttribute('aria-pressed', 'true'); }
        computeFields();
        b.rebuildFilterPanel?.();
        run();
      },
    }, t.name)));

  // ----- filter builder -----
  const filterPanel = buildFilterPanel(b);

  // ----- sort row: count + order-by + direction -----
  const count = el('span', { class: 'muted small search-count' }, '');
  const sortLabel = el('span', {}, SORT_LABEL[b.state.sort.key]);
  const sortBtn = el('button', {
    class: 'filter-field-btn', 'aria-label': 'Order results by',
    onclick: (e) => dropdown(e.currentTarget, Object.entries(SORT_LABEL).map(([key, label]) => ({
      label,
      onClick: () => { b.state.sort.key = key; sortLabel.textContent = label; renderResults(); },
    }))),
  }, icon('arrow-up-down', 13), sortLabel, icon('chevron-down', 11));
  const dirBtn = el('button', {
    class: 'icon-btn', 'aria-label': 'Toggle sort direction', title: 'Ascending / descending',
    onclick: () => {
      b.state.sort.dir = b.state.sort.dir === 'asc' ? 'desc' : 'asc';
      dirBtn.replaceChildren(icon(b.state.sort.dir === 'asc' ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow', 16));
      renderResults();
    },
  }, icon('arrow-down-wide-narrow', 16));
  const sortRow = el('div', { class: 'search-sort-row' }, count, el('div', { class: 'flex-spacer' }), sortBtn, dirBtn);

  const results = el('div', { class: 'obj-list search-results' });

  content.replaceChildren(el('div', { class: 'search-page' },
    el('h1', { class: 'home-greeting' }, 'Search'),
    inputWrap, chips, filterPanel, sortRow, results));
  input.focus();

  // ----- data -----
  const run = debounce(async () => {
    const q = input.value.trim();
    if (q) {
      candidates = await window.vault.search(q, { typeId: activeType });
    } else if (activeType || b.state.filters.length) {
      candidates = await window.vault.objects.list(activeType ? { typeId: activeType } : {});
    } else {
      candidates = [];
    }
    renderResults();
  }, 140);
  input.addEventListener('input', run);

  function applySort(list) {
    const { key, dir } = b.state.sort;
    const mul = dir === 'asc' ? 1 : -1;
    return [...list].sort((a, c) => {
      if (key === 'relevance') {
        const d = (c.score || 0) - (a.score || 0);
        return d !== 0 ? d * (dir === 'asc' ? -1 : 1) : String(c.updated).localeCompare(String(a.updated));
      }
      if (key === 'title') return a.title.localeCompare(c.title) * mul;
      return String(a[key] || '').localeCompare(String(c[key] || '')) * mul;
    });
  }

  function renderResults() {
    const q = input.value.trim();
    if (!q && !activeType && !b.state.filters.length) {
      count.textContent = '';
      results.replaceChildren(el('p', { class: 'muted small' },
        'Type to search titles, aliases, tags and content — or pick a type / add a filter to browse everything.'));
      return;
    }
    const list = applySort(candidates.filter(
      (o) => matchesFilters(o, b.state.filters, b.fields, b.fieldValue)));
    count.textContent = `${list.length} result${list.length === 1 ? '' : 's'}`;
    results.replaceChildren(...(list.length ? list.map((o) => row(o, q))
      : [el('p', { class: 'muted small' }, 'No matches.')]));
  }

  // Wrap the first occurrence of the query in <mark>.
  function highlight(text, q) {
    const i = q ? String(text).toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) return el('span', {}, String(text));
    return el('span', {},
      String(text).slice(0, i),
      el('mark', { class: 'search-mark' }, String(text).slice(i, i + q.length)),
      String(text).slice(i + q.length));
  }

  function row(o, q) {
    const t = typeOf(o.type);
    return el('button', { class: 'obj-row lift search-hit', onclick: () => navigate({ name: 'object', id: o.id }) },
      el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 13)),
      el('div', { class: 'backlink-text' },
        el('div', { class: 'obj-row-title truncate' }, highlight(o.title, q)),
        o.snippet ? el('div', { class: 'backlink-snippet muted' }, highlight(o.snippet, q)) : null),
      el('span', { class: 'type-pill-mini muted small' }, t?.name || ''),
      el('span', { class: 'muted small' }, fmtDate(o.updated)));
  }

  run.flush();
  return () => {};
}
