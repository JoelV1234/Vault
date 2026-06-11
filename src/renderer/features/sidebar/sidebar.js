// Capacities-style sidebar: nav, Pinned, Object types (with nested
// collections), and a bottom utility row.
import { el, dropdown, confirmDialog, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, navigate, refreshSidebar, onSidebarRefresh, applyTheme } from '../../shared/state.js';
import { openTypeEditor, openDeleteType, openSettings, openExport, openNewCollection } from '../modals/modals.js';

export function initSidebar() {
  onSidebarRefresh(render);
  render();
}

async function render() {
  const sidebar = document.getElementById('sidebar');
  const pinned = (await window.vault.objects.list({})).filter((o) => o.pinned);
  const active = ctx.route || {};

  const navItem = (label, iconName, route, isActive) =>
    el('button', {
      class: `side-item ${isActive ? 'active' : ''}`,
      onclick: () => navigate(route),
      'aria-current': isActive ? 'page' : undefined,
    }, icon(iconName, 17), el('span', {}, label));

  const nav = el('nav', { class: 'side-nav', 'aria-label': 'Main' },
    navItem('Home', 'home', { name: 'home' }, active.name === 'home'),
    navItem('Daily notes', 'calendar-days', { name: 'daily' }, active.name === 'daily'),
    navItem('Graph', 'waypoints', { name: 'graph' }, active.name === 'graph'),
    navItem('Tags', 'tag', { name: 'tags' }, active.name === 'tags' || active.name === 'tag'),
    navItem('Tasks', 'check-square', { name: 'tasks' }, active.name === 'tasks'),
    navItem('Search', 'search', { name: 'search' }, active.name === 'search'),
  );

  // ----- pinned -----
  const pinnedSection = el('div', { class: 'side-section' });
  if (pinned.length) {
    pinnedSection.append(el('div', { class: 'side-heading' }, icon('pin', 13), el('span', {}, 'Pinned')));
    for (const o of pinned) {
      const t = ctx.types.find((x) => x.id === o.type);
      pinnedSection.append(el('button', {
        class: `side-item ${active.name === 'object' && active.id === o.id ? 'active' : ''}`,
        onclick: () => navigate({ name: 'object', id: o.id }),
      },
        el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 13)),
        el('span', { class: 'truncate' }, o.title)));
    }
  }

  // ----- object types + collections -----
  const typesSection = el('div', { class: 'side-section' },
    el('div', { class: 'side-heading' },
      icon('layout-grid', 13), el('span', {}, 'Object types'),
      el('button', {
        class: 'icon-btn side-heading-btn', 'aria-label': 'New object type',
        onclick: () => openTypeEditor(null),
      }, icon('plus', 14))));

  for (const t of ctx.types.filter((t) => t.id !== 'daily')) {
    const isActive = active.name === 'browse' && active.typeId === t.id && !active.collectionId;
    const row = el('button', {
      class: `side-item ${isActive ? 'active' : ''}`,
      onclick: () => navigate({ name: 'browse', typeId: t.id }),
      oncontextmenu: (e) => {
        e.preventDefault();
        dropdown(row, [
          { label: `New ${t.name}`, icon: 'plus', onClick: async () => {
            const o = await window.vault.objects.create({ typeId: t.id, title: `New ${t.name}` });
            refreshSidebar(); navigate({ name: 'object', id: o.id });
          } },
          { label: 'New collection', icon: 'archive', onClick: () => openNewCollection(t.id) },
          { label: 'Customize type', icon: 'settings-2', onClick: () => openTypeEditor(t) },
          ...(['note', 'daily'].includes(t.id) ? [] : ['-',
            { label: 'Delete type', icon: 'trash-2', danger: true, onClick: () => openDeleteType(t) }]),
        ]);
      },
    },
      el('span', { class: 'type-chip', style: `--chip:${t.color}` }, icon(t.icon, 13)),
      el('span', { class: 'truncate' }, t.name));
    typesSection.append(row);

    for (const c of ctx.collections.filter((c) => c.typeId === t.id)) {
      const colActive = active.name === 'browse' && active.collectionId === c.id;
      typesSection.append(el('button', {
        class: `side-item side-sub ${colActive ? 'active' : ''}`,
        onclick: () => navigate({ name: 'browse', typeId: t.id, collectionId: c.id }),
        oncontextmenu: async (e) => {
          e.preventDefault();
          if (await confirmDialog(`Delete collection "${c.name}"?`)) {
            await window.vault.collections.delete(c.id);
            ctx.collections = await window.vault.collections.list();
            refreshSidebar();
          }
        },
      }, icon('archive', 14), el('span', { class: 'truncate' }, c.name)));
    }
  }

  // ----- bottom utility row -----
  const themeToggle = el('button', {
    class: 'icon-btn', 'aria-label': 'Toggle light/dark theme',
    onclick: async () => {
      const next = ctx.settings.theme === 'dark' ? 'light' : 'dark';
      ctx.settings = await window.vault.settings.set({ theme: next });
      applyTheme(ctx.settings);
    },
  }, icon(ctx.settings.theme === 'dark' ? 'sun' : 'moon', 17));

  const bottom = el('div', { class: 'side-bottom' },
    el('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: () => openSettings() }, icon('settings', 17)),
    themeToggle,
    el('div', { class: 'flex-spacer' }),
    el('button', { class: 'icon-btn', 'aria-label': 'Export vault', onclick: () => openExport() }, icon('share', 17)),
  );

  const head = el('div', { class: 'side-head' },
    el('span', { class: 'wordmark' }, icon('box', 18), el('span', {}, 'Vault')),
    el('button', {
      class: 'icon-btn', 'aria-label': 'Collapse sidebar',
      onclick: () => document.getElementById('app').classList.toggle('sidebar-collapsed'),
    }, icon('panel-left-close', 16)));

  sidebar.replaceChildren(head, el('div', { class: 'side-scroll' }, nav, pinnedSection, typesSection), bottom);
}
