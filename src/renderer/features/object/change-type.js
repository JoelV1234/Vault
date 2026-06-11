// "Change Type" modal: pick a new type for the object from a grid.
import { el, modal, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, navigate, refreshSidebar } from '../../shared/state.js';

export function openChangeType(obj, route) {
  const body = el('div', { class: 'modal-body' },
    el('p', { class: 'muted small' },
      'Properties that do not exist on the new type keep their values but are no longer shown.'),
    el('div', { class: 'type-pick-grid' },
      ...ctx.types.filter((t) => t.id !== 'daily').map((t) =>
        el('button', {
          class: `type-pick ${t.id === obj.type ? 'on' : ''}`,
          onclick: async () => {
            if (t.id !== obj.type) {
              await window.vault.objects.update(obj.id, { type: t.id });
              refreshSidebar();
              toast(`Changed to ${t.name}`);
            }
            m.close();
            navigate({ ...route }, { push: false });
          },
        },
          el('span', { class: 'type-chip', style: `--chip:${t.color}` }, icon(t.icon, 14)),
          el('span', {}, t.name)))));
  const m = modal({ title: 'Change type', body });
}
