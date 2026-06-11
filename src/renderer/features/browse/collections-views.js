// Collection renderers for the browser: List / Table / Gallery of a type's
// saved collections, with right-click delete.
import { el, confirmDialog } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, navigate, refreshSidebar } from '../../shared/state.js';

const openCollection = (b, col) =>
  navigate({ name: 'browse', typeId: b.type.id, collectionId: col.id });

const deleteCollection = (b, col) => async (e) => {
  e.preventDefault();
  if (await confirmDialog(`Delete collection "${col.name}"?`)) {
    await window.vault.collections.delete(col.id);
    ctx.collections = await window.vault.collections.list();
    refreshSidebar();
    b.refresh();
  }
};

const empty = () =>
  el('div', { class: 'empty-state' }, icon('archive', 26), el('p', { class: 'muted' }, 'No collections found.'));

function renderCollectionsList(b, list) {
  if (!list.length) return empty();
  return el('div', { class: 'obj-list' }, list.map((col) =>
    el('button', {
      class: 'obj-row lift',
      onclick: () => openCollection(b, col),
      oncontextmenu: deleteCollection(b, col),
    },
      el('span', { class: 'type-chip', style: `--chip:${b.type.color}` }, icon('archive', 13)),
      el('span', { class: 'obj-row-title truncate' }, col.name),
      el('span', { class: 'muted small' }, `${col.count} items`))));
}

function renderCollectionsTable(b, list) {
  if (!list.length) return empty();
  return el('div', { class: 'table-wrap' }, el('table', { class: 'obj-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Name'),
      el('th', {}, 'Count'))),
    el('tbody', {}, list.map((col) => el('tr', {
      onclick: () => openCollection(b, col),
      tabindex: '0', role: 'button',
      onkeydown: (e) => e.key === 'Enter' && openCollection(b, col),
      oncontextmenu: deleteCollection(b, col),
    },
      el('td', { class: 'td-title' }, col.name),
      el('td', { class: 'muted small' }, `${col.count} items`))))));
}

function renderCollectionsGallery(b, list) {
  if (!list.length) return empty();
  return el('div', { class: 'tag-grid' },
    ...list.map((col) => el('button', {
      class: 'tag-tile lift',
      style: `--chip:${b.type.color}`,
      onclick: () => openCollection(b, col),
      oncontextmenu: deleteCollection(b, col),
    },
      el('span', { class: 'truncate' }, col.name),
      el('span', { class: 'tag-tile-count' }, `(${col.count})`)
    ))
  );
}

export function renderCollectionsView(b) {
  const { type, state } = b;
  const typeCollections = ctx.collections
    .filter((c) => c.typeId === type.id)
    .map((c) => ({
      ...c,
      count: b.allTypeObjects.filter((o) => (o.collections || []).includes(c.id)).length
    }));

  let filtered = typeCollections;
  if (b.searchQuery) {
    const q = b.searchQuery.toLowerCase();
    filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
  }

  const dir = state.sort.dir === 'asc' ? 1 : -1;
  filtered.sort((a, b2) => {
    if (state.sort.key === 'count') {
      return (a.count - b2.count) * dir;
    }
    return a.name.localeCompare(b2.name) * dir;
  });

  if (state.view === 'list') {
    return renderCollectionsList(b, filtered);
  } else if (state.view === 'table') {
    return renderCollectionsTable(b, filtered);
  } else {
    return renderCollectionsGallery(b, filtered);
  }
}
