// Type browser: header row → tab bar → sub-toolbar / collections bar → filter
// panel → body. Tab and view choice are kept on the route so app-wide
// re-renders (store changes) restore them.
import { el, confirmDialog, dropdown } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, typeOf, navigate, reloadCollections } from '../../shared/state.js';
import { buildSubToolbar } from './toolbar.js';
import { buildFilterPanel } from './filter-panel.js';
import { matchesFilters } from './filtering.js';
import { renderList, renderTable, renderGallery } from './object-views.js';
import { renderKanban } from './kanban-view.js';
import { renderCollectionsView, buildCollectionsBar } from './collections-views.js';
import { openTypeEditor, openNewCollection, openDeleteType } from '../modals/modals.js';

export async function renderBrowse(content, route, { setTopbar }) {
  const type = typeOf(route.typeId);
  if (!type) { content.replaceChildren(el('p', { class: 'muted' }, 'Unknown type')); return () => {}; }

  const collection = route.collectionId ? ctx.collections.find((c) => c.id === route.collectionId) : null;
  setTopbar(collection ? `${type.name} — ${collection.name}` : type.name);

  const fields = [
    { id: 'title', name: 'Title', kind: 'text', meta: true },
    { id: 'created', name: 'Created at', kind: 'date', meta: true },
    { id: 'updated', name: 'Last updated', kind: 'date', meta: true },
    ...(type.props || []),
  ];

  const b = {
    type, collection, fields, route,
    fieldValue: (o, f) => (f.meta ? o[f.id] : (o.props || {})[f.id]),
    state: {
      view: route.view || 'list',
      subTab: !collection && route.tab === 'collections' ? 'collections' : 'objects',
      filters: [],
      sort: { key: 'updated', dir: 'desc' },
      colQuery: '',
      colSort: { key: 'created', dir: 'desc' },
    },
    allTypeObjects: [], objects: [],
    createBtn: el('button', { class: 'btn btn-primary btn-small' }),
    subToolbar: null, filterPanel: null, collectionsBar: null, rebuildFilterPanel: null,
    open: (id) => navigate({ name: 'object', id }),
    refresh, renderBody,
  };

  // ── Overflow menus ────────────────────────────────────────────────────────
  const deleteCollection = async () => {
    if (await confirmDialog(`Delete collection "${collection.name}"? Objects will not be deleted.`)) {
      await window.vault.collections.delete(collection.id);
      navigate({ name: 'browse', typeId: type.id });
      await reloadCollections();
    }
  };
  const togglePin = (key) => async () => {
    await window.vault.collections.save({ ...collection, [key]: !collection[key] });
    await reloadCollections();
  };
  const collectionMenu = (e) => dropdown(e.currentTarget, [
    {
      label: collection.pinnedToVault ? 'Unpin from vault' : 'Pin to vault',
      icon: collection.pinnedToVault ? 'pin-off' : 'pin',
      onClick: togglePin('pinnedToVault'),
    },
    {
      label: collection.pinnedToType ? `Unpin from ${type.name}` : `Pin to ${type.name}`,
      icon: collection.pinnedToType ? 'pin-off' : 'pin',
      onClick: togglePin('pinnedToType'),
    },
    '-',
    { label: 'Object type settings', icon: 'settings-2', onClick: () => openTypeEditor(type) },
    '-',
    { label: 'Delete collection', icon: 'trash-2', danger: true, onClick: deleteCollection },
  ]);
  const typeMenu = (e) => dropdown(e.currentTarget, [
    { label: `Customize ${type.name}`, icon: 'settings-2', onClick: () => openTypeEditor(type) },
    { label: 'New collection', icon: 'archive', onClick: () => openNewCollection(type.id,
      (col) => navigate({ name: 'browse', typeId: type.id, collectionId: col.id })) },
    ...(['note', 'daily'].includes(type.id) ? [] : ['-',
      { label: 'Delete object type', icon: 'trash-2', danger: true, onClick: () => openDeleteType(type) }]),
  ]);

  // ── Header row: bin/type chip + title, create button (+ ⋯ for collections) ─
  const headerRow = el('div', { class: 'browse-header-row' },
    el('div', { class: 'browse-title' },
      el('span', { class: 'browse-title-chip', style: `--chip:${type.color}` },
        icon(collection ? 'archive' : type.icon, 19)),
      el('h1', {}, collection ? collection.name : type.name),
      collection ? el('span', { class: 'muted browse-title-sub' }, type.name) : null),
    el('div', { class: 'flex-spacer' }),
    b.createBtn,
    collection ? el('button', {
      class: 'icon-btn', 'aria-label': 'Collection menu', title: 'More actions',
      onclick: collectionMenu,
    }, icon('more-horizontal', 16)) : null);

  // ── Tab row: tab bar + ⋯ — only when viewing a type (not a collection) ────
  let tabRow = null;
  if (!collection) {
    const tabs = ['Objects', 'Collections'];
    const tabBar = el('div', { class: 'browse-tab-bar' });
    const renderTabs = () => tabBar.replaceChildren(...tabs.map((t) =>
      el('button', {
        class: `browse-tab ${b.state.subTab === t.toLowerCase() ? 'active' : ''}`,
        onclick: () => {
          b.state.subTab = t.toLowerCase();
          route.tab = b.state.subTab; // survives app-wide re-renders
          renderTabs();
          b.renderBody();
        },
      }, t)));
    renderTabs();
    tabRow = el('div', { class: 'browse-tab-row' },
      tabBar,
      el('div', { class: 'flex-spacer' }),
      el('button', {
        class: 'icon-btn', 'aria-label': `${type.name} menu`, title: 'More actions',
        onclick: typeMenu,
      }, icon('more-horizontal', 16)));
  }

  // ── Sub-toolbar (objects) + collections bar (collections tab) ────────────
  b.subToolbar = buildSubToolbar(b);
  b.filterPanel = buildFilterPanel(b);
  if (!collection) b.collectionsBar = buildCollectionsBar(b);

  const body = el('div', { class: 'browse-body' });
  content.replaceChildren(el('div', { class: 'browse-page' },
    headerRow, tabRow, b.subToolbar, b.collectionsBar, b.filterPanel, body));

  await refresh();

  // ── Data ──────────────────────────────────────────────────────────────────
  async function refresh() {
    b.allTypeObjects = await window.vault.objects.list({ typeId: type.id });
    b.objects = collection
      ? b.allTypeObjects.filter((o) => (o.collections || []).includes(collection.id))
      : b.allTypeObjects;
    renderBody();
  }

  // ── Sorting ───────────────────────────────────────────────────────────────
  function applySort(list) {
    const field = fields.find((x) => x.id === b.state.sort.key) || fields[2];
    const dir = b.state.sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b2) => {
      let av = b.fieldValue(a, field) ?? '', bv = b.fieldValue(b2, field) ?? '';
      if (field.kind === 'daterange') { av = av?.start || ''; bv = bv?.start || ''; }
      if (typeof av === 'number' || typeof bv === 'number') return (Number(av) - Number(bv)) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderBody() {
    const inCollections = !collection && b.state.subTab === 'collections';
    if (b.subToolbar) b.subToolbar.hidden = inCollections;
    if (b.filterPanel) b.filterPanel.hidden = inCollections;
    if (b.collectionsBar) b.collectionsBar.hidden = !inCollections;

    if (inCollections) {
      b.createBtn.replaceChildren(icon('plus', 14), ' New collection');
      b.createBtn.onclick = () => openNewCollection(type.id,
        (col) => navigate({ name: 'browse', typeId: type.id, collectionId: col.id }));
      body.replaceChildren(renderCollectionsView(b));
    } else {
      b.createBtn.replaceChildren(icon('plus', 14), ` New ${type.name}`);
      b.createBtn.onclick = async () => {
        const opts = { typeId: type.id, title: `New ${type.name}` };
        if (collection) opts.collections = [collection.id];
        navigate({ name: 'object', id: (await window.vault.objects.create(opts)).id });
      };
      const list = applySort(b.objects.filter(
        (o) => matchesFilters(o, b.state.filters, fields, b.fieldValue)));
      const fn = { list: renderList, table: renderTable, gallery: renderGallery,
        kanban: renderKanban }[b.state.view] || renderList;
      body.replaceChildren(fn(b, list));
    }

    b.subToolbar?.querySelectorAll('.view-btn')
      .forEach((btn) => btn.classList.toggle('active', btn.dataset.view === b.state.view));
  }

  return () => {};
}
