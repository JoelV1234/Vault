// Capacities-style sidebar: nav, Pinned, Object types (with nested
// collections), and a bottom utility row.
import { el, dropdown, confirmDialog, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, navigate, refreshSidebar, onSidebarRefresh, applyTheme, reloadCollections, setSettings } from '../../shared/state.js';
import { openTypeEditor, openDeleteType, openSettings, openExport, openNewCollection, openTrash } from '../modals/modals.js';

// Types whose collection list is folded shut; persisted in settings.
let collapsedTypes = null;

export function initSidebar() {
  onSidebarRefresh(render);
  render();
}

async function toggleTypeCollapse(typeId) {
  if (collapsedTypes.has(typeId)) collapsedTypes.delete(typeId);
  else collapsedTypes.add(typeId);
  render();
  setSettings(await window.vault.settings.set({ collapsedTypes: [...collapsedTypes] }));
}

async function render() {
  const sidebar = document.getElementById('sidebar');
  const pinned = (await window.vault.objects.list({})).filter((o) => o.pinned);
  const active = ctx.route || {};
  if (collapsedTypes === null) collapsedTypes = new Set(ctx.settings.collapsedTypes || []);

  const navItem = (label, iconName, route, isActive) =>
    el('button', {
      class: `side-item ${isActive ? 'active' : ''}`,
      onclick: () => navigate(route),
      'aria-current': isActive ? 'page' : undefined,
    }, icon(iconName, 17), el('span', {}, label));

  const nav = el('nav', { class: 'side-nav', 'aria-label': 'Main' },
    navItem('Home', 'home', { name: 'home' }, active.name === 'home'),
    navItem('Graph', 'waypoints', { name: 'graph' }, active.name === 'graph'),
    navItem('Tags', 'tag', { name: 'tags' }, active.name === 'tags' || active.name === 'tag'),
    navItem('Tasks', 'check-square', { name: 'tasks' }, active.name === 'tasks'),
    navItem('Search', 'search', { name: 'search' }, active.name === 'search'),
  );

  // ----- pinned (objects + vault-pinned collections) -----
  const pinnedCols = ctx.collections.filter((c) => c.pinnedToVault);
  const pinnedSection = el('div', { class: 'side-section' });
  if (pinned.length || pinnedCols.length) {
    pinnedSection.append(el('div', { class: 'side-heading' }, icon('pin', 13), el('span', {}, 'Pinned')));
    for (const c of pinnedCols) {
      const t = ctx.types.find((x) => x.id === c.typeId);
      pinnedSection.append(el('button', {
        class: `side-item ${active.name === 'browse' && active.collectionId === c.id ? 'active' : ''}`,
        onclick: () => navigate({ name: 'browse', typeId: c.typeId, collectionId: c.id }),
      },
        el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon('archive', 13)),
        el('span', { class: 'truncate' }, c.name)));
    }
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

  // hover ⋯ / caret controls shared by type and collection rows
  const hoverBtn = (cls, label, iconName, onActivate, extra = {}) => el('span', {
    class: cls, role: 'button', tabindex: '0', 'aria-label': label, ...extra,
    onclick: (e) => { e.stopPropagation(); onActivate(e); },
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onActivate(e); }
    },
  }, icon(iconName, 13));

  const typeMenuItems = (t) => [
    { label: `New ${t.name}`, icon: 'plus', onClick: async () => {
      const o = await window.vault.objects.create({ typeId: t.id, title: `New ${t.name}` });
      refreshSidebar(); navigate({ name: 'object', id: o.id });
    } },
    { label: 'New collection', icon: 'archive', onClick: () => openNewCollection(t.id) },
    { label: 'Customize type', icon: 'settings-2', onClick: () => openTypeEditor(t) },
    ...(['note', 'daily'].includes(t.id) ? [] : ['-',
      { label: 'Delete type', icon: 'trash-2', danger: true, onClick: () => openDeleteType(t) }]),
  ];

  const togglePin = (c, key) => async () => {
    await window.vault.collections.save({ ...c, [key]: !c[key] });
    await reloadCollections();
  };
  const collectionMenuItems = (t, c) => [
    {
      label: c.pinnedToVault ? 'Unpin from vault' : 'Pin to vault',
      icon: c.pinnedToVault ? 'pin-off' : 'pin', onClick: togglePin(c, 'pinnedToVault'),
    },
    {
      label: c.pinnedToType ? `Unpin from ${t.name}` : `Pin to ${t.name}`,
      icon: c.pinnedToType ? 'pin-off' : 'pin', onClick: togglePin(c, 'pinnedToType'),
    },
    '-',
    { label: 'Delete collection', icon: 'trash-2', danger: true, onClick: async () => {
      if (await confirmDialog(`Delete collection "${c.name}"?`)) {
        await window.vault.collections.delete(c.id);
        await reloadCollections();
      }
    } },
  ];

  for (const t of ctx.types.filter((t) => t.id !== 'daily')) {
    const isActive = active.name === 'browse' && active.typeId === t.id && !active.collectionId;
    const typeCols = ctx.collections
      .filter((c) => c.typeId === t.id)
      .sort((a, c) => !!c.pinnedToType - !!a.pinnedToType);
    const collapsed = collapsedTypes.has(t.id);

    const row = el('button', {
      class: `side-item ${isActive ? 'active' : ''}`,
      onclick: () => navigate({ name: 'browse', typeId: t.id }),
      oncontextmenu: (e) => { e.preventDefault(); dropdown(row, typeMenuItems(t)); },
    },
      el('span', { class: 'type-chip', style: `--chip:${t.color}` }, icon(t.icon, 13)),
      el('span', { class: 'truncate side-label' }, t.name),
      hoverBtn('side-menu-btn', `${t.name} menu`, 'more-horizontal',
        (e) => dropdown(e.currentTarget, typeMenuItems(t))),
      typeCols.length ? hoverBtn('side-caret',
        collapsed ? `Expand ${t.name} collections` : `Collapse ${t.name} collections`,
        collapsed ? 'chevron-right' : 'chevron-down',
        () => toggleTypeCollapse(t.id),
        { 'aria-expanded': String(!collapsed) }) : null);
    typesSection.append(row);

    if (!collapsed) {
      for (const c of typeCols) {
        const colActive = active.name === 'browse' && active.collectionId === c.id;
        const colRow = el('button', {
          class: `side-item side-sub ${colActive ? 'active' : ''}`,
          onclick: () => navigate({ name: 'browse', typeId: t.id, collectionId: c.id }),
          oncontextmenu: (e) => { e.preventDefault(); dropdown(colRow, collectionMenuItems(t, c)); },
        }, icon('archive', 14), el('span', { class: 'truncate side-label' }, c.name),
          c.pinnedToType || c.pinnedToVault ? icon('pin', 11, 'side-pin') : null,
          hoverBtn('side-menu-btn', `${c.name} menu`, 'more-horizontal',
            (e) => dropdown(e.currentTarget, collectionMenuItems(t, c))));
        typesSection.append(colRow);
      }
    }
  }

  // ----- bottom utility row -----
  const themeToggle = el('button', {
    class: 'icon-btn', 'aria-label': 'Toggle light/dark theme',
    onclick: async () => {
      const next = ctx.settings.theme === 'dark' ? 'light' : 'dark';
      setSettings(await window.vault.settings.set({ theme: next }));
      applyTheme(ctx.settings);
    },
  }, icon(ctx.settings.theme === 'dark' ? 'sun' : 'moon', 17));

  const bottom = el('div', { class: 'side-bottom' },
    el('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: () => openSettings() }, icon('settings', 17)),
    themeToggle,
    el('div', { class: 'flex-spacer' }),
    el('button', { class: 'icon-btn', 'aria-label': 'Trash', onclick: () => openTrash() }, icon('trash', 17)),
    el('button', { class: 'icon-btn', 'aria-label': 'Export vault', onclick: () => openExport() }, icon('share', 17)),
  );

  const head = el('div', { class: 'side-head' },
    el('span', { class: 'wordmark' }, icon('box', 18), el('span', {}, 'Vault')));

  const oldScroll = sidebar.querySelector('.side-scroll');
  const oldScrollTop = oldScroll ? oldScroll.scrollTop : 0;

  const scrollContainer = el('div', { class: 'side-scroll' }, nav, pinnedSection, typesSection);
  sidebar.replaceChildren(head, scrollContainer, bottom);
  scrollContainer.scrollTop = oldScrollTop;
}
