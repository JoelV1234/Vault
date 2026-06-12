// Object Type customization (Capacities-style): icon, name, plural, color,
// description, property schema, and cascade delete.
// Existing types auto-save on every change; only brand-new types need the
// explicit Create button (they can't be saved without a name).
import { el, modal, toast, debounce } from '../../shared/ui.js';
import { icon, ICON_CHOICES, COLOR_CHOICES } from '../../shared/icons.js';
import { reloadTypes } from '../../shared/state.js';
import { buildPropsEditor } from './type-props-editor.js';
import { openDeleteType } from './delete-type.js';

export function openTypeEditor(type) {
  const draft = type
    ? structuredClone(type)
    : { name: '', plural: '', description: '', icon: 'file-text', color: COLOR_CHOICES[0], props: [] };

  // ----- auto-save (existing types only) -----
  const saveStatus = el('span', { class: 'muted small te-save-status' },
    type ? 'Changes are saved automatically' : '');
  const saveNow = async () => {
    if (!type) return;
    if (!draft.name.trim()) { saveStatus.textContent = 'Name required — not saved'; return; }
    await window.vault.types.save(draft);
    await reloadTypes();
    saveStatus.textContent = 'Saved';
  };
  const scheduleSave = debounce(saveNow, 350);
  const touched = () => { if (type) { saveStatus.textContent = 'Saving…'; scheduleSave(); } };

  // ----- live preview chip -----
  const chipIcon = el('span', {}, icon(draft.icon, 14));
  const chipName = el('span', {}, draft.name || 'Object');
  const chip = el('span', { class: 'type-pill te-chip', style: `--chip:${draft.color}` }, chipIcon, chipName);
  const refreshChip = () => {
    chipIcon.replaceChildren(icon(draft.icon, 14));
    chipName.textContent = draft.name || 'Object';
    chip.style.setProperty('--chip', draft.color);
  };

  // ----- identity fields -----
  const nameInput = el('input', {
    class: 'prop-input', placeholder: 'Object', value: draft.name,
    oninput: (e) => { draft.name = e.target.value; refreshChip(); touched(); },
  });
  const pluralInput = el('input', {
    class: 'prop-input', placeholder: 'Objects', value: draft.plural || '',
    oninput: (e) => { draft.plural = e.target.value; touched(); },
  });
  const descInput = el('input', {
    class: 'prop-input', placeholder: 'Your description for this object type',
    value: draft.description || '',
    oninput: (e) => { draft.description = e.target.value; touched(); },
  });

  // ----- icon picker (square button toggling the grid) -----
  const iconGrid = el('div', { class: 'icon-grid', role: 'radiogroup', 'aria-label': 'Icon', hidden: true });
  for (const name of ICON_CHOICES) {
    const b = el('button', {
      class: `icon-cell ${draft.icon === name ? 'on' : ''}`, 'aria-label': name,
      onclick: () => {
        iconGrid.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        draft.icon = name;
        iconBtn.replaceChildren(icon(name, 17));
        iconGrid.hidden = true;
        refreshChip();
        touched();
      },
    }, icon(name, 17));
    iconGrid.append(b);
  }
  const iconBtn = el('button', {
    class: 'te-square-btn', 'aria-label': 'Choose icon', title: 'Icon',
    onclick: () => { iconGrid.hidden = !iconGrid.hidden; colorRow.hidden = true; },
  }, icon(draft.icon, 17));

  // ----- color picker (swatch button toggling the row) -----
  const colorRow = el('div', { class: 'chip-row', hidden: true });
  for (const c of COLOR_CHOICES) {
    const b = el('button', {
      class: `color-swatch ${draft.color === c ? 'on' : ''}`, style: `--chip:${c}`, 'aria-label': c,
      onclick: () => {
        colorRow.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        draft.color = c;
        colorBtn.style.setProperty('--chip', c);
        colorRow.hidden = true;
        refreshChip();
        touched();
      },
    });
    colorRow.append(b);
  }
  const colorBtn = el('button', {
    class: 'te-square-btn te-color-btn', style: `--chip:${draft.color}`,
    'aria-label': 'Choose color', title: 'Color',
    onclick: () => { colorRow.hidden = !colorRow.hidden; iconGrid.hidden = true; },
  }, icon('palette', 16));

  const field = (label, control) => el('div', { class: 'te-field' },
    el('label', { class: 'te-label' }, label), control);

  const canDelete = type && !['note', 'daily'].includes(type.id);

  const body = el('div', { class: 'modal-body te-body' },
    chip,
    el('div', { class: 'te-grid' },
      field('Icon', iconBtn),
      field('Name', nameInput),
      field('Plural of name', pluralInput)),
    iconGrid,
    el('div', { class: 'te-grid te-grid-2' },
      field('Color', colorBtn),
      field('Description', descInput)),
    colorRow,
    el('hr', { class: 'sep' }),
    buildPropsEditor(draft, touched),
    el('div', { class: 'modal-actions te-actions' },
      canDelete
        ? el('button', {
          class: 'btn btn-danger-ghost',
          onclick: () => { m.close(); openDeleteType(type); },
        }, icon('trash-2', 14), ' Delete object type')
        : el('span', {}),
      el('div', { class: 'flex-spacer' }),
      saveStatus,
      type ? null : el('button', { class: 'btn btn-primary', onclick: async () => {
        if (!draft.name.trim()) { toast('Give the type a name', 'warn'); return; }
        await window.vault.types.save(draft);
        m.close();
        await reloadTypes();
        toast(`Type "${draft.name}" created`);
      } }, 'Create type')),
  );
  const m = modal({
    title: type ? `Customize ${type.name}` : 'New object type',
    body,
    wide: true,
    onClose: () => { if (type) scheduleSave.flush?.(); },
  });
}
