// App bootstrap: routing, topbar, global keyboard shortcuts.
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './styles.css';

import { el, setTagOverrides, toast, confirmDialog, debounce } from './shared/ui.js';
import { icon } from './shared/icons.js';
import {
  ctx, ui, loadCore, navigate, onNavigate, applyTheme, refreshSidebar,
  goBack, goForward, canGoBack, canGoForward, onDataChanged, onUiChanged,
  setSidePanelOpen, setSidebarCollapsed, typeOf, setSettings,
  getTabs, closeTab, onTabsChanged, openObjectTab, moveTab, toggleTabPin,
} from './shared/state.js';
import { initSidebar } from './features/sidebar/sidebar.js';
import { togglePalette } from './features/command-palette/palette.js';
import { renderHome } from './features/home/home.js';
import { renderObject, getActiveEditor, turnSelectionIntoObject } from './features/object/object.js';
import { renderBrowse } from './features/browse/browse.js';
import { renderGraph } from './features/graph/graph.js';
import { renderTasks } from './features/tasks/tasks.js';
import { renderSearch } from './features/search/search.js';
import { renderTagsOverview, renderTagPage } from './features/tags/tag.js';
import { openSettings, openExport } from './features/modals/modals.js';

let cleanup = null;
let pageTitle = '';

// Routes that render content into the right side panel.
const hasSidePanel = () => ['object', 'daily'].includes(ctx.route?.name);

function applySidePanel() {
  document.getElementById('sidepanel').hidden = !(hasSidePanel() && ui.sidePanelOpen);
}

function setTopbar(title) {
  pageTitle = title;
  renderTopbar();
}

function renderTopbar() {
  const route = ctx.route || {};
  const onObject = hasSidePanel();
  const activeId = onObject ? route.id : null;

  const tabEls = getTabs().map((t) => el('div', {
    class: `tab ${t.id === activeId ? 'active' : ''} ${t.pinned ? 'pinned' : ''}`,
    role: 'button', tabindex: '0', title: t.title, draggable: 'true',
    onclick: (e) => { if (!e.target.closest('.tab-x, .tab-pin')) navigate({ name: 'object', id: t.id }); },
    onkeydown: (e) => e.key === 'Enter' && navigate({ name: 'object', id: t.id }),
    ondragstart: (e) => {
      e.dataTransfer.setData('text/plain', t.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    ondragover: (e) => e.preventDefault(),
    ondrop: (e) => {
      e.preventDefault();
      const src = e.dataTransfer.getData('text/plain');
      if (src && src !== t.id) moveTab(src, t.id);
    },
  },
    el('span', { class: 'type-chip tab-chip', style: `--chip:${t.color || '#888'}` }, icon(t.icon || 'file-text', 11)),
    el('span', { class: 'tab-title truncate' }, t.title || 'Untitled'),
    el('button', {
      class: `tab-pin ${t.pinned ? 'on' : ''}`,
      'aria-label': t.pinned ? `Unpin ${t.title}` : `Pin ${t.title}`,
      title: t.pinned ? 'Unpin tab' : 'Pin tab',
      onclick: () => toggleTabPin(t.id),
    }, icon('pin', 11)),
    el('button', {
      class: 'tab-x', 'aria-label': `Close ${t.title}`,
      onclick: () => {
        closeTab(t.id);
        if (t.id === activeId) {
          const rest = getTabs();
          if (rest.length) navigate({ name: 'object', id: rest[rest.length - 1].id });
          else navigate({ name: 'home' });
        }
      },
    }, icon('x', 12))));

  // the current non-object page appears as a plain, non-closable tab
  const pageTab = !onObject && pageTitle
    ? el('div', { class: 'tab tab-page active' }, el('span', { class: 'tab-title truncate' }, pageTitle))
    : null;

  document.getElementById('topbar').replaceChildren(
    el('div', { class: 'topbar-nav' },
      el('button', {
        class: 'icon-btn', 'aria-label': 'Toggle sidebar', title: 'Toggle sidebar',
        onclick: () => setSidebarCollapsed(!ui.sidebarCollapsed),
      }, icon(ui.sidebarCollapsed ? 'panel-left-open' : 'panel-left-close', 16)),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Go back', title: 'Back',
        disabled: canGoBack() ? undefined : true,
        onclick: () => goBack(),
      }, icon('chevron-left', 17)),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Go forward', title: 'Forward',
        disabled: canGoForward() ? undefined : true,
        onclick: () => goForward(),
      }, icon('chevron-right', 17))),
    el('div', { class: 'tab-strip' }, pageTab, ...tabEls),
    el('div', { class: 'flex-spacer' }),
    el('button', {
      class: 'btn btn-ghost btn-small', 'aria-label': 'Open command palette',
      onclick: () => togglePalette(),
    }, icon('command', 13), el('kbd', { class: 'kbd' }, 'K')),
    onObject ? el('button', {
      class: `icon-btn ${ui.sidePanelOpen ? 'accent' : ''}`, id: 'panel-toggle',
      'aria-label': 'Toggle side panel', title: 'Toggle side panel',
      onclick: () => setSidePanelOpen(!ui.sidePanelOpen),
    }, icon('panel-right', 16)) : null);

  applySidePanel();
}

