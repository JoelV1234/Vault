// Collections tab of the type browser: spanning search bar, order-by control,
// and the collection list itself (right-click a row to delete).
import { el, confirmDialog, dropdown, fmtDate } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, navigate, reloadCollections } from '../../shared/state.js';

const SORT_LABEL = {
  name: 'Name',
  created: 'Date created',
  count: 'Objects in collection',
};

const openCollection = (b, col) =>
  navigate({ name: 'browse', typeId: b.type.id, collectionId: col.id });

const deleteCollection = (b, col) => async (e) => {
  e.preventDefault();
  if (await confirmDialog(`Delete collection "${col.name}"?`)) {
    await window.vault.collections.delete(col.id);
    await reloadCollections();
  }
};

// Persistent bar above the list — lives outside renderBody so the search
// input keeps focus while results re-render under it.
export function buildCollectionsBar(b) {
  const { state } = b;

  const search = el('input', {
    class: 'prop-input collections-search', type: 'search',
    placeholder: 'Search collections…', 'aria-label': 'Search collections',
    value: state.colQuery || '',
    oninput: (e) => { state.colQuery = e.target.value; b.renderBody(); },
  });

  const sortLabel = el('span', {}, SORT_LABEL[state.colSort.key]);
  const sortBtn = el('button', {
    class: 'filter-field-btn', 'aria-label': 'Order collections by',
    onclick: (e) => dropdown(e.currentTarget, Object.entries(SORT_LABEL).map(([key, label]) => ({
      label,
      onClick: () => { state.colSort.key = key; sortLabel.textContent = label; b.renderBody(); },
    }))),
  }, icon('arrow-up-down', 13), sortLabel, icon('chevron-down', 11));

  const dirBtn = el('button', {
    class: 'icon-btn', 'aria-label': 'Toggle sort direction', title: 'Ascending / descending',
    onclick: () => {
      state.colSort.dir = state.colSort.dir === 'asc' ? 'desc' : 'asc';
      dirBtn.replaceChildren(icon(state.colSort.dir === 'asc' ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow', 16));
      b.renderBody();
    },
  }, icon(state.colSort.dir === 'asc' ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow', 16));

  return el('div', { class: 'collections-bar' }, search, sortBtn, dirBtn);
}

export function renderCollectionsView(b) {
  const { type, state } = b;
  const q = (state.colQuery || '').trim().toLowerCase();

  let cols = ctx.collections
    .filter((c) => c.typeId === type.id)
    .map((c) => ({
      ...c,
      count: b.allTypeObjects.filter((o) => (o.collections || []).includes(c.id)).length,
    }));

  if (q) cols = cols.filter((c) => c.name.toLowerCase().includes(q));

  const dir = state.colSort.dir === 'asc' ? 1 : -1;
  cols.sort((a, c) => {
    // collections pinned to this type always float to the top
    if (!!a.pinnedToType !== !!c.pinnedToType) return a.pinnedToType ? -1 : 1;
    if (state.colSort.key === 'count') return (a.count - c.count) * dir;
    if (state.colSort.key === 'created')
      return String(a.created || '').localeCompare(String(c.created || '')) * dir;
    return a.name.localeCompare(c.name) * dir;
  });

  if (!cols.length) {
    return el('div', { class: 'empty-state' }, icon('archive', 26),
      el('p', { class: 'muted' }, q ? 'No collections match your search.' : 'No collections yet.'));
  }

  return el('div', { class: 'obj-list' }, cols.map((col) =>
    el('button', {
      class: 'obj-row lift',
      onclick: () => openCollection(b, col),
      oncontextmenu: deleteCollection(b, col),
    },
      el('span', { class: 'type-chip', style: `--chip:${b.type.color}` }, icon('archive', 13)),
      el('span', { class: 'obj-row-title truncate' }, col.name),
      col.pinnedToType ? icon('pin', 12, 'side-pin') : null,
      el('span', { class: 'muted small' }, `${col.count} item${col.count === 1 ? '' : 's'}`),
      el('span', { class: 'muted small collections-created' }, col.created ? fmtDate(col.created) : ''))));
}
