// Cascade-delete confirmation for an Object Type: shows exactly how many
// objects and collections will go with it, with expandable lists of each.
import { el, modal, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, refreshSidebar, navigate } from '../../shared/state.js';

function expander(countLine, items, renderItem, showLabel) {
  const listHost = el('div', { class: 'del-list', hidden: true });
  const toggle = el('button', {
    class: 'link-btn small',
    onclick: () => {
      listHost.hidden = !listHost.hidden;
      toggle.textContent = listHost.hidden ? showLabel : 'Hide';
    },
  }, showLabel);
  listHost.append(...(items.length
    ? items.map((it) => el('div', { class: 'del-list-item truncate' }, renderItem(it)))
    : [el('div', { class: 'muted small' }, 'None.')]));
  return el('div', { class: 'del-section' },
    el('div', { class: 'del-line' },
      icon('alert-triangle', 14),
      el('span', {}, countLine),
      items.length ? toggle : null),
    listHost);
}

export async function openDeleteType(type) {
  const usage = await window.vault.types.usage(type.id);
  if (!usage.deletable) {
    toast(`The "${type.name}" type is required by the app and can't be deleted`, 'warn');
    return;
  }

  const body = el('div', { class: 'modal-body' },
    el('p', { class: 'muted' },
      `Deleting "${type.name}" permanently removes the type and everything in it. Objects are moved to the vault trash folder; collections are removed.`),
    expander(
      `${usage.objects.length} object${usage.objects.length === 1 ? '' : 's'} will be deleted.`,
      usage.objects, (o) => o.title, 'Show objects'),
    expander(
      `${usage.collections.length} collection${usage.collections.length === 1 ? '' : 's'} will be deleted.`,
      usage.collections, (c) => c.name, 'Show collections'),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn', onclick: () => m.close() }, 'Cancel'),
      el('button', {
        class: 'btn btn-danger',
        onclick: async () => {
          await window.vault.types.deleteCascade(type.id);
          ctx.types = await window.vault.types.list();
          ctx.collections = await window.vault.collections.list();
          m.close();
          refreshSidebar();
          toast(`Type "${type.name}" deleted`);
          navigate({ name: 'home' });
        },
      }, `Delete type & ${usage.objects.length + usage.collections.length} items`)));

  const m = modal({ title: `Delete "${type.name}"?`, body });
}