const views = {
  home: renderHome,
  object: renderObject,
  daily: renderObject, // daily notes are objects with a date navigator
  browse: renderBrowse,
  graph: renderGraph,
  tasks: renderTasks,
  search: renderSearch,
  tags: renderTagsOverview,
  tag: renderTagPage,
};

onNavigate(async (route) => {
  // resolve daily route without an id (sidebar click)
  if (route.name === 'daily' && !route.id) {
    const d = await window.vault.daily.ensure(route.date);
    route.id = d.id;
  }
  if (cleanup) { const c = cleanup; cleanup = null; await c(); }
  const content = document.getElementById('content');
  content.scrollTop = 0;
  const view = views[route.name] || renderHome;
  cleanup = await view(content, route, { setTopbar });
  applySidePanel();
  refreshSidebar();
  content.focus({ preventScroll: true });
});

// UI state changed (side panel toggle, sidebar collapse): apply + refresh
// the topbar so toggle icons track the state.
onUiChanged(() => {
  document.getElementById('app').classList.toggle('sidebar-collapsed', ui.sidebarCollapsed);
  renderTopbar();
});

// Pinned tabs survive restarts: saved into vault settings whenever the
// pinned set actually changes.
let lastPinnedJson = '';
const pinnedSnapshot = () =>
  JSON.stringify(getTabs().filter((t) => t.pinned).map(({ id, title, icon, color }) => ({ id, title, icon, color })));
const persistPinnedTabs = debounce(async () => {
  const json = pinnedSnapshot();
  if (json === lastPinnedJson) return;
  lastPinnedJson = json;
  setSettings(await window.vault.settings.set({ pinnedTabs: JSON.parse(json) }));
}, 400);

// Tabs opened/closed/renamed/moved/pinned → redraw the strip + persist pins.
onTabsChanged(() => { renderTopbar(); persistPinnedTabs(); });

// Data changed anywhere (type editor, collection modals, deletes…):
// refresh the sidebar and re-render views that display that data, so every
// edit is reflected across the app immediately.
onDataChanged((kind) => {
  refreshSidebar();
  const r = ctx.route;
  if (!r) return;
  const dependsOnData = {
    types: ['browse', 'home', 'tags', 'tag', 'search', 'object', 'daily'],
    collections: ['browse'],
    objects: ['browse', 'home', 'tags', 'tag', 'tasks'],
    settings: [],
  }[kind] || [];
  if (dependsOnData.includes(r.name)) navigate({ ...r }, { push: false });
});

// Mouse back/forward buttons (XButton1 / XButton2).
window.addEventListener('mouseup', (e) => {
  if (e.button === 3) { e.preventDefault(); goBack(); }
  else if (e.button === 4) { e.preventDefault(); goForward(); }
});

// ---------- keyboard shortcuts ----------
const onObjectPage = () => ctx.route?.name === 'object' || ctx.route?.name === 'daily';
// editor-safe guard: Ctrl+I / Ctrl+Backspace mean italic / delete-word while typing
const inEditable = (e) => !!e.target.closest?.('input, textarea, [contenteditable], .milkdown');

