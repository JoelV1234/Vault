// Editors for every supported Property kind. Each returns a DOM node and
// reports changes through onChange(newValue). This module is the feature's
// public entry; chip-style editors and display helpers live in siblings.
import { el } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { multiselectEditor, tagsEditor, relationEditor } from './chip-editors.js';
import { coverEditor, blocksEditor } from './media-editors.js';

export { PROP_KINDS, KIND_LABEL } from './prop-kinds.js';
export { propDisplay } from './prop-display.js';

export function propEditor(prop, value, onChange, types) {
  switch (prop.kind) {
    case 'textarea':
      return el('textarea', {
        class: 'prop-input', rows: 3, value: value || '',
        onchange: (e) => onChange(e.target.value),
      });
    case 'number':
      return el('input', {
        class: 'prop-input', type: 'number', value: value ?? '',
        onchange: (e) => onChange(e.target.value === '' ? null : Number(e.target.value)),
      });
    case 'checkbox':
      return el('label', { class: 'prop-check' },
        el('input', { type: 'checkbox', checked: !!value, onchange: (e) => onChange(e.target.checked) }),
        el('span', {}, prop.name));
    case 'date':
      return el('input', {
        class: 'prop-input', type: 'date', value: value || '',
        onchange: (e) => onChange(e.target.value || null),
      });
    case 'datetime':
      return el('input', {
        class: 'prop-input', type: 'datetime-local', value: value || '',
        onchange: (e) => onChange(e.target.value || null),
      });
    case 'cover':
      return coverEditor(value, onChange);
    case 'blocks':
      return blocksEditor(value, onChange);
    case 'daterange': {
      const v = value || {};
      const start = el('input', { class: 'prop-input', type: 'date', value: v.start || '' });
      const end = el('input', { class: 'prop-input', type: 'date', value: v.end || '' });
      const emit = () => onChange(start.value || end.value ? { start: start.value, end: end.value } : null);
      start.addEventListener('change', emit);
      end.addEventListener('change', emit);
      return el('div', { class: 'prop-range' }, start, el('span', { class: 'muted' }, '→'), end);
    }
    case 'select': {
      const sel = el('select', { class: 'prop-input', onchange: (e) => onChange(e.target.value || null) },
        el('option', { value: '' }, '—'),
        ...(prop.options || []).map((o) => {
          const opt = el('option', { value: o }, o);
          if (o === value) opt.selected = true;
          return opt;
        }));
      return sel;
    }
    case 'multiselect':
      return multiselectEditor(prop, value, onChange);
    case 'tags':
      return tagsEditor(value, onChange);
    case 'relation':
      return relationEditor(value, onChange, types);
    case 'url':
    case 'email':
    case 'text':
    default: {
      const input = el('input', {
        class: 'prop-input',
        type: prop.kind === 'url' ? 'url' : prop.kind === 'email' ? 'email' : 'text',
        value: value || '',
        onchange: (e) => onChange(e.target.value || null),
      });
      if (prop.kind === 'url' && value) {
        return el('div', { class: 'prop-url' }, input,
          el('button', {
            class: 'icon-btn', 'aria-label': 'Open link',
            onclick: () => window.vault.openExternal(value),
          }, icon('external-link', 14)));
      }
      return input;
    }
  }
}
