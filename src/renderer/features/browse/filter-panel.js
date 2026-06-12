// Capacities-style query builder: per-field filter rows with and/or connectors.
import { el, dropdown } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { OPS_BY_KIND, OP_LABEL } from './constants.js';

const KIND_ICON = {
  text: 'type', textarea: 'align-left', number: 'hash', checkbox: 'check-square',
  date: 'calendar', datetime: 'calendar-clock', daterange: 'calendar-range',
  select: 'tag', multiselect: 'tags', tags: 'tag', relation: 'link',
  url: 'link', email: 'mail', cover: 'image', blocks: 'layout',
};

const NO_VALUE_OPS = new Set(['is_empty', 'is_not_empty', 'is_checked', 'is_unchecked']);

export function buildFilterPanel(b) {
  const panel = el('div', { class: 'filter-panel' });

  const render = () => {
    panel.replaceChildren(
      ...b.state.filters.map(buildRow),
      el('div', { class: 'filter-footer' },
        el('button', { class: 'btn btn-ghost btn-small', onclick: () => addFilter() },
          icon('plus', 13), ' Filter'),
      ),
    );
  };

  const addFilter = (afterIdx = b.state.filters.length - 1) => {
    b.state.filters.splice(afterIdx + 1, 0, {
      id: String(Date.now()), field: b.fields[0].id,
      op: OPS_BY_KIND(b.fields[0].kind)[0], value: '', connector: 'and',
    });
    render();
    b.renderBody();
  };

  function buildRow(f, i) {
    const field = b.fields.find((x) => x.id === f.field) || b.fields[0];
    const ops = OPS_BY_KIND(field.kind);

    const connector = i === 0
      ? el('span', { class: 'filter-where' }, 'where')
      : el('button', {
          class: 'filter-connector-btn',
          onclick: (e) => dropdown(e.currentTarget, [
            { label: 'and', onClick: () => { f.connector = 'and'; render(); b.renderBody(); } },
            { label: 'or', onClick: () => { f.connector = 'or'; render(); b.renderBody(); } },
          ]),
        }, el('span', {}, f.connector), icon('chevron-down', 11));

    const fieldBtn = el('button', {
      class: 'filter-field-btn',
      onclick: (e) => dropdown(e.currentTarget, b.fields.map((fd) => ({
        label: fd.name, icon: KIND_ICON[fd.kind] || 'type',
        onClick: () => { f.field = fd.id; f.op = OPS_BY_KIND(fd.kind)[0]; f.value = ''; render(); b.renderBody(); },
      }))),
    }, icon(KIND_ICON[field.kind] || 'type', 13), el('span', {}, field.name), icon('chevron-down', 11));

    const opBtn = el('button', {
      class: 'filter-op-btn',
      onclick: (e) => dropdown(e.currentTarget, ops.map((op) => ({
        label: OP_LABEL[op] || op,
        onClick: () => { f.op = op; render(); b.renderBody(); },
      }))),
    }, el('span', {}, OP_LABEL[f.op] || f.op), icon('chevron-down', 11));

    const valueInput = NO_VALUE_OPS.has(f.op) ? null : el('input', {
      class: 'prop-input filter-value',
      placeholder: 'Value…',
      value: f.value || '',
      type: field.kind === 'number' ? 'number'
        : (field.kind === 'date' || field.kind === 'datetime') ? 'date' : 'text',
      oninput: (e) => { f.value = e.target.value; b.renderBody(); },
    });

    return el('div', { class: 'filter-row' },
      connector, fieldBtn, opBtn, valueInput,
      el('button', { class: 'icon-btn', title: 'Add filter below',
        onclick: () => addFilter(i) }, icon('plus', 14)),
      el('button', { class: 'icon-btn', title: 'Remove filter',
        onclick: () => { b.state.filters.splice(i, 1); render(); b.renderBody(); } }, icon('x', 14)),
    );
  }

  render();
  b.rebuildFilterPanel = render;
  return panel;
}