function registerShortcuts() {
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const key = e.key.toLowerCase();

    if (key === 'k') { e.preventDefault(); togglePalette(); }
    else if (key === 'n' && !e.shiftKey) {
      e.preventDefault();
      window.vault.objects.create({ typeId: 'note', title: 'New Note' })
        .then((o) => { refreshSidebar(); navigate({ name: 'object', id: o.id }); });
    } else if (key === 'd') {
      e.preventDefault();
      navigate({ name: 'daily' });
    } else if (key === 'g' && e.shiftKey) {
      e.preventDefault();
      navigate({ name: 'graph' });
    } else if (key === 'f' && e.shiftKey) {
      e.preventDefault();
      navigate({ name: 'search' });
    } else if (key === '\\') {
      e.preventDefault();
      setSidebarCollapsed(!ui.sidebarCollapsed);
    } else if (key === '.') {
      e.preventDefault();
      setSidePanelOpen(!ui.sidePanelOpen);
    } else if (key === 'e' && e.shiftKey) {
      e.preventDefault();
      openExport();
    } else if (key === 'e' && onObjectPage() && !inEditable(e)) {
      e.preventDefault();
      window.vault.exportVault('pdf').then((res) => res && toast(`Saved ${res.file}`));
    } else if (key === 'i' && onObjectPage() && !inEditable(e)) {
      e.preventDefault();
      (async () => {
        const file = await window.vault.importTextFile();
        if (!file) return;
        const obj = await window.vault.objects.get(ctx.route.id);
        if (!obj) return;
        const existing = (obj.content || '').trim();
        await window.vault.objects.update(obj.id, {
          content: existing ? `${existing}\n\n${file.text}` : file.text,
        });
        toast(`Imported ${file.name}`);
        navigate({ ...ctx.route }, { push: false });
      })();
    } else if (key === 'p' && e.shiftKey && onObjectPage()) {
      e.preventDefault();
      (async () => {
        const obj = await window.vault.objects.get(ctx.route.id);
        if (!obj) return;
        await window.vault.objects.update(obj.id, { pinned: !obj.pinned });
        refreshSidebar();
        toast(obj.pinned ? 'Unpinned' : 'Pinned to sidebar');
        navigate({ ...ctx.route }, { push: false });
      })();
    } else if (key === 'backspace' && onObjectPage() && !inEditable(e)) {
      e.preventDefault();
      (async () => {
        const obj = await window.vault.objects.get(ctx.route.id);
        if (obj && await confirmDialog(`Move "${obj.title}" to the vault trash?`)) {
          await window.vault.objects.delete(obj.id);
          refreshSidebar();
          toast('Moved to trash');
          navigate({ name: 'home' });
        }
      })();
    } else if (key === ',') {
      e.preventDefault();
      openSettings();
    } else if (key === 'l') {
      const ed = getActiveEditor();
      if (ed) { e.preventDefault(); ed.openLinkPicker(); }
    } else if (key === 'o' && e.shiftKey) {
      const ed = getActiveEditor();
      if (ed) { e.preventDefault(); turnSelectionIntoObject(); }
    }
  });
}

// ---------- boot ----------
async function boot() {
  await loadCore();
  setTagOverrides(await window.vault.tags.colors());
  applyTheme(ctx.settings);

  // restore pinned tabs (titles refreshed from the store; stale ids dropped)
  for (const saved of ctx.settings.pinnedTabs || []) {
    const o = await window.vault.objects.get(saved.id);
    if (!o) continue;
    const t = typeOf(o.type);
    openObjectTab({
      id: o.id, title: o.title,
      icon: t?.icon || 'file-text', color: t?.color || '#888', pinned: true,
    });
  }
  lastPinnedJson = pinnedSnapshot();

  initSidebar();
  registerShortcuts();

  // re-render the open object if quick-capture (or anything external) changed it
  window.vault.onChanged(({ id }) => {
    if (ctx.route?.id === id) navigate({ ...ctx.route }, { push: false });
  });

  navigate({ name: 'home' });
}

boot().catch((err) => {
  console.error('Failed to start Vault', err);
  document.getElementById('content').textContent = String(err);
});
