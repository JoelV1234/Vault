// Object renderers for the browser: List / Table / Gallery + empty state.
// Right-click any row/card for open / remove-from-collection / trash.
import { el, fmtDate, dropdown, confirmDialog } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { refreshSidebar } from '../../shared/state.js';
import { propDisplay } from '../properties/props.js';

const rowMenu = (b, o) => (e) => {
  e.preventDefault();
  dropdown(e.currentTarget, [
    { label: 'Open', icon: 'arrow-up-right', onClick: () => b.open(o.id) },
    ...(b.collection ? [{
      label: 'Remove from collection', icon: 'archive',
      onClick: async () => {
        await window.vault.objects.update(o.id, {
          collections: (o.collections || []).filter((id) => id !== b.collection.id),
        });
        b.refresh();
      },
    }] : []),
    '-',
    {
      label: 'Move to trash', icon: 'trash-2', danger: true,
      onClick: async () => {
        if (await confirmDialog(`Move "${o.title}" to the vault trash?`)) {
          await window.vault.objects.delete(o.id);
          refreshSidebar();
          b.refresh();
        }
      },
    },
  ]);
};

export function renderList(b, list) {
  if (!list.length) return emptyState(b);
  const { type, open } = b;
  return el('div', { class: 'obj-list' }, list.map((o) =>
    el('button', { class: 'obj-row lift', onclick: () => open(o.id), oncontextmenu: rowMenu(b, o) },
      el('span', { class: 'type-chip', style: `--chip:${type.color}` }, icon(type.icon, 13)),
      el('span', { class: 'obj-row-title truncate' }, o.title),
      el('span', { class: 'muted small' }, fmtDate(o.updated)))));
}

export function renderTable(b, list) {
  if (!list.length) return emptyState(b);
  const { type, open } = b;
  const cols = type.props || [];
  return el('div', { class: 'table-wrap' }, el('table', { class: 'obj-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Title'),
      ...cols.map((p) => el('th', {}, p.name)),
      el('th', {}, 'Updated'))),
    el('tbody', {}, list.map((o) => el('tr', { onclick: () => open(o.id), tabindex: '0', role: 'button',
      onkeydown: (e) => e.key === 'Enter' && open(o.id),
      oncontextmenu: rowMenu(b, o) },
      el('td', { class: 'td-title' }, o.title),
      ...cols.map((p) => el('td', { class: 'muted' }, propDisplay(p, (o.props || {})[p.id]))),
      el('td', { class: 'muted small' }, fmtDate(o.updated)))))));
}

export function renderGallery(b, list) {
  if (!list.length) return emptyState(b);
  const { type, open } = b;
  return el('div', { class: 'gallery-grid' }, list.map((o) =>
    el('button', { class: 'card lift', onclick: () => open(o.id), oncontextmenu: rowMenu(b, o) },
      el('div', { class: 'card-head' },
        el('span', { class: 'type-chip', style: `--chip:${type.color}` }, icon(type.icon, 13)),
        el('span', { class: 'card-title' }, o.title)),
      el('div', { class: 'card-props' },
        ...(type.props || []).slice(0, 3)
          .map((p) => ({ p, v: propDisplay(p, (o.props || {})[p.id]) }))
          .filter(({ v }) => v)
          .map(({ p, v }) => el('div', { class: 'card-prop' },
            el('span', { class: 'muted' }, p.name), el('span', {}, v)))),
      el('div', { class: 'muted small' }, fmtDate(o.updated)))));
}

export function emptyState(b) {
  const { type, collection, state } = b;
  return el('div', { class: 'empty-state' },
    el('span', { class: 'type-chip type-chip-lg', style: `--chip:${type.color}` }, icon(type.icon, 18)),
    el('p', { class: 'muted' }, state.filters.length
      ? 'Nothing matches these filters.'
      : collection
        ? 'Empty collection — add objects from their page via the Collections button.'
        : `No ${type.name} objects yet.`));
}
