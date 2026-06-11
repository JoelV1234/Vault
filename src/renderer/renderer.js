// App bootstrap: routing, topbar, global keyboard shortcuts.
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './styles.css';

import { el, setTagOverrides, toast, confirmDialog } from './shared/ui.js';
import { icon } from './shared/icons.js';
import { ctx, loadCore, navigate, onNavigate, applyTheme, refreshSidebar } from './shared/state.js';
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

function setTopbar(title) {
  const topbar = document.getElementById('topbar');
  topbar.replaceChildren(
    el('div', { class: 'topbar-title truncate' }, title),
    el('div', { class: 'flex-spacer' }),
    el('button', {
      class: 'btn btn-ghost btn-small', 'aria-label': 'Open command palette',
      onclick: () => togglePalette(),
    }, icon('command', 13), el('kbd', { class: 'kbd' }, 'K')),
    el('button', {
      class: 'icon-btn', 'aria-label': 'Toggle side panel',
      onclick: () => {
        const p = document.getElementById('sidepanel');
        p.hidden = !p.hidden;
      },
    }, icon('panel-right', 16)));
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
  refreshSidebar();
  content.focus({ preventScroll: true });
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
      document.getElementById('app').classList.toggle('sidebar-collapsed');
    } else if (key === '.') {
      e.preventDefault();
      const p = document.getElementById('sidepanel');
      p.hidden = !p.hidden;
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
