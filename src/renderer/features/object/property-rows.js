// Capacities-style property rows: muted label | value editor.
// Only the Description row lives here — Icon and Aliases are in the header.
import { el } from '../../shared/ui.js';

const save = (obj, patch) => window.vault.objects.update(obj.id, patch);

export function buildPropertyRows(obj) {
  const row = (label, control) => el('div', { class: 'obj-prop-row' },
    el('span', { class: 'obj-prop-label' }, label),
    el('div', { class: 'obj-prop-value' }, control));

  return el('div', { class: 'obj-props' },
    row('Description', el('input', {
      class: 'prop-input prop-inline', placeholder: 'Add a description…',
      value: obj.description || '',
      onchange: (e) => { obj.description = e.target.value; save(obj, { description: obj.description }); },
    })),
  );
}

/** First cover-kind property value, if the type has one set on this object. */
export function coverValue(obj, type) {
  const p = (type?.props || []).find((x) => x.kind === 'cover');
  return p ? (obj.props || {})[p.id] : null;
}
