// Popover to toggle which collections (of this object's type) the object is in,
// plus inline creation of a new collection.
import { el } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, refreshSidebar } from '../../shared/state.js';

export function openCollectionsPopover(anchor, obj, onChanged) {
  document.querySelector('.menu')?.remove();
  const memberships = new Set(obj.collections || []);
  const panel = el('div', { class: 'menu collections-pop', role: 'dialog', 'aria-label': 'Collections' });

  const renderRows = () => {
    const cols = ctx.collections.filter((c) => c.typeId === obj.type);
    const rows = cols.length
      ? cols.map((c) => el('label', { class: 'col-row' },
        el('input', {
          type: 'checkbox', checked: memberships.has(c.id) ? true : undefined,
          onchange: async (e) => {
            e.target.checked ? memberships.add(c.id) : memberships.delete(c.id);
            obj.collections = [...memberships];
            await window.vault.objects.update(obj.id, { collections: obj.collections });
            onChanged();
          },
        }),
        icon('archive', 13),
        el('span', { class: 'truncate' }, c.name)))
      : [el('p', { class: 'muted small col-empty' }, 'No collections for this type yet.')];
    panel.replaceChildren(...rows, newRow);
  };

  const newInput = el('input', { class: 'prop-input', placeholder: 'New collection…' });
  newInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' || !newInput.value.trim()) return;
    const col = await window.vault.collections.save({ name: newInput.value.trim(), typeId: obj.type });
    ctx.collections = await window.vault.collections.list();
    memberships.add(col.id);
    obj.collections = [...memberships];
    await window.vault.objects.update(obj.id, { collections: obj.collections });
    newInput.value = '';
    onChanged();
    refreshSidebar();
    renderRows();
  });
  const newRow = el('div', { class: 'col-new' }, newInput);

  renderRows();
  const rect = anchor.getBoundingClientRect();
  panel.style.top = `${rect.bottom + 6}px`;
  panel.style.left = `${Math.min(rect.left, window.innerWidth - 260)}px`;
  const dismiss = (e) => {
    if (!panel.contains(e.target)) { panel.remove(); document.removeEventListener('mousedown', dismiss, true); }
  };
  document.addEventListener('mousedown', dismiss, true);
  document.getElementById('overlays').append(panel);
  newInput.focus();
}
