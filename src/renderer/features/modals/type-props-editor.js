// Properties section of the type editor: fixed default properties first
// (every object has them), then the type's own editable properties.
import { el } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { PROP_KINDS, KIND_LABEL } from '../properties/props.js';

const DEFAULT_PROPS = [
  { name: 'Title', icon: 'type', kind: null },
  { name: 'Description', icon: 'text', kind: null },
  { name: 'Aliases', icon: 'at-sign', kind: null },
  { name: 'Icon', icon: 'smile', kind: null },
  { name: 'Created at', icon: 'calendar-days', kind: 'Datetime' },
  { name: 'Tags', icon: 'tag', kind: null },
  { name: 'Content', icon: 'list', kind: 'Blocks' },
];

export function buildPropsEditor(draft) {
  const list = el('div', { class: 'prop-rows' });

  const defaultRows = DEFAULT_PROPS.map((p) => el('div', { class: 'te-prop-row te-prop-default' },
    el('span', { class: 'te-prop-grip muted' }, icon('grip-vertical', 14)),
    icon(p.icon, 15),
    el('span', { class: 'te-prop-name' }, p.name),
    p.kind ? el('span', { class: 'kind-badge' }, p.kind) : null));

  const render = () => {
    const rows = draft.props.map((p, i) => el('div', { class: 'prop-row-edit' },
      el('input', {
        class: 'prop-input', placeholder: 'Property name', value: p.name,
        oninput: (e) => { p.name = e.target.value; },
      }),
      el('select', {
        class: 'prop-input prop-kind', 'aria-label': 'Property type',
        onchange: (e) => { p.kind = e.target.value; render(); },
      }, ...PROP_KINDS.map((k) => {
        const o = el('option', { value: k.id }, k.label);
        if (p.kind === k.id) o.selected = true;
        return o;
      }),
      // keep legacy kinds selectable on properties that already use them
      ...(PROP_KINDS.some((k) => k.id === p.kind) ? [] : [(() => {
        const o = el('option', { value: p.kind }, KIND_LABEL(p.kind));
        o.selected = true;
        return o;
      })()])),
      ['select', 'multiselect'].includes(p.kind)
        ? el('input', {
          class: 'prop-input', placeholder: 'Options, comma separated',
          value: (p.options || []).join(', '),
          oninput: (e) => { p.options = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); },
        })
        : el('span', {}),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Move up', disabled: i === 0 ? true : undefined,
        onclick: () => { [draft.props[i - 1], draft.props[i]] = [draft.props[i], draft.props[i - 1]]; render(); },
      }, icon('chevron-up', 14)),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Move down', disabled: i === draft.props.length - 1 ? true : undefined,
        onclick: () => { [draft.props[i + 1], draft.props[i]] = [draft.props[i], draft.props[i + 1]]; render(); },
      }, icon('chevron-down', 14)),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Remove property',
        onclick: () => { draft.props.splice(i, 1); render(); },
      }, icon('trash-2', 15)),
    ));
    list.replaceChildren(...defaultRows, ...rows);
  };
  render();

  return el('div', { class: 'te-props' },
    el('h3', { class: 'te-heading' }, 'Properties'),
    el('p', { class: 'muted small' }, 'Add, remove, and customize the properties of this object type.'),
    list,
    el('button', {
      class: 'btn btn-small',
      onclick: () => {
        draft.props.push({ id: crypto.randomUUID().slice(0, 8), name: '', kind: 'text' });
        render();
      },
    }, icon('plus', 14), ' Add Property'));
}
