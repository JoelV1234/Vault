// Object Type editor: name, icon, color, and property schema.
import { el, modal, toast } from '../../shared/ui.js';
import { icon, ICON_CHOICES, COLOR_CHOICES } from '../../shared/icons.js';
import { ctx, refreshSidebar } from '../../shared/state.js';
import { PROP_KINDS } from '../properties/props.js';

export function openTypeEditor(type) {
  const draft = type
    ? structuredClone(type)
    : { name: '', icon: 'file-text', color: COLOR_CHOICES[0], props: [] };

  const nameInput = el('input', {
    class: 'prop-input', placeholder: 'Type name (e.g. Recipe)', value: draft.name,
    oninput: (e) => { draft.name = e.target.value; },
  });

  const iconGrid = el('div', { class: 'icon-grid', role: 'radiogroup', 'aria-label': 'Icon' });
  for (const name of ICON_CHOICES) {
    const b = el('button', {
      class: `icon-cell ${draft.icon === name ? 'on' : ''}`, 'aria-label': name,
      onclick: () => {
        iconGrid.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        draft.icon = name;
      },
    }, icon(name, 17));
    iconGrid.append(b);
  }

  const colorRow = el('div', { class: 'chip-row' });
  for (const c of COLOR_CHOICES) {
    const b = el('button', {
      class: `color-swatch ${draft.color === c ? 'on' : ''}`, style: `--chip:${c}`, 'aria-label': c,
      onclick: () => {
        colorRow.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        draft.color = c;
      },
    });
    colorRow.append(b);
  }

  const propList = el('div', { class: 'prop-rows' });
  const renderProps = () => {
    propList.replaceChildren(...draft.props.map((p, i) => el('div', { class: 'prop-row-edit' },
      el('input', {
        class: 'prop-input', placeholder: 'Property name', value: p.name,
        oninput: (e) => { p.name = e.target.value; },
      }),
      el('select', {
        class: 'prop-input prop-kind', 'aria-label': 'Property type',
        onchange: (e) => { p.kind = e.target.value; renderProps(); },
      }, ...PROP_KINDS.map((k) => {
        const o = el('option', { value: k.id }, k.label);
        if (p.kind === k.id) o.selected = true;
        return o;
      })),
      ['select', 'multiselect'].includes(p.kind)
        ? el('input', {
          class: 'prop-input', placeholder: 'Options, comma separated',
          value: (p.options || []).join(', '),
          oninput: (e) => { p.options = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); },
        })
        : el('span', {}),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Remove property',
        onclick: () => { draft.props.splice(i, 1); renderProps(); },
      }, icon('trash-2', 15)),
    )));
  };
  renderProps();

  const body = el('div', { class: 'modal-body' },
    el('div', { class: 'form-row' }, el('label', {}, 'Name'), nameInput),
    el('div', { class: 'form-row' }, el('label', {}, 'Icon'), iconGrid),
    el('div', { class: 'form-row' }, el('label', {}, 'Color'), colorRow),
    el('div', { class: 'form-row form-col' },
      el('label', {}, 'Properties'),
      propList,
      el('button', {
        class: 'btn btn-small',
        onclick: () => {
          draft.props.push({ id: crypto.randomUUID().slice(0, 8), name: '', kind: 'text' });
          renderProps();
        },
      }, '+ Add property')),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-primary', onclick: async () => {
        if (!draft.name.trim()) { toast('Give the type a name', 'warn'); return; }
        await window.vault.types.save(draft);
        ctx.types = await window.vault.types.list();
        m.close();
        refreshSidebar();
        toast(`Type "${draft.name}" saved`);
      } }, type ? 'Save type' : 'Create type')),
  );
  const m = modal({ title: type ? `Edit ${type.name}` : 'New object type', body, wide: true });
}
