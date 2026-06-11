// Object renderers for the browser: List / Table / Gallery + empty state.
import { el, fmtDate } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { propDisplay } from '../properties/props.js';

export function renderList(b, list) {
  if (!list.length) return emptyState(b);
  const { type, open } = b;
  return el('div', { class: 'obj-list' }, list.map((o) =>
    el('button', { class: 'obj-row lift', onclick: () => open(o.id) },
      el('span', { class: 'type-chip', style: `--chip:${type.color}` }, icon(type.icon, 13)),
      el('span', { class: 'obj-row-title truncate' }, o.title),
      el('span', { class: 'muted small' }, fmtDate(o.updated)))));
}

export function renderTable(b, list) {
  if (!list.length) return emptyState(b);
  const { type, open } = b;
  const cols = type.props;
  return el('div', { class: 'table-wrap' }, el('table', { class: 'obj-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Title'),
      ...cols.map((p) => el('th', {}, p.name)),
      el('th', {}, 'Updated'))),
    el('tbody', {}, list.map((o) => el('tr', { onclick: () => open(o.id), tabindex: '0', role: 'button',
      onkeydown: (e) => e.key === 'Enter' && open(o.id) },
      el('td', { class: 'td-title' }, o.title),
      ...cols.map((p) => el('td', { class: 'muted' }, propDisplay(p, o.props[p.id]))),
      el('td', { class: 'muted small' }, fmtDate(o.updated)))))));
}

export function renderGallery(b, list) {
  if (!list.length) return emptyState(b);
  const { type, open } = b;
  return el('div', { class: 'gallery-grid' }, list.map((o) =>
    el('button', { class: 'card lift', onclick: () => open(o.id) },
      el('div', { class: 'card-head' },
        el('span', { class: 'type-chip', style: `--chip:${type.color}` }, icon(type.icon, 13)),
        el('span', { class: 'card-title' }, o.title)),
      el('div', { class: 'card-props' },
        ...type.props.slice(0, 3)
          .map((p) => ({ p, v: propDisplay(p, o.props[p.id]) }))
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
