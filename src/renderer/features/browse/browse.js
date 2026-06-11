// Type browser orchestrator: wires the toolbar, sub-tabs, and view renderers
// around a shared browse-context object (`b`) that holds the transient state.
import { el, todayStr } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, typeOf, navigate } from '../../shared/state.js';
import { buildTabs, getSubTab, setSubTab } from './tabs.js';
import { buildToolbar } from './toolbar.js';
import { renderList, renderTable, renderGallery } from './object-views.js';
import { renderCalendar } from './calendar-view.js';
import { renderKanban } from './kanban-view.js';
import { renderCollectionsView } from './collections-views.js';
import { openNewCollection } from '../modals/modals.js';

export async function renderBrowse(content, route, { setTopbar }) {
  const type = typeOf(route.typeId);
  if (!type) { content.replaceChildren(el('p', { class: 'muted' }, 'Unknown type')); return () => {}; }

  const collection = route.collectionId ? ctx.collections.find((c) => c.id === route.collectionId) : null;
  setTopbar(collection ? `${type.name} — ${collection.name}` : type.name);

  // filterable/sortable fields = meta + type props
  const fields = [
    { id: 'title', name: 'Title', kind: 'text', meta: true },
    { id: 'created', name: 'Created', kind: 'date', meta: true },
    { id: 'updated', name: 'Updated', kind: 'date', meta: true },
    ...type.props,
  ];

  // Browse context shared with the toolbar, tabs, and view renderers.
  const b = {
    type,
    collection,
    fields,
    fieldValue: (o, f) => (f.meta ? o[f.id] : o.props[f.id]),
    // transient view state; a collection narrows the object set by membership
    state: {
      view: 'list',
      filters: [],
      sort: { key: 'updated', dir: 'desc' },
      month: todayStr().slice(0, 7),
    },
    allTypeObjects: [],
    objects: [],
    searchQuery: '',
    sortSel: null,
    createBtn: null,
    open: (id) => navigate({ name: 'object', id }),
    refresh,
    renderBody,
  };

  const body = el('div', { class: 'browse-body' });
  const toolbar = buildToolbar(b);
  const tabs = buildTabs(b);

  const pageWrap = el('div', { class: 'browse-page' },
    tabs,
    toolbar,
    body
  );

  content.replaceChildren(pageWrap);
  document.getElementById('sidepanel').hidden = true;

  await refresh();

  async function refresh() {
    b.allTypeObjects = await window.vault.objects.list({ typeId: type.id });
    b.objects = b.allTypeObjects;
    if (collection) {
      b.objects = b.objects.filter((o) => (o.collections || []).includes(collection.id));
      setSubTab('object');
    }
    renderBody();
  }

  function applyFilters(list) {
    if (!b.searchQuery) return list;
    const q = b.searchQuery.toLowerCase();
    return list.filter((o) => o.title.toLowerCase().includes(q));
  }

  function applySort(list) {
    const field = fields.find((x) => x.id === b.state.sort.key) || fields[2];
    const dir = b.state.sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b2) => {
      let av = b.fieldValue(a, field) ?? '';
      let bv = b.fieldValue(b2, field) ?? '';
      if (field.kind === 'daterange') { av = av?.start || ''; bv = bv?.start || ''; }
      if (typeof av === 'number' || typeof bv === 'number') return (Number(av) - Number(bv)) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  function renderBody() {
    const collectionsMode = getSubTab() === 'collection' && !collection;

    const activeTabs = pageWrap.querySelector('.browse-tabs-container');
    if (activeTabs) {
      activeTabs.replaceWith(buildTabs(b));
    }

    // Update sort options based on current mode
    const sortOpts = collectionsMode
      ? [
          { id: 'name', name: 'Name' },
          { id: 'count', name: 'Item Count' }
        ]
      : fields;

    if (collectionsMode) {
      if (b.state.sort.key !== 'name' && b.state.sort.key !== 'count') {
        b.state.sort.key = 'name';
      }
    } else {
      if (!fields.some((f) => f.id === b.state.sort.key)) {
        b.state.sort.key = 'updated';
      }
    }

    b.sortSel.replaceChildren(...sortOpts.map((f) => {
      const o = el('option', { value: f.id }, `Sort: ${f.name}`);
      if (b.state.sort.key === f.id) o.selected = true;
      return o;
    }));

    // Update create button based on current mode
    if (collectionsMode) {
      b.createBtn.replaceChildren(icon('plus', 14), ' New collection');
      b.createBtn.onclick = () => {
        openNewCollection(type.id, (newCol) => {
          navigate({ name: 'browse', typeId: type.id, collectionId: newCol.id });
        });
      };
    } else {
      b.createBtn.replaceChildren(icon('plus', 14), ` New ${type.name}`);
      b.createBtn.onclick = async () => {
        const o = await window.vault.objects.create({ typeId: type.id, title: `New ${type.name}` });
        navigate({ name: 'object', id: o.id });
      };
    }

    // Render contents
    if (collectionsMode) {
      body.replaceChildren(renderCollectionsView(b));
    } else {
      const list = applySort(applyFilters(b.objects));
      const render = {
        list: renderList, table: renderTable, gallery: renderGallery,
        calendar: renderCalendar, kanban: renderKanban,
      }[b.state.view];
      body.replaceChildren(render(b, list));
    }

    toolbar.querySelectorAll('.view-btn').forEach((btn) =>
      btn.classList.toggle('active', btn.dataset.view === b.state.view));
  }

  return () => {};
}
