// Capacities-style property rows on the object page: muted label on the
// left, value editor on the right. Default properties (Creation date,
// Description, Aliases, Icon) come first, then the type's own properties.
import { el, fmtDateTime } from '../../shared/ui.js';
import { ctx } from '../../shared/state.js';
import { propEditor } from '../properties/props.js';

const save = (obj, patch) => window.vault.objects.update(obj.id, patch);

function aliasesEditor(obj) {
  const aliases = [...(obj.aliases || [])];
  const wrap = el('div', { class: 'chip-row' });
  const render = () => {
    wrap.replaceChildren(
      ...aliases.map((a, i) => el('span', { class: 'chip' },
        el('span', {}, a),
        el('button', {
          class: 'chip-x', 'aria-label': `Remove alias ${a}`,
          onclick: () => { aliases.splice(i, 1); render(); save(obj, { aliases: [...aliases] }); },
        }, '×'))),
      input);
  };
  const input = el('input', {
    class: 'chip-input', placeholder: '+ alias',
    onkeydown: (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        aliases.push(e.target.value.trim());
        e.target.value = '';
        render();
        save(obj, { aliases: [...aliases] });
      }
    },
  });
  render();
  return wrap;
}

export function buildPropertyRows(obj, type, { onCoverChange } = {}) {
  const row = (label, control) => el('div', { class: 'obj-prop-row' },
    el('span', { class: 'obj-prop-label' }, label),
    el('div', { class: 'obj-prop-value' }, control));

  const rows = [
    row('Creation date', el('span', { class: 'obj-prop-static' }, fmtDateTime(obj.created))),
    row('Description', el('input', {
      class: 'prop-input prop-inline', placeholder: 'Add a description…',
      value: obj.description || '',
      onchange: (e) => { obj.description = e.target.value; save(obj, { description: obj.description }); },
    })),
    row('Aliases', aliasesEditor(obj)),
    row('Icon', el('input', {
      class: 'prop-input prop-inline prop-emoji', placeholder: '😀', maxlength: '4',
      value: obj.icon || '',
      onchange: (e) => { obj.icon = e.target.value.trim() || null; save(obj, { icon: obj.icon }); },
    })),
  ];

  for (const p of type?.props || []) {
    const editor = propEditor(p, obj.props[p.id], (v) => {
      obj.props[p.id] = v;
      save(obj, { props: { [p.id]: v } });
      if (p.kind === 'cover') onCoverChange?.(v);
    }, ctx.types);
    rows.push(row(p.name, editor));
  }

  return el('div', { class: 'obj-props' }, ...rows);
}

/** First cover-kind property value, if the type has one set on this object. */
export function coverValue(obj, type) {
  const p = (type?.props || []).find((x) => x.kind === 'cover');
  return p ? obj.props[p.id] : null;
}
